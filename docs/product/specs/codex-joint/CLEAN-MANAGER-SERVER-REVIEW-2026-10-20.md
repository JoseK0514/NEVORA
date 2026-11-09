# Task 3 server contract code review

- specStatus: PASS
- codeQualityStatus: WATCH
- binary quality gate: CLEAR (no blocking finding)
- recommendation: APPROVE
- blockers: []
- Reviewed branch: codex/verify-preview-33; HEAD 422df67a42fb31cabc1182f8e5ec7a17f5a301f2; base 586cbaa7.
- Scope: the supplied 13-file/two-commit diff, Task 3 brief and implementation report. No production certification.

## Findings by severity

### CRITICAL
None.

### HIGH
None.

### MEDIUM
M1 — Untyped unit-test executor escape hatch. `src/lib/data/weekly-approved-absences.server.test.ts:7` accepts `object[]` and casts the entire fake through `as unknown as SqlExecutor`. This suppresses checking that its generic query and transaction methods satisfy the real adapter interface; unrelated fixture shapes can silently enter these tests. It also dispatches by SQL text prefixes. Prefer a typed fixture row and a narrow typed executor fake, keeping SQL authorization assertions in the real PostgreSQL suite. This violates the programming skill's untyped-escape-hatch perspective. Nonblocking here: the projection/failure tests exercise observable results and the independent real-SQL tests cover the actual authorization query, so no demonstrated security or behavioral failure follows from this test helper.

### LOW
L1 — Native empty deadline control truncation remains at 320px/200% text. `src/app/app/schedule/settings/page.tsx:115`; artifact `server-contracts/geometry/webkit-320-200-rules.png`. The screenshot confirms an internally cropped native empty datetime control. Geometry checks measure its outer rectangle, not native control internals. This is a recorded presentation limitation; current evidence does not demonstrate lost stored data, an unusable submit action, or a failed deadline contract. It does not block this bounded server task and does not certify broad accessibility readiness.

## Spec and security assessment

Deadline returnTo uses an exact local allowlist and retains validated selected week on success, invalid civil time and workspace-conflict redirects. Invalid week rejects before writes. Existing workspace civil-time conversion, authoritative workspace version guard, advisory serialization, actor proof consistency and live session checks remain intact. Settings uses the existing ActionForm redirect handling and shows local workspace time, clear instructions and save/error feedback. Existing legal/payroll wording is unchanged in this diff.

The weekly reader derives workspace/location scope on the server. Its scoped LEFT JOIN produces checked employee IDs and approved overlapping absence rows in the same statement. Workspace, actor, administrative grant and session guards precede observation; session is checked again before release. Scope uses active locations/employees, and no private reason/request identifier enters the DTO. Both inclusive week edges and per-day partial ranges match the requested semantics. Full-day interval union prevents empty +Add cells; unavailable and unchecked employees do not become leave-free. Existing assignments remain visible. The legacy broad Schedule reader is expressly outside this certification.

The shared helpers were inspected only for concrete cross-contract risks: workspace concurrency, actor/session locking, location grant derivation, authoritative deadline writer and ActionForm redirect behavior. No speculative performance change is needed for this review. Historical latency remains a release condition for Jose, not reviewer acceptance.

## Skill-perspective check

Ran after loading `/Users/josek0514/.codex/plugins/cache/sisyphuslabs/omo/5.1.30/skills/remove-ai-slops/SKILL.md` and sibling `programming/SKILL.md`; also consulted the repository executive operating model, CTO and CISO skills. Read-only review overrides their implementation/refactoring workflows.

No deletion-only, requested-removal-only, tautological, prompt-prose or constant-mirroring tests were introduced. Redirect, date conversion, absence visibility, scope exclusion and malformed-boundary tests can fail for concrete regressions. The DB date/time projection and validation are justified at the private storage/client DTO boundary, not speculative parsing or normalization. No needless new abstraction or production extraction was identified. Programming perspective violation M1 is nonblocking MEDIUM. Existing oversized modules and established JSX conventions are not grounds to widen this bounded patch into a refactor.

## Evidence inspected and verification limits

Evidence root: `/Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/server-contracts`.

- Independently recomputed SHA-256 for every file in verification.json: all 13 match the worktree. HEAD matches the claimed commit; tracked checkout clean at review start. `git diff --check 586cbaa7 422df67a` passed.
- Inspected unit-final.log: 7393 passed, 801 skipped; 449 files passed, 27 skipped. Skips are not evidence of verified behavior.
- Inspected actual absences-postgres-final.log: 5 passed, owned cluster stopped; inspected the five integration test bodies (inclusive overlap, scoped Manager/Owner, revoked/expired/demoted sessions, foreign scope/inactive/storage failure, final session recheck).
- Inspected verification.json and focused/inset/type/lint evidence references: 81 focused, 25 inset, recorded type/lint exit 0. New SQL test is included by vitest.foundation-integration.config.mts and the existing required release-postgres runner/CI path.
- Inspected browser.mjs assertions, browser-report.json, ownership and geometry report: four cells (Chromium/WebKit x 390 Manager/1440 Owner), nine scenarios per cell, zero page errors; 36 geometry cases, all recorded passing. Actual database epoch assertion and actual DST-gap rejection are meaningful. Failure is induced in owned fixture storage and verifies no empty-slot links.
- Browser source imports the owned development runtime. Ownership JSON carries a generic production-mode label; the task report and harness correctly identify development Next plus local PostgreSQL, not hosted production. Use the latter scope when citing results.
- Inspected the reported 320px/200% screenshot. Native-control truncation is explicitly outside the geometric check's coverage.
- No suites rerun: no unresolved concrete doubt justified repeating them. No edits to application/tests, git mutation, production action, push, dependency or migration work performed.

Task brief/report serve as the supplied handoff record; no separate notepad path was provided. Seven earlier independent UI findings remain OPEN and are not self-closed by this review. Final combined CI and hosted legacy follow-up remain separate gates. Implementation owner remains manager_server_contracts; controller owns next gate. No Jose decision is required for this bounded approval; production/performance acceptance remains with Jose.

## Report location

`omo-agent-toolkit ulw-loop status --json` returned ULW_LOOP_PLAN_MISSING. Required fallback artifact: `.omo/evidence/clean-manager-task-3-code-review.md`. Identical handoff copy: `/tmp/nevora-verify-33-server-task-review.md`.
