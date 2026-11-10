# Owner on desktop: UI/UX review (Direction B)

Date: 2026-11-10. Read-only review; no repository files were changed.

## Scope, method and coverage

- **Surface:** `/tmp/review/owner-desktop/` (143 images; 1440 and 1280, plus a few 1024 state frames). Image paths below are relative to `/tmp/review/`.
- **Baseline:** DESIGN.MD "Current direction" and "Owner and Manager desktop: Direction B" (lines 356–380, 1412–1453), and the approved mock `docs/product/direction-b/mocks/2-owner-desktop/owner-desktop-direction-b.html` (read as source for Home, Schedule and Timecards).
- **Skills applied:** better-ui, better-typography, better-colors, better-layout, better-interface, better-accessibility, design-critique. UX laws are named per finding.
- **Already covered elsewhere (not repeated):** `code-design-system.md` (C1–C14, T1–T8, S1–S7, B1–B8, I1–I6, M1–M4, L1–L7, D1–D4) and `copy-audit.md`. A finding below cites those IDs only where a screen shows a **new instance**. Wording problems are left to the copy audit unless they cause a visual or layout defect.
- **Every route seen at 1440:** Home and its three views, Things to do (plus Done and older, loading, error, offline), Schedule (plus coverage, new, edit, publish, rules, templates), Timecards (plus corrections, loading, error, offline, long names, and the panel states: open, approve-step, approving, approved, issue, issue-details), Payroll (prepare, review, history, people, fix, Time exports, settings), Team (person, PIN, new, empty and filled validation), Time off requests (three tabs, detail), Shift requests (callout and swap open), Insights, Updates (detail, compose, filled), Notifications (default and error), More, Profile (and five sub-routes), Help (and expanded), Settings hub plus 14 sub-pages, account delete, account recovery, Clocker recovery, My pay, Availability, 404, `/app/ai-manager`, `/app/my-time` and `/app/requests/hub` (both redirect to Home).
- **Checked at 1280 as well:** Home, Schedule and Timecards. **Checked at 1024:** Home (state runner).
- **Numbers** come from the `.audit.json` files: targets, text size, contrast and axe.
- **Not verified:**
  - Hover states. Those crops live under `components/` and are another reviewer's area.
  - Escape and focus return on the timecard panel.
  - Whether the finder (Ctrl K) reaches Help.
  - Whether the rail-collapsed sidebar in the state-runner shots is a persisted preference or a harness side effect.
  - Real reduced-motion behaviour (no motion frames for this surface).
- **Screenshot artefact (not a finding):** the sidebar's white panel stops at the viewport height in full-page captures. It is fixed or sticky.

Severity: **High** blocks or confuses a task, or fails accessibility. **Medium** is a visible inconsistency or friction. **Low** is polish.

---

## 1. Home `/app`

**OD-001 · High · Offline Home throws away what was loaded and contradicts itself**
- **Images:** `owner-desktop/owner-home-1440-offline.jpg`, `owner-state-offline-home-1440-state-offline-home.png`
- **What's wrong:** The shell banner says "You're offline. Showing what was loaded.", but the page is replaced by "View paused" and an empty card. The 16 items, the payday card and the live figures that were already on screen are gone. "Refresh current view" cannot work offline.
- **Principle:** Truthful feedback; Doherty threshold (a perceived blank costs more than a stale screen); WCAG 3.3/"error names a way to recover" (the only recovery offered is impossible).
- **Fix:** Keep `body.content` rendered while `phase==='paused'` and show the paused note as an inline amber notice above it. Hide or disable Refresh while `navigator.onLine===false`.
  - Code: `src/components/company-access/scoped-read-frame.tsx:178–193` (the paused branch returns a replacement page) and `src/components/app-shell.tsx:494` (banner copy).

**OD-002 · High · The Payday card hides overdue payroll**
- **Images:** `owner-home-1440.jpg`, `owner-home-1280.jpg`, compared with `owner-payroll-1440.jpg`
- **What's wrong:** Home shows Friday, Nov 20 with an amber "In 11 days" chip and "11 timecards to review · Ready now". Payroll shows "2 pay periods have no payroll", with the oldest payday Fri, Nov 6 already passed.
  - The owner's main screen says payroll is fine and future-dated while two paydays are missed.
  - The three progress segments are all off, yet the line says "Ready now".
- **Principle:** Red = stop (an overdue payday is a stop and must outrank a future one); visual hierarchy; aesthetic-usability effect hiding a real problem.
- **Fix:** When overdue periods exist, the ink card shows the oldest one with a red "Payday passed Nov 6" chip and the button "Prepare Oct 26 – Nov 1". Otherwise show the next payday.
  - Light the segment for the step reached (`step.done`), and replace "Ready now" with the state, for example "0 of 11 approved".
  - Code: `src/components/owner-b/home-b.tsx:141–151`.

