# NEVORA automatic weekly schedule builder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. Jose explicitly authorizes continuing from this spec/plan into implementation under request sections 39–41; do not insert routine approval pauses.

**Goal:** Owner/Manager-triggered, explainable weekly draft generation and additive gap filling without violating shared hard rules or overwriting protected work.

**Architecture:** Pure bounded deterministic TypeScript planning over the existing shared eligibility/health engine. One authoritative input snapshot is solved outside the transaction; an explicit draft-only service reuses existing workspace/week guard primitives, validates the complete source and atomically writes draft changes. Minimal persisted shift provenance and semantic scheduling-slot reservations protect Manager work.

**Tech Stack:** Existing Next 16.3.6, React 19.3.0, TypeScript 5.9, Vitest 5.0.2, Temporal 0.5.1, Neon 1.1.0 and owned local PostgreSQL 17 tests. No new solver/service dependency.

**Spec:** `docs/superpowers/specs/2026-10-04-nevora-phase-4-auto-scheduler-design.md`.

## Approved generated-deletion policy

Jose approved week-specific scheduling-slot exclusions: generated deletion + tombstone are atomic, Build/Fill cannot restore an equivalent slot with another employee or changed period, excluded capacity never counts as coverage, explicit Allow auto-fill clears it, materially new requirements do not inherit it. No MANAGER/historical/protected deletion inference. Implement the bounded semantic-claim contract in the specification; no business answer remains pending.

## Global Constraints

- Exact parent `b4c1675a6b1de1db6e28cbe732a7294ddfc13885`; branch `codex/nevora-phase-4-auto-scheduler`; only its isolated worktree may receive product changes.
- One shared `validateShift` / schedule-health engine; AUTOMATIC mode and complete cross-location affected-workweek ledger. Monday–Sunday in persisted `workspace.timeZone`; no static Fuel or machine-zone fallback.
- Active READY locations only. All scope reports exclusions; selected unready fails. Any attempted PUBLISHED/ARCHIVED target rejects the whole operation. DRAFT only; no publication or draft notification intent/provider call.
- Access roles separate from position qualifications; one position per shift; max-not-sum independent quotas; Lead orthogonal; maximum hours hard and exact maximum valid; targets warnings/preferences only.
- Preserve Manager/manual/template/copied/history-referenced rows. Manual edit promotes GENERATED to MANAGER. Build replaces only unprotected generated rows in scope; Fill Gaps never rewrites any existing assignment.
- Generated DRAFT deletion atomically reserves its semantic need/capacity; both modes read and final-guard exclusions. Keep actual coverage incomplete, report Manager excluded and expose explicit Allow auto-fill. Week-specific, no employee-only ban or automatic clearing.
- `shifts.assignment_origin`: `MANAGER` / `GENERATED`, default MANAGER; additive prepared 0009. Historical 0001–0008 unchanged. Disposable owned PostgreSQL only; no application DATABASE_URL.
- Deterministic node/evaluator budgets, not wall-clock stopping; same semantic inputs/week/limits same result. No permanent ID/name preference, no Math.random.
- Solve outside final transaction; full-source fresh assertion and insert/phantom-safe locks. At most three complete recomputations on named conflicts/serialization/deadlock. Never overwrite concurrent Manager edits.
- Preserve approved NEVORA raw-CSS geometry/BrandLockup; seven widths `320,375,390,430,768,1024,1440`; Chromium/WebKit; Clocker `1024x768,768x1024` protected.
- No push/merge/deploy, live DB migration, paid service/upgrade, real push/device activation, customer publication/data change, cron, production provisioning or Phase 5.
- ONE final local implementation commit after all gates; no implementer commits. External byte/hash checkpoints replace per-task commits. Planning docs may precede the implementation commit.

## Review Focus

