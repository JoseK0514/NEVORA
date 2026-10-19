# Phase 4 desktop inspection, round 1: alignment and geometry

October 19, 2026 · Inspector: alignment and geometry (prefix AL4-) · Preview `access.json` URL, fictional data, Manager `AUDIT-M` and Owner `QAOWNER` (Employee `AUDIT-E` and Lead `AUDIT-LEAD` for the shell sample only).

**Build measured.** The preview as served from about 11:20 to 13:20 AST. That is the build before commit `2dea5ac`: the Inbox pane's sticky `top` measured 16px, which `2dea5ac` changes. Three commits landed while I was inspecting (`2dea5ac`, `65577e0`, `c232432`), and the preview hadn't been synced to them when I last checked. File and line references are to HEAD `c232432` unless marked otherwise. Items those commits may have changed are marked **re-check**.

## Verdict

The new desktop geometry mostly holds at 1024 and 1440:
- **Bands:** 168, 184 and 196px. Band text sits on the card text edge (280 and 318).
- **Title rows:** the Inbox filters and Home's view chips are centred on the title box (155/155 and 167/167).
- **Home:** the columns start together.
- **Inbox:** list and pane tops are equal, with a 16px gap. The pane is padded 20px. The selected row's teal edge is exact.
- **Team table:** each column header sits over its cells to 0px, and avatars and chevrons are centred to 0px.
- **WebKit:** matches Chromium within 0.5px.
- **Phones (320 and 390):** geometry is unchanged from the pre-Phase-4 baseline, apart from the intended 15px labels.

The defects are elsewhere:
- **One unreadable collision:** on Timecards, "Details" is drawn over a long name that wraps.
- **A 768 regression:** the band text moved 12px left of the card text on every band page. Phase 2's AL-21 had fixed this.
- **Legacy content on the desktop pages:**
  - Time exports' Recorded and Breaks values don't sit under their headers.
  - Its totals panel has no inset.
  - Schedule's location chips wrap into stacked rows at 768 and 1024.
  - Schedule's toolbar has a shadow frame with nothing in it.
- **Shell:** kit pages centre a 1120px column while the header trail and every other page start at the left. At 1440 that's a 6px step; at 1920 it's 246px.
- **Account menu:** Chromium draws it see-through over the band. WebKit doesn't.

Count: **1 P0, 7 P1, 10 P2.**

Method:
- Playwright with the saved sessions, one browser at a time.
- Boxes from `getBoundingClientRect`.
- Baselines and cap centres from text-node ranges plus canvas font metrics.
- Causes traced by matching stylesheet rules against the element.

Scripts, JSON and images are in `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p4-desktop-240fe0/55a133fe-0aa8-4472-a3aa-f939856da789/scratchpad/inspect/alignment/` (`crops/` and `shots/` below). Coordinates are CSS px in page space.

