# Staff Tasks Implementation Plan

> For agentic workers: execute the bounded tasks below with test-first changes,
> isolated ownership and a fresh whole-change review before completion.

**Goal:** Implement SCRUM-185 backend and a usable Claude UI contract.
**Architecture:** Separate pure recurrence/validation, protected SQL service and
HTTP/client contract. Reuse existing workspace/session/Company Access controls.
**Tech stack:** Existing TypeScript, Next server routes, PostgreSQL, Temporal and Vitest.
**Spec:** docs/superpowers/specs/2026-11-11-staff-tasks-design.md.

## Global constraints

- Codex backend; Claude UI; native/production/external sends excluded.
- Fresh development0317598 base; detached worktree, exactly three existing branches.
- Preserve the earlier paused operations work. No weakening tests/permissions.
- All data writes atomic with audit and idempotent operation receipt.
- No new package, provider, hosting or metered model use.

## Review focus

- A Manager losing a location while a request waits must not commit or receive data.
- An old assignee must lose access after reassignment, even for an old operation.
- Replayed operations must not bypass session/workspace/target authority checks.
- DST gaps/overlaps and long sync downtime must produce finite explicit behavior.
- Inactive or moved employees cannot receive newly created task/reminder work.

### Task 1: Pure model and calendar behavior

Own src/lib/staff-tasks/model.ts and model.test.ts; consume public types.ts.
Produce parseTaskDraft, parseStaffTaskCommand, parseTaskQuery,
planTaskOccurrences(draft, fromDate, horizonDate, timeZone).

- [x] Write validation/weekly/DST/leap/backlog regressions and observe RED.
- [x] Implement strict parsing and bounded planner, observe GREEN.
- [x] Review against the spec and record the test receipt.

### Task 2: Durable schema and protected service

Own db/migrations/0061_staff_tasks.sql, src/lib/staff-tasks/service.server.ts,
related SQL helpers and actual src/test/integration/staff-tasks.integration.ts.
Consume Task1/types; produce every server export listed in the spec.

- [x] Add meaningful failing actual PostgreSQL tests for the lifecycle and controls.
- [x] Implement tables, guards, operation recovery, events and reminder receipts.
- [x] Register canonical migration order/test adapter and test dedicated config.
- [x] Verify real concurrency, revocation, foreign company and bounded sync.

### Task 3: HTTP, client and integration handoff

Own src/lib/staff-tasks/http.server.ts, client.ts, focused tests and five route
wrappers; consume the public types and service exports. Parent owns assembly,
canonical manifest generation and documentation.

- [x] Write and run failing transport tests before implementation.
- [x] Implement bounded same-origin/auth/role/authority HTTP handling and client.
- [x] Record the exact Claude loading/empty/error/conflict/unknown-recovery sequence.
- [x] Run full default suite, typecheck, lint, source inventory/manifest and actual SQL.
- [x] Obtain fresh review, fix important findings with regression evidence, commit
  the isolated implementation and update Jira with actual remaining UI/staging gates.

## Completion evidence

Backend source `3bb552d79dd8daddffb2592f50b732d7d923264f`: nine clean-source stages
passed, including default12,236/0fail/857configuredskips,25 actual staff SQL,
21 actual provisioning, types/lint,228 release-engineering, manifest/inventory and
source-bound build. Review capacity/pagination findings are independently closed;
the restricted-APP upgrade gap has an actual42501 RED and approved minimal grant
fix. No WORKER privilege expansion. No shared push, remote CI, hosted migration,
production/native/UI implementation. Jira remains open for Claude UI and combined
staging/release acceptance. See docs/handoffs/2026-11-11-staff-tasks-backend.md.
