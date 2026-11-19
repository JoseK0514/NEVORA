# Phase 8 review C: Employee and Lead pages

Reviewer C, Nov 17, 2026. Review only: nothing in the app or the main checkout was edited or run.

Sources: `DESIGN.MD` (main checkout, Current direction, Inspection fixes through Phase 7 and the Nov 17 decisions, Employee
phones, remaining surfaces, B1, B2, B6, B8, F3, F5), `.21st/DESIGN.md` (all history, superseded), the Phase 4 approved
pictures in `docs/product/review-2026-11-14/fixes/phase-4/evidence-work/`, and the follow-up handoff
`docs/handoffs/2026-11-17-claude-phase45-followups.md`. Tree reviewed: `$S/wt/p8b` (HEAD `bd2fd4a9` on `e96ac819`; it holds
`794bc587` EM-008, `ed7bdc61` EM-008/EM-014 tracker, `89b473b4` EM-018 sentence, `002fcf08` EM-018 tracker).

Skills loaded and used: `nevora-ui-readiness`, `anthropic-skills:tastemaker` (craft floor CR rules, then TS rungs),
`anthropic-skills:better-interface` (one pass over accessibility, layout, writing, type, colour, polish),
`anthropic-skills:stop-slop` (every on-screen sentence). The `critique-*` skills were not loaded; tastemaker and
better-interface covered composition, type and hierarchy.

How I measured: every picture read at full size, then cropped and enlarged with `sips` (crops in
`$S/p8review/crops-c/`). Pixel values are crop pixels divided by the zoom, plus the crop origin, so they are page CSS px
(captures are deviceScaleFactor 1). Hit areas behind `::after` cannot be seen in a picture; where that mattered I read the
rule in the reviewed tree and say so.

**Capture caveat that changes how to read the 844 set.** The 844x390 pictures are not a phone held sideways. The harness
runs these sets in its desk context (`zz-scan/owner-mobile-scan.integration.ts:54`: viewport 1440x900, deviceScaleFactor 1,
no `isMobile`, no `hasTouch`) and only resizes to 844x390 (`:79`). That is a short desktop window with a fine pointer. The
real phone-landscape layout (touch, `pointer: coarse`) was not captured, so I cannot pass or fail it.

## Verdict per surface

Ceiling: Home is the core loop, so Characterful; every other page is an operational page whose ceiling is Coherent.

| Route | Widths | Rung reached against ceiling | Verdict |
|---|---|---|---|
| Every Employee and Lead page | 844 (short window) | Below Correct: blank first screen, content under the rail | Fail (blocker 1) |
| Home `/app`, Employee | 1440, 390 | Coherent of Characterful; clean two columns, one filled Review, honest "At least 7" | Pass at these widths |
| Home `/app`, Employee | 900, 320 | Below Coherent: "Conf…", a broken count chip, a figure touching its divider | Fail (blockers 2, 3; V8) |
| Home `/app`, Lead | 1440, 390 | Coherent of Characterful; Today's team and Coming up form one right column as B6 says | Pass with copy fixes (V12) |
| Schedule `/app/schedule` | 1440, 900, 390, 320 | Coherent at 900 and phones; 1440's Today card reads unfinished | Fail (V5, V6, V19) |
| Time `/app/my-time` | all | Coherent layout; clock state contradicts Home | Fail (V7, V11) |
| Pay `/app/my-pay` | all | Coherent; matches the Phase 4 picture exactly | Pass (polish P1 to P3) |
| Requests hub `/app/requests/hub` | all | Coherent structure; the waiting words split three ways | Fail (V13, V14) |
| Time off `/app/requests` | all | Coherent: 812 column, tabs on the band, one white action | Pass (polish P11) |
| Pick up and swap `/app/exchange` | all | Coherent; tinted Pick up pills, honest footer | Fail on copy (V20); polish P4, P9 |
| Availability `/app/availability` | all | Phones Coherent; 1440 and 900 draw a card in a card | Fail (V3) |
| Agreed times `/app/availability/agreement` | all | Below Coherent: the note contradicts the card and sits off every edge | Fail (V4) |
| Notifications `/app/notifications` | all | Coherent grouping (Today, Yesterday, Earlier); repeated identical rows | Fail (V15, V16) |
| Updates `/app/updates` | all | Coherent; one item carries four labels | Fail (V16); polish P8 |
| Profile `/app/profile` | all | Phones Coherent; from 768 the ID hint sits in the label column | Fail (V10) |
| More `/app/more` | all | Coherent: the glass person strip and two cards are tidy | Pass (copy notes only) |
| Help `/app/help` | all | Coherent layout; mixed capitalisation in one list | Fail (V17) |
| Closed Payroll `/app/payroll` | all | Below Coherent: dead end, and its state card is drawn tighter than the 404's | Fail (V9) |
| Account deletion `/app/account/delete` | all | 1440 Coherent; 900 and 844 misalign the button; phones keep the bell and avatar | Fail (V1, V2) |
| Not found `/app/nope` | all | Coherent: one state card, one filled pill, one quiet link | Pass (polish P5) |

