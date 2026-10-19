# Profile (Phase 3.5) inspection: bars and stability

Inspector: bars and stability (prefix ST). October 19, 2026. Round 1. Evidence folder (scripts, frame logs, screenshots): `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p35-profile-6cdee8/e8429433-65b2-4ff4-835a-8f879fb2454f/scratchpad/inspect/stability/` (written `…/stability/` below).

## Verdict

The bars are right: the phone header and the flat band join with no seam at every phone width (and at 200 % text at 390), the tab bar is fixed with Sign out 20 px above it at the end of the page, the header stays put while scrolling, "Saving…" moves nothing, a failed read fills exactly the space the loading rows had, and hydration moves nothing in the page. The read's states are not stable, though. The builder's "loading to ready grows only where real data is longer" is true but the size of it was measured at 1440 only: on phones and at 768 the page moves 66–86 px when the details arrive (CLS 0.034–0.036 at 390–430, 0.018 at 768, over the 0.01 budget). Worse, the page throws away a finished read whenever `pageshow` or a `focus` fires without a blur, so in WebKit the details appear, vanish and reappear on 12 of 14 measured loads (Chromium 5 of 16, Firefox 4 of 9), and every blur/offline/return collapses the details and moves everything below by up to 86 px. The landscape placeholder band is 4 px taller than the real band, there is no placeholder band at all from 768 up, and text-size changes make the fixed-pixel placeholder band wrong by up to 108 px. Eight findings below, none P0.

## Findings (worst first)

| ID | Sev | Where | Problem (measured) |
|---|---|---|---|
| ST-01 | P1 | Owner, Manager · all widths · Chromium, WebKit, Firefox | A finished read is cleared and read again on `pageshow` / bare `focus`: ready → dash rows → ready, 2 reads, CLS 0.10 at 390 |
| ST-02 | P1 | Owner, Manager · phones and 768 (desktop: details card only) | Blur, offline, a failed refresh or an expired read collapse the read rows; Pay, Notifications and Sign out jump 66–86 px each way |
| ST-03 | P2 | Owner, Manager · 390, 430, 768, 1024 | Loading → ready moves the page below the details: CLS 0.034–0.036 (390/430), 0.018 (768), 0.0065–0.019 (1024) |
| ST-04 | P2 | Owner · 360 | A signed-out save message wraps in a row reserved for one line: row 68→88, rows below move 20 px |
| ST-05 | P2 | Owner, Manager · all widths | "Try again" in the card head grows left by 36 px when it becomes "Trying again…" |
| ST-06 | P2 | Owner, Manager · all widths | "Show names" / "Show all 8" moves 72–78 px down after a tap; at 390 the "Show fewer" lands under the tab bar |
| ST-07 | P2 | Owner, Manager · 844×390 landscape, Chromium, WebKit, Firefox | Placeholder band 108 px, real band 104 px: everything below moves up 4 px when the page arrives |
| ST-08 | P2 | Owner, Manager · 768, 1024, 1440 and every width at 125–200 % text | No placeholder band from 768 up; on phones the placeholder band is a fixed 104 px while the real band grows with text size |

### ST-01 · P1 · A finished read is thrown away and re-read on `pageshow` and on any `focus` without a blur

