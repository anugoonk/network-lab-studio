// UI-05 (SR-WS-15 responsive tiers, SR-WS-16 accessibility): pure behaviour + the design-token contrast gate.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RECOMMENDED_MIN_WIDTH, TIER_MIN, tierForWidth, usesDrawers, usesToolbarOverflow } from '../src/ui/responsive';

const CSS = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

describe('tierForWidth — plan §5 boundaries', () => {
  it.each([
    [1920, 'wide'], [1500, 'wide'], [1366, 'wide'], [1280, 'wide'],
    [1279, 'medium'], [1100, 'medium'], [1024, 'medium'],
    [1023, 'narrow'], [900, 'narrow'], [768, 'narrow'],
    [767, 'compact'], [390, 'compact'], [320, 'compact'], [0, 'compact'],
  ] as const)('%ipx → %s', (w, tier) => expect(tierForWidth(w)).toBe(tier));

  it('an unknown or non-finite width is the full desktop layout, never a broken one', () => {
    for (const w of [NaN, Infinity, -Infinity, undefined as unknown as number, '900' as unknown as number]) expect(tierForWidth(w)).toBe('wide');
  });

  it('the recommended minimum width of the small-screen note is the medium boundary', () => {
    expect(RECOMMENDED_MIN_WIDTH).toBe(1024);
    expect(tierForWidth(RECOMMENDED_MIN_WIDTH)).toBe('medium');
  });
});

describe('what each tier changes', () => {
  it('drawers from medium down; the toolbar "⋯" menu only from narrow down', () => {
    expect(['wide', 'medium', 'narrow', 'compact'].map((t) => usesDrawers(t as never))).toEqual([false, true, true, true]);
    expect(['wide', 'medium', 'narrow', 'compact'].map((t) => usesToolbarOverflow(t as never))).toEqual([false, false, true, true]);
  });
});

describe('CSS and TypeScript use the same boundaries', () => {
  const widths = new Set([...CSS.matchAll(/@media \(max-width:\s*(\d+)px\)/g)].map((m) => Number(m[1])));
  it('has an @media rule just below each tier boundary (max-width = boundary − 1)', () => {
    for (const min of Object.values(TIER_MIN)) expect(widths.has(min - 1), `max-width: ${min - 1}px`).toBe(true);
  });
  it('the three UI-05 rules sit in the UI-05 block', () => {
    const block = CSS.slice(CSS.indexOf('UI-05 (SR-WS-15)'));
    for (const min of [TIER_MIN.wide, TIER_MIN.medium, TIER_MIN.narrow]) expect(block).toContain(`@media (max-width: ${min - 1}px)`);
  });
});

// ── contrast (SR-WS-16, plan §3: text ≥ 4.5:1, icons and meaningful borders ≥ 3:1) ──
function tokens(): Record<string, string> {
  const root = [...CSS.matchAll(/:root\s*\{([^}]*)\}/g)].map((m) => m[1]).join('\n');
  const out: Record<string, string> = {};
  for (const m of root.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].replace(/\/\*[\s\S]*?\*\//g, '').trim();
  return out;
}
const T = tokens();
function resolve(v: string, depth = 0): string {
  const m = /^var\(--([\w-]+)\)$/.exec(v);
  return m && depth < 6 && T[m[1]] !== undefined ? resolve(T[m[1]], depth + 1) : v;
}
function rgb(v: string): [number, number, number] {
  const r = resolve(v);
  const m = /^#([0-9a-f]{6})$/i.exec(r);
  if (!m) throw new Error(`not a #rrggbb colour: ${v} → ${r}`);
  const n = parseInt(m[1], 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}
const lin = (c: number) => { const x = c / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]: [number, number, number]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
export function contrast(a: string, b: string): number {
  const [hi, lo] = [lum(rgb(a)), lum(rgb(b))].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('contrast helper', () => {
  it('matches the known extremes', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#777777')).toBeCloseTo(1, 5);
    expect(contrast('#767676', '#ffffff')).toBeGreaterThan(4.5); // the classic AA grey
    expect(contrast('#777777', '#ffffff')).toBeLessThan(4.5);
  });
});

describe('design tokens meet the plan §3 contrast rules', () => {
  const TEXT: [string, string][] = [
    ['text', 'surface'], ['text', 'bg'], ['text', 'surface-2'], ['text', 'surface-3'],
    ['muted', 'surface'], ['muted', 'bg'], ['muted', 'surface-2'], ['muted', 'surface-3'],
    ['nav-text', 'nav'], ['nav-muted', 'nav'],
    ['teal', 'surface'], ['teal-dark', 'primary-soft'],
    ['bad', 'surface'], ['ok', 'surface'], ['warn', 'surface'], ['accent-text', 'surface'],
  ];
  it.each(TEXT)('text token --%s on --%s is at least 4.5:1', (fg, bg) => expect(contrast(`var(--${fg})`, `var(--${bg})`)).toBeGreaterThanOrEqual(4.5));

  it('status text on its tinted pill / list background is at least 4.5:1', () => {
    expect(contrast('var(--ok)', '#dff3e7')).toBeGreaterThanOrEqual(4.5); // .pill.up
    expect(contrast('var(--ok)', '#e6f4ea')).toBeGreaterThanOrEqual(4.5); // .check-list li.pass
    expect(contrast('var(--warn)', '#fff1d6')).toBeGreaterThanOrEqual(4.5); // .pill.admin-down
  });

  it('white text on the filled primary / success buttons is at least 4.5:1', () => {
    expect(contrast('#ffffff', 'var(--teal)')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#ffffff', 'var(--teal-dark)')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#ffffff', 'var(--ok)')).toBeGreaterThanOrEqual(4.5);
  });

  it('the focus ring is at least 3:1 on every surface it appears on', () => {
    for (const bg of ['surface', 'bg', 'surface-2']) expect(contrast('var(--focus)', `var(--${bg})`), bg).toBeGreaterThanOrEqual(3);
    expect(contrast('var(--focus-on-dark)', 'var(--nav)')).toBeGreaterThanOrEqual(3);
  });

  it('the orange accent stays a fill / icon colour: it clears 3:1 on white and on the dark navigation but is NOT used as body text', () => {
    expect(contrast('var(--accent)', 'var(--surface)')).toBeGreaterThanOrEqual(3);
    expect(contrast('var(--accent)', 'var(--nav)')).toBeGreaterThanOrEqual(3);
    expect(contrast('var(--accent)', 'var(--surface)')).toBeLessThan(4.5); // documents why --accent-text exists
    // the only rule that sets the accent as text colour is .dirty, which is drawn on the dark navigation (where it clears 3:1 above)
    const asText = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter((m) => /(^|[;\s])color:\s*var\(--accent\)/.test(m[2]))
      .map((m) => m[1].trim());
    expect(asText).toEqual(['.dirty']);
  });

  it('a lowered token would be caught (negative control)', () => {
    expect(contrast('#8a8a8a', '#ffffff')).toBeLessThan(4.5);
  });
});
