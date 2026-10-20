# Home held-response CI synchronization handoff — 2026-10-20

Implementation owner: `/root/browser_e_home_ci`. Branch: `codex/verify-preview-33`.
Base: `351b3a9dd11639574131f1bcfd31de4a4bcee99b`.
Verified Home matrix implementation: `a300bfdb9a0274cf6810415a0c9f063594af068c`.
CI regression registration/checkpoint: `f276c41be069c82bea1570a5fa223ef15dbb8a54`.

Evidence root (`E` below): `/Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/ci-e-home`.
Local evidence index/copies: `.omo/evidence/ci-e-home/`.
Requested handoff: `.superpowers/sdd/CLEAN-MANAGER-VERIFICATION-PLAN/task-2-e-home-ci-report.md`.

## Result and changed scope

The final real Next/PostgreSQL Home matrix passed all 14 cells: Chromium and WebKit at 320, 375, 390, 430, 768, 1024, and 1440 pixels. No application, controller, API, authority, schema, style, budget, retry, or skip change was made.

- `scripts/phase-e-home-browser-scenarios.mjs`: H06 waits for the actual fresh location in a visible, settled ready/partial Home, within the existing 15-second bound. A newer Home request must finish before releasing the real old response. The old response must contain the former fixture name. After the held handler settles, a browser rendering turn and all recorded DOM observations must still exclude the former rows. The receipt contains only request ordinals/events, state, focus/visibility, and explicit fictional old/fresh booleans.
- H07 keeps the actual old MyTime response held while pagehide invalidates the private controller. It waits for the paused DOM commit before testing row removal, proves no new read was required, then settles the old handler and checks the paused/no-clocked-in state before pageshow. Native lifecycle/controller behavior is unchanged.
- The existing gate now turns unexpected fetch/parse/fulfillment failures into sanitized failing diagnostics instead of an unhandled Playwright error that can print request headers. Fulfillment cancellation is recognized only for an actually failed request or an explicit navigation release whose document URL changed. Navigation releases in H08/H11 now await their handler and retain their outcome. Fetch failures are not ignored or retried.
- `scripts/phase-e-home-held-response.check.mjs`: controlled real-browser scheduling regression exercises the actual H06 readiness helper in both engines. It requires the expected exact commit and clean source, restricts evidence outside the worktree, rechecks every tracked source hash after execution, and writes a custody receipt. It is a harness regression, not a substitute for actual Next/PostgreSQL evidence.
- `.github/workflows/ci.yml`: runs this regression unconditionally in the existing Phase E UI job after Chromium/WebKit installation; supplies an explicit external evidence path and inherits the exact candidate SHA. Uploads its receipts/screenshots and H06/H07 safe held-response JSON. The required 70-cell matrix, job budgets, and aggregate dependencies are unchanged.

## Cause and limits of the diagnosis

The downloaded hosted Linux failure reports H06 `late-home`, and its native failure PNG shows loading placeholders. H06 previously used a generic ready/partial wait followed by a cached document network-idle state. That can return against the previous generation's committed DOM. The controlled regression deterministically failed in both engines: the original wait resolved while the old location was still present and `aria-busy=true`. It passes with the explicit fresh-generation predicate. The exact hosted event scheduling was not reproduced locally; local browsers run on macOS.

A separate actual H07 RED occurred at WebKit430 on `368759b8`: the immediate count following synthetic pagehide returned one Clocked-in row; its native failure screenshot already shows paused/no row. Final real-run receipts prove the timing: all 14 cells still had ready/Clocked-in DOM immediately after dispatch, the held request was invalidated, and paused/no-row was observed within 12 ms. Exactly one protected read (the already-held MyTime request) started during this segment. No replacement response was needed to clear the DOM, and releasing the old response did not restore it. These are observed commit upper bounds, not controller instrumentation or production latency guarantees.

Unexpected local held-fetch failures also occurred. Initial diagnostic output identified ECONNRESET; another initial-loading fetch failed before richer error-code projection was added. Installed Playwright 1.62.1 source uses a shared keep-alive HTTP agent and zero default retries. Temporary read-only socket instrumentation observed successful connection reuse but did not capture a reset, so connection reuse is **not** claimed as the cause. No transport workaround was applied. That temporary HTTP wrapper was removed before final acceptance. The failures remain recorded and unexpected future failures remain failing.

