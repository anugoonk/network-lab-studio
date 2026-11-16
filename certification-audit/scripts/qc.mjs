// QC of the certification model: objective counts, duplicate IDs, domain weights, and every evidence reference.
// Usage (from anywhere): node certification-audit/scripts/qc.mjs    — needs git and the branch/commit 3c9aed7 locally.
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { CCNA11, CCNA20, NPLUS, EV } from './model.mjs';
import { fileURLToPath } from 'node:url';
// repository root = two levels above this script (certification-audit/scripts/qc.mjs)
const REPO = fileURLToPath(new URL('../../', import.meta.url)).split('\\').join('/').replace(/\/$/, '');
const out = [];
for (const ex of [CCNA11, CCNA20, NPLUS]) {
  const ids = []; let topics = 0, w = 0;
  for (const d of ex.domains) { w += d.w; for (const t of d.topics) { topics++; ids.push(t.id); for (const s of t.subs ?? []) ids.push(s.id); } }
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  out.push(`${ex.name} ${ex.version}: domains=${ex.domains.length} weightSum=${w} topics=${topics} ids=${ids.length} duplicates=${JSON.stringify(dup)}`);
}
let bad = 0, checked = 0;
for (const [k, v] of Object.entries(EV)) {
  for (const m of v.matchAll(/((?:src|tests|e2e)\/[\w./-]+\.(?:tsx|ts))(?::(\d+)(?:-(\d+))?((?:, :\d+(?:-\d+)?)*))?/g)) {
    const file = m[1];
    const pending = file === 'e2e/endpoint-routing.spec.ts';
    const text = pending ? execSync(`git -C "${REPO}" show 3c9aed7:${file}`).toString() : (existsSync(`${REPO}/${file}`) ? readFileSync(`${REPO}/${file}`, 'utf8') : null);
    if (text === null) { out.push(`MISSING FILE ${k}: ${file}`); bad++; continue; }
    const lines = text.split('\n');
    const nums = [m[2], m[3], ...(m[4] ? [...m[4].matchAll(/:(\d+)/g)].map((x) => x[1]) : [])].filter(Boolean).map(Number);
    for (const n of nums) {
      checked++;
      const L = lines[n - 1] ?? '';
      const isTestFile = file.startsWith('tests/') || file.startsWith('e2e/');
      const ok = isTestFile ? /^\s*(it|test|describe)(\.\w+)?\(/.test(L) || /\b(it|test)\(/.test(L) : L.trim().length > 0;
      if (!ok) { out.push(`BAD LINE ${k}: ${file}:${n} -> ${L.trim().slice(0, 80)}`); bad++; }
    }
  }
}
// src line refs like "l.191"
for (const [k, v] of Object.entries(EV)) {
  const f = v.match(/(src\/[\w./-]+\.tsx?)/); if (!f) continue;
  for (const m of v.matchAll(/(\w+)\(\) l\.(\d+)/g)) {
    checked++;
    const L = readFileSync(`${REPO}/${f[1]}`, 'utf8').split('\n')[Number(m[2]) - 1] ?? '';
    if (!L.includes(m[1])) { out.push(`BAD FN REF ${k}: ${f[1]} l.${m[2]} expected ${m[1]} got: ${L.trim().slice(0, 70)}`); bad++; }
  }
}
out.push(`evidence refs checked=${checked} problems=${bad}`);
console.log(out.join('\n'));
