import { describe, expect, it } from 'vitest';
import { defaultLabel, evaluateChallenge, evaluateCheck } from '../src/core/challenge';
import { removeDevice, updateDevice } from '../src/core/lab';
import { parseImport, serializeExport } from '../src/core/persist';
import { buildInterVlanLab, buildTroubleshootLab } from '../src/core/sample';
import type { Check } from '../src/core/types';
import { byName, dev, run } from './helpers';

const report = (lab: ReturnType<typeof buildTroubleshootLab>) => evaluateChallenge(lab, lab.challenge!);

describe('troubleshooting sample', () => {
  it('starts broken: only the checks that do not depend on a fault pass', () => {
    const lab = buildTroubleshootLab();
    const r = report(lab);
    expect(r.total).toBe(6);
    expect(r.results.c1.pass).toBe(true); // PC-A <-> PC-C stays on VLAN 10
    expect(r.results.c5.pass).toBe(true); // R1 Gi0/0 link is fine
    expect(r.results.c6.pass).toBe(true); // no duplicate addresses
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
    expect(r.passed).toBe(6);
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
    const c = { ...(lab.challenge!.checks[1] as Extract<Check, { kind: 'ping' }>), expect: 'fail' as const };
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

describe('config-level checks', () => {
  const id = (lab: ReturnType<typeof buildTroubleshootLab>, n: string) => byName(lab, n).id;
  const mk = (c: Record<string, unknown>): Check => ({ id: 'x', label: '', ...c }) as unknown as Check;

  it('config-line looks at the real running-config (Cisco and Aruba), ignoring indentation', () => {
    let lab = buildTroubleshootLab();
    const want = mk({ kind: 'config-line', deviceId: id(lab, 'R2'), text: 'ip route 0.0.0.0 0.0.0.0 10.0.0.1', expect: 'present' });
    expect(evaluateCheck(lab, want).pass).toBe(false); // the injected fault
    lab = run(lab, 'R2', ['enable', 'configure terminal', 'ip route 0.0.0.0 0.0.0.0 10.0.0.1', 'end']).lab;
    expect(evaluateCheck(lab, want).pass).toBe(true);
    const absent = mk({ kind: 'config-line', deviceId: id(lab, 'R2'), text: 'ip route 0.0.0.0 0.0.0.0 10.0.0.1', expect: 'absent' });
    expect(evaluateCheck(lab, absent).pass).toBe(false);
    const aruba = mk({ kind: 'config-line', deviceId: id(lab, 'SW2'), text: 'vlan trunk allowed 10,20', expect: 'present' });
    expect(evaluateCheck(lab, aruba).pass).toBe(true);
    const onPc = mk({ kind: 'config-line', deviceId: id(lab, 'PC-A'), text: 'anything', expect: 'present' });
    expect(evaluateCheck(lab, onPc).detail).toMatch(/ไม่มี running-config/);
  });

  it('trunk-vlan follows allowed lists on Cisco and Aruba and treats access ports as not carrying', () => {
    let lab = buildTroubleshootLab();
    const gi2 = (vlan: number, expect: 'allowed' | 'blocked') => mk({ kind: 'trunk-vlan', deviceId: id(lab, 'SW1'), port: 'GigabitEthernet0/2', vlan, expect });
    expect(evaluateCheck(lab, gi2(20, 'allowed')).pass).toBe(false); // fault: only VLAN 10 allowed
    expect(evaluateCheck(lab, gi2(20, 'blocked')).pass).toBe(true);
    expect(evaluateCheck(lab, gi2(10, 'allowed')).pass).toBe(true);
    lab = run(lab, 'SW1', ['enable', 'configure terminal', 'interface gi0/2', 'switchport trunk allowed vlan add 20']).lab;
    expect(evaluateCheck(lab, gi2(20, 'allowed')).pass).toBe(true);
    const access = mk({ kind: 'trunk-vlan', deviceId: id(lab, 'SW1'), port: 'FastEthernet0/1', vlan: 10, expect: 'allowed' });
    expect(evaluateCheck(lab, access).pass).toBe(false);
    const aruba = mk({ kind: 'trunk-vlan', deviceId: id(lab, 'SW2'), port: '1/1/24', vlan: 20, expect: 'allowed' });
    expect(evaluateCheck(lab, aruba).pass).toBe(true);
  });

  it('port-admin reads the administrative state', () => {
    let lab = buildTroubleshootLab();
    const c = mk({ kind: 'port-admin', deviceId: id(lab, 'R1'), port: 'GigabitEthernet0/2', expect: 'down' });
    expect(evaluateCheck(lab, c).pass).toBe(true); // router ports start shut
    lab = run(lab, 'R1', ['enable', 'configure terminal', 'interface gi0/2', 'no shutdown']).lab;
    expect(evaluateCheck(lab, c).pass).toBe(false);
  });

  it('route: connected and static (with a reachable next hop) count; a static route behind a down link does not', () => {
    let lab = buildTroubleshootLab();
    const r = (dev: string, net: string, prefix: number) => mk({ kind: 'route', deviceId: id(lab, dev), net, prefix });
    expect(evaluateCheck(lab, r('R1', '192.168.10.0', 24)).pass).toBe(true); // connected
    expect(evaluateCheck(lab, r('R1', '172.16.0.0', 24)).pass).toBe(true); // static via 10.0.0.2
    expect(evaluateCheck(lab, r('R2', '0.0.0.0', 0)).pass).toBe(false); // injected fault
    expect(evaluateCheck(lab, r('R1', '172.16.0.0', 16)).pass).toBe(false); // wrong prefix
    lab = run(lab, 'R1', ['enable', 'configure terminal', 'interface gi0/1', 'shutdown']).lab;
    expect(evaluateCheck(lab, r('R1', '172.16.0.0', 24)).pass).toBe(false);
    expect(evaluateCheck(lab, r('R1', '10.0.0.0', 30)).pass).toBe(false);
  });

  it('no-dup-ip flips when two hosts in one VLAN share an address', () => {
    let lab = buildTroubleshootLab();
    const c = mk({ kind: 'no-dup-ip' });
    expect(evaluateCheck(lab, c).pass).toBe(true);
    lab = updateDevice(lab, id(lab, 'PC-C'), (d) => ({ ...d, ifaces: d.ifaces.map((i) => ({ ...i, ip: '192.168.10.11' })) }));
    const r = evaluateCheck(lab, c);
    expect(r.pass).toBe(false);
    expect(r.detail).toBe('ผลจริง: พบ IP ซ้ำ 1 รายการ');
  });

  it('every new kind gets a readable default label and survives export/import; bad references are rejected', () => {
    let lab = buildTroubleshootLab();
    const sw1 = id(lab, 'SW1');
    const extra: Check[] = [
      { id: 'c10', kind: 'config-line', label: '', deviceId: sw1, text: 'hostname SW1', expect: 'present' },
      { id: 'c11', kind: 'trunk-vlan', label: '', deviceId: sw1, port: 'GigabitEthernet0/2', vlan: 20, expect: 'allowed' },
      { id: 'c12', kind: 'port-admin', label: '', deviceId: sw1, port: 'GigabitEthernet0/2', expect: 'up' },
      { id: 'c13', kind: 'route', label: '', deviceId: id(lab, 'R1'), net: '172.16.0.0', prefix: 24 },
      { id: 'c14', kind: 'no-dup-ip', label: '' },
    ];
    const labeled = extra.map((c) => ({ ...c, label: defaultLabel(lab, c) }));
    expect(labeled.map((c) => c.label)).toEqual([
      'SW1 มี config "hostname SW1"',
      'SW1 GigabitEthernet0/2 ส่ง VLAN 20 ได้',
      'SW1 GigabitEthernet0/2 เปิดใช้งาน (no shutdown)',
      'R1 มีเส้นทางไป 172.16.0.0/24',
      'ไม่มี IP ซ้ำใน L2 domain เดียวกัน',
    ]);
    lab = { ...lab, challenge: { ...lab.challenge!, checks: [...lab.challenge!.checks, ...labeled] } };
    const r = parseImport(serializeExport(lab));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.lab.challenge!.checks.slice(-5)).toEqual(labeled);

    const bad = JSON.parse(serializeExport(lab));
    bad.lab.challenge.checks.find((c: { id: string }) => c.id === 'c11').port = 'Gi9/9';
    expect(parseImport(JSON.stringify(bad)).ok).toBe(false);
    const bad2 = JSON.parse(serializeExport(lab));
    bad2.lab.challenge.checks.find((c: { id: string }) => c.id === 'c13').prefix = 40;
    expect(parseImport(JSON.stringify(bad2)).ok).toBe(false);
  });
});
