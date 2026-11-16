# Phase 1 report: src/app/app/owner-b-desktop.css (engineer b)

Stat: 1 file changed, 231 insertions(+), 231 deletions(-) (single-line rules, so every touched line shows as one pair). 409 value changes: spacing 175, radius 79, colour 66, type 50 (incl. 3 added tabular-nums), elevation 39. Not committed. Patch: p1patches/b.patch.

Structure check (postcss): selectors and at-rules byte-identical before and after; declarations 1809 → 1812 (the 3 tabular-nums, all inside `@layer nv-b` with `!important`); `!important` 1791 → 1794; no unlayered `!important` added; no rule deleted. The file has no transition or animation declarations, so the motion pass changed nothing.

## Counts (before → after)
| Measure | Before | After |
|---|---|---|
| Distinct font-size values (font shorthand included) | 14 | 13 (13px gone; 15px folded into body) |
| Distinct spacing lengths, resolved px | 36 | 34 (9px and 11px gone) |
| Spacing values on scale or named inset | 68.4% of 588 | 81.3% of 595; 196 now read a token |
| Distinct radius values | 18 | 9 (pill, card, field, small tokens, 0, 4px, 7px, the two seg vars) |
| Distinct box-shadow values | 16 | 15 |
| Hex literals (comments excluded) | 107 | 59 |
| `var(--b-` uses | 174 | 607 |

## Could move 1px or more (check in a browser)
- Sidebar `.nav-link` radius 12 → 14px (`--b-radius-field`), line 24. Also the active/hover pill on the tablet rail. Rail width, labels and heights untouched.
- Account menu item radius 8 → 10px (`--b-radius-small`), line 348.
- Home hero `.b-live` glass card radius 20 → 22px (`--b-radius-card`), line 229.
- Pill padding `0 9px` → `0 8px` (each pill 2px narrower): `.c-pill` 147, `.manager-correction-topline > span` 607, `.q-pill-cat` 763.
- `.c-coprof` first field input padding `0 11px` → `0 12px`, line 760.
- Row title `.c-row__title, .q-rt b` 15/21 → 15.5/22 (136) with row detail 13.5/19 → 13.5/18 (137): nets 0 on a two-line row, +1px on a title-only row whose height is content-driven.
- `.wa-pin .q-empty` 14.5/21 → 14.5/20, line 828. Error text 13/18 → 13.5/18, line 767.
- 15 → 15.5px (13 rules, width only): 62, 136, 177, 190, 228, 335, 392, 513, 598, 645, 647 and others; `.wa-pin__sub` font shorthand 822 (line stays 20px).
- Secondary/quiet button fill #EDF0F0 → `--b-quiet` #F0F2F3 (3 per channel lighter): 151, 330, 611. Segmented track on white #EBEEEE → `--b-line` #ECEEEF, 157 (b-foundation.css uses `--b-quiet` with the same #E3E6E7 ring; coordinator may prefer quiet). `.correction-comparison > div` #F4F6F6 → `--b-canvas`, 608.
- Added `font-variant-numeric: tabular-nums`: sidebar `.nav-count` (29), `.manager-corrections-count` (604), `span.c-count, .c-pay__count` (654). Count pills may change width by under 1px.

Zero-change substitutions: 21/20/23/16/12/10px radii that were exactly half the element height, 22px on the three 44px glass tracks (98, 577, 587), 18px on the 32px week arrows (99), 24px on the 48px `.b-ink__btn` (384) and 999px → `--b-radius-pill`; 22px → card; 14px → field; 10px → small (32, and the `.c-seg[data-slide]::before` thumb 324); `--nvd-card` definition and its 16 uses → `var(--b-elev-1)` (definition kept, now `--nvd-card: var(--b-elev-1)`, because employee-b-desktop.css still reads `--nvd-card`); glass `rgb(255 255 255 / .12)` → `--b-glass` (18) and its `.16` ring → `--b-glass-edge` (18); `color: #fff` on the top bar and band → `--b-on-band` (37); band focus outlines `2px solid #fff` → `--b-focus-on-band` (6); `rgb(16 40 38 / a)` in the 4 non-token shadows → `rgb(var(--b-shadow-rgb) / a)`.

## Left alone (counts)
Type: font-size 32px ×7, 14px ×11, 12px ×2, 40px, 28px, 0, the seg vars ×5; line-height 38px ×7, 20px ×4 (13.5/20 ×2, 14/20, 15/20: more than 1px from the role), unitless ×4, 46px, 34px, 0; line-height 21px on the four band sub-lines (62, 228, 392, 645) kept literal on purpose so no band or header height moves (size folded to 15.5 only).
Spacing: 6px ×24 and 10px ×14 (per the rule); vertical 14px ×8, 18px ×8, 22px ×2 (plus the vertical half of 7 `padding: 22px`, written `22px var(--b-inset-wide)`); `gap: 14px` ×1 (not an inset); off-scale 52px ×9, 28 ×4, 56 ×3, 66 ×3, 72 ×2, 44, 70, 80, 38, 88, 120; negative margins 17 declarations (bleeds and overlaps, incl. `22px -22px -22px`); calc()/var() spacings; 14 positional offsets (top/right/left/bottom/inset, e.g. `right: 24px`, `inset: 64px 0 0 auto`). Heights, widths, border-image outsets and `--b-band-below` untouched.
Radius: 0 ×14, 4px (8px dot), 7px (kbd, not in the mapping), `--b-seg-r`/`--b-seg-item-r` ×10.
Elevation: `0 8px 18px -8px rgb(0 0 0 / .45)` ×8 (white primary button on the band; it plays the glow role but the teal glow would vanish on teal, so left for a decision); thumb shadows `0 2px 6px rgb(0 0 0 / .18)` ×4 and `0 1px 3px` ×1; `.cm-org` ring ×1; inspector sheet edge ×1 (545); the stacked-field card shadow at 401 (elev-1 without its ring: adding the ring would draw a hairline around the last field only); inset hairlines and rings (#E4E8E8, #E3E6E7, `--b-line` ×3, dot ring `--b-on-band` ×2); `.c-team-search__field:focus-within` `inset 0 0 0 2px #fff` (pinned by b-foundation.test.ts line 58).
Colour: `#fff` surfaces ×33; `color: #fff` on teal or red fills ×4 (29, 32, 612, 622); #0B3B38 ×14 (ink on white band buttons, no token); #E4E8E8 ×2, #E3E6E7, #FBFCFC (sidebar), #8F1C13, #08504C ×2 in gradients; white overlays .1 ×5, .14 ×2, .55 ×3.

## Tests
`npx vitest run src/app/b-tokens.test.ts src/app/app/b-viewport.test.ts src/app/app/b-foundation.test.ts src/test/no-page-entrance-motion.test.ts src/test/nevora-visible-branding.test.ts src/components/owner-b src/components/signature/hex-guard.test.ts`: 7 files, 78 tests, all pass. postcss parses the file. No browser check was run. Every `--b-*` token this file now reads already exists in the worktree's b-tokens.css (it uses no display, figure, title or elev-2/3 token); the type tokens are px there and become rem with the foundation patch, the same size at a 16px root.

## DESIGN.MD
No line found that this file's changes contradict. Line 1893 (`.b-live__l` 13.5/18, meta role) still holds. If the doc records the desktop sidebar link radius as 12px, the account menu item as 8px, or the quiet button fill as #EDF0F0, those would need the new values (14px, 10px, #F0F2F3); a grep for those found nothing.
