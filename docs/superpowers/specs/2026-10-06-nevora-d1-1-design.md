# NEVORA Workforce — D1.1 recorded-time observation engine

**Contract:** NEV-D1-SPEC-001, revision 0.2  
**Prepared:** October 6, 2026  
**Status:** REVIEW DRAFT — specification and execution-plan preparation authorized; this reconciled design is presented for review, not retroactively marked approved.  
**Implementation owner:** ChatGPT, applying NEVORA's operating-executive skills.  
**Review separation:** Independent QA/UI retain their own authority and report to Jose. Codex is reserved for the final technical review; no independent review is claimed here.

**Accepted development-entry baseline:** `4b188df27cd2b67af8e141204ff743438521f441`  
**Baseline tree:** `5e7194519bbbd7e3f6bb6bc8aab82dea5a47d87d`  
**Local implementation branch:** `phase-d/d1-exception-engine`  
**Worktree:** `/Users/josek0514/.codex/worktrees/phase-d-d1-exception-engine/Fuel Scheduler`

Phase D entry remains GO for isolated development. This document does not authorize production, close FR-AUTH-001, or accept any material residual risk.

## 1. Decision presented

Implement **D1.1 as a pure, deterministic, read-only projection of factual recorded-time observations**.

For example, report “Clock-in recorded after scheduled start” with the exact measured difference. Do not decide that a person violated a lateness policy, was absent, or should receive a pay deduction. No customer grace period or policy threshold is selected in this slice.

This is the recommended reconciliation of two previously prepared, unapproved drafts:

| Subject | NEV-D1-SPEC-001 v0.1 | NEV-D1-CONTRACT-001 v1.0 | Recommended first-slice decision |
|---|---|---|---|
| First delivery | D1.1 pure domain logic, then reader/UI batches | D1-A covers projection, reader and panel | Retain D1.1 pure domain logic only; reader and UI follow separately. |
| Rule semantics | Several detectors require explicit configurable thresholds | Factual strict comparisons without invented policy | Emit factual recorded-time observations; defer threshold-based policy classifications. |
| Missing clock-in | Conditional detector requiring a reliable association contract | Explicitly excluded until that contract exists | Excluded from D1.1; retained as a D1 dependency, not silently removed. |
| Observation window | Selected week plus open entries | Today & open entries | Today & open entries for the first projection. Historical ranges remain later scope. |
| Group/count meaning | Review items and affected employees | Entries and signals | Group by entry; separately name recordCount, signalCount and affectedEmployeeCount. |
| Historical schedule | Resolve saved immutable references | Resolve saved immutable references | Preserve the common requirement; never choose a newer publication or nearby shift. |

Both original drafts remain unchanged. Approval of this package makes revision 0.2 controlling **only for D1.1**; it does not approve every proposal or delivery batch in either original draft.

## 2. User value and original roadmap

An authorized future management view should be able to explain what recorded time needs review and why. D1.1 provides the logic behind that view; it does **not** add a visible panel yet.

The Lettered Executive Program numbering remains:
D1 Exception engine; D2 Correction workflows; D3 Timecards; D4 Reports; D5 Export; D6 Payroll-ready export, not payroll processing; D7 Manager Action Center foundation; D8 Codex Phase D review.

D1.1 completion must not be reported as complete D1, complete Phase D, or a public-production release.

## 3. Hard boundaries

- No application database reads or writes, hosted fixtures, schema migrations or new data stores. Existing regression SQL suites may use reviewed, invocation-owned disposable loopback databases for validation only; they are not a D1 runtime data source.
- No routes, manager panel, employee UI, Clocker UI, polling, background jobs or provider calls.
- No punch/break edits, reassociation, automatic clock-out, corrections, approvals or dismissals.
- No policy settings, numeric attendance tolerances, payroll calculations, overtime entitlement or wage decisions.
- No changes to auth, permissions, session handling, notification protocols, service-worker contracts or shared Phase C helpers.
- No changes to package versions, lockfile, TypeScript target, test discovery or CI workflow.
- No production operation, `main` merge, shared-branch push, deployment, purchase or repository visibility change.
- No use of Git Diff Patcher Bridge or the `git diff` command.
- Existing worktrees, dirty files and review evidence remain intact.
- Use synthetic object fixtures only. Do not read `.env` or request credentials for this slice.

