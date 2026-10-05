# NEVORA Workforce — Phase 5 specification
## Shift Changes & Coverage Automation

**Prepared for Jose K. Natal | VELANI LLC | 4 October 2026**

**Version 4 • Product design approved; Phase 4 accepted at `6c0f2b77b6186c4cd86db7e97f869ea831ee32b0`; corrected exact implementation plan approved after final independent review. No production activation authorized.**

The approved roadmap establishes Phase 5’s scope. Jose approved the reviewed approach after the market comparison: “if you understand its good then I APPROVE THIS”. This revision records that product-design approval and incorporates the refinements to **P01, P04 and P07**, while retaining the other summarized workflow policies. It does not select customer-specific numeric notice/rest/hour/break values or certify legal applicability. See `05_APPROVAL_AND_REFINEMENTS.md`. The original source inspection occurred during active Phase 4 work; it is historical. The accepted Phase 4 commit is `6c0f2b77b6186c4cd86db7e97f869ea831ee32b0`; verify that identity at implementation entry. The final plan review/correction is recorded in `09_FINAL_PLAN_REVIEW.md`. Only handoff documents were changed by this approval/review work.

## 1. Intended outcome and authority

An Employee or Lead can request a trade or voluntarily offer/accept coverage for a published shift. NEVORA completes routine, consented changes when current shared rules and the approved workspace policy permit them. Managers handle genuine exceptions, not every valid transaction. An inability-to-work report is distinct from an ordinary coverage offer; recording it, approving a release and filling the vacancy are not interchangeable events.

**Product principle:** Automate normal work. Surface exceptions.

**Brand hierarchy:** VELANI LLC owns NEVORA; Workforce is the module. Fuel Coffee Drive is customer/workspace data. Do not hardcode Fuel names, two locations, Puerto Rico timezone, staffing counts or shift windows.

Source precedence: Jose’s explicit decisions and the master handoff establish product intent; the final approved Phase 4 code establishes integration contracts; this revision records the approved direction and its implementation constraints. Historical phase-specific documents are evidence of existing behavior, not automatic authority to expand Phase 5. Record any conflict and resolve it before changing the affected behavior. See `03_SOURCE_REVIEW.md` for the inspected paths and limitations.

### Roadmap requirements and approved refinement coverage

| ID | Required capability |
|---|---|
| R01 | Employee two-person swap requests and consent |
| R02 | “Unable to Work This Shift” and the existing callout workflow |
| R03 | Eligible replacement candidates using shared scheduling logic |
| R04 | Voluntary coverage offers and acceptance |
| R05 | Automatic completion when rules pass and approved policy allows |
| R06 | Manager intervention for exceptions, with actionable explanations |
| R07 | Duplicate-claim, stale-state and concurrency protection |
| R08 | Expiry and escalation of unresolved requests |
| R09 | Targeted notifications and correct reminder cancellation |
| R10 | Reuse of Phase 4/shared eligibility; no second scheduler |
| R11 | Preservation of published revisions, assignments, history and Phase 4 provenance |
| R12 | Secure Employee/Lead and Owner/Manager permissions and privacy |
| R13 | Existing NEVORA UI contract, mobile usability and meaningful states |
| R14 | Safe migration preparation, verification, isolated work and review-only handoff |
| R15 | Separate swap/coverage approval controls and configurable submission/completion deadlines |
| R16 | Shared rest, per-shift/daily-hour and break-rule validation with explicit applicability and unknown-data handling |
| R17 | Target hours, hard scheduling caps and projected overtime risk kept separate; no payroll or legal-certification claim |

R01–R10 map directly to the Phase 5 roadmap. R11–R14 carry forward the handoff’s engineering, data and UI constraints. **R15–R17 are the refinements approved after the market review**, not features claimed to exist in the old code or requirements retroactively attributed to the original handoff. All 17 requirements have planned acceptance coverage in `02_TASKS_AND_ACCEPTANCE.md`. Public-source observations are separated from NEVORA decisions in `06_MARKET_REFERENCE_NOTES.md`.

## 2. Approach and scope boundaries

**Approved approach: extend the existing workflow and transaction architecture.** Retain the exchange/callout models and existing screens where possible; add the missing policy, consent versioning, atomic automatic transitions, expiry and notification behavior. Extract a narrowly scoped reusable evaluation adapter only where the final Phase 4 interfaces require it.

A simple change from `MANAGER_PENDING` to `APPROVED` is insufficient: the action-level validation observed in the current implementation is not proof of complete final-write scheduling revalidation. Conversely, a new marketplace, parallel rules engine or independent publication system would duplicate working infrastructure and create conflicting authorities. Neither approach is recommended.

### Included

Whole-shift two-person trades, whole-shift voluntary coverage, the existing inability-to-work path, valid automatic completion, manual-policy fallback, candidate discovery/ranking, transaction-safe consent, request-specific history, deadline handling, bounded escalation, targeted notifications, existing-screen UI integration and focused QA.

### Not included

