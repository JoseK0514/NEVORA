# Remaining Owner mobile work

Updated October 27, 2026 (America/Puerto_Rico) against the original 100-group source inventory and the later Schedule, Team/access, account-recovery, Timecards/corrections and Home reports. This is a design-work list for the isolated Owner mobile mockup, not a production-completion claim. Inventory source reference remains 46e202786863279302026ee03a0e225c359fa55c. Mockup SHA-256: 65f2a5d5cbb596f90a2d08adb2fca30c869e1142e8325e9d25f23326e70d1c64. Section 1 timecard decisions have now been added to the local mockup. The employee detail has also received a bounded [organization refinement](timecard-detail-polish/review.md).

The 100 inventory groups include 53 with working bounded mockup slices, 43 with remaining/partial work and 4 Owner exclusions. Groups vary greatly in size: these are not screen counts, effort estimates or a completion percentage. All workflows still require actual app integration and full parity acceptance.

Already represented as working mockup slices: core Schedule S-01–15, sample schedule activity H-05, Team T-01–08, time-correction decisions A-02, account recovery A-03 and timecard browsing/decisions P-01–05. Latest Home polish adds personal welcome, Add shortcuts, staffing and upcoming-shift treatment. Home/Inbox source, count, state and connected-action requirements now have a bounded working implementation. Attendance exception review A-01 and missing-clock-in detail I-02 are now working bounded slices; [attendance review](owner-attendance/review.md). Availability R-01 and weekly Team H-04 are also working bounded slices; [weekly Team review](owner-weekly-team/review.md). Time-off decisions/history R-02/R-03 are now bounded working slices; [time-off review](owner-timeoff/review.md). Shift swaps/coverage pickups R-04 are now a bounded working slice; [review](owner-exchanges/review.md). Callouts/closing coverage R-05/R-06 are also bounded working slices; [review](owner-callouts/review.md). Home/Inbox triage and the connected local Section2 gate are complete; [review](owner-triage/review.md). Company details/settings navigation C-01/C-02 is complete as bounded3.1; [review](owner-company/review.md). Locations C-03/C-04/C-05 is complete as bounded3.2; [review](owner-locations/review.md). Positions/break types C-10/C-11 is complete as bounded3.3; [review](owner-catalogs/review.md). Branding/logo C-06 is complete as bounded3.4; [review](owner-branding/review.md). Batch3.5 Features and words is complete; [review](owner-features/review.md). Next3.6 Company/location operational policies and history/conflicts. Contact/delivery/authorization simulations remain demonstrations.

## Workflow coverage (checked rows are completed mockup slices)


### Navigation and discovery

- [ ] **N-01 · Move between the five owner areas** — Five roots/navigation are built. Finish module/capability-aware visibility, direct-route and cross-workflow continuity in the integrated app.
  - Scope: Use the same authorized destinations on desktop/mobile; preserve selected period, location, scroll, filters and meaningful Back/focus.
- [ ] **N-02 · Find tools, people and places** — Tool search exists. People/place discovery and complete authorized source results remain.
  - Scope: Reconcile authorized pages, common actions, people and places, including remotely loaded results; handle loading/offline/unavailable without false no-match; remove Owner My time; make contextual tools findable.

### Home and setup

- [x] **H-01 · Understand today’s staffing and exceptions** — Published Schedule staffing, open recorded-punch count and complete local exception projection; current scoped counts, incomplete/loading/offline/expired/access/empty states, no invented next arrival. Production unified Today matching remains an integration requirement. [Review](owner-triage/review.md).
  - Scope: Bind every count and item to the same current source; cover no shifts, all clear, multiple and ended missing clock-ins, partial and unavailable observations.
- [x] **H-02 · Open the correct action from Home** — Home groups current actions into exact Inbox filters and supported full reviews. Stable request/shift/person/week/date/location and direct/nested origin return after reload or item resolution are checked. [Review](owner-triage/review.md).
  - Scope: Carry exact request, shift, location, date and origin into attendance, coverage repair and review, then return to that origin.
- [ ] **H-03 · Finish initial company setup** — An incomplete-setup example exists. Complete the actual coverage/lead configuration and weekly-hour-target checklist, including no-location and completion states.
  - Scope: Use the real two checks: coverage/staffing/lead periods and employee hour targets; distinguish zero locations and completion; deep-link to the exact fixing section.
