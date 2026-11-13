/**
 * CERT-Q3: route selection on a router — longest prefix match and /32 host routes.
 * Certification: CCNA 200-301 v1.1 3.2.a (longest prefix match), 3.3.c (host route); v2.0 3.2.c; Network+ N10-009 2.1 (route
 * selection: prefix length).
 *
 * Everything runs through the real engine: the topology is configured with the IOS CLI (executeLine) and the decision is
 * observed with trace() / ping() and `show ip route`, never by calling the route selection directly or by mocking output.
 * Expected forwarding follows Cisco IOS: the longest matching prefix wins regardless of configuration order; a static route
 * whose next hop is not on an up/up connected subnet is not installed, so a less specific route is used instead.
 *
 *            PC1 10.1.1.10/24
 *             |
 *     Gi0/0 10.1.1.1 R1 Gi0/1 10.0.12.1/30 ── 10.0.12.2/30 Gi0/0 R2 Gi0/1 172.16.5.1/24 ──┐
 *                       Gi0/2 10.0.13.1/30 ── 10.0.13.2/30 Gi0/0 R3 Gi0/1 172.16.5.3/24 ──┤ SW (172.16.5.0/24): PC-A .10, PC-C .20
 *                                                                  R3 Gi0/2 172.16.9.1/24 ── PC-B 172.16.9.10
 *   R1: 172.16.0.0/16 via R3 (10.0.13.2) and 172.16.5.0/24 via R2 (10.0.12.2); R2 and R3: default route back to R1.
 */
import { describe, expect, it } from 'vitest';
import { executeLine } from '../src/core/cli/engine';
import { addDevice, addLink, emptyLab } from '../src/core/lab';
import { ping, trace, type TraceResult } from '../src/core/network';
import { parseImport, serializeExport } from '../src/core/persist';
import type { DeviceKind, Lab } from '../src/core/types';

class B {
  lab: Lab = emptyLab('route-selection');
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
  setHost(name: string, ip: string, gw: string) {
    this.lab = {
      ...this.lab,
      devices: this.lab.devices.map((d) => (d.id === this.ids[name] ? { ...d, gateway: gw, ifaces: d.ifaces.map((i) => ({ ...i, ip, mask: '255.255.255.0' })) } : d)),
    };
    return this;
  }
  /** runs IOS lines from privileged config mode and fails the test on any rejected line */
  cli(name: string, lines: string[]) {
    return this.cliRaw(name, ['enable', 'configure terminal', ...lines, 'end', 'disable']);
  }
  cliRaw(name: string, lines: string[]) {
    for (const l of lines) {
      const r = executeLine(this.lab, this.ids[name], l);
      if (!r.ok) throw new Error(`${name}: "${l}" rejected: ${r.output.join(' | ')}`);
      this.lab = r.lab;
    }
    return this;
  }
  /** runs one line and returns the whole result (for commands that are expected to be rejected) */
  try(name: string, lines: string[]) {
    let last = executeLine(this.lab, this.ids[name], lines[0]);
    for (const l of lines) {
      last = executeLine(this.lab, this.ids[name], l);
      this.lab = last.lab;
    }
    return last;
  }
  /** output of one command run from privileged EXEC (enable … disable), without changing the configuration */
  show(name: string, line: string) {
    const en = executeLine(this.lab, this.ids[name], 'enable');
    const r = executeLine(en.lab, this.ids[name], line);
    if (!r.ok) throw new Error(`${name}: "${line}" rejected: ${r.output.join(' | ')}`);
    return r.output;
  }
}

const ifc = (n: string, ip: string, m: string) => [`interface ${n}`, `ip address ${ip} ${m}`, 'no shutdown', 'exit'];
/** compact view of a trace: the address that answered each probe ("*" for none, "ip !N" for net unreachable) */
const hops = (r: TraceResult) => r.hops.map((h) => (h.reply === 'none' ? '*' : h.reply === 'net-unreachable' ? `${h.ip} !N` : h.ip));

