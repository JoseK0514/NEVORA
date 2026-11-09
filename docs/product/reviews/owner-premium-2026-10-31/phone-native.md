# Owner on iPhone: motion, touch and the installed app (reviewer 3 of 3)

Date: 2026-10-31. Code: frozen Release 1 (`7b14776a`, `.claude/worktrees/r1-integrate`), served as the owned fictional
preview (`next dev`). Owner: QAOWNER (Carmen Ortiz), fictional data only. Nothing was submitted, saved, approved,
published or deleted. On Add employee I typed fictional values and pressed **Next** (a client-side step), then left
without pressing Add. Every sheet, menu and form was cancelled or closed.

This report builds on `visual-craft.md` and `structure-experience.md` and doesn't repeat them. Where a finding touches
theirs, I cite their letter or ID.

**Engines.** WebKit (Playwright 1.62, the closest to iPhone Safari) at 390×844 with `isMobile` and `hasTouch` is the
primary engine. I spot-checked 320×568 in WebKit. I used Chromium for what WebKit can't do here: CDP touch gestures,
the layout-shift API, the safe-area inset override, and a comparison for exit animations.

**Evidence.** Everything sits under
`/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-mobile/`. The scripts are in that folder and
their output is under `out/` in it. The code paths in this report (`src/...:line`) are relative to
`/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/worktrees/r1-integrate/`.

| Script | What it measures | Output (absolute) |
|---|---|---|
| `probe.mjs` | Header, tab bar, sticky elements, horizontal scroll, tap highlight, `:active` coverage, targets and bottom gap on 42 routes | `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-mobile/out/probe-webkit-p390/probe.json` (+ `*-top.png`, `*-bottom.png`) |
| `motion.mjs` | Per-frame timeline (rAF) and `document.getAnimations()` on tab switches, pushes, menus | `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-mobile/out/motion-webkit-full/timeline.json`, `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-mobile/out/motion-webkit-reduce/timeline.json` |
| `motion2.mjs` | Sheet and menu open/close per frame, swipe-down, history behaviour of back links | `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-mobile/out/motion2-webkit.txt`, `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-mobile/out/motion2-chromium.txt` |
| `clip.mjs` + `marker.mjs` | Video frames (about 40 ms apart) of a tab switch | `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-mobile/out/clips/webkit-tab/f088.png`–`f110.png`, sheet `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-mobile/out/sheet-tabswitch.png` |
| `slow.mjs` | Tab switches with a 2.5 s delay on RSC and fetch | `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-mobile/out/slow-webkit-2500/info.json`, `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-mobile/out/sheet-slow.png` |
| `errors.mjs` | RSC 500 and abort, client APIs at 503 or aborted, offline | `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-mobile/out/errors-webkit/errors.json`, `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-mobile/out/sheet-errors.png` |
| `gestures.mjs`, `backdrop.mjs` | CDP touch: day swipe, re-tapping a tab, sheet swipe-down, scroll-through behind sheets, a failed tab load after 9 s | `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-mobile/out/gestures/gestures.json`, `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-mobile/out/backdrop.txt` |
| `forms.mjs`, `validate.mjs`, `ro.mjs` | Every field on 22 Owner forms; validation styling; read-only field | `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-mobile/out/forms-webkit/forms.json` (+ one PNG per form), `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-mobile/out/validate.txt`, `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-mobile/out/readonly.txt` |
| `pwa.mjs`, `offlinepage.mjs` | Head tags, manifest, icons, the safe-area override (59/34) | `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-mobile/out/pwa/pwa.json`, `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-mobile/out/pwa/icons-sheet.png`, `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-mobile/out/sheet-insets.png`, `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-mobile/out/pwa/offline-page-390.png` |
| `trunc.mjs` | Truncated and wrapped copy, and time formats, at 320 | `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-mobile/out/trunc-webkit-320x568/trunc.json`, `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-mobile/out/sheet-320.png` |
| `press.mjs`, `rows.mjs`, `cls.mjs`, `restore.mjs`, `reach.mjs`, `tcopen.mjs`, `skel.mjs`, `taphl.mjs` | Press rules; row heights; layout shift; scroll restore; where actions sit; timecard sheet open; skeleton colours; tap highlight | `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-mobile/out/press.txt`, `rows.txt`, `cls.txt`, `restore.txt`, `reach.txt`, `tcopen.txt`, `taphl.json` (all in `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/r1-tools/review-mobile/out/`) |

---

## 1. Verdict

**At rest, the Owner phone looks close to native.**
- It has a sticky white header and a fixed tab bar with a hairline.
- Targets are 44 px almost everywhere.
- Safe areas are handled correctly.
- Nothing scrolls sideways at 390 or 320.
- Reduced motion is respected.

**In motion and in the hand, it still behaves like a website.**
- Every tab tap flashes a generic skeleton in a different grey, then hard-cuts to the page.
- Two of the three sheet systems open or close with no motion in WebKit, and they let the page behind scroll.
- Tabs, links and icon buttons have no pressed state.
- Installed on the home screen, it shows a **blue flame** icon, which Jose's logo rule forbids.

**The three biggest gaps:**
1. **iOS will zoom the page when the Owner taps a field.** 99 of 172 text fields, on 19 of 22 forms, are smaller than 16 px.
2. **Motion.** Tab switches flash the skeleton and hard-cut, sheets close with no exit animation, and there is no scroll lock behind sheets.
3. **The installed-app layer.**
   - The icon is the flame.
   - The status-bar colour is dark teal over a white header.
   - `/login` has no manifest.
   - "‹ Back" links push new history entries, so swipe-back loops and scroll position is lost.

---

## 2. Findings by area

Severity: H = High, M = Med, L = Low. Effort: S, M, L. "R1" means Release 1 polish (presentation only); "1.1+" means it needs logic, data or architecture.

### 2.1 Motion and transitions

