# Phase 2, package A: the Owner and Manager desktop and tablet frame

Patch: `a.patch` (1 file, `src/app/app/owner-b-desktop.css`, 96 lines added, none removed; diff of `c545bea5` to worktree HEAD, no `zz-scan`).
Shots: `a-shots/` (10 pictures). All captures: `scratchpad/p2a-shots/` (`base`, `base2`, `xb` are before; `f1` to `p1` are after).
No markup, no TypeScript and no wording changed. Every rule is inside `@media (min-width: 768px)` (one block is `(min-width: 1024px)`,
with one `(max-width: 1279px)` inside it), inside `@layer nv-b`, scoped to `.app-shell[data-nv-b]:not([data-employee-mobile])`.

## What changed

Numbers are window pixels at 1440 wide, before to after (one number means no change). Title top, band end and the gap under
the band are the same at 1100, 1024, 900 and 768 (checked row by row, see "Checks run").

| Route | Title top | Band ends | Card under band | Content right | Band action right | Widest field |
|---|---|---|---|---|---|---|
| / (Home) | 109 | 383 | -52 | 1376 | 1376 |  |
| /inbox | 88 | 295 to 296 | -52 | 1376 | 1375 |  |
| /schedule | 88 | 295 to 296 | -52 | 1376 | 1376 |  |
| /schedule/new | 91 to 88 | 160 to 196 | 24 | 1108 |  | 766 to 560 |
| /schedule/templates | 130 | 196 | 24 | 1108 |  | 722 to 560 |
| /schedule/settings | 130 | 196 to 224 | 97 to 24 | 1108 |  | 770 to 560 |
| /schedule/publish | 91 to 88 | 160 to 196 | 24 | 1108 | 1108 |  |
| /timecards | 88 | 295 to 296 | -52 | 1376 | 660 |  |
| /timecards/corrections | 130 | 221 to 224 | 60 | 1108 |  |  |
| /payroll | 88 | 322 to 314 | -52 | 1108 | 1091 |  |
| /payroll/prepare | 130 | 196 | 24 | 1108 |  |  |
| /payroll/history | 130 | 196 | 24 | 1108 |  |  |
| /payroll-export | 88 | 222 to 296 | 24 | 1108 | 635 | 766 to 732 |
| /reports | 88 | 198 to 196 | 24 | 1376 | 1376 |  |
| /employees | 88 | 297 to 296 | -52 | 1108 to 1376 | 1108 to 1376 | 454 |
| /employees/new | 128 to 130 | 216 to 224 | 24 | 1108 | 360 to 367 | 766 to 560 |
| /employees/{actor} | 130 | 221 to 224 | 24 | 1108 | 1108 |  |
| /employees/import | 130 | 196 | 24 | 1108 to 856 |  |  |
| /notifications | 130 | 296 | 24 | 1108 | 515 |  |
| /updates | 130 | 296 | -12 to 24 | 1108 | 1108 |  |
| /updates/compose | 91 to 88 | 160 to 196 | 24 | 1108 | 1108 | 810 |
| /settings | 88 | 154 to 196 | 24 | 1376 |  |  |
| /settings/payroll | 88 | 247 to 296 | 24 | 1108 | 635 | 766 to 560 |
| /settings/features | 130 | 196 | 24 | 1108 |  |  |
| /settings/locations | 130 | 196 | 24 | 1108 |  |  |
| /settings/workspace | 130 | 196 | 24 | 1108 |  | 768 to 560 |
| /settings/positions | 130 | 196 | 24 | 1108 |  | 694 to 516 |
| /more | 130 | 196 | 24 | 1108 |  |  |
| /help | 130 | 196 | 24 | 1108 |  |  |
| /my-pay | 130 | 196 | 24 | 1108 |  |  |
| /profile | 133 to 88 | 219 to 196 | 24 | 1108 | 1108 |  |
| /billing | 88 | 154 to 196 | 24 | 1108 to 856 |  |  |
| /restricted | 130 | 196 | 24 | 1108 to 856 |  |  |
| /requests | 130 | 264 to 296 | 24 | 1108 | 599 |  |
| /exchange | 130 | 264 to 296 | 24 | 1108 | 587 |  |
| /availability | 130 | 289 to 296 | 24 | 1108 | 504 |  |
| /account-recovery | 130 | 221 to 224 | 24 | 1108 |  | 768 to 560 |
| /nope | 88 | 154 to 196 | 24 | 1108 to 856 |  |  |

