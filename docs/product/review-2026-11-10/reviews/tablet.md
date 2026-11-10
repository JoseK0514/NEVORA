# NEVORA tablet review: every role at 900px, plus 768px for Home and Schedule

## Scope, method and baseline

- **Surface:** tablets, 768–1023px ("Option B, small desktop": the desktop Direction B with the collapsed icon rail). All images are in `/tmp/review/tablet/` (227 images, 203 audit files). Below, `T/` stands for `/tmp/review/tablet/`.
- **Roles:**
  - Owner (Jose, NC workspace)
  - Manager (Elena)
  - Employee (Maria, NQ workspace)
  - Lead (James)
- **Screens viewed:** every distinct route at 900 at least once (Owner in full). Manager, Employee and Lead were viewed wherever they differ: role-gated pages, Home, Schedule, Requests, Updates, Help, Profile and Account deletion. Every 768 frame was compared with its 900 frame (Home ×4, Schedule ×4). I also opened the state-runner PNGs (2× captures) and compared against desktop `owner-home-1280`.
- **Judged against:**
  - DESIGN.MD "Tablets (768–1023px), all roles" (lines 1523–1535).
  - The approved mock `docs/product/direction-b/mocks/6-tablets.html`. Its specs: "Rail buttons 48×48 (up from 40 on desktop). Top bar controls 44px."; "At 768 the two cards under Needs you are 348px each … so nothing wraps"; "long [times] wrap to two lines"; the timecard detail "slides in from the right at 400px".
- **Numbers** come from the `.audit.json` beside each image (`targetsUnder44`, `textUnder12px`, `lowContrastText`, `axe`, `audit.overlap/clipped`).
- **Not repeated:** findings already in `code-design-system.md` (C1–C14, T1–T8, S1–S7, B1–B8, I1–I6, M1–M3, D1–D4) and `copy-audit.md`. They are cited by ID only where a tablet screen shows a new instance.

Severity scale: **High** blocks or confuses a task, or fails accessibility. **Medium** is a visible inconsistency or friction. **Low** is polish.

---

## Shell (every tablet screen): rail, top bar and band

### TB-001 · High · The rail's touch targets are 40×48, not the approved 48×48, and the red badge covers the icon
- **Images:** every tablet frame, for example `T/owner-home-900.jpg`, `T/owner-inbox-900.jpg` (Things to do active), `T/owner-state-home-900-state-home-fold.jpg` (2× capture).
- **What's wrong:**
  - The audit reports `a.nav-link` at **40×48** on all 203 audited frames. The active state draws as a 40-wide, 48-tall vertical lozenge rather than the mock's 48px square.
  - The Things to do badge (`span.nav-count`, 11.5px) sits on top of the tray glyph and covers about half of it. On desktop the count sits at the end of a labelled row (`/tmp/review/owner-desktop/owner-home-1280-fold.jpg`).
  - The mock places the badge at `top:2px; right:0` of a 48px button, which clears the glyph.
- **Principle:** Fitts's law; the mock spec ("Rail buttons 48×48"); figure-ground (the badge occludes the icon).
- **Cause:**
  - `src/app/app/corp-shell.css:593` fixes the tablet rail link at `width: 40px; height: 40px; min-width: 40px`.
  - The tablet block only raises the height: `src/app/app/owner-b-desktop.css:828` (`height: 48px`).
- **Fix:**
  - In the tablet block (owner-b-desktop.css:828), also set `width: 48px !important; min-width: 48px !important; border-radius: 14px`, the mock's `.ni` values.
  - Position `.nav-count` at `top: 2px; right: 0` so it rides the corner, not the glyph.
  - Make the counts 12px per T5.

### TB-002 · High · Rail labels never appear on touch, so icon-only navigation can't be learned on a tablet
- **Images:** `T/employee-home-900.jpg`, `T/owner-home-900.jpg`, `T/lead-schedule-900.jpg`.
- **What's wrong:**
  - The approved rail relies on "labels as tooltips". `src/components/sidebar-rail-tooltip.tsx:64` returns early when `event.pointerType === "touch"`, and `:84` hides the tip on `pointerdown`. A tablet user therefore never sees a name before committing to a tap.
  - Several glyphs are ambiguous without one:
    - The Employee rail shows **FileText** (Pay) next to **ClipboardText** (Requests). Both read as "document".
    - The Owner rail shows **Tray** (Things to do) next to **Users** (Team).
  - The same destination uses a different icon on phone and tablet: Employee Pay is `receipt` in the phone tab (`src/lib/navigation.ts:255`) but `statement`/FileText in the sidebar (`src/lib/navigation.ts:211`).
- **Principle:**
  - Recognition over recall.
  - Jakob's law (a tablet user can't hover).
  - Similarity (two document glyphs).
  - Consistency across devices.
- **Fix (stays inside the approved rail):**
  - Show the existing tip on **touch-and-hold**: on `pointerdown` with `pointerType === "touch"`, start the 300ms `RAIL_TIP_DELAY_MS` timer, and cancel it on `pointerup` before the delay.
  - Use the phone tab's icon for the same destination in the rail (`receipt` for Pay at navigation.ts:211).
  - Keep the toggle that opens the full sidebar as the always-available path to labels.

### TB-003 · Medium · Top-bar controls are 40px, not the approved 44px; the account trigger shrinks to an initials chip at 768
- **Images:** `T/owner-home-900.jpg`, `T/owner-home-768.jpg`, `T/employee-schedule-768.jpg`.
- **What's wrong:**
  - The audit reports `a.portal-notification-bell` at 40×40 (203/203 frames), `button.command-finder-trigger` at 240×40 (138 frames) and the account menu trigger at 153–168×40.
  - The mock says "Top bar controls 44px".
  - At 768 the account trigger drops the name: "JN ⌄" is 72×40.
- **Principle:** Fitts's law; the mock spec.
- **Cause:** owner-b-desktop.css:49 and :325 (bell 40px); the finder-trigger width is set at :817 with height inherited at 40.
- **Fix:** In the tablet block (owner-b-desktop.css:813–829), set 44px heights for the bell, the finder trigger and the account trigger (radius 22).

