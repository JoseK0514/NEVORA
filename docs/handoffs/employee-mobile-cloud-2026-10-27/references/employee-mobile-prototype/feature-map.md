# Employee authorization and coverage map

A later [desktop parity audit](desktop-parity-audit.md) expands this first-stage map, including separate notification/communication permissions and profile/account gaps.

The [desktop parity audit](desktop-parity-audit.md) tracks all34workflow groups. The [latest pass](calendar-plan.md) adds own calendar-link management after support/legal and demo sign-out after profile overview/preferences to the earlier Home/Requests/Availability, Hours and Notifications/Updates flows; server authorization and full desktop parity remain unverified.

Source baseline: clean, detached development `46e202786863279302026ee03a0e225c359fa55c`. The table is a source-grounded design inventory, not runtime authorization certification. Private work actions affect only the fictional Employee fixture; public help/legal readers expose source public content.

| Area | Employee authority in source | This stage |
| --- | --- | --- |
| Home | Own current/next published shift, attention, recorded status | Working sample; each shift opens its exact details |
| Schedule | Own published shifts and week browsing | Working sample for three weeks of fixtures |
| Weekly review | Confirm own revision-bound week | Local current-week review; backend revision/stale handling remains integration work |
| Time off | Own full/partial-day requests and history | Full/partial-day request → review/edit → Pending receipt; own Pending cancellation and waiting/decided sample history |
| Recorded time | Own punches, breaks and completed entries | Own original/effective details; Home/Hours share explicit active, break, off-clock, overnight and unavailable fixtures |
| Completed-entry correction | Propose own completed-entry changes | Explicit start/end dates and times + reason → review/edit → Pending; original entry unchanged; target-specific duplicate and source constraints |
| Missing-time and break correction | Own correction request center | Missing entries, existing closed-break corrections and revision-bound approved missing-time replacement; no creation of missing breaks or correction of open punches |
| Correction decisions and recovery | Own proposals/decisions; no submitted-request withdrawal | Pending/Approved/Declined history; effective approved time separate from punches; immutable same-request retry across in-app navigation |
| Shift exchanges | Own swaps/coverage, incoming response, eligibility and history | Local request/review, recipient accept/decline/withdraw, own cancellation and history; sample manager-review policy |
| Unable to work/open coverage | Own eligible request; policy/capability gated | Local coverage/callout review flows; coverage checks saved availability, approved leave and published overlap. Live policy remains integration work |
| Availability | Own usual preferences and weekly submissions/deadlines | Editable usual preferences and dated weekly submissions with review, midnight, deadline and submitted/not-submitted distinctions |
| Profile | Own name/company/active eligible locations/access/workplace timezone | Full read-only account overview with explicit own projection, denied/foreign/stale/unavailable recovery; work updates stay with a manager |
| Notifications | Own source-checked inbox; no generic Employee Mark read | All/Unread/Action needed, search and exact schedule/request/exchange/callout/availability/update destinations; source and coverage recovery fixtures |
| Updates | Current permitted workplace communications and own version receipts | All/To review/Reviewed, current detail, explicit required acknowledgement or informational Mark read, edited/expired/withdrawn/source-change states |
| Today’s team | Current published own assignment; optional acknowledgement; own permitted withdrawal | Plain-text draft, optional expiration, audience preview/review/edit, local publication receipt and confirmed own withdrawal; no broad announcements or recipient status list |
| Preferences | Sign-in language and device appearance; alerts have separate gates | Local English/Español sign-in choice and Light/Dark/Match-phone with live system following. No auth cookie/OS changes; preferences stay in memory; device alerts remain deferred |
| Timecards | Own period totals/details/history; no management mutations | 1–31 inclusive days, AST clipping, gross recorded time and separate breaks; optional read-only historical snapshots tested with isolated fixtures; default app history is empty |
| Pay statements | Pay module AND payroll feature gate | Omitted from default navigation; no enabled-payroll assertion |
| Team communication | Updates module AND current audience/assignment authority | Today-team only; source-authorized own actions and retained unknown-operation lookup/original replay. No broad Employee announcements or revision editor |
| Calendar/passkeys/devices | Own account operations with feature/permission gates | Deferred; no subscriptions, credentials or device permissions changed |
| Calendar subscription | Own session, workspace membership and eligible locations; own revoke remains possible with no eligible locations | Local issue/copy/select/replace/revoke, original-operation recovery, one-time URL reveal and provider setup; no real feed/subscription |
| Support/legal | Public source-controlled documents and support contact; complete-fact visibility | Source-frozen Privacy/Terms/deletion information, FAQ disclosures and explicit email draft link; no email sent |
| Sign out | Current own portal session | Local sample confirmation, private-state clearing, refresh/back guards and public landing; real server/device logout remains integration work |
| Account closure | Own access subject to real route gates | Public information reader only; authenticated deletion submission deferred |
| Phone clock-in/out | Not provided by inspected Employee time surface | Excluded; location Clocker remains separate |
| Owner/Manager controls | Management role required | Excluded: no publish/create shifts, approve others, manage team, payroll admin or workspace settings |

