# Phase 4 desktop inspection, round 1: type, colour and copy

October 19, 2026 · Inspector: type, colour and copy · Preview from `access.json` on fictional data · Source: worktree `p4-desktop-240fe0` (read only, nothing changed) · `S/` = `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p4-desktop-240fe0/55a133fe-0aa8-4472-a3aa-f939856da789/scratchpad/inspect/type-colour-copy/` (scripts `scan.mjs`, `pane.mjs`, `probe2.mjs`, `probe3.mjs`, `wk.mjs`; raw JSON in `S/data/`; screenshots in `S/shots/`, viewport captures at 2x)

## Verdict

**Not ready. There are 0 P0, 5 P1 and 10 P2 findings.** The new type is right where it's new: the sidebar groups, the trail, the Inbox pane, the All requests card and the Team table all use kit roles at the desktop sizes, and every text pair I measured passes contrast in Chromium and WebKit. The problems are in five places:
- **The pane's title disappears.** Once the list is scrolled, the sticky pane sits under the sticky header and its title is hidden.
- **The pane's note sends people to the wrong place.** For four kinds of item it says "see the schedule", but the button goes somewhere else.
- **The 14px floor rule shrank the Timecards figures.** It took them from 22px to 14px.
- **Raw ISO dates** ("2026-10-19–2026-10-25") show in the Inbox rows and the pane.
- **The Schedule week grid header** is still 10–12px at 1024 and 1440, though the brief says the roster is on the 14px floor.

Phones (320, 390) show no regression in type or copy.

`inspection/checks-round-1.txt` wasn't there when I finished, so nothing below has been cross-checked against the sweep. TCD-05 and TCD-11 are text-floor items the sweep may also report.