Partial-shift splitting; three-way or multi-person trade chains; swaps between different owning workweeks; automatic employee allocation without consent; bidding or rewards for accepting shifts; background weekly schedule generation; publication of drafts; actual punches; timecards or payroll; attendance scores or disciplinary decisions; legal absence determinations; inventory; certifications; general chat; a general audit dashboard; customer provisioning; new paid infrastructure; provider activation.

The refinement adds only the scheduling-policy controls/checks necessary to make automatic decisions safely. It does not authorize a general legal-rules platform, payroll calculations, employee classification determinations, automatic break insertion, new time-clock functionality, certification tracking or unrelated UI expansion. Where a required rule cannot be evaluated, withhold automatic completion and expose the missing prerequisite; do not fabricate compliance.

Cross-location trades within one workspace and the existing same-owning-week rule are included when both directions pass validation. Overnight shifts may touch another business week even when the owning schedules are in the same week; this is not permission to ignore the second week’s hours.

## 3. Approved policy direction and customer configuration boundaries

The product direction below is approved. Values that depend on Fuel or another employer remain explicit customer configuration, not numbers chosen by this approval. Codex must not infer legal applicability, seed legal-looking defaults, or convert a missing setting into zero. Keep policy persistence small, versioned and Owner-controlled in an existing appropriate configuration surface. The exact data representation and reviewed implementation plan are still required; no new settings dashboard.

| Decision | Approved product direction | Compatibility / safety consequence |
|---|---|---|
| P01 — separate approval modes | Provide independent swap and coverage approval modes: automatic-when-valid or manager review. Fuel’s intended normal workflow is automation, but activation must explicitly select and save the customer modes. | Missing/unreviewed configuration keeps the established manual path. One mode must not toggle the other. Legacy/manual requests do not auto-complete merely because a mode changes. |
| P02 — competing coverage claims | First **valid transaction that commits** wins. Ranking guides suggestions, not involuntary assignment. | Do not promise that the earliest phone tap wins; invalid or failed claims do not reserve the shift. |
| P03 — inability to work versus an offer | Preserve current manager review for a true callout/release. Ordinary “Offer shift” opens coverage immediately. An approved callout releases the original employee and opens coverage even if unfilled. | Do not silently auto-approve absences or make a released employee responsible again. Immediate solicitation while a callout is pending is a separate alternative requiring explicit approval, not part of the approved default here. |
| P04 — configurable notice | Distinguish request-submission cutoff from acceptance/finalization cutoff, configurable by workflow. Neither may permit a whole-shift transfer at/after the earliest affected shift start. An explicitly configured zero advance cutoff is supported; no numeric customer value is selected here. | Missing values are not zero. Final guards enforce the request’s recorded deadline and any tighter current policy after lock waits. Urgent inability reporting remains accessible when trading is closed; no silent deadline extension or emergency override of hard rules. |
| P05 — invitation audience | One initial invitation to each currently eligible, authorized Employee/Lead for that specific open coverage request, respecting existing notification preferences. | No all-staff blast, reasons disclosure, tiered invitation campaign or automatic repeat candidate reminders. Prefer the existing portal for discovery. |
| P06 — escalation | Reuse the existing manager summary/urgent window. Add at most one explicit urgent escalation per request lifecycle when still unresolved; a request created inside the window escalates immediately. | The kickoff must resolve the actual configured urgency value from the approved base. Do not invent a numeric threshold or buy a scheduler. |
| P07 — rule severity and safety | Automatic completion uses one shared evaluator, including applicable rest, per-shift/daily-hours and break checks. Targets are preferences; hard scheduling caps remain hard. Projected overtime risk is a separate policy decision, not automatically a prohibition. | A known hard-rule failure blocks; an applicable rule that cannot be evaluated withholds auto-completion and explains the missing prerequisite. Manager review does not bypass a legal requirement, hard cap, unknown required fact or consent. Only established permitted soft exceptions may be resolved manually. |
| P08 — trade scope | Keep whole-shift, two-person trades within the same owning workweek; allow eligible cross-location trades. | Preserve current restrictions; proposed cross-week/partial trades belong to separately approved expansion. |
| P09 — withdrawal and reopening | Allow requester cancellation and claimant withdrawal before completion, atomically against the current version. A closed request stays closed; an explicit reoffer creates a linked new request. | No silent undo of completed assignments. A failed eligibility check leaves an open offer available to others; a cancelled/declined request is not automatically resurrected. |

**Release versus responsibility:** the ordinary offer keeps the existing assignment until a replacement commits. An approved callout is an exception: release already occurred and the vacancy must remain visibly unfilled until covered. The UI must not convert this software rule into an employment-policy statement such as “you must attend regardless.” Manager absence decisions and the employer’s real policies remain separate.

## 4. Existing contracts that must survive

### 4.1 Request lifecycle and names

