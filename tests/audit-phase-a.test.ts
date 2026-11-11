/**
 * Regression tests for the Phase A findings of NETWORK_LAB_AUDIT_REPORT.md (NLS-001 … NLS-006).
 * Each lab is built from scratch with the same API the app uses, then driven through the CLI.
 */
import { describe, expect, it } from 'vitest';
import { executeLine } from '../src/core/cli/engine';
import { addDevice, addLink, emptyLab, linkAt, removeLink, updateDevice } from '../src/core/lab';
import { ping } from '../src/core/network';
import { PALETTE_GROUPS, PROFILES } from '../src/core/profiles';
import type { DeviceKind, Lab } from '../src/core/types';

class B {
  lab: Lab = emptyLab('phase-a');
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
  unlink(a: string, ap: string) {
    this.lab = removeLink(this.lab, linkAt(this.lab, this.ids[a], ap)!.id);
    return this;
  }
  pc(name: string, ip: string, mask: string, gw: string | null = null) {
    this.lab = updateDevice(this.lab, this.ids[name], (d) => ({ ...d, gateway: gw, ifaces: d.ifaces.map((i) => ({ ...i, ip, mask })) }));
    return this;
  }
  /** runs lines; every line must be accepted unless `allowFail` */
  cli(name: string, lines: string[], allowFail = false) {
    return lines.map((l) => {
      const r = executeLine(this.lab, this.ids[name], l);
      this.lab = r.lab;
      if (!r.ok && !allowFail) throw new Error(`${name}: "${l}" rejected: ${r.output.join(' | ')}`);
      return r;
    });
  }
  out(name: string, line: string) {
    return this.cli(name, [line], true)[0].output.join('\n');
  }
}

/** PC1 - SW1 - [SW2 - SW3 …] - PC2 in VLAN 1, no router */
function switchChain(n: number) {
  const b = new B().dev('PC1', 'pc').dev('PC2', 'pc');
  for (let k = 1; k <= n; k++) b.dev(`SW${k}`, 'cisco-switch');
  b.link('PC1', 'Ethernet0', 'SW1', 'FastEthernet0/1');
  for (let k = 1; k < n; k++) b.link(`SW${k}`, 'GigabitEthernet0/2', `SW${k + 1}`, 'GigabitEthernet0/1');
  b.link(`SW${n}`, 'FastEthernet0/2', 'PC2', 'Ethernet0');
  return b.pc('PC1', '192.168.1.10', '255.255.255.0').pc('PC2', '192.168.1.20', '255.255.255.0');
}

/** PC1 - R1 - R2 - R3 - PC3, /30 transit links, static routes both ways */
function threeRouters(r1Default = true) {
  const b = new B().dev('PC1', 'pc').dev('PC3', 'pc').dev('R1', 'cisco-router').dev('R2', 'cisco-router').dev('R3', 'cisco-router');
  b.link('PC1', 'Ethernet0', 'R1', 'GigabitEthernet0/0')
    .link('R1', 'GigabitEthernet0/1', 'R2', 'GigabitEthernet0/0')
    .link('R2', 'GigabitEthernet0/1', 'R3', 'GigabitEthernet0/0')
    .link('R3', 'GigabitEthernet0/1', 'PC3', 'Ethernet0');
  b.pc('PC1', '10.1.1.10', '255.255.255.0', '10.1.1.1').pc('PC3', '10.3.3.10', '255.255.255.0', '10.3.3.1');
  const ifc = (n: string, ip: string, m: string) => [`interface ${n}`, `ip address ${ip} ${m}`, 'no shutdown', 'exit'];
  b.cli('R1', ['enable', 'configure terminal', ...ifc('gi0/0', '10.1.1.1', '255.255.255.0'), ...ifc('gi0/1', '10.0.12.1', '255.255.255.252'), ...(r1Default ? ['ip route 0.0.0.0 0.0.0.0 10.0.12.2'] : []), 'end']);
  b.cli('R2', ['enable', 'configure terminal', ...ifc('gi0/0', '10.0.12.2', '255.255.255.252'), ...ifc('gi0/1', '10.0.23.1', '255.255.255.252'), 'ip route 10.1.1.0 255.255.255.0 10.0.12.1', 'ip route 10.3.3.0 255.255.255.0 10.0.23.2', 'end']);
  b.cli('R3', ['enable', 'configure terminal', ...ifc('gi0/0', '10.0.23.2', '255.255.255.252'), ...ifc('gi0/1', '10.3.3.1', '255.255.255.0'), 'ip route 0.0.0.0 0.0.0.0 10.0.23.1', 'end']);
  return b;
}

