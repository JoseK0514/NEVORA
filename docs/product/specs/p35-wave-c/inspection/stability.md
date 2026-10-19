# Wave C inspection, round 1: bars and stability (ST-)

Inspector: stability. October 19, 2026. Preview `http://127.0.0.1:49855`, Owner `QAOWNER` (Manager only partly, see gaps), fictional data. Read only. Every save, add, issue and dialog submit had its request blocked in the browser (held 2.5 s, then aborted), so nothing was saved. One exception: on Clocker recovery, the "Check receipt" read for a well-formed unknown reference was let through. It is a read: checking a receipt never changes recorded time. The toast was raised with the page's own local `nevora:toast` event, so nothing was stored.

Scope was cut mid-round by the coordinator (Jose approved): Chromium at 320, 390, 844×390 and 1440 (I also have 430, 768 and 1024 from the first sweep), WebKit spot checks, no Firefox, no shared shell.

## Verdict

The band is steady. On phones the header and band are one colour with no seam (header bottom = band top, 0 px gap, at every width). Each route's own `loading.tsx` draws its band at exactly the ready height and title position wherever it showed. Every pending state holds still: the button keeps its size, the band and page don't move, and a double tap sends exactly one request. The sticky save bars dock where they should on desktop. WebKit matches Chromium to the pixel at 390.

What's wrong:

- **Desktop sticky asides:** the guide card and the Branding preview stick 24 px from the top, so the 65 px header covers their top 41 px, title included.
- **Features toast:** on phones the "Features saved" toast lands on the Save button.
- **Company policies save bar:** on phones it is two stacked full-width buttons, 140 px tall.
- **Smaller issues:**
  - A failed save on Features or Policies scrolls the page by 400–1300 px.
  - The parent placeholder band is 232 px for every Settings sub-page, so it jumps 24–68 px on hard loads.
  - The save bars tuck 2 px under the tab bar and stay docked in landscape.
  - Dialogs lock page scroll inconsistently.
  - The receipt card changes height by 12–16 px.
  - A first-visit font swap moves the Features band 24 px.

Totals: **0 P0, 3 P1, 9 P2.**

The dev server returned 500s or timeouts on about 1 in 6 loads (two runs each). I re-ran or set those aside and filed none of them (list under Gaps).

## Findings, worst first

Screenshots: `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p35-wave-c-93e13c/75458b9c-fbac-4a0a-b5f7-fa683890e520/scratchpad/inspect/stability/shots/`, shortened to `shots/`. Line numbers are from the file as it stood at the end of the round.

