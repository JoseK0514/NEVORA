# Phone polish: build spec

Status: approved for build (Checkpoint 2, 2026-10-17); review changes applied.

- **Initiative:** direction items 11 (A17, Back closes sheets), 12 (small fixes) and 13 (A13, Android icon shortcuts). PRD: `docs/product/prd-phone-polish.md` (slices A1 to A3, B1, B2, C1, C2). Jose's decisions are in "Checkpoint 2 decisions" at the end of this file and in §3. Merges `flows.md` (UX Designer) and `visual.md` (UI Designer) in this folder.
- **Written:** 2026-10-17 by the UI/UX Designer, cycle 1 merge step. Updated 2026-10-17 with the three required changes from `review.md` §3 and Jose's Checkpoint 2 decisions (J1, J2).
- **Slices and who runs them:**

| Slice | Run by | Where |
|---|---|---|
| A1 matrix, A2 fixes | UI Engineer | Worktree, iOS simulators, `Nevora_Pixel_7_API_36`, Playwright WebKit and Chromium |
| A3 | **Jose-device step** (J2): Jose's iPhone (Safari and Home Screen app) and Android phone (Chrome and installed app), about 20 minutes after A2 lands | Fictional runtime reached locally (`adb reverse`, the Mac's local address in development mode); no deployment |
| B1, B2 | UI Engineer | Worktree |
| C1 | UI Engineer | Worktree |
| C2 | UI Engineer on the emulator. **Jose-device step if needed** (J2): Jose's Android phone, only if the emulator can't mint a WebAPK | As A3 |
- **Evidence:** the code at the lines cited, read on 2026-10-17; `.claude/evidence/errors/employee-home-1440.png`; `before-employee-shift-card-390.png`; `mockup.png` frames A to E; `scripts/phase-e-home-browser-scenarios.mjs` (lines 18, 19, 41, 42, 44, 161, 179, 190). I did not start the dev server for this merge.
- **Phone layout** means the phone chrome query at `src/app/app/portal-gusto.css:284`.

## Contents

1. Screens
   - Part A: Back closes sheets
   - Part B1 and B2: employee Home shift card
   - Part B3 and B4: preview fixes
   - Part C: Android icon shortcuts
2. Decisions log
3. Decisions for Jose at Checkpoint 2
4. Acceptance checks for the build
5. Draft scorecard

---

## 1. Screens

### Part A: Back closes sheets

No visual change. When Back closes a surface, the surface uses its own close path (`hidePopover()`, `dialog.close()`) and its own motion.

**Surfaces.**

| Surface | Code | Close look on Back |
|---|---|---|
| Employee More sheet | `#employee-more-navigation`, `src/components/app-shell.tsx:265` | Existing sheet exit, `--m-sheet-out` 220ms on `--m-ease-drawer`; backdrop fades |
| Manager More menu | `#manager-more-navigation` (`ActionMenu`), `app-shell.tsx:320` | Existing menu exit, `--m-menu-out` 110ms on `--m-ease-out` |
| Account menu | `src/components/portal-account-menu.tsx` | Same as menus. Hidden on phones in portrait (`portal-gusto.css:180`) and, after phone-search, in landscape too: record "not reachable on phones" |
| Profile and device settings | `#portal-device-settings`, `src/components/portal-device-setup.tsx` | Its existing close |
| Page menus | `ActionMenu` in `src/app/app/schedule/page.tsx`, `src/app/app/settings/locations/page.tsx` | Menu exit |
| Issue focus popover | `src/components/manager-issue-focus.tsx` | Its existing close |
| Clocker admin dialogs | `src/components/clocker-break-types.tsx`, `src/components/clocker-device-manager.tsx` | Their existing close |
| Finder sheet (after phone-search) | `src/components/command-finder.tsx` | None (U8) |

**Rules, used only if slice A1 shows a cell fails.**