## Findings, worst first

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| TCD-01 | Inbox · both · 1024 and 1440 (Chromium) | Detail pane heading `#inbox-detail-title` once the list is scrolled | • The header `header.mobile-header` is `position: sticky; top: 0`, z 30, 78% white with blur, bottom at y 65.<br>• The pane sticks at y 16, so its title box is y 38–62, entirely under the header.<br>• `elementFromPoint` at the title returns the header, at both widths (scrollY 3391 and 3807).<br>• The title, which is also where focus lands after a row click, shows only as a blurred ghost behind "Search".<br>• The pane's avatar and the first line of its meta are covered too. | `S/shots/sticky-pane-1440.png`, `S/shots/sticky-pane-1024.png`, `S/shots/pane-chromium-AUDIT-M-1024-TIMECARD_AUDIT_BREAK_2026_10_19_2026_10_.png` | `src/app/app/premium-desktop.css:114`: `.inbox-side-column { position: sticky; top: var(--nv-s-4) }` ignores the 65px sticky header. | • `top: calc(65px + var(--nv-s-4))`. Better: a shared `--portal-header-h: 65px` on `.app-shell`, used here.<br>• So a tall pane plus card can still be reached, also give the side column `max-height: calc(100dvh - 65px - 32px); overflow: auto` (the stability inspector's call). | **P1** |
| TCD-02 | Inbox pane · both · 1024, 1440 | The pane's note `.inbox-detail__note` for planning and coverage items | Every `scheduling` item gets one note, "Open it to see the schedule and fix it there.", whatever its button does:<br>• **No weekly hour target:** the button goes to `/app/schedule/settings` (Scheduling rules), not the schedule.<br>• **Availability not sent:** the button goes to `/app/availability`, not the schedule. And the manager can't "fix" someone else's availability.<br>• **Schedule not confirmed:** only the employee can confirm it.<br>• **Coverage gap:** the button goes to `/app/schedule/coverage`.<br>That's 4 of the 5 planning kinds. In this fixture it's 27 Plan ahead rows plus 21 coverage gaps. | `S/shots/sticky-pane-1440.png` (No weekly hour target), `S/shots/pane-chromium-AUDIT-M-1024-AVAILABILITY_AUDIT_BREAK.png` | `src/components/manager-inbox.tsx:81-85` (`categoryNote` keyed by category) and `:97` | Key the note by item type, in plain words:<br>• `COVERAGE_GAP`: "Open the gap to see who can cover it."<br>• `TARGET_MISSING`: "Set it in Scheduling rules."<br>• `AVAILABILITY_MISSING`: "Only {name} can send it. Open Availability to see the week."<br>• `ACKNOWLEDGEMENT_MISSING`: "Only {name} can confirm it. Open the schedule to see what they were sent."<br>• `DEADLINE_MISSING`: "Set it on the schedule."<br>Or drop the note where the button already says it. | **P1** |
| TCD-03 | Timecards · both · 768–1440 | Stat strip figures `dl[class*="__overview"] dd` ("12", "2", "0") | • The figures are 14/20 at 600, the same size as their labels (14/20 at 400).<br>• With the Phase 4 floor rule removed in the page, they return to 22/28.<br>• Schedule's identical strip (`dl.mws-week-summary dd`, "42 / 6 / 336") is 22/28 at 600 at 1440.<br>• So the floor rule demoted a figure to body text, and two sibling pages now disagree. | `S/shots/chromium-AUDIT-M-1440-_app_timecards.png` against `S/shots/chromium-AUDIT-M-1440-_app_schedule.png` | `src/app/app/premium-desktop.css:172`: the selector `dl > div > dd` (meant for detail fact lists) also matches the overview strip | • Exclude the strip from the list: `dl:not([class*="__overview"]) > div > :is(dt, dd)`.<br>• Or restore it explicitly: `[class*="timecards-module"][class*="__overview"] dd { font: 600 1.375rem/1.75rem var(--nv-font) }`, matching Schedule. | **P1** |
| TCD-04 | Inbox list (all widths) and pane (1024+) · both | Timecard items, "Period timecard needs review" | • The meta reads "Casey Rivera · 2026-10-19–2026-10-25 · Resolve recorded-time exceptions before finalizing.": raw ISO dates, unspaced, in kit text.<br>• It wraps to 3 lines in the row and 4 in the pane at 1024.<br>• Then the pane note says "Open it to see the recorded time and review it there." That's "review" twice, next to "needs review".<br>• Not seen in Phase 2. These items come from the Oct 19 seed. | `S/shots/pane-chromium-AUDIT-M-1024-TIMECARD_AUDIT_BREAK_2026_10_19_2026_10_.png` | • `src/lib/action-center/present.ts:40-64` has no `TIMECARD` case.<br>• The raw string is built in `src/lib/action-center/project.ts:14`. | • In `presentItem`, add `case 'TIMECARD'`: title "Timecard to review", detail `${name} · Oct 19 – Oct 25` (Intl `month: short, day: numeric`, NBSP inside each date, `NBSP– ` between).<br>• Keep "Resolve … before finalizing." out of the meta, or as the pane note.<br>• The `present.ts` owner applies it; the server string stays. | **P1** |
| TCD-05 | Schedule (week) · both · 1024 and 1440 | Week grid header `.mws-grid-heading` | • "Team member" is 12px; day names "Mon"–"Sun" are 11px in #5F6368; "Today" is 10px at 600.<br>• That's under the 14px desktop floor the brief says now applies to the roster.<br>• Roster avatars are 11–12px (accepted before as avatar initials, so not counted).<br>• The date figures are 18px. | `S/shots/chromium-AUDIT-M-1024-_app_schedule.png` | • `src/app/app/schedule/manager-schedule.css:77`, `:78` and `:80` set 12, 11 and 10px.<br>• They aren't in the floor list at `premium-desktop.css:163-166`. | Add `.mws-grid-heading > span, .mws-grid-heading > div > span, .mws-grid-heading small` to the `premium-desktop.css:163` list (`.875rem/1.25rem`). | **P1** |
| TCD-06 | Home's views · both · 1024, 1440 | Top-bar trail on `/app?view=team`, `?view=attendance`, `?view=activity` | • The trail reads "Plan › Home", with Home marked `aria-current="page"`, while the h1 is "Team overview", "Attendance" or "Schedule activity".<br>• The brief says the trail ends with the page's own name. Every other folded page does: "Plan › Inbox › Time off", "Time and pay › Timecards › Time exports", "Plan › Schedule › Templates". | `S/shots/chromium-AUDIT-M-1440-_app_view_team.png` | `src/components/app-shell.tsx:79-81`: `deeper` and `pageItem` compare only `pathname`, so `?view=` is invisible to the trail | When `pathname === "/app"` and `view` is set, render "Plan › Home[link] › {view title}[current]", using the same titles as the view chips: "Attendance", "Team overview", "Schedule activity". | P2 |
| TCD-07 | Inbox · both · 1024+ (card); Time off page · both | "All requests" means two things | • The new Inbox card "All requests" lists the Time off, Shift requests and Availability pages.<br>• The Time off page's own link "All requests →" goes to `/app/inbox?filter=requests`, the pending Requests filter.<br>• So "All requests" on each page sends you to the other, and neither is all requests. | `S/shots/chromium-AUDIT-M-1440-_app_inbox.png`, `S/shots/chromium-AUDIT-M-1440-_app_requests.png` | • `manager-inbox.tsx` `AllRequests()` (`title="All requests"`)<br>• `src/components/manager-time-off.tsx:105` (Wave A's file) | • Rename the Inbox card, which this session owns: "Requests by type" (rows unchanged).<br>• Ask Wave A to make its link "Requests in Inbox". | P2 |
| TCD-08 | Inbox pane · both · 1024, 1440 | Shift pane: "Not clocked in" and "No clock-in" rows | The pane says each thing twice or three times:<br>• The meta "Started 7:00 AM · Main Office" repeats the facts "Shift 7:00 AM – 3:00 PM" and "Location Main Office".<br>• The pill "Not clocked in", the fact "Clock-in: None yet" and the note "…there’s no clock-in yet" say the condition three times.<br>• Of the pane's 7 lines of text, 3 are repeats. | `S/shots/chromium-AUDIT-M-1440-_app_inbox.png` | `src/components/manager-inbox.tsx:113-116` (`shiftEntry` meta, facts and note) with `InboxDetail` rendering all of them | • In `InboxDetail`, don't render `meta` when `facts` exist.<br>• Drop the "Clock-in" fact (the pill states it).<br>• Note: "Check in with them, or look at the Clocker." / "Check the timecard before you approve it." | P2 |
| TCD-09 | Timecards details · both · all widths | Attention list item "Missing clock out" | • A blame word the product rules forbid ("missing"). It's also unhyphenated, where Home and Inbox write "clock‑in".<br>• Shown in the open "Needs attention" list for Casey Rivera at 1440. | `S/data/chromium-AUDIT-M-1440-_app_timecards.json` (y 948) | `src/components/timecards.tsx:21` (`open_entry: 'Missing clock out'`), the coordinator's file | `open_entry: 'No clock‑out yet'` (U+2011). The coordinator applies it. | P2 |
| TCD-10 | Desktop shell · both · 768–1440 at 200% text | Sidebar group labels, nav labels, "Powered by" line, top-bar trail | • At root 200%, page text doubles (Team names 32px, columns 28px), but the sidebar group labels, nav labels, footer and trail stay 14px.<br>• The new group labels and footer were set in px by Phase 4. The comment above the floor rules says "in rem so it follows text size". | `S/shots/team-1440-200.png` | • `premium-desktop.css:130-131` (`14px/1.4`)<br>• `src/app/app/portal-desktop.css:31` (trail `500 14px/1.3`)<br>• nav labels: legacy shell px | Use `.875rem` with line heights in rem (`1.25rem`) for the group labels, footer, trail and `.nav-label`. | P2 |
| TCD-11 | Desktop header · both · 768–1440 (also phones) | Bell count `.portal-notification-count` "2" | It's 10/13px at 600, under the 12px number-badge floor. The Inbox count badges are 12/16. | `S/shots/chromium-AUDIT-M-1440-_app_inbox.png` (bell) | `src/app/app/portal-design-system.css:42` | `font: var(--nv-t-badge)` (12/16, 600), keeping the 18px minimum width. | P2 |
| TCD-12 | Desktop sidebar · both · 768–1440 | Brand lockup "Workforce" `.login-brand-module` | • It's 10/15px and fixed.<br>• On phones the same lockup has been 13/16 in rem since TC-15.<br>• Judgment call: it's part of the logo lockup, which the old TC-15 accepted only once it was moved to 13px. | `S/shots/chromium-AUDIT-M-1440-_app_employees.png` (top left) | `src/app/app/portal-refinement.css:58` (desktop); the phone override at `portal-premium.css:384` is header-only | Apply `.8125rem/1rem` to `.sidebar .login-brand-module` too, or draw "Workforce" in the wordmark SVG. | P2 |
| TCD-13 | Desktop account menu · both · 1440 | Menu items "Your profile", "Your pay statements", "Sign out" | • "Your pay statements" opens a page whose h1 and trail say "My pay", and the phone More sheet says "My pay". That's two names for one page.<br>• The items are 14/20.3 at weight **450** in #1C1C1C. The kit label is 500 in #16191C, and the phone More sheet was moved to kit type in TC-08. | `S/shots/chromium-QAOWNER-account-menu.png` | • `src/components/app-shell.tsx:253`<br>• weight 450 from `.nevora-action-menu-item` in `src/app/app/portal-design-system.css` | • Label it "My pay", to match the page and phones.<br>• `html body .app-shell.nevora-portal .portal-account-menu .nevora-action-menu-item { font: var(--nv-t-label); color: var(--nv-ink) }` | P2 |
| TCD-14 | Time exports · both · 768–1440 | Employee names `form.employee-form > fieldset > legend` | Names are 14/20 at 600 in #1C1C1C. Timecards names are 16/500 in ink, and kit row titles are 16/22/500, so one person's name has two styles on two sibling tabs. Judgment call: the floor rule only lifted these to 14. | `S/data/chromium-AUDIT-M-1440-_app_payroll-export.json` (y 4489+) | `premium-desktop.css:172` (`legend` gets `.875rem` only) | `…premium-exports form.employee-form > fieldset > legend { font: var(--nv-t-row); color: var(--nv-ink) }` | P2 |
| TCD-15 | Team · both · 1440 | Table column widths | • "María José Rivera Santiago With A Long Name" wraps to 2 lines in the Name column (text x 370, column about 293px).<br>• The Role column holds only "Employee" or "Owner" (about 75px) in about 195px.<br>• Judgment call: the table reads well otherwise. | `S/shots/chromium-AUDIT-M-1440-_app_employees.png` | `premium-desktop.css:145` (`1.5fr 1fr 1.2fr 1fr`) | `grid-template-columns: minmax(0,2fr) minmax(0,.8fr) minmax(0,1.2fr) minmax(0,1fr)`, which puts the long name (about 345px at 16px) on one line at 1440. | P2 |

