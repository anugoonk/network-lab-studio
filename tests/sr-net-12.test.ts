/**
 * SR-NET-12 (owner decision OD-2026-11-23-SR-NET-12): exit-interface static routes and recursive next-hop resolution,
 * Cisco IOS + Aruba AOS-CX. Source: NETWORK_LAB_REMEDIATION_PLAN.md R-04 / R-05.
 *
 * Everything runs through the real engine: topologies are configured with the vendor CLI (executeLine), and the behaviour is
 * observed with ping() / trace() / `show ip route` / `show running-config`, never by mocking forwarding.
 * Approved decisions under test: optional `iface` on StaticRoute; saved Labs without it load unchanged; recursion depth 8;
 * cycle detection; implicit proxy ARP for exit-interface routes (always on, no configuration, no Inspector change).
 *
 *   PC1 10.1.1.10 ─ R1 ─(10.0.12.0/30)─ R2 ─(10.0.23.0/30)─ R3 ─ PC3 192.168.3.10        R2 Gi0/1 ─ PCA 172.16.5.10 (p2p topology)
 */
import { describe, expect, it } from 'vitest';
import { executeLine } from '../src/core/cli/engine';
import { hasRoute } from '../src/core/challenge';
import { addDevice, addLink, emptyLab } from '../src/core/lab';
import { MAX_ROUTE_LOOKUPS, MAX_ROUTE_RECURSION, ping, resolveStaticRoute, trace } from '../src/core/network';
import { parseImport, serializeExport } from '../src/core/persist';
import type { DeviceKind, Lab, StaticRoute } from '../src/core/types';

class B {
  lab: Lab = emptyLab('sr-net-12');
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
  host(name: string, ip: string, gw: string, mask = '255.255.255.0') {
    this.lab = {
      ...this.lab,
      devices: this.lab.devices.map((d) => (d.id === this.ids[name] ? { ...d, gateway: gw, ifaces: d.ifaces.map((i) => ({ ...i, ip, mask })) } : d)),
    };
    return this;
  }
  /** IOS lines from privileged config mode; a rejected line fails the test */
  cli(name: string, lines: string[]) {
    for (const l of ['enable', 'configure terminal', ...lines, 'end', 'disable']) {
      const r = executeLine(this.lab, this.ids[name], l);
      if (!r.ok) throw new Error(`${name}: "${l}" rejected: ${r.output.join(' | ')}`);
      this.lab = r.lab;
    }
    return this;
  }
  /** AOS-CX lines (the user is already in the manager context) */
  cx(name: string, lines: string[]) {
    for (const l of ['configure terminal', ...lines, 'end']) {
      const r = executeLine(this.lab, this.ids[name], l);
      if (!r.ok) throw new Error(`${name}: "${l}" rejected: ${r.output.join(' | ')}`);
      this.lab = r.lab;
    }
    return this;
  }
  /** runs lines from privileged config mode and returns the result of the LAST one (may be a rejection); state is kept */
  tryIos(name: string, lines: string[]) {
    let last = executeLine(this.lab, this.ids[name], 'enable');
    this.lab = last.lab;
    for (const l of ['configure terminal', ...lines]) {
      last = executeLine(this.lab, this.ids[name], l);
      this.lab = last.lab;
    }
    return last;
  }
  show(name: string, line: string) {
    const en = executeLine(this.lab, this.ids[name], 'enable');
    const r = executeLine(en.lab, this.ids[name], line);
    if (!r.ok) throw new Error(`${name}: "${line}" rejected: ${r.output.join(' | ')}`);
    return r.output;
  }
  showCx(name: string, line: string) {
    const r = executeLine(this.lab, this.ids[name], line);
    if (!r.ok) throw new Error(`${name}: "${line}" rejected: ${r.output.join(' | ')}`);
    return r.output;
  }
  dv(name: string) {
    return this.lab.devices.find((d) => d.id === this.ids[name])!;
  }
  ping(from: string, ip: string) {
    return ping(this.lab, this.ids[from], ip);
  }
}

const ifc = (n: string, ip: string, m: string) => [`interface ${n}`, `ip address ${ip} ${m}`, 'no shutdown', 'exit'];

/** PC1 — R1 — R2 — PCA; R1 reaches 172.16.5.0/24 only through the routes given */
function p2p(r1Routes: string[]) {
  const b = new B().dev('PC1', 'pc').dev('PCA', 'pc').dev('R1', 'cisco-router').dev('R2', 'cisco-router');
  b.link('PC1', 'Ethernet0', 'R1', 'GigabitEthernet0/0').link('R1', 'GigabitEthernet0/1', 'R2', 'GigabitEthernet0/0').link('R2', 'GigabitEthernet0/1', 'PCA', 'Ethernet0');
  b.host('PC1', '10.1.1.10', '10.1.1.1').host('PCA', '172.16.5.10', '172.16.5.1');
  b.cli('R1', [...ifc('gi0/0', '10.1.1.1', '255.255.255.0'), ...ifc('gi0/1', '10.0.12.1', '255.255.255.252'), ...r1Routes]);
  b.cli('R2', [...ifc('gi0/0', '10.0.12.2', '255.255.255.252'), ...ifc('gi0/1', '172.16.5.1', '255.255.255.0'), 'ip route 10.1.1.0 255.255.255.0 10.0.12.1']);
  return b;
}