const ttlOf = (text: string) => Number(/TTL=(\d+)/.exec(text)?.[1]);

describe('NLS-001 — reply TTL counts routers only, from the replying OS initial TTL', () => {
  it('no router crossed: TTL=128 however many switches are in the path', () => {
    for (const n of [1, 2, 4]) {
      const b = switchChain(n);
      expect(ttlOf(b.out('PC1', 'ping 192.168.1.20')), `${n} switch(es)`).toBe(128);
    }
  });

  it('three routers crossed: Windows reply arrives with TTL=125', () => {
    const b = threeRouters();
    expect(ttlOf(b.out('PC1', 'ping 10.3.3.10'))).toBe(125);
    expect(ping(b.lab, b.ids.PC1, '10.3.3.10').replyTtl).toBe(125);
  });

  it('a Cisco router replies with initial TTL 255 (minus the routers on the way back)', () => {
    const b = threeRouters();
    expect(ttlOf(b.out('PC1', 'ping 10.1.1.1'))).toBe(255); // directly connected R1
    expect(ttlOf(b.out('PC1', 'ping 10.0.23.2'))).toBe(253); // R3, back through R2 and R1
  });

  it('an AOS-CX switch replies with TTL 64 and its own ping shows the reply TTL', () => {
    const b = new B().dev('PC1', 'pc').dev('DSW', 'l3-switch');
    b.link('PC1', 'Ethernet0', 'DSW', '1/1/1').pc('PC1', '192.168.10.10', '255.255.255.0', '192.168.10.1');
    b.cli('DSW', ['configure terminal', 'vlan 10', 'exit', 'interface 1/1/1', 'no shutdown', 'no routing', 'vlan access 10', 'exit', 'interface vlan 10', 'ip address 192.168.10.1/24', 'end']);
    expect(ttlOf(b.out('PC1', 'ping 192.168.10.1'))).toBe(64);
    expect(b.out('DSW', 'ping 192.168.10.10')).toContain('ttl=128');
  });

  it('failed pings carry no reply TTL', () => {
    expect(ping(threeRouters().unlink('PC3', 'Ethernet0').lab, threeRouters().ids.PC1, '10.3.3.10').replyTtl).toBeNull();
  });
});

describe('NLS-002 — PC with no link: "General failure", 100% loss (matches ipconfig Media disconnected)', () => {
  it('cable unplugged', () => {
    const b = switchChain(1).unlink('PC1', 'Ethernet0');
    const out = b.out('PC1', 'ping 192.168.1.20');
    expect(out).toContain('PING: transmit failed. General failure.');
    expect(out).toContain('Lost = 4 (100% loss)');
    expect(out).not.toContain('Destination host unreachable');
    expect(b.out('PC1', 'ipconfig')).toContain('Media disconnected');
    const r = ping(b.lab, b.ids.PC1, '192.168.1.20');
    expect(r.kind).toBe('general-failure');
    expect(r.explanation.join(' ')).toMatch(/Media disconnected/);
  });

  it('switch port facing the PC is shut down: also General failure, and the reason names the port', () => {
    const b = switchChain(1);
    b.cli('SW1', ['enable', 'configure terminal', 'interface fa0/1', 'shutdown', 'end']);
    const r = ping(b.lab, b.ids.PC1, '192.168.1.20');
    expect(r.kind).toBe('general-failure');
    expect(r.explanation.join(' ')).toMatch(/FastEthernet0\/1|Fa0\/1/);
  });

  it('pinging its own address still works without a cable (loopback), and ARP failure on a live link is still "host unreachable"', () => {
    const b = switchChain(1).unlink('PC1', 'Ethernet0');
    expect(ping(b.lab, b.ids.PC1, '192.168.1.10').ok).toBe(true);
    const live = switchChain(1);
    const out = live.out('PC1', 'ping 192.168.1.99');
    expect(out).toContain('Destination host unreachable');
  });
});

