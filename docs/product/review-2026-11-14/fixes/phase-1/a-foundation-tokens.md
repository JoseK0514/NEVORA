# Phase 1 foundation (engineer A) report

Patch: `/private/tmp/claude-501/-Users-josek0514--claude-spares-spare-23XJTe/d762c6df-53eb-43b4-836f-475a53cde009/scratchpad/p1patches/a.patch` (values only; nothing committed).

## Stat
```
src/app/app/b-foundation.css  | 146 +++---
src/app/app/owner-b-pages.css | 234 +++---
src/app/app/owner-b-shell.css |  30 +++---
src/app/b-tokens.css          |  37 +++---
src/app/b-tokens.test.ts      |  31 ++++-
5 files changed, 253 insertions(+), 225 deletions(-)
```
A postcss comparison against HEAD shows the three stylesheets are structurally identical: same selectors, at-rules, layers, properties, `!important` flags (171 / 45 / 288) and comments. Only declaration values changed.

## Tokens (b-tokens.css)
- `--b-fs-*` and `--b-lh-*` now exist for all eight roles, in rem with a px comment. Added: the display, figure and title sizes and all eight line-heights as rem; the five existing sizes moved from px to rem. `--b-fs-count: 12px` kept.
- `--b-type-*` now reference the pair (`var(--b-fs-body)/var(--b-lh-body)`), so they cannot drift.
- New `--b-elev-3: 0 0 0 1px rgb(16 40 38 / 0.07), 0 4px 8px rgb(16 40 38 / 0.10), 0 40px 72px -20px rgb(16 40 38 / 0.40)`. The values are my proposal (one step past elev-2 in ring, near and far layer); nothing reads it yet, so it needs a designer's eye before a dialog adopts it.
- b-tokens.test.ts pins: the 16 fs/lh values, the type pairs, `--b-fs-count`, the spacing scale, three insets, four radii, motion, three elevations in one shadow colour with each step casting further and darker, the glow, and the palette names PHASE1.md lists.
- **rem consequence to know about:** the five `--b-fs-*` that were px now follow the root font size. At a 16px root nothing changes. Existing readers outside my scope: `src/components/roster-import/roster-import.css` and b-foundation.css.

### owner-b.css palette copy (not edited)
It defines 14 `--b-*` names (teal, teal-50, ink, ink2, grey, line, canvas, amber, amber-50, red, red-50, green, green-50, quiet). **No value differs from b-tokens.css.** It lacks everything else (grey-on-fill, field-edge, solids, coral, band, glass, elevation, focus, type, spacing, radius, motion), which it inherits from `:root`.

## Before and after counts
| File | distinct font sizes | distinct spacing values | spacing on scale or inset token (tokenised) | distinct radius | distinct box-shadow | hex literals | `var(--b-` |
|---|---|---|---|---|---|---|---|
| b-foundation.css | 17 → 14 | 25 → 27 | 54% → 63% (0 → 63%) | 21 → 12 | 18 → 18 | 28 → 28 | 250 → 364 |
| owner-b-shell.css | 5 → 4 | 9 → 8 | 64% → 73% (0 → 73%) | 7 → 5 | 5 → 5 | 9 → 3 | 6 → 26 |
| owner-b-pages.css | 10 → 9 | 22 → 24 | 42% → 68% (0 → 68%) | 10 → 7 | 10 → 10 | 53 → 44 | 67 → 259 |
| b-tokens.css | n/a | n/a | n/a | n/a | n/a | 31 → 31 | 93 → 100 definitions |

"Distinct spacing values" rises slightly because a token and a leftover literal of the same number count as two. Spacing total: 104 / 11 / 172 non-zero components.

