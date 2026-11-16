# Phase 3 — Claude contract, November 16, 2026

Source: application baseline `edce7661c211aba588f29bd6d56327fabdc11b47` plus the application commit recorded in the [delivery handoff](2026-11-16-backend-phase3.md). All examples are fictional. Codex owns these backend projections; Claude owns presentation and UI adoption. Development remains the combined operating/acceptance line at production standards. This handoff authorizes no main/production release, real messages, model calls, charges or new feature activation.

## 1. Agreed scheduling restrictions — B04

Existing endpoints and command protocol remain as documented in `2026-11-15-management-scheduling-backend.md`:

- JSON POST `/api/manager/scheduling-restrictions` for Owner/Manager; `/api/employee/scheduling-restrictions` for own Employee/Lead record.
- Same-origin boundary, session cookie, `x-nevora-scheduling-restrictions: 1`, matching `x-nevora-actor`, current server-produced planning `x-nevora-employee-view`.
- Read body `{action:"read",employeeId}`; command body `{action:"command",employeeId,command}`. Never construct authority from the example or serialize session credentials.
- Read 200 `{state:"ready",data:RestrictionDocument,legacyUnconfirmed:boolean,earliestWeek:string}`. `data` remains schemaVersion 1 with revision, append-only versions and request/decision history.

`earliestWeek` now equals the later of the workspace open-week boundary and **the latest approved employee effectiveWeek + seven days**. It is an observed lower bound, not a promise of write admission. Commands still recheck current locks, scope, session and source after waits. A typed ordinary lock now preserves its actual `earliestWeek`; a SQL race refusal may omit it and requires a fresh read. Example: a version effective `2030-10-07` makes the next possible version `2030-10-14` even if the workspace boundary is earlier.

Unchanged product rules: management-agreed unavailable intervals are firm; employee availability/days-off requests are preferences only after a confirmed version becomes effective. No versions means legacy-unconfirmed; an explicit empty approved list means confirmed unrestricted. Future versions do not activate early. Day numbers are Sunday 0 through Saturday 6; intervals are positive same-day HH:MM with 24:00 permitted only as an end. Split overnight restrictions over their two dates. An overnight assignment evaluates each date's effective agreement.

Unchanged command errors: domain `{state:'invalid'}` 400, `{state:'denied'}` 403, conflict/locked/capacity 409, unavailable/outcome_unknown 503. HTTP 401 has `{state:'unavailable'}`; early role/actor/view/transport 403 can also carry `{state:'unavailable'}` rather than domain denied. Match HTTP status and validated state together; a missing session must not be routed as a retryable read failure. Responses are private/no-store. Preserve target, operation ID, original logical contents and expected revision on uncertain retries. Exact replay still checks current authority. History and eligibility cannot be erased by rollback.

Remaining limitations: no arbitrary date-range restriction endpoint was added. The document exposes ordered effective Monday versions; resolve the version separately for every occupied business date. Conservative published/deadline/retained-capture custody can postpone changes beyond far-future closed weeks. Reads may be superseded before submission. A Manager needs the complete employee location footprint; an Owner record remains Owner-only. Employee requests never approve themselves.

## 2. Explicit reviewer facts — B06

`POST /api/manager/action-center` keeps its bounded body `{weekStart:"2030-10-07"}`, current session/actor and `x-nevora-action-center: 1` boundary. Owner or a Manager with current **Company** operational access can receive a ready aggregate. Location-only, financial-only, unassigned and revoked management scopes are not granted Company decision authority by these fields.

Each new `TIMECARD` and `TIME_CORRECTION` item carries the nested field **`ActionItem.review?: ReviewFacts`**. The field remains optional for older payload compatibility; its value is:

```ts
type ReviewFacts = {
  concernsActor: boolean | null;
  independentReviewRequired: boolean;
  actorMayReview: boolean;
  unavailableReason: null | 'independent_review_required' | 'facts_unavailable';
  requiredReviewer: {
    roles: ['OWNER', 'MANAGER']; scope: 'COMPANY'; assignment: 'unassigned';
    independentOf: 'SUBJECT' | 'SUBJECT_AND_REQUESTER';
  };
  period: {startDate: string; endDate: string} | null;
  deadlineAt: null;
};
```

`actorMayReview` describes identity/scope eligibility **to review** at this authorized observation. It does not promise that approval/finalization is currently legal. The canonical correction/timecard command still checks actual session, Company scope, independent actor, revision/hash, unresolved time and period state. No mutation guard changed.

