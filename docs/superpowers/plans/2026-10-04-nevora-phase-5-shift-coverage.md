# NEVORA Phase 5 — Shift Changes & Coverage Implementation Plan

> **For agentic workers:** Use the existing Superpowers execution workflow (`subagent-driven-development` or `executing-plans`) after this plan is approved. Use one implementation owner per shared module, focused lifecycle/transaction reviews and one independent whole-branch review. Steps below are intentionally unchecked.

**Goal:** Deliver consented whole-shift swaps and voluntary coverage, with configurable approval, safe scheduling-rule evaluation, deadline processing, targeted notifications and exception-focused management.

**Architecture:** Extend the existing exchange/callout records and screens. Reuse `validateShift`, the accepted fairness comparator, coherent scheduling-source reads and the published-change revision/outbox assembly; do not create another scheduler. A single command owner validates current consent, policy, session, source and effective deadlines before one atomic mutation.

**Tech stack:** Accepted repository dependencies: Next.js 16.3.6, React 19.3.0, TypeScript, Vitest, the existing Neon SQL executor and disposable PostgreSQL test support. Preserve the lockfile; no new dependency, paid service or transport activation is authorized.

**Spec:** `01_PHASE5_SPECIFICATION.md`; approved policies P01–P09 and requirements R01–R17. `02_TASKS_AND_ACCEPTANCE.md` and `acceptance_index.json` contain all 98 planned acceptance scenarios. Read them together with this plan.

**Accepted parent:** `6c0f2b77b6186c4cd86db7e97f869ea831ee32b0`.

**Status:** Exact-file plan approved after Jose's final conditional review request and an additional source-level audit. It has not been executed. Proposed new files and APIs below do not exist at the accepted parent.

**Destination at execution entry:** `docs/superpowers/plans/2026-10-04-nevora-phase-5-shift-coverage.md` in the NEW Phase 5 worktree. This approved document is currently delivered outside both worktrees.

## Global constraints

- Work only from the accepted SHA in `codex/nevora-phase-5-shift-coverage`; never modify the accepted Phase 4 checkout.
- Suggested worktree: `/Users/josek0514/.codex/worktrees/nevora-phase-5-shift-coverage/Fuel-Scheduler-`. Verify it does not already contain another task before creating it.
- One local final implementation commit, with external per-task recovery snapshots. No push, merge, deployment, existing-database migration, provider activation or Phase 6 work.
- Preserve canonical migrations 0001–0009. New migration proposed here: `0010_shift_coverage_automation.sql`; stop on a numbering collision rather than overwrite another migration.
- Preserve Employee/Lead self-service and Owner/Manager management. New policy writes are Owner-only; existing manager staffing/target permissions are not silently removed.
- No automatic draft publication, involuntary assignment, hard-rule bypass, invented consent, silent reversal of completed work or implicit clearing of a generation exclusion.
- Raw CSS, existing tokens/icons/navigation; action targets at least 44px; full text visibility; widths 320, 375, 390, 430, 768, 1024 and 1440; Chromium and WebKit where supported.
- Customer numeric policies and applicability remain unselected. Use fictional test profiles. NULL, explicit zero and reviewed not-applicable are different values.
- Scheduled projections are not actual worked time, proof of breaks taken, final overtime pay or legal certification. Do not implement payroll, punches or a general regulatory platform.
- All 98 cases remain PLANNED_NOT_RUN until actual implementation evidence is recorded. Phase 4 evidence is a baseline, not Phase 5 test success.

## Review focus

1. **Callout release must match the current assignment episode and reviewed shift terms:** an old approved callout must not release a later owner, a returning original employee, or a materially changed date/time/location assignment merely because the live shift ID still matches. T01/T03 extend A019/A020/A051 with return-to-original-owner and same-owner material-edit fixtures.
2. **Only one approval mode or deadline changes:** another workflow must remain unchanged; old requests must not silently gain permission or time. T01/T03/T04 extend A085/A089/A097.
3. **A session is revoked while the acceptance waits for locks:** an employee ID alone is not current authority. T03 extends A043/A047/A068 with actual session-row changes.
4. **A required rest/break rule is unknown, even in manager mode:** no green eligibility or generic Approve bypass. T02/T05 extend A086/A093/A095.
5. **The browser reports failure after a committed change:** retries reconcile the same operation without a duplicate assignment, revision or push. T03/T05/T06 extend A048/A062/A075 through actual app + SQL journeys.

## Entry and source reconciliation

