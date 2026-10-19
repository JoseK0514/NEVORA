# Phase 7 inspection: bars and stability (ST-)

Inspector: stability. Date: October 18, 2026. Preview `http://127.0.0.1:51346`, Manager `AUDIT-M` and Owner `QAOWNER`, fictional data. Read only: nothing was approved, declined, saved or sent. The one toast I raised was a local `nevora:toast` event in the page, so nothing was stored.

## Verdict

The fixed parts are steady. The tab bar never moves or resizes when you scroll, at any width. Its icons never shift when you switch tabs. The header and the band are one colour with no seam in portrait. No page scrolls sideways. Rotating the phone and rotating it back restores every page exactly.

What still moves is the content, and the decision bar. Home jumps on every load: CLS 0.25 to 0.35 at 390, 430 and 360 for both roles, because the Today and "Needs you" placeholders are much shorter than the cards that replace them. The "This week" card gets pushed 645px down. Inbox jumps 112 to 120px when its band fills in: CLS 0.12 at 390 and 0.29 at 320.

The time-off decision bar is not really docked. It rides up 70px as you reach the bottom of the page, and at 430 it never docks at all. At 320 it stacks to 140px tall. In landscape, a toast covers both it and the tab bar.

Every tab tap shows about 300ms of a placeholder with no band before the teal band pops in. In landscape the header also flashes translucent white during that time.

The build changed while I was inspecting. Between 22:16 and 22:23 the main session landed fixes from other inspectors, so I re-ran every measurement against that build. Eight things I found in the first pass are now fixed (listed below). Everything in the findings table was measured on the current build between 22:25 and 22:45.

Totals: **0 P0, 9 P1, 5 P2.**

## Findings, worst first

Screenshots are in `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS/8c7acfe8-4195-49cb-a26a-ba2ac9ec5c59/scratchpad/phase7/stability/shots/`, shortened below to `shots/`. Timings come from a local dev server; production will be faster, but the jumps are the same size.

| ID | Screen, role, width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| ST-01 | Home, both roles. 390 (CLS 0.31–0.33), 430 (0.30–0.35), 360 (0.31), 768 (0.21–0.24). 320 is 0.05 only because the jump happens below the fold. | `#home-today`, the Needs-you card, `#home-week`, `#home-tools`, `.premium-home__setup` (Owner) | The same result on 3 runs out of 3, at 390, Manager. **Today:** the placeholder is 142px tall and the real card is 212px, so +70px. **Needs you:** the "Loading…" card is 116px; it becomes Next up (230px) plus "Also needs you" (515px). **This week** moves from y=576 to y=1221, a 645px push. A new 96px Planning card also appears. Layout-shift entries: 0.056 at about 0.5s and 0.268 at about 0.7s. On tab taps the shifts happen inside the 500ms "recent input" window, so Chrome excludes them from CLS, but you still see them. | `shots/ST-01-home-tap-390.png` (frames at 396, 428 and 499ms) | `src/components/premium-home.tsx:110-113`: the Today placeholder is shorter than the real StatGrid plus its foot. `premium-home.tsx:203-208`: `PendingCard` busy state is two 14px lines in a 116px card. `premium-home.tsx:177-200`: `NowCards` renders 745px or more. | Best fix: render the first action-center and today snapshot on the server, so the first paint is the final content. Otherwise, make the placeholders the final size. Today: real labels plus a 34px figure block plus the 45px foot row, `min-height: 212px` at 390. Needs you: a placeholder shaped like Next up (`min-height: 230px`), then a 3-row card placeholder (`min-height: 300px`). | P1 |
| ST-02 | Inbox (all, now, requests, planning), both roles. 320 CLS 0.286, 360 0.276, 390 0.118, 430 0.109, landscape 0.045 | `[data-nv-band]`, `.nv-masthead__title`, `.inbox-refresh`, `.nv-content` | **390:** the band is 188px while loading and 308px when ready (+120px); every card moves from y=184 to y=304. **320:** the band goes from 220 to 332px (+112px). There, the loading eyebrow "Requests and problems to resolve" wraps and pushes Refresh onto its own row. When the eyebrow becomes "Updated 10:33 PM", the title moves *up* 32px (y=156 to 124), Refresh moves up 32px (108 to 76), and everything below moves *down* 112px. | `shots/ST-02-inbox-tap-320.png` (397ms vs 548ms) | `src/components/manager-inbox.tsx:138-146`: while loading, the eyebrow is a long sentence, `summary` is undefined and `extra` (the filters) is null. `src/app/app/portal-premium.css:93` `.nv-pageband__eyebrow-row { flex-wrap: wrap; }` lets the long eyebrow push Refresh down. | Give the loading band the ready band's structure. Keep the eyebrow one line: use "Checking…", or `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`. Reserve the summary with `min-height: 3rem` (2 lines of 24px) at 390 and above, and `4.5rem` at 360 and below. Render the four filter pills disabled (`aria-disabled="true"`) while loading, so the band is 308px (390) or 332px (320) from the first paint. | P1 |
| ST-03 | Time-off review (`?requestId=audit-timeoff`, with and without `&from=home`), both roles. 320, 390, 430, landscape | `.nv-actionbar.premium-review-actions` | The bar only sticks while there is enough content below it. Then it comes off the tab bar. **390:** docked at 702–778 for scrollY 0–47. At the bottom (scrollY 142) it sits at 632–708, 68.75px above the tab bar with empty canvas below, so it travels 70px. **430:** it never docks. At scrollY 0 it is 14.75px above the tab bar, at the bottom 68.75px, so it moves with the page. **320:** it travels 70px. When docked, its bottom (778) is 1.25px *under* the tab bar top (776.75), because the offset is 66px but the bar is 67.25px tall. | `shots/ST-04-decision-bar-390-top-vs-bottom.png`, `shots/ST-05-decision-bar-320-stacked-430-floating.png` (right) | `src/components/kit/kit.css:307-312`: the bar is `position: sticky` inside `form.nv-content`, which has `padding-bottom: 48px` (`kit.css:110`). `[data-nv-page]` adds `padding-bottom: 88px` (`portal-premium.css:18`). So the bar's natural resting place is 136 − 67.25 = 68.75px above the tab bar. Also `portal-premium.css:170` sets `--nv-actionbar-offset: calc(66px + …)` and `portal-premium.css:174` sets `margin-top: auto`. | Dock it for real. On phones, `.premium-review .nv-actionbar { position: fixed; left: 0; right: 0; bottom: calc(68px + env(safe-area-inset-bottom)); margin: 0; }`. Give the review page `padding-bottom: calc(68px + 76px + 16px + env(safe-area-inset-bottom))` and `.premium-review > form.nv-content { padding-bottom: 0 }`. Make the tab bar exactly 68px (see ST-13) and use 68px as the offset. | P1 |
| ST-04 | Review, both roles: 390 and 320 portrait, and landscape 844×390. Any page in landscape. | `.nevora-toaster` / `.nevora-toast` | **390:** the toast is at 690.8–756 and the docked Decline and Approve buttons are at 714–766, so it covers 42 of their 52px. `elementFromPoint` at the centre of Approve returns the toast. **320:** toast 414.8–480 over Decline at 374–426. **Landscape:** the toast is at 300.8–366 (x 440–820); the tab bar top is 322.75, so it covers the tab bar by 43px and Approve (260–312) by 11px. On Inbox in portrait the toast clears the tab bar by 20.8px, which is correct. | `shots/ST-06-toast-over-decision.png` | `src/app/app/portal-motion.css:196-200`: the phone toaster is lifted 88px, enough for the tab bar but not for an action bar. That rule is `@media (max-width: 760px)` only, so in landscape the desktop `bottom: 24px` from `portal-motion.css:164-166` applies. | Add the landscape query `(max-width: 900px) and (max-height: 430px) and (orientation: landscape) and (pointer: coarse)` to the phone toaster rule. Lift it above an action bar: `html body:has(.nv-actionbar) .nevora-toaster { bottom: calc(68px + 76px + 8px + env(safe-area-inset-bottom)); }`. That is 152px, so it sits 8px above the bar. | P1 |
| ST-05 | Every tab tap (Home, Schedule, Inbox, Team, and More links), both roles, all phone widths | Route placeholders: `.route-skeleton`, and on Home `.portal-route-state` | For about 280–330ms after a tap, the page shows a grey placeholder with **no band**. Then a teal band 188–308px tall appears and pushes everything down: Home 220px, Inbox 308px, Schedule and Team 244px, Timecards 44+172px. The `.page-frame` top padding also goes from 24px to 0. Home uses a different placeholder from every other tab: a white "Loading your workspace…" card, and its loading lines also move 24px (shift 0.003). | `shots/ST-01-home-tap-390.png` (115ms frame), `shots/ST-02-inbox-tap-320.png` (88ms frame) | `src/components/route-skeleton.tsx:6-14` has no band. `src/app/app/loading.tsx:2` is a generic card. The band styles are keyed on `.page-frame:has([data-nv-page])` (`portal-premium.css:17-27`), so while a placeholder is showing none of them apply. | Add a band to `RouteSkeleton`: a teal `.nv-pageband` placeholder at the final band height for each route (Home 220px, Inbox 308px, Schedule and Team 244px), with `data-nv-page` on the wrapper so the frame padding is 0 from the first frame. Swap `app/loading.tsx` for the same banded placeholder. | P1 |
| ST-06 | Landscape 844×390, every tab tap and every load, both roles | `.mobile-header` | While the placeholder shows, the header turns `rgba(255,255,255,.78)` (frosted white, grey wordmark, no bell) and is 65px tall. It goes back to teal and 68px when the band arrives, so the wordmark moves 2px each way. One layout shift of 0.008 or more per load (`div.page-frame y65→68`, `a.brand.compact y13.5→15.5`). | `shots/ST-03-landscape-tab-flash.png` (112ms frame) | The teal header for kit pages is `portal-premium.css:6-9`, which needs `:has([data-nv-band])`. The fallback teal header `src/app/mobile-workforce.css:39-42` is inside `@media (max-width: 760px)` (`mobile-workforce.css:12`), so a landscape phone loses it. | Inside the landscape coarse media query, apply the teal header without the band condition: `html body .app-shell.nevora-portal[data-mobile-workforce="true"] .mobile-header { background: var(--nv-masthead); border: 0; min-height: 68px; padding: 12px var(--nv-gutter); }`, plus the white icon colours from `portal-premium.css:10-14`. | P1 |
| ST-07 | Review, both roles, 320, default text size | `.nv-actionbar` buttons | Decline and Approve stack on two rows, so the docked bar is 140px tall (362–502 on a 568px screen). With the 68px header and the 67px tab bar, that is 275px of fixed chrome, 48% of the screen. They stack because each button gets 138px and the basis is 144px. | `shots/ST-05-decision-bar-320-stacked-430-floating.png` (left) | `src/app/app/portal-premium.css:91-92` `.nv-actionbar { flex-wrap: wrap } .nv-actionbar > .nv-btn { flex: 1 1 9rem; }`, which is 144px. This came in with the WR-20 large-text fix. | Use `flex: 1 1 8rem`. That is 128px at 100%, so both buttons fit side by side at 320 (138px each). At 125% text it is 160px, so the intended stacking still happens. | P1 |
| ST-08 | Review, both roles, landscape 844×390 | Sticky header + `.nv-actionbar` + `.mobile-nav` | Fixed chrome is 68 + 76 + 67.25 = 211px of 390px (54%). The first view shows only 28px of the Request card (y=220–248), with the "Request" heading and the "Waiting" pill cut through the middle by the bar. | `shots/ST-08-review-landscape-first-view.png` | The header stays `position: sticky` in landscape, and the bar is sticky above a 67px tab bar. | In the landscape coarse query, make `.mobile-header` `position: static` so it scrolls away, and stop docking the bar there (`.premium-review .nv-actionbar { position: static; }` with the buttons after the facts). Or keep the bar and drop the sticky header; either gives back at least 68px. | P1 |
| ST-09 | Timecards and Time exports (from More), Payroll (Owner), 390 and 320 | `.page-frame > .section-tabs` | While the placeholder shows, the section tabs sit on a white strip under the teal header (dark text, teal underline, y=84, 45px tall). When the page arrives they jump to y=68 (−16px) and 44px tall, on teal. Then their labels fade from dark ink to white over about 110ms; at the 379ms frame they are almost invisible on teal. Shift 0.0014–0.003. The legacy "View period" button also flickers teal, then disabled grey, then teal (379, 491, 605ms). | `shots/ST-09-timecards-via-more-390.png` | The band look for section tabs is keyed on `.page-frame:has([data-nv-page])` (`portal-premium.css:20-26`), which doesn't match during the placeholder. `src/app/app/portal-gusto.css:312-316` gives `.section-tab` `transition: color 150ms ease`, which animates dark to white. | Key the band section-tab look on the shell, e.g. `[data-mobile-workforce="true"] .page-frame > .section-tabs` with the phone media query, so the tabs are teal from the first frame. Add `transition: none` to `.section-tab` and `::after` inside band pages. Give the placeholder `padding-top: 0` when section tabs are present. | P1 |
| ST-10 | More sheet, both roles, 390 and 320 portrait, on every tab | `#manager-more-navigation` | The sheet ends 16px above the bottom edge (bottom 828 at 390). Under the dim, the tab bar labels show cut in half in that 16px strip (828–844). | `shots/ST-07-more-sheet-bottom-390.png` | `src/app/mobile-workforce.css:94-96` styles the popover as a floating sheet inset 16px on every side (computed `bottom: 16px`, radius 24px). | Run it to the edge: `bottom: 0; left: 0; right: 0; border-radius: 24px 24px 0 0; padding-bottom: calc(16px + env(safe-area-inset-bottom));`. Or keep the inset and make the backdrop opaque enough (0.5 or more) that the cut labels don't read. | P2 |
| ST-11 | More, both roles, landscape 844×390 | `#manager-more-navigation` | In landscape, More opens as a dropdown anchored top right (x=514, y=12, 318×366), with no handle, no dimmed page behind it and no "Close actions" (0×0). In portrait it is a bottom sheet. It does fit (366 of 390) and scrolls inside itself (208–296px). This is a judgment call: it is an inconsistency, not breakage. | `shots/more-manager-land-_app-s0-open.png` | `src/app/app/portal-motion.css:37-71`: the sheet presentation is `@media (max-width: 760px)` only. | Add the landscape coarse query to `portal-motion.css:37`, with `max-height: calc(100dvh - 24px)`. | P2 |
| ST-12 | Every kit page, both roles, every phone width | Bottom of `[data-nv-page]` | At max scroll, 68.75px of empty canvas sits between the last card and the tab bar on every page (e.g. Home 390: last card bottom 708, tab bar top 776.75). That is `nv-content`'s 48px plus the page's 88px, minus the 67.25px tab bar. In landscape it is 21% of the visible height. It is a judgment call; I'd expect the 20px the 88px value implies. | `shots/reach-manager-390-home-bottom.png` | `src/components/kit/kit.css:110` (`padding: 0 var(--nv-gutter) var(--nv-s-12)`) stacked on `src/app/app/portal-premium.css:18` (`padding-bottom: calc(88px + …)`). | On phone band pages, `[data-nv-page] > .nv-content { padding-bottom: 0 }`. That leaves 88 − 68 = 20px of clearance. | P2 |
| ST-13 | Tab bar, both roles, every phone width and landscape | `.mobile-nav`, `.mobile-nav-link span` | Icons and link boxes are pixel-identical idle and active. But the active label is bolder (500 to 600) and so 0.30–0.72px wider: Home 37.23 → 37.53px, Schedule 59.17 → 59.89px, Inbox 34.88 → 35.36px, Team 34.69 → 35.08px. Its edges move by 0.15–0.36px. The bar is a fractional 67.25px tall (label line-height 16.25px), so its top hairline lands at y=776.75 at 390 and 322.75 in landscape. The decision-bar offset in ST-03 assumes 66px. All of this is sub-pixel, so it is a judgment call. | none (numbers only, from `tabs-390.json`) | `src/app/app/portal-premium.css:41` (`font-size: min(.8125rem, 15px); line-height: 1.25`) and `portal-premium.css:48` (`font-weight: 600` on active). | Set the label `line-height: 1rem` (16px), so the bar is exactly 67px. Better still, set `min-height: 54px` on the link so the bar is 68px, and use 68px everywhere (ST-03, ST-04). Keep the label at 600 in both states and mark the active tab with colour and the pill only, or keep 500 and use `font-variation-settings` so the width holds. | P2 |
| ST-14 | All pages, landscape on notched iPhones. Not verified on a device: Playwright has no notch. | `.mobile-header`, `.nv-pageband`, `.nv-content`, `.mobile-nav` | The viewport is `viewport-fit=cover` (`src/app/layout.tsx:17`). Nothing on the manager or owner phone shell uses `env(safe-area-inset-left/right)`; only the bottom inset is used, on the tab bar. In landscape the wordmark and cards start at x=24 and the Home tab link at x=4. On a notched iPhone the side inset is about 47–59px, so these would sit under the sensor housing. | none | `src/app/layout.tsx:14-18` and `src/app/app/portal-premium.css:31-37`: no left or right inset. | In the landscape query: `.mobile-header, .nv-pageband, [data-nv-page] > .nv-content { padding-left: max(var(--nv-gutter), env(safe-area-inset-left)); padding-right: max(var(--nv-gutter), env(safe-area-inset-right)); }` and `.mobile-nav { padding-left: max(4px, env(safe-area-inset-left)); padding-right: max(4px, env(safe-area-inset-right)); }`. | P2 |

## Found in the first pass and fixed by the 22:16–22:23 edits

These were measured between 21:50 and 22:15 and re-measured on the current build. The re-check should confirm they stay fixed.

- **Home header was a different size from every other tab.** It was 76px tall with 20px padding and a 136px wordmark; elsewhere it was 68px, 16px and 124px. So every tap to or from Home moved the wordmark 4px each way and the band started 8px lower. It is now 68px everywhere (`data-mobile-workforce` now applies on `/app`, `app-shell.tsx:148`).
- **Home's header went white while Home loaded** (about 300ms on a tap). Now it stays `rgb(28,74,71)` in every frame in portrait.
- **The notification bell faded from a white tile** to transparent over 160ms on the teal header (`shots/ST-bell-flash-crop.png`). That is gone, because the header no longer starts white.
- **More on Home opened as a dropdown anchored top right** (60, 12, 318×775, overlapping the tab bar by 11px). On the other tabs it was a bottom sheet. It is now the same bottom sheet on every tab in portrait (`shots/ST-more-home-vs-schedule-390.png` shows the old state).
- **Landscape band had rounded top corners under a square teal header.** That left grey #F2F4F3 wedges at x=6 and x=838 just below the join (`shots/ST-land-band-corner.png`). The band is now edge to edge (radius 0) and all join samples are teal.
- **The landscape review page was 852px wide on an 844px screen.** The action bar spanned −8 to 852, so the phone zoomed out and the tab bar was 852px wide. Now `scrollWidth` is 844.
- **Landscape had no wordmark in the header.** It is restored at x=24.
- **Rotating Schedule** 390 → 844 → 390 used to lose 36px of scroll (300 → 264). It now restores 300.

## Checked and correct (for the re-check)