**OD-003 · High · The live-figure tiles are invalid list markup (axe "serious")**
- **Images:** `owner-home-1440.jpg` (audit: `definition-list` ×1, `dlitem` ×6; the same on 1280, long-names and requests-hub)
- **What's wrong:** `<dl>` contains `<div><a><dt/><dd/></a></div>`. Screen readers drop the term and value pairing, and the tiles are announced inconsistently.
- **Principle:** WCAG 1.3.1 Info and Relationships.
- **Fix:** Render each tile as `<a class="b-live__a">` containing spans (the link's `aria-label` already carries "Clocked in: 4 of 8"). Alternatively keep `<dl>` and move the link inside the `<dd>`. Code: `src/components/owner-b/b-kit.tsx:45–51`.

**OD-004 · Medium · The status dots on the live tiles are inverted**
- **Image:** `owner-home-1440.jpg`
- **What's wrong:** "Late 0" carries an amber dot, while "Open shifts 3", the one figure that needs action, has no dot.
- **Principle:** Amber = wait/check; signal–noise; Gestalt similarity (the same dot must mean the same thing).
- **Fix:** Set `dot` from the value: amber when `late>0`, none at 0, and amber on Open shifts when `gaps.length>0`. Code: `src/components/owner-b/home-b.tsx:76–79`.

**OD-005 · Medium · The left column ends halfway down the page**
- **Images:** `owner-home-1440.jpg`, `owner-home-1280.jpg`, `owner-state-home-1024-state-home.png`
- **What's wrong:** "Needs you 16" shows 3 rows and ends at y≈562. The right rail runs to y≈997, so a 700×530px empty block sits under the primary card.
- **Mock comparison:** The approved mock has 5 rows with inline actions (Find cover, Message, Approve/Decline, Review, Plan) and a "Today at Main Office" card under them.
- **Principle:** Use of wide space; Gestalt common region and balance; Miller's law (5–7 items fits, 3 hides 13).
- **Fix:** On desktop show up to 6 rows (keep 3 on phones) and add the mock's "Today" roster card under Needs you. Change "See all" to "See all 16" as the mock has.
  - Code: `src/components/owner-b/home-b.tsx:117, 128` (`slice(0, 3)`).

**OD-006 · Medium · The live strip does not line up with the card grid**
- **Images:** `owner-home-1440.jpg` (strip right edge 1215, Payday card 1376), `owner-home-1280.jpg` (they meet only by coincidence)
- **Principle:** Grid alignment between band and cards; Gestalt continuity.
- **Fix:** Pick one of these:
  - Span the strip to the full content width (`max-width:none`).
  - Size it to the 2fr column so its right edge meets the Needs you card.
  - Restore the mock's fourth tile ("Scheduled this week 112 h") and its `meta` lines ("on shift now", "Maria, James", "next tonight 12 AM"). `BLive` already supports `meta` (`b-kit.tsx:49`); Home passes none.
  - Code: `src/app/app/owner-b-desktop.css:222` (`max-width:920px`).

**OD-007 · Medium · The week chart can't be read**
- **Images:** `owner-home-1440.jpg`, `owner-home-1280.jpg`
- **What's wrong:**
  - Day labels are single letters at 11.5px (M T W T F S S, so two T's and two S's).
  - The bars have no values or scale.
  - Today's bar is dark teal and the others are teal-50, so "today" reads as "the only real data".
- **Mock comparison:** The mock prints the hours above each bar and uses "Mon … Sun".
- **Principle:** Recognition over recall; data-ink honesty; text floor (12px).
- **Fix:** Use `weekday.slice(0,3)` and print each day's hours above its bar (`font-variant-numeric: tabular-nums`). Mark today with a teal label rather than the only solid bar. Code: `src/components/owner-b/home-b.tsx:171`.

**OD-008 · Medium · Two of the three "Covered this week" tiles are empty**
- **Images:** `owner-home-1440.jpg` (wraps "192 h of / 336 h"), `owner-home-1280.jpg` ("No / positions / required" on 3 lines); repeated on Schedule (OD-030)
- **What's wrong:** Two of three tiles are "—" plus "No positions required" or "No lead required", which is placeholder content in prime space.
- **Principle:** Signal–noise; Hick's law; text wrapping.
- **Fix:** Hide a tile when its requirement is not configured, and show one line "Positions and leads aren't required · Set up". Let the remaining Staffing tile span the width with "192 of 336 h" on one line.

**OD-009 · Low · The workspace name is cut off with no way to read it**
- **Images:** every 1440 frame ("Northside Café & B…")
- **What's wrong:** The truncated name has no `title` and no tooltip.
- **Mock comparison:** The mock shows the full name over "Owner · 2 locations".
- **Principle:** Truncation needs a way back; Jakob's law (workspace chips show role and context).
- **Fix:** Allow 2 lines at 13.5px, or add `title` and a second line "Owner · 2 locations".

**OD-010 · Medium · The collapsed rail's count badge covers the Things to do icon**
- **Images:** `owner-state-home-1024-state-home.png`, `owner-home-1440-error.jpg`, `owner-state-focus-home-8-1440-state-focus-home-8-fold.png`
- **What's wrong:** The red "15/16" badge sits on top of the tray glyph, hiding most of it. With focus, the ring encloses the badge too.
- **Principle:** Figure–ground; icon legibility; Fitts (the target reads as a badge, not a destination).
- **Fix:** Anchor the badge to the top-right corner of the 40px hit area: `top:2px; right:2px`, 16px tall, with a 2px white ring. Don't centre it over the glyph. (The colour is C11, already covered.)

---

## 2. Home views: Who's working, Hours this week, Activity

**OD-011 · Medium · Hours this week has no visible over or under status**
- **Image:** `owner-view-team-1440.jpg`
- **What's wrong:** "56 h of 40 h · 16 h over" and "32 h of 40 h · 8 h under" are the same grey 13.5px sub-line as "On target" (audit contrast 4.26). The owner can't scan who is over.
- **Principle:** Amber = check; preattentive colour plus label; Gestalt similarity.
- **Fix:**
  - Add a right-aligned value column, for example "56 / 40 h" in tabular figures.
  - Add a status chip: amber "16 h over", grey "8 h under", green "On target".
  - Optionally add a thin bar against the target, as the mock's Timecards rows do.

**OD-012 · Medium · Activity puts tomorrow above today and paints problems neutral**
- **Image:** `owner-view-activity-1440.jpg`
- **What's wrong:**
  - "Tue, Nov 10" sits above "Today · Mon, Nov 9".
  - Every coverage gap uses a grey calendar icon, while the same gaps are amber in Things to do.
  - Each row repeats the date already in its group header ("Tue, Nov 10 · …").
  - "Show 33 more in Things to do" sends the owner to another page.
- **Principle:** Reading order; red/amber semantics; redundancy; Jakob's law (an activity feed is reverse-chronological with today first).
- **Fix:** Put Today first, then future groups under "Coming up". Give gap rows the amber `b-ico--amber`. Drop the date from the row sub-line inside a day group. Make "Show 33 more" expand in place.

**OD-013 · Low · Who's working gives no context**
- **Image:** `owner-view-attendance-1440.jpg`
- **What's wrong:**
  - Four rows sit on an 812px card, and a collapsed "Time corrections" accordion follows that doesn't belong to "who's working".
  - Late or missing people (the reason to open this view) aren't listed.
  - The "Updated 8:29 PM" stamp is the only freshness cue.
- **Principle:** Common region; information scent.
- **Fix:** Add "Scheduled, not in" rows with amber chips under the clocked-in group. Move Time corrections to the Time area.

---

## 3. Things to do `/app/inbox`

**OD-014 · High · "Done and older" hides pending approvals**
- **Image:** `owner-inbox-view-more-1440.jpg`
- **What's wrong:** Under the title "Done and older" (subtitle on Things to do: "Not counted in today's total") sit:
  - "Timecards to approve 18"
  - two "Time correction waiting for review" rows
  - "Plan ahead 47"
  
  None of these is done. An owner who trusts the 16 count misses 18 approvals.
- **Principle:** Truthful labelling; Hick's law (the wrong bucket name makes users skip it); red/amber semantics (pending work must not sit under a check icon).
- **Fix:** Split the view into "Waiting on you, not urgent" (timecards, corrections, plan ahead) and "Done". Show the waiting count on the entry row ("Waiting 22 · Done 4"), and change the check icon on that row to a neutral list icon.
  - Code: `src/components/owner-b/inbox-b.tsx:68`.

**OD-015 · Medium · Action buttons are inconsistent within one list**
- **Images:** `owner-inbox-1440.jpg`, `owner-state-focus-inbox-8-1440-state-focus-inbox-8-fold.png`
- **What's wrong:**
  - In "Open shifts", the first "Find cover" is filled teal and the next two are teal-50.
  - In "Time off", conflicted rows say "Review" and the others "Approve".
  - The Decline buttons' left edges sit at x=800 and x=792 because the labels differ in width.
  - Each row also has a chevron placed between the text and the buttons. The chevron is not at the trailing edge, and it competes as a third target.
  - 9 filled teal pills are visible in one viewport.
- **Principle:** Fitts's law (adjacent competing targets); Gestalt similarity and alignment; one emphasis level per row.
- **Fix:**
  - Use one button size per row type: a fixed `min-width:104px` for Decline, Approve and Review so the edges line up.
  - Make all "Find cover" buttons the same filled teal, or all teal-50 with the next one carrying an amber "Next" chip.
  - Drop the inline chevron where a row has buttons (the title is the link), or move it to the trailing edge after the buttons.

**OD-016 · Medium · "Needs an Owner" is a red chip**
- **Image:** `owner-inbox-1440.jpg`
- **What's wrong:** An unassigned repair is a "check" state. Red reads as "stopped/failed", and the Owner viewing it is the owner it needs.
- **Principle:** Red = stop, amber = wait/check (DESIGN).
- **Fix:** Use an amber chip "No owner yet". Code: `src/components/manager-inbox-corp.tsx:136` (`valueTone: "red"`).

**OD-017 · Medium · Shift swap and Can't-work rows carry less than Time off rows**
- **Image:** `owner-inbox-1440.jpg`
- **What's wrong:**
  - Swap rows show only "Ana Colon / Tue, Nov 17 · 12:00 PM – 8:00 PM", with no counterpart and no action.
  - Time off rows have inline Decline and Approve.
  - Shift requests (`owner-exchange-1440.jpg`) does show "Swap Sat with James Ortiz".
- **Principle:** Consistency; information scent; Hick's law.
- **Fix:** Use the exchange sub-line ("Swap Sat, 12:00 PM with James Ortiz") and the same compact Decline and Approve pills as Time off.

**OD-018 · Low · The conflict warning breaks badly**
- **Image:** `owner-inbox-1440.jpg`
- **What's wrong:** "On the schedule: Tue, Nov 10 · 7:00 AM – 3:00 PM ·" ends a line with a dangling separator, and "Calle Loíza" wraps alone. The row title also repeats "· Time off" under the "Time off" section header.
- **Principle:** Wrapping and widows; redundancy.
- **Fix:**
  - Put the location on its own sub-line, or keep "· Calle Loíza" together with a no-break space before it.
  - Add `text-wrap: pretty`.
  - Drop "· Time off" from titles inside the Time off section.

**OD-019 · Low · The right rail wraps short descriptions and leaves the column empty**
- **Image:** `owner-inbox-1440.jpg`
- **What's wrong:** "Every request, waiting / and decided" and "Swaps and covers / between teammates" wrap at 353px. Below y≈470 the column is empty for 1,300px.
- **Principle:** Use of wide space.
- **Fix:** Make the rail `position: sticky; top: 84px` so the shortcuts stay in reach while the list scrolls, and shorten the sub-lines to one line.

**OD-020 · Medium · The loading, error and offline cards look like input fields**
- **Images:** `owner-inbox-1440-loading.jpg`, `owner-inbox-1440-error.jpg`, `owner-inbox-1440-offline.jpg`
- **What's wrong:**
  - The status card is 50px tall with 22px corners, so it reads as a pill or search box.
  - The same sentence appears up to three times: banner, band sub-line and card.
  - Loading shows a text line only, with no skeleton of the sections.
  - Offline drops the list that was loaded (see OD-001).
- **Principle:** Affordance (a card must not look like a field); redundancy; Doherty threshold.
- **Fix:**
  - Give the status card `min-height: 96px` with an icon in a tinted circle and a title plus sub-line.
  - Say the state once, in the card, and keep the band sub-line as the count ("— things need you").
  - Render section skeletons while loading.

---

## 4. Schedule `/app/schedule` and its sub-pages

**OD-021 · High · Add shift has no visible or keyboard path on desktop**
- **Images:** `owner-schedule-1440.jpg`, `owner-schedule-1280.jpg`; menu `components/owner-schedule-1440-open-more-schedule-actions.jpg`
- **What's wrong:**
  - The band has only "All locations" and "…".
  - The "…" menu lists Copy previous week, Week templates, Print, Scheduling rules, Availability deadline and Activity, with no Add shift and no Build and publish.
  - The grid's "+ Add" only appears on cell hover. It is `aria-hidden` with `tabIndex={-1}`, so keyboard and screen-reader users have no way to add a shift from Schedule.
- **Mock comparison:** The mock puts "Publish 2 drafts" (white pill) and "Week templates" in the band, and "Copy previous week · Add shift" in the card footer.
- **Principle:** WCAG 2.1.1 Keyboard; Fitts's law; one primary per view.
- **Fix:** Add a white "Add shift" pill in the band (it becomes "Publish N drafts" when drafts exist) and add "Add shift" and "Build and publish" to the "…" menu. Keep the hover "+ Add" as a shortcut.
  - Code: `src/components/manager-weekly-roster.tsx:352`; `src/app/app/clean-manager/schedule.css:235`; `src/app/app/schedule/page.tsx:327, 352` (hrefs already exist).

**OD-022 · High · A time-off conflict looks like a normal shift**
- **Images:** `owner-schedule-1440.jpg`, `owner-schedule-1280.jpg` (Ana Colon, Tue 10: "Time off · All day" over a normal grey "12p–8p" block)
- **What's wrong:** The cell says she is off and also scheduled, with no warning colour. Things to do flags the same shift as "Fill Ana Colon's shift · Needs an Owner".
- **Principle:** Red = stop and amber = check; state must not rely on reading small grey text; Gestalt figure–ground.
- **Fix:** When a cell has leave plus a shift, draw the block with an amber 2px inset ring, an amber `WarningIcon`, and the label "Needs cover". Make it link to the fill flow. Code: `src/components/manager-weekly-roster.tsx:351–352`.

**OD-023 · Medium · Shift blocks carry no state or position**
- **Image:** `owner-schedule-1440.jpg`
- **What's wrong:** Every assigned block is the same grey pill with a time. Draft and published can't be told apart, and the position is missing.
- **Mock comparison:** The mock has a legend (Published teal, Draft grey, Open amber) and a position line ("Cashier").
- **Principle:** Gestalt similarity; recognition over recall.
- **Fix:** Use teal-50 with teal text for published, grey for draft and an amber dashed outline for open, plus a 12px position line. Add the three-chip legend to the card header where "Published" sits alone today.

**OD-024 · Medium · Names wrap while the day columns have room to spare**
- **Images:** `owner-schedule-1440.jpg` ("Gabriela / Santos", "Sofía / Méndez"), `owner-schedule-1440-long-names.jpg` (5 lines, 135px row)
- **What's wrong:** The person column is ≈180px, while each day column has 40–60px of unused width.
- **Principle:** Wrapping and widows; density; row-height rhythm.
- **Fix:**
  - Give the name column `minmax(200px, 1.4fr)` and the days `minmax(0, 1fr)`.
  - Clamp names to 2 lines with `title` and the full name in the accessible label.
  - Keep row height at 56px for one-line names.

**OD-025 · Medium · Shift times wrap at 1280**
- **Image:** `owner-schedule-1280.jpg`
- **What's wrong:** "11:30a – / 7:30p" (Sofía, Mon) and "Time off · All / day" wrap. DESIGN (Nov 7) says "the Schedule grid is wide enough that shift times never truncate".
- **Principle:** Approved rule; `white-space: nowrap` on short labels.
- **Fix:** Add `white-space: nowrap` to the block time and gain width through OD-024's column change. Shorten "Time off · All day" to "Off" plus an icon in the cell, with the full text in `title`.

**OD-026 · Medium · The shift time format differs from every other screen**
- **Images:** `owner-schedule-1440.jpg` ("12a–6a", "9p–11:30p" with small-cap a/p and a spaced dash), compared with the Inbox ("7:30–9 PM", "11:30 PM – 12 AM"), the timecard panel ("8:00 AM – 4:05 PM" with small caps) and Activity ("midnight – 6:00 AM")
- **What's wrong:** Four time formats across adjacent screens.
- **Principle:** Jakob's law; consistency. The copy audit covers duration formats; this is the visual time format.
- **Fix:** Keep the compact form for the grid only. Elsewhere use one shared `formatTimeRange` ("7:30–9 PM", "11:30 PM–12 AM", with no spaces around the en dash when both sides are short).

**OD-027 · Medium · Error banner inside the band, and the coverage route is broken**
- **Image:** `owner-schedule-coverage-1440.jpg`
- **What's wrong:**
  - `/app/schedule/coverage` redirects to `/app/schedule?error=INVALID_SHIFT`, showing "Couldn't open that shift", but the owner never picked a shift.
  - The pink banner is placed inside the teal band between the sub-line and the week stepper, splitting the title from its control.
- **Principle:** Gestalt continuity; truthful errors.
- **Fix:** Route coverage to the open-shifts view (or the inbox anchor). Show errors as a white card with a red icon under the band, at the content edge, not inside the band.

**OD-028 · Medium · The Edit shift title is not aligned with its sub-line**
- **Images:** `owner-schedule-edit-shiftid-qa-scan-target-1440.jpg` (title x≈321, sub x≈296), `owner-state-schedule-shift-edit-1440-state-schedule-shift-edit.png` (159 against 136)
- **What's wrong:** Add shift (no sub-line) aligns at 296. Only the subtitle variant is pushed in.
- **Principle:** Alignment to shared edges.
- **Fix:** Zero any inline offset on `.c-shift__titles > .c-shift__title`. The `order:-1; flex:1` rule at owner-b-desktop.css:196 is written for the flex-row header and also hits the h1 inside the column wrapper. Scope it to `.c-shift__head > .c-shift__title`.
  - Code: `src/app/app/owner-b-desktop.css:196, 488`; `src/components/schedule-shift-form.tsx:99`. The exact property was not verified in a browser.

**OD-029 · Medium · A locked field looks like an empty input**
- **Images:** `owner-schedule-edit-shiftid-qa-scan-target-1440.jpg` (grey-filled field, no explanation), `owner-settings-locations-new-1440.jpg` ("Clocker key: Created for you", a white bordered field), `owner-settings-workspace-1440.jpg` (lock icon plus footnote)
- **What's wrong:** Three read-only treatments are in use.
- **Principle:** Consistency; affordance (a read-only value must not look editable).
- **Fix:** Use the Company profile pattern everywhere: a value row with a 16px `LockSimple` (bold) and a one-line reason, for example "Location is set when the shift is created". For the Clocker key show "Created for you when you add the location" as text, not an input.

**OD-030 · Low · The grid card wastes its header**
- **Image:** `owner-schedule-1440.jpg`
- **What's wrong:**
  - The first 52px of the card holds only "Published" in grey at the far right.
  - The "Covered this week" row then repeats Home's tiles (OD-008).
  - "2 not filled" appears only in Monday's open-shift cell.
- **Principle:** Density; Gestalt proximity.
- **Fix:** Merge the state ("Published" as a green chip) and the legend from OD-023 into one header row with the coverage figure ("Staffing 57% · 192 of 336 h"). Show "N not filled" on any day that has ended open shifts, or drop it.

**OD-031 · Low · "Published" status chips are grey on Build and publish**
- **Image:** `owner-schedule-publish-1440.jpg`
- **What's wrong:** Finished states use the neutral chip, but DESIGN says green is done. Timecards use green for "Ready to finalize".
- **Principle:** Colour semantics; consistency.
- **Fix:** Use the green chip (`#1D6B45` on `#E7F4EC`) for Published, and amber for "N drafts".

**OD-032 · Low · Week templates' only action is a grey button with the heading's wording**
- **Image:** `owner-schedule-templates-1440.jpg`
- **What's wrong:** The heading "Save this week" and the button "Save this week" duplicate each other, and the button is the secondary grey pill.
- **Principle:** One primary per view.
- **Fix:** Retitle the card "New template" and make the button the teal pill "Save template".

---

## 5. Timecards `/app/timecards` and Time corrections

**OD-033 · High · The approving state turns the summary into a batch tool the screen doesn't support**
- **Image:** `owner-state-timecard-approving-1440-state-timecard-approving-fold.png`
- **What's wrong:** After approving one card from the panel, the summary card switches to:
  - "0 selected · 3 eligible · 9 excluded · Select up to 100 current timecards below"
  - a "Selected action" select
  - disabled "Review selected timecards" and "Retry original attempted action" buttons
  - a "Refresh" link
  
  The table below has no checkboxes. The card grows by 45px and pushes the table down while the panel says "Saving timecard action…".
- **Principle:** Doherty threshold; layout stability; Hick's law; error prevention.
- **Fix:** Show batch controls only after the owner chooses "Approve N ready". During a single-card save keep the summary as it was and show progress in the panel button only ("Approving…" with a spinner, in place).
  - Code: `src/components/timecards.tsx:487–518`.

**OD-034 · High · Approving a timecard ends on a blank page with no confirmation**
- **Image:** `owner-state-timecard-approved-1440-state-timecard-approved-fold.png`
- **What's wrong:** The summary, table and links disappear, leaving bare canvas. The tabs are dimmed and the panel shows only "Checking period timecards…" in 13px grey. There is no green "Approved" anywhere.
- **Principle:** Visibility of system status; green = done; Doherty threshold.
- **Fix:** Keep the table rendered (stale-while-revalidate). Flip the row's status to a green "Approved" chip immediately, and show a `role="status"` line in the panel: "Elena Ruiz's timecard is approved". Refresh in the background.

**OD-035 · High · The "ready" counts disagree on one screen**
- **Images:** `owner-state-timecard-open-1440-state-timecard-open.png` ("Approve 3 ready" against the tab "Ready to approve 6"), `owner-state-timecard-issue-1440-state-timecard-issue-fold.png` ("Approve 2 ready" against "Ready to approve 5")
- **What's wrong:** The owner can't tell how many will be approved.
- **Principle:** Consistency; error prevention for a pay-affecting batch.
- **Fix:**
  - Rename the tab "Needs approval 6".
  - Make the button state what it does: "Approve 3 that are ready".
  - Add "3 need attention" as an amber chip in the tab.
  - Or make the tab count the eligible set only.
  - Code: `src/components/timecards.tsx:114` (tab label) and `:487` (button).

**OD-036 · Medium · Table rows don't look clickable and statuses are plain coloured text**
- **Images:** `owner-timecards-1440.jpg`, `owner-timecards-1280.jpg`, `owner-state-timecard-open-1440-state-timecard-open.png`
- **What's wrong:**
  - Rows open the side panel but carry no chevron, button or cue.
  - Status is coloured text only ("Ready to finalize" green, "Ready to approve" amber, "Missing clock‑out" amber, "In progress" grey) with no chip and no icon.
- **Mock comparison:** The mock uses status chips, an "Attention" column ("Missing break · Wed") and a per-row action (Approve, Review or Reopen).
- **Principle:** Affordance; WCAG 1.4.1 is satisfied by the words but the chips are the Direction B pattern; Gestalt similarity.
- **Fix:** Render status with the chip component, add a trailing 18px `CaretRight` (bold, `#B5BBBF`) or a row action, and make the whole row a `<button>`.

**OD-037 · Medium · The person column leaves 600px between name and hours**
- **Image:** `owner-timecards-1440.jpg`
- **What's wrong:** At 1440 the name ends at x≈450 and Recorded starts at x≈1050, so the eye loses its row.
- **Principle:** Gestalt proximity; line length.
- **Fix:** Add the mock's columns (position under the name, an Attention column), or cap the table at 860px like reading pages. Add row hover `#F7F9F9` (under `@media (hover:hover)`) so the row stays traceable.

**OD-038 · Medium · Durations use mixed formats in one table**
- **Images:** `owner-timecards-1440.jpg`, `owner-state-timecard-open-1440-state-timecard-open.png`
- **What's wrong:**
  - Rows read "20 h 32" with a small "h".
  - Totals read "86 h 35 min" and "492 h 7 min" (no leading zero, "min" added).
  - Breaks read "30 min", "2 h", "1 h 31", "24 h 31 min".
  - DESIGN (Nov 7) says rows "24 h 06" and period totals whole hours ("511 h").
- **Principle:** Number formats; tabular alignment.
- **Fix:** Use one formatter. Rows and breaks "8 h 06" and "0 h 30"; totals "492 h" with minutes in `title`.

**OD-039 · Medium · The issue panel is a dead end**
- **Image:** `owner-state-timecard-issue-1440-state-timecard-issue-fold.png`
- **What's wrong:** The amber "Needs attention · Correction awaiting review" note says to resolve corrections, the Approve button is disabled, and there is no link to the correction.
- **Principle:** Error recovery; Fitts.
- **Fix:** Add a teal pill "Review correction", linking to `/app/timecards/corrections#<id>`, inside the amber note. Keep Approve disabled under it.

**OD-040 · Low · Closing the panel makes the page jump**
- **Image:** `owner-state-timecard-issue-details-1440-state-timecard-issue-details.png`
- **What's wrong:**
  - The panel exits by moving up about 44px and fading, while the table widens from 988 to 1240 under it.
  - The half-transparent panel overlaps "Approve 2 ready" and the Status column for the frame.
  - A right-hand panel should leave to the right, or fade in place.
- **Principle:** Exits are shorter and smaller (better-ui); layout stability.
- **Fix:** Fade the panel out over 150ms with a fixed `translateX(12px)`, and delay the table re-flow until the exit ends. Under reduced motion, use opacity only.

**OD-041 · Low · Panel header and anomalies**
- **Image:** `owner-state-timecard-open-1440-state-timecard-open.png`
- **What's wrong:**
  - The header copies the iOS sheet: a centred "Timecard" title with a "Done" text button and no ×.
  - Valeria Díaz's "113 h 19" in one week has no flag.
  - "This week" folds no-time people into one row, while "Last week" lists "Jose Natal 0 min — No time yet" as a full row.
- **Principle:** Jakob's law (desktop side panels: left title plus ×); anomaly salience; consistency.
- **Fix:** Left-align the title and add a 40px × button (keep Escape). Add an amber "Over 60 h" chip when recorded time is over the policy limit. Collapse no-time rows the same way on every tab.

**OD-042 · Medium · Time corrections don't highlight the change**
- **Image:** `owner-timecards-corrections-1440.jpg`
- **What's wrong:**
  - Three identical grey tiles (Recorded, Current effective, Proposed) put the only difference (2:06 PM → 2:41 PM) in the same weight.
  - Four grey helper lines follow with uneven gaps: "Times in Puerto Rico time", "No prior decisions…", the employee's reason (unlabelled, larger ink) and the policy line.
  - The section title "Correction requests 2" sits on the canvas outside the cards.
- **Principle:** Visual hierarchy; Gestalt figure–ground; "a titled section is one card" (DESIGN).
- **Fix:**
  - Show two tiles, "Recorded" and "Asked for", with the changed time in teal bold and "+35 min" as a chip.
  - Put the reason in a labelled quote ("Their reason") above the actions.
  - Move the time-zone and policy notes into one footnote.
  - Put the section label in a header card or remove it.

---

## 6. Payroll (ink band)

**OD-043 · Medium · Prepare payroll offers the same action four ways and puts the future first**
- **Image:** `owner-payroll-prepare-1440.jpg`
- **What's wrong:**
  - "Up next" (Nov 9–15, future) sits above "Periods with no payroll 2" (overdue).
  - "Prepare payroll" appears as a teal text link, a teal filled pill, a text link "Prepare" and a text link "Choose dates".
  - A "Close" link sits beside the expanded period and doesn't say what it closes.
- **Principle:** One primary per view; red = stop first; Hick's law.
- **Fix:**
  - Order overdue periods first.
  - Give the oldest period the only filled pill, and the others a quiet "Prepare" pill of the same size.
  - Replace "Close" with a chevron disclosure, or remove it.

**OD-044 · Medium · Recent payrolls: duplicate rows, grey money, bare icons**
- **Images:** `owner-payroll-1440.jpg`, `owner-payroll-history-1440.jpg`
- **What's wrong:**
  - "Oct 19–25" appears twice (Correction and original) with no visual link.
  - Amounts are grey (measured 4.26:1 on the rendered row) although money is the key figure.
  - The receipt icons are bare 20px glyphs, not tinted circles.
- **Principle:** Hierarchy; Gestalt common region; icon system (Phosphor bold in tinted circles).
- **Fix:**
  - Nest the original under its correction, as "Replaced by correction" on a second line, or fold it.
  - Set amounts in ink 600, right-aligned, with tabular figures.
  - Wrap the icon in a 36px teal-50 circle.

**OD-045 · Low · Payroll details repeats its subtitle**
- **Image:** `owner-payroll-review-run-ec99f16d-756a-42ec-9ffb-b73827857ab8-1440.jpg`
- **What's wrong:** The card title "Oct 19–25 · Payday Fri, Oct 30" repeats the band sub-line. "View" plus a bare download glyph form two adjacent targets per document.
- **Principle:** Redundancy; Fitts.
- **Fix:** Title the card "Totals". Give each document one trailing "Download" pill with a "View" link, or a 40px icon button with an `aria-label`.

**OD-046 · Low · Two navigations on Time exports and Payroll settings**
- **Images:** `owner-payroll-export-1440.jpg`, `owner-settings-payroll-1440.jpg`
- **What's wrong:** A "‹ Payroll" back link sits above tabs that also contain "Payroll". The Payroll home has the tabs but no back link.
- **Principle:** Navigation clarity; redundancy.
- **Fix:** Tab pages drop the back link, since the tabs are the navigation.

**OD-047 · Low · The empty state is centred in a left-aligned system**
- **Images:** `owner-payroll-people-1440.jpg`, `owner-payroll-fix-1440.jpg`
- **What's wrong:** "This payroll isn't available" is centred with a grey button. The other empty states are left-aligned (Week templates, My pay, Clocker recovery).
- **Principle:** Consistency; alignment to shared edges.
- **Fix:** Use the one empty-state pattern: a left-aligned icon in a tinted circle, a 16/22 600 title and the action as a pill. (Size T3 is covered in the code audit.)

**OD-048 · Low · The "Periods with no payroll" count pill differs**
- **Image:** `owner-payroll-prepare-1440.jpg`
- **What's wrong:** This pill is grey with a larger dark number, while every other count pill is teal-50 at 12.5px 700.
- **Principle:** Chip consistency.
- **Fix:** Use the teal-50 pill, or a red-50 pill if the count means overdue.

---

## 7. Team `/app/employees`

**OD-049 · Medium · The People list: status as grey text, no chevrons, vague "See all"**
- **Images:** `owner-employees-1440.jpg`, `owner-employees-1440-long-names.jpg`
- **What's wrong:**
  - "Working" is grey text (4.3:1) rather than the green chip with a live dot used on Home.
  - Rows navigate but have no chevron, while sibling lists do.
  - The card shows 8 of 12 under "See all" with no count.
- **Principle:** Colour semantics (green = active/done); affordance; information scent.
- **Fix:** Use a green "Working" chip with the live dot, add the trailing chevron, and use "See all 12". Or show all 12, since the page is 1,037px tall and has room.

**OD-050 · Low · The person page is thin**
- **Image:** `owner-employees-qa-scan-a-1440.jpg`
- **What's wrong:**
  - Shifts, Timecards and Availability rows carry no preview ("3 shifts this week", "40 h 38 last week").
  - The positions line ("Front counter, Kitchen, Barista, Baker · Calle Loíza") is the card's bold title while the name is only in the band.
  - "ID QA‑SCAN‑A" and "Access and sign‑in" render wide hyphens (a new instance of T4).
- **Principle:** Information scent; hierarchy.
- **Fix:** Add a right-aligned value to each row. Title the card with the name and role and move positions to the sub-line.

**OD-051 · Low · The Clocker PIN back link is "Cancel" with no chevron**
- **Image:** `owner-employees-qa-scan-a-clocker-pin-1440.jpg`
- **What's wrong:** Every other secondary page uses "‹ Parent".
- **Principle:** Consistency.
- **Fix:** Use "‹ Maria Rivera".

**OD-052 · Low · Add employee: no back link and no stepper**
- **Images:** `owner-employees-new-1440.jpg`, `owner-state-employee-new-empty-1440-state-employee-new-empty.png`, `owner-state-employee-new-filled-1440-state-employee-new-filled.png`
- **What's wrong:**
  - "Step 1 of 2" is text only.
  - Error text carries no icon (meaning sits in colour plus words; acceptable).
  - The error state grows the card by about 56px, which is fine.
  - There is no way back except Cancel. Add shift has the same problem.
- **Principle:** Wayfinding.
- **Fix:** Add "‹ Team" to the band and a two-dot step indicator. Optionally add a 14px `WarningCircle` to each error line.

---

## 8. Time off and shift requests

**OD-053 · Medium · The Time off list drops conflicts and actions that Things to do shows**
- **Images:** `owner-requests-1440.jpg`, `owner-requests-tab-approved-1440.jpg`
- **What's wrong:**
  - The Waiting tab lists Maria and James with no "On the schedule" warning and no Approve or Decline.
  - The Approved tab shows "Approved by Jose Natal · Nov 9" as grey text rather than a green chip, and its rows lose their chevrons.
- **Principle:** Consistency (the same item behaves the same everywhere); green = done.
- **Fix:** Reuse the Things to do row (warning line plus compact Decline and Approve), and show a green "Approved" chip on decided rows.

**OD-054 · Medium · The time-off detail is broken into four cards with floating actions**
- **Images:** `owner-requests-tab-pending-requestid-scan-leave-maria-1440.jpg`, `owner-state-timeoff-open-1440-state-timeoff-open.png`
- **What's wrong:**
  - The name appears three times (band, card header, "Maria is on the schedule then").
  - "Also off that day — Ana Colon" fills a whole card.
  - Decline and Approve sit on the canvas outside any card, right-aligned, with a centred note under them.
  - The explanation line runs about 100 characters.
- **Principle:** Gestalt common region; proximity of action to content; line length ≤75ch.
- **Fix:** Use one request card (dates, reason, also-off) and one conflict card whose footer holds Decline and Approve. Left-align the note under the buttons, and cap paragraphs at 68ch.

**OD-055 · Medium · Shift requests uses half-width buttons**
- **Images:** `owner-exchange-1440.jpg`, `owner-state-callout-open-1440-state-callout-open.png`, `owner-state-swap-open-1440-state-swap-open.png`
- **What's wrong:**
  - Each of 5 rows has a 355px "Decline" and a 359px "Approve" (40px tall). That is 10 slabs, the phone pattern stretched to desktop.
  - Things to do shows the same requests with compact right-aligned pills.
  - A right chevron that expands the row (the callout and swap states) mixes navigation and disclosure cues.
  - The expanded detail stacks unindented lines and adds the year ("Tue, Nov 17, 2026"), which no other date shows.
- **Principle:** Fitts's law (huge targets invite misclicks on the wrong row); consistency; Jakob's law (chevron-down for disclosure).
- **Fix:**
  - Use compact pills right-aligned in the row, as in Things to do.
  - Use `CaretDown` for expandable rows.
  - Indent the details under the title in a grey inset with label and value pairs, without the year.

---

## 9. Insights `/app/reports`

**OD-056 · Medium · Being 79% over plan looks like a normal full bar**
- **Image:** `owner-reports-1440.jpg`
- **What's wrong:** "86 h 51 min of 48 h 30 min planned" fills a solid teal bar. The overage, "38 h 21 min over plan", is small grey text at the far right.
- **Principle:** Amber = check; preattentive salience.
- **Fix:** Cap the planned part at 100% in teal and draw the excess in amber with an amber "+38 h over plan" chip.

**OD-057 · Low · Placeholders and an empty chart**
- **Image:** `owner-reports-1440.jpg`
- **What's wrong:**
  - Attendance "—" placeholders render at 2.29:1 (audit).
  - Hours by day draws one bar on a 1,080px track with no zero baseline. The future days look like zeros.
- **Principle:** Contrast for meaningful text; honest charts.
- **Fix:** Show "—" in `#6A7176` with "Not enough data yet". Show future days as a dashed outline labelled "—", and draw a baseline.

---

## 10. Updates, Notifications, More, Profile, Help

**OD-058 · High · Help can't be reached from the desktop shell**
- **Images:** `owner-help-1440.jpg`, `owner-more-1440.jpg`, `components/owner-home-1440-open-jose-natal-account-menu.jpg`
- **What's wrong:**
  - The sidebar's "More" is a non-clickable group label (Insights, Updates, Settings).
  - The account menu lists Your profile, My pay and Sign out.
  - Help, and the More page itself, appear only as back-link targets ("‹ More" on Updates, Help, My pay and Profile).
- **Principle:** Navigation clarity; Jakob's law (Help lives in the account menu or the sidebar footer).
- **Fix:** Add "Help" to the account menu and the sidebar's More group. Point desktop back links at the real parent: Updates and Insights have none; for Profile and My pay, use the account menu.
  - Code: `src/lib/navigation.ts:146–147`.

**OD-059 · High · Notifications fails in the default capture**
- **Images:** `owner-notifications-1440.jpg` (state "default"), `owner-state-notifications-error-1440-state-notifications-error.png`
- **What's wrong:** Both frames show "Couldn't load notifications", while the bell on every other page shows 3 unread. The page is unusable on the fixture data. Verify against the route, not the harness.
  - The All and Unread segment sits on the canvas, styled grey on grey so it looks disabled, while sibling pages put segments on the band.
- **Principle:** Visibility of status; consistency (OD-077).
- **Fix:** Fix the read, so the bell's count and the page agree. Move the segment onto the band, as on Things to do.

**OD-060 · Medium · Profile sub-routes all show the bare Profile**
- **Images:** `owner-profile-calendar-1440.jpg`, `-device-alerts`, `-passkeys`, `-privacy`, `-terms` (all 5 are byte-identical, and finalUrl is `/app/profile`)
- **What's wrong:** Deep links (from Help's "Privacy Policy", or from notifications) drop the user on the parent with nothing opened.
- **Principle:** Information scent; deep linking.
- **Fix:** Open the matching section or sheet on load: privacy and terms open the Privacy and terms disclosure (`components/owner-profile-1440-open-privacy-and-terms.jpg` shows it exists), and calendar opens its row.

