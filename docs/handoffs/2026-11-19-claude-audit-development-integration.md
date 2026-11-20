# Claude audit integration for Development

Development is the acceptance environment. The approved scope is a single candidate for the completed audit work. The ongoing Puerto Rico leave rules research is outside this candidate. Production promotion requires Jose's separate approval.

## Sources

| Work | Source | Status |
| --- | --- | --- |
| Development baseline | `4f47f214c89a378e9a96dd65700fe05249ee4671` | Contains delegated leave and PTO checkpoints, plus the Puerto Rico accrual implementation with review holds. Preserve this history and its controls. |
| SCRUM-215 Manager publishing and typed review refusals | `a5a3d2b1659733774cdf394759d0f1ed383bf9ab` and handoff `b20c939958161cc27248075befc45722eec13474` | Applied in this worktree. The leave-review reconciliation preserves the existing delegated submitter and Owner-approval checks. |
| Claude's Owner and Manager controls, first-week checklist, and wage screens | `d22e8eaad`, `a1ae27533`, `a87826f68` | Applied in this worktree with their guide text and evidence. The published guide PDFs must be regenerated from the final combined source. |
| Manager-posted open shifts | `3c3dfed9bb6c399b166c4e4efc17f0ec1dbe62ee` | Verified `archive/checkpoints/2026-11-19/manager-open-shifts-3c3dfed9` against the [Cloud handoff](codex://threads/6aff8d94-d084-83e8-95d1-de04f2fff0d2). Applied with migration `0075_manager_open_shifts.sql`. |
| Owner activity log and location addresses | `ef3125d5296a1afe823eb730f3d1621b6346c7e8` | Verified `archive/checkpoints/2026-11-19/owner-activity-address-ef3125d5` against the [Cloud handoff](codex://threads/6aff8daf-a360-83ea-82a6-59ad9146a0c1). Applied with migration `0076_location_addresses.sql`. |

The cloud checkpoints share Development ancestor `e0e8efe9`. Both used the next open migration number, `0072`, on their original base. The joined source keeps Development's existing `0072` through `0074` and regenerates the bootstrap manifest from the canonical SQL order. The activity log and address editor UI remain with Claude. Apply both new migrations independently to authorized company databases before deploying the corresponding readers.

## Verification and publication

TypeScript, 77 focused tests, 12 runtime entrypoint inventory tests and nine open-shift PostgreSQL tests passed on the joined source. Lint passed with the existing warning in the hosted workforce monitor. The live source inventory passed with 76 classified sources and three active branches. The local migration suite passed 19 of 20 cases. Its restore case needs `pg_dump` and `pg_restore` from the full PostgreSQL distribution used by GitHub Actions.

1. Rebuild the six web guides from the combined application commit.
2. Push one immutable candidate tag under `candidate/backend-completion/`. The tag triggers CI and Mobile Access. Require all ten protected checks at the exact candidate SHA. Confirm the current Development head is its ancestor and the source inventory passes, then fast-forward Development. Check the separate branch-triggered workflows on the delivered SHA.
