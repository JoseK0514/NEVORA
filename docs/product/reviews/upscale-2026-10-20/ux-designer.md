# Upscale review: UX Designer (flows and usability)

October 20, 2026. Lens: an Owner's and a Manager's real day. Build: the clean v3 release candidate on `http://127.0.0.1:55450`, signed in as QAOWNER (Owner), AUDIT-M (Manager) and payroll-qa-owner, at 390×844 (touch) and 1440×900. Read only: I opened menus, sheets, drawers and disclosures and followed links. I pressed no Approve, Publish, Save, Send or Delete.

**Evidence folder.** Every path below sits under
`/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p35-profile-6cdee8/e8429433-65b2-4ff4-835a-8f879fb2454f/scratchpad/upscale/ux-designer/`
(`shots/` holds full pages, `crops/` holds the cut-outs, the `*.mjs` files are the Playwright scripts, `crawl-*.json` holds page text, control counts and heights).

## Verdict

NEVORA now matches Gusto on calm: Home fits one screen at 1440 and at 390, the counts agree, and the phone follows iOS conventions closely. Gusto still wins on one thing that matters more to a busy Owner: **you finish the job where you find it.** In NEVORA the Inbox, Home and Search tell you what needs you, then send you to another page to act. Each detail pane ends in a single hand-off button ("Review time off", "View coverage gap", "Review timecard"), and two of those hops end without a way to fix the problem. The one upscale with the most value: **make the Inbox detail pane (desktop) and item sheet (phone) the place where the decision happens**, with the next item selected after each one (UX1). It cuts the common decisions from four taps and two page loads to two taps and none, and it uses actions the app already has.

## How the day measures today

Taps or clicks from Home, counted in the live build. "Target" is what the upscale below reaches.

| Job | Today (desktop and phone) | Ends in | Target |
|---|---|---|---|
| Decide a time-off request | 4: Needs you row › Inbox item › "Review time off" › Approve (2 page loads) | Requests page; Back returns to the Inbox | 2, in the pane or sheet |
| Follow up a missed clock-in | 4: row › item › "Review timecard" › click the outlined row in Timecards | A drawer with no fix control; Approve disabled | 2, fix in the pane |
| Cover an open shift today | 4 on desktop (row › expand location › gap › "View coverage gap"); 2 on phone (Schedule › Find Cover) | "No one can work it" and one button, Back to schedule | 3, ending in an offer sent |
| Publish West Office | 3: Schedule › More › Build and publish › Publish (or the band link, 2) | Publish sits inside a panel, under More | 2, a toolbar Publish |
| Add Alexandra's Tuesday shift | 7: Add shift › location › person › change date (defaults to Monday) › start › end › Save | Conflicts appear only after Save | 4, from the grid cell |
| See what Alexandra works this week | Search "alex" › her page opens on an edit form with no schedule; you go to Schedule and scan | No answer on her page | 2 |
| Approve a payroll revision | Payroll › scroll about 2,000px on desktop, 3,000px on phone › tick › Approve | The approve control is the last block on the page | Same clicks, no hunt |

## Opportunities, ranked by impact

