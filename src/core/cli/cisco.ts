/**
 * Cisco IOS CLI profile.
 * Reference: Catalyst 2960 on IOS 15.0(2)SE (switch) and ISR 2911 on IOS 15.4(3)M (router).
 * Output formats are close to, but simplified from, the real devices.
 */
import { isHostAddress, maskToPrefix, networkOf, ipToString, subnetsOverlap } from '../ip';
import { NAME_RE, getIface } from '../lab';
import { PROFILES, shortPort } from '../profiles';
import { ping, portLine } from '../network';
import type { Device, DeviceKind, Iface, Lab } from '../types';
import { cmd, type CommandSpec, type Ctx, type RunResult } from './spec';

const RT: DeviceKind[] = ['cisco-router'];
const SW: DeviceKind[] = ['cisco-switch'];
const BOTH: DeviceKind[] = ['cisco-router', 'cisco-switch'];

const curIface = (c: Ctx): Iface | undefined => (c.dev.cli.ctxIface ? getIface(c.dev, c.dev.cli.ctxIface) : undefined);

// ───────── renderers ─────────

export function ciscoRunningConfig(dev: Device): string[] {
  const p = PROFILES[dev.kind];
  const body: string[] = ['!', `version ${dev.kind === 'cisco-router' ? '15.4' : '15.0'}`, '!', `hostname ${dev.name}`, '!'];
  if (p.isSwitch) {
    for (const v of dev.vlans.filter((x) => x.id !== 1)) body.push(`vlan ${v.id}`, ` name ${v.name}`, '!');
  }
  for (const i of dev.ifaces) {
    body.push(`interface ${i.name}`);
    if (i.description) body.push(` description ${i.description}`);
    if (p.isSwitch) {
      if (i.accessVlan !== 1) body.push(` switchport access vlan ${i.accessVlan}`);
      if (i.modeAccess) body.push(' switchport mode access');
    } else if (i.ip && i.mask) body.push(` ip address ${i.ip} ${i.mask}`);
    else body.push(' no ip address');
    if (!i.adminUp) body.push(' shutdown');
    body.push('!');
  }
  body.push('end');
  const size = body.join('\n').length;
  return ['Building configuration...', '', `Current configuration : ${size} bytes`, ...body];
}

function wrapPorts(ports: string[], indent: number, width = 32): string[] {
  const lines: string[] = [];
  let cur = '';
  ports.forEach((p, idx) => {
    const piece = idx === ports.length - 1 ? p : `${p}, `;
    if (cur && (cur + piece).length > width) {
      lines.push(cur.trimEnd());
      cur = '';
    }
    cur += piece;
  });
  if (cur) lines.push(cur.trimEnd());
  return lines.map((l, i) => (i === 0 ? l : ' '.repeat(indent) + l));
}

function showVlanBrief(dev: Device): string[] {
  const out = [
    'VLAN Name                             Status    Ports',
    '---- -------------------------------- --------- -------------------------------',
  ];
  for (const v of [...dev.vlans].sort((a, b) => a.id - b.id)) {
    const ports = dev.ifaces.filter((i) => i.accessVlan === v.id).map((i) => shortPort(i.name));
    const wrapped = wrapPorts(ports, 48);
    out.push(`${String(v.id).padEnd(5)}${v.name.padEnd(33)}${'active'.padEnd(10)}${wrapped[0] ?? ''}`.trimEnd());
    out.push(...wrapped.slice(1));
  }
  return out;
}

