# Employee mobile Hours — independent UI/UX and design-system review

**Recommendation: APPROVE the bounded local Hours/timecards/corrections prototype.**

Final artifact: `outputs/employee-mobile/index.html`.

SHA-256: `89acc4965a52193d21cbb2a0a0f13f43579f9a9e4966558e5df41e864b6f81e1`.

**Blockers: none remaining.** This report does not replace the earlier Employee reviews or certify complete desktop parity, production integration, server authorization or deployment.

## Scope and source authority

The goal was to extend Employee Hours with Recorded time, Timecards and Corrections while preserving the approved Owner-derived teal design and Employee permissions. The source of capability semantics remains the read-only desktop development checkout at `46e202786863279302026ee03a0e225c359fa55c`.

I inspected desktop `src/lib/timecards/service.ts:116` for own-record restrictions and `:170` for manager-only mutations; `src/lib/timecards/project.ts:35` and `:113` for inclusive1–31-day ranges, gross elapsed periods, separate breaks and observed-time clipping; and correction validation/read-model/component sources for ENTRY_BOUNDARY, BREAK_BOUNDARY, MISSING_ENTRY, Pending/Approved/Rejected states, revision-bound missing adjustments and same-request uncertain retry. There is no Employee correction cancellation capability in that inspected model. The prototype now removes the old correction-cancel control while retaining time-off cancellation.

These observations establish design alignment with the inspected source. They do not prove runtime authorization or durable submission in this fictional prototype.

## Evidence and verification

- Read local AGENTS, PRODUCT/DESIGN contracts, frozen reference manifest, source-semantics analysis, baseline snapshots and implementation modules. All five frozen reference hashes still match. The workspace is not a Git repository.
- Inspected the available333-line baseline diff, saved in `work/employee-mobile/evidence/hours-review/available-source-diff.patch`, and all new Hours, time-record, effective-time, Timecards and correction modules. The diff covers preserved baseline files; new modules were read in full rather than represented as an invented Git diff.
- Independently ran the inspected `build.mjs --check` path, which rebuilds in memory and matches saved HTML. Independently fetched the localhost HTML and verified the final served hash above.
- Own final headless Chromium run: `evidence/hours-review/final-capture.cjs` and `final-manifest.json`. Fifteen captures cover Recorded time, Timecards, period history, Corrections, approved missing time at320/390px, correction history at200% text, proposal review, cross-kind uncertain recovery, and the Pending correction mirrored into Requests. The run asserts default totals, internal text-column fit, unchanged retry proposal content, no editable retry fields and exactly one Pending request after retry. No runtime errors occurred; user browser tabs were not used.
- Inspected final screenshot surfaces including `timecard-390.png`, `timecard-history-320.png`, `approved-missing-390.png`, `correction-review.png`, `uncertain-cross-kind.png`, `correction-history-final200-320.png`, `correction-history-final200-390.png` and `pending-requests-final200.png` in that directory. Also inspected implementation captures for corrected original/effective entry details, correction forms and enlarged timecard content.
- Inspected all30 current browser-result JSON files: the original114 scenarios plus18 Timecards,9 correction groups and8 Hours accessibility checks per engine, all naming the final hash, with no reported failures/runtime errors. That is149 grouped cases per engine, not149 independently rerun scenarios by this reviewer and not a feature-completion percentage. Chromium/WebKit/Firefox result files and their hashes are recorded in `evidence/hours-review/final-evidence.json`.
- Source hashes, frozen-reference verification and exact result-file hashes are also retained in `final-evidence.json`. Test runners were inspected; the new regression checks measure internal text columns, not only page overflow.

## Findings by severity

### CRITICAL

None. Live React components render the interface. No screenshot, raster or background image substitutes for controls, time records or history. The existing wordmark and SVG icon sprite remain legitimate assets.

### HIGH

None. Shared Button, Select, ViewSwitcher, Row, Field, Status, Receipt and dialog primitives are reused. New styles consume the existing palette, type, spacing, radius and control-height roles. The new timecard totals use the existing modest task-fact type size; no new decorative palette or oversized metric treatment was introduced. Existing shared optical dimensions and component layout minima are not per-screen visual copies.