For timecards, `concernsActor` compares the actual card employee to the actor; `period` is that card's actual inclusive period, including previous-week work. For corrections, new `ManagerCorrectionItem.concernsActor` compares the subject only; existing `isSelf` includes the subject **or the delegated requester**. A requester reviewing another person's correction therefore has `concernsActor:false`, `independentReviewRequired:true`, `actorMayReview:false`. Correction period is null because work date is not a payroll/review period. That item's existing `correction.workDate` and `timeZone` remain explicit.

No named reviewer assignment or timecard approval deadline is stored in this baseline. `assignment:'unassigned'` and `deadlineAt:null` expose that absence; do not infer a name, deadline or overdue state. A policy for assigning a particular reviewer/deadline is an unresolved product decision, not an implementation blocker for these truthful facts. Old correction payloads without the new subject identity remain parseable with `concernsActor:null`; they cannot become counted approve work.

The canonical `needs-you.ts` helper now uses typed review flags. It never inspects an English title. Missing correction review eligibility is excluded from the actionable correction count. The action-center parser validates the review object/period, ordered requested correction interval/workplace start date, individually nullable original endpoints and real creation instants; malformed new data is rejected rather than silently becoming an empty queue.

**Claude adoption:** remove `/^Your correction/` in `action-center/present.ts` and any residual title inference. `isOwnReview` now means independent-review disqualification, which includes a delegated requester; use `concernsActor` specifically for “your timecard/correction” wording. Use `actorMayReview` for review routing and the canonical command response for mutation availability. Render the role/scope requirement and an unassigned reviewer honestly. Keep missing/legacy metadata unavailable and preserve all draft/original-operation recovery behavior. Title/language changes are regression-tested for shared counts, but presentation and browser acceptance remain open.

## 3. Required work and totals — B07

`GET /api/employee/home` ready/partial results now include `tasks` alongside the existing `snapshot`, `allSet` and `state`. The pure Home projection recomputes it from the **full deduplicated authorized attention list**, never the three-row UI preview:

```ts
type HomeTaskCounts = {
  total:number; required:number; actionable:number;
  requiredHeld:number; informational:number;
};
type HomeTaskSummary = {
  state:'complete'|'partial';
  counts:HomeTaskCounts|null;
  observedCounts:HomeTaskCounts;
  preview:{limit:3;requiredOutsidePreview:number};
  ranking:'actionable_deadline_then_required_then_actionable_then_latest_information_v1';
};
```

Required and actionable overlap; do not add those category counts together. `requiredHeld` means required but not actionable at this observation, without inventing a cause. `informational` means neither required nor actionable. `total` includes information. `requiredOutsidePreview` uses the first three **work** rows (`required || actionable`) of the existing canonical order. It counts observed required rows after that preview; with partial sources it is a lower bound.

The ranking formula is unchanged: actionable source deadline, then required, then other actionable, then newest information; existing stable ID/kind ties remain. Four optional actionable items with real deadlines can precede a required non-deadline item. The contract makes that required item discoverable without declaring a different urgency rule.

When any source/publication is partial or unavailable, `tasks.counts` is **null**; `observedCounts` describes only retained observed rows. An unavailable/unauthorized whole read has no task totals at all. Missing legacy `tasks` is unknown, never zero. `allSet` still requires every current source and publication complete and no attention items, including information. Do not replace that rule with “no visible preview rows.”

Fictional complete mixed example: `counts:{total:5,required:1,actionable:3,requiredHeld:1,informational:1}`, `preview:{limit:3,requiredOutsidePreview:1}`. The same observed items with one failed independent source give `state:'partial',counts:null,observedCounts:{...}` and `allSet:false`.

Manager counts have a different existing purpose: action-center `counts.total` includes all review/planning items; `needsYou` and `/api/manager/inbox-count` count today's no-clock-in rows, current urgent items, pending requests and eligible corrections, preserving earlier/later planning sections. They share one helper. The inbox endpoint's unavailable state never supplies zero. No-clock-registration treatment remains Jose's open decision; this phase does not suppress factual missing-punch rows or change the count because setup is absent. There is no policy-backed universal `overdue` count; urgent is not a deadline.