1. Published schedules mixed with drafts in All Locations: Task 4/6 proves atomic rejection, no silent partial generation.
2. Overnight carry-in and wrongly owned schedule weeks: Task 3/4 proves business-date ledger and every affected hour cap.
3. Absent membership/settings/availability rows inserted during solving: Task 4/6 proves insert-safe source guarding, not timestamp-only equality.
4. Generated rows later referenced by exchanges/callouts/history: Task 1/4/6 proves preserved IDs/reference/history, no cascading cleanup.
5. Budget exhaustion / zero targets / native long-name UI: Task 3 distinguishes search-limited from infeasible; Task 5/7 proves readable current controls and truthful warnings.

## Shared interface map

- `AssignmentOrigin = 'MANAGER' | 'GENERATED'` on domain/read models; omitted legacy fixture values normalize to MANAGER. Generated assignments persist bounded versioned `generated_claims`; semantic deleted-capacity reservations live in `schedule_generation_exclusions`. Publication equality excludes both internal metadata fields. Task1 exports the validated claim/exclusion types consumed by Tasks2–5.
- `generation/types.ts`: `GenerationMode = 'BUILD_WEEK' | 'FILL_GAPS_ONLY'`; `GenerationInput` contains workspace, weekStart, locationScope, configured catalogs/settings/windows, employee availability/profile/settings and dated ledger with status/origin/reference protection. `GenerationPlan` contains additions, replaceableShiftIds, finalHealth, gaps/exclusions/warnings, summary and metrics.
- `generation/demand.ts`: `buildGenerationDemands(input: GenerationInput, shifts: readonly HealthShift[]): GenerationDemand[]`; derives needs from existing health. `generation/periods.ts`: `enumerateGenerationPeriods(input: GenerationInput, currentLedger?: readonly HealthShift[]): GenerationPeriod[]`; configured contiguous coverage/input boundaries plus current-ledger hard-cap endpoints. `generation/needs.ts` derives canonical family runs; `generation/reservations.ts` allocates unreserved demand claims and validates whole addition sets.
- `generation/planner.ts`: `planWeek(input: GenerationInput, limits?: Partial<PlannerLimits>): GenerationPlan`; defaults nodes 20,000, shared-evaluator calls 200,000; pure and immutable. `generation/fairness.ts` defines deterministic confirmed/target/remaining/hours/week comparator.
- `data/schedule-generation.ts`: `readGenerationSnapshot(request: GenerationRequest, executor?: SqlExecutor): Promise<GenerationSnapshot>`; `generateWeekDraft(request: GenerationRequest, executor?: SqlExecutor): Promise<GenerationResult>`. Request = session actorEmployeeId, weekStart, mode, locationScope. Snapshot includes normalized `input` plus canonical raw source for final equality.
- `generation-actions.ts`: `generateWeekAction(previous: GenerationActionState, formData: FormData): Promise<GenerationActionState>`; trusted session actor, whitelisted mode/scope/week; typed human result/error. `ScheduleGenerationControls` uses this state within existing Manager Schedule.

### Task 1: Additive provenance and protected lifecycle

**Files:** Create `db/migrations/0009_schedule_generation.sql`, `src/lib/scheduling/generation-provenance.ts`, its `.test.ts`, `src/lib/scheduling/generation-claims.ts` and tests, `src/lib/data/generation-exclusions.ts` and tests, `src/test/integration/generation-provenance.integration.ts`, `vitest.generation-integration.config.mts`. Modify `domain.ts`, `data/schedules.ts`, `data/notification-transactions.ts`, `data/exchanges.ts`, test factories/config and focused existing tests. No UI changes.
**Interfaces:** Produce AssignmentOrigin/default normalization and `isProtectedAssignment(shift)` using origin plus reference-history facts; validated bounded semantic claims/exclusion types; `deleteGeneratedDraftShift` and `clearGenerationExclusion` using a dedicated draft-only atomic path and compatible first-workspace guard. Task2/3 derive production claims later; Task1 tests use explicit fictional claims. Current-runtime SQL fixtures apply 0009; historical upgrade assertions remain.

