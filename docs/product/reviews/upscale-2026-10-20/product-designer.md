# Upscale review: Product Designer (PD)

- **Date:** October 20, 2026, 23:15 to 23:40 Puerto Rico time.
- **Build:** release-candidate integration preview at `http://127.0.0.1:55450`, clean v3 look.
- **Accounts:** `QAOWNER` (Owner), `AUDIT-M` (Manager), `payroll-qa-owner` (Owner with payroll data), through the supplied `storageState` files. I never signed in and read no password.
- **Widths:** 1440×900 and 390×844 (`isMobile`, `hasTouch`). Chromium through Playwright, one browser at a time, closed after each run.
- **Profile:** `/api/management/profile` answered in my browser with `p35-profile/fixtures/owner.json` and `manager.json`.
- **Evidence folder** (`SP` below): `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p35-profile-6cdee8/e8429433-65b2-4ff4-835a-8f879fb2454f/scratchpad/upscale/product-designer/`. It holds `capture.mjs` (read-only capture), full-page shots in `shots/`, page text in `text/` and crops in `crops/`.
- **Read only.** I opened pages and one `<details>` list on Updates. I pressed no Approve, Decline, Save, Publish, Send, Delete or Sign out, and submitted nothing.

## Verdict

On craft, NEVORA now sits level with Gusto. Type, spacing, the split-view Inbox, the focused time-off review and the Schedule grid all read finished, and the "Needs you" count agrees between Home and Inbox. NEVORA falls behind on what it tells an Owner about the business. Gusto's Home leads with money and deadlines ("run payroll by…"). NEVORA's Home leads with today's attendance and nothing else. On `payroll-qa-owner`, payday for Oct 12–18 is **today** with no payroll run, a Sep 29 run still waits for approval, and Home doesn't mention pay at all. Insights reports one number, recorded hours for last week. The Schedule flags five people at 56h as "over limit" and stops there.

**Most valuable upscale: PD1, a "Coming up" panel on Home** that puts payday, timecard approvals and publish deadlines in date order, with the overdue ones on top. It turns Home from a passive view of today into the place an Owner checks before they get paid wrong. It also borrows Gusto's strongest habit and fits the "trustworthy pay" trait in `direction.md` §1.2.

## How I scored

The trend-and-trust scorecard in `TEAM-RULES.md` uses lines U Usability, F Familiarity, T Trust, A Accessibility, B Brand, D Durability, C Cost and Co Continuity, each scored 0 to 2. A proposal goes ahead at 12 or more, with no 0 on T, A or U. Brand and Cost use the rubric in `direction.md` §2.1. I ranked by impact for a demanding Owner (money and compliance risk first, then daily time saved, then polish) and fixed that order before comparing.

| ID | Upscale | U | F | T | A | B | D | C | Co | Score | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| PD1 | Home "Coming up": payday and deadlines | 2 | 2 | 2 | 2 | 2 | 2 | 1 | 2 | **15** | Go |
| PD2 | One live truth: on the clock vs missing clock-out | 2 | 2 | 2 | 2 | 2 | 2 | 1 | 2 | **15** | Go |
| PD3 | Overtime check on the Schedule before publish | 2 | 2 | 2 | 2 | 2 | 2 | 1 | 2 | **15** | Go (hours now, cost later) |
| PD4 | Insights answers "planned vs actual" | 2 | 2 | 2 | 1 | 1 | 2 | 1 | 2 | **13** | Go |
| PD5 | Decisions show their consequences | 2 | 2 | 2 | 2 | 1 | 2 | 1 | 2 | **14** | Go |
| PD6 | Person page opens on an overview | 2 | 2 | 2 | 2 | 1 | 2 | 1 | 1 | **13** | Go |
| PD7 | Payroll in the v3 anatomy, payday status | 1 | 2 | 2 | 2 | 2 | 2 | 1 | 1 | **13** | Go after Jose approves copy |
| PD8 | The Owner's business in the phone header | 1 | 2 | 2 | 2 | 2 | 2 | 2 | 2 | **15** | Go |
| PD9 | Owner-only pages explain themselves to Managers | 2 | 2 | 2 | 2 | 1 | 2 | 2 | 2 | **15** | Go |
| PD10 | Acknowledgement progress where Owners look | 1 | 2 | 2 | 2 | 1 | 2 | 2 | 2 | **14** | Go |

