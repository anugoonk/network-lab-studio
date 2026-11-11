/**
 * Network behaviour engine. Everything here is a pure function of the current Lab:
 * the canvas, the CLI `show` output, the Lab Inspector and `ping` all read the same data,
 * and reachability is recomputed from cables + port state + VLANs/trunks + L3 config on every call.
 *
 * Model
 *  - L2: access ports and 802.1Q trunks. A frame lives in a (switch, VLAN) node and is flooded to every
 *    port of that switch that carries the VLAN (access port in the VLAN, or trunk that allows it).
 *  - L3 interfaces: PC NIC, router port / sub-interface, Aruba routed port, switch SVI.
 *  - Routing: connected + static routes on routers and Aruba (AOS-CX) switches. PCs and Cisco L2 switches
 *    are hosts: connected subnet, otherwise their default gateway; they never forward.
 */
import { maskToPrefix, sameSubnet, networkOf, parseIp } from './ip';
import { getDevice, getIface, linkAt, peerOf, subName } from './lab';
import { PROFILES, shortPort } from './profiles';
import type { Device, Endpoint, Iface, Lab, Link } from './types';
import { tx } from '../i18n';

const isSwitch = (d: Device) => PROFILES[d.kind].isSwitch;
const canForward = (d: Device) => PROFILES[d.kind].canForward;
const arubaSw = (d: Device) => PROFILES[d.kind].vendor === 'aruba' && PROFILES[d.kind].isSwitch;

// ───────────────────────── link / port status ─────────────────────────

export interface LinkStatus {
  /** "มีสายเชื่อม" — always true for an existing Link; kept explicit for the UI */
  cable: true;
  /** "ลิงก์ใช้งานได้" — both ends administratively up */
  up: boolean;
  aAdmin: boolean;
  bAdmin: boolean;
  reasonTh: string;
}

export function linkStatus(lab: Lab, link: Link): LinkStatus {
  const da = getDevice(lab, link.a.deviceId);
  const db = getDevice(lab, link.b.deviceId);
  const ia = da && getIface(da, link.a.port);
  const ib = db && getIface(db, link.b.port);
  const aAdmin = !!ia?.adminUp;
  const bAdmin = !!ib?.adminUp;
  const down: string[] = [];
  if (!aAdmin) down.push(tx('{0} ของ {1}', shortPort(link.a.port), da?.name ?? '?'));
  if (!bAdmin) down.push(tx('{0} ของ {1}', shortPort(link.b.port), db?.name ?? '?'));
  return {
    cable: true,
    up: aAdmin && bAdmin,
    aAdmin,
    bAdmin,
    reasonTh: down.length ? tx('พอร์ต {0} ถูก shutdown', down.join(tx(' และ '))) : tx('พอร์ตทั้งสองฝั่งเปิดใช้งาน'),
  };
}

export type PortLine = 'up' | 'down' | 'admin-down' | 'no-cable';

/** Status of one port: line/protocol view, e.g. for `show interfaces status`. */
export function portLine(lab: Lab, dev: Device, iface: Iface): PortLine {
  if (!iface.adminUp) return 'admin-down';
  const l = linkAt(lab, dev.id, iface.name);
  if (!l) return 'no-cable';
  return linkStatus(lab, l).up ? 'up' : 'down';
}

export const PORT_LINE_TH: Record<PortLine, string> = {
  up: tx('ใช้งานได้ (up)'),
  down: tx('มีสายแต่ลิงก์ down'),
  'admin-down': tx('ถูก shutdown'),
  'no-cable': tx('ไม่มีสาย'),
};

const linkUp = (lab: Lab, dev: Device, port: string): boolean => {
  const l = linkAt(lab, dev.id, port);
  return !!l && linkStatus(lab, l).up;
};

// ───────────────────────── L2 port semantics ─────────────────────────

export const allowsVlan = (i: Iface, v: number): boolean => i.trunkAllowed === null || i.trunkAllowed.includes(v);