1. One surface at a time, at most one history entry. Opening a surface from inside another (More › Search, account menu › "Profile and device settings") **replaces** that entry.
2. A link chosen inside a sheet **replaces** the sheet's entry, so the stack reads `[page, new page]` and one Back returns to the page with the sheet closed.
3. Any history entry is added under the phone query only. Desktop keeps Esc and today's browser Back.
4. Every other close path (Close actions, Esc, swipe down, tap outside, choosing a link) removes the entry, so Back never needs two presses.
5. A reload or a shared link never opens a sheet.
6. On iOS Home Screen apps with no system Back, record "no system Back" and confirm Close actions, swipe down and Esc still work. Build no stand-in gesture.
7. If the App Router fights the history entry on iOS, ship the Android fixes alone and record iOS as a known gap for the Capacitor shell (PRD Q1 fallback).
8. **Keep the router's state.** The App Router keeps its own data in `history.state`. Any entry the shell writes itself (`pushState` or `replaceState`) spreads the existing state and adds one key, for example `history.pushState({ ...history.state, nevoraSheet: id }, '', location.href)`. Never pass `null` or a fresh object, and never change the URL: the entry's URL is the page's URL.

**Automated history checks (slice A2, every surface A2 fixes).** A Playwright script runs in WebKit and Chromium at 390. For each surface and each close path the surface offers (Back, Close actions, Esc, swipe down, tap outside, choosing a link), it records `history.length`, `location.href` and `history.state`:

1. before opening the surface;
2. after closing it by that path;
3. after one more Back.

Pass: after step 2, `history.length` and `location.href` equal step 1 (or, for a chosen link, the stack reads `[page, new page]` with no sheet entry between them); the router's keys in `history.state` are unchanged; after step 3 the browser has left the page in one press. A path a surface doesn't offer is skipped by name in the report. If Next's router fights the entry, use the PRD Q1 fallback (rule 7) and record the failing cells.

**Matrix (slice A1 deliverable, in `build-report.md`).** Rows: the surfaces above. Columns: iOS Safari tab, iOS PWA (iOS 26.5 and 27.0 simulators), Android Chrome button nav, Android Chrome gesture nav, Android PWA button nav, Android PWA gesture nav (`Nevora_Pixel_7_API_36`). Cell values: ✓ closes and stays · ✗ leaves page · ✗ does nothing · NB no system Back (then Close actions ✓/✗, swipe down ✓/✗) · ? other, described. Each cell links a screenshot or recording. Repeat one surface per platform at 200% zoom.

**Behaviour details.**
- **Focus:** after Back closes a surface, focus returns to the control that opened it. The 2px ring shows only after keyboard input (`:focus-visible`); touch shows none. No toast, banner or haptic.
- **Screen readers:** VoiceOver's two-finger scrub (Z gesture) still closes More (DESIGN.MD Owed testing, step 3). Closing announces nothing new; focus moving to the opener is the cue.
- **Gestures and button alternatives:** every surface keeps a visible close control (Close actions, Close, or choosing an item) besides Back, swipe down and Esc.
- **Safe areas, offline:** no change; Back needs no network.
- **Reduced motion:** sheets fade without movement (`src/app/app/portal-motion.css:145-149`); menus fade (`:135-138`); the finder has no motion.
- **Desktop:** Esc closes every surface. Browser Back behaves as today.

### Part B1 and B2: employee Home shift card with a shift under way

File: `src/components/employee-home-reviewed.tsx:252-275`; styles `src/components/employee-home-reviewed.module.css:186-225`.

**Order inside the card** (visual and DOM order match), when `snapshot.currentShift` exists and `publicationState !== 'unavailable'`:

| # | Part | Spec |
|---|---|---|
| 1 | Header | `h2` keeps `id="employee-reviewed-next-heading"` and reads **"Your shifts"** in this state. The Published chip stays on the right when a next shift exists |
| 2 | "Scheduled now" block | `<section aria-label="Scheduled now">` (as today) with `h3` "Scheduled now" (exact text, once), the sentence (B2 copy below), the date line led by "Today" (pass `observedAt` to `Assignment` without `countdown`), the time range, location and position, then its own "View schedule" link (the day link the block already builds) |
| 3 | Tear line | Pass only: the dashed rule (1.5px `rgb(255 255 255 / .32)`) with the two 18px page-colour notches (`--pass-notch`), 18px above and 14px below. One tear per card. White card: a 1px `--g-hairline` instead |
| 4 | "Next shift" block | `<section aria-labelledby>` pointing at a new `h3` "Next shift". With a next shift: "Tomorrow" date line, time, countdown pill, location, then its "View schedule" link on the solid 20% white hairline. With none: "No upcoming published shift" and the "View schedule" link to `/app/schedule` (as today) |
| 5 | Zone line | "Times in Puerto Rico time" once, after the last block (suppress it inside the "Scheduled now" block) |
| 6 | Partial notice | Unchanged text, at the card's end |

