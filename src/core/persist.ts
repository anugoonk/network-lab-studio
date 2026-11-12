import { z } from 'zod';
import { isValidMask, parseIp } from './ip';
import { NAME_RE } from './lab';
import { PROFILES } from './profiles';
import type { CliMode, DeviceKind, Lab } from './types';
import { tx } from '../i18n';

export const SCHEMA_VERSION = 1;
export const STORAGE_KEY = 'nls.lab.v1';
export const APP_ID = 'network-lab-studio';

const ipStr = z.string().refine((s) => parseIp(s) !== null, tx('IPv4 address ไม่ถูกต้อง'));
const maskStr = z.string().refine((s) => isValidMask(s), tx('subnet mask ไม่ถูกต้อง'));

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
  mask: z.string().refine((s) => s === '0.0.0.0' || isValidMask(s), tx('subnet mask ไม่ถูกต้อง')),
  nextHop: ipStr,
});

const deviceSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(Object.keys(PROFILES) as [DeviceKind, ...DeviceKind[]]),
  name: z.string().regex(NAME_RE, tx('ชื่ออุปกรณ์ไม่ถูกต้อง')),
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
    ctxRange: z.array(z.string()).max(64).optional(),
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
    .array(z.object({ label: z.string().max(120), url: z.string().max(500).refine(safeUrl, tx('URL ต้องขึ้นต้นด้วย http:// หรือ https://')) }))
    .max(30),
});

const checkSchema = z.discriminatedUnion('kind', [
  z.object({ id: z.string().min(1), kind: z.literal('ping'), label: z.string().max(200), from: z.string().min(1), to: ipStr, expect: z.enum(['success', 'fail']) }),
  z.object({ id: z.string().min(1), kind: z.literal('link-up'), label: z.string().max(200), deviceId: z.string().min(1), port: z.string().min(1) }),
  z.object({ id: z.string().min(1), kind: z.literal('config-line'), label: z.string().max(200), deviceId: z.string().min(1), text: z.string().min(1).max(200), expect: z.enum(['present', 'absent']) }),
  z.object({ id: z.string().min(1), kind: z.literal('trunk-vlan'), label: z.string().max(200), deviceId: z.string().min(1), port: z.string().min(1), vlan: z.number().int().min(1).max(4094), expect: z.enum(['allowed', 'blocked']) }),
  z.object({ id: z.string().min(1), kind: z.literal('port-admin'), label: z.string().max(200), deviceId: z.string().min(1), port: z.string().min(1), expect: z.enum(['up', 'down']) }),
  z.object({ id: z.string().min(1), kind: z.literal('route'), label: z.string().max(200), deviceId: z.string().min(1), net: ipStr, prefix: z.number().int().min(0).max(32) }),
  z.object({ id: z.string().min(1), kind: z.literal('no-dup-ip'), label: z.string().max(200) }),
]);

const challengeSchema = z.object({
  title: z.string().max(120),
  goal: z.string().max(4000),
  checks: z.array(checkSchema).max(50),
  hints: z.array(z.string().max(500)).max(10).optional(),
  start: z
    .object({
      devices: z.array(deviceSchema).max(200),
      links: z.array(z.object({ id: z.string().min(1), a: endpointSchema, b: endpointSchema })).max(1000),
      counters: z.record(z.string(), z.number()),
    })
    .optional(),
});

const labSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  name: z.string().max(120),
  devices: z.array(deviceSchema).max(200),
  links: z.array(z.object({ id: z.string().min(1), a: endpointSchema, b: endpointSchema })).max(1000),
  counters: z.record(z.string(), z.number()),
  guide: guideSchema.optional(),
  challenge: challengeSchema.optional(),
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
    if (ids.has(d.id)) errs.push(tx('รหัสอุปกรณ์ซ้ำ: {0}', d.id));
    ids.add(d.id);
    const p = PROFILES[d.kind];
    const names = d.ifaces.map((i) => i.name);
    // Ports must belong to this model (today's list, or one an older release had). A Lab saved from a smaller/older
    // model may have FEWER ports than today's default: those are kept exactly as saved (device ID, port IDs, config, cables).
    const allowed = new Set([...p.portNames, ...(p.legacyPortNames ?? [])]);
    // only diagram objects without network ports (rack, UPS) may have an empty port list; every other model needs its ports
    if ((names.length === 0 && p.portNames.length > 0) || names.some((n) => !allowed.has(n))) {
      errs.push(tx('{0}: รายการพอร์ตไม่ตรงกับรุ่น {1}', d.name, p.label));
    }
    if (new Set(names).size !== names.length) errs.push(tx('{0}: มีพอร์ตชื่อซ้ำ', d.name));
    if (p.isSwitch) {
      if (!d.vlans.some((v) => v.id === 1)) errs.push(tx('{0}: ต้องมี VLAN 1', d.name));
      if (new Set(d.vlans.map((v) => v.id)).size !== d.vlans.length) errs.push(tx('{0}: มี VLAN ซ้ำ', d.name));
    } else if (d.vlans.length) errs.push(tx('{0}: อุปกรณ์ชนิดนี้ไม่มี VLAN database', d.name));
    if (!modesFor(d.kind).includes(d.cli.mode) && p.hasCli) errs.push(tx('{0}: CLI mode "{1}" ใช้ไม่ได้กับอุปกรณ์ชนิดนี้', d.name, d.cli.mode));
    if (d.cli.ctxRange && (d.cli.mode !== 'config-if' || d.cli.ctxRange.some((n) => !names.includes(n)) || d.cli.ctxRange[0] !== d.cli.ctxIface))
      errs.push(tx('{0}: CLI อ้างอิงช่วงพอร์ตไม่ถูกต้อง', d.name));
    if (d.cli.ctxIface && !names.includes(d.cli.ctxIface) && !d.subifs.some((s) => `${s.parent}.${s.id}` === d.cli.ctxIface))
      errs.push(tx('{0}: CLI อ้างอิงพอร์ตที่ไม่มีอยู่', d.name));
    if (!p.isRouter && d.subifs.length) errs.push(tx('{0}: sub-interface ใช้ได้เฉพาะ router', d.name));
    if (!p.isSwitch && d.svis.length) errs.push(tx('{0}: SVI ใช้ได้เฉพาะ switch', d.name));
    if (!p.canForward && d.routes.length) errs.push(tx('{0}: อุปกรณ์ชนิดนี้ไม่รองรับ static route', d.name));
    const seen = new Set<string>();
    for (const s of d.subifs) {
      const key = `${s.parent}.${s.id}`;
      if (!names.includes(s.parent)) errs.push(tx('{0}: sub-interface {1} อ้างอิงพอร์ตแม่ที่ไม่มีอยู่', d.name, key));
      if (seen.has(key)) errs.push(tx('{0}: sub-interface ซ้ำ {1}', d.name, key));
      seen.add(key);
      if (!!s.ip !== !!s.mask) errs.push(tx('{0}/{1}: IP และ mask ต้องกำหนดคู่กัน', d.name, key));
    }
    if (new Set(d.svis.map((v) => v.vlan)).size !== d.svis.length) errs.push(tx('{0}: SVI ซ้ำ', d.name));
    for (const v of d.svis) if (!!v.ip !== !!v.mask) errs.push(tx('{0}/Vlan{1}: IP และ mask ต้องกำหนดคู่กัน', d.name, v.vlan));
    if (p.isHost && d.ifaces.some((i) => !!i.ip !== !!i.mask)) errs.push(tx('{0}: IP และ mask ต้องกำหนดคู่กัน', d.name));
    for (const i of d.ifaces) if (!!i.ip !== !!i.mask) errs.push(tx('{0}/{1}: IP และ mask ต้องกำหนดคู่กัน', d.name, i.name));
  }
  if (lab.challenge?.start) {
    const st = lab.challenge.start;
    for (const e of crossCheck({ ...lab, devices: st.devices, links: st.links, counters: st.counters, challenge: undefined, guide: undefined })) {
      errs.push(tx('จุดเริ่มต้นของโจทย์: {0}', e));
    }
  }
  const checkIds = new Set<string>();
  for (const c of lab.challenge?.checks ?? []) {
    if (checkIds.has(c.id)) errs.push(tx('รหัส check ซ้ำ: {0}', c.id));
    checkIds.add(c.id);
    if (c.kind === 'no-dup-ip') continue;
    const devId = c.kind === 'ping' ? c.from : c.deviceId;
    const cd = lab.devices.find((x) => x.id === devId);
    if (!cd) errs.push(tx('Check "{0}" อ้างอิงอุปกรณ์ที่ไม่มีอยู่', c.label));
    else if ('port' in c && !cd.ifaces.some((i) => i.name === c.port)) errs.push(tx('Check "{0}" อ้างอิงพอร์ตที่ไม่มีอยู่', c.label));
  }
  const used = new Set<string>();
  const linkIds = new Set<string>();
  for (const l of lab.links) {
    if (linkIds.has(l.id)) errs.push(tx('รหัสสายซ้ำ: {0}', l.id));
    linkIds.add(l.id);
    for (const e of [l.a, l.b]) {
      const d = lab.devices.find((x) => x.id === e.deviceId);
      if (!d) {
        errs.push(tx('สาย {0} อ้างอิงอุปกรณ์ที่ไม่มีอยู่ ({1})', l.id, e.deviceId));
        continue;
      }
      if (!d.ifaces.some((i) => i.name === e.port)) errs.push(tx('สาย {0} อ้างอิงพอร์ตที่ไม่มีอยู่ ({1} {2})', l.id, d.name, e.port));
      const key = `${e.deviceId}|${e.port}`;
      if (used.has(key)) errs.push(tx('พอร์ต {0} ของ {1} ถูกใช้กับหลายสาย', e.port, d.name));
      used.add(key);
    }
    if (l.a.deviceId === l.b.deviceId) errs.push(tx('สาย {0} เชื่อมอุปกรณ์เข้ากับตัวเอง', l.id));
  }
  return errs;
}