- **Where:** Owner and Manager, every width, all three browsers. Seen in the plain load matrix (no forcing): WebKit 12 of 14 loads show `Checking… > ready > Checking… > ready` with 2 reads; Chromium 5 of 16 (Owner 390 and 1440, Manager 320, 360 and 1024, plus the first probe run); Firefox 4 of 9. Reproduced on demand (a) by holding one image so `load` fires after the read returns and (b) by dispatching one `focus` on a ready page.
- **Measured (Chromium, Owner 390×844, read answered in 400 ms):** ready at 13 074 ms; at `pageshow` (19 227 ms) Email 75→53, Locations 97→53, head says "Checking…", the alert rows turn into bars, Pay 743→677, Sign out 1520→1434; ready again at 19 656 ms (+86 px back). Two reads instead of one. Load CLS **0.102** (three shifts of 0.034) against 0.034 without the extra cycle. A bare `focus` event: CLS 0.034 down, 0.034 back up (600 ms read). On a failed read the same cycle flashes the error panel → bar rows → error panel.
- **Screenshot:** `…/stability/ST-01-flicker.png` (left: one frame after the `focus`; right: read returned).
- **Cause:** `src/components/manager-profile/manager-profile-live.tsx:205` — `sync` always calls `controller.pause()` before `controller.start()`, and `pause()` clears the snapshot (`src/lib/private-snapshot-client.ts:39`, `current=null`). `manager-profile-live.tsx:208` runs `sync` on every `focus` and `pageshow`, so the `pageshow` that follows a normal first load, and any `focus` with no `blur` before it, empty a page that was never paused.
- **Fix:** keep a local `paused` flag and restart only when it is set:
  `let paused = true; const pause = () => { paused = true; controller.pause(); }; const sync = () => { if (document.visibilityState === 'hidden' || !navigator.onLine) return pause(); if (paused) { paused = false; controller.start(); } };`
  and handle `pageshow` only when `event.persisted` (a back-forward-cache restore). The mount call at `:209` stays.

### ST-02 · P1 · Blur, offline, a failed refresh and an expired read collapse the details, so everything below jumps

- **Where:** Owner and Manager. Phones and 768 (one column): the whole lower page moves. 1024/1440: only the details card changes height.
- **Measured (Chromium):**

  | Transition | Owner 390 | Manager 390 | Owner 1440 |
  |---|---|---|---|
  | ready → blur ("Updates paused") | CLS **0.051**; Sign out 1520→1434 | — | 0.0015; details 517→473 |
  | paused → focus → ready | **0.034**; back +86 | — | 0.0019 |
  | ready → offline ("You’re offline") | **0.040** | **0.040**; Sign out 1454→1386 | — |
  | offline → online → ready | **0.034** | **0.034** | — |
  | ready → expired read (fixture `validForMs` 4000) | — | **0.036**; Sign out 1454→1386 | — |

  The rows that shrink: Email 75→53 (wrapped address), Locations 97→53 (Owner) or 79→53 (Manager, two names), the wrapped "Shift swaps and cover" alert row 88→68. On a phone this happens on every app switch: the user comes back to dash rows and then watches the page grow 86 px.
- **Screenshot:** `…/stability/ST-02-offline.png` (left ready, right offline).
- **Cause:** pausing clears the snapshot on purpose (privacy), but the placeholders that replace it have fixed one-line shapes: `manager-profile-live.tsx:127–129` (dash rows, 53 px) and `:175` (bar rows, 68 px). The same happens for any ready → unavailable change (`private-snapshot-client.ts:13`, `:33`). The comment at `manager-profile-live.tsx:36–38` ("nothing moves when it changes") holds for loading → failed only.
- **Fix:** keep the last ready geometry while the values are hidden. While ready, record the height of the Email, Phone and Locations rows and of each topic row (a `ResizeObserver` on those elements, kept in a ref and cleared when the viewport width or root font size changes). When the snapshot goes away after having been ready (paused, offline, failed, signed out, expired), render the dash rows, bar rows and the failed panel with `style={{ minHeight: <recorded px> }}` (the failed panel: the recorded list height instead of `--pmp-rows`). No values stay in the DOM, so the privacy rule holds, and the return trip from paused to ready moves nothing.

### ST-03 · P2 · Loading → ready moves Pay, Notifications and Sign out on phones and at 768–1024, above the 0.01 budget