## Findings, worst first

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| AL4-01 | Timecards · M and O · 1024, 1440 (768 not measured) | Person row name `[class$="__rowIdentity"] h2` and its "Details ›" summary | **"Details" is drawn on top of a wrapped name.**<br>• 1440: "María José Rivera Santiago With A Long Name" wraps to 3 lines (box 1126–1192, x 370–550). "Details" (1142–1186, baseline 1169) lands on the name's second line, so "Santiago" is unreadable.<br>• 1024: name 1442–1508 (3 lines), Details 1458–1502.<br>• "María José Fictional QA" is one line at 1440 (fine) but 2 lines at narrower columns. | crops/tc-1440-long.png | `timecards.module.css:194` places the summary `position:absolute; top:36px`, assuming the one-line name that `:196` sets (`nowrap` plus ellipsis). `portal-premium.css:310` (all widths) then sets the name to `white-space:normal; overflow:visible`, so on desktop it wraps under the absolute link. | In `premium-desktop.css`, inside the desktop query, restore the module's intent for desktop: `…[class*="__managerRoot"] [class$="__rowIdentity"] h2 { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }`. The full name stays in the heading's title. Or make the summary static (`position: static; margin-top: 4px`) and drop `.rowMain`'s 26px bottom padding. | P0 |
| AL4-02 | Every band page · M and O · 768 (761–1023) | Band eyebrow, title and summary against card text | **The band text sits 12px left of the card text:** 268 against 280 on:<br>• Home, Inbox, Team, Schedule, Home › Team overview<br>• Timecards, Payroll, Time exports<br>• the error page<br>At 1024 and 1440 they match (280/280, 318/318). This regresses Phase 2's AL-21 (fixed at 280/280 on Oct 18). | crops/AL4-band-768.png, crops/sched-768.png | `premium-desktop.css:47` `padding-inline: var(--nv-s-6)` (24px) in the 761–1023 block, against content 16 plus card 20 = 36. | `padding-inline: 36px` at `:47`. To keep Inbox's filters on the title row at 768, give its chips `padding: 0 10px` there: the row shrinks from 344 to about 312px and leaves about 92px for "Inbox" (84px). Re-measure that the band stays at 200px or less. | P1 |
| AL4-03 | Inbox · M and O · 1024, 1440 · **re-check** | Sticky detail pane against the sticky desktop header | Scrolled 1500px at 1440:<br>• The header (`position:sticky`, z 30) covers 0–65. The pane sticks at **top 16**, so its top 49px are hidden behind the header: the avatar and the "Morgan Rivera" title.<br>• Clicking a row moves focus to that heading, which is under the header.<br>• At 1024×768 the sticky side column is 836px tall (pane 518 + 16 + All requests 302), taller than the 703px below the header. The last All requests rows are only reachable at the end of the list. | shots/stk-AUDIT-M-_app_inbox-1440.png | `premium-desktop.css` before `2dea5ac`: `top: var(--nv-s-4)`. | Source now has `top: calc(65px + var(--nv-s-4))` (`:117`, `2dea5ac`), and `65577e0` moves All requests. Sync the preview and re-measure the pane top (81) and the column height at 1024×768. | P1 |
| AL4-04 | Time exports · M and O · 1024, 1440 | "Recorded" and "Breaks" column headers against their values | The headers are right-aligned (they end at 866 and 952 at 1024, 811 and 897 at 1440). The values are left-aligned in the same boxes: "6h 41m" 776–831, "0h" 776–794.7.<br>At 1024, "0h" ends **71px** short of its header and "6h 41m" 35px short. The numbers sit under the gap between columns, not under their labels. | crops/exports-1440-top.png | `portal-premium.css:793` makes `[class$="__hours"]` `display:flex` (for the phone wrap), so the module's `text-align:right` (`payroll-export.module.css:53`) no longer applies. | `premium-desktop.css` desktop block: `….premium-exports [class*="payroll-export-module"][class$="__hours"] { justify-content: flex-end; }`. Values then end at 866 and 952 under their headers. | P1 |
| AL4-05 | Time exports · M and O · all widths (1440, 1024, 390 measured) | Export summary totals (`[class$="__totals"]`: Selected employees, Recorded time, Separate break total) | **A grey panel with no inset:**<br>• Label text starts at the panel's left edge (965 = 965 at 1440; 284 = 284 at 1024; 36 = 36 at 390).<br>• The first line touches its top (596.75).<br>• The values end at its right edge (1362). | crops/exports-1440-top.png | `portal-premium.css:792` gives `__totals` the inset background and radius, but its padding stays the module's `0 0 20px` (`payroll-export.module.css:59`). | Add `padding: var(--nv-s-3) var(--nv-s-4)` to `__totals` in that rule. Or drop `__totals` from the `:792` list, so it reads as plain rows like the other fact lists. | P1 |
| AL4-06 | Schedule · M and O · 768, 1024 | Location chips `.schedule-location-control .segmented` | The segmented control wraps instead of scrolling:<br>• 768: three stacked rows, 146px tall. All locations (264–541), Main Office (264–493) and West Office (264–504) are each on their own line.<br>• 1024: two rows, 99px, with "West Office" alone under "All locations".<br>Phones scroll one row; 1440 fits one row (298–1057.7). | crops/sched-768.png, crops/AL4-sched-chips-1024.png | `globals.css:5156-5159` `[data-expanded-locations="true"] .segmented { flex-wrap: wrap }` applies on desktop. The phone fix (`manager-schedule.css:147-148`) is phone-only. | `premium-desktop.css` desktop block: `….manager-schedule-page .schedule-location-control .segmented { flex-wrap: nowrap; overflow-x: auto; max-width: 100%; }` and `… .segmented a { flex: 0 0 auto; white-space: nowrap; }`, with the WR-52 edge fade. | P1 |
| AL4-10 | Shell and every kit page · M and O · 1440 (and wider) | Kit page column against the header trail, section tabs and non-kit pages | Kit pages (Home, Inbox, Team, Schedule) centre a 1120px column, so the band runs 282–1402. Everything else starts at the left:<br>• header trail 276, actions end 1408<br>• section tabs 276–1408 (measured build)<br>• Updates, Settings, Insights, Time off, Shift requests and Availability start at 276<br>Going from Inbox to Time off (which still lights Inbox) moves the left edge **6px at 1440** and **246px at 1920** (522 against 276). | crops/AL4-tabs-1440.png; JSON `j-hdr.json` | `portal-premium.css:56` `max-width:1120px; margin-inline:auto`, which contradicts `portal-desktop.css:1-14` ("Nothing is centred, so moving between pages never shifts the content"). `premium-desktop.css:194` copies it for the placeholders. | Left-align the kit column on desktop: `premium-desktop.css` desktop block `….page-frame.page-frame > [data-nv-page][data-nv-page] { margin-inline: 0; }` and `margin-inline: 0` at `:194`. Kit pages then start at 276 with the trail and every other page, and end at 1396. **Re-check** with `65577e0`'s tabs-in-band. Judgment on severity: 6px at 1440 is P2-sized, but the 246px jump at 1920 is plainly visible. | P1 |
| AL4-15 | Shell account menu · O (M same component) · 1024, 1440 · Chromium only | Desktop account menu popover `.nevora-action-menu-popover` | In Chromium the open menu is **see-through**: the teal band, "Add employee", "12 employees" and "Location" show through the white panel (2 runs, 600 and 1500ms after opening). WebKit draws it opaque.<br>The popover itself is opaque white, `:popover-open`, z 100, top layer, and it wins hit-testing. Its ancestor `.mobile-header` has `backdrop-filter: blur(16px) saturate(1.8)` on `rgba(255,255,255,.78)`. | crops/menu-1440-b.png against crops/menu-1440-wk.png | Likely the header's `backdrop-filter`, which the popover (a header descendant) is painted against. Not proven: confirm in desktop Chrome. | Confirm in desktop Chrome. If it reproduces, drop the header's `backdrop-filter` on desktop when `:has(.nevora-action-menu-popover:popover-open)`, or render the menu outside `.mobile-header`. The colour inspector may own this; I file it because the shell is this session's. | P1 |
| AL4-07 | Schedule · M and O · 768, 1024, 1440 | Week toolbar `.schedule-operations-shell > .mws-toolbar` | **A shadow with no card:** e1 shadow and radius 16 on a transparent box with 0 padding. A faint frame hugs the buttons: the period control starts at the frame edge (298 = 298), and "More" sits on the frame's right edge (1386). At 768 the row wraps: "Templates" and "More" go to a second line, left-aligned (260), inside the same frame (108px tall). Phones get a white card with 16/20 padding. | crops/AL4-sched-toolbar-1440.png, crops/sched-768.png | `portal-premium.css:827` (shadow at all widths) and `:380` (radius), while the background and padding come only from phone-only `mobile-workforce.css:118`. | `premium-desktop.css` desktop block: `….manager-schedule-page .schedule-operations-shell > .mws-toolbar { box-shadow: none; border-radius: 0; }`. A flat toolbar on the canvas, like Timecards' period panel. | P2 |
| AL4-08 | Home · Manager · 768, 1024 (761–1179) | Gap between "Also needs you" and "This week" | **32px where every other card gap is 16:** 1107→1139 at 768, and the same at 1024. Owner (with "Finish setting up") is 16/16. | crops/AL4-home-gap-1024.png | `premium-desktop.css:64` `grid-template-areas: "today" "now" "setup" "week"`. Without a setup card, the empty `setup` track still adds a second row gap. | Add `….premium-home > .premium-home__grid:not(:has(> .premium-home__setup)) { grid-template-areas: "today" "now" "week"; }` in the same 761px block. | P2 |
| AL4-09 | Home · Manager · 1180, 1440 | Where the two columns end | The columns start together (427/427), but for the Manager the right column runs much longer:<br>• 1180: left ends 1067, right 1329 (**262px**)<br>• 1440: 1067 against 1217 (150px)<br>Owner ends 1338/1329 at 1180 (9px, as intended) but 1338/1217 at 1440 (121px). | shots/h-AUDIT-M-_app-1180.png, shots/h-AUDIT-M-_app-1440.png, shots/h-QAOWNER-_app-1440.png | `premium-desktop.css:71-75`. With no setup card, everything except "Also needs you" stacks on the right. "Plan ahead" sits inside `.premium-home__week` (`premium-home.tsx`). | Judgment. For the Manager, move "Plan ahead" out of the week wrapper and under "Also needs you" (`grid-template-areas: "today today" "now week" "plan week" ". week"`). Estimate: left 1179 against right 1217 at 1180 (38px), and 1159 against 1125 at 1440 (34px). | P2 |
| AL4-11 | Team · M and O · 1024 (1440 milder) | Table name column and row alignment | At 1024 the Name column is 174px (332–506):<br>• "María José Rivera Santiago With A Long Name" wraps to **3 lines** (row 90px) and "María José Fictional QA" to 2.<br>• Role (522–638) holds one word with room to spare.<br>• Single-line cells are centred on the block, so Role, Location and Phone baselines sit 22px below the name's first baseline (869 against 891). At 1440 it's 2 lines and 11px.<br>Avatar, chevron and the column-header x are exact. | crops/AL4-team-1024.png | `premium-desktop.css:141` `grid-template-columns: 1.5fr 1fr 1.2fr 1fr`, `align-items: center`. | Judgment. From 1024 to 1179, use `minmax(0,2fr) minmax(0,.8fr) minmax(0,1fr) minmax(0,1fr)` (both the header and the rows use this rule). Use `align-items: first baseline` for the text cells, so Role, Location and Phone read on the name's first line. The avatar stays centred on the row. | P2 |
| AL4-12 | Time exports · M and O · 1024, 1440 | Card insets and gaps | Export cards are padded **24**, so text and icon sit at 322 at 1440 against the band text and the "Complete payroll" panel at 318 (1024: 284 against 280). Gaps are **20**: Pay period → workspace, and between the two columns (921→941). Kit cards and gaps are 20 and 16. | crops/exports-1440-top.png | `payroll-export.module.css:2` `.card{padding:24px}` (20 only on phones, `:126`), `:1` and `:32` `gap:20px`. | `premium-desktop.css` desktop block: `….premium-exports [class*="payroll-export-module"][class$="__card"] { padding: var(--nv-s-5); }` and `:is([class$="__root"], [class$="__workspace"]) { gap: var(--nv-s-4); }`. | P2 |
| AL4-18 | Timecards · M and O · 1440 | "12 timecards in this period." beside View period and Refresh | The status line sits at the bottom of the 48px row: cap centre 372.9 against the buttons' centre 360 (**13px low**). It reads as hanging below the buttons. | shots/a-AUDIT-M-_app_timecards-1440.png | The period panel's row aligns its items to the end (the fields have labels above). The status paragraph inherits that. | Judgment. `align-self: center` on the status (`[class$="__periodPanel"] > p`, or the module's status class) in the desktop block, so it centres on the buttons (cap centre 360). | P2 |
| AL4-13 | Shell sidebar · all roles · 768, 1024, 1440 | "Powered by VELANI LLC" | Text at x 26, while group labels are at 28 and nav icons at 28.5 (1440). At 768 and 1024 it's 22 against 24 and 24.5. It is **2px left** of the sidebar's column. | shots/a-AUDIT-M-_app_schedule-1440.png (lower left) | `globals.css:7742` `.sidebar-platform-footer{padding:8px 10px 0}` against the labels' 12px (`portal-gusto.css:205`). | Next to `premium-desktop.css:272`: `….sidebar .sidebar-platform-footer { padding-inline: 12px; }`. | P2 |
| AL4-14 | Shell account menu · M and O · 1024, 1440 | "Signed in as …" heading and the divider | The heading text is at 1111 while the items are at 1109 (2px right). The divider runs 1101–1397, inset 2px on each side of the items' 1099–1399. | crops/menu-1440-wk.png | `.portal-account-heading` `padding: 8px 12px 4px` against items' 10px; `globals.css:307-310` `.nevora-action-menu-divider{margin:6px 2px 8px}`. | Heading `padding-inline: 10px`; divider `margin-inline: 0` (desktop account menu only). | P2 |
| AL4-16 | Team, Inbox (list and pane) · M · 1440 at 200% text | Kit avatars and initials | Avatars stay 40px (48px in the pane) while the initials grow to 28px: "AR", "CR", "MR" spill past the circle edge, and the pane's "MR" crowds its 48px circle. | shots/z200-AUDIT-M-_app_employees-1440.png, shots/z200-AUDIT-M-_app_inbox-1440.png | Kit `.nv-avatar` and `.nv-tile` sizes are in px while the initials are in rem (`kit.css`, coordinator's file). | Size the avatar in rem (`2.5rem`; pane `3rem`), or set the initials in px. Ask the coordinator. | P2 |
| AL4-17 | Home · M and O · 768–1440 (kit, likely every width) | "Plan ahead" card (one row) | The tile sits **14px** from the card top and **22px** from its bottom (card 727–803, row 727–795 at 1440; 759–855 and 759–847 at 1180). The single row is top-heavy by 8px. | shots/h-AUDIT-M-_app-1440.png | The `.nv-rows` list's 8px bottom padding after the last row, with no matching top padding when the row is the card's only content. | `.nv-card > .nv-rows:only-child { padding-block: var(--nv-s-1); }` (4/4), or remove the bottom 8 when the list is the only child. Kit rule: ask the coordinator. | P2 |

