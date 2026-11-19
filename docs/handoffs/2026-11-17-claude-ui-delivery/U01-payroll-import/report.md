# Package B: U01 (SCRUM-197), payroll import and paid-time export

Builder B. Worktree `wt/p4b`, base `c30f530e`. Patch: `p4patches/b.patch`. Evidence: `p4patches/b-evidence/`.
Nothing was pushed. No server module was edited. Fictional local data only.

## What was built

### 1. Import pay from another payroll system: `/app/payroll/import?run=<payroll id>`

Five steps in the Add employee sheet frame (band with back link, "Step 2 of 5 · Match people" and dots, one white card).

1. **Add a file.** CSV or JSON. Drag and drop, plus a real "Choose a file" button. A panel says what the file needs, with the contract's example row and "Download a starter file" (the exact header and one row per person on the team, zero amounts, so the IDs are the team's). A CSV also asks for the payroll system and its reference. An approved payroll asks for the reason for the correction.
2. **Match people.** Each file row beside the person it is matched to. A row is pre-filled only when its ID is exactly one person's NEVORA ID. Unmatched rows come first, then rows matched twice. A search-to-pick field (name or ID) for each row. Every person the file leaves out needs a choice: Not paid this period, Inactive, or Left out of this payroll. Nobody is dropped.
3. **Review amounts.** A table to the cent with tabular figures (stacked cards under 1024px). Select an amount to correct it. The file's value stays under it with Undo. A row that no longer adds up turns amber and says by how much. Totals: from the file, after your corrections, and the difference.
4. **Confirm.** People, net, gross, pay period, scheduled payday, source, whether the file goes as uploaded or as reviewed amounts, what happens next and what does not (NEVORA does not pay anyone).
5. **Result.** Saved with its receipt; not saved with the reason and the way to fix it; or not confirmed, with "Check again", which looks up the original and never sends a changed file under the same receipt.

Who reaches it: Owners, and Managers with the payroll review grant (the page goes through the existing `PayrollRoute` check, so a Manager without the grant gets the existing closed-page card). How: Payroll, open a payroll, then "Import pay" on its "Import provider amounts" card ("Start a correction" once it is approved, after "Fix this payroll"). That card used to hold the old JSON file field; it is now the way in, so there is one import flow, not two.

### 2. Paid time and export by batch: `/app/payroll-export/paid-time?start=&end=`

Four steps in the same frame.

1. **Review breaks.** Every recorded break of every included person in the period, by person. Each needs an explicit choice: Paid rest or Unpaid meal. No default, no "apply to all" (the contract has none). A count of what is left, per person and in total. In a long period only the first person with something to decide starts open; each person is a row with their own count.
2. **Plan.** The contract's planner groups whole people by bytes: "Batch 1 of 3 · 11 people", with names, break count and size.
3. **Send.** Each batch has its own state: Waiting, Sending, Saved (with receipt and "Download CSV"), Not confirmed ("Check this batch" sends the same stored body again), Not accepted, Stopped.
4. **Finish.** Complete only when every batch is saved and the server's record of the period (the manifest) matches this plan. Otherwise "Not complete yet", with each thing that is missing.

Who reaches it: the same people as Time exports (Owner, or Manager with the whole company; same closed-page card and same company check). How: Payroll home list ("Paid time export" under "Time exports") and a row on Time exports, which carries the dates being shown. No sidebar item was added.

### Files

New, all client side: `src/components/payroll-import/` (`copy.ts`, `recovery.ts`, `import-model.ts`, `export-model.ts`, `flow-kit.tsx`, `import-views.tsx`, `import-flow.tsx`, `export-views.tsx`, `export-flow.tsx`, `test-support.ts` and four test files), the two routes with their `loading.tsx`, and the rules in `src/app/app/b-payroll-import.css`.

Changed: `src/app/app/payroll/payroll-route.tsx` (a new `import` view after the existing access check), `src/components/payroll/payroll-runs.tsx` (the import card is now the entry; one row on Payroll home), `src/components/payroll-export.tsx` (one row), `src/components/owner-b/b-loading.tsx` (two entries). `b-kit.tsx`, `navigation.ts` and `app-shell.tsx` were not touched.

## Contract coverage

| Requirement | Status | Endpoint and module |
| --- | --- | --- |
| Load the real authorized roster | done | `GET /api/payroll/settings` (`readSettings`), `GET /api/payroll/runs` (`readRuns`) in `import-flow.tsx` |
| Explicitly match imported employees; exact matches only by the contract's rule | done | `initialMatches`, `reviewMatches`, `searchPeople` in `import-model.ts`. Exact ID only, never a name or a near ID |
| Upload CSV and JSON with exact cents | done | `readImportFile` uses the contract's `payrollCsvRows` and the existing `parsePayrollImport`. No `Number` arithmetic on money: `BigInt` throughout |
| Inspect and correct linked amounts | done | `reviewAmounts`, `correct`, `centsFromInput`; a total the file itemises in several lines is not correctable on screen and says why |
| Totals reconcile with the file (`NEVORA_PAYROLL_CSV_TOTALS_V1`) | done | `reviewAmounts`; a unit test compares the sums with the server's own `totals(parseImport(...))` |
| Import caps (300 people, 256 KB CSV, 1 MB request) said in a sentence | done | `readImportFile`, `freezeImport`. JSON files keep the old screen's 512 KB limit |
| Inactive, zero and excluded people included, never silently omitted | done | Each roster person not in the file needs a choice and is sent with zero amounts. See "For Codex" 1: the import has no field for the reason |
| Review and publish only after current server authority and source checks | partly | The flow ends at "Review payroll"; approve and share stay on the existing review page, unchanged. The server's checks surface as refusals with their own sentence |
| Freeze the original body and operation key | done | `freezeImport` serializes once; `recovery.ts` keeps the frozen custody |
| Read the original receipt before any further change; unknown is not failed | done | `GET /api/payroll/receipts?operationId=`; "Send the same amounts again" appears only after a look-up found nothing, and sends the same bytes |
| Changed input is a new reviewed operation, only after the old one is resolved | done | `sendGuard` in `recovery.ts`; a refusal frees a new key, an unknown result does not |
| CSV kept exactly as accepted | done when nothing was changed | An untouched CSV goes as `NEVORA_PAYROLL_CSV_TOTALS_V1` with the uploaded text byte for byte (checked in the browser run). See "For Codex" 2 for the changed case |
| IMPORT before approval, CORRECT with a reason after | done | `freezeImport`; reason trimmed, 1 to 300 characters |
| Review every exact employee, entry and break identity | done | `periodBreaks` from `POST /api/timecards` cards; identity is employee, entry, break |
| Choose paid rest or attested relieved meal without inference | done | `BreaksStep`; the break's recorded name is shown as "Recorded as …" and decides nothing |
| Plan by UTF-8 bytes and whole employees (65,536 bytes, 100 cards, 1,000 treatments) | done | `planPaidExportBatches` from `src/lib/payroll-export/batches.ts`, used as is |
| Send each stored body verbatim; verify every reply and hash | done | `POST /api/payroll-export` with `batch.body`; `verifyExportReply`, then `paidExportBatchProgress` before the manifest |
| One lost reply, exact retry | done | "Check this batch" re-sends the stored body under the same key (browser run: same bytes) |
| Changed-body refusal | partly | The page can never send a changed body (unit tested). The server's 409 `conflict` stops the plan with an explanation (forced reply). A real server refusal of a changed body was not exercised |
| An artifact from a different operation cannot satisfy a batch | done | `already_generated` stops the plan and points to Time exports; nothing is relabelled |
| `periodComplete` stays false until the server manifest says so | done | `finishState`, `manifestMatches`; `POST /api/period-close` `MANIFEST` with the planner's fixed `manifestRequest` |
| 30-person multi-batch period | done with fictional forced reads | 30 people, 1,140 breaks, 3 batches (11, 11, 8). See "States" for what was forced |
| Import of 300 people, export of a roster over 300 | not exercised | Limits are enforced and unit tested; no browser run at that size |

## States

"Real" means the real local server answered. "Forced" means the reply was set in the page with `page.route`. Bodies sent by the page were always its own.

