# Rondo: company operations assistant

Product direction recorded from Jose on November 9, 2026. This document preserves the intended destination and the gap to today's implementation; it is not a declaration that the destination has shipped.

November15 update: [native management qualification](../handoffs/2026-11-15-rondo-management-qualification.md)
records seven actual Claude turns, a reproduced false eligibility explanation,
its source fix and two successful bilingual regression turns, plus exact Owner
draft approval and local browser evidence. Earlier checkpoint statuses below are
historical; they do not describe the later native run or a hosted release.
Jose approved an [Owner-managed profile/text-library backend](../superpowers/specs/2026-11-15-rondo-company-knowledge-design.md).
Its [local implementation and qualification](../handoffs/2026-11-15-rondo-company-knowledge-backend.md)
now includes explicit publication, private citations and revision/time-fenced
retrieval. The knowledge flag ships off. Claude's screens, live-model document
judgment and combined hosted development acceptance remain separate.

Jose subsequently set [all 50 Owner challenges at 10/10 each](../qa/2026-11-15-rondo-owner-50-standard.md)
as Rondo's target. The question catalog and scoring standard are recorded; the
dedicated fixtures, actual-model campaign and independent scores are not run.
This broader target is distinct from the earlier component qualification.
The proposed [manager program roadmap](2026-11-15-rondo-manager-roadmap.md)
sequences company knowledge, weekly workforce planning, business-source
connections, decision/action reliability and full qualification in development.

## Identity and product goal

The assistant inside the NEVORA Owner profile is **Rondo**. The name stays Rondo in English and Spanish. Rondo is accessed through chat within the profile. The website adviser also uses this name, with different data and capabilities.

The original identity change named Rondo in the model-side instruction without changing Claude's UI. The later optional knowledge tool is separately qualified below; the Owner-only server guard remains in place.

Jose wants a company-aware assistant capable of taking over substantial Owner/Manager operational work: understand the business, remember explicit objectives, investigate problems, compare options, recommend decisions, prepare work and verify outcomes with much less manual supervision. Aim for measurable expert-level performance on supported work rather than assuming every human decision is correct or declaring the model universally superior.

Owner is the present target. Manager is a proposed extension: Jose said "probably for manager." That statement does not approve company-wide Manager data access. Any Manager rollout needs a role-scoped design and server enforcement before exposure.

## What company understanding must mean

For each connected domain, Rondo should know which approved source owns the facts; retrieve the records allowed to the current role; distinguish fresh facts from old conversation, reported events and saved intent; expose material missing data; and update its conclusion when the evidence changes. A useful answer explains the recommendation, decisive evidence, tradeoff, next step, contingency and outcome check.

The target is comprehensive understanding of the company's authorized, connected information. It is not awareness of unrecorded events, private thoughts, unavailable systems or future outcomes. Missing data must create a visible question or integration gap, never an invented company fact.

## Current capability inventory

Historical development snapshot: `3446982085c32b238b4d329c98639f3978c6e8b2`.
The November15 local knowledge candidate is `c21f81d0a5dfde2cf25f869ddb0e1ccb896d70b0`;
its handoff distinguishes local evidence from hosted release state.

| Company domain | Current implementation evidence | Gap before broad operational delegation |
| --- | --- | --- |
| Identity, workspace and role | [Owner admission](../../src/lib/owner-advisor/authority.server.ts) requires current OWNER plus company authority | Manager admission is not implemented; do not relax this guard just to expose the chat |
| Today's workforce, punches and published staffing | `company_briefing`, `published_staffing` in [tool contracts](../../src/lib/owner-advisor/contracts.ts) | Bounded snapshots are not a complete employee directory, verified attendance causation or whole-company knowledge |
| Coverage, availability, roles and scheduling constraints | `coverage_investigation`, `coverage_proposals`, `coverage_plan` | Date/scope/input limits remain; bounded search is not a universal impossibility or optimality proof |
| Recorded history and timecards | `operational_insights`, `attendance_payroll_review` | Financial readiness remains unverified; absent records cannot establish zero work or misconduct |
| Objectives, goals, tasks and prior decisions | Explicit private memory, notebook and priorities | Saved intent is not new evidence, permission or an inferred preference; private context remains per Owner |
| Rules and legal sources | Fixed-source `legal_research`; scheduling enforcement reads | Company prose cannot change enforced rules or establish independently qualified applicability clearance |
| Company profile and text library | Optional published profile and `company_knowledge` read, exact-version private citations, revision/effective/review fences | Local text/TXT/Markdown backend only; flag off, UI/hosted acceptance and actual-model document judgment pending; no PDF/Word/OCR support |
| Acting on plans | Separate canonical coverage prepare/apply/check commands with server rechecks | Model read tools do not independently publish, notify, transfer money or execute arbitrary business operations |
| Sales, banking, cash flow, inventory, customers, contracts and external tools | No such tools in the current model allowlist | Each needs an explicit source/integration, permissions, freshness contract and acceptance evidence |
| Background management | Chat-triggered investigations and explicit workflows | Continuous monitoring, dispatch, communications and unattended business management are not established |