Judgment notes (not counted):
- **Trail separators.** The "›" separators are #D7D9DC on white (1.41:1). They're decorative and older than Phase 4, but they're the only thing that separates "Plan" from "Inbox". #9AA0A6 would give 2.6:1 and keep them quiet.
- **Trail names.** The trail ends with the sidebar label, not the h1, on Wave A and B pages: "Availability" for "Team availability", "Templates" for "Schedule templates". Acceptable: the trail names the place, and the h1 adds a qualifier.
- **"Updates" under People.** It's filed in the People group. Announcements to people fit there, so I accept it.
- **"Check in with them".** It sits next to "clock-in" in the shift note. That's a pun risk, but it's clear in context.
- **"Period timecard needs review"** shows for the current, still-open week. That's a data and flow question, not wording.
- **Exports disabled controls.** "Select finalized", "Clear" and "Generate reviewed export" on Time exports are #6B7280 on #EEF1F0 or #F3F4F6 (4.25 and 4.39:1). They're disabled while nothing is selected, so they're exempt. Payroll and export wording is deferred anyway.

## Checked and correct

- **Sidebar groups (Chromium and WebKit):**
  - Wording is "Plan", "People", "Time and pay" and "Workspace", plain sentence case, at 14/19.6 weight 500 in #5F666A (5.84:1).
  - The entry reads "Team"; the Team page h1, the phone tab and the trail ("People › Team") all agree.
  - Requests has left the sidebar for both roles.
  - "Powered by VELANI LLC" is 14/19.6 at 400 in #5F666A.
- **Trail:**
  - "Plan › Inbox › Time off", "Plan › Inbox › Shift requests", "Plan › Inbox › Availability", "Time and pay › Timecards › Time exports", "Plan › Schedule › Templates", "People › Updates", "Time and pay › Insights", "Workspace › Settings" and "My pay".
  - The middle entry is a link and the last is `aria-current`.
  - At 768 and 1024, only the last entry shows ("Team", "Inbox"), with no leading separator.
  - It's 14/18.2 at 500, with #1C1C1C for the current entry and links, and #5F6368 for groups (6.05:1).
- **Inbox pane type (1024 and 1440, Chromium and WebKit identical):**
  - title 18/24/600 #16191C (title-3)
  - meta 14/20 #5F666A
  - fact labels 14/20/500 muted; values 16/22/500 ink, right-aligned, one line, times kept whole ("7:00 AM – 3:00 PM")
  - note 14/20 #3E4347 on #EEF1F0 (8.8:1)
  - button 16/22/600, white on #077572 (5.53:1)
  - The long name wraps to 3 balanced lines at 1024 (315px pane) and 2 at 1440. No clamp or ellipsis anywhere: 0 clipped elements across every snapshot.
- **Selected row:**
  - Wash #E7F3F2, with the 3px edge #077572 (5.53:1 on white, 4.87:1 on the wash), and `aria-current="true"` on every row I selected (49 to 53 per run).
  - On the wash: title #16191C 15.55:1, meta #5F666A 5.15:1, teal action 4.87:1.
  - The wash alone is 1.14:1 against white, so the edge carries the selection, as intended. Focus moves to `#inbox-detail-title` after each click.
