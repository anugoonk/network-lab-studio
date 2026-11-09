import { describe, expect, it } from 'vitest';
import { executeLine } from '../src/core/cli/engine';
import { configSignature, updateDevice } from '../src/core/lab';
import { ping } from '../src/core/network';
import { parseImport, serializeExport } from '../src/core/persist';
import { buildInterVlanLab } from '../src/core/sample';
import type { Lab } from '../src/core/types';
import { byName, dev, run } from './helpers';

const lab0 = () => buildInterVlanLab();
const p = (lab: Lab, from: string, ip: string) => ping(lab, byName(lab, from).id, ip);
const R1_CFG = ['enable', 'configure terminal'];
const SW1_CFG = ['enable', 'configure terminal'];

describe('inter-VLAN sample lab (trunks + router-on-a-stick + static routes)', () => {
  it('works out of the box', () => {
    const lab = lab0();
    expect(p(lab, 'PC-A', '192.168.10.12').ok).toBe(true); // same VLAN across two switches via trunk
    expect(p(lab, 'PC-B', '192.168.20.12').ok).toBe(true);
    expect(p(lab, 'PC-A', '192.168.10.1').ok).toBe(true); // gateway = R1 sub-interface
    expect(p(lab, 'PC-A', '192.168.20.11').ok).toBe(true); // inter-VLAN through R1 (router-on-a-stick)
    expect(p(lab, 'PC-D', '192.168.10.11').ok).toBe(true);
    expect(p(lab, 'PC-A', '172.16.0.10').ok).toBe(true); // static route on R1, default route back on R2
    expect(p(lab, 'PC-E', '192.168.20.12').ok).toBe(true);
  });

  it('VLANs stay isolated without a router path', () => {
    let lab = lab0();
    // sub-interface for VLAN 20 loses its dot1Q tag → VLAN 20 is no longer routed
    lab = run(lab, 'R1', [...R1_CFG, 'interface gi0/0.20', 'encapsulation dot1Q 30']).lab;
    const r = p(lab, 'PC-B', '192.168.10.11');
    expect(r.ok).toBe(false);
    expect(p(lab, 'PC-A', '192.168.10.12').ok).toBe(true); // VLAN 10 unaffected
  });
});

