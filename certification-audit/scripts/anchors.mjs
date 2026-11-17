// Stable evidence anchors for the certification audit (CERT-P0-1b-EVIDENCE).
//
// The evidence strings in model.mjs cite source and test locations as "path:NN" and "name() l.NN". Absolute line numbers break
// whenever the code is reformatted or a line is added above them, although the evidence is unchanged. This module identifies
// every cited location by WHAT IS THERE instead of WHERE it is:
//
//   anchor = { key, file, line, symbol?, text, sha256, occurrence, of }
//     text        the cited line in TOKEN-CANONICAL form (`canon`): the content that identifies the evidence
//     sha256      hash of `text` (detects a hand-edited registry)
//     occurrence  1-based position of the cited line among the lines of the file with identical `text`
//     of          how many lines of the file have identical `text` when the anchor was recorded
//     line        the line number when recorded — INFORMATIONAL ONLY, never the identity, never a pass/fail input
//     symbol      for "name() l.NN" references: the function name, which must occur in `text`
//
// TOKEN-CANONICAL FORM (normalization "token-v1"). A line is lexed as JavaScript/TypeScript and re-printed as its tokens joined by
// ONE space. Whitespace BETWEEN tokens is therefore insignificant (indentation, spacing around punctuation), but:
//   - the content of string, template and regular-expression literals is kept VERBATIM (so "a b" != "ab", /a b/ != /ab/);
//   - whitespace that separates two tokens is never deleted outright: `const a` stays two tokens and is not `consta`,
//     `a in b` is not `ain b`, `a++ + b` is not `a+ ++b` (punctuators are matched longest-first);
//   - any character that is not whitespace, an identifier character, a literal or a known punctuator — a zero-width space
//     U+200B, a replacement character, a control character — is its own token, so invisible characters cannot hide a change;
//   - comments are dropped (a comment edit is not a code change);
//   - a semicolon is a token: `x = 1` and `x = 1;` are DIFFERENT (fail-closed; re-record the anchor deliberately).
// Lines longer than MAX_LINE are compared by an exact hash of the whole line. Files above MAX_FILE bytes are refused.
//
// Resolution (fail-closed): the anchor resolves only if the file exists, the registry entry is internally consistent (sha256,
// symbol, bounds), and exactly `of` lines have identical `text` (so a duplicated or removed anchor line is an error, never a
// guess) — the cited line is then the `occurrence`-th of them. Moving the line, reformatting, or adding/removing other code
// does not matter; editing, deleting or duplicating the cited line does. Paths must be plain relative src/tests/e2e files
// (no "..", no absolute path, no symlink leaving the repository).
//
// Usage:  node anchors.mjs build   — rewrites data/anchors.json from the CURRENT tree (a deliberate act: review the diff)
//         node anchors.mjs build --at <commit> [--out <file>] — the same, from that commit's blobs (the cited line numbers are
//                                    valid there); use it to re-derive the registry reproducibly
//         node anchors.mjs check   — resolves every reference of model.mjs against data/anchors.json
import { readFileSync, existsSync, writeFileSync, realpathSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
export const REPO = fileURLToPath(new URL('../../', import.meta.url)).split('\\').join('/').replace(/\/$/, '');
export const REGISTRY = HERE + '../data/anchors.json';
export const SCHEMA = 2;
export const NORMALIZATION = 'token-v1';
export const MAX_LINE = 20000;
export const MAX_FILE = 5 * 1024 * 1024;
/** a file that exists only on another commit (the evidence cites it there) */
export const PENDING = { 'e2e/endpoint-routing.spec.ts': '3c9aed7' };
const SAFE_PATH = /^(?:src|tests|e2e)\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]+\.tsx?$/;
export const safePath = (f) => typeof f === 'string' && SAFE_PATH.test(f) && !f.split('/').some((s) => s === '.' || s === '..');

export const sha = (s) => createHash('sha256').update(s).digest('hex');

// ───────── token-canonical form ─────────
const PUNCT = ['>>>=', '...', '===', '!==', '**=', '<<=', '>>=', '>>>', '&&=', '||=', '??=', '=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<', '>>', '**'];
const WS = /^[\t\v\f \u00a0\ufeff\r\n\u2028\u2029\p{Zs}]$/u;
const ID_START = /^[\p{ID_Start}$_]$/u;
const ID_PART = /^[\p{ID_Continue}$\u200c\u200d]$/u;
const REGEX_AFTER = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);

