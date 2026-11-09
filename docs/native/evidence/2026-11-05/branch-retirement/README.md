# Authorized remote branch retirement — November 5, 2026

Jose authorized these three remote retirements, preserving all local work, and instructed holding paid hosting. Owner: Codex/root.

| Retired remote branch | Exact archived commit |
| --- | --- |
| `AI-owner` | `1e0cf1bf33c85cf19e35c56ba9fa5925aedebb64` |
| `claude/employee-mobile-phase2-20261027` | `4a68e5c8db9e8c266fec41fd35d659c2db96f6c8` |
| `codex/release1-db-rehearsal-20261101` | `fb7da7628455434e221e131d81ae417b407162c6` |

Each has an exact lightweight local and remote tag under `refs/tags/archive/branches/2026-11-05/<branch>`. Tags were atomically pushed, directly read back before deletion, then the three approved remote heads were atomically deleted. Both dry runs and actual pushes exited 0. No force option was used. Recovery is by these tags; recreating a branch requires new Jose authorization.

A temporary per-command pre-push guard required the exact destination, full ref set and old/new SHA for each phase, rejecting unknown/missing/duplicate refs or changed heads. It would chain an existing executable hook; the original effective hook was absent. No persistent Git configuration changed. Twelve executor fixtures passed; the single fresh code review passed 18 independent checks with no blocker (WATCH/APPROVE). The executor checked hook state and exact archive readback before retirement. This is code review, not independent QA certification.

`verification.json` records direct remote/local post-action comparison: all four local branch refs and all 135 existing worktree heads/paths unchanged, protected remote heads unchanged, all archive SHAs exact and the three retired branches absent. No local cleanup, source integration, PR update, application-code push or deployment occurred. Draft PR37 was preserved.

During cleanup, a new remote head `claude/youthful-mendel-9mg8hu` appeared at `28c98b79aca42f5796bb68a4984cab6dbc38bc30`. It contains the held Owner Direction B collaboration history plus a one-file schedule-label commit. It is outside this authorization and remains held/preserved. Collaboration also advanced to `875ceda86ab97f2f46fa3370eb5d0af744daf5a8` before protected-head capture; its four unique commits remain held. The shared source gate therefore remains FAIL: four remote heads exceed three. The inventory records the observed heads; the limit is not relaxed.

CTO retains the development-synchronized native candidate; CISO requires bounded exact-ref mutation and local custody; governance retains the three-head release gate; delivery allows isolated local testing under the approved design. No risk/policy exception or production authorization is inferred. Paid hosting is explicitly ON HOLD: no paid resource, subscription, cloud secret or deployment was created. Next: free owned-local Android/iOS requalification. Shared release requires source-owner reconciliation of the new branch; hosting requires a future explicit decision. Evidence for operational guard, dry runs and pushes is retained privately at `/Users/josek0514/.codex/native-runtime/nevora-branch-retirement-20261105`.

Verification: inventory unit checks returned 12 passed / 1 failed. The published-snapshot assertion expects only main/development without archive refs; it already fails against pre-retirement commit `5436eb28` (six non-archived sources). Its assertions are unchanged. The actual source check now reports only `Remote branch ceiling exceeded: 4 > 3`. This old snapshot test and the live four-head gate remain disclosed blockers; neither is suppressed. JSON parsing and `git diff --check` passed.