- [x] Write tests: legacy/manual/template/copied default MANAGER; manually edited GENERATED becomes MANAGER with claims removed/ignored; provenance-only edit produces no publication diff/intents; exchange/callout/publication-history referenced GENERATED protected; invalid origin/claims rejected. Generated DRAFT delete inserts one semantic exclusion and removes the row in the SAME batch; late failure rolls both back; duplicate/absent deletion cannot duplicate tombstones. Manual/historical/protected paths produce no exclusion. Clear requires current active Owner/Manager, guarded workspace/week/DRAFT and explicit event identity; repeated clearing is idempotent, does not generate/publish. Neighboring legacy PUBLISHED schedule/history remains untouched. Assert original row/history columns unchanged through canonical 0001–0008 then 0009.
- [x] Run focused unit + new owned SQL tests before implementation; retain genuine missing-column/lifecycle RED and passing old controls separately.
- [x] Add constrained default provenance column, bounded versioned nullable generated-claims metadata and ONE semantic exclusion table with independent event identity, workspace/week/location/civil period/optional position, claims, actor/created and cleared lifecycle. Optional deleted-source ID is non-FK audit evidence, never matcher or permanently unique: delete→clear→regenerate same deterministic ID→delete must create a new active exclusion; current-row/source atomicity prevents duplicate events. No employee-only exclusion, cascade-to-deleted-row dependency, replacement tables or triggers. Extend actual select/write models; manual update/exchange mutation promotes control. Keep metadata out of published canonical equality/after-write canonicalizer, but in generation-source equality. Generated delete/clear bypass publication helper entirely; normal paths preserve existing behavior.
- [x] Extend owned factory with explicit current-runtime 0009 mode and generation prefix, preserve refusal/teardown semantics and 0008-only historical assertions. Set up one ownership-verified loopback PostgreSQL runtime with existing local binary; never reuse another execution's data directory/server.
- [x] Focused GREEN, typecheck and affected notification/foundation SQL controls; document exact counts, before/after fixture boundaries and remaining limitations. Controller snapshots then independent spec/quality gate; no commit.

### Task 2: Required coverage, candidate periods and structured contracts

**Files:** Create `src/lib/scheduling/generation/{types,demand,periods,explanations,needs,reservations}.ts`, corresponding focused tests and `src/test/fixtures/automatic-week.ts`; use Task1 semantic reservation primitives. If hard-cap endpoint enumeration needs the configured-ceiling arithmetic, narrowly export/factor that existing helper from `validate-shift.ts` and use it there and in enumeration; no parallel policy/default.
**Interfaces:** Consume shared health/readiness/availability/period helpers and Task1 provenance/claims; produce GenerationInput/Demand/Period/Plan plus canonical configured-need runs, bounded claim allocation and capacity-reservation matching for Tasks3–5. Matcher supplies only automatic demand permission, never duplicates employee eligibility.

- [x] Write RED assertions: staffing 2 with quotas Barista2/Cashier1 needs three distinct assigned people; overlapping windows use maxima; Lead is independent; absent setup is reported; contiguous windows coalesce without bridging closed time; partial availability/fixed/approved-leave boundaries are retained; hard-cap-derived 4/4 and 3.5/4.5-hour splits require no guessed grid; overnight/24:00 representations valid; unconfigured-day legacy shifts create no demand/denominator; no synthetic Fuel settings. Semantic reservations remove only equivalent automatic capacity, not real coverage; matching tolerates cosmetic renaming and ignores materially changed needs.
- [x] Run `npm test -- src/lib/scheduling/generation/demand.test.ts src/lib/scheduling/generation/periods.test.ts src/lib/scheduling/generation/explanations.test.ts`; failures must exercise missing behavior, not fixtures.
- [x] Implement pure demand derivation by adapting `calculateScheduleHealth`, not copying coverage rules. Enumerate bounded configured/open periods, leave endpoints and CURRENT-state hard-cap endpoints with affected-workweek splitting; implement structured distinct-employee rejection aggregates, duration-weighted coverage and unavailable denominator semantics. Define partial-incumbent score rewarding fulfilled staffing/position/Lead obligations even when complete-minute percentage remains zero.
- [x] GREEN plus existing positions/availability/health tests; fixture matrices 1/3/5/20 locations and Fuel regression inputs. Record interface names exactly; snapshot and task gate, no commit.