The fresh source check found the accepted SHA at HEAD and a clean Phase 4 worktree. The migration chain ends at 0009. Eighteen of the nineteen previously sampled source files are byte-identical; the architecture document gained final-review notes. See `07_PHASE4_ACCEPTANCE_AND_RECONCILIATION.md` and `APPROVED_BASE_SOURCE.json`.

Important implementation constraints verified at that parent:

- `readGenerationSnapshot` and `readGenerationReviewSnapshot` authorize Owner/Manager; the write reader rejects attempted published targets. **Do not call them by impersonating management or weaken them to serve employee exchanges.**
- `readGenerationSource` already supplies the complete raw scheduling source, but not employee sessions. A new Phase 5 adapter must include current session/request/policy facts coherently.
- `compareEmployeeFairness` is reusable. The older `rankCoverageCandidates` has a different ordering and alphabetical tie.
- `getSession` returns employee information, not a durable final-write session proof.
- New rest, daily/per-shift, break and projected-overtime contracts are not present in `ValidateShiftInput`. The generator currently maps `policy: {}`. These are implementation work, not existing features.
- `src/lib/db.ts` uses Neon HTTP. A real authenticated local-app test needs an explicitly owned local transport test harness; existing SQL tests with mocked cookies/cache are not that proof.
- A final production-writer scan at the accepted parent found four direct `shifts` SQL writers: `src/lib/data/schedules.ts`, `src/lib/data/exchanges.ts`, `src/lib/data/schedule-generation.ts`, and the deletion-only `src/lib/data/generation-exclusions.ts`. Assignment-episode support must cover every create/owner-transfer/material-edit path and regression-test deletion/recreation; do not rely on a UI path list.
- Existing notification configuration supplies a 12-hour urgent window, 5-minute manager collection and routine quiet hours 21:00–07:00 in the workspace timezone. Reuse these constants through `notificationPolicyFor`; they are observed application settings, not new customer labor rules.

- [ ] Before any edit, read applicable AGENTS and relevant skills; run read-only `git rev-parse HEAD`, `git status --porcelain=v1` and migration listing in the proposed new checkout.
- [ ] Verify exact base and archive baseline screenshots/source outside the repository. Do not restart Phase 4 review or rerun its heavy suite solely to acknowledge approval.
- [ ] Record the approved plan hash/source and the agreed Codex controller execution approach in the new worktree handoff. Technical corrections discovered during implementation stay bounded; material changes to approved behavior stop for a decision.

## Proposed shared contract surface

Keep new types in `src/lib/shift-changes/types.ts`; new names in this section are planned API names, not claims about the existing repository.

| Type | Exact responsibility |
|---|---|
| `WorkflowKind` | `'SWAP' \| 'COVERAGE'` |
| `ApprovalMode` | `'AUTOMATIC_WHEN_VALID' \| 'MANAGER_REVIEW'` |
| `RuleSetting<T>` | Tagged union: `{status:'UNKNOWN'}`; `{status:'NOT_APPLICABLE', reviewedBy:string, reviewedAt:string}`; or `{status:'CONFIGURED', value:T, revision:number}`. Never infer classification from role/title. |
| `ShiftChangePolicy` | Versioned workspace policy with independent `swap` and `coverage` records, each containing mode, submission advance minutes and completion advance minutes. Nullable values remain unknown. |
| `OperationalRuleProfile` | Versioned, Owner-reviewed employee scheduling settings for rest, per-shift/daily limits, break requirements and projected-overtime routing. Explicit time basis per configured rule; no legal/exemption inference. |
| `ShiftTerms` | Shift/schedule/workspace IDs, owning week, date/start/end/location, current owner, assignment episode, position, Lead flag and any known consent-bound break facts. Stable identity and labels are separate. |
| `ShiftChangeSnapshot` | Private coherent source, database observation time, current actor proof, request revision/consents, effective policy/profile, full dated ledger and publication state. Never returned to clients. |
| `ShiftChangeEvaluation` | `{decision:'ELIGIBLE'|'MANAGER_REVIEW'|'BLOCKED'|'UNVERIFIED', issues, affectedWeeks, proposedAssignments, scheduledProjections}`. Only documented soft-policy decisions use MANAGER_REVIEW; hard failures and unknown mandatory facts are not approvable. |
| `ShiftChangeResult` | A safe discriminated outcome: completed, pending, closed, blocked, unavailable, conflict or outcome-unknown; includes operation/request IDs and current revision only when authorized. No raw SQL, session hashes or private peer facts. |