No manager approval/finalization/export, Employee correction cancellation, phone clock-in/out or payroll-execution control was found. The prototype's correction receipts remain explicit about sample state and manager review.

### MEDIUM — resolved before approval

**M1: enlarged correction titles overlapped their status.** On initial `be7e97…`, CorrectionHistory at320px/200% gave the Missing-time text column80px while its content needed114px. “Missing” ran beneath Approved; whole-row/page widths still fit, so broader overflow checks missed it. The newly mirrored Requests correction row similarly had96px allocated for150px of text. Original reproduction: `correction-history-200.png`, `draft-history.json`, `pending-requests-200.png` and corresponding scripts under `evidence/hours-review/`.

Resolved in `src/components.css:13` and `:23`: the shared list container stacks trailing status below readable text when available width is small, preserving icon alignment. Own final320/390px200% checks confirm row-copy scroll widths fit client widths. Final captures show separate, legible title/date/status hierarchy in both entry points. Root's eight-case accessibility regression adds coverage for these exact internal-column failures.

**M2: uncertain retry did not show the proposal being retried.** The previous screen only said “Retry same request.” Because recovery is keyed per entry, reopening through Correct break could recover an earlier clock-in/out operation without showing what would be submitted.

Resolved in `src/TimeCorrectionForm.tsx:47`: the read-only summary renders correction kind, dates/times and reason from the retained operation, not the newly selected target. My final browser run opened an uncertain clock-in/out request through Correct break and verified the original clock-in/out proposal and reason remained visible, fields remained absent and retry created one Pending item. `Hours.tsx` retains retry records across in-app navigation and deduplicates submission by id. This demonstrates the local fixture; it does not prove network idempotency.

**M3: enlarged navigation and hidden-link defects — resolved.** The Hours selector needed enough intrinsic width for enlarged labels; shared `ViewSwitcher` now has min-content sizing. The skip link previously peeked into the header at200% because its fixed negative offset did not hide its wrapped height. `src/layout.css:24` clips it while unfocused and removes clipping on focus. Final captures and matching accessibility results confirm readable selectors, an unfocused hidden link and visible keyboard access.

### LOW — resolved details

The corrected-entry note now says “at 11:24 AM” with proper spacing. Declined timecard history uses the existing danger tone consistently with Corrections/Requests, and notice copy uses the existing dark teal on the teal wash. No additional low-severity blocking visual finding remains in the inspected pass.

## Time and permission consistency

Default gross recorded time reconciles to478 minutes on Oct23 +475 effective minutes on Oct22 +142 open minutes through Oct26,11:24AM +60 approved missing minutes on Oct21 =1155 minutes, or19h15. Breaks remain a separate60 minutes. Last week excludes the active entry and shows16h53 gross. Oct22 alone is7h55 gross and30 minutes of breaks; its completed-entry row correctly shows7h25 after breaks.

The immutable Oct22 original9:00AM punch is retained while the effective approved start is9:05AM. The approved Oct21 missing10–11AM remains an adjustment, not a fabricated Clocker punch. Pending proposals appear in history and leave effective totals unchanged; declined proposals are identified as not changing effective time. The default card explicitly states that its recorded total includes breaks and is not payroll hours. Open entry/break and overnight fixtures are bounded by the sample observation time and Puerto Rico business dates.

The stale/partial path withholds trusted totals and provides a reachable refresh route. Active entries do not offer a correction action before closure. Completed-entry, break and missing-time forms preserve original/effective/proposed distinctions, review before submission, explain manager review and expose neither employee approval nor cancellation of submitted corrections.

## Design conclusion and limits

The three Hours views fit the existing teal system. The current-day card, restrained timecard summary and correction history provide a clear progression from checking time to understanding a period to requesting a change. Shared controls retain48px primary/field and44px compact targets. Status text carries meaning alongside color. Enlarged rows now reflow rather than collide; lower form and history content remains reachable through scrolling.

