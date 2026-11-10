import { describe, expect, it } from 'vitest';
import { executeLine, promptFor, helpFor } from '../src/core/cli/engine';
import { SPECS } from '../src/core/cli/registry';
import { exampleFor } from '../src/core/cli/spec';
import { configSignature, createDevice, emptyLab, getIface } from '../src/core/lab';
import { PROFILES } from '../src/core/profiles';
import type { DeviceKind } from '../src/core/types';
import { byName, dev, run, sample } from './helpers';

describe('Cisco IOS mode handling', () => {
  it('walks user → priv → config → config-if with matching prompts', () => {
    const lab = sample();
    const { results, lab: l2 } = run(lab, 'R1', ['enable', 'configure terminal', 'interface g0/1', 'exit', 'end']);
    expect(results.every((r) => r.ok)).toBe(true);
    const r = run(lab, 'R1', ['enable', 'conf t', 'int gi0/1']);
    expect(promptFor(dev(r.lab, 'R1'))).toBe('R1(config-if)#');
    expect(promptFor(dev(l2, 'R1'))).toBe('R1#');
  });

  it('hostname changes the prompt and the device name', () => {
    const r = run(sample(), 'R1', ['enable', 'configure terminal', 'hostname EDGE']);
    const d = r.lab.devices.find((x) => x.id === byName(sample(), 'R1').id)!;
    expect(d.name).toBe('EDGE');
    expect(promptFor(d)).toBe('EDGE(config)#');
  });

  it('configure terminal in user mode is an error and config is unchanged', () => {
    const lab = sample();
    const r = run(lab, 'R1', ['configure terminal']);
    expect(r.results[0].ok).toBe(false);
    expect(r.results[0].output.join('\n')).toContain('% Invalid input detected');
    expect(r.results[0].hintTh).toMatch(/enable/);
    expect(configSignature(r.lab)).toBe(configSignature(lab));
    expect(dev(r.lab, 'R1').cli.mode).toBe('user');
  });

  it('router: IP address + no shutdown change interface state and show output', () => {
    const lab = sample();
    const r = run(lab, 'R1', [
      'enable', 'configure terminal', 'interface gi0/1', 'ip address 10.1.1.1 255.255.255.0', 'no shutdown', 'end', 'show ip interface brief',
    ]);
    const out = r.results[6].output.join('\n');
    expect(out).toMatch(/GigabitEthernet0\/1\s+10\.1\.1\.1/);
    expect(getIface(dev(r.lab, 'R1'), 'GigabitEthernet0/1')!.adminUp).toBe(true);
    const run2 = run(r.lab, 'R1', ['show running-config']);
    expect(run2.results[0].output.join('\n')).toContain(' ip address 10.1.1.1 255.255.255.0');
  });

  it('router rejects bad mask, overlapping subnet and switchport commands', () => {
    const lab = sample();
    const pre = ['enable', 'configure terminal', 'interface gi0/1'];
    const bad = run(lab, 'R1', [...pre, 'ip address 10.1.1.1 255.0.255.0']);
    expect(bad.results[3].ok).toBe(false);
    const overlap = run(lab, 'R1', [...pre, 'ip address 192.168.1.5 255.255.255.0']);
    expect(overlap.results[3].output.join('\n')).toContain('overlaps with GigabitEthernet0/0');
    const sp = run(lab, 'R1', [...pre, 'switchport access vlan 10']);
    expect(sp.results[3].ok).toBe(false);
    expect(configSignature(sp.lab)).toBe(configSignature(lab));
  });

  it('switch: create VLAN, set access VLAN, show vlan brief', () => {
    const r = run(sample(), 'SW1', [
      'enable', 'configure terminal', 'vlan 30', 'name STAFF', 'exit', 'interface fa0/6', 'switchport mode access', 'switchport access vlan 30', 'end', 'show vlan brief',
    ]);
    expect(r.results.every((x) => x.ok)).toBe(true);
    const out = r.results[9].output.join('\n');
    expect(out).toMatch(/30\s+STAFF\s+active\s+Fa0\/6/);
  });

  it('switch: shutdown shows disabled in show interfaces status', () => {
    const r = run(sample(), 'SW1', ['enable', 'configure terminal', 'interface gi0/2', 'shutdown', 'end', 'show interfaces status']);
    expect(r.results[5].output.join('\n')).toMatch(/Gi0\/2\s+disabled/);
  });

  it('access VLAN on missing VLAN auto-creates with the IOS message', () => {
    const r = run(sample(), 'SW1', ['enable', 'configure terminal', 'interface fa0/6', 'switchport access vlan 99']);
    expect(r.results[3].output.join('\n')).toContain('Creating vlan 99');
    expect(dev(r.lab, 'SW1').vlans.some((v) => v.id === 99)).toBe(true);
  });

  it('VLAN 1 cannot be deleted; invalid vlan id / interface are errors', () => {
    const lab = sample();
    const r = run(lab, 'SW1', ['enable', 'configure terminal', 'no vlan 1', 'vlan 5000', 'interface fa0/99']);
    expect(r.results[2].output.join('\n')).toContain('may not be deleted');
    expect(r.results[3].ok).toBe(false);
    expect(r.results[4].ok).toBe(false);
  });

  it('supports abbreviations and shows ambiguity', () => {
    const r = run(sample(), 'SW1', ['en', 'conf t', 'int rang fa0/1 - 2']);
    expect(r.results[0].ok).toBe(true);
    expect(r.results[1].ok).toBe(true);
    expect(r.results[2].ok).toBe(true); // `interface range` (abbreviated) is supported
    const amb = run(sample(), 'SW1', ['e']);
    expect(amb.results[0].output[0]).toContain('% Ambiguous command');
  });

  it('write memory fills startup-config', () => {
    const r = run(sample(), 'SW1', ['enable', 'show startup-config', 'write memory', 'show startup-config']);
    expect(r.results[1].output[0]).toContain('not present');
    expect(r.results[3].output.join('\n')).toContain('hostname SW1');
  });

  it('do show works inside config mode without leaving it', () => {
    const r = run(sample(), 'SW1', ['enable', 'configure terminal', 'do show vlan brief']);
    expect(r.results[2].output.join('\n')).toContain('OFFICE');
    expect(dev(r.lab, 'SW1').cli.mode).toBe('config');
  });
});

