import { describe, expect, it } from 'vitest';
import { defaultLabel, evaluateChallenge, evaluateCheck } from '../src/core/challenge';
import { removeDevice, updateDevice } from '../src/core/lab';
import { parseImport, serializeExport } from '../src/core/persist';
import { buildInterVlanLab, buildTroubleshootLab } from '../src/core/sample';
import { byName, dev, run } from './helpers';

const report = (lab: ReturnType<typeof buildTroubleshootLab>) => evaluateChallenge(lab, lab.challenge!);

describe('troubleshooting sample', () => {
  it('starts broken: only the checks that do not depend on a fault pass', () => {
    const lab = buildTroubleshootLab();
    const r = report(lab);
    expect(r.total).toBe(5);
    expect(r.results.c1.pass).toBe(true); // PC-A <-> PC-C stays on VLAN 10
    expect(r.results.c5.pass).toBe(true); // R1 Gi0/0 link is fine
    for (const id of ['c2', 'c3', 'c4']) expect(r.results[id].pass, id).toBe(false);
    expect(r.allPassed).toBe(false);
  });

  it('is exactly the inter-VLAN lab plus three faults (same devices and cables)', () => {
    const t = buildTroubleshootLab();
    const base = buildInterVlanLab();
    expect(t.devices.map((d) => d.name)).toEqual(base.devices.map((d) => d.name));
    expect(t.links).toEqual(base.links);
  });

  it('fixing the real faults through the CLI makes every check pass, one at a time', () => {
    let lab = buildTroubleshootLab();
    lab = run(lab, 'SW1', ['enable', 'configure terminal', 'interface gi0/2', 'switchport trunk allowed vlan add 20', 'end']).lab;
    let r = report(lab);
    expect(r.results.c2.pass).toBe(true);
    expect(r.results.c3.pass).toBe(false);
    lab = updateDevice(lab, byName(lab, 'PC-C').id, (d) => ({ ...d, gateway: '192.168.10.1' }));
    r = report(lab);
    expect(r.results.c3.pass).toBe(true);
    expect(r.results.c4.pass).toBe(false);
    lab = run(lab, 'R2', ['enable', 'configure terminal', 'ip route 0.0.0.0 0.0.0.0 10.0.0.1', 'end']).lab;
    r = report(lab);
    expect(r.allPassed).toBe(true);
    expect(r.passed).toBe(5);
  });

  it('result detail never reveals the cause', () => {
    const lab = buildTroubleshootLab();
    const r = report(lab);
    for (const id of ['c2', 'c3', 'c4']) expect(r.results[id].detail).toBe('ผลจริง: ping ไม่สำเร็จ');
  });
});

describe('check kinds', () => {
  it('"must fail" ping passes only while the destination is unreachable', () => {
    const lab = buildTroubleshootLab();
    const c = { ...lab.challenge!.checks[1], expect: 'fail' as const };
    expect(evaluateCheck(lab, c).pass).toBe(true);
  });

  it('link-up fails when the port is shut down or uncabled', () => {
    let lab = buildTroubleshootLab();
    const check = lab.challenge!.checks[4];
    expect(evaluateCheck(lab, check).pass).toBe(true);
    lab = run(lab, 'R1', ['enable', 'configure terminal', 'interface gi0/0', 'shutdown']).lab;
    expect(evaluateCheck(lab, check).pass).toBe(false);
    const r2 = byName(lab, 'R2');
    expect(evaluateCheck(lab, { id: 'x', kind: 'link-up', label: '', deviceId: r2.id, port: 'GigabitEthernet0/2' }).detail).toMatch(/ยังไม่มีสาย/);
  });

  it('a check on a deleted device fails instead of throwing', () => {
    const lab = buildTroubleshootLab();
    const gone = removeDevice(lab, byName(lab, 'PC-A').id);
    expect(evaluateChallenge(gone, gone.challenge!).results.c1.pass).toBe(false);
  });

  it('default label names the device', () => {
    const lab = buildTroubleshootLab();
    expect(defaultLabel(lab, lab.challenge!.checks[0])).toContain('PC-A');
    expect(dev(lab, 'PC-A').name).toBe('PC-A');
  });
});

describe('save / load', () => {
  it('challenge round-trips through export/import', () => {
    const lab = buildTroubleshootLab();
    const r = parseImport(serializeExport(lab));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.lab.challenge).toEqual(lab.challenge);
  });

  it('rejects a check that points at a missing device or port', () => {
    const j = JSON.parse(serializeExport(buildTroubleshootLab()));
    j.lab.challenge.checks[0].from = 'nope';
    expect(parseImport(JSON.stringify(j)).ok).toBe(false);
    const k = JSON.parse(serializeExport(buildTroubleshootLab()));
    k.lab.challenge.checks[4].port = 'Gi9/9';
    expect(parseImport(JSON.stringify(k)).ok).toBe(false);
  });

  it('rejects a malformed ping target', () => {
    const j = JSON.parse(serializeExport(buildTroubleshootLab()));
    j.lab.challenge.checks[0].to = 'not-an-ip';
    expect(parseImport(JSON.stringify(j)).ok).toBe(false);
  });

  it('labs without a challenge still load', () => {
    const j = JSON.parse(serializeExport(buildInterVlanLab()));
    expect(j.lab.challenge).toBeUndefined();
    expect(parseImport(JSON.stringify(j)).ok).toBe(true);
  });
});
