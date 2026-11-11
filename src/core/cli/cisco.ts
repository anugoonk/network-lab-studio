/**
 * Cisco IOS CLI profile.
 * Reference: Catalyst 2960 on IOS 15.0(2)SE (L2 switch) and ISR 2911 on IOS 15.4(3)M (router).
 * Output formats are close to, but simplified from, the real devices.
 * Note: the L2 switch has no `ip routing` — an SVI is a management address only (use `ip default-gateway`).
 */
import { arpTable, duplicateIps, fmtMacCisco, macTable } from '../l2tables';
import { ipToString, isHostAddress, maskToPrefix, networkOf, parseIp, subnetsOverlap } from '../ip';
import { NAME_RE, formatVlanList, getIface, parseVlanList, subName } from '../lab';
import { PROFILES, shortPort } from '../profiles';
import { l3Interfaces, ping, portLine } from '../network';
import type { Device, DeviceKind, Lab } from '../types';
import { cmd, curTarget, enterInterfaceRange, overlapWith, type CommandSpec, type Ctx, type RunResult } from './spec';
import { tx } from '../../i18n';

const RT: DeviceKind[] = ['cisco-router', 'isp-router'];
const SW: DeviceKind[] = ['cisco-switch'];
const BOTH: DeviceKind[] = ['cisco-router', 'isp-router', 'cisco-switch'];

const physIface = (c: Ctx) => (c.dev.cli.ctxIface ? getIface(c.dev, c.dev.cli.ctxIface) : undefined);

function targetName(c: Ctx): string {
  const d = c.dev;
  if (d.cli.mode === 'config-svi') return `Vlan${d.cli.ctxVlan}`;
  return d.cli.ctxIface ?? '?';
}

// ───────── renderers ─────────

function ifaceBlock(d: Device, name: string): string[] {
  const i = getIface(d, name)!;
  const sw = PROFILES[d.kind].isSwitch;
  const out = [`interface ${i.name}`];
  if (i.description) out.push(` description ${i.description}`);
  if (sw) {
    if (i.trunk) {
      if (i.nativeVlan !== 1) out.push(` switchport trunk native vlan ${i.nativeVlan}`);
      if (i.trunkAllowed !== null) out.push(` switchport trunk allowed vlan ${formatVlanList(i.trunkAllowed)}`);
      out.push(' switchport mode trunk');
    } else {
      if (i.accessVlan !== 1) out.push(` switchport access vlan ${i.accessVlan}`);
      if (i.modeAccess) out.push(' switchport mode access');
    }
  } else if (i.ip && i.mask) out.push(` ip address ${i.ip} ${i.mask}`);
  else out.push(' no ip address');
  if (!i.adminUp) out.push(' shutdown');
  out.push('!');
  for (const s of d.subifs.filter((x) => x.parent === name)) {
    out.push(`interface ${subName(s)}`);
    if (s.description) out.push(` description ${s.description}`);
    if (s.vlan !== null) out.push(` encapsulation dot1Q ${s.vlan}`);
    if (s.ip && s.mask) out.push(` ip address ${s.ip} ${s.mask}`);
    else out.push(' no ip address');
    if (!s.adminUp) out.push(' shutdown');
    out.push('!');
  }
  return out;
}

export function ciscoRunningConfig(dev: Device): string[] {
  const p = PROFILES[dev.kind];
  const body: string[] = ['!', `version ${p.isRouter ? '15.4' : '15.0'}`, '!', `hostname ${dev.name}`, '!'];
  if (p.isSwitch) {
    for (const v of dev.vlans.filter((x) => x.id !== 1)) body.push(`vlan ${v.id}`, ` name ${v.name}`, '!');
  }
  for (const i of dev.ifaces) body.push(...ifaceBlock(dev, i.name));
  for (const v of dev.svis) {
    body.push(`interface Vlan${v.vlan}`);
    if (v.description) body.push(` description ${v.description}`);
    if (v.ip && v.mask) body.push(` ip address ${v.ip} ${v.mask}`);
    else body.push(' no ip address');
    if (!v.adminUp) body.push(' shutdown');
    body.push('!');
  }
  if (dev.kind === 'cisco-switch' && dev.gateway) body.push(`ip default-gateway ${dev.gateway}`);
  for (const r of dev.routes) body.push(`ip route ${r.net} ${r.mask} ${r.nextHop}`);
  if (dev.routes.length) body.push('!');
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
    // like the real command, trunk ports are not listed
    const ports = dev.ifaces.filter((i) => !i.trunk && i.accessVlan === v.id).map((i) => shortPort(i.name));
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
        (i.trunk ? 'trunk' : String(i.accessVlan)).padEnd(11),
        (up ? 'a-full' : 'auto').padEnd(8),
        (up ? (giga ? 'a-1000' : 'a-100') : 'auto').padEnd(7),
        giga ? '10/100/1000BaseTX' : '10/100BaseTX',
      ]
        .join('')
        .trimEnd(),
    );
  }
  return out;
}

function showInterfacesTrunk(lab: Lab, dev: Device): string[] {
  const trunks = dev.ifaces.filter((i) => i.trunk);
  if (!trunks.length) return [];
  const existing = new Set(dev.vlans.map((v) => v.id));
  const allowedOf = (i: (typeof trunks)[number]) => (i.trunkAllowed === null ? [...existing] : i.trunkAllowed);
  const sec = (title: string, row: (i: (typeof trunks)[number]) => string): string[] => [
    '',
    `Port        ${title}`,
    ...trunks.map((i) => `${shortPort(i.name).padEnd(12)}${row(i)}`),
  ];
  return [
    'Port        Mode             Encapsulation  Status        Native vlan',
    ...trunks.map((i) => {
      const up = portLine(lab, dev, i) === 'up';
      return `${shortPort(i.name).padEnd(12)}${'on'.padEnd(17)}${'802.1q'.padEnd(15)}${(up ? 'trunking' : 'not-trunking').padEnd(14)}${i.nativeVlan}`;
    }),
    ...sec('Vlans allowed on trunk', (i) => formatVlanList(i.trunkAllowed)),
    ...sec('Vlans allowed and active in management domain', (i) => formatVlanList(allowedOf(i).filter((v) => existing.has(v)).sort((a, b) => a - b)) || 'none'),
    ...sec('Vlans in spanning tree forwarding state and not pruned', (i) =>
      portLine(lab, dev, i) === 'up' ? formatVlanList(allowedOf(i).filter((v) => existing.has(v)).sort((a, b) => a - b)) : 'none',
    ),
  ];
}