### TB-004 · Medium · Employees and Leads see three notification indicators at once, in three styles
- **Images:** `T/employee-more-900.jpg`, `T/employee-home-900.jpg`, `T/lead-home-768.jpg`.
- **What's wrong:** On one screen the Employee sees all three of these:
  - a coral **dot** on the top-bar bell (the count is rendered at `font-size: 0px`; the audit lists `span.portal-notification-count 0px` on 65 Employee/Lead frames);
  - a **teal "9"** on the rail's Notifications entry;
  - on More, another teal "9" chip on the Notifications row.

  The Owner and Manager get a single red number on the bell instead (C11 covers its colour).
- **Principle:** Similarity (one fact, three encodings); Hick's law (two equivalent entry points side by side); consistency across roles.
- **Cause:** `src/components/app-shell.tsx:431` adds the rail count for Employees; `:484` renders the bell in the top bar for every role.
- **Fix:** On tablet and desktop, keep one Employee entry point. The DESIGN sidebar order already includes Notifications, so hide the top-bar bell for Employees from 768px (or keep the bell and drop the rail entry), and keep the teal count. Either way, one indicator.

### TB-005 · Medium · Back links name a page the rail doesn't highlight (and sometimes a page that isn't in the rail at all)
- **Images:** `T/owner-clocker-recovery-900.jpg`, `T/owner-updates-900.jpg`, `T/owner-notifications-900.jpg`, `T/owner-profile-900.jpg`, `T/employee-exchange-900.jpg`, `T/employee-updates-900.jpg`, `T/employee-help-900.jpg`.
- **What's wrong:**
  - Clocker recovery says "‹ Settings" while the rail lights **Team**. The ownership comes from `src/lib/navigation.ts:270`: Team owns `/app/clocker-recovery`.
  - Updates, Help and Profile say "‹ More", but More isn't in the tablet rail and nothing in the rail lights up for it. Updates is itself a rail item.
  - Owner Notifications says "‹ Home".
  - Employee "Pick up and swap" says "‹ Schedule" while the rail lights **Requests**.
- **Principle:** Continuity (the breadcrumb and the location indicator disagree); Jakob's law (the tablet has a rail, so the phone's More hub is a dead end here).
- **Fix:** From 768px, derive the back label from the rail entry that is lit (the same `sidebarActive` used in app-shell.tsx:417). Where the page is itself a rail destination (Updates, Notifications), hide the back link on tablet.

### TB-006 · Low · "Ctrl K" shows on a touch tablet at 900
- **Images:** `T/owner-home-900.jpg` shows it; `T/owner-home-768.jpg` hides it.
- **What's wrong:** A keyboard shortcut hint on a touch-first width wastes 44px of the search pill. It is also part of the failing 3.54:1 kbd pair; the audit flags `kbd` on 185 frames (C1 covers the band text).
- **Principle:** Jakob's law; aesthetic-usability (noise).
- **Fix:** Hide `.command-finder-trigger kbd` under `@media (pointer: coarse)`. It is styled at owner-b-desktop.css:47.

### TB-007 · Low · The bell's count arrives after first paint (not verified)
- **Images:** the count is missing on `T/owner-schedule-768.jpg`, `T/owner-schedule-coverage-900.jpg`, `T/owner-view-team-900.jpg`, `T/owner-notifications-900.jpg` and `T/owner-state-home-900-state-home-fold.jpg`, and shows "3" on the other Owner frames from the same run.
- **Principle:** Doherty threshold; layout stability.
- **Fix:** Reserve the badge slot, or server-render the count. Verify with a throttled load before acting.

---

## Owner and Manager Home (`/app`)

### TB-008 · Medium · At 768, This week wraps and leaves a dead area under Payday
- **Images:** `T/owner-home-768.jpg`, `T/manager-home-768.jpg`, `T/owner-home-900.jpg`, `T/owner-state-home-900-state-home-fold.jpg`.
- **What's wrong:**
  - At 768 the This week card's three figure tiles wrap:
    - "192 h of / 336 h"
    - "No / positions / required" (three lines)
    - "No lead / required"
  - The mock promised "348px each … so nothing wraps".
  - Payday (about 230px tall) sits beside This week (about 350px), leaving about 120px of empty canvas under Payday at both widths.
- **Principle:** Gestalt common region and closure (the row reads unfinished); aesthetic-usability.
- **Cause:** The tablet block (`src/app/app/owner-b-desktop.css:819–822`) sets two equal columns but no row alignment. The figure tiles keep the desktop three-across layout at 155px inner width.
- **Fix:**
  - Under 900px, put the three Covered-this-week tiles in a one-line compact form (value plus a one-word label, e.g. "57% staffing", with "No positions required" moved to its tooltip or a footnote), or stack them two plus one.
  - Give the row `align-items: stretch`, and pin Payday's button to the card foot so the two cards end together.

### TB-009 · Medium · An amber "Late" dot shows when nothing is late
- **Images:** `T/owner-home-900.jpg`, `T/manager-home-768.jpg`.
- **What's wrong:** The live tile "● Late 0" carries an amber status dot at zero. Amber means "wait/check", so the eye is drawn to a non-problem; "Open shifts 3" has no dot at all.
- **Principle:** The status-colour rule; pre-attentive signal fatigue.
- **Fix:** Show the amber dot only when late > 0, and the neutral white/.55 dot otherwise. The same applies to the phone hero.

### TB-010 · Low · "Find cover" is a 36px button in a 64px row
- **Images:** `T/owner-home-900.jpg` (audit `a.b-btn.b-btn--teal` 99×36, 12 frames).
- **What's wrong:** The row itself is 40px tall (`a.b-row__hit` 615×40). The audit measures the button's border box at 36; confirm that the `::after` hit-area extension from owner-b.css:82–84 survives the desktop layer.
- **Principle:** Fitts's law.
- **Fix:** At 768–1023, set `.b-btn` to `min-height: 44px` (B1 extends to row buttons).

---

## Schedule, Owner and Manager (`/app/schedule`, `/coverage`)