**Claude adoption:** use full-list totals consistently, expose required work outside preview through the existing full list/expand affordance, distinguish observed lower bounds from complete totals, and show partial/error state before offering all-clear copy. Do not relabel Manager all-work totals as today's needs-you count.

## 4. Decision facts — B08 / SCRUM-199

### Requests and counterpart shifts

Existing `ActionItem.request` date range, partial-day interval, lengthText, locationName, note, counterpartName, exchangeKind and reviewHref remain. Added optional fields (old snapshots remain accepted):

```ts
type RequestShift = {
  date:string; endDate:string; startTime:string; endTime:string;
  locationName:string; timeZone:string;
};
type AddedRequestFacts = {
  status?:'PENDING'|'OPEN'|'EMPLOYEE_PENDING'|'MANAGER_PENDING'|
    'APPROVED'|'DENIED'|'CANCELLED'|'EXPIRED';
  createdAt?:string; // validated instant, normalized by Temporal
  shift?:RequestShift;
  counterpartShift?:({state:'ready'} & RequestShift)|
    {state:'unavailable';reason:'details_unavailable'};
};
```

Source shift is projected for current-term exchange/callout rows. A swap counterpart is disclosed only when active, currently assigned to the expected target, material terms unchanged and location authorized. A stale or undisclosable counterpart shift returns the same sanitized `details_unavailable` with no shift date, clock or location. Existing `counterpartName` is independently authorized: stale terms suppress it, while an inactive in-scope target location can still permit a known active person’s name without permitting shift details. A failed optional enrichment leaves the existing item and full-review link intact with no request detail; **absence means details unavailable**, never no second shift/no coverage. The aggregate's outer Company authority and source lifetime remain authoritative. The enrichment itself now also checks current Company authority before and after its SQL batch.

Example of an authorized overnight shift: `{date:'2030-10-07',endDate:'2030-10-08',startTime:'22:00',endTime:'06:00',locationName:'Office',timeZone:'America/Puerto_Rico'}`. A 24:00 boundary belongs to the next calendar date but occupies no minutes after midnight. These are nominal schedule clocks, not offset-free UTC instants. Preserve `exchangeKind`; the strict producer-to-parser regression for SWAP/COVERAGE and invalid kinds remains.

### Coverage request outcome

Only pending callouts are tasks in the management inbox; approval removes that task and opens coverage. Outcomes therefore live on the existing **callout/history reader**, not a pending-only inbox field:

```ts
type CalloutCoverage = {
  state:'not_requested'|'pending'|'completed'|'closed'|'unavailable';
  basis:'linked_request_history_v1';
};
```

`CalloutRecord.coverage` is projected by `getCallout`, `listEmployeeCallouts`, pending and team-history readers under their existing caller authorization. `calloutSummary` carries it through the existing protected `GET /api/employee/exchange` and selected-request detail route to `RequestSummary.coverage`; `parseEmployeeExchange` validates exact fields/states and rejects identity extras. The ordinary public employee detail is exercised after actual SQL completion/reassignment.

`not_requested` means no linked request exists; `pending` means a nonlegacy linked workflow remains open; `completed` requires an actual immutable COMPLETED event; `closed` means linked workflow(s) ended without that event; legacy/unknown evidence stays unavailable. **This is historical workflow status, not proof that the shift remains covered now.** Do not display another person's identity, current location, or “currently fully staffed” from it. The employee's existing final current-location/session checks still gate disclosure.

### Correction, tardiness, time and scope