- **Pane wording:**
  - The request pane's "The dates, the length and any note are on the request. Approve or decline it there." is right while the facts wait for Codex (CODEX.md item 3).
  - The past-item note uses a curly apostrophe ("doesn’t").
  - No "missing", "missed" or straight apostrophe anywhere in kit text on any Phase 4 page, for either role (scan of every snapshot).
- **All requests card:** title 16/22/600. Rows "Time off" / "Pending, approved and declined", "Shift requests" / "Swaps and shifts people can’t work" (curly apostrophe), "Availability" / "When people can work". Rows 16/22/500 and meta 14/20 muted. It sits under the list at 768 and under the pane from 1024, and isn't on phones.
- **Team table (1024+, Chromium and WebKit):**
  - Headers "Name", "Role", "Location" and "Phone" in sentence case, 14/20/500 muted.
  - Cells 16/24 #3E4347; names 16/22/500 ink.
  - Header and cell x positions match exactly (370 / 679 / 890 / 1141 at 1440).
  - The dot separators are hidden on desktop. Phones and 768 keep "Employee · Main Office · 787-555-0101" on one line.
- **Kit roles at desktop:**
  - Every band title, card title, row, callout, pill and link on Home, the three views, Inbox, Team and Owner Payroll is at 14px or more.
  - The only text under 14px is the number badges (12/16), the ⌘K hint (12) and avatar initials (12): all accepted before. TCD-05, TCD-11 and TCD-12 are the exceptions, listed above.
- **Counts agree:** Owner Home "26 things need you today." = Inbox "4 shifts with no clock-in, 21 coverage gaps and 1 request" = Act now 25 + Requests 1. Home's "Showing 3 of 22" = 21 gaps + 1 request.
- **Phones (320 and 390, both roles; Home, Inbox, Team, Timecards):**
  - Kit text is 15px or more; tab labels 13; badges 12.
  - No All requests card, Team column header or pane on phones.
  - No clipped text; no contrast failures.
  - The bell count (10px) is the same on phones; it's filed once, as TCD-11.

**Not covered in this round:**
- 200% text only on Team at 1440, not Home or Inbox.
- The paused and offline states and the forced 401: the interaction inspector's area. The pane placeholder has no visible text.
- Employee and Lead shell pages.
- Owner 768/1024 beyond Home, Inbox, Team, Schedule, Timecards and Exports (I stopped the full sweep early because of server load).
- WebKit only at 1440, on Inbox and Team.

## Note on method

The preview was under heavy load (load average 14–29; many 500s and 90s timeouts, each retried once and not filed). For part of the run, two of my own scans overlapped by mistake: a stopped process didn't exit. No result depends on that overlap; every finding was re-measured in a single-browser run.

Open: 0 P0, 5 P1, 10 P2

## Round 2

October 19, 2026 · The latest build on the same preview · Scripts `r2a.mjs` (re-checks), `scan-r2.mjs` (Employee and Lead sweep), `wk2.mjs` (WebKit). Data and crops are under `S/r2/`.

### How it was measured

- **Re-checks.** Owner `QAOWNER`, Chromium, 1440 and 1024:
  - Inbox: I selected one row of each item type and checked the pane.
  - Timecards, Time exports, Payroll runs, Schedule and Team.
  - The shell at 200% text.
  - The trail on Home's views.
  - The account menu.
- **Employee and Lead, first pass:**
  - **1440:** `AUDIT-E` and `AUDIT-LEAD` on all 14 URLs in ROUND-2.md; `AUDIT-ON`, `AUDIT-BREAK` and `AUDIT-LONG` on Home.
  - **1024 and 768:** `AUDIT-E` on all 14 URLs; `AUDIT-LONG` on Home, Profile and My schedule; `AUDIT-LEAD` at 1024 on Home, My schedule, My time and Timecards.
  - **Phones:** `AUDIT-E` at 390 and 320 on Home, My schedule, Requests, My time and Profile.
  - **WebKit spot check at 1440:** My time, Requests and My schedule.
- **Server load.** Load average was 8–20. One page, `AUDIT-LONG` Home at 768, came back in its failed-read state, and I used that capture for the trail.

### Status of round 1 findings

