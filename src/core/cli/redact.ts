/**
 * Credential redaction for the CLI (CERT-P0-1b.1) — the ONE place that decides which part of a typed line is a secret.
 *
 * It runs on the raw line before the command is resolved and says nothing about whether the command exists or works, so a
 * secret typed into an unsupported, malformed or foreign-vendor command is masked exactly like a supported one. It is
 * vendor independent. Principle: non-disclosure over completeness — masking too much of a history line is harmless,
 * masking too little leaks.
 *
 * Used by: executeLine (echo, history, error text), the Console (Tab / `?` transcript lines) and the persistence layer
 * (sanitizeLab on load, save, export and share), so plaintext that an older build stored is masked before it can be
 * written or exported again.
 *
 * Rules (see CERT_P0_1B_REDACTION_POLICY.md), after optional leading `do` / `no`:
 *  - ENABLE    first word abbreviates `enable`, 3+ words: everything from the 3rd word on (also typos, `enable password`).
 *  - USERNAME  first word is `user`…`username`, 3+ words: after the user name only the known non-secret options
 *              (`privilege <n>`, `nopassword`, `view|role|group <x>`) stay readable. Then a keyword (`secret`, `password`,
 *              or a short typo (edit distance <= 2) such as `secrte`) stays and everything after it is masked, the encryption type and Aruba's
 *              `plaintext` included; ANYTHING else (`sceret`, `s3cret`, `pwd`, `secret=x`, `password:x`, `secretx`) is
 *              masked from that word on, so a mistyped or glued keyword cannot expose its value.
 *  - PASSWORD  first word is `pass`…`password`, 2+ words: everything after it (line mode, `password 7 <x>`).
 *  - NET USER  `net user <name> <value…>`: from the 4th word on.
 *  - GLUED     a word `secret=x` / `password:x` (also as the first word): everything after the separator.
 *  - KEYWORD   a later word `secret` / `password` / `passphrase` / `pre-shared-key`: everything after it; `community`: only the
 *              value that follows (the rest, e.g. `RO`, stays readable). A value that starts with a quote is masked to the end.
 *              Not applied to lines that start with `description`, `show`, `ping`, … nor (secret / password words only) to
 *              `snmp-server location|contact …`, so ordinary text stays readable.
 *  Invisible characters (zero-width space / joiner, BOM, word joiner, soft hyphen) separate words for DETECTION only; the
 *  shown line keeps the original characters.
 */
import type { Device, Lab, Vendor } from '../types';

/** what is shown instead of a secret; also refused as a credential value so a recalled history line cannot set one */
export const MASK = '********';
/** shown when the classifier itself fails — never the raw line */
const FAIL_CLOSED = '<redacted line>';

export interface Redaction {
  /** the line as it may be shown and kept (history, transcript, errors) */
  shown: string;
  /** the exact substrings that were masked, for scrubbing error text */
  secrets: string[];
  /** `shown` differs from the raw line */
  masked: boolean;
}

interface Tok {
  text: string;
  start: number;
  end: number;
}
interface Span {
  start: number;
  end: number;
}

const lc = (t: Tok | undefined) => (t ? t.text.toLowerCase() : '');
const QUOTE = /^["'`‘’“”]/;
/** commands whose later words are free text, never a credential */
const FREE_TEXT_FIRST = new Set(['description', 'show', 'ping', 'traceroute', 'tracert', 'echo', 'banner', 'alias', 'name', 'help']);
const SECRET_WORDS = new Set(['secret', 'password', 'passphrase', 'pre-shared-key']);
/** second words after which a line is free text (`snmp-server location …`) */
const FREE_TEXT_SECOND = new Set(['location', 'contact', 'description', 'remark', 'comment']);
/** a keyword glued to its value by a separator: `secret=x`, `password:x` */
const GLUED = /^(secret|password|passphrase|pre-shared-key)[=:]/i;
const DIGITS = /^\d+$/;
const KEYWORDS = new Set(['secret', 'password', 'passwd']);
/** a short, letters-only misspelling of secret / password (`secrte`, `seecret`): treated as the keyword, not as a glued value */
function typoKeyword(w: string): boolean {
  return /^[a-z]{4,8}$/.test(w) && !w.startsWith('secret') && !w.startsWith('passw') && (editDistance(w, 'secret') <= 2 || editDistance(w, 'password') <= 2);
}
/** Levenshtein distance of two short words */
function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

function tokens(line: string): Tok[] {
  const out: Tok[] = [];
  const re = /[^\s\u200b-\u200d\u2060\ufeff\u00ad]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) out.push({ text: m[0], start: m.index, end: m.index + m[0].length });
  return out;
}

