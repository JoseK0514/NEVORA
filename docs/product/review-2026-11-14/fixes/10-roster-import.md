## WP10: Owner roster import screen

The screen is built and its tests pass, but it has not been opened in a browser. Nothing is committed or deployed; base is ce4de4bc, worktree only.

**Patch:** `/private/tmp/claude-501/-Users-josek0514--claude-spares-spare-23XJTe/d762c6df-53eb-43b4-836f-475a53cde009/scratchpad/patches/wp10.patch`
`git diff HEAD --stat`: 17 files changed, 2718 insertions(+), all new, all inside `src/app/app/employees/import/**` and `src/components/roster-import/**`. No existing file was touched.

Two things to know first:
- **On a single-company deployment the page shows "Staff list import isn't available for this workplace yet."** Both roster routes start with `readWorkspaceRoutingConfig()`, which throws unless `NEVORA_WORKSPACE_MODE=isolated` and its config is valid; the page asks the same question before drawing the form.
- **The wizard's state lives in an in-memory store, not in the component.** `ScopedReadFrame` unmounts its page whenever the window loses focus, so a component-held list, review and pending import command would be lost when the Owner switches to their spreadsheet. The store is per signed-in person and per tab, is never written to browser storage, is dropped on reload or after 30 minutes away, and is kept while an import is out or unknown.

### Task items

| Item | Status | What was done |
|---|---|---|
| 1. Owner-only page and gated-off state | done | Non-Owners get `OwnerOnlyNotice` (a Manager also gets "Add one person"). The gated-off state reuses the same notice, so its back link says Home. |
| 2. Step 1, "Add your list" | done | Paste or choose a CSV, parsed in the browser with no new packages. Columns in plain words, an example, a template download, the no-email sentence, and a list-wide location select. |
| 3. Step 2, "Check it" | done, one gap | Table from 1024px, stacked cards below. Each row shows person, role, location, contact and its problems in plain words; summary line "12 ready · 2 need a fix"; inline row editor, remove, and "Edit the list"; three headcounts with distinct labels, now and after import. Gap: "over plan capacity" can only be shown as a list-level refusal at import (see For Codex 2). |
| 4. Step 3, "Import" | done | One command with one operation ID, built once and re-sent byte for byte. Result shows people added, rows the Owner removed and why, people without email, and links to Team and `/app/schedule`. |
| 5. States | done | Loading, empty, field validation, every contract code mapped to a sentence and a next step, offline, success. Uses the Add employee sheet frame plus BState, BChip, BButton, BList and BRow. |
| 6. Copy | done | One module, EN and ES of the same shape; English rendered. |
| 7. Tests | done | Parser, contract-to-screen mapping, the full flow against a stand-in for the routes, server-string renders, and the page. |

How the unknown outcome is handled: HTTP 202, a 503, a dropped connection or an unreadable answer shows "NEVORA couldn't confirm the import" with only "Check again", which re-sends the same command. A new operation ID is made only after a final refusal and a fresh preview. A `changed_replay` keeps the command and sends the Owner to Team.

### Strings (all new; nothing existing changed)

Every string is in `src/components/roster-import/copy.ts`: English at lines 9–207, Spanish at 211–403, group for group. That file is the review surface for Jose.

| Group | EN lines | ES lines |
|---|---|---|
| title, steps, cancel/back | 10–17 | 212–218 |
| closed, off | 20–31 | 220–230 |
| add (step 1) | 33–62 | 232–260 |
| table (list-level errors) | 64–77 | 262–275 |
| review (step 2) | 79–117 | 277–314 |
| problems (row-level) | 119–145 | 316–342 |
| counts (three headcounts) | 147–155 | 344–352 |
| importing, done, unknown, offline | 157–191 | 354–387 |
| refused (server refusals) | 193–206 | 389–402 |

Headline strings:
- Title: "Import a staff list" / "Importar personal". The Spanish is short on purpose so it fits the phone header.
- Gated off: "Staff list import isn’t available for this workplace yet." / "La importación de listas de personal todavía no está disponible para este negocio."
- No email: "Without an email, a person can clock in on the tablet but can’t sign in to NEVORA." / "Sin un correo electrónico, la persona puede marcar su entrada en la tableta, pero no puede iniciar sesión en NEVORA."
- Summary: "12 ready · 2 need a fix" / "12 listas · 2 necesitan corrección"
- Headcount labels: "Active people", "Asked for availability", "Count toward your plan" / "Personas activas", "Se les pide disponibilidad", "Cuentan para tu plan"
- Next steps: "Send invitations", "Build your first schedule" / "Enviar invitaciones", "Crea tu primer horario"
- Unknown outcome: "NEVORA couldn’t confirm the import" / "NEVORA no pudo confirmar la importación"

