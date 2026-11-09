export type DeviceKind = 'cisco-router' | 'cisco-switch' | 'aruba-switch' | 'pc';
export type Vendor = 'cisco' | 'aruba' | 'pc';
export type CliMode = 'user' | 'priv' | 'config' | 'config-if' | 'config-vlan' | 'pc';

export interface Iface {
  name: string;
  adminUp: boolean;
  description: string;
  ip: string | null;
  mask: string | null;
  /** access VLAN (switch ports only) */
  accessVlan: number;
  /** Cisco: `switchport mode access` was set explicitly */
  modeAccess: boolean;
  /** Aruba AOS-CX: interface is in routed (L3) mode — default; `no routing` makes it L2 */
  routed: boolean;
}

export interface Vlan {
  id: number;
  name: string;
}

export interface Cli {
  mode: CliMode;
  ctxIface: string | null;
  ctxVlan: number | null;
  history: string[];
}

export interface Device {
  id: string;
  kind: DeviceKind;
  name: string;
  x: number;
  y: number;
  ifaces: Iface[];
  vlans: Vlan[];
  gateway: string | null;
  cli: Cli;
  startupConfig: string | null;
}

export interface Endpoint {
  deviceId: string;
  port: string;
}

export interface Link {
  id: string;
  a: Endpoint;
  b: Endpoint;
}

export interface Lab {
  schemaVersion: 1;
  name: string;
  devices: Device[];
  links: Link[];
  counters: Record<string, number>;
}