/** Does this switch port carry frames of VLAN v (as part of the switch's VLAN v)? */
export function portCarries(dev: Device, i: Iface, v: number): boolean {
  if (!isSwitch(dev)) return false;
  if (arubaSw(dev) && i.routed) return false;
  if (!dev.vlans.some((x) => x.id === v)) return false;
  return i.trunk ? allowsVlan(i, v) : i.accessVlan === v;
}

/** Is this switch port participating in L2 forwarding as an access port in its access VLAN? (kept for callers/tests) */
export function isL2Member(dev: Device, iface: Iface): boolean {
  if (!isSwitch(dev) || iface.trunk) return false;
  return portCarries(dev, iface, iface.accessVlan);
}

/** Thai reason why a switch port does not carry VLAN v ('' when it does). */
function whyNotCarry(dev: Device, i: Iface, v: number): string {
  if (arubaSw(dev) && i.routed)
    return tx('พอร์ต {0} ของ {1} ยังเป็น routed port (AOS-CX ต้องสั่ง no routing ก่อนใช้เป็น L2 port)', i.name, dev.name);
  if (!dev.vlans.some((x) => x.id === v)) return tx('VLAN {0} ยังไม่ได้สร้างบน {1}', v, dev.name);
  if (i.trunk && !allowsVlan(i, v)) return tx('trunk {0} ของ {1} ไม่อนุญาต VLAN {2} (allowed vlan)', i.name, dev.name, v);
  if (!i.trunk && i.accessVlan !== v) return tx('พอร์ต {0} ของ {1} เป็น access VLAN {2} ไม่ใช่ VLAN {3}', i.name, dev.name, i.accessVlan, v);
  return '';
}

// ───────────────────────── L3 interfaces ─────────────────────────

export interface L3If {
  deviceId: string;
  /** display name: Ethernet0, GigabitEthernet0/0.10, Vlan10 */
  name: string;
  kind: 'port' | 'sub' | 'svi';
  ip: string;
  mask: string;
  /** physical port (port / sub) */
  port?: string;
  /** dot1Q tag used on the wire (sub only) */
  tag?: number | null;
  /** VLAN (svi only) */
  vlan?: number;
  adminUp: boolean;
  /** admin up and line protocol up */
  up: boolean;
}

export function sviLineUp(lab: Lab, sw: Device, vlan: number): boolean {
  if (!sw.vlans.some((v) => v.id === vlan)) return false;
  return sw.ifaces.some((i) => portCarries(sw, i, vlan) && i.adminUp && linkUp(lab, sw, i.name));
}

/** All L3 interfaces of a device that have an IPv4 address configured (up or not). */
export function l3Interfaces(lab: Lab, dev: Device): L3If[] {
  const out: L3If[] = [];
  const p = PROFILES[dev.kind];
  if (p.isHost || p.isRouter || arubaSw(dev)) {
    for (const i of dev.ifaces) {
      if (!i.ip || !i.mask) continue;
      if (arubaSw(dev) && !i.routed) continue;
      out.push({
        deviceId: dev.id,
        name: i.name,
        kind: 'port',
        ip: i.ip,
        mask: i.mask,
        port: i.name,
        tag: null,
        adminUp: i.adminUp,
        up: i.adminUp && linkUp(lab, dev, i.name),
      });
    }
  }
  for (const s of dev.subifs) {
    if (!s.ip || !s.mask) continue;
    const parent = getIface(dev, s.parent);
    const adm = !!parent?.adminUp && s.adminUp && s.vlan !== null;
    out.push({
      deviceId: dev.id,
      name: subName(s),
      kind: 'sub',
      ip: s.ip,
      mask: s.mask,
      port: s.parent,
      tag: s.vlan,
      adminUp: !!parent?.adminUp && s.adminUp,
      up: adm && linkUp(lab, dev, s.parent),
    });
  }
  for (const v of dev.svis) {
    if (!v.ip || !v.mask) continue;
    out.push({
      deviceId: dev.id,
      name: `Vlan${v.vlan}`,
      kind: 'svi',
      ip: v.ip,
      mask: v.mask,
      vlan: v.vlan,
      adminUp: v.adminUp,
      up: v.adminUp && sviLineUp(lab, dev, v.vlan),
    });
  }
  return out;
}

