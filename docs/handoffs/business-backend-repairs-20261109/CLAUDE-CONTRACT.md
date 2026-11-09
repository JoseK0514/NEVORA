# Backend contracts for Claude

Jose approved the backend repairs and selected **approve leave and track staffing repair** on November 9, 2026. Claude owns every UI integration and design decision. This document is the integration contract; it is not a claim that those interfaces have already been rendered or accepted.

## Request admission and error recovery

The shared browser boundary now permits the exact immutable hostname in trusted Vercel Preview system configuration, in single-company mode only. The explicit configured portal origin remains accepted. Production and isolated-workspace admission remain governed by their existing origin rules. No arbitrary Vercel host, caller-supplied host or forwarded host becomes an allowlist. A malformed explicit portal origin fails closed. See [Vercel's documented system variables](https://vercel.com/docs/environment-variables/system-environment-variables).

The old immutable deployment cannot acquire new code without a new deployment. Its old 403s are not evidence for this repair's deployed behavior. Integrate the backend source into the chosen UI candidate and qualify a new exact Preview; do not assume the familiar branch alias identifies the same artifact.

Response bodies are preserved. The private `X-Nevora-Failure` response header distinguishes:

| Value | Meaning / client action |
|---|---|
| `authentication_required` | No current application session, HTTP 401. Clear protected data and offer sign-in. |
| `access_denied`, `actor_mismatch` | Current actor or authority does not admit the operation. Clear protected data; do not imply a successful logout. |
| `view_invalid` | The mounted view is not bound to the current actor/session. Discard it and refresh current authority before retry. |
| `origin_mismatch`, `origin_unavailable` | Request-origin admission or environment configuration failed. Clear protected data; repeated sign-in does not repair this condition. Never display the configured origin or secrets. |
| `request_intent_required`, `cross_site_request`, `json_required`, `invalid_request` | Caller/transport contract failed. Do not retry as a different business command. |
| `source_unavailable` | A trusted result could not be loaded. Unknown is distinct from zero. |
| `conflict` | Existing conflict response; reread current source/revision. |

Existing unknown-outcome business bodies still take precedence over generic transport recovery. Never recreate an operation ID after a lost response or assume an error undid a committed mutation. Observation lifetimes, actor/scope revocation and private-state clearing remain mandatory.

## Leave conflict and repair reads

Read endpoints (both use POST to carry a bounded selector; neither mutates):

- `/api/manager/time-off-staffing`: current Owner/Manager and current operational footprint.
- `/api/employee/time-off-staffing`: Employee/Lead own records only. Management roles are not admitted to employee self-service by this work.

Send `credentials: same-origin`, JSON Content-Type, `x-nevora-leave-staffing: 1`, `x-nevora-actor: <server actor id>` and `x-nevora-employee-view: <employeeViewAuthority(proof, 'requests')>`. The view binding is public freshness metadata, never a replacement for the HttpOnly session or server guards. A server page may reuse the existing requests view binding; never send a mutation proof/hash to the browser.

```json
{"weekStart":"2030-10-07","requestId":"optional-request-id","employeeId":"optional-person-filter"}
```

`weekStart` is a Monday. The other two selectors are optional. An Employee/Lead cannot select a colleague; Managers still see only the authorized assignment locations. Do not send workspace/database/scope selectors. Existing schedule/availability links can preserve person/week/location in navigation, but URL parameters never grant visibility.

Ready result: `state`, `authority`, `weekStart`, `observedAt`, `validForMs`, `items`. Unavailable result: `state: unavailable`, `reason: access_denied | read_failed`. HTTP 400 is invalid selector, 401 missing session, 403 admission/authority denial, 503 unavailable evidence. Discard protected results after the observation expires or actor/view changes; failed reads do not mean no conflicts.

Each conflict includes stable `id`, `requestId`, `employeeId`, `employeeName`, assignment location/date/time, `shiftId`, immutable `publicationId` and `revisionNumber`, `overlapMinutes`, `overlapDates`, `state`, `ownerEmployeeId`, `reviewedAt`, and `employeeInstruction`.

- `approval_conflict` / `awaiting_decision`: pending request overlaps published work. Show the assignments and coverage consequence before approval; no approval is inferred.
- `repair_required` / `approved_leave`: leave is approved. The recorded approving reviewer owns repair; legacy records without a reviewer retain null and require Owner assignment/attention. The published shift is preserved. Clearly separate the employee's approved leave from the unresolved management staffing obligation.
- `overlapMinutes` covers the complete request/assignment overlap, not compensated/payroll time. Partial bounds apply on each included date; overnight overlap uses the same business-wall-time periods as scheduling validation. The selected week must contain an actual overlap date.

Task identities come from persisted approval plus source shift, so reload/retry cannot duplicate them. Draft edits, draft deletion and arbitrary client dismissal cannot clear them. A new reviewed publication that removes/reassigns the overlap, or a canonical published released callout, removes the current conflict. The immutable publications and approval retain the underlying history. This supports existing approved requests without a backfill or second mutable task ledger. No new migration is required.

The existing management Action Center now includes approved repairs with `type: TIME_OFF`, distinct `purpose: STAFFING_REPAIR`, `category: scheduling`, `priority: URGENT`, stable `LEAVE_STAFFING:` identity and `ownerEmployeeId`. This keeps the existing discriminator compatible. It is **not** another pending time-off decision: the existing `timeOffRequestId` helper deliberately returns null for this identity. Do not attach approve/deny controls. Its destination preserves week/location/person/repair context; Claude must implement selected-person/repair presentation. Missing staffing evidence makes the aggregate unavailable and its lifetime includes the staffing source budget.

## Coverage arithmetic

`calculateScheduleHealth` now returns root and per-location `coverageMinutes`, in addition to existing block counts. Use this canonical result instead of assigned-row / assigned-plus-gap-row arithmetic.

```json
{"state":"ready","staffing":{"required":480,"covered":240,"percent":50},"positions":{"required":480,"covered":240,"percent":50},"lead":{"required":240,"covered":0,"percent":0}}
```

The three obligation kinds are separate; do not add them together as if they represented distinct employees. `percent: null` means there is no denominator. `state: not_configured` contains null components and must not display 0% or 100%. Equivalent segment splits have identical results. Surplus in one period cannot erase missing coverage in another. Actual assignments, marketplace offers and required uncovered periods retain distinct labels/counts.

## Capability holds and release acceptance

See `capability-manifest.json`. The inspected shared Preview still lacks the three optional tables. No optional AI/native delivery was activated, no provider message sent and no shared/production migration applied. Existing newer-development worker supervision/queue-health code should be reused; actual host/scheduler/responders/alarms remain separate operational acceptance.

After integration, qualify current authorized Owner/Company Manager Home/Inbox/Timecards/Insights, a complete correction approval with unchanged original punches, leave approval with a visible assigned repair, a draft versus published repair, scoped/own privacy, coverage arithmetic and current-person navigation. Keep origin/actor/revocation/stale-revision negative checks, then run matching exact-head CI and Claude's responsive/keyboard/accessibility acceptance. No production authorization or independent QA/UI closure is conferred by this handoff.