The inspected exchange model already has `OPEN`, `EMPLOYEE_PENDING`, `MANAGER_PENDING`, `APPROVED`, `DENIED`, `CANCELLED` and `EXPIRED`. Callouts have `PENDING`, `APPROVED`, `DENIED` and `CANCELLED`. Prefer these persisted states with explicit outcome reasons/metadata over a gratuitous new state vocabulary. Friendly UI labels can say “Completed” for a successfully applied exchange, but legacy `APPROVED` must remain understandable to existing consumers.

Do not persist ephemeral `VALIDATING` or `CLAIMED` states merely to animate a spinner. Pending UI is not an assignment. Use an actual reserved state only if an approved workflow truly needs durable reservation, expiration and recovery.

### 4.2 Two different publication operations

Phase 4 produces drafts and never publishes them. Phase 5 may automatically change **already-published assignments** after the approved consent and policy gates. That is an auditable published-week change using the existing revision/notification transaction, not an automatic publication of a draft.

Never call the general Publish action or populate a “publish all weeks” option to implement a swap. Keep untouched schedules’ statuses unchanged. A successful swap/coverage change must update affected published snapshots, affected employee acknowledgement state and targeted notification intents atomically with the assignments. Preserve unrelated employees’ acknowledgements and effective publication versions.

### 4.3 Generation provenance

The current Phase 4 exchange writer promotes changed generated assignments to protected human-controlled origin and clears generated claims. Preserve that behavior: employee-consented changes must not be later treated as freely replaceable automatic draft work. Keep the true actor and resolution mode in request history; an internal `MANAGER` origin value is not evidence that a manager personally approved the exchange.

Do not create, clear or reinterpret generation-exclusion events when trading or filling an existing shift. Do not call **Allow auto-fill** implicitly. A request referring to a deleted or materially edited assignment becomes stale rather than recreating the deleted shift. Preserve references that keep published/requested assignments protected from regeneration.

## 5. Workflows and transition rules

### 5.1 A two-person trade

1. The requester selects an owned, future, published assignment and a second employee’s eligible published assignment. Show both complete shift contexts, including date, time, location, assigned position and designated Lead responsibility.
2. The server authorizes the caller, checks both slots and evaluates the proposed final ledger, with each outgoing assignment removed before its incoming assignment is evaluated. Bind the proposal to the exact two assignment versions and identities. Creation records the requester’s consent to those terms.
3. The target receives a targeted request and may accept or decline. The target cannot change the offer’s terms while accepting.
4. On acceptance, recheck both employees, both consents, deadlines, policy version, both assignments and the complete relevant scheduling source. Under automatic policy, update both assignments and terminal request state in one transaction. Under manual policy or a permitted manual exception, record consent and retain unchanged assignments in `MANAGER_PENDING`.
5. The result is visible in both employees’ current schedules and request histories. Failure leaves both assignments intact. A denial, cancellation, expiry or competing manager edit cannot leave half a swap.

| Current state | Action / condition | Next state | Assignment effect |
|---|---|---|---|
| None | Valid proposal | `EMPLOYEE_PENDING` | None |
| `EMPLOYEE_PENDING` | Target accepts, automatic policy, valid final checks | `APPROVED` | Both assignments atomically swapped |
| `EMPLOYEE_PENDING` | Target accepts, manual policy/permitted exception | `MANAGER_PENDING` | None |
| `EMPLOYEE_PENDING` | Target declines | `DENIED` | None |
| Active | Authorized withdrawal/cancellation before completion | `CANCELLED` | None |
| Active | Deadline reached | `EXPIRED` | None |
| Active | Terms/ownership/source no longer match | `CANCELLED` with stale-source reason | None; explain that a fresh request is needed |
| `MANAGER_PENDING` | Authorized approval, consent and current rules pass | `APPROVED` | Both assignments atomically swapped |
| `MANAGER_PENDING` | Manager declines | `DENIED` | None |
| Terminal | Duplicate identical command | Same terminal result | No second change |

An accepted-but-pending request must not capture consent to later edits. A change to date, time, location, position, Lead responsibility, consent-bound break terms or either assigned employee invalidates the relevant consent. A harmless display-name change can refresh presentation without changing the terms, while history preserves the original label where the existing contract requires it.

### 5.2 Ordinary voluntary coverage

An employee offers an owned future published shift. Its current assignment stays in place while `OPEN`. The portal shows authorized eligible opportunities; a list result is not a reservation or a promise of eligibility at acceptance time.

A candidate explicitly accepts the complete shift. The server excludes self-claims, validates full current eligibility and the source terms, and atomically commits exactly one replacement under automatic policy. Manual policy moves the request to `MANAGER_PENDING` with the candidate’s consent but does not alter the shift. A candidate who fails validation does not close the offer or prevent another eligible person from claiming it.

The replacement preserves the shift’s time, location, operational position and required Lead designation. Do not drop a Lead flag, remove a position or shorten the shift merely to make a candidate eligible. If a requirement cannot be satisfied, no automatic completion occurs.

