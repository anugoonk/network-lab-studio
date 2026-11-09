import type { DeviceKind, Iface, Vendor } from './types';

export interface DeviceProfile {
  kind: DeviceKind;
  vendor: Vendor;
  label: string; // Thai UI label
  model: string; // simulated model
  osRef: string; // reference OS/CLI version
  prefix: string;
  portNames: string[];
  isSwitch: boolean;
  isRouter: boolean;
  isHost: boolean;
  defaultAdminUp: boolean;
}

const range = (n: number, f: (i: number) => string) => Array.from({ length: n }, (_, i) => f(i + 1));

export const PROFILES: Record<DeviceKind, DeviceProfile> = {
  'cisco-router': {
    kind: 'cisco-router',
    vendor: 'cisco',
    label: 'Cisco IOS Router',
    model: 'Cisco ISR 2911 (simulated)',
    osRef: 'Cisco IOS 15.x (15.4(3)M)',
    prefix: 'R',
    portNames: ['GigabitEthernet0/0', 'GigabitEthernet0/1', 'GigabitEthernet0/2'],
    isSwitch: false,
    isRouter: true,
    isHost: false,
    defaultAdminUp: false,
  },
  'cisco-switch': {
    kind: 'cisco-switch',
    vendor: 'cisco',
    label: 'Cisco IOS Layer 2 Switch',
    model: 'Cisco Catalyst 2960-24TT (simulated)',
    osRef: 'Cisco IOS 15.0(2)SE',
    prefix: 'SW',
    portNames: [...range(24, (i) => `FastEthernet0/${i}`), 'GigabitEthernet0/1', 'GigabitEthernet0/2'],
    isSwitch: true,
    isRouter: false,
    isHost: false,
    defaultAdminUp: true,
  },
  'aruba-switch': {
    kind: 'aruba-switch',
    vendor: 'aruba',
    label: 'HPE Aruba AOS-CX Layer 2 Switch',
    model: 'Aruba CX 6100 24G (simulated)',
    osRef: 'ArubaOS-CX 10.10',
    prefix: 'SW',
    portNames: range(28, (i) => `1/1/${i}`),
    isSwitch: true,
    isRouter: false,
    isHost: false,
    defaultAdminUp: false,
  },
  pc: {
    kind: 'pc',
    vendor: 'pc',
    label: 'PC',
    model: 'Generic PC (simulated)',
    osRef: 'Windows-style terminal (ipconfig, ping)',
    prefix: 'PC-',
    portNames: ['Ethernet0'],
    isSwitch: false,
    isRouter: false,
    isHost: true,
    defaultAdminUp: true,
  },
};

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
    routed: kind === 'aruba-switch', // AOS-CX interfaces default to routed (L3) mode
  };
}

export function shortPort(name: string): string {
  return name.replace('GigabitEthernet', 'Gi').replace('FastEthernet', 'Fa').replace(/^Ethernet(\d)/, 'Eth$1');
}