## Checked and correct

- **Sidebar, all roles:**
  - Items are 36px; the icon centre equals the label's cap centre within 0.2px (Home 153.59/153.41 at 1440).
  - Group labels are at x 28 (24 at ≤1023), on the icon column (28.5). Each label sits 10px below the previous item and 2px above its first item.
  - Workspace is pinned with its hairline. Employee and Lead items are 36px, with icons centred (122/121.81).
- **Header:**
  - 65px tall; Search, bell and account are all centred at y 32.
  - Baselines: trail 36.91, Search 36.84, account name 36.
  - The trail collapses to the current page at ≤1100 (WR-08), and reads "Plan › Inbox › Time off" (and Shift requests, Availability) at 1440. The first "›" has 4px extra on its left, deliberately (`portal-desktop.css:43`).
- **Bands (measured build):**
  - Heights: Home 168, Inbox 196, Schedule 168, Team 168, Timecards 136, and Home's views 184 at 1024 and 1440.
  - At 768: 160, 188 and 196.
  - Band text equals card text at 1024 (280) and 1440 (318).
  - The eyebrow-row controls (Refresh, Add shift, Add employee) end their text at the band text edge (1366, 956, 712), and their label baseline equals the eyebrow's (124/124).
- **Title rows:** the Inbox filters are centred on the title box (155/155) and end at 1366. Home's view chips are centred at 167/167 from 1024. At 768 they take their own row, with the description hidden.
- **Home:**
  - Today runs the full width.
  - At 1180 or wider, the columns start together (427/427) with a 16px gap. The split is 7:5 (625/447 at 1440). Below 1180 it's one column.
  - Row tiles and chevrons are centred on their rows.
