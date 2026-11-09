# Device alerts independent setup-lifetime review — 7ddf3771

Candidate: `7ddf37715ff89ba4b397cf22ec8b67ae5d53de2e`. Delta: `69ae8e8c..7ddf3771`, one integration test fixture file. Overall base remains059f4ac2; production application remains72b1c192. Previous reports and failing runtime records preserved.

- codeQualityStatus: **WATCH**
- recommendation: **APPROVE** scoped test-fixture correction for local verification.
- Runtime disposition: **PENDING** terminal affected-recovery-02; historical recovery01 NO-GO is not erased.
- blockers: no new code blocker established. Full feature acceptance remains subject to actual affected-suite completion and inherited material conditions.

## CRITICAL / HIGH
No newly established critical or high-severity defect in this one-file test-only delta. QA-OWN-3 is retained and not closed/accepted by this code disposition.

## MEDIUM / LOW
No new actionable finding identified. This is not an assertion-relaxation fix: the previous30-second fixture hook could expire before the existing90-second application-readiness budget even began. Production deadlines and scenario checks remain intact.

## Concrete checks
Read complete diff for `src/test/integration/employee-mobile-communications-review.integration.ts:23–50` and existing owned factory lifecycle. The120-second AbortController is passed to createOwnedNextApp, whose abort listener closes owned resources and whose setup catch awaits close. The outer fixture checks cancellation after factory, seed, fixture proof, schedule writes, publication/audience and final due-notice work. On failure it awaits assigned app.close; if cleanup fails, AggregateError retains original and cleanup errors. The timer is cleared in finally. The180-second hook is limited to this fixture, allowing cancellation and cleanup grace; global30-second hook default, scenario600-second checks, native waits and authentication/read lifetimes are unchanged.

`git diff --check 69ae8e8c..7ddf3771` passes; clean checkout observed. No new unit execution claimed because the only changed behavior is owned setup lifetime and independent QA is executing the relevant six-suite integration run. No competing heavy runtime or application/test/config modifications by reviewer.

## Skill perspectives
Programming and remove-ai-slops criteria previously loaded and reapplied. Explicit resource ownership, finite cancellation and awaited cleanup are warranted by the reproduced orphaned-runtime timeout. No deletion-only test, prose pinning, needless production parsing, untyped new API, or speculative abstraction added. Extra cancellation checks occur at awaited ownership boundaries, not arbitrary redundant validation. Failure aggregation preserves evidence instead of suppressing it.

## Acceptance boundary
Inspect exact-source terminal affected-recovery-02 and owned-process cleanup before claiming recovery. Original recovery01 was12failed/11passed/4skipped and remains archived. Earlier original combined-gate and broader default16 failures remain visible; do not present this fixture approval as universal runtime acceptance. Retain CR-2 browser execution gate until demonstrated, QA-OWN-3, CalendarQA-CAL1, Communications conditions, process-observation instability and native/AT/provider/hosted/release limits. Separate terminal evidence addendum will be needed.
