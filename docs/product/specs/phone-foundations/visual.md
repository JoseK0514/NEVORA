# Phone foundations: visual spec

- **Initiative:** direction item 8 (A9). PRD: `docs/product/prd-phone-foundations.md`, including "Decisions (Jose, 2026-10-17)": rebuild and commit the U10 snapshot script; desktop type stays in px. Flows: `flows.md` in this folder.
- **Written:** 2026-10-17 by the UI Designer, cycle 1 design step.
- **Evidence:** live fictional portal (Owner) on 2026-10-17: `before-timecards-390.png` (every Timecards button is a 999px pill; "Refresh timecards" is 73px tall on two lines), `before-schedule-daypicker-390.png`, `before-schedule-1440.png`; computed styles read in the same run; `.claude/evidence/d6/owner-app-schedule-1920.png`; Inter widths measured in Chromium from `public/fonts/typeface/inter/variable.ttf`. Mock-up: `mockup.html`, `mockup.png`.

## 1. Visual intent

At default size nobody should see a change from the type work. The two visible changes make phones match desktop: one 8px button shape, and a chosen day that looks chosen in ink while teal keeps meaning "press here".

## 2. Tokens

### 2.1 Phone type in rem (step A, zero visible change)

Rule: `rem = px / 16`. Every phone size in use is a whole pixel, so every rem value is a multiple of 1/16 and resolves to the same pixel at a 16px root. No rounding, no subpixel drift. The root stays at 100% (AC1.4).

| Token (inside the phone query) | Today | Proposed |
|---|---|---|
| `--mobile-body` (`mobile-workforce.css`) | 17px | 1.0625rem |
| `--mobile-caption` | 15px | 0.9375rem |
| `--mobile-title` | 24px | 1.5rem |
| `--mobile-card-title` | 20px | 1.25rem |
| `--g-t-display` (phone) | 500 28px/1.25 | 500 1.75rem/1.25 |
| `--g-t-title` (phone) | 500 20px/1.3 | 500 1.25rem/1.3 |
| `--g-t-body` (phone) | 400 16px/1.5 | 400 1rem/1.5 |
| `--g-t-small`, `--g-t-caption` (phone floor, `portal-gusto.css:77-80`) | 15px | 0.9375rem |
| Hard-coded page sizes (11, 12, 13, 14, 18, 22, 32px…) | px | n/16 rem, page by page |
| Tab bar labels | 12px | `min(0.75rem, 13px)` (2.2) |

Conversion rules for the UI Engineer:

- **Line-height:** keep unitless values. Convert any `px` line-height to unitless (target px ÷ font px, to 3 decimals) in the same step and confirm zero diff; a px line-height clips text at a 200% root.
- **Letter-spacing:** keep `em`. It scales with the font.
- **Spacing, radii, borders, icon sizes, 44px minimums:** stay in px (PRD §6). Controls grow from their text, never shrink below 44px.
- **What stays fixed at a large root** (agrees with UX decision 1): icons, the NEVORA wordmark, company logo, illustrations, 4px bars, borders, focus rings.

### 2.2 Tab label cap (PRD Q4, UX V1)

