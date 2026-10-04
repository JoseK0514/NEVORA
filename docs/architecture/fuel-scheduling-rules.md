# Shared Fuel scheduling rules — Phase 2

Phase 2 extends the existing `validateShift` and `calculateScheduleHealth` domain functions. Schedule actions, template/copy adapters, manual swap/coverage workflows and existing coverage suggestions consume these functions. They do not define separate eligibility checks. No automatic assignment, swap approval, coverage offer, notification or timekeeping integration is enabled.

## Business time and hours

Jose confirmed **Monday 00:00, America/Puerto_Rico, through Sunday** for payroll and weekly scheduling limits. `weekStartFor` is the Monday source; the persisted workspace `time_zone` is the current timezone source. Fuel remains configured as `America/Puerto_Rico`; other workspaces explicitly supply their own valid zone. `scheduling/periods.ts` uses validated business civil dates/time coordinates, UTC arithmetic solely as a timezone-independent coordinate system, and half-open intervals. These coordinates are not UTC punch timestamps or actual worked time.

An implicit end earlier than the start means the next calendar day. Equal start/end is invalid for shifts. Explicit `endDate` supports longer proposed periods in the pure engine; the existing single-date persistence can store overnight shifts, not arbitrary multi-day assignments. Every touched day is checked for availability, leave and other shifts; midnight endpoints do not touch the following day. Every affected Monday workweek receives its own hour projection. Sunday 22:00–Monday 04:00 allocates 2 hours to the old workweek and 4 to the new one.

`getShiftValidationContext` reads a complete dated ledger across all configured locations for affected workweeks, including prior-Sunday carry-in. It excludes archived schedules, approved released call-outs and explicitly excluded outgoing assignments. Hours do not depend on `schedules.week_start`, visible dates, machine timezone or a caller-provided scalar. The old `existingWeeklyMinutes` field remains for compatibility with existing exchange helpers; the eligibility evaluator ignores it. Dashboard/publish health select actual business dates through the existing shift reader's `byBusinessWorkweek` option. Normal roster queries keep their existing schedule ownership selection.

Only scheduled hours are used. Projections identify their source as `SCHEDULED`. The reusable interval/workweek allocator also feeds schedule-health target balance and historical target fairness. Phase 8 can separately supply authoritative recorded-time intervals and remaining scheduled work through a reviewed adapter; Phase 2 supplies no fake actual hours and does not read or mutate Clocker/time-entry records.

## Assignment evaluation

`ValidateShiftInput` extends existing candidate/profile/context contracts. A result returns `eligible`, compatible `canSave`, `blockers`, `warnings`, combined `issues`, and per-workweek `projectedHours` including existing/assignment/projected hours, maximum, optional target/difference and source.

Hard checks in every workflow:

- Valid business date/time/input settings and a known role capability.
- Active employee and allowed assignment location.
- Required role; Owner/Manager/Lead qualify for a designated Lead responsibility under the existing application capability policy. This grants no new authentication permission.
- Complete effective availability, including adjacent windows, unavailable gaps and all overnight dates.
- Approved leave only; pending/denied/cancelled requests do not block.
- Global overlapping assignments across all locations.
- Configured maximum weekly scheduled hours. Default 40; exactly reaching the maximum is valid. An explicit business maximum can further constrain an employee maximum.

Automatic evaluation defaults to one assignment per touched calendar day, even for nonoverlapping clock times. `policy.maximumShiftsPerDay` changes that business policy without rewriting rules. Explicit existing human `MANAGER_SCHEDULE`/`SHIFT_EXCHANGE` modes surface same-day exceptions as warnings; an explicit daily limit enforces a hard check in those modes too. Existing consent and manager approval workflows remain in place.

Targets are preferences, not maximums. Target 24/maximum 40 with 32 projected hours produces a target warning and remains eligible if other rules pass. 40 is valid; 41 blocks. A target below or above a maximum never changes the ceiling.

Coverage preference ranking calls the same evaluator in automatic mode. It cannot accept caller-supplied active/available/conflict-free booleans as an alternate eligibility system. Lead-gap links carry the requirement into suggestions and the existing new-shift checkbox; the server still validates qualification.

## Availability precedence and input persistence

Reuse `availability_windows`, `weekly_availability_windows`, `weekly_availability_submissions`, `availability_exceptions` and existing deadlines.

1. No submission: current normal availability is the base. Seeded weekly rows are not a submission. The evaluator reports an explicit missing-confirmation warning; UI status remains missing/locked as appropriate.
2. Legacy submitted week (`uses_normal_availability=false`): preserve the complete stored weekly snapshot. Zero windows means intentionally unavailable all week; missing snapshot days remain unavailable.
3. New confirmed week (`uses_normal_availability=true`): current normal availability remains the base. Dated available exceptions replace only that day's hours; dated unavailable exceptions remove only their full/partial period. Unchanged days inherit normal hours.
4. Explicit unavailable-all-week writes seven dated full-day unavailable exceptions, so later normal changes cannot accidentally open the week.