- Correction original/requested intervals, workplace workDate/timeZone and source creation timestamp were already delivered. At the aggregate parser boundary, this phase validates ordered requested endpoints and their workplace start date, and validates each nullable original endpoint as an instant; it does not newly enforce ordering of original endpoints. Duration differences remain elapsed recorded-time facts; no paid-time conclusion is added.
- `TodayShift.lateMinutes` is now emitted: null if no matched first punch; otherwise max(0, floor((firstClockInAt − scheduled startAt)/60,000)). An early/on-time punch is 0; 18 min 30 sec late is 18; existing `late` becomes true at one minute. No-punch is not zero minutes late. Existing per-shift matching, overnight handling, distinct open-person counts and grace period are unchanged. The Today parser checks a supplied value against the instants; old absent fields remain accepted.
- `TimeOffListItem.createdAt` was **already typed and selected** in pending, own and team readers. The mapper now validates/normalizes its real instant instead of converting any malformed value to text. The manager UI's cast can be removed. No synthetic “sent today” fallback is permitted.
- Manager access coverage was **already delivered** by `readManagementProfile`: `locations:{scope:'all'|'assigned',names:string[]}` under before/after current operational authority. Reuse it; do not derive access from a home location. Existing Owner operational-scope reads expose their own edit/generation/revision facts. No editor identity is invented where not persisted/disclosed.
- Existing report period totals `scheduleVsActual` remain unchanged. Added `PeriodReports.scheduledByDay` has `{state:'complete'|'unpublished',basis:'latest_published_elapsed_v1',rows:[{employeeId,date,scheduledNanoseconds:string|null,unresolvedScheduleCount}]}`. Rows are sparse authorized published-assignment dates, split at workplace midnight using actual elapsed instants; released callouts are excluded. Absent rows are not explicit observed zeros. Incomplete publication or ambiguous/invalid local boundaries produce null for affected observed rows. Same-day or midnight-ending ambiguity cannot contaminate an unoccupied next day. This reports latest-published planned time, not draft forecasts, paid time or wages. Existing Company report authority still gates the complete source.

**Claude adoption:** show both known swap intervals and sanitized omission, use canonical coverage history wording, render actual card period, use null for unavailable facts, format instants in the returned workplace zone, and consume scheduledByDay only with its state/basis. The reports API returns captured `source`; its client already reprojects via `projectReports`, which computes the additive daily field. Do not infer schedule data from fixture wording or draft time.

## 5. Coverage metric — unchanged numbers, explicit meaning

New generation demand and explanation reads supply `coverage.basis:'fully_covered_period_minutes_v1'` and `unit:'nominal_location_minutes'` in the existing coverage object. Optional type fields preserve old stored-plan compatibility. A legacy plan satisfying the existing arithmetic is projected with that known basis; a supplied different basis/unit is rejected.

- Numerator `coveredMinutes`: sum of nominal durations of configured location/date segments where **all** staffing, required position and Lead conditions are satisfied.
- Denominator `requiredMinutes`: sum of configured segment durations across attempted locations. A minute at two locations counts twice. It is not multiplied by required employee quantity.
- `percentage = 100 * coveredMinutes / requiredMinutes`, with no server rounding. Existing control displays Math.round; Claude may retain that rounding with an accurate label such as “Periods fully covered.” The current “of needed hours covered” label must change during Claude adoption.
- No configured measured demand: required/covered 0, percentage null, unavailable true, never 100 or all-clear. Setup/readiness/INVALID/BUDGET_EXHAUSTED remain separate from the percentage.
- Partial staffing contributes **zero** until a segment is fully covered. Example: two people all eight hours against three required gives 0% full-period coverage, while staff-hour coverage would be 66.67%. Adding the third person for two hours makes this metric 25%, versus 75% staff-hour coverage. The existing planner obligation score still rewards useful partial staffing; it is not this displayed percentage.
- Overlapping requirement windows are segmented/coalesced by the existing health engine, using its maxima/position rules; duplicate windows do not double the denominator. Overstaffing cannot exceed 100% or compensate another uncovered segment.
- Requirements are configured with same-day boundaries; overnight coverage is represented by adjacent date periods and assignments split across them. Durations are nominal wall-clock minutes, including DST dates, and never use the execution host timezone. Separate elapsed-time report semantics above are intentional.

No formula, planner strategy, readiness rule or dashboard number was changed under an old label. Claude owns the truthful label/consumer transition and browser proof.

## 6. Small proposed follow-up — cost comparisons (not Phase 3 work)

The planner has demand, eligibility, agreed restrictions, hour targets/ceilings, operational rules and history. It has **no monetary wage/budget input contract** and cannot promise monetary optimization.

Proposed smallest next step: Phase 2's financial owner defines a read-only, versioned, permission-fenced cost-input contract before any cost feature is selected. It would need currency, authorized effective-dated wage/rate basis, treatment of salary and missing rates, agreed overtime/paid-break assumptions, approved comparable budget/window/location scope, data completeness and revision/as-of facts. Separate permission for payroll/rates and each location is required; Company scheduling access alone must not expose compensation. Unknown rates cannot become zero cost; mixed currencies cannot be summed. Jose/product must decide what comparisons are meaningful and who can view them. Only then should the existing planner/Rondo owners propose bounded consumers/evaluation. This phase adds no rate storage, financial calculation, forecasting, optimization, provider operation or AI tool.