### TB-011 · High · At 768 the week grid truncates shift times ("7:3…", "11:…", "11:3…") instead of wrapping
- **Images:** `T/owner-schedule-768.jpg` (Mon open shifts "7:3… 9p", "11:… 12a"; Sofía Méndez "11:3… 7:30p"), `T/manager-schedule-768.jpg`. Compare `T/owner-schedule-900.jpg`, where they wrap correctly.
- **What's wrong:**
  - The approved rule is "long ones wrap to two lines" (DESIGN.MD:1525; mock frame). At 768, open-shift chips and the today column clip the start time with an ellipsis.
  - There is no way back to the full value without tapping into the shift.
  - The person column stays at 180px, which squeezes day columns to about 64px; the mock assumed 71–81px.
- **Principle:** Truncated content with no way to reach it (an escalation trigger); closure.
- **Cause:**
  - `src/app/app/clean-manager/schedule.css:324` (`.cm-block.open > span { … text-overflow: ellipsis; white-space: nowrap }`) and `:227` (`.cm-block > span[aria-hidden]`) still apply inside the block. owner-b-desktop.css:540 only resets the block itself.
  - `owner-b-desktop.css:539` fixes the corner/person column at 180px at every width.
- **Fix:**
  - Inside the `@container c-sched (min-width: 560px)` block (owner-b-desktop.css:536), add `.cm-block > span { white-space: normal; overflow: visible; text-overflow: clip }`.
  - Under 820px of container width, take the person column to 148px (avatar plus name on two lines) to return about 32px to the seven day columns.

### TB-012 · High · Grid shift blocks and open-shift chips are 28px tall on a touch screen
- **Images:** `T/owner-schedule-900.jpg`, `T/owner-schedule-768.jpg` (audit `a.cm-block.open` 75×28 at 900, `a.cm-block` 56×28 at 768).
- **What's wrong:** The grid is the Owner's main tablet task ("at the counter for the week grid"). Its blocks are the smallest targets in the app: 28px, packed at 4px vertical gaps. B1 lists steppers and tabs but not the blocks.
- **Principle:** Fitts's law; the 44–48px tablet target.
- **Cause:** owner-b-desktop.css:540 (`min-height: 28px`); schedule-corp.css:132.
- **Fix:** In the tablet block, set `min-height: 40px` with a 2px vertical extension through `::after` (the open-shift chips stack, so add 4px of row gap), or `min-height: 44px` where the column has a single block.

### TB-013 · Medium · The grid card opens with a near-empty "Published" row, and Published is grey, not green
- **Images:** `T/owner-schedule-900.jpg`, `T/owner-schedule-768.jpg`, `T/owner-schedule-publish-900.jpg` (grey "Published" chips, grey check icon).
- **What's wrong:**
  - The first 52px of the grid card holds only right-aligned grey "Published".
  - On Build and publish, both locations' "Published" chips and the "Everything planned this week is published" check are grey.
  - Published is the "done" state, which DESIGN marks green.
- **Principle:** The status-colour rule (green = done); visual hierarchy (wasted header row).
- **Fix:**
  - Move "Published" into the band's subtitle line ("Monday, November 9 · Published"), or put it as a green `b-chip--green` on the Covered-this-week row.
  - Use the green chip on the publish page and a green check.

### TB-014 · Medium · /schedule/coverage lands on the grid with an unrelated error in the band
- **Images:** `T/owner-schedule-coverage-900.jpg`, `T/manager-schedule-coverage-900.jpg`.
- **What's wrong:**
  - A pink banner, "Couldn't open that shift. Pick it again from this week.", is wedged between the title and the week stepper inside the band.
  - The route isn't a shift. The banner has no icon and no dismiss, and it pushes the stepper down 64px.
- **Principle:** Error recovery (the message names the wrong object); figure-ground (a pink block on the teal band).
- **Fix:** Route coverage to its own view, or redirect quietly to `/app/schedule`. Render route errors under the band as a white note with the red warning icon in a tinted circle and a dismiss control, not inside it.

---

## Things to do and decisions (`/app/inbox`, `/requests`, `/exchange`, `/timecards/corrections`)

### TB-015 · Medium · The same Decline and Approve decision has two layouts on one device
- **Images:** `T/owner-inbox-900.jpg` (compact right-aligned pills, 87×40 and 93×40, plus a chevron before them), `T/owner-exchange-900.jpg` (full-width halves, 335×40 and 339×40, under a policy line), `T/owner-timecards-corrections-900.jpg` (right-aligned 48px pills), `T/owner-requests-tab-pending-requestid-scan-leave-maria-900.jpg` (pills floating outside the card).
- **What's wrong:**
  - Four placements of one decision.
  - On Things to do, the chevron sits *between* the text and the buttons, so three tap targets crowd one row with an 8px gap between Decline and Approve.
- **Principle:** Similarity; Jakob's law (internal consistency); Fitts's law (40px adjacent opposing actions).
- **Fix:**
  - One decision row: buttons right-aligned at 44px with a 12px gap, and the chevron moved to the far trailing edge (or dropped, since the row text is already the link).
  - Use the full-width halves only below 768.
  - Put the request detail's actions inside the last card's footer.

### TB-016 · Low · Identical "Find cover" rows get different emphasis
- **Images:** `T/owner-inbox-900.jpg`.
- **What's wrong:** The first open-shift row has a filled teal "Find cover"; the next two have pale-teal secondary "Find cover". Nothing on screen explains the ranking.
- **Principle:** Similarity; one primary per view (better-colors).
- **Fix:** Make all three secondary and keep the filled primary for the card-level action, or label the urgent one ("Starts in 1 h").

### TB-017 · Medium · "Needs an Owner" is a red chip
- **Images:** `T/owner-inbox-900.jpg` (Shifts to fill row).
- **What's wrong:** Red means stop. This is an action the viewer (the Owner) should take, which is amber ("check") or teal (info).
- **Principle:** The status-colour rule (semantic colour used against its meaning, an escalation trigger, but it is a single chip).
- **Fix:** Use `b-chip--amber`.

