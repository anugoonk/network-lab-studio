/**
 * HPE Aruba AOS-CX CLI profile.
 * Reference: Aruba CX 6100 24G running ArubaOS-CX 10.10.
 * Notes: interfaces boot shut down and in routed mode; `no routing` makes a port L2 so `vlan access` / `vlan trunk` can be used.
 * AOS-CX switches route between their VLAN interfaces (SVIs) and routed ports, and support static routes.
 * Output tables are simplified approximations of the real layout.
 */
import { ipToString, isHostAddress, maskToPrefix, networkOf, parseCidr, parseIp, subnetsOverlap } from '../ip';
import { NAME_RE, formatVlanList, getIface, parseVlanList } from '../lab';
import { allowsVlan, l3Interfaces, ping, portLine } from '../network';
import type { Device, Iface, Lab } from '../types';
import { cmd, curTarget, overlapWith, type CommandSpec, type Ctx, type RunResult } from './spec';

const SW = ['aruba-switch'] as const;
const DT = [...SW];

const physIface = (c: Ctx): Iface | undefined => (c.dev.cli.ctxIface ? getIface(c.dev, c.dev.cli.ctxIface) : undefined);

function compressPorts(names: string[]): string {
  // 1/1/1,1/1/2,1/1/3 -> 1/1/1-1/1/3
  const nums = names.map((n) => Number(n.split('/')[2])).sort((a, b) => a - b);
  const parts: string[] = [];
  let i = 0;
  while (i < nums.length) {
    let j = i;
    while (j + 1 < nums.length && nums[j + 1] === nums[j] + 1) j++;
    parts.push(j > i ? `1/1/${nums[i]}-1/1/${nums[j]}` : `1/1/${nums[i]}`);
    i = j + 1;
  }
  return parts.join(',');
}

export function arubaRunningConfig(dev: Device): string[] {
  const out = ['Current configuration:', '!', '!Version ArubaOS-CX FL.10.10.1000', `hostname ${dev.name}`];
  for (const v of dev.vlans) {
    out.push(`vlan ${v.id}`);
    if (v.id !== 1 || v.name !== 'DEFAULT_VLAN_1') out.push(`    name ${v.name}`);
  }
  for (const i of dev.ifaces) {
    out.push(`interface ${i.name}`);
    out.push(i.adminUp ? '    no shutdown' : '    shutdown');
    if (!i.routed) out.push('    no routing');
    if (!i.routed && i.trunk) {
      out.push(`    vlan trunk native ${i.nativeVlan}`);
      out.push(`    vlan trunk allowed ${i.trunkAllowed === null ? 'all' : formatVlanList(i.trunkAllowed)}`);
    } else if (!i.routed && i.accessVlan !== 1) out.push(`    vlan access ${i.accessVlan}`);
    if (i.description) out.push(`    description ${i.description}`);
    if (i.routed && i.ip && i.mask) out.push(`    ip address ${i.ip}/${maskToPrefix(i.mask)}`);
  }
  for (const v of dev.svis) {
    out.push(`interface vlan ${v.vlan}`);
    if (!v.adminUp) out.push('    shutdown');
    if (v.description) out.push(`    description ${v.description}`);
    if (v.ip && v.mask) out.push(`    ip address ${v.ip}/${maskToPrefix(v.mask)}`);
  }
  for (const r of dev.routes) out.push(`ip route ${r.net}/${maskToPrefix(r.mask)} ${r.nextHop}`);
  return out;
}

function showInterfaceBrief(lab: Lab, dev: Device): string[] {
  const bar = '-'.repeat(98);
  const out = [
    bar,
    'Port      Native  Mode   Type    Enabled  Status  Reason                 Speed   Description',
    '          VLAN                                                           (Mb/s)',
    bar,
  ];
  for (const i of dev.ifaces) {
    const line = portLine(lab, dev, i);
    const status = line === 'up' ? 'up' : 'down';
    const reason = line === 'up' ? '' : line === 'admin-down' ? 'Administratively down' : 'Waiting for link';
    const mode = i.routed ? 'routed' : i.trunk ? 'trunk' : 'access';
    const native = i.routed ? '--' : i.trunk ? i.nativeVlan : i.accessVlan;
    out.push(
      [
        i.name.padEnd(10),
        String(native).padEnd(8),
        mode.padEnd(7),
        '1GbT'.padEnd(8),
        (i.adminUp ? 'yes' : 'no').padEnd(9),
        status.padEnd(8),
        reason.padEnd(23),
        (line === 'up' ? '1000' : '--').padEnd(8),
        i.description || '--',
      ]
        .join('')
        .trimEnd(),
    );
  }
  return out;
}

