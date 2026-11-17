# Rondo company knowledge: Claude's UI slice for Codex's combined candidate

Date: November 16, 2026. Author: Claude (UI). Receiver: Codex (backend, hosting, acceptance candidate).

## Release sequence and where this sits

Jose's policy (Nov 12, 2026) applies: Development is the primary acceptance release, held to production standards;
main/production only after Jose approves the exact verified release. This is a **local, unpushed UI commit** on
`claude-codex-collab-nevora`. Codex combines it with the backend candidate in an isolated acceptance candidate, applies
migration 0064 on the explicitly selected development database, and verifies there. Nothing here deploys, pushes,
enables a flag, calls a model, sends a notification or touches real data.

## Source evidence

| Item | Value |
|---|---|
| UI branch | `claude-codex-collab-nevora` (this checkout, `/Users/josek0514/Desktop/NEVORA-CLAUDE-CODEX-COLLAB`) |
| Base of this commit | `40ccc4e4e5b74b48c8fd86ef50c4ec6efe9b4dd1` (collaboration tip, pushed earlier) |
| GitHub development at time of work | `22a9d598eb470cd380ee739d7396f06ecf335ed5` (not merged here; no change needed for this slice) |
| Backend contract read (read only) | Codex worktree `nevora-rondo-anthropic-20261115`, candidate `8738bc18`: `docs/handoffs/2026-11-15-rondo-company-knowledge-ui-contract.md`, `company-knowledge*.ts`, the two knowledge routes, `0064_owner_company_knowledge.sql` |
| Codex worktree tip seen at handoff | `da9104b4` (weekly proposals, 0066). No weekly UI was built; waiting for Codex's weekly-manager UI contract |
| Ownership check | No other UI task or worktree owned these surfaces (only Codex's `nevora-dead-ends` worktree exists besides this checkout); no knowledge UI existed in the repo |

No backend, schema, service, model or secret file was edited, and no backend code was cherry-picked. Client runtime
imports are browser-safe (no `node:crypto`, no server-only module).

## What was built

Route `/app/ai-manager/knowledge` (same door as the AI manager: company-wide Owner, `NEVORA_OWNER_ADVISOR_ENABLED`, company
authority). The knowledge API checks Owner and company authority itself; the page holds no knowledge text on the server.
CRUD needs no model credentials (retrieval stays behind Codex's separate `NEVORA_OWNER_ADVISOR_KNOWLEDGE_ENABLED`, default
false). The AI manager band now has a "Company knowledge" link.

Views (one client component; the address carries the view so Back, reload and links work):

- **Library** `?` (none): Business profile row; Documents list ("N of 20", "+ Add document" row); Archived list; one quiet
  privacy line. Row status is said once: a chip only for what needs a look (Draft, Draft waiting, Review due, Starts
  Nov 20); the normal state is grey text ("In use", "Ended Nov 15", "Archived").
- **Business profile editor** `?view=profile` and **document editor** `?view=new`, `?view=edit&doc=`: the app's sheet
  form (Cancel · title · Save on phones; back link, card and footer Cancel / Save draft on tablets and desktop). Profile:
  the six contract fields (only "What the business does" required), language, optional dates. Document: title, topic,
  language, plain text (paste, or load a UTF-8 `.txt`/`.md` decoded in the browser with a fatal decoder; PDF, Word and
  other encodings are refused with a sentence), live size against the limit, optional dates. Dates sit behind one
  disclosure, are entered in the company time zone and saved as ISO instants with offsets; the resolved time and zone
  show under each field (a time skipped by a clock change resolves forward; a repeated one takes the first).
- **Review** `?view=version&doc=&version=`: the exact saved text from the JSON view, as plain text (`pre-wrap`, long
  lines wrap, never interpreted), size, details, the server's text fingerprint, "Open as plain text" (the private
  text/plain route, new tab). **Publish for Rondo** appears only for the newest unpublished version and sends that
  view's `textDigest` as `reviewedTextDigest`; if the list and the text disagree it refuses to publish. The future-start
  gap is explained in an amber callout when a published version would be replaced early.
- **Document detail** `?view=entry&doc=`: status (in use, starts later, ended, archived; draft waiting; review date),
  every version, Archive (confirm) and Delete (confirm with "I understand this can't be undone"; says it erases every
  version's text, title and file name for every Owner, does not erase Rondo chats, and cannot recall text already sent
  to the AI provider). Archived entries can be edited; saving brings them back as a draft (matches the SQL).

Write handling (`src/lib/owner-advisor/knowledge-client.ts`): one UUIDv4 `requestId` per deliberate operation; the exact
command is kept while the outcome is unknown and only ever re-sent unchanged ("Check again"); a refused write gets a new
ID on the Owner's next deliberate attempt. 400 invalid, 409 conflict (reloads, keeps the Owner's edits), 429 limit,
network/5xx/unreadable success = uncertain. 401/403 on any read or write clears every knowledge value from the screen
and shows "Your session ended · Sign in". A missing schema or failed list read is "Couldn't load", never an empty
library. Confirmations are the app's toasts; problems are one state card at the top that scrolls into view and takes
focus. Leaving the page while a write is unconfirmed asks first (beforeunload).

