import { describe, expect, it } from 'vitest';
import { completeLine, executeLine } from '../src/core/cli/engine';
import { addLink, createDevice, emptyLab, removeLink } from '../src/core/lab';
import { linkStatus } from '../src/core/network';
import { parseImport, serializeExport } from '../src/core/persist';
import { PROFILES } from '../src/core/profiles';
import type { DeviceKind, Lab } from '../src/core/types';

const SUMMARY = 'show cdp neighbors';
const DETAIL = `${SUMMARY} detail`;
class Topology {
  lab: Lab = emptyLab('CDP');
  add(name: string, kind: DeviceKind = 'cisco-router') {
    this.lab.devices.push(createDevice(kind, name, name, 0, 0));
    return this;
  }
  dev(name: string) { return this.lab.devices.find((d) => d.id === name)!; }
  cli(name: string, ...lines: string[]) {
    for (const line of lines) {
      const r = executeLine(this.lab, name, line);
      expect(r.ok, `${name}: ${line}: ${r.output.join('\n')}`).toBe(true);
      this.lab = r.lab;
    }
    return this;
  }
  config(name: string, ...lines: string[]) {
    if (this.dev(name).cli.mode === 'user') this.cli(name, 'enable');
    return this.cli(name, 'configure terminal', ...lines, 'end');
  }
  cable(a: string, ap: string, b: string, bp: string) {
    const r = addLink(this.lab, { deviceId: a, port: ap }, { deviceId: b, port: bp });
    expect(r.error).toBeNull();
    this.lab = r.lab;
    return this;
  }
  show(name = 'R1', command = SUMMARY) {
    const lab = this.dev(name).cli.mode === 'user' ? executeLine(this.lab, name, 'enable').lab : this.lab;
    const r = executeLine(lab, name, command);
    expect(r.ok, r.output.join('\n')).toBe(true);
    return r.output;
  }
}
const pair = () => new Topology().add('R1').add('R2')
  .cable('R1', 'GigabitEthernet0/1', 'R2', 'GigabitEthernet0/0')
  .config('R1', 'interface gi0/1', 'no shutdown')
  .config('R2', 'interface gi0/0', 'ip address 10.0.12.2 255.255.255.252', 'no shutdown');
const rows = (lines: string[]) => lines.filter((l) => /^\S+\s+(Gig|Fas) /.test(l));