**OD-061 · Medium · Help: chevrons that mean two things, and long lines**
- **Images:** `owner-help-1440.jpg`, `owner-state-help-expanded-1440-state-help-expanded.png`
- **What's wrong:**
  - "I can't sign in" has a right chevron and expands in place, while its neighbours navigate.
  - The expanded answer and the contact paragraph run about 105–115 characters per line at 15px and 13.5px.
- **Principle:** Jakob's law; measure 60–75ch.
- **Fix:** Use `CaretDown` for disclosure rows. Set `max-width: 68ch` on paragraph text in cards.

**OD-062 · Low · Updates details**
- **Images:** `owner-updates-1440.jpg`, `owner-updates-33f86b00-9dad-4a81-b208-5a840ba030c5-1440.jpg`
- **What's wrong:**
  - The tab count format "Needs reply · 1" differs from "Waiting 7" and "All 16".
  - The update message card has 30px top and 45px bottom padding.
  - "Withdraw update" is a full-width outlined pill on the canvas, which reads like a card.
  - "Read by 0 of 10" fills a card on its own.
- **Principle:** Chip and tab consistency; spacing rhythm.
- **Fix:** Use "Needs reply 1". Equalise the padding at 22px. Merge "Read by" into the message card's footer, and make Withdraw a red text button in that footer.

