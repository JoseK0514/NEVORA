# Phase 3, package F: the Owner and Manager shell

Sidebar, tablet rail, phone tab bar, top bar, count badge and touch targets.
Patch: `f.patch` (9 files, 244 insertions, 30 deletions; applies cleanly to `ed7f8b4c`). Screenshots: `f-shots/`.

This was a takeover. The earlier builder's partial work was read line by line against the findings. Its navigation,
badge, pill and toggle work was right and is kept. I added the touch rule (TB-010), moved the collapsed-rail badge so it
covers less of the glyph, added tests, and did all the browser checks. Nothing from the earlier work was removed.

## Findings

| Id | Status | What was done or found | Evidence | Remains |
|---|---|---|---|---|
| OW-028 (name) | fixed | In the full sidebar the workspace name wraps to two lines (13.5/17, weight 600, card 56px). The card keeps its `title` tooltip. In the rail the name shows in the rail tooltip, as before. | `owner-b-shell.css` 103 to 125. Measured at 1440: card 200x56, name 139x34, nothing clipped. `f-shots/01`. | none |
| OW-028 (badge) | fixed | One count pill: 20px tall, 12/700, white on teal, in the sidebar, the rail and the phone tab. Red is no longer used for a count. | `owner-b-shell.css` 51 to 61 (tab) and 77 to 102. Measured: 28x20, `rgb(11,110,105)`, 12px 700 at 1440, 1100, 1024, 900, 768; phone tab 25x20. `f-shots/01, 02, 09, 10`. | "Past its deadline" in red needs Codex (below). |
| MG-006 | fixed | Teal pill on the tab and the sidebar. Manager sidebar reads Home, Things to do, Schedule, Time, Team. The phone keeps five tabs with To do second. A Manager who reviews payroll keeps Home, Schedule, Time, Payroll, Team on the phone (no To do tab exists there). The brief's 20px pill was used, not the finding's 18px. | `navigation.ts` 151 to 160 and 284 to 287. `f-shots/07, 10`. | none |
| MG-007 | fixed | The Manager's second sidebar group has no heading (a hairline sets it apart). "Scheduling rules" and "My pay" are in the Manager's sidebar. Both were already in the Manager's navigation by the existing checks, so nothing new is reachable: a Manager with payroll off gets no My pay, a location-scoped Manager gets no Scheduling rules (tested). More no longer lights Home; it lights nothing and the account pill is marked. My pay left the Manager's account menu on tablets and desktop, so it has one place. | `navigation.ts` 70 to 73, 98, 189. `navigation-sidebar.test.ts`. `f-shots/07, 08`. | The Manager's My pay page still shows "‹ More" above its title (page content, see "Needed from another package"). |
| MG-014 | already fixed, verified | Round 1's rule holds. Manager at 390: closed Payroll, closed Settings and Insights light no tab. At 900 and 1440: closed Payroll and closed Settings light no sidebar entry; Insights lights its own entry. No stragglers found. | Probe rows for `/app/payroll`, `/app/settings`, `/app/reports` at 390, 900, 1440. Three new tests in `app-shell.test.tsx`. | none |
| TB-001 (remainder) | fixed | The current entry's glyph is drawn filled in the sidebar and the rail (and Help when it is the page). This is the one change an Employee or Lead sees. | `app-shell.tsx` 497, 530. `f-shots/08, 11`. | The rail's current mark is the Round 1 teal-50 pill (56x30) behind the glyph, not a 48px square. A square does not fit the labelled 56px entry. For Jose. |
| TB-007 | fixed | One rail badge for Owner and Manager: the same 20px teal pill with a 2px white ring. On the labelled tablet rail it overlaps 4px of the glyph's corner. On the collapsed rail from 1024px it sits above the entry's top right corner and covers the top 4px of the glyph. "99+" cap was already there. | Measured at 900: badge 46,372 28x20, glyph 30,381 20x20. At 1100 collapsed: badge 32,330, glyph 26,346. `f-shots/02, 09`. | The Employee rail badge (16px) was not touched (out of scope). |
| TB-008 | needs Jose | Not changed, as instructed. Employee and Lead still have the bell in the rail and the bell in the top bar. | `f-shots/11` | Jose picks one. |
| TB-009 | fixed | More, Profile and My pay (Owner) light nothing in the sidebar or rail. The account pill takes `aria-current="true"` and a 2px white inner ring. The current rail glyph is filled teal on the teal-50 pill. | `app-shell.tsx` 412 to 417, `action-menu.tsx`, `owner-b-shell.css` 86 to 87. Probe: `cur=true:… account menu` on `/app/more`, `/app/profile`, `/app/my-pay` at 768 to 1440, both roles. `f-shots/03, 04`. | none |
| TB-010 | fixed | Most of the finding was already met by Round 1 and Phase 1: with a coarse pointer at 900, underline tabs, card-header links and lone card links already measured 44px or had a hit area. A probe with touch on (19 Owner and 18 Manager routes) found what was left, and one rule in my sheet gives each a centred hit area of at least 44x44 without changing the drawn size. Selectors below. | `owner-b-shell.css` 127 to 139. Probe after: each listed control reports the hit area. | Schedule's open-shift block (79x28) and Time exports' older 40px buttons and bare checkboxes: see "Needed from another package". Not tested on a real touch device. |
| TB-017 | fixed | Under 1024px the toggle is not drawn for Owners and Managers and the labelled rail is the only state. A choice to expand made at 1024px or wider does not carry down to a tablet, and returns when the window is wide again. The workspace tile is now the first thing in the rail. | `app-shell.tsx` 69 to 75, 206 to 208. `owner-b-shell.css` 91 to 93. Probe: expand at 1024, 1100 or 1440, then 900: sidebar 80px, no toggle. `f-shots/03, 05`. | From 1024 to 1279px the toggle stays and the expanded sidebar still pushes the page. See "For Jose". |
| TB-004 (remainder) | verified, nothing changed | The Phase 2 frame holds at 900 and 768. Bands: 196, 224 or 296. Owner Notifications and Updates end at 296 at both widths. Home ends at 383 (title at 109), as Phase 2 left it. Payroll now ends at 296 (it was 314 in the Phase 2 pictures; the base already hides the pay-frequency line). | 17 Owner and 12 Manager routes measured at 900 and 768; table below. | TB-004's shorter tablet bands (144, 168, 200, Home 300) were decided otherwise in Phase 2. |
| TB-014 | verified, nothing changed | Titles sit at 88, or at 130 under a back link at 88. First card starts 24px under the band, or overlaps it by 52px. No page breaks the frame. | Same measurements. | Owner Updates has its title at 130 with no back link above it (root page). That is page content, not shell. |
| Nov 14 inspection | already fixed | BR-4 (tabs) and RA-17 (sidebar focus in forced colours) were done in Round 1 and still hold. No other open Owner or Manager shell item needs no decision. | `fixes/05-navigation.md`, `fixes/09-design-foundation.md`; probe rows. | BR-4's Employee Help back link is Employee scope. |

