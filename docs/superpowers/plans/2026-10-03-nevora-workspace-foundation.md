# NEVORA Workspace, Locations & Positions Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish configurable workspace, location and position inputs for NEVORA Workforce while preserving Fuel data, Phase 0–3 behavior and the single shared scheduling engine.

**Architecture:** Extend existing location, employee, staffing, coverage, shift and publication models. Keep pure eligibility/time/readiness evaluation separate from authenticated repositories and UI. Migrations remain canonical; 0008 upgrades the existing installation. Explicit disposable generic-customer fixtures prove runtime independence. Full fresh-customer schema distribution/provisioning is deferred to Productization.

**Tech Stack:** Existing Next.js 16.3.6, React 19.3.0, TypeScript, raw CSS, Neon/PostgreSQL, Vitest, local Playwright and web-push 3.6.7. Plan `@js-temporal/polyfill` 0.5.1 as the one timezone-conversion dependency, installed only after execution approval. PostgreSQL provides ownership-verified disposable integration testing; no production schema-generation toolchain is built in this foundation.

**Spec:** `docs/superpowers/specs/2026-10-03-nevora-workspace-foundation-design.md` — read the complete specification before each task; task instructions do not replace its constraints.

## Global Constraints

- Exact implementation parent: `0a12f1f4ac7212a8cbbe195f013407a8bc74c4d5`.
- Branch `codex/nevora-pre-phase4-foundation`; worktree `/Users/josek0514/.codex/worktrees/nevora-pre-phase4-foundation/Fuel-Scheduler-`. Preserve all other worktrees.
- Architecture and implementation are approved with the Task 11 scope reduction below. Execute Subagent-driven automatically through normal tasks; stop only for the user-specified exceptional decisions.
- One configured workspace; no billing, subscriptions, organization switching, invitations, public signup, tenant administration, notification inbox or customer themes.
- NEVORA → Workforce; VELANI LLC owns the product; Fuel Coffee Drive is existing customer data. Preserve the official transparent wordmark/cyan A and `BrandLockup`.
- Fuel timezone remains `America/Puerto_Rico`; workweek remains Monday 00:00–next Monday 00:00 in the workspace timezone. Preserve UTC timestamp storage and scheduled wall-minute hour semantics.
- Existing access roles OWNER, MANAGER, LEAD, EMPLOYEE stay authorization roles. Do not infer positions from roles or a sole qualification.
- One assigned operational position per shift; one distinct employee counts toward one position quota. Designated Lead is orthogonal and may also be satisfied by that person.
- Route keys are stable, workspace-unique and URL-safe; preserve `/clocker/2` and `/clocker/110`. Ordinary name edits never change keys.
- New locations receive no invented staffing, periods or eligibility; readiness is derived. Inactive or non-ready locations cannot silently enter future automatic generation.
- Do not edit migrations 0001–0007. Prepare 0008 only; no migration to any existing Neon/dev/production database.
- Defer generated distributable baseline, manifest maintenance, pg_dump provisioning, production onboarding CLI/bootstrap and schema-distribution CI gates. Preserve their architectural design for Productization; create no parallel handwritten schema.
- Business changes and notification intents remain atomic; no provider IO or provider-dependent action latency. Logout/session termination must not depend on workspace lookup or push cleanup success.
- Service-worker scope stays `/app/`; no private response caching, Clocker prompts, real device/punch backend or real push activation.
- No Build Week, Fill Gaps Only, automatic selection/assignment/publishing, Phase 4 work, push, merge, deployment, paid upgrades or scheduler provisioning.
- Raw CSS and existing NEVORA tokens/spacing/control geometry; portal peer actions retain 44px minimum height, centered labels and appropriate focus/hover/pressed states.
- Skills, certifications, expirations, documents, training and qualification reminders are deferred. No speculative schema/UI for them.
- One final implementation commit after verification: `feat: generalize Nevora workspace and scheduling foundation`. Per-task commit defaults yield to this instruction; planning commits are separate.
- After each green reviewed task, preserve a local checkpoint containing its tracked diff, explicitly selected new source/test/SQL/doc files and execution log in the task's external artifact directory. Do not reset/stash another task, omit untracked implementation files, or copy `.env`/credentials into checkpoints. These recovery snapshots are not additional implementation commits.
- TDD: write assertions first, record a behavior failure, implement minimum change, verify. Missing imports/exports are not sufficient red evidence; after writing a new-API test, add only a contract stub if needed and rerun its assertions before functional implementation.

## Review Focus

1. A timezone edit racing a dated business write must either finish before that record exists or be blocked; it must never reinterpret a record unnoticed. Task 2 owns the concurrent integration test and Task 7 wires scheduling writers.
2. A multi-qualified employee with overlapping duplicate/conflicting legacy shifts must not fill two simultaneous position slots. Task 6 tests duplicate and conflicting-position input.
3. Renamed/deactivated catalog records must retain Clocker URL and readable historical shift/request identities. Tasks 4, 5, 7 and 10 exercise these references.
4. Task 11 proves the additive 0008 upgrade retains Fuel history and generic runtime behavior with direct test fixture setup. Historical migration hashes must remain unchanged; production schema-distribution drift tooling is deferred.
5. An unavailable workspace lookup must not hold logout hostage or make the worker send with a fabricated zone. Tasks 2 and 8 exercise auth priority and worker failure suppression.

## File and dependency map

| Unit | Files / responsibility |
| --- | --- |
| Persistence/fixtures | `db/migrations/0008_workspace_positions.sql`, `src/lib/domain.ts`, new `src/test/fixtures/nevora-workspace.ts`, existing Fuel fixtures and disposable SQL harness |
| Workspace configuration | new `src/lib/workspace/validation.ts`, `src/lib/data/workspaces.ts`; current-workspace lookup, profile input and atomic timezone safeguard |
| Zoned time | new `src/lib/business-time.ts`; existing `date-utils.ts` retains date-only arithmetic/hour helpers; clients receive configured timezone explicitly |
| Locations/readiness | new `src/lib/data/locations.ts`, `src/lib/scheduling/location-readiness.ts`; existing employee-location and staffing/window tables remain authoritative |
| Positions | new `src/lib/data/positions.ts`, `src/lib/scheduling/capabilities.ts`; membership/catalog input and common capability checks |
| Shared evaluation | existing `validate-shift.ts`, `schedule-health.ts`, `publish-readiness.ts`, adapters and tests |
| Shift/history integration | existing schedules/templates/exchanges/publication repositories and `assistance/publication-diff.ts`; nullable position preservation and existing atomic outbox |
| Notification timezone | existing policy/types/config/recipients/reminders/state/worker, internal worker routes/CLI; separate env-only auth config from bound delivery policy |
| Management UI | existing Settings, employee and Scheduling Rules pages/actions plus new settings Workspace/Locations/Positions routes/forms; scoped globals.css additions |
| Presentation/Clocker | existing Login/Activate/AppShell and relevant portal labels; configured `/clocker/[location]` resolution, unchanged demo workflow |
| Migration verification | owned local upgrade/generic fixtures, historical migration integrity and teardown; full production schema distribution/provisioning is deferred |
| Verification/handoff | focused unit/integration tests, new responsive verifier, protected screenshots and foundation evidence report |