## 4. Source facts inspected at the baseline

These are observations about existing code, not claims of new implementation:

- `src/lib/clocker/schedule-candidates.ts` captures MATCHED, UNMATCHED and AMBIGUOUS context using exact half-open published intervals. An 08:59 clock-in for a 09:00 shift may legitimately be UNMATCHED.
- The same module's `prepareScheduleCapture` selects the latest publication when preparing a **new** clock-in. It must not be called to reinterpret old attendance.
- `src/lib/employee-time.ts` uses precise actual intervals, preserves breaks separately from gross recorded time, rejects inconsistent history, and does not determine payable time.
- `src/lib/clock-monitor.ts` uses one observation instant, bounded snapshot lifetime and minimal validated output. Its current-state projection is not the D1 history reader.
- `src/lib/time-clock.ts` identifies CLOCKED_IN, ON_BREAK and CLOCKED_OUT states.
- `package.json` pins `@js-temporal/polyfill` 0.5.1. Existing code uses Temporal and `BigInt(...)`, not bigint literals.
- Default `vitest.config.mts` discovers conventional `.test.ts` files and resolves `@/`.
- CI uses Node 22; the inspected local runtime is Node 24.19.0. Local success will not substitute for actual CI.
- CI does not trigger on `phase-d/**` pushes alone. Future integration uses the governed PR/release route, not a silent workflow edit.

## 5. Proposed domain interface

The implementation plan pins the exact TypeScript interfaces. This domain boundary is **not** an HTTP payload and is not an authorization capability.

Input `AttendanceSource` contains:
- `version: 1`, a workspace ID, valid IANA timezone and one supplied `observedAt` instant.
- Recorded entries with entry ID, workspace/employee/location IDs, sourceVersion, actual clock-in/out, state, the saved schedule context and complete related breaks.
- Break ID, parent entry ID, actual start/end and the saved break-type snapshot/target.
- Normalized immutable published-shift facts containing workspace/employee/location IDs, revision ID/number, published-shift ID, schedule/source-shift identity, original date/start/end and approved-callout state.
- Explicit `entriesComplete`, `breaksComplete` and `publicationsComplete` coverage flags. Empty arrays are not proof that a source read succeeded.

Future D1.2 is responsible for authenticating, authorizing, selecting and normalizing these records. D1.1 verifies cross-field consistency of supplied synthetic facts; it cannot prove a real database snapshot, immutable custody, session authority or Neon behavior.

Output `AttendanceProjection` is either:
- `state: "ready"` with engineVersion, observedAt, workspace/timezone, the derived Today & open entries scope, entry groups, distinct counts and evaluation limitations; or
- `state: "unavailable"` with a bounded reason code and **no entry identities, raw records, stack traces or SQL**.

Allowed unavailable reasons: `invalid_source`, `incomplete_source`, `source_limit`.

Each group contains its safe entry/employee/location IDs, sourceVersion, actual-time evidence only when valid, and one or more observation items. No employee names, contact details, credentials, tokens, PINs, leave reasons, device secrets or arbitrary extra fields are needed in D1.1 output. Later authorized UI enrichment is separate.

Stable item identity derives from engineVersion + workspace + entry + observation kind + break ID when applicable. observedAt, display order and elapsed duration are not identity components. Source versions and immutable references travel as evidence, not as authorization.

## 6. Observation rules

Use exact instants before display rounding. Equality is not a strict exceedance.

