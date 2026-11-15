# Claude to Codex: UI rounds 1 to 3 are on the collaboration branch (Nov 15, 2026)

## Source and state

- Branch: `claude-codex-collab-nevora` on `origin` (`JoseK0514/NEVORA`).
- UI commits, in order, on top of `ce4de4bc`:
  - `cb016437` Inspection fixes round 1, design system Phase 1, shared patterns Phase 2.
  - `8cfbc3ed` Phase 3: Owner and Manager screens on phone, tablet and desktop.
  - This handoff is the commit after `8cfbc3ed`; it changes documentation only.
- Backend: Jose reported the independent backend implementation complete at `7ea502252`. That commit was not reachable
  from `origin` when this was written (`origin/development` was `18c75692`, which is already merged here), so it is
  **not integrated** in this branch. No UI change here depends on it.
- Scope of the UI commits: presentation only. No server read, handler, authorization rule, route, data contract or
  calculation was changed. Local fictional data only; no deploy, no real notification, no paid service.

## Release sequence (unchanged)

Development is the working and acceptance release. Codex integrates this branch with the backend on development and
verifies the combined build there. The exact verified release is promoted to main only after Jose approves. Nothing in
this handoff authorizes a main merge, a production activation, copied production data, a paid activation or a live charge.

## Results on `8cfbc3ed`

| Check | Result |
|---|---|
| `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .` | Clean |
| `npx eslint` on the 81 TypeScript files Phase 3 changed | Clean |
| `npx vitest run --dir src` (909 files) | 13,184 pass, 801 skipped, **1 fails**: `src/test/manual-publication.test.ts` |
| Browser captures, real sign-in, owned local Postgres, fictional data | Owner (38 routes), new Owner (4), Manager (9), Employee (16) at 1440, 900 and 390: no page errors, no horizontal overflow, Employee pages unchanged |

## Pending checks for the combined integration (not run by Claude)

1. **User manuals.** `src/test/manual-publication.test.ts` binds the published manuals to the exact application source
   and fails after any source change. `docs/guides/web` needs the new labels and screens (kiosk Employee ID then PIN,
   attendance words, Payroll header and rail, Things to do, closed pages, sidebar order), then a rebuild on the
   integrated commit.
2. **Browser integration suites** in `src/test/integration`: not run locally. On GitHub the "Mobile Access" workflow
   fails on `cb016437` with three tests: `mobile-access-browser.integration.ts`,
   `mobile-access-landscape.integration.ts` and `commerce-recovery-browser.integration.ts`. The same three failed on
   `ce4de4bc` before any of this work. The commerce recovery test now fails differently (a 15s locator timeout; before,
   a strict-mode match on `.ad-reference`), because round 1 rebuilt the billing pages: its selectors need updating.
3. **QA scripts** in `scripts/`: not run. See "Will fail until updated" in
   `docs/handoffs/2026-11-14-claude-to-codex-inspection-fixes.md` (kiosk flow, renamed labels) plus the Phase 3 list below.
4. **Production build** (`next build`): not made.
5. **By hand:** real touch device, Safari, screen reader, Windows High Contrast, a Manager kept to some locations, a
   payroll-reviewing Manager.

## Phase 3: labels and looks that tests or scripts may match on

- Sidebar and rail count badge: one teal pill (was red). Manager sidebar order: Home, Things to do, Schedule, Time, Team;
  second group has no heading and gains Scheduling rules and My pay. Under 1024px Owners and Managers have no sidebar toggle.
- Things to do and Home: row titles lead with the person; "Time corrections", "Timecards to approve" (no "· waiting");
  the open period's timecards are one "Not open yet" card; Home headline "N things need you · M timecards to approve".
- Schedule grid: one "N open" chip button per day (`aria-expanded`), replacing "N not filled" and per-shift time chips;
  the list of that day's open shifts renders under the row when opened.
- Timecards: "In progress" and "Clocked in now" are plain text (no chip); a "You" chip on the viewer's own row;
  "Jose approves this one"; success block "Approved" / "7 of 12 done".
- Time corrections: the heading "Correction requests N" is for screen readers only; the count is in the band's sub-line.
- Time exports: one line, "Timecards for Nov 9 – 15 can be approved from Mon, Nov 16."
- Payroll desktop: "Up next" is in a right rail from 1024px; amounts carry "Net" beneath.
- Requests and Shift requests: buttons inline from 768px; opened shift request is a definition list (full names, dates,
  times, place, position, reason, note all still shown; `manager-workflows.test.tsx` asserts them).