**OD-063 · Low · More page**
- **Image:** `owner-more-1440.jpg`
- **What's wrong:** It repeats three sidebar entries, and shows Sign out in red (a new instance of C13).
- **Fix:** On desktop, reduce More to My pay and Help, or remove the page and use OD-058.

**OD-064 · Low · Profile rows**
- **Image:** `owner-profile-1440.jpg`
- **What's wrong:** Phone has no chevron while Email has one, and the reason is not stated.
- **Fix:** Add a lock icon or a chevron consistently, with OD-029's read-only pattern.

---

## 11. Settings

**OD-065 · Medium · Settings hub cards touch the band edge**
- **Image:** `owner-settings-1440.jpg`
- **What's wrong:**
  - The cards start at y=150 and the band ends at y=154, a 4px overlap. That is neither the 24px gap of secondary pages nor the 52px lift of main screens, so the edges look misregistered.
  - The two columns end at x=1352, a third right edge (see OD-076).
- **Principle:** Gestalt figure–ground; the approved spacing rule (DESIGN Nov 6: "content 24px under the band").
- **Fix:** Give the band 28px more bottom padding (lift 52px), or start the grid 24px below it. Set the grid max-width so it ends at 1376 like Home.

**OD-066 · Medium · Punch photos: child toggles stay on while the parent is off**
- **Image:** `owner-settings-clocker-photos-1440.jpg`
- **What's wrong:** "Take punch photos" is off ("Starts when photos are available"), but Clock in, Start break, End break and Clock out are bright teal and on, and look live.
- **Principle:** Visibility of state; dependency.
- **Fix:** Dim and disable the four child toggles (`aria-disabled`, 0.55 opacity) and indent them under the parent, or hide them until the parent is on.