| Kind | Required evidence / condition | Meaning |
|---|---|---|
| TIME_HISTORY_INCONSISTENT | Safely attributable entry has future/reversed/overlapping intervals, duplicate open entries for the same employee, or state/end/open-break contradictions | “Time record needs review.” Suppress derived timing observations and totals for affected entries. |
| SCHEDULE_UNMATCHED | Valid saved UNMATCHED context with reason NO_MATCH | “No schedule match recorded.” Neutral uncertainty; not absence or unauthorized work. |
| SCHEDULE_AMBIGUOUS | Valid saved AMBIGUOUS context with its recorded reason | “Schedule match needs review.” Do not pick a candidate. |
| CLOCK_IN_AFTER_SCHEDULE_START | Reliable saved MATCHED reference resolves to the exact historical shift; actual clock-in is strictly after its start | A factual difference for this entry, not a policy violation. |
| CLOCK_OUT_BEFORE_SCHEDULE_END | Consistent closed entry with a reliable historical match ends strictly before that shift's end | This entry ended before scheduled end. Do not claim that the employee left work; another entry may follow. |
| OPEN_AFTER_SCHEDULE_END | Consistent open entry and observedAt is strictly after its reliably matched scheduled end | “No clock-out recorded · scheduled end passed.” Never close it automatically. |
| BREAK_TARGET_EXCEEDED | Consistent open break exceeds its own valid positive saved targetMinutes | Operational target exceeded, not a legal or payable-break classification. |

No normal on-time active entry or within-target open break becomes an exception solely because it is active.

For duplicate or overlapping entries belonging to the same employee, assess all supplied related entries before the view selection. Do not ignore a conflict just because it occurred in another location.

Legacy null context is not captured/not evaluated, not UNMATCHED. Malformed context, missing publication, missing/invalid saved target, DST uncertainty or inconsistent historical identity yields an explicit comparison limitation, not a guessed observation or a fabricated zero.

Attribution failure (invalid/cross-workspace entry or break ownership, duplicate primary record identity) makes the response unavailable. A malformed timestamp with otherwise safe attribution becomes an integrity observation with no derived durations. Do not pass malformed source strings into returned evidence.

## 7. Historical schedule and time precision

Resolve only the saved revision/published-shift pair. Verify employee, location, workspace, schedule and source-shift identity, revision number and capturedAt matching the actual clock-in instant. A match must be internally consistent with Phase C's capture rules.

Use the captured schedule timezone, not the workspace's current timezone, when resolving historical scheduled boundaries. Current workspace timezone defines the observation day only.

Support overnight intervals and allowed `24:00` endings. A zero-length scheduled interval or an ambiguous/nonexistent local boundary cannot be used for comparison. Do not use an earlier/later offset guess or select the highest revision as a fallback.

Use Temporal.Instant epochNanoseconds and `BigInt(...)` arithmetic. No `Date.now()`, host-local date parsing, implicit 24-hour-day arithmetic, browser clock, random IDs, timer or network call.

Internal differences are bigint. Serialized evidence uses a validated positive base-10 `differenceNanoseconds` string of at most 30 digits; it must never contain a raw bigint or an unsafe truncated number. Positive sub-minute differences display as `<1m`, not zero. This is display behavior, not a payroll rounding policy.

Gross recorded time remains separate from break duration. D1.1 does not compute paid/net hours.

## 8. Scope, coverage and bounds

Derive Today from observedAt in the workspace timezone, including local-midnight and DST behavior. Include safely attributable entries intersecting the local day up to observedAt, plus all open entries regardless of start date. Inactive employee/location/device state does not erase recorded open history.

D1.1 has no user-selectable week/location filter. Later reader/UI filters must not suppress supporting records required to evaluate a conflict.

Bounds: at most **500 supplied entries**, **5,000 related breaks**, and **500 referenced historical shift facts**. Exceeding a bound returns `source_limit`; do not silently truncate, enlarge a cap, or pretend the workspace is clear.

If entry or break coverage is incomplete, return `incomplete_source`. Incomplete publication coverage may still permit history or break observations but must visibly mark schedule comparisons as limited. Extra unrelated publication facts are never used as an alternative match.

A ready response describes only the checks actually evaluated. Preserve explicit deferred capability markers for missing clock-in, policy-based lateness/early departure, unusually long entries, D2 correction review and overtime risk. Empty results mean no observations in evaluated recorded-time checks, not “all attendance is compliant.”

Grouping is by entry. `recordCount` is returned entry groups, `signalCount` is total observations and `affectedEmployeeCount` is unique employees represented. Two entries for one person must not be reported as two people.

## 9. First-slice acceptance