### TB-010: what the touch rule covers

Media: `(min-width: 768px) and (pointer: coarse)`. Scope: `.app-shell[data-nv-b]:not([data-employee-mobile]) main.page-frame`.
Each gets `position: relative` and an `::after` hit area `max(100%, 44px)` square, centred.

- `.c-nav__back` and `.q-nav > .q-nav__l`: the band's back link (32px drawn).
- `.q-nav > .q-nav__r`: the band's right-hand action (42px: New update, Edit).
- `.c-title__actions > .c-btn`: a title action (42px: Add employee).
- `nav.c-pay-tabs > a`: Payroll's tabs (36px in a 44px track).
- `.c-sched-week__arrow`: Schedule's previous and next week (32x32).
- `.c-sched-actions > .c-btn`: Schedule's Add shift (42px).
- `.c-formhead__up`: a form's back link (32px).
- `.q-acts > .q-bs`: Decline and Approve in Time off and Shift requests (40px).

Already 44px or with a hit area before this patch: `.c-tabs`, `.c-tc-tabs` buttons, `.b-card__a`, the segments
(`.b-seg`, `.c-seg`, `.q-seg`, `.b-filters`), Schedule's location and "…" buttons, the kit buttons.

### TB-004 and TB-014 numbers (title top, band bottom, first card top)