- **Inbox, list and detail (1024 and 1440):**
  - Column tops are equal (249/249) with a 16px gap; the pane's right edge is 1386 (0.02px off).
  - The pane is padded 20px.
  - The 48px avatar is centred on the title and meta block (293 against 294.5).
  - The pill sits 16px below the head and the facts 16px below the pill. Facts are 48px with label and value on one baseline (409/409).
  - The note is padded 12/16. The button and the link are centred together (649/649); the link wraps under the button at 1024.
  - The selected row has the wash at full card width, a 3px teal edge on the card edge (6px from top and bottom, radius 0 3 3 0) and `aria-current`.
  - All requests: tiles and chevrons are centred, with chevrons 20px from the edge.
- **Team table (1024 and 1440):**
  - Headers sit exactly over their cells: 370/679/890.3/1140.7 at 1440 and 332/522.2/654.4/809.8 at 1024.
  - Avatars are centred on the row (0px), with initials within 0.1px. Chevrons are 20px from the edge and centred.
  - One-line rows are 64px. Dividers start at the name x, and the header hairline runs the full width.
  - In the find card, the fields are top-aligned at 297, the pills 12px below them, and 20px clear the bottom.
- **WebKit spot checks** (Inbox 1440 with the pane and selected row; Team 1024): within 0.5px of Chromium.
- **Phones (Manager, 320 and 390):** I diffed the geometry of Inbox, Team and Schedule (and Home at 390) against the pre-Phase-4 baseline (`rt/phone-base.json`). There is no change except the intended ones:
  - the Lead chip label went from 11 to 15px (+3 or 4px on that card)
  - the header Search label went from 14 to 15px
  - Team's role, place and separator spans were restructured with unchanged positions

## Gaps

- I measured the preview build before `2dea5ac`. I haven't seen the source changes in `2dea5ac`, `65577e0` and `c232432` (pane `top`, All requests placement, section tabs inside the band, band titles, the sidebar 14px rules) running. AL4-03 and AL4-10 need a re-check after the sync. AL4-02 still applies in source (`:47`).
- The preview was under heavy load: many reads came back "unavailable" or "could not be loaded" and were retried. I couldn't get the Time exports evidence crop again (it shows the unavailable state), so AL4-04, AL4-05 and AL4-12 rely on the first crop and the JSON.
- Home at 320 didn't load during the phone diff run. Home at 390 matched.
- I looked at 200% text only at 1440 (Home, Inbox, Team), and loading and error states only in passing (the error page band at 768). `checks-round-1.txt` wasn't there yet, so I didn't cross-reference it.
- I didn't press anything that saves. The account menu was opened and measured only.

Open: 1 P0, 7 P1, 10 P2

## Round 2

