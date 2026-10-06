# Phase 5 — Proposed task breakdown and acceptance plan

**Version 4 acceptance ledger. Product design, Phase 4 base and the corrected exact implementation plan are approved.** The accepted parent is `6c0f2b77b6186c4cd86db7e97f869ea831ee32b0`. The six-task exact-file plan is `08_IMPLEMENTATION_PLAN.md`; this file retains all approved acceptance scenarios for traceability. No implementation task has been started by the documentation review. Every scenario below remains **PLANNED / NOT RUN FOR PHASE 5** until execution evidence exists.

## Entry gate

Record the approved Phase 4 SHA, its final review evidence and clean worktree. Compare it with the source observations in this packet; all pending Phase 4 changes may have moved since inspection. Read the repository’s actual AGENTS/skills/instructions. Carry forward the recorded P01–P09 design decisions and the approved R15–R17 refinements; resolve customer numeric values/applicability before activation, and trace all affected producers/consumers before code. No existing customer connection, migration, real notification or live schedule is a test target.

## Six bounded tasks

### T01 — Contract reconciliation, lifecycle, policy and persistence

**Goal:** freeze the authoritative behavior and minimal schema before workflow code changes.

Read `src/lib/domain.ts`, `src/lib/data/exchanges.ts`, `src/lib/data/callouts.ts`, `src/lib/data/request-notifications.ts`, `src/lib/notifications/types.ts`, `src/lib/auth/permissions.ts`, the migration chain, Phase 4 provenance/guards, and the existing exchange/callout tests. These paths are existing integration surfaces, not instructions to rewrite every file.

Specify the status/transition table, versioned consent, separate swap/coverage approval modes, distinct submission/completion deadlines, applicable-rule data, policy compatibility for old requests, command identity, source/target participation and repeated-callout episodes. Explicitly model missing versus zero versus reviewed not-applicable values. Identify the smallest extension for rest/daily/per-shift/break evaluation and separate projected overtime routing from hard caps; do not build a general compliance platform. Propose the smallest additive migration and request-specific event/history representation. Map every lifecycle consumer and old notification version. State which changes are made in existing files and which small modules are actually required; do not invent a final filename until the repository inventory supports it.

Use failing domain/schema tests first, then implementation in a disposable database. Prove preserved legacy status/approval behavior and terminal history. Have one focused reviewer check the high-risk lifecycle/schema decisions before building on them.

**Exit:** agreed schema/transition contract; current and legacy fixtures; explicit constraints; policy approvals recorded; no customer database accessed. Depends on entry approval, not on a new infrastructure purchase.

### T02 — Shared exchange evaluation and candidate discovery

**Goal:** one pure evaluation path for automatic trades and coverage, using the finalized Phase 4/shared rules.

Read `src/lib/scheduling/validate-shift.ts`, `exchange-validation.ts`, `coverage-ranking.ts`, `generation/`, the complete validation-context reader in `src/lib/data/schedules.ts`, business-time helpers and `src/app/app/schedule/coverage/page.tsx`. Reconcile ranking rather than copying a new independent formula. Add a narrowly scoped shared adapter for the final proposed ledger, dates, requirements and safe diagnostics.

Tests precede behavior changes: swapped outgoing hours, both workweeks of overnight shifts, required position/Lead, automatic-mode daily rules, approved absence, zero/missing targets and fairness. Include A090–A096 and A098: previous/next cross-location rest, daily/per-shift versus weekly ceilings, incoming-employee break facts, unknown required applicability, scheduled-only overtime projections, and explicit elapsed/nominal time bases. Verify parity for every touched shared-rule consumer. Profile representative candidate discovery; do not solve the whole week to accept one shift. No forced assignment and no broader scheduling feature.

**Exit:** deterministic eligible suggestions and exact final-ledger evaluations; test parity with shared/manual behavior where expected; safe peer/manager projections. Depends on T01.

### T03 — Atomic automatic/manual workflows and integration

**Goal:** create/propose/accept/decline/withdraw/review/close commands with one consistent commit boundary.

