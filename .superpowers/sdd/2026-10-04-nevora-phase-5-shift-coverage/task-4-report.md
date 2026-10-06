# T04 report — expiry, escalation and notification lifecycle

Owner: phase5_task4. Date: 2026-10-04. Assigned worktree only: `/Users/josek0514/.codex/worktrees/nevora-phase-5-shift-coverage/Fuel-Scheduler-`. Branch `codex/nevora-phase-5-shift-coverage`; HEAD remains `6c0f2b77b6186c4cd86db7e97f869ea831ee32b0`. Prior T01–T03 changes preserved. No commit, index write, push, merge, deployment, customer/existing database migration, real delivery, provider/trigger activation, paid service or child agent. Canonical migrations unchanged in this task.

Read task-4-brief/handoff first, applicable AGENTS, Superpowers TDD and writing-good-tests, personal bug-investigator skill, package scripts, actual shared contracts/source/tests, approved spec sections 8/9 and listed acceptance cases. Root explicitly authorized the additional bounded callout-versus-ordinary-participation correction after identifying the specification 5.3 gap; it is separately reported below. Product/test source is frozen at completion for independent review. Evidence root: `/Users/josek0514/.codex/visualizations/2026/10/04/nevora-phase5/task4/`; exact final 24-file SHA-256 manifest: `source-freeze.json`.

## Delivered behavior and produced interfaces for T05/T06

- `src/lib/shift-changes/maintenance.ts`: pure `projectShiftChangeState(snapshot, now): EffectiveRequestState`, `planShiftChangeMaintenance(snapshot, now, notificationPolicy): readonly MaintenanceIntent[]`, exported input/result types. Input records current workflow policy separately from recorded completion deadline. Existing requests remain actionable after creation cutoff; the earlier recorded/current completion deadline and earliest affected start wins. Exact boundary expires. Unknown/invalid rules do not become zero. Even malformed current terms cannot revive an already elapsed recorded deadline. Terminal records remain terminal; callouts remain reportable beyond trade cutoff/start.
- `src/lib/data/shift-change-maintenance.ts`: trusted server `runShiftChangeMaintenance({executor,clock,config,cursor?,limit?}): Promise<MaintenanceReport>`. Requires explicit active workspace-bound config. Maximum 50 candidates per invocation (default 10), stable ordered request cursor, wall-clock budget and three recognized-conflict attempts. `nextCursor` is the last completed cursor; null completes a cycle; empty string with conflicts means retry the first page without a cursor. The caller must continue returned cursors and restart without one after completing the cycle. No scheduler was installed/activated.
- Each mutation uses the existing complete-source reader, parent/workspace/week/table lock order and fresh exact source guard. A trusted-clock/database-observation elapsed-time guard runs after lock waits and again before commit; expired work is resolved before invitation/escalation. Retries reread facts and policy. Expiry updates status/revision, releases participation via existing trigger, appends immutable system event and cancels old action intents/delivery leases atomically. It does not assign/unassign staff, publish a schedule or change revision/ack state.
- System events have `actor_employee_id=NULL`, `outcome_mode=SYSTEM`, safe outcome reason and lifecycle stage in event participants. No employee/session proof is fabricated. Initial and urgent escalation stages are independently consumed from immutable events. Unknown mandatory prerequisites, no verified eligible candidates and no volunteers are separate private management diagnostics. `URGENT_UNCOVERED` requires a current approved callout release; an ordinary voluntary offer keeps its assignment and records `NO_VOLUNTEER`.
- `readShiftChangeMaintenanceSnapshot(requestId,kind,executor,now?)` is a coherent **private server** source, not a client response. It contains raw history, scheduling rules and current eligible IDs; do not serialize it. `maintenanceExchangeSource` provides the notification source projection. `ShiftChangeCandidateSnapshot = Omit<ShiftChangeSnapshot,'actor'>` and `evaluateCoverageCandidates` reuse the existing pure assignment evaluator without a worker identity. `rankShiftChangeCandidates` still applies the shared fairness comparator and now supports reviewed release authority; candidate evaluation never supplies consent or command authorization.
- `ExchangeRecord` now includes optional `actionable`, `effectiveCompletionDeadline`, and `attention`. Existing exchange SELECT/map paths derive effective state from database observation time and compare current source/target owner, episode, material terms and publication using canonical SQL terms. GET reads perform no scheduling writes. This is **lifecycle** actionability, not a particular viewer's eligibility. T05 must combine it with current actor eligibility/session authorization, display expired records returned by older status-filtered lists truthfully, and align effective counts/controls. Private manager diagnostic projection can use the system snapshot through an authorized server adapter; do not return peer rule/profile details.
- New exchange/callout event sources use `r:<request_revision>`. Time-off remains status-versioned. Explicit legacy status readers accept original revision-one status events; later same-status revisions cannot revive an old status event. Same-status revised events are no longer dropped. Cancellation includes all earlier revision versions and legacy status action rows; current and later revisions are preserved. A still-open invitation may remain valid across a same-terms escalation revision only after fresh current terms, audience, access and deadline validation; it does not become a new campaign.
- OPEN coverage invitations use current shared eligibility at guarded materialization, dispatch, open and final acceptance. Safe invitation copy carries date/time/location plus known position and Lead responsibility. Lock-screen payloads use generic copy and never expose the absence reason. New notification kinds were explicitly added to the push envelope allowlist; tests discovered that adding a template alone would leave delivery silently retried without sending.
- Invitation and manager-attention identities use semantic assignment need (shift ID, ownership episode, material revision) instead of new request IDs. Explicit reoffers create a new closed-history-linked request through `prior_request_id` and retain the old semantic invitation budget. Duplicate ticks report only genuinely new invitation IDs, not attempted upserts.
- Completion coalesces request/publication EVENT notifications only for the same assembled command transaction and same recipient. Internal publication revisions, revision-shift records, acknowledgement semantics and later reminders remain. No unrelated pending notification is deleted to achieve coalescing.
- Worker dispatch rechecks the current intent/source after subscription/decryption IO immediately before provider handoff, recalculates expiry/TTL and quiet-hour deferral. An already claimed or initially validated invitation cancelled before that check cannot reach the fake provider. There remains the unavoidable external transport race after the final check; no database/provider atomicity or device-display guarantee is claimed.
- Authenticated reminders **POST** runs maintenance before delivery enablement, so disabled push flags do not prevent business expiry. GET keeps the existing notification-only behavior without new scheduling writes. The route validates optional `cursor` only after worker authentication; CLI accepts `notifications:worker reminders [cursor]`. Routine quiet hours, five-minute collection and twelve-hour urgency all come from existing workspace-bound `notificationPolicyFor`; no labor-policy defaults were introduced.

