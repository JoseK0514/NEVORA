# Wave A: set aside for Codex (joint testing)

Phase 3.5 Wave A rebuilt these pages on the kit without touching server code. Each item below needs server or data work before it is fully done, so it waits for joint testing with Codex. Today's server behaviour is unchanged.

## Contracts (reads the UI would use)

| # | Page | What the UI needs | Today | Contract |
|---|---|---|---|---|
| C1 | Time-off list, Approved and Declined | Who decided each request and when | `listTeamTimeOffRequests()` returns no reviewer or decision time (the employee read already does, since d462f54) | Add `reviewerName?: string` and `reviewedAt?: string` (ISO) to each row, the same shape as `listEmployeeTimeOffRequests`. The UI will add "Approved by Name · Oct 2" under each row. |
| C2 | Coverage, "What it needs" | Need counts as numbers, not sentences | `coverage-repair.server.ts:36-37` builds labels such as "2 employees missing" and "Cashier: 1 missing" | Add `count: number` (and keep `positionName` on POSITION targets). The UI words it ("2 more people needed"). Until then `needLabel()` in `coverage/page.tsx` rewrites the two known shapes and shows any other label as is. |
| C3 | Copy-week receipt | Which shift each row was | `CopyOutcome` has `sourceId`, status and a reason code only | Add `employeeName`, `date`, `startTime`, `endTime`, `locationName` per row. The receipt would list "Not copied: Ana, Tue Oct 20, 8:00 AM – 4:00 PM, the person can't work then" instead of ids. |
| C4 | Coverage candidates | Hours as minutes | `scheduledHours`, `targetHours`, `hoursNeeded` are decimal hours | Fine as is; the UI converts with `durationText`. Listed so a change of unit is coordinated. |

## Joint tests (the real outcome of each submission)

The UI side (before, pending, failure with the request blocked, double tap, slow network) is tested here on fictional local data. What the server saves, sends and returns is joint testing:

- Add shift, Save replacement (coverage repair), Edit shift (Save changes), Delete shift
- Copy week retry from the receipt (`ScheduleCopyForm`, shared with Schedule and Templates)
- Time off: Approve and Decline from the list
- Shift requests: Approve and Decline (swap, coverage, Unable to work), Close coverage request
- Team member: Save details, Save scheduling profile, Save operational review (Owner)
- New employee: Add employee
- Clocker PIN: Save PIN and Reset PIN (needs the PIN key, which the local preview does not have: the page shows "PIN setup is unavailable")
- Swap: Send swap request, Offer for coverage
- Unable to work: Send report

## Data the local preview can't produce

- **Swap, "Choose a shift" state.** No fictional employee has a shift another person may swap into (the swap rules refuse every target, or the deadline for changes has passed), so every swap page shows "No shifts to swap". The choose, compare and send states are covered by unit renders only until a fixture with a swappable pair exists.
- **Clocker PIN form.** The preview has no PIN key, so only the "PIN setup is unavailable" state renders in the browser.
- **A real Copy-week receipt.** Needs a copy to run; the "outcome not confirmed" and "not found" states render locally.

## Words that need Jose (left as they were)

- Operational rules on Team member detail: "Scheduled projections are not worked time, proof of breaks taken, final overtime pay or legal certification…" (legal wording).
- Team member status hint: "Deactivation signs this employee out immediately. Reactivation requires a fresh sign-in. History is preserved." (unchanged).