describe('802.1Q trunks', () => {
  it('removing VLAN 20 from the allowed list on one side breaks only VLAN 20', () => {
    let lab = lab0();
    lab = run(lab, 'SW1', [...SW1_CFG, 'interface gi0/2', 'switchport trunk allowed vlan remove 20']).lab;
    expect(p(lab, 'PC-A', '192.168.10.12').ok).toBe(true);
    const r = p(lab, 'PC-B', '192.168.20.12');
    expect(r.ok).toBe(false);
    expect(r.explanation.join(' ')).toMatch(/VLAN 20/);
    expect(r.explanation.join(' ')).toMatch(/allowed/);
    lab = run(lab, 'SW1', ['switchport trunk allowed vlan add 20']).lab;
    expect(p(lab, 'PC-B', '192.168.20.12').ok).toBe(true);
  });

  it('Aruba trunk allowed list is enforced too', () => {
    let lab = lab0();
    lab = run(lab, 'SW2', ['configure terminal', 'interface 1/1/24', 'vlan trunk allowed 10']).lab;
    expect(p(lab, 'PC-A', '192.168.10.12').ok).toBe(true);
    expect(p(lab, 'PC-B', '192.168.20.12').ok).toBe(false);
    lab = run(lab, 'SW2', ['vlan trunk allowed all']).lab;
    expect(p(lab, 'PC-B', '192.168.20.12').ok).toBe(true);
  });

  it('turning one end into an access port drops tagged frames', () => {
    let lab = lab0();
    lab = run(lab, 'SW2', ['configure terminal', 'interface 1/1/24', 'vlan access 10']).lab;
    const r = p(lab, 'PC-A', '192.168.10.12');
    expect(r.ok).toBe(false);
    expect(r.explanation.join(' ')).toMatch(/access port/);
  });

  it('native VLAN: untagged frames follow the native VLAN, and a mismatch leaks VLANs', () => {
    // two PCs on trunk-native VLAN 1 ports ... build via CLI: PC on access VLAN 99 at SW1, other side native 99
    let lab = lab0();
    lab = run(lab, 'SW1', [...SW1_CFG, 'vlan 99', 'interface fa0/3', 'switchport access vlan 99', 'interface gi0/2', 'switchport trunk native vlan 99', 'switchport trunk allowed vlan add 99']).lab;
    lab = run(lab, 'SW2', ['configure terminal', 'vlan 99', 'interface 1/1/24', 'vlan trunk native 99', 'vlan trunk allowed 10,20,99', 'interface 1/1/3', 'no routing', 'vlan access 99', 'no shutdown']).lab;
    // add two hosts in VLAN 99 (one per switch) by editing the lab directly
    const addPc = (l: Lab, name: string, sw: string, port: string, ip: string): Lab => {
      const id = `x-${name}`;
      const pc = { ...dev(l, 'PC-A'), id, name, x: 0, y: 0, ifaces: dev(l, 'PC-A').ifaces.map((i) => ({ ...i, ip, mask: '255.255.255.0' })), gateway: null };
      return { ...l, devices: [...l.devices, pc], links: [...l.links, { id: `lx-${name}`, a: { deviceId: id, port: 'Ethernet0' }, b: { deviceId: byName(l, sw).id, port } }] };
    };
    lab = addPc(lab, 'H1', 'SW1', 'FastEthernet0/3', '10.99.0.1');
    lab = addPc(lab, 'H2', 'SW2', '1/1/3', '10.99.0.2');
    expect(p(lab, 'H1', '10.99.0.2').ok).toBe(true); // untagged over native VLAN 99 on both ends
    // mismatch: SW2 keeps native VLAN 1 → H1's untagged frames land in VLAN 1 on SW2 → H2 (VLAN 99) unreachable
    lab = run(lab, 'SW2', ['configure terminal', 'interface 1/1/24', 'vlan trunk native 1']).lab;
    expect(p(lab, 'H1', '10.99.0.2').ok).toBe(false);
  });

  it('show interfaces trunk / show vlan reflect the trunk', () => {
    const lab = lab0();
    const t = run(lab, 'SW1', ['enable', 'show interfaces trunk', 'show interfaces status', 'show vlan brief']).results;
    const trunk = t[1].output.join('\n');
    expect(trunk).toMatch(/Gi0\/1\s+on\s+802\.1q\s+trunking\s+1/);
    expect(trunk).toMatch(/Gi0\/2\s+10,20/);
    expect(t[2].output.join('\n')).toMatch(/Gi0\/1\s+connected\s+trunk/);
    expect(t[3].output.join('\n')).not.toMatch(/Gi0\/1/); // trunk ports are not listed in show vlan brief
    const a = run(lab, 'SW2', ['show vlan', 'show interface brief', 'show interface 1/1/24']).results;
    expect(a[0].output.join('\n')).toMatch(/10\s+USERS.*1\/1\/1,1\/1\/24/);
    expect(a[1].output.join('\n')).toMatch(/1\/1\/24\s+1\s+trunk/);
    expect(a[2].output.join('\n')).toContain('Allowed VLAN List: 10,20');
  });

  it('running-config shows trunk commands', () => {
    const lab = lab0();
    const cfg = run(lab, 'SW1', ['enable', 'show running-config']).results[1].output.join('\n');
    expect(cfg).toContain(' switchport trunk allowed vlan 10,20');
    expect(cfg).toContain(' switchport mode trunk');
    const acfg = run(lab, 'SW2', ['show running-config']).results[0].output.join('\n');
    expect(acfg).toContain('    vlan trunk allowed 10,20');
  });
});

