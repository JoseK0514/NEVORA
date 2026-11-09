# Phase D CI round 2: correction arrival focus

Local implementation and verification complete, 2026-10-20. Owner: browser_ci_round2 implementation worker; next owner: root for independent scoped review, final build and hosted CI. Branch: `codex/verify-preview-33`. No push, merge, deployment, production access or real notification occurred. The seven independent exit findings remain open.

## Scope and cause

The hosted push run 39456586764 failed at the original D7 native focus assertion after 67 Chromium checks on candidate `07eff2b23132ed465ebdbf80c6ee3e29b96403ba`. Its preserved log/report/screenshot live in the sibling `final-gates/` evidence directory.

The cause was reproduced locally on that unchanged application source. In `diagnostic3/chromium-focus-trace-10.json`, the document is foreground and visible, its URL has the correct correction fragment, and the protected correction GET succeeds. The hook calls native focus on the correct article at 3327.7ms, but its rectangle is 0x0 and the ancestor SECTION has `display:none`. Focus remains BODY for the unchanged 15 seconds. `src/app/app/premium-desktop.css:194` hides Corrections while the independent attendance summary has `aria-busy=true`. The old hook recorded its completed ID before attempting focus, so the later attendance reveal could not recover that intent.

This is a product render-readiness race. The passing normal and CPU-throttled diagnostic attempts did not establish a fix. The reduced repeated-navigation experiment stopped on its first failure (eleventh navigation); it was diagnostic exploration, not a production or test retry policy.

## Change

- `src/components/private-fragment-focus.ts`: wait for a hidden ready row to gain layout rectangles via ResizeObserver; invoke native focus, then record completion only when activeElement is the row. Disconnect the observer and cancel frames on readiness loss, hash change and unmount. No CSS, authority, private-data lifetime, API, copy or timeout changes.
- `src/components/private-fragment-focus.test.ts`: seven actual-hook lifecycle cases cover hidden arrival/reveal, no repeated focus after success, readiness loss/disconnected row, hash replacement, absent/unrelated targets, and immediate visible arrival for attendance/timecard/request consumers.
- `scripts/phase-d-browser-qa.mjs`: deterministically hold the real attendance read while the real protected correction row arrives. Capture the hidden state, release the read, and require the existing native target-focus assertion within the unchanged 15 seconds. Capture sanitized readiness/focus/read artifacts without response bodies, notes, credentials or arbitrary URL query values.

Commits: RED regression `dd0d087bc6c11ddb5bbe8b4d0ee86bed50663eaa`; fix `7a5aa1ce90ef5870e31a24c4b2856b884a141ba2`. The fix tree is `651219fab10505037a21488fddb9ca882b2941c7`. The later handoff commit changes documentation only.

## Evidence and invocations

Evidence root `E`:
`/Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/ci-round2`

All browser invocations ran from the branch checkout with:

```sh
NEVORA_TEST_PG_BIN='/Users/josek0514/Documents/Codex/2026-10-11/coo-2/work/central-pg16-runtime-build2/c15a2-4c8000e3813a41f4b5cc12ae311f2f3c/runtime/bin'
NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE="$PWD/tools/ci-browser-runtime/package.json"
```

The existing runtimes were PostgreSQL 16.15 and pinned Playwright 1.62.1. DATABASE_URL was absent. The owned runner created fictional loopback fixtures, blocked external browser requests and disabled external notifications. SMTP recovery scenarios used the owned loopback capture.

