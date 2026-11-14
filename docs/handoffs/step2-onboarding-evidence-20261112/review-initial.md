# Step 2 backend code review

- codeQualityStatus: WATCH
- recommendation: APPROVE
- blockers: none for the bounded application diff
- Reviewed base: 242a993897aee4a213a1a9aefdecee2e86394b1f
- Reviewed application head: e792b482a93311094e15a0711fe305f69c7d9634
- Source: /Users/josek0514/.codex/worktrees/nevora-step2-onboarding-20261112
- Report is a code review, not independent release certification.

## Scope and evidence

Inspected the 16-file base-to-head diff, current checkout AGENTS.md, approved November 7 onboarding design, November 11 signup closeout, and November 12 bounded verification plan. The only production behavior change adds exact /api/onboarding/operations/current to the existing commerce exemption. Other changes are fixtures, documentation and tests. No schema, policy or new service is introduced.

The dynamic operations route exports GET only and delegates to the existing provisioning handler. That handler checks signup origin, method, cross-site context and verified signup cookie; the store revalidates the session/environment and scopes operation lookup to its registration ID. The regex remains anchored and does not exempt setup state, people, steps, invitation batches or suffixed paths. No new authentication bypass was found.

Independently ran with a scrubbed environment:
`env -i PATH="$PATH" HOME="$HOME" NODE_ENV=test ./node_modules/.bin/vitest run src/lib/commerce/onboarding-recovery.test.ts src/lib/onboarding/contracts.test.ts src/lib/onboarding/readiness.test.ts`
Result: 3 files, 86 tests passed, exit 0 (November 12, 19:20 local). This result is recorded here directly from tool execution.

Inspected executor artifacts under /Users/josek0514/.codex/nevora-step2-20261112/: recovery-red.log shows the recovery proxy returning 503 before the correction; fixture-red.log shows obsolete reasons/actions. focused-final.log records 290 passing cases; onboarding-final.log records 239 and owned cluster cleanup; company-access.log records 516 and owned cluster cleanup. These are inspected executor logs, not independently rerun database suites. No claim is made that these logs alone establish immutable final-release qualification. No notepad path was supplied. `omo-agent-toolkit ulw-loop status --json` reported ULW_LOOP_PLAN_MISSING, so the fallback report location is used.

## Findings

### CRITICAL
None.

### HIGH / important blockers
None.

### MEDIUM

M1 — Fixture contract assertion bypasses type checking. `src/lib/onboarding/contracts.test.ts:35` passes `result as OnboardingResult` from command-results.json. The test checks status mapping and parses nested snapshots, but does not establish the other result fields conform to the actual union. For example, an absent receipt field can remain undetected while this fixture is offered as a UI contract example. Current inspected examples appear compatible; this is a maintenance/coverage weakness, not a demonstrated runtime bug. Prefer a typed TypeScript fixture (as already used for invitation batches), checked against OnboardingResult, without adding production parsing just for tests.

M2 — Logout case does not exercise another send remaining in the same continuation. `src/test/integration/onboarding-invitations.integration.ts:9-22` starts six targets, sends five, then deletes sessions while delivering the sixth/final target. It proves GET is read-only and later replay/status is denied, but would not detect a regression that caches authorization for the rest of that invocation. Use at least seven targets for the logout portion and assert the remaining target is not sent, or narrow the test/report claim to post-logout replay denial. Existing separate Owner-demotion coverage and inspected per-item guards reduce present regression risk; no production failure is alleged.

### LOW
None beyond the bounded evidence limitations below.

## Skill-perspective review

Loaded remove-ai-slops and programming from the installed OMO 5.1.30 skills, and consulted the TypeScript reference. Applied their overfit and maintainability criteria to production and tests. M1 violates the programming perspective on unchecked type assertions; M2 is a behavior-coverage weakness under both perspectives. No deletion-only, prose-pinning, tautological test, or unnecessary production extraction/parsing/normalization was introduced. Readiness fixture comparisons exercise a real projection from explicit canonical input and protect machine-consumed UI examples; they are relevant rather than removal-only tests. The large invitation fixture is static data with one responsibility, not added production control-flow complexity. No broad refactor is warranted for this bounded correction.

## Declined to judge / next gates

- Hosted signup, actual provider delivery, UI/mobile/keyboard behavior and Claude's presentation acceptance.
- Production/main promotion, deployment authorization, paid resource activation or live data.
- Final combined source-bound build, generated guide artifacts, full-suite/CI qualification and development delivery, which were ongoing outside this review.
- Full backend certification of unchanged services: inspected relevant ownership/readiness/invitation seams, not every existing service.

The checkout initially contained in-progress generated publication changes owned by the parent. They are outside the specified application diff and were not modified by this reviewer. No source, index, HEAD or branch mutations were made. Only this report artifact was written in the primary workspace fallback evidence directory.
