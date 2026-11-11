import { describe, expect, it } from 'vitest';
import { completeLine } from '../src/core/cli/engine';
import { parseImport, serializeExport } from '../src/core/persist';
import { SAMPLES, buildSampleLab, type SampleKind } from '../src/core/sample';
import { dev } from './helpers';

describe('challenge hints', () => {
  it.each((Object.keys(SAMPLES) as SampleKind[]).filter((k) => SAMPLES[k].challenge))('%s has progressive hints that survive export/import', (k) => {
    const lab = SAMPLES[k].build();
    const hints = lab.challenge!.hints!;
    expect(hints.length).toBeGreaterThanOrEqual(3);
    hints.forEach((h) => expect(h.trim().length).toBeGreaterThan(10));
    const back = parseImport(serializeExport(lab));
    expect(back.ok).toBe(true);
    if (back.ok) expect(back.lab.challenge!.hints).toEqual(hints);
  });

  it('a challenge without hints (older files) still imports', () => {
    const lab = SAMPLES.trouble.build();
    delete lab.challenge!.hints;
    expect(parseImport(serializeExport(lab)).ok).toBe(true);
  });

  it('rejects more than 10 hints', () => {
    const lab = SAMPLES.trouble.build();
    lab.challenge!.hints = Array.from({ length: 11 }, () => 'x');
    expect(parseImport(serializeExport(lab)).ok).toBe(false);
  });
});

describe('Tab completion', () => {
  const lab = buildSampleLab();
  const r1 = dev(lab, 'R1'); // Cisco router, user EXEC
  const sw2 = dev(lab, 'SW2'); // Aruba AOS-CX

  it('completes a unique prefix and adds a space (IOS)', () => {
    r1.cli.mode = 'priv';
    expect(completeLine(r1, 'conf')).toEqual({ value: 'configure ', options: [] });
    expect(completeLine(r1, 'show runn')).toEqual({ value: 'show running-config ', options: [] });
  });

  it('extends to the common prefix, then lists the options when ambiguous', () => {
    r1.cli.mode = 'priv';
    expect(completeLine(r1, 'show ip').value).toBe('show ip '); // `ip` is the only keyword starting with "ip"
    // `interfaces` and `ip` both start with "i" (as on IOS): nothing longer to complete, both are listed
    expect(completeLine(r1, 'show i')).toEqual({ value: 'show i', options: ['interfaces', 'ip'] });
    const c = completeLine(r1, 'show ip ');
    expect(c.value).toBe('show ip ');
    expect(c.options).toEqual(expect.arrayContaining(['route', 'arp']));
  });

  it('lists the next keywords after a trailing space', () => {
    r1.cli.mode = 'priv';
    const c = completeLine(r1, 'show ');
    expect(c.options).toEqual(expect.arrayContaining(['running-config', 'version']));
  });

  it('does nothing for an unknown word or a parameter slot', () => {
    r1.cli.mode = 'priv';
    expect(completeLine(r1, 'zzz')).toEqual({ value: 'zzz', options: [] });
    r1.cli.mode = 'config';
    expect(completeLine(r1, 'hostname ')).toEqual({ value: 'hostname ', options: [] });
  });

  it('works on AOS-CX and respects the current mode', () => {
    sw2.cli.mode = 'priv';
    expect(completeLine(sw2, 'conf').value).toBe('configure ');
    expect(completeLine(sw2, 'interface ').options).toEqual([]); // priv mode has no `interface` keyword
  });

  it('only completes for devices with a CLI', () => {
    const l = SAMPLES.campus.build();
    const ap = l.devices.find((d) => d.kind === 'wireless-ap')!;
    expect(completeLine(ap, 'sh')).toEqual({ value: 'sh', options: [] });
  });
});

describe('Tab completion of values', () => {
  const lab = buildSampleLab();
  const sw1 = dev(lab, 'SW1'); // Cisco switch
  const sw2 = dev(lab, 'SW2'); // AOS-CX
  const pc = dev(lab, 'PC-01');

  it('completes interface names (Cisco accepts the short form and expands it)', () => {
    sw1.cli.mode = 'config';
    expect(completeLine(sw1, 'interface gi0/1', lab).value).toBe('interface GigabitEthernet0/1 ');
    expect(completeLine(sw1, 'interface gi0/', lab).options).toEqual([]); // 0/1 and 0/2 share the prefix, so it extends instead
    expect(completeLine(sw1, 'interface gi0/', lab).value).toBe('interface GigabitEthernet0/');
    expect(completeLine(sw1, 'interface fa0/2', lab).value).toBe('interface FastEthernet0/2'); // first Tab expands the prefix…
    const c = completeLine(sw1, 'interface FastEthernet0/2', lab); // …the second lists what is left
    expect(c.options).toEqual(expect.arrayContaining(['FastEthernet0/2', 'FastEthernet0/20', 'FastEthernet0/24']));
  });

  it('completes AOS-CX port names', () => {
    sw2.cli.mode = 'config';
    expect(completeLine(sw2, 'interface 1/1/24', lab).value).toBe('interface 1/1/24 ');
    expect(completeLine(sw2, 'interface 1/1/2', lab).options).toEqual(expect.arrayContaining(['1/1/2', '1/1/20', '1/1/24']));
    expect(completeLine(sw2, 'interface v', lab).value).toBe('interface vlan '); // keyword still wins when no port matches
  });

  it('lists the VLANs that exist after "vlan"', () => {
    sw1.cli.mode = 'config-if';
    const c = completeLine(sw1, 'switchport access vlan ', lab);
    expect(c.options).toEqual(expect.arrayContaining(['1', '10', '20']));
  });

  it('completes ping targets with the Lab addresses (not the device own) and works on the PC terminal', () => {
    const c = completeLine(pc, 'ping 192.168.1.', lab);
    expect(c.options.length + (c.value !== 'ping 192.168.1.' ? 1 : 0)).toBeGreaterThan(0);
    expect(c.options).not.toContain(pc.ifaces[0].ip);
    expect(completeLine(pc, 'pi', lab).value).toBe('ping ');
    expect(completeLine(pc, 'ipc', lab).value).toBe('ipconfig ');
  });

  it('does not invent values for free parameters', () => {
    sw1.cli.mode = 'config';
    expect(completeLine(sw1, 'hostname ', lab)).toEqual({ value: 'hostname ', options: [] });
  });
});
