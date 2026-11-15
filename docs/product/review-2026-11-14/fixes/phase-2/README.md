# Phase 2: shared patterns (Nov 15, 2026)

Phase 2 of the Nov 11 plan, built on top of [fix round 1](../README.md) and [Phase 1](../phase-1/README.md). It sits in the working tree of `claude-codex-collab-nevora` on `ce4de4bc` with both. **Nothing is committed.**

Four parts: one desktop and tablet frame, one main button per screen, one design for loading, error and offline, and the last of the older attendance words.

## What changed

44 application files (972 lines added, 211 removed), built as four packages.

| Part | Report | Result |
|---|---|---|
| Owner and Manager frame | [a-owner-frame.md](a-owner-frame.md) | Titles at two positions, bands at three heights, Team with a right rail, 560px field blocks on eleven forms, 560px state cards. CSS only. |
| Employee and Lead frame | [b-employee-frame.md](b-employee-frame.md) | The same frame on 47 routes. Availability's card no longer covers its header. Write an update got a desktop layout. CSS only. |
| One main button per screen, and words | [c-row-actions-and-words.md](c-row-actions-and-words.md) | Approve, Pick up, Review and Acknowledge on list rows are the tinted pill; Decline and Close request are quiet. Four older views use your attendance words. |
| Loading, error and offline | [d-loading-error-offline.md](d-loading-error-offline.md) | Loading keeps the page's shape. A failed page keeps its band and shows one card with one retry. Offline is one pill that never cuts the band. |

## The frame

At 768px and wider, every role. The values are tokens in `src/app/b-tokens.css`, pinned by a test, and written into `DESIGN.MD`.

| Rule | Value |
|---|---|
| Title position | 88px on a sidebar page; 130px under a back link. Home's sits at 109 under the greeting. |
| Band ends at | 196 (title alone, with one sub-line, or under a back link); 224 (back link, title and sub-line); 296 (tabs, search or a week stepper on the band) |
| Employee tabs with figures | 363 on Home, Time, Pay and Requests |
| First card | Overlaps the band by 52px on a sidebar page with a strip or figures. Starts 24px under the band everywhere else. |
| Content width | 1080 for work pages; one 812 column for pages opened from them; a form's field block stops at 560; a state card is at most 560 |
| Right edge | A band action ends on its page's content edge |

## The numbers

Measured in a browser at 1440px. The 900px numbers are the same.

| Measure | Before | After |
|---|---|---|
| Band heights, Owner (38 pages) | 16 | 4: 196, 224, 296, Home 383 |
| Band heights, Employee (16 pages) | 14 | 4: 196, 224, 296, 363 |
| Title positions, Owner | 6 | 3: 88, 130, Home 109 |
| Title positions, Employee | 5 | 3: 88, 130, Home 109 |
| Widest form field, Owner | 694 to 810 | 560 (New update keeps its 810 message field) |
| Team content edge | 1108, with 268px empty beside it | 1376, list plus right rail |
| Not-found and restricted cards | 812 and 1080 wide | 560 |
| Odd gaps under the band | Scheduling rules 97, Updates -12, Availability -40 | 24 |

## How it was checked

| Check | Result |
|---|---|
| Type check, whole project | Clean |
| Lint on the changed TypeScript files | Clean |
| Unit tests (`vitest run --dir src`) | 13,116 pass, 1 fails: the manuals guard, as in round 1 and Phase 1 (it fails after any source change until the manuals are rebuilt) |
| Browser, real sign-in on fictional local data | Owner (38 routes at 1440, 1100, 900, 390), Manager (9 routes at 1440, 900), Employee (16 routes at 1440, 900, 390). No page errors, no horizontal overflow. |
| Phones | Of 54 full pages at 390px, 53 kept their exact height. Owner Schedule differs by 18px because a fictional shift's time, which follows the clock, wrapped in one run. The builders also compared 94 Employee pages at 390 and 320 image by image: equal heights, differences only in clock text. |
| Keyboard | Focus rings checked on restyled buttons, forms and Team's rail. Tab order on Team is list first, then rail. |
| Loading, error and offline states | Forced in the browser where possible and photographed at 1440, 900 and 390. The list of states that could only be read in source is in report D. |

**Not run:** the browser integration suites in `src/test/integration` and the QA scripts in `scripts/`. They match on labels and looks this work changed; the list is in [the Codex handoff](../../../../handoffs/2026-11-14-claude-to-codex-inspection-fixes.md). No production build was made.

