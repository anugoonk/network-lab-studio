// Independent recomputation of the certification coverage scores from the SAVED REPORTS only.
// It does not import model.mjs or gen.mjs: statuses, Lab relevance, domain weights and the status→score table are all
// parsed from CCNA_OBJECTIVE_MATRIX.md and NETWORK_PLUS_OBJECTIVE_MATRIX.md, and the shared-capability counts from
// CERTIFICATION_GAP_ANALYSIS.md §5.4. Results are compared with data/expected-scores.json (the figures as published).
//
// Usage: node certification-audit/scripts/recompute-from-matrices.mjs [--json]
// Exit code 0 = every recomputed figure equals the published one (to 0.1 percentage point), 1 = discrepancy.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (f) => readFileSync(ROOT + f, 'utf8');
const problems = [];

// ── scoring table and Lab weights from the legend ──
function legendScores(md) {
  const sc = { proposed: {}, strict: {}, lenient: {} };
  for (const name of ['VERIFIED', 'IMPLEMENTED_UNVERIFIED', 'PARTIAL', 'DIAGRAM_ONLY', 'THEORY_ONLY', 'MISSING']) {
    const m = md.match(new RegExp(`^\\| ${name} \\|[^\\n]*?\\| ([0-9.]+) \\| ([0-9.]+) \\| ([0-9.]+) \\|$`, 'm'));
    if (!m) throw new Error(`legend row ${name} not found`);
    sc.proposed[name] = +m[1]; sc.strict[name] = +m[2]; sc.lenient[name] = +m[3];
  }
  const rel = md.match(/H = [^(]*\(weight ([0-9.]+)\), M = [^(]*\(([0-9.]+)\), L = [^(]*\(([0-9.]+)/);
  if (!rel) throw new Error('Lab relevance weights not found');
  return { sc, rel: { H: +rel[1], M: +rel[2], L: +rel[3] } };
}

// ── compact matrix rows → exam structure ──
// columns: header-specific; we locate cells by position given the table header.
function parseCompact(md, sectionStart, sectionEnd, cols) {
  const a = md.indexOf(sectionStart); const b = sectionEnd ? md.indexOf(sectionEnd, a) : md.length;
  if (a < 0 || b < 0) throw new Error(`section not found: ${sectionStart}`);
  const lines = md.slice(a, b).split('\n').filter((l) => /^\| (CCNA|N\+) \|/.test(l));
  const domains = new Map(); let topic = null;
  for (const line of lines) {
    const c = line.split('|').slice(1, -1).map((x) => x.trim());
    if (c.length !== cols.n) { problems.push(`unexpected column count ${c.length} in: ${line.slice(0, 80)}`); continue; }
    const dom = c[2].match(/^(\d\.0)(?: \((\d+)%\))?$/);
    if (!dom) { problems.push(`bad domain cell: ${c[2]}`); continue; }
    if (!domains.has(dom[1])) domains.set(dom[1], { w: null, topics: [] });
    const d = domains.get(dom[1]);
    if (dom[2]) d.w = +dom[2];
    const id = c[3].replace(/\*/g, '').replace(/ \(derived\)$/, '').trim();
    const isTopic = c[3].startsWith('**');
    const status = c[cols.status].replace(/\*/g, '');
    const shown = +c[cols.score].replace(/\*/g, '');
    if (isTopic) {
      topic = { id, rel: c[cols.rel], shown, items: [] };
      d.topics.push(topic);
      if (!/mean/.test(status)) topic.items.push({ id, status, shown }); // topic assessed directly
    } else {
      if (!topic) { problems.push(`sub-row before topic: ${id}`); continue; }
      topic.items.push({ id, status, shown });
    }
  }
  return [...domains.entries()].map(([id, d]) => ({ id, ...d }));
}

function score(domains, sc, rel, only = null) {
  let tot = 0, ws = 0, lab = 0, lws = 0; const per = [];
  for (const d of domains) {
    const ts = d.topics.map((t) => {
      const vals = t.items.filter((i) => i.status !== 'UNKNOWN').map((i) => (only ? (i.status === only ? 1 : 0) : sc[i.status]));
      return { rel: t.rel, s: vals.reduce((x, y) => x + y, 0) / vals.length };
    });
    const ds = ts.reduce((x, t) => x + t.s, 0) / ts.length;
    const rs = ts.reduce((x, t) => x + rel[t.rel], 0);
    const ls = rs > 0 ? ts.reduce((x, t) => x + rel[t.rel] * t.s, 0) / rs : null;
    tot += d.w * ds; ws += d.w; if (ls !== null) { lab += d.w * ls; lws += d.w; }
    per.push({ id: d.id, w: d.w, overall: ds, lab: ls });
  }
  return { overall: tot / ws, lab: lab / lws, domains: per };
}

function internalChecks(name, domains, sc) {
  let items = 0;
  for (const d of domains) {
    if (d.w === null) problems.push(`${name} ${d.id}: no weight`);
    for (const t of d.topics) {
      for (const i of t.items) {
        items++;
        if (!(i.status in sc)) problems.push(`${name} ${i.id}: unknown status ${i.status}`);
        else if (Math.abs(sc[i.status] - i.shown) > 0.005 + 1e-9) problems.push(`${name} ${i.id}: shown score ${i.shown} ≠ ${sc[i.status]}`);
      }
      const mean = t.items.reduce((x, i) => x + sc[i.status], 0) / t.items.length;
      if (Math.abs(mean - t.shown) > 0.005 + 1e-9) problems.push(`${name} ${t.id}: shown topic score ${t.shown} ≠ ${mean.toFixed(3)}`);
    }
  }
  const wsum = domains.reduce((x, d) => x + d.w, 0);
  if (wsum !== 100) problems.push(`${name}: domain weights sum ${wsum}`);
  return { domains: domains.length, topics: domains.reduce((x, d) => x + d.topics.length, 0), items };
}

const ccnaMd = read('CCNA_OBJECTIVE_MATRIX.md');
const npMd = read('NETWORK_PLUS_OBJECTIVE_MATRIX.md');
const { sc, rel } = legendScores(ccnaMd);
const lg2 = legendScores(npMd);
if (JSON.stringify(lg2) !== JSON.stringify({ sc, rel })) problems.push('legends of the two matrices differ');

const exams = {
  ccna11: parseCompact(ccnaMd, '## A.2 Compact matrix', '## A.3', { n: 12, rel: 6, status: 7, score: 8 }),
  ccna20: parseCompact(ccnaMd, '## B.3 Compact matrix', null, { n: 9, rel: 5, status: 6, score: 7 }),
  nplus: parseCompact(npMd, '## 2. Compact matrix', '## 3.', { n: 11, rel: 6, status: 7, score: 8 }),
};
const out = { structure: {}, scores: {} };
for (const [k, d] of Object.entries(exams)) {
  out.structure[k] = internalChecks(k, d, sc.proposed);
  const p = score(d, sc.proposed, rel), s = score(d, sc.strict, rel), l = score(d, sc.lenient, rel), v = score(d, sc.proposed, rel, 'VERIFIED');
  out.scores[k] = { overall: p.overall, lab: p.lab, strictOverall: s.overall, strictLab: s.lab, lenientOverall: l.overall, lenientLab: l.lab, verifiedOverall: v.overall, verifiedLab: v.lab, domains: p.domains };
}
// shared clusters: counts from CERTIFICATION_GAP_ANALYSIS.md §5.4
const gap = read('CERTIFICATION_GAP_ANALYSIS.md');
const cnt = {};
for (const [name, key] of [['VERIFIED', 'VERIFIED'], ['PARTIAL', 'PARTIAL'], ['DIAGRAM_ONLY', 'DIAGRAM_ONLY'], ['MISSING', 'MISSING']]) {
  const m = gap.match(new RegExp(`^\\| ${name} \\((\\d+)\\) \\|`, 'm'));
  if (!m) problems.push(`shared count ${name} not found in gap analysis`); else cnt[key] = +m[1];
}
const n = Object.values(cnt).reduce((x, y) => x + y, 0);
const shared = (scn) => Object.entries(cnt).reduce((x, [k, v]) => x + v * sc[scn][k], 0) / n;
out.scores.shared = { clusters: n, proposed: shared('proposed'), strict: shared('strict'), lenient: shared('lenient') };

// ── compare with the published figures ──
const exp = JSON.parse(readFileSync(new URL('../data/expected-scores.json', import.meta.url), 'utf8'));
const cmp = [];
const pct = (x) => Math.round(1000 * x) / 10;
for (const [k, fields] of Object.entries(exp.published)) {
  for (const [f, v] of Object.entries(fields)) {
    if (f === 'domains') {
      for (const [did, dv] of Object.entries(v)) {
        const got = out.scores[k].domains.find((d) => d.id === did);
        for (const [g, want] of Object.entries(dv)) {
          const have = got?.[g] === null ? null : pct(got?.[g]);
          cmp.push({ what: `${k}.${did}.${g}`, published: want, recomputed: have, ok: have === want });
        }
      }
      continue;
    }
    const have = pct(out.scores[k][f]);
    cmp.push({ what: `${k}.${f}`, published: v, recomputed: have, ok: have === v });
  }
}
for (const [k, s] of Object.entries(exp.structure)) for (const [f, v] of Object.entries(s)) {
  const have = out.structure[k]?.[f];
  cmp.push({ what: `${k}.structure.${f}`, published: v, recomputed: have, ok: have === v });
}
const bad = cmp.filter((c) => !c.ok);
if (process.argv.includes('--json')) console.log(JSON.stringify({ out, cmp, problems }, null, 1));
else {
  for (const c of cmp) console.log(`${c.ok ? 'OK ' : 'BAD'} ${c.what.padEnd(34)} published ${String(c.published).padStart(5)}  recomputed ${String(c.recomputed).padStart(5)}`);
  for (const p of problems) console.log(`PROBLEM ${p}`);
  console.log(`\n${cmp.length - bad.length}/${cmp.length} figures reproduced; ${problems.length} structural problems`);
}
process.exit(bad.length || problems.length ? 1 : 0);