### UX1. Decide in the Inbox, then move to the next item
- **Page(s), role, width:** Inbox (and Home's Needs you rows that lead to it), Owner and Manager, 1440 and 390.
- **What it is today:** the desktop split view and the phone sheet show facts, then one button that leaves the page. Time off: "Approve or decline it on the full request" and a "Review time off" button (`crops/UX1-inbox-request-relay.png`). Coverage gap: "Open the coverage gap to fill it" (`crops/UX1-inbox-gap-relay.png`). No clock-in: "Review timecard" and "View profile" (`shots/QAOWNER-390-inbox-sheet.png`). The timecard hop lands on the Timecards list with Morgan's row outlined; the drawer stays closed and the row reads "Draft 0h", so the reason you came (no clock-in) disappears (`crops/UX4-inbox-hop-lands-on-list.png`). The Requests page already shows Approve and Decline inline for the same request (`shots/QAOWNER-390-app_requests.png`), so the action exists one page away.
- **The upscale:**
  - Time off: Approve and Decline in the pane and the sheet, plus two lines that answer the manager's real question, in the form "Also off Oct 30 – 31: nobody" and "Shifts affected: 2 at Main Office", linking to that week's schedule. The button shows a pending label until the server confirms (direction P2).
  - Coverage gap: the pane lists "Who can work it" from the coverage page and lets you assign or offer from there (see UX2 for the empty case).
  - No clock-in: the pane shows the scheduled shift beside the punches, with "Call" and "Text" (tel: and sms: on phones, copy on desktop) while the shift is live, and "Open timecard" that opens the drawer, not the list.
  - After a decision, the next item in the same section becomes selected, with a one-line confirmation and Undo where the server allows it. Desktop keeps the existing ↑↓ focus movement; Enter opens the item in the pane.
  - Benchmark: Gusto Home's Tasks list resolves tasks in place ([Gusto Home](https://mobbin.com/screens/f80f8026-7437-46f3-8970-5f4b2aabe0dc)); 7shifts and Homebase approve requests from the manager's request list without a second page.
- **Why it matters:** the Inbox is where a Manager spends the first ten minutes of a shift. Halving the taps on the three most frequent items is the difference between an app that lists work and one that clears it.
- **Effort:** M (time off and no clock-in), L with the coverage list.
- **Needs:** UI for time off (the endpoint behind the Requests page). Coverage candidates in the pane reuse the coverage read (UI). Undo needs Codex if the server has no reversal. Contact buttons need the phone number already shown on Team (UI).

### UX2. Never end the cover-a-shift flow at "No one can work it"
- **Page(s), role, width:** Schedule coverage page, Inbox open shifts, phone Schedule "Find Cover", Owner and Manager, both widths.
- **What it is today:** every gap I opened (West Office all day; Main Office 5 PM to midnight on Oct 20 and 21) reached "No one can work it. Everyone is unavailable, already working, on approved time off, inactive, or can't work at this location." with one button, Back to schedule (`crops/UX2-cover-dead-end.png`, `shots/QAOWNER-390-findcover.png`). The Shift requests "Open coverage" tab lists only shifts employees gave up (`shots/QAOWNER-1440-exchange-opencoverage.png`). A manager has no way to post the shift to the team.
- **The upscale:**
  - Show the closest people with the reason each one was left out, for example "Casey Rivera: would reach 63h", "Alexandra Rivera: works 8 AM – 4 PM that day", "Riley Rivera: not set up for West Office". Let the Owner or Manager assign anyway after a confirm that names the rule being broken.
  - Add "Offer to the team": post the shift to everyone qualified, collect pick-ups in Shift requests › Open coverage, and approve one. 7shifts calls this the Shift Pool, with bids and a direct offer to one person ([7shifts Open Shifts](https://kb.7shifts.com/hc/en-us/articles/4417519854227-Open-Shifts), [direct offers](https://kb.7shifts.com/hc/en-us/articles/45295544914579-Can-employees-be-notified-when-a-shift-is-offered-directly-to-them-from-the-Shift-Pool)).
  - Offer "Change the shift" (shorten or split) when the gap is a 24-hour block nobody can work.
- **Why it matters:** an uncovered shift costs the business real money today. A dead end on the most urgent red item breaks trust in the red.
- **Effort:** L.
- **Needs:** Codex: per-person exclusion reasons in the coverage read, and an offer-to-team action with notifications (test mode only). UI for the rest. The override needs Jose's call on whether Managers may break hour rules.

### UX3. Make Publish the schedule's primary action, and add shifts from the grid
- **Page(s), role, width:** Schedule, Add shift, Owner and Manager, 1440 (grid) and 390 (agenda).
- **What it is today:** the toolbar's primary button is Add shift. Publish lives inside More › Build and publish, a panel above the grid (`shots/QAOWNER-1440-schedule-plan.png`); More also holds Copy previous week, Templates and an availability-deadline form (`crops/UX3-schedule-more-menu.png`). None of the 99 grid cells has a control (`interact-desk.mjs` output: 0 interactive empty cells), so adding a shift means a seven-field page whose date defaults to Monday Oct 19 when today is Tuesday, and which says "Availability, time off, other shifts and weekly hours are checked when you save." (`shots/QAOWNER-1440-app_schedule_new.png`, 1,606px tall on phone).
- **The upscale:**
  - Toolbar: the week stepper, then a status chip ("Main Office published · West Office draft"), then **Publish** as the teal primary with the count of unpublished locations or changes. Publish opens a review sheet: what changed, who gets notified, per location, then the existing publish action. Add shift moves to a secondary button. Square Team's web scheduler places Publish as the primary at top right ([Square scheduling](https://mobbin.com/screens/de007559-badd-4c59-94f8-491a99f99e73)); 7shifts and Homebase do the same.
  - Desktop: hovering a person's empty day shows "+"; clicking opens a small popover prefilled with person, day and location, asking only start and end. Phone: "Add shift" from a day in the agenda prefills that date.
  - The person picker shows each person's state for that day before Save: "Available", "Off (time off)", "Already 9 – 5", "48h this week".
  - Copy previous week and Templates stay in More.
- **Why it matters:** building and publishing the week is the Manager's biggest weekly task. A visible Publish with a change count removes the "did my team see this?" doubt; cell-click cuts each shift from seven inputs to three.
- **Effort:** M for the toolbar, review sheet and cell popover; L for picker hints.
- **Needs:** UI for toolbar and popover (existing endpoints). Picker hints need a per-person precheck read (Codex) unless the client can derive them from the week it already loaded. Moving Publish out of More is a moved action: keep Build and publish in More for one release (TEAM-RULES continuity).

### UX4. Fix a timecard where the problem shows, and compare it with the schedule
- **Page(s), role, width:** Timecards list and drawer, Owner and Manager, both widths.
- **What it is today:** the drawer lists "Needs attention: Period is still open; No clock-out yet; Open break" and says to "resolve open time or corrections before approval", but offers no control to do it; Approve and Finalize stay disabled (`crops/UX4-timecard-drawer.png`). "Recorded punch ›" only expands the punch history. The list spends a column on Role, which reads "—" for all 13 rows, and shows nothing about the schedule (`shots/QAOWNER-1440-app_timecards.png`). The `#timecard-ID` link from the Inbox scrolls to the row but does not open it.
- **The upscale:**
  - Each attention line gets its fix next to it: "Add clock-out", "End break", each opening a small form with a required reason (the original Clocker record stays, as Attendance already promises).
  - The drawer shows Scheduled 9:00 AM – 5:00 PM beside Recorded 8:12 PM – open, with the difference.
  - The list swaps Role for **Scheduled** and **Difference** columns; overtime risk shows in amber.
  - `#timecard-ID` opens the drawer. After an approve, "Next to review" moves to the next flagged person.
  - Benchmark: Homebase's Scheduled vs Actual Hours report ([Tenzo's Homebase guide](https://support.gotenzo.com/integration-guides/labour/guide-homebase/)); Gusto's step-by-step "Save and continue" rhythm.
- **Why it matters:** clean timecards are what make payroll right. Today the Manager sees the problem and has to go hunting for the tool that fixes it.
- **Effort:** M.
- **Needs:** Codex if no manager punch-edit endpoint exists (I found no edit control anywhere in the build). Jose's approval for any text near Approve and Finalize (legal wording). Columns and drawer deep link are UI only.

### UX5. Turn the person page into an answer, not a form
- **Page(s), role, width:** Team list and member page, Owner and Manager, both widths.
- **What it is today:** Team rows show name, role, location and phone (`crops/UX5-team-list.png`). The member page opens on an editable form with Save details as its main action (`crops/UX5-member-form.png`, `shots/QAOWNER-390-app_employees_AUDIT-E.png`). The questions a manager brings ("Is she working now? What's her week? Does she have a request open?") have no answer on her page. Search finds people but shows only their role (`crops/UX7-search.png`).
- **The upscale:**
  - Team rows add a "Today" cell (Working since 9:12 PM · Off · Starts 4 PM) and this week's scheduled hours.
  - The member page gains an **Overview** tab first: today's status, this week's shifts, hours against target, open requests, latest timecard, and Call, Text and Email buttons. Details turns into read-only cards with Edit links, as Gusto People does ([Gusto person cards](https://mobbin.com/screens/fd254564-eb5b-4b85-9fea-cb7389c82178)). Scheduling and Access stay.
  - On phones, Call and Text sit in the large-title area, the way iOS Contacts places them.
- **Why it matters:** "find a person" is a means to an end: call them, check their week, fix their time. A form-first page makes every one of those a second trip.
- **Effort:** M.
- **Needs:** UI composing existing reads (schedule, timecards, requests). A per-person summary read from Codex would keep it fast at larger team sizes.

### UX6. Show what happened today on Home's timeline, not only what was planned
- **Page(s), role, width:** Home "Shifts today", Owner and Manager, 1440.
- **What it is today:** the timeline runs 7 AM to 5 PM and draws scheduled shifts only. At 11:17 PM the "Now" marker sits off the chart, every bar reads "No clock-in", and the two people listed in "Working now" (clocked in at 8:12 PM and 9:12 PM) never appear as clocked in (`crops/UX6-home-timeline.png`).
- **The upscale:** draw recorded time as a solid teal bar over the scheduled outline, add a row for anyone clocked in without a matching shift, and fit the range to the day's shifts, punches and now. Clicking a bar opens the Inbox item or the timecard drawer.
- **Why it matters:** the two Home cards disagree today, and an Owner who sees "6 no clock-in" next to "2 working now" stops trusting both.
- **Effort:** S to M.
- **Needs:** UI. The working-now list already carries clock-in times.

### UX7. Let Search run the verbs people type
- **Page(s), role, width:** Search (⌘K on desktop, the search sheet on phones), Owner and Manager.
- **What it is today:** the empty state offers three actions (Add a shift, Add employee, Send an update) and pages. Typing "add shift" returns No matches; so do "publish", "policies" and "pin". Settings subpages, Build and publish, Copy previous week and Clocker PIN are not indexed. "payroll" returns Payroll and Time exports plus five people whose IDs contain "payroll" (`interact2.mjs` output). People results show the role only.
- **The upscale:** match actions on their words and common synonyms (add shift, new shift, publish, copy week, approve time off, prepare payroll draft); index the Settings subpages and Team tools; show a person with quick actions (Schedule, Timecard, Call); add a short Recent list. Command menus in Replit and Gumloop mix actions and navigation in one list ([Replit](https://mobbin.com/screens/9bfad190-392c-4ad0-ba1b-6475cd1bd0d8), [Gumloop](https://mobbin.com/screens/e9e0911a-09a4-4c72-bb98-6ac9357fa590)). Match people on name, not on internal ID substrings.
- **Why it matters:** search is the safety net for everything the sidebar trims. A miss on "add shift" teaches people not to use it.
- **Effort:** S for synonyms and Settings pages, M for person actions.
- **Needs:** UI (client-side index).

### UX8. Run payroll one step per screen
- **Page(s), role, width:** Payroll and Time exports, Owner (payroll-qa-owner), both widths.
- **What it is today:** `/app/payroll` runs 2,930px on desktop and 3,935px on phone (`shots/payroll-qa-owner-1440-app_payroll.png`, `shots/QAOWNER-390-app_payroll.png`). A backlog card ("3 completed periods have no original payroll run", paydays Oct 6, 13 and 20) sits above the active run. The stepper says step 4, Approve, but the checkbox and Approve button come last, after ten employee rows (nine at $0.00) and the import block. Time exports runs 6,990px with 13 stacked member forms, one per person, each with Period disposition, reason and a free-text box (`shots/QAOWNER-1440-app_payroll-export.png`).
- **The upscale:**
  - The run becomes paged: Hours › Amounts › Review › Approve › Publish, "Step 4 of 5", a sticky footer with Back and the step's action, and the totals pinned beside it, as Gusto's payroll and add-person flows do ([Gusto step 1 of 4](https://mobbin.com/screens/ff4a72e3-1fe2-4cb5-ab95-c935985fcabd), [Gusto step 3 of 5](https://mobbin.com/screens/efa85b96-2579-43d8-bd6f-47853d3c1110)).
  - Employee amounts open on exceptions ("1 person with pay, 9 at $0.00, show all").
  - The backlog becomes one row above the run ("3 periods without a run · Review oldest").
  - Time exports' population review becomes a table where each member defaults to "Review this member" and only the rows a person changes expand.
- **Why it matters:** payroll is where an Owner most fears a mistake. Shorter steps with the decision in view reduce that fear more than any visual polish.
- **Effort:** L.
- **Needs:** **Jose's approval** (payroll layout; the approved wording stays word for word). UI only if the steps reuse today's actions.

### UX9. Fold Team tools so the sidebar reads at a glance
- **Page(s), role, width:** desktop sidebar and phone More sheet, Owner and Manager.
- **What it is today:** the Owner sidebar holds 15 entries; five are Team tools (Attendance, Team overview, Schedule activity, Clocker recovery, Account recovery) that most days go unused (`shots/QAOWNER-1440-app.png`). Clocker recovery and Account recovery also appear in Settings › Access & recovery, and Account recovery again on each member page, against the v3 rule "one home per tool".
- **The upscale:** make "Team tools" a collapsible group, closed by default and remembered per person; the group header lights when one of its pages is open. Keep every URL and the More sheet grouping as is.
- **Why it matters:** fewer visible choices on every page (Hick's law) without moving anything, so muscle memory holds.
- **Effort:** S.
- **Needs:** UI. Jose's nod, since he approved the sidebar on October 19.

### UX10. Tell a Manager why a page is closed
- **Page(s), role, width:** `/app/settings`, `/app/payroll`, Manager (AUDIT-M), both widths.
- **What it is today:** both URLs drop the Manager on Home with no message (`crawl-AUDIT-M-1440-*.json`, `shots/AUDIT-M-390-settings-redirect.png`). An Owner who shares a Settings link gets a confused Manager.
- **The upscale:** a calm permission state in place: "Only Owners can open Settings. Ask Fictional Owner if you need a change." with Back to Home.
- **Why it matters:** silent redirects feel like a bug; a named reason feels like a rule.
- **Effort:** S.
- **Needs:** UI if the guard renders client-side; Codex if the redirect happens on the server.

### UX11. Keep the phone's top-left slot for Back
- **Page(s), role, width:** phone Schedule, Owner and Manager, 390.
- **What it is today:** the top-left shows "‹ Oct 12" in the iOS back-button style, and it steps to the previous week (`shots/QAOWNER-390-app_schedule.png`). On Timecards, Team member and Add shift the same slot means Back ("‹ More", "‹ Team", "‹ Schedule").
- **The upscale:** move week stepping beside the week label or onto a swipe across the day strip, and leave the top-left empty on a tab root.
- **Why it matters:** platform convention (Jakob's law); one control with two meanings causes mis-taps.
- **Effort:** S.
- **Needs:** UI.

### UX12. Let the Clocker recovery start from a list, not a 36-character code
- **Page(s), role, width:** Clocker recovery, Owner and Manager, both widths.
- **What it is today:** the page asks you to type a saved action reference "like 12345678-1234-1234-1234-123456789abc. Include every character and dash." (`shots/QAOWNER-1440-app_clocker-recovery.png`).
- **The upscale:** list unresolved Clocker actions from the last 24 hours per location (employee, time, tablet) to pick from; keep the typed reference as a fallback; on phones, offer to scan a QR code the tablet shows.
- **Why it matters:** recovery happens with an employee standing at the counter. Typing a UUID on a phone in that moment is the slowest path in the app.
- **Effort:** M.
- **Needs:** Codex (a list read of unresolved actions; QR on the Clocker).

## Quick wins (S, UI only)

1. **UX4 deep link:** `#timecard-ID` opens the drawer, and the list's empty Role column becomes Scheduled.
2. **UX6 timeline:** draw recorded time and fit the range to now.
3. **UX7 search:** add action synonyms and the Settings subpages.
4. **UX11:** move week stepping out of the Back slot on phones.
5. **UX9:** make Team tools collapsible (with Jose's nod).
6. **UX10:** show a permission state if the guard runs on the client.
7. **UX3 detail:** default Add shift's date to today, or to the day you came from.

## Leave as is

- **Home at both widths:** one screen, one "Needs you" count that matches the Inbox badge, rows that open the right Inbox filter (`shots/QAOWNER-1440-app.png`, `shots/QAOWNER-390-app.png`).
- **Inbox structure:** underline tabs with counts, the split view, grouped open shifts, ↑↓ keyboard movement and the skip link.
- **Phone More sheet:** search first, then the account row and job groups (`shots/QAOWNER-390-more.png`).
- **Phone Schedule agenda:** the day strip, location segments and a "Find Cover" button on each open shift.
- **Requests page:** inline Approve and Decline with "Open request and that week's schedule".
- **Timecards drawer on desktop:** a side sheet with Done that keeps the list in view.
- **Member page › Account recovery:** opens with the employee already filled in.
- **Profile ready state:** clear details, pay and alert toggles (`shots/QAOWNER-390-profile-ready.png`, served from the p35 fixture with `page.route`).

## Checks run and gaps

- **Run:** Playwright Chromium, one browser at a time: Owner pages at 1440 (26 routes) and 390 (14 routes), Manager at 1440 (8 routes) and 390 (More sheet, Settings redirect), payroll-qa-owner at 1440 (5 routes). Interaction probes for Search, the Inbox panes and sheet, the coverage pages, the Schedule menu, the timecard drawer, keyboard Tab and arrow order, and the Inbox to Timecards hop with Back.
- **Not checked:** WebKit, a physical phone, 200% text, reduced motion, offline. I did not test what Publish, Approve or Copy week do after you press them (the brief forbids it). Homebase and 7shifts have no Mobbin screens; their behaviour comes from their help pages above and from the competitive brief (`docs/product/competitive-2026-10.md`).
- **Data note:** the preview's clock reads about 11:20 PM, so every scheduled shift today has ended. Daytime states for Home and the Inbox (shift under way, late, starting soon) went unseen.
