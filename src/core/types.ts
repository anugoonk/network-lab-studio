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
  | 'isp-router'
  /** IP end devices (DEV-01C-1): simulated as plain IP hosts (PC terminal), device functions not simulated */
  | 'printer'
  | 'ip-camera'
  | 'ip-phone'
  | 'nvr'
  | 'nas'
  /** diagram-only objects (DEV-01B-1b): drawn (and, with ports, cabled) but never simulated */
  | 'internet-cloud'
  | 'patch-panel'
  | 'rack'
  | 'ups';
export type Vendor = 'cisco' | 'aruba' | 'pc' | 'generic';
export type CliMode = 'user' | 'priv' | 'config' | 'config-if' | 'config-subif' | 'config-svi' | 'config-vlan' | 'config-line' | 'pc';

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

/**
 * Static route (SR-NET-12). At least one of nextHop / iface is set:
 *  - nextHop only: via a next-hop address; a next hop that is not on a connected subnet is resolved through other routes (recursive, max 8 levels)
 *  - iface only: exit-interface route — the destination is ARPed directly on that interface
 *  - both: out of that interface, towards that next hop
 * Labs saved before SR-NET-12 have nextHop and no iface and load unchanged.
 */
export interface StaticRoute {
  net: string;
  mask: string;
  nextHop?: string;
  /** canonical L3 interface name on this device: GigabitEthernet0/1, GigabitEthernet0/0.10 (Cisco), 1/1/1 (AOS-CX) */
  iface?: string;
}

export interface Vlan {
  id: number;
  name: string;
}

export interface Cli {
  mode: CliMode;
  ctxIface: string | null;
  ctxVlan: number | null;
  /** `interface range …`: every port the interface-level commands apply to (ctxIface is the first one) */
  ctxRange?: string[];
  /** `line console 0` / `line vty …` (SR-CLI-11): the line the config-line mode is editing. Transient: never saved. */
  ctxLine?: LineId;
  history: string[];
  /**
   * The console is waiting for a credential, not a command (CERT-P0-1a: the enable secret after `enable`).
   * Transient: never saved to storage or export files and dropped when a Lab is loaded. Holds no secret.
   */
  pending?: { kind: 'enable' | 'confirm'; attempts: number; /** kind 'confirm' (erase / reload): what the answer confirms */ action?: 'erase' | 'reload' };
}

/** Device access security (CERT-P0-1a). Absent = no secrets configured = original behaviour. */
export interface DeviceSecurity {
  /** `enable secret`: Cisco type-5 string "$1$<salt>$<hash>" (MD5-crypt). The clear-text secret is never stored. */
  enableSecret?: string;
  /** `username …` (SR-CLI-11). Credentials are stored only as type-5 strings; never clear text. */
  users?: LocalUser[];
}

/** A local user. `secret` = `username … secret` (type 5). `password` = `username … password`: the same derived string, printed as `password 7 <token>` (simulated, NOT real type 7). */
export interface LocalUser {
  name: string;
  privilege?: number;
  secret?: string;
  password?: string;
}

/** Lines of SR-CLI-11: the console and the two VTY ranges the simulator accepts. */
export type LineId = 'console' | 'vty04' | 'vty015';

export interface LineConfig {
  /** line `password`: derived type-5 string (printed as `password 7 <token>`); never clear text */
  password?: string;
  login?: 'login' | 'local';
  /** vty only */
  transport?: 'all' | 'ssh' | 'telnet' | 'none';
  execTimeout?: { min: number; sec: number };
}

/** Management configuration (SR-CLI-11, Cisco IOS only). Absent = nothing configured = original behaviour. Older builds drop it silently on load. */
export interface DeviceMgmt {
  console?: LineConfig;
  vty04?: LineConfig;
  vty015?: LineConfig;
  banners?: { motd?: string; login?: string };
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
  security?: DeviceSecurity;
  mgmt?: DeviceMgmt;
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
  challenge?: Challenge;
}

/** Challenge mode: checks evaluated against the live Lab when the learner presses Check. */
export type Check =
  | { id: string; kind: 'ping'; label: string; from: string; to: string; expect: 'success' | 'fail' }
  | { id: string; kind: 'link-up'; label: string; deviceId: string; port: string }
  /** the device's running-config contains (or does not contain) this exact line, ignoring indentation */
  | { id: string; kind: 'config-line'; label: string; deviceId: string; text: string; expect: 'present' | 'absent' }
  /** a trunk port carries (or does not carry) a VLAN */
  | { id: string; kind: 'trunk-vlan'; label: string; deviceId: string; port: string; vlan: number; expect: 'allowed' | 'blocked' }
  /** a port is administratively up / shut down */
  | { id: string; kind: 'port-admin'; label: string; deviceId: string; port: string; expect: 'up' | 'down' }
  /** the device has a usable (installed) route to net/prefix: connected or static with a reachable next hop */
  | { id: string; kind: 'route'; label: string; deviceId: string; net: string; prefix: number }
  /** no IPv4 address is used twice inside one L2 domain */
  | { id: string; kind: 'no-dup-ip'; label: string };
/** The Lab content a challenge starts from; "Reset" restores it. */
export interface ChallengeStart {
  devices: Device[];
  links: Link[];
  counters: Record<string, number>;
}
export interface Challenge {
  title: string;
  goal: string;
  checks: Check[];
  /** progressive hints, broad → specific; the learner reveals them one at a time */
  hints?: string[];
  start?: ChallengeStart;
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
