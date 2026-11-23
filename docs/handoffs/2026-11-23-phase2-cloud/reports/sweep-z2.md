# Z2: phone and keyboard sweep of the approved rows

Branch `claude-codex-collab-nevora-batch-public`, with `claude-codex-collab-nevora` merged up to `2651a312` (README
`9bf94ef5`). I reverted package P (`5727bf3f`, `3b29fe48`) because it was withdrawn under G23, so A15–A19 are back
exactly as on the base.

## Commits
| Commit | Fix |
|---|---|
| `5f5002a2` | I1 Profile (Owner and Manager): below 768px, “Add a passkey” goes under its explanation (`manager-profile-upscale.css`, test in `manager-profile.test.tsx`). |
| `3d0d8fba` | I1 Profile (Manager): below 360px, an approval row's value goes under its label (`owner-b-settings.css`, Profile rules only, test in `manager-profile.test.tsx`). |

Shots: `shots/sweep-z2/` holds the before and after for each fix, at 320 × 700 viewport height. Approved wording is
unchanged.

## How it was checked
- **Build**: production build of `195343e5` (merged tip), via `scripts/ui-checks/collab-qa.sh --production --serve`,
  with fictional profiles and data. Chromium at 320 × 700, default text, `reducedMotion: reduce`.
- **Rows**: every row marked ✓ (Jose, Nov 23) in `page-inventory.md`, reached through the inventory's own route map
  (`collab-inventory.mjs`).
  - Owner and Employee where both open the row; they render different components (manager vs employee screens).
  - Public rows signed out; J rows as Owner.
