/** Shared types and helpers for the command registry. One registry feeds the parser, `?` help, the Command Library and the tests. */
import { isValidMask, parseIp } from '../ip';
import { parseVlanList, subName } from '../lab';
import { PROFILES } from '../profiles';
import type { CliMode, Device, DeviceKind, Lab, Vendor } from '../types';

export type PType = 'vlan' | 'vlanlist' | 'iface' | 'word' | 'text' | 'ip' | 'mask' | 'rmask' | 'cidr';
export interface Tok {
  lit?: string;
  name?: string;
  ptype?: PType;
}

export type Topic = 'Mode' | 'Interface' | 'VLAN' | 'IP' | 'Troubleshooting' | 'Config' | 'Layer 2';
export const TOPICS: Topic[] = ['Mode', 'Interface', 'VLAN', 'IP', 'Layer 2', 'Troubleshooting', 'Config'];

export interface Ctx {
  /** mutable working copy — handlers may edit it; discarded when the command errors */
  lab: Lab;
  dev: Device;
  args: string[];
  line: string;
}

export interface RunResult {
  lines?: string[];
  error?: string[];
  mode?: CliMode;
  ctxIface?: string | null;
  ctxVlan?: number | null;
  clear?: boolean;
}

export interface CommandSpec {
  id: string;
  vendor: Vendor;
  deviceTypes: DeviceKind[];
  modes: CliMode[];
  syntax: string;
  helpEn: string;
  descTh: string;
  topic: Topic;
  /** runnable example (per device type, or one string for all) */
  example: string | Partial<Record<DeviceKind, string>>;
  /** how to check the effect (a command, with a Thai hint) */
  verify: string;
  verifyTh: string;
  tokens: Tok[];
  /** state the example needs before it can run (used by the registry tests) */
  prepare?: (d: Device) => void;
  /** executed by the engine itself (`do`) */
  special?: 'do';
  run: (c: Ctx) => RunResult | void;
}

const PARAM_TYPES: Record<string, PType> = {
  'vlan-id': 'vlan',
  'vlan-list': 'vlanlist',
  prefix: 'cidr',
  cidr: 'cidr',
  network: 'ip',
  'next-hop': 'ip',
  interface: 'iface',
  'ip-address': 'ip',
  'subnet-mask': 'mask',
  'route-mask': 'rmask',
  name: 'word',
  hostname: 'word',
  text: 'text',
  ipv4: 'word',
  command: 'text',
};

export const PARAM_HELP: Record<string, string> = {
  'vlan-id': 'VLAN ID (1-4094)',
  'vlan-list': 'VLAN IDs, e.g. 10,20,30-40',
  prefix: 'IPv4 prefix a.b.c.d/len',
  cidr: 'IPv4 address a.b.c.d/len',
  network: 'Destination network',
  'next-hop': 'Next-hop IPv4 address',
  interface: 'Interface name',
  'ip-address': 'IPv4 address',
  'subnet-mask': 'IPv4 subnet mask',
  'route-mask': 'Destination network mask (0.0.0.0 allowed for a default route)',
  name: 'Name',
  hostname: 'Hostname',
  text: 'Text',
  ipv4: 'IPv4 address',
  command: 'Command to run',
};

export function parseSyntax(syntax: string): Tok[] {
  return syntax.split(/\s+/).map((t) => {
    const m = /^<(.+)>$/.exec(t);
    if (!m) return { lit: t };
    const ptype = PARAM_TYPES[m[1]];
    if (!ptype) throw new Error(`Unknown param <${m[1]}> in "${syntax}"`);
    return { name: m[1], ptype };
  });
}

type SpecInput = Omit<CommandSpec, 'tokens' | 'run'> & { run?: CommandSpec['run'] };

export function cmd(s: SpecInput): CommandSpec {
  return { ...s, tokens: parseSyntax(s.syntax), run: s.run ?? (() => undefined) };
}

export function exampleFor(spec: CommandSpec, kind: DeviceKind): string {
  if (typeof spec.example === 'string') return spec.example;
  return spec.example[kind] ?? Object.values(spec.example)[0] ?? spec.syntax;
}

// ───────── parameter validation ─────────

const CISCO_IF_PREFIXES = ['gigabitethernet', 'fastethernet'];

/** Canonical interface name for the token on this device, or null. Router sub-interfaces (Gi0/0.10) are accepted. */
export function resolveIface(dev: Device, tok: string, vendor: Vendor): string | null {
  if (vendor === 'aruba') {
    return /^\d+\/\d+\/\d+$/.test(tok) && dev.ifaces.some((i) => i.name === tok) ? tok : null;
  }
  const m = /^([A-Za-z]+)(\d+(?:\/\d+)*)(?:\.(\d+))?$/.exec(tok);
  if (!m) return null;
  const letters = m[1].toLowerCase();
  const full = CISCO_IF_PREFIXES.find((p) => p.startsWith(letters));
  if (!full) return null;
  const base = full === 'gigabitethernet' ? `GigabitEthernet${m[2]}` : `FastEthernet${m[2]}`;
  if (!dev.ifaces.some((i) => i.name === base)) return null;
  if (m[3] === undefined) return base;
  const id = Number(m[3]);
  if (!PROFILES[dev.kind].isRouter || id < 1 || id > 4094) return null;
  return `${base}.${id}`;
}

