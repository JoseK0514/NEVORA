# WP9 report: Direction B foundation fixes

All eleven items are addressed in CSS, the kit and form validation; nothing was rendered in a browser, so every visual statement below is read from the cascade. The focused tests and ESLint pass. The patch reverse-applies cleanly against the worktree. `tsc` was not run, per COMMON.

**Patch:** `/private/tmp/claude-501/-Users-josek0514--claude-spares-spare-23XJTe/d762c6df-53eb-43b4-836f-475a53cde009/scratchpad/patches/wp9.patch`

**Source:** worktree `/private/tmp/claude-501/-Users-josek0514--claude-spares-spare-23XJTe/d762c6df-53eb-43b4-836f-475a53cde009/scratchpad/wt/wp9`, detached at `ce4de4bc`. Nothing committed, pushed, deployed or sent. The release sequence is unchanged: development first, then main after Jose's approval.

```
 src/app/app/b-foundation.css           | 140 ++++++++++++++++++++++++++++-----
 src/app/app/b-foundation.test.ts       |  64 +++++++++++++++
 src/app/app/employee-b-desktop.css     |  17 ++--
 src/app/app/owner-b-desktop.css        |  23 +++---
 src/app/app/owner-b-pages.css          |  12 ++-
 src/app/app/owner-b-shell.css          |   6 +-
 src/app/b-tokens.css                   |  35 +++++++--
 src/app/b-tokens.test.ts               |  79 +++++++++++++++++++
 src/components/form-validation.test.ts |  22 ++++++
 src/components/form-validation.tsx     |  19 ++++-
 src/components/owner-b/b-kit.test.tsx  |  22 ++++++
 src/components/owner-b/b-kit.tsx       |  10 ++-
 src/components/owner-b/owner-b.css     |  18 +++--
 13 files changed, 399 insertions(+), 68 deletions(-)
```

## Findings

| # | Finding | Status | What changed |
|---|---|---|---|
| 1 | SY-018 / UI-7 / RA-21 | Done | `b-foundation.css`: the press `scale` is inside `@media (prefers-reduced-motion: no-preference)`; `transform: none` stays outside so the older kits' press is off either way. `.nv-btn` joined the rule. The audit of the other scoped files found no other ungated motion. |
| 2 | RA-17 | Done | A transparent outline now sits beside each shadow-only ring: the live tile, the sidebar entry's `::after` ring, Team search and the kit's `.b-search` (found in the audit). One forced-colours block names `Highlight` for those rings and gives the B1 select, glass fields and buttons, and the chosen segment or filter a real edge. |
| 3 | SY-008 / RA-14 | Done | See the contrast table below. |
| 4 | SY-015 / UI-5 | Done | `.nv-btn` has a Direction B rule in `@layer nv-b`: pill, 44px (48px with `data-block`), 14.5/20 600, teal focus ring. Primary maps to the teal primary with glow, secondary and no-kind to the tinted pill, danger to red, and disabled to the token pair; a busy button keeps its fill. A blanket rule makes `.c-btn`, `.q-btn`, `.q-bs` and `.wc-btn` pills wherever no B rule set a radius. Three Employee phone-form rules in `employee-b/requests.css` (16, 18 and 20px corners) are overridden from the foundation sheet. `owner-b-pages.css:134` no longer excludes the red secondary. No class was renamed. |
| 5 | SY-023, SY-010 | Done | `BState` empty kind defaults to a Tray glyph; failed keeps the warning; the `icon` prop still wins. Menu items are `--b-radius-small` (10px = 16 − 6). |
| 6 | EM-011 / BR-8 | Done | The ink band, ink top bar and ink dot rings are removed in all five scoped sheets (desktop, Employee desktop, phone pages, shell, kit). `BScreen`'s `ink` prop and `.b-screen--ink` still exist and now draw the teal band. `--b-band-ink` stays defined, unused by any page band. |
| 7 | TB-001 | Partly | The label text is in the DOM (`app-shell.tsx:484`), so at 768–1023px the rail is 80px with a 10.5/13 label under each icon (two lines at most). The current entry has a teal-50 56×30 pill behind its icon. One badge style: a 20px pill of 12/700 at the icon's top right, red for Things to do and teal for an Employee's Notifications. Help is labelled the same way. The filled current icon is not done: it needs markup (see "Shell needs"). |
| 8 | RA-9 | Done | `aria-describedby` is re-asserted on every `show()` through a new exported helper, `describedByWith`. The message gets `role="alert"` on blur and input, and no role on submit, where focus moves to the first problem and reads its description. Texts are unchanged. |
| 9 | UI-22 / SY-021 | Nothing to change | No `:disabled` rule in the scoped files uses opacity alone; they already use the token pair. The new `.nv-btn` disabled rule uses the pair. |
| 10 | BR-11 (shared part) | Done | `.b-btn::after` is now `max(100%, 44px)` tall, so the 32px "See your hours" pill and the 34px narrow-phone row pill reach 44px. Also raised: `.b-week__arrow` at 359px and under, the Hours-this-week arrows on phones, the phone band's 36px white pills, and the 40px correction Approve and Decline. No drawn size changed. |
| 11 | Phase 1 tokens | Done | `--b-type-*` (eight roles as `size/line` in rem with px comments, for the `font` shorthand), `--b-space-2` to `--b-space-64`, `--b-gutter` / `--b-inset` / `--b-inset-wide` (14, 18, 22), `--b-radius-small`, and `--b-dur-hover` / `--b-dur-exit` / `--b-dur-enter`. Nothing reads them yet. |