/** PC1 — R1 — R2 — R3 — PC3; R2 and R3 know the way both ways; R1 gets `r1Routes` */
function chain3(r1Routes: string[]) {
  const b = new B().dev('PC1', 'pc').dev('PC3', 'pc').dev('R1', 'cisco-router').dev('R2', 'cisco-router').dev('R3', 'cisco-router');
  b.link('PC1', 'Ethernet0', 'R1', 'GigabitEthernet0/0').link('R1', 'GigabitEthernet0/1', 'R2', 'GigabitEthernet0/0');
  b.link('R2', 'GigabitEthernet0/1', 'R3', 'GigabitEthernet0/0').link('R3', 'GigabitEthernet0/1', 'PC3', 'Ethernet0');
  b.host('PC1', '10.1.1.10', '10.1.1.1').host('PC3', '192.168.3.10', '192.168.3.1');
  b.cli('R1', [...ifc('gi0/0', '10.1.1.1', '255.255.255.0'), ...ifc('gi0/1', '10.0.12.1', '255.255.255.252'), ...r1Routes]);
  b.cli('R2', [...ifc('gi0/0', '10.0.12.2', '255.255.255.252'), ...ifc('gi0/1', '10.0.23.1', '255.255.255.252'), 'ip route 10.1.1.0 255.255.255.0 10.0.12.1', 'ip route 192.168.3.0 255.255.255.0 10.0.23.2']);
  b.cli('R3', [...ifc('gi0/0', '10.0.23.2', '255.255.255.252'), ...ifc('gi0/1', '192.168.3.1', '255.255.255.0'), 'ip route 10.1.1.0 255.255.255.0 10.0.23.1', 'ip route 10.0.12.0 255.255.255.252 10.0.23.1']);
  return b;
}

/** dotted mask of a prefix length */
const maskOf = (p: number) => [0, 8, 16, 24].map((o) => 256 - 2 ** (8 - Math.min(8, Math.max(0, p - o)))).join('.');
const R1_RECURSIVE = ['ip route 10.0.23.0 255.255.255.252 10.0.12.2', 'ip route 192.168.3.0 255.255.255.0 10.0.23.2'];
/** the S / S* rows of show ip route as "S <net> <tail>" (the /len is printed in a classful header or per row depending on the group, so it is dropped) */
const routeLines = (out: string[]) => out.filter((l) => /^S\*?\s/.test(l)).map((l) => l.replace(/^(S\*?)\s+(\d+\.\d+\.\d+\.\d+)(\/\d+)?\s+/, '$1 $2 '));
/** AOS-CX: rows of show ip route whose origin is S */
const cxStatic = (out: string[]) => out.filter((l) => /^\d+\.\d+\.\d+\.\d+\/\d+\s/.test(l) && /\sS\s/.test(l));

// ═══════════════════════════ R-04 exit-interface routes ═══════════════════════════