After the commit, the former employee no longer owns the assignment, the replacement does, and both relevant views reflect persisted state. A repeated acceptance with the same operation identity returns the same outcome. A different claimant gets a clear “This shift is no longer available” result, not an apparent success.

### 5.3 Unable to Work This Shift

Keep this distinct from a preference to give away a shift. Under P03, preserve the existing request/review path and reason categories. Restrict free-text reasons to the requester and authorized management; candidates receive shift details, never illness/family/personal notes.

While pending, retain the recorded assignment and show the reported inability as an explicit risk in the existing management workflow. Do not represent it as confirmed available staffing or remove the employee without a recorded release decision. On approved release, count the original employee as released for the affected assignment, open one linked coverage request, and show the genuine coverage gap.

Coverage resolution must not rewrite the original reason or pretend the replacement was the employee who called out. Denying or cancelling a callout must not remove a replacement or roll back an already completed trade. Cancellation of pending callouts follows current permissions; cancellation after release requires a separately validated management action, not a casual state flip.

**Repeated-absence edge case:** after coverage, the replacement may later report inability to work the same shift. The original approved callout must remain historical, but must not permanently block the replacement through a shift-ID-only “one approved callout forever” constraint. Model the active callout against the relevant assignment/employee episode, or an equivalent reviewed association. Preserve both histories and ensure only the currently released owner is excluded from staffing/hours.

A genuine inability-to-work report must not be silently discarded merely because the shift already participates in an open offer or trade. Resolve the incompatible participation atomically, preserve the report, notify the affected participants without sharing the reason, and leave the manager release decision distinct. An approved replacement that committed first is never silently undone.

A report made for an ongoing shift, including an overnight shift that began on the prior business date, should notify management and clearly explain that self-service whole-shift replacement is unavailable. Do not silently ignore an urgent report because the normal trade cutoff passed. Reporting a past event must not manufacture a backdated exchange; route it to the existing management path without expanding into Phase 7 attendance corrections.

### 5.4 Manager exceptions and closure

Use the existing Pending / Open Coverage / Team Activity organization and Needs Attention counts. Routine automatically completed exchanges belong in history, not an approval queue. Pending manual requests must identify the concrete reason: configured manual policy, unresolved source/consent, or a permitted policy exception.

Managers can approve where current policy permits, decline, close stale offers or use the existing valid manual assignment workflow. They cannot invent employee consent for a voluntary exchange. A separate manager assignment remains a separate existing scheduling operation with its own authorization and notification rules.

Manual reassignment, shift removal, unpublishing or material editing must invalidate competing open requests atomically where feasible, or be detected by final guards before any request can complete. Do not display such a request as actionable indefinitely. Closing a request does not mean an unfilled staffing need has disappeared.

## 6. One eligibility policy and a truthful final ledger

Reuse `validateShift`, approved business-time helpers, scheduling health/readiness and the final Phase 4 source/guard contracts. Automatic completion must evaluate in the approved automatic mode; the inspected manual `SHIFT_EXCHANGE` mode can surface same-day exceptions differently and must not become an accidental automation bypass.

Check the following at discovery, creation where relevant, and authoritatively again at the final write:

- Current active workspace, location, account and session; current permissions and participating identities.
- Correct ownership, request kind/status, future published source and any target, recorded consent and matching assignment terms.
- Active READY location and current location eligibility for the actual assignment; unrelated unready locations must not block an otherwise valid selected workflow.
- Position membership, active position, preserved single assigned position, and preserved designated Lead capability.
- Normal availability, submitted weekly semantics, dated exceptions and all affected overnight days; approved time off; missing confirmation as the shared policy defines it.
- Full cross-location ledger, outgoing-assignment removal for swaps, approved released callout semantics, overlapping work and same-day limits.
- Maximum scheduled hours in **every touched business workweek**, including Sunday carry-in/carry-out; target hours remain preferences. Preserve established scheduled-hour/break accounting. Evaluate applicable rest, per-shift/daily-hour limits and break requirements as distinct facts; do not turn this into payroll or claim the scheduled ledger proves actual time worked.
- Post-change staffing, per-position quotas and required Lead coverage. Require no new or worsened coverage/Lead/position violation in affected periods; an unrelated preexisting gap must not defeat a useful valid change. Use the existing health semantics and explain unresolved gaps rather than claiming a fully staffed week.

Do not accept `eligible`, `role`, `workspace`, `maxHours`, `isLead`, absence approval, claimed “current hours” or validation success supplied by the browser. The server constructs the candidate and context from persisted facts.

### Candidate ranking

Ranking and claim ownership are distinct. Reuse Phase 4’s finalized shared preference policy for otherwise eligible candidates; do not run the entire weekly solver for each claim. The current older `coverage-ranking.ts` uses a different preference order and an alphabetical final tie. Reconcile it with the approved Phase 4 policy in one narrowly tested shared helper, preserving unrelated manual behavior unless the approved change explicitly covers it.