Apostrophes are typographic (’), as elsewhere in the app. `page.tsx` has one literal, the metadata title "Import a staff list".

### Checks run

- `npx vitest run src/components/roster-import/ src/app/app/employees/import`: 6 files, 179 tests, all pass.
- Also green: `src/lib/onboarding/roster.test.ts`, `src/app/app/employees/new/page.test.tsx`, `src/app/app/b-viewport.test.ts`, `src/test/no-page-entrance-motion.test.ts`, `src/test/nevora-visible-branding.test.ts`.
- `npx eslint src/components/roster-import src/app/app/employees/import`: exit 0.
- Type check: I did not run `tsc` on the project. I ran it scoped to my 16 files through a temporary tsconfig in the scratchpad (about 2 seconds, since deleted): 0 errors.
- The parser tests run my output through the server's own `parseRosterTable`, and the mapping tests use `fixtures/v1/command-results.ts`.

### For Codex

1. **No distinct "not enabled" signal.** A deployment without the import and a real outage both answer 503 `SOURCE_UNAVAILABLE`. The page mirrors the config check server-side; a reason code such as `NOT_ENABLED` would let the client tell them apart.
2. **Plan capacity is not in the preview.** `EMPLOYEE_LIMIT` arrives only at commit, as a list-level error. The preview returns neither the limit nor the count used, so the screen cannot mark rows over capacity, and "Count toward your plan" shows a count without the limit.
3. **Positions are not offered.** The contract takes catalogue IDs only and forbids matching names. The screen sends `defaults.primaryLocationId` and writes a per-row location ID from a select; it sends no `positionIds`, so imported people have no positions. A name-based position column or a by-name preview would close this.
4. **Manager scope is one choice for the whole list.** The screen offers "All locations" or one location; a multi-location subset is not offered.
5. **`CANONICAL_VALIDATION_FAILED` hides the underlying code.** The row gets a generic "NEVORA couldn’t accept this row", stays marked, and import stays blocked until the Owner edits or removes it. Passing the original code through would give a real sentence.
6. **The server refuses a whole list for a quote inside an unquoted cell.** Luis "Tito" Rivera pasted from a spreadsheet returns `MALFORMED_TABLE`. The browser keeps the quote as text and sends properly quoted CSV, so this works today; the browser also converts semicolon-delimited files. The screen always sends `format: "csv"`.
7. **`ROW_COUNT` covers both "no people" and "more than 50".** The browser tells them apart before sending; the server's own code gets a combined sentence.
8. **No template file is defined in the contract.** The download is a header-only CSV built from the documented headers: `ID,First name,Last name,Phone,Email,Role`, with a Spanish twin.
9. **Invitations.** The handoff describes an invitation review after save using `invitation-batches`. This screen links "Send invitations" to Team, as tasked; no batch invitation UI was built.
10. **A 401 while the outcome is unknown** is treated as still unknown: the same command is kept and the Owner is asked to sign in in another tab.

### For the coordinator to check in the browser

- **Frame and CSS.** The page reuses the Add employee classes (`c-addemp c-sheetpage` with `FormHead` and `form.c-teamform`). The new stylesheet has no `!important` and no layer; its breakpoints are 768 and 1023/1024 only. Worth a look: the stacked row cards at 390 and 768, the table at 1024 and 1440, kit buttons and state cards inside the form card, and the phone header.
- **Focus loss.** Paste a list, check it, switch windows, come back: the review should still be there. Same during "Importing…".
- **The link in.** Nothing links to `/app/employees/import` until the Team engineer's link lands. I did not add it to the command finder (`src/lib/finder.ts`, out of scope).
- **The patch step** (`git add -A -N .`) left the 17 new files marked intent-to-add in the wp10 worktree, as COMMON.md prescribes.

Main files, all under `/private/tmp/claude-501/-Users-josek0514--claude-spares-spare-23XJTe/d762c6df-53eb-43b4-836f-475a53cde009/scratchpad/wt/wp10/`:
- `src/app/app/employees/import/page.tsx`
- `src/components/roster-import/session.ts`
- `src/components/roster-import/copy.ts`
- `src/components/roster-import/views.tsx`
- `src/components/roster-import/roster-import.css`
