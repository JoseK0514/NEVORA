# Phase 3: Owner and Manager screens (Nov 15, 2026)

Phase 3 of the Nov 11 plan: the remaining Owner and Manager findings on phones, tablets and desktop. It is built on round 1 and Phases 1 and 2 (commit `cb016437`) on `claude-codex-collab-nevora`.

The backend commit Jose named, `7ea502252`, was not on GitHub when this was built (`origin/development` was at `18c75692`, already merged here). Nothing in Phase 3 depends on it being present. Findings that need a server field are built as far as the current reads allow and listed for Codex below.

## What changed

90 application files (2,260 lines added, 393 removed), in six packages. No server read, handler, authorization, route or data contract changed.

| Area | Report | Main changes |
|---|---|---|
| Home and Things to do | [a-home-things-to-do.md](a-home-things-to-do.md) | "On now" card on desktop Home; Payday as one card on tablets; coverage as one line; row titles that lead with the person; counts that agree on Home, Things to do and the sidebar; a Manager's Home card framed around timecards |
| Schedule | [b-schedule.md](b-schedule.md) | Coverage as one line in the grid head; one "N open" chip per day that opens that day's list; the tablet grid readable (no avatars, names on one line); "Published" beside the week stepper; Scheduling rules sections finished |
| Timecards, corrections, exports, Payroll | [c-timecards-payroll.md](c-timecards-payroll.md) | Payroll as a list with a right rail on desktop; Timecards chips only for exceptions; 72px phone rows; the phone sheet's button above the safe area; a Manager's own card marked "You" and left out of their count; the corrections note said once |
| Requests, Shift requests, Availability, Notifications, Updates | [d-requests-updates.md](d-requests-updates.md) | Request rows with Approve and Decline inline from tablet width; opened shift requests as a two-column list that still shows every shift in full; repeated notifications folded; update detail and loading |
| Settings, forms, Profile, More, Insights, closed pages | [e-settings-forms-closed-pages.md](e-settings-forms-closed-pages.md) | One validation style; locked values with the reason beneath; Features rows with one card per section; More as one 560px card; an Access row on a Manager's Profile; closed pages that say whose page it is and what to do next |
| Shell | [f-shell.md](f-shell.md) | One teal count pill; the workspace name wraps; a Manager's sidebar in their order, with Scheduling rules and My pay; the current rail icon filled; no sidebar toggle under 1024px; 44px touch areas on tablets |

New rules sit in one stylesheet per area (`src/app/app/owner-b-home.css`, `owner-b-schedule.css`, `owner-b-time-pay.css`, `owner-b-requests.css`, `owner-b-settings.css`), loaded after the foundation sheet and covered by the stylesheet tests. The shell's rules are in `owner-b-shell.css`.

## The tracker

`docs/product/review-2026-11-11/status.json` is updated. Owner, Manager and tablet findings:

| | Fixed | Partly | Open |
|---|---|---|---|
| Owner (39) | 31 | 8 | 0 |
| Manager (17) | 12 | 5 | 0 |
| Tablet (19) | 16 | 0 | 3 |

The three open tablet findings are Employee screens (TB-002, TB-006) and one decision about the Employee's two bells (TB-008). Each "partly" row says what remains; most wait on a server field.

Whole tracker: 78 fixed, 26 partly, 66 open (Employee and Lead, signed-out pages, and system items for later phases).

## How it was checked

| Check | Result |
|---|---|
| Type check, whole project | Clean |
| Lint on the 81 changed TypeScript files | Clean |
| Unit tests (`vitest run --dir src`, 909 files) | 13,184 pass, 1 fails: the manuals guard (see "Pending checks") |
| Browser, real sign-in on fictional local data, combined build | Owner busy (38 routes at 1440, 900, 390), Owner new (4 routes at 1440, 390), Manager (9 routes at 1440, 900, 390), Employee (16 routes at 1440, 900, 390). No page errors, no horizontal overflow. Bands end at 196, 224, 296, 363 or 383 on every page. |
| Employee screens | All 16 Employee pages keep their exact height at 390. The only visible change is the filled current icon in the rail and sidebar. |
| Each package on its own | Its builder captured its screens at 1440, 1100, 900, 768, 390 and 320 where the finding named them, plus forced states (an opened shift request, validation errors, a changed Company profile field, the loading update). Details and what was not seen are in each report. |