**OD-067 · Medium · Save sits in a different place on each settings page**
- **Images:**
  - Save on the band: `owner-settings-branding-1440.jpg`, `owner-settings-workspace-1440.jpg`, `owner-settings-company-policies-1440.jpg`, `owner-settings-locations-loc-1-1440.jpg`.
  - Save in a card footer: `owner-settings-clocker-photos-1440.jpg`.
  - Floating outside the card: `owner-clocker-recovery-1440.jpg` ("Check code") and `owner-account-recovery-1440.jpg` ("Issue recovery code").
- **What's wrong:** DESIGN lists "which forms carry actions on the band vs in a footer" as left open. The floating third pattern is new and worst.
- **Principle:** Jakob's law; proximity of action to its form.
- **Fix:** Long settings pages put Save on the band (it stays visible). Single-card tools put the action in the card footer. No action floats on the canvas.

**OD-068 · Low · Card headers differ across sibling settings pages**
- **Images:** `owner-settings-locations-1440.jpg` ("2 locations" as the title), `owner-settings-breaks-1440.jpg` ("1 break type"), `owner-settings-clocker-1440.jpg` ("Tablets" plus a count pill), `owner-settings-positions-1440.jpg` (no header)
- **Principle:** Gestalt similarity.
- **Fix:** Use "Locations 2", "Break types 1" and "Positions 4": the name plus the teal-50 count pill.

