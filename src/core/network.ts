/**
 * Network behaviour engine. Everything here is a pure function of the current Lab:
 * the canvas, the CLI `show` output, the Lab Inspector and `ping` all read the same data,
 * and reachability is recomputed from cables + port state + VLANs on every call.
 */
import { sameSubnet, maskToPrefix } from './ip';
import { getDevice, getIface, linkAt, peerOf } from './lab';
import { PROFILES, shortPort } from './profiles';
import type { Device, Endpoint, Iface, Lab, Link } from './types';

const isSwitch = (d: Device) => PROFILES[d.kind].isSwitch;
const isRouter = (d: Device) => PROFILES[d.kind].isRouter;

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

/** Is this switch port participating in L2 forwarding in its access VLAN? */
export function isL2Member(dev: Device, iface: Iface): boolean {
  if (!isSwitch(dev)) return false;
  if (dev.kind === 'aruba-switch' && iface.routed) return false;
  return dev.vlans.some((v) => v.id === iface.accessVlan);
}

// ───────────────────────── Layer 2 domain ─────────────────────────

export interface Reached {
  ep: Endpoint;
  /** switches traversed (device ids, in order) */
  via: string[];
}

/** All end-device ports (PC / router) that share a broadcast domain with `src` right now. Loop-safe (visited set). */
export function l2Domain(lab: Lab, src: Endpoint): Reached[] {
  const out: Reached[] = [];
  const first = linkAt(lab, src.deviceId, src.port);
  if (!first || !linkStatus(lab, first).up) return out;

  const visited = new Set<string>();
  const queue: { sw: string; vlan: number; via: string[] }[] = [];

  const enter = (peer: Endpoint, via: string[]) => {
    const pd = getDevice(lab, peer.deviceId);
    if (!pd) return;
    if (!isSwitch(pd)) {
      if (!(peer.deviceId === src.deviceId && peer.port === src.port)) out.push({ ep: peer, via });
      return;
    }
    const pi = getIface(pd, peer.port);
    if (!pi || !isL2Member(pd, pi)) return;
    const key = `${pd.id}|${pi.accessVlan}`;
    if (visited.has(key)) return;
    visited.add(key);
    queue.push({ sw: pd.id, vlan: pi.accessVlan, via: [...via, pd.id] });
  };

  enter(peerOf(first, src.deviceId, src.port), []);
  while (queue.length) {
    const n = queue.shift()!;
    const sw = getDevice(lab, n.sw)!;
    for (const i of sw.ifaces) {
      if (!isL2Member(sw, i) || i.accessVlan !== n.vlan) continue;
      const l = linkAt(lab, sw.id, i.name);
      if (!l || !linkStatus(lab, l).up) continue;
      enter(peerOf(l, sw.id, i.name), n.via);
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

function findPhysicalPath(lab: Lab, startDev: Device, firstLink: Link, goal: Device): Step[] | null {
  const peer0 = peerOf(firstLink, startDev.id, firstLink.a.deviceId === startDev.id ? firstLink.a.port : firstLink.b.port);
  const outPort = firstLink.a.deviceId === startDev.id ? firstLink.a.port : firstLink.b.port;
  const first: Step = { from: startDev, out: outPort, to: getDevice(lab, peer0.deviceId)!, in: peer0.port };
  if (first.to.id === goal.id) return [first];
  if (!isSwitch(first.to)) return null;
  const prev = new Map<string, Step>();
  const seen = new Set<string>([startDev.id, first.to.id]);
  let frontier: Device[] = [first.to];
  while (frontier.length) {
    const next: Device[] = [];
    for (const d of frontier) {
      for (const l of lab.links) {
        const mine = l.a.deviceId === d.id ? l.a : l.b.deviceId === d.id ? l.b : null;
        if (!mine) continue;
        const other = mine === l.a ? l.b : l.a;
        if (seen.has(other.deviceId)) continue;
        const od = getDevice(lab, other.deviceId);
        if (!od) continue;
        seen.add(od.id);
        prev.set(od.id, { from: d, out: mine.port, to: od, in: other.port });
        if (od.id === goal.id) {
          const steps: Step[] = [];
          let cur: Step | undefined = prev.get(goal.id);
          while (cur) {
            steps.unshift(cur);
            cur = cur.from.id === first.to.id ? undefined : prev.get(cur.from.id);
          }
          return [first, ...steps];
        }
        // only switches are transit devices
        if (isSwitch(od)) next.push(od);
      }
    }
    frontier = next;
  }
  return null;
}

/** Explain (in Thai) why `cur` cannot resolve `targetIp` on `iface`. */
export function diagnoseUnresolved(
  lab: Lab,
  cur: Device,
  iface: Iface,
  targetIp: string,
  role: 'destination' | 'gateway',
): string {
  const owners = lab.devices.filter(
    (d) => d.id !== cur.id && !isSwitch(d) && d.ifaces.some((i) => i.ip === targetIp),
  );
  const roleTh = role === 'gateway' ? `Default gateway ${targetIp}` : `ปลายทาง ${targetIp}`;
  const firstLink = linkAt(lab, cur.id, iface.name);
  if (!iface.adminUp) return `พอร์ต ${iface.name} ของ ${cur.name} ถูก shutdown จึงส่งข้อมูลออกไม่ได้`;
  if (!firstLink) return `พอร์ต ${iface.name} ของ ${cur.name} ยังไม่ได้เชื่อมสาย จึงเข้าถึง ${roleTh} ไม่ได้`;
  if (owners.length === 0) {
    return role === 'gateway'
      ? `${cur.name} ส่งไปที่ gateway ${targetIp} แต่ไม่มีอุปกรณ์ใดใช้ IP นี้ในเครือข่ายที่เข้าถึงได้ (gateway ตั้งผิด หรืออุปกรณ์ gateway ยังไม่ได้ตั้ง IP / ยังปิดพอร์ตอยู่)`
      : `ไม่พบอุปกรณ์ที่ใช้ IP ${targetIp} ในเครือข่ายที่ ${cur.name} เข้าถึงได้ (IP พิมพ์ผิด หรืออุปกรณ์ปลายทางยังไม่ได้ตั้ง IP / พอร์ตยัง shutdown)`;
  }
  // try each candidate owner, report the first physical-path problem found
  const problems: string[] = [];
  for (const owner of owners) {
    const oi = owner.ifaces.find((i) => i.ip === targetIp)!;
    const steps = findPhysicalPath(lab, cur, firstLink, owner);
    if (!steps) {
      problems.push(`ไม่มีสายเชื่อมต่อต่อเนื่องจาก ${cur.name} ไปยัง ${owner.name} (ที่ใช้ IP ${targetIp})`);
      continue;
    }
    if (!oi.adminUp) {
      problems.push(`พอร์ต ${oi.name} ของ ${owner.name} (ที่ใช้ IP ${targetIp}) ถูก shutdown`);
      continue;
    }
    const msg = walkSteps(cur, steps);
    if (msg) problems.push(msg);
  }
  return problems[0] ?? `${cur.name} หา ${roleTh} บนลิงก์เดียวกันไม่พบ`;
}

function walkSteps(cur: Device, steps: Step[]): string | null {
  let reached = cur;
  const lead = () => (reached.id === cur.id ? `${cur.name}:` : `${cur.name} ไปถึง ${reached.name} ได้ แต่`);
  const memberProblem = (sw: Device, port: string): string | null => {
    const i = getIface(sw, port);
    if (!i) return null;
    if (sw.kind === 'aruba-switch' && i.routed)
      return `${lead()} พอร์ต ${port} ของ ${sw.name} ยังเป็น routed port (AOS-CX ต้องสั่ง no routing ก่อนใช้เป็น access port)`;
    if (!sw.vlans.some((v) => v.id === i.accessVlan))
      return `${lead()} พอร์ต ${port} ของ ${sw.name} อยู่ VLAN ${i.accessVlan} ซึ่งยังไม่ได้สร้างบน ${sw.name}`;
    return null;
  };
  for (let k = 0; k < steps.length; k++) {
    const s = steps[k];
    const oi = getIface(s.from, s.out);
    const ii = getIface(s.to, s.in);
    if (oi && !oi.adminUp)
      return `${lead()} พอร์ต ${s.out} ของ ${s.from.name} ถูก shutdown (administratively down)`;
    if (ii && !ii.adminUp)
      return `${lead()} พอร์ต ${s.in} ของ ${s.to.name} ถูก shutdown (administratively down)`;
    if (isSwitch(s.to)) {
      const p1 = memberProblem(s.to, s.in);
      if (p1) return p1;
      const next = steps[k + 1];
      if (next) {
        const p2 = memberProblem(s.to, next.out);
        if (p2) return p2;
        const vin = getIface(s.to, s.in)!.accessVlan;
        const vout = getIface(s.to, next.out)!.accessVlan;
        if (vin !== vout)
          return `${lead()} ใน ${s.to.name} พอร์ต ${s.in} อยู่ VLAN ${vin} แต่พอร์ต ${next.out} อยู่ VLAN ${vout} จึงส่งข้ามกันไม่ได้`;
      }
    }
    reached = s.to;
  }
  return null;
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

function ownedAddress(d: Device, ip: string): Iface | undefined {
  return d.ifaces.find((i) => i.ip === ip && i.adminUp);
}

function ifaceLineUp(lab: Lab, d: Device, i: Iface): boolean {
  const l = linkAt(lab, d.id, i.name);
  return !!l && linkStatus(lab, l).up;
}

function deliver(lab: Lab, from: Device, dstIp: string): DeliverOk | DeliverFail {
  const path: string[] = [from.id];
  let cur = from;
  let srcIp: string | null = null;

  for (let hop = 0; hop < 16; hop++) {
    // does the current node own the destination address?
    const own = ownedAddress(cur, dstIp);
    if (own && (cur.id === from.id || ifaceLineUp(lab, cur, own))) {
      return { ok: true, path, dstDeviceId: cur.id, srcIp: srcIp ?? dstIp };
    }

    // ---- route selection ----
    let out: Iface | null = null;
    let nextHop = dstIp;
    let role: 'destination' | 'gateway' = 'destination';
    let bestPrefix = -1;
    for (const i of cur.ifaces) {
      if (!i.ip || !i.mask || !i.adminUp) continue;
      if (isRouter(cur) && !ifaceLineUp(lab, cur, i)) continue; // connected route needs up/up
      if (sameSubnet(i.ip, dstIp, i.mask) && maskToPrefix(i.mask) > bestPrefix) {
        out = i;
        bestPrefix = maskToPrefix(i.mask);
      }
    }
    if (!out) {
      if (cur.kind === 'pc') {
        const nic = cur.ifaces[0];
        if (!nic.ip || !nic.mask) {
          return { ok: false, path, kind: 'general', atDeviceId: cur.id, th: `${cur.name} ยังไม่ได้ตั้งค่า IP address` };
        }
        if (!cur.gateway) {
          return {
            ok: false,
            path,
            kind: 'general',
            atDeviceId: cur.id,
            th: `ปลายทาง ${dstIp} อยู่นอก subnet ของ ${cur.name} แต่ ${cur.name} ไม่ได้ตั้ง default gateway`,
          };
        }
        if (!sameSubnet(nic.ip, cur.gateway, nic.mask)) {
          return {
            ok: false,
            path,
            kind: 'general',
            atDeviceId: cur.id,
            th: `Default gateway ${cur.gateway} ไม่อยู่ใน subnet เดียวกับ ${cur.name} (${nic.ip}/${maskToPrefix(nic.mask)}) จึงส่งต่อออกนอก subnet ไม่ได้`,
          };
        }
        out = nic;
        nextHop = cur.gateway;
        role = 'gateway';
      } else {
        return {
          ok: false,
          path,
          kind: 'noroute',
          atDeviceId: cur.id,
          th: `${cur.name} ไม่มีเส้นทางไป ${dstIp} (ไม่อยู่ใน subnet ของ interface ที่ up/up และรุ่นแรกไม่มี static route)`,
        };
      }
    }
    if (srcIp === null) srcIp = out.ip!;

    // ---- ARP-equivalent: who owns nextHop in this broadcast domain? ----
    const domain = l2Domain(lab, { deviceId: cur.id, port: out.name });
    const hit = domain.find((r) => {
      const d = getDevice(lab, r.ep.deviceId)!;
      const i = getIface(d, r.ep.port)!;
      return i.ip === nextHop && i.adminUp;
    });
    if (!hit) {
      return {
        ok: false,
        path,
        kind: 'unresolved',
        atDeviceId: cur.id,
        th: diagnoseUnresolved(lab, cur, out, nextHop, role),
      };
    }
    path.push(...hit.via, hit.ep.deviceId);
    const nh = getDevice(lab, hit.ep.deviceId)!;
    if (nextHop === dstIp) {
      return { ok: true, path, dstDeviceId: nh.id, srcIp };
    }
    if (!isRouter(nh)) {
      return {
        ok: false,
        path,
        kind: 'general',
        atDeviceId: nh.id,
        th: `Gateway ${nextHop} คือ ${nh.name} ซึ่งไม่ใช่ router จึงไม่ส่งต่อแพ็กเก็ตให้`,
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
    const kind =
      fwd.kind === 'general' ? 'general-failure' : fwd.kind === 'unresolved' ? 'host-unreachable' : 'timeout';
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
  return lab.devices.find((d) => d.ifaces.some((i) => i.ip === ip));
}