Extend the existing exchange and callout data/action paths. Reuse `commitPublishedWeekChange`, its executor and revision/acknowledgement/outbox behavior, while integrating complete final-write eligibility/session/source guards compatible with Phase 4. Review all relevant concurrent writers, including time off, availability, locations, positions, sessions, generation and manual scheduling.

Add direct automatic transitions without bypassing consent or claiming a manager acted. Recheck the independently selected workflow mode, both effective cutoff stages and applicable rule versions after lock waits. A known hard failure stays blocked; unresolved required facts cannot be bypassed by a generic approval. Test tightening/loosening policy races and unchanged legacy manual requests. Preserve manual mode and approved-callout release. Implement idempotent outcomes, participant snapshots, exact after-state assertions and correct handling of edited/deleted/unpublished source assignments. Keep request history after permissible source mutation/deletion.

Use actual PostgreSQL two-connection/barrier tests for races and injected rollback points. A controller and one focused transactional reviewer are sufficient; do not fan out writers over shared transaction code.

**Exit:** each operation is atomic, repeatable safely and properly authorized; targeted schedule revisions/acknowledgements are correct; no implicit publish/generation/exclusion clear. Depends on T01/T02.

### T04 — Deadline worker, escalation and notification lifecycle

**Goal:** complete the asynchronous workflow without changing the transport architecture or activating providers.

Trace `src/lib/notifications/recipients.ts`, `destinations.ts`, `reminders.ts`, `worker.ts`, `src/lib/data/request-notifications.ts`, `request-state`/notification source readers as actually named in the approved tree, `src/lib/data/notifications.ts`, and the existing internal worker routes/scripts. Use request revisions/event IDs consistently; preserve unrelated time-off semantics. Plan one visible completion message alongside internal publication events.

Add bounded idempotent expiry/escalation using the existing authenticated worker conventions. Effective policy-based completion expiry is checked on reads/commands even if no worker runs. Submission-window closure must not prematurely expire a previously created valid request. Retain the request’s recorded deadline and tighter current restrictions; do not silently extend it. Confirm existing urgency/quiet-hours settings instead of guessing. Current worker transport/trigger suitability is an activation concern, not authority to upgrade a plan or buy services.

Use fake clocks/providers, concurrent worker tests, delayed/cancelled deliveries, safe links/account switching and no-audience/no-provider cases.

**Exit:** the full notification matrix is implemented/tested locally, no real messages sent, and worker activation prerequisites are honestly documented. Depends on T03.

### T05 — Employee/Manager UI and read-model completion

**Goal:** let people operate the feature through the existing premium/minimal surfaces.

Extend `/app/exchange` and its swap/callout forms, `src/components/manager-shift-requests.tsx`, existing schedule affordances and truly affected data readers. Reuse existing navigation and tab aliases. Expose position/Lead context, current ownership, truthful pending/released/unfilled/completed states and safe explanations. Reuse an existing small Owner configuration surface for separate approval modes and notice policies. Distinguish configured-cap failures, insufficient rest, unverifiable required rules and projected overtime review; never display a universal legal-compliance badge or private peer classification. Refresh affected schedules, request lists, counts, coverage, hours and acknowledgements from shared readers; do not duplicate business logic in the page.

One UI implementer owns scoped raw CSS/component changes. Validate real form envelopes, pending states, keyboard focus, full text bounds, exact-role authorization and mobile bottom-nav clearance. Capture the approved parent before edits. Fixtures are permitted for layout coverage but clearly marked; at least the core workflows require actual authenticated Next + isolated PostgreSQL evidence, not only fake actions.

**Exit:** complete accessible role/state flows on seven widths/two engines, with source-aware protected regressions. Depends on T03 and relevant T04 contracts; do not parallelize conflicting writers.

### T06 — Whole-phase verification, evidence and local handoff

**Goal:** establish that the integrated phase works and preserves the accepted baseline.

Run the relevant full unit/lint/typecheck/build suites and real SQL workflow/race suites against exact current source. Run actual authenticated-app core journeys with disposable data, plus representative responsive and protected views. Verify schema upgrades, legacy pending cases, rollback compatibility, versioned notification readers and fake provider behavior. Run the added R15–R17 policy/rule scenarios and record which values are fictional fixtures versus employer-reviewed configuration. Missing payroll/timekeeping is a declared evidence boundary, not evidence that no overtime is due. Exercise candidate-discovery/commit/worker performance separately and report input sizes/durations without production guarantees.