New public business form inputs are finite per operation: request/shift IDs, expected revision, operation ID, target ID where relevant and decision/reason fields. Resolve actor, role, workspace, eligibility, hours and policy server-side. Proposed defensive limits: IDs at most 128 characters, operation ID canonical UUID, note at most 2,000 characters, bounded parsed JSON at most 16KiB and positive safe-integer revisions. These are input-validation choices, not labor-policy values. Preserve legitimate framework metadata while rejecting duplicate business scalars and unexpected business fields.

---

## T01 — Policy, lifecycle and persistence

**Deliverable:** A tested schema and typed lifecycle that preserve old requests and distinguish approved design from unknown customer configuration.

**Create:** `db/migrations/0010_shift_coverage_automation.sql`; `src/lib/shift-changes/types.ts`; `src/lib/shift-changes/policy.ts`; `src/lib/shift-changes/lifecycle.ts`; `src/lib/data/shift-change-policy.ts`; their adjacent `.test.ts` files; `src/test/integration/shift-change-schema.integration.ts`; `vitest.exchanges-integration.config.mts`.

**Modify:** `src/lib/domain.ts`; `src/test/integration/local-postgres.ts`; `package.json` for the new isolated integration command. Do not rewrite migration 0009.

**Interfaces produced:** `resolveShiftChangePolicy(raw: unknown): ShiftChangePolicy | null`; `resolveOperationalRuleProfile(raw: unknown): OperationalRuleProfile`; `evaluateRequestDeadlines(input: DeadlineInput): DeadlineResult`; `decideShiftChangeTransition(input: TransitionInput): TransitionDecision`; `readShiftChangePolicy(executor: SqlExecutor): Promise<ShiftChangePolicy | null>`; `saveShiftChangePolicy(input: PolicyWrite, executor: SqlExecutor): Promise<PolicyWriteResult>`. Define each input/output in `types.ts` with only the fields listed in the spec/contracts; expose typed finite outcomes, not generic `Record<string, any>`.

**Persistence decisions for review:**

- Add nullable versioned policy data to `workspaces` and nullable versioned operational-profile data to `employee_scheduling_settings`; retain existing targets/caps. No automatic customer seed.
- Add monotonic request revision, legacy/manual marker, consent snapshots, recorded deadlines, policy revision, outcome reason/mode and linked prior-request identity to exchange records. Extend callouts with versioned lifecycle metadata and assignment episode association.
- Add a server-generated, non-reused `assignment_episode_id` to shifts. New assignments always receive an episode identity; ownership transfer always creates a new episode. A callout additionally stores the reviewed assignment-terms fingerprint. Active release requires **shift ID + current owner + episode ID + matching material date/time/location terms**; a same-owner material edit becomes stale for release until management explicitly resolves/reviews it. Notes/display-only changes do not invalidate an episode. Backfill current assignments without fabricating past consent, and treat ambiguous legacy active callouts as historical/manual-review rather than auto-applicable. Every production shift writer and fixture path must either supply or safely receive an episode identity; direct generated inserts in `schedule-generation.ts` are explicitly in scope.
- Add `shift_change_participation` with a unique active `shift_id` across source and target roles and across **exchange/callout ownership of the slot**; add append-only `shift_change_events` for original terms/participants/outcomes and bounded `shift_change_operations` for actor-scoped idempotent outcomes. A pending callout, trade or offer cannot coexist incompatibly by accident. Approving a callout atomically transfers/links participation into its single coverage need instead of creating a second competing reservation. Participation is a transaction-derived reservation, not another schedule model. Terminal paths release it.
- Preserve historical records when a mutable shift/request row is removed: event snapshots do not cascade with the live source. Legacy contradictions are reported by preflight; the migration aborts rather than deleting conflicting history. Legacy unknown consent is labeled, not retrospectively certified.

- [ ] Write policy/lifecycle tests for A005/A008/A039/A080–A089/A093/A095: independent modes, explicit zero versus NULL, submission cutoff before completion cutoff, no terminal reopening, no legacy auto-promotion and no unknown-rule approval.
- [ ] Run `npx vitest run src/lib/shift-changes/policy.test.ts src/lib/shift-changes/lifecycle.test.ts`; confirm real missing/incorrect behavior, not a test-loader error.
- [ ] Implement the finite parsers/transitions and Owner-only policy writes with version checks; unknown configuration may preserve a pending report but cannot authorize final assignment mutation.
- [ ] Add the migration and an owned factory `createDisposableExchangeDatabase({mode:'historical-9'|'current-runtime'})` using existing loopback UUID/OID safeguards. Current-runtime factories for affected old suites must advance deliberately to 0010; keep historical migration tests pinned to their original versions.
- [ ] Run `npm run test:exchanges:integration -- src/test/integration/shift-change-schema.integration.ts`. Test fresh install, upgrade, repeated absence/returning owner, cross-column participation and legacy conflicts. Expected: all assertions pass, no existing DB touched.
- [ ] Obtain one focused lifecycle/schema review, save a recoverable snapshot, and close concrete findings before T02/T03. Do not commit into Phase 4.

