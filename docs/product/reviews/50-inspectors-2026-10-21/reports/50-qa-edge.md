# 50 QA Tester — edge cases (extremes on Owner and Manager pages)

**Verdict.** Long names hold up: nothing overflows at 1440, 390 or 320px. But time edges and scale are weak. A punch left open for 25 hours shows on Home as "in at 12:28 AM", which reads like this morning. A 24-hour block reads "12a – 12a", which looks like zero hours. The Schedule and Timecards lists have no search, no grouping and no paging, so they won't work well for 200 people or 10+ locations. A new workspace never shows its designed empty states.

## Recommendations

1. **Make stale clock-ins visible on Home and in the Inbox.**
   - **What:** In Home's "Working now", show the date when a clock-in isn't today, plus the elapsed time ("in since Tue 12:28 AM · 25h"). Flag rows past a threshold, for example 12h on the clock or 2h on a break, as "Missing clock-out?". Add an Act-now Inbox item for open entries past the scheduled end. `OPEN_AFTER_SCHEDULE_END` already exists in `src/lib/attendance/project.ts:409`.
   - **Why:** `src/components/premium-home.tsx:228-229` formats `clockInAt` with `clock()`, which shows the time only. In the preview, Jordan Rivera read "Main Office · in at 12:28 AM" after 25h open. Casey Rivera read "on break", and that break had been open 23h 10m. Timecards marks both as "Missing clock-out", but the Inbox only lists them under Plan ahead as "Timecards to review 2", and Home's Needs you has no row for them. The Attendance monitor shows "25h 2m since clock-in" (`manager-clock-monitor.tsx:34`), but nothing there marks it as a problem either.
   - **Impact:** High (pay accuracy and trust). **Effort:** S for UI, M for the Inbox item. **Owner:** UI, with Backend for the action item.

2. **Use one time-range formatter for 24h, midnight and overnight shifts.**
   - **What:** The roster should use `formatTimeRange` from `src/lib/date-utils.ts:80` ("All day", "midnight"). Overnight blocks should show a visible "+1" or "→ Thu" mark.
   - **Why:** `manager-weekly-roster.tsx:31-36` (`brief`) and `:29` (`clock`) turn 24:00 into 12a / 12:00 AM. The preview showed "12a – 12a" open blocks on desktop (`q50/sched-empty-week-1440.png`) and "12:00 AM / 12:00 AM" on the phone. The Inbox shows the same blocks correctly as "all day" and "midnight", so the two pages disagree. Overnight shifts say "Ends Thu" only in sr-only text (`:59`). The phone day list also leaves out the part of the shift that runs after midnight.
   - **Impact:** High. **Effort:** S. **Owner:** UI.

3. **Support shifts of 24 hours or more, or say clearly that they can't be scheduled.**
   - **What:** Either add an end-date field to the shift form, or block equal start and end times with a clear message before the person submits.
   - **Why:** `create-shift-form.tsx:35` treats only end < start as overnight. If start equals end (for example 8:00 to 8:00), the summary shows "8:00 AM – 8:00 AM · 0h". The server then rejects it (`periods.ts:40`) with the generic "Enter a valid shift date and time period." Shifts have no `endDate` in the data, so the longest possible shift is 23h59m. That matters for 24h security or care rotations.
   - **Impact:** Medium. **Effort:** S for UI messaging; L for real 24h+ support. **Owner:** Product decides, then UI and Backend.

4. **Make Schedule and Timecards workable for 200+ people.**
   - **What:** Add search and a position or location filter to the roster. `filterRoster` in `manager-roster-presentation.ts:34` is written but used nowhere. Add the same search to the Timecards table, and consider grouping the roster by location. Don't render the hidden unscheduled rows.
   - **Why:** `manager-weekly-roster.tsx` renders every employee with 7 cells each. The unscheduled rows are rendered with the `hidden` attribute (`:212`), and each empty cell has a "+ Add" link. At 200 people that is about 1,400 cells and links, plus the phone list, all in the HTML. The desktop Timecards table (`timecards.tsx:341`) lists everyone with no search. The phone list shows "Show N more" with no way to find one person.
   - **Impact:** High for mid-size customers. **Effort:** M. **Owner:** UI.

5. **Fix the empty-week and new-workspace states.**
   - **What:** When a week has no assigned shifts, show a message such as "Nothing scheduled for Nov 16 – 22", with "Copy last week" and "Build" actions. Base the "team starts here" states on "no one besides the Owner" instead of `employees.length === 0`.
   - **Why:** In the preview, an empty week shows "0 people · 0h" above an Open shifts row and "Show 13 unscheduled", with no guidance (`q50/sched-empty-week-1440.png`). The roster's EmptyState (`manager-weekly-roster.tsx:229`) and the Team page's "Your team starts here" (`employee-directory.tsx:94`) never appear. The Owner is always an active employee, so the list is never empty.
   - **Impact:** Medium (first-run impression). **Effort:** S. **Owner:** UI.

