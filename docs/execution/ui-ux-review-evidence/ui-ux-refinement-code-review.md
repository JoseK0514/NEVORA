# Whole-branch local code review

- codeQualityStatus: BLOCK
- recommendation: REQUEST_CHANGES
- Reviewed HEAD: a2ce38a15594c913d42dfb433f5897c18bde5ffe
- Base: 027b5f008df08367b0de942a923c5f3d4105ada0
- Branch: codex/nevora-ui-ux-refinement-20261012
- Scope: all 61 changed files, approved F01–F17/E01–E08 refinement, preserving artwork, Inter, business operations and authorization. No push/merge/deployment.
- Execution record/notepad consulted: docs/execution/2026-10-12-ui-ux-refinement.md. No separate notepad supplied.
- Also consulted: AGENTS.md, DESIGN.MD, ../NEVORA_UI_UX_ASSESSMENT.md, package scripts, surrounding notification/session/workspace code and relevant tests.
- `omo-agent-toolkit ulw-loop status --json` was unavailable (command not found); used required fallback report location.

## CRITICAL
None established.

## HIGH
None established. Findings below do not demonstrate disclosure of private notification bodies or bypass of the destination's independent open authorization.

## MEDIUM

### R1 — Source revocation is not included in the final management notification observation

Location: src/lib/data/portal-notification-list.server.ts:35 and :41–49.

The source policy runs while each item is collected. The final checks validate session, workspace and a projection containing only notification id/creation/read timestamps. Source authorization/version changes leave that projection identical. A source revoked before those final checks therefore remains in a newly stamped `ready`, `complete` response as `actionState: available`. This is materially weaker than the existing employee reader's final source observation/replay and contradicts the execution record's current-source authorization acceptance criterion.

Reproduction: `.omo/evidence/ui-ux-review-reproduction.test.ts`, first case. The actual reader and canonical repository/policy run against a controlled SQL adapter; the device source is removed when the final session query executes. The reader returns the item as available. A subsequent canonical check of the same intent returns deliverable=false. `.omo/evidence/ui-ux-review-reproduction.log` records the passing bug reproduction. This is a deterministic interleaving simulation, not a real-PostgreSQL race test.

Required correction: include source eligibility/version facts in the final protected observation (or fail unavailable when those facts change), with a regression that revokes source authority during the read. Do not remove the destination's independent authorization checks. This is an approval blocker for the newly added manager inbox's promised current-source behavior.

### R2 — The management reader's eight-second budget does not reach its underlying source/workspace queries

Location: src/lib/data/portal-notification-list.server.ts:22, :29–35, :45 and :57.

An AbortSignal is created, but `getWorkspace(executor)` and the repository receive the original executor. Their queries omit the signal. The Neon adapter only supplies fetch cancellation when a signal is passed (`src/lib/data/notification-transactions.ts:33–35`). A stalled initial workspace query or source query can therefore leave the request pending past eight seconds; checking the signal between items cannot interrupt an already pending query. The mark-read preflight has the same omission. The per-intent source work also lacks the employee reader's read-count/byte bounds, especially relevant to manager summaries that expand constituent sources.

Reproduction: `.omo/evidence/ui-ux-review-reproduction.test.ts`, second case, and its log. A controlled executor receives undefined signal for the workspace query; after 8.1 seconds the operation remains unresolved. The harness then releases it for cleanup. No network/database connection is used.

Required correction: propagate a common bounded executor/signal through workspace and canonical source reads, with meaningful read-count/response-size limits for expanded sources. Add cancellation/budget tests. This is an approval blocker for the bounded-read acceptance criterion; it is not a claim of a demonstrated production outage.

### R3 — New tests unnecessarily erase the callable types through Reflect.get

Location: src/lib/company-policy-time.test.ts:5, :10; src/lib/employee-view-route.test.ts:14, :40, :54.

The tests retrieve known exported functions with Reflect.get and check `toBeTypeOf('function')` before invoking them. This yields an untyped callable and bypasses compile-time checking of inputs even though normal typed imports are available. The behavior assertions themselves are useful (timezone precision/DST and route authority); the reflection/type-existence scaffolding is unnecessary. Use direct imports and preserve those behavioral assertions. This is a non-blocking maintainability recommendation, not evidence that the tested behavior fails.

## LOW
None separately elevated. Small copy inconsistencies remain (for example recovery code feedback still says “new proof”), but they do not justify blocking this change.

## Skill perspective / test relevance

Loaded and consulted both installed skills:
- /Users/josek0514/.codex/plugins/cache/sisyphuslabs/omo/5.1.30/skills/remove-ai-slops/SKILL.md
- /Users/josek0514/.codex/plugins/cache/sisyphuslabs/omo/5.1.30/skills/programming/SKILL.md and its TypeScript reference.

Applied their review perspectives only; no cleanup/refactor was authorized. Repository conventions and bounded review scope take precedence over wholesale framework/toolchain replacement. Also consulted NEVORA executive operating model, CTO, CISO and technical assurance skills.

Both perspectives flag R3's unnecessary type escape. R2 violates structured cancellation expectations. The new migration and policy-time tests exercise meaningful behavior. Settings destination checks preserve real links, and the Clocker test verifies definition-list semantics; these are not deletion-only tests. The copy-receipt test includes useful destination checks but its sentence pins should not be treated as proof of command retry/idempotency; existing command/integration evidence remains necessary. No prompt test or deletion-only test was found. No goal-unrelated production parser or normalization layer was introduced; request JSON validation and datetime conversion belong to real input boundaries. The new manager reader's repeated JSON comparison does not substitute for coherent source verification (R1).

## Verification inspected and performed

Personally ran:
- `git diff --check 027b5f0 HEAD`: clean.
- Vitest route, policy-time, Action Center, shell and Settings tests: **5 files, 82 tests passed**. Artifact: `.omo/evidence/ui-ux-review-regression.log`.
- Two controlled adversarial reproductions above: **2 passed**, meaning both defects reproduced. Artifacts: `.omo/evidence/ui-ux-review-reproduction.test.ts`, `.omo/evidence/ui-ux-review-reproduction.log`.

Inspected supplied logs:
- ../implementation-historical-upgrade-green.log: 10 communication/notification SQL tests passed, including historical upgrade and read-vs-ACK separation; associated JSON artifact path recorded in log.
- ../implementation-polish-green.log: 76 tests passed.
- ../implementation-typecheck-08.log: tsc completed without diagnostics.
- ../implementation-lint-02.log: zero errors, one warning in unchanged employee-weekly-confirmation.tsx.

These existing green tests do not exercise R1/R2's interleavings/stalls. Migration 0029 correction plus 0030 forward repair preserves the existing source-kind union and historical rows; no migration blocker found. Explicit manager mark-read changes read_at with recipient/environment/session guards and does not create acknowledgement receipts. Browser run002 and the root's final suites were still underway when delegated; this report does not assert they completed or independently certify UI, physical devices, screen readers, production, or customer readiness.

## Required disposition

Implementation owner: parent implementation agent. Fix R1 and R2 and attach regression evidence before approval; R3 is recommended cleanup. No product source was modified by this reviewer. Only ignored local review evidence/report files were written. No data mutation, branch change, push, merge or deployment occurred. Re-review should target the resulting exact SHA.