## Additional bounded R02 callout integration correction

The previous SUBMIT_CALLOUT loop only closed stale linked coverage. An ordinary open coverage offer or either side of a trade held the participation key, so a genuine report returned conflict and disappeared. Genuine SQL RED reproduced all three cases.

The same command transaction now closes active incompatible ordinary source/target participation, appends a cancellation with **original** source/target terms and participants, cancels its action notifications, then inserts the private callout and transfers the participation guard to it. Completed winners and current approved absence are not silently undone. Existing stale-linked behavior remains. Both the closed request's live source **and target** location access are independently checked; the callout slot is not substituted for the old trade context. If acceptance commits first and the reporting employee no longer owns that slot, reporting that old slot returns unavailable rather than reviving ownership. The employee can report any currently owned assignment through the normal fresh request path.

Actual SQL tests cover ordinary coverage, source-side trade, target-side trade, cross-location access removal, exact original history/episode, private-note exclusion, and injected rollback after all assembled work. Rollback compares the complete raw source (including requests, events, operations, assignments, publications and participation) and full outbox. Controlled request-specific transaction barriers test report-first and acceptance-first ordering with actual PostgreSQL lock waits; no involuntary reassignment or completed-winner reversal occurs.

## Exact T04 files

New files:

- `src/lib/shift-changes/maintenance.ts`
- `src/lib/shift-changes/maintenance.test.ts`
- `src/lib/data/shift-change-maintenance.ts`
- `src/lib/data/shift-change-notification-versions.test.ts`
- `src/test/integration/shift-change-notifications.integration.ts`

Modified shared/product files:

- `src/lib/data/request-notifications.ts`, `notification-state.ts`, `notifications.ts`, `exchanges.ts`, `shift-changes.ts`, `shift-change-history.ts`, `notification-transactions.ts`
- `src/lib/notifications/types.ts`, `recipients.ts`, `destinations.ts`, `payloads.ts`, `worker.ts`
- `src/lib/assistance/notification-events.ts`
- `src/lib/scheduling/shift-change-evaluation.ts`
- `src/app/api/internal/notifications/reminders/route.ts`
- `scripts/fuel-notification-worker.ts`

