# T01 implementation report — candidate frozen for controller review

Base: `6c0f2b77b6186c4cd86db7e97f869ea831ee32b0` on `codex/nevora-phase-5-shift-coverage`.
Worktree: `/Users/josek0514/.codex/worktrees/nevora-phase-5-shift-coverage/Fuel-Scheduler-`.
Implementation owner: phase5_task1. No subagents, commits, index writes, customer database access, deployment or push. Existing controller plan documents preserved. Migration 0001–0009 and production `db.ts` unchanged. Read user AGENTS working agreements, exact task brief/spec sections, Superpowers TDD and writing-good-tests, personal data-integrity and auth-access skills before edits. No additional AGENTS file found in task tree.

## Delivered

- Finite shared contracts in `src/lib/shift-changes/types.ts`: workflows, independently versioned policy scopes, operational rules with explicit time basis, explicit daily window, nullable/unselected settings, reviewed not-applicable classification, consent-bound shift terms, private coherent source/session snapshot, evaluations, safe result union, finite commands, transitions, policy/profile writes and operational evaluator inputs/results.
- `resolveShiftChangePolicy`, `resolveOperationalRuleProfile`, `evaluateRequestDeadlines` in `policy.ts`. Invalid/missing profiles resolve unknown; invalid policy never supplies invented customer defaults. Deadline processing separates submission and completion, enforces strict before-cutoff authorization, supports explicit zero, and uses the earlier recorded/current completion cutoff.
- `decideShiftChangeTransition` in `lifecycle.ts`: finite refusal/effect decisions, participant/manager permissions, revision conflict, terminal closure, manual-mode retention, refusal of legacy auto-promotion, exact consent terms for manager approval, and no hard/unknown-rule bypass. SQL execution remains the command service's responsibility.
- `readShiftChangePolicy`, `saveShiftChangePolicy`, `saveOperationalRuleProfile` in `data/shift-change-policy.ts`: actual active Owner and specific session checks in the transaction after locks, scope-specific optimistic concurrency, preserved unrelated scope, server-stamped profile review identity/time, configured-rule revision assignment and retained existing target/cap settings.
- Migration `0010_shift_coverage_automation.sql`: nullable workspace policy/profile JSON; automatic fresh UUID episodes on every insertion or owner change (including direct generated inserts), no caller override; request revisions/legacy markers/consent/terms/deadline/mode/linked identity; episode-associated callouts; shared exchange/callout participation reservation with unique shift ID; atomic approved-callout reservation transfer to linked coverage; legacy conflict preflight abort; immutable durable history, including private original absence reason; bounded actor/workspace-scoped operation results.
- Disposable integration factory with historical-9/current-runtime modes, original loopback prefix/UUID-marker/OID ownership safeguards, no production transport changes. Current-runtime notification/foundation/generation factories explicitly advance to 0010; historical migration modes retain original pinning.

## Important integration contracts

