import type { DeviceKind, Iface, Vendor } from './types';
import { tx } from '../i18n';

export interface DeviceProfile {
  kind: DeviceKind;
  vendor: Vendor;
  label: string; // UI label
  model: string; // simulated model
  osRef: string; // reference OS/CLI version
  prefix: string; // auto-name prefix; a trailing "-" means a zero-padded number (PC-01)
  /** counter key used for auto-naming (switches share "SW") */
  nameKey: string;
  portNames: string[];
  /** port names that older saved Labs may still contain in addition to `portNames` */
  legacyPortNames?: string[];
  isSwitch: boolean;
  isRouter: boolean;
  isHost: boolean;
  /** L3 forwarding between interfaces (static routes, connected subnets) is simulated */
  canForward: boolean;
  /** has a simulated console / terminal (CLI registry entries exist for it) */
  hasCli: boolean;
  /** short text under the node name on the canvas when it has no IP to show */
  roleNote: string;
  defaultAdminUp: boolean;
}

const range = (n: number, f: (i: number) => string) => Array.from({ length: n }, (_, i) => f(i + 1));

const hostProfile = (kind: DeviceKind, label: string, model: string, prefix: string): DeviceProfile => ({
  kind,
  vendor: 'pc',
  label,
  model,
  osRef: 'Windows-style terminal (ipconfig, ping)',
  prefix,
  nameKey: prefix,
  portNames: ['Ethernet0'],
  isSwitch: false,
  isRouter: false,
  isHost: true,
  canForward: false,
  hasCli: true,
  roleNote: tx('ยังไม่ตั้ง IP'),
  defaultAdminUp: true,
});

export const PROFILES: Record<DeviceKind, DeviceProfile> = {
  'cisco-router': {
    kind: 'cisco-router',
    vendor: 'cisco',
    label: 'Cisco IOS Router',
    model: 'Cisco ISR 2911 (simulated)',
    osRef: 'Cisco IOS 15.x (15.4(3)M)',
    prefix: 'R',
    nameKey: 'R',
    portNames: ['GigabitEthernet0/0', 'GigabitEthernet0/1', 'GigabitEthernet0/2'],
    isSwitch: false,
    isRouter: true,
    isHost: false,
    canForward: true,
    hasCli: true,
    roleNote: tx('ไม่มี IP'),
    defaultAdminUp: false,
  },
  'cisco-switch': {
    kind: 'cisco-switch',
    vendor: 'cisco',
    label: 'Cisco IOS Access Switch',
    model: 'Cisco Catalyst 2960-24TT (simulated)',
    osRef: 'Cisco IOS 15.0(2)SE',
    prefix: 'SW',
    nameKey: 'SW',
    portNames: [...range(24, (i) => `FastEthernet0/${i}`), 'GigabitEthernet0/1', 'GigabitEthernet0/2'],
    isSwitch: true,
    isRouter: false,
    isHost: false,
    canForward: false,
    hasCli: true,
    roleNote: 'IOS L2',
    defaultAdminUp: true,
  },
  'aruba-switch': {
    kind: 'aruba-switch',
    vendor: 'aruba',
    label: 'HPE Aruba AOS-CX Access Switch',
    model: 'Aruba CX 6100 24G (simulated)',
    osRef: 'ArubaOS-CX 10.10',
    prefix: 'SW',
    nameKey: 'SW',
    portNames: range(24, (i) => `1/1/${i}`),
    // Labs saved before the 24-port default also have 1/1/25-28; they are kept as-is.
    legacyPortNames: range(4, (i) => `1/1/${24 + i}`),
    isSwitch: true,
    isRouter: false,
    isHost: false,
    canForward: true,
    hasCli: true,
    roleNote: 'AOS-CX L2',
    defaultAdminUp: false,
  },
  // Distribution switch. The only L3-capable switch profile in the simulator is AOS-CX
  // (SVIs, routed ports, static routes); the Cisco switch profile is L2-only here.
  'l3-switch': {
    kind: 'l3-switch',
    vendor: 'aruba',
    label: 'Layer 3 Switch (Distribution)',
    model: 'Aruba CX 6300M 24G + 4 uplink (simulated)',
    osRef: 'ArubaOS-CX 10.10',
    prefix: 'DSW',
    nameKey: 'DSW',
    portNames: range(28, (i) => `1/1/${i}`),
    isSwitch: true,
    isRouter: false,
    isHost: false,
    canForward: true,
    hasCli: true,
    roleNote: 'AOS-CX L3',
    defaultAdminUp: false,
  },
  pc: hostProfile('pc', 'PC', 'Generic PC (simulated)', 'PC-'),
  laptop: hostProfile('laptop', 'Laptop', 'Generic laptop, Ethernet only (simulated)', 'LAP-'),
  server: hostProfile('server', 'Server', 'Generic server (simulated)', 'SRV-'),
  'wireless-ap': {
    kind: 'wireless-ap',
    vendor: 'generic',
    label: 'Wireless Access Point',
    model: 'Generic Wi-Fi AP, 1 Ethernet uplink (simulated)',
    osRef: tx('ไม่มี CLI — วาดและต่อสายเท่านั้น'),
    prefix: 'AP',
    nameKey: 'AP',
    portNames: ['Ethernet0'],
    isSwitch: false,
    isRouter: false,
    isHost: false,
    canForward: false,
    hasCli: false,
    roleNote: tx('Wi-Fi (ไม่จำลอง)'),
    defaultAdminUp: true,
  },
  firewall: {
    kind: 'firewall',
    vendor: 'generic',
    label: 'Firewall',
    model: 'Generic 3-zone firewall: LAN / WAN / DMZ (simulated)',
    osRef: tx('ไม่มี CLI / policy — วาดและต่อสายเท่านั้น'),
    prefix: 'FW',
    nameKey: 'FW',
    portNames: ['LAN', 'WAN', 'DMZ'],
    isSwitch: false,
    isRouter: false,
    isHost: false,
    canForward: false,
    hasCli: false,
    roleNote: 'LAN · WAN · DMZ',
    defaultAdminUp: true,
  },
  'isp-router': {
    kind: 'isp-router',
    vendor: 'cisco',
    label: 'ISP Router / WAN',
    model: 'Simulated ISP edge router, in-lab WAN (Cisco IOS-style CLI)',
    osRef: 'Cisco IOS 15.x (15.4(3)M)',
    prefix: 'ISP',
    nameKey: 'ISP',
    portNames: ['GigabitEthernet0/0', 'GigabitEthernet0/1'],
    isSwitch: false,
    isRouter: true,
    isHost: false,
    canForward: true,
    hasCli: true,
    roleNote: tx('WAN จำลองใน Lab'),
    defaultAdminUp: false,
  },
};

