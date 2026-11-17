# Rondo weekly manager: exact draft review and recovery

Status: approved by Jose in this chat on November16,2026. This is a
bounded implementation of roadmap phase2 (step3 of Jose's eight-step request),
with its approval/recovery portion of phase5. It does not certify the50 questions.

## Intent and authority

An Owner asks Rondo for a full working week, compares practical alternatives,
opens the complete proposed changes, and approves or declines. Approval saves
exactly that reviewed draft set. Publication remains a separate existing action.
The model cannot approve, change management rules, publish, notify staff, or
substitute a new allocation during save.

Jose authorized the full manager program on November16 and selected both imports
and direct connections for later business records. He reaffirmed Claude owns UI.
This document records Codex's technical choices; it does not claim Jose selected
these previously unwritten details. Scope here is the weekly backend/API and
deterministic local verification, plus an actionable UI contract for Claude.
Metered semantic qualification, external accounts, shared-development assembly,
hosted acceptance and production retain their separate existing gates.

## Source and existing behavior

Inspected isolated candidate8738bc18 on development22a9d598. Recovery of the
pre-alignment candidate is archive/rondo-20261116-before-development-alignment.
Claude's collaboration source40ccc4e4 is held for separate integration/review.
The current source includes management restrictions and eight-week weekend
rotation. New0064 follows already-applied0065 in canonical migration order.

Reuse:

- src/lib/scheduling/generation/planner.ts: cooperative planWeekSteps over the
  whole ledger; generation scope, protection, reservations and final validation.
- src/lib/data/schedule-generation-snapshot.ts and generation-guards.ts: complete
  authoritative source, weekly mapping, adjacent commitments and locked guards.
- src/lib/data/schedule-generation.ts: generated-row provenance, protected-row
  preservation, unchanged-row identity reuse and inserted-episode assertions.
  Its generateWeekDraft runs a solver during execution, so it cannot be called
  directly to execute an already approved Rondo allocation.
- src/lib/owner-advisor/coverage-plan.server.ts: bounded observation and source
  digest. Existing selected-day comparison and12-addition contracts stay intact.
- coverage-actions.server.ts / reviewed-coverage-draft.server.ts: immutable
  Owner/session-bound review, exact-set validation, atomic receipt and readback.
- authority.server.ts, store.server.ts, company-knowledge-fence.server.ts:
  current Owner admission, guarded response and revision/time fences.

The aligned baseline passed309 focused units in32 files and standalone typecheck.
These are not weekly implementation evidence or post-alignment full release QA.

## Approaches and decision

1. Reuse the canonical week engine to prepare immutable server proposals, then
   validate and write the selected exact set atomically. This preserves the
   existing scheduling rules and supports honest approval/recovery. Recommended;
   it is the sole approach consistent with the adopted roadmap's exact approval.
2. Run generateWeekDraft after approval: less new orchestration, but re-plans
   against later facts and can save terms the Owner never reviewed. Rejected.
3. Execute seven daily Rondo saves: reuses day actions, but loses joint weekly
   validation and atomicity and can leave a partially applied week. Rejected.

## Scope and product meaning

- One canonical Monday weekStart, explicit ALL or SELECTED active location scope,
  and mode FILL_GAPS_ONLY (default) or BUILD_WEEK (explicit Owner selection).
- FILL_GAPS_ONLY preserves every existing assignment. BUILD_WEEK may replace only
  eligible generated DRAFT rows in the selected week/locations, using canonical
  protection rules. Manual, referenced, published, archived, foreign-week and
  out-of-scope commitments cannot be removed. Identical generated terms retain
  their existing IDs/episodes rather than generating delete/reinsert noise.
- All ledger commitments remain validation inputs, including adjacent weeks,
  other locations, callouts and retained work. Scope never filters eligibility
  evidence. Published/archived targets are excluded from this draft writer and
  identified in the result; they are not silently unpublished or rewritten.
- Compare at most two distinct alternatives: canonical result, then a bounded
  result excluding its first new candidate when available. Each is independently
  validated. They are separate sets and cannot be combined.
- Coverage is the primary canonical objective; existing target-hours, preference
  and weekend fairness rules remain the canonical tie-breakers. Report the
  actual known/unknown history basis. Do not claim optimized labor dollars,
  demand forecasts, closing-shift equity, eight-week attendance causation or
  arbitrary Owner objectives unsupported by current readers/optimizer.
- Owner prose/priorities inform Rondo's explanation and option selection; only
  existing approved structured scheduling restrictions affect hard eligibility.
  Chat does not create a management restriction. Availability/requested leave
  keep current configured preference/agreement semantics.
- Empty/no-change, incomplete setup, no validated addition, and search exhaustion
  are first-class results. Bounded failure to find a complete plan does not prove
  universal infeasibility or optimality. Any existing hard-rule violations in
  retained work remain visible; they cannot be presented as newly cleared.
- Codex's conservative rebuild admission choice: compare each selected coverage,
  qualification and lead obligation against the existing draft at each covered
  interval, not just aggregate minutes. A BUILD_WEEK proposal that reduces an
  already-fulfilled obligation, or only removes work without adding a replacement,
  is inspection-only and has no apply handle. Keep the unchanged current-draft
  baseline visible. This prevents a short/exhausted search from deleting useful
  coverage. A later deliberate coverage-reduction workflow would need its own
  explicit decision contract. No search failure may erase the baseline.

## Bounds: Codex defaults, not new company staffing policy

Reuse current source admission caps:80 employees,20 locations,80 positions,
2500 shifts,200 coverage windows,400 position requirements,5000 rows per other
source array,16000 rows overall and2MB serialized raw source. Exceeding any cap
returns unavailable with an explicit limit reason; no source is silently cut.

For weekly search use maxNodes128, maxEvaluations4000, maxPeriods1024 and at most
84 additions and84 removals per alternative. Reject an oversized replacement
set rather than remove only its prefix. Budget at most8 seconds total solving,
3.5 seconds per alternative, with cooperative yield/cancellation checks at
approximately4ms boundaries and a20-second compare service deadline. Report
budgets/exhaustion and measured elapsed/yield data. These are resource ceilings,
not a promise that every admitted company can receive a complete weekly plan.
Meaningful large-input checks must establish the implementation stays responsive;
raising ceilings requires measured evidence rather than silently disabling them.
Implementation measurement on November16 revised Codex's initial period ceiling
from256 to1024, keeping all CPU/node/evaluation/addition ceilings unchanged: the
hand-checked three-site/seven-day fixtures need441 periods for21 assignments and
882 for42 assignments. The256 ceiling stopped at12/13;1024 completed21/42 in
128/283ms in the local spike. Resource-bound dense/cancel tests still apply.

One exact alternative payload is limited to128KiB UTF-8. Never truncate additions,
removals, preserved identity custody, or review terms to meet that bound. Bound
diagnostic detail separately while retaining totals/omitted counts. The model's
weekly projection is at most12KiB and contains no omitted-set fiction: IDs,
digest, dates, scope, before/after measures, counts, first eight gaps, attributed
advisories, search status and exact-plan route. Full exact terms stay in the
authorized private review API. Existing global model tool/source/body budgets
still apply; weekly inspection consumes a normal tool slot and source slot.

## Proposal identity and storage

Add an additive owner_advisor_weekly_operations table for idempotent comparison
requests and owner_advisor_weekly_reviews for the at-most-two immutable options.
Proposed migration0066 must be checked against current reservations immediately
before implementation; append to explicit migration order and regenerate the
canonical onboarding manifest/mirrors. Never reorder0065/0064.

All keys include workspace_id and owner_id. Review identity is random UUIDv4;
store authority, session token hash (never token), source digest, week/mode/scope,
prepared/expiry timestamps, immutable exact additions/removals, canonical claims,
before/after measures, retained-source identities needed for validation, context
fences, operation binding, terminal disposition and receipt. A SHA-256 termsDigest
binds all execution-relevant terms, time zone, source, scope and context fences.
Display names are bounded metadata, never execution identity. Client-supplied
assignment arrays, arbitrary row IDs to delete, SQL, model claims or digests do
not become trusted plans.

Each review expires after five minutes or an earlier knowledge/context validity
boundary. Maximum20 unexpired unsaved alternatives per Owner; maximum200 stored
unsaved alternatives and1000 saved receipt rows per Owner. Expired unsaved
proposals/failed comparison reservations may be purged after24 hours during
admission, only after they can no longer be applied; never purge a saved receipt
or reset an operation ID as a retry shortcut. Above a retained-receipt cap fail
with a clear capacity state until an explicit retention/archive workflow exists.
Deletion/retention changes for saved business receipts are outside this slice.

Comparisons may persist private proposal/operation artifacts; they never alter
the scheduling ledger, publications or notifications. Failed/expired operation
IDs remain non-reusable tombstones for their retained lifetime, and a retry never
reuses an admitted comparison ID for a different hash or source. No quota reset
through a second session; all admission counts are Owner-scoped and atomic.

## API and model boundary

Use a new private POST /api/owner/advisor/weekly with strict exact-key JSON,
fatal UTF-8,16KiB streamed body limit, same-origin mutation boundary/header
x-nevora-owner-advisor, current session/OWNER/Company admission and no-store JSON.
Reject query parameters, extra fields, invalid dates, non-Monday weekStart,
duplicate/out-of-scope location IDs and incompatible operation fields.

Commands (all requestId UUIDv4; all explicit Owner commands except the compare
service also usable by the read-only model tool):

- compare_week: requestId, weekStart, mode, locationScope. Reserve its hash and
  quotas before bounded work; atomically persist both alternatives and completed
  comparison manifest, or a failed state. Duplicate completed request returns the
  same proposals, not a new solve. Busy/failed/expired states are explicit.
- read_week_plan: requestId, reviewId. Return exact saved proposal, termsDigest,
  expiry and current freshness/approval state. On an apply-eligible current plan,
  atomically issue an Owner/session/digest-bound readReceiptId UUIDv4, returned
  only with this complete exact projection. No provider credential required.
- apply_week_plan: requestId, reviewId, acknowledged:true, termsDigest,
  readReceiptId. All-or-
  nothing only. Reject altered digest, expired/declined/foreign-session proposal
  and unknown/subset fields. Never rerun the solver. Validated partial-coverage
  plans may be saved in their entirety with remaining gaps displayed; partial
  approval of assignment subsets needs a new exact review and is not supported
  by this endpoint. A no-change comparison cannot issue a business apply command.
- decline_week_plan: requestId, reviewId. Persist terminal decline metadata only;
  no schedule writes. The Owner may decline one option and review another.
- check_week_plan: requestId, reviewId. Recover terminal disposition/receipt and
  inspect exact persisted assignment identities, terms, episode IDs, owning
  location/week and publication state. Can also recover an unknown apply result.

The weekly_plan model tool accepts only weekStart and locationScope; defaults to
FILL_GAPS_ONLY. BUILD_WEEK comparison is initiated explicitly by the Owner API,
not selected by a model tool. The tool has no apply/decline/publication authority.
Its server-generated comparison identity is bound to the original investigation
request and tool occurrence, so network retries cannot create fresh quota/budget.
Its prompt says alternatives are separate, scope/exhaustion limits matter, and
the complete exact review must be opened before approval. Existing day contracts
and old client response shapes remain compatible; new weekly fields are opt-in.

Codex's review-admission choice: the summary's digest is insufficient to approve.
Only the full read can issue readReceiptId, and apply must verify that same
Owner/session/digest-bound receipt. The model projection never includes it.
Duplicate full reads are idempotent and cannot issue a token for changed context.
The UI enables approval only after validating the complete full-review response
and asks for an explicit acknowledgement. This establishes the full-review path
was requested and acknowledged; it cannot prove a human read or understood every
row, and a lost read response does not count as an acknowledged UI review.

The model may cite only a trusted private weekly review route and source metadata.
Its natural-language assertion or a scripted transport response never establishes
feasibility. Extend typed decision evidence/metrics to accept the matching actual
weekly result and scope only. Do not fabricate numeric values or permit arbitrary
JSON paths. Opaque review IDs from user text are not admitted evidence.

## Freshness, context and locks

Capture one bounded MVCC generation source and use coverageSourceVersion. Include
the whole conservative source in the locked assertion; no adjacent eligibility
rows or absence checks are dropped. Freshness does not mean the model knows all
business facts; company guidance, operational records and assumptions stay separate.

When company knowledge is enabled, capture its revision/fingerprint/validUntil
before comparison and bind it into proposals; knowledge activation, expiry,
review-overdue transition, withdrawal, archive or deletion invalidate unsaved
reviews. Feature-off cannot make a previously tagged review current. Standalone
weekly compare uses current profile revision and explicit scope/mode. Model-origin
compare also binds the admitted notebook/memory/task revisions and expiry already
used by that investigation. Before prepare/read/apply, recheck current fences.
Changed objectives/Owner context require a new comparison, never a modified replay.

For apply: acquire workspace FOR NO KEY UPDATE FIRST, sorted affected-week locks,
canonical generation source table locks, and exact-source assertion; then the
review row lock and context/Owner fences. Include every affected workweek and
owning parent week from retained ledger and overnight additions/removals. Reuse
the conflicting workspace lock for knowledge guards without SHARE-to-write lock
upgrade. Keep final authority/context/time checks inside the same transaction.
Different code paths must follow the same order, including decline/cleanup, so a
race cannot save a declined plan or revive expired context.

Revalidate the exact final SET without a solver: canonical ready locations,
protection/removal eligibility, generation claims, joint capacity reservations,
each added shift against all retained and other added shifts, hard management
restrictions, qualifications, leave, rest/break/hour limits, adjacent weeks and
configuration. Recompute the after-state metrics. Any difference or validation
failure conflicts; do not repair, substitute, drop a row or retry new terms.

## Atomic save, receipt and observation

One guarded transaction creates missing DRAFT parents only where additions need
them, deletes exactly eligible reviewed rows, inserts exact reviewed additions
with validated GENERATED provenance, updates touched parents and records the
immutable receipt. Preserve existing matching identities. Assert the complete
post-write source (including all non-target rows), fresh DB-minted assignment
episode IDs and receipt row/count/hash custody before commit. Suppressing or
mutating triggers must roll back, not produce a success receipt. Reuse existing
generationInsertedSourceGuard/notification guards without generating publication
revisions. Zero staff notifications, outbox sends or publication writes.

Receipt: operationId, reviewId, termsDigest, savedAt, added/removed/retained counts,
created parent IDs and exact inserted/removed identity custody. Receipt plus
business rows commit together. Repeating the identical operation returns the
original receipt even if the five-minute review later expires; another apply
operation for the same review conflicts. A lost response followed by check returns
saved/declined/not_saved/unavailable; an unavailable observation cannot be labeled
not_saved. Retry of the same operation is safe. No automatic new operation ID.

Later readback distinguishes saved draft, published, edited/removed/recreated,
scope/time-zone changed and observation unavailable. It checks episodes and parent
identity, so delete/reinsert with identical strings is changed. A receipt is proof
of a committed draft mutation, not proof of current coverage, publication or a
real-world business outcome. Coverage and remaining gaps are freshly observed.

Every response performs current Owner/authority and context observation, bounded
by session/fence validity (max15 seconds). Revocation removes private display.
If knowledge/context was withdrawn after save, a still-authorized recovery may
return minimal historical receipt metadata/counts/hash and stale status, but
must withhold withdrawn source text and stale proposal names/details. The save
is not undone. Authority loss denies both metadata and details. This separation
must be tested rather than relabeling an old proposal as fresh.

Cancellation before commit leaves no business mutation. A deadline after commit
can make the response uncertain; recovery always reads the original operation.
No automatic publication or promises of background monitoring are installed.

## Verification and acceptance

Use fictional owned PostgreSQL and current real service/route paths. No production
credentials, customer records, new metered calls or external notifications.

1. Units: strict commands/DTOs, weekly summary/size limits, Monday/time-zone and
   overnight/DST boundaries, complete/partial/no-change/exhausted results, separate
   alternatives, attributed diagnostics, canonical restrictions and fairness.
2. SQL/API: Owner/session/company isolation; missing schema/disabled feature;
   exact full-week writes in both modes; preserve protected/manual/foreign rows;
   worsened/replacement-only exhausted rebuilds remain inspection-only; direct
   apply without full-review receipt; wrong digest/subsets/forged terms;
   knowledge/context/time races; duplicate and
   conflicting comparison/apply/decline; concurrent changes and first-lock order;
   transaction failures/trigger suppression; no publication/notification deltas;
   current episodes/source/receipt custody; uncertain reply and recovery.
3. Limits: admitted large fixtures terminate within the envelope, yield to an
   unrelated request, honor abort during source/search/writes, reject overflow
   before source projection and never claim universal infeasibility.
4. Claude UI: exact plan review, explicit destructive rebuild mode, remaining
   gaps/exclusions, decline, approval digest, uncertain-save recovery, mobile,
   keyboard/focus and revocation retirement through the combined real API.
5. Run impacted generation/day/knowledge regressions, canonical migration/bootstrap
   guards, typecheck/lint and build. Record exact source, failed and passed evidence.
   Fresh code review required. Broader full release/browser checks run once the
   exact UI/backend candidate is assembled; hosted acceptance is separate.

Done for this backend slice: real authorized API can compare a joint week, return
the complete immutable review, decline without schedule changes, save the exact
approved set once and recover/verify it, with evidence for all controls above.
Actual-model intelligence scores remain null until separately enrolled native
transcripts and independent semantic assessment exist.

Builder check on November16 raised rebuild-regression admission and proof of
the full-review path. The conservative Codex choices above resolve both without
changing Jose's target or asking him to design the API. A subsequent plan/code
review must verify their implementation rather than assuming the planner or
digest alone enforces them.

## Ownership, rollback and remaining gates

Codex owns backend/schema/shared wire validators and deterministic verification.
Claude owns screens and browser UX; supply a separate exact endpoint/DTO contract
after backend design approval and implementation. Do not edit Claude's checkout.
The existing shared-development integrator must reconcile current collab/source
inventory before assembly; no main/production action is authorized here.

Add a default-off weekly feature flag. Feature-off denies new comparison and
mutation while an authenticated minimal receipt recovery remains available behind
the parent advisor/Owner gate. Keep additive schema/receipts on rollback; disable
weekly writes before deploying older code. Do not drop or reorder migrations.
Runtime operators must verify exact environment/flag/source and original receipt
custody before enabling the combined development workflow.

Other program work remains: all business record domain designs/readers (both
imports and actual named connectors), incident/cross-domain judgment, wider
outcome tracking, actual-model50-case qualification, independent assessment and
combined hosted development acceptance. None is completed by this document.

## November16 implementation assurance addendum

The fresh review found8 ordinary-use defects. Codex's fixes retain the approved
business authority/limits: receipt-backed parent comparisons do not consume the
200 temporary-operation slots; summaries are regenerated after exact validation
and pruned to11000UTF-8 bytes to leave the model envelope within12KiB, with full
128KiB review rechecked. Display truncation preserves Unicode scalar boundaries.
Weekly-derived turns stay out of reusable history; their original guarded
request remains the recovery path. Model-origin context binds the initially
admitted memory projection and its earliest local-day/decision/expiry transition.
Recovery coverage retains original INCLUDED locations and labels scope changes.
Coverage regression uses an ordered per-location interval sweep with cancellation
checks. Unadmitted raw sources produce a content-free idempotent historical
INPUT_LIMIT outcome with no source hash, options or measurements; the model
cannot treat it as current evidence, and new explicit comparisons re-evaluate
inputs. All failed/passed regressions are retained; these are technical repairs,
not new staffing policy, spending or deployment authorization.
