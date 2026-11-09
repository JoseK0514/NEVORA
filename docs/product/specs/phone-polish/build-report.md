# Phone polish: build report (cycle 1, build run 1)

- **Built:** 2026-10-17 by the UI Engineer, from `spec.md` (approved at Checkpoint 2, 2026-10-17, J1 and J2). Slices A1 (measure), A2 (fix), B1 (employee Home order and sentence), B2 (preview fixes) and C1 (manifest shortcuts).
- **Not run:** A3 and C2 are **Jose-device steps, not run** (J2). I didn't try to make the emulator mint a WebAPK.
- **Code:** worktree `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/worktrees/agent-a851727193968606e`, branch `worktree-agent-a851727193968606e`, based on `ce4fcb2`. Nothing committed.
- **Evidence folder:** `docs/product/specs/phone-polish/build-run-1/` in the main checkout.
- **Also in this report:** the dev-only style-snapshot tool (end of file).

## Files changed

| File | Change |
|---|---|
| `src/components/sheet-gestures.tsx` | A2: a `beforetoggle` capture listener. When a phone sheet (`--sheet: 1`) is about to close and focus is outside it, focus moves into the sheet first (tabindex -1, `preventScroll`, no ring). The popover then returns focus as before. Phone only: desktop menus never match `--sheet` |
| `src/components/employee-home-reviewed.tsx` | B1/B2: with a shift under way the `h2` reads "Your shifts"; "Scheduled now" block first (sentence "Clock status below shows whether you're clocked in.", date led by "Today", its own day link), then a "Next shift" block (`h3`, countdown, its day link, or "No upcoming published shift"), one zone line. Every day link is named "View schedule, {formatDisplayDate}" |
| `src/components/employee-home-reviewed.module.css` | Pass secondary text and eyebrow 82% → 94% white (J1); one dashed tear with notches between the blocks; plain rules elsewhere; white card uses a hairline; `h3` 17px/600 |
| `src/components/employee-home-actions.tsx` | The older `EmployeeHomeView` carries the same sentence; updated so `employee-home-clock.test.tsx:15` and the copy agree |
| `src/components/employee-home-reviewed.test.tsx`, `src/components/employee-home-clock.test.tsx` | New wording (B2.2); new tests for the order, one zone line, day-link names and the no-upcoming link name |
| `scripts/phase-e-home-browser-scenarios.mjs` | H01 description string only (D1): "Scheduled now leads and the persisted future Next shift follows" |
| `src/components/ui-preview/home-preview.tsx` | B3: sidebar is `sidebarNavigation(role, navigationForRole(role, previewPayroll(role)))` with Home lit by `sidebarActiveHref()`; fictional payroll flags affect navigation only. Tab bar and More unchanged |
| `src/components/ui-preview/home-fixtures.ts` | B4: `previewToday` moved here, frozen at `previewObservedAt` (2026-10-13 4:49 PM); four fictional clock-monitor rows; "Clocked in now" counts them. D8: a fictional current shift for the employee preview |
| `src/lib/notifications/manifest.ts`, `src/app/fuel-portal.webmanifest/route.ts` | C1: `shortcuts` Schedule (`/app/schedule`) then Time off (`/app/requests`), 96px icons, `purpose: "any"`; Time off dropped when the company turned the module off (`pathEnabled()` with the modules the route already reads through `currentBrand()`) |
| `public/icons/shortcut-schedule-96.png`, `public/icons/shortcut-time-off-96.png` (new) | 96 by 96, #1C4A47 disc, white 48px Phosphor `CalendarBlank` / `CalendarMinus` (regular), rendered locally from the installed Phosphor path data |
| `src/lib/notifications/manifest.test.ts`, `src/components/ui-preview/home-preview-shell.test.tsx` (new) | Shortcut, scope and icon-size assertions; preview sidebar equals `sidebarNavigation()` for all three roles; Today and rail read one source at one time |

## A1: Back matrix (measured before any A2 change)

Measured on the `Nevora_Pixel_7_API_36` emulator (Android 16, Chrome 133.0.6943.137) against an untouched `ce4fcb2` runtime, driving the real Chrome page over DevTools and pressing the real system Back (`KEYCODE_BACK` in button navigation; a left-edge swipe in gesture navigation).

