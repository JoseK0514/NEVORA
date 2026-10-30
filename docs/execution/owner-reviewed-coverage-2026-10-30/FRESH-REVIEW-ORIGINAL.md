# Original fresh whole-slice review

Date: 2026-10-30. Reviewer: fresh read-only reviewer, independent of the executor. This is the one original report; severity and verdict below are not an author regrade.

Checkout: `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/owner-ai-reviewed-drafts-20261030`.
Reviewed range: `8d9487362d7f2295dc99f173ebe3977e049719b7..d7b2a6e4319ca529698cd91097282c76bce95329`. Application candidate: `e3497ad2967ee632f75dc9532e7cb0cd72a577db`. HEAD matched the requested candidate; tracked working tree was clean before and after review. No source/index/HEAD/branch edits, subagents, provider calls, operational writes, remote actions, or broad runners were used.

## Scope and evidence

Read root AGENTS.md, the accepted design and implementation plan, durable execution ledger/rulings, EVIDENCE.json and handoff, package scripts, the entire bounded application/test/schema delta, and relevant canonical scheduling, authority, source projection, controller and route dependencies. Applied repository executive, CTO, CISO, governance and technical-assurance guidance and Superpowers review guidance.

Independently verified all six indexed gate artifact SHA-256 hashes. Their recorded results are: default 10,373 passed / 801 pending / 0 failed; Owner SQL 68 passed; generation SQL 177 passed; four browser specs passed; lint and TypeScript recorded exit 0. These are inspected author-run results, not reviewer reruns. Inspected the real browser journey source and the four cited review/progress captures, including 320px and 200% text. The captures preserve the existing Owner styling and show reflow. Fixed shell navigation appearing inside tall element screenshots does not alone establish an interaction defect.

Ran one small, network-free Node probe of the actual `coverageAction` function using an in-memory store/source, documented under I2. Also verified the receipt transaction's statement tail from source. No fresh SQL/browser run was performed. The existing browser evidence covers comparison keyboard discovery and Back focus; the new review/acknowledge/save sequence itself is predominantly pointer-driven, so it does not establish a complete keyboard-only journey.

## Strengths

- Explicit provider-independent Owner commands are separate from model tools. Review custody is scoped to workspace, Owner, original authority and session, with current admission checked around private reads and writes.
- The exact stored set is validated together with the full scheduling ledger and automatic capacity/exclusion rules. Canonical generation locks/source guards and canonical draft before/after checks prevent substitution, partial assignment writes and unintended publication/outbox work.
- Original operation replay precedes current-source/expiry-dependent validation. Existing SQL and real dropped-response browser evidence meaningfully exercise concurrent saves, recovery, authority retirement and assignment episodes.
- Review, immutable save receipt and fresh planning progress are separate concepts. The UI explicitly distinguishes publication, acceptance, attendance and business resolution. Finite private state and epoch fencing protect late responses.

## Findings

### Critical

None found in the bounded delta.

### Important — I1: Receipt no-op commits business rows without recoverable custody

**Location:** `src/lib/owner-advisor/coverage-actions.server.ts:101` (transaction boundary at 96–105).

**Trigger:** The receipt UPDATE affects zero rows without raising an exception, for example a `BEFORE UPDATE` trigger on `owner_advisor_coverage_reviews` returning NULL. This is the explicitly requested silent-persistence-failure boundary, distinct from an exception.

**Effect:** Canonical draft inserts and their after-state checks have already executed. The only following statements are Owner guards; no statement asserts that the receipt/operation/created assignment set actually settled. PostgreSQL can therefore commit the assignments while leaving the review unapplied and receipt NULL. The post-commit read then throws `unavailable`, which cannot roll back those rows. Replaying the original operation cannot recover a receipt and normally encounters the changed scheduling-source conflict. The promised save-plus-receipt atomic outcome is broken.

**Evidence/proof level:** Verified source/control-flow defect under the stated zero-row fault, not a claim that such a suppressing trigger is installed today. The existing integration test at `coverage-actions.integration.ts:114` injects a raising receipt trigger, which proves exception rollback but not a silent no-op. The canonical scheduling post-state guard runs before this new receipt UPDATE and cannot cover it. A source probe confirmed no RETURNING/post-state assertion and only `ownerGuards` before commit. No new PostgreSQL reproduction was run in this review.

**Required repair:** Assert exactly one matching completed operation, command hash, receipt and complete created-assignment set inside the same transaction after receipt DML (or perform asserted DML atomically). Add the narrow real SQL regression with a return-NULL receipt trigger and require zero new schedules/shifts and no receipt after failure. Do not rely on a check after transaction commit.

### Important — I2: Progress omits the saved assignment's parent location/week

**Location:** `src/lib/owner-advisor/coverage-actions.server.ts:49`–54; raw shift custody is captured at line 101.

