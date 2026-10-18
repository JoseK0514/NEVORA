# Phone search: build spec

Status: approved for build (Checkpoint 2, 2026-10-17); review changes applied.

- **Initiative:** direction item 6 (A8). PRD: `docs/product/prd-phone-search.md` (3 slices). Merges `flows.md` (UX Designer) and `visual.md` (UI Designer) in this folder.
- **Written:** 2026-10-17 by the UI/UX Designer, cycle 1 merge step. Updated 2026-10-17 with the three required changes from `review.md` §3 and Jose's Checkpoint 2 approval.
- **Evidence:** the code at the lines cited, read on 2026-10-17; the UI Designer's live captures in this folder (`before-owner-home-390.png`, `before-owner-home-320.png`, `before-landscape-844x390.png`, `before-owner-more-390.png`); `mockup.png` frames A to J. I did not start the dev server for this merge. Every rendered claim comes from those captures or from the code.
- **Scope:** owners and managers in the phone layout. Desktop changes in one place only: the status-line precedence bug fix (decision D3).
- **Build order:** phone search slice 1 lands before phone foundations slice 1. This spec writes the finder sizes in px; foundations slice 1 converts them to rem with the rest of the shared chrome (`phone-foundations/review.md` §3.5).
- **Phone layout** means the phone chrome query at `src/app/app/portal-gusto.css:284`: `(max-width: 760px), (max-width: 900px) and (max-height: 430px) and (orientation: landscape) and (pointer: coarse)`. Every phone rule below uses this query, never `max-width: 760px` alone.

## Contents

1. Screens
2. Decisions log
3. Decisions for Jose at Checkpoint 2
4. Acceptance checks for the build
5. Draft scorecard

---

## 1. Screens

### 1.1 Components to reuse

| Need | Reuse | Change |
|---|---|---|
| Header button | The existing trigger `button.command-finder-trigger` in `src/components/command-finder.tsx:65-67` | Restyled as an icon button inside the phone query. No second button |
| Sheet | The one `<dialog class="command-finder">` in `command-finder.tsx:68` | Full-screen styles inside the phone query; Close button; clear button; status line moved in DOM; offline cause |
| Opening from More | `open()` in `command-finder.tsx:36` | Exposed to the shell (a small context or a `nevora:open-finder` window event), so the page keeps one dialog |
| More row | `ActionMenu` children in `src/components/app-shell.tsx:320-333`, class `nevora-action-menu-item` | New first child: a `<button>` |
| Clear pattern | "Clear team search" in `src/components/manager-weekly-roster.tsx:110` | Same pattern: 44px target, shown only with text |
| Preview | `PreviewShell` header in `src/components/ui-preview/home-preview.tsx:57-60` and `notice()` | New button before "Sample notifications" |
| Data | `finderItems()`, `rankFinder()` in `src/lib/finder.ts`; `GET /api/manager/finder` | None |

### 1.2 Phone header, closed (iOS Safari, iOS PWA, Android Chrome, Android PWA; the future store app shows the same web header)

**Layout.** Inside `.mobile-header-actions`, left to right: wordmark, company logo chip (B1, optional), Search, bell. Search sits left of the bell, so the bell keeps its far-right place. Employees and leads get no button (`app-shell.tsx:222`, `!employee`).

| Property | Value |
|---|---|
| Target | 44 by 44px, `border-radius: 999px`, transparent, matching the bell (`src/app/mobile-workforce.css:43`) |
| Glyph | Phosphor `MagnifyingGlass`, regular, white (`currentColor`), 22px. The trigger renders the icon at 18px today; set the `svg` to 22px in the phone query |
| Visible label | None. The `<span>Search</span>` gets visually-hidden styles (clip pattern, not `display: none`) so the accessible name stays "Search". The `<kbd>` hint gets `display: none` |
| Gap | 0 between Search and the bell targets; glyph centres sit 44px apart. `.mobile-header-actions` sets `gap: 8px` today (`src/app/globals.css:12858`), so the phone query adds `.mobile-header-actions { gap: 0 }`. Without it the chip loses 8px at 320 (66px becomes 58px) |
| Logo chip at narrow widths | `.company-logo-chip` in the phone query: `flex: 0 1 auto; min-width: 40px; max-width: 88px`; the image `max-width: 100%; object-fit: contain`. The wordmark and both 44px targets never shrink. The chip never hides |
| Landscape | The same phone query hides the desktop pill styles and `.portal-account-menu` (today they leak in at 844 by 390, `portal-gusto.css:180`, `:324`) |

