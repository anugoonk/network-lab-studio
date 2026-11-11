/**
 * R-01 (remediation batch 1): traceroute / tracert.
 * trace() is derived from the same deliver() walk ping uses; hops are the devices that performed an L3 forwarding step.
 */
import { describe, expect, it } from 'vitest';
import { executeLine } from '../src/core/cli/engine';
import { addDevice, addLink, emptyLab, linkAt, removeLink, updateDevice } from '../src/core/lab';
import { ping, trace, type TraceResult } from '../src/core/network';
import { parseImport, serializeExport } from '../src/core/persist';
import { PROFILES } from '../src/core/profiles';
import { SAMPLES } from '../src/core/sample';
import type { DeviceKind, Lab } from '../src/core/types';

class B {
  lab: Lab = emptyLab('trace');
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
  cli(name: string, lines: string[]) {
    for (const l of lines) {
      const r = executeLine(this.lab, this.ids[name], l);
      if (!r.ok) throw new Error(`${name}: "${l}" rejected: ${r.output.join(' | ')}`);
      this.lab = r.lab;
    }
    return this;
  }
  out(name: string, line: string) {
    return executeLine(this.lab, this.ids[name], line).output;
  }
  trace(from: string, ip: string, max?: number) {
    return trace(this.lab, this.ids[from], ip, max);
  }
  kindOf(id: string | null) {
    return this.lab.devices.find((d) => d.id === id)?.kind;
  }
}

const ios = (lines: string[]) => ['enable', 'configure terminal', ...lines, 'end', 'disable'];
const ifc = (n: string, ip: string, m: string) => [`interface ${n}`, `ip address ${ip} ${m}`, 'no shutdown', 'exit'];
/** compact view of a trace: "ip" for an answer, "ip !N" for net unreachable, "*" for no answer */
const view = (r: TraceResult) => r.hops.map((h) => (h.reply === 'none' ? '*' : h.reply === 'net-unreachable' ? `${h.ip} !N` : h.ip));

/** PC1 - R1 - PC2 (direct cables) */
function pcRouterPc() {
  const b = new B().dev('PC1', 'pc').dev('PC2', 'pc').dev('R1', 'cisco-router');
  b.link('PC1', 'Ethernet0', 'R1', 'GigabitEthernet0/0').link('R1', 'GigabitEthernet0/1', 'PC2', 'Ethernet0');
  b.pc('PC1', '192.168.1.10', '255.255.255.0', '192.168.1.1').pc('PC2', '192.168.2.20', '255.255.255.0', '192.168.2.1');
  return b.cli('R1', ios([...ifc('gi0/0', '192.168.1.1', '255.255.255.0'), ...ifc('gi0/1', '192.168.2.1', '255.255.255.0')]));
}

/** PC1 - SW1 - R1 - SW2 - PC2 */
function viaSwitches(gw1: string | null = '192.168.1.1') {
  const b = new B().dev('PC1', 'pc').dev('PC2', 'pc').dev('SW1', 'cisco-switch').dev('SW2', 'cisco-switch').dev('R1', 'cisco-router');
  b.link('PC1', 'Ethernet0', 'SW1', 'FastEthernet0/1').link('SW1', 'GigabitEthernet0/1', 'R1', 'GigabitEthernet0/0');
  b.link('PC2', 'Ethernet0', 'SW2', 'FastEthernet0/1').link('SW2', 'GigabitEthernet0/1', 'R1', 'GigabitEthernet0/1');
  b.pc('PC1', '192.168.1.10', '255.255.255.0', gw1).pc('PC2', '192.168.2.20', '255.255.255.0', '192.168.2.1');
  return b.cli('R1', ios([...ifc('gi0/0', '192.168.1.1', '255.255.255.0'), ...ifc('gi0/1', '192.168.2.1', '255.255.255.0')]));
}

