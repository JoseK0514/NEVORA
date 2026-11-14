# NEVORA Direction B: system audit and proposed tokens

Repo `/home/user/NEVORA` at `a496040f`. Read-only audit of the Direction B sheets (`b-tokens.css`, `b-foundation.css`,
`owner-b-*.css`, `employee-b-desktop.css`, `owner-b.css`, `employee-b/*.css`, `clocker.module.css`, `auth-b.css`:
15 files, 9,422 declarations parsed with postcss) and of the components' TSX. Nothing was run in a browser, so every
"renders as" statement about legacy classes is read from the cascade and marked **Not verified**. Findings with
file:line are in `review-system.json` (SY-001 to SY-024). The brand is unchanged: Inter, teal #0B6E69, the band, canvas
#F2F5F4, white 22px cards, pills, Phosphor bold, 48px targets, light only.

## What was measured

| System | Measured in the B sheets | Proposed |
|---|---|---|
| Type | 46 font-size values (21 fixed px, 17 rem in the Clocker, 4 clamps); 36 line-heights; 4 weights; 67 size/line/weight triples; 14 letter-spacings | 8 roles + 6 locked component sizes; 3 weights (+500 in two places); 4 letter-spacings |
| Spacing | 47 px values over 1,641 uses; 60% on a 4px grid; 18px ×208, 22px ×154, 14px ×129, 10px ×98 | 11 steps + 3 named insets |
| Colour | 73 hex + 67 rgb() literals outside the tokens (829 uses); 396 equal a token; 51 non-token hexes; 29 neutrals | 1 table: 10 neutrals and surfaces, 4 status ramps of 3–4 steps, band set |
| Radius | 28 values; 61 half-height "pills" | 4 radii + the 16px menu |
| Elevation | 90 box-shadow values; card shadow written 3 ways (50 uses); 25 black shadows | 3 elevations + 1 on-band + 5 named rings |
| Icons | 574 Phosphor elements; 291 with no weight (regular) in 99 files; 17 size props + 243 CSS-sized | bold only; 4 sizes; 4 circles |
| Buttons | 5 class families; 10 heights, 9 radii, 7 label sizes | 3 sizes × 5 variants + 2 on-band |
| Rows | 3 patterns; 52/56/60/64px; gaps 12/14; insets 14/16/18/20/22 | 1 row spec |
| Motion | 33 transitions (23 at 150ms), 24 animations; 15 durations, 6 easings; 0 `transition: all`; 1 ungated press | 9 tokens |
| States | 9+ patterns; BState in 15 files; q-empty 19 files, c-empty 17, EmptyState 11; 13 settings loaders on the old skeleton | BState + BLoadingScreen + 1 inline error |

## Type

Roles (the five B1 roles keep their DESIGN.MD values; three are added above them):

| Token | Size / line | Weight | Letter-spacing | Use |
|---|---|---|---|---|
| `--b-t-display` | 30/36 (Home 34/40, pushed page 28/34) | 700 | -0.02em | page title on the band |
| `--b-t-figure` | 24/30 | 600 | -0.02em, tabular | glass figures, money |
| `--b-t-title` | 20/26 | 700 | -0.01em | sheet, panel and dialog titles |
| `--b-t-title-sm` | 17/22 | 700 | -0.01em | card headers, form band title |
| `--b-t-body` | 15.5/22 | 400 text, 600 row title, 700 row value | 0 | rows, reading text |
| `--b-t-body-sm` | 14.5/20 | 400, 600 buttons | 0 | secondary text, md buttons, menu items |
| `--b-t-meta` | 13.5/18 | 400, 600 | 0 | row sub-lines, notes, figure labels |
| `--b-t-caption` | 12.5/16 | 600 | 0 (0.05em uppercase eyebrow) | chips, eyebrows, small labels |

Locked component sizes (DESIGN.MD; not for general text): count 12/700 · tab label 10.5/13 500 · inputs and the select
16px · segment label 14/600 · band sub-line 14px · state-card title 16/22 600.

