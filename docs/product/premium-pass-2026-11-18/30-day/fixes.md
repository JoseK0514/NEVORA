# F30: fixes for Review 30 (the 30-day phase screens and the kiosk), Nov 18, 2026

Builder F30. Worktree `U/wt/f30` (detached), base `259b210de` (the merged branch, the premium foundation, and the P2, P3, P4
and P6 packages). Captures ran from the committed tree in `U/wt/f30cap` (same commits) and, for "before", in `U/wt/f30base`
at `259b210de`. Patch: `U/p9/f30.patch` (`git diff 259b210de HEAD --binary`, harness excluded). Evidence:
`U/p9/f30-evidence/` (`before-…` from `259b210de`, `after-…` from the final commits). Nothing was pushed, no branch was
made or moved, nothing was committed in the main checkout. Fictional data only, on the harness's throwaway PostgreSQL.

P5's files were not touched (`legal.css`, `components/legal/*`, `app/support/*`, `auth-b.css`, `auth-validation.tsx`,
`app/login/page.tsx`).

Release sequence (unchanged): Codex integrates and verifies the combined backend and UI on Development; the exact verified
release is promoted to main only after Jose approves. Nothing here authorizes a main merge, a production activation, copied
production data, a paid activation or a live charge.

## Counts

| | Fixed | Partly | Not done | For Codex | For Jose | Not reproduced |
|---|---|---|---|---|---|---|
| 40 defects | 33 | 2 (D20, D30) | 0 | 2 (D15, D18) | 1 (D33) | 2 (D28, D40) |

D30 is also listed for Codex and D18 also for Jose. "Not reproduced" means measured at `259b210de` and already met: D28
(the field is 48px at 200% text) and D40 (the touch hit area spans 53px). The blocker (D01) is fixed.

## Defects

