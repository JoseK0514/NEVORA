# NEVORA every-inch review: Lead (phone and desktop) and the native app screens

## Scope and method

**What I covered**
- **Lead:** all 124 images in `/tmp/review/lead/`. That is 34 routes at 390, 320 and 1440, plus Home and Schedule at 1280. It includes the Home, Time and Time off loading, error and offline states at 390 and 1440, and the long-names variants of Home and Schedule.
- **Native app:** all 65 images in `/tmp/review/native-app/`.
  - The Employee app screens.
  - Nine Alerts states, each at 390, 900 and 1440.
  - The Owner screens and the Device settings popover, plain and with focus.
  - The Manager "Use NEVORA in your web browser" page, which a Lead also sees.

**How I worked**
- I viewed every distinct route and state at its main width and spot-checked the second width.
- Numbers come from each image's `.audit.json` (probe, audit.js and axe) and from the manifest's Lead Tab-order data (`data`, state `keyboard-order`).
- Code causes were located by grep and are cited as `file:line`.

**Judged against**
- DESIGN.MD "Current direction" and Direction B. The relevant parts are "Employee phones: Direction B" and "Direction B for the remaining surfaces": Lead, the final round, and "Phone app screens and the Owner device popover (Nov 9)".
- I did not propose a different brand.

**Not repeated (owned by other audits)**
- **From `code-design-system.md`:** band text alpha (C1), glass chips (C2), tab-label grey (C3), the red Owner bell (C11), the red Sign out (C13), pill radii (S1/S4), press scale (B2), disabled looks (B5), regular-weight shell icons (I1), the tabular hyphen (T4) and the !important ladder (L1).
- **From `copy-audit.md`:** "See all" opening Notifications (E3), "Shift lead"/"Designated lead" naming, "planning" wording, "Write"/"Message today's team" verbs, and the "Alerts"/"Alerts on this device" title mismatch.

Where a screen here shows a new instance of one of those items, I name the original ID and add only what is new.

**Severity**
- **High:** blocks or confuses a task, or fails accessibility. This includes the better-interface escalation triggers.
- **Medium:** a visible inconsistency or friction.
- **Low:** polish.

---

## /app (Lead Home)

### LN-001 · Medium · The "On shift now" content is shown twice and takes the whole first screen
- **Images:**
  - `/tmp/review/lead/lead-home-390-fold.jpg`
  - `/tmp/review/lead/lead-home-390.jpg`
  - `/tmp/review/lead/lead-home-1440.jpg`
  - `/tmp/review/lead/lead-home-320.jpg`
- **What:**
  - The hero's first glass figure reads "On shift now / 12–11:30 PM / Shift lead · Customer Support".
  - Directly under it, the first card has the same title, "On shift now", and the same range in a different format: "12:00 PM – 11:30 PM".
  - The card then repeats "Until 11:30 PM" as a chip, a "Shift lead" chip, and the sentence "You're the shift lead today". The Lead is told they lead three times in 250px.
  - At 390 the first screen ends at Today's team, so none of the 7 to-dos is visible. At 320 the first screen is only the hero and the shift card.
- **Breaks:**
  - Redundant information.
  - Gestalt similarity: two identical headings read as two different things.
  - Miller's law: the same facts take up the reader's working memory twice.
  - Visual hierarchy: the most actionable content, Things to do, is pushed below the fold.
- **Fix:**
  - Keep the approved hero figure.
  - In the card, when `now && lead`, keep only the chip and drop the sentence, by gating `eb-leadline`'s text on `!now` (`src/components/employee-b/home-b.tsx:121`).
  - Retitle the card "Your shift" so it doesn't echo the figure (`home-b.tsx:116`).
  - Drop the "Until …" chip when the hero already shows the end time (`home-b.tsx:117`).
  - This needs Jose's sign-off, because the sentence is in the Nov 8 Lead spec.

### LN-002 · Medium · Today's team (a Lead extra) sits above Things to do on phones
- **Images:**
  - `/tmp/review/lead/lead-home-390.jpg`
  - `/tmp/review/lead/lead-home-320.jpg`
- **What:**
  - The phone order is shift card, publication note, **Today's team**, Things to do (7, with deadlines), Coming up.
  - A self-started, optional action (messaging the team) outranks items that carry "Respond by" deadlines.
  - On desktop the team card is in the right column, so it doesn't compete there.
- **Breaks:**
  - Order by importance.
  - Hick's law: an optional choice is added before the required ones.
  - The DESIGN Lead brief: extras "live where they belong" as small additions to the Employee screens.
- **Fix:** render `TeamCard` after Things to do on phones (`home-b.tsx:197`). Desktop keeps it in grid column 2 through `employee-b-desktop.css:406`, which is unaffected because grid placement is explicit.

### LN-003 · Medium · "Message today's team" has three entry points on desktop and two adjacent ones on phone
- **Images:**
  - `/tmp/review/lead/lead-home-1440.jpg`
  - `/tmp/review/lead/lead-home-1280.jpg`
  - `/tmp/review/lead/lead-home-390.jpg`
- **What:**
  - **Desktop:** the band's white "Message today's team", the Today's team row (a link to `/app/updates/compose`) and the row's "Write" ghost button, which goes to the same address. That is three links to one destination within 400px.
  - **Phone:** the row (probe: `b-row__hit` 248×40, under 44) and "Write" (64×36) are two Tab stops for one action. The Tab-order data for /app at 1440 confirms both stops.
  - **Icons:** the action uses the same megaphone (`MegaphoneSimpleIcon`) as *reading* an update. The same megaphone is on the "Read the team update" row, the Updates sidebar item and Notifications. Writing and reading look identical.
- **Breaks:**
  - Redundancy.
  - Fitts's law: a 40px hit area next to a 36px one.
  - Gestalt similarity: compose and read share one icon.
  - Consistency: Updates uses a pencil for the same compose action (see LN-026).
- **Fix:**
  - On desktop, keep the band button and make the card informational. Remove `href` and `trail` from the `BRow` at `home-b.tsx:101-102` when the band button is shown, or drop the card on desktop.
  - On phone, make the row the only link: remove the `trail` "Write" button so the row ends in a chevron. Alternatively keep "Write" and make the row non-interactive.
  - Use `PencilSimpleIcon` bold for compose everywhere (`home-b.tsx:101,190`).

### LN-004 · Medium · Things to do mixes two row types, and the desktop list breaks its separator
- **Images:**
  - `/tmp/review/lead/lead-home-1440.jpg`
  - `/tmp/review/lead/lead-home-1280.jpg`
- **What:**
  - Rows 1–3 are chevron rows: Review swap request, Review coverage offer ×2.
  - Rows 4–5 have filled teal "Review" pills: "Read the team update" and "Confirm this week's schedule". That puts two filled primaries in one card, beside the band's white primary.
  - "Read the team update" carries a "Review" button, so the label doesn't match the row.
  - Rows 4–5 are a second `<ul>`. The divider between the lists runs full card width (x 296–895) while every other divider is inset (319–872).
