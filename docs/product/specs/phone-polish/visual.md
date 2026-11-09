# Phone polish: visual spec

- **Initiative:** direction items 11 (A17, Back closes sheets), 12 (small fixes) and 13 (A13, Android shortcuts). PRD: `docs/product/prd-phone-polish.md` (no Jose decisions section yet). Flows: `flows.md` in this folder.
- **Written:** 2026-10-17 by the UI Designer, cycle 1 design step.
- **Evidence:** `.claude/evidence/errors/employee-home-1440.png` (tomorrow's pass above "Scheduled now"); live fictional employee Home at 390 on 2026-10-17 (`before-employee-shift-card-390.png`: no upcoming published shift, so the calm white card with "Scheduled now" second); `src/components/employee-home-reviewed.module.css:186-217` (the pass); `src/app/app/portal-motion.css:6-15` (motion tokens); gradient contrast computed from the pass CSS (3.2). Mock-up: `mockup.html`, `mockup.png`.
- **Reference:** the Future Pro home that U2 adapted, one coloured card leading Home ([mobbin](https://mobbin.com/screens/2b5839c4-0519-4df7-9341-bd7fd3a0f60b), cited in the UX flows).

## 1. Visual intent

Part A adds no new look: Back should close a sheet the way the sheet already closes. Part B keeps the next-shift pass as the one brand moment on employee Home and reorders it so the shift you're working sits on top, with a single tear line between now and next. Part C gives Android two small icons that match the app icon's dark teal.

## 2. Tokens

No new token. One value changes on the pass.

| Use | Today | Proposed | Contrast at the pass's lightest point (top left, #077572 side of the gradient) |
|---|---|---|---|
| Pass secondary text: h2 eyebrow, dates, position, zone, note, notice (`.module.css:199, 202`) | `rgb(255 255 255 / .82)` | `rgb(255 255 255 / .94)` | 4.44:1 today (fails 4.5:1 at 15px); 5.34:1 proposed |
| Pass primary text | #FFFFFF | unchanged | 5.76:1 |
| Tear line | 1.5px dashed `rgb(255 255 255 / .32)` | unchanged, moved | Decorative |
| Block divider (footer) | 1px solid `rgb(255 255 255 / .2)` | unchanged | Decorative |
| Shortcut icon disc | n/a | `--g-masthead` #1C4A47 | White glyph 9.91:1 |

**How I measured.** The pass runs `linear-gradient(145deg, var(--g-accent) 0%, var(--home-masthead) 78%)`. I computed the gradient colour under each text position for 350 by 380 and 350 by 540 cards (with and without a current shift); the top-left 30px is within 6% of #077572. The white bloom (`::before`) never reaches the card body: its centre sits 96px above the card and fades out by 82px. Reordering moves the "Scheduled now" sentence into that lightest zone, which is why this slice raises the opacity.

**Company brands.** B1 keeps white on the accent at 5:1 or more. 94% white on a background near that floor measures about 4.6:1, so 94% holds for every brand; 82% would drop to about 4.05:1.

## 3. Components and states

### 3.1 Part A: Back closes sheets

No visual change. When Back closes a surface, it uses that surface's own close path and motion:

| Surface | Close look on Back |
|---|---|
| Employee and manager More sheets | Slide down by the open path, `--m-sheet-out` 220ms on `--m-ease-drawer`; backdrop fades |
| Account menu, page menus (`ActionMenu`) | Shrink toward the trigger, `--m-menu-out` 110ms on `--m-ease-out` |
| Device settings, Clocker admin dialogs, issue focus popover | Their existing close |
| Finder sheet | Closes at once, no motion (U8) |

Focus returns to the opener with the standard 2px ring when the last input was a keyboard; touch shows no ring (`:focus-visible`). No toast, banner or haptic marks the close.

### 3.2 Part B1 and B2: the shift card with a shift under way

Follows the UX layout (flows 2.1). Frame B in `mockup.png` shows the recommended h2 "Your shifts"; frame C shows the PM's fallback, h2 "Next shift". The visual treatment is the same for both.

| Part | Spec |
|---|---|
| Eyebrow row | h2 (keeps `id="employee-reviewed-next-heading"`), 15px at 94% white, with the Published chip on the right (unchanged) |
| "Scheduled now" block | h3 17px/600 white; sentence 15px at 94% white; date line with "Today" in white 600 then the date at 94%; time at the pass size (2rem on phones, 2.25rem in the wide container, `.module.css:204, 265`); location 17px white, position 15px at 94% |
| Tear line | The dashed rule and two 18px notches in the page colour (`--pass-notch`), 18px above and 14px below, between the two blocks. It replaces today's plain hairline. One tear per card |
| "Next shift" block | h3 17px/600 white; "Tomorrow" date line; the same time size; countdown pill (unchanged); location |
| Footer | One "View schedule" link (17px/600 white, arrow), on the solid 20% white hairline, then the zone line 14px at 94% |
| Partial notice | Unchanged, at 94% white |

No "Now" badge, no green and no live dot on the current block: the card infers nothing about clock status (AC-B1.5), and green means "done" on the ladder.

**The calm white card** (no upcoming published shift, `before-employee-shift-card-390.png`). The same order applies: "Scheduled now" leads, then "No upcoming published shift" and its link. Text keeps the white-card colours: ink, `--g-muted` (6.05:1) and teal links. The tear line doesn't appear on the white card; a 1px `--g-hairline` separates the blocks, as today.

| State | Look |
|---|---|
| Current and next shift | Pass, frame B |
| Current shift, no next | Calm white card, current first |
| Next shift only | Unchanged; zero diff (AC-B1.4) |
| Loading | "Loading Home…" with loading lines, unchanged |
| Error | "Schedule unavailable" white card, unchanged |
| Link hover, pressed, focus | Unchanged: 12% white wash on hover and press, 2px white focus ring (`.module.css:217-225`) |
| Increased contrast | Pass flattens to the masthead colour (`.module.css:271`); 94% text measures 9.0:1 there |
| Forced colours | Outlined card, `CanvasText` text; tear notches hidden (existing rules, `:273-275`) |
| 200% root | Times break after the dash, not inside a time; the chip may drop under the eyebrow (phone-foundations 3.3) |
| Desktop 1440 | Same order inside the left column; pass width unchanged |

### 3.3 Part B3 and B4: preview fixes

No new visuals. The preview sidebar renders the live D3 sidebar (`.claude/evidence/d3/home-1440.png`), and the preview Today strip and rail show the same fictional figures. The stale four-card tile row in today's preview (seen live at 1440) should match the live D3 strip once the preview uses the same components.

### 3.4 Part C: Android shortcut icons

| Property | Value |
|---|---|
| Files | Two 96 by 96px PNGs, for example `public/icons/shortcut-schedule-96.png` and `shortcut-time-off-96.png` |
| Shape | Full 96px circle in #1C4A47, transparent corners |
| Glyph | Phosphor `CalendarBlank` (Schedule) and `CalendarMinus` (Time off), the `NavIcon` glyphs (`nav-icon.tsx:38, 42`), regular weight, 48px, white, centred |
| Manifest | `purpose: "any"`, `sizes: "96x96"`, `type: "image/png"` |
| Drawing | Rendered locally from the Phosphor SVG paths, no paid generation (AC-C4) |
| Brand | Company brands don't recolour shortcut icons, as with the app icon (B1 leaves the app icon NEVORA) |

On light launcher menus the disc reads as a small app-coloured badge. On dark menus the disc edge fades (1.35:1 against #2F2F2F) while the white glyph stays clear; the glyph carries the meaning.

## 4. Mock-ups and screenshots

| File | What it shows |
|---|---|
| `mockup.html`, `mockup.png` | A: today's pass order. B: proposed with h2 "Your shifts". C: fallback with h2 "Next shift". D: shortcut icons at 96px. E: long-press menus, light and dark |
| `before-employee-shift-card-390.png` | Live: white card with "Scheduled now" under "No upcoming published shift" |

## 5. Motion

| What | Motion | Reduced motion |
|---|---|---|
| Sheet closed by Back | Existing sheet exit, 220ms `--m-ease-drawer` | Existing rule: opacity fade only, no movement (`portal-motion.css:145-149`) |
| Menu closed by Back | Existing 110ms `--m-ease-out` | Fade only (`portal-motion.css:135-138`) |
| Finder closed by Back | None | None |
| Shift card reorder | None; the order is static on load | Same |
| Countdown pill | Updates each minute with no transition, as today | Same |
| Android predictive back | Out of scope (needs the shell) | n/a |

## 6. Draft scorecard

| Line | Score | Why |
|---|---|---|
| Usability | 2 | Back keeps your place; today's shift reads first; one tap to Schedule from the icon |
| Familiarity | 2 | Platform Back; launcher shortcuts |
| Trust | 2 | Shift card says nothing about clock status; preview stops contradicting itself |
| Accessibility | 2 | Fixes a 4.44:1 text failure on the pass; focus returns to the opener |
| Brand distinctiveness | 2 | Keeps and sharpens the pass and its tear line |
| Durability | 2 | No new patterns |
| Cost | 2 | CSS order, one opacity value, two PNGs |
| Continuity | 2 | Same sheets, same card, same scripts' strings |
| **Total** | **16 / 16** | Go |

## 7. Open questions

| # | Question | Recommendation |
|---|---|---|
| UI-1 | Raise pass secondary text from 82% to 94% white in this slice? It changes the no-current-shift pass too, so AC-B1.4's zero diff would list it as an intended change | Yes. It fixes a contrast failure that exists today at the eyebrow |
| UI-2 | The h2 text, "Your shifts" or "Next shift" (PRD Q2) | PM decision; the visual spec covers both |
| UI-3 | The UX flows answer V1 with one tear line between now and next. Agreed | No question left |
