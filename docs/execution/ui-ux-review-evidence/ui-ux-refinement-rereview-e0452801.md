# Remediation re-review

- codeQualityStatus: CLEAR
- recommendation: APPROVE
- blockers: []
- Exact reviewed HEAD: e0452801e196a076c2daac4e5b9a5d006d4619da
- Prior reviewed HEAD: a2ce38a15594c913d42dfb433f5897c18bde5ffe
- Whole-branch baseline remains 027b5f008df08367b0de942a923c5f3d4105ada0.
- Scope: all 16 files changed since the initial report, including the notification remediation, SQL extraction, tests and presentation adjustments. Initial whole-branch report is preserved at `.omo/evidence/ui-ux-refinement-code-review.md`.
- Execution record/notepad: docs/execution/2026-10-12-ui-ux-refinement.md. No separate notepad supplied. ULW CLI was unavailable in the initial pass, so this is a distinct fallback evidence artifact.

## Findings by severity

CRITICAL: none established.

HIGH: none established.

MEDIUM: no outstanding actionable finding from this re-review.

LOW: none raised.

## Prior finding disposition

**R1 — resolved for this local code-review gate.** `src/lib/data/portal-notification-list.server.ts` now discovers finite canonical read templates, builds one final protected SELECT for candidate membership and source facts, and replays source policy exclusively against those observations. Missing/unobserved source keys fail closed; source read failures do not authorize output. The final session lifetime and source expiry bound the returned snapshot. Workspace/employee/location/session guards are reused. No raw financial snapshots were added to the metadata-only payroll notice check.

Inspected the real owned-PostgreSQL regression in `src/test/integration/phase-e-communication-notifications.integration.ts`: it detaches the subscription before the final protected observation, retains the notification row, and requires an empty ready inbox. Inspected `../implementation-review-revocation-red-corrected.log`: the pre-fix implementation returned the stale available item (1 failure, 10 passes). Inspected `../implementation-review-revocation-green.log`: 11 tests passed. Both logs reference their JSON evidence artifacts. I did not rerun the PostgreSQL harness during this pass.

**R2 — resolved for this local code-review gate.** All new management-reader workspace/source traffic uses the bounded executor, with the same eight-second signal, 1.5-second lock limit and 2.5-second statement limit. The abort wrapper settles the caller even if an adapter does not resolve its promise; the signal is also sent to the actual transaction. Mark-read bootstrap and mutation share those bounds. Discovery uses the existing 64-distinct-read manifest limit; observed payload accumulation and the final result are rejected above 1 MB. Replay has no database fallback. These are finite read-count and accepted-observation bounds, not a claim that the database never allocates more than 1 MB while forming a result.

The four new unit cases exercise stalled list/read bootstrap cancellation, arbitrary-query/read-budget rejection, and oversized-observation rejection. Personally reran them as part of the targeted suite below. The injected abort controller makes cancellation testing direct; the short race timeout is a failure bound rather than a sleep used to infer completion.

**R3 — resolved.** Policy-time and route tests now import the real functions directly. Removed Reflect.get/type-existence scaffolding while preserving timezone and authorization behavior assertions.

## SQL extraction verification

Personally checked prior SQL against extracted templates. Artifact: `.omo/evidence/ui-ux-rereview-sql-equivalence.log`.

- coverageLocations, coverageWindows, coverageEmployees and coveragePositions: SQL text byte-identical to the prior inline statements.
- summarySeeds: default parameter expansion byte-identical.
- payrollNoticeReadSql: both default read and insertion guard ($10 source id, $2 recipient) byte-identical to prior behavior.

Management-only templates are opt-in; the employee manifest retains its prior allowed-query set by default. The extraction has a concrete purpose: safe parameter relocation in the coherent final observation. It is not an unrelated query-rewriting framework.

## Skill perspective check

Reused the previously loaded `remove-ai-slops` and `programming` skills and TypeScript guidance. The added cancellation seam and finite replay reuse are justified by the demonstrated defects. Boundary observation checks belong at the SQL adapter boundary. New resource-limit tests check behavioral rejection; they are not deletion-only tests or constant assertions standing in for behavior. R3's unnecessary callable type erasure is removed. No new material violation of either perspective was established. Generic SQL-row assertions follow the existing SqlExecutor boundary convention; no `any` escape or suppression was introduced for this repair.

The historical calendar test now explicitly excludes three unrelated parallel-line migrations from its pre-existing Phase E history fixture. The asserted 25-entry historical chain and data-preservation assertions remain; inspection did not find removal of the behavior under test. Broad SQL execution of that fixture remains part of the parent's pending checks.

## Verification

Personally ran on this exact HEAD:
- `git diff --check a2ce38a1 HEAD`: clean.
- Targeted Vitest budget, route, policy-time, manifest and inbox-view tests: **5 files / 23 tests passed**. Artifact: `.omo/evidence/ui-ux-rereview-regression.log`.
- SQL extraction comparison described above: all six template families matched.
- Git working tree remained clean for tracked files.

Inspected additional supplied evidence:
- `../implementation-review-budget-green.log`: four budget tests passed.
- `../implementation-typecheck-11.log`: tsc completed without diagnostics.
- PostgreSQL RED/GREEN logs above.

No source changes, branch changes, customer-data mutations, push, merge or deployment were performed. Only ignored review artifacts were written.

## Limits and next gate

Approval is for local code quality at the stated SHA and resolves the initial R1/R2 blockers. It is not independent UI QA, full regression certification, production authorization or customer-readiness certification. Parent-owned broad SQL/full/browser suites were still underway or pending at delegation; their outcomes are not assumed here. The payroll wrapper and native-select sizing changes have bounded presentation scope in source inspection; their rendered browser quality remains with the browser pass. Any subsequent source change requires attribution to a new SHA and an appropriately scoped recheck.
