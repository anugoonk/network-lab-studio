/** Shared types and helpers for the command registry. One registry feeds the parser, `?` help, the Command Library and the tests. */
import { isValidMask, parseIp } from '../ip';
import type { CliMode, Device, DeviceKind, Lab, Vendor } from '../types';

export type PType = 'vlan' | 'iface' | 'word' | 'text' | 'ip' | 'mask';
export interface Tok {
  lit?: string;
  name?: string;
  ptype?: PType;
}

export type Topic = 'Mode' | 'Interface' | 'VLAN' | 'IP' | 'Troubleshooting' | 'Config';
export const TOPICS: Topic[] = ['Mode', 'Interface', 'VLAN', 'IP', 'Troubleshooting', 'Config'];

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
  /** executed by the engine itself (`do`) */
  special?: 'do';
  run: (c: Ctx) => RunResult | void;
}

const PARAM_TYPES: Record<string, PType> = {
  'vlan-id': 'vlan',
  interface: 'iface',
  'ip-address': 'ip',
  'subnet-mask': 'mask',
  name: 'word',
  hostname: 'word',
  text: 'text',
  ipv4: 'word',
  command: 'text',
};

export const PARAM_HELP: Record<string, string> = {
  'vlan-id': 'VLAN ID (1-4094)',
  interface: 'Interface name',
  'ip-address': 'IPv4 address',
  'subnet-mask': 'IPv4 subnet mask',
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

/** Canonical interface name for the token on this device, or null. */
export function resolveIface(dev: Device, tok: string, vendor: Vendor): string | null {
  if (vendor === 'aruba') {
    return /^\d+\/\d+\/\d+$/.test(tok) && dev.ifaces.some((i) => i.name === tok) ? tok : null;
  }
  const m = /^([A-Za-z]+)(\d+(?:\/\d+)*)$/.exec(tok);
  if (!m) return null;
  const letters = m[1].toLowerCase();
  const full = CISCO_IF_PREFIXES.find((p) => p.startsWith(letters));
  if (!full) return null;
  const name = full === 'gigabitethernet' ? `GigabitEthernet${m[2]}` : `FastEthernet${m[2]}`;
  return dev.ifaces.some((i) => i.name === name) ? name : null;
}

/** Returns the stored argument value, or null when the token is invalid for the type. */
export function checkParam(ptype: PType, tok: string, dev: Device, vendor: Vendor): string | null {
  switch (ptype) {
    case 'vlan': {
      if (!/^\d+$/.test(tok)) return null;
      const n = Number(tok);
      return n >= 1 && n <= 4094 ? String(n) : null;
    }
    case 'iface':
      return resolveIface(dev, tok, vendor);
    case 'ip':
      return parseIp(tok) !== null ? tok : null;
    case 'mask':
      return isValidMask(tok) ? tok : null;
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
  'running-config': 'Current operating configuration',
  'startup-config': 'Contents of startup configuration',
  do: 'Run an EXEC-level command from configuration mode',
};

export const MODE_LABEL: Record<Vendor, Partial<Record<CliMode, string>>> = {
  cisco: {
    user: 'User EXEC (R1>)',
    priv: 'Privileged EXEC (R1#)',
    config: 'Global config (R1(config)#)',
    'config-if': 'Interface config (R1(config-if)#)',
    'config-vlan': 'VLAN config (SW1(config-vlan)#)',
  },
  aruba: {
    priv: 'Manager (SW2#)',
    config: 'Global config (SW2(config)#)',
    'config-if': 'Interface config (SW2(config-if)#)',
    'config-vlan': 'VLAN config (SW2(config-vlan-10)#)',
  },
  pc: { pc: 'Terminal (C:\\>)' },
};

/** How a learner reaches a mode from power-on. */
export const MODE_PATH: Record<Vendor, Partial<Record<CliMode, string>>> = {
  cisco: {
    user: 'โหมดเริ่มต้นหลังเปิดอุปกรณ์ (prompt ลงท้ายด้วย >)',
    priv: 'enable',
    config: 'enable → configure terminal',
    'config-if': 'enable → configure terminal → interface <ชื่อพอร์ต>',
    'config-vlan': 'enable → configure terminal → vlan <id>',
  },
  aruba: {
    priv: 'โหมดเริ่มต้นหลังเปิดอุปกรณ์ (prompt ลงท้ายด้วย #)',
    config: 'configure terminal',
    'config-if': 'configure terminal → interface <พอร์ต เช่น 1/1/1>',
    'config-vlan': 'configure terminal → vlan <id>',
  },
  pc: { pc: 'เปิด Terminal ของ PC' },
};