## Contrast, before and after (WCAG 2, computed)

| Pair | Before | After | How |
|---|---|---|---|
| Grey text on quiet `#F0F2F3` | 4.41 | 5.21 | The fills point `--b-grey`, `--c-grey`, `--q-grey` and `--q-soft` at `--b-grey-on-fill` `#5E666B` |
| Grey text on teal-50 | 4.37 | 5.16 | Same; this covers chosen rows, whose grey second line was the located miss |
| Grey text on red-50 | 4.33 | 5.12 | Same |
| Grey text on amber-50 / green-50 | 4.51 / 4.38 | 5.33 / 5.17 | Same |
| Second white (.86) on glass, lightest band stop | 3.80 | 4.53 | `--b-on-band-2` resolves to white inside glass surfaces |
| Bell's coral dot on the band | 2.07, teal ring | Ring 5.77 on the band, 4.53 on the bell's glass | The 2px ring is white; coral itself is unchanged |
| Field edge on white / canvas / quiet / teal-50 | 3.12 / 2.84 / 2.78 / 2.75 | 3.50 / 3.19 / 3.12 / 3.09 | `--b-field-edge` `#8C9397` → `#838A8F` |
| Row chevron on white / teal-50 | 1.94 / 1.71 | 3.50 / 3.09 | `#B5BBBF` → `var(--b-field-edge)` |
| Amber solid on white / amber-50 / bar track `#EDF0F0` | 2.17–2.24 / 1.97 / 1.95 | 3.73 / 3.39 / 3.25 | New `--b-amber-solid` `#B8760F` |
| Offline dot on light bar / ink pill | 2.00 / 8.48 | 3.44 / 4.93 | Same token |
| Green "working" ring on white | 2.67 | 3.55 | New `--b-green-solid` `#239A6D` (not in your list; it is in SY-008) |

The amber solid is used by the schedule conflict ring, the open-shift dashed edge and its legend, the amber bar and the late avatar ring. Text and chips on the now-teal Payroll and Pay bands: white 5.77, second white on the solid band 4.72, glass button text 4.53, white chips with green or amber ink 6.48 / 6.80.

## User-facing strings

None changed or added, in English or Spanish.

## Tests

- `npx vitest run` on nine files: 190 passed. The five that cover this work are `src/app/b-tokens.test.ts` (new), `src/app/app/b-foundation.test.ts` (new), `src/app/app/b-viewport.test.ts`, `src/components/form-validation.test.ts` (new) and `src/components/owner-b/b-kit.test.tsx` (new). The other four are neighbours: `payroll-premium`, `my-pay`, `app-shell`, `manager-inbox`.
- `npx eslint` on the six changed or new TypeScript files: clean.
- PostCSS parses all seven sheets, and the count of unlayered `!important` declarations is unchanged in each.
- The live validation behaviour (`show()`, the alert role) has no test; the repo has no DOM test environment, so only the `describedByWith` helper is covered.

## For Codex

Nothing.

## Shell needs (`src/components/app-shell.tsx`, not my file)

