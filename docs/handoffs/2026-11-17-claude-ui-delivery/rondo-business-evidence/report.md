# Package F: Rondo business records page and the evidence card in answers

Base `c30f530e`. Patch `f.patch` (15 files, 2,295 lines added). Nothing pushed, no branch, main checkout untouched.
Signed-in screen, so it renders English. Spanish copy is complete and proven by unit tests only.

## What was built

- **`/app/ai-manager/business` (Business records).** Company-wide Owner with the adviser on. Same server guard as
  `/app/ai-manager/knowledge`, copied line for line. Views by query string, as knowledge does:
  list, `?view=new[&record=]`, `?view=record&record=`, `?view=version&record=&version=`.
  - List: each record with type, currency, period and state. Withdrawn records in their own section. A read-only
    "Main records" card (the published coverage map).
  - Add a record or a newer file: name, type, currency, where it comes from, how long it counts as current, first and
    last day, data time, whole period or part, a `.csv` or `.json` file. For a CSV the Owner says what each column is,
    how amounts are written, and the values that are the same for every row (location is picked by name). Nothing is guessed.
  - Review: summary, the server's totals, things to check, every row, good to know, then Publish with its own
    acknowledgement, or Discard with its own confirmation.
  - One record: status, versions with their state, details, withdraw and delete with their own confirmations.
- **Evidence card in a Rondo answer.** A business citation in the answer's source list is a button. It opens a card
  with the figures, what they measure, the period, locations, what counts, when it was checked, its state, the
  qualifiers, the record, "Open record" and "Open as plain text". Built in `Sources` in `advisor.tsx` (the list that
  already renders weekly and guidance citations), not a fork.
- **Navigation.** "Business records" beside "Weekly plan" and "Company knowledge" in the AI manager band. No sidebar item
  (knowledge and weekly have none).

## Contract coverage

