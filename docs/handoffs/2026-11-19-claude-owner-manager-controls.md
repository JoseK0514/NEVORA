# Owner and Manager controls: SCRUM-215, SCRUM-218, SCRUM-214 (Claude UI, Nov 19, 2026)

Claude built the regular NEVORA screens for three tickets on `claude-codex-collab-nevora`, on the Development contracts
Codex merged in `4c3c052f` (guides `9af91ef2`). Rondo and intelligent scheduling stay with the other chat.

Release sequence: Development is the acceptance release. The integrator brings this Collab commit into the Development
candidate, verifies the combined backend and UI there, and promotes the exact verified release to main only with Jose's
approval. Nothing here changes a server route, a migration, a data contract or a calculation.

- Collab commits on `9af91ef2`: `d22e8eaa` (code), `a1ae2753` (guide text and DESIGN.MD), `df86717a` (the six guides
  rebuilt from `a1ae2753`), and the commit that adds this note, the evidence and the delivery index line.
- Contracts used: [scheduling and permissions](2026-11-18-scheduling-pto-claude.md),
  [language and first-week setup](2026-11-18-claude-language-setup.md), [compensation](compensation-ui.md).

## What is on screen

### SCRUM-215 Manager controls

| Where | What |
| --- | --- |
| Team › Manager › Access and sign-in | **What they can approve**, under Management access: one group per location the Manager's current scope covers, three switches (Publish schedules, Approve time off, Review time exceptions). Reads `GET /api/workforce/settings`; each switch sends one `PERMISSION` command with a fresh UUID and the grant's revision. The switch moves only on a confirmed receipt; a lost answer or 503 shows "Not confirmed" and **Check again** resends the identical command; 409 asks for a reload. Grants from before a role change (`currentGeneration` false) show off. |
| Manager › Profile | **What you can approve**: each action with its locations ("Every location you manage" when all), "Not granted" otherwise, and who to ask (the Owners' names). Server read through `listWorkforcePermissions`, the function behind `GET /api/workforce/permissions`. A failed read says so; it never shows "Not granted". |
| Refusals | Publishing without the grant: "You can't publish here. Publishing isn't part of your access at every location in this week. Ask an Owner, or publish the locations you can." Team time off with no Approve time off grant: "Time off is decided by an Owner" naming the Owner. A refused or stale decision: "…or it covers a location where an Owner decides time off." `pto-balance`: "Not approved. This request needs more paid time off than the person has left, so it's still waiting." Scheduling rules no longer turns `ACCESS_DENIED` into a form error. |
| Scheduling rules | **Week starts on** (`PLANNING_CALENDAR`, 0 to 6, Monday default). Owner edits with the same uncertain-save handling; a Manager reads "An Owner sets this." |
| Schedule | When the week doesn't start on Monday, **Planning week** shows the window from `readOperationalPlanningWeek` (the function behind `GET /api/workforce/calendar/{date}`) in its schedule weeks, each with its original label and **Open**. Editing and publishing stay on the Monday weeks, so published history keeps its keys. A Manager sees which locations they can publish. |

### SCRUM-218 First-week setup

Owner Home's setup slot is the first-week card. It reads `GET /api/setup/first-week` with `X-Nevora-First-Week: 1`, shows
the five steps from the server with the bilingual titles in `src/lib/activation/copy.ts`, a five-part track and "N of 5
complete" ("N de 5 pasos completado(s)"). Each step opens the server's `href`. The card reads again when the Owner returns
to the tab (focus, visibility, page show, back online). 503 shows "Setup progress is unavailable right now" with Try
again; 401 offers Sign in; 403 renders nothing. A finished setup leaves Home. The older coverage and hour-target items
stay in Things to do (`setupHoldsItems` false). Managers never mount the card.

### SCRUM-214 Wages and draft labor cost

| Where | What |
| --- | --- |
| Team › person › **Pay rate** (Owner only; a Manager is redirected to Restricted and gets 403 from both endpoints) | Rates now by location with since/next change; "No rate" (missing) is amber and never $0; "$0.00/h · Saved as zero" is a recorded zero; history newest first with who, when, why and the rates, with **Show earlier changes** (`beforeRevision`). **Change pay rate**: set or remove a rate at chosen locations from a day (workplace midnight), reason required, then a review of each location's old and new rate, then one `SAVE_WAGES`. The interval list keeps earlier intervals, splits a shared interval so other locations keep their rate, and replaces a later scheduled rate only at the chosen locations. Lost answer or 503: "Your change isn't confirmed yet" and **Check again** replays the same UUID and body; 409: "Pay rates changed" and **Load latest rates**. Drafts stay in memory. |
| Schedule (Owner) | **Base scheduled pay**, an Estimate: the total in the header, a row per location with shifts and hours, "Incomplete" with "$X for N of M shifts", "No pay rates" with Open Team, shifts on a clock change named. **What's included** opens the basis and exclusions. One `labor-cost` read per location in view with `changes: []`; a 409 is read once more. |

## Language

Every new surface reads the portal language with `readPortalLanguage` (saved choice, then the device's `nv-lang`, then
the browser) and carries `lang` on its own page or card (`CorpPage` and `CorpCard` accept `lang`), because the rest of
those pages is English today. Money is exact in both languages; dates are `en-US` or `es-PR`.

## Evidence

Browser evidence, pictures and the exact checks: [review-2026-11-19-owner-manager](../product/review-2026-11-19-owner-manager/README.md).
Local Next server, owned loopback PostgreSQL, fictional workspace, Chromium at 1440, 390 and 320, English and Spanish.

- Grants given, revoked, sent from the keyboard and confirmed after a lost reply; the Manager's Profile followed each
  change; publishing and Team time off refused with the Owner named.
- Week starts on Sunday: the planning week split into its two schedule weeks with their labels; back to Monday removes it.
- First-week setup went 2, 3, 4 of 5 as steps were completed, each time on return to the tab without a reload, then left
  Home; loading, unavailable with Try again, Spanish.
- Pay rates: first rate, explicit zero, scheduled raise, four revisions, lost reply replayed to revision 4, a conflict
  reloaded; a Manager is closed out (Restricted, 403 on both endpoints).
- Base scheduled pay: no rates, partly priced ("$458.40 for 3 of 22 shifts"), a 503, Spanish.
- axe-core: nothing in the new parts in 16 runs (the existing navigation `label-content-name-mismatch` remains).
- TypeScript 0 errors in `src`; oxlint clean in `src`; full suite 15,860 passed, 0 failed, 1,000 skipped; guides: 6 built and verified from `a1ae2753`,
  `manual-publication` passes.

## For Codex (integrator)

1. Bring these commits into the Development candidate and rebuild the guides from the joined commit. No migration, route
   or contract change; `CorpPage` and `CorpCard` gained an optional `lang`.
2. **Location-scoped publishing (blocks part of SCRUM-215).** A Manager with `PUBLISH_SCHEDULE` at one location can't
   publish it from the UI:
   - `GET /app/schedule/publish?week=2026-11-23` as a location-scoped Manager answers the closed page (`withOperationalCompany`,
     `access_denied`); `canPublish` in `operational-read.server.ts` is Owner-only.
   - On the company-wide Manager's publish page, `publishDraftsAction` sends every draft location, so a grant at Calle Loíza
     alone is refused with `?error=ACCESS_DENIED` for the whole page (evidence: `mgr-publish-refused-1440`).
   - Expected: the publish read admits a Manager for the locations in `publishLocationIds`, and the page offers publishing
     those locations (`publishScheduleAction` with `weekStart` and that `locationId`). Claude then adds per-location
     buttons and hides the others with "An Owner publishes Condado".
3. **A typed reason for refused time-exception review.** Without `REVIEW_TIME_EXCEPTION`, `/api/manager/time-corrections`
   returns an empty queue, and a review returns `{status:'unavailable'}`; the screen can only say "Correction access
   ended". Expected: a typed reason (for example `permission_required` or `self_review`) so the screen can show the
   prepared note "Reviewing time exceptions isn't part of your access, or this one is your own. Ask {Owner} to review it."
4. **Time-off refusals.** A Manager whose grant covers some but not all of a request's locations gets the generic
   `?error=review`. The copy now names both causes; a typed reason (`leave_scope`) would let it say which.
5. **Language.** The Profile language switch (`PUT /api/account/language`) is not in this assignment, so Spanish on
   these screens follows a saved choice or the device's `nv-lang`. The rest of the signed-in pages are English.

## Not covered

- WebKit, physical phones, an installed app, a screen reader pass and hosted Development.
- The PTO policy and balance screens (`PTO_POLICY`, `PTO_POST`, `GET /api/workforce/pto/{employeeId}`) are in the
  contract but not in this assignment.
- The planner itself still edits Monday-keyed weeks; with another start day it shows the planning week as an overview
  with a way into each schedule week. A planner grid that edits across two schedule weeks is a larger change.
- The labor cost preview sends no unsaved changes: the planner saves each edit when it's made, so the saved working
  schedule is the draft. `changes` stays available for a future edit sheet preview.
- First-week: the timecard step was completed by the fixture, not in the browser.