Approval covers this exact local, fictional, in-memory implementation and the inspected scenarios. Refreshing the document clears sample data and retry state. Unsubmitted drafts can be discarded when a sheet closes. There was no real transport uncertainty, server conflict, offline/session recovery, durable write or production permission enforcement exercised. Native device pickers, software keyboards and screen-reader behavior are not certified. Communications, account tools, gated Pay and other remaining ledger items are not implied complete by this Hours review.

Only review scripts, captures, manifests and this report were written by this reviewer. No application-source fix, production edit, commit, push or deployment was performed.

---

## Bounded extension recheck — historical timecard snapshots

**Recommendation: APPROVE the bounded history extension.**

Current root artifact SHA-256: `7e67de96a175839837b25fa7cdea8ffb983db6bc0f0716b462799bd76852e72b`.

**Blockers: none.** The complete `89acc496…` Hours review above is preserved. This addendum covers `TimecardHistory.tsx`, its read-only snapshot types and scoped CSS, the optional Timecards history input, and the explicit historical observation-time parameter.

`Timecards` defaults history to an empty array and filters revisions to the exact selected period. `TimecardHistory` uses native details/summary disclosure, existing SVG carets, shared text/status/spacing/color roles and a visible focus outline. It displays revision/action, actor, note, preserved observation time, original punches, effective boundaries and breaks. Revision records have no mutation controls or callbacks to the current entry editor. Sorting copies the revision array; projection copies the records/break arrays and does not mutate the supplied snapshots.

Historical open intervals are projected using each revision's `observedAt`, rather than today's sample clock. This is a distinct argument on `projectPeriod`/`elapsedMinutes`; existing callers retain the prior default observation time. The six projection checks include an open interval frozen at60 minutes. No new historical manager decisions were added to the real mockup's fictional model.

### Evidence

- Read all four changed source modules and the separate history harness/test runner. Independently ran the source-to-saved build check and matched saved/served root bytes to the current hash.
- Independently rebuilt the history harness in memory with its inspected recipe and matched all three saved harness HTML files byte for byte. Their separate hash is `c28944008aea9206041510ad77ed334ac2dd862a275c3a076c477bda455e0425`; it is intentionally different from the root mockup hash. All three matching `history-<engine>.json` reports contain10 completed checks, no failure and no runtime errors.
- The harness uses deeply frozen fictional revisions. It verifies exact-period filtering, descending revisions, keyboard disclosure/focus, original/effective times, actor/note, preserved totals after changing current data, absence of mutation controls, touch geometry and320px200% reflow. These are inspected worker executions; I independently verified their current-source correspondence, not reran all30 scenarios.
- Visually inspected `history-chromium-390.png` and `history-chromium-320-text200.png` under `.omo/evidence/employee-timecards/`. Disclosures, totals and date/time details retain the existing visual hierarchy and fit the narrow enlarged layout. The harness's outer “Fictional history test” controls are test scaffolding, not proposed application UI.
- Own browser check on the current root mockup selected Last week and confirmed there is no populated Timecard history section and the existing no-decisions message remains. Evidence and source hashes: `work/employee-mobile/evidence/hours-review/history-extension-evidence.json`; reproducible check: `history-recheck.cjs`.
- All30 integrated result files now match the current root hash and report no failure/runtime errors, retaining149 grouped cases per engine. Exact file hashes are in `history-extension-suites.json`. The10-per-engine component-harness checks are additional, separate evidence; they do not imply populated history is connected to a real backend.

### Findings and retained limits

**CRITICAL:** None. **HIGH:** None. **MEDIUM:** None. **LOW:** No new material finding in this bounded recheck.

The native disclosures are real interactive DOM elements; snapshot content uses the existing design system and remains read-only. No employee approval/finalization/reopen/export action was introduced—the action words describe historical records only. This verifies the optional presentation capability with fictional harness data. The root mockup intentionally has no historical decisions, and backend history loading, immutable server storage, permissions, real-device behavior and production integration remain unverified. All limitations from the full review continue to apply.
