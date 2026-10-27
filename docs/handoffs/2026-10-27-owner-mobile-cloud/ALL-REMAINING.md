> GitHub reading copy. Internal file paths refer to the extracted package. Start with [README.md](README.md) for the one-command extraction. The full original is preserved in the payload.

# All remaining Owner mobile workflow groups

Generated from the current100-row inventory.43remaining/partial;53working;4excluded. Exact scopes/source refs/conditions remain in outputs/owner-mobile-current-coverage.json. The delivery-plan order controls execution; this list is grouped by source domain, not priority.

## N-01 — Move between the five owner areas

**Domain:** Navigation and discovery

**Remaining:** Use the same authorized destinations on desktop/mobile; preserve selected period, location, scroll, filters and meaningful Back/focus.

**Source conditions:** Current Owner session, company scope, enabled modules and payroll capabilities; tab membership grants no access.

**Source routes:** `/app`, `/app/schedule`, `/app/inbox`, `/app/employees`, `/app/more`

**Inspect:** reference/application/src/lib/navigation.ts:190; reference/application/src/lib/navigation.ts:137; reference/application/src/lib/workspace-presentation/modules.ts:5

## N-02 — Find tools, people and places

**Domain:** Navigation and discovery

**Remaining:** Reconcile authorized pages, common actions, people and places, including remotely loaded results; handle loading/offline/unavailable without false no-match; remove Owner My time; make contextual tools findable.

**Source conditions:** Only tools authorized by navigationForRole and current scope; current More page has a narrower hardcoded list.

**Source routes:** `/app/more`

**Inspect:** reference/application/src/components/command-finder.tsx:35; reference/application/src/app/app/more/page.tsx:22

## H-03 — Finish initial company setup

**Domain:** Home and setup

**Remaining:** Use the real two checks: coverage/staffing/lead periods and employee hour targets; distinguish zero locations and completion; deep-link to the exact fixing section.

**Source conditions:** Owner; show only current confirmed setup gaps, hide when complete.

**Source routes:** `/app`, `/app/schedule/settings`, `/app/settings/locations`

**Inspect:** reference/application/src/components/owner-setup-card.tsx:92

## A-04 — Check a saved Clocker action receipt

**Domain:** Attendance and recovery

**Remaining:** Saved UUID → Check → recorded action/person/time/device/location or Not recorded yet; explain finish on same tablet and link wrong/missing time to Timecards.

**Source conditions:** Management scope/current read; this is a read-only receipt lookup, not reset or punch editing.

**Source routes:** `/app/clocker-recovery`

**Inspect:** reference/application/src/components/clocker-recovery-review.tsx:114

## C-08 — Configure company/location operational policies

**Domain:** Company settings

**Remaining:** Company/location scope; late/early/missing in/out/overtime-risk/long-entry rules; configure/off/inherit, thresholds/effective dates and readonly inactive scope.

**Source conditions:** Owner/current revision; private labor values preserved, not edited in this policy UI.

**Source routes:** `/app/settings/company-policies`

**Inspect:** reference/application/src/components/company-policy-editor.tsx:30

## C-09 — Review policy history, conflicts and replacement

**Domain:** Company settings

**Remaining:** History, refresh, compare/discard conflicts, retained-save retry and full replacement review for corrupt revision; preserve draft until deliberate discard.

**Source conditions:** Owner/current source; historical/inactive scope read-only.

**Source routes:** `/app/settings/company-policies`

**Inspect:** reference/application/src/components/company-policy-editor.tsx:30

## C-12 — Set up a shared-tablet Clocker device

**Domain:** Company settings

**Remaining:** Add named device at active location; show/copy/hide setup code, no active location path, pending/error/stale-write; protect transient code.

**Source conditions:** Owner/current active location; no real device activated in mockup.

**Source routes:** `/app/settings/clocker`

**Inspect:** reference/application/src/components/clocker-device-manager.tsx:137

## C-13 — Rename, reconnect, replace or revoke Clocker device

**Domain:** Company settings

**Remaining:** Device filters, rename, replacement/reconnect/new code, revoke confirmation and exact outcome; keep device identity visible.

**Source conditions:** Owner/current device revision; no blind retry with new setup identity.