function showInterfacesStatus(lab: Lab, dev: Device): string[] {
  const out = ['Port      Name               Status       Vlan       Duplex  Speed Type'];
  for (const i of dev.ifaces) {
    const line = portLine(lab, dev, i);
    const status = line === 'up' ? 'connected' : line === 'admin-down' ? 'disabled' : 'notconnect';
    const giga = i.name.startsWith('Gigabit');
    const up = line === 'up';
    out.push(
      [
        shortPort(i.name).padEnd(10),
        i.description.slice(0, 18).padEnd(19),
        status.padEnd(13),
        String(i.accessVlan).padEnd(11),
        (up ? 'a-full' : 'auto').padEnd(8),
        (up ? (giga ? 'a-1000' : 'a-100') : 'auto').padEnd(6),
        giga ? '10/100/1000BaseTX' : '10/100BaseTX',
      ]
        .join('')
        .trimEnd(),
    );
  }
  return out;
}

function showIpIntBrief(lab: Lab, dev: Device): string[] {
  const out = ['Interface                  IP-Address      OK? Method Status                Protocol'];
  for (const i of dev.ifaces) {
    const line = portLine(lab, dev, i);
    const status = line === 'admin-down' ? 'administratively down' : line === 'up' ? 'up' : 'down';
    const proto = line === 'up' ? 'up' : 'down';
    out.push(
      `${i.name.padEnd(27)}${(i.ip ?? 'unassigned').padEnd(16)}YES ${(i.ip ? 'manual' : 'unset').padEnd(7)}${status.padEnd(22)}${proto}`,
    );
  }
  return out;
}

function showIpRoute(lab: Lab, dev: Device): string[] {
  const out = [
    'Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP',
    '       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area',
    '',
    'Gateway of last resort is not set',
    '',
  ];
  const up = dev.ifaces.filter((i) => i.ip && i.mask && portLine(lab, dev, i) === 'up');
  if (!up.length) return [...out.slice(0, 4)];
  for (const i of up) {
    const net = ipToString(networkOf(i.ip!, i.mask!)!);
    out.push(`C        ${net}/${maskToPrefix(i.mask!)} is directly connected, ${i.name}`);
    out.push(`L        ${i.ip}/32 is directly connected, ${i.name}`);
  }
  return out;
}

function showVersion(dev: Device): string[] {
  const rt = dev.kind === 'cisco-router';
  return [
    rt
      ? 'Cisco IOS Software, C2900 Software (C2900-UNIVERSALK9-M), Version 15.4(3)M, RELEASE SOFTWARE (fc1)'
      : 'Cisco IOS Software, C2960 Software (C2960-LANBASEK9-M), Version 15.0(2)SE, RELEASE SOFTWARE (fc1)',
    `${dev.name} uptime is 0 minutes`,
    rt ? 'Cisco CISCO2911/K9 (revision 1.0) processor' : 'cisco WS-C2960-24TT-L (PowerPC405) processor',
    `${dev.ifaces.length} ${rt ? 'Gigabit' : 'FastEthernet/Gigabit'} Ethernet interfaces`,
    '*** Simulated device — Network Lab Studio ***',
  ];
}

function ciscoPing(c: Ctx): RunResult {
  const ip = c.args[0];
  const r = ping(c.lab, c.dev.id, ip);
  const ok = r.ok;
  const lines = ['Type escape sequence to abort.', `Sending 5, 100-byte ICMP Echos to ${ip}, timeout is 2 seconds:`];
  lines.push(ok ? '!!!!!' : '.....');
  lines.push(
    ok
      ? 'Success rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms'
      : 'Success rate is 0 percent (0/5)',
  );
  return { lines };
}

// ───────── handlers ─────────

const setMode = (mode: RunResult['mode']) => (): RunResult => ({ mode });

function exitCmd(c: Ctx): RunResult {
  switch (c.dev.cli.mode) {
    case 'config-if':
    case 'config-vlan':
      return { mode: 'config', ctxIface: null, ctxVlan: null };
    case 'config':
      return { mode: 'priv' };
    case 'priv':
      return { mode: 'user' };
    default:
      return {};
  }
}

function saveConfig(c: Ctx): RunResult {
  c.dev.startupConfig = ciscoRunningConfig(c.dev).join('\n');
  return { lines: ['Building configuration...', '[OK]'] };
}