## Opportunities, ranked by impact

### PD1. Home "Coming up": payday and deadlines in date order

- **Page, role, width:** Home `/app`. Owner (payroll rows for payroll roles only) and Manager. 1440 and 390.
- **What it is today:** Home shows Finish setting up, Needs you (10), Working now and Shifts today. Pay doesn't appear anywhere on it (`text/payroll-qa-owner-1440-home.txt`). Payroll on the same account lists three completed periods with no payroll run, paydays Oct 6, Oct 13 and **Oct 20 (today)**, plus the Sep 21–27 run in "Review required" three weeks after its Sep 29 payday. Timecards says "Approvals open after Sunday, Oct 25". The Schedule says "West Office not planned". The Owner finds each of these only by opening its own page.
  - `SP/crops/PD1-home-1440-no-payroll.png`, `SP/crops/PD1-payroll-1440-overdue.png`
- **The upscale:** add a "Coming up" card under Needs you on desktop (left column, under the Needs you card) and a section after Working now on phones. It holds up to five rows in date order, each with a date, a plain line and one link:
  - "Today · Payday for Oct 12 – 18 · No payroll run yet" › Payroll (status pill: coral if payday passed, amber if within 2 days)
  - "Sun, Oct 25 · Timecard approvals open · 2 need review" › Timecards
  - "Before Mon, Oct 26 · West Office isn't planned" › Schedule
  - "Not set · Availability deadline" › Schedule
  - Overdue rows sort first with "Payday passed Sep 29" in the coral ladder colour. Rows carry no amounts, so Home shows no money (U7 rule).
  - Benchmark: Gusto Home's payroll deadline reminder ("Run payroll by … to pay your team on time") and its to-do list. Rippling and Square Team use the same pattern. I didn't re-check these on Mobbin today.
- **Why it matters:** the costliest mistakes an Owner can make are a late or wrong payroll and an unpublished week. Today NEVORA knows both and says nothing on the first screen. This card is the clearest step from a passive dashboard to a proactive one, and the reason an Owner opens NEVORA before payday.
- **Platforms:** desktop: card in the left column. Phones, mobile web, PWA: grouped list section with 44px rows. Same content offline-stale with its "Updated" stamp.
- **Effort:** M.
- **Needs:** Codex, to add payroll and deadline facts to the Home read, scoped to payroll roles (the Home read has no payroll today). Jose's approval of every payroll line, since payroll copy is locked.
- **Score reasoning:** U finds the deadline without opening four pages · F Gusto's anchor pattern · T text plus ladder, no money on Home · A rows are links with full text · B "trustworthy pay" trait · D deadlines don't date · C one read extension plus a card from the kit · Co nothing moves; every row links to today's page.

### PD2. One live truth: "On the clock" vs "Missing clock-out"

- **Page, role, width:** Home, Timecards, Inbox, Attendance. Owner and Manager. 1440 and 390.
- **What it is today:** at 11:17 PM four places tell four stories about the same two people:
  - Home's Working now lists Casey Rivera (on break) and Jordan Rivera (in at 9:12 PM).
  - Home's Shifts today draws both of their 9 AM–5 PM shifts as "no clock-in". Its axis stops at 5 PM, so the 9:12 PM punch, the night open shifts (12a–7a, 5p–12a) and the "Now, 11:17 PM" marker all fall off the chart.
  - Timecards files both under "Needs review · Missing clock-out" in amber while they're still working.
  - Attendance says "0 to review" while Home says 6 not clocked in.
  - `SP/crops/PD2-home-timeline-1440.png`, `SP/crops/PD2-timecards-390-missing-clockout.png`, `text/QAOWNER-1440-_view_attendance.txt`
