# 13 UI Designer: Insights, Updates and Notifications

**Verdict**
Insights follows the v3 mockup's layout closely, and its chart is mathematically honest: a zero baseline, even-hour ticks and a screen-reader list of every day's value. It still reads poorly in practice. An empty period shows a scaled 0–2h grid with nothing in it, and sighted users can't read any single bar's value. Updates and Notifications use the Inbox's frame (tabs, date groups, Refresh in the page foot) but feel unfinished. Their rows give a static label instead of the state a manager needs, and the empty Notifications page is made up almost entirely of controls.

## Recommendations

1. **Give Insights an honest empty period instead of an empty scaled grid.** When every day is 0, drop the plot (or shrink it to a 48px baseline) and show one line, for example "No time recorded Oct 12 – 18". Keep the 0 h total.
   *Why:* `QAOWNER-insights-1440.png` and `-390.png` show 0h with a full 200px or 150px grid labelled 2h, 1h and 0, plus seven empty columns. The cause is that `reports.tsx:92` always draws a 2h scale (`top=Math.max(2,…)`). The spec says "Metrics with no data are hidden" (`spec.md:116`). New and quiet workspaces will see this state first.
   *Impact:* High. *Effort:* S. *Owner:* UI.

2. **Show acknowledgement progress on manager Update rows.** Put "4 of 13 acknowledged" in the trailing slot, amber while people are still outstanding and green when all have acknowledged. This is the same trailing-status pattern as the Inbox's "Waiting".
   *Why:* The manager row says "Acknowledgement required" (`employee-updates.tsx:87`), which is a fixed property of the update and the same text employees see. The detail page already computes the count (`communication-detail.tsx:79,115`), but the list read doesn't include it. The "Required" and "Optional" tabs (`:48`) also filter by type, not by what is outstanding.
   *Impact:* High. *Effort:* M. *Owner:* Backend (counts in the list read) and UI (row).

3. **Make each bar readable.** Selecting a bar (tap, hover or arrow keys) should swap the header total for that day's value, for example "Thu · 2 h 0 min", as Apple Health does. Deselecting it restores the period total.
   *Why:* The plot is `aria-hidden` and has no hover or focus (`reports.tsx:95-98`). The only ticks are 0, 1h and 2h, so the Mon (~1.5h) and Wed (~0.5h) bars in the mockup can't be read. Making the bars interactive would also justify their teal colour, since teal is reserved for actions.
   *Impact:* Medium-High. *Effort:* M. *Owner:* UI.

4. **Reduce the empty Notifications page to one calm state.** When All is 0:
   - Hide the three zero-count tabs and the search field, and show "You're all caught up" with an "Open Inbox" link.
   - Change the placeholder "Search this inbox" (`notification-inbox.tsx:76,133`) to "Search notifications". This page is not the Inbox.
   - Rename or retarget the "Requests" link. It goes to `/app/inbox?filter=requests` (`:155`), but managers have no "Requests" page.
   - Fix the desktop search field height. In `QAOWNER-notifications-1440.png` it measures about 49px, against 30px for the top-bar Search and the 2rem rule in `notifications.css`.

   *Impact:* Medium. *Effort:* S. *Owner:* UI.

5. **Use a dot, not a word, for unread Notifications.** Add a leading 8px tint dot for unread rows, as iOS Mail does. Drop the grey "Unread" and "Read" text from the row meta (`notification-inbox.tsx:33,92`), and keep "Needs action" as the one status. Add "Mark all read" to the page bar when the unread count is above 0.
   *Why:* Unread rows are only shown by a 600-weight title (`notifications.css:25`), and every read row carries the word "Read" as noise.
   *Impact:* Medium. *Effort:* S. *Owner:* UI.

6. **Make each "Hours by person" row open that person's timecard.**
   *Why:* Every row links to the same all-timecards URL (`reports.tsx:53,190`), but each row's chevron promises the person's own timecard. The timecards page only accepts `start` and `end` (`timecards/page.tsx:11`).
   *Impact:* Medium. *Effort:* M. *Owner:* Backend (`employee` parameter) and UI.

7. **Decide what "Timecards to finish" counts.** With 0h recorded, the figure still reads 13 (`QAOWNER-insights-1440.png`), because `reports.tsx:164` counts every card that isn't finalized, including empty ones. That reads as alarming and contradicts "0 of 13 people with time". Either count only cards that have time or issues, or relabel the figure "Not finalized".
   *Impact:* Medium. *Effort:* S. *Owner:* Product, then UI.

8. **Mark today's partial day on the chart.** Month is the last 30 days ending today (`reports.tsx:64`), so its last bar is an in-progress day that looks like a drop-off. Draw today's bar in a lighter tint and label it "Today".
   *Impact:* Medium. *Effort:* S. *Owner:* UI.

9. **Make the Updates phone header match Insights.** Updates is reached from More but has no "‹ More" back link. Only `reports.tsx:314` and `timecards.tsx` use `manager-more-navigation`. "Create update" is a grey pill under the subtitle (`QAOWNER-updates-390.png`), whereas Insights puts its action in the navigation bar. Use a compose icon in the navigation bar and add the back link.
   *Impact:* Low-Medium. *Effort:* S. *Owner:* UI.

10. **Stop repeating the date on Update rows.** The group header says "October 20, 2026", and then the row says "Oct 20, 2026, 2:28 AM" (`employee-updates.tsx:45,69`). Notifications already shows the time only (`notification-inbox.tsx:92`). Show the time only, and use "Today" and "Yesterday" group headers on both pages.
    *Impact:* Low. *Effort:* S. *Owner:* UI.

## What's good
- The chart's maths is honest: a 0 baseline, even-hour ticks scaled from the maximum, and no truncated axis. Every day's value is written out for screen readers (`reports.tsx:105`).
- Insights matches the mockup's structure at both widths: four figures, a 3:2 chart and people row, a Health-style phone card, and the Period list. Definitions sit in a disclosure, and Export is one menu.
- Updates and Notifications reuse the Inbox frame: a segmented control on phones, underline tabs on desktop, date-group headers, Refresh in the page foot, and a 44px Mark read hit area.

## Not checked / limits
- I had no browser. All evidence comes from the current screenshots, the earlier QA folder and the code.
- The current build shows only near-empty data: Insights at 0h, 0 notifications and 1 update. I didn't see a populated notification list, the 30-bar Month chart, long names, or large text in this build. For the chart with data, I relied on the mockup PNGs.
- I didn't check dark mode. Note that the desktop blocks hard-code 36, 14 and 11 hex colours in `insights.css`, `notifications.css` and `updates.css`, while the phone blocks use tokens.
- Employee and Lead versions of these pages are out of scope.