| Requirement | Status | Endpoint / module |
| --- | --- | --- |
| Page behind the knowledge guards | done | `src/app/app/ai-manager/business/page.tsx` |
| List of records with source, period, state | done | GET `/api/owner/advisor/business`; `business-client.ts` `recordSummary`, `versionState` |
| Add or import, then review before publish | done (JSON and mapped CSV) | POST `stage_source_version`, `read_source_version` |
| Publish only on the server's receipt | done | `publish_source_version` with the read's `receipt.revision`, `version.digest`, `readReceiptId`, `acknowledged` (answer 4) |
| Review expiry from the returned time | done | `readReceiptExpiresAt` used as given, 3 s margin; never computed |
| Privacy lease on rows | done | rows cleared at `validForMs` or when the Owner steps away; renewed by a fresh full read while the Owner is active (2 minutes idle stops it) |
| Uncertain publish looks up the original | done | `check_source_operation`, fresh requestId, original operationId; exact command in memory only |
| Pending storage is content-free | done | `sessionStorage` holds `operationId, op, sourceId, versionId, mapVersionId, authority` only (answer 7) |
| Conflict shows what is current and asks again | done | 409 → card with "See what's current", list reloaded, acknowledgement reset, fresh read |
| Expired never offered as current | done | `currentUntil` (earlier of data time and period end, plus the record's allowance). List says "Past period", detail says "Past periods only" |
| Withdraw, delete, discard with own confirmations | done | `withdraw_source`, `delete_source` (record `revision` + `scopeDigest`), `discard_source_version` |
| Flags table (answer 8) | done | imports off: one card, no list; pending check kept; copy differs when retrieval is on |
| Closed code lists with EN/ES copy | done | all seven lists; `copy.test.ts` checks every code |
| Error envelope | done | `isBusinessErrorResult`; unknown envelope fails closed |
| Evidence card from checked evidence only | done | `evidence-card.tsx`; any unknown code or bad amount → no card, plain link |
| Detail: who published it | waiting on Codex | `BusinessVersionView` has `publishedAt` but no publisher. The time is shown |
| Card: "replaced" state | partly | The card shows current when checked, checked earlier, past period, or not available. Replaced is not in the evidence; it shows on the record page the card links to |
| Coverage map editor (plan item) | not done | Read-only display only. Stage/read/publish of a map is not built |
| Query panel (plan item) | not done | The page sends no `query_*`; the parser refuses a query result |
| Codex acceptance: exact read/publish/recovery gates | done for source versions, not for maps | as above |
| Model runs and 50-question scoring | not done, out of scope | No model was called |

## States

| State | How produced | Evidence |
| --- | --- | --- |
| Empty | real local server | `business-empty-1440`, `-390` |
| Loading | real server, response delayed in the page | `business-loading-900` |
| List, mixed states | forced (fixture catalog) | `business-list-1440`, `-900`, `-390` |
| Add form with CSV mapped | real | `business-add-mapped-1440` |
| Form errors | real (client checks) | `business-add-errors-1440` |
| Review (draft, 32 rows) | real stage and real full read | `business-review-1440`, `-390` |
| Review with findings | forced (fixture read) | `business-review-findings-900` |
| Publish in progress | real, request delayed | `business-publishing-1440` |
| Published record | real publish | `business-record-1440` |
| Unknown after a lost reply | real: the stage committed (200 saved), the reply was dropped in the page | `business-unknown-1440` |
| Unknown after reload | real | `business-unknown-reloaded-1440` |
| Recovery | real `check_source_operation` returned the receipt and opened the review | scan log `recovery-real-check` |
| Conflict | forced 409 on publish | `business-conflict-1440`, `-390` |
| Rows hidden | forced read, then step away | `business-review-hidden-390` |
| Discard | real discard | scan log `discard-confirm-real` |
| Delete confirmation | real page, not confirmed | `business-delete-confirm-1440` |
| Error, offline | forced | `business-error-900`, `business-offline-390` |
| Not available | real, child flags off | `business-off-1440` |
| Not an Owner | real, Manager sign-in | `business-not-owner-1440` |
| Partial, replaced, past record, retrieval-only off, 320 | forced / real | in `p4f-work/run4`, `ro`; unit tests |
| Card open, focus on citation, inside, back | answer forced through the offline "Prepare coverage options" path; no provider | `card-open-1440`, `-390`, `card-focus-*-1440` |

Overflow was 0 on every captured route and width (1440, 900, 390, 320). No page errors.

## Keyboard and focus

- Review: rows box → acknowledgement (Space) → Publish (Enter). Focus ring on each (`business-publish-focus-1440`).
- A problem or unconfirmed card takes focus when it appears. Confirmations focus their heading. A new view focuses its title.
- Card: Tab to the citation, Enter opens and focus moves to the card, Tab goes Close → Open record → Open as plain text,
  Escape closes and focus returns to the citation. Recorded at 1440 and 390 in the scan log (`card-1440`, `card-390`).
- Form error focus goes to the first invalid field. The kit's field shows its ring by box shadow.

## English and Spanish

Signed-in surface: renders `en`. All strings are in `business/copy.ts` with `en` and `es`. `business-page.test.tsx`
renders 26 states in Spanish and checks no English string leaks; `render.test.tsx` does the same for the card.
One existing English word stays in the card line: "Observed" (the adviser's own source line, not mine).

## Copy

396 strings per language. The full table is at
`/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-CLAUDE-CODEX-COLLAB/d762c6df-53eb-43b4-836f-475a53cde009/scratchpad/p4f-work/copy-table.md`.
No payroll sentence. Sentences that carry scope and need Jose's eye:
- "This is your own record. NEVORA doesn't verify it, and it isn't an audit."
- "I reviewed the rows, the period and the things to check, and I want Rondo to use this version"
- "Rondo only knows the accounts you list. Shared cash isn't split by location."
- "Rondo chats and text already sent to the AI provider stay" (reused from knowledge)
- Figure notes: "not cash", "not profit", "not tax due", "includes unconfirmed".
- "Not confirmed yet" / "Your publish may have gone through. Checking can't apply it twice."

## Checks run

- `tsc --noEmit -p .`: clean in `src`.
- `eslint` on `src/components/owner-advisor`, `src/app/app/ai-manager`, the fixture: clean.
- `vitest run --dir src src/components/owner-advisor src/lib/owner-advisor src/app/app`: 141 files, 1,607 tests pass (final tree).
- Full `vitest run --dir src src/app src/components src/lib`: 13,158 pass, 1 fail (`weekly-plan.test.ts` timing, under
  load with captures running; passes alone). Run before the last three small edits (due date format, reset after a
  failed publish, one CSS margin). `manual-publication.test.ts` fails as expected when run directly.
- New tests: client 51, copy 9 (with client), page 49, card 6.
- Captures: `run4` (owner, all flags), `off`, `ro`, `mgr`.
- Not run: axe, 200% text size, reduced-motion comparison (the page adds no motion), a real model answer.

## For Codex

1. Every `read_source_version` reserves one of the workspace's 10,000 operation rows. Renewing the 15-second lease
   during a review spends one per renewal. I stop renewing after 2 minutes idle. Please confirm, or offer a renewal that
   reserves nothing.
2. A 409 can arrive after `store.execute` committed (the stamp in `finish` runs after). I treat conflict as refused and
   reload the list, which shows the truth. Please confirm that is the intended reading.
3. No publisher identity on a version. Needed for "who published it".
4. Evidence in an answer carries no "replaced" or current-version fact, and `expiresAt` is at most 15 seconds, so nearly
   every card reads "Checked earlier" by the time it is read. Confirm the wording is acceptable.
5. `public-business-evidence.ts`: I added two exports of the existing metric checks. No rule changed.

## For Jose to decide

- Past-period records read "Past period" in grey, not an amber chip. Say if you want the chip.
- Whether the coverage map editor and the query panel should be built next.
- The capture harness needed the adviser flags passed to the app; I changed my copy of the tool only.

## Needed from another package

None.

## Not verified

- Withdraw and delete against the real server (confirmations shown, commands unit-typed, not sent).
- JSON import against the real server (CSV was).
- EUR records, finance import through the form, two-Owner drafts.
- The `business-add-mapped` picture predates a 6px legend spacing fix.
- Card with a real model answer.

---

# Follow-up: main records (coverage map) editor and the figures check (query panel)

Patch `f2.patch` (10 files, 751 lines added), a diff from the first delivery's HEAD `6978cf0b`. Everything else is as delivered.
New code is in `src/components/owner-advisor/business/business-map.tsx`. English renders; Spanish is proven by unit tests.

## What was built

- **Main records** at `/app/ai-manager/business?view=map`, opened from a "Main records" row on the list (it replaces the
  read-only card). It shows what is in use, a draft waiting, and the editor.
  - Editor: accounts (name; the whole company or one location by name) and entries (record, what it covers, Main or
    Cross-check, first and last day, accounts or locations). Only records with a published version can be chosen.
  - Phone: each account or entry is a summary row; one opens at a time. From 768px every item shows its fields as a grid row.
  - Save draft → `stage_coverage_map` → review at `?view=map&map=<id>` → `read_coverage_map` → Publish or Discard.
- **Check figures** at `?view=figures`, opened from a "Check figures" row on the list. Choices: Sales or Cash and bills;
  Current or A past period; first and last day; Main records or One record; All locations or chosen ones (up to 20).
  It sends `query_sales` or `query_finance` (`scenario: null`) to the same endpoint.
- The page's parser did refuse query results: that was my own client's rule from the first delivery, not the answer
  parser's. `business-client.ts` now parses `result` strictly (exact fields, closed codes, canonical scope, metric
  shapes, citation link form). The answer parser (`public-response.ts`, `public-business-evidence.ts`) is untouched.

## Contract coverage

| Requirement | Status | Endpoint / module |
| --- | --- | --- |
| Accounts: company shared or one location | done | `MapEditor`; `COMPANY_SHARED` / `EXCLUSIVE_LOCATION` |
| Entries: PRIMARY / CORROBORATING, metric, window, currency, scope | done | metric by the record's type; currency and domain taken from the record |
| Stage with the list's map revision | done | `stage_coverage_map`, `expectedRevision = catalog.mapRevision ?? 0` |
| Publish with the read's revision, digest, receipt | done | `publish_coverage_map`; `read_coverage_map` receipt, 3 s expiry margin |
| Conflict resets the acknowledgement and re-reads | done | observed in the browser: checkbox cleared after the forced 409 |
| Unconfirmed publish looked up by original identity | done | `check_source_operation`; storage holds `mapVersionId` and no content |
| Discard with its own confirmation | done | `discard_coverage_map` (unit-rendered; not sent to the real server) |
| States the perimeter and shared-cash limits | done | note under the cards; acknowledgement copy |
| Privacy lease on the map review and on figures | done | same rule as rows: renewed while active, hidden otherwise |
| Query: finance or sales, window, scope, perimeter or source, current or historical | done | `query_finance` / `query_sales` |
| Result with tabular figures and source record and state | partly | Figures per currency. The records and their state are listed per currency group, not per single figure: the server's totals are not broken down by record |
| Unavailable, partial, empty, error | done | one card with the reason for each of the 11 codes; "Part of what you asked isn't covered"; "No figures for this period" |
| Finance scenario (later, optional) | not done | The panel always sends `scenario: null`; no scenario picker |
| Panel when imports are off, retrieval on | not done | The contract allows the query, but the page has no list then (no record or location names), so the panel is not offered |
| Map draft by another Owner | waiting on Codex | A map has no `publishEligible`; I can't hide Publish for a draft the Owner can't adopt |

## States

| State | How produced | Evidence |
| --- | --- | --- |
| Map: none yet | real | `map-none-1440`, `-390` |
| Map: editor, desktop grid / tablet / phone one-at-a-time / 320 | real | `map-editor-1440`, `-900`, `-390`, `-320` |
| Map: editor error, focus on the field | real (client check) | `map-editor-error-1440` |
| Map: under review | real stage and real full read | `map-review-1440`, `-390` |
| Map: draft waiting | real | `map-draft-1440` |
| Map: focus on Publish | real | `map-publish-focus-1440` |
| Map: conflict | forced 409 | `map-conflict-1440` |
| Map: unknown | real: the publish committed (200 saved), reply dropped in the page | `map-unknown-1440`, `-390` |
| Map: recovery, then published | real `check_source_operation` | `map-published-1440`, `-900` |
| Map: review with a cross-check and a location account | forced read (fixture) | `map-review-forced-390` |
| Map: loading, error, offline, expired review, Spanish | unit tests; page-level cards are the ones already captured | none |
| Figures: form, keyboard focus | real | `figures-form-1440`, `figures-focus-1440` |
| Figures: result from main records | real query | `figures-result-1440`, `-900`, `-390`, `-320` |
| Figures: unavailable | real (cash query with no cash record) | `figures-unavailable-1440`, `-390` |
| Figures: one record, past period, one location | real | `p4f-work/run6/figures-one-record-1440.png` |
| Figures: hidden | real result, then step away | `figures-hidden-1440` |
| Figures: error | forced 503 | `figures-error-390` |
| Figures: with things to check; partial | forced (fixture) | `figures-findings-forced-1440`, `figures-partial-forced-390` |
| List with the two new rows | real | `business-list-real-v2-1440` |
| `business-add-mapped-1440` | retaken after the 6px fix | replaced |

Overflow 0 at every captured width. No page errors. Scan log: `scan-log-run6.json`.

## Keyboard and focus

- Editor: "Add an entry" moves focus to the new entry's first field. A failed save opens the first bad item and focuses it.
- Map review: checkbox (Space) → Publish (Enter), ring shown.
- Figures: Tab order is first day, last day, read from, locations, Show figures. A failed submit focuses the first bad field.

## Copy added (English / Spanish in `copy.ts`)

About 70 strings. The ones that carry scope:
- "Rondo uses this as the whole picture, for every Owner."
- "I reviewed the accounts and entries, and I want Rondo to count these as my main records"
- "You choose what is listed. NEVORA can't tell if an account is missing."
- "Main records are counted once. A cross-check is never added to them."
- "Until then Rondo reads one record at a time."

## Checks run

- `tsc`: clean in `src`. `eslint` on the adviser folder, route and fixture: clean.
- `vitest run --dir src src/components/owner-advisor src/lib/owner-advisor src/app/app`: 142 files, 1,645 tests pass.
- New tests: `business-map.test.tsx` (38). The full repository suite was not rerun for the follow-up.
- Capture `run6`: owner, all flags.

## For Codex (added)

6. A map draft carries no "can this Owner publish it" flag. If a second Owner opens another's draft, Publish is offered and the server decides.
7. Query totals are not attributed per record, so the panel names the records per currency group.
8. An empty map can be staged and published from the editor (the contract allows it). Say if it should be blocked.

## Not verified (added)

- Map discard, an account owned by one location, a cross-check entry and a cash entry against the real server.
- Two late edits are not in the pictures: the phone summary row now shows the period in words (the picture shows
  ISO dates), and the editor's two cards now have the page's usual gap between them.