| ID | Screen, role, width | Element | What is wrong, measured | Screenshot | Cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| ST-01 | Company profile, Company policies, Clocker devices, Location detail, Account recovery, Clocker recovery, Branding. Owner. 1024×768 and 1440×900 (policies at both widths; the others wherever the page scrolls far enough) | `.wc-aside` (guide card) and `.wc-brand__preview` | The aside sticks at `top: 24px`, under the 65 px sticky header. Once docked, the card is at 24 px, the header bottom at 65 px, so **41 px is covered**, including the card title ("What these rules do" at y=44, "Applies to everyone", "Connect a shared tablet", "How recovery works", "A clear path to recovery", Branding "Preview"). Policies 1440: covered 41 px at scrollY 223, 447, 670 and 893. Location detail 1024: 21 px. The text shows through the 78% white header. | `shots/aside-chromium-policies-1440x900.png`, `shots/aside-chromium-clk-1024x768.png`, `shots/ready-chromium-features-1024x768-bottom.png` | `src/app/app/premium-wave-c.css:16` and `:334`, `top: var(--nv-s-6)`, ignore the sticky desktop header (`.mobile-header`, 65 px) | `top: calc(65px + var(--nv-s-6))` (89 px) for both. The Branding preview is 694 px tall at 1024×768, so 89 + 694 > 768. Add `max-height: calc(100vh - 89px - 24px); overflow: auto`, or let the preview stop sticking when it is taller than the viewport (`@media (max-height: 820px) { position: static }`). | P1 |
| ST-02 | Features & words, Owner, 390×844 and 430×932, Chromium and WebKit | `.nevora-toaster` over `.wc-actions.nv-actionbar` | After a save, the "Features saved" toast is at 720–764 and the docked Save changes button at 714–766, so 44 of the button's 52 px are covered (430: toast 808–852 over 802–854). `elementFromPoint` at the button's centre returns the toast, in both engines. A second change within the toast's 4.5 s can't be saved without dismissing it, and "All changes saved" is hidden. Desktop and landscape are clear (toast at the top in landscape, bottom right on desktop). | `shots/toast-chromium-features-390x844.png`, `shots/toast-webkit-features-390x844.png` | `src/app/app/portal-premium.css:478-479` (shared) lifts the toaster above an action bar only for `.premium-review .nv-actionbar`; Wave C's bar isn't covered. The bar is 108 px tall from `bottom: 66px`. | Coordinator: widen the lift to every docked kit bar: `html body:has(.wc-page .nv-actionbar) .nevora-toaster { bottom: calc(66px + 108px + 8px + env(safe-area-inset-bottom, 0px)); }` (182 px) under the phone query. Better: have the bar set `--nv-actionbar-h` and use `calc(68px + var(--nv-actionbar-h) + 8px)`. | P1 |
| ST-03 | Company policies, Owner, 320×568, 390×844, 430×932, Chromium and WebKit | `.wc-actions.nv-actionbar`: "Save policies" and "Reload policies" | Two full-width buttons stacked: the bar is **140 px** tall (320: 362–502 docked; 390: 638–778). At 320×568 there are 432 px between header (68) and tab bar (500); the bar takes 140 of them (32%), and with the header and tab bar 276 of 568 px are fixed chrome. Features' bar is 108 px and desktop's 76 px. | `shots/ready-chromium-policies-320x568-mid.png`, `shots/ready-chromium-policies-390x844-mid.png` | `src/app/app/premium-wave-c.css:122`, `.wc-actions > :is(.nv-btn, .nv-link) { width: 100% }`, also applies inside the sticky bar under 600 px, so each button wraps to its own row | Take "Reload policies" out of the bar: it only reloads the page. Make it a teal link in the scope card or the guide card, so the bar is one 52 px button (bar 76 px). If both must stay, add `.wc-actions.nv-actionbar > .nv-btn { width: auto; flex: 1 1 0; min-width: 0 }` so they sit side by side, and shorten the label to "Reload" at ≤359 px. | P1 |
| ST-04 | Features & words and Company policies, Owner, 390×844 (Features also 1440 without the jump) | Failure notice `.wc-feedback` and page scroll | A blocked save scrolls the page a long way. **Features 390:** scrollY 706 → 1121 (+415). The notice is drawn at 379–469, at the end of the form above the sticky bar, and takes focus. **Policies 390:** scrollY 0 → 1281: the owner editing the first rule is carried to the bottom of the form. The button then moves 133–185 px. Other pages keep scrollY within 19 px (their notice appears where the button was). Judgment call: moving to the message is deliberate, but the jump loses the owner's place in a long form while the docked bar was already in view. | `shots/failed-chromium-features-390x844.png`, `shots/failed-chromium-policies-390x844.png` | `src/components/features-editor.tsx:28` (`feedback.current?.focus()` without `preventScroll`); `src/components/company-policy-editor.tsx:43`. The notice sits in the form flow, not in the docked bar. | Render the failure notice inside the sticky bar, above the buttons (it is then on screen wherever the owner is), and focus it with `{ preventScroll: true }`. Field-level errors can still scroll to the field. | P2 |
| ST-05 | Every Settings sub-page, Owner, hard load, phones (320–430 and 844×390) | Parent placeholder `.route-skeleton[data-route="settings"]` band → page band | On every hard load the parent placeholder showed first, often with no route `loading.tsx` after it. Its band is 232 px for all `/app/settings/*`, but the real bands differ. **Grows by:** locations 276 (+44; 300 at 320, +68), location detail 276 (+44), breaks, positions, devices 276 (+44), features 256 (+24), branding 280 at 320 (+48). **Shrinks by:** new location 208 at 390/430 (−24). **Landscape** (bands 168 or 212): −64 or −20. The cards jump by the same amount. CLS doesn't count it (the placeholder is replaced, not moved), but it is plainly visible. Hub, profile, policies, account recovery and Clocker recovery match at 232, and Clocker recovery at 320 matches at 256. Caveat: in production a hard load may show the route's own `loading.tsx` instead, but ST-22 says this parent frame also shows on tab taps. | sweep log `sweep-chromium.log` (snap `skel band [68,232]` vs `ready band`) | `src/app/app/root-loading.tsx:28` matches `/app/settings` as a prefix for every sub-page; `src/app/app/premium-wave-c.css:481` sets one height. Landscape uses the portrait height. | Coordinator (root-loading entries): add the sub-routes before `/app/settings` with their own `route` keys. Then in `premium-wave-c.css` set `--route-band`: locations, location detail, breaks, positions, devices 276 (300 at ≤359 for locations and devices); features 256; branding 280 at ≤359 and 256 above; new location 208 (232 at ≤359). In landscape (`max-height: 430px` and landscape) use 168 for no-eyebrow pages and 212 for eyebrow pages. | P2 |
| ST-06 | Features and Policies, Owner, every phone width and landscape, Chromium and WebKit | `.wc-actions.nv-actionbar` vs the tab bar | Docked bar bottom 778 vs tab bar top 776 at 390 (502 vs 500 at 320; 866 vs 864 at 430; 324 vs 322 in landscape). The bar runs 2 px under the tab bar, so the button is 10 px from the tab bar but 12 px from the bar's top edge. The same defect as Phase 7 ST-03 (1.25 px). | `shots/ready-chromium-features-390x844-mid.png` | `src/app/app/premium-wave-c.css:135`: `--nv-actionbar-offset: calc(66px + …)`; the tab bar is 68 px (ST-13) | `calc(68px + env(safe-area-inset-bottom, 0px))` | P2 |
| ST-07 | Features and Policies, Owner, landscape 844×390 | `.wc-actions.nv-actionbar` | The save bar stays docked in landscape: header 68 + bar 76 + tab bar 68 = 212 of 390 px fixed, leaving **178 px** for the form. The time-off decision bar was moved into the page in landscape for this reason (Phase 7 ST-08). | `shots/ready-chromium-features-844x390-mid.png` | `src/app/app/premium-wave-c.css:131`, `:135`: no landscape exception | `@media (max-height: 430px) and (orientation: landscape) and (pointer: coarse) { …wc-actions.nv-actionbar { position: static; margin-inline: 0; padding-inline: 0; background: none; } }` | P2 |
| ST-08 | Features & words (and Policies), Owner, phones | `.wc-actions.nv-actionbar` at the end of the page | On phones the guide card follows the form, so near the bottom the bar leaves the tab bar and stops mid-screen. **Features 390:** docked at 670–778 for scrollY 0–734, then 92 px above the tab bar at 856 and **214 px** at the bottom (454–562), with "Nothing is deleted" below it. Policies: 340 px at the bottom. It is ordinary sticky behaviour (the bar ends with its form), so this is a judgment call. Phase 7 filed the same thing as ST-03 because "docked" bars that float read as broken. | `shots/ready-chromium-features-390x844-bottom.png`, `shots/ready-chromium-policies-320x568-bottom.png` | `src/app/app/premium-wave-c.css:131` (sticky inside `.wc-main`); the aside renders after `.wc-main` on phones (`wave-c-kit.tsx`, `wc-layout`) | Either put the guide card above the form on phones (`order: -1` for `.wc-aside` under 1024 px), so the bar's resting place is the page end, or dock it for real with `position: fixed; bottom: 68px` plus `padding-bottom` on the page equal to the bar height, as the review page does. | P2 |
| ST-09 | Break types and Clocker devices dialogs, Owner, 320, 390, 768, 844×390, 1440 | Page scroll behind `dialog.wc-dialog` | Scroll is locked inconsistently. **Break type dialogs** lock the page in portrait (wheel: scrollY 141 → 141 at 390) but not in landscape (844×390: 0 → 300, 407 → 491). **Clocker device dialogs** never lock (320: 200 → 300; 768: 200 → 448). On iOS the page moves under the sheet. | `shots/dialog-chromium-devices-390x844.png` | `src/components/clocker-device-manager.tsx:69` has no lock. `src/components/clocker-break-types.tsx:52-58` sets `body.style.overflow`, which doesn't propagate to the viewport in landscape because `html` has `overflow-x: clip` (`src/app/app/portal-premium.css:648`). | One shared helper for both dialogs: on open set `document.documentElement.style.overflow = "hidden"` (and `scrollbar-gutter: stable` on `html` at desktop so a classic scrollbar doesn't shift the page 15 px); restore on close. | P2 |
| ST-10 | Clocker recovery, Owner, 320×568 and 390×844 | `.wc-result` | The result card changes height: idle 204 px, pending ("Checking the saved receipt") **216 px**, failed read 200 px. Everything below it moves +12 then −16 px (page height 1545 → 1557 → 1541 at 320). | `shots/clk-pending-QAOWNER-390x844.png`, `shots/clk-blocked-QAOWNER-320x568.png` | `src/app/app/premium-wave-c.css:460` `min-height: 196px` is below the pending state's height | `min-height: 216px` (13.5rem). It then holds idle, pending and failed at 320 and 390. | P2 |
| ST-11 | Features & words (any page whose summary wraps near a line end), Owner, 390×844, first visit | `.nv-masthead__summary` and everything below | First paint uses the fallback font. 2.3 s later Inter arrives, the summary rewraps from 2 to 3 lines (48 → 72 px) and the band grows 232 → 256. Cards move 24 px: layout shift **0.0229** (> 0.01), with sources `nv-content wc-content 228→252`. Later loads (font cached) show no shift. | sweep test log (`sweep-test.log`) | Shared: `src/app/typeface-theme.css:14-20`: Inter as a variable **TTF** with `font-display: swap`, no preload, no metric-matched fallback | Coordinator: serve Inter as woff2 with `<link rel="preload" as="font" crossorigin>`, and add a fallback `@font-face` with `size-adjust`/`ascent-override` matched to Inter (or `next/font/local`, which does both). | P2 |
| ST-12 | Every Wave C page, Owner, hard load at 768, 1024 and 1440 | Parent placeholder on desktop | The parent placeholder has no band on desktop: grey header bars at y=93 (52 px), then a 196–264 px teal panel appears and pushes the cards down. Wave C's own `loading.tsx` does draw the band on desktop (Branding 1440 and Policies 1440 match the ready band exactly), but the parent frame showed first on every desktop hard load. | `sweep-chromium.log` (`skel band null first [93,52]`) | Shared: `src/app/app/portal-premium.css:438-451`: `.route-skeleton-band` is shown only under the phone query | Coordinator: show `.route-skeleton-band` at ≥761 px as the rounded 1120 px panel (radius 20, `margin: 28px auto 0`), using the same `--route-band` values as the desktop bands (196, 220, 240, 264). | P2 |

