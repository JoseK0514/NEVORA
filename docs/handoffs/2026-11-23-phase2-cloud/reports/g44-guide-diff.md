# G44 prep: guide text against today's screens

The six published guides (`docs/guides/web/*.md`, listed in `docs/guides/web/sources.json`) were built from `198168ac`
(Nov 21). Their text was checked against the current screens at `f5f64a2c` (merged here as `daf09c01`), and the text
changes are drafted on this branch. **Nothing was rebuilt:** `scripts/manuals/build-manuals.mjs` was not run, the PDFs and
`docs/guides/web/publication/manifest.json` are unchanged, so `src/test/manual-publication.test.ts` still fails until Jose
approves a rebuild (rebuilding is publishing).

How: every bold or quoted label in the six guides was looked up in `src` at both commits; the screens each guide
describes were read in the current code (and the `198168ac..HEAD` diff for them); each proposed change was then
checked again in the code before it went into the guide. Only statements the current code contradicts were changed;
style was left alone.

Commits: `a3eb85f4` (Rondo), `2fcb5c6e` (Manager/Lead, Employee), this report's commit (Owner).

## Changes

| Guide | Section | Old text | New text | Evidence |
|---|---|---|---|---|
| Owner | Start with your company | **Home** leads with what needs you, then **Today**: | **Home** leads with what needs you (on a phone, a pay period with no payroll comes first, with **Prepare <period>**), then **Today**: | `7b7f7f41` (A5-01); `owner-b/home-b.tsx` |
| Owner | Add people and grant access | Use **Refresh invitation** for current state. If an action is unconfirmed, use **Check action outcome** before sending another invitation. | Use **Check invitation** for current state. If an action is unconfirmed, use **Check what happened** before sending another invitation. | `company-access/employee-invitation-panel.tsx` (the old labels exist in neither commit; the guide was already out of date) |
| Owner | Add people and grant access | **What a Manager can approve** sits under Management access | **What they can approve** sits under Management access | `workforce/permission-copy.ts` `panelTitle` |
| Owner | Business records | Open **AI manager → Business records**. | Open **Rondo AI → Business records**. | `lib/navigation.ts` (`Rondo AI`); "AI manager" is only in code comments |
| Owner | Time exports | refusal on **Who's included** and review again. | refusal on **Who’s included and sent files** and review again. | `payroll-export.tsx` (the section's name with payroll on; "Export history" without payroll) |
| Owner | Tablet setup and uncertain punches | Open **Clocker tablets** to register a tablet. | Open **Clocker tablets** and choose **Add tablet** (the last row of the list) to register a tablet. | `ea544c11` (Settings add pattern; the button became the list's last row) |
| Manager and Lead | Access table | Manager with location scope: Managed-location Home, schedule and limited team view; bounded draft-shift changes where offered | Home, Things to do, Schedule, Team and Time corrections for your locations; bounded draft-shift changes and **Publish** where offered | `lib/navigation.ts` (location scope adds Things to do and Time corrections); `schedule/page.tsx` (Publish with the Publish schedules grant) |
| Manager and Lead | Location-scoped Manager workflow, step 1 | On **Your workspace**, confirm the listed managed locations. | On **Home**, confirm the location named in the band, or choose it from the **Location** menu (**All your locations**) when you manage several. | `app/page.tsx` (location Manager's Direction B Home); "Your workspace" isn't in `src` |
| Manager and Lead | step 3 | Escalate publishing, company rules and protected changes to the Owner or a company-scoped Manager. | Use **Publish** only where it is offered; escalate other publishing, company rules and protected changes to the Owner or a company-scoped Manager. | `schedule/page.tsx` (`scopedPublish`) |
| Manager and Lead | step 4 | Open **Team at your locations** to review eligible people. This view omits contact details and employee editing; … | Open **Team** to review the people at your locations. Rows don't open a person's page, and the view omits contact details and employee editing; … | `employees/page.tsx`, `company-access/scoped-team.tsx` (title "Team"; rows aren't links) |
| Manager and Lead | Reminders | an Update's **Read by** list | an Update's **Confirmed** list | `communication-detail.tsx` (`BCard title="Acknowledged"`), renamed "Confirmed" by Jose's DEC6 |
| Employee | Shift changes | from Schedule or **Shift requests** | from Schedule or **Pick up and swap** | `exchange/page.tsx` (Employees and Leads see "Pick up and swap"; already the case at `198168ac`) |
| Rondo | Manager view, step 3 | Read **Week by day** for each day's … | Read **Published shifts and planned hours** for each day's … | `owner-advisor/manager/manager-rondo.tsx` (`CorpSection label`); "Week by day" isn't in `src` |
| Operations | none | | | Paths, flags, routes, scripts and limits it names are unchanged |
| Developer | none | | | Scripts, paths, migrations, constants and headers it names are unchanged |

## Aligned with Jose's wording decisions (DEC5–DEC10, Nov 23, 15:47–15:48; gaps ledger G96)
The guides follow the decided words even where the app change is still being built (payroll-2 builds DEC5, core builds
DEC6–DEC10), so the rebuild should wait until those land.

| Guide | Section | Old text | New text | Decision |
|---|---|---|---|---|
| Manager and Lead | Reminders | an Update's **Acknowledged** list (this draft) | an Update's **Confirmed** list | DEC6 "Acknowledged" → "Confirmed" |
| Owner | Build, review and publish a schedule, step 4 | Review acknowledgement status separately | Review confirmation status separately | DEC6 |
| Employee | Schedule | acknowledge the current published revision after reading it. Acknowledgement records that review | confirm the current published revision after reading it. Confirming records that review | DEC6 |
| Employee | Sign in | **Forgot password?** to request a reset link. | **Forgot password?** to request a link to set a new password. | "one-time link" → "a link to set a new password" |
| Employee | Sign in | Opening another reset link in the same tab | Opening another link to set a new password in the same tab | same |

Checked and not quoted by any guide, so nothing to change: the payroll export lines and hold-card buttons ("Timecards can
be approved from …", "Review who’s included", "See the files"; the section **Who’s included and sent files** keeps its
name), the Clocker offline card ("No connection", "Time can’t be recorded", "This tablet is offline.") and wrong-ID line,
the Timecards steps line, Home's band (Hours, Payday; the Lead's "On shift now"), Team's "On the clock" filter and its
two-by-two layout, and the Spanish "Week copied". Rondo's, Operations' and Developer's "acknowledge" are other things (a
review checkbox, incident targets, stored records), so they stay.

## Screenshots to retake
None: the six guides are text only (no image links or `<img>` in any of them). The PDFs are rendered from the text.

## Checked and left as is
- Payroll's tabs are now **Pay runs**, **Time exports** and **Settings**; the guides only name the **Payroll** navigation
  item and the Settings row **Payroll settings**, both unchanged.
- Today's changes to Things to do ("All" without a count), Find cover ("Replacement saved."), Shift requests rows, the
  Team time off closed card, Notifications and Update detail back links, My pay, More's profile line, Help someone sign
  in and the Employee Schedule: no guide sentence describes them, so nothing to change.
- Owner: "Approve N timecards" (the confirming button and question still say it), "Prepare payroll" (the step and page
  name), the Settings table's Scheduling row (it leaves out Time off policies: incomplete, not wrong).
- Manager and Lead: "request review … not granted merely by managing one location" (deciding still needs the Owner's
  per-location grants); "Follow a read-only message" (now a Shift details sheet with a reason, still read-only).
- Rondo: "Hours are planned time from the schedule; timecards show hours worked." The Manager screen no longer shows this
  note, but the sentence is still true as an explanation.

## For Jose
Approve the text, then rebuild with `scripts/manuals/build-manuals.mjs` (it regenerates the six PDFs and the manifest
against the new application hash and clears G44's failing test).

## Rebuild (Jose approved, Nov 23 16:08 UTC, README "Gap closure")
- Merged the shared tip (`552ceed3`) first. `build-manuals.mjs` and `check-manuals.mjs` were read before running: the
  build renders each guide's Markdown in an offline browser with every request aborted and writes only to
  `docs/guides/web/publication/`; nothing is uploaded (the GitHub address in the PDFs is a printed source link).
- `sources.json` named `src/components/company-access/scoped-manual-shift-form.tsx` as evidence for the Owner and
  Manager/Lead guides; that file was replaced by `scoped-shift-sheet.tsx` (the location Manager's Add shift and Shift
  details sheet). The evidence path was updated; the guides' recovery labels (**Unsaved changes to copy**, **Reload current
  shift**) still come from `shift-review-recovery.tsx` through the shared shift form.
- Built with the pinned runtime (`tools/ci-browser-runtime`, Playwright 1.62.1, installed from its lockfile without a
  browser download) pointed at the container's installed Chromium: `node scripts/manuals/build-manuals.mjs --date
  2026-11-23`. Source `2b3ede8c`; `check-manuals.mjs` verifies all six; `manual-publication` and `manual-bundle` tests pass.
- The PDFs' text was extracted and checked: today's words are in them (Confirmed, Rondo AI, Check invitation, Check what
  happened, What they can approve, Who’s included and sent files, Add tablet, Pick up and swap, Published shifts and
  planned hours, a link to set a new password, Prepare <period>, All your locations) and none of the replaced ones are
  (Read by, Acknowledged, AI manager, Refresh invitation, Week by day, Your workspace, Team at your locations, reset link).
- As before by design: any later change to application source makes the guides stale again until the next rebuild.
- Whole `src` suite at the rebuild: 15,897 passed, 1 failed: `src/lib/operations/managed-runtime.test.ts` ("runs the actual
  canonical CLI with a closed payroll gate…"), the known load flake (README "Gap closure", Flaky tests, sweep-1); it passes
  on its own (12/12, twice).