- **Breaks:**
  - Consistency within one component.
  - One primary action per view.
  - Gestalt continuity: the broken separator reads as a section break that isn't there.
- **Fix:**
  - Render all five rows in one list. Merge `home-b.tsx:216` into the `BList` at `:205` and hide rows 4–5 on phones with `eb-desk` on the `<li>`.
  - Give required rows an amber "Due" or "Needs you" chip instead of a filled pill (amber = wait or check), and keep the chevron (`home-b.tsx:185`).

### LN-005 · Low · Desktop grid leaves a ~130px hole under Today's team
- **Images:**
  - `/tmp/review/lead/lead-home-1440.jpg`
  - `/tmp/review/lead/lead-home-1280.jpg`
- **What:** Today's team ends at y≈493. Row 1 of the grid is as tall as the shift card (ends 623), so Coming up starts at 643. The right column shows a band of empty canvas.
- **Breaks:** Gestalt proximity and common region. The gap separates Today's team from the rest of its column.
- **Fix:** let the right column flow on its own. Place team and upcoming in one wrapper column, or give `#b-home-team` `grid-row: 1 / span 1; align-self: start` and start `#b-home-upcoming` at row 1 with `margin-top` instead of row 2 (`src/app/app/employee-b-desktop.css:405-407`).

### LN-006 · Low · The publication note floats away from the schedule it qualifies
- **Images:**
  - `/tmp/review/lead/lead-home-390.jpg`
  - `/tmp/review/lead/lead-home-1440.jpg`
- **What:**
  - "West Office hasn't published this week yet. Shifts shown are published." sits between the shift card and Today's team on phone.
  - On desktop it sits under Things to do, in the left column, while the shifts it qualifies (Coming up) are in the right column.
- **Breaks:** Gestalt proximity and common region.
- **Fix:** render it as an `eb-cardnote` footer inside the Coming up card (`home-b.tsx:196`, and move the desktop grid rule `employee-b-desktop.css:408`).

### LN-007 · High · Offline says "Showing what was loaded", but Home has wiped what was loaded
- **Images:**
  - `/tmp/review/lead/lead-home-390-offline.jpg`
  - `/tmp/review/lead/lead-home-1440-offline.jpg`
  - Same pattern: `/tmp/review/lead/lead-my-time-390-offline.jpg` and `/tmp/review/lead/lead-requests-390-offline.jpg`
- **What:**
  - The capture goes offline *after* loading.
  - The shell's dark pill says "You're offline. Showing what was loaded." (`src/components/app-shell.tsx:494`).
  - The page shows nothing that was loaded: one "Next shift" card ("You're offline. Your shift updates when you reconnect."), no figures, no to-dos, no Coming up. The eyebrow flips from "Main Office" to the workspace name and the title from "Welcome back, James" to "Home".
  - On desktop the pill sits on the band and pushes the content 12px down.
- **Breaks:**
  - The escalation trigger "misleads the user".
  - Jakob's law: offline apps keep the last view.
- **Fix:**
  - The data clearing is the X-Nevora-Failure contract, so change the words rather than the behaviour.
  - Make the shell pill state-neutral: "You're offline. Reconnect to see the latest." (`app-shell.tsx:494`).
  - Alternatively, let pages that clear their data say so in their own card, and show the pill only where cached content is actually kept.
  - Keep the title and eyebrow stable: render `name` and `place` from the session, not from the snapshot (`home-b.tsx:190`).

### LN-008 · Medium · Loading and error collapse Home into a mislabelled single card
- **Images:**
  - `/tmp/review/lead/lead-home-390-loading.jpg`
  - `/tmp/review/lead/lead-home-390-error.jpg`
  - `/tmp/review/lead/lead-home-1440-loading.jpg`
  - `/tmp/review/lead/lead-home-1440-error.jpg`
- **What:**
  - While loading, the screen is one card, "Next shift / Loading your shift…", with no skeleton for the 4–5 cards that will appear. The title and figures then pop in, which is a large layout shift.
  - The error state reads "Couldn't load Home." under the heading **"Next shift"**.
  - The Lead's Today's team, which needs no data beyond the team flag, also disappears.
- **Breaks:**
  - Doherty threshold: no structural feedback.
  - The heading and its content disagree.
  - Aesthetic-usability: the shell looks broken.
- **Fix:**
  - Loading: render the card frames (shift, Things to do, Coming up) with grey placeholder rows of the final height.
  - Error: one card titled "Home couldn't load" with the approved empty-state icon and Try again.
  - Keep `TeamCard` outside the `snapshot ?` branch when `team` is set (`home-b.tsx:193-224`).

### LN-009 · Low · Desktop focus order zig-zags between the columns
- **Image:** `/tmp/review/lead/lead-home-1440.jpg`, with the manifest data (/app, lead, 1440, keyboard-order).
- **What:**
  - DOM order is shift → team → to-dos → upcoming.
  - On screen that is left, right, left, right. Tab goes from "Shift details" (x 611, y 570) up to the team row (792, 379), then back down to Things to do.
- **Breaks:** WCAG 2.4.3, focus order. It is still understandable, so this is a recommendation.
- **Fix:** with LN-005's column wrapper, the DOM can follow the columns: the left column (shift, to-dos), then the right (team, upcoming).

---

## /app/schedule (Lead)

### LN-010 · High · The Lead's "Shift lead" chip (and "Now") on today's week block fails AA
- **Images:**
  - `/tmp/review/lead/lead-schedule-1440.jpg`
  - `/tmp/review/lead/lead-schedule-1280.jpg`
  - `/tmp/review/lead/lead-schedule-1440-long-names.jpg`
- **What:**
  - The probe measures `span.eb-wsh__lead-l` "Shift lead" at **4.18:1** and `.b-chip--teal` "Now" at 4.18:1, both 12px/600.
  - The chips are white on `rgb(255 255 255 / .18)` over `#0B6E69`. I computed the composite as `rgb(55 136 132)`.
  - This is the Lead's only marker on the shift they are working right now. It is a new instance of C2 (glass chip), here outside the hero.
- **Breaks:** WCAG 1.4.3.
- **Fix:** on the now block use a solid white chip with teal ink: `background:#FFFFFF; color:#0B6E69` gives 6.1:1 (`src/app/app/employee-b-desktop.css:129`).

### LN-011 · Medium · Coming up drops "Shift lead" on today's and tomorrow's shifts
- **Images:**
  - `/tmp/review/lead/lead-schedule-390.jpg`
  - `/tmp/review/lead/lead-schedule-320.jpg`
  - `/tmp/review/lead/lead-schedule-1440.jpg`
- **What:**
  - Mon 9 (which Home calls "You're the shift lead today") shows only "Now". Tue 10 shows only "Tomorrow".
  - Wed–Sun show "Shift lead".
  - Home's Coming up shows "Shift lead" on Tue 10, so the same shift is marked on Home and unmarked on Schedule.
  - The reason is that the row has one chip slot and Now, Starts in and Tomorrow win (`src/components/employee-schedule-corp.tsx:134`).
- **Breaks:**
  - Consistency.
  - The Lead marker disappears exactly where it matters most, on the next 24 hours.