Execution preflight captures the immutable exact-parent baseline described in Task 12 Step 1 before any product edits. Then execute Tasks 1–12 in order. Task 9 consumes Tasks 2–8; Task 10 consumes configured repositories/time and completed UI inputs. No parallel implementation writes to shared files. Each completed task records red/green commands, file manifest and reviewer outcome in the local execution log. If Subagent-driven is selected, use a fresh implementer, fresh spec reviewer and fresh code-quality reviewer per task; fix findings before advancing. Keep review evidence outside the final Git index until the final manifest is approved.

---

### Task 1: Additive schema, domain contracts and dual customer fixtures

**Files:** Create `db/migrations/0008_workspace_positions.sql`, `src/test/fixtures/nevora-workspace.ts`, `src/test/integration/foundation.integration.ts`, `vitest.foundation-integration.config.mts`. Modify `src/lib/domain.ts`, `src/lib/data/employees.ts` identity mapping, `src/lib/demo-data.ts` explicit customer fixture, `src/test/fixtures/fuel-scheduling-rules.ts`, `src/test/fixtures/fuel-portal-notifications.ts`, `src/test/integration/local-postgres.ts`, `package.json` and typed fixture factories affected by required identity fields.

**Interfaces:**
- Produce `Workspace { id; name; timeZone; active; createdAt; updatedAt }`, `Position { id; workspaceId; name; active; createdAt; updatedAt }`; extend Location with required `workspaceId`/`clockerKey`, Employee with `positionIds: string[]`, Shift with optional `positionId`.
- Produce `createDisposableFoundationDatabase({ mode: 'upgrade' | 'empty' }): Promise<{ executor: SqlExecutor; connectionString: string; dispose(): Promise<void> }>`; empty means a newly created owned database, not an existing caller-selected customer DB. Preserve `createDisposableNotificationDatabase()` compatibility, upgrading through 0008 when used by current code.
- Produce explicit Fuel fixture at PR timezone and Northside Services fixture at `America/New_York`, with Main Office, a long West Branch name and an inactive Warehouse; use separate one/five/twenty-location factory variants.

- [ ] **Step 1: Write upgrade-preservation and constraint tests.** Use the owned 0001–0007 fixture, add fictional employee/schedule/shift/window/history, capture records, then exercise the planned upgrade. Assert unchanged IDs/names/staffing 2/6/Lead/eligibility/history; configured workspace/key backfill; nullable legacy shift positions; zero invented positions/quotas. Assert duplicate route keys, duplicate membership, invalid quota 0/101 and deletion of a referenced position fail.

  Representative test: `schema and legacy preservation` (before/after rows come from the real owned SQL fixture).
  ```ts
  expect(after.location).toMatchObject({ id: 'loc-1', name: before.location.name, clocker_key: '2' });
  expect(after.staffing).toEqual(before.staffing);
  expect(after.shift.position_id).toBeNull();
  expect(after.employeePositions).toEqual([]);
  ```
- [ ] **Step 2: Run red SQL-contract tests.** `npm run test:foundation:integration -- -t 'schema and legacy preservation'`. Expected failure is the unimplemented schema/data contract on the new owned database. Do not treat an unavailable PostgreSQL prerequisite or a missing test import as red proof.
- [ ] **Step 3: Implement 0008 and domain/fixture contracts.** Enforce one workspace, workspace-scoped route/name constraints, FK/history preservation and nullable position snapshot/template/shift fields. Backfill non-Fuel existing keys with `location-` plus a stable SHA-256 ID digest; detect collisions. Add no Fuel column defaults and no coverage/qualification backfill. Update existing location reads to map persisted workspace/key fields and employee reads to map qualification arrays; use the new empty join, not invented qualifications. Update explicit demo/test fixtures to the required identity shape so this task leaves the typecheck coherent. Keep prior migration bytes unchanged.
- [ ] **Step 4: Verify the upgrade and test harness.** Rerun Step 2, then `npm test -- src/lib/data/scheduling-inputs.test.ts` and `npm run typecheck`. Require preserved records and confirmed teardown. Integration test guard rejects existing DBs, non-loopback targets and an application `DATABASE_URL`; teardown requires this run's ownership marker.
- [ ] **Step 5: Record and review the deliverable.** Log exact schema changes, migration dependencies and red/green output; gate before repositories. No product commit yet.

### Task 2: Persisted workspace repository and atomic timezone edit safeguard

**Files:** Create `src/lib/workspace/validation.ts`, `src/lib/workspace/validation.test.ts`, `src/lib/data/workspaces.ts`, `src/lib/data/workspaces.test.ts`. Extend `src/test/integration/foundation.integration.ts`. Modify dated-write boundaries in `src/lib/data/week-settings.ts` and `src/lib/data/requests.ts` to use the shared guard; schedule/publication writers are finished in Task 7. Existing time entries are inspected by the edit safeguard; no time-entry write implementation is added.

**Interfaces:**
- `getWorkspace(executor?: SqlExecutor): Promise<Workspace>` returns the one persisted configuration or throws `WorkspaceUnavailableError`; never a Fuel fallback.
- `getPublicWorkspaceName(executor?: SqlExecutor): Promise<string | null>` exposes name only; null means unavailable, not an invented customer.
- `validateWorkspaceProfile(input: { name: unknown; timeZone: unknown }): { name: string; timeZone: string }` rejects blank/overlong/control-character names and invalid/fixed-offset zones.
- `saveWorkspaceProfile(input: { name: string; timeZone: string; actorEmployeeId: string }, executor?: SqlExecutor): Promise<Workspace>` verifies current active Owner; throws `WorkspaceTimezoneLockedError` on prohibited change.
- `workspaceReadGuard(workspace: Workspace): SqlStatement[]` supplies ordered shared row lock and exact version/zone/active assertion. Writers include it in the same business transaction. Common order: workspace, sorted workweeks, sorted employees, then sorted location/position facts and membership guards; catalog writes take the applicable subset. No workspace IO is added to logout.

