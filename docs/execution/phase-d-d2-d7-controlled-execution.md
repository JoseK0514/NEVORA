# Historical Phase D — October 6 controlled execution model

> Superseded October 7 by Jose’s D3–D8 master authorization and subsequent scope amendment. This document preserves the historical D2 package; its per-section gates and independent D8 model do not govern current execution. See [current execution ledger](phase-d-d3-d8-ledger.md) and `phase-d-gates.json`. Frozen D2 review branches remain preserved.

## Historical authorization and status

Jose approved the following sequence in the Phase D COO conversation on October 6, 2026 (America/Puerto_Rico): execute D2 through D7 sequentially, with scope definition, guardrails, verification and all required executive GO decisions for each section. After the complete phase is ready, independent Codex performs D8 before development integration.

This records approval of the execution model. It does not claim that newly proposed D2 business policies, implementation, tests or exit votes have already been accepted.

- Repository: `JoseK0514/Fuel-Scheduler-`.
- D1.3 implementation baseline: `f54eefbb314851cfa3697490faf32bb71d647913`.
- Baseline tree: `d0715caa192e57cb3d51c27216551c2a3b0c092e`.
- Existing development baseline: `0516b7dcbb07a10d926cc5c53f3b650343cad9bd`.
- Continuation branch: `phase-d/d2-d7-controlled-execution-20261006`.
- D1.3 PR #8 remains a draft historical checkpoint, not an authorization to merge that slice separately.
- D2 runtime candidate: aa68e607830c77ec57262a267b18a187efaed3fb (tree a9ff2f68fc9c0fee052c1bea97fdcb50b1ab0471).
- D2 implementation, internal guardrails and all required management-function exit votes: **GO**.
- D2 is **READY FOR INDEPENDENT CODEX REVIEW**. This internal GO is not an independent approval.
- D3 remains locked pending the requested independent D2 review and Jose's continuation authorization. D4–D7 remain waiting for predecessors.
- D8 whole-phase review: NOT READY. Development integration: NO-GO. Production: NO-GO.

The runtime candidate includes the D2 correction implementation and its reproducible local verification harnesses. The review-package documentation records evidence and management decisions only; it does not activate hosted migrations, modify Neon/Vercel data, merge a PR, start D3, or authorize production.

## One controlling sequence

`D2 -> executive exit gate -> D3 -> executive exit gate -> D4 -> executive exit gate -> D5 -> executive exit gate -> D6 -> executive exit gate -> D7 -> executive exit gate -> whole-phase regression -> frozen candidate -> D8 independent Codex review -> remediation/reverification -> GO -> authorized development integration`

The latest Jose decision changes review timing, not the need for evidence. D1.1/D1.2 are already in the development baseline; their behavior and interactions remain in D8 regression scope. New Phase D work must not be merged to development section by section.

Test during implementation. Do not wait until D8 to run QA or investigate failures. Do not claim D1 is fully complete merely because D1.3 renders: correction-review integration and policy-dependent detectors remain tracked.

## Per-section control cycle

1. Write the section contract: user outcome, requirements, exclusions, dependencies, authority, state transitions, data provenance, failure behavior and measurable acceptance criteria. Distinguish approved requirements from design proposals.
2. Record a bounded implementation plan and exact base. Preserve original worktrees and branch history. Do not reconstruct unseen local work or force-push over it.
3. Implement only that section. Use failing regression tests before fixes and maintain a requirements-to-test matrix.
4. Run the guardrail sweep and applicable unit, PostgreSQL, API, browser, typecheck, lint, build and dependency checks. Use fictional, isolated data with proven environment identity; never assume a Preview database is non-production.
5. Freeze the section candidate SHA and collect the executive exit decisions below. Approval to begin is not approval of completed work.
6. Fix blockers and unresolved required conditions, then produce a new SHA and reverify affected gates. A passing unrelated test cannot waive a failed control.
7. Open the next section only after every required executive has a documented GO on the same candidate, required evidence exists and applicable independent blockers are resolved by their authorized reviewers.

## Executive exit matrix

These are the existing management review functions, not newly hired people or independent reviewer identities. Record who/which execution process performed each assessment. Several management perspectives produced in one assistant session must be labeled as such, never represented as separate independent agents.

