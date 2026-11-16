# Phase 1 report: engineer C (Employee and Lead stylesheets)

Worktree: `/private/tmp/claude-501/-Users-josek0514--claude-spares-spare-23XJTe/d762c6df-53eb-43b4-836f-475a53cde009/scratchpad/wt/c`
Patch: `/private/tmp/claude-501/-Users-josek0514--claude-spares-spare-23XJTe/d762c6df-53eb-43b4-836f-475a53cde009/scratchpad/p1patches/c.patch` (applies and reverses cleanly against the worktree HEAD). Nothing committed, pushed, branched or stashed.

## Stat

```
src/app/app/employee-b-desktop.css       | 234 +++++-----
src/components/employee-b/account.css    | 220 +++++-----
src/components/employee-b/employee-b.css |  68 ++--
src/components/employee-b/pay.css        |  28 +-
src/components/employee-b/requests.css   | 144 +++----
src/components/employee-b/schedule.css   |  52 +--
src/components/employee-b/time.css       | 138 +++----
7 files changed, 442 insertions(+), 442 deletions(-)
```

Values only. No selector, class, breakpoint or layer change, no rule deleted, no unlayered `!important` added. One declaration was added (tabular-nums, below). The fix round 1 `::after` hit-area rules in schedule.css, pay.css and account.css are untouched (0 changed lines contain `::after`).

## Counts (all seven files together)

| Measure | Before | After |
|---|---|---|
| Distinct font-size values | 21 | 19 (8 role tokens, plus 12, 14, 16, 18, 22, 26, 28, 40px, 0, inherit, `--b-seg-fs`) |
| Distinct spacing values | 49 | 49 |
| Spacing values on the scale or a named inset | 43.1% of 601 | 64.7% of 601 |
| Distinct radius values | 23 | 13 (4 tokens, plus 0, 50%, 4, 5, 6, 7, 16, 18, 20px) |
| Distinct box-shadow values | 37 | 34 |
| Hex literals | 86 | 61 |
| `var(--b-` uses | 331 | 1120 |

## Tokens used that are not in this worktree's b-tokens.css yet

`--b-fs-display`, `--b-lh-display`, `--b-fs-figure`, `--b-lh-figure`, `--b-fs-title`, `--b-lh-title`. Until the foundation patch merges, the 30px, 24px and 20px sizes fall back to inherited values in this worktree alone, so do not judge those in a browser from this worktree by itself.

## Task-specific items

- Row chevron: `#B5BBBF` is now `var(--b-field-edge)` in pay.css:20 and time.css:174.
- Bell dot rings in employee-b.css:20 (teal ring) and :22 (ink ring `#152A28`) are both `0 0 0 2px var(--b-on-band)`, the value b-foundation.css already forces. Rules kept.
- Disabled:
  - requests.css:60 (layered, form buttons): `var(--b-quiet)` / `#A7ACB1` is now `var(--b-disabled-bg)` / `var(--b-disabled-ink)`.
  - **Not changed, needs a decision:** schedule.css:61 (the weekly confirmation button, `aria-disabled`, `opacity: 0.55`). The button's teal fill and white text are set with `!important` inside `@layer nv-b` (schedule.css:19 to 20), and line 61 is unlayered. The disabled pair cannot win from line 61 without an unlayered `!important` or a new layered rule, both outside my rules. Switching only the opacity would make the disabled button look enabled, so I left it.
  - Not changed: requests.css:116 `.eb-inline__b:disabled` (`opacity: 0.55`) is a text button with no fill.
- tabular-nums added once: employee-b-desktop.css:421, the Notifications count badge on the rail (its `font` shorthand resets it).

## What could visibly move more than 1px (for a browser check)

