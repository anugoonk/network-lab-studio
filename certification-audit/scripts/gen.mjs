// Generates CCNA_OBJECTIVE_MATRIX.md, NETWORK_PLUS_OBJECTIVE_MATRIX.md and scores.json from model.mjs.
// Usage: node gen.mjs <outDir>
import { writeFileSync } from 'node:fs';
import { CCNA11, CCNA20, NPLUS, SHARED, PHASES, EV, SCORE, SCENARIOS, STATUS_NAME, REL } from './model.mjs';

const OUT = process.argv[2];
const PHASE_META = {
  'CERT-Q1': ['Q', 'S', '1–2 wk'], 'CERT-Q2': ['Q', 'S', '1–2 wk'], 'CERT-Q3': ['Q', 'S', '2–3 d'], 'CERT-Q4': ['Q', 'S', '3–5 d'],
  'CERT-P0-1': ['P0', 'M', '1–2 wk'], 'CERT-P0-2': ['P0', 'L', '2–3 wk'], 'CERT-P0-3': ['P0', 'XL', '3–4 wk'], 'CERT-P0-4': ['P0', 'L', '2–3 wk'],
  'CERT-P0-5': ['P0', 'XL', '4–6 wk'], 'CERT-P0-6': ['P0', 'XL', '4–6 wk'], 'CERT-P0-7': ['P0', 'M', '1 wk'],
  'CERT-P1-1': ['P1', 'XL', '6–8 wk'], 'CERT-P1-2': ['P1', 'M', '1–2 wk'], 'CERT-P1-3': ['P1', 'L', '2–3 wk'], 'CERT-P1-4': ['P1', 'L', '2 wk'],
  'CERT-P1-5': ['P1', 'M', '1–2 wk'], 'CERT-P1-6': ['P1', 'M', '1–2 wk'],
  'CERT-P2-1': ['P2', 'XL', '6+ wk'], 'CERT-P2-2': ['P2', 'L', '2–3 wk'], 'CERT-P2-3': ['P2', 'S', '3–5 d'], 'CERT-P2-4': ['P2', 'M', '2 wk'], 'CERT-P2-5': ['P2', 'M', '2 wk'], 'CERT-P2-6': ['P2', 'L', '2–3 wk'],
  'CERT-P3-1': ['P3', 'M', '2–3 wk'], 'CERT-P3-2': ['P3', 'M', '1–2 wk'], 'CERT-P3-3': ['P3', 'L', '3 wk'], 'CERT-P3-4': ['P3', 'L', '3–4 wk'],
};
const TIERS = ['Q', 'P0', 'P1', 'P2', 'P3'];
// item-level phase overrides (when a topic lists several phases, which phase fixes which item)
const ITEM_PH = {
  // CCNA v1.1
  '1.1.c': ['CERT-P2-6'], '1.1.d': ['CERT-P2-1'], '1.1.e': ['CERT-P2-1'], '1.1.g': ['CERT-P0-4', 'CERT-P1-2'], '1.1.h': ['CERT-P2-4'],
  '1.2.a': ['CERT-P0-6'], '1.2.b': ['CERT-P0-5', 'CERT-P0-6'], '1.2.c': ['CERT-P0-5'], '1.2.d': ['CERT-P0-3'], '1.2.e': ['CERT-P0-3', 'CERT-P0-4'], '1.2.f': [],
  '2.1.a': ['CERT-P1-5'], '3.1.a': ['CERT-P0-5'], '3.1.e': ['CERT-P0-7'], '3.1.f': ['CERT-P0-5'], '3.2.a': ['CERT-Q3'], '3.2.b': ['CERT-P0-7'], '3.2.c': ['CERT-P0-5'],
  '3.3.c': ['CERT-Q3'], '3.3.d': ['CERT-P0-7'], '3.3.v6': ['CERT-P1-1'], '4.3': ['CERT-P0-4', 'CERT-P1-2'], '4.5': ['CERT-P1-6'], '2.8': ['CERT-P0-1'],
  // v2.0
  'v2:1.3': ['CERT-P0-4'], 'v2:1.6': ['CERT-P2-3'], 'v2:2.1.c': ['CERT-P1-3'], 'v2:2.2.a': ['CERT-P2-4'], 'v2:2.2.b': ['CERT-P2-1'], 'v2:2.2.c': ['CERT-P1-5'], 'v2:2.2.e': ['CERT-P2-6'], 'v2:2.4': ['CERT-P3-4'],
  'v2:3.1': ['CERT-P0-5'], 'v2:3.2.c': ['CERT-Q3'], 'v2:3.2.d': ['CERT-P0-7'], 'v2:3.2.v6': ['CERT-P1-1'], 'v2:5.6': ['CERT-P1-6'],
  // Network+
  // concept-only bullets inside single-phase topics (a development phase would not make them practisable)
  '1.1-b5': ['CERT-Q2'], '1.1-b6': ['CERT-Q2'], '1.1-b7': ['CERT-Q2'],
  '1.2-b4': ['CERT-Q2'], '1.2-b5': ['CERT-Q2'], '1.2-b6': ['CERT-Q2'], '1.2-b8': ['CERT-Q2'], '1.2-b11': ['CERT-Q2'], '1.2-b12': ['CERT-Q2'], '1.2-b13': ['CERT-Q2'],
  '1.4-b1': ['CERT-Q2'], '1.4-b3': ['CERT-Q2'], '1.4-b4': ['CERT-Q2'], '1.4-b5': ['CERT-Q2'], '1.4-b6': ['CERT-Q2'], '1.4-b8': ['CERT-Q2'], '1.4-b9': ['CERT-Q2'],
  '1.5-b1': ['CERT-Q2'], '2.4-b3': ['CERT-Q2'], '2.4-b5': ['CERT-Q2'], '2.4-b7': ['CERT-Q2'],
  '3.1-b7': ['CERT-Q2'], '3.1-b8': ['CERT-Q2'], '3.1-b9': ['CERT-Q2'], '3.1-b10': ['CERT-Q2'],
  '1.1-b1': ['CERT-P2-4'], '1.1-b4': ['CERT-P3-4'], '1.2-b3': ['CERT-P2-6'], '1.2-b7': ['CERT-P0-4'], '1.2-b9': ['CERT-P2-1'], '1.2-b10': ['CERT-P2-1'], '1.4-b10': ['CERT-P3-4'],
  '1.6-b1': ['CERT-P0-6'], '1.6-b2': ['CERT-P0-6'], '1.6-b4': ['CERT-P0-5'], '1.6-b6': ['CERT-P0-6'], '1.6-b7': ['CERT-P0-6'], '1.7-b1': ['CERT-P0-4'], '1.7-b3': ['CERT-Q3'], '1.8-b6': ['CERT-P1-1'], '1.8-b5': ['CERT-P3-1'],
  '2.1-b2': ['CERT-P0-5'], '2.1-b3': ['CERT-P0-7'], '2.1-b4': ['CERT-Q3'], '2.1-b5': ['CERT-P0-5'], '2.1-b6': ['CERT-P0-3'], '2.1-b7': ['CERT-P2-2'], '2.1-b8': ['CERT-P2-2'],
  '2.2-b4': ['CERT-P1-5'], '2.2-b6': ['CERT-P1-3'], '2.2-b7': ['CERT-P1-5'], '2.2-b8': ['CERT-P1-5'], '2.2-b9': ['CERT-P0-6'], '2.2-b10': ['CERT-P1-5'],
  '2.4-b1': ['CERT-P2-5'], '2.4-b2': ['CERT-P2-5'], '2.4-b4': ['CERT-P2-5'], '2.4-b6': ['CERT-P2-5'],
  '3.1-b1': ['CERT-P2-5'], '3.1-b2': ['CERT-P2-5'], '3.1-b3': ['CERT-P2-5'], '3.1-b4': ['CERT-P2-5'], '3.1-b5': ['CERT-P2-5'], '3.1-b6': ['CERT-P2-5'], '3.1-b11': ['CERT-P2-5'],
  '3.2-b1': ['CERT-P1-6'], '3.2-b3': ['CERT-P3-4'], '3.2-b5': ['CERT-P1-6'], '3.2-b11': [], '3.2-b12': [],
  '3.4-b1': ['CERT-P0-4'], '3.4-b2': ['CERT-P1-1'], '3.4-b3': ['CERT-P1-2'], '3.4-b4': ['CERT-P1-2'], '3.4-b5': ['CERT-P1-6'],
  '3.5-b1': ['CERT-P3-2'], '3.5-b2': ['CERT-P3-2'], '3.5-b3': ['CERT-P0-1'], '3.5-b5': ['CERT-P3-1'],
  '4.1-b7': ['CERT-P0-2'], '4.3-b1': ['CERT-P0-1'], '4.3-b2': ['CERT-P0-1'], '4.3-b3': ['CERT-P1-4'], '4.3-b5': ['CERT-P0-2'], '4.3-b7': ['CERT-P2-6'],
  '5.2-b1': ['CERT-P2-4'], '5.2-b2': ['CERT-P2-4'], '5.2-b3': ['CERT-P2-4'], '5.2-b4': ['CERT-P1-5'], '5.2-b6': ['CERT-P1-5'], '5.2-b7': ['CERT-P2-4'], '5.2-b8': ['CERT-P2-4'],
  '5.3-b1': ['CERT-P0-6'], '5.3-b3': ['CERT-P0-2'], '5.3-b6': ['CERT-P0-4'],
  '5.4-b1': ['CERT-P3-3'], '5.4-b2': ['CERT-P3-3'], '5.4-b3': ['CERT-P3-3'], '5.4-b4': ['CERT-P3-3'], '5.4-b5': ['CERT-P3-3'], '5.4-b6': ['CERT-P2-1'],
  '3.2-b4': ['CERT-P3-3'], '3.2-b10': ['CERT-P3-3'], '3.2-b6': ['CERT-P3-1'], '5.5-b1': ['CERT-P3-4'], '5.5-b4': ['CERT-P1-2'], '5.5-b5': ['CERT-P3-4'], '5.5-b6': ['CERT-P2-3'], '5.5-b7': ['CERT-P2-3'], '5.5-b10': ['CERT-Q4'],
};

