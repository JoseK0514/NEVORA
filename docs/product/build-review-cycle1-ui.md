# Cycle 1 build review: visual (UI Designer)

- **Step:** 5, Review. Jose decides on the commit at Checkpoint 3.
- **Written:** 2026-10-17 by the UI Designer.
- **Code read:** worktree `.claude/worktrees/agent-af4063da4b128f176` (base `ce4fcb2`, run 1 plus run 2, uncommitted). I read it and edited nothing.
- **Specs:** `docs/product/specs/{phone-search,owner-setup-card,phone-polish,phone-foundations}/spec.md` (authoritative) and `visual.md`.
- **Evidence:** each folder's `build-run-1/` and `phone-foundations/build-run-2/`. All paths below are relative to `docs/product/specs/` unless they start with `src/`.

## Summary

The build matches the visual specs on colour, the status ladder, the 94% pass text, the J1 Schedule marks, the header at 320 with a logo, and the Ocean and yellow brands. On desktop, run 2 leaves Home, employee Home, Timecards and Inbox pixel-identical at 1440 and 1920; only Schedule moves, and only where J1 and the day picker said it would.

Two findings should block the commit until fixed or accepted by Jose:

1. **Payroll export rows reflow at 430 to 600px.** The new grid has no column cap, so an iPhone Pro Max (430) gets three columns where it had two. Nobody snapshotted that width.
2. **The 48px "lone primary" rule never applies.** A specificity tie-break hands every phone button 44px, including full-width primaries the spec puts at 48px. The build report tells Jose the opposite, and one open point rests on that claim.

Six should-fix items follow: setup card alignment on desktop, the finder's first-row highlight, the Clear focus ring, unequal button pairs on Reports, employee Timecards buttons at 48px, and screenshots that show the wrong element. None of them breaks a task or a contrast floor.

### How I checked

- **Unit conversion:** I normalised every `calc(n * var(--type-unit, 1px))` and every `rem` back to px across the whole CSS diff. 1,553 hunks come out identical to the lines they replace. The 41 hunks left hold the listed changes, and I read each one.
- **Before and after pairs:** pixel diffs (pixelmatch, threshold 0.1, then 0 for desktop) on all 37 run 2 pairs and all run 1 pairs.
- **Specificity:** I loaded the phone button rules (`src/app/app/portal-gusto.css:139-151`) into headless Chromium and read the computed `min-height`.
- **Grids:** I measured the payroll export grid in Chromium at 320, 390, 430, 540 and 600, at a 16px and a 32px root.
- **Screenshots:** I viewed the key after shots and zoomed crops of the header, setup card, finder, pass, picker and button rows.

## Phone search

**Verdict: pass with two should-fix items.**

What matches:

| Check | Evidence |
|---|---|
| Glyph white on the masthead, 22px, 44px target left of the bell | `phone-search/build-run-1/after-s1-closed-320-chromium.png`; `src/app/mobile-workforce.css:46` and `src/components/manager-home-mobile.css:36` join the bell's colour rule |
| Header at 320 with the Ocean logo and a bell count: one row, chip 66px, nothing clipped | `after-ocean-logo-bell-320-chromium.png` (wordmark ends at x 140, chip runs 150 to 216) |
| Focus ring on the header button: 2px white, inset | `after-focus-header-search-390.png` |
| Sheet: grey field, teal border and ring on focus, teal "Close", hairline under the search row, grey status line | `after-s1-results-390-chromium.png`, `after-s1-unavailable-390-chromium.png`; `portal-gusto.css:412-444` |
| Teal for actions only: Close, the highlighted row and the focus ring; status lines stay grey | same shots |
| Group labels 15px/600, sentence case; rows 48px and wrapping; no ellipsis | `after-s1-results-390-chromium.png` (the long name wraps, its detail drops under it) |
| More › Search row: icon, hairline, first item; "Close actions" keeps its pill | `after-s2-more-manager-390-chromium.png` |
| Landscape 844 by 390: icon button, pill and account menu gone | `after-s1-closed-844x390-chromium.png` |
| Desktop finder unchanged | `before-desktop-finder-typed-1440.png` against `after-desktop-finder-typed-1440.png`: the dialog matches pixel for pixel; the 38,995 changed pixels all sit in the Home page behind it (the setup card moved Tasks down) |

