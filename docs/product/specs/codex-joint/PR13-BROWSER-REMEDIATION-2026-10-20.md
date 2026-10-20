# PR13 browser failure remediation — 2026-10-20

The navigation harness now matches refusal responses to the actual intercepted Request and restores temporary fixture roles on assertion failure. Local validation passed all five suites / 70 browser cells. The historical hosted WebKit exceptions and reset-access timeout remain **not reproduced / cause unknown**; this work does not close hosted CI or independent release gates.

## Source and change

Baseline: `36dcc9783e11612eae9a89e5b6ccdc0a6ebe06ea`. Executable candidate: `f3dcddfa78a73ce41fcb640c10291c6f10645d7c`, branch `codex/verify-preview-33`. This document is a subsequent documentation-only change. `completion.json` in the evidence directory records the final committed head and clean state. Worker did not push, merge, or deploy.

The `e746ba12..36dcc978` delta contains harness, tests, workflow and documentation changes, with no application implementation changes. The earlier PR artifact embeds synthetic checkout `3d8967bfb9667403944f12e0b9352251c27dca61`; its tree `76ef6b50b5ee944d19e11c3957b99f8464fe4610` matches local `e746ba122d181074b635afab5400036b78e13557^{tree}`. That raw report contains four page/runtime markers in communications WebKit390/430 even though both cells are labeled passed. Those labels did not establish zero runtime exceptions. The historical report was inspected and hashed, not relabeled.

Changed executable files:

- `scripts/phase-e-navigation-request.mjs`: exact intercepted Request/Response matching; route cleanup; temporary-role restoration in `finally`.
- `scripts/phase-e-navigation-browser-scenarios.mjs`: uses the correlation helper for actual401/403 reads; restores cookies after assertion failure; verifies MANAGER and OWNER own-notification200/profile-binding403; checks restored original role; uses the same error-safe role restoration in the profile denial scenario.
- `src/test/phase-e-navigation-request.test.ts`: adverse old200/current403 response ordering and failed/successful role-read regressions.
- `src/lib/employee-view-route.test.ts`: exact signed profile-binding rejection for all four supported notification roles.

The original navigation code already restored `actualRole` on its successful manager-read path, and390 is LEAD. No application authorization gap was reproduced. The real owned Chromium390 probe returned200 for the notification binding and403 for the profile binding for both MANAGER and OWNER. It then observed restored LEAD, missing-cookie401 and the intercepted wrong-binding Request's own403. The WebKit390 probe also observed the own403. Application authorization, all five suites/70 cells, pageerror acceptance, timeouts, retries, CI budgets, migrations and source/cleanup guards are unchanged.

## Evidence and observables

Evidence directory E:
`/Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/pr13-browser-remediation`

All commands ran in `/Users/josek0514/.codex/worktrees/verify-preview-33/Fuel Scheduler`. Existing Node24.19.0, Playwright1.62.1, axe4.11.0 and the specified local PostgreSQL runtime were used. `runtime-inventory.json` records versions, platform and executable/package hashes. The local platform was Darwin; CI targets Ubuntu24.04. All databases and identities were owned fictional fixtures, environment variables came through `safeEnvironment()`, and external delivery remained disabled.

