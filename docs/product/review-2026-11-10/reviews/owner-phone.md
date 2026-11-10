# NEVORA Owner on phones: UI and UX review (390 and 320)

**Scope.** The 201 images in `/tmp/review/owner-phone/`, with their `.audit.json` files and the `owner-phone` entries in `/tmp/review/manifest.json`.
- Every route was viewed at 390, plus the -fold shots and every state-runner variant: loading, error, offline, long names, focus, sheet and expanded, form empty and filled, and validation.
- 320 was spot-checked on Home, Things to do, Schedule, Payroll, Team, Insights, Profile, Build and publish, Notifications and Time exports.

**Baseline.** The approved design is Direction B: DESIGN.MD "Current direction", "Owner and Manager phones: Direction B" and the filled-data round of Nov 7, plus mock `docs/product/direction-b/mocks/1-mobile-owner-employee.html`.

**Not repeated here.** Findings already in `code-design-system.md` and `copy-audit.md` are referenced by their IDs (C1–C14, B1–B8, I1–I6, T1–T8, and the copy rows) only where a screen shows a new instance.

**Data.** Fictional local data. The capture clock was Mon Nov 9, 8:29 PM, Puerto Rico time (`_logs-owner.json`: "local 20:29").

**Laws used.**
- UX laws: Fitts, Hick, Jakob, Miller, Doherty and aesthetic-usability.
- Gestalt principles: closure, common region, continuity, figure-ground, proximity and similarity.

**Severity.**
- **High:** blocks or confuses a task, or fails accessibility.
- **Medium:** a visible inconsistency or friction.
- **Low:** polish.

---

## Home: `/app` (also `/app/requests/hub` and `/app/my-time`, which redirect here)

**OP-001 · High · Offline wipes the loaded page while the toast says the opposite**
- Images: `owner-home-390-offline.jpg`, `owner-inbox-390-offline.jpg`, `owner-timecards-390-offline.jpg`, `owner-state-offline-home-390-state-offline-home.png`
- What's wrong:
  - When the browser goes offline after loading, Home and Timecards replace everything with "View paused" and a grey "Refresh current view" button.
  - Things to do drops every group and keeps only three link rows.
  - The state-runner copy of the same event shows a third message, "Current view needs a fresh check".
  - Meanwhile the dark toast at the bottom says "You're offline. Showing what was loaded.", but nothing loaded is shown.
  - An Owner on a weak shop Wi-Fi loses the list they were working through.
- Breaks: honest system status, Doherty (a sub-second network blip costs the whole view), and consistency (three different offline outcomes).
- Fix:
  - In `src/components/company-access/scoped-read-frame.tsx:178–189`, keep rendering `body.content` when `body.phase === 'paused'`.
  - Lay a non-blocking notice over it (the white 22px notice card above the tab bar, which DESIGN already defines for X-Nevora-Failure).
  - Disable command buttons while paused.
  - Do the same for Things to do's offline branch (`src/components/owner-b/inbox-b.tsx:60–62`), which should keep the groups it already read.

**OP-002 · High · Payday countdown and dates disagree because Payroll uses the UTC date**
- Images: `owner-home-390.jpg` ("In 11 days", amber chip), `owner-payroll-390.jpg` ("Payday in 10 days", green chip), `owner-my-pay-390.jpg` ("In 11 days", plain grey text), `owner-settings-payroll-390.jpg` ("Jose changed this **Nov 10**", captured on Nov 9)
- What's wrong:
  - One payday (Fri, Nov 20) is 11 days away on Home and My pay but 10 days away on Payroll.
  - It is also styled three ways: amber chip, green chip and grey text.
  - Payroll settings shows a change dated tomorrow.
  - Cause: `src/components/payroll/payroll-runs.tsx:90` sets `today` from `new Date().toISOString().slice(0,10)`, which is the UTC date. After 8 PM in Puerto Rico (UTC−4) that is already tomorrow. `overduePeriod()` at :137 uses the same value, so a period can be flagged overdue a few hours early.
- Breaks: honest figures (DESIGN "Nothing estimated") and similarity (one fact, three looks).
- Fix:
  - Derive `today` in the company time zone, as Home does.
  - Format "Change history" in that zone too.
  - Use one payday chip everywhere: amber while timecards wait and green when ready (home-b.tsx:144–146 already has this logic). Reuse it in `payroll-runs.tsx:214` and My pay.

**OP-003 · Medium · The loading state and the in-app 404 show the retired white header**
- Images: `owner-home-390-loading.jpg`, `owner-timecards-390-loading.jpg`, `owner-no-such-page-390.jpg`, `owner-ai-manager-390.jpg`
- What's wrong:
  - While reads are held back, the shell draws a white header with the old "NEVORA / WORKFORCE" lockup (the "WORKFORCE" line is 9px, flagged in the audit `textUnder12px`) and a plain grey bell.
  - The skeleton lines are a warm cream, the Quiet palette.
  - When data arrives, the teal band, glass tiles and lifted cards replace it, so the whole page jumps about 300px and changes brand.
  - The 404 page uses the same white header, no band, and a third bell-badge style (a solid teal number).
  - `src/app/app/loading.tsx:3` says this placeholder should be "the band at its final height, then cards"; the capture shows otherwise.
- Breaks: aesthetic-usability, continuity, and DESIGN ("404 … Direction B teal band").
- Fix:
  - Render the Direction B skeleton: `BHero` at its final height with glass placeholders and two lifted white skeleton cards in `--b-quiet` `#F0F2F3`.
  - Use it from the frame's checking branch (`scoped-read-frame.tsx:181`, `QuietSkeleton`).
  - Give `src/app/app/not-found.tsx` the `BScreen`/`BHero` treatment.

**OP-004 · Medium · The Payday card's progress segments say nothing, and its two lines contradict each other**
- Images: `owner-home-390-fold.jpg`, `owner-home-320.jpg`
- What's wrong:
  - There are three grey segments with none filled. They are `aria-hidden` and unlabelled (`src/components/owner-b/home-b.tsx:148`).
  - The line under them reads "11 timecards to review … Ready now". "Ready now" next to unreviewed work reads as "payroll is ready".
- Breaks: closure (an empty progress bar with no steps named), and Gestalt continuity with the Payroll page, whose three steps are named.
- Fix:
  - Label the three segments with the Payroll steps (Timecards, Review pay, Approve) as 11px captions, or drop the bar.
  - Change the detail to "Review now" (`home-b.tsx:141`).

**OP-005 · Medium · A row's link covers only its text block, 40px tall**
- Images: `owner-state-focus-home-8-390-state-focus-home-8-fold.jpg` (the focus ring shows the hit area); audit `targetsUnder44`: `a.b-row__hit "Open shifts, 3" 213×40` (390) and `254×39` (320) on Home; the same pattern on 24 Things to do rows
- What's wrong:
  - In rows with a trailing button ("Find cover"), the tappable link is a 213×40 box around the title and sub-line.
  - The 36px icon and the row's top and bottom padding are dead space, in a 64px row.
- Breaks: Fitts's law, and DESIGN "48px+ targets".
- Fix: in `src/components/owner-b/b-kit.tsx:103` (`.b-row__hit`), make the link `align-self: stretch` with `min-height: 64px` and include the lead icon, or extend it with a `::before` inset to the row edges minus the trailing button.

