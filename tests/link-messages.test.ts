/**
 * CERT-Q3: %LINK state-change messages printed by the Cisco IOS console.
 * Certification: CCNA 200-301 v1.1 4.5 (syslog message format: facility-severity-mnemonic), v2.0 5.6 (interpret syslog
 * content and severity); Network+ N10-009 5.2-b5 (port status: administratively down).
 *
 * Source of the messages: the `shutdown` / `no shutdown` handlers in src/core/cli/cisco.ts (%LINK-5-CHANGED, %LINK-3-UPDOWN).
 * These tests cover only the behaviour that is correct today: the message for a real state change, its exact format and
 * severity, the canonical interface name, one message per command, and no IOS messages from AOS-CX.
 * Known misleading cases (a message without a state change, "up" when the line stays down, a single message for an
 * interface range, no %LINEPROTO / peer messages) are documented as findings in CERT_Q3_TEST_REPORT.md and deliberately
 * NOT asserted here, so that fixing them later does not require rewriting these tests.
 */
import { describe, expect, it } from 'vitest';
import { executeLine } from '../src/core/cli/engine';
import { addDevice, addLink, emptyLab } from '../src/core/lab';
import type { DeviceKind, Lab } from '../src/core/types';

class B {
  lab: Lab = emptyLab('link-messages');
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
  /** runs each line, fails on a rejected line, and returns the output of every line */
  run(name: string, lines: string[]) {
    return lines.map((l) => {
      const r = executeLine(this.lab, this.ids[name], l);
      if (!r.ok) throw new Error(`${name}: "${l}" rejected: ${r.output.join(' | ')}`);
      this.lab = r.lab;
      return r.output;
    });
  }
}

const LINK_RE = /^%LINK-(\d)-(UPDOWN|CHANGED): Interface (\S+), changed state to (up|down|administratively down)$/;
const linkLines = (out: string[]) => out.filter((l) => l.startsWith('%LINK'));
/** the row of `show ip interface brief` for one interface: [status, protocol] */
function brief(b: B, dev: string, ifName: string): [string, string] {
  const out = executeLine(b.lab, b.ids[dev], 'show ip interface brief').output;
  const row = out.find((l) => l.split(/\s+/)[0] === ifName);
  if (!row) throw new Error(`no row for ${ifName}`);
  const m = row.match(/(administratively down|up|down)\s+(up|down)\s*$/);
  return [m![1], m![2]];
}

/** R1 Gi0/1 ── Gi0/0 R2, both ends configured and up */
function twoRouters() {
  const b = new B().dev('R1', 'cisco-router').dev('R2', 'cisco-router');
  b.link('R1', 'GigabitEthernet0/1', 'R2', 'GigabitEthernet0/0');
  b.run('R2', ['enable', 'configure terminal', 'interface gi0/0', 'ip address 10.0.12.2 255.255.255.252', 'no shutdown', 'end']);
  b.run('R1', ['enable', 'configure terminal', 'interface gi0/1', 'ip address 10.0.12.1 255.255.255.252', 'no shutdown', 'end']);
  return b;
}

describe('CERT-Q3 C — %LINK messages (CCNA 4.5 · v2.0 5.6 · N+ 5.2)', () => {
  it('shutdown on an up/up port prints exactly one %LINK-5-CHANGED with the full interface name, and the port really goes down', () => {
    const b = twoRouters();
    expect(brief(b, 'R1', 'GigabitEthernet0/1')).toEqual(['up', 'up']);
    const [, , out] = b.run('R1', ['configure terminal', 'interface gi0/1', 'shutdown', 'end']);
    expect(out).toEqual(['%LINK-5-CHANGED: Interface GigabitEthernet0/1, changed state to administratively down']);
    expect(brief(b, 'R1', 'GigabitEthernet0/1')).toEqual(['administratively down', 'down']);
  });

  it('no shutdown that brings the link back up prints exactly one %LINK-3-UPDOWN … up, and the port is up/up again', () => {
    const b = twoRouters();
    b.run('R1', ['configure terminal', 'interface gi0/1', 'shutdown', 'end']);
    const [, , out] = b.run('R1', ['configure terminal', 'interface GigabitEthernet0/1', 'no shutdown', 'end']);
    expect(out).toEqual(['%LINK-3-UPDOWN: Interface GigabitEthernet0/1, changed state to up']);
    expect(brief(b, 'R1', 'GigabitEthernet0/1')).toEqual(['up', 'up']);
  });

  it('names the interface the way IOS does: abbreviations expand, sub-interfaces keep the .id, SVIs are VlanN, switch ports keep their type', () => {
    const b = twoRouters().dev('SW', 'cisco-switch');
    const r1 = b.run('R1', ['configure terminal', 'interface gi0/0.10', 'encapsulation dot1Q 10', 'shutdown', 'end']);
    expect(linkLines(r1.flat())).toEqual(['%LINK-5-CHANGED: Interface GigabitEthernet0/0.10, changed state to administratively down']);
    const sw = b.run('SW', ['enable', 'configure terminal', 'interface fa0/24', 'shutdown', 'exit', 'interface vlan 10', 'shutdown', 'end']);
    expect(linkLines(sw.flat())).toEqual([
      '%LINK-5-CHANGED: Interface FastEthernet0/24, changed state to administratively down',
      '%LINK-5-CHANGED: Interface Vlan10, changed state to administratively down',
    ]);
  });

  it('every message follows %FACILITY-SEVERITY-MNEMONIC: LINK-5 for the administrative change, LINK-3 for the up/down event', () => {
    const b = twoRouters().dev('SW', 'cisco-switch');
    const all = [
      ...b.run('R1', ['configure terminal', 'interface gi0/1', 'shutdown', 'no shutdown', 'end']),
      ...b.run('SW', ['enable', 'configure terminal', 'interface fa0/1', 'shutdown', 'end']),
    ].flat();
    const msgs = linkLines(all);
    expect(msgs).toHaveLength(3);
    for (const m of msgs) {
      const p = m.match(LINK_RE);
      expect(p, m).not.toBeNull();
      // IOS: LINK-5-CHANGED (notification) for "administratively down", LINK-3-UPDOWN (error) for up/down
      if (p![2] === 'CHANGED') expect([p![1], p![4]]).toEqual(['5', 'administratively down']);
      else expect(p![1]).toBe('3');
    }
  });

  it('only shutdown / no shutdown produce %LINK messages: other interface commands and show commands print none', () => {
    const b = twoRouters();
    const out = b.run('R1', [
      'configure terminal', 'interface gi0/1', 'description UPLINK-R2', 'ip address 10.0.12.1 255.255.255.252', 'exit',
      'interface gi0/2', 'ip address 10.0.99.1 255.255.255.0', 'end', 'show ip interface brief', 'show running-config',
    ]).flat();
    expect(linkLines(out)).toEqual([]);
  });

  it('is deterministic: the same commands on the same Lab print the same messages', () => {
    const seq = ['configure terminal', 'interface gi0/1', 'shutdown', 'no shutdown', 'end'];
    const a = twoRouters().run('R1', seq);
    const c = twoRouters().run('R1', seq);
    expect(a).toEqual(c);
  });

  it('AOS-CX does not print IOS %LINK messages on shutdown / no shutdown', () => {
    const b = new B().dev('AR', 'aruba-switch');
    const out = b.run('AR', ['configure terminal', 'interface 1/1/1', 'no shutdown', 'shutdown', 'end']).flat();
    expect(out.filter((l) => l.startsWith('%'))).toEqual([]);
  });
});
