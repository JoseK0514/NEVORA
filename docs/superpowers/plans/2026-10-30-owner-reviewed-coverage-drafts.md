# Owner-reviewed coverage drafts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Inline implementation, one fresh whole-slice final review.

**Goal:** Let the Owner save the exact reviewed hypothetical allocation as a guarded draft and explicitly inspect its current outcome.

**Architecture:** Preserve the read-only comparison/model tools. Add pure action contracts, server-owned review/receipt storage and a focused canonical draft batch composed from existing scheduling guards/validation. A separate finite client controller renders review/save/recovery/progress inside the accepted Owner UI.

**Tech Stack:** Existing Next16.4.2/React19.3/TypeScript/Vitest/PostgreSQL; no dependency changes.

**Spec:** docs/superpowers/specs/2026-10-30-owner-reviewed-coverage-drafts-design.md

## Global Constraints

- Base8d948736; detached worktree; preserve shared branches and existing source/evidence.
- Owner-only, existing feature/company/session gates; no model write tools, publication, notifications, paid provider, operational data or remote publication.
- Exact 1–12 terms, five-minute nonrenewing server review, current canonical source and DRAFT-only whole allocation; all-or-none save/receipt.
-44px controls, existing design,320/390/430/desktop and100/200% text; transient private state only.
- Required default suite and affected SQL/browser gates; preserve all failures and original final-review verdicts.

## Review Focus

1. A different Owner/session/company or revoked scope cannot reuse a review or recover private results.
2. Concurrent or lost-response saves cannot duplicate assignments or report a rolled-back batch saved.
3. Changed qualifications, adjacent commitments, rules or publication invalidate the whole review, never regenerate or partially apply.
4. Pause/expiry/late replies cannot revive private review details or discard original ambiguous-operation recovery.
5. A deleted/recreated/released assignment or unpublished draft cannot masquerade as verified published/resolved coverage.

### Task 1: Truthful comparison disclosures and action contracts

Files: coverage-plans.tsx/test, public-coverage-plans.ts, coverage-plan-contracts.ts, coverage-plan.server.ts, fixture; new coverage-actions.ts/test under src/lib/owner-advisor.
Produces: `CoverageDraftTerms`, `CoverageDraftReview`, `CoverageDraftReceipt`, `CoverageDraftProgress`, `CoverageActionCommand`, `parseCoverageAction`; optional new positionId on historical plan projections.
- [ ] Write mixed-publication/workspace-timezone and strict malformed/oversize command tests; run and watch expected RED.
- [ ] Fix exact per-assignment publication/zone, add canonical position IDs with historical-read compatibility, implement pure bounded commands.
- [ ] Run affected component/contracts tests GREEN, static check and commit task.

### Task 2: Exact server review, canonical draft writer and positive progress

Files: new0044 migration and both migration inventories; new coverage-actions.server.ts/test/integration; new src/lib/data/reviewed-coverage-draft.server.ts/test; contracts.ts/service.server.ts/route existing seam tests.
Consumes Task1 contracts; produces server `coverageAction(store,command,signal,env)` and pure canonical `prepareReviewedCoverageDraft` batch composition. No tools.run/parseTool expansion.
- [ ] Write real PostgreSQL RED cases for prepare/apply/check, exact terms, draft-only rollback, expiry, changed source, cross-owner/revocation, duplicate/concurrent/replayed/unknown result, deleted/recreated episodes and later publication.
- [ ] Add migration with workspace/Owner identity, immutable review/hash/expiry, unique save operation and atomic receipt/created episodes; validate missing-schema behavior.
- [ ] Implement current source projection, combined AUTOMATIC validation and canonical guarded DRAFT batch, service dispatch and immutable original recovery before source-dependent checks.
- [ ] Run all Owner SQL and relevant generation/manual-write/authority/migration tests GREEN, static checks and commit task.

### Task 3: Complete review/save/recovery/progress UI

Files: new coverage-actions-controller.ts/test, coverage-actions-response.ts/test and coverage-actions.tsx/test; owning workflows.tsx/advisor.tsx/coverage-plans.tsx/advisor.css seams; new browser journey and existing browser config.
Consumes Task2 public reviewed/saved/checked responses. Produces one finite action controller and focused panel; original parent remains responsible for its own lifecycle.
- [ ] Write RED controller cases for exact selected payload, one explicit confirmation, original UUID recovery, freshness/authority, pause/offline/revocation/late replies, and no duplicate/background business save.
- [ ] Implement strict public parsing, focused workflow states, lifecycle guards, safe origin/context/focus, bounded messages and draft/publication/remaining distinctions.
- [ ] Write/run real Next/login/owned-PostgreSQL browser RED then GREEN: compare→review→save→check, scheduling record inspection, changed-source block, result loss, mobile/enlarged/keyboard/long labels and private retirement. Preserve prior browser scenarios.
- [ ] Run task tests and commit.

### Task 4: Final acceptance and handoff

- [ ] Run full npm test -- --maxWorkers=2 plus all affected Owner/generation SQL and real browser suites, full TypeScript/lint; source-bound final evidence. Environment adapters may not weaken assertions.
- [ ] One batched visual inspection, one combined repair/confirmation. Save exact source manifests, captures and check results outside checkout.
- [ ] Dispatch one fresh whole-slice reviewer with spec/plan/Review Focus/ledger/evidence; retain its original report. Regrade all findings/declined items; one author TDD repair/full gate. Jose's zero-error foundation permits fixing minor UI defects in that same bounded pass. No second review or invented independent PASS.
- [ ] Record complete/blocked status, scope/risks, rulings and source/commit state; preserve worktree/evidence; no push/merge/deployment. Deliver working local source and precise next integration gate.