| Page | 900 | 768 |
|---|---|---|
| Home (Owner, Manager) | 109, 383, 331 | 109, 383, 331 |
| Things to do, Schedule, Timecards | 88, 296, 244 | 88, 296, 244 |
| Payroll (Owner), Team | band 296, card 244 | band 296, card 244 |
| Notifications, Time off, Availability | 130, 296, 320, back link at 88 | same |
| Updates | 130, 296, 320, no back link | same |
| Insights, Settings, More, Help, My pay | band 196, card 220 | same |
| Profile | 88, 196, 220 | same |
| Scheduling rules | 130, 224, 248, back link at 88 | same |
| Manager closed Payroll and Settings | band 196, card 220 (560 wide) | same |

All 18 Manager rows that have a Phase 2 number are identical to it. Owner: 32 identical, 2 differ (Payroll, explained above).

## What changed, by screen

- **Sidebar (1024px and wider, Owner and Manager).** Workspace name wraps to two lines. Teal count pill. The current
  entry's glyph is filled. More, Profile and the Owner's My pay light no entry.
- **Manager sidebar.** Order Home, Things to do, Schedule, Time, Team. Second group has no heading and holds Insights,
  Updates, Scheduling rules, My pay.
- **Collapsed rail (1024px and wider).** Teal pill with a white ring above the entry's corner.
- **Tablet rail (768 to 1023px, Owner and Manager).** No sidebar toggle; the workspace tile is first. Teal pill. Filled
  current glyph.
- **Top bar.** The account pill has a white ring and `aria-current` on More, Profile and My pay. A Manager's account
  menu no longer lists My pay (it is in the sidebar).
- **Phone tab bar.** Teal 20px count. Manager order Home, To do, Schedule, Time, Team. Owner order unchanged.
- **Owner and Manager pages on touch screens from 768px.** Bigger hit areas only; nothing looks different.
- **Employee and Lead.** The current sidebar or rail glyph is filled. Nothing else. Profile is pixel-identical before
  and after at 390, 900 and 1440; My pay differs only in the 17x15px glyph at 900 and 1440 and not at all at 390.

## Wording changed

- Manager sidebar group heading: "More" to no heading. The Owner and Employee keep "More".
- No other string changed. "Scheduling rules" and "My pay" are the existing labels in a new place.

## Decisions recorded for Jose

1. Badge colour is teal everywhere. The shell cannot know what is past its deadline (see "For Codex").
2. TB-017: the toggle was removed under 1024px, not moved to the foot of the rail.
3. A Manager's My pay moved from the account menu to the sidebar on tablets and desktop. The phone's More page still lists it.
4. The account pill uses `aria-current="true"`, not `"page"`: it is a menu button, not a link to the page.
5. The filled current glyph applies to Employees and Leads too, because TB-001 names all roles and DESIGN.MD says fill
   marks the current state. Say if their shell should go back to bold only.
6. Rail labels stay "Things to do" and "Scheduling rules" (two lines). TB-001's shorter "To do" was not applied in Round 1 and I left it.

## For Jose to decide

- **TB-008.** Employee and Lead tablets show two bells (rail and top bar). Keep one.
- **Expanded sidebar from 1024 to 1279px.** It still pushes the page. At 1024px wide with the sidebar expanded, Home's
  right column is too narrow: on the Payday card "11 timecards to review" runs into "Pay period ended" and "This week"
  is clipped (`f-shots/12`). This was so before Phase 3. At 1100px it fits. Options: make the expanded sidebar an overlay
  with a scrim up to 1279px, or have Home drop to one column when its space is under about 820px.