| ID | Status | Measured now |
|---|---|---|
| TCD-01 | Fixed | • The pane sticks at y 81, below the 65px header.<br>• On every selected type, scrolled up to 6111px, `elementFromPoint` on the title returns the title, at 1440 and 1024. `S/r2/shots/owner-pane-1440-TIMECARD.png` |
| TCD-02 | **Partly fixed** | Now right:<br>• No weekly hour target: "Set a weekly hour target in Scheduling rules." (button: `/app/schedule/settings`)<br>• Availability not sent: "Only they can send it. Open Availability to see who hasn’t."<br>• Schedule not confirmed: "Only they can confirm it. Open the schedule to see who hasn’t."<br>• Timecard: "Open the timecard to check it before it’s approved."<br>Still wrong, two problems:<br>• **"Availability deadline not set"** says "Set when this week’s schedule is due in Scheduling rules." It names the wrong thing: the item is the availability cutoff, and its meta says so ("Set the availability deadline before employees finalize availability."). It also names the wrong place: "Set deadline" goes to `/app/schedule?week=…#schedule-deadline`, not Scheduling rules.<br>• **Coverage gap** says "No one is scheduled for this yet." That's false whenever a gap is only partly short, and for the "No lead scheduled at …" and "Position not covered at …" titles, which `present.ts:61` maps to the same type.<br>Cause: `src/components/manager-inbox.tsx:83` and `:88`.<br>Fix:<br>• `DEADLINE_MISSING`: "Set the availability cutoff on the schedule."<br>• `COVERAGE_GAP`: "Open the coverage gap to see who can fill it."<br>Still **P1**. `S/r2/shots/owner-pane-1440-SETUP.png` |
| TCD-03 | Fixed | The overview figures are 22/28 at 600, the same as Schedule's strip. |
| TCD-04 | Fixed | • "Casey Rivera · Oct 19 – Oct 25 · Fix recorded-time issues before finalizing." (`present.ts:20-29`)<br>• 2 lines in the 1024 pane, and no ISO dates anywhere. |
| TCD-05 | Fixed | "Team member", "Mon" and "Today" are 14/20; date figures 18. |
| TCD-06 | Fixed | "Plan › Home[link] › Team overview[current]". |
| TCD-07 | Fixed | • "Request pages" is now a compact row of three links (Time off, Shift requests, Availability) at 16px, at the top of the list.<br>• Its title is kept for screen readers only.<br>• It shows as 1 row at 1440 and 2 rows at 1024. |
| TCD-08 | Fixed | The shift pane says each thing once:<br>• title, then the "Not clocked in" pill<br>• facts: Shift "7:00 AM – 3:00 PM", Location "Main Office"<br>• note "Check in with them, or look at the Clocker."<br>• Contact / Open timecard |
| TCD-09 | Fixed in this branch | `timecards.tsx:21` now reads "No clock-out yet". |
| TCD-10 | Fixed | At 200% text: group labels 28/40, nav 28, footer 28, trail 28, "Workforce" 26. |
| TCD-11 | Fixed | The bell count is 12/16 at 600 on desktop (Employee pages, count "3"). `premium-desktop.css:335`. |
| TCD-12 | Fixed | "Workforce" is 13/16 in rem (`premium-desktop.css:337`). |
| TCD-13 | Fixed | Items "Your profile", "My pay", "Sign out" are 14/20 at 500 in #16191C. A new item on the same menu is filed as TCD-19. |
| TCD-14 | **Partly fixed** | • Names on Time exports are now 500 in #16191C, but still **14/20**, while Timecards names are 16/22.<br>• The new row-role rule (`premium-desktop.css:321`) sets `font`, but the older floor rule at `:169-174`, which still lists `form.employee-form > fieldset > legend`, outranks it and pulls the size back to `.875rem/1.25rem`.<br>• Fix: remove `form.employee-form > fieldset > legend` from the `:172` list.<br>Still P2. |
| TCD-15 | Fixed | "María José Rivera Santiago With A Long Name" is on 1 line in a 367px Name column at 1440. Columns at x 364 / 747 / 910 / 1146 match their cells. |

### New findings

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| TCD-16 | Employee and Lead desktop pages · `AUDIT-E`, `AUDIT-LEAD` · 768, 1024, 1440 (WebKit the same) | Legacy text inside the kit pages | About 45 text roles per width are under the 14px desktop floor, and the same ones on every page at all three widths:<br>• **My time:** body notes ("No open time entry…", "Use your location’s Clocker…", "Today’s totals…", "No earlier entries.") 13/21.45; the "Updated Oct 19, 2:16 PM · Puerto Rico time · Updates every 30s while active." footer 12/19.8; metric labels 13.<br>• **Home (clock card):** "Refresh" and "My time" 13; "Times in Puerto Rico time" 12/18.<br>• **My schedule:** "Request a swap" and "Unable to work" 13/600; the 5-line note "Your shift stays yours…" 12/18; "Today" 12/600; "2026 · Puerto Rico time" 13; Lead "Designated lead" 12.<br>• **Time off (form side summary):** "Manager review comes next" and "Track the decision…" 12/19.8; "Your dates will appear here." 13.<br>• **Availability:** "Choose the days…" and "No available hours" 13; "An end time of midnight…" and "Your saved usual week." 12.<br>• **Timecards:** "Period start" and "Period end" labels 13; "Oct 13, 2026 – Oct 19, 2026" 12; metric labels and issues 13.<br>• **Profile:** setting descriptions and notes 13.<br>• **Updates:** "Review update" 12; footnote 12.<br>On phones the same lines are 15px (Phase 3). | `S/r2/shots/chromium-AUDIT-E-1440-_app_my-time.png`, `S/r2/shots/chromium-AUDIT-E-1440-_app_schedule.png` (shift options opened) | The legacy page sheets set `calc(12–13 * var(--type-unit))`, and Phase 3's kit fixes apply only under 761px. Examples:<br>• `src/app/app/my-time/my-time.css:46`<br>• `src/app/app/availability/availability.css:107`<br>• `src/app/app/requests/time-off.css:48`<br>• `src/app/app/schedule/employee-schedule.css:49`<br>• `src/app/app/profile/profile.css:59`<br>• `src/components/updates-review.css:48` | In `premium-desktop.css`, add an Employee and Lead desktop floor in the style of `:169`: `html body .app-shell.nevora-portal.nevora-portal.employee-shell .page-frame.page-frame [data-nv-page] :is(p, small, dt, label, .my-schedule-link, .employee-time-refresh, .employee-time-link, .updates-row-action, .employee-designated-lead, .employee-agenda-date small) { font-size: max(.875rem, 1em) }`. Or list the selectors above with `font: var(--nv-t-callout)`, and `var(--nv-t-label)` for the links. Badges and avatars stay as they are. | **P1** |
| TCD-17 | Every Employee or Lead page · `AUDIT-LONG` · 768 | Top-bar trail beside a long account name | • The account button shows the full name "María José Rivera Santiago With A Long Name" (310px at 14px, from x 392).<br>• The trail's only entry, "Home" (text box x 244–284), is cut mid-letter at about x 279 and reads "Hom", with no ellipsis.<br>• The same squeeze happens on every page at 768 for this account. | `S/r2/shots/chromium-AUDIT-LONG-768-_app.png` | • The account name has no width limit at narrow desktop widths.<br>• `portal-premium.css:72` puts `text-overflow: ellipsis` on `li:last-child`, but that `li` is `display: flex` (`portal-desktop.css:34`), so no ellipsis is drawn. | • At 761–1100: `.portal-account-menu .button > span:not(.portal-account-avatar) { max-width: 12rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap }`. The full name stays in the menu heading.<br>• Make the last trail item `display: block` so its ellipsis works. | **P1** |
| TCD-18 | Account menu · all roles · 768–1440 | Menu heading "Signed in as Fictional Owner" | It's 12/16.8 in #5F6368, under the 14px floor. The items under it are 14/20/500. | `S/r2/shots/owner-menu-1440.png` | `src/app/app/portal-gusto.css:197` (`font: var(--g-t-caption)`) | `#portal-account-menu .portal-account-heading { font: var(--nv-t-callout); color: var(--nv-muted) }` (14/20 on desktop). | P2 |
| TCD-19 | My time, My pay, Timecards · Employee and Lead · 768–1440 | Pay section tabs in the band | • The tabs read "Statements · Hours · Timecards".<br>• Beside them, the sidebar, the trail and the h1 say "My pay" and "My time".<br>• So "Hours" opens a page titled "My time", and "Statements" opens "My pay": two names for one page, side by side on desktop. (Payroll wording is deferred, but these are navigation names.) | `S/r2/shots/chromium-AUDIT-E-1440-_app_my-time.png` | `src/lib/navigation.ts:210-211` (section tab labels) against `:33-41` (sidebar labels) | Use one name per page: tabs "My pay · My time · Timecards", or rename the sidebar entries to "Statements" and "Hours". The tabs are shared with phones, so the coordinator decides. | P2 |
| TCD-20 | Employee Home · `AUDIT-E` · all widths | Band summary next to the clock card | The band says "On shift until 4:00 PM." while the pass says "Scheduled now" and the Clock status card says "Off clock". "On shift" reads as working. Judgment call. | `S/r2/shots/chromium-AUDIT-E-1440-_app.png` | `src/components/employee-home-reviewed.tsx:278` | "Scheduled until 4:00 PM." while not clocked in; keep "On shift until…" for `AUDIT-ON`. | P2 |
| TCD-21 | My schedule · Employee · 1440 | "What changed in your schedule" line | "After: Oct 19 · 8:00 AM – 4:00 PM · Main" / "Office · Customer Support". The location name breaks inside itself. | `S/r2/shots/chromium-AUDIT-E-1440-_app_schedule.png` | `src/components/schedule-publication-change.tsx:11`: `keepWhole()` protects dates and times, but not location or position names | Join each part with NBSPs inside the part (or wrap each in `nv-nowrap`), and break only at " · ". | P2 |

