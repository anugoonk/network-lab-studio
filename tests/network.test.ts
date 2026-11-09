import { describe, expect, it } from 'vitest';
import { ping } from '../src/core/network';
import { addDevice, addLink, updateDevice } from '../src/core/lab';
import { byName, dev, run, sample } from './helpers';

const pingFrom = (lab: ReturnType<typeof sample>, pc: string, ip: string) => ping(lab, byName(lab, pc).id, ip);

describe('sample lab', () => {
  it('has the devices, cables and addressing from the brief', () => {
    const lab = sample();
    expect(lab.devices.map((d) => d.name)).toEqual(['R1', 'SW1', 'SW2', ...Array.from({ length: 10 }, (_, i) => `PC-${String(i + 1).padStart(2, '0')}`)]);
    expect(lab.links).toHaveLength(12);
    expect(dev(lab, 'R1').ifaces[0].ip).toBe('192.168.1.1');
    for (let i = 1; i <= 10; i++) {
      const pc = dev(lab, `PC-${String(i).padStart(2, '0')}`);
      expect(pc.ifaces[0].ip).toBe(`192.168.1.${100 + i}`);
      expect(pc.gateway).toBe('192.168.1.1');
    }
  });

  it('PC-01 pings PC-10 and the gateway at start', () => {
    const lab = sample();
    expect(pingFrom(lab, 'PC-01', '192.168.1.110').ok).toBe(true);
    expect(pingFrom(lab, 'PC-01', '192.168.1.1').ok).toBe(true);
    expect(pingFrom(lab, 'PC-10', '192.168.1.101').ok).toBe(true);
  });
});

describe('acceptance: uplink shutdown on SW2 (Aruba CLI)', () => {
  it('breaks PC-01 → PC-10 but keeps the gateway, and recovers after no shutdown', () => {
    let lab = sample();
    lab = run(lab, 'SW2', ['configure terminal', 'interface 1/1/24', 'shutdown']).lab;
    const r = pingFrom(lab, 'PC-01', '192.168.1.110');
    expect(r.ok).toBe(false);
    expect(r.explanation.join(' ')).toMatch(/1\/1\/24/);
    expect(r.explanation.join(' ')).toMatch(/shutdown/);
    expect(pingFrom(lab, 'PC-01', '192.168.1.1').ok).toBe(true);
    // PCs on the same switch still talk to each other
    expect(pingFrom(lab, 'PC-06', '192.168.1.107').ok).toBe(true);

    lab = run(lab, 'SW2', ['no shutdown']).lab;
    expect(pingFrom(lab, 'PC-01', '192.168.1.110').ok).toBe(true);
  });

  it('shutting the Cisco side of the uplink has the same effect', () => {
    let lab = sample();
    lab = run(lab, 'SW1', ['enable', 'configure terminal', 'interface gi0/2', 'shutdown']).lab;
    expect(pingFrom(lab, 'PC-01', '192.168.1.110').ok).toBe(false);
    expect(pingFrom(lab, 'PC-01', '192.168.1.1').ok).toBe(true);
  });
});

describe('acceptance: VLAN isolation of PC-10', () => {
  it('moves only PC-10 access port to VLAN 20: link stays up but ping fails; back to VLAN 10 recovers', () => {
    let lab = sample();
    lab = run(lab, 'SW2', ['configure terminal', 'interface 1/1/5', 'vlan access 20']).lab;
    const r = pingFrom(lab, 'PC-01', '192.168.1.110');
    expect(r.ok).toBe(false);
    expect(r.explanation.join(' ')).toMatch(/VLAN 10/);
    expect(r.explanation.join(' ')).toMatch(/VLAN 20/);
    // cable present and link up
    const link = lab.links.find((l) => l.a.deviceId === byName(lab, 'PC-10').id)!;
    expect(link).toBeTruthy();
    expect(dev(lab, 'SW2').ifaces.find((i) => i.name === '1/1/5')!.adminUp).toBe(true);
    // others unaffected
    expect(pingFrom(lab, 'PC-01', '192.168.1.109').ok).toBe(true);

    lab = run(lab, 'SW2', ['vlan access 10']).lab;
    expect(pingFrom(lab, 'PC-01', '192.168.1.110').ok).toBe(true);
  });

  it('a VLAN that does not exist on the switch blocks forwarding', () => {
    let lab = sample();
    lab = run(lab, 'SW2', ['configure terminal', 'no vlan 10']).lab;
    expect(pingFrom(lab, 'PC-06', '192.168.1.107').ok).toBe(false);
  });
});

