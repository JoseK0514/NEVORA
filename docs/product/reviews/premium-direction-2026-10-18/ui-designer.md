# Premium direction: UI designer critique

October 18, 2026 · UI Designer · Read-only review of the Manager and Owner comps. No app code changed. Nothing committed.

**Sources.** The comps are the 17 boards in `scratchpad/canvas/project/*.dc.html` (I read their CSS) plus 13 screenshots in `scratchpad/shots/` (`p1-*`, `p2-*`, `p3-*`, `r2-*`). The scratchpad root is `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS/8c7acfe8-4195-49cb-a26a-ba2ac9ec5c59/scratchpad/`. I compared them against the live tokens (`src/app/app/portal-gusto.css:6-32`, phone type floor at `:76-82`), `.21st/DESIGN.md` D4–D6 and the error pass, `docs/product/TEAM-RULES.md`, the employee review (`docs/product/reviews/employee-mobile-usability-2026-10-18/`, evidence 06, 11, 15), `src/lib/navigation.ts:139-152` and the wordmark (`public/images/nevora-wordmark.png`).

Contrast ratios below are WCAG 2.x values I computed from the hex values in the comp CSS. Where a colour is translucent, I blended it over the masthead first.

## Verdict

The direction is right. Pairing a deep-teal masthead with an overlapping white card is calm, Home is easy to scan, and the hero "Next up" card is the best decision in the set. The states (offline, all clear, approved toast) look finished, and the desktop Inbox split view is strong.

What holds it back from premium is **system drift, not concept**. Across the comps I counted 14 phone type sizes, 23 corner radii, 11 icon stroke widths, about 12 greys and 17 gap values. Pill colours carry three different meanings, and the same label appears in two colours. On top of that, 55% of phone text sits below the 15px floor that ships today, and the comps have no focus styles. Fix the system first; the signature moves in section 2 only pay off on a disciplined base.

---

## 1. Craft audit

### 1.1 Type

| Finding | Evidence | Fix |
|---|---|---|
| 14 font sizes on phone boards: 10.5, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 30 | grep of the 15 phone `.dc.html` files | Use the 9 phone roles in §3.2 |
| **130 of 238 phone font-size declarations (55%) are below 15px.** By size: 12px ×26, 13px ×48, 14px ×46, 10.5px ×10 | `.s` 14px row meta, `.ch span` 13px, `.cl` 13px stat labels, `.pl` 13px pills, `.d small` 12px day letters, `.st` 12px payroll stepper, `.badge` 10.5px | The live app already enforces 15px for small and caption on phones (`portal-gusto.css:76-82`, U0). The comps would roll that back. All readable text should be 15px or larger. The only exceptions are tab-bar labels at 13px and count badges at 12px, both always paired with an icon, and those exceptions need recording in DESIGN.md |
| Hierarchy inversion: card titles (`.ch h2` 15/600) are smaller than the rows they head (`.t` 16/500) | `p1-Home-Manager.png` "Also waiting" vs "Time off for Alexandra"; `p3-Payroll-Owner.png` "Before you approve" sits on top of "Employee amounts" with no gap | Card title 17/600. Row title 17/500. Meta 15/400 muted. Leave 8px between the card title and the first row |
| 15 letter-spacing values (−.005 to −.03em, then +.01 to +.07em) | all boards | Four tokens: display −0.022em, title −0.012em, body 0, tab +0.01em |
| Uppercase tracked eyebrows ("SUNDAY, OCTOBER 18", "UPDATED 6:14 PM", "PAYROLL · YOUR REVIEW IS NEXT") at 14px | `.eb` on every masthead | Use sentence case at 15/500 in `--masthead-ink`. Uppercase plus tracking is the most generic part of the masthead, and it makes Spanish strings longer |
| Weight 600 is declared 168 times. Pills, links, card titles, numbers, CTAs and badges all compete | tally | Keep 600 for titles, numerals, buttons and the selected tab. Pills and links drop to 500, and row titles stay at 500 |
| Comps load Inter from Google Fonts, opsz 14–32 | `<helmet>` in every board | Production self-hosts Inter (DESIGN.MD). Ship Inter 4 variable with `font-optical-sizing: auto`, which gives the planned "Inter Display" titles at 22px and up for free. Keep `tnum` everywhere numbers are compared. Drop `cv11`: single-storey a looks softer but makes "a" and "ɑ" less distinct for Spanish readers, and it breaks continuity with the live app |

