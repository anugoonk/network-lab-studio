/**
 * R-03 (remediation batch 2): native VLAN mismatch between the two ends of a trunk.
 * Detection is read-only and derived from the current Lab; Cisco↔Cisco switch trunks also log the CDP syslog message
 * (`%CDP-4-NATIVE_VLAN_MISMATCH`) once, on the command that created the mismatch. Aruba prints nothing.
 */
import { describe, expect, it } from 'vitest';
import { executeLine } from '../src/core/cli/engine';
import { addDevice, addLink, emptyLab, updateDevice } from '../src/core/lab';
import { ping } from '../src/core/network';
import { cdpMismatchLog, nativeVlanMismatches } from '../src/core/trunkcheck';
import type { DeviceKind, Lab } from '../src/core/types';

class B {
  lab: Lab = emptyLab('native');
  ids: Record<string, string> = {};
  dev(name: string, kind: DeviceKind) {
    const r = addDevice(this.lab, kind, 0, 0);
    this.lab = r.lab;
    this.ids[name] = r.device.id;
    return this;
  }
  link(a: string, ap: string, b: string, bp: string) {
    const r = addLink(this.lab, { deviceId: this.ids[a], port: ap }, { deviceId: this.ids[b], port: bp });
    if (r.error) throw new Error(r.error);
    this.lab = r.lab;
    return this;
  }
  pc(name: string, ip: string) {
    this.lab = updateDevice(this.lab, this.ids[name], (d) => ({ ...d, ifaces: d.ifaces.map((i) => ({ ...i, ip, mask: '255.255.255.0' })) }));
    return this;
  }
  /** runs lines (all must be accepted) and returns every output line produced */
  cli(name: string, lines: string[]) {
    const out: string[] = [];
    for (const l of lines) {
      const r = executeLine(this.lab, this.ids[name], l);
      if (!r.ok) throw new Error(`${name}: "${l}" rejected: ${r.output.join(' | ')}`);
      this.lab = r.lab;
      out.push(...r.output);
    }
    return out;
  }
}

const CFG = ['enable', 'configure terminal'];
const cdpLines = (out: string[]) => out.filter((l) => l.startsWith('%CDP-4-NATIVE_VLAN_MISMATCH'));

/** SW1 Gi0/1 — SW2 Gi0/1 (Cisco 2960s), both trunks with native VLAN 1; PC1 on SW1 VLAN 1, PC2 on SW2 VLAN 99 */
function ciscoPair() {
  const b = new B().dev('SW1', 'cisco-switch').dev('SW2', 'cisco-switch').dev('PC1', 'pc').dev('PC2', 'pc');
  b.link('SW1', 'GigabitEthernet0/1', 'SW2', 'GigabitEthernet0/1').link('PC1', 'Ethernet0', 'SW1', 'FastEthernet0/1').link('PC2', 'Ethernet0', 'SW2', 'FastEthernet0/1');
  b.pc('PC1', '192.168.5.1').pc('PC2', '192.168.5.2');
  b.cli('SW1', [...CFG, 'interface gi0/1', 'switchport mode trunk']);
  b.cli('SW2', [...CFG, 'vlan 99', 'exit', 'interface fa0/1', 'switchport access vlan 99', 'exit', 'interface gi0/1', 'switchport mode trunk']);
  return b;
}

/** Cisco SW1 Gi0/2 — Aruba SW2 1/1/24 trunk (both native 1) */
function mixedPair() {
  const b = new B().dev('SW1', 'cisco-switch').dev('SW2', 'aruba-switch');
  b.link('SW1', 'GigabitEthernet0/2', 'SW2', '1/1/24');
  b.cli('SW1', [...CFG, 'interface gi0/2', 'switchport mode trunk']);
  b.cli('SW2', ['configure terminal', 'interface 1/1/24', 'no shutdown', 'no routing', 'vlan trunk allowed all']);
  return b;
}

