# Task 4 migration technical preflight

Reviewed 2026-10-20. Scope: read-only technical input to the future runbook, not approval to execute migrations, create a branch, restore, deploy, or resume deliveries.

Candidate: `039467e8cb0d0feaaab593168a44b1e6b9481498`, branch `codex/verify-preview-33`, workspace `/Users/josek0514/.codex/worktrees/verify-preview-33/Fuel Scheduler`. Existing changes to three browser QA scripts were preserved. No SQL, app, PostgreSQL runtime, or tests launched; no connector reads performed. Only this report was written.

`codeQualityStatus: BLOCK`
`recommendation: REQUEST_CHANGES`

These statuses concern execution readiness and required runbook precision. No completed Task 4 runbook diff was supplied for approval. Findings below are open execution gates, not allegations that a future runbook already violates them.

## Evidence and method

Read AGENTS, executive operating model, CTO, CISO, release-governance skills; `docs/product/specs/codex-joint/CODEX-HANDOFF-CLEAN-MANAGER.md`; Task 4 brief; package scripts; application test loader; migration SQL, transaction markers and relevant backfills/constraint bodies; both existing metadata artifacts:

- `/tmp/nevora-verify-33-neon-readonly.json`
- `/tmp/nevora-verify-33-neon-recovery-readonly.json`

Mechanically enumerated and SHA256-hashed all 36 loader files. Examined transaction control and searched every application-chain file for transaction-incompatible command families. This was a bounded static migration review, not a full audit of every runtime function or proof of execution on PostgreSQL 17.

Consulted `remove-ai-slops` and `programming` at `/Users/josek0514/.codex/plugins/cache/sisyphuslabs/omo/5.1.30/skills/`. Skill-perspective check ran: no new production/test diff exists in this preflight scope, so no deletion-only, tautological, prompt-pinning, or implementation-mirroring tests are introduced. No skill violation established in the proposed documentation-only scope. Require behavior-based executor/recovery rehearsal later; do not add phrase-count tests for the runbook or speculative production parsing infrastructure.

`omo-agent-toolkit ulw-loop status --json` returned `ULW_LOOP_PLAN_MISSING`. This specifically requested preflight artifact is in `/tmp`; no ULW attempt was created. Task source/notepad context is `.superpowers/sdd/CLEAN-MANAGER-VERIFICATION-PLAN/task-4-brief.md`.

## CRITICAL

None established by this bounded review.

## HIGH

### H1 — Exact baseline and backfill prerequisites remain unproved

The metadata contains 0003/0004 objects and columns, while 0005/0008 prerequisites are absent. Neither “about 0002” nor successful `IF NOT EXISTS` is a reconciliation result. `0006_scheduling_rule_inputs.sql:14` drops exact historical constraint names; `0007_portal_web_push.sql:27` drops/recreates a specific index. Wrong definitions can fail mid-sequence or survive skips.

Required precision: inventory columns/defaults/nullability, constraint definitions/validation state, indexes/predicates, functions, triggers, ownership/privileges and any existing migration ledger against the exact candidate. Classify each full filename as proven complete, pending, or divergent. Divergence stops the operation for a separately reviewed reconciliation patch. Do not silently rerun, mark complete, or skip from object existence.

Material data gates:

- `0008_workspace_positions.sql:3`: singleton workspace bootstrap; `:13` seeds company/timezone and `:18` assigns every location and derives Clocker keys. Privately verify the intended identity, timezone, mapping and uniqueness. Do not copy hardcoded key values into evidence or rewrite customer identity automatically.
- **Cross-file trap:** `0008_workspace_positions.sql:29` and `:31` add legacy name checks as NOT VALID, but these still apply to future updates. `0025_calendar_subscriptions.sql:20` updates every location. Invalid legacy names/short names can therefore let 0008 commit and cause the later calendar backfill to fail. Aggregate preflight must check both name predicates before apply; resolve failures through a separately approved reconciliation, not trimming/truncation or disabling constraints.
- `0010_shift_coverage_automation.sql:5` rejects overlapping active source/target/callout participation; `:111` populates participation and `:168` imports historical events through joins. Require zero conflicts and source-to-import count/ownership reconciliation, including orphan assumptions and preservation of unknown historical consent.
- `0025_calendar_subscriptions.sql:11` ranks publications and locations into integer serials, preserves source timestamps, then makes fields NOT NULL at `:22`. Check timestamp presence, integer capacity, source counts, clock maximum, deterministic ordering and unchanged ownership.
- `0023_template_ownership.sql:4` assigns templates to the singleton workspace, `:8` copies child ownership, and `:10`–`:13` add composite ownership FKs. Prove exactly one intended workspace, complete parent linkage and location/position ownership before applying.
- `0014_clocker_breaks.sql:44` intentionally leaves old break classification NULL. No invented break/payroll defaults or fabricated history belong in verification.
- `0029_payroll_private_notices.sql:2` and `0030_notification_source_kinds.sql:4` replace notification constraints; reconcile existing values and preserve COMMUNICATION and payroll source types.

### H2 — Execution/journal semantics must be explicit before final approval

`src/test/integration/local-postgres.ts:7` defines 36 application files, with 0001/0002 baseline comparison entries and 34 potential upgrades. `:130` executes file contents through the disposable test adapter; it is not a production runner.