Have one independent whole-branch review after substantive changes settle. Repair concrete findings with focused red/green proof; rerun suites whose exercised inputs changed. Broad CSS/transaction changes require broad affected-consumer checks. Hash/source equality may justify reuse of unaffected expensive evidence but must never substitute for a missing race or real-app test. Never weaken assertions or mask clipped content to pass.

Archive concise reports, actual commands/exits, evidence source revisions, before/after screenshots, limitations and activation dependencies. Make the approved one local implementation commit, confirm clean worktree, tear down only owned disposable resources and stop for Jose. Do not push, merge, deploy, migrate customers, publish real schedules, contact providers or start Phase 6.

**Exit:** all required evidence is present and reviewable; unresolved blockers are reported rather than declared done. Depends on T01–T05.

## Execution discipline

Use targeted TDD for risky behavior. Review lifecycle/schema and transaction boundaries where independence adds value; do not create three agents for every button. One owner per shared module, one retry owner per command and one final review chain. Large baseline capture archives are not a success metric. Evidence needs to prove the user-visible and database behavior, not merely count tests.

The repository scripts observed during planning were `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:generation:integration`, `npm run test:foundation:integration`, `npm run test:notifications:integration`, `npm run test:foundation:qa` and `npm run test:notifications:qa`. Recheck names/environment contracts at the accepted parent. A Phase 5 integration command is **proposed**, not an existing script. Do not run any database test until its owned-loopback safety guard is verified. Build/test must not run migrations or send real pushes.

## Requirements-to-test traceability


| Requirement | Acceptance cases |
|---|---|
| R01 | A001, A002, A003, A004, A005, A006, A007, A009, A010, A040, A092, A095 |
| R02 | A016, A017, A018, A019, A020, A021, A022, A072, A074, A081, A088 |
| R03 | A013, A023, A024, A025, A026, A027, A028, A029, A030, A031, A035, A036, A037, A038, A059, A061, A069, A090, A091, A092, A094, A098 |
| R04 | A011, A012, A013, A014, A015, A017, A018, A038, A059 |
| R05 | A001, A008, A012, A029, A073, A082, A085, A086 |
| R06 | A008, A015, A016, A022, A058, A059, A074, A093, A094, A095 |
| R07 | A003, A006, A010, A012, A013, A015, A019, A020, A021, A032, A039, A040, A041, A042, A043, A044, A045, A046, A047, A048, A049, A050, A053, A054, A056, A057, A060, A063, A081, A082, A087, A089, A090, A097 |
| R08 | A022, A033, A034, A053, A054, A055, A056, A057, A058, A059, A060, A074, A087, A088, A089 |
| R09 | A002, A046, A050, A056, A058, A060, A061, A062, A063, A064, A068, A069, A070, A071, A072, A075, A089 |
| R10 | A001, A005, A009, A023, A024, A025, A026, A027, A028, A029, A030, A031, A032, A033, A034, A035, A036, A037, A041, A042, A043, A045, A049, A052, A065, A090, A091, A092, A094, A095, A096, A098 |
| R11 | A001, A006, A007, A011, A017, A018, A019, A020, A025, A032, A039, A044, A045, A046, A048, A050, A051, A052, A062, A064, A073, A079, A080, A092, A096 |
| R12 | A004, A010, A014, A016, A023, A043, A047, A061, A065, A066, A067, A068, A069, A072, A075, A077, A085, A093, A097 |
| R13 | A066, A073, A074, A075, A076, A077, A078, A079, A088, A094, A097, A098 |
| R14 | A008, A051, A055, A064, A070, A071, A079, A080, A081, A082, A083, A084, A086, A096, A097 |
| R15 | A008, A053, A054, A055, A082, A085, A086, A087, A088, A089, A097 |
| R16 | A086, A090, A091, A092, A093, A095, A096, A097, A098 |
| R17 | A030, A091, A094, A095, A096, A097, A098 |

