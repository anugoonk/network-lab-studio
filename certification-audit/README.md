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
- Evidence references must keep passing `qc.mjs`. A renamed, edited, deleted or duplicated cited test or source line is a QC failure, not something to silence. (Since CERT-P0-1b-EVIDENCE, §10, a cited line that merely MOVED is not a failure: references are resolved by content, not by line number.)
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

## 10. CERT-P0-1b-EVIDENCE: stable evidence anchors (2026-11-17)

**Problem.** The evidence strings in `scripts/model.mjs` cite code as `path:NN` and `name() l.NN`. `qc.mjs` used to check that the cited line number still held a test header (tests) or any non-empty line / the function name (source). Any reformatting or added line above a citation therefore broke QC although the evidence was unchanged, and CERT-P0-1b.1 had to keep the cited lines of `persist.ts` and `engine.ts` at their old positions to keep QC green.

**Design.** Every cited location is now identified by what is there, not where it is (`scripts/anchors.mjs`, registry `data/anchors.json`, 248 anchors, one per reference `qc.mjs` checks):

| Field | Meaning |
|---|---|
| `text` | the cited line in TOKEN-CANONICAL form (below): lexed as JavaScript/TypeScript and re-printed as its tokens joined by one space |
| `sha256` | hash of `text` (a hand-edited registry entry is detected) |
| `occurrence` / `of` | which of the `of` identical lines of the file is the cited one |
| `symbol` | for `name() l.NN` citations: the function name, which must occur in `text` |
| `line` | the line number when recorded. **Informational only**: never an identity, never a pass/fail input; QC prints how many cited numbers have drifted |

**Token-canonical form (`token-v1`).** Whitespace BETWEEN tokens is insignificant (indentation, spacing around punctuation), but string, template and regular-expression literals are kept verbatim (`"a b"` is not `"ab"`), whitespace that separates two tokens is never deleted (`const a` is not `consta`, `a in b` is not `ain b`, `a++ + b` is not `a+ ++b`), any other character (zero-width space, soft hyphen, replacement character, control characters) is a token of its own so an invisible change cannot hide, and a semicolon is a token (`x = 1` and `x = 1;` differ, deliberately). Comments are dropped. Lines over 20,000 characters are compared by an exact hash; files over 5 MB are refused. An earlier draft of this change removed ALL whitespace before comparing; the review in CERT-P0-1b-EVIDENCE-R2 showed that this made six different kinds of change compare equal (identifier boundary, string, template and regex content, keyword boundary, `in` operator), so it was replaced.

**Resolution is fail-closed.** An anchor resolves only if the file exists, the entry is internally consistent, and exactly `of` lines have identical text, the path is a plain relative `src|tests|e2e` `.ts/.tsx` file (no `..`, no absolute path, no link leaving the repository), and the registry itself is well-formed (schema 2, hex hashes, no duplicates, bounded numbers). Edited, deleted, renamed or duplicated (ambiguous) cited code, a missing file, a citation without an anchor, or an anchor no longer cited are all QC problems. Moved lines, added code above, comment-only edits elsewhere and whitespace/indentation changes are not.

**Scope and compatibility.** The evidence TEXT in `model.mjs`, both matrices, `scores.json`, the evidence index and every score are unchanged, so no coverage figure moved (`verify.mjs` checks 1–3 stay byte-identical). The line numbers in the evidence text are historical metadata for the commit named beside them. `qc.mjs` still prints `evidence refs checked=248 problems=0` (the same 248 references) and still needs commit `3c9aed7` for the one cited e2e file that exists only there.

**Commands.**
```
node certification-audit/scripts/qc.mjs                    # includes the anchor check
node certification-audit/scripts/anchors.mjs check         # anchors only
node certification-audit/scripts/anchors-selftest.mjs      # 73 adversarial scenarios on a temp mini-repo; writes only to a temp dir it removes
node certification-audit/scripts/anchors.mjs build --at e23e00c --out <file>   # re-derive the registry from that commit's blobs
```
`data/anchors.json` was derived from the tree at commit `e23e00c` (identical tree to `59a4c3f`, production) and is byte-reproducible from either commit with `build --at`. Rebuild it deliberately, from a commit at which the cited numbers are valid, and review the diff: a rebuild that changes an anchor changes what the evidence points at. Adding a citation to `model.mjs` requires adding its anchor.

**Files changed:** new `scripts/anchors.mjs`, `scripts/anchors-selftest.mjs`, `data/anchors.json`; `scripts/qc.mjs` (reference check replaced; counts, IDs and weights unchanged); this README; `MANIFEST.sha256` (refreshed for exactly these files, hashes of the LF blobs). **Unchanged:** `model.mjs`, `gen.mjs`, `evidx.mjs`, `recompute-from-matrices.mjs`, `verify.mjs`, the probes and all other data files.

**Score reconciliation (CCNA v1.1 19.9 / 29.2 vs 20.5 / 30.8).** Not a defect. 19.9 / 29.2 is the state after CERT-Q4a (2026-11-13, CDP evidence, `950fb0c`); 20.5 / 30.8 is the state after CERT-P0-1a (2026-11-16, `51251c0`), which changed exactly one item, CCNA v1.1 5.3 (device access control with local passwords) MISSING → PARTIAL. Re-running the unchanged `gen.mjs` on a copy of `model.mjs` with only that item set back to MISSING gives 19.87 / 29.17; the committed model gives 20.47 / 30.84. v2.0 and Network+ are unaffected by 5.3 (v2.0 17.4 / 19.6; N+ 20.7 / 28.4).