## Exact verification and binary observables

Every owned Home invocation used the same command shape, with the checkpoint and evidence directory from the attempt table:

```sh
env NEVORA_TEST_PG_BIN='/Users/josek0514/Documents/Codex/2026-10-11/coo-2/work/central-pg16-runtime-build2/c15a2-4c8000e3813a41f4b5cc12ae311f2f3c/runtime/bin' \
 NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE="$PWD/tools/ci-browser-runtime/package.json" \
 PHASE_E_EXPECTED_SHA='<full checkpoint>' PHASE_E_EVIDENCE_DIR='<E>/<attempt>' \
 node scripts/phase-e-owned.mjs browser --suite home
```

| Criterion/scenario | Invocation | Binary observable | Captured artifact |
|---|---|---|---|
| H06 old-ready scheduling RED | `HOME_READINESS_EVIDENCE_DIR=<E>/readiness-red node --import tsx scripts/phase-e-home-held-response.check.mjs` before helper fix | Exit 1; both engines resolved old ready/busy DOM and failed assertion | `E/readiness-red/readiness-report.json`, both prior-ready/fresh PNGs, `E/readiness-red.log` |
| H06 scheduling regression GREEN and exact-source CI command | `PHASE_E_EXPECTED_SHA=f276c41be069c82bea1570a5fa223ef15dbb8a54 HOME_READINESS_EVIDENCE_DIR=<E>/readiness-ci node --import tsx scripts/phase-e-home-held-response.check.mjs` | Exit 0; both engines remain pending through old ready/loading and resolve fresh ready/not busy/no old text; clean source unchanged | `E/readiness-ci/readiness-report.json`, `readiness-custody.json`, `source-manifest.json`, PNGs; `E/ci-registration-gates.json` |
| Actual Home H06/H07 and complete affected matrix | Owned command above, checkpoint `a300bfdb9a0274cf6810415a0c9f063594af068c`, `verified-home14` | Exit 0; 14/14 passed, zero report errors, fresh before old release/no overwrite, paused clearing without new read | `E/verified-home14/browser-report.json`, `owned-browser-report.json`, `home-held-<engine>-<width>.json`, `home-held-time-<engine>-<width>.json`, `E/h06-h07-summary.json` |
| Types | `npm run typecheck` | Exit 0 | `E/gates.json`, `E/typecheck.log` |
| Full lint | `npm run lint` at both verified checkpoints | Exit 0 | `E/gates.json`, `E/lint.log`, `E/ci-registration-gates.json`, `E/lint-ci.log` |
| Existing release-engineering checks and CI registration | `npm run test:release-engineering`; parse actual workflow with installed js-yaml and assert install < regression < matrix, exact SHA/env, unconditional step and artifact globs | 61 passed, 0 failed/skipped; contract assertions pass; 50-minute job unchanged | `E/release-engineering-ci.log`, `E/ci-registration-gates.json`, `E/ci-registration-contract.json` |
| Application/Home source equivalence after CI integration | Compare every captured matrix source hash with current files | Only CI workflow and regression check script changed; all application and actual Home scenario/helper bytes identical | `E/ci-source-equivalence.json` |
| Default unit suite, including existing Home/controller tests | `npm test -- --reporter=default --reporter=json --outputFile=<E>/default-tests.json` | Exit 0; 7,401 passed, 0 failed, 801 existing pending/skipped | `E/default-tests.json`, `E/default-tests.log`, `E/gates.json` |
| Source custody | Rehash every captured tracked source file after browser and default gates | `sourceUnchanged=true`, no changed hashes, clean git status before handoff docs | `E/post-gate-custody.json`; `E/verified-home14/source-manifest.json`; mirror manifest path in browser report |
| Runtime closure | `python3 <E>/check-closure.py <E>/verified-home14` plus process observation in `run-gates.py` | All 54 owned matrix PIDs absent; ports 49401/49362 refused; both ownership receipts closed; all observed gate descendants absent | `E/verified-home14/closure-check.json`, `E/gates.json` |