function showIpIntBrief(lab: Lab, dev: Device): string[] {
  const out = ['Interface                  IP-Address      OK? Method Status                Protocol'];
  const row = (name: string, ip: string | null, status: string, proto: string) =>
    `${name.padEnd(27)}${(ip ?? 'unassigned').padEnd(16)}YES ${(ip ? 'manual' : 'unset').padEnd(7)}${status.padEnd(22)}${proto}`;
  const l3 = l3Interfaces(lab, dev);
  if (dev.kind === 'cisco-switch') {
    for (const v of dev.svis) {
      const ifc = l3.find((x) => x.kind === 'svi' && x.vlan === v.vlan);
      out.push(row(`Vlan${v.vlan}`, v.ip, v.adminUp ? (ifc?.up ? 'up' : 'down') : 'administratively down', ifc?.up ? 'up' : 'down'));
    }
  }
  for (const i of dev.ifaces) {
    const line = portLine(lab, dev, i);
    const status = line === 'admin-down' ? 'administratively down' : line === 'up' ? 'up' : 'down';
    out.push(row(i.name, i.ip, status, line === 'up' ? 'up' : 'down'));
    for (const s of dev.subifs.filter((x) => x.parent === i.name)) {
      const ifc = l3.find((x) => x.name === subName(s));
      const adm = i.adminUp && s.adminUp;
      out.push(row(subName(s), s.ip, adm ? (ifc?.up ? 'up' : 'down') : 'administratively down', ifc?.up ? 'up' : 'down'));
    }
  }
  return out;
}

/** syslog-style warning when the interface now shares an address with another one in its L2 domain (IOS prints this when the duplicate answers ARP) */
function dupLines(c: Ctx, ifName: string): string[] {
  const out: string[] = [];
  for (const d of duplicateIps(c.lab)) {
    if (!d.members.some((m) => m.deviceId === c.dev.id && m.ifaceName === ifName)) continue;
    for (const m of d.members.filter((x) => x.deviceId !== c.dev.id)) {
      out.push(`%IP-4-DUPADDR: Duplicate address ${d.ip} on ${ifName}, sourced by ${fmtMacCisco(m.mac)}`);
    }
  }
  return out;
}

function showIpArp(lab: Lab, dev: Device): string[] {
  const out = ['Protocol  Address          Age (min)  Hardware Addr   Type   Interface'];
  const rows = arpTable(lab, dev).sort((a, b) => a.iface.localeCompare(b.iface) || Number(!a.own) - Number(!b.own) || a.ip.localeCompare(b.ip, undefined, { numeric: true }));
  for (const r of rows) {
    out.push(`Internet  ${r.ip.padEnd(16)}${(r.own ? '-' : '0').padStart(10)}  ${fmtMacCisco(r.mac)}  ARPA   ${r.iface}`);
  }
  return out;
}

function showMacTable(lab: Lab, dev: Device): string[] {
  const rows = macTable(lab, dev);
  const out = ['          Mac Address Table', '-------------------------------------------', '', 'Vlan    Mac Address       Type        Ports', '----    -----------       --------    -----'];
  for (const r of rows) out.push(`${String(r.vlan).padStart(4)}    ${fmtMacCisco(r.mac)}    ${r.type.padEnd(12)}${r.port === 'CPU' ? 'CPU' : shortPort(r.port)}`);
  out.push(`Total Mac Addresses for this criterion: ${rows.length}`);
  return out;
}

/** classful network (A/B/C) of an address: [base, prefix length] — IOS groups `show ip route` entries by it */
function classful(ip: number): [number, number] {
  const first = Math.floor(ip / 2 ** 24);
  const len = first < 128 ? 8 : first < 192 ? 16 : 24;
  return [Math.floor(ip / 2 ** (32 - len)) * 2 ** (32 - len), len];
}

interface RouteRow {
  net: number;
  prefix: number;
  code: 'C' | 'L' | 'S' | 'S*';
  tail: string; // text after the network: "is directly connected, Gi0/1" or "[1/0] via 10.0.0.2"
}

function showIpRoute(lab: Lab, dev: Device): string[] {
  const up = l3Interfaces(lab, dev).filter((i) => i.up);
  const installed = dev.routes
    .map((r) => ({ r, via: up.find((i) => parseIp(r.nextHop) !== null && networkOf(i.ip, i.mask) === networkOf(r.nextHop, i.mask)) }))
    .filter((x) => x.via);
  const def = installed.find((x) => x.r.net === '0.0.0.0' && x.r.mask === '0.0.0.0');
  const out = [
    'Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP',
    '       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area',
    '       * - candidate default',
    '',
    def ? `Gateway of last resort is ${def.r.nextHop} to network 0.0.0.0` : 'Gateway of last resort is not set',
    '',
  ];
  const rows: RouteRow[] = [];
  for (const i of up) {
    rows.push({ net: networkOf(i.ip, i.mask)!, prefix: maskToPrefix(i.mask), code: 'C', tail: `is directly connected, ${i.name}` });
    rows.push({ net: parseIp(i.ip)!, prefix: 32, code: 'L', tail: `is directly connected, ${i.name}` });
  }
  for (const { r } of installed) {
    const isDef = r.net === '0.0.0.0' && r.mask === '0.0.0.0';
    rows.push({ net: parseIp(r.net)!, prefix: maskToPrefix(r.mask), code: isDef ? 'S*' : 'S', tail: `[1/0] via ${r.nextHop}` });
  }
  // default route is printed on its own, first; everything else is grouped by classful network (as IOS does)
  for (const r of rows.filter((x) => x.code === 'S*')) out.push(`S*    ${ipToString(r.net)}/${r.prefix} ${r.tail}`);
  const groups = new Map<number, { len: number; rows: RouteRow[] }>();
  for (const r of rows.filter((x) => x.code !== 'S*')) {
    const [base, len] = classful(r.net);
    const g = groups.get(base) ?? { len, rows: [] };
    g.rows.push(r);
    groups.set(base, g);
  }
  for (const base of [...groups.keys()].sort((a, b) => a - b)) {
    const g = groups.get(base)!;
    g.rows.sort((a, b) => a.net - b.net || a.prefix - b.prefix);
    const masks = new Set(g.rows.map((x) => x.prefix));
    if (masks.size > 1) {
      out.push(`      ${ipToString(base)}/${g.len} is variably subnetted, ${g.rows.length} subnets, ${masks.size} masks`);
      for (const r of g.rows) out.push(`${r.code}        ${ipToString(r.net)}/${r.prefix} ${r.tail}`);
    } else {
      out.push(`      ${ipToString(base)}/${[...masks][0]} is subnetted, ${g.rows.length} subnets`);
      for (const r of g.rows) out.push(`${r.code}        ${ipToString(r.net)} ${r.tail}`);
    }
  }
  return out;
}

/** `show ip route` on a Catalyst without `ip routing`: the switch is a host, so IOS only shows its default gateway */
function showIpRouteHost(dev: Device): string[] {
  return [
    dev.gateway ? `Default gateway is ${dev.gateway}` : 'Default gateway is not set',
    '',
    'Host               Gateway           Last Use    Total Uses  Interface',
    'ICMP redirect cache is empty',
  ];
}

