# Backend foundation code review — 2026-11-15

codeQualityStatus: BLOCK
recommendation: REQUEST_CHANGES

## Scope and identity

Reviewed base `18c75692b841c20cc34590e233abdfdbe2b757ea` through HEAD `328c063c1787c683f0041f069d86d58e666d908e`, plus the pending `.github/workflows/ci.yml` and `scripts/release-ci-contract.check.mjs` changes. Detached implementation checkout: `/Users/josek0514/.codex/worktrees/nevora-inspection-backend/NEVORA Development`. No implementation, index, branch, or hosted mutation performed. This report is the sole intended artifact addition.

Goal: review the partial local logging, invitation capability, exact-true flag migration, environment documentation, and CI gate batch. Plan: `docs/superpowers/plans/2026-11-15-inspection-backend-foundation.md`. Notepad: `.superpowers/sdd/2026-11-15-inspection-backend-foundation/progress.md`. The ulw-loop status command returned `ULW_LOOP_PLAN_MISSING`, so the prescribed fallback report path is used.

## Findings

### CRITICAL
None.

### HIGH — Marker gate destroys the build identified by the uploaded custody receipt

Changed call site: `.github/workflows/ci.yml:71-74`; upload: lines 79-84. Callee: `scripts/verify-dev-production-absence.mjs:13-25`; receipt producer: `scripts/release-build.mjs`.

The source-bound build records hashes of its `.next` files. The new gate then invokes a script that moves that directory aside, performs a fresh `next build` using a different environment (including forced development toggles), scans the new build, and deletes the backed-up source-bound build on success. CI subsequently uploads the original receipt. Its artifact hashes therefore identify the discarded first build rather than the scanned/final build; the second build also has no equivalent captureSource/assertSourceUnchanged receipt. The plan explicitly requires retaining exact source/build custody. This is a concrete evidence integrity regression, not a claim that a production deployment occurred.

Required fix: retain and scan the source-bound build, or run the adversarial rebuild in isolated output with its own source-bound receipt and preserve/restore the original build. Bind the scanned output and evidence to the build actually being claimed. Add a behavioral check for preservation/receipt correspondence; the current workflow test merely establishes command ordering and would pass with this mismatch.

### MEDIUM
None.

### LOW
None.

## Independent verification

- Ran `npm test -- src/lib/server-error.test.ts src/instrumentation.test.ts src/lib/feature-flags.test.ts src/components/company-access/commands.test.ts src/app/api/commerce/status/route.test.ts --maxWorkers=1`: **5 files, 61 tests passed**.
- Ran `node --test scripts/release-ci-contract.check.mjs`: **31 passed**. This is workflow-contract evidence, not actual CI/build execution.
- Inspected supplied logs under `.superpowers/sdd/2026-11-15-inspection-backend-foundation/`: `task1-green.log` (5 logger/hook tests), `task2-green.log` (23 integration tests), `task2-workspace-green.log` (12 integration tests), `task4-green.log` (364 tests), `task5-ci-green.log` (31 tests), and `typecheck.log`/`changed-lint.log`. Logs are supporting executor evidence; database suites/typecheck/lint were not independently rerun here. Empty lint output alone is not an independently verifiable exit status.
- `full-unit.log` contained only the invocation/start banner when inspected. No full-suite success is certified.
- Inspected the mail factory and both invitation write adapters: capability uses the same validated factory and current-workspace environment as writes; factory construction does not call send/verify. ISSUE requires eligibility plus configured delivery; REVOKE retains its existing lifecycle rule.
- Inspected migrated flag readers: comparisons retain exact `true`, per-call environments, and independent configuration/auth gates. Browser DTO parsing requires a boolean and fixtures include the new field.
- Logger emits bounded metadata only, does not serialize error messages/stack/SQL/body/headers, and uses a source route template at both added callers. Framework input is distinct from raw request paths. Broad catches here are justified by the explicit non-throwing diagnostic boundary and adversarial tests.

## Skill-perspective review

Loaded/consulted `remove-ai-slops/SKILL.md`, `programming/SKILL.md`, and its TypeScript reference from the installed OMO skills. Also consulted the repository executive operating model, CTO, CISO, and Governance & Risk skills.

Ran the overfit/slop perspective over the new tests and production diff. No deletion-only or prose-pinning tests found. The environment-example check covers machine-consumed configuration defaults, and the workflow assertions cover executable gate configuration. Logger boundary parsing and the browser response parser are required by the stated trust boundaries; no unrelated extraction/normalization introduced. Registry casting from Object.fromEntries is a bounded typing limitation (keys originate solely from the registry), not an untyped runtime escape or demonstrated regression. Existing dense code conventions are not grounds for a scope-expanding refactor.

The new workflow ordering test has the specific coverage gap documented in the HIGH finding: it does not establish artifact identity. No separate slop/maintainability violation is raised; the concrete gate correctness defect is the blocker.

## Explicit non-judgments and remaining scope

- Hosted logging custody, retained log privacy, real framework digest/UI correlation, and delivery connectivity: not exercised; no hosted access or real messages authorized for this review. Numeric digest and SQLSTATE filters constrain formats, not provenance; current callers rely on trusted framework/database metadata.
- Combined Claude UI, error-screen digest wiring, responsive/keyboard states and browser acceptance: absent from this reviewed batch and explicitly deferred.
- Import-only payroll enforcement, JR-23 forced password replacement, full Vitest consolidation/inventory, manuals and remaining handoff items: explicitly open, not represented as completed by this review.
- Actual CI success, production-marker build execution, timeout capacity after adding another build, hosted adapter deployments, and main/production readiness: not established. No build was run because the existing scanner replaces local build output, outside this read-only review.
- Database integration behavior beyond inspected source and executor logs: not independently certified; reviewer ran only the bounded non-network suites above.

Technical recommendation: fix the CI artifact-custody regression and rerun relevant verification. Security position: no additional demonstrated logger/invitation regression in this bounded review. Governance release impact: BLOCKER for approving this batch as currently composed; no production authorization or independent release certification is implied.

## Blockers

1. Ensure the production marker scan preserves or independently proves the identity of the source-bound build and its uploaded receipt; verify the correction with artifact correspondence evidence.
