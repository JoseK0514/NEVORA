# Phase 3, package A: Owner and Manager Home and Things to do

Builder A took over a stopped builder's partial work. I read its whole diff against `ed7f8b4c`, kept what was right, changed three things, and finished. Base `ed7f8b4c`. Patch: `a.patch` (10 files). Screenshots: `a-shots/`.

Takeover changes I made on top of the earlier work:
- Time off rows in Things to do were still titled "James Ortiz · Time off" inside the Time off card. Now the title is the person (OW-002).
- "10 of 11 timecards" broke after "10" on a phone. It now stays together.
- At 320px the "Not clocked in" tile label touched the next tile. The three tiles now give their labels 8px more room.
- The first manager capture showed "Things to do didn't load". It did not repeat in two later runs. See Not verified.

## Findings

| Id | Status | What was done or found | Evidence | Remains |
|---|---|---|---|---|
| OW-002 (Things to do part) | partly | Correction, time off, swap and can't-work rows lead with the person. A correction's line is "Time correction · sent Nov 15" or "Add unrecorded time". No trailing period. Home's request rows are the person over "Time off · Nov 26". | `src/lib/action-center/present.ts:81`, `src/components/owner-b/inbox-b.tsx:177`, `a-shots/owner-inbox-1440.png` | Which punch and by how many minutes ("Clock-out fix · +20 min") is not in the read. For Codex. |
| OW-006 (Home part) | fixed | Coverage on Home is one line: "Staffing 59%", a 6px bar, "197 h of 336 h". No tile, no "aren't required" line. Positions and Lead show only when required. In the 290px column at 1100 the bar wraps under the label. | `home-b.tsx:266`, `a-shots/owner-home-1440.png`, `owner-home-1100.png` | |
| OW-007 | fixed | Every lead on Home and Things to do is 36px (avatar or icon circle), so titles share one edge on phones. | `home-b.tsx:150-176`, `a-shots/owner-home-390.png` | |
| OW-012 | fixed | From 768px the positive pill (Approve, Review, Find cover) is 96px wide. Rows with buttons have no chevron. The schedule note stays on one line with an ellipsis. | `owner-b-home.css` "Things to do" block, `inbox-b.tsx:177`, `a-shots/owner-inbox-1440.png` | The overlap note state was not in the fixtures, so the ellipsis was not seen in a browser. |
| OW-031 | fixed | Desktop Home is two columns that stack on their own. On now sits under Things to do. The stat strip is capped at 640px. Payday's detail wraps under the count when the card is narrow. | `home-b.tsx:105-118`, `owner-b-home.css`, `a-shots/owner-home-1440.png`, `owner-home-1100.png` | With the setup card showing, the left column is now the longer one, so the right column ends about 370px earlier at 1440. See For Jose. |
| OW-033 (shortcut only) | fixed | "Plan ahead 38 · Earlier this week 8" is now "38 planned · 8 done". One line at every width checked. | `inbox-b.tsx:51` | |
| OW-035 | fixed | One glyph per kind: Can't work UserMinus, corrections ClockCounterClockwise, timecards ListChecks. Amber waits on you, teal is information, grey is done or not open. | `inbox-b.tsx:56` | |
| MG-003 | partly | Someone who cannot open Payroll gets the ink card as "Timecards": "10 to approve", "10 of 11 timecards · Pay period ended", "Payday Fri, Nov 20", white "Review timecards". Before approval opens: "Opens Mon, Nov 16", chip "In N days", quiet glass "See this week's hours". | `home-b.tsx:217-246`, `a-shots/manager-home-1440.png`, `manager-home-900.png` | "Approve by <date>" is not shown: no approval deadline is in the read. The not-open-yet state is covered by a unit test only, not by a capture. |
| MG-004 (counts and names) | partly | The signed-in person's own timecard is left out of Home's count, Things to do's count and the name list. The line says "10 of 11 timecards". The ink card says "An Owner approves your timecard". | `needs-you.ts:40`, `manager-inbox-corp.tsx:92-115`, `a-shots/manager-inbox-390.png` | The Owner's name ("Jose Natal approves your timecard") is not in Home's read, so the fallback wording is used. Own-card detection reads the item's title. Both For Codex. |
| MG-005 | fixed | The count is what can be decided today. Corrections that wait on this person are counted (13 + 4 + the fixture's extra open shift = 18) and sit in the Time tab, so the tabs add up. Timecards of a period still open are one grey "Not open yet" card at the bottom, no count pill. No "· waiting" suffix. Home has a "4 time corrections" row. Home, Things to do and the sidebar badge all say 18. | `needs-you.ts:26-34`, `manager-inbox-corp.tsx:176-205`, `inbox-b.tsx:83-119`, `a-shots/owner-inbox-1440.png` | Timecards whose period has ended stay outside the count and are named after it ("18 things need you · 11 timecards to approve"). See For Jose. |
| MG-011 | fixed | "On now" card under Things to do for Owner and Manager, from Today's shifts, which Home already reads. Up to 6 rows: 36px avatar with green or amber ring, name, shift time and place, chip "Working", "On break", "Clocked in late" or "Not clocked in". "See everyone" opens the attendance view. Nobody on: one line with the next start. Shown from 768px; hidden on phones. | `home-b.tsx:190`, `a-shots/owner-home-1440.png`, `manager-home-900.png`, `sparse-home-1440.png` | Minutes late ("49 min late") is not in the read; the chip uses Jose's words. |
| MG-012 | partly | Swap title "Ana Colon ⇄ James Ortiz". Can't work title "James Ortiz can't work Fri, Nov 20" over "9:00 AM – 5:00 PM · Calle Loíza". Both end with the tinted Review pill; on a phone it sits under the text. | `manager-inbox-corp.tsx:53-70`, `inbox-b.tsx:185-190`, `a-shots/owner-inbox-390.png` | The other person's shift and "No cover yet" are not in the read. For Codex. |
| TB-005 | fixed | From 768 to 1023 Payday is one full-width horizontal card (98px for the Owner, 112px for the Manager with the own-card line). This week is full width below with figures at the left and Shifts by day at the right. | `owner-b-home.css` tablet block, `a-shots/owner-home-900.png` | |
| Nov 14 BR-7 | fixed | Same work as OW-002, MG-005 and MG-012. | as above | |
| Nov 14 BR-1 (Home and Things to do counts) | partly | Home's "11 timecards to review" and Things to do's "Timecards to approve 11" now agree; the open period is apart as "Not open yet". | `a-shots/owner-home-1440.png`, `owner-inbox-1440.png` | The hours figures on other screens belong to other packages. |
| Nov 14 BR-9 | already fixed | Round 1's attendance words are in place and kept. | `present.ts` `ATTENDANCE_WORDS` | |
| Nov 14 BR-16 | partly (already) | Setup card is first (round 1, kept). | `a-shots/sparse-home-1440.png` | Replacing the attendance tiles until a tablet is registered needs Home to know that. Not done. For Codex and Jose. |

## What changed

**Home (Owner and Manager).** Two independent columns on desktop. New On now card. Things to do rows: 36px leads, person as title, a corrections row. Coverage as one line. Stat strip capped at 640px. Tablet: horizontal Payday, This week in two inner columns. The ink card is framed around timecards for anyone who cannot open Payroll. 320px: tile labels fit.

**Things to do.** Row titles carry the fact. One icon and tone rule. Review pill on swaps and can't-work rows. Fixed 96px pill and no chevron on rows with buttons. Corrections counted and in the Time tab. "Not open yet" card. Own timecard left out. Band reads "18 things need you · 11 timecards to approve". A link such as `/app/inbox#todo-corrections` scrolls to its card.

**Helpers.** `needsYou` returns `corrections` and counts them. `isOwnReview` is new. `presentItem` titles a correction with the person. `src/lib/data/inbox-count.server.ts` was not edited; it calls `needsYou`, so the sidebar badge follows the same count.

**Outside the named main files.** `src/components/manager-inbox-corp.tsx` (it builds the Things to do groups that `inbox-b.tsx` draws) and its test, and `src/components/owner-home-corp.test.tsx` (the Home test).

## Wording changed

| Old | New |
|---|---|
| James Ortiz asked for a time correction / Sent Nov 10 | James Ortiz / Time correction · sent Nov 10 |
| Sofía Méndez asked to add unrecorded time / Waiting for review | Sofía Méndez / Add unrecorded time |
| James Ortiz · Time off (Things to do row title) | James Ortiz |
| Ana Colon and James Ortiz | Ana Colon ⇄ James Ortiz (the spoken label still says "and") |
| (can't work) James Ortiz / date line | James Ortiz can't work Fri, Nov 20 / 9:00 AM – 5:00 PM · Calle Loíza |
| Home request row: "Time-off request" / "James Ortiz · Nov 26" | "James Ortiz" / "Time off · Nov 26" (also "Shift swap", "Can't work") |
| Time corrections · waiting, Timecards to approve · waiting | Time corrections, Timecards to approve |
| N things need you · M more waiting for review | N things need you · M timecards to approve |
| Chip "Pay period open" on an open period's timecards | Card "Not open yet", line "Opens Mon, Nov 16 · 11 timecards" |
| 11 timecards · names | 10 of 11 timecards · names (when one is your own) |
| Plan ahead 38 · Earlier this week 8 | 38 planned · 8 done |
| Covered this week tile, "Positions and leads aren't required" | Staffing 59% · bar · 197 h of 336 h |
| Manager ink card: PAYDAY / Friday, Nov 20 / 11 timecards to review / Open timecards | TIMECARDS / 10 to approve / 10 of 11 timecards · Pay period ended / Payday Fri, Nov 20 / An Owner approves your timecard / Review timecards |
| (same, before approval opens) | Opens Mon, Nov 16 / Timecard approval / See this week's hours |
| new | On now, See everyone, Working, On break, "Nobody is working right now. Next shift starts 9:00 AM.", "+2 more" |
| new | "4 time corrections" row on Home |

The Owner's Payday card wording (payroll) is unchanged.

## Checks run

- `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .`: no errors in `src`.
- `npx eslint` on the nine changed ts and tsx files: clean.
- `npx vitest run --dir src src/components/owner-b src/lib/action-center src/components/manager-inbox-corp.test.tsx src/components/owner-home-corp.test.tsx src/app/app`: 86 files, 988 tests passed (includes the stylesheet and `b-viewport` tests).
- `npx vitest run --dir src src/app src/components src/lib`: 806 files passed, 6 failed (21 tests, 18 of them "Test timed out") while five other builders were using the machine. None of the six files is touched by this patch (`schedule/edit/page.test.tsx`, `employee-home-actions.test.tsx`, `planner.test.ts`, three under `tenancy/migrations`). Rerun of those files alone (`npx vitest run --dir src src/components/employee-home-actions.test.tsx src/lib/scheduling/generation/planner.test.ts src/lib/tenancy/migrations src/app/app/schedule src/components/schedule`): 56 files passed, 2 failed (`planner.test.ts`, a timing measure, and `typed-guarded-backfill.server.test.ts`, timeouts) with the machine's load average at 28. The base run before Phase 3 (`vitest-p3.log` in the scratch root) also shows 7 failed files and 12 failed tests. I did not get a clean full run.
- Captures with `cap.sh`, `/app` and `/app/inbox`, at 1440, 1100, 900, 390 and 320: `owner`, `sparse` and `manager` (`p3a-shots/owner2`, `sparse2`, `manager2`), then `manager` again at 390 and 320 after the last two fixes (`manager3`). `overflow` 0 and no small targets on all 38 route and width pairs. No `pageerror`. Owner and sparse: no console strings.
- Counts: Owner Home 18, Things to do 18, badge 18. Manager the same. Sparse 4, 4 and 4.

Not run: keyboard and focus pass, reduced-motion capture, an Employee page (no component Employees see was changed: `home-b.tsx`, `inbox-b.tsx` and `manager-inbox-corp.tsx` are Owner and Manager only; `present.ts` is shared but its only change is the `TIME_CORRECTION` case, which is a manager item). Owner captures after the last two small fixes were not repeated; those fixes were checked on the Manager capture.

## For Codex

1. **Correction facts** (OW-002): which punch a correction changes and by how many minutes. Would be read in `presentItem` (`present.ts`) from the action item. Today the item carries only the person and "Recorded time correction."
2. **Swap's second shift and cover state** (MG-012): `request` on an EXCHANGE item has `counterpartName` but not the other shift's date and time. A CALLOUT item does not say if cover exists. Would be read in `itemRow` (`manager-inbox-corp.tsx`).
3. **Own-item flag** (MG-004): `isOwnReview` (`needs-you.ts:40`) recognises the reviewer's own timecard and correction by the item title ("Your timecard needs another reviewer"). A boolean on the item would be safer.
4. **Who approves the reviewer's own timecard** (MG-004): the Owners' names are not in Home's read, so the card says "An Owner approves your timecard". Would be read in `PaydayTile` (`home-b.tsx`).
5. **Approval deadline** (MG-003): no "approve by" date exists, so the card leads with the count or the opening day.
6. **Minutes late** (MG-011): `TodayShift.late` is a boolean. "49 min late" needs minutes.
7. **Tablet registered** (BR-16): Home cannot tell that no time clock is set up, so the attendance tiles still show for a new workplace.
8. **Count meaning**: `needsYou().count` now includes corrections that wait on the reviewer. `readInboxCount` calls it, so the sidebar badge rises by that number. No server file was edited. Any push or digest that quotes this count will follow.

## For Jose to decide

1. Timecards whose pay period has ended are approvable today but stay outside "N things need you"; the band names them after the count. Counting them would make the Owner's 18 into 29.
2. On now is hidden on phones (the Clocked in tile opens the same list). Say if you want it on phones too.
3. With On now in the left column, the right column is the shorter one on desktop when the setup card shows. Moving On now to the right column would balance it but make its rows narrow.
4. The Manager's card says "10 to approve" instead of "Approve by Mon, Nov 16" because no deadline exists in the data.
5. An Owner without Payroll gets the same Timecards framing as a Manager.
6. "Not open yet" is my title for the closed card. The finding gave only the line under it.

## Needed from another package

None. `b-kit.tsx`, the shell and `b-tokens.css` were not touched; only existing kit props are used.

## Not verified

- The first Manager capture (earlier builder's code plus nothing else) showed "Things to do didn't load" with a 503 in the console. Two later Manager runs loaded it correctly; one of them still logged a single 503 console line on each route. Owner and sparse runs had none. I did not find which request returned 503. It looks like load on the shared machine, but that is not proven.
- The Manager card's "Opens <day>" state, the overlap-note ellipsis, On now with more than six people and the empty On now line: unit tests only.
- The `#todo-…` scroll on arrival from Home: not exercised in a browser.
- Keyboard order, focus rings and reduced motion: not checked in a browser.
