/**
 * Device Palette view model (UI-02): categories and search over the existing device catalog.
 *
 * The catalog stays in core/profiles.ts: PALETTE_GROUPS (order + short notes) and PROFILES (names, models, category and
 * simulation level). This module only reads it, groups and filters; it never changes the catalog.
 */
import { PALETTE_GROUPS, PROFILES, type DeviceCategory, type SimLevel } from '../core/profiles';
import type { DeviceKind } from '../core/types';
import { tx } from '../i18n';

export type PaletteCategory = DeviceCategory;
export const CATEGORY_ORDER: readonly PaletteCategory[] = ['routers', 'switches', 'end', 'wan', 'infrastructure', 'other'];

/** category of every device kind, read from PROFILES (kept as an export for existing callers) */
export const CATEGORY_OF = Object.fromEntries(Object.values(PROFILES).map((p) => [p.kind, p.category])) as Record<DeviceKind, PaletteCategory>;

/** badge text for a simulation level, in the current language */
export function simLevelLabel(l: SimLevel): string {
  return l === 'full' ? tx('จำลองได้') : l === 'partial' ? tx('จำลองได้บางส่วน') : tx('แผนผังเท่านั้น');
}
/** one-line explanation of a simulation level (tooltip) */
export function simLevelHint(l: SimLevel): string {
  return l === 'full'
    ? tx('ping, traceroute และ CLI/terminal ของอุปกรณ์นี้จำลองในโปรแกรม (ไม่ใช่การจำลอง OS ของ vendor ทั้งหมด)')
    : l === 'partial'
      ? tx('จำลองได้บางส่วน — ดูรายละเอียดในแผงรายละเอียดของอุปกรณ์')
      : tx('ใช้วาดและต่อสายเท่านั้น — engine ไม่ส่งข้อมูลผ่านและไม่มี CLI');
}
/** full and partial devices take part in the simulation; diagram-only ones do not */
export const isSimulationCapable = (l: SimLevel): boolean => l !== 'diagram';

/** category title in the current language; the English words are also searchable in Thai mode */
export function categoryLabel(c: PaletteCategory): string {
  switch (c) {
    case 'routers':
      return tx('เราเตอร์');
    case 'switches':
      return tx('สวิตช์');
    case 'end':
      return tx('อุปกรณ์ผู้ใช้ปลายทาง');
    case 'wan':
      return tx('WAN / อินเทอร์เน็ต');
    case 'infrastructure':
      return tx('โครงสร้างพื้นฐาน (Infrastructure)');
    case 'other':
      return tx('อุปกรณ์อื่น (Wireless / Security)');
  }
}
const CATEGORY_EN: Record<PaletteCategory, string> = {
  routers: 'routers router',
  switches: 'switches switch',
  end: 'end devices end device host',
  wan: 'wan internet cloud',
  infrastructure: 'infrastructure',
  other: 'other wireless security',
};

export interface PaletteEntry {
  kind: DeviceKind;
  category: PaletteCategory;
  simLevel: SimLevel; // PROFILES[kind].simLevel
  label: string; // PROFILES[kind].label
  model: string; // PROFILES[kind].model
  note: string; // PALETTE_GROUPS item note (ports / role)
}

/** every palette device, in category order and, inside a category, in the catalog's order */
export function paletteEntries(): PaletteEntry[] {
  const items = PALETTE_GROUPS.flatMap((g) => g.items);
  return CATEGORY_ORDER.flatMap((c) =>
    items
      .filter((i) => PROFILES[i.kind].category === c)
      .map((i) => ({ kind: i.kind, category: c, simLevel: PROFILES[i.kind].simLevel, label: PROFILES[i.kind].label, model: PROFILES[i.kind].model, note: i.note })),
  );
}

/** lower-case, trimmed, whitespace collapsed */
export function normaliseQuery(q: string): string {
  return q.trim().toLowerCase().replace(/\s+/g, ' ');
}

function haystack(e: PaletteEntry): string {
  return [e.label, e.model, e.note, e.kind, e.kind.replace(/-/g, ' '), PROFILES[e.kind].vendor, categoryLabel(e.category), CATEGORY_EN[e.category]].join(' ').toLowerCase();
}

/**
 * Entries matching the category ('all' = every category), the query (case-insensitive; every word of the query must
 * appear in the device name, model, note, kind, vendor or category) and, with `simOnly`, only simulation-capable devices
 * (full + partial). Returns a new array; the input is not changed.
 */
export function filterPalette(entries: readonly PaletteEntry[], query: string, category: PaletteCategory | 'all', simOnly = false): PaletteEntry[] {
  const words = normaliseQuery(query).split(' ').filter(Boolean);
  return entries.filter(
    (e) => (category === 'all' || e.category === category) && (!simOnly || isSimulationCapable(e.simLevel)) && words.every((w) => haystack(e).includes(w)),
  );
}