Screenshots: [after/](after/). The reports mention working screenshots by path; only the ones in `after/` were kept.

## What you will notice

- Moving between pages, the teal band stops jumping. Settings, Add shift and the not-found page have a slightly taller band; Time off requests, Shift requests and Availability too.
- Payroll's header is the title, the scope sentence and the tabs. The pay frequency still shows in "Up next".
- Team fills the screen: the list on the left, Hours this week, Availability and Help someone sign in on the right.
- Forms are narrower and left-aligned in their card. Their buttons sit at the right edge of the fields.
- On Time off requests, Shift requests and Time corrections, Approve is a tinted pill and Decline is plain text. The one filled button on a screen is its main action.
- A loading page looks like the page it becomes. It does not animate.
- Offline shows as a small dark pill at the foot of the window (above the tab bar on phones).
- Employee Time, Pay and Requests have the same band height as Home.

## Wording changed

Your attendance words, in four older views. Nothing else changed on screen.

| Where | Old | New |
|---|---|---|
| Who's working, heading | Not in yet | Not clocked in |
| Who's working, row value | 24 min late | 24 min |
| Schedule day list, chip | Missed clock-in | Missed |
| Schedule day list, chip | 24 min late | Not clocked in · 24 min |
| Older Owner Home rows | Maria Rivera didn't clock in | Missed: Maria Rivera |
| Older Owner Home rows | Maria Rivera is late | Not clocked in: Maria Rivera |
| Older Owner Home rows | 3 people haven't clocked in | 3 not clocked in |
| Timecard detail, corrections | Awaiting review | Waiting |
| Employee corrections chip | Pending | Waiting |

## For you to decide

1. **Payroll's band: decided Nov 15, 2026.** You dropped the "Weekly · business name" line on desktop Payroll. Payroll, Time exports and Payroll settings now all end the band at 296 with their tabs at the same height (171px), measured at 1440, 900 and 768. Phones keep the line and did not change. The gap under "Time exports" went from 68px to 45px ([picture](after/owner-time-exports-1440.png)).
2. **Payroll stays one 812px column.** It has no secondary card to put in a right rail, and none was invented. Moving "Recent payrolls" to a rail is possible if you want it.
3. **Team's rail at 1024 to 1279px** is narrow (268 to 300px) and its lines wrap. It could start at 1280px.
4. **Quiet "Close request" and "Decline"** are plain text. A tinted pill is the alternative if they read as too quiet.
5. **Home's "Find cover" (Owner) and "Review" (Employee)** stay filled, one per screen.
6. **Who's working** says "24 min" under the heading "Not clocked in". "Started 24 min ago" is the alternative.
7. **Offline pill** sits at the foot of the window on desktop. A card under the band is the alternative.
8. **Loading** is static. A soft pulse when motion is allowed is possible.
9. **"… unavailable" pages** show "Return to Home" as the teal button and "Refresh current view" as the quiet one. For a failed read the retry may deserve the teal.
10. **Time corrections** shows its "Correction requests 4" heading on the canvas, so the first card starts 60px under the band. Folding the count into the band's sub-line would close it.
11. **Older words left alone**, listed in report C: "Missed clock-ins" as a heading, "Correction awaiting review" (payroll wording), "Awaiting employee", "Rejected".

## Left for a later pass

| Item | Why |
|---|---|
| Pages chosen by a query string (time off form, Time views, Pay history) | The loading table is keyed by path, so they show their parent's placeholder. |
| States not seen in a browser | Seven older route errors, the paused and offline access screens and the service worker's offline page were checked in source and unit tests only. |
| Update detail, payroll people and fix, employee edit, staff import steps | They take the frame by rule but were not photographed. |
| Scheduling rules' open sections | They look unfinished (bullets, a bare icon). Same before this phase; not a frame issue. |
| Wave C Settings placeholders, the shell error screen, Pay and Profile failure cards | Still on older patterns. Listed in report D. |
| Phases 3 to 8 of the Nov 11 plan | Screen-by-screen work for Owner and Manager, Employee and Lead, signed-out pages, Clocker, motion, final check. Not started as phases; round 1 covered parts of each. |

## Release sequence

Unchanged. Review and commit on `claude-codex-collab-nevora`, integrate and verify with the backend on development, then promote the exact verified release to main after Jose approves. Nothing here authorizes a main merge, a production change, a paid activation or a live charge.
