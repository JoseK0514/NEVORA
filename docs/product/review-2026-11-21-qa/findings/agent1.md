# Agent 1: visual design and brand. Review tip 6601ee82a (Nov 21, 2026)

Saved by the lead from Agent 1's hand-back, because the subagent could not write `.md` files. Evidence is in `shots/A1-*.png`, the raw shots are in `shots/own-*`, `shots/mgr-*`, `shots/x-*` and `shots/load-failures/`, the probes in `data/`, and the scripts in `scripts/`. The Employee captures are in `../../cap/qa-a1-employee/`.

## How it was checked
- **Live app, desktop:** Playwright Chromium at 1440x900 (`chromium-desktop`), signed in as Owner (QAOWNER) and company-wide Manager (OWN-ELENA).
- **Live app, phone:** 390x844 in touch emulation (`chromium-touch-emulation`), same two roles.
- **Employee:** James Ortiz (QA-SCAN-B) through the separate screenshot harness, which starts its own app and throwaway database (the `cap-rs.sh` script). Widths 1440 and 390. The run finished without errors.
- **Style probe:** `scripts/probe.js` reads the styles the browser computes on each screen. It checks fonts, sizes, colours outside the palette, tinted fills behind words, coloured numerals, button corners, gradients and shadows, icon cut and overflow.
- **Read-only:** nothing was saved, published, approved or deleted.

## Environment limits (not product defects)
- **Sign-in limit:** all the agents shared the QAOWNER login, which hit the limit of 10 sign-in attempts per Employee ID in 15 minutes. The saved session in `data/state-QAOWNER.json` was reused afterwards.
- **Heavy load:** the machine's load average reached 60. Many reads failed or timed out, especially Owner screens at 390. Those failures did give real renders of the error screens.
- **Manager Rondo:** it shows "page not found" because the Manager advisor switch is off (`src/app/app/ai-manager/page.tsx:22`).
- **Isolated Owner run:** it waited in the queue for a capture slot and never started.

## Findings: 9 P2 and 15 P3. No P0 or P1.

### P2
| ID | Finding | Rule | Evidence | Verified |
|---|---|---|---|---|
| A1-01 | Failure and "unavailable" screens are drawn six different ways. Card widths are 560, 812 and 1080px. The phone versions have no title, and their main button is "Return to Home". The app error page uses pill buttons and has no icon circle. | One state card (BState); a failed page keeps one 560px state card with one retry button; 10px button corners | A1-01a–e | desktop + touch |
| A1-02 | On the phone, Payroll shows a bare error, "Request could not be completed.", with a "Try again" button. There is no title, no icon and no side padding. | BState. Source: `payroll-runs.tsx` (about line 90) `StateCard`, text from `lib/payroll/http.ts:105` | A1-02 | reproduced twice |
| A1-03 | Employee Schedule week tiles are filled grey boxes. The Tomorrow tile has teal words on a light-teal fill, while Owner and Manager shifts are white capsules. | "Colour lives in one small mark; words are ink." | A1-03 | Employee harness run |
| A1-04 | On the phone, the Team filter wraps into a 2x2 grey grid: two 156px columns, 88px tall, 14px corners. | Segmented control is a 44px pill track | A1-04 | touch |
| A1-05 | The empty state in Settings › Time off policies mixes three button styles in one row (filled, bare text, teal link). The row is right-aligned under a left-aligned state and wraps at 390. | Secondary actions are white buttons with one hairline; the state card has one action | A1-05, A1-05b | desktop + touch |
| A1-08 | Rondo is crowded and opens on the wrong thing. Each issue row has four actions, so the first three issues carry 12. A "View paused" notice is the first thing on the page. | Issue rows have a facts line and one action | A1-08 | desktop |
| A1-10 | The Home headline stays on "Checking today…" after the Things to do read has failed. | — | A1-10 | seen once, under load |
| A1-23 | The Schedule day view failed three times ("Couldn't check your access" at 1440, "Schedule unavailable" at 390), while the week view loaded. It may be load; it needs a recheck. | — | x-sched-day-1440 | desktop + touch |
| A1-24 | The Rondo failure on the phone uses the teal "information" circle and shows two near-duplicate notices. | — | load-failures, own-rondo-390-fold | touch |

