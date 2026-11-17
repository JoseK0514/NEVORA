# Rondo weekly manager implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An Owner compares a joint weekly allocation, reads its complete exact
changes, approves or declines, and recovers/verifies the original atomic save.

**Architecture:** Reuse the canonical cooperative week engine and complete source
snapshot. Store immutable bounded alternatives privately, then use a solver-free
guarded exact-set writer with atomic receipts. New default-off Owner API and a
read-only model tool consume the same service; Claude implements all screens.

**Tech Stack:** Existing TypeScript, Next16.4.2 route handlers, PostgreSQL/SqlExecutor,
Vitest5.0.5 and existing owned-PostgreSQL/browser harnesses. No new dependencies.

**Spec:** docs/superpowers/specs/2026-11-16-rondo-weekly-manager-design.md, approved
by Jose through the design question in this chat on November16. Execution remains
native/root in the existing isolated detached worktree, as in the preceding work.

## Global constraints

- Codex backend/schema/contracts; Claude UI. No shared-source push/deploy or paid call.
- Preserve day API/12 additions and the full canonical source, including adjacent work.
- Source caps80employees/20locations/80positions/2500shifts/200windows/400requirements,
  5000other-array rows/16000overall/2MB raw source; decline whole oversized input.
- Search128nodes/4000evaluations/1024periods,84additions/84removals;8s total/3.5s option,
  cooperative ~4ms checkpoint,20s comparison deadline; max2 distinct alternatives.
-128KiB exact alternative,12KiB model projection,16KiB streamed strict UTF-8 request.
- Five-minute review or earlier context expiry;20live/200unsaved/1000saved per Owner.
- BUILD_WEEK regressions per fulfilled obligation and removal-only results inspect-only.
- Apply requires full-review readReceiptId, termsDigest and acknowledged:true; no solver.
- Workspace write lock first, sorted weeks/table locks, exact source/context/Owner guard.
- Saved receipt/business rows atomic; no publication, notification or external action.
- Proposed0066 must remain unreserved; append after0065 then0064, regenerate manifests.

## Review focus

- A search deadline during BUILD_WEEK cannot erase previously fulfilled obligations
  or make a removal-only partial result actionable (Task1 tests).
- A full-read response lost before reaching the browser does not enable approval
  in a summary-only client; repeated full reads return the same bound handle (Task4).
- Owner context/knowledge changes and lock waits must not leak stale details or
  revive an approved proposal; historical minimal receipt recovery stays honest (Task4).
- Trigger-suppressed/altered child or receipt writes cannot commit success, and
  identical terms with new assignment episodes count as changed (Task3/4).
- Huge names/UTF-8/diagnostics and excluded locations cannot silently cut the exact
  set or imply complete scope, nor block an unrelated request (Task1/5).

---

### Task 1: Strict wire contract and bounded joint comparison

**Files:** Create src/lib/owner-advisor/weekly-contracts.ts, weekly-contracts.test.ts,
weekly-plan.server.ts, weekly-plan.test.ts. Reuse fixtures/automatic-week and canonical
planner; keep source-compatibility helpers shared only when duplication warrants it.

**Interfaces:** parseWeeklyCommand(value:unknown):WeeklyCommand;
parseWeeklyScope(value:unknown):WeeklyScope;
compareWeeklyPlans(input:GenerationInput,metadata:WeeklyMetadata,signal:AbortSignal):
Promise<WeeklyComparisonDraft>. Client-safe DTOs live in weekly-contracts.ts;
server draft keeps canonical generated claims and exact removal terms. Summary is
separate from full plan; neither exposes a readReceiptId until the service issues one.

- [x] Write failing tests: exact keys/UUIDv4/Monday/ALL/SELECTED modes; duplicate IDs,
  forged terms/subsets and missing ack/digest/readReceiptId reject. Default tool
  args cannot set BUILD_WEEK. Preserve all old day command tests.
- [x] Run new tests and record expected missing-module/export failures.
- [x] Implement contract parser/types and compareWeeklyPlans. Reuse planWeekSteps
  with whole-week scope; exclude published/archived targets while retaining ledger;
  normalize unchanged generated rows; compute full-week baseline and remaining
  requirements/omissions; no per-day saves. Strict byte limits never cut exact terms.
- [x] Test3locations/cross-day rest, different alternatives, all existing assignment
  protection, no-change, impossible control, input caps, cancellation, UTF-8 and
  yielding. Test BUILD_WEEK budget exhaustion cannot make worse/removal-only apply.
- [x] Run focused new and day/generation units; commit the independently tested slice.

