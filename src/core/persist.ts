import { z } from 'zod';
import { isValidMask, parseIp } from './ip';
import { NAME_RE } from './lab';
import { PROFILES } from './profiles';
import type { CliMode, DeviceKind, Lab } from './types';

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'nls.lab.v1';
export const APP_ID = 'network-lab-studio';

const ipStr = z.string().refine((s) => parseIp(s) !== null, 'IPv4 address ไม่ถูกต้อง');
const maskStr = z.string().refine((s) => isValidMask(s), 'subnet mask ไม่ถูกต้อง');

const ifaceSchema = z.object({
  name: z.string(),
  adminUp: z.boolean(),
  description: z.string().max(200),
  ip: ipStr.nullable(),
  mask: maskStr.nullable(),
  accessVlan: z.number().int().min(1).max(4094),
  modeAccess: z.boolean(),
  routed: z.boolean(),
  trunk: z.boolean().default(false),
  trunkAllowed: z.array(z.number().int().min(1).max(4094)).nullable().default(null),
  nativeVlan: z.number().int().min(1).max(4094).default(1),
});

const subifSchema = z.object({
  parent: z.string(),
  id: z.number().int().min(1).max(4094),
  vlan: z.number().int().min(1).max(4094).nullable(),
  adminUp: z.boolean(),
  description: z.string().max(200),
  ip: ipStr.nullable(),
  mask: maskStr.nullable(),
});

const sviSchema = z.object({
  vlan: z.number().int().min(1).max(4094),
  adminUp: z.boolean(),
  description: z.string().max(200),
  ip: ipStr.nullable(),
  mask: maskStr.nullable(),
});

const routeSchema = z.object({
  net: ipStr,
  mask: z.string().refine((s) => s === '0.0.0.0' || isValidMask(s), 'subnet mask ไม่ถูกต้อง'),
  nextHop: ipStr,
});

const deviceSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(Object.keys(PROFILES) as [DeviceKind, ...DeviceKind[]]),
  name: z.string().regex(NAME_RE, 'ชื่ออุปกรณ์ไม่ถูกต้อง'),
  x: z.number().finite(),
  y: z.number().finite(),
  ifaces: z.array(ifaceSchema),
  vlans: z.array(z.object({ id: z.number().int().min(1).max(4094), name: z.string().min(1).max(32) })),
  subifs: z.array(subifSchema).max(200).default([]),
  svis: z.array(sviSchema).max(200).default([]),
  routes: z.array(routeSchema).max(500).default([]),
  gateway: ipStr.nullable(),
  cli: z.object({
    mode: z.enum(['user', 'priv', 'config', 'config-if', 'config-subif', 'config-svi', 'config-vlan', 'pc']),
    ctxIface: z.string().nullable(),
    ctxVlan: z.number().int().nullable(),
    history: z.array(z.string()).max(200),
  }),
  startupConfig: z.string().nullable(),
});

const endpointSchema = z.object({ deviceId: z.string(), port: z.string() });

const safeUrl = (u: string) => u === '' || /^https?:\/\/[^\s]+$/i.test(u);

const guideSchema = z.object({
  title: z.string().max(120),
  objective: z.string().max(4000),
  sections: z.array(z.object({ heading: z.string().max(120), body: z.string().max(4000) })).max(50),
  resources: z
    .array(z.object({ label: z.string().max(120), url: z.string().max(500).refine(safeUrl, 'URL ต้องขึ้นต้นด้วย http:// หรือ https://') }))
    .max(30),
});

const labSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  name: z.string().max(120),
  devices: z.array(deviceSchema).max(200),
  links: z.array(z.object({ id: z.string().min(1), a: endpointSchema, b: endpointSchema })).max(1000),
  counters: z.record(z.string(), z.number()),
  guide: guideSchema.optional(),
});

/** CLI modes a device may be saved in. Devices without a CLI stay in their initial mode. */
function modesFor(kind: DeviceKind): CliMode[] {
  const p = PROFILES[kind];
  if (p.isHost) return ['pc'];
  if (p.vendor === 'cisco') return p.isRouter ? ['user', 'priv', 'config', 'config-if', 'config-subif'] : ['user', 'priv', 'config', 'config-if', 'config-svi', 'config-vlan'];
  return ['priv', 'config', 'config-if', 'config-svi', 'config-vlan'];
}