export type ParseResult = { ok: true; lab: Lab } | { ok: false; error: string };

export function validateLab(data: unknown): ParseResult {
  const r = labSchema.safeParse(data);
  if (!r.success) {
    const issue = r.error.issues[0];
    return { ok: false, error: tx('โครงสร้างไฟล์ไม่ถูกต้อง: {0} — {1}', issue.path.join('.') || '(root)', issue.message) };
  }
  const lab = r.data as Lab;
  const errs = crossCheck(lab);
  if (errs.length) return { ok: false, error: tx('ข้อมูล Lab ไม่สอดคล้องกัน: {0}{1}', errs.slice(0, 3).join('; '), errs.length > 3 ? ` (+${errs.length - 3})` : '') };
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
    return { ok: false, error: tx('ไฟล์ไม่ใช่ JSON ที่ถูกต้อง') };
  }
  if (typeof raw !== 'object' || raw === null) return { ok: false, error: tx('ไฟล์ไม่ใช่ Lab ของ Network Lab Studio') };
  const o = raw as Record<string, unknown>;
  if (o.app !== APP_ID) return { ok: false, error: tx('ไฟล์ไม่ใช่ Lab ของ Network Lab Studio (ไม่พบ app id)') };
  if (o.schemaVersion !== SCHEMA_VERSION) {
    return { ok: false, error: tx('schema version {0} ไม่รองรับ (รองรับเฉพาะ version {1})', String(o.schemaVersion), SCHEMA_VERSION) };
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
/** A saved Lab the app could not open. The original data is kept so nothing is lost silently. */
export interface RejectedEntry {
  id: string;
  name: string;
  error: string;
  /** the saved entry exactly as found in storage */
  entry: unknown;
  at: number;
}

export const REJECTED_KEY = 'nls.workspace.rejected.v1';
export const REJECTED_LIMIT = 20;

/**
 * Loads the saved workspace. Entries that fail validation are NOT dropped silently: they are returned in `rejected`
 * so the app can keep a copy (REJECTED_KEY) and tell the user before the autosave rewrites the workspace.
 */
export function loadWorkspaceDetailed(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): { ws: Workspace | null; rejected: RejectedEntry[] } {
  const rejected: RejectedEntry[] = [];
  const now = Date.now();
  try {
    const t = storage?.getItem(WORKSPACE_KEY);
    if (t) {
      let o: { entries?: unknown; activeId?: unknown } | null = null;
      try {
        o = JSON.parse(t);
      } catch {
        rejected.push({ id: 'raw-workspace', name: tx('(ข้อมูล workspace ทั้งก้อน)'), error: tx('อ่านเป็น JSON ไม่ได้'), entry: t, at: now });
      }
      const entries: LabEntry[] = [];
      for (const e of Array.isArray(o?.entries) ? (o!.entries as Record<string, unknown>[]) : []) {
        const r = validateLab(e?.lab);
        if (!r.ok || typeof e?.id !== 'string') {
          const labName = (e?.lab as { name?: unknown } | undefined)?.name;
          rejected.push({
            id: typeof e?.id === 'string' ? e.id : newLabId(),
            name: typeof labName === 'string' ? labName : typeof e?.name === 'string' ? e.name : tx('(ไม่มีชื่อ)'),
            error: r.ok ? tx('ไม่มีรหัส Lab') : r.error,
            entry: e,
            at: now,
          });
          continue;
        }
        entries.push({
          id: e.id,
          name: r.lab.name,
          updatedAt: typeof e.updatedAt === 'number' ? e.updatedAt : Date.now(),
          savedSig: typeof e.savedSig === 'string' ? e.savedSig : null,
          lab: r.lab,
        });
      }
      if (entries.length) {
        const activeId = entries.some((e) => e.id === o?.activeId) ? (o!.activeId as string) : entries[0].id;
        return { ws: { activeId, entries }, rejected };
      }
    }
  } catch {
    /* fall through to legacy */
  }
  const legacy = loadStored(storage);
  if (legacy) {
    const id = newLabId();
    return { ws: { activeId: id, entries: [{ id, name: legacy.lab.name, updatedAt: Date.now(), savedSig: legacy.savedSig, lab: legacy.lab }] }, rejected };
  }
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (raw) {
      let error = tx('อ่านเป็น JSON ไม่ได้');
      try {
        const v = validateLab(JSON.parse(raw)?.lab);
        error = v.ok ? tx('ข้อมูลไม่ครบ') : v.error;
      } catch {
        /* keep the generic message */
      }
      rejected.push({ id: 'legacy-single-lab', name: tx('Lab รุ่นเก่า (บันทึกแบบ Lab เดียว)'), error, entry: raw, at: now });
    }
  } catch {
    /* storage unavailable */
  }
  return { ws: null, rejected };
}

