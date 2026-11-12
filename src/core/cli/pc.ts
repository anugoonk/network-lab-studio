/** PC terminal profile (Windows-style `ipconfig` and `ping <IPv4>`). Runs only against the simulated lab. */
import { arpTable, duplicateIps, fmtMacDash, macOf } from '../l2tables';
import { TRACE_DEFAULT_MAX_TTL, ping, portLine, trace } from '../network';
import { parseIp } from '../ip';
import { cmd, type CommandSpec, type Ctx, type RunResult } from './spec';
import { tx } from '../../i18n';

const PC = ['pc', 'laptop', 'server', 'printer', 'ip-camera', 'ip-phone', 'nvr', 'nas'] as const;

function ipconfig(c: Ctx): RunResult {
  const nic = c.dev.ifaces[0];
  const line = portLine(c.lab, c.dev, nic);
  const out = ['', 'Windows IP Configuration', '', `Ethernet adapter ${nic.name}:`, ''];
  if (line !== 'up') {
    out.push('   Media State . . . . . . . . . . . : Media disconnected');
    out.push('   Connection-specific DNS Suffix  . :');
    return { lines: out };
  }
  out.push('   Connection-specific DNS Suffix  . :');
  const dup = nic.ip !== null && duplicateIps(c.lab).some((d) => d.ip === nic.ip && d.members.some((m) => m.deviceId === c.dev.id));
  out.push(`   IPv4 Address. . . . . . . . . . . : ${nic.ip ?? '0.0.0.0'}${dup ? '(Duplicate)' : ''}`);
  out.push(`   Subnet Mask . . . . . . . . . . . : ${nic.mask ?? '0.0.0.0'}`);
  out.push(`   Default Gateway . . . . . . . . . : ${c.dev.gateway ?? ''}`);
  return { lines: out };
}

/**
 * Windows `ipconfig /all`, limited to what the simulator models: host name, adapter, MAC, static addressing.
 * DNS / WINS / NetBIOS / lease lines are omitted (not modelled); DHCP is always "No" (addresses are static here).
 */
function ipconfigAll(c: Ctx): RunResult {
  const nic = c.dev.ifaces[0];
  const line = portLine(c.lab, c.dev, nic);
  const mac = fmtMacDash(macOf(c.dev.id, nic.name)).toUpperCase();
  const out = ['', 'Windows IP Configuration', '', `   Host Name . . . . . . . . . . . . : ${c.dev.name}`, '', `Ethernet adapter ${nic.name}:`, ''];
  if (line !== 'up') {
    out.push('   Media State . . . . . . . . . . . : Media disconnected');
    out.push('   Connection-specific DNS Suffix  . :');
    out.push(`   Physical Address. . . . . . . . . : ${mac}`);
    out.push('   DHCP Enabled. . . . . . . . . . . : No');
    return { lines: out };
  }
  const dup = nic.ip !== null && duplicateIps(c.lab).some((d) => d.ip === nic.ip && d.members.some((m) => m.deviceId === c.dev.id));
  out.push('   Connection-specific DNS Suffix  . :');
  out.push(`   Physical Address. . . . . . . . . : ${mac}`);
  out.push('   DHCP Enabled. . . . . . . . . . . : No');
  out.push(`   IPv4 Address. . . . . . . . . . . : ${nic.ip ?? '0.0.0.0'}${nic.ip ? (dup ? '(Duplicate)' : '(Preferred)') : ''}`);
  out.push(`   Subnet Mask . . . . . . . . . . . : ${nic.mask ?? '0.0.0.0'}`);
  out.push(`   Default Gateway . . . . . . . . . : ${c.dev.gateway ?? ''}`);
  return { lines: out };
}