// ───────────────────────── Layer 2 domain ─────────────────────────

export interface Reached {
  ifc: L3If;
  /** switches traversed (device ids, in order) */
  via: string[];
}

/** All L3 interfaces that share a broadcast domain with `src` right now. Loop-safe (visited set). */
export function l2Domain(
  lab: Lab,
  src: L3If,
  /** called once per (switch, VLAN) the frame reaches, with the port it entered on (null = source is that switch's own SVI) */
  onSwitch?: (sw: Device, vlan: number, ingress: string | null) => void,
): Reached[] {
  const out: Reached[] = [];
  const visited = new Set<string>();
  const queue: { sw: Device; vlan: number; via: string[] }[] = [];
  const isSrc = (i: L3If) => i.deviceId === src.deviceId && i.name === src.name;

  const reach = (ifc: L3If, via: string[]) => {
    if (!isSrc(ifc)) out.push({ ifc, via });
  };

  const enterNode = (sw: Device, vlan: number, via: string[], ingress: string | null) => {
    const key = `${sw.id}|${vlan}`;
    if (visited.has(key)) return;
    visited.add(key);
    onSwitch?.(sw, vlan, ingress);
    queue.push({ sw, vlan, via: [...via, sw.id] });
  };

  /** a frame (tag = null → untagged) arrives at the far end of a link */
  const arrive = (peer: Endpoint, tag: number | null, via: string[]) => {
    const pd = getDevice(lab, peer.deviceId);
    if (!pd) return;
    if (!isSwitch(pd)) {
      for (const ifc of l3Interfaces(lab, pd)) {
        if (ifc.port !== peer.port) continue;
        if (ifc.kind === 'port' && tag === null) reach(ifc, via);
        if (ifc.kind === 'sub' && tag !== null && ifc.tag === tag) reach(ifc, via);
      }
      return;
    }
    const pi = getIface(pd, peer.port);
    if (!pi) return;
    if (arubaSw(pd) && pi.routed) {
      // an AOS-CX routed port is an L3 endpoint (e.g. a router-to-switch uplink), not part of the switched domain
      for (const ifc of l3Interfaces(lab, pd)) if (ifc.kind === 'port' && ifc.port === peer.port && tag === null) reach(ifc, via);
      return;
    }
    let v: number;
    if (pi.trunk) {
      v = tag === null ? pi.nativeVlan : tag;
      if (!allowsVlan(pi, v)) return;
    } else {
      if (tag !== null) return; // access ports drop tagged frames
      v = pi.accessVlan;
    }
    if (!pd.vlans.some((x) => x.id === v)) return;
    enterNode(pd, v, via, peer.port);
  };

  if (src.kind === 'svi') {
    const sw = getDevice(lab, src.deviceId);
    if (!sw || !src.up) return out;
    enterNode(sw, src.vlan!, [], null);
  } else {
    const link = linkAt(lab, src.deviceId, src.port!);
    if (!link || !linkStatus(lab, link).up) return out;
    arrive(peerOf(link, src.deviceId, src.port!), src.kind === 'sub' ? (src.tag ?? null) : null, []);
  }

  while (queue.length) {
    const n = queue.shift()!;
    for (const s of l3Interfaces(lab, n.sw)) {
      if (s.kind === 'svi' && s.vlan === n.vlan && s.up) reach(s, n.via);
    }
    for (const i of n.sw.ifaces) {
      if (!portCarries(n.sw, i, n.vlan)) continue;
      const l = linkAt(lab, n.sw.id, i.name);
      if (!l || !linkStatus(lab, l).up) continue;
      const tagOut = i.trunk && n.vlan !== i.nativeVlan ? n.vlan : null;
      arrive(peerOf(l, n.sw.id, i.name), tagOut, n.via);
    }
  }
  return out;
}

// ───────────────────────── diagnosis (Thai explanations) ─────────────────────────

interface Step {
  from: Device;
  out: string;
  to: Device;
  in: string;
}