**Trigger:** A saved schedule retains its ID but its location or week changes. The current base schema permits these updates; `db/migrations/0010_shift_coverage_automation.sql:45`–49 explicitly increments child terms revisions for them. The approved choice not to compare terms_revision is reasonable for publication, but requires comparing all material parent terms separately.

**Effect:** Receipt custody stores raw shifts, which contain schedule_id but no location. Presence compares shift fields and episode, then merely checks that a current ledger row with the ID is not released. It never compares that row's current location to the reviewed location, nor the parent week to the reviewed week. A North assignment moved with its parent to South can be reported as an exact retained North assignment and counted as published, although the old location in the review is no longer staffed by it. This makes the positive progress claim false.

**Evidence/proof level:** Reproduced through the actual `coverageAction` implementation with an in-memory store, not a live SQL database. The review assignment had `locationId:"north"`; the identical shift/episode retained `schedule_id:"schedule"`; the current parent was `{id:"schedule", location_id:"south", week_start:"2026-10-19", status:"PUBLISHED"}`. Actual result:

```json
{"reviewLocation":"north","currentScheduleLocation":"south","progress":{"state":"current","assignmentsPresent":1,"assignmentsTotal":1,"publishedAssignments":1,"scopeComplete":false}}
```

This probe intentionally had unconfigured coverage, which produced partial scope; that warning did not prevent the false exact-presence/publication claim. Source inspection confirms the same comparison occurs with configured coverage. No current UI operation for reparenting a schedule is asserted; the finding concerns current canonical data truth at the read boundary.

**Required repair:** Persist or reconstruct the saved location/week association per created assignment and compare it against the current canonical parent before counting presence/publication. Keep the valid publication and edit-away/edit-back rulings intact. Add a regression that changes a parent location (and week) while retaining shift ID/episode; progress must be changed and the moved assignment must not count as the exact reviewed assignment.

### Minor — M1: Comparison disclosures are not tied to the comparison's observation

**Location:** `src/components/owner-advisor/advisor.tsx:170`–171 and `src/components/owner-advisor/coverage-plans.tsx:18`; comparison answer text originates at `src/lib/owner-advisor/service.server.ts:86`–88.

**Trigger/effect:** After a successful draft save, the unchanged latest-answer paragraph still says “Nothing has been saved or published” above the updated comparison warning. If the Owner then follows the warning and compares day plans again, `afterSave` remains true solely because the coverage panel still holds a receipt; even the newly observed comparison is labeled “This comparison predates your save.” Conversely, beginning another review clears the receipt flag and can restore the unsaved wording on an old comparison. These contradictory instructions make it harder to know which evidence is current, although server source fencing still protects writes.

**Evidence/proof level:** Verified render/data-flow inspection; no new browser reproduction. The boolean has no sourceVersion, date or observation-time relationship to the displayed answer.

**Suggested repair:** Associate stale-result wording with the actual saved comparison/observation and qualify or replace the read-only answer text after a save. A freshly completed comparison must not inherit a stale warning merely because another saved receipt remains visible.

## Review-focus assessment

1. Original Owner/session/company binding and revoked-scope rejection are present in the changed path; no bypass found. Private responses still require final observation checks.
2. Normal concurrency/replay and exception rollback are supported by canonical guards and existing evidence; I1 leaves a silent receipt-write atomicity gap.
3. Complete source hashing, generation locks and whole-set legality validation reject changed qualifications, adjacent commitments, rules and publication; no regeneration path found.
4. Pause/late-response fencing and volatile original-operation preservation are present. Authority changes intentionally retire old custody. No additional lifecycle security defect established.
5. Episode checks and current release/publication distinctions are present, but I2 misses parent material identity.

## Declined to judge

- Correctness/security of the entire inherited AI-owner lineage beyond changed seams: expressly outside the bounded base-to-head review; later integration must review inherited work separately.
- Hosted CI/Preview, production migration/rollback operation, real provider connectivity, operational customer behavior and large-company performance beyond the existing bounded limits: no such environment/action was authorized or exercised; local artifacts are not certification of those behaviors.
- Physical-device and screen-reader certification: explicitly excluded from accepted local acceptance; browser captures and automated accessibility checks do not establish it.
- Long-term retention/cleanup of expired private review rows: per-row bounds and authority isolation were reviewed, but no retention target/policy is specified; this report does not certify a retention policy.

## Original verdict

**Ready to merge: No — fixes required.** Two Important defects remain: silent receipt-write failure can violate atomic save/recovery, and progress can positively misidentify a moved assignment. One Minor disclosure issue also remains. No Critical finding was established. Engineering/security/governance position: block local acceptance on I1 and I2; preserve this original verdict, let the executor record any regrade and one bounded regression-driven repair, and do not invent a second independent PASS. Shared development reconciliation and any hosted/release authorization remain separate gates regardless of those repairs.