describe('acceptance: gateway vs subnet', () => {
  it('wrong gateway still allows same-subnet ping', () => {
    let lab = sample();
    const pc = byName(lab, 'PC-01');
    lab = updateDevice(lab, pc.id, (d) => ({ ...d, gateway: '192.168.1.254' }));
    expect(pingFrom(lab, 'PC-01', '192.168.1.110').ok).toBe(true);
    // gateway itself is same-subnet, so it is still reachable
    expect(pingFrom(lab, 'PC-01', '192.168.1.1').ok).toBe(true);
  });

  /** second subnet: R1 Gi0/1 = 10.0.0.1/24 → SW3(Cisco) → PC-X 10.0.0.10 */
  function twoSubnetLab() {
    let lab = sample();
    let r = addDevice(lab, 'cisco-switch', 0, 0);
    lab = r.lab;
    const sw3 = r.device;
    r = addDevice(lab, 'pc', 0, 0);
    lab = r.lab;
    const far = r.device;
    lab = updateDevice(lab, far.id, (d) => ({
      ...d,
      gateway: '10.0.0.1',
      ifaces: d.ifaces.map((i) => ({ ...i, ip: '10.0.0.10', mask: '255.255.255.0' })),
    }));
    lab = addLink(lab, { deviceId: byName(lab, 'R1').id, port: 'GigabitEthernet0/1' }, { deviceId: sw3.id, port: 'FastEthernet0/1' }).lab;
    lab = addLink(lab, { deviceId: far.id, port: 'Ethernet0' }, { deviceId: sw3.id, port: 'FastEthernet0/2' }).lab;
    lab = run(lab, 'R1', ['enable', 'configure terminal', 'interface gi0/1', 'ip address 10.0.0.1 255.255.255.0', 'no shutdown']).lab;
    return { lab, far };
  }

  it('routes between two subnets through R1 and checks the return path', () => {
    const { lab, far } = twoSubnetLab();
    expect(pingFrom(lab, 'PC-01', '10.0.0.10').ok).toBe(true);
    const back = ping(lab, far.id, '192.168.1.101');
    expect(back.ok).toBe(true);
  });

  it('wrong gateway on PC-01 breaks cross-subnet ping only', () => {
    const { lab: l0 } = twoSubnetLab();
    const lab = updateDevice(l0, byName(l0, 'PC-01').id, (d) => ({ ...d, gateway: '192.168.1.254' }));
    const r = pingFrom(lab, 'PC-01', '10.0.0.10');
    expect(r.ok).toBe(false);
    expect(r.explanation.join(' ')).toMatch(/gateway/i);
    expect(pingFrom(lab, 'PC-01', '192.168.1.110').ok).toBe(true);
  });

  it('missing gateway is reported', () => {
    const { lab: l0 } = twoSubnetLab();
    const lab = updateDevice(l0, byName(l0, 'PC-01').id, (d) => ({ ...d, gateway: null }));
    const r = pingFrom(lab, 'PC-01', '10.0.0.10');
    expect(r.ok).toBe(false);
    expect(r.kind).toBe('general-failure');
  });

  it('fails on the return path when the far PC has no gateway (one-way)', () => {
    const { lab: l0, far } = twoSubnetLab();
    const lab = updateDevice(l0, far.id, (d) => ({ ...d, gateway: null }));
    const r = pingFrom(lab, 'PC-01', '10.0.0.10');
    expect(r.ok).toBe(false);
    expect(r.direction).toBe('return');
  });

  it('shutting R1 LAN interface breaks the gateway', () => {
    let lab = sample();
    lab = run(lab, 'R1', ['enable', 'configure terminal', 'interface gi0/0', 'shutdown']).lab;
    expect(pingFrom(lab, 'PC-01', '192.168.1.1').ok).toBe(false);
    expect(pingFrom(lab, 'PC-01', '192.168.1.110').ok).toBe(true);
  });
});

