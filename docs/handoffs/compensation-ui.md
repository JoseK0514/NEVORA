# Compensation UI contract for Claude

## Wage editor

Codex owns compensation records, costing and calculation. Claude owns the editor and preview. Scheduling owns assignments and timekeeping owns finalized time. All three checkpoints started at Development `22107a24272f2347bbb59a3da1f54319632772a5`. They require no migration allocation. Migration 0031 already stores per-person, workspace-scoped, immutable native profile revisions. The temporary role rates in the employee-home helper have no authority here.

POST same-origin JSON to `/api/compensation/wages` with the authenticated session and `x-nevora-payroll: 1`. Only a current Owner can read or write individual rates. Responses are private/no-store. Both payroll activation and calculation mode may be off.

- Send `{"action":"READ_WAGES","employeeId":"example"}`. The response contains `employeeId`, `history` newest first and `nextBeforeRevision`. Each entry contains the profile revision, actorId, createdAt, reason and the wage terms at that revision. Use the first page's first revision as expectedRevision. An empty first page means no saved rate and revision 0. For older pages send the cursor as `beforeRevision`.
- Send `{action:"SAVE_WAGES", employeeId, expectedRevision, operationId, reason, wages:[...]}`. Use a fresh UUID per edit. The list replaces that person's effective wage intervals. Each item has exactly `{id, effectiveFrom, effectiveTo, locationIds, hourlyRateMinor}`. Keep old intervals when scheduling a raise. Use offset-bearing instants, inclusive start and exclusive end, or null for an open end. Use distinct wage IDs and explicit locations. Intervals can overlap at different locations. To end coverage, close its interval.
- `hourlyRateMinor` is a decimal string in USD cents per hour with up to four fractional digits. For example, `"1825"` means $18.25/hour. An explicit `"0"` is a recorded planning rate. An uncovered instant or location has no rate. A wage-only write supplies no payroll eligibility or statutory attestation. Changed terms require payroll-context confirmation before native use.
- Success returns `{receipt:{action:"SAVE_WAGES",operationId,employeeId,revision}}`. Replay an uncertain write with the original UUID and identical contents. A 409 requires a fresh read before a new edit. Handle 400 invalid input, 401 expired session, 403 denied and 503 unavailable. Keep sensitive drafts in memory.

## Draft labor cost

POST to `/api/compensation/labor-cost` using the same Owner transport. Cost differences for one edited shift can reveal its rate, so the aggregate preview uses wage permission too. No payroll activation is required.

Send `{weekStart:"2026-10-05", locationId:"example", changes:[]}`. The saved baseline is the current working schedule at that location, including saved draft and held edits. An empty list previews it as saved. Send up to 100 unsaved changes in one request. Use `{kind:"add",shift}`, `{kind:"replace",shiftId,shift}` or `{kind:"remove",shiftId}`. A shift has exactly `{employeeId,date,startTime,endTime}`. Use business-local HH:MM, a start date in the selected Monday week and an employee on the location roster. Each saved shift can be targeted once. Preview requests have no side effects.

The response includes `saved`, `draft`, signed `deltaMinor`, currency, basis, exclusions and the schedule observation time. Both projections have `shiftCount`, `subtotalMinor` for priced time, `totalMinor`, `coveredNanoseconds`, `missingRateNanoseconds`, `missingRateShifts` and `unresolvedTimeShifts`. Display null totals or deltas as incomplete. A zero string is an actual zero. Duration and money are decimal strings. Each projection rounds the exact sum once to the nearest USD cent, with half cents rounded up.

Include full elapsed assignments starting in the selected week, split at rate changes. Released callouts are excluded. A repeated or skipped local boundary makes the shift unresolved. This is base scheduled pay before break adjustments, overtime, premiums, taxes, benefits or deductions. The preview does not approve assignments, check scheduling-rule compliance or produce payroll. Refresh after a 409 or a source failure (503).