// ───────── scoring ─────────
const items = (topic) => (topic.subs ? topic.subs : [{ id: topic.id, t: topic.t, s: topic.s, n: topic.n }]);
function topicScore(topic, sc, over) {
  const vals = items(topic).map((i) => (over?.[i.id] ?? i.s)).filter((s) => s !== 'U').map((s) => sc[s]);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}
function score(exam, sc = SCORE, over = null, prefix = '') {
  const remap = over ? Object.fromEntries(Object.entries(over).filter(([k]) => k.startsWith(prefix)).map(([k, v]) => [k.slice(prefix.length), v])) : null;
  let tot = 0, wsum = 0, lab = 0, lwsum = 0;
  const domains = exam.domains.map((d) => {
    const ts = d.topics.map((t) => ({ id: t.id, rel: t.rel, s: topicScore(t, sc, remap) })).filter((x) => x.s !== null);
    const ds = ts.reduce((a, x) => a + x.s, 0) / ts.length;
    const rsum = ts.reduce((a, x) => a + REL[x.rel], 0);
    const ls = rsum > 0 ? ts.reduce((a, x) => a + REL[x.rel] * x.s, 0) / rsum : null;
    tot += d.w * ds; wsum += d.w;
    if (ls !== null) { lab += d.w * ls; lwsum += d.w; }
    return { id: d.id, name: d.name, w: d.w, score: ds, lab: ls, topics: ts.length, labTopics: ts.filter((x) => REL[x.rel] > 0).length };
  });
  return { overall: tot / wsum, lab: lab / lwsum, labDomainWeight: lwsum, domains };
}
function counts(exam) {
  const c = { V: 0, IU: 0, P: 0, D: 0, T: 0, M: 0, U: 0 }; let n = 0, topics = 0;
  for (const d of exam.domains) for (const t of d.topics) { topics++; for (const i of items(t)) { c[i.s]++; n++; } }
  return { c, n, topics };
}
// verified-only floor: only V counts
const VONLY = { V: 1, IU: 0, P: 0, D: 0, T: 0, M: 0 };
// uplift: cumulative by tier, upper bound (items fixed by a phase become V; CERT-Q2 turns M into T on describe-level topics; CERT-Q3 only fixes IU)
// An item is credited to a phase only if (a) it has an explicit item→phase mapping, or (b) its topic names exactly one
// development phase. In multi-phase topics, unmapped items are credited to no development phase (conservative), only to
// the content phase CERT-Q2 if the topic lists it.
function phasesOf(prefix, topic, item) {
  const k = prefix + item.id;
  if (ITEM_PH[k]) return ITEM_PH[k];
  const ph = topic.ph ?? [];
  const dev = ph.filter((p) => p !== 'CERT-Q1' && p !== 'CERT-Q2');
  return dev.length <= 1 ? ph : ph.filter((p) => p === 'CERT-Q2');
}
function upliftOver(exam, prefix, tierIdx) {
  const allowed = new Set(Object.keys(PHASE_META).filter((p) => TIERS.indexOf(PHASE_META[p][0]) <= tierIdx));
  const over = {};
  for (const d of exam.domains) for (const t of d.topics) for (const i of items(t)) {
    if (i.s === 'V') continue;
    const ph = phasesOf(prefix, t, i).filter((p) => allowed.has(p));
    if (!ph.length) continue;
    const real = ph.filter((p) => p !== 'CERT-Q2' && p !== 'CERT-Q1');
    if (real.length) {
      if (real.every((p) => p === 'CERT-Q3') && i.s !== 'IU') { /* Q3 only verifies existing behaviour */ } else { over[prefix + i.id] = 'V'; continue; }
    }
    if (ph.includes('CERT-Q2') && i.s === 'M' && t.rel === 'L') over[prefix + i.id] = 'T';
  }
  return over;
}
const pct = (x) => (x === null || x === undefined ? 'n/a' : (100 * x).toFixed(1) + '%');