| State | Look |
|---|---|
| Default | White glyph on the masthead (`--g-masthead`, 9.91:1; Ocean brand masthead #273B66, 11.03:1; B1 keeps white on any masthead at 7:1 or more) |
| Hover (`@media (hover: hover)` only) | `rgb(255 255 255 / .10)` disc |
| Pressed | `rgb(255 255 255 / .14)` disc, 120ms background colour, no scale |
| Focus | The existing `.mobile-header :is(a,button):focus-visible` rule: 2px white outline, inset 2px |
| Open | The sheet covers the header; no selected state |

**Width budget at 320** (16 + 124 wordmark + 10 + chip + 44 + 44 + 16, with `gap: 0` on `.mobile-header-actions`): the chip gets 66px. At 40px it still shows a square mark.

### 1.3 Search sheet (all phone platforms)

**Layout, top to bottom.**

| Part | Spec |
|---|---|
| Dialog | `width: 100vw; height: 100dvh; max-width: none; max-height: none; margin: 0; padding: 0; border: 0; border-radius: 0; box-shadow: none; background: var(--g-canvas)`. No padding on the dialog: it closes on any click whose target is the dialog itself (`command-finder.tsx:72`), so padding there would turn the status-bar band into a close target. `::backdrop` stays but never shows |
| Panel | `.command-finder-panel` in the phone query: `height: 100%; padding-top: env(safe-area-inset-top)` (the global `box-sizing: border-box` at `globals.css:65` keeps it inside the dialog). The panel covers every pixel of the dialog, so no tap can land on the dialog element. The results list gets `padding-bottom: env(safe-area-inset-bottom)` |
| Panel grid (phone) | Rows: search row, status line, results. Search row and status line stay pinned; only the results list scrolls (`overflow-y: auto`, `overscroll-behavior: contain`) |
| Search row | Field, then Close, on one row; 8px gap; padding 6px 8px 8px 16px; 1px `--g-hairline` under it |
| Field | `--g-inset` fill, 8px radius (`--g-control-radius`), 44px tall, 12px side padding, 20px `MagnifyingGlass` in `--g-muted` inside the field, input 17px `--g-ink` (no iOS zoom) |
| Field focus | 1px `--g-accent` border plus 1px `--g-accent` ring (4.72:1 against the fill) |
| Clear button | Inside the field at its right edge. Phosphor `XCircle` fill, 20px, `--g-muted`, centred in a 44 by 44px target. Rendered only while the query has text |
| Close | Text button: "Close", `--g-accent` 17px/500, at least 56 by 44px |
| Status line | 15px `--g-muted`, padding 12px 16px, 1px `--g-hairline` under it. Hidden when empty (`:empty { display: none }`, as today) |
| Group labels | 15px/600 `--g-muted`, sentence case (drop the desktop 12px uppercase in the phone query) |
| Rows | Minimum 48px, 8px radius, padding 6px 8px. Label 17px ink, line-height 1.35, wraps. Detail 15px muted, right-aligned; it drops under the label when it can't fit. No ellipsis anywhere |
| Hint row | `display: none` in the phone query |

**Input attributes** (all widths): keep `type="text"`, `role="combobox"`, the `aria-*` set, `autoComplete="off"`, `spellCheck={false}`. Add `enterKeyHint="go"`, `autoCapitalize="none"`, `autoCorrect="off"` so iOS doesn't rewrite names.

**DOM order** (one DOM for every width): search row, status line, results list, hint row. Today the status `<p>` comes after the list (`command-finder.tsx:88`). Move it up. On desktop, CSS keeps it visually under the list (grid row 3), so the desktop look holds. The line is a `role="status"` region that takes no focus, so the desktop visual order doesn't change keyboard order.

**Placeholder.** Phone: "Search". Desktop: "Search pages, people and places" (unchanged). Set the placeholder inside `open()` from `matchMedia(phoneQuery).matches`, so server and client markup match. The accessible name stays "Search pages, people and places" at every width.

### 1.4 States and copy

Status precedence, checked in this order at every width (fixes `command-finder.tsx:89`):

| Order | Condition | Status line (exact) |
|---|---|---|
| 1 | Offline (`navigator.onLine` false at open, or an `offline` event while open) | People and places unavailable offline |
| 2 | Route failed or returned `unavailable` | People and places are unavailable right now. |
| 3 | Read in flight | Loading people and places… |
| 4 | Query has text, no result, people loaded | No matches. |
| 5 | Anything else | (empty, line hidden) |

| State | What the person sees | Notes |
|---|---|---|
| Closed | Header Search button; More › Search first | |
| Open, empty query | Actions (3), Pages (6); first row highlighted | Never People or Locations (U8, `finder.ts:41`) |
| Open, loading | Same rows; loading line | No spinner, no skeleton |
| Open, typing, results | Grouped rows, 6 per group; first row highlighted | `--g-accent-wash` fill, `--g-accent-strong` 600 label (6.50:1) |
| Pressed row | `--g-accent-pressed` fill while the finger is down | |
| Partial | Page rows plus the unavailable or offline line | |
| No match | "No matches." | Only when people loaded |
| Unavailable | Unavailable line; no People or Locations group | A failed read isn't cached; reopening tries again |
| Offline | Offline line; no request sent | Add a client-only `offline` value to the `Remote` state type. No contract change. On an `online` event while open, call `load()` |
| Role lost (route 403) | Same as unavailable | |
| Success | Sheet closes, then `router.push(item.href)`; destination route skeleton | No exit motion |
| Page chosen while offline | The existing offline page (`public/fuel-portal-offline.html`) | The finder doesn't block it |

**Copy table.**

| Element | Visible | Accessible name or role |
|---|---|---|
| Header button | (glyph only) | "Search", `aria-haspopup="dialog"`, `aria-keyshortcuts="Meta+K Control+K"` (unchanged) |
| Dialog | | `aria-label="Find a page, person or place"` (unchanged) |
| Field | Placeholder "Search" (phone) | "Search pages, people and places" (unchanged) |
| Clear button | (glyph only) | "Clear search" |
| Close | "Close" | "Close search" |
| Results list | | "Results" (unchanged) |
| More row | "Search" | "Search", `aria-haspopup="dialog"` |
| Preview notice | "Search is not connected in this sample." | `role="status"` (existing `.ui-preview-notice`) |

### 1.5 More › Search (manager phone layout)

| Property | Value |
|---|---|
| Position | First child of the manager `ActionMenu`, above `mobileMoreForRole()` items |
| Element | `<button type="button" class="nevora-action-menu-item">` with Phosphor `MagnifyingGlass` 22px ink, 12px gap, label "Search". It is the only icon in the manager More list, which marks it as a tool |
| Separator | 1px `--g-hairline` under it, 4px space below (reuse `nevora-action-menu-divider`) |
| Behaviour | One click handler: `hidePopover()` on the menu, then the finder's `open()`, with no timer. iOS raises the keyboard only when focus moves inside the user's tap |
| States | Pressed and focus: the menu item's existing rules |
| Navigation data | Unchanged. `navigationForRole()`, `mobileTabsForRole()` and `mobileMoreForRole()` return the same lists |

The More popover's 110ms exit transition can still play: the dialog opens later in the top layer and covers it.

### 1.6 Desktop (1440, 1920)

No visual change: "Search ⌘K" pill, 620px dialog, 40px rows, hint row, status line under the list. Only change: the precedence order in 1.4.

**Desktop baseline (before any code change).** U10 captured 96 page views, none with the finder open (DESIGN.MD U10), so there is no baseline to compare against yet. Slice 1 starts with check 1.0: capture a 1440 computed-style snapshot of the top bar and the open dialog from the current code in three states: empty query, typed query with results, and blocked route. Match elements by selector, not DOM index, because the status `<p>` moves ahead of the list. The only accepted differences are the grid-row placement of the status line and the results list. Check 1.15 compares against this capture.

### 1.7 Preview (`/ui-preview/home`, Owner and Manager)

A `<button type="button" aria-label="Search">` with the same glyph and phone styles, before "Sample notifications". It calls `notice('Search is not connected in this sample.')`. It never opens a dialog and never calls the route. Employees see no button.

### 1.8 Behaviour details

**Keyboard order.**
- Header (closed): brand, logo chip, Search, bell.
- Open sheet: field, Clear (when shown), Close. Focus stays inside the modal dialog.
- Keys: Up and Down move the highlighted row; Enter (or Go) opens it; Esc closes. ⌘K or Ctrl K toggles at every width.
- Clear: empties the query, resets the highlight to row 1, keeps focus in the field (call `input.focus()` in the handler).

**Focus return.**
- Opened from the header: native dialog focus return to the Search button.
- Opened from More: the menu item has gone, so store the opener; on `close`, if it isn't connected or visible, focus the More trigger (`aria-label="More navigation"`).
- Opened by ⌘K: focus returns to whatever had it.

**Screen readers.**
- Trigger: "Search, button, pop-up dialog" (VoiceOver: "Search, pop-up button").
- Field: combobox with `aria-activedescendant` pointing at the highlighted option; list "Results"; group labels stay `aria-hidden`; each option reads label then detail.
- Status line: `role="status"`, read once per change. Moving it in the DOM doesn't change what is announced.

**Gestures and their button alternatives.**

| Gesture | Result | Button alternative |
|---|---|---|
| Android Back (button or gesture) | Closes the dialog (Chromium close request); verify in the phone-polish Back matrix | Close |
| iOS edge swipe in a Safari tab | Walks history today; phone-polish Part A fixes it | Close |
| Swipe down | Not offered: a full-screen search page has no grab handle | Close |
| Tap outside | Not available: no backdrop on phones, and the panel fills the dialog so no tap reaches the dialog's own close-on-click handler (`command-finder.tsx:72`) | Close |

**Safe areas.** Top inset on the panel (not the dialog) keeps the field clear of the status bar and Dynamic Island in the iOS PWA. Bottom inset pads the list end above the home indicator or gesture bar. In a Safari tab, the page owns the top inset. A tap in the status-bar band lands on the panel, so the sheet stays open.

**Offline.** Covered in 1.4. Actions and Pages keep working.

**Reduced motion.** Nothing to reduce: the sheet opens and closes with no motion at every setting (U8). Header and row presses change colour only; under reduced motion the change is instant.

**200% zoom and 320px.** Field plus Close stay on one row; "Search" fits. Rows wrap; detail drops under the label; no sideways scroll at 720 CSS px or 320px. When phone type moves to `rem` (phone foundations slice 1), the finder sizes follow the root.

**Landscape (844 by 390).** Field and Close on one row, status line, about two rows above the keyboard. The header scrolls away on short screens (`portal-gusto.css:311`), so More › Search is the always-reachable entry there.

**Increased contrast.** Field gets a 1px `--g-ink` border; sheet hairlines turn `--g-ink`.

**Forced colours.** Field border `CanvasText`; highlighted row `Highlight` with `HighlightText`.

---

## 2. Decisions log

| # | Conflict or open point | Resolution | Why |
|---|---|---|---|
| D1 | One dialog or a phone search component | One `<dialog>`, three entries (header, More, ⌘K) | Lowest cost; one keyboard and privacy model (flows decision 1, PRD §7) |
| D2 | Status line position on phones (flows decision 3) vs desktop unchanged | Move the `<p>` in DOM to under the search row at every width; desktop keeps it visually under the list with CSS | With the keyboard up, the old position sits under the keyboard. One DOM keeps reading order right on phones without a desktop look change |
| D3 | Status precedence: code shows "No matches." while people are unavailable (`command-finder.tsx:89`) | Offline › unavailable › loading › "No matches.", at every width | Trust: "No matches." for an unchecked query reads as "this person doesn't exist". AC4.4 already requires it. It changes desktop text in one failure case only; it's a bug fix, and no script presses finder strings (PRD §7) |
| D4 | Placeholder on phones | "Search" on phones; desktop keeps the sentence; the accessible name keeps the sentence everywhere | The sentence measures 264px at 17px and the field has about 250px at 390, so it gets cut (visual.md 3.2) |
| D5 | Add a "Clear search" button (UX P2; not in the PRD) | Yes, in slice 1 | Phones have no Esc key; clearing "maria jose" means holding backspace. Small cost; the Schedule page already ships the same pattern ("Clear team search") |
| D6 | Close label: "Close" or "Cancel" (UX P5) | "Close", name "Close search" | Matches "Close actions"; translates to "Cerrar"; sits where iOS puts Cancel |
| D7 | Logo chip at 320 (UX V1: shrink then hide; UI: shrink, never hide) | Shrink to 40px minimum, never hide | The chip is the B1 feature Owners set up; 40px still shows a mark. Wordmark and targets stay whole either way |
| D8 | Icon on the More › Search row (UX V2) | Yes, the only icon, with a hairline under it | Marks the row as a tool, not a destination; both designers agree |
| D9 | Teal highlight on row 1 before any touch (UX V3) | Keep it | The Go key opens that row, so the highlight tells the truth |
| D10 | Status line could read as the field's helper text (UX V4) | Hairline under the search row; list-style padding on the status line | Separates it from the field while staying in the pinned area |
| D11 | Offline cause | Client-side `offline` remote state; no request while offline | Today every failure reads as "unavailable right now", which suggests trying again soon (flows F5) |
| D12 | One header button or a second phone button | Restyle the existing trigger inside the phone query | Keeps one trigger, one accessible name, one `aria-keyshortcuts` |
| D13 | PRD AC1.1 says "beside the notification bell and account menu"; phones hide the account menu | Build and check it as "beside the notification bell" | Account actions stay in More on phones (`portal-gusto.css:180`). Wording note for the PM; no scope change |
| D14 | Safe-area top padding on the dialog (first draft) taps through to close (review §2.1) | Pad the panel, not the dialog; panel `height: 100%` | The dialog closes on clicks on itself (`command-finder.tsx:72`). A panel that fills the dialog keeps the close-on-backdrop code unchanged for desktop |
| D15 | Header gap: spec assumed 0, code sets 8px (`globals.css:12858`) | `.mobile-header-actions { gap: 0 }` in the phone query | The 320 budget and the 44px glyph spacing depend on it |
| D16 | Desktop zero-diff baseline didn't exist (U10 has no open finder) | Capture it first, three states, matched by selector | A position-matched snapshot would flag the status-line DOM move as a difference that isn't visible |
| D17 | Mock-up frame G shows "Payroll" for "mar", which `rankFinder()` wouldn't return | Build from the copy and state tables in §1.4, not frame contents | The tables match the code; the frame doesn't |

---

## 3. Decisions for Jose at Checkpoint 2

Resolved 2026-10-17. Jose needed to decide nothing and approved the spec as reviewed, including D3 (the desktop "unavailable" bug fix) and D5 (the "Clear search" button). Approved to build with the review's required changes, now in §1.2, §1.3, §1.6, §1.8 and §4.

---

## 4. Acceptance checks for the build

Run on the fictional runtime in a worktree, Owner and Manager fixtures, Chromium and WebKit, unless the row says otherwise.

### Slice 1: header button and full-screen sheet

| # | Check | From |
|---|---|---|
| 1.0 | Before any code change: 1440 computed-style snapshot of the top bar and the open dialog in three states (empty query, typed query with results, blocked route), elements matched by selector. Saved as the baseline for 1.15 | Review §3.3 |
| 1.1 | Owner and Manager, phone layout, any `/app` page: one button named "Search", Phosphor `MagnifyingGlass`, at least 44 by 44px, left of the bell | AC1.1 |
| 1.2 | Employee and lead: no Search button | AC1.2 |
| 1.3 | 844 by 390, coarse pointer: phone icon button shows; desktop pill and account pill hidden | AC1.3, flows F4 |
| 1.4 | 320 with an Ocean brand, a logo and a bell count: no overlap or clipping; every target 44px or more; chip 40 to 88px; `.mobile-header-actions` computed `column-gap` is 0px in the phone layout | AC1.4, review §3.2 |
| 1.5 | Glyph contrast against the masthead at 3:1 or more for the default and one stress brand | AC1.5 |
| 1.6 | Tap Search: dialog fills the visible viewport inside safe areas; field focused; keyboard opens (iOS Safari, iOS PWA, Android Chrome) | AC2.1 |
| 1.6a | iOS PWA: tap the status-bar band above the field; the sheet stays open. In Chromium at 390, `.command-finder-panel` box equals the dialog box and the dialog's computed padding is 0 | Review §3.1 |
| 1.7 | With the keyboard up at 390 by 844 and 375 by 667: field, status line and the first row visible | AC2.2 |
| 1.8 | Input computed font size 17px | AC2.3 |
| 1.9 | Empty query lists Actions and Pages only | AC2.4 |
| 1.10 | Typed query ranks and groups as on desktop; rows 48px or taller; a 60-character name wraps with no ellipsis | AC2.5 |
| 1.11 | Hint row hidden; "Close" visible with name "Close search"; placeholder "Search" | AC2.6, D4 |
| 1.12 | Tap a result: sheet closes, `router.push(href)` runs | AC2.7 |
| 1.13 | Close or Esc: dialog closes, focus back on the Search button | AC2.8 |
| 1.14 | Clear: shown only with text, name "Clear search", 44px, empties the field, focus stays in the field | D5 |
| 1.15 | 1440: ⌘K and the pill open the dialog at its current size; compared by selector with the 1.0 baseline in all three states, the only differences are the grid-row placement of the status line and results list | AC2.9, review §3.3 |
| 1.16 | Slow route: "Loading people and places…"; Actions and Pages work | AC4.1 |
| 1.17 | Blocked route: "People and places are unavailable right now."; no People or Locations group | AC4.2 |
| 1.18 | Offline at open: "People and places unavailable offline"; zero requests to `/api/manager/finder` | AC4.3 |
| 1.19 | Blocked route, type a person's name that matches no page: "No matches." count is 0, at 390 and 1440 | AC4.4, metric |
| 1.20 | Requests to `/api/manager/finder` per open within 60s: 1, then 0 | Metric |
| 1.21 | axe on the open sheet: zero violations | Slice 1 evidence |
| 1.22 | 200% zoom (720 CSS px) and 320px: no sideways scroll; field and Close on one row | PRD §5 |
| 1.23 | U8 flow checks still pass | Slice 1 evidence |
| 1.24 | Screenshots at 320, 375, 390 and 844 by 390: closed, open empty, results, unavailable, offline | Slice 1 evidence |

### Slice 2: More › Search

| # | Check | From |
|---|---|---|
| 2.1 | Owner and Manager More: first item "Search", with icon and hairline | AC3.1 |
| 2.2 | Tap it: More closes, finder opens, field focused, keyboard up on iOS; `document.querySelectorAll('dialog.command-finder').length === 1` | AC3.2 |
| 2.3 | Close after opening from More: focus on the More trigger | 1.8 |
| 2.4 | `navigation.test.ts` unchanged and passing | AC3.3 |

### Slice 3: preview and devices

| # | Check | From |
|---|---|---|
| 3.1 | Preview, Owner and Manager at 390: Search button shows | AC5.1 |
| 3.2 | Tap it: notice "Search is not connected in this sample."; zero requests to the finder route | AC5.2 |
| 3.3 | iOS simulator (Safari tab and Home Screen app) and `Nevora_Pixel_7_API_36`: screenshots with the keyboard up; Android Back closes the sheet | Slice 3 evidence |

---

## 5. Draft scorecard (for the Product Designer)

| Line | Score | Why |
|---|---|---|
| Usability | 2 | Two taps plus typing to a person, place or action from any page |
| Familiarity | 2 | Glyph top right; field on top with Close; matches Shopify, Doji and Perplexity |
| Trust | 2 | Honest offline and unavailable lines; "No matches." only after a real check |
| Accessibility | 2 | 44px targets, 17px field, status in `role="status"`, focus return, text contrast 5.5:1 or more |
| Brand distinctiveness | 1 | Neutral by design; the brand comes through the masthead |
| Durability | 2 | System-standard search pattern |
| Cost | 2 | Phone CSS, one DOM move, one exposed `open()`, one clear button |
| Continuity | 2 | Desktop unchanged; four tabs plus More unchanged |
| **Total** | **15 / 16** | Go |


## Checkpoint 2 decisions (Jose, 2026-10-17)

- No decisions were needed. Approved as reviewed, including the desktop "unavailable" bug fix and the "Clear search" button.
- **Approved to build** once the review's required changes are applied to this spec.
