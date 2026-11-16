# certification-audit/: reproducibility package for the Certification Gap Analysis

> **Audit date:** 2026-11-13 (CERT-P0-1a update 2026-11-16, §9) · **Audited code:** main `51251c0ed46ac45706d6b140c89e2f0071c1135e` (CERT-P0-1a evidence update, §9; CERT-Q4a at `950fb0c5639a4e0df1b24e30a71341c0438be468`, §8; CERT-Q3 update at `3e00c13`, §7; original inventory/probes at `dcbf4cb`, endpoint tests at `3c9aed7`; historical snapshots retained)
> **Status:** not committed (local only) · not part of the application build, the unit suite (`vite.config.ts` only includes `tests/**`), TypeScript (`tsconfig.json` includes `src`, `tests`) or Playwright (`e2e/`)
> **Dependencies:** none added. Scripts are plain Node ESM (Node ≥ 18; checked with v24.15.0). The probes use the project's existing dev dependency `vitest`.

This folder keeps everything needed to recompute the published coverage figures after the original temporary working directory (the Claude Code session scratchpad) is gone.

## 1. Published reports (repository root)

| Report | Role |
|---|---|
| `CERTIFICATION_GAP_ANALYSIS.md` | Methodology, published scores (§1, §5), shared-capability counts (§5.4), gaps, QC |
| `CCNA_OBJECTIVE_MATRIX.md` | **Generated** by `scripts/gen.mjs`: CCNA v1.1 (§A) and v2.0 (§B) |
| `NETWORK_PLUS_OBJECTIVE_MATRIX.md` | **Generated** by `scripts/gen.mjs`: Network+ N10-009 |
| `CERTIFICATION_DEVELOPMENT_ROADMAP.md` | Phase uplift tables (copied from `data/scores.json` → `phaseAlone`, `uplift`) |
| `CERTIFICATION_LAB_CURRICULUM.md` | Lab catalogue (hand-written) |
| `CERTIFICATION_EVIDENCE_INDEX.md` | Sources, probes, assumptions; sections E.1–E.4 **generated** by `scripts/evidx.mjs` |

## 2. Exam versions and sources (retrieved 2026-11-13)

| Exam | Version | Source | sha256 of the PDF used |
|---|---|---|---|
| Cisco CCNA 200-301 | **v1.1** (© 2024): 6 domains, 53 topics | https://learningcontent.cisco.com/documents/marketing/exam-topics/200-301-CCNA-v1.1.pdf (official) | `da15a22dda1afb61af1a14a53264eea6b87d81e8a3036dbaa69cb1b6260bebd5` |
| Cisco CCNA 200-301 | **v2.0** (© 2026): 5 domains, 29 topics, separate model | https://learningcontent.cisco.com/documents/marketing/exam-topics/200-301_CCNA_v2.0_Exam_Topics_PDF.pdf (official) | `5f0bf00d2d459c1f2b52c54c9680fd7c5bb261b6842641a1f445fb0a0ca9923e` |
| CompTIA Network+ | **N10-009**, Exam Objectives v4.0 (© 2023): 5 domains, 25 objectives | https://onlc.com/comptia/n10-009-exam-objectives.pdf (CompTIA document hosted by a training partner) · weights cross-checked on https://www.comptia.org/certifications/network | `2c6c73e412ee6e6c5827f3b231a8b6592286d9061918bf0dec97537473ac3e01` |

- The PDFs are **not** stored here (copyright). Download them from the URLs above and compare the sha256.
- Objective wording in the reports is paraphrased. IDs, hierarchy and weights are official. Network+ bullet IDs (`2.2-b3`) and CCNA `3.3.v6` / `3.2.v6` are **derived**.
- **Unverified (secondary sources):** CCNA v2.0 dates (published 2026-05-20, last v1.1 test 2027-02-02, first v2.0 test 2027-02-03). PDFs on CompTIA's own domains returned HTML when fetched.