Radius and colour
- employee-b-desktop.css:80 `.eb-shift .eb-tint`: radius 16px → 14px; background `#F4F6F6` → `var(--b-canvas)` (#F2F5F4).
- employee-b-desktop.css:105 `.eb-wsh` (week tiles): background `#F4F6F6` → `var(--b-canvas)`; type 13/17 → 13.5/18.
- employee-b-desktop.css:195 `.c-more .eb-id` (glass card): radius 20px → 22px.
- employee-b-desktop.css:350 `.c-avail__line`: `#EEF1F1` → `var(--b-quiet)`.
- account.css:134 `.b-note.eb-callout`: radius 16px → 14px.
- account.css:190 `.eb-lseg` track: radius 13px → 14px (inner thumb stays 10px with 3px padding).
- employee-b.css:105, requests.css:190, requests.css:206: tile background `#F4F7F6` → `var(--b-canvas)`.
- time.css:129 disabled field: `#F7F8F8` → `var(--b-hover)`.
- pay.css:20, time.css:174: chevron `#B5BBBF` → `#838A8F` (darker, intended).
- requests.css:60: disabled text `#A7ACB1` → `#8C9397`.
- Pills written as half the height are now `var(--b-radius-pill)` (46 declarations). Same shape on one line; where the rule uses `min-height` and the label wraps to two lines, the corners become fully round instead of 20 to 24px: account.css:119, account.css:180, employee-b-desktop.css:283, :316, :650, pay.css:9.

Widths (2px)
- Count pills, padding `0 7px` → 8px: employee-b-desktop.css:16, employee-b.css:31, employee-b.css:122 (wider only once the count exceeds the min-width).
- Chips, padding `0 9px` → 8px: employee-b.css:134, pay.css:8 (2px narrower).
- employee-b-desktop.css:607 week-state pill, `0 11px` → 12px (2px wider).
- employee-b-desktop.css:657 `.eb-segn`, `0 5px` → 4px.
- requests.css:166 textarea padding `13px 14px` → 12px / gutter (height is fixed at 96px; text moves 1px).

Type (1px per line, so more than 1px on wrapped text)
- 15px → 15.5px in 23 declarations and 13px → 13.5px in 22, plus three `font` shorthands (employee-b-desktop.css:608, requests.css:145, and 15.5px in time.css:141 and :177).
- 15/21 → 15.5/22 (each line 1px taller): employee-b-desktop.css:79, 141, 183, 192; account.css:114; requests.css:131, 201, 208, 215; time.css:133, 171.
- 13.5/19 → 13.5/18 (each line 1px shorter): employee-b-desktop.css:53, 118, 151, 153, 314; account.css:301.
- 14.5/21 → 14.5/20: employee-b-desktop.css:394; account.css:111, 178, 201, 216.
- account.css:284: 15/22.5 → 15.5/22.

Motion
- requests.css:154 fade 160ms → `var(--b-dur-hover)` (150ms); time.css:196 and account.css:277 fades 200ms → 150ms (`linear` kept). The 300ms entrances are `var(--b-dur-enter) var(--b-ease-out)` with their delays unchanged.

## Left alone (counts)

Type
- font-size: 14px ×26, 16px ×11, 12px ×6, 18px ×2, 26px ×2, 28px ×2, 22px ×1, 40px ×1; `font` shorthands at 12px ×3, 14px ×2, 16px ×1.
- line-height: 50 px values left, either because the size is not a role size (mostly 14px/19px) or because the size is set in another rule (10 rules, for example `.b-row__s`, `.b-notice__t`, `.eb-empty__s`, `.c-field__label`); 5 of these are 15/20 folded to 15.5 with the 20px line kept (2px from the role's 22). Unitless or keyword: 9.

Spacing
- 6px ×39 and 10px ×32 (kept this round as instructed).
- 14px ×28, 18px ×33, 22px ×16 where they are vertical, a gap, or a single value that sets both axes.
- Negative values ×39 (overlap and optical margins).
- Odd values kept: 3px ×3 (ties between 2 and 4: `.eb-lseg` padding and two margins), 5px ×2 and 17px ×1 (margins or paired with a negative margin), 9px ×1 (employee-b-desktop.css:359 `.eb-toc a` vertical padding: snapping would shorten a link's hit area by 2px).
- One-offs: 1px ×2, 28, 30, 42, 44, 52px, 66px ×4, 81, 156, 160, 218, 222px; 1 calc().
- `top` / `right` / `bottom` / `left` / `inset` offsets: 50 declarations, none tokenised (they position things).

Colour (61 hex literals remain)
- `#FFFFFF` as a surface, as text on a teal, red or ink fill, and as the ring on the rail badge.
- `#8C9397` as the fallback inside `var(--b-field-edge, #8C9397)` ×6 (a dead fallback; it differs from the token's current #838A8F).
- No token within 3 per channel: `#FBFCFC` ×3, `#0B3B38` ×3, `#D5DADC`, `#A3A9AE`, `#9AA3A8`, `#2A3033`, `#08524E`, `#A8F0E4`.
- rgba overlays: `rgb(16 24 32 / 0.04)` press tint ×7, white glass and hairline alphas, the scrim.

Radius
- 0 ×10, 50% ×1, 4 to 6px ×8, 7px ×1 (the 24px checkbox, account.css:54).
- 16px on buttons ×4 (requests.css:53, time.css:140, :176, :185): buttons are not in the mapping's field list.
- 18px ×4 (employee-b-desktop.css:384 offline pill, account.css:96 `.eb-id`, account.css:251, requests.css:80), 20px ×1 (requests.css:69, height set elsewhere).

Elevation (31 box-shadow declarations left)
- `var(--nvd-card)` ×3 on the desktop cards and sheet (not a `--b-` token; same role as `--b-elev-1`).
- Inset hairlines and rings, focus and selection rings, the bell and avatar rings.
- One-offs: the two-layer card without a drop, the side panel `-24px 0 48px -16px`, white buttons on the band (`0 8px 18px -8px`, `0 10px 24px -10px` black), the red button glow `0 4px 10px -6px rgb(180 35 24 / 0.55)` (the teal glow token would be wrong on red), switch thumb shadows, `.eb-xpane__back`.

Motion
- `eb-spin 800ms linear infinite` and all keyframes.

## Tests run (in the worktree)

- Parse: all seven files parse with postcss (3,027 declarations).
- `npx vitest run` on the 24 test files that mention a stylesheet or employee-b, including `src/app/b-tokens.test.ts`, `src/app/app/b-foundation.test.ts`, `src/app/app/b-viewport.test.ts`, `src/components/signature/hex-guard.test.ts`, `src/test/no-page-entrance-motion.test.ts` and `src/components/employee-b/*`: 20 files passed, 4 skipped; 253 tests passed, 86 skipped, 0 failed.
- Not run: tsc, the whole suite, any browser check. No before and after screenshots were taken.

## DESIGN.MD lines this makes out of date

- Line 1747, "Type roles (defined, adopt page by page)": the Employee and Lead sheets now read the role tokens.
- Line 1741, "disabled is #F0F2F3 with #8C9397 text, no opacity fades": still untrue in two places (schedule.css:61, requests.css:116); see the open decision above.
- Line 1726 says `--b-field-edge` is #8C9397; line 389 already says #838A8F. Stale before this patch, and the six dead fallbacks in these files repeat the old value.
- Line 1733 ("every button … is a pill (999px)"): now written as `var(--b-radius-pill)` here; the four 16px buttons and three 18px ones listed above still are not pills in these files.