function showVlan(dev: Device): string[] {
  const bar = '-'.repeat(88);
  const out = [bar, 'VLAN  Name             Status  Reason  Type      Interfaces', bar];
  for (const v of [...dev.vlans].sort((a, b) => a.id - b.id)) {
    const members = dev.ifaces
      .filter((i) => !i.routed && (i.trunk ? allowsVlan(i, v.id) : i.accessVlan === v.id))
      .map((i) => i.name);
    out.push(
      `${String(v.id).padEnd(6)}${v.name.padEnd(17)}${'up'.padEnd(8)}${'ok'.padEnd(8)}${(v.id === 1 ? 'default' : 'static').padEnd(10)}${compressPorts(members)}`.trimEnd(),
    );
  }
  return out;
}

function showInterface(lab: Lab, dev: Device, i: Iface): string[] {
  const line = portLine(lab, dev, i);
  return [
    `Aruba Interface ${i.name} is ${line === 'up' ? 'up' : 'down'}`,
    ` Admin state is ${i.adminUp ? 'up' : 'down'}`,
    ` State information: ${line === 'up' ? 'ok' : line === 'admin-down' ? 'Administratively down' : 'Waiting for link'}`,
    ` Mode: ${i.routed ? 'routed (L3)' : i.trunk ? 'trunk (L2)' : 'access (L2)'}`,
    ` Native VLAN: ${i.routed ? '--' : i.trunk ? i.nativeVlan : i.accessVlan}`,
    ...(i.trunk && !i.routed ? [` Allowed VLAN List: ${i.trunkAllowed === null ? 'all' : formatVlanList(i.trunkAllowed)}`] : []),
    ` Description: ${i.description || '--'}`,
    ` Speed: ${line === 'up' ? '1000 Mb/s' : '--'}`,
  ];
}

function showIpIntBrief(lab: Lab, dev: Device): string[] {
  const out = ['Interface        IP Address          Status'];
  for (const i of l3Interfaces(lab, dev)) {
    out.push(`${(i.kind === 'svi' ? `vlan${i.vlan}` : i.name).padEnd(17)}${`${i.ip}/${maskToPrefix(i.mask)}`.padEnd(20)}${i.up ? 'up' : 'down'}`);
  }
  return out;
}

function showIpRoute(lab: Lab, dev: Device): string[] {
  const up = l3Interfaces(lab, dev).filter((i) => i.up);
  const out = [
    'Displaying ipv4 routes selected for forwarding',
    '',
    'Origin Codes: C - connected, S - static, L - local',
    '',
    'VRF: default',
    '',
    'Prefix              Nexthop          Interface     Origin/Type  Distance/Metric',
    '-'.repeat(78),
  ];
  for (const i of up) {
    const ifName = i.kind === 'svi' ? `vlan${i.vlan}` : i.name;
    out.push(`${`${ipToString(networkOf(i.ip, i.mask)!)}/${maskToPrefix(i.mask)}`.padEnd(20)}${'-'.padEnd(17)}${ifName.padEnd(14)}${'C'.padEnd(13)}[0/0]`);
    out.push(`${`${i.ip}/32`.padEnd(20)}${'-'.padEnd(17)}${ifName.padEnd(14)}${'L'.padEnd(13)}[0/0]`);
  }
  for (const r of dev.routes) {
    const via = up.find((i) => networkOf(i.ip, i.mask) === networkOf(r.nextHop, i.mask));
    if (!via) continue;
    const ifName = via.kind === 'svi' ? `vlan${via.vlan}` : via.name;
    out.push(`${`${r.net}/${maskToPrefix(r.mask)}`.padEnd(20)}${r.nextHop.padEnd(17)}${ifName.padEnd(14)}${'S'.padEnd(13)}[1/0]`);
  }
  return out;
}

function arubaPing(c: Ctx): RunResult {
  const ip = c.args[0];
  const r = ping(c.lab, c.dev.id, ip);
  const lines = [`PING ${ip} (${ip}) 100(128) bytes of data.`];
  if (r.ok) for (let n = 1; n <= 5; n++) lines.push(`108 bytes from ${ip}: icmp_seq=${n} ttl=64 time=1.0 ms`);
  else if (r.kind === 'host-unreachable') lines.push(`From ${r.srcIp ?? ip} icmp_seq=1 Destination Host Unreachable`);
  lines.push('', `--- ${ip} ping statistics ---`);
  lines.push(r.ok ? '5 packets transmitted, 5 received, 0% packet loss, time 4005ms' : '5 packets transmitted, 0 received, 100% packet loss, time 4090ms');
  return { lines };
}

