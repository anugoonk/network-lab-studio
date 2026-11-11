/**
 * R-09 (remediation batch 2): Cisco `show interfaces [name]`, `show interfaces vlan N`, `no switchport access vlan`,
 * `no description`; PC `ipconfig /all`. All of them read or change existing device state only (no new Lab fields).
 * Aruba `no vlan access` is intentionally NOT implemented (AOS-CX behaviour could not be verified).
 */
import { describe, expect, it } from 'vitest';
import { executeLine } from '../src/core/cli/engine';
import { fmtMacCisco, fmtMacDash, macOf } from '../src/core/l2tables';
import { ping } from '../src/core/network';
import { parseImport, serializeExport } from '../src/core/persist';
import { byName, dev, run, sample } from './helpers';

const out = (lab: ReturnType<typeof sample>, name: string, lines: string[]) => run(lab, name, lines).results.map((r) => r.output.join('\n'));
const last = (lab: ReturnType<typeof sample>, name: string, lines: string[]) => run(lab, name, lines).results.at(-1)!;

describe('Cisco show interfaces', () => {
  it('router: an up interface with its IPv4 address and the same MAC the rest of the lab sees', () => {
    const lab = sample();
    const r1 = byName(lab, 'R1');
    const mac = fmtMacCisco(macOf(r1.id, 'GigabitEthernet0/0'));
    const text = last(lab, 'R1', ['enable', 'show interfaces gi0/0']);
    expect(text.ok).toBe(true);
    expect(text.output).toEqual([
      'GigabitEthernet0/0 is up, line protocol is up',
      `  Hardware is CN Gigabit Ethernet, address is ${mac} (bia ${mac})`,
      '  Internet address is 192.168.1.1/24',
    ]);
    // same MAC as R1's own entry in `show ip arp`
    const arpRow = last(lab, 'R1', ['enable', 'show ip arp']).output.find((l) => /\s192\.168\.1\.1\s/.test(` ${l} `));
    expect(arpRow).toContain(mac);
  });

  it('router: administratively down vs down (no cable)', () => {
    let lab = sample();
    lab = run(lab, 'R1', ['enable', 'configure terminal', 'interface gi0/0', 'shutdown', 'end']).lab;
    expect(last(lab, 'R1', ['show interfaces gi0/0']).output[0]).toBe('GigabitEthernet0/0 is administratively down, line protocol is down');
    lab = run(lab, 'R1', ['configure terminal', 'interface gi0/2', 'no shutdown', 'end']).lab; // gi0/2 has no cable
    expect(last(lab, 'R1', ['show interfaces gi0/2']).output[0]).toBe('GigabitEthernet0/2 is down, line protocol is down');
  });

  it('Catalyst: connected / notconnect / disabled suffix, Fast vs Gigabit hardware, no IP line on switchports', () => {
    let lab = sample();
    const sw1 = byName(lab, 'SW1');
    const fa1 = last(lab, 'SW1', ['enable', 'show interfaces fa0/1']).output;
    expect(fa1[0]).toBe('FastEthernet0/1 is up, line protocol is up (connected)');
    expect(fa1[1]).toBe(`  Hardware is Fast Ethernet, address is ${fmtMacCisco(macOf(sw1.id, 'FastEthernet0/1'))} (bia ${fmtMacCisco(macOf(sw1.id, 'FastEthernet0/1'))})`);
    expect(fa1.join('\n')).not.toContain('Internet address');
    expect(last(lab, 'SW1', ['enable', 'show interfaces fa0/20']).output[0]).toBe('FastEthernet0/20 is down, line protocol is down (notconnect)');
    expect(last(lab, 'SW1', ['enable', 'show interfaces gi0/2']).output[1]).toContain('Hardware is Gigabit Ethernet');
    lab = run(lab, 'SW1', ['enable', 'configure terminal', 'interface fa0/1', 'shutdown', 'end']).lab;
    expect(last(lab, 'SW1', ['show interfaces fa0/1']).output[0]).toBe('FastEthernet0/1 is administratively down, line protocol is down (disabled)');
  });

  it('show interfaces lists SVIs first, then every port (with sub-interfaces after their parent on a router)', () => {
    let lab = sample();
    lab = run(lab, 'SW1', ['enable', 'configure terminal', 'interface vlan 10', 'ip address 192.168.1.2 255.255.255.0', 'end']).lab;
    const lines = last(lab, 'SW1', ['show interfaces']).output;
    const heads = lines.filter((l) => !l.startsWith(' '));
    expect(heads[0]).toBe('Vlan10 is up, line protocol is up');
    expect(heads).toHaveLength(1 + dev(lab, 'SW1').ifaces.length);
    expect(lines).toContain('  Hardware is EtherSVI, address is ' + fmtMacCisco(macOf(byName(lab, 'SW1').id, 'svi')) + ' (bia ' + fmtMacCisco(macOf(byName(lab, 'SW1').id, 'svi')) + ')');
    expect(last(lab, 'SW1', ['show interfaces vlan 10']).output).toEqual(lines.slice(0, 3));
  });

  it('router sub-interface: 802.1Q VLAN ID and address; unknown sub-interface / SVI is an error', () => {
    let lab = sample();
    lab = run(lab, 'R1', ['enable', 'configure terminal', 'interface gi0/1.30', 'encapsulation dot1Q 30', 'ip address 10.30.0.1 255.255.255.0', 'end']).lab;
    const sub = last(lab, 'R1', ['show interfaces gi0/1.30']).output;
    expect(sub).toContain('  Internet address is 10.30.0.1/24');
    expect(sub).toContain('  Encapsulation 802.1Q Virtual LAN, Vlan ID  30.');
    expect(sub[0]).toMatch(/^GigabitEthernet0\/1\.30 is (up|down|administratively down), line protocol is (up|down)$/);
    expect(last(lab, 'R1', ['show interfaces gi0/1.99']).ok).toBe(false);
    expect(last(sample(), 'SW1', ['enable', 'show interfaces vlan 77']).ok).toBe(false);
  });

  it('invalid syntax is rejected; existing show interfaces status / trunk still work; abbreviation works', () => {
    const lab = sample();
    expect(last(lab, 'SW1', ['enable', 'show interfaces fa0/99']).ok).toBe(false);
    expect(last(lab, 'R1', ['enable', 'show interfaces vlan 1']).ok).toBe(false); // routers have no SVIs
    expect(last(lab, 'SW1', ['enable', 'show interfaces status']).output[0]).toMatch(/^Port\s+Name\s+Status/);
    expect(last(lab, 'SW1', ['enable', 'show interfaces trunk']).ok).toBe(true);
    expect(last(lab, 'SW1', ['enable', 'sh int fa0/1']).output[0]).toBe('FastEthernet0/1 is up, line protocol is up (connected)');
    // Cisco syntax is not added to Aruba (AOS-CX uses `show interface`)
    expect(last(lab, 'SW2', ['show interfaces']).ok).toBe(false);
    expect(last(lab, 'SW2', ['show interface 1/1/1']).ok).toBe(true);
  });
});