function interfaceCmd(c: Ctx): RunResult {
  return { mode: 'config-if', ctxIface: c.args[0], ctxVlan: null };
}

function vlanCmd(c: Ctx): RunResult {
  const id = Number(c.args[0]);
  if (!c.dev.vlans.some((v) => v.id === id)) {
    c.dev.vlans.push({ id, name: `VLAN${String(id).padStart(4, '0')}` });
    c.dev.vlans.sort((a, b) => a.id - b.id);
  }
  return { mode: 'config-vlan', ctxVlan: id, ctxIface: null };
}

const specs: CommandSpec[] = [
  // ── modes ──
  cmd({
    id: 'cisco.enable', vendor: 'cisco', deviceTypes: BOTH, modes: ['user'], syntax: 'enable',
    helpEn: 'Turn on privileged commands', descTh: 'เข้า Privileged EXEC mode (prompt เปลี่ยนจาก > เป็น #)', topic: 'Mode',
    example: 'enable', verify: 'configure terminal', verifyTh: 'prompt ต้องลงท้ายด้วย # และใช้ configure terminal ได้',
    run: setMode('priv'),
  }),
  cmd({
    id: 'cisco.disable', vendor: 'cisco', deviceTypes: BOTH, modes: ['priv'], syntax: 'disable',
    helpEn: 'Turn off privileged commands', descTh: 'กลับไป User EXEC mode', topic: 'Mode',
    example: 'disable', verify: 'enable', verifyTh: 'prompt ต้องกลับเป็น >',
    run: setMode('user'),
  }),
  cmd({
    id: 'cisco.configure', vendor: 'cisco', deviceTypes: BOTH, modes: ['priv'], syntax: 'configure terminal',
    helpEn: 'Configuration from the terminal', descTh: 'เข้า Global Configuration mode เพื่อแก้ config', topic: 'Mode',
    example: 'configure terminal', verify: 'hostname TEST', verifyTh: 'prompt ต้องเป็น (config)#',
    run: () => ({ mode: 'config', lines: ['Enter configuration commands, one per line.  End with CNTL/Z.'] }),
  }),
  cmd({
    id: 'cisco.exit', vendor: 'cisco', deviceTypes: BOTH, modes: ['user', 'priv', 'config', 'config-if', 'config-vlan'], syntax: 'exit',
    helpEn: 'Exit from the EXEC / current configuration level', descTh: 'ถอยออกหนึ่งระดับ (config-if → config → priv → user)', topic: 'Mode',
    example: 'exit', verify: '(ดู prompt)', verifyTh: 'prompt ต้องย้อนกลับหนึ่งระดับ',
    run: exitCmd,
  }),
  cmd({
    id: 'cisco.end', vendor: 'cisco', deviceTypes: BOTH, modes: ['config', 'config-if', 'config-vlan'], syntax: 'end',
    helpEn: 'Exit from configure mode', descTh: 'กลับ Privileged EXEC ทันทีจากทุกระดับของ config', topic: 'Mode',
    example: 'end', verify: 'show running-config', verifyTh: 'prompt ต้องลงท้ายด้วย #',
    run: () => ({ mode: 'priv', ctxIface: null, ctxVlan: null }),
  }),
  cmd({
    id: 'cisco.do', vendor: 'cisco', deviceTypes: BOTH, modes: ['config', 'config-if', 'config-vlan'], syntax: 'do <command>',
    helpEn: 'To run exec commands in config mode', descTh: 'รันคำสั่ง EXEC (เช่น show) โดยไม่ต้องออกจาก config mode', topic: 'Troubleshooting',
    example: 'do show running-config', verify: '(ผลลัพธ์แสดงทันที)', verifyTh: 'ต้องเห็นผล show โดย prompt ไม่เปลี่ยน',
    special: 'do',
  }),

  // ── show ──
  cmd({
    id: 'cisco.show.run', vendor: 'cisco', deviceTypes: BOTH, modes: ['priv'], syntax: 'show running-config',
    helpEn: 'Current operating configuration', descTh: 'ดู configuration ปัจจุบัน (hostname, VLAN, interface, IP, shutdown)', topic: 'Config',
    example: 'show running-config', verify: 'show running-config', verifyTh: 'หาบรรทัด interface ที่เพิ่งแก้',
    run: (c) => ({ lines: ciscoRunningConfig(c.dev) }),
  }),
  cmd({
    id: 'cisco.show.start', vendor: 'cisco', deviceTypes: BOTH, modes: ['priv'], syntax: 'show startup-config',
    helpEn: 'Contents of startup configuration', descTh: 'ดู config ที่บันทึกไว้ใน NVRAM (หลัง write memory)', topic: 'Config',
    example: 'show startup-config', verify: 'show startup-config', verifyTh: 'ถ้ายังไม่เคยบันทึกจะขึ้น startup-config is not present',
    run: (c) => (c.dev.startupConfig ? { lines: c.dev.startupConfig.split('\n') } : { lines: ['startup-config is not present'] }),
  }),
  cmd({
    id: 'cisco.show.version', vendor: 'cisco', deviceTypes: BOTH, modes: ['user', 'priv'], syntax: 'show version',
    helpEn: 'System hardware and software status', descTh: 'ดูรุ่นอุปกรณ์จำลองและเวอร์ชัน IOS อ้างอิง', topic: 'Troubleshooting',
    example: 'show version', verify: 'show version', verifyTh: 'ดูรุ่นและเวอร์ชัน',
    run: (c) => ({ lines: showVersion(c.dev) }),
  }),
  cmd({
    id: 'cisco.show.ipbrief', vendor: 'cisco', deviceTypes: RT, modes: ['user', 'priv'], syntax: 'show ip interface brief',
    helpEn: 'Brief summary of IP status and configuration', descTh: 'สรุป IP และสถานะ (Status/Protocol) ของทุก interface บน router', topic: 'Interface',
    example: 'show ip interface brief', verify: 'show ip interface brief', verifyTh: 'ดู Status=up และ Protocol=up',
    run: (c) => ({ lines: showIpIntBrief(c.lab, c.dev) }),
  }),
  cmd({
    id: 'cisco.show.iproute', vendor: 'cisco', deviceTypes: RT, modes: ['user', 'priv'], syntax: 'show ip route',
    helpEn: 'IP routing table', descTh: 'ดูตาราง routing (รุ่นแรกมีเฉพาะ Connected/Local)', topic: 'IP',
    example: 'show ip route', verify: 'show ip route', verifyTh: 'ต้องเห็น C (connected) ของ subnet ที่ interface up/up',
    run: (c) => ({ lines: showIpRoute(c.lab, c.dev) }),
  }),
  cmd({
    id: 'cisco.show.intstatus', vendor: 'cisco', deviceTypes: SW, modes: ['user', 'priv'], syntax: 'show interfaces status',
    helpEn: 'Interface status', descTh: 'ดูสถานะพอร์ตของ switch (connected / notconnect / disabled) และ VLAN', topic: 'Interface',
    example: 'show interfaces status', verify: 'show interfaces status', verifyTh: 'Status=disabled แปลว่าถูก shutdown',
    run: (c) => ({ lines: showInterfacesStatus(c.lab, c.dev) }),
  }),
  cmd({
    id: 'cisco.show.vlanbrief', vendor: 'cisco', deviceTypes: SW, modes: ['user', 'priv'], syntax: 'show vlan brief',
    helpEn: 'VLAN membership summary', descTh: 'ดู VLAN ทั้งหมดและพอร์ตที่อยู่ในแต่ละ VLAN', topic: 'VLAN',
    example: 'show vlan brief', verify: 'show vlan brief', verifyTh: 'พอร์ตที่ตั้ง access VLAN ต้องอยู่ในแถวของ VLAN นั้น',
    run: (c) => ({ lines: showVlanBrief(c.dev) }),
  }),
  cmd({
    id: 'cisco.ping', vendor: 'cisco', deviceTypes: RT, modes: ['user', 'priv'], syntax: 'ping <ip-address>',
    helpEn: 'Send echo messages', descTh: 'ทดสอบ ping จาก router ไปยัง IPv4 ปลายทาง', topic: 'Troubleshooting',
    example: 'ping 192.168.1.101', verify: 'ping 192.168.1.101', verifyTh: '!!!!! = สำเร็จ, ..... = ไม่สำเร็จ',
    run: ciscoPing,
  }),

  // ── save ──
  cmd({
    id: 'cisco.write', vendor: 'cisco', deviceTypes: BOTH, modes: ['priv'], syntax: 'write memory',
    helpEn: 'Write to NV memory', descTh: 'บันทึก running-config ลง startup-config', topic: 'Config',
    example: 'write memory', verify: 'show startup-config', verifyTh: 'startup-config ต้องไม่ว่างแล้ว',
    run: saveConfig,
  }),
  cmd({
    id: 'cisco.copy', vendor: 'cisco', deviceTypes: BOTH, modes: ['priv'], syntax: 'copy running-config startup-config',
    helpEn: 'Copy running configuration to startup configuration', descTh: 'บันทึก running-config ลง startup-config (เทียบเท่า write memory)', topic: 'Config',
    example: 'copy running-config startup-config', verify: 'show startup-config', verifyTh: 'startup-config ต้องไม่ว่างแล้ว',
    run: saveConfig,
  }),

  // ── global config ──
  cmd({
    id: 'cisco.hostname', vendor: 'cisco', deviceTypes: BOTH, modes: ['config'], syntax: 'hostname <hostname>',
    helpEn: "Set system's network name", descTh: 'เปลี่ยนชื่ออุปกรณ์ (prompt และชื่อบน canvas เปลี่ยนตาม)', topic: 'Config',
    example: 'hostname CORE1', verify: 'show running-config', verifyTh: 'prompt ต้องเปลี่ยนเป็นชื่อใหม่',
    run: (c) => {
      if (!NAME_RE.test(c.args[0])) return { error: ['% Invalid hostname (ใช้ A-Z, 0-9, -, _ ได้ไม่เกิน 24 ตัวอักษร)'] };
      c.dev.name = c.args[0];
      return {};
    },
  }),
  cmd({
    id: 'cisco.interface.rt', vendor: 'cisco', deviceTypes: RT, modes: ['config', 'config-if', 'config-vlan'], syntax: 'interface <interface>',
    helpEn: 'Select an interface to configure', descTh: 'เข้า Interface Configuration mode ของพอร์ต router', topic: 'Interface',
    example: 'interface GigabitEthernet0/1', verify: 'show ip interface brief', verifyTh: 'prompt ต้องเป็น (config-if)#',
    run: interfaceCmd,
  }),
  cmd({
    id: 'cisco.interface.sw', vendor: 'cisco', deviceTypes: SW, modes: ['config', 'config-if', 'config-vlan'], syntax: 'interface <interface>',
    helpEn: 'Select an interface to configure', descTh: 'เข้า Interface Configuration mode ของพอร์ต switch (ย่อได้ เช่น fa0/1, gi0/2)', topic: 'Interface',
    example: 'interface FastEthernet0/1', verify: 'show interfaces status', verifyTh: 'prompt ต้องเป็น (config-if)#',
    run: interfaceCmd,
  }),
  cmd({
    id: 'cisco.vlan', vendor: 'cisco', deviceTypes: SW, modes: ['config', 'config-if', 'config-vlan'], syntax: 'vlan <vlan-id>',
    helpEn: 'VLAN commands', descTh: 'สร้าง VLAN (หรือเข้าแก้ VLAN เดิม) แล้วเข้า config-vlan', topic: 'VLAN',
    example: 'vlan 30', verify: 'show vlan brief', verifyTh: 'VLAN ใหม่ต้องปรากฏในตาราง',
    run: vlanCmd,
  }),
  cmd({
    id: 'cisco.no.vlan', vendor: 'cisco', deviceTypes: SW, modes: ['config'], syntax: 'no vlan <vlan-id>',
    helpEn: 'VLAN commands', descTh: 'ลบ VLAN (พอร์ตที่อยู่ใน VLAN นั้นจะหยุดส่งต่อจนกว่าจะสร้างใหม่หรือย้ายพอร์ต)', topic: 'VLAN',
    example: 'no vlan 30', verify: 'show vlan brief', verifyTh: 'VLAN ต้องหายไปจากตาราง',
    run: (c) => {
      const id = Number(c.args[0]);
      if (id === 1) return { error: ['%Default VLAN 1 may not be deleted.'] };
      c.dev.vlans = c.dev.vlans.filter((v) => v.id !== id);
      return {};
    },
  }),
  cmd({
    id: 'cisco.vlan.name', vendor: 'cisco', deviceTypes: SW, modes: ['config-vlan'], syntax: 'name <name>',
    helpEn: 'Ascii name of the VLAN', descTh: 'ตั้งชื่อ VLAN (ใช้ตัวอักษรไม่มีช่องว่าง)', topic: 'VLAN',
    example: 'name STAFF', verify: 'show vlan brief', verifyTh: 'ชื่อ VLAN ต้องเปลี่ยน',
    run: (c) => {
      const v = c.dev.vlans.find((x) => x.id === c.dev.cli.ctxVlan);
      if (!v) return { error: ['% No VLAN selected'] };
      if (c.args[0].length > 32) return { error: ['% VLAN name too long (max 32)'] };
      v.name = c.args[0];
      return {};
    },
  }),

  // ── interface config ──
  cmd({
    id: 'cisco.shutdown', vendor: 'cisco', deviceTypes: BOTH, modes: ['config-if'], syntax: 'shutdown',
    helpEn: 'Shutdown the selected interface', descTh: 'ปิดพอร์ต (administratively down) — ลิงก์ที่ต่อกับพอร์ตนี้จะ down', topic: 'Interface',
    example: { 'cisco-router': 'shutdown', 'cisco-switch': 'shutdown' }, verify: 'show ip interface brief / show interfaces status',
    verifyTh: 'Status ต้องเป็น administratively down (router) หรือ disabled (switch)',
    run: (c) => {
      const i = curIface(c);
      if (!i) return { error: ['% No interface selected'] };
      i.adminUp = false;
      return { lines: [`%LINK-5-CHANGED: Interface ${i.name}, changed state to administratively down`] };
    },
  }),
  cmd({
    id: 'cisco.noshutdown', vendor: 'cisco', deviceTypes: BOTH, modes: ['config-if'], syntax: 'no shutdown',
    helpEn: 'Shutdown the selected interface', descTh: 'เปิดพอร์ต (router ทุกพอร์ตเริ่มต้นเป็น shutdown ต้องสั่งก่อนใช้งาน)', topic: 'Interface',
    example: 'no shutdown', verify: 'show ip interface brief / show interfaces status', verifyTh: 'Status ต้องเป็น up เมื่อปลายสายอีกฝั่งเปิดอยู่ด้วย',
    run: (c) => {
      const i = curIface(c);
      if (!i) return { error: ['% No interface selected'] };
      i.adminUp = true;
      return { lines: [`%LINK-3-UPDOWN: Interface ${i.name}, changed state to up`] };
    },
  }),
  cmd({
    id: 'cisco.description', vendor: 'cisco', deviceTypes: BOTH, modes: ['config-if'], syntax: 'description <text>',
    helpEn: 'Interface specific description', descTh: 'ตั้งคำอธิบายพอร์ต (เช่น UPLINK-TO-SW2)', topic: 'Interface',
    example: 'description UPLINK', verify: 'show running-config', verifyTh: 'ต้องเห็นบรรทัด description ใต้ interface',
    run: (c) => {
      const i = curIface(c);
      if (!i) return { error: ['% No interface selected'] };
      i.description = c.args[0].slice(0, 200);
      return {};
    },
  }),
  cmd({
    id: 'cisco.switchport.mode', vendor: 'cisco', deviceTypes: SW, modes: ['config-if'], syntax: 'switchport mode access',
    helpEn: 'Set trunking mode to ACCESS unconditionally', descTh: 'กำหนดให้พอร์ตเป็น access port (untagged VLAN เดียว)', topic: 'VLAN',
    example: 'switchport mode access', verify: 'show running-config', verifyTh: 'ต้องเห็น switchport mode access ใต้ interface',
    run: (c) => {
      const i = curIface(c);
      if (!i) return { error: ['% No interface selected'] };
      i.modeAccess = true;
      return {};
    },
  }),
  cmd({
    id: 'cisco.switchport.vlan', vendor: 'cisco', deviceTypes: SW, modes: ['config-if'], syntax: 'switchport access vlan <vlan-id>',
    helpEn: 'Set VLAN when interface is in access mode', descTh: 'กำหนด access VLAN ให้พอร์ต — เฟรมของพอร์ตนี้จะอยู่ใน VLAN นี้', topic: 'VLAN',
    example: 'switchport access vlan 10', verify: 'show vlan brief', verifyTh: 'พอร์ตต้องไปอยู่ในแถว VLAN ที่ตั้ง',
    run: (c) => {
      const i = curIface(c);
      if (!i) return { error: ['% No interface selected'] };
      const id = Number(c.args[0]);
      const lines: string[] = [];
      if (!c.dev.vlans.some((v) => v.id === id)) {
        c.dev.vlans.push({ id, name: `VLAN${String(id).padStart(4, '0')}` });
        c.dev.vlans.sort((a, b) => a.id - b.id);
        lines.push(`% Access VLAN does not exist. Creating vlan ${id}`);
      }
      i.accessVlan = id;
      return { lines };
    },
  }),
  cmd({
    id: 'cisco.ipaddress', vendor: 'cisco', deviceTypes: RT, modes: ['config-if'], syntax: 'ip address <ip-address> <subnet-mask>',
    helpEn: 'Set the IP address of an interface', descTh: 'ตั้ง IPv4 และ subnet mask ให้ routed interface', topic: 'IP',
    example: 'ip address 10.0.0.1 255.255.255.0', verify: 'show ip interface brief', verifyTh: 'ต้องเห็น IP ใหม่ในคอลัมน์ IP-Address',
    run: (c) => {
      const i = curIface(c);
      if (!i) return { error: ['% No interface selected'] };
      const [ip, mask] = c.args;
      if (!isHostAddress(ip, mask)) return { error: ['Bad mask / invalid address (ไม่ใช่ host address ที่ใช้ได้ใน subnet นี้)'] };
      for (const o of c.dev.ifaces) {
        if (o !== i && o.ip && o.mask && subnetsOverlap(ip, mask, o.ip, o.mask)) {
          return { error: [`% ${ipToString(networkOf(ip, mask)!)} overlaps with ${o.name}`] };
        }
      }
      i.ip = ip;
      i.mask = mask;
      return {};
    },
  }),
  cmd({
    id: 'cisco.noipaddress', vendor: 'cisco', deviceTypes: RT, modes: ['config-if'], syntax: 'no ip address',
    helpEn: 'Remove the IP address of an interface', descTh: 'ลบ IP ออกจาก interface', topic: 'IP',
    example: 'no ip address', verify: 'show ip interface brief', verifyTh: 'IP-Address ต้องเป็น unassigned',
    run: (c) => {
      const i = curIface(c);
      if (!i) return { error: ['% No interface selected'] };
      i.ip = null;
      i.mask = null;
      return {};
    },
  }),
];

export const CISCO_SPECS = specs;
