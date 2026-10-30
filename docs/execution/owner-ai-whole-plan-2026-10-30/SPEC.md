# Owner AI: jointly validated day plans

Jose authorized continuation with “Let’s do it” after the validated goals/tasks increment and the recorded recommendation to build whole-plan reasoning next. This increment turns a selected day's independent staffing suggestions into a comparison of jointly legal allocation sets. It is an application capability, not a claim about live model intelligence or completion of the broader Owner AI roadmap.

## Behavior

- An Owner selects a calendar date and compares read-only day plans without requiring a provider connection. A coverage-scoped task also retrieves this evidence before inference. The model may request the same bounded read tool for an explicit date.
- Plan all ready active locations together for that date. Keep the complete cross-location and adjacent-workweek assignment ledger, approved availability/leave/operational profiles, qualifications, Lead requirements and Manager exclusions. Preserve all existing commitments; add hypothetical assignments only. Published targets can be considered for read-only review, with publication consent still separate. Archived targets remain unavailable. Do not change management generation or any writer.
- Reuse the canonical planner, automatic eligibility and reservation allocation, including final validation against the combined proposed ledger. A second search may exclude the first suggested assignment to find a different allocation; label this search restriction, never call the result optimal or impossible. Show the unchanged baseline, at most two distinct alternatives, added hours/assignments, affected published targets, warnings and remaining staffing/position/Lead needs.
- Every result identifies its exact date, time zone, observation time and source fingerprint. Coverage includes drafts and is not published staffing. Show excluded/unconfigured locations and incomplete/budget-limited search. A complete plan means only the configured requirements in its stated ready scope are met at the observed snapshot. No configured demand does not mean the business is staffed.
- No financial savings, confirmed availability, business writes, batch approval, publication, notification or outcome monitoring are inferred. Later canonical actions must independently invalidate stale source/authority; this increment provides no execution token.

## Engineering decisions (implementation owner)

The existing weekly planner can be expensive. Extract a cooperative generator while retaining the synchronous `planWeek(input)` facade and identical default behavior. Only the new read-only review passes a selected date, bounded search and cancellation controls. Yield within candidate enumeration/search so the server can process other work; deadline exhaustion yields only a final-validated partial, while cancellation discards the result. Bound source cardinality before projection and cap returned assignments/gaps. Record actual latency and event-loop fairness rather than assuming node/evaluation caps imply a wall-clock bound.

Alternatives considered: a fresh independent solver would duplicate approved rules; an unbounded synchronous weekly call would exceed advisor deadlines; a new worker/deployment stack would add runtime dependencies. Cooperative reuse fits the existing runtime without provider/deployment configuration. These are engineering choices, not new business policies.

## Invariants and acceptance

Original Owner/company/session checks surround reads/computation and settlement. Existing provider consent, activation, budget, replay and private retirement remain. Model output cannot fabricate the structured plan evidence. Strict client parsing bounds the new data; saved history/replay retains historical provenance. Preserve approved Owner/Employee styles and management/desktop workflows.

Test scarce cross-location/position/Lead capacity, approved leave/hours, adjacent commitments, exclusions, published and archived targets, setup gaps, no demand, alternative deduplication, cancellation and deadline partials. Verify default planner behavior, real PostgreSQL read-only/authority/source freshness, real browser rendering/reflow/keyboard/privacy and the full required suites. Obtain fresh independent whole-change code/UI/QA review. Local success is not hosted, Neon transport, paid-model or production acceptance.

No production configuration, migration, release, push to the shared collaboration branch, merge, paid inference or real notification is authorized. Continue detached from da1dab3e; retain original ledgers/submissions and failed evidence. Keep the Employee continuation owned by the local chat.