describe('router-on-a-stick sub-interfaces', () => {
  it('can be built from scratch with the CLI', () => {
    let lab = lab0();
    // wipe R1's sub-interfaces then rebuild them
    lab = updateDevice(lab, byName(lab, 'R1').id, (d) => ({ ...d, subifs: [] }));
    expect(p(lab, 'PC-A', '192.168.10.1').ok).toBe(false);
    const r = run(lab, 'R1', [
      ...R1_CFG,
      'interface gi0/0.10', 'encapsulation dot1Q 10', 'ip address 192.168.10.1 255.255.255.0',
      'interface gi0/0.20', 'encapsulation dot1Q 20', 'ip address 192.168.20.1 255.255.255.0',
    ]);
    expect(r.results.every((x) => x.ok)).toBe(true);
    expect(dev(r.lab, 'R1').cli.mode).toBe('config-subif');
    expect(p(r.lab, 'PC-A', '192.168.20.11').ok).toBe(true);
  });

  it('IP address before encapsulation is rejected like IOS does', () => {
    const r = run(lab0(), 'R1', [...R1_CFG, 'interface gi0/0.30', 'ip address 192.168.30.1 255.255.255.0']);
    expect(r.results[3].ok).toBe(false);
    expect(r.results[3].output.join(' ')).toMatch(/802\.1Q/);
  });

  it('shutting the parent port takes every sub-interface down', () => {
    let lab = lab0();
    lab = run(lab, 'R1', [...R1_CFG, 'interface gi0/0', 'shutdown']).lab;
    const r = p(lab, 'PC-A', '192.168.20.11');
    expect(r.ok).toBe(false);
    expect(r.explanation.join(' ')).toMatch(/shutdown/);
    lab = run(lab, 'R1', ['no shutdown']).lab;
    expect(p(lab, 'PC-A', '192.168.20.11').ok).toBe(true);
  });

  it('show ip interface brief lists sub-interfaces; running-config prints encapsulation', () => {
    const lab = lab0();
    const r = run(lab, 'R1', ['enable', 'show ip interface brief', 'show running-config', 'show ip route']).results;
    expect(r[1].output.join('\n')).toMatch(/GigabitEthernet0\/0\.10\s+192\.168\.10\.1\s+YES manual up\s+up/);
    expect(r[2].output.join('\n')).toContain(' encapsulation dot1Q 20');
    expect(r[2].output.join('\n')).toContain('ip route 172.16.0.0 255.255.255.0 10.0.0.2');
    expect(r[3].output.join('\n')).toMatch(/C\s+192\.168\.10\.0\/24 is directly connected, GigabitEthernet0\/0\.10/);
    expect(r[3].output.join('\n')).toMatch(/S\s+172\.16\.0\.0 \[1\/0\] via 10\.0\.0\.2/);
    expect(r[3].output.join('\n')).toContain('172.16.0.0/24 is subnetted, 1 subnets');
  });

  it('no interface removes a sub-interface; physical ports cannot be deleted', () => {
    const r = run(lab0(), 'R1', [...R1_CFG, 'no interface gi0/0.20', 'no interface gi0/0']);
    expect(r.results[2].ok).toBe(true);
    expect(dev(r.lab, 'R1').subifs).toHaveLength(1);
    expect(r.results[3].ok).toBe(false);
  });
});

