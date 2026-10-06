# Shared Fuel scheduling rules implementation plan

> Execute this bounded plan inline using Superpowers executing-plans and test-driven-development. The user's Phase 2 specification and confirmed workweek are the authority. One local commit after verification; no intermediate commits, push, merge, deployment, migration application or Phase 3.

**Goal:** Establish one explainable scheduling eligibility and staffing foundation using existing Fuel contracts.

**Architecture:** Extend `validateShift` into the shared assignment evaluator; extend existing schedule-health coverage rather than adding a parallel algorithm. Pure business-date/time and availability helpers feed those evaluators. Existing repositories supply both-location shifts, profile settings, normal availability, weekly overrides and approved leave. Existing server actions remain authorization/workflow adapters and retain manager approval for exchanges.

**Stack:** Existing TypeScript, Vitest, Next.js/React and PostgreSQL/Neon repository interfaces. No dependency additions or live database tests.

## Baseline and decisions

- Branch: `codex/fuel-phase-2-scheduling-rules`.
- Worktree: `/Users/josek0514/.codex/worktrees/fuel-phase-2-scheduling-rules/Fuel-Scheduler-`.
- Exact base: `6d644c329143ed7be911bd169718593ec09106df`.
- The desktop task's older checkout does not contain this commit. Git worktree creation used the verified Phase 1 repository; other checkouts are untouched.
- User confirmed Monday 00:00 through Sunday in `America/Puerto_Rico` as Fuel's payroll/workweek and scheduling-hour boundary. Reuse `weekStartFor`; do not derive caps from visible dates or `schedules.week_start` aggregates.
- Default maximum: 40 scheduled hours. Targets are preferences, never ceilings. Employee maximum is stored beside the existing target; an explicit business maximum can further constrain the shared policy.
- Automatic eligibility defaults to one shift per touched business calendar day. Existing human scheduling/exchange modes surface the same-day exception as a warning; only automatic eligibility hard-blocks it unless an explicit policy changes the limit. Other required hard checks are enforced in all modes.
- Existing Owner/Manager/Lead qualification for designated Lead assignments is reused; Employee cannot satisfy Lead coverage. Scheduling capabilities do not change authentication privileges.
- Missing weekly submission is explicit warning/input state, not silently unavailable or submitted. Normal availability remains the base; intentional unavailable-all-week remains a blocker.
- Existing submitted weekly snapshots remain whole-week snapshots. New submissions use normal hours plus overrides of affected dates, distinguished by a small metadata column; no new availability table.
- Civil business dates/times are evaluated independent of the machine/browser timezone. Half-open intervals handle adjacent shifts, overnight work, partial leave and every affected workweek. The engine may accept an explicit end date for longer proposed periods; existing single-date storage can persist an overnight shift after the prepared constraint extension, not arbitrary multi-day shifts.

## Pre-implementation inventory: reuse and genuine extensions