function findSpans(t: Tok[]): Span[] {
  let i = 0;
  while (i < t.length && (lc(t[i]) === 'do' || lc(t[i]) === 'no')) i++;
  const first = lc(t[i]);
  if (!first) return [];
  const n = t.length - i;
  const last = t[t.length - 1].end;
  const toEnd = (k: number): Span => ({ start: t[k].start, end: last });
  const spans: Span[] = [];

  if ('enable'.startsWith(first) && n >= 3) spans.push(toEnd(i + 2));

  if (first.length >= 4 && 'username'.startsWith(first) && n >= 3) {
    let k = i + 2;
    for (;;) {
      const w = lc(t[k]);
      if (w === 'nopassword') k++;
      else if (w === 'privilege' && k + 1 < t.length && DIGITS.test(t[k + 1].text)) k += 2;
      else if ((w === 'view' || w === 'role' || w === 'group') && k + 1 < t.length) k += 2;
      else break;
    }
    if (k < t.length) {
      const w = lc(t[k]);
      if (KEYWORDS.has(w) || typoKeyword(w)) {
        if (k + 1 < t.length) spans.push(toEnd(k + 1));
        else if (!KEYWORDS.has(w)) spans.push(toEnd(k));
      } else spans.push(toEnd(k)); // unrecognised: fail closed from this word on
    }
  }

  if (first.length >= 4 && 'password'.startsWith(first) && n >= 2) spans.push(toEnd(i + 1));

  if (first === 'net' && n >= 4 && lc(t[i + 1]) === 'user') spans.push(toEnd(i + 3));

  if (!FREE_TEXT_FIRST.has(first)) {
    const freeSecond = FREE_TEXT_SECOND.has(lc(t[i + 1]));
    for (let k = i; k < t.length; k++) {
      const g = GLUED.exec(t[k].text);
      if (g) {
        spans.push({ start: t[k].start + g[0].length, end: last });
        break;
      }
    }
    for (let k = i + 1; k < t.length - 1; k++) {
      const w = lc(t[k]);
      if (freeSecond && w !== 'community') continue;
      if (w === 'community') spans.push(QUOTE.test(t[k + 1].text) ? toEnd(k + 1) : { start: t[k + 1].start, end: t[k + 1].end });
      else if (SECRET_WORDS.has(w)) {
        spans.push(toEnd(k + 1));
        break;
      }
    }
  }
  return spans;
}

function merge(spans: Span[]): Span[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const out: Span[] = [];
  for (const s of sorted) {
    const prev = out[out.length - 1];
    if (prev && s.start <= prev.end) prev.end = Math.max(prev.end, s.end);
    else out.push({ ...s });
  }
  return out;
}

/** The vendor is accepted for API symmetry; the rules are deliberately the same for every vendor and device. */
export function classifyLine(_vendor: Vendor, line: string): Redaction {
  try {
    const spans = merge(findSpans(tokens(line)));
    if (!spans.length) return { shown: line, secrets: [], masked: false };
    let shown = '';
    let at = 0;
    const secrets: string[] = [];
    for (const s of spans) {
      shown += line.slice(at, s.start) + MASK;
      secrets.push(line.slice(s.start, s.end));
      at = s.end;
    }
    shown += line.slice(at);
    return { shown, secrets, masked: shown !== line };
  } catch {
    return { shown: FAIL_CLOSED, secrets: [line.trim()].filter(Boolean), masked: true };
  }
}

/** Former API of engine.ts: the line as it may be shown and kept. */
export function redactLine(vendor: Vendor, line: string): string {
  return classifyLine(vendor, line).shown;
}