### TB-018 · Medium · Time corrections don't highlight what changed
- **Images:** `T/owner-timecards-corrections-900.jpg`.
- **What's wrong:**
  - The three equal grey tiles (Recorded / Current effective / Proposed) give the changed end time ("2:06 PM" to "2:41 PM") the same weight as the unchanged start.
  - Five lines of grey meta follow ("Times in Puerto Rico time", "No prior decisions…", the policy line).
  - At 900 the "Current effective" tile wraps to four lines.
- **Principle:** Visual hierarchy; Miller's law (too many parallel facts to compare); pre-attentive contrast.
- **Fix:**
  - Show two tiles (Recorded and Proposed) and bold or amber-mark the differing time with a "+35 min" chip.
  - Fold "Current effective" and the meta lines into one secondary line.

### TB-019 · Low · The request detail is split across four cards
- **Images:** `T/owner-requests-tab-pending-requestid-scan-leave-maria-900.jpg`.
- **What's wrong:**
  - "See that week's schedule" and "Also off that day" are each a full card with one row.
  - Decline and Approve float on the canvas, right-aligned, while the footnote under them is centred.
- **Principle:** Common region; alignment.
- **Fix:** Merge the two single-row cards into the request card as rows. Put the actions and the footnote in one right-aligned footer.

---

## Timecards (`/app/timecards`)

### TB-020 · Medium · Rows open a panel but look static, and Status is plain grey text
- **Images:** `T/owner-timecards-900.jpg`, `T/manager-timecards-900.jpg`.
- **What's wrong:**
  - The table rows have no chevron, hover or pressed cue on touch, yet tapping one opens the timecard panel (DESIGN.MD:1535). The panel itself was not captured.
  - The Status column is grey text, except "Missing clock‑out", which is amber text with no icon and no pill.
  - The rest of B uses pills for status (Requests' "Waiting" and "Approved", Time's "On the clock").
  - "Missing clock - out" also renders the hyphen with spaces, a visible instance of T4.
- **Principle:** Controls must be distinct from content (better-layout); similarity; colour not alone (the text carries the meaning, but the emphasis is colour-only).
- **Fix:**
  - Add a trailing `b-chev` to each row.
  - Render Status with `BChip`: teal "Clocked in", grey "In progress", amber "Missing clock-out" with the warning icon.
  - Apply T4's numeric opt-in so hyphens don't widen.

### TB-021 · Low · Units differ between rows and the total
- **Images:** `T/owner-timecards-900.jpg`.
- **What's wrong:** Rows read "20 h 32"; the Total reads "86 h 35 min".
- **Fix:** Use one format in both.

---

## Payroll (Owner: `/app/payroll/*`, `/app/payroll-export`)

### TB-022 · Medium · Prepare payroll mixes four action styles for one verb
- **Images:** `T/owner-payroll-prepare-900.jpg`.
- **What's wrong:**
  - Up next's "Prepare payroll" is a teal text link.
  - The *older* period gets the filled primary "Prepare payroll".
  - The next period is a text link, "Prepare".
  - The row toggle is a text link labelled "Close".
  - Text-link targets are about 19–24px tall on touch.
  - The current week (the usual task) is visually weaker than an overdue period's expanded state.
- **Principle:** One primary per view; similarity; Fitts's law.
- **Fix:**
  - Make every period row a row with a trailing 44px secondary pill "Prepare".
  - Keep one filled primary, on whichever period is selected.
  - Replace "Close" with a chevron disclosure.

### TB-023 · Low · Payroll sub-pages show both a back link and the tab that leads to the same place
- **Images:** `T/owner-payroll-export-900.jpg`, `T/owner-settings-payroll-900.jpg`.
- **What's wrong:** "‹ Payroll" sits above the Payroll / Time exports / Payroll settings tabs. Two controls go to Payroll, and the tabs are 36px (`a.c-pay-tabs__tab` 78–136×36).
- **Principle:** Hick's law; Fitts's law.
- **Fix:** Drop the back link when the band tabs are present, and raise the tabs to 44px in the tablet block.

---

## Team (`/app/employees*`, `?view=team`, `?view=attendance`)

### TB-024 · Medium · Over and under target is plain grey text
- **Images:** `T/owner-view-team-900.jpg`.
- **What's wrong:**
  - "16 h over", "8 h under" and "On target" are all 13px grey meta.
  - "Off target 8" in the summary is unstyled.
  - The Owner has to read 12 rows to find the problems.
  - Home's live tiles use status dots, and Insights uses amber for the 57% staffing figure.
- **Principle:** Pre-attentive processing; the status-colour rule (amber = check).
- **Fix:** Show an amber chip "16 h over" or "8 h under" at the row's trailing edge, and nothing for "On target". Count the amber chips in the Off target tile.

### TB-025 · Low · "Working" is grey text on Team; Who's working uses a green dot
- **Images:** `T/owner-employees-900.jpg`, `T/owner-home-900.jpg`.
- **What's wrong:** People rows also have no chevron although they open the profile.
- **Fix:** Use a green dot plus "Working" chip, and a trailing chevron, as in Who's working (`T/owner-view-attendance-900.jpg`).

### TB-026 · Low · Small person actions and a raw ID
- **Images:** `T/owner-employees-qa-scan-a-900.jpg`.
- **What's wrong:**
  - Call and message circles are 40×40 (`a.c-person__act`).
  - The identity line shows "ID QA-SCAN-A".
  - The phone number renders as "555 - 0199" (T4).
- **Fix:**
  - Make the circles 44px.
  - Hide employee IDs behind Edit, or put them in Access and sign-in.

---

## Insights (`/app/reports`) and Activity (`?view=activity`)

### TB-027 · Medium · "86 h 51 min of 48 h 30 min planned" draws a full teal bar
- **Images:** `T/owner-reports-900.jpg`.
- **What's wrong:**
  - The bar caps at 100% in teal (info). The 38 h overage appears only as small grey text at the top right.
  - The empty-state dashes ("—") in Attendance measure 2.29:1 (`dd.c-stat__value--none`).
