// One-shot reproducibility check for the certification audit (2026-11-13). Plain Node ≥ 18, no dependencies.
// Usage (from anywhere): node certification-audit/scripts/verify.mjs
//
//  1. gen.mjs regenerates both matrices and scores.json into a temp dir → must be byte-identical to the saved files
//  2. evidx.mjs regenerates sections E.1–E.4 → must appear verbatim in CERTIFICATION_EVIDENCE_INDEX.md
//  3. recompute-from-matrices.mjs recomputes every published figure from the saved matrices only → must match
//  4. qc.mjs: objective counts, duplicate IDs, weights, and all evidence references exist (needs git + commit 3c9aed7)
//  5. MANIFEST.sha256: the preserved audit files are unchanged
// Exit code 0 only if every check passes. Nothing in the repository is written.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const AUDIT = fileURLToPath(new URL('../', import.meta.url));
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const node = (script, args = []) => execFileSync(process.execPath, [join(HERE, script), ...args], { encoding: 'utf8' });
const results = [];
const check = (name, fn) => { try { const r = fn(); results.push([name, r === true ? 'PASS' : `FAIL ${r}`]); } catch (e) { results.push([name, `FAIL ${String(e.message || e).split('\n')[0]}`]); } };
const same = (a, b) => readFileSync(a).equals(readFileSync(b));

const tmp = mkdtempSync(join(tmpdir(), 'nls-cert-'));
try {
  node('gen.mjs', [tmp]);
  check('1a gen → CCNA_OBJECTIVE_MATRIX.md byte-identical', () => same(join(tmp, 'CCNA_OBJECTIVE_MATRIX.md'), join(ROOT, 'CCNA_OBJECTIVE_MATRIX.md')) || 'differs');
  check('1b gen → NETWORK_PLUS_OBJECTIVE_MATRIX.md byte-identical', () => same(join(tmp, 'NETWORK_PLUS_OBJECTIVE_MATRIX.md'), join(ROOT, 'NETWORK_PLUS_OBJECTIVE_MATRIX.md')) || 'differs');
  check('1c gen → data/scores.json byte-identical', () => same(join(tmp, 'scores.json'), join(AUDIT, 'data', 'scores.json')) || 'differs');
  node('evidx.mjs', [tmp]);
  check('2  evidx → E.1–E.4 verbatim in CERTIFICATION_EVIDENCE_INDEX.md', () => readFileSync(join(ROOT, 'CERTIFICATION_EVIDENCE_INDEX.md'), 'utf8').includes(readFileSync(join(tmp, 'evidx-body.md'), 'utf8')) || 'not found');
  check('3  recompute from saved matrices = published figures', () => { const o = node('recompute-from-matrices.mjs'); return /(\d+)\/\1 figures reproduced; 0 structural problems/.test(o) || o.trim().split('\n').pop(); });
  check('4  qc: counts, IDs, weights, evidence references', () => { const o = node('qc.mjs'); return /problems=0/.test(o) || o.trim().split('\n').pop(); });
  check('5  MANIFEST.sha256 of preserved audit files', () => {
    const bad = [];
    for (const line of readFileSync(join(AUDIT, 'MANIFEST.sha256'), 'utf8').trim().split('\n')) {
      const [hash, file] = line.split(/\s+\*?/);
      const h = createHash('sha256').update(readFileSync(join(AUDIT, file))).digest('hex');
      if (h !== hash) bad.push(file);
    }
    return bad.length ? `changed: ${bad.join(', ')}` : true;
  });
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
for (const [n, r] of results) console.log(`${r.startsWith('PASS') ? 'PASS' : 'FAIL'}  ${n}${r === 'PASS' ? '' : `  → ${r.slice(5)}`}`);
const failed = results.filter(([, r]) => r !== 'PASS').length;
console.log(`\n${results.length - failed}/${results.length} reproducibility checks passed`);
process.exit(failed ? 1 : 0);