## 3. Methodology (summary; full text in `CERTIFICATION_GAP_ANALYSIS.md` §4)

```
status score   VERIFIED 1.00 · IMPLEMENTED_UNVERIFIED 0.75 · PARTIAL 0.40 · DIAGRAM_ONLY 0.15 · THEORY_ONLY 0.10 · MISSING 0
               (strict: 1/.50/.25/0/0/0 · lenient: 1/1.0/.60/.25/.20/0) · UNKNOWN excluded from numerator and denominator
topic score  = mean of its sub-topic / bullet scores
domain score = mean of its topic scores                       (topics weigh the same inside a domain — assumption)
OVERALL      = Σ w_d × domain_d / Σ w_d                        (w_d = official domain weight)
LAB_d        = Σ rel_t × topic_t / Σ rel_t   (rel H=1, M=0.5, L=0)
LAB          = Σ w_d × LAB_d / Σ w_d over domains with Σ rel_t > 0
VERIFIED-only floor = OVERALL with VERIFIED=1, every other status 0 · confidence = floor / OVERALL
SHARED       = mean status score of the 32 capability clusters present in both CCNA v1.1 and N10-009
roadmap uplift = recompute with the items a phase fixes set to VERIFIED (upper bound; Q2 only M→THEORY_ONLY on L topics;
                 Q3 only IMPLEMENTED_UNVERIFIED→VERIFIED; in multi-phase topics only explicitly mapped items are credited)
```

Assumptions D1–D7 are listed in `CERTIFICATION_EVIDENCE_INDEX.md` §D.

## 4. Contents

| Path | What it is | Changed vs. the original scratchpad copy? |
|---|---|---|
| `scripts/model.mjs` | Every objective of the three exams with status, evidence keys, Lab relevance, phases; evidence dictionary; scoring tables | CERT-Q3: only four IU → V items, supporting evidence keys and notes updated; scoring tables unchanged · CERT-Q4a: three items + one shared cluster M → P, evidence keys `s.cdp`/`t.cdp`/`p.cdp`, baseline labels on `s.cisco`/`s.syslog` line refs; scoring tables unchanged |
| `scripts/gen.mjs` | Scoring + generator of both matrices and `scores.json` (`node gen.mjs <outDir>`) | CERT-Q3 and CERT-Q4a: generated-report provenance header only; scoring algorithm and phase mapping unchanged |
| `scripts/qc.mjs` | Counts, duplicate IDs, weight sums, and existence of every evidence reference (174 originally · 193 after CERT-Q3 · 209 after CERT-Q4a) | Paths only: repository root is now resolved relative to the script |
| `scripts/evidx.mjs` | Generates E.1–E.4 of the evidence index (`node evidx.mjs <outDir>`) | Paths only: reads `data/inventory.json`, output dir is an argument |
| `scripts/recompute-from-matrices.mjs` | **Independent** recomputation from the saved matrix reports (parses statuses, relevance, weights and the score table from the reports; does not import `model.mjs`) compared with `data/expected-scores.json` | New (2026-11-13) |
| `scripts/verify.mjs` | Runs every check below; exit code 0 = reproducible | New |
| `probes/inventory.test.ts`, `probes/probe.test.ts`, `probes/vitest.config.mjs` | Read-only dumps of `PROFILES` / `SPECS` / `SAMPLES` and the CLI probes (host route, floating static, enable secret, router ospf, ipv6, show cdp, show logging) | Tests unchanged · config new (relative alias to `src/`) |
| `data/inventory.json`, `data/probe.json` | Outputs of the probes on 2026-11-13 | No |
| `data/test-titles.txt`, `data/evidence-grep.txt` | Test declarations (`file:line \| title`, 534) and keyword grep used to find evidence | No |
| `data/scores.json` | Full output of `gen.mjs` (all scenarios, per-phase and cumulative uplift) | Regenerated after CERT-Q3 and after CERT-Q4a |
| `data/expected-scores.json` | Figures **as published** in the gap analysis, entered by hand | New |
| `MANIFEST.sha256` | sha256 of every file above (except itself) | New |

