# Settings Positions and Breaks (J8, J9) — report

Branch `claude-codex-collab-nevora-settings-positions`, built on `claude-codex-collab-nevora-settings-base` (`cbc3d4bc`).
Owner only (both pages call `requireRoles(["OWNER"])`; unchanged).

## Commits
- `f82ec102` Settings J8 Positions and J9 Breaks on Direction B
- `9e595732` Settings J8/J9: dialog sizing, focus return, aligned notes and rows
- `5dd48e01` Settings J8: revision test follows the editor into its dialog
- The shots commit (this report, `shots/settings-positions/`)

Files: `src/app/app/settings/positions/{page.tsx,position-catalog.tsx,page.test.tsx}`,
`src/app/app/settings/breaks/{page.tsx,page.test.tsx}`, `src/components/clocker-break-types.tsx` (the Breaks editor, used
only by J9), `src/app/app/settings/catalog-revisions.test.tsx`, and two additive rules in `settings-b.css`.

## Shared parts: what I changed (additive only)
`settings-b.css`, one new block at the end:
1. From 768px a card note (`.c-setb-cardnote`) uses the wide inset (22px) like the rows. Before, its text sat 4px left of
   the rows' text edge on tablet and desktop. This also applies to any other Settings page that uses a card note.
2. A row inside a Settings dialog (`.c-setb-dlg .c-rows > li > .c-row`) has no side padding, so it starts on the
   dialog's 20px text edge like the fields. Before, the "Active" switch sat 18px (phone) or 22px (desktop) further right.

No changes to `settings-b.tsx` or `settings-b-form.tsx`. I didn't use `SettingsFormB` in the dialogs because its footer
is the kit's `CorpFormFooter`, which the kit hides on phones; the dialogs use the shared `c-setb-dlg__acts` row instead.

Note for other Settings pages: a `<dialog>` that is a direct child of `.c-page` picks up the page's card rules
(`owner-b-desktop.css` `.c-page:not(.c-settings) > * + *` and the frame width), which stretched it to the full window at
1440. Both editors hold their dialog in a `<div style="display: contents">`, so the cards stay direct children of the
page and the dialog isn't one.

## J8 Positions (`/app/settings/positions`)
What changed: the older `wave-c` frame (`SettingsFrame`, `q-list`, `<details>` rows that opened an inline form) is now
`SettingsPageB` with the kit's cards and rows. An **Active N** card lists each position (name, how many active people
hold it, chevron) and ends with the **Add position** row (plus in the tinted circle); an **Archived N** card follows when
there are any. A row opens one dialog (a sheet on phones, a 480px card from 768px) with Name and the Active switch.
Same actions, fields and checks: `createPositionAction` / `updatePositionAction` with `id`, `expectedUpdatedAt`, `name`
(required, 80 characters) and `active`; Add stays disabled until the page is interactive.

Words, before → after
- "Archived (1)" (card head) → "Archived 1" (kit count).
- Active card had no head → "Active 4".
- Removed the grey foot line "Choose a position to rename or archive it. Past shifts keep their position." It explained
  how the screen works, and its second half repeats the Active switch's line.
- Row screen-reader name "Edit Baker, archived" → the row's visible text ("Baker 11 people"); the card says Archived.
- Edit form → dialog titled "Edit position"; "New position" kept for Add. Buttons kept: "Save position", "Add position",
  "Cancel". "Adding…", "Saving…", "Enter a position name", "Archived positions can’t be newly assigned. They stay on past
  shifts and timecards.", "No positions yet", "Shifts can still be added without a position.", "Couldn’t load
  positions.", "Nothing was changed.", "Try again", the noscript line: unchanged.
- Error title on a failed save: "Not saved" (as before).

Buttons: dialog primary is the solid teal `c-btn`, Cancel the white `c-btn--secondary`, both 44px. Phones: stacked full
width (Save over Cancel). 768 and up: right-aligned in one row, same height. Empty state: one secondary "Add position".

