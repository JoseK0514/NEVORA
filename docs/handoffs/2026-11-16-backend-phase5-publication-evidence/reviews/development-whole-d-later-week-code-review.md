# Whole Phase D later-week fixture

Reviewed the pending insert and href-only readiness check against dacd40978. Code quality WATCH. Recommendation REQUEST_CHANGES.

**MEDIUM** — scripts/phase-d-browser-qa.mjs:116 treats any visible link to the September 28 period as evidence of a successful adjacent-week read. src/components/employee-b/time-b.tsx:152 emits the same href when the read is unavailable. The width assertion at driver line 138 also accepts that link. A week-specific API regression can therefore pass this case. Keep the href and require the same link’s accessible name to include the seeded one shift and eight hours. This distinguishes the successful response from the retry link. Remaining blockers consist solely of this fixture witness.

CRITICAL, HIGH and LOW each have zero findings. The September 29 entry is a separate closed punch outside the September 21–27 interval. The selected-period report, export and manager revision commands remain bounded to their original dates. The seed runs before browser iteration and inserts no revision. The Hours cards endpoint passes the requested start and end to readTimecards. No production file changed.

Applied previously loaded programming and remove-ai-slops perspectives. The readiness check produces false confidence under both perspectives until it distinguishes the real populated row. The fixture itself is relevant. The original later-week geometry failure is recorded in development-publication/whole-d-local-1/report.json. No tests were run.

## Corrected pending diff

Verified the follow-up at scripts/phase-d-browser-qa.mjs:116. The witness now waits for the accessible link name ending in “1 shift, 8 h” and asserts that same link’s exact September 28–October 4 href. The populated WeekRowB constructs that suffix from the actual count and recorded time. The unavailable row cannot satisfy it. The original MEDIUM finding is resolved. Final code quality CLEAR. Recommendation APPROVE. No open findings or blockers. Runtime replay remains separate.