- **Fix:** move "Shift lead" into the sub-line ("Shift lead · Customer Support · Main Office") so it never competes with the time chip, or allow a second chip at ≥390px (`employee-schedule-corp.tsx:134`, `home-b.tsx:153`).

### LN-012 · Medium · Week-card chips: an invisible "Tomorrow" chip and ragged block heights
- **Images:**
  - `/tmp/review/lead/lead-schedule-1440.jpg`
  - `/tmp/review/lead/lead-schedule-1280.jpg`
- **What:**
  - On Tue 10, "Tomorrow" is a teal chip (`#E8F3F1` fill) on a block filled with the same `#E8F3F1`. The pill shape vanishes, so it reads as loose teal text next to the visible grey "Shift lead" chip.
  - The Mon and Tue blocks stack two chips on two lines and are ~130px tall. The other five are ~102px.
  - Inside one card there are three time formats: "12–11:30 PM", "9 AM – 5 PM", and "9:00 AM – 5:00 PM" in Coming up.
- **Breaks:**
  - Chip consistency.
  - Gestalt similarity and alignment: the row is ragged.
- **Fix:**
  - Inside `.eb-wsh` give chips a white fill (`background:#FFFFFF`).
  - Wrap the status and lead chips in one `flex-wrap` row with a 4px gap so all blocks keep one height (`employee-b-desktop.css:128`).

### LN-013 · Low · Repeated markers and repeated totals
- **Images:**
  - `/tmp/review/lead/lead-schedule-1440.jpg`
  - `/tmp/review/lead/lead-schedule-390.jpg`
- **What:**
  - Seven identical "Shift lead" chips appear when every shift is a lead shift, so the marker no longer distinguishes anything.
  - The desktop week card footer repeats the band sub-line "7 shifts · 59.5 h".
- **Breaks:** redundancy and signal-to-noise.
- **Fix:**
  - When every shift in the week is led, show one line in the card header ("You lead all 7 shifts") and keep only the today block's chip.
  - Drop "7 shifts · 59.5 h ·" from the footer.
  - The first change needs Jose's sign-off, because the chip is specified per block.

---

## /app/my-time (Lead)

### LN-014 · Medium · The state cards use a disabled button as a spinner, have no heading, and resize the band
- **Images:**
  - `/tmp/review/lead/lead-my-time-390-loading.jpg`
  - `/tmp/review/lead/lead-my-time-390-error.jpg`
  - `/tmp/review/lead/lead-my-time-390-offline.jpg`
  - `/tmp/review/lead/lead-my-time-1440-loading.jpg`
  - Same component: `/tmp/review/lead/lead-exchange-tab-foryou-1440.jpg` (detail pane)
- **What:**
  - **Loading:** a full-width grey "Checking…" pill (a disabled `BButton`). It looks like a broken button, not progress.
  - **Offline:** a disabled "Try again".
  - **Headings:** neither card has a heading or icon, while Home's state card has "Next shift". That makes three state-card structures across Home, Time and Time off.
  - **Band:** the band loses its sub-line ("Mon, Nov 9 · Main Office") while loading, so the band is 28px shorter and jumps when data lands.
- **Breaks:**
  - Doherty threshold.
  - Affordance: a disabled button signals "not allowed", not "wait".
  - Consistency: DESIGN calls for "one empty state" (48px grey icon, title, line).
- **Fix:**
  - One state card: the approved 48px grey icon, a title ("Loading your time" / "Your time couldn't load"), a line, and an action only when one is possible.
  - Loading uses skeleton rows, not a button.
  - Remove the `disabled` path in `BStateCard` (`src/components/employee-b/requests-b.tsx:44-51`) and in Home's card (`home-b.tsx:221`).
  - Keep the band sub-line from session data (`time-b.tsx:58`).

---

## /app/requests/hub (and /app/inbox, which renders the same screen)

### LN-015 · Medium · The Waiting figure double-counts the swap that needs your answer
- **Images:**
  - `/tmp/review/lead/lead-requests-hub-1440.jpg`
  - `/tmp/review/lead/lead-requests-hub-390.jpg`
  - `/tmp/review/lead/lead-inbox-390.jpg`
- **What:**
  - The band shows "Waiting **6** · on your manager or a teammate" and "Needs your answer **1** · a swap from a teammate".
  - The Waiting card's six rows include that same swap, so only five things wait on others.
  - The cause is `value: waiting.length + extraCount` (`src/components/employee-b/requests-b.tsx:94`, and the card count at `:106`).
- **Breaks:**
  - Accuracy of figures.
  - Miller's law: the reader has to reconcile 6 + 1 against six rows.
- **Fix:** use `waiting.length` for the Waiting figure and pill. Show the swap row in its own "Needs your answer" group, or keep it in the card but don't count it twice.

### LN-016 · Medium · The swap that needs your answer is the least emphasised row
- **Image:** `/tmp/review/lead/lead-requests-hub-1440.jpg`
- **What:**
  - "A teammate requested a swap" has a teal icon but no chip.
  - The rows under it, which only wait on others, carry amber "Needs approval", "With teammate" and "Waiting" chips.
  - It is a separate `<BList>` (`requests-b.tsx:126`), so its divider and the next one run full width (x 296–940), while the lower dividers are inset (319–918).
- **Breaks:**
  - Visual hierarchy: the one item that needs the Lead is the quietest.
  - Gestalt continuity: inconsistent separators.
- **Fix:** add `chip={<BChip tone="amber">Needs your answer</BChip>}` (the wording For you already uses) and render the row inside the same list so it shares the inset divider (`requests-b.tsx:122-127`).

---

## /app/requests (Time off)

### LN-017 · Medium · Waiting time off is not in date order
- **Images:**
  - `/tmp/review/lead/lead-requests-390.jpg`
  - `/tmp/review/lead/lead-requests-1440.jpg`
  - `/tmp/review/lead/lead-requests-hub-390.jpg`
- **What:** the order is Nov 26, Nov 30 – Dec 2, Nov 10. The soonest request is last.
- **Breaks:** scanability and Jakob's law: date lists ascend.
- **Fix:** sort waiting requests by start date ascending, and decided ones by decision date descending, before rendering (`src/components/employee-b/timeoff-b.tsx` list, around :90–100; the hub list in `requests-b.tsx`).

### LN-018 · Medium · "Request time off" changes place, and disappears in the loading, error and offline states
- **Images:**
  - `/tmp/review/lead/lead-requests-390.jpg`
  - `/tmp/review/lead/lead-requests-1440.jpg`
  - `/tmp/review/lead/lead-requests-hub-390.jpg`
  - `/tmp/review/lead/lead-requests-390-loading.jpg`
  - `/tmp/review/lead/lead-requests-390-error.jpg`
  - `/tmp/review/lead/lead-requests-390-offline.jpg`
- **What:**
  - On the phone Time off page, the action is a teal text row at the foot of the list card.
  - On the Requests hub (phone) and on desktop, it is the band's white pill.
  - In the three state captures the row is gone, so a Lead can't start a request while the list fails, even though the form doesn't depend on the list.