- **The upscale:**
  - A person with an open punch reads "On the clock · since 9:12 PM" (grey, neutral) until their shift end plus the grace window passes. Only then does it become "Missing clock-out" (amber).
  - The Shifts today timeline fits the day's actual range (earliest shift or punch to latest, or the "now" line). It draws recorded time as a solid bar over the scheduled outline, punches outside a shift as their own bar labelled "Unscheduled", and open shifts as a dashed row. Each row links to that person's timecard.
  - Attendance and Home share one definition and the same counts. When they differ by design, the line says why ("Attendance counts clock-ins to correct, not missed shifts").
  - Benchmark: Homebase and When I Work timesheets show "Clocked in" live and keep exceptions for after the shift. Deputy's schedule overlays actual time on planned time.
- **Why it matters:** an Owner who sees "Missing clock-out" on someone they can see working stops trusting every other number. "Calm and verified" is NEVORA's main promise, and this is where it's won or lost every evening.
- **Platforms:** desktop timeline; phones keep the list (no timeline) with the same wording. Screen readers already get the row sentence ("Morgan Rivera, 7:00 AM to 3:00 PM, no clock-in"). Extend it with "on the clock since…".
- **Effort:** M.
- **Needs:** Codex, for a timecard status for open punches inside the shift window and for one shared attendance definition. The timeline range, punch bars and links are UI only. No payroll copy changes.
- **Score reasoning:** U stops false follow-ups · F live "clocked in" is standard · T removes contradictions · A text states, not colour · B calm and verified · D lasting · C status work on the server plus timeline UI · Co "Missing clock-out" keeps its name for real misses.

### PD3. Overtime check on the Schedule before publish

- **Page, role, width:** Schedule `/app/schedule`, Publish. Owner and Manager. 1440, then 390.
- **What it is today:** five people show "56h · over limit" in amber under their names. The grid header says "6 people · 336h". The page doesn't say what limit it means, how far over each person is, or what that costs. A `PROJECTED_OVERTIME_REVIEW` rule already exists (`src/lib/scheduling/operational-rules.ts:156`). Pay rates aren't stored; `src/lib/employee-compensation.ts:10-19` uses placeholder role rates.
  - `SP/crops/PD4-schedule-1440-over-limit.png`
- **The upscale:**
  - **Now, hours only:** a week summary under the grid reads "336h scheduled · 5 people over 40h · 80h over in total". Each "over limit" becomes "16h over 40h" with a tooltip or sheet naming the rule and linking to Scheduling rules. Publish shows the same line before it confirms.
  - **Later, with stored rates:** an "Estimated labour" figure per day and week, labelled as an estimate.
  - **With counsel:** Puerto Rico daily overtime (over 8h in 24h) and the seventh-day rule (`competitive-2026-10.md` §7.1).
  - Benchmark: Homebase and 7shifts show labour hours and cost in the scheduler footer and warn about overtime before publish. Gusto's scheduling add-on does the same.
- **Why it matters:** overtime is the cost an Owner controls at scheduling time. This is the clearest business value NEVORA can add on top of today's grid, and the start of the Puerto Rico rules pack (`direction.md` item 5) that no competitor ships.
- **Platforms:** desktop grid footer and publish step. Phones: the line in the week header and in the publish sheet.
- **Effort:** M (hours), L (cost and Puerto Rico rules).
- **Needs:** hours: UI on the existing rule, plus Codex if the per-person excess isn't in the read. Cost: Codex (stored pay rates) and Jose. Puerto Rico rules: labour counsel first.
- **Score reasoning:** U shows the consequence before it happens · F schedulers do it · T hours only until rates are real, so no invented money · A text, not amber alone · B Puerto Rico rules · D lasting · C small for hours, large for cost · Co the grid and labels stay; the line is added.

### PD4. Insights answers "planned vs actual"

- **Page, role, width:** Insights `/app/reports`. Owner and Manager. 1440 and 390.
- **What it is today:** the page opens on last week (Oct 12–18) and shows Recorded time 0h, People with time 0 of 13, Time off 0 days and Timecards to finish 13, plus an empty chart. It doesn't compare with the schedule, the previous week, hour targets or overtime. Roadmap Phase 7 promised hours against target, coverage by day, attendance exceptions (4 weeks), a time-off calendar and payroll cost.
  - `SP/crops/PD3-insights-1440.png`, `shots/QAOWNER-390-reports.png`