- **Principle:** The status-colour rule; visual hierarchy.
- **Fix:**
  - Past 100%, draw the overage segment amber and promote "38 h 21 min over plan" to an amber chip beside the figure.
  - Make the dash `#6A7176`.

### TB-028 · Medium · Coverage gaps use neutral grey circles; Home uses amber for the same thing
- **Images:** `T/owner-view-activity-900.jpg` vs `T/owner-home-900.jpg`.
- **What's wrong:**
  - Home and Things to do show open shifts with the calendar icon in an **amber** circle; Activity shows the same "Coverage gap" events in grey.
  - The future day (Tue, Nov 10) is listed *above* "Today · Mon, Nov 9".
- **Principle:** Similarity (one object, two encodings); continuity of chronology.
- **Fix:** Use the amber tinted circle for gap events. Order the groups Today, then upcoming (or split into "Coming up" and "Earlier").

---

## Updates, Notifications and More (Owner and Manager)

### TB-029 · Medium · Notifications puts its tabs on the canvas for the Owner and in the band for the Employee
- **Images:** `T/owner-notifications-900.jpg` (grey track below the band, "Unread" low contrast), `T/employee-notifications-900.jpg` (white-thumb glass tabs in the band), `T/owner-availability-900.jpg` (canvas).
- **What's wrong:**
  - The same page uses two segmented-control styles and positions by role.
  - The Owner's variant also shortens the band, so the error card sits higher than on every sibling page.
- **Principle:** Similarity; consistency across roles (S5 covers geometry, not placement).
- **Fix:** Put page-level filters in the band everywhere (`.b-seg` on glass), and keep the canvas segmented style only for in-card choices.

### TB-030 · Low · Owner More duplicates the rail on a tablet
- **Images:** `T/owner-more-900.jpg`, `T/manager-more-900.jpg`.
- **What's wrong:**
  - Insights, Updates and Settings are rail items; More repeats them, and no rail item lights while it is open.
  - Sign out is left-aligned red text here but centred on the Employee More (`T/employee-more-900.jpg`).
- **Fix:**
  - From 768, keep More reachable only from the account menu, with the rail state on Home.
  - Centre Sign out in both, or left-align it in both (C13 covers the red).

---

## Settings and forms (Owner)

### TB-031 · Medium · Form actions sit in four different places
- **Images:**
  - In the band, top right: `T/owner-settings-locations-new-900.jpg`, `T/owner-updates-compose-900.jpg`, `T/owner-schedule-publish-900.jpg`.
  - In the card footer: `T/owner-schedule-new-900.jpg`, `T/owner-schedule-edit-shiftid-qa-scan-target-900.jpg`, `T/owner-employees-new-900.jpg`.
  - On the canvas under the card: `T/owner-clocker-recovery-900.jpg` ("Check code").
  - As a full-width 56px bar inside the card: `T/employee-requests-tab-new-900.jpg`, `T/employee-profile-calendar-900.jpg`.
  - Save in the band: `T/owner-settings-branding-900.jpg`, `T/owner-settings-company-policies-900.jpg`.
- **What's wrong:**
  - On a tablet, the band's top-right "Add" or "Next" is the farthest point from the last field.
  - The full-width bars stretch to 726px, as rectangles with radius 16 rather than pills (S1).
  - The not_captured list records validation timing out on `/settings/locations/new`, consistent with the submit living outside the form region.
- **Principle:** Jakob's law (internal); Fitts's law; similarity.
- **Fix:**
  - One tablet rule: primary and secondary actions sit right-aligned in the card footer (the Add shift pattern), 48px pills.
  - Keep the band only for page-level actions (New update, Add employee, Edit).
  - Cap full-width primaries at `max-width: 360px` from 768.

### TB-032 · Medium · The read-only Clocker key looks like an editable field
- **Images:** `T/owner-settings-locations-new-900.jpg`.
- **What's wrong:**
  - "Created for you" sits in a white, bordered, 46px input identical to Name and Short name. Only the helper text below says it can't be changed.
  - Edit shift (`T/owner-schedule-edit-shiftid-qa-scan-target-900.jpg`) shows its locked Location as a grey fill with no lock icon.
  - Company profile (`T/owner-settings-workspace-900.jpg`) shows locked values as rows with a lock icon.
- **Principle:** Controls distinct from content; similarity (three locked-field treatments).
- **Fix:** Show every read-only value as a row (label plus value plus lock icon) as on Company profile; don't render an input.

### TB-033 · Medium · The Edit shift title is 25px off its own subtitle
- **Images:** `T/owner-schedule-edit-shiftid-qa-scan-target-900.jpg`, `T/manager-schedule-edit-shiftid-qa-scan-target-900.jpg`.
- **What's wrong:** The H1 "Edit shift" starts at x≈125 while "Published · Wed, Nov 25" starts at x≈100, so the title is centred inside the subtitle's width.
- **Principle:** Alignment to shared edges.
- **Cause:** `src/components/schedule-shift-form.css:57` sets `.c-shift__titles { align-items: center }` for the phone sheet. The desktop override at `src/app/app/owner-b-desktop.css:488` changes it to a column flex but doesn't reset the alignment.
- **Fix:** Add `align-items: flex-start !important` to owner-b-desktop.css:488. Also align "Delete shift" to the Cancel and Save centre line; it sits about 8px high.

### TB-034 · Low · Group labels sit outside cards on some pages and inside on others
- **Images:**
  - Inside: `T/owner-settings-900.jpg` ("Company", "Clocker" as 17px card titles).
  - Outside, 13px grey: `T/owner-settings-company-policies-900.jpg` ("Tell me about", "Records") and `T/owner-settings-branding-900.jpg` ("What your team sees").
  - An H2 on the canvas: `T/owner-timecards-corrections-900.jpg` ("Correction requests 2").
