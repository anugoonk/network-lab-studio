# CERT-P0-1a fix1: Secret Redaction Security Report

> **Date:** 2026-11-16 · **Status:** **DEPLOYED AND VERIFIED.** The hotfix `51251c0` is on `main` and in production (main CI run 43784804302, deployment 7813043791). Sections 1–6 and 8–11 keep the pre-deployment text as the record of the incident and the fix; sections 7, 12 and 13 and the new section 14 carry the final results. Before the deployment, production `3a27eef` had the defect below (live 2026-11-16 ~00:51Z to ~01:14Z).
> **Scope:** the redaction defect only. No P0-1b and no rollback. (The certification evidence for P0-1a was updated afterwards, as a separate documentation step; see `CERTIFICATION_GAP_ANALYSIS.md` §13.)

## 1. Root cause

`redactLine()` in `src/core/cli/engine.ts` began with:

```ts
if (vendor !== 'cisco') return line;
```

`executeLine()` derives everything that is shown or kept from `redactLine(vendor, line)`: the history entry, `ExecResult.echo` (the transcript line written by `store.exec`) and the error-text scrub. For an Aruba switch or a PC (vendors `aruba`, `pc`) the function returned the raw line, so the command was rejected correctly but its argument was treated as an ordinary line. The same early return was never needed for safety: the masking rule only fires on lines that start with an abbreviation of `enable` with two or more arguments.

Source inspected: `engine.ts` (`redactLine`, `executeLine`, `answerPrompt`, `pushHistory`), `store.ts` (`exec`), `Console.tsx` (history recall reads `dev.cli.history`), `persist.ts` (`withoutTransient`, `saveStored`, `saveWorkspace`, `serializeExport`), `profiles.ts` (vendors).

A second, unreachable path was found and closed: for devices without a CLI (`hasCli === false`: Internet Cloud, Patch Panel, Rack, UPS), `executeLine` returned no `echo`, so `store.exec` would write the raw `line`. The Console does not offer an input for these devices, so this was not exploitable through the UI.

## 2. Affected devices

| Device | Before fix1 | After fix1 |
|---|---|---|
| Cisco router, ISP router, Cisco switch | masked | masked (unchanged) |
| Aruba switch | **raw secret** in transcript, history, localStorage, export | masked |
| PC (and Laptop, Server, Printer, IP camera, IP phone, NVR, NAS) | same defect, same code path (PC-style CLI) | masked |
| Diagram-only devices (no Console) | raw `line` could be echoed by the store; not reachable from the UI | masked |

Only the user's own typed command was exposed. The secret of a configured Cisco device (the stored hash) was never affected.

## 3. Sensitive-data exposure paths (confirmed on production before the fix)

| Path | Result on production `3a27eef` (Aruba and PC) |
|---|---|
| Console transcript | `AR1#enable secret <secret>` and `C:\>enable secret <secret>` shown |
| CLI history, ArrowUp | `enable secret <secret>` recalled |
| localStorage (`nls.lab.v1`, workspace) | raw secret stored through the history and transcript |
| Lab export JSON | the history is part of the Lab, so exposed on export |
| Error text | not exposed (the PC "not recognized" text names only the first word) |

## 4. Fix design

- `redactLine()` no longer depends on the vendor; the tokenizer still uses the device's own vendor, so Cisco behaviour is byte-identical.
- Rule unchanged: after optional `do`/`no`, a first word that abbreviates `enable` with two or more further words has everything from its second argument masked. It is deliberately over-inclusive (e.g. `e x y` becomes `e x ********`).
- The masking happens in `executeLine`, before `pushHistory` and before the result reaches `store.exec`, so nothing raw can reach the history, the transcript, the Lab, storage or an export.
- `executeLine` for a no-CLI device now returns `echo` (masked) as well.
- The original input is still used for command processing (a Cisco `enable secret` must set the secret).
- Not changed: authentication, `answerPrompt`, the Password: prompt, `scrub()`, persistence, the rejection messages of unsupported devices.

## 5. Files changed (commit `51251c0`, 4 files, +201 / −5)