- [ ] **Step 1: Write repository and race assertions.** Assert reads use Northside name/zone; forged IDs cannot select another configuration; only active Owner saves; unchanged timezone still permits a name edit. A normal-availability-only workspace can change zone. A schedule, revision, dated exception, weekly submission/window, deadline, Time Off or time entry blocks it. Run a two-connection barrier test proving timezone change and first dated write serialize.

  Representative test: `existing schedule blocks timezone edit`; seed a schedule first and use the fixture Owner.
  ```ts
  await expect(saveWorkspaceProfile({ name: 'Northside Services', timeZone: 'Asia/Tokyo', actorEmployeeId: owner.id }, executor))
    .rejects.toBeInstanceOf(WorkspaceTimezoneLockedError);
  expect((await getWorkspace(executor)).timeZone).toBe('America/New_York');
  ```
- [ ] **Step 2: Run red behavior tests.** `npm test -- src/lib/workspace/validation.test.ts src/lib/data/workspaces.test.ts`; then the integration case `npm run test:foundation:integration -- -t 'timezone edit race'`. Expect configured reads/blocked mutation assertions to fail before implementation.
- [ ] **Step 3: Implement the repository, validation and common guard.** Use persisted configuration with request-local memoization only where safe; no process-wide mutable timezone. Lock workspace before guarded dated writes. Reject zone edits under the same exclusive lock after checking operational tables. Server writes remain authoritative even with a forged enabled timezone form.
- [ ] **Step 4: Verify green and auth independence.** Rerun Step 2. Add an auth regression where workspace lookup throws but existing session termination still deletes its auth cookie and attempts its current reconciliation path; no new workspace call from logout (Task 8 completes config type changes).
- [ ] **Step 5: Review permissions and lock order.** Record all touched dated writers and SQL race outcomes; no new SaaS administration or workspace deactivation UI.

### Task 3: One workspace-zoned business-time boundary

**Files:** Create `src/lib/business-time.ts`, `src/lib/business-time.test.ts`. Modify `src/lib/date-utils.ts`, `scheduling/periods.ts` comments/interfaces as necessary, relevant business-time consumers in `app/app/{page,availability/page,schedule/page,schedule/new/page,schedule/templates/page,exchange/page,exchange/swap/page,exchange/callout/page,exchange/actions,exchange/callout/actions,schedule/actions}.tsx/.ts` and `components/{manager-availability,manager-shift-requests,manager-dashboard,time-clock-widget}.tsx`, plus `package.json`/lockfile. Notifications and Clocker binding are Tasks 8/10.

**Interfaces:**
- `businessDate(now: Date, timeZone: string): string`, `businessTime(now: Date, timeZone: string): string`.
- `localDateTimeToInstant(local: string, timeZone: string): string` returns UTC ISO, using reject disambiguation/overflow; throws `InvalidBusinessLocalTimeError` for ambiguous/nonexistent/malformed inputs.
- `shiftBoundaryInstants(shift: ShiftPeriodInput, timeZone: string): { startAt: string; endAt: string }` normalizes overnight/24:00 business-date boundaries, then converts them unambiguously. It does not calculate scheduled hours from elapsed instants.
- `formatBusinessDateTimeInput(iso: string | undefined, timeZone: string): string`, `formatBusinessDateTime(iso: string, timeZone: string): string`.
- Keep `addDays`, `weekStartFor`, `weekDates`, `durationMinutes` and existing wall-minute workweek splitting signatures. No implicit business timezone argument defaults.

- [ ] **Step 1: Write date/time conversion assertions.** Examples: `businessDate(new Date('2026-10-04T01:30:00Z'), 'America/Puerto_Rico') === '2026-10-03'`; the same instant in `Asia/Tokyo` is `2026-10-04`. `'2026-10-03T09:00'` in New York becomes `'2026-10-03T13:00:00.000Z'`. Reject New York `'2026-03-08T02:30'` and `'2026-11-01T01:30'`. Assert round-trip input formatting, Monday boundary and nominal `durationMinutes('00:00','04:00') === 240` across a DST day.

  Representative test: `deadline conversion rejects DST ambiguity`.
  ```ts
  expect(() => localDateTimeToInstant('2026-11-01T01:30', 'America/New_York'))
    .toThrow(InvalidBusinessLocalTimeError);
  expect(localDateTimeToInstant('2026-10-03T09:00', 'America/New_York')).toBe('2026-10-03T13:00:00.000Z');
  ```
- [ ] **Step 2: Run red tests.** `npm test -- src/lib/business-time.test.ts src/lib/scheduling/scheduling-rules.test.ts`. Confirm failures are timezone behavior, not missing imports.
- [ ] **Step 3: Implement and bind the boundary.** After execution approval, install exactly `@js-temporal/polyfill@0.5.1`; use explicit imports without global patching. Load workspace on server pages/actions, pass zone to clients, replace fixed PR parsing/formatting. Reject unresolvable new assignment event boundaries; retain existing planned wall-hour calculations and unchanged worked-time persistence.
- [ ] **Step 4: Verify conversion and scheduling regressions.** Rerun Step 2, then `npm run typecheck`. Search runtime for PR helper calls/fixed offsets and assign remaining notification/Clocker occurrences to Tasks 8/10; customer fixtures and 0008 backfill may retain explicit PR data.
- [ ] **Step 5: Review timezone propagation.** Every business-local call receives server-configured timezone, including deadline submission; no browser/developer-local fallback.

### Task 4: Dynamic location repository and derived setup readiness

**Files:** Create `src/lib/data/locations.ts`, `src/lib/data/locations.test.ts`, `src/lib/scheduling/location-readiness.ts`, `src/lib/scheduling/location-readiness.test.ts`. Modify `data/employees.ts` location wrapper, `data/schedule-health.ts`, `foundation.integration.ts` and consumers of missing staffing.