**Source routes:** `/app/settings/clocker`

**Inspect:** reference/application/src/components/clocker-device-manager.tsx:137

## P-06 — Generate a finalized-time export

**Domain:** Timecards, payroll and insights

**Remaining:** Choose period, review finalized population and selection/100-person boundary, generate current export, validate receipt and download mapped CSV/canonical JSON.

**Source conditions:** Only current finalized revisions; export is not paying employees, submitting to a bank or verified provider import.

**Source routes:** `/app/payroll-export`

**Inspect:** reference/application/src/components/payroll-export.tsx:130

## P-07 — Create and select export mapping profiles

**Domain:** Timecards, payroll and insights

**Remaining:** Dedicated mobile access to saved profile, file layout/columns/date/hour precision/provider reference and deliberate reviewed Save; preserve revisions and retry identity.

**Source conditions:** Desktop owner capability currently hidden by phone export layout; do not silently drop it or claim provider integration.

**Source routes:** `/app/payroll-export`

**Inspect:** reference/application/src/components/payroll-export-mapping.tsx:36; reference/application/src/components/payroll-export.tsx:149; reference/application/src/components/quiet/quiet.css:417

## P-08 — Review full payroll population and employment facts

**Domain:** Timecards, payroll and insights

**Remaining:** Review each period member/disposition and entrants/leavers/evidence; save population revision including zero-time/excluded people.

**Source conditions:** Actual employment facts are distinct from account active status; source and period authority.

**Source routes:** `/app/payroll-export`

**Inspect:** reference/application/src/components/payroll-period-close.tsx:141; reference/application/src/components/quiet/quiet.css:417

## P-09 — Reconcile export batches into a verified manifest

**Domain:** Timecards, payroll and insights

**Remaining:** Select original receipts covering included people exactly once, prepare verified manifest, review stale/partial/exclusion states and retain original uncertain command.

**Source conditions:** Current population revision and authoritative export receipts; mobile entry is currently missing.

**Source routes:** `/app/payroll-export`

**Inspect:** reference/application/src/components/payroll-period-close.tsx:279; reference/application/src/components/quiet/quiet.css:417

## P-10 — Download handoff artifacts and record downstream status

**Domain:** Timecards, payroll and insights

**Remaining:** Manifest/CSV/canonical artifacts and history; record destination/reference and reported submitted/imported status with explicit unverified meaning.

**Source conditions:** No connected provider verifies import or payroll processing; browser completion also remains unverified.

**Source routes:** `/app/payroll-export`

**Inspect:** reference/application/src/components/payroll-period-close.tsx:362; reference/application/src/components/quiet/quiet.css:417

## P-11 — Browse current and historical payroll runs

**Domain:** Timecards, payroll and insights

**Remaining:** Current/past periods, run state/revision, settings link, no runs and prerequisites; distinguish native recorded-time and historical provider modes.

**Source conditions:** Payroll enabled and canReview; no live enabled claim inferred from code.

**Source routes:** `/app/payroll`

**Inspect:** reference/application/src/components/payroll/payroll-runs.tsx:37

## P-12 — Prepare payroll draft or missing historical period

**Domain:** Timecards, payroll and insights

**Remaining:** Prepare period/date/payday separately from approval; missing-period backlog, schedule-transition acknowledgement and saved effective settings; blocked prerequisites.

**Source conditions:** canReview and server gates; preparation does not finalize time or pay employees.

**Source routes:** `/app/payroll`

**Inspect:** reference/application/src/components/payroll/backlog-review.tsx:13

## P-13 — Recalculate native payroll or import provider amounts

**Domain:** Timecards, payroll and insights

**Remaining:** Recalculate current native draft; historical provider JSON/file import validates period/payday/source; keep modes separate and show missing facts rather than invented amounts.

**Source conditions:** Current source/revision/canReview; mode-specific actions and prerequisite blocks.

**Source routes:** `/app/payroll`

**Inspect:** reference/application/src/components/payroll/payroll-runs.tsx:157

## P-14 — Review amounts, source evidence and native breakdown

**Domain:** Timecards, payroll and insights