## T02 — Shared rule evaluation and candidate discovery

**Deliverable:** One final-ledger evaluator with the approved fairness and operational-policy semantics, including explicit unverifiable outcomes.

**Create:** `src/lib/scheduling/operational-rules.ts`; `src/lib/scheduling/shift-change-evaluation.ts`; `src/lib/data/scheduling-source-facts.ts`; adjacent tests; `src/test/fixtures/shift-changes.ts` with fictional policies and employees.

**Modify:** `src/lib/scheduling/validate-shift.ts`; `src/lib/scheduling/coverage-ranking.ts`; `src/lib/data/schedules.ts`; `src/lib/data/schedule-generation-snapshot.ts`; `src/lib/scheduling/generation/types.ts`; the generator candidate-to-validator adapter in `src/lib/scheduling/generation/planner.ts`; related tests. Keep the accepted comparator in `src/lib/scheduling/generation/fairness.ts`; reuse it rather than moving/duplicating its formula.

**Interfaces:** `evaluateOperationalRules(input: OperationalRuleInput): OperationalRuleResult`; `evaluateShiftChange(snapshot: ShiftChangeSnapshot, command: ShiftChangeCommand): ShiftChangeEvaluation`; `rankShiftChangeCandidates(snapshot: ShiftChangeSnapshot): readonly CoverageCandidate[]`; `mapSchedulingSourceFacts(source: GenerationSource, scope: SchedulingFactScope): SchedulingSourceFacts`. `SchedulingSourceFacts` reuses existing Employee/Shift/Location/Position and availability types, not a parallel domain. It accepts an explicit business-date horizon and retained adjacent commitments.

- [ ] Write tests covering A009/A023–A038/A090–A098. Include final-ledger removal of each outgoing shift; preceding AND following rest; Sunday carryover; fictional daily/per-shift caps; unknown breaks; explicit not-applicable; and target24/threshold40/cap44/projected42 versus45.
- [ ] Confirm RED with `npx vitest run src/lib/scheduling/operational-rules.test.ts src/lib/scheduling/shift-change-evaluation.test.ts src/lib/data/scheduling-source-facts.test.ts`.
- [ ] Extract only the shared factual mapping from the accepted snapshot mapper. Preserve Owner/Manager authorization and Draft rejection in both existing generation entry points. Phase 5 uses its own self-service authorization and published-source contract.
- [ ] Extend `validateShift` to consume resolved operational rules once; preserve existing return fields and add typed operational outcomes. Explicit configured hard rules apply consistently to affected manual/generator callers. Do not silently make old unrelated generation unusable merely because no Phase 5 profile has yet been activated; missing required facts prevent the new automation from claiming eligibility, while intentionally configured new constraints must not be bypassed by another consumer.
- [ ] Implement elapsed-rest checks using existing resolved instants and explicit daily/per-shift time bases. Support configured business-calendar-day and rolling-24-hour evaluation separately; unknown/unsupported semantics return UNVERIFIED. Include nearest preceding/following shifts beyond the original generator's fixed -1/+14-day slice when needed. Do not turn a weekly ledger into a falsely complete rest horizon.
- [ ] For breaks, use authoritative scheduled facts only. The accepted candidate type has no structured scheduled-break field: absent facts return UNVERIFIED when a rule needs them. Do not add a break editor/optimizer, infer breaks from notes or copy time-clock records as scheduled facts. Explicitly explain this activation limitation.
- [ ] Reuse `compareEmployeeFairness` for eligible suggestions; do not invoke the whole planner to claim a shift. First valid committed volunteer still wins. Preserve position/Lead requirements and compare health only for affected periods, without requiring unrelated gaps to disappear.
- [ ] Rerun affected rule, generation, ranking, mapping and manual-action tests; record result and source. Expected: new cases pass and accepted behavior is preserved except the explicit configured extensions. Snapshot the result.

## T03 — Atomic commands, consent, sessions and published changes

**Deliverable:** Trades update both owners or neither; coverage has one winner; outcomes are retry-safe and all scheduling facts are revalidated at commit.