describe('static and default routes', () => {
  it('missing route on R1 breaks the forward path; missing return route breaks the reply', () => {
    let lab = lab0();
    lab = run(lab, 'R1', [...R1_CFG, 'no ip route 172.16.0.0 255.255.255.0 10.0.0.2']).lab;
    const fwd = p(lab, 'PC-A', '172.16.0.10');
    expect(fwd.ok).toBe(false);
    expect(fwd.direction).toBe('forward');
    expect(fwd.explanation.join(' ')).toMatch(/R1 ไม่มีเส้นทาง/);

    lab = run(lab, 'R1', ['ip route 172.16.0.0 255.255.255.0 10.0.0.2']).lab;
    lab = run(lab, 'R2', ['enable', 'configure terminal', 'no ip route 0.0.0.0 0.0.0.0 10.0.0.1']).lab;
    const back = p(lab, 'PC-A', '172.16.0.10');
    expect(back.ok).toBe(false);
    expect(back.direction).toBe('return');
    lab = run(lab, 'R2', ['ip route 192.168.0.0 255.255.0.0 10.0.0.1']).lab; // summary route works too
    expect(p(lab, 'PC-A', '172.16.0.10').ok).toBe(true);
  });

  it('a static route whose next hop is not on a connected subnet is not installed', () => {
    let lab = lab0();
    lab = run(lab, 'R1', [...R1_CFG, 'no ip route 172.16.0.0 255.255.255.0 10.0.0.2', 'ip route 172.16.0.0 255.255.255.0 10.9.9.9']).lab;
    const r = p(lab, 'PC-A', '172.16.0.10');
    expect(r.ok).toBe(false);
    expect(r.explanation.join(' ')).toMatch(/next hop/);
    const route = run(lab, 'R1', ['enable', 'show ip route']).results[1].output.join('\n');
    expect(route).not.toMatch(/10\.9\.9\.9/);
  });

  it('wrong next-hop address (nobody owns it) is reported', () => {
    let lab = lab0();
    lab = run(lab, 'R1', [...R1_CFG, 'no ip route 172.16.0.0 255.255.255.0 10.0.0.2', 'ip route 172.16.0.0 255.255.255.0 10.0.0.3']).lab;
    const r = p(lab, 'PC-A', '172.16.0.10');
    expect(r.ok).toBe(false);
    expect(r.explanation.join(' ')).toMatch(/10\.0\.0\.3/);
  });

  it('default route S* is shown on R2', () => {
    const out = run(lab0(), 'R2', ['enable', 'show ip route']).results[1].output.join('\n');
    expect(out).toContain('Gateway of last resort is 10.0.0.1 to network 0.0.0.0');
    expect(out).toMatch(/S\*\s+0\.0\.0\.0\/0 \[1\/0\] via 10\.0\.0\.1/);
  });

  it('validates network/mask consistency and duplicates replace', () => {
    const lab = lab0();
    const bad = run(lab, 'R1', [...R1_CFG, 'ip route 172.16.0.5 255.255.255.0 10.0.0.2']);
    expect(bad.results[2].output.join(' ')).toContain('Inconsistent address and mask');
    expect(configSignature(bad.lab)).toBe(configSignature(lab));
    const twice = run(lab, 'R1', [...R1_CFG, 'ip route 172.16.0.0 255.255.255.0 10.0.0.2']);
    expect(dev(twice.lab, 'R1').routes).toHaveLength(1);
    const del = run(lab, 'R1', [...R1_CFG, 'no ip route 1.1.1.0 255.255.255.0 10.0.0.2']);
    expect(del.results[2].ok).toBe(false);
  });

  it('Aruba static routes use prefix notation and route (AOS-CX is L3-capable)', () => {
    let lab = lab0();
    lab = run(lab, 'SW2', [
      'configure terminal', 'interface vlan 10', 'ip address 192.168.10.254/24', 'exit',
      'ip route 172.16.0.0/24 192.168.10.1',
    ]).lab;
    expect(dev(lab, 'SW2').routes).toEqual([{ net: '172.16.0.0', mask: '255.255.255.0', nextHop: '192.168.10.1' }]);
    const bad = run(lab, 'SW2', ['ip route 172.16.0.5/24 192.168.10.1']);
    expect(bad.results[0].ok).toBe(false);
    const route = run(lab, 'SW2', ['end', 'show ip route']).results[1].output.join('\n');
    expect(route).toMatch(/192\.168\.10\.0\/24\s+-\s+vlan10\s+C/);
    expect(route).toMatch(/172\.16\.0\.0\/24\s+192\.168\.10\.1\s+vlan10\s+S/);
    expect(run(lab, 'SW2', ['end', 'show running-config']).results[1].output.join('\n')).toContain('ip route 172.16.0.0/24 192.168.10.1');
  });
});