- `PolicyWrite.expectedRevision` is the revision of the edited `swap`/`coverage` scope; an untouched/unselected scope starts at revision 0. Successful result returns the **scope** revision. Global policy revision also increases for each successful save. Independent concurrent edits serialize without falsely conflicting on the other scope.
- `OperationalProfileWrite.expectedRevision` is the employee profile revision; unselected profile is revision 0. The employee must already have an `employee_scheduling_settings` row: this API deliberately does not insert one because the old schema's insert default would silently seed a maximum-hours value. Existing manager settings workflow owns that prerequisite. A missing row returns conflict.
- Profiles use `minimumRest`, `maximumShift`, `maximumDaily`, `breaks`, `projectedOvertime`. Configured daily rule has `window: BUSINESS_CALENDAR_DAY | ROLLING_24_HOURS`; all configured rules have `timeBasis: ELAPSED | WALL_CLOCK`. Durations are minutes. These are explicit fixture/configuration semantics, not selected customer policies.
- New command writes must set `legacy_manual=false` explicitly; old writer paths default to true and cannot be interpreted as new verified consent.
- Database request revision trigger sets any changed row to previous revision +1. A T03 writer may assign that same value but must not independently assume a second increment. Terminal history is append-only; event uniqueness is request-kind/request-id/revision/event-kind.
- Episodes rotate only on insertion/owner transfer. Same-owner material changes retain the episode and invalidate the reviewed terms fingerprint at T03 comparison. Harmless notes do not rotate the episode. Returning original owner receives a new episode. Schema-safe defaults cover all existing shift producers without touching the production writer implementations.
- `shift_change_participation` is derived by triggers for active exchange source/target and pending/current released callout rows. Approval of an episode-bound callout can transfer the reservation when its linked coverage row is inserted; terminal exchange updates release it. T03 must link IDs and validate fingerprint/consent under its final guards.
- Legacy approved callouts intentionally get no invented assignment association and are historical/manual-review. They do not auto-release today's owner. Pending legacy callouts reserve the shift. Cross-column active exchanges/pending callout contradictions abort migration without deleting rows.
- Event rows deliberately have no source/request FK. Legacy import records original shift snapshots, participants and status, labeled unknown consent. Private `callout_reason_code`/`callout_reason_note` preserve the original reason after deletion. **Never include these fields in candidate/general-history/client/push projections; T03 must enforce requester/management authorization.**
- `shift_change_operations` has a `(workspace_id, actor_employee_id, operation_id)` primary key and <=16KiB result JSON. T03 must validate UUID/form limits, authorize retry outcome access, enforce fingerprint equality and return original persisted outcomes.
- The private snapshot includes `GenerationSource`; no impersonated manager snapshot reader is introduced. T02/T03 may refine concrete coherent-read population while keeping the named contract.

## Test evidence and commands

All logs are external in `/Users/josek0514/.codex/visualizations/2026/10/04/nevora-phase5/task1/`.

1. `npx vitest run src/lib/shift-changes/policy.test.ts src/lib/shift-changes/lifecycle.test.ts`
   - RED `unit-red.log`: exit 1, 15 failed/1 passed actual assertions against inert valid-module stubs (no loader error).
   - GREEN `unit-green.log`: exit 0, 16 passed.
2. `npx vitest run src/lib/data/shift-change-policy.test.ts`
   - RED `policy-writes-red.log`: exit 1, 4 actual invalid-input result assertions failed against valid stubs.
3. `npx vitest run src/lib/data/shift-change-policy.test.ts src/lib/shift-changes/policy.test.ts src/lib/shift-changes/lifecycle.test.ts`
   - GREEN `focused-green.log`: 3 files/20 tests pass. Later complete unit run confirms exit 0 with all these tests.
4. SQL command prefix for every run:
   `env -u DATABASE_URL FUEL_TEST_DATABASE_URL=postgresql://phase5_owner@127.0.0.1:6546/nevora_exchange_test_<suffix> FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN=yes npm run test:exchanges:integration -- ...`
   No production DATABASE_URL loaded. Controller owns dedicated Phase5 cluster. Factories create/drop owned test databases and refuse existing targets.
   - suffix `task1_red`, filter `src/test/integration/shift-change-schema.integration.ts -t 'upgrade preserves'`: exit 1; `sql-red.log` actual assertion absent request_revision in historical-9 schema. Temporary missing-file fallback was removed for final tests.
   - suffix `task1_green`, filter schema file: exit 0; `sql-green.log`, 4 tests.
   - suffix `policy_red`, filter policy file: exit 1; `policy-sql-red.log`, 3 actual result assertions.
   - suffix `policy_green`, filter policy file: exit 0; `policy-sql-green.log`, 3 tests.
   - suffix `task1_all`, no filter: exit 1; `sql-all-green.log` retained despite misleading initial filename. Lock observer used PostgreSQL's cached statistics snapshot, so test did not observe the blocked writer; subsequent revision assertion also failed. Fixed test observer with `pg_stat_clear_snapshot()` before each current-lock query, not by weakening assertions.
   - suffix `task1_recheck`, no filter: exit 0; `sql-recheck-green.log`, 9 tests.
   - suffix `history_red`, filter schema file: exit 1; `history-red.log`, missing durable private reason column actual assertion; 4 other tests pass.
   - suffix `task1_final`, no filter: exit 0; `sql-final-green.log`, **3 files/10 tests pass** (fresh install, upgrade, contradiction abort, episodes, shared reservations, immutable history/private reason, independent policy versions, profile preservation and revoked session after real lock wait).
