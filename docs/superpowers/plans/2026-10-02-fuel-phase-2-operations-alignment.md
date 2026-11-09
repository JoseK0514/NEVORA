# Phase 2 — final business-data and UI consistency pass

## Scope and baseline

Branch: `codex/fuel-phase-2-scheduling-rules`.
Worktree: `/Users/josek0514/.codex/worktrees/fuel-phase-2-scheduling-rules/Fuel-Scheduler-`.
Exact approved parent: `bb3c95daeb89947b96093aa5183c3db44e6b3a85`.
Separate local follow-up: `fix: align scheduling rules with Fuel operations`.

The approved Phase 2 architecture and all scheduling rules remain unchanged. No redesign, new setting, migration application, live-data mutation, push, merge, deployment, Build Week or Phase 3 is authorized. The earlier checkpoint is never amended.

## Inspection and source of truth

| Source | Existing data/behavior | Correction or limit |
| --- | --- | --- |
| `db/migrations/0001_initial.sql` | `loc-1` is FUEL - 2; `loc-2` is FUEL - 110. Existing identity/foreign keys remain. | Scheduling Rules resolves all displayed names from the same active `locations.short_name`, normalizing the existing ASCII separator to the canonical en dash. No stored rename. |
| `db/migrations/0002_schedule_health.sql` | `location_staffing_settings` seeds 2 employees for `loc-1` and 6 for `loc-2`. | Runtime UI keeps reading the editable stored settings through `listLocationStaffingSettings`; no duplicate UI counts or settings. |
| `db/migrations/0003_schedule_assistance.sql` | `requires_designated_lead` is configurable per location, initially true. `location_coverage_windows` stores day/time/optional staff override. | Both location controls show supplied stored staffing/Lead values. The page test also proves custom 3/8 staffing and false/true Lead settings are respected. |
| `src/lib/data/schedule-health.ts` | Reads active locations joined to staffing settings; absent required staffing fails explicitly. Reads expected windows directly from `location_coverage_windows`. | No change to these repository contracts, queries or persistence. |
| Original Phase 2 external `data.ts` | Returned one `Fuel 1` staffing row (2 staff, Lead true), and one loc-1 Monday 06:00–14:00 expected window with a 2-staff override. No loc-2 expected windows. | This caused the inaccurate review image. Both active Phase 2 preview fixtures now import the canonical checked-in test fixture rather than keeping inconsistent local arrays. Historical PNGs remain original evidence. |
| `src/test/fixtures/fuel-scheduling-rules.ts` | New local test/review fixture uses existing Location/Staffing/CoverageWindow types. | Both canonical locations, seeded 2/6 staffing and Lead defaults, confirmed expected windows below. This module is not imported by runtime application pages and writes no database. |

The application page continues to render whatever expected-window records its repository returns. Corrected standard windows are **fixture data only**, not runtime hardcoded settings, migration seeds or silent live writes.

## Confirmed scheduling windows

| Location / days | First window | Second window |
| --- | --- | --- |
| FUEL – 2, Monday–Friday | 6:30 AM–2:00 PM | 2:00 PM–9:00 PM |
| FUEL – 2, Saturday–Sunday | 7:00 AM–2:00 PM | 2:00 PM–9:00 PM |
| FUEL – 110, Saturday–Sunday | 7:00 AM–1:30 PM | 1:30 PM–8:00 PM |

The fixture contains 14 FUEL – 2 windows and four confirmed FUEL – 110 weekend windows. Each inherits its existing location staffing requirement, with no duplicated staff override.

Jose specified one 30-minute unpaid meal and one 15-minute break per FUEL – 2 shift. Expected periods describe the entire scheduling window, including these periods. No scheduling-duration, target/maximum, pay calculation or timekeeping policy is changed; the 15-minute break is not deducted. This pass does not decide future recorded-time/payroll deductions.

## FUEL – 110 weekday source audit

- Runtime expected periods come exclusively from `location_coverage_windows`, read by `listCoverageWindows`, editable through the existing Manager form/actions.
- The checked-in migrations create that table but seed no expected-window records for either location. No checked-in FUEL – 110 weekday expected-period seed was found.
- The original Phase 2 review fixture contained **zero** FUEL – 110 expected windows. The corrected fixture adds only the four weekend windows explicitly supplied by Jose; it contains no FUEL – 110 weekday expected windows.
- Legacy `src/lib/demo-data.ts` contains an assigned FUEL – 110 Monday demo shift on 2026-09-28, 10:00–18:00. The external UI fixture also contains fictional assigned shifts such as 08:00–16:00. These are individual demo assignments, not expected-period rules or canonical weekday business information; they are not rewritten or used to infer a replacement window.
- Live database records were not queried in this pass, so their current weekday values are **unverified**, not asserted empty. No live data was modified.
- The final weekday business clarification remains pending. Existing configurable architecture is preserved; no replacement times were guessed to close a gap.