- **Breaks:**
  - Consistency of the primary action's position.
  - The escalation trigger "an error that names no way to recover", partly: the main task is blocked.
- **Fix:** render the white band pill on the phone Time off page as well, outside the list read (`timeoff-b.tsx`; the state card at `:114`).

### LN-019 · Medium · The list promises "withdraw", but the request page offers none
- **Images:**
  - `/tmp/review/lead/lead-requests-390.jpg`
  - `/tmp/review/lead/lead-requests-requestid-scan-leave-james-390.jpg`
- **What:**
  - The list note says "Open a request to see its details or withdraw it." (`timeoff-b.tsx:100`).
  - James's waiting request page has no Withdraw. It ends with a lone card: "To change this request, contact your manager." (`src/components/employee-mobile/timeoff.tsx:117`).
- **Breaks:** a promise the UI doesn't keep (the copy audit covers only the withdraw verb).
- **Fix:** show the note only when at least one listed request has a withdraw command, or change it to "Open a request to see its details."

### LN-020 · Medium · "Request not available" names a way back but gives no control
- **Image:** `/tmp/review/lead/lead-requests-requestid-scan-leave-maria-1440.jpg`, plus 390 and 320.
- **What:**
  - The card says "…Return to Time off to review your requests." as plain text.
  - There is no button, and the band's back link says "Requests", not Time off.
- **Breaks:** an escalation-adjacent error-recovery gap, and Fitts's law (there is nothing to tap).
- **Fix:** add a quiet pill "Back to Time off" to the card (`timeoff-b.tsx:103`; the same pattern at `exchange-b.tsx:225`).

### LN-021 · Low · Request detail polish
- **Image:** `/tmp/review/lead/lead-requests-requestid-scan-leave-james-390.jpg`
- **What:**
  - "Waiting for your manager" has no amber "Waiting" chip, which the list uses for the same state.
  - "Tue, Nov 10 · 9:00 AM – 5:00 PM ·" ends a line with "·", which breaks the Round 4 Dotted rule.
  - A one-sentence card ("To change this request…") stands alone.
- **Fix:**
  - Put the amber chip in the status row.
  - Render the shift line with `Dotted`.
  - Fold the sentence into the status card as an `eb-cardnote`.

---

## /app/exchange, ?tab=foryou, /swap, /callout

### LN-022 · Medium · Desktop says "Requests" while the page says "Schedule"
- **Images:**
  - `/tmp/review/lead/lead-exchange-1440.jpg`
  - `/tmp/review/lead/lead-exchange-tab-foryou-1440.jpg`
  - `/tmp/review/lead/lead-exchange-390.jpg`
- **What:**
  - On /app/exchange the band's back link is "‹ Schedule" and the phone tab bar lights Schedule.
  - The desktop sidebar highlights **Requests**.
  - The cause: `activeNavigationHref` only sends `?tab=available`, swap and callout to Schedule. Plain `/app/exchange` (the default Open shifts tab) falls through to `/app/requests/hub` (`src/lib/navigation.ts:177-180`), while the phone tabs give all exchange pages to Schedule (`navigation.ts:253-255`).
- **Breaks:** navigation clarity (two "you are here" signals disagree) and Jakob's law.
- **Fix:** in the Employee/Lead branch, treat `/app/exchange` with no `tab`, or `tab=available`, as Schedule. Keep For you and My requests under Requests if intended, and make the back link follow the same rule.

### LN-023 · Medium · The tab that needs an answer has no badge on phones
- **Images:**
  - `/tmp/review/lead/lead-exchange-390.jpg`
  - `/tmp/review/lead/lead-exchange-tab-foryou-390.jpg`
  - `/tmp/review/lead/lead-exchange-1440.jpg`
  - `/tmp/review/lead/lead-exchange-tab-foryou-1440.jpg`
- **What:**
  - Desktop tabs read "Open shifts · 2 / For you · 1".
  - Phone tabs read "Open shifts / For you / My requests" with no count, so the swap waiting on the Lead is invisible from the default tab.
  - On desktop, Open shifts loses its "· 2" once another tab is selected.
  - Phone tabs are 114×34 (probe).
- **Breaks:** visibility of system status, consistency across widths, and Fitts's law (34px targets against a 48px+ target).
- **Fix:** show the count on phones, at least an amber dot on "For you" when it holds a needs-answer item, and keep the counts on every tab. The tabs are 36px in the kit (`owner-b-pages.css:56,90`; segment geometry is S5 in the design-system audit). Give the phone segments a 44px hit area.

### LN-024 · Low · For you and the deep links don't match Open shifts
- **Images:**
  - `/tmp/review/lead/lead-exchange-tab-foryou-1440.jpg`
  - `/tmp/review/lead/lead-exchange-swap-390.jpg`
  - `/tmp/review/lead/lead-exchange-callout-390.jpg`
- **What:**
  - Open shifts has a titled card ("You can pick up 2"). For you is a bare row-card with a 3px left accent and no card title.
  - `/app/exchange/swap` and `/app/exchange/callout` render the tab lists (page titles "Open shifts" and "My shift requests"), not a swap or can't-work form. The manifest records "no visible submit". A deep link lands on a generic list.
  - I did not verify whether these routes need a shift parameter.
- **Fix:**
  - Give For you a card header ("Needs your answer").
  - Have /swap and /callout without a shift either redirect to Schedule with a hint ("Choose a shift to swap") or open the shift picker.

---

## /app/availability

### LN-025 · Low · Mixed alignment at the foot of the card
- **Images:**
  - `/tmp/review/lead/lead-availability-1440.jpg`
  - `/tmp/review/lead/lead-availability-390.jpg`
- **What:**
  - On desktop the disabled "Save" pill is right-aligned while "One-off days off go in Requests." is centred under it.
  - "One-off" renders with a wide hyphen ("One - off"), a new instance of T4.
  - The card body starts at x 315 while the header starts at 319 (see LN-050).
- **Fix:** left-align both, or make Save full width as on phone with the hint centred under it, and apply T4's `font-variant-numeric: normal` to text.

---

## /app/updates and an update

### LN-026 · Medium · The compose action differs in icon and place between Home and Updates
- **Images:**
  - `/tmp/review/lead/lead-updates-390.jpg`
  - `/tmp/review/lead/lead-updates-1440.jpg`
  - `/tmp/review/lead/lead-home-1440.jpg`
- **What:**
  - Updates draws compose with a **pencil** (band button and phone row, `src/components/employee-b/messages-b.tsx:134,155`). Home draws it with a **megaphone** (`home-b.tsx:101,190`).
  - On the phone Updates page, "Write an update" is the last row of the "Earlier" card, below the read items, while on desktop it is the band's primary.
  - The wording mismatch is in the copy audit. The icon and placement are new here.
