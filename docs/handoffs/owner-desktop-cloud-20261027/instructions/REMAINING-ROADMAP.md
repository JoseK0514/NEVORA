# Remaining Owner desktop roadmap

G10 was locally finalized and audited before this handoff. G11–G16 remain planned/unstarted; start the next group only within the user’s authorized scope. Source links/conditions for every workflow remain in the full roadmap.json.

## G11 — Statements and payment-job visibility

Publish private statements and inspect authorized job outcomes truthfully.

Depends on: G10. Workflows: P-17, P-18, F-04.

- Employee statement publication is deliberate and privacy-scoped; personal My pay shows only the Owner’s own available statements.
- PDF/document readiness, publication and job execution expose independent pending/failed/ready states.
- Authorized job retries retain kind/attempt/error context and reconcile unknown results.
- NEVORA does not process payments; historical-provider payment instructions remain unverified and native flow exposes no payment export, matching inspected source.

### P-17 — Publish and view private employee statements

**Source conditions:** canReview private scope, canApprove where explicit publish applies; no document-ready claim from approval alone.

**Remaining acceptance:** Native automatic verified publication versus historical-provider explicit publish; generation pending/failed states, protected View/Download and corrected-original history.

- src/components/payroll/portal-statements.tsx:8 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/components/payroll/portal-statements.tsx#L8
- src/components/payroll/payroll-ui.tsx:36 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/components/payroll/payroll-ui.tsx#L36

### P-18 — Prepare payment instructions and retry failed jobs

**Source conditions:** canApprove; NEVORA does not process payments or establish bank compatibility.

**Remaining acceptance:** Show job kind/status/attempt/error and authorized retry; historical-provider payment instructions clearly unverified, native flow exposes no payment export.

- src/components/payroll/payroll-runs.tsx:113 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/components/payroll/payroll-runs.tsx#L113

### F-04 — Read personal pay statements

**Source conditions:** Payroll enabled + payStatements module + own authenticated statement access.

**Remaining acceptance:** Owner QuietMyPay current/next payday from real calendar, own published statement history, PDF download and empty/failed/private-access states; no Owner My time link.

- src/components/payroll/my-pay.tsx:79 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/components/payroll/my-pay.tsx#L79

## G12 — Team overview and insights

Explain staffing and recorded work with trustworthy periods and measures.

Depends on: G02, G03, G07. Workflows: H-04, P-23, P-24.

- Team overview uses exact week/location scope and links to people/schedule evidence.
- Insights names units, source age and included population; planned hours, recorded time and pay never share an ambiguous total.
- No invented charts or decorative metrics; unavailable/partial data cannot appear as zero.
- Export/print retains report period, filters, units and source conditions.

### H-04 — Inspect team overview by week

**Source conditions:** Owner/company operational authority; no invented metrics.

**Remaining acceptance:** Show active team, submitted availability, missing/outside targets, scheduled hours and target links with week controls; preserve observed scope.

- src/components/manager-dashboard.tsx:130 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/components/manager-dashboard.tsx#L130

### P-23 — Inspect workforce insights by period

**Source conditions:** Management operational authority; all desktop report sections remain accessible on mobile through detail/disclosures.

**Remaining acceptance:** This week/last week/30 days/custom, recorded vs scheduled time, people with no time, attendance/changes/approvals, definitions/reliability and exact timecard links; disclose incomplete plan/unknown overtime.

- src/components/reports.tsx:258 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/components/reports.tsx#L258

### P-24 — Export or print an insights report

**Source conditions:** Current report/private scope; no file-ready claim from an unconfirmed request.

**Remaining acceptance:** CSV and Print/Save PDF with current period and verified snapshot; export pending/error/offline/expired handling and readable mobile download handoff.

- src/components/reports.tsx:368 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/components/reports.tsx#L368

## G13 — Company updates and notification history

Write an update after audience review and understand its later state.

Depends on: G01, G05. Workflows: U-01, U-02, U-03, U-04.

- Browse/read updates with reply requirements and current/history state.
- Compose retains drafts and reviews exact audience before publication; publishing and delivery are distinct.
- Edit/withdraw preserves version and audience implications.
- Notification history and mark-read do not imply delivery; no real email, SMS or push in prototype tests.

### U-01 — Browse company updates and reply requirements