function showVersion(dev: Device): string[] {
  const rt = PROFILES[dev.kind].isRouter;
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
  const lines = ['Type escape sequence to abort.', `Sending 5, 100-byte ICMP Echos to ${ip}, timeout is 2 seconds:`];
  lines.push(r.ok ? '!!!!!' : r.kind === 'net-unreachable' ? 'U.U.U' : '.....');
  lines.push(r.ok ? 'Success rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms' : 'Success rate is 0 percent (0/5)');
  return { lines };
}

// ───────── handlers ─────────

const setMode = (mode: RunResult['mode']) => (): RunResult => ({ mode });

function exitCmd(c: Ctx): RunResult {
  switch (c.dev.cli.mode) {
    case 'config-if':
    case 'config-subif':
    case 'config-svi':
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

function interfaceRouter(c: Ctx): RunResult {
  const name = c.args[0];
  const dot = name.indexOf('.');
  if (dot < 0) return { mode: 'config-if', ctxIface: name, ctxVlan: null };
  const parent = name.slice(0, dot);
  const id = Number(name.slice(dot + 1));
  if (!c.dev.subifs.some((s) => s.parent === parent && s.id === id)) {
    c.dev.subifs.push({ parent, id, vlan: null, adminUp: true, description: '', ip: null, mask: null });
  }
  return { mode: 'config-subif', ctxIface: name, ctxVlan: null };
}

/** VLANs 1002-1005 are the built-in FDDI / Token Ring defaults on Catalyst switches — not usable for Ethernet ports */
const isReservedVlan = (id: number) => id >= 1002 && id <= 1005;
const reservedVlanError = (id: number): RunResult => ({
  error: [`% VLAN ${id} is a reserved default VLAN (1002-1005: FDDI/Token Ring) and cannot be used.`],
});

function vlanCmd(c: Ctx): RunResult {
  const id = Number(c.args[0]);
  if (isReservedVlan(id)) return reservedVlanError(id);
  if (!c.dev.vlans.some((v) => v.id === id)) {
    c.dev.vlans.push({ id, name: `VLAN${String(id).padStart(4, '0')}` });
    c.dev.vlans.sort((a, b) => a.id - b.id);
  }
  return { mode: 'config-vlan', ctxVlan: id, ctxIface: null };
}

function needIface(c: Ctx) {
  const i = physIface(c);
  return i ?? null;
}

const IF_MODES = ['config-if', 'config-subif', 'config-svi'] as const;

const specs: CommandSpec[] = [
  // ── modes ──
  cmd({
    id: 'cisco.enable', vendor: 'cisco', deviceTypes: BOTH, modes: ['user'], syntax: 'enable',
    helpEn: 'Turn on privileged commands', descTh: tx('เข้า Privileged EXEC mode (prompt เปลี่ยนจาก > เป็น #)'), topic: 'Mode',
    example: 'enable', verify: 'configure terminal', verifyTh: tx('prompt ต้องลงท้ายด้วย # และใช้ configure terminal ได้'),
    run: setMode('priv'),
  }),
  cmd({
    id: 'cisco.disable', vendor: 'cisco', deviceTypes: BOTH, modes: ['priv'], syntax: 'disable',
    helpEn: 'Turn off privileged commands', descTh: tx('กลับไป User EXEC mode'), topic: 'Mode',
    example: 'disable', verify: 'enable', verifyTh: tx('prompt ต้องกลับเป็น >'),
    run: setMode('user'),
  }),
  cmd({
    id: 'cisco.configure', vendor: 'cisco', deviceTypes: BOTH, modes: ['priv'], syntax: 'configure terminal',
    helpEn: 'Configuration from the terminal', descTh: tx('เข้า Global Configuration mode เพื่อแก้ config'), topic: 'Mode',
    example: 'configure terminal', verify: 'hostname TEST', verifyTh: tx('prompt ต้องเป็น (config)#'),
    run: () => ({ mode: 'config', lines: ['Enter configuration commands, one per line.  End with CNTL/Z.'] }),
  }),
  cmd({
    id: 'cisco.exit', vendor: 'cisco', deviceTypes: BOTH, modes: ['user', 'priv', 'config', 'config-if', 'config-subif', 'config-svi', 'config-vlan'], syntax: 'exit',
    helpEn: 'Exit from the EXEC / current configuration level', descTh: tx('ถอยออกหนึ่งระดับ (config-if → config → priv → user)'), topic: 'Mode',
    example: 'exit', verify: tx('(ดู prompt)'), verifyTh: tx('prompt ต้องย้อนกลับหนึ่งระดับ'),
    run: exitCmd,
  }),
  cmd({
    id: 'cisco.end', vendor: 'cisco', deviceTypes: BOTH, modes: ['config', 'config-if', 'config-subif', 'config-svi', 'config-vlan'], syntax: 'end',
    helpEn: 'Exit from configure mode', descTh: tx('กลับ Privileged EXEC ทันทีจากทุกระดับของ config'), topic: 'Mode',
    example: 'end', verify: 'show running-config', verifyTh: tx('prompt ต้องลงท้ายด้วย #'),
    run: () => ({ mode: 'priv', ctxIface: null, ctxVlan: null }),
  }),
  cmd({
    id: 'cisco.do', vendor: 'cisco', deviceTypes: BOTH, modes: ['config', 'config-if', 'config-subif', 'config-svi', 'config-vlan'], syntax: 'do <command>',
    helpEn: 'To run exec commands in config mode', descTh: tx('รันคำสั่ง EXEC (เช่น show) โดยไม่ต้องออกจาก config mode'), topic: 'Troubleshooting',
    example: 'do show running-config', verify: tx('(ผลลัพธ์แสดงทันที)'), verifyTh: tx('ต้องเห็นผล show โดย prompt ไม่เปลี่ยน'),
    special: 'do',
  }),

  // ── show ──
  cmd({
    id: 'cisco.show.run', vendor: 'cisco', deviceTypes: BOTH, modes: ['priv'], syntax: 'show running-config',
    helpEn: 'Current operating configuration', descTh: tx('ดู configuration ปัจจุบัน (hostname, VLAN, interface, trunk, IP, route, shutdown)'), topic: 'Config',
    example: 'show running-config', verify: 'show running-config', verifyTh: tx('หาบรรทัด interface ที่เพิ่งแก้'),
    run: (c) => ({ lines: ciscoRunningConfig(c.dev) }),
  }),
  cmd({
    id: 'cisco.show.start', vendor: 'cisco', deviceTypes: BOTH, modes: ['priv'], syntax: 'show startup-config',
    helpEn: 'Contents of startup configuration', descTh: tx('ดู config ที่บันทึกไว้ใน NVRAM (หลัง write memory)'), topic: 'Config',
    example: 'show startup-config', verify: 'show startup-config', verifyTh: tx('ถ้ายังไม่เคยบันทึกจะขึ้น startup-config is not present'),
    run: (c) => (c.dev.startupConfig ? { lines: c.dev.startupConfig.split('\n') } : { lines: ['startup-config is not present'] }),
  }),
  cmd({
    id: 'cisco.show.version', vendor: 'cisco', deviceTypes: BOTH, modes: ['user', 'priv'], syntax: 'show version',
    helpEn: 'System hardware and software status', descTh: tx('ดูรุ่นอุปกรณ์จำลองและเวอร์ชัน IOS อ้างอิง'), topic: 'Troubleshooting',
    example: 'show version', verify: 'show version', verifyTh: tx('ดูรุ่นและเวอร์ชัน'),
    run: (c) => ({ lines: showVersion(c.dev) }),
  }),
  cmd({
    id: 'cisco.show.ipbrief', vendor: 'cisco', deviceTypes: BOTH, modes: ['user', 'priv'], syntax: 'show ip interface brief',
    helpEn: 'Brief summary of IP status and configuration', descTh: tx('สรุป IP และสถานะ (Status/Protocol) ของ interface — router แสดงพอร์ตและ sub-interface, switch แสดง Vlan SVI ด้วย'), topic: 'Interface',
    example: 'show ip interface brief', verify: 'show ip interface brief', verifyTh: tx('ดู Status=up และ Protocol=up'),
    run: (c) => ({ lines: showIpIntBrief(c.lab, c.dev) }),
  }),
  cmd({
    id: 'cisco.show.iparp', vendor: 'cisco', deviceTypes: BOTH, modes: ['user', 'priv'], syntax: 'show ip arp',
    helpEn: 'IP ARP table', descTh: tx('ดูตาราง ARP (IP → MAC) ของอุปกรณ์ — แสดงเครื่องใน L2 domain เดียวกันที่ลิงก์ up (ไม่จำลองการเรียนรู้/หมดอายุ) Age "-" คือ IP ของตัวเอง'), topic: 'Layer 2',
    example: 'show ip arp', verify: 'show ip arp', verifyTh: tx('IP เดียวกันที่มี MAC ต่างกันบ่งชี้ IP ซ้ำ; ไม่เห็นเครื่องปลายทางแปลว่าไม่อยู่ L2 เดียวกัน (VLAN/trunk/สาย)'),
    run: (c) => ({ lines: showIpArp(c.lab, c.dev) }),
  }),
  cmd({
    id: 'cisco.show.mac', vendor: 'cisco', deviceTypes: SW, modes: ['user', 'priv'], syntax: 'show mac address-table',
    helpEn: 'MAC address table', descTh: tx('ดูตาราง MAC ของ switch: MAC อยู่ VLAN ไหน เรียนรู้จากพอร์ตไหน (ไม่จำลอง aging; STATIC CPU = MAC ของ SVI ตัวเอง)'), topic: 'Layer 2',
    example: 'show mac address-table', verify: 'show vlan brief', verifyTh: tx('MAC ต้องอยู่ VLAN ที่ตรงกับ access VLAN ของพอร์ตที่เสียบเครื่อง'),
    run: (c) => ({ lines: showMacTable(c.lab, c.dev) }),
  }),
  cmd({
    id: 'cisco.show.iproute', vendor: 'cisco', deviceTypes: RT, modes: ['user', 'priv'], syntax: 'show ip route',
    helpEn: 'IP routing table', descTh: tx('ดูตาราง routing: C/L (connected), S (static), S* (default route)'), topic: 'IP',
    example: 'show ip route', verify: 'show ip route', verifyTh: tx('ต้องเห็น C ของ subnet ที่ up/up และ S ของ static route ที่ next hop ถึงได้'),
    run: (c) => ({ lines: showIpRoute(c.lab, c.dev) }),
  }),
  cmd({
    id: 'cisco.show.iproute.sw', vendor: 'cisco', deviceTypes: SW, modes: ['user', 'priv'], syntax: 'show ip route',
    helpEn: 'IP routing table', descTh: tx('L2 switch ไม่ route (ไม่มี ip routing) จึงแสดงเฉพาะ default gateway ที่ตั้งด้วย ip default-gateway'), topic: 'IP',
    example: 'show ip route', verify: 'show ip route', verifyTh: tx('ต้องเห็น Default gateway is … ตรงกับ ip default-gateway'),
    run: (c) => ({ lines: showIpRouteHost(c.dev) }),
  }),
  cmd({
    id: 'cisco.show.intstatus', vendor: 'cisco', deviceTypes: SW, modes: ['user', 'priv'], syntax: 'show interfaces status',
    helpEn: 'Interface status', descTh: tx('ดูสถานะพอร์ตของ switch (connected / notconnect / disabled) และ VLAN (trunk แสดงเป็น trunk)'), topic: 'Interface',
    example: 'show interfaces status', verify: 'show interfaces status', verifyTh: tx('Status=disabled แปลว่าถูก shutdown'),
    run: (c) => ({ lines: showInterfacesStatus(c.lab, c.dev) }),
  }),
  cmd({
    id: 'cisco.show.trunk', vendor: 'cisco', deviceTypes: SW, modes: ['user', 'priv'], syntax: 'show interfaces trunk',
    helpEn: 'Interface trunk information', descTh: tx('ดูพอร์ตที่เป็น trunk, native VLAN และ VLAN ที่อนุญาต/ใช้งานอยู่'), topic: 'VLAN',
    example: 'show interfaces trunk', verify: 'show interfaces trunk', verifyTh: tx('ต้องเห็นพอร์ต trunk พร้อม allowed vlan และ native vlan'),
    run: (c) => ({ lines: showInterfacesTrunk(c.lab, c.dev) }),
  }),
  cmd({
    id: 'cisco.show.vlanbrief', vendor: 'cisco', deviceTypes: SW, modes: ['user', 'priv'], syntax: 'show vlan brief',
    helpEn: 'VLAN membership summary', descTh: tx('ดู VLAN ทั้งหมดและพอร์ต access ที่อยู่ในแต่ละ VLAN (trunk ไม่แสดงในตารางนี้)'), topic: 'VLAN',
    example: 'show vlan brief', verify: 'show vlan brief', verifyTh: tx('พอร์ตที่ตั้ง access VLAN ต้องอยู่ในแถวของ VLAN นั้น'),
    run: (c) => ({ lines: showVlanBrief(c.dev) }),
  }),
  cmd({
    id: 'cisco.ping', vendor: 'cisco', deviceTypes: BOTH, modes: ['user', 'priv'], syntax: 'ping <ip-address>',
    helpEn: 'Send echo messages', descTh: tx('ทดสอบ ping จาก router/switch (ที่มี IP หรือ SVI) ไปยัง IPv4 ปลายทาง'), topic: 'Troubleshooting',
    example: 'ping 192.168.1.101', verify: 'ping 192.168.1.101', verifyTh: tx('!!!!! = สำเร็จ, ..... = ไม่สำเร็จ'),
    run: ciscoPing,
  }),

  // ── save ──
  cmd({
    id: 'cisco.write', vendor: 'cisco', deviceTypes: BOTH, modes: ['priv'], syntax: 'write memory',
    helpEn: 'Write to NV memory', descTh: tx('บันทึก running-config ลง startup-config'), topic: 'Config',
    example: 'write memory', verify: 'show startup-config', verifyTh: tx('startup-config ต้องไม่ว่างแล้ว'),
    run: saveConfig,
  }),
  cmd({
    id: 'cisco.copy', vendor: 'cisco', deviceTypes: BOTH, modes: ['priv'], syntax: 'copy running-config startup-config',
    helpEn: 'Copy running configuration to startup configuration', descTh: tx('บันทึก running-config ลง startup-config (เทียบเท่า write memory)'), topic: 'Config',
    example: 'copy running-config startup-config', verify: 'show startup-config', verifyTh: tx('startup-config ต้องไม่ว่างแล้ว'),
    run: saveConfig,
  }),

  // ── global config ──
  cmd({
    id: 'cisco.hostname', vendor: 'cisco', deviceTypes: BOTH, modes: ['config'], syntax: 'hostname <hostname>',
    helpEn: "Set system's network name", descTh: tx('เปลี่ยนชื่ออุปกรณ์ (prompt และชื่อบน canvas เปลี่ยนตาม)'), topic: 'Config',
    example: 'hostname CORE1', verify: 'show running-config', verifyTh: tx('prompt ต้องเปลี่ยนเป็นชื่อใหม่'),
    run: (c) => {
      if (!NAME_RE.test(c.args[0])) return { error: [tx('% Invalid hostname (ใช้ A-Z, 0-9, -, _ ได้ไม่เกิน 24 ตัวอักษร)')] };
      c.dev.name = c.args[0];
      return {};
    },
  }),
  cmd({
    id: 'cisco.interface.rt', vendor: 'cisco', deviceTypes: RT, modes: ['config', 'config-if', 'config-subif'], syntax: 'interface <interface>',
    helpEn: 'Select an interface to configure', descTh: tx('เข้า Interface Configuration ของพอร์ต router หรือ sub-interface (เช่น gi0/0.10 — สร้างให้อัตโนมัติ)'), topic: 'Interface',
    example: 'interface GigabitEthernet0/1', verify: 'show ip interface brief', verifyTh: tx('prompt เป็น (config-if)# หรือ (config-subif)# สำหรับ sub-interface'),
    run: interfaceRouter,
  }),
  cmd({
    id: 'cisco.nointerface.sub', vendor: 'cisco', deviceTypes: RT, modes: ['config'], syntax: 'no interface <interface>',
    helpEn: 'Delete a sub-interface', descTh: tx('ลบ sub-interface (ลบพอร์ตจริงไม่ได้)'), topic: 'Interface',
    example: 'no interface GigabitEthernet0/0.10', verify: 'show ip interface brief', verifyTh: tx('sub-interface ต้องหายไปจากตาราง'),
    run: (c) => {
      const name = c.args[0];
      if (!name.includes('.')) return { error: [tx('% Interface cannot be deleted (ลบได้เฉพาะ sub-interface)')] };
      c.dev.subifs = c.dev.subifs.filter((s) => subName(s) !== name);
      return {};
    },
  }),
  cmd({
    id: 'cisco.interface.sw', vendor: 'cisco', deviceTypes: SW, modes: ['config', 'config-if', 'config-svi', 'config-vlan'], syntax: 'interface <interface>',
    helpEn: 'Select an interface to configure', descTh: tx('เข้า Interface Configuration mode ของพอร์ต switch (ย่อได้ เช่น fa0/1, gi0/2)'), topic: 'Interface',
    example: 'interface FastEthernet0/1', verify: 'show interfaces status', verifyTh: tx('prompt ต้องเป็น (config-if)#'),
    run: (c) => ({ mode: 'config-if', ctxIface: c.args[0], ctxVlan: null }),
  }),
  cmd({
    id: 'cisco.interface.range', vendor: 'cisco', deviceTypes: SW, modes: ['config', 'config-if', 'config-svi', 'config-vlan'], syntax: 'interface range <port-range>',
    helpEn: 'Select a range of interfaces to configure', descTh: tx('เลือกหลายพอร์ตพร้อมกัน เช่น interface range fa0/1 - 10 หรือ fa0/1 - 4 , gi0/1 — คำสั่งที่พิมพ์ต่อไปใช้กับทุกพอร์ตในช่วง'), topic: 'Interface',
    example: 'interface range FastEthernet0/1 - 4', verify: 'show running-config', verifyTh: tx('prompt ต้องเป็น (config-if-range)# และคำสั่งถัดไปมีผลกับทุกพอร์ตในช่วง'),
    run: (c) => enterInterfaceRange(c, 'cisco'),
  }),
  cmd({
    id: 'cisco.interface.vlan', vendor: 'cisco', deviceTypes: SW, modes: ['config', 'config-if', 'config-svi', 'config-vlan'], syntax: 'interface vlan <vlan-id>',
    helpEn: 'Switch Virtual Interface', descTh: tx('สร้าง/เข้า SVI (Vlan interface) เพื่อตั้ง IP จัดการของ switch (L2 switch ไม่ route ระหว่าง VLAN)'), topic: 'IP',
    example: 'interface vlan 10', verify: 'show ip interface brief', verifyTh: tx('ต้องเห็น Vlan10 ในตาราง'),
    run: (c) => {
      const id = Number(c.args[0]);
      if (!c.dev.svis.some((v) => v.vlan === id)) {
        c.dev.svis.push({ vlan: id, adminUp: true, description: '', ip: null, mask: null });
        c.dev.svis.sort((a, b) => a.vlan - b.vlan);
      }
      return { mode: 'config-svi', ctxVlan: id, ctxIface: null };
    },
  }),
  cmd({
    id: 'cisco.nointerface.vlan', vendor: 'cisco', deviceTypes: SW, modes: ['config'], syntax: 'no interface vlan <vlan-id>',
    helpEn: 'Delete a Switch Virtual Interface', descTh: tx('ลบ SVI'), topic: 'IP',
    example: 'no interface vlan 10', verify: 'show ip interface brief', verifyTh: tx('Vlan10 ต้องหายไป'),
    run: (c) => {
      const id = Number(c.args[0]);
      c.dev.svis = c.dev.svis.filter((v) => v.vlan !== id);
      return {};
    },
  }),
  cmd({
    id: 'cisco.vlan', vendor: 'cisco', deviceTypes: SW, modes: ['config', 'config-if', 'config-svi', 'config-vlan'], syntax: 'vlan <vlan-id>',
    helpEn: 'VLAN commands', descTh: tx('สร้าง VLAN (หรือเข้าแก้ VLAN เดิม) แล้วเข้า config-vlan'), topic: 'VLAN',
    example: 'vlan 30', verify: 'show vlan brief', verifyTh: tx('VLAN ใหม่ต้องปรากฏในตาราง'),
    run: vlanCmd,
  }),
  cmd({
    id: 'cisco.no.vlan', vendor: 'cisco', deviceTypes: SW, modes: ['config'], syntax: 'no vlan <vlan-id>',
    helpEn: 'VLAN commands', descTh: tx('ลบ VLAN (พอร์ตที่อยู่ใน VLAN นั้นจะหยุดส่งต่อจนกว่าจะสร้างใหม่หรือย้ายพอร์ต)'), topic: 'VLAN',
    example: 'no vlan 30', verify: 'show vlan brief', verifyTh: tx('VLAN ต้องหายไปจากตาราง'),
    run: (c) => {
      const id = Number(c.args[0]);
      if (id === 1) return { error: ['%Default VLAN 1 may not be deleted.'] };
      c.dev.vlans = c.dev.vlans.filter((v) => v.id !== id);
      return {};
    },
  }),
  cmd({
    id: 'cisco.vlan.name', vendor: 'cisco', deviceTypes: SW, modes: ['config-vlan'], syntax: 'name <name>',
    helpEn: 'Ascii name of the VLAN', descTh: tx('ตั้งชื่อ VLAN (ใช้ตัวอักษรไม่มีช่องว่าง)'), topic: 'VLAN',
    example: 'name STAFF', verify: 'show vlan brief', verifyTh: tx('ชื่อ VLAN ต้องเปลี่ยน'),
    run: (c) => {
      const v = c.dev.vlans.find((x) => x.id === c.dev.cli.ctxVlan);
      if (!v) return { error: ['% No VLAN selected'] };
      if (c.args[0].length > 32) return { error: ['% VLAN name too long (max 32)'] };
      v.name = c.args[0];
      return {};
    },
  }),
  cmd({
    id: 'cisco.ip.defgw', vendor: 'cisco', deviceTypes: SW, modes: ['config'], syntax: 'ip default-gateway <ip-address>',
    helpEn: 'Specify default gateway (if not routing IP)', descTh: tx('ตั้ง default gateway ของ L2 switch (ใช้กับ SVI สำหรับจัดการข้าม subnet)'), topic: 'IP',
    example: 'ip default-gateway 192.168.10.1', verify: 'show running-config', verifyTh: tx('ต้องเห็นบรรทัด ip default-gateway'),
    run: (c) => {
      if (parseIp(c.args[0]) === null) return { error: ['% Invalid IP address'] };
      c.dev.gateway = c.args[0];
      return {};
    },
  }),
  cmd({
    id: 'cisco.noip.defgw', vendor: 'cisco', deviceTypes: SW, modes: ['config'], syntax: 'no ip default-gateway',
    helpEn: 'Specify default gateway (if not routing IP)', descTh: tx('ลบ default gateway ของ switch'), topic: 'IP',
    example: 'no ip default-gateway', verify: 'show running-config', verifyTh: tx('บรรทัด ip default-gateway ต้องหายไป'),
    run: (c) => {
      c.dev.gateway = null;
      return {};
    },
  }),
  cmd({
    id: 'cisco.ip.route', vendor: 'cisco', deviceTypes: RT, modes: ['config'], syntax: 'ip route <network> <route-mask> <next-hop>',
    helpEn: 'Establish static routes', descTh: tx('เพิ่ม static route ไปยังเครือข่ายปลายทางผ่าน next hop (default route = 0.0.0.0 0.0.0.0 <next-hop>)'), topic: 'IP',
    example: 'ip route 172.16.0.0 255.255.255.0 10.0.0.2', verify: 'show ip route', verifyTh: tx('ต้องเห็นบรรทัด S (หรือ S* สำหรับ default) เมื่อ next hop ถึงได้'),
    run: (c) => {
      const [net, mask, nh] = c.args;
      if (networkOf(net, mask) !== parseIp(net)) return { error: ['%Inconsistent address and mask'] };
      if (parseIp(nh) === null) return { error: ['% Invalid next hop'] };
      c.dev.routes = c.dev.routes.filter((r) => !(r.net === net && r.mask === mask));
      c.dev.routes.push({ net, mask, nextHop: nh });
      return {};
    },
  }),
  cmd({
    id: 'cisco.noip.route', vendor: 'cisco', deviceTypes: RT, modes: ['config'], syntax: 'no ip route <network> <route-mask> <next-hop>',
    helpEn: 'Establish static routes', descTh: tx('ลบ static route'), topic: 'IP',
    prepare: (d) => d.routes.push({ net: '172.16.0.0', mask: '255.255.255.0', nextHop: '10.0.0.2' }),
    example: 'no ip route 172.16.0.0 255.255.255.0 10.0.0.2', verify: 'show ip route', verifyTh: tx('บรรทัด S ของ route นั้นต้องหายไป'),
    run: (c) => {
      const [net, mask, nh] = c.args;
      const before = c.dev.routes.length;
      c.dev.routes = c.dev.routes.filter((r) => !(r.net === net && r.mask === mask && r.nextHop === nh));
      if (c.dev.routes.length === before) return { error: ['%No matching route to delete'] };
      return {};
    },
  }),

  // ── interface-level (physical port, sub-interface, SVI) ──
  cmd({
    id: 'cisco.shutdown', vendor: 'cisco', deviceTypes: BOTH, modes: [...IF_MODES], syntax: 'shutdown',
    helpEn: 'Shutdown the selected interface', descTh: tx('ปิดพอร์ต/sub-interface/SVI (administratively down) — ลิงก์ที่ต่อกับพอร์ตนี้จะ down'), topic: 'Interface',
    example: 'shutdown', verify: 'show ip interface brief / show interfaces status',
    verifyTh: tx('Status ต้องเป็น administratively down (router) หรือ disabled (switch)'),
    run: (c) => {
      const t = curTarget(c);
      if (!t) return { error: ['% No interface selected'] };
      t.adminUp = false;
      return { lines: [`%LINK-5-CHANGED: Interface ${targetName(c)}, changed state to administratively down`] };
    },
  }),
  cmd({
    id: 'cisco.noshutdown', vendor: 'cisco', deviceTypes: BOTH, modes: [...IF_MODES], syntax: 'no shutdown',
    helpEn: 'Shutdown the selected interface', descTh: tx('เปิดพอร์ต (router ทุกพอร์ตเริ่มต้นเป็น shutdown ต้องสั่งก่อนใช้งาน)'), topic: 'Interface',
    example: 'no shutdown', verify: 'show ip interface brief / show interfaces status', verifyTh: tx('Status ต้องเป็น up เมื่อปลายสายอีกฝั่งเปิดอยู่ด้วย'),
    run: (c) => {
      const t = curTarget(c);
      if (!t) return { error: ['% No interface selected'] };
      t.adminUp = true;
      return { lines: [`%LINK-3-UPDOWN: Interface ${targetName(c)}, changed state to up`, ...dupLines(c, targetName(c))] };
    },
  }),
  cmd({
    id: 'cisco.description', vendor: 'cisco', deviceTypes: BOTH, modes: [...IF_MODES], syntax: 'description <text>',
    helpEn: 'Interface specific description', descTh: tx('ตั้งคำอธิบายพอร์ต (เช่น UPLINK-TO-SW2)'), topic: 'Interface',
    example: 'description UPLINK', verify: 'show running-config', verifyTh: tx('ต้องเห็นบรรทัด description ใต้ interface'),
    run: (c) => {
      const t = curTarget(c);
      if (!t) return { error: ['% No interface selected'] };
      t.description = c.args[0].slice(0, 200);
      return {};
    },
  }),
  cmd({
    id: 'cisco.switchport.mode', vendor: 'cisco', deviceTypes: SW, modes: ['config-if'], syntax: 'switchport mode access',
    helpEn: 'Set trunking mode to ACCESS unconditionally', descTh: tx('กำหนดให้พอร์ตเป็น access port (untagged VLAN เดียว)'), topic: 'VLAN',
    example: 'switchport mode access', verify: 'show running-config', verifyTh: tx('ต้องเห็น switchport mode access ใต้ interface'),
    run: (c) => {
      const i = needIface(c);
      if (!i) return { error: ['% No interface selected'] };
      i.modeAccess = true;
      i.trunk = false;
      return {};
    },
  }),
  cmd({
    id: 'cisco.switchport.trunk', vendor: 'cisco', deviceTypes: SW, modes: ['config-if'], syntax: 'switchport mode trunk',
    helpEn: 'Set trunking mode to TRUNK unconditionally', descTh: tx('กำหนดให้พอร์ตเป็น 802.1Q trunk (ส่งหลาย VLAN แบบ tagged; native VLAN แบบ untagged)'), topic: 'VLAN',
    example: 'switchport mode trunk', verify: 'show interfaces trunk', verifyTh: tx('พอร์ตต้องอยู่ในตาราง trunk สถานะ trunking เมื่อลิงก์ up'),
    run: (c) => {
      const i = needIface(c);
      if (!i) return { error: ['% No interface selected'] };
      i.trunk = true;
      i.modeAccess = false;
      return {};
    },
  }),
  cmd({
    id: 'cisco.switchport.vlan', vendor: 'cisco', deviceTypes: SW, modes: ['config-if'], syntax: 'switchport access vlan <vlan-id>',
    helpEn: 'Set VLAN when interface is in access mode', descTh: tx('กำหนด access VLAN ให้พอร์ต — เฟรมของพอร์ตนี้จะอยู่ใน VLAN นี้'), topic: 'VLAN',
    example: 'switchport access vlan 10', verify: 'show vlan brief', verifyTh: tx('พอร์ตต้องไปอยู่ในแถว VLAN ที่ตั้ง'),
    run: (c) => {
      const i = needIface(c);
      if (!i) return { error: ['% No interface selected'] };
      const id = Number(c.args[0]);
      if (isReservedVlan(id)) return reservedVlanError(id);
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
    id: 'cisco.trunk.allowed', vendor: 'cisco', deviceTypes: SW, modes: ['config-if'], syntax: 'switchport trunk allowed vlan <vlan-list>',
    helpEn: 'VLANs allowed on the trunk', descTh: tx('กำหนดรายการ VLAN ที่ trunk อนุญาต (แทนที่ทั้งรายการ) เช่น 10,20,30-40'), topic: 'VLAN',
    example: 'switchport trunk allowed vlan 10,20', verify: 'show interfaces trunk', verifyTh: tx('ดูคอลัมน์ Vlans allowed on trunk'),
    run: (c) => {
      const i = needIface(c);
      if (!i) return { error: ['% No interface selected'] };
      i.trunkAllowed = parseVlanList(c.args[0]);
      return {};
    },
  }),
  cmd({
    id: 'cisco.trunk.allowed.all', vendor: 'cisco', deviceTypes: SW, modes: ['config-if'], syntax: 'switchport trunk allowed vlan all',
    helpEn: 'All VLANs', descTh: tx('อนุญาตทุก VLAN บน trunk (ค่าเริ่มต้น)'), topic: 'VLAN',
    example: 'switchport trunk allowed vlan all', verify: 'show interfaces trunk', verifyTh: tx('allowed ต้องเป็น 1-4094'),
    run: (c) => {
      const i = needIface(c);
      if (!i) return { error: ['% No interface selected'] };
      i.trunkAllowed = null;
      return {};
    },
  }),
  cmd({
    id: 'cisco.trunk.allowed.add', vendor: 'cisco', deviceTypes: SW, modes: ['config-if'], syntax: 'switchport trunk allowed vlan add <vlan-list>',
    helpEn: 'Add VLANs to the current list', descTh: tx('เพิ่ม VLAN เข้ารายการที่อนุญาต (ไม่ลบของเดิม)'), topic: 'VLAN',
    example: 'switchport trunk allowed vlan add 30', verify: 'show interfaces trunk', verifyTh: tx('VLAN ที่เพิ่มต้องอยู่ในรายการ allowed'),
    run: (c) => {
      const i = needIface(c);
      if (!i) return { error: ['% No interface selected'] };
      if (i.trunkAllowed !== null) {
        i.trunkAllowed = [...new Set([...i.trunkAllowed, ...parseVlanList(c.args[0])!])].sort((a, b) => a - b);
      }
      return {};
    },
  }),
  cmd({
    id: 'cisco.trunk.allowed.remove', vendor: 'cisco', deviceTypes: SW, modes: ['config-if'], syntax: 'switchport trunk allowed vlan remove <vlan-list>',
    helpEn: 'Remove VLANs from the current list', descTh: tx('ถอด VLAN ออกจากรายการที่อนุญาต'), topic: 'VLAN',
    example: 'switchport trunk allowed vlan remove 20', verify: 'show interfaces trunk', verifyTh: tx('VLAN ที่ถอดต้องหายจากรายการ allowed'),
    run: (c) => {
      const i = needIface(c);
      if (!i) return { error: ['% No interface selected'] };
      const drop = new Set(parseVlanList(c.args[0])!);
      const base = i.trunkAllowed ?? Array.from({ length: 4094 }, (_, k) => k + 1);
      i.trunkAllowed = base.filter((v) => !drop.has(v));
      return {};
    },
  }),
  cmd({
    id: 'cisco.trunk.native', vendor: 'cisco', deviceTypes: SW, modes: ['config-if'], syntax: 'switchport trunk native vlan <vlan-id>',
    helpEn: 'Set native VLAN when interface is in trunking mode', descTh: tx('กำหนด native VLAN (เฟรม untagged ของ trunk) — ต้องตรงกันทั้งสองฝั่ง'), topic: 'VLAN',
    example: 'switchport trunk native vlan 99', verify: 'show interfaces trunk', verifyTh: tx('คอลัมน์ Native vlan ต้องเปลี่ยน'),
    run: (c) => {
      const i = needIface(c);
      if (!i) return { error: ['% No interface selected'] };
      i.nativeVlan = Number(c.args[0]);
      return {};
    },
  }),
  cmd({
    id: 'cisco.no.trunk.allowed', vendor: 'cisco', deviceTypes: SW, modes: ['config-if'], syntax: 'no switchport trunk allowed vlan',
    helpEn: 'Reset allowed VLANs to default', descTh: tx('คืนค่า allowed vlan เป็นทุก VLAN'), topic: 'VLAN',
    example: 'no switchport trunk allowed vlan', verify: 'show interfaces trunk', verifyTh: tx('allowed ต้องกลับเป็น 1-4094'),
    run: (c) => {
      const i = needIface(c);
      if (!i) return { error: ['% No interface selected'] };
      i.trunkAllowed = null;
      return {};
    },
  }),
  cmd({
    id: 'cisco.no.trunk.native', vendor: 'cisco', deviceTypes: SW, modes: ['config-if'], syntax: 'no switchport trunk native vlan',
    helpEn: 'Reset native VLAN to default (1)', descTh: tx('คืนค่า native VLAN เป็น 1'), topic: 'VLAN',
    example: 'no switchport trunk native vlan', verify: 'show interfaces trunk', verifyTh: tx('Native vlan ต้องกลับเป็น 1'),
    run: (c) => {
      const i = needIface(c);
      if (!i) return { error: ['% No interface selected'] };
      i.nativeVlan = 1;
      return {};
    },
  }),
  cmd({
    id: 'cisco.encapsulation', vendor: 'cisco', deviceTypes: RT, modes: ['config-subif'], syntax: 'encapsulation dot1Q <vlan-id>',
    helpEn: 'IEEE 802.1Q Virtual LAN', descTh: tx('กำหนดให้ sub-interface รับ-ส่งเฟรม tagged VLAN นี้ (router-on-a-stick) — ต้องทำก่อนตั้ง IP'), topic: 'VLAN',
    example: 'encapsulation dot1Q 10', verify: 'show ip interface brief', verifyTh: tx('sub-interface ต้อง up/up เมื่อพอร์ตแม่ up และต่อกับ trunk'),
    run: (c) => {
      const s = c.dev.subifs.find((x) => subName(x) === c.dev.cli.ctxIface);
      if (!s) return { error: ['% No interface selected'] };
      s.vlan = Number(c.args[0]);
      return {};
    },
  }),
  cmd({
    id: 'cisco.ipaddress', vendor: 'cisco', deviceTypes: RT, modes: ['config-if', 'config-subif'], syntax: 'ip address <ip-address> <subnet-mask>',
    helpEn: 'Set the IP address of an interface', descTh: tx('ตั้ง IPv4 และ subnet mask ให้ routed interface หรือ sub-interface'), topic: 'IP',
    example: { 'cisco-router': 'ip address 10.0.0.1 255.255.255.0' }, verify: 'show ip interface brief', verifyTh: tx('ต้องเห็น IP ใหม่ในคอลัมน์ IP-Address'),
    run: (c) => {
      const t = curTarget(c);
      if (!t) return { error: ['% No interface selected'] };
      const [ip, mask] = c.args;
      if (c.dev.cli.mode === 'config-subif') {
        const s = c.dev.subifs.find((x) => subName(x) === c.dev.cli.ctxIface);
        if (!s || s.vlan === null) {
          return { error: ['% Configuring IP routing on a LAN subinterface is only allowed if that', '  subinterface is already configured as an IEEE 802.1Q or ISL vLAN subinterface.'] };
        }
      }
      if (!isHostAddress(ip, mask)) return { error: [tx('Bad mask / invalid address (ไม่ใช่ host address ที่ใช้ได้ใน subnet นี้)')] };
      const clash = overlapWith(c, t, ip, mask, subnetsOverlap);
      if (clash) return { error: [`% ${ipToString(networkOf(ip, mask)!)} overlaps with ${clash}`] };
      t.ip = ip;
      t.mask = mask;
      return { lines: dupLines(c, targetName(c)) };
    },
  }),
  cmd({
    id: 'cisco.ipaddress.svi', vendor: 'cisco', deviceTypes: SW, modes: ['config-svi'], syntax: 'ip address <ip-address> <subnet-mask>',
    helpEn: 'Set the IP address of an interface', descTh: tx('ตั้ง IP จัดการให้ SVI (L2 switch ใช้เป็น management address ไม่ใช่ gateway ของ VLAN)'), topic: 'IP',
    example: { 'cisco-switch': 'ip address 192.168.10.2 255.255.255.0' }, verify: 'show ip interface brief', verifyTh: tx('ต้องเห็น IP ที่แถว VlanN'),
    run: (c) => {
      const t = curTarget(c);
      if (!t) return { error: ['% No interface selected'] };
      const [ip, mask] = c.args;
      if (!isHostAddress(ip, mask)) return { error: [tx('Bad mask / invalid address (ไม่ใช่ host address ที่ใช้ได้ใน subnet นี้)')] };
      const clash = overlapWith(c, t, ip, mask, subnetsOverlap);
      if (clash) return { error: [`% ${ipToString(networkOf(ip, mask)!)} overlaps with ${clash}`] };
      t.ip = ip;
      t.mask = mask;
      return { lines: dupLines(c, targetName(c)) };
    },
  }),
  cmd({
    id: 'cisco.noipaddress', vendor: 'cisco', deviceTypes: RT, modes: ['config-if', 'config-subif'], syntax: 'no ip address',
    helpEn: 'Remove the IP address of an interface', descTh: tx('ลบ IP ออกจาก interface หรือ sub-interface'), topic: 'IP',
    example: 'no ip address', verify: 'show ip interface brief', verifyTh: tx('IP-Address ต้องเป็น unassigned'),
    run: (c) => {
      const t = curTarget(c);
      if (!t) return { error: ['% No interface selected'] };
      t.ip = null;
      t.mask = null;
      return {};
    },
  }),
  cmd({
    id: 'cisco.noipaddress.svi', vendor: 'cisco', deviceTypes: SW, modes: ['config-svi'], syntax: 'no ip address',
    helpEn: 'Remove the IP address of an interface', descTh: tx('ลบ IP ออกจาก SVI'), topic: 'IP',
    example: 'no ip address', verify: 'show ip interface brief', verifyTh: tx('IP-Address ต้องเป็น unassigned'),
    run: (c) => {
      const t = curTarget(c);
      if (!t) return { error: ['% No interface selected'] };
      t.ip = null;
      t.mask = null;
      return {};
    },
  }),
];

export const CISCO_SPECS = specs;
