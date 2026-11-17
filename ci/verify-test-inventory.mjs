// Test inventory + minimum-count gate (CERT-P0-1b F-6). Plain Node >= 18, no dependencies, no network.
//
// It reads a MACHINE-READABLE test result (Vitest `--reporter=json`, Playwright `--reporter=json`), never console text, and compares it
// with the reviewed baseline `ci/test-inventory.json`:
//   - the result file must exist, parse and have the expected shape                               (else exit 2)
//   - no failed test, and no skipped / pending / todo / disabled test beyond `policy.allowSkipped` (default 0)
//   - every file of the baseline must have been executed, with at least its recorded number of tests (a deleted, renamed, moved or
//     emptied file, or a removed test, fails)
//   - the executed total must not be below the baseline total
//   - every test-looking file under tests/ (unit) or e2e/ (e2e) must appear in the result: a test file renamed outside the runner's
//     discovery pattern (e.g. tests/x.spec.ts) is executed by nobody and fails
// Additions never fail: a new file or extra tests are reported as a NOTICE. Lowering the baseline needs a deliberate, reviewable edit of
// ci/test-inventory.json; this script never writes the baseline except in the explicit manual `generate` mode (CI never calls it).
// What it is NOT: proof of test quality. An early `return;` or a weakened assertion inside a counted test is not detected (see F-1),
// and a change that lowers the baseline together with the tests passes by design: that change is visible in the diff and must be reviewed.
//
// Usage:  node ci/verify-test-inventory.mjs check    unit|e2e <results.json>
//         node ci/verify-test-inventory.mjs generate unit|e2e <results.json>   (manual: merges that section into the baseline file)
// Exit:   0 ok · 1 violation · 2 unreadable / malformed input or usage error
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, relative, join } from 'node:path';

const ROOT = process.env.TEST_INVENTORY_ROOT ? resolve(process.env.TEST_INVENTORY_ROOT) : fileURLToPath(new URL('../', import.meta.url)).replace(/[\\/]$/, '');
const INVENTORY = join(ROOT, 'ci', 'test-inventory.json');
const KINDS = { unit: { dir: 'tests' }, e2e: { dir: 'e2e' } };
const TEST_CALL = /^\s*(?:it|test|describe)(?:\.\w+)?\s*[(.]/m;
const SKIPPED = new Set(['skipped', 'pending', 'todo', 'disabled', 'fixme']);

class Bad extends Error { constructor(msg, code = 1) { super(msg); this.code = code; } }
const norm = (p) => p.split('\\').join('/');
const relFromRoot = (abs) => {
  const a = norm(abs); const r = norm(ROOT);
  // same-platform or foreign-style absolute path under ROOT (Windows runners report C:\...\tests\x, Linux /home/.../tests/x)
  if (a.toLowerCase().startsWith(r.toLowerCase() + '/')) return a.slice(r.length + 1);
  return norm(relative(ROOT, resolve(abs)));
};

/** vitest JSON -> { files: {rel: count}, failed, skipped:[names], total } */
export function readVitest(j) {
  if (!j || typeof j !== 'object' || !Array.isArray(j.testResults) || typeof j.numTotalTests !== 'number') throw new Bad('not a Vitest JSON report (testResults / numTotalTests missing)', 2);
  const files = {}; const skipped = []; let failed = 0; let total = 0;
  for (const f of j.testResults) {
    if (typeof f?.name !== 'string' || !Array.isArray(f.assertionResults)) throw new Bad('malformed Vitest testResults entry', 2);
    const rel = relFromRoot(f.name);
    files[rel] = (files[rel] ?? 0) + f.assertionResults.length;
    for (const a of f.assertionResults) {
      total++;
      if (a.status === 'failed') failed++;
      else if (a.status !== 'passed') skipped.push(`${rel} > ${a.fullName ?? a.title}`);
    }
  }
  if (total !== j.numTotalTests) throw new Bad(`report is inconsistent: ${total} assertion results but numTotalTests=${j.numTotalTests}`, 2);
  return { files, failed, skipped, total };
}

/** Playwright JSON -> same shape; files are relative to testDir (e2e) */
export function readPlaywright(j) {
  if (!j || typeof j !== 'object' || !Array.isArray(j.suites) || typeof j.stats !== 'object') throw new Bad('not a Playwright JSON report (suites / stats missing)', 2);
  const files = {}; const skipped = []; let failed = 0; let total = 0;
  const walk = (s, file) => {
    const f = s.file ?? file;
    for (const sp of s.specs ?? []) {
      for (const t of sp.tests ?? []) {
        const rel = `e2e/${norm(sp.file ?? f ?? '?')}`;
        files[rel] = (files[rel] ?? 0) + 1; total++;
        if (t.status === 'unexpected' || t.status === 'flaky') failed++;
        else if (t.status === 'skipped' || SKIPPED.has(t.expectedStatus)) skipped.push(`${rel} > ${sp.title}`);
      }
    }
    for (const c of s.suites ?? []) walk(c, f);
  };
  for (const s of j.suites) walk(s, s.file);
  const st = j.stats; const want = (st.expected ?? 0) + (st.unexpected ?? 0) + (st.flaky ?? 0) + (st.skipped ?? 0);
  if (total !== want) throw new Bad(`report is inconsistent: ${total} tests found but stats add up to ${want}`, 2);
  return { files, failed, skipped, total };
}

function listTestLike(dir) {
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); }
      else if (/\.(?:[cm]?[jt]sx?)$/.test(e.name) && TEST_CALL.test(readFileSync(p, 'utf8'))) out.push(relFromRoot(p));
    }
  };
  if (existsSync(join(ROOT, dir))) walk(join(ROOT, dir));
  return out;
}