## Checked and correct

- **Header joins band (phones):** header 0–68, band top 68, gap 0 and the same `rgb(28,74,71)` on every page at 320, 390, 430 and 844×390. No sideways scroll on any page at any width (scrollWidth = viewport).
- **Route `loading.tsx` → ready (where it showed):** band height and title y identical.
  - Breaks: 276/164 at 390 and 430; 212/164 in landscape.
  - Devices: 300/164 at 320.
  - Policies: 232/120 at 320.
  - Features: 256/120 at 430.
  - Branding: 220/145 at 1440.
  - Clocker recovery: the root band at 320 is 256 = ready.
  - Account recovery and Clocker recovery: 232 = ready at 390 and 430.
- **Pending (Chromium; blocked and held):** button size unchanged (Δ 0), label swapped ("Saving…", "Adding…", "Issuing recovery code…", "Checking receipt…"), button disabled, band Δ 0, page height unchanged, scrollY unchanged.
  - 390: location, new location, positions, account recovery, Clocker recovery, features, policies, branding.
  - 1440: profile, location, new location, positions, account recovery, Clocker recovery, features, branding.
- **Double tap:** exactly one request on every form above, and on Rename, Replace tablet and Edit break type.
- **Failure on the other forms:** notice where the button was, button moved down 86–158 px, scrollY held (0–19 px), focus on the notice.
- **Dialogs:**
  - Bottom sheet under 600 px: full width, bottom = viewport, radius 20 20 0 0. At 320×568 Add break type is 544 px with inner scroll.
  - Centred at ≥600: 480 px wide, radius 16.
  - In landscape: max height 358 px with inner scroll.
  - Pending doesn't change the dialog's height. A failure grows the sheet upward with the buttons fixed at 708–760 at 390, and the "Reload break types" / "Refresh devices" button takes the submit button's place.
  - Escape closes; focus returns to the trigger (Add break type, Edit, Rename, Replace tablet).