When there is no current shift, the card is unchanged: `h2` "Next shift" and today's layout.

**Link names.** Each "View schedule" link that opens a day (the link `Assignment` builds, `employee-home-reviewed.tsx:117`) gets one whole accessible name, "View schedule, {date}", set with `aria-label`. `{date}` comes from `formatDisplayDate(shift.date)` (`src/lib/date-utils.ts:91`, "Sat, Oct 17"), not from the card's long `dateLabel()` (`employee-home-reviewed.tsx:40`) and not from a one-off format. Build the name as one string so B5 can translate it as a whole; no concatenated hidden suffix. The visible "View schedule" stays at the start of the name, so WCAG 2.5.3 holds. The "No upcoming published shift" link to `/app/schedule` has no date and keeps the name "View schedule".

Two links stay: one per block. `scripts/phase-e-home-browser-scenarios.mjs:179` asserts `assignments().count() === 2`, and `assignments()` (`:19`) matches the name "View schedule" with `exact: false`, so both renamed links still count.

**Mock-up frame B is superseded on two points:** its single "View schedule" link for the whole card, and its sentence "…shows if you're clocked in." This spec keeps two links and uses "whether". Build from this spec, not the picture.

**Pass treatment** (when a next shift exists, `data-pass`):

| Part | Value |
|---|---|
| `h2` eyebrow | 15px at 94% white |
| `h3` headings | 17px/600 white |
| Sentence, dates, position, zone, notice, dash | `rgb(255 255 255 / .94)`, replacing `.82` at `.module.css:199` and `:202` (5.34:1 at the gradient's lightest point by the UI Designer's reading; 4.44:1 today). Approved by Jose (J1) on every next-shift pass, including the next-shift-only state; check B1.7 must measure 4.5:1 or more before sign-off |
| "Today" / "Tomorrow" | White 600 |
| Times | Pass size: 2rem on phones, 2.25rem in the wide container |
| Location | 17px white |
| Countdown | Unchanged pill, future block only |
| Links | 17px/600 white with arrow; hover and press 12% white wash; 2px white focus ring |

No "Now" badge, no green, no live dot: the card infers nothing about clock status, and green means done on the ladder.

**Calm white card** (current shift, no next shift): same order. Ink and `--g-muted` text, teal links, 1px `--g-hairline` between blocks, no tear.

**Copy.**

| Element | Copy (exact) |
|---|---|
| `h2` with a shift under way | Your shifts |
| `h2` otherwise | Next shift (unchanged) |
| Current block `h3` | Scheduled now (unchanged, script-pinned) |
| Sentence under it (replaces "Scheduled assignment; clock status is shown separately.") | Clock status below shows whether you're clocked in. |
| Current date lead | Today |
| Future block `h3` | Next shift |
| Future block, none | No upcoming published shift (unchanged, script-pinned) |
| Links, visible | View schedule |
| Links, accessible name (day links) | View schedule, {date}, with `{date}` from `formatDisplayDate()` ("View schedule, Sat, Oct 17") |
| Link, no upcoming shift | View schedule (name unchanged) |
| Zone | Times in Puerto Rico time |

"Clock status" names the panel's heading (`src/components/employee-time-panel.tsx:55`), and the panel sits below the card at every width: `.recordedSlot` follows the card inside `.primary` (`.module.css:37`, `:126`). The sentence uses lowercase "clocked in", so it never matches the script's exact "Clocked In" or the unit test's `not.toContain('Clocked in')`.

**States.**