| File | Change |
|---|---|
| `src/core/cli/engine.ts` | remove the vendor gate in `redactLine`; masked `echo` for no-CLI devices (+4 / −3) |
| `tests/enable-secret.test.ts` | the test that asserted the old behaviour (`redactLine('aruba', …)` unchanged) now asserts masking for every vendor |
| `tests/enable-secret-all-devices.test.ts` | new, 33 tests |
| `e2e/enable-secret-unsupported.spec.ts` | new, 1 test |

Not committed: reports, checkpoint, `certification-audit/`, `ChallengePanel.tsx`, `check-params.spec.ts`.

## 6. Security regression tests

Unit, `tests/enable-secret-all-devices.test.ts` (33), each asserting the raw secret is **absent**, not only that the command failed:

- `redactLine` for `cisco`, `aruba`, `pc`, `generic`: 14 forms (`enable secret`, `secret 0`, `secret 5`, abbreviations `en sec`, `ena s 0`, `e secret`, upper and mixed case, typo `secrte`, extra words, `no`/`do` prefix, `enable password`, trailing `?`); ordinary lines (`show running-config`, `ping`, `ipconfig /all`, …) unchanged.
- Cisco router, Cisco switch, ISP router, Aruba switch, PC: result of every form, history, Lab JSON, export, `saveStored`, `saveWorkspace` (fake storage), reload (`loadStored`), re-import.
- 9 unsupported kinds (Aruba, PC, Laptop, Server, Printer, IP camera, IP phone, NVR, NAS): still rejected (`ok === false`), no `security` created, history is exactly `enable secret ********`.
- 4 no-CLI kinds (Internet Cloud, Patch Panel, Rack, UPS): rejection echoes the masked line.
- The real store (`useStore.exec`) transcript and history for the 5 kinds.
- Cisco authentication unchanged on 3 kinds: set, `disable`, `Password:`, wrong answer, right answer, `secretInput`/`echo` result.
- Ordinary commands on Cisco, Aruba, PC keep their own text in history with no `echo`.

E2E, `e2e/enable-secret-unsupported.spec.ts` (1): through the real Console on Aruba and PC, three forms each (including `en sec 0` and upper case): masked transcript line, Cisco-IOS-only hint shown, body text without the secret, ArrowUp ×4 without the secret, localStorage, exported JSON, and again after reload.

**Proof the tests detect the defect:** with the engine from `3a27eef` put back temporarily, 22 of the 33 unit tests fail and the E2E fails with the exact production transcript (`AR1#enable secret [REDACTED_SYNTHETIC_TEST_SECRET]% Unknown command.`). The fixed file was restored and confirmed with `cmp`.

Not covered: the 3 "Cisco" cases in a real browser on a Cisco device are covered by the existing `e2e/enable-secret.spec.ts`; a Challenge or sample Lab with a pre-existing raw history entry is not (none exists in the shipped samples).

## 7. Unit and E2E results (Windows, worktree `wt-fix1`)

| Gate | Result | Baseline |
|---|---|---|
| `npx tsc --noEmit -p .` | PASS | PASS |
| `npx vitest run` | **855/855**, 36 files | 822 (+33) |
| `npx playwright test` | **140/140** (2.4 min) | 139 (+1) |
| `npm run build` | PASS · JS `index-DwEygOnl.js` `2368e34c…` (changed, as expected) · CSS `index-DN97_JGr.css` `8752fb80…` (unchanged) | JS `index-DONAajTD.js` `b56da551…` |

**Linux CI and main CI (added after deployment):**

| Run | Result |
|---|---|
| Linux CI, run 43784316839 on `ci/cert-p0-1a-fix1` (`51251c0`) | build ok (`npm test`, `npm run build`), E2E 140 passed / 0 failed / 0 flaky / 0 skipped, deploy skipped |
| Main CI, run 43784804302 on `main` (`51251c0`) | build ok, E2E 140 / 0 / 0 / 0, deploy ok (01:14:06Z), **deployment ID 7813043791** |

The unit-test count in CI is **not verified**: job logs return HTTP 403 without a login, so only the `npm test` step status ("success") is known. The unit count 855/855 comes from local runs (the Gate 1 worktree, and again by the evidence update on 2026-11-16 in the main repository).

**Production asset integrity:** `index.html` `83682cf0…`, `favicon.svg` `ba408f3b…`, JS `index-DwEygOnl.js` `2368e34c…`, CSS `index-DN97_JGr.css` `8752fb80…` are byte-identical (SHA-256) to a clean build of `51251c0` (`MSYS_NO_PATHCONV=1 VITE_BASE=/network-lab-studio/`), all HTTP 200. The previous JS `index-DONAajTD.js` returns 404.