describe('SVI (switch virtual interface)', () => {
  const l3switch = () => {
    let lab = lab0();
    lab = run(lab, 'SW2', [
      'configure terminal',
      'interface vlan 10', 'ip address 192.168.10.254/24',
      'interface vlan 20', 'ip address 192.168.20.254/24',
    ]).lab;
    return lab;
  };

  it('Aruba switch routes between VLANs when it is the gateway', () => {
    let lab = l3switch();
    for (const [pc, gw] of [['PC-C', '192.168.10.254'], ['PC-D', '192.168.20.254']] as const) {
      lab = updateDevice(lab, byName(lab, pc).id, (d) => ({ ...d, gateway: gw }));
    }
    const r = p(lab, 'PC-C', '192.168.20.12');
    expect(r.ok).toBe(true);
    expect(r.forwardPath.map((id) => lab.devices.find((d) => d.id === id)!.name)).toEqual(['PC-C', 'SW2', 'PC-D']);
    expect(p(lab, 'PC-C', '192.168.10.254').ok).toBe(true); // ping the SVI itself
    // SVI on a trunk: PC-A (behind SW1/R1) reaches SW2's SVI over the trunk
    expect(p(lab, 'PC-A', '192.168.10.254').ok).toBe(true);
  });

  it('SVI goes down when its VLAN has no active port, and recovers', () => {
    let lab = l3switch();
    lab = run(lab, 'SW2', ['interface 1/1/24', 'shutdown', 'interface 1/1/1', 'shutdown']).lab;
    const r = p(lab, 'PC-C', '192.168.10.254');
    expect(r.ok).toBe(false);
    const brief = run(lab, 'SW2', ['end', 'show ip interface brief']).results[1].output.join('\n');
    expect(brief).toMatch(/vlan10\s+192\.168\.10\.254\/24\s+down/);
    lab = run(lab, 'SW2', ['configure terminal', 'interface 1/1/1', 'no shutdown']).lab;
    expect(p(lab, 'PC-C', '192.168.10.254').ok).toBe(true);
  });

  it('interface vlan on Aruba requires the VLAN to exist; shutdown works', () => {
    const lab = lab0();
    const r = run(lab, 'SW2', ['configure terminal', 'interface vlan 77']);
    expect(r.results[1].ok).toBe(false);
    const s = run(l3switch(), 'SW2', ['interface vlan 10', 'shutdown']);
    expect(p(s.lab, 'PC-C', '192.168.10.254').ok).toBe(false);
    expect(p(s.lab, 'PC-C', '192.168.10.254').explanation.join(' ')).toMatch(/shutdown/);
    expect(promptOf(s.lab, 'SW2')).toBe('SW2(config-if-vlan)#');
  });

  it('Cisco L2 switch SVI is a management address: pingable, and uses ip default-gateway', () => {
    let lab = lab0();
    lab = run(lab, 'SW1', [...SW1_CFG, 'interface vlan 10', 'ip address 192.168.10.2 255.255.255.0']).lab;
    expect(promptOf(lab, 'SW1')).toBe('SW1(config-if)#');
    expect(p(lab, 'PC-A', '192.168.10.2').ok).toBe(true);
    // reply path of a host: needs a gateway to answer across subnets
    expect(p(lab, 'PC-B', '192.168.10.2').ok).toBe(false); // SW1 has no default-gateway yet → reply cannot leave subnet
    expect(p(lab, 'PC-B', '192.168.10.2').direction).toBe('return');
    lab = run(lab, 'SW1', ['exit', 'ip default-gateway 192.168.10.1']).lab;
    expect(p(lab, 'PC-B', '192.168.10.2').ok).toBe(true);
    // the switch itself can ping with its SVI as source
    const out = run(lab, 'SW1', ['end', 'ping 192.168.10.11', 'ping 172.16.0.10']).results;
    expect(out[1].output.join('\n')).toContain('!!!!!');
    expect(out[2].output.join('\n')).toContain('!!!!!');
  });

  it('a Cisco L2 switch never forwards: using it as a PC gateway fails with an explanation', () => {
    let lab = lab0();
    lab = run(lab, 'SW1', [...SW1_CFG, 'interface vlan 10', 'ip address 192.168.10.2 255.255.255.0']).lab;
    lab = updateDevice(lab, byName(lab, 'PC-A').id, (d) => ({ ...d, gateway: '192.168.10.2' }));
    const r = p(lab, 'PC-A', '172.16.0.10');
    expect(r.ok).toBe(false);
    expect(r.explanation.join(' ')).toMatch(/ไม่ใช่อุปกรณ์ที่ส่งต่อ/);
  });

  it('SVI in a VLAN that is not on the trunk is unreachable and explained', () => {
    let lab = l3switch();
    lab = run(lab, 'SW1', [...SW1_CFG, 'interface gi0/2', 'switchport trunk allowed vlan remove 10']).lab;
    const r = p(lab, 'PC-A', '192.168.10.254');
    expect(r.ok).toBe(false);
    expect(r.explanation.join(' ')).toMatch(/VLAN 10/);
  });

  it('SVI overlap and bad address are rejected', () => {
    const lab = l3switch();
    const r = run(lab, 'SW2', ['interface vlan 20', 'ip address 192.168.10.5/24', 'ip address 10.0.0.0/24']);
    expect(r.results[1].ok).toBe(false);
    expect(r.results[1].output.join(' ')).toContain('overlaps');
    expect(r.results[2].ok).toBe(false);
  });
});