### S1. The first row's highlight swallows the group label (should-fix)

- **What you see:** the teal wash on the highlighted row also covers "People" or "Actions" above it, so the first row is 68px tall and reads as one two-line item. The label sits 2px above the row text. Mock-up frames D and E draw the label outside the row, with 14px above and 4px below (`phone-search/mockup.html:51`).
- **Evidence:** `after-s1-results-390-chromium.png`, `after-s1-unavailable-390-chromium.png`; the label is a child of the first `<li>` (`src/components/command-finder.tsx:139`), and the phone styles keep it there (`portal-gusto.css:445-453`).
- **Fix:** render the label as its own item before the option: `<li role="presentation" aria-hidden="true" className="command-finder-group">`. On phones give it `padding: 14px 8px 4px` and no `margin`. Desktop has the same label-inside-highlight look today (`before-desktop-finder-typed-1440.png`), so this also changes desktop. List it as an intended desktop change, or hold the fix for the desktop pass and accept the phone look for this commit.

### S2. The Clear button's focus ring merges with the field's ring (should-fix)

- **What you see:** with focus on Clear, the field keeps its teal `:focus-within` border, and Clear's 2px ring at a 2px offset lands on that same border. Only a thin white curve tells you Clear has focus.
- **Evidence:** zoomed crop of `after-focus-clear-390.png`; `portal-gusto.css:431` (`:focus-within`) and `:444` (Clear ring, offset 2px).
- **Fix:** at `:431`, change the selector to `.command-finder-field:has(input:focus)`. At `:444`, give Clear its own `outline-offset: -2px` so the ring sits inside its 44px target.

### S3. The Close focus screenshot shows no ring (evidence gap)

`after-focus-close-390.png` shows "Close" with no outline. The rule exists (`portal-gusto.css:444`), so I read the capture as script focus with no keyboard input. Re-capture after a real Tab press before sign-off.

## Owner setup card

**Verdict: pass with one should-fix item.**

What matches:

| Check | Evidence |
|---|---|
| Desktop card: canvas, 1px border, 12px radius, no shadow, 260px left block, steps after hairlines, 20px above the Today strip | `owner-setup-card/build-run-1/after-card-two-gaps-1440.png` (card ends at y 316, strip starts at 337) |
| Green bars: card and both This week bars compute to #1D6F42 | pixel sample in `after-manager-home-1440.png` at y 562 (was #077572 in `before-manager-home-1440.png`); `src/components/manager-home-gusto.css:396`; `--color-state-success` is defined once (`src/app/globals.css:25`) and no brand rule overrides it |
| Done step: green filled check, plain ink title, "Done" in green on the right, no strike-through | `after-owner-home-1440.png`, `after-ocean-brand-390.png` |
| Open step: grey circle, teal 600 link with the caret, grey reason | `after-card-two-gaps-320.png` |
| Phone: first white surface across the masthead edge, 15px grey heading, 20px/600 count, 17px links, tiles 12px below | `after-card-two-gaps-320.png`, `after-owner-home-390.png` |
| Ocean brand: links blue (#1D4ED8), bar and done mark stay green | `after-ocean-brand-390.png` |
| Tasks below: amber "Setup needed" stays on the deadline and availability items | `after-card-two-gaps-1440.png` |
| 200% root: "Done" drops under the name; count and bar stay together | `phone-foundations/build-run-2/root-200/root200-390-owner-_app.png` |

### C1. The heading sits 10px above the step titles on desktop (should-fix)

- **What you see:** "Finish setting up" and the step links don't share a top line. The link's 10px top padding (it pads to 44px) pushes every step title down, and the gap from link to reason grows by the same amount.
- **Evidence:** 2x crop of `after-card-two-gaps-1440.png` at x 276 to 1036, y 190 to 320; `manager-home-gusto.css:408-411` (`padding: 10px 0 2px; min-height: 44px`).
- **Fix:** inside `@media (min-width: 900px)` add `html body .app-shell.nevora-portal .manager-portal-home .owner-setup-summary { padding-top: 10px; }`. The heading then lines up with the step titles and the 20px marks (`margin-top: 12px`). The card keeps its height, because the steps column is taller than the summary.

### Gap

No screenshot covers the 761 to 899px stacked layout. Add one at 800px before sign-off.

## Phone polish

**Verdict: pass.**

| Check | Evidence |
|---|---|
| "Your shifts" eyebrow, "Scheduled now" first, one dashed tear with two notches, "Next shift" second, one zone line | `phone-polish/build-run-1/after-b1-current-and-next-390.png`, `after-b1-current-and-next-1440.png` |
| 94% white on the eyebrow, sentence, dates, position, zone and notice | `src/components/employee-home-reviewed.module.css:203` and `:206`; the build measured 5.23:1 (Chromium) and 5.16:1 (WebKit) at the lightest corner, 5.01:1 on the yellow stress brand |
| No green, no "Now" badge, no live dot on the current block | same shots |
| Times break after the dash at 320 | `phone-foundations/build-run-2/after/after-employee-home-320.png` |
| Yellow brand pass reads clearly | `after-b1-pass-yellow-brand-390.png` |
| Shortcut icons: dark teal disc, white glyph | `c1-shortcut-schedule-96.png`, `c1-shortcut-time-off-96.png` |
| Preview sidebar matches the live D3 sidebar | `after-preview-owner-1440.png` |

Notes, all "later":

- The location line stays 15px where spec §1 says 17px. The engineer kept the shipped size because AC-B1.4 allowed only the opacity change on the next-shift-only pass. I agree; fold 17px into a later pass card pass if anyone wants it.
- The preview's Today strip still draws four separate tiles with a coral outline, and the preview's Tasks row prints "Setup needed Scheduling" with no amber pill (`after-preview-owner-1440.png`). Spec §B3/B4 says the preview should match the live strip. The figures now agree; the look doesn't. Preview only.

## Phone foundations

**Verdict: two must-fix items and four should-fix items.**

What matches:

| Check | Evidence |
|---|---|
| Phone type in rem, desktop in px, zero change at a 16px root | my normalisation of the CSS diff (1,553 equivalent hunks); desktop pairs pixel-identical at threshold 0 (`after-owner-home-1440.png`, `-1920`, `after-employee-home-1440.png`, `-1920`, `after-owner-timecards-1440.png`, `-1920`, `after-owner-inbox-1440.png`) |
| Root untouched; `--type-unit` only in the phone chrome query | `portal-gusto.css:88-90` |
| Line-heights: px became rem; unitless and em left alone | normalisation above |
| Tab labels 12px at default, 13px cap | `portal-gusto.css:327`; crops of `after-employee-home-320.png` at y 776 |
| Phone buttons: 8px corners, 44px or taller, 17px/600 labels | `data/inventory-buttons-p1-after.json`: 260 non-exception buttons at 44px, none off 8px |
| Primary and secondary focus ring 2px teal, offset 2px; press scale only without reduced motion | `portal-gusto.css:150-153` |
| Timecards: "View period" and "Refresh" side by side at 390 and 320, one line each | `after/after-owner-timecards-390.png` |
| Day picker: track, white chosen segment with a 1px grey ring, ink 600 text, divider after "Full week", 4px ink today dot, no teal | `after/after-manager-schedule-1440.png` (crop y 540 to 940), `day-picker/picker-390-track.png`, `day-picker/picker-320-track.png`; `src/app/app/schedule/manager-schedule.css:186-209` |
| J1: grid disc gone, "Today" ink 600, column tint `color-mix` of inset and canvas, location switcher chosen in ink 600 | same 1440 crop; `manager-schedule.css:174`, `:221-222`, `:227` |
| Phone picker opens scrolled to the chosen day (before, Saturday sat off screen) | `before/before-manager-schedule-390.png` against `after/after-manager-schedule-390.png` |
| Desktop Schedule: only the picker and J1 marks change; content below drops 10px (track padding and border) | 1440 and 1920 pairs |

### F1. Payroll export employee rows reflow at 430 to 600px (must-fix)

- **What happens:** `grid-template-columns: 18px repeat(auto-fit, minmax(6rem, 1fr))` sits in a `max-width: 600px` block. The other new grids in this build cap themselves at two or three columns with `max(…rem, calc(50% - …))`. This one doesn't. In Chromium a row gets 2 columns at 320 and 390, 3 at 430 and 4 at 540; before the change it had 2 at every width. The `.hours:nth-last-child(2) { grid-column: 2 }` rule assumes two columns, so the figures land out of order. The snapshots covered 320, 375 and 390, so nobody saw it. 430px is the iPhone Pro Max and Plus width, and this is a payroll page.
- **Evidence:** `src/components/payroll-export.module.css:142`; my Chromium measurement of the same grid.
- **Fix:** `grid-template-columns: 18px repeat(auto-fit, minmax(max(6rem, calc((100% - 42px) / 2)), 1fr));` (42px is the 18px checkbox track plus two 12px gaps). Measured in Chromium: 2 columns at 320, 390, 430, 540 and 600 at a 16px root; 1 column at a 32px root up to 430.

### F2. The 48px rule for a lone primary never wins (must-fix: fix it or amend D5)

- **What happens:** the base rule at `portal-gusto.css:140-142` sets `min-height: 44px`; the lone-primary rule at `:144` sets 48px. Both start with the same prefix, and `:is()` takes the specificity of its heaviest argument. The base list contains `:is(button, a)[class*="payroll-export-module"][class*="__button"]` (0,2,1); the lone list peaks at `.button.primary` (0,2,0). The base rule wins for every button. Headless Chromium with those exact rules: a lone `.button.primary` computes to 44px.
- **What you see:** every full-width primary on a phone dropped from 48px to 44px: "Add location" (`after/after-owner-locations-390.png`, teal from y 247 to 290), "Add shift" at 320 (288px wide, 44px tall), "Save brand", "Add position", "Create update" and others in `data/inventory-buttons-p1-after.json`. Spec §1.3 and D5 say 48px for a full-width primary. The build report (§1.3 row and "Lone primary height") says the short "Add shift" is 48px; the inventory and the screenshot both show 44px. "Create link" is 48px because of an older employee rule, not this one.
- **Fix, option A (my recommendation):** delete the rule at `:144`, keep 44px for every phone button, and amend D5 to "44px; 48px only for named sticky confirms and sheet actions, by class". Every after screenshot already shows this, desktop D4 uses one size, and a CSS heuristic can't tell full-width from short.
- **Fix, option B:** keep the spec and raise the rule's weight: at `:144` change `.page-frame.page-frame` to `.page-frame.page-frame.page-frame`. Tested in Chromium: lone primary 48px, both buttons of a pair stay 44px. Short lone primaries ("Add shift" at 390) then become 48px as well.
- **Also:** correct the build report's open point before Jose rules on it.

### F3. Button pairs on Reports no longer line up with the date fields (should-fix)

- **What you see:** at 390 the two date fields split the row in equal halves, but "View period" (173px) and "Refresh" (139px) below them don't. The gutters sit 17px apart. Before, both rows used the same two-column grid.
- **Evidence:** `before/before-owner-reports-390.png` against `after/after-owner-reports-390.png` (crop y 300 to 1120); `src/components/reports.module.css:112-114`; the pair rule `flex: 1 1 max-content` at `portal-gusto.css:146`.
- **Fix:** give the Reports toolbar the grid Timecards already uses (`src/components/timecards.module.css:155`): `.toolbar { display: grid; grid-template-columns: repeat(auto-fit, minmax(max(7rem, calc(50% - 5px)), 1fr)); }` and drop the `.toolbar label { flex: … }` lines. Fields and buttons then share two columns at default size and stack at a large root. I tried `flex: 1 1 0` on the shared pair rule instead; it stops pairs from wrapping, so keep the shared rule as it is.

### F4. Employee Timecards buttons are 48px; manager Timecards buttons are 44px (should-fix)

- **Evidence:** `data/inventory-buttons-p1-after.json`: employee `/app/timecards` "View period" and "Refresh" at 48px (390 and 320); manager at 44px; `day-picker/timecards-employee-390.png` against `day-picker/timecards-manager-390.png`. Spec §1.4 gives both roles 44px, side by side.
- **Fix:** read the computed `min-height` source on `.employee-corporate-button--primary` at 390 and bring it to 44px, for example by adding `.employee-corporate-button--primary, .employee-corporate-button--secondary` to the pair rule's list at `portal-gusto.css:145`.

### F5. Pair gaps vary from page to page (should-fix, low)

Spec §1.3 sets a 12px gap. New employee uses 8px (`src/app/app/employees/new/new-employee.css:98`), Time off 10px (`src/app/app/requests/time-off.css:122`), Reports 8px (`reports.module.css:112`). Set all three to `gap: 12px`. Check the step B diff lists the change.

### F6. Several day-picker screenshots show the wrong element (evidence, should-fix)

`day-picker/picker-1440-track.png` shows "Build and publish"; `picker-390-today-chosen.png`, `picker-320-fullweek.png` and `picker-1440-fullweek.png` show the "Team schedule" heading and search field. The track crops at 320 and 390 and the full-page Schedule shots do show the picker, so I could review it. Re-capture the named states (Full week chosen, today chosen, forced colours at 390 and 1440) so the evidence folder says what its file names say.

### Later (foundations)

- **Text under the 15px phone floor stays, now in rem:** Reports `.link` and `.jump > a` 0.75rem, `.cellLabel` 0.6875rem, `.comparison td` 0.8125rem (`reports.module.css:115-130`); payroll export `.count` 0.625rem and `.selectionBar` 0.6875rem (`payroll-export.module.css:139-141`); the Schedule grid's "Today" 10px. All existed before; step A had to keep them. Of the 1,954 shared `--type-unit` declarations, about 1,480 are below 15px. Many lose to phone rules, but a floor sweep belongs in the next phone pass.
- **Timecards rows grow taller:** each row now stacks "Approve timecard" over "Finalize period" at full width (+201px at 390, `after/after-owner-timecards-390.png`). Per spec, and clearer than wrapped pills, but ten rows of two big buttons is heavy. A Timecards pass could keep one primary per row and move "Finalize period" to the row's menu.
- **Pre-existing, outside this build:** the landscape phone header has no wordmark (`phone-search/before-landscape-844x390.png`); the employee "To do" card has a double bottom edge at 1440 (`phone-polish/build-run-1/before-employee-home-1440.png`); the Locations filter's chosen chip is a solid ink fill (J2 territory).

## Brand stress cases

| Brand | Where | Result |
|---|---|---|
| Ocean (#1D4ED8) | header search and logo chip at 320 and 390; setup card at 390 | Pass: white glyph on #273B66, chip whole, card links blue, done states green (`phone-search/build-run-1/after-ocean-logo-bell-320-chromium.png`, `owner-setup-card/build-run-1/after-ocean-brand-390.png`) |
| Yellow stress (#EAB308, accent #886600) | employee pass at 390; full sweep | Pass: 94% text readable on the brown pass, 5.01:1 measured by the build (`phone-polish/build-run-1/after-b1-pass-yellow-brand-390.png`); sweep 156 ok |
| Yellow on the header search button | none | No screenshot; the build measured 10.21:1. Fine to accept on the measurement |

## Open points from the build reports

### 1. Header chip 10px from the wordmark instead of 18px

The spec's own 320 budget used 10px, so the build follows it. The cost shows at 375 and up: the chip stays 10px from the wordmark while 60px of empty space opens between chip and search, and the logo reads as part of a NEVORA lockup (`after-ocean-brand-390.png`). The wordmark is a constant and should keep its room.

**My view:** accept for this commit; follow with one line: `margin-left: 18px` on `.mobile-header .company-logo-chip` in the phone query (`portal-gusto.css:490`). The chip then measures 58px at 320 (above the 40px floor) and reaches its 88px cap from 350px up. Keep `flex-wrap: nowrap`; that, not the gap, fixed the wrap at 320.

### 2. Tab labels from 10px to 12px on employee Home, lead Home, the employee preview and owner `/app?view=*`

**My view:** accept. 12px is the U1 size every other screen shows, so these four screens were the odd ones out. At 320 "Schedule" and "Requests" keep about 8px between them (crops of `after-employee-home-320.png`), and the bar's height holds.

### 3. A primary with no button beside it keeps 48px

The premise is wrong (F2). In every after screenshot and in the inventory, "Add shift" measures 44px, and so do full-width primaries. **My view:** one phone button height, 44px, matching desktop D4. Use 48px only for named sticky confirms and sheet actions. Delete the dead rule (F2 option A).

### 4. Five button labels wrap at 320

**My view:** accept. Each sits in a full-width button, and `text-wrap: balance` gives two centred lines of similar length. Dropping to 16px would break the one label size. Two of the five ("Generate reviewed export", "Validate and import amounts") are payroll copy and stay exactly as approved. The UX writer can offer shorter phone labels for the other three ("Save normal availability", "Save company preferences", "Name your first template") in a later copy pass.

### 5. Button pairs that sat in half-width cells now wrap onto two rows

**My view:** accept; it fixes labels breaking inside half-width pills (`before/before-owner-employees-new-390.png` against `after/after-owner-employees-new-390.png`). Two follow-ups: equal columns where a pair sits under a two-column form (F3) and one 12px gap (F5). Stacked pairs keep DOM order, so New employee shows "Cancel" above "Create employee", while Timecards shows the primary first. Keep DOM order: focus order then matches what you see, and the primary ends up nearest the thumb. Don't reach for `wrap-reverse`; it would split focus order from visual order.

### 6. The `--type-unit` approach

**Visual consistency:** sound. My normalisation shows every converted value resolves to its old pixel at a 16px root, desktop stays px through the `1px` fallback, and selector weight doesn't change, so the cascade can't move. Pixel-identical desktop pairs back this up.

**Maintainability:** acceptable as a transitional house pattern, with guardrails:

- **Readability:** `calc(13 * var(--type-unit, 1px))` is longer than `13px`, inside `font:` shorthands too. Document the pattern in `DESIGN.MD` with one example, as the comment at `portal-gusto.css:83-87` already does.
- **Drift:** the diff encodes 44 distinct sizes, half-pixels among them (8.5, 9.5, 10.5, 11.5, 12.5, 13.5). The token freezes that drift without fixing it. Next step: map the common sizes (12, 13, 14, 15, 16, 17, 20, 24, 28) to named `--g-t-*` tokens page by page, so a declaration names a role instead of a number.
- **Guard:** add a lint check that rejects a bare px `font-size` or `line-height` in shared rules, so new code uses the token.
- **Reach:** the token lives on `.app-shell.nevora-portal`. Anything rendered outside it (a portal to `body`, the sign-in and Clocker shells) falls back to px on phones. No visible change at default size, but it won't grow with the reader's text size.

A cheaper alternative doesn't exist while desktop must stay px. Copying 1,954 rules into phone overrides would double the CSS and reopen the cascade fights U10 warned about.

## Severity list

| # | Initiative | Finding | Severity |
|---|---|---|---|
| F1 | Foundations | Payroll export rows reflow at 430 to 600px | Must-fix before commit |
| F2 | Foundations | 48px lone-primary rule never applies; report claims it does | Must-fix before commit (fix, or Jose amends D5) |
| C1 | Setup card | Heading 10px above step titles on desktop | Should-fix |
| S1 | Search | First-row highlight covers the group label | Should-fix (or hold for the desktop pass) |
| S2 | Search | Clear focus ring merges with the field ring | Should-fix |
| F3 | Foundations | Reports button pair misaligned with the fields | Should-fix |
| F4 | Foundations | Employee Timecards buttons 48px, manager 44px | Should-fix |
| F5 | Foundations | Pair gaps 8 and 10px instead of 12px | Should-fix (low) |
| S3, F6 | Search, Foundations | Focus and picker screenshots missing or mis-targeted; no 761 to 899px card shot | Should-fix (evidence) |
| L | Polish, Foundations | Preview strip look, sub-15px rem text, Timecards row density, pre-existing header and card issues | Later |