const exams = [['ccna11', CCNA11, ''], ['ccna20', CCNA20, 'v2:'], ['nplus', NPLUS, '']];
const result = {};
for (const [k, ex, prefix] of exams) {
  const base = score(ex);
  result[k] = {
    proposed: base, strict: score(ex, SCENARIOS.strict), lenient: score(ex, SCENARIOS.lenient), verifiedOnly: score(ex, VONLY),
    counts: counts(ex),
    uplift: TIERS.map((tier, idx) => { const o = upliftOver(ex, prefix, idx); const s = score(ex, SCORE, o, prefix); return { tier, overall: s.overall, lab: s.lab, changed: Object.keys(o).length }; }),
  };
}
const shared = SHARED.map(([name, s, c, n]) => ({ name, s, c, n }));
result.shared = { clusters: shared, score: shared.reduce((a, x) => a + SCORE[x.s], 0) / shared.length, strict: shared.reduce((a, x) => a + SCENARIOS.strict[x.s], 0) / shared.length, lenient: shared.reduce((a, x) => a + SCENARIOS.lenient[x.s], 0) / shared.length };
// per-phase upper-bound uplift (each phase alone)
result.phaseAlone = Object.keys(PHASE_META).map((p) => {
  const row = { phase: p };
  for (const [k, ex, prefix] of exams) {
    const over = {};
    for (const d of ex.domains) for (const t of d.topics) for (const i of items(t)) {
      if (i.s === 'V') continue;
      const ph = phasesOf(prefix, t, i);
      if (!ph.includes(p)) continue;
      if (p === 'CERT-Q2') { if (i.s === 'M' && t.rel === 'L') over[prefix + i.id] = 'T'; }
      else if (p === 'CERT-Q3') { if (i.s === 'IU') over[prefix + i.id] = 'V'; }
      else if (p !== 'CERT-Q1') over[prefix + i.id] = 'V';
    }
    const s = score(ex, SCORE, over, prefix);
    row[k] = { d: s.overall - result[k].proposed.overall, dl: s.lab - result[k].proposed.lab, n: Object.keys(over).length };
  }
  return row;
});
writeFileSync(`${OUT}/scores.json`, JSON.stringify(result, null, 1));

