# Phase D Insights assertions after role-denial recovery

Reviewed scripts/phase-d-browser-qa.mjs lines 287–314, src/components/reports.tsx and the owning card and print renderers. Inspected whole-d-local-8/recovery-failure.png. The screenshot shows the September 21–27 range, eight recorded hours, one Time off figure of zero, both unavailable attendance explanations and the one-day chart explanation.

**HIGH.** At driver line 290 the screen list of daily values exists only after two dates have recorded time (reports.tsx:308–319). The fixture provides one such day. Require the visible “Not enough data yet” title and its two-day explanation, absence of a chart and absence of a false no-recorded-time message. Preserve the 8-hour selected-week labor assertion. The print report still publishes the actual date and amount in #report-chart ul[aria-label="Recorded time by day"] li (reports.tsx:97–115,193–200). During print verify September 22 accounts for eight hours; distinguish that from a generic 8-hour total.

**HIGH.** At line 293 the exact-three-values assertion cannot pass this fixture. OW-026 omits unavailable late/coverage figures. Time off is always present and equals 0 here. Validate shown dt/dd pairs and absent unavailable metrics against the protected source for this period. Require exactly one .c-ins__reason with the actual unavailable reasons. For this fixture the screenshot reads “Some clock-ins couldn’t be compared with the schedule. No cover requests this period.” Source is reports.tsx:276–306. Keep the screen figures numeric and the print unpublished-plan status.

**MEDIUM.** Line 290 checks the absence of an unused .c-ins__aside. The rendered header slot is .c-card__head > .c-card__aside (src/components/corp/corp.tsx:59–65). Check that slot under #ins-days for the no-duplicate-total assertion.

**LOW.** The geometry loop tests document overflow at seven widths. The keyboard step proves the First day input is focused, then presses Tab without checking resulting focus. Those existing checks alone do not measure 44px hit areas or prove traversal. Distinguish these outcomes in reporting.

No CRITICAL findings. No further copy or locator mismatches identified in the custom form, CSV menu, print heading/definitions and screen restore, offline retirement, report 403 and restricted Lead cases. Their current ownership is reports.tsx:150–164,219–230,435–443,464–504 and reports-corp.css:2–7. The protected API and printed source can verify exact fixture values separately from screen charts. No suite was run.

The previously loaded programming and remove-ai-slops perspectives found that the unused negative aside selector can pass without verifying the intended behavior. Code quality BLOCK. Recommendation REQUEST_CHANGES. Blockers are the two incompatible fixture assertions and the missing duplicate-total witness.

## Pending correction reviewed

The driver now checks the actual card-header aside and single-day explanation, excludes the false zero-data/chart state, and verifies the normalized Tuesday September 22 eight-hour entry in the print report. The independent protected API probe requires 200, the exact date range, eight hours, an unavailable attendance comparison with no known late punches, and no observed cover requests. The rendered dt/dd list and both reasons are checked exactly. The post-Tab assertion now verifies foreground focus within the visible custom period form while allowing native date input segments. It makes no target-size claim.

All earlier findings are resolved for this scope. Final code quality CLEAR. Recommendation APPROVE. Blockers none. No replay was run by this reviewer.