Folding map:

| In the code | Uses | Goes to |
|---|---|---|
| 13px | 32 | meta 13.5/18 |
| 15px on buttons, menu items | part of 66 | body-sm 14.5/20 |
| 15px on reading lines (15/20, 15/21) | part of 66 | body 15.5/22 |
| 12px that is not a count | part of 27 | caption 12.5/16 |
| 18px, 22px | 5 | title 20/26 |
| 26px, 32px | 10 | figure 24/30 or display 30/36 |
| 40px | 2 | Home 34/40 |
| line-height 19px | 30 | 18 (meta) or 20 (body-sm) |
| line-height 21px | 33 | 22 (body) |
| weight 500 | 27 | 600, except the tab label and a chosen menu item |
| -0.005, -0.015, -0.025, -0.03, -0.035, -0.04, -0.05em | 28 | -0.02em (24px and up) or -0.01em (17–20px) |
| 0.01, 0.02, 0.04, 0.08em | 6 | 0.05em on uppercase, else 0 |

For Jose: 14px (74 uses) and 16px outside inputs (about 12) are approved for three components; folding them into 14.5
and 15.5 would leave no half-step neighbours.

Rendering rules (already mostly true): tabular-nums on figures, values, counts, table cells and times; `text-wrap:
balance` on titles and row titles with a chip, `pretty` on sub-lines and paragraphs, never balance on a paragraph;
one-line ellipsis only where the row opens the full text; `white-space: nowrap` on chips, counts and button labels.

## Spacing

Scale: `2 · 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64` (6 only inside chips and count pills).
Named insets, horizontal only: `--b-gutter` 14px · `--b-inset` 18px · `--b-inset-wide` 22px (all three are DESIGN.MD).

| Measure | Phone (to 767px) | Tablet (768–1023px) | Desktop (1024px+) |
|---|---|---|---|
| Page gutter `--b-page-x` | 14 | 24 | 40 |
| Card and row side inset | 18 | 22 | 22 |
| Card gap `--b-card-gap` | 12 | 20 | 20 |
| Card header height | 46 | 46 | 46 (today 52) |
| Row height: two lines / one line | 64 / 56 | 64 / 56 | 64 / 56 (legacy 60) |
| Row vertical padding, gap | 12, 12 | 12, 12 | 12, 12 (legacy 10, 14) |
| Content under the band | cards lift 40 | 24, lift 52 | 24, lift 52 |
| Page bottom | 24 (today 22) | 24 | 72 |
| Reading column | full | 812 | 812 (860 still in `owner-b-desktop.css`) |

Off-scale values to fold: 10 → 8 or 12 (98 uses); 14 as a gap or vertical step → 12 or 16 (about 73); 18 as a gap or
vertical step → 16 or 20 (about 64); 22 as a gap or vertical step → 20 or 24 (about 35); 1, 3, 5, 7, 9, 11, 13 → the
nearest step (45); 26 → 24; 30, 34 → 32; 38, 42 → 40; 66, 70 → 64 or 72.

## Colour

| Role | Token | Value | Measured |
|---|---|---|---|
| Ink | `--b-ink` | #111517 | 18.37 on white |
| Ink 2 | `--b-ink2` | #3F464B | 9.59 on white |
| Grey text on white | `--b-grey` | #6A7176 | 4.96 on white; 4.52 canvas; 4.41 quiet; 4.37 teal-50 |
| Grey text on fills | `--b-grey-on-fill` | #5E666B | 5.21 quiet; 5.16 teal-50; 5.33 canvas |
| Field and switch edge, row chevron | `--b-field-edge` | #8C9397 | 3.12 on white; 2.84 on canvas |
| Divider | `--b-line` | #ECEEEF | decorative |
| Quiet fill, disabled fill | `--b-quiet` | #F0F2F3 | |
| Pressed fill (new) | `--b-press` | #E6EBEA | |
| Hover in white cards | `--b-hover` | #F7F9F9 | |
| Canvas | `--b-canvas` | #F2F5F4 | |
| Surface (new name for white) | `--b-surface` | #FFFFFF | |
| Disabled text | `--b-disabled-ink` | #8C9397 | 2.78 (exempt) |