### Task 2: Durable proposal admission, context and canonical schema

**Files:** Create db/migrations/0066_owner_advisor_weekly.sql,
src/lib/owner-advisor/weekly-store.server.ts, weekly-context.server.ts,
weekly-store.integration.ts. Modify db/migrations/order.ts,
src/test/integration/local-postgres.ts, src/test/migration-order.test.ts and regenerate
src/lib/company-bootstrap/manifest.generated.ts using existing generator.

**Interfaces:** WeeklyStore wraps AdvisorStore; reserveComparison(requestId,hash,
context,signal), completeComparison(...), failComparison(...), readReview(reviewId,
signal), lock/guard helpers. captureWeeklyContext(store,env,origin?,signal) returns
current profile and optional admitted notebook/memory/knowledge fences;
weeklyContextGuards(store,context) returns ordered SQL assertions without performing
a workspace SHARE-to-write lock upgrade. Store operations never send provider I/O.

- [x] Verify0066 availability and add failing SQL tests for missing schema, same-hash
  replay, changed hash, active busy/failed/tombstone behavior and scoped atomic caps.
- [x] Run owned SQL to establish red before implementation.
- [x] Add append-only migration/tables/checks; reserve before solver work, store at
  most2 bounded alternatives atomically, clean only eligible expired unsaved data,
  preserve saved receipts/tombstones and fail clearly at retained quota.
- [x] Test Owner/session/company isolation; second-session quota cannot reset;
  concurrent compare quota admission, cleanup retention, context revision/expiry
  transitions and schema-off. Real apply/decline versus cleanup races belong to
  Task4, where those business-action functions first exist.
- [x] Regenerate canonical bootstrap/mirror; run SQL and manifest/order units; commit.

### Task 3: Solver-free exact weekly validation and writer

**Files:** Create src/lib/data/reviewed-weekly-draft.server.ts and
src/lib/owner-advisor/weekly-writer.integration.ts. Extract the shared pure
src/lib/scheduling/generation/coverage-regressions.ts from weekly-plan.server.ts.
Reuse generation provenance,
claims, source guards, capacity allocation and notification-state protocols.

**Interfaces:** reviewWeeklyDraft(input:GenerationInput,terms:WeeklyExactTerms):
WeeklyValidatedSet; prepareReviewedWeeklyDraft(args:{source,input,terms,proof,
observedAt}):{guards,statements,insertedIds,removedIdentityCustody,
expectedAfterSource}. No planner call may occur in these functions.
The writer uses the canonical DRAFT source-after protocol and week locks;
publication/notification state and config are not used (ledgered Task3 ruling).

- [x] Failing tests: multiple dates and sites save exactly once as one set; manual,
  referenced, out-of-scope and foreign-week assignments stay byte/episode-identical.
- [x] Implement canonical-set validation and guarded statements. BUILD_WEEK removal
  selection must match eligible reviewed generated rows; retained exact matches
  retain identities; only needed DRAFT parents are created. Validated generated
  claims/provenance match canonical writer semantics.
- [x] Test adjacent rest/hours/restriction/capacity violations, stale source, wrong
  episode/parent, protected history, unavailable location and published target.
- [x] Test trigger suppression/alteration on inserts/deletes/receipts rolls back all
  mutations; exact full post-source and fresh inserted episode custody asserted.
- [x] Run owned SQL plus generation guards and existing day writer regression; commit.

### Task 4: Full review, exact apply/decline and uncertain-result recovery

**Files:** Create src/lib/owner-advisor/weekly-service.server.ts,
weekly-service.integration.ts. Extend weekly-store/context from Task2 only as needed.
Client-safe WeeklyResult/receipt/progress types live in weekly-contracts.ts. The
default-off registry and .env.example moved forward from Task5 for recovery tests
(ledgered ruling); Task5 retains HTTP boundary and flag-admission checks.

**Interfaces:** weeklyService(proof,ex,env,signal,value,origin?):Promise<WeeklyResult>;
internal compare invokes Task1 only for a new admitted comparison. Full read issues
readReceiptId; apply consumes only server terms. compare/read/decline/check work
without a model credential. Results distinguish ready, stale, saved, declined,
not_saved and unavailable; minimal historical receipts omit stale private details.

- [x] Failing tests: compare writes only private artifacts; direct summary approval
  without read receipt fails; full read then acknowledged exact apply succeeds;
  decline makes zero business writes; incompatible repeated operations conflict.
- [x] Implement state machine and atomic guarded write plus receipt. Preserve locked
  first-workspace order across every mutation and context read. No solver on apply.