| Surface | iOS Safari tab | iOS PWA 26.5 / 27.0 | Android Chrome, button nav | Android Chrome, gesture nav | Android installed PWA (button / gesture) |
|---|---|---|---|---|---|
| Employee More sheet | not run | not run | ✓ closes and stays | ✓ closes and stays | not run |
| Employee More sheet on Home | not run | not run | ✓ | ✓ | not run |
| Manager More menu | not run | not run | **? tab crashes ("Aw, Snap!")** | **? tab crashes** | not run |
| Page menus (Schedule, Locations) | not run | not run | **? tab crashes** | **? tab crashes** | not run |
| Finder sheet (exists only after phone search) | — | — | n/a before | n/a before | — |
| Account menu | not reachable on phones (hidden in portrait and, after phone search, in landscape) | | | | |
| Profile and device settings, issue focus, Clocker admin dialogs | not run | not run | not run (device settings is off in the fixture runtime; the others need specific records) | not run | not run |
| No surface open | — | — | ✓ Back navigates as today | ✓ | — |

Evidence: `build-run-1/a1-before-matrix-chrome-{button,gesture}.json`, `a1-android-before-more-open.png`, `a1-android-before-more-after-back-crash.png`.

**What the crash is.** The renderer dies (SIGSEGV, null pointer, logged by `debuggerd`) when a phone sheet with Phase 3's exit transition (`overlay` and `display` `allow-discrete`) and its `::backdrop` closes while focus is outside the sheet. It reproduces every time, with software and host GPU, on `ce4fcb2` and on my branch, and also when the sheet closes by a tap outside or by script. It does not reproduce on minimal pages with the same CSS, when the sheet holds focus as it closes, when the exit transition loses `overlay` and `display`, or when `::backdrop` is hidden. Closing with "Close actions" never crashed (that tap puts focus inside the sheet).

**A2 fix list from A1:** Manager More menu and page menus, Android Chrome, both navigation modes. iOS cells weren't measured, so no iOS history work was done (rules 1 to 8 apply only to measured failures).

## A2: fix and re-run

The fix keeps every close path and motion as they were: a sheet about to close takes focus first (see `sheet-gestures.tsx`). No history entries are written, so the App Router's state is never touched.

| Surface | Android Chrome, button nav | Android Chrome, gesture nav |
|---|---|---|
| Manager More menu | ✓ closes and stays | ✓ closes and stays |
| Page menu, Schedule | ✓ | ✓ |
| Page menu, Locations | ✓ | ✓ |
| Employee More sheet / on Home | ✓ / ✓ | ✓ / ✓ |
| Finder sheet | ✓ first Back hides the keyboard (Android convention), second Back closes and stays | ✓ same |
| No surface open | ✓ navigates back as today | ✓ |
| 200% (system font scale 2.0), Manager More | ✓ | — |

Evidence: `a2-after-matrix-chrome-{button,gesture}.json`, `a2-android-after-more-after-back.png`, `a2-android-employee-more-after-back.png`, `a2-android-finder-first-back-keyboard.png`, `a2-android-finder-second-back.png`, `a2-android-200pct-more-after-back.png`. The first gesture run straight after switching navigation mode gave mixed, inconsistent results; two later gesture runs and two button runs after the switch settled all read as above.

## Matches spec

| Spec | Item | Result |
|---|---|---|
| Part A | Back closes the top surface with its own close path and motion; no visual change; desktop keeps Esc and browser Back | Pass on Android Chrome |
| Part A | Rules 1 to 8 (history entries) | Not used: no measured iOS failure, and Android needed none |
| B1 order | `h2` "Your shifts" (id kept), "Scheduled now" block first with its link, tear, "Next shift" block, one zone line, partial notice last | Pass |
| B1 link names | "View schedule, {formatDisplayDate}" on every day link, one whole `aria-label`; the no-upcoming link keeps "View schedule" | Pass |
| B1 pass | 94% white secondary text (J1), "Today"/"Tomorrow" white 600, one tear, `h3` 17px/600, countdown on the future block only, no "Now" badge | Pass. Location stays 15px: the spec's table says 17px, but the shipped pass uses 15px and B1.4 allows only the 94% change on the next-only pass, so I left it |
| B1 white card | Current shift, no next: same order, hairline, no tear | Pass |
| B2 copy | Sentence exact; tests moved; H01 description updated | Pass |
| B3 | Preview sidebar from `sidebarNavigation()`; Owner 10 entries (Plan · Team · Time & Pay · Workspace); Employee without Availability or Profile; tab bar and More unchanged | Pass |
| B4 | Today and rail from one source; frozen 2026-10-13 4:49 PM; rail lists four fictional people; fictional current shift for the employee preview | Pass |
| C | Shortcuts, order, URLs, icons, module-off rule, `purpose: "any"` | Pass |