Confirmed availability, below-target status, target-completion ratio where defined, remaining target, scheduled hours and deterministic rotating ties should follow the approved Phase 4 semantics. Zero/missing target values must not cause division by zero, fabricated targets or permanent priority. Rank reason codes are operational explanation, not an employee score. Do not expose another employee’s private leave or availability details to peers.

### 6.1 Approval policy and applicability (R15–R17)

Use one authoritative, versioned policy resolution for the workspace and any existing applicable employee/location rule profile. Do not infer an employee’s exemption, age-related rule set, agreement or jurisdiction solely from an access role, job title or location name. Do not add a full employment-classification module in Phase 5. If an applicable profile cannot be established, make the affected automated decision unavailable and report the specific prerequisite.

Independent swap/coverage modes control routing, not eligibility. Preserve valid consent when a permitted request needs management review. A known hard failure does not become approvable merely by entering `MANAGER_PENDING`; an unresolved required fact remains unresolved until authorized correction and revalidation. Turning automation off applies at the final guard. Turning it on does not promote old/manual requests or expand prior consent.

### 6.2 Rest and daily/per-shift hours (R16)

At the final approved Phase 4 base, inventory the shared rule engine and its readers before adding code. Reuse an existing rule if present; otherwise make the smallest reviewed shared extension. Candidate discovery, final automatic decisions and affected manual/generator consumers must agree about rule meaning, with only documented mode-specific soft-exception handling. No copied formula in an exchange page and no second engine.

For an applicable minimum-rest rule, evaluate both the preceding and following retained commitments across all eligible locations and relevant day/week boundaries. An overnight shift or the start of another workweek must not hide adjacent work. Remove the outgoing assignment before evaluating a swap. Use the rule’s explicitly defined time basis: elapsed rest between resolved instants must not be confused with nominal scheduled wall minutes around daylight-saving changes.

Check a configured per-shift ceiling and daily ceiling separately from weekly hours and from a count-of-shifts-per-day rule. The policy must specify its applicable day/window and minute accounting; do not assume that a calendar day and any rolling 24-hour interval are equivalent. Conflicting or unsupported time bases are an explicit prerequisite, not permission to guess. Values in test fixtures are illustrative and must not be installed as customer policy.

### 6.3 Break requirements and unknown data (R16)

Preserve known scheduled meal/rest information and re-evaluate the incoming employee’s applicable requirements. A break valid for the outgoing employee is not automatically proven valid for the replacement. Check duration, timing, paid/unpaid treatment and other conditions only where the authoritative configured rule and facts support those checks. Do not invent a waiver, suppress a required break, shorten the shift, silently change consent-bound terms or deduct unpaid minutes to make a candidate fit.

A scheduled break is not evidence that a worker actually took it. Phase 5 does not insert punches, alter worked time, apply payroll deductions or implement a break optimizer. When an applicable rule needs data the current model lacks, return a clear “Required scheduling rule cannot be verified” outcome and block auto-completion for that case. Authorized management may resolve the prerequisite through an already-permitted workflow; a generic Approve button cannot bypass it. An explicit reviewed not-applicable classification is different from NULL/missing data.

### 6.4 Targets, caps and projected overtime risk (R17)

Keep three concepts separate in data, messages and validation: target hours (preference), maximum scheduled hours (hard configured ceiling), and overtime thresholds/risk (compensation-related policy). Exceeding a target is not a maximum violation. A projected threshold crossing is not by itself a statement that the assignment is illegal. A customer may choose manager review for projected overtime risk while keeping a separate hard cap; no review setting may bypass that cap.

Use the established scheduled ledger only for projections. Do not calculate final overtime pay or claim “no overtime owed” without authoritative worked-time and payroll facts, which are outside this phase. A daily overtime threshold is not interchangeable with a daily maximum. Preserve the existing weekly cap until an authorized configuration change; the market review does not authorize increasing it.

Record relevant rule/policy versions with the decision and recheck them after lock waits. Show safe operational explanations such as “Exceeds configured daily maximum,” “Insufficient rest under the configured rule,” or “Projected overtime needs manager review.” Do not expose private employee classifications to peers. Do not display “legally compliant,” “ADP certified” or “industry-standard approved” as a success label.

Before customer activation, obtain employer-approved notice and rule values, establish which employee/location policies apply, and confirm the applicable Puerto Rico or other jurisdiction requirements with a qualified labor professional. Product approval is not that legal review. A missing required configuration must not be replaced with a universal 8-hour day, 10-hour rest, 24-hour notice, 40-hour legal cap or other invented default. The approved work is the small configurable safety layer and its tests—not a comprehensive multi-jurisdiction compliance product.

## 7. Data, transactions and race protection

### 7.1 Minimal additive data design

Extend existing exchange/callout persistence where possible. The final implementation plan should identify the smallest schema additions that support: separate approval modes, policy/applicable-rule versions, request revision, consent-bound assignment snapshots, submission and completion deadlines, resolution mode/reason, expiry instant, escalation identity, and idempotent command outcome. Persist the distinction between absent configuration, explicit zero and reviewed not-applicable rules. Do not create a general regulatory-rule catalog.

