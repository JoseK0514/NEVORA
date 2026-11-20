# Claude audit integration for Development

Development is the acceptance environment. The approved scope is a single candidate for the completed audit work. The ongoing Puerto Rico leave rules research is outside this candidate. Production promotion requires Jose's separate approval.

## Sources

| Work | Source | Status |
| --- | --- | --- |
| Development baseline | `4f47f214c89a378e9a96dd65700fe05249ee4671` | Contains delegated leave and PTO checkpoints, plus the Puerto Rico accrual implementation with review holds. Preserve this history and its controls. |
| SCRUM-215 Manager publishing and typed review refusals | `a5a3d2b1659733774cdf394759d0f1ed383bf9ab` and handoff `b20c939958161cc27248075befc45722eec13474` | Applied in this worktree. The leave-review reconciliation preserves the existing delegated submitter and Owner-approval checks. |
| Claude's Owner and Manager controls, first-week checklist, and wage screens | `d22e8eaad`, `a1ae27533`, `a87826f68` | Applied in this worktree with their guide text and evidence. The published guide PDFs must be regenerated from the final combined source. |
| Manager-posted open shifts | `3c3dfed9` | [Cloud handoff](codex://threads/6aff8d94-d084-83e8-95d1-de04f2fff0d2). The tested bundle is `/workspace/shared/NEVORA-open-shifts-3c3dfed9.bundle` in that chat. |
| Owner activity log and location addresses | `ef3125d5296a1afe823eb730f3d1621b6346c7e8` | [Cloud handoff](codex://threads/6aff8daf-a360-83ea-82a6-59ad9146a0c1). The tested bundle is `/workspace/shared/downloads/nevora-11/nevora-11-checkpoint.bundle` in that chat. |

The two cloud commits were unavailable in GitHub and the local checkout on inspection. Import their tested source before publishing a candidate tag. Their delivered scope is backend and contracts for Claude. Geofencing is outside the activity and location-address deliverable.

## Verification and publication

TypeScript, 68 focused tests, and 107 tests on a disposable PostgreSQL instance passed on the assembled Manager and Owner changes. Lint passed with the existing warning in the hosted workforce monitor. The live source inventory passed with 76 classified sources and three active branches. This is local evidence for part of the scope.

1. Verify each Git bundle and compare its commit and ancestry with the cloud handoff. Recheck live Development before adding either checkpoint.
2. Allocate the incoming migrations after the latest Development migration. Development already uses `0072` through `0074`. Both detached cloud checkpoints originally chose `0072`. Reconcile bootstrap registrations, migration order and tests without changing existing migration identities.
3. Reconcile source inventory and guide text. Rebuild the six web guides from the combined application commit. Exercise the changed Manager routes and the new backend contracts with the owned database runners.
4. Push one immutable candidate tag under `candidate/backend-completion/`. The tag triggers CI and Mobile Access. Require all ten protected checks at the exact candidate SHA. Confirm the current Development head is its ancestor and the source inventory passes, then fast-forward Development. Check the separate branch-triggered workflows on the delivered SHA.