/** the diamond above; `r1Routes` are the static routes configured on R1, in the given order */
function diamond(r1Routes: string[]) {
  const b = new B()
    .dev('PC1', 'pc').dev('PCA', 'pc').dev('PCC', 'pc').dev('PCB', 'pc')
    .dev('R1', 'cisco-router').dev('R2', 'cisco-router').dev('R3', 'cisco-router').dev('SW', 'cisco-switch');
  b.link('PC1', 'Ethernet0', 'R1', 'GigabitEthernet0/0');
  b.link('R1', 'GigabitEthernet0/1', 'R2', 'GigabitEthernet0/0').link('R1', 'GigabitEthernet0/2', 'R3', 'GigabitEthernet0/0');
  b.link('R2', 'GigabitEthernet0/1', 'SW', 'FastEthernet0/1').link('R3', 'GigabitEthernet0/1', 'SW', 'FastEthernet0/2');
  b.link('PCA', 'Ethernet0', 'SW', 'FastEthernet0/3').link('PCC', 'Ethernet0', 'SW', 'FastEthernet0/4');
  b.link('R3', 'GigabitEthernet0/2', 'PCB', 'Ethernet0');
  b.setHost('PC1', '10.1.1.10', '10.1.1.1').setHost('PCA', '172.16.5.10', '172.16.5.1').setHost('PCC', '172.16.5.20', '172.16.5.1').setHost('PCB', '172.16.9.10', '172.16.9.1');
  b.cli('R1', [...ifc('gi0/0', '10.1.1.1', '255.255.255.0'), ...ifc('gi0/1', '10.0.12.1', '255.255.255.252'), ...ifc('gi0/2', '10.0.13.1', '255.255.255.252'), ...r1Routes]);
  b.cli('R2', [...ifc('gi0/0', '10.0.12.2', '255.255.255.252'), ...ifc('gi0/1', '172.16.5.1', '255.255.255.0'), 'ip route 0.0.0.0 0.0.0.0 10.0.12.1']);
  b.cli('R3', [...ifc('gi0/0', '10.0.13.2', '255.255.255.252'), ...ifc('gi0/1', '172.16.5.3', '255.255.255.0'), ...ifc('gi0/2', '172.16.9.1', '255.255.255.0'), 'ip route 0.0.0.0 0.0.0.0 10.0.13.1']);
  return b;
}
const SLASH16_VIA_R3 = 'ip route 172.16.0.0 255.255.0.0 10.0.13.2';
const SLASH24_VIA_R2 = 'ip route 172.16.5.0 255.255.255.0 10.0.12.2';