function pingCmd(c: Ctx): RunResult {
  const dst = c.args[0];
  if (parseIp(dst) === null) {
    return { lines: [`Ping request could not find host ${dst}. Please check the name and try again.`] };
  }
  const r = ping(c.lab, c.dev.id, dst);
  const lines = ['', `Pinging ${dst} with 32 bytes of data:`];
  const from = r.srcIp ?? c.dev.ifaces[0].ip ?? '0.0.0.0';
  for (let k = 0; k < 4; k++) {
    if (r.ok) lines.push(`Reply from ${dst}: bytes=32 time<1ms TTL=${r.replyTtl}`);
    else if (r.kind === 'general-failure') lines.push('PING: transmit failed. General failure.');
    else if (r.kind === 'host-unreachable') lines.push(`Reply from ${from}: Destination host unreachable.`);
    else if (r.kind === 'net-unreachable') lines.push(`Reply from ${r.icmpFrom}: Destination net unreachable.`);
    else lines.push('Request timed out.');
  }
  // Windows counts ICMP unreachable replies as "Received"
  const recv = r.ok || r.kind === 'host-unreachable' || r.kind === 'net-unreachable' ? 4 : 0;
  lines.push('', `Ping statistics for ${dst}:`);
  lines.push(
    `    Packets: Sent = 4, Received = ${recv}, Lost = ${4 - recv} (${((4 - recv) / 4) * 100}% loss),`,
  );
  if (r.ok) lines.push('Approximate round trip times in milli-seconds:', '    Minimum = 0ms, Maximum = 1ms, Average = 0ms');
  return { lines };
}

/**
 * Windows `tracert [-h max] <IPv4>`. No latency model → the three time columns are not printed.
 * Local failures: no link / no usable gateway → "General failure."; first next hop does not answer ARP →
 * "<own IP> reports: Destination host unreachable." (both lines are approximations, not verified against Windows).
 */
function tracertCmd(c: Ctx): RunResult {
  const hasMax = c.args.length === 2;
  const dst = hasMax ? c.args[1] : c.args[0];
  let max = TRACE_DEFAULT_MAX_TTL;
  if (hasMax) {
    if (!/^\d{1,3}$/.test(c.args[0]) || Number(c.args[0]) < 1 || Number(c.args[0]) > 255) return { lines: ['Bad value for option -h, valid range is from 1 to 255.'] };
    max = Number(c.args[0]);
  }
  if (parseIp(dst) === null) return { lines: [`Unable to resolve target system name ${dst}.`] };
  const r = trace(c.lab, c.dev.id, dst, max);
  const lines = ['', `Tracing route to ${dst} over a maximum of ${max} hops`, ''];
  const n = (t: number) => String(t).padStart(3);
  if (r.local === 'general-failure') lines.push(`${n(1)}  General failure.`);
  else if (r.local === 'host-unreachable') lines.push(`${n(1)}  ${r.srcIp ?? c.dev.ifaces[0].ip ?? '0.0.0.0'}  reports: Destination host unreachable.`);
  else {
    for (const h of r.hops) {
      if (h.reply === 'none') lines.push(`${n(h.ttl)}     *        *        *     Request timed out.`);
      else if (h.reply === 'net-unreachable') lines.push(`${n(h.ttl)}  ${h.ip}  reports: Destination net unreachable.`);
      else lines.push(`${n(h.ttl)}  ${h.ip}`);
    }
  }
  lines.push('', 'Trace complete.');
  return { lines };
}

function arpCmd(c: Ctx): RunResult {
  const nic = c.dev.ifaces[0];
  const rows = arpTable(c.lab, c.dev).filter((e) => !e.own);
  if (!rows.length) return { lines: ['No ARP Entries Found.'] };
  const out = ['', `Interface: ${nic.ip ?? '0.0.0.0'} --- 0x4`, '  Internet Address      Physical Address      Type'];
  for (const e of rows.sort((a, b) => a.ip.localeCompare(b.ip, undefined, { numeric: true }))) {
    out.push(`  ${e.ip.padEnd(22)}${fmtMacDash(e.mac).padEnd(22)}dynamic`);
  }
  return { lines: out };
}