Checked and correct in round 2:
- **Section tabs inside the teal band** (Timecards, Payroll runs, Time exports, Payroll settings; Requests overview, Time off, Shift requests, Availability; Statements, Hours, Timecards):
  - Unselected tabs are #CFE3E1 on #1C4A47 (7.42:1) at 14/20/500.
  - The selected tab is white at 600 (9.91:1), with a white underline and `aria-current="page"`.
  - Chromium and WebKit are identical.
- **Request pages** row, the rewritten pane notes (except TCD-02) and the shift pane: all in plain sentence case with curly apostrophes.
- **Wording:** no "missing", "missed" or straight apostrophe in any Employee or Lead page text at any width.
- **Employee and Lead kit roles at desktop:**
  - band titles 32/40
  - card titles, rows and links 16, meta 14
  - Home's "3 items need your review" link on the title row
  - "Hi, María José." for `AUDIT-LONG`, on one line
  - the Profile name on 2 lines at 768, not clipped
- **Clipping:** none, except the Updates preview's intended 2-line clamp at 768.
- **Phones (320 and 390, `AUDIT-E`):**
  - Kit text is 15px or more, and tab labels are 13.
  - No clipping.
  - No Phase 4 element shows on phones.
  - The phone bell count is still 10px. That's the phone header, so it's the coordinator's.

