# Employee mobile remaining work — three phases

Planning only. Jose requested all remaining work in exactly three phases, conditional on preserving quality. This plan does not authorize implementation, real operational testing or deployment by itself. It follows the reviewed local prototype06c548a89f01e46c687c1d7e0a961da01c74952d6b7bfff34a1f7459e2396469. The last inspected application authority was development46e2027; refresh that baseline before implementation. All original local audit corrections are closed; one inherited LOW Calendar title split remains. All live workflows are still unverified. The latest independent review exercised representative paths for20workflow groups and recorded14as source-only; this is not a completion percentage.

Three phases organize delivery; each contains small feature batches with implementation, tests, permission checks, visual review and evidence. Security, accessibility and state recovery start in Phase1 and remain acceptance criteria for every batch. Phase3 adds independent combined-system verification. Preserve the selected teal Employee MOBILE direction, approved components/icons/colors/type/spacing/control sizes and Light/Dark behavior. Desktop, Owner, Manager and concurrent access work remain outside the implementation boundary.

## Phase1 — application foundation, Home and Schedule

- Recheck the current development branch, applicable instructions, capability/route policy, contracts, tests and concurrent work. Use an isolated development checkout; preserve current application behavior. Bind all34 workflow groups to current source and service owners before connecting them.
- Adapt the approved system into scoped Employee mobile shared components and navigation. Preserve desktop/global Signature and the separate access experience. Carry loading, empty, error, partial, permission-denied and recovery states into real application reads.
- Reuse existing authentication/session infrastructure. Enforce own employee/workspace/current-session/module authority on the server and on protected reads/actions. Cover deep links, expiry, workspace/role changes, stale data and sign-out cleanup; navigation visibility alone never grants access.
- Connect Home to current own shifts, attention and recorded clock status. Keep planned time separate from punches and payroll.
- Connect Schedule to own published past/current/future weeks, locations, split/overnight shifts and exact source-week destinations. Preserve revision-bound review, publication changes/removals and uncertain-result recovery. Employees cannot publish or manage schedules.
- Resolve the remaining Calendar enlarged-title readability observation within the same approved type system as the mobile components are carried over. No visual redesign.

Exit gate: real isolated test-account Home/Schedule journeys, server-denied foreign/expired/module-off access, current revision/recovery behavior, compiler/relevant automated suites and independent UI/QA review pass. Browser checks cover supported widths, enlarged text, Light/Dark and keyboard/focus. No unresolved material defect or desktop/Owner regression advances.

## Phase2 — remaining Employee workflows and live integrations

Implement in small independently verified batches:

- Requests/Availability: eligible open coverage, swap creation and incoming responses, cover offers/Unable to work, own activity/history/permitted cancellation; full/partial-day Time off, own waiting/decided history and Pending withdrawal; usual/weekly availability, deadlines, drafts and submission recovery. Validate current policy, source/revision, recipient and eligibility at read/review/commit.
- Hours/Timecards/Corrections: own current clock status, punches, breaks and effective time; periods/states, preserved historical decisions/snapshots; completed-entry/break and missing-time proposals, decision history and original-operation recovery. Preserve original punches, check finalized periods and show a receipt only after a confirmed accepted result. No Employee approval/finalization/export or cancellation of submitted corrections; phone punching stays with the location Clocker.
- Notifications/Updates: complete own source-backed feed with pagination and exact destinations, permitted update reading/acknowledgement and own authorized today-team posting/withdrawal. Bind source membership, versions and audience to current authority. Preserve search/filter/focus on return. No generic Employee inbox Mark read, automatic acknowledgement or invented delivery receipt.
- Profile/Help/Session: own read-only work details, permitted sign-in-language and device appearance persistence, current Support/legal visibility/content, contextual return and real session/device cleanup on sign-out. Preserve own preference scopes; no employee role/location/contact editor.
- Capability-dependent services: own calendar feed issue/copy/replace/revoke/provider setup; own passkey registration/list/removal; current-device alert enrollment/permission/disable/cleanup/test lifecycle; deliberate own deletion requests and honest uncertain-result support recovery. Reuse current service owners; avoid creating duplicate backend contracts. Real messages/native prompts/customer-data tests need the specific authorized nonproduction test scope.
- Pay: current own published statements associated with Approved runs, payroll/module gates, next-payday facts, protected PDF membership/integrity checks and deliberate view/download. Notifications must target the same current permitted publication. No payroll execution or fabricated amounts/payment status.
- Every batch: durable outcomes, concurrent/source changes, retries/idempotency, request identity, known failure versus unknown result, offline/resume/session changes, stale handler fencing and private-data cleanup. Preserve unrelated available capabilities when one domain fails.

