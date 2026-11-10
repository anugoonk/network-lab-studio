import { describe, expect, it } from 'vitest';
import { promptFor } from '../src/core/cli/engine';
import { getIface } from '../src/core/lab';
import { parseImport, serializeExport } from '../src/core/persist';
import { buildSampleLab } from '../src/core/sample';
import { dev, run } from './helpers';

type L = ReturnType<typeof buildSampleLab>;
const prompt = (lab: L, name: string) => promptFor(dev(lab, name));
const adm = (lab: L, name: string, port: string) => getIface(dev(lab, name), port)!.adminUp;

describe('Cisco interface range', () => {
  const start = () => run(buildSampleLab(), 'SW1', ['enable', 'configure terminal']).lab;

  it('applies each following interface command to every port, and the prompt shows the range', () => {
    const r = run(start(), 'SW1', ['interface range fa0/3 - 5', 'shutdown', 'description spare']);
    expect(r.results.every((x) => x.ok)).toBe(true);
    expect(prompt(r.lab, 'SW1')).toBe('SW1(config-if-range)#');
    for (const p of ['FastEthernet0/3', 'FastEthernet0/4', 'FastEthernet0/5']) {
      expect(adm(r.lab, 'SW1', p), p).toBe(false);
      expect(getIface(dev(r.lab, 'SW1'), p)!.description).toBe('spare');
    }
    expect(adm(r.lab, 'SW1', 'FastEthernet0/6')).toBe(true); // outside the range
    expect(dev(r.lab, 'SW1').cli.ctxRange).toEqual(['FastEthernet0/3', 'FastEthernet0/4', 'FastEthernet0/5']);
  });

  it('accepts the usual spellings: no spaces, type word, commas, mixed types, abbreviations', () => {
    const cases: [string, string[]][] = [
      ['interface range fa0/1-2', ['FastEthernet0/1', 'FastEthernet0/2']],
      ['interface range fastethernet 0/1 - 2', ['FastEthernet0/1', 'FastEthernet0/2']],
      ['int ran fa0/1 - 2 , fa0/5', ['FastEthernet0/1', 'FastEthernet0/2', 'FastEthernet0/5']],
      ['interface range fa0/1 , gi0/1', ['FastEthernet0/1', 'GigabitEthernet0/1']],
      ['interface range fa0/1 - fa0/3', ['FastEthernet0/1', 'FastEthernet0/2', 'FastEthernet0/3']],
    ];
    for (const [line, ports] of cases) {
      const r = run(start(), 'SW1', [line]);
      expect(r.results[0].ok, line).toBe(true);
      expect(dev(r.lab, 'SW1').cli.ctxRange, line).toEqual(ports);
    }
  });

  it('rejects bad ranges without changing the Lab', () => {
    const bad = ['interface range fa0/5 - 3', 'interface range fa0/99', 'interface range fa0/1 - 30', 'interface range', 'interface range zz1/1', 'interface range fa0/1 -'];
    for (const line of bad) {
      const r = run(start(), 'SW1', [line]);
      expect(r.results[0].ok, line).toBe(false);
      expect(dev(r.lab, 'SW1').cli.mode, line).toBe('config');
    }
  });

  it('one port in a range behaves like a plain interface', () => {
    const r = run(start(), 'SW1', ['interface range fa0/3']);
    expect(prompt(r.lab, 'SW1')).toBe('SW1(config-if)#');
    expect(dev(r.lab, 'SW1').cli.ctxRange).toBeUndefined();
  });

  it('is all-or-nothing: an error on the command changes no port', () => {
    const r = run(start(), 'SW1', ['interface range fa0/3 - 4', 'switchport access vlan 9999']);
    expect(r.results[1].ok).toBe(false);
    expect(getIface(dev(r.lab, 'SW1'), 'FastEthernet0/3')!.accessVlan).not.toBe(9999);
    expect(dev(r.lab, 'SW1').cli.ctxRange).toHaveLength(2); // still inside the range
  });

  it('exit / end / interface leave the range and run once', () => {
    let r = run(start(), 'SW1', ['interface range fa0/3 - 4', 'exit']);
    expect(prompt(r.lab, 'SW1')).toBe('SW1(config)#');
    expect(dev(r.lab, 'SW1').cli.ctxRange).toBeUndefined();
    r = run(start(), 'SW1', ['interface range fa0/3 - 4', 'interface fa0/7', 'shutdown']);
    expect(dev(r.lab, 'SW1').cli.ctxRange).toBeUndefined();
    expect(adm(r.lab, 'SW1', 'FastEthernet0/7')).toBe(false);
    expect(adm(r.lab, 'SW1', 'FastEthernet0/3')).toBe(true);
    r = run(start(), 'SW1', ['interface range fa0/3 - 4', 'end']);
    expect(prompt(r.lab, 'SW1')).toBe('SW1#');
  });

  it('typical use: put ports in a VLAN with one command and see them in running-config', () => {
    const r = run(start(), 'SW1', ['vlan 30', 'exit', 'interface range fa0/10 - 12', 'switchport mode access', 'switchport access vlan 30', 'end', 'show running-config']);
    expect(r.results.every((x) => x.ok)).toBe(true);
    const cfg = r.results[r.results.length - 1].output.join('\n');
    for (const p of ['FastEthernet0/10', 'FastEthernet0/11', 'FastEthernet0/12']) expect(cfg).toContain(`interface ${p}`);
    expect((cfg.match(/switchport access vlan 30/g) ?? []).length).toBe(3);
  });

  it('`do show ...` works inside a range', () => {
    const r = run(start(), 'SW1', ['interface range fa0/3 - 4', 'do show ip interface brief']);
    expect(r.results[1].ok).toBe(true);
    expect(dev(r.lab, 'SW1').cli.ctxRange).toHaveLength(2);
  });

  it('the range survives export/import; a range pointing at a missing port is rejected', () => {
    const r = run(start(), 'SW1', ['interface range fa0/3 - 4']);
    const back = parseImport(serializeExport(r.lab));
    expect(back.ok).toBe(true);
    if (back.ok) expect(dev(back.lab, 'SW1').cli.ctxRange).toEqual(['FastEthernet0/3', 'FastEthernet0/4']);
    const broken = structuredClone(r.lab);
    dev(broken, 'SW1').cli.ctxRange = ['FastEthernet0/3', 'FastEthernet0/99'];
    expect(parseImport(serializeExport(broken)).ok).toBe(false);
  });
});

