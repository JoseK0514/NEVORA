# Phone foundations: build spec

Status: approved for build (Checkpoint 2, 2026-10-17); review changes applied.

- **Initiative:** direction item 8 (A9). PRD: `docs/product/prd-phone-foundations.md` (slices 0 to 8), including "Decisions (Jose, 2026-10-17)": rebuild and commit the U10 snapshot script as a dev-only tool; desktop type stays in px. Merges `flows.md` (UX Designer) and `visual.md` (UI Designer) in this folder.
- **Written:** 2026-10-17 by the UI/UX Designer, cycle 1 merge step. Updated 2026-10-17 with the five required changes from `review.md` §3 and Jose's Checkpoint 2 decisions (J1 in this build, J2 next cycle).
- **Evidence:** the code at the lines cited, read on 2026-10-17; the UI Designer's live captures (`before-timecards-390.png`, `before-schedule-daypicker-390.png`, `before-schedule-1440.png`); `mockup.png` frames A to H; `.claude/evidence/d6/owner-app-schedule-1920.png`. I did not start the dev server for this merge.
- **Build order:** phone search slice 1 lands first, in px. Foundations slice 1 then converts the finder sizes to rem with the rest of the shared chrome.
- **Not in this build:** J2, the muted ring on the chosen segment of every other D4 segmented control. It is the first desktop item next cycle.
- **Phone layout** means the phone chrome query at `src/app/app/portal-gusto.css:284`; legacy rules at `max-width: 767px` count as phone rules.

## Contents

1. Screens
2. Decisions log
3. Decisions for Jose at Checkpoint 2
4. Acceptance checks for the build
5. Draft scorecard

---

## 1. Screens

Three changes, page by page. Each page slice runs **step A** (type to `rem`, zero visible difference at a 16px root) and then **step B** (intended changes, listed before they ship). The step A list must produce an empty diff; the step B diff must equal its list exactly.

### 1.1 Shared rules for every slice

**What grows at a larger root:** body, captions, headings, labels, figures, field text.
**What stays fixed:** icons, the NEVORA wordmark, company logo, illustrations, 4px bars, borders, focus rings, spacing, radii, and every 44px minimum. Containers grow to fit their text; a button can get taller than 44px, never shorter.

**Wrap, never cut.** When a row stops fitting, it stacks in reading order: label, then value, then action. Nothing gains an ellipsis it didn't have at default size. Rows that scroll sideways today (section tabs, the day picker) keep scrolling sideways.

**Conversion rules for step A.**

| Rule | Detail |
|---|---|
| Formula | `rem = px / 16`. Every phone size in use is a whole pixel, so each value resolves to the same pixel at a 16px root |
| Root | Untouched. No rule sets `font-size` on `html` or `:root` in px |
| Line-height | Convert every px line-height to rem (`px / 16`) in step A. Each n/16 value resolves to the same pixel at a 16px root, so the snapshot stays at zero diff, and a rem line-height grows with the root. Line-heights that are already unitless stay as they are. A px line-height may become unitless only where px ÷ font size is exact to three decimals (22px on 15px text rounds to 1.467, which computes to 22.005px and fails the snapshot, so it becomes 1.375rem) |
| Letter-spacing | Stays in `em` |
| Spacing, radii, borders, icons, targets, media queries | Stay in px (PRD §6) |
| Desktop | No change. Desktop rules keep px (Jose, Q2) |

**Phone tokens (slice 1, inside the phone query).**