const isEdge = (ch: string | undefined) => ch === undefined || /[\s'"`]/.test(ch);

/**
 * Error / hint text without the secret: the raw line becomes the shown line, and every masked value is replaced when it
 * stands alone (whole word or quoted) — so a one-letter secret cannot damage unrelated words of the message.
 */
export function scrubText(text: string, rawLine: string, r: Redaction): string {
  if (!r.masked) return text;
  let out = rawLine ? text.split(rawLine).join(r.shown) : text;
  for (const secret of [...new Set(r.secrets)].filter(Boolean).sort((a, b) => b.length - a.length)) {
    let res = '';
    let from = 0;
    for (;;) {
      const at = out.indexOf(secret, from);
      if (at < 0) break;
      const standalone = isEdge(out[at - 1]) && isEdge(out[at + secret.length]);
      res += out.slice(from, at) + (standalone ? MASK : secret);
      from = at + secret.length;
    }
    out = res + out.slice(from);
  }
  return out;
}

/** a stored history entry, masked by the same rules (idempotent: an already masked entry is unchanged) */
export function sanitizeHistoryEntry(entry: string): string {
  return typeof entry === 'string' ? classifyLine('generic', entry).shown : entry;
}

/** `seen` makes a copy of the same logical entry (device, position, text) — a challenge start snapshot — count once */
function sanitizeDevices(devices: Device[], seen: Set<string>): { devices: Device[]; count: number } {
  let count = 0;
  let any = false;
  const out = devices.map((d) => {
    const hist = d.cli?.history;
    if (!Array.isArray(hist)) return d;
    let changed = false;
    const next = hist.map((e, idx) => {
      const s = sanitizeHistoryEntry(e);
      if (s !== e) {
        changed = true;
        any = true;
        const key = `${d.id}#${idx}\u0000${e}`;
        if (!seen.has(key)) {
          seen.add(key);
          count++;
        }
      }
      return s;
    });
    return changed ? { ...d, cli: { ...d.cli, history: next } } : d;
  });
  return { devices: any ? out : devices, count };
}

/**
 * The Lab with every recognised secret masked in the CLI history of its devices (and of a challenge's start snapshot).
 * Returns the same object when nothing changed; never touches topology, configuration or other history entries.
 */
export function sanitizeLab(lab: Lab): { lab: Lab; count: number } {
  const seen = new Set<string>();
  const main = sanitizeDevices(lab.devices, seen);
  const start = lab.challenge?.start ? sanitizeDevices(lab.challenge.start.devices, seen) : null;
  const count = main.count + (start?.count ?? 0);
  const startChanged = !!start && start.devices !== lab.challenge!.start!.devices;
  if (main.devices === lab.devices && !startChanged) return { lab, count: 0 };
  return {
    count,
    lab: {
      ...lab,
      devices: main.devices,
      ...(lab.challenge && start && startChanged ? { challenge: { ...lab.challenge, start: { ...lab.challenge.start!, devices: start.devices } } } : {}),
    },
  };
}

/** shown instead of stored / exported data that could not be sanitised safely */
export const WITHHELD = '<withheld: unreadable data that may contain credentials>';
const MAX_DEPTH = 32;
const MAX_NODES = 200_000;
const CREDENTIAL_HINT = /history|secret|passw|communit|passphrase|username|pre-shared|net\s+user|enable/i;

class Overflow extends Error {}

/**
 * Masks the command history inside DATA OF UNKNOWN SHAPE — a Lab that failed validation and is kept for recovery. Every
 * value under a key named `history` (any depth) is classified line by line whatever its type; nothing else is changed, so
 * the rest of the data stays recoverable. A string that parses as JSON is sanitised as JSON; one that does not and could
 * hold a credential is replaced by WITHHELD. Bounded (depth and node count): over the limit the whole value becomes
 * WITHHELD — never an unbounded walk, never the raw data. Returns the same object when nothing changed.
 */
export function sanitizeUntrusted(value: unknown): { value: unknown; count: number } {
  let nodes = 0;
  let count = 0;
  const leaf = (v: unknown): unknown => {
    if (typeof v === 'string') {
      const s = classifyLine('generic', v);
      if (s.masked) count++;
      return s.shown;
    }
    return v;
  };
  const walk = (v: unknown, depth: number, inHist: boolean): unknown => {
    if (++nodes > MAX_NODES || depth > MAX_DEPTH) throw new Overflow();
    if (Array.isArray(v)) {
      let changed = false;
      const out = v.map((x) => {
        const y = walk(x, depth + 1, inHist);
        if (y !== x) changed = true;
        return y;
      });
      return changed ? out : v;
    }
    if (v && typeof v === 'object') {
      let changed = false;
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
        const y = walk(x, depth + 1, inHist || k === 'history');
        if (y !== x) changed = true;
        out[k] = y;
      }
      return changed ? out : v;
    }
    return inHist ? leaf(v) : v;
  };
  const top = (v: unknown): unknown => {
    if (typeof v !== 'string') return walk(v, 0, false);
    try {
      const parsed = JSON.parse(v);
      if (parsed && typeof parsed === 'object') {
        const c = walk(parsed, 0, false);
        return c === parsed ? v : JSON.stringify(c);
      }
      return v;
    } catch (e) {
      if (e instanceof Overflow) throw e;
      return CREDENTIAL_HINT.test(v) ? WITHHELD : v;
    }
  };
  try {
    return { value: top(value), count };
  } catch {
    return { value: WITHHELD, count: count + 1 };
  }
}