## Save Settings treatment

Reuse the approved Phase 1 Manager primary pairing:

- Normal/focus: `--coffee` (`#5a3828`) with white text.
- Hover/pressed: `--coffee-dark` (`#3f271d`) with white text.
- Preserve native keyboard focus, full active opacity, 140ms color feedback, centered label and existing minimum 44px Phase 0 geometry.
- Scoped disabled treatment reuses the existing 0.45 opacity/not-allowed cursor. The explicit scope outranks the legacy global hover-opacity rule, including its compound `:is` specificity.
- The original control is a native server-action form button without a custom pending label. No submission workflow/client pending behavior was added. Disabled/aria-busy styling is emulated separately in browser evidence and is not claimed as a live saving workflow.
- Employee Save Preferences colors/layouts are untouched.

## Regression evidence

The real-page label test first failed on `Fuel 1`/`Fuel 2` and ASCII location separators, then passed after the page used one location label resolver. A browser reproduction first observed blue `rgb(0, 113, 227)` instead of the approved espresso background, then passed after the scoped color change.

Four focused tests were added in `src/app/app/schedule/settings/page.test.tsx`:

1. Canonical staffing, selector and expected-period labels, both 2/6 stored fields and corrected morning/evening display.
2. Custom stored staffing/Lead values are rendered, rather than hardcoding business defaults.
3. Shared health evaluation consumes all 14/4 confirmed windows and does not invent FUEL – 110 weekdays or trim period boundaries.
4. Two FUEL – 2 weekend staff satisfy their own morning period while FUEL – 110 still lacks six staff and a Lead. Existing scheduled-hour balance remains seven hours for the complete 07:00–14:00 assignment; no timekeeping deductions are introduced.

Final application checks:

- `npm run lint`: passed.
- `npm run typecheck`: passed, also after restoring only this build's generated declarations/configuration.
- `npm test`: 35 files / 230 tests passed, including unchanged rule matrix and role regressions.
- `npm run build`: passed. Scripts contain no migration hooks; no database credentials were copied.
- No changes in shared scheduling modules, date/workweek logic, repositories, availability editor, Clocker or migration 0006 compared with the approved parent.

Browser input and button checks passed in Chromium and WebKit:

- 70 responsive/data cases at 320/375/390/430/768/1024/1440, with normal/long/empty/error/success fixture states. Both canonical staffing rows, 2/6 values and configured Lead controls are present; all 14 FUEL – 2 and four weekend FUEL – 110 periods are correct. No horizontal overflow; final list content scrolls above the fixed mobile navigation.
- 84 button-state measurements: normal/hover/pressed/focus/disabled plus separately emulated disabled+aria-busy styling. Active normal/focus contrast is 10.3395:1; hover/pressed is 13.8221:1. Active opacity is 1, label alignment is centered, and normal/hover/press/focus/disabled geometry is stable with minimum 44px height.
- Native keyboard focus is visible in both engines. Chromium uses Tab; macOS WebKit uses its existing native Option+Tab button traversal. The diagnostic proved ordinary WebKit Tab skipped the button, rather than exposing a CSS focus defect; no focus assertions were suppressed or native focus styles changed.
- Final 390px and 1440px Scheduling Rules captures and a supplemental desktop period-list capture were visually inspected. No screenshot rewriting or production layout changes.

Final protected comparison: 246 pixel-identical cases against the exact approved Phase 2 parent (234 protected route cases plus 12 Employee/Lead weekly availability cases), with identical DOM text/geometry/computed styles. Eight additional Clocker tablet orientation layouts also match. Protected comparisons use identical corrected fixture records on both code versions to isolate code changes from the authorized sample-data correction. The commit identity and clean post-checkpoint status are recorded in the external final report, avoiding any amendment of the single follow-up commit.

## Evidence location and exact source files

External QA:
`/Users/josek0514/.codex/visualizations/2026/10/02/01a0f8c7-f196-7d22-8896-8d3c96547bd9/fuel-phase-2-operations-alignment`.

Preview: `http://127.0.0.1:4199/review.html`.

Real pages/components/CSS are rendered with fictional data and intercepted actions. Browser measurements verify local rendering, not live authentication, real-device behavior or database persistence. Approved source is archived from the exact Phase 2 parent.

Exact follow-up files:

- `src/app/app/schedule/settings/page.tsx`
- `src/app/globals.css`
- `src/app/app/schedule/settings/page.test.tsx`
- `src/test/fixtures/fuel-scheduling-rules.ts`
- `docs/superpowers/plans/2026-10-02-fuel-phase-2-operations-alignment.md`

Stop after one separate local checkpoint. No push, merge, deployment, migration application or Phase 3.