**OD-069 · Low · Settings polish**
- **Images:** see each item.
- **Features** (`owner-settings-features-1440.jpg`): the single-choice list shows only a thin regular-weight check on the selected row, with no radio affordance on the others. Use radio circles, or a bold check plus a teal-50 row tint.
- **Clocker tablets** (`owner-settings-clocker-1440.jpg`): sub-lines order status and location differently ("Calle Loíza · Not used yet" against "Not set up · Condado"). The hub's "1 not set up" is grey but is a check state; use amber.
- **Branding** (`owner-settings-branding-1440.jpg`): the preview's teal button has about 8px corners, unlike the pill buttons used everywhere else.
- **Footnote x-positions:** 296 (account delete), 312 (policies), 318 (most). In Photo review the body text starts at x=313 under a title at 319. Align footnotes to the card's inner edge (22px).
- **Company policies, expanded** (`owner-state-policies-expanded-1440-state-policies-expanded.png`): the dividers stop 22px short of the right edge, while every other list runs them to the edge.

---

## 12. Account, recovery and other pages

**OD-070 · Medium · Consent is a toggle, and the actions are full-width slabs off the card**
- **Images:** `owner-account-delete-1440.jpg`, `owner-account-recovery-1440.jpg`
- **What's wrong:**
  - "I understand my NEVORA account will be deleted…" and "I confirmed who they are" are switches.
  - Account delete stacks two full-width grey pills ("Confirm deletion request" disabled, "Keep my account") on the canvas.
  - Account recovery splits one form across two cards, with helper text between them and a disabled button floating at the right.