function stepFor(lab: Lab, from: Device, link: Link): Step {
  const mine = link.a.deviceId === from.id ? link.a : link.b;
  const other = mine === link.a ? link.b : link.a;
  return { from, out: mine.port, to: getDevice(lab, other.deviceId)!, in: other.port };
}

/** Shortest physical path (transit only through switches) starting with `first`. */
function findPhysicalPath(lab: Lab, first: Step, start: Device, goal: Device): Step[] | null {
  if (first.to.id === goal.id) return [first];
  if (!isSwitch(first.to)) return null;
  const prev = new Map<string, Step>();
  const seen = new Set<string>([start.id, first.to.id]);
  let frontier: Device[] = [first.to];
  while (frontier.length) {
    const next: Device[] = [];
    for (const d of frontier) {
      for (const l of lab.links) {
        if (l.a.deviceId !== d.id && l.b.deviceId !== d.id) continue;
        const st = stepFor(lab, d, l);
        if (seen.has(st.to.id)) continue;
        seen.add(st.to.id);
        prev.set(st.to.id, st);
        if (st.to.id === goal.id) {
          const steps: Step[] = [];
          let cur: Step | undefined = st;
          while (cur) {
            steps.unshift(cur);
            cur = cur.from.id === first.to.id ? undefined : prev.get(cur.from.id);
          }
          return [first, ...steps];
        }
        if (isSwitch(st.to)) next.push(st.to);
      }
    }
    frontier = next;
  }
  return null;
}

function walkSteps(cur: Device, src: L3If, target: L3If, steps: Step[]): string | null {
  let reached = cur;
  const lead = () => (reached.id === cur.id ? `${cur.name}:` : tx('{0} ไปถึง {1} ได้ แต่', cur.name, reached.name));
  let tag: number | null = src.kind === 'sub' ? (src.tag ?? null) : null;

  if (src.kind === 'svi' && steps.length) {
    const R = getIface(cur, steps[0].out)!;
    const why = whyNotCarry(cur, R, src.vlan!);
    if (why) return `${lead()} ${why}`;
    tag = R.trunk && src.vlan !== R.nativeVlan ? src.vlan! : null;
  }
  if (src.kind === 'sub' && src.tag === null) return tx('{0}: sub-interface {1} ยังไม่ได้ตั้ง encapsulation dot1Q', cur.name, src.name);

  for (let k = 0; k < steps.length; k++) {
    const s = steps[k];
    const oi = getIface(s.from, s.out);
    const ii = getIface(s.to, s.in);
    if (oi && !oi.adminUp) return tx('{0} พอร์ต {1} ของ {2} ถูก shutdown (administratively down)', lead(), s.out, s.from.name);
    if (ii && !ii.adminUp) return tx('{0} พอร์ต {1} ของ {2} ถูก shutdown (administratively down)', lead(), s.in, s.to.name);

    if (isSwitch(s.to)) {
      const Q = ii!;
      if (arubaSw(s.to) && Q.routed)
        return tx('{0} พอร์ต {1} ของ {2} ยังเป็น routed port (AOS-CX ต้องสั่ง no routing ก่อนใช้เป็น L2 port)', lead(), s.in, s.to.name);
      let v: number;
      if (Q.trunk) {
        v = tag === null ? Q.nativeVlan : tag;
        if (!allowsVlan(Q, v)) return tx('{0} trunk {1} ของ {2} ไม่อนุญาต VLAN {3} ({4}ไม่อยู่ใน allowed vlan)', lead(), s.in, s.to.name, v, tag === null ? 'native VLAN ' : '');
      } else {
        if (tag !== null)
          return tx('{0} {1} ส่งเฟรม tagged VLAN {2} แต่พอร์ต {3} ของ {4} เป็น access port (ต้องตั้งเป็น trunk)', lead(), cur.name, tag, s.in, s.to.name);
        v = Q.accessVlan;
      }
      if (!s.to.vlans.some((x) => x.id === v)) return tx('{0} VLAN {1} ยังไม่ได้สร้างบน {2}', lead(), v, s.to.name);
      const next = steps[k + 1];
      if (next) {
        const R = getIface(s.to, next.out)!;
        if (!portCarries(s.to, R, v)) {
          const base = whyNotCarry(s.to, R, v);
          const via = !R.trunk && !Q.trunk ? tx(' — ใน {0} พอร์ต {1} อยู่ VLAN {2} แต่พอร์ต {3} อยู่ VLAN {4} จึงส่งข้ามกันไม่ได้', s.to.name, s.in, v, next.out, R.accessVlan) : '';
          return `${lead()} ${base}${via}`;
        }
        tag = R.trunk && v !== R.nativeVlan ? v : null;
      } else if (target.kind === 'svi' && target.vlan !== v) {
        return tx('{0} เฟรมเข้า {1} ใน VLAN {2} แต่ {3} อยู่ VLAN {4}', lead(), s.to.name, v, target.name, target.vlan);
      }
    } else if (!steps[k + 1]) {
      if (target.kind === 'sub' && tag !== target.tag)
        return tx('{0} ปลายทาง {1} ต้องการเฟรม tagged VLAN {2} แต่ได้รับ {3} (ตรวจ trunk/encapsulation)', lead(), target.name, target.tag, tag === null ? 'untagged' : `tagged VLAN ${tag}`);
      if (target.kind === 'port' && tag !== null)
        return tx('{0} {1} ({2}) ไม่รองรับเฟรม tagged VLAN {3}', lead(), s.to.name, s.in, tag);
    }
    reached = s.to;
  }
  return null;
}

