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
| Manager and Lead | Reminders | an Update's **Read by** list | an Update's **Acknowledged** list | `communication-detail.tsx` (`BCard title="Acknowledged"`) |
| Employee | Shift changes | from Schedule or **Shift requests** | from Schedule or **Pick up and swap** | `exchange/page.tsx` (Employees and Leads see "Pick up and swap"; already the case at `198168ac`) |
| Rondo | Manager view, step 3 | Read **Week by day** for each day's … | Read **Published shifts and planned hours** for each day's … | `owner-advisor/manager/manager-rondo.tsx` (`CorpSection label`); "Week by day" isn't in `src` |
| Operations | none | | | Paths, flags, routes, scripts and limits it names are unchanged |
| Developer | none | | | Scripts, paths, migrations, constants and headers it names are unchanged |

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