- **Header and band join:** I sampled pixels at join −1.5, −0.5 and +0.5, and at band +1 and +10, at x=6, the middle and vw−6, on every page and both roles at 320, 360, 390, 430 and 844×390. Every sample is #1C4A47. The only exceptions are by design: the watermark (#2C5754 at the right edge) and the active section-tab underline (#FFFFFF). The header is `position: sticky; top: 0`, 68px at every phone width after load. `theme-color` is #1C4A47, the same as the band. `overscroll-behavior-y: none` is set on both `html` and `body`, so Chrome shows no bounce; the #FAFAFA page background is never exposed. iOS rubber-banding was not verified on a device.
- **Tab bar position:** it is `position: fixed`. Its rect is the same at scrollY 0, the middle and the bottom on every page, both roles: 320 [0, 500.75, 320, 67.25], 390 [0, 776.75, 390, 67.25], 430 [0, 864.75, 430, 67.25], 844×390 [0, 322.75, 844, 67.25]. It also stays put through four tab taps and back, per frame. Bottom padding is `calc(6px + env(safe-area-inset-bottom))`, with `viewport-fit=cover`.
- **Tab icons:** identical in every frame when switching tabs (e.g. the Inbox icon at 390 is [183.98, 789.75, 22, 22] idle and active). The pill animates only opacity and transform. With reduced motion it switches in one frame (3 frames per tap, no transition).
- **Last card reachable:** at max scroll, the last card clears the tab bar by at least 67.7px on every page, role and width. On Inbox with all 4 `details` opened, clearance is 68.2px.
- **No sideways scroll:** `scrollWidth` equals the viewport width on every page, both roles, at 320, 360, 390, 430, 844×390, 768 and 1440. `scrollTo(200, 0)` leaves `scrollX` at 0. The Inbox filter row scrolls inside itself at 320 (`scrollWidth` 390 in a 320 `clientWidth`) while the page stays 320. At 390 and 430 the row fits exactly.
- **More sheet:** opening and closing it doesn't move the page. The first card's rect is identical before, while open and after, scrollY is kept at both 0 and 400, and body overflow doesn't change. Its height fits the screen: 746 of 844 at 390, a 472px max at 320 (scrolls inside by 182–270px), 366 of 390 in landscape (scrolls inside by 208–296px). The mouse wheel over it scrolls the sheet, not the page. The layout-shift entries on open and close (0.026 and 0.021) come from the sheet itself, not page content. Escape closes it every time.
- **Toast without an action bar:** on Inbox at 390 it sits at 690.8–756, 20.8px above the tab bar. At 320 it is 414.8–480 against a tab bar at 500.75.
- **Decision bar text:** buttons are 52px tall and side by side at 390, 430 and landscape. The fade is 8px, so content passing under the bar is hidden behind solid background within 8px.
- **Rotation:** 390×844 → 844×390 → 390×844 restores the same geometry (header, band, tab bar, first card, decision bar, `scrollWidth`) and the same scroll position on all 13 page and role combinations.
- **Load shifts on other pages:** Review, Schedule, Team, Timecards and Payroll have CLS of 0.003 or less in portrait at 320, 360, 390 and 430; Timecards and Payroll's 0.001–0.003 is the section-tab move in ST-09. On the band, Home's summary changes from "Checking what needs you…" to "7 things need you today." at the same height (24px), so the band holds at 220px (390) and 256px (320).
- **Fonts:** Inter (100–900) is loaded. No layout-shift source was a font swap.

## Method

Scripts are in `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS/8c7acfe8-4195-49cb-a26a-ba2ac9ec5c59/scratchpad/phase7/stability/`. Pass-1 data is in `pass1/`.

- `sweep.mjs`: a buffered `layout-shift` observer from navigation to 3.5s, a per-frame record of header, band, tab bar and first-card geometry, pixel samples at the join, tab bar rect at three scroll points, and overflow.
- `loadstates.mjs`: per-frame heights of every card from placeholder to ready, repeated across runs.
- `tabs.mjs`: per-frame icon, label, pill and header colour across real tab taps, including reduced motion.
- `film.mjs`, `keyframes.mjs` and `sheet.mjs`: CDP screencast filmstrips.
- `review.mjs` and `toast.mjs`: decision bar at four scroll points, plus a local toast.
- `more.mjs` and `more-shift.mjs`: open and close the More sheet.
- `rotate.mjs`, `reach.mjs` and `matched.mjs`: rotation, last-card clearance, and CDP matched-rule lookup for causes.

CLS is reported with every layout-shift entry counted. Direct navigations involved no input, but Chrome flagged some of their entries `hadRecentInput`. Playwright limits apply: no real iPhone, no notch insets, no native rubber-band.

## Round 2

Re-inspected on October 18, 2026, 22:55–23:30, on the same preview, Manager `AUDIT-M` and Owner `QAOWNER`. I changed no data. The one toast was a local `nevora:toast` event in the page. New pages were added to every sweep: Home's Attendance, Team overview and Schedule activity views, and the "Already decided" page (`requestId=does-not-exist`). The build changed again at 23:12–23:13 (placeholder band heights, `portal-premium.css`), so everything that change could affect was measured again after it: placeholder bands, CLS at 320, 390 and landscape, rotation, toast, the More sheet and the decision bar. The numbers below are from after that change.

Screenshots for this round are in `shots/` (same folder as round 1): `R2-ST-a` to `R2-ST-g`, with filmstrips `film-R2*`. Data is in `pass2/`, `pass3a/` and the current `sweep-*.json`.

### Status of round-1 findings

| ID | Status | Measurement now | Cause if still open |
|---|---|---|---|
| ST-01 Home load CLS | **Fixed** (on screen) | CLS 0.001–0.003 at 320, 360, 390, 430 and landscape, both roles. Today's placeholder is now 212px, the real card's height. Next up's placeholder is 221px against the real 230px. Still 0.012 at 768. Content below the fold still moves (see ST-17). | – |
| ST-02 Inbox band grows | **Regressed** at 390 and above | At 320 and in landscape, CLS is 0.000 and the band is 332px from the first frame. At 390, CLS is 0.021 on 6 runs out of 6, both roles: the band goes from 308 to 332px and all content moves down 24px. The placeholder summary reserves 2 lines (48px), but the real summary now wraps to 3 lines (72px). | `src/app/app/portal-premium.css:214` narrows the summary to `calc(100% - 96px)`, so "3 shifts with no clock‑in, 3 coverage gaps and 1 request need you." takes 3 lines at 390. `portal-premium.css:493` reserves only `min-height: 3rem`. Fix: reserve `4.5rem` at every phone width, or clamp the summary to 2 lines. **Now P2** (a 24px push). |
| ST-03 Decision bar docking | **Fixed** | `position: fixed`, flush on the tab bar (gap 0.00px) at every scroll position: 390 bar 700–776 against tab bar 776; 320 424–500 against 500; 430 788–864 against 864. Content clears the bar by 32px at max scroll. | – |
| ST-04 Toast over decision bar / tab bar | **Partly fixed** | Portrait is fixed. At 390 the toast is 636–692 and the bar starts at 700. At 320 the toast is 352–416 and the bar starts at 424. On Inbox at 390 the toast is 700–764, 12px above the tab bar. Landscape still fails: at the bottom of the review the toast (440–820 × 254–310) covers Approve (428–820 × 238–290), and a tap at 75% across Approve hits the toast. | `portal-premium.css:480` sets the landscape toaster to `bottom: 80px`, but the decision buttons now sit in the page and end 20px above the tab bar. Fix: in landscape, `html body:has(.premium-review .nv-actionbar) .nevora-toaster { bottom: calc(68px + 76px + 8px) }`, or render the toast at the top. **P2.** Screenshot: `R2-ST-ef-review-land.png` (lower half). |
| ST-05 Placeholders without a band | **Partly fixed** | Every tab tap now shows a teal band from the first frame; the header and section tabs stay teal throughout (`R2-ST-a`, `R2-ST-b`, `R2-ST-c`, `R2-ST-d`). But the band heights are fixed numbers sized for 390, so the band still jumps when content arrives (placeholder → final): <br>**390:** Home, Schedule, Inbox, Team and Payroll match. Timecards 172 → 148 (−24). Time exports 220 → 148 (−72). <br>**320:** Home 220 → 280 (+60). Schedule 244 → 268, Inbox 308 → 332, Team 220 → 244, Payroll 152 → 176 (each +24). Time exports 220 → 172 (−48). <br>**Landscape 844×390:** Home, Team and Inbox −48. Schedule −72. Timecards −32. Payroll 152 → 96 (−56). Time exports −80. | `src/components/route-skeleton.tsx` sets `--route-band` to a fixed px value, read by `portal-premium.css:437` (`height: var(--route-band)`). The `loading.tsx` files pass 390 heights (`app/loading.tsx:5` 220, `schedule/loading.tsx:4` 244, `inbox/loading.tsx:4` 308, `employees/loading.tsx:4` 220, `timecards/loading.tsx:4` 172, `payroll/loading.tsx:4` 152). Time exports has no `loading.tsx`, so it gets Home's 220px band. Fix: drop the fixed height and lay out the placeholder band from the same parts in rem (eyebrow row 44px, title line, summary reserved at 2 or 3 lines, plus the overlap) so it follows the width and the landscape rules. Or set the height per breakpoint in CSS. Add `time-exports/loading.tsx` with a flat 148px band. **Still P1** (jumps of 24–80px). |
| ST-06 Landscape header flash | **Fixed** | Header is `rgb(28,74,71)` and 68px in every frame of every landscape tab tap (both roles, 8 taps). | – |
| ST-07 Stacked buttons at 320 | **Fixed** | Decline 16–154 and Approve 166–304 on one row, 52px tall; the bar is 76px tall. | – |
| ST-08 Landscape review chrome | **Fixed** | Header scrolls away (`position: static`) and the decision sits in the page. The first view shows 102px of the request card, including the Dates row (`R2-ST-e-review-land-first.png`). This fix causes the rotation regression in ST-15. | – |
| ST-09 Section tabs flip on load | **Fixed** | Timecards, Time exports and Payroll tabs are teal at y=68–112 from the first placeholder frame, with no colour fade (`R2-ST-d`). The legacy "View period" button flicker is still there; it is now filed on its own as ST-21. | – |
| ST-10 Half tab labels under the More sheet | **Not fixed** | The sheet is still inset: left 16, width 358, bottom 828 at 390. The tab labels still show cut in half beneath it (`R2-ST-g-more-bottom-390.png`). | The new rule at `portal-premium.css:464` (`bottom: 0; left: 0; right: 0`) is overridden by inline styles from `src/components/action-menu.tsx:51-55` (`width: 358px; left: 16px; bottom: 16px`). Fix: in the `--home-menu-sheet` branch, set `left: 0`, `bottom: 0` and `width: viewport.width`, or stop writing inline geometry when a CSS sheet is in force. **P2.** |
| ST-11 Landscape More is a dropdown | **Not fixed** | Still anchored at (514, 12), 318×366, with Close hidden (0×0). It does scroll inside itself (232–320px). | The sheet media query now includes landscape (`portal-motion.css:37-38`), but `--home-menu-sheet: 1` is only set inside `@media (max-width: 760px)` (`src/app/mobile-workforce.css:12` and `:94-96`). So `action-menu.tsx:50` takes the anchored path and writes inline top, left and width. Fix: set `--home-menu-sheet: 1` under the landscape coarse query too. **P2.** |
| ST-12 Dead space above the tab bar | **Fixed** | The last card clears the tab bar by 19.6–20.5px on every page (new views included), both roles, at 320, 390 and landscape. | – |
| ST-13 Tab bar precision | **Fixed** | The tab bar is exactly 68px everywhere (390 [0, 776, 390, 68], landscape [0, 322, 844, 68]). Active labels have the same width as idle (Home 37.23 in both states, weight 500). A transient remains, filed as ST-19. | – |
| ST-14 Landscape safe areas | **Fixed in code** | `env(safe-area-inset-left/right)` padding is on the header, band, content and tab bar (`portal-premium.css:481-484`). Can't be verified without a notched device. | – |

### New findings

