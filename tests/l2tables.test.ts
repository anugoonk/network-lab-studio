import { describe, expect, it } from 'vitest';
import { executeLine } from '../src/core/cli/engine';
import { arpTable, duplicateIps, fmtMacCisco, fmtMacColon, fmtMacDash, macOf, macTable } from '../src/core/l2tables';
import { updateDevice } from '../src/core/lab';
import { buildInterVlanLab } from '../src/core/sample';
import type { Lab } from '../src/core/types';
import { byName, dev, run } from './helpers';

const lab0 = () => buildInterVlanLab();
const out = (lab: Lab, name: string, lines: string[]) => run(lab, name, lines).results.map((r) => r.output.join('\n'));
const setIp = (lab: Lab, name: string, ip: string) =>
  updateDevice(lab, byName(lab, name).id, (d) => ({ ...d, ifaces: d.ifaces.map((i) => ({ ...i, ip })) }));
const macOfPc = (lab: Lab, name: string) => macOf(byName(lab, name).id, 'Ethernet0');

describe('MAC addresses', () => {
  it('are stable, unicast, locally administered and per interface', () => {
    const lab = lab0();
    const a = macOfPc(lab, 'PC-A');
    expect(a).toBe(macOfPc(lab, 'PC-A'));
    expect(a).toMatch(/^024e[0-9a-f]{8}$/);
    expect(a).not.toBe(macOfPc(lab, 'PC-B'));
    expect(fmtMacCisco(a)).toMatch(/^[0-9a-f]{4}\.[0-9a-f]{4}\.[0-9a-f]{4}$/);
    expect(fmtMacColon(a)).toMatch(/^([0-9a-f]{2}:){5}[0-9a-f]{2}$/);
    expect(fmtMacDash(a)).toMatch(/^([0-9a-f]{2}-){5}[0-9a-f]{2}$/);
  });
});

describe('MAC address table (derived from topology, not canned)', () => {
  it('SW1 learns PC-A locally in VLAN 10, PC-C through the trunk, and R1 in both VLANs on its trunk', () => {
    const lab = lab0();
    const t = macTable(lab, dev(lab, 'SW1'));
    const find = (mac: string, vlan: number) => t.find((e) => e.mac === mac && e.vlan === vlan);
    expect(find(macOfPc(lab, 'PC-A'), 10)?.port).toBe('FastEthernet0/1');
    expect(find(macOfPc(lab, 'PC-C'), 10)?.port).toBe('GigabitEthernet0/2');
    expect(find(macOfPc(lab, 'PC-D'), 20)?.port).toBe('GigabitEthernet0/2');
    const r1 = macOf(byName(lab, 'R1').id, 'GigabitEthernet0/0');
    expect(find(r1, 10)?.port).toBe('GigabitEthernet0/1');
    expect(find(r1, 20)?.port).toBe('GigabitEthernet0/1');
    // a MAC never appears in a VLAN where it cannot be heard
    expect(find(macOfPc(lab, 'PC-A'), 20)).toBeUndefined();
  });

  it('moving a port to another VLAN moves the MAC; shutting it removes it', () => {
    let lab = lab0();
    lab = run(lab, 'SW1', ['enable', 'configure terminal', 'interface fa0/1', 'switchport access vlan 20']).lab;
    const pcA = macOfPc(lab, 'PC-A');
    expect(macTable(lab, dev(lab, 'SW1')).filter((e) => e.mac === pcA).map((e) => e.vlan)).toEqual([20]);
    lab = run(lab, 'SW1', ['shutdown']).lab;
    expect(macTable(lab, dev(lab, 'SW1')).some((e) => e.mac === pcA)).toBe(false);
  });

  it('Cisco and Aruba commands print the same facts in their own layouts', () => {
    const lab = lab0();
    const cisco = out(lab, 'SW1', ['enable', 'show mac address-table'])[1];
    expect(cisco).toContain('Mac Address Table');
    expect(cisco).toContain(fmtMacCisco(macOfPc(lab, 'PC-A')));
    expect(cisco).toMatch(/DYNAMIC\s+Fa0\/1/);
    expect(cisco).toMatch(/Total Mac Addresses for this criterion: \d+/);
    const aruba = out(lab, 'SW2', ['show mac-address-table'])[0];
    expect(aruba).toContain(fmtMacColon(macOfPc(lab, 'PC-C')));
    expect(aruba).toMatch(/Number of MAC addresses : \d+/);
  });
});