/** Returns the stored argument value, or null when the token is invalid for the type. */
export function checkParam(ptype: PType, tok: string, dev: Device, vendor: Vendor): string | null {
  switch (ptype) {
    case 'vlan': {
      if (!/^\d+$/.test(tok)) return null;
      const n = Number(tok);
      return n >= 1 && n <= 4094 ? String(n) : null;
    }
    case 'vlanlist':
      return parseVlanList(tok) ? tok : null;
    case 'cidr': {
      const m = /^(\d+\.\d+\.\d+\.\d+)\/(\d{1,2})$/.exec(tok);
      return m && parseIp(m[1]) !== null && Number(m[2]) <= 32 ? tok : null;
    }
    case 'iface':
      return resolveIface(dev, tok, vendor);
    case 'ip':
      return parseIp(tok) !== null ? tok : null;
    case 'mask':
      return isValidMask(tok) ? tok : null;
    case 'rmask':
      return tok === '0.0.0.0' || isValidMask(tok) ? tok : null;
    case 'word':
    case 'text':
      return tok.length > 0 ? tok : null;
  }
}

export const TOKEN_HELP: Record<string, string> = {
  show: 'Show running system information',
  configure: 'Enter configuration mode',
  terminal: 'Configure from the terminal',
  interface: 'Select an interface to configure',
  vlan: 'VLAN configuration',
  no: 'Negate a command or set its defaults',
  ip: 'Internet Protocol (IP) config',
  switchport: 'Set switching mode characteristics',
  access: 'Set access mode characteristics of the interface',
  mode: 'Set trunking mode of the interface',
  write: 'Write running configuration to memory',
  copy: 'Copy from one file to another',
  trunk: 'Set trunking mode / characteristics',
  allowed: 'Set allowed VLAN characteristics when interface is in trunking mode',
  native: 'Set trunking native characteristics when interface is in trunking mode',
  route: 'Establish static routes',
  'default-gateway': 'Specify default gateway (if not routing IP)',
  encapsulation: 'Set encapsulation type for an interface',
  'running-config': 'Current operating configuration',
  'startup-config': 'Contents of startup configuration',
  do: 'Run an EXEC-level command from configuration mode',
};

export const MODE_LABEL: Record<Vendor, Partial<Record<CliMode, string>>> = {
  generic: {},
  cisco: {
    user: 'User EXEC (R1>)',
    priv: 'Privileged EXEC (R1#)',
    config: 'Global config (R1(config)#)',
    'config-if': 'Interface config (R1(config-if)#)',
    'config-subif': 'Sub-interface config (R1(config-subif)#)',
    'config-svi': 'VLAN interface config (SW1(config-if)#)',
    'config-vlan': 'VLAN config (SW1(config-vlan)#)',
  },
  aruba: {
    priv: 'Manager (SW2#)',
    config: 'Global config (SW2(config)#)',
    'config-if': 'Interface config (SW2(config-if)#)',
    'config-svi': 'VLAN interface config (SW2(config-if-vlan)#)',
    'config-vlan': 'VLAN config (SW2(config-vlan-10)#)',
  },
  pc: { pc: 'Terminal (C:\\>)' },
};

/** How a learner reaches a mode from power-on. */
export const MODE_PATH: Record<Vendor, Partial<Record<CliMode, string>>> = {
  generic: {},
  cisco: {
    user: 'โหมดเริ่มต้นหลังเปิดอุปกรณ์ (prompt ลงท้ายด้วย >)',
    priv: 'enable',
    config: 'enable → configure terminal',
    'config-if': 'enable → configure terminal → interface <ชื่อพอร์ต>',
    'config-subif': 'enable → configure terminal → interface <พอร์ต>.<เลข เช่น gi0/0.10>',
    'config-svi': 'enable → configure terminal → interface vlan <id>',
    'config-vlan': 'enable → configure terminal → vlan <id>',
  },
  aruba: {
    priv: 'โหมดเริ่มต้นหลังเปิดอุปกรณ์ (prompt ลงท้ายด้วย #)',
    config: 'configure terminal',
    'config-if': 'configure terminal → interface <พอร์ต เช่น 1/1/1>',
    'config-svi': 'configure terminal → vlan <id> (สร้างก่อน) → interface vlan <id>',
    'config-vlan': 'configure terminal → vlan <id>',
  },
  pc: { pc: 'เปิด Terminal ของ PC' },
};

// ───────── helpers shared by Cisco / Aruba handlers ─────────

/** The thing the current interface-level mode is editing: physical port, router sub-interface or SVI. */
export interface L3Target {
  adminUp: boolean;
  description: string;
  ip: string | null;
  mask: string | null;
}

export function curTarget(c: Ctx): L3Target | undefined {
  const d = c.dev;
  switch (d.cli.mode) {
    case 'config-if':
      return d.ifaces.find((i) => i.name === d.cli.ctxIface);
    case 'config-subif':
      return d.subifs.find((s) => subName(s) === d.cli.ctxIface);
    case 'config-svi':
      return d.svis.find((v) => v.vlan === d.cli.ctxVlan);
    default:
      return undefined;
  }
}

/** Name of another L3 interface on the same device whose subnet overlaps the new address, if any. */
export function overlapWith(
  c: Ctx,
  self: L3Target,
  ip: string,
  mask: string,
  overlaps: (a: string, am: string, b: string, bm: string) => boolean,
): string | null {
  const d = c.dev;
  const others: { name: string; t: L3Target }[] = [
    ...d.ifaces.map((i) => ({ name: i.name, t: i as L3Target })),
    ...d.subifs.map((s) => ({ name: subName(s), t: s as L3Target })),
    ...d.svis.map((v) => ({ name: `Vlan${v.vlan}`, t: v as L3Target })),
  ];
  for (const o of others) {
    if (o.t !== self && o.t.ip && o.t.mask && overlaps(ip, mask, o.t.ip, o.t.mask)) return o.name;
  }
  return null;
}