- [x] **H-04 · Inspect team overview by week** — Full weekly people/planned-hours/target review and exact availability/profile/Schedule/settings handoffs. [Review](owner-weekly-team/review.md). Actual application integration remains.
  - Scope: Show active team, submitted availability, missing/outside targets, scheduled hours and target links with week controls; preserve observed scope.

### Inbox

- [x] **I-01 · Triage Act now, Requests and Plan ahead** — All/Act now/Requests/Plan ahead combine existing fictional domain reads with one count model; future/past/planning/open offers remain visible without urgent inflation. Repeated items group and partial totals stay unavailable. [Review](owner-triage/review.md).
  - Scope: Reconcile the source filters now/requests/planning with the proposed All/Today/Requests labels; retain planning/setup items, deep-linked item, exact counts and return context.
- [x] **I-02 · Review a late or missing clock-in** — Running/ended review, stable employee/date/timecard handoffs and phone-gated contact previews with exact origin return. [Review](owner-attendance/review.md). Home/Inbox now uses the shared current triage projection.
  - Scope: Distinguish running and ended missing clock-in; open employee and timecard; show Call/Text only with a phone; carry selected employee/date.
- [x] **I-03 · Continue to the appropriate full review** — Exact Attendance/Schedule/time-off/shift-request/correction/timecard/Availability/weekly-Team destinations and meaningful Back/focus survive decisions and supported nested reloads. Actual integration/full parity remain separate. [Review](owner-triage/review.md).
  - Scope: Different request types must reach their correct authoritative review, expose all decision facts and preserve originating filter/item after decision.

### Requests and availability

- [x] **R-01 · Review team availability submissions** — Not sent/Sent, dated daily windows, deliberate unavailable, timestamps/deadlines, filters and protected states. [Review](owner-weekly-team/review.md). Actual application integration remains.
  - Scope: Not sent/Sent, submitted windows/timestamps, intentional unavailable versus no submission, multiple windows/day, deadline state, employee deep link and invalid-week recovery.
- [x] **R-02 · Approve or decline time off** — Full/partial-day review, exact scheduled overlap, deliberate terminal decisions and changed/unconfirmed recovery. [Review](owner-timeoff/review.md). Actual application integration remains.
  - Scope: Show full/partial dates and note, affected week and current pending state; approve/decline against current source and return to exact origin.
- [x] **R-03 · Inspect decided time-off history and stale links** — Approved/Declined detail, reviewer/time, explicit missing history and fresh-status stale-link recovery. [Review](owner-timeoff/review.md). Actual application integration remains.
  - Scope: Pending/Approved/Declined histories, reviewer/time receipt and already-decided deep-link recovery; preserve Home/Inbox filter/item.
- [x] **R-04 · Review swaps and coverage pickups** — Both original shifts/accepted pickup, explicit decisions, simulated assignment updates, history, revision/eligibility/conflict and original-operation recovery. [Review](owner-exchanges/review.md). Actual server eligibility and integration remain.
  - Scope: Expose both complete shifts, people, dates/locations and current eligibility; approve/decline with revision, conflict and uncertain-outcome handling.
- [x] **R-05 · Review an unable-to-work callout** — Full reason/shift review, explicit decisions, exact reviewed absence and linked coverage, history and guarded recovery. [Review](owner-callouts/review.md). Actual integration remains.
  - Scope: Show reason/note/shift; approval releases the applicable assignment and leaves coverage required; stale approval cannot release a changed shift.
- [x] **R-06 · Close an open coverage request and inspect lifecycle** — Open queue, explicit closure consequences, revision/source/race/receipt recovery and history. Closure retains approved absence and never fills coverage. [Review](owner-callouts/review.md). Actual integration remains.
  - Scope: Waiting/Open cover/Done, close coverage while original assignee remains, lifecycle history and reconciliation/retry of the original decision.

### Attendance and recovery

- [x] **A-01 · Review attendance exceptions** — Source-separated observations, expected/recorded evidence, filters, protected read states and exact employee/timecard/correction handoffs. [Review](owner-attendance/review.md). Actual app integration remains.
  - Scope: Verified exception summary and person/timecard actions; refresh, sign-in, paused/offline, error and healthy empty; clear people on access loss.