Measured Inter widths at weight 600 (the active tab): "Schedule" 54.3px at 12px, 58.8px at 13px, 63.4px at 14px; "Requests" 54.0, 58.5, 63.0. A tab column at 320 is 62.4px (320 ÷ 5, less the bar's 4px side padding). 13px is the largest size that keeps every English label on one line at 320, so the cap is `font-size: min(0.75rem, 13px)`.

That growth is small (12 to 13px). iOS does the same for tab bars and offers the large content viewer instead; the web has no equivalent, so the label's accessible name and the page heading carry it. Browser zoom still scales the bar fully (WCAG 1.4.4).

Spanish: "Solicitudes" measures 64.3px at 12px, so it overflows at 320 even today. B5 needs a shorter label (for example "Pedidos") or a two-line tab label. Flagged as UI-1.

### 2.3 Colour

No new colour token. The chosen day reuses D4 values and `--g-muted`.

| Use | Value | Contrast |
|---|---|---|
| Picker track | `--g-inset` #F6F7F8, 1px #E6E7E9 edge | Structural |
| Chosen segment fill | #FFFFFF | 1.07:1 against the track: not enough alone |
| Chosen segment ring | 1px inset `--g-muted` #5F6368 | 5.64:1 against the track, 6.05:1 against the white fill (WCAG 1.4.11 needs 3:1) |
| Chosen text | `--g-ink` 600 | 17.04:1 on white |
| Unchosen text | `--g-muted` 500 | 5.64:1 on the track |
| Today dot | 4px `--g-ink` circle | 15.89:1 on the track |
| Primary button | white on `--g-accent` | 5.53:1; hover `--g-accent-hover` 7.82:1 |
| Secondary button | ink on white, 1px `--g-border` | 17.04:1 text |

## 3. Components and states

### 3.1 One button shape on phones (step B)

Applies to `.button.primary`, `.button.secondary`, `.pw-button`, `.ncc-button` and the page stragglers the D4 inventory finds at 390, inside the phone query. It mirrors D4 (`portal-desktop.css:170-176`) with phone type.

| Property | Value |
|---|---|
| Corners | `var(--g-control-radius)` (8px) |
| Height | `min-height: 44px`; 48px for a full-width primary (sticky confirms, sheet actions, offline "Try again"). This answers PRD Q6 |
| Padding | 10px 16px |
| Label | 600, 1.0625rem (17px), line-height 1.25, `text-wrap: balance`, centred |
| Icon | 20px Phosphor, 8px gap |
| Pairs | Wrapping row, 12px gap, each button `flex: 1 1 max-content`. When two labels can't share a line, each button takes its own row instead of wrapping its label |
| Short labels | "Refresh timecards" shows the existing phone label "Refresh" for both roles; the name stays "Refresh timecards" (AC2.2, UX decision 4) |

| State | Primary | Secondary |
|---|---|---|
| Default | `--g-accent` fill, white label | White, 1px `--g-border`, ink label |
| Hover (pointer only) | `--g-accent-hover` | `--g-inset`, border #BFC3C8 |
| Pressed | Hover colour plus `scale(.98)`, 120ms | Same |
| Focus | 2px `--g-accent` outline, offset 2px | Same |
| Disabled | Opacity .55 (`portal-gusto.css:121`) | Same |
| Pending | Label changes ("Approving…"), size holds, locked, no spinner (Phase 4) | Same |
| Large root | Label grows, button grows taller; pairs stack | Same |

**Exceptions** (PRD §7, unchanged): tab bar items, section tabs, the segmented track and segments, status chips and task tags, the next-shift pass link, swipe backdrops, the Clocker. **"Close actions" keeps its pill** (PRD Q5, UX V4): it's a sheet dismiss control, the HIG sheet shape, and it already passed U10.

### 3.2 Schedule day picker: chosen day off teal (step B)

Today `.mws-day-navigation button.selected` is white on `--design-primary` (`manager-schedule.css:55`); today's date is teal text with a border (`:56`); buttons use 13px corners and no track.

Proposal: the D4 segmented track and chosen style, adapted for two-line segments.

| Part | Value |
|---|---|
| Track | `.mws-day-navigation` becomes the track: `--g-inset`, 1px #E6E7E9, 4px padding, 12px radius, `width: max-content`. On phones it keeps scrolling sideways inside the roster card (`overflow-x: auto`), with the section-tabs edge fade (`portal-gusto.css:257`) |
| Segments | 8px radius (concentric: 12 − 4), min 44 by 44px, padding 7px 10px, weekday over date. "Full week" min 72px and may sit on two lines on phones, matching the weekday-over-date shape |
| Divider | 1px #E2E4E7 between "Full week" and Monday, 8px inset top and bottom |
| Chosen | White fill, ink, weight 600 on both lines, D4 shadow `0 1px 3px rgb(17 24 39 / .1)`, plus `inset 0 0 0 1px var(--g-muted)` |
| Today | Date in ink 600; a 4px ink dot 5px from the segment's bottom edge. Kept when chosen. `aria-label` keeps ", today" |
| Unchosen | Transparent, `--g-muted` 500 |
| Phone sizes | Weekday 0.9375rem (15px), date 1.0625rem (17px), as computed today |

| State | Look |
|---|---|
| Default | Track, muted segments |
| Hover (pointer only) | Text turns ink, no fill, 150ms colour (the D4 rule) |
| Pressed | Touch: the chosen look appears on release; no extra pressed fill |
| Focus | 2px `--g-accent` outline, offset 1px |
| Chosen | As above; `aria-pressed="true"` unchanged |
| Chosen and today | Chosen look plus the dot |
| Disabled, loading, empty, error | The picker has none of its own; the roster's skeleton and empty states stay |
| Increased contrast | Track edge and chosen ring turn `--g-ink` |
| Forced colours | Track border `CanvasText`; chosen segment `outline: 2px solid CanvasText` (the PRD's "visible border in forced colours") |

**Why a ring and not a neutral fill (UX V2).** A `--g-inset` fill on the white roster card measures 1.07:1, and ink 600 against muted 500 text is 2.82:1. Neither meets AC3.2's 3:1. The ring gives 5.64:1 and keeps the D4 look of a raised white segment.

**P1 neighbours on the same page (UX finding F4).** Outside the PRD's AC, but the P1 inventory at 1440 will flag them. I recommend fixing them in slice 6 as listed intended changes:

| Element | Today | Proposed |
|---|---|---|
| `.mws-grid-heading .today strong` | Teal disc, white number (`manager-schedule.css:76`) | No disc; number ink 600 |
| `.mws-grid-heading small` ("Today") | Teal (`:75`) | `--g-ink` 600 |
| `.mws-day-cell.today` | 3% teal column tint (`:84`) | `color-mix(in srgb, var(--g-inset) 60%, var(--g-canvas))` |
| `.schedule-location-control .segmented a.selected` (phone) | `--design-accent-ink` teal text (`:20`) | Ink 600, matching D4's desktop rule (`portal-desktop.css:161`) |

### 3.3 Pages at a 200% root

Visual rules that back UX section 2:

- Today tiles: two per row until a tile drops under 9rem of content, then one per row (a rem `minmax`, not a breakpoint).
- Next-shift pass: the time range breaks after the dash, never inside a time (`white-space: nowrap` on each time).
- Period fields on Timecards stack, label above field.
- Header: the wordmark stays 124px; the page heading in the masthead grows.

## 4. Mock-ups and screenshots

| File | What it shows |
|---|---|
| `mockup.html`, `mockup.png` | A/B Timecards controls today and proposed; C button states; D/E/F day picker today, Full week chosen, today chosen at 390; G desktop states incl. forced colours; H 200% root; the rem table |
| `before-timecards-390.png` | Pills and the two-line "Refresh timecards" |
| `before-schedule-daypicker-390.png` | Today's phone picker |
| `before-schedule-1440.png` | Today's desktop picker with the solid teal "Full week" |

## 5. Motion

| What | Motion | Reduced motion |
|---|---|---|
| Day picker colour | 150ms `ease` on `color`, `background-color`, `box-shadow`. Replaces today's `.18s` (`manager-schedule.css:50`) to match D4 | `transition: none` |
| Button press | 120ms `ease-out`, background and `scale(.98)` | Colour only, no scale (`portal-gusto.css:217-220`) |
| Root size change | None. Text reflows at once | Same |
| Picker scroll to the chosen day | `scrollIntoView({ inline: 'nearest', behavior: 'smooth' })` | `behavior: 'auto'` |

## 6. Draft scorecard

| Line | Score | Why |
|---|---|---|
| Usability | 2 | Text that can grow; buttons that hold one line |
| Familiarity | 2 | D4 segmented control and button shape people already see on desktop |
| Trust | 2 | One shape reads finished; teal back to actions only |
| Accessibility | 2 | Ring meets 1.4.11; 44px kept; rem type ready for large text |
| Brand distinctiveness | 1 | Neutral at default size |
| Durability | 2 | Retires legacy shapes and px |
| Cost | 1 | Page-by-page slices with zero-diff proofs |
| Continuity | 2 | Same labels, positions and names |
| **Total** | **14 / 16** | Go |

## 7. Open questions

| # | Question | Recommendation |
|---|---|---|
| UI-1 | "Solicitudes" overflows a 320 tab even at 12px | B5 picks a shorter Spanish tab label, or allows two-line tab labels. Decide before B5 |
| UI-2 | Fix the four P1 neighbours on Schedule (3.2) in slice 6? | Yes, as listed intended changes |
| UI-3 | Give every D4 segmented control the same 1px muted ring? Their chosen white segment is also 1.07:1 against the track | Yes, in a desktop follow-up, so selection looks the same everywhere |
