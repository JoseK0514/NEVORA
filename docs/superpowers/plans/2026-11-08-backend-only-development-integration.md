# Backend-only development integration plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate independently usable backend changes into development while preserving Claude's UI work.

**Architecture:** Extract selected server/domain changes from frozen collaboration d349b661 onto development e2872f30. Reuse existing guarded readers and optional domain contracts. Hold UI-dependent activation; correct source-lifetime and window-boundary issues with regressions.

**Tech stack:** Node24.19.0, TypeScript, Vitest5.0.5, PostgreSQL owned fixtures.

**Spec:** [Backend integration scope](../specs/2026-11-08-backend-only-development-integration.md).

## Global constraints

- Existing development/main/collaboration branches only; detached isolation.
- No UI/page/style/navigation/copy or UI-harness changes.
- No database migration, customer data, real provider send or production operation.
- No mandatory guard/test weakening; keep failed evidence and distinguish local/CI/deployed.
- A partial extraction does not mark the entire collaboration source included.

## Review focus

- Incoming pending swaps appear once; sender and decided-recipient history stay visible (Task1).
- Previous-week timecards retain their exact periods, exclude finalized/empty records and require all sources ready (Task2).
- The shortest source lifetime, including previous-week cards, bounds the aggregate (Task2).
- Overnight and 24:00 coverage boundaries are canonical; older helper callers retain prior semantics (Task2).
- Server badge and current UI counts must not diverge from activating only one side of the clock contract (Task2/3).

## Task 1: Employee Requests deduplication

**Files:** `src/lib/data/employee-requests.server.ts`, its existing unit test,
`src/test/integration/shift-change-views.integration.ts`.

**Interfaces:** Keep `readEmployeeRequests(proof, executor)` unchanged. Add the
source's pure `ownShiftActivity(row, own)` filter without changing authorization.

- [ ] Add upstream unit cases and an actual SQL scenario: propose a future swap,
  assert recipient incoming=1/recent excludes it, sender recent includes it;
  cancel and assert recipient incoming=0/recent includes decided history.
- [ ] Run the unit/SQL cases before implementation; expect the recipient duplicate
  or missing-helper regression to fail, retaining the output.
- [ ] Apply only the selected server filter from d349b661.
- [ ] Run the same cases; expect all pass, plus existing scope/error checks.
- [ ] Commit Task1 and record its exact range/results in the ledger.

## Task 2: Action-center sources and optional timing contract

**Files:** `src/lib/action-center/{service,inbox,needs-you}.ts`,
`src/lib/assistance/manager-actions.ts`, their focused unit tests and
`src/test/integration/clocker-action-center.integration.ts`.

**Interfaces:** `readActionCenter` keeps its current response envelope. Combine
the previous and current week's canonical timecard rows, keeping exact periods.
`ManagerActionItem.endDateTime?`, `workspaceNow(observedAt, zone)`, and optional
clock arguments are additive; existing callers need no changes.

- [ ] Add tests before implementation: include previous-week work, reject a failed
  added source, and limit the actual aggregate by its shorter source lifetime.
- [ ] Add boundary tests for today-end equality, active overnight windows from
  yesterday, next-day midnight for 24:00, and unchanged no-clock callers.
- [ ] Run and retain expected RED results.
- [ ] Apply selected source changes, correcting previous-period lifetime handling
  and canonical boundary behavior. Preserve all company/session/source guards.
- [ ] Leave `src/lib/data/inbox-count.server.ts` and all UI paths unchanged.
- [ ] Run focused tests and owned action-center SQL; expect all pass.
- [ ] Commit Task2 and record results/rulings.

## Task 3: Reconcile, verify and integrate

**Files:** development source inventory, this plan/spec and a dated backend
handoff/evidence receipt. No runtime configuration changes.

- [ ] Record selected/inherited/held paths and current immutable source heads;
  retain collaboration as held with partial backend extraction documented.
- [ ] Run full `npm test -- --maxWorkers=1`, typecheck, lint, build without
  inherited database/provider settings, and relevant SQL suites on owned data.
  Existing UI component tests must pass without UI-source edits.
- [ ] Obtain one fresh-context code review of the whole candidate per the inline
  execution skill. Fix any Important/Critical findings with RED→GREEN proof.
- [ ] Re-fetch; inspect any drift, rerun the source gate, verify main/collaboration
  unchanged by us, and push only `HEAD:development` without force.
- [ ] Observe exact-candidate required CI and publish a handoff distinguishing
  pushed/local-tested/CI-tested from deployment; existing staging stays unchanged.

## Execution rulings

Jose's request authorizes this bounded integration into development. Execute
inline without another plan-approval round. The original linked worktree carries
the frozen native/operational history; the app-managed detached worktree starts
from fresh development and preserves that original state.

Baseline: 28 focused tests passed. The source gate initially reports the expected
advanced collaboration branch; reconcile its recorded head only after selection.
Offline dependency install lacked a cached package; normal prefer-offline install
completed. npm's existing install-script restrictions were retained.
