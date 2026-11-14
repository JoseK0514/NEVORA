# Home source failure diagnostic code review

codeQualityStatus: WATCH
recommendation: APPROVE
reportPath: .omo/evidence/home-source-failure-code-review.md

Scope: uncommitted diagnostic patch over HEAD 76269726773c5a6ba179d93f06a218ef86768196; seven requested files. No application or UI implementation edits reviewed or made. The coordinator concurrently added a package script and handoff; those are outside this review. No ULW plan exists (status command returned ULW_LOOP_PLAN_MISSING), so this is the prescribed fallback report path. No notepad path supplied. Investigation context: /Users/josek0514/.codex/nevora-worker-quota-repair-20261112/home-failure-investigation-review.md, inspected directly.

## CRITICAL
None.

## HIGH
None remaining. Previously reported primary-error replacement and skipped listener cleanup are resolved by the caller catch/rethrow and finishHomeFailure's independent cleanup attempts. Fixed safe labels report secondary failures; a successful scenario still fails when capture fails.

## MEDIUM
None.

## LOW
1. SQL batch IDs do not establish Home-request correlation. src/test/integration/owned-home-diagnostics.ts:19-22 assigns per-transport sequence IDs; scripts/home-source-failure-diagnostic.mjs:12-19 assigns unrelated browser request IDs. The combined receipt can distinguish an assignment batch from a final batch and identify browser responses, but overlapping Home requests still cannot be conclusively paired to those SQL batches. Treat timing-based pairing as inference, not proof of a specific response's fingerprint mismatch. This is a documented diagnostic limitation, not a reason to alter application code.

## Verification and skill perspectives
Read remove-ai-slops and programming SKILL.md, requesting-code-review, repository AGENTS.md, executive operating model and relevant engineering/security/assurance skills. Applied both requested skill perspectives to changed tests and code. No deletion-only, prose-pinning, tautological, or implementation-constant-only tests found. The tests exercise useful privacy, fingerprint stability/change, saturation, and listener cleanup behavior. The SQL classifier necessarily knows query shapes for this bounded test-only diagnostic; no unnecessary production parsing was added. Broad observer catches are justified at the diagnostic boundary to preserve behavior. The original programming/non-interference violation is resolved. Added cleanup failure-injection coverage exercises independent close/capture attempts; strict server-log projection strips arbitrary injected fields. No remaining blocking violation of either skill perspective identified. Existing oversized browser scenario file predates this patch; do not broaden this bounded diagnostic into a wholesale refactor.

Executed independently:
- node --test scripts/home-source-failure-diagnostic.check.mjs: 4 passed on re-review.
- npx vitest run src/test/owned-home-diagnostics.test.ts: 2 passed.
- A direct tsx failure-observer probe against the concurrently updated code: throwing code getter did not escape; object coercible to 55P03 did not emit its private property. The earlier inspected implementation had weaker code handling, but that is already corrected and is not an open finding.

Inspected real Home DTO, route response, assignment SQL, final location guard, and application assignment fingerprint. Projection matches the real DTO and keyed SQL fingerprints omit observedAt consistently with application comparison. No headers, SQL text, values, or raw rows are deliberately output by the inspected projection. Acquired versus not-acquired events distinguish acquisition failures. Existing H09 assertion and deadlines remain unchanged.

No browser/database run, release certification, deployment, or production verification performed. Local test output exists in this review tool transcript; no separate test artifact was supplied. Code-review approval is granted for the bounded diagnostic patch; real SQL/browser execution remains a separate gate. Root retains implementation/hosting custody.

blockers: []

## Re-review 2026-11-12
Reviewed current full diagnostic diff including package.json test registration, finishHomeFailure, homeSqlEvents, updated four Node tests, both Vitest tests, and the added real-PG sink-failure regression in src/test/integration/phase-e-home.integration.ts. The latter asserts original SQLSTATE 22012, rollback usability and subsequent reads when the observation sink throws; it is relevant behavioral coverage, not a test of requested removal. It was inspected but deliberately NOT executed because the coordinator owns SQL/browser runs. git diff --check passed. Independent reruns: Node 4/4, Vitest 2/2. No source edits made. Status WATCH only reflects the LOW request-to-SQL correlation limitation above, not a blocker. This supersedes the initial REQUEST_CHANGES verdict.

## Test-location correction review — d447680d24f5f8a7aa3ea6459a95acf4dffec1da

APPROVE for this correction only; no new findings or blockers. Inspected the complete two-file commit and destination fixture. The regression moved from phase-e-home.integration.ts to shift-change-transport.integration.ts; its transaction, SQLSTATE, diagnostic and subsequent-read assertions are unchanged. It now uses the destination suite's existing createDisposableExchangeDatabase and ownership identity instead of the incompatible foundation database. The redundant import/identity query were removed from Home. Transport ownership guards and application code are unchanged. The new transport still closes in finally and does not mutate shared fixture rows. This addresses a fixture incompatibility missed in the earlier static review; prior approval was not evidence that the database test passed. The coordinator reports the incompatible run failed and is running the corrected test; neither run was independently executed or certified here. No DB/browser run launched. Earlier focused checks remain as recorded, and the LOW correlation limitation remains unchanged.