// ───────── rendering ─────────
const evList = (keys) => (keys && keys.length ? keys.map((k) => `\`${k}\` ${EV[k]}`).join('<br>') : '—');
// unit vs e2e columns: keep only the "; "-separated segments of each evidence text that start with the given folder
function evPart(keys, folder) {
  const out = [];
  for (const k of keys || []) {
    let open = false; // true while the current file segment belongs to `folder`
    for (const seg of String(EV[k]).split('; ')) {
      if (/^(tests|e2e|src)\//.test(seg)) {
        open = seg.startsWith(folder);
        if (open) out.push(`\`${k}\` ${seg}`);
      } else if (open) out[out.length - 1] += `; ${seg}`; // continuation (e.g. ":75") of the same file
    }
  }
  return out.length ? [...new Set(out)].join('<br>') : '—';
}
const st = (s) => `${STATUS_NAME[s]}`;
const phTxt = (ph) => (ph && ph.length ? ph.join(', ') : '—');
const prioOf = (ph) => { const t = (ph || []).map((p) => PHASE_META[p]?.[0]).filter(Boolean); for (const x of ['P0', 'P1', 'P2', 'P3', 'Q']) if (t.includes(x)) return x === 'Q' ? 'Quick win' : x; return '—'; };
const cxOf = (ph) => { const o = ['S', 'M', 'L', 'XL']; let m = -1; for (const p of ph || []) m = Math.max(m, o.indexOf(PHASE_META[p]?.[1])); return m < 0 ? '—' : o[m]; };

function legend() {
  return `## Status definitions and scores (identical in all certification reports)

| Status | Meaning | Score (proposed) | Strict | Lenient |
|---|---|---:|---:|---:|
| VERIFIED | Behaviour exists and an automated test exercises it against the real engine | 1.00 | 1.00 | 1.00 |
| IMPLEMENTED_UNVERIFIED | Behaviour exists (verified by reading code / a read-only probe) but no test asserts it | 0.75 | 0.50 | 1.00 |
| PARTIAL | Only part of the required behaviour exists | 0.40 | 0.25 | 0.60 |
| DIAGRAM_ONLY | Can be drawn / cabled, not simulated | 0.15 | 0.00 | 0.25 |
| THEORY_ONLY | Explained in the app, cannot be practised | 0.10 | 0.00 | 0.20 |
| MISSING | No meaningful implementation | 0.00 | 0.00 | 0.00 |
| UNKNOWN | Evidence insufficient — excluded from numerator and denominator, reported separately | — | — | — |

These scores are audit assumptions, not official certification scoring. **VERIFIED ≠ real-device fidelity**: it means the simulator's behaviour is exercised by tests; the simulator itself is an approximation of IOS / AOS-CX / Windows.

**Lab relevance:** H = hands-on configure/verify/troubleshoot (weight 1.0), M = interpret/observe behaviour (0.5), L = describe/explain/compare (0.0 — excluded from the Lab score).
`;
}

