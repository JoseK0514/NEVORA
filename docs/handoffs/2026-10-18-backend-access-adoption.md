# Backend Company & Access adoption — October 18, 2026

Status: local backend consolidation complete with targeted verification. Final Claude UI adoption and comprehensive combined application testing remain pending.

## Scope and source

- Branch: `codex/nevora-single-company-assembly-20261017`.
- Assembly parent: `0c2ba84a1d4b2afdd3de212ecd00e5ebd0598805`.
- Accepted Company & Access parent: `501762d5cd2a6546dec1fdb9e7c81a7ad97505e2`.
- Runtime change: only `src/components/company-access/scoped-read-frame.tsx`, adopted byte for byte from the accepted parent.
- Accepted component SHA-256: `836f537e14a8ae58ad662c25c03b5b41b0e09a12a64de957ae841665c7cdd912`.
- The merge commit identity and final tree are recorded in the existing [assembly candidate record](/Users/josek0514/Documents/Codex/2026-10-12/1-full-application-inspection-business-analyst/outputs/assembly/single-company-20261017-01/CURRENT_CANDIDATE.json).

An initial scoped page keeps its original refresh behavior. Recovery of a previously accepted view uses the current pathname, query and section fragment with scroll preservation, so an unfinished action cannot indefinitely hold the recovery refresh. Existing authority, server-clock cutoff, expiry, retirement and stale-response barriers are retained.

The existing fresh-company setup correction, its PostgreSQL regressions and their configuration are unchanged from the assembly parent. No server, SQL, payroll calculation, permission, dependency or asset change was added by this adoption.

## Checks actually run

- Existing recovery callback/barrier checks: 18 passed, zero failed or skipped. The original checker is unchanged; its single candidate file path was redirected in memory to this assembly checkout. Cases cover initial refresh, path/query/hash retention, paused/refreshing/denied/inactive states, repeated observations, authority mismatch, cutoff, expiry and stale responses.
- Existing application tests: 39 passed across four files: company-access commands, schedule edit page, operational page composition and company setup.
- Whole-project typecheck with incremental cache disabled: passed.
- Changed-component ESLint with cache disabled: passed.
- Source integrity: the one runtime file equals the accepted source exactly; all three setup correction/test/config files equal the assembly parent; no unrelated staged or unstaged source change was present.

Commands, raw outputs and source bindings are retained in [CHECKS.json](/Users/josek0514/Documents/Codex/2026-10-12/1-full-application-inspection-business-analyst/outputs/assembly/single-company-20261017-01/access-adoption-20261018-01/CHECKS.json).

## Prior acceptance and limits

The independent [Company & Access final local acceptance](/Users/josek0514/Documents/Codex/2026-10-12/1-full-application-inspection-business-analyst/outputs/company-access/independent-company-access-finish-20261015-01/final-gates-resume-20261015-01/CA_FINAL_LOCAL_ACCEPTANCE_20261017.md) accepts CA01–CA12 and closes NVA004 within its original exact local scope. Its [owner handoff](/Users/josek0514/Documents/Codex/2026-10-12/1-full-application-inspection-business-analyst/outputs/company-access/company-access-finish-20261015-01/COMPANY_ACCESS_FINAL_HANDOFF_20261017.md) is preserved. Earlier failed runs remain historical failures. This adoption does not rewrite independent findings or confer independent acceptance on the combined candidate.

The fresh checks are targeted models, units, composition, type and lint checks. Composition mocks the scoped frame. No fresh browser/native lifecycle run, PostgreSQL run, broad application suite, production build, hosted validation or deployment was performed for this one-file adoption. Existing exact-source browser/native and setup SQL evidence is referenced with its original limits.

## Accountability and next gate

Engineering recommends the exact accepted correction; Security preserves current authority/privacy barriers; Program Delivery records bounded backend consolidation, with final UI pending. Governance release impact: CONDITION — combined UI and release gates remain open. No exception or new Jose decision is requested.

Codex owns this completed adoption. The existing assembly owner receives Claude’s final UI commit next, recomputes overlapping changes and verifies the combined version. The earlier UI comparison is preparation against an older UI commit, not current conflict or acceptance evidence.

This step stops after the local merge and recorded results. No push, shared development/main promotion, UI adoption, production deployment or activation of held/paused modules is part of it.