- **Sticky save bars, desktop (768, 1024, 1440):** docked at bottom 0, 76 px, aligned to the main column (left 298 at 1440). The bar's height doesn't change between "All changes saved" and "You have unsaved changes" at any width.
- **WebKit 390:** Features and Policies bars match Chromium to the pixel (gap −2, heights 108 and 140, toast collision the same).

## Gaps

- **Firefox:** not run (cut by the coordinator).
- **WebKit:** only the two sticky bars at 390.
- **Manager:** only the Owner role covered on the recovery pages. The Manager result-area run was stopped for time.
- **Hydration guards:** Positions, Account recovery and Clocker recovery not compared pre and post hydration (script `hydration.mjs` ready, not run).
- **Reduced motion:** checked in source only. `premium-wave-c.css` drops switch, caret and field transitions, the skeleton pulse runs only under `no-preference` and the spinner stops. Not observed in a browser.
- **Archive break type and Revoke device dialogs:** not opened (the selector matched the "Archived" / "Revoked" filter pills).
- **Unknown reference on Clocker recovery:** still pending after 6 s on the loaded server, so the "Action still unconfirmed" result height was not measured.
- **Client-side tap navigation:** loading not recorded separately. Hard loads only.
- **Dev-server 500s or timeouts, not filed:**
  - Hub at 320.
  - Location detail at 320 and 430.
  - Branding at 390, 844×390 and 1024.
  - Devices at 430.
  - New location at 844×390.
  - Features and Policies at 768.
  - Policies and Breaks at 1024.
  - Features and Policies at 1440 in the sweep (covered by the sticky and aside runs).