describe('Aruba AOS-CX interface range', () => {
  const start = () => run(buildSampleLab(), 'SW2', ['configure terminal']).lab;

  it('configures every port of 1/1/5-1/1/7 at once', () => {
    const r = run(start(), 'SW2', ['interface 1/1/5-1/1/7', 'no shutdown', 'no routing', 'vlan access 10']);
    expect(r.results.every((x) => x.ok), JSON.stringify(r.results.map((x) => x.output))).toBe(true);
    expect(prompt(r.lab, 'SW2')).toBe('SW2(config-if-<1/1/5-1/1/7>)#');
    for (const p of ['1/1/5', '1/1/6', '1/1/7']) {
      const i = getIface(dev(r.lab, 'SW2'), p)!;
      expect([i.adminUp, i.routed, i.accessVlan], p).toEqual([true, false, 10]);
    }
    expect(getIface(dev(r.lab, 'SW2'), '1/1/8')!.routed).toBe(true);
  });

  it('accepts a short end of range and comma lists', () => {
    const cases: [string, string[]][] = [
      ['interface 1/1/5-7', ['1/1/5', '1/1/6', '1/1/7']],
      ['interface 1/1/5-1/1/6,1/1/10', ['1/1/5', '1/1/6', '1/1/10']],
      ['interface 1/1/5,1/1/9', ['1/1/5', '1/1/9']],
    ];
    for (const [line, ports] of cases) {
      const r = run(start(), 'SW2', [line]);
      expect(r.results[0].ok, line).toBe(true);
      expect(dev(r.lab, 'SW2').cli.ctxRange, line).toEqual(ports);
    }
  });

  it('rejects bad ranges; a plain unknown port keeps the normal error and hint', () => {
    for (const line of ['interface 1/1/7-1/1/5', 'interface 1/1/5-1/1/99', 'interface 1/1/5-']) {
      expect(run(start(), 'SW2', [line]).results[0].ok, line).toBe(false);
    }
    const r = run(start(), 'SW2', ['interface 1/1/99']);
    expect(r.results[0].ok).toBe(false);
    expect(r.results[0].hintTh).toBeTruthy();
  });

  it('exit leaves the range', () => {
    const r = run(start(), 'SW2', ['interface 1/1/5-1/1/6', 'exit']);
    expect(prompt(r.lab, 'SW2')).toBe('SW2(config)#');
  });
});

describe('AOS-CX vlan trunk allowed appends (and `no` removes)', () => {
  const trunk = () => run(buildSampleLab(), 'SW2', ['configure terminal', 'interface 1/1/10', 'no routing']).lab;
  const allowed = (lab: L) => getIface(dev(lab, 'SW2'), '1/1/10')!.trunkAllowed;

  it('a second command adds to the list instead of replacing it', () => {
    const r = run(trunk(), 'SW2', ['vlan trunk allowed 10', 'vlan trunk allowed 20,30-31']);
    expect(allowed(r.lab)).toEqual([10, 20, 30, 31]);
    expect(getIface(dev(r.lab, 'SW2'), '1/1/10')!.trunk).toBe(true);
  });

  it('from "all" it narrows to the VLANs given', () => {
    const r = run(trunk(), 'SW2', ['vlan trunk allowed all', 'vlan trunk allowed 30']);
    expect(allowed(r.lab)).toEqual([30]);
  });

  it('no vlan trunk allowed removes VLANs; from "all" it excludes them', () => {
    let r = run(trunk(), 'SW2', ['vlan trunk allowed 10,20,30', 'no vlan trunk allowed 20']);
    expect(allowed(r.lab)).toEqual([10, 30]);
    r = run(trunk(), 'SW2', ['vlan trunk allowed all', 'no vlan trunk allowed 20-22']);
    expect(allowed(r.lab)).toHaveLength(4094 - 3);
    expect(allowed(r.lab)).not.toContain(21);
    expect(parseImport(serializeExport(r.lab)).ok).toBe(true);
  });

  it('`no vlan trunk allowed` on a non-trunk port is an error', () => {
    const r = run(trunk(), 'SW2', ['no vlan trunk allowed 10']);
    expect(r.results[0].ok).toBe(false);
  });

  it('works through a range: every port gets the VLAN', () => {
    const r = run(buildSampleLab(), 'SW2', ['configure terminal', 'interface 1/1/10-1/1/11', 'no routing', 'vlan trunk allowed 10', 'vlan trunk allowed 20']);
    for (const p of ['1/1/10', '1/1/11']) expect(getIface(dev(r.lab, 'SW2'), p)!.trunkAllowed, p).toEqual([10, 20]);
  });
});