| Status | Ink (text, icon) | Tint (chip, circle) | Solid (ring, bar, dot) | On the band | Measured ink on tint |
|---|---|---|---|---|---|
| Teal (information, action) | `--b-teal` #0B6E69 | `--b-teal-50` #E8F3F1 | `--b-teal` | white | 5.37 |
| Red (stop) | `--b-red` #B42318; pressed `--b-red-strong` #8F1C13 (new) | `--b-red-50` #FDECEA | `--b-red` | `--b-coral` #FF6B5E dot (2.07 on the band: add a 2px ring) | 5.75 |
| Amber (wait, check) | `--b-amber` #8A4B00 | `--b-amber-50` #FDF3E4 | `--b-amber-solid` #E9A23B (new; 2.17 on white, never alone) | `--b-amber-on-band` #FFC46B (new; 3.67) | 6.19 |
| Green (done) | `--b-green` #1D6B45 | `--b-green-50` #E7F4EC | `--b-green-solid` #2FB37F (new; 2.67 on white, never alone) | `--b-green-on-band` #7EF0C7 (new; 4.17) | 5.72 |

Band: `--b-band` (160deg #0C726C → #0B6E69 40% → #08504C), `--b-band-solid` #0C726C, `--b-band-end` #08504C (new name),
`--b-band-ink` (#17302D → #0C1918), `--b-ink-surface` #17302D (new name), `--b-on-band` #FFFFFF (5.77 to 9.28),
`--b-on-band-2` white .86 (4.71 on the solid band; 3.80 on glass, so not on glass), `--b-glass` white .12,
`--b-glass-edge` white .16, `--b-on-white-pill` #0B3B38 (new; 12.38 against white).

Literals to fold: #E1E5E6, #E3E6E7, #E3E7E8, #E4E8E8, #E6E9EA, #EBEEEE → line · #EDF0F0, #EEF1F1, #F4F6F6, #F4F7F6 →
quiet · #F7F8F8, #FBFCFC → hover · #7A8489, #7D868B, #8A9399, #9AA3A8, #A3A9AE, #A7ACB1, #B5BBBF → field-edge ·
#D3D9DB, #D5DADC → line or field-edge by job · #E2A13B → amber-solid · #FFD596 → amber-on-band · #9BF0D6, #6FE0CF,
#A8F0E4 → green-on-band · #1D8A55 → green-solid · #152A28, #11221F → ink-surface · #08524E, #0B4F4B, #06403C →
band-end · white alphas .1, .14, .18, .22, .24 → .12 (fill) or .16 (edge).

## Radius

| Token | Value | Use | Folds |
|---|---|---|---|
| `--b-radius-pill` | 999px | buttons, chips, segments, circles, thin bars | 50%, 3px bars, every half-height value (16–26px on buttons) |
| `--b-radius-card` | 22px | cards, sheets, finder, ink tile, state card, glass strip | 18 and 20 (glass strip), 23, 24, 26 |
| `--b-radius-field` | 14px | fields, selects, search, inner tiles | 13, 15, 16 (not menus) |
| `--b-radius-sm` (new) | 10px | menu items, day cells, schedule blocks, focus rounding, checkboxes | 5, 6, 7, 8, 9, 11, 12 |
| menu popover | 16px | DESIGN.MD F3 | 16 = 10 + 6 with 10px items |

## Elevation

| Token | Value | Use |
|---|---|---|
| `--b-elev-1` | 0 0 0 1px rgb(16 40 38 / .05), 0 1px 2px rgb(16 40 38 / .06), 0 12px 28px -12px rgb(16 40 38 / .18) | cards |
| `--b-elev-2` | 0 0 0 1px rgb(16 40 38 / .06), 0 2px 4px rgb(16 40 38 / .08), 0 24px 48px -16px rgb(16 40 38 / .32) | sheets, menus, popovers, finder |
| `--b-elev-glow` | 0 6px 14px -6px rgb(11 110 105 / .6) | the one teal primary |
| `--b-elev-band` (new) | 0 8px 18px -8px rgb(16 40 38 / .5) | white pills on the band (replaces 25 black shadows) |
| `--b-ring-glass` | inset 0 0 0 1px var(--b-glass-edge) | glass |
| `--b-divider` | inset 0 1px 0 var(--b-line) | row dividers |
| `--b-ring-field` | inset 0 0 0 1px var(--b-field-edge) | fields, switches |
| `--b-ring-on` / `--b-ring-error` | inset 0 0 0 2px var(--b-teal) / var(--b-red) | chosen, invalid |

Keep `border: 1px solid transparent` under any shadow that is a surface's only edge (forced colours).

## Icons

Phosphor bold everywhere; fill for the current tab only; no regular, no duotone. A bold glyph draws about 1.5px at
16px, 1.7px at 18px, 1.9px at 20px and 2.1px at 22px, which sits with 600 and 700 labels; regular draws 1.0 to 1.4px.

| Context | Glyph | Circle |
|---|---|---|
| Inline with meta or caption text, chips, field carets and locks | 16 | none (28 in dense pickers) |
| Row leading glyph, row chevron, icon in a button | 18 | 36 |
| Band controls (back, close, bell), menu items | 20 | 40 drawn, 44 hit area |
| Tab bar, sidebar, rail, state card | 22 | 48 (state card) |

## Buttons and controls

| Size | Height | Padding | Label | Where |
|---|---|---|---|---|
| lg | 48 | 0 24 | 15.5/22 600 | form footers, band action, full-width primary |
| md | 40 drawn, 44 hit area (44 drawn on coarse pointers and in decision pairs) | 0 16, min-width 96 in rows | 14.5/20 600 | cards, toolbars, rows |
| sm | 32 drawn, 44 hit area | 0 12 | 13.5/18 600 | dense rows only |

| Variant | Fill | Text | Notes |
|---|---|---|---|
| primary | `--b-teal` | white | one per screen; `--b-elev-glow` at lg |
| secondary | `--b-teal-50` | `--b-teal` | today's ghost; the kind rows share |
| quiet | `--b-quiet` | `--b-ink` | Decline, Cancel |
| danger | `--b-red` (rows: `--b-red-50`) | white (rows: `--b-red`) | hover `--b-red-strong` |
| text | none | `--b-teal` 600 | 44px target; Done, Dismiss |
| white (band) | `--b-surface` | `--b-on-white-pill` | `--b-elev-band` |
| glass (band) | `--b-glass` + `--b-ring-glass` | white | |

All: `--b-radius-pill`; press scale .96 over 150ms ease-out under `prefers-reduced-motion: no-preference`; hover inside
`(hover: hover)`; disabled `--b-disabled-bg` / `--b-disabled-ink`, no opacity; focus 2px `--b-focus` at 2px (white on
the band). 56px is the Clocker's size only.

Other controls (unchanged from DESIGN.MD): field and select 48px, radius 14, 16px text, `--b-ring-field`; segmented
control 44px track, 4px in, 36px thumb, 14/600; chip 22px in rows and 24px in card headers, 0 8, caption 600; count
pill 20px, 0 6, 12/700; menu 16px, 6px in, 44px items.

Legacy classes that still differ (Not verified in a browser): `nv-btn` (8px corners, no B rule, press .98 over 90ms
linear); `c-btn--secondary/--neutral/--danger` and `q-btn--sec/--quiet` on phones (8px and 12px corners);
`q-bs` (32, 36, 38, 40, 44px); auth buttons (52px, 26px corners, own shadow).

## Rows

| Part | Spec |
|---|---|
| Height | min 64 with a sub-line, 56 without |
| Padding, gap | 12 × `--b-inset` (18 phone, 22 wide); gap 12 |
| Lead | 36px circle or avatar, 18px bold glyph |
| Title | body 15.5/22 600 ink, `text-wrap: pretty`; chip beside it |
| Sub-line | meta 13.5/18 grey |
| Trailing | value body 15.5/22 700 tabular; or one md/sm button; or a chip |
| Chevron | CaretRight 18 bold, `--b-field-edge`, only when the row navigates |
| Divider | `--b-divider`, inset to the text edge |
| States | hover `--b-hover` in `(hover: hover)`; pressed `--b-press`, no scale; focus ring inside the card |

Folds `c-row` (60px, 10 × 22, gap 14), `q-row` (52/60/64) and the 56px Employee Time row with 14px sides. The dense
Timecards table (52px) stays as DESIGN.MD records.

## Motion

| Token | Value | Use |
|---|---|---|
| `--b-dur-fast` | 150ms | press, hover, colour, caret rotate, every exit |
| `--b-dur-enter` | 300ms | first-load entrance, sheet and popover enter, icon cross-fade |
| `--b-dur-fade` | 200ms | reduced-motion cross-fade |
| `--b-stagger` | 100ms | entrance chunks |
| `--b-ease-out` | ease-out | everything interactive |
| `--b-ease-swap` | cubic-bezier(0.2, 0, 0, 1) | icon and success cross-fade |
| `--b-press-scale` | 0.96 | buttons only, never rows, never disabled |
| `--b-enter-rise` / `--b-enter-blur` | 12px / 4px | enter from, exit to (-12px) |
| spinner | 800ms linear | `b-spin`; still under reduced motion |

Violations: `b-foundation.css:180` (press not gated by reduced motion) · `clocker.module.css:183, 211, 234, 245, 284`
(90/120/140ms, default ease, `transform`) · `auth-b.css:246, 401` (160ms) · `requests.css:154` (160ms fade) ·
`auth-b.css:171, 237, 325` (hover outside `(hover: hover)`) · `kit.css:243–245`, `corp.css:117`, `quiet.css:118`
(legacy press .98 / .97).

Micro-interactions to add: sheet and popover enter 300ms / exit 150ms with `overscroll-behavior: contain`; row pressed
fill; switch and segmented thumb 150ms; one success moment (48px green circle, check cross-fades in 300ms, words as
the static cue); skeleton stays static or pulses opacity 1 → .6 over 1300ms.

## Loading, empty and error states

| Pattern | Where | Uses | Action |
|---|---|---|---|
| `BState` | B screens, access frame, 404, closed pages, payroll runs | 21 in 15 files | the standard |
| `BLoadingScreen` (via `RouteSkeleton`) | 29 of 44 `loading.tsx` | | the standard |
| `SettingsLoading`, `RecoveryLoading`, `SettingsRouteLoading` (`wc-skeleton`) | 13 settings `loading.tsx` | | draw `BLoadingScreen` in `SettingsFrame` |
| `EmptyState` (`.nevora-empty`) | locations, breaks, Clocker settings, positions, manager inbox, roster | 25 in 11 files | render `BState` inside |
| `c-empty` | reports, who's working, team, payroll, pay, hours, notifications, time off, requests | 59 in 17 files | `BState kind="empty"` |
| `q-empty` | reports, availability, time off, updates, inbox, schedule, swaps, shift requests, rules, policies | 39 in 19 files | `BState kind="empty"` |
| `c-error`, `q-error`, `wb-error`, `wb-notice` | forms and panels | 52, 15, 13, 11 | one inline error note |
| `RouteError` (`nv-btn`), two bespoke `error.tsx` | 7 routes | | `BState kind="failed"` |
| `c-note`, `wb-note` | helper lines | 79, 38 | keep for meta 13.5/18 helper text only |
