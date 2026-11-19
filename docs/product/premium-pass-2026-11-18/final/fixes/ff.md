# FF: final verification F fixes for the 30-day phase screens (Nov 18, 2026)

Builder FF. Worktree `U/wt/ff` (detached), base `e12e74aca` (the combined tree). Captures ran from the committed tree in a
second capture worktree, `U/wt/ffcap`, checked out at the same detached commits (so editing could go on while a capture
ran). Patch: `U/p9/ff.patch` (`git diff e12e74aca HEAD --binary -- . ':!zz-scan' ':!vitest.zz-scan.config.mts'`).
Evidence: `U/p9/ff-evidence/` (`before-…` from the fin30 set at `3f802fcb7`, or from `U/cap/ff-t200base` at `e12e74aca`
where noted; `after-…` from `U/cap/ff-owner`, `ff-manager`, `ff-touch`). Nothing was pushed, no branch was made or moved,
nothing was committed in the main checkout. Fictional data only, on the harness's throwaway PostgreSQL.

Release sequence (unchanged): Codex integrates and verifies the combined backend and UI on Development; the exact verified
release is promoted to main only after Jose approves. Nothing here authorizes a main merge, a production activation,
copied production data, a paid activation or a live charge.

## Counts

| | Fixed | Partly | Not fixed, with reason | For Codex | For Jose |
|---|---|---|---|---|---|
| 10 visible | 8 (F02 to F09) | 1 (F10) | 1 (F01, the engine's classification) | F01 | |
| 22 polish | 12 | 5 (F12, F14, F23, F24, F26) | 5 (F15, F22, F27, F28, F32) | F26 (wording), F27, F28 | F12 (footer), F15, F22, F23 (one success look), F32 |

## Rows

Evidence names are files in `U/p9/ff-evidence/`; logs are `ff-evidence/logs/<run>-scan-log.json`.

| # | Status | What was done (or why not) | Evidence |
|---|---|---|---|
| F01 | Not fixed (Codex) | The 12-hour flag comes from the review's `OPEN_PAST_LIMIT` observation; the UI shows the chip wherever the review gives it (`openPastLimitEntries`). Valeria's punch from Thursday reaches the review only as `TIME_HISTORY_INCONSISTENT`, so no flag is faked here. What the screen needs is under "For Codex". The panel title "Today's clock-ins" is Jose's word to change (For Jose). | before/after `F02-F26-F29-attendance-1440` (Valeria still unflagged) |
| F02 | Fixed | "What we compare" is no longer a card of its own: it is a quiet disclosure row inside the review's one card, above the footer (hairline above, ink2 14.5/20 words, a 16px Phosphor caret at the row's end that turns when it opens, a hover tint, a visible focus ring, 48px tall). `details` and `summary` keep the native expanded state. What it explains opens under it in the card's meta type, at the card's text edge, the first paragraph capped at 65ch, each location as a section with a hairline. Same reads, same words. The loading rule that hides it while the first read is in flight follows it (`whos-working-corp.css`). Measured: `compare.inCard 1, expanded true` (Owner and touch runs). | after `F02-F26-F29-attendance-1440`, `F02-attendance-compare-open-1440`; before `F02-F26-F29-attendance-1440` |
| F03 | Fixed | On a short wide window (the phone held sideways) the year menu is anchored under its pill with CSS anchor positioning (`position-area: bottom span-left`, 8px gap, as Insights' period menu is placed) and scrolls in the room left; it never covers the pill. Elsewhere the menu keeps the shared placement (it was already under the pill). Browsers without anchor positioning keep the old placement. Measured at 844x390 on the touch phone: trigger 609,111 207x48, menu top 167 (8px under), height 211, content 240 (scrolls), `overlap: false`. | before/after `F03-yearmenu-844`; `logs/ff-touch-scan-log.json` (`bonusMenu`) |
| F04 | Fixed | From 768px the bonus band is a two-column grid: title and sub-line in the left column, the year pill in the right column across both lines (at the default size it sits where it did). A longer sub-line wraps in its column and never runs under the pill; the pill keeps 48px at the default size and grows with its words (min-height in place of a fixed 48px). Insights shares the band row rule but its title row is not in this package's files: see "Needed from another package". | before/after `F04-F10-text200-bonus-1440-fold` |
| F05 | Fixed | A Manager editing an Owner sees the sheet's one white card: the grey lock note first (title "Only an Owner can change another Owner", body "Positions and hours stay available here.", the same words split into title and body), then the Positions and Hours pickers, both at the 560 block, the card's own inset (18px phones, 22px from 768). | before/after `F05-edit-owner-by-manager-1440`, after `-390` |
| F06 | Fixed | The cause was not the timer: leaving a field by pressing Next showed its message on blur, which pushed Next down under the pointer, so the press never became a click and Next did nothing (focus stayed on Next). The shared validation now holds a message that would appear while a pointer is pressed until the press ends (its click has run), and Add employee's Next moves focus to the first field it stops at and brings it into view with its message. Measured: Owner 1440 `addOrder.active` and `addFloor.active` are the fields (`input#new-termination`, `input#new-birth`, `aria-invalid`), touch 844 the same; the before runs had `button.c-btn Next` for both at 1440 and for the floor at 844. | before/after `F06-add-floor-1440-fold`; `logs/ff-owner-scan-log.json`, `ff-touch-scan-log.json` |
| F07 | Fixed | A person's facts are the kit's facts line (`BSegs`), each fact still whole; no line starts or ends with the dot at 390 and 320 (Carlos Vega: "632 h of 1,350 h · Hired May 6, 2019" / "ID OWN-CARL · 1 day not finalized"). | before/after `F07-F16-bonus-390-manager` |
| F08 | Fixed | One field-error line for every signed-in form the shared listener in `form-validation.tsx` covers (Add and Edit employee, the Settings forms, Add shift and the rest inside the page frame) and Shift matching's own message (`FieldErrorLine`, the same line in React): the glyph in its own column and the words in theirs, so a second line starts under the words; the words at 500; glyph and gap in em, so they grow with the text; `text-wrap: pretty`. Written on the elements, so every era's paragraph rule (display, font, colour) still applies and cannot undo it. The signed-out pages' errors (`auth-validation.tsx`) are separate and unchanged. | before/after `F08-edit-err-order-390` |
| F09 | Fixed | The closed Shift matching page for a Manager limited to one location names itself on the band ("Shift matching"), and every closed page drawn by `OwnerOnlyNotice` without a page of its own to offer now has "Return to Home" as its one tinted step (it was a dead end on desktop, where the band draws no "‹ Home"). The Settings layout cannot see the address, so the name is read in the browser's router (as its sentence already is); only Shift matching is named, the rest of Settings keeps "Settings" (see "Needed from another package"). Measured: `scoped matching` h1 "Shift matching", the card's actions "Return to Home". | before/after `F09-scoped-matching-1440`, after `-390` |
| F10 | Partly | On the 30-day screens labels, values and titles scale together at 200% text: every px size there (band titles, back links, row values, stat labels and figures, fields, help, notes, footer buttons, chips, the phone year pill, the step line) is the same size in rem, and px line heights under rem type are rem, so nothing moves at the default size. The full sidebar's workspace name and entries keep their sizes at the default size and grow with the words (no overlap). The phone header keeps its side actions at their drawn size so a larger title keeps room, and wraps the title instead of cutting it. Measured with a new probe (each text element at 16px and 32px default size): before, each of the five screens at 1440 left 6 to 15 kinds of element unscaled (row values, stats, titles, fields, chips) and 1 to 3 kinds with lines tighter than their text, plus the sidebar's; after, none at 1440 or 390 apart from counts and avatars, a screen-reader-only title and the phone header's Cancel (kept on purpose). Partly because counts and avatars keep their drawn size (the kit's px count token), and at 390 with 200% text the step line can still break at its separator (360px and up) and Who's working rows are tight (three columns in 390px). | before/after `F04-F10-text200-bonus-1440-fold`, `F10-text200-matching-1440-fold`, `F10-text200-matching-390-fold` (before from the base probe run), `F10-sidebar-200`, after `F10-text200-attendance-390-fold`; `logs/ff-t200base-scan-log.json` and `ff-owner-scan-log.json` (`t200diff`) |
| F11 | Fixed | Shift matching's Save and Reload setting end at the field block's 560 edge from 768px (measured right edge 877 against the block's 879), and on phones the full-width button is the ladder's 52px. | before/after `F11-matching-stale-1440-fold` |
| F12 | Partly | Edit employee's Save appears once something differs from what the sheet opened with (band from 768px, phone header), and goes again if the edit is undone, as Shift matching's does. Not built: a 560 footer repeating Cancel and Save (two Saves on one screen; a decision for Jose). | after `F12-edit-maria-1440-fold` |
| F13 | Fixed | When focus moves to a refused field (server refusal or submit), the field is brought to the middle of the window if it or its message is outside it (`revealField`). Measured: `editFuture.active` `input#edit-birth` at y 479 of 900, message in view. | after `F13-edit-err-future-1440-fold` |
| F14 | Partly | The step line is three pieces (count, separator, name), each whole. Under 360px the name takes its own line and the dot is not drawn (screen readers still hear it). From 360px with larger text the line can still break at its separator (no CSS signal for "wrapped"). | before/after `F14-add-step1-320-fold` |
| F15 | Not fixed (Jose) | The band names the year twice (pill and sub-line); either fix changes Jose's words. Options under "For Jose". | |
| F16 | Fixed | At a glance: dividers stop 12px short of the figures' top and bottom and the card gains 4px under them; on phones the row line stops at the card's text edges and every stat that starts a row starts on the text edge (the lower-left one sat 2px out). | before/after `F16-F18-F19-bonus-1440-manager`, `F07-F16-bonus-390-manager` |
| F17 | Fixed | The shown year's check is Phosphor Check bold 16 in teal (the shared thin check is not drawn); in the phone sheet the years and the check sit 18px from the sheet's edges (measured text 18, check ending 18 from the right), the popover keeps its 16. | after `F17-yearmenu-390`; `logs/ff-owner-scan-log.json` (`bonusMenu390`) |
| F18 | Fixed | The disclaimer's first sentence is its note's title ("Informational only"; Jose's words unchanged, the body is the rest), as the amber note's is; the footnote under People keeps a 65ch measure. | before/after `F16-F18-F19-bonus-1440-manager` |
| F19 | Fixed | Hours read as Insights writes them: "750 h 30 min of 700 h", "Includes 79 h of breaks" (was "750 h 30"). | same pair; `christmas-bonus-report.test.tsx` |
| F20 | Fixed | An empty year shows the empty state alone: no "0" beside People and no footnote. | after `F20-bonus-empty-1440` |
| F21 | Fixed | On phones the line under the band's title (bonus year pill, Who's working's date) starts on the title's 16px edge (it sat at 20) and sits 4px under the title's line instead of 18. | before/after `F21-F25-attendance-320-fold`, `F07-F16-bonus-390-manager` |
| F22 | Not fixed (Jose) | State-screen gutters on phones: Phase 8 left this to Jose. | |
| F23 | Partly | Add and Edit employee's done card is 560 wide from 768px, like the failed and closed cards. Not changed: Shift matching's green callout against the done mark is a decision for one inline success look (For Jose). | after `F23-add-saved-1440` |
| F24 | Partly | "Sign in again" (and the quiet link on every closed card) starts on the text edge when it wraps under the pill, and keeps its 20px beside it; the sentence uses `text-wrap: pretty` (no "again." alone at 1440). Not changed: "company-" / "wide" still breaks at 390: a no-break hyphen changes the sentence that 30 tests in other packages match, so it is listed for Jose and Codex. | before/after `F24-scoped-bonus-390` |
| F25 | Fixed | On phones a status chip on a Clocked in row drops under the name and its sub-line; the time and place are the kit's facts line, so "In since" is never alone and no line starts with the dot. The Not clocked in and Missed rows use the same facts line; on phones a long waiting time wraps inside a third of the row instead of squeezing the name. | before/after `F21-F25-attendance-320-fold` |
| F26 | Partly | Summary line: "2 people affected · 4 time corrections waiting" (the title's count already says how many to review; the count no longer shows three times). Footer: "Updates every 30 seconds." Kept: the two "Updated" times (two different reads); the limited note's wording (needs Codex to confirm what an item is). | before/after `F02-F26-F29-attendance-1440` |
| F27 | Not fixed (Codex) | A row can open a timecard only when the review says which timecard holds the entry (an earlier week's punch is outside Timecards' default period). | |
| F28 | Not fixed (Codex) | Whether "Time record needs review" blocks approval or payroll is the engine's meaning; the chip stays red until Codex says. | |
| F29 | Fixed | The waiting time on Not clocked in is amber at every width (the desktop row value grey had won from 768px). | before/after `F02-F26-F29-attendance-1440` |
| F30 | Fixed | The phone header's Next, Add and Save are drawn 40px (they were 36) with a 44px hit area on a coarse pointer; Open Timecards takes a 44px hit area on a coarse pointer. The scan's `under44` still lists them by drawn size (65x40, 127x32). | `logs/ff-touch-scan-log.json` (`under44`) |
| F31 | Fixed | The browser's number spinner is not drawn in the minutes field (arrows and typing still change the value). | `logs/ff-owner-scan-log.json`; `r30-matching-invalid-1440-fold.png` in `U/cap/ff-owner` |
| F32 | Not fixed (Jose) | "Set" / "Not set": a summary needs the profile's figures on this page, or new words. | |

## Every changed word

Signed-in screens render English; no copy module with Spanish was changed (`clocker-owner-copy.ts` untouched).

- Christmas bonus hours: the disclaimer's title "Informational only" (was the body's first sentence "Informational only."; the
  rest of the body is unchanged). Hours "750 h 30 min of 700 h", "1,400 h 5 min recorded", "Includes 79 h 30 min of breaks"
  (was "750 h 30 …"). An empty year: no "0" count, no footnote.
- Attendance review: summary "N people affected · N time corrections waiting" (was "N to review · N people affected · N
  corrections"); while loading "– people affected · – time corrections waiting"; footer "… · Updates every 30 seconds." (was
  "30s.").
- Closed pages: "Return to Home" as the tinted step on a closed page with no other step (Settings for a Manager without
  Scheduling rules, Payroll for a Manager without Timecards). The closed Shift matching page's band title "Shift matching"
  (was "Settings").
- Edit employee, a Manager on an Owner: the note is a titled note, "Only an Owner can change another Owner" over "Positions
  and hours stay available here." (was one line with both sentences).
- Add employee under 360px: the step's name on its own line, the separator not drawn (still read).

## Files

Changed: `src/app/app/b-thirty-day.css`, `src/app/app/owner-b-shell.css` (sidebar line heights only),
`src/app/app/employees/[employeeId]/page.tsx`, `src/components/christmas-bonus-report.tsx`,
`christmas-bonus-year-menu.tsx`, `clocker-schedule-grace.tsx`, `company-access/new-employee-form.tsx`,
`configured-attendance-policies.tsx`, `employee-core-profile-form.tsx`, `form-validation.tsx`,
`manager-attendance-review.tsx`, `owner-only-notice.tsx`, `whos-working-corp.tsx` and `.css`.
New: `src/components/owner-only-title.tsx` (the closed Shift matching band title).
Tests: new `christmas-bonus-report.test.tsx`, `owner-only-title.test.tsx`; updated `christmas-bonus/page.test.tsx`,
`manager-attendance-review.test.tsx`, `owner-only-notice.test.tsx`, `whos-working-corp.test.tsx`.
Not touched: the kit (`b-kit.tsx`, `owner-b.css`), `action-menu*`, other Settings pages and `settings/layout.tsx`, the kiosk,
Employee and signed-out pages, any server, read, contract or calculation. `operational-unavailable.tsx` was edited and
reverted (see F24); its look changed through `b-thirty-day.css` only.

## Checks

- Type check through `heavy.sh` (`tsc --noEmit -p .`): no error in `src`; the only errors are the capture tool's in `zz-scan/`.
- `npx eslint` on every changed TypeScript file: clean. Every changed sheet parses with lightningcss.
- Targeted tests (17 files, the touched components and pages, the settings layout, the B sheet guards): 306 passed.
- Full run `heavy.sh npx vitest run --dir src src/app src/components src/lib --testTimeout=30000` at the final source: 938
  files and 14,451 tests passed, 741 skipped, 0 failed (`logs/vitest-full-final.log`). The first full run, before the band
  title was narrowed to Shift matching, failed one assertion in `settings/layout.test.tsx` (a closed Locations page keeps
  "Settings"); that is why only Shift matching is named (`logs/vitest-full-first.log`).
- `git apply --check -R U/p9/ff.patch` in the worktree: clean.
- Captures (`U/cap/…`, every run exit 0, from the committed tree, source check held):
  - `ff-owner` at `8bf1d33bc` (setup, add, edit, bonus, bonusx, matching, attendance, text200 with the new type probe on five
    pages at 1440 and 390, probes; 1440, 900, 390, 320): setup finished (263 entries, 10 timecards finalized; the first try
    deadlocked on an insert, so the harness copy now runs a deadlock victim again and the capture was rerun), 22 axe runs, 0
    violations, no overflow.
  - `ff-manager` at `4909ddc99` (setup, add, edit, bonus, matching, attendance, scoped): 10 axe runs, 0 violations. The
    company-wide Manager's Shift matching and Who's working timed out on navigation (as in the review's run).
  - `ff-touch` at `4909ddc99` (844 and 390 on the touch phone): 16 axe runs, 0 violations.
  - `ff-owner-who` at the final source (Who's working at 1440, 900, 390, 320, and at 200% text): 0 violations.
  - `ff-touchmenu` (three short runs on the year menu at 844 while checking the menu's bottom edge; the source ended as
    captured, see below). `ff-t200base` at `e12e74aca`: the type probe before any change.
  - The final source equals `4909ddc99` (later commits tried two CSS changes on the scrolled year menu and reverted them:
    what looked like the page's text inside the menu's last row is the page under the menu's bottom edge). The Owner run at
    `8bf1d33bc` differs from it only in Who's working's facts (recaptured in `ff-owner-who`) and the closed Settings title
    (captured in `ff-manager`).
- Console errors per run (404 resource, 503 reads in the dev runtime) are the kinds the before runs show.
- Looked at every after picture against its before region by region (band, cards, rows, footers, menus, sidebar).

## Needed from another package

- **Settings (`src/app/app/settings/layout.tsx`, `layout.test.tsx`)**: name every closed Settings page on its band, with the
  company's own word for Locations, then drop the list in `owner-only-title.tsx`:
  ```diff
  -      return <OwnerOnlyNotice state title="Settings" reason="Settings are for Owners"
  +      return <OwnerOnlyNotice state title={<ClosedSettingsTitle locations={brand ? wordPreset(brand.words).en.locations : undefined} />} reason="Settings are for Owners"
  ```
  with `ClosedSettingsTitle` returning `closedSettingsSubject(usePathname(), locations)` less its " is" or " are" (or
  "Settings"), `OwnerOnlyNotice`'s `title` typed `ReactNode`, and `layout.test.tsx:73` expecting "Locations" (or the company's
  word).
- **Shared menu placement (`src/components/action-menu-geometry.ts`)**: never over the trigger for every ActionMenu (Schedule's
  location, More, the account menu): keep the larger side and scroll there unless that side is under two rows.
  ```diff
  -  const available = naturalHeight > sideSpace ? bottomBound - topBound : sideSpace;
  +  const available = naturalHeight > sideSpace && sideSpace < 2 * 44 + 12 ? bottomBound - topBound : sideSpace;
  ```
- **Band title row (`owner-b-desktop.css`, `.c-title__row`)**: the F04 grid (title and sub-line in one column, actions in the
  other across both) belongs in the shared band rule; Insights' period pill shares the row and its sub-line will run under the
  pill at 200% text the same way.

## Needed from the kit

- `owner-b.css` `.b-chip`: `font-size: var(--b-fs-count)` (12px) and `line-height: 16px` with a fixed `height` keep chips
  at 12px at 200% text. Suggested: `font-size: .75rem; line-height: 1rem; height: auto; min-height: var(--b-chip-h)` with
  `--b-chip-h: 1.375rem` (done locally on the 30-day screens).
- `b-tokens.css`: `--b-ic-lead: 18px` and the band title (`owner-b-desktop.css` 32/38px), phone titles (28/34px), row
  values (14px), stat label and figure (13/18, 20/26px), `.c-in` (16px), help (13px) in px: one decision for signed-in type
  (all rem), so 200% text scales every page as these five now do.

## For Codex

1. **F01**: classify an open punch older than 12 hours as `OPEN_PAST_LIMIT` whatever day it began (Valeria Díaz, open since
   Nov 12, has only `TIME_HISTORY_INCONSISTENT`), with `evidence.expectedAt` (the 12-hour moment) and
   `differenceNanoseconds` (time past it), and include open entries from earlier days in the review the Who's working page
   reads. With that, the chip on Clocked in, the folded row's count and the panel's "Open N h N min, since Thu 10:58 AM"
   show without a UI change. The panel's title "Today's clock-ins" then needs Jose's word (For Jose).
2. **F28**: does `TIME_HISTORY_INCONSISTENT` block approval or payroll? If it only asks for a check, its tone is attention
   (amber); if it blocks, a field the UI can show ("Blocks approval").
3. **F27**: an observation needs the timecard that holds its entry (employee and period) for a row to open it.
4. **F26**: what a "recorded item" in `coverage.limitations` is (clock-ins, breaks or both), so the limited note can say it
   plainly.
5. In the harness the company-wide Manager's `/app/settings/clocker/matching` and `/app?view=attendance` never reach `load`
   in 20s (the limited Manager's pages load); worth a look in case a request hangs for that role.
6. D30 (Things to do cannot show the 12-hour flag) is unchanged.

## For Jose

1. Words to approve (listed above): "Informational only" as the disclaimer's title; hours as "750 h 30 min"; "N people
   affected · N time corrections waiting"; "Updates every 30 seconds."; "Return to Home" on closed pages without a step;
   "Shift matching" on its closed band; the lock note's title and body.
2. F15: the band says the year twice. Either the sub-line "Payment window Nov 15 – Dec 15, 2026 · All locations", or the
   pill "2026 bonus year" with the dates kept in the sub-line (as Insights: the pill names the period, the sub-line dates it).
3. F01: once Codex flags multi-day punches, "Today's clock-ins" could read "Clock-ins to check".
4. F26: "6 recorded items could not be fully compared with saved schedule or break context." could read "6 clock-ins
   couldn't be compared with the schedule or breaks" (after Codex confirms what an item is).
5. F32: "Set" / "Not set" on Hours and rules: a summary ("40 h a week") or "Custom" and "Default".
6. F12: repeat Cancel and Save in a 560 footer on Edit employee, as Add employee does (two Saves on one screen)?
7. F22 (state-page gutters on phones) and F23 (one inline success for settings saves: Shift matching's green note or the
   done mark) remain yours.
8. "company-wide" breaks at its hyphen at 390; a no-break hyphen changes the sentence 30 tests match. The policy row
   that says a comparison is unverifiable joins its two parts with an em dash (copy rule); a colon would do.

## Not verified

- A screen reader, Safari, Firefox, a real phone or tablet, High Contrast, hover and press.
- The press-and-blur fix on a real touch screen (the harness clicks with a mouse; on touch the field's blur comes after the
  pointer is released, which the fix also covers by waiting for the click).
- The year menu's anchored placement outside Chromium (Safari 26 and Firefox 147 support anchor positioning; older browsers
  keep the shared placement, which covers the pill on a sideways phone).
- The company-wide Manager's Shift matching closed page and Who's working (navigation timeout in the harness).
- 200% text with browser zoom (the probe sets Chrome's default font size), and full-page shots at 390 with 200% text (the
  full-page capture drops the font setting; the `-fold` shots are the evidence).
- Integration suites and QA scripts.

