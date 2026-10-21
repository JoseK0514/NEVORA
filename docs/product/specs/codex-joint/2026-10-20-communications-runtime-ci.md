# Communications runtime-error CI handoff — 2026-10-20

Owner: `/root/browser_e_communications_ci`. Branch: `codex/verify-preview-33`.
Base: `e746ba122d181074b635afab5400036b78e13557`.
Verified implementation: `24509647e46a149d3afa7af2a7b328fa16e3f04c`.
Evidence root (`E`): `/Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/ci-e-communications`.
Local evidence index: `.omo/evidence/ci-e-communications/`.

## Result and limits

The authenticated owned Next/PostgreSQL Communications matrix passed all 14 cells (Chromium/WebKit, 320/375/390/430/768/1024/1440), with zero runtime errors. The four prior hosted PR runtime errors did **not** reproduce locally. Their application cause remains unknown. This change fixes a confirmed diagnostic and cell-acceptance defect; it does not claim to fix an unobserved application defect or the separate hosted capacity issue.

Direct inspection of the downloaded PR `browser-report.json` found two generic page errors each at WebKit390 and WebKit430, while both cells were marked passed. The previous runner discarded pageerror payloads, delayed the error assertion until all suites completed, and therefore lost causal detail when the macro later terminated. The prior report remains under `E/../final-gates/final-candidate/phase-e-pr-artifact/nevora-phase-e-browser-evidence/`. This worker inspected the existing downloaded report, not a fresh authenticated download.

## Changed scope and controls

Only three executable/test files changed:

- `scripts/phase-e-browser-qa.mjs`: a cell-local observer records every page runtime error, including pages created after the initial page, and rejects the cell after context close before any passed progress record. External-request errors also enter the same cell-local acceptance boundary. The existing final all-suite assertion remains.
- `scripts/phase-e-communications-browser-scenarios.mjs`: registers the separate manager context before page creation, supplies the existing static scenario stage, and checks runtime/network errors after manager teardown. The previous raw manager pageerror projection is replaced by the same bounded diagnostic path.
- `src/test/phase-e-browser-runtime.test.ts`: two regressions exercise private-message removal, late errors, previous-cell isolation and rejection after the close phase.

Error entries retain only type, primary/manager role, sequential page index, runner phase, allowlisted stage, and `safeBrowserFailure` output constructed from an allowlisted error name and static category. Categories are Network load failure, Operation aborted, Module load failure, or Unclassified page runtime error. **All categories fail**. No raw error message, URL, capability, actor, body, headers, stack or error-message hash is persisted by the new observer. Unknown messages deliberately sacrifice detail rather than copying private content.

The diagnostic fields are stored in existing `browser-report.json` errors and `browser-failure-report.json` runtimeErrors. Both match the existing CI `*-report.json` upload; no workflow change is necessary. No application, authority, data-access, schema, timeout, retry or capacity behavior changed. The default 15-second browser assertion and 45-minute macro bounds remain.

## Evidence and exact scenarios

| Scenario / criterion | Invocation | Binary observable | Artifact |
|---|---|---|---|
| New observer regression RED | `npm test -- src/test/phase-e-browser-runtime.test.ts` before helper implementation | Exit 1; two new tests fail because observer is absent; six existing tests pass | `E/regression-red.log` |
| Observer regression GREEN | Same invocation after implementation | Exit 0; 8/8 pass | `E/regression-green.log`; later full unit suite includes final committed bytes |
| Real asynchronous browser exceptions | `PHASE_E_EXPECTED_SHA=24509647e46a149d3afa7af2a7b328fa16e3f04c node <E>/runtime-observer-probe.mjs <E>` | Exit 0; Chromium and WebKit each capture two actual exceptions on two pages; reject acceptance, omit sentinel private strings, browser closed | `E/runtime-observer-probe.mjs`, `runtime-observer-probe-report.json` |
| Authenticated Communications14 | Owned invocation below | Exit 0; 14 passed, zero errors, all prior U01–U11 checks preserved | `E/verified-communications14.log`, `verified-communications14/browser-report.json`, `owned-browser-report.json`, screenshots and checks receipts |
| Types, full lint, full default units | `node <E>/../final-gates/run-local-gates.mjs <worktree> 24509647e46a149d3afa7af2a7b328fa16e3f04c <E>/gates` | All exit 0; 7,403 passed, 801 existing skipped; 450 passed files, 27 skipped | `E/gates/local-summary.json`, logs and hashed receipts |
| Release engineering checks | `npm run test:release-engineering` | Exit 0; 61 passed, zero failed/skipped | `E/release-checks.log` |
| Original and mirror custody | `node <E>/verify-custody.mjs <E>` | Exact clean source; all tracked hashes unchanged; runtime mirror validated | `E/post-run-custody.json`, runtime `source-manifest.json` |
| Owned process cleanup | `python3 <E>/../ci-e-navigation/check-closure.py <E>/verified-communications14` | All 265 observed owned PIDs absent; ports 57881/57920 closed; both owner receipts closed | `E/verified-communications14/closure-check.json` |

The controlled real-browser probe labels a second deliberate exception with the close phase, then closes the context and asserts rejection. It does not claim that closing an actual browser itself caused the deliberate error. The unit test emits an error in an awaited teardown turn. The full owned run verifies the real runner's context closure and source/ownership barriers.

```sh
env NEVORA_TEST_PG_BIN='/Users/josek0514/Documents/Codex/2026-10-11/coo-2/work/central-pg16-runtime-build2/c15a2-4c8000e3813a41f4b5cc12ae311f2f3c/runtime/bin' \
 NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE="$PWD/tools/ci-browser-runtime/package.json" \
 PHASE_E_EXPECTED_SHA=24509647e46a149d3afa7af2a7b328fa16e3f04c \
 PHASE_E_EVIDENCE_DIR='<E>/verified-communications14' \
 node scripts/phase-e-owned.mjs browser --suite communications
```

One initial attempt used a short SHA and was rejected before runtime launch. Its `E/communications14.log` is retained; it is not a test pass. All successful checks used the full exact SHA. The real-browser probe has an intentionally empty stdout log and a nonempty JSON result; JSON is its evidence artifact.

## Positions and next gate

Engineering: the proven root cause is loss of runtime diagnostic detail and delayed cell rejection. The smallest correction is harness-only; application root cause remains unresolved. Security: bounded diagnostic categories preserve private-data minimization and no error is exempted. Technical assurance: local all-14 success cannot explain or close the four hosted errors. Governance: GO WITH CONDITIONS for independent review and final hosted verification; release remains NO-GO.

Root must independently review this patch and run the final hosted candidate with complete all-70 acceptance and zero errors. Any repeated failure must be investigated using the new stage/page/category evidence. The separate macro capacity decision belongs to root and is not resolved here. Seven independent exit findings, Schedule performance acceptance, migration preparation/application authorization, and production gates remain open. No independent finding was self-closed. No push, main merge, production operation, real notification or legal/payroll wording change occurred in this task.