| State | Card |
|---|---|
| Current and next shift | Pass, order above. Frame B shows the layout but not the links or sentence; follow this spec |
| Current, no next | White card, current first |
| Next only | Unchanged except the 94% text (J1, approved) and the link's accessible name |
| No shifts | Unchanged: "No upcoming published shift" (H12) |
| Loading | "Loading Home…" with loading lines, unchanged |
| Schedule unavailable | "Schedule unavailable" white card; `h2` "Next shift"; no current block |
| Paused, unauthorized | Unchanged recovery copy |
| Overnight shift under way | "Scheduled now" shows both dates, as today |

**Behaviour details.**
- **Keyboard:** current block link, then next block link, then Clock status controls. Reading order matches visual order.
- **Screen readers:** `h2` "Your shifts", `h3` "Scheduled now", `h3` "Next shift"; the countdown stays skipped, as today. The links list reads "View schedule, Sat, Oct 17" and "View schedule, Sun, Oct 18", so the two are told apart.
- **Gestures:** none.
- **Safe areas, offline:** unchanged; paused Home keeps its copy.
- **Reduced motion:** no new motion; the countdown text updates each minute with no transition.
- **200% zoom and root:** times break after the dash, never inside a time; the chip may drop under the eyebrow; no clipping at 320.
- **Increased contrast:** the pass flattens to the masthead colour (`.module.css:271`); 94% text measures 9.0:1 there.
- **Forced colours:** outlined card, `CanvasText` text, notches hidden (`:273-275`).
- **Desktop 1440:** same order in the left column; pass width unchanged.

### Part B3 and B4: preview fixes (`/ui-preview/home`)

| Fix | Spec |
|---|---|
| Sidebar (B3) | `PreviewShell` (`src/components/ui-preview/home-preview.tsx:31-47`) renders `sidebarNavigation(role, navigationForRole(role, payroll))` in its groups, Home lit through `sidebarActiveHref()`. Pass fictional payroll flags (`enabled`, `canReview`) that affect navigation only and mount no payroll reader |
| Owner sidebar after | Plan: Home, Inbox, Schedule · Team: Employees, Requests, Updates · Time & Pay: Timecards, Payroll, Insights · Workspace: Settings |
| Employee sidebar after | Home, My schedule, My time, Requests, Updates, Notifications (plus My pay with payroll). Availability and Profile leave the sidebar; Profile stays in the account menu |
| Tab bar and More | Unchanged (`mobileTabsForRole()`, `mobileMoreForRole()`) |
| Figures (B4) | Today strip "Clocked in now" and the rail's clock monitor read one fixture source. Four fictional rows from `home-records.json` |
| Time | `previewToday` uses the frozen `previewObservedAt` (2026-10-13), so the strip, Tasks and the rail all read "Updated 4:49 PM"; zone label "Puerto Rico time" |
| Zero clocked in | If a fixture shows zero, the rail hides its empty "Clocked in now" card, as live D3 Home does |
| Employee current shift | Add a fictional current shift to the employee preview fixture so reviewers can see B1 |

No new visuals: the preview should match the live D3 sidebar (`.claude/evidence/d3/home-1440.png`) and the live Today strip.

### Part C: Android icon shortcuts

**Manifest** (`src/lib/notifications/manifest.ts`, served by `src/app/fuel-portal.webmanifest/route.ts`):

| Order | `name` | `url` | Icon |
|---|---|---|---|
| 1 | Schedule | `/app/schedule` | `shortcut-schedule-96.png` |
| 2 | Time off | `/app/requests` | `shortcut-time-off-96.png` |

Leave out Time off when the company turned the module off, using `pathEnabled()` (`src/lib/workspace-presentation/modules`), if the route can read modules the way it reads the brand. Otherwise ship both and let the existing module-off page handle it.

**Icons.**

| Property | Value |
|---|---|
| Files | `public/icons/shortcut-schedule-96.png`, `public/icons/shortcut-time-off-96.png` |
| Shape | Full 96px circle in #1C4A47 (`--g-masthead`), transparent corners |
| Glyph | Phosphor `CalendarBlank` (Schedule) and `CalendarMinus` (Time off), the `NavIcon` glyphs (`src/components/nav-icon.tsx:38`, `:42`), regular, 48px, white, centred (9.91:1) |
| Manifest fields | `sizes: "96x96"`, `type: "image/png"`, `purpose: "any"` |
| Drawing | Rendered locally from the Phosphor SVG paths. No paid generation |
| Brand | Company brands don't recolour these, as with the app icon |

