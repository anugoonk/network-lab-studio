export type DeviceKind =
  | 'cisco-router'
  | 'cisco-switch'
  | 'aruba-switch'
  | 'l3-switch'
  | 'pc'
  | 'laptop'
  | 'server'
  | 'wireless-ap'
  | 'firewall'
  | 'isp-router';
export type Vendor = 'cisco' | 'aruba' | 'pc' | 'generic';
export type CliMode = 'user' | 'priv' | 'config' | 'config-if' | 'config-subif' | 'config-svi' | 'config-vlan' | 'pc';

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
  /** L2 trunk port (802.1Q). Access when false. */
  trunk: boolean;
  /** VLANs allowed on the trunk; null = all (1-4094) */
  trunkAllowed: number[] | null;
  /** untagged (native) VLAN on a trunk */
  nativeVlan: number;
}

/** Router sub-interface (router-on-a-stick): `interface Gi0/0.10` + `encapsulation dot1Q 10` */
export interface SubIf {
  parent: string;
  id: number;
  /** dot1Q VLAN; null until `encapsulation dot1Q` is configured */
  vlan: number | null;
  adminUp: boolean;
  description: string;
  ip: string | null;
  mask: string | null;
}

/** Switch virtual interface (interface vlan N) */
export interface Svi {
  vlan: number;
  adminUp: boolean;
  description: string;
  ip: string | null;
  mask: string | null;
}

export interface StaticRoute {
  net: string;
  mask: string;
  nextHop: string;
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
  subifs: SubIf[];
  svis: Svi[];
  routes: StaticRoute[];
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
  guide?: Guide;
}

/** Lab Guide: instructions / objective / resources shown beside the canvas (editable by the instructor). */
export interface GuideSection {
  heading: string;
  body: string;
}
export interface GuideLink {
  label: string;
  url: string;
}
export interface Guide {
  title: string;
  objective: string;
  sections: GuideSection[];
  resources: GuideLink[];
}
