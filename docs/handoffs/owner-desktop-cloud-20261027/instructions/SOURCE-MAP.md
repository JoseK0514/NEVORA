# Where to continue in the source

Paths below are relative to the extracted prototype root. Read the nearest AGENTS.md, the group brief/plan and its current tests before editing. The source is vanilla JavaScript factories exposed through existing public module contracts. Build order in `work/owner-desktop/build.py` is intentional.

## Entry and shared presentation

- `work/owner-desktop/template.html`, `build.py`, `sprite.html`, `wordmark.txt`, `fixtures.json`: shell/build/assets/fictional seed. Build writes only the desktop output and copied Phosphor license.
- `app.js`: routing, five roots, module/controller wiring and public adapter seams; keep it small. `components.js`, `employee-ui.js`, `panels.js`, `feedback.js`: shared icons/controls/sheets/feedback. `search.js` and `tools-view.js`: current discovery catalog, still subject to G16 completeness reconciliation.
- `styles.css`, `foundation.css`, `layout.css`, `operations.css`: incumbent shared tokens and geometry. Group styles extend these instead of inventing a second system. `DESIGN.md`, `PRODUCT.md` and `.impeccable/design.json` under the desktop source are accepted local design context. Root/mobile versions are read-only context.
- `date-utils.js`, `date-picker.js`, `date-picker.css`: shared date-only arithmetic and desktop calendar. Time/date-time controls retain native behavior. `layout-observer.js` scopes responsive updates without a ResizeObserver error loop.

## Implemented groups and seams

| Group | Main source families | Evidence directory |
| --- | --- | --- |
| G01 Team | `team-*`, `employee-*` | `evidence/team` and `evidence/g01` where present |
| G02 Schedule/availability | `schedule-*`, `availability-*`; public stable-ID Team/Location/Position sync | `evidence/g02` |
| G03 Requests | `request-*`, `inbox-view.js` | `evidence/g03` |
| G04 Attendance/recovery | `attendance-*`, `assisted-recovery-store.js`, `clocker-receipt-store.js`, `correction-*`, `operations-*`, `recovery-*` | `evidence/g04` |
| G05 Company | `company-*`, `brand-color.js`, `brand-derive.js`, `company-logo.js` | `evidence/g05` |
| G06 Operating rules/devices | `operating-*`, public catalog/eligibility adapters | `evidence/g06` |
| G07 Timecards | `timecard-*`, shared recorded/correction source | `evidence/g07` |
| G08 Exports/handoff | `export-*`, explicit complete-population/custody/profile decisions | `evidence/g08` |
| G09 Payroll settings | `payroll-settings-*`, `payroll-*-fields.js`, `payroll-*-values.js`, `payroll-native-*`, `payroll-facts-form.js` | `evidence/g09` |
| G10 Runs/approval | `payroll-run-*`, `payroll-calendar.js`, `payroll-backlog.js`, `payroll-runs.css` | `evidence/g10` |

Published group reports/plans/verification are under `outputs/owner-desktop/`. Do not count a visible tool-index entry as an implemented workflow. The source-backed IDs/conditions are `roadmap.json` and `feature-coverage.json` there.

## G10 responsibility boundaries

- `payroll-run-model.js`: source-derived whole-cent input/command/import validation. No UI or network.
- `payroll-calendar.js`, `payroll-backlog.js`: saved schedule/effective periods/missing-period/transition arithmetic; generated adapters already pinned to the actual reference. Do not rerun port helpers against a different revision.
- `payroll-run-fixtures.js`: explicitly illustrative saved native/provider history. It is not a verified live calculator or actual customer payroll.
- `payroll-run-source.js`: current public G07/G08/G09 dependencies and effective exception/provenance evidence.
- `payroll-run-store.js`: serialized command/review/revision/source/approval/correction/unknown-result/private lifecycle contracts. Never relax an exact source or authority guard to unblock the UI.
- `payroll-run-breakdown.js`, `payroll-run-details.js`, `payroll-run-forms.js`, `payroll-run-views.js`: readable evidence/forms/current-history pages with progressive disclosure and grouped prerequisites.
- `payroll-run-controller.js`: event/lifecycle/draft/dirty-navigation/current-source recovery; retire private draft content on changed actor/session.
- Narrow dependencies: G07/G08 `resumePayroll` adapters and G09 `recordNativeApproval`; preserve originating run/year and approved opening-history freeze. `app.js`/`build.py`/`check.cjs` are the other intentionally narrow seams.

## Verification and history

Current gate: `g10-verify.cjs` (20 suites per engine), `g10-models.py` (12 domain runners + authored-JS syntax), then `finalize-g10.py` and `audit-g10.py`. Inspect scripts before invoking. Their strict pinned source/complete evidence gates are deliberate. Older finalizers/package helpers are historical and must not overwrite the G10 milestone.

Every later group preserves a baseline runtime/source manifest, brief, executable plan, ordered ledger rulings, original independent review identity, reproduced corrections, final exact-build checks, current mobile comparison and truthful publication/audit. No Git exists in this workspace; retained baseline snapshots are recovery history.

Actual application source is a separate clean pinned Next/React reference; selected read-only G10 files are already under `evidence/g10/application-reference`. Those snapshots support source comparison but do not replace the strict clean-checkout gate or authorize application edits. Future groups must inspect their actual source contracts from the pinned/current agreed reference before porting behavior.
