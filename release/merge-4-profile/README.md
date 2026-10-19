# Profile and latest coordinator — combined candidate

Candidate `8e18a958dfbfd1e5c6d6da44396d82c95d4e18e7` (application checkpoint `0bdaa4d`) integrates coordinator227150b, backendda2a4e5 and verified-zero Profileea58610 (appcaef395). [Exact provenance](candidate.json). All five Mac zero reports and the final IS-16 focus recheck are retained under [readiness](readiness/ROUND.md); the app did not change in the report-only handoff.

Separate authorized candidate commit4ff37e5 performs and parses the management Profile server read, passes ready data as `initial`, and falls back to null on failure. It does not replace the client’s protected verification read. Backendda2a4e5 makes the two source-approved alert label corrections;14 existing server/route tests pass and topic ids/delivery policy remain unchanged. No additional UI changes are made outside the original three-item authorization.

Earlier exact checkpoint8351538 passes locked install, TypeScript, lint, full suite7352/0, build and production absence. Its unchanged checker passes84/164 cells;80 fail the measured text floor. Those results are labeled8351538 and do not stand in for the newer candidate. Fresh23fcdc3 checks establish settled Home/Inbox and the server-initial-read geometry; the later227150b delta changes only Availability’s failure-alert order and shared focus-ring offset. Its full gates/checks are recorded separately on0bdaa4d.

Wave A remains at the expressly authorizedc05e0c7. Source7679133 failed onST-WA-8;7651490 failed onST-WA-9/10;7f75dc4 fixes those targeted cases but fails onST-WA-11 (pending width clips after narrowing). No newer Wave A SHA has a completed zero exit, so it is not merged. [Current Wave A finding](../../p35-wave-a/round-2-7f75dc4/stability.md).

Validation complete: npmci, TypeScript, lint, full serial7352/0 (801 skipped,55 pending), build and2298-artifact/5-marker absence pass. Focused final Coverage6/6, TypeScript and focused lint pass. Checker92/180 passes;88 failures are text floor,0 nontext gate failures. Combined confirmed P0 0 / P1 8 / P2 0, partial scope: blocked. Publication follows the first-published-remote guard. No all-six zero, deployment, device access, or production acceptance is claimed. Use DEVICE-CHECKLIST-REVIEWED.md; access waits for Jose. All fixtures are fictional and submissions are intercepted. Passwords, access files and browser storage states are excluded.

The final8e18a95 change explicitly retains the original backend `loc-1` assertion alongside Wave A’s stronger `location=loc-1` expectation. It changes only one test line; the complete application/build/config inputs match0bdaa4d. Focused Coverage6/6, TypeScript and focused lint pass on that final test delta.

Availability’s existing ST-P3-24 and IS-P3-01/02/03 are reproduced on the latest application checkpoint. Profile’s24-view/4-save integration check passes. Shared field contrast is already3.45:1 on the candidate; Wave A’s old coordinator copy measures1.413:1 and must not be confused with the merged result. All owned previews close with strict source/mirror verification and their PostgreSQL stopped; see the three preview-integrity files.

Linux WebKit runs with its bundled required libraries; host preflight is skipped because it does not see those libraries. Both engines actually launched. Application checks, assertions and timeout limits are unchanged. No device access, deployment or production acceptance.

Published at2026-10-19 20:50 UTC: codex/release-candidate8e18a95, fast-forward from0e01046; no force push. Wave Aa05f26a’s16 focused pending rechecks pass; its full zero exit remains incomplete. The shared field observation is already fixed by the coordinator’s mandatory latest CSS. All owned test/browser jobs have completed and previews are closed.