The RED helper extraction was an uncommitted diagnostic working state reproducing the original wait semantics; it is not represented as clean-checkpoint application acceptance. The final GREEN is tied to the clean CI-registration checkpoint and the full matrix to the separate clean Home implementation checkpoint. The exact source-equivalence receipt proves that the later regression custody/CI integration changed neither application bytes nor the actual Home scenario/helper; the unchanged 14-cell matrix was not repeated just for this registration. No skipped test is counted as executed acceptance. No production build or hosted CI was run by this worker.

## Preserved attempt history

| Attempt directory | Source | Actual result |
|---|---|---|
| `diagnostic` | `5ab976d967e6a2808d1085919ec7f41f85fdf245` | FAIL after 8 complete cells; WebKit375 initial held fetch raised unhandled ECONNRESET. Child browser report/Next closed receipt missing after abrupt exit; progress and supervisor report retained. |
| `green-home14` | `d372dde996532ef10cd93ad8459385ac4347ad35` | FAIL first cell after H06; new strict fulfillment classification incorrectly counted intentional navigation cancellation in H08/H11. Explicit verified-navigation classification corrected this. |
| `final-home14` | `b6a43a53bceb9793376410e8166f5de22d495eeb` | FAIL after 8 complete cells; unexpected WebKit375 initial held fetch, now sanitized and normal teardown. Exact transport code was not retained in this checkpoint. |
| `transport-diagnostic` | `3c84f609` | PASS 14/14 with temporary read-only socket instrumentation. Successful socket reuse observed; no reset cause established. Not final-source acceptance. |
| `acceptance-home14` | `368759b8f292e00be1656a40f7038dc6970d5dd4` | FAIL after 10 complete cells; WebKit430 H07 immediate Clocked-in count 1 before paused commit. Native failure PNG and report retained. |
| `verified-home14` | `a300bfdb9a0274cf6810415a0c9f063594af068c` | PASS 14/14, clean source/mirror custody, closed ownership. |

Each directory has its captured reports, progress, relevant per-cell receipts/screenshots, and top-level `<attempt>.log`. Every completed teardown was independently checked before subsequent source edits/runtime creation. The initial abrupt diagnostic had all 42 recorded PIDs independently absent and both ports refused, but its Next ownership receipt never recorded `closed`; that limitation remains explicit in `E/diagnostic-cleanup.json`. Subsequent matrix closure checks are in each attempt's `closure-check.json`.

The original abrupt Playwright error printed isolated fixture Cookie/Home-binding headers. They were immediately removed from the saved diagnostic log. Original-byte hash/size were **not captured before sanitization** and are unavailable; the original bytes were not retained. `E/sanitization.json` records the removed categories and sanitized hash/size. `E/log-privacy-check.json` records a bounded scan of top-level worker logs, with zero matching credential headers. This is not a claim of a repository-wide privacy audit.

## Director positions, handoff, and remaining gates

CTO: keep the fix at the test synchronization boundary; no product defect was established. CISO: preserve private-generation/abort semantics and fail unexpected route operations without dumping headers. Governance: GO WITH CONDITIONS for bounded handoff; no policy exception or risk acceptance claimed. Program Delivery: local affected-scope verification complete, broader release acceptance open.

Release impact: CONDITION. Root owns fresh scoped review, final production build, subsequent bounded Navigation diagnosis, and exact-final-source hosted full 70-cell E plus required root CI. Local macOS evidence is not hosted Linux acceptance. Existing seven independent exit findings and migration/performance gates remain open; this worker does not close them. Intermittent local transport resets remain unexplained, not fixed by a retry. No deployment, push, merge, production access, real notification, legal, or payroll change occurred. No Jose decision is required for this authorized handoff.

All implementation and gate work is finished. The final handoff commit updates documentation only after CI registration and its local checks; root must use the final commit identity it observes for its next gates. No tracked source edits are authorized by this worker after declaring handoff freeze.