describe('SR-NET-12 R-04 — exit-interface static routes (Cisco IOS)', () => {
  const EXIT = 'ip route 172.16.5.0 255.255.255.0 GigabitEthernet0/1';

  it('the CLI accepts the exit-interface form (full and abbreviated names), stores iface without a next hop, and shows it in running-config', () => {
    for (const name of ['GigabitEthernet0/1', 'gi0/1', 'Gi0/1']) {
      const b = p2p([`ip route 172.16.5.0 255.255.255.0 ${name}`]);
      expect(b.dv('R1').routes).toEqual([{ net: '172.16.5.0', mask: '255.255.255.0', iface: 'GigabitEthernet0/1' }]);
      expect(b.show('R1', 'show running-config').join('\n')).toContain('ip route 172.16.5.0 255.255.255.0 GigabitEthernet0/1\n');
    }
  });

  it('show ip route lists it as directly connected through the interface while the interface is up/up', () => {
    const b = p2p([EXIT]);
    expect(routeLines(b.show('R1', 'show ip route'))).toEqual(['S 172.16.5.0 is directly connected, GigabitEthernet0/1']);
  });

  it('traffic really flows: the neighbouring router answers ARP for the destination (implicit proxy ARP) and the ping succeeds', () => {
    const b = p2p([EXIT]);
    const p = b.ping('PC1', '172.16.5.10');
    expect(p.ok, p.explanation.join(' | ')).toBe(true);
    const t = trace(b.lab, b.ids.PC1, '172.16.5.10');
    expect(t.end).toBe('reached');
    expect(t.hops.filter((h) => h.reply !== 'none').map((h) => h.ip)).toEqual(['10.1.1.1', '10.0.12.2', '172.16.5.10']);
    expect(b.ping('R1', '172.16.5.1').ok).toBe(true); // R2's own address behind the link
  });

  it('without the route there is no path (positive control for the test above)', () => {
    const b = p2p([]);
    expect(b.ping('PC1', '172.16.5.10').ok).toBe(false);
    expect(routeLines(b.show('R1', 'show ip route'))).toEqual([]);
  });

  it('the route disappears when the exit interface is shut down, comes back with no shutdown, and is explained while it is gone', () => {
    const b = p2p([EXIT]);
    b.cli('R1', ['interface gi0/1', 'shutdown']);
    expect(routeLines(b.show('R1', 'show ip route'))).toEqual([]);
    const p = b.ping('PC1', '172.16.5.10');
    expect(p.ok).toBe(false);
    expect(p.explanation.join(' ')).toContain('GigabitEthernet0/1');
    expect(hasRoute(b.lab, b.ids.R1, '172.16.5.0', 24)).toBe(false);
    b.cli('R1', ['interface gi0/1', 'no shutdown']);
    expect(routeLines(b.show('R1', 'show ip route'))).toHaveLength(1);
    expect(b.ping('PC1', '172.16.5.10').ok).toBe(true);
  });

  it('the route disappears when the cable is removed (line protocol down) and when the far end shuts down', () => {
    const b = p2p([EXIT]);
    const farDown = p2p([EXIT]);
    farDown.cli('R2', ['interface gi0/0', 'shutdown']);
    expect(routeLines(farDown.show('R1', 'show ip route'))).toEqual([]); // far end down → R1's line protocol down
    expect(farDown.ping('PC1', '172.16.5.10').ok).toBe(false);
    b.lab = { ...b.lab, links: b.lab.links.filter((l) => !(l.a.deviceId === b.ids.R1 && l.a.port === 'GigabitEthernet0/1')) };
    expect(routeLines(b.show('R1', 'show ip route'))).toEqual([]);
    expect(b.ping('PC1', '172.16.5.10').ok).toBe(false);
  });

  it('implicit proxy ARP needs a router that can actually route the destination out of another interface', () => {
    // R2 has no route for 203.0.113.0/24, so nobody answers for 203.0.113.5 on the link
    const b = p2p(['ip route 203.0.113.0 255.255.255.0 GigabitEthernet0/1']);
    const p = b.ping('R1', '203.0.113.5');
    expect(p.ok).toBe(false);
    expect(p.kind).toBe('host-unreachable'); // ARP not answered
    // a router that would have to send the packet back out of the interface it came in on does not answer either
    const loopy = p2p(['ip route 172.16.5.0 255.255.255.0 GigabitEthernet0/1']);
    loopy.cli('R2', ['no ip route 10.1.1.0 255.255.255.0 10.0.12.1', 'ip route 172.16.5.0 255.255.255.0 10.0.12.1', 'interface gi0/1', 'shutdown']);
    const lp = loopy.ping('R1', '172.16.5.10');
    expect(lp.ok).toBe(false);
    expect(lp.kind, 'ARP stays unanswered (host-unreachable), it is not a forwarding loop (timeout)').toBe('host-unreachable');
  });

  it('exit interface AND next hop: stored together, printed as "via <nh>, <iface>", forwarded to that next hop', () => {
    const b = p2p(['ip route 172.16.5.0 255.255.255.0 GigabitEthernet0/1 10.0.12.2']);
    expect(b.dv('R1').routes).toEqual([{ net: '172.16.5.0', mask: '255.255.255.0', iface: 'GigabitEthernet0/1', nextHop: '10.0.12.2' }]);
    expect(routeLines(b.show('R1', 'show ip route'))).toEqual(['S 172.16.5.0 [1/0] via 10.0.12.2, GigabitEthernet0/1']);
    expect(b.show('R1', 'show running-config').join('\n')).toContain('ip route 172.16.5.0 255.255.255.0 GigabitEthernet0/1 10.0.12.2\n');
    expect(b.ping('PC1', '172.16.5.10').ok).toBe(true);
    b.cli('R1', ['interface gi0/1', 'shutdown']);
    expect(routeLines(b.show('R1', 'show ip route'))).toEqual([]);
  });

  it('an exit-interface default route is "0.0.0.0 to network 0.0.0.0" and S*; it carries traffic', () => {
    const b = p2p(['ip route 0.0.0.0 0.0.0.0 GigabitEthernet0/1']);
    const out = b.show('R1', 'show ip route');
    expect(out).toContain('Gateway of last resort is 0.0.0.0 to network 0.0.0.0');
    expect(routeLines(out)).toEqual(['S* 0.0.0.0 is directly connected, GigabitEthernet0/1']);
    expect(b.ping('PC1', '172.16.5.10').ok).toBe(true);
  });

  it('prefix length still decides: a more specific exit-interface route beats a default route through another path', () => {
    const b = p2p(['ip route 0.0.0.0 0.0.0.0 10.0.12.99', EXIT]); // the default goes nowhere (no such next hop owner)
    expect(b.ping('PC1', '172.16.5.10').ok).toBe(true);
    expect(b.ping('PC1', '8.8.8.8').ok).toBe(false);
  });

  it('`no ip route` removes exactly the matching form; a wrong form or interface is rejected and changes nothing', () => {
    const b = p2p([EXIT]);
    const wrong = b.tryIos('R1', ['no ip route 172.16.5.0 255.255.255.0 GigabitEthernet0/2']);
    expect(wrong.ok).toBe(false);
    expect(wrong.output.join(' ')).toContain('No matching route');
    expect(b.tryIos('R1', ['no ip route 172.16.5.0 255.255.255.0 10.0.12.2']).ok).toBe(false); // next-hop form does not match an iface route
    expect(b.dv('R1').routes).toHaveLength(1);
    expect(b.tryIos('R1', ['no ip route 172.16.5.0 255.255.255.0 GigabitEthernet0/1']).ok).toBe(true);
    expect(b.dv('R1').routes).toHaveLength(0);
    const both = p2p(['ip route 172.16.5.0 255.255.255.0 GigabitEthernet0/1 10.0.12.2']);
    expect(both.tryIos('R1', ['no ip route 172.16.5.0 255.255.255.0 GigabitEthernet0/1']).ok).toBe(false);
    expect(both.tryIos('R1', ['no ip route 172.16.5.0 255.255.255.0 GigabitEthernet0/1 10.0.12.2']).ok).toBe(true);
    expect(both.dv('R1').routes).toHaveLength(0);
  });

  it('one route per prefix: configuring the same prefix in another form replaces the old one', () => {
    const b = p2p([EXIT, 'ip route 172.16.5.0 255.255.255.0 10.0.12.2']);
    expect(b.dv('R1').routes).toEqual([{ net: '172.16.5.0', mask: '255.255.255.0', nextHop: '10.0.12.2' }]);
    b.cli('R1', [EXIT]);
    expect(b.dv('R1').routes).toEqual([{ net: '172.16.5.0', mask: '255.255.255.0', iface: 'GigabitEthernet0/1' }]);
  });

  it('invalid input is rejected without touching the Lab: unknown interface, host bits set, bad mask, switch device', () => {
    const b = p2p([]);
    const before = JSON.stringify(b.dv('R1').routes);
    expect(b.tryIos('R1', ['ip route 172.16.5.0 255.255.255.0 GigabitEthernet0/9']).ok).toBe(false);
    expect(b.tryIos('R1', ['ip route 172.16.5.0 255.255.255.0 Loopback0']).ok).toBe(false);
    const hostBits = b.tryIos('R1', ['ip route 172.16.5.1 255.255.255.0 GigabitEthernet0/1']);
    expect(hostBits.ok).toBe(false);
    expect(hostBits.output.join(' ')).toContain('Inconsistent address and mask');
    expect(b.tryIos('R1', ['ip route 172.16.5.0 255.255.255.7 GigabitEthernet0/1']).ok).toBe(false);
    expect(JSON.stringify(b.dv('R1').routes)).toBe(before);
    const sw = new B().dev('SW', 'cisco-switch');
    expect(sw.tryIos('SW', ['ip route 172.16.5.0 255.255.255.0 FastEthernet0/1']).ok).toBe(false); // L2 switch has no ip route
  });

  it('help shows the interface forms next to the next-hop form', () => {
    const b = p2p([]);
    executeLine(b.lab, b.ids.R1, 'enable');
    const en = executeLine(b.lab, b.ids.R1, 'enable');
    const cfg = executeLine(en.lab, b.ids.R1, 'configure terminal');
    const help = executeLine(cfg.lab, b.ids.R1, 'ip route 172.16.5.0 255.255.255.0 ?').output.join('\n');
    expect(help).toContain('<interface>');
    expect(help).toContain('<next-hop>');
    // after an interface the only continuation is an optional next hop (or Enter)
    const after = executeLine(cfg.lab, b.ids.R1, 'ip route 172.16.5.0 255.255.255.0 gi0/1 ?').output.join('\n');
    expect(after).toContain('<next-hop>');
    expect(after).toContain('<cr>');
    expect(after).not.toContain('<interface>');
  });
});

