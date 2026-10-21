# Upscale review: UI Designer (visual quality)

October 20, 2026. Build: release-candidate preview at `http://127.0.0.1:55450`, clean v3 Owner and Manager look. Accounts: QAOWNER, AUDIT-M, payroll-qa-owner (stored sessions, no sign-in). Widths: 1440×900 and 390×844 (`isMobile`, `hasTouch`, 2x). Profile used the p35 fixtures through `page.route`.

Evidence root (all paths below are relative to it):
`/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p35-profile-6cdee8/e8429433-65b2-4ff4-835a-8f879fb2454f/scratchpad/upscale/ui-designer/`
Full pages are in `shots/` (`<account>_<width>_<route>.png`, 76 captures) and crops in `crops/`. Scripts: `capture.mjs`, `probe.mjs` (type audit), `tiles.mjs` (tile tones and chart markers), `discover.mjs`.

The dark "N" disc at bottom left of every capture is the Next.js dev indicator, not the app.

## Verdict

Home, Inbox, Settings and the phone large-title lists now match Gusto for calm and clarity. The gap is uneven finish. Four surfaces still wear older layers inside the v3 shell: Payroll, Time exports, My pay and the three Team tools views. You see it on Payroll and Time exports first, and those pages carry the most trust. The data displays are also thin. Shifts today, Insights and Timecards show the plan or the record, never the two side by side, and plan against actual is where Deputy, When I Work and Homebase earn their keep.

The one upscale with the most value is **UI-1: turn Shifts today into a plan-against-actual day view** and give it a phone form. You open Home every day, and today the chart showed six identical coral outlines at 11:18 PM, two of them for people the card beside it lists as working.

## Opportunities, ranked by impact

Scores use the trend-and-trust scorecard (out of 16).

### UI-1. Shifts today becomes a plan-against-actual day view

- **Page, role, width:** Home, Owner and Manager, 1440 (absent at 390).
- **Today:** The axis is fixed to the first shift start and last shift end (`ShiftTimeline` in `components/premium-home.tsx`, lines 252 to 280). At 11:18 PM it ran 7 AM to 5 PM, so the code dropped the Now line while the legend still read "Now, 11:18 PM". All six bars drew as coral "No clock-in" outlines, including Casey and Jordan, whom Working now lists as on break and in at 9:12 PM. Every bar has the same weight, so the eye gets no story. Phones get no chart at all. Crop: `crops/UI01-home-shifts-today-1440.png`.
- **The upscale:**
  - The axis always includes Now, extending to the hour after Now or the last shift end, whichever is later.
  - Each row draws the planned shift as a light outline and the worked time as a solid teal segment from `firstClockInAt` to Now or to clock-out. A clock-in outside the planned window shows as a solid segment beside the outline. You see Jordan's 9:12 PM arrival at a glance.
  - Late arrivals get a small amber notch at the planned start (`late` is already on `TodayShift`). Coral stays for a shift with no clock-in once the start is past.
  - Rows group under location labels when there is more than one location, and the header meta reads "4 of 6 clocked in".
  - Phone: a compact "Today" strip under Working now, one 6px bar per person on a shared axis. A tap opens that person's shift.
  - Benchmark: Deputy and When I Work live timelines, Homebase "Today" timesheet bars.
- **Why it matters:** You read Home first. A day view that tells the truth in one glance answers "is today OK?" without opening Attendance.
- **Effort:** M.
- **Needs:** UI only for clock-in start, lateness and the Now axis (fields exist in `lib/today/project.ts` lines 9 to 12). Clock-out and break segments need a field from Codex.
- **Score:** 15/16.

### UI-2. Payroll run page joins the v3 kit and leads with the money

- **Page, role, width:** Payroll (Payroll runs), Owner with payroll, 1440 and 390.
- **Today:** This page still wears the older premium layer: a soft-shadow card, grey-filled tiles, and a mixed weight set (400, 500, 550, 600, 700 from `probe.mjs`). Net pay, the number you approve, is the fourth 14px tile and wraps alone onto a second row. The step bar, "Approve: Approve this revision" strip, source panel and raw "Choose File / No file chosen" input stack at equal weight. On the phone the page runs 7,870px. Crops: `crops/UI02-payroll-summary-1440.png`, full `shots/payroll-qa-owner_390_home_payroll.png`.
- **The upscale:**
  - A summary block in v3 hairline style. Net pay sits at 28px semibold tabular with "10 employees" beside it, and one line below reads Gross $1,000.00, less deductions $123.40. Employer contributions $70.00 and the total employer cost go on a quiet second line.
  - Employee amounts become a real table at 1440 (Name, Hours, Gross, Deductions, Net, right-aligned tabular). Zero rows collapse to "8 people with $0.00" below the paid rows. At 390 it becomes the inset grouped list the other v3 pages use.
  - The step bar moves to a slim 2px track with labels under it, and the status pill sits in the page header.
  - The import control becomes a dashed drop zone styled like the v3 secondary button.
  - Copy stays word for word.
  - Benchmark: Gusto "Review and submit" payroll summary.