**Remaining:** Gross/deductions/contributions/net, employee search/detail, native hours/wages/tax/YTD evidence or provider source; explain blocking exceptions.

**Source conditions:** canReview and current private scope; source changes require a fresh review.

**Source routes:** `/app/payroll`

**Inspect:** reference/application/src/components/payroll/payroll-runs.tsx:149; reference/application/src/components/payroll/native-review.tsx:23

## P-15 — Approve an exact payroll revision

**Domain:** Timecards, payroll and insights

**Remaining:** Explicit review confirmation, exact revision/token and confirmed receipt; block changed source/missing facts and distinguish approval from PDF readiness/publication.

**Source conditions:** canApprove separately from canReview; approval is deliberate and never implied by preparation.

**Source routes:** `/app/payroll`

**Inspect:** reference/application/src/components/payroll/payroll-runs.tsx:164

## P-16 — Create linked payroll corrections

**Domain:** Timecards, payroll and insights

**Remaining:** Reason and original-run context; native correction recalculates a separate draft, historical provider correction imports trusted amounts; new review/approval and original history retained.

**Source conditions:** Mode-specific current authority/revision; never rewrite earlier approved history.

**Source routes:** `/app/payroll`

**Inspect:** reference/application/src/components/payroll/payroll-runs.tsx:172

## P-17 — Publish and view private employee statements

**Domain:** Timecards, payroll and insights

**Remaining:** Native automatic verified publication versus historical-provider explicit publish; generation pending/failed states, protected View/Download and corrected-original history.

**Source conditions:** canReview private scope, canApprove where explicit publish applies; no document-ready claim from approval alone.

**Source routes:** `/app/payroll`

**Inspect:** reference/application/src/components/payroll/portal-statements.tsx:8; reference/application/src/components/payroll/payroll-ui.tsx:36

## P-18 — Prepare payment instructions and retry failed jobs

**Domain:** Timecards, payroll and insights

**Remaining:** Show job kind/status/attempt/error and authorized retry; historical-provider payment instructions clearly unverified, native flow exposes no payment export.

**Source conditions:** canApprove; NEVORA does not process payments or establish bank compatibility.

**Source routes:** `/app/payroll`

**Inspect:** reference/application/src/components/payroll/payroll-runs.tsx:113

## P-19 — Set payroll company preferences and effective schedule

**Domain:** Timecards, payroll and insights

**Remaining:** Company/language/USD, frequency/anchor/payday, mode-appropriate rules/provider/bank preferences, automation and effective date/reason with revision history/impact.

**Source conditions:** Payroll enabled and canConfigure; native vs provider controls differ; approval remains separate.

**Source routes:** `/app/settings/payroll`

**Inspect:** reference/application/src/components/payroll/payroll-settings.tsx:104

## P-20 — Set employee exceptions and financial access

**Domain:** Timecards, payroll and insights

**Remaining:** Employee statement-language/rule exceptions and inheritance/effective date; provider-mode review/approval grants with reason, separate from operational management scope.

**Source conditions:** Owner canConfigure; native mode uses scoped Manager payroll access instead of provider grants.

**Source routes:** `/app/settings/payroll`

**Inspect:** reference/application/src/components/payroll/payroll-settings.tsx:202

## P-21 — Document employee native payroll facts

**Domain:** Timecards, payroll and insights

**Remaining:** Select employee; actual effective wages, location/break rules, workweek evidence, withholding/employer facts and authorized deductions; retained drafts/conflict review/explicit replacement.

**Source conditions:** canConfigure plus native capability/source availability; missing facts remain missing; this checklist gives no tax/legal advice.

**Source routes:** `/app/settings/payroll`

**Inspect:** reference/application/src/components/payroll/native-profile-editor.tsx:11

## P-22 — Record opening balances and native Manager payroll scope

**Domain:** Timecards, payroll and insights

**Remaining:** Choose documented tax year, separate attested zero/missing balances, preserve other drafts, block frozen/unchecked opening history; grant native review/approval for specific locations.

**Source conditions:** Owner/current source; approval history can freeze opening data; eligible active Manager target for scope.

**Source routes:** `/app/settings/payroll`