// ═══════════════════════════ R-05 recursive next hop ═══════════════════════════

describe('SR-NET-12 R-05 — recursive next-hop resolution (Cisco IOS)', () => {
  it('a next hop that is not on a connected subnet resolves through another static route, and traffic follows the resolved path', () => {
    const b = chain3(R1_RECURSIVE);
    expect(routeLines(b.show('R1', 'show ip route'))).toEqual(['S 10.0.23.0 [1/0] via 10.0.12.2', 'S 192.168.3.0 [1/0] via 10.0.23.2']);
    const p = b.ping('PC1', '192.168.3.10');
    expect(p.ok, p.explanation.join(' | ')).toBe(true);
    const t = trace(b.lab, b.ids.PC1, '192.168.3.10');
    expect(t.hops.filter((h) => h.reply !== 'none').map((h) => h.ip)).toEqual(['10.1.1.1', '10.0.12.2', '10.0.23.2', '192.168.3.10']);
    expect(hasRoute(b.lab, b.ids.R1, '192.168.3.0', 24)).toBe(true);
  });

  it('without the route that resolves the next hop the recursive route is not installed (and is explained), and it returns when that route returns', () => {
    const b = chain3(['ip route 192.168.3.0 255.255.255.0 10.0.23.2']);
    expect(routeLines(b.show('R1', 'show ip route'))).toEqual([]);
    const p = b.ping('PC1', '192.168.3.10');
    expect(p.ok).toBe(false);
    expect(hasRoute(b.lab, b.ids.R1, '192.168.3.0', 24)).toBe(false);
    b.cli('R1', ['ip route 10.0.23.0 255.255.255.252 10.0.12.2']);
    expect(routeLines(b.show('R1', 'show ip route'))).toHaveLength(2);
    expect(b.ping('PC1', '192.168.3.10').ok).toBe(true);
    // removing the underlying route takes the recursive route away again
    b.cli('R1', ['no ip route 10.0.23.0 255.255.255.252 10.0.12.2']);
    expect(routeLines(b.show('R1', 'show ip route'))).toEqual([]);
    expect(b.ping('PC1', '192.168.3.10').ok).toBe(false);
  });

  it('the next hop may resolve through the default route', () => {
    const b = chain3(['ip route 0.0.0.0 0.0.0.0 10.0.12.2', 'ip route 192.168.3.0 255.255.255.0 10.0.23.2']);
    expect(routeLines(b.show('R1', 'show ip route'))).toContain('S 192.168.3.0 [1/0] via 10.0.23.2');
    expect(b.ping('PC1', '192.168.3.10').ok).toBe(true);
  });

  it('the next hop may resolve through an exit-interface route (both features together)', () => {
    const b = chain3(['ip route 10.0.23.0 255.255.255.252 GigabitEthernet0/1 10.0.12.2', 'ip route 192.168.3.0 255.255.255.0 10.0.23.2']);
    expect(b.ping('PC1', '192.168.3.10').ok).toBe(true);
    b.cli('R1', ['interface gi0/1', 'shutdown']);
    expect(routeLines(b.show('R1', 'show ip route'))).toEqual([]); // both routes go away: the resolving route's interface is down
  });

  it('a next hop on a connected subnet resolves exactly as before (depth 0, same ARP target), even when a longer static route also covers that address', () => {
    // 10.0.12.2/32 is longer than the connected /30 and covers the next hop, but before SR-NET-12 a connected next hop never looked at other routes
    const b = chain3(['ip route 192.168.3.0 255.255.255.0 10.0.12.2', 'ip route 10.0.12.2 255.255.255.255 10.0.12.99']);
    const r = b.dv('R1').routes.find((x) => x.net === '192.168.3.0')!;
    const res = resolveStaticRoute(b.lab, b.dv('R1'), r);
    expect('fail' in res ? res.fail : [res.depth, res.out.name, res.nextHop]).toEqual([0, 'GigabitEthernet0/1', '10.0.12.2']);
  });

  it('boundary: eight levels of recursion resolve, the ninth is refused with a depth message', () => {
    const levels = (n: number) => {
      // routes r0..rn: r_k = D_k via an address inside D_(k+1); r_n points at R2's directly connected address
      const b = p2p([]);
      const routes: StaticRoute[] = [];
      for (let k = 0; k < n; k++) routes.push({ net: `10.${100 + k}.0.0`, mask: '255.255.255.0', nextHop: `10.${100 + k + 1}.0.1` });
      routes.push({ net: `10.${100 + n}.0.0`, mask: '255.255.255.0', nextHop: '10.0.12.2' });
      b.lab = { ...b.lab, devices: b.lab.devices.map((d) => (d.id === b.ids.R1 ? { ...d, routes } : d)) };
      return b;
    };
    expect(MAX_ROUTE_RECURSION).toBe(8);
    const ok = levels(8);
    const r0 = ok.dv('R1').routes[0];
    const res = resolveStaticRoute(ok.lab, ok.dv('R1'), r0);
    expect('fail' in res).toBe(false);
    if (!('fail' in res)) {
      expect(res.depth).toBe(8);
      expect(res.out.name).toBe('GigabitEthernet0/1');
      expect(res.nextHop).toBe('10.0.12.2'); // the address that is really ARPed on the link
    }
    expect(routeLines(ok.show('R1', 'show ip route'))).toHaveLength(9);
    const bad = levels(9);
    expect(resolveStaticRoute(bad.lab, bad.dv('R1'), bad.dv('R1').routes[0])).toEqual({ fail: 'depth' });
    expect(routeLines(bad.show('R1', 'show ip route'))).toHaveLength(9 /* r1..r9 */);
    const p = bad.ping('R1', '10.100.0.5');
    expect(p.ok).toBe(false);
    expect(p.explanation.join(' ')).toContain(String(MAX_ROUTE_RECURSION));
  });

  it('a routing loop between two static routes is detected: neither route is installed and nothing hangs', () => {
    const b = chain3(['ip route 10.8.0.0 255.255.255.0 10.9.0.1', 'ip route 10.9.0.0 255.255.255.0 10.8.0.1']);
    expect(routeLines(b.show('R1', 'show ip route'))).toEqual([]);
    for (const r of b.dv('R1').routes) expect(resolveStaticRoute(b.lab, b.dv('R1'), r)).toEqual({ fail: 'loop' });
    const p = b.ping('R1', '10.8.0.5');
    expect(p.ok).toBe(false);
    expect(p.explanation.join(' ')).toContain('recursive routing loop');
  });

  it('a route whose next hop lies inside the route itself, and a three-route cycle, are loops too', () => {
    const self = chain3(['ip route 10.0.0.0 255.0.0.0 10.77.0.1']);
    expect(resolveStaticRoute(self.lab, self.dv('R1'), self.dv('R1').routes[0])).toEqual({ fail: 'loop' });
    const tri = chain3(['ip route 10.1.0.0 255.255.0.0 10.2.0.1', 'ip route 10.2.0.0 255.255.0.0 10.3.0.1', 'ip route 10.3.0.0 255.255.0.0 10.1.0.1']);
    for (const r of tri.dv('R1').routes) expect(resolveStaticRoute(tri.lab, tri.dv('R1'), r)).toEqual({ fail: 'loop' });
    expect(tri.ping('R1', '10.2.5.5').ok).toBe(false);
  });

  it('an unresolvable more specific route for the next hop is skipped: the next hop falls back to a less specific route (IOS behaviour)', () => {
    // B (10.0.23.0/30 via an address inside itself) is a recursive loop and is not installed; A's next hop 10.0.23.2 then resolves through the default route
    const b = chain3(['ip route 192.168.3.0 255.255.255.0 10.0.23.2', 'ip route 10.0.23.0 255.255.255.252 10.0.23.2', 'ip route 0.0.0.0 0.0.0.0 10.0.12.2']);
    const [aRoute, bRoute] = b.dv('R1').routes;
    expect(resolveStaticRoute(b.lab, b.dv('R1'), bRoute)).toEqual({ fail: 'loop' });
    const res = resolveStaticRoute(b.lab, b.dv('R1'), aRoute);
    expect('fail' in res).toBe(false);
    expect(routeLines(b.show('R1', 'show ip route'))).toEqual(['S* 0.0.0.0 [1/0] via 10.0.12.2', 'S 192.168.3.0 [1/0] via 10.0.23.2']);
    expect(b.ping('PC1', '192.168.3.10').ok).toBe(true);
  });

  it('when several routes for a destination are refused, the explanation names the MOST SPECIFIC one and its reason', () => {
    // /24 names an interface that is not usable; /16 has an unresolvable next hop — the /24 is the route IOS would have used
    const b = p2p(['ip route 172.16.5.0 255.255.255.0 GigabitEthernet0/2', 'ip route 172.16.0.0 255.255.0.0 203.0.113.1']);
    const why = b.ping('R1', '172.16.5.10').explanation.join(' ');
    expect(why).toContain('GigabitEthernet0/2');
    expect(why).not.toContain('203.0.113.1');
    // and with the order of configuration reversed the answer is the same
    const rev = p2p(['ip route 172.16.0.0 255.255.0.0 203.0.113.1', 'ip route 172.16.5.0 255.255.255.0 GigabitEthernet0/2']);
    expect(rev.ping('R1', '172.16.5.10').explanation.join(' ')).toContain('GigabitEthernet0/2');
  });

  it('cost is bounded: 24 nested routes that all point at one unresolvable next hop are refused quickly (no exponential search)', () => {
    const b = p2p([]);
    const routes: StaticRoute[] = [];
    // /31 … /8 around 10.200.0.0: each covers the next hop 10.200.0.1, so every less specific route can fall back through the more specific ones
    for (let p = 31; p >= 8; p--) routes.push({ net: '10.200.0.0', mask: maskOf(p), nextHop: '10.200.0.1' });
    b.lab = { ...b.lab, devices: b.lab.devices.map((d) => (d.id === b.ids.R1 ? { ...d, routes } : d)) };
    const t0 = Date.now();
    for (const r of b.dv('R1').routes) expect('fail' in resolveStaticRoute(b.lab, b.dv('R1'), r)).toBe(true);
    expect(Date.now() - t0, 'resolving every one of the 24 routes').toBeLessThan(1500);
    expect(MAX_ROUTE_LOOKUPS).toBeGreaterThan(MAX_ROUTE_RECURSION + 1); // the budget never limits a legitimate 8-level chain
    const t1 = Date.now();
    expect(b.ping('R1', '10.200.0.77').ok).toBe(false);
    expect(routeLines(b.show('R1', 'show ip route'))).toEqual([]);
    expect(Date.now() - t1).toBeLessThan(2500);
  });

  it('running out of the lookup budget reports its own reason (budget), never the depth message', () => {
    const b = p2p([]);
    const routes: StaticRoute[] = [];
    // layered table (imported Lab): 5 layers x 12 routes, each route's next hop is covered by all 12 routes of the next layer and the last layer is unresolvable.
    // Every branch fails, so the fallback search would visit 12^4 chains; no loop and no level beyond 6, hence only the budget can stop it
    for (let layer = 0; layer < 5; layer++) for (let i = 0; i < 12; i++) routes.push({ net: `10.${200 + layer}.0.0`, mask: maskOf(24), nextHop: layer < 4 ? `10.${201 + layer}.0.1` : '203.0.113.1' });
    routes.push({ net: '172.30.0.0', mask: maskOf(16), nextHop: '10.200.0.5' });
    b.lab = { ...b.lab, devices: b.lab.devices.map((d) => (d.id === b.ids.R1 ? { ...d, routes } : d)) };
    const reasons = new Set(b.dv('R1').routes.map((r) => { const x = resolveStaticRoute(b.lab, b.dv('R1'), r); return 'fail' in x ? x.fail : 'ok'; }));
    expect(reasons.has('budget')).toBe(true);
    expect(reasons.has('depth')).toBe(false);
    const why = b.ping('R1', '172.30.1.1').explanation.join(' ');
    expect(why).toContain(String(MAX_ROUTE_LOOKUPS));
    expect(why).not.toContain('more than ' + MAX_ROUTE_RECURSION + ' levels');
  });

  it('a connected network wins a prefix-length tie at the second level (the static route of the same length is ignored)', () => {
    // r0 → next hop 10.9.9.1 (not connected) → B (10.9.9.0/24 via 10.0.12.2) → 10.0.12.2 is covered by the connected /30 on Gi0/1 AND by C = 10.0.12.0/30 out of Gi0/0
    const b = p2p([]);
    const routes: StaticRoute[] = [
      { net: '172.30.0.0', mask: '255.255.0.0', nextHop: '10.9.9.1' },
      { net: '10.9.9.0', mask: '255.255.255.0', nextHop: '10.0.12.2' },
      { net: '10.0.12.0', mask: '255.255.255.252', iface: 'GigabitEthernet0/0' },
    ];
    b.lab = { ...b.lab, devices: b.lab.devices.map((d) => (d.id === b.ids.R1 ? { ...d, routes } : d)) };
    const res = resolveStaticRoute(b.lab, b.dv('R1'), b.dv('R1').routes[0]);
    expect('fail' in res ? res.fail : [res.out.name, res.nextHop, res.depth]).toEqual(['GigabitEthernet0/1', '10.0.12.2', 1]);
  });

  it('when nested candidates fail for different reasons the MOST SPECIFIC one is reported (first failure wins inside the resolution)', () => {
    const b = p2p([]);
    const routes: StaticRoute[] = [
      { net: '192.168.50.0', mask: '255.255.255.0', nextHop: '172.16.5.9' },
      { net: '172.16.5.0', mask: '255.255.255.0', iface: 'GigabitEthernet0/2' }, // /24: interface not usable
      { net: '172.16.0.0', mask: '255.255.0.0', nextHop: '203.0.113.1' }, // /16: next hop unresolvable
    ];
    b.lab = { ...b.lab, devices: b.lab.devices.map((d) => (d.id === b.ids.R1 ? { ...d, routes } : d)) };
    expect(resolveStaticRoute(b.lab, b.dv('R1'), b.dv('R1').routes[0])).toEqual({ fail: 'iface-down' });
  });

  it('a next hop nobody can resolve keeps its existing explanation (not installed)', () => {
    const b = chain3(['ip route 192.168.3.0 255.255.255.0 203.0.113.1']);
    expect(resolveStaticRoute(b.lab, b.dv('R1'), b.dv('R1').routes[0])).toEqual({ fail: 'next-hop' });
    expect(b.ping('R1', '192.168.3.10').explanation.join(' ')).toContain('next hop');
  });
});