- **Why it matters:** This is where a client decides whether NEVORA is safe with money. At the moment it is the least finished page in the app.
- **Effort:** M to L.
- **Needs:** Jose's approval (payroll page, even with copy unchanged). UI only otherwise.
- **Score:** 14/16.

### UI-3. Team tools views (Attendance, Team overview, Schedule activity) adopt the v3 page frame

- **Page, role, width:** `/app?view=attendance|team|activity`, Owner and Manager, 1440 and 390.
- **Today:** These three pages share a different frame from the rest. A "Today" eyebrow or back link sits above the h1, which lands at y=152 against y=100 elsewhere. Tabs float right-aligned beside the title. Cards use shadows instead of hairlines, and Refresh is a 48px pill against 32px header buttons. Attendance stacks eyebrow, title and description three times in one card. Team overview gives each person an 80px row that repeats "No weekly hour target yet" and "Not set". It never shows the 56h each person has on the schedule. Crops: `crops/UI03-attendance-legacy-1440.png`, `crops/UI03-team-overview-legacy-1440.png`.
- **The upscale:**
  - Use the Inbox and Timecards header: h1 at the standard spot, week control in the top bar, tabs under the title.
  - Swap shadow cards for hairline cards and put Refresh in the footer line as on Inbox.
  - Team overview rows become one line: name, scheduled hours, a 4px bar against target (grey when no target), and a "Set target" link.
  - Attendance keeps its counts but shows them as the Timecards stat strip.
  - Benchmark: Gusto People and Time tools, which keep one page frame across tools.
- **Why it matters:** The sidebar now promotes these views. Each visit currently feels like stepping into an older app.
- **Effort:** M.
- **Needs:** UI only. Scheduled hours per person are on the schedule payload; Codex should confirm the Home view can read them.
- **Score:** 15/16.

### UI-4. My pay for Owners and Managers uses the v3 frame

