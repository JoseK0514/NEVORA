# Phone search: build report (cycle 1, build run 1)

- **Built:** 2026-10-17 by the UI Engineer, from `spec.md` (approved at Checkpoint 2, 2026-10-17). Slices 1, 2 and 3.
- **Code:** worktree `/Users/josek0514/Desktop/NEVORA-UI-READINESS/.claude/worktrees/agent-a851727193968606e`, branch `worktree-agent-a851727193968606e`, based on `ce4fcb2`. Nothing committed.
- **Runtime:** owned fictional runtimes started from the worktree (and from scratch copies of it) on disposable Postgres clusters. Jose's running preview was not touched. Every cluster I started was stopped (`postgresStopped: true` in each `audit.json`).
- **Evidence folder:** `docs/product/specs/phone-search/build-run-1/` in the main checkout.

## Files changed

| File | Change |
|---|---|
| `src/components/command-finder.tsx` | `open()` takes an opener and returns focus to it; a `nevora:open-finder` window event (More › Search uses it, so the page keeps one dialog); a client-only `offline` remote state (no request offline, reload on `online`); status precedence offline › unavailable › loading › "No matches." as an exported `finderStatus()`; the status `<p>` moved after the search row; a field wrapper, "Clear search" (only with text) and "Close" (name "Close search"); phone placeholder "Search" set at open; `enterKeyHint="go"`, `autoCapitalize="none"`, `autoCorrect="off"` |
| `src/app/app/portal-gusto.css` | Desktop: explicit grid rows keep the status line under the list; Close, Clear and the field wrapper are inert. Phone query (`max-width: 760px`, or landscape coarse): 44px icon button, 22px glyph, visually hidden label, no `⌘K`, `color-mix` press and hover discs, header `flex-wrap: nowrap` and `column-gap: 0`, actions `gap: 0`, logo chip 40 to 88px, account menu hidden in landscape, full-screen sheet with the panel filling the dialog and carrying the top safe area, pinned search row and status line, 48px wrapping rows, 15px sentence-case group labels, hint hidden, increased-contrast and forced-colours rules, More › Search row styles |
| `src/app/mobile-workforce.css`, `src/components/manager-home-mobile.css` | The header Search button joins the bell's masthead colour selectors (white glyph on the masthead) |
| `src/components/app-shell.tsx` | First item in the manager More menu: a `<button>` "Search" with the Phosphor glyph and a hairline divider; hides More and opens the finder in the same tap |
| `src/components/ui-preview/home-preview.tsx` | Owner and Manager header get a Search button that shows "Search is not connected in this sample." |
| `src/components/command-finder.test.ts` (new) | Status precedence unit tests |

Sizes stay in px, as the spec says; phone foundations slice 1 converts them.

## Matches spec

| Spec | Item | Result |
|---|---|---|
| 1.2 | One trigger restyled in the phone query, 44px, 22px `MagnifyingGlass`, left of the bell, label visually hidden, `⌘K` hidden | Pass |
| 1.2 | Actions gap 0; logo chip `flex: 0 1 auto`, 40 to 88px; landscape hides the pill and the account menu | Pass. I also set the header's own `column-gap` to 0 and `flex-wrap` to nowrap in the phone query. Without that the 320 budget failed: with a logo the actions wrapped onto a second row. With it the chip measures 66px at 320, the spec's number |
| 1.2 | Hover disc (hover devices only), pressed disc, white focus ring | Pass. The discs use `color-mix(currentColor)`, so they also read on the white landscape header |
| 1.3 | 100vw by 100dvh, dialog padding 0, panel fills the dialog with the top inset; search row and status pinned; list scrolls with the bottom inset | Pass |
| 1.3 | Field 44px, 17px input, teal border and ring on focus; Clear 44px only with text; Close 56 by 44 minimum | Pass (Close is 62 by 44) |
| 1.3 | Rows 48px minimum, wrap, no ellipsis; group labels 15px/600 sentence case; hint hidden | Pass |
| 1.3 | Input attributes; one DOM order (search row, status, list, hint) | Pass |
| 1.3 | Placeholder "Search" on phones, the sentence on desktop, accessible name unchanged | Pass |
| 1.4 | Status precedence and exact copy; offline state; no People or Locations when unavailable | Pass |
| 1.5 | More › Search first, a button with icon and hairline, one dialog, no timer | Pass |
| 1.6 | Desktop: no visual change; only the precedence fix | Pass (see check 1.15) |
| 1.7 | Preview button with notice, no dialog, no request; employees get none | Pass |
| 1.8 | Keyboard order, Clear keeps focus, focus return (header, More, ⌘K), reduced motion, 200% zoom, landscape | Pass |
| 1.8 | Increased contrast, forced colours | Written; not rendered in a browser check |