// ═══════════════════════════ Aruba AOS-CX ═══════════════════════════

describe('SR-NET-12 — Aruba AOS-CX (exit-interface and recursive routes)', () => {
  /** PC1 — AS1 (routed ports 1/1/1 and 1/1/2) — AS2 — PCA */
  function cx(as1Routes: string[]) {
    const b = new B().dev('PC1', 'pc').dev('PCA', 'pc').dev('AS1', 'aruba-switch').dev('AS2', 'aruba-switch');
    b.link('PC1', 'Ethernet0', 'AS1', '1/1/10').link('AS1', '1/1/11', 'AS2', '1/1/11').link('AS2', '1/1/10', 'PCA', 'Ethernet0');
    b.host('PC1', '10.1.1.10', '10.1.1.1').host('PCA', '172.16.5.10', '172.16.5.1');
    b.cx('AS1', ['interface 1/1/10', 'ip address 10.1.1.1/24', 'no shutdown', 'exit', 'interface 1/1/11', 'ip address 10.0.12.1/30', 'no shutdown', 'exit', ...as1Routes]);
    b.cx('AS2', ['interface 1/1/11', 'ip address 10.0.12.2/30', 'no shutdown', 'exit', 'interface 1/1/10', 'ip address 172.16.5.1/24', 'no shutdown', 'exit', 'ip route 10.1.1.0/24 10.0.12.1']);
    return b;
  }

  it('ip route <prefix> <interface> is stored with iface, listed in show ip route and running-config, and carries traffic', () => {
    const b = cx(['ip route 172.16.5.0/24 1/1/11']);
    expect(b.dv('AS1').routes).toEqual([{ net: '172.16.5.0', mask: '255.255.255.0', iface: '1/1/11' }]);
    const sRows = cxStatic(b.showCx('AS1', 'show ip route'));
    expect(sRows).toHaveLength(1);
    expect(sRows[0]).toContain('172.16.5.0/24');
    expect(sRows[0]).toContain('1/1/11');
    expect(b.showCx('AS1', 'show running-config').join('\n')).toContain('ip route 172.16.5.0/24 1/1/11');
    const p = b.ping('PC1', '172.16.5.10');
    expect(p.ok, p.explanation.join(' | ')).toBe(true);
  });

  it('the Aruba route disappears when its port is shut down and returns with no shutdown', () => {
    const b = cx(['ip route 172.16.5.0/24 1/1/11']);
    b.cx('AS1', ['interface 1/1/11', 'shutdown']);
    expect(cxStatic(b.showCx('AS1', 'show ip route'))).toEqual([]);
    expect(b.ping('PC1', '172.16.5.10').ok).toBe(false);
    b.cx('AS1', ['interface 1/1/11', 'no shutdown']);
    expect(b.ping('PC1', '172.16.5.10').ok).toBe(true);
  });

  it('no ip route <prefix> <interface> removes it; the next-hop form does not match; unknown ports are rejected', () => {
    const b = cx(['ip route 172.16.5.0/24 1/1/11']);
    expect(executeLine(b.lab, b.ids.AS1, 'configure terminal').ok).toBe(true);
    const cfg = executeLine(b.lab, b.ids.AS1, 'configure terminal');
    const miss = executeLine(cfg.lab, b.ids.AS1, 'no ip route 172.16.5.0/24 10.0.12.2');
    expect(miss.ok).toBe(false);
    const badPort = executeLine(cfg.lab, b.ids.AS1, 'ip route 172.16.5.0/24 1/1/99');
    expect(badPort.ok).toBe(false);
    b.cx('AS1', ['no ip route 172.16.5.0/24 1/1/11']);
    expect(b.dv('AS1').routes).toEqual([]);
  });

  it('recursive next hop on Aruba: resolved through another static route (nexthop column shows the configured next hop)', () => {
    const b = new B().dev('PC1', 'pc').dev('AS1', 'aruba-switch').dev('R2', 'cisco-router').dev('R3', 'cisco-router').dev('PC3', 'pc');
    b.link('PC1', 'Ethernet0', 'AS1', '1/1/10').link('AS1', '1/1/11', 'R2', 'GigabitEthernet0/0').link('R2', 'GigabitEthernet0/1', 'R3', 'GigabitEthernet0/0').link('R3', 'GigabitEthernet0/1', 'PC3', 'Ethernet0');
    b.host('PC1', '10.1.1.10', '10.1.1.1').host('PC3', '192.168.3.10', '192.168.3.1');
    b.cx('AS1', ['interface 1/1/10', 'ip address 10.1.1.1/24', 'no shutdown', 'exit', 'interface 1/1/11', 'ip address 10.0.12.1/30', 'no shutdown', 'exit', 'ip route 10.0.23.0/30 10.0.12.2', 'ip route 192.168.3.0/24 10.0.23.2']);
    b.cli('R2', [...ifc('gi0/0', '10.0.12.2', '255.255.255.252'), ...ifc('gi0/1', '10.0.23.1', '255.255.255.252'), 'ip route 10.1.1.0 255.255.255.0 10.0.12.1', 'ip route 192.168.3.0 255.255.255.0 10.0.23.2']);
    b.cli('R3', [...ifc('gi0/0', '10.0.23.2', '255.255.255.252'), ...ifc('gi0/1', '192.168.3.1', '255.255.255.0'), 'ip route 10.1.1.0 255.255.255.0 10.0.23.1', 'ip route 10.0.12.0 255.255.255.252 10.0.23.1']);
    const rows = cxStatic(b.showCx('AS1', 'show ip route'));
    expect(rows).toHaveLength(2);
    expect(rows.find((l) => l.startsWith('192.168.3.0/24'))).toContain('10.0.23.2');
    const p = b.ping('PC1', '192.168.3.10');
    expect(p.ok, p.explanation.join(' | ')).toBe(true);
  });

  it('an Aruba recursion loop is detected and shows no route', () => {
    const b = cx(['ip route 10.8.0.0/24 10.9.0.1', 'ip route 10.9.0.0/24 10.8.0.1']);
    expect(cxStatic(b.showCx('AS1', 'show ip route'))).toEqual([]);
    expect(b.ping('AS1', '10.8.0.5').ok).toBe(false);
  });
});