- **Page, role, width:** My pay, Owner and Manager, 1440 and 390.
- **Today:** The employee premium layer leaks in. At 1440 you get a centred 760px beige (#F5F4F0) panel inside the white left-aligned shell with no visible page title. At 390 a beige sheet overlaps the hero. The payday date is 60px at weight 200, the only ultra-light text in the manager app, and TEAM-RULES lists ultra-light weights under "Avoid". Crop: `crops/UI04-mypay-owner-1440.png`, phone `shots/payroll-qa-owner_390_home_my_pay.png`.
- **The upscale:**
  - Left-align the page under a standard h1 "My pay" on the white canvas.
  - Keep the dark-teal payday card and its NEVORA mark art, but set the date at 40px weight 600 tabular.
  - The empty statement message uses the shared empty pattern (UI-11). The privacy line and Refresh go in the v3 footer line.
- **Why it matters:** This is a small page. An owner who checks their own pay should not land somewhere that looks like a different product.
- **Effort:** S.
- **Needs:** UI only. Scope the change to the clean shell (`data-nv-clean`) so the Employee My pay stays as it is.
- **Score:** 15/16.

### UI-5. One status-tile ladder at both widths

- **Page, role, width:** Home Needs you and Finish setting up, Owner and Manager, 1440 and 390.
- **Today:** `tiles.mjs` read the computed colours.
  - At 1440, the `review` tile (Open shifts today) renders the same coral tint and #B42318 glyph as `urgent`, so amber never appears.
  - At 390, `review` is iOS orange #FF9500 with a white glyph at 2.2:1, under the 3:1 non-text floor.
  - `neutral` tiles (Finish setting up, Time-off request) are solid teal, against the rule that teal marks actions only.
  - The two widths disagree for the same row: desktop shows grey for time off, the phone shows teal.
  Crops: `crops/UI05-home-needs-you-tiles-1440.png`, `crops/UI05-home-needs-you-tiles-390.png`.
- **The upscale:** Use one tone map for both widths.
  - urgent: coral (#D70015 glyph on #FEF0EE at 1440, solid #D70015 tile at 390)
  - review: amber (#A05A00 on #FDF3E3, or a solid #A05A00 tile)
  - done: green #1E7B34
  - neutral: grey #6C6C70
  - accent: teal, only for Finish setting up, since it is an action
  All white-on-fill pairs need 4.5:1 or more.
- **Why it matters:** The ladder is a brand constant, and owners learn "amber means look soon" only when amber shows up the same way everywhere.
- **Effort:** S.
- **Needs:** UI only (`premium-clean-manager.css` `.nv-tile` rules and the desktop tile tint rules).
- **Score:** 16/16.

### UI-6. Schedule grid: calm open shifts, daily totals, position cue

- **Page, role, width:** Schedule, Owner and Manager, 1440 (open-shift tone also at 390).
- **Today:** Twenty-one red dashed boxes fill the top band of the week, Monday through Sunday, and outweigh the real roster below. Every assigned chip is the same grey-teal, so roles don't show. There is no per-day total, only "6 people · 336h" in the corner. On the phone, "Open shift" is red text with a "Find Cover" button in title case. Crop: `crops/UI06-schedule-grid-1440.png`.
- **The upscale:**
  - Open shifts become dashed neutral outlines with an "Open" label.
  - Only open shifts that start within the next 24 hours take the coral edge. Later ones take amber when the week is published.
  - Add a footer row under the grid with hours and people per day (for example "48h · 6") in 13px tabular grey.
  - Add a 3px left stripe on each chip in a muted position colour from an 8-step accessible set (text stays ink).
  - Phone: "Find cover" in sentence case, matching voice.md.
  - Benchmark: 7shifts and When I Work position colours and daily labour footers.
- **Why it matters:** The schedule is a manager's main workspace. Red should point to what is at risk today, not paint the whole week.
- **Effort:** M.
- **Needs:** UI for tones and totals. Position colours need Jose's approval, as a new token set, and a stored colour per position from Codex if owners can pick it.
- **Score:** 13/16.

### UI-7. Insights shows planned against recorded, and its empty period says so

- **Page, role, width:** Insights, Owner and Manager, 1440 and 390.
- **Today:** The page opens on Last week (Oct 12 to 18). It showed 0h for both owner accounts, so you see an empty 300px chart frame with dashed 1h and 2h lines, a "13 people with no recorded time" card, and four zero tiles. This week has 5h 14m recorded, and the schedule holds 336h planned. Crop: `crops/UI07-insights-empty-1440.png`, phone `shots/QAOWNER_390_home_reports.png`.
- **The upscale:**
  - Each day shows a light planned bar with the recorded bar laid over it in teal, with a two-item legend.
  - When recorded time is zero, one line sits centred inside the chart: "No recorded time Oct 12 to 18", with a "This week" link. The axis drops to a single baseline.
  - The hero tile reads "Recorded 0h of 336h planned".
  - Benchmark: Homebase and 7shifts labour reports (scheduled against actual).
- **Why it matters:** A blank chart reads as broken. Planned against actual is the first question an owner asks of a report.
- **Effort:** M.
- **Needs:** Codex, because the reports payload needs planned hours per day. The empty-period treatment alone is UI only and S.
- **Score:** 14/16.

### UI-8. Time exports review becomes a list with one open item

- **Page, role, width:** Time exports, Owner with payroll and Manager, 1440 and 390.
- **Today:** "Complete payroll population and handoff" repeats a full block for each of 13 people: a select, an input and a textarea. That makes a 6,990px page at 1440, and the save button sits at the very bottom. Crop: `crops/UI08-time-exports-wall-1440.png`.
- **The upscale:**
  - Each person gets one row: name, recorded hours, a status word on the ladder ("Needs review", "Reviewed"), and a chevron.
  - Opening a row expands its three fields in place, one person at a time, or shows them in the right column at 1440, the way Inbox does.
  - A sticky footer shows "0 of 13 reviewed" with the existing save action.
  - Fields, wording and validation stay the same.
- **Why it matters:** This is the last step before money leaves. A wall of identical forms invites skipped rows.
- **Effort:** L.
- **Needs:** Jose's approval (payroll). UI only; the form contract does not change.
- **Score:** 13/16.

### UI-9. Timecards: show the exceptions, fold the zeros, compare with the plan

- **Page, role, width:** Timecards, Owner and Manager, 1440 and 390.
- **Today:** The Role column is "—" on all 13 rows. Eleven rows read "0h — Draft" at the same weight as the two that need you. Monograms render at 9px (`probe.mjs`). Nothing shows scheduled hours, so 3h 7m carries no context. Crop: `crops/UI09-timecards-1440.png`, phone `shots/QAOWNER_390_home_timecards.png`.
- **The upscale:**
  - Hide a column when every value is empty.
  - Fold zero-hour drafts into one row ("11 people with no time yet", expandable).
  - Add a "Scheduled" column with a variance chip: amber at 30 minutes or more over or under, grey otherwise.
  - Status words use the ladder with a 6px dot, as on Inbox.
  - Monogram text goes to at least 11px.
  - Benchmark: Gusto and Homebase timesheets (scheduled against worked, variance).
- **Why it matters:** Timecard review is a weekly chore, and this change halves the scanning.
- **Effort:** M (column hide and fold: S).
- **Needs:** UI for hide and fold. Codex needs to supply scheduled hours per timecard.
- **Score:** 14/16.

### UI-10. Team member page opens as a profile, not a form

- **Page, role, width:** Team member detail, Owner and Manager, 1440 and 390.
- **Today:** The page opens straight into editable fields (ID, names, phone, role, location, status) with a 52px Save button. The right 370px at 1440 is empty, and nothing shows how this person's week is going. The Team list is a static table of identical grey monograms with no live signal. Crops: `crops/UI10-member-detail-1440.png`, `crops/UI11-team-list-1440.png`.
- **The upscale:**
  - Detail: a header with a 56px monogram, the name, a status word, and the role and location. Call and Email go as secondary buttons.
  - The details show in read mode, with an "Edit" button that reveals the current form.
  - A right rail "This week" lists shifts, scheduled hours against target, last clock-in and pending requests.
  - Team list: add a "This week" hours column, plus a green "Working" or amber "On break" word next to the name for people clocked in.
  - Benchmark: Gusto employee profile, which opens to a summary and keeps edits section by section.
- **Why it matters:** You open a person to understand them, and an edit form first suggests you are about to change something.
- **Effort:** M.
- **Needs:** UI for the header and read mode. Codex for the right rail if one read can't combine schedule, clock and request data per person.
- **Score:** 14/16.

### UI-11. One empty-state look, with the line illustrations

- **Page, role, width:** Notifications, Updates, Insights, My pay, Attendance, Owner and Manager, both widths.
- **Today:** Notifications puts "No notifications here." in a bordered box, with two loose links below and Refresh floating far right. Updates shows a single row and then 600px of white. Each page styles its emptiness differently. The U0 spot illustrations (`src/components/illustrations/`, all-caught-up and payday) never appear in the v3 manager pages. Crops: `crops/UI12-notifications-empty-1440.png`, `crops/UI13-updates-1440.png`.
- **The upscale:** Use one v3 empty block: the 64px line illustration on its wash disc, a 15px semibold title, one 13px line, and at most one secondary action, centred in the card. Use all-caught-up for Notifications and Attendance, payday for My pay, and an empty-schedule variant for Insights.
- **Why it matters:** Empty states are often a new client's first impression. A designed empty state reads as "all clear"; a bare box reads as "unfinished".
- **Effort:** S.
- **Needs:** UI only.
- **Score:** 16/16.

### UI-12. Desktop type scale: five sizes, no fractions

- **Page, role, width:** All desktop pages, Owner and Manager, 1440.
- **Today:** `probe.mjs` counted the text sizes in use.
  - Home: 9 sizes, including 11.5, 12.5 and 13.5px.
  - Timecards: 12 sizes, from 9px up to 24px.
  - Reports: 11 sizes.
  - H1 is 24/600 on most pages but 28/500 on My pay.
  - Timeline axis labels are 11.5px.
- **The upscale:** Set one desktop scale: 12 caption, 13 body-small, 15 body, 20 section, 24 title, all at weights 400, 500 and 600, with tabular numbers in every table, stat and time. Map the fractional sizes to the nearest step. The phone scale stays as it is.
- **Why it matters:** Steady type rhythm is what makes Gusto feel quiet. Fractional sizes also render softly on 1x Windows screens.
- **Effort:** S to M.
- **Needs:** UI only.
- **Score:** 15/16.

### UI-13. Phone Team: iOS search field and filter menu instead of a filter card

- **Page, role, width:** Team, Owner and Manager, 390 (desktop lighter version too).
- **Today:** A "Find people" card stacks a 48px search box, two 48px selects and a segmented control. It takes 340pt before the first person appears. Crop: `crops/UI11-team-filters-390.png`.
- **The upscale:**
  - Put a 36pt grey-fill search field under the large title, the iOS Contacts pattern.
  - Role, location and status move into one "Filter" button that opens the existing bottom sheet. The button shows a count badge when a filter is active.
  - At 1440, search and filters sit in the table's header row.
  - Benchmark: iOS Contacts and Mail, and the Gusto People table toolbar.
- **Why it matters:** You see more people above the fold, and the pattern is one every phone user knows.
- **Effort:** S to M.
- **Needs:** UI only.
- **Score:** 15/16.

### UI-14. Schedule activity groups repeated gaps

- **Page, role, width:** Schedule activity, Owner and Manager, 1440 and 390.
- **Today:** Nine coral calendar rows say "Coverage gap at …" with only the day changing. Coral also marks gaps days ahead, which dilutes the urgent tone. Crop: `crops/UI14-schedule-activity-1440.png`.
- **The upscale:** Group gaps by location and time window, for example "Main Office, midnight to 7:00 AM: open Mon to Sun", and show day chips you can tap. Only gaps today or tomorrow get the coral tile; later ones get amber. Publications keep the green tile and lead the list.
- **Why it matters:** An activity log should summarise. Nine near-duplicates hide the one change worth reading.
- **Effort:** S to M.
- **Needs:** UI only.
- **Score:** 14/16.

### UI-15. Add shift: time quick-picks and a live chip preview

- **Page, role, width:** Add shift, Owner and Manager, 1440 and 390.
- **Today:** The time fields are native `--:-- --` controls. The Summary rail repeats the placeholders in 16px grey ("Choose times", "Choose someone"). Crop: `crops/UI15-add-shift-1440.png`.
- **The upscale:** Above Starts and Ends, show up to four chips built from Templates and the most common shifts ("9a to 5p", "8a to 4p", "7a to 3p"). The top of Summary previews the shift as it will look in the grid: the chip, with the person's monogram and weekly hours after this shift ("56h, over limit" in amber).
- **Why it matters:** Most shifts repeat. One tap beats two time pickers, and the preview builds confidence before save.
- **Effort:** M.
- **Needs:** UI only (templates already load for Schedule).
- **Score:** 14/16.

## Quick wins (S, UI only, in this order)

1. **UI-5:** one status-tile ladder at both widths, which also fixes the 2.2:1 orange glyph.
2. **UI-4:** My pay in the v3 frame, with no weight-200 date.
3. **UI-11:** one empty-state block using the existing illustrations.
4. **UI-9 (part):** hide the all-dash Role column and fold the zero-hour drafts.
5. **UI-1 (part):** the axis always includes Now, and Working now people stop drawing as "No clock-in". This uses `firstClockInAt`.
6. **UI-12:** desktop type scale at five sizes.
7. **UI-6 (part):** "Find cover" in sentence case. Open shifts after tomorrow get a neutral dashed outline.

## Leave as is

- **Inbox master-detail at 1440 and grouped lists at 390.** The segment counts, section captions and right detail pane read as Gusto-level (`shots/QAOWNER_1440_home_inbox.png`).
- **Settings hub.** The two-column groups have plain one-line descriptions and the icon tiles are quiet. Showing current values in rows is a possible later touch, not a rework (`shots/QAOWNER_1440_home_settings.png`).
- **Phone large-title structure.** The date eyebrow, large title, inset grouped cards and 15px floor on Home, Inbox, Timecards and Schedule feel native and calm.
- **Phone schedule week strip and day list.** The date bubbles, location segmented control and the "West Office isn't planned / Plan" card are clear.
- **Sidebar IA with Team tools grouped.** The rows are compact, the active state is a soft wash, and the inbox badge is the only red.
- **Profile.** The definition list, alert toggles and separate Sign out row work. A small identity header (monogram and name) would be the only addition.
- **Status words in text** ("Missing clock-out" in amber, "Ended" in red, "Waiting" in amber). They carry meaning without pills.
- **The payday card art on My pay.** The dark teal and NEVORA mark make it the one branded moment. Keep it and fix only the frame and weight (UI-4).

## Notes for Jose

- **Typeface.** Clean v3 sets the system stack (`-apple-system`, SF Pro, Segoe UI, Roboto) in `premium-clean-manager.css` line 8, while TEAM-RULES lists Inter as a constant. On Windows the manager app renders in Segoe UI and on Android in Roboto, so the brand reads differently by platform. If Jose approved the stack with v3, TEAM-RULES and DESIGN.MD should record the change. If not, he should decide before more pages get tuned to SF metrics. I propose no change here.
- **Gaps in this pass.** I didn't check hover, focus or reduced motion (out of scope for an upscale pass). I didn't open individual Settings sub-pages beyond Company profile and Branding, Templates or Scheduling rules in detail, or the 768 width. I ran the Shifts today chart only at 11:18 PM, so I never saw the daytime state with a visible Now line.
