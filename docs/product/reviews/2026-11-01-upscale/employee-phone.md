# Employee on a phone: ways to make it better

The Employee phone app is already well behind the floor Jose set. It uses one font, Inter. The size set is short: 24, 20, 17, 15, 13 and 11. Rows are 56px tall, cards have a 12px radius, and the top bars are centred correctly. With reduced motion on, sheets appear at once. What still holds it back from feeling premium is mostly unfinished states and inconsistencies, not layout:
- the loading state swaps the title and pushes the page down;
- three different empty-state patterns, plus some states (like an empty week) that read as stuck;
- the error, 404 and Help pages fall outside the app;
- the tab bar mixes two icon weights;
- some row titles are 600 and some 500;
- the time-off form shows the tab bar and leaves a grey band;
- Pay shows no money.

**Tastemaker verdict: Competent, close to Tasteful.** A work tool for hourly staff has a ceiling of "Coherent" (TS-011), and this app almost reaches it. Its craft by area:
- Spacing: good.
- Type: one weight drift (CR-101).
- Colour: good; teal is used only for actions.
- Shadow: a consistent two-layer token.
- Alignment: a centred caption breaks the strong left edge (CR-402).
- Finish of edge states: weak (TS-005).

This judges craft and taste only. It does not show that the flows work or that the right problems are being solved.

## How the evidence was gathered

- **Screens:** today's captures, plus new ones I took in WebKit with a mobile, touch, 2x context and the saved AR0142 session. One browser at a time; nothing was submitted.
  - Phone portrait at 390×844 and 320×690.
  - Phone landscape at 844×390.
  - Reduced motion.
  - Loading forced by delaying page-data requests 4 seconds.
  - Offline, bad record IDs and a 404.
- **Measurements:** computed styles. Every pushed-page title is centred (centre at 195–196 on a 195 viewport centre), so that is not an issue.
- **Approved boards:** I rendered C-Employee, G-E-* and the E-* boards to compare against. They are in `scratchpad/review-mobile-employee/boards/` (montages are `mb1.png` to `mb5.png` in the folder above it).
- **References:** Mobbin has no screens from Homebase, 7shifts, When I Work, Square Team, Deputy or Connecteam (my searches returned none). So I cite only Mobbin apps I actually looked at: Gusto Mobile and consumer apps.

**One thing in the brief doesn't match.** It says Home is "the approved v5 option A teal shift card". Memory says v5 was superseded on Oct 25 and that Corporate (C-Employee, white card) was approved on Oct 26. The live Home matches C-Employee, so I reviewed it against C-Employee. Please confirm with Jose.

Screenshot folders, used in the paths below:
- **NEW** = `scratchpad/review-mobile-employee/shots/`
- **OLD** = `scratchpad/review-ui/shots/`

---

## Quick wins (S)

**S1. Tab bar: active icons use two different weights**
- **Screen:** every tab.
- **What's off:** active Home uses the Phosphor fill glyph. Active Schedule, Time, Pay and Requests use the bold glyph. The tab press dims to `opacity: .55` with no transition (`corp-shell.css:280`), which flashes.
- **Evidence:** `scratchpad/review-mobile-employee/tabs.png`
- **Rule:** Jose's rules 1 and 5; TS-006 Single Voice; ui-ux-pro-max "Consistency".
- **Reference:** Gusto Mobile tab bar (filled active Home) https://mobbin.com/screens/b33cbe23-2e76-4efb-b47d-9739caf5b38f
- **Fix:**
  - Active state: `weight="fill"` for all five icons, 24px, #0B6E69; label 11/600 teal.
  - Inactive state: `weight="regular"`, #6B7075, label 11/500.
  - Press feedback: replace the .55 dim with no dim (iOS behaviour), or icon-only `scale(.94)` over 80ms ease-out.
  - Pay glyph: consider Phosphor `Wallet` instead of the credit card (a card reads as spending).

**S2. Row titles are 600 on two screens and 500 everywhere else**
- **Screens:** More and Availability.
- **What's off:** More rows ("Availability", "Notifications"…) and Availability day names render 15/600. The kit's `.c-row__title` is 15/500, and Profile, Pay, Requests and Schedule rows use it.
- **Evidence:** compare these three:
  - `OLD/E-webkit-390-home_more.png`
  - `OLD/E-webkit-390-home_availability.png`
  - `OLD/E-webkit-390-home_profile.png`
