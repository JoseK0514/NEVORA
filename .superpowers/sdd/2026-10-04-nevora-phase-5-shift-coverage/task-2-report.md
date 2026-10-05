# T02 — shared evaluation and candidate discovery

Status: implementation and bounded verification complete; product code frozen for independent review. This is T02 evidence, not Phase 5 acceptance certification.

## Scope and state

- Checkout: `/Users/josek0514/.codex/worktrees/nevora-phase-5-shift-coverage/Fuel-Scheduler-`.
- Branch: `codex/nevora-phase-5-shift-coverage`; HEAD remains `6c0f2b77b6186c4cd86db7e97f869ea831ee32b0`.
- Read T02 brief, spec sections 5–6, relevant acceptance rows, T01 integration-contract section, existing consumers, and Superpowers TDD/verification and personal preservation skills. Existing T01 changes preserved.
- No commit/index write, push, deployment, provider activation, customer database access, Phase 4 checkout changes, or migration edits. No UI edits or browser verification claimed.
- Logs: `/Users/josek0514/.codex/visualizations/2026/10/04/nevora-phase5/task2/`.

## Implemented code

New:

- `src/lib/scheduling/operational-rules.ts`: sole operational engine; explicit wall/elapsed rest on both sides, per-shift limits, business-calendar-day/rolling-24-hour totals, authoritative break conditions, and scheduled overtime review. All required unknown settings/facts produce unverifiable issues. Reviewed not-applicable and explicit zero remain distinct.
- `src/lib/scheduling/shift-change-evaluation.ts`: retained final ledger with both outgoing shifts removed; existing shared validator, location readiness and affected-period health comparisons; private coverage candidate discovery using the unchanged Phase 4 comparator.
- `src/lib/data/scheduling-source-facts.ts`: pure source projection extracted from the generation snapshot mapper. The declared business-date horizon determines availability snapshots; the complete nonarchived dated ledger retains preceding/following cross-location work at any distance. No authorization or additional reads are performed by this mapper.
- `src/lib/shift-changes/terms.ts`: material-term projection, fingerprint, equality, raw-shift-to-terms mapping, and strict approved-callout release predicate for the new fact mapper.
- Fictional fixture `src/test/fixtures/shift-changes.ts`; adjacent unit tests and `src/test/integration/shift-change-evaluation.integration.ts`.

Modified:

- `validate-shift.ts`: optional resolved `operationalProfile` and `scheduledBreaks`; typed `operational` result. Hard/unverifiable issues prevent saving. Soft overtime review prevents automatic eligibility while preserving manual `canSave` under the existing manager path. Scheduled projections retain nominal hours and never deduct breaks.
- Generation types/planner: pass the resolved employee profile into the shared validator. Missing profile leaves existing unrelated generation usable; explicit configuration is enforced.
- Generation snapshot: reuses pure facts while retaining Owner/Manager authorization and the existing write-reader Draft gate. Raw coherent source remains available for exact-source guards. The read-only review reader preserves its preexisting unavailable-target review behavior.
- `data/schedules.ts`: loads stored operational profile and all nonarchived employee commitments rather than the old date slice. All existing callers spreading this context inherit configured rule checks.
- `coverage-ranking.ts`: reuses `compareEmployeeFairness`; confirmed status requires every touched business week. Existing history/alphabetical ordering is intentionally superseded by the approved comparator. The preexisting private legacy return contract remains; there are no current production callers of that old ranking function.
- `scheduling-inputs.test.ts`: updates the expected query arguments to the approved complete-ledger contract while preserving dated/cross-location assertions.

## Actual interfaces / T03 handoff