- **Principle:** Jakob's law (consent is a checkbox); proximity; one primary per view.
- **Fix:**
  - Use a checkbox row.
  - Put the actions in the card footer: "Keep my account" as the quiet pill and "Delete account" as the red pill (distinct treatment), sized to content, right-aligned.
  - Make Account recovery one card.

**OD-071 · Medium · Clocker recovery lights the wrong sidebar entry**
- **Image:** `owner-clocker-recovery-1440.jpg`
- **What's wrong:** The sidebar highlights Team, while the back link says "‹ Settings".
- **Principle:** Navigation clarity (you-are-here).
- **Fix:** Map `/app/clocker-recovery` to Settings in the sidebar's ownership list, or change the back link to Team. Do the same for any route whose back link and active entry disagree.

**OD-072 · Low · Availability is a dead-end list**
- **Image:** `owner-availability-1440.jpg`
- **What's wrong:** "Not sent 1 / Sent 9" sits on the canvas (OD-077). Miguel Reyes's row has no action ("Remind") and no chevron.
- **Fix:** Add a quiet "Remind" pill, and move the segment to the band.

---

## 13. Loading, error and offline (app-wide)

**OD-073 · Medium · The loading skeleton doesn't match the page it loads**
- **Images:** `owner-home-1440-loading.jpg`, `owner-timecards-1440-loading.jpg`
- **What's wrong:**
  - A Quiet-era skeleton (six avatar rows at x=156, no band) shows under a flat top bar carrying "Home" or "Time", a label that disappears once loaded.
  - Then the band and the 52px card lift arrive and everything jumps.
- **Principle:** Doherty threshold; layout stability; consistency with Direction B.
- **Fix:** Render the band (title and live-strip shapes) plus Direction B card skeletons, sized to each page's grid. Keep the top bar identical in both states.
  - Code: `src/components/company-access/scoped-read-frame.tsx:181` (`QuietSkeleton`).