Only `0019_payroll_export_mappings.sql` (51 lines) and `0033_management_alert_preferences.sql` (61 lines) lack outer BEGIN/COMMIT. Their PL/pgSQL BEGIN blocks are function bodies, not migration transactions. Both contain ordinary transactional DDL/function/trigger definitions; no transaction-incompatible command was identified in either body. All other 34 loader files contain outer transaction boundaries. Searches across the chain found no CONCURRENTLY, VACUUM, CREATE DATABASE/TABLESPACE/SUBSCRIPTION, ALTER SYSTEM, REINDEX, top-level CALL/COPY, or psql meta-commands. This does not replace PostgreSQL 17 rehearsal.

Use a reviewed explicit per-file wrapper for both unwrapped files. Embedded commits in the other files prevent a global transaction promise, including with `psql --single-transaction`. [PostgreSQL psql documentation](https://www.postgresql.org/docs/17/app-psql.html).

Required runner gate:

- Pin the exact runner, wrapper and journal design by hash; currently none is established as a production facility.
- Hold one session advisory lock on the same persistent direct PostgreSQL connection across the sequence. Per-file subprocesses do not inherit it. Session locks require direct connection; pooled transaction sessions cannot provide that lifetime. [Neon pooling documentation](https://neon.com/docs/connect/connection-pooling).
- Stop on the first error; bound lock/statement waits with reviewed values determined by rehearsal. Do not reconnect-and-continue automatically. Session lock loss requires reacquisition plus reconciliation.
- Appending a journal write after a file's embedded COMMIT is **not atomic** with that migration. Either use an explicitly external durable journal with lost-ack reconciliation, or separately review/hash/rehearse an adapter that inserts the journal write inside each file's transaction. A semicolon splitter or regex-only SQL rewriter is not a safe implementation proposal.
- Journal full filename, ordered position, source hash, candidate/manifest/runner identities, before-state evidence, attempted start, observed outcome and postconditions; ambiguous commit stays UNKNOWN. Database journal DDL is an additional schema change requiring inclusion in review/authorization.
- Rehearse failure before commit, after commit before journal acknowledgment, interrupted connection and lock contention. Prove which files committed using catalog/data postconditions and journal evidence before authorizing any continuation. Never replay an ambiguous file just because it contains IF NOT EXISTS.

### H3 — Recovery path and writer resumption are not established

Captured production metadata: PG17.11, history 21600 seconds, `protected:false`, primary/default/ready; delete and endpoint actions restricted because of the Vercel production binding. `parent_id` was not returned. Do not label this a protected branch or infer root topology from its name.

Instant Restore currently requires root branches; a newly created child backup is not automatically a usable restore source. Recovery replaces branch state, so database/connection scope and provider permission must be demonstrated. [Neon Instant Restore documentation](https://neon.com/docs/postgres/backup-restore/branch-restore).

Before final apply approval: prove supported recovery using the actual project topology and permissions, preserve an exact available preapply history timestamp, test restoration on an authorized isolated target, and assign backup retention/TTL/cleanup ownership. Six-hour history is not a backup-branch lifetime. Define a separately authorized recovery option if the timestamp ages out. Do not promise endpoint promotion, branch rename, protection changes or credential reuse.

Freeze web/cron/workers/Clocker and drain in-flight writers before snapshot/reconciliation/apply. A migration advisory lock alone cannot fence writers that do not acquire it. The backup/recovery point must be aligned with the actual freeze; explicitly accept or reconcile any gap. Keep outbound delivery off through recovery and postchecks. Queue draining, payroll runs, production smoke writes, deployment and automatic worker restart are not implied by migration permission.

## MEDIUM

### M1 — Preserve complete filename order and separate exclusions

Loader order after `0022_timecard_reopen_revision_authority.sql` is:

1. `0023_employee_attention_receipts.sql`
2. `0024_contextual_communications.sql`
3. `0025_calendar_subscriptions.sql`
4. `0023_template_ownership.sql`
5. `0024_schedule_copy_receipts.sql`
6. `0025_company_policies.sql`
7. `0026_attendance_observations.sql`
8. `0027_payroll_period_custody.sql`
9. `0028_configurable_payroll.sql`
10. `0029_payroll_private_notices.sql`
11. `0030_notification_source_kinds.sql`
12. `0031_workspace_presentation.sql`
13. `0032_workspace_words_modules.sql`
14. `0033_management_alert_preferences.sql`

Earlier files follow the loader's 0001–0022 entries. Never glob/sort all migration SQL. `0026_tenant_ownership_expand.sql:1` onward binds source catalog hashes and establishes a separate fence protocol; `0027_tenant_ownership_validate.sql:19` onward requires exact context, locks and completed fenced capture. They are excluded from the application loader and require a separate reviewed workflow. Exclusion does not waive tenancy integrity checks or certify these guarded migrations.

No 0034 exists in this candidate. Compliance integration requires separate authorization and a regenerated candidate/manifest/rehearsal; an authorized future combined operation could share a maintenance window but cannot reuse today's file manifest unchanged.

## LOW

No additional finding.

## Required handoff and next gate

Documentation implementer should incorporate H1–H3 and M1 as explicit stop conditions and evidence requirements, with hashes and sanitized metadata. The next review can approve a planning document while execution remains blocked. Do not claim backup, rehearsal, recovery, migration or production verification has occurred.

Blockers before execution approval: reconciled production baseline; verified bootstrap/backfill/integrity predicates (especially location names before calendar updates); exact reviewed executor/transaction/journal/lock design; authorized isolated rehearsal with failure evidence; supported tested recovery and retention plan; write-freeze and delivery-resumption decisions; Jose's candidate/manifest-pinned approval.
