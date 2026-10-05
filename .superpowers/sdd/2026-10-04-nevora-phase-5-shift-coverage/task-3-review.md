# Spec compliance: ❌ Issues found

T03's privacy and immutable-history requirement is violated when a request is closed after its shift has been reassigned. The remaining reviewed command, transaction, session, consent, release-applicability and publication changes substantially implement the task. Task quality: **Needs fixes**.

Review basis: task-3-brief.md, task-3-report.md and the frozen task3-candidate/review.diff against the task2-fix2 source snapshot. This is a task-scoped review, not the later whole-branch gate. References below are candidate source line numbers. No checkout, index or HEAD changes; no test reruns, existing-database access, provider activation or subagents.

## Strengths

- `src/lib/data/shift-changes.ts:123–137` uses one coherent read, actor/workspace-scoped original operation lookup, one transaction and a final session/deadline guard. Its command path uses the pure publication assembler, not the public adapter's retry loop; the three-attempt owner is at `:121–150`. `src/lib/data/shift-change-snapshot.ts:11–22` composes session authorization with shared scheduling/publication source without impersonating management.
- `src/lib/data/generation-guards.ts:61–70` establishes workspace, sorted week, parent-before-child table locks and a separate fresh source assertion. `src/lib/data/shift-changes.ts:136–137` then protects the specific session row and rechecks natural expiry after operation insertion. Real two-connection tests cover session changes in both orders and natural expiry (`src/test/integration/shift-change-races.integration.ts:25,140,152`), source changes in both orders (`:34,78`), actual manual writes (`:91`), actual generation/exclusion writers (`:114`) and crossed participation (`:132`). Direct SQL input tests and actual production-writer tests are distinct evidence.
- `db/migrations/0010_shift_coverage_automation.sql:34–56` separates ownership episodes from a server-owned material counter, including parent schedule and workspace timezone invalidation. `src/lib/data/shift-change-release.ts:14–16` requires current owner, episode, material JSON and fingerprint; the tests exercise returning owner, changed timezone and edit-away/edit-back (`src/test/integration/shift-changes.integration.ts:51,104,117,152`). Harmless notes do not increment the counter.
- `src/lib/data/shift-changes.ts:106–116,133–137` composes request, both assignment legs, history, notifications, publication and durable result atomically. `src/lib/data/shift-change-guards.ts:11–17` retains provenance/unchanged-shift assertions while permitting server-minted transfer episodes. Stage-injected rollback and committed-response-loss tests inspect persisted state (`src/test/integration/shift-change-races.integration.ts:55,64`); publication tests verify uninvolved acknowledgement and no unrelated revision (`src/test/integration/shift-changes.integration.ts:129`).

## Important — must resolve before T03 approval

### R1. Preserve original request identities and private reason ownership when closing stale requests

**Location:** `src/lib/data/shift-changes.ts:45–49` (especially `:49`), closure path `:61–77`; disclosure sink `src/lib/data/shift-change-history.ts:9–12`.

The existing request's `source` is the **current live shift**, and both `calloutRecord` and `event` use `source.employeeId`. The event nevertheless copies `r.reason_code` / `r.reason_note` from the **original callout**. Cancellation authorizes against `r.employee_id`; manager decline also deliberately allows stale requests (`fresh()` is required only for approval).

Concrete reachable sequence: employee E1 submits a pending callout containing a private reason; management reassigns that shift to E2; E1 cancels the pending callout, or management declines it. The transaction appends an event with `participants.employeeId = E2` and E1's reason. `readShiftChangeHistory` expressly grants reason access using that participant field, so E2 can read the private reason and E1 loses visibility of the new closure event. The callout notification projection also substitutes E2 as the request employee. Existing exchange closure helpers similarly replace the original requester with the current shift owner, and the explicit stale-linked cancellation branch uses that helper at `:57`.

The event's stored source terms are likewise relabeled from the live assignment, contradicting the requirement to preserve history after live-source changes. Current material terms are necessary for release/assignment eligibility; they are not the identity of a historical request.

**Fix:** derive existing-request history participants, original terms and request notification recipient identity from the persisted request/consent/callout, retaining live terms only for applicability and current access/location checks. Preserve the actual acting employee separately. Apply this to callout cancel/decline, ordinary exchange closure and stale linked-coverage cancellation. Add focused SQL regression cases for E1→E2 reassignment followed by employee cancel and manager decline: E2 gets no private reason/history authorization or misdirected personal intent, E1 retains correct history, stored original terms remain correct, and the transaction stays atomic. This finding follows directly from the code; I did not rerun a suite or create a runtime reproduction.

## Minor — non-blocking follow-ups

### R2. Employee callout cancellation is labeled as manager outcome

**Location:** `src/lib/data/shift-changes.ts:67,77`.

Every existing-callout transition assigns `mode='MANAGER'`, including `CANCEL_CALLOUT` by an Employee/Lead. The persisted actor is correct and `reviewed_by` remains null, but immutable `outcome_mode` misstates the provenance. Only assign manager mode for actual management review, or leave cancellation mode unset/use a defined employee-cancellation value. Verify the cancellation event does not claim manager review.

