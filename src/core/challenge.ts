import { arubaRunningConfig } from './cli/aruba';
import { ciscoRunningConfig } from './cli/cisco';
import { duplicateIps } from './l2tables';
import { getDevice, getIface, linkAt } from './lab';
import { ipToString, maskToPrefix, networkOf, parseIp } from './ip';
import { allowsVlan, l3Interfaces, linkStatus, ping } from './network';
import { PROFILES } from './profiles';
import type { Challenge, Check, Lab } from './types';

export const CHALLENGE_LIMITS = { checks: 50 } as const;

export interface CheckResult {
  pass: boolean;
  /** what actually happened — deliberately never says *why* (the learner has to troubleshoot) */
  detail: string;
}

export function emptyChallenge(title = 'Challenge'): Challenge {
  return { title, goal: 'อธิบายเป้าหมายของโจทย์ที่นี่ แล้วเพิ่ม Check ที่ต้องผ่าน', checks: [] };
}

export function nextCheckId(challenge: Challenge): string {
  const nums = challenge.checks.map((c) => Number(/^c(\d+)$/.exec(c.id)?.[1] ?? 0));
  return `c${Math.max(0, ...nums) + 1}`;
}

export function defaultLabel(lab: Lab, check: Check): string {
  if (check.kind === 'ping') {
    const from = getDevice(lab, check.from)?.name ?? '?';
    return check.expect === 'success' ? `${from} ping ${check.to} ได้` : `${from} ping ${check.to} ต้องไม่ได้`;
  }
  const name = ('deviceId' in check ? getDevice(lab, check.deviceId)?.name : undefined) ?? '?';
  switch (check.kind) {
    case 'link-up':
      return `${name} ${check.port} ลิงก์ up`;
    case 'config-line':
      return check.expect === 'present' ? `${name} มี config "${check.text}"` : `${name} ต้องไม่มี config "${check.text}"`;
    case 'trunk-vlan':
      return check.expect === 'allowed' ? `${name} ${check.port} ส่ง VLAN ${check.vlan} ได้` : `${name} ${check.port} ต้องไม่ส่ง VLAN ${check.vlan}`;
    case 'port-admin':
      return `${name} ${check.port} ${check.expect === 'up' ? 'เปิดใช้งาน (no shutdown)' : 'ถูกปิด (shutdown)'}`;
    case 'route':
      return `${name} มีเส้นทางไป ${check.net}/${check.prefix}`;
    case 'no-dup-ip':
      return 'ไม่มี IP ซ้ำใน L2 domain เดียวกัน';
  }
}

function prefixToMask(p: number): string {
  const n = p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0;
  return ipToString(n);
}

/** installed route = connected network of an up interface, or a static route whose next hop is reachable through one */
export function hasRoute(lab: Lab, deviceId: string, net: string, prefix: number): boolean {
  const dev = getDevice(lab, deviceId);
  const want = parseIp(net);
  if (!dev || want === null) return false;
  const up = l3Interfaces(lab, dev).filter((i) => i.up);
  const wantMask = prefixToMask(prefix);
  if (up.some((i) => maskToPrefix(i.mask) === prefix && networkOf(i.ip, i.mask) === networkOf(net, wantMask))) return true;
  return dev.routes.some(
    (r) =>
      maskToPrefix(r.mask) === prefix &&
      parseIp(r.net) === want &&
      up.some((i) => parseIp(r.nextHop) !== null && networkOf(i.ip, i.mask) === networkOf(r.nextHop, i.mask)),
  );
}

function runningConfigOf(lab: Lab, deviceId: string): string[] | null {
  const dev = getDevice(lab, deviceId);
  if (!dev) return null;
  const p = PROFILES[dev.kind];
  if (!p.hasCli || p.isHost) return null;
  return (p.vendor === 'aruba' ? arubaRunningConfig(dev) : ciscoRunningConfig(dev)).map((l) => l.trim());
}

export function evaluateCheck(lab: Lab, check: Check): CheckResult {
  if (check.kind === 'ping') {
    if (!getDevice(lab, check.from)) return { pass: false, detail: 'ไม่พบอุปกรณ์ต้นทางใน Lab' };
    const r = ping(lab, check.from, check.to);
    return {
      pass: r.ok === (check.expect === 'success'),
      detail: r.ok ? 'ผลจริง: ping สำเร็จ' : 'ผลจริง: ping ไม่สำเร็จ',
    };
  }
  if (check.kind === 'no-dup-ip') {
    const dups = duplicateIps(lab);
    return { pass: dups.length === 0, detail: dups.length === 0 ? 'ผลจริง: ไม่พบ IP ซ้ำ' : `ผลจริง: พบ IP ซ้ำ ${dups.length} รายการ` };
  }
  const d = getDevice(lab, check.deviceId);
  if (!d) return { pass: false, detail: 'ไม่พบอุปกรณ์ใน Lab' };
  switch (check.kind) {
    case 'link-up': {
      const link = linkAt(lab, check.deviceId, check.port);
      if (!link) return { pass: false, detail: 'ผลจริง: พอร์ตนี้ยังไม่มีสาย' };
      const st = linkStatus(lab, link);
      return { pass: st.up, detail: st.up ? 'ผลจริง: ลิงก์ up' : 'ผลจริง: ลิงก์ down' };
    }
    case 'config-line': {
      const cfg = runningConfigOf(lab, check.deviceId);
      if (!cfg) return { pass: false, detail: 'อุปกรณ์ชนิดนี้ไม่มี running-config ให้ตรวจ' };
      const has = cfg.includes(check.text.trim());
      return { pass: has === (check.expect === 'present'), detail: has ? 'ผลจริง: พบบรรทัดนี้ใน running-config' : 'ผลจริง: ไม่พบบรรทัดนี้ใน running-config' };
    }
    case 'trunk-vlan': {
      const i = getIface(d, check.port);
      if (!i) return { pass: false, detail: 'ไม่พบพอร์ต' };
      const carries = i.trunk && !(PROFILES[d.kind].vendor === 'aruba' && i.routed) && allowsVlan(i, check.vlan);
      return { pass: carries === (check.expect === 'allowed'), detail: carries ? `ผลจริง: พอร์ตส่ง VLAN ${check.vlan} ได้` : `ผลจริง: พอร์ตไม่ส่ง VLAN ${check.vlan}` };
    }
    case 'port-admin': {
      const i = getIface(d, check.port);
      if (!i) return { pass: false, detail: 'ไม่พบพอร์ต' };
      return { pass: i.adminUp === (check.expect === 'up'), detail: i.adminUp ? 'ผลจริง: พอร์ตเปิดอยู่' : 'ผลจริง: พอร์ตถูก shutdown' };
    }
    case 'route': {
      const ok = hasRoute(lab, check.deviceId, check.net, check.prefix);
      return { pass: ok, detail: ok ? 'ผลจริง: มีเส้นทางนี้ในตาราง routing' : 'ผลจริง: ไม่มีเส้นทางนี้ในตาราง routing' };
    }
  }
}

export interface ChallengeReport {
  results: Record<string, CheckResult>;
  passed: number;
  total: number;
  allPassed: boolean;
}

export function evaluateChallenge(lab: Lab, challenge: Challenge): ChallengeReport {
  const results: Record<string, CheckResult> = {};
  let passed = 0;
  for (const c of challenge.checks) {
    const r = evaluateCheck(lab, c);
    results[c.id] = r;
    if (r.pass) passed++;
  }
  return { results, passed, total: challenge.checks.length, allPassed: challenge.checks.length > 0 && passed === challenge.checks.length };
}