1. `mapSchedulingSourceFacts(source: GenerationSource, scope: SchedulingFactScope): SchedulingSourceFacts`. Scope is `{workspaceId,startDate,endDate,retainAdjacentCommitments:true}`. The horizon end date is inclusive for selecting availability weeks. `SchedulingSourceFacts` reuses the generation/domain/availability types; it is not a parallel employee domain.
2. `ShiftChangeSnapshot` now carries **both** `source: GenerationSource` and `facts: SchedulingSourceFacts`, plus the existing private actor/request/policy/profiles/terms/publication fields. T03 must construct these consistently from its coherent fresh read. The mapper does not provide current session authority. Raw source is deliberately retained for guarded write reconciliation; the generation management reader must never be impersonated for employee requests.
3. `evaluateOperationalRules(input): OperationalRuleResult` is the only operational formula. `validateShift` returns its blockers/unverifiable/warnings alongside existing fields. A profile absent on an old consumer opts out of new activation; Phase 5 explicitly supplies `unknownOperationalRuleProfile()` when the incoming employee has no established profile.
4. `evaluateShiftChange(snapshot, command)` supports concrete `PROPOSE_SWAP`, `ACCEPT`, and `MANAGER_APPROVE` assignment evaluation, preserving incoming position/Lead/break terms. It evaluates rules in `AUTOMATIC` mode, including for manager approval. It checks current published/future terms, employee capabilities, final ledger and coverage; T03 still owns session authorization after lock waits, command/lifecycle legality, deadlines, operation identity, atomic writes, and consent persistence.
5. `OFFER_COVERAGE` has no incoming volunteer. Its evaluator result is `UNVERIFIED / CONSENT_REQUIRED` with no proposed assignments, **not** a candidate failure and not an offer-creation prohibition. As agreed with controller, T03 performs creation authority/current reviewed source/published/future checks separately. Other nonassignment commands likewise do not manufacture an eligible assignment.
6. `rankShiftChangeCandidates(snapshot): readonly CoverageCandidate[]` is **coverage-only**. It requires a COVERAGE request and returns explicit `{employeeId,employeeName,evaluation}` objects. `ELIGIBLE` and valid `MANAGER_REVIEW` suggestions remain distinct; BLOCKED/UNVERIFIED are omitted. Ranking never writes or establishes consent. Swap discovery must evaluate each concrete pair through `PROPOSE_SWAP`; it must not invent a reciprocal shift from an employee ID. Results are private management data. T03/T05 must project role-appropriate safe display values before any peer serialization; no raw snapshot/profile/leave/phone object should reach the UI.
7. Shared term exports: `materialShiftTerms`, `shiftTermsFingerprint` (`v1:` + SHA-256 of the fixed-field material JSON), `sameShiftTerms`, `sourceShiftTerms`, `calloutReleasesShift`. Stored JSON includes IDs, owner, episode, owning week, dates/times/location, single position, Lead flag, scheduled-break facts; labels and notes are excluded. Store this material object as `source_terms` and use the same helper for the fingerprint. SQL guards can compare the material JSON fields without a crypto extension. T03 must use this shared contract for its exchange/callout freshness checks; the old lifecycle comparator currently remains T01's JSON comparison and is a T03 integration consideration.
8. `sourceShiftTerms` currently supplies `{status:'UNKNOWN'}` scheduled breaks because the production schema has no structured scheduled-break source. No editor, inferred break, punch/actual-time fact, pay deduction or waiver has been added. A required applicable break cannot activate automatic completion without authoritative scheduled facts; reviewed not-applicable is distinct. The pure evaluator can check known consent-bound test facts when provided.
9. The new fact mapper uses strict current episode/material terms for approved-callout release. The broader existing manual/notification/release readers still need T03's inventoried release-reader integration, including the preexisting SQL predicate in `getShiftValidationContext`; T02 does not claim that 57-reader task complete. T03 must preserve parity before activation.

## Verification evidence

Initial actual RED:

- `npx vitest run src/lib/scheduling/operational-rules.test.ts src/lib/scheduling/shift-change-evaluation.test.ts src/lib/data/scheduling-source-facts.test.ts`
- `red.log`: three files failed, **24 actual assertion failures / 2 passes** against valid-module inert implementations; no module-load failure. The original shell wrapper finished with `tail`, so its tool exit was 0 and did not preserve the runner's numeric exit. This is recorded explicitly rather than pretending that wrapper captured exit 1.
- To preserve exact numeric exit evidence too, `red-captured-exit.log` replays valid inert modules with `-t 'A090 rejects|A009 coverage|A032/A090 keeps'`: **4 assertion failures, process exit 1**. A `try/finally` restores all actual files. `green-captured-exit.log` then runs the three complete files: **49 tests, process exit 0**.

Additional RED/green evidence:

- `ranking-red.log`: approved completion-ratio expectation fails under the old history tie breaker (1 failure / 4 pass); corrected ranking passes focused suite.
- `manual-red.log`: complete-ledger reader expectation fails with old bounded query; SQL-backed/current reader checks pass afterward.
- `lifecycle-red.log`: actual `EMPLOYEE_PENDING` swap fails under the initial evaluator status whitelist; corrected whitelist passes.
- `fairness-carryover-red.log`: Sunday overnight mistakenly prefers an employee confirmed in only one touched week; fails before correction, passes afterward.
- `review-discovery-red.log`: valid manager-review suggestions were initially hidden; fails before correction, passes afterward.
- `discovery-kind-red.log`: incomplete swap context must not produce coverage-only suggestions; fails before guard, passes afterward.
- `generator-adapter-mutation-red.log`: temporarily omitting the operational profile from the real planner adapter causes **both generation parity assertions to fail**. Restored adapter passes. This is a mutation verification, not falsely described as the initial test-first run.

Focused and affected checks:

- `affected.log`: `npx vitest run src/lib/scheduling src/lib/data/schedule-generation.test.ts src/lib/data/schedule-generation-review.test.ts src/lib/data/scheduling-source-facts.test.ts src/lib/data/scheduling-operational-parity.test.ts src/app/app/schedule/actions.test.ts` — **27 files / 330 tests pass**, 68.81s.
- Final `final-focused.log`: `npx vitest run src/lib/scheduling/shift-change-evaluation.test.ts src/lib/scheduling/operational-rules.test.ts src/lib/shift-changes/terms.test.ts src/lib/scheduling/coverage-ranking.test.ts src/lib/data/scheduling-source-facts.test.ts src/lib/data/scheduling-operational-parity.test.ts src/lib/scheduling/generation/operational-parity.test.ts src/lib/data/scheduling-inputs.test.ts` — **8 files / 78 tests pass**, exit 0.
- One full `npm test`: `full-unit.log` — **117 files pass / 1 fails; 1257 tests pass / 1 fails**, exit 1. Failure: `scheduling-inputs.test.ts > scheduling context repository > loads actual dated cross-location shifts, explicit submission metadata, normal hours and dated exceptions`, expecting old bounded query arguments `['E','2026-10-04','2026-10-12']`. Updated to the intentional complete employee ledger contract `['E']` and retained dated/cross-location assertion. `source-reader-regression.log`: **19/19 pass**; final focused run also includes all 19. No remaining known failure. Per controller direction, T06 owns the final full-suite rerun; this report does not claim a final all-green full run.
- `typecheck-final.log`: `npm run typecheck`, exit 0. `lint-final.log`: `npm run lint`, exit 0. `git diff --check`, exit 0.
- `discovery-profile.log`: real pure discovery, fictional **40 employees / 401 retained shifts / 39 returned candidates**, **112.43ms** in this local sample. No weekly planner invocation, network operation or assignment. This is a representative sample, not a production SLA or load test.

Disposable SQL:

- `sql-readers-final.log`: `env -u DATABASE_URL FUEL_TEST_DATABASE_URL=postgresql://phase5_owner@127.0.0.1:6546/nevora_exchange_test_task2_final_1711 FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN=yes PUSH_FEATURE_ENABLED=false PUSH_DELIVERY_ENABLED=false PUSH_TEST_DELIVERY_ENABLED=false npm run test:exchanges:integration -- src/test/integration/shift-change-evaluation.integration.ts` — **1 file / 1 test passes**, exit 0, PostgreSQL 17.10 controller-owned local cluster. Factory creates and tears down a uniquely named disposable database with current migrations. Real SQL verifies profile deserialization and a distant cross-location retained shift through both manual and generation readers, and resulting manual MIN_REST block.
- Earlier `sql-readers.log` also passed. Its command used non-consumed `FUEL_NOTIFICATIONS_*` variables; the final evidence rerun above uses the actual PUSH flags. Neither test invokes notification delivery or a provider.

## Acceptance mapping (bounded evidence, not whole-case certification)

| Case | Actual T02 evidence / remaining boundary |
|---|---|
| A009 | Coverage and overlapping two-way outgoing-removal evaluator fixtures, including real EMPLOYEE_PENDING status. Atomic two-write behavior remains T03. |
| A023 | Incoming inactivity test and current actor/workspace gates; existing shared capability tests. Actual revoked-session authority remains T03. |
| A024 | Incoming location/position eligibility blocks through shared validator. |
| A025 | Single assigned position preserved despite multiple qualifications; existing schedule-health position-count tests ran in affected suite. |
| A026 | Designated Lead flag preserved, non-Lead replacement blocked; shared health semantics reused. |
| A027 | Submitted empty weekly availability and partial-day unavailability; prior availability suite passes. |
| A028 | Approved leave blocks, pending status does not. |
| A029 | Cross-location overlap and automatic same-day limit fixtures. |
| A030 | Target 24, hard cap 40, projected 32/40 eligible and 41 blocked. |
| A031 | Sunday shift produces 2/6 nominal hours in two affected weeks; confirmed preference requires both weeks. Shared weekly maximum/availability suites also ran. |
| A032 | Full factual mapping retains September/November shifts despite old owning schedule week; evaluator preserves owning IDs and computes touched weeks. SQL locks/publication writes remain T03. |
| A033 | Same New York workspace snapshot evaluated under Tokyo and Los Angeles host TZ produces identical output. |
| A034 | Strict DST gap/repeated boundary rejection. |
| A035 | Unrelated unconfigured location does not block; only requested locations checked for readiness. |
| A036 | Existing affected staffing/position gaps and unrelated setup do not have to disappear; shared before/after health only compares intersecting affected periods. Existing health tests pass. |
| A037 | Mixed zero/missing/positive targets, shuffled order, overnight confirmation, approved comparator and existing rotating-tie tests. |
| A038 | Discovery leaves entire snapshot unchanged; emits suggestions only. Volunteer/first-commit enforcement remains T03. |
| A090 | Prior/next cross-location short rest, outgoing removal, distant mapped commitments; real SQL reader integration and generator mutation proof. |
| A091 | Per-shift cap; calendar and rolling daily windows differ; ambiguous/unsupported window remains unverifiable. |
| A092 | Incoming applicable break profile + missing facts => UNVERIFIED; known absent/wrong-paid/late/short breaks block; valid scheduled facts pass without deducting hours. Production scheduled-break facts remain unavailable. |
| A093 | Unknown versus reviewed not-applicable; actual MANAGER_APPROVE evaluator cannot override unknown rest. |
| A094 | Target24/threshold40/cap44, projected42 => review,45 => hard block; review suggestions remain discoverable. |
| A095 | Hard/error and unverifiable results take precedence over review mode; manager command cannot override unknown. Consent persistence and policy mutation races remain T03. |
| A096 | One operational engine through shared validator, generation and manual readers; focused parity plus SQL reader test. Broader callout-release SQL parity remains T03 integration. |
| A097 | Unit stale episode/material edit/publication checks and narrow candidate projection privacy test. **Actual authenticated app, concurrent policy changes, legacy UI and whole privacy journeys NOT RUN by T02**; remain T03/T05/T06. |
| A098 | Elapsed spring rest, fall elapsed per-shift/calendar limit, explicit wall basis, nominal 4 scheduled hours across a 5-elapsed-hour fall interval, no actual-time or payroll inference. |

