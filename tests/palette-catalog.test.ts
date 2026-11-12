import { afterEach, describe, expect, it } from 'vitest';
import { PALETTE_GROUPS, PROFILES } from '../src/core/profiles';
import { setLangForTest } from '../src/i18n';
import { CATEGORY_OF, CATEGORY_ORDER, categoryLabel, filterPalette, normaliseQuery, paletteEntries } from '../src/ui/paletteCatalog';

const kinds = (q: string, c: Parameters<typeof filterPalette>[2] = 'all') => filterPalette(paletteEntries(), q, c).map((e) => e.kind);

afterEach(() => setLangForTest('th'));

describe('paletteEntries: built from the existing catalog, nothing invented or lost', () => {
  it('lists every PALETTE_GROUPS device exactly once and no other kind', () => {
    const catalog = PALETTE_GROUPS.flatMap((g) => g.items.map((i) => i.kind)).sort();
    expect(paletteEntries().map((e) => e.kind).sort()).toEqual(catalog);
    expect(Object.keys(CATEGORY_OF).sort()).toEqual(Object.keys(PROFILES).sort());
  });

  it('takes name / model / note from the catalog unchanged', () => {
    for (const e of paletteEntries()) {
      expect(e.label).toBe(PROFILES[e.kind].label);
      expect(e.model).toBe(PROFILES[e.kind].model);
      expect(e.note).toBe(PALETTE_GROUPS.flatMap((g) => g.items).find((i) => i.kind === e.kind)!.note);
    }
  });

  it('groups routers, switches, end devices, other — in that order, catalog order inside a group', () => {
    expect(paletteEntries().map((e) => `${e.category}:${e.kind}`)).toEqual([
      'routers:cisco-router',
      'routers:isp-router',
      'switches:cisco-switch',
      'switches:aruba-switch',
      'switches:l3-switch',
      'end:pc',
      'end:laptop',
      'end:printer',
      'end:ip-camera',
      'end:ip-phone',
      'end:server',
      'end:nvr',
      'end:nas',
      'wan:internet-cloud',
      'infrastructure:patch-panel',
      'infrastructure:rack',
      'infrastructure:ups',
      'other:wireless-ap',
      'other:firewall',
    ]);
    expect(CATEGORY_ORDER).toEqual(['routers', 'switches', 'end', 'wan', 'infrastructure', 'other']);
  });

  it('does not change the catalog objects', () => {
    const before = JSON.stringify(PALETTE_GROUPS);
    filterPalette(paletteEntries(), 'cisco', 'routers');
    expect(JSON.stringify(PALETTE_GROUPS)).toBe(before);
  });
});

describe('filterPalette', () => {
  it('empty / blank query shows everything', () => {
    expect(kinds('')).toHaveLength(19);
    expect(kinds('   ')).toHaveLength(19);
  });

  it('searches the device name, case-insensitive, trimmed', () => {
    expect(kinds('  AruBa  ')).toEqual(['aruba-switch', 'l3-switch']);
    expect(kinds('firewall')).toEqual(['firewall']);
  });

  it('searches the model', () => {
    expect(kinds('2960')).toEqual(['cisco-switch']);
    expect(kinds('isr 2911')).toEqual(['cisco-router']);
    expect(kinds('cx 6300')).toEqual(['l3-switch']);
  });

  it('searches the category, in Thai and English', () => {
    expect(kinds('router')).toEqual(['cisco-router', 'isp-router']);
    expect(kinds('เราเตอร์')).toEqual(['cisco-router', 'isp-router']);
    expect(kinds('end device')).toEqual(['pc', 'laptop', 'printer', 'ip-camera', 'ip-phone', 'server', 'nvr', 'nas']);
    setLangForTest('en');
    expect(kinds('switches')).toEqual(['cisco-switch', 'aruba-switch', 'l3-switch']);
  });

  it('every word must match (AND)', () => {
    expect(kinds('cisco switch')).toEqual(['cisco-switch']);
    expect(kinds('cisco nothing')).toEqual([]);
  });

  it('no match gives an empty list', () => {
    expect(kinds('juniper')).toEqual([]);
  });

  it('category filter, alone and with a query', () => {
    expect(kinds('', 'switches')).toEqual(['cisco-switch', 'aruba-switch', 'l3-switch']);
    expect(kinds('', 'other')).toEqual(['wireless-ap', 'firewall']);
    expect(kinds('cisco', 'routers')).toEqual(['cisco-router', 'isp-router']);
    expect(kinds('aruba', 'routers')).toEqual([]);
  });

  it('normaliseQuery collapses spaces and lower-cases', () => {
    expect(normaliseQuery('  Cisco   ISR ')).toBe('cisco isr');
  });

  it('category labels exist in both languages', () => {
    expect(CATEGORY_ORDER.map(categoryLabel)).toEqual(['เราเตอร์', 'สวิตช์', 'อุปกรณ์ผู้ใช้ปลายทาง', 'WAN / อินเทอร์เน็ต', 'โครงสร้างพื้นฐาน (Infrastructure)', 'อุปกรณ์อื่น (Wireless / Security)']);
    setLangForTest('en');
    expect(CATEGORY_ORDER.map(categoryLabel)).toEqual(['Routers', 'Switches', 'End devices', 'WAN / Internet', 'Infrastructure', 'Other (Wireless / Security)']);
  });
});