"Band action right" is the probe's rightmost link or button on the band. Where it is not the content edge it is not an action:
it is the right end of a strip of tabs (Timecards 660, Time exports and Payroll settings 635, Notifications 515, Requests 599,
Shift requests 587, Availability 504), the back link (Add employee 367), or Payroll's Prepare button inside the first card (1091).
Every real band action ends on its page's content edge: 1376 on Schedule, Insights and Team; 1108 on a person, Updates,
New update, Build and publish and Profile.

By page:

- **Team** (`/app/employees`). At 1024 and wider the page is Home's grid (2fr, 1fr, 20px gap, up to 1080px): People (and Inactive, and
  the no-match card) in the main column, the Team tools card (Hours this week, Availability, Import a staff list, Help someone
  sign in, Inactive people) in the rail. Content right edge 1108 to 1376, Add employee 1108 to 1376, People card 812 to 707 wide,
  rail 353 wide (1440); 600 and 300 at 1280; 587 and 293 at 1100; 536 and 268 at 1024. Band 297 to 296. In the rail a row's detail
  wraps to a second line (it was cut with an ellipsis). Between 1024 and 1279 the four People filters use 12px item padding
  (16px before) so the last one stays inside the 536px column. 768 to 1023: one column, as before. Tab order checked in the
  browser: Add employee, search, See all, the four filters, the people rows, then the rail rows.
- **Payroll** (`/app/payroll`). Band 322 to 314. It stays one 812px column: on desktop the page has no secondary card (Time exports
  is a row of Recent payrolls), so there is nothing to put in a rail. See "off the ladder".
- **Time exports, Payroll settings.** Band 222 and 247 to 296. The three Payroll tabs now sit at the same height on all three
  pages (y 194; they were at 194, 146 and 171), so they do not move when you switch tab.
- **Schedule, Timecards, Things to do.** Band 295 to 296.
- **Settings, Page not found.** Band 154 to 196.
- **Insights.** Band 198 to 196.
- **Add shift, Build and publish, New update, New location.** Title top 91 to 88, band 160 to 196. The band pills (Cancel, Next)
  stay centred on the title line.
- **Add employee.** The back link is the band's 32px back row at y 88 (it was a 44px link at y 80), title 128 to 130, band 216 to 224.
- **Time corrections, a person, Help someone sign in.** Band 221 to 224.
- **Scheduling rules.** Its intro line was white text on the grey canvas (unreadable). It is now the band's sub-line. Band 196 to 224,
  first card 97 to 24 under the band.
- **Updates.** The list started 12px over the band's edge. It now starts 24px under it.
- **Time off requests, Shift requests, Availability.** Band 264, 264 and 289 to 296. The tabs sit at y 220, as on Notifications
  and Updates.
- **Hours this week** (`/app?view=team`, not in the route list). Band 264 to 296, first card 20 to 24 under it.
- **Profile.** On tablets and desktop its back link is hidden (an existing rule), so it is a page with no back link: the name
  starts at 88 (was 133), Edit is centred on the name's line, band 219 to 196. Owner and Manager.
- **State cards** at most 560px: Page not found, `/app/restricted`, the Manager's Payroll and Settings notices, Import a staff
  list "not available" (812 to 560; 560 at every width from 768).