### P3
| ID | Finding | Rule |
|---|---|---|
| A1-06 | The numbered steps under Payroll "Up next" are numerals in tinted circles. | Ask Jose: he rejected coloured numerals in tinted pills. |
| A1-07 | The Home shortcut tile icons use the bold cut, not duotone, inside their light-teal circles. Source: `owner-b/home-b.tsx:60-63`, `employee-b/home-b.tsx:49-52`. | Icons in circles are duotone. |
| A1-09 | Rondo's "View paused" notice is off-centre and has extra padding at the bottom. | — |
| A1-11 | Each Settings subpage places its "add" action differently, and the divider under the card header comes and goes. | — |
| A1-12 | Label and value emphasis flips between cards (Payroll Totals, person "Hours"). The person identity card uses the location as its bold title. | — |
| A1-13 | Type sizes outside the scale: 13px about 106 times on Schedule, 15px on Timecards, and fractional sizes on status labels. | Type scale |
| A1-14 | Greys and inks from older kits that are not in `b-tokens.css`. | Tokens |
| A1-15 | Durations are written three ways: "192 h 30 min", "45 h 30", "50 h 45 min". | — |
| A1-16 | The Employee Time running total, "8 h 30", is teal. | Figures are ink. |
| A1-17 | Adjacent Payroll rows use two status styles. | — |
| A1-18 | The person page's navigation rows have no lead icon and no second line, unlike the matching rows on Team and Settings. | — |
| A1-19 | Settings on the phone puts section labels outside the cards. | — |
| A1-20 | The sidebar order differs by role. This is deliberate in the tests; it is a question for Jose. | — |
| A1-21 | Faint horizontal lines about every 28px in the Owner and Manager phone band under touch emulation. Needs a real device. | — |
| A1-22 | The Employee Schedule "Today" empty state is one grey line stretched across a 175px card. | — |

## Consistency by area
- **Home:** consistent across roles, apart from A1-07.
- **Schedule:** Owner and Manager follow the approved design. The Employee week departs from it (A1-03). The day timeline was not rendered (A1-23).
- **Team:** clean on desktop. The phone filter breaks (A1-04).
- **Payroll:** consistent on desktop. The phone error is old markup (A1-02), and the step numerals need a decision (A1-06).
- **Rondo:** the weakest area (A1-08, A1-09, A1-24).
- **Settings:** the index is consistent. The subpages mix three older kits.

## First two seconds
- **Right:** Manager Home, Payroll, Payroll details, Timecards, Team at 1440, Schedule at 1440, Employee Schedule and Employee Time.
- **Wrong:** Rondo opens on a paused notice followed by 12 actions.
- **Taste call:** Employee Home puts the greeting above "Still clocked in".

## Approved in DESIGN.MD or Jose's picks, so not flagged
- Teal count pills in the sidebar.
- The dark payday tile on Home.
- The white "Published" chip on the band.
- Glass shortcut buttons on the desktop band.
- The Base scheduled pay card above the week grid.
- The grey segmented-control track.
- The disabled grey pair of buttons.
- The am/pm suffix at .85em.
- The teal header for today's column.
- The amber staffing bar with an ink figure.
- The Home hour bars.
- A failed read shown as "—".
- The 812px reading column.

## Checked and good
- No horizontal overflow on any route.
- Inter is the only typeface and Phosphor the only icon family.
- No tinted buttons or labels are left.
- Buttons have 10px corners outside the band's glass controls.
- Counts beside titles are plain grey numerals, and status labels are a dot plus words throughout.
- Kit icons in circles use the duotone cut.
- Secondary buttons are white with one hairline.
- Loading keeps the page frame and shows the shimmer.

## Not checked
- The success mark and confirm blocks, because this agent was read-only.
- The Owner 390 baseline, because those screens only rendered their failure states.
- The Schedule day timeline.
- Manager Rondo.
- WebKit, real iOS, reduced motion, keyboard and focus, 200% text.
- The signed-in Spanish branch.
