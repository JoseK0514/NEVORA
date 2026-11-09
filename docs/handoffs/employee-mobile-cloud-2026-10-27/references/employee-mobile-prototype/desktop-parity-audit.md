# Employee mobile versus desktop: coverage audit

The later [full Employee audit](full-audit.md) provides a [per-workflow reassessment](full-audit-coverage.md), independent UI/QA findings and exact open correction items. Earlier local-flow labels below do not mean complete sample coverage or production parity.

The [Calendar and shared focus correction](calendar-focus-verification.md) closed EM-A01/02 at its recorded historical artifact. The subsequent [Time off permissions and draft recovery](timeoff-access-verification.md) closes EM-A03 and models EM-R01 in the local prototype. The [Employee Schedule completion](schedule-verification.md) now closes EM-A06 and the remaining Schedule portion of EM-A05. The [Employee Timecard history extension](timecard-history-verification.md) closes EM-A07 at local prototype scope. The [Notifications completeness and navigation extension](notification-completion-verification.md) closes EM-A04/08 locally. The [final Employee mobile polish and combined review](final-mobile-review-verification.md) closes EM-A09 and the Notifications heading observation locally. The final review records an inherited LOW Calendar title split at320px/200%; live integration and physical-device/assistive-technology verification remain open. The full-audit report retains its historical68aad106… snapshot. Live server authority remains unverified.

**Not yet at production feature parity.** The local prototype includes Requests/Availability, Hours/timecards/corrections, notifications/updates, profile/preferences, source-backed support/legal reading, own demo sign-out, calendar/device-alert lifecycles, passkeys, account-deletion requests and gated Pay statements. All34 mapped workflow groups were reconciled in the final review;20 had fresh representative independent browser evidence and14 were explicitly source-only. Full end-to-end source-to-mobile coverage and live integration remain unverified.

Rechecked October 26, 2026 against clean, detached development `46e202786863279302026ee03a0e225c359fa55c`. Prototype SHA-256: `06c548a89f01e46c687c1d7e0a961da01c74952d6b7bfff34a1f7459e2396469`. No application or prototype UI code changed during this audit. Existing browser checks validate the implemented flows, not complete desktop parity.

## What currently works as a local sample