describe('topology edits', () => {
  it('removing a cable changes ping immediately', () => {
    const lab = sample();
    const link = lab.links.find((l) => l.a.port === 'GigabitEthernet0/2' || l.b.port === 'GigabitEthernet0/2')!;
    const cut = { ...lab, links: lab.links.filter((l) => l !== link) };
    expect(pingFrom(cut, 'PC-01', '192.168.1.110').ok).toBe(false);
    expect(pingFrom(cut, 'PC-01', '192.168.1.1').ok).toBe(true);
    expect(pingFrom(cut, 'PC-01', '192.168.1.110').explanation.join(' ')).toMatch(/สาย/);
  });

  it('a layer-2 loop does not hang the engine', () => {
    let lab = sample();
    // second cable between SW1 and SW2 (loop)
    lab = addLink(lab, { deviceId: byName(lab, 'SW1').id, port: 'FastEthernet0/10' }, { deviceId: byName(lab, 'SW2').id, port: '1/1/10' }).lab;
    lab = run(lab, 'SW2', ['configure terminal', 'interface 1/1/10', 'no routing', 'vlan access 10', 'no shutdown']).lab;
    lab = run(lab, 'SW1', ['enable', 'configure terminal', 'interface fa0/10', 'switchport access vlan 10']).lab;
    expect(pingFrom(lab, 'PC-01', '192.168.1.110').ok).toBe(true);
    // cutting the original uplink: loop cable keeps the path alive
    lab = run(lab, 'SW2', ['interface 1/1/24', 'shutdown']).lab;
    expect(pingFrom(lab, 'PC-01', '192.168.1.110').ok).toBe(true);
  });

  it('a new PC added to a free port with VLAN and IP can ping (no source changes needed)', () => {
    let lab = sample();
    const r = addDevice(lab, 'pc', 0, 0);
    lab = r.lab;
    lab = addLink(lab, { deviceId: r.device.id, port: 'Ethernet0' }, { deviceId: byName(lab, 'SW1').id, port: 'FastEthernet0/6' }).lab;
    lab = run(lab, 'SW1', ['enable', 'configure terminal', 'interface fa0/6', 'switchport mode access', 'switchport access vlan 10']).lab;
    lab = updateDevice(lab, r.device.id, (d) => ({
      ...d,
      gateway: '192.168.1.1',
      ifaces: d.ifaces.map((i) => ({ ...i, ip: '192.168.1.120', mask: '255.255.255.0' })),
    }));
    expect(ping(lab, r.device.id, '192.168.1.110').ok).toBe(true);
    expect(ping(lab, r.device.id, '192.168.1.1').ok).toBe(true);
  });

  it('terminal ping and ipconfig use the same data', () => {
    let lab = sample();
    const res = run(lab, 'PC-01', ['ping 192.168.1.110', 'ipconfig']);
    expect(res.results[0].output.join('\n')).toContain('Reply from 192.168.1.110');
    expect(res.results[1].output.join('\n')).toContain('192.168.1.101');
    lab = run(lab, 'SW2', ['configure terminal', 'interface 1/1/24', 'shutdown']).lab;
    const res2 = run(lab, 'PC-01', ['ping 192.168.1.110']);
    expect(res2.results[0].output.join('\n')).toContain('Destination host unreachable');
  });
});
