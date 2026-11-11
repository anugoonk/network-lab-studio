import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { EN } from '../src/i18n/en';
import { getLang, setLangForTest, tx } from '../src/i18n';

const THAI = /[฀-๿]/;

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === 'i18n' ? [] : sourceFiles(p);
    return /\.(ts|tsx)$/.test(e.name) && e.name !== 'i18n.ts' ? [p] : []; // i18n.ts only has tx() in its own doc comment
  });
}

/** every literal key passed to tx('…') / tx("…") in the source */
function usedKeys(): Map<string, string> {
  const found = new Map<string, string>();
  const re = /\btx\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;
  for (const f of sourceFiles('src')) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(re)) {
      const raw = m[1] ?? m[2];
      const key = raw.replace(/\\(.)/g, (_, c: string) => (c === 'n' ? '\n' : c === 'r' ? '\r' : c));
      if (!found.has(key)) found.set(key, f);
    }
  }
  return found;
}

const placeholders = (s: string) => [...s.matchAll(/\{(\d+)\}/g)].map((m) => m[1]).sort().join(',');

afterEach(() => setLangForTest('th'));

describe('translation function', () => {
  it('Thai mode returns the Thai text, filling {n} from the arguments', () => {
    expect(getLang()).toBe('th');
    expect(tx('ลบ')).toBe('ลบ');
    expect(tx('ข้อ {0}', 3)).toBe('ข้อ 3');
    expect(tx('{0} ของ {1}', 'a', 'b')).toBe('a ของ b');
  });

  it('English mode returns the dictionary text, and falls back to the Thai text for an unknown key', () => {
    setLangForTest('en');
    expect(tx('ลบ')).toBe('Delete');
    expect(tx('ข้อความที่ยังไม่มีคำแปล {0}')).toBe('ข้อความที่ยังไม่มีคำแปล {0}'); // not a key: unchanged, no arguments given
    expect(tx('ข้อที่ไม่มีคำแปล {0}', 7)).toBe('ข้อที่ไม่มีคำแปล 7');
    expect(tx('{0} ของ {1}', 'a', 'b')).toBe('a of b');
    expect(tx('Reply from {0}', 'x')).toBe('Reply from x'); // non-Thai text passes through
  });

  it('leaves an unfilled placeholder alone instead of printing "undefined"', () => {
    setLangForTest('en');
    expect(tx('{0} ของ {1}', 'only-one')).toBe('only-one of {1}');
  });
});

describe('English dictionary', () => {
  const keys = usedKeys();

  it('finds the keys used in the source (sanity check of this test)', () => {
    expect(keys.size).toBeGreaterThan(700);
  });

  it('has an English text for every Thai text the source passes to tx()', () => {
    const missing = [...keys].filter(([k]) => THAI.test(k) && !(k in EN)).map(([k, f]) => `${f}: ${k.slice(0, 60)}`);
    expect(missing).toEqual([]);
  });

  it('has no stale entries (every key is still used somewhere)', () => {
    const stale = Object.keys(EN).filter((k) => !keys.has(k));
    expect(stale.map((k) => k.slice(0, 60))).toEqual([]);
  });

  it('keeps the same {n} placeholders, the same edge spaces, and contains no Thai text', () => {
    const bad: string[] = [];
    for (const [k, v] of Object.entries(EN)) {
      if (placeholders(k) !== placeholders(v)) bad.push(`placeholders: ${k.slice(0, 50)}`);
      if (THAI.test(v)) bad.push(`Thai in English text: ${v.slice(0, 50)}`);
      if (/^\s/.test(k) !== /^\s/.test(v) || /\s$/.test(k) !== /\s$/.test(v)) bad.push(`edge spaces: ${JSON.stringify(k.slice(0, 40))}`);
      if (v.trim() === '') bad.push(`empty: ${k.slice(0, 50)}`);
    }
    expect(bad).toEqual([]);
  });
});