- **320px layout**: page overflow, text off screen, clipped text, text overlap, real hit areas (hit-tested out from
  each control's centre), and buttons in one row at equal height. I looked at every capture: probe flags for text
  under the fixed tab bar, and clipped separators, were false positives.
- **Keyboard**: Tab from the top through up to 40 stops. Checked that each stop is in view, the order never jumps back
  up the page, and the focused element shows a ring. The few “no ring” flags (F1 search, J13 rows) are visible rings
  drawn another way.
- **Sheets and dialogs**: each was opened with the keyboard, then closed with Escape, checking where focus went:
  - Owner Schedule: “More schedule actions” and “All locations” return focus to their button.
  - The Employee's shift sheet (day view) returns focus to the shift.
  - Swap shift (C14) and Can't work this shift (C15) open from inside the shift sheet and replace it. Escape returns
    focus to the shift that started the chain, since the sheet that held their opener has closed.
  - J13 tablet dialog returns focus to its row.
  - Policy disclosures (A11, A12, A14) keep focus on their summary.
- **Reduced motion**: `document.getAnimations()` after load. Nothing is running on any row.
- **Fix verification**: on the same production build, with the committed rules injected (the fixes came after the
  build). Measured at 320, 390, 768 and 1440: 390 and wider are unchanged by both fixes. Tests: `src/components/manager-profile` 19 passed, 0 failed.
- **Skipped**: axe, 200% text and 1440, as briefed (package Z).

## Results by row
| Row | Role | 320px layout | Keyboard (order, ring) | Sheets and dialogs | Reduced motion | Result |
|---|---|---|---|---|---|---|
| A1 | public | no scroll, nothing clipped | 15 stops in page order, all ringed | — | nothing runs | Pass |
| A2 | public | no scroll, nothing clipped | 15 stops in page order, all ringed | — | nothing runs | Pass |
| A3 | public | no scroll, nothing clipped | 9 stops in page order, all ringed | — | nothing runs | Pass |
| A4 | public | no scroll, nothing clipped | 14 stops in page order, all ringed | — | nothing runs | Pass |
| A5 | public | no scroll, nothing clipped | 15 stops in page order, all ringed | — | nothing runs | Pass |
| A6 | public | no scroll, nothing clipped | 10 stops in page order, all ringed | — | nothing runs | Pass |
| A7 | public | no scroll, nothing clipped | 13 stops in page order, all ringed | — | nothing runs | Pass |
| A7 | public | no scroll, nothing clipped | 9 stops in page order, all ringed | — | nothing runs | Pass |
| A8 | public | no scroll, nothing clipped | 11 stops in page order, all ringed | — | nothing runs | Pass |
| A9 | public | no scroll, nothing clipped | 7 stops in page order, all ringed | — | nothing runs | Pass |
| A10 | public | no scroll, nothing clipped | 7 stops in page order, all ringed | — | nothing runs | Pass |
| A11 | public | no scroll, nothing clipped | 21 stops in page order, all ringed | opens, Escape returns focus (Your workplace) … | nothing runs | Pass |
| A12 | public | no scroll, nothing clipped | 17 stops in page order, all ringed | opens, Escape returns focus (Your account) … | nothing runs | Pass |
| A13 | public | no scroll, nothing clipped | 10 stops in page order, all ringed | — | nothing runs | Pass |
| A14 | public | no scroll, nothing clipped | 15 stops in page order, all ringed | opens, Escape returns focus (What happens next) … | nothing runs | Pass |
| B1 | O | no scroll, nothing clipped | 21 stops in page order, all ringed | — | nothing runs | Pass |
| B1 | E | no scroll, nothing clipped | 15 stops in page order, all ringed | — | nothing runs | Pass |
| B2 | O | no scroll, nothing clipped | 14 stops in page order, all ringed | — | nothing runs | Pass |
| B2 | E | no scroll, nothing clipped | 14 stops in page order, all ringed | — | nothing runs | Pass |
| B3 | O | no scroll, nothing clipped | 7 stops in page order, all ringed | — | nothing runs | Pass |
| B3 | E | no scroll, nothing clipped | 11 stops in page order, all ringed | — | nothing runs | Pass |
| B4 | O | no scroll, nothing clipped | 28 stops in page order, all ringed | — | nothing runs | “All” filter chip is 42px wide; kit filter chips, for the lead. |
| B5 | E | no scroll, nothing clipped | 8 stops in page order, all ringed | — | nothing runs | Pass |
| B6 | O | no scroll, nothing clipped | 8 stops in page order, all ringed | — | nothing runs | Pass |
| B6 | E | no scroll, nothing clipped | 11 stops in page order, all ringed | — | nothing runs | Pass |
| B7 | O | no scroll, nothing clipped | 11 stops in page order, all ringed | — | nothing runs | Recipient names wrap a word a line beside Remind at 320; this is the approved Nov 23 behaviour (a name never breaks inside a word, Remind stays while the longest word fits). Left as is. |
| B7 | E | no scroll, nothing clipped | 7 stops in page order, all ringed | — | nothing runs | Recipient names wrap a word a line beside Remind at 320; this is the approved Nov 23 behaviour (a name never breaks inside a word, Remind stays while the longest word fits). Left as is. |
| B8 | O | no scroll, nothing clipped | 7 stops in page order, all ringed | — | nothing runs | Pass |
| B8 | E | no scroll, nothing clipped | 7 stops in page order, all ringed | — | nothing runs | Pass |
| B9 | O | no scroll, nothing clipped | 18 stops in page order, all ringed | — | nothing runs | Pass |
| B9 | E | no scroll, nothing clipped | 19 stops in page order, all ringed | — | nothing runs | Pass |
| B10 | E | no scroll, nothing clipped | 7 stops in page order, all ringed | — | nothing runs | Pass |
| B11 | O | no scroll, nothing clipped | 8 stops in page order, all ringed | — | nothing runs | Pass |
| B11 | E | no scroll, nothing clipped | 8 stops in page order, all ringed | — | nothing runs | Pass |
| C1 | O | no scroll, nothing clipped | 23 stops in page order, all ringed | — | nothing runs | Week-strip day buttons are 40–41px wide at 320 (seven share the row); 63px tall. Layout limit, not changed. |
| C1 | E | no scroll, nothing clipped | 19 stops in page order, all ringed | — | nothing runs | Week-strip day buttons are 40–41px wide at 320 (seven share the row); 63px tall. Layout limit, not changed. |
| C2 | O | no scroll, nothing clipped | 10 stops in page order, all ringed | — | nothing runs | Pass |
| C3 | O | not checked | not checked | — | — | needs a coverage gap route (manual) |
| C4 | O | no scroll, nothing clipped | 10 stops in page order, all ringed | — | nothing runs | Pass |
| C5 | O | no scroll, nothing clipped | 8 stops in page order, all ringed | — | nothing runs | Pass |
| C6 | O | no scroll, nothing clipped | 5 stops in page order, all ringed | — | nothing runs | Pass |
| C7 | O | no scroll, nothing clipped | 8 stops in page order, all ringed | — | nothing runs | Pass |
| C8 | O | no scroll, nothing clipped | 9 stops in page order, all ringed | — | nothing runs | Pass |
| C9 | O | no scroll, nothing clipped | 12 stops in page order, all ringed | — | nothing runs | Pass |
| C10 | O | no scroll, nothing clipped | 17 stops in page order, all ringed | — | nothing runs | Pass |
| C10 | E | no scroll, nothing clipped | 16 stops in page order, all ringed | — | nothing runs | Pass |
| C11 | E | no scroll, nothing clipped | 7 stops in page order, all ringed | — | nothing runs | Pass |
| C12 | O | no scroll, nothing clipped | 9 stops in page order, all ringed | — | nothing runs | Waiting / Open cover / Done tabs are the kit segmented control (37px drawn); kit file, for the lead. |
| C12 | E | no scroll, nothing clipped | 11 stops in page order, all ringed | — | nothing runs | Waiting / Open cover / Done tabs are the kit segmented control (37px drawn); kit file, for the lead. |
| C13 | O | no scroll, nothing clipped | 4 stops in page order, all ringed | — | nothing runs | Pass |
| C13 | E | no scroll, nothing clipped | 6 stops in page order, all ringed | — | nothing runs | Pass |
| C14 | E | no scroll, nothing clipped | 4 stops in page order, all ringed | — | nothing runs | Pass |
| C15 | E | no scroll, nothing clipped | 4 stops in page order, all ringed | — | nothing runs | Pass |
| D1 | O | no scroll, nothing clipped | 23 stops in page order, all ringed | — | nothing runs | Pass |
| D2 | O | no scroll, nothing clipped | 10 stops in page order, all ringed | — | nothing runs | Pass |
| D3 | O | no scroll, nothing clipped | 3 stops in page order, all ringed | — | nothing runs | “Time to correct” shows its placeholder option cut (“Choose recorded or missin”): a native select cannot wrap and already fills the card; approved wording. Left as is. |
| D4 | E | no scroll, nothing clipped | 8 stops in page order, all ringed | — | nothing runs | Pass |
| D5 | O | no scroll, nothing clipped | 10 stops in page order, all ringed | — | nothing runs | Pass |
| E1 | O | no scroll, nothing clipped | 15 stops in page order, all ringed | — | nothing runs | Waiting / Approved / Declined tabs are the kit segmented control (37px drawn); kit file, for the lead. |
| E1 | E | no scroll, nothing clipped | 9 stops in page order, all ringed | — | nothing runs | Waiting / Approved / Declined tabs are the kit segmented control (37px drawn); kit file, for the lead. |
| F1 | O | no scroll, nothing clipped | 23 stops in page order, all ringed | — | nothing runs | Search field focus is a 2px inner white ring on the band (visible; my probe reads only outlines). |
| F2 | O | no scroll, nothing clipped | 9 stops in page order, all ringed | — | nothing runs | Pass |
| F4 | O | no scroll, nothing clipped | 16 stops in page order, all ringed | — | nothing runs | Pass |
| F5 | O | no scroll, nothing clipped | 7 stops in page order, all ringed | — | nothing runs | Pass |
| F6 | O | no scroll, nothing clipped | 9 stops in page order, all ringed | — | nothing runs | Pass |
| F7 | O | no scroll, nothing clipped | 7 stops in page order, all ringed | — | nothing runs | Pass |
| F8 | O | no scroll, nothing clipped | 8 stops in page order, all ringed | — | nothing runs | Pass |
| I1 | O | no scroll, nothing clipped | 13 stops in page order, all ringed | — | nothing runs | I1 Owner and Manager: passkey explanation squeezed beside “Add a passkey” (fixed 5f5002a2); I1 Manager: approval values one word a line below 360px (fixed 3d0d8fba) |
| I1 | E | no scroll, nothing clipped | 10 stops in page order, all ringed | — | nothing runs | Pass |
| I2 | E | no scroll, nothing clipped | 22 stops in page order, all ringed | — | nothing runs | Pass |
| I2 | E | no scroll, nothing clipped | 19 stops in page order, all ringed | — | nothing runs | Pass |
| I3 | E | no scroll, nothing clipped | 10 stops in page order, all ringed | — | nothing runs | Pass |
| I4 | O | no scroll, nothing clipped | 13 stops in page order, all ringed | — | nothing runs | Pass |
| I4 | E | no scroll, nothing clipped | 8 stops in page order, all ringed | — | nothing runs | Pass |
| I5 | O | no scroll, nothing clipped | 14 stops in page order, all ringed | — | nothing runs | Pass |
| I5 | E | no scroll, nothing clipped | 7 stops in page order, all ringed | — | nothing runs | Pass |
| I6 | O | no scroll, nothing clipped | 7 stops in page order, all ringed | — | nothing runs | Show password eye is 41px wide (45px tall); kit password field, for the lead. |
| I6 | E | no scroll, nothing clipped | 6 stops in page order, all ringed | — | nothing runs | Show password eye is 41px wide (45px tall); kit password field, for the lead. |
| J1 | O | no scroll, nothing clipped | 21 stops in page order, all ringed | — | nothing runs | Pass |
| J2 | O | no scroll, nothing clipped | 7 stops in page order, all ringed | — | nothing runs | Pass |
| J3 | O | no scroll, nothing clipped | 8 stops in page order, all ringed | — | nothing runs | Pass |
| J4 | O | no scroll, nothing clipped | 11 stops in page order, all ringed | — | nothing runs | Pass |
| J5 | O | no scroll, nothing clipped | 9 stops in page order, all ringed | — | nothing runs | Pass |
| J6 | O | no scroll, nothing clipped | 10 stops in page order, all ringed | — | nothing runs | Pass |
| J7 | O | no scroll, nothing clipped | 13 stops in page order, all ringed | — | nothing runs | Pass |
| J8 | O | no scroll, nothing clipped | 9 stops in page order, all ringed | — | nothing runs | Pass |
| J9 | O | no scroll, nothing clipped | 9 stops in page order, all ringed | — | nothing runs | Pass |
| J10 | O | no scroll, nothing clipped | 9 stops in page order, all ringed | — | nothing runs | Pass |
| J11 | O | no scroll, nothing clipped | 15 stops in page order, all ringed | — | nothing runs | Pass |
| J13 | O | no scroll, nothing clipped | 8 stops in page order, all ringed | opens, Escape returns focus (Fictional payroll cloc) | nothing runs | Rows draw their focus ring on the row around the button (visible). |
| J14 | O | no scroll, nothing clipped | 7 stops in page order, all ringed | — | nothing runs | Pass |
| J15 | O | no scroll, nothing clipped | 15 stops in page order, all ringed | — | nothing runs | Pass |
| J16 | O | no scroll, nothing clipped | 7 stops in page order, all ringed | — | nothing runs | Pass |

## Left as is, with reason
- **B7 Update detail (Owner)**: at 320, recipient names wrap a word a line beside Remind. That is the Nov 23 queue
  decision recorded in `messages-manager-b.css`: a name never breaks inside a word, and Remind stays beside it while
  the longest word fits.
- **D3 Fix someone's time**: the “Time to correct” dropdown shows its placeholder cut at 320. A native select cannot
  wrap, it already fills the card, and the wording is approved.
- **C1 Schedule**: the week-strip day buttons are 40–41px wide (63px tall) at 320, because seven share the row.

## For the lead (kit files, not changed here)
- Segmented tabs (C12 Waiting/Open cover/Done, E1 Waiting/Approved/Declined) draw 37px tall at 320.
- B4's “All” filter chip is 42px wide.
- I6's “Show password” eye is 41px wide (45px tall).

## Not checked
- C3 Review replacement: needs a live coverage gap opened by hand.
- J18 Billing, K13 and K15: separate commerce and Clocker fixtures.
- F3: not in the approved list.
