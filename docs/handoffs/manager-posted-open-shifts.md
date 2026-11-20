# Manager-posted open shifts (#8)

## Contract for Claude

The web board is `/app/exchange/open-shifts`. Managers reach it from Schedule.
Employees and Leads reach it from the Open shifts tab in Pick up and swap.
The existing Shift swaps and cover module switch gates the board and API.

`GET /api/open-shifts` requires a current portal session and
`x-nevora-open-shifts: 1`. A successful Employee or Lead response is
`{state: "ready", shifts: OpenShiftView[]}`. It contains only eligible,
future posts. A successful Owner or Manager response also includes
`locations` and `positions` for the posting form. Each catalog item has
`id` and `name`. The management board returns postings at authorized active locations,
with active postings first.

Each shift has `id`, `locationId`, `locationName`, `positionId`,
`positionName`, `date`, `startTime`, `endTime`, and `state`. The state is
`open`, `filled`, `expired`, or `withdrawn`. The list omits claimant and
poster identities. An open posting expires at the shift's start.

`POST /api/open-shifts` requires the same session and intent header,
`x-nevora-actor` with the current session's employee ID, the portal origin,
and JSON. The session determines the actor for each operation.

| Command | JSON fields | Receipt |
| --- | --- | --- |
| Post | `kind: "post"`, client-generated UUID `id`, `locationId`, `positionId`, `date`, `startTime`, `endTime` | HTTP 200 `{state:"posted", id}` |
| Claim | `kind: "claim"`, posting `id` | HTTP 200 `{state:"claimed", id, assignmentId, visibility}` |
| Withdraw | `kind: "withdraw"`, posting `id` | HTTP 200 `{state:"withdrawn", id}` |

Use workspace-local `YYYY-MM-DD` and `HH:mm`. An end time earlier than the
start is overnight. The API accepts `24:00` as an end time. Equal boundaries
and ambiguous or skipped daylight-saving times are invalid.

| Other result | HTTP | Meaning |
| --- | --- | --- |
| `filled` | 409 | Another employee claimed the posting, or management tried to withdraw a filled posting. |
| `expired` | 410 | The posting reached its start time before the operation finished. |
| `withdrawn` on claim | 410 | Management withdrew the posting. |
| `ineligible` | 409 | Eligibility failed. The caller receives `reason`, a scheduling issue code, `SCHEDULE_ARCHIVED`, or `POSTING_TIME_CHANGED`. |
| `conflict` | 409 | A post ID was reused with different terms, or the schedule was busy. |
| `outcome_unknown` | 503 | Retry the same command. |
| `invalid` | 400 | The command, assigned catalog terms, or future time is invalid. |
| `forbidden` | 403 | The caller's current session, role, module, or location authorization does not permit the command. |
| `unavailable` | 404 or 503 | The posting could not be found or the service could not read it. An unauthenticated request receives 401. |

A post retry uses the same UUID and terms. A claim retry by the winning
employee returns the original assignment ID and visibility using only the
posting ID. The receipt survives later scheduling edits. A withdrawal retry
requires the current permission and returns the recorded withdrawn state.

**Posting and withdrawal authorization.** An Owner uses existing company
authority. A Manager needs both current operational scope covering the
posting's location and the active, role-generation-bound
`PUBLISH_SCHEDULE` grant at that location. Company-wide operational scope
alone does not grant posting or withdrawal. The mutation checks this authority
again after acquiring its locks.

**Claim assignment.** The transaction rechecks qualifications, location,
availability, firm restrictions, approved leave, overlap, and configured
hours limits against the shared scheduling rules. It records the claim and
creates one regular `shifts` assignment atomically. In a published location
week, or when the location has no schedule yet, `visibility: "published"`
means the claim is immediately published through the normal revision and
notification pipeline. If the location already has a draft, `visibility:
"draft"` means the claim is confirmed and the assignment joins that draft.
It appears on the employee's schedule when the location week is published.
The claim leaves other draft entries and pending edits in their existing
publication state.

## Integration

Apply `db/migrations/0075_manager_open_shifts.sql` to each authorized company
database before the application starts serving this feature. Fresh workspaces
pick it up from the canonical migration order and bootstrap manifest. The
migration is additive and requires no historical data backfill. The integrator
owns migration ordering against sibling work and the combined test gate.
The existing SCRUM-215 owner retains Manager publishing and review.

Use the checkpoint's PostgreSQL tests with the owned, loopback-only runner:

```sh
NEVORA_TEST_PG_BIN=/path/to/postgresql/bin node scripts/payroll-postgres.mjs vitest.exchanges-integration.config.mts
```

The new cases are in `src/test/integration/open-shift-changes.integration.ts`.
Use `open-shift-changes` as the runner's final argument to select them.

The isolated checkpoint is based on `origin/development` at `e0e8efe9`.
The full exchange suite passed all 192 PostgreSQL tests on rerun, including
nine open-shift tests. The focused Schedule, Exchange, employee requests,
scheduling validation, and migration-order run passed 90 tests. Type checking,
lint, and the onboarding manifest check passed. The initial broad run recorded
one manual-edit versus coverage-acceptance race failure. The isolated race file
then passed all 36 tests and the failure did not recur in the full rerun.

The development source inventory reported an advanced
`claude-codex-collab-nevora` head. Reconcile that source in the combined
assembly. The release condition for this checkpoint is the company migration
and the matching provisioner manifest.
