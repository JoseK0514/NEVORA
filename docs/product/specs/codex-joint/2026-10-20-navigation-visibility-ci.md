# Navigation visibility/React commit CI handoff — 2026-10-20

Implementation owner: `/root/browser_e_navigation_ci`. Branch: `codex/verify-preview-33`.
Clean base: `b258f4a163d1a2ca45e72b49b8fe0530659e34d0`.
Diagnostic checkpoint: `1e043186dec19dfc1ae2aa125bfbbb1c35de088b`.
Verified implementation: `8289f8336d534f8abe6039f2f3f6786903d2688f`.

Evidence root (`E` below): `/Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/ci-e-navigation`.
Local evidence index/copies: `.omo/evidence/ci-e-navigation/`.
SDD handoff: `.superpowers/sdd/CLEAN-MANAGER-VERIFICATION-PLAN/task-2-e-navigation-ci-report.md` (repository-ignored working artifact).

## Result and changed scope

The actual authenticated Next/PostgreSQL Navigation matrix passed all 14 cells: Chromium and WebKit at 320, 375, 390, 430, 768, 1024, and 1440 pixels. Only `scripts/phase-e-navigation-browser-scenarios.mjs` changed executable behavior. Application code, shared controller, API contracts, authorization, schema, Home implementation and CI registration remain byte-identical to the clean base.

The hidden visibility scenario now waits for the actual **Updates paused** DOM commit within the existing 15-second bound before asserting zero private rows. It observes the original immediate locator count as diagnostic data. An actual authorized old notification response is held throughout invalidation and row clearing, then fulfilled while hidden. The scenario asserts synchronous request abort, exactly one read through old-response settlement, no observed private-row resurrection after the paused commit, a fresh current source-exclusion result on re-entry, and no `read_at` mutation. It restores only its owned fictional source afterward.

The browser-only fetch observer calls the original fetch unchanged and records signal abort without modifying application behavior or response data. A MutationObserver records only event/time, visibility, paused state, row count, request count and abort count. The persisted response projection contains only status/state and whether it contained the expected owned old row. Unexpected route fetch/parse/fulfillment failures remain failures with sanitized diagnostics; there is no retry.

The existing mandatory Navigation14 path executes these causal checks in CI. Receipts are named `navigation-visibility-<engine>-<width>-report.json`, so the existing Phase E `*-report.json` upload includes them; screenshots match the existing PNG upload. No new workflow step or helper abstraction was necessary. All existing native mobile/desktop/More/focus, ownership/query/history, no-read-mutation, expiry, role/session refusal, retry, time-off/availability persistence, 200% text and accessibility checks remain in the scenario. No product flushSync, arbitrary delay, timeout increase or skipped cell was added.

## RED, cause and limits

The previously downloaded hosted failure was directly inspected at `E/../final-gates/phase-e-pr-artifact/browser-failure-report.json`, not the shortened path in the task brief. It reports WebKit1024, `phase-e-navigation-browser-scenarios.mjs:110:177`, row count 1 versus 0, synthetic checkout `958de65cab2862d0209e5265db013b3caf3255a9`. Its `navigation-webkit-1024-failure.png` visibly shows the later paused/no-row state. This worker did not redownload or independently reauthenticate that artifact; its report and pixels are prior failure inputs, not current acceptance.

The unchanged local baseline passed 14/14. Thus the exact hosted cross-process locator ordering was **not** reproduced locally. The diagnostic checkpoint deliberately tested the narrower assumption that dispatch itself has already committed row removal. It failed on Chromium320 with rows=1 after dispatch, while the request was already aborted. The first MutationObserver observation of paused/no rows followed about 2.9 ms later. The old response remained held and no additional read had started. The separate original-style immediate Playwright locator happened to count zero locally.

Final real-run receipts repeat this distinction in every cell: all 14 retained the old row synchronously at dispatch return, all 14 had the actual abort already signaled, and the first paused/no-row commit was observed 1–3.2 ms later. All 14 original-style locator observations counted zero. These timings describe these runs, not an accepted privacy SLO or a guarantee for other scheduling conditions.

An external diagnostic also invokes the unchanged actual shared controller directly: pause publishes `{paused:true,snapshot:null}` and aborts synchronously; resolving an older request whose transport ignores abort publishes no further state. This isolates logical invalidation/generation fencing from React scheduling. The browser evidence observes the real signal and actual DOM, not the controller's internal sequence variable.

Together, the direct runtime evidence supports a harness synchronization correction. There is no observed persistence of rows beyond a paused commit and no proven production defect requiring application changes. Current authorization checks remain mandatory; the new all-width return case additionally proves a new read of the changed persisted source rather than reuse of the old response. Existing width390 HTTP401/403, role/binding/session and source-expiry cases also passed.

## Exact invocations and captured observables

All owned browser attempts used this command shape with the checkpoint/directory in the table:

```sh
env NEVORA_TEST_PG_BIN='/Users/josek0514/Documents/Codex/2026-10-11/coo-2/work/central-pg16-runtime-build2/c15a2-4c8000e3813a41f4b5cc12ae311f2f3c/runtime/bin' \
 NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE="$PWD/tools/ci-browser-runtime/package.json" \
 PHASE_E_EXPECTED_SHA='<full checkpoint>' PHASE_E_EVIDENCE_DIR='<E>/<attempt>' \
 node scripts/phase-e-owned.mjs browser --suite navigation
```