| Required function | Evidence needed for GO |
| --- | --- |
| COO / operations coordination | Workflow solves the intended operational problem; handoff and support impact are clear. |
| CPO / Product | Approved scope is traced, useful and complete; no silent policy invention or omitted requirements. |
| CTO / CIO engineering | Architecture, interfaces, transactions, migrations, performance and rollback implications are verified. |
| CISO / Security & Privacy | Session/role/workspace boundaries, input controls, confidentiality and fail-closed behavior are verified. |
| Program Manager | Predecessor gate, scope, exact candidate, requirements matrix, test evidence and finding register reconcile. |
| Senior Technical Authority | Hidden coupling, root-cause correctness, races, regressions and evidence quality have been challenged. |
| Product Experience & Strategy | Apple-style usability, understandable workflows, responsive states and accessibility concerns are addressed. |
| Governance & Risk | Mandatory controls, evidence custody, open findings and release restrictions are explicitly reconciled. |

A vote records section, candidate SHA, reviewer/process, date, verdict, evidence, findings and conditions. Missing votes, abstentions, NO-GO or unresolved required conditions block advancement. GO WITH CONDITIONS is not an exit GO while required conditions remain open. An unresolved P0/P1 blocks the affected exit.

Independent QA/UI report directly to Jose and retain their findings. Management cannot direct, suppress or self-close them. The nine specialist auditors approved for the comprehensive internal audit keep their separate 3/3 department rules; this document does not pretend those auditors have executed reviews or silently replace them with management votes.

The JSON register is a tracking record, not a GitHub branch-protection mechanism. Current branch listings report development/main unprotected; actual server-side enforcement remains a tracked control gap. No paid plan or administrative-policy change is authorized by this document.

## D2 — correction workflow scope

### Existing requirements

The Lettered Executive Program requires employee correction requests, manager review, preservation of raw punch history and no silent rewriting of original events. D3 must later consume approved corrections without losing provenance. Existing Clocker architecture requires future correction writers to respect its employee/version and transaction protocol.

### Implemented D2 design

Use an append-only correction request/decision history with an explicit effective-time projection. Keep recorded punches, breaks, device attribution, schedule context and command receipts intact. Reject direct historical overwrites; a complete replacement of the Clocker subsystem is unnecessary.

Implemented workflow:

- An authenticated employee sees their own recorded entry and requests a correction with a reason and the proposed change. Fully missing records must be distinguished from adjustments to an existing record; neither may be presented as an actual device-captured punch.
- A current authorized Owner/Manager sees the original and proposed values, affected employee/location/date, supporting context and prior correction history, then approves or rejects with an auditable decision.
- Pending/rejected requests do not alter effective time. Approved adjustments remain visibly attributable and feed one shared effective-time projection for D3–D6; downstream modules must not calculate competing correction interpretations.
- Stale approval, duplicate submission, lost response and simultaneous review have explicit conflict/reconciliation outcomes. A retry must not create a second adjustment.
- An approved correction does not silently run a live kiosk Clock Out or rewrite captured break policy. Live operational state and an adjustment to historical time require an explicit consistency design.

### D2 guardrail and acceptance matrix

| Control | Required proof before D2 exit |
| --- | --- |
| Preserve history | Requests, approvals, rejection and retries leave original punch/break/context/receipt records unchanged; adjustment history remains reconstructable. |
| Current authority | Employee cannot read/change another employee's request; Lead has no implied management powers; role loss, inactive accounts, expired/revoked sessions and wrong workspace fail closed. |
| No silent self-approval | Review policy for a manager's own time is explicit before the writer is enabled; never infer that management role permits approving one's own change. |
| Correct time | Overnight, timezone/DST ambiguity, precision, reversed boundaries, overlapping entries/breaks and inconsistent existing history are tested without inventing wage rules. |
| Concurrent safety | Employee/version lock ordering, expected source/correction revision, approve-versus-reject, duplicate command and retry after response loss produce one traceable outcome. |
| Atomic audit | Decision, effective adjustment reference and receipt commit together or roll back together; an unknown result is not claimed as failure or success. |
| Reversibility | Correct an earlier adjustment using a new revision/superseding event, not deletion or mutation of historical approval evidence. |
| Honest presentation | Original, requested, effective and pending values are distinguishable; unavailable data is never shown as zero corrections or healthy completion. |
| Usability | One contextual request flow, clear before/after comparison, minimal copy, keyboard/focus and error recovery, responsive at 320–1440, Chromium/WebKit coverage. |
| Integration | Actual pending correction state feeds the D1/D7 dependency through an authorized adapter, with no fake pending counts or automatic payroll/discipline. |
| Activation safety | Additive migration is tested on owned disposable PostgreSQL only; build/start do not apply migrations and hosted activation remains separate. |