- **Breaks:** Gestalt similarity across screens, and a primary action buried at the end of a list (serial position).
- **Fix:** use the pencil everywhere for compose and keep the megaphone for updates. On phone, put "Write an update" in the band as a glass pill (the same slot as Schedule's "Availability"), not at the list foot.

### LN-027 · Medium · The desktop search field is 20px off the band's text edge
- **Image:** `/tmp/review/lead/lead-updates-1440.jpg`
- **What:**
  - The title and back link start at x 296. The search field starts at **316**.
  - The phone margin `margin: 16px 20px 0` (`src/components/employee-b/account.css:96`) survives on desktop, where `employee-b-desktop.css:243` only caps the width.
- **Breaks:** alignment to shared edges.
- **Fix:** add `margin-inline: 0` to the desktop rule at `employee-b-desktop.css:243`.

### LN-028 · Low · Update rows and update detail polish
- **Images:**
  - `/tmp/review/lead/lead-updates-390.jpg`
  - `/tmp/review/lead/lead-updates-12c44ff9-9bb5-44e7-8497-c8d4a3aa0d3e-1440.jpg`
- **What:**
  - At 390, "Management · Mon, Nov 9 / · Unread" starts a line with "·", which breaks the Dotted rule.
  - In detail on desktop, card 1's text is at x 315 and card 2's at 319 (LN-050).
  - The list button "Confirm" becomes "Acknowledge update" on the detail page for the same action.
- **Fix:**
  - Render that meta with `Dotted` (`messages-b.tsx:172`).
  - Use one verb ("Confirm") on both.

---

## /app/notifications

### LN-029 · Medium · "Action needed" is amber on one row and grey on the rest
- **Images:**
  - `/tmp/review/lead/lead-notifications-390.jpg`
  - `/tmp/review/lead/lead-notifications-1440.jpg`
  - `/tmp/review/native-app/employee-notifications-390.jpg`
- **What:**
  - Only the first Team update has an amber icon circle.
  - Three "Schedule update · Action needed" rows keep grey circles. The cause is `tone = kind === 'COMMUNICATION' && required ? 'amber' : 'grey'` (`messages-b.tsx:110`).
- **Breaks:** one colour, one meaning (amber = wait or check), and Gestalt similarity.
- **Fix:** `tone = required ? 'amber' : 'grey'` for every kind.

### LN-030 · Low · Earlier rows show the date twice, and rows have no chevron
- **Image:** `/tmp/review/lead/lead-notifications-1440.jpg`
- **What:**
  - "Action needed · Thu, Nov 5 · 2:41 PM" sits next to a right-side "Nov 5" (`messages-b.tsx:112`).
  - The rows are links but have no chevron, unlike every other list.
- **Fix:** for Earlier rows put only the time in the sub-line, keep the date on the right, and add `Chev`.

---

## /app/more, /app/profile, calendar and Alerts (browser)

### LN-031 · Low · The same person's avatar changes colour
- **Images:**
  - `/tmp/review/lead/lead-more-390.jpg`
  - `/tmp/review/lead/lead-more-1440.jpg`
  - `/tmp/review/native-app/owner-more-390.jpg`
- **What:**
  - The top-bar avatar "JO" is a white or glass circle with teal initials.
  - The More identity shows the same person on a lavender `faceTint` with purple initials (`src/components/owner-b/b-kit.tsx:123-126`), and the Owner's on peach.
  - The six tints are intentional for *other* people, but the signed-in user flips between two treatments.
- **Fix:** use the header avatar treatment for "me" on More, and keep the tints for other people.

### LN-032 · Medium · Back links don't return where the Lead came from
- **Images:**
  - `/tmp/review/lead/lead-profile-1440.jpg`
  - `/tmp/review/lead/lead-profile-device-alerts-1440.jpg`
  - `/tmp/review/lead/lead-profile-calendar-1440.jpg`
- **What:** the Lead-only desktop "Calendar and alerts" card on Profile opens:
  - Alerts, whose back link says "‹ Notifications".
  - Add to calendar, whose back link says "‹ More".

  Neither returns to Profile.
- **Breaks:** navigation clarity and Jakob's law (back returns to origin).
- **Fix:** pass `?from=profile` from the card links (`src/components/employee-b/account-b-client.tsx:73-77`) and let the two pages' `BHero back` honour it, defaulting to today's parents.

### LN-033 · Low · Profile and browser Alerts details
- **Images:**
  - `/tmp/review/lead/lead-profile-390.jpg`
  - `/tmp/review/lead/lead-profile-device-alerts-1440.jpg`
- **What:**
  - "Security" holds only "Delete my account" in this configuration (no passkeys row).
  - The English/Español segment is 77×34 on phone (probe), below the 48px Direction B target.
  - The desktop Alerts row puts its icon at x 315 and text at 363, against 319 and 377 for every other icon row.
- **Fix:**
  - Retitle the section "Account" when it holds only deletion.
  - Give the segment a 44px hit area (`account.css:121`).
  - Use the standard `b-row` geometry for the Alerts row.

---

## /app/account/delete and /app/profile/account-deletion

### LN-034 · Medium · Card inside a card on desktop delete
- **Image:** `/tmp/review/lead/lead-account-delete-1440.jpg`
- **What:**
  - "Confirm it's you" is a white 22px card (x 916–1354) inside another white 22px card (x 894–1376).
  - Both have shadows and the same radius, so the radius isn't concentric.
  - Phones don't nest.
- **Breaks:** better-ui (outer radius = inner + padding, otherwise separate surfaces) and Gestalt common region (a double frame).
- **Fix:** on desktop, drop the inner `c-card` surface (no background or shadow) inside `.em-delete > .b-keep` (`employee-b-desktop.css:224`; the surface comes from `requests.css:96`).

### LN-035 · Medium · The policy page's only action is a grey slab on grey canvas
- **Image:** `/tmp/review/lead/lead-profile-account-deletion-1440.jpg`
- **What:** "Review deletion request" is a full-width quiet fill (≈`#F0F2F3`) directly on the `#F2F5F4` canvas. The shape is almost invisible (≈1.0:1 against the canvas), so it reads as a disabled bar.
- **Breaks:** visual hierarchy, the affordance of the main action, and figure-ground.
- **Fix:** put it in the reading card's footer, or render it as the white pill on a card. This action is not destructive yet, so keep it neutral: white with ink text and the card shadow.

---

## /app/no-such-page

### LN-036 · Medium · The phone 404 drops the Direction B shell
- **Images:**
  - `/tmp/review/lead/lead-no-such-page-390.jpg`
  - `/tmp/review/lead/lead-no-such-page-1440.jpg`
- **What:**
  - At 390: a white header, the dark two-line "NEVORA WORKFORCE" lockup, a **teal numeric bell badge "9"** (every other Lead phone screen uses the coral dot), a grey avatar, the title on canvas with no band, and no tab lit.
  - Desktop has the band.
- **Breaks:** consistency with every other in-app phone screen, and aesthetic-usability (it looks like another app).
- **Fix:** render the in-app not-found inside `BScreen` with `BHero title="This page doesn't exist"` and the card with "Go to Home". The public 404 stays as is.

---

## Native app: Employee Alerts page (`/app/profile/device-alerts`, NEVORA-Native UA)

### LN-037 · Medium · "Checking" uses the "on" colour
- **Images:**
  - `/tmp/review/native-app/employee-profile-device-alerts-390-native-loading.png`
  - `/tmp/review/native-app/employee-profile-device-alerts-390-native-enabled.png`
- **What:**
  - While checking, the 64px ring is teal (`#E8F3F1`, `#0B6E69`), identical to "Alerts are on".
  - DESIGN (Nov 9) and the component's own comment say grey for "off or checking".
  - The code is `ring()`: `if (busy) return <Ring tone="teal">` (`src/components/native-shell/device-settings.tsx:70`).
- **Breaks:** one colour, one meaning. At a glance a user reads "on" before the check finishes.
- **Fix:** `tone="grey"` for busy.

### LN-038 · High · The error state shows "off" copy and puts the error in a teal info note
- **Images:**
  - `/tmp/review/native-app/employee-profile-device-alerts-390-native-error.png`
  - `/tmp/review/native-app/employee-profile-device-alerts-900-native-error.png`
  - `/tmp/review/native-app/employee-profile-device-alerts-1440-native-error.png`
- **What:**
  - The title is "Setup needs a check" (amber ring).
  - The body is the **off** text ("Get schedule changes … may ask for notification permission"), because `describe()` has no error branch (`device-settings.tsx:32`).
  - The actual failure, "We could not verify this device. Check again.", sits *outside* the card in a teal info callout (`device-settings.tsx:107`; `b-note eb-callout` = `#E8F3F1`, `#0B6E69` at `account.css:59`).
  - Both buttons are grey quiet pills, so there is no primary.
- **Breaks:**
  - The escalation trigger "semantic colour used against its meaning" (an error in teal = information).
  - Proximity: the cause is separated from the state.
  - Hick's law: two equal options and no recommended step.
- **Fix:**
  - Add an error text in `describe()`: "NEVORA couldn't confirm this phone's alert setup. Check again, or review the app's setup."
  - Render `s.message` inside the card under the text with amber ink for failures (or drop it when it repeats the text).
  - Make "Check again" `kind="teal"` in the error and revoked states.

### LN-039 · Medium · "Paused" tells you to return to NEVORA while you are in it, twice
- **Image:** `/tmp/review/native-app/employee-profile-device-alerts-390-native-paused.png` (also 900 and 1440)
- **What:**
  - The card says "Device settings paused / Return to NEVORA to check this account and device." with no action.
  - A teal note under it repeats "Return to NEVORA to check this device."
  - The pause is wired to `window` `blur` (`device-settings.tsx:144`). On iOS and Android the OS permission sheet that "Turn on alerts" opens may blur the web view, so the page can flash "paused" mid-flow. I could not verify this without a device.
- **Breaks:** redundancy, a self-referential instruction, and a dead-end state with no control.
- **Fix:**
  - Body: "Checking will continue when you come back to this screen." Add a "Check now" teal pill.
  - Drop the duplicate `s.message` for the paused state.
  - Pause on `visibilitychange` and `pagehide` only, not `blur`, or ignore `blur` while an enable request is in flight (`actionPending.current`).

### LN-040 · Medium · Confirmation cards have no heading, and the use-for-account confirm sits beside a live "Turn off alerts"
- **Images:**
  - `/tmp/review/native-app/employee-profile-device-alerts-390-native-confirm-use-for-account.png`
  - `/tmp/review/native-app/employee-profile-device-alerts-390-native-confirm-turn-off.png`
  - `/tmp/review/native-app/employee-profile-device-alerts-900-native-confirm-use-for-account.png`
- **What:**
  - Both confirmations are cards with only body text (the name is `aria-label` on a `div role=group`) (`device-settings.tsx:99-106`).
  - During use-for-account, the main card still shows the red outline "Turn off alerts" while the confirm asks "Turn on for this account". That is two opposite actions on one screen. The cause is `off = !!s.generation && !review`, which ignores `recover` (`:33`).
  - The confirm grows the page to 912px at 390, so "Turn on for this account" ends at the tab bar. At 320 or on short phones it opens below the fold. Focus moves there, but sighted users may not see it appear.
- **Breaks:** WCAG 1.3.1 and 2.4.6 (a heading for the decision), Hick's law (conflicting choices), and change blindness.
- **Fix:**
  - `off = !!s.generation && !review && !p.recover`.
  - Give each confirm an `h2` ("Turn off alerts here?" / "Use alerts for this account?") and point `aria-labelledby` at it.
  - Call `scrollIntoView({block:'center'})` when focusing the confirm (`:154-155`).

### LN-041 · Medium · A left-aligned card title over centred content
- **Images:**
  - `/tmp/review/native-app/employee-profile-device-alerts-390-native-enabled.png`
  - `/tmp/review/native-app/employee-profile-device-alerts-1440-native-enabled.png`
- **What:**
  - "This device" is left at the card's text edge.
  - The ring, title, text and pills are centred (`.nd-state { align-items:center; text-align:center }`, `device-settings.css:15`).
  - At 1440 the 440px pill stack floats centred in an 812px card under a left-aligned header.
- **Breaks:** alignment to shared edges and Gestalt continuity.
- **Fix:** drop the "This device" header in the B view (the state title carries the card), or move "This device" into the centred stack as a small grey eyebrow above the ring (`device-settings.tsx:85`).

### LN-042 · Low · Revoked: the destructive button sits between two neutral ones
- **Image:** `/tmp/review/native-app/employee-profile-device-alerts-390-native-revoked.png`
- **What:** the order is Check again (quiet), Turn off alerts (red outline), Review app setup (quiet). There is no primary, and the red button sits in the middle of the thumb zone.
- **Note:** this is the order DESIGN lists, so treat it as a proposal for Jose.
- **Fix:** Check again (teal), Review app setup (quiet), Turn off alerts (red outline) last.

### LN-043 · Medium · Denied offers no route to the phone's settings
- **Image:** `/tmp/review/native-app/employee-profile-device-alerts-390-native-denied.png`
- **What:** "Permission is blocked / Allow NEVORA notifications in your phone settings, then check again." The only action is "Check again". The user has to leave the app and find the setting alone.
- **Breaks:** Jakob's law. Native apps offer "Open Settings" (iOS `UIApplication.openSettingsURLString`, Android app-notification settings).
- **Fix:** add a teal "Open phone settings" pill above Check again, if the bridge can expose it. This needs a native bridge capability, so it is not verifiable here.

## Native app: the Owner's Device settings popover (`/app/profile`)

### LN-044 · Medium · On phone the popover slices a row and uses a different status visual
- **Images:**
  - `/tmp/review/native-app/owner-profile-390-device-popover.png`
  - `/tmp/review/native-app/owner-profile-1440-device-popover.png`
- **What:**
  - At 390 the sheet's top edge cuts through the "Notifications · On ›" row (the row's top half shows above it). There is no scrim on phones, so figure and ground blur and the cut row still looks tappable.
  - Its status is a bold h3 "Alerts are off", while the Employee's Alerts page shows the same state as the 64px ring. One state has two visuals across roles (`device-settings.tsx:37-62` against `:79-110`).
