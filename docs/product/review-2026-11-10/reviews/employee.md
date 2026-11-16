# NEVORA Employee UI/UX review: phone and desktop

Date: 2026-11-10. This is a read-only review: nothing in the repository was changed.

## Scope, method and baseline

**Surface.** The Employee role on:
- phone at 390 and 320 (`/tmp/review/employee-phone/`, 119 images)
- desktop at 1440 and 1280 (`/tmp/review/employee-desktop/`, 80 images)
- the five 844×390 sideways-phone captures

I viewed every route and state at its main width (390 or 1440) and spot-checked the other width (320 or 1280). Paths in this report drop the `/tmp/review/` prefix.

**Inputs used:**
- Every `*.audit.json` in the two folders: tap targets, text under 12px, contrast, axe and probe overlaps.
- The manifest's Employee `data` (keyboard order at `/app` and `/app/requests?tab=new`, at 390 and 1440) and its `not_captured` list.

**Baseline.**
- DESIGN.MD "Employee phones: Direction B" (Nov 6 and its round 4, Nov 7) and "Direction B for the remaining surfaces" (Nov 8, including Employee desktop and the final round).
- `.21st/DESIGN.md` was skimmed for Employee rules.
- Inter; teal `#0B6E69`; the band; canvas `#F2F5F4`; white 22px cards; pills; Phosphor bold icons in tinted circles; 48px+ targets; light only.
- Status colours: red stops, amber waits or checks, green is done, teal is information.

**Not repeated.** These were already reported elsewhere. I cite them only where an Employee screen shows a new instance.
- `code-design-system.md`:
  - C1–C5: band, glass and tab-label contrast, and grey on fills
  - C6: field edges
  - C13: Sign out in red
  - S1 and S4: pill radii
  - B1: desktop 32–42px controls
  - B5: disabled looks
  - I1–I4: icon weights and carets
  - T1–T5: type sprawl
  - L1: `!important` ladder
- `copy-audit.md`:
  - E1–E3: correction vocabulary, "Correction recorded", Home "See all"
  - The Employee Medium and Low rows: "On the clock", "planning", Pay naming, "Shift request" naming and others

**Probe caveat.** On desktop the band is painted with `border-image`, so the probe measured band text against white and reported 1.05–1.10:1 for every title, back link and figure. These are measurement artefacts and are not reported. Contrast findings below use pairs measured on screen, or computed from the declared colours.

**Severity.**
- **High:** blocks or confuses a task, or fails accessibility.
- **Medium:** a visible inconsistency or friction.
- **Low:** polish.

---

## `/app`: Home

### EM-001 · High · Home tells someone who is already clocked in to clock in
- **Images:**
  - employee-phone/employee-home-390.jpg
  - employee-desktop/employee-home-1440.jpg
  - Compare: employee-phone/employee-my-time-390.jpg and employee-desktop/employee-my-time-1440.jpg
- **What's wrong.** At the same moment and with the same data:
  - Time says "Right now · On the clock · Clocked in at 12:02 PM · 9 h 24 min so far".
  - Home's "On shift now" card says "Clock in on the Main Office tablet · Breaks and clock out happen there too".
  - The instruction never changes with the clock state, so Home contradicts Time and can send someone back to the tablet to punch twice.