| Scenario / invocation (environment above) | Binary observable | Captured artifact relative to E |
| --- | --- | --- |
| `PHASE_D_EXPECTED_SHA=dd0d087bc6c11ddb5bbe8b4d0ee86bed50663eaa PHASE_D_QA_ENGINES=chromium PHASE_D_EVIDENCE_DIR="$E/red" node scripts/phase-d-owned.mjs browser` | RED: 67 checks then original 15s focus failure; clean source; hidden row becomes visible but BODY stays active | `red.log`, `red/report.json`, `red/chromium-correction-focus.json`, `red/recovery-failure.png` |
| `node node_modules/vitest/vitest.mjs run src/components/private-fragment-focus.test.ts` on original hook | RED: 3 failed / 4 passed | `unit-red.log` |
| `PHASE_D_EXPECTED_SHA=7a5aa1ce90ef5870e31a24c4b2856b884a141ba2 PHASE_D_EVIDENCE_DIR="$E/green" node scripts/phase-d-owned.mjs browser` | GREEN: exit 0; 201 checks, 0 errors across Chromium and WebKit; all original privacy/auth/receipt/exactly-once checks retained | `green.log`, `green/report.json`, `green/chromium-correction-focus.json`, `green/webkit-correction-focus.json`, both `green/*-correction-focus-1440.png` |
| `node node_modules/vitest/vitest.mjs run src/components/private-fragment-focus.test.ts src/components/manager-time-corrections.test.tsx src/components/manager-attendance-review.test.tsx src/components/timecards.batch.test.tsx` | exit 0; 47 tests across 4 files | `scoped-tests.log` |
| `node node_modules/eslint/bin/eslint.js src/components/private-fragment-focus.ts src/components/private-fragment-focus.test.ts scripts/phase-d-browser-qa.mjs` | exit 0, no lint findings | `lint-final.log` |
| `npm run typecheck` | exit 0, no type errors | `types-committed.log` |
| Owned runner teardown plus PID/port audit | every owned app closed; captured PIDs absent and ports not listening; clean RED/GREEN source/mirror verified | `verification.json`, `red/owned-next-zSf6pG/ownership.json`, `green/owned-next-IenzlG/ownership.json`; source manifests beside ownership files |

Both GREEN focus artifacts show: before release, foreground=true, targetConnected=true, targetTabIndex=-1, targetRects=0, sectionDisplay=none, attendanceBusy=true; activeTag is BODY in Chromium and MAIN in WebKit. After release: foreground=true, targetRects=1, sectionDisplay=block, attendanceBusy=null, activeTag=ARTICLE, targetFocused=true. Both protected paths return 200. No forced browser focus, forced click, arbitrary wait, increased timeout, assertion removal, motion disable or blind retry was introduced.

The ordinary D7 keyboard timecard focus also passes in both engines in `green/report.json`. The suite checks responsive geometry at 320/375/390/430/768/1024/1440; the deterministic correction arrival focus scenario itself runs at 1440. This is local macOS browser evidence, not Linux/hosted, physical-device or screen-reader acceptance.

## Failed attempts retained and excluded

`diagnostic1`, `diagnostic2` and `diagnostic4` passed the focused prefix; `diagnostic3` contains the observed intermittent RED. Those experimental scripts and traces are retained outside the checkout. Some exploratory instrumentation reads layout and can influence timing; the committed deterministic regression does not replace native focus or instrument the focus method.

`deterministic-red` reproduced the browser failure but source-custody verification then rejected a unit test added while that runtime was active. The runtime closed, but its source/mirror verification is false; it is excluded from exact-source acceptance. `deterministic-red-clean.log` records an early expected-SHA typo rejected before app startup. The final `red/` run corrects both problems with clean custody. Two test-helper lint failures were corrected; their logs remain `lint.log` and `lint-helper-fail.log`. No failed artifact is presented as a passing gate.

## Director positions and next gate

Engineering: accept the bounded render-readiness fix for review. Security: protected-ready gating, authority checks and privacy clearing remain mandatory; cleanup tests and the full browser suite pass. Technical assurance: original failure, controlled RED and native-browser GREEN establish the local cause and correction; hosted verification remains required. Program delivery: implementation is handed off with closed runtimes and source freeze. Governance: GO WITH CONDITIONS / release impact CONDITION, pending scoped independent review, final build and new hosted CI. No exception or Jose decision is requested or inferred. This work does not self-close independent exit findings.
