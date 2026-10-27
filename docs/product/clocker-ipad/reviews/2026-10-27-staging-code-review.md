# Clocker staging code review — 2026-10-27

codeQualityStatus: WATCH
recommendation: APPROVE
blockers: []

Approval is for the inspected code, not deployment, photo activation, physical-iPad acceptance, or production release.

## Scope and custody

Reviewed supplied development baseline dfdcefa0edc9d02bad5edf79b2b5a9587b194eb2 through HEAD 174c9bef67d9f9b5a7d81df6cd14669d0aa93a20 and the current uncommitted staging continuation. Local development is historical and was not used as the comparison source. Examined the branch inventory, prior review, current privacy repairs, Owner authorization changes, photo authority/service/repository/transport/session, launch metadata, all new platform SQL/runtime/worker code and tests, and hosted acceptance script. This is risk-focused review across the branch, not a claim that every line of all 146 committed changed files received equal inspection.

Goal: isolated HTTPS staging, bounded Company-scoped photo lifecycle operations, preserved canonical time/recovery behavior, approved tablet design and Owner-only administration. No application changes, cloud operations, credentials, production data, or real photos were used by this reviewer. This report is the only reviewer-authored artifact.

No ULW plan exists: `omo-agent-toolkit ulw-loop status --json` returned ULW_LOOP_PLAN_MISSING; the required fallback report path is used. Working notepad inspected: `.superpowers/sdd/clocker-staging-20261027/progress.md`.

## Findings

### CRITICAL

None established.

### HIGH / Important

None established in inspected implementation paths.

### MEDIUM

1. **Implementation-text assertion adds false test coverage.** `src/lib/clocker/photo-server/platform-lifecycle.test.ts:17` asserts that generated SQL contains the literal interval expression. This stays green if the freshness predicate is inverted or disconnected, and fails harmless equivalent SQL rewrites. The same file's other assertions do exercise scope and error behavior; this is not a recommendation to remove that useful test. Remove only the SQL-text assertion and rely on the existing real PostgreSQL stale-health test in `src/test/integration/clocker-photo-platform.integration.ts`; if expanding coverage, test fresh/stale boundary outcomes against PostgreSQL. Nonblocking, bounded test-quality issue; no demonstrated runtime failure.

### LOW / Minor

1. `src/lib/clocker/photo-server/platform-lifecycle.ts:9` uses non-null assertions after an array-wide validation. The runtime validation is meaningful, but this evades TypeScript narrowing and violates the programming skill's new-code preference. Direct per-field narrowing would retain the same behavior without assertions. No correctness defect established.

## Security and correctness assessment

- Cleanup uses a fixed SECURITY DEFINER search path, qualified data relations, explicit session_user/worker-role equality, an active singleton workspace check, and no PUBLIC execution grant. Application versus worker permission tests exercise actual SQL roles.
- A workspace row lock serializes cleanup; invocation keys prevent repeated batches from changing results. Each batch caps expired and orphan changes independently at 500 rows. The HTTP worker caps batches at ten, uses a monotonic admission deadline, and its database call has an eight-second abort signal. This is a bounded loop, not proof of a strict twenty-second end-to-end upper bound or server query cancellation.
- Pending backlog prevents health advancement. Missing/expired attestation, disabled configuration, stale health, wrong binding, or query failure close the lifecycle provider. The upload transport checks effective lifecycle notice before accepting image bytes. Disabling collection does not disable the cleanup function, which is appropriate for retained evidence.
- Worker header authentication is platform-specific. Independently consulted Neon's official schedule documentation: https://neon.com/docs/compute/functions/triggers/schedule . It documents stripping client-provided X-Neon-* headers and using the invocation header for trigger authentication. This supports the implementation assumption only when hosted behind Neon ingress.
- Existing canonical time receipts are preserved by cleanup. The prior two Important privacy defects have corresponding monotonic timing and direct PIN-return repairs in the inspected source. No regression in those paths established.

## Skill-perspective check

Ran the remove-ai-slops and programming review perspectives after loading both installed SKILL.md files from `/Users/josek0514/.codex/plugins/cache/sisyphuslabs/omo/5.1.30/skills/`, plus programming's TypeScript README. Also consulted repository executive operating model, CTO, CISO, technical assurance, governance and release-governance guidance.

The MEDIUM literal-SQL assertion violates the overfit/implementation-mirroring perspective; the LOW non-null assertion violates the programming perspective. No deletion-only tests, requested-removal-only tests, brittle prompt-prose tests, or needless production extraction/normalization were established in the inspected continuation. Environment and database-result checks occur at real boundaries; failure-to-null behavior intentionally closes photo readiness. Existing project tooling was retained rather than treating skill tool preferences as a rewrite mandate.

## Verification and evidence limits

Independently executed:

`./node_modules/.bin/vitest run src/lib/clocker/photo-server/platform-lifecycle.test.ts src/lib/clocker/photo-server/platform-worker.test.ts`

Result: 2 files, 4 tests passed, exit 0 (09:11 local). No full-suite rerun or browser session by reviewer.

Inspected supplied artifacts:

- `.superpowers/sdd/clocker-staging-20261027/platform-sql.log`: 1 file / 3 PostgreSQL tests passed; owned loopback cluster stopped.
- `.superpowers/sdd/clocker-staging-20261027/clocker-unit.log`: 25 files / 328 tests passed.
- `.superpowers/sdd/clocker-home-screen-20261027/staging-clocker-sql-rerun.log`: 42 files / 572 tests passed; owned loopback cluster stopped.
- `.superpowers/sdd/clocker-staging-20261027/hosted-baseline-final.log`: 14 actual hosted Chromium/WebKit checks; physicalIpad NOT RUN. Inspected corresponding acceptance driver; these checks concern the initial deployment, not final continuation custody or real camera operation.
- `docs/product/clocker-ipad/reviews/2026-10-27-final-review.md`, `release-readiness.md`, and `staging-environment.md`.

Typecheck/lint success was reported by the parent; not independently rerun here. Parent subsequently reported scheduler completion at 2026-10-27T13:11:01.028Z, runs=1, attestation still disabled. That cloud result was not independently queried by reviewer and must be retained as a referenced artifact before claiming verified operational readiness.

## Release conditions, distinct from code blockers

Final continuation remains uncommitted at review time. Preserve exact new candidate SHA and deployment mapping, hosted migration/grant/worker custody, factual attestation/disclosures, scheduled-run evidence and final hosted checks. Late evidence inspected: `.superpowers/sdd/clocker-staging-20261027/worker-ingress.log` records HTTP 403 for both absent and forged invocation headers. This is supplied hosted evidence, not a reviewer-run request. Parent also reports two scheduled completions and unchanged run count after forged calls, with hourly cadence configured; those database/cadence assertions still require retained artifacts in the final handoff. Physical iPad IP01–IP28 remain NOT RUN. Real-photo collection and production release remain outside authorization. Rollback must preserve time/receipt/audit history and existing retention cleanup.