describe('ARP table', () => {
  it('R1 lists PC-A on its VLAN 10 sub-interface and PC-B on VLAN 20, never across VLANs; own addresses show age "-"', () => {
    const lab = lab0();
    const t = arpTable(lab, dev(lab, 'R1'));
    const has = (ip: string, iface: string) => t.some((e) => e.ip === ip && e.iface === iface);
    expect(has('192.168.10.11', 'GigabitEthernet0/0.10')).toBe(true);
    expect(has('192.168.10.12', 'GigabitEthernet0/0.10')).toBe(true);
    expect(has('192.168.20.11', 'GigabitEthernet0/0.20')).toBe(true);
    expect(has('192.168.20.11', 'GigabitEthernet0/0.10')).toBe(false);
    const text = out(lab, 'R1', ['enable', 'show ip arp'])[1];
    expect(text).toMatch(/Internet\s+192\.168\.10\.1\s+-\s+[0-9a-f]{4}\.[0-9a-f]{4}\.[0-9a-f]{4}\s+ARPA\s+GigabitEthernet0\/0\.10/);
    expect(text).toMatch(/Internet\s+192\.168\.10\.11\s+0\s+/);
  });

  it('a PC sees its gateway and VLAN peers; an isolated PC sees nothing', () => {
    let lab = lab0();
    const text = out(lab, 'PC-A', ['arp -a'])[0];
    expect(text).toContain('Interface: 192.168.10.11');
    expect(text).toContain(fmtMacDash(macOf(byName(lab, 'R1').id, 'GigabitEthernet0/0')));
    expect(text).toMatch(/192\.168\.10\.1\s+\S+\s+dynamic/);
    expect(text).not.toContain('192.168.20.11');
    lab = run(lab, 'SW1', ['enable', 'configure terminal', 'interface fa0/1', 'shutdown']).lab;
    expect(out(lab, 'PC-A', ['arp -a'])[0]).toBe('No ARP Entries Found.');
  });

  it('Aruba show arp lists SVI neighbours with the physical port they were learned on', () => {
    let lab = lab0();
    lab = run(lab, 'SW2', ['configure terminal', 'interface vlan 10', 'ip address 192.168.10.254/24', 'end']).lab;
    const text = out(lab, 'SW2', ['show arp'])[0];
    expect(text).toMatch(new RegExp(`192\\.168\\.10\\.11\\s+${fmtMacColon(macOfPc(lab, 'PC-A'))}\\s+vlan10\\s+1/1/24\\s`));
    expect(text).toMatch(new RegExp(`192\\.168\\.10\\.12\\s+${fmtMacColon(macOfPc(lab, 'PC-C'))}\\s+vlan10\\s+1/1/1\\s`));
  });
});

describe('duplicate IP detection', () => {
  it('is empty in the healthy lab', () => {
    expect(duplicateIps(lab0())).toEqual([]);
  });

  it('flags two hosts in the same VLAN, but not the same address in two isolated VLANs', () => {
    let lab = setIp(lab0(), 'PC-C', '192.168.10.11'); // PC-A is also .11, both VLAN 10
    const d = duplicateIps(lab);
    expect(d).toHaveLength(1);
    expect(d[0].ip).toBe('192.168.10.11');
    expect(d[0].members.map((m) => m.deviceName)).toEqual(['PC-A', 'PC-C']);
    lab = setIp(lab0(), 'PC-B', '192.168.10.11'); // PC-B is VLAN 20: a separate L2 domain
    expect(duplicateIps(lab)).toEqual([]);
  });

  it('disappears when one of the two is cut off (shutdown port)', () => {
    let lab = setIp(lab0(), 'PC-C', '192.168.10.11');
    lab = run(lab, 'SW2', ['configure terminal', 'interface 1/1/1', 'shutdown']).lab;
    expect(duplicateIps(lab)).toEqual([]);
  });

  it('IOS prints %IP-4-DUPADDR naming the other device MAC when a conflicting address is configured', () => {
    const lab = lab0();
    const r = out(lab, 'R1', ['enable', 'configure terminal', 'interface gi0/0.10', 'ip address 192.168.10.11 255.255.255.0']);
    expect(r[3]).toBe(`%IP-4-DUPADDR: Duplicate address 192.168.10.11 on GigabitEthernet0/0.10, sourced by ${fmtMacCisco(macOfPc(lab, 'PC-A'))}`);
    // a non-conflicting address prints nothing
    expect(out(lab, 'R1', ['enable', 'configure terminal', 'interface gi0/0.10', 'ip address 192.168.10.2 255.255.255.0'])[3]).toBe('');
  });

  it('Windows ipconfig marks a duplicate address', () => {
    const dup = setIp(lab0(), 'PC-C', '192.168.10.11');
    expect(executeLine(dup, byName(dup, 'PC-C').id, 'ipconfig').output.join('\n')).toContain('192.168.10.11(Duplicate)');
    const ok = lab0();
    expect(executeLine(ok, byName(ok, 'PC-C').id, 'ipconfig').output.join('\n')).not.toContain('(Duplicate)');
  });
});