| Scenario | Invocation | Binary observable | Artifact under E |
|---|---|---|---|
| Legacy response ordering and failed-role cleanup | `node node_modules/vitest/vitest.mjs run src/test/phase-e-navigation-request.test.ts`, before correction |3 expected failures:200 instead of403; MANAGER/OWNER retained instead of LEAD; exit1 |`navigation-red.log` |
| Corrected harness and route binding matrix |Same test plus `src/lib/employee-view-route.test.ts` |13 passed, exit0 |`navigation-green.log` |
| Types / complete lint |`node node_modules/typescript/bin/tsc --noEmit`; `node node_modules/eslint/bin/eslint.js .` |both exit0 |nonempty command/exit/hash receipts in `baseline-diagnostics.json` (logs are empty on success) |
| Complete default unit suite |`node node_modules/vitest/vitest.mjs run` |7459 passed;801 default/configured skipped;452 passed files,27 skipped; exit0 |`units.log` |
| Release harness |`node --test scripts/browser-contrast.check.mjs scripts/release-ci-contract.check.mjs scripts/release-postgres-cleanup.check.mjs scripts/release-browser-diagnostics.check.mjs scripts/release-lint-chain.check.mjs` |62 passed,0 failed/skipped, exit0 |`release.log` |
| All required real browser cells |`node E/run-frozen.mjs`, invoking `node scripts/phase-e-owned.mjs browser --suite <suite>` for navigation, communications, attention, calendar, home |each14/14 passed; total70;0 runtime errors; all source/mirror guards and process/port closure passed |`frozen-verification.json`, `frozen-source-manifest.json`, each `final-<suite>/browser-report.json` and `closure.json` |
| CI evidence consumption |`node E/verify-final-leaves.mjs`, invoking `node scripts/phase-e-browser-evidence.mjs leaf --suite <suite>` |all five exit0; source and mirror verified again |`leaf-verification.json`, `leaf-*.log` |
| Final original whole-D flow with observation-only lifecycle/PID preload |`node E/run-reset-final.mjs`, invoking `scripts/phase-d-owned.mjs browser` |201 checks;0 reported errors;10 original goto completions;6 captured process identities absent, detached groups absent, PG/Next ports closed |`reset-final-diagnostics.json`, `reset-final-source-receipt.json` |

The full default test command's skipped tests are not claimed as verified. No browser cell was skipped. Tests ran at the final executable contents; browser runs froze clean committed `f3dcddfa` throughout. The documentation commit occurred only after all guards closed. `evidence-manifest.json` and its SHA256 sidecar inventory sealed published artifacts; raw diagnostics are excluded.

## Investigation limits

Exactly three bounded original-source WebKit diagnostic cells were attempted before choosing a correction: communications375, navigation390, attention320. Each completed with zero pageerrors. An additional Chromium390 diagnostic established the role/binding matrix. Raw message/stack observation was registered before pages opened, but no original exception existed to capture. Each partial adapter retained the full-matrix validator and deliberately exited1 for incomplete matrix coverage; these are diagnostic observations, not14/70-cell acceptance. Counts and cleanup receipts are in `baseline-diagnostics.json`.

The deterministic regression proves that the old generic response waiter can select an unrelated200. It does not prove that this was the historical hosted failure's cause. Temporary-role cleanup on failed assertions is an independently demonstrated error-path defect, not a missing happy-path restoration.

Two whole-D observation runs completed201 checks each, at baseline and final executable source. Both preserved original15s goto/load semantics and completed10 observed navigations with document readiness `complete`. Actual new-document reset loads returned200; the reused fragment navigation stayed in the same document and had no response object. No reset timeout occurred, so no waiter correction was justified. Existing D cancellation handling remained unchanged; its reported cancellations do not establish that historical E exceptions are harmless. Raw local reset URLs and navigation diagnostics are retained only under E/restricted (0700 parent,0600 diagnostic files), never committed or uploaded. Public summaries contain route categories, status/readiness and proof-presence booleans only.

The first external diagnostic launcher was reconfigured between the first two attempts; its initial configuration is archived from the invocation record in the `*.communications375-original.mjs` files. The original tracked source/mirror manifests and actual run reports remained unchanged. Final70 used the normal unmodified runner, without diagnostic narrowing or pageerror exemptions.

## Handoff and gates

The controller's final docs-inclusive candidate and both hosted workflow outcomes
are recorded in the external [verification receipt](/Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/pr13-followup-ci/verification.json)
and [result report](/Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/pr13-followup-ci/RESULT.md). These files retain exact candidate and
artifact identity without a post-CI source commit. The executable task review is
preserved in [PR13-BROWSER-TASK-REVIEW-2026-10-20.md](PR13-BROWSER-TASK-REVIEW-2026-10-20.md).

Engineering supports this bounded harness correction; security keeps the server authority checks and runtime-error gate intact. Governance remains **NO-GO for release** while hosted and independent gates remain open. No policy exception or production authorization was requested or inferred.

The controller's scoped read-only review approved the executable diff with no blockers and two low-priority test coverage/typing notes. It does not certify QA/UI or close independent findings. The controller owns final broader review, exact reviewed-candidate build/push and actual hosted CI artifact inspection. Independent UI findings, performance HOLD and migration gates remain open with their respective owners. No Jose decision is needed for this bounded local handoff; production and material risk acceptance remain Jose's authority.