**Create:** `src/lib/data/shift-changes.ts`; `src/lib/data/shift-change-snapshot.ts`; `src/lib/data/shift-change-guards.ts`; `src/lib/data/shift-change-history.ts`; adjacent tests; `src/test/integration/shift-changes.integration.ts`; `src/test/integration/shift-change-races.integration.ts`.

**Modify:** Existing `src/lib/data/exchanges.ts`, `callouts.ts`, `schedules.ts`, `schedule-generation.ts`, `generation-exclusions.ts`, `notification-transactions.ts`, `request-notifications.ts`, `publication-revisions.ts`, `generation-guards.ts`, `schedule-generation-snapshot.ts`, `hour-fairness.ts`; `src/lib/auth/session.ts`; exchange and callout `actions.ts`/tests. Update release-sensitive readers from the source reconciliation, not just the visible exchange page.

**Interfaces:** `requireSessionMutationProof(): Promise<SessionMutationProof>` is server-only and contains the actual session token hash plus authorized employee projection. `readShiftChangeSnapshot(proof: SessionMutationProof, command: ShiftChangeCommand, executor: SqlExecutor): Promise<ShiftChangeSnapshot>`; `executeShiftChange(proof: SessionMutationProof, command: ShiftChangeCommand, executor?: SqlExecutor): Promise<ShiftChangeResult>`; `findShiftChangeOperation(proof, operationId, executor): Promise<ShiftChangeResult | null>`; `preparePublishedWeekChange(input: PublishedChangePlanInput): PreparedPublishedChange` extracts the existing revision/acknowledgement/outbox assembly inside `notification-transactions.ts` without executing a transaction. Define its input from the existing `GuardedWeekState`, `WeekMutationBatch`, `NotificationConfig`, source/actor and database observation instant; output ordered statements and revision metadata. Existing `commitPublishedWeekChange` remains the default public adapter and retains its behavior.

**Command vocabulary:** offer coverage, propose trade, accept, decline, cancel/withdraw, manager approve/decline/close, submit/review/cancel callout. Bind acceptance to request revision and stored terms. Worker expiry is a separately authorized entry, never an employee-supplied `SYSTEM` flag.

- [ ] Add direct-action/parser/session tests A003–A022/A043/A047/A065–A068 and integration RED cases. Wrong targets, duplicate fields and forged authority fail before mutation; legitimate framework form metadata still works.
- [ ] Compose the raw scheduling source, publication state, request/consents, current session and policy in one authoritative SQL snapshot. Factor shared SQL/mappers rather than copying divergent availability queries. No employee request invokes a Manager-only reader.
- [ ] Reuse the publication assembly, not the Draft write service. Final order: bounded timeout settings; workspace `FOR NO KEY UPDATE`; sorted owning/affected-week locks; accepted parent-before-child scheduling guards extended for new tables; current session/request/operation checks; exact fresh source comparison after waits; atomic business/event/revision/outbox changes; exact after-state assertion. Prove actual lock compatibility with every relevant writer rather than assuming a proposed order is sufficient.
- [ ] Use one bounded retry owner, at most three attempts for recognized source/serialization/deadlock conflicts. The nested publication adapter must not introduce another retry loop. Timeout after uncertain commit returns outcome-unknown until the same actor-scoped operation record is reconciled. Changed input with the same operation ID is rejected.
- [ ] Implement ordinary offers, consented trades, manual routing and callout release separately. Pending inability is visible risk. Approved release remains released until covered **only while the current assignment still matches the approved callout's owner, episode and material terms**. A replacement's later callout and a return to the original owner use a new ownership episode; a same-owner material date/time/location edit invalidates active release applicability until explicit review. Old absence history is retained but cannot silently release the new/current assignment. Callout reporting after trade cutoff remains accessible without retroactive whole-shift transfer.
- [ ] Promote completed human-consented assignments to protected origin, retain generation exclusions, preserve slot position/Lead/terms and create only affected publication changes. Do not set a manager approver for an automatic result. Preserve immutable history after live-source changes. Material edits invalidate old consent; harmless label changes do not.
- [ ] Run controlled two-connection barriers for A039–A052/A054/A057/A081/A082/A089/A097, in both relevant writer orders. Include absent-row leave/availability, source-target crossover, manager deletion/unpublish, generation, session revocation, rule/profile changes, same-owner material shift edits against approved callouts, returning-original-owner episodes, and injected failures between write stages. Assert assignments, episodes/fingerprints, operations, events, participation, acknowledgements and outbox—not just HTTP status.
- [ ] Run the exchange integration command and affected publication/generation suites, then obtain one focused transaction review. Resolve findings before UI integration; archive checkpoint and actual commands/exits.

## T04 — Expiry, escalation and notification lifecycle