- **The upscale:**
  - Open on **This week so far**, with Last week one tap away.
  - Lead with one sentence: "Recorded 5h 11m of 336h scheduled · 2 people still on the clock".
  - The chart draws scheduled hours as an outline and recorded hours as a fill, by day.
  - Add a "Watch" list: over 40h, under target, repeated no clock-in (4 weeks).
  - When last week has 0h and 13 open timecards, name the gap with a link ("13 timecards from last week aren't finished. Finish them in Timecards") and don't let the 0h stand alone.
  - Every number links to its people (Phase 7 rule).
  - Benchmark: Deputy and When I Work scheduled vs actual reports. Gusto's labour-cost report.
- **Why it matters:** "Am I paying for the hours I planned?" is the question an Owner brings to Insights. Today the page can't answer it.
- **Platforms:** desktop two columns. Phones keep today's iOS-style grouped list with the sentence first. Each chart needs a text table equivalent; the day list already exists.
- **Effort:** M to L.
- **Needs:** Codex, for scheduled-vs-recorded aggregates by day and person. The default period and the "unfinished timecards" line are UI only.
- **Score reasoning:** U answers the core question · F standard report · T sources and stamps stay · A charts need the text table, so 1 · B neutral · D lasting · C new aggregates · Co same page, same period picker.

### PD5. Decisions show their consequences

- **Page, role, width:** time-off review (`/app/requests?…requestId=…`) and the Inbox no-clock-in detail. Owner and Manager. 390 and 1440.
- **What it is today:**
  - The time-off review shows dates, length and the note. Under "Before you decide" it sends you elsewhere ("See that week's schedule · Who else is working those days").
  - The no-clock-in detail for Morgan Rivera offers "Review timecard", which opens the whole Timecards page at an anchor (`/app/timecards#timecard-AUDIT-M`), and "View profile". It gives no way to reach Morgan and no history.
  - `SP/crops/PD5b-timeoff-review-390.png`, `SP/crops/PD5-inbox-detail-1440.png`
- **The upscale:**
  - **Time off:** an "If you approve" card inline, above Decline / Approve. "Fri, Oct 30: Alexandra has 8:00 AM – 4:00 PM at Main Office. It becomes an open shift." "1 other person is off that day." If the week isn't published: "Oct 26 – Nov 1 isn't scheduled yet." The links stay as secondary rows.
  - **No clock-in:** add Call and Text buttons (`tel:` and `sms:` from the phone number managers already see on Team), a line such as "First missed clock-in in 4 weeks", and open that person's timecard directly.
  - Benchmark: When I Work and Homebase show conflicts on the time-off approval. Homebase lets you contact a late employee from the alert.
- **Why it matters:** a demanding Owner wants to decide on one screen. Pages that send you off to find context feel unfinished next to Gusto's single-screen approvals.
- **Platforms:** phones: `tel:` and `sms:` open the system dialer and Messages (iOS, Android, PWA). Desktop: show the number with copy, since a desktop `tel:` often does nothing.
- **Effort:** M.
- **Needs:** the impact card needs a read of that person's shifts and others' time off for those dates (Codex if not in the review read). Call, Text and the direct timecard link are UI only. Decisions stay pending until the server confirms (Phase 4 rule).
- **Score reasoning:** U decides in place · F common in shift apps · T shows facts, decides nothing for you · A buttons with text labels · B neutral · D lasting · C one read plus UI · Co Decline and Approve stay where they are.

### PD6. The person page opens on an overview

- **Page, role, width:** Team member `/app/employees/[id]`. Owner and Manager. 1440 and 390.
- **What it is today:** opening Jordan Rivera lands on an edit form (Employee ID, name fields, role and status dropdowns, Save details). The page doesn't show that Jordan is on the clock now, is scheduled 56h and over limit this week, or has a timecard missing a clock-out.
  - `SP/crops/PD6-person-1440.png`