- [x] Test simultaneous apply/apply and apply/decline; source/authority/session and
  profile/notebook/memory/knowledge changes before/after locks, expiry and feature-off.
- [x] Test same-operation lost-reply recovery, duplicate check/retry, changed source
  after success, recreated episode, missing observation and receipt custody. Expired
  successful operation may recover receipt but cannot replay stale details as current.
- [x] Run full weekly SQL and existing Owner regressions; commit.

### Task 5: Private route and default-off feature admission

**Files:** Create src/app/api/owner/advisor/weekly/route.ts,
src/lib/owner-advisor/weekly-http.server.ts, weekly-http.test.ts,
weekly-http.integration.ts. Modify src/lib/feature-flags.ts and relevant existing
flag registry tests/documented env examples without setting real credentials.

**Interfaces:** HTTP adapter calls weeklyService; strict same-origin/header/auth/
body/cancellation/no-store rules mirror existing private routes. Flag name
NEVORA_OWNER_ADVISOR_WEEKLY_ENABLED, default false. Parent advisor must remain on;
weekly-off permits only minimal authorized historical recovery, never new writes.

- [x] Failing tests for missing/wrong origin/site/header, query/extra fields,16KiB
  streamed limit, malformed UTF-8, Manager/Employee denial, missing schema and gates.
- [x] Implement bounded route/service boundary without exposing server imports to
  client runtime; one deadline covers auth/body/service and abort releases reader.
- [x] Test response privacy and lease expiry, uncertain commit deadline, denied
  operations when weekly off and credential-free CRUD/recovery.
- [x] Run HTTP units/SQL and typecheck/lint; commit.

### Task 6: Read-only model tool and typed weekly decision evidence

**Files:** Modify owner-advisor/contracts.ts, tools.server.ts, service.server.ts,
loop.server.ts, workflow-contracts.ts, decision.ts, decision-metrics.ts and add
weekly-tool tests/integration. Existing provider adapters consume the common tools.

**Interfaces:** weekly_plan ToolCall args:{weekStart,locationScope}; tool result
weeklyPlans:WeeklyModelComparison. AdvisorTools receives optional admitted request
origin/context and weekly gate; service supplies real origin identity after reserve.
Only new feature-on investigations advertise weekly tool; old wire forms compatible.

- [x] Failing tests: model may compare FILL_GAPS_ONLY; cannot inject apply/rebuild,
  arbitrary terms or trusted IDs from chat. Compare identity is derived server-side
  from original investigation/tool occurrence, with bounded idempotent retry.
- [x] Implement summary <=12KiB, trusted exact private review links, normal source/
  tool budgets and context fences. Typed decision references/metrics must match
  actual returned week/scope/option identity; unsupported feasibility stays unverified.
- [x] Test repeated/read-only investigation, forged/stale/partial alternatives,
  knowledge source slot coexistence, EN/ES canonical scope and no scheduling writes.
- [x] Run Owner units and SQL, preserving old tools/paid ledgers unchanged; commit.

### Task 7: Combined evidence, fresh review and Claude API handoff

**Files:** Add docs/handoffs/2026-11-16-rondo-weekly-backend.md,
2026-11-16-rondo-weekly-ui-contract.md and owned raw/hash evidence directory.
Update progress/source matrix with verified capability state, keeping scores null.

- [x] Verify all spec controls against actual artifacts; run impacted units/SQL,
  migration/bootstrap checks, typecheck/lint and safe release-environment build.
- [x] Fresh code reviewer evaluates exact diff/base/head and adversarial inputs;
  fix important findings and rerun affected checks. Review does not substitute for
  independent release certification or actual-model semantic qualification.
- [x] Give Claude exact commands, DTO parsers/links, complete review/expiry/read-
  receipt/ack flow, recovery/lease/feature gates and fictional testing fixtures.
  Inspect UI commit and assemble exact combined candidate only after ownership/source
  reconciliation. Root never implements Claude screens.
- [x] Real owned app/API browser verification with exact combined UI, then full
  release source/manual qualification. Record any unresolved failures; do not update
  snapshots/hashes merely to green a gate. Hosted acceptance still separate.
- [x] Local commits and honest handoff: implemented versus tested versus semantic
  qualification versus deployed. Continue subsequent roadmap domains from this
  verified evidence; no claim all eight finished.

## Plan self-review

Every spec section maps to a task: architecture/scope/limits1; identity/schema and
context2; exact validation/writes3; review/recovery/freshness4; transport/flags5;
model/evidence6; ownership/rollback/QA7. All five review-focus conditions have a
test owner. No new dependencies, UI scope, external writer or paid campaign.