- **Forms, 560px field block** (left-aligned in the 812px card; two-up fields 272 + 16 + 272 where the form has them):
  Add shift (766 to 560, footer and its divider end on the field block), Add employee (766 to 560, same footer), Week templates
  (722 to 560, the label lines up with the card title, Save template moves to the field block's right edge), Scheduling rules'
  open sections (770 to 560), Time exports' Week field (766 to 560) and Other dates, Payroll settings' row forms and its
  save block (812 to 560), Company profile (768 to 560), New location and a location (560), Positions' inline editor (694 to 516
  inside a 560 block), New update's Title and Message (768 to 560), Help someone sign in (768 to 560). Field heights and
  labels are unchanged. No button changed fill.

## Rules behind it

- Frame rule 1 (title position): Add shift, Build and publish, New update, New location, Add employee, Profile.
- Frame rule 2 (band height): every band change above. Each title block gets `min-height: calc(band token - title-top token - its tail)`,
  reading `--b-band-short`, `--b-band-sub`, `--b-band-strip`, `--b-title-top`, `--b-title-top-back`. The band is still painted by the
  title block's `border-image`. Where a page was above its step (Team, Insights, Payroll) the tail is shortened instead.
- Frame rule 3 (card to band): unchanged per page (52px lift on Schedule, Timecards, Payroll, Team, Things to do; 24px elsewhere).
  Fixed to that rule: Scheduling rules, Updates, Hours this week. Team's search keeps 26px of clear band, Payroll's tabs 24px.
- Frame rule 4 (content width): Team's grid, the 560px field block, the 560px state cards (`--b-frame-wide`, `--b-frame-form`).
- Frame rule 5 (one right edge): Team's Add employee follows the grid edge.
- B8 layering: all rules in `@layer nv-b`; media queries only 768, 1024 and 1279. No colour literal added.

## Checks run

- `npx vitest run src/app/app/b-viewport.test.ts src/app/b-tokens.test.ts src/app/app/b-foundation.test.ts`: 3 files, 77 tests passed.
- `npx vitest run --dir src src/app src/components`: 300 files, 3107 tests passed (after the last change).
- `git apply --check -R a.patch` on HEAD: clean.
- Browser captures (real app, fictional data), `cap.sh` with my worktree:
  - Owner, all 38 routes, 1440, 1100, 1024, 900, 768 and 390 (run `f1`). Title top, band end and gap are identical across the five
    wide widths on every route. `overflow` is 0 on all 228 rows.
  - Owner re-captures after later edits: Home, Things to do, Schedule, Profile, Scheduling rules, Time exports, Team, Add employee
    at 1440, 1024, 768, 390 (`g1`); Team and two Team states (`?all=1`, a search with no match) at 1440, 1280, 1100, 1024, 900
    (`h1`, `h2`); Profile at 1440 and 900 (`p1`). Overflow 0.
  - Manager: Home, Things to do, Payroll, Settings, Timecards, Team, More, Help, Profile at 1440 and 900 (`f2`), Team and Settings
    at 1440, 1024, 900 (`h3`), Profile and Payroll at 1440 (`g2`). Payroll and Settings notices: title 130, band 196, card 560.
    Team: band 296, grid edge 1376. Profile 88 and 196.
  - Extra routes at 1440 and 900 with the first row opened (`f3`): Positions, Scheduling rules, Payroll settings, Time exports,
    New location, a location, Break types, Clocker tablets, Branding, Company policies, Schedule coverage and edit, Clocker PIN,
    Hours this week, Review payroll. All on the ladder (196, 224 or 296), gap 24 or -52.
  - Keyboard (`k1`, 1440): 24 Tab presses on Team, Add employee, Profile and New update. Order as listed above. Focus ring is
    2px white on the band and 2px teal in cards on every stop I restyled (the Add employee back link, Edit, Cancel and Next).
- **390**: I compared the full-page PNGs in `p2before/owner` with mine using the pixel tool (`pixdiff.mjs`): all 38 pages have the
  same height. 35 came from run `f1`. Home, Things to do and Schedule were caught on their loading skeleton in `f1` (the machine
  was busy, the first three routes), so I captured those three again (`g1`): same height, first-screen pixel difference 0%, 0.48%
  and 0.29% (live minutes and counts). The other first screens differ by 0 to 0.8% (Insights 0.8%, the rest 0.12% or less).
  The CSS added after `f1` is all inside `min-width: 768px`.