- **Current rail mark.** Pill (now) or TB-009's 48px square.
- **Manager's My pay back link.** It reads "‹ More" although My pay is now a sidebar entry.

## For Codex

- **Overdue count for the red badge (OW-028, MG-006).** `GET /api/manager/inbox-count` returns `{ state, count }`
  only. To show red for "past its deadline" the shell would need a second number, for example `overdue`, from the same
  read (`src/lib/data/inbox-count.server.ts`), read in `src/components/use-inbox-count.ts`. Until then every count is teal.

## Needed from another package

- **Home (Owner and Manager).** The Payday card and "This week" card overlap or clip when the content area is about
  790px wide (1024px with the sidebar expanded).
- **Schedule.** The open-shift block `a.cm-block.open` is 79x28 on touch tablets. It needs a taller block or a hit area
  inside the grid; I did not touch the grid.
- **Time exports.** Older `button.button` controls are 40px on touch ("Refresh the list", "Save this list", "Save
  period record") and the person checkboxes are bare 20px inputs.
- **My pay (Manager).** On tablets and desktop the page draws "‹ More" and puts the title at 130. As a sidebar page it
  should have no back link and the title at 88.
- **Updates (Owner).** Title at 130 with no back link above it at 900 and 768 (TB-014).
- **DESIGN.MD and `status.json`.** Not edited (shared files). They need the badge rule, the Manager order and the
  tablet toggle rule added by whoever merges.

## Checks run

- `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .`: no errors outside `zz-scan/`.
- `npx eslint` on the 8 changed ts and tsx files: clean.
- `npx vitest run --dir src src/components/app-shell src/components/action-menu src/lib/navigation src/app/app/b-viewport.test.ts src/app/app/b-foundation.test.ts`: 13 files, 272 tests pass.
- `npx vitest run --dir src src/app src/components src/lib`: 811 files pass, 1 fails: 7 tests in
  `src/lib/tenancy/migrations/typed-guarded-backfill.server.test.ts` timed out at 5000ms while captures were running.
  Run alone, that file passes (68 of 68). It is server code I did not touch. The full run was before the last CSS-only
  edit (two selectors added to the touch rule); the shell and stylesheet tests were run again after it and pass.
- Browser, real app, fictional data, real sign-in:
  - Owner at 1440, 1100, 1024, 900, 768, 390 on 14 routes; sidebar toggled at 1440, 1100 and 1024 (collapsed and
    expanded), then narrowed to 900. Manager the same on 15 routes (4 routes at 1100, 1024 and 768).
  - Overflow 0 on every row. `aria-current` is on exactly one sidebar or tab item, or on none plus the account pill.
  - Keyboard: 14 to 18 Tab presses on Home at 1440, 1100, 1024 (Owner), 1440, 900 and 390 (Manager). Order is skip link,
    brand, toggle, entries top to bottom, Help, then Search, bell, account pill, then the page; on the phone the tab bar
    comes last with To do second. Every stop shows a ring.
  - Touch (Playwright `hasTouch`, `pointer: coarse` confirmed true) at 900 on 19 Owner routes and 18 Manager routes.
  - Employee at 1440, 900 and 390 on 5 routes, compared pixel by pixel with the Phase 2 pictures.
  - Captures ran with `reducedMotion: 'reduce'`. The patch adds no motion.

## Not verified

- A real touch device. Touch was emulated.
- Windows High Contrast and screen readers.
- A Lead, and a location-scoped Manager, in the browser (unit tests cover their sidebars).
- A Manager who reviews payroll, in the browser (unit tests cover the order).
- Motion with reduced motion off.
- The console showed 503 and "statement timeout" lines on some rows while six builders shared the machine. One Owner
  Things to do capture showed "Things to do didn't load" for that reason; the same page loaded in the other runs.
- The Manager's Schedule at 1440 (the page timed out in that run; it was checked at 900 and with touch). The Manager's
  Scheduling rules at 1440 has frame numbers from a later run but no shell probe row.