- **Principle.** Match between system and the real world; consistency (Jakob's law within the product); honest status.
- **Fix.**
  - In `src/components/employee-b/home-b.tsx:122-123`, branch the tinted notice on the punch state. The hero already reads Time's records (`hoursAuthority`), so the state is available.
  - When clocked in: a green dot with "Clocked in at 12:02 PM" and "Breaks and clock out on the Main Office tablet".
  - When the shift has started and there is no punch: an amber "Not clocked in yet" with "Clock in on the Main Office tablet".
  - Before the shift: today's text.

### EM-002 · High · Going offline erases what was loaded while the pill says "Showing what was loaded"
- **Images:**
  - employee-phone/employee-home-390-offline.jpg
  - employee-phone/employee-my-time-390-offline.jpg
  - employee-phone/employee-requests-390-offline.jpg
  - employee-desktop/employee-home-1440-offline.jpg
  - employee-desktop/employee-desktop-state-offline-my-pay-1440-desk-offline-my-pay.png
- **What's wrong.** The capture loads the page and then goes offline. What happens next:
  - Every Employee page drops its content: shift, hero figures, things to do, requests and statements.
  - Each page shows a different paused message.
  - Meanwhile the shell's dark pill says "You're offline. Showing what was loaded."
  - Someone checking their shift on a weak connection loses the time they had a second ago, and the screen says the opposite.
- **Cause.**
  - `src/components/employee-home-corp.tsx:140` (`released = !paused && …`) and `:159`
  - `src/components/employee-b/time-b.tsx:58`
  - `src/components/employee-b/timeoff-b.tsx:114`
  - The pill text is at `src/components/app-shell.tsx:494`.
  - The clearing is deliberate for privacy ("The name is private … it clears when Home pauses"), but going offline is not stepping away.
- **Principle.** Visibility of system status; trust (the message contradicts the screen); Doherty threshold (the content regresses).
- **Fix.** Jose to choose one:
  - **(a)** When `!online`, keep the last released snapshot on screen. Disable its actions, add a grey "Updated 9:24 PM · Offline" line, and keep clearing only for "paused while away".
  - **(b)** Keep the clearing, and change the pill to "You're offline. Reconnect to see your shift." on pages that cleared.
  - Option (a) matches the pill and the Owner rule "never keeps stale items" only for decision queues, not for one's own shift.

### EM-003 · Medium · Things to do has stacked teal "Review" pills, mixed row affordances and two tab stops per row
- **Images:**
  - employee-desktop/employee-home-1440.jpg: four teal "Review" pills
  - employee-phone/employee-home-390.jpg: two
  - Manifest keyboard data for `/app` at 1440, stops 5–12
- **What's wrong.**
  - Every required item gets the same teal primary labelled "Review". That gives four equal primaries in one card and five with the white band action.
  - The "Review swap request" row, which says "Review" in its title, has only a chevron. The rows titled "Confirm …" have a button that says "Review".
  - Each row with a button is two tab stops with the same destination: `a.b-row__hit` "Confirm this week's schedule, review", then `a.b-btn` "Review: Confirm this week's schedule". That makes ten stops for five items.
- **Principle.** One primary per view; Hick's law (four identical choices); similarity (the same action drawn two ways); keyboard efficiency.
- **Fix.**
  - In `home-b.tsx:186-188`, render every to-do as one `BRow` link with a chevron and a status chip ("Respond by Nov 18" amber, "Required" amber).
  - Keep the single teal button only for the most urgent item, or drop it.
  - Remove the separate `b-row__hit`/button pair so each row is one tab stop.

### EM-004 · Medium · Mixed number and date formats on one screen
- **Images:**
  - employee-phone/employee-home-390.jpg
  - employee-desktop/employee-home-1440.jpg
- **What's wrong.**
  - **Hours:**
    - The hero shows "9 h 24/59.5 h": minutes on the left, a decimal on the right, no space around the slash.
    - The desktop shift footer shows "11.5 h".
    - Time shows "9 h 24" next to "9 h 24 min so far".
  - **Dates:** the phone hero shows "Nov 20" and the desktop shows "Fri, Nov 20" for the same payday.
  - **The Owner rule (Nov 7):** period totals are whole hours ("511 h") and rows are "24 h 06".
- **Principle.** Consistency; recognition (two number systems make people convert).
- **Fix.**
  - Use one minutes format everywhere: "9 h 24 of 59 h 30" in the hero and "11 h 30" for shift length.
  - Replace `hoursNumber`/`lengthOf` in `home-b.tsx:41,45` with the h-and-minutes formatter Time already uses.
  - Show the weekday on both widths.

### EM-005 · Medium · Desktop: the glass figure strip stops 160px short of the cards under it
- **Images:**
  - employee-desktop/employee-home-1440.jpg: strip ends at x=1216; Things to do ends at x=1376
  - employee-desktop/employee-home-1440-long-names.jpg: 1056 against 1240
  - Same on employee-my-time-1440.jpg and employee-requests-hub-1440.jpg
  - At 1280 the two edges happen to coincide (employee-home-1280.jpg)
- **Cause.**
  - `src/app/app/employee-b-desktop.css:50`: `.b-live { max-width: 920px }`, while the two-column grid is 1080 wide at 1440.
  - The More identity strip has the same problem at `:208` (`max-width: 812px` against cards that reach x=1376; employee-desktop/employee-more-1440.jpg).
- **Principle.** Align to shared edges; Gestalt continuity.
- **Fix.** Drop the fixed max-width so the strip spans the grid. Alternatively, set it to the grid's own width token so both columns end on one edge at every desktop width.

### EM-006 · Medium · Loading → loaded rebuilds the whole first screen
- **Images:**
  - employee-phone/employee-home-390-loading.jpg compared with employee-home-390.jpg
  - employee-desktop/employee-home-1440-loading.jpg
- **What's wrong.**
  - The title changes from "Home" to "Welcome back, Maria".
  - The eyebrow changes from the workspace ("Northside QA Workforce") to the location ("Main Office").
  - The card title changes from "Next shift" to "On shift now".
  - A 76px glass figure strip appears and pushes every card down about 100px.
  - There is no skeleton; the only loading cue is one line of text.
- **Cause.**
  - `employee-home-corp.tsx:165`: `place=… || workspaceName`.
  - `home-b.tsx:209-215`: figures only when `snapshot`.
- **Principle.** Doherty threshold; continuity; perceived stability. The loading state should have the shape of the page.
- **Fix.**
  - Render the hero with the final title shape ("Welcome back" plus a name placeholder, or the name from the session, which the account menu already shows).
  - Reserve the figure strip as two skeleton tiles.
  - Draw the shift card as a skeleton at its loaded height.

### EM-007 · Medium · At 320 the shift time wraps "PM" onto its own line
- **Image:** employee-phone/employee-home-320.jpg ("12:00 PM – 11:30" / "PM")
- **What's wrong.** The most important figure on Home breaks inside a time. DESIGN's narrow-phone rule is that a title's parts wrap whole.
- **Cause.** `home-b.tsx:119`: the two `<time>` elements in `.eb-shift__time` are not kept whole.
- **Principle.** Wrap deliberately: no breaks inside a value; widows.
- **Fix.**
  - Wrap each `<time>` in `white-space: nowrap` so the only break point is the en dash.
  - Below 360px, drop the 26px time to 22px.

### EM-008 · High · Hero figures are invalid definition-list markup (axe serious)
- **Images:**
  - employee-phone/employee-home-390.jpg, employee-home-320.jpg
  - employee-desktop/employee-home-1440.jpg
  - employee-desktop/employee-requests-hub-1440.jpg
  - Audits: `definition-list` 1 node and `dlitem` 4–6 nodes on every Home capture
- **What's wrong.** `<dl class="b-live">` contains `div > a > dt/dd`, so the `<dt>`/`<dd>` sit inside a link and not in a valid group. Screen readers lose the term–value pairing on the most-seen figures. This is WCAG 1.3.1 (Level A).
- **Cause.** `src/components/owner-b/b-kit.tsx:45-52`.
- **Principle.** Info and relationships (1.3.1).
- **Fix.** Use one of these:
  - Keep `dl > div > dt + dd`, put the link inside the `dd` value, and stretch it with `::after { inset: 0 }`.
  - Use `ul > li > a`, keeping today's `aria-label` on the link.

### EM-009 · Low · The collapsed desktop rail shows the Notifications count as a separate chip under the bell
- **Images:**
  - employee-desktop/employee-home-1440-long-names.jpg ("8" at x=36, y=443)
  - employee-desktop/employee-home-1440-error.jpg
- **What's wrong.** The teal count sits on its own row 32px below the bell icon, so it reads as a ninth rail item.
- **Principle.** Gestalt proximity and common region.
- **Fix.** On the 48px rail, anchor the count as a badge on the bell's top-right corner. Keep it teal as DESIGN asks.

### EM-010 · Low · The "not published" note floats on the canvas away from what it qualifies
- **Images:**
  - employee-desktop/employee-home-1440.jpg (under Coming up, at y=880)
  - employee-phone/employee-home-390.jpg (between two cards)
- **What's wrong.** The line qualifies the shift card and Coming up, but on desktop it sits under the left column's last card, 580px from the shift card.
- **Principle.** Proximity.
- **Fix.** Make it the footer line of the Coming up card (as `BCardNote`). On desktop, alternatively put it in the shift card's footer next to "Monday, Nov 9 · 11.5 h".

---

## `/app/schedule`: Schedule, the shift sheet and the panel

### EM-011 · Medium · Desktop Schedule shows the same week twice
- **Image:** employee-desktop/employee-schedule-1440.jpg
- **What's wrong.**
  - "Your week" lists all seven shifts, and "Coming up" lists the same seven again as rows.
  - "7 shifts · 59.5 h" appears in the band sub and again in the week card's footer.
  - The right column is empty below y=700.
- **Principle.** Redundancy hurts scanning (Miller's law); desktop use of wide space.
- **Fix.**
  - On desktop, drop Coming up, or limit it to today and the next shift. The week card already holds the rest.
  - Move "Confirm this week" and "Open shifts" to the top of the right column.
  - Keep only the publication sentence in the week card's footer.

### EM-012 · Medium · Two time formats and two day-label cases on one screen
- **Image:** employee-desktop/employee-schedule-1440.jpg
- **What's wrong.**
  - The week card shows "12–11:30 PM" (no spaces, start meridiem dropped) and "7 AM – 3 PM" (spaced).
  - Coming up shows "7:00 AM – 3:00 PM".
  - Day labels are "Mon 9" in sentence case in the week card and "MON 9" in uppercase in Coming up.
- **Cause.** `src/components/owner-b/b-kit.tsx:164` (`compactRange`) is applied to every block, not only the narrow ones.
- **Principle.** Consistency; number formatting.
- **Fix.**
  - Use the full form "12:00 PM – 11:30 PM" in the week card when a day column is at least 150px wide (it is at 1440).
  - When the compact form is used, keep the meridiem on both ends ("12 PM – 11:30 PM") with a spaced en dash.
  - Use one day-label style per screen.

### EM-013 · Medium · Desktop demotes the one required action
- **Images:**
  - employee-desktop/employee-schedule-1440.jpg: "Confirm this week" at y=555 in the right column, under the week card
  - Compare: employee-phone/employee-schedule-390.jpg, where it is the first card
- **What's wrong.** Confirming is the only thing the manager asked for, and on desktop it appears after both the week card and the row list starts.
- **Principle.** Order by importance; phone and desktop parity; Fitts's law (distance from the band where the eye lands).
- **Fix.** Do one of these:
  - Put the Confirm card at the top of the right column, level with the week card.
  - Put "Confirm week" as the band's white pill (the band is empty at the right apart from Availability).

### EM-014 · Medium · Confirming gives almost no feedback and the layout jumps twice
- **Images:**
  - employee-phone/employee-state-schedule-confirm-before-390-state-schedule-confirm-before-fold.png
  - employee-phone/employee-state-schedule-confirm-pending-390-state-schedule-confirm-pending.png
  - employee-phone/employee-state-schedule-confirm-after-390-state-schedule-confirm-after-fold.png
- **What's wrong.**
  - **While pending:** the button moves under the text, becomes a pale "Confirming…" pill and adds "Checking the current schedule confirmation…". The card grows from 83 to 153 CSS px.
  - **After confirming:**
    - The card and the "What changed in your schedule" card both disappear, and everything below shifts up.
    - The only trace is a small mint "Confirmed" chip on the glass week strip. That chip fails contrast; see C2, chip `--ok` 3.60:1.
    - There is no toast and no announcement in view.
- **Principle.** Visibility of system status; continuity; feedback must leave a static cue in place.
- **Fix.**
  - Keep the button in place with its width while it spins.
  - On success, morph the card into a green state: check in a tinted circle, "Week confirmed", "Mon, Nov 9 · 9:41 PM". Keep it for the session.
  - Keep the "What changed" disclosure.
  - Announce through the existing `role="status"`.

### EM-015 · Medium · The phone shift sheet's actions don't use the Direction B icon treatment
- **Images:**
  - employee-phone/employee-state-schedule-sheet-390-state-schedule-sheet.png: bare regular-weight glyphs
  - Compare: employee-desktop/employee-desktop-state-panel-focus-1440-desk-panel-focus.png, with 36px tinted circles
- **What's wrong.** "Swap with someone", "Offer for cover" and "I can't work this shift" are regular-weight Phosphor glyphs with no circle on phones. The desktop panel draws them in tinted circles, red for "I can't work".
- **Cause.**
  - `src/components/employee-shift-sheet.tsx:112-114` (icons without `weight="bold"`).
  - The circles exist only in `src/app/app/employee-b-desktop.css:162-164`.
- **Principle.** Similarity; the DESIGN rule "Phosphor bold icons in 36px tinted circles"; phone and desktop parity.
- **Fix.** Move the circle rule out of the desktop layer into `employee-b/schedule.css`, and add `weight="bold"` to the three icons.

### EM-016 · Medium · Week controls on the phone hero are under target size
- **Images:**
  - employee-phone/employee-schedule-390.jpg
  - Audit: "Previous week" and "Next week" are 32×32; "Availability" is 124×36; at 320 each day cell is 38×62
  - employee-phone/employee-state-focus-schedule-8-390-state-focus-schedule-8.png
- **What's wrong.**
  - The week arrows are 32px circles at the thumb's far top-right.
  - The seven day buttons are seven separate tab stops before any content.
  - B1 covers desktop and tablet; this is the phone instance.
- **Principle.** Fitts's law; the 48px Direction B target; keyboard efficiency.
- **Fix.**
  - Extend the arrows' hit area to 44px with `::after` (no visual change).
  - Make the day strip one composite control: roving `tabindex`, with Left and Right arrows moving between days.

### EM-017 · Low · Desktop week-card blocks have ragged heights
- **Image:** employee-desktop/employee-schedule-1440.jpg
- **What's wrong.** The Mon and Tue blocks are 102px tall because of the "Now" and "Tomorrow" chips; the other days are 92px.
- **Principle.** Common region; edge consistency.
- **Fix.** Give every block the same height (`min-height` of the tallest, or `align-items: stretch`), with chips pinned to the bottom.

### EM-018 · Low · "Open shifts · None right now" is a link to an empty page
- **Image:** employee-phone/employee-schedule-390.jpg
- **What's wrong.** A full row with a chevron leads to "No open shifts right now".
- **Principle.** Information scent; Hick's law.
- **Fix.** When the count is 0, render it as a static row without a chevron, or fold it into a line under the week card: "No open shifts · Get alerts".

### EM-019 · Low · The time zone exists only for screen readers
- **Image:** employee-phone/employee-schedule-390.jpg
- **What's wrong.** The probe found ", Puerto Rico time" as `b-sr` text in the hero sub. Sighted users see times with no zone, while Updates detail shows "AST".
- **Principle.** Consistency; equal information.
- **Fix.** Either show the zone where it matters (people who work in several zones), or drop it from both.

---

## `/app/my-time`: Time, and Fix my time

### EM-020 · High · Fix my time: the first label sits on the teal band and the form isn't one white card
- **Images:**
  - employee-phone/employee-state-corrections-filled-390-state-corrections-filled.png
  - employee-phone/employee-state-corrections-send-incomplete-390-state-corrections-send-incomplete-fold.png
- **What's wrong.**
  - "What to fix" (13.5px/600, `#6A7176`) is drawn on the teal band.
  - Its computed contrast is 1.23:1 on `#0B6E69` and 1.16:1 on `#0C726C`.
  - The rest of the form sits loose on the canvas instead of in the lifted white card that DESIGN specifies ("a form's first label or a plain line never lands on teal"; "forms as one white card").
- **Cause.**
  - `src/components/employee-b/time.css:63-66` defines the card for `.c-page:has(> .b-screen) > .eb-fix`, but the render shows no card, so the selector isn't matching this markup.
  - The label colour is `time.css:71`.
- **Principle.** WCAG 1.4.3; figure-ground; common region.
- **Fix.** Make the card rule match the rendered structure, for example a class set on the form wrapper rather than the `:has` chain. Check in the browser that the white card starts 40px over the hero.

### EM-021 · Medium · Fix my time flags only the first empty field and disables Send
- **Image:** employee-phone/employee-state-corrections-send-incomplete-390-state-corrections-send-incomplete-fold.png
- **What's wrong.** After Send:
  - Only Location shows red.
  - Day, Start, End and the required Note are also empty but unmarked.
  - Send becomes grey and disabled, so the person fixes one field, retries, and finds the next.
- **Principle.** Errors that announce: validate all fields on submit and never disable submit. WCAG 3.3.1.
- **Fix.**
  - Mark every invalid field with `aria-invalid` and an inline message.
  - Focus the first one.
  - Keep Send enabled.
  - The error wording itself is the copy audit's.

### EM-022 · Medium · Live state uses teal chips; values change colour between rows
- **Images:**
  - employee-phone/employee-my-time-390.jpg
  - employee-desktop/employee-my-time-1440.jpg
- **What's wrong.**
  - "On the clock" and "In progress" are teal chips. DESIGN marks live as "a green dot for live", and Owner "Clocked in now" is green.
  - The current row's value "9 h 24" is teal, while "43 h" on Last week is ink. DESIGN: "a row's value is 15.5/700 ink".
- **Principle.** One colour, one meaning; similarity.
- **Fix.** Use a green dot plus the chip for clocked-in, ink for every row value, and teal only for information chips.

### EM-023 · Medium · Phone and desktop disagree on Time's order and content
- **Images:**
  - employee-phone/employee-my-time-390.jpg: Right now, This week, Last week
  - employee-desktop/employee-my-time-1440.jpg: This week on the left; Right now, Last week and "Your corrections" on the right
- **What's wrong.**
  - Desktop puts the live state second, in the right column.
  - "Your corrections" exists only on desktop. A phone user can reach their sent corrections only through the menu path the copy audit lists.
- **Principle.** Phone and desktop consistency; order by importance.
- **Fix.**
  - Make Right now the left column's first card on desktop.
  - Add the Your corrections row to the phone page, under Last week.

### EM-024 · Low · Small inconsistencies inside the Fix my time form
- **Image:** employee-phone/employee-state-corrections-filled-390-state-corrections-filled.png
- **What's wrong.**
  - The Start and End fields have no clock icon; time-off's time fields do (employee-state-requests-new-part-day-390…png).
  - The selected radio row's teal outline has square corners against the group's 22px radius.
  - The Day select defaults to "Sat, Oct 10", a month back.
- **Principle.** Similarity; nested radius.
- **Fix.**
  - Use one time-field component.
  - Give the selected row's outline the inner radius on first and last rows (`border-radius: inherit` on the first and last child).
  - Default Day to empty, matching "Choose a day" in the incomplete state.

---

## `/app/my-pay`: Pay

### EM-025 · Medium · Two competing titles, and phone and desktop pick different ones
- **Images:**
  - employee-phone/employee-my-pay-390.jpg
  - employee-desktop/employee-my-pay-1440.jpg
- **What's wrong.**
  - On the phone, the 30px H1 "Pay" is followed by a 34px "Fri, Nov 20", so the date outranks the page title.
  - On desktop the H1 is visually hidden and the date is the band's title. The audit finds `h1 "Pay"` with no visible counterpart.
- **Principle.** Visual hierarchy; heading level matches size; consistency.
- **Fix.** Choose one presentation for both widths. Either:
  - title "Pay", with the date as a figure (28/34) under "Next payday · in 11 days"; or
  - drop the visible "Pay" on the phone as desktop does.

### EM-026 · Medium · "Correction" and "Replaced" statements look identical
- **Images:**
  - employee-phone/employee-my-pay-390.jpg
  - employee-desktop/employee-my-pay-1440.jpg
- **What's wrong.** Two rows read "Fri, Nov 6 · For work Oct 26 – Nov 1" with grey chips of equal weight. Nothing shows which statement is current.
- **Principle.** Visual hierarchy; figure-ground.
- **Fix.**
  - Show the correction as the normal row with chip "Corrected".
  - Show the replaced one muted: grey text, chip "Replaced", sub "Replaced by the Nov 6 correction". Alternatively, nest it under the correction.

### EM-027 · Low · "See your hours" is a 32px target, and the desktop page has two routes to history
- **Images:**
  - employee-phone/employee-my-pay-390.jpg (audit: 144×32)
  - employee-desktop/employee-my-pay-1440.jpg ("Pay history" band pill and "See all" in Earlier)
- **Principle.** Fitts's law; redundancy.
- **Fix.**
  - Extend the glass button's hit area to 44px (`::after`).
  - On desktop keep one route: the band pill, and remove "See all".

### EM-028 · Low · Desktop Pay cards end at different heights
- **Image:** employee-desktop/employee-my-pay-1440.jpg
- **What's wrong.** "Last paycheck" ends at y=438 and "Earlier" at y=429.
- **Principle.** Edge alignment.
- **Fix.** Use `align-items: stretch` on the two-column row.

---

## `/app/requests/hub`: Requests

### EM-029 · High · The Waiting count includes the swap that needs your answer, which also has no chip
- **Images:**
  - employee-desktop/employee-requests-hub-1440.jpg
  - employee-phone/employee-requests-hub-390.jpg
- **What's wrong.**
  - The band says "Waiting 6 · on your manager or a teammate" and "Needs your answer 1".
  - The six are 1 incoming swap, 3 shift requests and 2 time-off requests, so the swap that waits on *you* is counted in both.
  - In the card, "A teammate requested a swap" is the first Waiting row with no status chip. Every other row has an amber chip.
  - The one item that needs action looks like the least urgent.
- **Cause.** `src/components/employee-b/requests-b.tsx:94` (`value: waiting.length + extraCount`) and `:106-107` (`waitingExtra` placed inside the Waiting card).
- **Principle.** Honest figures; visual hierarchy; amber means wait or check.
- **Fix.**
  - Count Waiting as `waiting.length` only.
  - Give the incoming swap its own first card, "Needs your answer", with an amber "Respond by Nov 18" chip and the teal Review button.
  - Put the amber dot on "Needs your answer" in the band, not on Waiting.

### EM-030 · Medium · Lists are not in date order
- **Images:**
  - employee-phone/employee-requests-hub-390.jpg: Shift requests Nov 24, Nov 15, Nov 17
  - employee-phone/employee-requests-390.jpg: Time off Nov 26, Nov 30 – Dec 2, Nov 10, with tomorrow's request last
  - employee-phone/employee-exchange-callout-390.jpg: same order as the hub
- **Principle.** Order by importance; recognition over recall.
- **Fix.** Sort by the date the request is for, soonest first, in the hub, Time off and My requests.

### EM-031 · Medium · The hub and Time off disagree on what is waiting
- **Images:**
  - employee-phone/employee-requests-hub-390.jpg: two waiting time-off requests, Nov 26 and Nov 30
  - employee-phone/employee-requests-390.jpg: three, adding Nov 10
- **What's wrong.** The two screens list different waiting time-off requests from the same run.
- **Status: Not verified.** It may be a fixture added between captures (the scan-leave-maria request is Nov 10). Worth checking the hub read's limit and filter.
- **Principle.** Consistency of counts.
- **Fix.** Confirm that the hub's waiting read returns every waiting time-off request, or say "Showing 2 of 3".

### EM-032 · Low · The desktop "Shift requests" card's second row says one thing and does another
- **Image:** employee-desktop/employee-requests-hub-1440.jpg
- **What's wrong.** "My schedule — Start a swap or cover offer" goes to Schedule. The phone has no such card, so Requests has no route to Pick up and swap on phones.
- **Principle.** Information scent; parity.
- **Fix.**
  - Title the row "Swap or give away a shift" (the copy audit's wording).
  - Show the same two rows on phones under Decided.

---

## `/app/requests` (Time off): list, detail and new request

### EM-033 · High · The list promises "withdraw it", but the detail page offers no way to withdraw
- **Images:**
  - employee-phone/employee-requests-390.jpg ("Open a request to see its details or withdraw it.")
  - employee-phone/employee-requests-requestid-scan-leave-maria-390.jpg (a waiting request; only "To change this request, contact your manager.")
- **What's wrong.** The person follows the instruction and lands on a page without the action.
- **Cause.** `src/components/employee-b/timeoff-b.tsx:100` against `src/app/app/requests/page.tsx:74`. The test at `page.test.tsx:31` asserts that there is no Withdraw.
- **Principle.** Match the promise; an error or dead end needs a way out.
- **Fix.** Use one of these:
  - Show "Withdraw request" (a red-outline pill, with confirmation) on waiting requests that can be withdrawn.
  - Change the list note to "Open a request to see its details." and say inside the detail why it can't be withdrawn.

### EM-034 · Medium · The detail card leads with metadata and drops the status colour
- **Image:** employee-phone/employee-requests-requestid-scan-leave-maria-390.jpg
- **What's wrong.**
  - The card header (17/700) is "Sent Mon, Nov 9", which outranks nothing important.
  - The requested day "Tue, Nov 10" sits under it.
  - The status "Waiting for your manager" is plain text, while the list shows it as an amber chip.
- **Cause.** `src/components/employee-b/timeoff-b.tsx:67`.
- **Principle.** Visual hierarchy; similarity (the same status drawn two ways).
- **Fix.**
  - Card title: the date range.
  - Meta line: "Sent Mon, Nov 9 · Family visit".
  - Status: an amber "Waiting" chip in the card header.

### EM-035 · Medium · Dotted lines start or end with "·", which breaks the Nov 7 rule
- **Images:**
  - employee-phone/employee-requests-requestid-scan-leave-maria-390.jpg: "Tue, Nov 10 · 7:00 AM – 3:00 PM ·" / "Main Office"
  - employee-phone/employee-updates-390.jpg: "Management · Mon, Nov 9" / "· Unread"
- **What's wrong.** DESIGN round 4 says a dotted line "never starts or ends a line with a ·".
- **Cause.**
  - `src/components/leave-staffing/own-leave-note.tsx:31` passes a plain joined string as `title`.
  - The Updates row meta is a plain string (`src/components/employee-b/messages-b.tsx:141-142`). Neither uses `Dotted` (`employee-b/parts.tsx:30`).
- **Principle.** Typography: wrap at segment boundaries.
- **Fix.**
  - Render both through `Dotted`.
  - For the shift line, put the date as the title and "7:00 AM – 3:00 PM · Main Office" as the sub.

### EM-036 · Medium · "Request not available" has no way forward
- **Image:** employee-phone/employee-requests-requestid-scan-leave-james-390.jpg
- **What's wrong.**
  - The card is a sentence only, with no icon and no button.
  - It says "Return to Time off", but the back circle says "Requests" and opens the hub, not Time off.
- **Principle.** Error recovery; consistency between message and control.
- **Fix.** Add a quiet pill "Back to Time off" (`/app/requests`) and a grey 48px icon, using the one empty or error state (EM-041).

### EM-037 · Medium · Request time off: the error sits in a half column and "To" is ambiguous
- **Image:** employee-phone/employee-state-requests-new-empty-send-390-state-requests-new-empty-send.png
- **What's wrong.**
  - "Choose a valid start date." wraps to two lines inside the 157px From column, leaving "date." alone on the second line.
  - The empty "To" field isn't flagged, and it isn't labelled optional, though "Reason (optional)" is.
- **Principle.** Clarity of required fields; wrapping.
- **Fix.**
  - Label "To (optional)", or require it.
  - Put the row's error full-width under both fields.
  - The wording is the copy audit's.

### EM-038 · Low · Desktop form controls are stretched and the action floats away from the column
- **Images:**
  - employee-desktop/employee-requests-tab-new-1440.jpg: the segmented track is 766px with a thumb about 24px tall inside a 44px track (not concentric); Send request is 766px wide
  - employee-desktop/employee-requests-1440.jpg: the band's "Request time off" pill ends at x=1376 while the reading column ends at 1108
- **Principle.** Concentric radius; align to shared edges; Fitts's law (an oversized target is not a better target).
- **Fix.**
  - On desktop, give the segment a max width of 360px and a 36px thumb.
  - Keep the primary at full card width only on phones.
  - On reading-column pages, cap `.b-hero` right actions to the 812px column. `employee-b-desktop.css:242-243` already caps `.eb-tools`/`.b-hrow`.

### EM-039 · Low · The "Waiting" chip repeats on every row of the Waiting tab
- **Image:** employee-phone/employee-requests-390.jpg
- **Principle.** Redundant information.
- **Fix.** Hide the chip when the tab already filters by that status, or show the part-of-day or duration in its place.

---

## `/app/exchange` (Pick up and swap) and `/app/availability`

### EM-040 · Medium · Desktop lights "Requests" while the page's back link says "Schedule"
- **Images:**
  - employee-desktop/employee-exchange-1440.jpg
  - employee-desktop/employee-exchange-tab-foryou-1440.jpg
  - employee-desktop/employee-desktop-state-error-exchange-1440-desk-error-exchange.png
  - Compare: phone employee-exchange-390.jpg, which lights Schedule
- **Cause.** `src/lib/navigation.ts:177-180`: the sidebar maps `/app/exchange` to `/app/requests/hub` unless `tab=available`. The phone tab (`:253`) maps it to Schedule.
- **Principle.** Navigation clarity; Jakob's law.
- **Fix.** Map every `/app/exchange*` route to Schedule on desktop too, to match the back link, the phone and DESIGN ("shift swaps, open shifts and Availability light Schedule").

### EM-041 · Medium · The empty-state link says "phone" on desktop and leads to a dead end
- **Images:**
  - employee-desktop/employee-exchange-1440.jpg ("Get alerts on this phone")
  - employee-phone/employee-profile-device-alerts-390.jpg ("Your workplace hasn't turned on device alerts", chip "Unavailable")
- **Cause.** `src/components/employee-b/requests-b.tsx:62`.
- **Principle.** Information scent; no dead-end calls to action.
- **Fix.**
  - Say "Get alerts on this device".
  - Hide the link when the workplace has alerts off; the alerts page already knows this state.

### EM-042 · Low · Count format on tabs differs by width and page
- **Images:**
  - employee-desktop/employee-exchange-1440.jpg ("For you · 1")
  - employee-phone/employee-exchange-390.jpg ("For you", no count)
  - employee-phone/employee-notifications-390.jpg ("Unread 9")
- **Principle.** Similarity.
- **Fix.** Use one format: the label plus a small count pill, at every width.

### EM-043 · Low · `/app/exchange/swap` without a shift silently shows Open shifts
- **Image:** employee-phone/employee-exchange-swap-390.jpg
- **Principle.** Visibility of system status.
- **Fix.** Show a note card first: "Choose the shift you want to swap" with "Open Schedule".

### EM-044 · Low · The same disclosure has two titles
- **Images:**
  - employee-phone/employee-state-schedule-open-390-state-schedule-open.png ("Shifts you can't pick up 1")
  - employee-phone/employee-exchange-390.jpg ("Why other shifts aren't available")
- **Principle.** Consistency.
- **Fix.** Use one title, and show the count in both.

### EM-045 · Medium · Availability: a permanently disabled Save, and a misaligned desktop footer
- **Images:**
  - employee-phone/employee-availability-390.jpg
  - employee-desktop/employee-availability-1440.jpg
- **What's wrong.**
  - A grey, disabled, full-width "Save" is always shown, though nothing can change until a day row is opened.
  - On desktop, Save is right-aligned while the helper line under it is centred.
  - The desktop rows have full-bleed dividers (x 296–1108), while every other card's dividers are inset.
- **Principle.** Disabled controls without a reason add noise (B5 covers the look; this is about presence); alignment.
- **Fix.**
  - Show Save only when there are changes ("1 change · Save" in a sticky bar).
  - Left-align the helper.
  - Inset the dividers to the text edge.

---

## `/app/updates`, `/app/updates/[id]` and `/app/notifications`

### EM-046 · Medium · Desktop: the Updates search starts 20px inside the band's text edge
- **Image:** employee-desktop/employee-updates-1440.jpg (search at x=316, title and back link at x=296)
- **Cause.** `src/components/employee-b/account.css:96`: `.eb-tools { margin: 16px 20px 0 }`. The phone gutter carries into the desktop band, and `employee-b-desktop.css:243` caps the width but not the margin.
- **Principle.** Align to shared edges.
- **Fix.** Set `margin-inline: 0` for `.eb-tools` at 768px and up.

### EM-047 · Medium · Notification rows are indistinguishable, and "Action needed" is drawn two ways
- **Images:**
  - employee-phone/employee-notifications-390.jpg
  - employee-desktop/employee-notifications-1440.jpg
- **What's wrong.**
  - Five rows say "Schedule update" and two say "Team update"; the subject never appears.
  - The first "Team update · Action needed" has an amber icon circle. The four "Schedule update · Action needed" rows have grey circles and only grey sub text.
- **Principle.** Information scent; Miller's law; similarity; amber means check.
- **Fix.**
  - Show the notice subject in the title, for example "Schedule for Nov 16 – 22 changed". The payload wording is the copy audit's.
  - Give every required row the same amber icon circle and an amber "Action needed" chip.

### EM-048 · Low · Earlier notifications repeat their date
- **Images:**
  - employee-desktop/employee-notifications-1440.jpg ("Nov 5" at the right and "Thu, Nov 5 · 2:25 PM" in the sub)
  - employee-phone/employee-notifications-390.jpg (wraps to three lines with "2:25 PM" alone)
- **Cause.** `src/components/employee-b/messages-b.tsx:112`.
- **Principle.** Redundancy; widows.
- **Fix.** Use "Nov 5" at the right and "Action needed · 2:25 PM" in the sub.

### EM-049 · Low · The same action has two names, and the detail's H1 is generic
- **Images:**
  - employee-phone/employee-updates-390.jpg ("Confirm")
  - employee-phone/employee-updates-3f100c55-dc91-49e8-a5d3-56e7fc668a24-390.jpg ("Acknowledge update"; H1 "Team update" with the real title second)
- **Principle.** Consistency (the copy audit owns the wording); hierarchy.
- **Fix.**
  - Use one verb.
  - Make the update's own title the H1, with "Team update · Management · Nov 9, 9:25 PM" as the sub.

### EM-050 · Low · Unread is marked teal in lists and coral on the bell
- **Images:**
  - employee-phone/employee-updates-390.jpg
  - employee-phone/employee-notifications-390.jpg (teal dots)
  - The header bell (coral dot)
- **Principle.** One colour, one meaning.
- **Fix.** Use the coral unread dot in lists too. DESIGN names coral as the unread mark.

---

## Shared padding: desktop text blocks against rows

### EM-051 · Medium · On desktop, padded text blocks sit 4px inside the row text edge
- **Images:**
  - employee-desktop/employee-updates-3f100c55-dc91-49e8-a5d3-56e7fc668a24-1440.jpg: first card text at x=315, second at x=319
  - employee-desktop/employee-profile-privacy-1440.jpg and employee-profile-support-1440.jpg: intro card text at x=615, accordion card at x=619
  - employee-desktop/employee-desktop-state-offline-my-pay-1440-desk-offline-my-pay.png: card text at x=155, against the 159 used elsewhere
- **What's wrong.** Two stacked cards have text on different vertical lines.
- **Cause.** The phone paddings of 18px carry to desktop, where rows are 22px:
  - `src/components/employee-b/account.css:111` (`.eb-update`) and `:152` (`.eb-doc`)
  - `src/components/employee-b/pay.css:20`
  - `src/components/employee-b/requests.css:40` (`.eb-text`)
  - `src/components/owner-b/owner-b.css:353` (`.b-route-state`)
- **Principle.** Align to shared edges.
- **Fix.** At 1024px and up, set these blocks to 22px inline padding, matching desktop rows.

---

## `/app/more`, `/app/profile` and `/app/account/delete`

### EM-052 · Medium · "Security" holds only Delete my account; `/app/profile/passkeys` is plain Profile
- **Images:**
  - employee-phone/employee-profile-390.jpg
  - employee-desktop/employee-profile-1440.jpg
  - employee-phone/employee-profile-passkeys-390.jpg: identical to Profile; title "Profile and settings"
- **What's wrong.**
  - A section called Security without sign-in or passkey settings sets a wrong expectation.
  - The passkeys URL lands on the same page with nothing about passkeys.
- **Principle.** Information scent; navigation clarity.
- **Fix.**
  - Rename the section "Account" while it holds only deletion.
  - Have `/profile/passkeys` either show the passkey rows or redirect to Profile with a note.

### EM-053 · Medium · Delete account is a form but keeps the tab bar and header icons, and disables its button until valid
- **Images:**
  - employee-phone/employee-account-delete-390.jpg
  - employee-phone/employee-state-account-delete-armed-390-state-account-delete-armed.png
- **What's wrong.**
  - DESIGN: "forms … hide the bell and avatar; forms also hide the tab bar". Here both remain, and the tab bar lights Home.
  - "Delete my account" is a pale pink disabled pill (2.37:1) until the password and checkbox are filled.
  - The checkbox is 24×24 (audit).
- **Principle.** Consistency with the form pattern; validate on submit; Fitts's law.
- **Fix.**
  - Hide the tab bar and header actions on `/app/account/delete`.
  - Keep the destructive button enabled, and show errors on submit.
  - Make the whole checkbox label row the 48px target.

### EM-054 · Low · Sign out is red on More (new instance of C13)
- **Image:** employee-desktop/employee-more-1440.jpg; the phone More has the same row below the fold
- **Principle.** Red means stop or destructive.
- **Fix.** Use ink or teal text, as in C13.

### EM-055 · Low · Desktop More has no current item in the sidebar
- **Image:** employee-desktop/employee-more-1440.jpg
- **What's wrong.** Nothing is highlighted, while the phone lights Home (DESIGN).
- **Principle.** Navigation clarity.
- **Fix.** Light Home, as on phones, with `aria-current="true"` (matching the round 4 rule).

### EM-056 · Low · Small Profile details
- **Images:**
  - employee-phone/employee-profile-390.jpg (audit: English 77×34, Español 82×34)
  - employee-desktop/employee-desktop-state-error-profile-1440-desk-error-profile.png
- **What's wrong.**
  - The language segment is 34px tall.
  - The Profile error shows "–" for Name while the account menu on the same screen shows "Maria Rivera".
- **Fix.**
  - Extend the hit area to 44px.
  - Fill Name from the session the shell already has.

---

## `/app/help` and the policy pages: Privacy, Terms, Support, Account deletion

### EM-057 · Medium · Desktop policy text runs about 105 characters per line
- **Images:**
  - employee-desktop/employee-profile-privacy-1440.jpg
  - employee-desktop/employee-profile-support-1440.jpg
- **What's wrong.** Paragraphs span about 740px at 15px.
- **Principle.** Cap the measure at 60–75 characters.
- **Fix.** Set `max-width: 68ch` on `.eb-doc p` and `li` at desktop widths. The card can stay wide for the headings.

### EM-058 · Low · Account deletion page: the main action floats outside the card, and its TOC heading differs
- **Image:** employee-phone/employee-profile-account-deletion-390.jpg
- **What's wrong.**
  - "Review deletion request" is a grey pill on the canvas below the accordions.
  - The contents heading reads "On this page"; Privacy uses "In this policy".
- **Principle.** Common region; consistency.
- **Fix.**
  - Put the action at the foot of the lead card as a quiet pill.
  - Use one contents label.

### EM-059 · Low · Help's Contact card mixes a link row with a dense policy paragraph
- **Image:** employee-phone/employee-help-390.jpg
- **What's wrong.** Five lines of 13.5px grey sit under the email row, with a bold warning at the end.
- **Principle.** Hierarchy; density.
- **Fix.**
  - Keep one line ("We reply within two business days").
  - Move the warning into a tinted note with the lock icon.
  - The full hours text can live on Support.

---

## `/app/no-such-page`: 404

### EM-060 · Medium · The phone 404 is still the old corporate page
- **Images:**
  - employee-phone/employee-no-such-page-390.jpg: white header, navy wordmark with 9px "Workforce", a teal numeric "9" bell badge instead of the coral dot, and an ink title on the canvas
  - Compare: employee-desktop/employee-no-such-page-1440.jpg, which has the band
- **Cause.** `src/app/app/not-found.tsx:10-20` renders `RootChrome` plus `CorpTitle`, and no `BScreen`/`BHero` for phones.
- **Principle.** Consistency (Jakob's law); aesthetic-usability.
- **Fix.** Render a `BScreen` with a `BHero` ("This page doesn't exist", with the back circle to Home) and the same card, matching the desktop 404 and DESIGN's 404 rule.

---

## Cross-screen patterns

### EM-061 · High · New contrast failures on the Employee desktop top bar and week card
- **Images:**
  - employee-desktop/employee-home-1440.jpg and every desktop audit: the glass Search trigger is "Search" 3.42:1 and "Ctrl K" 3.54:1
  - employee-desktop/employee-schedule-1440-long-names.jpg (audit): the "Now" chip on the solid teal day block is 4.18:1
- **What's wrong.** These are control and chip labels under 4.5:1. They are new instances of the C1 and C2 families (the command-finder trigger and the week-card chip are not listed there).
- **Principle.** WCAG 1.4.3.
- **Fix.**
  - Raise the trigger label to white at 0.9 or more on the glass (C1's alpha table).
  - Make the "Now" chip on a solid teal block a solid white chip with teal text.

### EM-062 · Medium · Loading, error and offline states are seven different components
- **Images:**
  - **Loading:**
    - employee-phone/employee-home-390-loading.jpg: card title plus a line
    - employee-phone/employee-my-time-390-loading.jpg: no title, plus a disabled "Checking…" button as a placeholder
    - employee-phone/employee-requests-390-loading.jpg: a line only
    - employee-desktop/employee-exchange-tab-foryou-1440.jpg: the right pane is a disabled "Checking…" button
  - **Error:**
    - employee-phone/employee-home-390-error.jpg
    - employee-phone/employee-requests-390-error.jpg
    - employee-desktop/employee-desktop-state-error-requests-hub-1440-desk-error-requests-hub.png: a 1058px-wide grey "Try again" next to text that already says "Try again"
    - employee-desktop/employee-desktop-state-error-profile-1440-desk-error-profile.png
  - **Offline:**
    - employee-phone/employee-my-time-390-offline.jpg: disabled Try again
    - employee-phone/employee-requests-390-offline.jpg: no button
    - employee-desktop/employee-desktop-state-offline-my-pay-1440-desk-offline-my-pay.png: title plus explanation (the best one)
- **What's wrong.**
  - None has an icon or a status colour.
  - Loading never uses a skeleton.
  - Error states also remove unrelated primary actions: "Request time off" disappears from the band and the card when the list fails.
- **Cause.**
  - `home-b.tsx:221-226`
  - `time-b.tsx:58-59`
  - `timeoff-b.tsx:114`
  - `messages-b.tsx:38-41`
  - `pay.css:20`
- **Principle.** Consistency; visibility of system status; a fake disabled button is a false affordance.
- **Fix.** One `BStateCard`:
  - a 48px icon circle: grey while loading, amber for offline or paused, red for failed
  - a 16/22 title and one line
  - one quiet 48px pill no wider than 280px on desktop
  - skeleton rows for loading
  - keep the page's own primary action (Request time off, Write an update) visible in every state

### EM-063 · Medium · Phone touch targets under 44px across Employee pages
- **Images and audit:**
  - Glass segmented tabs at 34px:
    - employee-phone/employee-exchange-390.jpg (114×34)
    - employee-requests-390.jpg (171×34)
    - employee-notifications-390.jpg (171×34)
    - employee-profile-390.jpg (77×34)
  - Glass hero buttons:
    - "See your hours" 144×32 (employee-my-pay-390.jpg)
    - "Past timecards" 129×36
    - "Change one week" 171×36
    - "Availability" 124×36
  - Row "Review" pills: 77×36 (employee-home-390.jpg)
  - Week arrows: 32×32 (EM-016)
- **What's wrong.** DESIGN draws 34px segment thumbs, which is a visual size; the 48px+ target rule still applies. B1 covers only the 768px+ layer.
- **Principle.** Fitts's law; the Direction B 48px targets; WCAG 2.5.8 is met (24px) but the product standard is not.
- **Fix.** Add a `::after` hit extension to 44–48px on `.b-seg button`, `.b-btn--glass` and `.b-row .b-btn`, with no visual change. The kit already does this for `.b-btn` (+4px), so extend that rule to the segment and glass variants.

### EM-064 · Medium · Phone and desktop disagree on the same page
**Instances:**
- EM-013: Confirm order on Schedule
- EM-015: sheet icons
- EM-023: Time order, and Your corrections on desktop only
- EM-025: Pay title
- EM-032: Shift requests card on desktop only
- EM-040: navigation highlight
- EM-042: tab counts
- **Pick up and swap:** "Want more shifts? Update when you can work" appears on desktop (employee-exchange-1440.jpg) but not on phones (employee-exchange-390.jpg).

**Principle.** Consistency; Jakob's law (someone who uses both learns two products).

**Fix.** Keep a parity table in DESIGN.MD (DESIGN already has a phone-or-desktop column for some items). For each page, list deliberate differences (the week card, the band actions) and treat every other difference as a bug.

### EM-065 · Low · No skip link on phones
- **Evidence.** Manifest keyboard order for `/app` at 390: brand, bell, avatar, then content. There is no "Skip to content", while 1440 has one.
- **Cause.** `src/app/app/premium-desktop.css:256` hides `.portal-skip-link` below 761px ("Phones don't need it").
- **Principle.** WCAG 2.4.1. A landmark satisfies it, so this is Low, but external keyboards and switch users on phones and tablets do tab.
- **Fix.** Show the skip link on focus at every width.

### EM-066 · Low · Focus rings on a card's last row are clipped by the card's corners
- **Image:** employee-phone/employee-state-focus-my-pay-8-390-state-focus-my-pay-8.png (the bottom corners of "Fri, Nov 6 · Replaced" are cut off)
- **Principle.** A visible focus indicator should be whole.
- **Fix.** On the first and last rows, give `.b-row:focus-visible` an inset ring with `border-radius: inherit`, or 18px on the corners next to the card's edge. DESIGN asks for rings "drawn inside full-width rows".

### EM-067 · Low · List dividers switch between inset and full-bleed inside one card
- **Images:**
  - employee-desktop/employee-home-1440.jpg: the line above "Read the team update" runs to the card edge
  - employee-desktop/employee-requests-hub-1440.jpg: the line under "A teammate requested a swap"
  - employee-desktop/employee-availability-1440.jpg: every line
- **Cause.**
  - A second `<ul class="b-list eb-desk">` at `home-b.tsx:220`.
  - `waitingExtra` outside the list at `requests-b.tsx:107`.
- **Principle.** Similarity; continuity.
- **Fix.** Render those rows inside the same `BList`, or give `.b-list + .b-list` the inset top border that rows use.

### EM-068 · Low · The keyboard shortcut label changes between captures
- **Images:**
  - employee-desktop/employee-desktop-state-loading-notifications-1440-desk-loading-notifications.png ("⌘K")
  - every other desktop capture ("Ctrl K")
- **Principle.** Consistency; a sign of a hydration mismatch.
- **Fix.** Decide the platform label on the client once, after hydration, and keep it stable.

---

## Verification and gaps

**Run.**
- Viewed every distinct Employee route and state at 390 or 1440 with the Read tool, and spot-checked 320 and 1280:
  - Home, Schedule, Time, Pay, Requests, Time off (with the decided filter, new request and both request ids), Pick up and swap (all tabs), Availability
  - Updates and an update, Notifications, More, Profile and its sub-pages, Help, Delete account, 404
  - every loading, error and offline capture
  - the shift sheet and the desktop panel, the finder, confirm before, pending and after
  - focus captures, corrections, calendar, alerts
  - the 844 captures
- Read every Employee `audit.json` (tap targets, small text, contrast, axe and overlaps).
- Read the manifest's Employee keyboard orders.
- Located causes with grep and read the cited lines.
- Computed the contrast for EM-020.

**Not verified.**
- Real interaction (hover, press scale, motion and reduced motion) and screen-reader output.
- Whether the desktop row text measured at 4.26:1 by the probe really sits on `#ECEEEF`. On screen the rows look white, so I report nothing.
- EM-031's data cause.
- The pickup-failed state: `employee-state-exchange-pickup-390…failed.png` shows no open shifts, so the failure was never reached.
- Availability and callout validation (`not_captured`: timeout or no submit).

**Capture artefacts left out.**
- The fixed tab bar painted mid-page in full-page shots.
- The desktop sidebar ending at y=900 on tall pages.
- Faded entrance frames (employee-state-loading-my-time-390…png).
- The probe's 1.05–1.10:1 band contrast.

**Keyboard data.** The 390 keyboard order for `/app` cycles tab bar, header and tab bar without reaching content. The focus captures show content is reachable (stop 8 is the swap row), so I treated it as an artefact of the starting point.

**Sideways phone (844×390).** It shows the corporate page (employee-desktop/employee-state-home-844-state-home-844x390-fold.png). DESIGN round 4 records this as accepted, so I report nothing. Jose may want to revisit it now that tablets and desktop are Direction B.

## Counts

- High: 001, 002, 008, 020, 029, 033, 061 = **7**
- Medium: 003, 004, 005, 006, 007, 011, 012, 013, 014, 015, 016, 021, 022, 023, 025, 026, 030, 031, 034, 035, 036, 037, 040, 041, 045, 046, 047, 051, 052, 053, 057, 060, 062, 063, 064 = **35**
- Low: 009, 010, 017, 018, 019, 024, 027, 028, 032, 038, 039, 042, 043, 044, 048, 049, 050, 054, 055, 056, 058, 059, 065, 066, 067, 068 = **26**

**Total: 68 (7 High, 35 Medium, 26 Low).**

## Top 10 for the Employee area

1. **EM-001:** Home's "Clock in on the tablet" contradicts "Clocked in at 12:02 PM" on Time. Branch the notice on punch state.
2. **EM-002:** Offline wipes loaded content under a pill that says "Showing what was loaded". Keep the last snapshot, or change the pill.
3. **EM-029:** Requests counts the swap that needs *your* answer as waiting on others, with no chip. Give it its own amber card.
4. **EM-033:** The Time off list promises "withdraw it", and the detail has no Withdraw. Add the action, or stop promising it.
5. **EM-020:** The Fix my time label sits on teal (1.23:1) and the form card isn't rendering. Repair the card selector.
6. **EM-061 and EM-008:** Accessibility failures on the most-seen chrome: the desktop Search trigger and "Now" chip contrast, and the invalid `dl` markup in the hero figures.
7. **EM-062:** One state component (icon, title, line, a capped pill, skeleton loading) for loading, error and offline, keeping each page's primary action.
8. **EM-003:** Things to do: one row style, at most one teal button, one tab stop per row.
9. **EM-064 (with EM-013, 023, 040):** Phone and desktop parity, especially Confirm placement on Schedule and the navigation highlight on Pick up and swap.
10. **EM-004 and EM-012:** One hours format ("9 h 24", "11 h 30") and one time format ("7:00 AM – 3:00 PM") on every Employee screen.
