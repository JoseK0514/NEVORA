# Workforce operations implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline, task by task, with one fresh whole-phase review.

**Goal:** Complete private workforce worker supervision, queue/heartbeat health and operating handoff without runtime activation.
**Architecture:** A fixed-command CLI wraps the existing payroll/web-push entrypoints, reusing every original auth/feature/commerce/lease control. Private atomic process receipts provide host supervision; separate read-only SQL reports canonical queue state. One configured host per company/environment and no new service/account.
**Tech Stack:** Node24,TypeScript,Vitest,owned PostgreSQL,existing pg/Neon executors.
**Spec:** docs/superpowers/specs/2026-11-09-workforce-operations.md

## Global Constraints
UI/native-app bytes unchanged;native dispatch excluded. No production,customer data,real provider delivery,new account/paid hosting,external messages or model calls. No external DB grants/schema or auth bypass. Setup-only per-company WORKER reader views/grants are prepared and tested only in owned PostgreSQL; activation requires explicit credential/custody approval. Explicit environment/scope/source/state-directory selection. Existing job leases govern effects; process receipts never establish delivery or exactly-once processing.

## Review Focus
- Concurrent attempts and host crashes must not replace an active lock or turn old success into current healthy execution.
- Timeout/signal cleanup must wait for the owned process tree to stop before releasing overlap protection.
- Symlink/public state paths and secret-bearing child output must not leak into receipt files or CLI errors.
- Read-only health must include due intent and retry/expired-lease work without sending, mutating or silently treating malformed data as empty.
- Source/company/environment and operator threshold mismatch must fail closed; source labels and local tests must not be called production acceptance.

### Task 1: Bounded worker supervision
**Files:** create src/lib/operations/supervisor.ts,supervisor.test.ts; scripts/workforce-operations.mts; modify package.json for operations:worker command.
**Interfaces:** consumes fixed canonical worker entrypoints; produces runSupervisedWorker(options):Promise<InvocationReceipt>, parseOperationsConfig(env), readInvocationHealth(config,command,now). Configuration includes enabled,environment(test or production),sourceSha40hex,scopeId UUID,stateDirectory absolute,deadlineMs positive/graceMs. Commands payroll,notifications-dispatch,notifications-reminders only.
- [ ] Write tests using owned Node children: success/exit23, disabled/unknown-command rejection before spawn, atomic overlapping invocation denial, timeout of a SIGTERM-ignoring child, SIGTERM interruption, private directory/symlink rejection, stdout/stderr secret redaction and stale/malformed/scope-mismatched receipts. Expected RED: module missing.
- [ ] Implement Node-only supervisor with closed command selection, exclusive owner-only lock, atomic receipt replacement,last success separate, watchdog/process-group termination and bounded cleanup. Keep executable injection confined to internal testable process primitive; CLI selects fixed argv and never invokes a shell. Expected focused tests GREEN.
- [ ] Verify real subprocesses are gone after timeout/interruption, no temporary lock/receipt leak on handled failure; document SIGKILL lock recovery. Run types/lint for changed files and commit.

### Task 2: Read-only canonical queue health
**Files:** create src/lib/operations/queue-health.ts,queue-health.test.ts; src/test/integration/onboarding-workforce-operations.integration.ts; modify scripts/workforce-operations.mts for health.
**Interfaces:** consumes SqlExecutor and explicit test/production notification environment; produces readQueueHealth(ex,environment):Promise<QueueHealth> with counts/oldest due age per payroll/web-push queue, expired leases and terminal failures, exact workspace ID. CLI health combines strict receipt health and SQL under withWorkerWorkspace/assertWorkerWorkspace, using explicit operator max-age/max-gap.
- [ ] Write tests for malformed/negative/nonfinite counts, no singleton workspace and SQL unavailability; real owned WORKER tests for due/future payroll and notification retries,expired leases, terminal failures,second-company isolation,suspension rejection,no queue writes. Expected RED before implementation.
- [ ] Implement SELECT-only aggregates using database clock and scoped one-company binding; exclude expired/cancelled intents,include ready retries and current expired leases; parse strictly and never report malformed results as empty. Expected focused unit and owned operations suite GREEN.
- [ ] Verify health leaves every job/attempt/status/lease byte unchanged and never accesses credential/profile material; commit source and fixtures.

### Task 3: Operations/recovery/API handoff and final qualification
**Files:** src/lib/operations/routing-reader.ts and tests; scoped worker configuration/resolver/transport/helper; docs/runbooks/workforce-operations.md; ops/workforce/systemd templates; docs/handoffs/2026-11-09-non-ui-completion.md and source/evidence receipts.
**Interfaces:** consumes Tasks1/2 and preserved onboarding recovery/Stripe/Owner partner contracts; produces runnable but DISABLED host templates, explicit operator activation/rollback/checklist, Claude API contract handoff and source-specific evidence/Jira updates.
- [ ] Remove the discovered browser-key dependency using a company/environment-bound WORKER-only control reader: reject Owner/browser custody, use security-barrier registry/secret views filtered by immutable session principal, deny APP/base/other-company/environment access, and verify actual restricted SQL. Expected reader unit/owned tests GREEN after observed RED. Setup-only DDL runs only in owned tests; hosted creation/custody remains gated.
- [ ] Prepare single-host oneshot/timer templates with no install/enable action; explicit envfile,separate private state folders and monitoring exit-code contract. Document cadence/thresholds as operator decisions,no SLA claim; pause before lock recovery,let canonical leases retry ambiguous effects,no forced queue repair. Expected source/template checks pass.
- [ ] Complete technical API/operations/recovery handoff and concrete disabled actual-model proposal; preserve other documentation owners,independent UI/legal and frozen Release1 gates. Update Jira146/89/85/104/161/166/168/170/174 as applicable with exact evidence,never self-close remaining activation acceptance.
- [ ] Run focused real process tests,owned queue tests,full root/types/lint/build and source guard once after final code; bind final source and preserve all logs. Expected required suites GREEN with skips/pending separated and no UI/native diff. Obtain ONE fresh whole-phase reviewer; address Important/Critical in one RED/GREEN pass,record all rulings/minors,no re-review. Prepare exact guarded development fast-forward and observe CI only within existing authorization; no main/production.