- **Measured (Chromium, the session's fixtures, single read):**

  | Width | Owner CLS | Owner Sign out moves | Manager CLS | Manager Sign out moves |
  |---|---|---|---|---|
  | 320×640 | 0.001 | +144 (below the fold) | 0.010 | +128 |
  | 360×740 | 0.000 | +124 | 0.013 (first cycle) | +108 |
  | 390×844 | **0.034** | +86 | **0.034** | +68 |
  | 430×932 | **0.036** | +86 | **0.036** | +68 |
  | 844×390 landscape | 0.0005 | +44 | 0.0005 | +26 |
  | 768×1024 | **0.018** | +44 | **0.018** | +26 |
  | 1024×768 | 0.0065 | +20 (right column only) | **0.019** (with ST-01 cycle) | +20 |
  | 1440×900 | 0.0015–0.0053 | 0 | 0.0015 | 0 |

  The builder's 0.0019–0.0054 is the 1440 figure. What grows: Locations 53→97 for every Owner (scope is always `all`, `CODEX.md:50`: "All 3 locations" plus a 44 px "Show names" line), Email 53→75 where the address wraps (320–430), and at 320/360 the alert rows 68→88 because most details wrap there (topics list 348→448 at 320, 348→428 at 360).
- **Screenshot:** `…/stability/cn-390-pair.png` shows the shapes; frame logs in `…/stability/runs/chromium-z1.jsonl`.
- **Cause:** `manager-profile-live.tsx:129` the Locations placeholder is one line; `src/app/app/premium-profile.css:24` puts the Show names button on its own 44 px line. `manager-profile-live.tsx:175` bar rows hold one detail line, while at 320–360 most real details take two.
- **Fix:** (1) give the Locations row one shape in every state: summary line plus a reserved 44 px action line. In the placeholder render the dash and an `aria-hidden` spacer `<span class="pmp-action-space">` with `display:block; height:44px` — for an Owner always, for a Manager when the last ready render had a button. That removes 44 of the 66 px at 390 and all of it for Owners whose email fits. (2) Under 380 px, give the placeholder detail line two line boxes: `@media (max-width: 379px) { … .pmp-topic-placeholder .nv-row__meta { min-height: 2.5rem; } }` (all 5 rows are 88 px at 320). (3) ST-02's remembered heights remove the rest on every later visit in the session.

### ST-04 · P2 · A signed-out save message needs more room than the space reserved for it

- **Where:** Owner 360×700, "Time-off requests" switch, save answered 401.
- **Measured:** the row grows 68→88 px; the four rows below and Sign out move down 20 px (762→782); the switch in the tapped row moves 10 px down (339→349). Layout-shift value 0.0119 (flagged as recent input only because the fixture answered within 500 ms; a slower answer makes it a real shift). At 390 and 320 the same save moves nothing (the detail already took two lines at 320; the message fits on one line at 390).
- **Screenshot:** `…/stability/ST-04-save401.png`.
- **Cause:** `manager-profile-live.tsx:160` — while no error shows, the hidden error line holds `saveMessage(null)` = "Not saved. Try again." (one line), but the shown message can be "Not saved. Sign in again, then try." or "Not saved. Check your connection and try again.", which wrap at 360.
- **Fix:** reserve the longest message: when no error is shown, render the hidden error span with "Not saved. Check your connection and try again." (the longest of the three), or stack all three messages as hidden siblings in the same grid cell (`grid-area: 1 / 1`, like `.pmp-meta-stack`).

### ST-05 · P2 · "Try again" in the card head jumps left when it becomes "Trying again…"

- **Where:** Owner and Manager, failed read, every width (measured 390 and 320).
- **Measured:** the button the user just tapped grows from 66.4 to 101.9 px wide and its left edge moves 288→252 (390) and 218→182 (320), then back when the retry fails. At 320 × 200 % the head is already two lines in the failed state (head 116 px vs 72 px ready).
- **Screenshot:** `…/stability/ST-05-tryagain.png`.
- **Cause:** `manager-profile-live.tsx:115` swaps the label text inside a right-aligned head (`premium-profile.css:62`).
- **Fix:** keep the button at the width of its longer label: render both labels in one grid cell (`display:inline-grid`, both spans `grid-area:1/1`, the inactive one `visibility:hidden`), the same technique as `.pmp-meta-stack`.

### ST-06 · P2 · "Show names" and "Show all 8" move away from the finger, and at 390 the toggle lands under the tab bar

- **Where:** Owner (`all` scope, "Show names") and Manager (`assigned`, fictional 8-location fixture `…/stability/fixtures/manager-eight.json`), 390 and 1440.
- **Measured:** Owner 390: the button moves 615→687 (+72) when tapped; Owner 1440: 622→694 (+72). Manager 390 with 8 locations: "Show all 8" at 719–763 becomes "Show fewer" at 797–841, entirely behind the fixed tab bar (776–844), so the user can't see where the control went. With `owner-large` (60 names) the toggle moves about 60 lines down.
- **Screenshot:** `…/stability/ST-06-showall.png`.
- **Cause:** `manager-profile-live.tsx:80–81` (list rendered before the button) and `:86–87` (extra names inserted above the button).
- **Fix:** keep the toggle where it was tapped. For `all` scope render the button directly under "All N locations" and the list after it (swap lines 80 and 81). For `assigned`, put the toggle on the summary line above the list ("8 locations · Show all") or, if it stays after the list, scroll by the inserted height after expanding (`window.scrollBy(0, insertedHeight)`).

### ST-07 · P2 · Landscape placeholder band is 4 px taller than the real band

- **Where:** Owner and Manager, 844×390 landscape, Chromium, WebKit and Firefox (hard load and client navigation).
- **Measured:** placeholder band 68–176 (108 px), real band 68–172 (104 px); the first card moves from 192 to 188 when the page replaces the placeholder.
- **Screenshot:** `…/stability/ST-landscape-band.png`.
- **Cause:** `src/app/app/premium-profile.css:82–84` sets 108 px for landscape phones, but the landscape type override at `:88–95` keeps the phone roles, so the real band stays 104 px (the comment's "108px on a landscape phone" predates that override).
- **Fix:** delete the landscape rule at `premium-profile.css:82–84` so the 104 px value at `:81` applies in landscape too.

### ST-08 · P2 · The placeholder band is missing from 768 up and wrong at larger text sizes

- **Where:** 768, 1024, 1440 (Owner and Manager, all browsers); every phone width at 125–200 % text.
- **Measured:** at 768–1440 the placeholder is a white panel with grey bars (`.route-skeleton` 93–439 at 1440) and no band; the teal band (93–201, 108 px) appears only with the page. On phones the placeholder band is 104 px at every text size, while the real band grows with the text (measured at 390: 104 px at 100 %, 212 px at 200 %, Manager; the placeholder measured 104 px at 200 % during client navigation, `…/stability/cn-390z2-skeleton.png`), so at 200 % everything below jumps 108 px when the page arrives.
- **Screenshot:** `…/stability/ST-desktop-placeholder.png`.
- **Cause:** `src/app/app/portal-premium.css:438–451` shows `.route-skeleton-band` only up to 760 px (shared rule, coordinator's file); `src/app/app/premium-profile.css:81` sets the band in px, so it can't follow the root font size.
- **Fix:** in `premium-profile.css` express the band in rem so it follows the text size (104 px = 6.5rem at 16 px: `--route-band: 6.5rem`); and add a desktop rule for this route (`@media (min-width: 761px)`: `.route-skeleton[data-route="profile"] .route-skeleton-band { display:flex; height:108px; margin: 28px 38px 0; border-radius: var(--nv-r-card); background: var(--nv-masthead); }` with the page frame's background, matching the band at 93–201) — or ask the coordinator to do this for every desktop page in `portal-premium.css`.

## Checked and correct

- **Header joins the band (phones):** header 0–68 and band top 68.00 at 320, 360, 390, 430 and 844×390 in Chromium, WebKit and Firefox; same colour `rgb(28, 74, 71)` on both; header shadow none and border 0. At 200 % the header is 0–78 and the band starts at 78. Desktop (768–1440): white header 0–65, band 93–201 as on the other desktop pages (Notifications band also at 93).
- **Placeholder band vs real band, portrait phones:** 104 = 104 px at 320, 360, 390, 430, Owner and Manager, Chromium, WebKit, Firefox, hard load and client navigation (client navigation measured in Chromium at 320, 390, 430, 844×390 and 1440).
- **Tab bar:** fixed, 68 px (83 px at 200 %), z-index 30 above the sticky header's 20; at the end of the page Sign out ends 20 px above it (320: 552 vs 572; 390: 756 vs 776; 844×390: 302 vs 322).
- **Sticky header while scrolled:** stays at 0–68 at scroll 300 and at the end of the page (320, 390, 844×390); content passes under it.
- **"Saving…" (slow save, 4 s):** no element moves (frame log empty for geometry), the row keeps 88 px, the switch stays at its place; after the save settles nothing moves. Save failed (500), aborted and 401 at 390: nothing moves.
- **Loading → failed read and → signed out (401) on load:** no movement at 320, 390 and 1440 (CLS 0.00007–0.0005, only the head word); the failed panel fills exactly the bar rows' space (340 + 8 = 348 px Owner, 272 + 8 = 280 Manager).
- **Failed → Try again → failed:** nothing moves except ST-05's label.
- **30 s refresh while ready:** no change in 32 s (frame log empty).
- **Hydration:** between the first server-rendered paint and the read, no page element moves (frame logs, all widths, Chromium and WebKit); the only early shift is the shell's header actions (0.00004, out of scope).
- **Motion:** normal motion animates only colours (rows 0.09 s) and the switch knob transform (0.16 s); with reduced motion every transition in the page is 0 s and the placeholder has no animation.

## Not checked or limited

- The preview answered HTTP 500 ("This page could not be loaded", from `<PlatformLayout>`) for a share of loads under the five inspectors' parallel load (30–70 s responses). Those runs were retried; Firefox at Owner 320, 360, 1440 and WebKit Manager 320, 1440 failed three times, so those cells rely on the other two browsers. The error isn't page-specific (the shared layout throws); worth a look by whoever owns the preview.
- Text size: the full load matrix ran at 100 % only (Chromium, WebKit, Firefox, all 8 widths, both roles). At 125–200 % I measured only the 390 placeholder band (200 %), sticky bars at 390 / 200 % (Manager) and the failed-read and Try again cycle at 320 / 200 % (Owner: retry success grows the details card 1089→1177 and the topics 550→1302, CLS-input 0.14). The 125 % and 150 % load-to-ready numbers per width weren’"’"’t measured before hand-off because the preview was answering in 30–70 s; `…/stability/zoom.sh` is ready for the next round.
- WebKit and Firefox have no layout-shift API; their stability numbers are element positions from a per-frame log, not CLS.
- Real device back-forward cache (`pageshow` with `persisted`) wasn't exercised; the fix in ST-01 covers it.

Open P0–P2 in stability: 8

## Round 2

October 19, build at `claude/p35-profile-6cdee8` HEAD 1f29c3b on port 52269. Chromium at 320, 390, 430, 844×390, 1024 and 1440, both roles; WebKit spot checks at 390 and 1440. Text size 100 % except where ST-08 needs it. Fixtures: the session's (reworded topics); `manager-eight` and `manager-expiring` were rebuilt from the new `manager.json`. Evidence: `…/stability/r2/` (frame logs) and `…/stability/r2-*.png`, `ST-*-r2-*.png`.

**Verdict.** The read rhythm is fixed: no load showed a second read or a ready → dash → ready flash (16 Chromium and 4 WebKit loads, plus a deliberate bare `focus`). Blur, offline, a failed refresh and an expired read now hold their space. The landscape band matches, Saving… and save errors move nothing, Try again keeps its width and Show all stays under the finger. Four things are still open, all P2:
- a wrapped email still pushes the page 22 px when the read lands (CLS 0.035 at 390 for both roles; the builder's "0 at 390 Owner" didn't reproduce here);
- an ended session still collapses the details;
- held rows are 0.5 px taller than ready rows because an old phone stylesheet restyles `__note` classes;
- the rem placeholder band is exact at 100 % but 11–22 px off at 125–150 %.

### Round-1 findings

| ID | Status | Measured in round 2 |
|---|---|---|
| ST-01 | **Fixed** | Every load read once, with no flash: Chromium 12 of 12, WebKit 4 of 4. A `focus` with no blur on a ready page: nothing moves, no read (frame log empty). |
| ST-02 | **Open, narrowed (P2)** | Fixed for blur, focus, offline, online, a failed 30 s refresh and an expired read (390 Owner and Manager, 320, 844×390, 1440, WebKit 390). The only movement left is ST-09's 0.5 px per row. Still open: **ready → signed out** (refresh answered 401) clears the held size by design and the Email row collapses 75→53. Pay, Notifications and Sign out move up 22 px (1484→1462), CLS **0.020** at 390 Owner. Screenshot `ST-02-r2-denied.png`. Cause: `manager-profile-live.tsx:246` `setHeld(null)` and `:153` (no `sized` for `denied`). Fix: on an ended session keep the sizes without the values. Before clearing `held`, store the three read rows' and the topic list's rendered heights (numbers only, from a ref measured while ready). Render the denied dash rows and panel with `style={{ minHeight }}` from them, so nothing private stays in the DOM and nothing moves. |
| ST-03 | **Open, narrowed (P2)** | Locations (one line now) and the alert rows (text-shaped placeholders, loading = ready at every width: Owner 368 = 368, Manager 300 = 300, 320: 448 = 448) no longer grow. The wrapped email still does: `owner@northside-qa.example` needs 244 px, and the value column is 222 px at 390, so the row grows 53→75 and Pay and Sign out move +22. Measured: Owner 390 CLS **0.035**, Manager 390 **0.035**, Manager 430 **0.035** (Owner 430 0.0003). 320: +44 (Owner) and +66 (Manager) below the fold, CLS 0.008. 1024: 0.0018 and 0.0020. 844×390 and 1440: 0. WebKit 390 shows the same +22. The same jump follows a successful Try again after a first-load failure. Screenshot `ST-03-r2-email.png`. I can't confirm the builder's "0 at 390/430 Owner": 430 is 0.0003, but 390 is 0.035 in Chromium and +22 px in WebKit, with Inter loaded. Judgement: until Codex supplies `initial`, the most common phone width shifts on every visit for a typical address. Fix, UI only: on cards narrower than 26rem (the `#profile-details` container already exists, `premium-profile.css:108`), put the label above the value for Email (or for all seven rows, for consistency): `@container (max-width: 26rem) { .pmp-details > div { flex-direction: column; } .pmp-details dt { flex-basis: auto; } }`. The value then gets the full 318 px at 390 and 248 px at 320, so a typical address is one line. The loading row (label over dash) is the same height as the ready row. `initial` from the server then covers the rare address wider than the card. |
| ST-04 | **Fixed** | Save answered 401 on rows 0 and 1 at 320, 360 and 390: nothing moves (frame log empty). Slow save at 390: nothing moves while Saving… shows or after it settles. |
| ST-05 | **Fixed** | Try again → Trying again… → Try again at 390, 320 and 1440: the head action keeps 101.9 px at 390 (95.7 px at 1440) and doesn't move. Its left edge stays at 252.1 (390). |
| ST-06 | **Fixed** | Manager with 8 assigned locations, 390: "Show all 8" / "Show fewer" stays at y 615, left edge 132 (width 73→84, left-aligned); the list grows below it. Owner `all` scope is one line with no toggle. |
| ST-07 | **Fixed** | 844×390: placeholder band 104 = real band 104 (Chromium and WebKit hard loads; Chromium client navigation). |
| ST-08 | **Open, narrowed (P2)** | Phone placeholder band is now `6.5rem` (`premium-profile.css:83`). At 100 % it's exact (104 = 104 at 320, 390, 430 and 844×390). The real band doesn't scale as pure rem, though: about 40 px of it is fixed padding, and the summary wraps at 320 from 125 % and at 390 at 200 %. Placeholder vs real: 125 % 130 vs 119 (390) and 149 (320); 150 % 156 vs 134 (390) and 170 (320); 200 % 208 vs 212. So the page jumps −11 to −22 px (390) or +14 to +19 px (320) when it arrives at large text. Screenshot `ST-08-r2-z15.png`. Fix: draw the band's real words in the placeholder, as the alert rows now do. `route-skeleton` for `profile` renders an invisible flat PageBand with the title "Profile" and the summary text (`color: transparent`, text-shaped bars), so it wraps exactly like the real band. The Owner/Manager and employee summaries can be picked by `.employee-shell`. The desktop part of round-1 ST-08 (no placeholder band from 768 up) is the shared rule in `portal-premium.css`, so it goes to the coordinator under the round-2 scope cut and isn't counted here. |

### New finding

#### ST-09 · P2 · Held rows are 0.5 px taller than ready rows, so every pause or failure nudges the page 1–1.5 px

- **Where:** Owner and Manager, phones and 844×390, Chromium and WebKit. Not at 1440.
- **Measured:**
  - Blur at 390: Phone and Locations rows 53→53.5. Pay, Notifications and Sign out move down 1 px (1484→1485) and back on focus. CLS 0.0009 / 0.0007.
  - Offline (Manager 390), failed refresh and expired read: the same +1 px.
  - 844×390: +1.5 px (three rows). 320: +1 px.
  - The held dash also renders at 15 px instead of the 17 px used in the ready and loading rows.
- **Screenshot:** `…/stability/ST-09-r2-held.png`. Measured cells: `.pmp-hold__note` is font-size 15 px, line-height 22.5 px; `.pmp-hold__value` is 22 px.
- **Cause:** `src/app/mobile-workforce.css:69`. The old phone rule `.page-frame :is(small,[class*="__hint"],[class*="__note"]) { font-size: var(--mobile-caption); line-height: 1.5 }` matches the class `pmp-hold__note` used at `manager-profile-live.tsx:155` and `:211`.
- **Fix:** rename the class so it doesn't end in `__note` (for example `pmp-hold-note`, in `manager-profile-live.tsx:155`, `:211` and `premium-profile.css:89–90`). Or add `font: inherit` to `.pmp-hold__note` in `premium-profile.css:89`, and keep `.pmp-topics-note > p` on its own callout font.

### Checked and correct (round 2)

- **Header and band join:** 68/68 with the same colour at 320, 390, 430 and 844×390; desktop band at 93–201 at 1024 and 1440. Chromium and WebKit.
- **Loading → failed and → paused:** the alert list keeps its exact height. Owner panel 360 over rows 368; Manager 292 over 300. 320: 440 over 448. 1440: 340 over 348.
- **Retry:** the head word, the Try again buttons and the panel stay put through pending and failed. The success announcement ("Your details loaded.") is in the status line and changes no geometry.
- **Saving:** slow save, failed save (401) at 320, 360 and 390: frame log empty.
- **1440:** blur, focus, retry and the full load: CLS 0.0001–0.0002, no element moves.
- **Landscape 844×390:** load CLS 0.0005 (no move); held state moves only ST-09's 1.5 px.

Open P0–P2 in stability: 4

## Round 3

October 19, build 7713d75 on port 52269. Hard loads ran in Chromium at 320, 390, 430, 844×390 and 1440 for both roles, and in WebKit at 390 and 430. Pause and return (blur/focus, offline/online) ran at the same widths, plus WebKit at 390. Ready → signed out ran at 320, 390 and 430. The band was checked at 125 % and 150 % through client navigation. Evidence: `…/stability/r3/` and `…/stability/r3-*.png`, `ST-*-r3-*.png`. No background runs are left.

**Verdict.** ST-02 and ST-09 are fixed, with no element moving in any pause, offline, failure or signed-out change. Every load reads once. The Owner page now loads with no movement at 320, 390, 430, 844×390 and 1440. Two items stay open, both narrowed and data- or width-dependent:
- **ST-03:** the Manager fixture's longer address and two-name list still grow at 320 and 430.
- **ST-08:** the band formula is exact at 390 but not at 320, where the summary wraps from 125 %.

| ID | Status | Measured in round 3 |
|---|---|---|
| ST-02 | **Fixed** | Ready → signed out (refresh answered 401): no element moves at 320, 390 (Owner) or 430 (Manager). Only the head word changes (CLS 0.0003–0.0007). |
| ST-09 | **Fixed** | Blur/focus and offline/online at 320, 390, 430, 844×390 and 1440 (Chromium) and 390 (WebKit): every card, the topic list and Sign out keep their exact position. Only the head word changes (CLS ≤ 0.002, the head text alone). |
| ST-03 | **Open, narrowed (P2)** | **Owner:** loading = ready at 320, 390, 430, 844×390 and 1440 (Sign out moves 0; WebKit 390 and 430 also 0). **Manager** (`morgan.rivera@northside-qa.example`, two assigned locations): 390, 844×390 and 1440 move 0, but 2 cells still grow. **430:** the address wraps beside its label (the value column is 262 px, over the 14rem stacking threshold): row 53→75, Pay and Sign out +22, layout-shift value **0.036**; WebKit 430 also +22. **320:** the stacked address still needs two lines (77→99) and "Main Office · West Office" wraps (53→75): Sign out +44, value **0.015**. Chromium flagged both entries `hadRecentInput: true` although the probe sends no input, so a CLS sum that drops input entries reads 0 there. That may be why the builder's probe shows 0; the frame log shows the move. Screenshot `ST-03-r3-manager.png`. Fix: raise the email stacking threshold from 14rem to 17rem (`premium-profile.css` TC-09 rule), so 430 stacks too. The address then has 358 px and fits on one line, the same as loading. The 320 remainder (an address wider than the card, a wrapping location list) can only be removed by Codex's server read as `initial`, which `CODEX.md` now documents. Once `initial` is wired, I'd close this. |
| ST-08 | **Open, narrowed (P2)** | `calc(44px + 3.75rem)` is exact wherever the summary is one line: 390 at 100 % 104 = 104, at 125 % 119 = 119 and at 150 % 134 = 134 (client navigation). At 320 the summary "Your details, pay and alerts." wraps from 125 %. The placeholder is 119 px vs the real 149 px at 125 % (+30 px jump), and 134 px (formula) vs the real 170 px at 150 % (+36). Screenshot `ST-08-r3-320z125.png`. Fix: add the second summary line where it wraps. Because the formula is in rem, the wrap point is a width: the summary is about 14.5em wide, and it wraps when the band's text column (viewport − 32 px) is narrower. One way: `@container`/`@media (max-width: 359px)` → `calc(44px + 5.25rem)`, which also covers 125–200 % at 320. Exact at all sizes would mean drawing the real band words invisibly in the placeholder (round-2 suggestion). |

### Checked and correct (round 3)

- **Hard loads:** every load (13) read once with no flash: `Checking… > ready`.
- **Bands:** placeholder band = real band at 100 %: 104 px at 320, 390, 430 and 844×390 (both roles, Chromium and WebKit). Desktop band 93–201.
- **Owner loads:** no movement at 320, 390, 430, 844×390 and 1440 in Chromium, and at 390 and 430 in WebKit.
- **Alert list:** keeps its height from loading to ready (Owner 368, Manager 300, 320: 448 and 360) and under every note (paused 360 / 292, offline 292, signed out 360 / 292).
- **1440:** load, blur and offline CLS 0.0001.

Open P0–P2 in stability: 2