Keep a request-specific immutable event/snapshot record sufficient to explain the original terms and terminal outcome after assignment ownership changes or a permitted source deletion. Existing source foreign keys can cascade exchange/callout rows, so do not rely solely on mutable joins for durable history. A compact new event association is acceptable; a second schedule database or general audit subsystem is not. Preserve existing retention behavior: no automatic deletion of request/absence/publication history is authorized by this phase.

Enforce one active exclusive request participation per shift across **both source and target roles**. Separate unique indexes on `source_shift_id` and `target_shift_id` alone do not express cross-column exclusivity. Use a reviewed shared participation guard/constraint mechanism; if a small reservation relation is required, derive it transactionally and clean it at every terminal outcome. Do not maintain an unverified parallel “availability” truth.

Preserve the one linked active coverage need for an approved callout, while preventing duplicate voluntary offers or crossed trades for that need. Resolve legacy duplicate/inconsistent rows safely during migration rehearsal; do not delete them silently.

The accepted Phase 4 tree contains committed migration `0009_schedule_generation.sql`. The implementation plan reserves `0010_shift_coverage_automation.sql` subject to a no-collision check in the new worktree. Do not edit historical migrations or assume any prepared migration has been applied to customer databases.

### 7.2 Request version and notification identity

The current notification adapter treats request status as its version and explicitly assumes lifecycles never return to an earlier status. New same-state edits, consent updates, repeated offers or escalation must not reuse stale event identities.

Introduce an explicit monotonic request revision/event identity if needed for the new lifecycle, and thread it through readers, snapshot builders, recipients, worker revalidation and notification cancellation. Maintain a compatibility reader for legacy status-version events or explicitly cancel/rematerialize them in a reviewed migration path. Do not change time-off or unrelated request version semantics as incidental cleanup.

Under P09, terminal requests are not reopened; a new offer links to the prior request. Even then, consent snapshots, expiry and notification versioning must remain unambiguous. An operation ID or hash is a retry/identity aid, not authorization. Bound and validate all user-controlled strings, arrays and notes with documented existing limits; T01 must settle any missing defensive input limit before implementation. Preserve supported framework action metadata without trusting it as business authority.

### 7.3 Atomic command protocol

Use the established transaction executor. The inspected Neon adapter submits ordered non-interactive SQL batches; do not introduce interactive-transaction pseudocode that the current adapter cannot execute.

1. Authenticate; parse and validate the allowed business fields, operation identity and expected request version. Resolve workspace and current actor server-side.
2. Read a coherent authoritative source: request and consents, the relevant schedule/assignment versions, policy, current time, both employees’ scheduling inputs, complete affected ledger and current notification access.
3. Evaluate the proposed final result outside long-held locks using the shared engine.
4. In one final batch, acquire the **same compatible lock order** as the approved Phase 4/publication/input writers; include every affected owning and business week. Recheck source, active session/role, deadline and policy after any wait, then apply all request/assignment/history/intent changes atomically and assert the exact resulting state.
5. Return a typed persisted outcome. Invalidate all affected schedule/request/count projections after a successful commit. Do not report success solely from a redirect query string.

Do not create a new lock order that deadlocks against generation, publication, employee/position eligibility, availability or time-off writers. Enumerate which existing writers participate in every invariant. Existing row locks do not automatically protect absent-row inserts or arbitrary related scheduling inputs; use the proven Phase 4 guard strategy or a reviewed equivalent. A guarded published snapshot alone does not establish that leave, availability and weekly rules were freshly validated.

Use a single owner for bounded retries of recognized source/serialization/deadlock conflicts. Recompute the entire affected plan on retry; never reuse stale consent or validation. Do not blindly retry unknown commit outcomes or launch nested retry loops. Reconcile unknown outcomes through the scoped operation record before retrying. Keep lock/statement waits bounded and surface a useful retry result.

Idempotency is scoped by workspace, actor, operation kind and client operation ID, with an input fingerprint. The same command returns its recorded result; reuse of the same key with different terms is rejected. Commit the outcome with the mutation. A timeout after commit must not create a second swap, revision or notification. Account changes must not expose another actor’s operation result.

### 7.4 Required race families

Two claimants; duplicate double taps; opposite/crossed swaps; same shift as source in one request and target in another; callout versus trade/coverage; cancel versus accept; manager decision versus accept; shift editing/deleting/unpublishing; qualification or account revocation; leave/availability/max-hours changes; generation/manual scheduling affecting the candidate’s hours; expiry versus acceptance; duplicate worker ticks; delivery claimed before cancellation; and ambiguous transport failure after commit.

Tests must run controlled concurrent connections in disposable PostgreSQL with barriers, assert both writer orders, and inspect the final assignments, lifecycle records, history, participation guards, revisions and outbox. Mock tests are not sufficient evidence of these races.

## 8. Time, expiry and escalation