/** Semantic checks that need cross-references (ports, devices, duplicates). */
function crossCheck(lab: Lab): string[] {
  const errs: string[] = [];
  const ids = new Set<string>();
  for (const d of lab.devices) {
    if (ids.has(d.id)) errs.push(`รหัสอุปกรณ์ซ้ำ: ${d.id}`);
    ids.add(d.id);
    const p = PROFILES[d.kind];
    const names = d.ifaces.map((i) => i.name);
    // every current port must exist; extra ports are accepted only if an older release had them
    const allowed = new Set([...p.portNames, ...(p.legacyPortNames ?? [])]);
    if (p.portNames.some((n) => !names.includes(n)) || names.some((n) => !allowed.has(n))) {
      errs.push(`${d.name}: รายการพอร์ตไม่ตรงกับรุ่น ${p.label}`);
    }
    if (new Set(names).size !== names.length) errs.push(`${d.name}: มีพอร์ตชื่อซ้ำ`);
    if (p.isSwitch) {
      if (!d.vlans.some((v) => v.id === 1)) errs.push(`${d.name}: ต้องมี VLAN 1`);
      if (new Set(d.vlans.map((v) => v.id)).size !== d.vlans.length) errs.push(`${d.name}: มี VLAN ซ้ำ`);
    } else if (d.vlans.length) errs.push(`${d.name}: อุปกรณ์ชนิดนี้ไม่มี VLAN database`);
    if (!modesFor(d.kind).includes(d.cli.mode) && p.hasCli) errs.push(`${d.name}: CLI mode "${d.cli.mode}" ใช้ไม่ได้กับอุปกรณ์ชนิดนี้`);
    if (d.cli.ctxIface && !names.includes(d.cli.ctxIface) && !d.subifs.some((s) => `${s.parent}.${s.id}` === d.cli.ctxIface))
      errs.push(`${d.name}: CLI อ้างอิงพอร์ตที่ไม่มีอยู่`);
    if (!p.isRouter && d.subifs.length) errs.push(`${d.name}: sub-interface ใช้ได้เฉพาะ router`);
    if (!p.isSwitch && d.svis.length) errs.push(`${d.name}: SVI ใช้ได้เฉพาะ switch`);
    if (!p.canForward && d.routes.length) errs.push(`${d.name}: อุปกรณ์ชนิดนี้ไม่รองรับ static route`);
    const seen = new Set<string>();
    for (const s of d.subifs) {
      const key = `${s.parent}.${s.id}`;
      if (!names.includes(s.parent)) errs.push(`${d.name}: sub-interface ${key} อ้างอิงพอร์ตแม่ที่ไม่มีอยู่`);
      if (seen.has(key)) errs.push(`${d.name}: sub-interface ซ้ำ ${key}`);
      seen.add(key);
      if (!!s.ip !== !!s.mask) errs.push(`${d.name}/${key}: IP และ mask ต้องกำหนดคู่กัน`);
    }
    if (new Set(d.svis.map((v) => v.vlan)).size !== d.svis.length) errs.push(`${d.name}: SVI ซ้ำ`);
    for (const v of d.svis) if (!!v.ip !== !!v.mask) errs.push(`${d.name}/Vlan${v.vlan}: IP และ mask ต้องกำหนดคู่กัน`);
    if (p.isHost && d.ifaces.some((i) => !!i.ip !== !!i.mask)) errs.push(`${d.name}: IP และ mask ต้องกำหนดคู่กัน`);
    for (const i of d.ifaces) if (!!i.ip !== !!i.mask) errs.push(`${d.name}/${i.name}: IP และ mask ต้องกำหนดคู่กัน`);
  }
  const used = new Set<string>();
  const linkIds = new Set<string>();
  for (const l of lab.links) {
    if (linkIds.has(l.id)) errs.push(`รหัสสายซ้ำ: ${l.id}`);
    linkIds.add(l.id);
    for (const e of [l.a, l.b]) {
      const d = lab.devices.find((x) => x.id === e.deviceId);
      if (!d) {
        errs.push(`สาย ${l.id} อ้างอิงอุปกรณ์ที่ไม่มีอยู่ (${e.deviceId})`);
        continue;
      }
      if (!d.ifaces.some((i) => i.name === e.port)) errs.push(`สาย ${l.id} อ้างอิงพอร์ตที่ไม่มีอยู่ (${d.name} ${e.port})`);
      const key = `${e.deviceId}|${e.port}`;
      if (used.has(key)) errs.push(`พอร์ต ${e.port} ของ ${d.name} ถูกใช้กับหลายสาย`);
      used.add(key);
    }
    if (l.a.deviceId === l.b.deviceId) errs.push(`สาย ${l.id} เชื่อมอุปกรณ์เข้ากับตัวเอง`);
  }
  return errs;
}