### D2 policy decisions — resolved for this bounded implementation

- **Review authority:** Employee/Lead self-service may request corrections. Current Owner/Manager authority may approve or reject. D2 provides no direct manager overwrite path and prohibits self-approval, including Owner self-review.
- **Live state:** A correction request against an open/live Clocker entry fails closed. D2 never performs a kiosk Clock Out and never rewrites live raw punch state.
- **Break scope:** D2 may request historical break-boundary changes only. Captured break classification remains immutable history. Paid/unpaid treatment, automatic deductions, grace periods and overtime policy are outside D2.
- **Missing/finalized time:** Fully missing completed time is represented as an auditable adjustment, never a fabricated device punch. D3 owns period finalization/reopening semantics; D2 preserves provenance/version hooks and does not silently modify finalized-period policy.

### D2 internal exit evidence — October 7, 2026

Runtime candidate: aa68e607830c77ec57262a267b18a187efaed3fb
Runtime tree: a9ff2f68fc9c0fee052c1bea97fdcb50b1ab0471

- TypeScript: PASS.
- ESLint: PASS.
- Application/unit/integration suite: **184 files / 1,933 tests PASS**.
- Production Next.js build: PASS; employee and manager correction routes are included.
- Owned disposable PostgreSQL regression with migration 0016 in the current runtime chain: **24 files / 407 tests PASS**.
- Dedicated D2 PostgreSQL adversarial protocol: **12/12 PASS**, covering raw-history preservation, idempotency/reuse conflicts, live-entry refusal, self-review denial, break-classification preservation, missing-entry provenance, approve/reject race, stale source, overlap, superseding adjustments, append-only history, protected employee/manager reads and real D1 pending-count integration.
- Exact-SHA owned browser verification: **44/44 PASS** across Chromium and WebKit at 320, 375, 390, 430, 768, 1024 and 1440 px. Verified employee submission, Owner review/approval, terminal employee history, role boundaries, keyboard focus, touch-target geometry and no horizontal/clipped-content failure.
- Security/privacy: server-derived actor identity, current session/role/workspace checks, no self-review, same-origin/custom-header/JSON/body-size controls, bounded error responses and no raw SQL/credential disclosure verified. Production dependency audit reported **0 vulnerabilities**.
- Raw-history static guard confirmed D2 migration contains no UPDATE/DELETE path for time_entries or break_entries.
- Browser evidence is retained outside the repository under ~/.codex/visualizations/nevora-d2-corrections-ui. It uses a local owned Next runtime and fictional disposable PostgreSQL, not hosted Neon/Vercel data.
- Known limitation carried to independent review/release acceptance: local Chromium/WebKit automation does not replace physical-device or screen-reader acceptance.

### D2 management-function exit decisions

These votes are management perspectives executed within this ChatGPT engineering thread. They are **not separate people and not independent review**.

| Function | Verdict | Basis |
| --- | --- | --- |
| COO / operations | GO | Employee request → manager review is operationally bounded; pending state feeds D1; no live Clocker mutation. |
| CPO / Product | GO | Required correction workflow is complete without inventing payroll, overtime, paid-break or finalized-period policy. |
| CTO / CIO engineering | GO | Append-only schema/projection, idempotency, locking, concurrency, migration, full tests and build are green. |
| CISO / Security & Privacy | GO | Session/role/workspace authority, anti-forgery boundaries, input limits, confidentiality and fail-closed paths verified. |
| Program Manager | GO | Scope, exact candidate, requirements, evidence and finding disposition reconcile; D3 remains locked. |
| Senior Technical Authority | GO | Browser-harness failures were separated from product defects; real WebKit touch-target defect was fixed and reverified; race/stale/overlap/live-state controls pass. |
| Product Experience & Strategy | GO | Responsive Apple-style correction flows, labeled controls, focus behavior, 44px targets and clear original/proposed/provenance states verified in Chromium/WebKit. |
| Governance & Risk | GO TO INDEPENDENT REVIEW | Owned data only, evidence custody recorded, no hosted activation/merge/production authorization, inherited release blockers retained. |

