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