**Deliverable:** Due work progresses without stale invitations or duplicate visible outcomes, independent of whether a background trigger is currently active.

**Create:** `src/lib/shift-changes/maintenance.ts`; `src/lib/data/shift-change-maintenance.ts`; adjacent tests; `src/test/integration/shift-change-notifications.integration.ts`.

**Modify:** `src/lib/data/notification-state.ts`, `request-notifications.ts`, `notifications.ts`; `src/lib/notifications/types.ts`, `recipients.ts`, `destinations.ts`, `reminders.ts`, `worker.ts`; `src/lib/assistance/notification-events.ts`; existing reminders route, worker route tests and `scripts/fuel-notification-worker.ts` only as needed to invoke maintenance after authentication.

**Interfaces:** `projectShiftChangeState(snapshot, now): EffectiveRequestState`; `planShiftChangeMaintenance(snapshot, now, notificationPolicy): readonly MaintenanceIntent[]`; `runShiftChangeMaintenance(deps: MaintenanceDeps): Promise<MaintenanceReport>`. `MaintenanceDeps` contains executor, trusted clock, existing workspace-bound notification config and bounded cursor; workers use explicit system provenance, not an invented employee ID.

- [ ] Write A053–A064/A069–A072/A087–A089 tests first: submission cutoff versus completion expiry, tighter policy during waits, no worker running, duplicate ticks, already-claimed delivery, legacy status versions and reopened-as-new linked requests.
- [ ] Implement monotonic `r:<revision>` exchange/callout event versions with explicit legacy readers. Same-status events must not disappear. Keep unrelated time-off semantics unchanged.
- [ ] Materialize due expiry/escalation through guarded status/event transactions. Closing the submission window does not expire an existing request. No GET scheduling writes; reads show effective expiry even if maintenance is disabled.
- [ ] Extend the current notification source validator explicitly: it currently rejects OPEN exchange events, so adding an invitation template alone is insufficient. New coverage invitations require current eligible audience checks at materialization, dispatch, open and final acceptance, with no private callout reason exposure.
- [ ] Coalesce request and publication completion to one visible message per affected recipient/transaction while preserving internal events. Treat a queued/delivered notification separately from a committed assignment. Reoffers retain semantic-need notification budgets; no repeated campaign or new paid scheduler.
- [ ] Reuse existing 12-hour urgency, 5-minute summary collection and quiet-hour handling via existing config. Keep immediate manager attention distinct from whether push delivery may occur now. Resolve expiry before issuing a due invitation/escalation.
- [ ] Run fake-clock/provider and actual disposable outbox/race tests. Expected: one valid event per lifecycle stage, no provider calls in the transaction, zero real delivery. Document that unattended operation still requires separately authorized trigger activation. Snapshot results.

## T05 — Existing employee/manager screens and policy configuration

**Deliverable:** The feature is operable through existing minimal surfaces, with truthful states, protected privacy and no redundant approval work.

**Create:** `src/components/shift-change-policy-fields.tsx`; `src/components/operational-rule-fields.tsx`; adjacent tests; focused action-state component only if an existing reusable form cannot express it.

**Modify:** `src/app/app/exchange/page.tsx`, `swap/page.tsx`, `callout/page.tsx`; `src/components/manager-shift-requests.tsx`; `src/app/app/schedule/settings/page.tsx` and `actions.ts`; `src/app/app/employees/[employeeId]/page.tsx` and employee `actions.ts` for the compact Owner-reviewed profile; `src/app/app/page.tsx`, schedule readers and notification destinations only where the shared outcome must refresh. Use scoped `src/app/globals.css` additions.

**Interfaces:** `ShiftChangePolicyFields({policy, canEdit})` and `OperationalRuleFields({employeeId, profile, canEdit})` consume safe server projections; Owner-only save actions delegate to T01 guarded persistence. `ShiftChangeResult` is the only source of command feedback; URL flags alone are not proof of success.