export function loadWorkspace(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): Workspace | null {
  return loadWorkspaceDetailed(storage).ws;
}

/** copies kept from earlier sessions (oldest first) */
export function loadRejected(storage: Pick<Storage, 'getItem'> | undefined = safeStorage()): RejectedEntry[] {
  try {
    const o = JSON.parse(storage?.getItem(REJECTED_KEY) ?? 'null');
    return Array.isArray(o?.items) ? (o.items as RejectedEntry[]) : [];
  } catch {
    return [];
  }
}

/** Adds `items` to the kept copies (no duplicates, newest REJECTED_LIMIT kept). Returns false when the browser refused. */
export function saveRejected(items: RejectedEntry[], storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = safeStorage()): boolean {
  if (!storage) return false;
  try {
    const have = loadRejected(storage);
    const seen = new Set(have.map((x) => `${x.id}|${JSON.stringify(x.entry)}`));
    const merged = [...have, ...items.filter((x) => !seen.has(`${x.id}|${JSON.stringify(x.entry)}`))].slice(-REJECTED_LIMIT);
    storage.setItem(REJECTED_KEY, JSON.stringify({ version: 1, items: merged }));
    return true;
  } catch {
    return false;
  }
}

/** One downloadable file with every rejected Lab; each `file` is a normal export envelope that can be repaired and imported. */
export function rejectedBundle(items: RejectedEntry[]): string {
  return JSON.stringify(
    {
      app: APP_ID,
      kind: 'recovered-labs',
      note: 'Labs the app could not open. Each "file" is a normal export envelope: save it as its own .json and import it once the problem is fixed.',
      items: items.map((i) => {
        const lab = (i.entry as { lab?: unknown } | null)?.lab;
        return { name: i.name, error: i.error, file: lab ? { app: APP_ID, schemaVersion: SCHEMA_VERSION, lab } : null, raw: lab ? undefined : i.entry };
      }),
    },
    null,
    1,
  );
}

/** returns false when the browser refused to store it (blocked / full / no storage) */
export function saveWorkspace(ws: Workspace, storage: Pick<Storage, 'setItem'> | undefined = safeStorage()): boolean {
  if (!storage) return false;
  try {
    storage.setItem(WORKSPACE_KEY, JSON.stringify(ws));
    return true;
  } catch {
    return false;
  }
}