**OD-074 · Medium · One failed read replaces the whole page**
- **Images:** `owner-home-1440-error.jpg`, `owner-timecards-1440-error.jpg`
- **What's wrong:** A 503 on the client reads swaps all of Home or Timecards for "Current view needs a fresh check", with a grey secondary "Refresh current view".
- **Principle:** Graceful degradation; one primary per view (the only recovery should be the primary pill).
- **Fix:** Fail per card where the data is per card. Where the frame must fail, use the teal primary pill "Try again" and keep the band title of the page ("Home"), not a status sentence as the H1.

**OD-075 · Low · The offline banner splits the band**
- **Images:** `owner-inbox-1440-offline.jpg`, `owner-home-1440-offline.jpg`, `owner-timecards-1440-offline.jpg`
- **What's wrong:** A 36px grey strip sits between the teal top bar and the teal band.
- **Principle:** Gestalt continuity.
- **Fix:** Render it as an amber chip inside the top bar ("Offline · showing saved"), or as a full-width amber notice below the band.

---

## Cross-screen patterns

**OD-076 · Medium · Three right edges, and the band action jumps between pages**
- **Images:** `owner-home-1440.jpg`, `owner-timecards-1440.jpg`, `owner-reports-1440.jpg`, `owner-schedule-1440.jpg` (1376); `owner-settings-1440.jpg` (1352); `owner-employees-1440.jpg`, `owner-payroll-1440.jpg` and most secondary pages (1108)
- **What's wrong:** Content ends at three different x positions. The page's main pill moves with them: "Add employee" ends at 1108, "Export" at 1376.
- **Principle:** Fitts's law and Jakob's law (the primary action has one home); grid alignment.
- **Fix:** Keep the 860px reading column for content, but pin band actions to one right edge (1376 at 1440, which is the content max), whatever the column width below. Make Settings end at 1376 too.

**OD-077 · Medium · Segmented controls appear in three styles**
- **Glass on the band:** `owner-inbox-1440.jpg`, `owner-timecards-1440.jpg`, `owner-requests-1440.jpg`, `owner-payroll-1440.jpg`.
- **Grey on the canvas:** `owner-notifications-1440.jpg`, `owner-availability-1440.jpg`, `owner-settings-clocker-pins-1440.jpg`. These look disabled.
- **Underline tabs inside a card:** the timecards status tabs.
- **Team's search** is glass on the band, while the Clocker PINs search is white on the canvas.
- **Principle:** Gestalt similarity; DESIGN ("strips that belong to the title … join the band on glass").
- **Fix:** Every page-level filter joins the band on glass. Keep underline tabs only for in-card sub-filters.

**OD-078 · Medium · Status is shown four ways**
- **Chips:** Pending in corrections, "Needs an Owner", Correction.
- **Coloured text:** timecard status, "Missing clock‑out".
- **Grey text:** "Working", "Approved by…", "Published", "1 not set up", "Hours over".
- **A neutral grey chip** where green is meant: Build and publish "Published".
- **Principle:** Gestalt similarity; colour semantics (red stop, amber check, green done, teal info) plus a word, every time.
- **Fix:** Route every status through one `BChip` with the four tones, and give each status string a fixed tone in one table.

**OD-079 · Medium · Rows signal "clickable" and "expandable" inconsistently**
- **Clickable rows without a chevron:** Team list, timecard rows, Approved requests, Availability.
- **Expanding rows with a right chevron:** Help, Shift requests.
- **Chevrons in the middle of rows that have buttons:** Things to do.
- **Principle:** Affordance; Jakob's law.
- **Fix:** Use a trailing `CaretRight` for navigation, `CaretDown` and `CaretUp` for disclosure, and no chevron on rows whose action is a button.

**OD-080 · Medium · Actions float on the canvas outside their card**
- **Images:** `owner-requests-tab-pending-requestid-scan-leave-maria-1440.jpg`, `owner-clocker-recovery-1440.jpg`, `owner-account-recovery-1440.jpg`, `owner-account-delete-1440.jpg`
- **Principle:** Gestalt common region and proximity.
- **Fix:** Put actions in the owning card's footer, separated by one inset divider, as on Add shift and Add employee.

**OD-081 · Low · Hours and times aren't formatted one way**
- **What's wrong:** "436.5 h" (Home, Schedule), "42.5 h of 36 h · 6.5 h over" (Team), "86 h 51 min" (Insights), "20 h 32" and "492 h 7 min" (Timecards), "87 h this week" (More).
- **Note:** OD-026 and OD-038 cover the most visible cases; the copy audit covers durations in sentences.
- **Fix:** Use one shared `formatHours` with three outputs: the row form "8 h 06", the period total "437 h", and the sentence form "8 hours 30 minutes".

**OD-082 · Low · Empty and quiet states come in three patterns**
- **Patterns:** centred with a grey button (payroll people and fix), left-aligned with a grey button (Week templates, Clocker PIN), and an inline grey line (Clocker recovery "No one needs help right now", Photo review).
- **Fix:** Use one left-aligned pattern: a tinted icon circle, a title, one line and a pill.

---

## Top 10 for Owner desktop

1. **OD-001 / OD-073 / OD-074.** Offline and error frames throw away loaded content, contradict the shell banner, and load through a skeleton from the previous design. This makes the app feel broken whenever the network wobbles.
2. **OD-002.** Home's Payday card says payroll is 11 days away while two paydays have already passed without payroll.
3. **OD-021.** Schedule has no visible or keyboard-reachable Add shift or Publish on desktop. The hover "+ Add" is `aria-hidden` and `tabIndex=-1`.
4. **OD-022.** A shift on approved time off renders as a normal grey block. The schedule hides its own conflict.
5. **OD-033 / OD-034.** Approving one timecard turns the summary into a jargon batch tool, then blanks the page with no "Approved" confirmation.
6. **OD-035.** "Approve 3 ready" sits next to "Ready to approve 6" on the same screen, for a pay-affecting batch.
7. **OD-014.** "Done and older" (not counted in the total) holds 18 timecards to approve and pending corrections.
8. **OD-058 / OD-071.** Help can't be reached from the desktop sidebar or account menu, back links point at a phone-only More page, and Clocker recovery lights the wrong sidebar entry.
9. **OD-059.** Notifications fails to load while the bell shows 3 unread. **OD-003:** the live-figure tiles fail axe's "definition-list" rule.
10. **OD-078 / OD-077 / OD-076.** Status appears as chips, coloured text or grey text. Segmented controls appear on the band, on the canvas or as underline tabs. Content and the band's main pill end at three different right edges. These are the biggest consistency gaps against the approved Direction B system.

## Counts

- **High (11):** OD-001, 002, 003, 014, 021, 022, 033, 034, 035, 058, 059.
- **Medium (45):** OD-004, 005, 006, 007, 008, 010, 011, 012, 015, 016, 017, 020, 023, 024, 025, 026, 027, 028, 029, 036, 037, 038, 039, 042, 043, 044, 049, 053, 054, 055, 056, 060, 061, 065, 066, 067, 070, 071, 073, 074, 076, 077, 078, 079, 080.
- **Low (26):** OD-009, 013, 018, 019, 030, 031, 032, 040, 041, 045, 046, 047, 048, 050, 051, 052, 057, 062, 063, 064, 068, 069, 072, 075, 081, 082.
- **Total:** 82 findings.

Verdict: **Block.** High findings remain.
