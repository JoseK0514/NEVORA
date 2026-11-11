# Conversations Backend Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task by task. Fresh builder/design and whole-change code review follow the applicable skill instructions; no implementation delegation is required.

**Goal:** Implement the SCRUM-187 backend and Claude client contract while preserving the D-04 activation hold.
**Architecture:** Separate conversation storage and APIs; reuse current sessions, Company Access, SQL executor, owned fixtures and private lifetimes. Explicit membership and immutable receipts govern all reads/writes.
**Tech Stack:** Existing Next.js/TypeScript, PostgreSQL, Node crypto, Vitest. No new provider or package.
**Spec:** `docs/superpowers/specs/2026-11-11-conversations-design.md`

## Global constraints

- Detached worktree from fresh 0317598ae; preserve other checkouts and branches.
- Claude owns UI. No native, real sends, external delivery, hosted schema or production.
- Existing owned-loopback D-04 guard on every business read/write; no new enable flag.
- 20 members, 2000-code-point messages, 120-code-point titles, 25-message pages,
  four-person and 100-location context pages, 16 KiB commands, 1 MB responses.
- Current session/company/location/membership authority and short private lifetimes.
- Do not import SCRUM-185; optional source adapter and pinned real migration fixture.

## Review focus

1. Revocation after a blocking lock: fresh authority before persistence and response.
2. Rejoined employee and role lifecycle: old history/cursors/commands stay inaccessible.
3. Lost commit response and duplicate concurrent sends: one persisted message/receipt.
4. New inbox activity during pagination: immutable watermark prevents skips/duplicates.
5. Optional task source and maximum Unicode payload: no source leak or parser overflow.

### Task 1 — public model and validation

Files: `src/lib/conversations/types.ts`, `model.ts`, `model.test.ts`.
Interfaces: typed commands/queries/resources and strict parse functions; no client identity as authority.

- [x] Write and run RED tests for malformed/extra fields, UUIDs, decimal sequences,
  duplicate members, text/code-point/byte bounds and context/cursor variants.
- [x] Implement canonical parsing and deterministic operation content hashing.
- [x] Run focused tests; commit contract and tests.

### Task 2 — durable schema and authorization

Files: `db/migrations/0062_conversations.sql`, canonical FINAL order,
`src/test/migration-order.test.ts`, generated bootstrap manifest,
`src/test/integration/conversations.integration.ts`, dedicated Vitest config.
Interfaces: invoker lifecycle function, membership/access predicates and immutable records.

- [x] Write owned SQL RED scenarios for tenant/location/member isolation, immutable
  history and restricted-role upgrade; preserve old order/held migration protections.
- [x] Add schema, stream counter/key, idempotent lifecycle and exact APP-only grants.
- [x] Run actual owned PostgreSQL migration/lifecycle tests; regenerate manifest
  deliberately, verify canonical source and commit.

### Task 3 — current-authority service and pagination

Files: `src/lib/conversations/access.server.ts`, `cursor.server.ts`,
`contexts.server.ts`, `reads.server.ts`, `commands.server.ts`, `service.server.ts`.
Interfaces: context/query/history/detail/command/operation functions consuming
server proof + expected authority + injectable canonical SqlExecutor.

- [x] Add RED tests for scope/deactivation after real waits, member removal/rejoin,
  unknown result recovery, concurrent sends, unread monotonicity and snapshot pages.
- [x] Implement bounded transactions, current source/permission checks, exact sequence
  handling and encrypted resource/authority/episode-bound cursors.
- [x] Add the pinned SCRUM-185 SQL fixture and verify both installed/missing task
  context plus reassignment/source visibility. Run owned SQL and focused units.
- [x] Commit service and retained evidence.

### Task 4 — HTTP, wire parsing and client recovery

Files: `src/lib/conversations/http.server.ts`, `wire.ts`, `client.ts`, their tests,
and thin `src/app/api/conversations/**/route.ts` adapters.
Interfaces: same-origin no-store private endpoints; strict client parsing and
unknown-outcome recovery bound to the original command.

- [x] Write RED tests for intent/origin/method/query/body/session rejection, no key
  disclosure, malformed/oversized responses and mismatched operation targets.
- [x] Implement transport and client. Keep read receipts separate from old required
  acknowledgements, no changes to structured communications.
- [x] Run focused/SQL/default suites and commit.

### Task 5 — qualification and Claude handoff

Files: `docs/handoffs/2026-11-11-conversations-backend.md`, relevant release test
gate/inventory entries, durable evidence in `.codex/conversations-evidence-20261111`.

- [x] Run full default tests, typecheck/lint, actual SQL, manifest, release regressions,
  inventory and isolated source-bound build. No production credentials.
- [x] Fresh whole-change review; fix material findings using RED/GREEN regressions.
- [x] Document decisions, exact API and source, test results, task integration,
  private lifetimes, recovery, rollback, activation hold and remaining UI/staging gates.
- [x] Commit, preserve the detached checkout and report actual implementation status.
