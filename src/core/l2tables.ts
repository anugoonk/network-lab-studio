/**
 * MAC address tables, ARP tables and duplicate-IP detection — all derived from the live topology + config.
 *
 * Model (stated honestly in the UI/README): these are *steady-state* views. Every interface that has an IP and
 * a working link is assumed to have sent a frame, so switches have learned it and neighbours have resolved it.
 * There is no learning/aging simulation. Because they are recomputed from the current Lab, a VLAN change,
 * a shut port or a pulled cable shows up immediately.
 */
import { getDevice } from './lab';
import { l2Domain, l3Interfaces, type L3If } from './network';
import type { Device, Lab } from './types';

/** FNV-1a — stable hash so a device keeps its MAC addresses across saves and reloads */
function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** 12 lowercase hex digits. Locally-administered unicast prefix (02:4e) + 32-bit hash of "<deviceId>|<port>". */
export function macOf(deviceId: string, key: string): string {
  const h = hash32(`${deviceId}|${key}`).toString(16).padStart(8, '0');
  return `024e${h}`;
}

/** MAC of the interface an L3 entry lives on (sub-interfaces share the parent port; SVIs share the switch MAC) */
export function ifcMac(ifc: L3If): string {
  return macOf(ifc.deviceId, ifc.kind === 'svi' ? 'svi' : ifc.port!);
}

export const fmtMacCisco = (m: string) => `${m.slice(0, 4)}.${m.slice(4, 8)}.${m.slice(8, 12)}`;
export const fmtMacColon = (m: string) => m.match(/.{2}/g)!.join(':');
export const fmtMacDash = (m: string) => m.match(/.{2}/g)!.join('-');

// ───────────────────────── MAC address table ─────────────────────────

export interface MacEntry {
  vlan: number;
  mac: string;
  /** switch port the MAC is learned on; "CPU" for the switch's own SVI MAC */
  port: string;
  type: 'DYNAMIC' | 'STATIC';
}

const allTalkers = (lab: Lab): L3If[] => lab.devices.flatMap((d) => l3Interfaces(lab, d).filter((i) => i.up));

export function macTable(lab: Lab, sw: Device): MacEntry[] {
  const seen = new Map<string, MacEntry>();
  for (const t of allTalkers(lab)) {
    const mac = ifcMac(t);
    l2Domain(lab, t, (s, vlan, ingress) => {
      if (s.id !== sw.id) return;
      const key = `${vlan}|${mac}`;
      if (!seen.has(key)) seen.set(key, { vlan, mac, port: ingress ?? 'CPU', type: ingress === null ? 'STATIC' : 'DYNAMIC' });
    });
  }
  return [...seen.values()].sort((a, b) => a.vlan - b.vlan || a.mac.localeCompare(b.mac));
}

// ───────────────────────── ARP table ─────────────────────────

export interface ArpEntry {
  ip: string;
  mac: string;
  /** local interface the entry was learned on (L3 interface name, e.g. GigabitEthernet0/0.10, Vlan10, Ethernet0) */
  iface: string;
  /** one of this device's own addresses */
  own: boolean;
}

export function arpTable(lab: Lab, dev: Device): ArpEntry[] {
  const out: ArpEntry[] = [];
  for (const x of l3Interfaces(lab, dev).filter((i) => i.up)) {
    out.push({ ip: x.ip, mac: ifcMac(x), iface: x.name, own: true });
    for (const r of l2Domain(lab, x)) {
      if (r.ifc.deviceId === dev.id) continue;
      out.push({ ip: r.ifc.ip, mac: ifcMac(r.ifc), iface: x.name, own: false });
    }
  }
  return out;
}

// ───────────────────────── duplicate IP ─────────────────────────

export interface DupMember {
  deviceId: string;
  deviceName: string;
  ifaceName: string;
  mac: string;
}
export interface DupIp {
  ip: string;
  members: DupMember[];
}

/**
 * The same IPv4 address on two interfaces that can currently reach each other at Layer 2 (up links, same VLAN).
 * Re-using an address in two separate, routed segments is legitimate and is NOT reported.
 */
export function duplicateIps(lab: Lab): DupIp[] {
  const talkers = allTalkers(lab);
  const groups = new Map<string, Map<string, DupMember>>();
  const add = (ip: string, i: L3If) => {
    const g = groups.get(ip) ?? new Map<string, DupMember>();
    g.set(`${i.deviceId}|${i.name}`, { deviceId: i.deviceId, deviceName: getDevice(lab, i.deviceId)?.name ?? '?', ifaceName: i.name, mac: ifcMac(i) });
    groups.set(ip, g);
  };
  for (const t of talkers) {
    for (const r of l2Domain(lab, t)) {
      if (r.ifc.ip === t.ip && r.ifc.deviceId !== t.deviceId) {
        add(t.ip, t);
        add(t.ip, r.ifc);
      }
    }
  }
  return [...groups.entries()]
    .map(([ip, g]) => ({ ip, members: [...g.values()].sort((a, b) => a.deviceName.localeCompare(b.deviceName)) }))
    .sort((a, b) => a.ip.localeCompare(b.ip, undefined, { numeric: true }));
}

const dupCache = new WeakMap<Lab, DupIp[]>();

/** same as duplicateIps, memoised per Lab object (the canvas asks once per node on every render) */
export function duplicateIpsCached(lab: Lab): DupIp[] {
  let r = dupCache.get(lab);
  if (!r) {
    r = duplicateIps(lab);
    dupCache.set(lab, r);
  }
  return r;
}

