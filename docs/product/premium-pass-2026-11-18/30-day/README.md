# 30-day phase screens: UI review and fixes (Nov 18, 2026)

The 30-day phase (merged into `claude-codex-collab-nevora` from origin on Nov 18) added employment dates on Add and Edit
employee, Christmas bonus hours, early clock-in grace (Shift matching), the "No clock-out after 12 hours" flag and a
Privacy page layout. The other session asked for UI QA to the same standard as the rest of the app.

- [review.md](review.md): an independent review of every new screen for every role, at 1440, 900, 390, 320, a touch phone
  held sideways and the Clocker, with 200% text and High Contrast. 40 defects (one blocker). Pictures in
  `evidence/review/`.
- [fixes.md](fixes.md): the fix report, one row per defect, every changed word, files and checks. Pictures in
  `evidence/fixes/` (forced states are marked `-forced`).

## Outcome

| | Fixed | Partly | For Codex | For Jose | Already met |
|---|---|---|---|---|---|
| 40 defects | 33 | 2 (D20, D30) | 2 (D15, D18) | 1 (D33) | 2 (D28, D40) |

The ones you would notice first:
- **Edit employee (the blocker).** From 768px the head is the band with Save as the white pill and Cancel beside it; the
  teal-on-teal buttons are gone and axe is clean.
- **Add employee.** Next never submits; the three dates sit on step 1; a refused date is that field's own error; a saved
  person gets the kit's done state; the hire date's line names Christmas bonus hours only in Puerto Rico workspaces.
- **Christmas bonus hours.** The year is a pill menu on the band; statuses use the chip and quiet-text system ("No hire
  date" in place of "Add hire date"); the four counts that ask for a decision are shown; the unfinalized-days warning is
  an amber note inside the People card; Insights' row sits in a card titled "Yearly reports"; empty, failed and outside
  Puerto Rico are the kit's states. No money appears anywhere.
- **Closed pages.** Every page that needs company-wide access shows the designed closed state (30 pages).
- **Shift matching.** Save shows only after a change; results are kit notes chosen by the server's code (Saved green, a
  change made elsewhere or an unconfirmed save amber, never red); in a conflict Reload setting is the one filled button.
- **The 12-hour flag.** Who's working shows the day for an earlier clock-in and the red "No clock-out after 12 hours" chip;
  the figure is the time open ("Open 13 h 20 min, since 11:26 PM yesterday"); the review panel is one Direction B card.
  Nothing closes a punch.
- **The Clocker.** At 200% text the clock fits its band and Continue fits the screen on both tablet sizes; the PIN field
  draws no stray bullets in High Contrast; the default size measures exactly as before.
- **Spanish signed-out pages** carry `<html lang="es">`; the 404's title is "Página no encontrada · NEVORA".

## Second round (final verification F and FF)

After the premium pass was combined, a fresh reviewer looked at these screens again
([review F](../final/reviews/review-f.md): 0 blockers, 10 visible, 22 polish; 25 of the 30 fixes it could check from
pictures held). Builder FF closed it ([ff.md](../final/fixes/ff.md), pictures in `../final/evidence/ff/`): 20 fixed,
6 partly, 6 left for Codex or Jose. The ones you would notice:
- "What we compare" is a quiet row inside the review's card that opens in place.
- On a phone held sideways the bonus year menu opens under its pill instead of covering it.
- At 200% text the bonus band's sub-line wraps in its own column, and the five screens' type grows with the text (rem).
- A Manager editing an Owner sees one card: the lock note, then Positions and Hours.
- Add employee's Next works when a field's error appears as you leave it (the error used to push Next away from the
  pointer); Next moves focus to the first field it stops at.
- One field-error line on every signed-in form: the glyph in its own column, the words at 500.
- The limited Manager's closed Shift matching page names itself, and every closed page has a way on ("Return to Home").
- Hours read "750 h 30 min"; an empty year shows the empty state alone.

## For Codex

1. D15: Christmas bonus "Not confirmed" should apply only when the unfinalized days could still reach the threshold
   (`src/lib/reports/christmas-bonus.ts`).
2. D18: the bonus report leaves out active non-Owners added after the bonus year who have no hire date.
3. D30: Things to do cannot show the 12-hour flag until the Action Center's attendance item carries the observation kinds
   and an urgency; "1 recorded observations." needs its singular.
4. The engine's sentence "No clock-out recorded · open more than 12 hours." has a stray middle dot.
5. QA scripts `phase-d-attendance-ui-qa.mjs` and `phase-d-browser-qa.mjs` press the attendance panel's old classes; the
   new ones are in [fixes.md](fixes.md).
6. Who's working now reads the attendance review while the page is open, every 30 seconds while visible, through the
   existing route.
7. Seen while capturing (pre-existing): the access frame clears an unsaved Add employee form when the window loses focus.
8. From the second round ([ff.md](../final/fixes/ff.md)): flag an open punch older than 12 hours whatever day it began
   (F01, today a punch from an earlier day gets only `TIME_HISTORY_INCONSISTENT`); say whether "Time record needs
   review" blocks approval or payroll (F28); give each observation the timecard that holds it (F27); say what a
   "recorded item" is in the limited note (F26).

## For Jose

1. D33: the Privacy processor list as bullets waits for counsel.
2. D18: should the bonus report list everyone active without a hire date?
3. New words to approve (listed in [fixes.md](fixes.md)): the done states, "No hire date", "Company-wide access needed"
   and its sentence, "Outside the locations you manage", the empty-year line, the Shift matching results, "Open 13 h 20
   min, since …".
4. Suggested, not made: "0 keeps strict matching." could read "At 0, a clock-in must be at or after the shift's start."
5. Still open from the review: a Manager can change their own hire date, which sets their own bonus threshold.

## Release sequence

Unchanged. Codex integrates and verifies with the backend on Development; the exact verified release is promoted to main
only after Jose approves.