- [ ] **A-04 · Check a saved Clocker action receipt** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Saved UUID → Check → recorded action/person/time/device/location or Not recorded yet; explain finish on same tablet and link wrong/missing time to Timecards.

### Company settings

- [x] **C-01 · Navigate company settings by task** — Grouped hub, conditional visibility, truthful future children and nested/direct returns are checked. [Review](owner-company/review.md).
  - Scope: Keep Company / Scheduling / Pay grouping; every child, authorized visibility, direct-route denial and nested Back must work.
- [x] **C-02 · Update company name and timezone** — Focused name/time-zone/Monday editor, protected zone, validation, truthful save/recovery and guarded navigation. Current-read UX guard only; no invented expected-version or receipt. [Review](owner-company/review.md).
  - Scope: Edit name; explain timezone lock after operational records; Monday week start stays factual; current-version save, stale/error and success.
- [x] **C-03 · Search and manage the location directory** — Current directory/search/readiness/status/healthy-empty and partial/denied states, stable row/detail/filter/More/Settings return and eligible-Team nested-person reload. Active Settings count is distinct from full directory. [Review](owner-locations/review.md).
  - Scope: List/search/status filters, active/inactive/setup-needed, no-location/no-match, detail and add; distinguish view scope selector from location editing.
- [x] **C-04 · Add a location** — Source-owned name/short-name/optional immutable key, validation/pending/success/unknown create recovery and explicit retry review. New records have no invented setup defaults and connect to current staffing/eligibility. [Review](owner-locations/review.md).
  - Scope: Complete actual location inputs and validation, deliberate save, result and setup next steps.
- [x] **C-05 · Edit or deactivate a location** — Name edits and deliberate deactivate/reactivate use exact timestamp CAS; key/identity and manual/generated history are retained. Current choices and new assignments honor inactive status; source/access/context-loss and conflict recovery are checked. [Review](owner-locations/review.md).
  - Scope: Existing location form, status/consequences, current-version update, pending/conflict/success; preserve immutable Clocker key.
- [x] **C-06 · Change branding and logo** — Focused color presets/custom hex/reset with accessible draft preview; PNG/WebP choose/replace/remove and staged preparation separate from brand save; source-shaped shared-revision merge/replay/unknown recovery, read-only history, permanent wordmark plus company logo and saved accent adapters. Verified only in local mobile Owner mockup. [Review](owner-branding/review.md).
  - Scope: Preset/custom hex/reset teal, valid PNG/WebP upload/remove, preview/Save and recent revision; retain original operation for retry.
- [x] **C-07 · Set terminology and enabled modules** — Fixed source presets and feature choices, focused autosave, disable blockers, shared-revision recovery and connected gates are complete in the local mobile Owner mockup; [review](owner-features/review.md).
  - Scope: Vocabulary preset and module toggles for time off/swaps/updates/statements/breaks; explain impacts, autosave and blockers before disable; failure restores truthful state.
- [ ] **C-08 · Configure company/location operational policies** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Company/location scope; late/early/missing in/out/overtime-risk/long-entry rules; configure/off/inherit, thresholds/effective dates and readonly inactive scope.
- [ ] **C-09 · Review policy history, conflicts and replacement** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: History, refresh, compare/discard conflicts, retained-save retry and full replacement review for corrupt revision; preserve draft until deliberate discard.
- [x] **C-10 · Add, rename, retire or reactivate positions** — Active/retired search and details, add/rename/retire/reactivate with timestamp CAS; current active-member counts; Team/Schedule/Inbox labels and inactive qualification choices agree. Retained work/history and optional-position shifts remain intact; invalid active quotas block rebuild before deletion. [Review](owner-catalogs/review.md).
  - Scope: Active/retired lists, create/rename/retire/reactivate and qualification counts; explain that positionless shifts remain allowed.
- [x] **C-11 · Configure break types** — Active/archived search, add/edit name/category/reference minutes and deliberate archive/reactivate with integer-version CAS; NFC and duplicate validation, neutral unconfirmed-result recovery and captured/recorded break invariance. No paid/legal defaults or automatic ending. [Review](owner-catalogs/review.md).
  - Scope: Active/archived, create/edit name/classification/reference minutes, deliberate archive/reactivate; existing break history remains unchanged.