| Area | Existing source reused | Genuine extension / identified gap |
| --- | --- | --- |
| Employee identity/status | `domain.ts`, `data/employees.ts`, `employees` | Reuse `active`; no replacement employee model |
| Roles and Lead | `UserRole`, schedule actions' Owner/Manager/Lead check, `shifts.is_designated_lead` | Central capability check, reused by assignment and staffing evaluation |
| Locations | `locations`, `employee_location_eligibility`, existing profile primary/eligible locations | Existing allowed-location contract; both-location conflicts/hours |
| Target hours | `employee_scheduling_settings.target_weekly_hours`, `data/schedule-health.ts`, existing Scheduling Rules form | Add maximum-hours column/read/write/input; keep target separate |
| Normal availability | `availability_windows`, `data/availability.ts`, existing editor | Reuse weekly recurring windows and complete-period coverage |
| Dated exceptions | `availability_exceptions` already stores AVAILABLE/UNAVAILABLE dates and optional partial times | Add missing repository read/write use; no new exception model/table |
| Weekly availability | `weekly_availability_windows`, `weekly_availability_submissions`, `data/week-settings.ts` | Legacy snapshot compatibility plus normal/affected-date precedence metadata |
| Unavailable all week / missing | `assistance/availability-submission.ts`, submission rows/counts | Preserve intentional zero-hour submission; ignore seeded hours as submission; resolve effective hours |
| Deadline | `schedule_week_settings.availability_deadline`, existing guarded weekly save | Reuse deadline; check during transaction as well as action preflight |
| Approved leave | `time_off_requests`, `data/requests.ts`, validation context | Approved-only blockers; pending/denied ignored; overnight/partial overlap |
| Schedules/shifts | `schedules`, `shifts`, `data/schedules.ts`, `ShiftCandidate` | Read affected real workweeks across locations; overnight constraint preparation |
| Workweek/timezone | `date-utils.ts` has Monday schedule weeks and Puerto Rico formatting | User's explicit business confirmation above; dedicated hours allocation using that same boundary |
| Staffing | `location_staffing_settings`, `location_coverage_windows`, Scheduling Rules | Reuse stored 2/6 and period overrides; no hardcoded runtime location counts |
| Coverage/Lead health | `scheduling/schedule-health.ts`, `publish-readiness.ts` | Extend actual-period evaluation, qualified Leads and stable gap reasons |
| Acknowledgements | `schedule_acknowledgements`, publication revisions/actions | Preserve behavior and invalidate through existing actions only |
| Exchanges | `scheduling/exchange-validation.ts`, exchange actions/repositories | Reuse outgoing-assignment exclusion and shared validator; retain consent and manager approval |
| Call-outs | `shift_callouts`, existing approval/open-coverage repositories | Exclude approved released shifts from conflict/hour ledger; no automatic offers |
| Existing conflicts | `validate-shift.ts` and `getShiftValidationContext` | Existing context loads only same-day conflicts, falls back on empty weekly windows and groups hours by schedule week; repair these gaps |
| Hours/fairness | `durationMinutes`, `schedule-health.ts`, `hour-fairness.ts` | Use scheduled durations and business-week allocation; no fake actual hours or Clocker connection |
| Timekeeping | `time-clock.ts`, `data/time-clock.ts`, `clocker-kiosk.tsx`, migration 0005 | Read-only inventory; all Clocker/time-record behavior protected |

UI contract and automation charter were read before implementation. No repository-local AGENTS.md exists; Jose's global/user engineering agreements apply. Package build/start contain no migration hooks. Existing dependency runtime is copied locally without credentials.

## Tasks and acceptance checks

### 1. Shared business periods and effective availability

- [x] Write failing real-domain tests for overnight duration, Monday splitting, machine-timezone independence, complete-period availability, split windows/gaps, dated overrides, partial/full unavailable, legacy submitted snapshots, missing submission and unavailable-all-week.
- [x] Implement focused `scheduling/periods.ts` and `scheduling/availability.ts`, reusing `weekStartFor` and existing availability records. Add the confirmed business timezone constant; fix scheduled overnight duration only.
- [x] Run focused tests RED → GREEN and full suite; record results.

### 2. Canonical assignment and staffing evaluation

- [x] Extend existing validator tests with active/eligible/role checks, both-location overlaps, same-day automation policy, approved/pending/denied leave, target vs max (including exactly 40), every affected week, malformed inputs and outgoing-shift exclusion.
- [x] Extend `validateShift` with `eligible`, blockers/warnings, structured issue details and per-workweek projected scheduled hours. Existing human workflow modes remain explicit; all business checks stay in this module/helpers.
- [x] Extend existing health tests for 2/6 requirements from supplied settings, missing/qualified Lead, location isolation, duplicate employee counting and overnight period coverage. Extend the existing algorithm with structured STAFFING_GAP/LEAD_COVERAGE_GAP results.
- [x] Run focused tests RED → GREEN and full suite.

### 3. Repository/input integration and unapplied schema preparation

