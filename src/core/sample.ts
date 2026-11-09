import { addLink, createDevice, emptyLab, updateDevice } from './lab';
import { interVlanGuide, officeGuide } from './sampleGuides';
import type { Device, Lab } from './types';

export const SAMPLE_NAME = 'Small Office – Cisco & Aruba';

/** Port plan of the sample lab (shown to learners in the exercise text). */
export const SAMPLE_PORTS = {
  r1ToSw1: { r1: 'GigabitEthernet0/0', sw1: 'GigabitEthernet0/1' },
  sw1ToSw2: { sw1: 'GigabitEthernet0/2', sw2: '1/1/24' },
  sw1PcPort: (n: number) => `FastEthernet0/${n}`, // PC-01..05 -> n = 1..5
  sw2PcPort: (n: number) => `1/1/${n}`, // PC-06..10 -> n = 1..5
};

export function buildSampleLab(): Lab {
  let lab = emptyLab(SAMPLE_NAME);
  let id = 0;
  const mk = (kind: Device['kind'], name: string, x: number, y: number) => {
    const d = createDevice(kind, `d${++id}`, name, x, y);
    lab = { ...lab, devices: [...lab.devices, d] };
    return d;
  };

  const r1 = mk('cisco-router', 'R1', 400, 20);
  const sw1 = mk('cisco-switch', 'SW1', 400, 190);
  const sw2 = mk('aruba-switch', 'SW2', 1000, 190);
  const pcs: Device[] = [];
  for (let i = 1; i <= 10; i++) {
    const col = i <= 5 ? i - 1 : i - 6;
    const baseX = i <= 5 ? 190 : 780;
    pcs.push(mk('pc', `PC-${String(i).padStart(2, '0')}`, baseX + col * 110, 420));
  }

  // VLAN 10 is used by every active port; VLAN 20 is pre-created for the exercises.
  const vlans = (defName: string) => [
    { id: 1, name: defName },
    { id: 10, name: 'OFFICE' },
    { id: 20, name: 'GUEST' },
  ];
  lab = updateDevice(lab, sw1.id, (d) => ({ ...d, vlans: vlans('default') }));
  lab = updateDevice(lab, sw2.id, (d) => ({ ...d, vlans: vlans('DEFAULT_VLAN_1') }));

  // Router: routed interface toward SW1
  lab = updateDevice(lab, r1.id, (d) => ({
    ...d,
    ifaces: d.ifaces.map((i) =>
      i.name === SAMPLE_PORTS.r1ToSw1.r1 ? { ...i, adminUp: true, ip: '192.168.1.1', mask: '255.255.255.0' } : i,
    ),
  }));

  const sw1Used = new Set<string>([SAMPLE_PORTS.r1ToSw1.sw1, SAMPLE_PORTS.sw1ToSw2.sw1]);
  for (let n = 1; n <= 5; n++) sw1Used.add(SAMPLE_PORTS.sw1PcPort(n));
  lab = updateDevice(lab, sw1.id, (d) => ({
    ...d,
    ifaces: d.ifaces.map((i) => (sw1Used.has(i.name) ? { ...i, accessVlan: 10, modeAccess: true } : i)),
  }));

  const sw2Used = new Set<string>([SAMPLE_PORTS.sw1ToSw2.sw2]);
  for (let n = 1; n <= 5; n++) sw2Used.add(SAMPLE_PORTS.sw2PcPort(n));
  lab = updateDevice(lab, sw2.id, (d) => ({
    ...d,
    ifaces: d.ifaces.map((i) => (sw2Used.has(i.name) ? { ...i, adminUp: true, routed: false, accessVlan: 10 } : i)),
  }));

  pcs.forEach((pc, idx) => {
    lab = updateDevice(lab, pc.id, (d) => ({
      ...d,
      gateway: '192.168.1.1',
      ifaces: d.ifaces.map((i) => ({ ...i, ip: `192.168.1.${101 + idx}`, mask: '255.255.255.0' })),
    }));
  });

  const link = (aId: string, ap: string, bId: string, bp: string) => {
    const r = addLink(lab, { deviceId: aId, port: ap }, { deviceId: bId, port: bp });
    if (r.error) throw new Error(r.error);
    lab = r.lab;
  };
  link(r1.id, SAMPLE_PORTS.r1ToSw1.r1, sw1.id, SAMPLE_PORTS.r1ToSw1.sw1);
  link(sw1.id, SAMPLE_PORTS.sw1ToSw2.sw1, sw2.id, SAMPLE_PORTS.sw1ToSw2.sw2);
  for (let n = 1; n <= 5; n++) {
    link(pcs[n - 1].id, 'Ethernet0', sw1.id, SAMPLE_PORTS.sw1PcPort(n));
    link(pcs[n + 4].id, 'Ethernet0', sw2.id, SAMPLE_PORTS.sw2PcPort(n));
  }
  lab = { ...lab, counters: { ...lab.counters, __id: id, R: 1, SW: 2, 'PC-': 10 }, guide: officeGuide() };
  return lab;
}

export const INTERVLAN_NAME = 'Inter-VLAN Routing – Trunk, Router-on-a-Stick & Static Route';

