import { describe, expect, it } from 'vitest';
import { duplicateIps } from '../src/core/l2tables';
import { linkStatus, ping } from '../src/core/network';
import { parseImport, serializeExport } from '../src/core/persist';
import { evaluateChallenge } from '../src/core/challenge';
import { buildCampus3Lab, buildCampus3TroubleLab } from '../src/core/sample';
import { byName, dev, run } from './helpers';

const lab0 = () => buildCampus3Lab();
const p = (lab: ReturnType<typeof lab0>, from: string, ip: string) => ping(lab, byName(lab, from).id, ip);

describe('Campus 3 Tier (Aruba CX) sample', () => {
  it('has the 3-tier layout: 7 devices, 9 cables, every link up, no duplicate IP', () => {
    const lab = lab0();
    expect(lab.devices.map((d) => d.name)).toEqual(['SwitchX-Core-1', 'SwitchY-Core-2', 'SwitchA-VSX', 'SwitchB-VSX', 'SwitchC-Access', 'VPC1', 'VPC2']);
    expect(lab.links).toHaveLength(9);
    for (const l of lab.links) expect(linkStatus(lab, l).up, l.id).toBe(true);
    expect(duplicateIps(lab)).toEqual([]);
    expect(lab.guide?.sections.length).toBeGreaterThan(3);
    expect(lab.challenge).toBeUndefined();
  });

  it('uses /31 routed links and SVI gateways', () => {
    const lab = lab0();
    expect(dev(lab, 'SwitchX-Core-1').ifaces.find((i) => i.name === '1/1/1')).toMatchObject({ routed: true, ip: '192.168.4.8', mask: '255.255.255.254' });
    expect(dev(lab, 'SwitchA-VSX').svis.map((v) => [v.vlan, v.ip])).toEqual([[100, '10.10.100.252'], [200, '10.10.200.252']]);
  });

  it('everything in the guide works: gateway, inter-VLAN, cores, the second gateway', () => {
    const lab = lab0();
    for (const [from, ip] of [
      ['VPC1', '10.10.100.252'],
      ['VPC2', '10.10.200.252'],
      ['VPC1', '10.10.200.11'], // VLAN 100 -> VLAN 200 through SwitchA
      ['VPC2', '10.10.100.11'],
      ['VPC1', '192.168.4.8'], // Core-1
      ['VPC1', '192.168.4.25'], // Core-2, via Core-1
      ['VPC1', '10.10.100.253'], // SwitchB SVI, over the A–B trunk
      ['VPC1', '192.168.4.13'], // SwitchB on its /31 to Core-1
    ] as const) {
      const r = p(lab, from, ip);
      expect(r.ok, `${from} -> ${ip}: ${r.explanation.join(' / ')}`).toBe(true);
    }
  });

  it('the cores can reach the user VLANs through SwitchA', () => {
    const lab = lab0();
    expect(p(lab, 'SwitchX-Core-1', '10.10.100.11').ok).toBe(true);
    expect(p(lab, 'SwitchY-Core-2', '10.10.200.11').ok).toBe(true);
  });

  it('guide exercise 4: removing the return route on Core-2 breaks only the return leg, adding it back repairs it', () => {
    let lab = lab0();
    lab = run(lab, 'SwitchY-Core-2', ['configure terminal', 'no ip route 10.10.100.0/24 192.168.4.17']).lab;
    const r = p(lab, 'VPC1', '192.168.4.25');
    expect(r.ok).toBe(false);
    expect(r.direction).toBe('return');
    expect(p(lab, 'VPC1', '192.168.4.8').ok).toBe(true); // Core-1 is unaffected
    lab = run(lab, 'SwitchY-Core-2', ['ip route 10.10.100.0/24 192.168.4.17']).lab;
    expect(p(lab, 'VPC1', '192.168.4.25').ok).toBe(true);
  });

  it('shutting the trunk to the access switch cuts both VPCs off from their gateway', () => {
    let lab = lab0();
    lab = run(lab, 'SwitchA-VSX', ['configure terminal', 'interface 1/1/4', 'shutdown']).lab;
    expect(p(lab, 'VPC1', '10.10.100.252').ok).toBe(false);
    expect(p(lab, 'VPC2', '10.10.200.252').ok).toBe(false);
  });

  it('show ip route on Core-1 lists the connected /31 links and the static routes', () => {
    const r = run(lab0(), 'SwitchX-Core-1', ['show ip route']);
    const out = r.results[0].output.join('\n');
    expect(out).toContain('10.10.100.0/24');
    expect(out).toContain('192.168.4.8/31');
  });

  it('round-trips through export / import', () => {
    const lab = lab0();
    const back = parseImport(serializeExport(lab));
    expect(back.ok).toBe(true);
    if (back.ok) expect(back.lab).toEqual(lab);
  });
});

describe('Challenge 4: Campus 3 Tier with faults', () => {
  const score = (lab: ReturnType<typeof buildCampus3TroubleLab>) => evaluateChallenge(lab, lab.challenge!);
  const passes = (lab: ReturnType<typeof buildCampus3TroubleLab>) => Object.entries(score(lab).results).filter(([, r]) => r.pass).map(([k]) => k);

  it('starts with c1, c4, c6, c7 passing and the other three failing', () => {
    expect(passes(buildCampus3TroubleLab())).toEqual(['c1', 'c4', 'c6', 'c7']);
  });

  it('fixing the faults one at a time through the CLI unlocks the checks in order', () => {
    let lab = buildCampus3TroubleLab();
    lab = run(lab, 'SwitchA-VSX', ['configure terminal', 'interface 1/1/4', 'vlan trunk allowed 200', 'end']).lab;
    expect(passes(lab)).toEqual(['c1', 'c2', 'c3', 'c4', 'c6', 'c7']);
    lab = run(lab, 'SwitchA-VSX', ['configure terminal', 'no ip route 0.0.0.0/0 192.168.4.18', 'ip route 0.0.0.0/0 192.168.4.8', 'end']).lab;
    expect(passes(lab)).not.toContain('c5'); // return leg from Core-2 is still missing
    lab = run(lab, 'SwitchY-Core-2', ['configure terminal', 'ip route 10.10.100.0/24 192.168.4.17', 'end']).lab;
    expect(score(lab).allPassed).toBe(true);
  });
});
