# Phase 4 desktop inspection, round 1: bars and stability (ST-P4-)

Inspector: stability. October 19, 2026, 12:00–13:30. I used the preview in `access.json`, signed in as Manager `AUDIT-M` and Owner `QAOWNER` with the saved storage states, on fictional data. I worked read only: I pressed nothing that saves. Refresh and "Try again" are re-reads, and I simulated failed reads in my own browser (500 on `/api/manager/*`). I mostly used Chromium, with WebKit spot checks (Inbox at 1440 with reduced motion). The viewports were 768×1024, 1024×768 and 1440×900, plus 390×844 and 320×568 for phone regressions.

The dev server was heavily loaded by parallel runs (the login page took 8–17s), so some cells timed out or returned "This page could not be loaded". As the rules say, I retried those once and didn't file them. `inspection/checks-round-1.txt` didn't exist when I finished, so nothing here repeats or relies on it.

Scripts and raw data: `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p4-desktop-240fe0/55a133fe-0aa8-4472-a3aa-f939856da789/scratchpad/inspect/stability/` (`SI/` below). Screenshots are in `SI/shots/`.

## Verdict

**The bands pass. Three P1s remain, all on the desktop chrome around the content.**
- **Bands:** every band is 200px or less at 768, 1024 and 1440 for both roles. The tallest are Inbox (196) and the Home views at 768 (196).
- **Inbox:** row selection moves nothing in the list. Focus goes to the pane and Escape brings it back to the row.
- **Home:** Home holds its columns when paused or offline at 1024 and 1440.
- **Phones:** every band height at 390 and 320 matches the Phase 2 values.

The P1s:
1. The sticky Inbox pane slides under the 65px sticky header: its heading, which takes focus on selection, is hidden. At 1024×768 the side column is also taller than the screen.
2. Desktop route placeholders have no band, so the teal band pops in on every sidebar navigation (the phone ST-05 defect, now on desktop).
3. The Inbox collapses its two columns to one status card on every window switch, offline spell, Refresh or failed read, and scroll goes back to the top. Home holds its layout in the same cases.

There are 5 P2s.

## Findings, worst first