6. **Tell duplicate names apart.**
   - **What:** Add a second detail wherever a name stands alone: role, location or ID.
   - **Why:** The shift form's Person select labels each option `First Last` only (`shift-assignment-fields.tsx:101`). The roster's row names and sr labels are name-only (`manager-weekly-roster.tsx:47`), which breaks the IS-28 rule "no two read the same". Timecards rows show "—" in the Role column when no position was captured, and their avatars use initials only. Two "Ana Rivera"s would look identical everywhere, and in the Person select the wrong one is easy to pick.
   - **Impact:** Medium. **Effort:** S. **Owner:** UI.

7. **Scale for 10+ locations.**
   - **What:** On phones, cap the "Locations the team can't see yet" card at 3 rows plus "N more". Shorten Home's "Open shifts today" meta to "N locations" when more than 3. On desktop, show a scroll cue or a "More locations" menu on the location tabs.
   - **Why:** Phone Schedule adds one row per unpublished location above the day list (`schedule/page.tsx:313-321`). At the year-end week, 2 locations already gave 2 rows, so 12 locations push the shifts off screen. `locationCounts` (`premium-home.tsx:152`) joins every location name. The location tabs scroll sideways with a hidden scrollbar (`clean-manager/schedule.css:81-85`). The desktop facts line already collapses past 3 locations (`page.tsx:290`), which is the right pattern to copy.
   - **Impact:** Medium. **Effort:** S. **Owner:** UI.

8. **Don't let open punches inflate totals.**
   - **What:** Mark running totals as live ("26h, still clocked in"), or leave open entries out of the "Recorded" total.
   - **Why:** The Timecards "Recorded" stat showed 51h 1m. Of that, 51h came from two open punches still counting (Casey Rivera 26h, Jordan Rivera 25h). The number keeps rising while the page is open and looks like real worked time.
   - **Impact:** Medium. **Effort:** S. **Owner:** UI.

9. **Show the year when a week or period crosses into a new year.**
   - **What:** Add the year to the week label when the week starts in one year and ends in the next.
   - **Why:** `compactWeekRange` (`schedule/page.tsx:91`) and the Timecards `rangeText` (`timecards.tsx:83`) both render "Dec 28 – Jan 3" with no year. That was confirmed on phone and desktop. `formatDateRange` in `date-utils.ts:105` already handles this case.
   - **Impact:** Low. **Effort:** S. **Owner:** UI.

10. **Show a visible time-zone label when the viewer is outside the workspace time zone.**
    - **What:** When the browser's time zone offset differs from the workspace's, show "Times in Puerto Rico" next to times on Home and Schedule.
    - **Why:** Home and Schedule show workspace-local times with no visible zone label. On the Schedule grid the label is only in an sr-only caption (`manager-weekly-roster.tsx:186`). An Owner travelling to New York in winter (1h apart from Puerto Rico) would misread "in at 8:00 AM". Nothing in the code checks the browser's time zone (no `resolvedOptions().timeZone`).
    - **Impact:** Low–Medium. **Effort:** S. **Owner:** UI.

## What's good
- Long names never overflow. "María José Rivera Santiago With A Long Name" wraps cleanly on Home, Schedule, Timecards, Team, Payroll and Availability, and in the person header. The page width stayed equal to the viewport at 1440, 390 and 320px.
- Calendar dates are handled carefully. All date logic uses noon UTC or Temporal with the workspace time zone. Daylight-saving gaps and repeated hours are rejected with clear messages (`business-time.ts`). Week math is correct across month and year ends.
- Long lists on phones are capped well: Schedule shows 5 then "Show N more", Home's Later today shows 4, phone Timecards shows 4. Batch approval limits itself to 100 and says so.

## Not checked / limits
- No 200-person or 10-location data exists in the preview. Scale findings come from reading the code, not from measuring render time or HTML size.
- The preview has no duplicate names and no real overnight assigned shifts, so those were judged from code. Overnight coverage blocks were observed.
- I didn't create a new workspace. The zero-data findings come from code and an empty future week.
- I didn't simulate a browser in another time zone, didn't check Insights or Payroll totals for open punches, and didn't use Lead or Employee views.
- Evidence: `scratchpad/review50/q50/` (probe scripts and screenshots: `owner-*-1440.png`, `sched-empty-week-1440.png`, `sched-yearend-*.png`, `home-390.png`, `sched-390.png`, `timecards-390.png`).