describe('detection', () => {
  it('no mismatch while both trunk ends use the same native VLAN', () => {
    expect(nativeVlanMismatches(ciscoPair().lab)).toEqual([]);
    expect(nativeVlanMismatches(mixedPair().lab)).toEqual([]);
  });

  it('Cisco ↔ Cisco: one entry for the link, flagged as a CDP link', () => {
    const b = ciscoPair();
    b.cli('SW2', ['switchport trunk native vlan 99']);
    const m = nativeVlanMismatches(b.lab);
    expect(m).toHaveLength(1);
    expect(m[0]).toMatchObject({ cdp: true, a: { deviceId: b.ids.SW1, port: 'GigabitEthernet0/1', nativeVlan: 1 }, b: { deviceId: b.ids.SW2, port: 'GigabitEthernet0/1', nativeVlan: 99 } });
  });

  it('Cisco ↔ Aruba and Aruba ↔ Aruba are detected but are not CDP links', () => {
    const b = mixedPair();
    b.cli('SW2', ['vlan trunk native 1']); // still equal
    expect(nativeVlanMismatches(b.lab)).toEqual([]);
    b.cli('SW2', ['exit', 'vlan 30', 'exit', 'interface 1/1/24', 'vlan trunk native 30']);
    expect(nativeVlanMismatches(b.lab)).toMatchObject([{ cdp: false }]);

    const a = new B().dev('A1', 'aruba-switch').dev('A2', 'l3-switch').link('A1', '1/1/1', 'A2', '1/1/1');
    for (const n of ['A1', 'A2']) a.cli(n, ['configure terminal', 'vlan 50', 'exit', 'interface 1/1/1', 'no shutdown', 'no routing', 'vlan trunk allowed all']);
    expect(nativeVlanMismatches(a.lab)).toEqual([]);
    a.cli('A2', ['vlan trunk native 50']);
    expect(nativeVlanMismatches(a.lab)).toMatchObject([{ cdp: false, b: { nativeVlan: 50 } }]);
  });

  it('only trunk ↔ trunk on a link that is up is reported', () => {
    // trunk ↔ access: not a trunk pair
    const b = ciscoPair();
    b.cli('SW2', ['switchport trunk native vlan 99', 'switchport mode access']);
    expect(nativeVlanMismatches(b.lab)).toEqual([]);
    // one end shut down: no neighbour exchange, nothing reported; back up → reported again
    const c = ciscoPair();
    c.cli('SW2', ['switchport trunk native vlan 99', 'shutdown']);
    expect(nativeVlanMismatches(c.lab)).toEqual([]);
    c.cli('SW2', ['no shutdown']);
    expect(nativeVlanMismatches(c.lab)).toHaveLength(1);
    // Aruba port back in routed mode is not an L2 trunk
    const m = mixedPair();
    m.cli('SW2', ['exit', 'vlan 30', 'exit', 'interface 1/1/24', 'vlan trunk native 30']);
    expect(nativeVlanMismatches(m.lab)).toHaveLength(1);
    m.cli('SW2', ['routing']);
    expect(nativeVlanMismatches(m.lab)).toEqual([]);
  });

  it('warning disappears when the mismatch is resolved (either side)', () => {
    const b = ciscoPair();
    b.cli('SW2', ['switchport trunk native vlan 99']);
    expect(nativeVlanMismatches(b.lab)).toHaveLength(1);
    b.cli('SW2', ['no switchport trunk native vlan']);
    expect(nativeVlanMismatches(b.lab)).toEqual([]);
    b.cli('SW2', ['switchport trunk native vlan 99']);
    b.cli('SW1', ['switchport trunk native vlan 99']);
    expect(nativeVlanMismatches(b.lab)).toEqual([]);
  });
});