function exitCmd(c: Ctx): RunResult {
  switch (c.dev.cli.mode) {
    case 'config-if':
    case 'config-svi':
    case 'config-vlan':
      return { mode: 'config', ctxIface: null, ctxVlan: null };
    case 'config':
      return { mode: 'priv' };
    default:
      return {};
  }
}

function save(c: Ctx): RunResult {
  c.dev.startupConfig = arubaRunningConfig(c.dev).join('\n');
  return { lines: ['Copying configuration: [Success]'] };
}

const L2_NEEDED = (name: string) => `Interface ${name} is in routed mode. Use 'no routing' first to make it a Layer 2 port.`;

function ipAddressHandler(c: Ctx): RunResult {
  const t = curTarget(c);
  if (!t) return { error: ['% No interface selected'] };
  const cidr = parseCidr(c.args[0])!;
  if (c.dev.cli.mode === 'config-if') {
    const i = physIface(c)!;
    if (!i.routed) return { error: [`Interface ${i.name} is a Layer 2 port. Use 'routing' to make it a routed interface before setting an IP address.`] };
  }
  if (!isHostAddress(cidr.ip, cidr.mask)) return { error: ['Invalid IP address for this prefix length.'] };
  const clash = overlapWith(c, t, cidr.ip, cidr.mask, subnetsOverlap);
  if (clash) return { error: [`IP address ${c.args[0]} overlaps with an address on ${clash}.`] };
  t.ip = cidr.ip;
  t.mask = cidr.mask;
  return {};
}

function noIpAddressHandler(c: Ctx): RunResult {
  const t = curTarget(c);
  if (!t) return { error: ['% No interface selected'] };
  t.ip = null;
  t.mask = null;
  return {};
}

const IF_MODES = ['config-if', 'config-svi'] as const;