**Production smoke (live site, 2026-11-16):** 9 existing suites 58/58, CDP smoke10 1/1, smoke11 (enable secret) 3/3 (the Aruba/PC case that failed before the hotfix now passes) and smoke12 (new, every device kind) 1/1: **63/63** with 0 console errors, 0 failed requests and 0 HTTP >= 400.

**Production security verification (synthetic secrets only):** on Cisco router, Cisco switch, ISP router, Aruba switch and PC, 12 input forms each (plain, `0`, `5 <hash>`, `en sec`, `ena s 0`, upper and mixed case, typo `secrte`, extra words, `no`, `enable password`, trailing `?`). The raw secret was absent from the transcript, the page text, ArrowUp history, localStorage and sessionStorage, the exported Lab JSON, error output and after a reload. Aruba and PC still reject the command and show no `enable secret 5` in their running-config. Cisco authentication works: `Password:`, three wrong answers denied, the right answer accepted, running-config shows only the type 5 hash, a pending prompt is not restored after a reload.

**Verification split:** the CI runs, the deployment, the asset hashes, the 63/63 smoke and the first security verification were **reported by the deployment gates**. The evidence update on 2026-11-16 **reproduced directly**: local unit suite 855/855, and production smoke11 3/3 and smoke12 1/1 against the live site (bundle `index-DwEygOnl.js`, 0 issues). It did not re-run Linux E2E or CI.

**Regression:** the Ping/Challenge fingerprint (2,029 entries) is byte-identical (sha256 `87101649…`); it was computed in Node against the source of a clean `git archive 51251c0`, not against the live site (the live bundle is byte-identical to the build of that source, but production itself was not fingerprinted). Code audit 199/220 with no newly failing check.

## 8. Code audit and fingerprint

| Check | Result |
|---|---|
| Code audit (85 tests, 220 checks; alias pointed at the hotfix source) | **199/220**, regression 0 (same failing set as `results-p01a.json`) |
| Ping/Challenge fingerprint | **2,029 entries, byte-identical** to `fp-q4a-handoff.json` (sha256 `87101649…`) |

The first audit run used the config as saved, whose alias is hard-coded to an absolute path of the main repository's `src` (local path omitted from the committed copy). That run did not test the hotfix and was discarded; the numbers above come from a copy of the configs pointed at `wt-fix1/src`.

## 9. Known certification audit failure (not caused by this fix)

`node certification-audit/scripts/verify.mjs` → **6/7, not a pass.** Check 4 (evidence references) reports 3 problems, all `src/core/persist.ts` line references (l.211 `validateLab`, l.223 `serializeExport`, l.227 `parseImport`) shifted by commit `3a27eef`. The same 3 problems appear on a copy of `3a27eef` and on a copy with the hotfix overlaid, so fix1 adds none (it changes only `engine.ts`, which the evidence index cites by name only). `certification-audit/` was not modified; correcting the references belongs to the certification-evidence gate.

**Update (2026-11-16, certification-evidence step):** the three references were repaired (l.211 → l.216, l.223 → l.242, l.227 → l.246 after checking each claim against the current source) and `verify.mjs` is now 7/7.

## 10. Protected-file verification

- `ChallengePanel.tsx` `0716b664…`, `check-params.spec.ts` `b5019b2f…`, the checkpoint (before this update) `edd6bdc5…`, `CERT_P0_1A_IMPLEMENTATION_REPORT.md` `1608da84…`, `CERT_P0_1_TECHNICAL_DESIGN.md` `8c7d708d…`: unchanged.
- Main repo: `main` = `origin/main` = `3a27eef`, `git status` identical to before (33 entries). The 160-file inventory differs only in 9 source files that changed when `main` was fast-forwarded to `3a27eef` in Gate 2 (README, Console, cisco, engine, spec, persist, types, en, store); no file changed during fix1.
- `certification-audit/` untouched. Worktrees: 13 existing untouched + `wt-fix1` = 14. Nothing pushed; no reset, clean, stash, rebase or force push.

## 11. Local commit