| ID | Required result |
|---|---|
| D111-01 | Identical supplied snapshots produce identical output; input bytes/objects are not mutated. |
| D111-02 | Permuting records/breaks/publication facts does not alter stable output. |
| D111-03 | Exact scheduled start/end/target equality produces no exceedance observation. |
| D111-04 | A positive one-nanosecond difference stays positive and formats as `<1m`. |
| D111-05 | Ordinary on-time open work and within-target breaks produce no overdue observation. |
| D111-06 | Old open entries remain in scope across local midnight and week boundaries. |
| D111-07 | Overnight and `24:00` historical boundaries use captured timezone correctly. |
| D111-08 | DST gaps/folds withhold uncertain scheduled comparisons; actual elapsed time remains accurate. |
| D111-09 | Later draft/publication changes cannot replace a saved historical match. |
| D111-10 | 08:59 for 09:00 with saved UNMATCHED remains neutral and is never labeled absent/late. |
| D111-11 | AMBIGUOUS preserves its reason and never chooses a shift. |
| D111-12 | Legacy null/malformed context, missing publication or wrong reference yields an explicit limitation. |
| D111-13 | Missing target is not zero; catalogue changes cannot replace a saved break target. |
| D111-14 | Malformed/future/reversed intervals, overlaps and state contradictions do not yield derived totals. |
| D111-15 | Multiple open entries across locations flag the affected entries; touching closed intervals are not overlaps. |
| D111-16 | Unsafe ownership/identity fails without returning any identities. |
| D111-17 | Incomplete entry/break coverage and over-cap sources cannot return complete-looking empty success. |
| D111-18 | Counts distinguish entries, observations and people; item IDs survive refresh. |
| D111-19 | Output drops extra private fields; JSON serialization contains no bigint. |
| D111-20 | No DB, network, browser, clock, randomness, timer, provider or persistence dependency is introduced. |
| D111-21 | Existing relevant Phase C tests and the required full gates still pass on the new candidate. |
| D111-22 | Source and review evidence identify the exact new candidate; no prior-SHA result is relabeled as D1 evidence. |

All acceptance rows are PLANNED_NOT_RUN in this preparation package.

## 10. File and delivery boundary

New product modules are confined to `src/lib/attendance/`: types, validation, historical-schedule resolution, projection and formatting. Tests are adjacent; synthetic fixtures are under `src/test/fixtures/`.

No existing Phase C runtime module is edited in D1.1. Type-only imports from its domain definitions are allowed; its writer and latest-publication capture code are not runtime dependencies.

The paired plan names exact files, interfaces, test cases, commands and local commit boundaries. Execution mode is already selected: ChatGPT implements in this session, with operating-executive control lenses; Codex remains downstream.

D1.2 reader/API and D1.3 UI require their own scoped plan and evidence. Successful pure tests do not establish hosted authorization, blocked-SELECT expiry, Neon transaction rollback or browser privacy lifecycle.

## 11. Carry-forward controls

FR-AUTH-001, release/migration/recovery evidence, branch-enforcement limitations, UI-RUNTIME-001 and physical/accessibility acceptance remain owned by their controlling records. No independent finding is closed by this document.

Existing approved Preview QA accounts and historical approval for specific cleanup fixtures do not authorize new D1 hosted writes. No credential handling is needed for D1.1.

Stop if a new action needs sensitive access, risks existing work, weakens an assertion/control, requires a new attendance/pay policy, or falls outside this source slice.

## 12. Approval requested and inspection limits

**Recommended decision:** approve this revision 0.2 and its paired D1.1 implementation plan for local execution by ChatGPT. This chooses factual recorded-time observations first; it does not configure customer attendance thresholds or authorize any hosted/production action.

Preparation performed: current worktree/base/remote checks, preservation checks for 28 existing source/asset fingerprints, recovery of both original drafts, selected-source inspection and this explicit reconciliation proposal.

Not performed in this package: D1 source implementation, dependency installation, test execution, hosted access, independent reviewer dispatch, shared-branch push or deployment.

**Source ledger:** original drafts NEV-D1-SPEC-001 v0.1 and NEV-D1-CONTRACT-001 v1.0; exact-baseline AGENTS/executive skills and the code/configuration files listed in section 4; the accepted cleanup/Phase D entry evidence remains historical baseline evidence only.