- **The upscale:** add an Overview tab first, with Details (today's form) second and Scheduling third. Overview holds:
  - Now: "On the clock since 9:12 PM · Main Office".
  - This week: scheduled hours against target, with the over-limit line from PD3.
  - Timecard: status for this period, linked.
  - Time off: upcoming and pending.
  - Contact: Call, Text, Email.
  - Access: Clocker PIN and Account recovery, as today.
  - Benchmark: Gusto's person profile opens on a summary, with editing one step in.
- **Why it matters:** Owners open a person to understand them, not to retype their name. A form as the first view also invites accidental edits to role and status.
- **Platforms:** desktop two columns. Phones: stacked grouped list. Deep links to `#details` keep working.
- **Effort:** M.
- **Needs:** mostly existing reads (schedule, timecards, attendance, requests), maybe a combined read from Codex.
- **Score reasoning:** U context in one place · F Gusto pattern · T fewer accidental edits · A standard tabs · B neutral · D lasting · C composes existing reads · Co the form moves one tab; keep `?tab=details` working, so 1.

### PD7. Payroll in the v3 anatomy, with payday status

- **Page, role, width:** Payroll `/app/payroll`. Payroll Owner. 1440 and 390.
- **What it is today:** Payroll still uses the older look. It has grey filled tiles for gross pay, deductions and contributions, a teal-filled card for the selected period (teal used for selection, against principle P1), a separate "Pay periods with no payroll run" block, and paydays in the past with no status beyond "Review required". The disclaimers are honest and good.
  - `SP/crops/PD1-payroll-1440-overdue.png`, `shots/payroll-qa-owner-1440-payroll.png`
- **The upscale:**
  - Bring Payroll onto the v3 kit: page band, `Card` and `Row`, ladder status pills, neutral selection (ink and the D4 segmented style).
  - Merge "no payroll run" periods and runs into one dated list. Each row carries a status: "Payday passed" (coral), "Payday today" (amber), "Approved" (green), "Waiting for amounts" (grey).
  - Keep the five-step stepper, the exact revision and every approved sentence word for word.
  - Benchmark: Gusto's payroll list (one dated list with status per run).
- **Why it matters:** the money page is where a client judges whether the product is serious. Today it's the one page that looks older than the rest.
- **Platforms:** desktop list and detail. Phones stacked, with the stepper vertical.
- **Effort:** M.
- **Needs:** **Jose's approval** (payroll page and any new status words). UI only otherwise, since the data is on the page today.
- **Score reasoning:** U finds the overdue run first · F Gusto list · T consistent and calm · A ladder with words · B "trustworthy pay" trait · D lasting · C restyle on the kit · Co layout changes on the most sensitive page, so 1; button names stay.

### PD8. The Owner's business in the phone header

- **Page, role, width:** phone shell, every Owner and Manager page. 390.
- **What it is today:** the phone Home is a large "Today" title over iOS grouped lists with filled colour icon tiles (red, orange, teal). Nothing on screen says NEVORA or names the company. It could be any iOS utility. Desktop shows the wordmark and the "Northside QA Workforce" switcher.
  - `SP/crops/PD8-home-390.png`
- **The upscale:** put the company's identity in the large-title area. Show the company logo or initial (from B1 branding, already contrast-safe through `derive.ts`) at 28px beside "Northside QA Workforce" in muted text above "Today". On Home only, add a footer line: "Updated 11:19 PM · Puerto Rico time". Keep the v3 grouped lists as they are.
  - Benchmark: Square and Shopify mobile put the merchant's name and logo at the top of Home.
- **Why it matters:** safe company branding at small-business tiers is a NEVORA edge (`competitive-2026-10.md` §7.4). An Owner who sees their own business in the app treats it as theirs, and the place-name time zone keeps the Puerto Rico trait visible. It also answers the "generic minimalism" risk without breaking v3.
- **Platforms:** phones, mobile web, PWA. In the store app later, the same header under the safe area.
- **Effort:** S.
- **Needs:** UI only (branding data exists). Confirm with Jose because it touches the approved v3 header.
- **Score reasoning:** U small, so 1 · F standard · T the Owner's own name reassures · A text plus logo with alt · B strongest brand gain per pixel · D lasting · C small · Co nothing moves.

### PD9. Owner-only pages explain themselves to Managers

- **Page, role, width:** `/app/payroll`, `/app/settings` and other Owner-only routes. Manager. Both widths.
- **What it is today:** as `AUDIT-M`, opening `/app/payroll` or `/app/settings` lands on Home with no message (`text/AUDIT-M-1440-payroll.txt` shows the Home text at URL `/app`). A shared link or a bookmark seems to "do nothing".
- **The upscale:** show a calm page in place: "Payroll is for Owners. Ask Fictional Owner if you need something here." with one link back to Home. Use the one empty-state shape from D6.
  - Benchmark: Gusto and Rippling permission pages name who can help.
- **Why it matters:** silent redirects look like a bug. A named reason looks deliberate and safe.
- **Platforms:** all. Same page at every width.
- **Effort:** S.
- **Needs:** UI and route handling. No data change; permissions unchanged.
- **Score reasoning:** U ends the confusion · F standard · T explains the boundary · A one heading, one link · B neutral · D lasting · C small · Co same permissions.

### PD10. Acknowledgement progress where Owners look

- **Page, role, width:** Updates list and the Inbox "Schedule not confirmed" row. Owner. Both widths.
- **What it is today:** the update detail says "0 of 5 acknowledged". The Updates list shows only "Acknowledgement required · Oct 20, 2026, 11:12 PM". The Inbox shows "Schedule not confirmed 5" with no link to the update.
  - `text/QAOWNER-1440-updates.txt`, `text/QAOWNER-1440-updates_059c46bc-2f99-45f8-a720-05d3c252d88e.txt`
- **The upscale:** show "0 of 5 acknowledged" on the list row with a text progress bar (the D3 `Progress` part). Link the Inbox row to the people who haven't confirmed.
- **Why it matters:** the Owner sent the update to get it read. Progress on the list closes that loop without opening each item.
- **Platforms:** all.
- **Effort:** S.
- **Needs:** UI, plus Codex if the list read lacks the counts.
- **Score reasoning:** U one glance · F read receipts · T delivery and reading kept distinct · A text value · B "verified" trait · D lasting · C small · Co same list.

## Quick wins (S, UI only, do first)

1. **PD9:** Owner-only pages explain themselves to Managers.
2. **PD8:** the company name and logo in the phone header (confirm with Jose because v3 is approved).
3. **PD5, the UI parts:** Call and Text on no-clock-in, and "Review timecard" opening that person's card.
4. **PD2, the UI parts:** Home timeline fits the real day range, shows the now line and open shifts, and each row links to its timecard.
5. **PD4, the UI parts:** Insights opens on This week so far and names unfinished timecards when a period shows 0h.
6. **PD3, hours only:** the per-person "16h over 40h" wording, if the rule's read already carries the excess.

## Leave as is

- **Inbox split view** with exceptions first, the condition as a pill, the action as a teal link and "Updated" plus Refresh. It's the best screen in the app.
- **One "Needs you" count** shared by Home and Inbox, with planning items listed but not counted.
- **The focused time-off review:** Back names its origin, the decision bar stays above the tab bar, and you return to where you came from with "The employee will be told."
- **The Schedule grid:** dashed open shifts, hours per person, sticky names, "Show 7 unscheduled".
- **Payroll's honesty:** "A draft doesn't finalize hours, approve amounts or send a payment", the stepper tied to one revision, and the approval checkbox naming the revision. Restyle around them (PD7). Leave the words alone.
- **Profile:** contact, locations and the alert list read clearly with the fixtures.
- **Settings hub** grouping and descriptions.
- **⌘K Search** in the desktop top bar and the phone header search.

## Not checked

- 768 width, VoiceOver, 200% text and a physical phone.
- Clocker recovery, Account recovery, Templates, Scheduling rules, Time exports and Settings subpages: captured (`shots/`, `text/`) but not studied for upscales.
- I took competitor patterns from `competitive-2026-10.md` and from what I already knew. I didn't re-check them on Mobbin this session.
- The Profile ready state came from fixtures, not the preview's database.