Zero open P0–P2 in my area: **no**.

## Round 2

October 19, 2026, same preview (frozen), Owner. Chromium at 320×568, 390×844, 844×390 and 1440×900 (plus 1280×900 and 1440×800 for the sticky guides), 200% text at 390, WebKit spot checks at 390. Every save and dialog submit was blocked in the browser. The Clocker recovery receipt read was let through for the unknown reference, as in round 1. Scripts and logs: `.../scratchpad/inspect/stability/r2-*.log`. Screenshots: `shots/`.

**Open now: 0 P0, 2 P1, 6 P2.** Round 1: 9 fixed (ST-12 handed to the desktop chat), 1 not fixed, 2 partly fixed. New: 1 P1 and 4 P2.

### Round 1 findings

| ID | Status | Measured now |
|---|---|---|
| ST-01 | Fixed | 1440×900 and 1280×900: the guides dock at 89 px (header bottom 65), 0 px covered, titles at 109. Branding preview docks at 89–783, inside the 900 px window. At 1440×800 the guides are `static` and scroll with the page, as intended. |
| ST-02 | **Not fixed (phones)** | Features, 390×844, Chromium and WebKit: the toast is at 648–692 and Save changes at 656–708, so 36 of the button's 52 px are covered, and `elementFromPoint` hits `nevora-toast`. At 320×568 the toast is at 372–416 over 380–432. The shared lift (`portal-premium.css:479`, 68 + 76 + 8) assumes a 76 px bar, but Features' phone bar is **132 px**: "Saved" wraps under a full-width button. Cause: `premium-wave-c.css:122` (`.wc-actions > .nv-btn { width: 100% }`) still applies inside the bar; `:437` doesn't override it. Fix: under 600 px, `.wc-actions.nv-actionbar > .nv-btn { width: auto; flex: 1 1 auto; }`. Save (≈240 px) and "Saved"/"Unsaved changes" (84/142 px) then fit on one 76 px row at 390, and the shared lift clears it. Fine at 844×390 (toast at the top) and 1440. P1. |
| ST-03 | Fixed | Policies has only Save in its bar: 76 px at 320 and 390 (92 px at 200% text). "Reload policies" is in the history card. |
| ST-04 | Fixed (scroll), see ST-13 | Failure now shows in the bar. Features 390: scrollY 898 → 898. Policies 320: 504 → 504. Features 1440: 403 → 403. Policies 390: 32 → 110, and the bar there is clipped (new ST-13). |
| ST-05 | **Partly fixed** | Portrait matches everywhere (parent placeholder band = ready band). **390:** 232 (hub, profile, policies, account recovery, Clocker recovery), 276 (locations, location detail, breaks, positions, devices), 208 (new location), 256 (branding, features). **320:** 300 (locations, location detail, devices), 280 (branding), 256 (features, Clocker recovery). **Landscape 844×390 still jumps:** placeholder 232 → 168 (hub, profile, policies, account recovery, Clocker recovery), 276 → 212 (locations, location detail, breaks, positions), 256 → 192 (branding, features), 208 → 168 (new location), 232 → 212 (devices). That is −64, −40 or −20 px. Cause: `premium-wave-c.css:481-492` has no landscape query. Fix: `@media (max-height: 430px) and (orientation: landscape) and (pointer: coarse)` with 168 for hub, profile, policies, new location and both recovery pages; 192 for branding and features; 212 for locations, location detail, breaks, positions and devices. P2. |
| ST-06 | Fixed | Bar bottom = tab bar top (gap 0) at 320 and 390, Chromium and WebKit. At 200% text see new ST-15. |
| ST-07 | Fixed | 844×390: Features and Policies bars are `position: static` and end the form. |
| ST-08 | **Partly fixed** | Features: the bar stays docked to the end, then rests 20 px above the tab bar (page padding). **Policies still lifts:** at the page bottom the bar is at 521–597 at 390, **179 px** above the tab bar, and 200 px at 320. The Policy history card follows the form inside the editor (`company-policy-editor.tsx`, the history `section` after `</form>`). Fix: put Policy history before the form on phones (`order: -1` alongside the guide), or dock the bar as in ST-13's fix. P2. |
| ST-09 | Fixed | The root lock holds. The wheel doesn't move the page under any dialog: break type Add, Edit, Archive and Clocker device Add, Rename, Replace, Revoke at 390, 844×390 and 1440 (for example scrollY 200 → 200, 661 → 661). |
| ST-10 | Fixed | The receipt card is 216 px idle, checking and failed at 320 and 390. The real "unknown reference" result grows to 464 px (390) or 504 px (320); that is the answer appearing, so it is expected. |
| ST-11 | Fixed as far as measured | `preload()` of Inter is in `src/app/app/layout.tsx:42`. No layout shift on any first page in a fresh context this round (CLS 0.0000 at 320, 390, 844×390). Inter is still a TTF with no metric-matched fallback, so on a slow network the swap can still reflow. |
| ST-12 | Handed on | Desktop chat's (decided list); not refiled. |