**Source conditions:** updates module and current management communication/company authority.

**Remaining acceptance:** Manager All/Needs reply, current complete/partial list, read counts, detail and compose; empty and unavailable remain distinct.

- src/components/employee-updates.tsx:77 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/components/employee-updates.tsx#L77

### U-02 — Write and publish an update after audience review

**Source conditions:** Current eligible audience and communication authority; design tests send no real messages.

**Remaining acceptance:** Content/type, location/today’s team/published-shift audience, expiry and acknowledgement requirement; audience preview/fingerprint then deliberate Publish; retained draft and status lookup.

- src/components/communication-compose.tsx:61 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/components/communication-compose.tsx#L61

### U-03 — Read, edit or withdraw an existing update

**Source conditions:** canWithdraw/canEdit as returned by current read; acknowledged version does not remove permitted management actions.

**Remaining acceptance:** Full text, recipient acknowledgement/read status, author/version-allowed edit/revise and withdrawal confirmation; current-version refresh, unknown-result lookup and no accidental duplicate publish.

- src/components/communication-detail.tsx:86 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/components/communication-detail.tsx#L86

### U-04 — Review notification history and mark read

**Source conditions:** Session/current notification read authority; management markReadAllowed, feature-dependent delivery remains separate.

**Remaining acceptance:** Open each real notification/target with exact context; management mark-read, unread count coherence, refresh/retry/session-ended and protected data clearing.

- src/components/employee-account-panel.tsx:68 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/components/employee-account-panel.tsx#L68

## G14 — AI manager and source-backed guidance

Make guidance inspectable and keep business actions under explicit Owner control.

Depends on: G02, G04, G07, G10, G12. Workflows: AI-01, AI-02, AI-03, AI-04, AI-05.

- Priority briefing links every actionable issue to source evidence and the appropriate full workflow.
- Defer/dismiss/restore retains issue lifecycle and conflicts; priorities save with revision review.
- Question/cancel/evidence states distinguish partial, missing and failed answers without invented certainty.
- Coverage options and attendance/payroll proposals require separate reviewed actions; no automatic changes or paid model calls in the prototype.

### AI-01 — Read the owner priority briefing and follow sources

**Source conditions:** Owner, advisor enabled, ready company scope; no authenticated/connected feature claim from source presence.

**Remaining acceptance:** Show evidence/observed time, partial/unavailable assessment and source links; all-clear only for actually assessed sources.

- src/components/owner-advisor/attention.tsx:26 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/components/owner-advisor/attention.tsx#L26

### AI-02 — Track, defer, dismiss and restore briefing issues

**Source conditions:** Current owner briefing revision and exact issue identity.

**Remaining acceptance:** Track/Later one hour/Not relevant today/Restore and follow-through; distinguish resolved/not-current/unverified/evidence-changed; dismissal does not fix the business issue.

- src/components/owner-advisor/attention.tsx:35 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/components/owner-advisor/attention.tsx#L35

### AI-03 — Ask a question, cancel and inspect evidence

**Source conditions:** Owner/current company scope and available AI connection for asking; no AI request run in this inventory.

**Remaining acceptance:** Starter questions, question limit, busy/cancel, conversation/answer/source review, unavailable AI connection and safe retry; no operational changes implied.

- src/components/owner-advisor/advisor.tsx:154 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/components/owner-advisor/advisor.tsx#L154

### AI-04 — Save owner priorities with conflict review

**Source conditions:** Current owner profile version; preserve unsaved text.

**Remaining acceptance:** Edit priorities, dirty/save/pending state and current saved-priority conflict review before replacement.

- src/components/owner-advisor/advisor.tsx:232 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/components/owner-advisor/advisor.tsx#L232

### AI-05 — Prepare coverage options and attendance/payroll review

**Source conditions:** Advisor enabled/company scope; deterministic inspections can work without an AI connection; no business save until separate reviewed action.

**Remaining acceptance:** Coverage date/candidates → exact replacement review; period/language → attendance and payroll exceptions; incomplete sources and unverified financial readiness stay explicit.

- src/components/owner-advisor/workflows.tsx:7 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/components/owner-advisor/workflows.tsx#L7

## G15 — Personal account, security and support

Manage the Owner’s own account without confusing it with company administration.

