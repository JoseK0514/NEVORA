# Owner-reviewed coverage drafts

Jose approved the recommended next build: compare a plan, approve its exact draft changes, and verify resulting coverage; first repair the observation timezone and missing per-assignment publication labels. Continue one bounded workflow, preserving existing mobile/desktop Owner UI. This authorizes source/tests in isolation, not operational actions, publication, messages, paid inference, integration, push, merge or deployment.

## Approach and scope

Extend the existing provider-independent joint-day comparison. An Owner chooses one alternative, prepares a server-owned exact review, acknowledges its effects, saves its additions atomically to DRAFT schedules, and explicitly checks current results. Preserve every existing assignment. Never combine alternatives or regenerate a different plan after approval. Reject an entire selected plan that touches a published/archived target; explain the separate Scheduling path rather than silently dropping assignments or changing publication.

Reuse canonical `preparePublishedWeekChange`, generation source/mutation guards, shared scheduling validation and original Owner/company authority. The ordinary weekly generator cannot serve this action because it recomputes a potentially different plan. Sequential single-shift writes would permit partial results and are rejected. A general autonomous executor is outside this task. Implement a focused data writer composing the existing canonical guarded batch.

Current public plan assignments lack position IDs. New projections add optional `positionId`; strict parsing accepts old historical projections, but only fresh projections with exact IDs can prepare actions. Names never identify positions or authorize work. All accepted terms are independently validated on the complete current ledger, including every other proposed addition, using AUTOMATIC rules; reviewed additions are deliberate MANUAL draft assignments.

## Contract

Three explicit, Owner-only commands on the existing guarded advisor endpoint, never model tools:
- `prepare_coverage_draft`: UUID requestId, date, exact sourceVersion, 1–12 assignments with employeeId/locationId/startTime/endTime/nullable positionId/isDesignatedLead. Server hydrates labels from canonical source and stores a five-minute immutable review.
- `apply_coverage_draft`: UUID requestId, UUID reviewId, acknowledged=true; uses stored terms only. Current Owner/workspace/authority, unexpired review, source hash, draft parents and combined legality must hold in the write transaction.
- `check_coverage_draft`: UUID requestId/reviewId; reads the original review/receipt and fresh current source. No automatic business action or task closure.

Additive migration0044 supplies review and receipt custody scoped to workspace/Owner. Preparing/replaying the same command cannot renew expiry. Save and receipt settle atomically. Concurrent identical saves mutate once; altered commands/another operation after a saved review conflict. Lost replies recover the original result before checking current source/expiry. Revoked access never returns private results. Store current assignment episode IDs with the receipt so deleted/recreated/released work is not falsely called intact.

Public responses distinguish exact prepared review, immutable save receipt, and current progress. A saved draft does not establish publication, employee acceptance, attendance or resolved business coverage. Progress shows current assignment presence/publication and a fresh configured planning-coverage measure, with partial/excluded scope explicit. Source reads that fail are unavailable, never zero/all clear. Receipt replay remains possible when the current scheduling source is unavailable.

## UI

Preserve existing tokens, Inter typography, Phosphor assets,44px targets and scoped Owner component classes. Show publication state on each assignment and format observation time explicitly in the workspace timezone. Each eligible plan offers Review draft changes. Review groups exact people/location/date/time/position/Lead and shows expiry, preserved existing work and draft-only consequence. One acknowledgement and Save draft; no redundant confirmation page. Saved view retains the receipt, an explicit Check progress button and an exact Scheduling link. Published/mixed plans explain why this action is unavailable.

Use a focused coverage action controller so original compare/ask/notebook controllers and model tool protocol remain intact. Bound client public parsing and request-start freshness. Preserve original in-memory mutation identity after connection loss; hide protected DOM on pause/offline/expiry/access loss and recover only after fresh authority. No browser persistence or private URL payloads. Refreshes never submit another save; controls cannot issue duplicate operations while busy. Keep the Owner's selected comparison context and meaningful focus through review/result/back.

## Acceptance and non-goals

Reproduce both UI defects before fixing; prove exact selection, atomic all-or-none save, mixed/publication blocking, source/rule/authority conflicts, cross-Owner/company denial, expiry, concurrent/replayed commands, lost result recovery, failure before/after commit and positive current outcome evidence. Real Next/login/owned-PostgreSQL browser journeys at320/390/430/desktop, enlarged text, keyboard, long labels and private retirement. Run focused/affected tests, full default suite, static checks and fresh whole-slice review; preserve failed evidence and original review verdicts. No live model/vendor, universal solver performance, hosted/physical-device/screen-reader or production claim.

## Operating decisions

User's standing instruction to continue approved bounded work without routine approval requests overrides repeated skill approval menus. Scope/approach above elaborates the already approved exact draft workflow; it does not authorize later watchlists, standing autonomy or whole-week expansion. The existing reviewed AI-owner head8d948736 is this feature-continuation base; shared collaboration head08728bc5 diverges at1121f24e and must not be overwritten or merged automatically. Development/source reconciliation remains a later integration gate. Native app worktree creation could not target the nested isolated clone; an external detached Git worktree preserves both existing checkouts without creating a branch.