## Files

- `src/lib/owner-advisor/knowledge-client.ts` (new): types, strict parsers (Postgres text timestamps included), limits,
  text normalization and checks mirroring the server, zoned date conversion, entry status, transport.
- `src/lib/owner-advisor/knowledge-client.test.ts` (new): 26 tests.
- `src/components/owner-advisor/knowledge/knowledge-page.tsx` (new), `views.ts` (new), `knowledge.css` (new, scoped to
  `.kn`, B tokens only; adds no rule to a shared sheet).
- `src/app/app/ai-manager/knowledge/page.tsx` (new): gate, workspace time zone, view from the address.
- `src/components/owner-advisor/advisor.tsx`: the "Company knowledge" link in the AI manager band.
- `docs/handoffs/2026-11-16-rondo-company-knowledge-ui/`: screenshots and the browser run log.

## Checks run

- `npx tsc --noEmit -p .`: clean. `npx eslint` on the changed files: clean.
- `npx vitest run src/lib/owner-advisor/knowledge-client.test.ts src/components/owner-advisor`: 14 files, 99 tests pass.
  `src/test/phosphor-icon-weight.test.ts`: pass. The full suite was not re-run for this slice.
- Browser (Playwright, the repo's ui-scan harness: a local Next app on an owned embedded Postgres with the fictional
  "Northside QA Workforce", Owner QAOWNER). **The knowledge API was MOCKED** by route interception with a stateful mock
  written from the contract (receipts, revisions, request-ID replay, digests, the version JSON and text views). The real
  API does not exist on this branch (it is in Codex's candidate with 0064). Run log: `browser-run.txt`.
  - Widths 320, 390, 430, 768, 1440 on the library; 320/390/1440 on the editors and review; 390/1440 on detail and delete.
    28 measured screens: no horizontal overflow and no clipped label, title, chip or button.
  - States: loading, failed list with retry, empty, full library, draft, published, future start, ended, review due,
    archived, deleted (opening it later shows "This isn't in company knowledge anymore"), conflict (edits kept, retry
    uses a new request ID), limit (429), invalid, uncertain publish (connection dropped after the server applied it;
    Check again re-sent the same request ID and got the stored receipt), revoked session (screen cleared, no knowledge
    text left in the page).
  - Keyboard and focus: every view change moves focus to the new title; a confirmation moves focus to its question; a
    problem card takes focus; Tab order on the library runs Add document, then rows in reading order.
  - Privacy and safety: pasted `<img onerror>`, `<script>` and `javascript:` text rendered as text (no element created,
    no script ran); the plain-text view opens in a new tab.
  - Reduced motion: nothing on these screens animates.
  - Not checked: screen-reader output (no assistive technology was run), real Safari/iOS, real network timing.

## For Codex: contract notes and questions

1. **Version JSON timestamps** are Postgres text (`2026-11-15 12:00:00.123+00`) while the list's are JSON ISO. The client
   reads both; an ISO form in the version view would be simpler.
2. **Publishing an older draft.** The SQL accepts any unpublished version; the UI offers Publish only for the newest one
   (an older draft says a newer one exists). Tell me if older drafts should be publishable.
3. **Archived + edit.** `draft_*` clears `archived_at`, so the UI lets Owners edit an archived entry and says saving
   brings it back as a draft. Confirm that is intended (it is how the SQL behaves).
4. **Archive clears `published_version`.** The detail shows earlier published versions as "Earlier"; there is no
   "last published before archive" pointer. Fine for now.
5. **Owner Spanish UI.** The Owner chrome is English everywhere today; the content language is a field
   ("English"/"Spanish"). Spanish screen copy was not written, because no Owner Spanish UI exists to follow.
6. **Uncertain custody survives only on this page** (memory, with a leave warning), not across a reload, to avoid storing
   document text in the browser. After a reload the Owner sees the library and decides; a replay with a new session
   would conflict anyway.
7. **Integration acceptance still owed (Codex):** apply 0064 on the chosen development database, join this commit, and
   repeat the real-API checks above, including private navigation to the text/plain view, the current-source races and
   EN/ES content, before any retrieval flag changes.

## Evidence

`docs/handoffs/2026-11-16-rondo-company-knowledge-ui/`: `d-library-320/390/1440`, `a-empty-390`, `e-profile-filled-390`,
`f-editor-1440`, `f-review-1440`, `g-gap-390`, `h-uncertain-390`, `o-entry-390`, `l-delete-confirm-1440`,
`k-revoked-390`, `c-failed-390`, `b-loading-1440`, and `browser-run.txt`. All on fictional data and the mocked API.

## Next

Waiting for Codex's weekly-manager UI contract. No weekly or import endpoint was invented.

## Craft pass (Nov 16, 2026)

The screens were revised to the app's own button pairs, rows, type sizes and spacing after Jose's review. Details, measurements
and before/after captures: `docs/handoffs/2026-11-16-ui-craft-pass/`. No contract, request or recovery rule changed.
