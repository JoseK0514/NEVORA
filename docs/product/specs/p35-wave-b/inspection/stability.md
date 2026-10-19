# Wave B inspection, round 1: bars and stability (ST-B)

Inspector: bars and stability. October 19, 2026. Preview `access.json` url (port 51624), fictional data, read only. Every non-GET request was aborted by a Playwright route, with two exceptions that never reached the server as a change: `POST /api/reports` was let through because it is Insights' only read (`readReports`, no write; `src/app/api/reports/route.ts:7-19`), and Compose's `POST …/communications/preview` was answered locally with a fixture (`{state:'ready',count:3}`), so it never left the browser. Nothing was saved, published or sent.

Build note: the preview's synced copy dates from 09:21. While I inspected, the worktree moved on to `3eb73ef` and `b0e051a` (round 1 fixes from other inspectors). Everything below was measured on the preview. Where HEAD already changes the cause, the finding says so. Those fixes aren't verified in a browser yet.

## Verdict

The fixed chrome is solid. The phone header and the band are one teal block with no seam at every phone width, in landscape and for every role. The tab bar is pixel-identical on all seven pages and doesn't move on scroll. Payroll settings' section tabs never move. Disclosures open without moving their summary. Compose's audience preview causes no shift. Reduced motion stops all three entrance animations. Print layout is clean. Firefox and WebKit match Chromium.

Three things are not fine:

1. **Insights empties itself every 10–15 seconds.** When the report's snapshot expires, the page collapses to one "Loading insights" card. The reader is thrown back to the top, and the report then returns at the top of the page. Nobody can read past the first screen on a phone.
2. **The sticky "Save staffing & hours" bar hides the field you're editing.** Up to 13 of 31 Tab stops end up fully behind it, on phone and on desktop.
3. **Loading placeholders only match at 390 portrait.** On a direct load or reload, the placeholder comes from the wrong page: 106px instead of 288 or 312 on Update detail and Compose. In landscape the page's own placeholder is 44–84px too tall, at 320 and 430 it is 24px off, and at 200% text it is 180–430px off.

A slow web-font swap adds a measurable late shift on first load: CLS 0.092 on Scheduling rules at 320.

Totals: **1 P0, 3 P1, 7 P2.**

## Findings, worst first

Screenshots: `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p35-wave-b-808dfd/55ac0f42-ec52-4b85-a911-9b8ee813b392/scratchpad/inspect/stability/shots/`, shortened to `shots/`. Raw measurements are in `…/inspect/stability/out/*.jsonl`.