Convert business dates/times using the persisted workspace IANA timezone and existing strict boundary helpers. Do not use the Mac timezone, browser time, UTC day comparisons or hardcoded Puerto Rico. Check same-day start time, not just “date is today.” Handle overnight and daylight-saving boundaries according to the existing strict policy; ambiguous/nonexistent legacy times must surface configuration problems rather than be guessed.

Under P04, resolve two deadlines from the applicable versioned policy: when a request may be submitted, and when acceptance/finalization may complete. For a trade, use the earliest affected shift start; for coverage, use the covered shift start. Validate submissionDeadline <= completionDeadline <= earliestShiftStart. Exact-boundary completion is not permitted. Zero advance notice must be an explicit customer choice, not a fallback for missing data.

A request records its completion deadline. A tighter current policy can restrict it further; a looser policy must not silently extend a request or revive an expired lifecycle. New terms require an explicit new request/consent path. At final write, use the effective earlier deadline, including after lock waits. Apply the appropriate cutoff at submission, acceptance and manager finalization; an existing manual scheduling operation is separate, not a hidden exchange bypass.

The worker persists terminal expiry and audit/notification cancellation; reads may project “Expired” from authoritative time even when the worker is delayed. Do not expire an already-created request merely because its creation window closed while its decision window is still open. GET requests must not secretly perform scheduling writes. These trading deadlines do not reject genuine inability-to-work reports; preserve the manager-directed urgent reporting path without automatic full-shift reassignment after start.

Business validity must not depend on a cron tick arriving on time. A delayed or disabled scheduler cannot make an expired offer claimable. The application must disclose that unattended notification/escalation delivery is not active until a suitable trigger is explicitly configured.

Reuse the trigger-agnostic Phase 3 worker conventions, with authenticated bounded batches, stable cursors, idempotent stage identities and current-source checks. Expiry worker actions must not generate schedules or autoassign staff. Separate worker authorization from impersonating a manager. Record system-initiated actions honestly without inventing an employee identity.

Escalation updates the existing management attention surface. Keep a distinction between “no replacement volunteers,” “no eligible candidates,” “configuration prevents automatic resolution” and “urgent uncovered shift.” A failed claimant should receive their safe explanation without producing a manager alert for every rejected click. Aggregate/reuse existing summaries and suppress resolved, expired or already-responded work. Respect the approved urgent/quiet-hours policy; this packet does not authorize bypassing quiet hours. Repeated cancellation/reoffer must not reset notification budgets or allow invitation spam for the same semantic shift need. Reuse existing recipient budgets and link related request lifecycles for suppression.

## 9. Notification matrix and privacy

Persist events/outbox intents in the same transaction as the corresponding business change. Provider calls occur after commit through existing delivery machinery. Failure to deliver does not roll back a valid assignment, and delivery success does not prove that an exchange committed.

| Event | Audience | Message / destination | Suppression and validity |
|---|---|---|---|
| Trade proposed | Target employee | “Trade requested” → exact authorized request | Only while awaiting that person’s consent and before expiry |
| Trade declined/cancelled/invalidated | Affected participants | Clear outcome, not a completed trade | One outcome per event; cancel old action reminders |
| Coverage opened | Eligible authorized Employee/Lead candidates under P05 | Shift date/time/location/position, “View shift” | No callout reason; current eligibility/access at materialization and dispatch |
| Valid automatic trade/coverage completed | Participants whose assignments changed | “Trade completed” / “Coverage confirmed” → current schedule/request | Coalesce overlapping request and schedule-update pushes for the same transaction; retain required internal revision records |
| Manual review required | Authorized managers; participants see pending state | Concrete reason → existing review queue | Do not label pending as completed; use existing manager summary policy |
| Callout submitted | Authorized manager; requester sees acknowledgement | “Unable to work reported” → private request | Keep reasons out of candidate feeds and lock-screen payloads |
| Callout approved/declined | Requester | Release/review outcome with truthful coverage state | Approval is not “replacement confirmed”; do not remove a later replacement |
| Urgent unresolved coverage | Authorized manager | Actionable escalation → exact need | At most once per approved lifecycle stage; stop on resolution |
| Request expired | Participants only where an outcome is useful; manager attention for a still-unfilled need | “Request expired” / “Coverage still needed” | No stale accept action; no repeated alerts after expiry |
| Identical retry/no-op | Nobody new | Return existing outcome | No duplicate event, revision or push |

The schedule revision path may already emit affected-employee notifications. Phase 5 must deliberately choose one visible completion message per recipient/transaction rather than adding a duplicate “Your schedule changed” push. Preserve meaningful separate manager alerts without turning routine success into a new approval task.

Deep links resolve to the current authorized request and state. Logout, account switching, revoked eligibility, deactivated accounts and stale notification links must not reveal another person’s data. Do not put personal reason notes in URLs, logs, general activity summaries, public caches or push payloads. Peer-facing responses contain only the minimum shift context and safe reason categories. Managers may receive detailed operational diagnostics only within existing access rights.

