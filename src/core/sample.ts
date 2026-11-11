import { addLink, createDevice, emptyLab, updateDevice } from './lab';
import { captureStart } from './challenge';
import { scratchGuide, addressingGuide, layer2Guide, campus3ChallengeGuide, campus3Guide, campusGuide, dupIpGuide, interVlanGuide, officeGuide, troubleshootGuide } from './sampleGuides';
import type { Check, Device, Lab } from './types';
import { tx } from '../i18n';

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

export const TROUBLE_NAME = tx('Challenge: Troubleshooting – ออฟฟิศ Inter-VLAN เสีย');

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
    ping(1, 'PC-A', '192.168.10.12', tx('PC-A ติดต่อ PC-C (VLAN 10 เดียวกัน) ได้')),
    ping(2, 'PC-B', '192.168.20.12', tx('PC-B ติดต่อ PC-D (VLAN 20 เดียวกัน ข้าม trunk) ได้')),
    ping(3, 'PC-C', '192.168.20.11', tx('PC-C ติดต่อ PC-B (ข้าม VLAN ผ่าน R1) ได้')),
    ping(4, 'PC-A', '172.16.0.10', tx('PC-A ติดต่อ PC-E (ผ่าน R1 และ R2) ได้')),
    { id: 'c5', kind: 'link-up', label: tx('R1 Gi0/0 ลิงก์ up'), deviceId: id('R1'), port: 'GigabitEthernet0/0' },
    { id: 'c6', kind: 'no-dup-ip', label: tx('ไม่มี IP ซ้ำใน L2 domain เดียวกัน') },
  ];
  lab = {
    ...lab,
    guide: troubleshootGuide(),
    challenge: {
      title: tx('ซ่อมเครือข่ายออฟฟิศ'),
      goal: tx('ผู้ใช้แจ้งว่าเครือข่ายมีหลายจุดใช้งานไม่ได้ ให้หาสาเหตุและแก้ไขจนทุก Check ผ่าน โดยไม่ลบหรือเปลี่ยนสายที่ต่ออยู่'),
      checks,
      hints: [
        tx('ปัญหามี 3 จุดต่างกัน: ดูว่า Check ข้อไหนไม่ผ่านก่อน แล้วไล่จากเครื่องต้นทางไปทีละ hop'),
        tx('ถ้าเครื่องใน VLAN เดียวกันแต่ต่าง switch คุยกันไม่ได้ ให้ดูว่า trunk ระหว่าง switch ยอมให้ VLAN นั้นผ่านหรือไม่ (show interfaces trunk)'),
        tx('ถ้าข้าม VLAN/ข้ามเครือข่ายไม่ได้ ให้ดู default gateway ของ PC และ routing table ของ router (ipconfig / show ip route)'),
        tx('เฉลย: SW1 Gi0/2 ต้องอนุญาต VLAN 20, R2 ต้องมี default route ไป R1, PC-C ต้องใช้ gateway ของ VLAN 10 ที่ถูกต้อง (192.168.10.1)'),
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

export const DUPIP_NAME = tx('Challenge: IP ซ้ำ + VLAN ผิด + พอร์ตปิด – Small Office');

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
    ping(1, 'PC-01', '192.168.1.1', tx('PC-01 ติดต่อ gateway (R1) ได้')),
    ping(2, 'PC-08', '192.168.1.1', tx('PC-08 ติดต่อ gateway (R1) ได้')),
    ping(3, 'PC-09', '192.168.1.1', tx('PC-09 ติดต่อ gateway (R1) ได้')),
    { id: 'c4', kind: 'no-dup-ip', label: tx('ไม่มี IP ซ้ำใน L2 domain เดียวกัน') },
  ];
  return withStart({
    ...lab,
    guide: dupIpGuide(),
    challenge: {
      title: tx('หาเครื่องที่ IP ซ้ำ และเครื่องที่ต่อไม่ติด'),
      goal: tx('ผู้ใช้แจ้งว่ามีเครื่องในออฟฟิศต่อเครือข่ายไม่ได้ และบางเครื่อง "ติดๆ ดับๆ" ให้หาสาเหตุทุกจุดแล้วแก้ให้ทุก Check ผ่าน โดยไม่ลบหรือเปลี่ยนสาย'),
      checks,
      hints: [
        tx('ปัญหามี 3 จุด และเป็นคนละชนิดกัน: ดูว่าเครื่องไหนไม่ผ่าน Check แล้วเทียบกับเครื่องที่ผ่าน'),
        tx('ใช้ show ip arp บน router และ show mac address-table บน switch เพื่อหาเครื่องที่ IP ซ้ำ และดูว่าเครื่องอยู่ VLAN ไหน'),
        tx('ดู show interface brief / show vlan บน SW2 ว่ามีพอร์ตที่ถูก shutdown หรืออยู่ผิด VLAN หรือไม่'),
        tx('เฉลย: PC-04 ใช้ IP ซ้ำกับ PC-02 (192.168.1.102), SW2 1/1/3 (PC-08) อยู่ VLAN 20 ต้องกลับเป็น VLAN 10, SW2 1/1/4 (PC-09) ถูก shutdown'),
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
    ping(1, pc, '192.168.10.1', tx('PC-01 ติดต่อ gateway (DSW1 VLAN 10) ได้')),
    ping(2, lap, '192.168.20.1', tx('LAP-01 ติดต่อ gateway (DSW1 VLAN 20) ได้')),
    ping(3, pc, '203.0.113.10', tx('PC-01 ติดต่อ SRV-01 (ฝั่ง ISP) ได้')),
    ping(4, lap, '203.0.113.10', tx('LAP-01 ติดต่อ SRV-01 (ฝั่ง ISP) ได้')),
    { id: 'c5', kind: 'link-up', label: tx('DSW1 1/1/24 (ลิงก์ไป ISP1) up'), deviceId: dsw.id, port: '1/1/24' },
    { id: 'c6', kind: 'no-dup-ip', label: tx('ไม่มี IP ซ้ำใน L2 domain เดียวกัน') },
  ];
  return withStart({
    ...lab,
    guide: campusGuide(),
    challenge: {
      title: tx('ซ่อมเครือข่าย Campus ที่ออกอินเทอร์เน็ตไม่ได้'),
      goal: tx('เพิ่ง cutover โครงสร้างใหม่ (L3 switch เป็น gateway, ISP จำลองด้านบน) ผู้ใช้ใน VLAN ใดก็ออกไปหา server ฝั่ง ISP ไม่ได้ ให้หาสาเหตุทุกชั้นแล้วแก้ให้ทุก Check ผ่าน — มีปัญหามากกว่าหนึ่งจุด และบางจุดจะเห็นก็ต่อเมื่อแก้จุดก่อนหน้าแล้ว'),
      checks,
      hints: [
        tx('เริ่มจาก gateway ของแต่ละ VLAN: ถ้า PC ยัง ping gateway ของตัวเองไม่ได้ ปัญหาอยู่ใกล้ตัวเครื่องก่อน (ยังไม่ต้องดู ISP)'),
        tx('บน DSW1 ใช้ show ip interface brief (หรือ show interface) ดูว่า SVI ของ VLAN ไหนไม่ up'),
        tx('พอถึง gateway แล้วแต่ออก ISP ไม่ได้: ดู routing table ของ DSW1 ว่ามี default route หรือไม่ และ ISP1 รู้จักเครือข่ายภายใน (192.168.10.0/24, 192.168.20.0/24) หรือไม่ — ต้องมีทั้งขาไปและขากลับ'),
        tx('เฉลย: DSW1 interface vlan 20 ถูก shutdown, DSW1 ไม่มี default route ไป ISP1, ISP1 ไม่มี route กลับไป 192.168.10.0/24'),
      ],
    },
  });
}

// ───────────────────────── Campus 3 Tier (Aruba CX), simplified ─────────────────────────

export const CAMPUS3_NAME = 'Campus 3 Tier – Aruba CX (static route)';

/**
 * Simplified version of Aruba's "Campus 3 Tier L2 Access with VSX and OSPF" lab, using only what the simulator has:
 * core (X, Y) – distribution (A, B) – access (C), routed /31 links, SVIs, static routes. No VSX, LAG, active-gateway, VRF,
 * loopback or OSPF: SwitchA is the gateway of both VLANs, SwitchB is a second gateway reachable over the A–B trunk, and the
 * access switch is single-homed (dual-homing without VSX/STP would form a Layer 2 loop).
 */
export function buildCampus3Lab(): Lab {
  let lab = emptyLab(CAMPUS3_NAME);
  let n = 0;
  const mk = (kind: Device['kind'], name: string, x: number, y: number) => {
    const d = createDevice(kind, `d${++n}`, name, x, y);
    lab = { ...lab, devices: [...lab.devices, d] };
    return d;
  };
  const core1 = mk('l3-switch', 'SwitchX-Core-1', 240, 20);
  const core2 = mk('l3-switch', 'SwitchY-Core-2', 700, 20);
  const swA = mk('l3-switch', 'SwitchA-VSX', 240, 230);
  const swB = mk('l3-switch', 'SwitchB-VSX', 700, 230);
  const acc = mk('aruba-switch', 'SwitchC-Access', 470, 430);
  const vpc1 = mk('pc', 'VPC1', 330, 620);
  const vpc2 = mk('pc', 'VPC2', 610, 620);

  const setIface = (devId: string, port: string, patch: Record<string, unknown>) => {
    lab = updateDevice(lab, devId, (d) => ({ ...d, ifaces: d.ifaces.map((i) => (i.name === port ? { ...i, ...patch } : i)) }));
  };
  const routed = (d: Device, port: string, ip: string) => setIface(d.id, port, { adminUp: true, routed: true, ip, mask: '255.255.255.254' });
  const trunk = (d: Device, port: string) => setIface(d.id, port, { adminUp: true, routed: false, trunk: true, trunkAllowed: [100, 200] });
  const access = (d: Device, port: string, vlan: number) => setIface(d.id, port, { adminUp: true, routed: false, accessVlan: vlan });
  const vlans = [
    { id: 1, name: 'DEFAULT_VLAN_1' },
    { id: 100, name: 'VLAN100' },
    { id: 200, name: 'VLAN200' },
  ];
  const route = (d: Device, net: string, mask: string, nextHop: string) => {
    lab = updateDevice(lab, d.id, (x) => ({ ...x, routes: [...x.routes, { net, mask, nextHop }] }));
  };
  const withSvis = (d: Device, last: number) => {
    lab = updateDevice(lab, d.id, (x) => ({
      ...x,
      vlans,
      svis: [
        { vlan: 100, adminUp: true, description: '', ip: `10.10.100.${last}`, mask: '255.255.255.0' },
        { vlan: 200, adminUp: true, description: '', ip: `10.10.200.${last}`, mask: '255.255.255.0' },
      ],
    }));
  };

  // routed /31 links (core ↔ distribution, core ↔ core)
  routed(core1, '1/1/1', '192.168.4.8');
  routed(swA, '1/1/1', '192.168.4.9');
  routed(core1, '1/1/2', '192.168.4.12');
  routed(swB, '1/1/1', '192.168.4.13');
  routed(core2, '1/1/1', '192.168.4.16');
  routed(swA, '1/1/2', '192.168.4.17');
  routed(core2, '1/1/2', '192.168.4.20');
  routed(swB, '1/1/2', '192.168.4.21');
  routed(core1, '1/1/3', '192.168.4.24');
  routed(core2, '1/1/3', '192.168.4.25');

  // distribution: SVIs (gateways), ISL trunk A–B, trunk down to the access switch
  withSvis(swA, 252);
  withSvis(swB, 253);
  trunk(swA, '1/1/3');
  trunk(swB, '1/1/3');
  trunk(swA, '1/1/4');
  lab = updateDevice(lab, acc.id, (x) => ({ ...x, vlans }));
  trunk(acc, '1/1/1');
  access(acc, '1/1/3', 100);
  access(acc, '1/1/4', 200);

  // static routes instead of OSPF: distribution defaults up to Core-1, cores point the user VLANs at SwitchA
  route(swA, '0.0.0.0', '0.0.0.0', '192.168.4.8');
  route(swB, '0.0.0.0', '0.0.0.0', '192.168.4.12');
  for (const [core, viaA] of [[core1, '192.168.4.9'], [core2, '192.168.4.17']] as const) {
    route(core, '10.10.100.0', '255.255.255.0', viaA);
    route(core, '10.10.200.0', '255.255.255.0', viaA);
  }

  const host = (d: Device, ip: string, gw: string) => {
    lab = updateDevice(lab, d.id, (x) => ({ ...x, gateway: gw, ifaces: x.ifaces.map((i) => ({ ...i, ip, mask: '255.255.255.0' })) }));
  };
  host(vpc1, '10.10.100.11', '10.10.100.252');
  host(vpc2, '10.10.200.11', '10.10.200.252');

  const link = (a: Device, ap_: string, b: Device, bp: string) => {
    const r = addLink(lab, { deviceId: a.id, port: ap_ }, { deviceId: b.id, port: bp });
    if (r.error) throw new Error(r.error);
    lab = r.lab;
  };
  link(core1, '1/1/1', swA, '1/1/1');
  link(core1, '1/1/2', swB, '1/1/1');
  link(core2, '1/1/1', swA, '1/1/2');
  link(core2, '1/1/2', swB, '1/1/2');
  link(core1, '1/1/3', core2, '1/1/3');
  link(swA, '1/1/3', swB, '1/1/3');
  link(swA, '1/1/4', acc, '1/1/1');
  link(acc, '1/1/3', vpc1, 'Ethernet0');
  link(acc, '1/1/4', vpc2, 'Ethernet0');
  lab = { ...lab, counters: { ...lab.counters, __id: n } };
  return { ...lab, guide: campus3Guide() };
}

// ───────────────────────── Challenge 4: Campus 3 Tier with faults ─────────────────────────

export const CAMPUS3_TROUBLE_NAME = 'Challenge: Campus 3 Tier – Aruba CX';

/**
 * Campus 3 Tier with three faults: (1) SwitchA's trunk to the access switch no longer allows VLAN 200,
 * (2) SwitchA's default route points at a next hop that does not exist, (3) Core-2 lost its return route to 10.10.100.0/24.
 */
export function buildCampus3TroubleLab(): Lab {
  let lab: Lab = { ...buildCampus3Lab(), name: CAMPUS3_TROUBLE_NAME };
  const id = (name: string) => lab.devices.find((d) => d.name === name)!.id;
  lab = updateDevice(lab, id('SwitchA-VSX'), (d) => ({
    ...d,
    ifaces: d.ifaces.map((i) => (i.name === '1/1/4' ? { ...i, trunkAllowed: [100] } : i)),
    routes: d.routes.map((r) => (r.net === '0.0.0.0' ? { ...r, nextHop: '192.168.4.18' } : r)),
  }));
  lab = updateDevice(lab, id('SwitchY-Core-2'), (d) => ({ ...d, routes: d.routes.filter((r) => r.net !== '10.10.100.0') }));
  const ping = (n: number, from: string, to: string, label: string): Check => ({ id: `c${n}`, kind: 'ping', label, from: id(from), to, expect: 'success' });
  const checks: Check[] = [
    ping(1, 'VPC1', '10.10.100.252', tx('VPC1 ติดต่อ gateway (SwitchA VLAN 100) ได้')),
    ping(2, 'VPC2', '10.10.200.252', tx('VPC2 ติดต่อ gateway (SwitchA VLAN 200) ได้')),
    ping(3, 'VPC1', '10.10.200.11', tx('VPC1 ติดต่อ VPC2 (ข้าม VLAN ผ่าน SwitchA) ได้')),
    ping(4, 'VPC1', '192.168.4.8', tx('VPC1 ติดต่อ Core-1 ได้')),
    ping(5, 'VPC1', '192.168.4.25', tx('VPC1 ติดต่อ Core-2 (ผ่าน Core-1) ได้')),
    { id: 'c6', kind: 'link-up', label: tx('SwitchA 1/1/4 (ลิงก์ไป Access) up'), deviceId: id('SwitchA-VSX'), port: '1/1/4' },
    { id: 'c7', kind: 'no-dup-ip', label: tx('ไม่มี IP ซ้ำใน L2 domain เดียวกัน') },
  ];
  return withStart({
    ...lab,
    guide: campus3ChallengeGuide(),
    challenge: {
      title: tx('ซ่อม Campus 3 Tier ที่ใช้งานได้ไม่ครบ'),
      goal: tx('หลังแก้ config ล่าสุด ผู้ใช้บาง VLAN ใช้งานไม่ได้ และเครื่องใน VLAN 100 ไปไม่ถึง Core-2 ให้หาสาเหตุทุกจุดแล้วแก้ให้ทุก Check ผ่าน โดยไม่ลบหรือเปลี่ยนสาย — มีปัญหามากกว่าหนึ่งจุด และบางจุดจะเห็นก็ต่อเมื่อแก้จุดก่อนหน้าแล้ว'),
      checks,
      hints: [
        tx('เริ่มจากชั้นล่างสุด: ถ้า VPC ยัง ping gateway ของตัวเองไม่ได้ ให้ดูเส้นทาง L2 ระหว่างเครื่องกับ SwitchA ก่อน (ยังไม่ต้องดู Core)'),
        tx('บน SwitchA ใช้ show interface 1/1/4 หรือ show vlan ดูว่า trunk ไป Access ยอมให้ VLAN ไหนผ่านบ้าง'),
        tx('ถ้าถึง gateway แล้วแต่ไปไม่ถึง Core-2: ดู show ip route บน SwitchA ว่า next-hop ของ default route เป็น IP ที่อยู่ในเครือข่าย /31 ที่ต่ออยู่จริงหรือไม่ แล้วดูว่า Core-2 มี route กลับมายัง 10.10.100.0/24 หรือไม่'),
        tx('เฉลย: SwitchA 1/1/4 ต้องอนุญาต VLAN 200 (vlan trunk allowed 100,200), default route ของ SwitchA ต้องชี้ 192.168.4.8, Core-2 ต้องมี ip route 10.10.100.0/24 192.168.4.17'),
      ],
    },
  });
}

// ───────────────────────── Challenge 5: addressing faults on Inter-VLAN ─────────────────────────

export const ADDRESSING_NAME = tx('Challenge: Subnet / Encapsulation / WAN IP – Inter-VLAN');

/**
 * Inter-VLAN lab with three addressing faults: (1) R1 Gi0/0.20 uses `encapsulation dot1Q 200` instead of 20,
 * (2) PC-C has mask /30 so its gateway is off-subnet, (3) R2's WAN address is 10.0.0.3 while R1's route points at 10.0.0.2.
 */
export function buildAddressingLab(): Lab {
  let lab: Lab = { ...buildInterVlanLab(), name: ADDRESSING_NAME };
  const id = (name: string) => lab.devices.find((d) => d.name === name)!.id;
  lab = updateDevice(lab, id('R1'), (d) => ({ ...d, subifs: d.subifs.map((s) => (s.id === 20 ? { ...s, vlan: 200 } : s)) }));
  lab = updateDevice(lab, id('PC-C'), (d) => ({ ...d, ifaces: d.ifaces.map((i) => ({ ...i, mask: '255.255.255.252' })) }));
  lab = updateDevice(lab, id('R2'), (d) => ({ ...d, ifaces: d.ifaces.map((i) => (i.name === 'GigabitEthernet0/0' ? { ...i, ip: '10.0.0.3' } : i)) }));
  const ping = (n: number, from: string, to: string, label: string): Check => ({ id: `c${n}`, kind: 'ping', label, from: id(from), to, expect: 'success' });
  const checks: Check[] = [
    ping(1, 'PC-A', '192.168.10.1', tx('PC-A ติดต่อ gateway (R1 VLAN 10) ได้')),
    ping(2, 'PC-B', '192.168.20.1', tx('PC-B ติดต่อ gateway (R1 VLAN 20) ได้')),
    ping(3, 'PC-C', '192.168.10.1', tx('PC-C ติดต่อ gateway (R1 VLAN 10) ได้')),
    ping(4, 'PC-D', '192.168.20.1', tx('PC-D ติดต่อ gateway (R1 VLAN 20) ได้')),
    ping(5, 'PC-A', '172.16.0.10', tx('PC-A ติดต่อ PC-E (ผ่าน R1 และ R2) ได้')),
    { id: 'c6', kind: 'link-up', label: tx('R1 Gi0/1 ลิงก์ up'), deviceId: id('R1'), port: 'GigabitEthernet0/1' },
    { id: 'c7', kind: 'no-dup-ip', label: tx('ไม่มี IP ซ้ำใน L2 domain เดียวกัน') },
  ];
  return withStart({
    ...lab,
    guide: addressingGuide(),
    challenge: {
      title: tx('หาจุดผิดเรื่อง IP/Subnet และ sub-interface'),
      goal: tx('ทุกลิงก์ต่ออยู่และเปิดใช้งานอยู่ แต่ผู้ใช้หลายกลุ่มยังติดต่อไม่ได้ ให้หาสาเหตุทุกจุดแล้วแก้ให้ทุก Check ผ่าน โดยไม่ลบหรือเปลี่ยนสาย — ปัญหาอยู่ที่การตั้งค่า IP / subnet / VLAN ไม่ใช่ที่สายหรือพอร์ตปิด'),
      checks,
      hints: [
        tx('Check ที่ไม่ผ่านบอกกลุ่มอาการ: ลองเทียบว่า PC ไหนไปถึง gateway ได้ และไม่ได้ แล้วหาความต่างของค่าที่ตั้ง'),
        tx('ใช้ ipconfig บน PC และ show ip interface brief บน R1/R2 เทียบ IP, mask และสถานะของแต่ละ interface'),
        tx('ถ้า PC ใน VLAN เดียวกันบางเครื่องผ่านบางเครื่องไม่ผ่าน ให้ดู subnet mask ของเครื่องที่ไม่ผ่าน; ถ้าทั้ง VLAN ไม่ผ่านให้ดู sub-interface ของ VLAN นั้นบน router (show running-config)'),
        tx('เฉลย: R1 Gi0/0.20 ต้องใช้ encapsulation dot1Q 20, PC-C ต้องใช้ mask 255.255.255.0, R2 Gi0/0 ต้องเป็น 10.0.0.2 (ตรงกับ next-hop ของ R1)'),
      ],
    },
  });
}

// ───────────────────────── Challenge 6: Layer 2 faults on Inter-VLAN ─────────────────────────

export const LAYER2_NAME = tx('Challenge: VLAN / Trunk – Inter-VLAN');

/**
 * Inter-VLAN lab with three Layer 2 faults: (1) PC-A's port SW1 Fa0/1 sits in VLAN 20,
 * (2) SW1's trunk to R1 only allows VLAN 10, (3) VLAN 20 was never created on SW2.
 */
export function buildLayer2Lab(): Lab {
  let lab: Lab = { ...buildInterVlanLab(), name: LAYER2_NAME };
  const id = (name: string) => lab.devices.find((d) => d.name === name)!.id;
  lab = updateDevice(lab, id('SW1'), (d) => ({
    ...d,
    ifaces: d.ifaces.map((i) =>
      i.name === 'FastEthernet0/1' ? { ...i, accessVlan: 20 } : i.name === 'GigabitEthernet0/1' ? { ...i, trunkAllowed: [10] } : i,
    ),
  }));
  lab = updateDevice(lab, id('SW2'), (d) => ({ ...d, vlans: d.vlans.filter((v) => v.id !== 20) }));
  const ping = (n: number, from: string, to: string, label: string): Check => ({ id: `c${n}`, kind: 'ping', label, from: id(from), to, expect: 'success' });
  const checks: Check[] = [
    ping(1, 'PC-C', '192.168.10.1', tx('PC-C ติดต่อ gateway (R1 VLAN 10) ได้')),
    ping(2, 'PC-A', '192.168.10.1', tx('PC-A ติดต่อ gateway (R1 VLAN 10) ได้')),
    ping(3, 'PC-B', '192.168.20.1', tx('PC-B ติดต่อ gateway (R1 VLAN 20) ได้')),
    ping(4, 'PC-D', '192.168.20.1', tx('PC-D ติดต่อ gateway (R1 VLAN 20) ได้')),
    ping(5, 'PC-D', '192.168.20.11', tx('PC-D ติดต่อ PC-B (VLAN 20 เดียวกัน ข้าม trunk) ได้')),
    { id: 'c6', kind: 'link-up', label: tx('SW1 Gi0/1 (ลิงก์ไป R1) up'), deviceId: id('SW1'), port: 'GigabitEthernet0/1' },
    { id: 'c7', kind: 'no-dup-ip', label: tx('ไม่มี IP ซ้ำใน L2 domain เดียวกัน') },
  ];
  return withStart({
    ...lab,
    guide: layer2Guide(),
    challenge: {
      title: tx('ซ่อมปัญหา VLAN และ trunk ชั้น Layer 2'),
      goal: tx('IP, gateway และ routing ถูกต้องหมดแล้ว แต่ผู้ใช้หลายคนยังติดต่อไม่ได้ ให้หาสาเหตุทุกจุดแล้วแก้ให้ทุก Check ผ่าน โดยไม่ลบหรือเปลี่ยนสาย — ปัญหาทั้งหมดอยู่ที่ VLAN และ trunk บน switch'),
      checks,
      hints: [
        tx('IP ของทุกเครื่องถูกต้อง ให้โฟกัสที่ switch: เครื่องไหนไปถึง gateway ได้ และเครื่องไหนไม่ได้ แล้วดูว่าอยู่ VLAN ไหน/พอร์ตไหน'),
        tx('ใช้ show vlan (Cisco: show vlan brief) และ show interfaces trunk บนทั้ง SW1 และ SW2 เทียบ VLAN ที่มี และ VLAN ที่ trunk ยอมให้ผ่าน'),
        tx('ถ้า VLAN ใดทั้ง VLAN ไม่ถึง gateway ให้ดู trunk ไปหา router; ถ้าเครื่องหลัง switch อีกตัวหายไปเฉพาะบาง VLAN ให้ตรวจว่า VLAN นั้นถูกสร้างบน switch ตัวนั้นแล้วหรือยัง'),
        tx('เฉลย: SW1 Fa0/1 ต้องอยู่ VLAN 10, trunk SW1 Gi0/1 ต้องอนุญาต VLAN 10,20, และ SW2 ต้องสร้าง VLAN 20 (vlan 20)'),
      ],
    },
  });
}

// ───────────────────────── Challenge 7: build from scratch ─────────────────────────

export const BUILD_NAME = tx('Challenge: สร้างเครือข่าย 2 VLAN จากศูนย์');

/**
 * "Build" challenge: devices are cabled and the PCs already have their addresses, but R1, SW1 and SW2 have no
 * configuration at all. The learner builds VLANs, trunks and router-on-a-stick from the requirements in the guide.
 */
export function buildFromScratchLab(): Lab {
  let lab = emptyLab(BUILD_NAME);
  let n = 0;
  const mk = (kind: Device['kind'], name: string, x: number, y: number) => {
    const d = createDevice(kind, `d${++n}`, name, x, y);
    lab = { ...lab, devices: [...lab.devices, d] };
    return d;
  };
  const r1 = mk('cisco-router', 'R1', 420, 30);
  const sw1 = mk('cisco-switch', 'SW1', 420, 210);
  const sw2 = mk('aruba-switch', 'SW2', 820, 210);
  const pcA = mk('pc', 'PC-A', 320, 400);
  const pcB = mk('pc', 'PC-B', 500, 400);
  const pcC = mk('pc', 'PC-C', 820, 400);
  const host = (d: Device, ip: string, gw: string) => {
    lab = updateDevice(lab, d.id, (x) => ({ ...x, gateway: gw, ifaces: x.ifaces.map((i) => ({ ...i, ip, mask: '255.255.255.0' })) }));
  };
  host(pcA, '192.168.10.11', '192.168.10.1');
  host(pcB, '192.168.20.11', '192.168.20.1');
  host(pcC, '192.168.10.12', '192.168.10.1');
  const link = (aId: string, ap: string, bId: string, bp: string) => {
    const r = addLink(lab, { deviceId: aId, port: ap }, { deviceId: bId, port: bp });
    if (r.error) throw new Error(r.error);
    lab = r.lab;
  };
  link(r1.id, 'GigabitEthernet0/0', sw1.id, 'GigabitEthernet0/1');
  link(sw1.id, 'GigabitEthernet0/2', sw2.id, '1/1/24');
  link(pcA.id, 'Ethernet0', sw1.id, 'FastEthernet0/1');
  link(pcB.id, 'Ethernet0', sw1.id, 'FastEthernet0/2');
  link(pcC.id, 'Ethernet0', sw2.id, '1/1/1');
  lab = { ...lab, counters: { ...lab.counters, __id: n, R: 1, SW: 2, 'PC-': 3 } };

  const ping = (k: number, from: Device, to: string, label: string): Check => ({ id: `c${k}`, kind: 'ping', label, from: from.id, to, expect: 'success' });
  const checks: Check[] = [
    { id: 'c1', kind: 'port-admin', label: tx('R1 Gi0/0 เปิดใช้งาน (no shutdown)'), deviceId: r1.id, port: 'GigabitEthernet0/0', expect: 'up' },
    { id: 'c2', kind: 'trunk-vlan', label: tx('SW1 Gi0/1 (ไป R1) เป็น trunk ที่ส่ง VLAN 10 และ 20'), deviceId: sw1.id, port: 'GigabitEthernet0/1', vlan: 20, expect: 'allowed' },
    { id: 'c3', kind: 'trunk-vlan', label: tx('SW1 Gi0/2 (ไป SW2) เป็น trunk ที่ส่ง VLAN 10'), deviceId: sw1.id, port: 'GigabitEthernet0/2', vlan: 10, expect: 'allowed' },
    { id: 'c4', kind: 'trunk-vlan', label: tx('SW2 1/1/24 (ไป SW1) เป็น trunk ที่ส่ง VLAN 10'), deviceId: sw2.id, port: '1/1/24', vlan: 10, expect: 'allowed' },
    ping(5, pcA, '192.168.10.1', tx('PC-A ติดต่อ gateway (R1 VLAN 10) ได้')),
    ping(6, pcB, '192.168.20.1', tx('PC-B ติดต่อ gateway (R1 VLAN 20) ได้')),
    ping(7, pcC, '192.168.10.1', tx('PC-C ติดต่อ gateway (R1 VLAN 10) ได้')),
    ping(8, pcA, '192.168.10.12', tx('PC-A ติดต่อ PC-C (VLAN 10 เดียวกัน ข้าม trunk) ได้')),
    ping(9, pcA, '192.168.20.11', tx('PC-A ติดต่อ PC-B (ข้าม VLAN ผ่าน R1) ได้')),
    ping(10, pcC, '192.168.20.11', tx('PC-C ติดต่อ PC-B (ข้าม switch และข้าม VLAN) ได้')),
    { id: 'c11', kind: 'no-dup-ip', label: tx('ไม่มี IP ซ้ำใน L2 domain เดียวกัน') },
  ];
  return withStart({
    ...lab,
    guide: scratchGuide(),
    challenge: {
      title: tx('สร้างเครือข่าย 2 VLAN จากศูนย์'),
      goal: tx('อุปกรณ์ต่อสายครบและ PC ตั้ง IP แล้ว แต่ R1, SW1 และ SW2 ยังไม่มี config เลย ให้ตั้งค่าตามข้อกำหนดใน Guide (VLAN 10 USERS, VLAN 20 GUEST, trunk, router-on-a-stick) จนทุก Check ผ่าน'),
      checks,
      hints: [
        tx('ทำจากชั้นล่างขึ้นบน: (1) สร้าง VLAN และกำหนดพอร์ต access บน switch, (2) ตั้ง trunk ระหว่าง switch และไป router, (3) ตั้ง sub-interface บน router แล้วเปิดพอร์ต'),
        tx('Cisco switch: vlan 10 / name USERS, interface Fa0/1 → switchport mode access + switchport access vlan 10, interface Gi0/1 → switchport mode trunk. Aruba: vlan 10, interface 1/1/1 → no routing + vlan access 10, interface 1/1/24 → no routing + vlan trunk allowed 10,20'),
        tx('Router: interface Gi0/0 → no shutdown; interface Gi0/0.10 → encapsulation dot1Q 10 + ip address 192.168.10.1 255.255.255.0 (ทำเหมือนกันกับ VLAN 20 ด้วย .20.1)'),
        tx('ตรวจทีละชั้นด้วย show vlan brief, show interfaces trunk, show ip interface brief แล้วกด Check ดูว่าข้อไหนยังไม่ผ่านก่อนไปชั้นถัดไป'),
      ],
    },
  });
}

// ───────────────────────── catalog ─────────────────────────

export type SampleKind = 'office' | 'intervlan' | 'campus3' | 'trouble' | 'dupip' | 'campus' | 'campus3trouble' | 'addressing' | 'layer2' | 'scratch';

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
  campus3: { title: 'Campus 3 Tier (Aruba CX)', hint: tx('Core / Distribution / Access, routed /31, SVI, static route แทน OSPF — ย่อจาก Lab ของ Aruba'), challenge: false, build: buildCampus3Lab },
  trouble: { title: tx('Challenge 1: Inter-VLAN เสีย'), hint: tx('trunk allowed + default route + gateway ผิด (3 จุด)'), challenge: true, build: buildTroubleshootLab },
  dupip: { title: tx('Challenge 2: IP ซ้ำ + VLAN ผิด'), hint: tx('ใช้ show mac address-table / show ip arp หาเครื่องที่ผิด (3 จุด)'), challenge: true, build: buildDupIpLab },
  campus: { title: 'Challenge 3: Campus + ISP', hint: tx('L3 switch, server, AP — ปัญหาซ้อนกันหลายชั้น (3 จุด)'), challenge: true, build: buildCampusLab },
  campus3trouble: { title: 'Challenge 4: Campus 3 Tier', hint: tx('Trunk allowed + default route ผิด + route ขากลับหาย บน Aruba CX (3 จุด)'), challenge: true, build: buildCampus3TroubleLab },
  addressing: { title: tx('Challenge 5: Subnet + Encapsulation'), hint: tx('mask ผิด + dot1Q ผิด + IP ฝั่ง WAN ไม่ตรงกัน (3 จุด)'), challenge: true, build: buildAddressingLab },
  layer2: { title: tx('Challenge 6: VLAN + Trunk'), hint: tx('พอร์ตผิด VLAN + trunk ไป router ไม่ครบ + VLAN ไม่ได้สร้างบน switch (3 จุด)'), challenge: true, build: buildLayer2Lab },
  scratch: { title: tx('Challenge 7: สร้างจากศูนย์'), hint: tx('ตั้งค่า VLAN, trunk และ router-on-a-stick เองทั้งหมดตามข้อกำหนด'), challenge: true, build: buildFromScratchLab },
};
