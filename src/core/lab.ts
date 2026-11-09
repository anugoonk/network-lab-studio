import { PROFILES, isAruba, makeIface } from './profiles';
import type { CliMode, Device, DeviceKind, Endpoint, Iface, Lab, Link } from './types';

export const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,23}$/;

export function emptyLab(name = 'Untitled Lab'): Lab {
  return { schemaVersion: 1, name, devices: [], links: [], counters: {} };
}

export function initialMode(kind: DeviceKind): CliMode {
  const p = PROFILES[kind];
  if (p.isHost) return 'pc';
  return p.vendor === 'cisco' ? 'user' : 'priv';
}

export function createDevice(kind: DeviceKind, id: string, name: string, x: number, y: number): Device {
  const p = PROFILES[kind];
  return {
    id,
    kind,
    name,
    x,
    y,
    ifaces: p.portNames.map((n) => makeIface(kind, n)),
    vlans: p.isSwitch ? [{ id: 1, name: isAruba(kind) ? 'DEFAULT_VLAN_1' : 'default' }] : [],
    subifs: [],
    svis: [],
    routes: [],
    gateway: null,
    cli: { mode: initialMode(kind), ctxIface: null, ctxVlan: null, history: [] },
    startupConfig: null,
  };
}

/** Adds a device with an auto name; returns the new lab. */
export function addDevice(lab: Lab, kind: DeviceKind, x: number, y: number): { lab: Lab; device: Device } {
  const p = PROFILES[kind];
  const key = p.nameKey;
  const counters = { ...lab.counters };
  let n = (counters[key] ?? 0) + 1;
  const taken = new Set(lab.devices.map((d) => d.name.toLowerCase()));
  const fmt = (i: number) => (p.prefix.endsWith('-') ? `${p.prefix}${String(i).padStart(2, '0')}` : `${p.prefix}${i}`);
  while (taken.has(fmt(n).toLowerCase())) n++;
  counters[key] = n;
  const idCount = (counters.__id ?? 0) + 1;
  counters.__id = idCount;
  const device = createDevice(kind, `d${idCount}`, fmt(n), x, y);
  return { lab: { ...lab, counters, devices: [...lab.devices, device] }, device };
}

export function getDevice(lab: Lab, id: string): Device | undefined {
  return lab.devices.find((d) => d.id === id);
}

export function getIface(dev: Device, port: string): Iface | undefined {
  return dev.ifaces.find((i) => i.name === port);
}

export function linkAt(lab: Lab, deviceId: string, port: string): Link | undefined {
  return lab.links.find(
    (l) => (l.a.deviceId === deviceId && l.a.port === port) || (l.b.deviceId === deviceId && l.b.port === port),
  );
}

export function peerOf(link: Link, deviceId: string, port: string): Endpoint {
  return link.a.deviceId === deviceId && link.a.port === port ? link.b : link.a;
}

export function portInUse(lab: Lab, deviceId: string, port: string): boolean {
  return !!linkAt(lab, deviceId, port);
}

export type ConnectError = string | null;

export function validateLink(lab: Lab, a: Endpoint, b: Endpoint): ConnectError {
  const da = getDevice(lab, a.deviceId);
  const db = getDevice(lab, b.deviceId);
  if (!da || !db) return 'ไม่พบอุปกรณ์';
  if (da.id === db.id) return 'ไม่สามารถเชื่อมอุปกรณ์เข้ากับตัวเองได้';
  if (!getIface(da, a.port)) return `ไม่พบพอร์ต ${a.port} บน ${da.name}`;
  if (!getIface(db, b.port)) return `ไม่พบพอร์ต ${b.port} บน ${db.name}`;
  if (portInUse(lab, a.deviceId, a.port)) return `พอร์ต ${a.port} ของ ${da.name} มีสายเชื่อมอยู่แล้ว`;
  if (portInUse(lab, b.deviceId, b.port)) return `พอร์ต ${b.port} ของ ${db.name} มีสายเชื่อมอยู่แล้ว`;
  return null;
}

export function addLink(lab: Lab, a: Endpoint, b: Endpoint): { lab: Lab; error: ConnectError } {
  const error = validateLink(lab, a, b);
  if (error) return { lab, error };
  const idCount = (lab.counters.__link ?? 0) + 1;
  const link: Link = { id: `l${idCount}`, a, b };
  return { lab: { ...lab, counters: { ...lab.counters, __link: idCount }, links: [...lab.links, link] }, error: null };
}

export function removeDevice(lab: Lab, id: string): Lab {
  return {
    ...lab,
    devices: lab.devices.filter((d) => d.id !== id),
    links: lab.links.filter((l) => l.a.deviceId !== id && l.b.deviceId !== id),
  };
}

export function removeLink(lab: Lab, id: string): Lab {
  return { ...lab, links: lab.links.filter((l) => l.id !== id) };
}

export function updateDevice(lab: Lab, id: string, fn: (d: Device) => Device): Lab {
  return { ...lab, devices: lab.devices.map((d) => (d.id === id ? fn(d) : d)) };
}

/** Signature of everything a CLI command could change (excludes CLI mode/history and canvas position). */
export function configSignature(lab: Lab): string {
  return JSON.stringify({
    d: lab.devices.map((d) => ({
      id: d.id,
      name: d.name,
      ifaces: d.ifaces,
      vlans: d.vlans,
      subifs: d.subifs,
      svis: d.svis,
      routes: d.routes,
      gateway: d.gateway,
      startup: d.startupConfig,
    })),
    l: lab.links,
  });
}

/** Signature used for "unsaved work" detection (everything except CLI session state). */
export function contentSignature(lab: Lab): string {
  return JSON.stringify({
    n: lab.name,
    d: lab.devices.map((d) => ({ ...d, cli: undefined })),
    l: lab.links,
    g: lab.guide,
    c: lab.challenge,
  });
}

export const subName = (s: { parent: string; id: number }): string => `${s.parent}.${s.id}`;

/** "10,20,30-32" → [10,20,30,31,32]; null when malformed or out of range. */
export function parseVlanList(text: string): number[] | null {
  const out = new Set<number>();
  for (const part of text.split(',')) {
    const m = /^(\d{1,4})(?:-(\d{1,4}))?$/.exec(part);
    if (!m) return null;
    const a = Number(m[1]);
    const b = m[2] === undefined ? a : Number(m[2]);
    if (a < 1 || b > 4094 || a > b) return null;
    for (let v = a; v <= b; v++) out.add(v);
  }
  return [...out].sort((x, y) => x - y);
}

/** [10,20,30,31,32] → "10,20,30-32" */
export function formatVlanList(list: number[] | null): string {
  if (list === null) return '1-4094';
  if (!list.length) return 'none';
  const parts: string[] = [];
  let i = 0;
  while (i < list.length) {
    let j = i;
    while (j + 1 < list.length && list[j + 1] === list[j] + 1) j++;
    parts.push(j > i ? `${list[i]}-${list[j]}` : `${list[i]}`);
    i = j + 1;
  }
  return parts.join(',');
}