describe('Aruba routed ports', () => {
  it('a routed port with an IP is an L3 interface; L2 ports refuse ip address', () => {
    let lab = lab0();
    const r = run(lab, 'SW2', ['configure terminal', 'interface 1/1/1', 'ip address 10.5.5.1/24']);
    expect(r.results[2].ok).toBe(false);
    expect(r.results[2].output.join(' ')).toContain("'routing'");
    lab = run(lab, 'SW2', ['configure terminal', 'interface 1/1/10', 'ip address 10.5.5.1/24', 'no shutdown']).lab;
    expect(dev(lab, 'SW2').ifaces.find((i) => i.name === '1/1/10')!.ip).toBe('10.5.5.1');
    const brief = run(lab, 'SW2', ['end', 'show ip interface brief']).results[1].output.join('\n');
    expect(brief).toContain('1/1/10');
  });

  it('no routing refuses while an IP is set; vlan trunk on a routed port is refused', () => {
    let lab = lab0();
    lab = run(lab, 'SW2', ['configure terminal', 'interface 1/1/10', 'ip address 10.5.5.1/24']).lab;
    expect(run(lab, 'SW2', ['no routing']).results[0].ok).toBe(false);
    const t = run(lab0(), 'SW2', ['configure terminal', 'interface 1/1/11', 'vlan trunk allowed 10']);
    expect(t.results[2].output.join(' ')).toContain("'no routing'");
  });
});