/** PC1 - R1 - R2 - R3 - PC3 with static routes both ways */
function threeRouters() {
  const b = new B().dev('PC1', 'pc').dev('PC3', 'pc').dev('R1', 'cisco-router').dev('R2', 'cisco-router').dev('R3', 'cisco-router');
  b.link('PC1', 'Ethernet0', 'R1', 'GigabitEthernet0/0').link('R1', 'GigabitEthernet0/1', 'R2', 'GigabitEthernet0/0');
  b.link('R2', 'GigabitEthernet0/1', 'R3', 'GigabitEthernet0/0').link('R3', 'GigabitEthernet0/1', 'PC3', 'Ethernet0');
  b.pc('PC1', '10.1.1.10', '255.255.255.0', '10.1.1.1').pc('PC3', '10.3.3.10', '255.255.255.0', '10.3.3.1');
  b.cli('R1', ios([...ifc('gi0/0', '10.1.1.1', '255.255.255.0'), ...ifc('gi0/1', '10.0.12.1', '255.255.255.252'), 'ip route 0.0.0.0 0.0.0.0 10.0.12.2']));
  b.cli('R2', ios([...ifc('gi0/0', '10.0.12.2', '255.255.255.252'), ...ifc('gi0/1', '10.0.23.1', '255.255.255.252'), 'ip route 10.1.1.0 255.255.255.0 10.0.12.1', 'ip route 10.3.3.0 255.255.255.0 10.0.23.2']));
  return b.cli('R3', ios([...ifc('gi0/0', '10.0.23.2', '255.255.255.252'), ...ifc('gi0/1', '10.3.3.1', '255.255.255.0'), 'ip route 0.0.0.0 0.0.0.0 10.0.23.1']));
}

/** PC1 (VLAN 10) and PC2 (VLAN 20) on one Cisco switch */
function twoVlans(sameSubnet = false) {
  const b = new B().dev('PC1', 'pc').dev('PC2', 'pc').dev('SW1', 'cisco-switch');
  b.link('PC1', 'Ethernet0', 'SW1', 'FastEthernet0/1').link('PC2', 'Ethernet0', 'SW1', 'FastEthernet0/2');
  b.pc('PC1', '192.168.10.10', '255.255.255.0', '192.168.10.1').pc('PC2', sameSubnet ? '192.168.10.20' : '192.168.20.10', '255.255.255.0', '192.168.20.1');
  return b.cli('SW1', ios(['vlan 10', 'vlan 20', 'interface fa0/1', 'switchport access vlan 10', 'interface fa0/2', 'switchport access vlan 20']));
}

/** router-on-a-stick: R1 Gi0/0.10 / .20 on a trunk from SW1 */
function roas() {
  const b = twoVlans().dev('R1', 'cisco-router').link('SW1', 'GigabitEthernet0/1', 'R1', 'GigabitEthernet0/0');
  b.cli('SW1', ios(['interface gi0/1', 'switchport mode trunk']));
  return b.cli('R1', ios(['interface gi0/0', 'no shutdown', 'interface gi0/0.10', 'encapsulation dot1Q 10', 'ip address 192.168.10.1 255.255.255.0', 'interface gi0/0.20', 'encapsulation dot1Q 20', 'ip address 192.168.20.1 255.255.255.0']));
}

/** Aruba CX L3 switch routing between VLAN 10 and 20 SVIs */
function arubaL3() {
  const b = new B().dev('PC1', 'pc').dev('PC2', 'pc').dev('DSW', 'l3-switch');
  b.link('PC1', 'Ethernet0', 'DSW', '1/1/1').link('PC2', 'Ethernet0', 'DSW', '1/1/2');
  b.pc('PC1', '192.168.10.10', '255.255.255.0', '192.168.10.1').pc('PC2', '192.168.20.10', '255.255.255.0', '192.168.20.1');
  return b.cli('DSW', [
    'configure terminal', 'vlan 10', 'exit', 'vlan 20', 'exit',
    'interface 1/1/1', 'no shutdown', 'no routing', 'vlan access 10', 'exit',
    'interface 1/1/2', 'no shutdown', 'no routing', 'vlan access 20', 'exit',
    'interface vlan 10', 'ip address 192.168.10.1/24', 'exit', 'interface vlan 20', 'ip address 192.168.20.1/24', 'end',
  ]);
}

