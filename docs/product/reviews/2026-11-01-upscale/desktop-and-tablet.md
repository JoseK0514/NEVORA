# NEVORA desktop and tablet: make-it-better list (Owner and Employee), Nov 1

Reviewer: UI Designer. This is a critique only. No app files were changed and nothing was submitted.
Skills used, in order: tastemaker, design-critique, ui-ux-pro-max, 21st-ui (search only). References came from Mobbin (web).

Shots folder (SHOTS): `scratchpad/review-desktop/shots/`
Earlier 1440 shots (UI): `scratchpad/review-ui/shots/`
Geometry dumps: `.../review-desktop/geo-O.json` and `geo-E.json`, with the content edges, h1 position, header heights and overflow for every page at every width.

## Brief and verdict
I read this as a corporate-light workforce admin (Owner) and self-service (Employee) on desktop and tablet. The register should be calm and certain, and the stakes are medium to high (pay and hours). Because these are convention-governed admin surfaces, the ceiling is a confident Coherent, with character carried by type and numbers.

At 1440 the product is close to Coherent: one typeface, a quiet palette, a real focus ring, 120ms hover transitions and a disciplined teal. It drops a rung outside 1440:
- **Tablet** gets the phone layout inside desktop chrome. At 820 the content column is 476px, and the Owner week grid disappears below 1280.
- **The collapsed sidebar** is visibly broken.
- **1920** leaves the content floating 348px away from the navigation.
- **The Employee side** still carries four pill hues that the Owner side already removed.

Craft score:
- Spacing: holds, with three row heights too many.
- Type: holds.
- Colour: holds on Owner and fails on Employee (blue and amber pills).
- Alignment: fails in four places (section-label edge, Schedule toolbar, Employee Home caption, collapsed rail).
- Density: right at 1440, wrong at 820/1024 (too sparse) and at 1920 (adrift).

What to protect:
- One teal action per screen.
- The 2px teal focus ring (`O-1280-focus-schedule.png`).
- The tabular "8 h 2 min" figures with quiet units.
- The today column tint on the grid.

---

## Quick wins (S)