## Remaining concerns / activation limits

- All output of source mapping and evaluation is private server context. Current sessions, read authorization and role-safe UI projection are T03/T05 responsibilities; this pure evaluator is not a standalone authorization boundary.
- Required break facts are absent from the current production candidate model. Required unresolved rules remain UNVERIFIED; customer applicability/numeric settings remain unselected. No approval button can substitute evidence.
- Complete ledgers intentionally cost more than the former date slice. The representative candidate sample is recorded above; large historical ledgers may merit indexed/explicitly complete adjacent-fact optimization later, without reinstating a falsely complete fixed horizon.
- T03 must finish the full callout release-reader and canonical consent integration before activation; T02 only establishes and tests the shared terms contract and new mapper.
- No current customer policy, live app, browser, deployment, final transaction race, or entire Phase 5 certification is claimed.

Next action: controller snapshots this frozen result and runs independent T02 review. No user approval is required for the already-authorized review.

## Fix round 1 — Important I1 (2026-10-04)

Read the complete independent `task-2-review.md`. Addressed I1 only; Minor M1 remains deferred for final triage. Changes in this round are confined to `src/lib/scheduling/operational-rules.ts`, its adjacent test file, and one final-coverage regression in `src/lib/scheduling/shift-change-evaluation.test.ts`. Public interfaces, mapper/read authorization, manual/generator adapters, stored policy, migrations and transaction responsibilities are unchanged.

The original engine eagerly resolved candidate plus all retained history before considering applicability or time basis. It now:

- Returns only already-established unknown-setting issues when no operational rule is configured. A fully reviewed NOT_APPLICABLE profile demands no temporal operational evidence.
- Resolves candidate-only per-shift/break rules using only the candidate and the configured basis; a WALL_CLOCK rule does not ask for elapsed instants.
- Uses the complete retained nominal ledger to identify the nearest preceding end and following start for rest. Only these relevant endpoints are resolved; an unrelated ambiguous start of a preceding shift is not a rest fact. Any unresolved relevant nearest endpoint still produces UNVERIFIED.
- Clips elapsed/wall calendar-day and business-week totals to their actual windows. Rolling checks use the exact candidate-centered elapsed/wall horizon needed for intersecting 24-hour windows. The complete retained ledger is retained as input; no fixed historical date slice was reintroduced.

**Uncertainty bounds are not actual offset selection:** For elapsed window clipping, Temporal's `earlier` and `later` interpretations establish minimum/maximum possible endpoint instants solely to prove that an endpoint is wholly outside the contributing window. Neither interpretation is chosen as the actual shift instant or used to credit minutes. If every interpretation is before/after the window, the endpoint can be discarded or clipped to the known window boundary. If any interpretation may contribute, the existing strict `localDateTimeToInstant` rejection policy resolves that endpoint; ambiguous or skipped times remain UNVERIFIED. Tests cover an ambiguous endpoint with one possible instant outside and another inside the rolling horizon, and a contributing skipped spring endpoint; neither is normalized or guessed.

Actual verification, with numeric process exits embedded in each log:

1. RED before implementation: `npx vitest run src/lib/scheduling/operational-rules.test.ts` — `fix1-red.log`: **8 failed / 19 passed**, process exit **1**. Actual failed assertions were all-NOT_APPLICABLE, WALL_CLOCK/ELAPSED per-shift-only, and elapsed rest/calendar/rolling/week/break profiles with distant irrelevant ambiguity. The five genuinely relevant elapsed-uncertainty controls already remained unverifiable.
2. Initial GREEN: `npx vitest run src/lib/scheduling/operational-rules.test.ts src/lib/scheduling/shift-change-evaluation.test.ts src/lib/data/scheduling-operational-parity.test.ts src/lib/scheduling/generation/operational-parity.test.ts` — `fix1-green.log`: **4 files / 63 passed**, process exit **0**.
3. Additional safeguards exercise nearest-endpoint-only rest, clipping an ambiguous start outside calendar/week/rolling windows, final coverage eligibility with reviewed non-applicability, an ambiguity straddling the rolling horizon, and relevant skipped-time rejection. Same four-file command — `fix1-final-green.log`: **4 files / 70 passed**, process exit **0**. This includes the affected evaluator, manual adapter and generator parity tests; no contract changed.
4. `npm run typecheck` — `fix1-typecheck.log`: process exit **0**.
5. `npx eslint src/lib/scheduling/operational-rules.ts src/lib/scheduling/operational-rules.test.ts src/lib/scheduling/shift-change-evaluation.test.ts` — `fix1-lint.log`: process exit **0**.
6. `git diff --check` — `fix1-diff-check.log`: process exit **0**.

No full suite repeat, SQL/database/resource mutation, commit, index write, provider action or unrelated cleanup occurred in this fix round. Existing full-suite disclosure and downstream T03/T05/T06 boundaries above remain unchanged. Product code is frozen for scoped I1 re-review.

## Fix round 2 — Important I2 (2026-10-04)

Read the complete scoped `task-2-rereview.md`. I1 is independently marked ADDRESSED. This round fixes I2 only; original Minor M1 remains deferred. Product change is the projected-overtime loop in `src/lib/scheduling/operational-rules.ts`; regression changes are its adjacent test file and `src/lib/scheduling/shift-change-evaluation.test.ts`.

The lazy `.some(...)` previously stopped after an earlier affected week crossed a soft overtime threshold, so it could omit relevant ambiguous facts in the following week. The engine now visits each affected week, computes its relevant window records, and accumulates the exceeded flag in a normal loop. It emits a soft warning only after those windows have been evaluated successfully. A relevant unresolved endpoint in a later week still enters the existing strict UNVERIFIED path. The I1 rule-specific/lazy clipping and uncertainty-bound helpers are unchanged.

Regression fixtures reproduce the ordinary New York overnight assignment `2026-10-25 20:00` through `2026-10-26 04:00`, with retained `2026-11-01 01:30–04:00` work. Operational tests use both 60-minute and 240-minute fictional elapsed overtime thresholds; the threshold choice must never suppress the later mandatory uncertainty. A final-ledger coverage test asserts both touched workweeks and UNVERIFIED rather than MANAGER_REVIEW.

Actual checks, commands and exits (each log embeds the numeric process exit):

1. Before implementation: `npx vitest run src/lib/scheduling/operational-rules.test.ts src/lib/scheduling/shift-change-evaluation.test.ts -t I2` — `fix2-red.log`: **2 failed / 1 passed / 67 skipped**, process exit **1**. The 60-minute operational case lacked RULE_UNVERIFIABLE; the final-ledger evaluator returned MANAGER_REVIEW instead of UNVERIFIED. The 240-minute control passed before the fix.
2. After implementation: `npx vitest run src/lib/scheduling/operational-rules.test.ts src/lib/scheduling/shift-change-evaluation.test.ts src/lib/data/scheduling-operational-parity.test.ts src/lib/scheduling/generation/operational-parity.test.ts` — `fix2-green.log`: **4 files / 73 tests passed**, process exit **0**. Existing I1 relevant/irrelevant ambiguity and manual/generator parity cases remain covered.
3. `npm run typecheck` — `fix2-typecheck.log`: process exit **0**.
4. `npx eslint src/lib/scheduling/operational-rules.ts src/lib/scheduling/operational-rules.test.ts src/lib/scheduling/shift-change-evaluation.test.ts` — `fix2-lint.log`: process exit **0**.
5. `git diff --check` — `fix2-diff-check.log`: process exit **0**.

No heavy full-suite repeat, SQL/live-resource mutation, commit/index write, subagent, provider action, or M1 cleanup. Product code is frozen for scoped I2 re-review; all earlier downstream integration and final full-suite limitations remain unchanged.