export function check(kind, results) {
  const k = KINDS[kind]; if (!k) throw new Bad(`unknown kind "${kind}" (unit|e2e)`, 2);
  let inv;
  try { inv = JSON.parse(readFileSync(INVENTORY, 'utf8')); } catch (e) { throw new Bad(`cannot read ci/test-inventory.json: ${String(e.message).split('\n')[0]}`, 2); }
  const base = inv?.[kind];
  if (inv?.schema !== 1 || !base || typeof base.files !== 'object' || !Number.isInteger(base.total) || base.total < 1) throw new Bad('ci/test-inventory.json is malformed for ' + kind, 2);
  const allow = Number.isInteger(inv.policy?.allowSkipped) ? inv.policy.allowSkipped : 0;
  const problems = []; const notices = [];
  if (results.failed) problems.push(`${results.failed} test(s) failed`);
  if (results.skipped.length > allow) problems.push(`${results.skipped.length} skipped/pending/todo test(s), policy allows ${allow}: ${results.skipped.slice(0, 5).join('; ')}`);
  let sum = 0;
  for (const [file, n] of Object.entries(base.files)) {
    sum += n;
    const got = results.files[file];
    if (got === undefined) problems.push(`baseline file not executed (deleted, renamed, moved or outside discovery): ${file}`);
    else if (got < n) problems.push(`${file}: ${got} test(s) executed, baseline ${n}`);
    else if (got > n) notices.push(`${file}: ${got} tests, baseline ${n} (raise the baseline deliberately)`);
  }
  if (sum !== base.total) problems.push(`baseline is internally inconsistent: files sum to ${sum}, total says ${base.total}`);
  if (results.total < base.total) problems.push(`executed ${results.total} test(s), baseline total ${base.total}`);
  for (const f of Object.keys(results.files)) if (!(f in base.files)) notices.push(`new test file not in the baseline: ${f} (${results.files[f]} tests)`);
  for (const f of listTestLike(k.dir)) if (!(f in results.files)) problems.push(`test-looking file was not executed by the runner: ${f}`);
  return { problems, notices, total: results.total, files: Object.keys(results.files).length, baseline: base.total };
}

function load(kind, path) {
  let j;
  try { j = JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8')); } catch (e) { throw new Bad(`cannot read result file ${path}: ${String(e.message).split('\n')[0]}`, 2); }
  return kind === 'unit' ? readVitest(j) : readPlaywright(j);
}

function main(argv) {
  const [mode, kind, path] = argv;
  if (!['check', 'generate'].includes(mode) || !KINDS[kind] || !path) throw new Bad('usage: verify-test-inventory.mjs check|generate unit|e2e <results.json>', 2);
  const res = load(kind, path);
  if (mode === 'generate') {
    let inv = { schema: 1, policy: { allowSkipped: 0 } };
    if (existsSync(INVENTORY)) inv = JSON.parse(readFileSync(INVENTORY, 'utf8'));
    const files = Object.fromEntries(Object.entries(res.files).sort(([a], [b]) => (a < b ? -1 : 1)));
    inv[kind] = { files, total: res.total };
    writeFileSync(INVENTORY, JSON.stringify(inv, null, 1) + '\n');
    console.log(`test inventory (${kind}) written: ${Object.keys(files).length} files, ${res.total} tests — review the diff`);
    return 0;
  }
  const r = check(kind, res);
  for (const n of r.notices) console.log(`NOTICE ${n}`);
  for (const p of r.problems) console.log(`::error::TEST INVENTORY ${kind}: ${p}`);
  console.log(`test inventory ${kind}: executed=${r.total} baseline=${r.baseline} files=${r.files} problems=${r.problems.length}`);
  return r.problems.length ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try { process.exitCode = main(process.argv.slice(2)); } catch (e) { console.log(`::error::TEST INVENTORY: ${e.message}`); process.exitCode = e instanceof Bad ? e.code : 2; }
}