**OP-006 · Medium · The live tiles are an invalid definition list (axe: serious)**
- Images: `owner-home-390.jpg`; audit axe `definition-list` (1) and `dlitem` (6) on `owner-home-*`, `owner-requests-hub-*` and `owner-my-time-*`
- What's wrong: `BLive` renders `<dl><div><a><dt/><dd/></a></div></dl>` (`src/components/owner-b/b-kit.tsx:45–51`). An `<a>` between the `div` and the `dt`/`dd` is not allowed, so screen readers may not announce the label and value pairs.
- Breaks: WCAG 1.3.1.
- Fix: put the `<dl>` inside each link (`<a><dl><dt/><dd/></dl></a>`), or use `<ul>`/`<li>` with the link's existing `aria-label`, which already carries "Late: 0. Missed clock-ins".

**OP-007 · Medium · The bell badge doesn't match the spec and appears and disappears between visits**
- Images: `owner-home-390.jpg` (16px white-ringed circle with "3"), `owner-state-focus-home-3-390-state-focus-home-3-fold.jpg` (no badge), `owner-requests-hub-390.jpg` (no badge), `owner-no-such-page-390.jpg` (solid teal badge)
- What's wrong:
  - DESIGN says "unread is a coral dot", and `src/app/app/owner-b-shell.css:37–41` styles an 8px coral `#FF6B5E` dot, but the rendered badge is a numbered white-ringed circle. Another rule wins.
  - The badge is missing on first paint and appears later ("Notifications, checking updates" in the focus log), so the header shifts on every tab.
- Breaks: consistency with the spec, and Doherty (late-arriving chrome).
- Fix:
  - Find the competing rule; the corp or portal bell count is likely more specific.
  - Make the coral dot win.
  - Reserve its space so it fades in without moving anything.

**OP-008 · Low · The "Late" tile shows an amber dot when Late is 0**
- Images: `owner-home-390.jpg`
- What's wrong: amber means wait or check, but nothing is late.
- Breaks: semantic colour (C-rule "amber = wait/check").
- Fix: render the dot only when the value is greater than 0. In `home-b.tsx`, the `dot` prop on the Late item should be conditional.

**OP-009 · Low · The "This week" card has an unlabelled chart and cramped tiles at 320**
- Images: `owner-home-390.jpg`, `owner-home-320.jpg`
- What's wrong:
  - The seven bars carry no values, and Mon to Sun look almost equal in height, so the chart adds no information.
  - At 320 the coverage tiles wrap "No / positions / required" over three lines and "192 h of / 336 h" over two.
- Breaks: proximity and figure-ground; the chart is decoration.
- Fix:
  - Add the shift count above each bar in 11.5px grey (the data is already in the `aria-label` at home-b.tsx:168), or drop the chart.
  - At 359px and below, stack the coverage tiles 1-up with value and label on one line.

## Who's working, Hours this week, Activity: `/app?view=…`

**OP-010 · Low · "Time corrections" on Who's working is a closed accordion with no count**
- Images: `owner-view-attendance-390.jpg`
- What's wrong: the collapsed card has only a pale `#B5BBBF` caret (I4), so you can't tell whether anything is inside.
- Fix: show the count chip next to the title, as the "Clocked in 4" header does, and use the `#6A7176` caret (I4).

**OP-011 · Medium · Hours over or under target are not flagged**
- Images: `owner-view-team-390.jpg`
- What's wrong:
  - "56 h of 40 h · 16 h over" (James Ortiz) and "48 h of 40 h · 8 h over" use the same grey 13.5px line as "On target".
  - There is no chip, bar or colour. The mock's Time screen uses `.bar.amber` for this.
  - Overtime risk is the reason this view exists.
- Breaks: semantic colour (amber = check), and Miller's law (the user must read and compare 12 lines).
- Fix:
  - Add an amber "16 h over" chip beside the name when over target.
  - Add a grey "8 h under" chip when under.
  - Keep "On target" as plain text.

**OP-012 · Medium · Activity mixes future to-dos into a history and orders them above Today**
- Images: `owner-view-activity-390.jpg`
- What's wrong:
  - "Tue, Nov 10" coverage gaps sit above "Today · Mon, Nov 9".
  - Ten of the twelve rows are "Coverage gap" items, a to-do list, under a page called Activity, ending in "Show 33 more in Things to do".
  - Gap icons are neutral grey calendars, while the same gaps are amber on Home and Things to do.
- Breaks: Jakob's law (an activity feed is a reverse-chronological history), similarity, and status colour.
- Fix:
  - Show only events that have happened (published, approved, clocked).
  - Link once to Things to do for gaps.
  - If gaps stay, put them in a "Coming up" card under Today with the amber `BIcon tone="amber"`.

## Things to do: `/app/inbox`

**OP-013 · High · At 320, the clamped sub-line hides the schedule-conflict warning that explains "Review"**
- Images: `owner-inbox-320.jpg` (crop: James Ortiz, "Tue, Nov 10 · 1:00 PM – 5:00 PM..." with the amber line gone) vs `owner-inbox-390.jpg` (the same row shows "⚠ On the schedule: Tue, Nov 10 · 9:00 AM – 5:00 PM · Calle Loíza"); audit `clipped: span.b-row__s … clip 56` on `owner-inbox-320`
- What's wrong:
  - The conflict note (`.b-leave-note`, `inbox-b.tsx:98`) is inside `.b-row__s`.
  - At 359px and below, `src/components/owner-b/owner-b.css:302` clamps `.b-row__s` to two lines. The comment above it says "never cut to '…'", but it does cut.
  - The reason Approve became Review disappears, and the row looks like an ordinary request with a teal button that oddly doesn't approve.
- Breaks: truncation with no way back (an escalation trigger), and WCAG 1.4.10 reflow at 320.
- Fix:
  - Render the note as a sibling block of `.b-row__s`, outside the clamped element.
  - Or limit the clamp to the date span: `.b-row__s > :not(.b-leave-note)`.

**OP-014 · Medium · Button weight follows list position, not meaning**
- Images: `owner-inbox-390.jpg`, crop `inbox390-a.png`
- What's wrong:
  - In Open shifts, the first "Find cover" is solid teal and the next two are ghost (`inbox-b.tsx:84, 89`: `kind={index === 0 ? "teal" : "ghost"}`). Identical actions read as different states.
  - Three cards down, seven solid-teal Approve and Review buttons stack in a single card.
  - So the view has neither one primary nor a consistent rule.
- Breaks: similarity, and "one primary per view".
- Fix:
  - Give every row in a group the same kind: ghost "Find cover" and "Fill" in all rows, as the hero's actions carry the emphasis.
  - Keep Approve teal (DESIGN: "Approve is always the teal pill").

**OP-015 · Medium · Decline sends immediately, 8px from Approve, with no undo**
- Images: `owner-inbox-390.jpg` (seven Decline/Approve pairs)
- What's wrong:
  - Each pair is two 50%-wide pills 8px apart. Decline submits the form at once (`inbox-b.tsx:116–121`).
  - A mis-tap declines a person's time off with nothing to recover it on this screen.