- [x] Add repository-boundary tests for effective availability, submission metadata, deadline/atomic replacement, maximum-hour persistence and affected-workweek/global shift context. Database operations are mocked at the SQL boundary, not live.
- [x] Prepare migration 0006 extending existing settings/submission tables and overnight constraints only; document legacy compatibility and rollout/rollback requirements. Never apply it.
- [x] Wire existing validation-context and workflow adapters to the shared rules; retain all authorization, exchange consent/manager review and acknowledgement behavior. Do not alter copy-week automation, notifications or Clocker workflows.
- [x] Use existing normal/weekly editor with hidden affected-day data and unchanged action geometry; allow confirming unchanged normal hours. Add labeled Target/Maximum fields inside existing Scheduling Rules rows only.
- [x] Run affected repository/action/component tests, role regressions and full suite.

### 4. Verification, fresh review and one local checkpoint

- [x] Run lint, typecheck, all tests and build; restore only own Next-generated declaration/config changes and recheck typecheck.
- [x] Compare protected screens against exact base; changed input views get before/after screenshots and responsive/keyboard/state checks at 320/375/390/430/768/1024/1440. Keep fixture vs live evidence distinct.
- [x] Perform the executing-plans skill's single fresh-context whole-diff review, address substantive findings with regression tests, and record decisions/results here.
Final checkpoint: create exactly one local commit `feat: establish shared scheduling rules`; verify parent/base, clean worktree and changed files. The identity and post-commit status are recorded in the final response and external `final-report.md`, so this checkpoint is never amended. Stop for review.

## Review focus

Check back-to-back periods, duplicate shift identities/outgoing removal, Sunday overnight into Monday, legacy zero-window submissions, normal changes after a new weekly confirmation, elapsed deadline during save, malformed dates/times and unrelated roles/data. Coverage is per location and qualified designated Lead; another location cannot contribute. Never translate UI request types into eligibility rules inside React.

## Execution ledger

Inventory complete; business workweek confirmed directly by Jose. No implementation had started when the missing workweek decision was raised. Future results are appended after commands actually run.


### Completed implementation and final checks

The existing assignment validator, staffing health algorithm, profile/location eligibility, normal/weekly/dated availability records, approved leave, schedules, exchange consent/manager review, released call-outs and hour-target settings were extended. No parallel employee, availability, shift or eligibility system was introduced. The only schema preparation is migration 0006, which remains unapplied.

The rule and repository matrices were introduced as failing behavior tests before their corresponding implementation. Subsequent focused failures covered midnight endpoints, Lead-gap context, actual-week carry-in, post-lock deadlines and concurrent legacy weekly conversion. The final suite contains 34 files / 226 tests (baseline 28 files / 130 tests). No assertion was disabled or snapshot updated to obtain the result.

| New test file | Executed cases | Behavior verified |
| --- | ---: | --- |
| `src/lib/scheduling/scheduling-rules.test.ts` | 59 | Valid assignment; inactive/location/role/Lead blockers; complete normal and dated availability; legacy snapshots, missing submission and unavailable all week; approved/pending/denied/cancelled leave; overlapping shifts at both locations; automatic same-day policy and configurable limit; target vs maximum, exactly 40 vs 41; dated cross-location hours; duplicate/outgoing/released shifts; Sunday/Monday splitting, long/overnight periods and second-day conflicts; 2/6 staffing and Lead gaps; location isolation; unknown/inactive profiles; workweeks independent of visible dates and UTC/Los Angeles/Tokyo machine timezone |
| `src/lib/scheduling/weekly-availability.test.ts` | 5 | Unedited multiple normal periods; unchanged confirmation inherits normal; legacy missing-day intent; restoration to normal removes an override; all-week unavailability survives normal changes |
| `src/lib/data/scheduling-inputs.test.ts` | 14 | Global dated validation context; distinct target/maximum persistence; unchanged weekly confirmation; seven-day unavailable override; affected-day writes; missing versus legacy-zero submissions; transactional deadline failure; prior-Sunday carry-in reads; current clock after lock; absent staffing fails; concurrent legacy conversion recomputes without losing another day; bounded retries |
| `src/lib/data/hour-fairness.test.ts` | 1 | Historical scheduled-hour fairness allocates overnight hours into the actual Monday workweeks at both locations |
| `src/app/app/availability/actions.test.ts` | 5 | Midnight 00:00/24:00 normal and weekly endpoints; full-day availability; malformed hour/minute rejection |
| `src/app/app/schedule/settings/actions.test.ts` | 9 | Owner/Manager authorization; distinct blank target/configured maximum; invalid maximum rejected before writes; Employee/Lead forbidden |