### New findings

| ID | Screen, role, width | Element | What is wrong, measured | Screenshot | Cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| ST-13 | Company policies, Owner, 390×844 (Chromium) | `.wc-actions.nv-actionbar` | The bar can't rise above its form's top. The guide now comes first on phones, so near the page top the form starts low and the bar hangs under the tab bar. **At load (scrollY 0):** bar 732–808, Save policies 744–796, so the bottom 20 px of the button is under the tab bar (top 776) and the bar's 32 px tail is hidden. **After a blocked save (scrollY 110):** the in-bar notice grows the bar to 218 px (622–840), and **"Retry the same save" is at 776–828, wholly under the tab bar**. Only scrolling down brings it out. At 320 a failed save makes the docked bar 238 px tall: 55% of the 432 px between header and tab bar. | `shots/failed-chromium-policies-390x844.png`, `r2-pending.log` | `premium-wave-c.css:512` (guide `order: -1`) moves the form start down. `:132` sticky can't move above the containing `form`. `:517` puts the notice inside the bar, so the bar grows. | Dock the phone bar for real: under 761 px, `.wc-actions.nv-actionbar { position: fixed; left: 0; right: 0; bottom: calc(68px + env(safe-area-inset-bottom, 0px)); }`. Give the page `padding-bottom` equal to the bar's height plus 16 px. Cap the in-bar notice at two lines with "Details" below (or show the notice in the page above the form and keep only a one-line status in the bar), so the docked bar stays ≤ 140 px at 320. | P1 |
| ST-14 | Company policies, Owner, 1440×900 | Save policies button | The button widens **35 px** the moment it's tapped (right edge 458 → 493, label "Saving…"): the idle label behind the swap has already become "Retry the same save", and `.wc-swap` sizes to the widest. Pending must not move anything. | `r2-pending.log` | `src/components/company-policy-editor.tsx:106` `setRetry(command)` runs before the request, so the idle label switches during pending | Set `retry` only when a send fails (in the failure branches), or keep "Retry the same save" in the swap's grid from the start so the width is reserved | P2 |
| ST-15 | Features and Policies, Owner, 390×844 at 200% text | Docked save bar vs the tab bar | At 200% the tab bar grows to 83 px (top 761), but the bar still docks at 68 px. Bar 628–776 (Features) and 684–776 (Policies): **15 px under the tab bar**. On Features the "Saved" line (720–764) runs 3 px under it. | `shots/r2-200-features-390.png`, `shots/r2-200-company-policies-390.png` | `premium-wave-c.css:505` fixed `68px` offset | Dock to the tab bar's real height. Coordinator: expose `--nv-tabbar-h` from the shell (68 px at 100%, 83 at 200%) and use `calc(var(--nv-tabbar-h, 68px) + env(safe-area-inset-bottom, 0px))`. | P2 |
| ST-16 | Branding, Owner, 390×844, before hydration | Color swatches (`.wc-swatch`) | With the JS chunks held, the guarded page shows the eight swatches pale (faded) with a grey selected ring. After hydration they snap to full color with an ink ring. The guard is meant to keep the finished look. The Policies selects and switches are unchanged across hydration (same background, border and text color; only the cursor changes). | `shots/r2-hydration-diff.png` (left: before, right: after; the tab bar in the right crops is an element-capture artifact) | `premium-wave-c.css:287-290` and `:527` keep fields, primary button and switches unfaded under `[data-guard]`, but not `.wc-swatch`. Disabled buttons fall back to the shared faded look. | `[data-guard] .wc-swatch:disabled { opacity: 1; cursor: default; }` with the selected ring unchanged (`box-shadow: 0 0 0 2px var(--nv-canvas), 0 0 0 4px var(--nv-ink)`). Same for the preview tabs (`[data-guard] .wc-segmented .nv-filter:disabled`). | P2 |
| ST-17 | Break types, Edit dialog after a blocked save, Owner, 844×390 | `.wc-dialog .wc-actions` | "Reload break types" wraps to two lines (68 px, 394–462) beside a 52 px Cancel (402–454). The two buttons in one row differ by 16 px in height and their labels don't line up. | `shots/dialog-fail-chromium-breaks-edit-844x390.png` | Round-2 "buttons wrap their labels" in the 214 px dialog column; `premium-wave-c.css:217` (`flex: 1 1 0`) with `align-items: center` | `.wc-dialog .wc-actions { align-items: stretch; }` so both buttons share the row height. Better, shorten the label to "Reload" so it stays on one line at 214 px. | P2 |