Under heavy machine load during the parallel builds, some captures logged a 503 on a first page load (Things to do, Notifications, the access check) and one tenancy unit test timed out. Neither appeared in the final combined run on a quiet machine. Codex should look at the 503 once; it is in the handoff.

## Pending checks

These were not run here and are recorded for the combined integration:

- **User manuals.** `src/test/manual-publication.test.ts` fails by design after any source change. The manuals in `docs/guides/web` must be updated for the new labels and screens and rebuilt on the commit that holds this work.
- **Browser integration suites** (`src/test/integration`). Not run. The GitHub "Mobile Access" check fails on `cb016437` with the same three tests that failed on `ce4de4bc` before this work (`mobile-access-browser`, `mobile-access-landscape`, `commerce-recovery-browser`).
- **QA scripts** (`scripts/*.mjs`). Not run. Several press labels and looks that rounds 1 to 3 changed.
- **Production build.** Not made.
- **Not checked by hand:** a real touch device, Safari, a screen reader, Windows High Contrast, a Manager kept to some locations, and a payroll-reviewing Manager (unit tests only).

## What you will notice

- **Home (desktop):** an "On now" card under Things to do, the stat strip no longer stretched, coverage as one line with a bar.
- **Home (tablet):** Payday is one wide card.
- **Manager Home:** the dark card is about timecards (how many to approve, payday), not payroll.
- **Things to do:** rows start with the person; timecards of a period that is still open sit in one grey "Not open yet" card. The count is what can be decided today, and it now includes time corrections that wait on you, so the number is higher (18 in the test workspace, was 13).
- **Schedule:** each day has one "N open" chip; tapping it lists that day's open shifts under the row.
- **Timecards:** only exceptions carry a chip. A Manager's own row says "You" and who approves it.
- **Payroll (desktop):** recent payrolls on the left, "Up next" with the three steps on the right, amounts labelled "Net" as on the phone.
- **Requests:** from tablet width a request is one row with Decline and Approve at the end.
- **Notifications:** five identical rows become one ("5 notifications · latest 8 min ago").
- **Closed pages for a Manager:** "Payroll is for Owners. Your part is timecards. Jose Natal runs payroll after you approve them." with "Open Timecards" and "See my pay".
- **Sidebar:** every count is a teal pill. A Manager sees Home, Things to do, Schedule, Time, Team, then Insights, Updates, Scheduling rules and My pay.

## Wording changed

Every changed string is listed old to new in the six reports. No payroll calculation or legal wording was rewritten. The ones worth your eye:

| Where | Old | New |
|---|---|---|
| Things to do, correction row | James Ortiz asked for a time correction | James Ortiz / Time correction · sent Nov 10 |
| Things to do, swap | Ana Colon and James Ortiz | Ana Colon ⇄ James Ortiz |
| Home headline | N things need you · M more waiting for review | N things need you · M timecards to approve |
| Things to do, open period | chip "Pay period open" | card "Not open yet", "Opens Mon, Nov 16 · 11 timecards" |
| Manager Home card | PAYDAY / Friday, Nov 20 / Open timecards | TIMECARDS / 10 to approve / Payday Fri, Nov 20 / Review timecards |
| Schedule grid | "2 not filled" and time chips | "5 open" |
| Add shift | Owners and Managers can lead a shift | This person leads the shift. Owners, Managers and Leads can. |
| Time corrections | the Puerto Rico time note in every card | said once under the title, with the count |
| Time exports | "Approve 11 timecards first" and "Only finalized timecards are exported." | "Timecards for Nov 9 – 15 can be approved from Mon, Nov 16." |
| Timecards, a Manager's own row | Ready to approve | Jose approves this one |
| Payroll desktop rows | amount alone | amount with "Net" under it (the phone's word; the field is net pay) |
| Manager sidebar | group heading "More" | no heading |

## Decided (Jose, Nov 15, 2026)

Jose approved a recommendation for each of the thirteen questions. "Built" names what changed after `5c79f685`; "kept"
means the Phase 3 build already matched.

1. **Things to do count: kept.** The badge counts what can be decided today, corrections that wait on you included.
   Timecards of an ended period stay their own count ("N things need you · M timecards to approve"). Overdue ones may join
   the badge once the server sends an `overdue` number (OW-028).
2. **"On now" on Home: kept.** Tablet and desktop (it is hidden under 768px); on a phone the Clocked in tile opens the list.
3. **"Not open yet": built.** The card is "Pay period still open". When one period is waiting, a grey line under the
   heading says "You can approve these from Mon, Nov 16." and each row names how many and whose ("2 timecards · Blair,
   Casey"). Two periods keep the day on each row. `manager-inbox-corp.tsx` (`groupThingsToDo`, `timecardRows`),
   `owner-b/inbox-b.tsx` (`GroupCard`), `owner-b-home.css`.
4. **After approving a timecard: built.** No timer. The green "Approved · 7 of 12 done" block carries a tinted "Next
   timecard" pill when another card in the list still needs the same step and isn't the viewer's own; it prefers a card
   that can take that step now (no correction waiting) and wraps to the start of the list. Pressing it opens that card
   and moves focus to the person's name at the top of the sheet. `timecards.tsx`, `owner-b-time-pay.css`.
5. **Phone times: built.** Phones write "3–4:30 PM" on Home ("Next: today, …") and Things to do's open shifts, as the
   Schedule's day list does; tablet and desktop keep "3:00 PM – 4:30 PM". `BWhen` in `owner-b/b-kit.tsx` renders both
   and `b-foundation.css` shows one by width.
6. **Open-shift list: kept.** It opens in place under the day; past days' chips stay grey.
7. **Tablet Schedule: kept.** 128px name column and 68px rows.
8. **Grouped notifications: built.** Opening a fold used to open only the newest notification's page and mark every
   unread one in the fold read, so the others were never seen. Now a fold is a button (`aria-expanded`) that lists each of
   its notifications under it; each opens its own page and is marked read on its own. Opening the fold marks nothing.
   `notification-inbox.tsx`, `notification-inbox-view.ts` (`NotificationRow.items`), `quiet.css`.
9. **Offline: built.** On a page with a band the line is a glass pill inside it, under the title (warm dot, 13.5/600,
   "Offline · updated 9:24 PM"), on every width; the shell's pill steps aside only while a band pill is drawn
   (`data-shown`). Pages without a drawn band (Notifications, My pay, Settings, and desktop Payroll, which keeps its
   phone screen hidden in the page) keep the shell's pill. Checked on 15 Owner routes at 1440 and 8 at 900 and 390: one
   line each. `owner-b/b-offline.tsx`, `BHero`, `app-shell.tsx`, `owner-b-shell.css`.
10. **Sign out on More: kept.** The separate pill under the card.
11. **Manager's My pay: built.** It stays in the sidebar. From 768px it has no back link (it is a sidebar or account-menu
    page, like Settings); phones keep "‹ More". `owner-b-desktop.css` (the Settings rules now name `.c-mypay`).
12. **Employee bells: built.** One bell, in the top bar, for every role. An Employee's or Lead's Notifications entry left
    the sidebar and the tablet rail (Owners and Managers never had one); the phone header keeps its bell, as before.
    Notifications names itself on the shell (`data-shell-page`) so its 296 band rules no longer depend on the sidebar
    link. `navigation.ts`, `app-shell.tsx`, `employee-b-desktop.css`.
13. **Shift lead wording: built.** Under "Shift lead": "Must be an Owner, Manager or Lead." The error is "Only an Owner,
    Manager or Lead can lead a shift." on every schedule page (the company-access forms said "…can be the designated shift
    lead"). The roles match the server's `isLeadCapable`.

## Left for a later pass

| Item | Why |
|---|---|
| At 1024px with the sidebar expanded, Home's Payday text overlaps | It did before Phase 3 and fits at 1100. Needs the expanded sidebar to overlay under 1280px, or the right column to stack. |
| At 1100px a long time wraps in today's Schedule column | Same as before this phase. |
| Arrow keys in the Schedule grid | Not built; the cells are reachable by Tab. |
| Closed-page state card on three other pages (`my-time`, `requests/hub`, `employees/import`) | Outside the builders' scopes; they use the older notice. |
| Owner Updates title at 130 with no back link; 40px legacy buttons on Time exports | Noted by the shell builder; not changed. |
| Phases 4 to 8 | Employee and Lead screens, signed-out pages, Clocker, motion, final check. |

## Release sequence

Unchanged. This work is committed and pushed on `claude-codex-collab-nevora`. Codex integrates and verifies it with the backend on development, including the pending checks above. The exact verified release is promoted to main only after Jose approves. Nothing here authorizes a main merge, a production change, a paid activation or a live charge.