/** Second sample: 802.1Q trunks, router-on-a-stick sub-interfaces, static + default routes. */
export function buildInterVlanLab(): Lab {
  let lab = emptyLab(INTERVLAN_NAME);
  let id = 0;
  const mk = (kind: Device['kind'], name: string, x: number, y: number) => {
    const d = createDevice(kind, `d${++id}`, name, x, y);
    lab = { ...lab, devices: [...lab.devices, d] };
    return d;
  };
  const r1 = mk('cisco-router', 'R1', 420, 30);
  const r2 = mk('cisco-router', 'R2', 820, 30);
  const pcE = mk('pc', 'PC-E', 1100, 30);
  const sw1 = mk('cisco-switch', 'SW1', 420, 210);
  const sw2 = mk('aruba-switch', 'SW2', 820, 210);
  const pcA = mk('pc', 'PC-A', 300, 400);
  const pcB = mk('pc', 'PC-B', 440, 400);
  const pcC = mk('pc', 'PC-C', 740, 400);
  const pcD = mk('pc', 'PC-D', 880, 400);

  const vlans = (def: string) => [
    { id: 1, name: def },
    { id: 10, name: 'USERS' },
    { id: 20, name: 'GUEST' },
  ];
  const setIface = (devId: string, port: string, patch: Record<string, unknown>) => {
    lab = updateDevice(lab, devId, (d) => ({ ...d, ifaces: d.ifaces.map((i) => (i.name === port ? { ...i, ...patch } : i)) }));
  };

  lab = updateDevice(lab, sw1.id, (d) => ({ ...d, vlans: vlans('default') }));
  lab = updateDevice(lab, sw2.id, (d) => ({ ...d, vlans: vlans('DEFAULT_VLAN_1') }));

  // SW1 (Cisco): Gi0/1 trunk → R1, Gi0/2 trunk → SW2, Fa0/1 = VLAN 10, Fa0/2 = VLAN 20
  for (const p of ['GigabitEthernet0/1', 'GigabitEthernet0/2']) setIface(sw1.id, p, { trunk: true, trunkAllowed: [10, 20] });
  setIface(sw1.id, 'FastEthernet0/1', { accessVlan: 10, modeAccess: true });
  setIface(sw1.id, 'FastEthernet0/2', { accessVlan: 20, modeAccess: true });
  // SW2 (Aruba): 1/1/24 trunk, 1/1/1 = VLAN 10, 1/1/2 = VLAN 20
  setIface(sw2.id, '1/1/24', { adminUp: true, routed: false, trunk: true, trunkAllowed: [10, 20] });
  setIface(sw2.id, '1/1/1', { adminUp: true, routed: false, accessVlan: 10 });
  setIface(sw2.id, '1/1/2', { adminUp: true, routed: false, accessVlan: 20 });

  // R1: router-on-a-stick on Gi0/0, WAN-ish link to R2 on Gi0/1, static route to 172.16.0.0/24
  setIface(r1.id, 'GigabitEthernet0/0', { adminUp: true });
  setIface(r1.id, 'GigabitEthernet0/1', { adminUp: true, ip: '10.0.0.1', mask: '255.255.255.252' });
  lab = updateDevice(lab, r1.id, (d) => ({
    ...d,
    subifs: [
      { parent: 'GigabitEthernet0/0', id: 10, vlan: 10, adminUp: true, description: '', ip: '192.168.10.1', mask: '255.255.255.0' },
      { parent: 'GigabitEthernet0/0', id: 20, vlan: 20, adminUp: true, description: '', ip: '192.168.20.1', mask: '255.255.255.0' },
    ],
    routes: [{ net: '172.16.0.0', mask: '255.255.255.0', nextHop: '10.0.0.2' }],
  }));
  // R2: default route back to R1
  setIface(r2.id, 'GigabitEthernet0/0', { adminUp: true, ip: '10.0.0.2', mask: '255.255.255.252' });
  setIface(r2.id, 'GigabitEthernet0/1', { adminUp: true, ip: '172.16.0.1', mask: '255.255.255.0' });
  lab = updateDevice(lab, r2.id, (d) => ({ ...d, routes: [{ net: '0.0.0.0', mask: '0.0.0.0', nextHop: '10.0.0.1' }] }));

  const pc = (d: Device, ip: string, gw: string) => {
    lab = updateDevice(lab, d.id, (x) => ({
      ...x,
      gateway: gw,
      ifaces: x.ifaces.map((i) => ({ ...i, ip, mask: '255.255.255.0' })),
    }));
  };
  pc(pcA, '192.168.10.11', '192.168.10.1');
  pc(pcB, '192.168.20.11', '192.168.20.1');
  pc(pcC, '192.168.10.12', '192.168.10.1');
  pc(pcD, '192.168.20.12', '192.168.20.1');
  pc(pcE, '172.16.0.10', '172.16.0.1');

  const link = (aId: string, ap: string, bId: string, bp: string) => {
    const r = addLink(lab, { deviceId: aId, port: ap }, { deviceId: bId, port: bp });
    if (r.error) throw new Error(r.error);
    lab = r.lab;
  };
  link(r1.id, 'GigabitEthernet0/0', sw1.id, 'GigabitEthernet0/1');
  link(sw1.id, 'GigabitEthernet0/2', sw2.id, '1/1/24');
  link(r1.id, 'GigabitEthernet0/1', r2.id, 'GigabitEthernet0/0');
  link(r2.id, 'GigabitEthernet0/1', pcE.id, 'Ethernet0');
  link(pcA.id, 'Ethernet0', sw1.id, 'FastEthernet0/1');
  link(pcB.id, 'Ethernet0', sw1.id, 'FastEthernet0/2');
  link(pcC.id, 'Ethernet0', sw2.id, '1/1/1');
  link(pcD.id, 'Ethernet0', sw2.id, '1/1/2');
  lab = { ...lab, counters: { ...lab.counters, __id: id, R: 2, SW: 2, 'PC-': 5 }, guide: interVlanGuide() };
  return lab;
}