- **Rule:** Jose's rule 2; CR-101 weight and colour hierarchy; CR-102.
- **Reference:** Gusto Mobile Paycheck rows are one uniform weight: https://mobbin.com/screens/b9bf269f-2d5e-4f19-9ada-338ae6cdebdf
- **Fix:**
  - All row labels 15/500 #1A1C1E; values 15/400 #6B7075.
  - Availability rows: 48px to 56px (`.c-row` min-height), so they match every other list.

**S3. Home "Confirm your schedule" crams two weeks into one row**
- **Screen:** Home.
- **What's off:** the row reads "Oct 26 – Nov 1 and Nov 2 – 8". The first week ends today, and "Review" links to that past week (`/app/schedule?week=2026-10-26`).
- **Evidence:** `OLD/E-webkit-390-home.png`
- **Rule:** TS-003 One-Thing Rule; Jose's rule 6.
- **Reference:** C-Employee board row "Confirm next week's schedule · Nov 2 – 8 · 5 shifts".
- **Fix:**
  - One row per week, nearest first: "Confirm next week's schedule", detail "Nov 2 – 8 · 4 shifts", right-hand link "Review" (13/500 teal) pointing to `?week=2026-11-02`.
  - Weeks that have ended drop off Home and stay confirmable on Schedule.

**S4. Home next-shift card: centred caption under a full-width secondary button**
- **Screen:** Home.
- **What's off:**
  - "Clock in on the Condado tablet." is 13/400 grey and **centred** (x 99, width 192). It breaks the card's left edge.
  - The 44px full-width "View shift" outline button repeats what tapping the card should do.