**Platforms.** Android installed PWA (WebAPK): long press shows both. Installed desktop Chrome and Edge list them in the Dock or taskbar menu. iOS ignores `shortcuts`. Browser tabs show nothing.

**States.** Signed out: existing redirect to `/login`, then Home (no return URL; logged for the passkey phase). Offline: the offline page. Loading: the route skeleton. Module off: as above.

---

## 2. Decisions log

| # | Conflict or open point | Resolution | Why |
|---|---|---|---|
| D1 | `h2` text with a shift under way: PRD Q2 recommends keeping "Next shift"; flows recommend "Your shifts"; visual covers both | **"Your shifts"** in that state only; "Next shift" moves to the future block's `h3` | Usability and trust: under "Next shift" the first thing you'd read is a shift that isn't next, the exact confusion B1 fixes. Every contract holds: the `h2` id, "Scheduled now" once, "Next shift" in the card before the own-time slot (`employee-home-reviewed.test.tsx:116`), the card before To do, no "Clocked In". Only the H01 description string at `phase-e-home-browser-scenarios.mjs:44` turns untrue; update it in the same change |
| D2 | One "View schedule" link per card (flows decision 6, visual mock-up B) | **Keep one link per block** | The links aren't duplicates: each opens its own day (`week=…&day=…`, `employee-home-reviewed.tsx:117`). The script pins two links in the source-failure stage (`phase-e-home-browser-scenarios.mjs:179`, `assignments().count() === 2`). The flows' read of H08 missed that line. Each link's accessible name, "View schedule, {date}" from `formatDisplayDate()`, tells them apart for screen readers |
| D3 | Duplicate "Times in Puerto Rico time" lines | One zone line, after the last block | Removes the noise flows F3 found without touching a pinned string |
| D4 | Pass secondary text at 82% white measures 4.44:1 at the gradient's lightest point (visual UI-1); raising it to 94% also changes the next-shift-only pass, which AC-B1.4 says must show zero diff | Raise to 94% (5.34:1) and list it as an intended change; Jose amended AC-B1.4 (J1, approved 2026-10-17) | Accessibility first: the eyebrow fails 4.5:1 today, and the reorder moves the "Scheduled now" sentence into that light corner |
| D5 | B2 sentence: PRD suggested "This is your schedule. Clock status shows whether you've clocked in."; flows suggested "Clock status below shows if you're clocked in." | "Clock status below shows whether you're clocked in." | One sentence; names the panel by its heading; "below" is true at every width; "whether" can't be misread as "when" |
| D6 | Current block date shows a bare date while the next block says "Tomorrow" (flows F4) | Lead with "Today" | U2 rule: "Today" or "Tomorrow" leads the date |
| D7 | Tear line placement (UX V1, UI-3) | One tear between now and next | The pass stays the single brand moment (U2); both designers agree |
| D8 | Employee preview has no shift under way (flows P3) | Add a fictional current shift in slice B2 | Reviewers need to see B1; fixture-only, privacy test still applies |
| D9 | Preview payroll flags (PRD Q3) | Pass fictional `enabled` and `canReview` | Shows the 10-entry D3 list; mounts no payroll reader |
| D10 | Back fix on iOS (PRD Q1, flows P4) | Measure first (A1); fix only failing cells with rules 1 to 8 | Avoids history work where Chromium's close request already works |
| D11 | Shortcut glyphs (UX V2) | `CalendarBlank` and `CalendarMinus` on a #1C4A47 disc | The `NavIcon` glyphs; the disc keeps them readable on light and dark launchers |
| D12 | Manager-only Inbox shortcut (PRD Q5) | No | One manifest serves every person on the device |
| D13 | Part A had only manual history checks (review §2.1) | Automated `history.length`, URL and `history.state` checks per close path, WebKit and Chromium; shell-written entries merge `history.state` | A leftover entry is the bug this work is most prone to, and the App Router keeps its own state in `history.state` |
| D14 | Link name suffix used a one-off long date (review §2.2) | One whole `aria-label`, "View schedule, {date}", from `formatDisplayDate()` | One date source; one translatable string |
| D15 | Mock-up frame B shows one link and "if" (review §2.3) | Frame B superseded on both points | Two links are script-pinned (`:179`); "whether" is the approved copy |