### Checked and correct this round

- **Header joins the band:** 0 px gap, the same color, at 320, 390 and 844×390 on all 13 pages. No sideways scroll.
- **Pending:**
  - Features (390, 1440): button size, band and scrollY unchanged.
  - Policies (320, 390): the same, aside from ST-14 at 1440.
  - Exactly one request on a double tap, Features and Policies.
- **In-bar outcomes:** at 1440 the bar grows upward (Features 742–900, Policies 722–900) and stays docked at the bottom.
- **Dialogs:**
  - The sheet and centred sizes are unchanged from round 1.
  - Pending keeps the height.
  - A failure grows the sheet upward with the buttons fixed (390: 708–760).
  - Escape returns focus to the trigger.
  - The Archive and Revoke confirms now open and were checked.
- **Clocker recovery:** the malformed-reference error doesn't move the receipt card's height (216).
- **WebKit 390 Features:** bar docking and the toast collision are identical to Chromium.

Note for the interaction inspector (not my area): the Archive break type, Revoke device and Replace tablet confirms took initial focus on the destructive or submit button ("Archive break type", "Revoke device", "Create new code"), not on Cancel as ROUND-2.md says (`clocker-break-types.tsx:54`, `clocker-device-manager.tsx:70`).

Gaps: no Manager-role pass this round; 200% text only at 390 on the two save-bar pages; no Firefox (cut).

Zero open P0–P2 in my area: **no** (2 P1: ST-02, ST-13; 6 P2: ST-05, ST-08, ST-14, ST-15, ST-16, ST-17).

## Round 3

Not completed: the round-3 run was stopped when the exit round began. Round 4 below re-checks every open ID.

## Round 4 (exit)

October 19, 2026. Preview `http://127.0.0.1:50431`, code at `5f7c166`. Owner on all 13 pages. Manager on Account recovery and Clocker recovery. Chromium at 320×568, 390×844, 844×390 and 1440×900, plus 1024×768 for the save bars. 200% text at 320 and 390. WebKit spot checks at 320 and 390. Every save and dialog submit was blocked in the browser; only the Clocker recovery receipt read was let through. The server returned no 500s this round. Logs: `.../scratchpad/inspect/stability/r4-*.log`.

**Open now: 0 P0, 0 P1, 2 P2.**

### Earlier IDs

| ID | Status | Measured now |
|---|---|---|
| ST-02 | Fixed | No overlap anywhere, in Chromium and WebKit. 390: toast 648–692, bar top 700 (8 px gap). 320 with the bar grown to 132 px: toast 316–360, bar top 368 (8 px). 1024 and 1440: the toast is beside the bar. 844×390: the toast is at the top. |
| ST-05 | Fixed | Parent placeholder band = ready band on all 13 pages at 320, 390 and **844×390**. Landscape: 168 (hub, profile, policies, new location, both recovery pages), 192 (branding, features), 212 (locations, location detail, breaks, positions, devices). Layout shift while loading is 0.0000 on all 52 page loads. |
| ST-08 | Fixed | The phone bar is `position: fixed` on the tab bar. At the page bottom the last card ends 16 px above the bar: Policies 390, the history card bottom ≈683 and the bar top 700. |
| ST-13 | **Partly fixed** | The bar now stays on the tab bar (bottom = tab bar top at every scroll position), so Save and Retry are always visible. But a failure notice still makes the docked bar very tall: **Features 320: 254 px** (246–500), Policies 320: 218 px, Features 390: 178 px, Policies 390: 198 px. At 320 that leaves 178 of the 432 px between header and tab bar for the page, so the form is mostly hidden while the owner fixes what failed. P2, see below. |
| ST-14 | Fixed | Policies 1440: the button is the same width while pending (Δ 0). The label changes only after a failure ("Retry the same save"). |
| ST-15 | Fixed | At 200% text the bar bottom = tab bar top in both engines: 485/485 at 320, 761/761 at 390 (tab bar 83 px). |
| ST-16 | Fixed | Branding before and after hydration: the swatch rows no longer differ. Remaining pixel differences are the sticky bar and tab bar in element captures. Policies selects keep their background, border and text color. |
| ST-17 | Fixed | 844×390 Edit break type failure: "Reload" and "Cancel" are both 52 px at 394–446. |