| Screen | State | How produced | Evidence |
| --- | --- | --- | --- |
| Import | Loading (still bars in the card) | Real | captured as a first frame, not in the evidence set; unit test |
| Import | Add a file, file loaded, source fields | Real roster and payroll read. The payroll in the fixture is approved, so its status was shown as "waiting for amounts" by changing that one field in the real read (forced) | `import-add-loaded-1440` |
| Import | Wrong file type, focus on the error | Real (decided in the browser) | `import-add-wrong-type-focus-390` |
| Import | Empty file, wrong columns, bad amount | Real (browser) | unit tests; captured, not in the set |
| Import | Over the limit (256 KB) | Real (browser) | `import-add-over-limit-1440` |
| Import | Matching with unmatched rows and people not in the file (partial) | Real roster, fictional file | `import-match-unmatched-1440`, `-900` |
| Import | A person matched twice | Real roster | `import-match-twice-1440` |
| Import | Nobody matched | Unit test only | |
| Import | Search and pick, keyboard focus | Real | `import-match-picker-focus-1440` |
| Import | Amount being corrected, keyboard focus in the cell | Real | `import-review-cell-focus-1440` |
| Import | Wrong amount typed, error under the cell | Real | `import-review-cell-error-900` |
| Import | Corrected amount, original kept, row off, totals differ | Real | `import-review-corrected-1440`, `import-review-corrected-390` |
| Import | Confirm | Real | `import-confirm-900` |
| Import | Conflict: the team changed while working, work kept | Forced (the roster read was changed for one read) | `import-conflict-1440` |
| Import | Offline: work kept, note shown | Real page, browser set offline | captured (`import-offline`), not in the set; 4 corrected cells were still there |
| Import | Unknown, then "no record yet" after Check again | Forced: the save's reply was dropped, the receipt look-up answered `{receipt:null}` | `import-result-not-confirmed-1440` |
| Import | Saved after "Send the same amounts again" | Forced success reply. The second request had the same bytes as the first (logged: `sameBytes: true`) | `import-result-saved-900` |
| Import | Refused: the payroll changed (`REVISION_CONFLICT`) | Forced 409 | captured, not in the set; unit test |
| Import | Refused by the real server (`POPULATION_REVIEW_REQUIRED` to a real CORRECT with the CSV sent as uploaded) | Real | `import-result-refused-real-server-1440` |
| Import | Held: payroll not found | Real | captured (`import-held-missing-real`), not in the set |
| Import | Held: recorded-time payroll, nobody on the team, over 300, another action pending | Unit test only | |
| Import | Load failed, one retry, recovers | Forced 503, then real | captured (`import-load-failed`), not in the set |
| Import | Not allowed: Manager without the grant | Real | `import-not-allowed-manager-900` |
| Export | Held: who's included is not reviewed yet | Real | `export-held-real-server-900` |
| Export | Breaks with undecided ones (partial), count | Forced reads: 30 fictional people, 1,140 breaks (period-close READ and timecards) | `export-breaks-undecided-1440`, `-390` |
| Export | Next pressed while undecided: reason focused | Forced reads | `export-breaks-blocked-focus-900` |
| Export | No breaks, nobody included (empty) | Unit test only | |
| Export | Plan: 3 batches (11, 11, 8) | Forced reads; the plan is the real planner in the browser | `export-plan-900` |
| Export | Run: one saved, one not confirmed, one waiting | Forced: batch 2's first reply was dropped. Replies were built in the capture tool with the server's own projection code, so the page's hash checks ran for real | `export-run-not-confirmed-1440`, `-900`, `-390` |
| Export | "Check this batch" with keyboard focus; the retry had the same bytes (logged: `retrySameBytes: true`) | Forced | `export-run-check-focus-1440` |
| Export | Stopped: the server says something changed (`conflict`) | Forced 409 | `export-run-stopped-390` |
| Export | Refused reasons, already exported under another receipt, access ended | Unit test only | |
| Export | Finish: not complete yet, with what is missing | Forced | `export-finish-incomplete-1440` |
| Export | Finish: complete after the manifest | Forced manifest reply (built from the page's own request) | `export-finish-complete-1440`, `-390` |
| Export | Manifest not confirmed, refused | Unit test only | |
| Export | Conflict: timecards changed before sending, choices kept | Unit test only | |
| Both | 320px | Same runs at 320 (16 steps, no overflow, no small targets) | `scan-log-320.json` |

Unit tests render every state above in English and in Spanish (`views.test.tsx`: 60+ import states, 40+ export states per language), including the ones with no screenshot (JSON problems, each refusal code, signed out, a person with over 1,000 breaks, one person too big for a file, the manifest refused).

## Keyboard and focus

Walked in the capture tool with Tab, Enter, Space and Escape (`scan-log.json` in the evidence folder has the recorded tab order and the focused element after each action).

- **Step change:** focus moves to the step's heading (`h2`, `tabindex=-1`), and a polite live region says "Step 3 of 5 · Review amounts".
- **Tab order, import step 1:** back link, Download a starter file, example table (scrollable region), Choose a file, Payroll system, Report or reference, (reason, when a correction), Cancel, Match people.
- **A step that can't go on:** the filled button stays reachable (`aria-disabled`, described by the reason). Pressing it moves focus to the reason, which turns red and is announced (`role="alert"`). Evidence: `import-match-blocked-focus`, `import-review-blocked-focus`, `export-breaks-blocked-focus`, `export-run-blocked-focus`.
- **File error:** focus moves to the error sentence under the file area (`import-add-wrong-type`).
- **Person picker:** a combobox. Type to filter, Arrow keys move, Enter picks, Escape closes; "Clear match" is its own button (`import-match-picker`).
- **Amount cell:** Tab to the amount (a button named "Correct gross for Carlos Vega: $714.75"), Enter opens the field with the value selected, Enter saves, Escape cancels, focus returns to the amount. A wrong value keeps focus in the field with the error under it (`import-review-cell-focus`, `import-review-cell-editing`, `import-review-cell-error`).
- **Breaks:** each break is a radio group with a legend naming the person and the day; each person is a native `details` row (Enter or Space opens it).
- **Batches:** after sending stops, focus moves to the sentence under the batch that needs attention; "Check this batch" is reached with Tab (`export-run-check-focus`).
- Touch targets are 44px or more at 390 and 320 (probe: none smaller). No horizontal overflow at any width (probe: 0).
- Not done: a screen reader pass. The roles and names above are from the markup and the tool, not from VoiceOver.

## English and Spanish

Both pages are signed-in screens, so they render English today. Every string is in `src/components/payroll-import/copy.ts` with an `en` and an `es` entry. `views.test.tsx` renders every state of both flows in Spanish and fails on an English word or a missing key; it also checks that both languages have the same entries, that nothing is left untranslated, and that no string has an em dash, an exclamation mark or a filler word. Dates and money follow the language (`es-PR`).

One thing to decide (see below): the Spanish uses "tú", as the staff-list import and billing recovery do. The brief said "usted-neutral".

## Checks run

- `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .`: clean in `src`.
- `npx eslint src/components/payroll-import src/components/payroll/payroll-runs.tsx src/components/payroll-export.tsx src/app/app/payroll src/app/app/payroll-export src/components/owner-b/b-loading.tsx`: clean.
- `npx vitest run --dir src src/components/payroll-import`: 4 files, 64 tests, all pass.
- `npx vitest run --dir src src/app src/components src/lib --testTimeout=30000`, on the final code: 868 files passed, 24 skipped; 13,117 tests passed, 741 skipped, 0 failed. (`src/test/manual-publication.test.ts` is outside these folders, so its known failure did not appear.)
- Browser capture with `cap.sh` (real app, real sign-in, owned local Postgres, fictional data) as Owner at 1440, 900, 390 and 320, and as Manager at 1440, 900 and 390. Final run at 1440, 900 and 390: 59 scripted steps, all passed, horizontal overflow 0 on every screen, no touch target under 44px, no page error. Frame probe on both pages from 768px: title top 130, card top 248 (band 224 plus 24), card 812 wide (764 at 900). The 320 run (16 steps) and a last 320 and 390 import run after two CSS fixes (22 steps) also passed. The evidence PNGs are from the final 1440, 900 and 390 run, except `import-review-corrected-390` (the last run) and the Manager card.
- Not run: `npm run build`, the integration suites (`vitest.payroll-export-integration` and the others), a screen reader, a real device, Safari or Firefox.

## For Codex

1. **The import has no place for why a person is zero.** The screen asks "Not paid this period, Inactive or Left out" for every person the file leaves out and sends that person with zero amounts, as the contract says. The reason itself is not sent: `PayrollImportRow` has no field for it. It is shown on the review and nowhere after. If it should be kept, it needs a field, or the screen should read the period's "Who's included" list instead of asking again. Today the two can disagree: the server refuses a non-zero row for someone that list does not include (`POPULATION_DISPOSITION`), and that arrives as a blocking note on the review page, not in this flow.
2. **A corrected or re-matched CSV cannot carry the file.** `parseImport` refuses a `sourceDocument` whose rows differ from the amounts. So when the Owner re-matches a row, corrects a cent or the file left someone out, the page sends `NEVORA_PAYROLL_IMPORT_V1` rows without the file and says so ("The amounts you reviewed are saved, not the file itself… Keep october-pay.csv for your records"). Only an untouched CSV goes as `NEVORA_PAYROLL_CSV_TOTALS_V1`. In practice a CSV made outside NEVORA will often need one of the three. If the original file should be kept as evidence beside corrected rows, the contract needs a way to attach it.
3. **A refusal names a row by number only.** `issues[].path` is `rows.N.netMinor`. The page says "A row doesn't add up" and sends the Owner back to the amounts. The page checks the same rule first, so this is rare. Validation stops at the first error, as documented.
4. **No timecards lease on the paid-time page.** The existing Time exports page drops its data when the 45-second timecards lease ends or the window loses focus. Deciding hundreds of breaks takes longer than that, so this page reads again every 30 seconds and on return, compares the source (period source hash, people revision, each card's state, revision and hash) and, before anything is sent, tells the Owner what changed and keeps the choices whose break is still there. Once a batch is sent the plan is fixed in memory until the page is closed. Nothing is written to browser storage. Please confirm this is acceptable, or say what the lease should be for a long review.
5. **Earlier exports of the same period.** The page does not block when the period already has export receipts (a plain Time export, for example). If the server answers `already_generated`, the plan stops and points to Time exports. I could not tell from the contract whether a recorded-hours export and a paid-time export of the same card count as the same artifact.
6. **One person too big for a file** (`EMPLOYEE_EXCEEDS_COMMAND_LIMIT`). The page says NEVORA doesn't split a person and suggests a shorter period. The contract asks for "a supported, explicitly reviewed next step" and names none. Is a shorter period the supported one?
7. **Neutral paid profile and 10-minute breaks.** With the neutral profile (nine decimals, no rounding) a 10-minute paid rest is refused as `INEXACT_HOURS`. The page shows the sentence for it. The flow always uses the neutral profile (`profileId: null`); choosing a saved file format with a rounding rule inside this flow is not built.
8. **`POST /api/payroll/runs` 401/403 on a save** is treated as a known "not saved" (the existing hook does the same). Say if a denied save could ever have been committed.
9. **Run-level real success was not reached** with the local fixture: the real server answered `POPULATION_REVIEW_REQUIRED` to a real CORRECT (shown in evidence). A joined run with a reviewed people list and finalized timecards is still needed for a real "saved".

## For Jose to decide

1. **Spanish voice.** "Tú" (as the existing signed-in Spanish) or "usted"?
2. **Three reasons for a person who is not in the file:** "Not paid this period", "Inactive", "Left out of this payroll". These are my words for the brief's three; they are not legal categories.
3. **Break choices:** "Paid rest" and "Unpaid meal", with the line "Choosing “Unpaid meal” is your statement that the person was fully relieved of duty for that break." Counsel should read this one.
4. **No "apply to all"** for breaks, by the contract. With 1,140 breaks that is 1,140 choices. If a faster way is wanted (for example "the same choice for every break recorded as Lunch"), it is an inference the contract forbids today, so it needs Codex and counsel.
5. **The old JSON text box is gone** from Review payroll (paste JSON by hand). A JSON file still imports through the new flow.
6. **Receipt shown as its first eight characters** ("Receipt a6afeb54"); the full value is in the tooltip. Enough, or show it whole?
7. **"Cancel" stays in the phone header** on the result and finish steps. It could read "Done" there.

## Needed from another package

Nothing. `b-kit.tsx` has no "done" kind for a state card; I drew the green check card inside this package with the kit's own classes (`DoneCard` in `flow-kit.tsx`) instead of editing the kit. If another package needs the same, it is a three-line addition to `BState`.

## Not verified

- A real saved import, a real generated export and a real manifest (see "For Codex" 9). The export replies in the browser run were built with the server's own pure projection code (`canonicalPayrollExport`, `mappedPayrollCsv`) inside the capture tool, so the page's verification ran against true hashes, but no export route or database wrote them.
- A changed body refused by the real server.
- 300 people, files near the size limits, and slow networks.
- Screen readers, Safari, Firefox, real phones, 200% text size (the layout is fluid and was checked at 320px, but not zoomed).
- The work-in-progress memory (30 minutes after leaving the page) was not exercised in the browser.
- `npm run build`.
- One console message in one run at 390 ("A tree hydrated but some attributes of the server rendered HTML didn't match"). It appeared once in about 180 page loads and not in the other runs; I could not tie it to these pages or rule them out.
- At 320px the phone header's "Back" and the step line almost touch on the longest step name ("Step 3 of 5 · Review amounts"). I hid the dots at that width to make room; the header itself is the shared sheet frame.
- The full-page PNGs taken after a keyboard step show the shell's "Skip to content" link and top bar mid-page. That is how the capture tool stitches a page whose focus moved; the fold pictures are what a person sees.

## Source, environment and release sequence

- Source: detached worktree `wt/p4b`, patch against `c30f530e` (a temporary commit on `9c661c3e`, the collaboration branch with Development `22107a24` merged in). Temporary local commits only. Nothing pushed, no branch created, the main checkout untouched.
- Environment: local only. The app ran against an owned, disposable local Postgres with fictional data. No Development or production database, no provider, no email, SMS or push, no paid service. Forced replies are labelled in "States".
- Release sequence (Jose's policy of Nov 12, 2026): integrate and verify the combined backend and UI on Development first, then promote that exact verified release to main after Jose approves. This patch authorizes neither step.

## Copy

Every user-facing string of the feature, from `src/components/payroll-import/copy.ts` (a key that takes values is shown once per form, with fictional values). **All of `imp.*` and `exp.*` is payroll wording for Jose and counsel.** The sentences to read first:

- Scope, new: "NEVORA keeps these amounts as they are. It doesn’t calculate or change them." · "Nothing is shared with your team yet." · "Review the payroll before you approve it. Nobody has been paid." · "Nothing has been shared or paid." · "This is a record of hours. It doesn’t show that a file was loaded into your payroll system, and NEVORA doesn’t pay anyone."
- Breaks, new: "Recorded time doesn’t say what is paid. Choose how each break is paid. NEVORA doesn’t choose for you and doesn’t decide what the law requires." · "Choosing “Unpaid meal” is your statement that the person was fully relieved of duty for that break." · the two choices "Paid rest" and "Unpaid meal".
- People not in the file, new: "They are saved with $0.00 so nobody is left out without a reason." and the three choices.
- Reused word for word (approved): `imp.add.settle` ("If pay changes, settle the difference with the employee outside NEVORA."), `imp.confirm.not[0]` ("NEVORA doesn’t pay anyone or send taxes."), the `FINALIZED_TIME_REQUIRED` and `SETTINGS_REQUIRED` reasons, "Scheduled payday", and on the entry card "Historical provider runs retain their imported amounts…" / "NEVORA preserves imported amounts; a statutory calculator is unavailable." (unchanged in `payroll-runs.tsx`). The Spanish of these reused sentences is new.
- Outside `copy.ts`, three English strings on the closed-page card of the paid-time route follow the Time exports page ("Paid time export", "Time exports are for Owners and Managers.", "Paid time export unavailable").

| Key | English | Spanish |
| --- | --- | --- |
| `common.payroll` | Payroll | Nómina |
| `common.timeExports` | Time exports | Exportar horas |
| `common.back` | Back | Atrás |
| `common.cancel` | Cancel | Cancelar |
| `common.tryAgain` | Try again | Intentar de nuevo |
| `common.signIn` | Sign in | Iniciar sesión |
| `common.stepOf` | Step 2 of 5 · Match people | Paso 2 de 5 · Match people |
| `common.loading` | Loading… | Cargando… |
| `common.offlineTitle` | You’re offline | No tienes conexión |
| `common.offlineLine` | Your work is kept on this device until you close this page. Reconnect to save it. | Tu trabajo se guarda en este dispositivo hasta que cierres esta página. Vuelve a conectarte para guardarlo. |
| `common.deniedTitle` | Your access to this page ended | Tu acceso a esta página terminó |
| `common.deniedLine` | Nothing more was sent. Ask an Owner if you still need it. | No se envió nada más. Pregúntale a un dueño si todavía lo necesitas. |
| `common.signedOutTitle` | Your session ended | Tu sesión terminó |
| `common.signedOutLine` | Sign in again. Nothing more was sent. | Inicia sesión otra vez. No se envió nada más. |
| `common.loadFailedTitle` | We couldn’t load this | No pudimos cargar esto |
| `common.loadFailedLine` | Check your connection and try again. | Revisa tu conexión e intenta de nuevo. |
| `common.stay` | Stay on this page until this is settled. | Quédate en esta página hasta que esto se resuelva. |
| `common.receipt` | Receipt | Recibo |
| `common.people` | 1 person | 1 persona |
| `common.people` | 12 people | 12 personas |
| `imp.title` | Import pay | Importar pagos |
| `imp.titleCorrection` | Correct imported pay | Corregir pagos importados |
| `imp.steps[0]` | Add a file | Añade un archivo |
| `imp.steps[1]` | Match people | Empareja personas |
| `imp.steps[2]` | Review amounts | Revisa las cantidades |
| `imp.steps[3]` | Confirm | Confirma |
| `imp.steps[4]` | Result | Resultado |
| `imp.reviewBack` | Review payroll | Revisar nómina |
| `imp.hold.missing.title` | This payroll isn’t available | Esta nómina no está disponible |
| `imp.hold.missing.line` | It may have been replaced by a newer revision. | Puede que una revisión más reciente la haya reemplazado. |
| `imp.hold.missing.action` | Go to Payroll | Ir a Nómina |
| `imp.hold.native.title` | This payroll doesn’t take imported amounts | Esta nómina no acepta cantidades importadas |
| `imp.hold.native.line` | It is calculated in NEVORA from recorded time. | Se calcula en NEVORA con el tiempo registrado. |
| `imp.hold.native.action` | Review payroll | Revisar nómina |
| `imp.hold.noTeam.title` | There is nobody on the team yet | Todavía no hay nadie en el equipo |
| `imp.hold.noTeam.line` | Add your team before you import their pay. | Añade a tu equipo antes de importar sus pagos. |
| `imp.hold.noTeam.action` | Open Team | Abrir Equipo |
| `imp.hold.tooManyPeople.title` | This team is over the import limit | Este equipo pasa del límite de importación |
| `imp.hold.tooManyPeople.line` | An import covers up to 300 people. | Una importación cubre hasta 300 personas. |
| `imp.hold.tooManyPeople.action` | Go to Payroll | Ir a Nómina |
| `imp.hold.pending.title` | Another payroll action is still being checked | Otra acción de nómina todavía se está verificando |
| `imp.hold.pending.line` | Finish checking it on Review payroll before you start an import. | Termina de verificarla en Revisar nómina antes de empezar una importación. |
| `imp.hold.pending.action` | Review payroll | Revisar nómina |
| `imp.add.heading` | Add the file from your payroll system | Añade el archivo de tu sistema de nómina |
| `imp.add.lead` | Use the file with each person’s pay for Oct 26 – Nov 1. NEVORA keeps these amounts as they are. It doesn’t calculate or change them. | Usa el archivo con el pago de cada persona para Oct 26 – Nov 1. NEVORA guarda estas cantidades tal como están. No las calcula ni las cambia. |
| `imp.add.needs` | What the file needs | Lo que necesita el archivo |
| `imp.add.needsCsv` | A CSV with these five columns, in this order: | Un CSV con estas cinco columnas, en este orden: |
| `imp.add.needsList[0]` | One row per person, with the person’s NEVORA ID. | Una fila por persona, con el ID de la persona en NEVORA. |
| `imp.add.needsList[1]` | Amounts in dollars with up to two decimals, like 1000.01. No $ signs and no commas. | Cantidades en dólares con hasta dos decimales, como 1000.01. Sin signo de $ y sin comas. |
| `imp.add.needsList[2]` | Up to 300 people and 256 KB. | Hasta 300 personas y 256 KB. |
| `imp.add.needsList[3]` | A JSON file in the NEVORA payroll import format also works, up to 512 KB. | También sirve un archivo JSON en el formato de importación de nómina de NEVORA, de hasta 512 KB. |
| `imp.add.exampleCaption` | Example | Ejemplo |
| `imp.add.starter` | Download a starter file | Descargar un archivo inicial |
| `imp.add.starterHelp` | A CSV with your team’s IDs and zero amounts. | Un CSV con los ID de tu equipo y cantidades en cero. |
| `imp.add.drop` | Drop the file here | Suelta el archivo aquí |
| `imp.add.or` | or | o |
| `imp.add.choose` | Choose a file | Elegir un archivo |
| `imp.add.another` | Choose another file | Elegir otro archivo |
| `imp.add.fileLabel` | Pay file (CSV or JSON) | Archivo de pagos (CSV o JSON) |
| `imp.add.loaded` | october-pay.csv is loaded. 10 rows. | october-pay.csv está cargado. 10 filas. |
| `imp.add.reading` | Reading the file… | Leyendo el archivo… |
| `imp.add.sourceName` | Payroll system | Sistema de nómina |
| `imp.add.sourceNameHelp` | The system or accountant these amounts come from. | El sistema o el contador de donde vienen estas cantidades. |
| `imp.add.sourceReference` | Report or reference | Informe o referencia |
| `imp.add.sourceReferenceHelp` | The report name or number on their side, so you can find it later. | El nombre o número del informe en su sistema, para encontrarlo después. |
| `imp.add.fromFile` | From Fictional accountant, reference FICT-001. | De Fictional accountant, referencia FICT-001. |
| `imp.add.reason` | Reason for the correction | Razón de la corrección |
| `imp.add.reasonHelp` | Up to 300 characters. It is kept with the corrected payroll. | Hasta 300 caracteres. Se guarda con la nómina corregida. |
| `imp.add.settle` | If pay changes, settle the difference with the employee outside NEVORA. | Si el pago cambia, resuelve la diferencia con la persona fuera de NEVORA. |
| `imp.add.next` | Match people | Emparejar personas |
| `imp.add.needFile` | Add a file to continue. | Añade un archivo para continuar. |
| `imp.add.needSource` | Enter the payroll system and its reference to continue. | Escribe el sistema de nómina y su referencia para continuar. |
| `imp.add.needReason` | Enter the reason for the correction to continue. | Escribe la razón de la corrección para continuar. |
| `imp.add.sourceInvalid` | Use 1 to 300 characters on one line | Usa de 1 a 300 caracteres en una sola línea |
| `imp.add.periodMismatch` | This file is for a different pay period or payday. This payroll is Oct 26 – Nov 1, payday Fri, Nov 6. | Este archivo es de otro período de pago o de otro día de pago. Esta nómina es Oct 26 – Nov 1, día de pago Fri, Nov 6. |
| `imp.problem` | This file isn’t a CSV or JSON file. Choose a file that ends in .csv or .json. | Este archivo no es CSV ni JSON. Elige un archivo que termine en .csv o .json. |
| `imp.problem` | This file is empty. Choose the file with the pay amounts. | Este archivo está vacío. Elige el archivo con las cantidades de pago. |
| `imp.problem` | This file is over the limit of 256 KB. Ask for a file with only this pay period. | Este archivo pasa del límite de 256 KB. Pide un archivo solo con este período de pago. |
| `imp.problem` | This file has more than 300 people. An import covers up to 300. | Este archivo tiene más de 300 personas. Una importación cubre hasta 300. |
| `imp.problem` | The columns don’t match. The first line must be exactly: employeeId,gross,employeeDeductions,employerContributions,net | Las columnas no coinciden. La primera línea tiene que ser exactamente: employeeId,gross,employeeDeductions,employerContributions,net |
| `imp.problem` | A row has more than five columns. Remove the extra columns and add the file again. | Una fila tiene más de cinco columnas. Quita las columnas de más y añade el archivo otra vez. |
| `imp.problem` | A value is longer than 200 characters. Shorten it and add the file again. | Un valor tiene más de 200 caracteres. Acórtalo y añade el archivo otra vez. |
| `imp.problem` | A quotation mark in the file isn’t closed. Save the file as CSV again and add it. | Hay unas comillas sin cerrar en el archivo. Guárdalo como CSV otra vez y añádelo. |
| `imp.problem` | The file’s line endings can’t be read. Save it as CSV (comma separated) and add it again. | No se pueden leer los saltos de línea del archivo. Guárdalo como CSV (separado por comas) y añádelo otra vez. |
| `imp.problem` | Row 3, gross: use dollars with up to two decimals, like 1000.01. No $ signs, commas or negative amounts. | Fila 3, gross: usa dólares con hasta dos decimales, como 1000.01. Sin signo de $, comas ni cantidades negativas. |
| `imp.problem` | Row 2 doesn’t have five values. Every value is needed, zero included. | La fila 2 no tiene cinco valores. Hace falta cada valor, también los ceros. |
| `imp.problem` | This JSON file can’t be read. Export it again from your payroll system. | No se puede leer este archivo JSON. Expórtalo otra vez desde tu sistema de nómina. |
| `imp.problem` | This JSON file isn’t in the NEVORA payroll import format. It needs the pay period, payday, a source and reference, and whole-cent amounts for each person. | Este archivo JSON no está en el formato de importación de nómina de NEVORA. Necesita el período de pago, el día de pago, una fuente con su referencia y cantidades en centavos enteros para cada persona. |
| `imp.problem` | This file can’t be read. Save it as CSV and add it again. | No se puede leer este archivo. Guárdalo como CSV y añádelo otra vez. |
| `imp.match.heading` | Match each row to a person | Empareja cada fila con una persona |
| `imp.match.lead` | A row is matched for you only when its ID is exactly a person’s NEVORA ID. Match the rest yourself. | Una fila se empareja sola únicamente cuando su ID es exactamente el ID de una persona en NEVORA. Empareja las demás tú. |
| `imp.match.summary` | 8 of 10 rows matched | 8 de 10 filas emparejadas |
| `imp.match.toMatch` | 2 to match | 2 por emparejar |
| `imp.match.twice` | 2 matched twice | 2 emparejadas dos veces |
| `imp.match.rowsTitle` | Rows in the file | Filas del archivo |
| `imp.match.row` | Row 3 · ID A-104 | Fila 3 · ID A-104 |
| `imp.match.amounts` | Gross $640.00 · Net $559.75 | Bruto $640.00 · Neto $559.75 |
| `imp.match.byId` | Matched by ID | Emparejada por ID |
| `imp.match.byYou` | Matched by you | Emparejada por ti |
| `imp.match.notMatched` | Not matched | Sin emparejar |
| `imp.match.matchedTwice` | Matched twice | Emparejada dos veces |
| `imp.match.twiceLine` | Ana Rivera has more than one row. A person can have only one. | Ana Rivera tiene más de una fila. Una persona solo puede tener una. |
| `imp.match.person` | Person | Persona |
| `imp.match.personFor` | Person for row 3 | Persona para la fila 3 |
| `imp.match.searchPlaceholder` | Search by name or ID | Busca por nombre o ID |
| `imp.match.noResults` | Nobody on the team matches that. | Nadie del equipo coincide con eso. |
| `imp.match.taken` | Has a row | Ya tiene fila |
| `imp.match.clear` | Clear match | Quitar emparejamiento |
| `imp.match.inactive` | Inactive | Inactiva |
| `imp.match.nobodyTitle` | No row matches anyone on the team | Ninguna fila coincide con alguien del equipo |
| `imp.match.nobodyLine` | The IDs in this file aren’t NEVORA IDs. Match each row below, or download the starter file and ask for the amounts again. | Los ID de este archivo no son ID de NEVORA. Empareja cada fila abajo, o descarga el archivo inicial y pide las cantidades otra vez. |
| `imp.match.missingTitle` | People not in the file | Personas que no están en el archivo |
| `imp.match.missingLead` | Choose what happens with each person. They are saved with $0.00 so nobody is left out without a reason. | Elige qué pasa con cada persona. Se guardan con $0.00 para que nadie quede fuera sin una razón. |
| `imp.match.missingNone` | Everyone on the team has a row. | Todas las personas del equipo tienen una fila. |
| `imp.match.choiceFor` | What happens with Ana Rivera | Qué pasa con Ana Rivera |
| `imp.match.disposition.NOT_PAID` | Not paid this period | Sin pago en este período |
| `imp.match.disposition.INACTIVE` | Inactive | Inactiva |
| `imp.match.disposition.LEFT_OUT` | Left out of this payroll | Fuera de esta nómina |
| `imp.match.undecided` | 2 to decide | 2 por decidir |
| `imp.match.next` | Review amounts | Revisar cantidades |
| `imp.match.blocked` | Match 1 more row, fix 2 rows matched twice, choose for 2 people not in the file to continue. | Empareja 1 fila más, corrige 2 filas emparejadas dos veces, elige para 2 personas que no están en el archivo para continuar. |
| `imp.match.blocked` | Choose for 1 person not in the file to continue. | Elige para 1 persona que no está en el archivo para continuar. |
| `imp.review.heading` | Check each amount | Revisa cada cantidad |
| `imp.review.lead` | These are the amounts from the file, to the cent. Select an amount to correct it. The file’s value stays visible and you can undo. | Estas son las cantidades del archivo, al centavo. Selecciona una cantidad para corregirla. El valor del archivo sigue a la vista y puedes deshacer el cambio. |
| `imp.review.columns.person` | Person | Persona |
| `imp.review.columns.gross` | Gross | Bruto |
| `imp.review.columns.deductions` | Deductions | Deducciones |
| `imp.review.columns.contributions` | Employer contributions | Aportaciones patronales |
| `imp.review.columns.net` | Net | Neto |
| `imp.review.edit` | Correct gross for Ana Rivera | Corregir gross de Ana Rivera |
| `imp.review.amountFor` | Gross for Ana Rivera, in dollars | Gross de Ana Rivera, en dólares |
| `imp.review.was` | File: $876.61 | Archivo: $876.61 |
| `imp.review.undo` | Undo | Deshacer |
| `imp.review.undoFor` | Undo the correction to net for Ana Rivera | Deshacer la corrección de net de Ana Rivera |
| `imp.review.done` | Done | Listo |
| `imp.review.invalid` | Use dollars with up to two decimals, like 1000.01 | Usa dólares con hasta dos decimales, como 1000.01 |
| `imp.review.locked.itemised` | The file lists this in several lines. Correct it in the file and add it again. | El archivo detalla esto en varias líneas. Corrígelo en el archivo y añádelo otra vez. |
| `imp.review.locked.earnings` | The file lists earnings that add up to this gross. Correct it in the file and add it again. | El archivo detalla ingresos que suman este bruto. Corrígelo en el archivo y añádelo otra vez. |
| `imp.review.gap` | Gross minus deductions should equal net. This row is off by $2.50. | El bruto menos las deducciones tiene que ser igual al neto. Esta fila se pasa por $2.50. |
| `imp.review.changedRow` | Corrected | Corregida |
| `imp.review.totals` | Totals | Totales |
| `imp.review.fromFile` | From the file | Del archivo |
| `imp.review.afterChanges` | After your corrections | Con tus correcciones |
| `imp.review.difference` | Difference | Diferencia |
| `imp.review.reconciles` | The totals match the file. | Los totales coinciden con el archivo. |
| `imp.review.differs` | 1 row was corrected, so the totals differ from the file by the amounts shown. | 1 fila se corrigió, así que los totales difieren del archivo por las cantidades que se muestran. |
| `imp.review.differs` | 2 rows were corrected, so the totals differ from the file by the amounts shown. | 2 filas se corrigieron, así que los totales difieren del archivo por las cantidades que se muestran. |
| `imp.review.zeroTitle` | Saved with $0.00 | Se guardan con $0.00 |
| `imp.review.zeroLine` | Tomás Vega · Inactive | Tomás Vega · Inactive |
| `imp.review.next` | Check and save | Verificar y guardar |
| `imp.review.blocked` | 1 row doesn’t add up. Correct it to continue. | 1 fila no cuadra. Corrígela para continuar. |
| `imp.review.blocked` | 2 rows don’t add up. Correct them to continue. | 2 filas no cuadran. Corrígelas para continuar. |
| `imp.confirm.heading` | Save these amounts | Guarda estas cantidades |
| `imp.confirm.headingCorrection` | Save this correction | Guarda esta corrección |
| `imp.confirm.people` | People | Personas |
| `imp.confirm.peopleValue` | 12 (10 from the file, 2 at $0.00) | 12 (10 del archivo, 2 con $0.00) |
| `imp.confirm.peopleValue` | 12 | 12 |
| `imp.confirm.net` | Net pay | Pago neto |
| `imp.confirm.gross` | Gross pay | Pago bruto |
| `imp.confirm.period` | Pay period | Período de pago |
| `imp.confirm.payday` | Scheduled payday | Día de pago programado |
| `imp.confirm.source` | From | De |
| `imp.confirm.file` | File | Archivo |
| `imp.confirm.reason` | Reason | Razón |
| `imp.confirm.asUploaded` | october-pay.csv, saved exactly as you uploaded it. | october-pay.csv, guardado exactamente como lo subiste. |
| `imp.confirm.asReviewed` | The amounts you reviewed are saved, not the file itself (1 row corrected, 2 rows matched by you, 2 people added at $0.00). Keep october-pay.csv for your records. | Se guardan las cantidades que revisaste, no el archivo (1 fila corregida, 2 filas emparejadas por ti, 2 personas añadidas con $0.00). Guarda october-pay.csv para tus récords. |
| `imp.confirm.nextTitle` | What happens next | Qué pasa después |
| `imp.confirm.next[0]` | The amounts are saved to this payroll. | Las cantidades se guardan en esta nómina. |
| `imp.confirm.next[1]` | You review and approve the payroll before any pay statement is shared. | Tú revisas y apruebas la nómina antes de que se comparta algún talonario. |
| `imp.confirm.nextCorrection[0]` | A corrected payroll is created and linked to the approved one. | Se crea una nómina corregida, enlazada a la aprobada. |
| `imp.confirm.nextCorrection[1]` | You review and approve it before any corrected statement is shared. | Tú la revisas y la apruebas antes de que se comparta algún talonario corregido. |
| `imp.confirm.notTitle` | What doesn’t happen | Qué no pasa |
| `imp.confirm.not[0]` | NEVORA doesn’t pay anyone or send taxes. | NEVORA no le paga a nadie ni envía contribuciones. |
| `imp.confirm.not[1]` | Nothing is shared with your team yet. | Todavía no se comparte nada con tu equipo. |
| `imp.confirm.save` | Save amounts | Guardar cantidades |
| `imp.confirm.saveCorrection` | Save correction | Guardar corrección |
| `imp.confirm.tooBig` | These amounts are over the size the server accepts (1 MB). Import fewer lines per person. | Estas cantidades pasan del tamaño que acepta el servidor (1 MB). Importa menos líneas por persona. |
| `imp.result.sendingTitle` | Saving the amounts… | Guardando las cantidades… |
| `imp.result.sendingLine` | Keep this page open. | Deja esta página abierta. |
| `imp.result.savedTitle` | Amounts saved | Cantidades guardadas |
| `imp.result.savedLine` | 12 people for Oct 26 – Nov 1. Review the payroll before you approve it. Nobody has been paid. | 12 personas para Oct 26 – Nov 1. Revisa la nómina antes de aprobarla. No se le ha pagado a nadie. |
| `imp.result.savedCorrectionTitle` | Correction saved | Corrección guardada |
| `imp.result.savedCorrectionLine` | A corrected payroll for Oct 26 – Nov 1 is ready to review. Nothing has been shared or paid. | Hay una nómina corregida para Oct 26 – Nov 1 lista para revisar. No se ha compartido ni pagado nada. |
| `imp.result.review` | Review payroll | Revisar nómina |
| `imp.result.refusedTitle` | The amounts were not saved | Las cantidades no se guardaron |
| `imp.result.refusedNothing` | Nothing was saved. Your work is still here. | No se guardó nada. Tu trabajo sigue aquí. |
| `imp.result.fix.amounts` | Back to the amounts | Volver a las cantidades |
| `imp.result.fix.match` | Back to matching | Volver a emparejar |
| `imp.result.fix.file` | Back to the file | Volver al archivo |
| `imp.result.fix.included` | Choose who’s included | Elegir quién está incluido |
| `imp.result.fix.timecards` | Open Timecards | Abrir Hojas de tiempo |
| `imp.result.fix.settings` | Open payroll settings | Abrir ajustes de nómina |
| `imp.result.fix.payroll` | Go to Payroll | Ir a Nómina |
| `imp.result.unknownTitle` | We couldn’t confirm the save | No pudimos confirmar que se guardó |
| `imp.result.unknownLine` | The amounts may or may not be saved. Check before you do anything else. This page keeps the exact amounts you sent. | Puede que las cantidades se hayan guardado o no. Verifica antes de hacer otra cosa. Esta página guarda las cantidades exactas que enviaste. |
| `imp.result.noReceipt` | There is no record of it yet. It can still arrive. Check again, or send the same amounts again: sending them again can’t save them twice. | Todavía no hay constancia. Aún puede llegar. Verifica otra vez, o envía las mismas cantidades otra vez: enviarlas de nuevo no puede guardarlas dos veces. |
| `imp.result.checkFailed` | We couldn’t check. Your connection may be down. Try again. | No pudimos verificar. Puede que no tengas conexión. Intenta de nuevo. |
| `imp.result.check` | Check again | Verificar otra vez |
| `imp.result.checking` | Checking… | Verificando… |
| `imp.result.resend` | Send the same amounts again | Enviar las mismas cantidades otra vez |
| `imp.result.neverChanged` | A changed file is never sent under the same receipt. | Un archivo cambiado nunca se envía con el mismo recibo. |
| `imp.result.blockedTitle` | This import needs a person to look at it | Esta importación necesita que una persona la revise |
| `imp.result.blockedLine` | The server has a different request under this receipt. Nothing was replaced. Open Review payroll to see what was saved. | El servidor tiene otra solicitud con este recibo. No se reemplazó nada. Abre Revisar nómina para ver qué se guardó. |
| `imp.result.reason` | The team changed. Everyone on the team must be in the import, once. | El equipo cambió. Todas las personas del equipo tienen que estar en la importación, una vez. |
| `imp.result.reason` | A row doesn’t add up: gross minus deductions must equal net. | Una fila no cuadra: el bruto menos las deducciones tiene que ser igual al neto. |
| `imp.result.reason` | A person appears twice, or an ID isn’t on the team. | Una persona aparece dos veces, o un ID no está en el equipo. |
| `imp.result.reason` | The pay period or payday isn’t valid for this payroll. | El período de pago o el día de pago no es válido para esta nómina. |
| `imp.result.reason` | The payroll system or its reference isn’t valid. Use 1 to 300 characters on one line. | El sistema de nómina o su referencia no es válido. Usa de 1 a 300 caracteres en una sola línea. |
| `imp.result.reason` | The server didn’t accept one of the values. Check the amounts. | El servidor no aceptó uno de los valores. Revisa las cantidades. |
| `imp.result.reason` | This payroll changed while you worked. Check your amounts against the current payroll and save again. | Esta nómina cambió mientras trabajabas. Compara tus cantidades con la nómina actual y guarda otra vez. |
| `imp.result.reason` | This payroll was approved or changed while you worked, so it no longer takes this import. | Esta nómina se aprobó o cambió mientras trabajabas, así que ya no acepta esta importación. |
| `imp.result.reason` | The pay period or payday in the file isn’t this payroll’s. | El período de pago o el día de pago del archivo no es el de esta nómina. |
| `imp.result.reason` | First choose who’s included in this pay period. That is done on Time exports. | Primero elige quién está incluido en este período de pago. Eso se hace en Exportar horas. |
| `imp.result.reason` | The team or the timecards changed after you chose who’s included. Review who’s included again. | El equipo o las hojas de tiempo cambiaron después de que elegiste quién está incluido. Revisa otra vez quién está incluido. |
| `imp.result.reason` | The timecards or the team changed while this was being saved. Check the payroll and save again. | Las hojas de tiempo o el equipo cambiaron mientras esto se guardaba. Revisa la nómina y guarda otra vez. |
| `imp.result.reason` | Finalize the included employee timecards before approving payroll. | Finaliza las hojas de tiempo de las personas incluidas antes de aprobar la nómina. |
| `imp.result.reason` | Save company payroll settings before preparing this payroll run. | Guarda los ajustes de nómina de la empresa antes de preparar esta nómina. |
| `imp.result.reason` | This payroll is calculated in NEVORA from recorded time, so it doesn’t take imported amounts. | Esta nómina se calcula en NEVORA con el tiempo registrado, así que no acepta cantidades importadas. |
| `imp.result.reason` | This payroll isn’t available. It may have been replaced by a newer revision. | Esta nómina no está disponible. Puede que una revisión más reciente la haya reemplazado. |
| `imp.result.reason` | The server didn’t accept this import. Check the payroll and try again. | El servidor no aceptó esta importación. Revisa la nómina e intenta de nuevo. |
| `imp.changed.title` | Something changed while you worked | Algo cambió mientras trabajabas |
| `imp.changed.kept` | Your matches and corrections are kept where they still apply. | Tus emparejamientos y correcciones se conservan donde todavía aplican. |
| `imp.changed.line` | Added to the team: Nico Díaz. Choose what happens with them on Match people. | Se añadió al equipo: Nico Díaz. Elige qué pasa con estas personas en Empareja personas. |
| `imp.changed.line` | No longer on the team: Ana Rivera, Luis Ortiz, Mara Colón and 1 more. Rows matched to them need a new match. | Ya no está en el equipo: Ana Rivera, Luis Ortiz, Mara Colón y 1 más. Las filas emparejadas con estas personas necesitan un emparejamiento nuevo. |
| `imp.changed.line` | This payroll was updated. Your amounts will be saved to the current version. | Esta nómina se actualizó. Tus cantidades se guardarán en la versión actual. |
| `imp.changed.line` | The pay period or payday of this payroll changed. Check that the file is for the new dates. | El período de pago o el día de pago de esta nómina cambió. Verifica que el archivo sea de las fechas nuevas. |
| `imp.changed.line` | This payroll was approved. Saving these amounts will now be a correction and needs a reason. | Esta nómina se aprobó. Guardar estas cantidades ahora será una corrección y necesita una razón. |
| `imp.changed.line` | This payroll is no longer available. Go to Payroll to find the current one. | Esta nómina ya no está disponible. Ve a Nómina para encontrar la actual. |
| `imp.changed.dismiss` | OK | Entendido |
| `imp.entry.title` | Import pay from another payroll system | Importar pagos de otro sistema de nómina |
| `imp.entry.titleCorrection` | Correct the imported amounts | Corregir las cantidades importadas |
| `imp.entry.line` | Add a CSV or JSON file, match each row to a person and check every amount to the cent. | Añade un archivo CSV o JSON, empareja cada fila con una persona y revisa cada cantidad al centavo. |
| `imp.entry.lineCorrection` | Add the corrected file. A linked payroll is created for you to review. | Añade el archivo corregido. Se crea una nómina enlazada para que la revises. |
| `imp.entry.action` | Import pay | Importar pagos |
| `imp.entry.actionCorrection` | Start a correction | Empezar una corrección |
| `exp.title` | Paid time export | Exportar tiempo pagado |
| `exp.steps[0]` | Review breaks | Revisa los descansos |
| `exp.steps[1]` | Plan | Planifica |
| `exp.steps[2]` | Send | Envía |
| `exp.steps[3]` | Finish | Termina |
| `exp.hold.title` | Choose who’s included first | Primero elige quién está incluido |
| `exp.hold.title` | The team or the timecards changed | El equipo o las hojas de tiempo cambiaron |
| `exp.hold.title` | This team is over the export limit | Este equipo pasa del límite de exportación |
| `exp.hold.title` | Finalize 2 timecards first | Primero finaliza 2 hojas de tiempo |
| `exp.hold.title` | This period is already complete | Este período ya está completo |
| `exp.hold.line` | Go through everyone on the team for this period on Time exports, then come back. | Repasa a todas las personas del equipo para este período en Exportar horas y vuelve aquí. |
| `exp.hold.line` | Review who’s included again on Time exports. The export uses exactly that list. | Revisa otra vez quién está incluido en Exportar horas. La exportación usa exactamente esa lista. |
| `exp.hold.line` | A paid time export covers up to 300 people. | Una exportación de tiempo pagado cubre hasta 300 personas. |
| `exp.hold.line` | Still open: Ana Rivera and Luis Ortiz. Paid time is exported only from finalized timecards. | Siguen abiertas: Ana Rivera y Luis Ortiz. El tiempo pagado se exporta solo de hojas de tiempo finalizadas. |
| `exp.hold.line` | The server already has a complete record of this period. Its files are on Time exports. | El servidor ya tiene un registro completo de este período. Sus archivos están en Exportar horas. |
| `exp.hold.action` | Open Time exports | Abrir Exportar horas |
| `exp.hold.action` | Open Timecards | Abrir Hojas de tiempo |
| `exp.hold.action` | Go to Payroll | Ir a Nómina |
| `exp.breaks.heading` | Decide every recorded break | Decide cada descanso registrado |
| `exp.breaks.lead` | Recorded time doesn’t say what is paid. Choose how each break is paid. NEVORA doesn’t choose for you and doesn’t decide what the law requires. | El tiempo registrado no dice qué se paga. Elige cómo se paga cada descanso. NEVORA no elige por ti y no decide lo que exige la ley. |
| `exp.breaks.attest` | Choosing “Unpaid meal” is your statement that the person was fully relieved of duty for that break. | Elegir «Comida sin paga» es tu declaración de que la persona quedó totalmente relevada de sus tareas durante ese descanso. |
| `exp.breaks.progress` | 12 of 38 breaks decided | 12 de 38 descansos decididos |
| `exp.breaks.undecided` | 26 to decide | 26 por decidir |
| `exp.breaks.personBreaks` | 1 break | 1 descanso |
| `exp.breaks.personBreaks` | 38 breaks | 38 descansos |
| `exp.breaks.personNone` | No breaks recorded | Sin descansos registrados |
| `exp.breaks.personDone` | All decided | Todos decididos |
| `exp.breaks.recordedAs` | Recorded as Lunch · Old San Juan | Registrado como Lunch · Old San Juan |
| `exp.breaks.choiceFor` | How the break of Ana Rivera on Mon, Sep 21 is paid | Cómo se paga el descanso de Ana Rivera del Mon, Sep 21 |
| `exp.breaks.treatment.PAID_REST` | Paid rest | Descanso pagado |
| `exp.breaks.treatment.UNPAID_RELIEVED_MEAL` | Unpaid meal | Comida sin paga |
| `exp.breaks.noneTitle` | No breaks were recorded in this period | No se registraron descansos en este período |
| `exp.breaks.noneLine` | The export says so. Paid time equals recorded time for everyone. | La exportación lo indica. El tiempo pagado es igual al tiempo registrado para todas las personas. |
| `exp.breaks.nobodyTitle` | Nobody is included in this period | No hay nadie incluido en este período |
| `exp.breaks.nobodyLine` | There are no hours to export. You can still confirm the period at the last step. | No hay horas que exportar. Aun así puedes confirmar el período en el último paso. |
| `exp.breaks.next` | Plan the export | Planificar la exportación |
| `exp.breaks.blocked` | Decide 1 more break to continue. | Decide 1 descanso más para continuar. |
| `exp.breaks.blocked` | Decide 26 more breaks to continue. | Decide 26 descansos más para continuar. |
| `exp.breaks.overLimit` | One person has more than 1,000 breaks in this period. Export a shorter period for them on Time exports. | Una persona tiene más de 1,000 descansos en este período. Exporta un período más corto para esa persona en Exportar horas. |
| `exp.breaks.lockedLine` | A batch was already sent, so these choices can’t change in this export. | Ya se envió un lote, así que estas decisiones no pueden cambiar en esta exportación. |
| `exp.plan.heading` | How the export will be sent | Cómo se enviará la exportación |
| `exp.plan.lead` | People are grouped so each file stays under the size limit. A person is never split between two batches. | Las personas se agrupan para que cada archivo quede bajo el límite de tamaño. Una persona nunca se divide entre dos lotes. |
| `exp.plan.batch` | Batch 1 of 3 · 11 people | Lote 1 de 3 · 11 personas |
| `exp.plan.detail` | Ana Rivera, Luis Ortiz, Mara Colón and 8 more · 418 breaks · 63.8 KB | Ana Rivera, Luis Ortiz, Mara Colón and 8 more · 418 descansos · 63.8 KB |
| `exp.plan.names` | Ana Rivera, Luis Ortiz, Mara Colón and 1 more | Ana Rivera, Luis Ortiz, Mara Colón y 1 más |
| `exp.plan.covered` | 30 people included · 1 with no time · 2 left out | 30 personas incluidas · 1 sin tiempo · 2 fuera |
| `exp.plan.planning` | Planning the batches… | Planificando los lotes… |
| `exp.plan.noBatches` | Nobody is included, so there is nothing to send. Go on to confirm the period. | No hay nadie incluido, así que no hay nada que enviar. Continúa para confirmar el período. |
| `exp.plan.tooBigTitle` | One person’s breaks don’t fit in a single file | Los descansos de una persona no caben en un solo archivo |
| `exp.plan.tooBigLine` | NEVORA doesn’t split a person between files. Export a shorter period for them on Time exports. | NEVORA no divide a una persona entre archivos. Exporta un período más corto para esa persona en Exportar horas. |
| `exp.plan.coverageTitle` | The people in this period changed | Las personas de este período cambiaron |
| `exp.plan.coverageLine` | Review who’s included again on Time exports, then start the export again. | Revisa otra vez quién está incluido en Exportar horas y empieza la exportación de nuevo. |
| `exp.plan.next` | Go to sending | Ir a enviar |
| `exp.plan.fixedNote` | Once the first batch is sent, the plan and the break choices are fixed for this export. | Cuando se envía el primer lote, el plan y las decisiones de los descansos quedan fijos para esta exportación. |
| `exp.run.heading` | Send each batch | Envía cada lote |
| `exp.run.lead` | Batches go one at a time. Each one is saved only when the server’s reply is checked against what was sent. | Los lotes van uno a la vez. Cada uno queda guardado solo cuando la respuesta del servidor se compara con lo que se envió. |
| `exp.run.status.waiting` | Waiting | En espera |
| `exp.run.status.sending` | Sending… | Enviando… |
| `exp.run.status.saved` | Saved | Guardado |
| `exp.run.status.unknown` | Not confirmed | Sin confirmar |
| `exp.run.status.refused` | Not accepted | No aceptado |
| `exp.run.status.blocked` | Stopped | Detenido |
| `exp.run.sendAll` | Send batches | Enviar lotes |
| `exp.run.sendRest` | Continue sending | Seguir enviando |
| `exp.run.sending` | Sending… | Enviando… |
| `exp.run.checkBatch` | Check this batch | Verificar este lote |
| `exp.run.checkBatchFor` | Check batch 2 | Verificar el lote 2 |
| `exp.run.download` | Download CSV | Descargar CSV |
| `exp.run.downloadFor` | Download the CSV for batch 1 | Descargar el CSV del lote 1 |
| `exp.run.unknownLine` | The reply didn’t arrive or couldn’t be verified. Checking sends the exact same file again, so it can’t be saved twice. A changed file is never sent under the same receipt. | La respuesta no llegó o no se pudo verificar. Verificar envía exactamente el mismo archivo otra vez, así que no puede guardarse dos veces. Un archivo cambiado nunca se envía con el mismo recibo. |
| `exp.run.conflictLine` | The timecards, the people or the file format changed after this plan was made, and the server has no record of this batch. This plan stops here. Start a new export from Time exports. | Las hojas de tiempo, las personas o el formato del archivo cambiaron después de hacer este plan, y el servidor no tiene constancia de este lote. Este plan se detiene aquí. Empieza una exportación nueva desde Exportar horas. |
| `exp.run.duplicateLine` | These hours were already exported under a different receipt, which can’t stand in for this batch. This plan stops here. Open Time exports to see the files that were sent. | Estas horas ya se exportaron con otro recibo, que no puede sustituir a este lote. Este plan se detiene aquí. Abre Exportar horas para ver los archivos que se enviaron. |
| `exp.run.refusal.LEGACY_MAPPING_REVIEW_REQUIRED` | The saved file format needs a review on Time exports before it can be used. | El formato de archivo guardado necesita una revisión en Exportar horas antes de usarse. |
| `exp.run.refusal.BREAK_CLASSIFICATION_REVIEW_REQUIRED` | The breaks in this batch changed. Start a new export and decide them again. | Los descansos de este lote cambiaron. Empieza una exportación nueva y decídelos otra vez. |
| `exp.run.refusal.PAID_TIME_REVIEW_REQUIRED` | The break choices are needed for paid hours. Start a new export. | Hacen falta las decisiones de los descansos para las horas pagadas. Empieza una exportación nueva. |
| `exp.run.refusal.INEXACT_HOURS` | Some hours can’t be written exactly with the file’s decimals, and NEVORA doesn’t round for you. Choose a rounding rule in the file format on Time exports. | Algunas horas no se pueden escribir exactas con los decimales del archivo, y NEVORA no redondea por ti. Elige una regla de redondeo en el formato de archivo en Exportar horas. |
| `exp.run.refusal.PROVIDER_EMPLOYEE_MAPPING_REQUIRED` | Someone in this batch has no ID for your payroll system. Add it in the file format on Time exports. | Alguien de este lote no tiene ID para tu sistema de nómina. Añádelo en el formato de archivo en Exportar horas. |
| `exp.run.refusal.FINALIZED_TIMECARDS_REQUIRED` | A timecard in this batch is no longer finalized. Finalize it, then start a new export. | Una hoja de tiempo de este lote ya no está finalizada. Finalízala y empieza una exportación nueva. |
| `exp.run.refusal.INVALID` | The server didn’t accept this batch. Start a new export from Time exports. | El servidor no aceptó este lote. Empieza una exportación nueva desde Exportar horas. |
| `exp.run.next` | Go to finish | Ir a terminar |
| `exp.run.allSaved` | Every batch is saved. | Todos los lotes están guardados. |
| `exp.run.progress` | 1 of 3 batches saved | 1 de 3 lotes guardados |
| `exp.finish.heading` | Finish | Termina |
| `exp.finish.incompleteTitle` | Not complete yet | Todavía no está completo |
| `exp.finish.missing` | Batch 2 of 3 (11 people) hasn’t been sent. | El lote 2 de 3 (11 personas) no se ha enviado. |
| `exp.finish.missing` | Batch 2 of 3 (11 people) is being sent. | El lote 2 de 3 (11 personas) se está enviando. |
| `exp.finish.missing` | Batch 2 of 3 (11 people) is not confirmed. | El lote 2 de 3 (11 personas) está sin confirmar. |
| `exp.finish.missing` | Batch 2 of 3 (11 people) was not accepted. | El lote 2 de 3 (11 personas) no fue aceptado. |
| `exp.finish.missing` | Batch 2 of 3 (11 people) is stopped. | El lote 2 de 3 (11 personas) está detenido. |
| `exp.finish.missing` | The server hasn’t confirmed the period yet. | El servidor todavía no ha confirmado el período. |
| `exp.finish.missing` | The server is confirming the period. | El servidor está confirmando el período. |
| `exp.finish.missing` | The server’s confirmation of the period didn’t arrive. | La confirmación del período no llegó. |
| `exp.finish.missing` | The server didn’t confirm the period. | El servidor no confirmó el período. |
| `exp.finish.backToRun` | Back to the batches | Volver a los lotes |
| `exp.finish.confirm` | Confirm the period | Confirmar el período |
| `exp.finish.confirming` | Confirming… | Confirmando… |
| `exp.finish.check` | Check again | Verificar otra vez |
| `exp.finish.confirmLead` | Every batch is saved. The last step asks the server to check that they cover exactly the people included in this period. | Todos los lotes están guardados. El último paso le pide al servidor verificar que cubren exactamente a las personas incluidas en este período. |
| `exp.finish.unknownLine` | The confirmation didn’t arrive. Checking sends the exact same request again. | La confirmación no llegó. Verificar envía exactamente la misma solicitud otra vez. |
| `exp.finish.refusedLine` | The people, the finalized time or an export changed, so this plan can’t be confirmed. Its saved batches stay on record. Review the period on Time exports. | Las personas, el tiempo finalizado o una exportación cambiaron, así que este plan no se puede confirmar. Sus lotes guardados quedan registrados. Revisa el período en Exportar horas. |
| `exp.finish.completeTitle` | Paid time export is complete | La exportación de tiempo pagado está completa |
| `exp.finish.completeLine` | 30 people in 3 batches for Sep 21 – 27. Every batch is saved and the server’s record of the period matches them. | 30 personas en 3 lotes para Sep 21 – 27. Todos los lotes están guardados y el registro del período en el servidor coincide con ellos. |
| `exp.finish.scope` | This is a record of hours. It doesn’t show that a file was loaded into your payroll system, and NEVORA doesn’t pay anyone. | Esto es un registro de horas. No demuestra que un archivo se cargó en tu sistema de nómina, y NEVORA no le paga a nadie. |
| `exp.finish.openExports` | Open Time exports | Abrir Exportar horas |
| `exp.changed.title` | The timecards or the people changed | Las hojas de tiempo o las personas cambiaron |
| `exp.changed.line` | Your choices are kept, except 2 breaks that are no longer there. | Tus decisiones se conservan, menos 2 descansos que ya no están. |
| `exp.changed.line` | Your break choices are kept. | Tus decisiones de descansos se conservan. |
| `exp.changed.dismiss` | OK | Entendido |
| `exp.entry.title` | Paid time export | Exportar tiempo pagado |
| `exp.entry.line` | Decide every recorded break, then send the hours in batches. | Decide cada descanso registrado y envía las horas por lotes. |

## Follow-up (coordinator review, Nov 17)

Patch with only this follow-up: `p4patches/b2.patch` (from `08d32124`, the HEAD of `b.patch`, to the new HEAD; 3 files, +14 / −7). `b.patch` is unchanged.

### 1. The hydration message and the "1 Issue" badge

- **Cause: the capture tool, not the app.** The mismatching element is the shell's search field (`CommandFinder`'s `<input>` in the top bar). The console text ends with `- style={{caret-color:"transparent"}}` on that input. Playwright hides text carets while it takes a screenshot by setting that inline style on inputs. My capture took its "first frame" loading picture about 40ms after navigation, so on some loads the style was on the input at the moment React hydrated it, and React reported an attribute it did not render. Next's dev overlay then kept the badge for the rest of that page's life, which is why it was on the Send and Finish pictures at 390.
- **Reproduced:** 80 loads at 390 with a screenshot 10 to 130ms after navigation gave 22 hydration warnings, all on that input. 200 loads without the early screenshot gave none. Nothing in the two flows, the frame or the stylesheet is involved, and a person never sees it (no browser sets that style).
- **Fix:** the early loading pictures now pass `caret: 'initial'`, so the tool leaves inputs alone during hydration. No app code changed for this.
- **Assertion added to the capture:** every page of every context records any console message matching `hydrat`, `did not match` or `didn't match`, and the run ends with a `hydration-assert` step that fails if there is one. Final run: 0 messages, including 80 more early-screenshot loads across 1440, 900, 390 and 320.

### 2. Batch cards on the Send step

- "Download CSV" is now the tinted pill (`b-rowact b-rowact--go`, the same as "Check this batch"), 44px tall, starting on the batch title's left edge.
- "Not confirmed" is an amber chip in the same place and size as "Saved". It looked like indented text because the whole card was filled amber and the chip's own amber fill vanished into it. A batch that needs attention now keeps the white card and takes a 1.5px amber edge (red for "Not accepted" and "Stopped"), so every state chip lines up down the list.

### 3. The same kind of slip elsewhere (390 and 320, every step of both flows)

- **Review amounts, a row that is off:** the "Corrected" chip had the same problem (amber chip on the amber row, read as indented text). It now has a white fill and an amber edge on that row.
- **Finish "Not complete yet", the import's "Something changed" card:** the list of what is missing was bulleted, which pushed the words about 20px in from the card title's edge. Lists inside a state card are now plain lines on the title's edge.
- **Every row action is at least 44px tall** at every width (it was 44 only by its own height on touch).
- Looked at and left as they are: "Undo" beside a corrected amount and "Clear match" inside the person field are quiet text buttons by design (the secondary action next to a value), each with its own focus ring and a 44px touch height; the "N to match" and "N to decide" chips are the kit's one chip size; the bulleted lists in the "What the file needs" and "What happens next" panels are content lists, not states.
- Still open, as before: at 320 the header's "Back" comes close to the longest step line.

### Checks after the follow-up

- Type check clean; lint clean on the package.
- `npx vitest run --dir src src/components/payroll-import src/components/payroll src/app/app/b-viewport.test.ts src/app/app/b-foundation.test.ts`: 24 files, 396 tests, all pass. The full unit run was not repeated (the follow-up changes CSS, one class name and one removed constant).
- Capture at 1440, 900, 390 and 320 on the follow-up code: 84 steps, all passed; overflow 0; no touch target under 44px; `hydration-assert` passed with 0 messages.
- Evidence: all 29 Owner pictures were retaken from this run and replaced under the same names, so none shows the badge. The Manager picture is unchanged (it never had one). The scan logs in the folder now all hold this run's log; `scan-log-followup-1440-900-390-320.json` is the one to read.