### 1.2 Spacing and alignment

| Finding | Evidence | Fix |
|---|---|---|
| Off-scale values: gap 14 (×33), 10 (×26), 3, 5, 7, 18, 22; card padding 18 | tally | Use a 4-based scale (§3.3). 14 becomes 12 or 16, 18 becomes 20, 10 becomes 8 or 12 |
| Masthead copy starts at x=20, card edges at x=16 and card content at x=34. Three left edges within 18px read as an accident | `p1-Home-Manager.png` | Set the masthead inset to 16 so the wordmark and title line up with the card edges. Card padding becomes 20, so content sits at 36. That leaves two clear lines instead of three near-misses |
| **The selected tab label sits 4–5px lower than the others**, because padding on the active SVG pill adds 6px of height | Every screenshot: "Home" vs "Schedule" in `p1-Home-Manager.png`, "Inbox" in `p2-Inbox.png` | Give every tab the same 32×56 icon box, with the pill painted behind it on a pseudo-element. Labels then share one baseline |
| The gap between cards (14) is tighter than the space inside them (18–20), so cards blur into one column | Home, Inbox | Set the gap between cards to 16 and inner padding to 20 |
| Dead space under short content: Request Review has about 250px of empty canvas above the action bar, and Schedule and Payroll about 300px | `p1-Request-Review.png`, `p2-Schedule.png`, `p3-Payroll-Owner.png` | Not a bug. The sticky action bar is correct. Pin the bar with a top hairline and an `e2` shadow so the empty area reads as intentional, and don't stretch cards to fill it |

### 1.3 Colour and contrast

| Pair | Ratio | Status |
|---|---|---|
| Ink #16191C on white | 17.65 | Pass |
| Muted #6B7075 on white / on canvas #F2F4F3 | 5.00 / **4.53** | Passes on canvas by 0.03, with no margin. Move to **#5F666A** (5.84 on white, 5.29 on canvas, 5.21 on the wash) |
| Zero count #8A8F94 on white ("Not in yet 0") | 3.26 | Passes only as large text, and the grey wrongly suggests "disabled". Keep zeros in ink and let colour mean state alone |
| Chevron #C3C8CC on white | 1.69 | Decorative. Use the icon token #858B8F (3.45) so the cue is visible |
| Progress track #EDF0EF on white | 1.15 | The "0 of 5" bar is invisible. The text carries the value, so it passes, but it reads as missing. Use track #DDE2E1 with a 1px inset #C9D0CE |
| Amber bar fill #E6A23C vs track | 1.91 | Use #B87503 for amber graphics (3.76 on white, 3.28 on track) |
| Eyebrow #A9C9C5 on masthead #1C4A47 | 5.59 | Pass |
| Subtitle #D3E6E3 on masthead | 7.64 | Pass |
| White on masthead | 9.91 | Pass |
| Inactive filter chip text #E3EFEE on white 10% over the masthead (#335C59) | 6.34 | Pass |
| **Team search placeholder** on #335C59 (no placeholder colour set; Chrome's default ~#A9A9A9) | **~3.17** | Fails 4.5. Set `::placeholder { color: #B9D3D0 }` (4.72) |
| White on accent #077572 (badge, B1 floor 5:1) | 5.53 | Pass |
| Accent #077572 on the active-tab wash #DCEDE9 | 4.57 | Passes by 0.07. Use `--g-accent-strong` #07605F for the selected label (6.09 on #DCEDE9) |
| Pills: Review #07605F/#EAF4F3 6.58 · coral #A3361F/#FBEAE6 5.80 · amber #8A5300/#FDF1DC 5.66 · grey #4A4F55/#F1F3F4 7.43 · green #1F6B45/#E3F2EA 5.59 | — | All pass |
| "Not in yet 2" #C2412A on #FBF1EF | 4.64 | Pass at 30px |
| Amber eyebrow #FFD58F on masthead (Payroll) | 7.15 | Pass |
| Notification pip #F08A6E on masthead | 4.04 | Pass (non-text needs 3:1) |
| Disabled "Approve revision 2" #6B7075 on #EEF1F0 | 4.40 | Disabled controls are exempt. The problem is that nothing says *why* it is disabled (see §5) |

