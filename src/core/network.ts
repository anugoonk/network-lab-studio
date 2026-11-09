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
  if (!aAdmin) down.push(`${shortPort(link.a.port)} ของ ${da?.name ?? '?'}`);
  if (!bAdmin) down.push(`${shortPort(link.b.port)} ของ ${db?.name ?? '?'}`);
  return {
    cable: true,
    up: aAdmin && bAdmin,
    aAdmin,
    bAdmin,
    reasonTh: down.length ? `พอร์ต ${down.join(' และ ')} ถูก shutdown` : 'พอร์ตทั้งสองฝั่งเปิดใช้งาน',
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
  up: 'ใช้งานได้ (up)',
  down: 'มีสายแต่ลิงก์ down',
  'admin-down': 'ถูก shutdown',
  'no-cable': 'ไม่มีสาย',
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
    return `พอร์ต ${i.name} ของ ${dev.name} ยังเป็น routed port (AOS-CX ต้องสั่ง no routing ก่อนใช้เป็น L2 port)`;
  if (!dev.vlans.some((x) => x.id === v)) return `VLAN ${v} ยังไม่ได้สร้างบน ${dev.name}`;
  if (i.trunk && !allowsVlan(i, v)) return `trunk ${i.name} ของ ${dev.name} ไม่อนุญาต VLAN ${v} (allowed vlan)`;
  if (!i.trunk && i.accessVlan !== v) return `พอร์ต ${i.name} ของ ${dev.name} เป็น access VLAN ${i.accessVlan} ไม่ใช่ VLAN ${v}`;
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

function sviLineUp(lab: Lab, sw: Device, vlan: number): boolean {
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
export function l2Domain(lab: Lab, src: L3If): Reached[] {
  const out: Reached[] = [];
  const visited = new Set<string>();
  const queue: { sw: Device; vlan: number; via: string[] }[] = [];
  const isSrc = (i: L3If) => i.deviceId === src.deviceId && i.name === src.name;

  const reach = (ifc: L3If, via: string[]) => {
    if (!isSrc(ifc)) out.push({ ifc, via });
  };

  const enterNode = (sw: Device, vlan: number, via: string[]) => {
    const key = `${sw.id}|${vlan}`;
    if (visited.has(key)) return;
    visited.add(key);
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
    if (arubaSw(pd) && pi.routed) return;
    let v: number;
    if (pi.trunk) {
      v = tag === null ? pi.nativeVlan : tag;
      if (!allowsVlan(pi, v)) return;
    } else {
      if (tag !== null) return; // access ports drop tagged frames
      v = pi.accessVlan;
    }
    if (!pd.vlans.some((x) => x.id === v)) return;
    enterNode(pd, v, via);
  };

  if (src.kind === 'svi') {
    const sw = getDevice(lab, src.deviceId);
    if (!sw || !src.up) return out;
    enterNode(sw, src.vlan!, []);
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
  const lead = () => (reached.id === cur.id ? `${cur.name}:` : `${cur.name} ไปถึง ${reached.name} ได้ แต่`);
  let tag: number | null = src.kind === 'sub' ? (src.tag ?? null) : null;

  if (src.kind === 'svi' && steps.length) {
    const R = getIface(cur, steps[0].out)!;
    const why = whyNotCarry(cur, R, src.vlan!);
    if (why) return `${lead()} ${why}`;
    tag = R.trunk && src.vlan !== R.nativeVlan ? src.vlan! : null;
  }
  if (src.kind === 'sub' && src.tag === null) return `${cur.name}: sub-interface ${src.name} ยังไม่ได้ตั้ง encapsulation dot1Q`;

  for (let k = 0; k < steps.length; k++) {
    const s = steps[k];
    const oi = getIface(s.from, s.out);
    const ii = getIface(s.to, s.in);
    if (oi && !oi.adminUp) return `${lead()} พอร์ต ${s.out} ของ ${s.from.name} ถูก shutdown (administratively down)`;
    if (ii && !ii.adminUp) return `${lead()} พอร์ต ${s.in} ของ ${s.to.name} ถูก shutdown (administratively down)`;

    if (isSwitch(s.to)) {
      const Q = ii!;
      if (arubaSw(s.to) && Q.routed)
        return `${lead()} พอร์ต ${s.in} ของ ${s.to.name} ยังเป็น routed port (AOS-CX ต้องสั่ง no routing ก่อนใช้เป็น L2 port)`;
      let v: number;
      if (Q.trunk) {
        v = tag === null ? Q.nativeVlan : tag;
        if (!allowsVlan(Q, v)) return `${lead()} trunk ${s.in} ของ ${s.to.name} ไม่อนุญาต VLAN ${v} (${tag === null ? 'native VLAN ' : ''}ไม่อยู่ใน allowed vlan)`;
      } else {
        if (tag !== null)
          return `${lead()} ${cur.name} ส่งเฟรม tagged VLAN ${tag} แต่พอร์ต ${s.in} ของ ${s.to.name} เป็น access port (ต้องตั้งเป็น trunk)`;
        v = Q.accessVlan;
      }
      if (!s.to.vlans.some((x) => x.id === v)) return `${lead()} VLAN ${v} ยังไม่ได้สร้างบน ${s.to.name}`;
      const next = steps[k + 1];
      if (next) {
        const R = getIface(s.to, next.out)!;
        if (!portCarries(s.to, R, v)) {
          const base = whyNotCarry(s.to, R, v);
          const via = !R.trunk && !Q.trunk ? ` — ใน ${s.to.name} พอร์ต ${s.in} อยู่ VLAN ${v} แต่พอร์ต ${next.out} อยู่ VLAN ${R.accessVlan} จึงส่งข้ามกันไม่ได้` : '';
          return `${lead()} ${base}${via}`;
        }
        tag = R.trunk && v !== R.nativeVlan ? v : null;
      } else if (target.kind === 'svi' && target.vlan !== v) {
        return `${lead()} เฟรมเข้า ${s.to.name} ใน VLAN ${v} แต่ ${target.name} อยู่ VLAN ${target.vlan}`;
      }
    } else if (!steps[k + 1]) {
      if (target.kind === 'sub' && tag !== target.tag)
        return `${lead()} ปลายทาง ${target.name} ต้องการเฟรม tagged VLAN ${target.tag} แต่ได้รับ ${tag === null ? 'untagged' : `tagged VLAN ${tag}`} (ตรวจ trunk/encapsulation)`;
      if (target.kind === 'port' && tag !== null)
        return `${lead()} ${s.to.name} (${s.in}) ไม่รองรับเฟรม tagged VLAN ${tag}`;
    }
    reached = s.to;
  }
  return null;
}

/** Explain (in Thai) why `cur` cannot resolve `targetIp` on `out`. */
export function diagnoseUnresolved(lab: Lab, cur: Device, out: L3If, targetIp: string, role: 'destination' | 'gateway'): string {
  const roleTh = role === 'gateway' ? `Default gateway ${targetIp}` : `ปลายทาง ${targetIp}`;
  if (!out.adminUp) return `${out.name} ของ ${cur.name} ถูก shutdown จึงส่งข้อมูลออกไม่ได้`;

  const owners = lab.devices
    .filter((d) => d.id !== cur.id)
    .flatMap((d) => l3Interfaces(lab, d).filter((i) => i.ip === targetIp).map((i) => ({ d, i })));
  if (owners.length === 0) {
    return role === 'gateway'
      ? `${cur.name} ส่งไปที่ gateway ${targetIp} แต่ไม่มีอุปกรณ์ใดใช้ IP นี้ในเครือข่ายที่เข้าถึงได้ (gateway ตั้งผิด หรืออุปกรณ์ gateway ยังไม่ได้ตั้ง IP / ยังปิดพอร์ตอยู่)`
      : `ไม่พบอุปกรณ์ที่ใช้ IP ${targetIp} ในเครือข่ายที่ ${cur.name} เข้าถึงได้ (IP พิมพ์ผิด หรืออุปกรณ์ปลายทางยังไม่ได้ตั้ง IP / พอร์ตยัง shutdown)`;
  }

  // candidate first links
  const firstLinks: Link[] = [];
  if (out.kind === 'svi') {
    for (const l of lab.links) if (l.a.deviceId === cur.id || l.b.deviceId === cur.id) firstLinks.push(l);
    if (!firstLinks.length) return `${out.name} ของ ${cur.name}: ${cur.name} ยังไม่มีสายเชื่อมพอร์ตใดเลย`;
  } else {
    const l = linkAt(lab, cur.id, out.port!);
    if (!l) return `พอร์ต ${out.port} ของ ${cur.name} ยังไม่ได้เชื่อมสาย จึงเข้าถึง ${roleTh} ไม่ได้`;
    firstLinks.push(l);
  }

  const problems: string[] = [];
  for (const { d: owner, i: oi } of owners) {
    if (!oi.adminUp) {
      problems.push(`${oi.name} ของ ${owner.name} (ที่ใช้ IP ${targetIp}) ถูก shutdown`);
      continue;
    }
    if (oi.kind === 'svi' && !oi.up) {
      problems.push(`${oi.name} ของ ${owner.name} ยัง down (VLAN ไม่มีอยู่ หรือไม่มีพอร์ตที่ up ใน VLAN ${oi.vlan})`);
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
    if (!found) problems.push(`ไม่มีสายเชื่อมต่อเนื่องจาก ${cur.name} ไปยัง ${owner.name} (ที่ใช้ IP ${targetIp})`);
  }
  return problems[0] ?? `${cur.name} หา ${roleTh} บนลิงก์เดียวกันไม่พบ`;
}

// ───────────────────────── routing / delivery / ping ─────────────────────────

interface DeliverOk {
  ok: true;
  path: string[];
  dstDeviceId: string;
  srcIp: string;
}
interface DeliverFail {
  ok: false;
  path: string[];
  kind: 'general' | 'unresolved' | 'noroute';
  th: string;
  atDeviceId: string;
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
          ? `${cur.name} มี static route ไป ${dstIp} แต่ next hop ไม่อยู่ใน subnet ของ interface ที่ up/up จึงใช้ route นี้ไม่ได้`
          : `${cur.name} ไม่มีเส้นทางไป ${dstIp} (ไม่มี connected route หรือ static route ที่ตรง)`,
        kind: 'noroute',
      };
    }
    return { out: best.out, nextHop: best.nextHop, role: best.role };
  }

  if (best) return { out: best.out, nextHop: best.nextHop, role: best.role };
  if (!all.length) return { fail: `${cur.name} ยังไม่ได้ตั้งค่า IP address`, kind: 'general' };
  if (!usable.length) return { fail: `${all[0].name} ของ ${cur.name} ถูก shutdown`, kind: 'general' };
  if (!cur.gateway) {
    return { fail: `ปลายทาง ${dstIp} อยู่นอก subnet ของ ${cur.name} แต่ ${cur.name} ไม่ได้ตั้ง default gateway`, kind: 'general' };
  }
  const via = usable.find((i) => sameSubnet(i.ip, cur.gateway!, i.mask));
  if (!via) {
    const f = usable[0];
    return {
      fail: `Default gateway ${cur.gateway} ไม่อยู่ใน subnet เดียวกับ ${cur.name} (${f.ip}/${maskToPrefix(f.mask)}) จึงส่งต่อออกนอก subnet ไม่ได้`,
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

  for (let hop = 0; hop < 16; hop++) {
    const own = ownedAddress(lab, cur, dstIp);
    if (own && (cur.id === from.id || own.up)) {
      return { ok: true, path, dstDeviceId: cur.id, srcIp: srcIp ?? dstIp };
    }

    const sel = selectRoute(lab, cur, dstIp);
    if ('fail' in sel) return { ok: false, path, kind: sel.kind, atDeviceId: cur.id, th: sel.fail };
    if (srcIp === null) srcIp = sel.out.ip;

    const domain = l2Domain(lab, sel.out);
    const hit = domain.find((r) => r.ifc.ip === sel.nextHop && r.ifc.up);
    if (!hit) {
      return {
        ok: false,
        path,
        kind: 'unresolved',
        atDeviceId: cur.id,
        th: diagnoseUnresolved(lab, cur, sel.out, sel.nextHop, sel.role),
      };
    }
    pushPath(path, [...hit.via, hit.ifc.deviceId]);
    const nh = getDevice(lab, hit.ifc.deviceId)!;
    if (sel.nextHop === dstIp) return { ok: true, path, dstDeviceId: nh.id, srcIp };
    if (!canForward(nh)) {
      return {
        ok: false,
        path,
        kind: 'general',
        atDeviceId: nh.id,
        th: `Gateway/next hop ${sel.nextHop} คือ ${nh.name} ซึ่งไม่ใช่อุปกรณ์ที่ส่งต่อแพ็กเก็ต (L3) จึงไม่ส่งต่อให้`,
      };
    }
    cur = nh;
  }
  return { ok: false, path, kind: 'noroute', atDeviceId: cur.id, th: 'แพ็กเก็ตวนเกินจำนวน hop ที่กำหนด (routing loop)' };
}

export interface PingResult {
  ok: boolean;
  srcId: string;
  dstIp: string;
  /** Windows-style outcome used by the PC terminal */
  kind: 'ok' | 'general-failure' | 'host-unreachable' | 'timeout';
  direction: 'forward' | 'return' | null;
  forwardPath: string[];
  returnPath: string[];
  failAtDeviceId?: string;
  /** Learner-facing explanation (Thai); separate from terminal output */
  explanation: string[];
  srcIp: string | null;
}

export function ping(lab: Lab, srcId: string, dstIp: string): PingResult {
  const src = getDevice(lab, srcId);
  const base = { srcId, dstIp, forwardPath: [] as string[], returnPath: [] as string[], srcIp: null };
  if (!src) {
    return { ...base, ok: false, kind: 'general-failure', direction: 'forward', explanation: ['ไม่พบอุปกรณ์ต้นทาง'] };
  }
  const nameOf = (id: string) => getDevice(lab, id)?.name ?? id;
  const fwd = deliver(lab, src, dstIp);
  if (!fwd.ok) {
    const kind = fwd.kind === 'general' ? 'general-failure' : fwd.kind === 'unresolved' ? 'host-unreachable' : 'timeout';
    return {
      ...base,
      ok: false,
      kind,
      direction: 'forward',
      forwardPath: fwd.path,
      failAtDeviceId: fwd.atDeviceId,
      explanation: [`ขาไป: ${fwd.th}`],
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
        `ขาไปสำเร็จ: ${fwd.path.map(nameOf).join(' → ')}`,
        `แต่ขากลับ (${dst.name} → ${src.name}) ไม่สำเร็จ: ${back.th}`,
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
    explanation: [
      `ขาไป: ${fwd.path.map(nameOf).join(' → ')}`,
      `ขากลับ: ${back.path.map(nameOf).join(' → ')}`,
      'ping สำเร็จ — เส้นทางขาไปและขากลับใช้งานได้ทั้งหมด',
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