/** Explain (in Thai) why `cur` cannot resolve `targetIp` on `out`. */
export function diagnoseUnresolved(lab: Lab, cur: Device, out: L3If, targetIp: string, role: 'destination' | 'gateway'): string {
  const roleTh = role === 'gateway' ? `Default gateway ${targetIp}` : tx('ปลายทาง {0}', targetIp);
  if (!out.adminUp) return tx('{0} ของ {1} ถูก shutdown จึงส่งข้อมูลออกไม่ได้', out.name, cur.name);

  const owners = lab.devices
    .filter((d) => d.id !== cur.id)
    .flatMap((d) => l3Interfaces(lab, d).filter((i) => i.ip === targetIp).map((i) => ({ d, i })));
  if (owners.length === 0) {
    return role === 'gateway'
      ? tx('{0} ส่งไปที่ gateway {1} แต่ไม่มีอุปกรณ์ใดใช้ IP นี้ในเครือข่ายที่เข้าถึงได้ (gateway ตั้งผิด หรืออุปกรณ์ gateway ยังไม่ได้ตั้ง IP / ยังปิดพอร์ตอยู่)', cur.name, targetIp)
      : tx('ไม่พบอุปกรณ์ที่ใช้ IP {0} ในเครือข่ายที่ {1} เข้าถึงได้ (IP พิมพ์ผิด หรืออุปกรณ์ปลายทางยังไม่ได้ตั้ง IP / พอร์ตยัง shutdown)', targetIp, cur.name);
  }

  // candidate first links
  const firstLinks: Link[] = [];
  if (out.kind === 'svi') {
    for (const l of lab.links) if (l.a.deviceId === cur.id || l.b.deviceId === cur.id) firstLinks.push(l);
    if (!firstLinks.length) return tx('{0} ของ {1}: {2} ยังไม่มีสายเชื่อมพอร์ตใดเลย', out.name, cur.name, cur.name);
  } else {
    const l = linkAt(lab, cur.id, out.port!);
    if (!l) return tx('พอร์ต {0} ของ {1} ยังไม่ได้เชื่อมสาย จึงเข้าถึง {2} ไม่ได้', out.port, cur.name, roleTh);
    firstLinks.push(l);
  }

  const problems: string[] = [];
  for (const { d: owner, i: oi } of owners) {
    if (!oi.adminUp) {
      problems.push(tx('{0} ของ {1} (ที่ใช้ IP {2}) ถูก shutdown', oi.name, owner.name, targetIp));
      continue;
    }
    if (oi.kind === 'svi' && !oi.up) {
      problems.push(tx('{0} ของ {1} ยัง down (VLAN ไม่มีอยู่ หรือไม่มีพอร์ตที่ up ใน VLAN {2})', oi.name, owner.name, oi.vlan));
      continue;
    }
    let found = false;
    for (const l of firstLinks) {
      const first = stepFor(lab, cur, l);
      const steps = findPhysicalPath(lab, first, cur, owner);
      if (!steps) continue;
      found = true;
      const msg = walkSteps(cur, out, oi, steps);
      if (msg) {
        problems.push(msg);
        break;
      }
    }
    if (!found) problems.push(tx('ไม่มีสายเชื่อมต่อเนื่องจาก {0} ไปยัง {1} (ที่ใช้ IP {2})', cur.name, owner.name, targetIp));
  }
  return problems[0] ?? tx('{0} หา {1} บนลิงก์เดียวกันไม่พบ', cur.name, roleTh);
}

