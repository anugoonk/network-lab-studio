import { addLink, createDevice, emptyLab, updateDevice } from './lab';
import { captureStart } from './challenge';
import { campusGuide, dupIpGuide, interVlanGuide, officeGuide, troubleshootGuide } from './sampleGuides';
import type { Check, Device, Lab } from './types';

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

export const TROUBLE_NAME = 'Challenge: Troubleshooting – ออฟฟิศ Inter-VLAN เสีย';

/**
 * Third sample (challenge mode): the Inter-VLAN lab with three faults injected.
 * Faults: (1) SW1 trunk to SW2 no longer allows VLAN 20, (2) R2 lost its default route,
 * (3) PC-C has a wrong default gateway.
 */
export function buildTroubleshootLab(): Lab {
  let lab = buildInterVlanLab();
  lab = { ...lab, name: TROUBLE_NAME };
  const id = (name: string) => lab.devices.find((d) => d.name === name)!.id;
  lab = updateDevice(lab, id('SW1'), (d) => ({
    ...d,
    ifaces: d.ifaces.map((i) => (i.name === 'GigabitEthernet0/2' ? { ...i, trunkAllowed: [10] } : i)),
  }));
  lab = updateDevice(lab, id('R2'), (d) => ({ ...d, routes: [] }));
  lab = updateDevice(lab, id('PC-C'), (d) => ({ ...d, gateway: '192.168.10.2' }));
  const ping = (n: number, from: string, to: string, label: string): Check => ({ id: `c${n}`, kind: 'ping', label, from: id(from), to, expect: 'success' });
  const checks: Check[] = [
    ping(1, 'PC-A', '192.168.10.12', 'PC-A ติดต่อ PC-C (VLAN 10 เดียวกัน) ได้'),
    ping(2, 'PC-B', '192.168.20.12', 'PC-B ติดต่อ PC-D (VLAN 20 เดียวกัน ข้าม trunk) ได้'),
    ping(3, 'PC-C', '192.168.20.11', 'PC-C ติดต่อ PC-B (ข้าม VLAN ผ่าน R1) ได้'),
    ping(4, 'PC-A', '172.16.0.10', 'PC-A ติดต่อ PC-E (ผ่าน R1 และ R2) ได้'),
    { id: 'c5', kind: 'link-up', label: 'R1 Gi0/0 ลิงก์ up', deviceId: id('R1'), port: 'GigabitEthernet0/0' },
    { id: 'c6', kind: 'no-dup-ip', label: 'ไม่มี IP ซ้ำใน L2 domain เดียวกัน' },
  ];
  lab = {
    ...lab,
    guide: troubleshootGuide(),
    challenge: {
      title: 'ซ่อมเครือข่ายออฟฟิศ',
      goal: 'ผู้ใช้แจ้งว่าเครือข่ายมีหลายจุดใช้งานไม่ได้ ให้หาสาเหตุและแก้ไขจนทุก Check ผ่าน โดยไม่ลบหรือเปลี่ยนสายที่ต่ออยู่',
      checks,
      hints: [
        'ปัญหามี 3 จุดต่างกัน: ดูว่า Check ข้อไหนไม่ผ่านก่อน แล้วไล่จากเครื่องต้นทางไปทีละ hop',
        'ถ้าเครื่องใน VLAN เดียวกันแต่ต่าง switch คุยกันไม่ได้ ให้ดูว่า trunk ระหว่าง switch ยอมให้ VLAN นั้นผ่านหรือไม่ (show interfaces trunk)',
        'ถ้าข้าม VLAN/ข้ามเครือข่ายไม่ได้ ให้ดู default gateway ของ PC และ routing table ของ router (ipconfig / show ip route)',
        'เฉลย: SW1 Gi0/2 ต้องอนุญาต VLAN 20, R2 ต้องมี default route ไป R1, PC-C ต้องใช้ gateway ของ VLAN 10 ที่ถูกต้อง (192.168.10.1)',
      ],
    },
  };
  return withStart(lab);
}

/** remembers the (faulty) starting state so the learner can press "Reset" */
function withStart(lab: Lab): Lab {
  return { ...lab, challenge: { ...lab.challenge!, start: captureStart(lab) } };
}

