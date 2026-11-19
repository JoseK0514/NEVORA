# Scheduling authority and PTO

Chat 1 owns the scheduling and leave writers, review permissions, and planning calendar. The checkpoint starts from Development `22107a24272f2347bbb59a3da1f54319632772a5` and uses migration `0070_scheduling_authority_pto.sql`.

## Screens and server contracts

| Screen | Use |
| --- | --- |
| Company & Access | Read `GET /api/workforce/settings` as Owner. Save one `PERMISSION` per employee, location and action. Show the action grants separately from operational scope. Display a permission only where the employee's current management scope also permits the location. |
| Schedule settings and planner | Save `PLANNING_CALENDAR` with `startsOn` from 0 (Sunday) through 6 (Saturday). Monday is the default. Use `GET /api/workforce/calendar/current` or `/calendar/YYYY-MM-DD` for the displayed seven-day management window. The response includes `days`, scoped `shifts`, `locations`, and `publishLocationIds`. Each day and shift includes its original `scheduleWeekStart` for editor, generation, and publication forms. A displayed window can span two publication weeks. Use their original labels in warnings and confirmation. Payroll and published history keep their established week keys. |
| Publish | Use the existing `publishScheduleAction` or `publishDraftsAction` with canonical `weekStart` and each selected `locationId`. Pass `locationId` to `publishScheduleChangesAction` to release one location's held edits. The Owner's whole-week action omits it. Review warnings before confirmation. A location release carries forward the last captured rows from other locations. |
| Employee Time Off | Read enabled policies from `GET /api/workforce/settings` and the signed-in account from `GET /api/workforce/pto`. Include a policy revision UUID as optional `ptoPolicyId` in the existing request form or employee planning request JSON. The server fixes the requested minutes at submission. A full-day range counts each included calendar date at the configured daily minutes. A partial day uses the wall-clock duration on that date. |
| Team Time Off | Read `GET /api/workforce/leave/PENDING` (or `APPROVED`, `DENIED`, `CANCELLED`). Send `requestId` and `decision` to `reviewTimeOffAction`. Decisions are `APPROVED`, `DENIED`, or `CANCELLED` for an existing approval. A pending requester still uses the own-withdraw action. On `pto-balance`, explain that the approval exceeds the available balance and leave the request pending. Reload after each decision. |
| Time exceptions | Keep the existing `/api/manager/time-corrections` review contract and its operation ID, expected revision, and decision. Reviewers need `REVIEW_TIME_EXCEPTION` across the connected exception's locations. The affected employee and the person who submitted a delegated correction cannot review it. |
| PTO administration | Read `GET /api/workforce/pto/{employeeId}` as Owner. It returns balance by policy code and up to 100 recent entries. The audit includes the author, note, source reference, qualifying minutes, and policy revision. Show `historyTruncated` when present. |

Managers need separate `PUBLISH_SCHEDULE`, `APPROVE_LEAVE`, and `REVIEW_TIME_EXCEPTION` action grants. A leave reviewer must cover every location captured at submission plus current home and eligibility. An independent Owner handles legacy leave without a captured footprint, cases with no reviewer covering every location, and publication changes moving a captured shift across locations. The permission endpoint `GET /api/workforce/permissions` returns the active location-action pairs and whole-week publication hint for management sessions.

## Owner writes and balances

All workforce requests require `x-nevora-workforce: 1`. Send same-origin JSON to `POST /api/workforce/settings`. Each command includes `kind` and a client-generated UUID `operationId`.

- `PERMISSION` takes `employeeId`, `locationId`, `permission`, `granted`, and `expectedRevision`.
- `PLANNING_CALENDAR` takes `startsOn` and `expectedRevision`.
- `PTO_POLICY` takes `code`, `label`, `enabled`, `fullDayMinutes`, `earnedMinutesPer100Hours`, `carryoverCapMinutes`, and `expectedRevision`. Start new records at revision zero. Saved policy revisions return `policyId` for new leave requests.
- `PTO_POST` takes `employeeId`, `policyCode`, `expectedPolicyRevision`, `effectiveDate`, `entryKind`, `quantity`, `sourceReference`, and a required `note`. Quantity is minutes for `OPENING` and signed `ADJUSTMENT`. For `EARNED`, send company-verified qualifying work minutes and a unique source reference. The ledger posts whole earned minutes at the pinned policy rate. For `CARRYOVER`, send January 1, quantity zero, and a null source reference. The server records any excess above the cap once and preserves the remaining balance. Manual postings must be dated on or before today's company date and on or after the latest carryover boundary.

Pending submissions, withdrawals, and denials have zero ledger effect. Approval deducts available minutes once, including for future leave. Cancelling approved leave restores the exact original deduction. A repeat approval acknowledges no new write. A repeat cancellation by the same independent reviewer returns the same state without another credit. For settings writes, reuse the operation ID and exact body on a 503 or lost acknowledgement. A saved replay returns the prior receipt, including its original balance. A 409 means reload before deciding whether to start a corrected command.

## Integration

Apply `0070` through the combined base migration list, synchronize the disposable PostgreSQL adapter, and regenerate the onboarding manifest. The confirmed allocation is Chat 1 `0070`, Chat 2 `0071`, and Chat 3 `0072` if needed. Chat 2 corrected its checkpoint to `0071` in `d7b7392e`. Chat 3 reported that its compensation checkpoint needs no migration. The integrator owns the Development assembly, combined tests, and revision-bound release manual rebuild. Enable Manager workflows by granting the needed locations and actions during rollout.
