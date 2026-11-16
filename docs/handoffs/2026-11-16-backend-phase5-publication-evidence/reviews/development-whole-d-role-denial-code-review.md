# Whole Phase D role-denial adaptation

Reviewed the pending denial changes against 1fc9cac1d. Code quality WATCH. Recommendation REQUEST_CHANGES.

**MEDIUM** — scripts/scoped-navigation-browser-check.mjs:136 and scripts/phase-d-browser-qa.mjs:312 use HTTP 403 alone as evidence of report-role refusal. src/app/api/reports/route.ts:8–15 runs admission before session/role checks. src/lib/time-corrections/http.server.ts:69–83 also returns 403 for intent, origin, cross-site and JSON errors. Assert the existing X-Nevora-Failure response header equals access_denied for both the downgraded Employee and Lead. This is the sole blocker.

No CRITICAL, HIGH or LOW findings. The new reason and Open Time action match the restricted Insights page. The role-change test still intercepts the actual destination request, changes the database role, triggers storage recovery, verifies retired source content and employee shell, follows the link to ready Hours and restores management access in finally. The diagnostic classifier only accepts actual-role-redirect and cannot exempt the renamed case.

Whole-d-local-7/report.json records 35 passed checks, explicit-source-recovery passed and actual-role-redirect timed out on 1fc9cac1d. No new suite was run during this review. The previously loaded programming and remove-ai-slops perspectives identified the under-specific role-refusal witness above.

## Final follow-up

Verified both corrected witnesses in scripts/scoped-navigation-browser-check.mjs:135 and scripts/phase-d-browser-qa.mjs:312. Both now require 403, the access_denied failure header and the exact unavailable body. This excludes the distinct admission refusals. The MEDIUM finding is resolved. Final code quality CLEAR. Recommendation APPROVE. Blockers none. No runtime test was executed during this follow-up.