## 98 planned acceptance scenarios

These are scenario specifications, not a claim of 98 automated tests or completed checks. Each may require multiple fixtures, assertion layers and concurrency orderings.

### Consent and swaps

Primary task ownership: **T02/T03**.

| ID | Scenario | Required outcome | Requirements |
|---|---|---|---|
| A001 | Both employees accept a valid same-week trade | Exactly both owners change in one transaction; one terminal result; dates, locations, positions and Lead duties stay attached to their slots. | R01, R05, R10, R11 |
| A002 | Target declines before acceptance | Neither assignment changes; terminal decline recorded; pending reminders cancelled. | R01, R09 |
| A003 | Requester cancels while target accepts | One serialized outcome wins; never half a swap or success after a committed cancellation. | R01, R07 |
| A004 | Target employee is wrong, caller forges requester or tries self-swap | Server rejects without changing either assignment or disclosing private request data. | R01, R12 |
| A005 | Source equals target or the owning weeks differ | Current same-shift/same-week restrictions are enforced server-side; no new cross-week feature. | R01, R10 |
| A006 | Manager changes a consent-bound date/time/location/position/Lead/owner | Old consent is rejected; a fresh request is required rather than silently applying changed terms. | R01, R07, R11 |
| A007 | Only the employee display name changes | No fabricated consent failure for unchanged terms; current presentation and historical identity remain accurate. | R01, R11 |
| A008 | The applicable swap/coverage approval mode is disabled, missing or legacy/manual | Valid consent follows the established manual path; no assignment changes or retroactive auto-completion. Missing mandatory notice/rule data is reported rather than assumed. | R05, R06, R14, R15 |
| A009 | Two outgoing shifts would otherwise appear as conflicts | Validate each employee against the correct final ledger with only their outgoing assignment removed. | R01, R10 |
| A010 | One side of a proposed trade violates a rule | Neither side is applied; safe explanation identifies the failure without leaking peer private facts. | R01, R07, R12 |
### Coverage and inability to work

Primary task ownership: **T03**.

| ID | Scenario | Required outcome | Requirements |
|---|---|---|---|
| A011 | Ordinary owner offers future published shift | One OPEN offer; original assignment stays until replacement; no implied absence approval. | R04, R11 |
| A012 | Two eligible employees claim the same offer concurrently | One valid transaction commits; loser sees unavailable; exactly one replacement and one completion event. | R04, R05, R07 |
| A013 | Invalid candidate claims then valid candidate claims | Invalid attempt does not reserve/close the shift; valid candidate can still complete. | R03, R04, R07 |
| A014 | Original owner attempts to claim own offer | Rejected without assignment or status mutation. | R04, R12 |
| A015 | Manager-policy claim is later withdrawn | No completed assignment is undone; current version is checked; closure/reoffer follows P09. | R04, R06, R07 |
| A016 | A pending inability-to-work report is submitted | Existing assignment is retained with an explicit operational risk; private reason only available to authorized parties. | R02, R06, R12 |
| A017 | Manager approves callout with no replacement yet | Original employee is released in existing ledger semantics; one linked OPEN coverage need remains visibly unfilled. | R02, R04, R11 |
| A018 | Replacement accepts coverage for approved callout | Replacement owns shift and counts once; original absence history remains; release flag does not transfer to replacement. | R02, R04, R11 |
| A019 | Replacement later submits their own callout on the same shift | Historic original callout is retained but does not permanently block new owner; active release matches assignment episode. | R02, R07, R11 |
| A020 | Callout approval/cancellation races with accepted coverage or a trade | No replacement is removed, no new duplicate need appears, and no absent owner is silently restored. | R02, R07, R11 |
| A021 | Callout plus existing coverage/trade participates in the same source slot | Record the genuine inability report; resolve incompatible participation atomically, preserve history and committed replacements, and keep only one linked coverage need. | R02, R07 |
| A022 | Urgent inability is reported after shift start | Manager reporting remains available with clear limitations; no past/full-shift automatic transfer or punch mutation. | R02, R06, R08 |
### Shared rules, ranking and business time

Primary task ownership: **T02/T03**.

