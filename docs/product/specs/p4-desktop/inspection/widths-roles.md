# Phase 4 desktop, round 1: widths, roles and consistency

October 19, 2026 · Inspector: widths, roles and consistency (prefix WR4-) · Preview `http://127.0.0.1:50144` (checkpoint 8c4dd50, the build that was running) · Manager `AUDIT-M`, Owner `QAOWNER`; shell also on `AUDIT-E` and `AUDIT-LEAD` · Chromium, with WebKit spot checks · Read only. I changed no code or data. I pressed nothing that saves; I only opened menus and sheets and selected Inbox rows.

Evidence: `S` = `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p4-desktop-240fe0/55a133fe-0aa8-4472-a3aa-f939856da789/scratchpad/inspect/widths-roles/`. Screenshots are in `S/shots/` and crops in `S/crops/`. The measurements (JSON) are in `S/data/`. The scripts are `shell.mjs`, `resize.mjs`, `shell2.mjs`, `phone.mjs`, `wide.mjs`, `emp.mjs`, `owner.mjs` and `big.mjs`, with the probes `probe.js` and `probe2.js`.

**About the build.** The preview runs a frozen copy of the source. While I worked, the worktree moved ahead by six commits (`2dea5ac` … `85af1a0`) that the preview does not have. Every measurement below comes from the preview. The `file:line` references point to the current worktree `HEAD`. Where `HEAD` has already changed something, the finding says so. WR4-04 comes from reading `HEAD` and has not been measured, because no running build has it yet.

**Conditions.** The dev server was heavily loaded the whole time (load average 17–21, with 20–40s page loads and Postgres statement timeouts in `next.log`). Pages that came back failed, partial or "could not be loaded" were retried and are not filed. That covers the Inbox "isn't available", Owner Home "Couldn't load everything" and the bell's "—".

## Verdict

**Not ready.** The Phase 4 shell, D-4 fold and band caps are right at 768, 1024 and 1440 for both roles:

- The sidebar shows Team, the four groups (14px on the preview) and the right role entries.
- Time off, Shift requests and Availability light Inbox, and the trail names each page.
- Every band is 200px or less at 768–1440. That fixes WR-35 at those widths.
- The Home grid switches at exactly 1179/1180, and Inbox list and detail at exactly 1023/1024.
- The Team table columns line up with their header.
- WebKit matches Chromium to the pixel on Home, Inbox and Team.
- Phones at 320 and 390 are unchanged apart from the listed fixes.

Four problems remain:

1. **Squeezed titles (P0).** Moving controls onto the title row squeezes the title column to nothing:
   - "Inbo / x" at 761–767.
   - "I / n / b / o / x" at 150% text at 768, with a filter chip drawn over the "b".
   - "Schedule activity" broken into 16 one-letter lines in a 1,444px band at 200% text at 1024.
2. **Profile goes Home (P1).** The new Profile link in the account menu and in the phone More sheet takes Owners and Managers to Home, because the Profile page still redirects them.
3. **Centred versus left-aligned pages (P1).** Kit pages are centred while section tabs and the older pages are left-aligned. With the sidebar collapsed at 1440, the Timecards tabs start 88px left of the band under them, and opening Time off from the Inbox shifts the page edge 88px.
4. **Sidebar text in HEAD (P1).** `HEAD` deleted the 14px sidebar rule, so the next build will show 12px group labels and a 10px "Powered by" line.

The rest are precision and consistency issues.