describe('R-01 required scenarios', () => {
  it('1. PC → Router → PC: gateway, then the destination', () => {
    const b = pcRouterPc();
    const r = b.trace('PC1', '192.168.2.20');
    expect(view(r)).toEqual(['192.168.1.1', '192.168.2.20']);
    expect(r.end).toBe('reached');
    expect(b.kindOf(r.hops[0].deviceId)).toBe('cisco-router');
  });

  it('2. PC → Switch → Router → PC: the L2 switches are not hops', () => {
    const b = viaSwitches();
    const r = b.trace('PC1', '192.168.2.20');
    expect(view(r)).toEqual(['192.168.1.1', '192.168.2.20']);
    expect(r.hops.map((h) => b.kindOf(h.deviceId))).not.toContain('cisco-switch');
    // ping's path does go through both switches — the trace is not the device path
    expect(ping(b.lab, b.ids.PC1, '192.168.2.20').forwardPath.map((id) => b.kindOf(id))).toContain('cisco-switch');
  });

  it('3. PC → three routers → PC: every router in order, addressed from its interface towards the source', () => {
    const r = threeRouters().trace('PC1', '10.3.3.10');
    expect(view(r)).toEqual(['10.1.1.1', '10.0.12.2', '10.0.23.2', '10.3.3.10']);
    expect(r.end).toBe('reached');
    expect(r.loop).toBe(false);
  });

  it('4. PC → Aruba L3 switch → PC: the routing Aruba switch is one hop', () => {
    const b = arubaL3();
    const r = b.trace('PC1', '192.168.20.10');
    expect(view(r)).toEqual(['192.168.10.1', '192.168.20.10']);
    expect(b.kindOf(r.hops[0].deviceId)).toBe('l3-switch');
  });

  it('4b. an Aruba switch that only bridges (even with an SVI in the same VLAN) is NOT a hop', () => {
    // PC1 - DSW (VLAN 10 access, SVI 192.168.10.2) - R1 (gateway 192.168.10.1) - PC3
    const b = new B().dev('PC1', 'pc').dev('PC3', 'pc').dev('DSW', 'l3-switch').dev('R1', 'cisco-router');
    b.link('PC1', 'Ethernet0', 'DSW', '1/1/1').link('DSW', '1/1/3', 'R1', 'GigabitEthernet0/0').link('R1', 'GigabitEthernet0/1', 'PC3', 'Ethernet0');
    b.pc('PC1', '192.168.10.10', '255.255.255.0', '192.168.10.1').pc('PC3', '192.168.30.10', '255.255.255.0', '192.168.30.1');
    b.cli('DSW', ['configure terminal', 'vlan 10', 'exit', 'interface 1/1/1-1/1/3', 'no shutdown', 'no routing', 'vlan access 10', 'exit', 'interface vlan 10', 'ip address 192.168.10.2/24', 'end']);
    b.cli('R1', ios([...ifc('gi0/0', '192.168.10.1', '255.255.255.0'), ...ifc('gi0/1', '192.168.30.1', '255.255.255.0')]));
    const r = b.trace('PC1', '192.168.30.10');
    expect(view(r)).toEqual(['192.168.10.1', '192.168.30.10']);
    expect(r.hops.map((h) => h.deviceId)).not.toContain(b.ids.DSW);
    expect(ping(b.lab, b.ids.PC1, '192.168.30.10').forwardPath).toContain(b.ids.DSW);
  });

  it('5. same subnet: one hop, the destination itself', () => {
    const b = twoVlans();
    b.cli('SW1', ios(['interface fa0/2', 'switchport access vlan 10']));
    b.pc('PC2', '192.168.10.20', '255.255.255.0', '192.168.10.1');
    expect(view(b.trace('PC1', '192.168.10.20'))).toEqual(['192.168.10.20']);
  });

  it('6. different VLANs without routing: nothing leaves the source (gateway unreachable), like ping', () => {
    const b = twoVlans();
    const r = b.trace('PC1', '192.168.20.10');
    expect(r.local).toBe('host-unreachable');
    expect(r.end).toBe('local-failure');
    expect(ping(b.lab, b.ids.PC1, '192.168.20.10').ok).toBe(false);
    // same subnet, different VLAN: still isolated
    const s = twoVlans(true).trace('PC1', '192.168.10.20');
    expect(s.local).toBe('host-unreachable');
    expect(b.out('PC1', 'tracert 192.168.20.10')).toContain('  1  192.168.10.10  reports: Destination host unreachable.');
  });

  it('7. inter-VLAN routing (router-on-a-stick): the sub-interface is the hop', () => {
    const r = roas().trace('PC1', '192.168.20.10');
    expect(view(r)).toEqual(['192.168.10.1', '192.168.20.10']);
  });

  it('8. missing default gateway: General failure, like ping', () => {
    const b = viaSwitches(null);
    const r = b.trace('PC1', '192.168.2.20');
    expect(r.local).toBe('general-failure');
    expect(ping(b.lab, b.ids.PC1, '192.168.2.20').kind).toBe('general-failure');
    expect(b.out('PC1', 'tracert 192.168.2.20')).toContain('  1  General failure.');
  });

  it('9. missing static route: the router without the route answers !N and the trace stops', () => {
    const b = threeRouters().cli('R2', ios(['no ip route 10.3.3.0 255.255.255.0 10.0.23.2']));
    const r = b.trace('PC1', '10.3.3.10');
    expect(view(r)).toEqual(['10.1.1.1', '10.0.12.2 !N']);
    expect(r.end).toBe('net-unreachable');
    expect(b.out('PC1', 'tracert 10.3.3.10')).toContain('  2  10.0.12.2  reports: Destination net unreachable.');
    expect(b.out('R1', 'traceroute 10.3.3.10')).toContain('  1 10.0.12.2 !N  !N  !N');
  });

  it('9b. a source router with no route at all: no answers until the hop limit', () => {
    const b = threeRouters().cli('R1', ios(['no ip route 0.0.0.0 0.0.0.0 10.0.12.2']));
    const r = b.trace('R1', '10.3.3.10');
    expect(r.hops).toHaveLength(30);
    expect(r.hops.every((h) => h.reply === 'none')).toBe(true);
  });

  it('10. shutdown router interface: the router lost its connected route → !N from the gateway', () => {
    const b = viaSwitches().cli('R1', ios(['interface gi0/1', 'shutdown']));
    expect(view(b.trace('PC1', '192.168.2.20'))).toEqual(['192.168.1.1 !N']);
    // the gateway interface itself shut down: nothing leaves PC1
    const c = viaSwitches().cli('R1', ios(['interface gi0/0', 'shutdown']));
    expect(c.trace('PC1', '192.168.2.20').local).toBe('host-unreachable');
  });

  it('11. disconnected link: between R2 and R3 → R2 has no usable route → !N at hop 2', () => {
    const b = threeRouters().unlink('R2', 'GigabitEthernet0/1');
    expect(view(b.trace('PC1', '10.3.3.10'))).toEqual(['10.1.1.1', '10.0.12.2 !N']);
  });

  it('12. routing loop: R1 and R2 alternate until the hop limit; bounded', () => {
    const b = threeRouters().cli('R2', ios(['no ip route 10.3.3.0 255.255.255.0 10.0.23.2', 'ip route 10.3.3.0 255.255.255.0 10.0.12.1']));
    const r = b.trace('PC1', '10.3.3.10');
    expect(r.loop).toBe(true);
    expect(r.end).toBe('max-ttl');
    expect(r.hops).toHaveLength(30);
    expect(view(r).slice(0, 4)).toEqual(['10.1.1.1', '10.0.12.2', '10.1.1.1', '10.0.12.2']);
    expect(ping(b.lab, b.ids.PC1, '10.3.3.10').kind).toBe('timeout'); // ping unchanged
  });

  it('13. unreachable destination: routers answer, then no answer until the hop limit', () => {
    const b = threeRouters();
    // unused address in a routed subnet: R3 cannot resolve it
    const r = b.trace('PC1', '10.3.3.99');
    expect(view(r).slice(0, 4)).toEqual(['10.1.1.1', '10.0.12.2', '10.0.23.2', '*']);
    expect(r.hops).toHaveLength(30);
    expect(r.end).toBe('max-ttl');
    // unused address in the local subnet: ARP fails on the source
    expect(b.trace('PC1', '10.1.1.99').local).toBe('host-unreachable');
    // broken return path at R3: hops before it still answer, R3 and the destination cannot answer back
    const c = threeRouters().cli('R3', ios(['no ip route 0.0.0.0 0.0.0.0 10.0.23.1']));
    expect(view(c.trace('PC1', '10.3.3.10')).slice(0, 4)).toEqual(['10.1.1.1', '10.0.12.2', '*', '*']);
  });

  it('14. maximum hop limit: never more lines than the limit; CLI options validated', () => {
    const b = threeRouters();
    const r = b.trace('PC1', '10.3.3.10', 2);
    expect(view(r)).toEqual(['10.1.1.1', '10.0.12.2']);
    expect(r.end).toBe('max-ttl');
    expect(b.trace('PC1', '10.3.3.10', 4).end).toBe('reached'); // exactly enough
    const out = b.out('PC1', 'tracert -h 2 10.3.3.10');
    expect(out).toContain('Tracing route to 10.3.3.10 over a maximum of 2 hops');
    expect(out.filter((l) => /^\s+\d+\s/.test(l))).toHaveLength(2);
    expect(b.out('PC1', 'tracert -h 0 10.3.3.10')).toEqual(['Bad value for option -h, valid range is from 1 to 255.']);
    expect(b.out('PC1', 'tracert -h 256 10.3.3.10')).toEqual(['Bad value for option -h, valid range is from 1 to 255.']);
    const a = arubaL3();
    expect(a.out('DSW', 'traceroute 192.168.20.10 maxttl 1').filter((l) => /^\s+\d+\s/.test(l))).toHaveLength(1);
    expect(executeLine(a.lab, a.ids.DSW, 'traceroute 192.168.20.10 maxttl 0').ok).toBe(false);
  });
});

