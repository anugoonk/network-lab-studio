import { describe, expect, it } from 'vitest';
import { applyStart, captureStart, evaluateChallenge } from '../src/core/challenge';
import { duplicateIps } from '../src/core/l2tables';
import { updateDevice } from '../src/core/lab';
import { parseImport, serializeExport } from '../src/core/persist';
import { SAMPLES, buildCampusLab, buildDupIpLab, type SampleKind } from '../src/core/sample';
import type { Lab } from '../src/core/types';
import { byName, run } from './helpers';

const score = (lab: Lab) => evaluateChallenge(lab, lab.challenge!);
const passes = (lab: Lab) => Object.entries(score(lab).results).filter(([, r]) => r.pass).map(([id]) => id);

describe('sample catalog', () => {
  const kinds = Object.keys(SAMPLES) as SampleKind[];
  for (const k of kinds) {
    it(`${k}: builds, has unique ids, round-trips through export/import`, () => {
      const lab = SAMPLES[k].build();
      expect(new Set(lab.devices.map((d) => d.id)).size).toBe(lab.devices.length);
      expect(new Set(lab.devices.map((d) => d.name)).size).toBe(lab.devices.length);
      const r = parseImport(serializeExport(lab));
      expect(r.ok, r.ok ? '' : r.error).toBe(true);
      expect(!!lab.challenge).toBe(SAMPLES[k].challenge);
      if (SAMPLES[k].challenge) {
        expect(lab.guide).toBeDefined();
        expect(lab.challenge!.start).toBeDefined();
        expect(lab.challenge!.checks.length).toBeGreaterThanOrEqual(4);
      }
    });
  }
});

describe('Challenge 2: duplicate IP + wrong VLAN + shut port', () => {
  it('starts with exactly one passing check and a real duplicate', () => {
    const lab = buildDupIpLab();
    expect(passes(lab)).toEqual(['c1']);
    const d = duplicateIps(lab);
    expect(d).toHaveLength(1);
    expect(d[0].ip).toBe('192.168.1.102');
    expect(d[0].members.map((m) => m.deviceName)).toEqual(['PC-02', 'PC-04']);
  });

  it('the symptoms can be traced with the new tools (MAC table / ARP)', () => {
    const lab = buildDupIpLab();
    // PC-08 is in VLAN 20 on SW2, PC-09's port is down: neither is in VLAN 10's MAC table
    const out = run(lab, 'SW2', ['show mac-address-table']).results[0].output.join('\n');
    expect(out).not.toMatch(/\s10\s+dynamic\s+1\/1\/4/); // PC-09 (port shut)
    expect(out).toMatch(/\s20\s+dynamic\s+1\/1\/3/); // PC-08 landed in VLAN 20
  });

  it('fixing the three real faults through the CLI / config makes every check pass, one at a time', () => {
    let lab = buildDupIpLab();
    lab = run(lab, 'SW2', ['configure terminal', 'interface 1/1/3', 'vlan access 10', 'end']).lab;
    expect(passes(lab)).toEqual(['c1', 'c2']);
    lab = run(lab, 'SW2', ['configure terminal', 'interface 1/1/4', 'no shutdown', 'end']).lab;
    expect(passes(lab)).toEqual(['c1', 'c2', 'c3']);
    lab = updateDevice(lab, byName(lab, 'PC-04').id, (d) => ({ ...d, ifaces: d.ifaces.map((i) => ({ ...i, ip: '192.168.1.104' })) }));
    expect(score(lab).allPassed).toBe(true);
  });
});