October 19, 2026, afternoon · Preview synced to the latest branch build (HEAD `41de13a`, after `0abdc74` and the coordinator's shared fixes), same URL and states. What I covered:
- Manager and Owner at 768, 1024, 1440 and 1920 (left edge only).
- Employee `AUDIT-E` at 768, 1024, 1440, 320 and 390, and Lead `AUDIT-LEAD` at 1440.
- Chromium, with viewport captures where a popover was involved.

New images are in `…/scratchpad/inspect/alignment/r2/` and `shots/r2*`. File and line references are to HEAD.

### Status of round-1 findings

| ID | Status | Measurement now |
|---|---|---|
| AL4-01 | **Fixed** | "Details" now follows the name in flow, so nothing is drawn over it. At 1440 the 3-line name runs 1389–1455 and Details 1459–1503; at 768 the name runs 1619–1685 and Details 1717–1761. The new gap is AL4-20. |
| AL4-02 | **Fixed** | At 768, band text equals card text (280/280) on Home, Inbox, Schedule, Team, Timecards, Time exports, Team overview and Updates. Inbox's filters stay on the title row (band 188). |
| AL4-03 | **Fixed** | Scrolled 1500px, the header ends at 1565 and the pane starts at 1581 (16px below it) at 1024 and 1440. The pane alone sticks: 448px at 1024 and 376px at 1440, both within the window. |
| AL4-04 | **Fixed** | Values end under their headers: "8h 5m" and "0h" end at 866 (header 866) and "5h 15m" and "0h" at 952 (header 952) at 1024; 807.3/807.33 and 893.3/893.33 at 1440. |
| AL4-05 | **Fixed** | Totals panel inset 12/16: labels at 973.33 (panel 957.33 + 16) and values end at 1340 (panel 1356 − 16). |
| AL4-06 | **Fixed** | One row at every width. It scrolls at 768 and 1024 (scrollWidth 760 against 460 and 716) and fits at 1440. A new P2 for the fade is AL4-21. |
| AL4-07 | **Partly fixed** | The toolbar is now a white card with the kit shadow. But its padding is 12/16, so the period control starts at 308 (1440) and 276 (768/1024), 4px left of the text edge of every other card on the page (312 and 280). Fix: `padding: var(--nv-s-3) var(--nv-s-5)` at `premium-desktop.css:325`. P2. |
| AL4-08 | **Fixed** | Manager Home gap between "Also needs you" and "This week" is 16px (1107→1123 at 768; 1067→1083 at 1024). |
| AL4-09 | Kept by decision | Not refiled (ROUND-2: data-dependent; the DOM order can't be rebalanced without masonry). Employee and Lead Home show the same pattern: left ends 1043.89 and right 1155 (E); left 1097.89 and right 957 (Lead). |
| AL4-10 | **Fixed** | Every page starts at x 276 at 1440 and at 1920, the same as the header trail: Home, Inbox, Time off, Updates, Settings and Payroll. Bands run 276–1396 with text at 312, cards at 292 with text at 312. |
| AL4-11 | **Fixed** | Columns are 2 / .8 / 1.2 / 1. At 1024 the long name takes 2 lines (was 3), and Role, Location and Phone share its first baseline (866/866/866/866). Headers sit over their cells to 0px (332/566.4/669.8/816.8 at 1024; 364/747.2/910.1/1146.4 at 1440). |
| AL4-12 | **Partly fixed** | The gaps are 16 now: Pay period → workspace 466.5→482.5, and between the columns 917.33→933.33. The cards are still padded **24**: text at 316 against 312 at 1440 (284 against 280 at 1024).<br>The rule at `premium-desktop.css:319` (`[class$="__card"]`) never matches. The class attributes end in `…__card undefined`, `…__employeeCard`, `…__exportCard` and `…__mapping`, because `payroll-export.tsx:108` passes `styles.periodCard`, which is undefined.<br>Fix: use `:is([class$="__card"], [class*="__card "])`, keep the employee card's 0 side padding, and drop the undefined class. P2. |
| AL4-13 | **Fixed** | "Powered by" text at 28 at 1440 and 24 at 768, the same as the group labels (28/24). |
| AL4-14 | **Fixed** | "Signed in as" at 1109 = items 1109; the divider runs 1099–1399 = the item edges. |
| AL4-15 | **Withdrawn** | It was a capture artifact. Chromium's *full-page* screenshot draws the top-layer popover see-through. A viewport screenshot shows it opaque (`r2/c-menu-1440-vp.png`; the full-page `r2/c-menu-1440.png` still shows the artifact). The header is now solid (`rgba(255,255,255,.97)`, no backdrop filter). Not a defect, and I should have checked a viewport capture in round 1. |
| AL4-16 | **Fixed** | At 200% text, Team avatars are 80px and the initials (28px) sit inside them, 333–371 within 312–392. |
| AL4-17 | **Fixed** | Plan ahead: card 727–803, row 731–799, tile 745–785. The tile is 18px from the top and 18px from the bottom. |
| AL4-18 | **Not fixed** | The direction flipped. The status line's cap centre is 329.9 against the buttons' centre of 343: now **13px high**. `align-self:center` (`premium-desktop.css:315`) centres it in a row that includes the field labels above the inputs. Fix: `align-self: flex-end; line-height: 48px` (or `margin-bottom: 14px`), so it centres on the 48px buttons. P2. |

### New findings, round 2

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| AL4-22 | My time · Employee (Lead same component) · 768, 1024, 1440 | "Current status" and "Today" | These two are **square, flat panels** (radius 0, no shadow) on a page whose other cards ("Recent entries", "Corrections") are rounded 16 with the kit shadow.<br>At 1440 they sit side by side with unequal bottoms: Current status 293–591, Today 293–555 (36px).<br>Their text is inset 24 (284 and 316 against the band text at 280 and 312). | shots/r2e-AUDIT-E-_app_my-time-1440.png | `portal-premium.css:1084` flattens `.employee-time-overview .employee-view-surface` (radius 0, no shadow) for the phone's single grouped card. On desktop `.employee-time-overview` is `display: contents`, so the two halves stand alone as bare panels. | In the `premium-desktop.css` desktop block, give `.premium-employee-time .employee-time-overview > .employee-view-surface` `border-radius: var(--nv-r-card); box-shadow: var(--nv-e1); padding: var(--nv-s-5)`, and stretch them to one height in their row (`align-self: stretch`). | P1 |
| AL4-23 | Employee desktop · E · 768–1440 | Card text insets against the band text edge | Kit cards put text 20px in (280 and 312), and Requests, Notifications, My pay and My schedule do. These don't:<br>• **My time:** Recent entries and Corrections padded 24 (316 / 284)<br>• **Timecards:** "Choose a period" panel padded 24 plus a 1px border, radius 12 and no shadow (317 / 285). It's a different card style from the timecard below it (radius 16 with the kit shadow, also padded 24).<br>• **Profile:** Work details padded 28 (320 / 288; phones use 20)<br>• **Updates:** "Filter updates" 28 inside its card (320 / 288) | shots/r2e-AUDIT-E-_app_my-time-1440.png, r2e-AUDIT-E-_app_profile-1440.png | Component paddings (`employee-view-surface` 24 and 28, timecards module period panel) aren't mapped to the kit on desktop. | In the desktop block, use `padding: var(--nv-s-5)` on those surfaces. Give the Timecards period panel the kit card (`border: 0; border-radius: var(--nv-r-card); box-shadow: var(--nv-e1)`). Inset Updates' inbox head 20. | P2 |
| AL4-24 | Profile · E · 1024, 1440 | The two panels' tops | Work details is a card starting at y 225 with its title inside. The right column starts with an "App settings" heading on the canvas, and its first card starts at **263**: the two panels' tops are 38px apart. | shots/r2e-AUDIT-E-_app_profile-1440.png | The right column keeps the phone pattern (section label above a list card). | Judgment. Put "App settings" inside the settings card as its head, the same as Work details, so both cards start at 225. Or move "Work details" out to a label of the same kind. | P2 |
| AL4-25 | Tabbed sections · E · 1024, 1440 (768 similar) | Band height and title position between sibling tabs | Switching tabs in the same tab row moves the title and the band's bottom edge:<br>• **Requests:** Overview 164 (title baseline 192), Time off 168 (194), Shift requests **188 (214)**, Availability 168 (194)<br>• **Pay:** Statements 172 (200), Hours 184 (212), Timecards 184 (212)<br>The title jumps up to 20px, and the card edge up to 24px. | (JSON `r2/j-tabs.json`) | Some sibling pages have an eyebrow (Shift requests "Schedule flexibility", Hours "Payday …") and others don't (the same pattern as Phase 2's AL-40). | Give every sibling the same rows: an eyebrow on each (date or section line), or none on any. Then the title stays at one y and the bands at one height within a tab row. | P2 |
| AL4-19 | Inbox detail pane · M and O · 1024, 1440 | Pane head for a shift item (no meta line since TCD-08) | The title's cap centre is 282.45 and the 48px avatar's centre 293, so the name sits **10.5px above** the avatar's middle. Items that keep a meta line ("Coverage gap…" with "Mon, Oct 19") are balanced (block 271–318 against 269–317). | r2/c-inbox-top-1440.png | `premium-desktop.css:97` `align-items: flex-start` with `:99` `padding-top: 2px`. | `align-items: center` at `:97` and `padding-top: 0` at `:99`. It centres the one-line and the two-line heads alike. | P2 |
| AL4-20 | Timecards · M and O · 1440 (and 768, 1024) | "Details" under one-line names | "Details" is now in flow but sits after the 68px row block plus its 26px bottom padding. For a one-line name it starts **40px** below the name (name 1260–1282, Details 1322); for a 3-line name, 4px. Rows grew from 77 to 129px. Details reads as detached from the person it belongs to. | r2/c-tc-rows-1440.png | `timecards.module.css:191` `.rowMain{min-height:68px; padding:12px 16px 26px}` was meant for the old absolutely placed link. | At `premium-desktop.css:313`, also set `[class$="__rowMain"] { min-height: 0; padding-bottom: var(--nv-s-1); }`. Details then sits about 4px under every name, and rows return to about 84px. | P2 |
| AL4-21 | Schedule · M and O · 1440 | Location chip strip fade | The right-edge fade is applied while the strip doesn't scroll (scrollWidth 760 = clientWidth 760). The last 24px, the end of "Not started" (track ends 1051.7), are dimmed. | shots/r2s-AUDIT-M-_app_schedule-1440.png | The `mask-image` on `.segmented` (`portal-premium.css:370`) is unconditional. | Apply the fade only when it overflows (a `data-overflow` attribute, as WR-52 does for the band filters), or remove the mask at 1440 when everything fits. | P2 |
| AL4-26 | Inbox · M and O · 768, 1024 | "Request pages" row (Time off, Shift requests, Availability) | It's three across at 1440 (60px), but at 768 and 1024 it wraps **2 + 1**: "Availability" sits alone on a second line under "Time off" (card 112px). | r2/c-inbox-top-1024.png | A wrapping flex row with fixed-width items. | `display: grid; grid-template-columns: repeat(3, minmax(0, 1fr))` with labels allowed to wrap. Or show the three as a one-column list below 1024. | P2 |
| AL4-27 | Timecards · M and O · 390 (phone) | Period line under each name | On phones the per-row line "Oct 13, 2026 – Oct 19, 2026" (88,743, 195×19 in the pre-Phase-4 baseline) is now visually hidden (`position:absolute; width:1px; clip-path:inset(50%)`). That's a visible phone change not on ROUND-2's list. Rows are otherwise the same; they're 24px taller only from longer hour values in today's data. | (diff against `rt/phone-base.json`) | `timecards.module.css:187` hides `.rowIdentity small` at every width (the D2 desktop intent). Whatever kept it visible on phones no longer applies. | Confirm whether this is intended (the band eyebrow already shows the period). If not, scope `:187` to desktop. | P2 |

### Checked and correct in round 2

- **Manager phones (320, 390):** I diffed the geometry of Home, Inbox, Team, Schedule, Timecards and Time exports against the pre-Phase-4 baseline. The only changes are:
  - text: shorter "Clocker recovery" meta, readable dates in Inbox's Plan ahead (cards 20 and 40px shorter), 15px header Search
  - data: hour values
  - AL4-27
- **Employee phones (320, 390):** Home, My schedule, Profile and Requests overview use the kit. Cards run 16–304 and 16–374 with text at 36 and radius 20; bands have text at 16.
- **Employee and Lead desktop bands:** every band runs 276–1396 with text at 312 (244–736 and 280 at 768). Heights are 116–188, all at most 200 (My pay is 196 at 768).
  - Section tabs inside the band start at the band text edge: 312 at 1440 and 280 at 1024 and 768 on Requests, Pay, Timecards and Time exports.
  - View chips on the title row end at the band text edge (1360/956).
  - Home's "3 items need your review" link sits on the title row and ends at 1360.
- **My schedule, two columns from 1100:**
  - The week (292–1024) and the confirm column (1040–1380) have a 16px gap and equal tops (470.19/470.19).
  - The week card's day strip spans 312–1360.
  - "Published assignments only" ends at 1004 (20px in).
  - Planning ahead rows put their icons at 312.
  - Lead is the same.
- **Profile, two panels from 1024:** 260–610 and 626–976 (350 each, gap 16); 292–828 and 844–1380 at 1440.
- **Employee Home at 1440:** two columns 292–853.52 and 869.52–1380 with a 16px gap and equal tops. Quick actions run in a 2×2 grid with 12px gaps.
- **Inbox pane:** status pill, facts and actions as in round 1. The button and link are centred together (579/579). The selected row has its 3px edge and wash, and avatars are kit size.
- **Shell:**
  - Sidebar items are 36px, with icon and label centred (154/153.81).
  - Group labels are 14px at 28/24.
  - Header is 65px with actions centred at 32, and the trail starts at 276.
  - Account menu edges are as above.

### Gaps

- Lead was checked only on Home and My schedule at 1440. `AUDIT-ON`, `AUDIT-BREAK` and `AUDIT-LONG` Home weren't measured.
- `?view=open` and `?intent=swap` weren't opened.
- Requests overview, Time off, Availability and Notifications were checked for band and card edges only; I didn't look at their inner layouts closely.
- There's no pre-Phase-4 phone baseline for Employee pages, so their phones were checked against the kit, not diffed.
- Nothing was saved. Only the account menu was opened and Inbox rows selected.

Open: 0 P0, 1 P1, 11 P2

## Round 4

October 19, 2026, late afternoon · Preview on `a6f009d`, same URL and states. Coverage:
- Manager and Owner at 761, 768, 1024, 1179, 1180 and 1440, plus 200% text at 761, 1024 and 1440 on Inbox, Team overview and Schedule.
- Employee at 768, 1024 and 1440.
- Phones at 320 and 390 for both, compared with round 2's measurements.

Chromium. New images are in `…/scratchpad/inspect/alignment/r4/` and `shots/r4*`. AL4-27 is intended per the coordinator, so it's not re-checked. References are to `a6f009d`.

### Status of open findings

| ID | Status | Measurement now |
|---|---|---|
| AL4-07 | **Fixed** | Toolbar padding is 12/20. The period control starts at 312 at 1180 and 1440 (280 at 1024), the same as the card text edge. |
| AL4-12 | **Regressed** (see AL4-28) | Pay period and Export summary are padded 20 now (text at 312/280, as expected). But the selector now also matches the employee card. That card was 0 at the sides because its sections carry their own 24px, so its content is now double-inset. |
| AL4-18 | **Fixed** | The status line's cap centre is 341.91 against the buttons' 343 (1.1px) at 1440. At 768 it takes its own line below the buttons. |
| AL4-19 | **Fixed** | Shift pane head: the title's cap centre is 292.45 against the avatar's 293 at 1024 and 1440. |
| AL4-20 | **Fixed** | At 1440, Details sits 14px under a one-line name (box 1206 against name 1192) and 4px under a three-line name (1343 against 1339). One-line rows are 103px (were 129). |
| AL4-21 | **Partly fixed** | There's no fade from 1180 (`mask: none`). At 1179 (1100–1179) the strip still fits (scrollWidth 760 = clientWidth 760) but the fade is on, dimming the last 24px of "Not started". Fix: switch the fade on by overflow (`data-overflow`), not by width. P2. |
| AL4-22 | **Partly fixed** | Insets are 20 and the two panels end together at 1440 (293–601 / 293–601). But "Current status" and "Today" are still **square with no shadow** (radius 0, `box-shadow: none`) at 768, 1024 and 1440. "Recent entries" and "Corrections" below them are radius 16 with e1 (`r4/c-mt-1440.png`). The flattening rule `portal-premium.css:1084` still wins. Fix: in the `premium-desktop.css` desktop block, set `border-radius: var(--nv-r-card); box-shadow: var(--nv-e1)` on `.premium-employee-time .employee-time-overview > .employee-view-surface` at higher specificity than `:1084`. P1. |
| AL4-23 | **Partly fixed** | Now at kit insets:<br>• My time cards are padded 20.<br>• The Timecards period panel is a kit card (radius 16, e1, padding 20; text at 312/280).<br>• Profile Work details is padded 20 at the sides (icon tile at 312).<br>• Updates' controls start at 312 (the "Filter updates" heading I measured in round 2 is visually hidden; I withdraw that part).<br>Still at 24: the Employee "Your timecard" article (`employee-corporate-timecard`, 292–1380), with content at 316/284. Fix: `padding: var(--nv-s-5)` on it in the desktop block. P2. |
| AL4-24 | **Fixed** | Profile at 1440: Work details and the settings card both start at 263. |
| AL4-25 | **Partly fixed** | At 1024 and wider, the Requests tabs nearly share one line: Time off, Shift requests and Availability 188/214, Overview 184/212 (2px).<br>Pay still steps: My pay is **192/220** against My time and Timecards 184/212, so the title drops 8px when you go from My pay to My time.<br>Tab labels don't slide (≤0.5px between pages).<br>At 768, titles agree within 2px; band heights differ only where a chip row is added (by design). P2. |
| AL4-26 | **Partly fixed** (see AL4-29) | Three across at every width: 768 (260–720, 68px tall) and 1440 (one line each). At 1024 the three cells are 128px wide and the labels break inside words. |

### New findings, round 4

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| AL4-28 | Time exports · M and O · 1024, 1440 | "Choose finalized employees" card | The card's content is **24px right of every other card's**:<br>• Heading icon at 336 against Pay period's 312, and title at 388 against 364 (1440).<br>• The grey selection bar, column header ("Employee" 366) and rows sit inside a 20px card padding plus their own 24px (`sectionHeading`, `selectionBar` and `employeeFootnote` padded `0 24px`, `6px 24px` and `15px 24px`).<br>• At 1024: heading 304/356 against 280/332. | r4/c-ex-1440.png | `premium-desktop.css:321` now matches `[class*="__card "]`, which includes `__employeeCard`. That card was designed with 0 side padding and inner sections at 24. | Add `:not([class*="__employeeCard"])` to `:321`. Set the employee card's inner sections to `padding-inline: var(--nv-s-5)` (heading, selection bar, footnote, table header and rows), so its text starts at 312/280 like the cards above and beside it. | P1 |
| AL4-29 | Inbox · M and O · 1024 (and 200% text at every desktop width) | "Request pages" row labels | At 1024 each cell is 128px (260–645 / 3), and the labels **break inside words**: "Time / off", "Shift / reque / sts", "Availa / bility" (card 90px tall). At 200% text it reads "Ti / me / off", "Shi / ft / re…", "Av / aila / bi…". | shots/r4i-AUDIT-M-_app_inbox-1024.png, shots/r4z-AUDIT-M-_app_inbox-1024.png | Three fixed columns in a 385px list column. The labels inherit the kit's `overflow-wrap: anywhere` (row title). | Below about 1180px, and whenever the band is in its large-text state, stack the three as a one-column list (kit rows), or drop the tiles and centre icon above label. Give the labels `overflow-wrap: normal; word-break: keep-all`, so a word never splits. | P1 |
| AL4-30 | Inbox · M and O · 200% text (all widths, coordinator's shared rule) | Band summary against the filter row | At 200%:<br>• The summary reserves **192px** (`min-height`) for two 48px lines.<br>• The filters start 96px below the summary text (summary text ends about 337, filters at 445; the band is 452px at 1024).<br>• A large empty teal area sits between the summary and the filters. | shots/r4z-AUDIT-M-_app_inbox-1024.png | `portal-premium.css:502` `min-height: calc(3rem * var(--nv-text-scale, 1))`. `rem` already scales with text size, and `--nv-text-scale` scales it again. | Use `min-height: 2lh` (or `3rem` without the multiplier). The two reserved lines then follow the text size once. This is a coordinator file: send the change. | P2 |

### Checked and correct in round 4

- **Time exports:** values end under their headers (787.33/787.33, 873.33/873.33). The totals are inset 16. The Pay period and Export summary cards are padded 20, and the gaps are 16.
- **Schedule:** the location chips scroll in one row at 1024 (760 > 716) and fit from 1100.
- **Inbox:**
  - The pane head is centred.
  - Request pages sit first in the list column and run three across at 768 and 1440 (icons at 286/439/593 at 768).
  - The pane sticks 16px below the header (unchanged from round 2).
- **Large text, band title column:** the title never wraps inside a word ("Team overview" stays on one line at 761 and 200%). At 761 and 1024 at 200%, Inbox's filters take their own row starting at the band text edge (280). Home's view chips scroll sideways on the title row at 1440.
- **Section tabs inside the band:** they start at the band text edge (312/280). Labels move ≤0.5px between sibling pages ("My time" 385.25 against 385.72; "Shift requests" 479.11–480.06).
- **Phones:**
  - **Manager at 320 and 390** (Home, Inbox, Team, Schedule, Timecards, Time exports) is unchanged from round 2 except:
    - Inbox's DOM order (an added screen-reader span; positions identical)
    - the Time exports card class (the `undefined` class is gone)
    - a 2px move of the "Needs attention" heading inside Timecards' closed Details (icon now 20px rather than 18; not visible until opened)
  - **Employee at 320 and 390** (Home, My schedule, Profile, Requests overview): card edges, radii and padding are identical to round 2.

### Gaps

- Not re-run this round: Lead pages, `AUDIT-ON`, `AUDIT-BREAK` and `AUDIT-LONG`. The sidebar collapsed at 1440, 1023, and 125/150% text weren't covered. WebKit wasn't run this round.
- `/api/manager/inbox-count` returns 404 on this branch (known; Codex's route).
- **For the widths-roles inspector, not my area:** as `AUDIT-E`, `/app/updates` shows the "Message today's team" button (292–1380). Confirm employees should see it.

Open: 0 P0, 3 P1, 4 P2