- Own past/future published weeks and a native date chooser, complete seven-date agenda, varied/split/location/overnight details, partly published/empty/removal distinctions and relevant revision-bound review. Equivalent own facts preserve effective confirmation; unknown original operations require canonical sample checking before deliberate replay. Current own proof guards retained sheets; Home and the existing Schedule notice remain current-week-specific. This is a local sample, not live authorization or complete desktop parity.
- Full/partial-day Time off → review/edit → Pending receipt → current own Pending cancellation; own waiting/decided history. Independent workplace module/read/proof gates and current-context refusal apply to entry, Home, notices and open sheets. Own in-memory draft/UUID survives close/navigation and a known pre-send failure; explicit discard, confirmed local send, sign-out and refresh clear it. A Time off-specific read check does not verify Schedule.
- Own swap/cover/callout activity, recipient answers, coverage requests and explicit eligibility refusals under the sample transfer policy.
- Usual availability editing and weekly review/submission, with midnight, unsaved-change and deadline distinctions.
- Own period timecards, gross/break totals, raw/effective entry details, coherent own period reads, all five period states, reachable immutable historical snapshots and exact-period empty history. Finalized entries use the preserved revision; original/proposed correction overlap with any finalized period is checked at review/send.
- Completed-entry/break and missing-time proposals, overnight dates, decision history, approved missing-time replacement and retained same-request retry; original punches stay unchanged.
- Own notification filters/search and source-specific destinations for schedule, time off, shift requests, Unable to work, availability and permitted communications. Explicit own Pay statement and device-test notices now have current source/capability checks and exact destinations. Schedule notices open their own source week. Document availability or a queued test alone creates no notice; a test remains receipt-unconfirmed and opens Home. Notifications belongs to Home and remembers its task on return. Live protected reads and complete feed coverage remain integration work.
- Workplace update filters, version-bound own read/acknowledgement, today-team audience preview/review/publication, own permitted withdrawal and retained uncertain-action lookup/replay.
- Own read-only identity, company, active eligible locations, App access and workplace timezone, with separate work-details recovery.
- In-memory English/Español sign-in language and Light/Dark/Match-this-phone appearance. Language does not claim to translate workplace screens; system appearance follows live preference changes without OS/storage writes.
- Own device-alert setup with workplace/identity/current-installation gates, source-derived permission/configuration/standalone/ownership precedence, protected current-device Turn off, unconfirmed cleanup and gated test preview/cooldown. No real enrollment, installation, permission or delivery.
- Own fictional calendar issue/copy/select/replace/revoke, current-scope refusal, one-time reveal, pause/expiry clearing, original-operation recovery and provider setup. Link status never means verified external connection. Real feed/subscription and server authority remain integration work.
- Source-frozen Support, Privacy Policy, Terms of Use and account-deletion information; legal fact visibility, public reading, contextual return and own demo sign-out with private-state/late-write guards. Actual server session/device cleanup remains integration work.
- Own feature-gated Pay tab (Hours fallback when either payroll/module is off), recorded-time/timecard links, date-led own published Employee statements, optional View PDF and actual marked sample PDF downloads. Identity/workspace/proof/current publication and integrity are checked locally; no real amounts, provider bytes or payroll actions.
- Own gated passkey metadata/setup/removal and deliberate account-deletion request/acknowledgement with demo-only verification and private session closure. No real credentials, request or erasure.
- Earlier Home clock status with on-break/off-clock/overnight/unavailable fixtures, linked to Hours. Phone punching remains on the location Clocker.
- Generic loading, error/retry, empty and partial-data fixtures.

All mutations are fictional and in memory. No domain is certified as production-complete by this audit.

## Material remaining work

| Area | Gaps versus authorized desktop workflows |
| --- | --- |
| Shift requests | Live eligibility/policy/revision checks, concurrent changes, durable outcomes and complete production lifecycle integration |
| Availability/time off | Durable saves, current deadlines/authority, concurrent/source-change recovery and complete live decision metadata |
| Hours | Live own-record reads, current effective baselines, real management snapshots, live finalized/revision/source-change enforcement and durable uncertain-result recovery |
| Notifications/updates | Live own-notification membership/source/version/destination checks, current audience grants and assignments, durable version receipts, real audience previews/publication/withdrawal, full feed coverage/pagination and transport/session/offline recovery |
| Profile/account | Live own-profile/session/freshness reads, real auth-language/device-theme persistence, live calendar subscription/feed, passkeys and live alert enrollment, account-deletion submission, live support/legal visibility and server session/device logout integration |
| Pay | Live own published-document membership under currently Approved runs, protected PDF bytes/hash verification, real payroll/module/session authority, current next-payday schedule and current source-bound Pay notice destinations. Local flow is represented as a fictional sample. |
| Shared behavior | Dynamic module/access gates, live/private data, stale revisions, uncertain submissions, offline/session recovery and durable results |

## Permissions that must remain distinct

- Employee work details are read-only in the actual Profile. A management editor elsewhere does not grant Employees permission to change work role, location or contact details.
- The generic notification inbox does not expose Mark read to Employees. Company communication read/acknowledgement commands have separate permissions.
- Opening either surface never records a read receipt or acknowledgement. Update acknowledgement confirms receipt of the current version, not agreement or attendance. Named coworker review status and revision editing remain management-only.
- Employees may post to today's assigned team only when current assignment/publication policy permits, without required acknowledgement. Broad announcements and communication management remain management capabilities. Home shortcut visibility is not the permission rule.
- Statements require payroll and the statements module. Device alerts, passkeys and legal/account links have their own gates. Live workplace configuration was not inspected.
- Phone clock-in/out remains on the separate location Clocker. Management scheduling, approvals, team administration, reports and payroll operations stay excluded.
- Employees cannot cancel submitted time corrections. The former prototype control was removed; unsent-form cancellation and own Pending time-off withdrawal are separate operations.