/** end index (exclusive) of a template literal starting at line[i] === '`', or -1 when it does not end on this line */
function scanTemplate(line, i) {
  let j = i + 1;
  while (j < line.length) {
    const c = line[j];
    if (c === '\\') j += 2;
    else if (c === '`') return j + 1;
    else if (c === '$' && line[j + 1] === '{') {
      j += 2;
      let depth = 1;
      while (j < line.length && depth > 0) {
        const d = line[j];
        if (d === '\\') j += 2;
        else if (d === '`') { const e = scanTemplate(line, j); if (e < 0) return -1; j = e; }
        else { if (d === '{') depth++; else if (d === '}') depth--; j++; }
      }
      if (depth > 0) return -1;
    } else j++;
  }
  return -1;
}

export function tokenize(line) {
  const t = [];
  const n = line.length;
  let i = 0;
  const regexAllowed = () => {
    const p = t[t.length - 1];
    if (p === undefined) return true;
    if (ID_START.test(p[0] ?? '') || /^\d/.test(p) || /^["'`]/.test(p)) return REGEX_AFTER.has(p);
    return !(p === ')' || p === ']' || p === '}');
  };
  while (i < n) {
    const c = String.fromCodePoint(line.codePointAt(i));
    if (WS.test(c)) { i += c.length; continue; }
    if (c === '/' && line[i + 1] === '/') break; // line comment: the rest of the line
    if (c === '/' && line[i + 1] === '*') { const e = line.indexOf('*/', i + 2); if (e < 0) break; i = e + 2; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && line[j] !== c) j += line[j] === '\\' ? 2 : 1;
      if (j >= n) { t.push(line.slice(i)); break; } // unterminated on this line: the rest, verbatim
      t.push(line.slice(i, j + 1)); i = j + 1; continue;
    }
    if (c === '`') {
      const e = scanTemplate(line, i);
      if (e < 0) { t.push(line.slice(i)); break; }
      t.push(line.slice(i, e)); i = e; continue;
    }
    if (c === '/' && regexAllowed()) {
      let j = i + 1, cls = false, end = -1;
      while (j < n) {
        const d = line[j];
        if (d === '\\') j += 2;
        else if (cls) { if (d === ']') cls = false; j++; }
        else if (d === '[') { cls = true; j++; }
        else if (d === '/') { end = j; break; }
        else j++;
      }
      if (end > i + 1) {
        let k = end + 1;
        while (k < n && /[A-Za-z]/.test(line[k])) k++;
        t.push(line.slice(i, k)); i = k; continue;
      }
    }
    if (/\d/.test(c) || (c === '.' && /\d/.test(line[i + 1] ?? ''))) {
      let j = i + 1;
      while (j < n && /[\w.]/.test(line[j])) j++;
      t.push(line.slice(i, j)); i = j; continue;
    }
    if (ID_START.test(c)) {
      let j = i + c.length;
      while (j < n) { const d = String.fromCodePoint(line.codePointAt(j)); if (!ID_PART.test(d)) break; j += d.length; }
      t.push(line.slice(i, j)); i = j; continue;
    }
    const p = PUNCT.find((x) => line.startsWith(x, i));
    if (p) { t.push(p); i += p.length; continue; }
    t.push(c); i += c.length; // single punctuator, or any other character (zero-width, control, …) as its own token
  }
  return t;
}

/** the identity form of one source line (see the header) */
export const canon = (line) => {
  const raw = line.replace(/\r$/, '');
  if (raw.length > MAX_LINE) return `LONGLINE:${sha(raw)}`;
  return tokenize(raw).join(' ');
};
export const normalize = canon;

// ───────── references ─────────
/** every location cited by the evidence dictionary, exactly the references the line-number QC used to check */
export function extractRefs(EV) {
  const refs = [];
  for (const [key, v] of Object.entries(EV)) {
    for (const m of v.matchAll(/((?:src|tests|e2e)\/[\w./-]+\.(?:tsx|ts))(?::(\d+)(?:-(\d+))?((?:, :\d+(?:-\d+)?)*))?/g)) {
      const nums = [m[2], m[3], ...(m[4] ? [...m[4].matchAll(/:(\d+)/g)].map((x) => x[1]) : [])].filter(Boolean).map(Number);
      for (const line of nums) refs.push({ key, file: m[1], line });
    }
    const f = v.match(/(src\/[\w./-]+\.tsx?)/);
    if (!f) continue;
    for (const m of v.matchAll(/(\w+)\(\) l\.(\d+)/g)) refs.push({ key, file: f[1], line: Number(m[2]), symbol: m[1] });
  }
  return refs;
}

/** the source text of a cited file: working tree (refusing symlinks that leave the repository), or a commit's blob */
export function readSource(file, repo = REPO, at = null) {
  if (!safePath(file)) throw new Error(`path not allowed: ${String(file).slice(0, 80)}`);
  let text;
  if (at && !PENDING[file]) text = execFileSync('git', ['-C', repo, 'show', `${at}:${file}`], { encoding: 'utf8', maxBuffer: 1 << 26 });
  else if (PENDING[file]) text = execFileSync('git', ['-C', REPO, 'show', `${PENDING[file]}:${file}`], { encoding: 'utf8', maxBuffer: 1 << 26 });
  else {
    const p = `${repo}/${file}`;
    if (!existsSync(p)) return null;
    const real = realpathSync(p), root = realpathSync(repo);
    if (!(real === root || real.startsWith(root + sep))) throw new Error(`path escapes the repository: ${file}`);
    if (statSync(real).size > MAX_FILE) throw new Error(`file too large: ${file}`);
    text = readFileSync(p, 'utf8');
  }
  if (text.length > MAX_FILE) throw new Error(`file too large: ${file}`);
  return text;
}

const canonLines = (src) => src.split('\n').map(canon);
const idxOf = (lines, text) => lines.flatMap((l, i) => (l === text ? [i + 1] : []));

/** records an anchor for a reference from the current tree (build time) */
export function record(ref, repo = REPO, at = null) {
  const src = readSource(ref.file, repo, at);
  if (src === null) throw new Error(`MISSING FILE ${ref.key}: ${ref.file}`);
  const lines = canonLines(src);
  const text = lines[ref.line - 1] ?? '';
  if (!text) throw new Error(`EMPTY LINE ${ref.key}: ${ref.file}:${ref.line}`);
  if (ref.symbol && !tokenize(text).includes(ref.symbol)) throw new Error(`SYMBOL NOT ON LINE ${ref.key}: ${ref.file}:${ref.line} expected ${ref.symbol}`);
  const same = idxOf(lines, text);
  return { key: ref.key, file: ref.file, line: ref.line, ...(ref.symbol ? { symbol: ref.symbol } : {}), text, sha256: sha(text), occurrence: same.indexOf(ref.line) + 1, of: same.length };
}

/** the (key, file, line, symbol) identity of a reference — registry completeness is checked with it */
export const refId = (r) => `${r.key}\u0000${r.file}\u0000${r.line}\u0000${r.symbol ?? ''}`;

/** structural validation of a parsed registry; returns a list of problems (empty = valid) */
export function validateRegistry(reg) {
  const errs = [];
  if (!reg || typeof reg !== 'object' || Array.isArray(reg)) return ['registry is not an object'];
  if (reg.schema !== SCHEMA) errs.push(`schema ${String(reg.schema)} (expected ${SCHEMA})`);
  if (reg.normalization !== NORMALIZATION) errs.push(`normalization ${String(reg.normalization)} (expected ${NORMALIZATION})`);
  if (!Array.isArray(reg.anchors)) return [...errs, 'anchors is not an array'];
  const seen = new Set();
  reg.anchors.forEach((a, i) => {
    const w = `anchors[${i}]`;
    if (!a || typeof a !== 'object') { errs.push(`${w}: not an object`); return; }
    if (typeof a.key !== 'string' || !a.key) errs.push(`${w}: key`);
    if (!safePath(a.file)) errs.push(`${w}: path not allowed`);
    if (!Number.isInteger(a.line) || a.line < 1) errs.push(`${w}: line`);
    if (a.symbol !== undefined && typeof a.symbol !== 'string') errs.push(`${w}: symbol`);
    if (typeof a.text !== 'string' || !a.text || a.text.length > MAX_LINE + 70) errs.push(`${w}: text`);
    if (typeof a.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(a.sha256)) errs.push(`${w}: sha256`);
    if (!Number.isInteger(a.of) || a.of < 1 || a.of > 1e6) errs.push(`${w}: of`);
    if (!Number.isInteger(a.occurrence) || a.occurrence < 1 || a.occurrence > a.of) errs.push(`${w}: occurrence`);
    const id = refId(a);
    if (seen.has(id)) errs.push(`${w}: duplicate reference ${a.key} ${a.file}:${a.line}`); else seen.add(id);
  });
  return errs;
}

export function loadRegistry(path = REGISTRY) {
  try { return { registry: JSON.parse(readFileSync(path, 'utf8')), error: null }; } catch (e) { return { registry: null, error: String(e.message || e).split('\n')[0] }; }
}

/** resolves one registry entry against the tree; returns { ok, line?, reason? } — fail-closed */
export function resolve(a, repo = REPO, cache = new Map()) {
  if (sha(a.text) !== a.sha256) return { ok: false, reason: 'registry entry altered (sha256 mismatch)' };
  if (a.symbol && !tokenize(a.text).includes(a.symbol)) return { ok: false, reason: `symbol ${a.symbol} not in anchor text` };
  let lines = cache.get(a.file);
  if (lines === undefined) {
    let src;
    try { src = readSource(a.file, repo); } catch (e) { return { ok: false, reason: String(e.message || e) }; }
    lines = src === null ? null : canonLines(src);
    cache.set(a.file, lines);
  }
  if (lines === null) return { ok: false, reason: 'file missing' };
  const same = idxOf(lines, a.text);
  if (same.length === 0) return { ok: false, reason: 'anchor text not found (code changed or removed)' };
  if (same.length !== a.of) return { ok: false, reason: `ambiguous: ${same.length} identical lines, ${a.of} recorded` };
  return { ok: true, line: same[a.occurrence - 1] };
}

export function checkAll(EV, registry, repo = REPO) {
  const out = [];
  let checked = 0, bad = 0, drift = 0;
  const verrs = validateRegistry(registry);
  if (verrs.length) {
    for (const e of verrs.slice(0, 20)) out.push(`BAD REGISTRY ${e}`);
    return { out, checked: extractRefs(EV).length, bad: verrs.length, drift: 0 };
  }
  const have = new Map(registry.anchors.map((a) => [refId(a), a]));
  const refs = extractRefs(EV);
  const wanted = new Set(refs.map(refId));
  const cache = new Map();
  for (const r of refs) {
    checked++;
    const a = have.get(refId(r));
    if (!a) { out.push(`NO ANCHOR ${r.key}: ${r.file}:${r.line}${r.symbol ? ` (${r.symbol})` : ''} — cited in the evidence but not in data/anchors.json`); bad++; continue; }
    const res = resolve(a, repo, cache);
    if (!res.ok) { out.push(`BAD ANCHOR ${r.key}: ${r.file}:${r.line} -> ${res.reason}: ${a.text.slice(0, 70)}`); bad++; continue; }
    if (res.line !== a.line) drift++;
  }
  for (const a of registry.anchors) if (!wanted.has(refId(a))) { out.push(`STALE ANCHOR ${a.key}: ${a.file}:${a.line} is in data/anchors.json but no longer cited by the evidence`); bad++; }
  return { out, checked, bad, drift };
}

export function buildRegistry(EV, repo = REPO, at = null) {
  const seen = new Set();
  const anchors = [];
  for (const r of extractRefs(EV)) {
    if (seen.has(refId(r))) continue;
    seen.add(refId(r));
    anchors.push(record(r, repo, at));
  }
  return { schema: SCHEMA, normalization: NORMALIZATION, note: 'Identity of each cited location = token-canonical line text + occurrence; `line` is informational. Rebuild deliberately with: node certification-audit/scripts/anchors.mjs build --at <commit>', anchors };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2];
  if (mode === 'build' || mode === 'check') {
    const { EV } = await import('./model.mjs');
    if (mode === 'build') {
      const atArg = process.argv.indexOf('--at');
      const reg = buildRegistry(EV, REPO, atArg > 0 ? process.argv[atArg + 1] : null);
      const dest = process.argv.indexOf('--out') > 0 ? process.argv[process.argv.indexOf('--out') + 1] : REGISTRY;
      writeFileSync(dest, JSON.stringify(reg, null, 1) + '\n');
      const amb = reg.anchors.filter((a) => a.of > 1);
      console.log(`anchors=${reg.anchors.length} ambiguous-text-lines=${amb.length}`);
    } else {
      const { registry, error } = loadRegistry();
      const r = registry ? checkAll(EV, registry) : { out: [`BAD REGISTRY cannot read data/anchors.json: ${error}`], checked: 0, bad: 1, drift: 0 };
      console.log([...r.out, `anchors checked=${r.checked} problems=${r.bad} line-drift(informational)=${r.drift}`].join('\n'));
      process.exit(r.bad ? 1 : 0);
    }
  }
}
