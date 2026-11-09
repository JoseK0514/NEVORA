# Phase 4: desktop layout, report

October 19, 2026 · Desktop session (`claude/p4-desktop-240fe0`) · For Jose and the coordinator.

**Status: ROUND5_STATUS**

Phase 4 brings the Manager and Owner pages built in Phase 2, and then every Employee and Lead page, to desktop (761–1440): Gusto-style layouts in the kit, a teal band no taller than 200px, the sidebar's "Team" with Requests folded into Inbox, and a list-and-detail Inbox. Phones (320–430 and landscape) look as they did in Phase 2, apart from the defect fixes the coordinator asked for (listed below).

Jose signed off both builds as built: Manager and Owner ("Approve desktop", `shots/build-1-*.png`), and Employee and Lead (`shots/employee-build-1-*.png`).

## What changed

### Shell (desktop sidebar, account menu, header; every role)

- **Sidebar (D-4).** The people page reads "Team". Requests left the sidebar: `/app/requests`, `/app/exchange` and `/app/availability` still work and light Inbox. Groups read Plan, People, Time and pay, Workspace, at 14px in rem, as is "Powered by".
- **Trail.** It ends with the page's own name: "Plan › Inbox › Time off", "Time and pay › Timecards › Time exports", "Workspace › Settings › Payroll settings", "Plan › Home › Team overview". A holder or section entry is `aria-current="true"`; only the page itself is `"page"`.
- **Account menu.** "Your profile" (Owner and Manager too, for the Profile session's page) and "My pay". It closes when focus leaves it. The trigger is named "<name>, account menu". A long name gives way to the trail below 1100px.
- **Inbox count.** The sidebar's Inbox badge (12px) uses the shared count hook against Codex's `GET /api/manager/inbox-count`. No badge while it's unavailable or zero.
- **Skip link** to the page as the first Tab stop on desktop. `scroll-padding-top` keeps focused items clear of the 65px header. The header is solid.

### Bands (every page, desktop)

- At most 200px at 761–1440 and 100% text: 116–196px measured.
- The eyebrow-row control (Refresh, Add shift, Add employee) overhangs the eyebrow line. Filters and view chips sit on the title row and overhang it by 2px, so every title sits on one line. The title wraps only between words. At large text the controls move to their own row (container query, 24rem).
- Section tabs (Time and pay; Employee Requests and Pay) sit inside the top of the band, as on phones. Sibling tabs share one title line (y 88), and from 1024 one band height (184).
- Route placeholders carry the band at each page's final desktop height, for every shell.

### Manager and Owner pages

- **Home.** Today runs the full width. One column below 1180px. From 1180px, Next up, Also needs you and (Owner) Finish setting up are on the left, and This week, Plan ahead and Team tools on the right. Loading rows match the real rows to the pixel.
- **Inbox, list and detail.** From 1024px the list is on the left and a sticky detail pane on the right.
  - Clicking or pressing Enter on a row selects it, keeps `?item=` and moves focus to the pane heading. Escape or Shift+Tab goes back. Cmd/Ctrl-click opens the review.
  - The pane shows the facts and a note written for each item type, and one button to the full review. Decisions stay there (O1).
  - A "Request pages" row (Time off, Shift requests, Availability) heads the list.
  - Both columns, the list's height and the scroll position hold through the 30-second re-read, Refresh ("Refreshing…"), pause, offline and failed reads. The status card stays in view and takes focus.
  - Up and Down move between rows and group headings.
  - Codex's request facts (Dates, Time, Length, Works at, Note) show when present.
- **Team.** From 1024px it's a people table (Name, Role, Location, Phone), with the finder on one row.
- **Schedule, Timecards, Payroll runs, Time exports.** Legacy text is on the 14px floor. The schedule chips stay one row. The toolbar is a kit card. Timecards "Details" follows the name. Time exports columns, insets and gaps follow the kit.
- **Home's views.** They're on the band rules. Attendance no longer shifts when its "limited" notice arrives.

### Employee and Lead pages (desktop only; started in parallel at Jose's request)

- Band rules and placeholders.
- View chips on the title row.
- Cards on the band's text edge.
- A 14px floor on legacy text.
- My schedule: the week beside a sticky Confirm/What changed column from 1100px.
- Profile: two panels side by side from 1024px.
- My time: two kit cards side by side.
- Pay tabs read "My pay / My time / Timecards".

### Phone-visible fixes (at the coordinator's request)

- Attendance and Time exports no longer shift on load.
- The Inbox filter row isn't an unfocusable scroll region while loading (axe).
- The action-center re-read no longer empties the Inbox and Home every 30 seconds (IS-P4-01, P0).
- Home's Clocker recovery line reads "Check a saved Clocker action".
- Owner and Manager Profile appears in More › My account.

## Files

| File | What it holds |
|---|---|
| `src/app/app/premium-desktop.css` | Every desktop rule, under the desktop query, plus the few all-width fixes named above |
| `src/components/manager-inbox.tsx` | List and detail, held states, request facts, Request pages |
| `src/components/app-shell.tsx`, `src/lib/navigation.ts`, `src/lib/row-navigation.ts`, `src/components/portal-account-menu.tsx` | Sidebar, trail, account menu, skip link, row keys |
| `src/components/manager-action-center.tsx` | Keeps the confirmed read during a re-read |
| `src/components/employee-directory.tsx`, `src/components/payroll-export.tsx`, `src/components/premium-home.tsx` | Team table columns, export loading marker, Clocker wording |

## Checks run on the final build

CHECKS_TABLE

## Inspection rounds

| Round | Where | Commit | Result |
|---|---|---|---|
| 1 | Local, five inspectors | `7f9abac` | AL 1 P0 7 P1 10 P2 · ST 3 P1 5 P2 · TC 5 P1 10 P2 · IS 1 P0 4 P1 10 P2 · WR 1 P0 3 P1 6 P2 |
| 2 | Local, five inspectors (plus Employee and Lead first pass) | `0abdc74` | AL 1 P1 11 P2 · ST 2 P1 3 P2 · TC 3 P1 5 P2 · IS 6 P2 · WR 1 P0 2 P1 4 P2 |
| 3 | Handed to Codex at `2250275`; not picked up | | |
| 4 | Local (Codex hadn't picked up round 3) | `a6f009d` | AL 3 P1 4 P2 · ST 1 P1 · TC 2 P2 · IS 1 P1 2 P2 · WR 3 P1 2 P2 |
| 5 (exit) | Local and Codex | `8012d97` | ROUND5_RESULT |

The reports are in `inspection/` (`alignment.md`, `stability.md`, `type-colour-copy.md`, `interaction-states.md`, `widths-roles.md`), with each round appended.

## Not counted, with the reason

| Item | Why |
|---|---|
| IS-P4-05, WR4-02: Profile for Owners and Managers lands on Home | The Profile session's page removes the redirect at the merge. |
| IS-P4-11: the review's "‹ Inbox" drops the pane selection | Wave A's `manager-time-off.tsx`; the exact change was sent. |
| IS-P4-19: Employee refresh buttons drop focus while busy | The coordinator's components. |
| ST-P4-08: the header moves 3–5px when Inter loads | The coordinator added Inter fallback metrics and a preload. |
| AL4-30: the Inbox summary reserve at 200% text | The coordinator's `portal-premium.css:502`. |
| WR4-16: Employee Home date at 320 | The coordinator's phone fix. |
| ST-P4-06: the Inbox band keeps two summary lines (196px) | Decided: the band never grows when a longer summary arrives. |
| WR4-05, AL4-09: Home's two columns end at different heights | Decided: it depends on data. Phones need the cards in this DOM order, and grid has no masonry. |
| The inbox-count 404 on each page load | Pre-merge only: Codex's route arrives at the merge. |

## Set aside for Codex

See `CODEX.md`.
- **Built, wired in this branch:** the Inbox count and the request facts.
- **Still open:** "Next request (2 of N)" after a decision; the dev-only error switch; Approve and Decline in the pane, only if Jose changes O1.
- **Joint tests after the merge:** every count badge matches Home's summary; the pane's facts match the review; a decision returns to the Inbox filter.

## Payroll and legal wording

No payroll or legal wording was changed. "Missing pay periods" (WR-15) and the Time exports wording stay as they were, pending Jose's approval.

## Screenshots

`shots/build-1-1440.png`, `shots/build-1-1024.png`, `shots/employee-build-1-1440.png`, `shots/employee-build-1-1024.png` (signed off), and `shots/final-390.png` and `shots/final-1440.png` (the final build).