## Left alone (three stylesheets combined)
- **Font sizes:** 14px ×8, 12px ×8, 28px ×3, 16px ×3, 10.5px ×3, plus `0`, `1em`, `inherit` (one each).
- **Line-heights:** 19px ×5 (all with 14px text), 20px ×8, 34px ×3, 16px ×2 (with 12px), 13px ×3, 15px, 22px ×2 (with 16px and with 12.5px), unitless `1` ×6.
- **Spacing:** 6px ×16, 10px ×5; vertical 18px ×16, 14px ×10, 22px ×2; negatives ×20 (−16, −12, −18, −28, −4, −2, −13, −11); off-scale 34px ×4, 56, 52, 44, 36; odd values 5px ×3, 3px, 11px, 13px (reasons below); calc() ×3; `--b-seg-*` vars ×10.
- **Offsets (top/left/right/bottom/inset in px):** 22 declarations, none tokenised (I read "offsets used as spacing" narrowly).
- **Radius:** `0` ×9, 50% ×3, 3px ×2, 4px ×2, 6px, `inherit`; 16px ×1 and 18px ×1 on purpose (below).
- **Shadows:** inset rings and edges ×18, solid band extensions ×4, 2px rings ×4, white-pill-on-band shadow `0 8px 18px -8px rgb(0 0 0 / 0.45)` ×2, thumb shadows ×4 (three variants), the offline pill's `0 10px 24px -10px rgb(16 24 32 / 0.5)` ×1.
- **Colour:** `#FFFFFF` surfaces and text on solid buttons ×38; `#08504C` ×21 (5 in gradients) and `#0B3B38` ×5 have no token; `#E6EBEA` ×4 and `#E3E6E7` ×1 are more than 3 per channel from any token; `#FFC46B` ×1; glass rgb inside gradients ×5; other rgba overlays ×11.
- **Motion:** only the spinner's 800ms keyframe timing.
- **tabular-nums:** none added; b-foundation.css already sets it on every figure class.

Deliberate exceptions to the mapping:
1. b-foundation.css:428 menu radius 16px kept. b-foundation.test.ts and DESIGN.MD pin "10px items concentric with the 16px menu" (16 = 10 + 6).
2. b-foundation.css:558 and :563 tablet rail padding `5px 2px` / `5px 18px` kept: the sheet's own TB-001 note pins the 56×30 icon pill.
3. b-foundation.css:254 `padding-block: 11px` with `margin-block: -11px`, and owner-b-pages.css:347/349 `-13px` / `13px`: paired values; snapping one side moves the text.
4. owner-b-shell.css:52 tab bar `gap: 3px`: equidistant from 2 and 4.
5. owner-b-shell.css:80 offline pill `border-radius: 18px` kept: the pill can wrap to two lines (`text-wrap: balance`), where 999px would change its shape.
6. `color: #FFFFFF` became `--b-on-band` only on band text (12 places); white on teal or red buttons, the offline pill and the tab badge stay literal. owner-b-pages.css:390 (`.c-act__arrow`) left because I could not tell its surface.

One reading of the mapping to confirm: 14px horizontal padding inside pills and fields (owner-b-pages.css:58, b-foundation.css:362 and :627) became `--b-gutter` as the mapping says, though that token is described as the phone page gutter. Changing the gutter later would move those paddings too.

## Could visibly move (check in a browser)
More than 1px, or cumulative:
- owner-b-pages.css:127 and :448 row title line-height 21px → `--b-lh-body` (22px). Every corporate and Quiet row with a title grows 1px on phones, so a 10-row card is about 10px taller.
- owner-b-shell.css:58 tab badge padding `0 5px` → `0 4px`: a two-digit count is 2px narrower (one digit is held by the 18px min-width).
- owner-b-pages.css:58 and :107 band action pills `18px` → pill token with only a min-height of 36px: identical on one line, rounder if a label ever wraps.