| # | Status | What was done | Evidence (`f30-evidence/`) |
|---|---|---|---|
| D01 | Fixed | From 768px Edit employee's head (and the Positions sheet's) is the band with Cancel and Save on the title's line: Save the band's white pill (#0B3B38 on white), Cancel white words in a pill drawn by a white edge, 48px each, axe clean. The kit's glass fill first used here measured 3.86:1 for 14.5px words on the band's lighter top (axe, `edit-saved`), so Cancel keeps the band behind its words (over 5:1) and takes the glass only on hover. Phones keep their header (white words, white pill). | before/after `edit-head-1440`, `touch-edit-head-844` |
| D02 | Fixed | Next and Add are separate buttons with their own keys (header and footer), so the press that opens step 2 never submits. Measured: focus on the step title, 0 fields `aria-invalid`, 0 errors after Next, at 1440 and on the touch phone. | before/after `add-step2-1440` |
| D03 | Fixed | A refused date is the field's own error in the one field-error look (16px WarningCircle, red, no closing period, `aria-invalid`, `aria-describedby`). The order rule is checked as the dates change, so Next (Add) or Save stops at the termination date. A server refusal is set on its field by name (`hireDate`, `terminationDate`, `birthDate`), Add employee returns to step 1 when the field is there, and focus lands on the field (measured `input#edit-birth`, `aria-invalid="true"`). The floor reads "Enter a date in 1900 or later". The server action is unchanged. | before/after `add-err-order-1440`, `add-err-future-390`, after `edit-err-future-1440`, `add-err-floor-1440` |
| D04 | Fixed | A confirmed save replaces the form with the kit's done state (green check, a title naming what is now true, one line, one tinted step) and focus moves to its title; the sheet's Save goes and Cancel reads Done. The account status form (Deactivate, Reactivate) keeps its sentence: its words were not in scope. | before/after `add-saved-1440`, `edit-saved-1440` |
| D05 | Fixed | The three dates are on step 1 "Their details", after Role and Location. | after `add-step1-1440` |
| D06 | Fixed | The calendar button sits 14px inside the date field's right edge, where a select keeps its chevron (Chromium). | after `add-err-future-390`, `edit-maria-1440` |
| D07 | Fixed | On phones the head's side columns keep their buttons' width and the step line wraps, centred and balanced, between them; nothing runs under Add at 320. | before/after `add-step2-320` |
| D08 | Fixed | A failed read is the kit's failed state: "Couldn’t load Christmas bonus hours", "Nothing was changed.", one filled Try again that reads the same year, under "‹ Insights" (a pushed page's state screen now keeps its non-Home back link from 768px). Other unavailable reasons keep their words, now with the back link. | before/after `bonus-readfail-1440` |
| D09 | Fixed | Without company-wide access the page is the designed closed state on all 30 pages that use `OperationalUnavailable`: the page's name on the band (" unavailable" dropped), the lock, "Company-wide access needed", the sentence (kept, with who can change it), Return to Home as the one tinted step and "Sign in again" as a link, and no back link (the page it would lead to needs the same access). Refresh current view is gone from this state only. A location-scoped view keeps its schedule as the step. | before/after `scoped-bonus-1440`, after `scoped-bonus-390` (a Manager limited to one location) |
| D10 | Fixed | The row is in a card titled "Yearly reports". | after `insights-1440` |
| D11 | Fixed | The year is a pill menu on the band ("Oct 2025 – Sep 2026 ▾"), as Insights keeps its period: a popover from 768px, a sheet on phones (under the title), five links to `?year=`, the current one marked. The year card and Show year are gone. | before/after `bonus-1440`, after `bonus-yearmenu-1440`, `bonus-yearmenu-390` |
| D12 | Fixed | The unfinalized-days note is the People card's first item: an amber wait callout, its first sentence as the title, Open Timecards as its action. Same words. | after `bonus-1440` |
| D13 | Fixed | Each fact is unbreakable ("ID OWN-CARL", "Hired May 6, 2019"); lines break only between facts. On phones a date range drops under its label when both don't fit; the counts are two by two, figures aligned; the first count starts on the card's text edge. | before/after `bonus-390`, `bonus-320` |
| D14 | Fixed | Reached is a green chip, Check breaks, Not confirmed and No hire date amber chips (the kit's `BChip`), Not reached the quiet `BStatusText`, with 8px between name and status; a long name sends the status under it. | after `bonus-1440` |
| D15 | For Codex | The rule that decides Not confirmed is the server's. Not confirmed stays amber and says what the data says. | |
| D16 | Fixed | At a glance counts Reached, Check breaks, Not confirmed and No hire date (the summary already carried them). | after `bonus-1440` |
| D17 | Fixed | The kit's empty state (tray glyph, grey) says "No hours recorded in NEVORA for this bonus year"; At a glance is hidden when no one is listed. Forced: hire dates cleared and year 2022, in the run's throwaway database. | before/after `bonus-empty-1440` |
| D18 | For Codex and Jose | Who is listed is the server's rule. Not changed. | |
| D19 | Fixed | The outside-Puerto-Rico notice uses the information glyph (still the grey closed card) and keeps Open Insights, with "‹ Insights" on the band from 768px. Forced: time zone set to New York for one load. | before/after `bonus-nonpr-1440` |
| D20 | Partly | The placeholder table entry now has the page's shape: the band action (the year pill), the note with two rows, four counts, five rows without avatars. Not seen in a browser: a client navigation from Insights keeps Insights on screen until the page arrives, as the review found. | after `bonus-loading-300ms-1440` (shows Insights) |
| D21 | Fixed | "Add hire date" (now "No hire date") opens Edit employee with `from=bonus&year=`: the hire date takes focus and is scrolled into view (measured `input#edit-hire`), Cancel goes back to the report, and the saved state's one step is "Back to Christmas bonus hours" (the same year). | after `bonus-addhire-landing-1440`, `bonus-addhire-saved-390` (Manager) |
| D22 | Fixed | Save shows only when the value differs from the saved one; saving the same value is no longer possible. | before/after `matching-1440` |
| D23 | Fixed | Results are kit callouts chosen by code: Saved is the green done note; a change made elsewhere (STALE) and an unconfirmed save are amber (Warning and Question glyphs), never red; a refused reload or Owner-only is red. The server's sentence is no longer drawn. When the button pressed has gone, focus moves to the result (no ring, read once); otherwise the result is a status or alert. | before/after `matching-saved-390`, `matching-stale-390` |
| D24 | Fixed | The field error is the forms' one look (16px WarningCircle, red, no period; `field-error` as Add employee draws it). | before/after `matching-invalid-1440` |
| D25 | Fixed | While a reload is needed Save is gone and Reload setting is the one filled button, focused after the conflict. | before/after `matching-stale-390` |
| D26 | Fixed | The field block, its help and the note stop at 560px; "0" is tied to "keeps" ("0 mantiene" in Spanish) and "Clock-ins" never breaks at its hyphen. | after `matching-invalid-1440`, `matching-saved-390` |
| D27 | Fixed | The read-failure card is at most 560px from 768px. Forced: the policy table renamed for one load. | before/after `matching-readfail-1440` |
| D28 | Not reproduced | At `259b210de` the minutes field is 48px at 200% text at 390 (the premium packages already size it); nothing to change. | `logs/f30b-owner-scan-log.json` (`text200` matching at 390) |
| D29 | Fixed | Who's working reads the attendance review once for the page (shared with the review panel): a clock-in from an earlier day says its day ("In since 11:26 PM yesterday", "In since Thu 10:58 AM"); a punch the review flags as open past 12 hours carries the red "No clock-out after 12 hours" chip on its row; the folded "Clock-ins to check" row shows the count to review and the chip. Forced: a fictional open punch 13 h 20 min old. | before/after `attendance-1440-forced`, after `attendance-folded-390-forced` |
| D30 | Partly, for Codex | Things to do builds its items in `components/manager-inbox-corp.tsx` (`groupThingsToDo`) from the Action Center read (`useActionCenter`). That read's ATTENDANCE item carries only "Name · N recorded observations." and the REVIEW priority, not the observation kinds, so the 12-hour flag can't be shown or counted there without guessing. Not faked. The flag is now visible and counted on Who's working instead (D29). | |
| D31 | Fixed | The figure says how long the punch has been open and since when ("Open 13 h 20 min, since 11:26 PM yesterday": the time past the limit plus the 12-hour limit, the limit's moment less 12 hours). The panel is one Direction B card: title with its count, one quiet summary line, the amber "not confirmed" note for limited comparisons, rows with avatar, name, place, kit chips and one grey fact, a footer with the update time and a quiet Refresh. No eyebrow, no bordered stat boxes. Same reads, states and words otherwise. | before/after `attendance-1440-forced` |
| D32 | Fixed | A line under a phone's band title (Who's working's date, the bonus year) is part of the band: the 12px gap is closed (measured gap 0 at 390 on both pages; it was 12px of canvas). | before `attendance-390-forced`, after `attendance-folded-390-forced` |
| D33 | For Jose | Privacy text is pending counsel. Not touched. | |
| D34 | Fixed | The clock's floor is 56px (not 3.5rem) and the day period is at most .4 of the figure: at 200% text "1:10 PM" fits its 297px band column (measured scroll width 297 of 297; it was 390 of 297). At the default size both resolve to what they were. | before/after `kiosk-text200-pin-1024x768` |
| D35 | Fixed | The compact layouts count height in lines of the reader's text (40em and 47.9375em are 640 and 767px at the default size, unchanged there), and a portrait tablet with large text (under 56em tall, 896px at the default size, so no portrait tablet at the default size) takes a compact band and card. At 200%: 1024x768 Continue at 530–597, 768x1024 at 828–894, no scrolling (they were 742–809 and 1125–1191). Digits stay inside their 56px keys. Keys and buttons keep 56px; the default size measures as before (PIN step keypad 236–576, Continue 592–648 at 1024x768). | before/after `kiosk-text200-pin-1024x768`, `-768x1024` |
| D36 | Fixed | Under forced colours the PIN's own input is `forced-color-adjust: none` with a transparent colour and caret: no bullets or caret beside the slots (measured colour and caret transparent). | before/after `kiosk-hc-pin-field-zoom` |
| D37 | Fixed | The root layout sets `<html lang>` from the sign-in language (the `nv-lang` cookie, else the browser's) when no session is presented; with a session it stays "en" (the signed-in app is English). The Clocker sets the document's language from the tablet's own choice. The 404's title is "Página no encontrada · NEVORA" in Spanish ("Page not found · NEVORA" in English). | `logs/f30b-public-scan-log.json`, `logs/f30a-public-scan-log.json` (`r30pub`: `docLang`, `title`) |
| D38 | Fixed | The hire date's line says "Christmas bonus hours use this date." only in a Puerto Rico workspace, otherwise "For your records." (Add and Edit employee read the workspace's time zone; a failed read keeps the bonus line). | after `add-step1-1440` |
| D39 | Fixed | The sheet's title starts at the frame's edge (296) and the outer white frame behind the card is gone, from 768px. | before/after `edit-maria-1440` |
| D40 | Not reproduced | On a coarse pointer the 32px band back links already carry a larger hit area (`owner-b-shell.css`). Measured at 844x390 on the touch phone at `259b210de`: every pixel row from the link's top to 52px below it lands on the link (53 rows), on Christmas bonus hours, Shift matching, a profile, Who's working and Add employee. The review's 32px is the drawn pill's box. A change tried here made the area exactly 44px, smaller, so it was reverted; nothing changed. | `logs/f30b-touch3-scan-log.json` (`probe`: `hitFrom`, `hitTo`) |

## Every changed word

Signed-in screens render English (DESIGN.MD); where a copy module keeps Spanish, the Spanish is given too.

**Add and Edit employee**
- Hire date line outside Puerto Rico: "For your records." (was "Christmas bonus hours use this date." everywhere; unchanged in Puerto Rico).
- Field errors, at the field and without a closing period: "The termination date can’t be before the hire date" (was the same sentence with a period, under the buttons), "Enter a date in 1900 or later" (was "Use 1900-01-01 or more"). The server's date refusals are its own words without the closing period ("A date of birth can’t be in the future").
- Add employee, done: title "{First Last} added"; line "Open their profile to review details and manage their account invitation." (the old message's second sentence); step "Open profile". Replaces "Employee created. Open their profile to review details and manage their account invitation." and "Open current employee profile".
- Edit employee, done: title "{First Last}’s details saved"; line "Their profile shows what was saved." (from Christmas bonus hours: "Christmas bonus hours show the saved details."); step "Open profile" (from the report: "Back to Christmas bonus hours"). Replaces "Employee details saved. Reload the employee to review current access before making another change." and "Reload current employee".
- The sheet's left action after a confirmed save: "Done" (was "Cancel").

**Closed pages (any page without company-wide access)**
- Band title: the page's name ("Christmas bonus hours", "Employee creation", "Employee profile"), without " unavailable".
- Card title: "Company-wide access needed" (new). Line: "This page needs current company-wide management access. An Owner can give it to you. If your access just changed, sign in again." (was "This page needs current company-wide management access. Return to Home, or sign in again if your access changed."). Actions: "Return to Home" (tinted), "Sign in again" (link); "Refresh current view" is not on this state any more.
- Location-scoped view: card title "Outside the locations you manage" (new); its line is unchanged; "Open your schedule" (tinted), "Return to Home" (link).

**Christmas bonus hours**
- Status "No hire date" (was "Add hire date"). At a glance: "Reached", "Check breaks", "Not confirmed", "No hire date" (was "People", "Reached", "Need a hire date").
- Year menu: the pill shows "Oct 2025 – Sep 2026" (the old select's words), the menu's title "Bonus year", its accessible name "Bonus year: Oct 2025 – Sep 2026". Removed: "Bonus year (Oct 1 to Sep 30)" and "Show year".
- The unfinalized-days note: its first sentence is now the note's title ("Hours count finalized timecards only"), the rest its body. Same words.
- Empty: "No hours recorded in NEVORA for this bonus year" (was "No one to show" and "No one other than Owners was employed or recorded time in this bonus year.").
- Failed read: "Couldn’t load Christmas bonus hours", "Nothing was changed.", "Try again" (was "Current information could not be confirmed. Reconnect and reload this page." with "Return to Home" and "Refresh current view").
- A "No hire date" row's accessible name: "{Name}, no hire date, {hours} recorded, employee ID {ID}. Open their profile to add it."
- The disclaimer and the footnote are unchanged (Jose's words).

**Insights**
- The yearly card's visible title "Yearly reports" (it was only the accessible name).

**Shift matching** (copy module; English and Spanish)
- "Enter a whole number of minutes from 0 to 30" / "Escriba un número entero de minutos de 0 a 30" (period dropped).
- New, chosen by the server's code in place of its sentence:
  - change made elsewhere: "Shift matching was changed somewhere else. Reload the setting to see the saved value before you try again." / "La asociación con turnos se cambió en otro lugar. Vuelva a cargar la configuración para ver el valor guardado antes de intentarlo de nuevo."
  - Owner only: "Only an Owner can change shift matching." / "Solo un dueño puede cambiar la asociación con turnos."
  - other refusals: "This change wasn’t saved. Reload the setting before you try again." / "Este cambio no se guardó. Vuelva a cargar la configuración antes de intentarlo de nuevo."
- Words unchanged otherwise; "0" is held to "keeps" ("mantiene") with a no-break space, and "Clock-ins" never breaks at its hyphen. The page renders English: `page.tsx` passes `clockerOwnerCopy.en` (as DESIGN.MD says for the signed-in app), so the Spanish strings, kept in step, are not seen.

**Who's working and the attendance review**
- A clock-in from an earlier day: "In since 11:26 PM yesterday", "In since Thu 10:58 AM", "In since Nov 12, 10:58 AM" (more than six days).
- The chip "No clock-out after 12 hours" on that person's row and on the folded "Clock-ins to check" row; with more than one: "{N} with no clock-out after 12 hours". The folded row's accessible name adds "{N} to review" and the flag count.
- The long-open flag's figure: "Open 13 h 20 min, since 11:26 PM yesterday" (was "1 h 20 min").
- The panel: the eyebrow "Today" and the line "Clock-ins and breaks that may need a look." are gone; the counts read "2 to review · 2 people affected · 4 corrections" (were three boxed figures); the footer reads "Updated 12:46 PM · Updates every 30s." (a separator added). Every state's words are unchanged.

**Signed out**
- The 404's document title: "Page not found · NEVORA" / "Página no encontrada · NEVORA" (was "NEVORA Workforce" in both).

## Files

New: `src/app/app/b-thirty-day.css` (the feature sheet, `@layer nv-b`, loaded after `b-review-details.css` in
`src/app/app/layout.tsx` and listed in the two B-sheet guards `b-foundation.test.ts`, `b-viewport.test.ts`),
`src/components/christmas-bonus-year-menu.tsx`.

Changed: `src/app/layout.tsx` (document language), `src/app/not-found.tsx` (title by language),
`src/app/app/employees/new/page.tsx`, `src/app/app/employees/[employeeId]/page.tsx` (bonus applicability, the return to the
report), `src/app/app/reports/christmas-bonus/page.tsx`, `src/components/christmas-bonus-report.tsx` and `.css`,
`src/components/company-access/employee-access-form.tsx`, `new-employee-form.tsx`, `operational-unavailable.tsx`,
`src/components/employee-core-profile-form.tsx`, `src/components/employment-date-fields.tsx`,
`src/components/form-validation.tsx` (a field's own floor words, `data-underflow`), `src/components/owner-only-notice.tsx`
(`info`, `back`), `src/components/reports.tsx` (the card title), `src/components/clocker-schedule-grace.tsx` and `.css`,
`src/components/clocker-owner-copy.ts`, `src/components/manager-attendance-review.tsx`, `src/components/whos-working-corp.tsx`
and `.css`, `src/components/owner-b/b-loading.tsx` (the placeholder's shape), `src/components/clocker.module.css`,
`src/components/clocker-language.tsx` (the document's language on the kiosk).

Tests updated or added: `christmas-bonus/page.test.tsx`, `operational-unavailable.test.tsx`, `employees/new/page.test.tsx`,
`employees/import/page.test.tsx`, `clocker-schedule-grace.test.tsx`, `manager-attendance-review.test.tsx` (open time and day),
`whos-working-corp.test.tsx` (the day, the chip, the count), and the closed-state titles in `timecards/page.test.tsx`,
`schedule/settings/page.test.tsx`, `schedule/new/scoped.test.tsx`, `schedule/templates/page.test.tsx`.

Not touched: any `*.server.ts`, `src/app/api/**`, domain logic, schema, migrations, `src/proxy.ts`, and P5's files. The server
actions, reads and access rules are unchanged; the edit page's and Add employee's extra `getWorkspace()` read (the time zone,
for D38) is the one Christmas bonus hours already makes, and a failure keeps today's words.

## Checks

- Type check through `heavy.sh` (`tsc --noEmit -p .`): clean in `src`; the only errors are the capture tool's in `zz-scan/`.
- `npx eslint` on every changed TypeScript file: clean.
- CSS parsed with lightningcss (the engine Next uses) for every changed sheet: clean. (A pseudo-element ordering error in an
  intermediate commit broke one capture run and was fixed; the captures above are from the fixed commits.)
- Targeted tests for touched files: pass. Full run `heavy.sh npx vitest run --dir src src/app src/components src/lib
  --testTimeout=30000`: 935 files passed, 14,422 tests passed, 741 skipped, 0 failed (`heavy.sh` exit 0). An earlier run found 6 closed-state title assertions in 4 files (Timecards, Scheduling rules, Shift creation, Schedule templates) still expecting "… unavailable"; they were updated for D09 and pass. The manuals guard is outside this set.
- `git apply --check -R U/p9/f30.patch` in the worktree: clean.
- Captures (`U/cap/…`, all exit 0, from the committed tree):
  - before at `259b210de`: `f30b-owner` (1440, 900, 390, 320; Add, Edit, bonus with its forced read failure, empty year and
    New York time zone, Shift matching with its conflict and forced read failure, attendance with a fictional 13 h 20 min
    open punch, 200% text), `f30b-manager` (same widths, plus a Manager limited to one location), `f30b-touch` (844x390 and
    390), `f30b-kiosk` (200% text and High Contrast), `f30b-public` (English and Spanish, 390 and 1440), `f30b-touch3`
    (back link hit areas).
  - after: `f30a-owner` (all of the above), `f30a-owner2` (Edit's band, the year menu, the bonus states, after the last
    fixes), `f30a-manager`, `f30a-touch`, `f30a-touch2`, `f30a-touch3`, `f30a-kiosk2`, `f30a-public`, and the full Clocker
    journey `f30a-clocker-en` (48 of 48 steps) and `f30a-clocker-es` (47 of 47).
- axe-core 4.13 (WCAG 2.0 to 2.2 A and AA plus best practice): the first after runs (`f30a-owner`, `f30a-manager`,
  `f30a-touch`) found one violation, on the same element in each: Edit employee's band Cancel (Done once saved) with the
  kit's glass fill, 3.86:1. It was changed (D01) and re-measured clean in `f30a-owner2` (Edit at 1440 and 390, the bonus
  page, its forced failure and outside-Puerto-Rico states: 10 runs, 0 violations) and `f30a-touch2` (844 and 390: 3 runs,
  0). Every other after run: 0 violations (the Clocker journeys 24 runs each).
- No horizontal overflow on any after capture and no page errors. The 1 or 2 console errors per signed-in run are a
  resource 404 that the base runs show too.
- Commits captured: `272dd9b4f` (`f30a-owner`, `-manager`, `-touch`), `75d1b0e67` (`f30a-owner2`, `-touch2`, `-touch3`,
  `-kiosk2`, `-public`, both Clocker journeys), `e0f70e98b` (`f30a-scoped`: the limited Manager's closed pages at 1440 and 390; the final `HEAD`). Between them the final
  commits add test updates, remove the D40 back-link rule again (so the back links behave as at the base, measured in
  `f30b-touch3`) and drop the back link from the closed state (D09).
- Measured in the browser: focus after Next (the step title), after a server refusal (the refused field, `aria-invalid`),
  after a save (the done title), on "No hire date" (the hire date field), after a Shift matching save from the button (the
  result), after a conflict (Reload setting), after a reload (the field); document language and title on 16 signed-out
  loads; the kiosk's clock, keypad and Continue at 200% text and the PIN input's colours in High Contrast; the back links'
  hit spans on the touch phone; the phone band's seam.

## Needed from another package

- None. P5 (signed-out pages) is not needed for D37: the document language is set in the root layout, and the Spanish
  signed-out pages already wrap their content in `<main lang="es">`.

## For Codex

1. **D15**: `bonusStatus` in `src/lib/reports/christmas-bonus.ts` gives Not confirmed to anyone with an unfinalized day, even
   when those days can't close the gap (Carlos Vega, 632 of 1,350 h, one day). Suggested: Not confirmed only when the
   unfinalized days could reach the threshold; otherwise Not reached, with the days in the detail line. The page shows
   whatever status the read gives.
2. **D18**: `christmas-bonus.server.ts` leaves out active non-Owners added to NEVORA after the bonus year without a hire
   date, so "No hire date" undercounts. Suggested: list every active non-Owner without a hire date as "No hire date" (Jose
   to confirm, below).
3. **D30**: the Action Center's ATTENDANCE item (`src/lib/action-center/project.ts:25`, `intelligence.ts:243`) carries only
   "Name · N recorded observations." and the REVIEW priority. For Things to do (`components/manager-inbox-corp.tsx`,
   `groupThingsToDo`) to list and count "No clock-out after 12 hours", the item needs the observation kinds (at least
   OPEN_PAST_LIMIT, with the clock-in time) and an urgency. Also: "1 recorded observations." needs its singular.
4. The engine's sentence "No clock-out recorded · open more than 12 hours." (middle dot, lower case after it) reaches the
   CSV and period notes; a full sentence would read better there ("No clock-out recorded. Open more than 12 hours.").
5. QA scripts that press the attendance panel's old classes: `scripts/phase-d-attendance-ui-qa.mjs` (`.attendance-review-
   refresh`, `-list`, `-empty`) and `scripts/phase-d-browser-qa.mjs` (`.attendance-review-summary`). The panel now uses
   `.c-arev__refresh`, `.c-arev__list`, `.c-arev__state`, `.c-arev__summary`; the root keeps `section.attendance-review`
   with `data-attendance-state`, and each row keeps `id="attendance-{entryId}"`.
6. Who's working now reads the attendance review once while the page is open (it read it only when "Clock-ins to check"
   was opened), every 30 seconds while visible, through the existing client controller and route. No new endpoint.
7. Pre-existing, seen while capturing: the access frame (`ScopedReadFrame`) clears its page when the window loses focus and
   re-checks on return, so a half-filled Add employee form is lost if the person tabs out of the window and back. That is
   the privacy design ("stepping away still clears"); worth a look for forms with a draft.

## For Jose

1. **D33**: the Privacy processor list is one long paragraph; the review suggests bullets with the provider in bold, same
   words. Left for counsel's review of the text.
2. **D18**: should Christmas bonus hours list everyone active without a hire date (a business that joins in October or
   November gets no prompt today)?
3. **Words to approve** (all listed above): the done states' titles and lines, "No hire date" in place of "Add hire date",
   "Company-wide access needed" and its sentence, "Outside the locations you manage", the bonus empty line, the Shift
   matching results chosen by code, the long-open figure "Open 13 h 20 min, since …".
4. Suggested, not made: Shift matching's "0 keeps strict matching." could read "At 0, a clock-in must be at or after the
   shift's start." (the review's wording).
5. From the review, still open: a Manager can change their own hire date (which sets their own bonus threshold).
6. A system observation, not changed: the band's glass pills (Insights' period, Schedule's location, Add shift's Cancel)
   carry 14.5 to 15.5px white words on a 12% white fill; on the band's lighter top that measured 3.86:1 here. Edit employee's
   Cancel avoids the fill; the others were not measured in this package.

## Not verified

- A screen reader, Safari, Firefox, a real phone or tablet, and a Windows High Contrast theme (forced colours were
  Chromium's emulation).
- D20's placeholder in a browser: a client navigation keeps Insights on screen until the page arrives (as the review found).
- The Shift matching "couldn't confirm that save", Owner-only and refused results: built from the code paths only, not
  forced in the browser (the conflict, the save, the reload and the field error were).
- The Manager's Who's working page (the Owner's was captured; the Manager run did not include it, as in the review).
- Things to do (D30): nothing changed there; the flag is not shown there.
- The account status form (Deactivate, Reactivate) keeps its old success sentence; its done state was not in scope.
- Spanish signed-in Shift matching: the page renders English by design; the Spanish strings were checked by the unit test only.
- Integration suites and the QA scripts were not run.
