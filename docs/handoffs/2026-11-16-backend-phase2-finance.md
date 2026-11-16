# NEVORA backend — Phase 2 financial contracts

November 16, 2026 (America/Puerto_Rico). Status: implementation in progress; no completion or release acceptance claimed.

## Starting gate and ownership

Baseline: `edce7661c211aba588f29bd6d56327fabdc11b47`, obtained from Phase 1's actual `docs/handoffs/2026-11-16-backend-phase1-baseline.md` in `/Users/josek0514/.codex/worktrees/nevora-backend-phase1-20261116`. Phase 1 identifies that source as its completed combined baseline. This separate managed worktree starts at that exact SHA: `/Users/josek0514/.codex/worktrees/nevora-backend-phase2-20261116/Fuel Scheduler`.

Before implementation, checked the Phase 1 worktree (only its new baseline/evidence documents), the existing readiness integration worktree (clean at the baseline), and the active product-assessment worktree (only its own plan/outputs). None modifies these financial implementation paths. The current chat inventory identifies the payroll and billing delivery chats as idle. Phase 1 explicitly owns source/evidence, not new financial implementation. Other owners' work and uncommitted files are preserved. No inter-chat message was sent.

Exact Phase 2 ownership, recorded before source/test edits:

- `src/lib/payroll-export/command.ts` (new pure command contract; compatible service re-export)
- `src/lib/payroll-export/batches.ts` (new byte-aware planner and receipt coverage)
- `src/lib/payroll-export/batches.test.ts`
- `src/lib/payroll-export/errors.ts`
- `src/lib/payroll-export/model.ts`
- `src/lib/payroll-export/model.test.ts`
- `src/lib/payroll-export/service.ts`
- `src/lib/payroll-export/service.test.ts`
- `src/app/api/payroll-export/route.test.ts`
- `src/test/integration/clocker-payroll-export.integration.ts`
- `src/lib/payroll/phase2-contract-fixtures.test.ts` (new)
- `docs/handoffs/2026-11-16-backend-phase2-finance.md` (this handoff)
- `docs/handoffs/2026-11-16-backend-phase2-claude-contract.md` (new)
- `docs/handoffs/2026-11-16-backend-phase2-finance-fixtures.json` (new)
- `docs/handoffs/2026-11-16-backend-phase2-evidence/verification.json` (new)
- `docs/handoffs/2026-11-16-backend-phase2-evidence/review.md` (new)

No presentation, scheduler, shared authentication/session, source-inventory, migration/registry, Phase 1 documentation or deployment ownership. No schema change is planned; any discovered shared dependency will be recorded here for its existing owner.

## Bounded implementation and evidence plan

Preserve the already delivered paid-break review, exact cents, all-roster population, immutable receipts, server authority and billing transitions. Reproduce remaining defects before repair. Add practical employee batching measured on exact encoded request bodies, with explicit incomplete coverage and the existing authoritative period-close manifest. Separate deterministic pre-write mapping/finalization refusal from uncertain post-write recovery. Verify both existing import formats/corrections and billing with fictional fixtures and owned disposable PostgreSQL. Supply Claude complete contracts and synthetic fixtures. No provider calls, messages, charges, hosted tests, publication or Phase 3.

Engineering: smallest financial-module changes. Security: existing current Company/role/session guards stay authoritative. Technical assurance: a batch receipt cannot establish whole-period completion. Delivery: return reviewed local commits to the existing integrator. Governance: no exception or activation requested; Development remains the acceptance line, and main/production requires Jose's separate approval.
