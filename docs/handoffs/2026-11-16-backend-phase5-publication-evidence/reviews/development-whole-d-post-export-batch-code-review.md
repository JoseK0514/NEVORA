# Phase D post-export batch review

Reviewed the pending driver, scoped-navigation helper and new Inbox helper against the current production components. No application files changed. Code quality WATCH. Recommendation REQUEST_CHANGES.

## Findings

**MEDIUM — scope of the unconfirmed privacy assertion.** At scripts/phase-d-browser-qa.mjs:340 the assertion claiming only four permanent links remain compares links only inside #b-todo-more. The separate check for zero private rows only covers recognized b-todo-* group IDs. A private primary row rendered in another card on the same visible screen would pass both. Preserve the earlier all-row privacy coverage by comparing the visible center.locator(primaryRows) destinations with the four public shortcuts during each unconfirmed state. The hero Home link is outside that selector. This is the sole blocker.

**LOW.** scripts/phase-d-inbox-browser-support.mjs:31 matches the expected quantity as a substring. A larger numeral ending in the anticipated quantity can satisfy the check. A boundary before the numeral makes the stated exact-quantity assertion literal. The independent member, header count and href checks are useful additional evidence.

CRITICAL and HIGH each have zero findings.

## Controls reviewed

Direction B group rows exclude duplicate trailing actions; quiet cards retain a null rendered count, and their eligible source membership is checked against the row. The independent-review actor fixture has a separate current period punch and is removed with the employee fixture. The existing Sept 21 period remains separate. The employee and manager fixture names make the independent subject distinction observable. The fresh report hold/blur, manager queue’s own immediate offline clearing, fragment-held protected read and subsequent real focus all align with the owning source. The new Clocker steps enter the actual seeded identities and retain the ledger and no-replay checks. The pending scoped-navigation change still uses one real recovery click within the original deadline. The delayed-script and known-positive offline-receipt checks now have meaningful preconditions.

The previously loaded programming and remove-ai-slops perspectives identified the under-scoped privacy assertion and substring comparison above. No suites were run for this source review. Earlier failing receipts and runtime limits remain applicable.

## Follow-up

Verified driver line 340 now checks every primary row across the visible screen against the four public destinations and checks all group-header pills for absence. The MEDIUM finding is resolved. Final code quality WATCH, recommendation APPROVE, blockers none. The LOW substring precision note remains nonblocking.