- Notifications (Owner and Manager): consecutive rows of one kind fold into one row.
- Closed pages for a Manager: new titles and lines (MG-002, MG-009), "Open Timecards", "See my pay".
- Forms: validation messages without a closing period ("Enter a first name").

## Behaviour next to the server, for your review

1. **Badge count meaning.** `needsYou().count` (`src/lib/action-center/needs-you.ts`) now includes time corrections that
   wait on the reviewer, and leaves out the reviewer's own timecard. `readInboxCount` calls it, so
   `/api/manager/inbox-count` returns the new number without a server edit. Any push or digest that quotes this count
   follows it.
2. **`listEmployees()` on two more pages.** `src/app/app/timecards/page.tsx` and the Profile page call the existing
   loader to name the Owner who approves a Manager's own timecard or can change their details. A failed read falls back
   to "An Owner". Confirm the read is acceptable there, or carry the names on the page's own read.
3. **Settings layout and Payroll notice.** `src/app/app/settings/layout.tsx` and the Manager's Payroll notice were
   reworked for the new closed-page card. The guards are unchanged and still tested (a Manager is never shown the page;
   a sign-in redirect is not swallowed). Please read the diff once, since it sits next to authorization.
4. **Folded notifications** mark every unread notification inside the fold as read when opened, through the existing
   mark-read path.
5. **A 503 under load.** While six builds ran in parallel, first loads of Things to do, Notifications and the access
   check sometimes returned 503 ("Things to do didn't load", "Notifications didn't load", "Couldn't check your access").
   It did not happen in the final run on a quiet machine. Not traced; it may be the local database's statement timeout.

## Server fields the UI is waiting for

Each finding below is built as far as today's reads allow. The tracker marks them "partly".

| Finding | What is missing | Where the UI would read it |
|---|---|---|
| OW-002 (Things to do) | Which punch a correction changes and by how many minutes | `presentItem` in `src/lib/action-center/present.ts` |
| OW-002 (Notifications) | For manager summary rows: counts by kind, the person, the outcome | `GET /api/notifications` items |
| MG-012 | A swap's second shift (date, time); whether a can't-work report has cover | `itemRow` in `src/components/manager-inbox-corp.tsx` |
| MG-004 | A boolean for "this item is the reviewer's own" (today inferred from the item title); the Owners' names on Home's read; who may approve an Owner's own card | `needs-you.ts`, `home-b.tsx`, `timecards.tsx` |
| MG-003 | An "approve by" date for timecards | `PaydayTile` in `src/components/owner-b/home-b.tsx` |
| MG-011 | Minutes late on a Today shift (`late` is a boolean) | Home's "On now" card |
| MG-016 | The Remind action: the reminder wiring gate, the `authority` on `/app/availability`, eligibility states | Availability's "Not sent" card (`POST /api/manager/reminders` exists and is not called) |
| OW-028, MG-006 | An `overdue` number beside `count` | `/api/manager/inbox-count`, `src/components/use-inbox-count.ts` |
| OW-026 | Planned hours per day in the period report | `CorpReportsView` in `src/components/reports.tsx` |
| MG-013 | What a Manager's access covers; who can change their details | `readManagementProfile` |
| MG-002 | A way to ask the Owner from a closed page | not built |
| OW-016 (optional) | Scheduled hours per person on the timecards read | Timecards table |
| RA-16 | The workplace time zone on notification rows | `relativeTimeText` already takes a zone |
| BR-16 | Whether a time clock tablet is registered | Home's attendance tiles |
| OW-011 | `createdAt` typed on pending time-off rows (read through a cast today) | `time-off-waiting-list.tsx` |

Earlier requests still stand: see "Release blockers that need Codex", "Near-term items" and "Fields the screens asked
for" in `docs/handoffs/2026-11-14-claude-to-codex-inspection-fixes.md` (error logging, invitation delivery flag, flag
registry, pay statement PDF wording, 2027 rules, export of amounts).

## Where to read more

- `docs/product/review-2026-11-14/fixes/README.md` (round 1), `fixes/phase-1/README.md`, `fixes/phase-2/README.md`,
  `fixes/phase-3/README.md`, each with per-package reports and after screenshots.
- `docs/product/review-2026-11-11/status.json`: 78 fixed, 26 partly, 66 open. Open items are Employee and Lead screens,
  signed-out pages and system items (Phases 4 to 8).
- `DESIGN.MD`, section "Inspection fixes (November 15, 2026)": tokens, the frame, rows, states, and the Phase 3 rules.

## Decisions waiting on Jose

Listed in `fixes/phase-2/README.md` and `fixes/phase-3/README.md` under "For you to decide". None blocks integration.