## Checks run

| # | Check | Result |
|---|---|---|
| 1.0 | Before any code change: 1440 and 1920 computed-style snapshot of the top bar and the open dialog (empty, typed, blocked, plus a manager typed query), keyed by selector, with x/y geometry, using `scripts/dev/style-snapshot.mjs` | Done. A second run against it: 0 differences |
| 1.1 | Owner at 320, 375, 390: one Search button, 44 by 44, left of the bell, 22px glyph | Pass, Chromium and WebKit |
| 1.2 | Employee and lead: no button | Pass |
| 1.3 | 844 by 390 coarse: icon button; pill and account menu hidden | Pass, both engines |
| 1.4 | Header targets 44px, no overflow, `column-gap` 0 at 320/375/390. Ocean brand #1D4ED8, fictional logo and bell count at 320: no overlap, chip 66px, logo not clipped | Pass, both engines, after the nowrap fix (it failed before) |
| 1.5 | Glyph contrast on the masthead, measured from computed colours: Ocean 11.03:1, yellow stress brand (#EAB308 seed) 10.21:1. Default: the glyph computes to #FFFFFF on #1C4A47, the token pair the spec lists at 9.91:1 | Pass |
| 1.6 | Sheet fills the viewport, field focused | Pass at 390, 375, 320 and 844 by 390. Keyboard: Android emulator only |
| 1.6a | Panel box equals the dialog box; dialog padding 0 | Pass. iOS PWA status-bar tap: not run (gaps) |
| 1.7 | Field, status line and first row on screen at 390 by 844 and 375 by 667 | Pass in Playwright; on the Android emulator the first rows stay above the keyboard (screenshot) |
| 1.8 | Input 17px | Pass |
| 1.9 | Empty query: Actions and Pages only | Pass |
| 1.10 | Typed query groups People; rows 48px or taller; the long fixture name wraps with no ellipsis | Pass |
| 1.11 | Hint hidden; Close visible and named "Close search"; placeholder "Search" | Pass |
| 1.12 | Tap a result: sheet closes and the page changes | Pass |
| 1.13 | Close and Esc: dialog closes, focus back on Search | Pass, both engines |
| 1.14 | Clear: only with text, named, 44px, empties the field, focus stays, highlight back on row 1 | Pass |
| 1.15 | 1440 and 1920 against the 1.0 baseline: **0 property differences on every matched element** (38 properties plus x/y), all states, status line and results list included. The only structural differences: the input now sits in the field wrapper (its 38 properties are identical in all 14 captures) and the new Close, Clear and wrapper elements compute to `display: none` or `contents` on desktop | Pass |
| 1.16 | Held route: "Loading people and places…"; Actions and Pages work | Pass |
| 1.17 | Blocked route at 390 and 1440: the unavailable line; no People or Locations | Pass |
| 1.18 | Offline at open: the offline line, 0 requests. Back online while open: one request and the line clears | Pass |
| 1.19 | Blocked route plus an unmatched name: no "No matches." at 390 and 1440 | Pass |
| 1.20 | Finder requests per open within 60s: 1, then 0 | Pass |
| 1.21 | axe (WCAG 2.0, 2.1, 2.2 A and AA) on the open sheet: results, unavailable, offline | 0 violations, both engines |
| 1.22 | 720 CSS px at 2x, and 320: no sideways scroll; field and Close on one row | Pass |
| 1.23 | U8 flow checks | Pass, twice. Also U1, U2, U3, U4, U6, B3, B4, D1 to D6, and the 156-check sweep (156 ok) |
| 1.24 | Screenshots at 320, 375, 390 and 844 by 390: closed, open empty, results, unavailable, offline, loading | Done (`build-run-1/after-s1-*`) |
| 2.1 | Owner and Manager More: first item "Search", a button with icon and hairline, 48px, 17px label | Pass, both engines |
| 2.2 | More › Search: More closes, finder opens, field focused, one dialog | Pass |
| 2.3 | Close after opening from More: focus on "More navigation" | Pass |
| 2.4 | `navigation.test.ts` unchanged and passing | Pass |
| 3.1, 3.2 | Preview Owner and Manager at 390: button shows, notice reads exactly, 0 finder requests, no dialog; no button for Employee | Pass |
| 3.3 | Android emulator `Nevora_Pixel_7_API_36` (Chrome 133): sheet with the keyboard up; Back with the keyboard up first hides the keyboard (Android convention), the next Back closes the sheet and the page stays | Done. iOS simulator: not run (gaps) |
| — | Keyboard: Tab reaches Search with a 2px white ring; in the sheet, field, Clear, Close, each with a 2px ring; focus stays in the modal | Pass in Chromium. WebKit doesn't Tab to buttons by default (a Safari setting), so its result isn't evidence either way |
| — | Reduced motion: no sheet animation; button colour change instant | Pass |
| — | `npx tsc --noEmit -p .` | Pass |
| — | eslint on every changed file | Pass |
| — | `npx vitest run --exclude '.claude/**' --exclude 'node_modules/**'` | Final run: 428 files, 7,221 tests passed, 0 failed. An earlier run under load timed out in 5 files (action-menu, employee-home-actions, two tenancy migration files, phase-e-runner); all 5 pass alone (222 tests) |

## Screenshots (main checkout, `build-run-1/`)

- **Before:** `before-owner-home-320.png`, `before-owner-home-390.png`, `before-desktop-finder-typed-1440.png`, `before-desktop-finder-blocked-1920.png`, and the design captures in this folder (`before-*.png`).
- **After, phone:** `after-s1-closed-{320,375,390,844x390}-chromium.png`, `after-s1-open-empty-{320,375,390}-chromium.png`, `after-s1-results-{320,375,390,844x390}-chromium.png`, `after-s1-open-844x390-chromium.png`, `after-s1-unavailable-390-chromium.png`, `after-s1-offline-390-chromium.png`, `after-s1-loading-390-chromium.png`, `after-s1-zoom-720-chromium.png`; WebKit `after-s1-results-390-webkit.png`, `after-s1-open-empty-390-webkit.png`.
- **After, More and preview:** `after-s2-more-manager-390-chromium.png`, `after-s2-more-owner-390-chromium.png`, `after-s2-search-from-more-manager-390-chromium.png`, `after-s3-preview-{owner,manager}-390-chromium.png`.
- **After, brand and focus:** `after-ocean-logo-bell-320-chromium.png`, `after-ocean-logo-390-chromium.png`, `after-focus-header-search-390.png`, `after-focus-clear-390.png`, `after-focus-close-390.png`.
- **After, desktop:** `after-desktop-finder-typed-1440.png`, `after-desktop-finder-blocked-1920.png`, `after-s1-desktop-open-1440-chromium.png`, `after-s1-unavailable-1440-chromium.png`.
- **Android emulator:** `after-android-emulator-sheet-keyboard-up.png`, `after-android-emulator-back-closed-sheet.png`.

## Known gaps

- **iOS simulator and iOS PWA (1.6, 1.6a, 3.3): not run.** The only simulator this session could drive (iPhone 17 Pro Max, iOS 26.5, already booted) returned stale screenshots and delayed input, so the sign-in couldn't be completed reliably. A second simulator needed an access approval nobody was there to give. The iOS PWA status-bar tap therefore rests on the Chromium measurement (panel box equals dialog box, dialog padding 0). My attempts left that simulator's Safari tab on the runtime's sign-in page, which no longer serves.
- **Forced colours and increased contrast** are written to the spec but weren't rendered in a browser.
- **Header layout change beyond the button:** the phone header's `column-gap` is now 0 (was 8px) and it no longer wraps. Without a logo nothing moves (the snapshot shows the auto margin absorbing it). With a logo, the chip now sits 10px from the wordmark instead of 18px, which is the spec's width budget.
- **`claude/sleepy-easley-8955c8` (not merged):** that worktree adds `--g-track-border` near the top of `portal-gusto.css`. My edits are in the finder block further down the same file, so a text merge should be clean.