describe('syntax is separated per vendor / device type', () => {
  const cases: [string, string[], RegExp][] = [
    ['SW2', ['configure terminal', 'interface 1/1/1', 'switchport mode trunk'], /Unknown command/],
    ['SW2', ['configure terminal', 'interface 1/1/1', 'switchport trunk allowed vlan 10'], /Unknown command/],
    ['SW2', ['configure terminal', 'ip route 1.1.1.0 255.255.255.0 10.0.0.1'], /Unknown command|Invalid|Incomplete/],
    ['SW1', ['enable', 'configure terminal', 'interface gi0/1', 'vlan trunk allowed 10'], /Invalid input/],
    ['SW1', ['enable', 'configure terminal', 'ip route 1.1.1.0 255.255.255.0 10.0.0.1'], /Invalid input/], // L2 switch: no static routes
    ['SW1', ['enable', 'configure terminal', 'interface gi0/1.10'], /Invalid input/],
    ['SW1', ['enable', 'configure terminal', 'interface gi0/1', 'ip address 1.1.1.1 255.255.255.0'], /Invalid input/],
    ['SW1', ['enable', 'configure terminal', 'interface gi0/1', 'switchport trunk allowed vlan 5000'], /Invalid input/],
    ['SW1', ['enable', 'configure terminal', 'interface gi0/1', 'switchport trunk allowed vlan 10,,20'], /Invalid input/],
    ['R1', ['enable', 'configure terminal', 'interface gi0/0', 'switchport mode trunk'], /Invalid input/],
    ['R1', ['enable', 'configure terminal', 'interface gi0/0', 'encapsulation dot1Q 10'], /Invalid input/], // only inside a sub-interface
    ['R1', ['enable', 'configure terminal', 'interface vlan 10'], /Invalid input/],
    ['R1', ['enable', 'configure terminal', 'ip default-gateway 10.0.0.1'], /Invalid input/],
  ];
  for (const [name, lines, re] of cases) {
    it(`${name}: ${lines[lines.length - 1]}`, () => {
      const lab = lab0();
      const r = run(lab, name, lines);
      const last = r.results[r.results.length - 1];
      expect(last.ok).toBe(false);
      expect(last.output.join('\n')).toMatch(re);
      expect(configSignature(r.lab)).toBe(configSignature(lab));
    });
  }
});

describe('persistence of the new fields', () => {
  it('round-trips trunks, sub-interfaces, SVIs and routes', () => {
    let lab = lab0();
    lab = run(lab, 'SW2', ['configure terminal', 'interface vlan 10', 'ip address 192.168.10.254/24']).lab;
    const r = parseImport(serializeExport(lab));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(dev(r.lab, 'R1').subifs).toHaveLength(2);
    expect(dev(r.lab, 'R1').routes).toHaveLength(1);
    expect(dev(r.lab, 'SW2').svis[0].ip).toBe('192.168.10.254');
    expect(dev(r.lab, 'SW1').ifaces.find((i) => i.name === 'GigabitEthernet0/1')!.trunkAllowed).toEqual([10, 20]);
    expect(p(r.lab, 'PC-A', '172.16.0.10').ok).toBe(true);
  });

  it('files saved before trunk/SVI/route support still import (defaults applied)', () => {
    const json = JSON.parse(serializeExport(lab0()));
    for (const d of json.lab.devices) {
      delete d.subifs;
      delete d.svis;
      delete d.routes;
      for (const i of d.ifaces) {
        delete i.trunk;
        delete i.trunkAllowed;
        delete i.nativeVlan;
      }
    }
    const r = parseImport(JSON.stringify(json));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.lab.devices.every((d) => Array.isArray(d.subifs) && d.ifaces.every((i) => i.trunk === false))).toBe(true);
  });

  it('rejects inconsistent new data', () => {
    const json = () => JSON.parse(serializeExport(lab0()));
    const mut = (fn: (j: ReturnType<typeof json>) => void) => {
      const j = json();
      fn(j);
      return parseImport(JSON.stringify(j));
    };
    const r1 = mut((j) => (j.lab.devices[0].subifs[0].parent = 'GigabitEthernet9/9'));
    expect(r1.ok).toBe(false);
    const r2 = mut((j) => j.lab.devices.find((d: { name: string }) => d.name === 'PC-A').svis.push({ vlan: 10, adminUp: true, description: '', ip: null, mask: null }));
    expect(r2.ok).toBe(false);
    const r3 = mut((j) => (j.lab.devices[0].routes[0].nextHop = 'nope'));
    expect(r3.ok).toBe(false);
    const r4 = mut((j) => (j.lab.devices[3].ifaces[0].trunkAllowed = [0, 5000]));
    expect(r4.ok).toBe(false);
  });
});

function promptOf(lab: Lab, name: string): string {
  // executing an empty line returns the current prompt without side effects
  return executeLine(lab, byName(lab, name).id, '').prompt;
}