| ID | Page, role, width | Element | What's wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| ST-B01 | Insights, Owner and Manager, every width (measured 390 and 1440) | `.wb-insights-view` → `.wb-report-state` | The snapshot expires after `validForMs` (14,591ms measured). The whole report is then replaced by one "Loading insights" card until the next read returns. **390, Owner:** reading Clock-in notes at scrollY 5307. 9.2s later the page shrinks from 7716 to 1138px and scroll jumps to 294. The report comes back 9.8s later, but at scrollY 294, so the reading place is lost. **1440:** gone at 9.9s, back at 16.3s, gone again at 23.7s. Each time the page shrinks from 4307 to 900px and scroll resets from 1400 to 0. Download CSV and Print / Save PDF are disabled during every gap. In print emulation the report was also gone after 16s (`report:false`). CLS stays 0 because nodes are replaced, not moved, but the viewport jump is total. | `shots/insights-refresh-before-QAOWNER-390.png`, `…-collapsed-…`, `…-after-…` | `src/components/reports.tsx:96`: `timer=setTimeout(()=>{clear('loading');void load();},remaining)`. `clear()` at `:84` calls `setReport(null)`, and `ReportsView` returns a single status card when `!report` (`:56`). The timer isn't paused while `printing`. | Start the next read before expiry, at `remaining − max(3000ms, last round trip)`. Swap the new snapshot in atomically and never `setReport(null)` on a scheduled refresh. If expiry still passes before the new read arrives, keep every card in place at its height with values masked ("Refreshing…") and keep `scrollY`. Skip the timer while `printing` (re-check on `afterprint`). The blur/focus clear is the agreed privacy rule (IS-17 pattern) and isn't refiled, but returning focus should also restore scroll. It currently lands at 294 instead of 1400. | **P0** |
| ST-B02 | Scheduling rules, Owner and Manager: 320, 390, landscape, 768, 1440, 200% text | Focused fields under `.nv-actionbar.wb-savebar` | Tabbing through the 31 stops of the staffing and hours form, the focused field ends up behind the save bar on every width. **390:** 7 stops hidden. For example "Main Office minimum staff" sits at 691–743 under the bar at 700–768 (43 of 52px covered), and the target and maximum fields sit at 712–764 (52 of 52px covered). **320:** 10. **Landscape:** 12 (52/52). **768:** 5 (50/52). **1440:** 10, including fields at 824–876 under the desktop bar at 808–884. **200% text at 390:** 13. Fails WCAG 2.4.11 (focus not obscured). | `shots/savebar-covers-chromium-QAOWNER-390-f0.png`, `…-320-f0`, `…-L-f0`, `…-768-f0`, `…-1440-f0`, `…-390-f200` | Phone `scroll-padding-bottom` is `calc(80px + safe area)` (`src/app/app/portal-gusto.css:362`). That clears only the tab bar, but the save bar covers 76–144px from the bottom (`premium-wave-b.css:335`, bar 68px tall). Desktop has no bottom scroll padding, and the bar covers 16–92px (`:331`). | On Wave B, `html:has(.wb-rules .wb-savebar) { scroll-padding-bottom: calc(68px + 8px + 68px + 16px + env(safe-area-inset-bottom)) }` on phones, and `calc(16px + 76px + 16px)` from 761px. Alternatively, `scroll-margin-bottom` with the same values on `.wb-rules form :is(input, select)`. | **P1** |
| ST-B03 | Update detail, Compose, Payroll settings, Scheduling rules, Insights: direct load or reload (link, notification, refresh). Owner and Manager, every phone width | `.route-skeleton` on hard load | On a direct load the placeholder belongs to another page. Measured at 390, ready band in brackets. **Update detail:** "updates" placeholder 106px (288): the band grows 182px. **Compose:** 106px (312): grows 206px. **Payroll settings:** Home's overlapping 220px placeholder (128px flat under the tabs): shrinks 92px and changes shape. **Scheduling rules:** Schedule's 244px grid, overlapping (196px flat): 48px and a different shape. **Insights:** Home 220 (200): 20px. Templates matches (244 = 244). Lead and Employee get 128px instead of 106, still 160–184px short. | No screenshot. Frame log in `out/bands.jsonl` (`skelWhich`, `skelBand`, `bandSeq`) | `src/app/app/root-loading.tsx` (preview build) mapped these paths to `home` and `schedule` and `updates`. `data-route="updates"` has no Manager or Owner rule, so `--route-band` is undefined and the band falls back to 106px. `portal-premium.css:681-700` covers only the employee shell, at `:1165`. The hard load may also show the parent `schedule/loading.tsx` or `updates/loading.tsx`. HEAD `3eb73ef` adds `wb-*` entries for 5 routes (`root-loading.tsx:14-18`, `premium-wave-b.css` "Root loading frame"). It doesn't add `/app/updates/<id>`, it still lacks a Manager rule for `data-route="updates"`, and it has only 390 values. | Map `/app/updates/` plus an id to a `wb-detail` shape (288, list, overlap). Add `.route-skeleton[data-route="updates"] { --route-band: 128px }` for the Manager shell. Make `schedule/loading.tsx` and `updates/loading.tsx` take the destination's shape from `usePathname()`, the way `RootLoading` does (ST-22 precedent). Add the per-width values from ST-B04 and ST-B05. | **P1** |
| ST-B04 | All six Wave B pages, Owner, landscape 844×390, every in-app navigation | Page's own `loading.tsx` band | Each placeholder is the 390 portrait height with no landscape value, so the first card jumps up when the page arrives. Placeholder to ready: **Insights** 200→140 (−60). **Templates** 244→184 (−60). **Scheduling rules** 196→152 (−44). **Update detail** 288→228 (−60). **Compose** 312→228 (−84). **Payroll settings** 128→108 (−20). Same on every run (Home, Schedule, Updates and Payroll as origins). | No screenshot. Frame log in `out/nav.jsonl` | Each `loading.tsx` passes `band={n}` with no `route`, so `route-skeleton.tsx:13` writes `--route-band` inline and no media query can override it. Phase 2 routes use `data-route` and per-width CSS instead (`portal-premium.css:681-700`). | Pass `route="wb-insights"` and so on in each Wave B `loading.tsx`. In `premium-wave-b.css`, add `@media (max-height:430px) and (orientation:landscape) and (pointer:coarse)` with wb-insights 140, wb-templates 184, wb-rules 152, wb-detail 228, wb-compose 228, wb-payroll-settings 108. | **P1** |
| ST-B05 | Same pages, phone portrait 320, 360, 430 | Page's own `loading.tsx` band | Measured placeholder → ready. **320:** Insights 200→224, Templates 244→268, Rules 196→220, Payroll settings 128→152 (+24 each). Compose 312→348 for Lead and Employee (+36). **360:** Templates 268, Rules 220, Payroll settings 152, Update detail 324 (+24 to +36). **430:** Templates 244→268, Rules 196→220 (+24). The 430 values are taller than 390's because the summary's max-width drops to `calc(100% − 96px)` from 401px (`portal-premium.css:216`). | No screenshot. `out/nav.jsonl`, `out/warm.jsonl` | Same as ST-B04: a single 390 value, set inline. | Same mechanism. `@media (max-width:389px)`: insights 224, templates 268, rules 220, payroll settings 152, compose 312 (Owner and Manager) and 348 (Lead and Employee, under the employee shell). `@media (max-width:359px)` where 320 differs from 360. `@media (min-width:401px) and (max-width:760px)`: templates 268, rules 220. | P2 |
| ST-B06 | Update detail, every role, 320 and 360, read arriving after the placeholder | `[data-nv-band]` and first card | The in-page "Loading update…" band is 288px at 320, and the ready band is 348px (a three-line title plus facts). When the read arrives (held 2.5s): band 288 at 1,262ms, then 348 at 5,971ms, and the first card moves 284→344 (+60px). At 360 it's +36px. At 390 and 430 it matches (288). CLS reads 0 because the card is a new node, but the content visibly drops 60px. | No screenshot. `out/detail.jsonl` | `src/components/communication-detail.tsx` (around `:36` in `73c99cb`): the not-ready branch renders a `PageBand` with the one-line "Loading update…" title and no facts row. | Reserve the ready band's lines in the loading branch: a facts-row placeholder, plus `min-height: 2lh` on the title at ≤389px. Titles vary, so this narrows the jump rather than closing it. | P2 |
| ST-B07 | Every page, first load or uncached font (all roles, all widths) | Text wrapping after the Inter swap | Inter is an 876KB TTF with `font-display: swap`, no preload, and `max-age=0` on the dev server. It arrives 2–13s after first paint and text rewraps. **Scheduling rules 320:** the "On this page" pills go from 3 to 4 rows (`.wb-jump` 176→228px) and everything below drops 52px: CLS **0.092** at 3.9–12.5s, in 3 of 3 runs, cached and uncached. **Rules 430:** band 196→220, CLS 0.0214. **Templates 430:** band 244→268, 0.0224. **Insights 320 (Manager):** band 200→224, 0.0242. **Insights 768:** 0.016. **Compose 390:** 0.0097. **Payroll settings 200%:** 0.0281. **Update detail 200%:** 0.0222. The trace in `why.mjs` ties each shift to the frame where `document.fonts` reports Inter loaded. | No screenshot. `out/bands.jsonl`, `out/warm.jsonl`, `out/f200.jsonl` | `src/app/typeface-theme.css:14-20` (shared, coordinator). | Preload a woff2 subset of Inter in `layout.tsx` (`<link rel="preload" as="font" type="font/woff2" crossorigin>`). Add a metric-matched fallback `@font-face` (`size-adjust`, `ascent-override`, `descent-override`), or move to `next/font/local`, which generates one. Cache `/fonts/` for a long time. | P2 |
| ST-B08 | All six pages, 125–200% text (measured 200% at 390) | `.route-skeleton-band` | Placeholder bands are fixed in px, so they don't grow with text. At 200%, placeholder → ready: Insights 220→380, Templates 244→424, Rules 244→520, Update detail 106→492, Compose 106→540, Payroll settings 220→428 (hard load). Client-navigation placeholders would be 200, 244, 196, 288, 312 and 128 against the same ready heights. The content drops 160–434px. | No screenshot. `out/f200.jsonl` | `route-skeleton.tsx:13` and the `loading.tsx` values in px. `portal-premium.css:443` uses `height: var(--route-band)`. | Express the band heights in rem (for example 12.5rem rather than 200px), so they scale with root size. Most of the band's height is text. | P2 |
| ST-B09 | Scheduling rules, Owner, 390 at 200% text | `.wb-savebar` vs `.mobile-nav` | The tab bar grows to 83px (761–844), but the bar's offset stays 68 + 8px. When stuck, the bar sits at 664–768, so its bottom 7px slips under the tab bar. | `shots/savebar-covers-chromium-QAOWNER-390-f200.png` | `premium-wave-b.css:335`: `bottom: calc(68px + var(--nv-s-2) + …)`. | Offset from the tab bar's real height: a shell token such as `--nv-tabbar-h` set on the nav, or `4.25rem`, which tracks text size. | P2 |
| ST-B10 | Scheduling rules, Owner, landscape 844×390 | `.wb-savebar`, `.mobile-header`, `.mobile-nav` | While the form's top is in the lowest 144px (scrollY 0–~110), the sticky bar is drawn from the form top, partly under the tab bar: bar 352–420 or 292–360 against the tab bar at 322–390. `elementFromPoint` at the bar's centre returns the tab bar. Once stuck, the fixed chrome is header 68 + bar 68 + gap 8 + tab bar 68 = **212 of 390px (54%)**, leaving 178px for fields. | `shots/savebar-QAOWNER-L-top.png`, `shots/savebar-covers-chromium-QAOWNER-L-f0.png` | The bar is sticky in landscape, and the header stays sticky in landscape here (`hdrPos: sticky`). HEAD's AL-B21 (`premium-wave-b.css`, "on a landscape phone the save bar ends the form") makes it static, but that isn't in the preview. | Keep AL-B21 and verify it in the next round. | P2 |
| ST-B11 | Templates and Scheduling rules, Owner and Manager, phone | `.mobile-nav` current item | No tab link has `aria-current` on any Wave B page, and More is the highlighted pill. Templates and Scheduling rules are reached from Schedule, and their back link says "Schedule", but the tab bar says More. Judgment call: this is about which tab means "you are here", not breakage. | `shots/savebar-covers-chromium-QAOWNER-390-f0.png` (More pill lit) | Shell current-tab mapping (`navigation.ts` / `app-shell.tsx`, not Wave B's files). | Mark Schedule current for `/app/schedule/templates` and `/app/schedule/settings`, with `aria-current="page"`. Leave More for Insights, Payroll settings and Updates. | P2 |

## What I checked and found correct

**Header joins the band.** The header is 0–68px and the band starts at 68 with a 0px seam. Both are `rgb(28, 74, 71)`. Same at 320, 360, 390, 430 and landscape, on all six pages, for Owner, Manager, Lead and Employee (160 hard loads). Payroll settings and Payroll runs: header 0–68, section tabs 68–112 on teal, band from 112. Desktop 768–1440: white top bar 65px, band card at y=93, the same as Home at 768.

**Band heights at 390** (ready, matching each page's own `loading.tsx` on in-app navigation): Insights 200, Templates 244, Scheduling rules 196 flat, Update detail 288, Compose 312, Payroll settings 128 flat. Payroll runs (Manager `payroll-qa-reviewer`) 152 against a 152 placeholder.

**Other widths, ready band:**

| Page | 320 | 360 | 430 | Landscape | 768 | 1024 | 1440 |
|---|---|---|---|---|---|---|---|
| Insights | 224 | 200 | 200 | 140 | 188 | 164 | 164 |
| Templates | 268 | 268 | 268 | 184 | 232 | 208 | 208 |
| Scheduling rules | 220 | 220 | 220 | 152 | 176 | 176 | 176 |
| Update detail | 348 | 324 | 288 | 228 | 252 | 252 | 252 |
| Compose | 312 (348 for Lead and Employee) | 312 | 312 | 228 | 276 | 252 | 252 |
| Payroll settings | 152 | 152 | 128 | 108 | 132 | 108 | 108 |

**Tab bar.** At 390 on all seven pages plus Home and Schedule: 776–844 (68px), every link box and icon at identical coordinates (Home link 4/74/55, icon top 789.5). Identical at scroll 0, 50% and 100%. Landscape: 322–390, identical on every page.

**Bottom gap.** At maximum scroll the last card ends 20px above the tab bar: 756 vs 776, and in landscape 302 vs 322.

**Section tabs on Payroll settings.** At 68/44 from the placeholder frame to ready, at every phone width and in landscape. Desktop 93/45. Their only shift entries are ≤0.0003.

**Save bar at 100% text.** On phones it sticks at 700–768, 8px clear of the tab bar (776) at every scroll position measured. On desktop it sticks at 808–884, 16px from the bottom. It stays inside its form: past the form it scrolls away, ending at 202 at 390.

**Layout shift on hard load** (Chromium, PerformanceObserver installed before navigation). With the font-swap cases in ST-B07 set aside, every page, role and width reads 0–0.0097. Feedback states (`?saved=1`, `?error=save`, `?applied=3&skipped=1&warnings=1`, `?error=invalid_hours`) read 0–0.0004.

**Roles sent away.** Employee on Insights and Manager on Payroll settings both land on `/app` cleanly, with Home's own placeholder and no Wave B frame shown.

**Disclosures.** Report definitions (Insights, 390 and 1440), Add coverage period, and the coverage period group (Rules, 390 and 1440): the summary moves 0px on open, there are no shifts without input, scroll is unchanged, and closing restores the page exactly. Normal motion animates the height over about 500ms. Under reduced motion, Report definitions opens to its full 620px within 40ms and the chevron turns instantly.

**Compose audience preview** (Owner 1440, Lead 390). CLS 0. "Review before publishing" (158px, or 178px for the Lead) is replaced in place by "Audience preview" (256px, or 296px). Nothing below it moves. On the phone the page scrolls 110px so the preview (469–765) sits above the tab bar (776). Exactly one preview request was made, answered locally.

**Insights refresh.** "Refresh" collapses the report for about 240ms with no CLS. That is user-initiated and acceptable on its own, but it is part of the ST-B01 pattern.

**Motion, normal.** Insights: 2 cards, y 8→0 and opacity .75→1, about 350ms. Templates: 2 cards, y 8→0. Compose: content y 6, opacity 0→1, 300ms. Audience preview: y 6, 0.24s. Transforms only, so no layout shift.

**Motion, reduced.** 0 animated frames on Insights, Templates and Compose. Update detail and Scheduling rules have no entrance animation in either mode.

**Print / Save PDF** (Insights, Owner 1280 and Manager 390, print media emulated):
- Sidebar, header, tab bar and location chrome hidden.
- 0 fixed or sticky elements.
- Every `details` opened.
- Period fields, actions, export card and jump links hidden.
- Card shadows 0.
- Band in plain ink (`rgb(22,25,28)` on transparent).
- No element wider than the page.
- 6 A4 pages.
- Back on screen, the disclosures return closed.

Screenshot: `shots/print-1280-small.png`.

**Firefox and WebKit** (390 and 1440, frame sampling, because neither has the layout-shift API): band heights equal Chromium's, the header joins the band, and the tab bar is at 776/68. Compose shows the same 288→312 font-swap step as ST-B07.

## Not covered, and gaps

- **Text sizes.** I measured 125% and 150% only indirectly. ST-B08 scales linearly. Full runs were at 100% and 200%.
- **Browsers.** Firefox and WebKit only at 390 and 1440. WebKit's Payroll settings at 390 timed out twice.
- **Accounts and data.** `AUDIT-LONG` not run, and large data not run (second preview).
- **Hardware.** On-screen keyboard (the session's job), real iPhone, notch and blur not tested.
- **States.** Offline and paused states weren't measured for shift.
- **Server load.** The shared dev server was very slow, with up to 46s per load and one transient 500 on Scheduling rules. Every timeout was retried once. The results above come from the runs that loaded.
- **HEAD fixes.** Checked only by reading the code: `root-loading.tsx` `wb-*` routes and AL-B21. Re-check them in round 2 once the preview is synced.

## Wording suggestions (not defects)

None in this area.

**Does bars and stability have zero open P0, P1 and P2? No.** There is 1 P0 (ST-B01), 3 P1 (ST-B02, ST-B03, ST-B04) and 7 P2 (ST-B05 to ST-B11).

## Round 2

Re-check on the frozen preview at `2e7495c`, Chromium, October 19. Line numbers refer to `2e7495c`. The worktree already has uncommitted edits in some of these files. Every non-GET was aborted (or held for the pending state). `POST /api/reports` (a read) was let through as in round 1. Nothing reached the server as a change. Scripts and evidence: `…/scratchpad/inspect/stability/r2/` (shortened to `r2/`), raw lines in `r2/*.jsonl`.

### Status by ID

| ID | Status | Now, measured | Where |
|---|---|---|---|
| ST-B01 | **Partly fixed**. Still open, now **P1** | The quiet refresh works while a read takes less than 3s. Manager at 390 read for 65s with 6 silent swaps of 52–149ms each. The page didn't change once: the same row node stayed at top 298, height 7670, CLS 0. At 1440, swaps of up to 2,966ms held too. **Any read of about 3.0s or longer still empties the page.** The refresher starts 3,000ms before expiry, expiry aborts it, and `clear('loading')` runs. Seen on the shared server: Owner at 390 emptied at 17.1s and 43.4s out of 65s. The page went 7670→1094 and scroll went 5300→250, then stayed at 250. At 1440 it emptied at 23.7s and scroll went 1400→0. With every read delayed to a fixed 3.5s, it emptied at 8.3s, 23.3s and 38.2s and Download CSV was disabled. It's P1 rather than P0 because a fast connection now holds. A phone on a slow network still can't read past the first screen. `r2/read-QAOWNER-390-*.png`, `r2/readD3500-QAOWNER-390-*.png` | `src/components/reports.tsx:23` (fixed `REFRESH_LEAD_MS=3000`), `:103-104`. **Fix:** set the lead from the last round trip, `min(validForMs/2, max(3000, 2×lastRoundTrip + 500))`. When an expiry does retire the report, keep `scrollY` and restore it when the next report renders. The privacy retire itself stays. |
| ST-B02 | **Partly fixed**. Open, P1 | Desktop and landscape are fixed. 768 and 1440: `scroll-padding-bottom` 108px, 0 of 30 stops covered. 1440 at 200%: 160px, 0 covered. Landscape: the bar is static and 0 covered. **Phones are not fixed.** Computed `scroll-padding-bottom` is still **80px**. 320: 10 of 30 stops covered (up to 48 of 48px under the bar). 390: 7. 390 at 200%: 11, at 93px under. `r2/savebar2.jsonl` | `premium-wave-b.css:512`. `html:has(.wb-rules .wb-savebar)` has specificity (0,2,1) and loses to `portal-gusto.css:362`, `html:has(body .app-shell.nevora-portal .mobile-nav) { scroll-padding-block: … }` at (0,3,2). **Fix:** use `html:has(body .app-shell.nevora-portal .mobile-nav):has(.wb-rules .wb-savebar) { scroll-padding-block: 84px calc(101px + 3.6875rem + env(safe-area-inset-bottom)) }`. |
| ST-B03 | **Fixed** (Wave B's part) | Hard load at 390 now matches exactly. Insights 200=200, Templates 244=244, Rules 196=196, Compose 312=312, Payroll settings 128=128. Update detail still shows `updates` at 106px (Owner) or 128px (Lead) → 288. That remainder is the coordinator's `/app/updates/<id>` fix (decided). | `root-loading.tsx:14-18` |
| ST-B04 | **Partly fixed**. Open, now P2 | Landscape placeholders now come from CSS. Since a62cc79 (full landscape summary) the ready bands changed, though. Placeholder → ready: Insights 140→136, Templates 184→180, Update detail 228→224, Compose 228→224, Payroll settings 108→104 (−4 each), **Rules 152→172 (+20)**. | `premium-wave-b.css:524` (landscape line). **Fix:** insights `calc(72px + 4rem)`, templates `calc(116px + 4rem)`, rules `calc(108px + 4rem)`, update and compose `calc(160px + 4rem)`, payroll settings `calc(40px + 4rem)`. |
| ST-B05 | **Partly fixed**. Open, P2 | Owner on in-app navigation: all 24 portrait bands match at 320, 360, 390 and 430 (for example, 320: 224/268/220/348/312/152). **Lead and Employee Compose at 320 is not fixed:** 312→348 (+36). | `premium-wave-b.css:520`. The ≤339px `wb-compose` value is shared by both shells. **Fix:** add `html body .app-shell.employee-shell .route-skeleton[data-route="wb-compose"] { --route-band: calc(24px + 20.25rem) }` inside `(max-width: 339px)`. Check 200% after. |
| ST-B06 | **Not fixed**. Open, P2 | The read arrived after a 2.5s hold. At 320: band 288→348 and first card 284→344 (+60). At 360: 288→324 (+36). | `communication-detail.tsx:45-49`, the loading branch's `PageBand`. Fix as in round 1. |
| ST-B07 | **Deferred** (decided: coordinator's Inter fix arrives with the merge) | Compose hard load still steps 288→312 on the font swap, at 390 for both Owner and Lead. | not counted |
| ST-B08 | **Partly fixed**. Open, P2 | 200%: exact at 320 (6 of 6) and at 390 for 5 of 6. **Update detail at 390, 200%: 560→612 (+52).** The steps in between are off because rem interpolation assumes linear wrapping. At 125% (390), placeholder minus ready: Insights +24, Templates −6, Rules +24, Detail +2, Compose +30, Payroll settings +24. At 150%: +12, +12, **+72**, +4, **+60**, +36. A taller placeholder means the content jumps up when the page arrives. | `premium-wave-b.css:520-524`. **Fix:** CSS can't query text size, so measure 125% and 150% and fit each route's value as two segments (for example `max()`/`clamp()` of two rem slopes) instead of one straight line from 100% to 200%. At minimum, correct wb-update at 390 to `calc(-36px + 20.25rem)` (612 at 200%, 288 at 100%). |
| ST-B09 | **Partly fixed**. Open, P2 | There's no overlap any more, but the gap shrinks. The tab bar is 68, 75 and 83px at 100, 150 and 200%. The stuck bar's bottom sits 8px, 4.5px and **0px** above it (at 200%, bar 657–761 and tab bar 761–844). The CSS comment assumes 75px at 200%. `r2/stuck-QAOWNER-390-f200.png` | `premium-wave-b.css:336`. **Fix:** `bottom: calc(53px + .9375rem + var(--nv-s-2) + env(safe-area-inset-bottom, 0px))`, which matches 68, 75.5 and 83. |
| ST-B10 | **Fixed** | Landscape: the bar is static and ends the form (3148–3216). 0 of 30 stops are covered. | `premium-wave-b.css:452` |
| ST-B11 | Decided, not refiled | Coordinator: More is current. | n/a |

### New findings

| ID | Page, role, width | Element | What's wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| ST-B12 | Scheduling rules, Owner (and Manager by the same code), every phone width ≤760 | Status inside `.wb-savebar` | **On a phone, the save bar never shows its result.** I aborted "Save staffing & hours" at 390. `p.wb-error` ("Changes could not be saved. Your entries are preserved; try again.") is in the bar, but its computed style is `display: none`. The bar reads only "Save staffing & hours", so the owner sees no failure. A `role="alert"` with `display: none` isn't announced either. "Scheduling rules saved." is a `p` in the same place, so success is hidden too. The pending label "Saving…" on the button does show. | `r2/savebar-abort-QAOWNER-390-f0.png` | `premium-wave-b.css:337`: `.wb-savebar > p { display: none; }` is meant for the `wb-note` but also matches `.wb-saved` and `.wb-error`. Line `:472` sets only `flex-basis`. | Change `:337` to `.wb-savebar > p.wb-note { display: none; }`. The bar then grows by one or two lines, so add that height to the ST-B02 phone scroll padding (or set it from a `--wb-savebar-h` measured with a ResizeObserver). | **P1** |

### Checked and correct

- Insights: a successful silent swap keeps every node, the scroll position and the height (Manager 390, 65s; Owner 1440). CLS 0 in all runs.
- Save bar pending: the button reads "Saving…", the bar keeps its height (480–548) and focus stays on the button.
- In-app navigation placeholders at 100%: 24 of 24 exact for Owner at 320, 360, 390 and 430. Hard load: 5 of 6 exact (the sixth is decided).
- Desktop save bar: 0 of 30 stops covered at 768, 1440 and 1440 at 200%.
- Templates week stepper (390): pending state shown for 263ms, height 1233 unchanged, CLS 0.
- No change reached the server. The writes the route saw were `POST /app/schedule/settings` (aborted) and one dev-overlay `POST /__nextjs_original-stack-frames` (aborted).

### Gaps

- WebKit spot checks weren't run this round.
- Scheduling rules focus sweep was re-run for Owner only. Manager uses the same form.
- I didn't trigger a save success, because letting the write through isn't allowed. The hidden "saved" state is inferred from the code at `wave-b-forms.tsx:87-89` and `:337`.
- `r2/` has a `checks.mjs` result only for Owner Insights. `wb/checks-r2-chromium.txt` ends with "Target page, context or browser has been closed", so the round-2 sweep looks incomplete.

**Does bars and stability have zero open P0, P1 and P2? No.** 0 P0. 3 P1: ST-B01, ST-B02, ST-B12. 5 P2: ST-B04, ST-B05, ST-B06, ST-B08, ST-B09.
