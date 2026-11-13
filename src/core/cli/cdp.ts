/**
 * Read-only CDP-shaped topology view, not a protocol/advertisement simulation.
 * IOS syntax/field reference:
 * https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/cdp/command/cdp-cr-book/cdp-cr-a1.html
 * Only the model's Cisco IOS router/switch kinds participate. No timers, caches,
 * advertised capability flags, duplex, or management addresses are invented.
 */
import { getDevice, getIface } from '../lab';
import { l3Interfaces, linkStatus } from '../network';
import { PROFILES } from '../profiles';
import type { Device, DeviceKind, Lab } from '../types';

const IOS_KINDS: DeviceKind[] = ['cisco-router', 'isp-router', 'cisco-switch'];
const NOTE = 'Simulator topology view: no CDP advertisements or timers; Holdtme is not simulated.';
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const portKey = (name: string) => name.replace(/\d+/g, (n) => n.padStart(8, '0'));
const cdpPort = (name: string) => name.replace(/^GigabitEthernet/, 'Gig ').replace(/^FastEthernet/, 'Fas ');

interface Neighbor {
  peer: Device;
  localPort: string;
  remotePort: string;
}

function neighbors(lab: Lab, dev: Device): Neighbor[] {
  if (!IOS_KINDS.includes(dev.kind)) return [];
  const rows: Neighbor[] = [];
  for (const link of lab.links) {
    const local = link.a.deviceId === dev.id ? link.a : link.b.deviceId === dev.id ? link.b : undefined;
    if (!local) continue;
    const remote = local === link.a ? link.b : link.a;
    const peer = getDevice(lab, remote.deviceId);
    if (!peer || peer.id === dev.id || !IOS_KINDS.includes(peer.kind)) continue;
    if (!getIface(dev, local.port) || !getIface(peer, remote.port) || !linkStatus(lab, link).up) continue;
    rows.push({ peer, localPort: local.port, remotePort: remote.port });
  }
  return rows.sort((a, b) => compare(portKey(a.localPort), portKey(b.localPort))
    || compare(a.peer.name, b.peer.name) || compare(portKey(a.remotePort), portKey(b.remotePort))
    || compare(a.peer.id, b.peer.id));
}

/** Deterministic simulator selection, not a claim about an advertised management IP. */
function entryAddress(lab: Lab, { peer, remotePort }: Neighbor): string | undefined {
  const up = l3Interfaces(lab, peer).filter((i) => i.up);
  if (PROFILES[peer.kind].isSwitch) {
    return up.filter((i) => i.kind === 'svi').sort((a, b) => compare(portKey(a.name), portKey(b.name)))[0]?.ip;
  }
  const onPort = up.filter((i) => i.port === remotePort);
  return onPort.find((i) => i.kind === 'port')?.ip
    ?? onPort.filter((i) => i.kind === 'sub').sort((a, b) => (a.tag ?? 0) - (b.tag ?? 0) || compare(portKey(a.name), portKey(b.name)))[0]?.ip;
}

export function showCdpNeighbors(lab: Lab, dev: Device, version?: (peer: Device) => string): string[] {
  const entries = neighbors(lab, dev);
  const total = `Total cdp entries displayed : ${entries.length}`;
  if (version) {
    const lines = [NOTE];
    for (const entry of entries) {
      const { peer, localPort, remotePort } = entry;
      const profile = PROFILES[peer.kind];
      const ip = entryAddress(lab, entry);
      lines.push('-------------------------', `Device ID: ${peer.name}`, 'Entry address(es):');
      if (ip) lines.push(`  IP address: ${ip}`);
      lines.push(`Platform: ${profile.model},  Capabilities: ${profile.isRouter ? 'Router' : 'Switch'}`,
        `Interface: ${localPort},  Port ID (outgoing port): ${remotePort}`,
        'Holdtime : not simulated', '', 'Version :', version(peer), '');
    }
    return [...lines, total];
  }
  const headers = ['Device ID', 'Local Intrfce', 'Holdtme', 'Capability', 'Platform', 'Port ID'];
  const rows = entries.map(({ peer, localPort, remotePort }) => [peer.name, cdpPort(localPort), '-',
    PROFILES[peer.kind].isRouter ? 'R' : 'S', PROFILES[peer.kind].model, cdpPort(remotePort)]);
  const widths = headers.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i].length)));
  const format = (row: string[]) => row.map((cell, i) => i === row.length - 1 ? cell : cell.padEnd(widths[i])).join('  ');
  return [NOTE, 'Capability Codes: R - Router, S - Switch', '', format(headers), ...rows.map(format), '', total];
}