// ───────────────────────── Challenge 2: duplicate IP + wrong VLAN + shut port ─────────────────────────

export const DUPIP_NAME = 'Challenge: IP ซ้ำ + VLAN ผิด + พอร์ตปิด – Small Office';

/** Small Office with three faults: PC-04 reuses PC-02's address, PC-08 sits in VLAN 20, PC-09's switch port is shut. */
export function buildDupIpLab(): Lab {
  let lab: Lab = { ...buildSampleLab(), name: DUPIP_NAME };
  const id = (name: string) => lab.devices.find((d) => d.name === name)!.id;
  lab = updateDevice(lab, id('PC-04'), (d) => ({ ...d, ifaces: d.ifaces.map((i) => ({ ...i, ip: '192.168.1.102' })) }));
  lab = updateDevice(lab, id('SW2'), (d) => ({
    ...d,
    ifaces: d.ifaces.map((i) => (i.name === '1/1/3' ? { ...i, accessVlan: 20 } : i.name === '1/1/4' ? { ...i, adminUp: false } : i)),
  }));
  const ping = (n: number, from: string, to: string, label: string): Check => ({ id: `c${n}`, kind: 'ping', label, from: id(from), to, expect: 'success' });
  const checks: Check[] = [
    ping(1, 'PC-01', '192.168.1.1', 'PC-01 ติดต่อ gateway (R1) ได้'),
    ping(2, 'PC-08', '192.168.1.1', 'PC-08 ติดต่อ gateway (R1) ได้'),
    ping(3, 'PC-09', '192.168.1.1', 'PC-09 ติดต่อ gateway (R1) ได้'),
    { id: 'c4', kind: 'no-dup-ip', label: 'ไม่มี IP ซ้ำใน L2 domain เดียวกัน' },
  ];
  return withStart({
    ...lab,
    guide: dupIpGuide(),
    challenge: {
      title: 'หาเครื่องที่ IP ซ้ำ และเครื่องที่ต่อไม่ติด',
      goal: 'ผู้ใช้แจ้งว่ามีเครื่องในออฟฟิศต่อเครือข่ายไม่ได้ และบางเครื่อง "ติดๆ ดับๆ" ให้หาสาเหตุทุกจุดแล้วแก้ให้ทุก Check ผ่าน โดยไม่ลบหรือเปลี่ยนสาย',
      checks,
      hints: [
        'ปัญหามี 3 จุด และเป็นคนละชนิดกัน: ดูว่าเครื่องไหนไม่ผ่าน Check แล้วเทียบกับเครื่องที่ผ่าน',
        'ใช้ show ip arp บน router และ show mac address-table บน switch เพื่อหาเครื่องที่ IP ซ้ำ และดูว่าเครื่องอยู่ VLAN ไหน',
        'ดู show interface brief / show vlan บน SW2 ว่ามีพอร์ตที่ถูก shutdown หรืออยู่ผิด VLAN หรือไม่',
        'เฉลย: PC-04 ใช้ IP ซ้ำกับ PC-02 (192.168.1.102), SW2 1/1/3 (PC-08) อยู่ VLAN 20 ต้องกลับเป็น VLAN 10, SW2 1/1/4 (PC-09) ถูก shutdown',
      ],
    },
  });
}

// ───────────────────────── Challenge 3: campus + ISP (L3 switch, new devices) ─────────────────────────

export const CAMPUS_NAME = 'Challenge: Campus + ISP – L3 Switch, Server, AP';

/**
 * Distribution L3 switch (DSW1, AOS-CX) with SVIs as gateways, a Cisco access switch, a router standing in for the ISP and a server.
 * Faults: (1) DSW1 interface vlan 20 is shut down, (2) DSW1 has no default route, (3) ISP1 has no route back to 192.168.10.0/24.
 */
