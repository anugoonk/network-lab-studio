/**
 * Two interface languages: Thai (default) and English.
 *
 * The Thai text in the source is the translation KEY: `tx('ข้อความไทย')` returns it unchanged in Thai mode and the entry of
 * `EN` (src/i18n/en.ts) in English mode. `{0}`, `{1}` … in a key are filled from the extra arguments, so word order can differ
 * between the languages. A key missing from `EN` falls back to the Thai text (a unit test keeps the dictionary complete).
 *
 * The language is read once, when the page loads, and switching it reloads the page — so `tx()` may be used anywhere,
 * including at module level, without any component having to subscribe to the language.
 *
 * Text that is part of a Lab (guide, challenge, hints, names of the sample labs) is written when the Lab is created, in the
 * language active at that moment, and is stored as data: switching language does not rewrite an existing Lab.
 */
import { EN } from './i18n/en';

export type Lang = 'th' | 'en';
export const LANG_KEY = 'nls.lang';

function readStored(): Lang | null {
  try {
    const v = globalThis.localStorage?.getItem(LANG_KEY);
    return v === 'th' || v === 'en' ? v : null;
  } catch {
    return null;
  }
}

let current: Lang = readStored() ?? 'th';
if (typeof document !== 'undefined') document.documentElement.lang = current;

export const getLang = (): Lang => current;

/** test helper: change the language without reloading */
export function setLangForTest(l: Lang): void {
  current = l;
}

/** remember the choice and reload so that every module re-evaluates its texts in the new language */
export function switchLang(l: Lang): void {
  try {
    globalThis.localStorage?.setItem(LANG_KEY, l);
  } catch {
    /* storage blocked: the language will not survive the reload */
  }
  if (typeof location !== 'undefined') location.reload();
  else current = l;
}

export function tx(key: string, ...args: unknown[]): string {
  const text = current === 'en' ? (EN[key] ?? key) : key;
  return args.length === 0 ? text : text.replace(/\{(\d+)\}/g, (m, i) => (Number(i) < args.length ? String(args[Number(i)]) : m));
}
