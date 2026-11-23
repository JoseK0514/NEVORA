# Package X: F3 Import a staff list and I1-Ml Profile (report)

Branch `claude-codex-collab-nevora-settings-final`, after merging `origin/claude-codex-collab-nevora` at `ef0905bf`
(`96f42336`). Fictional data and a throwaway local database only. No kit or shell files changed.

## Commits
| Commit | What |
|---|---|
| `28674094` | F3: the closed page (Manager, location Manager) and the not-available page (Owner) go back to "‹ Team" (was "‹ Home"). `OwnerOnlyNotice`'s plain layout honours its existing `back` prop; callers without it are unchanged. |
| `5781ae07` | I1-Ml: the place is named by its short name ("Condado", was "Northside Bakery — Condado"), from the location list the page already reads (server read unchanged); an empty Phone or Email reads "Not added", the Owner's word (was "None"). |
| `dbb1c39c` | F3: a row that still needs a fix shows a 10-digit phone formatted (787-555-0144), like checked rows (display only); the sideways-scrolling example is a named region the keyboard can reach (axe scrollable-region-focusable). |
| `bed5d1ea` | F3: the review rows are stacked row cards at every width; in the ~500px sheet card at 1440 the six-column table broke names, phones and emails mid-word. |
| `6c180d5e` | F3 second pass (lead): step 2 says each fact once ("2 ready · 2 need a fix", then "Fix or remove them, then import."); Manager access in one sentence ("This applies only to Manager rows and doesn't include payroll access, which is set separately."); the Manager access choice is marked required, not red, before a choice (the Manager row's line says what is missing; Import waits); step 1's intro paragraph removed (it repeated the list field's help and the step names). Spanish follows. Whole `src/components` suite: 278 files, 3,224 tests pass. |
| `d12401f1` | F3, found in the live import: in a row's editor a field's red error ("First name is missing.") stayed after the fix was typed, until "Save and check again"; it now clears once the value changes (the check after Save still says whether it is right). Whole `src/components` suite: 282 files, 3,241 tests pass. |
| `0cf6a6b7` | I1 (Manager): "What you can approve" values break only between words ("Not granted" broke as "grante/d" at 200% text). |

Checks: `tsc --noEmit` clean; oxlint clean on the changed paths; tests pass in `src/app/app/employees/import`,
`src/components/roster-import` (two new tests) and `src/components/manager-profile` (updated and new assertions).

## F3 Import a staff list
- **Owner:** the page already uses the approved Team form frame (F2 Add person's `FormHead` and `c-teamform`: one band
  with the step dots, Cancel or Back on the band, one solid main action per step). The live import only runs where
  workspace routing is configured (isolated workspace mode with a control database); the capture build runs the single
  company mode, so the Owner sees "Staff list import isn't available for this workplace yet." To show the three steps,
  the real step components (`AddListStep`, `ReviewStep` with two rows to fix, `DoneStep`) were rendered with fictional
  rows and placed into the signed-in Owner page with the app's CSS. Every one of these captures is labelled "rendered from the component, not the live import" (sheet and `rows.json`):
  they show layout, words and states, not the live server answers. A live capture needs the step 4 isolated-workspace
  lifecycle test (`src/test/integration/step4-production-screens.ts` already screenshots the import).
- **Manager and location Manager:** the closed page ("Importing a staff list is for Owners", the Owner named once, Add
  one person), now back to Team.
- Words before/after: band back link "Home" → "Team". Row phone "7875550144" → "787-555-0144".

## I1-Ml Profile
Same card order and buttons as the approved I1-M (details card with Phone, Email, Time zone and Access; What you can
approve; the Owner line; Notifications; Privacy and terms). The place is named once, in Access, by its short name.
Words before/after: "Northside Bakery — Condado" → "Condado"; "None" → "Not added".

## Captures
`shots/package-x/`: `<screen>-<O|M|Ml>-<390|390t200|768|1440>.webp`, `index.html` (side by side) and `rows.json`.
Production build, viewport-height shots stitched. F3 at `bed5d1ea`, then F3 Owner steps 1 and 2 again at `6c180d5e` (390, 390 with 200% text, 1440; their earlier 768 shots were dropped as out of date); I1-O at `bed5d1ea`; I1-M and I1-Ml again at `0cf6a6b7` (after the word-break fix).
axe: 0 violations on every capture. No page overflow. The measurement flags left are by design: the review table's header
row is for screen readers only, the example table scrolls sideways, the phone-only band link is hidden from 768, and the
profile's hidden "·" separators.

## Impeccable audit
- Hierarchy: one band title; each step has one solid action; the closed page has one action.
- Spacing and layout: review rows are one stacked card per person at every width; nothing breaks mid-word.
- Accessibility: the example region is focusable with the kit's ring; no new aria-labels that differ from visible text.
- States: add, check with rows to fix, done (static); closed for Managers; not available for the Owner in this build.

## Left
Ledger row G-X1 (F3 live import) is **closed**: see "F3 live import" below.

- Live Owner import captures need the isolated-workspace fixture (see above).
- End sweep (proposed row): I1 detail values (555-0126, Not added, Puerto Rico, Condado) are fixed px and don't grow at
  200% text, while the labels do.

## F3 live import (gap closure, closes G-X1)
Run on the step 4 isolated-workspace lifecycle harness (`node scripts/onboarding-owned.mjs --suite step4-local
--production`), **production build** (`NEVORA_OWNED_ONBOARDING_PRODUCTION_BUILD=1`), a freshly provisioned fictional company
("Fictional step4-alpha", Owner OWNER-1, location "Main"), owned loopback Postgres and the owned TLS proxy. Chromium only:
the container has no WebKit, so for this run `step4-production-screens.ts` was swapped, in the capture worktree only and
never pushed, for a Chromium-only version that drives the whole import and captures each step. The harness's own checks
passed (`production-report.json`: complete, cleanup verified, no runtime errors or window exceptions).

Flow, with fictional rows (QA-CSV-1 to QA-CSV-4): 1 Add your list → 2 Check it with two rows to fix (no first name; a
3-digit phone) → fix row 4 in its editor → fix row 5 → all 4 ready → Import 4 people → "4 people added", checked in the
company database (QA-CSV-1, Employee, at Main). Captures `F3live-<step>-O-<390|390t200|1440>.webp`, axe 0 violations and
no page overflow on all 15.

Compared with the rendered captures Jose approved: the words, the order and the buttons match on every step. One
difference, fixed in `d12401f1`: the row editor kept a field's red error after the fix was typed. The phone tab bar was missing on these pages; see "Tab bar in a new company" below.

## Tab bar in a new company (follow-up): by design, no app change
Probed on the same production build and provisioned company (`098115ae`), at 390 in both the harness's desktop window and
a phone context (touch, mobile): for each page the probe read `.mobile-nav`'s computed display and every CSS rule that
sets it.
- Home (`/app`) and Team (`/app/employees`): the tab bar is there (display grid, 60px, at the bottom) in both contexts.
  Evidence: `shell-new-company-home-O-390.webp`, `shell-new-company-team-O-390.webp`.
- Import a staff list: the tab bar is hidden by the shell's sheet rule, `.app-shell[data-nv-quiet]:has(.q-page[data-q-sheet])
  .mobile-nav { display: none }` (quiet-shell.css). The page renders `<SheetMarker />` (team-forms.tsx: "Marks the page as
  a sheet, so the shell covers the tab bar"), as Add person (F2), a person's page, Paid time and the payroll run do: a
  sheet's way out is its Cancel or Back in the band. Evidence: `shell-new-company-import-O-390.webp`.
- So it is a property of the route, the same for any company, not of the provisioned company or the harness. A real new
  company has the tab bar on every page that isn't a sheet.
- Why the earlier F3 captures showed a tab bar: on the single-company capture build the Owner got the not-available page,
  which has no SheetMarker, and the rendered steps replaced the page element that held the marker. Those shots were the
  odd ones; the live import is right.