What is good and should be protected: the band and frame are exact on every page I measured (titles at 88 and 130, bands
at 196, 224, 296 and 363, first cards overlapping 52 px or sitting 24 px under, 812 and 1080 columns, all matching
`scan-log.json`); the Availability bars are positioned to the pixel (7 AM starts at 493 and 9 PM ends at 1039 on a 39
px-per-hour track); Pay, Time off, More and Not found are calm and finished; status colours are right almost everywhere
(amber waits, green Approved, grey Declined and Withdrawn, teal information); the EM-018 sentence now reads the same on
Home and Schedule.

## Defects

| # | Severity | Route and width | What is wrong, exactly (measure it) | Evidence (file, and the region) | Rule it breaks | Likely source file | Fix in one sentence |
|---|---|---|---|---|---|---|---|
| 1 | blocker | Every Employee and Lead page, 844x390 short window (fine pointer) | The first screen shows only the icon rail, an empty grey canvas (y 0 to 238), a teal strip (238 to 320) and the phone tab bar (320 to 390); the page itself starts at y 390 (title at 478 to 520, band ends at 586 to 753 in `scan-log.json`). The 80 px rail clips "Pay" and drops Requests and Updates, the tab bar's "Home" label is cut to "ome" under the rail, and the cards start at x 28, so the fixed rail covers their left 52 px when scrolled. All 17 Employee fold pictures are the same 14 KB blank frame. The Owner set at the same size renders correctly (title 88, band 196 to 383), so this is Employee and Lead only. | `employee/owner-home-844-fold.png`, `owner-more-844-fold.png` (whole frame); `owner-schedule-844.png` y 0 to 390 and x 0 to 80 | DESIGN.MD B8 "a phone held sideways gets the tablet layout"; F5 frame; brief "layout break" | `src/app/globals.css:11494` (`.employee-shell { display: block; }`, `.mobile-header`, fixed `.mobile-nav`), and the sibling queries at `:11620`, `:11670`, `:11764`, `:11808`, all `(max-width: 1000px) and (max-height: 500px) and (pointer: fine)` | Drop the short-window alternative from the five `.employee-shell` phone-shell queries (keep `max-width: 760px` only), so a short desktop window keeps the Direction B tablet layout as the Owner's does. |
| 2 | blocker | Home, Employee, 320 | The Things to do header cannot hold title, count and link: "Things to do" wraps to two lines, and the "At least 7" chip breaks into three lines; "least" and "7" fall outside the 22 px pill and "7" lands on top of "Review swap request" (overlap about 8 px). | `employee/owner-home-320.png` x 14 to 306, y 670 to 760; crop `crops-c/home320-todo.png` | DESIGN.MD Phase 3 "Chips are 22px, 12/16, 600"; Employee phones "Narrow phones (320 to 359px): a title's actions wrap under it rather than breaking the word"; better-interface trigger "content overlapped at 320px" | `src/components/employee-b/home-b.tsx:290` (BCard `count`, `link`); chip rules in `src/components/owner-b/owner-b.css` | Keep the chip on one line (`white-space: nowrap`) and, under 360 px, move "All notifications" under the title row so the header never wraps a word. |
| 3 | blocker | Home, Employee, 900 and 844 (tablet layout) | EM-008's ellipsis cuts the required row's title to "Conf…" at 900 (4 letters, title box about 56 px) and "Confir…" at 844 (6 letters), next to the full "Action needed" chip and the Review pill. The only distinguishing words ("this week's") are gone; at 1440 the full title fits. Rows are 72 px as promised. | `employee/owner-home-900.png` x 108 to 480, y 780 to 850 (crop `crops-c/home900-todo.png`); `owner-home-844.png` x 28 to 412, y 1150 to 1220 (crop `crops-c/home844-todo.png`) | Brief: the ellipsis must never cut a name to a few letters or hide the only distinguishing word; better-interface trigger "truncated content with no way to reach the full value" | `src/app/app/employee-b-work.css:40` to `:46` (the `min-width: 768px` EM-008 block) | From 768 to 1023 px, let the chip move to the sub-line ("Action needed · Nov 16 – 22 · 7 shifts") so the title keeps about 160 px, and keep the ellipsis only from 1024 px. |
| 4 | visible | Account deletion, 900 and 844 | The field block and the "I understand" line stop at 560 px (x 131 to 691 at 900), but "Delete my account" spans x 289 to 849 (right edge of the card, 158 px off the block), and "This can't be undone." is centred at x 411, under the field, not under its button (centre 569). Same at 844 (field 51 to 611, button 233 to 793, note centred at 331). | `employee/owner-account-delete-900.png` y 760 to 1000; `owner-account-delete-844.png` y 1140 to 1400 | DESIGN.MD Phase 2 "A form's field block stops at 560px ... with its buttons on the block's right edge" | `src/components/employee-b/account.css` (delete form, tablet rules) | Put the button and its note in the same 560 px block, button on the block's right edge and the note centred under the button. |
| 5 | visible | Account deletion, 390 and 320 | The bell (with its coral dot) and the JO avatar show in the band; the tab bar is hidden. | `employee/owner-account-delete-390-fold.png` top right, x 290 to 376, y 6 to 46; `owner-account-delete-320.png` same corner | DESIGN.MD B6 "Delete account hides the tab bar, bell and avatar on a phone" | `src/components/employee-b/account.css` or the phone shell hide list in `src/app/app/owner-b-shell.css` | Add the delete route to the phone rule that hides the bell and avatar on forms. |
| 6 | visible | Availability, 1440 and 900 | Card in a card: the seven day rows are their own rounded, shadowed card (bottom edge and 22 px corners visible at y 713) inside the outer white card that carries the footer "One-off days off go in Requests." | `employee/owner-availability-1440.png` x 286 to 706, y 650 to 775 (crop `crops-c/av1440-foot.png`); `owner-availability-900.png` y 700 to 760 | DESIGN.MD B6 "no card in a card"; tastemaker CR-302 elevation ramp | Availability desktop bars layout in `src/app/app/employee-b-desktop.css` (Round 2 bars) and `src/components/employee-b/availability-b.tsx` | Drop the inner card's radius and shadow so the rows and the footer are one card, as on phones. |
| 7 | visible | Agreed times, all widths | The note under the card starts at x 300 (1440) and x 112 (900): 4 px inside the card edge and 19 px left of the card's text edge (319, 131); at 900 its last line is "a preference." alone. It also says "This is what you and your manager agreed" directly under "Nothing agreed yet". The amber "Not confirmed" chip repeats the title and borrows the word DESIGN.MD reserves for an uncertain result. | `employee/owner-availability-agreement-1440.png` y 440 to 460; `owner-availability-agreement-900-fold.png` y 440 to 476 | DESIGN.MD Phase 4 note rule (notes on the card's text edge); Nov 17 "Uncertain results: Not confirmed is amber ... says the result is not known"; brief "a false claim" | `src/components/restrictions/copy.ts:42`, `:48` and the employee restrictions screen layout | Make the note the card's footer on its text edge, reword it (see Copy), and drop the chip or make it grey "None yet". |
| 8 | visible | Schedule, 1440 (Employee and Lead) | The Today card is 183 px tall with its title at the top and "No more published shifts today." pinned to the foot, 95 px of white between them, and that line starts at x 315 against the title's 319. It looks like a card that failed to load. | `employee/owner-schedule-1440.png` x 296 to 826, y 600 to 783 (crop `crops-c/sch1440-today.png`) | DESIGN.MD Employee phones "one empty state"; Phase 4 note rule; tastemaker TS-005 edges designed | `src/components/employee-b/schedule-b.tsx` (Today card) with `src/components/employee-b/schedule.css` | Let the Today card size to its content (no stretch to the row) and put the line on the 319 text edge under the title. |
| 9 | visible | Schedule, every width, both roles | The group titled "This week" (desktop card, phone list) holds "2 open shifts to pick up, Tue, Nov 24" while the week shown is Nov 16 to 22. | `employee/owner-schedule-1440.png` x 846 to 1376, y 600 to 720; `owner-schedule-900.png` y 565 to 665 | Brief "a false claim"; TS-006 single voice | `src/components/employee-b/schedule-b.tsx` | Title the card for what it holds ("Shifts and changes") or say "Next week" on the row. |
| 10 | visible | Time and Home, every width | Home says, in amber, "Still clocked in since 9:02 AM. Your 9 AM – 5 PM shift has ended." Time shows a teal "Clocked in" chip, "13 h 17 min so far" and "Take breaks and clock out on your location's tablet." with no sign that anything is wrong. | `employee/owner-my-time-1440.png` x 296 to 940, y 311 to 450 against `owner-home-1440.png` x 319 to 783, y 442 to 525 | DESIGN.MD status colours (amber means wait or check); Phase 4 "the instruction follows Time's clock state" | `src/components/employee-b/time-b.tsx` (Right now card) | Give Time's Right now the same amber state and sentence when the shift has ended and the punch is still open. |
| 11 | visible | Home, Employee, 320 | The Hours figure "21 h 46 of 56 h" ends about 1 px from the tile divider (h at x 159, divider at 160). | `employee/owner-home-320.png` x 20 to 300, y 183 to 277 (crop `crops-c/home320-hero.png`) | Tastemaker CR-002 proximity; Employee phones "Narrow phones (320 to 359px)" | `src/app/app/employee-b-work.css:26` to `:27` (`.b-live__v small`) | Under 360 px drop "of 56 h" to the meta line ("of 56 h worked this week") so the figure clears the divider by at least 12 px. |
| 12 | visible | Closed Payroll, every width | The state card says "Payroll is for Owners" and "Jose Natal can give you payroll access." with no next step; an Employee's own pay lives in Pay. The card is drawn tighter than the other state card on these pages: lock circle at x 313 and title at 376 (16 px inset) against the 404's circle at 319 and title at 382 (22 px inset), and 16 px top padding against 24. | `employee/owner-payroll-1440.png` x 296 to 856, y 220 to 302 (crop `crops-c/pay-state.png`) against `owner-nope-1440.png` (crop `crops-c/nope-state.png`) | DESIGN.MD Phase 3 "Closed pages: one state card: whose page it is, the reader's own part, one tinted next step"; B2 "offers the page that does the job for this role" | `src/components/owner-only-notice.tsx`, `src/app/app/payroll/payroll-route.tsx` | Add "Your pay statements are in Pay." with one tinted "Open Pay" pill, and use the kit state card's padding. |
| 13 | visible | Profile, 900 and 1440 | "You sign in with this ID." sits in the 180 px label column under "Employee ID" and ends 12 px from the value (x 299 against 311 at 900; 487 against 499 at 1440), so it reads as a two-line label. Phones put it under the value. | `employee/owner-profile-900.png` x 131 to 500, y 340 to 385; `owner-profile-1440.png` y 340 to 385 | Tastemaker CR-002 proximity; DESIGN.MD B5 "a locked value shows its reason beneath it" | `src/components/employee-b/account-b.tsx` (profile rows) and `account.css` | Put the hint under the value at every width, as on phones. |
| 14 | visible | Time, 320 | Ranges break after the dash: "8:58 AM – / 5:28 PM" and "9:02 AM – / now", so a line ends on a dash and "now" sits alone. | `employee/owner-my-time-320.png` x 81 to 200, y 505 to 635 | DESIGN.MD Phase 3 "a time range is short on a phone ('3–4:30 PM')"; typographic habit of not ending a line on a dash | `src/components/employee-b/time-b.tsx` | Use the short phone form ("8:58 AM–5:28 PM", "9:02 AM–now") or keep each range whole with `white-space: nowrap`. |
| 15 | visible | Home, Lead, 1440 and 390 | The shift card shows a "Shift lead" chip and then the sentence "You're shift lead" on the same line: the same fact twice, and the sentence drops "the". | `lead/owner-home-1440.png` x 319 to 520, y 437 to 457; `lead/owner-home-390.png` y 386 to 406 | Stop-slop (say it once); DESIGN.MD Lead "You're the shift lead today" | `src/components/employee-b/home-b.tsx:156` | Keep the chip and drop the sentence, or keep "You're the shift lead" and drop the chip. |
| 16 | visible | Requests hub, every width | One state, three words: "With teammate", "Needs approval" (Can't work) and "Waiting" (time off), and the last two both mean waiting on the manager. | `employee/owner-requests-hub-1440.png` x 296 to 826, y 515 to 765 | Stop-slop single voice; TS-006; brief "two words for one thing" | `src/components/employee-b/requests-b.tsx:28` and the status map | Use "Waiting" for every manager wait and "With teammate" only for the teammate's turn. |
| 17 | visible | Requests hub and Notifications | The same incoming swap is "A teammate requested a swap" with the sub-line "Review the shifts before responding" on Requests, and "Swap request waiting for you, Sat, Nov 28 · From Ana Colon" on Notifications. The hub's sub-line says nothing about what or when. | `employee/owner-requests-hub-1440.png` x 296 to 1376, y 370 to 420 against `owner-notifications-1440.png` y 440 to 490 | DESIGN.MD rows "sub-line is what and when"; TS-006 | `src/components/employee-b/requests-b.tsx` | Show the same facts on both: "Ana Colon asked to swap", sub-line "Her Sat, Nov 28 for your Mon, Nov 23" (or hide the name on both if privacy requires). |
| 18 | visible | Notifications, every width | Identical reminder rows repeat: "Confirm your schedule, Week of Nov 23 · 4 shifts" at 5:18 PM and 4:18 PM the same day, and "Week of Nov 30 · 1 shift" on Nov 12 and Nov 11. | `employee/owner-notifications-1440.png` x 296 to 1108, y 706 to 846 and y 990 to 1130 | DESIGN.MD Phase 3 "A folded notification opens in place and lists each notification" | Notifications list grouping (employee notifications screen, `src/components/employee-b/messages-b.tsx`) | Fold reminders for the same week into one row ("Confirm your schedule, 2 reminders") that opens in place. |
| 19 | visible | Updates, Notifications and Home | One team update carries four labels: section "To confirm", button "Acknowledge", chip "Must read", and on Notifications "Team update to acknowledge" with "Action needed". | `employee/owner-updates-1440.png` y 260 to 460; `owner-notifications-1440.png` y 300 to 360 | Brief "two words for one thing"; stop-slop | `src/components/employee-b/messages-b.tsx` and its copy | Use one verb: section "To acknowledge", chip "Action needed" (as Home), button "Acknowledge". |
| 20 | visible | Help, every width | One list mixes Title Case "Privacy Policy" and "Terms of Use" with sentence case "Account deletion"; More's row says "Privacy policy and terms of use". | `employee/owner-help-1440.png` x 319 to 1353, y 575 to 745 | DESIGN.MD sentence case (Clocker, Phase 5 "Buttons are sentence case"); TS-006 | Help screen copy (account-copy or `src/components/employee-mobile/` help) | Write "Privacy policy" and "Terms of use". |
| 21 | visible | Home, every width | Two to-do rows have the identical title "Review coverage offer" and differ only by "Respond by Nov 24, 12:00 PM" against "1:00 PM"; neither says which shift. | `employee/owner-home-1440.png` x 849 to 1353, y 440 to 580 | DESIGN.MD Phase 3 rows "title is the person or thing, sub-line is what and when" | `src/components/employee-b/home-b.tsx` (`weekTodo`, todo rows) | Name the shift in the sub-line ("Tue, Nov 24, 12–8 PM · respond by Nov 24, 12 PM"). |
| 22 | visible | Schedule, phones | The confirm row's sub-line is "Your manager asked", a sentence with no object; desktop says "Your manager asked you to check it". | `employee/owner-schedule-390.png` x 81 to 240, y 316 to 334 (crop `crops-c/sch390-confirm.png`); `owner-schedule-320.png` y 365 to 383 | Stop-slop (be specific); TS-006 | `src/components/employee-b/work-copy.ts:19` (`managerAsked`) | Use "Requested by your manager" at every width. |
| 23 | visible | Pick up and swap, every width | "Why other shifts aren't available" has the sub-line "2 shifts · date, location and the reason for each", which describes the disclosure instead of saying anything. | `employee/owner-exchange-1440.png` x 927 to 1230, y 355 to 372 | Stop-slop (cut announcements) | `src/components/employee-b/exchange-b.tsx` | Sub-line "2 shifts you can't take". |
| 24 | visible | Schedule, 1024 to 1279 (not in this capture; follow-up's own picture) | Narrow day blocks stack the sub-line one word per line ("Customer / Support / Main / Office · 8 h") and end a line on "·" ("Office · / 8.5 h"); "8 AM / – 4 PM" breaks even for whole hours. | `$P/p45-evidence/verify/schedule-1024.png` x 160 to 712, y 425 to 575 ($P = the follow-up scratchpad `fae20d8b-.../scratchpad`) | DESIGN.MD Round 4 "Dotted lines ... never start or end a line with a '·'"; EM-014 | `src/components/employee-b/schedule-b.tsx:67` to `:68` with `schedule.css` | Under about 140 px of block, show the time and the position only (the place is in the list below) and keep each dotted segment whole. |
| 25 | polish | Pay, 1440 and 900 | The full-width "View statement" button starts 4 px left of the card's text edge and ends 4 px right of it (315 to 807 against 319 to 803 at 1440; 127 to 853 against 131 to 849 at 900). | `employee/owner-my-pay-1440.png` x 296 to 436, y 330 to 560 (crop `crops-c/pay1440-btn.png`) | Tastemaker CR-402 one strong edge | `src/components/employee-b/pay.css` | Set the button's inline margin to the card's text inset. |
| 26 | polish | Pay, 1440 | The Last pay statement card holds 65 px of empty white between "For work Nov 9 – 15" and the button (it matches the Phase 4 picture, but reads unfinished beside the Earlier card). | `employee/owner-my-pay-1440.png` x 296 to 826, y 425 to 490 | Tastemaker CR-004 rhythm | `src/components/employee-b/pay.css` | Let the card size to its content and align the two cards by their tops only. |
| 27 | polish | Pay, 1440 and 900 | The payday sits as plain text on the band 70 px under the title, while Home shows the same "Scheduled payday" in a glass tile. | `employee/owner-my-pay-1440.png` y 130 to 285 against `owner-home-1440.png` y 179 to 283 | DESIGN.MD figures on glass (Direction B paragraph); TS-006 | `src/components/employee-b/pay-b.tsx` | Draw the payday as the band's glass figure like Home's. |
| 28 | polish | Pick up and swap, 1440 and 900 | The Pick up pills end 12 px short of the rows' trailing edge (837 against 849 at 900; 791 against 803 at 1440), while Home's Review pill sits on the edge. | `employee/owner-exchange-900.png` x 700 to 900, y 380 to 780 (crop `crops-c/exch900-trail.png`) | DESIGN.MD EM-008 "the pill and the chevrons end on one edge" | `src/components/employee-b/requests.css` or exchange row trail | Remove the trail's right padding when the trail is a pill. |
| 29 | polish | Not found, 320 | "Open Schedule" starts at x 103, 8 px right of the "Go to Home" pill and the text above (95). | `employee/owner-nope-320.png` x 14 to 306, y 215 to 315 (crop `crops-c/nope320-acts.png`) | Tastemaker CR-402 | Kit state card actions (`src/components/owner-b/b-kit.tsx` BState) | Remove the quiet link's inline padding when it stacks under the pill. |
| 30 | polish | Home, 1440 (Employee and Lead) | The Next shift card says "Wed, Nov 18" in the sub-line and "Wednesday, Nov 18 · 8 h" in the footer, and its note says "9 AM – 5 PM" beside a title of "9:00 AM – 5:00 PM". | `employee/owner-home-1440.png` x 319 to 783, y 405 to 600 | DESIGN.MD Phase 3 "full from 768px on Home" (BWhen); TS-010 editing | `src/components/employee-b/home-b.tsx:150` to `:160` | Footer "8 h" only, and the full range in the note from 768 px. |
| 31 | polish | Home and Schedule (EM-018 sentence) | The sentence leaves a two-word last line, "week yet.", at Home 1440 and at Schedule and Home 320. | `employee/owner-home-1440.png` y 890 to 925; `owner-schedule-320.png` y 1105 to 1135 | Brief "an orphaned word" | Card footer note rule (`BCardNote`) | Add `text-wrap: pretty` to card footer notes. |
| 32 | polish | Updates, 320 | The excerpt is cut right after a hyphen: "on the back-…". | `employee/owner-updates-320.png` x 81 to 290, y 360 to 430 | Better-typography truncation | Updates excerpt clamp in `messages-b.tsx` | Clamp by lines with `-webkit-line-clamp` and break words at spaces only. |
| 33 | polish | Pick up and swap, 320 | The white thumb hugs "Open shifts 2" with about 4 px on each side, against 16 px on wider widths. | `employee/owner-exchange-320.png` x 20 to 300, y 118 to 162 (crop `crops-c/exch320-seg.png`) | DESIGN.MD F5 narrow-phone track | Segmented control (`--b-seg-*`) | Give the thumb at least 8 px of side padding at 320 px by trimming the inactive items' padding. |
| 34 | polish | Notifications against Home | "Action needed" sits on the title line on Home and on the sub-line on Notifications, and the same "Confirm your schedule" item leads with a teal circle on Home but an amber one on Notifications. | `employee/owner-notifications-1440.png` y 720 to 840 against `owner-home-1440.png` y 590 to 710 | DESIGN.MD Phase 3 "chips inside share one size and one left edge"; Phase 4 EM-017 | Notifications rows in `messages-b.tsx` | Use Home's row: teal circle, amber chip on the title line. |
| 35 | polish | Time off against the Requests hub | The same request is "Thu · 9:00 AM – 12:00 PM" on Time off and "Thu, Dec 3 · Part of day" on the hub; every row under the Waiting tab repeats a "Waiting" chip. | `employee/owner-requests-1440.png` x 296 to 1108, y 320 to 445 | DESIGN.MD rows "a chip only for an exception" | `src/components/employee-b/timeoff-b.tsx` | Show the hours on both and drop the chip inside the Waiting tab. |
| 36 | polish | Account deletion, 1440 | The checkbox line ends its first line on "and I", leaving "I" dangling before "won't be able to sign in again." | `employee/owner-account-delete-1440.png` x 953 to 1353, y 392 to 432 | Better-typography line breaks | `account-copy.ts` | Reword so the line breaks well (see Copy). |
| 37 | polish | Availability against Time off and Agreed times, 1440 | Availability, opened under a back link, uses the 1080 frame; its siblings Time off and Agreed times use 812. | `scan-log.json` contentRight 1376 against 1108 | DESIGN.MD Phase 2 "Pages opened from them read in one 812px column" | `src/app/app/employee-b-desktop.css` | Either record the bars as a reason to keep 1080 or use 812. |
| 38 | polish | Requests hub, 1440 and 900 | The amber dot marks "Waiting" (waiting on others) and nothing marks "Needs your answer" (waiting on you). | `employee/owner-requests-hub-1440.png` x 296 to 1376, y 180 to 283 | DESIGN.MD status colours | Requests figures in `requests-b.tsx` | Put the amber dot on "Needs your answer". |

Counts: 3 blockers, 21 visible (rows 4 to 24), 14 polish (rows 25 to 38).

## The follow-up commits on this tree

- **EM-008 (`794bc587`, `ed7bdc61`): fail.** Rows are 72 px from 768 px and the chip stays on the title line, as promised.
  At 1440 the full title fits and the Review pill sits on the edge (pass). At 900 the title is cut to "Conf…" and at 844
  to "Confir…" (defect 3): that hides the only words that tell this week from next week. The follow-up's own check passed
  because its fixture had one to-do in a full-width card (`$P/p45-evidence/verify/home-900.png`); the two-column tablet
  card was never exercised. Phones: at 320 the Review pill sits under the words (pass); at 390 it sits beside them, which
  matches the approved Phase 4 picture.
- **EM-014 (`ed7bdc61`, no code change): pass for the break itself, with a defect around it.** The Phase 8 fixture has no
  shift with minutes, so no capture here shows it ("9 AM – 5 PM" fits on one line at 1440, 900 and 844). In the
  follow-up's own pictures, at 900 "9:30 AM / – 5:30 PM" and "10:15 AM / – 6:45 PM" break cleanly before the dash: each
  time stays whole, both lines are bold and share a left edge, and it reads as a range
  (`$P/p45-evidence/verify/schedule-900.png`, y 425 to 497). It looks broken at 1024 to 1279, where the same blocks stack
  the sub-line one word per line and end a line on "·" (defect 24). It also disagrees with Home and Time, which break
  after the dash (NV-069, `home-b.tsx:153`; defect 14).
- **EM-018 (`89b473b4`, `002fcf08`): pass.** "Your Main Office shifts are published. West Office hasn't published this
  week yet." appears word for word on Home (Coming up footer, every width, both roles) and on Schedule (the week card's
  footer from 768 px, the Coming up footer on phones), published location first. The only flaw is the two-word last line
  "week yet." (defect 31). The none-published variant in the follow-up's picture still reads "Main Office and West Office
  haven't published this week yet. Shifts shown are published." as a loose note on the canvas
  (`$P/p45-evidence/verify/home-900.png`, y 630 to 645); it is outside EM-018's scope but should become a card footer too.

## Small tap targets the scan flagged

The scan's `small` list measures the element's own box (`getBoundingClientRect`, under 36 px), not the `::after` hit area,
so it flags pills and back links whose drawn box is small even when the hit area is 44 px.

- **"Review" on Home at 320: not a defect.** Measured from the picture: 96 x 34 px drawn (crop `crops-c/home320-review.png`,
  x 81 to 177, y 1073 to 1107). The kit draws its hit area with `.b-btn::after { height: max(100%, 44px) }`
  (`src/components/owner-b/owner-b.css:149`), so the tappable area is 96 x 44. That meets DESIGN.MD ("a kit button's hit
  area is at least 44px at any drawn height").
- **Back links "Requests", "Schedule", "Home", "Availability", "Profile" at 1440, 900 and 844: not a defect.** Measured from
  the picture: the ink of "‹ Requests" is about 83 x 17 px (crop `crops-c/req1440-back.png`, x 314 to 397, y 98 to 115).
  The rule in the tree draws the link as a 32 px tall pill with `::after { inset: -6px 0 }`
  (`src/app/app/employee-b-desktop.css:32`, `:34`), so the hit area is 44 px tall at every width from 768 px, fine pointer
  or touch. At 1440 and 900 that is a desktop pointer case and passes WCAG 2.2 target size; at 844 it would also hold on a
  touch screen. Note that this 844 set is a fine-pointer window, not touch (see the caveat), and the real 844 problem is
  defect 1, not the back links.

## Copy

English only on these surfaces: DESIGN.MD says the signed-in app renders English until a stored language is decided. The
Spanish lines are for the `es` entries of the same modules (`work-copy.ts`, `account-copy.ts`), for a native read later.

| Where | Now | Rewrite (EN) | Rewrite (ES, for the module) |
|---|---|---|---|
| Schedule confirm row, phones | "Your manager asked" | "Requested by your manager" | "Lo pidió tu gerente" |
| Schedule "This week" card | "This week" over a Nov 24 row | "Shifts and changes" | "Turnos y cambios" |
| Schedule Today card (follow-up fixture) | "No open shifts right now" / "None right now" | "No open shifts" with no sub-line | "No hay turnos abiertos" |
| Lead Home shift card | "You're shift lead" beside a "Shift lead" chip | Chip only, or "You're the shift lead" | "Eres el líder del turno" |
| Lead Home, Today's team | "Your message goes to today's published team. Reading it is optional for them." | "Your message goes to everyone on today's published schedule. They don't have to acknowledge it." | "Tu mensaje llega a todos en el horario publicado de hoy. No tienen que confirmarlo." |
| Agreed times note | "This is what you and your manager agreed. It is different from the availability you send each week, which is a preference." | "Agreed times are fixed with your manager. The availability you send each week is a preference." | "El horario acordado lo fijas con tu gerente. La disponibilidad que envías cada semana es una preferencia." |
| Agreed times chip | "Not confirmed" | "None yet" (grey), or no chip | "Ninguno aún" |
| Requests hub swap row | "A teammate requested a swap" / "Review the shifts before responding" | "Ana Colon asked to swap" / "Her Sat, Nov 28 for your Mon, Nov 23" | "Ana Colon pidió un cambio" / "Su sáb, 28 de nov por tu lun, 23 de nov" |
| Requests hub chips | "Needs approval" and "Waiting" | "Waiting" for both | "En espera" |
| Pick up and swap disclosure | "2 shifts · date, location and the reason for each" | "2 shifts you can't take" | "2 turnos que no puedes tomar" |
| Pick up and swap footer | "Picking up a shift makes it yours right away if it's still open and you still meet the rules." | "Pick up a shift and it's yours at once, if it's still open and you meet the rules." | "Si tomas un turno, es tuyo al momento, si sigue abierto y cumples las reglas." |
| Pick up and swap card | "Want more shifts?" / "Update when you can work" | "Your availability" / "Days and hours you can work" | "Tu disponibilidad" / "Días y horas en que puedes trabajar" |
| Updates | "To confirm", "Must read", "Acknowledge" | "To acknowledge", "Action needed", "Acknowledge" | "Por confirmar", "Acción necesaria", "Confirmar lectura" |
| Updates list | "Earlier" over an update posted today | "Other updates" | "Otros avisos" |
| Notifications | "Team update to acknowledge" | "Acknowledge the team update" | "Confirma el aviso del equipo" |
| Home to-dos | "Review coverage offer" twice, "Respond by Nov 24, 12:00 PM" | Sub-line "Tue, Nov 24, 12–8 PM · respond by Nov 24, 12 PM" | "mar, 24 de nov, 12–8 PM · responde antes del 24 de nov, 12 PM" |
| Closed Payroll | "Payroll is for Owners" / "Jose Natal can give you payroll access." | "Payroll is for Owners" / "Your pay statements are in Pay." plus a tinted "Open Pay" | "Tus comprobantes de pago están en Pago." / "Abrir Pago" |
| Time, correction card | "Sent to your manager for review" | "1 approved, 1 declined" (what is true now) | "1 aprobada, 1 rechazada" |
| More, Updates row | "Current messages shared with you" | "Messages from your managers" | "Mensajes de tus gerentes" |
| More, Privacy row | "Privacy policy and terms of use" | Keep, and make Help match it | |
| Help list | "Privacy Policy", "Terms of Use" | "Privacy policy", "Terms of use" | "Política de privacidad", "Términos de uso" |
| Profile alerts row | "Alerts on this device" / "Settings for this browser" | "Alerts in this browser" / "Turn alerts on or off" | "Alertas en este navegador" / "Activa o desactiva las alertas" |
| Not found | "The link may be old, or the page may have moved." | "The link is old or the page moved." | "El enlace es viejo o la página cambió de lugar." |
| Account deletion checkbox | "I understand my NEVORA account will be deleted and I won't be able to sign in again." | "I understand NEVORA will delete my account and I can't sign in again." | "Entiendo que NEVORA borrará mi cuenta y no podré volver a entrar." |
| Pay notes | "Downloaded files may contain personal pay information." | "The PDF holds your pay details. Keep it private." | "El PDF tiene tus datos de pago. Guárdalo en privado." |

## Consistency across surfaces

- **Roles.** Lead pages at 390 are byte-identical to Employee pages except Home and Schedule, and at 1440 they differ only
  by the sidebar's role line. That is right. The Lead marker reads "Shift lead" on Home (chip), "Lead" on Schedule's day
  blocks at 1440 and "Lead ·" on Schedule's phone sub-line. The phone short form is decided (EM-015); the desktop "Lead" comes
  from a rule that shortens every block in the week once any block pairs a status chip with the marker
  (`employee-b-work.css:143` to `:144`), which DESIGN.MD does not record (it says "Shift lead", and "Lead" on a tablet's narrow
  day only).
- **Widths.** Home's to-do title is whole at 1440 and phones but cut at 900 and 844 (defect 3). Profile's ID hint moves
  from under the value (phones) to the label column (768 and up) (defect 13). Delete account's button follows the 560 block
  at 1440 (in its own column) but not at 900 and 844 (defect 4). Schedule shows Today and This week at 1440 but This week and
  Coming up at 900; both are reasonable, but Today is the weaker card.
- **Range breaks.** Home and Time break a range after the dash (NV-069); Schedule's day blocks break before it (EM-014).
  Pick one rule.
- **State cards.** The closed Payroll card and the 404 card use different insets (16 against 22 px) and paddings (defect 12).
- **Clock state.** Home amber, Time teal for the same open punch (defect 10).
- **Same item, different words.** Swap requester hidden on Requests, named on Notifications (defect 17); "Confirm this week's
  schedule" on Home against "Confirm your schedule, Week of Nov 16" on Notifications; calendar row "Add to calendar"
  (Profile) against "Add shifts to your calendar" (More).
- **Languages.** Not applicable: these surfaces render English only.

## Not reviewed

- **Phone held sideways on a touch screen.** The 844 set is a fine-pointer short window (see the caveat). I could not see
  the touch landscape layout, so neither its frame nor its 44 px targets are verified.
- **Keyboard order, focus rings, reduced motion, motion and hover.** The captures are static, taken under
  `reducedMotion: 'reduce'`, with no focus or hover states.
- **Loading, error, offline and empty states** for these routes: the captures show only loaded states. The only empty
  states visible are Schedule's Today and Agreed times.
- **Widths 1024 to 1279 and 768.** Not captured in this set; my only view is the follow-up's own pictures for Home and
  Schedule (defect 24).
- **Contrast** was judged by eye; nothing looked under 4.5:1, but I did not compute ratios.
- **Data that failed to seed** ("correction waiting" failed in `scan-log.json`), so a waiting correction on Time was not seen.
  I did not report missing data.
- **Two 403 responses** on `/app/notifications` (`{"state":"unavailable","reason":"access_denied"}`) for both roles. The page
  rendered its rows and no error card, so I could not tell which read failed or whether anything should show.
- **Whether an Employee should see "Write an update"** on Updates (DESIGN.MD ties composing to the Lead's Today's team); I did
  not find a rule either way.
- **Full-page sidebar artifact.** On full-page pictures taller than 900 px the sidebar's white panel stops at y 900; that is
  the fixed sidebar in a stitched capture, not a defect.


---
Filing note (Nov 18, 2026): paths under `p8cap/`, `p8fix/`, `wt/` or `f3work/` name working files in the session scratch that were not kept. The pictures kept are in the folders beside this report.