| # | Current behaviour (evidence) | Proposed change (exact values) | Sev | Eff | Tag |
|---|---|---|---|---|---|
| M1 | **Tab switch flashes a skeleton, then hard-cuts.** Frames `f088`–`f110` (`out/sheet-tabswitch.png`): the tab lights in 1 frame (the pending state from `useLinkStatus`, `src/components/app-shell.tsx:69`). The old page stays about 120 ms. A generic avatar-list skeleton shows about 330 ms. Then Schedule appears with no transition. The timeline shows the same on every tab: Schedule 160→486 ms, Time 115→450, Payroll 110→438, Team 109→441, Home 95→400 (`out/motion-webkit-full/timeline.json`; dev server, so production is shorter, but the boundary still shows). The skeleton is the same Quiet list for every tab: `RouteSkeleton`'s grid and cards shapes are hidden in this shell, and `src/components/route-skeleton.tsx:26` renders `QuietSkeleton`. It also paints **#F2F2F7** behind a #F5F6F6 page, which leaves 16 px bluish side bands (`skel.mjs`: `skBg rgb(242,242,247)`, `pageBg rgb(245,246,246)`). | One corporate skeleton per tab in each `loading.tsx` (markup and CSS only):<ul><li>**Background** transparent, so it inherits #F5F6F6.</li><li>**Title** is the real tab title in text ("Schedule", "Timecards", "Payroll", "Team", "Welcome back"), at 22/28 600 and y = 88, so the title never flashes.</li><li>**Placeholder cards** at their real heights (Schedule: a 108 px week card and a 260 px day card; Time: a 36 px segmented control, a 112 px summary and 4×56 rows; Payroll: 120 + 200; Team: a 48 px search and 8×56 rows).</li><li>**Delayed fade.** Placeholders only, no title: `animation: c-skel-in 160ms ease-out 120ms both` (opacity 0→1), so loads under 120 ms show a calm title and no flash.</li></ul>Content mounts with no animation (iOS tab switches are instant). | M | M | R1 |
| M2 | **Home jumps 80 px after it appears.** Two layout shifts about 450 ms and 500 ms after the tap: the Today card grows from 152 to 258 px as the clock monitor loads, and the cards below move +16 px, then +64 px (`out/cls.txt`; Chromium marks them `hadRecentInput`, so the CLS metric hides them, but they are visible). | Reserve the Today card's final height while its data loads: `min-height: 258px` on the Today card until `/api/manager/clock-monitor` resolves, or render two 56 px placeholder rows of final size. The same applies to Payroll's runs card, which grows 242→720 px on mount (`timeline.json` 5588→5659 ms). | M | S | R1 |
| M3 | **Pushes and pops are hard cuts.** Opening a person: skeleton ~310 ms, then the page with no motion. "‹ Team" re-renders the skeleton (31492→31797 ms) because it is a forward link (see T6). | **1.1+:** directional transitions with View Transitions (Safari 18+ supports same-document transitions; Next 16 has `experimental.viewTransition` and React `<ViewTransition>`):<ul><li>Push: the new page slides in from 100% x, and the old page moves to −30% x with opacity .9, over 350 ms `cubic-bezier(.32,.72,0,1)`.</li><li>Pop: the reverse.</li><li>Reduced motion: a 150 ms cross-fade.</li></ul>**R1:** nothing. A fade alone feels cheaper than a cut. | M | L | 1.1+ |
| M4 | **Three sheet systems, three motions.**<br>(a) **Popover menus** (Schedule "…", Location): open 320 ms `cubic-bezier(.32,.72,0,1)` (good, `out/motion-webkit-full/timeline.json`). On close, **WebKit removes them on the next frame** (about 60 ms, `display:none`, no travel), while Chromium plays a 220 ms exit (`out/motion2-webkit.txt` vs `out/motion2-chromium.txt`). The exit depends on `overlay … allow-discrete` (`src/app/app/portal-motion.css:46`), which WebKit does not animate. Swipe-down follows the finger 1:1, then vanishes on release from the dragged position (`menu swipe-down`: tf240 → gone).<br>(b) **Timecard sheet** (`dialog.cm-tc-sheet`): **0 animations on open** (it appears at top 330 on the first frame, `out/tcopen.txt`) and on close (gone in 46 ms). It has no grabber, swipe-down does nothing (`gestures.json`: `openAfterSwipeDown: true`), and its radius is 12 (`src/app/app/clean-manager/timecards.css:151`).<br>(c) **QuietSheet**: 360 ms in, 240 ms out, a grabber and drag-to-dismiss (`src/components/quiet/quiet-sheet.tsx:26-79`). This is the right one, but the Owner phone barely uses it. | One sheet motion everywhere:<ul><li>**In:** `transform translateY(100%→0)` over 360 ms `cubic-bezier(.32,.72,0,1)`; backdrop `rgba(0,0,0,.34)` fades over 360 ms.</li><li>**Out:** 240 ms `cubic-bezier(.32,0,.67,0)`, driven by JS so it works in WebKit: set `data-closing`, then call `hidePopover()` or `close()` on `transitionend` (fallback timer 260 ms), as `QuietSheet.close` does.</li><li>**Swipe release:** continue from the current `translateY` to 100% over `max(120, 240 × remaining/height)` ms.</li><li>**Timecard sheet:** render it inside `QuietSheet` (grabber 36×5, radius 14 to match the other sheets; the spec's 16 is a token decision).</li></ul> | H | M | R1 |
| M5 | **Reduced motion is respected.** Menus switch to an opacity fade with no travel (`out/motion-webkit-reduce/timeline.json`: `CSSTransition:opacity` 320 ms `ease`). QuietSheet and `.c-btn` drop their transforms (`src/components/quiet/quiet.css:686`, `src/components/corp/corp.css:211`). The menu fade runs 320 ms, although the reduced-motion rule intends 160 ms (`portal-motion.css:142` loses to `--m-sheet-in`). | Make the reduced-motion fade 160 ms `ease-out` in and 120 ms out (set `transition-duration` inside the reduce block for `:popover-open` as well). | L | S | R1 |
| M6 | No flash of unstyled content and no blank frames on any of the 6 sequences recorded (`blank0` on every frame of `timeline.json`). The tab bar and header never re-render. | – | – | – | – |

### 2.2 Scrolling

| # | Current behaviour (evidence) | Proposed change | Sev | Eff | Tag |
|---|---|---|---|---|---|
| S1 | **Tab-root header**: sticky, opaque #FFFFFF, with the hairline `0 1px 0 #E3E5E6` **always on**, no blur, 64 px plus the inset (`src/app/app/corp-shell.css:15-18`; `probe.json` header). There is no large title and no compact title: once the 22 px H1 scrolls under the header, nothing says which tab you're on except the tab bar. | Keep the approved wordmark header and add the iOS scroll-edge behaviour:<ul><li>**Hairline** only when scrolled: an IntersectionObserver on a 1 px sentinel at the top of `.page-frame` sets `data-scrolled` on the header, and `box-shadow: 0 1px 0 #E3E5E6` fades in with `transition: box-shadow 150ms ease-out`.</li><li>**Compact title**: when the H1 is fully under the header, fade in the page title, 17/22 600 #1A1C1E, centred (max-width 180 px), with opacity 0→1 over 150 ms. The wordmark stays.</li></ul>Client-only. | M | M | R1 |
| S2 | **Pushed pages: two header behaviours.** `.c-nav` pages are sticky (More, Things to do, Person, Payroll sub-pages, Insights, Who's working, Hours this week, Find cover). `.q-nav` pages are **static and scroll away**: Settings, Notifications, Time off, Shift requests, Availability, Updates, Locations, Positions, Break types, Clocker tablets, PINs, Punch photos, Scheduling rules, Company profile, Branding, Features, Policies, Profile, My pay, Templates and both recovery pages (`probe.json` `pushedNav.pos`). On Settings scrolled 229 px, the back button and title are gone (`pushedNavTop −229`; Punch photos −1171). | Under `[data-nv-corp]` below 768 px, make `.q-page .q-nav` match `.c-nav`: `position: sticky; top: 0; z-index: 20; background: #FFFFFF; box-shadow: 0 1px 0 #E3E5E6` (plus the S1 hairline-on-scroll rule). | M | S | R1 |
| S3 | **Tab bar**: fixed, #FFFFFF, `0 -1px 0 #E3E5E6`, no blur, 56 + 4 px plus the inset (90 px with a 34 px home indicator). It matches the board. | Optional, within the board: `background: rgba(255,255,255,.92); -webkit-backdrop-filter: saturate(180%) blur(20px)` on the tab bar and the sticky headers. At rest it looks identical; content passing under it reads as iOS material. | L | S | R1 |
| S4 | **Nothing scrolls sideways.** `overflowX` is 0 and there are no horizontal scrollers on all 42 routes at 390 and at 320 (`probe.json`, `trunc.json`). | – | – | – | – |
| S5 | **Sheets don't lock the page behind.** A touch drag on the dim area above the timecard sheet scrolls the page to the bottom (0→194), and the same happens over the Schedule menu (0→164) (`out/backdrop.txt`). `html` stays `overflow: clip visible`. Only QuietSheet locks the page (`src/components/quiet/quiet.css:669`, `html[data-q-sheet]{overflow:hidden}`). Scrolling *inside* the sheets is contained (`overscroll-behavior: contain`). | Set the same `data-q-sheet` attribute on `<html>` whenever any modal dialog or sheet-popover is open (on toggle and on close), so every sheet locks the page. | M | S | R1 |
| S6 | **Nothing sticks inside pages.** The Schedule week strip is `position: static` (`schedscroll.mjs`). Today's pages are short ("Show 4 more" keeps Monday to one screen), so this is fine. | Leave as is for R1. If the day list ever exceeds a screen, make the week card `position: sticky; top: calc(64px + env(safe-area-inset-top))`. | L | S | – |
| S7 | **Space above the tab bar varies**: 13 px (Punch photos), 29 (Settings), 40 (c-nav pages), 48 (Pay history), 49 (Team) (`probe.json` `bottom.gap`). Time scrolls 20 px with nothing below. | One value: the last card ends 24 px above the tab bar. Use `.page-frame { padding-bottom: calc(60px + 24px + env(safe-area-inset-bottom)) }` and `margin-bottom: 0` on the last child. | L | S | R1 |
| S8 | **Rubber-band edges.** The `html` background is #F5F6F6 (`corp-shell.css:6-7`), so pulling down on a tab root shows a grey band above the white header. | `html { background: #FFFFFF }`, with `.app-main` and `.page-frame` keeping #F5F6F6 at `min-height: 100dvh`. Both bounce edges then meet white chrome. Confirm on device. | L | S | R1 |
| S9 | **Re-tapping the active tab does nothing.** Team scrolled to 132 stays at 132 (`gestures.json`). From a pushed page, the tab returns to the root (good). | When `pathname === tab.href`: `preventDefault()` and `scrollTo({top: 0, behavior: reduced ? 'auto' : 'smooth'})`. | M | S | R1 |

### 2.3 Touch

| # | Current behaviour (evidence) | Proposed change | Sev | Eff | Tag |
|---|---|---|---|---|---|
| T1 | **Grey tap flash on labels, summaries and fields.** `globals.css:77` sets `-webkit-tap-highlight-color: transparent` only on `button, a`. `html` computes `rgba(0,0,0,.4)`, the WebKit default, so 190 controls flash a dark box on tap: Scheduling rules 87, Time exports 47, Payroll settings 19, Features 10, Policies 9, Punch photos 6, Positions 4, Profile's 2 `summary` rows, and the search labels (`probe.json` `tapHL`, `out/taphl.json`). | `html { -webkit-tap-highlight-color: transparent }`, paired with T2's pressed states so taps still answer. | M | S | R1 |
| T2 | **Taps get no answer.** Elements with no `:active` rule (`probe.json` `noActive`): Home 7 of 16, Schedule 20 of 25, Time 10 of 17, Payroll 7 of 17, Team 8 of 23. That includes every tab-bar item, `c-link` ("See all", "Who's working"), the Schedule "…", the week arrows, "All locations", the day buttons, the segmented controls, and the `c-nav` and `q-nav` back links. The bell and avatar have an `:active` of `rgba(255,255,255,.18)` on white, which can't be seen (`out/press.txt`). Rows have `#F7F8F8` on white (`corp.css:61`), a 1% luminance change. | <ul><li>**Rows** (`.c-row`, `.q-row`): `:active { background: #EDEEEF; transition: none }`, fading back with `transition: background-color 200ms ease-out`.</li><li>**Text links, back links, tab items, bell and avatar:** `:active { opacity: .55 }`, back over 150 ms `ease-out`.</li><li>**Icon, select and day buttons:** `:active { background: #EDEEEF }` (radius 8; day circles 20).</li><li>**Segmented control, unselected segment:** `:active { background: rgba(26,28,30,.04) }`.</li><li>**Filled `.c-btn`:** keep `scale(.98)` over 120 ms and add `:active { background: #095C58 }`.</li></ul>Under reduced motion: no scale; the colour change stays. | M | S | R1 |
| T3 | **Long-press shows link menus and selects chrome.** No `-webkit-touch-callout: none` and no `user-select: none` on the shell or kit; the only rule is at `globals.css:2018`. Body `user-select` is `text`. So long-pressing a row or tab opens Safari's link preview (with the URL), and long-pressing a label selects text. | `.mobile-nav, .mobile-header, .c-nav, .q-nav, .c-row, .q-row, .c-btn, .c-seg, .c-link { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none }`. Content text stays selectable. Confirm on device. | L | S | R1 |
| T4 | **Targets.** 44 px nearly everywhere. Exceptions: Pay history "View" (51×20) and "Download" (87×20), ×10; Time exports "Review timecards" (112×41); 1×44 visually hidden buttons on Team ("Apply search") and Branding ("Save brand") (`probe.json` `small`). | Pay history becomes one row per statement (visual-craft, Payroll table). Otherwise `min-height: 44px` on those links. Check that the 1 px buttons are meant to be screen-reader-only and aren't focusable dead ends. | L | S | R1 |
| T5 | **Thumb reach.** Tab-root actions sit top-right: Publish at y = 80, Add at 74, Select at 80 (`out/reach.txt`). That follows iOS convention and is acceptable. On the two shift forms the same Save sits top-right at y = 4 **and** bottom-full-width at y = 612 / 574 (visual-craft L already flags the duplicate). | On **phone**, keep the bottom full-width "Save changes" / "Save shift" (in thumb reach) and drop the header Save on these two forms only. Other forms keep Save top-right, per iOS. | L | S | R1 |
| T6 | **Back links fight swipe-back.** "‹ Team" and More's "Done" are `<Link href>` forward pushes. History goes 5 → 7 after Person → "‹ Team", and the system back (Safari's edge swipe) then returns **to the person page**, a loop (`out/motion2-webkit.txt` `history`). More "Done" goes 7 → 9 and lands on `/app`. A back link also **drops scroll position**: Team at 300 becomes 0 via "‹ Team", but stays at 300 via the system back (`out/restore.txt`). | A `BackLink`: if the previous in-app path (kept in `sessionStorage` on each navigation) equals `href`, call `router.back()`, which restores scroll and adds no entry. Otherwise `router.replace(href)`. Use it for `.c-nav__back`, `.q-nav__l` and More's "Done". Client-only. | M | S | R1 |
| T7 | **Gestures, in the code and in the browser.**<ul><li>**Swipe-to-dismiss:** popover menus (`src/components/sheet-gestures.tsx`) and QuietSheet; *not* the timecard sheet (M4).</li><li>**Swipe-back:** none in the app; Safari's edge swipe applies (T6).</li><li>**Pull-to-refresh:** none in the code. Safari in a tab has its own; the installed app has none. Mitigated by `visibilitychange` refreshes in `manager-today.tsx`, `manager-action-center.tsx` and `timecards.tsx`.</li><li>**Swipe between days on Schedule:** none. A 290 px horizontal swipe on the day list leaves the day unchanged (`gestures.json`).</li></ul> | **1.1+:**<ul><li>**Day swipe** on the Schedule day card: horizontal, threshold 60 px or velocity > .3 px/ms, vertical lock after 10 px, the card follows the finger, then a 240 ms `cubic-bezier(.32,.72,0,1)` settle. The day buttons stay as the button alternative.</li><li>**Pull-to-refresh** in standalone only (`matchMedia('(display-mode: standalone)')`): pull > 64 px at `scrollY = 0` calls `router.refresh()`, with a 20 px spinner under the header. "Try again" stays the button alternative.</li></ul> | M | M | 1.1+ |

### 2.4 Forms and keyboard

Measured on 22 Owner forms (`out/forms-webkit/forms.json`). The per-field table is in §3.

| # | Current behaviour (evidence) | Proposed change | Sev | Eff | Tag |
|---|---|---|---|---|---|
| F1 | **iOS zooms on focus.** 99 of 172 text, select, date and textarea fields are **15 px**, on 19 of 22 forms. Only Clocker PIN (16), Company policies (17) and Scheduling rules (17) are safe. The cause is the kit input `.c-in { font-size: 15px }` (`src/components/corp/corp.css:156-157`); `.q-in` inherits 15 too. Safari zooms the page on any field under 16 px and stays zoomed after blur. | `.c-in, .q-in, .c-page :is(input, select, textarea) { font-size: 16px; line-height: 20px }` below 768 px. That is 1 px off the 15 px body text, which no one will see, and it removes the zoom on every form. Don't use `maximum-scale=1`, which blocks pinch-zoom on Android. | H | S | R1 |
| F2 | **No `enterkeyhint` on any Owner field** (0 of 172). The only use in the codebase is the Locations search (`src/app/app/settings/locations/locations-search.tsx:14`). | `enterkeyhint="next"` on every field except the last; `"done"` on the last; `"search"` on search; none on multi-line textareas (Return makes a newline). Pressing Return on a "next" field moves focus to the next field (a 6-line form helper). | M | S | R1 |
| F3 | **Return can submit the whole form.** New location, Edit location and Company profile put their submit button in the header with `form="…"` (`src/app/app/settings/locations/new/page.test.tsx:34` asserts `type="submit" form="new-location-form"`). HTML implicit submission makes Return or "Go" in a text field press it. **Not tested**, because it would create data. | With F2's helper, Return moves to the next field, and the last field's "done" only blurs (`event.preventDefault()` on Enter in text inputs inside these forms). Submission happens only from the Save, Add or Next buttons. | M | S | R1 |
| F4 | **AutoFill offers the wrong person.**<ul><li>Add employee: `given-name`, `family-name`, `tel-national` and `email` (`src/components/company-access/new-employee-form.tsx:34-37`), so iOS suggests the **Owner's own** contact card for a new hire.</li><li>Account recovery, Employee ID: `autocomplete="username"`, so iOS offers the Owner's saved NEVORA username.</li><li>Clocker PIN: `type=password autocomplete="new-password"` (`src/components/clocker-pin-form.tsx:93`), so iOS can offer a Strong Password for a 4-digit PIN.</li></ul> | `autocomplete="off"` on fields about *another* person (Add employee 1, Account recovery ID), as Edit employee already does. PIN: `type="text" inputmode="numeric" autocomplete="off" style="-webkit-text-security: disc"`, plus `autocorrect="off"`. Confirm on device. | M | S | R1 |
| F5 | **Number fields bring up the full keyboard.** `type=number` with no `inputmode` in Scheduling rules (52 fields), Payroll settings (`paydayOffset`, reminder window) and Time exports, so iOS opens the full keyboard in numbers mode. | `inputmode="numeric"` for counts and days, and `"decimal"` for hours. Keep `type=number` only where a stepper is wanted (none on phone). | L | S | R1 |
| F6 | **Validation.** Pressing "Next" on an empty Add employee flags **only First name**, although Last name, Phone and Location are also missing. The message is 15/400 #1A1C1E with a disc bullet (`display:flex; list-style: disc`), not the kit `.c-error`. The field gets **two rings**, a 2 px teal outline and a 2 px red inset (`out/validate.txt`, `out/forms-webkit/Add_employee_empty_next.png`). `reportValidity()` (`new-employee-form.tsx:20`) can also raise iOS's native bubble. | Flag all invalid fields at once and focus the first. Use one message style: `.c-error` 13/18 #B42318 with no bullet and 4 px above. Invalid and focused: `outline: 0; box-shadow: inset 0 0 0 2px #B42318`. Replace `reportValidity()` with `setCustomValidity` plus the inline message, so no native bubble shows. | M | S | R1 |
| F7 | **Native date and time inputs.** Add and Edit shift use `<select>` for Date, Start and End, which gives the iOS wheel: good. `datetime-local` appears in New update "Expires" and the Schedule menu deadline (at 15 px, so it zooms; visual-craft shows the empty "mm/dd/yyyy, --:-- --"). Payroll settings dates are `type=date` at 16 px, which is fine. | 16 px (F1). For "Expires", keep the "Expires · Never ›" row and open a sheet with "Never / End of today / End of tomorrow / Pick a date" (the picker is the native `type=date` plus a time `<select>`). | L | S | R1 |
| F8 | **Read-only field looks editable.** Edit shift "Location" is `readonly` but drawn like an input: white, with a 1 px #D5D8DA ring (`out/readonly.txt`). | Render it as a value row ("Location · Condado") or as `background: #F5F6F6; box-shadow: none`. | L | S | R1 |
| F9 | **One-line fields as textareas.** Company profile "Business name" is a `<textarea>` 50 px tall, so Return inserts a newline into a company name (`forms.json`). | `<input type="text" autocomplete="organization" enterkeyhint="done">`. | L | S | R1 |
| F10 | **Clocker recovery asks for a 36-character code typed on a phone**: `pattern` 8-4-4-4-12 hex, 15 px, no `autocorrect="off"` (`src/components/clocker-recovery-review.tsx:137-139`). | **R1:** a "Paste" button inside the field (the kit's `.c-in__btn`, which calls `navigator.clipboard.readText()` on tap), plus `autocorrect="off"` and 16 px. **1.1+:** an 8-character code or a QR scan. | M | S / M | R1 / 1.1+ |
| F11 | **The tab bar shows on some forms but not others.** It is hidden on Add employee, Add and Edit shift, New location, New update and Clocker PIN. It is shown on Edit location, Company profile, Policies, Branding, Positions, Break types, Payroll settings, both recovery pages and **Delete account** (`forms.json` `tabbar`). | Hide the tab bar on any page whose header has Cancel or Save (a `data-form` flag on the page, read by the shell CSS). | L | S | R1 |
| F12 | **Keyboard cover (code only).** `html` has `scroll-padding-bottom: tab bar + 16px` (`src/app/app/portal-gusto.css:372, 536`) but `scroll-padding-top: 12px`, while the sticky form headers are 52 to 60 px. A field that iOS scrolls into view can land under the sticky header. | `html { scroll-padding-top: calc(64px + env(safe-area-inset-top)) }` below 768 px. Confirm on device. | L | S | R1 |

### 2.5 Installed home-screen app (PWA)

| # | Current behaviour (evidence) | Proposed change | Sev | Eff | Tag |
|---|---|---|---|---|---|
| P1 | **The home-screen icon is a blue flame.** That covers `fuel-apple-180.png`, 192, 512 and both maskable icons (`out/pwa/icons-sheet.png`). Jose's logo rule says the NEVORA wordmark, "no flame icon" (memory `dont-overwhelm-real-logo`). The icon is the first and most-seen pixel of the installed app. | A #FFFFFF tile with the real wordmark (`public/images/nevora-wordmark.png`) centred at 72% of the tile width. At 60 pt the WORKFORCE line would render at about 3 pt, so leave it off the icon (**needs Jose's OK**). Export apple 180, 192, 512 and maskable versions with a 20% safe zone. | H | S | R1 |
| P2 | **The status-bar colour clashes with the header.** `theme-color` is #1C4A47 (dark teal, from the brand masthead, `src/app/app/layout.tsx:63-65`; the manifest's `theme_color` is the same). The corporate header is #FFFFFF. In Safari, `theme-color` tints the area above the page, which gives a dark teal band over a white header. `apple-mobile-web-app-status-bar-style` is `default` (`out/pwa/pwa.json`). | Under the corporate shell: `themeColor: '#FFFFFF'`, manifest `theme_color: '#FFFFFF'`, `background_color: '#FFFFFF'`. Keep the status bar at `default` (opaque, dark text); the insets already work if it ever becomes `black-translucent` (P5). Confirm on device, because iOS 26 Safari may sample the page instead. | M | S | R1 |
| P3 | **Installing from the sign-in page gets a bare bookmark.** `/login` has only `viewport` and `description`: no manifest, no `apple-touch-icon`, no `apple-mobile-web-app-title` (`pwa.json`). `/apple-touch-icon.png` and `/favicon.ico` return 404. The sign-in page is where a new Owner most likely taps "Add to Home Screen". | Move `manifest`, `icons.apple` and `appleWebApp` from `src/app/app/layout.tsx:54-60` into the root layout (excluding the Clocker), and add `public/apple-touch-icon.png` (the P1 artwork). | M | S | R1 |
| P4 | **An expired session leaves the app.** The manifest has `scope: "/app"` (`src/lib/notifications/manifest.ts:17`). When the session expires in the installed app, `/login` is out of scope, and iOS shows it in an in-app browser sheet; after signing in, the Owner can stay in that sheet. **Device only.** | Manifest `scope: "/"`, keeping `start_url: "/app"`. The service worker keeps its own `/app` scope. | M | S | R1 |
| P5 | **Safe areas pass.** With a CDP inset override of 59 top and 34 bottom: tab-root header top padding 67 px (59 + 8), `.c-nav` 67, `.q-nav` 59, Edit shift's head 59, tab bar bottom padding 34, timecard sheet and Schedule menu bottoms clear the home indicator (`out/sheet-insets.png`, `out/sheet-inset-bottoms.png`). `viewport-fit=cover` is set. | – | – | – | – |
| P6 | **Launch is a white flash.** There is no `apple-touch-startup-image`, so iOS shows white, then the #F5F6F6 canvas paints. | With P1/P2's white chrome this is mostly hidden. Optional: startup images for 1179×2556, 1290×2796 and 750×1334 (white, wordmark centred). | L | M | R1 |
| P7 | **Standalone mode.** 0 `display-mode` rules and no `navigator.standalone` use. Every pushed page has its own back or Cancel, so the missing browser back button is covered, apart from the history loop in T6, which matters most here. | T6. | – | – | – |
| P8 | **Offline.**<ul><li>The service worker is registered only when the Owner turns on alerts (`src/lib/notifications/device-client.ts:415`), so an offline launch otherwise shows iOS's own error.</li><li>With the worker, the offline page is the **old Signature design with the flame logo**: a dark band, an orb, 36 px light type and an icon tile (`public/fuel-portal-offline.html`, `out/pwa/offline-page-390.png`).</li><li>In the app, tapping a tab while offline **replaces the page** with "View paused · Return to this window while online… · Refresh current view" in Quiet styling: #6B6B6B text and a 50 px #F2F2F0 button (`out/errors-webkit/offline-tab.png`, `src/components/quiet/quiet.css:601-605`).</li></ul> | **R1:**<ul><li>Restyle the offline HTML on corporate tokens: the #F5F6F6 page, one white card (radius 12), "You're offline" at 17/600, "Reconnect, then try again." at 13/18 #6B7075, a 44 px neutral "Try again", and the wordmark only.</li><li>Keep the loaded page when offline, with a 36 px #F5F6F6 banner under the header: "You're offline. Showing what was loaded."</li><li>Move the paused state to corporate tokens.</li></ul>**1.1+:** register the worker for every installed user. | M | S / M | R1 / 1.1+ |

### 2.6 Loading, empty and error states on the phone

| # | Current behaviour (evidence) | Proposed change | Sev | Eff | Tag |
|---|---|---|---|---|---|
| L1 | **Normal network:** a generic skeleton about 330 ms on each tab (M1). **With 2.5 s on RSC:** the old page stays for the full 2.5 s, and only the tab colour changes (structure-experience "States" already notes this; my frames are in `out/sheet-slow.png`). | After 300 ms pending, show a 2 px #0B6E69 progress bar under the header: an indeterminate 30%-wide bar moving `translateX(-100%→330%)` over 1.2 s, linear, infinite. Under reduced motion, a static 30% bar. Plus M1's page-shaped skeleton. | M | S | R1 |
| L2 | **A failed tab load never ends.** With the Team RSC aborted, the page shows the skeleton for 9 s and more, with no message and no Try again; only another tab gets the Owner out (`out/gestures/rsc-abort-9s.png`). The "Current view needs a fresh check" copy is in the DOM but not visible (`src/components/company-access/scoped-read-frame.tsx:15, 179`). | After 2.5 s (the existing `STUCK_MS`), replace the skeleton with the error card from L3: "Couldn't load Team" / "Check your connection, then try again." / Try again (`router.refresh()`). | H | S | R1 |
| L3 | **Three error designs, and one false claim.**<ul><li>**Home**, with its 4 APIs at 503: Today and Things to do show a plain line plus an outlined teal "Try again", and the **Payday card says "All timecards approved"** (`owner-home-corp.tsx:89` falls back to that text whenever the list is empty, including when it failed to load). Normally it reads "3 timecards to approve".</li><li>**Payroll:** a small card, "Payroll could not load."</li><li>**Timecards:** a bold title, a body line and a button (`out/sheet-errors.png`).</li></ul> | **One error card:**<ul><li>a `.c-card` with padding 16;</li><li>a 15/600 #1A1C1E title ("Couldn't load timecards");</li><li>a 13/18 #6B7075 line ("Check your connection, then try again.");</li><li>a 32 px `.c-btn--neutral` "Try again".</li></ul>**Payday:** when the timecards source failed, leave out the count detail and show "Review timecards". | H | S | R1 |
| L4 | **Empty states:** visual-craft K covers them; on the phone they match (Updates, Notifications, Time off, Shift requests and My pay show a bare line). | Visual-craft K. | – | – | – |

### 2.7 Phone visual polish the others missed

| # | Current behaviour (evidence) | Proposed change | Sev | Eff | Tag |
|---|---|---|---|---|---|
| V1 | **Header**: the wordmark on every tab, with the 22 px H1 underneath (approved board C-Owner). The chrome takes 123 + 90 = 213 px of 844 (25%) with real insets (`pwa.json`). | Keep. Add the compact title on scroll (S1). Optional: trim the header's bottom padding from 12 to 8 px. | L | S | R1 |
| V2 | **Four row heights.** 44 px on More (×12), 52 on Settings (×14), Profile, Home's to-do rows and Payroll settings, 56 in Team, Time, Payroll and PINs, and 60 for Home's first row (`out/rows.txt`). **More and Settings list the same settings at 44 and 52.** | One-line rows 52, two-line rows 56 (the kit). More's rows go to 52. | L | S | R1 |
| V3 | **Copy at 320** (`trunc.json`, `out/sheet-320.png`):<ul><li>The Company policies nav title reads "Company polici…" (138/141 px), squeezed between "‹ Settings" and "Save".</li><li>Names are truncated by pills on Time ("Alexandra …", 99/120) and Employee PINs (110/120).</li><li>Clocker tablets location names are cut at 114 px.</li><li>Home's setup line is cut mid-word: "1 of 2 steps done · Next, set weekly hou…" (228/294).</li><li>More to review and Access detail lines are cut.</li><li>Person "Barista · Condado" wraps in a 100 px column.</li></ul> | <ul><li>Below 360 px, the back label collapses to the chevron only: `.c-nav__back span, .q-nav__l span { display: none }`, with `aria-label` kept.</li><li>Meaningful detail lines get 2 lines (`-webkit-line-clamp: 2`) instead of one with an ellipsis.</li><li>Below 360 px, status pills move onto the detail line (or go away, per visual-craft I).</li></ul> | M | S | R1 |
| V4 | **Time formats.** On the phone, Activity says "midnight – 6:00 AM" and "8:00 PM – midnight", while Things to do says "12:00 AM – 8:00 AM" for the same 00:00 (`trunc.json` `TIMES`). This extends structure-experience S4. | Use one word for 00:00 in rows: "12:00 AM" (and "12:00 PM"). Keep "midnight" only in sentences. | L | S | R1 |

---

## 3. Per-form field table

Measured in WebKit at 390 (`out/forms-webkit/forms.json`). "–" means the attribute is absent. Every 15 px field gets the same fix, F1 (16 px), and every field without a hint gets F2's `enterkeyhint`. The **Fix** column lists what changes beyond those two.

| Form (route) | Field | Font | type | inputmode | autocomplete | enterkeyhint | Fix (beyond F1/F2) |
|---|---|---|---|---|---|---|---|
| Add employee, step 1 (`/app/employees/new`) | First name | 15 | text | – | given-name | – | `autocomplete="off"`, `autocapitalize="words"`, `next` |
| | Last name | 15 | text | – | family-name | – | `off`, `words`, `next` |
| | Mobile phone | 15 | tel | tel | tel-national | – | `off`, `next` |
| | Email (optional) | 15 | email | – | email | – | `off`, `inputmode="email"`, `done` |
| | Role / Location | 15 | select | – | – | – | 16 px only |
| Add employee, step 2 | Employee ID | 15 | text | – | – | – | `autocapitalize="characters"` and `spellcheck=false` already set. Add `autocorrect="off"`, `done` |
| Edit employee / Edit own profile (`?edit=1`) | First, Last, Phone, Email | 15 | text / tel / email | tel on phone | off | – | `words` on names, `next` / `done` |
| | Role / Location | 15 | select | – | – | – | 16 px |
| Add shift (`/app/schedule/new`) | Person, Location, Position, Date, Start, End | 15 | select | – | – | – | 16 px. Selects give the iOS wheel; keep |
| | Note | 15 | textarea | – | – | – | `enterkeyhint="done"` |
| Edit shift (`/app/schedule/edit`) | Location | 15 | text (readonly) | – | – | – | Show as a value row (F8) |
| | others | 15 | select / textarea | – | – | – | As Add shift. Drop the header Save on phone (T5) |
| Clocker PIN (`…/clocker-pin`) | New PIN / Confirm PIN | **16** | password | numeric | new-password | – | `type="text"`, `-webkit-text-security: disc`, `autocomplete="off"`; `next` / `done` |
| New location (`/app/settings/locations/new`) | Name, Short name | 15 | text | – | off | – | `next`; Return must not submit (F3) |
| | Clocker key | 15 | text | – | off | – | `autocapitalize="none"` already set. Add `autocorrect="off"`, `done` |
| Edit location (`…/locations/loc-1`) | Name, Short name | 15 | text | – | off | – | As New location; hide the tab bar (F11) |
| New update (`/app/updates/compose`) | Title | 15 | text | – | – | – | `next` |
| | Message | 15 | textarea | – | – | – | No hint: Return makes a newline |
| | Expires | 15 | datetime-local | – | – | – | Preset sheet (F7) |
| | Send to / Update type | **17** | select | – | – | – | 16 px for consistency |
| Company profile (`/app/settings/workspace`) | Business name | 15 | **textarea** | – | organization | – | `<input type=text>`, `done` (F9) |
| Company policies | Applies to | 17 | select | – | – | – | OK |
| Branding | Upload | 15 | file | – | – | – | n/a (a native picker) |
| Positions | name (per row) | 15 | text | – | off | – | `done`; label each "Position name" |
| Payroll settings (`/app/settings/payroll`, expanding rows) | Payday offset | 15 | number | – | – | – | `inputmode="numeric"`, `done` |
| | Periods start / Effective from | 16 | date | – | – | – | OK |
| | Reminder window | 15 | number | – | – | – | `numeric` |
| | Company name (documents) | 15 | text | – | – | – | `autocomplete="organization"`, `done` |
| | Reason | 15 | text | – | – | – | `done` |
| | Frequency, languages, employee, recipient | 15 | select | – | – | – | 16 px |
| Scheduling rules (`/app/schedule/settings`) | 52 hour and quantity fields | 17 | number | – | – | – | `inputmode="decimal"` (hours) or `"numeric"` (quantities) |
| | Start / End time | 17 | time | – | – | – | OK (native wheel) |
| | Availability deadline | 17 | datetime-local | – | – | – | Preset sheet (F7) |
| | Find a person | 17 | search | – | – | – | `search` |
| Time exports (`/app/payroll-export`, custom layout) | Column names, provider fields | 15 | text / number / textarea | – | – | – | 16 px, `done`, `inputmode="numeric"` on the number |
| | Period dates | 16 | date | – | – | – | OK |
| Clocker recovery (`/app/clocker-recovery`) | Code from the tablet | 15 | text (36 chars) | – | off | – | Paste button, `autocorrect="off"` (F10) |
| Account recovery (`/app/account-recovery`) | Employee ID | 15 | text | – | **username** | – | `autocomplete="off"`, `autocorrect="off"`, `done` |
| | How you checked | 17 | select | – | – | – | OK |
| Delete account (`/app/account/delete`) | Password | 15 | password | – | current-password | – | `done`; hide the tab bar (F11) |
| Team search (`/app/employees`) | Search employees | 15 | search | – | – | – | `search` |
| Templates | Name | 15 | text | – | – | – | `done` |
| Punch photos | Keep photos for (days) | 15 | number | numeric | – | – | `done` |
| | Assistance contact | 15 | text | – | off | – | `type="tel"` or `email` if it holds one; `next` |
| | Assistance instructions | 15 | textarea | – | – | – | – |

---

## 4. Top 12 phone upgrades (premium impact per effort)

| # | Upgrade | Values | Sev | Eff | Tag |
|---|---|---|---|---|---|
| 1 | **Stop iOS zooming on every form** | Fields at 16 px below 768 px (`.c-in`, `.q-in`, page inputs) (F1) | H | S | Release 1 polish (presentation only) |
| 2 | **A real NEVORA home-screen icon and chrome colour** | Wordmark tile instead of the flame (needs Jose's OK on the tile); `theme-color` and manifest #FFFFFF; manifest, apple icon and title on `/login` too; root `/apple-touch-icon.png` (P1–P3) | H | S | Release 1 polish (presentation only) |
| 3 | **Failed loads say so, and Home never claims "All timecards approved" on a failure** | Skeleton → error card after 2.5 s; one error card pattern; Payday detail hidden when its source failed (L2, L3) | H | S | Release 1 polish (presentation only) |
| 4 | **Every tap answers** | `html` tap highlight transparent; `:active` on rows #EDEEEF (0 ms in, 200 ms out), links, tabs and header icons at opacity .55, icon and day buttons #EDEEEF; touch-callout and user-select off on chrome (T1–T3) | M | S | Release 1 polish (presentation only) |
| 5 | **One sheet that moves like iOS** | In 360 ms `cubic-bezier(.32,.72,0,1)`, out 240 ms `cubic-bezier(.32,0,.67,0)` driven by JS (fixes the instant close in WebKit); timecard sheet on QuietSheet with grabber and swipe-down; page locked behind every sheet (M4, S5) | H | M | Release 1 polish (presentation only) |
| 6 | **Back that behaves like back** | `BackLink` → `router.back()` when the parent is the previous entry; More "Done" the same. No history loop, scroll restored (T6) | M | S | Release 1 polish (presentation only) |
| 7 | **Calm tab switches** | Page-shaped corporate skeletons with the real title, transparent background (no #F2F2F7 bands), placeholders fading in after 120 ms; Home and Payroll cards reserve their final height; 2 px progress bar after 300 ms pending (M1, M2, L1) | M | M | Release 1 polish (presentation only) |
| 8 | **Headers that stay and tell you where you are** | `.q-nav` sticky like `.c-nav`; hairline only when scrolled; compact 17/600 title fades in on tab roots once the H1 scrolls under; re-tap the active tab to scroll to top (S1, S2, S9) | M | S–M | Release 1 polish (presentation only) |
| 9 | **Keyboard that fits the field** | `enterkeyhint` on all fields, Return moves to the next field and never submits, `inputmode` numeric or decimal, AutoFill off for another person's fields, PIN not a password field, Business name a single-line input (F2–F5, F9) | M | S | Release 1 polish (presentation only) |
| 10 | **Validation in one voice** | All missing fields flagged at once, `.c-error` 13/18 #B42318 with no bullet, a single red ring, no native bubble (F6) | M | S | Release 1 polish (presentation only) |
| 11 | **Offline on brand** | Corporate offline page with no flame; offline banner over the loaded page instead of replacing it; paused state on corporate tokens (P8) | M | S | Release 1 polish (presentation only) |
| 12 | **Native gestures and transitions** | Directional push and pop with View Transitions (350 ms), day swipe on Schedule with buttons kept, pull-to-refresh in standalone, service worker for every installed user, an 8-character or QR Clocker code (M3, T7, P8, F10) | M | L | 1.1+ |

Smaller R1 items after these: the 320 copy fixes (V3); one row height (V2); 24 px above the tab bar (S7); white rubber-band edges (S8); hiding the tab bar on forms (F11); the read-only Location (F8); `scroll-padding-top` (F12); the reduced-motion fade at 160 ms (M5).

---

## 5. Not checked

- **Things only Jose's iPhone can confirm.**
  - **Focus zoom:** that it disappears at 16 px (F1).
  - **Keyboard cover:** whether the keyboard covers fields, and whether sticky headers jump while it is open (F12).
  - **Return key:** whether Return or "Go" submits New location (F3; deliberately not tested).
  - **AutoFill:** the suggestions on Add employee, Account recovery and the PIN (F4).
  - **Native bubble:** whether `reportValidity()` shows one (F6).
  - **Long-press:** the link preview and text selection (T3).
  - **Edge swipe:** whether it works in the installed app at all, and the loop (T6).
  - **Top-edge pull:** Safari's pull-to-refresh, and the rubber-band colour (S8).
  - **Toolbar tint:** how iOS 26 Safari tints the toolbar and status area with `theme-color` (P2).
  - **Expired session:** the out-of-scope `/login` sheet in standalone (P4).
  - **Launch:** the launch flash (P6).
  - **Scroll-through:** whether touches behind sheets scroll the page (S5; reproduced in Chromium touch emulation only).
  - **Feel:** the real feel of the 360 / 240 ms sheet curves at 120 Hz, and whether `:active` fires on touch in iOS without a `touchstart` listener (React's root listeners should cover it).
- **Not reproducible here.** Playwright WebKit has no on-screen keyboard, no `display-mode: standalone` emulation (CDP `setEmulatedMedia` didn't match it in Chromium either) and no rubber-band. Safe areas were emulated through Chromium's CDP override only.
- **Production timing.** The preview runs `next dev`. Skeleton durations (about 330 ms) will be shorter in production, but the loading boundary and the hard cut are structural.
- **Not covered.**
  - **Landscape**, and 200% text or Dynamic Type (already the first item for 1.1).
  - **Gesture coverage:**
    - VoiceOver gestures and the screen-reader order.
    - QuietSheet drag on WebKit with real touch: the Owner reaches it rarely, and I found no Owner row that opens it.
    - Swipe-down on popover menus with CDP touch in Chromium: it snapped back after 20 px, while the WebKit mouse-pointer drag worked.
  - **Data the fixture doesn't have:**
    - Any state after a submit (save, publish, approve, PIN set), so success toasts and post-save transitions are unseen.
    - Schedule draft state and Find cover with an available person: not in the fixture.
  - **Popovers:** the desktop popovers and the bell popover; this is a phone-only review.