function domainTable(r) {
  let s = '| Domain | Official weight | Topics | Training coverage | Lab coverage (relevance-weighted) |\n|---|---:|---:|---:|---:|\n';
  for (const d of r.proposed.domains) s += `| ${d.id} ${d.name} | ${d.w}% | ${d.topics} | ${pct(d.score)} | ${d.lab === null ? 'n/a (no H/M topics)' : pct(d.lab)} |\n`;
  s += `| **Weighted total** | 100% | | **${pct(r.proposed.overall)}** | **${pct(r.proposed.lab)}** |\n`;
  return s;
}

function ccnaMatrix() {
  const r = result.ccna11, r2 = result.ccna20;
  let s = `# CCNA Objective Matrix — Network Lab Studio

> Generated 2026-11-13 from \`certification-audit/scripts/model.mjs\` by \`gen.mjs\`. Audit evidence at main \`950fb0c\` (CERT-Q4a CDP evidence update; CERT-Q3 at \`3e00c13\`).
> **Exam:** ${CCNA11.name} **${CCNA11.version}** — ${CCNA11.source}
> **Separate model:** ${CCNA20.name} **${CCNA20.version}** (section B) — ${CCNA20.source}. v1.1 and v2.0 are never mixed in one score.
> Objective wording is **paraphrased**; IDs, hierarchy and weights are official. Sub-objective \`3.3.v6\` is a **derived** item (the official 3.3 covers IPv4 *and* IPv6).

${legend()}

# A. CCNA 200-301 v1.1

## A.1 Coverage by domain

${domainTable(r)}
Item counts: ${Object.entries(r.counts.c).map(([k, v]) => `${STATUS_NAME[k]} ${v}`).join(' · ')} — **${r.counts.n} assessed items** in **${r.counts.topics} numbered topics** (UNKNOWN = ${r.counts.c.U}).

## A.2 Compact matrix (every topic and sub-topic)

| Cert | Ver | Domain (weight) | ID | Summary (paraphrased) | Outcome | Lab rel. | Status | Score | Priority | Phase(s) | Shared CCNA+N+ |
|---|---|---|---|---|---|:-:|---|---:|---|---|:-:|
`;
  for (const d of CCNA11.domains) for (const t of d.topics) {
    const ts = topicScore(t, SCORE);
    if (t.subs) {
      s += `| CCNA | v1.1 | ${d.id} (${d.w}%) | **${t.id}** | **${t.t}** | ${t.out} | ${t.rel} | *(mean of subs)* | **${ts.toFixed(2)}** | ${t.prio} | ${phTxt(t.ph)} | ${t.shared} |\n`;
      for (const i of t.subs) s += `| CCNA | v1.1 | ${d.id} | ${i.id}${i.derived ? ' *(derived)*' : ''} | ${i.t}${i.n ? ` — _${i.n}_` : ''} | | | ${st(i.s)} | ${SCORE[i.s].toFixed(2)} | | ${phTxt(ITEM_PH[i.id] ?? [])} | |\n`;
    } else s += `| CCNA | v1.1 | ${d.id} (${d.w}%) | **${t.id}** | ${t.t} | ${t.out} | ${t.rel} | ${st(t.s)} | ${ts.toFixed(2)} | ${t.prio} | ${phTxt(t.ph)} | ${t.shared} |\n`;
  }
  s += `\n## A.3 Objective cards (all 24 required fields)\n\nEvidence keys are expanded in \`CERTIFICATION_EVIDENCE_INDEX.md\`; they are repeated here for convenience.\n\n`;
  for (const d of CCNA11.domains) for (const t of d.topics) {
    const ts = topicScore(t, SCORE);
    const statusTxt = t.subs ? t.subs.map((i) => `${i.id} ${STATUS_NAME[i.s]}`).join('; ') : STATUS_NAME[t.s];
    s += `### ${t.id} — ${t.t}

| # | Field | Value |
|---:|---|---|
| 1 | Certification | Cisco CCNA |
| 2 | Exam version | 200-301 v1.1 |
| 3 | Domain | ${d.id} ${d.name} |
| 4 | Domain weight | ${d.w}% |
| 5 | Objective ID | ${t.id}${t.subs ? ` (sub-topics ${t.subs.map((i) => i.id).join(', ')})` : ''} |
| 6 | Objective summary | ${t.t} (paraphrase) |
| 7 | Learning outcome | ${t.out} |
| 8 | Lab relevance | ${t.rel} (${REL[t.rel]}) |
| 9 | Required simulation behaviour | ${t.req} |
| 10 | Existing application capability | ${t.cap} |
| 11 | Device support | ${t.dev} |
| 12 | CLI support | ${t.cli} |
| 13 | Source file evidence | ${evList(t.src)} |
| 14 | Unit test evidence | ${evPart([...(t.unit||[]), ...(t.e2e||[])], 'tests/')} |
| 15 | E2E test evidence | ${evPart([...(t.unit||[]), ...(t.e2e||[])], 'e2e/')} |
| 16 | Production verification evidence | ${evList(t.prod)} |
| 17 | Coverage status | ${statusTxt} |
| 18 | Coverage score | ${ts.toFixed(2)} |
| 19 | Missing functionality | ${t.miss} |
| 20 | Missing test coverage | ${t.mtests} |
| 21 | Recommended implementation | ${t.rec} |
| 22 | Estimated complexity | ${t.cx} |
| 23 | Development priority | ${t.prio} |
| 24 | Shared benefit CCNA + Network+ | ${t.shared === 'Y' ? 'Yes' : 'No'} |

`;
  }
  s += `# B. CCNA 200-301 v2.0 (separate model — upcoming)

Official v2.0 exam topics (© 2026 Cisco) retrieved 2026-11-13. **Dates are NOT in the official PDF**: secondary sources (training vendors) report publication at Cisco Live on 2026-05-20, last v1.1 test date 2027-02-02 and first v2.0 test date 2027-02-03 — treat as unverified until confirmed on Cisco's site.

## B.1 Structural changes v1.1 → v2.0 (from the two official PDFs)

| Area | v1.1 | v2.0 |
|---|---|---|
| Domains | 6: Fundamentals 20, Access 20, IP Connectivity 25, IP Services 10, Security 15, Automation 10 | 5: Infrastructure & Connectivity 25, Switching & Access 25, IP Routing 20, Services & Security 20, AI & Operations 10 |
| Verbs | Many "describe/explain" | Many more "troubleshoot / diagnose / configure" (1.1, 1.3, 1.4, 1.6, 1.7, 2.4, 3.2, 4.4) — favours a simulator |
| New topics | — | DHCPv4 server troubleshooting (1.7), OSPFv3 (3.3), HSRP/VRRP status (3.4), AAA client (4.1), SFTP/SCP (4.2), NAT/PAT on IOS XE (4.3), DNS record diagnosis (4.4), standard/extended/named ACLs (4.6), storm control + RA guard (4.7.c/d), agentic/generative AI prompts (5.1–5.2), Ansible execution (5.5), packet capture / extended ping / show logs (2.4) |
| Removed / folded | TCP vs UDP (1.5), topology architectures (1.2), virtualization VRFs, REST/JSON (6.5, 6.7), QoS (4.7), TFTP/FTP (4.9), wireless GUI (2.9, 5.10), many security "describe" items | — |

## B.2 Coverage by domain (v2.0 model)

${domainTable(r2)}
Item counts: ${Object.entries(r2.counts.c).map(([k, v]) => `${STATUS_NAME[k]} ${v}`).join(' · ')} — **${r2.counts.n} items** in **${r2.counts.topics} topics**.

## B.3 Compact matrix (v2.0)

| Cert | Ver | Domain (weight) | ID | Summary (paraphrased) | Lab rel. | Status | Score | Phase(s) |
|---|---|---|---|---|:-:|---|---:|---|
`;
  for (const d of CCNA20.domains) for (const t of d.topics) {
    const ts = topicScore(t, SCORE);
    if (t.subs) {
      s += `| CCNA | v2.0 | ${d.id} (${d.w}%) | **${t.id}** | **${t.t}** | ${t.rel} | *(mean of subs)* | **${ts.toFixed(2)}** | ${phTxt(t.ph)} |\n`;
      for (const i of t.subs) s += `| CCNA | v2.0 | ${d.id} | ${i.id}${i.derived ? ' *(derived)*' : ''} | ${i.t}${i.n ? ` — _${i.n}_` : ''} | | ${st(i.s)} | ${SCORE[i.s].toFixed(2)} | ${phTxt(ITEM_PH['v2:' + i.id] ?? [])} |\n`;
    } else s += `| CCNA | v2.0 | ${d.id} (${d.w}%) | **${t.id}** | ${t.t}${t.n ? ` — _${t.n}_` : ''} | ${t.rel} | ${st(t.s)} | ${ts.toFixed(2)} | ${phTxt(t.ph)} |\n`;
  }
  s += `\nv2.0 evidence uses the same evidence keys as the equivalent v1.1 rows (e.g. v2.0 2.1.a/b/d ↔ v1.1 2.1/2.2; 3.2 ↔ 3.3). v2.0 cards are abbreviated because the v2.0 exam is not yet live.\n`;
  return s;
}