export type ParseResult = { ok: true; lab: Lab } | { ok: false; error: string };

export function validateLab(data: unknown): ParseResult {
  const r = labSchema.safeParse(data);
  if (!r.success) {
    const issue = r.error.issues[0];
    return { ok: false, error: `โครงสร้างไฟล์ไม่ถูกต้อง: ${issue.path.join('.') || '(root)'} — ${issue.message}` };
  }
  const lab = r.data as Lab;
  const errs = crossCheck(lab);
  if (errs.length) return { ok: false, error: `ข้อมูล Lab ไม่สอดคล้องกัน: ${errs.slice(0, 3).join('; ')}${errs.length > 3 ? ` (+${errs.length - 3})` : ''}` };
  return { ok: true, lab };
}

export function serializeExport(lab: Lab): string {
  return JSON.stringify({ app: APP_ID, schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), lab }, null, 2);
}

export function parseImport(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'ไฟล์ไม่ใช่ JSON ที่ถูกต้อง' };
  }
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'ไฟล์ไม่ใช่ Lab ของ Network Lab Studio' };
  const o = raw as Record<string, unknown>;
  if (o.app !== APP_ID) return { ok: false, error: 'ไฟล์ไม่ใช่ Lab ของ Network Lab Studio (ไม่พบ app id)' };
  if (o.schemaVersion !== SCHEMA_VERSION) {
    return { ok: false, error: `schema version ${String(o.schemaVersion)} ไม่รองรับ (รองรับเฉพาะ version ${SCHEMA_VERSION})` };
  }
  return validateLab(o.lab);
}

// ───────── local storage ─────────

export interface Stored {
  lab: Lab;
  /** content signature at the time of the last export / new / sample load */
  savedSig: string | null;
}

export function loadStored(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): Stored | null {
  try {
    const t = storage?.getItem(STORAGE_KEY);
    if (!t) return null;
    const o = JSON.parse(t);
    const r = validateLab(o.lab);
    if (!r.ok) return null;
    return { lab: r.lab, savedSig: typeof o.savedSig === 'string' ? o.savedSig : null };
  } catch {
    return null;
  }
}

export function saveStored(stored: Stored, storage: Pick<Storage, 'setItem'> | undefined = safeStorage()): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    /* storage full / blocked — ignore */
  }
}

function safeStorage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}


// ───────── workspace: many labs kept in this browser (File Manager) ─────────

export const WORKSPACE_KEY = 'nls.workspace.v2';

export interface LabEntry {
  id: string;
  name: string;
  updatedAt: number;
  /** content signature at the last export / new / sample load */
  savedSig: string | null;
  lab: Lab;
}

export interface Workspace {
  activeId: string;
  entries: LabEntry[];
}

export function newLabId(): string {
  return `lab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Loads the workspace; migrates the single-lab storage of v1 on first run. Invalid labs are skipped. */
export function loadWorkspace(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): Workspace | null {
  try {
    const t = storage?.getItem(WORKSPACE_KEY);
    if (t) {
      const o = JSON.parse(t);
      const entries: LabEntry[] = [];
      for (const e of Array.isArray(o.entries) ? o.entries : []) {
        const r = validateLab(e?.lab);
        if (!r.ok || typeof e.id !== 'string') continue;
        entries.push({
          id: e.id,
          name: r.lab.name,
          updatedAt: typeof e.updatedAt === 'number' ? e.updatedAt : Date.now(),
          savedSig: typeof e.savedSig === 'string' ? e.savedSig : null,
          lab: r.lab,
        });
      }
      if (entries.length) {
        const activeId = entries.some((e) => e.id === o.activeId) ? o.activeId : entries[0].id;
        return { activeId, entries };
      }
    }
  } catch {
    /* fall through to legacy */
  }
  const legacy = loadStored(storage);
  if (!legacy) return null;
  const id = newLabId();
  return { activeId: id, entries: [{ id, name: legacy.lab.name, updatedAt: Date.now(), savedSig: legacy.savedSig, lab: legacy.lab }] };
}

export function saveWorkspace(ws: Workspace, storage: Pick<Storage, 'setItem'> | undefined = safeStorage()): void {
  try {
    storage?.setItem(WORKSPACE_KEY, JSON.stringify(ws));
  } catch {
    /* storage full / blocked — ignore */
  }
}