/** Order shown in the Device Palette. */
export const PALETTE_GROUPS: { title: string; items: { kind: DeviceKind; note: string }[] }[] = [
  {
    title: 'Routers & Switches',
    items: [
      { kind: 'cisco-router', note: 'Router · Gi0/0–0/2' },
      { kind: 'cisco-switch', note: 'Access L2 · Fa0/1–24, Gi0/1–2' },
      { kind: 'aruba-switch', note: 'Access L2 · 1/1/1–1/1/24' },
      { kind: 'l3-switch', note: 'DSW · AOS-CX L3 · 1/1/1–1/1/28' },
    ],
  },
  {
    title: 'End Devices',
    items: [
      { kind: 'pc', note: tx('เครื่องผู้ใช้ · Ethernet0') },
      { kind: 'laptop', note: tx('โน้ตบุ๊ก · Ethernet0') },
    ],
  },
  {
    title: 'Servers & Wireless',
    items: [
      { kind: 'server', note: tx('เซิร์ฟเวอร์ · Ethernet0') },
      { kind: 'wireless-ap', note: tx('AP · uplink Ethernet0 (วาด/ต่อสายเท่านั้น)') },
    ],
  },
  {
    title: 'Security & WAN',
    items: [
      { kind: 'firewall', note: tx('LAN · WAN · DMZ (วาด/ต่อสายเท่านั้น)') },
      { kind: 'isp-router', note: tx('WAN จำลอง · Gi0/0–0/1') },
    ],
  },
];

export const isAruba = (kind: DeviceKind): boolean => PROFILES[kind].vendor === 'aruba';

export function makeIface(kind: DeviceKind, name: string): Iface {
  const p = PROFILES[kind];
  return {
    name,
    adminUp: p.defaultAdminUp,
    description: '',
    ip: null,
    mask: null,
    accessVlan: 1,
    modeAccess: false,
    routed: isAruba(kind), // AOS-CX interfaces default to routed (L3) mode
    trunk: false,
    trunkAllowed: null,
    nativeVlan: 1,
  };
}

export function shortPort(name: string): string {
  return name.replace('GigabitEthernet', 'Gi').replace('FastEthernet', 'Fa').replace(/^Ethernet(\d)/, 'Eth$1');
}
