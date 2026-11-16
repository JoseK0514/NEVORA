## WP4 report: Timecards, Time corrections, Insights, Owner and Manager notifications, one duration format

**Patch:** `/private/tmp/claude-501/-Users-josek0514--claude-spares-spare-23XJTe/d762c6df-53eb-43b4-836f-475a53cde009/scratchpad/patches/wp4.patch` (reverse-apply check passes). Nothing committed. All paths below are under the worktree `/private/tmp/claude-501/-Users-josek0514--claude-spares-spare-23XJTe/d762c6df-53eb-43b4-836f-475a53cde009/scratchpad/wt/wp4`.

```
 .../corrections/new/[employeeId]/page.tsx          |  4 +-
 src/app/app/timecards/page.test.tsx                | 12 ++-
 src/app/app/timecards/page.tsx                     | 11 ++-
 src/components/manager-time-corrections.tsx        |  3 +-
 src/components/notification-inbox.tsx              | 45 +++++------
 src/components/reports.tsx                         | 16 ++--
 src/components/timecards.batch.test.tsx            | 80 +++++++++++++++----
 src/components/timecards.tsx                       | 90 +++++++++++++++-------
 src/lib/duration-format.test.ts                    | 86 +++++++++++++++++++++ (new)
 src/lib/duration-format.ts                         | 66 ++++++++++++++--
 src/lib/notification-inbox-view.test.ts            | 16 +++-
 src/lib/notification-inbox-view.ts                 | 19 ++++-
 .../delegated-corrections-browser.integration.ts   |  2 +-
 13 files changed, 359 insertions(+), 91 deletions(-)
```

### Findings

| ID | Status | What changed |
|---|---|---|
| BR-1 | Done in scope | `src/lib/duration-format.ts` now documents one rule per use and Timecards and Insights read it. Row figure `32 h 12` / `2 h` / `45 min`; headline total `383 h` (nearest hour); sentence and exact totals `382 h 51 min`. Added `minutesFromNanoseconds`, `dateRangeText`, `timeRangeText`, `relativeTimeText`, with unit tests. |
| BR-2 | Done | Helper line added in the sheet, the period card, the phone list and the batch review. Phone tile reads "Approved n/N" until all are approved, then "Finalized n/N". Period card counts and title name the two steps. |
| AR-11 | Done, wording differs from the brief | One "Next step" row above the list when a closed period is fully finalized. The page passes `payrollStep` from the existing `readPayrollCapabilities` helper. |
| Sheet | Done | "Request time correction" → "Fix this time". A card with no hours offers "Approve with no hours"; behaviour unchanged. |
| OW-014 | Done | Time corrections chip "Pending" → "Waiting"; Timecards manager chip "Correction awaiting review" → "Correction waiting". |
| BR-6 | Partly | The manager list payload carries only a kind label, time and read state, so the five rows get the most specific true title, not counts or names. See "For Codex". |
| OW-019 | Done | The "Try again." body line is gone when online; the button remains. |
| MG-008 | Done | The manager empty state no longer promises requests; it points to Things to do. |
| RA-16 | Skipped (server) | The notifications snapshot has no workplace time zone. `relativeTimeText` takes a zone, so it is one argument once the snapshot carries it. |
| RA-25 | Done | Delegated correction page has metadata `Fix time` (renders "Fix time · NEVORA"); heading renamed to match. |
| Insights tiles | Partly | Kept the grey dash in the figure slot and shortened the reason line. |

### Things you should know before Jose reviews

- **Timecards and Insights count the same minutes.** Insights sums the same per-card recorded nanoseconds as Timecards, and both include breaks and count open clock-ins up to the moment of the read. The "382 h 51 min" against "382 h 55 min" in the inspection is two reads taken minutes apart with people clocked in, so I added no "includes breaks" label.
- **"383 h" against "382 h" was rounding.** More rounds to the nearest hour and the Timecards tile floored. The tile now uses `durationTotal` (nearest), so it agrees with More. More still does its own `Math.round` in `src/app/app/more/page.tsx:86`, which is outside my scope; it should call `durationTotal`.
- **`durationTotal` now prints minutes under an hour** ("45 min" where it printed "1 h"). Home's Scheduled figure (`src/components/owner-b/home-b.tsx:57`) reads it, so a week with under an hour scheduled changes there. Zero still reads "0 h".
- **"Fix this time" starts a request, not a fix.** The delegated form sends a correction that a different authorized person must approve; the viewer is not the approver, as the inspection assumed. I used the label you specified and left the page's sub line saying who reviews. Jose may prefer a label that says "ask".
- **AR-11 title is "Prepare payroll", not "Prepare payroll for {period}".** `/app/payroll/prepare` opens the current pay period, which need not be the finalized week. The period is named in the second line instead. With payroll switched off, the row is "Download hours for payroll", linking to Time exports for that period.
- **AR-11 adds one read per page load.** With payroll enabled, the manager Timecards page now calls `readPayrollCapabilities` once; a failure falls back to the Time exports row.
- **Insights: "Not enough clock-ins yet" would be untrue.** The dash means some clock-ins could not be compared with the schedule, not that there are too few. Words in the figure slot would also wrap at 20px. The reason line now uses the printed report's sentence.
- **"Finalize period" finalizes one person's card.** I left the label because `scripts/phase-d-browser-qa.mjs` clicks it by name and scripts are off limits. "Finalize timecard" would pair better with "Approve timecard".
- **Phone has no prompt for step 2.** After every card is approved, the only ways to finalize are each card's sheet or Select, then "Finalize selected". The helper line and the tile now say the step exists; a "Finalize N approved" prompt would be a small follow-up.