### Task 3: Deterministic whole-week planner and fairness

**Files:** Create `generation/{planner,fairness,search}.ts`, focused `.test.ts` and extend automatic-week fixtures. Split by responsibility; do not add a solver.
**Interfaces:** Implement `planWeek` and PlannerLimits/metrics from Task 2. Every added/merged/repaired candidate uses shared AUTOMATIC validation against its complete current ledger.

- [x] Write RED matrix: full feasible week complete; impossible remains legal with real gaps; specialist/flexible Cashier counterexample; scarce Lead/location/late-week capacity counterexamples; all required hard rules; 40 valid/41 blocked; target24/max40/projected32 not blocked; confirmed preferred with unconfirmed warning fallback; one position counts once; quotas exceed staffing; max-not-sum; one same-day shift; preserve fixed/manual; Build replacement only scoped generated; Fill additive; repeated semantic output; reversed input arrays identical; changing-week exact ties rotate; zero/undefined targets safe; overnight/DST/New York and carry-in caps correct.
- [x] Run `npm test -- src/lib/scheduling/generation/planner.test.ts src/lib/scheduling/generation/fairness.test.ts`; capture RED before planner body.
- [x] Implement iterative scarcity-first bounded search/backtracking, best-valid incumbent, employee-ledger keyed evaluator cache and bounded improvements. Refresh hard-cap periods against each state's complete ledger; rank satisfied demand progress before full coverage and fairness, so two legal workers toward three required beat zero. Prefer ordinary full contiguous shifts over unnecessary fragments. Apply slot reservations to both modes; no split/merge/superset or other-employee escape. Explain budget exhaustion separately from hard infeasibility. Never alter fixed work to merge.
- [x] GREEN full matrix and deterministic approximately 50-employee/7-day/multiple-position/location/Lead/leave/target fixtures, plus 20-location catalog. Record actual runtime and counters; assert budgets/result repeatability, not tiny millisecond thresholds. Independent high-risk logic review; no commit.

### Task 4: Authoritative snapshot and atomic guarded draft service

**Files:** Create `src/lib/data/schedule-generation{,-snapshot}.ts`, focused `.test.ts`, `src/test/integration/schedule-generation.integration.ts`; reuse exported existing guard primitives with a draft-only atomic path, plus integration config/package script. Do not route generation through the publication mutation helper.
**Interfaces:** `readGenerationSnapshot` / `generateWeekDraft` from map, using Task 3 plan and shared `SqlExecutor`. Output GenerationResult contains actual committed summary and safe diagnostics, never raw source.

- [x] Write RED actual PostgreSQL cases: empty draft creation, manual preservation, generated replacement/no-op, Fill no-rewrite/no-op, single-location cross-location maximum/conflict, published/archived mixed All atomic rejection, source changed during solving, late-write rollback, duplicate/concurrent generation, forged/inactive/nonmanager actor, no draft publication/revision/intent.
- [x] Run focused units + `npm run test:generation:integration`; retain exact preimplementation assertion failures with owned SQL execution.
- [x] Read complete source INCLUDING exclusions in one statement with stable ordering/exact timestamp text; map existing availability inputs, use business-date prior-Sunday/next-week ledger. Solve outside transaction. Final batch FIRST locks workspace singleton FOR NO KEY UPDATE (no prior SHARE upgrade), then sorted week locks and deterministic parent-before-child input-table guards, then FRESH full-source equality. Cooperative writers drain before conflicting locks; protect uncooperative insert/absence facts and actual after-state. No provider call/long solving transaction. Verified no-ops still run final actor/source/DRAFT guards and never bump timestamps.
- [x] Build minimal canonical diff with deterministic generated IDs and protected reference rows; draft statuses guarded; no cascade/delete of request/history. Only changed scoped DRAFT schedules get timestamps. Bypass publication revision/intent logic unconditionally; prove a neighboring legacy PUBLISHED schedule with zero revisions remains byte-identical. One retry owner, at most three NEW snapshot/solve attempts on named conflicts/serialization/deadlock; count invocations and never reuse stale closures. Preserve unrelated published state and guard lock ordering under actual contention, including existing profile writers paused after employee row acquisition and business-date shifts owned by another week.
- [x] GREEN including both significant race orders, actual `pg_blocking_pids` barriers and rollback proof; focused existing publication/notification/foundation tests. Independent high-risk transaction review; no commit.