describe('CERT-Q4a Cisco CDP topology view', () => {
  it('shows one directly connected router with correct local and remote ports, without a fake holdtime', () => {
    const t = pair();
    expect(rows(t.show())).toHaveLength(1);
    expect(rows(t.show())[0].replace(/\s+/g, ' ')).toBe('R2 Gig 0/1 - R Cisco ISR 2911 (simulated) Gig 0/0');
  });

  it('orients ports from either end and for reversed link endpoints', () => {
    const t = pair();
    expect(rows(t.show('R2'))[0]).toMatch(/^R1\s+Gig 0\/0\s+-\s+R\s+.+Gig 0\/1$/);
    const before = t.show();
    t.lab.links = t.lab.links.map((l) => ({ ...l, a: l.b, b: l.a }));
    expect(t.show()).toEqual(before);
  });

  it('lists multiple neighbors, actual profile platforms and only supported R/S capability codes', () => {
    const t = pair().add('SW1', 'cisco-switch').cable('R1', 'GigabitEthernet0/2', 'SW1', 'FastEthernet0/24')
      .config('R1', 'interface gi0/2', 'no shutdown');
    const out = t.show();
    expect(rows(out)).toHaveLength(2);
    expect(rows(out)[1]).toMatch(/^SW1\s+Gig 0\/2\s+-\s+S\s+Cisco Catalyst 2960-24TT \(simulated\)\s+Fas 0\/24$/);
    expect(out).toContain('Total cdp entries displayed : 2');
    expect(out.join('\n')).not.toMatch(/IGMP|advertisement version:|Duplex:/);
  });

  it('keeps distinct parallel links even when neighbors have the same hostname', () => {
    const t = pair().cable('R2', 'GigabitEthernet0/2', 'R1', 'GigabitEthernet0/0')
      .config('R1', 'interface gi0/0', 'no shutdown').config('R2', 'interface gi0/2', 'no shutdown', 'exit', 'hostname R1');
    expect(rows(t.show())).toHaveLength(2);
    expect(rows(t.show())[0]).toMatch(/^R1\s+Gig 0\/0.*Gig 0\/2$/);
    expect(rows(t.show())[1]).toMatch(/^R1\s+Gig 0\/1.*Gig 0\/0$/);
  });

  it('orders switch ports numerically and is independent of device, link and interface array order', () => {
    const t = new Topology().add('SW1', 'cisco-switch').add('R10').add('R2')
      .cable('SW1', 'FastEthernet0/10', 'R10', 'GigabitEthernet0/0')
      .cable('SW1', 'FastEthernet0/2', 'R2', 'GigabitEthernet0/0')
      .config('R10', 'interface gi0/0', 'no shutdown').config('R2', 'interface gi0/0', 'no shutdown');
    const before = t.show('SW1');
    expect(rows(before).map((l) => l.split(/\s+/)[0])).toEqual(['R2', 'R10']);
    t.lab.links.reverse(); t.lab.devices.reverse(); t.dev('SW1').ifaces.reverse();
    expect(t.show('SW1')).toEqual(before);
  });

  for (const side of ['R1', 'R2']) it(`hides an operationally down link when ${side} is shutdown, then restores it`, () => {
    const t = pair();
    t.config(side, `interface ${side === 'R1' ? 'gi0/1' : 'gi0/0'}`, 'shutdown');
    expect(linkStatus(t.lab, t.lab.links[0]).up).toBe(false);
    expect(rows(t.show())).toEqual([]);
    expect(t.show('R1', DETAIL)).toHaveLength(2);
    t.config(side, `interface ${side === 'R1' ? 'gi0/1' : 'gi0/0'}`, 'no shutdown');
    expect(rows(t.show())).toHaveLength(1);
  });

  it('does not infer operational up from just the local admin state', () => {
    const t = new Topology().add('R1').add('R2')
      .cable('R1', 'GigabitEthernet0/1', 'R2', 'GigabitEthernet0/0')
      .config('R1', 'interface gi0/1', 'no shutdown');
    expect(t.dev('R1').ifaces[1].adminUp).toBe(true);
    expect(rows(t.show())).toEqual([]);
  });

  it('removes disconnected peers immediately and discovers the actual peer after reconnecting', () => {
    const t = pair();
    t.lab = removeLink(t.lab, t.lab.links[0].id);
    expect(rows(t.show())).toEqual([]);
    t.cable('R1', 'GigabitEthernet0/1', 'R2', 'GigabitEthernet0/0');
    expect(rows(t.show())).toHaveLength(1);
  });

  const unsupported = (Object.keys(PROFILES) as DeviceKind[])
    .filter((kind) => !['cisco-router', 'isp-router', 'cisco-switch'].includes(kind) && PROFILES[kind].portNames.length);
  for (const kind of unsupported) it(`excludes ${kind} even on an up physical link`, () => {
    const t = new Topology().add('R1').add('Other', kind)
      .cable('R1', 'GigabitEthernet0/0', 'Other', PROFILES[kind].portNames[0])
      .config('R1', 'interface gi0/0', 'no shutdown');
    t.dev('Other').ifaces[0].adminUp = true;
    expect(linkStatus(t.lab, t.lab.links[0]).up).toBe(true);
    expect(rows(t.show())).toEqual([]);
    expect(t.show('R1', DETAIL).join('\n')).not.toContain('Device ID: Other');
  });

  it('does not discover a Cisco router across a patch panel', () => {
    const t = pair(); t.lab = removeLink(t.lab, t.lab.links[0].id);
    t.add('Patch', 'patch-panel');
    const ports = PROFILES['patch-panel'].portNames;
    t.cable('R1', 'GigabitEthernet0/1', 'Patch', ports[0]).cable('Patch', ports[1], 'R2', 'GigabitEthernet0/0');
    expect(rows(t.show())).toEqual([]);
  });

  it('supports the existing ISP router profile as a neighbor and as the command source', () => {
    const t = new Topology().add('R1').add('ISP', 'isp-router')
      .cable('R1', 'GigabitEthernet0/1', 'ISP', 'GigabitEthernet0/0')
      .config('R1', 'interface gi0/1', 'no shutdown').config('ISP', 'interface gi0/0', 'no shutdown');
    expect(rows(t.show())[0]).toContain(PROFILES['isp-router'].model);
    expect(rows(t.show('ISP'))).toHaveLength(1);
  });

  it('detail shows only the connected port address and reuses the existing simulated version', () => {
    const t = pair();
    const out = t.show('R1', DETAIL);
    expect(out).toContain('Device ID: R2');
    expect(out).toContain('  IP address: 10.0.12.2');
    expect(out).toContain('Interface: GigabitEthernet0/1,  Port ID (outgoing port): GigabitEthernet0/0');
    expect(out).toContain(t.show('R2', 'show version')[0]);
    expect(out).toContain('Holdtime : not simulated');
    expect(out.join('\n')).not.toMatch(/Holdtime\s*:\s*\d|Duplex:|advertisement version:/);
  });

  it('omits IP rather than inventing one, including when another disconnected port has an IP', () => {
    const t = pair().config('R2', 'interface gi0/0', 'no ip address', 'interface gi0/1', 'ip address 192.0.2.1 255.255.255.0', 'no shutdown');
    expect(t.show('R1', DETAIL).join('\n')).not.toContain('IP address:');
    expect(rows(t.show())).toHaveLength(1); // CDP-shaped view does not require an IP
  });

  it('chooses up sub-interface addresses on the remote physical port by VLAN, never an inactive one', () => {
    const t = pair().config('R2', 'interface gi0/0', 'no ip address',
      'interface gi0/0.20', 'encapsulation dot1Q 20', 'ip address 10.20.0.1 255.255.255.0',
      'interface gi0/0.10', 'encapsulation dot1Q 10', 'ip address 10.10.0.1 255.255.255.0');
    expect(t.show('R1', DETAIL)).toContain('  IP address: 10.10.0.1');
    t.dev('R2').subifs.reverse();
    expect(t.show('R1', DETAIL)).toContain('  IP address: 10.10.0.1');
    t.config('R2', 'interface gi0/0.10', 'shutdown');
    expect(t.show('R1', DETAIL)).toContain('  IP address: 10.20.0.1');
  });

  it('selects only an operational switch SVI, in VLAN order', () => {
    const t = new Topology().add('R1').add('SW1', 'cisco-switch')
      .cable('R1', 'GigabitEthernet0/1', 'SW1', 'GigabitEthernet0/1').config('R1', 'interface gi0/1', 'no shutdown')
      .config('SW1', 'vlan 10', 'exit', 'vlan 20', 'exit', 'interface gi0/1', 'switchport mode trunk',
        'interface vlan 20', 'ip address 10.20.0.2 255.255.255.0', 'no shutdown',
        'interface vlan 10', 'ip address 10.10.0.2 255.255.255.0', 'no shutdown');
    expect(t.show('R1', DETAIL)).toContain('  IP address: 10.10.0.2');
    t.config('SW1', 'interface gi0/1', 'switchport trunk allowed vlan 20');
    expect(t.show('R1', DETAIL)).toContain('  IP address: 10.20.0.2');
    t.config('SW1', 'interface vlan 20', 'shutdown');
    expect(t.show('R1', DETAIL).join('\n')).not.toContain('IP address:');
  });

  it('returns a clear empty list with no invented neighbor data', () => {
    const t = new Topology().add('R1');
    expect(rows(t.show())).toEqual([]);
    expect(t.show()).toContain('Total cdp entries displayed : 0');
    expect(t.show('R1', DETAIL)).toEqual([
      'Simulator topology view: no CDP advertisements or timers; Holdtme is not simulated.', 'Total cdp entries displayed : 0',
    ]);
  });

  it('is deterministic across repeat execution and Lab export/import without persisting discovery state', () => {
    const t = pair();
    const before = serializeExport(t.lab);
    const original = structuredClone(t.lab);
    for (const command of [SUMMARY, DETAIL]) {
      const out = t.show('R1', command);
      expect(t.show('R1', command)).toEqual(out);
      const parsed = parseImport(before);
      if (!parsed.ok) throw new Error(parsed.error);
      const result = executeLine(parsed.lab, 'R1', command);
      expect(result.ok).toBe(true);
      expect(result.output).toEqual(out);
      const expected = structuredClone(parsed.lab);
      expected.devices.find((d) => d.id === 'R1')!.cli.history.push(command);
      expect(result.lab).toEqual(expected); // only the existing CLI command history changes
      const roundTrip = parseImport(serializeExport(result.lab));
      if (!roundTrip.ok) throw new Error(roundTrip.error);
      expect(roundTrip.lab).toEqual(expected);
    }
    expect(t.lab).toEqual(original);
  });

  it('uses privileged EXEC and existing do/help/Tab/abbreviation handling without changing config context', () => {
    const t = pair();
    expect(executeLine(t.lab, 'R1', 'sh cdp nei').output).toEqual(t.show());
    expect(executeLine(t.lab, 'R1', 'sh cdp nei det').output).toEqual(t.show('R1', DETAIL));
    expect(executeLine(t.lab, 'R1', 'show cdp neighbors ?').output.join('\n')).toMatch(/detail/);
    expect(completeLine(t.dev('R1'), 'show cdp nei').value).toBe('show cdp neighbors ');
    t.cli('R1', 'configure terminal', 'interface gi0/1');
    const before = structuredClone(t.lab);
    const r = executeLine(t.lab, 'R1', 'do show cdp neighbors detail');
    expect(r.ok).toBe(true);
    expect(r.output).toContain('Device ID: R2');
    expect(r.lab.devices.find((d) => d.id === 'R1')!.cli.ctxIface).toBe('GigabitEthernet0/1');
    expect(r.lab.devices.find((d) => d.id === 'R1')!.cli.mode).toBe('config-if');
    expect(t.lab).toEqual(before); // input is never mutated
    t.cli('R1', 'end', 'disable');
    expect(executeLine(t.lab, 'R1', SUMMARY).ok).toBe(false);
  });

  it('rejects unsupported arguments, CDP config, LLDP, logging, and non-Cisco command sources', () => {
    const t = pair().add('Aruba', 'aruba-switch').add('PC', 'pc');
    for (const command of ['show cdp', 'show cdp neighbors extra', 'show cdp neighbors gi0/1', 'show lldp neighbors', 'show logging']) {
      expect(executeLine(t.lab, 'R1', command).ok, command).toBe(false);
    }
    for (const name of ['Aruba', 'PC']) expect(executeLine(t.lab, name, SUMMARY).ok).toBe(false);
    t.cli('R1', 'configure terminal');
    expect(executeLine(t.lab, 'R1', 'cdp run').ok).toBe(false);
  });
});