## 5. How to reproduce

From the repository root (or anywhere; paths are resolved from the script location):

```bash
node certification-audit/scripts/verify.mjs          # all checks, exit 0 = reproducible
node certification-audit/scripts/recompute-from-matrices.mjs   # figure-by-figure table (published vs recomputed)
node certification-audit/scripts/gen.mjs <outDir>     # regenerate matrices + scores.json into <outDir>
node certification-audit/scripts/qc.mjs               # needs git and commit 3c9aed7 available locally

# re-run the read-only probes against the current source (writes only the two files given):
INV_OUT=/tmp/inventory.json PROBE_OUT=/tmp/probe.json npx vitest run -c certification-audit/probes/vitest.config.mjs
```

**Expected on 2026-11-13:** `verify.mjs` reports 7/7 passed · `recompute-from-matrices.mjs` reports 65/65 figures reproduced, 0 structural problems · probes regenerate `data/inventory.json` and `data/probe.json` byte-identically.

## 6. Rules for future updates
- **Never edit `data/expected-scores.json` to make a check pass.** If a recomputation differs, report the discrepancy.
- A change to a status is a change to `scripts/model.mjs`, followed by `gen.mjs` (regenerate the matrices), then update the published figures in the gap analysis **and** `expected-scores.json` in the same change, with the reason recorded.
- Evidence references must keep passing `qc.mjs`. A renamed or moved test or source line is a QC failure, not something to silence.
- These files and the reports stay uncommitted unless the project owner approves committing them.

## 7. CERT-Q3 update record (2026-11-13)

Four evidence-backed IU → VERIFIED changes only: CCNA v1.1 3.2.a / 3.3.c, v2.0 3.2.c, N10-009 2.1-b4. See `CERTIFICATION_GAP_ANALYSIS.md` §11 for the decision, prior/current scores, rounding explanation and limitations. All other objective classifications, weights, relevance, shared clusters and scoring formulas are preserved. F-1 through F-7 remain open; syslog stays PARTIAL.

`gen.mjs` regenerates both matrices and `data/scores.json`; `evidx.mjs` regenerates only E.1–E.4 of the evidence index. Published gap-analysis figures and manually maintained `expected-scores.json` were updated together from reviewed calculation results. The manifest was refreshed for exactly the changed package files, not to conceal unrelated changes. Historical inventory, probe, test-title and grep snapshots are unchanged; new test evidence is in the model dictionary.

CERT-Q3 remaining uplift is zero because its four changes are now included in the baseline; full-Q4 upper-bound projections are not an approval or score award for Q4a. The checkpoint contains the next design gate. No application code changed; no commit/push/merge/deploy.

## 8. CERT-Q4a update record (2026-11-13)

Evidence is from main = production `950fb0c` (Cisco `show cdp neighbors [detail]`, a read-only topology view).

**Status changes (MISSING → PARTIAL):**
- CCNA v1.1 2.3
- CCNA v2.0 2.3
- N10-009 5.5-b10
- the shared cluster "CDP/LLDP"

**Why PARTIAL and not VERIFIED:** LLDP and CDP/LLDP configuration are not implemented, and the objectives require them. No item became VERIFIED, so the verified-only floor is unchanged.

**Reviewed but unchanged:** N10-009 3.2-b8 (network discovery) and syslog.

**Published figures:**

| Score | Before | After |
|---|---|---|
| CCNA v1.1 | 19.0 / Lab 27.4 | 19.9 / Lab 29.2 |
| CCNA v2.0 | 15.4 / 17.6 | 17.4 / 19.6 |
| N10-009 | 20.6 / 28.2 | 20.7 / 28.4 |
| Shared | 28.0 | 29.2 |