- Breaks: Fitts's law (adjacent opposite actions), and the escalation rule for consequential actions.
- Fix: after Decline, show a 6-second "Time off declined · Undo" notice (`role="status"`, held while focused) before the request is committed, or open a one-line confirm sheet. Approve can stay one-tap.

**OP-016 · Medium · Loading, error and offline say the same sentence twice and drop the filter bar**
- Images: `owner-inbox-390-loading.jpg`, `owner-inbox-390-error.jpg`, `owner-inbox-390-offline.jpg`
- What's wrong:
  - The hero sub-line and the white card repeat the same words ("Checking what needs you…", "Things to do isn't available right now.").
  - The All, Shifts and Requests segment disappears, so the hero shrinks by 60px and the page jumps when data comes.
  - The error has no icon or colour.
- Breaks: redundancy, and continuity.
- Fix:
  - Keep the segment rendered but disabled.
  - Put the state only in the card, with an amber `WarningIcon` circle for error and a teal circle for offline.
  - Keep the hero sub as "16 things need you" or "—" (`inbox-b.tsx:60–62`).

**OP-017 · Low · "Can't work" rows use a teal clock icon**
- Images: crop `inbox390-b.png`
- What's wrong: a call-out is a wait-or-check event, but it gets the information tint (`inbox-b.tsx:105`, tone `teal` for `cant-work`).
- Fix: use `tone="amber"` for `cant-work`.

**OP-018 · Low · Each time-off row creates a form landmark (axe `landmark-unique`)**
- Images: audit `owner-inbox-*`
- What's wrong: `<form aria-label="Review time off for …">` (`inbox-b.tsx:100`) adds seven form landmarks, which clutters landmark navigation. The buttons are already named.
- Fix: remove the form's `aria-label`.

## Done and older: `/app/inbox?view=more`

**OP-019 · High · Work that needs the Owner is filed under "Done and older"**
- Images: `owner-inbox-view-more-390.jpg`; the entry row in `owner-inbox-390.jpg` says "Not counted in today's total"
- What's wrong:
  - The page lists "Time correction waiting for review" ×2, "Timecards to approve 18", "Plan ahead 47" and "Schedule not confirmed 10".
  - These are pending approvals that block payroll, behind a label that promises finished items.
  - An Owner scanning Things to do is told there are 16 items, while 18 timecards wait elsewhere.
- Breaks: information scent, Jakob's law ("done" means done), and Hick's law (the decision is hidden, not simplified).
- Fix:
  - Rename the page to "Later and older".
  - Move "Time corrections" and "Timecards to approve" into Things to do as their own groups, or count them in a separate "Time" filter.
  - Keep only decided items under "Done".

**OP-020 · Low · This page uses a different row recipe**
- Images: `owner-inbox-view-more-390.jpg`
- What's wrong:
  - Rows have no leading tinted icon or face, unlike every row on Things to do.
  - One title ends with a stray period ("Nov 2 – Nov 8.").
  - The footer "Some attendance comparisons are unavailable." offers no action.
- Fix: use `BRow` with the group icons used on Things to do, strip the period, and link the footer to Who's working.

## Schedule: `/app/schedule`

**OP-021 · High · The selected day shows no keyboard focus ring**
- Images: `owner-state-focus-schedule-8-390-state-focus-schedule-8.jpg` (no ring anywhere on the page); `_logs-owner.json` shows the 8th Tab stop is `button.b-week__d "Monday, Nov 9, today…"` with `outline: solid 2px rgb(255,255,255) offset -2px`
- What's wrong:
  - Inside the hero, focus is white (`src/components/owner-b/owner-b.css:29`).
  - The current day tile is white (`owner-b.css:235`), and the ring is inset, so it is white on white.
  - Keyboard users lose their place on the week strip.
- Breaks: WCAG 2.4.7 and 1.4.11 (an escalation trigger).
- Fix: add `.b-week__d:is([aria-current="date"],[aria-pressed="true"]):focus-visible { outline-color: #0B6E69; outline-offset: -3px; }`, or use offset `+2px` so the white ring sits on the glass.

**OP-022 · Medium · The hero pushes today's shifts below the fold**
- Images: `owner-schedule-320.jpg` (the hero ends at about y 505 of a 640 viewport, and no shift row shows above the tab bar), `owner-schedule-390-fold`/`owner-schedule-390.jpg` (two rows visible)
- What's wrong:
  - The location chip, week strip and the three "Covered this week" glass tiles fill about 80% of the first screen.
  - The tiles repeat Home's "This week" card.
- Breaks: Fitts and Doherty (the main task is a scroll away), and redundancy.
- Fix:
  - On phones, collapse "Covered this week" to one glass line ("Staffing 57% · 192 h of 336 h"), with Positions and Lead only when required.
  - Or move the tiles under the day's list.

**OP-023 · Medium · Every day has the same amber dot, with no legend**
- Images: `owner-schedule-390.jpg`, `owner-schedule-320.jpg`
- What's wrong:
  - `i.gap` `#FFC46B` (`owner-b.css:234`) marks open shifts on all seven days.
  - With no legend and every day marked, the dot means nothing visually; its meaning is only in the `aria-label`.
- Breaks: WCAG 1.4.1 (colour as the only visual cue), and Hick's law (seven identical signals).
- Fix:
  - Show the open count as a tiny amber number under the date ("3"), or a dot only when the day is under its staffing target.
  - Add a one-line legend inside the week card ("• open shifts").