Existing coverage-ranking, manager-actions and manager-workflows suites each gained one focused regression. Existing shift/health/exchange and self-service guard fixtures now use the complete canonical input and qualification contracts. Their updated assertions reflect hard availability/maximum rules and dated scheduled hours rather than the obsolete scalar. Role regression suites ran as part of the full suite.

Final application commands all exited 0:

- `npm run lint`
- `npm run typecheck`
- `npm test` — 34 files, 226 tests passed
- `npm run build` — optimized Next.js build, TypeScript and 23 static pages completed
- `npm run typecheck` after restoring only this build's generated `next-env.d.ts` and `tsconfig.json`
- `git diff --check`

These commands have no migration hooks. No database credentials were copied or live repositories exercised. SQL transaction/deadline/version behavior is tested through repository-boundary mocks, not PostgreSQL execution or live concurrency.

### Fresh whole-diff review

The executing-plans skill required one fresh-context review. Its five substantive findings were fixed with regression evidence:

1. Dashboard/publish health missed previous-Sunday overnight carry-in. Use actual business-week selection through the existing shift reader.
2. `now()` could predate an advisory-lock wait. The final deadline guard now uses `clock_timestamp()` after acquiring the shared lock.
3. Native midnight end inputs were rejected. Normalize end 00:00 to the day's stored 24:00 for availability/coverage periods and display stored 24:00 as native 00:00.
4. A Lead-only gap could recommend a non-Lead because navigation lost the requirement. Preserve the Lead flag through the existing suggestion and new-shift adapters and validate it in the shared evaluator.
5. Concurrent edits during legacy weekly conversion could overwrite another day. Compare the exact submission text version under the lock; retry stale conversion against fresh inputs, at most three attempts.

The same reviewer completed bounded verification of those five fixes: six focused files / 99 tests passed, with no remaining findings in that review scope. The final full application suite subsequently passed 226 tests.

### Browser evidence and scope

External QA directory: `/Users/josek0514/.codex/visualizations/2026/10/02/01a0f8c7-f196-7d22-8896-8d3c96547bd9/fuel-phase-2-scheduling-rules`.

The approved source was archived from exact base `6d644c329143ed7be911bd169718593ec09106df`. Baseline/current local fixture servers render the real pages, components and CSS with fictional data, intercepted actions and a fixed client date. They verify browser rendering and client behavior, not live authentication or database persistence.

- Protected markup/geometry/computed-style comparison: 234 cases passed in Chromium and WebKit at 320/768/1440. Employee and Lead Home/Schedule/normal Availability/Time Off/Shift Requests/My Time, Manager Dashboard/Time Off/Availability/Shift Requests and Schedule/Employees/Templates, and both Clocker locations were covered.
- Clocker tablet orientation comparison: eight cases passed at 1024×768 and 768×1024 in both engines and locations. No Clocker source or actual worked-time record was changed.
- Changed-input responsive checks: 196 cases passed in both engines at 320/375/390/430/768/1024/1440, including default/long/empty/locked/error/success/midnight states. Target/maximum peers retain equal 44px heights and widths, labeled inputs, no horizontal overflow and final-content clearance above the actual fixed mobile navigation. A simulated 34px safe-area inset also passed.
- Keyboard focus/Enter submission, reset, disabled saving state and intercepted form payload checks passed in both engines. These client fixture writes are not database writes.

Final pixel comparison: all 234 protected cases are pixel-identical against the exact base, in addition to identical markup/geometry/computed styles. No text normalization was used. Nine before/after screenshots were captured: Scheduling Rules and Weekly Availability at 390/1440, plus a 390px midnight-input example. Native Sunday 22:00–00:00 and Monday 00:00–06:00 values were asserted valid in the browser. All five changed-screen captures were visually inspected. Changed UI is limited to the existing Scheduling Rules target/maximum row and the existing weekly availability confirmation/midnight input behavior. Other page changes are domain adapters or human-readable error mapping; the established layouts and action geometry remain.