5. `npm test`: exit 0, `full-unit.log`, **112 files/1208 tests passed**, 68.94 seconds. Run once on the unit candidate; subsequent private-reason correction changed only migration/integration tests and was verified in final SQL suite.
6. `npm run typecheck`: exit 0, `typecheck-final.log`.
7. `npx eslint src/lib/shift-changes src/lib/data/shift-change-policy.ts src/lib/data/shift-change-policy.test.ts src/lib/domain.ts src/test/integration/local-postgres.ts src/test/integration/shift-change-schema.integration.ts src/test/integration/shift-change-policy.integration.ts src/test/integration/shift-change-upgrade.integration.ts vitest.exchanges-integration.config.mts`: exit 0, `eslint.log`, no warnings.
8. `git diff --check`: exit 0.

## Scenario evidence (bounded T01 scope, not whole acceptance certification)

- A005/A008/A039: pure lifecycle acceptance/manual retention/permissions/revisions; SQL shared source/target/callout reservation conflict. Final assignment/transaction races remain T03.
- A019/A020/A051: server-generated new episodes for replacement/returning owner and deletion/recreation; notes retain episode; same-owner material edit retains episode for fingerprint staleness. Immutable legacy history survives cascaded live-row deletion, including private original callout reason. Actual release fingerprint evaluation remains T03.
- A080/A081/A083: historical-9 upgrade preserves manual pending/unknown consent, unselected policy; fresh 0010 chain succeeds; contradictory active cross-column data aborts the transaction with retained rows and no partial schema. No destructive down migration or claim of production rollback.
- A082/A085: independent policy scopes, preserve unchanged scope and manual recorded mode, current database Owner authorization and session proof; no request bulk updates.
- A086/A088/A093/A095: unknown/invalid settings fail closed, explicit reviewed not-applicable differs from unknown, zero-notice behavior, no generic manager override of blocked/unverified decisions.
- A087/A089: submission vs completion boundaries, strict cutoff, tighter current/recorded deadline, terminal requests never reopened.
- A043/A068 supplemental policy-write evidence: actual session row revoked while writer waits on workspace lock results in invalid authorization and no policy revision change. This does not substitute for T03 acceptance proof.
- A084/A097 full final handoff/authenticated browser journeys are not claimed by T01.

## Self-review and limitations

Self-review corrected missing explicit daily-window semantics (controller finding), added coherent GenerationSource to the snapshot, retained original private callout reasons, and removed a proposed unnecessary episode registry. Focused lint/typecheck and full unit suite pass. Candidate now frozen for controller-led independent review and recovery checkpoint.

T01 does not implement form parsing, coherent source reads/session acquisition, callout-release fingerprint comparison, assignment mutations/publication/outbox atomicity, current policy revalidation for command decisions, discovery, worker or UI. Their contracts and persistence are present; T02–T06 own integration and broader acceptance. Existing production exchange/callout readers still need T03's migration-aware integration before enabling Phase5.

No currently known failing check remains. Approval of customer labor values, production migration/deployment, actual-work/legal claims, or real notification transport are outside this task. Controller owns final review, external recovery snapshot and the single final commit.

## Changed files

- db/migrations/0010_shift_coverage_automation.sql
- src/lib/shift-changes/types.ts
- src/lib/shift-changes/policy.ts
- src/lib/shift-changes/policy.test.ts
- src/lib/shift-changes/lifecycle.ts
- src/lib/shift-changes/lifecycle.test.ts
- src/lib/data/shift-change-policy.ts
- src/lib/data/shift-change-policy.test.ts
- src/lib/domain.ts
- src/test/integration/local-postgres.ts
- src/test/integration/shift-change-schema.integration.ts
- src/test/integration/shift-change-policy.integration.ts
- src/test/integration/shift-change-upgrade.integration.ts
- vitest.exchanges-integration.config.mts
- package.json
- .superpowers/sdd/2026-10-04-nevora-phase-5-shift-coverage/task-1-report.md (ignored handoff directory)