Edges (production build, `getBoundingClientRect`):
| Width | Card head | Row text | Add row text | Values right | Chevron right | Overflow |
|---|---|---|---|---|---|---|
| 390 | 33 | 33 | 81 (after the 36px circle at 33) | 329 | 357 | 0 |
| 768 | 131 | 131 | 179 | 689 | 717 | 0 |
| 1440 | 319 | 319 | 367 | 1057 | 1085 | 0 |
| 390, 200% text | 33 | 33 | 81 | 329 | 357 | 0 |
Dialog: title, fields, switch row and buttons all start at 20 (phone) and 500 (desktop, dialog 480 wide, centred).

## J9 Breaks (`/app/settings/breaks`, page title "Break types")
What changed: the older `wave-c` frame and the `clocker-owner.module.css` dressing are gone; `SettingsPageB` with an
**Active N** card (a row per break: name, reference time on the second line, its classification as the grey value,
chevron; then the **Add break type** row; then the card note) and an **Archived N** card when there are any. A row opens
one dialog for Edit; Archive and Reactivate are in it as before. `saveBreakTypeAction` gets exactly the same six fields
(`id`, `expectedVersion`, `name`, `category`, `targetMinutes`, `active`); the module gate, the role check and the
session proof are unchanged.

Approved wording: every break sentence is word for word ("It’s offered for new breaks as soon as you create it.",
"Changes apply to future breaks only.", "It won’t be offered for new breaks.", "It will be offered for new breaks
again.", "1 to 1,440 minutes. Leave blank for no reference time. It never stops a break on its own.", "Breaks already in
progress can still end. Recorded settings stay unchanged.", "Earlier records stay unchanged.", "Changes apply to new
breaks only.", every toast, field error and server error, "Not saved" / "Not saved yet", "Reload").

Words, before → after
- Card head "Break types 3" → "Active 3" (the page title already says Break types).
- "Archived" + count pill → "Archived 1" (kit count).
- The classification chip (grey `BChip`) → the row's grey value text ("Meal"), the kit's rule for a non-exception.
- Row screen-reader name "Edit Meal break" → the row's visible text.
- No break types at all: the empty row inside the card → the kit's empty card with the same two lines ("No break types
  yet", "Add the breaks your team takes, like a 30-minute meal.") and one secondary "Add break type". "Changes apply to
  new breaks only." shows with the Active card only (nothing to change when there are none).
- Failed read: same title and line, now the kit's one failure card; "Try again" is the white secondary button.
- Close button keeps its name "Close break editor".

Buttons: Save or Create is the solid teal `c-btn`; Archive is `c-btn--danger` (red outline; the confirm's Archive is
the same style), Cancel is white secondary; all 44px. Phones: stacked full width (main, Cancel, Archive). 768 and up: one
row, Archive on the left, Cancel and the main action on the right.

Edges (production build):
| Width | Card head | Row text | Add row text | Values right | Chevron right | Card note text | Overflow |
|---|---|---|---|---|---|---|---|
| 390 | 33 | 33 | 81 | 329 | 357 | 33 | 0 |
| 768 | 131 | 131 | 179 | 689 | 717 | 131 | 0 |
| 1440 | 319 | 319 | 367 | 1057 | 1085 | 319 | 0 |
| 390, 200% text | 33 | 33 | 81 | 329 | 357 | 33 | 0 |

## Checks run
- `npx --no-install tsc --noEmit -p .` clean; `oxlint` clean on the changed files.
- `node scripts/run-rstest.mjs src/app/app/settings src/components/owner-b/b-loading-motion.test.tsx`: all pass. Tests
  updated for the new markup (Active/Archived heads, no row aria-labels, Add disabled before hydration, failure words,
  the editor's exact `expectedUpdatedAt` now asserted on the dialog).
- Browser (Chromium, fictional workspace, throwaway Postgres; development build while iterating, then one production
  build under `flock /tmp/nevora-heavy.lock`), reduced motion on: lists at 390, 768, 1440 and 390 with 200% text; edit
  dialogs at 390, 1440 and 390 with 200% text; validation errors (empty name at 390; Add with an empty form at 1440;
  "0" minutes for J9); add, rename, archive (J8, production); create and archive (J9, development); Escape and Cancel
  with the discard guard; Tab walk; axe-core 4 (wcag2a/2aa/21aa/22aa + best-practice) on every list and dialog state:
  **0 violations**; horizontal overflow 0 everywhere.
- Focus: Add's validation moves focus to the Name field; after a save or Escape, focus returns to the row (or Add) that
  opened the dialog; every Tab stop shows the 2px ring.
- Production over plain http refuses break-type saves with "Clocker setup is not configured for this environment."
  (the existing `clockerOriginFailure` check). That capture is the server-error state
  (`j9-owner-server-error-1440.webp`); the Archived card and the archive dialog for J9 come from the development run
  (`*-dev-1440.webp`).

## Impeccable audit

```
Impeccable audit: J8 Positions, J9 Break types (Owner; 390, 768, 1440, 390 at 200% text; list, dialog, validation
error, server error, archived)
Checked: production build in Chromium with fictional data; edges measured with getBoundingClientRect; axe-core; Tab walk.

Blocking
None left on these pages.

Should fix
1. [Accessibility] Kit text in fixed px does not grow with 200% text: the phone band title (28px), the row value
   ("11 people", "Meal", 15px), field labels (13px), the dialog fields' text and the button labels (15px). Nothing
   overlaps or clips. Fix in the kit (corp.css / Direction B layers): rem roles. Read-only for me; ledger row below.
2. [Accessibility] The band's "‹ Settings" back link is 96×32 at 768 and 1440 (44px on phones). Kit/app shell
   (CorpNav/CorpTitle wide). Ledger row below.

Polish
3. [Hierarchy] Rows without icons and the Add row with its 36px plus circle start at different x (33 vs 81 on phones).
   This is the kit's add-row pattern; the plus circle sits on the rows' text edge.

Spacing: all gaps on the scale; cards 20px apart; card heads, rows and notes share one edge at every width (tables above).
States: Empty ✓ (unit-tested markup; not captured live) · Loading ✓ (unchanged RouteSkeleton) · Error ✓ (validation
and server error captured; failed read unit-tested) · Success ✓ (toast, focus back on the row) · Edge ✓ (all archived,
zero people, 200% text)
Not checked: 320px (asked widths were 390, 768, 1440); WebKit; a long position name at 320; Spanish (these Owner pages
have no Spanish strings).
```

## Blocking items left
None on J8 or J9.

## End-sweep items (proposed ledger rows)
| Row | Where | Issue | Owner | Kind | Status |
|---|---|---|---|---|---|
| new | Kit (corp.css, Direction B layers) | Fixed px text that stays put at 200%: phone band title 28px, `.c-row__value` 15px, `.c-field__label` 13px, field text and `.c-btn` 15px; seen on J8/J9, no overlap | Kit owner | Text size | end sweep |
| new | Kit / app shell | Band back link "‹ Settings" is 96×32 at 768 and 1440 | Kit owner | Target size | end sweep |
| new | Kit (corp.css) | The switch control inside a switch row measures 51×31 on its own; the whole row (≥ 60px) is the target, so it passes, but axe-style target scans flag it | Kit owner | Target size (scan noise) | end sweep |
| new | Settings shared | A `<dialog>` that is a direct child of `.c-page` gets the page's card rules; consider moving dialog hosting into `SettingsPageB` or a `c-setb-dlghost` class | Settings base owner | Layout | proposed |

Fixed on my pages now: row screen-reader names now match visible text (both pages); focus rings on every stop; every
target in the page body is 44px or more; axe 0; card note and dialog rows aligned.

## Captures (`shots/settings-positions/`, webp q80, production unless marked dev)
J8: `j8-owner-390`, `-768`, `-1440`, `-390-200text`, `j8-owner-edit-390`, `-edit-1440`, `-edit-390-200text`,
`j8-owner-error-390`, `j8-owner-add-error-1440`, `j8-owner-focus-1440`.
J9: `j9-owner-390`, `-768`, `-1440`, `-390-200text`, `j9-owner-edit-390`, `-edit-390-200text`, `j9-owner-error-390`,
`j9-owner-add-error-1440`, `j9-owner-server-error-1440`, `j9-owner-archived-dev-1440`, `j9-owner-archive-dialog-dev-1440`.