describe('Cisco CDP syslog', () => {
  it('printed once, on the command that creates the mismatch, from the local point of view', () => {
    const b = ciscoPair();
    const out = b.cli('SW2', ['switchport trunk native vlan 99']);
    expect(cdpLines(out)).toEqual(['%CDP-4-NATIVE_VLAN_MISMATCH: Native VLAN mismatch discovered on GigabitEthernet0/1 (99), with SW1 GigabitEthernet0/1 (1).']);
    // no repeat on later commands, on either switch
    expect(cdpLines(b.cli('SW2', ['description UPLINK', 'do show interfaces trunk']))).toEqual([]);
    expect(cdpLines(b.cli('SW1', ['description UPLINK']))).toEqual([]);
  });

  it('also printed when the mismatch appears through `switchport mode trunk` or `no shutdown`', () => {
    const b = ciscoPair();
    b.cli('SW2', ['switchport mode access', 'switchport trunk native vlan 99']);
    expect(cdpLines(b.cli('SW2', ['switchport mode trunk']))).toHaveLength(1);
    const c = ciscoPair();
    c.cli('SW2', ['shutdown', 'switchport trunk native vlan 99']);
    expect(cdpLines(c.cli('SW2', ['no shutdown']))).toEqual(['%CDP-4-NATIVE_VLAN_MISMATCH: Native VLAN mismatch discovered on GigabitEthernet0/1 (99), with SW1 GigabitEthernet0/1 (1).']);
  });

  it('the peer prints it when the peer is the one that creates the mismatch', () => {
    const b = ciscoPair();
    expect(cdpLines(b.cli('SW1', ['switchport trunk native vlan 20']))).toEqual(['%CDP-4-NATIVE_VLAN_MISMATCH: Native VLAN mismatch discovered on GigabitEthernet0/1 (20), with SW2 GigabitEthernet0/1 (1).']);
  });

  it('no CDP message on Cisco ↔ Aruba links and never on Aruba', () => {
    const b = mixedPair();
    expect(cdpLines(b.cli('SW1', ['switchport trunk native vlan 99']))).toEqual([]);
    expect(nativeVlanMismatches(b.lab)).toHaveLength(1);
    const a = mixedPair();
    expect(cdpLines(a.cli('SW2', ['exit', 'vlan 30', 'exit', 'interface 1/1/24', 'vlan trunk native 30']))).toEqual([]);
  });

  it('no message when resolving, and nothing for a failed command', () => {
    const b = ciscoPair();
    b.cli('SW2', ['switchport trunk native vlan 99']);
    expect(cdpLines(b.cli('SW2', ['no switchport trunk native vlan']))).toEqual([]);
    const r = executeLine(b.lab, b.ids.SW2, 'switchport trunk native vlan 9999');
    expect(r.ok).toBe(false);
    expect(cdpLines(r.output)).toEqual([]);
  });

  it('cdpMismatchLog is silent for routers/PCs and for mismatches on other switches', () => {
    const b = ciscoPair().dev('R1', 'cisco-router');
    const before = b.lab;
    b.cli('SW2', ['switchport trunk native vlan 99']);
    expect(cdpMismatchLog(before, b.lab, b.ids.R1)).toEqual([]);
    expect(cdpMismatchLog(before, b.lab, b.ids.PC1)).toEqual([]);
  });
});

describe('no side effects', () => {
  it('detection does not change the Lab and does not change forwarding (the native-VLAN leak still happens)', () => {
    const b = ciscoPair();
    // native 1 on SW1, native 99 on SW2: untagged VLAN 1 frames from SW1 land in VLAN 99 on SW2 — PC1 (VLAN 1) reaches PC2 (VLAN 99)
    b.cli('SW2', ['switchport trunk native vlan 99']);
    const snapshot = JSON.stringify(b.lab);
    nativeVlanMismatches(b.lab);
    expect(JSON.stringify(b.lab)).toBe(snapshot);
    expect(ping(b.lab, b.ids.PC1, '192.168.5.2').ok).toBe(true);
    // the switch configuration is never corrected automatically
    expect(b.lab.devices.find((d) => d.id === b.ids.SW2)!.ifaces.find((i) => i.name === 'GigabitEthernet0/1')!.nativeVlan).toBe(99);
  });
});