describe('R-01 CLI output', () => {
  it('PC tracert: Windows layout without time columns', () => {
    const out = threeRouters().out('PC1', 'tracert 10.3.3.10');
    expect(out).toEqual(['', 'Tracing route to 10.3.3.10 over a maximum of 30 hops', '', '  1  10.1.1.1', '  2  10.0.12.2', '  3  10.0.23.2', '  4  10.3.3.10', '', 'Trace complete.']);
  });

  it('PC tracert of an invalid address', () => {
    expect(threeRouters().out('PC1', 'tracert 999.1.1.1')).toEqual(['Unable to resolve target system name 999.1.1.1.']);
  });

  it('Cisco router traceroute', () => {
    const out = threeRouters().out('R1', 'traceroute 10.3.3.10');
    expect(out).toEqual(['Type escape sequence to abort.', 'Tracing the route to 10.3.3.10', 'VRF info: (vrf in name/id, vrf out name/id)', '  1 10.0.12.2', '  2 10.0.23.2', '  3 10.3.3.10']);
  });

  it('Cisco 2960 traceroute through its ip default-gateway', () => {
    const b = viaSwitches().cli('SW1', ios(['interface vlan 1', 'ip address 192.168.1.2 255.255.255.0', 'no shutdown', 'exit', 'ip default-gateway 192.168.1.1']));
    expect(view(b.trace('SW1', '192.168.2.20'))).toEqual(['192.168.1.1', '192.168.2.20']);
    expect(b.out('SW1', 'traceroute 192.168.2.20')).toContain('  1 192.168.1.1');
  });

  it('Aruba AOS-CX traceroute', () => {
    const out = arubaL3().out('DSW', 'traceroute 192.168.20.10');
    expect(out).toEqual(['traceroute to 192.168.20.10 (192.168.20.10), 1 hops min, 30 hops max, 3 sec. timeout, 3 probes', '  1   192.168.20.10']);
  });

  it('timeouts print as * lines', () => {
    const out = threeRouters().out('PC1', 'tracert -h 5 10.3.3.99');
    expect(out).toContain('  4     *        *        *     Request timed out.');
  });

  it('traceroute is read-only: the Lab does not change', () => {
    const b = threeRouters();
    const r = executeLine(b.lab, b.ids.R1, 'traceroute 10.3.3.10');
    const strip = (l: Lab) => JSON.stringify(l.devices.map((d) => ({ ...d, cli: { ...d.cli, history: [] } })));
    expect(strip(r.lab)).toBe(strip(b.lab));
  });
});