// ───────────────────────── routing / delivery / ping ─────────────────────────

interface DeliverOk {
  ok: true;
  path: string[];
  dstDeviceId: string;
  srcIp: string;
  /** L3 devices that forwarded the packet (each one decrements TTL) */
  routed: number;
}
interface DeliverFail {
  ok: false;
  path: string[];
  kind: 'general' | 'unresolved' | 'noroute' | 'loop';
  th: string;
  atDeviceId: string;
  /** source address chosen on the first hop (null when it failed before choosing one) */
  srcIp: string | null;
}

function ownedAddress(lab: Lab, d: Device, ip: string): L3If | undefined {
  return l3Interfaces(lab, d).find((i) => i.ip === ip && i.adminUp);
}

interface Selected {
  out: L3If;
  nextHop: string;
  role: 'destination' | 'gateway';
}

function selectRoute(lab: Lab, cur: Device, dstIp: string): Selected | { fail: string; kind: 'general' | 'noroute' } {
  const fwd = canForward(cur);
  const all = l3Interfaces(lab, cur);
  // forwarding devices only route over up/up interfaces; hosts keep trying so the failure can be explained
  const usable = all.filter((i) => (fwd ? i.up : i.adminUp));

  let best: { out: L3If; prefix: number; nextHop: string; role: 'destination' | 'gateway' } | null = null;
  for (const i of usable) {
    if (sameSubnet(i.ip, dstIp, i.mask)) {
      const prefix = maskToPrefix(i.mask);
      if (!best || prefix > best.prefix) best = { out: i, prefix, nextHop: dstIp, role: 'destination' };
    }
  }

  if (!fwd && PROFILES[cur.kind].isHost && usable.length && usable.every((i) => !i.up)) {
    // Windows with the NIC unplugged / link down: "PING: transmit failed. General failure."
    const o = usable[0];
    const l = linkAt(lab, cur.id, o.port!);
    const why = l ? linkStatus(lab, l).reasonTh : tx('ยังไม่ได้เชื่อมสาย');
    return { fail: tx('{0} ของ {1} ไม่มีลิงก์ (Media disconnected) — {2}', o.name, cur.name, why), kind: 'general' };
  }

  if (fwd) {
    for (const r of cur.routes) {
      if (!sameSubnet(r.net, dstIp, r.mask)) continue;
      const prefix = maskToPrefix(r.mask);
      if (best && prefix <= best.prefix) continue; // connected wins ties, longer prefix wins
      const via = usable.find((i) => sameSubnet(i.ip, r.nextHop, i.mask));
      if (!via) continue; // next hop not reachable over a connected subnet → route not installed
      best = { out: via, prefix, nextHop: r.nextHop, role: 'gateway' };
    }
    if (!best) {
      const hasStatic = cur.routes.some((r) => sameSubnet(r.net, dstIp, r.mask));
      return {
        fail: hasStatic
          ? tx('{0} มี static route ไป {1} แต่ next hop ไม่อยู่ใน subnet ของ interface ที่ up/up จึงใช้ route นี้ไม่ได้', cur.name, dstIp)
          : tx('{0} ไม่มีเส้นทางไป {1} (ไม่มี connected route หรือ static route ที่ตรง)', cur.name, dstIp),
        kind: 'noroute',
      };
    }
    return { out: best.out, nextHop: best.nextHop, role: best.role };
  }

  if (best) return { out: best.out, nextHop: best.nextHop, role: best.role };
  if (!all.length) return { fail: tx('{0} ยังไม่ได้ตั้งค่า IP address', cur.name), kind: 'general' };
  if (!usable.length) return { fail: tx('{0} ของ {1} ถูก shutdown', all[0].name, cur.name), kind: 'general' };
  if (!cur.gateway) {
    return { fail: tx('ปลายทาง {0} อยู่นอก subnet ของ {1} แต่ {2} ไม่ได้ตั้ง default gateway', dstIp, cur.name, cur.name), kind: 'general' };
  }
  const via = usable.find((i) => sameSubnet(i.ip, cur.gateway!, i.mask));
  if (!via) {
    const f = usable[0];
    return {
      fail: tx('Default gateway {0} ไม่อยู่ใน subnet เดียวกับ {1} ({2}/{3}) จึงส่งต่อออกนอก subnet ไม่ได้', cur.gateway, cur.name, f.ip, maskToPrefix(f.mask)),
      kind: 'general',
    };
  }
  return { out: via, nextHop: cur.gateway, role: 'gateway' };
}