Modified tests: `src/app/api/internal/notifications/worker-routes.test.ts`, `src/lib/data/exchanges-notifications.test.ts`, `src/test/integration/shift-changes.integration.ts`. The cancellation expectation now requires the approved peer cancellation outcome. T03 R1 SQL assertions now select `r:2` plus the exact DENIED notification kind; their original-recipient, private-history and exact-assignment assertions remain intact. This scratch report is the only handoff document this task owns; root owns the ledger/checkpoint.

## Actual evidence, commands and exits

All logs append numeric `PROCESS_EXIT` from the actual subprocess. An outer Python runner's zero exit is not used as test evidence. SQL factories used owned PG `127.0.0.1:6546`, user `phase5_owner`; ownership evidence is `../owned-postgres/ownership.json`. Every SQL invocation unsets DATABASE_URL, supplies a fresh permitted database name, sets destructive teardown=yes and all three PUSH_FEATURE_ENABLED/PUSH_DELIVERY_ENABLED/PUSH_TEST_DELIVERY_ENABLED flags=false. The factories verify unique database ownership/OID and drop only their newly created database. Cluster preserved for T05/T06. No `.env` or customer credentials were read.

Canonical final command shape:

`env -u DATABASE_URL FUEL_TEST_DATABASE_URL=postgresql://phase5_owner@127.0.0.1:6546/nevora_exchange_test_task4_finalfreeze FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN=yes PUSH_FEATURE_ENABLED=false PUSH_DELIVERY_ENABLED=false PUSH_TEST_DELIVERY_ENABLED=false npm run test:exchanges:integration -- src/test/integration/shift-change-notifications.integration.ts`

| Command | Log | Actual result / source scope |
| --- | --- | --- |
| `npm test` | unit-final.log | exit0, 121 files / 1302 tests; final shared lifecycle/worker/command implementation before the final known-position invitation-copy assertion/helper |
| `npm run test:exchanges:integration` | sql-final.log | exit0, 7 files / 96 tests; includes T03 R1 r:2 selector update and all then-existing T04 scenarios |
| `npm run test:notifications:integration` | notifications-all1.log | exit0, 77 tests; worker/outbox integration after double source validation; preceding final invitation-copy and prior_request_id additions |
| `npm run test:generation:integration` | generation-final.log | exit0, 3 files / 144 tests |
| eight-file focused Vitest command below | focus-freeze.log | exit0, 8 files / 137 tests on final invitation-copy behavior |
| `npm run test:exchanges:integration -- src/test/integration/shift-change-notifications.integration.ts` | sql-finalfreeze.log | exit0, 29 tests on final source, including final linked-release privacy and request-specific race barriers |
| `npm run typecheck` | typecheck-finalfreeze.log | exit0, final source |
| `npm run lint` | lint-finalfreeze.log | exit0, final source |
| `git diff --check` | diff-finalfreeze.log | exit0, final source |

Focused command: `npx vitest run src/lib/data/shift-change-notification-versions.test.ts src/lib/shift-changes/maintenance.test.ts src/lib/notifications/recipients.test.ts src/lib/notifications/payloads.test.ts src/lib/notifications/worker.test.ts src/lib/data/exchanges-notifications.test.ts src/lib/data/callouts-notifications.test.ts src/app/api/internal/notifications/worker-routes.test.ts`.

Full exchange used `nevora_exchange_test_task4_final`; generation `nevora_generation_test_task4_final`; notification `fuel_phase3_test_task4_all1`. Earlier/focused database suffixes are in log names and the preserved command evidence. The final focused test total extends the earlier full-run total; this report does not claim the entire suite was rerun after the last one-test copy addition or two final integration enhancements.

### Genuine RED and development failures retained