| ID | Screen, role, width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| ST-P4-01 | Inbox, both roles, 1024 and 1440 (Chromium and WebKit) | `.inbox-side-column` (detail pane and All requests), `.app-main > .mobile-header` | **The pane slides under the header.** The header is `position: sticky; top: 0`, 65px tall, `z-index: 30`, with a 78% white fill. The side column sticks at `top: 16px`. From scrollY 300 onward, the pane's top is at y=16 and the header covers y=0–65, so the top 49px of the pane is under the header. `elementFromPoint` at the pane's top centre returns `button.command-finder-trigger` (1440) or the account `button` (1024). The pane heading (avatar, name) is hidden; only the meta line shows. That heading is where focus goes when you select a row while scrolled (`#inbox-detail-title`, `focus({preventScroll:true})`), so the focused element is hidden (WCAG 2.4.11). **1024×768:** the side column is 836px tall (pane 518 + 16 + All requests 302). Stuck at 16, its bottom is at 852 on a 768px screen, so the last All requests row (Availability) is cut off for the whole scroll of a 3,934px list. It only comes into view at the very end. At 1440×900 the column (724px) fits. | `SI/shots/ST-P4-01-pane-under-header-1024.png`, `…-1440.png` | `src/app/app/premium-desktop.css:114` (`top: var(--nv-s-4)` ignores the sticky header). Header height: `portal-gusto.css:178` (min-height 64 + 1px border). | `top: calc(65px + var(--nv-s-4))` (81px). Better, add a `--nv-desktop-header: 65px` token and use `calc(var(--nv-desktop-header) + var(--nv-s-4))`. Also add `max-height: calc(100dvh - 81px - 16px); overflow-y: auto; overscroll-behavior: contain` on the sticky column so All requests stays reachable at 768px tall. Or move All requests under the list at every desktop width, as at 761–1023, and make only the pane sticky. | P1 |
| ST-P4-02 | Every sidebar navigation between Manager and Owner pages, 768–1440 (measured 1440, Manager: to Team, Schedule, Home) | `.route-skeleton` | While a route loads, the desktop placeholder is grey bars on white with **no band** (Schedule: 434px tall at y=93). After 0.7–2.6s on this server, the teal band (168px) appears and the page starts at y=93+168. The whole content area changes from a white skeleton to a teal band plus cards. CLS reads 0 because the placeholder is swapped out, not moved, but the jump is plain to see. Phones got a band-height placeholder for this in Phase 2 (ST-05); desktop never did. | `SI/shots/ST-P4-nav-placeholder-1440.png` against `ST-P4-nav-final-1440.png` | `src/app/app/portal-premium.css:437-438`: `.route-skeleton-band { display: none; }` is only shown inside `@media (max-width: 760px), (landscape phone)`. The `loading.tsx` files pass phone (390) heights only (e.g. `timecards/loading.tsx` `band={172}`). | In `premium-desktop.css`, under the desktop query, show `.route-skeleton[data-band] .route-skeleton-band` with the desktop band geometry: radius 20, `padding: 16px 36px`, `margin` like the real band, and height per route at ≥1024: Home 168, Inbox 196, Schedule and Team 168, Home views 184, Timecards 136, Time exports and Payroll 116. At 761–1023: Home, Schedule and Team 160, Inbox 188, views 196. Put section tabs above it on Timecards, Payroll and Time exports. Overlap the first skeleton card by `--nv-overlap` (40 or 32px). | P1 |
| ST-P4-03 | Inbox, both roles, 1024 and 1440 (measured Manager 1440) | `.inbox-columns`, `.inbox-list-column`, `.inbox-side-column` | Ready, the list column is 590×3544 and the side column 482×748 (pane, then All requests). **Window blur** (paused) and **offline** each collapse the page to one full-width status card: list 1088×72, side column 0 tall, pane and All requests gone. **Focus**, **online** and **Refresh** go to a skeleton (list 258, pane placeholder 200, no All requests). The result is 2 columns → 1 → 2 placeholders → 2 again, on every window switch. **A failed read** shows one 1088×124 card. **Scroll is lost:** scrolled to 800, a blur makes the page shorter than the window, so scrollY becomes 0. When the data comes back you're at the top. Refresh alone collapses 3544 → 258 → 3544px in 1.7s. Clearing private data on blur is decided (IS-17, ROUND-2.md); the layout collapse and lost scroll are not. Home keeps its column and card heights in exactly these states (WR-64 / ST-28; re-measured below). | `SI/shots/ST-P4-inbox-paused-1440.png` | `src/components/manager-inbox.tsx:225`: `data-detail` is only set for ready or loading, so paused, offline and unavailable drop the grid. `:227-232`: the status card replaces the list. `:268-271`: the pane and All requests unmount. | Keep the two-column grid in every not-ready state (`data-detail` when `connection !== "access_lost"`). Show `DetailPlaceholder` and All requests in every state. Hold the list column at its last ready height (`min-height` from a ResizeObserver, as `premium-home.tsx:103-141` does) and put the status line inside it, so the page height, scroll and selection survive a pause, Refresh or offline spell. | P1 |
| ST-P4-04 | Team, Manager (same code for Owner), 1440 (≥1024 grid) | `.premium-team-form > p.premium-note` ("Updating employees…"), `.premium-team-actions` | Every filter change moves the people list twice. **Typing "a":** the Find card grows 200 → 232 while pending (the status line is a new grid row, +20 +12 gap), then 256 when "Clear filters" appears. The list goes 437 → 469 → 493. **Choosing a role:** the list goes 493 → 525 and back to 493 about 2s later. Chrome counts the return as a layout shift (0.0087, `hadRecentInput: false`). **A status segment:** 465 → 497 → 465 (0.0063 without input). **Clear filters:** the card shrinks 256 → 200 and the list moves up 56. | `SI/shots/ST-P4-team-filtered-1440.png` | `src/components/employee-directory-filters.tsx:59` renders the pending `<p>` inside the form. `src/app/app/premium-desktop.css:141-142` puts `.premium-team-actions` on its own full-width row, shown only when filtered. | Show the pending text in the card head instead: replace the `.nv-card__meta` count with "Updating…", since it's already `aria-live`. Or give the `<p>` `position: absolute` with the `sr-only` pattern. Put "Clear filters" on the status row at ≥1024 (`.premium-team-status` in column 1, `.premium-team-actions` in column 2, `justify-self: end`), so the card height doesn't depend on the filter. | P2 |
| ST-P4-05 | Home, both roles, 1024 and 1440 | `.premium-home__now` placeholder, then `.premium-home__setup` (Owner) and `.premium-home__week` (1024) | The loading Next up + Also needs you column is 749px; the real one is 640 (−109). At 1440 the Owner's "Finish setting up" moves up 1192 → 1083. At 1024 (one column) it does the same, and This week moves 1463 → 1354. This happens 1–8s after paint here. All of it is below the fold at these viewport heights, so CLS is about 0.0001. Anyone who scrolls straight away sees a 109px jump. | – (frames in `SI/home-O-1440.json`, `home-O-1024.json`, `home-M-1440.json`) | `src/app/app/portal-premium.css:806` sets the placeholder rows to `min-height: 150px` at every width. That was sized for 390 (ST-17); desktop rows are shorter. | Under the desktop query in `premium-desktop.css`: `.premium-home .premium-skeleton--rows .premium-skeleton__row { min-height: 114px; }` (150 − 109/3). Then re-measure against the real rows at 1024 and 1440. | P2 |
| ST-P4-06 | Inbox, both roles, 1024 and 1440 (judgment call) | `.premium-inbox .nv-masthead__summary` | The Inbox band is 196px, while Home, Team and Schedule are 168 at the same widths. The summary box is 48px tall but holds one line of text ("4 shifts with no clock-in, 21 coverage gaps and 1 request need you."), so there's 40px of teal between the summary and the cards instead of the 16px on every other page. It's under the 200px cap, but it's the band closest to it and visibly emptier. | `SI/shots/ST-P4-inbox-band-1440.png` | `src/app/app/portal-premium.css:498` (`min-height: 3rem`, the ST-02 phone reservation) also applies at desktop. | At ≥1024: `.premium-inbox .nv-masthead__summary { min-height: 1.5rem; }`. The loading text "Checking what needs you…" is also one line, so the band holds. Keep 3rem at 761–1023, where the summary really wraps (444px wide). If the "Clock-ins can't be checked" suffix can push it to 2 lines at 1024, clamp it to 1 line there. | P2 |
| ST-P4-07 | Inbox, both roles, 1024 and 1440 (judgment call) | `#inbox-all-requests` under the pane | The pane height depends on the kind of item selected. At 1440, a shift is 446, a request 286 and a Plan ahead item 222. At 1024 they are 518, 306 and 262. So when the selection moves between kinds, by clicking or by a filter, the All requests card jumps 160–256px. Filter changes counted 0.07–0.55 layout-shift score in the click window. Rows of the same kind are steady (0px). | `SI/shots/inbox-select*-…png`, `inbox-filter-*-…png` | `src/app/app/premium-desktop.css:91-107`: the pane has no `min-height` except the placeholder's 200px (`:107`). | Give `.inbox-side-column > .inbox-detail` a `min-height` equal to the tallest kind (the shift pane: 446px at 1440, 518px at 1024). Or put All requests above the pane, so nothing sits under a changing height. | P2 |
| ST-P4-08 | Every page, both roles, 1024 and 1440 (also on first load at 768) | `.mobile-header-actions`, `.portal-location li`, Inbox `.nv-masthead__extra` | When Inter arrives, the header actions move 5px left (x 1037 → 1032; Search grows 136 → 138.5px wide), trail items get 3px wider, and the Inbox filters move 3px. The shift happens in the same frame as `document.fonts.status` going `loading` → `loaded` (7.5s on this loaded server). This is the coordinator's "header actions moving 4px on hydration" item: the cause is a font swap, not hydration. | – (frames in `SI/hdr-M-1440.json`) | `src/app/typeface-theme.css:14-20`: Inter is a TTF with `font-display: swap`, not preloaded, and with no metric-matched fallback. That's a shared file, so the coordinator owns the fix. | Preload the font in the root layout (`<link rel="preload" href="/fonts/typeface/inter/variable.ttf" as="font" type="font/ttf" crossOrigin="">`). Add a size-adjusted fallback (`@font-face { font-family: "Inter Fallback"; src: local("Arial"); size-adjust: 107%; ascent-override: 90%; descent-override: 22%; }`) listed after Inter. Or switch to `next/font/local`, which does both. | P2 |