### Task 5: Authorized Manager actions and restrained Schedule controls

**Files:** Create `src/app/app/schedule/generation-actions.ts`, its tests, `src/components/schedule-generation-controls.tsx`, focused UI tests; modify only Manager branch of Schedule page and scoped `globals.css` selectors as needed.
**Interfaces:** Consume committed GenerationResult/typed errors from Task 4; expose `generateWeekAction` / GenerationActionState and peer controls from map. Existing explicit publish/editor/deadline/selector routes remain.

- [x] Write RED action/behavior tests: Owner/Manager allowed, Employee/Lead/forged IDs rejected server-side, valid Monday/scope/mode required, complete/partial/impossible/excluded messages use actual results, stale snapshot message, pending/error/no-op semantics, no publish/provider call. Assert no snapshot/private reason reaches browser state and existing employee branch unchanged.
- [x] Focused test RED before production action/component code.
- [x] Add Build Week / Fill Gaps Only peers near current week/scope/health. Show calculated concise summary and human gaps/exclusions/warnings through restrained disclosure. Show assigned operational position in the existing Manager feed with a restrained label, using actual catalog/captured published identity; do not invent positions for legacy positionless rows or change the Employee branch. On an active exclusion show subtle Manager excluded / Automatic fill off with explicit Allow auto-fill action, derived actor and guarded DRAFT/week/scope; clearing alone never generates or publishes. Retain all existing editor/More/publish functionality. Optional Manager-only generated indication stays subtle. Use current submit focus/loading treatment, raw CSS, 44px centered controls and existing NEVORA tokens.
- [x] GREEN action/component tests and initial focused mobile/desktop behavior inspection. Do not bless new baseline or broaden employee/kiosk changes. Snapshot and task review; no commit.

### Task 6: Cross-layer races, history, generic and Phase 3 regression gate

**Files:** Extend generation integration tests and focused test fixtures; current foundation/notification integration adapters where schema activation requires it; no unrelated production refactor.
**Interfaces:** Exercise actual actions/shared planner/repository/SQL from Tasks 1–5. Test setup may insert only fictional owned data; domain decisions stay in production shared engine.

- [x] Verify canonical 0001→8→9 history preservation, generated/manual/reference rows and original Fuel names/route keys/staffing2/6/Lead/eligibility/history. Explicit non-Fuel New York fixture with1/3/5/20 locations; no invented settings/eligibility; scheduling based on database facts.
- [x] Exercise actual generation races with manual create/edit, GENERATED deletion + new exclusion, explicit clearing, employee/location deactivation, readiness, availability submit, approved leave, membership removal, position deactivation, coverage change, maximum change, another Build and Fill; assert latest-state recompute or whole-operation rejection, no stale successful writes. Add missing-row/insert races and inverse orders where significant. In deletion-during-solve, neither retry nor final write may recreate excluded capacity. Material time/location/position changes and future-week generation must not inherit an unrelated exclusion.
- [x] Verify postgeneration explicit publication emits through existing atomic intent path; draft generation creates no intents; provenance-only promotion not a meaningful published diff; historical acknowledgements/recipient access unchanged. Logout, worker public-cache and Clocker remain unaffected.
- [x] Retain meaningful pre-fix RED for defects discovered by this verification; existing passing controls need no manufactured failure. GREEN SQL/unit subset and verified ownership teardown. Independent cross-layer spec/quality gate; no commit.