| ID | Scenario | Required outcome | Requirements |
|---|---|---|---|
| A023 | Current employee, account, location or workspace becomes inactive | No new automatic assignment; safe cancellations/history remain possible within authorization. | R03, R10, R12 |
| A024 | Candidate lacks location eligibility or a required active position | Discovery and final completion reject candidate using shared validation. | R03, R10 |
| A025 | Multi-qualified candidate covers a single-position slot | Exactly one operational position counts; no double staffing/position credit. | R03, R10, R11 |
| A026 | Required designated Lead would be lost | Block; do not clear Lead flag or reinterpret an access role as a job position. | R03, R10 |
| A027 | Normal availability plus submitted weekly snapshot/exceptions | Preserve shared precedence, intentionally empty submissions and partial-day unavailable gaps. | R03, R10 |
| A028 | Pending versus approved time off | Use existing shared status semantics; approved leave blocks; nonblocking states do not become invented blockers. | R03, R10 |
| A029 | Cross-location conflict and same-day limit | Automatic mode enforces full ledger/daily policy, not the more permissive manual warning path. | R03, R05, R10 |
| A030 | Target 24, configured weekly max 40; projected 32, 40 and 41 scheduled hours | 32/40 remain eligible under other rules; 41 violates this configured cap. The message identifies a scheduling cap, not a universal legal prohibition or final overtime-pay conclusion. | R03, R10, R17 |
| A031 | Sunday overnight shift crosses Monday | Evaluate availability/leave and maximum hours in both business workweeks; exclude outgoing work correctly. | R03, R10 |
| A032 | Owning schedule week differs from touched business date | Locks, ledger and publication associations use their proper identities; no omitted carry-in/out. | R07, R10, R11 |
| A033 | Workspace timezone differs from browser/Mac timezone | Same valid operational result for same persisted workspace facts. | R08, R10 |
| A034 | DST gap, repeated civil time or malformed legacy boundary | Use strict existing boundary policy; no guessed instant or silent 00:00 substitution. | R08, R10 |
| A035 | Unrelated location lacks setup | It does not block a valid requested slot; a requested inactive/unready location cannot auto-complete. | R03, R10 |
| A036 | Existing unrelated staffing gap versus new affected gap | Do not require fixing unrelated week defects; never introduce/worsen affected staff/position/Lead gaps. | R03, R10 |
| A037 | Ranking uses zero/missing/mixed targets and shuffled input order | No fabricated target or division errors; final shared fairness semantics and rotating tie remain deterministic. | R03, R10 |
| A038 | Highly ranked employee does not volunteer | No assignment or extra hours without explicit acceptance; rank is not consent. | R03, R04 |
### Database races, idempotency and history

Primary task ownership: **T01/T03/T06**.

| ID | Scenario | Required outcome | Requirements |
|---|---|---|---|
| A039 | Same shift is source in one request and target in another | Cross-role exclusivity holds; separate-column indexes are not treated as sufficient proof. | R07, R11 |
| A040 | Two opposite or chained swaps race | Deterministic lock order and participation guard allow only compatible outcomes; no deadlock loop or double commitment. | R01, R07 |
| A041 | Leave or availability insert occurs during acceptance | Absent-row/phantom change is caught under both writer orders; no stale automatic assignment. | R07, R10 |
| A042 | New assignment at another location changes candidate hours during acceptance | Complete affected-ledger validation/guard catches overlap or maximum breach. | R07, R10 |
| A043 | Position membership, max-hours policy or session role changes during lock wait | Fresh final guard rejects lost authority or invalid scheduling facts. | R07, R10, R12 |
| A044 | Manager edits/deletes/unpublishes while acceptance waits | No overwrite of new manager intent, no phantom assignment and no publication of a draft. | R07, R11 |
| A045 | Phase 4 generation/manual input writers race with Phase 5 | Shared lock ordering and source guards hold; no deadlocks from independent lock conventions. | R07, R10, R11 |
| A046 | Same action is submitted twice with the same operation identity | Return same persisted result; one assignment change, revision and visible completion event. | R07, R09, R11 |
| A047 | Same operation identity is reused with different terms or another account | Reject key misuse; no replay across actor/workspace boundaries. | R07, R12 |
| A048 | Transport fails after successful commit | Reconcile recorded command outcome before retry; no second swap or falsely definite failure. | R07, R11 |
| A049 | Recognized source conflict/deadlock/serialization failure | One bounded retry owner rereads and reevaluates; permission/deadline/unknown errors are not blindly retried. | R07, R10 |
| A050 | Failure is injected between each mutation stage | All assignments, request state, participation, history, revisions and intents roll back together. | R07, R09, R11 |
| A051 | A source row is later deleted or reassigned | Request history retains original parties/terms/outcome; cascades or live joins do not erase/misattribute it. | R11, R14 |
| A052 | Generated-origin assignment is changed by a completed exchange | Protected human-controlled provenance is retained; genuine actor/mode recorded; no tombstone auto-clear. | R10, R11 |
### Deadlines, escalation and worker recovery