### R3. Shared generation source now loads and compares all append-only event and operation history

**Location:** `src/lib/data/generation-guards.ts:14,26–28,48–49,61–70`; command dependency `src/lib/data/shift-changes.ts:123–125`; snapshot read `src/lib/data/shift-change-snapshot.ts:11`.

Adding both historical tables to the common table list causes every Phase4 generation read, exact guard and after-state guard to serialize and compare all accumulated rows. Events include private reason text and add no scheduling eligibility fact. Operations are needed only for the current actor/workspace/operation identity, but the implementation reads all results. Every new history row therefore increases future payload/JSON work indefinitely and can invalidate an otherwise unrelated snapshot. The complete read itself precedes transaction timeout settings.

The implementer's concurrent-replay rationale is valid for checking the current operation, not for reading every operation or any event. A bounded current-operation read/CAS guard can retain same-operation replay without making Phase4 generation depend on historical command outcomes; table locking can remain separate from source projection. Remove event history from the scheduling projection and scope the operation dependency when addressing this.

**Severity rationale:** Minor in this task gate because the accepted source already conservatively includes workspace-wide requests/publication history, the reviewed behavior remains fail-closed, and there is no measured workload demonstrating a new availability failure. This is a real incremental performance/coupling cost, not a correctness waiver based on the report's rationale. No production-scale claim is supported.

## Cross-task and evidence limits

- ⚠️ `src/app/app/exchange/actions.ts:10–38` and callout aliases require the new finite contract. T05 form integration, browser recovery UI, mobile/focus states and the authenticated local-app journey are not verifiable from this backend diff. Existing forms are acknowledged to fail closed until T05; do not ship this isolated checkpoint as complete application functionality.
- ⚠️ `src/lib/data/request-notifications.ts:27–33` retains the existing source-version model. T04 explicitly owns `r:<revision>`, coalescing, expiry and worker authority; these are not T03 failures or verified features.
- ⚠️ The both-order tests use real SQL transactions through an owned local transport adapter, not real Neon HTTP/cookie/browser journeys. Source/profile/absence facts are compared after locks, but end-to-end production transport behavior remains T05/T06 evidence.
- `generation-exclusions.ts`, `schedule-generation-snapshot.ts` and `publication-revisions.ts` have no T03 textual hunks despite appearing in the proposed modify list. The exclusion writer already invokes the changed shared guards; the generator snapshot receives the corrected shared mapper; historical revision readers must retain recorded booleans. I found no concrete missing behavior solely from these absent hunks. The release-sensitive publication insertion changed in `notification-transactions.ts:341–346`.

## Focused checks outside the diff

- **Participation/null-fingerprint risk:** read only migration0010's unchanged participation/event/operation section (`:103–193`). The one-row-per-shift participation trigger prevents pending duplicate callouts even before review fingerprint exists, and retains history without live-source foreign keys. This concern did not become a finding.
- **Material-trigger compatibility with publication builders:** inspected `publication-revisions.ts:129–151` and the bounded schedule writer/status references. The publish builder retains the shared guarded publication path; no additional demonstrated regression was found in this check.
- **Deletion-only writer lock coverage:** inspected `generation-exclusions.ts:30–64`; it uses the extended shared guards before deletion and exact after-source comparison, matching the actual writer race tests.
- **Completion's delegated eligibility/deadline contract:** read the evaluator's beginning because its diff hunk starts midway through the function, and the bounded deadline resolver in `shift-changes/policy.ts`. Completion evaluates current assignment terms, active owners, current incoming eligibility/profile and the earlier of current versus recorded completion deadline. No additional T03 gap identified.
- **Truncated function context:** read only the ends/beginnings of `generationMutationGuards` and `decideShiftChangeTransition` omitted by diff context. The former ends in the expected fresh source guard; closure authority uses persisted request participants. Tool-output-truncated diff portions were recovered without starting a second review pass.

## Checks actually inspected

No test commands were rerun. Final supplied logs under `/Users/josek0514/.codex/visualizations/2026/10/04/nevora-phase5/task3/` show:

- `unit-all2.log:10–16`: 119 files / 1,292 tests, `PROCESS_EXIT=0`.
- `sql-freeze.log:11–17`: 6 files / 63 tests, `PROCESS_EXIT=0`.
- `notifications-all2.log:10–16`: 77 tests, `PROCESS_EXIT=0`.
- `generation-final.log:11–17`: 3 files / 144 tests, `PROCESS_EXIT=0`.
- `lint-final.log:8`, `typecheck-pass.log:7`, `diff-check.log:3`: `PROCESS_EXIT=0`.

Inspected final logs contain no warning/error output. These passing runs do not exercise R1's stale closure/private-history scenario. No deployment or production verification is implied.

## Assessment

**Spec:** ❌ Needs correction for original participant identity, private absence disclosure and immutable request history on stale closure.

**Quality:** Needs fixes. The transaction architecture and tested race/rollback boundaries are strong enough to support a focused repair. Resolve R1 and verify its new regression cases before T03 approval; R2 is a small related provenance correction, while R3 is a non-blocking bounded-source follow-up.