- [ ] Write A066/A073–A079/A085/A088/A093–A095/A097 view/action tests before behavior changes. Exercise all existing aliases and role-specific routes.
- [ ] Integrate policy controls as disclosures within the existing configuration flow, not new top-level dashboards/cards. Explicitly show unknown values; do not prefill labor-like numbers. Manager review cannot edit Owner policy or bypass unknown required facts.
- [ ] Show both sides of trades and complete position/Lead/date/time/location. Distinguish offered, awaiting employee, manual review, reported inability, released-unfilled, completed, expired, already taken, stale, offline and uncertain outcomes.
- [ ] Refresh both employees' schedules, hours, coverage, request history, manager attention counts and affected acknowledgements using the existing shared readers. Handle success, double submit, failure and retry without moving button widths or losing safe inputs.
- [ ] Render affected states at all seven widths in Chromium/WebKit. Check complete text-node bounds before horizontal scrolling, actual keyboard focus, screen-reader feedback, >=44px actions and final controls above bottom navigation. Test long names/positions and mobile form entry; do not shrink/hide labels.
- [ ] Compare protected role/auth/PWA/Clocker screens with accepted source. Unchanged expensive evidence may be reused only with exact exercised-input proof. Keep one UI writer and focused review for confirmed changes; preserve before/after artifacts.

## T06 — Integrated verification and final local handoff

**Deliverable:** Evidence for every requirement and scenario, an independent whole-branch review and one clean local implementation commit.

**Create:** `src/test/integration/owned-next-app.ts`; `src/test/integration/shift-changes.e2e.ts`; `vitest.exchanges-e2e.config.mts`; `scripts/verify-nevora-phase-5-ui.mts`; `docs/architecture/nevora-shift-coverage.md`; `docs/ui/2026-10-04-nevora-phase-5-review.md`. Add `test:exchanges:e2e` and `test:exchanges:ui` scripts using the already available browser toolkit, not an automatic package download.

**Authenticated-app harness:** Build an owned scratch mirror of exact candidate source, excluding all `.env*`, credentials and unrelated artifacts. Substitute only `src/lib/db.ts` in that mirror with a clearly recorded adapter to the ownership-marked loopback PostgreSQL instance using existing `pg`. Its tagged-query, `.query` and ordered `.transaction` behavior must be contract-tested against repository usage. Keep production `src/lib/db.ts` unchanged. Run real login/session cookies, Next actions, actual database transactions and revalidation; do not mock authorization or return fake workflow successes. Record this as real Next + PostgreSQL with substituted database transport, **not** production Neon HTTP proof. Use existing installed Playwright through the approved toolkit; read its README before use.

- [ ] Run actual authenticated journeys for A073/A097 and the five Review Focus cases, including revoked session, operator/candidate roles, state refresh and uncertain-outcome reconciliation. Use fictional credentials only and delete only owned test resources.
- [ ] Run `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `git diff --check`, `npm run test:exchanges:integration`, `npm run test:exchanges:e2e` and `npm run test:exchanges:ui` against the final source. New script names in this plan must be implemented before invoking them. Inspect scripts and safe environment first.
- [ ] Run affected `test:generation:integration`, `test:foundation:integration`, `test:notifications:integration`, `test:foundation:qa` and `test:notifications:qa`. Schema, source mapping, shared validator and publication changes make old Phase 4 results insufficient by themselves. Record intentional migration-factory changes and historical-version tests separately.
- [ ] Profile candidate discovery, one final command and one maintenance batch independently on fictional 40/160-employee multi-location datasets. Record inputs, limits, latency and peak resources; do not promise production capacity or reuse the dense Phase 4 planner result as a coverage-claim benchmark.
- [ ] Complete `EXECUTION_TRACEABILITY.json`: all A001–A098 and R01–R17 link to actual paths/tests/commands/results/source. Every unrun or blocked case is explicit. Do not meet an arbitrary test-count quota or mark planning scenarios as passed.
- [ ] Obtain independent whole-branch review. Fix reproduced findings with targeted RED/GREEN; rerun all affected checks. Do not mask screenshots, weaken assertions or repeatedly recertify unchanged low-risk work.
- [ ] Archive implementation/QA/activation limitations, exact changed-file manifest, source-attributed screenshots and owned-resource records. Commit once locally as `feat: automate shift changes and coverage`; verify its exact parent and clean worktree/index. Leave both accepted Phase 4 and customer environments untouched.
- [ ] Stop for Jose's final Phase 5 review. Customer numeric policy/legal review, real environment migration, deployment, provider/trigger activation and physical-device validation remain separate approvals.

## Plan review and change control

Jose approved Phase 4, the Phase 5 design, and—conditionally on this final independent check—the corrected exact implementation plan. The final check found and corrected the assignment-episode/callout-term edge described above without changing approved product scope. The agreed execution approach is the existing Codex controller pattern with bounded implementation ownership, focused high-risk reviews and one final independent branch review. Do not request the same approvals again. No parallel writers may edit the shared transaction/rule modules.

Technical names/schema choices above are implementation proposals subject to that plan review. If the exact source or an invariant proves a proposal unsuitable, report the concrete conflict and amend the smallest affected plan section before implementing it. Do not silently add feature scope, invent customer policies or rewrite the accepted baseline.

## Interface detail for T01/T03 implementers

These definitions pin the handoff between tasks. They are proposed TypeScript contracts to implement in `src/lib/shift-changes/types.ts`, not existing source exports.

```typescript
type DeadlineInput = {
  stage: 'SUBMIT' | 'COMPLETE';
  now: string;                  // authoritative ISO instant
  earliestShiftStart: string;
  currentSubmissionAdvanceMinutes: number | null;
  currentCompletionAdvanceMinutes: number | null;
  recordedCompletionDeadline: string | null;
};
type DeadlineResult =
  | { status: 'READY'; submissionDeadline: string; completionDeadline: string; allowed: boolean }
  | { status: 'UNVERIFIED' | 'INVALID_POLICY'; allowed: false };

