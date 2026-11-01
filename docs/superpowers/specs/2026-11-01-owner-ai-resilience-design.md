# Owner chat resilience: first hardening pass

Jose wants the NEVORA chat prepared for exceptionally difficult, compound operational challenges. This design makes the next increment concrete. It does not promise universal competence or infer new action/data permissions.

## Proposed approach

1. **Recommended now: harden the existing agent and measure it.** Fix the two observed chat defects, improve explicit crisis reasoning and test the existing capabilities against difficult fictional cases. Retain current application services, provider protocols, budgets, authority and action controls.
2. **Later: additional verified operational sources.** Closure status, sales, inventory, weather or communications could improve future decisions. Each source needs a clear owner, data quality, permissions and failure behavior. They are not part of this increment.
3. **Later: compare models.** The provider supports explicit model selection. Comparing stronger models needs a controlled evaluation and budget; a model change alone does not establish the correctness of the application evidence or renderer.

The recommended first increment is development hardening, not production activation. Jose has requested the improvement; the design choices below are Codex's proposed implementation, not a claim that Jose approved every detail.

## User-visible behavior

- Identify the actual business objective and the highest consequence constraint before optimizing hours or cost.
- For reported immediate danger, prioritize people and established emergency response; distinguish an unverified report from observed application facts. Do not invent emergency, medical, legal, weather or financial capabilities.
- Distinguish current NEVORA observations, the Owner's reports, historical conversation/task notes, hypotheses and unavailable information.
- Investigate relevant dated evidence, compare separate feasible options, explain the decisive tradeoff, give a next step, a contingency and a check that could falsify the recommendation.
- Preserve a remaining shortage, outage or unknown when the request is impossible within the evidence and constraints. Do not declare a global optimum or universal impossibility from bounded search.
- Keep answers useful under pressure: lead with the recommendation and retain safety, partial-data, publication, financial-readiness and action-boundary caveats without repeating them for each option.
- Resume saved objectives with fresh scoped evidence; do not treat prior success notes as current facts, consent or execution proof. Reuse already supplied current evidence when adequate; do not spend turns rereading it without a reason.

## Implementation boundaries

1. `loop.server.ts`: represent mandatory real application reads as paired function calls/results, preserving canonical evidence IDs and normal authority checks, rather than ordinary user-role claims. Keep field contents untrusted and do not trust user-authored lookalike envelopes. Apply the same representation to Responses and the existing Chat Completions projection.
2. Agent instructions: encode the crisis decision discipline above, capability limits and efficient use of the existing six provider turns/eight read-review slots/two decision attempts. No new model tool or external lookup is added.
3. `decision.ts`: render shared canonical-plan/partial/unverified caveats once while retaining each option's exact source, scope, search status, remaining blocks, added minutes and publication impact. Preserve unambiguous selected workflow attachments and existing validation. Never truncate away a critical fact to meet an arbitrary word count.
4. Test-only scenario inventory and explicit evaluation runner: severe staffing cascades, impossible constraints, conflicting publication/drafts, changed evidence, saved task attacks, multilingual payroll gaps, unsupported emergencies, malicious names/notes/priorities, privacy/authority attempts, stale/replayed operations and provider failures. Exact expected facts and critical-failure rubrics remain outside prompts sent to the model.

The inventory should contain at least 32 named challenges, including compound events and multi-turn continuations. Scripted local tests establish orchestration and safeguards; only retained real-model answers can establish observed judgment. Do not label unevaluated scenarios passed.

## Acceptance

- Failing-before-fix regression evidence for mandatory-read provenance and duplicate renderer caveats.
- Both provider protocols preserve real tool/result pairing, stale-history separation, cancellation, correction feedback and authority rechecks.
- Source-owned partial/search/publication/financial/action caveats and canonical attachments remain intact in English and Spanish.
- A repeatable challenge inventory with explicit inputs, exact facts, required investigation and critical failure conditions; a paid runner requires separate budget authorization and a new non-resettable ledger.
- Run the affected tests, owned PostgreSQL integration, full default suite, TypeScript and lint. Inspect relevant UI rendering tests; browser evidence remains necessary before certifying the future chat screen.
- If authorized, run fictional live evaluation with captured answers, usage and independent per-case semantic assessments. Exhausted prior pilot ledgers cannot be reused.
- Record exact source, failures, changed files, risks and remaining gates in a repository handoff.

## Preserved controls and risks

Current Owner/company authority, tenant scoping, minimized data, request identity/replay behavior, daily request admission, deadlines, stream/request limits, no automatic inference retries, no model-exposed business mutation and explicit normal action consent stay in force. No schema, dependency, production configuration, real notification, customer-data or branch-policy change is proposed.

Primary risks: vendor acceptance of the preloaded tool transcript; regressions in protocol-shape tests; excessive brevity omitting material context; and overclaiming what a scenario suite proves. Address with protocol/integration regressions, retained canonical attachments/caveats, explicit incomplete status and bounded live evaluation.

Owner: Codex. Product supports operational usefulness; Engineering reuses current services; Security preserves authority/capability boundaries; Assurance requires reproduced evidence; Governance retains existing release controls. Independent QA/UI certification and production remain separate decisions.
