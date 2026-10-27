# Employee mobile planning — whole-change code review

Candidate: `4ae859d2888da7b6bb46be3cef99c131664c03eb`, baseline `4e622abd`. Scope: the complete 30-file change for employee time off and availability. No source or git-state changes made by this reviewer.

## Decision

- codeQualityStatus: WATCH
- recommendation: REQUEST_CHANGES
- Blocking acceptance item: repair the browser test selector below and complete the required browser verification against the final frozen candidate. No HIGH/CRITICAL product-code defect established by this review.

## Findings

### CRITICAL
None established.

### HIGH
None established.

### MEDIUM
**M1 — Browser validation oracle is ambiguous and stops the required workflow.** `src/test/integration/employee-mobile-planning.integration.ts:39` uses an unscoped `getByRole('alert')`. The real app also exposes Next's route announcer as an alert. The recorded run fails with two matched elements before finishing the workflow. Evidence: `.superpowers/sdd/employee-mobile-planning-plan/browser-first.log`, strict-mode failure at line 39. Scope the assertion to the actual validation error or its form, retain the assertion, and rerun all intended browser engines. This is a test correctness/acceptance gap, not evidence of a broken time-off form. Parent reports a subsequent run and further oracle/fixture corrections; those reports are not accepted as closure until final source and artifacts are inspected.

### LOW
**L1 — Unit tests share a mutated command fixture.** `src/components/employee-mobile/planning-operation.test.ts:5-7`: the immutable-intent test mutates the module-level `c.windows[0].startTime`, so later tests receive a different input depending on earlier execution. Their current invariants still pass, but construct a command per test to preserve test independence. Non-blocking; no false product success demonstrated.

## Scope and reasoning checked

Reviewed strict command and DTO boundaries; own-account reads; actual session/role/workspace admission; availability independence from the time-off module; transaction admission after existing serialization locks; normal availability employee-row lock strengthening; weekly deadline/version/basis checks; existing owner reuse; canonical post-write reconciliation; immutable uncertain commands and missing-only resend; per-selection mounted drafts, explicit merges, empty-week confirmation, lifecycle clearing and focus return. Desktop wrappers and management entry conditions remain scoped. No additional customer-wide capability was found in the new client commands.

The availability fingerprint is used as a concurrency token, not as authorization. Canonical matching hours are treated as current state evidence, not an invented durable operation receipt. These distinctions match the approved plan.

## Skill-perspective check

Consulted `omo/remove-ai-slops/SKILL.md` and `omo/programming/SKILL.md` from the installed 5.1.30 plugin, including behavior-test and overfit criteria. The added tests exercise contract rejection, immutable recovery, actual persisted writes, own-record isolation and deadline refusal. No deletion-only tests, prose/prompt tests, or implementation-constant-only tests found. Strict parsing is justified at the untrusted action/HTTP boundaries; availability comparison/merge is required domain behavior. No unnecessary production extraction/normalization or untyped escape hatch established. M1 and L1 are test-quality concerns under these perspectives.

## Evidence and verification limits

- Independently ran `npx vitest run src/lib/employee-planning.test.ts src/components/employee-mobile/planning-operation.test.ts`: **2 files, 12 tests passed**, 2026-10-27 10:23 AST; execution exit 0.
- Inspected `.superpowers/sdd/employee-mobile-planning-plan/sql-third.log`: six SQL tests passed. Inspected their test source. Did not independently rerun the disposable PostgreSQL suite while the parent's owned runtime was active.
- Inspected the first browser failure artifact directly; no final cross-engine browser acceptance is claimed.
- Parent reports broader unit and newer browser runs, but they were not independently verified by this reviewer. This report does not certify visual quality, real device behavior, deployment, or production authorization.
- `omo-agent-toolkit ulw-loop status --json` returned `ULW_LOOP_PLAN_MISSING`; this report uses the mandated fallback evidence path.

Review closure remains with this reviewer for the listed findings. Final verification against any follow-up commit is still required; this is not approval to push, merge or deploy.

## Finding closure — 2026-10-27, candidate 1b51dbc6

**M1 CLOSED by this reviewer.** Both form validation assertions now use `.locator('.em-planning:visible').getByRole('alert')`; the route announcer is outside this scope. The original assertion remains intact and additional field association assertions were added. Inspected the committed diff and `.superpowers/sdd/employee-mobile-planning-plan/browser-confirmation.log`: execution progressed beyond the former alert failure, then failed separately at line 46 waiting for “Make another request.” That separate failure is not diagnosed by this review and must still be resolved for browser acceptance.

The bounded follow-up diff was inspected for result identity binding, legacy availability union reuse, protected legacy request links, invalid-period association, explicit empty-week merge behavior and midnight support. No new material code finding established. L1 remains explicitly deferred, nonblocking.

Updated code-review decision: **codeQualityStatus WATCH; recommendation APPROVE; blockers []** for the reviewed code. This is code-review approval only. Final browser/QA acceptance is still outstanding and must not be represented as passed. The confirmation log's failed run is retained as evidence; no test or assertion waiver is granted by this approval.