export function buildCampusLab(): Lab {
  let lab = emptyLab(CAMPUS_NAME);
  let n = 0;
  const mk = (kind: Device['kind'], name: string, x: number, y: number) => {
    const d = createDevice(kind, `d${++n}`, name, x, y);
    lab = { ...lab, devices: [...lab.devices, d] };
    return d;
  };
  const isp = mk('isp-router', 'ISP1', 380, 20);
  const srv = mk('server', 'SRV-01', 720, 20);
  const dsw = mk('l3-switch', 'DSW1', 380, 190);
  const sw1 = mk('cisco-switch', 'SW1', 380, 360);
  const pc = mk('pc', 'PC-01', 200, 530);
  const lap = mk('laptop', 'LAP-01', 380, 530);
  const ap = mk('wireless-ap', 'AP1', 560, 530);

  const setIface = (devId: string, port: string, patch: Record<string, unknown>) => {
    lab = updateDevice(lab, devId, (d) => ({ ...d, ifaces: d.ifaces.map((i) => (i.name === port ? { ...i, ...patch } : i)) }));
  };
  const host = (d: Device, ip: string, gw: string) => {
    lab = updateDevice(lab, d.id, (x) => ({ ...x, gateway: gw, ifaces: x.ifaces.map((i) => ({ ...i, ip, mask: '255.255.255.0' })) }));
  };
  const vlans = (def: string) => [
    { id: 1, name: def },
    { id: 10, name: 'USERS' },
    { id: 20, name: 'LAPTOPS' },
  ];

  // ISP: server side + customer side, one static route back to the campus (the one for VLAN 10 is missing — fault 3)
  setIface(isp.id, 'GigabitEthernet0/0', { adminUp: true, ip: '203.0.113.1', mask: '255.255.255.0' });
  setIface(isp.id, 'GigabitEthernet0/1', { adminUp: true, ip: '10.1.1.1', mask: '255.255.255.252' });
  lab = updateDevice(lab, isp.id, (d) => ({ ...d, routes: [{ net: '192.168.20.0', mask: '255.255.255.0', nextHop: '10.1.1.2' }] }));
  host(srv, '203.0.113.10', '203.0.113.1');

  // DSW1: routed uplink, trunk to SW1, SVIs as gateways (VLAN 20 shut — fault 1), no default route (fault 2)
  lab = updateDevice(lab, dsw.id, (d) => ({
    ...d,
    vlans: vlans('DEFAULT_VLAN_1'),
    svis: [
      { vlan: 10, adminUp: true, description: '', ip: '192.168.10.1', mask: '255.255.255.0' },
      { vlan: 20, adminUp: false, description: '', ip: '192.168.20.1', mask: '255.255.255.0' },
    ],
  }));
  setIface(dsw.id, '1/1/24', { adminUp: true, routed: true, ip: '10.1.1.2', mask: '255.255.255.252' });
  setIface(dsw.id, '1/1/1', { adminUp: true, routed: false, trunk: true, trunkAllowed: [10, 20] });

  // SW1: trunk to DSW1, access ports
  lab = updateDevice(lab, sw1.id, (d) => ({ ...d, vlans: vlans('default') }));
  setIface(sw1.id, 'GigabitEthernet0/1', { trunk: true, trunkAllowed: [10, 20] });
  setIface(sw1.id, 'FastEthernet0/1', { accessVlan: 10, modeAccess: true });
  setIface(sw1.id, 'FastEthernet0/2', { accessVlan: 20, modeAccess: true });
  setIface(sw1.id, 'FastEthernet0/3', { accessVlan: 10, modeAccess: true });
  host(pc, '192.168.10.11', '192.168.10.1');
  host(lap, '192.168.20.11', '192.168.20.1');

  const link = (aId: string, ap_: string, bId: string, bp: string) => {
    const r = addLink(lab, { deviceId: aId, port: ap_ }, { deviceId: bId, port: bp });
    if (r.error) throw new Error(r.error);
    lab = r.lab;
  };
  link(isp.id, 'GigabitEthernet0/0', srv.id, 'Ethernet0');
  link(isp.id, 'GigabitEthernet0/1', dsw.id, '1/1/24');
  link(dsw.id, '1/1/1', sw1.id, 'GigabitEthernet0/1');
  link(sw1.id, 'FastEthernet0/1', pc.id, 'Ethernet0');
  link(sw1.id, 'FastEthernet0/2', lap.id, 'Ethernet0');
  link(sw1.id, 'FastEthernet0/3', ap.id, 'Ethernet0');
  lab = { ...lab, counters: { ...lab.counters, __id: n, ISP: 1, DSW: 1, SW: 1, 'SRV-': 1, 'PC-': 1, 'LAP-': 1, AP: 1 } };

  const ping = (k: number, from: Device, to: string, label: string): Check => ({ id: `c${k}`, kind: 'ping', label, from: from.id, to, expect: 'success' });
  const checks: Check[] = [
    ping(1, pc, '192.168.10.1', 'PC-01 ติดต่อ gateway (DSW1 VLAN 10) ได้'),
    ping(2, lap, '192.168.20.1', 'LAP-01 ติดต่อ gateway (DSW1 VLAN 20) ได้'),
    ping(3, pc, '203.0.113.10', 'PC-01 ติดต่อ SRV-01 (ฝั่ง ISP) ได้'),
    ping(4, lap, '203.0.113.10', 'LAP-01 ติดต่อ SRV-01 (ฝั่ง ISP) ได้'),
    { id: 'c5', kind: 'link-up', label: 'DSW1 1/1/24 (ลิงก์ไป ISP1) up', deviceId: dsw.id, port: '1/1/24' },
    { id: 'c6', kind: 'no-dup-ip', label: 'ไม่มี IP ซ้ำใน L2 domain เดียวกัน' },
  ];
  return withStart({
    ...lab,
    guide: campusGuide(),
    challenge: {
      title: 'ซ่อมเครือข่าย Campus ที่ออกอินเทอร์เน็ตไม่ได้',
      goal: 'เพิ่ง cutover โครงสร้างใหม่ (L3 switch เป็น gateway, ISP จำลองด้านบน) ผู้ใช้ใน VLAN ใดก็ออกไปหา server ฝั่ง ISP ไม่ได้ ให้หาสาเหตุทุกชั้นแล้วแก้ให้ทุก Check ผ่าน — มีปัญหามากกว่าหนึ่งจุด และบางจุดจะเห็นก็ต่อเมื่อแก้จุดก่อนหน้าแล้ว',
      checks,
      hints: [
        'เริ่มจาก gateway ของแต่ละ VLAN: ถ้า PC ยัง ping gateway ของตัวเองไม่ได้ ปัญหาอยู่ใกล้ตัวเครื่องก่อน (ยังไม่ต้องดู ISP)',
        'บน DSW1 ใช้ show ip interface brief (หรือ show interface) ดูว่า SVI ของ VLAN ไหนไม่ up',
        'พอถึง gateway แล้วแต่ออก ISP ไม่ได้: ดู routing table ของ DSW1 ว่ามี default route หรือไม่ และ ISP1 รู้จักเครือข่ายภายใน (192.168.10.0/24, 192.168.20.0/24) หรือไม่ — ต้องมีทั้งขาไปและขากลับ',
        'เฉลย: DSW1 interface vlan 20 ถูก shutdown, DSW1 ไม่มี default route ไป ISP1, ISP1 ไม่มี route กลับไป 192.168.10.0/24',
      ],
    },
  });
}