### New and remaining findings

| ID | Screen, role, width | Element | What is wrong, measured | Screenshot | Cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| ST-13 (rest) | Features and Policies, Owner, 320×568 and 390×844, Chromium and WebKit | Fixed save bar after a failed save | The in-bar failure notice is three or four lines of text over the full width, so the docked bar grows to 254 px (Features 320), 218 (Policies 320), 178 (Features 390) or 198 px (Policies 390). At 320 the page shows only 178 px between header and bar until the owner saves again or the notice clears on input. | `shots/r3-fail-chromium-features-320.png` | `premium-wave-c.css:521` (`.wc-actions > .wc-feedback { flex: 1 1 100%; order: -2 }`) puts the whole notice inside the fixed bar | Keep the bar to one short line: "Not saved." with a "Details" link that scrolls to the full notice, placed in the page just above the bar's resting place. Or clamp the in-bar notice body to two lines (`-webkit-line-clamp: 2`) with the full text available. The target is a docked bar of ≤ 132 px at 320. | P2 |
| ST-18 | Features & words, Owner, 320×568, Chromium and WebKit | Save bar, clean → dirty | Turning any switch on or off reflows the docked bar. "Saved" fits beside Save changes (bar 76 px, button 208 px wide). "Unsaved changes" (126 px) doesn't, so the button jumps to full width (288 px) and the state drops to a second row: **the bar grows 76 → 132 px** and the page view shrinks by 56 px on the first change. At 390 it stays one 76 px row. | `r4-sticky.log` (320 features, `dirty barH=132`) | `premium-wave-c.css:440` (`.wc-save-state { flex: 0 1 auto }`) with the state's single-line label; the button's `flex: 1 1 auto` (`:133`) then takes the row | Let the state wrap beside the button instead of under it: `.wc-actions.nv-actionbar > .wc-save-state { flex: 1 1 0; min-width: 0; white-space: normal; }` with `.nv-btn { flex: 0 0 auto }` at <600 px. "Unsaved changes" then sits on two lines in the 44 px state box and the bar stays 76 px. Or shorten it to "Unsaved" at ≤359 px. | P2 |

### Checked and correct (exit sweep)

- **Bands:** header joins the band with 0 px gap at 320, 390 and 844×390 on all 13 pages; desktop band at 93 px, 28 px under the header, on all pages. No sideways scroll anywhere (scrollWidth = viewport).
- **Loading:** every route's own placeholder, where it showed, matches the ready band and title y. Branding 320: 280/120 = 280/120; Policies 1440: 196/145 = 196/145; Features 844×390: 192/120 = 192/120. Layout shift while loading is 0.0000 on every load, Owner and Manager.
- **Save bars:**
  - Fixed on the tab bar on portrait phones (gap 0 at every scroll step, 100% and 200%).
  - In the page in landscape.
  - Docked at the bottom at 1024 and 1440.
  - The last card always clears the bar by 16 px.
  - WebKit identical.
- **Pending:** Features and Policies at 390 and 1440 hold button size, band and scrollY. A double tap sends exactly one request. Failure keeps scrollY (898 → 898, 0 → 0).
- **Dialogs:**
  - All of them hold page scroll at 390, 844×390 and 1440: Add, Edit and Archive break type; Add device, Replace tablet and Revoke access.
  - The destructive confirms open on Cancel.
  - Pending keeps the dialog's height.
  - A failure grows the dialog upward, with buttons fixed and the same height.
  - Escape returns focus to the trigger.
- **Clocker recovery (Owner and Manager, 390):** the receipt card is 216 px idle, malformed, checking and failed.
- **Sticky guides at 1440×900:** they dock below the header (top 89), as in round 2.

Gaps: Manager's "unknown reference" read was still checking after 6 s, so that result's height wasn't measured for Manager; 768 checked only through the sweep's band numbers in earlier rounds; no Firefox (cut).

Zero open P0–P2 in my area: **no** (2 P2: ST-13 rest, ST-18; 0 P0, 0 P1).
