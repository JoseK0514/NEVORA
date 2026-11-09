# Task 1 approved requirements
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

Controller constraints: Do not dispatch subagents. Do not commit or use real customer data. All tests use owned disposable resources. The controller reserves one final implementation commit.