**OP-024 · Medium · Open shifts and "Published" change colour from screen to screen**
- Images: `owner-schedule-390.jpg` ("Not filled", grey chip; "Published", green glass chip), `owner-schedule-publish-390.jpg` ("Published", grey chip), `owner-home-390.jpg` and `owner-inbox-390.jpg` (open shifts in amber calendar circles)
- What's wrong: an open shift today is amber on Home and Things to do but grey "Not filled" on Schedule. "Published" is green on the Schedule hero but grey on Build and publish (`src/app/app/schedule/publish/page.tsx:83`, `CorpPill tone="neutral"`).
- Breaks: similarity and status colour (amber = wait, green = done).
- Fix:
  - Open shift chip: amber "Open" while it can still be filled; grey "Not filled" only once the shift has ended (the roster's `observedAt` rule, `manager-weekly-roster.tsx:103`).
  - "Published": `tone="green"` in `publish/page.tsx:83`.

**OP-025 · Medium · Hero controls are below the 48px target**
- Images: audit `owner-schedule-390`/`-320`
- What's wrong:
  - Previous and next week are 36×36 at 390 and 32×36 at 320 (`owner-b.css:305`).
  - Day buttons are 38×62 at 320.
  - "All locations" is 151×36.
  - "More schedule actions" is 40×40.
- Breaks: Fitts's law, and DESIGN "48px+ targets". B1 covers tablet; this is the phone.
- Fix: add the kit's `::after { inset: -6px }` hit extension (`owner-b.css:84`) to `.b-week__arrow`, `.b-ib` and the glass location button, and drop the 32px override at :305.

## Build and publish: `/app/schedule/publish`

**OP-026 · High · The week label is hidden under the band**
- Images: `owner-schedule-publish-390.jpg`, `owner-schedule-publish-320.jpg` (only the lower half of "This week" shows at y≈104, under the teal sheet band)
- What's wrong:
  - `.c-publish__week` (`publish/page.tsx:96–99`) is a plain text line, but the sheet band is drawn 44px down as if a card came next (`src/app/app/owner-b-pages.css:100` with `:305`, `margin-top: 16px`).
  - DESIGN says the opposite: "a form's first label or a plain line never lands on teal".
  - The page's context, which week is being published, is clipped.
- Breaks: figure-ground and closure; text is clipped at 320 (an escalation trigger).
- Fix:
  - Exclude `.c-pub` from the 44px band run-on.
  - Or move "This week · Nov 9 – 15" into the band as the white sub-line under "Build and publish", as Edit shift does with "Published · Wed, Nov 25".

## Add shift, Edit shift: `/app/schedule/new`, `/app/schedule/edit`

**OP-027 · Low · Edit shift locks Location without saying why**
- Images: `owner-schedule-edit-shiftid-qa-scan-target-390.jpg`, `owner-state-schedule-shift-edit-390-state-schedule-shift-edit.png`
- What's wrong: Location is a grey, non-interactive field next to editable selects, with no lock icon or hint. Company profile does explain its locks ("Locked while you have shifts").
- Fix: add the same lock glyph and a 13.5px line: "To move a shift, delete it and add it at the other location."

The 36px sheet buttons are covered in OP-064.

## Week templates: `/app/schedule/templates`

**OP-028 · Medium · The only action looks disabled, and the empty state is a stray line**
- Images: `owner-schedule-templates-390.jpg`
- What's wrong:
  - "Save this week" is the grey quiet pill, the same colour family as disabled buttons elsewhere (B5), and the view has no other action.
  - "No saved weeks yet" is a grey caption floating on the canvas between the band and the card.
- Breaks: "one primary per view", and common region.
- Fix:
  - Make "Save this week" the teal pill.
  - Move the empty state into a card with a tinted icon and a sentence of purpose ("Save a week to reuse it with Build and publish").

## Timecards: `/app/timecards`, the timecard sheet, and Time corrections

**OP-029 · Medium · Rows with hours have no chevron, but they open like the rows that do**
- Images: `owner-timecards-390.jpg`
- What's wrong:
  - Daniel Cruz through Valeria Díaz show hours and a bar but no chevron. "No time yet" rows show one.
  - Both open the timecard sheet (`src/components/timecards.tsx:571`, `chevron={!hours}`).
- Breaks: similarity and affordance.
- Fix: show the chevron on every row (trailing after the value column), or on none.

**OP-030 · Medium · An open punch is drawn as a full green-teal success bar**
- Images: `owner-timecards-390-long-names.jpg` (Valeria Díaz, "Missing clock-out", 28 h 09, full teal bar), `owner-state-timecard-open-390-state-timecard-open.jpg` (113 h 19, full bar)
- What's wrong:
  - The bar has no scale, and when a clock-out is missing it fills completely in teal.
  - The mock defines `.bar.amber` for this case.
  - A figure that is plainly wrong looks like the best performer.
- Breaks: status colour and honest figures.
- Fix:
  - Rows with a blocking attention status use the amber bar (`#8A4B00` on `#FDF3E4`) and replace "Recorded" with "Open punch".
  - Label the bar's scale once in the card header ("of 40 h target").

**OP-031 · Low · "Recorded" repeats under every value**
- Images: `owner-timecards-390.jpg`
- What's wrong: the caption is repeated 7 times, although the hero tile already says Recorded. The mock places the status there instead ("On track").
- Fix: show the status (On track, Over, Ready to approve) under the value and drop "Recorded".

**OP-032 · Low · The timecard sheet uses its own type for times and a different note shape**
- Images: `owner-state-timecard-issue-390-state-timecard-issue-fold.png`, `owner-state-timecard-open-390-state-timecard-open.jpg`
- What's wrong:
  - The Days list sets AM and PM as small caps ("8:00 AM – 4:05 PM", `.c-ampm`). No other phone screen does.
  - The "Needs attention" note has a 12px radius instead of 22, and its only bullet repeats the header status ("Correction awaiting review").
- Fix:
  - Render AM and PM at full size with a U+202F narrow space, as everywhere else.
  - Give the note 22px corners.
  - Lead with the action ("Review Luis's correction before approving") rather than repeating the status.

**OP-033 · Medium · Time corrections makes the Owner find the difference themselves**
- Images: `owner-timecards-corrections-390.jpg`
- What's wrong:
  - Each request stacks three grey boxes: Recorded, Current effective and Proposed.
  - Recorded and Current effective are identical ("Nov 5, 6:00 AM → 2:06 PM" twice).
  - The actual change (2:06 PM → 2:41 PM, +35 min) is not highlighted.
  - "Times in Puerto Rico time", "No prior decisions…" and "Original recorded punches stay unchanged…" repeat on every card.
  - The employee's reason is plain 15px ink with no label.
- Breaks: Miller's law (comparing digits across boxes), and proximity.
- Fix:
  - Show one box: "Clock out 2:06 PM → **2:41 PM** (+35 min)" with the changed time in ink 600.
  - Show "Current effective" only when it differs from Recorded.
  - Label the reason "Reason" and give it a quote style.
  - Move the boilerplate to one line under the card header.

## Payroll: `/app/payroll` and its sub-pages

**OP-034 · Medium · Two Prepare actions compete, and the overdue one gets the weaker button**
- Images: `owner-payroll-390.jpg`, `owner-payroll-320.jpg`
- What's wrong:
  - The red alert "2 pay periods have no payroll" has a light-teal "Prepare" button.
  - The card below has the full-width teal "Prepare payroll" for the current period.
  - Payday also appears twice in the hero (the "Payday in 10 days" chip and the "Payday Nov 20" tile).
  - At 320 the alert's text column is squeezed to "Oldest is / Oct 26–Nov 1, / payday Fri, Nov 6".
- Breaks: Hick's law, "one primary per view", and redundancy.
- Fix:
  - Make the alert a row that links to Prepare payroll's "Periods with no payroll" (chevron, no button).
  - Keep the single teal primary.
  - Drop the hero chip, since the tile already says Nov 20 (see OP-002 for the count).

**OP-035 · Medium · Prepare payroll draws one action three ways on one page**
- Images: `owner-payroll-prepare-390.jpg`
- What's wrong:
  - "Prepare payroll" appears as a teal text link (Weekly payroll), as a full-width teal button (Oct 26–Nov 1) and as the text "Prepare" (Nov 2–8).
  - "Close" beside the open period is ambiguous: close the period, or collapse the row?
  - The helper paragraph starts 4px right of the card title (x 37 vs 33).
- Breaks: similarity, and alignment to shared edges.
- Fix:
  - One expanded period at a time, with the teal button inside it.
  - Collapsed periods show "Prepare" as a ghost pill.
  - Rename "Close" to "Hide".
  - Align the paragraph to the 18px text edge.

**OP-036 · Low · Payroll details repeats its period line**
- Images: `owner-payroll-review-run-…-390.jpg`
- What's wrong: "Oct 19–25 · Payday Fri, Oct 30" is in the hero sub-line and again as the section label right below it.
- Fix: remove the section label, or change it to "Totals".

**OP-037 · Low · Pay history draws its icons differently from Payroll, and the replaced run is unmarked**
- Images: `owner-payroll-history-390.jpg` vs `owner-payroll-390.jpg`
- What's wrong:
  - Receipt icons are bare grey here but sit in green-tinted circles on Payroll's "Recent payrolls".
  - The original Oct 19–25 run ($6,060.75) has no "Replaced" chip, though its pay statement says "Replaced by a correction".
- Fix: use the same `BIcon tone="green"`, and add a grey "Replaced" chip to the superseded run.

## Team: `/app/employees` and a person's page

**OP-038 · Medium · Filter chips are small, and the last one is cut off with no fade**
- Images: `owner-employees-390.jpg`, `owner-employees-320.jpg`; audit `targetsUnder44` (chips 61–100×32), `offscreen: "Off today4"` at 320
- What's wrong:
  - The chips are 32px tall.
  - At 390, "Off today 4" touches the card's right edge with no end padding.
  - At 320 it is cut to "Off to", with no fade to show the row scrolls.
- Breaks: Fitts's law, and the "hint at hidden content" rule.
- Fix:
  - Give `.b-filters button` (`owner-b.css:173`/`:278`) a `::after { inset: -6px 0 }` hit extension.
  - Add 18px end padding.
  - Add a 24px right `mask-image` fade when the row overflows.

**OP-039 · Medium · The person page uses off-pattern action buttons and shows an internal ID**
- Images: `owner-employees-qa-scan-a-390.jpg`
- What's wrong:
  - Call and Message are 40×40 rounded squares (`a.c-person__act`), not the kit's tinted circles, and below 48px.
  - The meta line shows "ID QA-SCAN-A", an internal identifier, in the most-read position.
  - Status (working or off) and the face's ring are missing, though Team shows both.
- Breaks: similarity, and Fitts's law.
- Fix:
  - Use 44px tinted circles (`BIcon` size 44) inside 48px targets.
  - Move the ID into "Access and sign-in".
  - Show the Team status chip next to the name in the hero.

## Time off requests and Shift requests: `/app/requests`, `/app/exchange`

**OP-040 · Medium · Shift requests uses smaller decision buttons and repeats a policy line**
- Images: `owner-exchange-390.jpg`, `owner-exchange-320.jpg`; audit `button.q-bs` 133×32 (390) and 98×32 (320)
- What's wrong:
  - Decline and Approve are 32px tall here but 44–48px on Things to do for the same kind of decision.
  - "Current workflow policy requires manager review." repeats under every row (5×). The copy audit covers the wording; this is the visual repetition.
  - The time-ago value ("7 min") is centred against the row instead of top-aligned with the name.
- Breaks: similarity, and Fitts's law.
- Fix:
  - Use the `.b-decide` pair from `inbox-b.tsx:115` (48px).
  - State the policy once in a note under the segment.
  - Top-align the trailing meta with the title (`align-self: start`).

**OP-041 · Medium · A right chevron is used to expand a row in place**
- Images: `owner-state-swap-open-390-state-swap-open.png`, `owner-state-callout-open-390-state-callout-open-fold.png`
- What's wrong:
  - Rows show "›", which elsewhere in the app means "opens a page".
  - On tap it rotates to "⌄" and expands inline with a grey header fill and 17px detail text.
  - A double divider shows at x≈180 where the row and action borders meet.
- Breaks: Jakob's law, and similarity.
- Fix:
  - Use a down caret (bold, `#6A7176`) for disclosure rows.
  - Set the expanded detail at 13.5–15.5px in the row's text column.
  - Use one inset divider.

**OP-042 · Low · The Approved list loses its affordances, and the request page splits into four cards**
- Images: `owner-requests-tab-approved-390.jpg`, `owner-requests-tab-pending-requestid-scan-leave-maria-390.jpg`
- What's wrong:
  - Approved rows have no chevron and no green chip. The attribution varies ("Approved by Jose Natal · Nov 9" vs "Approved · Nov 7").
  - The request page splits one decision into four separate cards: person and date, schedule link, "Also off that day", and Published shifts.
  - The 320 date range wraps "1:00 PM – / 5:00 PM" against the right-hand "1 h ago".
- Fix:
  - Approved rows get a green "Approved" chip and a chevron.
  - Merge "See that week's schedule" and "Also off that day" into the person card as rows (common region).

## Insights: `/app/reports`

**OP-043 · Medium · Hours over plan are shown as success**
- Images: `owner-reports-390.jpg`
- What's wrong:
  - "86 h 51 min of 48 h 30 min planned" draws a full teal bar.
  - "38 h 21 min over plan" is small grey text in the header.
  - Working 79% over plan is a check-this signal.
- Breaks: status colour (amber = check).
- Fix: when over plan, use the amber bar with the overage segment marked, and an amber chip "38 h over plan" in the header.

**OP-044 · Medium · Unknown values render as a 2.29:1 dash**
- Images: `owner-reports-390.jpg`, `owner-reports-320.jpg`; audit `lowContrastText: dd.c-stat__value--none "—" 2.29`
- What's wrong: "Late clock-ins —" and "Cover filled —" are the values in their tiles, at 2.29:1.
- Breaks: WCAG 1.4.3.
- Fix: colour `.c-stat__value--none` in `#6A7176` (4.96:1 on white), and keep `aria-label="Not available"`.

**OP-045 · Low · Odd range label and a nearly empty chart**
- Images: `owner-reports-390.jpg`
- What's wrong:
  - The range line reads "Nov 9 – 9 so far".
  - "Hours by day" is a single bar labelled "87" in an otherwise empty chart, while the card above says 86 h 51 min.
- Fix:
  - Write "Mon, Nov 9 so far" for a single day.
  - Hide the chart until two or more days have data, and use the same rounding as the card (OP-062).

## Updates: `/app/updates`

**OP-046 · Medium · "Needs reply · 1" is not marked on any row**
- Images: `owner-updates-390.jpg`
- What's wrong:
  - The segment promises one update needing a reply, but all three rows look the same.
  - The count is formatted "· 1" here and "Waiting 7" on other segmented controls.
- Fix: add an amber "Needs reply" chip to that row, and use the shared segment count style ("Needs reply 1").

**OP-047 · Medium · Update detail and Profile put their titles on the canvas, not the band**
- Images: `owner-updates-33f86b00-…-390.jpg`, `owner-state-update-detail-390-state-update-detail.png`, `owner-profile-390.jpg` (audit h1 24px/600), against every other page (h1 28/34 700 white on teal)
- What's wrong:
  - These two pages shrink the band to a back bar and set the title in ink: 26px on Update detail, 24/600 on Profile.
  - Moving between pages, the title jumps from the band to the canvas and changes size and weight.
- Breaks: continuity, and the DESIGN rule "page title 28/34 700 white under it".
- Fix: let these pages use the standard back-bar hero with the title in the band. Profile's avatar can sit in a glass circle beside it.

## Notifications: `/app/notifications`

**OP-048 · High · The default route showed a load error at both widths**
- Images: `owner-notifications-390.jpg`, `owner-notifications-320.jpg` (default captures, not the deliberate 503 state)
- What's wrong:
  - The plain route rendered "Couldn't load notifications · Check your connection, then try again." while online, with the bell claiming 3 unread.
  - The All/Unread segment's thumb turns a translucent grey-teal, so it looks broken rather than disabled.
  - The message blames the user's connection. The logs show the deliberate error state is a server 503, so "connection" is also wrong there.
- Breaks: honest status, and an error that names the wrong recovery.
- Fix:
  - Check the notifications read for the Owner. The cause is not verified here: it may be a harness timing issue, but both widths failed.
  - Say "Notifications didn't load. Try again." without blaming the connection unless `navigator.onLine` is false.
  - Keep the segment's white thumb and set `aria-disabled`.

## More, Profile, Help: `/app/more`, `/app/profile`, `/app/help`

**OP-049 · Medium · More hides key places behind the avatar and drops the row icons**
- Images: `owner-more-390.jpg`, `owner-more-390-fold.jpg`
- What's wrong:
  - Insights, Updates, My pay, Settings and Help live only behind the "JN" avatar. Its name is "More, Jose Natal", but the avatar looks like a profile button.
  - The rows have no tinted icons, unlike the tool rows on Team and Timecards.
  - "Sign out" is red: a phone instance of C13; red is reserved for stop and destructive.
- Breaks: navigation discoverability, Jakob's law (an avatar opens a profile), and similarity.
- Fix:
  - Give each More row its Phosphor bold icon in a tinted circle.
  - Make "Sign out" ink.
  - Add a small "More" caption or a dot menu affordance next to the avatar in the header, or link More from the Home hero.

**OP-050 · Medium · Help's expanded answer is larger than its question**
- Images: `owner-state-help-expanded-390-state-help-expanded.png`
- What's wrong: the question "I can't sign in" is 15.5px; the answer below it is 17px with a 17px underlined link. The header row also gets a grey fill.
- Breaks: visual hierarchy (the answer outranks its question).
- Fix: set answers at 15px/22px `#3F464B` in the row's text column, and keep the header row white with a down caret.

**OP-051 · Low · Profile's phone number reads oddly spaced**
- Images: `owner-profile-390.jpg`
- What's wrong: "555-0100" renders with wide gaps ("555 - 0100") from the tabular figures plus Inter's wide hyphen. T4 notes the same hyphen problem.
- Fix: exclude phone numbers from `tabular-nums`, or use a non-breaking hyphen (U+2011).

## Settings: `/app/settings` and its sub-pages

**OP-052 · Low · Setup gaps are grey text, and count headers come in three styles**
- Images: `owner-settings-390.jpg` ("Clocker tablets · 1 not set up" in grey, `src/app/app/settings/page.tsx:38`), `owner-settings-clocker-390.jpg` ("Tablets" with a chip, rows ordered "Calle Loíza · Not used yet" then "Not set up · Condado"), `owner-settings-locations-390.jpg` ("2 locations" as a bold title), `owner-settings-breaks-390.jpg` ("1 break type")
- Fix:
  - Show "1 not set up" as an amber chip.
  - Use one meta order (location · status).
  - Use one header pattern, "Title + count chip", as on Home.

**OP-053 · Medium · Punch photos shows sub-switches on while the main switch is off**
- Images: `owner-settings-clocker-photos-390.jpg`
- What's wrong:
  - "Take punch photos" is off and the feature "isn't available yet", but Clock in, Start break, End break and Clock out are all on, at full colour.
  - The state is unreadable: will photos be taken?
- Breaks: honest state, and Gestalt common region (the dependants don't look dependent).
- Fix: when the parent is off, render the children indented with `aria-disabled` and the disabled token pair (B5), or hide them until it is on.

**OP-054 · Medium · Clocker PINs has an unsorted list and a non-standard search position**
- Images: `owner-settings-clocker-pins-390.jpg`
- What's wrong:
  - The 12 people are listed in no visible order (Ana, Daniel, Valeria, Sofía, Jose, James, …), while Team sorts alphabetically.
  - The search field and the No PIN/PIN set segment sit on the canvas. On Team, search sits on glass in the hero.
- Breaks: Miller's law (scanning an unsorted list), and consistency.
- Fix: sort by name, and move search and segment into the hero as on Team.

**OP-055 · Medium · New location flags one of two empty required fields**
- Images: `owner-state-settings-location-invalid-390-state-settings-location-invalid.png`
- What's wrong:
  - After submitting an empty form, only "Short name" shows the red edge and message.
  - "Name" is also empty and isn't marked optional.
  - Add employee flags every empty field (`owner-state-employee-new-empty-…png`).
- Fix: validate Name too, or label it "(optional)". Focus the first invalid field.

**OP-056 · Low · Small Settings inconsistencies**
- Images: `owner-settings-features-390.jpg`, `owner-settings-branding-390.jpg`, `owner-settings-locations-390.jpg`, `owner-state-policies-expanded-390-state-policies-expanded.png`
- What's wrong:
  - **Features:** the locked switches (Time off, Shift swaps) are "on" in pale teal, so it is ambiguous whether they are on.
  - **Branding:** the preview's "Clock in on the Calle Loíza tablet" looks like a live teal button, with no "Preview" frame.
  - **Locations:** "Northside Bakery — Conda…" is truncated in the list (the full name is one tap away).
  - **Company policies:** the expanded "Labor settings" uses a different row recipe, with grey labels over ink values and dividers that stop 60px short of the card edge.
- Fix:
  - Draw locked-on switches in full teal with a lock glyph.
  - Wrap the branding preview in a dashed "Preview" frame and make it `inert`.
  - Allow two lines for location names.
  - Use the standard label-value row in expanded panels.

## Account: `/app/account/delete`, `/app/account-recovery`, `/app/clocker-recovery`

**OP-057 · Low · Two submit patterns on sibling recovery pages**
- Images: `owner-account-recovery-390.jpg` (a disabled "Issue recovery code"), `owner-clocker-recovery-390.jpg` ("Check code" enabled with an empty field), `owner-account-delete-390.jpg` (a disabled "Confirm deletion request")
- What's wrong:
  - Recovery code and account deletion disable their submit until valid. Clocker recovery validates on submit.
  - The disabled pills are near-invisible (`#F0F2F3` on the canvas) and give no reason.
- Breaks: consistency; better-accessibility prefers validating on submit.
- Fix:
  - Keep the buttons enabled and validate on submit with inline errors, as Add employee does.
  - Keep the deliberate safety toggle on deletion.

---

## Cross-screen patterns

**OP-058 · High · The same timecard backlog has five different counts**
- Images: `owner-home-390.jpg` ("11 timecards to review"), `owner-payroll-export-390.jpg` ("Approve 7 timecards first" and "12 not finalized"), `owner-inbox-view-more-390.jpg` ("Timecards to approve 18"), `owner-timecards-390.jpg` ("Approved 0/12", "Attention 4")
- What's wrong:
  - Each number may count a different scope (last week, this week, all open periods), but no label says which.
  - The Owner can't tell how much stands between them and payroll.
- Breaks: honest figures, and consistency.
- Fix:
  - Every count names its scope ("11 timecards from Nov 2–8").
  - Use one shared selector for "timecards to approve before payroll" on Home, Payroll, Time exports and Things to do.

**OP-059 · Medium · Error and empty states come in five shapes, none with colour or icon**
- Images:
  - `owner-home-390-error.jpg` / `owner-timecards-390-error.jpg`: big hero title "Current view needs a fresh check" and a grey full-width button.
  - `owner-inbox-390-error.jpg`: a card with a teal ghost "Try again".
  - `owner-notifications-390.jpg`: a title and sub with a grey "Try again".
  - `owner-payroll-people-390.jpg` / `owner-payroll-fix-390.jpg`: centred text with a grey pill "Go to Payroll".
  - `owner-employees-qa-scan-a-clocker-pin-390.jpg` and `owner-schedule-coverage-390.jpg`: a plain white note.
- What's wrong:
  - There is no error icon or amber or red cue anywhere.
  - The only recovery action is grey (secondary) in four of the five.
  - Text alignment varies: centred on Payroll People and Fix, left elsewhere.
  - The Home 503 says "needs a fresh check", which describes an access check rather than an unavailable source (DESIGN: say "couldn't load").
- Breaks: similarity, Jakob's law, and status colour.
- Fix:
  - One `BState` card: a 36px amber `WarningIcon` circle (red only for blocked access), a 16/22 600 title, a 13.5px line, and a **teal** recovery button.
  - Left-aligned.
  - Used by scoped-read-frame (`:186–189`), inbox-b (`:60–62`), the notifications page, the payroll "not available" state, the Clocker PIN state and the Schedule `?error=` note.

**OP-060 · Medium · The back label and the active tab disagree**
- Images:
  - `owner-view-team-390.jpg`: back "Team", Home tab active.
  - `owner-view-activity-390.jpg`: back "Schedule", Schedule tab active, while the URL is `/app?view=activity`.
  - `owner-reports-390.jpg`: back "More", Home tab active.
  - `owner-clocker-recovery-390.jpg`: back "Settings", **Team** tab active.
  - `owner-payroll-export-390.jpg`: reached from Time's footer row, but back "Payroll" and the Payroll tab light up.
- What's wrong: people lose their place, because the tab and the back label name two different parents.
- Breaks: Jakob's law and navigation clarity.
- Fix:
  - Derive both from one parent map in `src/lib/navigation.ts`. `MORE_FAMILY` at `:282` already lights Home for More pages.
  - Give Time exports, Activity, Hours this week and Clocker recovery the parent they are reached from.
  - Or make the back label always name the lit tab.

**OP-061 · Medium · A person's face tint changes from screen to screen**
- Images:
  - `owner-requests-390.jpg`, `owner-exchange-390.jpg`, `owner-availability-390.jpg`: every face is the same teal.
  - `owner-inbox-390.jpg`: James Ortiz is purple, Gabriela Santos peach.
  - `owner-profile-390.jpg`: JN teal.
  - `owner-more-390.jpg` / `owner-timecards-390.jpg`: JN peach.
- What's wrong: DESIGN (Nov 7) says "a person keeps one face tint on every screen". Quiet and corp lists render `.q-av` in a fixed teal: `src/components/manager-inbox.tsx:150`, `src/components/availability-team-list.tsx:56`, plus the Profile avatar.
- Breaks: similarity, and recognition over recall.
- Fix: replace `.q-av` initials with `BAvatar` (`b-kit.tsx:123`, `faceTint(name)`), or apply `faceTint` as inline style on `.q-av`.

**OP-062 · Medium · Hours use four formats for the same figure**
- Images:
  - `owner-home-390.jpg`: "436.5 h".
  - `owner-schedule-390.jpg`: "48.5 h".
  - `owner-view-team-390.jpg`: "42.5 h of 36 h · 6.5 h over".
  - `owner-timecards-390.jpg`: "86 h" in the hero, "20 h 32" in rows.
  - `owner-more-390.jpg`: "87 h this week".
  - `owner-reports-390.jpg`: "86 h 51 min" and a bar labelled "87".
- What's wrong:
  - DESIGN (Nov 7): "period totals are whole hours ('511 h') and rows '24 h 06'".
  - The decimals come from `hoursText` in `src/components/owner-b/home-b.tsx:50` (one decimal) and the team view.
  - The same week's recorded hours read 86, 87 or 86 h 51 min depending on the screen. The copy audit lists the duration styles; this adds the rendered conflict on one figure.
- Fix: one formatter in the kit:
  - Totals: `Math.round` + " h".
  - Rows and differences: "42 h 30".
  - Never one decimal.
  - Use it in home-b, the team view, the schedule header, Insights and More.

**OP-063 · Medium · Time ranges are compacted inconsistently and break in the wrong places**
- Images:
  - `owner-home-390.jpg`: "Next: today, 7:30–9 PM" above "12:00 PM – 8:00 PM".
  - `owner-home-390-long-names.jpg`: "11:30 PM / – 12 AM".
  - `owner-view-activity-390.jpg`: "midnight – 7:00 AM".
  - `owner-schedule-390.jpg`: "12–7 AM", "6–11:30 PM".
  - `owner-home-320.jpg`: "12:00 PM – / 8:00 PM".
  - crop `inbox320-a.png`: "12:00 PM – 8:00 / PM".
  - `owner-inbox-390.jpg`: the title "Today, 11:30 PM / – 12 AM" starts a line with a dash.
- What's wrong:
  - `compactRange` (`src/components/owner-b/b-kit.tsx:164–169`) drops ":00" and the shared AM/PM, and joins mixed ranges with ordinary spaces around the en dash, so lines break before the dash.
  - Other screens use full times, so adjacent rows disagree.
  - "12 AM", "midnight" and "12–7 AM" all appear for the same boundary.
- Fix:
  - One range formatter for every phone screen: full times, "midnight" for 00:00, ` – ` around the dash, and U+202F before AM/PM.
  - Add `white-space: nowrap` on the time span so a range wraps as a whole.

**OP-064 · Medium · Sheet actions, segmented controls and switches are under the 48px target**
- Images: audit `targetsUnder44` on every sheet and segment page:
  - Sheet pills: `button.c-shift__save "Save" 67×36` (Add and Edit shift), `button.q-nav__r--b "Save" 62×36` (Branding, Company profile, Location), "Add" 56×36, "Next" 60–65×36, `a.q-nav__r "Edit" 54×36` (Profile, person, update), "New update" 110×36.
  - Segmented controls: 36px on Things to do, Timecards, Requests, Shift requests, Notifications, Updates and Insights.
  - Switches: `input.q-tog`/`c-switch` 51×31.
- What's wrong:
  - DESIGN's floor is 48px+.
  - The sheet's Save sits in the top-right corner, the hardest reach for a right thumb on a 390×844 phone, so its small size compounds.
- Breaks: Fitts's law, and DESIGN "48px+ targets". These are phone instances of B1, which covers tablets.
- Fix:
  - Add the kit's hit extension (`::after { inset: -6px }`, as `owner-b.css:84`) to `.q-nav__r`, `.c-shift__save`, `.b-seg > *` and `.q-seg > *`.
  - Make each switch's `<label>` wrap the whole row so the 51×31 control sits in a 64px target. Not verified for every switch.

**OP-065 · Medium · The same status changes colour and shape between screens**
- Images and evidence: OP-002 (payday amber, green or grey), OP-024 (open shift amber or grey; "Published" green or grey), OP-052 ("not set up" grey text), OP-042 (approved time off with no chip), OP-011/OP-043 (over target or plan in grey or teal)
- Breaks: similarity, and the status rule (red stop, amber wait or check, green done, teal information).
- Fix:
  - Add a status-to-chip table in the kit (`BChip tone` by status key).
  - Use it in corp and Quiet pills (`CorpPill`) too.
  - Grey only for neutral facts.

**OP-066 · Medium · How far cards lift over the band, and how tall the band is, varies by page**
- Images:
  - `owner-schedule-new-390.jpg`: band 92px, card lifted 28px.
  - `owner-employees-new-390.jpg`: band 108, lifted 28.
  - `owner-employees-qa-scan-a-clocker-pin-390.jpg`: band 112.
  - `owner-updates-compose-390.jpg`: the card starts 32px *below* the band.
  - `owner-schedule-publish-390.jpg`: text clipped under it (OP-026).
  - `owner-settings-locations-loc-1-390.jpg`: the card starts 32px below.
  - `owner-settings-workspace-390.jpg`: 16px below.
- What's wrong: DESIGN says forms are "one lifted white card" and "the teal runs 44px under the hero only when a card or list comes next". New update and Location edit start with a card but don't lift.
- Breaks: continuity between sibling forms, and alignment.
- Fix:
  - One sheet-band height (92px).
  - One lift (the band runs 44px under, and the card overlaps 28px) for every page whose first child is a card.
  - Apply it through the existing `owner-b-pages.css:100/158` selectors, adding `.q-page:has(> .q-nav + .q-card)`.

**OP-067 · Medium · Grey secondary lines measure 4.30:1 across Quiet and corp rows**
- Images: audit `lowContrastText` and `contrast` at 4.30 (threshold 4.5) on:
  - Requests: date lines, "6 min ago".
  - Shift requests: 30 nodes.
  - Activity, Who's working ("In since…") and Hours this week ("40 h of 40 h…").
  - Profile ("Not added", "Puerto Rico", the notification lines).
  - Settings values ("2", "1"), Branding "None", Breaks "30 min".
  - Clocker PINs (4.15 on segment counts), Payroll history, Time exports and Scheduling rules (30 nodes).
- What's wrong:
  - These are 13.5–15px row meta lines on white cards. C5 covers grey on tinted fills; these are on white, so they are additional instances.
  - The exact rendered pair is not verified here. The declared greys `#6A7176` and `#6B7075` give 4.96–5.0:1 on white, so a lighter cascade winner (Quiet's `--q-grey` or an opacity) is likely.
- Breaks: WCAG 1.4.3.
- Fix:
  - Find the winning colour in a browser.
  - Point `.q-rt i`, `.q-rv`, `.c-row__value--soft` and `.c-row__detail` at `#6A7176` under `[data-nv-b]`. C7's token aliasing would fix this at the source.

**OP-068 · Low · Rows follow two recipes**
- Images: `owner-more-390.jpg`, `owner-settings-390.jpg`, `owner-help-390.jpg` and `owner-inbox-view-more-390.jpg` (no leading icons) vs `owner-employees-390.jpg`, `owner-timecards-390.jpg` and `owner-inbox-390.jpg` (tinted-circle icons). Also chevrons present or absent on tappable rows (OP-029, OP-042).
- Breaks: similarity. DESIGN: "Phosphor bold icons in tinted circles".
- Fix: navigation rows in More, Settings and Help get a 36px tinted icon, and every tappable row ends in a chevron.

**Known findings seen again.** These are referenced only, with no new ID:
- **Tab-bar label contrast:** 3.68:1 on every page (C3, audit axe `color-contrast`).
- **Hero date pill:** glass, looks tappable (B6).
- **Band sub-lines and glass chips:** below AA (C1, C2), e.g. "Payday in 10 days" and "Published".
- **Field edges:** faint (C6) on Add shift and Add employee.
- **Expand caret:** too pale (I4) on Who's working and Help.
- **Copy:** jargon in Shift requests, Photo review and Payroll "replaced by a newer revision" (copy-audit "Owner" and "Manager" rows).

---

## Verification

**Run (images and audit data):**
- Viewed every distinct owner-phone route at 390, every state-runner image, and 320 for ten routes. Cropped and zoomed long pages (Things to do, Time exports, Insights).
- Read all 136 `.audit.json` files through a summary script: tap targets, text under 12px, low contrast, clip, overlap and axe.
- Cross-checked the focus order in `_logs-owner.json`.
- Compared against the DESIGN.MD Direction B sections and the phone mock (filters, Time rows, `.bar.amber`).
- Located causes in code where possible.

**Not verified:**
- Menus and popovers. The scan recorded "no menu trigger visible", although Schedule has "More schedule actions"; that menu and the location picker were never opened.
- Landscape. The 844×390 capture was dropped by the collector.
- Reduced motion and real hover on phones.
- The exact colour pair behind the 4.30:1 lines (OP-067).
- Whether switch labels wrap whole rows (OP-064).
- Why the default Notifications route failed (OP-048).
- Whether the five timecard counts are different scopes or a bug (OP-058).
- The Timecards "Attention 4" vs visible chips: rows were hidden under the fixed tab bar in full-page captures.
- Full-page captures place the fixed tab bar mid-page; this is not reported as a defect.

## Tally

**68 findings: High 8 · Medium 42 · Low 18.**
- **High (8):** OP-001, 002, 013, 019, 021, 026, 048, 058.
- **Medium (42):** OP-003, 004, 005, 006, 007, 011, 012, 014, 015, 016, 022, 023, 024, 025, 028, 029, 030, 033, 034, 035, 038, 039, 040, 041, 043, 044, 046, 047, 049, 050, 053, 054, 055, 059, 060, 061, 062, 063, 064, 065, 066, 067.
- **Low (18):** OP-008, 009, 010, 017, 018, 020, 027, 031, 032, 036, 037, 042, 045, 051, 052, 056, 057, 068.

## Top 10 for Owner on phones

1. **OP-001 · Offline wipes the page.** Keep the loaded content under a paused notice (scoped-read-frame.tsx:178–189); the toast already promises it.
2. **OP-002 · Payroll uses the UTC date** (payroll-runs.tsx:90). Payday reads 10 vs 11 days and history is dated tomorrow after 8 PM.
3. **OP-058 · Five timecard counts** (11, 7, 12, 18, 0/12). Each count should name its scope and come from one selector.
4. **OP-013 · At 320, the conflict warning is clamped away** (owner-b.css:302). The reason Approve became Review vanishes.
5. **OP-021 · No visible focus on the selected Schedule day** (white inset ring on a white tile, owner-b.css:29/235).
6. **OP-026 · Build and publish's week label is clipped under the band** (owner-b-pages.css:100/305).
7. **OP-019 · Pending approvals are filed under "Done and older."** Move time corrections and timecards into Things to do.
8. **OP-048 · Notifications failed on its default route at both widths**, and blames the connection.
9. **OP-059 · One error-state component.** Amber icon, teal recovery button, left-aligned, replacing five ad-hoc variants.
10. **OP-064 · Phone tap targets.** Hit-extend the 36px sheet pills, segments and week arrows, and make switch rows 64px labels.