- **What's wrong:**
  - Inner text starts at x=117/119 on some cards (Photo review, Clocker recovery, Availability "Your usual week", Account deletion's "What … keeps") and at x=123 on the rest. The audit `align` list confirms this for `ul.q-list` and `div.c-card`.
  - Footnotes under cards start at x=116, while section labels start at x=100.
- **Principle:** Alignment to shared edges; proximity; similarity.
- **Fix:** One group pattern per page type: card titles inside cards for index pages, and section labels outside for long forms. Use one 22–23px inner inset, with footnotes aligned to the card's text edge.

### TB-035 · Low · Small switches and segmented controls on touch
- **Images:** `T/owner-settings-features-900.jpg`, `T/owner-settings-company-policies-900.jpg`, `T/owner-schedule-new-900.jpg`, `T/employee-profile-900.jpg`.
- **What's wrong:**
  - `input.q-tog` and `input.c-switch` are 51×31 (15 frames). Not verified: whether the whole row is a `<label>`.
  - The Employee language segment buttons are 77×34 and 82×34.
  - "All day / Part of day" is 359×36.
- **Fix:** Make the whole row the label (a 60px hit), and bring segments to 44px under `pointer: coarse`.

### TB-036 · Low · The Week templates page's only action is styled secondary
- **Images:** `T/owner-schedule-templates-900.jpg`.
- **What's wrong:** "Save this week" is a grey quiet pill.
- **Fix:** Use the teal primary (one filled action per view).

### TB-037 · Low · The Branding preview shows a non-pill primary
- **Images:** `T/owner-settings-branding-900.jpg`.
- **What's wrong:** The "Clock in on the Calle Loíza tablet" preview is a rounded rectangle (about 10px radius). The real Employee buttons are pills.
- **Fix:** Use the real pill, so the preview matches what the team sees.

---

## Employee and Lead Home (`/app`)

### TB-038 · Medium · At 768 the two columns break key values mid-unit
- **Images:** `T/employee-home-768.jpg`, `T/lead-home-768.jpg`; compare `T/employee-home-900.jpg`.
- **What's wrong:**
  - The 32px shift time wraps as "12:00 PM – 11:30 / PM", orphaning "PM".
  - "Monday, Nov 9 · 11.5 / h" orphans the unit.
  - Things to do titles wrap to three lines ("Confirm / this week's / schedule").
  - "Respond by / Nov 18, 9:00 AM" breaks inside the date.
  - Lead "Message today's team" wraps to two lines next to a "Write" button.
- **Principle:** Typography (`nowrap` on values that must stay whole); hold structure until it breaks (better-layout).
- **Cause:** `src/components/employee-b/home-b.tsx:119` (`.eb-shift__time` has no nowrap per `<time>`); `:125` uses `keepWhole` on the day line, but the "11.5 h" unit still breaks.
- **Fix:**
  - Wrap each `<time>` and each "N h" in `white-space: nowrap` (or join with U+00A0), and allow the break only at the en dash.
  - Below 820px, drop the shift time to 26px.
  - Below 860px, consider stacking Things to do under On shift now. DESIGN keeps two columns, so this needs Jose's call.

### TB-039 · Low · "Clock in on the Main Office tablet" looks like a button
- **Images:** `T/employee-home-900.jpg`, `T/lead-home-768.jpg`.
- **What's wrong:** It is a filled grey block with an icon in a tinted circle, the shape of a tappable row, but it is informational.
- **Principle:** False affordance.
- **Fix:** Use a plain inline note (icon plus text with no fill), or make it link to "Where's my tablet?".

### TB-040 · Low · Lead Home offers "Message today's team" twice
- **Images:** `T/lead-home-768.jpg`, `T/lead-home-900.jpg`.
- **What's wrong:** It appears as the white band button and again as the Today's team card's "Write" button.
- **Principle:** Hick's law; one primary per view.
- **Fix:** Keep the card action on tablet and remove the band button (or the reverse).

---

## Employee and Lead Schedule (`/app/schedule`)

### TB-041 · High · Week-card chips fail text contrast, and "Tomorrow" spills out of its day at 768
- **Images:** `T/employee-schedule-768.jpg` (Tue block: the "Tomorrow" pill extends past the block's right edge into Wed), `T/lead-schedule-900.jpg`, `T/employee-schedule-900.jpg`.
- **What's wrong:**
  - The probe measured `span.b-chip.b-chip--teal` ("Tomorrow") and `span.eb-wsh__lead-s` ("Lead") at **4.18:1** against a 4.5 threshold (12px/600). These are not the hero glass chips covered by C2.
  - At 768 the Tue chip is wider than its 76px block and overlaps the next day.
  - At 900, Lead blocks grow ragged (the Tue block is 28px taller than the rest).
- **Principle:** Text contrast (WCAG 1.4.3, an escalation trigger); no overlap at supported widths (better-layout).
- **Cause:**
  - `src/app/app/employee-b-desktop.css:128` (`.eb-wsh .b-chip { align-self: flex-start }` with no `max-width`).
  - `:432` (the ellipsis on the text spans, but not the chip).
- **Fix:**
  - Darken the teal chip ink to `#08524E` (or the chip fill lighter), then re-measure.
  - Give `.eb-wsh .b-chip` `max-width: 100%; overflow: hidden; text-overflow: ellipsis`, and under 860px shorten "Tomorrow" to "Tmrw" with the full word in the accessible name.
  - Align the block heights with `align-items: stretch` on the day row.

### TB-042 · Medium · The week card truncates every role and location, then repeats the full text below
- **Images:** `T/employee-schedule-900.jpg`, `T/employee-schedule-768.jpg`.
- **What's wrong:**
  - "Customer S…" and "Main Office…" at 900 become "Custom…" and "Main Of…" at 768. The audit's `clipped` list confirms ellipsis on 4 frames.
  - The Coming up list right below shows the same seven shifts in full.
  - The card's 14 truncated lines add noise without information.
  - Times use a third format: grid "7a–3p", week card "7 AM – 3 PM", list "7:00 AM – 3:00 PM".
- **Principle:** Miller's law; aesthetic-usability; similarity.
- **Fix:** From 768 to 1023, show only time plus a status chip in the week blocks and drop the role and location lines (Coming up carries them). Use one time format for the card and the list.

### TB-043 · Low · "Get alerts on this phone" on a tablet
- **Images:** `T/employee-exchange-900.jpg`.
- **What's wrong:** The device word is wrong on a tablet. This is not in the copy audit.
- **Cause:** `src/components/employee-b/requests-b.tsx:62`, `src/components/employee-schedule-corp.tsx:59`.
- **Fix:** "Get alerts on this device".

### TB-044 · Low · Availability belongs to Requests on phones but to Schedule on tablets
- **Images:** `T/employee-availability-900.jpg` (rail lights Schedule, back "‹ Schedule").
- **What's wrong:** The phone tab map puts `/app/availability` under Requests (`src/lib/navigation.ts:246`).
- **Principle:** Consistency across devices (Jakob's law).
- **Fix:** Pick one home for Availability and apply it to both maps.

---

## Employee requests, updates, profile and account

### TB-045 · Medium · The two Delete account flows differ by role on the same device
- **Images:** `T/owner-account-delete-900.jpg` vs `T/employee-account-delete-900.jpg` (Manager and Lead match their counterparts).
- **What's wrong:**
  - The Owner's consent is a **toggle switch** ("I understand…"); the Employee's is a **checkbox**. A switch implies an instant setting, not an acknowledgement.
  - The Owner's "Your access ends now" icon is teal; the Employee's is red.
  - The Owner's disabled button is grey; the Employee's is pale red.
  - The Employee version nests a card inside a card ("Confirm it's you"), with a 52px gap above it. Its 24px checkbox is small for touch.
- **Principle:** Similarity; native semantics (checkbox for consent); concentric radius (a 16px inner card in a 22px card with 20px padding).
- **Fix:**
  - One flow: checkbox consent with a 44px label row, a red-tinted icon for "access ends", and a red pill for the enabled destructive action.
  - Remove the nested card (put the fields in the outer card).

### TB-046 · Low · Help has icons in tinted circles for Employees but none for Owners
- **Images:** `T/employee-help-900.jpg` vs `T/owner-help-900.jpg`.
- **What's wrong:**
  - Employee rows use Phosphor icons in tinted circles and accordions; Owner rows are bare text links. DESIGN B calls for icons in tinted circles.
  - The Owner's support paragraph runs about 110 characters per line at 900.
- **Fix:** Give the Owner Help the same row component, and cap paragraphs at `max-width: 68ch`.

### TB-047 · Low · Small policy links and a table of contents that doesn't look clickable
- **Images:** `T/employee-profile-privacy-900.jpg`, `T/employee-profile-support-900.jpg`.
- **What's wrong:**
  - The "In this policy" entries are plain 15px ink text (they don't look like links), and the same list repeats as accordions in the next card.
  - The footer links are 19px tall (`a.` 101–215×19).
  - The overlap entries in the audit come from collapsed accordions and are not visual overlaps.
- **Fix:**
  - Style the table-of-contents entries as teal links, or drop the table of contents (the accordions are the index).
  - Pad the footer links to 44px tall.

### TB-048 · Low · The Employee Updates search sits 20px in from the title edge
- **Images:** `T/employee-updates-900.jpg`.
- **What's wrong:** The search field and the "All" dropdown start at x=120; the title and back link start at x=100. The Owner's Updates uses segments in the band instead (TB-029).
- **Fix:** Align `.eb-tools` to the band's text edge.

### TB-049 · Low · "Action needed" appears with different emphasis in one list
- **Images:** `T/employee-notifications-900.jpg`.
- **What's wrong:** Only the first "Team update · Action needed" has an amber icon circle; six other "Action needed" rows are grey.
- **Fix:** Amber circle for every Action-needed row, grey for informational ones.

---

## Role-gated and fallback routes

### TB-050 · Medium · Gated routes either explain or silently redirect to Home
- **Images:**
  - Explains: `T/manager-settings-branding-900.jpg` ("Only Owners can open Settings"), `T/manager-payroll-prepare-900.jpg`.
  - Silently shows Home (page title "16 things need you"): `T/manager-clocker-recovery-900.jpg`, `T/manager-employees-qa-scan-a-clocker-pin-900.jpg`, `T/owner-my-time-900.jpg`, `T/owner-requests-hub-900.jpg`, `T/manager-my-time-900.jpg`.
  - A 404 for a route the navigation map still lists (`/app/ai-manager`, navigation.ts:147): `T/owner-ai-manager-900.jpg`.
- **Principle:** Error visibility; Jakob's law (internal consistency).
- **Fix:** Use the explanatory card for every gated route (with a lock icon in a tinted circle, and without the duplicate "Back to Home" when the band already has "‹ Home"). Remove `/app/ai-manager` from the navigation map.

---

## Cross-screen patterns

1. **Touch sizing never got its tablet pass** (TB-001, TB-003, TB-010, TB-012, TB-015, TB-022, TB-023, TB-035; confirms B1 on screen). Under-44px controls confirmed by the audit at tablet width:
   - **Navigation:**
     - Rail links: 40×48.
     - Bell: 40.
     - Search and account: 40.
     - Back links (`a.c-nav__back`, `a.q-nav__l`, `a.b-back`): 32 tall, on 80+ frames.
     - Week arrows (`a.c-sched-week__arrow`, `a.c-week__arrow`, `a.c-act__arrow`): 32; Employee `a.b-week__arrow`: 36.
     - Band tabs: 36; Payroll tabs: 36.
     - `summary` ("What changed in your schedule"): 32.
   - **Buttons:**
     - Band buttons (`b-btn--white`, `b-btn--glass`, `q-nav__r`): 42.
     - Row buttons (Decline/Approve, Fill, See): 36–40.
   - **Controls:** grid blocks 28; switches 31; checkboxes 13–24.

   The tablet block (owner-b-desktop.css:813–829) changes only the rail height. **Fix:** in that block, under `(pointer: coarse)`, set a 44px floor on `.b-btn`, `.c-btn`, `.q-btn`, the `*__back` and `*__arrow` controls, the band tabs and the top-bar controls, and 48×48 on the rail. Use `::after` extensions where the visual size must stay.
2. **Status colour isn't applied to tablet-only list views** (TB-009, TB-013, TB-017, TB-020, TB-024, TB-027, TB-028, TB-049). Several meanings show as grey text or the wrong hue:
   - Done states: grey "Published".
   - Check states: over or under target, over plan, missing clock-out without a pill.
   - Requests hub: "Declined" grey, identical to "Withdrawn" (`T/employee-requests-hub-900.jpg`).

   Use `BChip` tones: green for done, amber for check, red only for stop.
3. **Wayfinding is phone-shaped** (TB-005, TB-030, TB-044):
   - "‹ More" back links on a device with no More in the rail.
   - Rail ownership that disagrees with the back label.
   - Availability owned differently per device.

   Derive both from one map, keyed by the lit rail item.
4. **One component, two looks by role** (TB-004, TB-029, TB-045, TB-046, plus Profile `T/owner-profile-900.jpg` vs `T/employee-profile-900.jpg`, and New update vs Write an update). Tablet makes the drift visible because Owner and Employee share the same shell. Unify the page components and vary only the content.
5. **Card insets drift between 117, 119 and 123px** (TB-034). The `c-card` and `q-list` wrappers carry their own padding inside a B card (the audit `radius` list shows `div.c-card` and `ul.q-list` at 0px radius on 19 frames: older components wrapped, not restyled). Re-point their padding to the B card's 22–23px inset.
6. **Visible new instances of T4** (tabular figures on hyphens): "clock‑out", "555‑0100" and "555‑0199", "back‑office", "sign‑in", "clock‑in" all render with spaced hyphens at tablet width (`T/owner-timecards-900.jpg`, `T/owner-profile-900.jpg`, `T/owner-settings-clocker-900.jpg`, `T/owner-employees-qa-scan-a-900.jpg`, `T/owner-reports-900.jpg`). The fix is T4's, from 768px.
7. **Phone patterns stretched to tablet width:**
   - Full-width 56px primaries at 726px.
   - Full-width Decline/Approve halves at 339px each.
   - Long paragraphs at about 110 characters.

   Cap action widths (about 360px) and text measure (68ch) in the tablet block.
8. **Axe on tablet, beyond the band contrast:**
   - `definition-list` and `dlitem` (serious) on Employee and Lead Home 768 and 900 (14 frames): the live tiles put `<dt>`/`<dd>` inside `<a>` within a `<dl>`. **Fix:** wrap each tile's `<a>` in a `<div>` inside the `<dl>`, or render the tiles as a `<ul>`.
   - `landmark-unique` on the Things to do decision forms.
   - `aria-prohibited-attr` on `div[aria-label="Update review feedback"]` (Updates compose; I6 pattern).

## Verification and gaps

- **Ran:**
  - Visual inspection of every distinct tablet route at 900 for Owner, and of role-specific routes for Manager, Employee and Lead.
  - All 768 frames compared with 900.
  - The 2× state-runner frames.
  - Aggregation over all 203 audit JSONs: targets, text under 12px, contrast, axe, overlap and clip.
  - Code tracing for TB-001, 002, 003, 004, 005, 011, 012, 033, 038, 041 and 043.
- **Not verified:**
  - Many grey meta pairs are reported at 4.26–4.30:1, but the probe resolved their background as `#ECEEEF` behind cards that render white. They are likely artifacts; re-measure them in a browser before acting.
  - Bell-count timing (TB-007).
  - Whether `::after` hit extensions survive at tablet width.
  - Whether whole rows act as labels for switches.
- **Not captured** (the manifest has no tablet menu, sheet or keyboard entries):
  - The account menu, the location dropdown and the ⋯ menu opened at 768 and 900.
  - The shift side panel and the timecard right-hand panel (380–400px over a scrim).
  - The command finder dialog.
  - The rail expanded via the toggle.
  - Keyboard focus order on tablet.
  - Reduced motion.
  - Loading, error, offline and long-names states at tablet width.
  - Validation states.
  - The landscape phone at 844×390 (`not_captured`: dropped by the collector).
  - Real touch: hover latching (B4) can't be judged from stills.

---

## Top 10 for tablets

1. **TB-011 (High):** Stop truncating week-grid times at 768. Remove the inner-span ellipsis (clean-manager/schedule.css:227 and :324) inside the 560px container block, and narrow the 180px person column.
2. **TB-001 (High):** Rail targets to the approved 48×48 (corp-shell.css:593 width, owner-b-desktop.css:828), with the badge moved off the glyph.
3. **TB-002 (High):** Show rail labels on touch-and-hold (sidebar-rail-tooltip.tsx:64), and use one icon per destination across phone and tablet (Pay).
4. **TB-012 and pattern 1 (High):** A `pointer: coarse` 44px floor in the tablet block for grid blocks, steppers, back links, band tabs, row buttons and the top bar.
5. **TB-041 (High):** Fix the 4.18:1 teal and Lead chips, and the "Tomorrow" chip spilling across days on the Employee and Lead week card.
6. **TB-038 (Medium):** Keep times and units whole on Employee and Lead Home at 768 (home-b.tsx:119, 125).
7. **TB-005 (Medium):** One wayfinding map: back labels and rail highlight agree, and no "‹ More" on tablet.
8. **TB-015 and TB-031 (Medium):** One decision-row layout and one form-action placement on tablet (card footer, right-aligned 44–48px pills).
9. **Pattern 2 (TB-013, 020, 024, 027, 028) (Medium):** Apply the status colours to tablet lists: Published green; over target, over plan and missing clock-out amber chips; gaps amber.
10. **TB-008 (Medium):** Owner Home at 768: no wrapping in This week's figures, and the Payday and This week cards end together.

**Counts (50 findings):**
- **High 5:** TB-001, 002, 011, 012, 041.
- **Medium 23:** TB-003, 004, 005, 008, 009, 013, 014, 015, 017, 018, 020, 022, 024, 027, 028, 029, 031, 032, 033, 038, 042, 045, 050.
- **Low 22:** TB-006, 007, 010, 016, 019, 021, 023, 025, 026, 030, 034, 035, 036, 037, 039, 040, 043, 044, 046, 047, 048, 049.

**Verdict:** Block. Five High findings remain.
