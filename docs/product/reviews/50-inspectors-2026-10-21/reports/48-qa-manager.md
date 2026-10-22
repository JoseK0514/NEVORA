# 48 QA Tester — Manager (AUDIT-M) exploratory pass, 390 / 768 touch / 1440

**Verdict.** The parts of the Manager app I could exercise work: Schedule, Add shift, Team, Time off, Shift requests, Availability, Updates and Notifications all render without overflow at 390, 768 and 1440, and their menus close cleanly. I found one data-entry bug that will cause real mistakes: Add shift starts on Monday of the week, which is in the past by Wednesday. I also found two trust problems. An unplanned location shows up as 24-hour "open shifts", and the Schedule page fails completely when the database is slow. **Inbox, Timecards, Insights data and Home "Needs you" were not tested** (see limits).

Method: headless Playwright (Chromium) against `http://127.0.0.1:59682` as AUDIT-M. 390 used phone emulation; 768 used `hasTouch` + `isMobile`. Every non-GET request was aborted, so nothing could be saved. No Save, Approve, Decline, Publish, Mark read or Acknowledge control was clicked. Screenshots are saved as `review50/shots/qa48-*.png`.

## Recommendations

1. **Add shift should open on the day the manager is looking at, not on Monday.**
   *Steps:* On Wed Oct 21, go to Schedule (1440 or 390), then Add shift. *Actual:* Date = 10/19/2026 and the Summary says "Mon, Oct 19", two days in the past. On a phone, picking Saturday in the week strip and tapping + still gives Monday. *Expected:* Today, or the selected day. *Evidence:* `qa48-addshift-1440.png`, `qa48-addshift-390.png`. The desktop and phone links are `/app/schedule/new?week=2026-10-19` with no `date`, but the 768 link includes `&date=2026-10-21`, so the three widths behave differently. The fallback is `date = … : weekStart` in `src/app/app/schedule/new/page.tsx:101-104`. The phone day selection isn't in the URL, so it can't be passed on. *Fix:* Every Add shift entry point should pass the selected day. Fall back to today when the week contains today, and to Monday only for other weeks. **Impact High · Effort S · Owner UI.**

2. **Don't let one slow query take down the whole Schedule page.**
   *Steps:* Load `/app/schedule` at 1440 while the preview is under shared load. *Actual:* Twice in a row, after about 30 s each time, the route error page appeared ("This page could not be loaded" with Try again / Back to Home) and the HTTP status was 500. The console showed `error: canceling statement due to statement timeout`. The third load worked in 6.7 s. *Expected:* The week grid shell loads and the failing part says so. *Evidence:* `qa48-schedule-500-error-1440.png`. *Fix:* Backend should find which schedule query hits the statement timeout and give it a budget or index. UI should catch the failure per section (grid, coverage, availability) instead of in the route boundary. **Impact High · Effort M · Owner Backend + UI.**

3. **An unplanned location should not show as 24-hour open shifts every day.**
   *Actual:* The phone banner says "West Office isn't planned · Nothing scheduled this week". The same day list then shows "Open shift 12:00 AM–12:00 AM · West Office · Find Cover". The desktop grid shows "12a – 12a" in every day column, the header shows "Open shifts 21 this week", and Home shows "Open shifts today 3 · Main Office 2 · West Office 1". *Evidence:* `qa48-sched-390.png`, `qa48-schedule-1440.png`, `AUDIT-M-home-1440.png`. A manager will read this as 7 urgent gaps, but the actual task is "plan this location". *Fix:* While a location is unplanned, collapse its gaps into the single "Plan West Office" row and leave them out of the open-shift counts. Jose should confirm whether a 24-hour coverage rule is intended. **Impact Medium-High · Effort S-M · Owner Backend + Product.**

4. **The time-off request page should return to Time off when that's where the manager came from.**
   *Steps:* Time off › Pending, then "Open request and that week's schedule". *Actual:* The top bar says "Time off", the sidebar highlights Inbox, and the back link reads "‹ Inbox", which goes to `/app/inbox`. On desktop that back link also sits at the top right (x≈1320), whereas Add shift puts its back link at the top left. A decision also returns to the Inbox. *Evidence:* `qa48-request-open-1440.png`. The origin type is only `"home" | "inbox"` (`src/components/manager-time-off.tsx:35-45`). The link text "…and that week's schedule" also opens the request, not the schedule. *Fix:* Add a `requests` origin and use the same back-link position as PageBand. **Impact Medium · Effort S · Owner UI.**