type CommandIdentity = { operationId: string };
type ReviewedSource = { sourceShiftId: string; sourceEpisodeId: string; sourceTermsFingerprint: string };
type ReviewedTarget = { targetShiftId: string; targetEpisodeId: string; targetTermsFingerprint: string };
type ExistingRequestCommand = CommandIdentity & {
  requestId: string;
  expectedRevision: number;
};
type ShiftChangeCommand =
  | (CommandIdentity & ReviewedSource & { kind: 'OFFER_COVERAGE' })
  | (CommandIdentity & ReviewedSource & ReviewedTarget & { kind: 'PROPOSE_SWAP' })
  | (ExistingRequestCommand & { kind: 'ACCEPT' | 'DECLINE' | 'CANCEL' | 'WITHDRAW' | 'MANAGER_APPROVE' | 'MANAGER_DECLINE' | 'MANAGER_CLOSE' })
  | (CommandIdentity & { kind: 'SUBMIT_CALLOUT'; sourceShiftId: string; reasonCode: CalloutReasonCode; reasonNote?: string })
  | (ExistingRequestCommand & { kind: 'APPROVE_CALLOUT' | 'DECLINE_CALLOUT' | 'CANCEL_CALLOUT' });
```

`CalloutReasonCode` is the existing exported union in `src/lib/data/callouts.ts`; reuse it without broadening categories. An initial offer/proposal view must return the current terms for review before the consent-bearing submission. `ReviewedSource` and `ReviewedTarget` bind creation to the displayed fingerprints and assignment episodes. Recompute each fingerprint server-side. The fingerprint protects consent freshness; it grants no authority. The stored requester consent and target response both identify the same terms. If the form's source changes before creation, refuse rather than silently offering a different shift.

`SessionMutationProof` is server-created `{employee: SessionEmployee, sessionTokenHash: string}`. Load it from the actual cookie and current database session; do not accept it in serialized form input or persist its hash in general request history. Final guards verify that specific session's current account, expiry and role. New server-only methods must not be imported into client components.

`TransitionInput` contains `{request, command, actor, evaluation, deadline}`: the current request includes kind/status/revision/participants/consent and legacy marker; `actor` is the current authenticated employee and role; the evaluation and deadline are T02/T01 outputs. `TransitionDecision` is a finite union of refused-with-code, unchanged or next-state-with-required-effects. It never executes SQL and never invents an assignment or consent. Derive eligibility/phase state from server inputs, not UI state.

`PolicyWrite` contains the server proof, expected revision and validated complete replacement for the edited policy scope. `PolicyWriteResult` is saved-with-new-revision, conflict or invalid-with-field-errors. Partial edits must preserve the other workflow and unrelated customer settings. Employee profile writes use the same version-checked contract and explicit employee ID; the server supplies reviewer identity/time.

`OperationalRuleInput` reuses the normalized candidate/retained ledger from `ValidateShiftInput`, resolved profile and workspace timezone, plus known scheduled-break facts or an explicit missing-data marker. `OperationalRuleResult` returns hard blockers, unverifiable prerequisites and soft review warnings separately. New reason codes: `MIN_REST`, `MAX_SHIFT_HOURS`, `MAX_DAILY_HOURS`, `BREAK_REQUIREMENT`, `RULE_UNVERIFIABLE`, `PROJECTED_OVERTIME_REVIEW`. Preserve old validation codes and safe messages. An unmet required break is a blocker; missing evidence is UNVERIFIED; neither can become a target-hours warning.

Final command results reference the persisted operation outcome. For a retry of a completed operation, return that original outcome even if the request has since had a later linked lifecycle; do not recompute the old command using today's policy. Authorize access to the result first. For a fresh conflicting command, re-read/revalidate current source under the bounded retry policy.