Primary task ownership: **T04/T06**.

| ID | Scenario | Required outcome | Requirements |
|---|---|---|---|
| A053 | Claim just before, exactly at, and after the effective completion cutoff | Only before-cutoff final authorization can complete; apply the recorded/tighter current policy and shift-start upper bound using authoritative instants, not just dates. | R07, R08, R15 |
| A054 | Request begins before its effective cutoff but obtains locks afterward | Post-wait policy/version/deadline guard rejects stale acceptance; no transfer, revision or completion notification is committed. | R07, R08, R15 |
| A055 | Worker does not run or runs after configured deadlines | Expired actions remain invalid under effective policy; reads show truthful state; an accepted request is not confused with a closed creation window; unattended escalation is not claimed active. | R08, R14, R15 |
| A056 | Two worker ticks expire/escalate same request | One durable event per lifecycle/stage; no duplicate reminders or assignments. | R07, R08, R09 |
| A057 | Acceptance and expiry worker race | Single serialized outcome; expired request never acquires a replacement afterward. | R07, R08 |
| A058 | Request created within urgent window | One immediate applicable manager escalation; no waiting for an already-passed threshold. | R06, R08, R09 |
| A059 | No candidate exists or all invitees decline/dismiss | Truthful unresolved need; bounded manager escalation; no involuntary assignment or repeated invite spam. | R03, R04, R06, R08 |
| A060 | Worker crashes between preparation and commit or restarts mid-batch | Stable cursor/idempotency recovers without losing or duplicating due work; no provider call inside business transaction. | R07, R08, R09 |
### Notifications, access and privacy

Primary task ownership: **T04/T05/T06**.

| ID | Scenario | Required outcome | Requirements |
|---|---|---|---|
| A061 | Coverage opens with mixed eligible/ineligible employees | Only current authorized eligible audience can receive actionable invitation; no personal callout details. | R03, R09, R12 |
| A062 | Valid trade/coverage updates both request and published revision | Coalesced visible completion per recipient/transaction; required internal records remain complete. | R09, R11 |
| A063 | Request cancelled after delivery lease claimed but before send | Worker revalidates source and cancels stale action; already delivered pushes open a safe current state. | R07, R09 |
| A064 | Same-state revision, new linked offer or legacy status-version event | Version identity/cancellation remain correct; no stale event reuse, lost new event or notification-budget reset from repeated reoffers. | R09, R11, R14 |
| A065 | Caller tampers with employee/workspace/role/eligible/max-hours/Lead fields | Strict server-derived authority; reject business-field injection and duplicate scalar parameters. | R10, R12 |
| A066 | Real framework-generated Server Action form envelope | Legitimate submission works; framework metadata handling cannot authorize forged business fields. | R12, R13 |
| A067 | Unrelated employee, wrong request recipient or Lead accesses manager action directly | Rejected server-side regardless of hidden buttons or client route. | R12 |
| A068 | Actor logs out/switches account while opening a request notification | No cross-account private data or unauthorized mutation; safe return/deep-link behavior. | R09, R12 |
| A069 | Employee eligibility revoked after invitation creation | Dispatch/open/accept reevaluate applicable access and eligibility; invitation never guarantees acceptance. | R03, R09, R12 |
| A070 | Quiet hours, notification preferences, expired token or provider outage | Honor approved policy; preserve business result; report delivery separately from assignment success. | R09, R14 |
| A071 | Push delivery flags off and fake provider enabled for tests | No real notification transport; durable local intent behavior tested and labeled accurately. | R09, R14 |
| A072 | Sensitive reason note appears in candidate list, general history, URL, cache or push | Test fails; reason is visible only to requester and authorized management. | R02, R09, R12 |
### UI integration and safe release