describe('CERT-Q3 A — longest prefix match (CCNA 3.2.a · N+ 2.1)', () => {
  it('the /24 wins over the /16 for a destination both cover, whatever order they were configured in', () => {
    for (const order of [[SLASH16_VIA_R3, SLASH24_VIA_R2], [SLASH24_VIA_R2, SLASH16_VIA_R3]]) {
      const b = diamond(order);
      // 172.16.5.20 matches both 172.16.0.0/16 (via R3) and 172.16.5.0/24 (via R2) → R2, the more specific route
      expect(hops(trace(b.lab, b.ids.PC1, '172.16.5.20')), order.join(' / ')).toEqual(['10.1.1.1', '10.0.12.2', '172.16.5.20']);
      expect(ping(b.lab, b.ids.PC1, '172.16.5.20').ok).toBe(true);
    }
  });

  it('a destination only the /16 covers follows the /16', () => {
    const b = diamond([SLASH16_VIA_R3, SLASH24_VIA_R2]);
    expect(hops(trace(b.lab, b.ids.PC1, '172.16.9.10'))).toEqual(['10.1.1.1', '10.0.13.2', '172.16.9.10']);
    expect(ping(b.lab, b.ids.PC1, '172.16.9.10').ok).toBe(true);
  });

  it('with three overlapping routes (/0, /16, /24) each destination takes its longest match', () => {
    const b = diamond([SLASH16_VIA_R3, SLASH24_VIA_R2, 'ip route 0.0.0.0 0.0.0.0 10.0.13.2']);
    expect(hops(trace(b.lab, b.ids.PC1, '172.16.5.20'))[1]).toBe('10.0.12.2'); // /24
    expect(hops(trace(b.lab, b.ids.PC1, '172.16.9.10'))[1]).toBe('10.0.13.2'); // /16
    // 192.168.99.1 matches only the default route: R1 sends it to R3, whose own default points back to R1 → a loop, which
    // shows that the default route really was chosen for it (and that a loop is reported, not hidden)
    const t = trace(b.lab, b.ids.PC1, '192.168.99.1', 6);
    expect(hops(t).slice(0, 3)).toEqual(['10.1.1.1', '10.0.13.2', '10.1.1.1']);
    expect(t.loop).toBe(true);
  });

  it('a static route more specific than a connected subnet wins over the connected route (prefix length before route source)', () => {
    // 10.1.1.0/25 via R2 is longer than the connected 10.1.1.0/24 on Gi0/0, so R1 sends 10.1.1.10 to R2 (as IOS would);
    // 10.1.1.200 is outside the /25 and is still delivered on the connected subnet
    const b = diamond([SLASH24_VIA_R2, 'ip route 10.1.1.0 255.255.255.128 10.0.12.2']);
    const fromR2 = trace(b.lab, b.ids.PCA, '10.1.1.10');
    // hop 1 = R2 (answers from its LAN side), hop 2 = R1, hop 3 = R2 again: R1 sent the packet back because of the /25
    expect(hops(fromR2).slice(0, 4)).toEqual(['172.16.5.1', '10.0.12.1', '172.16.5.1', '10.0.12.1']);
    expect(fromR2.loop).toBe(true);
    const r1ToHost = ping(b.lab, b.ids.R1, '10.1.1.10');
    expect(r1ToHost.ok).toBe(false);
    expect(ping(b.lab, b.ids.R1, '10.1.1.1').ok).toBe(true); // own address: unaffected
  });

  it('a connected route beats a static route of the same prefix length', () => {
    const b = diamond([SLASH24_VIA_R2, 'ip route 10.1.1.0 255.255.255.0 10.0.12.2']);
    // same /24 as R1's Gi0/0: the connected route is used, the static one never takes PC1's traffic
    expect(hops(trace(b.lab, b.ids.PCA, '10.1.1.10'))).toEqual(['172.16.5.1', '10.0.12.1', '10.1.1.10']);
    expect(ping(b.lab, b.ids.PCA, '10.1.1.10').ok).toBe(true);
  });

  it('no matching route: R1 answers Destination Net Unreachable and the ping fails', () => {
    const b = diamond([SLASH16_VIA_R3, SLASH24_VIA_R2]);
    const t = trace(b.lab, b.ids.PC1, '192.168.99.1');
    expect(hops(t)).toEqual(['10.1.1.1 !N']);
    expect(t.end).toBe('net-unreachable');
    const p = ping(b.lab, b.ids.PC1, '192.168.99.1');
    expect(p.ok).toBe(false);
    expect(p.kind).toBe('net-unreachable');
    expect(p.icmpFrom).toBe('10.1.1.1');
  });

  it('when the more specific route cannot be installed (next-hop subnet down), the less specific route takes over', () => {
    const b = diamond([SLASH16_VIA_R3, SLASH24_VIA_R2]);
    b.cli('R1', ['interface gi0/1', 'shutdown', 'exit']); // R2's link: 10.0.12.0/30 is no longer up/up on R1
    // PC-C replies through R3 here, so the test isolates R1's forwarding decision (with R2 as its gateway the reply would be
    // lost on the shut link — a correct asymmetric return-path failure, not what this test is about)
    b.setHost('PCC', '172.16.5.20', '172.16.5.3');
    const table = b.show('R1', 'show ip route');
    expect(table.some((l) => /172\.16\.5\.0\/24 \[1\/0\] via 10\.0\.12\.2/.test(l))).toBe(false);
    // the /16 is still installed. (Display note: with no other 172.16.x route left, the router prints it under a
    // "172.16.0.0/16 is subnetted" header as "S 172.16.0.0 [1/0] …" — see CERT_Q3_TEST_REPORT.md, finding F-6.)
    expect(table.some((l) => /^S\s+172\.16\.0\.0(\/16)? \[1\/0\] via 10\.0\.13\.2$/.test(l))).toBe(true);
    // 172.16.5.20 now follows the /16 to R3, which is also on the 172.16.5.0/24 LAN → delivered
    expect(hops(trace(b.lab, b.ids.PC1, '172.16.5.20'))).toEqual(['10.1.1.1', '10.0.13.2', '172.16.5.20']);
    expect(ping(b.lab, b.ids.PC1, '172.16.5.20').ok).toBe(true);
  });

  it('is deterministic: the same Lab gives the same decisions, also after export → import', () => {
    const b = diamond([SLASH16_VIA_R3, SLASH24_VIA_R2, 'ip route 0.0.0.0 0.0.0.0 10.0.13.2']);
    const parsed = parseImport(serializeExport(b.lab));
    if (!parsed.ok) throw new Error(parsed.error);
    for (const dst of ['172.16.5.20', '172.16.9.10', '172.16.5.10']) {
      const a = trace(b.lab, b.ids.PC1, dst);
      expect(trace(b.lab, b.ids.PC1, dst)).toEqual(a);
      expect(trace(parsed.lab, b.ids.PC1, dst)).toEqual(a);
    }
  });
});