const specs: CommandSpec[] = [
  cmd({
    id: 'aruba.configure', vendor: 'aruba', deviceTypes: DT, modes: ['priv'], syntax: 'configure terminal',
    helpEn: 'Configuration from the terminal', descTh: 'เข้า Global Configuration mode (prompt เป็น (config)#)', topic: 'Mode',
    example: 'configure terminal', verify: 'hostname TEST', verifyTh: 'prompt ต้องเป็น (config)#',
    run: () => ({ mode: 'config' }),
  }),
  cmd({
    id: 'aruba.exit', vendor: 'aruba', deviceTypes: DT, modes: ['priv', 'config', 'config-if', 'config-svi', 'config-vlan'], syntax: 'exit',
    helpEn: 'Exit current mode and change to previous mode', descTh: 'ถอยออกหนึ่งระดับ (config-if → config → priv)', topic: 'Mode',
    example: 'exit', verify: '(ดู prompt)', verifyTh: 'prompt ต้องย้อนกลับหนึ่งระดับ',
    run: exitCmd,
  }),
  cmd({
    id: 'aruba.end', vendor: 'aruba', deviceTypes: DT, modes: ['config', 'config-if', 'config-svi', 'config-vlan'], syntax: 'end',
    helpEn: 'End the current configuration session and return to privileged mode', descTh: 'กลับ Manager mode (#) ทันทีจากทุกระดับของ config', topic: 'Mode',
    example: 'end', verify: 'show running-config', verifyTh: 'prompt ต้องเป็น hostname#',
    run: () => ({ mode: 'priv', ctxIface: null, ctxVlan: null }),
  }),
  cmd({
    id: 'aruba.do', vendor: 'aruba', deviceTypes: DT, modes: ['config', 'config-if', 'config-svi', 'config-vlan'], syntax: 'do <command>',
    helpEn: 'Execute a manager-level command from config mode', descTh: 'รันคำสั่ง show จากใน config mode โดยไม่ต้องออก', topic: 'Troubleshooting',
    example: 'do show vlan', verify: '(ผลลัพธ์แสดงทันที)', verifyTh: 'ต้องเห็นผล show โดย prompt ไม่เปลี่ยน',
    special: 'do',
  }),

  cmd({
    id: 'aruba.show.run', vendor: 'aruba', deviceTypes: DT, modes: ['priv'], syntax: 'show running-config',
    helpEn: 'Show running configuration', descTh: 'ดู configuration ปัจจุบัน (VLAN, interface, trunk, SVI, route)', topic: 'Config',
    example: 'show running-config', verify: 'show running-config', verifyTh: 'หา interface ที่เพิ่งแก้',
    run: (c) => ({ lines: arubaRunningConfig(c.dev) }),
  }),
  cmd({
    id: 'aruba.show.start', vendor: 'aruba', deviceTypes: DT, modes: ['priv'], syntax: 'show startup-config',
    helpEn: 'Show startup configuration', descTh: 'ดู config ที่บันทึกไว้ (หลัง write memory)', topic: 'Config',
    example: 'show startup-config', verify: 'show startup-config', verifyTh: 'ถ้ายังไม่เคยบันทึกจะขึ้นข้อความว่าไม่มี',
    run: (c) => (c.dev.startupConfig ? { lines: c.dev.startupConfig.split('\n') } : { lines: ['Startup configuration is empty (no saved configuration).'] }),
  }),
  cmd({
    id: 'aruba.show.version', vendor: 'aruba', deviceTypes: DT, modes: ['priv'], syntax: 'show version',
    helpEn: 'Show version information', descTh: 'ดูรุ่นอุปกรณ์จำลองและเวอร์ชัน AOS-CX อ้างอิง', topic: 'Troubleshooting',
    example: 'show version', verify: 'show version', verifyTh: 'ดูรุ่นและเวอร์ชัน',
    run: () => ({
      lines: ['ArubaOS-CX', '(c) Copyright 2017-2023 Hewlett Packard Enterprise Development LP', '-----------------------------------------------------------------------------',
        'Version      : FL.10.10.1000', 'Product Name : Aruba 6100 24G 4SFP+ Swch (simulated)', '*** Simulated device — Network Lab Studio ***'],
    }),
  }),
  cmd({
    id: 'aruba.show.intbrief', vendor: 'aruba', deviceTypes: DT, modes: ['priv'], syntax: 'show interface brief',
    helpEn: 'Show brief interface information', descTh: 'ตารางสรุปทุกพอร์ต: Native VLAN, Mode (access/trunk/routed), Enabled, Status, Reason', topic: 'Interface',
    example: 'show interface brief', verify: 'show interface brief', verifyTh: 'Status=down + Reason=Administratively down แปลว่าถูก shutdown',
    run: (c) => ({ lines: showInterfaceBrief(c.lab, c.dev) }),
  }),
  cmd({
    id: 'aruba.show.int', vendor: 'aruba', deviceTypes: DT, modes: ['priv'], syntax: 'show interface <interface>',
    helpEn: 'Show details of one interface', descTh: 'ดูรายละเอียดพอร์ตเดียว เช่น show interface 1/1/24 (รวม allowed VLAN ของ trunk)', topic: 'Interface',
    example: 'show interface 1/1/1', verify: 'show interface 1/1/1', verifyTh: 'ดู Admin state, Mode และ Native VLAN',
    run: (c) => ({ lines: showInterface(c.lab, c.dev, getIface(c.dev, c.args[0])!) }),
  }),
  cmd({
    id: 'aruba.show.vlan', vendor: 'aruba', deviceTypes: DT, modes: ['priv'], syntax: 'show vlan',
    helpEn: 'Show VLAN information', descTh: 'ดู VLAN ทั้งหมดและพอร์ตที่เป็นสมาชิก (access และ trunk ที่อนุญาต VLAN นั้น; เฉพาะพอร์ตที่ no routing)', topic: 'VLAN',
    example: 'show vlan', verify: 'show vlan', verifyTh: 'พอร์ตที่ตั้ง vlan access หรือ trunk ต้องอยู่ในแถว VLAN นั้น',
    run: (c) => ({ lines: showVlan(c.dev) }),
  }),
  cmd({
    id: 'aruba.show.ipbrief', vendor: 'aruba', deviceTypes: DT, modes: ['priv'], syntax: 'show ip interface brief',
    helpEn: 'Show brief IP interface information', descTh: 'สรุป IP ของ routed port และ VLAN interface (SVI) พร้อมสถานะ up/down', topic: 'IP',
    example: 'show ip interface brief', verify: 'show ip interface brief', verifyTh: 'SVI ต้อง up เมื่อ VLAN มีพอร์ตที่ up',
    run: (c) => ({ lines: showIpIntBrief(c.lab, c.dev) }),
  }),
  cmd({
    id: 'aruba.show.iproute', vendor: 'aruba', deviceTypes: DT, modes: ['priv'], syntax: 'show ip route',
    helpEn: 'Show IPv4 routing table', descTh: 'ดูตาราง routing: C/L (connected), S (static)', topic: 'IP',
    example: 'show ip route', verify: 'show ip route', verifyTh: 'ต้องเห็น C ของ SVI ที่ up และ S ของ static route ที่ next hop ถึงได้',
    run: (c) => ({ lines: showIpRoute(c.lab, c.dev) }),
  }),
  cmd({
    id: 'aruba.ping', vendor: 'aruba', deviceTypes: DT, modes: ['priv'], syntax: 'ping <ip-address>',
    helpEn: 'Send ICMP echo requests', descTh: 'ทดสอบ ping จาก switch (ที่มี SVI/routed port) ไปยัง IPv4 ปลายทาง', topic: 'Troubleshooting',
    example: 'ping 192.168.1.1', verify: 'ping 192.168.1.1', verifyTh: '5 received = สำเร็จ, 0 received = ไม่ถึง',
    run: arubaPing,
  }),

  cmd({
    id: 'aruba.write', vendor: 'aruba', deviceTypes: DT, modes: ['priv'], syntax: 'write memory',
    helpEn: 'Save running configuration to startup configuration', descTh: 'บันทึก running-config เป็น startup-config', topic: 'Config',
    example: 'write memory', verify: 'show startup-config', verifyTh: 'startup-config ต้องไม่ว่างแล้ว',
    run: save,
  }),
  cmd({
    id: 'aruba.copy', vendor: 'aruba', deviceTypes: DT, modes: ['priv'], syntax: 'copy running-config startup-config',
    helpEn: 'Copy running configuration to startup configuration', descTh: 'บันทึก running-config เป็น startup-config (เทียบเท่า write memory)', topic: 'Config',
    example: 'copy running-config startup-config', verify: 'show startup-config', verifyTh: 'startup-config ต้องไม่ว่างแล้ว',
    run: save,
  }),

  cmd({
    id: 'aruba.hostname', vendor: 'aruba', deviceTypes: DT, modes: ['config'], syntax: 'hostname <hostname>',
    helpEn: 'Set the system hostname', descTh: 'เปลี่ยนชื่ออุปกรณ์ (prompt และชื่อบน canvas เปลี่ยนตาม)', topic: 'Config',
    example: 'hostname ACCESS2', verify: 'show running-config', verifyTh: 'prompt ต้องเปลี่ยนเป็นชื่อใหม่',
    run: (c) => {
      if (!NAME_RE.test(c.args[0])) return { error: ['% Invalid hostname (ใช้ A-Z, 0-9, -, _ ได้ไม่เกิน 24 ตัวอักษร)'] };
      c.dev.name = c.args[0];
      return {};
    },
  }),
  cmd({
    id: 'aruba.vlan', vendor: 'aruba', deviceTypes: DT, modes: ['config', 'config-if', 'config-svi', 'config-vlan'], syntax: 'vlan <vlan-id>',
    helpEn: 'Create or edit a VLAN', descTh: 'สร้าง VLAN (หรือเข้าแก้ VLAN เดิม) แล้วเข้า config-vlan', topic: 'VLAN',
    example: 'vlan 30', verify: 'show vlan', verifyTh: 'VLAN ใหม่ต้องปรากฏในตาราง',
    run: (c) => {
      const id = Number(c.args[0]);
      if (!c.dev.vlans.some((v) => v.id === id)) {
        c.dev.vlans.push({ id, name: `VLAN${id}` });
        c.dev.vlans.sort((a, b) => a.id - b.id);
      }
      return { mode: 'config-vlan', ctxVlan: id, ctxIface: null };
    },
  }),
  cmd({
    id: 'aruba.no.vlan', vendor: 'aruba', deviceTypes: DT, modes: ['config'], syntax: 'no vlan <vlan-id>',
    helpEn: 'Delete a VLAN', descTh: 'ลบ VLAN (VLAN 1 ลบไม่ได้)', topic: 'VLAN',
    example: 'no vlan 30', verify: 'show vlan', verifyTh: 'VLAN ต้องหายไปจากตาราง',
    run: (c) => {
      const id = Number(c.args[0]);
      if (id === 1) return { error: ['Cannot delete the default VLAN 1.'] };
      c.dev.vlans = c.dev.vlans.filter((v) => v.id !== id);
      return {};
    },
  }),
  cmd({
    id: 'aruba.vlan.name', vendor: 'aruba', deviceTypes: DT, modes: ['config-vlan'], syntax: 'name <name>',
    helpEn: 'Set the VLAN name', descTh: 'ตั้งชื่อ VLAN', topic: 'VLAN',
    example: 'name STAFF', verify: 'show vlan', verifyTh: 'ชื่อ VLAN ต้องเปลี่ยน',
    run: (c) => {
      const v = c.dev.vlans.find((x) => x.id === c.dev.cli.ctxVlan);
      if (!v) return { error: ['% No VLAN selected'] };
      if (c.args[0].length > 32) return { error: ['% VLAN name too long (max 32)'] };
      v.name = c.args[0];
      return {};
    },
  }),
  cmd({
    id: 'aruba.interface', vendor: 'aruba', deviceTypes: DT, modes: ['config', 'config-if', 'config-svi', 'config-vlan'], syntax: 'interface <interface>',
    helpEn: 'Select an interface to configure', descTh: 'เข้า Interface Configuration ของพอร์ต เช่น interface 1/1/1', topic: 'Interface',
    example: 'interface 1/1/1', verify: 'show interface brief', verifyTh: 'prompt ต้องเป็น (config-if)#',
    run: (c) => ({ mode: 'config-if', ctxIface: c.args[0], ctxVlan: null }),
  }),
  cmd({
    id: 'aruba.interface.vlan', vendor: 'aruba', deviceTypes: DT, modes: ['config', 'config-if', 'config-svi', 'config-vlan'], syntax: 'interface vlan <vlan-id>',
    helpEn: 'Configure a VLAN interface (SVI)', descTh: 'สร้าง/เข้า VLAN interface (SVI) ให้ switch route ระหว่าง VLAN — VLAN ต้องถูกสร้างไว้ก่อน', topic: 'IP',
    example: 'interface vlan 10', verify: 'show ip interface brief', verifyTh: 'ต้องเห็น vlan10 ในตาราง',
    run: (c) => {
      const id = Number(c.args[0]);
      if (!c.dev.vlans.some((v) => v.id === id)) return { error: [`VLAN ${id} does not exist. Create it first with 'vlan ${id}'.`] };
      if (!c.dev.svis.some((v) => v.vlan === id)) {
        c.dev.svis.push({ vlan: id, adminUp: true, description: '', ip: null, mask: null });
        c.dev.svis.sort((a, b) => a.vlan - b.vlan);
      }
      return { mode: 'config-svi', ctxVlan: id, ctxIface: null };
    },
  }),
  cmd({
    id: 'aruba.nointerface.vlan', vendor: 'aruba', deviceTypes: DT, modes: ['config'], syntax: 'no interface vlan <vlan-id>',
    helpEn: 'Delete a VLAN interface (SVI)', descTh: 'ลบ VLAN interface', topic: 'IP',
    example: 'no interface vlan 10', verify: 'show ip interface brief', verifyTh: 'vlan10 ต้องหายไป',
    run: (c) => {
      const id = Number(c.args[0]);
      c.dev.svis = c.dev.svis.filter((v) => v.vlan !== id);
      return {};
    },
  }),
  cmd({
    id: 'aruba.ip.route', vendor: 'aruba', deviceTypes: DT, modes: ['config'], syntax: 'ip route <prefix> <next-hop>',
    helpEn: 'Configure a static route', descTh: 'เพิ่ม static route แบบ prefix/ความยาว เช่น 172.16.0.0/24 ผ่าน next hop (default route = 0.0.0.0/0)', topic: 'IP',
    example: 'ip route 172.16.0.0/24 192.168.1.1', verify: 'show ip route', verifyTh: 'ต้องเห็นบรรทัด S เมื่อ next hop อยู่ใน subnet ของ interface ที่ up',
    run: (c) => {
      const cidr = parseCidr(c.args[0])!;
      if (networkOf(cidr.ip, cidr.mask) !== parseIp(cidr.ip)) return { error: ['Invalid prefix: host bits are set (ใช้ network address เช่น 172.16.0.0/24).'] };
      c.dev.routes = c.dev.routes.filter((r) => !(r.net === cidr.ip && r.mask === cidr.mask));
      c.dev.routes.push({ net: cidr.ip, mask: cidr.mask, nextHop: c.args[1] });
      return {};
    },
  }),
  cmd({
    id: 'aruba.noip.route', vendor: 'aruba', deviceTypes: DT, modes: ['config'], syntax: 'no ip route <prefix> <next-hop>',
    helpEn: 'Remove a static route', descTh: 'ลบ static route', topic: 'IP',
    prepare: (d) => d.routes.push({ net: '172.16.0.0', mask: '255.255.255.0', nextHop: '192.168.1.1' }),
    example: 'no ip route 172.16.0.0/24 192.168.1.1', verify: 'show ip route', verifyTh: 'บรรทัด S ของ route นั้นต้องหายไป',
    run: (c) => {
      const cidr = parseCidr(c.args[0])!;
      const before = c.dev.routes.length;
      c.dev.routes = c.dev.routes.filter((r) => !(r.net === cidr.ip && r.mask === cidr.mask && r.nextHop === c.args[1]));
      if (c.dev.routes.length === before) return { error: ['No matching static route to delete.'] };
      return {};
    },
  }),

  cmd({
    id: 'aruba.shutdown', vendor: 'aruba', deviceTypes: DT, modes: [...IF_MODES], syntax: 'shutdown',
    helpEn: 'Disable the interface', descTh: 'ปิดพอร์ต/VLAN interface — ลิงก์ที่ต่อกับพอร์ตนี้จะ down', topic: 'Interface',
    example: 'shutdown', verify: 'show interface brief', verifyTh: 'Status=down, Reason=Administratively down',
    run: (c) => {
      const t = curTarget(c);
      if (!t) return { error: ['% No interface selected'] };
      t.adminUp = false;
      return {};
    },
  }),
  cmd({
    id: 'aruba.noshutdown', vendor: 'aruba', deviceTypes: DT, modes: [...IF_MODES], syntax: 'no shutdown',
    helpEn: 'Enable the interface', descTh: 'เปิดพอร์ต (พอร์ต AOS-CX เริ่มต้นเป็น shutdown)', topic: 'Interface',
    example: 'no shutdown', verify: 'show interface brief', verifyTh: 'Enabled=yes และ Status=up เมื่อปลายสายอีกฝั่งเปิดอยู่',
    run: (c) => {
      const t = curTarget(c);
      if (!t) return { error: ['% No interface selected'] };
      t.adminUp = true;
      return {};
    },
  }),
  cmd({
    id: 'aruba.norouting', vendor: 'aruba', deviceTypes: DT, modes: ['config-if'], syntax: 'no routing',
    helpEn: 'Disable routing on this interface (make it a Layer 2 port)', descTh: 'เปลี่ยนพอร์ตจาก routed เป็น Layer 2 — ต้องทำก่อนใช้ vlan access / vlan trunk', topic: 'VLAN',
    example: 'no routing', verify: 'show interface brief', verifyTh: 'Mode ต้องเป็น access',
    run: (c) => {
      const i = physIface(c);
      if (!i) return { error: ['% No interface selected'] };
      if (i.routed && i.ip) return { error: [`Interface ${i.name} has an IP address. Remove it first with 'no ip address'.`] };
      i.routed = false;
      return {};
    },
  }),
  cmd({
    id: 'aruba.routing', vendor: 'aruba', deviceTypes: DT, modes: ['config-if'], syntax: 'routing',
    helpEn: 'Enable routing on this interface', descTh: 'เปลี่ยนพอร์ตกลับเป็น routed (L3) — พอร์ตจะไม่ส่งต่อ VLAN แต่ตั้ง IP ได้', topic: 'VLAN',
    example: 'routing', verify: 'show interface brief', verifyTh: 'Mode ต้องเป็น routed',
    run: (c) => {
      const i = physIface(c);
      if (!i) return { error: ['% No interface selected'] };
      i.routed = true;
      i.trunk = false;
      i.accessVlan = 1;
      i.nativeVlan = 1;
      i.trunkAllowed = null;
      return {};
    },
  }),
  cmd({
    id: 'aruba.vlan.access', vendor: 'aruba', deviceTypes: DT, modes: ['config-if'], syntax: 'vlan access <vlan-id>',
    helpEn: 'Set the access VLAN of the interface', descTh: 'กำหนด access VLAN (untagged) ให้พอร์ต L2 — VLAN ต้องถูกสร้างไว้ก่อน (ถ้าเป็น trunk จะกลับเป็น access)', topic: 'VLAN',
    example: 'vlan access 10', verify: 'show vlan', verifyTh: 'พอร์ตต้องอยู่ในแถว VLAN ที่ตั้ง',
    run: (c) => {
      const i = physIface(c);
      if (!i) return { error: ['% No interface selected'] };
      const id = Number(c.args[0]);
      if (i.routed) return { error: [L2_NEEDED(i.name)] };
      if (!c.dev.vlans.some((v) => v.id === id)) return { error: [`VLAN ${id} does not exist. Create it first with 'vlan ${id}'.`] };
      i.trunk = false;
      i.accessVlan = id;
      return {};
    },
  }),
  cmd({
    id: 'aruba.trunk.allowed', vendor: 'aruba', deviceTypes: DT, modes: ['config-if'], syntax: 'vlan trunk allowed <vlan-list>',
    helpEn: 'Set the VLANs allowed on the trunk', descTh: 'ตั้งพอร์ตเป็น trunk และกำหนด VLAN ที่อนุญาต เช่น 10,20,30-40', topic: 'VLAN',
    example: 'vlan trunk allowed 10,20', verify: 'show interface 1/1/1', verifyTh: 'Mode ต้องเป็น trunk และเห็น Allowed VLAN List',
    run: (c) => {
      const i = physIface(c);
      if (!i) return { error: ['% No interface selected'] };
      if (i.routed) return { error: [L2_NEEDED(i.name)] };
      i.trunk = true;
      i.trunkAllowed = parseVlanList(c.args[0]);
      return {};
    },
  }),
  cmd({
    id: 'aruba.trunk.allowed.all', vendor: 'aruba', deviceTypes: DT, modes: ['config-if'], syntax: 'vlan trunk allowed all',
    helpEn: 'Allow all VLANs on the trunk', descTh: 'ตั้งพอร์ตเป็น trunk ที่อนุญาตทุก VLAN', topic: 'VLAN',
    example: 'vlan trunk allowed all', verify: 'show interface 1/1/1', verifyTh: 'Allowed VLAN List ต้องเป็น all',
    run: (c) => {
      const i = physIface(c);
      if (!i) return { error: ['% No interface selected'] };
      if (i.routed) return { error: [L2_NEEDED(i.name)] };
      i.trunk = true;
      i.trunkAllowed = null;
      return {};
    },
  }),
  cmd({
    id: 'aruba.trunk.native', vendor: 'aruba', deviceTypes: DT, modes: ['config-if'], syntax: 'vlan trunk native <vlan-id>',
    helpEn: 'Set the native (untagged) VLAN of the trunk', descTh: 'ตั้งพอร์ตเป็น trunk และกำหนด native VLAN (untagged) — ต้องตรงกันทั้งสองฝั่ง', topic: 'VLAN',
    example: 'vlan trunk native 99', verify: 'show interface brief', verifyTh: 'คอลัมน์ Native VLAN ต้องเป็นค่าที่ตั้ง',
    run: (c) => {
      const i = physIface(c);
      if (!i) return { error: ['% No interface selected'] };
      if (i.routed) return { error: [L2_NEEDED(i.name)] };
      i.trunk = true;
      i.nativeVlan = Number(c.args[0]);
      return {};
    },
  }),
  cmd({
    id: 'aruba.ipaddress', vendor: 'aruba', deviceTypes: DT, modes: [...IF_MODES], syntax: 'ip address <cidr>',
    helpEn: 'Set the IPv4 address', descTh: 'ตั้ง IPv4 แบบ a.b.c.d/ความยาว ให้ routed port หรือ VLAN interface (SVI) — SVI ทำให้ switch เป็น gateway ของ VLAN', topic: 'IP',
    prepare: (d) => {
      for (const i of d.ifaces) i.routed = true; // routed port: `ip address` needs L3 mode
    },
    example: 'ip address 192.168.10.1/24', verify: 'show ip interface brief', verifyTh: 'ต้องเห็น IP ใหม่และสถานะ up',
    run: ipAddressHandler,
  }),
  cmd({
    id: 'aruba.noipaddress', vendor: 'aruba', deviceTypes: DT, modes: [...IF_MODES], syntax: 'no ip address',
    helpEn: 'Remove the IPv4 address', descTh: 'ลบ IP ออกจาก interface', topic: 'IP',
    example: 'no ip address', verify: 'show ip interface brief', verifyTh: 'แถวของ interface ต้องหายไป',
    run: noIpAddressHandler,
  }),
  cmd({
    id: 'aruba.description', vendor: 'aruba', deviceTypes: DT, modes: [...IF_MODES], syntax: 'description <text>',
    helpEn: 'Set the interface description', descTh: 'ตั้งคำอธิบายพอร์ต', topic: 'Interface',
    example: 'description UPLINK', verify: 'show running-config', verifyTh: 'ต้องเห็นบรรทัด description ใต้ interface',
    run: (c) => {
      const t = curTarget(c);
      if (!t) return { error: ['% No interface selected'] };
      t.description = c.args[0].slice(0, 200);
      return {};
    },
  }),
];

export const ARUBA_SPECS = specs;