function pushPath(path: string[], ids: string[]) {
  for (const id of ids) if (path[path.length - 1] !== id) path.push(id);
}

function deliver(lab: Lab, from: Device, dstIp: string): DeliverOk | DeliverFail {
  const path: string[] = [from.id];
  let cur = from;
  let srcIp: string | null = null;
  let routed = 0;

  for (let hop = 0; hop < 16; hop++) {
    const own = ownedAddress(lab, cur, dstIp);
    if (own && (cur.id === from.id || own.up)) {
      return { ok: true, path, dstDeviceId: cur.id, srcIp: srcIp ?? dstIp, routed };
    }
    if (cur.id !== from.id) routed++; // this device forwards the packet

    const sel = selectRoute(lab, cur, dstIp);
    if ('fail' in sel) return { ok: false, path, kind: sel.kind, atDeviceId: cur.id, th: sel.fail, srcIp };
    if (srcIp === null) srcIp = sel.out.ip;

    const domain = l2Domain(lab, sel.out);
    const hit = domain.find((r) => r.ifc.ip === sel.nextHop && r.ifc.up);
    if (!hit) {
      return {
        ok: false,
        path,
        kind: 'unresolved',
        srcIp,
        atDeviceId: cur.id,
        th: diagnoseUnresolved(lab, cur, sel.out, sel.nextHop, sel.role),
      };
    }
    pushPath(path, [...hit.via, hit.ifc.deviceId]);
    const nh = getDevice(lab, hit.ifc.deviceId)!;
    if (sel.nextHop === dstIp) return { ok: true, path, dstDeviceId: nh.id, srcIp, routed };
    if (!canForward(nh)) {
      return {
        ok: false,
        path,
        kind: 'general',
        srcIp,
        atDeviceId: nh.id,
        th: tx('Gateway/next hop {0} คือ {1} ซึ่งไม่ใช่อุปกรณ์ที่ส่งต่อแพ็กเก็ต (L3) จึงไม่ส่งต่อให้', sel.nextHop, nh.name),
      };
    }
    cur = nh;
  }
  return { ok: false, path, kind: 'loop', atDeviceId: cur.id, srcIp, th: tx('แพ็กเก็ตวนเกินจำนวน hop ที่กำหนด (routing loop)') };
}

export interface PingResult {
  ok: boolean;
  srcId: string;
  dstIp: string;
  /** Windows-style outcome used by the PC terminal */
  kind: 'ok' | 'general-failure' | 'host-unreachable' | 'net-unreachable' | 'timeout';
  /** net-unreachable: address of the router that answered with ICMP Destination Net Unreachable */
  icmpFrom?: string;
  /** TTL of the echo reply as the source sees it (initial TTL of the replying OS minus routers on the way back); null on failure */
  replyTtl: number | null;
  direction: 'forward' | 'return' | null;
  forwardPath: string[];
  returnPath: string[];
  failAtDeviceId?: string;
  /** Learner-facing explanation (Thai); separate from terminal output */
  explanation: string[];
  srcIp: string | null;
}