- **Breaks:** figure-ground and consistency.
- **Fix:**
  - Add the light scrim on phones too, or anchor the sheet so its top edge falls between cards (`src/components/portal-device-setup.css:5`).
  - Reuse the `Ring` and `nd-state` block in `NativeDeviceSettingsView`.

### LN-045 · High · The Owner has no way to reach app alerts inside the app
- **Images:**
  - `/tmp/review/native-app/owner-profile-390.jpg`
  - `/tmp/review/native-app/owner-more-390.jpg`
  - `/tmp/review/native-app/owner-profile-390-device-popover-focus.png`
- **What:**
  - Owner Profile shows Phone, Email, Time zone, Notifications and Privacy. Owner More shows Insights, Updates, My pay, Settings, Help and Sign out.
  - Neither has a row that opens the popover. The account-menu "Device settings" item is hidden on `/app/profile` and is desktop chrome (`src/components/app-shell.tsx:363`).
  - DESIGN (Nov 9) acknowledges "In the app the Owner has no visible opener". The result is that an Owner can't turn on app alerts in the app.
  - In the focus capture, focus returns to "‹ More" because there is no opener to return to.
- **Breaks:** this blocks the task.
- **Fix:** add an "Alerts on this device" row to Owner Profile, shown only under the native user agent, with `popoverTarget="portal-device-settings"`. Focus then returns to that row on Done.