- versions-red.log: two real failures, status vs r:2 and dropped same-status event, exit1.
- projection-red.log: four real deadline/projection/expiry-order assertions, exit1.
- sql-red.log: two actual SQL assertions, open status after expiry and no invitations, exit1.
- read-coalesce-red.log: two actual SQL assertions, duplicate completion message and unprojected expiry, exit1.
- worker-red.log: disabled delivery prevented expiry, exit1.
- stale-red.log: three genuine stale owner/material/publication projection failures plus a fourth contaminated fixture after the publication assertion interrupted cleanup, exit1. unknown-red.log reran the unknown-rule scenario alone and proves the real NO_ELIGIBLE_CANDIDATES-versus-CONFIGURATION_REQUIRED error.
- urgent-red.log: voluntary offer incorrectly labeled URGENT_UNCOVERED, exit1.
- same-state-red.log: queued invitation disappeared after same-status escalation, exit1.
- report-red2.log: three genuine ordinary/source-trade/target-trade reports return conflict rather than pending, plus injected rollback reaching the prior participation conflict, exit1. This is distinct from T03's stale-linked correction.
- cross-red.log: wrong closed-trade target-location recipient and no current callout manager seed, exit1.
- cursor-red.log: duplicate tick reported two new invites despite no new durable intent, exit1.
- stages-red.log: initial escalation incorrectly consumed later urgency stage, exit1.
- link-red.log: explicit reoffer prior_request_id remained NULL, exit1.
- boundary-red.log: malformed current time revived elapsed recorded expiry, exit1.
- invitation-copy-red.log: known required position missing from invitation context, exit1.
- provider-red.log/debug logs retain fixture development errors (wrong environment, invalid direct tombstone update); these are not cited as valid behavior RED. provider-red2/debug2 show valid claimed delivery released without sending because the new invitation type was absent from the envelope allowlist. provider-red3 proves a transport call after cancellation between source checks; the additional subscription-count failure in that run came from skipped teardown after the first failed assertion. Final fake-provider scenarios assert a real claim, zero sends for both cancellation windows, and accepted provider outcome without claiming an assignment.
- races-green.log is an early test parse failure, exit1, not green evidence. races-green2.log is the repaired 17-scenario pass. Final barriers specifically gate the intended request transaction, avoiding another pending request accidentally determining the race order.
- unit-all1.log: 1297 passed / 1 failed, old cancellation test expected no peer outcome. Updated to the approved cancellation notice. unit-all2.log subsequently1301 passed. sql-all1.log:93 passed /3 failed, old R1 status-version SQL selectors. Replaced with r:2 plus exact outcome type; original recipient/privacy assertions retained. typecheck4.log exit2 was TypeScript narrowing across a closure; fixed by capturing targetShiftId, with later clean typechecks.

## Scenario evidence and limits

Pure maintenance tests cover A053/A055/A087 completion versus submission, exact-before/at/after boundary, tighter/looser independent workflow policy A089, NULL versus explicit zero and late callout A088, expiry before invitation/escalation, stage suppression, ordinary urgency classification and invalid current boundaries.

Final29 owned-SQL T04 tests cover A056/A060 duplicate ticks and atomic system expiry; A058/A061/A069 eligible invitation/current dispatch-open-accept revocation; A062 coalescing with real publication records; A055 read-only expiry and owner/material/publication staleness; A070/A071 disabled delivery plus real claimed/fake-provider outcomes; A059/A086 unknown prerequisites; A064 same-state validity, old status compatibility, semantic reoffer budget and prior linkage; rollback/restart; A057 both acceptance/expiry writer orders; A054/A089 policy tightening during a genuine workspace lock wait; natural cutoff during a wait; R02 all three ordinary participation cases/cross-location privacy/both report-accept writer orders; bounded continuation/idempotent counts; and approved-release urgent coverage/privacy.

The fake sender is an in-memory dependency. Only fictional disposable subscriptions use in-memory test configuration with delivery=true to exercise transport behavior; process delivery flags remain off and no real transport is constructed for sending. No device delivery/display promise, authenticated browser journey, mobile/keyboard/visual test, Neon HTTP network test or production verification is claimed. T05/T06 retain those UI/app integration responsibilities. Not all98 acceptance cases are marked passed.

Named existing risk retained: **T03 R3** complete GenerationSource history/operation payload and broad locks also affect this maintenance adapter. The worker is bounded by candidate count/time and continuation, but each coherent eligibility read still loads the pre-existing whole scheduling source. This is correctness evidence, not a production-scale performance benchmark. No second guard/evaluator was introduced to bypass it. The caller must persist/continue cursors when its trigger is later separately authorized; repeatedly invoking only the first page does not establish full-workspace unattended coverage.

Current next action: controller verifies `source-freeze.json`, performs independent lifecycle/notification review, then hands the read-model contracts and limitations to the sole T05 owner. No user authorization is needed for that already-approved local review; trigger activation/deployment remains unperformed.


## Task 4 review fix round 1 — Important I1

Status: DONE, implementation frozen for independent review against external `checkpoints/task4-candidate`. Read the full `task4/task-4-review.md`. Only four source/test files changed versus that checkpoint, verified against its complete manifest: `src/lib/data/notification-state.ts`, `src/lib/notifications/reminders.ts`, `src/lib/notifications/reminders.test.ts`, and `src/test/integration/shift-change-notifications.integration.ts`. Final hashes are `task4/fix1-source-freeze.json`; bounded diff is `task4/fix1-review.diff`. Original candidate freeze remains preserved. No schema, command authorization, scheduling mutation, outbox campaign key, deployment or trigger changes.