`51251c0ed46ac45706d6b140c89e2f0071c1135e` on `hotfix/cert-p0-1a-secret-redaction`, single parent `3a27eef`, worktree `<scratchpad>\wt-fix1` (`node_modules` is a junction to the main repo; scratchpad `6ebc8525…`). Worktree clean after the commit.

## 12. Remaining risks

- **Existing plaintext is not removed.** The hotfix prevents the reproduced plaintext-secret exposure paths **for new input**. It does **not** automatically remove plaintext secrets previously saved in browser storage or exported Lab files. A raw secret typed on an Aruba switch, PC or other non-Cisco device while `3a27eef` was live (2026-11-16 ~00:51Z to ~01:14Z), or with the older builds that share the same code, may remain in that browser's localStorage and in Lab files exported then. Only the user's own typed text was exposed; stored Cisco hashes were never affected.
- **Recommended action for users:** if a real password was ever typed into the simulator, **rotate it**. To remove stored text: use New Lab or clear the site's localStorage, and delete Lab files exported in that window. Nothing was or will be cleared automatically.
- Over-inclusive masking: any 3+-word line starting with an abbreviation of `enable` is masked on every device (e.g. a PC line `e x y`).
- The redaction rule is a heuristic on the first word. Future credential commands (`username … secret`, `line vty`, `password`, `enable password` as an accepted command, SSH keys; P0-1b) need their own redaction rules and tests; this fix does not cover them.
- Real-device fidelity is not verified: type 5 (MD5-crypt) versus the types 8/9 newer IOS may use, the attempt count (three, a simulator setting) and the denial wording (a simulator message) were not confirmed against Cisco documentation or hardware.
- The code-audit and fingerprint runs depend on scratchpad configs with a hard-coded alias; repoint them when testing a worktree.
- The unit count in CI and a fingerprint of the live site were not obtained (see section 7).
- Open: F-1…F-7, N-1…N-4.
- Resolved after deployment: the three stale `persist.ts` references behind `verify.mjs` 6/7 were repaired in the certification-evidence step; `verify.mjs` is 7/7 (section 14).

## 13. Next approval gate

Done: review of `51251c0`, Linux CI (run 43784316839), fast-forward of `main` and deployment (run 43784804302, deployment 7813043791), asset verification, production smoke and security verification, regression check, and the certification-evidence update for P0-1a (`CERTIFICATION_GAP_ANALYSIS.md` §13).

Next, each needing its own explicit approval:
1. Decide whether to commit the local reports, `certification-audit/` and the checkpoint (none of them is committed).
2. CERT-P0-1b (users, lines, login, `enable password`, `service password-encryption`), with its own redaction rules and tests first.
3. Optional: a one-time notice or an in-app clean-up helper for plaintext saved before the hotfix (design needed; nothing is deleted automatically).
4. Cleanup of old branches and worktrees only on request.

An alternative to forward-fixing (rolling `main` back to `950fb0c`) was not used and is no longer relevant.

## 14. Closure record (2026-11-16)

| Item | Result |
|---|---|
| Original incident | `enable secret <secret>` typed on non-Cisco devices was echoed raw into the transcript, history, localStorage and export |
| Root cause | `redactLine()` returned the raw line for every vendor except `cisco`; one test asserted that behaviour |
| Hotfix | `51251c0`, 4 files +201/−5; vendor gate removed, masked echo for no-CLI devices, 33 + 1 new tests |
| Linux CI | run 43784316839: E2E 140/0/0/0, deploy skipped |
| Main CI | run 43784804302: build ok, E2E 140/0/0/0, deploy ok; deployment **7813043791** |
| Production assets | byte-identical to a clean build of `51251c0` |
| Production smoke | 63/63, 0 console/network issues (smoke11 3/3 and smoke12 1/1 re-run directly on 2026-11-16) |
| Security verification | 5 device types x 12 forms: no raw secret on screen, in history, storage, export or after reload |
| Regression | fingerprint 2,029 unchanged; code audit 199/220, 0 new failures; unit 855/855 |
| Certification audit | `verify.mjs` 7/7 after repairing 3 stale `persist.ts` line references |
| Not removed by the hotfix | plaintext saved before the fix in browser storage or exported files; **rotate any real password** that was typed |
| Remaining limits | heuristic first-word masking; P0-1b credentials need new rules and tests; real-device fidelity; F-1…F-7, N-1…N-4 |
