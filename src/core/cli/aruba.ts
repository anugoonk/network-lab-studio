/**
 * HPE Aruba AOS-CX CLI profile.
 * Reference: Aruba CX 6100 24G running ArubaOS-CX 10.10.
 * Notes: interfaces boot shut down and in routed mode; `no routing` makes a port L2 so `vlan access` can be used.
 * Output tables are simplified approximations of the real layout.
 */
import { NAME_RE, getIface } from '../lab';
import { portLine } from '../network';
import type { Device, Iface, Lab } from '../types';
import { cmd, type CommandSpec, type Ctx, type RunResult } from './spec';

const AX = ['aruba-switch'] as const;
const SW = [...AX];

const curIface = (c: Ctx): Iface | undefined => (c.dev.cli.ctxIface ? getIface(c.dev, c.dev.cli.ctxIface) : undefined);

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
    if (!i.routed && i.accessVlan !== 1) out.push(`    vlan access ${i.accessVlan}`);
    if (i.description) out.push(`    description ${i.description}`);
  }
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
    out.push(
      [
        i.name.padEnd(10),
        (i.routed ? '--' : String(i.accessVlan)).padEnd(8),
        (i.routed ? 'routed' : 'access').padEnd(7),
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
    const members = dev.ifaces.filter((i) => !i.routed && i.accessVlan === v.id).map((i) => i.name);
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
    ` Mode: ${i.routed ? 'routed (L3)' : 'access (L2)'}`,
    ` Native VLAN: ${i.routed ? '--' : i.accessVlan}`,
    ` Description: ${i.description || '--'}`,
    ` Speed: ${line === 'up' ? '1000 Mb/s' : '--'}`,
  ];
}