**Interfaces:**
- `listLocations(options?: { includeInactive?: boolean }, executor?: SqlExecutor): Promise<Location[]>` (existing employees.ts export delegates for compatibility).
- `findActiveLocationByClockerKey(key: string, executor?: SqlExecutor): Promise<Location | null>`; missing/inactive returns null, DB failure throws unavailable.
- `createLocation(input: { name: string; shortName: string; clockerKey?: string; actorEmployeeId: string }, executor?: SqlExecutor): Promise<Location>`; stable generated key when omitted, no staffing/window/membership inserts.
- `updateLocation(input: { id: string; name: string; shortName: string; active: boolean; actorEmployeeId: string }, executor?: SqlExecutor): Promise<Location>`; no key field.
- `LocationReadiness { locationId; state: 'READY' | 'NEEDS_SETUP' | 'INACTIVE'; issues: { code; message; details? }[] }`.
- `evaluateLocationReadiness({ workspace, location, staffing, coverageWindows, positions, eligibleEmployees }): LocationReadiness`; staffing may be null. Stable setup codes: `STAFFING_NOT_CONFIGURED`, `COVERAGE_NOT_CONFIGURED`, `POSITION_REQUIREMENT_INVALID`, `NO_ELIGIBLE_EMPLOYEES`, plus inactive workspace/location.

- [ ] **Step 1: Write arbitrary-count/setup tests.** Parameterize 1/3/5/20 names. Assert new active location has no operational inserts and NEEDS_SETUP; inactive is INACTIVE. Blank staffing/Lead choice, no windows, inactive required position or no eligible staff produce their exact reason. Valid explicit setup yields READY without inventing missing weekday windows. Rename preserves a key; duplicate key/overlong name/forged inactive reference is rejected.

  Representative test: `new active location needs explicit setup`; newLocationCase contains the active fixture workspace/location, null staffing and empty windows/eligibility.
  ```ts
  const readiness = evaluateLocationReadiness(newLocationCase);
  expect(readiness.state).toBe('NEEDS_SETUP');
  expect(readiness.issues.map(issue => issue.code)).toContain('STAFFING_NOT_CONFIGURED');
  ```
- [ ] **Step 2: Run red behavior tests.** `npm test -- src/lib/data/locations.test.ts src/lib/scheduling/location-readiness.test.ts`; `npm run test:foundation:integration -- -t 'location identity'`.
- [ ] **Step 3: Implement repository/readiness mapping.** Owner authorization and stable identity are server-enforced. Existing active listing behavior remains; history/Owner readers opt into inactive records. Missing staffing is nullable structured setup data, not an exception or 2/6 fallback. Preserve configured legacy values.
- [ ] **Step 4: Verify green and histories.** Rerun Step 2 and existing scheduling-inputs tests; confirm deactivation retains schedules, memberships and keys. Missing configuration cannot yield a false fully configured health result.
- [ ] **Step 5: Review future-generator boundary.** Readiness is data returned for future Phase 4, with no generation call or stored readiness boolean.

### Task 5: Position catalog and employee qualifications

**Files:** Create `src/lib/data/positions.ts`, `src/lib/data/positions.test.ts`, `src/lib/scheduling/capabilities.ts`, `src/lib/scheduling/capabilities.test.ts`. Modify `data/employees.ts` qualification mapping/creation, `foundation.integration.ts`.

**Interfaces:**
- `listPositions(options?: { includeInactive?: boolean }, executor?: SqlExecutor): Promise<Position[]>`.
- `createPosition({ name, actorEmployeeId }, executor?)`, `updatePosition({ id, name, active, actorEmployeeId }, executor?)`: `Promise<Position>`; Owner-only.
- `replaceEmployeePositions({ employeeId, positionIds: readonly string[], actorEmployeeId }, executor?): Promise<void>`; current Manager/Owner employee-management permission, active configured IDs for new memberships, transactionally replace memberships. An existing inactive membership may be explicitly retained without granting active qualification; an inactive ID may not be newly assigned.
- `employeePositionMembershipStatements({ employeeId: string, positionIds: readonly string[] }): SqlStatement[]` builds replacement statements after authoritative validation/locks; Task 9 composes these with existing eligibility updates in one transaction rather than invoking two independently committing repositories.
- `employeeCanWorkPosition({ employeePositionIds, position }): boolean`; no role inference. Employee reads/creation expose the Task 1 `positionIds` field. Add no primary-position field.

- [ ] **Step 1: Write qualification/permission assertions.** Sam holds Barista and Cashier; membership reads return both. A LEAD with no qualifications cannot work Barista. A position named Lead grants no access role. Reject Employee self-assignment, Manager catalog creation, unknown/inactive position IDs and duplicate names; duplicate submitted membership IDs are safely deduplicated. Rename/deactivation preserve membership and historical FK references.

  Representative test: `access Lead is not a Barista qualification`; barista is the explicit active customer position.
  ```ts
  expect(employeeCanWorkPosition({ employeePositionIds: [], position: barista })).toBe(false);
  expect(employeeCanWorkPosition({ employeePositionIds: [barista.id, cashier.id], position: barista })).toBe(true);
  ```
- [ ] **Step 2: Run red tests.** `npm test -- src/lib/data/positions.test.ts src/lib/scheduling/capabilities.test.ts`; integration `npm run test:foundation:integration -- -t 'position membership'`.
- [ ] **Step 3: Implement catalog and membership writes.** Reuse existing transactions/auth boundaries, normalize plain-text names, validate current workspace and active catalogs under locks. Keep positionless legacy employee arrays empty; do not assign inferred Barista qualifications.
- [ ] **Step 4: Verify green and concurrent membership replacement.** Rerun Step 2; barrier-test concurrent replacements produce one complete membership set, no partial union. Existing access roles and location eligibility stay unchanged.
- [ ] **Step 5: Review scope.** No pay rates, primary/default position, Skills model or certification UI.

### Task 6: Shared assignment eligibility and position-aware coverage

**Files:** Modify `scheduling/validate-shift.ts`, `schedule-health.ts`, `publish-readiness.ts`, capability helpers, `data/schedules.ts` context reads and adapters using HealthEmployee. Add `scheduling/positions.test.ts`; extend existing `scheduling-rules.test.ts`, `schedule-health.test.ts`, `publish-readiness.test.ts` and `data/scheduling-inputs.test.ts`.

