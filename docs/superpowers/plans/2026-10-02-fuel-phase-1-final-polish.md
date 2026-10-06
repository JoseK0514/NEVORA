# Phase 1 — final visual polish checkpoint

## Scope

Branch: `codex/fuel-phase-1-manager-workflows`.
Worktree: `/Users/josek0514/.codex/worktrees/fuel-phase-1-manager-workflows/Fuel-Scheduler-`.
Approved parent: `4bd66c8e6e7048e24b3cff3fa738796b4d36aa54`.
Separate local follow-up: `style: refine manager attention controls`.

The approved Phase 1 structures and workflows remain intact. No push, merge, deployment, Phase 2, new feature or customer-data operation is authorized by this pass.

## Changes

- Scope the existing espresso primary-action treatment to Dashboard Pending Approvals' Review links. Normal/focus: existing `--coffee` (`#5a3828`) with white text, 10.34:1 contrast. Hover/pressed: existing `--coffee-dark` (`#3f271d`) with white text, 13.82:1 contrast. Preserve native keyboard focus, full opacity, 140ms feedback and the Phase 0 capsule geometry.
- Normalize Dashboard request titles to `Shift Request`, `Time Off Request`, and `Unable to Work Request` at their existing Manager action builder. Request types, priorities, dates, details, URLs and behavior are unchanged. Update the existing Dashboard test's copy fixture to match.
- Retain existing mobile spacing and navigation: the requested clearance checks reproduced no defect. Manager content keeps 96px bottom padding; the navigation remains 58px tall with its existing safe-area bottom offset.

## Checks run

- `npm run lint`: passed.
- `npm run typecheck`: passed, also after restoring only the build-generated `next-env.d.ts` and `tsconfig.json` edits to their pre-build contents.
- `npm test`: 28 files, 130 tests passed. No assertions weakened or snapshots updated.
- `npm run build`: passed. Inspected scripts contain no migration step; no database credentials were copied.
- Chromium and WebKit: 630 Manager responsive/state cases at 320, 375, 390, 430, 768, 1024 and 1440px. No document overflow, clipped text, action overlap or unequal approval/tab geometry.
- 192 post-edit bottom-nav clearance cases: four requested pages × four mobile widths × normal/long/empty data × two engines × natural/simulated 34px bottom safe area. Final controls, rows and text can scroll above the navigation. Minimum clearance was 28.58px with the natural zero inset and 4.58px with the simulated 34px inset. The approved baseline independently passed the same 192 cases.
- 254 protected comparisons against the exact approved parent: 246 screen comparisons at 320/768/1440px plus eight Clocker tablet orientation comparisons. Employee/Lead, Clocker, Schedule, Employees, Templates and Scheduling Rules retained identical markup, geometry and computed styles. Manager Time Off, Availability and Shift Requests also retained identical structure/geometry/styles. Dashboard Requests/Activity comparisons permit only the three explicitly authorized title substitutions.
- Ten additional Dashboard comparisons across both engines and 320/375/390/430/1440px require identical geometry, URLs and unrelated styles, allowing only the authorized Review background/transition and copy changes. All Review buttons remain 44px tall, 73.92px wide, 22px radius, centered 12px text. Normal/hover/pressed/focus contrast, native focus-visible and keyboard activation destinations passed. macOS WebKit uses native Option+Tab link traversal in the fixture; Chromium uses Tab.
- 18 control families/browser cases × four interaction states = 72 contrast checks passed; minimum 5.07:1. No unrelated control recoloring.
- Five requested screenshots and a supplemental 390px Review-controls viewport were captured and visually inspected.

## Evidence and limits

Artifacts and reproducible scripts:
`/Users/josek0514/.codex/visualizations/2026/10/02/01a0f8c7-f196-7d22-8896-8d3c96547bd9/fuel-phase-1-final-polish/`.

Review gallery: `http://127.0.0.1:4194/review.html`.
Approved-source fixture: `http://127.0.0.1:4193/app?manager`.

Fixtures render actual application pages, components and styles with fictional data and intercepted actions. Browser checks verify visual behavior and UI wiring; they do not prove live database persistence, deployed authentication or real-device safe-area behavior. Safe-area emulation substitutes only the bottom CSS environment variable in the test response. No production service was used.

## Exact files

- `src/app/globals.css`
- `src/lib/assistance/manager-actions.ts`
- `src/components/manager-dashboard.test.tsx`
- `docs/superpowers/plans/2026-10-02-fuel-phase-1-final-polish.md`

Stop after the separate local checkpoint. The approved parent remains unchanged.