describe('Cisco no switchport access vlan', () => {
  it('returns the port to VLAN 1 — show vlan brief, running-config and the simulation all follow', () => {
    let lab = sample();
    const pc = byName(lab, 'PC-01');
    expect(ping(lab, pc.id, '192.168.1.1').ok).toBe(true); // PC-01 on SW1 Fa0/1 (VLAN 10) reaches R1
    lab = run(lab, 'SW1', ['enable', 'configure terminal', 'interface fa0/1', 'no switchport access vlan', 'end']).lab;
    expect(dev(lab, 'SW1').ifaces.find((i) => i.name === 'FastEthernet0/1')!.accessVlan).toBe(1);
    const brief = last(lab, 'SW1', ['show vlan brief']).output;
    expect(brief.find((l) => l.startsWith('1 '))).toContain('Fa0/1,');
    expect(last(lab, 'SW1', ['show running-config']).output.join('\n')).not.toMatch(/interface FastEthernet0\/1\n( .*\n)* switchport access vlan/);
    expect(ping(lab, pc.id, '192.168.1.1').ok).toBe(false); // now in VLAN 1, away from the gateway
    // persists through export / import
    const re = parseImport(serializeExport(lab));
    expect(re.ok && dev(re.lab, 'SW1').ifaces.find((i) => i.name === 'FastEthernet0/1')!.accessVlan).toBe(1);
  });

  it('applies to every port of an interface range; rejected outside interface mode and on routers', () => {
    let lab = sample();
    lab = run(lab, 'SW1', ['enable', 'configure terminal', 'interface range fa0/1 - 3', 'no switchport access vlan', 'end']).lab;
    expect(dev(lab, 'SW1').ifaces.slice(0, 3).map((i) => i.accessVlan)).toEqual([1, 1, 1]);
    expect(dev(lab, 'SW1').ifaces[3].accessVlan).toBe(10); // Fa0/4 untouched
    expect(last(sample(), 'SW1', ['enable', 'configure terminal', 'no switchport access vlan']).ok).toBe(false);
    expect(last(sample(), 'R1', ['enable', 'configure terminal', 'interface gi0/0', 'no switchport access vlan']).ok).toBe(false);
  });
});