**Interfaces:**
- Extend ShiftCandidate/HealthShift with `positionId?: string`; ValidateShiftInput receives `workspace: Pick<Workspace, 'id' | 'active' | 'timeZone'>`, `location: Pick<Location, 'id' | 'workspaceId' | 'active'>`, employee `positionIds: readonly string[]` and optional assigned `position: Position` fact. Validate candidate time boundaries through Task 3; date/hour arithmetic remains nominal.
- `getShiftValidationContext({ employeeId, locationId, positionId?, date, weekStart, endDate? }): Promise<ShiftValidationContext | null>` maps these authoritative facts plus existing availability/leave/cross-location ledger/hour inputs. `ShiftValidationContext` is the existing context extended with workspace/location/position. Update every schedule/exchange adapter to pass its actual target location and optional shift position.
- Keep `validateShift` output (`eligible`, blockers/warnings/issues/projectedHours) and modes/policy semantics. Add `LOCATION_INACTIVE`, `POSITION_INELIGIBLE`, `POSITION_INACTIVE`, `POSITION_COVERAGE_GAP` to shared reason vocabulary.
- CoverageWindow/HealthCoverageWindow gain `positionRequirements: { positionId: string; quantity: number }[]` (empty for legacy). HealthEmployee receives active qualification IDs and eligible location IDs.
- CoverageBlock gains `positionCoverage: { positionId; positionName; assigned; required; missing }[]` and `positionsCovered`; `covered` combines existing staff/Lead and position coverage. Return location setup issues beside health, without inventing staffing.

- [ ] **Step 1: Write the quota matrix.** A Barista/Cashier-qualified Sam with Barista shift + designated Lead satisfies staff 1, Barista 1, Cashier 0, Lead yes. Positionless Sam satisfies staff/Lead, zero positions. Duplicate same-position shifts give one credit; conflicting simultaneous positions give zero position credit plus conflict. Inactive/unqualified employee/position does not satisfy a quota. Two locations cannot share credits; overlapping same-position windows use max, not sum. A quota sum above overall minimum remains independently enforced.

  Representative test: `assigned position and orthogonal Lead`; samBaristaLeadCase has one qualified designated-Lead Barista shift, staff minimum 1 and quotas Barista 1/Cashier 1 in one location/window.
  ```ts
  const block = calculateScheduleHealth(samBaristaLeadCase).coverageBlocks[0];
  expect(block.assignedStaff).toBe(1);
  expect(block.leadCovered).toBe(true);
  expect(block.positionCoverage.find(p => p.positionId === barista.id)?.assigned).toBe(1);
  expect(block.positionCoverage.find(p => p.positionId === cashier.id)?.missing).toBe(1);
  expect(block.covered).toBe(false);
  ```
- [ ] **Step 2: Run red domain assertions.** `npm test -- src/lib/scheduling/positions.test.ts src/lib/scheduling/schedule-health.test.ts src/lib/scheduling/scheduling-rules.test.ts`. Preserve existing normal/weekly availability, leave, overlap, same-day, target/max and overnight assertions.
- [ ] **Step 3: Extend the existing engine and adapters.** Reuse common active/location/position capability facts. Explicit active-location/position validation is a blocker; no required position means legacy positionless assignment remains valid. Do not choose/allocate employee positions automatically. Missing setup stays explicit; no new automatic scheduling/publication behavior.
- [ ] **Step 4: Verify shared and existing suites.** Rerun Step 2 plus `npm test -- src/lib/scheduling/publish-readiness.test.ts src/lib/scheduling/coverage-ranking.test.ts src/lib/data/scheduling-inputs.test.ts`. Assert exactly 40 valid, 41 blocked, target 24/projected 32 warning only and overlap at another configured location blocked.
- [ ] **Step 5: Review one-engine invariant.** Manual scheduling, existing swaps/coverage validation and future automation all consume these contracts; no React/server-action copy of position eligibility.

### Task 7: Preserve positions across shift workflows and atomic publication history

**Files:** Modify `data/schedules.ts`, `data/schedule-templates.ts`, `data/exchanges.ts`, `data/publication-revisions.ts`, `data/notification-transactions.ts`, `data/request-notifications.ts` interfaces as needed, `assistance/publication-diff.ts`, `assistance/acknowledgement-state.ts` comparison consumers, `scheduling/copy-week.ts` and schedule/exchange action adapters. Extend existing notification/history tests and `foundation.integration.ts`.

**Interfaces:**
- Add nullable/optional position ID to ScheduleShiftRow, ExchangeShift, TemplateShift, GuardedShift and PublishedShiftSnapshot; captured `positionName?: string` belongs to publication history.
- Existing `insertShift`/`updateShift` inputs accept optional `positionId`; absent means positionless, explicit clearing is distinguished from an omitted edit field.
- `POSITION_CHANGED` is a PublicationChangeType. Canonical change identity includes position ID, not current catalog label; snapshot capture retains the name at publication.
- Existing `commitPublishedWeekChange` transaction returns business result/revisions as before and includes current workspace/location/qualification guards. Extend adapters, not a second mutation/outbox framework.

- [ ] **Step 1: Write preservation and atomicity assertions.** Create/edit/clear/read, template-save/apply and copy preserve intended optional position. Swap/coverage preserves shift position and rejects incoming unqualified employee. Barista→Cashier published edit affects that employee and acknowledgement; rename alone/unchanged republish emits no duplicate. Force transaction rollback after mutation and assert no shift/revision/success-intent changes. A fake provider that never settles must never be called by a business mutation.

  Representative test: `position change is a personal publication change`; before/after are the same complete snapshot except position ID.
  ```ts
  expect(diffPublishedShifts([beforeBarista], [afterCashier])).toContainEqual(
    expect.objectContaining({ type: 'POSITION_CHANGED', affectedEmployeeIds: [sam.id] }),
  );
  expect(diffPublishedShifts([beforeBarista], [beforeBarista])).toEqual([]);
  ```
- [ ] **Step 2: Run red workflow tests.** `npm test -- src/lib/data/schedules-notifications.test.ts src/lib/data/exchanges-notifications.test.ts src/lib/data/notification-transactions.test.ts src/lib/scheduling/copy-week.test.ts`; integration `npm run test:foundation:integration -- -t 'position publication atomicity'`.
- [ ] **Step 3: Implement exact position propagation and guarded writes.** Add fields to SQL reads/writes, snapshot/canonical forms and all copying/reassignment adapters. Take workspace and current capability guards inside existing transaction ordering. Catalog/eligibility deactivation racing a save must force revalidation/rejection, not commit stale approval. Keep null/undefined canonicalization stable and historical names intact.
- [ ] **Step 4: Verify rollback and race behavior.** Rerun Step 2; add barrier cases for active-location removal and position membership removal racing assignment. Existing request-history restrictions and current manual approval behavior still pass.
- [ ] **Step 5: Review Phase 3 invariants.** No provider calls in or after the business request path; committed result does not wait for push; durable intent is still the reliability mechanism.