## Native app: "Use NEVORA in your web browser" (Manager and Lead)

### LN-046 · Medium · The only action is Sign out, and the copy confuses Leads
- **Images:**
  - `/tmp/review/native-app/manager-home-390.jpg`
  - `/tmp/review/native-app/manager-home-320.jpg`
  - `/tmp/review/native-app/manager-home-1440.jpg`
- **What:**
  - The page's filled teal primary is "Sign out". There is no "Open in browser" or "Copy link", so the user's actual next step (continue in a browser) has no control.
  - The text says the app "supports Employee and Owner accounts". A Lead, who uses the Employee screens on the web, reasonably thinks "I am an employee" and won't understand the block.
  - Source: `src/components/native-shell/unsupported-role.tsx:17-19`.
- **Breaks:** a dead end (Hick's and Fitts's laws: the one big button doesn't serve the goal).
- **Fix:**
  - Primary teal pill "Open NEVORA in your browser", which opens the web origin externally through the bridge. "Sign out" becomes a quiet pill under it.
  - Line 1: "This version of the NEVORA app is for employees and owners. Shift leads and managers use NEVORA in a web browser."

### LN-047 · Low · The wordmark appears twice
- **Image:** `/tmp/review/native-app/manager-home-390.jpg`
- **What:** a white "NEVORA" in the band, then a grey "NEVORA / Workforce" lockup with the coloured "A" under the card (`unsupported-role.tsx:14,22`).
- **Fix:** keep the band wordmark and reduce the footer to "Powered by VELANI LLC".

---

## Cross-screen patterns

### LN-048 · Medium · The desktop figure strip is capped at 920px while the grid is 1080px
- **Images:**
  - `/tmp/review/lead/lead-home-1440.jpg`
  - `/tmp/review/lead/lead-my-time-1440.jpg`
  - `/tmp/review/lead/lead-requests-hub-1440.jpg`
  - Correct at 1280: `/tmp/review/lead/lead-home-1280.jpg`
- **What:**
  - At 1440 the glass strip ends at x 1215. The cards and the band's white action end at 1376.
  - At 1280 both are 920, so the mismatch appears only on wide screens.
  - The cause is `.b-live { max-width: 920px }` (`employee-b-desktop.css:50`; Owner `owner-b-desktop.css:222`).
- **Breaks:** alignment to shared edges.
- **Fix:** replace the cap with `max-width: none` so the strip spans the content grid, or cap the grid at 920 too.

### LN-049 · Medium · The 812px reading column sits under a band whose action is pinned to the 1080px edge
- **Images:**
  - `/tmp/review/lead/lead-requests-1440.jpg`
  - `/tmp/review/lead/lead-updates-1440.jpg`
  - `/tmp/review/lead/lead-availability-1440.jpg`
  - `/tmp/review/lead/lead-more-1440.jpg`
  - `/tmp/review/lead/lead-notifications-1440.jpg`
- **What:**
  - The cards end at x 1108, while "Request time off", "Write an update" and "Change one week" end at 1376. Each band action floats 268px right of everything it relates to.
  - More is worse: the glass identity bar ends at 1108 while its two cards span to 1376.
  - Cause: `employee-b-desktop.css:183-184, 241-243` cap the stack and the hero tools at 812px but not the hero's right slot.
- **Breaks:** Gestalt proximity and common region, and Fitts's law (the eye has to travel).
- **Fix:**
  - On `.b-screen--back`, cap the `.b-hero` inner row (title plus right slot) at 812px as well.
  - On More, give `.eb-id` the full grid width (`employee-b-desktop.css:208`).

### LN-050 · Medium · Two card insets on desktop: the header at 22px, the body at 18px
- **Images:**
  - `/tmp/review/lead/lead-availability-1440.jpg`
  - `/tmp/review/lead/lead-updates-12c44ff9-9bb5-44e7-8497-c8d4a3aa0d3e-1440.jpg`
  - `/tmp/review/lead/lead-profile-calendar-1440.jpg`
  - `/tmp/review/lead/lead-account-delete-1440.jpg`
  - `/tmp/review/lead/lead-profile-account-deletion-1440.jpg`
  - `/tmp/review/lead/lead-profile-device-alerts-1440.jpg`
  - `/tmp/review/lead/lead-requests-requestid-scan-leave-maria-1440.jpg`
- **What:**
  - Card headings start at x 319: `.b-card__h { padding: 18px 22px 6px }` (`employee-b-desktop.css:62`).
  - Bodies keep the phone's 18px and start at 315: `eb-body`, `eb-notice`, `eb-update`, `eb-doc`, `eb-doc__body` and `eb-status` (`account.css:40,70,111,152,161`; `employee-b.css:18`).
  - Inside one card the title and the paragraph under it are 4px apart, and stacked cards disagree by 4px.
- **Breaks:** alignment to shared edges.
- **Fix:** one desktop rule setting `padding-inline: 22px` on those body classes, next to `employee-b-desktop.css:62`.

### LN-051 · Medium · Phone targets under the 48px Direction B minimum (Lead screens)
- **Images:** the probe in each listed 390 audit:
  - Exchange tabs 114×34.
  - Notifications All/Unread 171×34.
  - Time off Waiting/Decided 171×34.
  - Language segment 77×34.
  - Pay "See your hours" 144×32.
  - Schedule week arrows 32×32 and "Confirm schedule" 83×36.
  - The Today's team row hit 248×40.
- **What:** all pass WCAG 2.5.8 (24px) but miss DESIGN's "48px+ targets". The week arrows sit inside a glass card where a miss lands on a day.
- **Breaks:** Fitts's law and the approved spec.
- **Fix:**
  - Add the kit's `::after { inset: -6px 0 }` hit extension (`owner-b.css:84`) to `.b-seg > *`, `.b-week__arrow`, the Pay glass button (`pay.css:9`) and the language segment (`account.css:121`).
  - Make `.b-row__hit` `min-height: 44px`.

### LN-052 · High (verify) · At 390 the Tab key never reaches page content
- **Data:** manifest `data`, /app, lead, 390, keyboard-order. The same pattern appears in the employee, owner and manager 390 entries.
- **What:**
  - The recorded loop is tab bar (5) → browser chrome → wordmark → bell → avatar → tab bar.
  - None of the hero figures, the shift card, Today's team, Things to do or Coming up receive focus.
  - At 1440 the same page tabs through all its content, so the phone presentation is skipped.
  - I did not find an `inert` or `tabindex` cause in `app-shell.tsx` or `b-kit.tsx`. It may be a harness effect of touch emulation, so it needs a manual check with a hardware keyboard on a phone or in desktop Chrome at 390.
- **Breaks:** WCAG 2.1.1. This is an escalation trigger, because content is reachable by pointer and not by keyboard.
- **Fix:** reproduce first. If it is real, check the `viewport.tsx` and CSS "one per width" switch: the hidden copy must be `display:none` or `inert`, and the visible B copy must not sit inside an `inert` or `aria-hidden` subtree.

### LN-053 · Medium · Time and duration formats drift across the Lead screens
- **Images:**
  - `/tmp/review/lead/lead-home-1440.jpg`
  - `/tmp/review/lead/lead-schedule-1440.jpg`
  - `/tmp/review/lead/lead-my-time-1440.jpg`
- **What:**
  - Ranges come in four forms: "12–11:30 PM" (hero, `compactRange` at `home-b.tsx:178`), "12:00 PM – 11:30 PM" (card), "9 AM – 5 PM" (week blocks) and "9:00 AM – 5:00 PM" (rows).
  - Durations come in four forms: "9 h 39", "/59.5 h", "11.5 h" and "9 h 40 min".
- **Breaks:** consistency and Miller's law (each form has to be parsed again).
- **Fix:**
  - One range format per density: compact ("12 – 11:30 PM", spaced en dash) for glass figures and week blocks, full for rows and cards.
  - One duration format: "11 h 30" everywhere, including the scheduled totals.

### How the Lead extras sit on the Employee screens
- **Approved and working:** the Lead pieces are additive and on-brand: the teal "Shift lead" chip, the green live dot, Today's team as a standard B card, and the "Lead" role line under the workspace tile.
- **Where they compete:**
  - On phone Home, LN-001 and LN-002 together put three Lead or shift cards before any to-do.
  - On desktop Home there are three entry points to one Lead action (LN-003).
- **Where they go missing:**
  - Schedule drops the marker on today's and tomorrow's rows (LN-011).
  - The week card's lead chip fails contrast on the live block (LN-010).
- **Not covered:** the Lead sees no teammate names, so the long-names captures don't exercise any Lead-specific layout.

### Already-covered items that reappear here (new instances only)
- **C2 (glass chips):** the week-card "Now" and "Shift lead" chips (LN-010).
- **C13 (red Sign out):** also on desktop More (`/tmp/review/lead/lead-more-1440.jpg`).
- **T4 (tabular hyphen):** in "One-off" on desktop Availability, and in the Owner phone number "555-0100" (`/tmp/review/native-app/owner-profile-390.jpg`).
- **S1 (rounded-rectangle primaries):** in native "Turn on alerts", "Acknowledge update" and "Create calendar link".
- **E3 (See all → Notifications):** visible on Lead Home ("See all 7").

---

## What works well
- **Native Alerts:** the page follows the approved ring language for on, blocked and check. The red outline is used only for "Turn off". Every state keeps the reassurance line, and focus moves to the confirm and back to its opener (`device-settings.tsx:154-168`).
- **Unsupported-role page:** it uses the 404 band, card and safe areas correctly (`not-found.css:30,34`).
- **Safe areas in code:** `viewport-fit=cover` is set (`src/app/layout.tsx:23`). The band, the back link and the tab bar pad with `env(safe-area-inset-*)` (`owner-b.css:36,44`; `corp-shell.css:50`; `portal-device-setup.css:5`).
- **Focus rings:** consistent, white on the band and teal elsewhere, in every Tab-order record.
- **Status chips:** amber, green and grey are used correctly in Requests and Pay. Pay's ink hero and chips pass.

## Verification and gaps
- **Checks run:**
  - Viewed every Lead and native image at its main width and spot-checked the second.
  - Read all 124 Lead and 22 native audit JSONs.
  - Read the Lead Tab-order data.
  - Computed one contrast pair (LN-010: 4.18:1, matching the probe).
- **Probe false positives ignored:**
  - Desktop band text at 1.05–1.1:1. The probe samples the canvas, not the band.
  - `overlap` entries caused by visually hidden text.
  - Date inputs showing "focusRing none". The ring is drawn on the `.tof-pick` wrapper (`requests.css:129`).
- **Not verified:**
  - **Real safe-area insets.** The native captures are browser user-agent emulation, so the insets are 0.
  - **LN-039's blur-pause and LN-043's settings deep link** need a device.
  - **LN-052** needs manual keyboard reproduction.
  - **Reduced motion.** No motion frames were in scope.
  - **The Owner and Lead native shells at desktop widths.** Not captured.
  - **The native Notifications "Settings" entry to Alerts.** It is gated by the feature flag (`notifications/page.tsx:18`) and was off in the capture.

---

## Top 10 for this area
1. **LN-007 (High):** offline says "Showing what was loaded" over an emptied page. Fix the shell pill text and keep the title and eyebrow stable.
2. **LN-038 (High):** the native Alerts error shows "off" copy and puts the error in a teal info note with no primary. Add error text, put the message in the card with amber ink, and make Check again teal.
3. **LN-045 (High):** the Owner can't reach app alerts in the app. Add a native-only "Alerts on this device" row to Owner Profile that opens the popover.
4. **LN-010 (High):** the Lead's "Shift lead" and "Now" chips on today's week block are at 4.18:1. Use a solid white chip with teal ink.
5. **LN-052 (High, verify):** the phone Tab order skips all page content, in every role's 390 capture. Reproduce and fix the presentation switch.
6. **LN-001 and LN-002 (Medium):** on phone, the Lead Home repeats "On shift now" three ways and puts Today's team above the 7 to-dos. Trim the card and move Today's team below Things to do.
7. **LN-011 (Medium):** Schedule's single chip slot drops "Shift lead" on today's and tomorrow's shifts. Move the marker into the sub-line.
8. **LN-040 (Medium):** native confirms have no heading, and use-for-account shows "Turn off" and "Turn on" together. Gate `off` on `!recover` and add h2s.
9. **LN-022 (Medium):** the desktop sidebar lights Requests while Pick up and swap says "‹ Schedule". Align `activeNavigationHref` with the phone tabs.
10. **LN-048, LN-049 and LN-050 (Medium):** desktop geometry uses three widths (920, 812 and 1080) and two insets (18 and 22). Fix them as one pass on `employee-b-desktop.css:50, 62, 183-243`.

**Counts:** 53 findings: 5 High, 35 Medium, 13 Low.