describe('R-01 invariants on every sample lab', () => {
  const samples = Object.values(SAMPLES).map((s) => s.build());

  it('15. ping is unchanged and agrees with trace: reached ⇔ ping ok; hops are forwarding devices on ping’s path, in order', () => {
    let pairs = 0;
    for (const lab of samples) {
      const srcs = lab.devices.filter((d) => PROFILES[d.kind].hasCli);
      const ips = lab.devices.flatMap((d) => d.ifaces.map((i) => i.ip).filter((x): x is string => !!x));
      for (const s of srcs)
        for (const ip of ips) {
          const p = ping(lab, s.id, ip);
          const t = trace(lab, s.id, ip);
          pairs++;
          expect(t.end === 'reached', `${lab.name}: ${s.name} → ${ip}`).toBe(p.ok);
          const hopIds = t.hops.filter((h) => h.deviceId && h.reply !== 'dest').map((h) => h.deviceId!);
          // every answering hop is a device that can forward, never an L2-only switch or a host
          for (const id of hopIds) expect(PROFILES[lab.devices.find((d) => d.id === id)!.kind].canForward).toBe(true);
          // and the hops appear in ping's forward path in the same order (when the walk was not cut short by the hop limit)
          if (!t.loop) {
            let at = 0;
            for (const id of hopIds) {
              const k = p.forwardPath.indexOf(id, at);
              expect(k, `${s.name} → ${ip}: hop ${id} not on ping path`).toBeGreaterThanOrEqual(0);
              at = k;
            }
          }
          expect(t.hops.length).toBeLessThanOrEqual(30);
        }
    }
    expect(pairs).toBeGreaterThan(100);
  });

  it('old Lab files (export → import) trace the same', () => {
    for (const lab of samples) {
      const re = parseImport(serializeExport(lab));
      expect(re.ok).toBe(true);
      if (!re.ok) continue;
      const pc = lab.devices.find((d) => d.kind === 'pc')!;
      for (const d of lab.devices) {
        const ip = d.ifaces.find((i) => i.ip)?.ip;
        if (ip) expect(trace(re.lab, pc.id, ip)).toEqual(trace(lab, pc.id, ip));
      }
    }
  });
});