### Task 8: Workspace-aware notifications without changing delivery architecture

**Files:** Modify `notifications/{types,config,policy,recipients,reminders,worker,logout,subscription-service}.ts`, `data/{notification-state,notification-transactions,request-notifications}.ts`, `auth/session.ts` type bindings, internal dispatch/reminders route adapters, `scripts/fuel-notification-worker.ts`, current notification-open/config consumers and corresponding tests. Extend `foundation.integration.ts` and current `notifications.integration.ts`.

**Interfaces:**
- `PushRuntimeConfig = Omit<NotificationConfig, 'policy'>`; `readNotificationConfig(env): PushRuntimeConfig` remains synchronous/environment-only for auth, enrollment, setup and worker authorization.
- `notificationPolicyFor(timeZone: string): NotificationPolicy` preserves all existing numeric policy values; timeZone type becomes validated string.
- `bindWorkspaceNotificationConfig(runtime: PushRuntimeConfig, workspace: Workspace): NotificationConfig`; inactive workspace disables delivery. `loadWorkspaceNotificationConfig(env, executor?): Promise<NotificationConfig>` loads configured workspace only at business/delivery boundaries.
- `sqlNotificationStateRepository(executor?, workspace?): NotificationStateRepository` receives bound workspace facts; delivery dependency factory receives bound NotificationConfig. Existing commands, leases, retries, tags, ownership and source checks remain.
- Request-intent builders receive bound config explicitly (no hidden PR policy), and workspace version/active guards join their existing atomic batches.

- [ ] **Step 1: Write quiet-hour/access/auth tests.** PR `nextRoutineTime('2026-10-04T01:00Z')` becomes `2026-10-04T11:00Z`; New York pre-spring-forward `2026-03-08T03:00Z` becomes `2026-03-08T11:00Z`, pre-fall-back `2026-11-01T02:00Z` becomes `2026-11-01T12:00Z`. Tokyo `2026-10-03T14:00Z` becomes `2026-10-03T22:00Z`. Assert local-day budgets/cancellation use the configured zone, invalid legacy event boundaries suppress safely, inactive assignment locations/removed eligibility cancel delivery, and workspace failure does not prevent logout cookie termination/account-switch fencing.

  Representative test: `quiet hours cross a DST boundary in workspace time`.
  ```ts
  expect(nextRoutineTime(new Date('2026-03-08T03:00:00Z'), notificationPolicyFor('America/New_York')).toISOString())
    .toBe('2026-03-08T11:00:00.000Z');
  ```
- [ ] **Step 2: Run red notification assertions.** `npm test -- src/lib/notifications src/lib/data/notification-state.test.ts src/lib/data/requests-notifications.test.ts`; integration `npm run test:foundation:integration -- -t 'notification workspace policy'`.
- [ ] **Step 3: Bind workspace policy and remove fixed offsets.** Replace PR SQL literals with zone parameters and UTC−04 calculations with Task 3 helpers. Authenticate internal worker routes before workspace lookup. Revalidate current business/access/config facts before dispatch/retry. Do not add workspace IO to logout/enrollment configuration; keep deletion/reconciliation fail-closed. Missing workspace must prevent delivery rather than default to a zone.
- [ ] **Step 4: Verify existing Phase 3 reliability.** Rerun Step 2, `npm run test:notifications:qa`, and `npm run test:notifications:integration` on fresh owned databases. Keep concurrency/lease/backoff/expired cleanup/reminder cancellation/safe links/ownership assertions. Historical request participants retain history permissions; position qualification is not an authorization role.
- [ ] **Step 5: Review activation boundaries.** Outbound flags remain false by default; no new scheduler, event storage, delivery campaign or service-worker caching. Provider/device verification remains unperformed unless separately authorized.

### Task 9: Owner configuration and minimal operational input UI

**Files:** Modify `app/app/settings/page.tsx`, employee create/profile pages/actions and Scheduling Rules page/actions. Create `app/app/settings/{workspace,locations,positions}/page.tsx` and corresponding actions, `settings/locations/{new,[locationId]}/page.tsx`, small reusable form components where needed and affected-page tests. Add scoped `globals.css` rules only. Extend manual shift new/edit forms to accept the Task 7 optional position.

**Interfaces:**
- `saveWorkspaceProfileAction`, `createLocationAction`, `updateLocationAction`, `createPositionAction`, `updatePositionAction`: authenticated FormData adapters to Tasks 2/4/5; never trust workspace IDs from inputs.
- `saveEmployeeSchedulingProfileAction`: existing Manager/Owner boundary, delegates to `saveEmployeeSchedulingProfile({ employeeId: string, positionIds: readonly string[], eligibleLocationIds: readonly string[], actorEmployeeId: string }, executor?): Promise<void>` in `data/employees.ts`. Compose Task 5 membership statements with eligibility writes in one guarded transaction; validate active IDs for new memberships and allow explicit retention of already-held inactive references without granting new active qualification. Preserve the existing primary-location inclusion rule.
- Extend `createCoverageWindow(input)` in `data/schedule-health.ts` with `positionRequirements: { positionId: string; quantity: number }[]`; add `replaceCoverageWindowPositionRequirements({ windowId: string, requirements: readonly { positionId: string; quantity: number }[], actorEmployeeId: string }, executor?): Promise<void>`. Validate active IDs/positive integers and write window+quotas atomically. Clearing removes only the selected quota; catalog deactivation remains explicit setup warning.
- Missing staffing/Lead inputs render unconfigured choices, not automatic 2/6 or inherited Lead defaults. Optional shift position defaults to an explicit empty “No position” choice.

- [ ] **Step 1: Write UI/action behavior tests.** Settings links work; Owner sees workspace/locations/positions, Manager cannot mutate structure, Employee cannot forge assignment. New location shows Needs setup with clear next action; inactive labels/history are retained. Required name/timezone/staff/Lead/quantity validation preserves useful form input/error context. Workspace timezone field is locked with the specification's exact explanation after operational records exist. Sam's role and positions are separately labelled; optional shift selection is never auto-inferred.

  Representative browser test: `new location displays setup and preserved link`; repository/SQL tests separately verify persistence.
  ```ts
  await expect(page.getByText('Needs setup', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Scheduling Rules', exact: true }).first()).toBeVisible();
  ```