### S1. The ⌘K highlight swallows the group heading (Owner, all widths)
- **What's off:** The first option is an `LI role=option` 70px tall that contains the "Actions" heading, so the teal selection block wraps the heading too. Typed results show the same thing ("People" plus Marco Silva). Matched characters are not emphasised.
- **Shots:** UI `F-chromium-1440-O-search.png`, SHOTS `O-1920-search-typed.png`
- **Lens:** CR-402 one strong edge / affordance (selection must equal one target).
- **Reference:**
  - Linear and Raycast command menus: group headings are non-selectable rows.
  - [Stripe search](https://mobbin.com/screens/eade1912-e11c-4d70-9556-1527dbd9837c)
- **Fix:**
  - Render group headings as `role="presentation"` siblings outside the options: 13/18 500 #6B7075, 28px tall, 12px left padding.
  - Options are 40px with radius 8, inset 8px from the palette edge, selected #E6F1EF with ink text (not teal text).
  - Bold the matched substring (600).
- **Size:** S

### S2. Section labels sit on two different edges in two styles (Owner and Employee)
- **What's off:** Settings, Payroll, Things to do and Team labels are 13/500 #6B7075 at x356 (16px in from the card edge, 16px right of the title at x340). Company policies labels are 13/600 #4A4F54 at x340. Employee labels are at x362 against a card at x346.
- **Shots:**
  - UI `O-chromium-1440-home_settings.png`
  - SHOTS `O-1280x800-home_settings_company_policies.png`
  - UI `O-chromium-1440-home_payroll.png`
- **Lens:** CR-402 one strong edge; Rule 2 (one type scale); Rule 5.
- **Reference:**
  - [Stripe customer page](https://mobbin.com/screens/fb0b91ce-234b-44d5-9f8b-18864cc63941): section headings sit on the content edge.
  - [Gusto Home](https://mobbin.com/screens/f80f8026-7437-46f3-8970-5f4b2aabe0dc)
- **Fix:**
  - Use one `SectionLabel`: 13/18 500 #6B7075, left edge equal to the card edge (inset 0), 8px above the card, 32px above the label from the previous group.
  - Counts in the label stay the same colour ("Open shifts · 3").
  - Title, labels and cards then share one left edge.
- **Size:** S

### S3. Five row heights (Owner and Employee)
- **What's off:**
  - Measured rows: 48 (Employee Availability), 52 (Settings, Things to do one-line), 54 (Profile language), 56 (two-line), 76 (Home "Open all day" with the Find cover button).
  - Things to do mixes 52 and 56 inside one card.
  - Home's Today card has one 64–76 row with a filled button followed by two 56 rows with chevrons.
- **Shots:** UI `O-chromium-1440-home.png`, UI `E-chromium-1440-home_availability.png`, UI `O-chromium-1440-home_inbox.png`
- **Lens:** Rule 5 (equal sizes); CR-001.
- **Reference:** Linear lists (one row height per density), Gusto People.
- **Fix:**
  - Rows are 52 for one line and 60 for two lines (16px vertical padding plus 20+18 line boxes); Availability goes from 48 to 52.
  - On Home, make the three open-shift rows identical (56/60 with chevron).
  - Move the single "Find cover" primary into the Today card header's right slot, replacing "Who's working". That link becomes the tappable "On shift now" stat (already agreed in R6).
- **Size:** S

### S4. Employee pills: four hues where Owner now has none
- **What's off:**
  - "Tomorrow" is teal #E6F1EF/#0B6E69.
  - "Payday Tue, Nov 3" and "Correction" are blue #EAF0FD/#1D4ED8. Blue is not in the NEVORA palette at all.
  - "Waiting" is amber #FEF4E6/#8A4B00.
  - "Off the clock", "In progress" and "Replaced" are grey #EDEEEF.
  - Requests says "waiting" four times: the subtitle, the section label "Waiting", and two pills.
- **Shots:**
  - UI `E-chromium-1440-home_my_pay.png`
  - UI `E-chromium-1440-home_requests_hub.png`
  - UI `E-chromium-1440-home.png`
  - UI `E-chromium-1440-home_my_time.png`
- **Lens:** Rule 7 (calm), CR-203 (one reserved accent), the Oct 23 "no status pills" rule, TS-010 (edit, don't list).
- **Reference:** NEVORA's own R3 on Owner; [Stripe customers table](https://mobbin.com/screens/eade1912-e11c-4d70-9556-1527dbd9837c) shows status as plain text.
- **Fix:**
  - Apply R3 to Employee. Default states become 13/18 500 #6B7075 text with no fill.
  - Drop "Payday Tue, Nov 3" (the card body already says "Payday in 2 days"; make that "Payday Tue, Nov 3 · in 2 days").
  - Drop the "Waiting" pills (the section is "Waiting for approval · 2").
  - "Correction" becomes grey detail text. "Tomorrow" moves into the header text ("Next shift · Tomorrow").
  - Remove the blue tokens.
- **Size:** S

### S5. Schedule toolbar split across two baselines (Owner, ≥1024)
- **What's off:** The "…" overflow (32px) sits on the title line at y148. The "All locations" select (40px) sits on the subtitle line at y172–212. Right-side controls end at different heights from the grid card edge.
- **Shots:** UI `O-chromium-1440-home_schedule.png`, SHOTS `O-1280-focus-schedule.png`
- **Lens:** CR-402; Rule 5.
- **Reference:**
  - [Square Scheduling](https://mobbin.com/screens/66ea4b9b-7284-4f6a-bc5f-cb0860a34724): one toolbar row.
  - [Gusto Pay](https://mobbin.com/screens/f74caf21-298d-44dc-af95-bd86acc044db): actions in the title row.
- **Fix:**
  - One right-aligned group vertically centred on the 34px title line box: [All locations ▾] (40px) then [⋯] as a 40×40 icon button with an 8px gap.
  - The subtitle stays under the title alone.
  - Same rule on Insights (period and Export) and Employee Schedule (Availability).
- **Size:** S

### S6. The held Lead role shows on the Owner grid and the shift form (Owner)
- **What's off:** Priya Lal's five chips carry an unlabeled seal glyph whose only label is a hidden "· Lead". Edit shift shows a "Shift lead" toggle whose help text reads "Owners, Managers and Leads can lead a shift". The Lead role is on hold.
- **Shots:** UI `O-chromium-1440-home_schedule.png` (Priya row), UI `F-chromium-1440-O-shift-open.png`
- **Lens:** Rule 6 (purpose); Rule 1 (icons only in navigation); product constant (Lead on hold).
- **Reference:** R14 already removed "lead" from Find cover copy.
- **Fix:**
  - Hide the chip glyph and the toggle while Lead is held (presentation flag; the data stays).
  - If a shift-lead concept is kept later, show it as text in the shift panel ("Leads this shift"), never as an icon inside a 28px chip.
- **Size:** S

### S7. Avatar menu is sized like a phone sheet (Owner, Employee)
- **What's off:** The menu is 318px wide with 56px rows, labels at 13/600, no identity header and nothing to separate destinations.
- **Shot:** SHOTS `O-1280-avatar.png`
- **Lens:** Rule 2; Jakob's law (desktop menus are dense); Apple-smooth.
- **Reference:**
  - Stripe and Linear account menus.
  - 21st.dev "User Menu" (kuratlielia, identity header) and "Account Menu" (ruixen.ui): inspiration only.
- **Fix:**
  - 240px wide, radius 12, the panel shadow token (0 0 0 1px rgba(16,24,32,.06), 0 8px 24px -4px rgba(16,24,32,.14)).
  - Header block: name 15/20 600 plus "Owner · Isla Verde Cafés" 13/18 #6B7075, 12px padding.
  - 1px #EDEEEF divider, then 36px rows at 15/20 400 ink with hover #F2F4F4, then a divider and "Sign out" last.
  - Opens with a 140ms fade and 4px drop (none under reduced motion).
- **Size:** S

### S8. Clickable rows barely answer the pointer (Owner)
- **What's off:**
  - Timecards `TR` hover is #F7F8F8 with `cursor:auto`, although the row opens a panel.
  - On white rows #F7F8F8 is about 1.03:1, which reads as no hover.
  - Payroll rows use the same colour with a pointer cursor.
- **Shots:** SHOTS `O-1280-hover-tc-row.png`, `O-1280-hover-payroll-row.png`
- **Lens:** Affordance / Apple-smooth.
- **Reference:** [Stripe tables](https://mobbin.com/screens/eade1912-e11c-4d70-9556-1527dbd9837c), [Attio rows](https://mobbin.com/screens/306fe83c-adad-40fd-97f7-e605d02a019f).
- **Fix:** One `--row-hover: #F2F4F4` for every clickable row and table row, `cursor:pointer`, keep the 120ms ease-out, and add a pressed state of #EDEEEF.
- **Size:** S

### S9. Title-block drift between pages (Owner; refines "title offset")
- **What's off:**
  - h1 is at y131 on every Owner page. The subtitle is at y181 on Home and Timecards, y189 on Insights and y192 on Schedule.
  - Employee Requests h1 is at y145 against y143 elsewhere (a 44px button raises the row).
- **Shots:** UI `O-chromium-1440-home_reports.png`, `O-chromium-1440-home_schedule.png`, `E-chromium-1440-home_requests_hub.png`
- **Lens:** CR-402; Rule 3.
- **Reference:** Gusto and Stripe title rows have a fixed height.
- **Fix:** Title row has a fixed 40px height (34px line box centred), actions centred in it, subtitle always 4px below the row, first block always 24px below the subtitle (or 24px below the title row when there is no subtitle).
- **Size:** S

### S10. Person header icon buttons are a different size from Edit (Owner)
- **What's off:** Call and Message are 44×44 outlined icon buttons; Edit in the title row is 40px.
- **Shot:** UI `F-chromium-1440-O-person.png`
- **Lens:** Rule 5.
- **Fix:** 40×40 icon buttons with radius 8 and a 20px Phosphor glyph, 8px gap, right-aligned to the card's 16px inset.
- **Size:** S

### S11. Employee Home "Next shift" card uses three alignments
- **What's off:** Text sits left. "View shift" is a 156×40 secondary button on the right, on its own row. The grey caption "Clock in on the Condado tablet." is centred under it. At 1920 the card is 992 wide with all content in the left 300px.
- **Shots:** UI `E-chromium-1440-home.png`, SHOTS `E-1920x1080-home.png`
- **Lens:** CR-402; TS-003 (one thing).
- **Reference:** [Gusto Home task card](https://mobbin.com/screens/f80f8026-7437-46f3-8970-5f4b2aabe0dc): text left, action right, one row.
- **Fix:**
  - Time (20/26 600), then "Mon, Nov 2 · Barista · Condado", then "Clock in on the Condado tablet." (13/18 #6B7075), all left-aligned.
  - "View shift" is vertically centred on the right of that block, so the card has one row and no centred text.
- **Size:** S

### S12. Employee shift panel details (refines today's swap-panel fix)
- **What's off:** "8 h" sits alone on a third line at 13px, the teal "Tomorrow" pill sits beside the time, and details float on the grey panel while the Owner timecard panel puts details in a white card.
- **Shots:** SHOTS `E-820-shift-panel.png`, UI `F-chromium-1440-E-shift.png`
- **Lens:** TS-006 (single voice), Rule 7.
- **Fix:**
  - Header "Tomorrow, Nov 2".
  - A white detail card: "8:00 AM – 4:00 PM" 20/26 600, then "Barista · Condado · 8 h".
  - The action card (Swap, Offer for cover, I can't work this shift) follows with the same 12px gap the Owner panel uses.
- **Size:** S

### S13. An empty state with a button (Employee Schedule)
- **What's off:** "No open shifts right now" carries a "View" secondary button.
- **Shot:** UI `E-chromium-1440-home_schedule_week_2026_11_02.png`
- **Lens:** Rule 6.
- **Fix:** Make it a row: "Open shifts" with the detail "None right now. New ones show here when a teammate offers a shift" and a chevron, or hide it when there are none.
- **Size:** S

### S14. Things to do: a section label in the middle of a card, and duplicate destinations (Owner)
- **What's off:** The Time off card (2 items) continues with a "More requests" label row inside the same card. Below it, "Time off requests" duplicates the group above, followed by "Shift requests" and "Older items", with rows at 52 and 56.
- **Shot:** UI `O-chromium-1440-home_inbox.png`
- **Lens:** Common region; TS-010; Rule 5.
- **Fix:**
  - End the Time off card after its rows and put "See all" in its header.
  - Use a separate "More" section label above its own card with "Shift requests" and "Older items" (52px each).
- **Size:** S

### S15. Timecards "You can approve from Mon, Nov 2" card (Owner)
- **What's off:** A 70px card whose only content is a 20/600 sentence. The same sentence repeats centred under the side panel and on Home's Payday row.
- **Shots:** UI `O-chromium-1440-home_timecards.png`, `F-chromium-1440-O-timecard.png`
- **Lens:** Rule 6, TS-003.
- **Reference:** [Toggl approvals](https://mobbin.com/screens/3cdf9b29-d80c-44c5-a44a-f21c7d726360): Approve lives in the header and appears only when possible.
- **Fix:**
  - While the week can't be approved, fold the line into the subtitle: "Oct 26 – Nov 1 · 9 people · Approval opens Mon, Nov 2". Remove the card and the panel caption.
  - The card returns only when actionable, as a 64px bar with "9 timecards ready" and the page's one primary, "Approve timecards".
- **Size:** S

### S16. Employee single-column pages run at 992 (Employee)
- **What's off:** Profile, Pay, Requests, Availability and Time use the 992 frame, so on Profile "Name" sits at x362 and its value ends at x1322. Owner single-column pages use 720 (A7).
- **Shots:** UI `E-chromium-1440-home_profile.png`, SHOTS `E-1920x1080-home_my_pay.png`
- **Lens:** Readable measure; Rule 5 (shared widths across roles).
- **Reference:** [Stripe details](https://mobbin.com/screens/e8f9d27d-7f88-472c-a70e-811faf24228a): label/value pairs in a ~500px column.
- **Fix:** Employee Home, Time, Pay, Requests, Availability and Profile use the 720 column. Schedule keeps 992 for the week view (M7).
- **Size:** S

---

## Polish (M)

### M1. The collapsed sidebar rail is broken (Owner and Employee, every width)
- **What's off:**
  - The wordmark SVG (128px, x−17) is clipped to "EVOR / WORKFORC".
  - Owner primary links are 79px wide in an 80px rail (x12→91), so the active pill and the "6" badge are cut off.
  - Owner primary icons sit at x42 while the "More" icons sit at x30 (rail centre 40), a 12px zig-zag. Employee icons are correctly centred.
  - The expand button is off-centre (x25, w44).
  - The workspace switcher disappears, leaving an 80px empty gap above Home.
  - There is no tooltip on hover.
- **Shots:** SHOTS `Q-1280-rail-2x.png` (Owner), `A-1280-rail-2x.png` (Employee), `O-1280-collapsed-schedule.png`, `Q-1280-rail-hover.png`
- **Lens:** Rule 5, Rule 8, brand rule (real wordmark, never cropped).
- **Reference:**
  - Linear, Notion and Stripe collapsed rails.
  - 21st.dev "Sidebar" (wensity) and "Animated Sidebar" (starc007): icon rail with badges and tooltips, inspiration only.
- **Fix:**
  - Rail 72px. Items are 40×40 centred (x16), icon 20px, active pill 40×40 radius 8, badge as a 16px dot-count at the item's top-right inside the 40px box.
  - Workspace becomes its 32px initials avatar.
  - Tooltip on hover and focus after 300ms: 13/18 white on #1A1C1E, radius 6, 8px right of the rail.
  - Hide the wordmark in rail mode and show only the expand control in the 64px header cell. The wordmark returns on expand and is never cropped or replaced by a made-up mark (needs Jose's OK under the logo rule).
  - Width animates 200ms with the kit curve; instant under reduced motion.
- **Size:** M

### M2. Tablets get the phone layout inside desktop chrome (Owner and Employee, 820 and 1024)
- **What's off:**
  - At iPad portrait 820 the full 232/212px sidebar stays, so content is 476 (Owner) or 496 (Employee).
  - Owner Home shows one open shift instead of three, and 60% of the screen is empty below.
  - At 1024 the Owner content is 680.
- **Shots:** SHOTS `O-820x1180-home.png`, `O-820x1180-home_schedule.png`, `E-820x1180-home_schedule_week_2026_11_02.png`, `O-1024x768-home.png`
- **Lens:** Responsive layout; Rule 8; CR-501 (density right for context).
- **Reference:** Gusto, Linear and Notion collapse the sidebar on narrow windows; Homebase and 7shifts tablet apps use the full width.
- **Fix:**
  - Between 768 and 1279 the sidebar defaults to the M1 rail and the user's choice persists.
  - Content becomes 820−72−2×32 = 684, then 888 at 1024 and 1044 at 1180.
  - The 2-up Home row (Payday and Things to do) stacks only below 760 of content, not by viewport.
- **Size:** M (after M1)

### M3. No week grid below 1280 (Owner Schedule at 1024 and iPad landscape 1180)
- **What's off:** At 1180 the content is 836 (and would be 1044 with the rail), yet the Owner gets the phone day view with day bubbles. Grid columns are fixed: 220 for names and 110 per day.
- **Shots:** SHOTS `O-1180x820-home_schedule.png`, `O-1024x768-home_schedule.png`
- **Lens:** Jakob's law (owners plan the week on an iPad at the counter); TS-011 fit.
- **Reference:** [Square Scheduling week grid](https://mobbin.com/screens/66ea4b9b-7284-4f6a-bc5f-cb0860a34724), 7shifts and Homebase iPad landscape.
- **Fix:**
  - Show the grid whenever content is at least 760.
  - Name column `minmax(168px, 220px)` (32 avatar, name 15/20, hours 13/18) and day columns `minmax(84px, 1fr)`.
  - Chip 28px tall: "6a–12:30p" at 13/600 needs about 72px.
  - Below 760, keep the day view.
- **Size:** M

### M4. Four period controls for one idea (Owner and Employee)
- **What's off:**
  - Owner Schedule: "‹ Oct 26 – Nov 1 ›" on the left of the grid card, with no Today.
  - Employee Schedule: "Nov 2 – 8" left, with "Today ‹ ›" on the right.
  - Timecards: a 480px segmented "This week / Last week / Earlier" with equal segments, plus underline status tabs beneath it (two tab styles stacked).
  - Insights: a "This week so far" dropdown.
- **Shots:** UI `O-chromium-1440-home_timecards.png`, `O-chromium-1440-home_schedule.png`, `E-chromium-1440-home_schedule_week_2026_11_02.png`, `O-chromium-1440-home_reports.png`
- **Lens:** TS-006 single voice; Jakob's law.
- **Reference:** [Square Timecards](https://mobbin.com/screens/db67dd90-e64c-4989-b7d3-f6dd06a0d8bb) and Scheduling, [Klaviyo calendar](https://mobbin.com/screens/6b3dd16e-7760-46c9-9f32-6d6852777fa0) (Today ‹ ›).
- **Fix:**
  - One `PeriodStepper` in the card toolbar, left: [‹][›] as 32×32 icon buttons, the range label at 15/20 600 tabular, then a quiet "This week" text button that appears only when off the current week (which also fixes the found "Go to this week" issue).
  - "Earlier" becomes a date popover from the label.
  - Timecards keeps only the underline status filters. Insights uses the same stepper, with the range picker in the label.
- **Size:** M

### M5. Side panel is modal on desktop (Owner Timecards)
- **What's off:** The 420px panel uses a 24% scrim (rgba(16,24,32,.24)) over the whole app. Moving to the next person takes Done, then a click, then waiting. At 1920 the panel sits 900px away from the row it describes.
- **Shots:** SHOTS `O-1920-timecard-panel.png`, `O-1024-timecard-panel.png`, `O-820-timecard-panel.png`
- **Lens:** Fitts/flow; Apple-smooth; TS-012 (direct manipulation).
- **Reference:** [Gusto status side panel](https://mobbin.com/screens/f72cbe2e-7ac1-4df5-8b9f-de3401a3dc14), [Linear right pane](https://mobbin.com/screens/fb06f720-0dcd-423f-bba9-83b54701bc4c).
- **Fix:**
  - At ≥1024, make the panel a non-modal inspector: no scrim, the table stays live.
  - The selected row gets #E6F1EF with a 2px teal left bar. ↑/↓ step through people, Esc closes, and focus returns to the row.
  - Keep R8's header (centred title plus Done). Keep the modal scrim below 1024.
- **Size:** M

### M6. Wide screens: content floats away from the navigation (Owner and Employee, 1920)
- **What's off:**
  - At 1920 the 992 frame is centred, so content starts 348px from the sidebar.
  - 720-wide pages are pinned to the frame's left edge, leaving 348 on the left and 620 on the right.
  - Schedule day columns stay 110 while 348px sits empty on each side.
- **Shots:** SHOTS `O-1920x1080-home.png`, `O-1920x1080-home_payroll.png`, `O-1920x1080-home_schedule.png`, `E-1920x1080-home.png`
- **Lens:** CR-402 (one strong edge); TS-007; "empty space at wide widths".
- **Reference:** [Stripe](https://mobbin.com/screens/eade1912-e11c-4d70-9556-1527dbd9837c) and [Gusto](https://mobbin.com/screens/f80f8026-7437-46f3-8970-5f4b2aabe0dc) anchor content to the navigation.
- **Fix:**
  - Anchor the frame to the sidebar: padding-left 56 below 1600 and 72 at or above 1600, keeping the 992 and 720 max widths. The left edge then never moves between pages and the spare width becomes right margin.
  - At ≥1600, Schedule and Timecards may grow to 1240, so day columns become about 140.
- **Size:** M (one layout rule, but every page needs re-checking)

### M7. Employee week shown twice on desktop (Employee Schedule)
- **What's off:** A strip of teal-tinted day circles marks which days have shifts, and a list below repeats the same four shifts. At 1440 the strip is 992 wide with no times in it.
- **Shots:** UI `E-chromium-1440-home_schedule_week_2026_11_02.png`, SHOTS `E-1920x1080-home_schedule_week_2026_11_02.png`
- **Lens:** TS-010; Rule 6.
- **Reference:** [Square week grid](https://mobbin.com/screens/66ea4b9b-7284-4f6a-bc5f-cb0860a34724), Homebase employee web schedule.
- **Fix:**
  - At content ≥ 760, show a 7-column week: day label 13/18 #6B7075 and date 15/20 600, a shift chip (time 13/600, place 13/400) per day, and today's column tinted as on the Owner grid. Clicking a day opens the shift panel. The list is dropped.
  - Below 760, keep the strip and list.
  - The Confirm row and the "What changed" disclosure stay above the week.
- **Size:** M

### M8. Schedule grid finish (Owner)
- **What's off:** No per-day totals. The chip radius is 6 against 8 for controls. The "6 people · 151 h" header cell is the only total.
- **Shots:** UI `O-chromium-1440-home_schedule.png`, SHOTS `O-1280-hover-chip.png`
- **Lens:** Rule 5; "signature numbers" (R2).
- **Reference:** [Square Scheduling](https://mobbin.com/screens/66ea4b9b-7284-4f6a-bc5f-cb0860a34724) puts hours per day in a footer row.
- **Fix:**
  - Day header shows "Mon 26" with "24 h" under it (13/18 #6B7075, tabular).
  - Chip radius 8.
  - The hover tint already exists; add a 1px #D9DCDE inset ring on focus-visible inside the grid (the teal ring is currently clipped by the cell).
- **Size:** M

---

## Bigger but worth it (L)

### L1. One desktop inspector for every detail (Owner)
- **What's off:**
  - Clicking a shift chip leaves the grid for a full-page centred "Edit shift" card.
  - Requests and people open new pages.
  - Only Timecards uses a panel. The Owner keeps losing the context they were deciding in.
- **Shots:** UI `F-chromium-1440-O-shift-open.png`, `F-chromium-1440-O-request.png`, `F-chromium-1440-O-person.png`
- **Lens:** TS-006, TS-012; Jakob's law.
- **Reference:**
  - [Gusto side panel](https://mobbin.com/screens/f72cbe2e-7ac1-4df5-8b9f-de3401a3dc14)
  - [Linear project pane](https://mobbin.com/screens/e6e7369e-f46a-47f3-9434-e481de972f90)
  - [incident.io schedule](https://mobbin.com/screens/1c34a494-6e07-4906-828f-b98d1f345142)
  - Square, Homebase and Deputy all edit shifts in a popover or drawer over the grid.
- **Fix:**
  - At ≥1024, shift edit, request detail and the person summary open in the same 420px non-modal inspector as Timecards (M5), with the source item highlighted.
  - Footer: Cancel (secondary) and Save changes (primary) on the right. Delete is quiet red text on the left.
  - Decisions (Approve or Decline) stay inside the panel, never in the list (rule kept).
  - Deep links still open the full page.
- **Size:** L

### L2. List and detail for Things to do and Team at ≥1280 (Owner)
- **What's off:** Both are 720 lists that push to a page, then Back. At 1440 there is 380px of empty canvas beside them.
- **Shots:** UI `O-chromium-1440-home_inbox.png`, `O-chromium-1440-home_employees.png`
- **Lens:** Empty space with purpose; TS-003.
- **Reference:** Linear Inbox, [Attio people with side pane](https://mobbin.com/screens/306fe83c-adad-40fd-97f7-e605d02a019f), Gusto People.
- **Fix:**
  - A 400px list on the left inside the 992 frame and the selected item on the right (560), sharing L1's inspector content.
  - Below 1280, fall back to push navigation.
  - Still one primary per screen, in the detail.
- **Size:** L

---

## The 10 changes that would most raise the premium feel on desktop

1. **Fix the collapsed rail (M1).** It is the only visibly broken thing a careful owner will find, and the logo itself is cropped.
2. **Use the rail and the week grid on tablets (M2 and M3).** iPad owners get a real admin layout instead of a phone layout in a frame.
3. **Make the timecard panel a non-modal inspector with ↑/↓ (M5).** It is the single biggest "feels like Linear or Gusto" upgrade.
4. **Clean up Employee colour (S4).** Remove blue and amber and say each state once.
5. **Anchor the wide-screen frame to the navigation (M6).** Every page then shares one left edge at 1920.
6. **Use one period control everywhere (M4).**
7. **Align section labels on one edge in one style (S2), with equal row heights (S3).**
8. **Fix the ⌘K selection and add match bolding (S1).** Power users judge the product here.
9. **Clean up the Schedule toolbar row and remove the Lead mark (S5 and S6).**
10. **Edit shifts in the inspector instead of a separate page (L1).**

## Checks run
- Chromium only, one browser at a time, fictional preview at localhost:59738 with the saved QAOWNER and AR0142 sessions. No logins and no submits.
- Viewports:
  - 1024×768, 1280×800, 1920×1080, plus 820×1180 and 1180×820 with touch enabled.
  - 11 Owner and 7 Employee pages at each viewport, with full-page shots and a geometry dump.
- Flows:
  - Timecard panel at 820, 1024 and 1920; Employee shift panel at 820 and 1180.
  - ⌘K typed search at 1920; avatar menu at 1280; collapsed rail at 1280 (2x).
  - Hover on rows, table rows, sidebar, primary button and grid chip; keyboard focus on the Schedule toolbar.
- Computed styles: pill colours, panel backdrop and shadow, row heights, section-label positions and fonts, chip size and radius, hover colours and transitions.

## Gaps
- **Not tested:**
  - WebKit/iPad Safari (tablet was Chromium with touch).
  - Dark mode and reduced motion in this pass.
  - Loading, error and empty states at tablet widths.
  - Anything after a submit.
  - The Employee "+" menu (it would not open from its 20×25 hit area; already logged as the "+" control).
  - Bell popovers (the Owner bell navigates to /app/notifications).
- **Next.js dev overlay:** a "1 Issue" badge showed on Schedule at 820 and 1024 and on Edit shift at 1440. I could not read its text from the shadow root, so it is unreviewed.
- **Possible bug to confirm against 9553e728:** in the Owner day view (820, 1024, 1180) the 12:00–8:00 AM open shift still offers "Find cover" at 3:13 PM. The preview mirror may predate today's "past open shifts say Not filled" fix.

Masking caveat: this judges craft and visual polish, not whether flows work end to end or whether each feature is the right one to build.