### Strings changed or added (English only; these surfaces are not bilingual)

`src/components/timecards.tsx`
- :466 "Request time correction" → "Fix this time"
- :477 "Approve timecard" → "Approve with no hours" (only when the card has no recorded time)
- :413, shown at :478, :546, :582, :637, :706 (new) "Approve each timecard, then finalize the week to lock it for payroll." ("period" replaces "week" for a non-7-day range)
- :103 chip "Correction awaiting review" → "Correction waiting"
- :531 (new) "All {n} finalized"
- :545 "{n} awaiting approval · {n} awaiting finalization" → "{n} to approve · {n} to finalize"
- :622 tile "Approved" → "Approved", then "Finalized" once every card is approved
- :553–556 (new) "Prepare payroll" / "All done. Your Owner runs payroll." / "Download hours for payroll", each with "Every timecard for {Nov 2 – 8} is finalized."
- :644 phone sub line "2 h 30 breaks" → "2 h 30 min breaks"
- Figures: breaks "2 h 00" → "2 h"; day rows "8 h 00" → "8 h"; Select-mode rows "32 h 12 min" → "32 h 12"; phone Recorded tile "382 h" → "383 h"; a one-day period "Nov 9 – 9" → "Nov 9"

`src/app/app/timecards/corrections/new/[employeeId]/page.tsx`
- :13 new tab title "Fix time"; :18 nav title and heading "Request time correction" → "Fix time"

`src/components/manager-time-corrections.tsx`
- :90 "Pending" → "Waiting"

`src/lib/notification-inbox-view.ts`
- :11 "Operations need review" → "Things to do are waiting for you", with grey line "Open shifts, requests or missing availability · {when}"
- Rows that carry dates (employee rows only today) add "Week of Nov 9 – 15" or "Nov 30 – Dec 2" before the time

`src/components/notification-inbox.tsx`
- :81 and :150 body "Try again." removed when online
- :104–106 "No notifications yet" / "You’ll see requests and schedule changes here." → "Nothing new" / "Requests from your team are in Things to do." plus link "Open Things to do" (`/app/inbox`)

`src/components/reports.tsx`
- :284 "Late clock-ins show once every clock-in this period can be checked against the schedule." → "Some clock-ins couldn’t be compared with the schedule."

### Tests

- `npx eslint` on all 13 changed files: clean.
- `npx vitest run` on 18 files, all passing: `duration-format` (new), `duration-text`, `timecards.batch` (59, including 7 new), `timecards.employee-unchanged`, `timecards/page` (11, including 5 new), `operational-page-composition`, `report-lifetime`, `reports-periods`, `reports/page`, `notification-inbox-view` (2 new), `notification-labels`, `notification-inbox.prefetch`, `manager-time-corrections`, `signature/hex-guard`, `notifications/open/route`, `employee-mobile/notifications-list`, `kit/kit`, `owner-home-corp`.
- Existing expectations edited: `timecards.batch.test.tsx` ("Approve with no hours" on zero-time fixtures, "1 to approve · 1 to finalize") and one link name in `src/test/integration/delegated-corrections-browser.integration.ts`.
- Not run: `tsc`, the full suite, the browser integration test, any browser check. `notification-inbox.tsx` has no render test, so it is only linted.

### For Codex

1. **Notification list payload (BR-6).** `readPortalNotificationList` returns only `label`, `at`, `href`, `reviewState`, `actionState` for Owners and Managers. To write "3 open shifts need cover today" or "James Ortiz asked for time off, Nov 30 to Dec 2" the row needs: the stored event type or title ("Coverage needs attention" against "Requests need review"), counts per item type for a manager summary, the person's name, the `subject` dates (employee rows already have them), and the outcome for request rows.
2. **Workplace time zone in the notifications snapshot (RA-16).** Add `timeZone` to the `notifications` kind of `EmployeeViewSnapshot`.
3. **Pay period for the Timecards next step (AR-11).** If the row should name the pay period, or deep-link Payroll to it, `/app/payroll/prepare` needs a period parameter or the page needs the current pay period.

### Check in the browser

- Timecards at 1440 and 390 for a fully finalized past week: the Next step card above the period card or list, with a green check on the phone.
- Timecard sheet: the grey helper line under the buttons, and both button labels on a zero-time card.
- Desktop Breaks column and Total row now mix "2 h", "1 h 30" and "382 h 51 min"; confirm the right alignment still reads well.
- Phone tile switching from "Approved 12/12" to "Finalized 0/12" after the last approval.
- Notifications at 1440 and 390: the two-line row fits, and the empty state link sits correctly in the card.
- The "Fix time" page heading and tab title.