- [ ] **Step 2: Run red UI/action tests.** `npm test -- src/app/app/settings src/app/app/employees src/app/app/schedule/settings src/app/app/schedule/new`. Create focused `.test.tsx`/`.test.ts` files for new routes; do not use markup-only tests as proof of persistence.
- [ ] **Step 3: Implement the small forms and adapters.** Use existing PageHeader, panel/form/StatusPill/control families. Plain lists, compact forms and existing location selectors; no new dashboard/card system or giant enterprise table. Keep semantic colors, 44px peer actions, centered labels, 16px mobile inputs and safe-area padding. Catalog editing and employee eligibility are separate from authorization roles.
- [ ] **Step 4: Verify action paths and form states.** Rerun Step 2 and `npm run typecheck`; browser-click add/edit/deactivate, quota add/remove, failed validation and success in the local fictional fixture. Verify saved data through repository/disposable SQL tests rather than intercepted fixture actions alone.
- [ ] **Step 5: Review UI contract and permission scope.** No unrelated screen redesign or real business write; final cross-width evidence is Task 12.

### Task 10: Generic customer presentation and configured Clocker resolution

**Files:** Modify `lib/brand.ts`, `employee-display.ts`, `exchange-marketplace.ts`, `components/app-shell.tsx`, `employee-dashboard.tsx`, `manager-dashboard.tsx`, `app/{login,activate}/page.tsx`, `app/app/{layout,page,employees/page,my-time/page,schedule/settings/page}.tsx`, `lib/clocker-kiosk.ts`, `components/clocker-kiosk.tsx`, `app/clocker/[location]/page.tsx` and affected brand/Clocker tests. Remove runtime count/name transformations; retain explicit customer fixtures and technical compatibility names.

**Interfaces:**
- AppShell receives `workspaceName: string`; product BrandLockup remains unchanged. Public auth pages use `getPublicWorkspaceName()` and generic unavailable identity when null.
- Access-role label returns Owner/Manager/Lead/Employee. Actual position labels come from configured catalog; no Barista inference.
- Clocker page calls `findActiveLocationByClockerKey`, then passes `locationLabel` and required `timeZone` to ClockerKiosk. Formatting helpers accept explicit zone. Remove fixed two-entry lookup and two-route static params.

- [ ] **Step 1: Write generic identity/route assertions.** Northside name appears in customer context; Fuel remains when supplied by its fixture. No `brand.workspace` constant or software copy implies two Fuel sites. `main-office` resolves configured active location, rename preserves URL, inactive/unknown returns not-found and database failure remains unavailable. Fuel keys 2/110 resolve unchanged labels. Clocker has no PWA/subscription setup.

  Representative test: `configured Clocker key survives name edit`; rename the seeded location using updateLocation first.
  ```ts
  expect(await findActiveLocationByClockerKey('main-office', executor)).toMatchObject({ id: location.id, name: 'Renamed Office', clockerKey: 'main-office' });
  expect(await findActiveLocationByClockerKey('not-configured', executor)).toBeNull();
  ```
- [ ] **Step 2: Run red presentation tests.** `npm test -- src/app/brand-pages.test.tsx src/lib/clocker-kiosk.test.ts src/components/brand-lockup.test.tsx`; create `src/app/clocker/clocker-page.test.tsx` for route outcomes.
- [ ] **Step 3: Bind customer identity and dynamic route.** Remove workspace-specific brand metadata/copy; replace product-role assumptions with role/position data. Query configured location at request time. Preserve Clocker keypad, local clock/break/success behavior and NEVORA lockup geometry. No database punches or install prompts.
- [ ] **Step 4: Verify behavior and protected branding.** Rerun Step 2; exercise existing four-digit PIN, Clear/Delete and local break/punch demo in both tablet orientations. Confirm manifest/offline branding and `/app` service-worker scope/private-data exclusions are unchanged.
- [ ] **Step 5: Review remaining hardcode audit.** Classify every Fuel/loc-1/loc-2/2/110/PR occurrence as migration backfill, explicit customer fixture, technical compatibility identifier or eliminated runtime assumption. Record exceptions rather than blindly renaming data.

### Task 11: Migration equivalence and generic-customer database verification

**Scope adjustment approved by Jose:** Full production fresh-provisioning/schema-distribution tooling is deferred to the NEVORA Productization / SaaS-readiness phase. Keep the architecture in specification section 10; do not generate a distributable baseline/manifest, pg_dump provisioning workflow, production onboarding CLI/bootstrap or CI schema-distribution drift gate.

**Files:** Extend `src/test/integration/foundation.integration.ts`, `src/test/integration/local-postgres.ts`, generic fixture helpers and focused migration integrity tests. Document deferred requirements in `docs/architecture/nevora-workspace-foundation.md` (Task 12 finalizes documentation). No production provisioner is required.

**Interfaces:** Retain the owned test-database factory from Task 1. A separate run-owned generic database uses explicit fictional fixture setup. It must not overwrite the upgrade-preservation fixture or any pre-existing database. Generic fixture setup is test-only and is not a claim of production onboarding readiness.

- [ ] **Step 1: Verify Fuel upgrade/history preservation.** Populate fictional operational/history records on the exact 0001–0007 schema; capture Fuel customer/location IDs, names, 2/6 staffing, coverage/Lead rules, eligibility, schedules, shifts and request history. Apply 0008 and assert preservation, additive nullable position fields and no invented setup.
- [ ] **Step 2: Prove generic schema/runtime behavior.** In a separately created owned test database, explicitly insert an arbitrary non-Fuel workspace/name, non-Puerto-Rico IANA zone, one/three/five/twenty location cases with arbitrary names/stable keys, positions, memberships and quotas. Any removal of migration seed configuration is confined to that new fictional test database before operational fixture insertion and documented honestly. No production bootstrap tooling. New locations have no invented staffing/windows/eligibility.
- [ ] **Step 3: Run real repository and scheduling behavior.** Exercise generic configured reads, readiness, qualifications, position/Lead quota evaluation, timezone/workweek limits, dynamic Clocker lookup, shift/template/revision persistence and guarded notification behavior through actual SQL-backed repositories where relevant. Confirm runtime does not require Fuel identifiers or record counts.
- [ ] **Step 4: Verify history integrity and teardown.** Compare migration 0001–0007 hashes to exact approved parent; assert destructive deletion/referential outcomes remain protected. Reject existing/non-loopback targets and application `DATABASE_URL`. Confirm every created database is absent after this run's ownership-verified teardown.
- [ ] **Step 5: Run and review evidence.** Run `npm run test:foundation:integration` and relevant notification integration tests with test-only credentials. Record commands/counts and boundaries. Do not claim live Neon behavior or production new-customer provisioning has been tested.
- [ ] **Step 6: Document deferred Productization work.** Preserve schema generation, baseline/manifest maintenance, pg_dump workflow, provisioning CLI/bootstrap and CI distribution drift gate as future work required before onboarding unrelated real customers. No migration activation, backup/downgrade operation, paid service or customer modification.