## Checks run

| # | Check | Result |
|---|---|---|
| A1.1 to A1.3 | Matrix recorded with evidence; fix list stated | Android Chrome done. iOS cells and the Android installed PWA cells not run (gaps) |
| A2.1 | Back once closes the top surface; page kept; focus returns to the opener (Chromium history script shows "More navigation" / "More" focused after closing) | Pass (Android) |
| A2.2 | No surface open: Back navigates | Pass |
| A2.3, A2.10 | History script, WebKit and Chromium at 390: Manager More, Employee More and the Schedule page menu, closed by Close actions, Esc, tap outside, swipe down and choosing a link; `history.length` and URL unchanged after closing, one more Back leaves the page; after a link, the stack reads page then new page and Back returns with the sheet closed | 14 of 15 pass in each engine. **Fails: Schedule page menu, tap outside** — the tap closes the menu and the same tap also follows a link underneath, so a history entry appears. Identical on untouched `ce4fcb2`, so it predates this build (not fixed; Back was A2's scope) |
| A2.4 | Link inside a sheet, then Back: original page, sheet closed | Pass |
| A2.5 | Desktop 1440: Esc closes the account menu; no history change; the fix adds no tabindex on desktop | Pass |
| A2.6 | Reload with a sheet open: no sheet opens | Pass (popovers start closed; no state is stored) |
| A2.7 | U1, U4, U8 flows and the 156-check sweep after the fix | Pass |
| A2.8 | Swipe down and Close actions unchanged | Pass (history script; Close actions on the emulator) |
| A2.9 | 200% on Android, one surface | Pass. iOS not run |
| A2.11 | Router keys in `history.state` unchanged after open, close and a link; no shell-written entry | Pass |
| A3.1 | **Jose-device step, not run** | — |
| B1.1 | Current and next shift at 390 and 1440: "Scheduled now" first in DOM and on screen | Pass, Chromium and WebKit (fresh fixture runtime) |
| B1.2 | `aria-labelledby` kept; "Scheduled now" once; "Next shift" before the own-time slot; card before To do | Pass |
| B1.3 | Countdown only on the future block | Pass (both states) |
| B1.4 | No current shift: only the 94% change | Unit test (`h2` "Next shift", no "Your shifts", same structure) and CSS review. Not shown in the browser: the fixture employee has a shift from 8 AM to 4 PM every day, so every capture during the run had a shift under way |
| B1.5 | No "Clocked in" / "Clocked In" in the card | Pass |
| B1.6 | Two "View schedule" links in the card, matched by name as `assignments()` does | Pass in both states. The phase-e H01/H08/H12 scenarios weren't run: they need their own harness and database (gap) |
| B1.6a | Names exactly "View schedule, Sat, Oct 17" and "View schedule, Sun, Oct 18"; no-upcoming link "View schedule" | Pass |
| B1.7 | 94% white at the lightest point of the pass, measured from pixels with text hidden: default 5.23:1 Chromium / 5.16:1 WebKit (82% was 4.39:1); Ocean 6.23:1; yellow stress brand (#EAB308 seed, accent #886600) 5.01:1 (82% was 4.23:1) | Pass |
| B2.1, B2.2 | Sentence exact; both unit tests moved; H01 description updated | Pass |
| B3.1 to B3.3 | Preview sidebar at 1440 for Owner, Manager and Employee equals `sidebarNavigation()`, Home lit | Pass, both engines |
| B3.4 | Preview tab bar unchanged (5 items) | Pass |
| B3.5 | New test compares the preview sidebar with `sidebarNavigation()` for all three roles | Pass |
| B4.1, B4.3 | "Clocked in now" 4 = the rail's four fictional people (Owner and Manager, 390 and 1440) | Pass |
| B4.2 | Every "Updated" reads 4:49 PM | Pass |
| B4.4 | Privacy test finds no credential, contact or device field | Pass |
| C.1, C.5 | `manifest()` returns Schedule then Time off; URLs inside `/app`; module off drops Time off | Pass (unit) |
| C.2 | Employee and manager open both URLs (200) | Pass |
| C.4 | Icons served as 96 by 96 PNGs, `purpose: "any"` | Pass |
| C.6 | Chrome DevTools manifest (`Page.getAppManifest`): 0 errors, both shortcuts parsed; 0 installability errors | Pass (`build-run-1/c6-app-manifest-cdp.json`). Installed desktop Chrome on the Mac: not done |
| C.7 | **Jose-device step, not run** (C2) | — |
| C.8 | Signed out: both shortcuts go to `/login` | Pass |
| C.9 | Offline page is served (the service worker's fallback) | Served; not exercised offline through an installed app |
| — | axe on employee Home at 390 and 1440 | 0 violations, both engines |
| — | tsc, eslint on changed files, vitest | Pass (vitest final: 428 files, 7,221 tests, 0 failed) |

## Screenshots (main checkout, `build-run-1/`)

- **Employee Home:** before `before-employee-home-{390,1440}.png`; after `after-employee-home-{390,1440}.png`, `after-b1-current-and-next-{390,1440}.png` (pass), `after-b1-current-no-next-{390,1440}.png` (white card), `after-b1-pass-{default,ocean,yellow}-brand-390.png`.
- **Preview:** before `before-preview-{owner,manager,employee}-{390,1440}.png`; after `after-preview-{owner,manager,employee}-{390,1440}.png`.
- **Android:** `a1-android-before-more-open.png`, `a1-android-before-more-after-back-crash.png`, `a2-android-*.png`.
- **Shortcut icons:** `c1-shortcut-schedule-96.png`, `c1-shortcut-time-off-96.png`.

## Known gaps

- **iOS (A1, A2.9):** not measured. The one simulator this session could drive lagged too much to sign in reliably, and a second simulator needed an access approval. iOS Safari's edge swipe therefore has no measurement and no fix; A3 on Jose's iPhone is now the first iOS measurement.
- **Android installed PWA cells:** not run (the emulator's Chrome would need to install the app; C2 territory).
- **The Chrome 133 crash on tap outside** a phone sheet is still there (it predates this build). Back no longer crashes. A real phone on current Chrome may not have the bug at all; A3 on Jose's Android phone will tell. If it does, the CSS-level fix is to drop `overlay`/`display` from the phone sheets' exit transition, which changes approved Phase 3 motion and needs a decision.
- **Pre-existing:** a tap outside the Schedule page menu sheet can also activate the link under the tap.
- **B1.4** wasn't shown in a browser (no off-shift moment in the fixture), and the phase-e H01/H08/H12 scenarios weren't run.
- **C.6** desktop install on the Mac and **C.9** offline through an installed app weren't done.

## Dev-only style-snapshot tool (approved by Jose, phone foundations Q1)

- **Files:** `scripts/dev/style-snapshot.mjs` and `scripts/dev/style-compare.mjs`. The PRD says "under `scripts/`"; `scripts/dev/` is the folder the brief named when no exact place is given. Rebuilt from the scratch prototypes `u10-styles.mjs` and `u10-compare.mjs`.
- **What it does:** signs in to the owned fictional runtime from its `access.json` (the password is never printed), captures the 38 U10 properties for every element, and writes one JSON per view (and screenshots with times masked when asked). Without `--plan` it runs the U10 plan (owner, employee, both payroll roles and sign-in at 1440 and 390, 98 views). A JSON plan can scope to selectors and add steps (`click`, `fill`, `press`, `select`, `wait`, `waitFor`, `block` a route, `offline`).
- **Changes from the prototype:** elements are keyed by `tag#id.classes` with an index only between same-signature siblings, so moving an element among siblings keeps its key (`--keys index` restores U10's positional keys); optional `--geometry` adds x/y; `style-compare.mjs` reads both the old and new formats, takes `--ignore` and `--allow <regex>` for listed differences, and can pixel-compare with the pngjs/pixelmatch already in the Playwright runtime. No npm dependency added.
- **Never in a build or production:** not imported by app code, not in `package.json` scripts, and it refuses to run when `NODE_ENV=production`, `VERCEL` or `NEXT_PHASE` is set, or when the runtime URL isn't a loopback host. It loads Playwright from `NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE` or the default runtime path, as `scripts/payroll-export-privacy-qa.mjs` does.
- **Use in this run:** the phone search 1.0/1.15 desktop baseline, the before/after Home and U10 comparisons for all three initiatives, and two noise runs (0 differences on the finder and Home plans; 1 timestamp width on the 98-view plan).
- **Example:** `node scripts/dev/style-snapshot.mjs --evidence <runtime evidence dir> --out /tmp/before --plan plan.json --geometry --shots`, then `node scripts/dev/style-compare.mjs /tmp/before /tmp/after`.