PWA offline mode is not authority to complete a trade. Do not cache private request data or silently replay acceptance later after conditions changed. Show “Reconnect to confirm” and reconcile persisted state before presenting success.

## 10. UI and read-model integration

Extend the existing `/app/exchange`, swap/callout forms and Manager Shift Requests; preserve navigation, URL aliases and notification deep links. No new marketplace redesign, giant dashboard, general chat, redundant action placement or decorative panels.

Employee/Lead views need: eligible available coverage, incoming trade with both sides, own requests/history, explicit outcome, and appropriate offer/callout actions from an owned shift. Manager views need: real exceptions, unfilled coverage, completed history, privacy-safe candidate suggestions and existing actionable counts.

Each shift presentation must include the required position and Lead responsibility when applicable, along with complete date/time/location. Show the current owner accurately after a replacement; preserve original participants in request history. A completed request must not keep showing “Waiting for manager.” An expired/cancelled request must not retain an active acceptance button.

Include loading, empty, no eligible candidates, blocked, submitting, success, error, stale source, already taken, manual pending, expired, offline and released-but-unfilled states. Pending controls keep their dimensions. Errors preserve safe user input and do not misrepresent an uncertain commit as a definite failure/success.

After mutation, refresh both participants’ schedules, relevant weekly hour projections, coverage, own request lists, manager pending/open/history counts, Next Shift/Needs Attention readers where affected, acknowledgement projections and notification destinations. Inventory real readers at the approved base; do not add a second count calculation inside each component.

Keep raw CSS and existing tokens, typography, icons, blue/cyan product identity, equal peer controls, minimum 44 px action targets, visible keyboard focus, reduced-motion behavior and readable input sizes. Wrap long names, locations and positions; do not shrink text, hide overflow or call horizontal scrolling a cure for clipped labels. Protect bottom-navigation safe areas.

Test affected states at 320, 375, 390, 430, 768, 1024 and 1440 px in Chromium and WebKit. Distinguish a native Mac WebKit keyboard configuration from a product focus failure. Check whole text ranges on all edges before scrolling, actual focus states and final controls above fixed navigation. Match scope to risk: focused core review, one UI implementer, meaningful protected regressions, not multiple agents and full screenshot rebuilds for every label.

## 11. Migration, compatibility and activation

Prepare a new additive migration after inspecting the final Phase 4 migration head and deployed compatibility. Preserve legacy rows, status meanings, notification identities and published history. New policy must not retroactively turn old pending requests into automatic assignments; old requests finish under manual/recorded policy or are explicitly invalidated with an explanation.

Rehearse on ownership-marked disposable PostgreSQL: fresh install through the full canonical migration chain; upgrade from a realistic prior schema; legacy open/manual/terminal requests; crossed active references; multiple callout episodes; rollback/forward compatibility; constraints and indexes for the actual access patterns. Missing schema is an explicit unavailable/error state, never “no requests.”

Changing policy while requests are active invalidates or rechecks affected permissions, applicable rest/hour/break rules and effective deadlines; disabling the applicable approval mode blocks new automatic completions immediately after the final guard. Never bulk-complete queued manual work merely because a flag changed. Store enough policy/consent history to explain the outcome.

Deployment, customer migrations, trigger/provider activation and real notification/device acceptance each require separate authorization and evidence. No new dependency, paid plan, DNS change, customer onboarding or production operation is authorized by this specification. A local build, fixture screenshot or unit test is not proof of activated automation.

## 12. Definition of done

The phase is ready for Jose’s final review only when every R01–R17 requirement has implementation and acceptance evidence; all approved policy choices are recorded; real SQL concurrency and final-write checks pass; the published revision/notification path and generation provenance are preserved; affected role/state/mobile views pass; and all important existing regression suites pass or have explicit, justified unchanged-input reuse.

Record unresolved limitations separately from passing checks. Do not promise optimal staffing, guaranteed notification delivery or a precise completion percentage. Performance evidence must separate candidate discovery, final command latency and worker batch behavior; avoid invoking the weekly solver for a single claim. Use bounded fictional 40/160-employee and multi-location fixtures where representative, without calling those tests a production capacity guarantee.

Finish with source/diff review, a readable evidence report, before/after screenshots, one clean local implementation commit under the approved workflow, clean worktree and teardown of only owned test resources. Stop for Jose’s review. No push, merge, deploy, live migrations, real messages, real schedule publication or Phase 6 work.

**Approval record:** the product approach and market-alignment refinements were approved by Jose on 4 October 2026; see `05_APPROVAL_AND_REFINEMENTS.md`. **Accepted base:** `6c0f2b77b6186c4cd86db7e97f869ea831ee32b0`, approved by Jose and checked against the local repository. **Remaining development gate:** approval of `08_IMPLEMENTATION_PLAN.md` and its execution approach; verify identity again when creating the isolated checkout. Material differences must be reported rather than silently adopted. Before customer activation, separately approve numeric policies/applicability, required legal review and the actual environment/operations. Do not ask Jose to approve the same design direction again unless a substantive change is proposed.
