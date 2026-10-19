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