## Independent review fix round 1 — corrected candidate frozen

Read `.superpowers/sdd/2026-10-04-nevora-phase-5-shift-coverage/task-1-review.md` verbatim and addressed both Important findings and the Minor assertion finding.

1. **Late profile-row-lock authorization**: `ownerGuards` now takes the mutation's additional lock statements and performs the current account/Owner/specific-session expiry check after those locks. `saveOperationalRuleProfile` acquires its `employee_scheduling_settings` row lock before that final authority statement. The regression holds that exact settings row, confirms the writer is blocked specifically on its settings-row SELECT, waits using the PostgreSQL clock until the previously valid specific session expires, releases the row, then verifies invalid authorization and byte-equivalent unchanged profile/revision. This adds coverage beyond the prior earlier-workspace-lock revocation test.
2. **Legacy target snapshot material context**: migration backfill joins the target schedule and records its `locationId`, owning `weekStart`, and `consentStatus: UNKNOWN`, matching the source snapshot. The historical-9 fixture creates a legacy swap across `loc-1`/week 2026-10-05 and `loc-2`/week 2026-10-12, upgrades, removes both live schedules/shifts, and verifies each immutable snapshot still retains its own owner/date/time/location/week and unknown consent.
3. **Specific reservation enforcement diagnostic**: exchange cross-role and callout collision tests now require PostgreSQL code `23505` and constraint `shift_change_participation_pkey`. Unrelated SQL failures no longer satisfy those assertions.

### Exact checks, exits and output

Evidence directory remains `/Users/josek0514/.codex/visualizations/2026/10/04/nevora-phase5/task1/`.

- RED: `env -u DATABASE_URL FUEL_TEST_DATABASE_URL=postgresql://phase5_owner@127.0.0.1:6546/nevora_exchange_test_review1_red FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN=yes npm run test:exchanges:integration` — exit **1**, `review1-red.log`, **2 failed /10 passed**. Actual assertions demonstrate profile outcome incorrectly `saved` after confirmed expiry, and missing target location/week/unknown-consent fields after live deletion. No loader error.
- GREEN: `env -u DATABASE_URL FUEL_TEST_DATABASE_URL=postgresql://phase5_owner@127.0.0.1:6546/nevora_exchange_test_review1_green FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN=yes npm run test:exchanges:integration` — exit **0**, `review1-sql-green.log`, **3 files/12 tests passed**, including both regressions and stronger uniqueness assertions.
- `npx vitest run src/lib/data/shift-change-policy.test.ts src/lib/shift-changes/policy.test.ts src/lib/shift-changes/lifecycle.test.ts` — exit **0**, `review1-unit-green.log`, **3 files/20 tests passed**.
- `npm run typecheck` — exit **0**, `review1-typecheck.log`, no diagnostics.
- `npx eslint src/lib/data/shift-change-policy.ts src/test/integration/shift-change-policy.integration.ts src/test/integration/shift-change-schema.integration.ts src/test/integration/shift-change-upgrade.integration.ts` — exit **0**, `review1-eslint.log`, no warnings or errors.
- `git diff --check` — exit **0**, no output.

No full-suite repeat: the controller requested focused checks for these bounded review corrections; the prior 1,208-test unit result remains recorded above. No remaining failing check from this round. No production database, provider, commit, index or Phase4 changes.

Changed in this round: `src/lib/data/shift-change-policy.ts`, `db/migrations/0010_shift_coverage_automation.sql`, `src/test/integration/shift-change-policy.integration.ts`, `src/test/integration/shift-change-schema.integration.ts`, `src/test/integration/shift-change-upgrade.integration.ts`, and this report. Candidate frozen for independent scoped re-review; later-task integration limitations above still apply.