**Palette sprawl.** About 52 distinct hex values, including roughly 12 greys from two families: cool (#6B7075, #8A8F94, #9AA0A6) and green-tinted (#EDF0EF, #F2F4F3, #CDD2D0). Pick one teal-tinted neutral ramp (§3.1).

**Two action teals.** Primary CTAs are filled with the masthead colour #1C4A47. Links, the selected tab and the badge use the accent #077572. That breaks "teal for actions" into two colours, and it **bypasses B1**: company branding recolours `--g-accent`, and buttons should follow it. Fill primaries with `--g-accent` (#077572, white 5.53; hover #055C5A; pressed #07605F). The deep fill does look weightier, and if Jose prefers it, add it as a B1-derived token (`--g-action-fill: var(--g-masthead)`) and rerun the B1 floor tests. My recommendation is the accent: one action colour, already tested against 2,000 random seeds.

### 1.4 Pill semantics (the biggest clarity problem)

| Label | Where | Colour | Problem |
|---|---|---|---|
| Next up | Home | coral | The same label is amber on Schedule. Coral should mean urgent only |
| Next up | Schedule | amber | — |
| From Inbox | Timecards | coral | A where-it-came-from label painted as urgent |
| Review | Home, Inbox (time off) | teal tint | A verb in a pill looks like a button. The status ladder says to-review is amber (D4) |
| Approve | Home (payroll) | amber | Another verb in a pill, in a different colour from "Review" |
| Review | More › Payroll | amber | Same word as above, different colour |
| Timecard, Set | Inbox | teal text or pill | Actions shown as status |

**Rule to adopt.** A pill states a *condition*, using a noun or adjective: Waiting for you, Needs a fix, Draft, Over 40h, Done. It always uses ladder colours: grey = neutral or waiting, amber = needs review, green = done, coral = urgent. An *action* (a verb) is a teal text link with a chevron, or a button, and never a pill. "Next up" becomes a plain 15/500 muted label above the hero card title. The hero card's icon tile carries the ladder colour of whatever is next. Because of the label length, keep this as an exact list in DESIGN.md.

Colour alone must never carry meaning. Each status pill gets a 12px Phosphor glyph: grey Clock, amber Eye, green Check, coral WarningCircle. The "56h" amber pills on Schedule also need a word or glyph, because right now only a footnote legend explains them (`p2-Schedule.png`).

### 1.5 Radius and elevation

- **23 distinct radii.** Card 22, CTA 15, Approve 16, chips 19, tab pill 15, search 12, skeleton 8, plus 2, 3, 4, 6, 9 through 28. Use 5 tokens: card 20, control 12, inner 8, pill 999, hairline bar 3 (§3.4).
- **Departure from the constant.** D4 and DESIGN.md set an 8px control radius. The comps use 15–16. Taller, softer controls do suit phones, but this is a visible change on every screen. Pick 12px for controls at every width, record the move in DESIGN.md with its reason (taller 50–54px phone controls, matching the softer card), and update `--g-control-radius` in one place.
- **Six shadow variants.** Some use black (`rgba(0,0,0,.16)` on the sheet, `.22` on the toast) and some use teal-tinted rgba(16,40,38). Use 3 elevation tokens, all teal-tinted (§3.5).

### 1.6 Icons

- **The icons are hand-drawn SVG, not Phosphor.** There are 11 stroke widths (1.5 to 3.4). Nav glyphs are 1.6, CTA chevrons 2.2 and status checks 2.8. Use the pinned `@phosphor-icons/react` 2.1.10 (in `package.json`) for every glyph: regular weight at 20–24px, bold only for 16px inline chevrons and checks, and fill only for the selected tab. Hand-drawn lookalikes drift, and they cost more to maintain.
- **Sizes.** 24px in the tab bar, 22px in the masthead, 20px at the start of rows and in More, 16px inline, 12px inside pills.

### 1.7 Targets and focus

| Control | Size | Fix |
|---|---|---|
| Inbox, Schedule and Approved filter chips (`.pill`) | 38px tall | 44px tall: visual 36px plus 4px transparent padding, or a 44px chip |
| Schedule day cells (`.d`) | 40×62 | 44px wide minimum. Seven columns fit at 320px (7×44 = 308) |
| Timecards and Payroll underline tabs (`.ut`) | 40px tall | 44px |
| **Focus** | No focus styles in any comp. Inputs set `outline: none` | 2px `--focus` ring at 2px offset. On the masthead, use a white ring with the masthead colour as the offset |

### 1.8 Wordmark

The board puts `nevora-wordmark.png`, an RGB file with no alpha, on the masthead through `filter: invert(1) hue-rotate(180deg) brightness(1.15); mix-blend-mode: screen`. That filter chain shifts every hue, the sky-blue triangle in the A included, and the blend fails on any background that isn't solid (dark mode, overscroll). Export a reversed wordmark with a transparent background from the source art: same letterforms, white ink, original triangle colour. Make an SVG too if the source allows. The wordmark itself stays unchanged; this only fixes how it is reproduced.

---

## 2. What still reads generic, and the signature moves

### 2.1 Generic tells

1. **The Gusto skeleton.** Teal band, overlapping white card, greeting and KPI strip. It is familiar, which is good, but nothing in it says NEVORA.
2. **The uppercase date eyebrow above "Good evening".** It is on every SaaS dashboard.
3. **Initials in grey circles** on every list.
4. **The near-black toast** (#16191C). It is a stock component.
5. **The masthead watermark** is two outlined triangles, which don't match the actual mark. The real A is an open chevron with a small filled triangle in its counter (see `public/images/nevora-wordmark.png`). At 6% opacity, and cropped differently on each screen, it reads as stock decoration.
6. **Progress bars and a three-up stat strip.** These are generic dashboard furniture.

### 2.2 Signature moves (within the brand)

**S1. The A-mark as a system, not wallpaper.**
- **Watermark:** one shape from the real mark, an open Λ chevron plus its filled triangle, at 7% white. Anchor it identically on every masthead: bottom-right, 240px, cropped at a fixed 40% overhang. The triangle stays at 7% too, so no new hue appears.
- **Micro-marker:** the small filled triangle, 6px, in `--g-accent`. It is the one "you are here" mark, used in exactly three places: under the selected tab label instead of a wash pill, at the current step of the payroll stepper, and as the leading mark on the hero card's eyebrow. Three uses at most; more turns it into a gimmick.
- **App icon and splash:** the Λ and triangle, centred on #1C4A47. The triangle keeps its original sky blue, the only place that hue appears outside the wordmark.

**S2. The pass.** The employee "next shift" card is already a green pass with notches and a perforation (`evidence/15-home-after-restart-390.jpg`, commit fae3512). Nothing else in the market looks like it. Make the **pass the NEVORA hero-card grammar for every role**:
- Employee and Lead: the deep-teal pass for the next shift (keep it as is).
- Manager and Owner: the white "Next up" card gets the same notch pair and a dashed divider between the situation and its action. It stays white, so it doesn't compete with the masthead.
- Only one pass per screen, and only for the single most important thing.

**S3. Number styling as a trust signal.** Pay and time are the product, so give numbers their own typography:
- **Money:** `$1,000.00` with the `$` and `.00` at 60% size, muted ink, top-aligned to cap height. The whole dollars stay in Inter Display 600 with tabular figures. Finance apps use this treatment because it reads as exact.
- **Duration:** `0h 0m` with the unit letters at 60% size, muted.
- **Time:** `7:00 AM` with "AM" at 70% size and 500 weight.
- **Screen readers:** each value gets one `aria-label` with the plain value, so they read "$1,000.00" and not three pieces.
- One `<Figure kind="money|duration|time">` component, so every surface agrees. Payroll *copy* is unchanged; this is styling only.

**S4. A freshness stamp.** "Updated 6:14 PM" appears on Home, Inbox and the offline state in four different styles. Make it one component: a 6px dot with the time. Green #2E8A5B when live, grey when older than the refresh window, coral ring when offline. The same stamp sits top-right of the first card on every data screen. People trust a pay app more when it shows how fresh its numbers are.

**S5. The toast in brand ink.** Use the deep masthead #10342A instead of #16191C (white 13.58, meta #A9C9C5 7.66, check #7FD6A8 7.81), with 12px radius and `e2`. Same layout, but it now belongs to NEVORA.

**S6. Avatars.** Keep neutral initials (D4) and add photo support. Draw initials in 15/600 ink on `--n-100` with a 1px inset hairline, so they look made rather than default. Don't use rainbow tints.

**S7. Hairlines at device resolution.** Draw dividers at 0.5px on 2x and 3x screens (`@media (min-resolution: 2dppx)`). It is invisible as a choice and very visible as quality.

**S8. Masthead depth without a gradient.** Add a single 1px `rgba(255,255,255,.06)` highlight at the top edge of the overlapping card, and give the masthead a slightly lighter top 8px (#1F504D to #1C4A47 over 120px, the same hue). The difference is about 2% lightness, which reads as depth and not as a trend.

---

## 3. Proposed token sheet (shared component set)

The names keep the B1 keys (`--g-accent`, `-hover`, `-strong`, `-wash`, `-line`, `-tint`, `-select`, `-pressed`, `--g-masthead`, `--g-masthead-ink`), so company branding still flows through `derive.ts`. New tokens are marked **new**.

### 3.1 Colour

| Token | Light | Use | Ratio |
|---|---|---|---|
| `--g-ink` | #16191C | Text | 17.65 on white |
| `--g-ink-2` **new** | #3E4347 | Strong secondary | 10.0 on white |
| `--g-muted` | **#5F666A** | Meta, labels | 5.84 white · 5.29 canvas |
| `--g-icon` **new** | #858B8F | Chevrons, idle icons | 3.45 white |
| `--g-border` | #D5DAD9 | Control edges (inputs also get a fill) | — |
| `--g-hairline` | #E8ECEB | Dividers | — |
| `--g-track` **new** | #DDE2E1 | Empty progress | — |
| `--g-inset` | #EEF1F0 | Pressed rows, fields, skeleton | — |
| `--g-bg` **new** | #F2F4F3 | Page canvas (phone) | — |
| `--g-canvas` | #FFFFFF | Cards | — |
| `--g-accent` | #077572 | Buttons, links, focus | white 5.53 |
| `--g-accent-hover` | #055C5A | Hover | — |
| `--g-accent-strong` | #07605F | Text on wash, selected tab label | 6.5 on #E7F3F2 |
| `--g-accent-wash` | #E7F3F2 | Selected backgrounds | — |
| `--g-masthead` | #1C4A47 | Header | white 9.91 |
| `--g-masthead-ink` | #CFE3E1 (subtitle), #A9C9C5 (eyebrow) | Header text | 7.6 / 5.59 |
| `--g-masthead-deep` **new** | #10342A | Toast, pressed header controls | white 13.58 |
| `--focus` **new** | = `--g-accent`; white on masthead | Ring | ≥3:1 |

**Status ladder.** Text and background meet 4.5; graphics meet 3:1 on white.

| Status | Text | Background | Graphic (bars, dots) |
|---|---|---|---|
| Neutral or waiting | #4A4F55 | #F1F3F4 (7.43) | #858B8F |
| Review (amber) | #8A5300 | #FDF1DC (5.66) | #B87503 (3.76) |
| Done (green) | #1F6B45 | #E3F2EA (5.59) | #2E8A5B (4.28) |
| Urgent (coral) | #A3361F | #FBEAE6 (5.80) | #E1553F (3.77; `--g-urgent`, unchanged) |

### 3.2 Type (phone; desktop in brackets)

| Role | Size/line | Weight | Tracking | Notes |
|---|---|---|---|---|
| title-1 | 30/36 [32/40] | 600 | −0.022em | Masthead title; Inter optical size takes the Display cut |
| title-2 | 22/28 [22/28] | 600 | −0.015em | Detail name (Request Review), sheet titles |
| title-3 | 19/25 [18/24] | 600 | −0.012em | Hero card title |
| headline | 17/22 [16/22] | 600 | 0 | Card titles, buttons |
| body | 17/24 [16/24] | 400 | 0 | Prose, row titles at 500 |
| callout | 15/20 [14/20] | 400/500 | 0 | Meta, pills, labels, eyebrows. **Phone floor** |
| figure-l | 30/34 [28/32] | 600 tnum | −0.02em | Stat and money values |
| tab | 13/16 | 500 (600 selected) | +0.01em | Exception: always with an icon |
| badge | 12/16 | 600 tnum | 0 | Exception: numbers only |

Desktop keeps 13px as its smallest size (D-series).

### 3.3 Spacing (4-based)

`--s-1` 4 · `--s-2` 8 · `--s-3` 12 · `--s-4` 16 · `--s-5` 20 · `--s-6` 24 · `--s-8` 32 · `--s-10` 40 · `--s-12` 48.

- Page gutter 16 (24 at ≥768px, 32 at ≥1280px).
- Masthead inset 16.
- Card padding 20; gap between cards 16; gap between groups 24.
- List rows at least 64 with an avatar, 56 without.
- The masthead overlap is 72 on phone and 56 on desktop.

### 3.4 Radius

`--r-card` 20 (phone) / 16 (desktop) · `--r-control` 12 · `--r-inner` 8 (tiles, skeleton, notes) · `--r-pill` 999 · `--r-bar` 3.

Sheets use 20 on the top corners. Toasts use 12.

### 3.5 Elevation (teal-tinted, never black)

| Token | Value | Use |
|---|---|---|
| `--e0` | none | Lists inside cards |
| `--e1` | `0 1px 2px rgba(16,40,38,.05), 0 8px 24px rgba(16,40,38,.06)` | Cards (unchanged) |
| `--e2` | `0 2px 6px rgba(16,40,38,.08), 0 16px 40px rgba(16,40,38,.14)` | Sticky action bar, toast, popover |
| `--e3` | `0 -8px 40px rgba(16,40,38,.18)` | Bottom sheets |

### 3.6 Motion

| Token | Value | Use |
|---|---|---|
| `--m-press` | 90ms | Press-down (scale .98, inset fill) |
| `--m-quick` | 160ms | Hover, colour, chip select |
| `--m-base` | 220ms | Tab pill slide, card expand, toast in |
| `--m-sheet` | 360ms | Sheet open (close 260ms) |
| `--m-count` | 500ms max | Count-up |
| `--e-out` | `cubic-bezier(.22,1,.36,1)` | Entrances |
| `--e-inout` | `cubic-bezier(.65,0,.35,1)` | Position changes (tab pill) |
| `--e-sheet` | `cubic-bezier(.32,.72,0,1)` | Sheets, the iOS feel |

**Rules**
- **Count-up** runs only on operational counts, and only when a value *changes* while the screen is open. Never on first paint, and **never on money or payroll figures**: a rolling dollar amount looks like a slot machine on a pay app.
- **Skeletons** pulse opacity .55 to 1 over 1.2s. No shimmer sweep.
- **Toasts** enter with an 8px rise plus opacity over 220ms and leave over 160ms. They stay at least 5s, pause on hover or focus, and use a polite live region.
- **Reduced motion:** every duration becomes 0, crossfades are capped at 120ms opacity, counts appear at their final value, and sheets appear without travel.

### 3.7 Dark mode mapping

| Light | Dark | Ratio |
|---|---|---|
| `--g-bg` #F2F4F3 | #0F1615 | — |
| `--g-canvas` #FFFFFF | #18211F (card); #1F2A28 (raised, sheet) | — |
| `--g-ink` | #E8EDEC | 13.91 on card |
| `--g-muted` | #9AA5A3 | 6.49 on card |
| `--g-icon` | #8E9997 | 5.61 |
| `--g-hairline` | rgba(255,255,255,.08) | — |
| `--g-masthead` | #163B38. A separate band is not needed; the masthead merges into the page with a 1px highlight | Text #E8EDEC 10.34; ink #9CC9C3 6.73 |
| `--g-accent` (links) | #5CC9BD | 8.26 on card |
| Primary button fill | #5CC9BD with #0F1615 label (9.2). The light-mode #077572 on #18211F is only 2.97 as a boundary, so it would sink | — |
| Pills | Background at 16% of the graphic colour over the card; text amber #F2C46D (10.1), green #7FD6A8 (9.47), coral #F49A84 (7.68), neutral #C7D0CE on #2A3331 (8.25) | — |
| `--e1`/`--e2` | No shadow; surfaces step up in lightness, with a 1px `rgba(255,255,255,.04)` top highlight | — |

**B1 in dark mode:** `derive.ts` needs a dark ladder (accent lightened to L≈0.75 with the same floors). Until that exists, a branded company stays on light mode.

---

## 4. Employee and Lead in this system

Leads use the employee navigation exactly (`navigation.ts:143-148`: Home, Schedule, Requests, Pay or Hours, More), so Lead looks the same as Employee. Its role-specific parts are limited to whatever data the Lead's permissions already return; I'm not proposing new modules.

**Identical across all roles**
- The masthead, wordmark, A-mark watermark, eyebrow, title-1 and one-line subtitle.
- Cards, rows, pills, buttons, the tab bar with its triangle marker, sheets, toasts, the freshness stamp, figures, states, focus and motion tokens.
- The hero card. There is exactly one per screen, and it uses the pass grammar.

**Role-specific**

| Screen | Employee and Lead | Differs from Manager and Owner by |
|---|---|---|
| **Home** | The masthead greets and gives one line ("Your next shift is tomorrow."). The **deep-teal pass** overlaps it: date, `figure-l` time range with small AM/PM, place · position, countdown chip, notches, dashed divider, "View schedule" link. Below that: a clock status card with a freshness stamp, then **"N items need your review"** as an amber-status row near the top (M8 in the employee review), then Quick actions as a 2×2 grid of 20px Phosphor icons in `--g-accent-wash` tiles. Recent activity comes last | A dark pass instead of a white "Next up" card. No stat strip; employees don't need team counts |
| **Schedule** | The same masthead with week arrows and the same day picker (44px cells). The week list is a white card with the date in `figure-l`, the time in headline, and place · position in callout. Today gets the wash plus the triangle marker. "Not published yet" is a grey-status row, not a card. **Confirm schedule** is the sticky primary in the `e2` action bar, matching Approve and Decline on manager screens | No location chips, no Add shift. The confirm action takes the bar |
| **Requests** | "Start a request" uses the same row grammar as More, with 20px icon tiles. "Track your requests" uses status pills: Waiting = grey, Approved = green, Declined = grey with the word, never coral. The time-off draft uses the shared form controls (52px fields, 12px radius) | Read-only status. No Approve or Decline |
| **Pay / Hours** | Statements and Hours section tabs are 44px underline tabs on the masthead, as on manager Timecards. A statement row shows the period, then **net pay in `figure-l` money styling** (small `$` and cents), then pay date. The Hours card shows Recorded and Breaks as two `figure-l` durations (the same component as manager Timecards). Timecards stays under the Pay tab with its section tabs (M7). Empty state: one calm card, line art based on the A-mark, approved copy unchanged | Only your own figures, so the privacy note sits as a callout row with a Lock glyph (copy unchanged) |

**Lead extras.** These appear only where existing permissions return the data: a white secondary card under the pass for team context. It uses the manager row grammar, but never the stat strip or coral urgency.

---

## 5. Further premium improvements (beyond the plan), prioritised

1. **Explain disabled.** "Approve revision 2" is disabled with no reason given. Add a callout under the button: "Tick the box above to approve." This is UI text, not payroll copy, but the payroll team should confirm it. When the box is ticked, the button cross-fades to enabled over 160ms.
2. **Large-title collapse on scroll.** On scroll, the masthead condenses to a 52px bar with the title in headline weight and the watermark fading out, iOS-style. This keeps context on long lists such as Team and Timecards. Under reduced motion, it switches instantly at a threshold. The cost is moderate: one IntersectionObserver.
3. **Status glyphs inside pills** (§1.4). Colour-blind safe and cheap.
4. **One `<Figure>` component** (S3) shared by Home, Timecards, Payroll and employee Pay.
5. **Freshness stamp** (S4).
6. **Pressed states everywhere.** Rows and cards get `--g-inset` plus scale .98 over 90ms. Phones have no hover, so press is the only feedback; it is missing from the comps.
7. **Line-art empty states** built on the A-mark geometry (1.5px stroke, accent plus `--g-icon`) instead of an icon in a circle.
8. **Hairlines at 0.5px** on high-density screens (S7).
9. **Spanish fit.** Check pills, tab labels and buttons at about 30% longer ("Solicitudes", "Esperando por ti", "Revisar y publicar"). Pills should never truncate; let them wrap onto their own line.
10. **Haptics, once a wrapper exists.** A light impact on approve or confirm success, a selection tick on the segmented control and day picker, and none on navigation.

---

## 6. Draft scorecard (TEAM-RULES)

| Line | Comps as drawn | With the top 10 fixes |
|---|---|---|
| Usability | 2 | 2 |
| Familiarity | 2 | 2 |
| Trust | 1 (pill colours contradict each other; two action teals) | 2 |
| Accessibility | **1** (55% of phone text under 15px; 38–40px targets; no focus; placeholder 3.17) | 2 |
| Brand distinctiveness | 1 (reads as Gusto) | 2 (A-mark system, pass, figures) |
| Durability | 2 | 2 |
| Cost | 1 (hand-drawn icons, 23 radii, inline styles) | 2 |
| Continuity | 1 (radius 8 to 15, 15px floor rolled back) | 2 (12px radius recorded, floor kept) |
| **Total** | **11/16, does not go ahead** | **16/16** |

There are no zeros, so nothing blocks outright, but 11 is below the 12 needed to proceed. The fixes are mechanical.

---

## 7. Prioritised top 10

1. **Restore the 15px phone floor.** Use the 9-role type scale (§3.2), fix the inverted card-title hierarchy, and allow only tab (13) and badge (12) as exceptions.
2. **Pill rule:** pills state conditions in ladder colours; verbs become teal links or buttons. Fix "Next up" (two colours), "From Inbox" (coral) and "Review" (teal vs amber).
3. **One action colour.** Fill primaries with `--g-accent` #077572 so B1 branding applies, or tokenise the deep fill and rerun the B1 floors.
4. **Focus and targets.** Add the 2px ring everywhere, make chips, day cells and underline tabs 44px, and set the placeholder colour (#B9D3D0, 4.72).
5. **Real Phosphor icons** (2.1.10): regular, bold at 16px only, fill for the selected tab. Retire the 11 stroke widths.
6. **Token collapse.** One teal-tinted neutral ramp (muted #5F666A), 5 radii (card 20, control 12, inner 8, pill, bar), 3 teal-tinted elevations, the 4-based spacing scale, and a 16px masthead inset aligned to the card edges.
7. **Fix the selected-tab baseline shift.** Swap the wash pill for the A-mark triangle marker.
8. **Reversed wordmark asset** instead of the CSS filter hack, plus the real Λ and triangle watermark anchored the same way on every masthead.
9. **The pass as NEVORA's hero card** for every role, with **`<Figure>` number styling** for money, durations and times. No count-up on money.
10. **Freshness stamp, brand-ink toast (#10342A) and dark-mode tokens** (§3.7), with a B1 dark ladder before branded companies get dark mode.