Exit gate: every authorized mapped workflow has a functioning integrated path and maintained tests in its test environment. The14formerly source-only workflows receive direct end-to-end evidence alongside the other20. Persisted reads/writes match the canonical source and current permission checks; no simulated receipt stands in for a real result. Each batch passes independent UI/QA and relevant security/contract checks before the next batch advances.

## Phase3 — complete-system acceptance and release readiness

- Reconcile all34workflow groups against current authorized desktop behavior. Exercise direct entry, cross-page navigation, conditional menus and the complete loading/empty/partial/error/success/refusal/recovery matrix. Check integrated seams after all Phase2 batches are present.
- Independently test identity/workspace isolation, server authorization, revoked capabilities, concurrent updates, duplicate/uncertain submissions, session expiry, background/resume, interrupted networks and sign-out/private-data cleanup. Include source-bound Pay delivery and account/device/calendar lifecycle consequences under controlled test accounts.
- Test real iPhone/Android browser behavior, narrow/intermediate mobile widths, enlarged text, Light/Dark/system preference, native fields/selects/dialogs, keyboard/focus, virtual keyboards, safe areas and interrupted gestures. Add VoiceOver/TalkBack checks and measured accessibility/contrast review; do not infer certification from DOM-only tests.
- Measure integrated performance/loading and responsiveness on representative devices/connections against an agreed application budget and existing baseline; investigate regressions without hiding or weakening tests.
- Close material findings, rerun affected and complete regression suites, and obtain independent product/UI/QA/security acceptance at the actual tested revision. Retain final captures, coverage, known limitations, environment/configuration and rollback evidence.
- Produce a development/staging release candidate and controlled rollout/monitoring/rollback plan. Production merge/deployment remains a separate explicitly authorized action; no live analytics/personal-data collection is enabled without its required review.

Exit gate: complete integrated workflow evidence, passing required suites, no unresolved blocking/material issue, independently accepted design/accessibility/permission behavior, and a reproducible release candidate with rollback documentation. Explicitly record any remaining nonblocking observation; a prototype pass does not satisfy an integration gate.

## Workflow assignment within the three phases

Modules and recovery are established in Phase1 and apply to every Phase2 workflow. Phase3 independently rechecks every row. These are workflow groups, not equal units of effort.

| Workflow ID | Implementation phase | Final acceptance |
| --- | --- | --- |
| home | Phase1 | Phase3 integrated end-to-end |
| schedule | Phase1 | Phase3 integrated end-to-end |
| schedule-review | Phase1 | Phase3 integrated end-to-end |
| open-shifts | Phase2 | Phase3 integrated end-to-end |
| swap-create | Phase2 | Phase3 integrated end-to-end |
| swap-incoming | Phase2 | Phase3 integrated end-to-end |
| callout | Phase2 | Phase3 integrated end-to-end |
| exchange-history | Phase2 | Phase3 integrated end-to-end |
| timeoff-full | Phase2 | Phase3 integrated end-to-end |
| timeoff-partial | Phase2 | Phase3 integrated end-to-end |
| timeoff-history | Phase2 | Phase3 integrated end-to-end |
| timeoff-withdraw | Phase2 | Phase3 integrated end-to-end |
| availability-usual | Phase2 | Phase3 integrated end-to-end |
| availability-week | Phase2 | Phase3 integrated end-to-end |
| recorded-time | Phase2 | Phase3 integrated end-to-end |
| timecards | Phase2 | Phase3 integrated end-to-end |
| entry-correction | Phase2 | Phase3 integrated end-to-end |
| missing-time | Phase2 | Phase3 integrated end-to-end |
| correction-history | Phase2 | Phase3 integrated end-to-end |
| notification-inbox | Phase2 | Phase3 integrated end-to-end |
| company-updates | Phase2 | Phase3 integrated end-to-end |
| team-post | Phase2 | Phase3 integrated end-to-end |
| profile-read | Phase2 | Phase3 integrated end-to-end |
| language | Phase2 | Phase3 integrated end-to-end |
| appearance | Phase2 | Phase3 integrated end-to-end |
| device-alerts | Phase2 | Phase3 integrated end-to-end |
| calendar | Phase2 | Phase3 integrated end-to-end |
| passkeys | Phase2 | Phase3 integrated end-to-end |
| support-legal | Phase2 | Phase3 integrated end-to-end |
| account-delete | Phase2 | Phase3 integrated end-to-end |
| sign-out | Phase2 | Phase3 integrated end-to-end |
| pay-statements | Phase2 | Phase3 integrated end-to-end |
| modules | Phase1 | Phase3 integrated end-to-end |
| recovery | Phase1 | Phase3 integrated end-to-end |