## Checked and correct

- **Band height, 100% text (cap 200):**
  - **1440 and 1024, both roles:** Home 168, Inbox 196, Attendance, Team overview and Schedule activity 184, Schedule 168, Team 168, Timecards 136 (tabs 45 above), Payroll (Owner) 116, Time exports 116.
  - **768:** Home 160, Inbox 188, Home views 196 (the description is hidden as designed), Schedule and Team 160, Timecards 136, Time exports 140.
  - Every band begins at y=93 (header 65 + 28 frame padding) or y=158 under section tabs. The eyebrow-row control overhangs a 20px eyebrow line (control 44px at y=97 against the eyebrow at 109). The filters and view chips sit on the title row at ≥1024.
- **Phones unchanged:**
  - **390:** Home 220, Inbox 308, Schedule 244, Team 220, Timecards 148, Time exports 128, Payroll 152.
  - **320:** Home 256, Inbox 332, Team 244, Timecards 148, Time exports 152, Payroll 152.
  - The header is 68px and the band top is at 68 (112 under tabs). This all matches Phase 2's final values.
- **Inbox loading → ready (1024, 1440):** the band is the same height from the first frame (196). The list starts at y=249 in both states. The pane placeholder holds the right column at the same x and width (482 at 1440, 315 at 1024), so the list never changes width. All requests appears with the list, below the pane, so nothing moves. Load CLS was 0.0001–0.0002, and all of it was the ST-P4-08 font swap.
- **Row selection (1024, 1440, Manager):**
  - No row moves and scroll is kept.
  - Rows of the same kind keep the same pane height (446 and 518).
  - The URL gains `?item=`, `aria-current="true"` is on exactly one row, and focus moves to `#inbox-detail-title`.
  - Escape puts focus back on the selected row.