I1 cause confirmed: creating urgent OPEN coverage records a semantic URGENT manager seed at r:1. Maintenance consumes its escalation stage at r:2, but its upsert retains the r:1 seed. Exact-revision collection rejects that seed, and exact-revision member validation rejects a summary collected before the escalation.

Fix: collector currentness now permits an older numeric revision only for the same OPEN exchange and an exact semantic COVERAGE_ATTENTION event key matching its current shift/assignment episode/material terms and original urgency stage. Existing live source checks still reject changed owner/material/publication and closed requests; manager recipient/access and expiry checks remain. New summary members carry `coverage-need:<normal|high>:<semanticNeedKey>` as their internal source reference version; collector grouping, consumed-item lookup and transactional seed consumption use that same identity. Routine and urgent stages remain distinct, while a same-stage revision cannot open another campaign. This semantic version is used only for manager-summary source members. Human action revision/auth/session/consent validation remains unchanged.

Already queued pre-fix r:n groups also survive same-state escalation, but only if their own same-environment/same-manager/same-request/same-version materialized seed exists and its semantic campaign key matches the current OPEN coverage need. This compatibility path cannot use another manager's seed or a cancelled seed, and does not generally waive exact revision validation for other request kinds.

Genuine RED: `fix1-red.log` records actual disposable SQL, executeShiftChange, maintenance, runReminders and SQL state-reader failures (2 failed, PROCESS_EXIT=1): urgent creation then maintenance/collection yields no summary; collection before escalation yields a cancelled/unreadable summary. This is independent of the review's in-memory reproduction. `fix1-green.log` records those two cases passing after the fix (exit0). `fix1-worker.log` adds a pre-fix r:1 queued-member fixture and real SQL materialization/claim plus in-memory provider: 3 passed, exit0. All three assert one durable manager summary, one semantic seed, surviving r:1->r:2, repeated/concurrent collector and maintenance calls without a new campaign, exactly one fake provider acceptance across repeated dispatch, and rejection after material terms change. Fake subscription endpoint is fictional; no real transport is called. The older wire-format fixture changes only the test summary's member key to the format produced by the candidate; it does not weaken source/recipient checks.

Exact checks and source scope (logs in external `task4/`, all subprocess numeric exits preserved):

| Command | Log | Result / scope |
| --- | --- | --- |
| `npm run test:exchanges:integration -- src/test/integration/shift-change-notifications.integration.ts -t 'I1 semantic'` | fix1-red.log | exit1, two genuine failures on candidate implementation |
| same filtered SQL command | fix1-green.log | exit0, 2 passed after fix |
| same filtered SQL command | fix1-worker.log | exit0, 3 passed including actual SQL/fake-provider delivery and old queued format |
| `npm run test:notifications:integration` | fix1-notifications.log | exit0, 77 passed; preceding final normal/high semantic-member discriminator and its unit assertion |
| `npm run test:exchanges:integration -- src/test/integration/shift-change-notifications.integration.ts` | fix1-final-sql.log | exit0, 32 passed on final source |
| `npx vitest run src/lib/notifications/reminders.test.ts src/lib/notifications/worker.test.ts src/lib/notifications/recipients.test.ts src/lib/data/notification-state.test.ts` | fix1-final-unit.log | exit0, 4 files / 109 passed on final source, including distinct routine/urgent budgets and stable same-stage revision consumption |
| `npm run typecheck` | fix1-final-typecheck.log | exit0, final source |
| `npm run lint` | fix1-final-lint.log | exit0, final source |
| `git diff --check` | fix1-final-diff.log | exit0, final source |

Intermediate `fix1-sql.log` (32), `fix1-unit.log` (108), `fix1-typecheck.log`, and `fix1-lint.log` also exit0, before the final stage discriminator. No broad-suite rerun is claimed after that final refinement.

All SQL commands used `env -u DATABASE_URL` equivalent subprocess environment, owned `postgresql://phase5_owner@127.0.0.1:6546/` and fresh databases with destructive teardown=yes, all three PUSH feature/delivery/test-delivery environment flags false. Database names: `nevora_exchange_test_task4_fix1_red`, `_green`, `_worker`, `_all`, `_final`; notification DB `fuel_phase3_test_task4_fix1_all`. Test in-memory configuration alone enables the fictional fake-provider case. Existing disposable ownership checks and cluster preservation apply. No customer data, credentials, real device delivery, provider activation, commit/index write or deployment. Existing T03 R3 footprint and T05/T06 verification limitations remain unchanged. Next action: controller's scoped independent review of candidate-to-fix1 diff.