### Exact Phase 2 file manifest

All paths below are relative to the isolated worktree listed above. Build-generated declarations/configuration, dependencies, credentials and external fixture artifacts are excluded.

- `db/migrations/0006_scheduling_rule_inputs.sql`
- `docs/architecture/fuel-scheduling-rules.md`
- `docs/superpowers/plans/2026-10-02-fuel-phase-2-scheduling-rules.md`
- `src/app/app/availability/actions.test.ts`
- `src/app/app/availability/actions.ts`
- `src/app/app/availability/page.tsx`
- `src/app/app/exchange/actions.test.ts`
- `src/app/app/exchange/actions.ts`
- `src/app/app/exchange/page.tsx`
- `src/app/app/page.tsx`
- `src/app/app/schedule/actions.ts`
- `src/app/app/schedule/coverage/page.tsx`
- `src/app/app/schedule/edit/page.tsx`
- `src/app/app/schedule/new/page.tsx`
- `src/app/app/schedule/page.tsx`
- `src/app/app/schedule/settings/actions.test.ts`
- `src/app/app/schedule/settings/actions.ts`
- `src/app/app/schedule/settings/page.tsx`
- `src/app/app/schedule/templates/actions.ts`
- `src/app/app/self-service-guards.test.ts`
- `src/app/globals.css`
- `src/components/availability-editor.tsx`
- `src/components/manager-workflows.test.tsx`
- `src/lib/assistance/manager-actions.test.ts`
- `src/lib/assistance/manager-actions.ts`
- `src/lib/data/availability-inputs.ts`
- `src/lib/data/availability-submissions.ts`
- `src/lib/data/availability.ts`
- `src/lib/data/exchanges.ts`
- `src/lib/data/hour-fairness.test.ts`
- `src/lib/data/hour-fairness.ts`
- `src/lib/data/schedule-health.ts`
- `src/lib/data/schedules.ts`
- `src/lib/data/scheduling-inputs.test.ts`
- `src/lib/data/week-settings.ts`
- `src/lib/date-utils.ts`
- `src/lib/scheduling/availability.ts`
- `src/lib/scheduling/coverage-ranking.test.ts`
- `src/lib/scheduling/coverage-ranking.ts`
- `src/lib/scheduling/exchange-validation.ts`
- `src/lib/scheduling/periods.ts`
- `src/lib/scheduling/schedule-health.test.ts`
- `src/lib/scheduling/schedule-health.ts`
- `src/lib/scheduling/scheduling-rules.test.ts`
- `src/lib/scheduling/validate-shift.test.ts`
- `src/lib/scheduling/validate-shift.ts`
- `src/lib/scheduling/weekly-availability.test.ts`
- `src/lib/scheduling/weekly-availability.ts`


### Review artifacts

Preview/gallery: `http://127.0.0.1:4196/review.html` (local fictional-data fixture).

QA evidence in the external directory above:

- `lint-final.log`, `typecheck-final.log`, `typecheck-restored-final.log`, `test-final.log`, `build-final.log`.
- `protected-qa.json`: 234 pixel-identical cases with screenshot hashes; exact DOM text, geometry and computed styles also match.
- `protected-clocker-orientations.json`: eight unchanged tablet layouts.
- `responsive-qa.json`: 196 changed-input/state/width/engine cases; 112 mobile simulated-safe-area cases; keyboard and intercepted submissions passed.
- `screenshots.json`, `screenshots/`, `review.html`: nine captures and a before/after gallery; midnight native controls verified.

Lead weekly-editor responsive checks also passed: 98 additional cases across the same seven widths and both engines, including the seven input states. Combined changed-input coverage is 294 cases. `responsive-lead-qa.json` records those results; 56 additional mobile cases passed simulated safe-area clearance. These artifacts stay outside the source commit. No live data, authentication, migration, deployment or notification was involved.

All pre-commit acceptance checks are complete. No unresolved business decision remains. The only next operation is the authorized single local checkpoint, followed by reporting its exact identity and stopping for review.