| Token | Today | Step A value |
|---|---|---|
| `--mobile-body` (`src/app/mobile-workforce.css`) | 17px | 1.0625rem |
| `--mobile-caption` | 15px | 0.9375rem |
| `--mobile-title` | 24px | 1.5rem |
| `--mobile-card-title` | 20px | 1.25rem |
| `--g-t-display` (phone) | 500 28px/1.25 | 500 1.75rem/1.25 |
| `--g-t-title` (phone) | 500 20px/1.3 | 500 1.25rem/1.3 |
| `--g-t-body` (phone) | 400 16px/1.5 | 400 1rem/1.5 |
| `--g-t-small`, `--g-t-caption` (phone floor, `portal-gusto.css:77-80`) | 15px | 0.9375rem |
| Hard-coded page sizes (11 to 32px) | px | n/16 rem, page by page |
| Tab bar labels (one new token in slice 1) | 12px today on Home (`mobile-workforce.css:91`), but 9px and 10px legacy rules compete (`globals.css:650`, `:11517`, `portal-design-system.css:70`) | `font-size: min(0.75rem, 13px)` |

**Exception to the 15px phone floor.** Tab bar labels sit below the floor by design (U1): 12px today, capped at 13px. The phone px inventory and the floor checks skip them by name. Every other phone label, caption and status keeps 15px (0.9375rem) or more.

**Tab label cap.** 13px is the largest size that keeps every English label on one line in a 62.4px column at 320 ("Schedule" 58.8px, "Requests" 58.5px at 13px/600, measured by the UI Designer). The cap holds the header plus tab bar under 30% of a 375 by 667 screen. Browser zoom still scales the bar fully, so WCAG 1.4.4 holds. The mock-up's token table shows 14px; that's a typo, and 13px is the value to build.

### 1.2 Slice 1: shared chrome (header, tab bar, More sheets, section tabs, account menu, finder sheet)

