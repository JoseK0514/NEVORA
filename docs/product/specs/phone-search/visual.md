# Phone search: visual spec

- **Initiative:** direction item 6 (A8). PRD: `docs/product/prd-phone-search.md`. Flows: `flows.md` in this folder (UX Designer).
- **Written:** 2026-10-17 by the UI Designer, cycle 1 design step.
- **Evidence:** live fictional portal (Owner) captured with Playwright at 320, 390, 844 by 390 and 1440 on 2026-10-17 (`before-*.png` here); the code cited inline; `mockup.html` and `mockup.png` here.
- **References:** Trainline's grouped search results with the top row tinted ([mobbin](https://mobbin.com/screens/03fd4b32-a7e9-4a77-859c-de070c0b5a41)); Rakuten's filled field with a text close control ([mobbin](https://mobbin.com/screens/5f25595a-f37a-4bf2-b933-6f1f62ecc064)); Perplexity's in-field clear button ([mobbin](https://mobbin.com/screens/b27ec646-8b6f-4dbb-9f5e-54e759155016)).

## 1. Visual intent

Search on a phone should look like the bell beside it: a plain white glyph in the masthead, no pill, no label. The sheet that opens is a quiet white page with a grey field and a teal "Close", so it reads as a system search screen and not as a new NEVORA feature.

## 2. Tokens

No new token. Every value below exists in `src/app/app/portal-gusto.css:5-32`.

| Use | Token | Value | Contrast |
|---|---|---|---|
| Search glyph on the masthead | `#FFFFFF` on `--g-masthead` | #FFFFFF / #1C4A47 | 9.91:1 |
| Same, Ocean brand (`deriveBrand("#1D4ED8")`) | `#FFFFFF` on derived masthead | #FFFFFF / #273B66 | 11.03:1 |
| Any brand | B1 floor: white on header ≥ 7:1 (`derive.ts`) | | ≥ 7:1, so AC1.5's 3:1 always holds |
| Pressed disc | `rgb(255 255 255 / .14)` on masthead | | Decorative; the glyph stays white |
| Sheet canvas | `--g-canvas` | #FFFFFF | |
| Field fill | `--g-inset` | #F6F7F8 | Field text `--g-ink` 15.89:1; placeholder `--g-muted` 5.64:1 |
| Field focus | 1px `--g-accent` border plus 1px `--g-accent` ring | #077572 | 4.72:1 against the inset fill (3:1 needed) |
| "Close" | `--g-accent` text | #077572 on white | 5.53:1 |
| Group labels, detail, status line | `--g-muted` | #5F6368 on white | 6.05:1 |
| Highlighted row | `--g-accent-wash` fill, `--g-accent-strong` label | #E7F3F2 / #07605F | 6.50:1 |
| Pressed row | `--g-accent-pressed` fill | #D3EAE8 / #07605F | 5.87:1 |
| Hairlines | `--g-hairline` | #ECEDEF | Structural only |

Teal stays on actions only (P1): Close, the highlighted and pressed rows (each row is a link), the focus ring. The status line is grey because loading, unavailable and offline are waiting states on the ladder, not errors.

## 3. Components and states

Mock-up frames A to J: `mockup.png`.

### 3.1 Header search button

Today: the trigger is the desktop pill `.command-finder-trigger`, hidden below 760px (`portal-gusto.css:324`). The phone header shows only the wordmark and the bell (`before-owner-home-390.png`, bell at x 330, 44 by 44). In landscape the pill and the account menu both leak into the phone header (`before-landscape-844x390.png`).

| Property | Value |
|---|---|
| Hit area | 44 by 44px, `border-radius: 999px`, matching the bell (`mobile-workforce.css:43`) |
| Glyph | Phosphor `MagnifyingGlass`, 22px, regular, `currentColor` white. Same size and weight as the bell's `BellSimple` (`notification-bell.tsx:34`) |
| Placement | Inside `.mobile-header-actions`, before the bell. Order: wordmark, logo chip, Search, bell |
| Spacing | No gap between the two 44px targets; the glyphs sit 22px apart |
| Landscape | Use the phone chrome query (`portal-gusto.css:284`) for the icon button and for hiding `.portal-account-menu` and the pill. The UX flows log this as F4 |

| State | Look |
|---|---|
| Default | White glyph, transparent ground |
| Hover (pointer devices only, `@media (hover: hover)`) | `rgb(255 255 255 / .10)` disc |
| Pressed | `rgb(255 255 255 / .14)` disc, 120ms colour change, no scale |
| Focus | 2px white outline, inset 2px: the existing `.mobile-header :is(a,button):focus-visible` rule |
| Open | The sheet covers the header; no "selected" state needed |
| Disabled, loading, empty, error | Not applicable: the button always opens the sheet. The sheet carries the states |
| Preview | Same button. The tap shows the existing `.ui-preview-notice` line |

**At 320 with a logo chip (UX V1).** The budget is 16 + 124 (wordmark, measured) + 10 + chip + 88 + 16. Give the chip `flex: 0 1 auto; min-width: 40px; max-width: 88px` with the image at `max-width: 100%; object-fit: contain`. The chip shrinks first and holds a 66px logo at 320. The wordmark and both 44px targets never shrink. I don't hide the chip at any width: the company logo is the B1 feature an Owner paid attention to, and 40px still shows a square mark.

### 3.2 Full-screen sheet

The same `<dialog class="command-finder">`, restyled inside the phone chrome query.

| Part | Value |
|---|---|
| Dialog | `width: 100vw; height: 100dvh; max-width: none; max-height: none; margin: 0; border: 0; border-radius: 0; box-shadow: none`. Top padding `env(safe-area-inset-top)`, bottom `env(safe-area-inset-bottom)`. `::backdrop` stays but never shows |
| Search row | Field plus Close on one row, 8px gap, padding 6px 8px 8px 16px, hairline under it. Pinned; only the list scrolls |
| Field | `--g-inset` fill, 8px radius (`--g-control-radius`), 44px tall, 12px side padding, 20px `MagnifyingGlass` in `--g-muted`, input 17px `--g-ink` (no iOS zoom, AC2.3) |
| Placeholder | Recommend "Search" on phones. The desktop placeholder "Search pages, people and places" measures 264px at 17px Inter and the field has about 250px at 390, so it gets cut. The accessible name stays "Search pages, people and places" |
| Clear button (UX P2) | Shown once the field has text. Phosphor `XCircle` fill, 20px, `--g-muted`, centred in a 44px target at the field's right edge. Name "Clear search" |
| Close | Tertiary text button: `--g-accent`, 17px/500, at least 56 by 44px. Visible text "Close", name "Close search" |
| Status line | 15px `--g-muted`, padding 12px 16px, hairline under it, directly under the search row. Move it in DOM order so reading order matches what you see (UX decision 3). Hidden when empty, as today |
| Group labels | 15px/600 `--g-muted`, sentence case on phones (drop the desktop `text-transform: uppercase` and 12px). This keeps the 15px phone floor |
| Rows | 48px minimum, 8px radius, 6px 8px padding. Label 17px ink, line-height 1.35, wraps; detail 15px muted, right-aligned, drops under the label when it can't fit. No ellipsis |
| Hint row | `display: none` on phones (AC2.6) |

| State | Look |
|---|---|
| Open, empty query | Actions and Pages, first row highlighted (frame D) |
| Typing, results | Grouped rows, first row highlighted (frame E) |
| Highlighted row (UX V3) | Keep the wash on touch screens: the keyboard's Go key opens that row, so the highlight tells you what Go does |
| Pressed row | `--g-accent-pressed` while the finger is down |
| Loading | "Loading people and places…" in the status line. No spinner, no skeleton (PRD §5) |
| Unavailable | "People and places are unavailable right now." No People or Locations group. Never "No matches." (frame G) |
| Offline | "People and places unavailable offline" (frame H) |
| No match | "No matches." in the same line |
| Focus | The field shows its teal border and ring while focused. Close and the clear button take the standard 2px teal outline, offset 2px |
| Success | The sheet closes with no exit motion; the destination's route skeleton takes over |
| Error on navigation | The existing offline page or route error page; the sheet adds nothing |

UX V4 asks whether the status line could read as helper text for the field. The hairline under the search row separates them, and the line sits in the list area with list-style padding (frames F to H).

### 3.3 More › Search row

| Property | Value |
|---|---|
| Row | Same `nevora-action-menu-item` as the destinations: 48px, 17px label, ink |
| Icon (UX V2) | Phosphor `MagnifyingGlass`, 22px, ink, 12px gap. It's the only icon in the manager More list; that marks it as a tool, not a page |
| Separator | 1px `--g-hairline` under the row, 4px space below |
| States | Pressed: the menu item's existing pressed fill. Focus: the existing 2px teal outline |

"Close actions" keeps its pill (phone-foundations Q5).

### 3.4 Desktop

No visual change at 1440 or 1920. The pill, the 620px dialog, 40px rows and the hint row stay. The U10 snapshot must show zero differences (AC2.9). The 44px desktop row (PRD Q3) waits for a desktop pass.

### 3.5 Platforms

| Platform | Notes |
|---|---|
| iOS Safari tab | Sheet sits under the status bar; the floating toolbar hides with the keyboard up. Top padding comes from the page, not `safe-area-inset-top` |
| iOS PWA (standalone) | `safe-area-inset-top` keeps the field clear of the status bar and the Dynamic Island. Check on the iOS 26.5 simulator |
| Android Chrome and PWA | `100dvh` follows the keyboard; the gesture bar inset pads the list end |
| Store app (later) | The same web sheet in the Capacitor web view. A native search bar is out of scope |
| Desktop web | Unchanged |
| Large text and 200% zoom | Field, Close and rows grow with their text. At 320 the row stays field plus Close; the placeholder "Search" fits at 34px. Rows wrap |
| Increased contrast | Field gets a 1px `--g-ink` border; sheet hairlines turn `--g-ink` (matches `portal-gusto.css:343`) |
| Forced colours | Field border `CanvasText`; highlighted row `Highlight` and `HighlightText` |
| Dark mode | Not in scope (A16) |

## 4. Mock-ups and screenshots

| File | What it shows |
|---|---|
| `mockup.html`, `mockup.png` | Frames A to J: header at 390, 320 with an Ocean brand and logo, 375 focus; sheet empty, results, loading, unavailable, offline; More with Search; landscape |
| `before-owner-home-390.png` | Today's phone header: wordmark and bell only |
| `before-owner-home-320.png` | Today's header at 320, the width budget for 3.1 |
| `before-landscape-844x390.png` | Desktop pill and account menu in the landscape phone header |
| `before-owner-more-390.png` | Today's manager More sheet |

## 5. Motion

| What | Motion | Reduced motion |
|---|---|---|
| Sheet open and close | None, at every setting. U8 chose no motion for the finder; the phone keeps it | Same |
| Header button press | 120ms background colour, ease-out | Instant colour change |
| Row press | Background colour only, 120ms | Instant |
| More closing into the sheet | More hides at once in the same tap (UX decision 2); no 110ms close transition, no cross-fade | Same |
| Keyboard | The OS animates the keyboard. The pinned search row never moves | Same |

## 6. Draft scorecard

| Line | Score | Why |
|---|---|---|
| Usability | 2 | Two taps to a person or action from any page |
| Familiarity | 2 | Glyph top right; field on top with Close; matches the Mobbin references |
| Trust | 2 | No new colours or motion; honest unavailable and offline lines |
| Accessibility | 2 | 44px targets, 17px field, 15px floor kept, status in `role="status"`, contrast 5.5:1 or more on every text |
| Brand distinctiveness | 1 | Neutral by design; brand colours flow through the masthead |
| Durability | 2 | System-standard pattern |
| Cost | 2 | CSS inside the phone query plus a DOM move for the status line |
| Continuity | 2 | Desktop unchanged; the four tabs and More stay |
| **Total** | **15 / 16** | Go |

## 7. Open questions

| # | Question | Recommendation |
|---|---|---|
| UI-1 | Phone placeholder "Search" instead of the desktop sentence? | Yes. The sentence gets cut at 390. Copy decision for the UX writer |
| UI-2 | Keep the logo chip visible at 320 by shrinking it to 40px rather than hiding it? | Yes (3.1) |
| UI-3 | Desktop rows at 44px (PRD Q3) | Next desktop pass |