5. **Use one error state, and only say "check your connection" when the device is offline.**
   *Actual:* Each data-loaded page fails in a different way:
   - **Timecards** repeats its heading in the body ("Couldn't load timecards. Couldn't load timecards. Check your connection…"). It shows two retry controls: a centred "Try again" and a "Refresh" link floating at the right.
   - **Insights** shows an orange card. Export stays enabled and opens a menu where every item is disabled, with no reason given.
   - **Inbox** says "The Inbox isn't available right now". Its filters stay enabled at 1440 but are disabled at 768.
   - **Home** says "Couldn't load everything".

   All of these happened while the browser was online, with a server or blocked-request failure. *Evidence:* `qa48-tc-err-1440.png`, `qa48-insights-err-1440.png`, `qa48-insights-export-1440.png`, `qa48-inbox-err-1440.png`, `qa48-home-err-1440.png`. *Fix:* One kit ErrorState that names what failed, has one retry control and picks its copy from `navigator.onLine`. Disable Export while there is no data. **Impact Medium · Effort S-M · Owner UI.**

6. **Notifications should say what changed, and stop calling themselves an inbox.**
   *Actual:* There are two identical rows, "Schedule update · Unread · 2:28 AM", with no week, location or shift, so they can't be told apart. The search placeholder says "Search this inbox", right under "Decisions are in your Inbox". The bell's label says "2 unread in your recent inbox". *Evidence:* `qa48-notifications-1440.png`. *Fix:* Add a one-line body ("Week of Oct 19 published · Main Office"), group duplicates, and rename the placeholder to "Search notifications". **Impact Medium · Effort S · Owner UI + Backend (payload).**

7. **At 768 touch, show the week, not two and a half days of it.**
   *Actual:* The full 232 px sidebar plus a roughly 220 px name column leaves about 2.5 day columns visible. Today (Wed 21) is cut off under the edge fade, so the manager has to scroll sideways to find today. *Evidence:* `qa48-sched-768.png`. *Fix:* From 768 to 1023 px, either collapse the sidebar to a rail by default or use the phone day list with the week strip. **Impact Medium · Effort M · Owner UI.**

8. **Phone Schedule week navigation looks like a Back button and only goes one way.**
   *Actual:* The top-left "‹ Oct 12" looks like iOS Back but switches to the previous week. There's no visible next-week control; "Next week" is only in the More sheet. *Evidence:* `qa48-sched-390.png`, `qa48-sched-more-390.png`. *Fix:* Put ‹ Oct 19 – 25 › around the week label, or add a › next to the strip. **Impact Low-Medium · Effort S · Owner UI.**

9. **Update detail failed once.**
   *Actual:* `/app/updates/<id>` showed "Couldn't load this update" once (`qa48-update-detail-1440.png`), and I couldn't reproduce it in 6 more tries (`h2.mjs`). It is probably the same load-related timeout as #2. Every load also aborts and re-issues `/api/manager/communications/:id`, `/api/notifications` and `/api/manager/inbox-count`. That is likely dev StrictMode, but confirm that an aborted first fetch can never be shown as the error state. **Impact Low-Medium · Effort S · Owner UI.**

10. **Small form and menu gaps.**
    - Add shift Cancel throws away edits with no confirmation (I changed Location, then clicked Cancel).
    - In the More menu, "Set deadline" is enabled while the date field is empty.
    - "Copy previous week" is the only More item with no description, and it is the one that writes the most.

    *Evidence:* `qa48-sched-more-1440.png`. **Impact Low · Effort S · Owner UI.**

## What's good
- Permissions hold in the UI. On an Owner record, the Manager gets "Only an Owner can change another Owner" and no editable fields (`qa48-team-owner-as-manager-1440.png`).
- Menus and sheets close on Escape and return focus to their trigger: the Schedule More menu, the Insights period and Export menus, and the account menu. ⌘K and the phone Search find people, and Enter opens the person.
- Team filters apply on change and are kept in the URL (`?role=LEAD&q=…`), with a clear "No matching employees / Clear filters" empty state. No page I visited overflowed sideways at 390, 768 or 1440.

## Not checked / limits
- **Inbox (every filter, item sheet, detail pane), Timecards (tabs, sheet, picker, Select mode), Insights data and period switching, and Home "Needs you" were not tested live.** These panels load through read-only POSTs (`/api/manager/action-center`, `/api/timecards`, `/api/reports`). My harness aborts every non-GET request as a no-write safety net, and the permission system refused my request to allow those three endpoints. I saw only their error states (#5) and the menus that still open (Insights period and Export). The Timecards period picker could not be opened in the error state. Covering them needs Jose's OK to allow those read endpoints, or a run without the POST block.
- The other reviewers were using the preview at the same time, so load-related failures (#2, #9) may be worse than in production. Timings were not measured under controlled load.
- No reduced-motion or full keyboard tab-order pass (Escape and focus return only), no Lead or Employee pages, Chromium only.