// ═══════════════════════════ persistence / compatibility ═══════════════════════════

describe('SR-NET-12 — Lab persistence stays backward compatible', () => {
  const roundTrip = (lab: Lab) => {
    const r = parseImport(serializeExport(lab));
    if (!r.ok) throw new Error('import failed: ' + r.error);
    return r.lab;
  };

  it('a Lab saved before SR-NET-12 (routes with nextHop only) imports unchanged and behaves as before', () => {
    const b = p2p(['ip route 172.16.5.0 255.255.255.0 10.0.12.2']);
    const json = JSON.parse(serializeExport(b.lab));
    // exactly what an old export contained: no `iface` key anywhere
    expect(JSON.stringify(json)).not.toContain('"iface"');
    const back = roundTrip(b.lab);
    expect(back.devices.find((d) => d.id === b.ids.R1)!.routes).toEqual([{ net: '172.16.5.0', mask: '255.255.255.0', nextHop: '10.0.12.2' }]);
    expect(ping(back, b.ids.PC1, '172.16.5.10').ok).toBe(true);
  });

  it('exit-interface, combined and recursive routes survive export → import, and still forward', () => {
    const b = p2p(['ip route 172.16.5.0 255.255.255.0 GigabitEthernet0/1']);
    const back = roundTrip(b.lab);
    expect(back.devices.find((d) => d.id === b.ids.R1)!.routes).toEqual([{ net: '172.16.5.0', mask: '255.255.255.0', iface: 'GigabitEthernet0/1' }]);
    expect(ping(back, b.ids.PC1, '172.16.5.10').ok).toBe(true);
    const both = p2p(['ip route 172.16.5.0 255.255.255.0 GigabitEthernet0/1 10.0.12.2']);
    expect(roundTrip(both.lab).devices.find((d) => d.id === both.ids.R1)!.routes[0]).toEqual({ net: '172.16.5.0', mask: '255.255.255.0', iface: 'GigabitEthernet0/1', nextHop: '10.0.12.2' });
  });

  it('a route with neither next hop nor interface, or with a malformed interface name, is rejected on import (and the same edit with a valid value is accepted)', () => {
    const b = p2p(['ip route 172.16.5.0 255.255.255.0 GigabitEthernet0/1']);
    // edit the exported JSON structurally, so a failure can only come from the route validation itself
    const withRoute = (patch: (r: Record<string, unknown>) => void) => {
      const j = JSON.parse(serializeExport(b.lab));
      const r1 = j.lab.devices.find((d: { id: string }) => d.id === b.ids.R1);
      patch(r1.routes[0]);
      return parseImport(JSON.stringify(j));
    };
    expect(withRoute(() => undefined).ok).toBe(true); // positive control: unmodified
    expect(withRoute((r) => { r.iface = 'GigabitEthernet0/2'; }).ok).toBe(true); // any well-formed name loads (it is simply not installed if absent)
    expect(withRoute((r) => { r.nextHop = '10.0.12.2'; }).ok).toBe(true); // both fields
    const neither = withRoute((r) => { delete r.iface; });
    expect(neither.ok).toBe(false);
    for (const bad of ['Gi0/1; drop table', '<b>x</b>', 'a'.repeat(65), '']) {
      expect(withRoute((r) => { r.iface = bad; }).ok, JSON.stringify(bad)).toBe(false);
    }
    expect(withRoute((r) => { r.iface = 5; }).ok).toBe(false);
    expect(withRoute((r) => { r.nextHop = '999.1.1.1'; }).ok).toBe(false);
  });

  it('an imported Lab whose route names an interface that does not exist simply has no installed route (no crash)', () => {
    const b = p2p([]);
    b.lab = { ...b.lab, devices: b.lab.devices.map((d) => (d.id === b.ids.R1 ? { ...d, routes: [{ net: '172.16.5.0', mask: '255.255.255.0', iface: 'GigabitEthernet0/7' }] } : d)) };
    const back = roundTrip(b.lab);
    expect(routeLines(executeLine(executeLine(back, b.ids.R1, 'enable').lab, b.ids.R1, 'show ip route').output)).toEqual([]);
    expect(ping(back, b.ids.PC1, '172.16.5.10').ok).toBe(false);
  });

  it('the Challenge "route" check follows the engine: an installed exit-interface or recursive route counts, a loop does not', () => {
    const ex = p2p(['ip route 172.16.5.0 255.255.255.0 GigabitEthernet0/1']);
    expect(hasRoute(ex.lab, ex.ids.R1, '172.16.5.0', 24)).toBe(true);
    expect(hasRoute(ex.lab, ex.ids.R1, '172.16.5.0', 25)).toBe(false);
    const rec = chain3(R1_RECURSIVE);
    expect(hasRoute(rec.lab, rec.ids.R1, '192.168.3.0', 24)).toBe(true);
    const loop = chain3(['ip route 10.8.0.0 255.255.255.0 10.9.0.1', 'ip route 10.9.0.0 255.255.255.0 10.8.0.1']);
    expect(hasRoute(loop.lab, loop.ids.R1, '10.8.0.0', 24)).toBe(false);
  });
});