The model's allowlisted reads and bounded decision review are implemented in [the investigation loop](../../src/lib/owner-advisor/loop.server.ts). The chat's wording cannot create a new capability or authorization.

## Difficult and impossible challenges

Rondo must be tested against compound incidents, contradictory evidence, adversarial pressure, changed priorities, long histories, scarce resources, mathematically incompatible demands and service failures. Include ordinary solvable controls so blanket refusal does not look like competence.

Passing an impossible case means correctly identifying the conflicting requirements or missing evidence, demonstrating the limit to the extent the source supports it, preserving unmet needs and proposing the smallest feasible change or fallback. It must not fabricate a successful schedule, action, payment, legal conclusion or impossible prediction. A bounded search that found no complete plan is different from a mathematical proof that none can exist.

The executable model run must be distinguished from a prepared scenario, scripted-provider test, database preflight and human semantic review. No case passes merely because JSON parsed, the provider refused, an error was hidden, or a mock returned the desired sentence.

The [new leadership challenge pack](../qa/rondo-company-leadership-challenges.json) adds 16 scenarios for this direction. All 16 now have verified owned PostgreSQL fixtures and service paths; 13 have injectable conversation drivers, while three exercise server authorization/recovery invariants. Its model judgment status remains **not executed**. See [provider and challenge readiness](../qa/2026-11-09-rondo-provider-readiness.md). Existing model validation evidence remains dated and does not certify these cases.

## Acceptance requirements

- Zero critical failures in the selected release suite: no cross-company/role disclosure, invented evidence, false completed action, unauthorized mutation, bypassed enforced constraint or unsupported guarantee.
- Every applicable complex case must receive a correct, useful recommendation, decisive evidence, material unknowns, a practical fallback and a verifiable success check. Correct refusal alone is insufficient when a safe useful answer exists.
- Feasible controls must succeed; infeasible variants must preserve the shortfall. Changed facts must change the answer; a preference change alone must not rewrite company facts.
- Repeated runs, clean conversation state, corrected follow-ups, English/Spanish and difficult input variants must be scored separately. Preserve failures and identify the exact model, protocol, prompt, data snapshot, source SHA and budget.
- Compare supported recommendations against a reviewed business-expert answer and canonical constraints. Demonstrated performance can support a scoped claim; it cannot support "knows everything" or "passes every possible challenge."
- Delegation must name the action, role, data scope, authority, retry/idempotency behavior, audit record and outcome check. A future broader operating role requires those capabilities to exist and pass their tests; declaring Rondo an Owner replacement does not supply them.

These are concrete acceptance requirements for the target. They do not establish new release approval or waive the current open gates.

## Execution and handoff

Engineering owns the source/tool/authorization coverage map and evaluation harness. Claude owns the chat's displayed identity and UI integration; no overlapping UI work was started here. Independent QA must reproduce release evidence and evaluate the semantic transcripts independently before certification.

Next bounded work: close the previously observed provider failures; run and review this pack on a designated nonproduction configuration; fill company-source gaps in separate scoped increments; then design Manager access if Jose elects that extension. No paid run may reuse the closed November 9 $5 ledger. This direction does not approve another spend, production deployment or blanket autonomous access.

## Verification of this change

The Rondo identity instruction passed the existing 244 advisor unit tests and 149 PostgreSQL integration tests against the isolated change over the snapshot above; no skips or failures. TypeScript passed. All four local document links and the 16 unique challenge definitions were checked. These results establish local regressions only: the new pack has no model-executed pass, and no new paid inference or hosted acceptance was performed. Evidence is retained in `.omo/evidence/rondo-operating-contract-20261109/` in this worktree. The change is local and unpushed, with no production deployment or new branch.