1px or less:
- b-foundation.css:165–166 focus ring corners 21px → 22px.
- b-foundation.css:444 and :479 radius 8px → 10px (route note Dismiss focus shape; the row select, which draws no box).
- owner-b-pages.css:209 sliding thumb 9px → 10px.
- 15px → 15.5px: b-foundation.css:253 (Help answers), :403 (team week label), :430 (Insights menu items), :442–443 (route note text and Dismiss; text line 21 → 22px), :515 (48px footer pills); owner-b-pages.css:41 (back link) and :493.
- 13px → 13.5px: b-foundation.css:305 (finder "more" line), owner-b-shell.css:45 (avatar initials in the 40px circle).
- owner-b-shell.css:20 offline pill line-height 19px → 18px.

## Legacy kits in b-foundation.css (task 3)
Where b-foundation.css already styles them, they now read tokens:
- **`c-btn`, `q-btn`, `q-bs`, `nv-btn`:** radius is `--b-radius-pill` everywhere (the last literal, `.q-acts .q-bs` 999px, converted); press and disabled already used tokens; `nv-btn` type is now `--b-fs-body-sm`/`--b-lh-body-sm` (and body at 48px) and its focus already used the focus tokens. The 48px footer pill's 15px became `--b-fs-body` with its 20px line left literal.
- **`c-row`:** icon circles are the pill token with teal-50/teal and red tokens; soft values and details read `--b-grey`.
- **`q-row`, `c-empty`, `q-empty`, `c-error`, `q-error`:** b-foundation.css has no rule for them, so nothing was added. (owner-b-pages.css gives `q-empty` the card radius and `--b-elev-1`, now tokens.)

Not from tokens, because b-foundation.css does not set them: type and focus for `c-btn`/`q-btn`/`q-bs` (their kits' own), row type on tablets and desktop, and 23 literal 44/48px target sizes that could read `--b-target` / `--b-target-touch`.

What a later markup retirement would need:
- Usage (non-test .tsx files): `q-btn` 48, `q-row` 40, `c-btn` 39, `nv-btn` 32, `c-row` 28, `q-empty` 19, `c-error` 18, `c-empty` 14, `q-error` 13, `q-bs` 12.
- Base rules live in corp-shell.css, corp-quiet-bridge.css, components/corp/corp.css, components/quiet/quiet.css and about a dozen page sheets (timecards-corp, settings-corp, more-corp, reports-corp, premium-*).
- Direction B needs, before the classes can go: a B row and B empty and error states that accept these pages' markup (the state card exists; `q-error`/`c-error` have no B rule at all), button variants mapped (`c-btn--secondary`/`--neutral`/`--danger`, `q-btn--sec`/`--quiet`, `q-bs--go`, `nv-btn[data-kind]`), and the `--c-*`/`--q-*` aliases in b-foundation.css kept until the last page moves.
- Tests pin some of these strings (b-foundation.test.ts: the press rule list, the `nv-btn` rules, the legacy pill rule), so they change with the retirement.

## Tests and checks run
- postcss parse of all four stylesheets: pass. Every `var(--b-*)` used in the three sheets is defined in b-tokens.css.
- `npx vitest run src/app/b-tokens.test.ts src/app/app/b-foundation.test.ts`: 52 passed.
- `npx vitest run src/app src/components/owner-b src/components/employee-b src/components/signature src/test`: 2042 passed, 60 skipped, **1 failed**: `src/test/manual-publication.test.ts` ("Stale or foreign application content hash"). It fails the same way on the worktree's HEAD with my changes removed, so it is not caused by this patch; it compares app sources to the published manuals' hash.
- Not run: tsc, the full suite, and any browser check. Nothing here was looked at in a rendered page.

## DESIGN.MD lines this makes out of date (main checkout)
- 393–394: "Tokens added for Phase 1 (not yet read by any rule)" and the `--b-type-*` list; they are read now, and `--b-fs-*`/`--b-lh-*` (rem) and `--b-elev-3` are missing.
- 1731–1732: Elevation lists elev-1, elev-2 and the glow only.
- 1747–1748: "Type roles (defined, adopt page by page)" lists five roles in px; there are eight, in rem.
- The comment at b-foundation.css:67 still says Help answers are "15/22" (comments were not edited); they are 15.5/22.