describe('SR-NET-12 — exit interface on a router sub-interface (router-on-a-stick)', () => {
  /** R1 Gi0/0.10 (VLAN 10) ─ trunk ─ SW ─ access VLAN 10 ─ R2 Gi0/0 ; R2 Gi0/1 = 192.0.2.0/24 */
  function stick(r1Routes: string[]) {
    const b = new B().dev('R1', 'cisco-router').dev('SW', 'cisco-switch').dev('R2', 'cisco-router').dev('PCB', 'pc');
    b.link('R1', 'GigabitEthernet0/0', 'SW', 'FastEthernet0/1').link('SW', 'FastEthernet0/2', 'R2', 'GigabitEthernet0/0').link('R2', 'GigabitEthernet0/1', 'PCB', 'Ethernet0');
    b.host('PCB', '192.0.2.10', '192.0.2.1');
    b.cli('SW', ['vlan 10', 'interface fa0/1', 'switchport mode trunk', 'interface fa0/2', 'switchport mode access', 'switchport access vlan 10']);
    b.cli('R1', ['interface gi0/0', 'no shutdown', 'interface gi0/0.10', 'encapsulation dot1Q 10', 'ip address 10.10.10.1 255.255.255.0', 'exit', ...r1Routes]);
    b.cli('R2', [...ifc('gi0/0', '10.10.10.2', '255.255.255.0'), ...ifc('gi0/1', '192.0.2.1', '255.255.255.0'), 'ip route 0.0.0.0 0.0.0.0 10.10.10.1']);
    return b;
  }

  it('an exit-interface route may name a sub-interface; it carries traffic and follows the sub-interface state', () => {
    const b = stick(['ip route 192.0.2.0 255.255.255.0 GigabitEthernet0/0.10']);
    expect(b.dv('R1').routes).toEqual([{ net: '192.0.2.0', mask: '255.255.255.0', iface: 'GigabitEthernet0/0.10' }]);
    expect(routeLines(b.show('R1', 'show ip route'))).toEqual(['S 192.0.2.0 is directly connected, GigabitEthernet0/0.10']);
    const p = b.ping('R1', '192.0.2.10');
    expect(p.ok, p.explanation.join(' | ')).toBe(true);
    b.cli('R1', ['interface gi0/0.10', 'shutdown']);
    expect(routeLines(b.show('R1', 'show ip route'))).toEqual([]);
    expect(b.ping('R1', '192.0.2.10').ok).toBe(false);
  });
});