const specs: CommandSpec[] = [
  cmd({
    id: 'pc.ipconfig', vendor: 'pc', deviceTypes: [...PC], modes: ['pc'], syntax: 'ipconfig',
    helpEn: 'Display IP configuration', descTh: tx('แสดง IPv4, subnet mask และ default gateway ของ PC'), topic: 'IP',
    example: 'ipconfig', verify: 'ipconfig', verifyTh: tx('ค่าต้องตรงกับหน้า IP Configuration'),
    run: ipconfig,
  }),
  cmd({
    id: 'pc.ipconfig.all', vendor: 'pc', deviceTypes: [...PC], modes: ['pc'], syntax: 'ipconfig /all',
    helpEn: 'Display full IP configuration', descTh: tx('แสดงรายละเอียดเพิ่ม: ชื่อเครื่อง, MAC (Physical Address), DHCP และ IP — ไม่แสดง DNS/WINS เพราะ simulator ไม่จำลอง'), topic: 'IP',
    example: 'ipconfig /all', verify: 'arp -a', verifyTh: tx('Physical Address ต้องตรงกับ MAC ที่เครื่องอื่นเห็นใน arp -a'),
    run: ipconfigAll,
  }),
  cmd({
    id: 'pc.ping', vendor: 'pc', deviceTypes: [...PC], modes: ['pc'], syntax: 'ping <ipv4>',
    helpEn: 'Send ICMP echo requests', descTh: tx('ทดสอบ reachability ไปยัง IPv4 ปลายทาง (ผลเปลี่ยนตามสาย พอร์ต VLAN และ gateway ปัจจุบัน)'), topic: 'Troubleshooting',
    example: 'ping 192.168.1.110', verify: 'ping 192.168.1.1', verifyTh: tx('Reply = สำเร็จ, Request timed out = ไม่ถึง'),
    run: pingCmd,
  }),
  cmd({
    id: 'pc.tracert', vendor: 'pc', deviceTypes: [...PC], modes: ['pc'], syntax: 'tracert <ipv4>',
    helpEn: 'Trace the route to a destination', descTh: tx('ไล่ดูเส้นทาง L3 ทีละ hop จาก PC ถึงปลายทาง (gateway และ router ที่ route จริง) — ไม่แสดงเวลา เพราะ simulator ไม่จำลอง latency'), topic: 'Troubleshooting',
    example: 'tracert 192.168.1.110', verify: 'tracert 192.168.1.1', verifyTh: tx('hop แรกต้องเป็น default gateway เมื่อปลายทางอยู่นอก subnet; ปลายทางใน subnet เดียวกันมี 1 hop'),
    run: tracertCmd,
  }),
  cmd({
    id: 'pc.tracert.h', vendor: 'pc', deviceTypes: [...PC], modes: ['pc'], syntax: 'tracert -h <max-hops> <ipv4>',
    helpEn: 'Trace the route with a maximum number of hops', descTh: tx('เหมือน tracert แต่กำหนดจำนวน hop สูงสุด (1-255)'), topic: 'Troubleshooting',
    example: 'tracert -h 5 192.168.1.110', verify: 'tracert -h 5 192.168.1.1', verifyTh: tx('ต้องหยุดไม่เกินจำนวน hop ที่กำหนด'),
    run: tracertCmd,
  }),
  cmd({
    id: 'pc.arp', vendor: 'pc', deviceTypes: [...PC], modes: ['pc'], syntax: 'arp -a',
    helpEn: 'Display ARP cache', descTh: tx('ดูตาราง ARP ของ PC (IP → MAC ของเครื่องใน L2 เดียวกัน ไม่จำลองการเรียนรู้/หมดอายุ)'), topic: 'Layer 2',
    example: 'arp -a', verify: 'ping 192.168.1.1', verifyTh: tx('ไม่เห็น gateway ในตาราง แปลว่า PC ไม่อยู่ L2 เดียวกับ gateway'),
    run: arpCmd,
  }),
  cmd({
    id: 'pc.cls', vendor: 'pc', deviceTypes: [...PC], modes: ['pc'], syntax: 'cls',
    helpEn: 'Clear the screen', descTh: tx('ล้างหน้าจอ Terminal'), topic: 'Troubleshooting',
    example: 'cls', verify: tx('(หน้าจอว่าง)'), verifyTh: tx('Terminal ต้องถูกล้าง'),
    run: () => ({ clear: true }),
  }),
  cmd({
    id: 'pc.help', vendor: 'pc', deviceTypes: [...PC], modes: ['pc'], syntax: 'help',
    helpEn: 'List available commands', descTh: tx('แสดงคำสั่งที่ PC รองรับ'), topic: 'Troubleshooting',
    example: 'help', verify: tx('(รายการคำสั่ง)'), verifyTh: tx('ต้องเห็น ipconfig, ping, cls, help'),
    run: () => ({ lines: ['Supported commands:', '  ipconfig        Show IP configuration (ipconfig /all: details)', '  ping <IPv4>     Test reachability', '  tracert <IPv4>  Trace the route (tracert -h <n> <IPv4>: max hops)', '  cls             Clear the screen', '  help            Show this list'] }),
  }),
];

export const PC_SPECS = specs;