- [ ] **C-12 · Set up a shared-tablet Clocker device** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Add named device at active location; show/copy/hide setup code, no active location path, pending/error/stale-write; protect transient code.
- [ ] **C-13 · Rename, reconnect, replace or revoke Clocker device** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Device filters, rename, replacement/reconnect/new code, revoke confirmation and exact outcome; keep device identity visible.

### Timecards, payroll and insights

- [x] **P-02 · Approve an individual timecard** — Individual exact-revision approval review, confirmed result, blockers, conflict and original-operation uncertain recovery. [Review](timecard-decisions/review.md). Actual application integration remains.
  - Scope: Review exact period/person/revision, resolve blocking issues, approve with confirmed receipt; distinguish pending/conflict/unknown result.
- [x] **P-03 · Finalize an approved timecard** — Separate approved-revision finalization review/result; immutable captured time, never automatic payroll approval/payment. [Review](timecard-decisions/review.md). Actual application integration remains.
  - Scope: Separate Finalize action and result for an approved card; explain finalized record versus payroll approval/export.
- [x] **P-04 · Reopen a finalized period with a reason** — Required single-line reopen reason, frozen-revision authority, retained history, current-source review cycle and approved-payroll block. [Review](timecard-decisions/review.md). Actual application integration remains.
  - Scope: Required reason, exact historical/current context, reopen receipt and history; explain later downstream review needs.
- [x] **P-05 · Review and approve/finalize a batch** — Focused 1–100-person eligibility/selection, exact-set acknowledgement, inspection and separate per-person results; stop after failure/unknown and same-operation recovery only. [Review](timecard-decisions/review.md). Actual application integration remains.
  - Scope: Explicit eligible selection (max 100), exact-set review and fresh confirmation for each action; per-person success/blocked/unknown/not-submitted results and same-command retry.
- [ ] **P-06 · Generate a finalized-time export** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Choose period, review finalized population and selection/100-person boundary, generate current export, validate receipt and download mapped CSV/canonical JSON.
- [ ] **P-07 · Create and select export mapping profiles** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Dedicated mobile access to saved profile, file layout/columns/date/hour precision/provider reference and deliberate reviewed Save; preserve revisions and retry identity.
- [ ] **P-08 · Review full payroll population and employment facts** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Review each period member/disposition and entrants/leavers/evidence; save population revision including zero-time/excluded people.
- [ ] **P-09 · Reconcile export batches into a verified manifest** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Select original receipts covering included people exactly once, prepare verified manifest, review stale/partial/exclusion states and retain original uncertain command.
- [ ] **P-10 · Download handoff artifacts and record downstream status** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Manifest/CSV/canonical artifacts and history; record destination/reference and reported submitted/imported status with explicit unverified meaning.
- [ ] **P-11 · Browse current and historical payroll runs** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Current/past periods, run state/revision, settings link, no runs and prerequisites; distinguish native recorded-time and historical provider modes.
- [ ] **P-12 · Prepare payroll draft or missing historical period** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Prepare period/date/payday separately from approval; missing-period backlog, schedule-transition acknowledgement and saved effective settings; blocked prerequisites.
- [ ] **P-13 · Recalculate native payroll or import provider amounts** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Recalculate current native draft; historical provider JSON/file import validates period/payday/source; keep modes separate and show missing facts rather than invented amounts.
- [ ] **P-14 · Review amounts, source evidence and native breakdown** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Gross/deductions/contributions/net, employee search/detail, native hours/wages/tax/YTD evidence or provider source; explain blocking exceptions.
- [ ] **P-15 · Approve an exact payroll revision** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Explicit review confirmation, exact revision/token and confirmed receipt; block changed source/missing facts and distinguish approval from PDF readiness/publication.
- [ ] **P-16 · Create linked payroll corrections** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Reason and original-run context; native correction recalculates a separate draft, historical provider correction imports trusted amounts; new review/approval and original history retained.
- [ ] **P-17 · Publish and view private employee statements** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Native automatic verified publication versus historical-provider explicit publish; generation pending/failed states, protected View/Download and corrected-original history.
- [ ] **P-18 · Prepare payment instructions and retry failed jobs** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Show job kind/status/attempt/error and authorized retry; historical-provider payment instructions clearly unverified, native flow exposes no payment export.
- [ ] **P-19 · Set payroll company preferences and effective schedule** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Company/language/USD, frequency/anchor/payday, mode-appropriate rules/provider/bank preferences, automation and effective date/reason with revision history/impact.
- [ ] **P-20 · Set employee exceptions and financial access** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Employee statement-language/rule exceptions and inheritance/effective date; provider-mode review/approval grants with reason, separate from operational management scope.
- [ ] **P-21 · Document employee native payroll facts** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Select employee; actual effective wages, location/break rules, workweek evidence, withholding/employer facts and authorized deductions; retained drafts/conflict review/explicit replacement.
- [ ] **P-22 · Record opening balances and native Manager payroll scope** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Choose documented tax year, separate attested zero/missing balances, preserve other drafts, block frozen/unchecked opening history; grant native review/approval for specific locations.
- [ ] **P-23 · Inspect workforce insights by period** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: This week/last week/30 days/custom, recorded vs scheduled time, people with no time, attendance/changes/approvals, definitions/reliability and exact timecard links; disclose incomplete plan/unknown overtime.
- [ ] **P-24 · Export or print an insights report** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: CSV and Print/Save PDF with current period and verified snapshot; export pending/error/offline/expired handling and readable mobile download handoff.