## Source references

The application root is `/Users/josek0514/.codex/worktrees/pr32-dev-preview-20261025/Fuel Scheduler`.

- `src/lib/navigation.ts:34` and`:190`: Employee/mobile navigation and Pay/Hours gate.
- `src/lib/auth/permissions.ts:7`: management versus self-service authority.
- `src/lib/workspace-presentation/modules.ts:17`: disabled module boundaries.
- `src/app/app/page.tsx:56`, `src/components/employee-home-quiet.tsx:168`: own Home/current/next shift and attention.
- `src/app/app/schedule/page.tsx:128`–`:226`, `src/components/employee-weekly-confirmation.tsx:11`: own schedule/review and eligibility states.
- `src/components/employee-time-panel.tsx:118`–`:150`, `employee-time-corrections.tsx:82` and`:217`: recorded entries and correction types.
- `src/lib/timecards/service.ts`, `src/lib/timecards/project.ts`, `src/components/timecards.tsx`: own-only reads, management-only mutations, inclusive periods, gross/break totals and historical snapshot provenance.
- `src/app/api/employee/time-corrections/route.ts`, `src/lib/time-corrections/validation.ts`: own proposals, source/finalization constraints and no submitted correction cancellation endpoint.
- `src/app/clocker/[location]/page.tsx:19` and`:26`: separate location Clocker and punch gate.
- `src/app/app/requests/hub/request-hub.tsx:35`, `requests/time-off-signature.tsx:67`, `exchange/page.tsx:161` and`:248`: own request and cancellation flows.
- `src/components/availability-signature.tsx:111`: usual versus weekly availability.
- `src/app/app/profile/page.tsx:20`, `employee-profile-rows.tsx:43`: own profile/preferences and account gates.
- `src/app/app/notifications/page.tsx`, `src/lib/data/employee-notification-list.server.ts`, `src/app/api/notifications/read/route.ts`: own source checks and management-only generic read command.
- `src/lib/communications/policy.ts`, `service.server.ts`, `validation.ts`, `src/components/communication-compose.tsx`, `communication-detail.tsx`: current own audience/assignment, version receipts, audience preview and bounded author permissions.
- `src/app/app/my-pay/page.tsx:11`, `src/lib/payroll/service.ts:584`: Pay capability boundaries.

Discovery read source/tests and used structural queries. TypeScript LSP is unavailable; reference centrality is unmeasured. No source application build, API, account or database was exercised.

Latest account extension: [Alerts on this device](device-alerts-plan.md) adds the workplace-gated own-installation setup flow, sample permission choices, blocked/Home Screen help, local ownership checks, Turn off/cleanup recovery and server-gated test preview/cooldown. No real device/native permission/enrollment/delivery is connected. Employee alert-topic preferences and other-device administration remain excluded.
