/**
 * R-08 (remediation batch 1): Catalyst legacy VLANs 1002-1005 in `show vlan brief`.
 * Real IOS lists them as built-in defaults with status "act/unsup" (no FDDI / Token Ring media on the switch);
 * they cannot be configured or deleted. In the simulator they are display-only — never stored in the Lab.
 */
import { describe, expect, it } from 'vitest';
import { getDevice, updateDevice } from '../src/core/lab';
import { ping } from '../src/core/network';
import { parseImport, serializeExport } from '../src/core/persist';
import { byName, dev, run, sample } from './helpers';

const RESERVED_LINES = [
  '1002 fddi-default                     act/unsup',
  '1003 token-ring-default               act/unsup',
  '1004 fddinet-default                  act/unsup',
  '1005 trnet-default                    act/unsup',
];

const vlanBrief = (lab: ReturnType<typeof sample>, sw = 'SW1') => {
  const r = run(lab, sw, ['enable', 'show vlan brief']).results[1];
  expect(r.ok).toBe(true);
  return r.output;
};

describe('show vlan brief on Catalyst 2960 lists the reserved VLANs 1002-1005', () => {
  it('shows the four rows with IOS names and status act/unsup, no ports', () => {
    const out = vlanBrief(sample());
    for (const line of RESERVED_LINES) expect(out).toContain(line);
  });

  it('rows are ordered by VLAN ID: user VLANs below 1002 first, 1006+ after 1005', () => {
    let lab = sample();
    lab = run(lab, 'SW1', ['enable', 'configure terminal', 'vlan 1006', 'name EXT', 'exit', 'vlan 999', 'end']).lab;
    const ids = vlanBrief(lab)
      .slice(2)
      .map((l) => /^(\d+)\s/.exec(l)?.[1])
      .filter(Boolean)
      .map(Number);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(ids.indexOf(999)).toBeLessThan(ids.indexOf(1002));
    expect(ids.indexOf(1006)).toBeGreaterThan(ids.indexOf(1005));
  });

  it('existing user VLAN rows are unchanged (status active, access ports listed)', () => {
    let lab = sample();
    lab = run(lab, 'SW1', ['enable', 'configure terminal', 'vlan 30', 'name STAFF', 'exit', 'interface fa0/6', 'switchport access vlan 30', 'end']).lab;
    const row = vlanBrief(lab).find((l) => l.startsWith('30 '));
    expect(row).toMatch(/^30\s+STAFF\s+active\s+Fa0\/6$/);
  });

  it('display only: nothing is added to the VLAN database, running-config or the saved Lab', () => {
    const lab = sample();
    const before = dev(lab, 'SW1').vlans.map((v) => v.id);
    const after = run(lab, 'SW1', ['enable', 'show vlan brief', 'show running-config']);
    expect(dev(after.lab, 'SW1').vlans.map((v) => v.id)).toEqual(before);
    expect(after.results[2].output.join('\n')).not.toMatch(/vlan 100[2-5]/);
    const re = parseImport(serializeExport(after.lab));
    expect(re.ok).toBe(true);
    if (re.ok) expect(dev(re.lab, 'SW1').vlans.map((v) => v.id)).toEqual(before);
  });
});

describe('reserved VLANs stay protected', () => {
  it('cannot be deleted (IOS: %Default VLAN n may not be deleted.) and the state is unchanged', () => {
    const lab = sample();
    for (const id of [1002, 1003, 1004, 1005]) {
      const r = run(lab, 'SW1', ['enable', 'configure terminal', `no vlan ${id}`]).results[2];
      expect(r.ok, `no vlan ${id}`).toBe(false);
      expect(r.output).toEqual([`%Default VLAN ${id} may not be deleted.`]);
    }
    const after = run(lab, 'SW1', ['enable', 'configure terminal', 'no vlan 1003', 'end']).lab;
    expect(vlanBrief(after)).toContain(RESERVED_LINES[1]);
  });

  it('cannot be configured or used as an access VLAN', () => {
    const r = run(sample(), 'SW1', ['enable', 'configure terminal', 'vlan 1002', 'interface fa0/6', 'switchport access vlan 1005']).results;
    expect(r[2].ok).toBe(false);
    expect(r[4].ok).toBe(false);
  });

  it('`no vlan` on an ordinary VLAN still works and VLAN 1 is still protected', () => {
    let lab = sample();
    lab = run(lab, 'SW1', ['enable', 'configure terminal', 'vlan 77', 'exit', 'no vlan 77']).lab;
    expect(dev(lab, 'SW1').vlans.some((v) => v.id === 77)).toBe(false);
    const r = run(sample(), 'SW1', ['enable', 'configure terminal', 'no vlan 1']).results[2];
    expect(r.output).toEqual(['%Default VLAN 1 may not be deleted.']);
  });
});

describe('compatibility', () => {
  it('a Lab saved earlier with VLAN 1002 in its database shows that entry once (no duplicate row)', () => {
    let lab = sample();
    const id = byName(lab, 'SW1').id;
    lab = updateDevice(lab, id, (d) => ({ ...d, vlans: [...d.vlans, { id: 1002, name: 'OLDLAB' }].sort((a, b) => a.id - b.id) }));
    const rows = vlanBrief(lab).filter((l) => l.startsWith('1002 '));
    expect(rows).toEqual(['1002 OLDLAB                           active']);
  });

  it('Aruba AOS-CX `show vlan` is not affected', () => {
    const out = run(sample(), 'SW2', ['show vlan']).results[0].output.join('\n');
    expect(out).not.toMatch(/fddi|token-ring|trnet|100[2-5]/);
  });

  it('routers still have no `show vlan brief`', () => {
    const r = run(sample(), 'R1', ['enable', 'show vlan brief']).results[1];
    expect(r.ok).toBe(false);
  });

  it('VLAN forwarding is unchanged (every ping of the sample lab gives the same result as the VLAN database alone)', () => {
    const lab = sample();
    const shown = run(lab, 'SW1', ['enable', 'show vlan brief']).lab;
    const pcs = lab.devices.filter((d) => d.kind === 'pc');
    for (const a of pcs)
      for (const b of pcs) {
        const ip = b.ifaces[0].ip;
        if (!ip || a.id === b.id) continue;
        expect(ping(shown, a.id, ip).ok).toBe(ping(lab, a.id, ip).ok);
      }
    expect(getDevice(shown, byName(lab, 'SW1').id)!.vlans).toEqual(getDevice(lab, byName(lab, 'SW1').id)!.vlans);
  });
});