describe('Cisco no description', () => {
  it('removes the description of a port, a sub-interface and an SVI (running-config follows; persists)', () => {
    let lab = sample();
    lab = run(lab, 'SW1', ['enable', 'configure terminal', 'interface fa0/1', 'description PC01', 'interface vlan 10', 'description MGMT', 'end']).lab;
    expect(last(lab, 'SW1', ['show running-config']).output.join('\n')).toContain(' description PC01');
    lab = run(lab, 'SW1', ['configure terminal', 'interface fa0/1', 'no description', 'interface vlan 10', 'no description', 'end']).lab;
    const cfg = last(lab, 'SW1', ['show running-config']).output.join('\n');
    expect(cfg).not.toContain('description');
    expect(last(lab, 'SW1', ['show interfaces fa0/1']).output.join('\n')).not.toContain('Description');
    lab = run(lab, 'R1', ['enable', 'configure terminal', 'interface gi0/1.30', 'description WAN', 'no description', 'end']).lab;
    expect(dev(lab, 'R1').subifs.find((s) => s.id === 30)!.description).toBe('');
    const re = parseImport(serializeExport(lab));
    expect(re.ok && dev(re.lab, 'SW1').ifaces[0].description).toBe('');
  });

  it('is rejected in global configuration mode', () => {
    expect(last(sample(), 'R1', ['enable', 'configure terminal', 'no description']).ok).toBe(false);
  });
});

describe('PC ipconfig /all', () => {
  it('host name, MAC (the one other hosts see in arp -a), DHCP No, static addressing', () => {
    const lab = sample();
    const pc = byName(lab, 'PC-01');
    const mac = fmtMacDash(macOf(pc.id, 'Ethernet0'));
    const o = last(lab, 'PC-01', ['ipconfig /all']).output;
    expect(o).toEqual([
      '',
      'Windows IP Configuration',
      '',
      '   Host Name . . . . . . . . . . . . : PC-01',
      '',
      'Ethernet adapter Ethernet0:',
      '',
      '   Connection-specific DNS Suffix  . :',
      `   Physical Address. . . . . . . . . : ${mac.toUpperCase()}`,
      '   DHCP Enabled. . . . . . . . . . . : No',
      `   IPv4 Address. . . . . . . . . . . : ${pc.ifaces[0].ip}(Preferred)`,
      `   Subnet Mask . . . . . . . . . . . : ${pc.ifaces[0].mask}`,
      `   Default Gateway . . . . . . . . . : ${pc.gateway}`,
    ]);
    // another PC in the same LAN sees that MAC in its ARP table
    expect(last(lab, 'PC-02', ['arp -a']).output.join('\n')).toContain(mac);
  });

  it('cable unplugged: Media disconnected, no address lines; duplicate IP is flagged', () => {
    let lab = sample();
    const pc = byName(lab, 'PC-01');
    const link = lab.links.find((l) => l.a.deviceId === pc.id || l.b.deviceId === pc.id)!;
    const unplugged = { ...lab, links: lab.links.filter((l) => l.id !== link.id) };
    const o = last(unplugged, 'PC-01', ['ipconfig /all']).output;
    expect(o).toContain('   Media State . . . . . . . . . . . : Media disconnected');
    expect(o.join('\n')).not.toContain('IPv4 Address');
    // give PC-02 the same address as PC-01
    lab = { ...lab, devices: lab.devices.map((d) => (d.name === 'PC-02' ? { ...d, ifaces: d.ifaces.map((i) => ({ ...i, ip: pc.ifaces[0].ip })) } : d)) };
    expect(last(lab, 'PC-01', ['ipconfig /all']).output).toContain(`   IPv4 Address. . . . . . . . . . . : ${pc.ifaces[0].ip}(Duplicate)`);
  });

  it('plain ipconfig is unchanged; unknown switch is rejected; read-only', () => {
    const lab = sample();
    const pc = byName(lab, 'PC-01');
    expect(last(lab, 'PC-01', ['ipconfig']).output).toEqual([
      '', 'Windows IP Configuration', '', 'Ethernet adapter Ethernet0:', '',
      '   Connection-specific DNS Suffix  . :',
      `   IPv4 Address. . . . . . . . . . . : ${pc.ifaces[0].ip}`,
      `   Subnet Mask . . . . . . . . . . . : ${pc.ifaces[0].mask}`,
      `   Default Gateway . . . . . . . . . : ${pc.gateway}`,
    ]);
    expect(last(lab, 'PC-01', ['ipconfig /foo']).ok).toBe(false);
    const r = executeLine(lab, pc.id, 'ipconfig /all');
    expect(JSON.stringify(r.lab.devices.map((d) => ({ ...d, cli: null })))).toBe(JSON.stringify(lab.devices.map((d) => ({ ...d, cli: null }))));
  });
});

describe('Aruba no vlan access — not implemented (behaviour unverified)', () => {
  it('stays an unknown command', () => {
    const r = last(sample(), 'SW2', ['configure terminal', 'interface 1/1/1', 'no vlan access']);
    expect(r.ok).toBe(false);
  });
});

describe('outputs of other commands are unchanged', () => {
  it('every command still answers the same for the sample lab', () => {
    // representative existing commands; their output must not depend on the new ones
    const o = out(sample(), 'SW1', ['enable', 'show vlan brief', 'show interfaces status', 'show running-config']);
    expect(o[1]).toContain('1002 fddi-default');
    expect(o[2]).toMatch(/^Port\s+Name\s+Status/);
    expect(o[3]).toContain('hostname SW1');
  });
});