describe('Aruba AOS-CX', () => {
  it('uses configure terminal / interface 1/1/1 / no routing / vlan access', () => {
    const r = run(sample(), 'SW2', [
      'configure terminal', 'interface 1/1/10', 'no routing', 'vlan access 10', 'no shutdown', 'end', 'show vlan', 'show interface brief',
    ]);
    expect(r.results.every((x) => x.ok)).toBe(true);
    expect(r.results[6].output.join('\n')).toMatch(/10\s+OFFICE.*1\/1\/1-1\/1\/5,1\/1\/10,1\/1\/24/);
    expect(r.results[7].output.join('\n')).toMatch(/1\/1\/10\s+10\s+access/);
  });

  it('routed interface refuses vlan access until no routing', () => {
    const lab = sample();
    const r = run(lab, 'SW2', ['configure terminal', 'interface 1/1/10', 'vlan access 10']);
    expect(r.results[2].ok).toBe(false);
    expect(r.results[2].output.join('\n')).toContain('no routing');
    expect(getIface(dev(r.lab, 'SW2'), '1/1/10')!.accessVlan).toBe(1);
  });

  it('vlan access to a missing VLAN fails', () => {
    const r = run(sample(), 'SW2', ['configure terminal', 'interface 1/1/1', 'vlan access 77']);
    expect(r.results[2].ok).toBe(false);
  });

  it('shutdown reflects in show interface brief', () => {
    const r = run(sample(), 'SW2', ['configure terminal', 'interface 1/1/24', 'shutdown', 'end', 'show interface brief']);
    expect(r.results[4].output.join('\n')).toMatch(/1\/1\/24\s+10\s+access\s+1GbT\s+no\s+down\s+Administratively down/);
  });

  it('default AOS-CX ports are shut down and routed', () => {
    const d = createDevice('aruba-switch', 'x', 'SWX', 0, 0);
    expect(d.ifaces.every((i) => !i.adminUp && i.routed)).toBe(true);
  });
});

describe('cross-vendor / wrong-mode errors never change config', () => {
  const lab = sample();
  const cases: [string, string[], RegExp][] = [
    ['SW2', ['enable'], /Unknown command/],
    ['SW2', ['show vlan brief'], /Unknown command/],
    ['SW2', ['configure terminal', 'interface 1/1/1', 'switchport access vlan 10'], /Unknown command/],
    ['SW2', ['configure terminal', 'interface 1/1/99'], /Unknown command|Invalid/],
    ['SW2', ['show vlan', 'vlan access 10'], /Unknown command/],
    ['SW1', ['enable', 'configure terminal', 'interface 1/1/1'], /Invalid input/],
    ['SW1', ['enable', 'configure terminal', 'interface fa0/1', 'vlan access 10'], /Invalid input/],
    ['SW1', ['enable', 'configure terminal', 'interface fa0/1', 'no routing'], /Invalid input/],
    ['SW1', ['enable', 'show interface brief'], /Invalid input/],
    ['R1', ['enable', 'configure terminal', 'vlan 10'], /Invalid input/],
    ['R1', ['enable', 'show vlan brief'], /Invalid input/],
    ['PC-01', ['enable'], /not recognized/],
    ['PC-01', ['show running-config'], /not recognized/],
  ];
  for (const [name, lines, re] of cases) {
    it(`${name}: ${lines[lines.length - 1]}`, () => {
      const r = run(lab, name, lines);
      const last = r.results[r.results.length - 1];
      expect(last.ok).toBe(false);
      expect(last.output.join('\n')).toMatch(re);
      expect(last.hintTh).toBeTruthy();
      expect(configSignature(r.lab)).toBe(configSignature(lab));
    });
  }

  it('shell-looking input is never executed, just rejected', () => {
    const r = run(lab, 'PC-01', ['dir', 'ping 1.1.1.1; calc', 'ping $(whoami)']);
    expect(r.results[0].ok).toBe(false);
    expect(r.results[1].output.join('\n')).toMatch(/not recognized/);
    expect(r.results[2].output.join('\n')).toMatch(/could not find host/);
  });
});