- Console: the two 403 lines are in the before log too. One 503 line appeared in `f1` and `f3` during sign-in under load and not in
  the other eight runs. No `pageerror`.
- Not run: `tsc` and `eslint` (no ts or tsx file changed). Reduced motion beyond the capture tool's default (it runs with
  reduced motion on; I added no motion). Widths between the listed ones.

## Pages off the ladder or left alone, and why

- **Payroll, 314 (was 322).** A title, two locked sub-lines (86px), then the tabs. With the 52px card lift and 24px of clear band
  under the tabs, 314 is the lowest it goes. 296 needs one sub-line less, or no lift.
- **Home, 383.** Kept, as the rules say.
- **Time corrections, "60".** The band is 224 and the content starts 24px under it, but the first thing is the heading
  "Correction requests 4" on the canvas (36px), then the first white card. The heading belongs to the corrections list
  (another package), and an earlier round placed its count beside it on purpose. I left it.
- **Payroll stays 812 wide** (no secondary card on desktop; nothing invented).
- **Time exports' File format section** keeps its own two-column grid (fields 350 and 718 wide inside a closed row). It is a
  large provider-mapping form with its own module styles; I did not narrow it.
- **Positions' Save position and Cancel** stay full-width bars inside the 560 block (their right edge is the field block's).
  Turning them into right-aligned pills means changing that component's button layout.
- **Time exports' Create export** stays at the card's right edge: it is the card's action, not part of the Week field block.
- **Scheduling rules, open sections.** The fields now stop at 560, but the open section itself looks unfinished (list bullets,
  "hrs" under the field, a bare search icon). It looks the same at `c545bea5` (`p2a-shots/xb`). Not part of the frame.
- **Company policies** has one 651px field. Not in my list; left.
- Pages I did not capture: an update's detail, payroll people and fix, employee edit, staff import steps, Clocker photos and PINs.
  The general rules (no back link 196; back link and sub-line 224) apply to them by selector, unverified.

## Wording changed

None.

## For Jose to decide

1. Payroll at 314, or drop one of its two sub-lines on desktop to reach 296.
2. Time exports and Payroll settings: I kept the three tabs at one height (y 194) across the Payroll family. The cost is a
   68px gap between "Time exports" and the tabs. The other option is tabs 20px under each title (they would jump between pages).
3. Time corrections: keep the "Correction requests 4" heading on the canvas, or fold the count into the band's sub-line.
4. Team at 1024 to 1279: the rail is 268 to 300px and its details wrap to two lines. If that reads tight, the rail could start
   at 1280 instead (the frame rule says 1024).

## Needed from another package

- `DESIGN.MD`: nothing written by me (out of my scope). The frame section could note: Payroll 314; the Payroll tabs at one height;
  Profile is a no-back page on wide screens.
- Loading skeletons (`loading.tsx`, not mine): Schedule's skeleton band ends at 295, one pixel off the page's 296.
- Corrections list owner: see "For Jose" item 3.
- Scheduling rules' open sections need a styling pass (see above).

## For Codex

Nothing. No server read, handler, contract, route or calculation changed.

Release sequence (standing policy): development is the working and acceptance release; this patch is local and uncommitted
(temporary detached commits only, base `c545bea5`); nothing was pushed, merged or deployed. Fictional local data only.

## Follow-up (Nov 15, 2026): Payroll on the ladder

Jose chose to drop the "Weekly · business name" line on desktop Payroll. The line is wrapped in `c-pay__cadence` (`src/components/payroll/payroll-runs.tsx`) and hidden from 768px; phones keep it. Payroll, Time exports and Payroll settings now end the band at 296 with the tabs at 171 to 215 (they were pinned at 194). Payroll's first card starts at 244 (29px clear under the tabs). Measured at 1440, 900 and 768; the three pages keep their heights at 390. The statements above about Payroll at 314 and the 68px gap describe the state before this follow-up.