describe('Challenge 3: campus + ISP (L3 switch, server, AP)', () => {
  it('uses the new device kinds', () => {
    const kinds = new Set(buildCampusLab().devices.map((d) => d.kind));
    for (const k of ['l3-switch', 'isp-router', 'server', 'laptop', 'wireless-ap', 'pc', 'cisco-switch']) expect(kinds.has(k as never)).toBe(true);
  });

  it('starts at 3/6; the faults are layered and each fix reveals the next', () => {
    let lab = buildCampusLab();
    expect(passes(lab)).toEqual(['c1', 'c5', 'c6']);
    // fault 1: DSW1 interface vlan 20 is shut
    lab = run(lab, 'DSW1', ['configure terminal', 'interface vlan 20', 'no shutdown', 'end']).lab;
    expect(passes(lab)).toEqual(['c1', 'c2', 'c5', 'c6']);
    // fault 2: DSW1 has no default route (the forward path to the ISP side)
    lab = run(lab, 'DSW1', ['configure terminal', 'ip route 0.0.0.0/0 10.1.1.1', 'end']).lab;
    expect(passes(lab)).toEqual(['c1', 'c2', 'c4', 'c5', 'c6']); // LAP-01 works (ISP knows 192.168.20.0), PC-01 still fails on the way back
    // fault 3: ISP1 has no route back to 192.168.10.0/24
    lab = run(lab, 'ISP1', ['enable', 'configure terminal', 'ip route 192.168.10.0 255.255.255.0 10.1.1.2', 'end']).lab;
    expect(score(lab).allPassed).toBe(true);
  });

  it('PC-01 failure before the last fix is a return-path problem (Inspector wording)', async () => {
    let lab = buildCampusLab();
    lab = run(lab, 'DSW1', ['configure terminal', 'interface vlan 20', 'no shutdown', 'ip route 0.0.0.0/0 10.1.1.1', 'end']).lab;
    // 'ip route' was typed inside the SVI context, so redo it at global level
    lab = run(lab, 'DSW1', ['configure terminal', 'ip route 0.0.0.0/0 10.1.1.1', 'end']).lab;
    const { ping } = await import('../src/core/network');
    const r = ping(lab, byName(lab, 'PC-01').id, '203.0.113.10');
    expect(r.ok).toBe(false);
    expect(r.direction).toBe('return');
  });

  it('the AP is draw-only and does not disturb anything', () => {
    const lab = buildCampusLab();
    expect(run(lab, 'SW1', ['enable', 'show mac address-table']).results[1].output.join('\n')).toContain('Fa0/1');
  });
});

describe('reset to the challenge start', () => {
  it('applyStart returns the faulty start state, keeping guide and checks, and does not share objects with the snapshot', () => {
    const start = buildCampusLab();
    let lab = run(start, 'DSW1', ['configure terminal', 'interface vlan 20', 'no shutdown', 'ip route 0.0.0.0/0 10.1.1.1', 'end']).lab;
    lab = updateDevice(lab, byName(lab, 'PC-01').id, (d) => ({ ...d, x: 9999 }));
    const reset = applyStart(lab)!;
    expect(passes(reset)).toEqual(['c1', 'c5', 'c6']);
    expect(reset.guide).toEqual(lab.guide);
    expect(reset.challenge!.checks).toEqual(lab.challenge!.checks);
    expect(byName(reset, 'PC-01').x).toBe(byName(start, 'PC-01').x);
    // mutating the restored lab must not corrupt the stored snapshot
    byName(reset, 'PC-01').x = -1;
    const again = applyStart(lab)!;
    expect(byName(again, 'PC-01').x).toBe(byName(start, 'PC-01').x);
  });

  it('a lab without a start snapshot cannot be reset', () => {
    const lab = buildCampusLab();
    const bare = { ...lab, challenge: { ...lab.challenge!, start: undefined } };
    expect(applyStart(bare)).toBeNull();
  });

  it('captureStart is a deep copy of devices, cables and counters', () => {
    const lab = buildDupIpLab();
    const s = captureStart(lab);
    s.devices[0].name = 'CHANGED';
    expect(lab.devices[0].name).not.toBe('CHANGED');
    expect(s.links).toEqual(lab.links);
    expect(s.counters).toEqual(lab.counters);
  });

  it('the start snapshot is validated on import', () => {
    const j = JSON.parse(serializeExport(buildCampusLab()));
    j.lab.challenge.start.links[0].a.deviceId = 'ghost';
    const r = parseImport(JSON.stringify(j));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('จุดเริ่มต้นของโจทย์');
    const k = JSON.parse(serializeExport(buildCampusLab()));
    expect(parseImport(JSON.stringify(k)).ok).toBe(true);
  });
});

describe('AOS-CX routed port as a router uplink (regression found while building Challenge 3)', () => {
  it('router and L3 switch ping each other over a routed /30, in both directions', () => {
    let lab = buildCampusLab();
    const arubaOut = run(lab, 'DSW1', ['ping 10.1.1.1']).results[0].output;
    expect(arubaOut.some((l) => l.includes('bytes from 10.1.1.1'))).toBe(true);
    lab = run(lab, 'ISP1', ['enable']).lab;
    const ciscoOut = run(lab, 'ISP1', ['ping 10.1.1.2']).results[0].output;
    expect(ciscoOut.some((l) => l.includes('Success rate is 100 percent'))).toBe(true);
  });
});