- **Evidence:** `OLD/E-webkit-390-home.png`
- **Rule:** CR-402 one strong edge (strong); TS-010 Editing vs. Listing.
- **Reference:** BlaBlaCar "Your rides" card: one strong left edge, with the status as the header row. https://mobbin.com/screens/4fdee371-c371-4f0e-ba58-a1cceab75de9
- **Fix:**
  - Body: "8:00 AM – 4:00 PM" (20/600), then "Mon, Nov 2 · Barista · Condado" (15/400 #4A4F54).
  - Footer (`.c-card__foot`, `inset 0 1px 0 #EDEEEF`, 12px 16px padding): left "Clock in on the Condado tablet" (13/400 #6B7075, left-aligned); right "Shift details ›" (13/500 teal `.c-link`).
  - Make the whole card body the link.
  - The card shrinks by about 44px and the clock-in rule reads as a fact, not a footnote.

**S5. Shift sheet: "8 h" sits on its own line**
- **Screen:** Schedule, shift sheet.
- **Evidence:** `NEW/p390-shift-sheet.png`
- **Rule:** CR-002 proximity.
- **Reference:** board E-ShiftDetail ("8 h · 30 min meal · Lead: Priya Lal").
- **Fix:** one detail line, "Barista · Condado · 8 h" (15/400 #4A4F54). Add meal and lead to the same line when the data has them, and keep the "Tomorrow" pill top-aligned with the time.

**S6. "What changed in your schedule" reads like a raw diff**
- **Screen:** Schedule, "What changed" expanded.
- **What's off:**
  - Each change is printed as "Shift added / Before: No shift / After: Nov 2 · 8:00 AM – 4:00 PM · Condado · Barista".
  - "Before: No shift" is noise.
  - The order is "Condado · Barista" here but "Barista · Condado" everywhere else.
- **Evidence:**
  - `NEW/p390-sched-changed.png`
  - `NEW/p390-sched-scrolled.png`
- **Rule:** TS-006; ui-ux-pro-max "Plain language / consistency".
- **Fix:**
  - One row per change:
    - title: "Added · Mon, Nov 2" (15/500);
    - detail: "8:00 AM – 4:00 PM · Barista · Condado" (13 grey).
  - "Before → After" only for edits: "Moved · Thu, Nov 5", detail "Was 9:00 AM – 5:00 PM".

**S7. "New request" opens only the time-off form**
- **Screen:** Requests hub.
- **What's off:** the hub subtitle promises "Time off, swaps and shift changes", but New request goes straight to `?tab=new`, which is the time-off form only.
- **Evidence:**
  - `NEW/p390-newreq.png`
  - `OLD/E-webkit-390-home_requests_hub.png`
- **Rule:** TS-003; Jose's rule 6 (honest labels).
- **Fix:**
  - Rename the button "Request time off".
  - Subtitle: "Time off and shift changes you've sent". Swaps start from a shift, which is already true.

**S8. Paycheck page: two PDF rows and a year nobody needs**
- **Screen:** Pay, statement page.
- **What's off:**
  - "View PDF" and "Download PDF" are two rows for one document.
  - The payday shows "Tue, Oct 20, 2026", while the rest of the app omits the current year.
- **Evidence:**
  - `NEW/p390-statement-corr.png`
  - `NEW/p390-statement-plain.png`
- **Rule:** TS-010; CR-501.
- **Reference:** Gusto Mobile has one "Show paystub PDF" row: https://mobbin.com/screens/b9bf269f-2d5e-4f19-9ada-338ae6cdebdf
- **Fix:**
  - One row, "Pay statement (PDF)", with a Phosphor `ArrowSquareOut` on the right. On iOS it opens the share-sheet viewer, which already offers Save.
  - Year only when it isn't the current year.

**S9. Time "Right now" card says "not clocked in" twice and drops the location**
- **Screen:** Time.
- **What's off:**
  - The "Off the clock" pill and the "Not clocked in" heading say the same thing.
  - "Clock in on your location's tablet" is vague, while Home names "Condado".
- **Evidence:** `OLD/E-webkit-390-home_my_time.png`
- **Rule:** Jose's rule 6; TS-006.
- **Fix:**
  - Remove the pill.
  - Card head "Right now" only; body "Not clocked in" (20/600), then "Clock in on the Condado tablet." (13 grey).
  - With several locations, use "Clock in on the tablet where you work."

**S10. Icon tiles inside sheets and detail pages**
- **Screens:**
  - Offer for cover: "Your team at Condado", group icon in a grey circle.
  - I can't work: "Your manager gets this right away", person icon.
  - Time-off detail: "Waiting on your manager", person icon.
- **Evidence:**
  - `NEW/p390-cover.png`
  - `NEW/p390-cantwork2.png`
  - `NEW/p390-req-detail.png`
- **Rule:** Jose's Oct 23 rule (no coloured icon tiles; icons only in the bars); memory "AI tells: icon in a box".
- **Reference:** the boards themselves (E-CoverSheet avatar stack "DK JT SO"; E-CantWorkSheet and E-TimeOffDetail use "AC Ana Colón" initials). Rendered in `scratchpad/review-mobile-employee/mb2.png` and `mb4.png`.
- **Fix:**
  - Use the 32px `.c-av` with initials (#E6F1EF / #0B6E69) when a name is known. For the team, use up to 3 avatars overlapped by 8px with a 2px white ring.
  - With no name, drop the icon and keep the text row.

**S11. The focus ring is 3px instead of the kit's 2px**
- **Screen:** Home, Quick guide card.
- **What's off:** the card's keyboard focus ring is `3px solid #0B6E69`. The kit (`corp.css:22`) says `2px solid #0B6E69`, offset 2px.
- **Evidence:** `NEW/p390-focus-home.png`
- **Rule:** CR-403 radius consistency; ui-ux-pro-max "visible focus".
- **Fix:** remove the 3px override so every focusable element uses the kit ring.

**S12. The week strip shades past and future workdays the same**
- **Screen:** Schedule, current week.
- **What's off:** Mon 26 to Fri 30 (already worked) get the same #E6F1EF tint, teal 600 numbers, as upcoming shift days. "Today" is solid teal.
- **Evidence:** `NEW/p390-sched-current.png`
- **Rule:** CR-101 hierarchy; TS-007.
- **References:**
  - DoorDash Dasher schedule strip: https://mobbin.com/screens/7f924d2b-98f4-499a-9e9f-45a8021912f8
  - Outlook week strip: https://mobbin.com/screens/f31a7a00-c2da-40ab-aa35-1b92cd641ae5
- **Fix:**
  - Past days: no fill; numbers 15/500 #A7ACB1 if not worked, 15/600 #6B7075 if worked.
  - Future shift days keep the tint.
  - Today: a 1.5px teal ring when not selected.
  - Selected: solid teal with a white number.

**S13. Midnight hint shows even when the end time isn't midnight**
- **Screens:** time-off "Part of day" and the Availability day sheet.
- **What's off:** "An end time of 12:00 AM means midnight at the end of this day." is always visible.
- **Evidence:**
  - `NEW/p390-timeoff-part.png`
  - `OLD/F-webkit-390-E-avail-sheet.png`
- **Rule:** ui-ux-pro-max "Progressive disclosure"; Jose's rule 7.
- **Fix:** show the hint (13 grey, 6px under the End field) only when End = 12:00 AM.

**S14. Fix my time: Send looks ready when it isn't, and placeholders look like values**
- **Screen:** Time, Fix my time.
- **What's off:**
  - Header "Send" is full teal while the required note is empty. The spec says #A7ACB1 when disabled.
  - Start and End show "9:00 AM" and "5:00 PM" placeholders in grey, which read as real values.
- **Evidence:** `NEW/p390-fixpunch.png`
- **Rule:** ui-ux-pro-max "Forms & Feedback"; DESIGN-SPEC sheet header.
- **Fix:**
  - Send is #A7ACB1 with `aria-disabled` until valid, turning teal 600 when valid.
  - Prefill Start and End from the chosen day's punches. If there are none, leave them empty with a "Choose" placeholder.

**S15. Can't work and Swap, opened from a link, show a card inside a card**
- **Screens:** `/app/exchange/callout` and `/app/exchange/swap` when opened directly.
- **What's off:** a white card holds a grey inset shift box and grey radio lists, so there are boxes inside boxes. The sheet version doesn't have the outer card.
- **Evidence:**
  - `NEW/p390-cantwork2.png`
  - `NEW/p390-swap.png`
- **Rule:** memory "boxes inside boxes" tell; CR-003 space before borders.
- **Fix:** the page version uses the sheet layout on the #F5F6F6 page:
  - the shift summary as a white `.c-card` (the shift time 15/600, then a detail line);
  - the radio list as its own card;
  - the note field;
  - the danger action;
  - all 12px apart, with no outer card.

**S16. Pay hero says payday twice (already found; here are exact values)**
- **Screen:** Pay.
- **Fix:**
  - Card head "This pay period · Oct 26 – Nov 1" with no pill.
  - Big "Tue, Nov 3" (20/600), then "Payday in 2 days" (13 grey).
  - Delete "From your workplace's pay schedule" (it says nothing new).
- **Evidence:** `OLD/E-webkit-390-home_my_pay.png`
- **Rule:** Jose's rule 6.

---

## Polish (M)

**M1. Loading: the page jumps on Home and two tabs look active during a switch**
- **Screens:** Home and every tab change.
- **What's off:**
  - **Home while loading:** the placeholder reads "Home" / "Today's shift" / "Loading your shift…". About 250ms later it becomes "Welcome back, Alexandra" / "Next shift". The card grows from about 76px to 180px, Quick guide jumps down about 86pt, and the bell dot pops in. It does the same offline.
  - **Tab change on a slow network:** the old page stays up. The old tab keeps its filled icon while the new tab turns teal, so two tabs look half-active. A normal tab switch measured 877ms.
  - **Cold Schedule load:** only the title on a blank canvas (`OLD/../mont/load.png`).
- **Evidence:**
  - `NEW/p390-home-stream-150.png` against `NEW/p390-home-stream-400.png`
  - `NEW/p390-loading-schedule.png`
  - `scratchpad/review-mobile-employee/crop-tab-loading.png`
- **Rule:** TS-005 Edge Cases; ui-ux-pro-max "Reserve space (CLS < 0.1)" and "Loading feedback"; Jose's rule 8.
- **References:**
  - Gusto Mobile Home skeleton (keeps the card shapes): https://mobbin.com/screens/b33cbe23-2e76-4efb-b47d-9739caf5b38f
  - 21st "Skeleton Swap": https://21st.dev/@ddoemonn/components/skeleton-swap
- **Fix:**
  - Each tab's loading screen uses the final title text ("Welcome back, {first name}" comes from the session) and the final card heads at their final heights.
  - Body lines are bars: #EDEEEF, radius 4, 13 and 20px tall, widths 60% and 40%.
  - Swap to real content with a 150ms opacity crossfade, with no shimmer under reduced motion.
  - On a tab tap, switch the active tab and show the destination's skeleton immediately; never leave the old page up with a new active tab.

**M2. The time-off form is a modal with a tab bar and a grey band**
- **Screen:** Requests, Request time off.
- **What's off:**
  - It has a modal header ("Cancel" with a centred title) but keeps the tab bar.
  - The white form surface stops about 22pt above the tab bar, so a grey #F5F6F6 strip shows.
  - "Send request" floats mid-page.
  - Fix my time, by contrast, has no tab bar.
- **Evidence:**
  - `NEW/p390-timeoff.png`
  - `scratchpad/review-mobile-employee/crop-timeoff-bottom.png`
- **Rule:** DESIGN-SPEC ("Sheets … have no tab bar"); TS-006; CR-003.
- **Reference:** Gusto Mobile request time off (close button, no tab bar, Submit pinned at the bottom): https://mobbin.com/screens/615a1c68-9a32-4425-90eb-17f6a318a269
- **Fix:**
  - Present it as a sheet like board E-TimeOffSheet: 16px top radius, grabber, no tab bar.
  - Pin "Send request" in a footer: 16px side inset, 12px top padding, plus `env(safe-area-inset-bottom)`, with an `inset 0 1px 0 #EDEEEF` top hairline.
  - If it stays a page, make the white surface `min-height: calc(100dvh - header - tabbar)`.

**M3. Fix my time: the "What to fix" list mixes a category with a date**
- **Screen:** Time, Fix my time.
- **What's off:** the radios are "Missed a whole shift" and "Mon, Oct 26 · 7:59 AM – 4:01 PM", a category next to a specific day. Choosing the day changes which fields appear below.
- **Evidence:**
  - `NEW/p390-fixpunch.png`
  - `NEW/p390-correction.png`
- **Rule:** ui-ux-pro-max "Split long forms / progressive disclosure"; Jose's Oct 26 rule (split long forms into steps).
- **Reference:** board E-CorrectionSheet (Missed clock-in / Missed clock-out / Wrong time / Missed break).
- **Fix:**
  - Step 1, "Which day?": recent days with punches, plus "A day I didn't clock in at all".
  - Step 2: the board's four types and the time fields, prefilled.
  - Header Send is enabled only on step 2.

**M4. Past timecards pages one week at a time and mislabels empty weeks**
- **Screen:** Time, Past timecards.
- **What's off:**
  - It shows one week at a time, with "Earlier week / Later week" rows below that look like settings rows.
  - A week with no hours carries a "Not approved yet" pill plus "No time recorded these days."
- **Evidence:**
  - `NEW/p390-pasttc.png`
  - `NEW/p390-pasttc-earlier.png`
- **Rule:** TS-010; TS-005; Jose's rule 4 (say a zero state in words).
- **References:**
  - board E-PastTimecards;
  - Brick weekly list: https://mobbin.com/screens/c5e4574a-babb-48cc-9426-0a763dd7baab
  - Remote week total: https://mobbin.com/screens/e8349e54-34b0-4f28-8543-22ad81cbb822
- **Fix:**
  - One card per week:
    - head: "Oct 19 – 25" plus a status pill (Approved / Paid);
    - row: "32 h" (17/600), "Paid hours · payday Fri, Oct 30" (13 grey).
  - "Show earlier weeks" at the end.
  - Empty weeks: no pill, "No hours this week".

**M5. Empty states follow three different patterns**
- **Screens:**
  - Open shifts: bare grey paragraphs with no card.
  - Requests › Decided: centred text in a card.
  - Past timecards: centred text inside a card.
  - Schedule "Coming up": a left-aligned row.
  - Corrections: a sentence inside a card.
- **Evidence:**
  - `NEW/p390-openshifts.png`
  - `NEW/p390-req-decided.png`
  - `NEW/p390-pasttc.png`
  - `NEW/p390-corrections.png`
- **Rule:** TS-005; TS-006; Jose's rule 4.
- **Reference:** American Airlines "No travel credit" card (left title, one line, teal next-step links): https://mobbin.com/screens/48e8e9dd-5dcd-45f0-ac16-30a86fcc2e3b
- **Fix:**
  - One `.c-empty` card, left-aligned, 16px padding:
    - title 15/600 #1A1C1E ("No open shifts right now");
    - body 13/400 #6B7075 (one sentence);
    - one teal 13/500 next-step link (for example "Turn on open-shift alerts ›").
  - Inside an existing list card, a single 56px row of 15/400 #6B7075.

**M6. Error, 404 and Help pages fall outside the app**
- **What's off:**
  - A bad request ID shows bare grey text: "…Return to Time off…", which isn't a link and names the wrong section.
  - The signed-in 404 is the dark sign-in-style page: ultra-light "404" numerals and "Go to sign in".
  - More › Help opens the public `/support` page with "‹ Sign in" back and a different type scale.
- **Evidence:**
  - `NEW/p390-req-badid.png`
  - `NEW/p390-404.png`
  - `NEW/p390-help.png`
  - Good model: `NEW/p390-pay-badid.png`
- **Rule:** ui-ux-pro-max "Predictable back"; TS-006; ui-designer brief ("avoid ultra-light weights").
- **Fix:**
  - All in-app errors use the Paycheck pattern: a card with a 17/600 title, a 13 grey line, and a teal link back ("Back to Requests ›").
  - Signed-in 404: shell, header and tab bar, with "This page doesn't exist" and "Go to Home".
  - Help: an in-app pushed page ("‹ More") reusing the support content in `.c-card` rows.

**M7. Home: the Quick guide takes a card slot on a returning employee's Home**
- **Screen:** Home.
- **What's off:**
  - The Quick guide accordion holds 4 rows that just repeat the tabs ("Find your schedule", "Review your hours"…).
  - Meanwhile the approved C-Employee board's "Upcoming shifts" card is missing.
  - The bottom 40% of the screen is empty.
- **Evidence:**
  - `NEW/p390-home-guide.png`
  - board `scratchpad/review-mobile-employee/boards/C-Employee.png`
- **Rule:** Jose's rule 6; TS-010.
- **Fix:**
  - Replace it with "Coming up": card head "Coming up" plus a "See all" link, then up to 3 shift rows using the Schedule row style ("Tue 3 · 8:00 AM – 4:00 PM / Barista · Condado").
  - Move the guide to More › Help › "Getting started", or show it only for the first 14 days.
  - Home stays at 3 cards or fewer.

**M8. Phone landscape (844×390) switches to the tablet shell**
- **What's off:**
  - The header is about 103pt and the tab bar about 68pt, which leaves about 219pt of content (56% of the screen).
  - The wordmark loses "WORKFORCE", the bell gets a numeric badge instead of the dot, the avatar is gone, and the time-off form changes to a large-title header.
- **Evidence:**
  - `NEW/pland-home.png`
  - `NEW/pland-sched.png`
  - `NEW/pland-timeoff.png`
- **Rule:** ui-ux-pro-max "Layout & Responsive"; TS-006.
- **Fix:**
  - Use the tablet shell only at `(min-width: 768px) and (min-height: 600px)`.
  - For `(orientation: landscape) and (max-height: 500px)`: keep the phone shell with a 44pt header row plus the top safe-area inset, a 49pt tab bar plus the bottom inset, and content at max-width 600px, centred.

---

## Bigger but worth it (L)

**L1. Pay shows no money**
- **Screens:** Pay history and the statement page.
- **What's off:** they list only dates, pills and PDF links. The approved E-Paycheck and E-PayHistory boards and Gusto all lead with net pay.
- **Evidence:**
  - `NEW/p390-payhistory.png`
  - `NEW/p390-statement-plain.png`
  - boards `scratchpad/review-mobile-employee/mb3.png` and `mb4.png`
- **Rule:** TS-003; TS-009 Register-Stakes Match (pay is the highest-stakes screen).
- **References:**
  - Gusto Mobile Paycheck: https://mobbin.com/screens/b9bf269f-2d5e-4f19-9ada-338ae6cdebdf
  - DoorDash Dasher earnings detail: https://mobbin.com/screens/1371715f-7794-424b-8b4d-00bc11a8b620
- **Fix:**
  - Statement: hero "Net pay · Direct deposit" with "$579.66" (20/600 tabular), then rows "Earnings $645.15 ›" and "Taxes and deductions $65.49 ›".
  - History rows: amount on the right (15/500 tabular) and hours in the detail line.
- **Caveat:** this needs payroll data. If the contract has no amounts, it is Codex's server work, and the UI should not fake it.

**L2. Make navigation feel Apple-smooth end to end**
- **What's off:** sheets already move well. Opening uses `transform 360ms cubic-bezier(.32,.72,0,1)` with a 360ms opacity fade, and it is instant under reduced motion; keep that. But:
  - tab switches wait on the network;
  - pushed pages appear with no transition;
  - the week strip only changes week via the arrows.
- **Rule:** TS-004 Motion as Meaning; ui-ux-pro-max "Spatial continuity".
- **Reference:** 21st Week Picker / Time Slot Picker strips (inspiration only): https://21st.dev/@klyv-ui/components/time-slot-picker
- **Fix:**
  - Prefetch all five tabs and the skeleton-first switch from M1.
  - Pushed pages: View Transitions slide, 280ms on `cubic-bezier(.32,.72,0,1)`, 12px parallax on the outgoing page, a crossfade only under reduced motion.
  - Week strip: horizontal swipe with a 250ms ease-out slide and the same URL change.
  - Sheets: drag-to-dismiss with velocity (I could not test whether it exists; see the gaps).

---

## The 10 changes that would most raise the premium feel

1. **M1** Loading screens that match the final layout, and an instant, single active tab.
2. **L1** Real numbers on Pay.
3. **S1 and S2** One icon weight in the tab bar and one row-title weight.
4. **M2** Time off as a real sheet: no tab bar, pinned button, no grey band.
5. **M7 with S3 and S4** A cleaner Home: Coming up instead of the Quick guide, one confirm row, the clock-in line in the card footer.
6. **M5** One empty-state pattern with a next step.
7. **M6** Error, 404 and Help kept inside the app.
8. **M4** Past timecards as a list of weeks.
9. **S10 and S15** Avatars instead of icon tiles; no cards inside cards.
10. **M8 with L2** Phone landscape kept as a phone, and smooth pushed-page and week transitions.

---

## Not covered, and limits

- **Device behaviour not testable here:**
  - Safe-area insets can't be checked in emulated WebKit; `env()` resolves to 0.
  - Sheet drag-to-dismiss and week swiping couldn't be tested; mobile WebKit emulation doesn't support drag or wheel.
  - Real iOS Safari and installed-PWA mode were not tested.
  - Haptics don't apply.

  All of these need Jose's device test.
- **Success states not seen:** Confirm, Send and Save success states weren't triggered, because the rules said not to submit anything.
- **Skipped on purpose:** the Updates page. The More menu in the preview still lists "Updates"; confirm production hides that row too.
- **Back labels:** "‹ Schedule" on Availability and "‹ Home" on Notifications may be fixed rather than tracking where you came from (Availability is also reachable from More). I didn't confirm this by clicking through.
- **Measurement that cleared a suspicion:** every pushed-page title is centred, so that is not a finding.
- **Reference gaps:** the tastemaker and ui-ux-pro-max knowledge files weren't installed. Only the skill index tables were available, so CR/TS codes and guideline names come from those tables. The Next.js "1 Issue" badge in the offline shot is a dev-only overlay.

## Files

My scripts are in `scratchpad/review-mobile-employee/`:
- `boards.mjs`
- `cap1.mjs`
- `cap2.mjs`
- `cap3.mjs`
- `lib.mjs`
- `montage.mjs`
- `crop.mjs`

Montages `m1.png` to `m14.png` are in the same folder. No repo, worktree or preview-mirror file was changed.