The existing editor sends affected-day metadata, preserving unedited multi-window days. Employees can confirm an unchanged weekly base; normal-preferences saves still require changes. Native midnight end `00:00` is stored as the day's `24:00` endpoint; stored `24:00` is displayed as native `00:00`. An overnight availability period is entered as the tail of one day and the head of the next. Midnight-to-midnight availability is a complete available day; equal shift start/end remains invalid.

Weekly replacement is atomic through the existing Neon transaction API. Submission and deadline writers share a week advisory lock. The final deadline guard uses `clock_timestamp()` after lock acquisition. An optimistic guard compares the exact database text version of the submission before converting legacy snapshots; stale reads roll back and recompute, with at most three attempts. This prevents concurrent edits to different legacy days from losing a saved override. A repeated conflict returns a useful review/retry error. SQL-boundary mocks verify these adapters; no live database execution is claimed.

## Staffing and structured explanations

Existing `location_staffing_settings` supplies the seeded 2 employees at FUEL – 2 and 6 at FUEL – 110. Existing `location_coverage_windows` supplies applicable periods and optional staff overrides. Missing location settings fail explicitly instead of inventing one employee. When recurring windows are absent, existing shift-period health behavior remains; a completely absent period requires a configured coverage window to be detected.

The existing health algorithm segments actual periods, counts distinct active known employees, handles overnight carry-in, isolates locations and checks qualified designated Lead coverage. Results retain current UI contracts and add structured issues with location/date/start/end/missing staff.

| Code | Meaning |
| --- | --- |
| `INVALID_TIME_RANGE` | Invalid candidate date/time or zero duration |
| `INVALID_SCHEDULING_INPUT` | Invalid context or hour/policy settings |
| `EMPLOYEE_INACTIVE` | Employee cannot be scheduled |
| `LOCATION_NOT_ELIGIBLE` | Assignment location is not allowed |
| `ROLE_INELIGIBLE` | Required role capability is missing |
| `LEAD_REQUIREMENT` | Designated Lead position needs qualified Lead |
| `OUTSIDE_AVAILABILITY` | Normal hours do not cover the complete period |
| `WEEKLY_AVAILABILITY_CONFLICT` | Weekly/datestamped exception blocks the period |
| `AVAILABILITY_NOT_SUBMITTED` | Normal hours used without weekly confirmation |
| `APPROVED_TIME_OFF` | Approved leave overlaps |
| `SHIFT_OVERLAP` | Another assignment overlaps, including other location |
| `MULTIPLE_SHIFTS_SAME_DAY` | Daily assignment policy conflict/exception |
| `MAX_WEEKLY_HOURS` | Projected scheduled hours exceed ceiling |
| `TARGET_HOURS_EXCEEDED` | Preference warning, not hard conflict |
| `STAFFING_GAP` | Applicable location period is short of employees |
| `LEAD_COVERAGE_GAP` | Applicable location period lacks qualified designated Lead |

Messages are human-readable; structured details preserve location/shift IDs, dates, periods and numeric hours for future UI translation. Raw enum names are not displayed as fallback copy.

## Prepared migration and activation limits

`db/migrations/0006_scheduling_rule_inputs.sql` is **prepared, not applied**. It adds maximum hours beside the existing target (default 40, range 0–168), adds the legacy/new weekly interpretation marker (existing records default false), and replaces three same-day shift constraints with positive overnight-duration constraints for shifts, templates and publication snapshots. It creates no duplicate table and changes no actual worked-time schema.

Database-backed activation requires separately authorized environment selection, backup, inspection of existing constraint names and isolated migration/repository/concurrency/rollback tests. Build and tests do not apply migrations; fixture previews use fictional data and intercepted actions. Do not run this branch against an unmigrated live database and interpret schema failures as empty operational data.

If activation later needs rollback, retain settings, exceptions, submissions and shift history. Older application code does not understand normal-based submissions or overnight constraints. Rehearse an explicit compatibility rollback in isolated data before switching code; do not drop columns or erase overnight shifts to force the old constraints. No rollback or database mutation occurs in Phase 2.

No unresolved workweek business decision remains. Future automation still needs its separately authorized transactional assignment/consent/revalidation workflows; this phase establishes the shared evaluator and current input foundation only.


## NEVORA foundation extension (2026-10-03)

The [workspace foundation](nevora-workspace-foundation.md) adds separate active positions, employee qualifications, one optional assigned position per shift and per-window quantities. One distinct employee counts for one assigned position; designated Lead is orthogonal. Inactive/unqualified positions or locations fail assignment validation. New locations have no invented staffing/Lead/coverage/eligibility defaults and derive Needs setup until configured. Phase 4 must restrict candidates to active READY locations and reuse this engine.

Business-time conversion uses explicit persisted workspace timezone, strict DST disambiguation and UTC timestamp storage. Nominal scheduled wall minutes remain unchanged. Timezone edits lock after operational records exist; concurrent writes cannot bypass that boundary. Malformed/nonexistent/ambiguous legacy notification boundaries suppress delivery rather than guessing. Workspace name edits remain possible while timezone is locked.

Migration 0008 is prepared after exact 0001–0007; none is applied to an existing customer database here. Captured publication position labels survive catalog rename/deactivation. Test-only generic SQL setup is not production provisioning. Skills/certifications/training remain deferred, as do automatic scheduling and real timekeeping.