**Inspect:** reference/application/src/components/payroll/native-payroll-config.tsx:43; reference/application/src/components/payroll/native-opening-scope.tsx:1

## P-23 — Inspect workforce insights by period

**Domain:** Timecards, payroll and insights

**Remaining:** This week/last week/30 days/custom, recorded vs scheduled time, people with no time, attendance/changes/approvals, definitions/reliability and exact timecard links; disclose incomplete plan/unknown overtime.

**Source conditions:** Management operational authority; all desktop report sections remain accessible on mobile through detail/disclosures.

**Source routes:** `/app/reports`

**Inspect:** reference/application/src/components/reports.tsx:258

## P-24 — Export or print an insights report

**Domain:** Timecards, payroll and insights

**Remaining:** CSV and Print/Save PDF with current period and verified snapshot; export pending/error/offline/expired handling and readable mobile download handoff.

**Source conditions:** Current report/private scope; no file-ready claim from an unconfirmed request.

**Source routes:** `/app/reports`

**Inspect:** reference/application/src/components/reports.tsx:368

## U-01 — Browse company updates and reply requirements

**Domain:** Updates and notifications

**Remaining:** Manager All/Needs reply, current complete/partial list, read counts, detail and compose; empty and unavailable remain distinct.

**Source conditions:** updates module and current management communication/company authority.

**Source routes:** `/app/updates`

**Inspect:** reference/application/src/components/employee-updates.tsx:77

## U-02 — Write and publish an update after audience review

**Domain:** Updates and notifications

**Remaining:** Content/type, location/today’s team/published-shift audience, expiry and acknowledgement requirement; audience preview/fingerprint then deliberate Publish; retained draft and status lookup.

**Source conditions:** Current eligible audience and communication authority; design tests send no real messages.

**Source routes:** `/app/updates/compose`

**Inspect:** reference/application/src/components/communication-compose.tsx:61

## U-03 — Read, edit or withdraw an existing update

**Domain:** Updates and notifications

**Remaining:** Full text, recipient acknowledgement/read status, author/version-allowed edit/revise and withdrawal confirmation; current-version refresh, unknown-result lookup and no accidental duplicate publish.

**Source conditions:** canWithdraw/canEdit as returned by current read; acknowledged version does not remove permitted management actions.

**Source routes:** `/app/updates/[id]`, `/app/updates/compose`

**Inspect:** reference/application/src/components/communication-detail.tsx:86

## U-04 — Review notification history and mark read

**Domain:** Updates and notifications

**Remaining:** Open each real notification/target with exact context; management mark-read, unread count coherence, refresh/retry/session-ended and protected data clearing.

**Source conditions:** Session/current notification read authority; management markReadAllowed, feature-dependent delivery remains separate.

**Source routes:** `/app/notifications`

**Inspect:** reference/application/src/components/employee-account-panel.tsx:68

## AI-01 — Read the owner priority briefing and follow sources

**Domain:** AI manager

**Remaining:** Show evidence/observed time, partial/unavailable assessment and source links; all-clear only for actually assessed sources.

**Source conditions:** Owner, advisor enabled, ready company scope; no authenticated/connected feature claim from source presence.

**Source routes:** `/app/ai-manager`

**Inspect:** reference/application/src/components/owner-advisor/attention.tsx:26

## AI-02 — Track, defer, dismiss and restore briefing issues

**Domain:** AI manager

**Remaining:** Track/Later one hour/Not relevant today/Restore and follow-through; distinguish resolved/not-current/unverified/evidence-changed; dismissal does not fix the business issue.

**Source conditions:** Current owner briefing revision and exact issue identity.

**Source routes:** `/app/ai-manager`

**Inspect:** reference/application/src/components/owner-advisor/attention.tsx:35

## AI-03 — Ask a question, cancel and inspect evidence

**Domain:** AI manager

**Remaining:** Starter questions, question limit, busy/cancel, conversation/answer/source review, unavailable AI connection and safe retry; no operational changes implied.

**Source conditions:** Owner/current company scope and available AI connection for asking; no AI request run in this inventory.

**Source routes:** `/app/ai-manager`

**Inspect:** reference/application/src/components/owner-advisor/advisor.tsx:154

## AI-04 — Save owner priorities with conflict review