Primary task ownership: **T05/T06**.

| ID | Scenario | Required outcome | Requirements |
|---|---|---|---|
| A073 | Automatic completion through actual authenticated app and disposable DB | Both real schedules and request/count/acknowledgement views refresh; not just a mocked button result. | R05, R11, R13 |
| A074 | Open, manual pending, released-unfilled, completed, expired and already-taken states | Labels and available actions match persisted state; no stale manager approval or success banners. | R02, R06, R08, R13 |
| A075 | Offline, loading, pending, error, no candidates and uncertain commit | Useful truthful UI; no cached private data or deferred automatic acceptance; safe input preserved. | R09, R12, R13 |
| A076 | Long names/positions/locations at all seven widths and both engines | Full text fits before horizontal scrolling; stable >=44px controls and explicit position/Lead context. | R13 |
| A077 | Keyboard and screen-reader interaction | Correct focus/order/names/live feedback; dialogs restore focus; status not communicated by color alone. | R12, R13 |
| A078 | Bottom-nav safe area and final action on mobile | Action remains visible and reachable above fixed navigation; pending geometry does not jump. | R13 |
| A079 | Protected Manager/Employee/Lead/Login/Activate/PWA/Clocker surfaces | No unintended changes; focused source-aware comparisons; no actual punches or provider activation. | R11, R13, R14 |
| A080 | Legacy request upgrade and missing schema | History/policy preserved; no automatic conversion of MANAGER_PENDING; missing schema is an error, not an empty list. | R11, R14 |
| A081 | Duplicate/inconsistent legacy participation and repeated callout episodes | Migration rehearsal reports/resolves explicitly without deleting history or reassigning real employees. | R02, R07, R14 |
| A082 | Separate approval modes or applicable rules change while requests remain active | Disabling/tightening applies at final guard; enabling/loosening neither bulk-completes existing manual requests nor extends prior consent/deadlines; changed rule facts are revalidated. | R05, R07, R14, R15 |
| A083 | Migration compatibility rollback and restart | Documented tested application/schema compatibility; no destructive drop/rewrite to fake reversibility. | R14 |
| A084 | Final branch review and handoff | Approved base, exact commit, clean worktree, evidence, owned teardown and explicit no-push/no-deploy stop are recorded. | R14 |


### Approved market-alignment refinements

Primary task ownership: **T01–T06 as specified per scenario**. Added after approval; fixture numbers are not live policies.

