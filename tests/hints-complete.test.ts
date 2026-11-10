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
    expect(completeLine(r1, 'show i').value).toBe('show ip '); // only `ip` starts with i
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