Depends on: G01, G05. Workflows: F-01, F-02, F-03, F-05, F-06, F-07.

- Personal profile, notification topics/device alerts and passkey lifecycle have separate task flows and recovery states.
- Support/privacy/terms honor source visibility and safe return context.
- Account deletion reviews identity and exact personal-account consequences; company closure is a separate support request.
- Sign-out/session-ended clears protected views and offers legitimate recovery; no destructive deletion or real credential enrollment during prototype QA.

### F-01 — Read and edit the owner’s own profile

**Source conditions:** Owner management branch, not Employee calendar/work-details/appearance UI.

**Remaining acceptance:** Use Owner management profile identity/contact/company/timezone; edit/missing-email Add opens own authorized employee editor; loading/error/pause.

- src/components/manager-profile/manager-profile-live.tsx:199 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/components/manager-profile/manager-profile-live.tsx#L199

### F-02 — Set owner notification topics and device alerts

**Source conditions:** Payroll-ready topic requires payroll; device alerts require notification feature/browser readiness/consent.

**Remaining acceptance:** Per-topic time-off/shift/unable-to-work/clock-review/payroll-ready preferences; save/pending/offline/failure; current device-alert readiness and notification history link.

- src/components/manager-profile/manager-profile-live.tsx:199 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/components/manager-profile/manager-profile-live.tsx#L199
- src/app/api/management/profile/route.ts:1 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/app/api/management/profile/route.ts#L1
- src/app/api/management/profile/alerts/route.ts:1 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/app/api/management/profile/alerts/route.ts#L1

### F-03 — Add or remove a passkey

**Source conditions:** Passkey flag plus device support and authenticated identity; no credentials exposed in mockup.

**Remaining acceptance:** Current passkey list, supported-device setup, explicit remove/Keep confirmation, empty/loading/retry/error and session recovery.

- src/components/passkeys/passkey-section.tsx:20 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/components/passkeys/passkey-section.tsx#L20

### F-05 — Read support, privacy and terms

**Source conditions:** policiesVisible() controls legal/support availability; public support does not require generic session.

**Remaining acceptance:** Real support answers/email/legal content and account-deletion information, accessible readable pages and return; support contact is user initiated.

- src/components/legal/account-privacy-links.tsx:10 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/components/legal/account-privacy-links.tsx#L10
- src/app/support/page.tsx:19 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/app/support/page.tsx#L19

### F-06 — Request deletion of the personal account

**Source conditions:** Authenticated session and visible policies; no destructive operation during prototype testing.

**Remaining acceptance:** Identity/current password/show-hide and explicit confirmation, duplicate/request receipt and Done sign-out; explain Owner workspace remains open and company closure is separate support request.

- src/components/account-deletion-form.tsx:86 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/components/account-deletion-form.tsx#L86

### F-07 — Sign out and recover an ended session

**Source conditions:** Current session; shared authentication surface is a dependency, not a new Owner-only redesign.

**Remaining acceptance:** Visible deliberate sign-out, private-state cleanup, pending/failed sign-out and sign-in/forgot/reset/activate handoffs; safe return to actual owner scope.

- src/components/app-shell.tsx:1 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/components/app-shell.tsx#L1

## G16 — Home, navigation and complete discovery

Reconnect completed groups into a calm daily Owner workspace with no lost features.

Depends on: G01, G02, G03, G04, G05, G06, G07, G08, G09, G10, G11, G12, G13, G14, G15. Workflows: H-01, H-02, N-01, N-02.

- Home totals use the same current source as their detail screens; people, shifts and open slots have explicit units, and planned staffing is not live attendance.
- Prioritize current exceptions, then upcoming work; no dashboard wall of every feature.
- Five roots, More, search, contextual actions and direct entries expose the correct authorized destinations, including occasional finance/admin tools.
- Reconcile all 96 workflows, four exclusions and Q-01–Q-12 across mobile/desktop; publish remaining gaps honestly and keep application parity unverified until actual integration tests pass.

### H-01 — Understand today’s staffing and exceptions

**Source conditions:** Owner operational company observation; stale/unavailable data must not imply all clear.

**Remaining acceptance:** Bind every count and item to the same current source; cover no shifts, all clear, multiple and ended missing clock-ins, partial and unavailable observations.