## Completion sequence

1. Audit all Employee mobile routes against desktop roles/capabilities and the full visual/state matrix. Profile/account tools and gated Pay are now implemented locally. Real authentication/persistence, alert enrollment, feed access, deletion submission, pay-document delivery and source-specific Pay notifications remain integration work.
2. Integrate Hours/corrections with fresh own-record authority, effective baselines, historical snapshots and durable revision-bound writes.
3. Integrate Requests/Availability and notifications/updates with current permissions, source/audience policy, revision-bound writes and durable results.
4. Verify every mapped workflow and permission/state against the integrated application.

Keep the main navigation compact; use contextual screens for detail. This is feature parity through mobile organization, not every tool placed on Home.

## Traceable workflow checklist

Statuses describe the prototype. Sample flow means a working local demonstration; Partial is incomplete desktop behavior; Read-only preview has no submission; Conditional missing must respect its stated gate. Workflow groups are not equal units for a completion percentage.

| ID | Area / workflow | Mobile status | Authority / gate | Source |
| --- | --- | --- | --- | --- |
| `home` | Home: Own current/next shifts and attention | Partial sample | Own current records | `src/components/employee-home-quiet.tsx:198` |
| `schedule` | Schedule: Own published shifts across weeks/locations | Local sample flow; live integration pending | Own published assignments | `src/app/app/schedule/page.tsx:83` |
| `schedule-review` | Schedule: Revision-bound weekly review and recovery | Local sample flow; live integration pending | Own current schedule revision | `src/components/employee-weekly-confirmation.tsx:11` |
| `open-shifts` | Requests: Find/request eligible open coverage | Local sample flow; live integration pending | Marketplace module and current eligibility/policy | `src/app/app/exchange/page.tsx:167` |
| `swap-create` | Requests: Request a shift swap | Local sample flow; live integration pending | Own qualifying shift and eligibility | `src/app/app/exchange/swap/page.tsx:27` |
| `swap-incoming` | Requests: Respond to incoming swaps | Local sample flow; live integration pending | Named recipient and current revision | `src/app/app/exchange/page.tsx:161` |
| `callout` | Requests: Offer cover / report unable to work | Local sample flow; live integration pending | Own future assignment and current policy | `src/app/app/exchange/callout/page.tsx:21` |
| `exchange-history` | Requests: Own exchange/callout history and cancellation | Local sample flow; live integration pending | Own involvement and permitted transition | `src/app/app/exchange/page.tsx:140` |
| `timeoff-full` | Requests: Full-day time-off request/review | Local sample flow; live integration pending | Time-off module and own request | `src/app/app/requests/time-off-signature.tsx:13` |
| `timeoff-partial` | Requests: Partial-day time-off request | Local sample flow; live integration pending | Time-off module and own dates/times | `src/app/app/requests/time-off-signature.tsx:74` |
| `timeoff-history` | Requests: Own pending/decided time-off history | Local sample flow; live integration pending | Own requests only | `src/app/app/requests/page.tsx:74` |
| `timeoff-withdraw` | Requests: Withdraw own Pending request | Local sample flow; live integration pending | Pending and request.employeeId equals session.id | `src/app/app/requests/page.tsx:98` |
| `availability-usual` | Requests: View/edit usual availability | Local sample flow; live integration pending | Own availability preferences | `src/components/availability-signature.tsx:112` |
| `availability-week` | Requests: Weekly availability and deadlines | Local sample flow; live integration pending | Own week and current submission rules | `src/components/availability-signature.tsx:112` |
| `recorded-time` | Hours: Own clock status, punches and breaks | Local sample flow; live integration pending | Own recorded time | `src/components/employee-time-panel.tsx:57` |
| `timecards` | Hours: Own period timecard/details/history | Local sample flow; live integration pending | Own card; no Employee approval/finalization/export | `src/app/app/timecards/page.tsx:32` |
| `entry-correction` | Hours: Propose completed-entry correction | Local sample flow; live integration pending | Own completed/effective source entry | `src/components/employee-time-corrections.tsx:82` |
| `missing-time` | Hours: Missing entries and completed-break corrections | Local sample flow; live integration pending | Own time and permitted source/location | `src/components/employee-time-corrections.tsx:298` |
| `correction-history` | Hours: Correction decisions/effective-time history | Local sample flow; live integration pending | Own proposals and source baseline | `src/components/employee-time-corrections.tsx:318` |
| `notification-inbox` | Home / More: Own notifications and deep links | Local sample flow; live integration pending | Own inbox; generic Mark read is management-only | `src/app/app/notifications/page.tsx:15` |
| `company-updates` | More: Read permitted updates and acknowledge | Local sample flow; live integration pending | Updates module, audience grant, revision/content | `src/components/communication-detail.tsx:30` |
| `team-post` | More: Post to today’s assigned team / withdraw own permitted post | Local sample flow; live integration pending | Current-day published assignment; no required acknowledgement or broad announcements | `src/lib/communications/policy.ts:14` |
| `profile-read` | Profile: Own identity, work locations/access/timezone | Local sample flow; live integration pending | Work details updated by manager; no self role/contact editor | `src/components/employee-account-panel.tsx:17` |
| `language` | Profile: English/Spanish sign-in language | Local sample flow; live integration pending | Own preference; currently sign-in pages only | `src/components/employee-profile-rows.tsx:43` |
| `appearance` | Profile: System/light/dark appearance | Local sample flow; live integration pending | Own device preference | `src/components/employee-profile-rows.tsx:45` |
| `device-alerts` | Profile: Alerts on this device | Local sample flow; live integration pending | Workplace notification feature and device permission | `src/app/app/profile/page.tsx:23` |
| `calendar` | Profile: Create/copy/replace/revoke private calendar link | Local sample flow; live integration pending | Own calendar authority and current subscription state | `src/components/calendar-subscription-panel.tsx:25` |
| `passkeys` | Profile: Register/list/remove own passkeys | Local sample flow; live integration pending | Feature flag, supported device and own account | `src/components/passkeys/passkey-section.tsx:51` |
| `support-legal` | Profile: Support/privacy/terms | Local sample flow; live integration pending | Support; legal links depend on policy visibility | `src/app/app/profile/page.tsx:53` |
| `account-delete` | Profile: Own account deletion request | Local sample flow; live integration pending | Current own session and policy gates | `src/app/app/account/delete/page.tsx:16` |
| `sign-out` | Profile: Sign out | Local sample flow; live integration pending | Current session | `src/app/app/profile/page.tsx:61` |
| `pay-statements` | Pay / Hours: Own published statements / view/download / payday | Local sample flow; live integration pending | Payroll enabled AND payStatements module | `src/app/app/my-pay/page.tsx:15` |
| `modules` | Shared: Capability-driven menus and refusal states | Missing integration states | Current workplace modules and authority | `src/lib/workspace-presentation/modules.ts:43` |
| `recovery` | Shared: Offline/session/re-entry/stale and uncertain-result recovery | Partial fixtures | Current actor and fresh server reads | `src/components/employee-account-panel.tsx:43` |

## Evidence and limits

Application root: `/Users/josek0514/.codex/worktrees/pr32-dev-preview-20261025/Fuel Scheduler`. Employee navigation, role/module guards, routes and referenced components/policies were compared to the current prototype. Every listed file and source marker resolves; JSON carries exact line anchors. This is source coverage, not proof of enabled capabilities, successful live operations, native devices or backend authorization.

[Machine-readable checklist](desktop-parity-audit.json) · [First-stage feature map](feature-map.md) · [Implemented-flow checks](verification.md)