describe('NLS-003 — Cisco VLANs 1002-1005 are reserved', () => {
  it('vlan 1002-1005 and switchport access vlan 1002-1005 are rejected; 1001 and 1006 work', () => {
    const b = switchChain(1);
    b.cli('SW1', ['enable', 'configure terminal']);
    for (const id of [1002, 1003, 1004, 1005]) {
      const r = b.cli('SW1', [`vlan ${id}`], true)[0];
      expect(r.ok, `vlan ${id}`).toBe(false);
      expect(r.output.join(' ')).toMatch(/reserved/);
    }
    b.cli('SW1', ['interface fa0/3']);
    expect(b.cli('SW1', ['switchport access vlan 1003'], true)[0].ok).toBe(false);
    b.cli('SW1', ['exit', 'vlan 1001', 'exit', 'vlan 1006', 'exit']);
    const vlans = b.lab.devices.find((d) => d.id === b.ids.SW1)!.vlans.map((v) => v.id);
    expect(vlans).toEqual([1, 1001, 1006]);
  });
});

describe('NLS-004 — a router without a route answers with ICMP Destination Net Unreachable', () => {
  /** R2 loses its route towards PC3's LAN */
  const broken = () => {
    const b = threeRouters();
    b.cli('R2', ['configure terminal', 'no ip route 10.3.3.0 255.255.255.0 10.0.23.2', 'end']);
    return b;
  };

  it('PC: "Reply from <R2>: Destination net unreachable." (counted as received, like Windows)', () => {
    const b = broken();
    const r = ping(b.lab, b.ids.PC1, '10.3.3.10');
    expect(r.kind).toBe('net-unreachable');
    expect(r.icmpFrom).toBe('10.0.12.2');
    const out = b.out('PC1', 'ping 10.3.3.10');
    expect(out).toContain('Reply from 10.0.12.2: Destination net unreachable.');
    expect(out).toContain('Received = 4');
  });

  it('Cisco router shows U.U.U and 0 percent', () => {
    const out = broken().out('R1', 'ping 10.3.3.10');
    expect(out).toContain('U.U.U');
    expect(out).toContain('Success rate is 0 percent');
  });

  it('the source router itself having no route stays a plain failure (no ICMP from itself)', () => {
    const b = threeRouters(false);
    const r = ping(b.lab, b.ids.R1, '10.3.3.10');
    expect(r.kind).toBe('timeout');
    expect(b.out('R1', 'ping 10.3.3.10')).toContain('.....');
  });

  it('when the router cannot reach the source either, the ping just times out', () => {
    const b = broken();
    b.cli('R2', ['configure terminal', 'no ip route 10.1.1.0 255.255.255.0 10.0.12.1', 'end']);
    // R2 has no way back to 10.1.1.10 → no ICMP reaches PC1
    expect(ping(b.lab, b.ids.PC1, '10.3.3.10').kind).toBe('timeout');
  });

  it('a routing loop is still reported as a timeout, not as net unreachable', () => {
    const b = threeRouters();
    b.cli('R2', ['configure terminal', 'no ip route 10.3.3.0 255.255.255.0 10.0.23.2', 'ip route 10.3.3.0 255.255.255.0 10.0.12.1', 'end']);
    const r = ping(b.lab, b.ids.PC1, '10.3.3.10');
    expect(r.kind).toBe('timeout');
    expect(r.explanation.join(' ')).toMatch(/loop/);
  });
});

describe('NLS-006 — device labels and 2960 show ip route match what the model does', () => {
  it('Aruba CX 6100 is not labelled as L2-only (it routes between SVIs)', () => {
    const note = PALETTE_GROUPS.flatMap((g) => g.items).find((i) => i.kind === 'aruba-switch')!.note;
    expect(PROFILES['aruba-switch'].canForward).toBe(true);
    expect(note).not.toMatch(/\bL2\b/);
    expect(PROFILES['aruba-switch'].roleNote).not.toMatch(/\bL2\b/);
  });

  it('Catalyst 2960 `show ip route` shows its default gateway (host mode)', () => {
    const b = switchChain(1);
    expect(b.out('SW1', 'show ip route')).toContain('Default gateway is not set');
    b.cli('SW1', ['enable', 'configure terminal', 'ip default-gateway 192.168.1.1', 'end']);
    const out = b.out('SW1', 'show ip route');
    expect(out).toContain('Default gateway is 192.168.1.1');
    expect(out).not.toContain('Codes:'); // no routing table: the 2960 does not route
  });
});