- **Sticky pane doesn't detach:** at maximum scroll the side column's bottom matches the list's bottom (1440: 740 against 823, then flush; 1024: 656 = 656). There's no gap and it doesn't overlap the list. Same in WebKit.
- **Home paused (window blur) and offline, 1024 and 1440, both roles:** no grid child changes position or size in any frame through pause → focus and offline → online. Today, Now, Setup and Week are identical. The only shifts are inside the held Next up card (skeleton button 52 → 46px, 0.0001–0.004).
- **Header:** 65px and sticky at the same rect on every page, and it never changed colour or height in any load or navigation frame. The sidebar active item and its rect stay steady through navigation; only the trail text changes, in the same frame as the route.
- **Reduced motion (WebKit, 1440, Owner):** the Inbox loads, filters and scroll behaved exactly as in normal motion, with no transitions on selection. Nothing new in Phase 4 animates.

Not covered this round, because the server timed out or returned "could not be loaded" twice:
- the Inbox list and detail at 768 (the 768 band was measured)
- Schedule at 320
- Owner Home at 320
- Team filter changes at 1024 (the same ≥1024 CSS as the 1440 run)
- Attendance at 768 for Manager

Not repeated: the automated sweep (CLS at every width and text size, overflow, axe).

Open: 0 P0, 3 P1, 5 P2

## Round 2

October 19, 2026, 14:10–15:20, on the round-2 build (same preview and states). I worked read only: Refresh and the 30-second re-read are reads, and I simulated failed reads in my own browser (500 on `/api/manager/*`). I mostly used Chromium, with WebKit spot checks.
- **Manager and Owner:** 768, 1024 and 1440 for the re-checks, plus 320 and 390.
- **Employee and Lead (first pass):** every page in ROUND-2.md for `AUDIT-E` and `AUDIT-LEAD`, plus Home for `AUDIT-ON`, `AUDIT-BREAK` and `AUDIT-LONG`, at 768, 1024 and 1440, plus 390 and 320.

The server was responsive this round (about 0.2s per request), so every cell completed. Data and scripts: `SI/r2/`. Screenshots: `SI/shots/r2-*`.

### Status of round-1 findings