const NDEV = {
  '1.1': ['all simulated devices', 'show/ping/traceroute'], '1.2': ['routers, switches, nas(partial), firewall/AP(diagram)', 'ping (TTL)'], '1.3': ['—', '—'], '1.4': ['hosts, routers', 'ping'], '1.5': ['—', '—'],
  '1.6': ['routers, L3/L2 switches, hosts', 'ip address, ip route'], '1.7': ['all IP devices', 'ip address, PC IP form, ipconfig'], '1.8': ['—', '—'],
  '2.1': ['routers, AOS-CX switches', 'ip route, encapsulation dot1Q, show ip route'], '2.2': ['cisco-switch, aruba-switch, l3-switch', 'vlan, switchport, vlan access/trunk, interface vlan'], '2.3': ['wireless-ap(diagram)', '—'], '2.4': ['rack, ups, patch-panel (diagram)', '—'],
  '3.1': ['all (canvas)', 'show running-config, write memory, copy run start, export/import'], '3.2': ['—', 'Inspector, challenge checks'], '3.3': ['—', '—'], '3.4': ['server(partial)', 'ipconfig (DHCP Enabled: No)'], '3.5': ['routers, switches', 'console CLI'],
  '4.1': ['switches, IoT endpoints', 'switchport access vlan'], '4.2': ['—', '—'], '4.3': ['switches, firewall(diagram)', 'shutdown'],
  '5.1': ['all', 'Challenge Check, hints'], '5.2': ['switches, routers', 'shutdown/no shutdown, show interfaces'], '5.3': ['switches, routers, hosts', 'show vlan, show ip route, ipconfig, ping'], '5.4': ['—', '—'], '5.5': ['all', 'ping, tracert, arp -a, show mac/route/interface/config/arp/vlan'],
};
function nplusMatrix() {
  const r = result.nplus;
  let s = `# Network+ Objective Matrix — Network Lab Studio

> Generated 2026-11-13 from \`certification-audit/scripts/model.mjs\` by \`gen.mjs\`. Audit evidence at main \`950fb0c\` (CERT-Q4a CDP evidence update; CERT-Q3 at \`3e00c13\`).
> **Exam:** ${NPLUS.name} **${NPLUS.version}** — ${NPLUS.source}
> CompTIA numbers objectives 1.1–5.5. **Bullet IDs such as \`2.2-b3\` are derived** (order of top-level bullets in the official document) so that each meaningful sub-objective can be assessed. Wording is paraphrased.

${legend()}

## 1. Coverage by domain

${domainTable(r)}
Item counts: ${Object.entries(r.counts.c).map(([k, v]) => `${STATUS_NAME[k]} ${v}`).join(' · ')} — **${r.counts.n} assessed bullets** in **${r.counts.topics} objectives**.

## 2. Compact matrix

| Cert | Ver | Domain (weight) | ID | Summary (paraphrased) | Outcome | Lab rel. | Status | Score | Priority | Phase(s) |
|---|---|---|---|---|---|:-:|---|---:|---|---|
`;
  for (const d of NPLUS.domains) for (const t of d.topics) {
    s += `| N+ | N10-009 | ${d.id} (${d.w}%) | **${t.id}** | **${t.t}** | ${t.out} | ${t.rel} | *(mean)* | **${topicScore(t, SCORE).toFixed(2)}** | ${prioOf(t.ph)} | ${phTxt(t.ph)} |\n`;
    for (const i of t.subs) s += `| N+ | N10-009 | ${d.id} | ${i.id} | ${i.t}${i.n ? ` — _${i.n}_` : ''} | | | ${st(i.s)} | ${SCORE[i.s].toFixed(2)} | ${prioOf(ITEM_PH[i.id] ?? (i.s === 'V' ? [] : t.ph))} | ${phTxt(ITEM_PH[i.id] ?? (i.s === 'V' ? [] : t.ph))} |\n`;
  }
  s += `\n## 3. Objective cards (all 24 required fields)\n\n`;
  const sharedIds = new Set(SHARED.flatMap((x) => String(x[3]).split('/').map((y) => y.trim())));
  for (const d of NPLUS.domains) for (const t of d.topics) {
    const have = t.subs.filter((i) => ['V', 'IU', 'P', 'D'].includes(i.s));
    const miss = t.subs.filter((i) => ['P', 'D', 'M', 'T'].includes(i.s));
    const unitKeys = (t.ev || []).filter((k) => k.startsWith('t.'));
    const srcKeys = (t.ev || []).filter((k) => k.startsWith('s.'));
    const e2eKeys = unitKeys.filter((k) => /e2e\//.test(EV[k]));
    s += `### ${t.id} — ${t.t}

| # | Field | Value |
|---:|---|---|
| 1 | Certification | CompTIA Network+ |
| 2 | Exam version | N10-009 (objectives v4.0) |
| 3 | Domain | ${d.id} ${d.name} |
| 4 | Domain weight | ${d.w}% |
| 5 | Objective ID | ${t.id} (derived bullets ${t.subs[0].id} … ${t.subs[t.subs.length - 1].id}) |
| 6 | Objective summary | ${t.t} (paraphrase) |
| 7 | Learning outcome | ${t.out} |
| 8 | Lab relevance | ${t.rel} (${REL[t.rel]}) |
| 9 | Required simulation behaviour | Practisable behaviour for each bullet: ${t.subs.map((i) => i.t).join('; ')} |
| 10 | Existing application capability | ${have.length ? have.map((i) => `${i.t} (${STATUS_NAME[i.s]}${i.n ? `: ${i.n}` : ''})`).join('; ') : 'None'} |
| 11 | Device support | ${NDEV[t.id][0]} |
| 12 | CLI support | ${NDEV[t.id][1]} |
| 13 | Source file evidence | ${evList(srcKeys)} |
| 14 | Unit test evidence | ${evPart(unitKeys, 'tests/')} |
| 15 | E2E test evidence | ${evPart(unitKeys, 'e2e/')} |
| 16 | Production verification evidence | ${have.some((i) => i.s === 'V') && unitKeys.length ? evList(['p.smoke']) : '—'} |
| 17 | Coverage status | ${t.subs.map((i) => `${i.id} ${STATUS_NAME[i.s]}`).join('; ')} |
| 18 | Coverage score | ${topicScore(t, SCORE).toFixed(2)} |
| 19 | Missing functionality | ${miss.length ? miss.map((i) => i.t).join('; ') : '—'} |
| 20 | Missing test coverage | ${t.subs.filter((i) => i.s === 'IU').map((i) => i.t).join('; ') || '—'} |
| 21 | Recommended implementation | ${t.ph.map((p) => `${p} (${PHASES[p]})`).join('; ') || '—'} |
| 22 | Estimated complexity | ${cxOf(t.ph)} |
| 23 | Development priority | ${prioOf(t.ph)} |
| 24 | Shared benefit CCNA + Network+ | ${sharedIds.has(t.id) ? 'Yes' : 'Partly / No'} |

`;
  }
  return s;
}

writeFileSync(`${OUT}/CCNA_OBJECTIVE_MATRIX.md`, ccnaMatrix());
writeFileSync(`${OUT}/NETWORK_PLUS_OBJECTIVE_MATRIX.md`, nplusMatrix());
console.log(JSON.stringify({
  ccna11: { overall: pct(result.ccna11.proposed.overall), lab: pct(result.ccna11.proposed.lab), strict: pct(result.ccna11.strict.overall), lenient: pct(result.ccna11.lenient.overall), vonly: pct(result.ccna11.verifiedOnly.overall), labStrict: pct(result.ccna11.strict.lab), labLenient: pct(result.ccna11.lenient.lab), labV: pct(result.ccna11.verifiedOnly.lab), counts: result.ccna11.counts },
  ccna20: { overall: pct(result.ccna20.proposed.overall), lab: pct(result.ccna20.proposed.lab), strict: pct(result.ccna20.strict.overall), lenient: pct(result.ccna20.lenient.overall), vonly: pct(result.ccna20.verifiedOnly.overall) },
  nplus: { overall: pct(result.nplus.proposed.overall), lab: pct(result.nplus.proposed.lab), strict: pct(result.nplus.strict.overall), lenient: pct(result.nplus.lenient.overall), vonly: pct(result.nplus.verifiedOnly.overall), labStrict: pct(result.nplus.strict.lab), labLenient: pct(result.nplus.lenient.lab), labV: pct(result.nplus.verifiedOnly.lab), counts: result.nplus.counts },
  shared: { proposed: pct(result.shared.score), strict: pct(result.shared.strict), lenient: pct(result.shared.lenient) },
  uplift: { ccna11: result.ccna11.uplift.map((u) => `${u.tier}:${pct(u.overall)}/${pct(u.lab)}`), ccna20: result.ccna20.uplift.map((u) => `${u.tier}:${pct(u.overall)}/${pct(u.lab)}`), nplus: result.nplus.uplift.map((u) => `${u.tier}:${pct(u.overall)}/${pct(u.lab)}`) },
}, null, 1));
