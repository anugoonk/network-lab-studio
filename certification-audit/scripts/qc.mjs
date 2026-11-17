// QC of the certification model: objective counts, duplicate IDs, domain weights, and every evidence reference.
// Usage (from anywhere): node certification-audit/scripts/qc.mjs    — needs git and the commit 3c9aed7 locally (one cited e2e file lives only there).
// (reads data/anchors.json through anchors.mjs)
import { CCNA11, CCNA20, NPLUS, EV } from './model.mjs';
import { fileURLToPath } from 'node:url';
import { checkAll, loadRegistry } from './anchors.mjs';
// repository root = two levels above this script (certification-audit/scripts/qc.mjs)
const REPO = fileURLToPath(new URL('../../', import.meta.url)).split('\\').join('/').replace(/\/$/, '');
const out = [];
for (const ex of [CCNA11, CCNA20, NPLUS]) {
  const ids = []; let topics = 0, w = 0;
  for (const d of ex.domains) { w += d.w; for (const t of d.topics) { topics++; ids.push(t.id); for (const s of t.subs ?? []) ids.push(s.id); } }
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  out.push(`${ex.name} ${ex.version}: domains=${ex.domains.length} weightSum=${w} topics=${topics} ids=${ids.length} duplicates=${JSON.stringify(dup)}`);
}
// Evidence references are resolved through STABLE ANCHORS (anchors.mjs + data/anchors.json: token-canonical line text + occurrence,
// never the absolute line number). A moved or reformatted-around line passes; an edited, deleted, duplicated or uncited one fails,
// and so does an unreadable or malformed registry.
const { registry, error } = loadRegistry();
const r = registry ? checkAll(EV, registry, REPO) : { out: [`BAD REGISTRY cannot read data/anchors.json: ${error}`], checked: 0, bad: 1, drift: 0 };
out.push(...r.out);
out.push(`evidence refs checked=${r.checked} problems=${r.bad}`);
out.push(`cited line numbers that differ from the recorded ones (informational, not a problem): ${r.drift}`);
console.log(out.join('\n'));
if (r.bad) process.exitCode = 1;