### Task 12: Full regression, responsive evidence, documentation and final commit

**Files:** Create `scripts/verify-nevora-foundation.mjs` and its configuration/guard tests, `docs/architecture/nevora-workspace-foundation.md`, `docs/ui/2026-10-03-nevora-foundation-review.md`. Update README, `docs/ui/fuel-ui-contract.md`, `docs/architecture/fuel-scheduling-rules.md`, `fuel-automation-charter.md`, `fuel-phase-3-activation.md` and execution evidence. Store PNGs/audit JSON/gallery outside source directories; report absolute artifact paths.

**Interfaces:** The verifier uses actual source components and both explicit customer fixtures at local-only origins. Separate fixture actions from SQL persistence evidence. Baseline captures resolve the exact parent source; reports link before/after screenshots, viewport/engine/state and actionable failures. No private/customer data in artifacts.

- [ ] **Step 1: Capture/check the protected baseline before product edits.** Execution preflight runs this step before Task 1 changes product files: locate dependencies without modifying other worktrees; render exact-parent components/styles using a read-only exported baseline and capture the NEVORA approved screens. Retain immutable before images. Baseline identity is the exact parent, not an older Fuel-branded comparison.
- [ ] **Step 2: Run full verification after Tasks 1–11.** With application DB/provider credentials unset and outbound flags false: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:notifications:qa`, `npm run test:foundation:integration`, `npm run test:notifications:integration`, `npm run build`, `git diff --check`. Record actual exit codes, suite/counts and SQL teardown; prerequisites missing are unperformed/blocking checks, not passes. Restore only task-owned generated build deltas if appropriate.
- [ ] **Step 3: Execute responsive/state browser QA.** Chromium and WebKit at 320/375/390/430/768/1024/1440: Owner Settings/Workspace/Locations/Add/Edit/Positions/employee assignments/Rules; Manager Schedule/Rules/selectors; affected Employee/Lead Home/Schedule/Availability/Time Off/Shift Requests/My Time; Login/Activate and Phase 3 install/device setup. Use one/3+/20-location and long/inactive/missing-setup cases. Check bounds/text ranges, peer size/centering, contrast in normal/hover/pressed/focus, loading/disabled/error/empty/success, keyboard and bottom-nav/safe-area clearance. Fuel and generic Clocker get 1024×768 and 768×1024, including its existing demo transitions.

  Representative browser assertion: `Owner location form fits 320px`; measure visible controls as well as page scroll bounds.
  ```ts
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  // For each peer action, assert bounding height >= 44 and measured label center matches its control center within 1 CSS px.
  ```
- [ ] **Step 4: Inspect protected comparisons and service-worker boundary.** Explain each intentional data/input difference; unchanged protected layouts must compare unchanged. Do not mask away broad diffs or accept screenshot updates automatically. Verify `/app/` scope, unchanged public-only caching and no Clocker setup/push behavior. Report actual local service-worker tests separately from physical iPhone/Android/provider delivery, which remain unauthorized/unperformed.
- [ ] **Step 5: Fix attributable defects and rerun affected checks.** Fresh review examines schema/history preservation, timezone/ownership, quota/race behavior and UI. Fix within approved scope; a new business decision, material architecture change, migration/deployment/cost requirement stops for Jose. Do not weaken assertions, discard work or start automation to get green.
- [ ] **Step 6: Write final architecture and evidence handoff.** Map source changes/reused components, prepared 0008 and deferred production provisioning, Fuel and generic results, complete commands/results, remaining limitations, deferred Skills and activation prerequisites. Confirm Phase 4 must consume configured workspace/active READY locations/eligibility/positions/quotas and the same rules engine.
- [ ] **Step 7: Create the single implementation commit after all required checks/reviews pass.** Review exact `git diff --stat` and manifest; stage only foundation files, never `.env`, credentials or artifact dumps. Commit `feat: generalize Nevora workspace and scheduling foundation`; do not amend previous or planning commits. Verify `git status --short` is clean and record full SHA. No push/merge/deploy.
- [ ] **Step 8: Stop for foundation review.** Return exact parent and final SHA, branch/worktree, file manifest, model/migration summaries and deferred Productization requirements, screenshots/gallery/local fixture URL, tests and their honest boundaries, compatibility risks, Fuel/generic confirmation and remaining activation requirements. Do not start Phase 4.

## Specification coverage map

| Spec sections / requirement | Owning tasks |
| --- | --- |
| 1–2 identity, boundaries, existing contracts | Global constraints; Tasks 1, 10, 12 |
| 3 additive persistence and historical Fuel | Tasks 1, 7, 11 |
| 4 auth, active records, membership, race safety | Tasks 2, 4, 5, 7, 8, 9 |
| 5 timezone/workweek/UTC/nominal hours | Tasks 2, 3, 8, 10 |
| 6 derived Needs setup and no defaults | Tasks 4, 6, 9, 11 |
| 7 qualification, quota counting, orthogonal Lead | Tasks 5, 6, 7, 9 |
| 8 publication atomicity and Phase 3 privacy/reliability | Tasks 7, 8, 12 |
| 9 approved small UI, generic labels, Clocker | Tasks 9, 10, 12 |
| 10 additive upgrade and generic SQL proof; production provisioning deferred | Tasks 1, 11, 12 |
| 11 dual fixtures, matrix, protected QA | Tasks 1–12; final gate Task 12 |
| 12 docs, one local implementation commit and stop | Task 12 |

## Execution approval and checkpoint

Jose approved Subagent-driven execution with fresh implementer/spec/quality reviews, one final local implementation commit and the narrowed Task 11 above. Tasks 1–10 remain approved in full, Task 12 remains the complete regression/UI/documentation/commit gate. Continue automatically without normal-task approval prompts. No Phase 4, push, merge, deploy, applied customer migration, real push/device activation or paid infrastructure.