### Updates and notifications

- [ ] **U-01 · Browse company updates and reply requirements** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Manager All/Needs reply, current complete/partial list, read counts, detail and compose; empty and unavailable remain distinct.
- [ ] **U-02 · Write and publish an update after audience review** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Content/type, location/today’s team/published-shift audience, expiry and acknowledgement requirement; audience preview/fingerprint then deliberate Publish; retained draft and status lookup.
- [ ] **U-03 · Read, edit or withdraw an existing update** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Full text, recipient acknowledgement/read status, author/version-allowed edit/revise and withdrawal confirmation; current-version refresh, unknown-result lookup and no accidental duplicate publish.
- [ ] **U-04 · Review notification history and mark read** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Open each real notification/target with exact context; management mark-read, unread count coherence, refresh/retry/session-ended and protected data clearing.

### AI manager

- [ ] **AI-01 · Read the owner priority briefing and follow sources** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Show evidence/observed time, partial/unavailable assessment and source links; all-clear only for actually assessed sources.
- [ ] **AI-02 · Track, defer, dismiss and restore briefing issues** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Track/Later one hour/Not relevant today/Restore and follow-through; distinguish resolved/not-current/unverified/evidence-changed; dismissal does not fix the business issue.
- [ ] **AI-03 · Ask a question, cancel and inspect evidence** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Starter questions, question limit, busy/cancel, conversation/answer/source review, unavailable AI connection and safe retry; no operational changes implied.
- [ ] **AI-04 · Save owner priorities with conflict review** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Edit priorities, dirty/save/pending state and current saved-priority conflict review before replacement.
- [ ] **AI-05 · Prepare coverage options and attendance/payroll review** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Coverage date/candidates → exact replacement review; period/language → attendance and payroll exceptions; incomplete sources and unverified financial readiness stay explicit.

### Your account

- [ ] **F-01 · Read and edit the owner’s own profile** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Use Owner management profile identity/contact/company/timezone; edit/missing-email Add opens own authorized employee editor; loading/error/pause.
- [ ] **F-02 · Set owner notification topics and device alerts** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Per-topic time-off/shift/unable-to-work/clock-review/payroll-ready preferences; save/pending/offline/failure; current device-alert readiness and notification history link.
- [ ] **F-03 · Add or remove a passkey** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Current passkey list, supported-device setup, explicit remove/Keep confirmation, empty/loading/retry/error and session recovery.
- [ ] **F-04 · Read personal pay statements** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Owner QuietMyPay current/next payday from real calendar, own published statement history, PDF download and empty/failed/private-access states; no Owner My time link.
- [ ] **F-05 · Read support, privacy and terms** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Real support answers/email/legal content and account-deletion information, accessible readable pages and return; support contact is user initiated.
- [ ] **F-06 · Request deletion of the personal account** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Identity/current password/show-hide and explicit confirmation, duplicate/request receipt and Done sign-out; explain Owner workspace remains open and company closure is separate support request.
- [ ] **F-07 · Sign out and recover an ended session** — Preview or full workflow still requires Owner mobile design and verification.
  - Scope: Visible deliberate sign-out, private-state cleanup, pending/failed sign-out and sign-in/forgot/reset/activate handoffs; safe return to actual owner scope.