**D2 internal exit gate: GO. D2 independent Codex handoff: READY.** No independent verdict is claimed here. D3 remains locked until the requested independent D2 review is received and Jose authorizes continuation.

## Remaining sections and section-specific guardrails

| Section | Scope | Exit focus |
| --- | --- | --- |
| D3 | Employee/manager timecards, periods, punch/break details, corrections, totals, approvals, finalization and historical revisions | Shared effective-time projection, period boundaries, stale approval, finalized revision integrity and explicit reopen semantics. |
| D4 | Schedule vs Actual; hours by employee/location/position; attendance, overtime, callout, shift-change, time-off, coverage, stability, approval and period reports | Authoritative metric definitions, provenance, permission filtering, large datasets, historical labels and correct empty/unavailable states. Policy-dependent metrics remain unavailable until their basis is approved, not fabricated as zero. |
| D5 | CSV first, then useful PDF exports | Same authorized dataset as reports, formula-injection handling, encoding/escaping, complete bounded downloads, privacy and accessible output. |
| D6 | Payroll-ready normalized exports and explicit provider mappings, not payroll processing | Only eligible finalized/approved revisions, units/rounding/period identity, reconciliation and provider-format verification. No payroll submission, wages, tax calculation or paid integration activation. |
| D7 | Manager Action Center foundation using scheduling, requests and timekeeping exceptions | Real actionable counts, priority/provenance, correct deep-link context, deduplication and no notification spam or invented urgency/policy. |

Report-file retention must not delete raw punches, corrections, audit records or report source data. Prior discussion of retaining three generated reports is not permission for destructive history cleanup.

## Carried findings and evidence limitations

Carry the following into the register until there is the required closure evidence:

- QA-D13-001: remediation has been reported; separate independent closure is not claimed.
- D1.3 technical label findings: fresh/archived labels were remediated; D8 must verify prior findings and new-entity behavior on the final candidate.
- Manual-refresh assistive-technology feedback and physical-device/screen-reader acceptance remain open.
- D1.3 Actions artifact upload hit quota. A green test job is not proof its screenshots/report were retained. Package only necessary evidence, verify retrieval and keep this gap visible. No blanket deletion or paid upgrade.
- D1 correction-review adapter and deferred missing-clock-in/policy/overtime detector dependencies must not disappear from Phase D completeness tracking.
- FR-AUTH-001 and existing production custody, recovery and final-release controls remain open unless the authorized independent release record closes them.

## D8 handoff requirements

Freeze one final Phase D SHA and submit the full phase to a separate Codex review process that did not implement it. Include the original scope, requirement-to-code/test matrix, section checkpoint ledger, all executive votes, prior independent findings, exact-SHA CI logs, retained browser evidence, database/concurrency tests, environment identity and known limitations.

The structured audit covers requirements/completeness, architecture, Bug Catcher adversarial scenarios, UI/UX, accessibility, authentication/authorization/privacy, time math, correction integrity, period boundaries, reports, exports, large datasets and cross-feature regressions. Codex reports evidence-backed GO/NO-GO and finding IDs with closure criteria. Required conditions must be closed before integration. Management remediates; independent Codex reverifies.

No Codex review is launched by this setup commit. No executive exit votes or independent approvals are manufactured. Production remains a separate decision even after Phase D development integration.

## Sources and custody

- Jose's latest explicit Phase D instructions and approval in this conversation control the D2–D7/D8 sequence.
- Original Lettered Executive Program: Library `Pasted markdown(20261005-011557).md`, Phase D D2–D8 sections.
- Repository `AGENTS.md`, `README.md` and the executive/governance skills at baseline `f54eefbb314851cfa3697490faf32bb71d647913`.
- `docs/architecture/clocker-punch-service.md` for retained writer/locking principles; historical checkpoint descriptions do not supersede current runtime evidence.
- `docs/execution/final-release-checklist.md` and existing independent audit records remain controlling for release obligations.
