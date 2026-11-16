# Phase 1, scope D: kit sheet, sign-in, Clocker, recovery, roster import

Worktree: `/private/tmp/claude-501/-Users-josek0514--claude-spares-spare-23XJTe/d762c6df-53eb-43b4-836f-475a53cde009/scratchpad/wt/d`
Patch: `/private/tmp/claude-501/-Users-josek0514--claude-spares-spare-23XJTe/d762c6df-53eb-43b4-836f-475a53cde009/scratchpad/p1patches/d.patch` (applies cleanly in reverse against the worktree; nothing committed).

Values only. A structure check against HEAD (every selector, at-rule, property and `!important` flag, in order) shows no difference except one added declaration (`font-variant-numeric` on the Clocker's privacy count). `!important` counts are unchanged: auth-b 543, owner-b 19 (all inside `@layer nv-b`), clocker 5, others 0.

## Stat

```
 src/components/auth-premium/auth-b.css             | 342 ++++-----
 src/components/clocker.module.css                  | 210 ++++-----
 src/components/commerce-recovery/recovery.module.css |  58 ++--
 src/components/owner-b/owner-b.css                 | 228 ++++-----
 src/components/roster-import/roster-import.css     |  50 +--
 5 files changed, 444 insertions(+), 444 deletions(-)
```

`src/components/owner-b/` holds one stylesheet only (`owner-b.css`). The sign-in sheet is `src/components/auth-premium/auth-b.css`.

## Counts, before → after

| File | distinct font-size | distinct spacing values (share on scale or inset token) | distinct radius | distinct box-shadow | hex literals | `var(--b-` uses |
|---|---|---|---|---|---|---|
| owner-b.css | 18 → 16 | 24 → 22 (52% → 67% of 147) | 14 → 10 | 16 → 15 | 60 → 50 | 99 → 300 |
| auth-b.css | 11 → 11 | 28 → 32 (48% → 58% of 159) | 10 → 6 | 12 → 12 | 139 → 22 | 6 → 328 |
| clocker.module.css | 22 → 21 | 44 → 47 (41% → 46% of 186) | 14 → 9 | 27 → 26 | 66 → 48 | 4 → 172 |
| recovery.module.css | 12 → 8 | 25 → 27 (64% → 69% of 58) | 6 → 5 | 6 → 6 | 5 → 5 | 81 → 135 |
| roster-import.css | 7 → 6 | 12 → 13 (66% → 69% of 39) | 3 → 2 | 4 → 4 | 1 → 1 | 56 → 96 |
| All five | 46 → 33 | 68 → 71 (50% → 58% of 589) | 22 → 13 | 57 → 49 | 271 → 126 | 246 → 1031 |

"Distinct spacing values" counts token names as values, so it rises slightly where one literal became a scale token in one place and an inset token in another (14px → `--b-gutter` horizontally, literal vertically). The share on the scale is the useful number.

## owner-b.css palette copy

The 14 colours in the `.b-screen` copy (teal, teal-50, ink, ink2, grey, line, canvas, amber, amber-50, red, red-50, green, green-50, quiet) are already identical to `src/app/b-tokens.css`. No difference found, nothing changed there. Every other token the sheet uses (on-band, glass, focus, elevation, radius, type, spacing, motion) is read from `:root`.

## What was left alone (counts)

**owner-b.css**
- font-size: 14px ×11, 12px ×6, 34px ×2, 16px, 18px, 22px, one `calc()`.
- line-height in px that is not its role's line: 20px ×5 (15.5/20 and 14/20 pairs), 40px ×2, 19px, 34px, 22px (a chip with no size in the rule).
- spacing: 6px ×18, 10px ×9, vertical 14px ×8, 18px ×2 and 22px ×2, 60px, negatives ×8, one `calc()`.
- radius: 3px ×4, 4px ×3, 2px ×2, 50%, and 18px ×2 (`.b-live`, `.b-week`: 18 is not in the mapping).
- box-shadow: 16 literal declarations (rings, insets, the white pill's `0 8px 18px -8px rgb(0 0 0 / .45)`, the segmented thumb, the ink tile).
- colour: `#FFFFFF` ×16 as a surface, ring, or text on teal and ink fills; `#EDF0F0` (the bar track: `b-tokens.test.ts` pins this exact value as "the grey track", although it is within tolerance of `--b-line`); `#0B3B38` ×3, `#FFC46B` ×2, `#7EF0C7`, `#9AA3A8`, `#7D868B`, `#D3E9E5`, the ink tile's colours and gradient, mask `#000` ×4.
- motion: `b-fade 200ms linear` (the reduced-motion fade-in; it is an entrance, so neither the 150ms nor the 300ms token fits), animation delays 100/200/300ms.
- `.b-search:focus-within` keeps `outline: 2px solid transparent` (pinned by `b-foundation.test.ts`).

**auth-b.css**
- font-size: 14px ×7, 28px ×2, 32px, 16px, one `clamp()`. Line-heights 20px ×6 (with 14px and 15.5px), 34px ×2, 38px, 22px (with 16px).
- spacing: vertical 18px ×8, 22px ×7, 14px ×6; 28px ×8, 56px ×5, 44px ×2, 72px ×2, 96px; 6px ×8, 10px ×6; negatives ×10; one `clamp()`; and `.q-doc__toc a { padding: 9px 12px }` left whole, because 9 → 8 would shrink a link's hit area from 38px to 36px.
- radius: `0` ×8, 50%.
- box-shadow: 16 literal declarations. The desktop sign-in card's `0 24px 48px -24px / .24` lift sits between `--b-elev-1` and `--b-elev-2`, so it stays (its colour now reads `--b-shadow-rgb`); the passkey foot's two-layer shadow, the language and back pills' hairline rings, and the white pill's black shadow also stay.
- colour: `#FFFFFF` ×13 as a surface; `#8F1C13` ×3 (red ink on the red tint, no token), `#0B4F4B` ×2, `#0B3B38` ×2, `#D5DADC` (field edge, not within tolerance of `--b-field-edge`), `#E3F1EF` (5 away from `--b-teal-50`).
- Position offsets (`top: 30px`, `right: 40px`, `top: 24px`, `left: 28px`, `inset: -4px 0`), border-image widths and outsets.

**clocker.module.css** (type and spacing: exact matches only, nothing folded)
- font-size: .9375rem ×15 (15px), 1rem ×5, .8125rem ×5 (13px), .875rem ×4, 1.125rem ×2, 1.625rem, 1.375rem, 3.5rem, 4rem, .75rem, three `clamp()`. Line-heights are all unitless and stay.
- spacing: 10px ×24, vertical or gap 14px ×14, 18px ×9, 22px ×6; 6px ×9, 26px ×3, 7px ×3, 36px ×2, 66px ×2, 5px, 13px, 30px, 28px, 52px, 60px, 84px, 1px ×2, negatives ×3, 16 `max()/env()` values.
- radius: 50% ×8, 4px ×4, 3px ×2, `inherit`, 18px ×3 (`.status`, `.blocked`, `.other`).
- box-shadow: 31 literal declarations (status rings, field and key edges, focus halos, dots, the logo tile, the privacy pill).
- colour: the four brand lines keep their literal fallbacks (`var(--clocker-accent, #0C726C)` is pinned by a test, and the other three follow the same pattern); `--ck-line` #E1E5E6, `--ck-field` #D3D9DB, the ring and ink variants, `#E3E7E8` ×2, `#E6E9EA` ×2, `#CFE7E3` ×2, `#08524E`, `#7A8489`, `#C2554A`, `#D5DADC`, `#FFC46B` ×2, `#7EF0C7`, `#0B3B38`, the band's gradient; `#FFFFFF` ×15 as a surface or as text on the accent, green and ink fills. `#8A9399` (the secondary action's chevron) is within tolerance of `--b-disabled-ink` only, which is the wrong meaning, so it stays; it is 7 away from `--b-field-edge`.
- motion: keys' 90ms, the 220ms shake, check draw 420ms and its 160ms delay, the reduced-motion `ckFade 200ms`, spinner .9s, progress 1.3s, clearing bar 8s. Focus outline stays 3px.
- "Nevora Clocker" font-family untouched.

**recovery.module.css**: font-size .875rem ×2, 1rem, one `clamp()`; spacing 10px, 6px, vertical 14px ×2 and 22px, 28px, 30px, 44px, 56px, negatives, three `max()/clamp()`; five literal shadows (rings on the shadow token colour); `#FFFFFF` ×5 surfaces.

**roster-import.css**: font-size 14px (with 20px line); spacing 6px ×3, 10px ×3, vertical or gap 14px ×3, negatives ×3; `#FFFFFF` ×1; six inset hairline shadows.

## Could move more than 1px, or is worth a look in a browser (file:line, old → new)

**owner-b.css**
- :92 `.b-screen` base font-size 15px → 15.5px (everything in a BScreen that inherits its size).
- :185 `.b-row__t` line-height 21px → 22px; :362 `.b-route-state p` 21px → 22px (plus 15 → 15.5).
- 15 → 15.5: :113 `.b-back`, :119 `.b-eyebrow`, :196 `.b-add`, :262 `.b-step__t`, :268 `.b-notice__t`, :271 `.b-week__h`, :290 `.b-sched-done b`. 13 → 13.5: :168 `.b-note`, :236 `.b-ink__k`, :244 `.b-ink__r2`, :248 `.b-kv span`, :257 `.b-step__n`, :333 `.b-filters button` (≤359px).
- :275 `.b-week__d` radius 12px → 14px; :288 `.b-notes > *` radius 16px → 14px and shadow `0 0 0 1px .05, 0 8px 20px -12px .18` → `--b-elev-1`.
- :188 `.b-row__end` gap 3px → 4px (3 is equidistant from 2 and 4; I took 4); :217 `.b-chip` gap 5px → 4px; :237 `.b-ink__due` padding 4px 9px → 4px 8px; :331 week chip padding 0 7px → 0 8px.
- Pills written as half the height now read the pill token (same shape): :55, :114, :158, :166, :178, :197, :210, :257, :273.

**auth-b.css**
- :70, :72, :234 button radius 26px → `--b-radius-pill`. Same shape at 52px; a label that wraps to two lines now gets fully round ends instead of 26px corners.
- :71, :235 primary button shadow `0 8px 18px -8px rgb(11 110 105 / .6)` → `--b-elev-glow` (`0 6px 14px -6px`, same colour).
- :32, :36, :54, :58, :191, :355 glass chip ring white .18 → `--b-glass-edge` (.16).
- :238 passkey pill `#EDF0F0` → `--b-quiet` (#F0F2F3).
- 15 → 15.5: :95, :205 (line 21 → 22), :241, :286, :374, :408, :415, :416, :418, :426, :434.
- :246, :401 caret turn 160ms → 150ms.
- Band: `#0C726C` → `--b-band-solid` in 8 backgrounds and inside the 8 `border-image` gradients; white text on it → `--b-on-band`; focus rings → `--b-focus-width` / `--b-focus` / `--b-focus-on-band` / `--b-focus-offset` (the button's 3px offset and the −2px ones stay). Heights and layering untouched.

**clocker.module.css**
- :26 `--ck-lift` `… 0 18px 40px -16px / .22` → `--b-elev-1` (`0 12px 28px -12px / .18`): the task card's shadow is a little shallower.
- :184 primary button glow → `--b-elev-glow`; :303 primary action tile `0 10px 22px -10px / .7` → `--b-elev-glow`.
- radius 16px → 14px: :50 `.skip`, :173 `.note`, :231 `.pin`, :265 `.idEntry input`, :321 `.facts`, :354 `.handoffPanel`; 12px → 14px: :70 `.companyLogo`; 24px → 22px: :281 `.privacy`, :301 `.act`.
- :69 `.workspace` 17px, :78 `.location` 18px, :107 `.status` 20px (portrait), :291 `.chip` 16px → pill token (same shape on one line; rounder if the text wraps).
- :63 glass ring .18 → .16.
- :183, :302 button and action transitions 140ms/120ms ease → 150ms ease-out; :212 `.lang` 120ms → 150ms; :237 PIN dots 120ms → 150ms; :329 check pop 320ms → 300ms. Press `scale(.96)` → `scale(var(--b-press-scale))` (same value) at :190, :213, :305.
- :283 `.privacy .count` gained `font-variant-numeric: tabular-nums` (the only declaration added in the scope).

**recovery.module.css**
- :14 `.lang` and :53 `.quiet` .9375rem → 15.5px; :78 `.foot` .8125rem → 13.5px; :90 panel eyebrow 15px → 15.5px.
- :66 `.seg` radius 22px → `var(--b-seg-r)` (pill; differs only if the two options ever wrap onto two rows); :21 `.card h2` 16px → pill.

**roster-import.css**
- :19 `.rimp-example` 13px → 13.5px (a no-wrap table inside a scroller, so it gets a few pixels wider).
- radius 16px → 14px: :17 `.rimp-needs`, :79 `.rimp-editor`, :91 stacked row card; 12px → 14px: :39 `.b-row--link`.

## Tests

- Parse: all five files parse with postcss.
- `npx vitest run src/app src/components/owner-b src/components/employee-b src/components/signature src/test src/components/auth-premium src/components/commerce-recovery src/components/roster-import`: 197 files passed, 3 skipped, 1 failed (2245 tests passed, 60 skipped, 1 failed).
- The one failure is `src/test/manual-publication.test.ts` ("Stale or foreign application content hash"). It compares the app's source bytes with the published guides' source commit; HEAD already differs from that commit in 597 files under `src`, so it fails on any worktree with source edits. I did not run it on an untouched HEAD to confirm.
- The guards that read these files passed: `b-foundation.test.ts`, `b-viewport.test.ts`, `b-tokens.test.ts`, `hex-guard.test.ts`, `no-page-entrance-motion.test.ts`, `phase-c-governance-cleanup.test.ts` (Clocker).
- Not run: tsc, the full suite, any browser check. Tokens that are not in this worktree yet (`--b-fs-*` in rem including `--b-fs-display/figure/title`, `--b-lh-display/figure/title`) resolve only after the foundation patch merges; until then those declarations are invalid, so this patch must not ship without it.

## DESIGN.MD lines this makes out of date

- 1757 to 1758 ("Still to adopt elsewhere: the Clocker … and the sign-in and public pages … should read `--b-on-band`/`--b-on-band-2`, `--b-band`, the pill radius and the focus pair from `b-tokens.css`"): done for the sign-in and public pages (band solid, on-band, pill radius, focus pair). The Clocker now reads on-band, the pill radius, glass, the palette and the elevation and motion tokens; its band glow and 3px focus ring stay.
- 1718 ("`owner-b.css` keeps its own copy with the same values"): still true; worth adding that the rest of the sheet now reads the shared tokens from `:root`.
- The Clocker section (near 1690 to 1707) describes motion in general terms and stays correct; if it lists the 16px field and note corners or the 24px action tile anywhere, those are now 14px and 22px.

## Release sequence (per Jose's policy)

Nothing here is merged or deployed. Source evidence: uncommitted diff in the worktree above, on its temporary HEAD that contains fix round 1. Sequence stays: integrate and verify on development, then promote the exact verified release to main/production after Jose's approval.