**Domain:** AI manager

**Remaining:** Edit priorities, dirty/save/pending state and current saved-priority conflict review before replacement.

**Source conditions:** Current owner profile version; preserve unsaved text.

**Source routes:** `/app/ai-manager`

**Inspect:** reference/application/src/components/owner-advisor/advisor.tsx:232

## AI-05 — Prepare coverage options and attendance/payroll review

**Domain:** AI manager

**Remaining:** Coverage date/candidates → exact replacement review; period/language → attendance and payroll exceptions; incomplete sources and unverified financial readiness stay explicit.

**Source conditions:** Advisor enabled/company scope; deterministic inspections can work without an AI connection; no business save until separate reviewed action.

**Source routes:** `/app/ai-manager`

**Inspect:** reference/application/src/components/owner-advisor/workflows.tsx:7

## F-01 — Read and edit the owner’s own profile

**Domain:** Your account

**Remaining:** Use Owner management profile identity/contact/company/timezone; edit/missing-email Add opens own authorized employee editor; loading/error/pause.

**Source conditions:** Owner management branch, not Employee calendar/work-details/appearance UI.

**Source routes:** `/app/profile`, `/app/employees/[employeeId]`

**Inspect:** reference/application/src/components/manager-profile/manager-profile-live.tsx:199

## F-02 — Set owner notification topics and device alerts

**Domain:** Your account

**Remaining:** Per-topic time-off/shift/unable-to-work/clock-review/payroll-ready preferences; save/pending/offline/failure; current device-alert readiness and notification history link.

**Source conditions:** Payroll-ready topic requires payroll; device alerts require notification feature/browser readiness/consent.

**Source routes:** `/app/profile`

**Inspect:** reference/application/src/components/manager-profile/manager-profile-live.tsx:199; reference/application/src/app/api/management/profile/route.ts:1; reference/application/src/app/api/management/profile/alerts/route.ts:1

## F-03 — Add or remove a passkey

**Domain:** Your account

**Remaining:** Current passkey list, supported-device setup, explicit remove/Keep confirmation, empty/loading/retry/error and session recovery.

**Source conditions:** Passkey flag plus device support and authenticated identity; no credentials exposed in mockup.

**Source routes:** `/app/profile`

**Inspect:** reference/application/src/components/passkeys/passkey-section.tsx:20

## F-04 — Read personal pay statements

**Domain:** Your account

**Remaining:** Owner QuietMyPay current/next payday from real calendar, own published statement history, PDF download and empty/failed/private-access states; no Owner My time link.

**Source conditions:** Payroll enabled + payStatements module + own authenticated statement access.

**Source routes:** `/app/my-pay`

**Inspect:** reference/application/src/components/payroll/my-pay.tsx:79

## F-05 — Read support, privacy and terms

**Domain:** Your account

**Remaining:** Real support answers/email/legal content and account-deletion information, accessible readable pages and return; support contact is user initiated.

**Source conditions:** policiesVisible() controls legal/support availability; public support does not require generic session.

**Source routes:** `/support`, `/privacy`, `/terms`, `/account-deletion`

**Inspect:** reference/application/src/components/legal/account-privacy-links.tsx:10; reference/application/src/app/support/page.tsx:19

## F-06 — Request deletion of the personal account

**Domain:** Your account

**Remaining:** Identity/current password/show-hide and explicit confirmation, duplicate/request receipt and Done sign-out; explain Owner workspace remains open and company closure is separate support request.

**Source conditions:** Authenticated session and visible policies; no destructive operation during prototype testing.

**Source routes:** `/app/account/delete`

**Inspect:** reference/application/src/components/account-deletion-form.tsx:86

## F-07 — Sign out and recover an ended session

**Domain:** Your account

**Remaining:** Visible deliberate sign-out, private-state cleanup, pending/failed sign-out and sign-in/forgot/reset/activate handoffs; safe return to actual owner scope.

**Source conditions:** Current session; shared authentication surface is a dependency, not a new Owner-only redesign.

**Source routes:** `/app/profile`, `/login`, `/forgot-access`, `/reset-access`, `/activate`

**Inspect:** reference/application/src/components/app-shell.tsx:1
