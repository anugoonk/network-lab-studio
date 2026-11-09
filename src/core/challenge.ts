import { getDevice, linkAt } from './lab';
import { linkStatus, ping } from './network';
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
  const d = getDevice(lab, check.deviceId);
  return `${d?.name ?? '?'} ${check.port} ลิงก์ up`;
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
  const d = getDevice(lab, check.deviceId);
  if (!d) return { pass: false, detail: 'ไม่พบอุปกรณ์ใน Lab' };
  const link = linkAt(lab, check.deviceId, check.port);
  if (!link) return { pass: false, detail: 'ผลจริง: พอร์ตนี้ยังไม่มีสาย' };
  const st = linkStatus(lab, link);
  return { pass: st.up, detail: st.up ? 'ผลจริง: ลิงก์ up' : 'ผลจริง: ลิงก์ down' };
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
