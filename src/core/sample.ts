import { addLink, createDevice, emptyLab, updateDevice } from './lab';
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
  lab = { ...lab, counters: { ...lab.counters, __id: id, R: 1, SW: 2, 'PC-': 10 } };
  return lab;
}