function exitCmd(c: Ctx): RunResult {
  switch (c.dev.cli.mode) {
    case 'config-if':
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

const specs: CommandSpec[] = [
  cmd({
    id: 'aruba.configure', vendor: 'aruba', deviceTypes: SW, modes: ['priv'], syntax: 'configure terminal',
    helpEn: 'Configuration from the terminal', descTh: 'เข้า Global Configuration mode (prompt เป็น (config)#)', topic: 'Mode',
    example: 'configure terminal', verify: 'hostname TEST', verifyTh: 'prompt ต้องเป็น (config)#',
    run: () => ({ mode: 'config' }),
  }),
  cmd({
    id: 'aruba.exit', vendor: 'aruba', deviceTypes: SW, modes: ['priv', 'config', 'config-if', 'config-vlan'], syntax: 'exit',
    helpEn: 'Exit current mode and change to previous mode', descTh: 'ถอยออกหนึ่งระดับ (config-if → config → priv)', topic: 'Mode',
    example: 'exit', verify: '(ดู prompt)', verifyTh: 'prompt ต้องย้อนกลับหนึ่งระดับ',
    run: exitCmd,
  }),
  cmd({
    id: 'aruba.end', vendor: 'aruba', deviceTypes: SW, modes: ['config', 'config-if', 'config-vlan'], syntax: 'end',
    helpEn: 'End the current configuration session and return to privileged mode', descTh: 'กลับ Manager mode (#) ทันทีจากทุกระดับของ config', topic: 'Mode',
    example: 'end', verify: 'show running-config', verifyTh: 'prompt ต้องเป็น hostname#',
    run: () => ({ mode: 'priv', ctxIface: null, ctxVlan: null }),
  }),
  cmd({
    id: 'aruba.do', vendor: 'aruba', deviceTypes: SW, modes: ['config', 'config-if', 'config-vlan'], syntax: 'do <command>',
    helpEn: 'Execute a manager-level command from config mode', descTh: 'รันคำสั่ง show จากใน config mode โดยไม่ต้องออก', topic: 'Troubleshooting',
    example: 'do show vlan', verify: '(ผลลัพธ์แสดงทันที)', verifyTh: 'ต้องเห็นผล show โดย prompt ไม่เปลี่ยน',
    special: 'do',
  }),

  cmd({
    id: 'aruba.show.run', vendor: 'aruba', deviceTypes: SW, modes: ['priv'], syntax: 'show running-config',
    helpEn: 'Show running configuration', descTh: 'ดู configuration ปัจจุบัน (VLAN, interface, shutdown, no routing, vlan access)', topic: 'Config',
    example: 'show running-config', verify: 'show running-config', verifyTh: 'หา interface ที่เพิ่งแก้',
    run: (c) => ({ lines: arubaRunningConfig(c.dev) }),
  }),
  cmd({
    id: 'aruba.show.start', vendor: 'aruba', deviceTypes: SW, modes: ['priv'], syntax: 'show startup-config',
    helpEn: 'Show startup configuration', descTh: 'ดู config ที่บันทึกไว้ (หลัง write memory)', topic: 'Config',
    example: 'show startup-config', verify: 'show startup-config', verifyTh: 'ถ้ายังไม่เคยบันทึกจะขึ้นข้อความว่าไม่มี',
    run: (c) => (c.dev.startupConfig ? { lines: c.dev.startupConfig.split('\n') } : { lines: ['Startup configuration is empty (no saved configuration).'] }),
  }),
  cmd({
    id: 'aruba.show.version', vendor: 'aruba', deviceTypes: SW, modes: ['priv'], syntax: 'show version',
    helpEn: 'Show version information', descTh: 'ดูรุ่นอุปกรณ์จำลองและเวอร์ชัน AOS-CX อ้างอิง', topic: 'Troubleshooting',
    example: 'show version', verify: 'show version', verifyTh: 'ดูรุ่นและเวอร์ชัน',
    run: () => ({
      lines: ['ArubaOS-CX', '(c) Copyright 2017-2023 Hewlett Packard Enterprise Development LP', '-----------------------------------------------------------------------------',
        'Version      : FL.10.10.1000', 'Product Name : Aruba 6100 24G 4SFP+ Swch (simulated)', '*** Simulated device — Network Lab Studio ***'],
    }),
  }),
  cmd({
    id: 'aruba.show.intbrief', vendor: 'aruba', deviceTypes: SW, modes: ['priv'], syntax: 'show interface brief',
    helpEn: 'Show brief interface information', descTh: 'ตารางสรุปทุกพอร์ต: Native VLAN, Mode, Enabled, Status, Reason', topic: 'Interface',
    example: 'show interface brief', verify: 'show interface brief', verifyTh: 'Status=down + Reason=Administratively down แปลว่าถูก shutdown',
    run: (c) => ({ lines: showInterfaceBrief(c.lab, c.dev) }),
  }),
  cmd({
    id: 'aruba.show.int', vendor: 'aruba', deviceTypes: SW, modes: ['priv'], syntax: 'show interface <interface>',
    helpEn: 'Show details of one interface', descTh: 'ดูรายละเอียดพอร์ตเดียว เช่น show interface 1/1/24', topic: 'Interface',
    example: 'show interface 1/1/1', verify: 'show interface 1/1/1', verifyTh: 'ดู Admin state, Mode และ Native VLAN',
    run: (c) => ({ lines: showInterface(c.lab, c.dev, getIface(c.dev, c.args[0])!) }),
  }),
  cmd({
    id: 'aruba.show.vlan', vendor: 'aruba', deviceTypes: SW, modes: ['priv'], syntax: 'show vlan',
    helpEn: 'Show VLAN information', descTh: 'ดู VLAN ทั้งหมดและพอร์ตที่เป็นสมาชิก (เฉพาะพอร์ตที่ no routing)', topic: 'VLAN',
    example: 'show vlan', verify: 'show vlan', verifyTh: 'พอร์ตที่ตั้ง vlan access ต้องอยู่ในแถว VLAN นั้น',
    run: (c) => ({ lines: showVlan(c.dev) }),
  }),

  cmd({
    id: 'aruba.write', vendor: 'aruba', deviceTypes: SW, modes: ['priv'], syntax: 'write memory',
    helpEn: 'Save running configuration to startup configuration', descTh: 'บันทึก running-config เป็น startup-config', topic: 'Config',
    example: 'write memory', verify: 'show startup-config', verifyTh: 'startup-config ต้องไม่ว่างแล้ว',
    run: save,
  }),
  cmd({
    id: 'aruba.copy', vendor: 'aruba', deviceTypes: SW, modes: ['priv'], syntax: 'copy running-config startup-config',
    helpEn: 'Copy running configuration to startup configuration', descTh: 'บันทึก running-config เป็น startup-config (เทียบเท่า write memory)', topic: 'Config',
    example: 'copy running-config startup-config', verify: 'show startup-config', verifyTh: 'startup-config ต้องไม่ว่างแล้ว',
    run: save,
  }),

  cmd({
    id: 'aruba.hostname', vendor: 'aruba', deviceTypes: SW, modes: ['config'], syntax: 'hostname <hostname>',
    helpEn: 'Set the system hostname', descTh: 'เปลี่ยนชื่ออุปกรณ์ (prompt และชื่อบน canvas เปลี่ยนตาม)', topic: 'Config',
    example: 'hostname ACCESS2', verify: 'show running-config', verifyTh: 'prompt ต้องเปลี่ยนเป็นชื่อใหม่',
    run: (c) => {
      if (!NAME_RE.test(c.args[0])) return { error: ['% Invalid hostname (ใช้ A-Z, 0-9, -, _ ได้ไม่เกิน 24 ตัวอักษร)'] };
      c.dev.name = c.args[0];
      return {};
    },
  }),
  cmd({
    id: 'aruba.vlan', vendor: 'aruba', deviceTypes: SW, modes: ['config', 'config-if', 'config-vlan'], syntax: 'vlan <vlan-id>',
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
    id: 'aruba.no.vlan', vendor: 'aruba', deviceTypes: SW, modes: ['config'], syntax: 'no vlan <vlan-id>',
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
    id: 'aruba.vlan.name', vendor: 'aruba', deviceTypes: SW, modes: ['config-vlan'], syntax: 'name <name>',
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
    id: 'aruba.interface', vendor: 'aruba', deviceTypes: SW, modes: ['config', 'config-if', 'config-vlan'], syntax: 'interface <interface>',
    helpEn: 'Select an interface to configure', descTh: 'เข้า Interface Configuration ของพอร์ต เช่น interface 1/1/1', topic: 'Interface',
    example: 'interface 1/1/1', verify: 'show interface brief', verifyTh: 'prompt ต้องเป็น (config-if)#',
    run: (c) => ({ mode: 'config-if', ctxIface: c.args[0], ctxVlan: null }),
  }),

  cmd({
    id: 'aruba.shutdown', vendor: 'aruba', deviceTypes: SW, modes: ['config-if'], syntax: 'shutdown',
    helpEn: 'Disable the interface', descTh: 'ปิดพอร์ต — ลิงก์ที่ต่อกับพอร์ตนี้จะ down', topic: 'Interface',
    example: 'shutdown', verify: 'show interface brief', verifyTh: 'Status=down, Reason=Administratively down',
    run: (c) => {
      const i = curIface(c);
      if (!i) return { error: ['% No interface selected'] };
      i.adminUp = false;
      return {};
    },
  }),
  cmd({
    id: 'aruba.noshutdown', vendor: 'aruba', deviceTypes: SW, modes: ['config-if'], syntax: 'no shutdown',
    helpEn: 'Enable the interface', descTh: 'เปิดพอร์ต (พอร์ต AOS-CX เริ่มต้นเป็น shutdown)', topic: 'Interface',
    example: 'no shutdown', verify: 'show interface brief', verifyTh: 'Enabled=yes และ Status=up เมื่อปลายสายอีกฝั่งเปิดอยู่',
    run: (c) => {
      const i = curIface(c);
      if (!i) return { error: ['% No interface selected'] };
      i.adminUp = true;
      return {};
    },
  }),
  cmd({
    id: 'aruba.norouting', vendor: 'aruba', deviceTypes: SW, modes: ['config-if'], syntax: 'no routing',
    helpEn: 'Disable routing on this interface (make it a Layer 2 port)', descTh: 'เปลี่ยนพอร์ตจาก routed เป็น Layer 2 — ต้องทำก่อนใช้ vlan access', topic: 'VLAN',
    example: 'no routing', verify: 'show interface brief', verifyTh: 'Mode ต้องเป็น access',
    run: (c) => {
      const i = curIface(c);
      if (!i) return { error: ['% No interface selected'] };
      i.routed = false;
      return {};
    },
  }),
  cmd({
    id: 'aruba.routing', vendor: 'aruba', deviceTypes: SW, modes: ['config-if'], syntax: 'routing',
    helpEn: 'Enable routing on this interface', descTh: 'เปลี่ยนพอร์ตกลับเป็น routed (L3) — พอร์ตจะไม่ส่งต่อ VLAN', topic: 'VLAN',
    example: 'routing', verify: 'show interface brief', verifyTh: 'Mode ต้องเป็น routed',
    run: (c) => {
      const i = curIface(c);
      if (!i) return { error: ['% No interface selected'] };
      i.routed = true;
      i.accessVlan = 1;
      return {};
    },
  }),
  cmd({
    id: 'aruba.vlan.access', vendor: 'aruba', deviceTypes: SW, modes: ['config-if'], syntax: 'vlan access <vlan-id>',
    helpEn: 'Set the access VLAN of the interface', descTh: 'กำหนด access VLAN (untagged) ให้พอร์ต L2 — VLAN ต้องถูกสร้างไว้ก่อน', topic: 'VLAN',
    example: 'vlan access 10', verify: 'show vlan', verifyTh: 'พอร์ตต้องอยู่ในแถว VLAN ที่ตั้ง',
    run: (c) => {
      const i = curIface(c);
      if (!i) return { error: ['% No interface selected'] };
      const id = Number(c.args[0]);
      if (i.routed) return { error: [`Interface ${i.name} is in routed mode. Use 'no routing' first to make it a Layer 2 port.`] };
      if (!c.dev.vlans.some((v) => v.id === id)) return { error: [`VLAN ${id} does not exist. Create it first with 'vlan ${id}'.`] };
      i.accessVlan = id;
      return {};
    },
  }),
  cmd({
    id: 'aruba.description', vendor: 'aruba', deviceTypes: SW, modes: ['config-if'], syntax: 'description <text>',
    helpEn: 'Set the interface description', descTh: 'ตั้งคำอธิบายพอร์ต', topic: 'Interface',
    example: 'description UPLINK', verify: 'show running-config', verifyTh: 'ต้องเห็นบรรทัด description ใต้ interface',
    run: (c) => {
      const i = curIface(c);
      if (!i) return { error: ['% No interface selected'] };
      i.description = c.args[0].slice(0, 200);
      return {};
    },
  }),
];

export const ARUBA_SPECS = specs;