// ───────────────────────── catalog ─────────────────────────

export type SampleKind = 'office' | 'intervlan' | 'trouble' | 'dupip' | 'campus';

export interface SampleInfo {
  /** short name used on buttons and in confirmations */
  title: string;
  /** one-line description (tooltip) */
  hint: string;
  challenge: boolean;
  build: () => Lab;
}

export const SAMPLES: Record<SampleKind, SampleInfo> = {
  office: { title: 'Small Office', hint: 'Cisco + Aruba, VLAN, ping', challenge: false, build: buildSampleLab },
  intervlan: { title: 'Inter-VLAN', hint: 'Trunk, router-on-a-stick, static route, SVI', challenge: false, build: buildInterVlanLab },
  trouble: { title: 'Challenge 1: Inter-VLAN เสีย', hint: 'trunk allowed + default route + gateway ผิด (3 จุด)', challenge: true, build: buildTroubleshootLab },
  dupip: { title: 'Challenge 2: IP ซ้ำ + VLAN ผิด', hint: 'ใช้ show mac address-table / show ip arp หาเครื่องที่ผิด (3 จุด)', challenge: true, build: buildDupIpLab },
  campus: { title: 'Challenge 3: Campus + ISP', hint: 'L3 switch, server, AP — ปัญหาซ้อนกันหลายชั้น (3 จุด)', challenge: true, build: buildCampusLab },
};
