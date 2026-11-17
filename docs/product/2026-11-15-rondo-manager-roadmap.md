# Rondo manager program roadmap — November 15, 2026

Status: **PROPOSED PROGRAM SEQUENCE**. Jose's adopted target is all50 Owner
questions at10/10 each. This roadmap sequences the work and its evidence gates;
it is not an approved technical design or a declaration that the new domains
exist. Detailed designs and executable plans belong to separate bounded workstreams.

Product sources: [50-question standard](../qa/2026-11-15-rondo-owner-50-standard.md),
[question catalog](../qa/rondo-owner-50-acceptance.json),
[operating contract](rondo-operating-contract.md),
[knowledge backend evidence](../handoffs/2026-11-15-rondo-company-knowledge-backend.md),
[Claude's existing knowledge UI contract](../handoffs/2026-11-15-rondo-company-knowledge-ui-contract.md).

Inspected source:72d922ce (documentation), c21f81d0 (last application change).
Current Rondo coverage is selected-day, at most12 reviewed additions. NEVORA
already has a canonical weekly generation engine. Reuse it; connecting a full-week
Rondo review/approval workflow is distinct from building a scheduler from zero.

## Working outcome

Observe authorized current records → investigate the problem → compare realistic
options → recommend → prepare exact changes → Owner approves or declines →
perform only supported approved changes → check actual results and reassess.

The first usable manager milestone is company-aware weekly workforce planning in
development, including explicit uncertainty and exact draft approval. Broader
finance, sales and inventory capability follows through actual verified sources.
Cost/demand-dependent scheduling questions remain unqualified until those inputs
are connected and validated; finishing a weekly engine alone does not pass Q01–Q10.

## Sequence and delivery gates

### 0. Establish the 50-case baseline and source inventory

Owner: Codex backend/evaluation. Input: current catalog, service/tool contracts,
existing leadership fixtures and current canonical source. Output: a per-question
matrix of facts needed, available readers, missing sources, permitted operations,
verified answer oracle, fixture status and independent score status.

- Preserve the existing16-case and native management evidence separately.
- Map every Q01–Q50 to a complete-data case, a missing/stale/conflicting case and
  a changed-fact/objective case, with feasible/no-problem controls.
- Build verified fictional datasets and expected arithmetic/feasibility witnesses
  before using them as model grading truth. Mark unavailable readers as gaps.
- Read-only source inventory comes before selecting accounting, POS, inventory or
  other provider-specific connectors. Confirm the service that actually owns each
  record, its tenant scope, permissions, freshness and development isolation.
- Establish durable operating model/credential/budget custody separately from
  the temporary comparison key/grant. Existing comparison enrollment and caps
  remain unchanged; no new paid run starts from this roadmap.

Done when: all50 have a source/workflow dependency map and a prepared-or-explicitly-
missing oracle/fixture status. The matrix itself is not a model score.

### 1. Make company knowledge usable in the application

Owners: Claude UI; Codex API/hosting; existing integration owner assembles source.
Reuse the already approved text-first backend and UI contract.

- Owner can create/edit the profile, review exact saved text, publish a version,
  inspect its private citation, archive it and delete retained source text.
- Clearly distinguish drafts, current publication, effective dates, overdue review
  and historical versions; explain separate chat/provider retention.
- Verify company-wide Owner sharing versus private per-Owner memory, revocation,
  stale answers, concurrent edits, missing schema, quota and source withdrawal.
- Join the exact frontend/backend source in development with synthetic data and
  verify real same-origin navigation, mobile, keyboard and error/recovery states.
- Qualify actual-model use of the profile/documents under explicitly enrolled
  fictional cases before claiming document judgment. Keep source/control tests
  separate from semantic results.

Done when: the integrated development journey works and Rondo demonstrably uses
the approved current guidance with exact sources. Primary support: Q21,Q25–Q28;
cross-domain conflicts can still require later source work.

### 2. Deliver the complete weekly workforce workflow

Owner: Codex backend; Claude review interface. Prepare a bounded technical design
covering the following contracts before implementation.

Reuse points verified in source:

- [canonical planner](../../src/lib/scheduling/generation/planner.ts): planWeek and
  cooperative planWeekSteps over the full ledger and adjacent affected weeks.
- [generation input/snapshot](../../src/lib/data/schedule-generation-snapshot.ts):
  source-of-truth weekly inputs and explicit location scope.
- [Rondo day comparison](../../src/lib/owner-advisor/coverage-plan.server.ts):
  current bounded read-only projection and source provenance.
- [exact day approval](../../src/lib/owner-advisor/coverage-actions.server.ts) and
  [reviewed draft service](../../src/lib/data/reviewed-coverage-draft.server.ts):
  authority, immutable review, rechecks and recoverable receipts.
- [existing week writer](../../src/lib/data/schedule-generation.ts): inspect for
  reusable guarded writes; it currently plans during execution and must not be
  exposed as a blind replacement for an exact preapproved Rondo plan.

Required deliverable:

- Read the entire selected week and ready location scope, with qualifications,
  availability, leave, breaks/rest, protected/manual commitments and adjacent work.
- Prepare separately validated alternatives, preserve existing valid work and
  expose every unmet requirement or excluded location. Bounded search never proves
  universal impossibility or optimality.
- Use explicit Owner priorities. Historical fairness needs the actual required
  history, not the existing31-day window relabeled as eight weeks. Monetary costs
  need an approved source and clearly separated planning assumptions; no invented
  wage rate or revival of native payroll calculations.
- Show the exact proposed additions/removals and consequences. Decline changes no
  schedule. Approval binds the exact reviewed terms, actor/session/scope and source.
- Save the approved draft set atomically, or use a deliberately designed staged
  protocol with explicit recoverable partial state. Do not implement a week as
  seven unrelated daily saves or silently rerun the solver after approval.
- Preserve separate publication. Changed availability, source, rules, scope,
  authority, knowledge or approved terms require revalidation/new review.
- Prove lost-reply recovery, duplicate retry, competing edits, overnight/DST,
  partial approval, cancellation, large bounded inputs and unavailable setup.

Done when: a real Owner can request a weekly draft, inspect alternatives, approve
or decline, recover the original save and verify the exact persisted result in
development. Supports Q01–Q10,Q24,Q39,Q46, with external-data dependencies explicit.

### 3. Connect business records beyond workforce

Owner: Codex integrations; source selection/permission by the relevant Owner.
Recommended order: sales and financial reconciliation/cash visibility, then
inventory/supplier/customer commitments. Refine the order using the phase0 map.

- Create a separate source/data contract and technical design per business domain.
  Identify actual provider accounts and supported APIs only after inventory.
- Start with scoped read-only integration. Preserve original transaction identity,
  time zone, period, currency, state, corrections, observed time and completeness.
- Implement deterministic calculations/reconciliation from typed records; the
  model explains results and tradeoffs rather than inventing arithmetic inputs.
- Show a missing or stale connection explicitly. A published company description
  is not a bank balance, live sale, stock count or confirmed customer commitment.
- Keep payroll's approved external calculation direction. Financial/contractual
  applicability judgments need appropriate qualified review and evidence.
- Verify tenant/role separation, refresh, inconsistent periods, refunds/fees,
  duplicates, partial imports, source outages and recovery with fictional records.

Done when: full-data questions use actual authorized service/tool paths and can
be reconciled against independently known results. Primary support: Q11–Q20,
Q22–Q23,Q29–Q31,Q35–Q36,Q40–Q43 and cost/demand-dependent workforce cases.

### 4. Add broader management judgment and incident coordination

Owner: Codex reasoning/tools; Claude decision presentation; qualified domain input
for the answer oracles. Depends on the relevant phase3 sources.

- Compare cross-domain options, binding constraints, cash/capacity effects,
  stakeholder consequences, uncertainty and realistic contingencies.
- Distinguish reported incidents from verified technical/safety/security status.
  Company procedures help escalation but do not establish live safety or expertise.
- Preserve conflicting Owner intent and source authority without leaking another
  Owner's private memory or treating chat text as a policy change.
- Verify changed objectives versus changed facts, incomplete evidence, causal
  alternatives, unsupported guarantees and false allegations.
- Produce concise, useful decisions in English and Spanish, with deadlines,
  escalation, fallback and measurable checks across the next hour/day/week.

Done when: independently scored actual-model cases demonstrate useful grounded
decisions, including feasible controls and compound incidents. Primary support:
Q32–Q34,Q37–Q38,Q44–Q45,Q48–Q50; repeated cross-domain cases remain in the full suite.

### 5. Strengthen approval, recovery and outcome tracking

Owner: Codex action contracts; Claude approval/result surfaces.

- Every supported action has a reviewable exact scope, current actor authority,
  operation identity, immutable receipt, state readback and failure recovery.
- Partial approval triggers dependency reassessment; it cannot authorize declined
  actions or a silently modified replacement plan.
- Show the difference between a proposed recommendation, approved draft, executed
  action, publication and verified outcome. Owner-reported success stays reported
  until a supported source check verifies it.
- Outcome checks revisit the original assumptions and evidence without rewriting
  historical decisions or attributing every later change to the original advice.
- Define any selected follow-up/monitoring workflow's sources, interval, operating
  cost, stopping rules and approved recipients/channels before activation. A chat
  promise never creates an installed background service or messaging permission.
- The 50-question answer target does not itself require adding payment, refund,
  ordering, personnel or notification writers. Add an external action only through
  its own explicit product/authority/design decision and integration acceptance.

Done when: the supported workflows survive uncertainty and changed dependencies
without duplication, expanded approval or false completion. Primary support:
Q06,Q28,Q40,Q46–Q49 and the execution portions of Q50.

### 6. Qualify all50 with actual model behavior

Owner: Codex harness/evidence; independent semantic reviewers own their assessments.
Run relevant slices throughout phases1–5, then qualify the complete release.

- Enroll a concrete fictional model/case/fixture/run envelope with approved
  available funding. Compare quality/latency/cost on real cases; a model name or
  larger prompt alone establishes no score. Preserve the existing closed ledgers.
- Execute the50 original questions plus their controls and counterfactuals through
  actual admitted readers/workflows. Record source, model, protocol, prompt/config,
  fixture versions, raw turns, approvals and actual business-state differences.
- Independently grade all10 dimensions using verified oracles. Retain failures,
  unavailable capabilities, reviewer disagreements and every retry.
- All50 must score10/10 individually with zero critical failures. A missing-data
  pass cannot substitute for the corresponding complete-data capability.
- The standard proposes at least500 transcripts across languages, repeats and
  counterfactuals. That protocol is an engineering proposal, not an authorized
  spend or a substitute for an explicit campaign estimate/enrollment.

Done when: each question's required evidence is complete, independent grading
meets the adopted target and the result reproduces on the exact candidate source.
Neither unit counts nor fluent scripted answers qualify the model.

### 7. Verify the combined development release, then promote deliberately

Owners: integration owner, Codex hosting/backend, Claude UI and independent release
review. Jose authorizes any later main/production promotion.

- Reconcile current GitHub/development source and exclusive workstream ownership
  before assembly. Preserve active worktrees and allowed branch policy.
- Join exact verified UI/backend, apply the reviewed migration set only to the
  selected development target and establish provider/rollback custody.
- Refresh web manuals/PDF source manifests on that combined release. The current
  stale manual-publication gate is open; do not suppress it on this isolated source.
- Verify actual hosted authentication, current-source behavior, model configuration,
  key/grant continuity, cost caps, timeouts, outages and recoverable action results.
- Run integrated mobile/desktop, keyboard, empty/error/loading/stale/revoked and
  approval journeys. Check operational monitoring and truthful environment/data labels.
- Promote only the accepted exact development release after Jose's authorization.
  Incremental development qualification remains scoped; the full manager-level
  claim requires the50-case evidence, not merely a successful deployment.

Done when: deployed behavior, semantic evidence, controls and product experience
all support the stated capability claims for that exact release.

## Immediate next deliverable

Produce the phase0 case/source dependency matrix and the bounded design for the
weekly workforce manager. In parallel ownership planning, give Claude the already
written company-knowledge UI contract; confirm the active UI/integration owner
before any overlapping edits or dispatch. This roadmap sends no messages or starts
new chats, implementation agents, services, deployments or paid campaigns.

The weekly design must decide scope, read budgets, exact review/receipt shape,
atomicity, historical fairness inputs and legitimate cost data before code changes.
External connector design comes after actual source inventory. Work on these
specific designs is more useful than treating the entire multi-domain program as
one giant implementation plan.

## Ownership, cost and risk

Codex: backend/data/tool/fixture/hosting work. Claude: UI. Existing integration
owner: source assembly and combined acceptance. Independent reviewers: their own
semantic and release findings. Jose: business priorities, material risk decisions,
new spending and main/production authority. Manager-user access remains a separate
role-scoped design; the current Rondo admission is Owner-only.

Product position: deliver usable manager workflows with measurable judgment.
Engineering position: reuse canonical planning/validation and typed domain readers.
Security position: least privilege, private sources and exact authorization across
awaits/actions. Delivery position: complete and verify one bounded workflow at a
time; combine UI/backend in development. Governance recommendation: **GO WITH
CONDITIONS for this proposed sequence**; operating the broader capability remains
conditional on actual sources, designs, funding and evidence. No policy exception
is inferred. This is not independent release certification.

Time/cost estimates follow the source inventory and first detailed design; no
completion date or recurring spend has been fabricated. The prior approved$5
fictional comparison envelope is not an open operating budget. No existing paid
allowance is reset or transferred to this program.