| ID | Status | Measurement now |
|---|---|---|
| ST-P4-01 Sticky pane under the header | **Fixed** | The side column holds only the pane now and sticks at `top: 81px`, 16px under the 65px header. `elementFromPoint` at the pane's top centre returns the pane at every scroll position, at 1440 (pane 81–457) and at 1024 (81–529 on a 768px screen, so the whole pane is visible). At maximum scroll the list ends below the pane (1440: list bottom 788 against pane 457; 1024: 656 against 529), so the pane never detaches or covers anything. |
| ST-P4-02 Desktop placeholders without a band (Manager and Owner) | **Fixed** (1440 measured) | Placeholder band against final band, Owner, sidebar navigation: Team 168/168, Schedule 168/168, Home 168/168, Inbox 196/196, Timecards 184/184 and Payroll 164/164 (the last two include the section-tab row). All start at y=93. One leftover is filed separately as ST-P4-10 (the tabs slide sideways). Employee and Lead placeholders are still bandless (ST-P4-09). |
| ST-P4-03 Inbox collapses on pause, offline, Refresh or failure | **Partly fixed** (still P1) | **Columns held:** in paused, offline, failed, reconnecting and loading the grid stays two columns. The list column keeps its last height (1440: 3580; 1024: 4022), the pane is a 200px placeholder in place and the Request pages row stays. A 30-second re-read and Refresh change nothing at all (no frame differed over 36s of polling). **Scroll still lost:** scrolled to 800, the page jumps to 0 the moment it pauses, goes offline or a read fails. That's 4 of 4 transitions at 1024 (Owner) and 1440 (Manager), in Chromium and WebKit, and the document height never changes (3941 / 4383). When the data returns you're at the top. Proof of cause: if I hold the same height with CSS in my own page (`.inbox-list-column { min-height: 3580px }`) before the pause, scroll stays at 800. So the hold arrives one layout too late. It's set in a `useLayoutEffect` (`src/components/manager-inbox.tsx:241-253`), which runs after the commit that empties the list and after the children's layout effects. A layout forced in between (for example the band filter row's `KeepSelectedVisible`, which reads `scrollWidth` on every render, `src/components/kit/keep-selected-visible.tsx`) sees the short page and clamps the scroll. **Fix:** apply the hold during render, so it lands in the same DOM commit: `style={{ minHeight: !ready && lastListHeight.current ? lastListHeight.current : undefined }}` on `.inbox-list-column`, with the ResizeObserver still recording the height while ready. Then re-test 800 → paused → 800. |
| ST-P4-04 Team filter row moves the list | **Fixed** | 1440, Manager. The Find card stays 200px and the people list stays at y=437 through typing, choosing a role, a status segment and Clear filters. "Updating employees…" and "Clear filters" sit on the status row (y=357–413). The only layout shift is the list's own rows changing (12 → 2 people). |
| ST-P4-05 Home loading rows taller than the real ones | **Partly fixed** (P2) | The loading column is now **shorter** than the real one. 1024 and 1440: 611 against 640, so the setup card (Owner) or This week (Manager at 1024) moves down 29px (1054 → 1083). **768: 611 against 680 (+69),** setup 1054 → 1123 and This week 1325 → 1394. At 768 the real rows wrap to a second meta line. All of it is below the fold (viewport 1024/768/900 tall), so CLS is 0. Fix: at 761–1023 make the rows `min-height: 127px` (104 + 69/3). At ≥1024 make them 114px (104 + 29/3). Re-measure both. |
| ST-P4-06 Inbox band reserves a second summary line | **Kept by decision** | I agree: it's under the cap (196) and it prevents growth when the summary wraps. |
| ST-P4-07 All requests jumps under the pane | **Fixed** | The Request pages row is at the top of the list (1440: 60px tall; 1024: 112px). Nothing sits under the pane, so its height (shift 376/448, request 286/306, planning 222/262) moves nothing. |
| ST-P4-08 Header font swap | **Waiting on the coordinator** | Not counted. I saw one more symptom of the same swap: the sidebar "Powered by" footer goes from 48 to 28px tall (y 704 → 724) during load at 1024, a layout shift of 0.0002. |

### New findings

| ID | Screen, role, width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| ST-P4-09 | Every Employee and Lead sidebar navigation, 768–1440 (measured `AUDIT-E` at 1440: My schedule, Requests, My time, My pay, Updates, Home) | `.route-skeleton`, `.page-frame > .section-tabs` | **Placeholder:** the desktop placeholder has no band (the band element is there but 0×0). It shows for 60–470ms, then the teal band appears at its final height: My schedule 120, Requests 184, My time 184, My pay 192, Updates 116, Home 172. The placeholder is also 1132px wide against the 1120px page. **Section tabs:** on the tabbed pages (Requests, My time, My pay) the tabs are already in the band position and coloured for the band (white, 600 for the current one), but there's no teal behind them. So "Statements · Hours · Timecards" is white on the light page and runs over the grey placeholder bars. This is the Manager defect fixed in ST-P4-02, still present for the Employee and Lead shell. | `SI/shots/r2-ph-E-mytime.png` | `src/app/app/premium-desktop.css:199-212`: every desktop placeholder-band rule is scoped `:not(.employee-shell)`, and the `--route-band-desktop` values (`:214-230`) cover Manager routes only. The tab colours at `:284-292` match `.route-skeleton[data-band]` in either shell. | Drop `:not(.employee-shell)` from `:199-212`. Add `--route-band-desktop` per Employee route at ≥1024: Home 172, My schedule 120, Requests 184 (hub 164 + tabs), Time off and Availability 168, Shift requests 188, My time and Timecards 184, My pay 192, Profile, Updates and Notifications 116. At 761–1023: Home 164, My schedule 172, Availability 192, My pay 196, Notifications 140. Add `data-route` in those routes' `loading.tsx`. | P1 |
| ST-P4-10 | Timecards, Payroll runs and Time exports, and the Employee tabbed pages, on navigation, 1024 and 1440 (measured Owner 1440, Manager 1024) | `.section-tabs .section-tab` | When the page replaces the placeholder, each tab narrows by 4px (76 → 72, 83 → 79, 92 → 88, 107 → 103), so the tabs slide left 0, 4, 8 and 12px, and the underline with them. The computed `padding-inline` is 2px in the placeholder and 0 on the page. | `SI/shots/r2-ph-Timecards.png` against `r2-fi-Timecards.png` | `src/app/app/portal-premium.css:215` sets `padding-inline: 0` only under `.page-frame:has([data-nv-page])`, which the placeholder doesn't match. | Add `padding-inline: 0` to the desktop tab rule at `src/app/app/premium-desktop.css:288`, which already matches both states. | P2 |
| ST-P4-11 | My schedule, `AUDIT-E` and `AUDIT-LEAD`, ≥1100 (measured 1100 and 1440, Chromium and WebKit) | `.my-schedule-side` | The side column is `position: sticky; top: 81px`, but it is stretched to the week's height, so it has nowhere to stick. Side column against its content: 617 against 248 (E, 1440), 808 against 248 (Lead, 1440) and 962 against 248 (Lead, 1100). The content is the review card (200) and What changed (48). Scrolling 600px takes the "Confirm your schedule" card off screen (top at −128, under the header) while the week continues below. It never holds at 81. | `SI/shots/r2-mysched-AUDIT-E-1440-chromium.png` | `src/app/app/premium-desktop.css:365` (`align-self: stretch` on `.my-schedule-agenda, .my-schedule-side`) overrides the grid's `align-items: start` (`:370`). | In the ≥1100 block, add `align-self: start` to the side-column rule at `:374`. Then check the review card holds at y=81 while the week scrolls and releases at the end of the week. | P2 |

### Employee and Lead desktop, first pass: checked and correct

- **Band height, 100% text (cap 200), `AUDIT-E` and `AUDIT-LEAD`:**

  | Page | 1440 and 1024 | 768 |
  |---|---|---|
  | Home | 172 | 164 |
  | My schedule (all three views) | 120 | 172 |
  | Requests overview | 164 | 164 |
  | Time off | 168 | 168 |
  | Shift requests | 188 | 188 (eyebrow and description hidden as designed) |
  | Availability | 168 | 192 |
  | My time, Timecards | 184 | 184 |
  | My pay | 172 | 196 |
  | Profile, Updates | 116 | 116 |
  | Notifications | 116 | 140 |

  `AUDIT-ON`, `AUDIT-BREAK` and `AUDIT-LONG` Home bands are the same, 172 (164 at 768). The tallest is My pay at 768 (196). The section tabs sit inside the band (48px) on the Requests and Pay pages.
- **Loading → ready:** CLS 0–0.0017 on all 78 Employee and Lead page loads (13 pages, 2 accounts, 3 widths).
  - Only Home has a source: the review link appears on the title row (`x 952 → 786`, `w 4 → 170`) without moving anything else.
  - One Lead Time off load at 1024 measured 0.011 (the band grew 20px at 4.7s). Three repeats measured 0–0.0002, so I didn't file it.
- **WebKit, reduced motion, Lead (1440, 1024):** Home, My schedule, Time off, My time and Profile load and lay out the same as in Chromium. WebKit has no layout-shift API, so its numbers are geometry only.
- **Phones:** unchanged.
  - **Manager 390:** Home 220, Inbox 308, Schedule 244, Team 220, Timecards 148.
  - **Manager 320:** Home 256, Inbox 332, Schedule 244, Team 244, Timecards 148.
  - **Employee 390:** Home 272, My schedule 168, Updates and Notifications 128, Profile 104. These match Phase 3's recorded values.
  - **Employee 320:** the same, except Profile is 128.
  - Header 68 and band top 68 (112 under tabs) at both widths.

### Other changes re-checked

- **Inbox selection (1024, 1440):** no row moves, scroll is kept, focus goes to `#inbox-detail-title`, Escape goes back to the row, and `aria-current` is on one row.
- **Inbox filter changes:** the band holds at 196. Shifts happen only inside the click window.
- **Home paused and offline at 768, 1024 and 1440:** no grid child moves, and scroll is kept (400 → 400 → 400 for Owner at 1024 and Manager at 1440).
- **Section tabs inside the band** (Timecards, Payroll, Time exports; Employee Requests and Pay): the tab row is in the same place in placeholder and page (y=93, 48px). Only the sideways slide in ST-P4-10 remains.
- **Header:** 65px with a solid fill (`rgba(255,255,255,.97)`). Its height and colour never change in any load or navigation frame.

Not covered this round:
- placeholder bands at 1024 and 768 (1440 only)
- Team filter changes at 1024
- My time and Profile while paused or offline for Employees (those components are the coordinator's, and phone P3-ST-14 tracks My time)

Open: 0 P0, 2 P1, 3 P2

## Round 4

October 19, 2026, on `a6f009d` (same preview and states). I worked read only; failed reads were simulated in my own browser. I used Chromium, with WebKit spot checks.

Coverage:
- **Manager and Owner:** 761, 768, 1024, 1100 and 1440, at 100, 125, 150 and 200% text.
- **Employee and Lead:** 768, 1024 and 1440.
- **Phones:** 320 and 390.

The server was fast at the start and slow again later (a page load timed out after 120s once). Two 30-second re-reads during the slow spell came back "unavailable" from the server. I didn't file those, but the layout held through them.

Data: `SI/r4/`. Screenshots: `SI/shots/r4-*`.

### Status of open findings

| ID | Status | Measurement now |
|---|---|---|
| ST-P4-03 Inbox loses scroll position | **Fixed** | Scrolled to 800, every transition kept 800: paused and back, offline and online, and a failed read. That held in Chromium at 1024 (Owner; list held at 4000) and 1440 (Manager; list held at 3580), and in WebKit at 1440. The document height was the same in every state (4361 / 3941). The re-read and the server failures kept the two columns, the 200px pane placeholder and the Request pages row in place. |
| ST-P4-05 Home loading rows | **Fixed** | Today, Now, Setup and Week keep identical rectangles from the first painted frame to ready. That's 768 (Owner and Manager; Now 680, Setup at 1123), 1024 (Manager; Now 640, Week at 1083) and 1440 (Owner; Now 640, Setup at 1083). Paused and offline: 0 frames changed at any of the three widths. |
| ST-P4-09 Employee and Lead placeholders without a band | **Fixed** | Placeholder band against final band, sidebar navigation (all match, all at y=93):<br>• **`AUDIT-E` at 1440:** My schedule 120/120, Requests 184/184, My time 184/184, My pay 192/192, Updates 116/116, Notifications 116/116, Home 172/172.<br>• **`AUDIT-E` at 1024:** the same.<br>• **`AUDIT-E` at 768:** My schedule 172/172, Requests 164/164, My time 184/184, My pay 196/196, Updates 116/116, Notifications 140/140.<br>• **`AUDIT-LEAD` at 1024:** the same, Home 172/172.<br>The 48px tab row is in the band from the first frame, and the placeholder is the page's width (1120 at 1440). |
| ST-P4-10 Section tabs slide | **Fixed** | Tab positions and widths are identical in placeholder and page: Manager Timecards at 1440 (72/79/88/103 wide at x 312/408/511/622) and 1024; Employee My pay at 1440; Employee Requests at 768. `padding-inline` is 0 in both states. |
| ST-P4-11 My schedule side column doesn't stick | **Fixed** | The side column is now its content's height (262) and holds at y=81 from scrollY 400 to the end of the page. The review card stays the element at its top centre at every scroll position. Measured `AUDIT-E` and `AUDIT-LEAD` at 1440, Lead at 1100, and Lead at 1440 in WebKit. At maximum scroll it still ends above the week's bottom (1100: 343 against 357). |
| ST-P4-06 | Kept by decision | – |
| ST-P4-08 | Coordinator (Inter fallback metrics cherry-picked) | Not counted. |

### New finding

| ID | Screen, role, width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| ST-P4-12 | Home's views (Attendance, Team overview, Schedule activity), both roles, 761–1023 at 125% text and above (measured Owner 768, Manager 761) | `.premium-home-view .nv-masthead__extra` (view chips) | At 761–1023 the chips get their own row, but that row neither scrolls nor wraps, so at larger text it runs past the band and the band cuts it off. **768, Owner:** the chips end at x=744 at 125% against the band's edge at 736. At 200% they end at x=937, so "Schedule activity" (691–937) is cut to "Sc" and can't be clicked. **761, Manager:** 768 at 125% and 972 at 200%, against the band at 729. At 100% they fit (700 against 736). Because the chip row isn't a scroll container, a mouse user has no way to reach the last view. | `SI/shots/r4-ST-P4-12-chips-768-200.png`, `…-768-125.png` | `src/app/app/premium-desktop.css:59-60` gives the views' chips `min-width: 0; max-width: 100%` and `overflow-x: auto; flex-wrap: nowrap` only from 1024px up. At 761–1023 (`:54`) the chips only get `margin-top`. In the band grid (`:19`, `minmax(min-content, max-content)`) the chips' row is then as wide as the chips themselves, wider than the band. | Apply `:59-60`'s sizing at every desktop width. In the 761–1023 block, add `.premium-home-view > .nv-pageband > .nv-masthead__extra { min-width: 0; max-width: 100%; }` and `… .nv-masthead__extra > * { overflow-x: auto; flex-wrap: nowrap; }`, as Employee My schedule already does (its chips stay inside the band at 768 up to 200%). | P1 |

### Checked and correct

- **Large text (761, 768, 1024, 1440; 100–200%; Owner and Employee):**
  - Bands grow with the text and nothing overlaps: the title never overlaps the controls, and the eyebrow-row control never overlaps the eyebrow.
  - Inbox filters move to their own row at 125% and above at 761 and 768, and at 200% at 1024. They stay on the title row at 1440, and they scroll sideways where they must.
  - Employee Home, Time off and Shift requests move their controls to their own row at 761 and 768 at 125% and above, and at 200% at 1024.
  - Nothing scrolls the page sideways.
  - Owner Home's greeting wraps between words (3 lines at 200% at 768); that's expected.
  - The only spill outside a band is ST-P4-12.
- **Band heights at 100% text (cap 200):**
  - **761:** Home 156, Inbox 188, views 192, Schedule and Team 156, Timecards 180, Time exports 184.
  - **768:** Home 160, Inbox 188, views 196, Schedule and Team 160, Timecards 184, Time exports 188.
  - **Employee at 761:** Home 164, My schedule 168, Shift requests 184, Time off 168, My pay 192.
- **Phones unchanged:**
  - **Manager 390:** Home 220, Inbox 308, Schedule 244, Team 220, Timecards 148, Attendance 308.
  - **Manager 320:** Home 256, Inbox 332, Schedule 244, Team 244, Timecards 148, Attendance 308.
  - **Employee 390:** Home 272, My schedule 168, Time off 168 (under tabs), My time 172, Profile 104, Updates 128.
  - **Employee 320:** the same, except Profile is 128.
  - All match round 2.

Not covered this round:
- placeholder bands at 761 and 1180
- Lead pages at 768
- Team filters at 1024 (same CSS as 1440, which passed in round 2)

Open: 0 P0, 1 P1, 0 P2
