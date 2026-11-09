/** PC terminal profile (Windows-style `ipconfig` and `ping <IPv4>`). Runs only against the simulated lab. */
import { arpTable, duplicateIps, fmtMacDash } from '../l2tables';
import { ping, portLine } from '../network';
import { parseIp } from '../ip';
import { cmd, type CommandSpec, type Ctx, type RunResult } from './spec';

const PC = ['pc', 'laptop', 'server'] as const;

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

function pingCmd(c: Ctx): RunResult {
  const dst = c.args[0];
  if (parseIp(dst) === null) {
    return { lines: [`Ping request could not find host ${dst}. Please check the name and try again.`] };
  }
  const r = ping(c.lab, c.dev.id, dst);
  const lines = ['', `Pinging ${dst} with 32 bytes of data:`];
  const from = r.srcIp ?? c.dev.ifaces[0].ip ?? '0.0.0.0';
  for (let k = 0; k < 4; k++) {
    if (r.ok) lines.push(`Reply from ${dst}: bytes=32 time<1ms TTL=${r.forwardPath.length > 3 ? 126 : 128}`);
    else if (r.kind === 'general-failure') lines.push('PING: transmit failed. General failure.');
    else if (r.kind === 'host-unreachable') lines.push(`Reply from ${from}: Destination host unreachable.`);
    else lines.push('Request timed out.');
  }
  const recv = r.ok ? 4 : r.kind === 'host-unreachable' ? 4 : 0;
  lines.push('', `Ping statistics for ${dst}:`);
  lines.push(
    `    Packets: Sent = 4, Received = ${recv}, Lost = ${4 - recv} (${((4 - recv) / 4) * 100}% loss),`,
  );
  if (r.ok) lines.push('Approximate round trip times in milli-seconds:', '    Minimum = 0ms, Maximum = 1ms, Average = 0ms');
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
    helpEn: 'Display IP configuration', descTh: 'แสดง IPv4, subnet mask และ default gateway ของ PC', topic: 'IP',
    example: 'ipconfig', verify: 'ipconfig', verifyTh: 'ค่าต้องตรงกับหน้า IP Configuration',
    run: ipconfig,
  }),
  cmd({
    id: 'pc.ping', vendor: 'pc', deviceTypes: [...PC], modes: ['pc'], syntax: 'ping <ipv4>',
    helpEn: 'Send ICMP echo requests', descTh: 'ทดสอบ reachability ไปยัง IPv4 ปลายทาง (ผลเปลี่ยนตามสาย พอร์ต VLAN และ gateway ปัจจุบัน)', topic: 'Troubleshooting',
    example: 'ping 192.168.1.110', verify: 'ping 192.168.1.1', verifyTh: 'Reply = สำเร็จ, Request timed out = ไม่ถึง',
    run: pingCmd,
  }),
  cmd({
    id: 'pc.arp', vendor: 'pc', deviceTypes: [...PC], modes: ['pc'], syntax: 'arp -a',
    helpEn: 'Display ARP cache', descTh: 'ดูตาราง ARP ของ PC (IP → MAC ของเครื่องใน L2 เดียวกัน ไม่จำลองการเรียนรู้/หมดอายุ)', topic: 'Layer 2',
    example: 'arp -a', verify: 'ping 192.168.1.1', verifyTh: 'ไม่เห็น gateway ในตาราง แปลว่า PC ไม่อยู่ L2 เดียวกับ gateway',
    run: arpCmd,
  }),
  cmd({
    id: 'pc.cls', vendor: 'pc', deviceTypes: [...PC], modes: ['pc'], syntax: 'cls',
    helpEn: 'Clear the screen', descTh: 'ล้างหน้าจอ Terminal', topic: 'Troubleshooting',
    example: 'cls', verify: '(หน้าจอว่าง)', verifyTh: 'Terminal ต้องถูกล้าง',
    run: () => ({ clear: true }),
  }),
  cmd({
    id: 'pc.help', vendor: 'pc', deviceTypes: [...PC], modes: ['pc'], syntax: 'help',
    helpEn: 'List available commands', descTh: 'แสดงคำสั่งที่ PC รองรับ', topic: 'Troubleshooting',
    example: 'help', verify: '(รายการคำสั่ง)', verifyTh: 'ต้องเห็น ipconfig, ping, cls, help',
    run: () => ({ lines: ['Supported commands:', '  ipconfig        Show IP configuration', '  ping <IPv4>     Test reachability', '  cls             Clear the screen', '  help            Show this list'] }),
  }),
];

export const PC_SPECS = specs;