## App-wide finishing and integration

The following apply to the whole product, including the slices already demonstrated. Some are already covered in bounded mockup tests; they still need complete integration/device acceptance.

- [ ] **Q-01 · Loading, healthy empty, partial and failed reads** — Only a successful complete current read may say none/all clear. Show useful recovery for timeout and partial source; no private sample/old data as current.
- [ ] **Q-02 · Offline, reconnecting, hidden/paused and stale data** — Explain connection/age and suspend decisions; re-read on return. Clear protected content as existing controls require; no phantom success.
- [ ] **Q-03 · Session ended, role/scope revoked, disabled module** — Remove unauthorized navigation and private content; direct routes/actions enforce current gates, explain unavailable capability and offer legitimate sign-in/recovery.
- [ ] **Q-04 · Draft, published, historical and superseded sources** — Label current revision/context; history is never editable as the current record. Source change invalidates exact-revision review where required.
- [ ] **Q-05 · Validation, missing data and eligibility** — Name the field/reason and how to fix it; distinguish missing/unset from a confirmed zero. Keep entered values and correct focus; server validates all rules.
- [ ] **Q-06 · Pending, confirmed success and partial batch result** — Disable duplicate submission, show actual action identity and truthful receipt, exact target/date/scope and next step; each batch outcome stays visible.
- [ ] **Q-07 · Unknown result, retry and status lookup** — Preserve the original operation identity and reconcile; do not start another operation or infer failure from timeout. Avoid showing sample Undo when source has no authorized reversal.
- [ ] **Q-08 · Back, deep link and interrupted work** — Carry exact date/week/location/person/filter/item and safe origin; preserve search/scroll and unsaved entries; return focus near meaningful content; handle vanished/already-decided targets.
- [ ] **Q-09 · Small phones, text enlargement and mobile input** — Complete labels/values, reachable controls above safe area/keyboard, consistent touch targets; native time/date/select/file pickers, long names and translated content.
- [ ] **Q-10 · Keyboard, screen reader, reduced motion and meaning** — Visible focus and correct names/order, trapped modal/restored focus, announced errors/receipts, status beyond color and reduced motion; actual assistive-tech testing pending.
- [ ] **Q-11 · Sensitive and consequential actions** — Clear person/scope and actual consequence before confirmation; privacy and transient-code cleanup; permissions remain explicit; no real messages/money/data mutations in tests without authorization.
- [ ] **Q-12 · Integration, device and permission verification** — Use isolated test fixtures and approved references; verify real server guards, conflicts and network states, mobile browsers/devices and downloads. Prior mockup test passes do not certify these workflows.

## Recommended order

1. Individual timecard approval → finalization → reasoned reopening → batch review.
2. Attendance, request lifecycles, full availability review and exact Home/Inbox handoffs.
3. Company/location settings, catalog lifecycles and Clocker device administration/receipt lookup.
4. Time exports and their mapping/population/manifest/handoff flows.
5. Payroll, employee financial setup and workforce reports, subject to actual enabled modes/capabilities.
6. Company updates/notifications and Owner account/preferences/passkeys/legal/session flows.
7. Conditional AI-manager surfaces when enabled.
8. App-wide physical-device/accessibility/state review and real application integration across every slice.

No employee-only My time, request submission, swap/cover/callout submission or employee-only account/profile behavior is added to the Owner list. Payroll availability does not imply money transfer or banking execution. Full payroll/statement/provider flows must follow actual source mode and permissions.

Latest batch3.4 changes the standalone mobile mockup and reconciliation records. Actual application/API/database/customer data, real messages, branches, commits and deployments remain unchanged. Prior reports remain historical.