- src/components/premium-home.tsx:146 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/components/premium-home.tsx#L146

### H-02 — Open the correct action from Home

**Source conditions:** Current source target and authorization; module-dependent requests.

**Remaining acceptance:** Carry exact request, shift, location, date and origin into attendance, coverage repair and review, then return to that origin.

- src/components/premium-home.tsx:146 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/components/premium-home.tsx#L146

### N-01 — Move between the five owner areas

**Source conditions:** Current Owner session, company scope, enabled modules and payroll capabilities; tab membership grants no access.

**Remaining acceptance:** Use the same authorized destinations on desktop/mobile; preserve selected period, location, scroll, filters and meaningful Back/focus.

- src/lib/navigation.ts:190 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/lib/navigation.ts#L190
- src/lib/navigation.ts:137 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/lib/navigation.ts#L137
- src/lib/workspace-presentation/modules.ts:5 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/lib/workspace-presentation/modules.ts#L5

### N-02 — Find tools, people and places

**Source conditions:** Only tools authorized by navigationForRole and current scope; current More page has a narrower hardcoded list.

**Remaining acceptance:** Reconcile authorized pages, common actions, people and places, including remotely loaded results; handle loading/offline/unavailable without false no-match; remove Owner My time; make contextual tools findable.

- src/components/command-finder.tsx:35 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/components/command-finder.tsx#L35
- src/app/app/more/page.tsx:22 · https://github.com/JoseK0514/Fuel-Scheduler-/blob/46e202786863279302026ee03a0e225c359fa55c/src/app/app/more/page.tsx#L22

## Global Q-01–Q-12

These are not globally certified. Bounded group checks cover particular scenarios; full integration/device/accessibility remains separate.

### Q-01 — Loading, healthy empty, partial and failed reads

Only a successful complete current read may say none/all clear. Show useful recovery for timeout and partial source; no private sample/old data as current.

### Q-02 — Offline, reconnecting, hidden/paused and stale data

Explain connection/age and suspend decisions; re-read on return. Clear protected content as existing controls require; no phantom success.

### Q-03 — Session ended, role/scope revoked, disabled module

Remove unauthorized navigation and private content; direct routes/actions enforce current gates, explain unavailable capability and offer legitimate sign-in/recovery.

### Q-04 — Draft, published, historical and superseded sources

Label current revision/context; history is never editable as the current record. Source change invalidates exact-revision review where required.

### Q-05 — Validation, missing data and eligibility

Name the field/reason and how to fix it; distinguish missing/unset from a confirmed zero. Keep entered values and correct focus; server validates all rules.

### Q-06 — Pending, confirmed success and partial batch result

Disable duplicate submission, show actual action identity and truthful receipt, exact target/date/scope and next step; each batch outcome stays visible.

### Q-07 — Unknown result, retry and status lookup

Preserve the original operation identity and reconcile; do not start another operation or infer failure from timeout. Avoid showing sample Undo when source has no authorized reversal.

### Q-08 — Back, deep link and interrupted work

Carry exact date/week/location/person/filter/item and safe origin; preserve search/scroll and unsaved entries; return focus near meaningful content; handle vanished/already-decided targets.

### Q-09 — Small phones, text enlargement and mobile input

Complete labels/values, reachable controls above safe area/keyboard, consistent touch targets; native time/date/select/file pickers, long names and translated content.

### Q-10 — Keyboard, screen reader, reduced motion and meaning

Visible focus and correct names/order, trapped modal/restored focus, announced errors/receipts, status beyond color and reduced motion; actual assistive-tech testing pending.

### Q-11 — Sensitive and consequential actions

Clear person/scope and actual consequence before confirmation; privacy and transient-code cleanup; permissions remain explicit; no real messages/money/data mutations in tests without authorization.

### Q-12 — Integration, device and permission verification

Use isolated test fixtures and approved references; verify real server guards, conflicts and network states, mobile browsers/devices and downloads. Prior mockup test passes do not certify these workflows.



## Included pinned source snapshots

The cited remaining-group application files are copied read-only under `handoff/codex-cloud-owner-desktop/reference/remaining-application/`, with original paths/SHAs in `reference/remaining-source-manifest.json`. They allow contract reading without Mac paths. They do not replace an actual clean pinned Git checkout for the strict audit, and they do not authorize application edits.