| Part | Spec |
|---|---|
| Header | Wordmark and logo chip fixed. The page heading in the masthead grows. On screens 500px tall or less, the header keeps scrolling away (`portal-gusto.css:311`) |
| Tab bar | Labels at the cap; icons 22px fixed; bar height grows with the label up to the cap, then holds |
| More sheets | Rows keep `min-height: 48px` (they're list rows, not buttons). Labels grow and wrap |
| "Close actions" | Keeps its full-width pill (exception) |
| Finder sheet | Field and rows convert with the phone tokens; the phone-search spec owns its layout. Phone search slice 1 must land first; this slice converts the px sizes it adds |

**Not in the slice 1 change list:** the offline page. Its "Try again" link already has the D4 shape (48px, 8px corners, `public/fuel-portal-offline.html:22`; DESIGN.MD U0), and the page keeps its own px type because it isn't an app page. Slice 0 verifies it (check 0.4). Listing it as a change would make check B.1 fail when nothing changes.

### 1.3 One button shape on phones (step B, every page slice)

Applies inside the phone query to `.button.primary`, `.button.secondary`, `.pw-button`, `.ncc-button` and the stragglers the D4 inventory finds at 390. It mirrors D4 (`src/app/app/portal-desktop.css:170-176`) with phone type.

| Property | Value |
|---|---|
| Corners | `var(--g-control-radius)` (8px) |
| Height | `min-height: 44px` for every phone button. 48px only for named sticky confirms and sheet actions, set by class; list rows stay 48px (D5, amended at Checkpoint 3). The offline page's "Try again" already matches |
| Padding | 10px 16px |
| Label | 600, 1.0625rem (17px), line-height 1.25, `text-wrap: balance`, centred |
| Icon | 20px Phosphor, 8px gap |
| Pairs | Wrapping row, 12px gap, each button `flex: 1 1 max-content`. When two labels can't share a line, each button takes its own row; a label never wraps inside a half-width button |

| State | Primary | Secondary |
|---|---|---|
| Default | `--g-accent` fill, white label (5.53:1) | White, 1px `--g-border`, ink label |
| Hover (pointer only) | `--g-accent-hover` (7.82:1) | `--g-inset`, border #BFC3C8 |
| Pressed | Hover colour plus `scale(.98)`, 120ms `ease-out` | Same |
| Focus | 2px `--g-accent` outline, offset 2px | Same |
| Disabled | Opacity .55 (`portal-gusto.css:121`) | Same |
| Pending | Label changes ("Approving…"), size holds, locked, no spinner | Same |
| Large root | Label grows; button grows taller; pairs stack | Same |

**Exceptions** (skipped by name in the inventory): tab bar items, section tabs, segmented tracks and segments, status chips and task tags, the next-shift pass link, the "Close actions" pill, swipe-row backdrops, everything in the Clocker kiosk.

### 1.4 Timecards period controls (slice 4 employee, slice 8 manager)

File: `src/components/timecards.tsx:150-170`.

| Width | Layout |
|---|---|
| 390 and 320, default root | Manager: period start and end fields side by side (inputs 16px or larger); "View period" (primary) and "Refresh" (secondary) side by side, D4 shape, 44px, one line each. Employee at 390: the same. Employee at 320: the fields and both buttons stack, full width, 44px, one line each; it stacked before this build too (corrected after Checkpoint 3, `build-run-2/day-picker/timecards-employee-320.png`) |
| 390, 200% root | Fields stack, label above field. Buttons stack, primary first, full width. Summary figures stack one per row |
| 1440 | Unchanged |

**Manager short label.** The employee path already renders "Refresh" on phones with `aria-label="Refresh timecards"` (`timecards.tsx:156`, `employee-corporate-mobile-copy`). Give the manager path the same pair: visible "Refresh" in the phone layout, "Refresh timecards" on desktop, and `aria-label="Refresh timecards"` at every width. The visible word sits inside the accessible name (WCAG 2.5.3). `scripts/phase-d-browser-qa.mjs:66,70,82` keeps pressing "Refresh timecards".

**Summary figures** ("10 Timecards", "10 Need attention", "0 Finalized"): unchanged at default size. The flows' idea of one wrapped sentence with separators is logged for a later Timecards pass (decision F5).

| Element | Visible (phone) | Visible (desktop) | Accessible name |
|---|---|---|---|
| Primary | View period | View period | View period |
| Secondary | Refresh | Refresh timecards | Refresh timecards |

### 1.5 Schedule day picker (slice 6, phone and desktop)

Files: `src/components/manager-weekly-roster.tsx:114-118`; `src/app/app/schedule/manager-schedule.css:49-56`, `:142-143`; `src/app/mobile-workforce.css:124-129`; `src/app/app/portal-design-system.css:95-97`.

**Phone cascade (slice 0 measures it).** Three rule sets compete for the phone picker:

| Rule set | What it sets |
|---|---|
| `manager-schedule.css:142-143` | Flex row, 3px gap, 10px side padding |
| `mobile-workforce.css:124-129` (inside `max-width: 760px`, `[data-mobile-workforce="true"]`) | Flex, nowrap, `overflow-x: auto`, 8px gap; segments `flex: 0 0 44px`, `min-height: 60px`, 8px padding, `--mobile-control-radius` (the portal sets it to 8px, so it computes to 8px); "Full week" 72px; weekday and date both `--mobile-caption` (15px); chosen: `--mobile-selected` (#EDF4FF) wash with `--mobile-accent` teal text |
| `portal-design-system.css:95-97` (`max-width: 600px`) | Four-column grid, 4px gap, `overflow: visible`; segments `min-height: 52px`, padding 8px 4px. **Measured in slice 0:** the rule applies at 320 and 390, but only its `grid-template-columns` survives, and that does nothing under flex; the rest loses to mobile-workforce. Removed in step B of slice 6 |

The mobile-workforce selectors carry more weight than the other two, and `before-schedule-daypicker-390.png` shows a scrolling row, so I expect the mobile-workforce rules to win. That is a reading of the code, not a measurement. Slice 0 records the computed layout, font sizes, padding and chosen colours at 320 and 390 and states which rule wins (check 0.5). Then:

- **If the grid rule never applies:** remove `portal-design-system.css:95-97` in step A of slice 6. Removing a dead rule is zero diff.
- **If the grid rule applies at 320 (or any phone width):** keep the sideways scroll. Remove the grid rule in step B of slice 6 as a listed intended change. Why: one behaviour at every phone width, it matches the before capture at 390, and a four-column grid can't hold eight segments at a 200% root without cutting them.

| Part | Spec |
|---|---|
| Track | `.mws-day-navigation` becomes the track: `--g-inset` fill, 1px #E6E7E9 edge, 4px padding, 12px radius, `width: max-content`. Phones: sideways scroll (`overflow-x: auto`) inside the roster card at every phone width, with the section-tabs edge fade (`portal-gusto.css:257`) |
| Segments | 8px radius (12 minus 4), at least 44 by 44px, weekday over date. Desktop padding 7px 10px. Phones keep the segment box slice 0 measures (width, min-height, padding, gap); only the radius changes. "Full week" at least 72px wide; on phones it may sit on two lines |
| Divider | 1px #E2E4E7 between "Full week" and the first day, inset 8px top and bottom |
| Unchosen | Transparent; `--g-muted` 500 (5.64:1 on the track) |
| Chosen | White fill; `--g-ink` 600 on both lines (17.04:1); shadow `0 1px 3px rgb(17 24 39 / .1)`; plus `box-shadow: inset 0 0 0 1px var(--g-muted)`. The ring is the cue that meets 3:1: 5.64:1 against the track, 6.05:1 against the white fill |
| Today | Date in ink 600 plus a 4px `--g-ink` dot 5px above the segment's bottom edge. Kept when chosen. `aria-label` keeps ", today" |
| Phone sizes | Measured in slice 0 at 320 and 390 (`build-report.md`, slice 0 notes): `display: flex` from `mobile-workforce.css:124`; 8px gap; padding 0 16px 16px; sideways scroll (scroll width 468px against 288px at 320 and 358px at 390); "Full week" 72 by 66px; days 44 by 66px with 8px padding; corners already 8px; weekday and date both 15px, so both become 0.9375rem in step A with no size change in step B |
| Desktop sizes | Unchanged px |

| State | Look |
|---|---|
| Hover (pointer only) | Text turns ink, no fill, 150ms colour |
| Pressed (touch) | Chosen look on release; no extra pressed fill |
| Focus | 2px `--g-accent` outline, offset 1px (the D4 rule) |
| Chosen and today | Chosen look plus the dot |
| Increased contrast | Track edge and chosen ring turn `--g-ink` |
| Forced colours | Track border `CanvasText`; chosen segment `outline: 2px solid CanvasText` |
| 200% root (phone) | Segments grow taller; the row keeps scrolling sideways; the chosen segment stays in view (see "Keeping the chosen day in view") |

**Unchanged contracts:** `role="group"` with `aria-label="Schedule day"`, `aria-pressed`, the label "Full week" (`manager-weekly-roster.test.tsx:44`), the result summary " · Full week" and " · Sat, Oct 17", 44px targets.

**Keeping the chosen day in view.**

- **On load** (the picker mounts with a day chosen): set the picker's own `scrollLeft` so the chosen segment shows. No `scrollIntoView`. At 390 the picker sits at the bottom of the first screen (`before-schedule-daypicker-390.png`), and `scrollIntoView` there can scroll the whole page. The page must stay at `window.scrollY === 0`.
- **After a tap or key press inside the picker:** `scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })`; `behavior: 'auto'` under reduced motion. The picker is already on screen then, so the page doesn't jump.

**Slice 6 step B change list (day picker).** Every rule below changes in slice 6, in step B unless the row says otherwise. The step B diff must equal this list plus 1.6.

| Rule | Today | Build |
|---|---|---|
| `manager-schedule.css:49` `.mws-day-navigation` | Flex row, no track | The track above |
| `manager-schedule.css:50` segment transition | `.18s` background and colour | 150ms colour; `none` under reduced motion |
| `manager-schedule.css:55` `button.selected` (desktop) | Solid teal fill, white text | White fill, ink 600, 1px inset `--g-muted` ring |
| `mobile-workforce.css:129` `button.selected` (phone) | `--mobile-selected` wash, `--mobile-accent` teal text | Same as desktop: white fill, ink 600, ring |
| `manager-schedule.css:56` `button.today:not(.selected)` | Teal text, border | Ink 600 date plus the 4px dot; no teal |
| `mobile-workforce.css:125` segment radius (phone) | `--mobile-control-radius` (14px) | 8px |
| `portal-design-system.css:95-97` | Four-column grid at 600px and below | Removed: step A if slice 0 finds it dead, step B if it applies |

### 1.6 Other teal marks on Schedule (slice 6, J1 approved by Jose on 2026-10-17)

These four are listed intended changes in slice 6 step B, alongside the day picker list in 1.5.

| Element | Today | Build |
|---|---|---|
| `.mws-grid-heading .today strong` | Solid teal disc, white number (`manager-schedule.css:65`) | No disc; number ink 600 |
| `.mws-grid-heading small` "Today" | Teal text (`:64`) | `--g-ink` 600 |
| `.mws-day-cell.today` | 3% teal column tint (`:74`) | `color-mix(in srgb, var(--g-inset) 60%, var(--g-canvas))` |
| `.schedule-location-control .segmented a.selected` on phones | `--design-accent-ink` teal text (`:19`) | Ink 600, matching the D4 desktop rule (`portal-desktop.css:161`) |

The grid heading is `aria-hidden`; the day picker's ", today" label carries the fact for screen readers.

### 1.7 Pages at a 200% root (slices 2, 5, 7, 8)

| Page piece | Behaviour |
|---|---|
| Manager Home Today tiles | Two per row until a tile's content drops under 9rem, then one per row. Use a rem `minmax` in the grid, not a breakpoint (media queries stay px). Order unchanged; the coral edge on "Started, not clocked in" stays |
| Employee Home next-shift pass | Each time gets `white-space: nowrap`, so the range breaks after the dash; the countdown pill grows; the Published chip may drop under the heading; perforation and notches stay fixed |
| Timecards | As 1.4 |
| Employees cards, Inbox swipe rows, Requests | Rows stack label, value, action; no clipping |
| Section tabs | Keep sideways scroll |

### 1.8 States each slice repeats

| State | Default size | 200% root |
|---|---|---|
| Loading | Route skeletons (`src/components/route-skeleton.tsx`) and "Loading Home…" unchanged | Bars keep shape; captions grow; nothing overlaps |
| Empty | `EmptyState` unchanged | Title and description wrap; illustration keeps size |
| Error | "Unavailable" notices and Retry unchanged | Retry stacks under the text; no figure shows 0 |
| Offline | Offline page unchanged; "Try again" already in D4 shape (verified in slice 0) | Offline page keeps its own px |
| Partial | Script-pinned notice text unchanged ("Some Home sections could not be fully checked. Counts show known items.") | Wraps, no clamp |
| Success | Toasts unchanged | Toast grows and stays above the tab bar |
| Permission denied | "Sign in again to view Home." unchanged | Wraps |

### 1.9 Behaviour details

- **Keyboard order and focus:** unchanged on every page. At 200% the focus ring stays clear of the sticky header and tab bar (`scroll-padding-block`, `portal-gusto.css:306`).
- **Screen readers:** no change to names, roles or headings. The picker's `aria-pressed` reads as "selected" (VoiceOver) or "pressed" (TalkBack). "Refresh" keeps the name "Refresh timecards".
- **Gestures:** none added. The picker scrolls sideways by swipe; every day stays reachable by Tab and by tap, and the scrollbar stays (`scrollbar-width: thin`).
- **Safe areas:** unchanged; the tab bar keeps `env(safe-area-inset-bottom)`.
- **Offline:** covered in 1.8.
- **Reduced motion:** picker colour transition (150ms, replacing `.18s` at `manager-schedule.css:50`) becomes `transition: none`; button press drops the scale and keeps the colour (`portal-gusto.css:217-220`); picker scroll uses `behavior: 'auto'`.
- **200% browser zoom and 400% reflow:** the 81-view zoom run from DESIGN.MD Owed testing still passes on migrated pages.

### 1.10 Platforms

| Platform | What changes now |
|---|---|
| iOS Safari tab | Nothing visible at default. "Aa" page zoom keeps working |
| iOS PWA | Layouts ready; text grows only once the store shell passes Dynamic Type to the root (spike question 5) |
| Android Chrome tab and PWA | Same for the OS font scale. Firefox and Samsung Internet users with a larger default font size see phone text grow on migrated pages |
| Store apps (later) | The shell maps the OS setting to the root; this work gives it something to scale |
| Desktop web | No type change. The day picker ring and the other Schedule marks (J1) are the only desktop changes. Other segmented controls keep today's look until J2 next cycle |

Release notes must say that most iPhone users won't see text grow until the shell exists (PRD §3).

---

## 2. Decisions log

| # | Conflict or open point | Resolution | Why |
|---|---|---|---|
| D1 | Chosen-day style: UX proposed a `--g-inset` fill with ink 600 (V2); UI measured that fill at 1.07:1 against the white card and ink 600 vs muted 500 text at 2.82:1 | White segment on the D4 track plus a 1px inset `--g-muted` ring | Accessibility first: AC3.2 needs a cue at 3:1. The ring measures 5.64:1 against the track and 6.05:1 against the fill, and it keeps the D4 raised-segment look |
| D2 | Today marker: UX V3 suggested a dot on the picker and muted "Today" text in the grid header; UI chose ink 600 for "Today" | Dot on the picker; "Today" in ink 600 in the grid header (J1, approved) | Removing the teal disc removes a cue. Ink 600 text plus the bold date keeps "today" findable; both colours pass contrast |
| D3 | Tab label cap: visual.md says 13px; the mock-up table says 14px | 13px, `min(0.75rem, 13px)` | 14px overflows "Schedule" at 320 (63.4px in a 62.4px column) |
| D4 | "Close actions" pill (PRD Q5) | Keeps the pill | Sheet dismiss control, HIG sheet shape; UX, UI and PM agree |
| D5 | Phone button height (PRD Q6) | 44px for every phone button; 48px only for named sticky confirms and sheet actions, set by class; menu rows stay 48px. **Amended at Checkpoint 3 (2026-10-17):** the 48px full-width rule never applied (build review UI-F2) and was deleted in fix loop 1 | Matches D4's one size; a CSS rule can't tell a full-width primary from a short one; rows are rows (flows F8) |
| D6 | Manager Timecards visible text "Refresh timecards" → "Refresh" on phones | Accept as a step B intended change | The employee path already ships it; the accessible name and scripts stay exact |
| D7 | Timecards summary figures as one wrapped sentence (flows 2.1, F5) | Not this initiative; log for a Timecards pass | Changes markup and reading, beyond type and shape. At a 200% root the figures stack one per row |
| D8 | "0 selected ›" pill (flows F6) | Log for a Timecards pass | Copy and behaviour, outside this PRD |
| D9 | Spanish "Solicitudes" overflows a 320 tab even at 12px (visual UI-1) | Log for B5: a shorter label or two-line tab labels | B5 isn't approved; nothing to build now |
| D10 | Schedule's other teal marks (grid disc, "Today" label, column tint, phone location switcher; flows F4, visual 3.2) | In slice 6 as listed intended changes (J1, approved 2026-10-17) | Outside the PRD's acceptance criteria, so it's a scope addition Jose approved |
| D11 | Extend the ring to every D4 segmented control (visual UI-3) | Not in this build. Jose approved it as the first desktop item next cycle (J2) | Their chosen state is the same 1.07:1 white-on-inset; it touches 14 desktop pages outside this PRD and needs its own inventory and snapshot run |
| D12 | 200% Today tiles can't use a breakpoint (media queries stay px) | rem `minmax` in the grid | Flows 2.3 and visual 3.3 agree |
| D13 | Line-heights: first draft converted px to unitless (review §2.1) | rem (`px / 16`); unitless only where exact to three decimals | Unitless values like 1.467 compute to 22.005px, so step A fails on rounding and long pages can shift a line |
| D14 | Phone day picker: three competing rule sets, never measured (review §2.2) | Slice 0 measures; phone keeps sideways scroll; the grid rule goes either way | One phone behaviour; the before capture shows scroll; a four-column grid cuts segments at 200% |
| D15 | The phone chosen day is a wash with teal text, not a teal fill (review §2.3) | Slice 6 names both selected rules and the today rule | Teal text on a selection breaks P1 too; a list that names one rule fails B.1 |
| D16 | `scrollIntoView` on load can scroll the page (review §2.5) | Set the picker's `scrollLeft` on load; `scrollIntoView` only after input inside the picker | The picker sits at the fold at 390 |
| D17 | Offline "Try again" listed as a slice 1 change, but it already conforms (review §2.4) | Dropped from the change list; verified in slice 0 | A listed change that doesn't happen fails B.1 |
| D18 | Tab labels sit under the 15px floor | Named exception (U1) | 13px is the largest size that keeps "Schedule" on one line at 320 |

---

## 3. Decisions for Jose at Checkpoint 2

Resolved 2026-10-17.

| # | Decision | Outcome |
|---|---|---|
| J1 | Add Schedule's four other teal "selected/today" marks (1.6) to slice 6 as listed intended changes | **Approved, in this build.** The P1 inventory at 1440 would flag them anyway, the phone location switcher is a D4 miss ("teal for actions only, every width"), and fixing them in the slice that already touches the picker keeps one selection language on the page |
| J2 | Give every D4 segmented control (Inbox filters, Locations filters, Home task filters, request tabs, Updates and Notifications filters, My shifts / Open shifts, Shift requests views, Branding preview) the same 1px `--g-muted` ring on the chosen segment | **Approved for next cycle, not in this build.** It is the first desktop item next cycle. Their chosen white segment is also 1.07:1 against the track, so the selection cue fails WCAG 1.4.11 the same way. It changes 14 desktop pages and needs its own inventory and snapshot run. No slice here touches those controls |

---

## 4. Acceptance checks for the build

Run on the fictional runtime in a worktree. "200% root" means the slice 0 helper sets the root to 200% at 390.

### Slice 0: baselines

| # | Check | From |
|---|---|---|
| 0.1 | U10 snapshot script rebuilt under `scripts/` as a dev-only tool (fictional runtime only) | Jose Q1 |
| 0.2 | Baselines at 320, 375, 390, 1440; per-page phone `px` font count; button and P1 inventories at 390 | Slice 0 |
| 0.3 | 200% root helper available to every slice | Slice 0 |
| 0.4 | Offline page: "Try again" computes to 48px tall with 8px corners; nothing in this initiative changes the file | Review §3.5 |
| 0.5 | Day picker cascade at 320 and 390: computed `display`, `grid-template-columns`, `overflow-x`, gap, segment width, min-height, padding, radius, weekday and date font sizes, chosen fill and text colour, and which rule set supplies each. Recorded in the slice 0 notes; spec §1.5 "Phone sizes" and the `portal-design-system.css:95-97` row updated before slice 6 | Review §3.2 |

### Every page slice

| # | Check | From |
|---|---|---|
| A.1 | Step A: computed-style snapshot at default size, 38 properties per element, zero differences beyond the noise baseline at 320, 375, 390. Converted line-heights are rem (`px / 16`) and compute to whole pixels | AC1.1, review §3.1 |
| A.2 | Masked full-page screenshots at 320, 375, 390: zero pixel differences outside the masks | AC1.2 |
| A.3 | 1440: zero differences on every page in the sweep | AC1.3 |
| A.4 | No `font-size` on `html` or `:root` in px | AC1.4 |
| A.5 | 200% root at 390: no sideways scroll; no `overflow: hidden` text where `scrollWidth > clientWidth` that didn't clip at default; no overlapping targets; every target 44px or more; focus ring visible and clear of sticky chrome | AC1.5 |
| A.6 | 200% root: tab labels at the 13px cap on one line (named exception to the 15px floor); Today strip figures, next-shift pass, Timecards rows, Employees cards wrap and stay readable | AC1.6 |
| A.7 | Every input computed at 16px or more at default | AC1.7 |
| B.1 | Step B diff equals the pre-listed changes, nothing missing, nothing extra | PRD §9 |
| B.2 | Button inventory at 390: primary and secondary buttons 8px radius, 44px or taller, one-line labels at 320 wherever they fit at 390; exceptions skipped by name | AC2.1, AC2.3 |
| B.3 | Labels, accessible names, actions and positions unchanged | AC2.4 |
| S.1 | Loading, empty, error, offline, partial, success and permission states hold at default and at 200% root (1.8) | PRD §5 |
| S.2 | 81-view zoom run passes on migrated pages; 156-check sweep and the U1, U2, U3, U4, U8, B3, B4, D1 to D6 checks pass | PRD §5, §7 |
| S.3 | Default brand plus one stress brand | PRD §7 |

### Slice-specific

| # | Check | From |
|---|---|---|
| 4.1 | Timecards at 320 and 390, both roles: secondary reads "Refresh" on one line; accessible name exactly "Refresh timecards"; `phase-d-browser-qa.mjs` passes | AC2.2 |
| 6.1 | Day picker at 320, 390 and 1440: chosen control has no teal fill and no teal text; a today segment that isn't chosen has no teal text (`manager-schedule.css:55`, `:56`, `mobile-workforce.css:129` all changed) | AC3.1, review §3.3 |
| 6.2 | Chosen control: ink 600 plus a 1px `--g-muted` ring measuring 3:1 or more against the track | AC3.2 |
| 6.3 | `aria-pressed`, "Full week", " · Full week", 44px targets, ", today" behave as before; `manager-weekly-roster.test.tsx` passes | AC3.3 |
| 6.4 | P1 inventory on Schedule at 390 and 1440: no teal fill or text on the day picker, grid header disc, "Today" label, today column tint or phone location switcher (J1) | AC3.4, J1 |
| 6.5 | Forced colours: chosen segment shows a 2px `CanvasText` outline | PRD §5 |
| 6.6 | Reduced motion: picker transition off; scroll into view after a tap is instant | PRD §5 |
| 6.7 | Load Schedule at 390 with a day chosen that sits off screen in the picker: the chosen segment is visible in the picker and `window.scrollY` is 0 | Review §3.4 |
| 6.8 | Phone picker scrolls sideways at 320 and 390; no four-column grid | Review §3.2 |
| 6.9 | Other D4 segmented controls (Inbox, Locations, Home task filters and the rest of the J2 list) show no diff in this build | J2 |
| 8.1 | Payroll copy diff empty | PRD §7 |

### Metrics to report per slice

Phone px font rules on migrated pages (target 0); default-size diffs (0); pages passing AC1.5 at 200%; off-standard phone buttons (0); "Refresh timecards" lines at 320 (1); teal fills on non-interactive Schedule elements (0).

---

## 5. Draft scorecard (for the Product Designer)

| Line | Score | Why |
|---|---|---|
| Usability | 2 | Text can grow; buttons hold one line; the chosen day reads as chosen |
| Familiarity | 2 | Same segmented control and button shape people already see on desktop |
| Trust | 2 | One shape reads finished; teal returns to actions only |
| Accessibility | 2 | Ring meets 1.4.11; 44px kept at 200%; rem type ready for large text |
| Brand distinctiveness | 1 | Neutral at default size |
| Durability | 2 | Retires legacy shapes and px |
| Cost | 1 | Page-by-page slices, each with two diff proofs |
| Continuity | 2 | Same labels, positions and names |
| **Total** | **14 / 16** | Go |


## Checkpoint 2 decisions (Jose, 2026-10-17)

- **J1 approved:** fix Schedule's four other teal "selected" and "today" marks in slice 6.
- **J2 approved for next cycle:** add the muted ring to the chosen segment of every D4 segmented control, as the first desktop item next cycle. Not part of this build.
- **Approved to build** once the review's required changes are applied to this spec.