## Findings, worst first

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Cause (`HEAD`) | Fix | Sev |
|---|---|---|---|---|---|---|---|
| WR4-01 | Inbox (761–1440) and Home's three views (1024–1440) · both roles · Chromium and WebKit | `.nv-masthead__title` next to the title-row filters or view chips | The title column gets whatever space the controls leave, down to 0px, so the title breaks inside the word.<br>**At 100% text:**<ul><li>761–767: the Inbox title column is 63px. It shows "Inbo / x" (72px tall) and the band is **216px**, over the 200px cap.</li><li>768: the column is 84px and "Inbox" is 84px, so there is no slack at all.</li></ul>**At 150% text:**<ul><li>Inbox at 768: "I / n / b / o / x" in 5 lines (300px), the "All" chip over the "b", band **478px**.</li><li>"Schedule activity" at 1024: 4 lines in a 121px column, band 392px.</li></ul>**At 200% text:**<ul><li>Inbox at 1024: "Inbo / x", band 380px.</li><li>"Schedule activity" at 1024: the column is **0px**, 16 lines, band **1,444px**.</li><li>"Schedule activity" at 1180: 5 lines, band 564px.</li></ul>WebKit gives the same numbers at 761. | `S/crops/inbox-761-768.png`, `S/crops/inbox-large.png`, `S/crops/views-large-1024.png`; data `S/data/big-*.json`, `rz-wk-M.json` | `src/app/app/premium-desktop.css:17` (`minmax(0, 1fr) auto`) with `:29` (`min-width: 0` on the title). Controls are placed in column 2 at `:37` (Inbox, from 761) and `:54` (views, from 1024), and `:38` and `:55` set `overflow: visible`, so the controls never shrink. Between 761 and 767 the kit is still on phone tokens (30/36 title, 15px chips), because `src/components/kit/kit.css:73` starts the desktop tokens at 768. | For the two banded title rows only:<ol><li>Keep the title whole with `.nv-masthead__title { min-width: max-content; }` (replace `min-width: 0` for these bands).</li><li>Change the grid to `grid-template-columns: max-content minmax(0, 1fr)`, with `.nv-masthead__extra { justify-self: end; min-width: 0; max-width: 100%; }`.</li><li>Remove `overflow: visible` at `:38` and `:55`. Chips that don't fit then scroll under the right-edge fade that already exists (`portal-premium.css:591`).</li><li>With large text, put the controls on their own row: give `.nv-pageband` `container-type: inline-size` and add `@container (max-width: 34rem) { … > .nv-masthead__extra { grid-column: 1 / -1; } }` (in rem, so it reacts to text size).</li><li>Start the kit's desktop tokens at 761 so 761–767 matches 768.</li></ol> | P0 |
| WR4-02 | Account menu (desktop) and More › My account (phones) · Owner and Manager · 768, 1024, 1440, 320, 390 | "Your profile" (`/app/profile`) and "Profile" | Both roles see the link on every page, but it never opens a profile. Clicking it shows the Profile loading placeholder, then **lands on `/app` (Home)**. Measured at 1440 for both roles: "Your profile" → `/app`. At 320 for both roles: More › Profile → `/app`. At 390 the redirect was still in progress after 8s (Owner on `/app/profile`, Manager still on the Attendance page). Employees and Leads open their Profile normally. | `S/crops/acct-profile.png`, `S/shots/more-profile-QAOWNER-390.png`, `S/shots/profile-QAOWNER.png` | `src/app/app/profile/page.tsx:17` redirects every role other than `EMPLOYEE` and `LEAD` to `/app`. Phase 4 added the link in `src/lib/navigation.ts:140` (`management.push(/app/profile)`) and `src/components/app-shell.tsx:260-261` (menu link). | Pick one: <ul><li>**(a)** Until a manager Profile page exists, remove `/app/profile` from management navigation (`navigation.ts:140`) and from the account menu condition (`app-shell.tsx:260`). Managers keep "Your pay statements".</li><li>**(b)** Let Owners and Managers through at `profile/page.tsx:17` and render the Profile page for them. This needs Codex, because the account panel reads employee authority.</li></ul>Until then the link must not ship. | P1 |
| WR4-03 | Timecards, Payroll runs, Time exports, Payroll settings; the fold pages; Updates and other older pages · both roles · sidebar collapsed at 1440 (and any window over about 1460px) | Section tabs and page roots vs the kit band | Kit pages are 1120px and **centred**. Section tabs and older pages are **left-aligned** at the frame inset. Measured:<ul><li>**1440, sidebar collapsed:**<ul><li>On Timecards the tab row starts at x=112 and the band under it at **x=200 (88px apart)**. The tabs' hairline runs 112–1408 while the band runs 200–1320.</li><li>Inbox band x=200 → "All requests" → Time off heading x=112: the page edge jumps 88px.</li><li>Updates band x=112. Insights x=112.</li></ul></li><li>**1920 expanded:** Timecards tabs x=276 and band x=522 (246px apart). Inbox band 522; Time off 276.</li><li>**1440 expanded:** 6px (tabs and older pages at 276, kit bands at 282).</li></ul> | `S/crops/collapsed-1440-timecards-tabs.png`, `S/crops/collapsed-1440-inbox-vs-timeoff.png`, `S/crops/wide-1920.png`; `S/data/wide-AUDIT-M.json` | `src/app/app/portal-premium.css:56` (`[data-nv-page] { max-width: 1120px; margin-inline: auto }`) against `src/app/app/portal-desktop.css:13-17` (every page root `margin-inline: 0`; D1 says "Nothing is centred"). The section tabs render outside `[data-nv-page]` (`app-shell.tsx:271`) and are capped only for reading pages (`portal-desktop.css:71`). | Use one alignment. The simplest fix, which also matches D1, is `margin-inline: 0` at `portal-premium.css:56`: every page, band and tab row then starts at the frame inset (x=276 expanded, x=112 collapsed). If centring is wanted instead, give `.page-frame > .section-tabs` and every page root the same `max-width: 1120px; margin-inline: auto`. | P1 |
| WR4-04 | Desktop sidebar · every role · ≥761 (code in `HEAD`, not on the preview) | `.sidebar-group-label`, `.sidebar-platform-footer small` | On the preview both are 14px (measured: Plan, People, Time and pay, Workspace and "Powered by VELANI LLC" at 14px for both roles; AUDIT-E and AUDIT-LEAD footer 14px). Commit `2dea5ac` ("Round 1 stability fixes") deleted that block from `premium-desktop.css`, and no other file sets it. On the next build the older rules come back: **12px** group labels (`portal-gusto.css:205`) and a **10px** "Powered by" (`portal-gusto.css:214`). | `git show 2dea5ac -- src/app/app/premium-desktop.css` (lines removed at old `:127-132`) | `premium-desktop.css` (block removed) | Restore the two rules from `7f9abac` (`premium-desktop.css:127-132` there) under the desktop query. Then re-measure on the rebuilt preview. | P1 |
| WR4-05 | Home · Manager · 1180–1440 (WR-34 re-check) | `.premium-home__now` vs `.premium-home__week` column ends | The Today card is full width, everything is one column below 1180 (switch measured exactly at 1179/1180), and the Owner's setup card is in the left column. **Still open for the Manager:** the right column ends **150px** below the left at 1440 (left 427–1067, right 427–1217) and **262px** at 1180 (left 1067, right 1329). The comment at `premium-desktop.css:59-60` says the columns "end close together". Owner: left is 121px longer at 1440 and 9px longer at 1180. Judgment call: uneven columns are common, but this contradicts the stated design and WR-34's ask. | `S/shots/rz-AUDIT-M-1180-_app.png`; `S/data/rz-M.json`, `rz-O.json` | `premium-desktop.css:74-76` (the no-setup grid keeps This week, Plan ahead and Team tools together on the right) | Without the setup card, show Plan ahead under Also needs you in the left column (render it inside `.premium-home__now` when `!setup` in `premium-home.tsx`). That gives left 732px and right 698px at 1440 (34px apart). | P2 |
| WR4-06 | Timecards, Payroll runs, Time exports · both roles · all widths (WR-25 re-check) | Section tabs above the band; title position | **Not fixed.** The tabs still sit above the band. The band starts at y=158 on these pages and at y=93 on every other page, so the title drops 65px when you move from Inbox to Timecards. Within the one tab row, the title also moves between sibling tabs: Timecards title y=198, Time exports and Payroll runs y=178 (20px), because only Timecards has an eyebrow. On phones the tabs are still above the title (the fade from round 2 is still there). | `S/crops/m1440-a.png` (Timecards vs Time exports); `S/data/rz-M.json` | `portal-premium.css:17-22` (tabs above the band); `app-shell.tsx:271` | As WR-25: render the section tabs inside the band under the summary (like the Inbox filters). Until then, reserve the eyebrow row on these three bands (`.nv-pageband__eyebrow-row { min-height: 20px }` even when empty), so sibling tabs keep the title at the same y. | P2 |
| WR4-07 | Payroll settings (`/app/settings/payroll`) · Owner · ≥1101 | Top-bar trail | The trail reads "Workspace › Settings" while the page is "Payroll settings" and the selected tab is one of four "Time and pay" tabs. The BRIEF rule is that the trail ends with the page's own name. Across the one tab row the trail changes four ways: "Time and pay › Timecards", "Time and pay › Payroll", "Time and pay › Timecards › Time exports", "Workspace › Settings". Measured on the preview: Home's three views read "Plan › Home" too. `HEAD` `85af1a0` (IS-P4-09) fixes the views; Payroll settings is still open there. | `S/crops/payroll-settings-trail.png`; `S/data/owner-QAOWNER.json` | `app-shell.tsx:84-87` (`pageItem` only covers nav entries and Home's views) | When the current path is a section tab that isn't a nav entry, end the trail with that tab's label: `pageItem ??= sectionTabs?.items.find(i => i.href === pathname && i.href !== activeItem?.href)`. That gives "Workspace › Settings › Payroll settings". | P2 |
| WR4-08 | Updates · both roles · 761–1023 and 1440 | `.premium-updates > .nv-pageband` | The band doesn't follow the Phase 4 band rules that its People neighbour Team does. At 768 and 1023 its side padding is 36px (title x=280) while Team's is 24px (title x=268), so the title moves 12px between Team and Updates. At 1440 it is left-aligned (x=276) while Team is centred (x=282). Its top padding is 0 (band 108px) against 16px elsewhere. | `S/crops/updates-vs-team-768.png`; `S/data/rz-M.json` | `premium-desktop.css:13,46` (the selector list leaves out `.communication-view`/`.premium-updates`); `portal-desktop.css:16-17` (reading measure, left-aligned) | Add the Updates page to the `:where(...)` list at `premium-desktop.css:13` and `:43-46` (padding 24px from 761 to 1023). Its alignment follows WR4-03. | P2 |
| WR4-09 | More sheet · Owner · 390×844 and 320×844 | Sheet list; "Close" | Adding Profile makes the Owner's sheet scroll. Content is 785px in a 748px sheet (it was 741, which fitted). At scroll 0, "Close" is at y=817–865, so **21px of it is cut** at the screen's bottom edge, under the half-visible button. The Manager's sheet (697px) still fits. | `S/crops/more-390.png` (middle) | `navigation.ts:140` (one more item); `portal-premium.css:610` (`Close` static at the end of the list) | Fix (a) of WR4-02 removes the extra row. If Profile stays, start the sheet at the header's bottom (y=68 instead of 96), or bring the groups 8px closer, so the Owner's list fits 844px tall again. | P2 |
| WR4-10 | Inbox · both roles · 761–1023 (judgment call) | "All requests" card | With Requests gone from the sidebar, this card is the Inbox's only link to Time off history, Shift requests and Availability. At 761–1023 it comes after the whole list: y=3,749 at 1023 and y=4,179 at 761, after 25 "Act now" rows. At 1024 and up it sits beside the list at y=711–783. `HEAD` keeps it at the end of the list. | `S/shots/rz-AUDIT-M-1023-_app_inbox.png`; `S/data/rz-M.json` | `manager-inbox.tsx:294` (`HEAD`), `premium-desktop.css:84-88` | At 761–1023, put a compact one-row "All requests: Time off · Shift requests · Availability" link line directly under the band, above the list, and keep the card at the end. Or move the card above the "Plan ahead" group. | P2 |

## Checked and correct

- **Sidebar (D-4), both roles, 1440:**
  - Manager: Plan (Home, Inbox, Schedule), People (Team, Updates), Time and pay (Timecards, Insights), Workspace (Scheduling rules).
  - Owner: the same, with Payroll under Time and pay and Settings under Workspace. Scheduling rules is folded into Settings.
  - No Requests, Time off, Shift requests, Availability, Templates or Time exports entries.
  - Group labels and "Powered by" are 14px on the preview (see WR4-04 for `HEAD`).
- **Trails (preview):**
  - "Plan › Inbox › Time off", "› Shift requests" and "› Availability", with Inbox lit, for both roles.
  - "Time and pay › Timecards › Time exports" with Timecards lit.
  - "Plan › Schedule › Templates". Manager: "Workspace › Scheduling rules"; Owner: "Workspace › Settings › Scheduling rules".
  - Owner "Time and pay › Payroll". "My pay" with no group.
  - At 768–1100 only the current crumb shows, and it ends before Search.
- **Owner vs Manager:**
  - The Manager is sent to Home from `/app/payroll` and `/app/settings`.
  - Payroll runs and Payroll settings tabs appear for the Owner only.
  - The Owner's setup card sits in the left column from 1180 and after Also needs you below 1180, the same order as on phones.
  - Home counts are the same for both roles ("26 things need you today" = Inbox's 4 + 21 + 1; Act now 25).
- **Band caps (WR-35):** every band is 200px or less at 768, 1023, 1024, 1180 and 1440 for both roles:
  - Home 168 (160 below 1024); the views 184 (196 below 1024, summary hidden).
  - Inbox 196 (188).
  - Schedule, Team 168 (160).
  - Timecards 136; Payroll runs and Time exports 116 (Time exports 140 at 768).
  - Exception: Inbox at 761–767 (WR4-01).
- **Band and gutter consistency:**
  - Every kit band is 1120 wide at 1440 (x=282), 872 at 1180, 748 at 1024 and 492 at 768, with radius 20.
  - Cards sit 16px inside the band edge (x=298 at 1440), radius 16 on desktop, with shadow and no border, on Home, Inbox, Team, Schedule Next up and Time exports.
  - Band side padding is 36px from 1024 and 24px below.
  - The eyebrow-row controls (Add employee, Add shift, Refresh) are 44px and centred on the 20px eyebrow line (y=97–141 vs eyebrow 109–129).
- **Home grid:** one column at 761–1179 and 7fr/5fr (625/447 at 1440, 481/343 at 1180) from exactly 1180. Today is full width. No sideways scroll at any width (`sw` equals the viewport everywhere).
- **Inbox list and detail:**
  - One column at 1023. At 1024 the grid is 11fr/9fr (385/315; 590/482 at 1440).
  - Clicking a request row at 1440 selects it (`aria-current="true"`, teal wash), adds `?item=TIME_OFF%3Aaudit-timeoff` to the URL and moves focus to the pane heading. Escape returns focus to the row.
  - At 1023 there's no pane and no selected row; resized back to 1024 the selection returns.
  - The filters sit on the title row at 768–1440 (100% text).
- **Team table at 1024 and 1440:** the header (Name, Role, Location, Phone) lines up with the row cells (Name at x=370, Role 679, Location 890, Phone 1141 at 1440; 332, 522, 654, 810 at 1024). Rows are 64px. The search field and the selects share a bottom edge. Below 1024 the stacked rows are back.
- **Sidebar collapsed:** 80px rail at 1440, 1180, 1024 and 768. Group labels are visually hidden, entries have titles, and there's no sideways scroll. At 1024 collapsed, the Inbox gets 880px and keeps list and detail (alignment: WR4-03).
- **Account menu, both roles, 1440, 1024, 768:** 318px panel with "Your profile", "Your pay statements", a divider and "Sign out". Items are 54px tall and 14px, opening under the trigger. Destination: WR4-02.
- **Employee and Lead shell at 1440, 1024 and 768:**
  - Sidebar: Home, My schedule, My time, Requests, Updates, Notifications, My pay, with no groups. Lit entry correct on `/app`, `/app/schedule` and `/app/my-time`.
  - Header: bell and account (no Search). Footer 14px.
  - Account menu: "Your profile" (which opens) and Sign out.
  - The trail ends with the page name. No sideways scroll.
  - Employee and Lead are identical.
  - Their page layout is outside this round. Noted, not filed: the sidebar says "My time" where the tab says "Hours".
- **Phones at 320 and 390 (Chromium, both roles), compared element by element with the coordinator's pre-Phase 4 capture (`scratchpad/rt/phone-base.json`):**
  - Inbox, Time exports and Attendance: identical positions.
  - Team: the new spans sit in the same places; page height unchanged.
  - Home, Schedule and Timecards differ only by data: summary times, hours wrapping, and one partial read.
  - The More sheet gains Profile (WR4-02, WR4-09).
- **WebKit spot check (Manager; Home, Inbox, Team at 1440, 1024, 768 and 761):** every band, title, grid and column measurement matches Chromium to the pixel, including the 761 Inbox title break.

## Not covered

- The automated sweep results (`inspection/checks-round-1.txt`) did not exist when I wrote this, so nothing here cross-references them.
- `HEAD`'s six newer commits are not on the preview. WR4-04 is from code. The `HEAD` fixes mentioned in WR4-07 and WR4-10 were not seen running.
- Real devices, VoiceOver and Firefox (cut) were not covered. Landscape phones were not re-run (no Phase 4 change applies there).

Open: 1 P0, 3 P1, 6 P2

## Round 2

October 19, 2026, on the latest build (`0abdc74`). I confirmed the preview's source copy matches the worktree. Read only: I changed no code or data and pressed nothing that saves. I opened the More sheets and followed Profile links, and collapsed the sidebar in my own browser only. The server load was lower than in round 1 (load average 7–11), and every page loaded on its first or second try.

Evidence: `R2` = `S/r2/` (`shots/`, `crops/`, `data/`). The scripts are `resize2.mjs` and `probe3.js` (both under `S/`), `big.mjs` (large text), `phone.mjs`, and `r2/q.mjs` and `r2/q2.mjs`.


**A later build is not measured yet.** After my measurements, three more commits landed in the worktree: `4b28b21`, `16562e5` and `f4680b3`. The preview still runs `0abdc74`, so I measured none of them. Reading their code:

- **Look aimed at four of my findings:**
  - WR4-06: AL4-25 keeps the eyebrow line's 20px on tab-row bands.
  - WR4-12: the Request pages row becomes three across.
  - WR4-13: TCD-17 caps the account name at 12rem, and at 8rem below 1100.
  - WR4-15: Profile tops.
- **Leave three untouched:**
  - WR4-11: the title column is still `max-content` at `premium-desktop.css:18`.
  - WR4-14: there is no rule for `.my-shift-position`.
  - WR4-16: the employee Home date is still not kept whole.

All seven stay open below until the preview carries `f4680b3` and I re-measure them. Line numbers in this section are for `0abdc74`.

Coverage:
- **Manager and Owner:** 1440, 1180/1179, 1024/1023, 768 and 761. Sidebar collapsed at 1920, 1440 and 1024. 150% and 200% text at 761–1440.
- **Employee and Lead (`AUDIT-E`, `AUDIT-LEAD`):** all 14 pages and variants at 1440, 1100/1099, 1024/1023, 768 and 761.
- **`AUDIT-ON`, `AUDIT-BREAK`:** Home. **`AUDIT-LONG`:** Home, Profile and My schedule.
- **Collapsed sidebar (Employee):** at 1440, 1024 and 768.
- **Large text (`AUDIT-LONG` and Owner Home):** 150% and 200%.
- **Phones:** 320 and 390 for all four roles.

### Status of round-1 items

| ID | Status | Measurement now |
|---|---|---|
| WR4-01 | **Fixed as filed, but the fix regressed (new WR4-11)** | No title breaks inside a word any more: <ul><li>Inbox: "Inbox" is one line at 761–1440 at 100%, 150% and 200%. The band at 761 is 188px (was 216).</li><li>"Schedule activity" is one line at 150% and 200% text at 761–1440 (was 16 lines at 200% at 1024).</li></ul>The filters and chips now scroll beside the title. But the title column can no longer wrap, so long titles are cut off at the band edge. See WR4-11. |
| WR4-02 | Waiting on another owner (not counted) | Still lands on `/app` for Manager and Owner from More › Profile at 320 and 390 (measured). Employee and Lead open `/app/profile`. |
| WR4-03 | **Fixed** | Collapsed at 1440 and 1920, and collapsed at 1024: the Timecards tab box, every kit band (Inbox, Timecards, Updates), Time off and Insights all start at x=112. Expanded at 1440 they all start at x=276. The band text and the tab text share x=148 (collapsed) and x=312 (expanded). |
| WR4-04 | **Fixed** | Sidebar group labels are 14px and "Powered by" is 14px at 761–1440 (AUDIT-M, AUDIT-LONG). The rule is at `premium-desktop.css:273-275`, in rem. |
| WR4-05 / WR-34 | Kept by the coordinator's decision (not counted) | Unchanged. Manager at 1440: left column ends at 1067, right at 1217. Owner: 1338 vs 1217. |
| WR4-06 / WR-25 | **Partly fixed** | The tabs now sit inside the band at 761–1440 on Timecards, Payroll runs, Time exports, Payroll settings, and on the Employee Requests and Pay tabs. Every band starts at y=93, and the tab text starts on the band text edge (x=312, or 280 below 1100). The tabs scroll with a fade where they don't fit (Owner at 761). **Still open:** the title moves between sibling tabs. See "Still open" below. |
| WR4-07 | **Fixed** | "Workspace › Settings › Payroll settings" at 1440 and 1180; "Payroll settings" alone at 1100 and below. Home's views: "Plan › Home › Schedule activity". |
| WR4-08 | **Fixed** | The Updates title is at x=280 at 761–1023, the same as Team, Inbox and Timecards. At 1440 it is at x=312. |
| WR4-09 | **Fixed** | Owner at 390×844 and 320×844: the sheet is 748px tall with 785px of content. "Close" stays at y=780–828, fully visible, and "Sign out" scrolls up from under it (`R2/crops/more-owner-390-foot.png`). Manager: 697px, no scroll. |
| WR4-10 | **Fixed, with a new P2 (WR4-12)** | The "Request pages" row is first in the Inbox list (y=249) at every desktop width, for both roles. |
| WR-35 | **Fixed** | At 100% text every band is 200px or less at 761–1440 for every Manager, Owner, Employee and Lead page I measured. The tallest are the Inbox at 196 (188 below 1024) and Employee My pay at 196 (768). |

Still open from round 1, re-filed as **WR4-06 (P2)**:

- **Timecards tab row:** Timecards' title is at y=181 (it has an eyebrow). Time exports, Payroll runs and Payroll settings are at y=161. That is 20px of movement between tabs in one row.
- **Employee Requests tabs:** Overview 161, Time off 163, Shift requests 183 (161 below 1024), Availability 163.
- **Fix:** reserve the eyebrow row on tabbed bands (`.nv-pageband__eyebrow-row { min-height: 20px }` even when it is empty, inside the `:has(> .section-tabs)` block at `premium-desktop.css:292`). The 2px offsets (161 vs 163) come from Time off and Availability, whose band chips sit on the title row (`premium-desktop.css:357-359`). Use `align-items: start` on those rows so the title keeps its own top.

### New findings, round 2 (worst first)

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| WR4-11 | Every banded page, every role, at 150–200% text from 761 to 1024. Worst: Employee Home | Band title column and title-row controls | The round-1 fix gives the title `max-content`, so it never wraps. The leftover column for the controls can shrink to almost nothing, and both get clipped by the band.<ul><li>**Employee Home (AUDIT-LONG), 200% text, 768:** the "3 items need your review" link gets a **3px** column, 205px tall. It is cut to "3 / iter / nee / you / rev" at the band edge, and the band is 409px tall. At 150% it wraps to 4 lines in 104px.</li><li>**Owner Home, 150% text, 768:** "Good afternoon, Fictio". The title is 519px wide in a 420px text area, so it runs past the band's edge (x=736) and is cut by 63px. At 200%: 692px wide, 272px over the text edge at 768 and 16px over at 1024.</li><li>**"Schedule activity", 200% text, 768:** the title is 478px in a 420px area and is cut ("activit"). The eyebrow-row week pager is cut ("Oct 19 – Oct 25" at the edge), and the chip row (494px) runs 38px past the band.</li></ul>Same in Chromium; WebKit not re-run. | `R2/crops/home-large-r2.png`, `R2/crops/large-r2.png`; `R2/data/big-*.json` | `premium-desktop.css:18` (`grid-template-columns: max-content minmax(0, 1fr)`) for every banded page. Employee Home's link is placed in column 2 at `:357` with no `min-width`. The eyebrow row is `nowrap` at `:32`. | Let the title wrap between words but never inside them:<ol><li>Change the grid to `grid-template-columns: minmax(min-content, auto) minmax(0, max-content)`.</li><li>Give the title `overflow-wrap: normal; word-break: normal`, so its min-content is its longest word.</li><li>Give the band `container-type: inline-size` and add `@container (max-width: 36rem) { .nv-masthead__extra { grid-column: 1 / -1; justify-self: start; } .nv-pageband__eyebrow-row { flex-wrap: wrap; } }`. Because this is in rem, it switches the controls to their own row only at large text or on narrow bands.</li><li>Keep the Employee Home link on one line (`white-space: nowrap`).</li></ol> | P0 |
| WR4-13 | Desktop header · every role (measured on AUDIT-LONG; the same code serves Manager and Owner) · 761–800 | Trail vs account trigger | The account trigger shows the full name. For "María José Rivera Santiago With A Long Name" it is **390px** wide at every width. At 768 that leaves the trail **34px**, so "Home" (40px) is cut to "Hom"; at 761 it gets 27px. Longer page names lose more: "Notifications" or "Shift requests" (about 85–100px) show 2–3 letters. AUDIT-M's trigger is 177px and the trail fits. | `R2/crops/long-hdr.png`; `r2/q2.mjs` output | `portal-gusto.css:184` (the trigger has no cap on its label); the name comes from `portal-account-menu.tsx:10` | Cap the name: `.portal-account-menu .nevora-action-menu-trigger > span:not(.portal-account-avatar) { max-width: 12rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }`. Below 1100, show only the avatar and chevron; the name stays in the button's label and the menu heading. | P1 |
| WR4-16 | Employee Home · Employee and Lead · phones at 320 (not a Phase 4 change; Phase 3 owns phones, reported for the owner) | To do row meta "Week of …" | The year breaks inside the number: "Week of Mon, October 19, 202 / 6" and "October 26, 202 / 6". Earlier rounds didn't capture this screen at 320 in this form, so I can't tell whether it's new. | `R2/crops/e-320.png` (first column) | `employee-home-reviewed.module.css:88` (`.itemCopy { overflow-wrap: anywhere }`) with `dateLabel()` not wrapped in `keepWhole()` (`employee-home-reviewed.tsx:46,167`) | `keepWhole(dateLabel(...))`, and `overflow-wrap: break-word` instead of `anywhere` on `.itemCopy`. | P1 |
| WR4-12 | Inbox · both roles · 761–1179 | "Request pages" row | The three links don't fit on one line. They split 2 + 1: "Time off · Shift requests" on the first line and "Availability" alone on the second. The row is 112px tall here and 60px at 1180 and above. Measured: the list column is 385px at 1024, 453 at 1179, 460 at 768 and 715 at 1023. | `R2/crops/reqrow.png` | `premium-desktop.css:302` and `:348` (`repeat(auto-fit, minmax(11.5rem, 1fr))`, which needs 3 × 184px plus padding) | When the row can't hold three, drop the 32px tiles and use a text-only row: `@media (max-width: 1179px) { … #inbox-all-requests .nv-tile { display: none } … > .nv-rows { grid-template-columns: repeat(3, auto); justify-content: start; column-gap: 24px } }`. "Time off", "Shift requests" and "Availability" take about 290px. | P2 |
| WR4-14 | My schedule · Employee and Lead · 1100 to about 1180 | Shift meta (location · position) | From 1100 the week column is only **436px**, so position drops to a second line and starts with its "·". At 1100: location at y=571, then "· Customer Support" at x=360, y=593. At 1099 (one column) the stacked layout shows no dot. At 1279 and above it's one line (both at y=582). | `R2/crops/sched-meta.png` | `src/app/app/schedule/employee-schedule.css:123-125` (the dot is a `::before` on the wrapped item) with the 340px side column at `premium-desktop.css:366-370` | In the two-column rule, while the week column is narrow, stack the meta as at 1099: `@media (min-width: 1100px) and (max-width: 1279px) { .my-shift-copy > .my-shift-position { flex-basis: 100%; } .my-shift-copy > .my-shift-position::before { content: none; } }`. Or start the two columns at 1280. | P2 |
| WR4-15 | Profile · Employee and Lead · 1024–1440 | The two side-by-side panels | The two panels don't start at the same height. Work details is a white card starting at y=225, with its heading inside at y=253. App settings has its heading on the grey canvas at y=225 and its card at y=263. So the card tops are **38px** apart and the headings 28px apart, at both 1440 and 1024. | `R2/crops/on-break.png` (lower row) | `profile/page.tsx` (`.profile-settings` puts its `h2` outside the list card) with the two-column grid at `premium-desktop.css:385-387` | Put "App settings" inside its card head like Work details (in the side-by-side layout, `.profile-settings { background: var(--nv-canvas); border-radius: var(--nv-r-card); box-shadow: var(--nv-e1); padding-top: 28px }` with the `h2` at 28px inset). Or move Work details' heading out onto the canvas, so both panels have the same structure. | P2 |

### Employee and Lead desktop: checked and correct

- **Bands:**
  - Every page is 200px or less at 761–1440 at 100% text.
  - Titles are one line, starting on the band text edge (x=312, or 280 below 1100, or 148 with the sidebar collapsed).
  - My schedule's and Shift requests' chips get their own row at 761–1023: My schedule band 172px, Shift requests band 188px with its eyebrow and description hidden.
  - From 1024 the chips sit on the title row: My schedule band 120px, Shift requests band 188px.
- **Section tabs inside the band:**
  - Requests (Overview, Time off, Shift requests, Availability) and Pay (Statements, Hours, Timecards) sit inside the band at every desktop width.
  - Sidebar entry lit: "Requests" on all four request pages; "My time" on Hours and Timecards; "My pay" on Statements.
  - The trail ends with the page name.
- **My schedule:** one column at 1099. From 1100 the week is beside a 340px column (confirm and changes); the side column is 340px at 1100–1440. The week strip has 7 days on one row at every width.
- **Profile:** stacked at 1023 and below; side by side at 1024 and above (panels 350/350 at 1024, 536/536 at 1440).
- **Employee vs Lead:** band geometry is identical on all 14 pages at all 7 widths. Clocked-in (AUDIT-ON) and on-break (AUDIT-BREAK) Homes match AUDIT-E's band (172px; "N items need your review" link at the right edge, x+w=1360 at 1440).
- **Long name:** "Hi, María José." is one line at 761–1440. Profile wraps the full name in Work details. Header: see WR4-13.
- **Sidebar collapsed (80px rail) at 1440, 1024 and 768:** every Employee page starts at x=112 and nothing scrolls sideways.
- **No sideways scroll** on any Employee or Lead page at any desktop width or phone width (320 and 390).
- **Phones 320 and 390:** Manager and Owner match the pre-Phase 4 capture apart from listed changes:
  - The Inbox's Plan ahead group is 40px shorter because of the period dates (TCD-04).
  - Home's Team tools card is 20px shorter at 390 (shared date wording).
  - Team's new spans sit in the same places.
- **Employee and Lead phones:** the More sheet is 335px with Profile, Sign out and Close visible, and Profile opens. No Phase 4 rule reaches phones: every Employee and Lead rule in `premium-desktop.css` is inside a `min-width: 761px` (or 1024/1100) query, which I checked by parsing the file.

### Not covered in round 2

- WebKit was not re-run this round (round 1 matched Chromium to the pixel). Landscape was not re-run.
- The automated sweep (`checks-round-2`) was not cross-referenced.

Open: 1 P0, 2 P1, 4 P2

## Round 4

October 19, 2026. I measured on the preview at `a6f009d` (the preview's source copy matches that commit). Read only: I changed no code or data and pressed nothing that saves. The server was lightly loaded (load average 4–6). Some Home reads for `AUDIT-ON` and `AUDIT-LONG` came back "Couldn't load Home." I retried once and filed nothing from a failed read.

Evidence: `R4` = `S/r4/` (`shots/`, `crops/`, `data/`). The scripts are `r4/big2.mjs` (large text: it checks each title word for a break inside the word, and every band child for clipping past the band's text edge), `r4/resize4.mjs`, `r4/q.mjs`, `r4/q2.mjs` and `phone.mjs`.

Coverage:
- **Large text** at 100%, 125%, 150% and 200%, at 761, 768, 1023, 1024 and 1440:
  - Owner: Home, Inbox, Schedule activity, Timecards, Time exports, Team, Schedule.
  - AUDIT-LONG: Home, My schedule, Shift requests, Time off, Availability, My pay, My time.
  - AUDIT-E: Home, Requests, Notifications, Profile, My schedule.
- **Employee band geometry:** all 14 pages for AUDIT-E at 1440, 1100/1099, 1024/1023, 768 and 761. AUDIT-LEAD at 1440, 1024, 768 and 761.
- **Owner tab pages and Inbox:** 1440, 1180/1179, 1024/1023, 768 and 761.
- **Header with a long name vs a normal one:** AUDIT-LONG and AUDIT-M at 761–1440.
- **Collapsed sidebar** at 1440.
- **Phones** at 320 and 390 for all four roles.

**The worktree moved on again.** After `a6f009d` it has `3957c05` and `a2d9823`, plus uncommitted edits to `premium-desktop.css`, `app-shell.tsx` and `manager-inbox.tsx`. Two of them touch my findings:
- `a2d9823` AL4-29 turns the Request pages row into a list until it fits, and keeps its words whole (WR4-18).
- `a2d9823` also puts "My pay on the band rules", which may affect the My pay title in WR4-06.

The preview does not have either, so I did not measure them. Line numbers below are `a6f009d`'s.

### Status

| ID | Status | Measurement now |
|---|---|---|
| WR4-11 | **Fixed** | No title anywhere breaks inside a word at 125–200%, and nothing in a band runs past its text edge:<ul><li>Owner greeting: 1 line at 1440, 2 lines at 125% 768 (231px band), 3 lines at 200% 768 (404px band).</li><li>"Schedule activity": 1 line, and 2 lines at 200% 768.</li><li>Inbox filters move to their own row at 125% from 768 down and at 200% from 1024 down. They scroll at their own width.</li><li>AUDIT-E Home: "N items need your review" (209–342px wide) moves under the title at 125–200% from 768 down and at 200% at 1024.</li><li>Employee view chips (My schedule, Shift requests) move under the title or scroll; they are never cut.</li></ul>One gap is left at 761–1023 on Home's views; see WR4-17. |
| WR4-12 | **Fixed as filed, but it regressed (WR4-18)** | Three across at every width. The row is 60px at 1440 and 1023, 68px at 1180, 1179, 768 and 761, and 90px at 1024, because the labels now split inside words. |
| WR4-13 | **Fixed** | The AUDIT-LONG account button is 208px wide at 761–1100 (name capped at 8rem) and 272px from 1101. The trail's last crumb gets its full 40px ("Home") at every width from 761. At 761 there are 225px between the trail start and the bell, so longer names ("Notifications", "Shift requests") fit too. AUDIT-M's button is unchanged at 177px. |
| WR4-15 | **Fixed** | Profile's two cards share one top: y=263 for both at 1440 and at 1024. Stacked at 1023. |
| WR4-06 | **Partly fixed** | Manager and Owner at 1024 and up: Timecards, Payroll runs, Time exports and Payroll settings all put the title at y=181 (184px bands). **Still open** (see the bullets after this table). |
| WR4-14 | **Not fixed** | My schedule week rows at 1100, 1150 and 1180 (the week column is 436–484px): the position still drops to a second line starting with "·". Location at y=574, then "· Customer Support" at y=596, and the `::before` content is still `"·"`. One line from 1279. The shared fix (`408b603`) keeps the separator whole in the line at `employee-my-schedule.tsx:94`, but the week rows render location and position as separate spans (`:196-197`), so they still split. |
| WR4-16 | **Not fixed** | Employee Home To do at 320: "Mon, October 19, 202 / 6". The date span is 157×39px, two lines. With non-breaking spaces the whole date is 167px, wider than the 157px column, so the browser breaks it inside "2026". At 390 it fits on one line (167px). |
| WR4-02 | Waiting on the Profile merge (not counted) | Manager and Owner More › Profile still land on `/app` at 320 and 390. |

WR4-06 is still open in three places, so it stays a P2:
- **Manager and Owner below 1024:** the spacer applies only from 1024 (`premium-desktop.css:449-451`). So the title still jumps 20px between Timecards (y=181) and Payroll runs, Time exports and Payroll settings (y=161). Applying the spacer at 761–1023 would push Time exports to 208px at 768 (its summary takes two lines there). The fix that keeps the cap: shorten the band summary to one line for these pages at 761–1023. Or accept 208px for that one band.
- **Employee Pay tabs:** My pay's title is at y=189 at 1024 and up (y=169 below) while My time and Timecards are at y=181. That's 8px apart (12px below 1024). `a2d9823` may cover this; not measured.
- **Employee Requests tabs:** Overview y=181 vs Time off, Shift requests and Availability y=183 at 1024 and up (2px). Below 1024: 161 vs 163.

### New findings, round 4

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| WR4-17 | Home's views (Attendance, Team overview, Schedule activity) · Manager and Owner · 761–1023 at 125–200% text | View chips row under the title | Below 1024 the chips have their own row but can't scroll, so they run past the band and are cut at its edge. The cut chip is the selected one ("Schedule a…", "Sc…"). Measured as the chip row's overrun past the band's text edge:<ul><li>768: 44px at 125%, 111px at 150%, 238px at 200%.</li><li>761: 75px at 125%, 146px at 150%, 280px at 200%.</li><li>At 100% the row fits exactly (420 in 420).</li></ul>From 1024 the chips scroll and nothing is cut. | `R4/crops/r4-large-a.png` (first two) | `premium-desktop.css:59-60` gives the chips `overflow-x: auto; flex-wrap: nowrap` only inside `@media (min-width: 1024px)`. The 761–1023 rule (`:53-54`) only moves the row. | Move `:60` into the 761px-and-up query, so the chips scroll at every desktop width: `… > .premium-home-view > .nv-pageband .nv-masthead__extra > * { margin: 0; padding: 0; overflow-x: auto; flex-wrap: nowrap; }`. Then add the Inbox's right-edge fade. | P1 |
| WR4-18 | Inbox · both roles · 761–1180 (all but 1023 and 1440) | "Request pages" links | Three across, but the labels split inside words:<ul><li>1024: "Time / off", "Shift / reque / sts", "Availa / bility" (90px row).</li><li>768, 1180 and 1179: "Shift / requests" and "Availabilit / y" (68px row).</li></ul>Each cell is about 128px wide at 1024 and 150px at 768, of which the tile, gap and padding take 76px. | `R4/crops/reqrow-r4.png` | `premium-desktop.css:350` (`repeat(3, minmax(0, 1fr))` at every desktop width) with `.nv-row__title { overflow-wrap: break-word }` (`kit.css:205`) and `white-space: normal` (`:349`) | `a2d9823` (AL4-29) appears to do this: three across only when the card is at least 36rem, otherwise a short list, with `overflow-wrap: normal; word-break: keep-all` on the titles. Re-measure once it's on the preview. | P1 |

### Checked and correct

- **Employee and Lead bands at 100% text:** every page is 200px or less at 761, 768, 1023, 1024, 1099, 1100 and 1440.
  - Home 172 (164 below 1024); My schedule 120 (172 below 1024, chips on their own row).
  - Requests overview 184 (164); Time off, Shift requests and Availability 188 (168–192 below 1024).
  - My time and Timecards 184; My pay 192 (196 at 768).
  - Profile, Updates and Notifications 116 (Notifications 140 at 768).
  - Lead's band geometry matches Employee on all 56 page-and-width pairs. No sideways scroll anywhere.
- **Pay tabs** read "My pay, My time, Timecards" inside the band on all three pages. The sidebar lights My time (My time and Timecards) and My pay (My pay). The trail ends with the page name.
- **Tab-row spacer:** works at 1024 and up for the Manager and Owner Time and pay tabs (all four titles at y=181). See WR4-06 for the rest.
- **Collapsed sidebar at 1440:** Timecards' tab box and band, the Inbox band, My time and Profile all start at x=112. The band text and tab text are at x=148. Time off is at 112.
- **Large text, Manager and Owner:** Timecards, Time exports, Team and Schedule keep one-line titles and no clipping at 125–200% at every width. The band controls (Refresh, Add employee, Add shift) end 12px past the text edge, which is the ghost-control padding by design. Their text sits on the edge.
- **Phones at 320 and 390**, compared with the pre-Phase 4 capture: Manager and Owner Home, Inbox, Team, Timecards, Time exports and Attendance match apart from the changes already explained in round 2. The Plan ahead group is 40px shorter (period dates), Home's Team tools card is 20px shorter at 390, and Team has the new spans. The Inbox also has one more element, a visually hidden `SPAN.nv-sr` (screen-reader text, nothing on screen).
- **Employee and Lead phones:** the More sheet is 335px and Profile opens. No sideways scroll on any of the seven pages checked at 320 or 390. WR4-16 is the only defect.

### Gaps

- WebKit was not re-run this round (round 1 matched Chromium to the pixel).
- Employee Home at large text was measured for AUDIT-E only. AUDIT-ON and AUDIT-LONG Home returned "Couldn't load Home." twice and were not filed. In that failed state the empty title-row slot still drops to its own row and adds about 56px of empty band at 125–200%; worth a look once the read succeeds.
- Lead was not run at 1100/1099 and 1023; at its other widths it matched Employee exactly.
- `/api/manager/inbox-count` returns 404, as expected on this branch.

Open: 0 P0, 3 P1, 2 P2

## Round 5 (exit round)

October 19, 2026. I measured on the preview at `8012d97`, and the preview's source copy matches that commit. Read only: I changed no code or data and pressed nothing that saves. I opened More sheets and followed Profile links, and collapsed the sidebar in my own browser only. Load average was 9–13. Every page loaded on its first or second try.

Evidence: `R5` = `S/r5/` (`data/` holds JSON per account, `shots/` holds screenshots of every flagged state, and `crops/`). Scripts: `r5/big3.mjs` and the analyser `r5/an.py`.

`big3` checks every band in every state:
- each title word for a break inside the word
- each band child for running past the band's text edge
- sideways scroll
- the band cap at 100% text (200px)
- each Request pages label and each chip or tab label for a break inside the word
- each trail crumb for being cut

Coverage:

| Run | Accounts and pages | Text | Widths |
|---|---|---|---|
| Full sweep, Chromium | Owner: 16 pages. Manager: 11. AUDIT-E: 14 | 100, 125, 150, 200% | 761, 768, 1023, 1024, 1179, 1180, 1440 (1,120 states) |
| Lead | AUDIT-LEAD: 11 pages | 100%, 200% | same 7 widths |
| Home and Profile | AUDIT-ON, AUDIT-BREAK, AUDIT-LONG | 100, 150, 200% | same 7 widths |
| Sidebar collapsed | Manager: 5 pages. Employee: 4 | 100%, 200% | 1440, 1024, 768 |
| Header | AUDIT-LONG vs AUDIT-M | 100% | 761–1440 |
| My schedule and Profile | AUDIT-E | 100% | 1099–1440 |
| Phones | All four roles | 100% | 320, 390 |
| WebKit spot checks | Owner: Inbox, Schedule activity, Timecards, Team. Employee: Home, My pay, Shift requests, My schedule | 100%, 200% | 1440, 1024, 768, 761 |

### Status

| ID | Status | Measurement now |
|---|---|---|
| WR4-06 | **Fixed** | Every sibling tab puts its title at **y=181**, at every width from 761 to 1440, in all four tab families:<ul><li>Owner Time and pay (Timecards, Payroll runs, Time exports, Payroll settings).</li><li>Manager Time and pay.</li><li>Employee Requests (Overview, Time off, Shift requests, Availability).</li><li>Employee Pay (My pay, My time, Timecards).</li></ul>Bands are 184px from 1024. At 761–1023 they range from 172 to 200px, all within the cap. |
| WR4-14 | **Fixed** | My schedule week rows at 1100, 1150, 1180 and 1279: position is on its own line (location y=570, position y=592) and the `::before` is `none`. From 1280 they share one line with the "·" (both at y=581). At 1099 it is stacked with no dot. |
| WR4-17 | **Fixed** | Home's view chips scroll sideways at every desktop width. At 125% 768 (and 150% 768, 200% 761) the chip row is 420px, exactly the text area; it scrolls and nothing is cut. |
| WR4-18 | **Fixed** | No Request pages label breaks inside a word in any of the 56 Inbox states (both filters, 4 text sizes, 7 widths). It is a 3-row list (164px) where three across won't fit: 761–1180 except 1023, and from 150% text. It is three across (60px) at 1023 and 1440 at 100%. |
| WR4-16 | Coordinator's phone fix; not counted | **Still not fixed.** At 320, AUDIT-E and AUDIT-LEAD both show "Mon, October 19, 2026" as a 157×39px span (two lines) in a 157px column, so it breaks inside "2026". At 390 it fits (167px, one line). |
| WR4-02 | Waiting on the Profile merge; not counted | Manager and Owner More › Profile still land on `/app` at 320 and 390. |
| WR4-05 | Kept by decision | Unchanged. |

### New finding

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| WR4-19 | Desktop header · Owner at 100% text (Manager from 125%) · 761–768; Chromium and WebKit | Last crumb of the trail (the page's own name) | Below 1101 the trail shows only the page name. The Owner's header leaves it about 92px before Search (Search at x≈354), so longer page names are cut with an ellipsis:<ul><li>"Team overv…" and "Payroll setti…" at 768 and 761.</li><li>"Schedule activity" cut at 768 and 761 (also in WebKit).</li><li>"Time exports" cut at 761.</li></ul>The Manager ("Morgan Rivera") fits at 100% but is cut the same way at 125%. Nothing is lost, because the band title below repeats the name, but the trail no longer names the page. That's the round-1 rule for D-4. Judgment call: the ellipsis is designed (TCD-17), so this is P2. | `R5/crops/WR4-19-trail-768.png` (first two rows) | `premium-desktop.css:430` (the last crumb ellipsizes) next to Search (`portal-gusto.css:372`, 139px with ⌘K) and the account name (8rem at `:431`) | Below 900px, show the account trigger as avatar and chevron only (hide the name span; the button already has its label), and drop the "⌘K" hint from Search. That frees about 160px, so "Payroll settings" and "Schedule activity" fit at 761. | P2 |

### Full sweep: checked and correct

- **Band titles at 100–200% text:** across all 1,120 Owner, Manager and Employee states, plus Lead, AUDIT-ON, AUDIT-BREAK and AUDIT-LONG:
  - no title word breaks inside the word
  - no band child runs past the band's text edge
  - no page scrolls sideways
  - no band is over 200px at 100% text

  The highest at 100% are 200px (Owner Payroll runs, Time exports and Payroll settings at 768, Employee Availability and My pay at 768), then 198px (Shift requests at 768) and 196px (Attendance). Controls move under the title at large text and scroll at their own width.
- **Breakpoints:**
  - The Home grid switches at 1179/1180.
  - Inbox list and pane at 1023/1024.
  - Team table at 1023/1024.
  - My schedule's side column at 1099/1100.
  - Profile's two cards at 1023/1024 (card tops 263 and 263 at 1024 and 1440).
  - Account name cap: 208px for AUDIT-LONG up to 1100, 272px from 1101. Manager 177px. The trail's last crumb is a full 40px for "Home" from 761.
- **Collapsed sidebar** at 1440, 1024 and 768: every band and tab row starts at x=112, tab text at x=148, the Time off page at x=112. No sideways scroll.
- **Roles:**
  - Lead matches Employee on every band.
  - Owner-only Payroll runs and Payroll settings sit on the shared Time and pay title line.
  - Manager is sent Home from Payroll (round 1, unchanged).
- **WebKit spot checks:** same results as Chromium for Owner Inbox, Schedule activity, Timecards and Team, and for Employee Home, My pay, Shift requests and My schedule, at 100% and 200%. The only flags are WR4-19 and workspace-name ellipses.
- **Phones at 320 and 390, against the pre-Phase 4 capture:** Manager and Owner Home, Inbox, Team, Timecards, Time exports, Attendance and Schedule match apart from the changes already explained:
  - Plan ahead is 40px shorter.
  - Team tools is 20px shorter at 390.
  - Team has the new spans.
  - The Inbox has one screen-reader-only span.
  - Schedule's height differs by 3–4px, which is data (seen since round 1).

  Employee and Lead: More sheet 335px, Profile opens, no sideways scroll. Owner More: Close stays in view.

### Gaps

- The trail check also flags the workspace name ("Northside QA Workforce") being ellipsized at large text. It has a `title` and is designed to shorten, so it is not filed.
- I did not check the trail at 1101–1179 with 125% text and above separately. It shortens the same way as the band repeats the name.
- `/api/manager/inbox-count` returns 404, as expected on this branch.

Open: 0 P0, 0 P1, 1 P2