describe('help (?) and history', () => {
  it('lists commands valid in the current mode only', () => {
    const lab = sample();
    const user = helpFor(dev(lab, 'SW1'), '?').join('\n');
    expect(user).toContain('enable');
    expect(user).not.toContain('hostname');
    const aruba = helpFor(dev(lab, 'SW2'), '?').join('\n');
    expect(aruba).toContain('configure');
    expect(aruba).not.toContain('enable');
  });

  it('completes the next token', () => {
    const { lab } = run(sample(), 'SW1', ['enable', 'configure terminal', 'interface fa0/1']);
    const h = helpFor(dev(lab, 'SW1'), 'switchport ?').join('\n');
    expect(h).toContain('access');
    expect(h).toContain('mode');
    expect(helpFor(dev(lab, 'SW1'), 'switchport access vlan ?').join('\n')).toContain('<vlan-id>');
  });

  it('keeps command history per device', () => {
    const r = run(sample(), 'SW1', ['enable', 'show vlan brief', 'bogus']);
    expect(dev(r.lab, 'SW1').cli.history).toEqual(['enable', 'show vlan brief', 'bogus']);
    expect(dev(r.lab, 'SW2').cli.history).toEqual([]);
  });
});

describe('registry consistency: every "runnable" example really runs', () => {
  const kinds = (Object.keys(PROFILES) as DeviceKind[]).filter((k) => PROFILES[k].hasCli);
  it('has unique ids and valid syntax', () => {
    expect(new Set(SPECS.map((s) => s.id)).size).toBe(SPECS.length);
  });
  for (const spec of SPECS) {
    for (const kind of spec.deviceTypes) {
      it(`${spec.id} on ${kind}: "${exampleFor(spec, kind)}"`, () => {
        expect(PROFILES[kind].vendor).toBe(spec.vendor);
        expect(kinds).toContain(kind);
        // a small lab with a device in the state this command needs
        let lab = emptyLab();
        const d = createDevice(kind, 'dut', 'DUT', 0, 0);
        const mode = spec.modes[0];
        d.cli.mode = mode;
        if (d.vlans.length) d.vlans.push({ id: 10, name: 'OFFICE' }, { id: 20, name: 'GUEST' }, { id: 30, name: 'X' });
        if (mode === 'config-if') {
          const first = d.ifaces[0];
          d.cli.ctxIface = first.name;
          if (PROFILES[kind].vendor === 'aruba') first.routed = false;
        }
        if (mode === 'config-vlan') d.cli.ctxVlan = 10;
        if (mode === 'config-subif') {
          d.subifs.push({ parent: d.ifaces[0].name, id: 10, vlan: null, adminUp: true, description: '', ip: null, mask: null });
          d.cli.ctxIface = `${d.ifaces[0].name}.10`;
        }
        if (mode === 'config-svi') {
          d.svis.push({ vlan: 10, adminUp: true, description: '', ip: null, mask: null });
          d.cli.ctxVlan = 10;
        }
        spec.prepare?.(d);
        // aruba.ipaddress needs the port to be routed *and* selected
        if (spec.id === 'aruba.ipaddress') d.cli.ctxIface = d.ifaces[0].name;
        lab = { ...lab, devices: [d] };
        const line = exampleFor(spec, kind);
        const r = executeLine(lab, 'dut', line);
        expect(r.output.join('\n')).not.toMatch(/Invalid input|Unknown command|not recognized|Incomplete|Ambiguous/);
        expect(r.ok).toBe(true);
        // the verify command is itself a real command (first alternative, when "a / b")
        // — checked for existence via help: it must resolve somewhere in the registry for this vendor
        const verify = spec.verify.split(' / ')[0];
        if (!verify.startsWith('(')) {
          const found = SPECS.some((s) => s.vendor === spec.vendor && s.deviceTypes.some((t) => t === kind || kinds.includes(t)) && matchesSyntax(s.syntax, verify));
          expect(found).toBe(true);
        }
      });
    }
  }
});

function matchesSyntax(syntax: string, line: string): boolean {
  const st = syntax.split(/\s+/);
  const lt = line.split(/\s+/);
  if (st.length !== lt.length) return false;
  return st.every((t, i) => t.startsWith('<') || t === lt[i]);
}

describe('profiles', () => {
  it('byName helper finds sample devices', () => {
    expect(byName(sample(), 'SW2').kind).toBe('aruba-switch');
  });
});