**Not covered:**
- Employee and Lead at 200% text.
- Lead pages at 768.
- Paused, offline and 401 states on Employee pages (the interaction inspector's area).
- WebKit only on three Employee pages at 1440.

Open: 0 P0, 3 P1, 5 P2

## Round 4

October 19, 2026 · Build `a6f009d` on the same preview · Scripts `r4a.mjs` (re-checks), `scan-r4.mjs` (sweep) and `r4b.mjs` (line breaks, cascade, retries). Data and crops are under `S/r4/`.

### How it was measured

- **Re-checks (Chromium):**
  - Owner Inbox at 1440: one row of each item type selected, pane read.
  - Time exports names, read through CDP `CSS.getMatchedStylesForNode`.
  - The account menu.
  - The header and trail for `AUDIT-LONG` at 768, 1024, 1099 and 1101; Owner at 768; Manager at 1024.
- **Employee and Lead floor sweep:**
  - **1440:** `AUDIT-E` and `AUDIT-LEAD` on all 14 URLs; `AUDIT-ON` and `AUDIT-BREAK` on Home.
  - **768:** `AUDIT-E` on all 14 URLs.
  - **1024:** `AUDIT-LEAD` on Home, My schedule, My time, Timecards and Time off.
- **Phones:** 320 and 390, `AUDIT-E` and `AUDIT-M`, on Home, My schedule, My time, Inbox and Team.
- **Retries.** Two pages failed under load (`AUDIT-E` Requests overview and Shift requests at 1440). I retried each once in a separate run, and both loaded.

### Status of open findings

| ID | Status | Measured now |
|---|---|---|
| TCD-02 | Fixed | • "Availability deadline not set" now says "Set when availability is due for this week, on the Schedule." That names the right thing and matches its button (`/app/schedule…#schedule-deadline`).<br>• The coverage gap says "This shift still needs people. Open the coverage gap to fill it." That's true for partly short gaps too. ("Shift" for a time window is a judgment call I accept.)<br>• The other notes are unchanged and still correct. `S/r4/shots/owner-pane-SETUP.png` |
| TCD-14 | **Not fixed** | • Names on Time exports are still **14/20** at 500 in #16191C; Timecards names are 16/22.<br>• CDP shows three rules setting the legend's size, in cascade order:<br>  1. `.employee-form legend` (12px)<br>  2. the new row-role rule (`premium-desktop.css:323`)<br>  3. the floor rule (`premium-desktop.css:163-174`), which wins. Its `:is(…)` carries the specificity of its heaviest selector.<br>• Fix: take `form.employee-form > fieldset > legend` out of the `:174` list, or move that legend's size into the `:323` rule as `font-size: 1rem` with the same prefix as the floor rule.<br>P2. |
| TCD-16 | **Partly fixed** | Now 14px at 768, 1024 and 1440:<br>• Home clock notes (14/20, "Refresh" 14/20/500)<br>• My time entries and footer (14/20)<br>• Time off summary (14/20)<br>• Availability hints (14/20)<br>• Timecards labels (14/20/500)<br>• Profile notes (14/20)<br>• My schedule "Today" (14/24/600)<br>• the shift options note<br>• Updates footnote (14/20)<br>One left: **"Review update"** on Updates rows (`AUDIT-LEAD`, 1440) is 12/24 at 500. It shows from 1101px (it's hidden at 1100 and below by `updates-review.css:85`).<br>• Cause: `src/components/updates-review.css:41` (`calc(12 * --type-unit)`), and `.updates-row-action` isn't in the floor list at `premium-desktop.css:398+`.<br>• Fix: add `.updates-row-action` to that list.<br>Now P2 (one label). |
| TCD-17 | Fixed | • At 768, `AUDIT-LONG`'s name gives way: it's 128px with an ellipsis ("María José River…", scrollWidth 310).<br>• The trail "Home" is whole (40px, nav 216px), and so are "Profile" at 768 and "My schedule" at 1024.<br>• At 1101 the full trail returns and the name is 192px with an ellipsis.<br>• Short names aren't truncated: "Fictional Owner" 105px and "Morgan Rivera" 97px. `S/r4/shots/hdr-AUDIT-LONG-768_app.png` |
| TCD-18 | Fixed | "Signed in as Fictional Owner" is 14/20 at 400 in #5F666A (5.84:1), above items at 14/20/500. |
| TCD-19 | Fixed | The Pay tabs read "My pay · My time · Timecards" (`navigation.ts:211-212`), matching the sidebar and h1. The selected tab is white on #1C4A47 (9.91:1); the others are #CFE3E1 (7.42:1). |
| TCD-20 | Fixed | Home's band says "Scheduled until 4:00 PM." (`AUDIT-E`) and "Scheduled until 5:00 PM." (`AUDIT-ON` clocked in, `AUDIT-BREAK` on break). That's correct next to "Off clock", "Clocked in" and "On break". |
| TCD-21 | Fixed | The "What changed" line breaks only after "·": "After: Oct 19 · 9:00 AM – 5:00 PM ·" / "Main Office · Customer Support ·" / "Designated lead" (Lead, 1440, 280px column). Place names are joined with NBSP. |

### New findings

None. Checked and correct this round:
- **Employee and Lead pages, all three widths:**
  - Sub-14px text left: only the "Review update" label (TCD-16), avatar initials (12), number badges (12) and "Workforce" (13, logo lockup, accepted).
  - No text is clipped, apart from the Updates preview's intended 2-line clamp at 768.
- **Wording:**
  - No "missing", "missed" or straight apostrophe in any Employee, Lead, Manager or Owner text in this sweep.
  - Tab names, the trail and h1s agree on every Pay and Requests page.
- **Phones (320, 390):**
  - Kit text is 15px or more; tab labels 13; badges 12.
  - No Phase 4 element appears, and nothing is clipped.
  - The phone bell count is still 10px (the coordinator's phone header, unchanged).

**Not covered:**
- 200% text on Employee and Lead pages.
- Lead at 768.
- `payroll-qa-a` and `payroll-qa-b`.
- WebKit in this round (round 2's WebKit spot check matched Chromium on the same rules).

Open: 0 P0, 0 P1, 2 P2

## Round 5 (exit round)

October 19, 2026 · Build `8012d97` · Scripts `scan-r5.mjs` (sweep; `ZOOM=200` for large text) and `r5b.mjs` (re-checks, Search dialog, collapsed sidebar, WebKit). Data and crops are under `S/r5/`.

### How it was measured

184 page captures in Chromium (166 at 100% text, 18 at 200%). Every text node's size, line height, weight, colour, contrast, wrap and clipping was read.

- **Manager and Owner** (`AUDIT-M`, `QAOWNER`):
  - **1440:** all 21 routes in BRIEF.md, shell sample pages included.
  - **1024 and 768 (Owner):** Home, Team overview, Inbox, Team, Schedule, Timecards, Payroll runs and Time exports.
- **Employee and Lead:**
  - **1440:** `AUDIT-E` and `AUDIT-LEAD` on all 14 routes.
  - **1024 and 768:** `AUDIT-E` on all 14 routes.
  - **`AUDIT-LONG`:** Home, Profile, My schedule and My time at 1440 and 768.
- **200% text:**
  - Owner Home, Inbox and Team at 1440 and 1024.
  - `AUDIT-E` Home, My schedule, My time and Requests at 1440 and 1024.
- **Phones:** 320 and 390, with `AUDIT-E`, `AUDIT-M` and `QAOWNER`, on Home, Inbox, Team, My schedule and My time.
- **Also checked:**
  - The Search dialog, opened.
  - The sidebar collapsed at 1440.
- **WebKit spot checks:**
  - Time exports names.
  - Updates for Owner, Lead and Employee.
  - My time for Lead and Employee.
- **Not counted as findings:**
  - Wave A and Wave B page content: the Manager Availability, Shift requests and Insights bodies. I checked only their sidebar and trail.
  - Server failures (500s), retried once.
  - Contrast reads where the background is a gradient or the band behind the tabs (my collector can't see those). Each was checked by eye in its screenshot.

### Status of open findings

| ID | Status | Measured now |
|---|---|---|
| TCD-14 | Fixed | Time exports names are 16/22 at 500 in #16191C, the same as Timecards names, in Chromium and WebKit. |
| TCD-16 | Fixed on Employee and Lead pages | • "Review update" is 14/20 at 500 for `AUDIT-E` and `AUDIT-LEAD` (WebKit the same). The Updates footnote is 14/20.<br>• The same label is still 12px on the **Manager and Owner** Updates page. That isn't covered by TCD-16's scope, so it's filed as TCD-22. |

### New findings

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| TCD-22 | Updates (shell sample page) · `QAOWNER`, `AUDIT-M` · 1101–1440 (footnote at every desktop width) | Row action "Review update" and the footnote "Open an update to review the message and…" | • The row action is 12/24 at 500 and the footnote 12/19.2, both #5F6368, in Chromium and WebKit.<br>• The Employee and Lead Updates page now shows the same two at 14/20. | `S/r5/shots/finder-1440.png` (row and footnote visible behind the dialog) | • `src/components/updates-review.css:41` and `:48` (`calc(12 * --type-unit)`)<br>• The round-4 floor (`premium-desktop.css:398+`) is scoped to the Employee and Lead shell | Add `.updates-row-action, .updates-row-action *, .updates-footnote` to the Manager and Owner floor list at `premium-desktop.css:163-174` (`.875rem/1.25rem`), or move that floor rule up a level so it covers both shells. | P2 |
| TCD-23 | Desktop header Search dialog · Manager and Owner · 761–1440 | Group headings "ACTIONS" and "PAGES"; the key hint row | • The group headings are 12/17.4 at 600, uppercase, in #5F6368: under the 14px floor, and the only all-caps labels left in the product. Every other group label (sidebar "Plan", More sheet) is sentence case.<br>• The hint "↑↓ to move · Enter to open · Esc to close" is 13/18.85.<br>• Results are 15px, so they're fine. | `S/r5/shots/finder-1440.png` | `src/app/app/portal-gusto.css:390` (12px plus the uppercase transform on `.command-finder-group`) and `:397` (13px hint) | • `.command-finder-group { font: var(--nv-t-label); text-transform: none; letter-spacing: 0 }`, so it reads "Actions" and "Pages".<br>• `.command-finder-hint { font: var(--nv-t-callout) }`, scoped to 761px and up. | P2 |
| TCD-24 | Header (Manager and Owner); My time and My schedule (Employee and Lead) · 1024, 1440 · 200% text | Text that doesn't follow the text size | At 200% the page text doubles (body 28–32px, band titles 64px), but these stay put:<br>• The header "Search" label stays 14px (Owner Home, Inbox and Team).<br>• My time card titles ("Current status", "Today", "Recent entries", "Corrections") stay 20/26 at 550, smaller than the 28px notes under them, so the hierarchy inverts.<br>• My schedule: the week heading "Oct 19 – Oct 25" and the day numbers stay 20, "Today" 14, the week note 14, and shift times 17. That's 25 elements on the page.<br>(At 100% all of these are on or above the floor; only scaling is wrong.) | `S/r5/data/chromium-z200-AUDIT-E-1024-_app_schedule.json`, `S/r5/data/chromium-z200-QAOWNER-1440-_app.json` | • `my-time.css:22` (`calc(20 * var(--type-unit))`)<br>• `employee-schedule.css:15`, `:20`, `:23` and `:143`<br>• The header "Search" span gets kit type only under 761px (`portal-premium.css:1371`); on desktop it inherits a px size | Desktop rem overrides in `premium-desktop.css`:<br>• `.employee-time-section-heading h2, .employee-time-current-heading h2 { font: var(--nv-t-title-3) }`<br>• `.my-week-title h2 { font: var(--nv-t-title-3) }`<br>• `.my-week-day strong { font-size: 1.25rem }`<br>• `.my-week-today, .my-week-note { font: var(--nv-t-label) }`<br>• `.my-shift-copy strong { font-size: 1.0625rem }`<br>• `.mobile-header .command-finder-trigger span { font: var(--nv-t-label) }` | P2 |

### Checked and correct in round 5

- **Type floor at 100%.**
  - Manager and Owner pages at 768, 1024 and 1440, and Employee and Lead pages at the same widths, have no text under 14px.
  - The only exceptions are number badges (12), avatar initials (12), the ⌘K hint (12), "Workforce" (13, logo lockup) and TCD-22 and TCD-23.
- **Phones (320, 390):** kit text is 15px or more, tab labels 13 and badges 12. Nothing is clipped, and no Phase 4 element shows.
- **Contrast.** Every real text pair is 4.5:1 or better:
  - section tabs on the band: 7.42 unselected, 9.91 selected
  - selected Inbox row: 15.55, 5.15 and 4.87
  - pane note: 8.8
  - "Signed in as": 5.84
  The only pairs under that are disabled Time exports controls (4.25 and 4.39), which are exempt.
- **Wrapping and clipping.**
  - No text is clamped or clipped, except two that are intended:
    - The Updates preview at 768 (2 lines).
    - `AUDIT-LONG`'s account name, which gives way with an ellipsis (192px at 1440, 128px at 768).
  - At 200%, the workspace name in the trail is cut to 260px with an ellipsis (it keeps its `title`).
  - No band title wraps, except "Good afternoon, Fictional" at 1024@200%, which breaks between words.
  - No sideways scroll anywhere: `scrollWidth` equals the viewport in all 184 captures.
- **Wording.**
  - No "missing", "missed" or straight apostrophe in any Phase 4, Employee or Lead text.
  - Names agree: Team, My pay / My time / Timecards, "Request pages", and "Scheduled until …".
  - Pane notes match their buttons for all 8 item types.
- **Collapsed sidebar at 1440:** labels are hidden and every icon has a `title` ("Home", …). No visible text changes size.

**Not covered:**
- The in-between widths 761, 1023, 1179 and 1180.
- 125% and 150% text (200% only).
- Lead at 768.
- `payroll-qa-a` and `payroll-qa-b`.

Open: 0 P0, 0 P1, 3 P2