---

## 3. Decisions for Jose at Checkpoint 2

Resolved 2026-10-17.

| # | Decision | Outcome |
|---|---|---|
| J1 | Amend AC-B1.4 ("no current shift: zero diff") to allow one listed change: pass secondary text from 82% to 94% white on every next-shift pass | **Approved.** It fixes a WCAG 1.4.3 failure that ships today (4.44:1 at the eyebrow) and should hold for every B1 brand (about 4.6:1 at the brand floor, against about 4.05:1 at 82%). No one has measured it in a browser yet, so check B1.7 must confirm 4.5:1 or more on the default and one stress brand before sign-off |
| J2 | Slice A3 on Jose's iPhone (Safari and Home Screen app) and Android phone (Chrome and installed app), about 20 minutes; slice C2 on the Android phone too if the emulator can't mint a WebAPK | **Approved.** A3, and C2 if needed, are Jose-device steps after A2 lands. The phones reach the fictional runtime over `adb reverse` (Android) and the Mac's local address in development mode (iPhone); no deployment. Any hosted preview still needs Jose's explicit go-ahead |

---

## 4. Acceptance checks for the build

Run on the fictional runtime in a worktree.

### Part A

| # | Check | From |
|---|---|---|
| A1.1 | Matrix recorded for every surface on iOS Safari tab, iOS PWA (26.5 and 27.0), Android Chrome and installed PWA, button and gesture nav | AC-A1.1 |
| A1.2 | Each cell holds one value and links evidence | AC-A1.2 |
| A1.3 | Build report lists the failing cells as the A2 fix list | AC-A1.3 |
| A2.1 | Back once closes the top surface; page, scroll position and opener focus kept | AC-A2.1 |
| A2.2 | No surface open: Back navigates as today | AC-A2.2 |
| A2.3 | Close another way, then Back: previous page in one press | AC-A2.3 |
| A2.4 | Link inside a sheet, then Back: original page, sheet closed | AC-A2.4 |
| A2.5 | Desktop: Esc closes every surface; Back unchanged | AC-A2.5 |
| A2.6 | Reload with a sheet open: no sheet opens | AC-A2.6 |
| A2.7 | Client navigation, `router.push`, D6 row navigation, Employees history replacement unchanged; U1, U4, U8 checks and the 156-check sweep pass | AC-A2.7 |
| A2.8 | Swipe down and "Close actions" unchanged (`sheet-gestures.tsx`) | AC-A2.8 |
| A2.9 | 200% zoom: one surface per platform | PRD §5 |
| A2.10 | Automated history script, WebKit and Chromium, every surface A2 fixes, every close path it offers: `history.length` and `location.href` after closing equal the values before opening; after one more Back the page is left; no sheet entry remains | Review §3.1, AC-A2.3, AC-A2.4 |
| A2.11 | Same script: the router's keys in `history.state` are unchanged after open, close and a chosen link; every shell-written entry keeps the page URL | Review §3.1 |
| A3.1 | **Jose-device step:** Jose's phones, every cell "closes and stays" (or NB with working close controls); models and OS versions recorded | AC-A3.1, AC-A3.2, J2 |

### Part B

