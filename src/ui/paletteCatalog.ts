/**
 * Device Palette view model (UI-02): categories and search over the existing device catalog.
 *
 * The catalog itself stays in core/profiles.ts (PALETTE_GROUPS for order + short notes, PROFILES for names/models).
 * This module only assigns each existing device kind to a UI category and filters; it never changes the catalog.
 */
import { PALETTE_GROUPS, PROFILES } from '../core/profiles';
import type { DeviceKind } from '../core/types';
import { tx } from '../i18n';

export type PaletteCategory = 'routers' | 'switches' | 'end' | 'other';
export const CATEGORY_ORDER: readonly PaletteCategory[] = ['routers', 'switches', 'end', 'other'];

/** UI category of every device kind (a Record, so TypeScript fails the build if a new kind is not categorised) */
export const CATEGORY_OF: Record<DeviceKind, PaletteCategory> = {
  'cisco-router': 'routers',
  'isp-router': 'routers',
  'cisco-switch': 'switches',
  'aruba-switch': 'switches',
  'l3-switch': 'switches',
  pc: 'end',
  laptop: 'end',
  server: 'end',
  'wireless-ap': 'other',
  firewall: 'other',
};

/** category title in the current language; the English words are also searchable in Thai mode */
export function categoryLabel(c: PaletteCategory): string {
  switch (c) {
    case 'routers':
      return tx('เราเตอร์');
    case 'switches':
      return tx('สวิตช์');
    case 'end':
      return tx('อุปกรณ์ผู้ใช้ปลายทาง');
    case 'other':
      return tx('อุปกรณ์อื่น (Wireless / Security)');
  }
}
const CATEGORY_EN: Record<PaletteCategory, string> = {
  routers: 'routers router',
  switches: 'switches switch',
  end: 'end devices end device host',
  other: 'other wireless security',
};

export interface PaletteEntry {
  kind: DeviceKind;
  category: PaletteCategory;
  label: string; // PROFILES[kind].label
  model: string; // PROFILES[kind].model
  note: string; // PALETTE_GROUPS item note (ports / role)
}

/** every palette device, in category order and, inside a category, in the catalog's order */
export function paletteEntries(): PaletteEntry[] {
  const items = PALETTE_GROUPS.flatMap((g) => g.items);
  return CATEGORY_ORDER.flatMap((c) =>
    items
      .filter((i) => CATEGORY_OF[i.kind] === c)
      .map((i) => ({ kind: i.kind, category: c, label: PROFILES[i.kind].label, model: PROFILES[i.kind].model, note: i.note })),
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
 * Entries matching the category ('all' = every category) and the query (case-insensitive; every word of the query must
 * appear in the device name, model, note, kind, vendor or category). Returns a new array; the input is not changed.
 */
export function filterPalette(entries: readonly PaletteEntry[], query: string, category: PaletteCategory | 'all'): PaletteEntry[] {
  const words = normaliseQuery(query).split(' ').filter(Boolean);
  return entries.filter((e) => (category === 'all' || e.category === category) && words.every((w) => haystack(e).includes(w)));
}