/** initial TTL of an echo reply by the replying OS: Windows 128, Cisco IOS 255, AOS-CX (Linux) 64 */
const INITIAL_TTL: Record<string, number> = { pc: 128, cisco: 255, aruba: 64, generic: 64 };

export function ping(lab: Lab, srcId: string, dstIp: string): PingResult {
  const src = getDevice(lab, srcId);
  const base = { srcId, dstIp, forwardPath: [] as string[], returnPath: [] as string[], srcIp: null, replyTtl: null };
  if (!src) {
    return { ...base, ok: false, kind: 'general-failure', direction: 'forward', explanation: [tx('ไม่พบอุปกรณ์ต้นทาง')] };
  }
  const nameOf = (id: string) => getDevice(lab, id)?.name ?? id;
  const fwd = deliver(lab, src, dstIp);
  if (!fwd.ok && fwd.kind === 'noroute' && fwd.atDeviceId !== srcId && fwd.srcIp) {
    // a router on the way has no route: it answers the source with ICMP Destination Net Unreachable (if it can reach it)
    const rt = getDevice(lab, fwd.atDeviceId)!;
    const back = deliver(lab, rt, fwd.srcIp);
    if (back.ok) {
      return {
        ...base,
        ok: false,
        kind: 'net-unreachable',
        icmpFrom: back.srcIp,
        direction: 'forward',
        forwardPath: fwd.path,
        failAtDeviceId: fwd.atDeviceId,
        explanation: [tx('ขาไป: {0}', fwd.th), tx('{0} จึงตอบกลับ ICMP Destination net unreachable จาก {1}', rt.name, back.srcIp)],
      };
    }
  }
  if (!fwd.ok) {
    const kind = fwd.kind === 'general' ? 'general-failure' : fwd.kind === 'unresolved' ? 'host-unreachable' : 'timeout';
    return {
      ...base,
      ok: false,
      kind,
      direction: 'forward',
      forwardPath: fwd.path,
      failAtDeviceId: fwd.atDeviceId,
      explanation: [tx('ขาไป: {0}', fwd.th)],
    };
  }
  const dst = getDevice(lab, fwd.dstDeviceId)!;
  const back = deliver(lab, dst, fwd.srcIp);
  if (!back.ok) {
    return {
      ...base,
      ok: false,
      kind: 'timeout',
      direction: 'return',
      forwardPath: fwd.path,
      returnPath: back.path,
      srcIp: fwd.srcIp,
      failAtDeviceId: back.atDeviceId,
      explanation: [
        tx('ขาไปสำเร็จ: {0}', fwd.path.map(nameOf).join(' → ')),
        tx('แต่ขากลับ ({0} → {1}) ไม่สำเร็จ: {2}', dst.name, src.name, back.th),
      ],
    };
  }
  return {
    ...base,
    ok: true,
    kind: 'ok',
    direction: null,
    forwardPath: fwd.path,
    returnPath: back.path,
    srcIp: fwd.srcIp,
    replyTtl: INITIAL_TTL[PROFILES[dst.kind].vendor] - back.routed,
    explanation: [
      tx('ขาไป: {0}', fwd.path.map(nameOf).join(' → ')),
      tx('ขากลับ: {0}', back.path.map(nameOf).join(' → ')),
      tx('ping สำเร็จ — เส้นทางขาไปและขากลับใช้งานได้ทั้งหมด'),
    ],
  };
}

/** Find the device that currently owns an IP (for inspector convenience). */
export function deviceByIp(lab: Lab, ip: string): Device | undefined {
  return lab.devices.find((d) => l3Interfaces(lab, d).some((i) => i.ip === ip));
}

/** Every configured IPv4 owner in the lab (for pickers). */
export function allAddresses(lab: Lab): { device: Device; ifc: L3If }[] {
  return lab.devices.flatMap((d) => l3Interfaces(lab, d).map((ifc) => ({ device: d, ifc })));
}

export { networkOf, parseIp };