| Criterion/scenario | Exact invocation or attempt | Binary observable | Captured artifact |
|---|---|---|---|
| Unchanged local baseline | Owned command, `b258f4a163d1a2ca45e72b49b8fe0530659e34d0`, `baseline` | Exit 0, 14/14 passed, zero runtime errors; flaky hosted order not reproduced | `E/baseline.log`, `E/baseline/browser-report.json`, `owned-browser-report.json` |
| Same-task DOM-removal hypothesis RED | Owned command, `1e043186dec19dfc1ae2aa125bfbbb1c35de088b`, `timing-red` | Exit 1 at explicit diagnostic assertion: after-dispatch rows 1 versus 0; actual abort already true; subsequent commit zero while response held | `E/timing-red.log`, `E/timing-red/browser-failure-report.json`, `navigation-visibility-chromium-320-report.json`, `navigation-chromium-320-visibility-paused-held.png` |
| Actual controller logical invalidation / ignored-abort transport | `node --import tsx <E>/controller-probe.mjs` | Exit 0; synchronous null/paused/aborted; old resolution adds zero states and starts zero reads | `E/controller-probe.mjs`, `E/controller-probe-report.json` (actual controller source hash included) |
| Hidden DOM commit, no new read, old response, current re-entry and complete affected matrix | Owned command, `8289f8336d534f8abe6039f2f3f6786903d2688f`, `verified-navigation14` | Exit 0, all 14 cells pass; immediate abort; zero rows at paused commit; one read through held settlement; no observed resurrection; current empty result; restored own row | `E/verified-navigation14.log`, `E/verified-navigation14/browser-report.json`, `owned-browser-report.json`, all 14 `navigation-visibility-*-report.json` and `*-visibility-paused-held.png`; `E/visibility-summary.json` |
| Existing privacy/view/runtime focused suite | `npm test -- src/components/employee-account-panel.test.tsx src/components/employee-account-panel-lifetime.test.tsx src/lib/notification-inbox-view.test.ts src/test/phase-e-browser-runtime.test.ts --reporter=default --reporter=json --outputFile=<E>/focused-tests.json` | Exit 0, 19 passed, zero failed/skipped | `E/focused-tests.json`, `E/focused-tests.log`, `E/gates.json` |
| Types / full lint | `npm run typecheck`; `npm run lint` | Both exit 0 at verified source | `E/typecheck.log`, `E/lint.log`, `E/gates.json` |
| Default unit suite | `npm test -- --reporter=default --reporter=json --outputFile=<E>/default-tests.json` | Exit 0, 7,401 passed, zero failed, 801 existing pending/skipped; skipped work is not claimed as executed | `E/default-tests.json`, `E/default-tests.log`, `E/gates.json` |
| Source and runtime mirror custody | `assertSourceUnchanged(cwd, sourceManifest)` and `verifySourceManifest(cwd, report.appRoot, checkpoint)` from `scripts/phase-e-owned.mjs`, after all execution | All tracked hashes unchanged; runtime mirror verified; clean exact checkpoint | `E/verified-navigation14/post-run-custody.json`, `source-manifest.json`, mirror manifest at path in `browser-report.json`; baseline/RED `post-run-custody.json` |
| Runtime closure | `python3 <E>/check-closure.py <E>/verified-navigation14`; same closure logic for baseline/RED | Final 12 observed owned PIDs absent, ports 54147/54107 refuse connections, both ownership receipts closed; baseline 12 and RED 5 observed PIDs absent; unit-gate descendants absent | Each attempt's `closure-check.json`, each `owned-*/ownership.json`, `E/gates.json` |
| Evidence assertions and summary | `python3 <E>/summarize.py` | Exactly 14 complete receipts; all invariants asserted, PNG files nonempty | `E/summarize.py`, `E/visibility-summary.json` |

All three attempts are preserved. The RED is intentionally incomplete matrix execution, not acceptance. The GREEN reran the full relevant Navigation14 scenario after the diagnostic correction. No observed transport failures occurred in these Navigation attempts. Home's previously documented transport failures and its explicit H06/H07 timing limits are neither overwritten nor closed by this work.

## Directors, release impact and next gate

- Engineering: smallest supported correction is browser synchronization; no application refactor. Worker owns implementation; root owns final exact-source integration.
- Security: retain synchronous invalidation, zero private rows after paused commit, stale-result fencing and current server authority. The new evidence strengthens these checks; no control exception is proposed.
- Technical assurance: distinguish controller state, actual DOM commit and Playwright IPC timing. Local evidence does not reproduce the exact hosted Linux schedule or establish a production timing guarantee.
- Delivery: affected local matrix and relevant tests are verified; handoff source/report committed before freeze. Native device and assistive-technology evidence is outside this automation's claims.
- Governance: GO WITH CONDITIONS for handing this bounded patch to the root's final gate; release impact CONDITION. No independent finding is self-closed and no production authorization is inferred.

Root must still build the final exact source, push through the authorized development/PR flow, and obtain hosted Linux all-70-cell E plus required CI/rollup acceptance. Seven independent exit findings and migration execution/performance/authorization gates remain open. This worker did not push, merge, deploy, contact production, send notifications, alter legal/payroll language or accept risk. No new Jose decision is required for this bounded handoff; any later production authorization remains Jose's.