### Task 7: Final responsive/protected QA, documentation and complete verification

**Files:** Add focused local-only verification runner/checks where reusable; docs `architecture/nevora-auto-scheduler.md`, `ui/2026-10-04-nevora-phase-4-review.md`; update README/activation notes minimally. External fixture/screenshots/evidence only; no generated customer schema/provisioner.
**Interfaces:** Actual source components at immutable parent/current with frozen fictional inputs, actual generation planner outputs and intercepted browser actions clearly separated from real owned SQL evidence.

- [x] Capture/reconcile immutable exact-parent pre-edit fixture source and baseline images; inspect current affected Manager scheduling matrix in Chromium/WebKit at all seven widths. Cases: empty/full/partial/impossible/loading/error, long names,1/3/20-location catalogs, positions/Lead/gaps, All/single. Measure target/text bounds, 44px peers, centering/focus/hover/pressed/keyboard, safe areas and final-scroll clearance. Preserve failed evidence; no masks or image approvals.
- [x] Protected comparisons: Employee/Lead Home/Schedule/Availability/TimeOff/ShiftRequests/MyTime, Manager nonaffected approved views, Login/Activate/configuration/setup, and both Clocker orientations. Native worker/scope/public-cache/logout checks remain separately labeled; real device/provider tests unauthorized.
- [x] Run one applicable complete gate: lint, typecheck, full units/planner/scheduling regressions, foundation/generation/notification owned SQL, QA guards, build, diff check. Rerun only checks justified by resulting fixes/source changes; never suppress assertions, update baselines or fabricate live acceptance.
- [x] Record exact commands/counts/performance/generations/source hashes, intentional UI changes, inherited findings, test boundaries and activation limits in docs/evidence. Independent task gate, then fresh most-capable whole-branch review. Fix attributable Critical/Important within scope with genuine reproduction and covering checks.
- [x] Controller verifies exact changed-file hashes and unchanged migrations1–8, creates the single local implementation commit `feat: add automatic weekly schedule builder`, confirms clean worktree, owned PostgreSQL teardown, archives ledger/reviews/checkpoints/screenshots, and STOP FOR REVIEW. No push/merge/deploy/live activation or Phase5.

## Controller self-review / execution notes

All request sections map to Tasks1–7: provenance1; coverage/contracts2; hard/fair/scarce/deterministic/scale3; snapshot/draft/idempotency/concurrency4; management UI5; migration/generic/Fuel/race/Phase3 integration6; complete UI/regression/handoff7. Five Review Focus items have owning test steps. Public equality must explicitly omit assignment origin while generation source must include it. Test-factory current runtime requires9 without rewriting canonical1–8 proofs. Table locks are confined to final guard/write; actual deadlock/phantom tests govern technical placement. Per-task external before/after packages cover uncommitted new files, not empty HEAD diffs. Spec requirements are authoritative; task-specific rulings/costs recorded in ledger and carried to affected implementers/reviewers.

### Approved fairness qualifier clarification

Original request section9 step6 compares target-completion ratios only among employees below positive configured targets. After below-target preference, employees at/above target and absent/zero targets proceed through zero unmet target and actual scheduled weekly hours, then deterministic week tie. Missing targets must not receive an invented value or universal lower priority than already-met targets. This is a clarification of the approved ordering, not a new scheduling rule.

### Owning-week preservation clarification

Build Week replaces eligible generated assignments only when their owning schedule is a scoped DRAFT for the requested week. A business-dated assignment owned by another week remains fixed even if its date falls inside the requested week; it still contributes to coverage, overlap, same-day and affected-workweek hours. Missing owning-schedule identity cannot grant replacement permission. The snapshot retains these facts and the draft writer cannot rewrite their parent.