| # | Check | From |
|---|---|---|
| B1.1 | Current and next shift at 390 and 1440: "Scheduled now" block first in DOM and on screen; next shift follows | AC-B1.1 |
| B1.2 | Card keeps `aria-labelledby="employee-reviewed-next-heading"`; "Scheduled now" exact text once in the card; "Next shift" in the card before `data-test-own-time`; card before To do | AC-B1.2 |
| B1.3 | Countdown only on the future block | AC-B1.3 |
| B1.4 | No current shift: U10 snapshot shows only the listed 94% opacity changes | AC-B1.4 as amended (J1) |
| B1.5 | No "Clocked in" or "Clocked In" in the card | AC-B1.5 |
| B1.6 | `assignments().count()` is 2 in the source-failure stage (`phase-e-home-browser-scenarios.mjs:179`); H01, H08 and H12 pass if a disposable database is available, otherwise recorded as a gap | D2, PRD slice B1 |
| B1.6a | Each day link's accessible name is exactly "View schedule, " plus `formatDisplayDate(shift.date)`; the two names differ; the no-upcoming-shift link is named "View schedule" | Review §3.2 |
| B1.7 | Pass secondary text at 94% white measures 4.5:1 or more at its lightest point, on the default brand and one stress brand, measured in the browser. Required before sign-off | D4, J1 |
| B2.1 | Sentence reads "Clock status below shows whether you're clocked in." | AC-B2.1 |
| B2.2 | `employee-home-clock.test.tsx:15` and `employee-home-reviewed.test.tsx:114` move to the new wording in the same change; H01 description updated | AC-B2.2, D1 |
| B3.1 | Preview sidebar equals `sidebarNavigation()` for Owner, Manager, Employee at 1440, Home lit | AC-B3.1 |
| B3.2 | Owner shows the 10-entry D3 list | AC-B3.2 |
| B3.3 | Employee: no Availability or Profile in the sidebar | AC-B3.3 |
| B3.4 | Preview tab bar and More unchanged | AC-B3.4 |
| B3.5 | New test compares the preview sidebar with `sidebarNavigation()` for all three roles | AC-B3.5 |
| B4.1 | "Clocked in now" figure equals the rail's row count | AC-B4.1 |
| B4.2 | One frozen date and time (2026-10-13, "Updated 4:49 PM"); "Puerto Rico time" | AC-B4.2 |
| B4.3 | Rail lists the fictional people, or hides when zero | AC-B4.3 |
| B4.4 | Privacy test finds no credential, contact or device field | AC-B4.4 |

### Part C

| # | Check | From |
|---|---|---|
| C.1 | `manifest()` returns Schedule then Time off with the URLs above | AC-C1 |
| C.2 | Both URLs work for employee and manager | AC-C2 |
| C.3 | Time off left out when the module is off, or the module-off page handles it | AC-C3 |
| C.4 | Icons are 96 by 96 PNGs of the Phosphor glyphs, `purpose: "any"` | AC-C4 |
| C.5 | `manifest.test.ts` identity and icon assertions pass; new assertion checks both shortcuts sit inside `scope: "/app"` | AC-C5 |
| C.6 | DevTools › Application › Manifest: both shortcuts, no warnings | AC-C6 |
| C.7 | Android long press shows both; each opens in the app window. Emulator first; **Jose-device step** on his Android phone only if the emulator can't mint a WebAPK (C2) | AC-C7, J2 |
| C.8 | Signed out: `/login` | AC-C8 |
| C.9 | Offline: the offline page | AC-C9 |

---

## 5. Draft scorecard (for the Product Designer)

| Line | Score | Why |
|---|---|---|
| Usability | 2 | Back keeps your place; the shift you're on reads first; one long press to Schedule |
| Familiarity | 2 | Platform Back; launcher shortcuts; a shifts card like Future Pro's |
| Trust | 2 | The card still says nothing about clock status; the preview stops contradicting itself |
| Accessibility | 2 | Fixes a 4.44:1 text failure on the pass; focus returns to the opener; links distinguishable by name |
| Brand distinctiveness | 2 | Keeps and sharpens the pass and its tear line |
| Durability | 2 | No new patterns |
| Cost | 2 | Markup order, one opacity value, two PNGs, manifest entries; history work only where A1 finds failures |
| Continuity | 2 | Same sheets, same card, same pinned strings and link count |
| **Total** | **16 / 16** | Go |


## Checkpoint 2 decisions (Jose, 2026-10-17)

- **J1 approved:** amend AC-B1.4 to allow the pass's secondary text to go from 82% to 94% white. Check B1.7 must confirm 4.5:1 or better.
- **J2 approved:** Jose's iPhone and Android phone, about 20 minutes after slice A2 (and C2 if the emulator can't show shortcuts). The phones reach the fictional runtime locally with no deployment.
- **Approved to build** once the review's required changes are applied to this spec.