| ID | Scenario | Required outcome | Requirements |
|---|---|---|---|
| A085 | Independent swap and coverage approval modes | Exercise automatic swaps/manual coverage and manual swaps/automatic coverage. Persist each independently; unauthorized toggles fail; the unrelated workflow and existing pending requests do not change. | R05, R12, R15 |
| A086 | Missing or partially migrated policy configuration | Old/manual behavior remains recognizable; auto-completion is withheld where required settings are unknown. No implicit enabled flag, zero notice or not-applicable classification is invented. | R05, R14, R15, R16 |
| A087 | Separate request and completion deadlines | With fictional 24-hour submission/2-hour completion cutoffs, test both boundaries. A request created in time stays actionable until its completion cutoff; new requests after their own cutoff are refused. Values are fixtures, not customer defaults. | R07, R08, R15 |
| A088 | Explicit zero notice versus NULL and urgent inability reporting | Only an explicitly configured zero cutoff permits action up to but not at shift start. Missing values are not zero. Genuine urgent callouts still reach management after trading closes, without backdated transfers. | R02, R08, R13, R15 |
| A089 | Notice policy tightens or loosens during a lock wait | A tighter effective deadline wins after the wait. Loosening never silently extends recorded consent/expiry or reopens a closed request. Worker, command and read projections agree. | R07, R08, R09, R15 |
| A090 | Minimum rest against prior and next cross-location commitments | Using fictional rest limits, reject a nonoverlapping but insufficient-rest assignment on either side. Remove outgoing shifts correctly; include adjacent days/workweeks and follow the defined time basis. | R03, R07, R10, R16 |
| A091 | Per-shift and daily-hour maximums differ from weekly maximum | A candidate below the weekly cap can still fail a daily/per-shift cap. Test the configured calendar or rolling window explicitly and reject unsupported/ambiguous semantics rather than guessing. | R03, R10, R16, R17 |
| A092 | Replacement has different required break conditions | Recheck authoritative incoming-employee break conditions, retaining shift and consent-bound terms. Missing or incompatible required facts withhold auto-completion; never remove a break, deduct pay or fabricate a waiver/punch to make the trade pass. | R01, R03, R10, R11, R16 |
| A093 | Required rule is unknown versus explicitly reviewed not applicable | Unknown required facts cannot become an eligible result or a generic manager override. Authorized correction plus revalidation is required. An explicit reviewed not-applicable classification behaves differently from missing data. | R06, R12, R16 |
| A094 | Projected overtime threshold differs from target and hard cap | In a fictional profile with target 24, threshold 40 and cap 44, projected 42 is a threshold crossing, not a cap breach; route according to configured review policy. Projected 45 still violates the cap. Do not seed these values or calculate final payroll. | R03, R06, R10, R13, R17 |
| A095 | Known hard failure versus an explicitly permitted soft exception | Employee consent and manager review cannot bypass a known hard cap, required safety rule, forged consent or unresolved mandatory fact. Only already-permitted soft exceptions can be manually resolved; preserve reasons/history. | R01, R06, R10, R16, R17 |
| A096 | Shared policy parity across discovery, acceptance and affected consumers | Verify one source of rule meaning across suggestions, final writes and touched manual/generation consumers, allowing only documented mode-specific exceptions. No copied rest/hour/break engine and no changes to the approved Phase 4 worktree. | R10, R11, R14, R16, R17 |
| A097 | Actual app, policy changes, privacy and legacy upgrade | Use authenticated disposable-data flows to prove rule/mode/deadline updates, version guards, safe reasons and truthful pending states. No peer disclosure of private rule classification, universal compliance badge or migration-triggered activation. | R07, R12, R13, R14, R15, R16, R17 |
| A098 | Time-basis and actual-time evidence are not interchangeable | Exercise daylight-saving elapsed rest versus nominal scheduled hours and absent actual-work data. Follow defined semantics or withhold unverifiable automation. Never infer final overtime owed, actual break completion or legal compliance from the scheduled ledger. | R03, R10, R13, R16, R17 |

## Evidence levels — do not substitute one for another

| Level | Required proof | Does not establish |
|---|---|---|
| Static/domain | Types, parsers, deterministic validation/transition tests | Authentication, DB isolation, rendering or delivery |
| Real disposable PostgreSQL | Canonical migrations, final-state assertions, rollback and deterministic races | Production credentials, deployed behavior or physical devices |
| Authenticated app + disposable data | Real session, Server Action, DB commit, redirect/revalidation and refreshed views | Production activation or real provider delivery |
| Rendered UI fixtures | Real components across widths/states, geometry, focus and accessibility | Real authorization or persistence when actions/data are doubled |
| Fake provider/clock | Version checks, outbox retries/cancellation and deadlines | Real push arrival or working background hosting cadence |
| Separate authorized activation | Exact environment, migration chain, deployment, trigger/provider/device checks | Permission to skip local/review gates |

## Audit worksheet for the final reviewer

For each R01–R17 record the changed production path, test IDs, actual command and exit status, source commit/hash, relevant screenshots, and remaining limitation. Check the recorded P01–P09 approval and R15–R17 refinements; distinguish them from customer-specific values/applicability not selected by that approval. Mark each field VERIFIED, NOT RUN, BLOCKED or NOT APPLICABLE with reason; never prefill VERIFIED from this planning packet. No estimated percentage or test-count quota replaces this worksheet.

