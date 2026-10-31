# Owner premium upgrade — combined plan (Oct 31)

Sources: `visual-craft.md` (UI designer) and `structure-experience.md` (product designer), both on the frozen Release 1
code `7b14776a`, fictional data, 1440 / 1024 / 390 / 320. Nothing was submitted; no app code changed.
Evidence: `.claude/r1-tools/review-visual/` and `.claude/r1-tools/review-product/`.

Spot-checked by Claude: Owner Home renders 27 of 27 text elements in the system font (`-apple-system`), not the kit's
Inter, because `src/app/app/premium-clean-manager.css` sets `--cm-sys` on every element under the clean-manager shell.

## Verdict
Phone is close to the approved boards. Desktop is the phone layout stretched into a 992px column, with older styles
showing through, and the moment the Owner acts, some paths dead-end or land on the wrong page. Three causes:
1. Two typefaces and three generations of colours, radii and text sizes on one screen.
2. No single desktop page layout (title at 8 heights, 4 form shapes, full-width buttons, no row hover).
3. Noise promoted, urgent things buried (repeated counts and pills, red everywhere; unpaid pay periods and missing
   tablet setup not surfaced).

## Wave A — Release 1 polish (presentation only)
| # | Upgrade | Effort | From |
|---|---|---|---|
| A1 | One typeface: Inter everywhere (remove the system-font override for the corporate shell) | S | visual 1 |
| A2 | Fix wrong destinations and labels: Clocker PIN row, Payroll "Review" → "Prepare payroll", Home timecards card wording, tablet sheet button "Get setup code" | S | product 1 |
| A3 | One name per place; top-bar title matches the page title or is removed | S | product 3, visual 2 |
| A4 | Desktop sidebar and top bar on the type scale and corporate greys/teal | S | visual 2 |
| A5 | Calm status: drop pills that restate the normal state, red at most once per screen, one-size numbers ("0 of 9 approved"), Home/Things to do without repeated counts or the "More to review 45" bucket | S–M | visual 3, 8; product 5 |
| A6 | Unpaid pay periods first on Payroll and Prepare payroll (red notice naming the oldest) | S | product 2 |
| A7 | One desktop page layout: same title position, actions in the title row, 720px width for single-column pages, row hover, no full-width button bars, one Save per form | M | visual 4, 5, 7 |
| A8 | Timecards table and Schedule grid on corporate tokens; fix the 1024px missing Recorded column; one period control | M | visual 6; product 7 |
| A9 | One Settings, one More, one profile entry; Corrections under Time | M | product 6, 8 |
| A10 | One empty-state card; one phone header and sheet style; Find cover empty state with next steps (Edit / Delete shift) | S–M | visual 9, 10; product 4 |

## Wave A-phone — Release 1 polish (from `phone-native.md`, presentation only)
Verified by Claude: fields are 15px (`corp.css:156`, iOS zooms below 16px); the home-screen icon is the old blue flame
(`public/icons/fuel-*.png`); Home's Payday card says "All timecards approved" whenever it has no timecards
(`owner-home-corp.tsx:89`), including when the data failed to load.
| # | Upgrade | Effort |
|---|---|---|
| P1 | Every field 16px on phones (no iOS zoom) | S |
| P2 | Real app icon (NEVORA wordmark tile), white status bar / theme colour, manifest and icon on `/login` | S |
| P3 | Failures say so: error card with Try again after 2.5s; no "All timecards approved" when data failed | S |
| P4 | Every tap answers: pressed states on rows, links, tabs, icons; no grey tap flash | S |
| P5 | One sheet that moves like iOS (360ms in / 240ms out, grabber, swipe down, page locked behind) | M |
| P6 | Back behaves like back (no history loop, scroll restored); More without "Done" | S |
| P7 | Calm tab switches: page-shaped skeletons, no 80px jump on Home, thin progress bar | M |
| P8 | Headers stay put; hairline only when scrolled; re-tap a tab scrolls to top | S–M |
| P9 | Keyboard fits the field: Return-key labels, number pads, no wrong AutoFill | S |
| P10 | Validation in one voice: all missing fields at once, one red style | S |
| P11 | Offline page and banner in the corporate look | S |
1.1+: slide transitions, swipe between days, pull-to-refresh, offline for all installed users, shorter/QR Clocker recovery code.

## Wave B — Release 1.1 (needs logic or new data)
- Find cover as a decision: Post as open shift, Assign, Not-available list with reasons (board O-FindCover).
- Person page worth opening: hours, next shift, pay rate, availability; "get ready" checklist after Add employee.
- Finish setting up includes tablets and PINs; unpaid pay periods on Home.
- Owner can add missing time and edit a punch, with a reason and the original kept.

## Needs Jose
1. Timing: Wave A before the device test (one new frozen SHA and a full re-gate) or right after Release 1 ships.
2. Neutral grey for in-row count badges and avatars (changes a token on the approved boards).
3. New home-screen app icon: NEVORA wordmark tile replacing the flame.

## Not checked (both reviewers)
Anything after a submit (payroll approve, publish, approve/decline results, setup-code display); Find cover with an
available person; Payroll amounts; loading and error states; keyboard and screen reader page by page; 1920 width;
WebKit beyond six pages; the desktop bell, period dropdown and avatar menu popovers.

## For Codex (review request)
Please review this plan and the two reports for anything that would touch your areas or break behaviour:
server reads and actions, payroll logic, the advisor contract, routes, migrations. Wave A is meant to be presentation
only (CSS, markup, copy, links); flag any item that is not. Screenshot paths in the reports are local files on Jose's Mac
under `.claude/r1-tools/`. The phone-native review is `phone-native.md` (Wave A-phone above).
Reply in a dated handoff under `docs/handoffs/`.
