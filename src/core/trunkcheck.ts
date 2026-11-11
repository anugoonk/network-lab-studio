/**
 * Native VLAN mismatch between the two ends of an 802.1Q trunk (R-03). Read-only: derived from the current Lab on every
 * call, so a warning appears and disappears with the configuration. It never changes forwarding — untagged frames still
 * cross between the two native VLANs exactly as network.ts models them (that leak is the reason the warning matters).
 *
 * Which device reports it:
 *  - Cisco IOS switches learn the neighbour's native VLAN through CDP and log
 *    `%CDP-4-NATIVE_VLAN_MISMATCH: Native VLAN mismatch discovered on <port> (<vlan>), with <neighbour> <port> (<vlan>).`
 *    CDP only reports; it does not block or fix anything. Here only Cisco ↔ Cisco switch links are CDP links.
 *  - No AOS-CX log message for this could be confirmed, so Aruba devices print nothing; the Lab Inspector still lists
 *    every mismatch (Cisco, Aruba or mixed) as a simulator diagnostic.
 */
import { getDevice } from './lab';
import { linkStatus } from './network';
import { PROFILES } from './profiles';
import type { Device, Iface, Lab } from './types';

export interface TrunkEnd {
  deviceId: string;
  deviceName: string;
  port: string;
  nativeVlan: number;
}

export interface NativeVlanMismatch {
  linkId: string;
  a: TrunkEnd;
  b: TrunkEnd;
  /** both ends are Cisco IOS switches, which exchange CDP and log %CDP-4-NATIVE_VLAN_MISMATCH */
  cdp: boolean;
}

/** an L2 switch port currently operating as an 802.1Q trunk (an AOS-CX routed port is not an L2 port) */
function activeTrunk(dev: Device, i: Iface | undefined): i is Iface {
  if (!i || !PROFILES[dev.kind].isSwitch || !i.trunk) return false;
  return !(PROFILES[dev.kind].vendor === 'aruba' && i.routed);
}

const isCiscoSwitch = (d: Device) => PROFILES[d.kind].vendor === 'cisco' && PROFILES[d.kind].isSwitch;

/** One entry per link whose two ends are up trunks with different native VLANs. */
export function nativeVlanMismatches(lab: Lab): NativeVlanMismatch[] {
  const out: NativeVlanMismatch[] = [];
  for (const l of lab.links) {
    const da = getDevice(lab, l.a.deviceId);
    const db = getDevice(lab, l.b.deviceId);
    if (!da || !db) continue;
    const ia = da.ifaces.find((i) => i.name === l.a.port);
    const ib = db.ifaces.find((i) => i.name === l.b.port);
    if (!activeTrunk(da, ia) || !activeTrunk(db, ib)) continue;
    // neighbours only exchange anything (CDP/LLDP, frames) over a link that is up
    if (!linkStatus(lab, l).up) continue;
    if (ia.nativeVlan === ib.nativeVlan) continue;
    out.push({
      linkId: l.id,
      a: { deviceId: da.id, deviceName: da.name, port: ia.name, nativeVlan: ia.nativeVlan },
      b: { deviceId: db.id, deviceName: db.name, port: ib.name, nativeVlan: ib.nativeVlan },
      cdp: isCiscoSwitch(da) && isCiscoSwitch(db),
    });
  }
  return out;
}

const key = (m: NativeVlanMismatch) => `${m.linkId}|${m.a.nativeVlan}|${m.b.nativeVlan}`;

/**
 * CDP syslog lines a Cisco switch prints after a command that CREATED a mismatch on one of its own trunks
 * (each new mismatch once; nothing for mismatches that already existed, so no repeats on later commands).
 */
export function cdpMismatchLog(before: Lab, after: Lab, deviceId: string): string[] {
  const dev = getDevice(after, deviceId);
  if (!dev || !isCiscoSwitch(dev)) return [];
  const old = new Set(nativeVlanMismatches(before).map(key));
  const lines: string[] = [];
  for (const m of nativeVlanMismatches(after)) {
    if (!m.cdp || old.has(key(m))) continue;
    const [me, peer] = m.a.deviceId === deviceId ? [m.a, m.b] : m.b.deviceId === deviceId ? [m.b, m.a] : [null, null];
    if (!me || !peer) continue;
    lines.push(`%CDP-4-NATIVE_VLAN_MISMATCH: Native VLAN mismatch discovered on ${me.port} (${me.nativeVlan}), with ${peer.deviceName} ${peer.port} (${peer.nativeVlan}).`);
  }
  return lines;
}