The decision record is in `CERTIFICATION_GAP_ANALYSIS.md` §12.

**Files changed:**
- `scripts/model.mjs`: statuses, notes, evidence keys, and baseline labels on line refs.
- `scripts/gen.mjs`: two provenance lines only.
- Regenerated with the unchanged scripts: `data/scores.json`, both matrices, and evidence index E.1.
- `data/expected-scores.json`: updated by hand from the reviewed published figures.
- `MANIFEST.sha256`: refreshed for the changed package files only.

**Unchanged:**
- formulas, weights, relevance, objective IDs and phase mappings
- the historical `data/inventory.json` and `probe.json` (both at `dcbf4cb`; the probe still shows `show cdp neighbors` rejected), `test-titles.txt` and `evidence-grep.txt`

**Verification results:**
- `verify.mjs`: 7/7
- `recompute-from-matrices.mjs`: 65/65
- `qc.mjs`: 209 references, 0 problems

No application code or tests were changed, and nothing was committed, pushed, merged or deployed.

## 9. CERT-P0-1a update record (2026-11-16)

Evidence is from main = production `51251c0` (Cisco `enable secret` with a hidden `Password:` prompt, type 5 hash, redaction on every device).

**Status change (MISSING → PARTIAL):** CCNA v1.1 5.3 only. Why not VERIFIED: line console/vty passwords, `login local` and `username` are required and do not exist.

**Reviewed but unchanged:** CCNA v1.1 4.8, 2.8, 5.4; v2.0 4.1, 4.2; N10-009 3.5-b3, 4.3-b2, 4.1-b1; the shared cluster "SSH / management access". 4.8's capability text was corrected (it said "enable secret rejected").

**Evidence reference repair:** `s.persist` `validateLab()` l.211 → l.216, `serializeExport()` l.223 → l.242, `parseImport()` l.227 → l.246. Claims verified against the source; only line numbers changed. Before the repair `verify.mjs` was 6/7 (check 4, 3 problems).

**New evidence keys:** `s.secret`, `s.enable`, `s.credin`, `t.secret`, `t.secfix`, `t.secretE2E`, `p.p01a`.

**Published figures:**

| Score | Before | After |
|---|---|---|
| CCNA v1.1 | 19.9 / Lab 29.2 | 20.5 / Lab 30.8 |
| CCNA v2.0 | 17.4 / 19.6 | 17.4 / 19.6 (unchanged) |
| N10-009 | 20.7 / 28.4 | 20.7 / 28.4 (unchanged) |
| Shared | 29.2 | 29.2 (unchanged) |

Verified-only floor unchanged (CCNA v1.1 13.7, v2.0 6.8, N+ 16.0); item counts CCNA v1.1 PARTIAL 18 → 19, MISSING 58 → 57. The decision record is in `CERTIFICATION_GAP_ANALYSIS.md` §13.

**Files changed:** `scripts/model.mjs` (statuses, evidence keys, 4.8 text, `s.persist` lines), `data/scores.json` and both matrices (regenerated by the unchanged `gen.mjs`), evidence index E.1 (regenerated by `evidx.mjs`) and section K, `data/expected-scores.json` (eight CCNA v1.1 figures entered by hand from the reviewed results: Overall, Lab, strict/lenient Overall and Lab, domain 5.0 Overall and Lab), this README, `MANIFEST.sha256` (refreshed for exactly the changed package files).

**Unchanged:** `gen.mjs`, `qc.mjs`, `evidx.mjs`, `recompute-from-matrices.mjs`, `verify.mjs`, formulas, weights, relevance, objective IDs, phase mappings, the historical `inventory.json`, `probe.json` (still shows `enable secret` rejected at `dcbf4cb`), `test-titles.txt`, `evidence-grep.txt`.

**Verification:** see the final run recorded in the project checkpoint (Section O). No application code or tests were changed; nothing was committed, pushed, merged or deployed.