- **Filled current icon on the rail:** line 482 needs `weight={active ? "fill" : "bold"}` on the sidebar `NavIcon`, as the phone tab bar does at line 587.
- **Rail tooltip:** `SidebarRailTooltip` still shows on hover and now repeats the visible label on tablets.
- **Offline look for `.nv-btn`:** `OFFLINE_ACTIONS` (line 147) does not list `button.nv-btn`, so I left it out of the offline disabled look; a non-submit nv-btn would look disabled but still work.

## Check in the browser

1. **Tablet rail at 768, 900 and 1023px, plus 844×390 touch, Owner and Employee.** Check the 80px column and that the page starts beside it; two-line labels ("Scheduling rules", "Help someone sign in"); badge position; focus ring; rail scroll when short; and the Help entry. It is the largest visual change.
2. **`.nv-btn` pages:** reports, time-off review, update detail, the older forms, passkeys, route errors. All 66 secondaries go from white with a ring to teal-50 with teal text, and heights go from 52px or 50px to 44/48px.
3. **Employee phone forms** (request time off, the creation callout, availability): buttons are full pills now.
4. **Payroll and Pay at 390 and 1440:** teal band and top bar, bell dot ringed in white.
5. **Darker amber and green** on the schedule conflict and open-shift blocks, the late and working avatar rings, the amber bar and the offline dot.
6. **Phone band segments:** unselected labels are full white (they were .86).
7. **Validation with a screen reader:** an error announced on blur, no double announcement on submit.
8. **Forced colours** (Windows High Contrast) on Home, Team search and the sidebar.

Two CSS notes for the merge. The rail's size rule reuses the existing six-id selector at `owner-b-desktop.css` ("The rail"), split by `[data-sidebar-tablet="rail"]`, because the rule it must beat has that ladder; no other new rule uses fake ids. The Employee overrides add a real class (`.nevora-portal`, `.employee-shell`) to out-rank component-level sheets that load after the layout's.

## Left behind, out of my file scope

- Row chevron still `#B5BBBF` in `src/components/employee-b/pay.css:18`, `src/components/employee-b/time.css:174` and `src/components/quiet/quiet.css:866`.
- `#E9A23B` in `src/components/reports-corp.css:88`.
- `src/components/employee-b/employee-b.css:18-22` still writes a teal ring and an ink ring for the bell dot; both are overridden from the foundation sheet and can be deleted.
- `src/components/employee-b/pay.css:1` still says "dark ink hero" in its comment.
- The opacity-based disabled rules SY-021 lists are in the Clocker and `employee-b/*` sheets.
- `.nv-btn` outside `.app-shell` (the global error screen) is unchanged.

## DESIGN.MD lines now out of date

- **4, 365:** "icon rail" on tablets is now the 80px labelled rail.
- **769:** inline validation now re-asserts `aria-describedby` each time and announces with `role="alert"` on blur and input.
- **1376, 1470, 1686:** the bell's coral dot is ringed in white.
- **1378, 1419, 1432, 1450, 1465:** dark ink hero, band and top bar on Payroll and Pay are gone; one teal band.
- **1382, 1740, 1756:** the amber and green rings and the amber dashed outline use `--b-amber-solid` `#B8760F` and `--b-green-solid` `#239A6D`.
- **1523–1530:** tablet rail "48px targets, labels as tooltips" is now 72px entries with visible labels in an 80px rail, 20px badges.
- **1679–1680:** add that `--b-on-band-2` resolves to white inside glass.
- **1681–1682:** `--b-field-edge` is `#838A8F` (3.5:1 on white, 3.2:1 on the canvas) and also colours the row chevron; grey-on-fill is applied by the fills themselves.
- **1689–1690:** pills now include `nv-btn` and every legacy button class.
- **1692–1693:** "48×48 rail with labels" for touch tablets: the 48×48 touch rail starts at 1024px; tablets have the labelled rail. Hit areas: the kit button's target is at least 44px at any drawn height.
- **1725, 1763:** the state card's empty kind is grey with a tray glyph.
- **1891:** menu items have 10px corners, not 8px.
- **1916–1917:** "the tablet rail's column is 48px" is now a 72px column in an 80px rail.
- **Token list (about 1674–1700):** add `--b-amber-solid`, `--b-green-solid`, `--b-radius-small`, `--b-dur-hover/exit/enter`, `--b-type-*`, `--b-space-*`, `--b-gutter`, `--b-inset`, `--b-inset-wide`.