describe('CERT-Q3 B — host routes /32 (CCNA 3.3.c)', () => {
  const HOST_VIA_R3 = 'ip route 172.16.5.10 255.255.255.255 10.0.13.2';

  it('a /32 is preferred over the /24 and the /16 for exactly that host; its neighbours keep the /24', () => {
    const b = diamond([SLASH16_VIA_R3, SLASH24_VIA_R2, HOST_VIA_R3]);
    // 172.16.5.10 is matched by /16 (R3), /24 (R2) and /32 (R3) → the /32 → R3, which reaches the LAN directly
    expect(hops(trace(b.lab, b.ids.PC1, '172.16.5.10'))).toEqual(['10.1.1.1', '10.0.13.2', '172.16.5.10']);
    expect(ping(b.lab, b.ids.PC1, '172.16.5.10').ok).toBe(true);
    // 172.16.5.20 and 172.16.5.11 (no host there) are not the /32's destination → /24 → R2
    expect(hops(trace(b.lab, b.ids.PC1, '172.16.5.20'))).toEqual(['10.1.1.1', '10.0.12.2', '172.16.5.20']);
    expect(hops(trace(b.lab, b.ids.PC1, '172.16.5.11')).slice(0, 2)).toEqual(['10.1.1.1', '10.0.12.2']);
    expect(ping(b.lab, b.ids.PC1, '172.16.5.11').ok).toBe(false); // nobody owns .11: the /32 never claims it
  });

  it('show ip route lists the host route as a /32 static entry; running-config keeps it', () => {
    const b = diamond([SLASH16_VIA_R3, SLASH24_VIA_R2, HOST_VIA_R3]);
    const table = b.show('R1', 'show ip route');
    expect(table).toContain('S        172.16.5.10/32 [1/0] via 10.0.13.2');
    expect(table).toContain('S        172.16.5.0/24 [1/0] via 10.0.12.2');
    expect(table).toContain('S        172.16.0.0/16 [1/0] via 10.0.13.2');
    expect(table.some((l) => /172\.16\.0\.0\/16 is variably subnetted, 3 subnets, 3 masks/.test(l))).toBe(true);
    expect(b.show('R1', 'show running-config')).toContain(HOST_VIA_R3);
  });

  it('a host route with an unreachable next hop is configured but not installed: the host falls back to the /24', () => {
    const b = diamond([SLASH16_VIA_R3, SLASH24_VIA_R2, 'ip route 172.16.5.10 255.255.255.255 10.9.9.9']);
    expect(b.show('R1', 'show running-config')).toContain('ip route 172.16.5.10 255.255.255.255 10.9.9.9');
    expect(b.show('R1', 'show ip route').some((l) => l.includes('172.16.5.10/32'))).toBe(false);
    expect(hops(trace(b.lab, b.ids.PC1, '172.16.5.10'))).toEqual(['10.1.1.1', '10.0.12.2', '172.16.5.10']);
  });

  it('a host route whose mask does not match the address, or whose next hop is not an IPv4 address, is rejected and changes nothing', () => {
    const b = diamond([SLASH24_VIA_R2]);
    const before = JSON.stringify(b.lab.devices.find((d) => d.id === b.ids.R1)!.routes);
    const badMask = b.try('R1', ['enable', 'configure terminal', 'ip route 172.16.5.10 255.255.255.0 10.0.13.2']);
    expect(badMask.ok).toBe(false);
    expect(badMask.output.join('\n')).toContain('%Inconsistent address and mask');
    const badNh = b.try('R1', ['ip route 172.16.5.10 255.255.255.255 10.0.13']);
    expect(badNh.ok).toBe(false);
    expect(badNh.output.join('\n')).toContain('% Invalid input detected');
    expect(JSON.stringify(b.lab.devices.find((d) => d.id === b.ids.R1)!.routes)).toBe(before);
  });
});