| ID | Screen, role, width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| ST-15 | Every page, both roles, rotating 390×844 → 844×390 → 390×844 | Document scroll position | Rotating sends you back to the top. Scrolled to 300px, rotate: scrollY becomes 0 in landscape and stays 0 after rotating back. This happens on 13 of 15 page and role combinations (Review goes 74 → 0; the Decided page doesn't scroll). In round 1 the same test kept 300 → 300 → 300. No script calls `scrollTo` or `focus` (I wrapped them in my test page). | – (the numbers come from `rot-exp.mjs`) | The landscape `.mobile-header { position: static }` at `src/app/app/portal-premium.css:477`, added for ST-08. Proof: injecting `position: sticky` on the header in my own page (no app code touched) restores 300 → 300 → 300 on Schedule and Inbox. Making the root `overflow-x: clip` does not. | Keep the header sticky in landscape and move it off screen instead, e.g. `position: sticky; top: -68px`, then re-test rotation. Or save `scrollY` on `orientationchange`/`resize` and restore it. | P1 |
| ST-16 | Home → Attendance (`/app?view=attendance`), both roles. 390 CLS 0.016, 320 0.009, 768 0.012–0.023 | `details.panel` "What we compare", `.attendance-review-empty`, `.attendance-review-footer` | The same on 4 runs out of 4. After about 0.5s the panel moves from 444 to 476 (+32px) and the empty state from 508 to 540 (+32px). The corrections section goes 711 → 727. Before the 23:13 build it was worse: CLS 0.058–0.084, with the empty state moving +135px. | `shots/manager-390-attendance-top.png` | `src/components/configured-attendance-policies.tsx:15-17` and `:93`, and `src/components/manager-attendance-review.tsx:115-130`: the summary row (`ready ? … : null`) and the policies panel only take their final size once their data arrives. | Render the summary row with "—" placeholders while loading, so its 3 figures hold their height. Give the policies `details` its final summary height from the first render. | P2 |
| ST-17 | Home, both roles, 390 and 430 portrait (below the fold), and 768 (CLS 0.012) | "Also needs you" placeholder, `#home-week`, `#home-planning` | The "Also needs you" placeholder is 254px; the real card is 515px (+261). Next up is 221 → 230 (+9) and Planning 76 → 96 (+20). So "This week" is pushed from 951 to 1221 (+270px) about 0.3–0.5s after paint. It's off screen at 320–430, so CLS stays at 0.003 or less, but anyone who scrolls in the first second, and the 768 layout, sees it. | `R2-ST-a-home390-inbox320.png` (405ms vs 517ms) | `src/components/premium-home.tsx:216-228` (`PendingCard`: 3 short placeholder rows) against `:199-210` (real rows with a status pill and a two-line detail, about 150px each). | Size the placeholder rows like the real ones: `min-height: 150px` per row at 390, or reserve `min-height: 515px` for the card when the count is known from the server. | P2 |
| ST-18 | Every page, both roles, every phone width and landscape (120 of 150 loads) | "Workforce" under the wordmark (`.login-brand-module`) | When the page replaces the placeholder, "Workforce" moves up 1–1.5px (y=38.5 → 37), its box grows from 15 to 16px tall and its letter spacing changes. That is a visible twitch in the header on every navigation. | – (layout-shift sources in `sweep-*.json`) | `src/app/app/portal-premium.css:378` (TC-15) sets the 13px size only under `:has([data-nv-band])`. The placeholder has no `[data-nv-band]`, so it uses the older size. | Key the rule on the shell instead, e.g. `[data-mobile-workforce="true"] .mobile-header .login-brand-module`, so the subtitle has one size from the first frame. | P2 |
| ST-19 | Tab bar, both roles, 390 and landscape, when Team opens | `.mobile-nav-link span` | For about 176ms after the Team page mounts, all five tab labels narrow by 0.25–0.89px (Home 37.23 → 36.98, Team 34.69 → 33.80), then snap back. Icons don't move. It is sub-pixel, so this is a judgment call. I couldn't reproduce it on settled pages, where the computed styles are identical. | – (from `tabs-390.json`, frames at 600 and 776ms) | Not isolated. It looks like a stylesheet chunk loading for the Team route that briefly overrides the 0.13px label letter spacing (`portal-premium.css:41`). | Pin the label: `letter-spacing: .01em` on the `.mobile-nav-link span` selector at the same specificity as `portal-premium.css:41`, and check what Team's route CSS touches. | P2 |
| ST-20 | All pages, landscape 844×390 | `html`, `body` | The "no bounce past the page's end" rule (`overflow-x: clip; overscroll-behavior: none`) only applies up to 760px wide. Measured in landscape: `html` and `body` have `overscroll-behavior-y: auto` and `overflow: visible`. Pulling past the top can therefore show the #FAFAFA page background above the teal header. Not verifiable without a device. | – | `src/app/app/portal-gusto.css:265` is inside `@media (max-width: 760px)` (`portal-gusto.css:221`). | Add the landscape coarse query, `(max-width: 900px) and (max-height: 430px) and (orientation: landscape) and (pointer: coarse)`, to that rule, or give it its own block. | P2 |
| ST-21 | Timecards, both roles, 390 | "View period" button (legacy toolbar) | While loading, the button goes teal, then pale disabled, then teal again (frames at 378, 448 and 493ms) as the timecard check runs. The control blinks once on every visit. | `R2-ST-d-timecards-payroll.png` (first three frames) | The Timecards client disables the button during its "Checking period timecards…" phase after first rendering it enabled. | Render it disabled until the first check finishes, or keep it enabled and show the check in the status line only. | P2 |

### Re-checked and correct in round 2

- **Header and band join:** every pixel sample is teal (#1C4A47; the watermark and the active underline are excluded as before) on every page, including the new ones, at 320, 360, 390, 430 and landscape, both roles. The header colour never changes in any load or tab-tap frame.
- **Tab bar:** fixed and integer: 320 [0, 500, 320, 68], 360 [0, 672, 360, 68], 390 [0, 776, 390, 68], 430 [0, 864, 430, 68], landscape [0, 322, 844, 68]. Identical at scrollY 0, the middle and the bottom on every page. Icons are pixel-identical across all tab switches.
- **No sideways scroll:** `scrollWidth` equals the viewport width on every page, including Team, Schedule, Timecards, Payroll, the three Home views and Decided, at 320, 360, 390, 430, landscape, 768 and 1440. `scrollX` stays 0.
- **CLS:** 0.000 at every width on Inbox (except ST-02 at 390), Review, Team, Schedule, Timecards, Payroll, Team overview, Schedule activity and Decided.
- **More sheet:** opening it doesn't move the page (first card rect identical before, open and after; scrollY kept at 0 and 400). It scrolls inside itself at 320 (186–274px) and in landscape. Escape closes it.
- **Rotation:** geometry is restored exactly (header, band, tab bar, first card, decision bar). Only the scroll position is lost (ST-15).

Not re-run this round: the reduced-motion pass on the tab-bar pill. Its CSS hasn't changed since round 1, where the pill switched in one frame with no transition.

### Open defects

**Not zero.** 12 defects are open:
- **2 P1:** ST-05 (partly fixed) and ST-15 (new).
- **10 P2:** ST-02 (regressed at 390), ST-04 (partly fixed), ST-10, ST-11, ST-16, ST-17, ST-18, ST-19, ST-20 and ST-21.

I don't disagree with anything on the "deliberately not changed" list. None of it is in my area, apart from the section-tab placement (WR-25). On that one, the section tabs now hold steady during loading (ST-09 is fixed).

## Round 3

Re-inspected between 23:49 on October 18 and 00:20 on October 19 (latest source edit before the runs: 23:44). Same preview, both roles, read only; the one toast was a local `nevora:toast` event in the page. Every page in the brief and the four round-2 additions (Attendance, Team overview, Schedule activity, Decided) were swept at 320, 360, 390, 430 and 844×390. I also re-ran:
- the placeholder band check per route and width
- tab taps
- the decision bar
- the toast
- the More sheet
- rotation
- last-card clearance
- a Timecards filmstrip

The fictional data rolled over to October 19 during the run. That changes dates in the copy, but no measurement depends on it. Screenshots are in `shots/R3-*`.

### Status of open round-2 items

| ID | Status | Measurement now |
|---|---|---|
| ST-02 Inbox band grows (390) | **Fixed** | CLS 0.000 on 4 of 4 runs at 390, both roles, and 0.000 at every other width. The placeholder band and the final band are both 68–376 at 390 and 68–400 at 320. |
| ST-04 Toast over Approve (landscape) | **Fixed** | In landscape the toast now sits at the top (440–820 × 76–132). Approve (238–290) is hit-tested as Approve. Portrait: 390 toast at 636–692 above a bar starting at 700; 320 toast at 360–416 above 424; Inbox at 390 toast at 708–764, 12px above the tab bar. |
| ST-05 Placeholder band height | **Fixed** | The placeholder band equals the final band on every route at every width: <br>**390:** Home 220, Schedule 244, Inbox 308, Team 220, Timecards 148, Time exports 128, Payroll 152. <br>**320:** Home 256, Schedule 244, Inbox 332, Team 244, Timecards 148, Time exports 152, Payroll 152. <br>**Landscape:** Home, Schedule and Team 172, Inbox 260, Timecards 140, Time exports 96, Payroll 96. <br>Time exports now has its own placeholder. One observation I couldn't repeat: in a single Manager run at 320, the Team placeholder showed 256 for a frame before 244. The Owner run didn't, so I haven't filed it. |
| ST-10 Tab labels under the More sheet | **Fixed** | The sheet runs edge to edge: 390 [0, 189, 390, 655] ending at y=844; 320 [0, 96, 320, 472] ending at y=568. No tab labels show beneath it (`R3-ST-more-390.png`). |
| ST-11 Landscape More dropdown | **Fixed** | Landscape now opens a bottom sheet with a handle and the page dimmed behind it: [142, 24, 560, 366], ending at the bottom edge, scrolling inside itself (232–320px) (`R3-ST-more-land.png`). "Close" is not shown in landscape (0×0). Escape closes it, and I didn't test tapping the dimmed area. I'm not filing the missing Close; it's a judgment call. |
| ST-15 Rotation resets scroll | **Fixed** | 390×844 → 844×390 → 390×844 keeps scroll on every page: 300 → 300 → 300 on 17 pages, 98 → 98 → 98 on Review, and 0 on the 2 Decided pages, which don't scroll. Geometry is restored on all 21. |
| ST-16 Attendance load shift | **Partly fixed** | 390 CLS 0.001 (4 of 4 runs), 430 0.003, landscape 0.000. **Still 0.017 at 320 and 0.021 at 360, both roles.** At 320 the "all clear" message and the footer move down 48px (y=432 → 480). At 360 the footer moves 18px and the "What we compare" panel 42px. Cause: `src/app/app/portal-premium.css:726` holds the review header at `min-height: 6.25rem` (100px), but at 320–360 the loaded header wraps taller. Fix: `min-height: 9.25rem` at 360px and below, or render the 3-figure summary row with "—" placeholders while loading. **P2.** |
| ST-17 Home "Also needs you" placeholder | **Partly fixed** | The placeholder is now 446px against the real 515px (+69). "This week" is pushed from 1143 to 1221 (+78px) about 0.4s after paint. It's below the fold at every phone width (CLS 0.0008), so only someone who scrolls straight away sees it. Cause: `portal-premium.css:649` sets placeholder rows to `min-height: 128px`; the real rows average about 150px. Fix: `min-height: 150px`. **P2.** |
| ST-18 "Workforce" subtitle twitch | **Fixed** | No `.login-brand-module` layout-shift source on any of the 145 loads. The rule now applies without the band condition (`portal-premium.css:380`). |
| ST-19 Tab labels narrow when Team opens | **Not fixed** | Still there in both roles, at 390 and in landscape. For one frame (366ms Manager, 513ms Owner) all five labels are 0.25–0.89px narrower: Home 37.23 → 36.98, Team 34.69 → 33.80. Icons don't move. It is sub-pixel, so a judgment call; the cause isn't isolated (see round 2). **P2.** |
| ST-20 Landscape bounce | **Fixed** | In landscape, `html` and `body` now have `overscroll-behavior: none` and `overflow-x: clip` (`portal-premium.css:643-644`). |
| ST-21 Timecards "View period" blink | **Fixed** | The button now starts disabled (359ms) and fades once to enabled (432 → 476ms). There is no enabled → disabled → enabled blink (`R3-ST-21-timecards-button.png`). For about 50ms mid-fade, the white label on the pale fill reads poorly. That is a contrast note, not a stability defect. |

### New sweep, round 3

No new stability defects.

- **CLS:** 0.000–0.003 on every page and width except Attendance at 320 and 360 (ST-16).
- **Header and band join:** teal at every sample. At 320, Team overview and Schedule activity have a light pixel 10px into the band in the middle column; that is band text, not a seam.
- **Header colour:** never changes in any load or tab-tap frame, portrait or landscape.
- **Tab bar:** 68px and fixed at every scroll position. Icons are pixel-identical across tab taps (apart from the ST-19 label frame).
- **Sideways scroll:** none; `scrollWidth` equals the viewport width everywhere.
- **Bottom clearance:** the last card clears the tab bar by 19.8–20.5px on every page at 320, 390 and landscape. The larger numbers (92–314px) are short pages and the review, where content ends above the decision bar.
- **Decision bar:** flush with the tab bar (gap 0.00px) at every scroll position at 320, 390 and 430, two buttons side by side. In landscape it sits in the page, 20px above the tab bar at max scroll.

Not re-run this round: 768 and 1440, which passed in round 2, and the reduced-motion pass on the tab pill, whose CSS is unchanged.

### Verdict

**Not zero:** 3 P2s remain open (ST-16 at 320 and 360, ST-17 below the fold, and ST-19, which is sub-pixel). There are no P0 or P1 defects in bars and stability.

## Round 4

Re-inspected October 19, 00:12–00:45, on the same preview, both roles, read only. The one toast was a local `nevora:toast` event in the page. Every page in the brief and the four later additions were swept at 320, 360, 390, 430, 844×390, 768 and 1440. I also re-ran:
- the Attendance and Home load traces
- the placeholder band check (390, 320, landscape)
- tab taps, the decision bar and the toast
- the More sheet, rotation and last-card clearance

### Status of open round-3 items

| ID | Status | Measurement now |
|---|---|---|
| ST-16 Attendance load shift | **Fixed at 320 and 360; regressed at 390** | 320 CLS 0.000 (4 of 4 runs) and 360 0.000–0.003, with the header held at 148px (`portal-premium.css:804`). **But at 390 CLS is now 0.015–0.017** (both roles, 6 of 6 runs; it was 0.001 in round 3). The "Nothing to review" message moves from 432 to 460 (+28px), the corrections section from 724 to 749, and the "What we compare" panel from 655 to 685. Cause: the summary copy changed at 00:06 to "0 people affected" (`src/components/manager-attendance-review.tsx:124`). At 390 the summary now wraps to 2 lines (48px), so the loaded header is 128px, while `portal-premium.css:726` holds only `min-height: 6.25rem` (100px). At 430 the summary fits on one line (header 100px) and is fine. Fix: hold `min-height: 8rem` between 361 and 429px. The robust fix is to render the summary row while loading with "—" in place of each figure, so its real wrapped height is there from the first frame whatever the copy says. **P2.** |
| ST-17 Home "Also needs you" placeholder | **Fixed** | The placeholder is 512px against the real 515px, so "This week" moves 1209 → 1221 (+12px), below the fold. CLS 0.0009 at 390 on 4 of 4 runs and 0.000–0.002 at every width. |

### Items kept by judgment (ROUND-2.md)

- **ST-19:** I agree. It is one frame, under a pixel, and the icons never move. Re-measured: still there, unchanged (Home label 37.23 → 36.98 for one frame when Team opens, in both roles).
- **ST-11:** I agree. Landscape More is a bottom sheet with a handle and a dimmed page (`[142, 24, 560, 366]`), and Escape closes it. I didn't test tap-outside or swipe myself; ROUND-2.md says both work.

### Sweep, round 4

No new stability defects. The only open item is ST-16 at 390.

- **CLS:** 0.000–0.003 on every page, role and width, apart from ST-16 at 390.
- **768 and 1440:** Home is 0.000, and Attendance 0.001.
- **No sideways scroll anywhere,** including 768 and 1440.
- **Header colour:** constant in every load and tab-tap frame on phones. The header and band join is teal in every sample.
- **Tab bar:** 68px, fixed, the same at every scroll position, with icons unchanged across tab taps.
- **Placeholder bands:** equal to the final band on every route at 390, 320 and landscape (same values as round 3).
- **Decision bar:** flush on the tab bar (gap 0.00px) at every scroll position at 320, 390 and 430, with the buttons side by side. In landscape it sits in the page, 20px above the tab bar at the bottom.
- **Toasts:**
  - Portrait review: above the decision bar (390: 636–692, bar from 700).
  - Inbox: 12px above the tab bar.
  - Landscape: at the top (76–132).
- **More sheet:** edge to edge (390: bottom at 844; 320: bottom at 568), scrolls inside itself, and doesn't move the page.
- **Rotation:** keeps scroll (17 pages 300 → 300 → 300, Review 98 → 98 → 98) and restores geometry on all 21 combinations.
- **Bottom clearance:** the last card clears the tab bar by 19.6–20.5px.

The fictional data rolled over to Monday, October 19 overnight (e.g. "20 things need you today."). I changed no data; the copy simply reflects the new day.

### Verdict

**Not zero:** one P2 remains open, ST-16 at 390, a 28px shift on the Attendance view caused by the new "people affected" wrap.

## Round 5

Re-inspected October 19, 00:34–00:50, on the same preview, both roles, read only. The one toast was a local `nevora:toast` event in the page. I swept every page in the brief and the four later additions at 320, 360, 390, 430, 844×390, 768 and 1440. The source changed during the run (`portal-premium.css` at 00:44 and 00:45:46), so I re-ran the Attendance checks after the last edit. The numbers below are from after it.

### Status

| ID | Status | Measurement now |
|---|---|---|
| ST-16 Attendance load shift | **Partly fixed: the header is fixed, the footer now shifts (worst at 768)** | **Header:** the summary row now shows "–" while loading, so the header holds the same height loading and ready at every width: 148px at 320 and 360, 128px at 390, 100px at 430, landscape, 768 and 1440. <br>**CLS:** 0.000 at 320, 0.003 at 360, 0.001–0.002 at 390, 0.003–0.005 at 430, 0.000 in landscape, 0.002 at 1440. <br>**But at 768, CLS is 0.047 (Manager) and 0.019 (Owner)** on 3 of 3 runs. The Attendance footer is 105px while loading and 57px when ready (−48), so the "What we compare" panel and the refresh button move up 48px (638 → 590). At 320 and 360 the same footer goes the other way, 105 → 125 (+20). That is below the fold at 320 (CLS 0.000) and gives 0.003 at 360. **Cause:** `src/components/manager-attendance-review.tsx:200-207`. While loading, the footer shows a different sentence ("Clock records only. Lateness and overtime rules aren't applied here.") from the ready one ("Updated … / Updates every 30s while this page is active."), and the two wrap to different heights next to the Refresh button. **Fix:** do what was done for the summary: render the ready footer while loading, with "Updated –" and the same second line, so its height doesn't depend on the data. **P2.** |

### New observation

| ID | Screen, role, width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| ST-22 | Team tab tap from Inbox, Manager, 320 (1 of 6 runs; also seen once in round 3) | Placeholder band | For one frame (about 17ms), Home's placeholder ("Loading your workspace…", band 256px) shows before Team's own (band 244px). The band shrinks 12px, then the page arrives at 244px. This is a judgment call: it is a single frame and seen in only 1 of 6 runs. | – (from `teamtap.mjs`) | Next.js briefly renders the parent segment's `src/app/app/loading.tsx` before `src/app/app/employees/loading.tsx`. | Give `app/loading.tsx` a neutral band, or no band height of its own, so a one-frame parent placeholder doesn't show Home's height. Or accept it. | P2 |

### Sweep, round 5

No other stability defects.

- **CLS:** 0.000–0.002 on every other page, role and width, including 768 and 1440.
- **No sideways scroll** at any width.
- **Header and band join:** teal in every sample.
- **Header colour:** constant in every load and tab-tap frame on phones.
- **Tab bar:** 68px and fixed at every scroll position, with icons unchanged across tab taps. ST-19's one-frame label narrowing on Team is still there, as accepted.
- **Placeholder bands:** equal to the final band on every route at 390, 320 and landscape (apart from the ST-22 frame).
- **Decision bar:** flush on the tab bar (gap 0.00px) at every scroll position at 320, 390 and 430; in landscape it sits in the page, 20px above the tab bar.
- **Toasts:** above the decision bar or tab bar in portrait, and at the top in landscape.
- **More sheet:** edge to edge, scrolls inside itself, doesn't move the page.
- **Rotation:** keeps scroll (300 → 300 → 300 on 17 pages, 98 → 98 → 98 on Review) and restores geometry on all 21 page and role combinations.
- **Bottom clearance:** the last card clears the tab bar by 19.6–20.5px.

### Verdict

**Not zero:** two P2s are open. ST-16's footer shift at 768 (CLS up to 0.047) is the only measured defect. ST-22 is a one-frame judgment call.

## Round 6

Re-inspected October 19, 01:05–01:45, on the same preview, both roles, read only. The one toast was a local `nevora:toast` event in the page. I swept every page in the brief and the four later additions at 320, 360, 390, 430, 844×390, 768 and 1440. I also re-ran:
- the Attendance trace at all 7 widths, plus 16 load runs at 320, 360, 390 and 768
- Team taps (6 runs at each of 320, 390 and landscape)
- Home → More → Timecards (8 runs each at 390 and landscape)
- the placeholder bands, tab taps and the decision bar
- the toast, the More sheet, rotation and bottom clearance

### Status

| ID | Status | Measurement now |
|---|---|---|
| ST-16 Attendance load shift | **Fixed** | Every Attendance block now has the same top and height loading and ready, at every width. Footer: 125px at 320 and 360, 105px at 390 and 430, 57px in landscape, 768 and 1440. The "Nothing to review" message is 74px in both states. The only change is the corrections card, which shrinks 8px at 320 (274 → 266). It is the last block and below the fold, so nothing moves because of it. CLS on 16 of 16 load runs: 320 0.000, 360 0.000–0.0001, 390 0.0009, 768 0.0001–0.003. In the sweep, Attendance is 0.000–0.003 at every width for both roles. |
| ST-22 Home placeholder frame before Team's | **Fixed** | 18 of 18 Team taps show only "Loading employees…", with the band at 68–312 (320), 68–288 (390) or 68–240 (landscape), then the page at the same height. No "Loading your workspace…" frame appeared. One related frame I couldn't repeat: in one Owner landscape run of the band check, going Home → More → Timecards showed a 172px band without section tabs (Home's shape) for a frame before Timecards' own (tabs 68–112, band 112–252). Sixteen dedicated Home → Timecards runs at 390 and landscape, plus two more band-check runs, showed no such frame (1 in 19), so I haven't filed it. If it comes back, the likely cause is `src/app/app/root-loading.tsx` reading the pathname before it updates. |

### Changes to watch (from the coordinator's note)

- **Fields fixed at 48px with 17/16px text:** Team (search and filters), Timecards (date fields) and Payroll load with CLS 0.000 at every width for both roles. No field-related layout-shift sources.
- **Bell's "—" hidden for Manager and Owner:** the header never changes height or colour in any load or tab-tap frame. The tab bar stays [0, 776, 390, 68] at 390.
- **Attendance footer without a shadow:** no geometry change. The footer heights above are identical loading and ready.

### Sweep, round 6

No open stability defects.

- **CLS:** 0.000–0.003 on every page, role and width (Home 0.000–0.002, Attendance 0.000–0.003, everything else 0.000). One Owner Decided run at 390 threw a script error because the page hadn't rendered yet; a rerun measured 0.000.
- **No sideways scroll** at any width.
- **Header and band join:** teal in every sample.
- **Header colour:** constant on phones.
- **Tab bar:** 68px and fixed at every scroll position; icons unchanged across tab taps. ST-19's accepted one-frame label narrowing is still there.
- **Placeholder bands:** equal to the final band on every route at 390, 320 and landscape.
- **Decision bar:** flush on the tab bar (gap 0.00px) at every scroll position at 320, 390 and 430; in the page, 20px above the tab bar, in landscape.
- **Toasts:** above the decision bar or tab bar in portrait, and at the top in landscape.
- **More sheet:** edge to edge in portrait, a bottom sheet in landscape; it scrolls inside itself and doesn't move the page.
- **Rotation:** keeps scroll (300 → 300 → 300 on 17 pages, 98 → 98 → 98 on Review) and restores geometry on all 21 combinations.
- **Bottom clearance:** the last card clears the tab bar by 19.6–20.5px.

### Verdict

**Zero open defects in bars and stability.** ST-19 and ST-11 stay as accepted judgment calls, and the one unrepeated Timecards placeholder frame is noted above but not filed.

## Round 7

A regression check on what changed since round 6, run October 19, 01:31–02:05, both roles, read only. I simulated Attendance's failed and no-access states in my own browser by answering the read `GET /api/manager/attendance` with 500 or 403, so nothing reached the server. Offline used the browser's offline switch. I swept every page in the brief and the four later additions at 320, 360, 390, 430, 844×390, 768 and 1440.

### Status

| Item | Status | Measurement |
|---|---|---|
| Attendance footer, loading → ready | **Correct** | Constant at all 7 widths. Header, message, footer, panel and corrections keep the same top and height from loading to ready: footer 125px at 320 and 360, 105px at 390 and 430, 57px in landscape, 768 and 1440. The only change is the corrections card at 320, the last block and below the fold, which shrinks 8px (274 → 266) as before. CLS 0.000–0.003 at every width in the sweep. |
| Attendance footer, failed / no access / offline | **Height changes at 320 and 360 (new P2, ST-23)** | Correct at 390, 430, landscape, 768 and 1440: all four states have identical geometry. At 320 and 360, the "Couldn't update. Try Refresh.", "No access. Sign in again to continue." and "Paused. Return to this page to update." footers are **105px against 125px when ready (−20)**. Going offline on an open page therefore moves "What we compare" and the corrections card up 20px (703 → 683, 795 → 775). In the failed state at 320, the message grows 74 → 94px (+20), pushing the footer down 20px. |
| Day buttons (Schedule) | **Correct** | Schedule CLS 0.000 at every width and both roles in the sweep. With text enlarged in my own test page: 125% is 0.0008 (390) and 0.0019–0.0066 (320); 150% is 0.0001–0.0018 (390) and 0.0045 (320), all below 0.01. |
| Home stats at 320 (TC-01) | **Correct at 100%. Shifts at 125% and 150% (new P2, ST-24)** | **320 at 100%:** CLS 0.0019 on 4 of 4 runs. The Today placeholder and card are both 212px. **125%:** the Today placeholder is 236px but the loaded card is 287px (+51), so everything below moves 51px. CLS 0.024–0.025 for both roles. **150%:** the placeholder is 260px and the card 347px (+87). CLS 0.022–0.027 on 2 of 4 runs, and 0.000 on one Owner run. Two runs reached 0.20, but that spike came from my test style being applied late, so I'm not counting it. |
| Team placeholder | **Correct** | 6 of 6 Team taps at 390 show only "Loading team…", with the band at the final height. |
| `src/app/error.tsx`, `global-error.tsx` | **Not exercised** | I can't trigger a server error from the browser without changing the app, so I read the code only. `error.tsx` renders `AppErrorScreen` above the portal boundary, so there is no tab bar or band to check against. |

### New findings

| ID | Screen, role, width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| ST-23 | Attendance (`/app?view=attendance`), both roles, 320 and 360 | `.attendance-review-footer` | The footer is 125px when ready and 105px in the "Couldn't update.", "No access." and "Paused." states (−20). Going offline on an open page moves "What we compare" and the corrections card up 20px. At 320 the failed state also grows the message block from 74 to 94px. All four states are identical at 390 and wider. | – (from `attstates.mjs`) | `src/components/manager-attendance-review.tsx:203-210`. The second line differs by state ("Updates every 30s while this page is active." against "Try Refresh." or "Return to this page to update."), and at 320–360 the ready sentence wraps to one more line beside the Refresh button. | Give the footer text column `min-height` for the ready layout at 360px and below (that column is 125px tall when ready), or keep the second line the same length in every state. At 320, give `.attendance-review-empty` a `min-height` of 94px. | P2 |
| ST-24 | Home, both roles, 320 at 125% and 150% text | Today card placeholder | At larger text the loaded Today card switches to one column (TC-01), but its placeholder stays in three columns. **125%:** 236 → 287px (+51); **150%:** 260 → 347px (+87). Everything below moves by that much. CLS 0.022–0.027. | – (from `loadstates.mjs` with `FONT=125%` and `150%`) | `src/components/premium-home.tsx:124` wraps the placeholder's `StatGrid` in `<div className="premium-skeleton-values">`. The container query only applies to `.nv-card:has(> .nv-stats)` (`src/components/kit/kit.css:278-279`), and that `>` needs `.nv-stats` to be a direct child of the card, which the wrapper prevents. | Use `.nv-card:has(.nv-stats)` at `kit.css:278`, or drop the wrapper and put `premium-skeleton-values` on the `StatGrid` itself, so the placeholder goes to one column too. | P2 |

### Sweep, round 7

No other stability defects.

- **CLS:** 0.000–0.003 on every page, role and width. One Manager Team overview run at 430 hit a script error because the page hadn't rendered; a rerun measured 0.000.
- **No sideways scroll** at any width.
- **Header and band join:** teal in every sample.
- **Tab bar:** 68px and fixed at every scroll position.
- **Rotation:** keeps scroll (300 → 300 → 300 on 17 pages, 98 → 98 → 98 on Review) and restores geometry on all 21 combinations.

### Verdict

**Not zero:** two new P2s are open. ST-23 is the Attendance footer losing 20px in the failed, no-access and offline states at 320 and 360. ST-24 is the Home Today placeholder staying in three columns at 125% and 150% text on 320.

## Round 8

Re-checked October 19, 02:00–02:40, both roles, read only. I simulated Attendance's failed and no-access states in my own browser by answering `GET /api/manager/attendance` with 500 or 403. Offline used the browser's offline switch. For a window in the background I set `document.visibilityState` to hidden in my page; nothing reached the server. I swept every page in the brief and the four later additions at 320, 360, 390, 430, 844×390, 768 and 1440.

The dev server was recompiling while the run started, so 8 of 203 sweep cells and the first rotation run failed in my script before their page rendered. I re-ran each of those on its own; the numbers below include the reruns.

### Status

| ID | Status | Measurement now |
|---|---|---|
| ST-23 Attendance footer by state | **Fixed** | I compared ready, failed, no access, offline and window-in-background (the new "Paused. Updates when you're back.") at all 7 widths. The header, "Nothing to review" message (74px), footer and "What we compare" panel are identical in every state: footer 105px at 320, 360, 390 and 430, and 57px in landscape, 768 and 1440. The only difference is the last card (corrections) growing when offline: +30px at 320 and +20px at 360. It also grew 8px in one of two background-window runs at 320. Nothing sits below that card. Loading → ready is also constant at all 7 widths. |
| ST-24 Home Today placeholder at large text | **Fixed** | The Today placeholder and the loaded card are the same height in every run: 320 at 100% 212px, 125% 287px, 150% 347px; 360 at 150% 313px; 390 at 150% 313px. CLS on 3 runs per role: 320 at 100% 0.0000; 125% 0.0021–0.0023; 150% 0.0049; 360 at 150% 0.0028–0.0029; 390 at 150% 0.0000–0.0021. One Owner run at 360 and 150% read 0.316. In that run my test style that enlarges the text landed after first paint (the trace shows a 100%-size Today card first), so it isn't a page defect. |

### Other changes since round 7

- **"Full week" at 4.5rem:** Schedule CLS 0.000 at every width for both roles.
- **Offline vs background in the Attendance footer (IS-47):** both read differently ("Offline. Updates when you reconnect." and "Paused. Updates when you're back."), and both keep the footer at the same height as ready.
- **Branded error screen:** not exercised, because I can't trigger a server error from the browser without changing the app. It renders above the portal, so there is no band or tab bar to check against.

### Sweep, round 8

No stability defects.

- **CLS:** 0.000–0.005 on all 203 page, role and width cells, and nothing scrolls sideways.
- **Header and band join:** teal in every sample.
- **Tab bar:** 68px and fixed at every scroll position.
- **Rotation (re-run):** keeps scroll (300 → 300 → 300 on 17 pages, 98 → 98 → 98 on Review) and restores geometry on all 21 combinations.

### Verdict

**Zero open defects in bars and stability.** ST-19 and ST-11 stay as accepted judgment calls.

## Round 9

A regression check run October 19, 02:32–03:05, both roles, read only. I simulated the Attendance states (failed, no access, offline, window in the background) and the failed reads below in my own browser: it answered the read requests itself (`GET /api/manager/attendance`, `POST /api/manager/action-center`) with an error after a delay, so nothing reached the server. I swept every page in the brief and the four later additions at 320, 360, 390, 430, 844×390, 768 and 1440.

The dev server was slow during the first sweep, and 9 of 203 cells failed in my script before their page rendered. I re-ran each of those on its own, one at a time, and all read CLS 0.000.

### Status of the listed changes

| Item | Status | Measurement |
|---|---|---|
| Attendance footer, one-line states | **Correct** | At all 7 widths, ready, failed, no access, offline and window in the background have identical header, message (74px), footer and "What we compare" panel. The footer is 105px at 320, 360, 390 and 430, and 57px in landscape, 768 and 1440. The one-line states ("No access.", "Offline.", "Paused.") hold the two-line height. The only difference is the last card (corrections): +30px offline and +8px in the background at 320, and +20px offline at 360. Nothing sits below it. |
| Strip widths phone-only; desktop "Full week" | **Correct** | "Full week" is 72×64px at 390 and 92×61px at 768 and 1440. Schedule CLS 0.000 at every width for both roles. |
| `app/app/error.tsx` and Home's dashboard-read failure (`app/app/page.tsx`) | **Not reachable read-only** | Both fail on the server, which my browser can't make happen without changing the app. I tried two client-side routes: a malformed or 500 page payload on a Schedule tap (Next.js reloads the page or ignores it), and a malformed Today read (rejected by its parser). Neither reached the error page. From the code, `error.tsx` renders a `data-nv-page` kit page with a `PageBand` inside the page frame, and the legacy `.portal-route-state` is hidden for Manager and Owner (`portal-premium.css:895`). So it gets the same teal header, band and fixed 68px tab bar rules as every other band page, but I haven't measured it. |

### New findings (failure paths, found through the slow-server runs)

In the slow first sweep, three Inbox cells read CLS 0.007–0.012, with the source "The Inbox isn't available right now." The read had timed out after about 12s. I then reproduced the failed read on purpose, as described above, on Inbox and on Home.

| ID | Screen, role, width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| ST-25 | Home (`/app`), both roles, when the "what needs you" read fails. CLS: 320 0.029, 390 0.555, 430 0.008 (Manager) and 0.511 (Owner) | Band summary, the Needs-you placeholders, every card below | Two moves happen together about 1.5s after paint. **First**, the band summary changes from "Checking what needs you…" (1 line, 24px) to "Some of today's numbers aren't available." (2 lines, 48px), so the band grows 220 → 244 at 390 (256 → 280 at 320) and every card moves down 24px. **Second**, the Next up placeholder (221px) and the "Also needs you" placeholder (512px) are replaced by a single "Needs you" card, 154px at 390 and 174px at 320. That moves "This week" up 571px (1209 → 638) and removes the Planning card. | `shots/R9-home-actions-failed-390.png`, `shots/R9-home-actions-failed-320.png` | `src/components/premium-home.tsx:96` (the longer failure sentence), with no minimum height reserved on Home's summary. `premium-home.tsx:217` onward (`PendingCard`): the failure card is much shorter than the two loading placeholders. | Reserve 2 summary lines on Home, like Inbox does (`.premium-home .nv-masthead__summary { min-height: 3rem }`), or shorten the failure sentence to one line at 320–430. Keep the failed Needs-you state as tall as the placeholders: put the message and Try again inside a Next-up-shaped card and keep a reserved card for the rows. | P1 |
| ST-26 | Inbox (all filters), both roles, when the Inbox read fails. CLS: 320 0.0107, 390 0.0051, 430 0.000–0.0043 | `.inbox-status p` ("The Inbox isn't available right now.") | While loading, the status line sits under three placeholder rows (y=542 at 320). On failure the rows are removed: the line jumps up 186px to y=356 and the card shrinks 266 → 132px. Nothing outside the card moves; this crosses the 0.01 threshold only at 320. | – (from `inboxfail.mjs` and `inboxp.mjs`) | `src/components/manager-inbox.tsx:163-167`: the status `<p>` comes after the placeholder rows. | Put the status line first in the card body (above the placeholder rows) so it never moves, or keep the card body at its 266px loading height in the failed state. | P2 |

### Sweep, round 9

Apart from ST-25 and ST-26, no stability defects. With the reruns:

- **CLS:** 0.000–0.003 on all 203 cells.
- **No sideways scroll** at any width.
- **Header and band join:** teal in every sample.
- **Tab bar:** 68px and fixed at every scroll position.

### Verdict

**Not zero:** two new findings on failure paths are open, ST-25 (P1, Home when its read fails) and ST-26 (P2, Inbox's status line). All the round-9 changes measured correct.

## Round 10

Re-checked October 19, 03:17–04:05, both roles, read only. I simulated failed reads in my own browser: it answered `POST /api/manager/action-center`, `GET /api/manager/today` and the other `/api/manager/*` reads itself (500, 403, or a dropped connection) after 1.5s, and offline used the browser's offline switch. Nothing reached the server. I swept every page in the brief and the four later additions at 320, 360, 390, 430, 844×390, 768 and 1440.

The first sweep run crashed at sign-in (a 30s timeout on the slow dev server), and 6 cells failed before their page rendered. I re-ran all of them; the results below include the reruns.

### Status

| ID | Status | Measurement now |
|---|---|---|
| ST-25 Home when the "what needs you" read fails | **Fixed** | With the action-center read failing (500), CLS is 0.0000 at 320, 0.0003 at 390 and 0.0002 at 430, both roles. The only shift source is the Today card's meta line changing text in place (y=703 → 703). Before and after the failure, the band stays 220px (390) and 256px (320) with the summary at 24px ("Checking what needs you…" → "Couldn't load everything."). The cards keep identical geometry at 390: Today 216+212, Next up 444+221, Also needs you 681+512, This week 1209+321, Planning 1546+76, Team tools 1638+458. With 403 (no access) the result is the same: CLS 0.0000–0.0003 and identical card geometry. Offline ("You're offline.") is CLS 0.0009–0.0023, and the cards hold. |
| ST-26 Inbox status line when the read fails | **Fixed** | No layout shifts at 320, 390 or 430 (CLS 0.0000, both roles). The status line comes before the placeholder rows; the card shrinks from its bottom edge (266 → 132px) and nothing outside it moves. |

### New finding

| ID | Screen, role, width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| ST-27 | Home, both roles, when the Today read fails. CLS: 390 0.0345, 320 0.0134, 430 0.000 (Manager) and 0.034 (Owner) | Today card (`#home-today`) and every card below | The failed Today card ("Today's numbers aren't available right now." with Try again) is 154px against the 212px placeholder (−58px). Everything below moves up 58px: at 390, Next up 444 → 386 and This week 1209 → 1163. This is the same kind of failure-path shift as ST-25, on the other read. | – (from `homemodes.mjs`, mode `today500`) | `src/components/premium-home.tsx:131-133`: the failed state is a short note and a button, not the stat-card shape. | Keep the 212px shape: render the three stat labels with "–" values and the 45px foot, put "Today's numbers aren't available right now." and Try again in the card head or foot, or give the card `min-height: 212px` (scaling with the text size, as the placeholder does). | P2 |

### Other changes since round 9

- 12px button gaps (Payroll, Schedule utilities), Timecards toolbar in two columns on phones, desktop "Full week" type, roster heading at 20px from 761: Payroll, Schedule and Timecards load with CLS 0.000 at every width and both roles, and nothing scrolls sideways.

### Sweep, round 10

Apart from ST-27, no stability defects. With the reruns:

- **CLS:** 0.000–0.005 on all 203 cells.
- **No sideways scroll** at any width.
- **Header and band join:** teal in every sample.
- **Tab bar:** 68px and fixed at every scroll position.

### Verdict

**Not zero:** one P2 is open, ST-27 (the Home Today card shrinks 58px when its read fails). ST-25 and ST-26 are fixed.

## Round 11

Re-checked October 19, 04:02–04:45, both roles, read only. I simulated failed reads in my own browser: it answered `GET /api/manager/today` and `GET /api/payroll/runs` itself with 500 after 1.5s, so nothing reached the server. I swept every page in the brief and the four later additions at 320, 360, 390, 430, 844×390, 768 and 1440. All 203 cells completed on the first pass this time.

### Status

| ID | Status | Measurement now |
|---|---|---|
| ST-27 Home Today card when its read fails | **Fixed** | The Today card is 212px before and after the failure at 320, 390 and 430, both roles. Nothing above or around it moves. CLS: 320 0.0013, 390 0.0008, 430 0.0006. The remaining before/after difference is the normal arrival of Next up and the cards below it, which happens below the Today card. |

### Other changes since round 10 (WR-61)

- **Payroll failure card:** with the Payroll runs read failing, CLS is 0.0001–0.0004 at 320, 390, landscape and 768. The only shift sources are the section tabs settling in place (y=68 → 68). The card stays at the same top (y=280 at 320 and 390) and grows downward from "Loading payroll" (109px) to "Payroll unavailable" (157px; 177px at 320). Nothing sits below it. It has a white fill, and Try again is 52px tall with the teal primary fill.
- **Inbox and Home Next up "Try again" made primary:** no geometry change. The Inbox failure path still has no layout shifts at 320 and 390 (re-run of ST-26 in round 10), and Home holds its shapes (ST-25, ST-27).

### Sweep, round 11

No stability defects.

- **CLS:** 0.000–0.005 on all 203 page, role and width cells.
- **No sideways scroll** at any width.
- **Header and band join:** teal in every sample.
- **Header colour:** constant on phones.
- **Tab bar:** 68px and fixed at every scroll position.

One note below the threshold: at 320 with today's data ("20 things need you today."), the Next up placeholder is 221px against the real 275px (+54). At 430, "Also needs you" is 512px against 455px (−57). Both are below the fold, and Home's CLS stays at 0.002 or less, so I haven't filed it.

### Verdict

**Zero open defects in bars and stability.** ST-19 and ST-11 stay as accepted judgment calls.

## Round 12

A regression check run October 19, 04:19–05:10, both roles, read only. I simulated a window going to the background in my own page by setting `document.visibilityState` and firing `visibilitychange`. Failed reads were answered by my own browser with 500. "Try again" was then pressed with the real read released; it is a re-read and changes no data. I swept every page in the brief and the four later additions at 320, 360, 390, 430, 844×390, 768 and 1440; all 203 cells completed on the first pass.

### Status of the listed changes

| Item | Status | Measurement |
|---|---|---|
| Home paused (background and back) | **Shifts (new P2, ST-28)** | The band (220px at 390, 256px at 320), its one-line summary ("Paused while you're away." h24) and the Today card (212px, "Paused" with "–") hold. But Home swaps its loaded cards for the placeholder shapes while paused, and those are a different size from what was on screen. **320:** Next up 275 → 221 (−54), "Also needs you" 581 → 512 (−69), so "This week" moves 1368 → 1245 (−123). **390:** Next up 230 → 221 (−9), "Also needs you" 515 → 512, and "This week" moves −12. **On return**, the shapes stay for about 285ms, then the content comes back: at 320, scrolled to 300, "Also needs you" drops from y=417 to 471 (+54) on screen. CLS: 430 scrolled to 300, 0.011 (both roles, 2 of 2 runs); 320 0.0041; 390 0.0020. The replaced cards are new elements, so Chrome's metric undercounts what is visible. |
| Payroll failure card | **Correct** | The top stays fixed (y=280 at 320 and 390, 224 in landscape, 306 at 768). The card only grows downward, from "Loading payroll" (106px) to "Payroll unavailable" (154px; 174px at 320). CLS 0.0001–0.0004, coming only from the section tabs settling in place. |
| Focus after Try again | **Correct in portrait; small scroll in landscape** | With Try again already on screen, the page doesn't scroll at 320, 390 or 430 on Home (Next up and Today), Inbox or Payroll, and focus lands on the recovered content, fully in view: the Next up card, the "Today" heading, the "Act now" heading and the Payroll toolbar. **In landscape**, the focus call scrolls the page up 26px on Home (428 → 402) and 40px on Payroll (48 → 8) to bring the focused block fully into view. That reads as intended, so I haven't filed it. `focus({ preventScroll: true })` would keep the page still if you want no movement at all. |
| Try again icon | **Correct** | Home (Next up and Today), Inbox and Payroll all have the refresh icon. Home Today's Try again is 20px tall, as designed, with its 44px overlay. Attendance's control is "Refresh", not "Try again", and has no icon. One note outside stability: after pressing Attendance's Refresh, focus falls to `<body>`, apparently because the button is disabled while it refreshes. Worth a look from the interaction inspector. |

### New finding

| ID | Screen, role, width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| ST-28 | Home, both roles, all phone widths (largest at 320); window goes to the background and back | Next up, "Also needs you", This week, Planning, Team tools | While paused, Home replaces the loaded Next up and "Also needs you" with the fixed placeholder shapes (221px and 512px). Those differ from the real cards with today's data: 320 −54 and −69px, so This week moves −123px. On return the shapes stay for about 285ms, then the content grows back and pushes everything below it down again (+54px on screen at 320, scrolled). CLS reaches 0.011 at 430 when scrolled. | – (from `paused.mjs` and `paused2.mjs`) | `src/components/premium-home.tsx:236-250` (the paused branch of `PendingCard`; message at 236, paused `Freshness` meta at 248) uses the placeholder heights, not the heights of the content it replaced. | Clearing the data while away is a privacy rule (IS-17), so keep that, but hold the boxes. When pausing, record each card's current height and set it as `min-height` on the paused card (Next up, "Also needs you", Planning) until the data returns. Or keep the same number of rows with "–" in place of text, so the row heights match. | P2 |

### Sweep, round 12

Apart from ST-28, no stability defects.

- **CLS:** 0.000–0.005 on all 203 cells.
- **No sideways scroll** at any width.
- **Header and band join:** teal in every sample.
- **Tab bar:** 68px and fixed at every scroll position.

### Verdict

**Not zero:** one P2 is open, ST-28 (Home's cards change size while paused in the background and again on return; up to 123px at 320).

## Round 13

Re-checked October 19, 04:44–05:30, both roles, read only. I simulated the background in my own page with `visibilityState` and `visibilitychange`, and used the browser's offline switch for offline. I swept every page in the brief and the four later additions at 320, 360, 390, 430, 844×390, 768 and 1440; all 203 cells completed on the first pass.

### Status

| ID | Status | Measurement now |
|---|---|---|
| ST-28 Home while paused or offline | **Partly fixed** | **The column now holds.** `.premium-home__now` keeps its loaded height, and everything below it stays put: "This week" stays at 1068 (320, scrolled to 300) and 921 (390, scrolled to 300) in the ready, paused or offline, and back states. <br>**But the split inside the column still moves**, because the Next up card drops back to its 221px placeholder shape rather than holding its own height. At 320, Next up goes 275 → 221 (−54px) and "Also needs you" moves up 54px (y=471 → 417) and stretches 581 → 635. On return or reconnect it moves back down 54px. At 390 it is 230 → 221, with a 9px move each way. <br>**Offline is the visible case:** the page is on screen when the connection drops, so the user sees "Also needs you" jump up 54px at 320 and back down on reconnect. Chrome's CLS stays at 0.0001, because the cards are replaced elements. <br>**Cause:** `src/app/app/portal-premium.css:975` holds the first child at `flex: none`, but that child is now the 221px placeholder, not the loaded Next up. **Fix:** record Next up's own height alongside the column's (the same observer) and apply it as `height` on the held first child, so only the last card absorbs the difference. **P2.** |

### Other changes since round 12

- **Attendance Refresh with `aria-disabled` while busy:** after pressing it, focus stays on the button ("Refresh attendance review", in view), and the page doesn't scroll at 390. No layout shift.
- **Focus-after-retry scroll in landscape:** left as is, which matches my round-12 judgment. Not re-filed.

### Sweep, round 13

Apart from ST-28's remainder, no stability defects.

- **CLS:** 0.000–0.005 on all 203 cells.
- **No sideways scroll** at any width.
- **Header and band join:** teal in every sample.
- **Tab bar:** 68px and fixed at every scroll position.

### Verdict

**Not zero:** one P2 remains, ST-28. The cards below the column now hold, but the boundary between Next up and "Also needs you" still moves 54px at 320 and 9px at 390 when Home pauses or goes offline, and again when it comes back.

## Round 14

Re-checked October 19, 04:58–05:50, both roles, read only. I simulated offline with the browser's offline switch, and the background in my own page with a `visibilityState` override plus `visibilitychange`. I traced Home frame by frame with `offline2.mjs`, `paused2.mjs`, and two copies that also record the hold attribute (`offline3.mjs`, `paused3.mjs`). I swept every page in the brief and the four later additions at 320, 360, 390, 430, 844×390, 768 and 1440; all 203 cells completed on the first pass.

### Status

| ID | Status | Measurement now |
|---|---|---|
| ST-28 Home while offline or paused | **Fixed for offline; intermittent when paused** | **Offline: holds** in 6 of 6 runs at 320 (scrolled to 300) and in single runs at 320 (top of page), 390 and 430. Every card keeps its top and height in every frame through going offline, the "Checking…" reload and reconnecting. At 320: Next up 180+275, "Also needs you" 471+581, This week 1068+365, Planning 1449+116, Team tools 1581+498, with the column held at 872px. <br>**Paused (background): holds in about half the runs.** In the other half (at 390, scrolled to 300: 4 of 6 runs with hold tracing, 1 of 4 without), the first paused frame is painted with no hold, so the placeholder shapes show (Next up 221px, "Also needs you" 512px). About 13ms later the hold switches on, but it pins the *placeholder* height (749px instead of 761px). The layout then stays wrong until the data returns: Next up 230 → 221, "Also needs you" moves 390 → 381, and This week moves 921 → 909 (−12px). At 320 the same failure moves This week 1368 → 1245 (−123px). When it fails, everything below Next up moves back down on return. <br>**Cause:** `src/components/premium-home.tsx:110-138`. The hold is applied in a `useEffect`, which runs after the paused render has painted. Meanwhile the `ResizeObserver` from the ready state (`:126-129`) can fire on the placeholder layout before that effect cleans it up, so `measure()` overwrites `last.current` with the placeholder heights. Offline happens not to hit this ordering in my runs. **Fix:** apply the hold in a `useLayoutEffect`, so it lands before paint. In `measure()`, ignore callbacks unless the column is showing ready content, for example with a ref set during render (`readyRef.current = !!value`, and `if (!readyRef.current) return;`), so a not-ready layout can never be recorded. **P2.** |

### Other changes since round 13

- **Attendance Refresh "Refreshing attendance review" while busy:** focus stays on the button, the page doesn't scroll, and there is no layout shift at 390.

### Sweep, round 14

Apart from ST-28's paused case, no stability defects.

- **CLS:** 0.000–0.005 on all 203 cells.
- **No sideways scroll** at any width.
- **Header and band join:** teal in every sample.
- **Tab bar:** 68px and fixed at every scroll position.

### Verdict

**Not zero:** one P2 remains, ST-28 when paused. Offline now holds every card exactly. In the background, a race between the `ResizeObserver` and the after-paint effect sometimes records the placeholder heights, so about half the time Home still moves (12px at 390, 123px at 320).

## Round 15

Re-checked October 19, 05:21–06:20, both roles alternating, read only. I simulated the background in my own page (a `visibilityState` override plus `visibilitychange`, and in one set also `blur`/`focus`), and offline with the browser's offline switch.

I used a new repeat script, `holdrep.mjs`. It records the top and height of every card in `.nv-content` on every animation frame for 6.5 seconds, from just before the background (or offline) until 4 seconds after the return. A run passes only if every frame matches the ready frame exactly. To shake out timing races, the runs vary the wait before scrolling and the delay before pausing, and three batches ran in parallel against the dev server.

### Status

| ID | Status | Measurement now |
|---|---|---|
| ST-28 Home while paused or offline | **Fixed** | **100 of 100 runs pass, with no frame differing from the ready layout.** Background: 320 scrolled to 300 (10/10), 320 at the top (10/10), 360 scrolled to 300 (6/6), 390 scrolled to 300 (10/10), 390 at the top (10/10), 390 scrolled to 300 with blur and focus (10/10), 430 scrolled to 300 (10/10), 430 at the top (10/10), landscape scrolled to 200 (6/6), 1440 at the top (6/6). Offline: 320 and 390, both scrolled to 300 (6/6 each). The hold switches on in the same frame as the paused render: 761px at 390, 872px at 320. No run showed the placeholder heights (749px) that appeared in round 14. |

### Sweep, round 15

No stability defects. All 203 cells completed on the first pass.

- **CLS:** 0.000–0.005 on all 203 page, role and width cells.
- **No sideways scroll** at any width.
- **Header and band join:** teal in every sample.
- **Tab bar:** 68px and fixed at every scroll position.

### Verdict

**Zero open defects in bars and stability.** ST-28 holds in 100 of 100 runs, and ST-19 and ST-11 stay as accepted judgment calls.

## Phase 3, round 1

Employee and Lead, inspected October 19, 06:27–07:30. Accounts: `AUDIT-E`, `AUDIT-LEAD`, `AUDIT-LONG` and `payroll-qa-a`, using the saved states in `p3/state/`. Read only: nothing was submitted. I simulated paused, offline and failed reads in my own browser (a visibility override, the browser's offline switch, and local 500 answers for `/api/employee/home` and `/api/employee/my-time`), so nothing reached the server.

I swept all 16 employee screens in the brief, for all four accounts, at 320, 360, 390, 430, 844×390 and 1440: 384 cells in all. 381 measured; 3 Updates and Notifications cells failed in my script before rendering, and the same pages measured at the other widths. I also traced tab taps (390 and landscape), the More sheet, bottom clearance, rotation and Home's not-ready states. Updates and Notifications were also swept for Manager and Owner.

Screenshots are in `shots/`: `P3-ST-a-home-tap.png`, `P3-ST-b-sched-pay-tap.png`, `P3-ST-c-land-req.png` and `P3-ST-d-more.png`.

**The common cause:** most of the round-1/round-2 Manager and Owner fixes are written with `:not(.employee-shell)`, and the employee Home has no `data-mobile-workforce`. So the employee shell has none of them: band placeholders, a teal header from the first frame, landscape header, section tabs, the 68px tab bar, the 20px bottom clearance and safe areas.

### Findings

| ID | Screen, role, width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| P3-ST-01 | Home (`/app`), all four accounts. CLS 0.41–0.47 at 320, 0.74–0.95 at 360–430, 0.10–0.22 in landscape, 0.05–0.18 at 1440 | Band, the green pass, every card | **Band:** the loading band is 176px ("Home" / "Checking your shifts…"). When data arrives, the "Good morning · Monday…" eyebrow row (44px) and the "3 items need your review" link (44+8px) appear, so the band becomes 272px and its title moves down 44px. **Pass:** it grows from 213 to 356px, and its top moves from 172 to 268 (+96). Every card below moves 96–143px. **Header:** on the first frame it is white and 76px, then turns teal and 68px (wordmark and bell move 4px). | `P3-ST-a-home-tap.png` (409 vs 731ms) | `src/components/employee-home-reviewed.tsx:263-268`: the eyebrow and the `extra` link are only rendered with a snapshot. The loading pass (`:271` onward) is a short placeholder. `src/components/app-shell.tsx:165`: `data-mobile-workforce` is not set on `/app` for employees, so the header has no teal rule until the band mounts. | Reserve the band's final parts while loading: an eyebrow row placeholder (44px) and a 52px slot for the review link (empty if there are no items, after the read). Give the loading pass the ready pass's structure and height. Set `data-mobile-workforce` on `/app` for every role. | P1 |
| P3-ST-02 | Home, employee and lead, 390 (all phone widths). Simulated background and offline | Band, pass, every card | Going to the background or offline throws Home back to a short "Paused while you're away." layout: band 272 → 176, pass 356 → 157, and every card below the clock card removed. On return it goes to the "Checking your shifts…" shapes (pass 213), then to the full layout again. Everything moves 96–143px twice. CLS over one background-and-return cycle is about 1.9, on top of the 0.90 initial load. Offline shows the same "Paused while you're away." summary. | – (from `emodes.mjs`) | `employee-home-reviewed.tsx:233-262`: the paused and unavailable states drop the snapshot and render the short loading or unavailable shapes. There is no height hold like Manager Home's (ST-28). | Apply the ST-28 approach: record the band's extra row and the pass and card heights while ready, and hold them (`useLayoutEffect`, before paint) in every not-ready state, with the private data still cleared. | P1 |
| P3-ST-03 | Every employee tab tap (Home, Schedule, Requests, Pay, More links), all accounts. 390 and landscape | Route placeholder, header, section tabs | **Phones:** about 300ms of grey placeholder with **no band** (the page frame's top padding is 24px), then a 104–272px teal band appears and pushes everything down. Tapping Home shows a white 76px header and the white generic placeholder, and the bell fades from a white tile on teal (the round-1 ST-01/ST-05 pattern). On Pay, Hours and Timecards the section tabs show as a white strip, then jump 16px up onto teal, and their labels fade from dark to white (CLS 0.0014–0.003 per load). **Landscape:** every load and tap turns the header frosted white (`rgba(255,255,255,.78)`) and 65px, then teal and 68px. The 65 → 68px header shift appears on 47 of 64 landscape cells, at up to CLS 0.033. | `P3-ST-a-home-tap.png`, `P3-ST-b-sched-pay-tap.png`, `P3-ST-c-land-req.png` | `src/app/app/portal-premium.css:440-451` (band placeholders) and `:453-463` (teal header from the first frame, section tabs, landscape included) are all `:not(.employee-shell)`. The employee `loading.tsx` files pass no `band`. `app-shell.tsx:165`. | Remove the `:not(.employee-shell)` exclusions on those rules. Give each employee route's `loading.tsx` a band at its final per-width height, as was done for Manager and Owner (`portal-premium.css:676` onward). | P1 |
| P3-ST-04 | Profile (`/app/profile`), all accounts. CLS 0.120–0.193 at 320–430, 0.013–0.023 in landscape and at 1440 | Account details panel, "App settings", "Sign out" | The details block grows by about 289px when the account read arrives. "Refresh details" moves from 363 to 652, and "App settings" from 472 to 761. | – (from `eblocks.mjs`) | `src/components/employee-account-panel.tsx:18`: the loading state is a short status block, while the loaded details are a long list. | Render the details list's rows with "–" values while loading, so the panel already has its final height. | P1 |
| P3-ST-05 | Updates (`/app/updates`), **every role**: Employee, Lead, Manager, Owner. CLS 0.057 at 390, 0.023 at 320, 0.035 at 430, 0.005–0.014 in landscape | `.updates-toolbar`, `.updates-groups`, Refresh | While loading, the toolbar shows a "Your updates" heading; when ready it shows the filter pills, which are about 60px taller. Refresh moves 304 → 364 and the list 366 → 426 at 390. | – | `src/components/employee-updates.tsx:49` renders the heading or the pills depending on `current`. | Render the filter pills while loading, disabled and with "–" counts, so the toolbar keeps its height. | P2 |
| P3-ST-06 | My time (`/app/my-time`), all accounts. CLS 0.013–0.043 on phones, 0.034 at 1440 | `.employee-time-footer` | While loading, the footer shows "Only recorded punches appear here."; when ready, "Updated … / time zone · Updates every 30s while active.". It grows 72 → 97px at 320 and 99.5 → 116px for the lead at 390, so the note above it moves (the ST-16 pattern). | – | `src/components/employee-time-panel.tsx:60`. | Use the same two-line structure in every state ("Updated –" while loading), as Attendance does since ST-16/ST-23. | P2 |
| P3-ST-07 | My pay (`/app/my-pay`), all accounts. CLS 0.011–0.014 at 360–390 | "Only your own published statements…" privacy note | "Loading your statements" is about 60px shorter than "No published statements yet", so the privacy note below moves from 553 to 613. | – | `src/components/payroll/my-pay.tsx:32`. | Give the loading `PayrollState` the height of the empty state, or grow it only downward with nothing below. | P2 |
| P3-ST-08 | More sheet, all accounts. 390, 320 and landscape | `#employee-more-navigation` | **Phones:** the sheet is inset 16px ([16, 500.6, 358, 327] at 390, bottom at 828), so half tab labels show under it (the ST-10 pattern). It has no dimmed page behind it. Its 327px of content doesn't scroll, so scrolling over the open sheet scrolls the page behind it (scrollY 0 → 600). **Landscape:** on Home it is a full-width sheet (812×294 from y=80), whose "Sign out" row is half hidden behind Close. On Schedule and Requests it is a 420×230 card in the middle of the screen, ending 80px above the bottom edge, with Close hidden. That is three different presentations. | `P3-ST-d-more.png` | The edge-to-edge fix (`portal-premium.css:470`) and the landscape sheet rules only target `#manager-more-navigation`. `src/app/mobile-workforce.css:107-110` insets `#employee-more-navigation` by 16px, and only up to 760px wide. | Apply the Manager sheet rules to `#employee-more-navigation`: edge to edge, the landscape coarse query, and a dimmed backdrop. Stop the page scrolling under an open sheet (`overscroll-behavior: contain` on the sheet, plus a scroll lock while it's open). | P2 |
| P3-ST-09 | Tab bar, all accounts, every phone width | `.employee-shell .mobile-nav` | 67.25px tall rather than 68 (top edge at y=776.75 at 390). The active label widens by 0.24–0.86px (Requests 58.73 → 59.58), the ST-13 pattern. Icons don't move. | – | `portal-premium.css:467-468` (68px link height, weight 500 when active) is `:not(.employee-shell)`. | Remove the exclusion. | P2 |
| P3-ST-10 | Home, Requests overview, Timecards and My pay, all accounts and widths | Bottom of the page | At max scroll, the last card sits 68.8px above the tab bar instead of 20px (e.g. Home at 390: last block bottom 707.6, tab bar top 776.8). Schedule, Time off, Shift requests, Availability, My time, Profile, Updates and Notifications are at 20px. | – | `portal-premium.css:465` (`.nv-content { padding-bottom: 0 }`, the ST-12 fix) is `:not(.employee-shell)`. | Remove the exclusion. | P2 |
| P3-ST-11 | Every employee page, landscape on notched iPhones. Not verifiable here | Header, band, content, tab bar | The landscape safe-area padding (ST-14, `portal-premium.css:486-489`) is `:not(.employee-shell)`. With `viewport-fit=cover`, notch insets aren't applied to employee pages. | – | `portal-premium.css:486-489`. | Remove the exclusion. | P2 |
| P3-ST-12 | Home, employee and lead, 390. The read fails (simulated) | Pass, clock card | **Home read fails:** the pass shrinks from 213 to 157px (−56) about 1.7s after paint ("Couldn't load Home."), so the clock card moves up 56px (CLS 0.031). **Time read fails:** the clock card grows from 188 to 211px (+23) after the page is ready, pushing every card below it down. | – (from `emodes.mjs`) | `employee-home-reviewed.tsx:233-262` (unavailable shapes) and the clock card's failed state. | Keep the loading shapes' heights in the failed states (the ST-25/ST-27 pattern). | P2 |

### Checked and correct

- **No sideways scroll:** `scrollWidth` equals the viewport width on all 381 measured employee cells, at every width.
- **Header and band:** one teal colour at the join once loaded, header sticky at 68px. The H flags appear only during Home loading (P3-ST-01).
- **Pass overlap (D-1 A):** the pass top sits 72px into the band (band 68–340, pass from 268 at 390).
- **Tab bar:** fixed, with the same rect at scrollY 0, middle and bottom on every page. Icons never move across tab taps.
- **Rotation:** 390×844 → 844×390 → 390×844 restores geometry and scroll on 64 of 64 employee page and account combinations.
- **Other screens:** Schedule (all three views), Requests overview, Time off, Shift requests, Availability and Notifications load at CLS 0.000–0.003 on phones. Notifications is 0.000–0.002 for Manager and Owner too.
- **No sticky decision bars** on the employee screens; only the header (sticky) and the tab bar (fixed).

Not run in this pass: text at 125% and 150% on the employee screens, and toasts.

### Verdict

**Not zero.** 12 findings are open on the Phase 3 screens: 4 P1 (P3-ST-01 to P3-ST-04) and 8 P2 (P3-ST-05 to P3-ST-12). The largest single cause is the `:not(.employee-shell)` exclusions on the Phase 2 stability fixes.

## Phase 3, round 2

Re-inspected October 19, 07:21–08:30, on the same preview, with all four employee accounts. Read only: nothing was submitted. Background, offline and failed reads were simulated in my own browser.

I swept all 16 employee screens for all four accounts at 320, 360, 390, 430, landscape and 1440 (384 cells, all completed). I also ran:
- the Home trace
- placeholder bands for 7 routes per account at 390, 320 and landscape
- tab taps at 390 and landscape
- the More sheet, bottom clearance and rotation (64 combinations)
- Home's background, offline and failed-read states

### Status

| ID | Status | Measurement now |
|---|---|---|
| P3-ST-01 Home load | **Partly fixed; the residual counts (P1)** | **Fixed:** the band is 272px from the first frame, the header is teal and 68px from the first frame, and the eyebrow and review rows are held. **Still moving:** on a fresh session, the pass placeholder (317px) doesn't match the real pass, and the clock card and everything below move. **AUDIT-E, AUDIT-LONG, payroll-qa-a:** the pass grows 317 → 351 (+34, the partial-publication note) and the clock card moves 573 → 607. CLS 0.374 at 390 and 0.354–0.375 at 430. **AUDIT-LEAD,** with no upcoming shift: the pass is shorter than the placeholder, so the clock card moves *up* 117px (573 → 456). CLS 0.322 at 390, 0.273 at 430, 0.089 at 360. **payroll-qa-a at 320:** the clock card appears late at 398 (CLS 0.132). **Revisits in the same session** (`HoldHeight` remembered): CLS 0.022 (AUDIT-E) and 0.100 (AUDIT-LEAD) on a Home tab tap, because the clock card's "Loading recorded time" placeholder still sits at the held pass's placeholder position. **On the 34px question:** yes, it counts. On a first visit it isn't only 34px: it depends on the shift state, from −117 to +34px, and CLS is 0.27–0.37 on every account, every time the app is cold-started (sessionStorage starts empty). **Suggested fix:** keep the cards below the pass hidden (`visibility: hidden`, space reserved) until the pass resolves, then reveal them in place, or remember the last pass height in `localStorage` (a number only), so cold starts hold too. |
| P3-ST-02 Home paused / offline | **Partly fixed** | **Fixed:** the band holds at 272px and the summary changes in place ("Paused while you're away." / "You're offline."). The bottom of the column holds (the footer stays at y=1774). **Still moving:** while paused or offline, the pass and clock card drop to their placeholder shapes (pass 351 → 317 for AUDIT-E; 200 → 341 for AUDIT-LEAD), and the secondary cards (To do, Quick actions, Recent activity) are removed. **The scroll position jumps:** scrolled to 300, scrollY becomes 124 (paused, AUDIT-E) or 148 (offline, AUDIT-LEAD) and stays there after return, so the user loses their place by 152–176px. On return the cards come back and the pass and clock card change size again. **Cause:** `HoldHeight` holds the columns' outer height after the not-ready render, but the content inside is replaced by the placeholders, and the page is shorter for at least one frame, which clamps the scroll. **Fix:** hold before paint (`useLayoutEffect`, the ST-28 fix), keep each card's last height (pass, clock and every secondary card) rather than only the column's, and keep the secondary cards in place with their data cleared instead of removing them. |
| P3-ST-03 tab-tap placeholders, landscape header | **Fixed** | Every tab tap and More link shows a teal band from the first frame at the final height. 390: Schedule 168, Requests 104 (with tabs), Home 272, Updates 128, Notifications 128, Profile 104. 320 and landscape variants also match. One exception, seen once (AUDIT-LONG, 390, Home tap from Pay): one frame of the Pay-shaped placeholder (band 112–240 with section tabs) showed before Home's own (68–340), the ST-22 pattern. It didn't repeat in the other 27 runs, so I haven't filed it. The header is teal and 68px in every frame on phones and in landscape, and section tabs are teal from the first frame. Landscape CLS is 0.000–0.003 on all 64 cells (was 0.033). |
| P3-ST-04 Profile | **Fixed (one P2 residual)** | CLS 0.000–0.003 for AUDIT-E, AUDIT-LEAD and payroll-qa-a. **AUDIT-LONG** is still 0.010–0.013 at 320–390: the long name wraps to more lines than the "–" placeholder, so "App settings" and "Refresh details" move 43px. P2, data-dependent. |
| P3-ST-05 Updates | **Fixed** | CLS 0.000–0.003 for every employee account and width. |
| P3-ST-06 My time | **Not fixed** | CLS 0.019 (AUDIT-E, 390), 0.043 (AUDIT-LEAD, 390), 0.060 (AUDIT-LEAD, 320), 0.014–0.028 at the other phone widths, and 0.040 at 1440. The footer placeholder doesn't match the loaded footer: AUDIT-E 196 → 116px (−80), AUDIT-LEAD 99.5 → 116px (+17), so the note above it moves. Cause: `src/components/employee-time-panel.tsx:60` and the corporate footer placeholder. |
| P3-ST-07 My pay | **Fixed** | CLS 0.000–0.005 at every width. |
| P3-ST-08 More sheet | **Fixed** | Edge to edge at 320 ([0, 233, 320, 335], bottom at 568) and 390 ([0, 509, 390, 335], bottom at 844). In landscape it is the same bottom sheet ([142, 109, 560, 281], bottom at 390) on Home, Schedule and Requests. The page no longer scrolls under the open sheet (scrollY stays 0 after a wheel over it). |
| P3-ST-09 tab bar | **Fixed** | 68px at every width, and active labels are the same width as idle (Home 37.23 in both states). The one-frame label narrowing on Pay, like the accepted ST-19, is still there. |
| P3-ST-10 bottom spacing | **Fixed** | The last card clears the tab bar by 19.6–20.5px on every non-short page, all accounts, at 390, 320 and landscape. |
| P3-ST-11 safe areas | **Fixed in code** | The exclusion is gone. Not verifiable without a notched device. |
| P3-ST-12 Home failed reads | **Partly fixed** | **Home read fails:** CLS 0.003 (was 0.031), fixed. **Time read fails:** the clock card still grows 195 → 219px (+24) about 1.5s after the page is ready, and every card below it moves down 24px (CLS 0.0026 at the top of the page; more when scrolled). P2. |

### New finding

| ID | Screen, role, width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| P3-ST-13 | Timecards (`/app/timecards`), AUDIT-E, AUDIT-LONG, payroll-qa-a. CLS 0.084 at 390, 0.113 at 430, 0.032 at 360 (0.000 at 320) | `[data-nv-band]` and the content below | On a direct load, the band is 245px for about 200ms and then 148px. Its watermark (`.nv-masthead__mark`, 240px) is briefly laid out in flow, as if the kit's `position: absolute` rule hadn't applied yet. Then the band drops by 97px and all content moves up 97px (397 → 300). The band's text sizes don't change, only the mark. | – (from `bandcls2.mjs`: first band child 240px high) | The kit or band styles for this route arrive after the band's first paint (a late stylesheet chunk on the employee Timecards route). Band markup at `src/app/app/timecards/page.tsx:25`. | Make sure `kit.css` (`.nv-masthead__mark { position: absolute }`) is loaded with the shell, not with a later route chunk: import it from `app/app/layout.tsx`. Or give the mark `position: absolute` inline in `kit.tsx`. | P1 |

### Checked and correct

- **No sideways scroll** on any of the 384 cells.
- **Header colour:** teal in every frame on phones and in landscape.
- **Tab bar:** fixed at 68px, with icons unchanged across tab taps.
- **Rotation:** 64 of 64 combinations keep their scroll position and restore their geometry.
- **CLS 0.000–0.005** on Schedule (all three views), Requests overview, Time off (both tabs), Shift requests (both tabs), Availability, My pay, Updates and Notifications, at every width and for every account.

### Verdict

**Not zero.** Open: 3 P1 (P3-ST-01 residual, P3-ST-02 residual, P3-ST-13) and 3 P2 (P3-ST-04 for AUDIT-LONG, P3-ST-06, P3-ST-12 for the time read).

## Phase 3, round 3

Inspected October 19, 10:15–14:05, on the new preview (`http://127.0.0.1:51302`), with the saved states for AUDIT-E, AUDIT-LEAD, AUDIT-ON, AUDIT-BREAK, AUDIT-LONG, payroll-qa-a, payroll-qa-b, AUDIT-M and QAOWNER. Read only: nothing was submitted, saved or withdrawn. Every not-ready state was made in my own browser: a `visibilityState` override for the background, the browser's offline switch, and local 500/401/403 answers for the reads. The only buttons pressed were the pages' own Refresh/Retry (re-reads), More, Escape and the tab bar.

**Method.** Each load records every animation frame from navigation to settled: the top and height of the header, band, section tabs, tab bar, tab icons and labels, and every block in the page down to 7 levels (matched by position in the tree, so a placeholder replaced by its real card still counts as a move), plus the `layout-shift` entries. Chromium's CLS misses moves of replaced elements, so I give both numbers. Chromium for everything, WebKit spot checks; no Firefox and no 768–1440 on employee pages (the coordinator's cuts). Scripts and data: `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS/8c7acfe8-4195-49cb-a26a-ba2ac9ec5c59/scratchpad/phase7/stability/` (crops in `shots/`, shortened below). `file:line` refers to the source the preview serves (`…/scratchpad/main/evidence-2026-10-19T13-11-26-606Z/owned-next-TY86lS/app/src/`).

**Data note.** The coordinator re-seeded availability for AUDIT-E and AUDIT-SWAP at about 3 PM; that changes Availability's content and the Manager's counts, and nothing here depends on it.

**Server note.** The dev server was shared with four other inspectors (load average 18–31). `/api/employee/home` took longer than the client's 8.7–10s limit on most loads, and some document loads returned 500/503 or took over 90s. That is the known server item, not filed. To measure Home's ready state anyway, I captured AUDIT-E's real Home and My time responses once (server-side, no client timeout) and replayed them in my own browser with a 1.2–1.5s delay and a fresh `observedAt`. The Home numbers marked "replayed" use that.

### Status of the open items

| ID | Status | Measurement now |
|---|---|---|
| P3-ST-01 Home load | **Fixed** | Cold load (replayed): CLS 0.0000 and no visible move at 320, 390, 430 and 844×390. The cards below the pass stay hidden until the pass is ready, then appear in place. With the real server (it fails): CLS 0.0000 at 390, 430 and landscape for every account. At larger text the band itself grows on load; that is new, filed as P3-ST-17. |
| P3-ST-02 Home paused / offline | **Partly fixed (P1 remains)** | **Holds:** the pass, side column and footer keep their boxes (replayed, 320/390/430/landscape): e.g. 390 pass 268+687 and the page 2438 → 2447px. **Still wrong:** (1) the scroll position is lost at 390 and 430: scrolled to 300, going to the background or offline leaves scrollY at **122 (390) and 34 (430)**, and it stays there after return. 122 and 34 are exactly the maximum scroll of the short not-ready layout, so that layout is laid out once before the hold applies, and the browser clamps the scroll. The page never paints short (no frame shows it), but the scroll jump is visible. 320 and landscape keep their scroll because their short layout is still taller than the scroll. (2) The clock card grows while paused: 180 → 189px at 390/430, **180 → 233px at 320**, pushing everything below it down 9 or 53px, and back on return. Cause: `components/kit/hold-height.tsx:11-31` sets `min-height` in a layout effect, after the commit that removes the content; something lays out in between. The clock card's paused text is taller than its ready text (`components/employee-time-panel.tsx:59`). Fix: put the hold into the render (`style={{minHeight: holding ? last.current : undefined}}` from a ref the observer keeps current), so the removal and the hold are one mutation; give the paused/offline clock message the ready card's line count at 320 (or hold the aside's exact height, not only its minimum). |
| P3-ST-04 Profile (long name) | **Partly fixed (P2 remains)** | The cards under Work details are hidden while loading and appear in place. **But the rows inside the card still jump.** While loading, a 24px "Checking your current details…" line sits above the "–" rows; it is removed when the details arrive, so every row jumps up 39px: AUDIT-E 390 Name row 307 → 268, 320 331 → 292. Then rows that wrap grow: AUDIT-E 320 Company 60 → 84; AUDIT-LONG Name 59 → 107, so the rows after it move down (320: App access 534 → 567). Card height: AUDIT-E 390 546 → 541, 320 546 → 589; AUDIT-LONG 390 546 → 589, 320 546 → 637. Chromium's CLS shows only part of it (0.010–0.016 for AUDIT-LONG in the coordinator's checks; 0.043 at 390 and 200% text) because the rows are new elements. Same in WebKit. Cause: `components/employee-account-panel.tsx:22-23` puts the status line above the placeholder rows. Fix: put "Checking your current details…" under the rows (or in the card footer), so the rows start at the same y in both states and only a wrapping value grows downward. Crops: `shots/profile-AUDIT-E-320-loading.png`, `shots/profile-AUDIT-E-320-ready.png`. **P2.** |
| P3-ST-06 My time footer (load) | **Fixed** | Loading → ready: CLS 0.0000 and no visible move at 320, 360, 390, 430 and 844×390, for AUDIT-E, AUDIT-LEAD, AUDIT-ON and AUDIT-BREAK (clocked in and on break too; 430 traced for AUDIT-ON and AUDIT-BREAK). The footer is 116px (390) loading and ready. The same footer still moves on every refresh at 390: new, P3-ST-15. |
| P3-ST-12 Home failed reads | **Fixed for the time read; one 320 case left (filed as P3-ST-16)** | Time read failing with 500, 401 or 403 after Home is ready (replayed): CLS 0.0000 and no move at 390 and 320; the clock card keeps its height. Home read 401/403: CLS 0.0000 at 390 and 320 ("Sign in again to view Home."). Home read 500: 0.0000 at 390, but 0.0105 at 320 (P3-ST-16). |
| P3-ST-13 Timecards band | **Fixed** | The band is 148px (390, 430, landscape) or 172px (320, 360) from the first frame. CLS 0.0000–0.0003 at every width for AUDIT-E, AUDIT-LEAD, payroll-qa-a and payroll-qa-b, and at 150% and 200% text. |
| P3-ST-10 Bottom clearance | **Regressed (filed as P3-ST-18)** | Home, Timecards and My pay are at 20px. The pages built on `.premium-employee-content` are at 68px. |

### New findings

| ID | Screen, role, width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| P3-ST-14 | My time (`/app/my-time`), every employee account, every phone width; background, offline, a failed refresh (500, or the client's 10s timeout), 401 and 403 | `.employee-time-today`, `.employee-time-recent`, `.employee-correction-center`; document scroll | When My time stops being "ready", Today, Recent entries and Corrections are **removed**, and the status card and footer change size. The page collapses and the browser clamps the scroll. **AUDIT-E 390:** the page goes 1365 → 880px, scrollY 300 → 36 (−264), in the background, offline and on a failed refresh. After returning from the background the sections come back, but the scroll stays at 36. **AUDIT-LEAD 320 offline:** 1630 → 809px, scrollY 300 → 241, status card 432 → 373px, footer 156 → 118px. **AUDIT-ON 320, 401:** 1562 → 769px, scrollY 300 → 201. **Landscape:** 1197 → 649px (scroll kept at 200, the sections still vanish). Under today's load the 10s client timeout triggers it in normal use: in one 38s watch at 390 the page collapsed by itself at 35.7s. Home holds its cards in the same states (ST-28, P3-ST-02); My time has no hold. | `shots/hold-AUDIT-E-390-_app_my_time-offline-1ready.png` vs `-2during.png` | `components/employee-time-panel.tsx:74-80` (`{ready ? <Today/> : null}`) and `:86-92` (`{ready ? <Recent/><Corrections/> : null}`); the status card's not-ready text at `:59` is shorter than the ready status. | Keep the three sections mounted in every not-ready state, with their data cleared (heading, "–" figures, no rows), and hold each section's last ready height with `useHoldHeight` (memory keys like `employee-my-time-today`), set in the render as in P3-ST-02's fix. Hold the status card's height too. | P1 |
| P3-ST-15 | My time, every account, 390 (360 not measured: its load timed out); every manual Refresh and every 30s auto-refresh | `.employee-time-footer` (Updated stamp + Refresh) and everything below | When the button changes from "Refresh" to "Refreshing…", the wider label pushes "Updated Oct 19, 12:17 PM" onto two lines: the footer goes 116 → 140px and Today, Recent entries and Corrections move down 24px (606 → 630), then back up when the read ends. That happens every 30 seconds while the page is open. 320: the stamp is already two lines in both states (140px), no move. 430 and 844×390: one line in both states (116px), no move. | `shots/refresh-AUDIT-E-390-_app_my_time-pending.png` | Label swap at `components/employee-time-panel.tsx:52`; the corporate footer grid `app/employee-mobile-corporate.css:145` (`grid-template-columns: minmax(0,1fr) auto`) gives the stamp only what the button leaves. | Reserve the button's widest label: `.employee-time-refresh { min-width: 8.5rem; justify-content: flex-end; }` on phones, or keep the label "Refresh" and show progress with the icon and `aria-busy` only. | P2 |
| P3-ST-16 | Home, every employee account, 320 (all text sizes) and 390 at 125%+; the Home read fails, and every return from background/offline | `.premium-pass-placeholder` lines (interval, location, footer) | The pass placeholder's first line changes by state: "Loading Home…" (1 line) vs "Couldn't load your shift. Try again below." / "Your shift updates when you come back." (2 lines at 320). The placeholder bars under it move 24px (30px at 125%). CLS 0.0105 at 320 on every account (failed read), 0.0083 at 390/125%, 0.0111 at 320/125%; on return from the background at 320 the bars move up 24px (380 → 356). The coordinator's checks show the same at 320 (AUDIT-E 0.013, AUDIT-LEAD 0.015). | `shots/homecold-AUDIT-E-320-home500.png` | `components/employee-home-reviewed.tsx:261` (four strings of different length) in the first line at `:314`. | Reserve two lines for that first line in every state: `.premium-pass-placeholder > p:first-child { min-height: 2lh; }` (the pass already holds its total height), or shorten the strings so each fits one line at 320 ("Couldn't load your shift.", "Updates when you're back."). | P2 |
| P3-ST-17 | Home, every employee account, 320–430 at 125%, 150% and 200% text (Chromium and WebKit) | `[data-nv-band]` (eyebrow, title, summary) and everything below | The band only gets its final text when Home is read: the greeting eyebrow (blank while loading), the name ("Home" → "Hi, Alexandra."), and the summary ("Checking your shifts…" → "On shift until 4:00 PM."). At large text these wrap to more lines, so the band grows on load and the visible pass moves down. Replayed: **320 at 200%:** title 72 → 144px, summary 213 → 321, pass 364 → 508; CLS 0.185. **390 at 200%:** +36px, CLS 0.035. **320 at 150%:** +36 then +16px, CLS 0.064. **390 at 150%:** +16px, CLS 0.017. **320 at 125%:** the eyebrow wraps (25 → 50px), +6px, CLS 0.014. Landscape at 150/200%: 0.000. The real server shows the same: 390/150% 0.0115, AUDIT-ON 320/200% 0.092. | `shots/R3-P3-ST-17-home-320-200-loading.png` vs `-ready.png` | `components/employee-home-reviewed.tsx:275-277`: the eyebrow is `' '` and the title "Home" until the snapshot; `app/app/portal-premium.css:93` lets the eyebrow wrap. P3-ST-01's fix only keeps the band's line slots at 100%. | Hold the band's height like the pass (`useHoldHeight` memory `employee-home-band`, keyed by width and text size), keep the eyebrow to one line (`white-space: nowrap; overflow: hidden; text-overflow: ellipsis`, as Inbox does at `portal-premium.css:500-501`), and reserve two lines for the summary when the root text is 125% or more. On a cold load with no remembered height, keep the pass hidden with the other cards until the band has its final size. | P1 |
| P3-ST-18 | Profile, My time, Schedule (all three views), Time off, Shift requests, Availability, Notifications, Updates; every employee account and phone width | `.premium-employee-content` bottom | At max scroll the last card ends **68px** above the tab bar instead of 20px (390: last card bottom 708, tab bar top 776; also 320, 430 and landscape). The content wrapper keeps the kit's 48px bottom padding on top of the page's 88px. At 150% and 200% text the tab bar grows to 75/83px while the page's 88px stays fixed, so on Timecards and Home the last card is only 10–13px (Home 5px) above the bar. Regression of P3-ST-10, which the ST-12 rule fixed only for `.nv-content`. | `shots/bottom-AUDIT-E-390-_app_my_time.png` | `app/app/portal-premium.css:1004` (`padding: … var(--nv-s-12)`) is not covered by the ST-12 rule at `:465` (`> :is(.nv-content, form.nv-content)`); `:18` fixes the page padding at 88px. | Add `.premium-employee-content` to the `:465` selector so it gets `padding-bottom: 0`. Make the page padding follow the tab bar's real height: `padding-bottom: calc(var(--nv-tabbar-h, 68px) + 20px + env(safe-area-inset-bottom))`, with the tab bar height in rem. | P2 |
| P3-ST-19 | Every role's route placeholder (every tab tap and cold load), with reduced motion on | `.route-skeleton … i` | With `prefers-reduced-motion: reduce`, the route placeholder's bars still shimmer: `document.getAnimations()` shows `nevora-shimmer` (1.4s, infinite) running on `.route-skeleton-cards i` (e.g. My time, Schedule and Availability loads at 390). The `.nevora-skeleton` bars and the tab pill do stop. | – (from `rm.mjs` and the reduced-motion sweep) | Specificity: the shimmer rule `app/app/portal-motion.css:262` (`.route-skeleton :is(.route-skeleton-header, .route-skeleton-grid, .route-skeleton-cards) i`) outranks the reduced-motion rule at `:277` (`.route-skeleton i`). | Repeat the full selector in the reduced-motion rule: `@media (prefers-reduced-motion: reduce) { html body .app-shell.nevora-portal .route-skeleton :is(.route-skeleton-header, .route-skeleton-grid, .route-skeleton-cards) i { animation: none; } }`. | P2 |
| P3-ST-20 | Every role's route placeholder (cold load, tab tap, More link), 320 and 390 at 125%, 150% and 200% text | `.route-skeleton-band` vs `[data-nv-band]` | The placeholder bands have fixed pixel heights that match only 100% text. At larger text the real band is much taller, so when the page replaces the placeholder the teal band jumps down and the first card appears that much lower. Placeholder → final band bottom, direct loads: **Manager 390 at 150%:** Home +84, Inbox +78, Schedule +42, Team +66, Timecards +66, Updates +64. **Manager 320 at 200%:** Home +216, Inbox +288, Schedule +184, Team +168, Timecards +108, Updates +154. **Employee 320 at 125%:** Schedule +15, Requests +21, My time +27, My pay +27, Profile +21, Notifications +51; **at 200%:** +132 to +300 (Notifications 128 → 428). Chromium's CLS barely counts it (the band is replaced), e.g. Updates 320/150% reads 0.0007 in one trace and 0.046 in another. | – (numbers from `skel.mjs`; band trace in `data/upd-M-320-150.json`) | `components/route-skeleton.tsx:13` writes `--route-band` in px; `app/app/portal-premium.css:681-687` (`--route-band: 220px` etc.) and `:443` (`height: var(--route-band)`); each `loading.tsx` passes a px band. | Lay the placeholder band out from the same parts as the real band, sized in the text's units: an eyebrow row of `2.75rem`, a title line of `1lh` at the title size, the summary at its real line count in `lh`, so it grows with the text. Or remember each route's last band height per width and text size (the `useHoldHeight` memory) and use it as the placeholder's height. | P1 |
| P3-ST-21 | Inbox (all filters), Manager and Owner, 320 and 390 at 125%, 150% and 200% | `[data-nv-band]` (eyebrow, summary) and the cards | The Inbox reserves 2 summary lines (3 at 360 and below) while it loads. At larger text the real summary ("4 shifts with no clock-in, 21 coverage gaps…") takes 4 lines at 390 and 6 at 320 (200%), and the eyebrow "Checking…" becomes the two-line "Updated 1:38 PM / Refresh". The band grows and every card moves down when the read arrives: **390 at 200%:** summary 96 → 192px, cards 398 → 530 (+132), CLS 0.1315. **320 at 200%:** summary 144 → 288px, CLS 0.2365. **320 at 150%:** CLS 0.0748. **390 at 125%/150%:** CLS 0.026/0.030. Identical for both roles. | – (from `q6.jsonl` and `inboxtext.jsonl`) | `app/app/portal-premium.css:498-499` reserves `min-height: 3rem` / `4.5rem`, fixed line counts that hold only at 100% (the ST-02 fix). | Remember the band's last ready height per width and text size and hold it while loading (as Home's pass does), or keep the summary to a fixed two lines at every size and move the full count sentence into the first card. | P1 |
| P3-ST-22 | Time-off review (`?tab=pending&requestId=audit-timeoff`, with and without `&from=home`), Manager and Owner, 320 and 390 (Chromium and WebKit) | Review placeholder: `.page-frame > .section-tabs`, `.route-skeleton-band` | While the review loads, the placeholder shows the employee **"Time off / Shift requests / Availability" section tabs** (68–112) and a band at 112–376. The real review has no section tabs and its band is at 68–332, so the tabs vanish and the band jumps up 44px when the page arrives, on every open from Inbox or Home. | `shots/R3-review-placeholder-390.png` vs `shots/R3-review-ready-390.png` | `components/app-shell.tsx:258` renders the `/app/requests` section tabs for every role; `app/app/portal-premium.css:173` hides them only once `.premium-review` exists, not for the placeholder (`app/app/requests/loading.tsx:4`, `route="review"`). | Hide the tabs for the placeholder too: `.page-frame:has(.premium-review, .route-skeleton[data-route="review"]) > .section-tabs { display: none; }`, or don't pass a section-tab group for Manager and Owner on `/app/requests`. | P1 |
| P3-ST-23 | WebKit, first load of a page, e.g. Availability at 320 | Band text | WebKit paints the first frames in the fallback system font: `document.fonts` shows Inter "error", then "loaded" 40–350ms later. On Availability at 320 the band summary rewraps from 2 to 3 lines when Inter arrives (48 → 72px), so the Usual week / Specific week pills and all content move down 24px (232 → 256), seen in 2 of 2 cold loads. Chromium paints with Inter from the first frame on the pages I traced. | – (`fontswap.mjs`) | `app/typeface-theme.css:14-20`: `font-display: swap`, and the font isn't preloaded. | Preload it in `app/layout.tsx` (`<link rel="preload" as="font" type="font/ttf" href="/fonts/typeface/inter/variable.ttf" crossorigin>`), and give the fallback Inter's metrics (`size-adjust`, `ascent-override` on a local fallback face) so a swap can't rewrap. | P2 |

### Manager and Owner under the new checks

The Phase 2 pages for AUDIT-M and QAOWNER, measured for large text, WebKit, 401/403, motion and the More sheet. New findings P3-ST-20 to P3-ST-22 above; the bottom-clearance part of P3-ST-18 and P3-ST-19 also apply to them.

- **200% text (Chromium, 320 and 390):** Home, Schedule, Team, Timecards, Team overview, Schedule activity and Payroll: CLS 0.0000 once loaded (their placeholder band is P3-ST-20). Inbox is P3-ST-21. Manager Updates at 390/200% is 0.051 and at 320/150% 0.046: the placeholder band (P3-ST-20). Time exports at 390/125% is 0.028: the known panel collapse, not refiled.
- **Bottom at large text:** the tab bar is 75px at 150% and 83px at 200%, but the page keeps 88px, so the last card sits 5–7px above the bar on Home, Team, Team overview, Activity and Payroll (included in P3-ST-18).
- **WebKit at 390 (Home, Inbox, Schedule, Payroll):** the same as Chromium, apart from P3-ST-22 (also in WebKit).
- **401 and 403** (answered in my browser): Home's action-center and today reads, Inbox, Attendance, Timecards and Payroll runs keep the header, band and tab bar; CLS 0.0000–0.0009 (Payroll 0.0091). One Inbox run started from the server's own "Not available" state, so I didn't count it.
- **Tab taps (Manager 390 reduced motion, Owner 320):** header and tab bar constant; the old page stays until the new band arrives at its final height; no tab transition with reduced motion.
- **More sheet:** Manager 390 with reduced motion: edge to edge [0, 191, 390, 653], no slide, only a 320ms opacity fade; scroll locked, Escape closes it. Owner landscape: a 560px bottom sheet [142, 96, 560, 294] that scrolls inside itself.


### Checked and correct

- **Load stability, 100% text (Chromium):** CLS 0.0000–0.0003 and no visible move on Schedule (all views), Requests overview, Time off (both tabs), Shift requests (both tabs), Availability, My time, Timecards, My pay, Updates and Notifications, at 320, 390, 430 and landscape, for AUDIT-E, AUDIT-LEAD, AUDIT-ON, AUDIT-BREAK and payroll-qa-b (spot checks for payroll-qa-a and AUDIT-LONG). WebKit spot checks at 320 and 390 match.
- **Large text (150%, 200%):** the same pages hold (CLS ≤ 0.003), apart from Home (P3-ST-17) and Profile (P3-ST-04). Availability at 390/150% is 0.0071 (the switch moving under the day name, WR-04) and Notifications' failed read at 150% is 0.0084; both under 0.01.
- **Header and tab bar:** header teal (`rgb(28,74,71)`) and 68px in every frame of every load and tab tap, portrait and landscape. Tab bar fixed, the same rect at the top, middle and bottom of every page (390: [0, 776, 390, 68]); it grows with the text (75px at 150%, 83px at 200%). Tab icons never move across taps. Labels keep their width; in one landscape Pay tap four labels moved 1px sideways for a frame (the accepted ST-19 pattern).
- **Tab taps:** the old page stays until the new one is ready, then the band appears at its final height; no placeholder jump on Schedule, Requests, Pay or Home, at 320, 390 and landscape, normal and reduced motion. Tab transitions (colour 140ms, opacity 160ms, transform 220ms) run only with normal motion.
- **More sheet:** edge to edge at 320 ([0, 233, 320, 335]) and 390 ([0, 509, 390, 335]), a 560px bottom sheet in landscape; backdrop 0.28; `body` overflow hidden while open, the page doesn't scroll under a wheel, scroll and the first card are unchanged on open and close; Escape closes it; the 320ms slide doesn't run with reduced motion (WebKit too).
- **Rotation:** 390 → 844×390 → 390 keeps scroll and geometry on Home, Schedule, My time, Time off, Profile, Timecards, Notifications, Availability and Shift requests (AUDIT-E), and nothing scrolls sideways in landscape.
- **Motion on load:** Schedule's 6px entrance and Time off's 8px entrance are transforms (CLS 0) and don't run with reduced motion.
- **No sideways scroll** on any cell.

Observed once, not filed: in one landscape run, four tab taps each showed the new band 4px taller for 0.7–8s (172 → 168, 108 → 104, 236 → 232); three dedicated reruns didn't show it. For the interaction inspector: on Home with 401/403 the pass keeps two grey placeholder bars under "Sign in again to see your shift.", which reads as still loading.

### Verdict

**Not zero.** 12 items are open in bars and stability. **6 P1:** P3-ST-02 (scroll lost when Home pauses at 390 and 430), P3-ST-14 (My time collapses when paused, offline or failed), P3-ST-17 (Home's band grows on load at large text), P3-ST-20 (placeholder bands don't scale with text, every role), P3-ST-21 (Inbox band at large text) and P3-ST-22 (review placeholder shows section tabs and sits 44px low). **6 P2:** P3-ST-04 (Profile rows jump), P3-ST-15 (My time refresh at 390), P3-ST-16 (Home placeholder line at 320), P3-ST-18 (68px bottom gap, and too little at large text), P3-ST-19 (shimmer ignores reduced motion) and P3-ST-23 (WebKit font swap). Fixed this round: P3-ST-01, P3-ST-06 (load), P3-ST-12 and P3-ST-13.

## Phase 3, round 4

Inspected October 19, 15:05–15:35, on the round 4 preview (`http://127.0.0.1:51349`, `claude/premium-phase-1` at 8c4264c), Chromium, with the saved states for AUDIT-E, AUDIT-M and QAOWNER. Read only: nothing was submitted, and only GET loads were made. Scripts and data: `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS/8c7acfe8-4195-49cb-a26a-ba2ac9ec5c59/scratchpad/phase7/stability/p3r4/` (`skel.mjs`, results in `data/skel-emp.jsonl` and `data/skel-mgr.jsonl`). `file:line` refers to the source the preview served (`…/scratchpad/main/evidence-2026-10-19T19-10-41-582Z/owned-next-UmLXmD/app/src/`).

**The preview went down partway through.** The server was slow from the start (load average 17–22; `/login` took 5.5s; 112 of 442 requests in `next.log` returned 500, Postgres code 57014, statement timeout). At about 15:25 the Next server stopped with a Turbopack internal panic (`next.log`: "turbo-tasks: an internal panic occurred outside the per-task panic boundary … Aborting."). Port 51349 then refused connections, and it was still down at 15:35 after a 5-minute wait. I didn't restart it because it belongs to the main session. So this round has one measured area: placeholder bands, from 73 employee and 15 Manager loads at 320 and 390. Everything else is checked against the source only and is listed as not verified.

### Verdict

**Not zero, and incomplete.** P3-ST-20 is still open (**P1**): placeholder bands now match exactly at 390 at 100% and 200%, but they're 12–26px off at 150% and up to 220px off at 320. There's one new **P2** (P3-ST-24: the employee Schedule and Time off placeholders at 320 are 24px off even at 100% text). The other 10 IDs have fixes in the source that look right, but I couldn't check any of them in a browser before the preview went down. They need a re-run on a working preview: P3-ST-02, -04, -14, -15, -16, -17, -18, -19, -22 and -23. P3-ST-21 is partly measured. Counts: 1 P1 open, 1 new P2, 1 partly verified, 10 not verified, 0 confirmed fixed.

### Status of the open items

| ID | Status | Measurement or reason |
|---|---|---|
| P3-ST-02 Home scroll while paused or offline | **Not verified** (preview down) | Source: `HoldHeight` now applies the hold in the same render through its `style` (`components/kit/hold-height.tsx:41-43`), and the compact clock card no longer adds its paused line (`components/employee-time-panel.tsx:70`, comment P3-ST-02). That matches the round 3 fix. The `hold.mjs` run (390/430/320 × background, offline, 500, 401) was queued when the server stopped. |
| P3-ST-04 Profile rows | **Not verified** | Source: the loading status is `nv-sr` while loading (`components/employee-account-panel.tsx:22-23`), so the rows should start at the ready y. |
| P3-ST-14 My time collapse | **Not verified** | Source: the whole panel is a `HoldHeight` (`employee-time-panel.tsx:97`), so page height and scroll should hold. Today, Recent entries and Corrections still unmount when not ready (`:86`, `:99`, `ready ? … : null`), so the held area will be **blank** while paused, offline or failed. That's for the interaction inspector to judge once it can be seen. |
| P3-ST-15 My time Refresh label | **Cause removed in source; not measured** | The visible label stays "Refresh" in every state. Only `aria-label` and `aria-busy` change (`employee-time-panel.tsx:63`), so the stamp can't be pushed onto a second line. |
| P3-ST-16 Home pass line | **Not verified** | `p[data-recovery] { min-height: 2lh }` (`app/app/portal-premium.css:1565`) on the first pass line (`employee-home-reviewed.tsx:331`). |
| P3-ST-17 Home band at large text | **Not verified; risk remains** | The eyebrow is held by an invisible stand-in (`employee-home-reviewed.tsx:289-292`). The title still changes from "Home" to "Hi, Alexandra." (`:293`), and the summary from "Checking your shifts…" to the ready line (`:280`). Either can still add a line at 320 at 200%. Direct loads didn't get past Home's loading state under this load (state stayed "loading": 320/100 and 320/200 band 272/423 in both frames), so the replay run (`hometext.mjs`) is still needed. |
| P3-ST-18 Bottom gap | **Not verified** | `.premium-employee-content { padding-bottom: 0 }` on phones (`portal-premium.css:1559-1561`). The page padding is `72px + 1rem` (`:18`), which gives 20px above a 52px + 1rem tab bar at any text size. |
| P3-ST-19 Reduced-motion shimmer | **Not verified; fixed by specificity in source** | The new rule `html body .app-shell.nevora-portal .route-skeleton *:not(#nv-kit) { animation: none }` (`portal-premium.css:1556`) has specificity (1,3,2), which beats the shimmer rule's (0,4,3) at `portal-motion.css:262`. |
| P3-ST-20 Placeholder bands at larger text | **Partly fixed, P1 remains** | **Exact now:** at 390, placeholder = page band at 100% and 200% on every employee route measured (Schedule, Requests overview, Time off, Shift requests, Availability, Timecards, Profile, Updates, Notifications: Δ 0). **Still wrong:** (1) **150% at 390** is off because `--route-band-grow` is linear from 100% to 200%: Schedule −24, Shift requests −24, My time −26, Updates −24, Profile −12, Requests overview/Time off/Availability/Timecards/My pay/Notifications +12. (2) **320**, where the band grows more than at 390, but the single grow value per route was measured at 390. **Employee 320 at 200%:** Notifications 260 → 428 (**+168**), Schedule 276 → 396 (**+120**), Shift requests +48, Requests overview/Availability/My pay/Timecards +24. **Employee 320 at 150%:** −24 to +24 (Shift requests −24, Profile +24, Schedule/My time/Notifications +10 to +12, the rest −12). **Manager 320 at 200%:** Inbox 416 → 636 (**+220**), Schedule +48, Home 508 → 476 (−32). **Manager 320 at 150%:** Inbox +66, Schedule +28, Team +12, Timecards +12. Chromium's CLS stays at 0 on these because the band is a replaced element. The real move is the band's bottom edge and everything under it. Cause: `portal-premium.css:446` (`height: calc(var(--route-band) + var(--route-band-grow) * (var(--nv-text-scale) - 1))`) with one grow per route at `:1512-1531`, measured at 390 only. **Fix:** remember each route's real band height per width and text size (the `HoldHeight` memory key `nv-hold:<route>-band:<w>x<px>`) and give the placeholder that height, with the calc as a first-visit fallback. Or add 320 (`max-width: 359px`) grow values and a separate 150% step (`--route-band-150`), because the growth isn't linear. |
| P3-ST-21 Inbox band at large text | **Partly verified** | Manager 320 at 150% and 200%: the Inbox's own band didn't change between its loading and ready states in these loads. The frame log shows only placeholder → final (`374 > 440`, `416 > 636`). The reserve `calc(4.5rem * var(--nv-text-scale))` (`portal-premium.css:503`) scales twice (rem × scale), which gives 6 lines at 320 at 200% and matches the real 288px summary. But the placeholder → page step is +66/+220px (P3-ST-20). 390 wasn't measured. Note: `portal-premium.css:1403-1404` sets `flex-wrap: wrap` / `white-space: normal` on every band's eyebrow row with higher specificity, which overrides the Inbox's `nowrap` at `:504-505`, so the "Updated … / Refresh" eyebrow can wrap again at large text. Not measured. |
| P3-ST-22 Review placeholder | **Not verified** | Both review loads (Manager 320, 200%) returned HTTP 500 twice. Source: the section tabs are dropped from the URL (`components/app-shell.tsx:74-75`, `data-focused-review` at `:264`), and the focused review placeholder has the 264px overlap band (`portal-premium.css:1503-1506`), with its own grow (`:1531`) and landscape height (`:1553`). |
| P3-ST-23 WebKit font swap | **Not verified** | Source: an "Inter Fallback" face (local Arial with `size-adjust: 107.06%`, `ascent-override: 90.49%`, `descent-override: 22.56%`) at `app/typeface-theme.css:23-30`, second in the body stacks (`:56`, `components/kit/kit.css:60`). There's still no preload. The `fontswap.mjs` WebKit run was queued. |

### New findings

| ID | Screen, role, width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| P3-ST-24 | Schedule (`/app/schedule`) and Time off (`/app/requests?tab=new`, `?tab=my`), employee (AUDIT-E), 320, **100% text** | `.route-skeleton-band` vs `[data-nv-band]` | At default text size the placeholder band has the wrong height at 320. **Schedule:** placeholder 168px, page band 192px (+24), so the band's edge and the first card drop 24px when the page arrives. **Time off (both tabs):** placeholder 192px, page band 168px (−24), so the content jumps up 24px. 390 matches (Δ 0); 360 not measured. CLS reads 0 (replaced element). | – (`data/skel-emp.jsonl`, 320/100 rows) | `app/app/portal-premium.css:1167` gives Schedule 168px at every width (the 320 band now has a two-line summary), and `:1180` gives `review` 192px up to 389px, but the 320 Time off band is 168. | At `max-width: 359px`, set `[data-route="schedule"] { --route-band: 192px }` and `[data-route="review"] { --route-band: 168px }`. Measure 360 before choosing the 389px breakpoint for `review`. Or adopt the remembered-height fix in P3-ST-20, which covers this case too. | P2 |

### Measured, not yet traced (re-run needed, not filed)

These loads had real layout shifts (Chromium CLS, not replaced elements) on pages that read ≤0.003 in round 3. Most ran while reads were failing with 500s, so they may show error states rather than a defect. The traces were next in the queue.
- Employee Schedule 320/150%: CLS 0.0954. Profile 320/150%: 0.080. Availability 390/200%: 0.0736, and 320/200%: 0.0324.
- With the page's read still failing ("BUSY"): Profile 320/200% 0.0905, Notifications 390/200% 0.0805, Home 320/200% 0.0469, Updates 390/200% 0.0208.
- Manager Timecards 320/200%: the band went 256 → **304** → 256px during one load (CLS 0.0409). Seen once.

### Checked and correct

- Placeholder → page band at 390, 100% and 200%: Δ 0px on Schedule, Requests overview, Time off, Shift requests, Availability, Timecards, Profile, Updates and Notifications (AUDIT-E). The Home placeholder equals Home's loading band at 320 (272px at 100%, 423px at 200%).
- Placeholder → page band at 320, 100%: Δ 0 on Requests overview, Shift requests (both tabs), Availability, My time, Timecards and Open shifts (the exceptions are P3-ST-24).
- `--nv-text-scale` is set before first paint: the placeholder read 1, 1.5 and 2 in its first frame at 100/150/200%.
- Header 68/69/77–78px and section tabs 44/44/51px are the same in the placeholder and the page at 100/150/200%.

### Gaps

- **Preview down from about 15:25 (Turbopack panic).** Not run: the hold tests for Home and My time (P3-ST-02/-14; pause, offline, 500, 401), Home loading → ready at large text (P3-ST-17), Profile rows (P3-ST-04), the My time refresh (P3-ST-15), the bottom gap (P3-ST-18), the reduced-motion shimmer (P3-ST-19), the review placeholder (P3-ST-22), the WebKit font swap (P3-ST-23), and 430 and 844×390 for the bands (the new landscape heights are untested). Also not measured: Manager and Owner at 390, Owner Payroll, Time exports, Team at 200%, and the shell (More sheet, tab bar) for all four roles.
- Before the crash, document loads returned HTTP 500 on about a quarter of requests (statement timeouts), even after one retry: employee 320/200 My time, Time off, Profile, Timecards, Updates, and 390/200 Schedule, My time, My pay; Manager 320/200 Team, the review, Time exports, Updates.
- Ready-made scripts for the re-run, in `p3r4/`: `holdrun.sh` (the 24 hold cases), `hometext.mjs` (P3-ST-17 replayed), `skel.mjs` (it skips cases already done; add `--widths 430,844x390`), `revskel.mjs`, `bottom.mjs`, `rm.mjs` and `fontswap.mjs`.

### Round 4 re-run on the restarted preview (15:40–16:20)

Preview `http://127.0.0.1:60059`, the same code, freshly seeded, with regenerated signed-in states. Chromium, plus WebKit for the font swap. The server was fast (`/login` 0.05s), and no load had to be retried for a 500. All reads were the server's own: the old saved Home response no longer matches the new seed, so nothing was replayed. Failed reads (500, 401) were answered in my own browser. The only buttons pressed were Refresh, More, Escape and the tab bar. P3-ST-20 and P3-ST-24 were skipped at the coordinator's request; the coordinator is re-measuring every band. Crops are in `p3r4/shots/` (shortened below).

**Updated verdict: not zero.** 6 of the re-checked IDs are fixed: P3-ST-04, -15, -16, -18, -19 and -22. Still open, apart from the skipped band items:
- **P1:** P3-ST-14 (My time still collapses), P3-ST-17 (only at 320 with 200% text), P3-ST-21 (Inbox at 390 with 200% text).
- **P2:** P3-ST-02 (the scroll position now holds; the clock card still grows), P3-ST-23 (one line on Profile still rewraps when the font loads late), and two new items, P3-ST-25 and P3-ST-26.

| ID | Status now | Measurement |
|---|---|---|
| P3-ST-02 Home paused, offline or failed | **Scroll fixed. P2 remains (was P1).** | **Scroll position:** scrolled to 300, it stayed at 300 in all 16 cases (320, 390 and 430 × background, offline, return with a failed 500 read, and return with a 401). The pass keeps its exact height: 786 at 320, 682 at 390 and 430. **Still wrong:** the clock card grows while Home isn't ready. At 320 it goes from 181 to **207px** when paused or offline, and to **225px** while loading or after a failed read; the page goes from 2783 to 2836px. At 390 and 430 it goes from 181 to 187px. Cause: the footer's one-line "Updated Oct 19, 3:44 PM" is replaced by "Only recorded punches appear here.", which takes two lines at 320 (the `small` goes from 20 to 40px, the footer from 68 to 94px), at `components/employee-time-panel.tsx:73`. At 320 the card was below the visible area at scroll 300; at 390 its 6px growth is on screen. Crops: `R4-clock-320-ready.png` vs `R4-clock-320-paused.png`. **Fix:** keep the last "Updated …" stamp in the footer when not ready (the band already says it's paused), or reserve 2 lines for the footer text at ≤359px. Alternatively, make the clock `aside` a `HoldHeight` with `holding={!ready}`. |
| P3-ST-04 Profile rows | **Fixed** | The rows start at the same y in the loading and ready frames: AUDIT-E 390 Name 268/268, 320 292/292; AUDIT-LONG the same. Only values that wrap grow downward, as intended: AUDIT-E 320 Company 60 → 84, AUDIT-LONG Name 59 → 107. The cards below stay hidden until ready. |
| P3-ST-14 My time collapse | **Not fixed (P1)** | Scrolled to 300, then **390** background or offline: the page goes from 1311 to **844px** and the scroll from 300 to **0**. Failed 500 or 401: the same, 300 → 0. **320** background or offline: 1359 → 708px, scroll 300 → 140. Failed 500: → 732px, scroll 164. Failed 401: → 688px, scroll 120. **844×390:** 1144 → 592px, scroll 300 → 202 (206 after a failed read). After returning, the sections come back but the scroll stays where it was clamped. Today, Recent entries and Corrections are removed, and nothing holds their space. **Cause:** the `HoldHeight` around the panel never holds, because the panel is `display: contents` on the corporate phone layout (`app/employee-mobile-corporate.css:119`). Its box is 0px tall, so the hold measures 0 and its `min-height` does nothing (probe: `.employee-time-panel h=0 minH=0px disp=contents`; the parent `.premium-employee-content` goes from 939 to 292px). Crops: `hold-AUDIT-E-390-_app_my_time-offline-1ready.png` vs `-2during.png`, `R4-mytime-390-offline.png`. **Fix:** on that layout, replace `display: contents` with `display: flex; flex-direction: column; gap: inherit;`, so the panel has a box to hold. Or move the `HoldHeight` to `.premium-employee-content`. |
| P3-ST-15 My time Refresh | **Fixed** | The footer stays at 116px (390) and 140px (360) before, during and after a Refresh with the read held for 3 seconds. Today stays at 606 (390) and 630 (360). |
| P3-ST-16 Home pass line | **Fixed** | The first pass line holds 2 lines (48px) while loading at 320, 390, 430 and 844×390. The pass keeps its height when a failed or paused message replaces it (see P3-ST-02). |
| P3-ST-17 Home band at large text | **Fixed except one cell. P1 at 320 with 200% text.** | Loading → ready, real read held 2.5 seconds: the band is the same height (Δ 0, CLS 0) at 320/100–150%, 390 and 430 at 100/150/200%, and 844×390 at 100/150/200%. **320 at 200%:** the title "Home" (72px) becomes "Hi, Alexandra." on two lines (**144px**). The band goes from 423 to **531px**, the pass moves from 428 to 536 (+108), and CLS is **0.1013**. Crops: `R4-home-AUDIT-E-320-200-loading.png` vs `-ready.png`. Cause: `components/employee-home-reviewed.tsx:293`; the eyebrow is held, but the title isn't. **Fix:** while loading, draw an invisible "Hi, {first name}." stand-in, as the eyebrow does (the shell already has `user.firstName`). Or give `.nv-masthead__title` `min-height: 2lh` on Home when the text scale is 1.75 or more at ≤359px. |
| P3-ST-18 Bottom gap | **Fixed** | At maximum scroll the last card ends 20px above the tab bar: 390/430/844×390 at 100% on Home, Schedule, the Requests overview, Time off (both tabs), Shift requests (both tabs), Availability, My time, Timecards, My pay, Profile and Notifications (crops `bottom-AUDIT-E-390-*.png`). At 390 with 200% text it is 20.98px, with the tab bar at 83px. Manager and Owner Home, Team and Payroll: 20–23.5px at 100% and 200%. |
| P3-ST-19 Reduced-motion shimmer | **Fixed** | With reduced motion, no placeholder element has an animation. The employee Schedule placeholder was on screen for 57 frames with 0 animated; Manager Schedule, Team and Inbox also 0. Control run with motion allowed: `nevora-shimmer` runs on the placeholder bars. |
| P3-ST-21 Inbox band at large text | **Not fixed (P1)** | 100%: the eyebrow row is 44px from loading to ready, with no move. **390 at 200% (Manager and Owner):** when the Inbox is ready, "Updated 3:53 PM" and Refresh no longer fit on one row. Refresh wraps under the time, the eyebrow row goes from 44 to **96px**, and the title, summary, filters and cards move down **52px** (cards 494 → 546). CLS **0.2125** for both roles. Crops: `R4-inbox-390-200-early.png` vs `-ready.png`. Cause: `app/app/portal-premium.css:1403-1404` (P3-WR-11's `flex-wrap: wrap` and `white-space: normal` on every band's eyebrow row) outranks the Inbox's `nowrap` at `:504-505`. **Fix:** add `:not(.premium-inbox)` to the `[data-nv page]` part of the `:1403-1404` selectors, or raise `:504-505` to the same specificity, so the Inbox eyebrow stays on one line and shortens with an ellipsis. Or reserve the two-row eyebrow while "Checking…" is shown at large text. |
| P3-ST-22 Review placeholder | **Fixed** | Direct loads, Manager and Owner, with and without `&from=home`: no section tabs in any frame. The placeholder band equals the review's band: 68+264 at 320 and 390, 68+224 at 844×390. CLS 0. Opening the review from the Inbox keeps the Inbox until the review is ready (no placeholder frame). One leftover affects every overlap placeholder: P3-ST-25. |
| P3-ST-23 WebKit font swap | **Partly fixed (P2)** | In 4 normal WebKit cold loads (Availability ×3, Home), Inter was loaded before the first layout, so there was no swap. To test the fallback, I held the Inter file for 2.5 seconds so the first paint used "Inter Fallback". Availability, My time, Schedule, the Requests overview and Profile at 320, and Availability, My time, Schedule and the Requests overview at 390, have the same band, title and summary boxes before and after Inter arrives. **Profile at 390** (WebKit and Chromium): "Your work information and app settings." takes 2 lines in the fallback and 1 in Inter. The summary goes from 48 to 24px and the band from 128 to **104px**, so the page moves up 24px when Inter arrives. At 360 it's 2 lines in both fonts. Cause: the fallback is slightly wider than Inter on this line (`app/typeface-theme.css:23-30`), and the font isn't preloaded. **Fix:** add `<link rel="preload" as="font" type="font/ttf" href="/fonts/typeface/inter/variable.ttf" crossorigin>` in `app/layout.tsx`. Optionally, lower `size-adjust` by about 1% after checking it on this line. |

### New findings (re-run)

| ID | Screen, role, width | Element | What is wrong, measured | Screenshot | Likely cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| P3-ST-25 | Every route placeholder with an overlap band (Manager and Owner Home, Inbox, Schedule, Team, the single review; employee Home), 320/390/844×390, direct loads | `.route-skeleton > .nevora-skeleton` (the first grey block) vs the page's first card | The band matches the page, but the placeholder's first grey block starts 20px **below** the band, while the real first card **overlaps** the band by 72px. When the page replaces the placeholder, the first card appears **92px higher** than the grey block (390 at 100%: Manager Home 308 → 216, Inbox 396 → 304, Schedule 332 → 240, Team 308 → 216, review 352 → 260, employee Home 360 → 268; 844×390 review 312 → 260, −52). Flat bands are off by 20px (e.g., employee Schedule 256 → 236). CLS reads 0 because the block is replaced. | – (`data/overlap.jsonl`, `data/review.jsonl`) | `app/app/portal-premium.css:452-453` and `:1505` put the overlap margin on `.route-skeleton-band + *`. That element is `.route-skeleton-header`, which `:454` hides (`display: none`; probe: `route-skeleton-header disp=none mt=-72px`). The visible `.nevora-skeleton` gets no margin, plus the 20px grid gap. | Move the margin to the first visible block: `.route-skeleton[data-band="overlap"] > .route-skeleton-header + * { margin-top: -92px; }` (the real card starts 72px inside the band, and the grid adds a 20px gap). Flat: `.route-skeleton[data-band="flat"] > .route-skeleton-header + * { margin-top: -20px; }`. Or drop the hidden header from banded placeholders, so `.route-skeleton-band + *` is the visible block. | P2 |
| P3-ST-26 | Manager Timecards (`/app/timecards`), AUDIT-M, 320 at 200% text | `[data-nv-band]` and `.premium-legacy-content` | In 2 of 3 loads, about 3.3s after load the band went 304 → 256px and the period panel and everything below moved **up 48px** (448 → 400). CLS **0.0409** both times (`data/sw-recheck.jsonl`; the earlier run had band sequence 256 → 304 → 256). In the third load the band was 256px from its first frame. I didn't isolate which band child is 48px taller for a while (at 48px per line, that's one line at 200%). | `R4-mgr-timecards-320-200-early.png` / `-late.png` (the third, stable load) | Not isolated. The band text is server-rendered (`app/app/timecards/page.tsx:18`), so a client-side control in the band row is the likely source. | Trace the band's children at 320/200% and give the late-arriving element its final size from the first frame. | P2 |

### Checked and correct (re-run)

- **Loads at 430 and 844×390 (100%)**, every employee page: CLS 0–0.0009 and visible shift ≤ 0.0067. The tab bar stays at [0, 864, 430, 68] and [0, 322, 844, 68].
- **390 at 200%**, every employee page: CLS 0–0.0055. Profile's 0.0214 visible shift is rows wrapping (P3-ST-04's intended growth).
- **Manager and Owner at 390** (100% and 200%): Home, Schedule, Team, Timecards, Payroll and Updates have CLS 0–0.0055. The exception is Inbox at 200% (P3-ST-21). Time exports at 100% (0.0213) is the known panel collapse from round 3, not refiled.
- **The round 4 readings I couldn't trace** were rerun on the fast preview and came back clean: employee Schedule, Profile and Availability at 320/150% and 200% have CLS 0 (they were error states caused by the server). Manager Timecards reproduced and is filed as P3-ST-26.
- **More sheet**, all four roles at 390: page scroll and first card unchanged on open (scroll 300), `body` overflow hidden, wheel scrolling doesn't move the page, the sticky Close sits at [16, 780, 358, 48]. Sheet height: employee and Lead 335px, Manager 653px, Owner 741px (no inner scroll needed). Lead at 320: [0, 233, 320, 335]. Landscape with reduced motion: a 560px bottom sheet at x = 142, with Close at [158, 326, 528, 48].
- **Tab taps** for Lead and Owner at 390, and employee landscape with reduced motion: the header and tab bar are the same in every frame (teal header, 68px), and tab icons don't move. Labels move 1px for one frame (the accepted ST-19 pattern). The old page stays until the new band arrives.
- **Home** at 320, 390, 430 and 844×390, at 100% and 150% (and at 390/430/landscape at 200%): the band, eyebrow, title and summary have the same boxes loading and ready.

### Gaps (re-run)

- I didn't re-run the Home and My time states for AUDIT-LEAD, AUDIT-ON or AUDIT-BREAK; AUDIT-E only. P3-ST-14 is caused by CSS, so the other accounts would fail the same way.
- On Home, the page's own Refresh couldn't be used to trigger a failed read (`hold.mjs` found no enabled Refresh in the page), so failures were tested as a return from the background with a 500 or 401.
- WebKit was used only for the font swap, not for the hold or band checks.
- I only noticed this, it's for the widths inspector: in the Manager Inbox at 390 with 200% text, the first row's "7:00 AM – 3:00 PM" runs past the card's right edge (`R4-inbox-390-200-ready.png`).
