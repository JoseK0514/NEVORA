# Owner on a phone: make-it-better review (Nov 1, 2026)

**Scope.** Owner role only, phone only. I used WebKit at 390×844 (2x), checked the five tab pages at 320×568, and checked Home, Schedule and Timecards in landscape at 844×390. The data is the fictional preview on localhost:59738, with the saved QAOWNER session and one browser at a time. I submitted nothing and changed no repo files.

**Skills used, in order:** tastemaker, design-critique, ui-ux-pro-max, then 21st (search only).
- The tastemaker install contains only its SKILL.md; its KB files aren't on disk. So I cite CR/TS codes from the tables in SKILL.md, and I couldn't check them against the ID lists.
- The ui-ux-pro-max search script isn't installed. I cite its priority categories instead.

**What's excluded.** Nothing below repeats today's "already found" list, PLAN.md (Waves A and A-phone) or ROUND2-PLAN.md. Where an item sharpens one of those, it is marked **Refines** and gives exact values.

**Where the evidence is**
- Today's captures: `scratchpad/review-ui/shots/` and `scratchpad/review-ui/mont/`
- My new captures and scripts: `scratchpad/review-mobile-owner/` (`cap1.mjs` to `cap4.mjs`, `motion.mjs`, `motion2.mjs`; screenshots in `shots/`)

**Mobbin coverage.** I searched for Homebase, 7shifts, When I Work, Deputy, Connecteam and Square Team; none is on Mobbin (the searches came back empty or with unrelated apps). Gusto Mobile is there, so the references below are Gusto plus well-made iOS patterns.

---

## Verdict (tastemaker)

**Brief.** An operational owner app for a small hospitality business. The register should be calm, corporate and sure of itself. The stakes are medium to high (payroll). The right ceiling is **Coherent**, reaching toward **Characterful**.

**First read.** At rest it looks tidy and close to the boards. What holds it below premium is a layer of small disagreements:
- The page title sits at two different heights.
- Counts are written five ways.
- Three different trailing-action patterns sit on one screen.
- Some rows have icons and some don't.
- Sheets use a 10px edge while pages use 16px.
- A few screens have two primary actions.
- Landscape, Help and partial failures fall out of the system.

**Craft score.**

| Area | Score | What I measured |
|---|---|---|
| Spacing | Mostly holds | Sheet rows use a 10px inset against a 16px page gutter |
| Type | Off-scale sizes remain | 18 size/weight pairs across Owner pages, including 12.75/500 (Timecards units), 12/600 and 17/550 (Scheduling rules) |
| Colour | Holds | Teal is overused as inline actions on Profile and in the Schedule list |
| Alignment | Titles drift | Tab-page H1 sits at y=80 on Home, Time and Payroll but y=87 on Schedule and Team |
| Density | Payroll over budget | 4 cards; Insights has 5 |

**Grade.** Competent. It reaches Coherent on most tab roots and falls short in sheets, pushed pages and edge states.

**Protect.** The white header with the wordmark, the 44px row grid, the quiet grey card system, and the single teal filled button on Home ("Find cover").

**Caveat.** This judges craft and taste. It does not verify usability or accessibility end to end, and "Competent" is not a ship verdict.

---

## Quick wins (S)

**S1. More: icons in rows.**
- **What's off:** Insights, Updates, Settings and Help each carry a leading Phosphor glyph. Settings rows, every other list, and the approved board `O-More` have none.
- **Evidence:** `scratchpad/review-ui/shots/O-webkit-390-home_more.png`
- **Rule:** Jose's rule that icons belong only in the tab bar and top bar; TS-006 Single Voice.
- **Reference:** board `corporate-mockups/project/O-More.dc.html`
- **Fix:**
  - Remove the four leading icons.
  - Add the board's grey trailing values, 15/400 #6B7075 before the chevron, for example "Insights · 24 h this week" and "Updates · None yet".

**S2. Tab-page titles at two heights.**
- **What's off:** The H1 sits at top 80px on Home, Timecards and Payroll, but at 87px on Schedule and Team. The 44px trailing control ("…" or "Add employee") makes the row taller. I measured this with `cap4.mjs`.
- **Evidence:** `scratchpad/review-ui/shots/O-webkit-390-home_employees.png`
- **Rule:** CR-402 One Strong Edge. **Refines** R4.
- **Fix:**
  - Title row: `display:flex; align-items:center; min-height:30px`.
  - Trailing control: `margin-block:-7px`, so it overhangs instead of pushing the row.
  - Result: the H1 sits at 80px on all five tabs, with the subtitle at +6px.

**S3. "All locations" control is too loud.**
- **What's off:** It is 44px tall with 17px text, the second-loudest thing on Schedule. The spec's neutral control is 32px at 13/600. The subtitle "· 2 locations" repeats it and wraps to two lines at 320px.
- **Evidence:**
  - `scratchpad/review-ui/shots/O-webkit-390-home_schedule.png`
  - `scratchpad/review-mobile-owner/shots/w320_app_schedule.png`
- **Rule:** TS-003 One-Thing Rule; CR-101.
- **Fix:**
  - Control: height 36, text 15/500, `padding:0 12px`, 16px CaretDown in #6B7075.
  - Keep a 44px hit area with an `::before` inset of −4px.
  - Change the subtitle to "Sunday, November 1".

**S4. Counts written five ways.**
- **What's off:** "Open shifts 3", "Tablets (2)", "Team (9)", "Waiting (2)", "2 locations" and "No PIN 9" all appear. Clocker PINs also shows "People · None have a PIN yet" right under the "PIN set 0" segment, so the same fact appears twice.
- **Evidence:**
  - `scratchpad/review-ui/mont/o-phone-3.png`
  - `scratchpad/review-ui/mont/o-phone-5.png`
  - `scratchpad/review-ui/mont/o-phone-6.png`
- **Rule:** TS-006; rule 5 (equal sizes).
- **Fix:**
  - One pattern: the label, a 6px gap, then the count in 13/600 #6B7075, with no parentheses ("Team 9", "Waiting 2", "Tablets 2").
  - Drop the "None have a PIN yet" header text.

**S5. Sheet rows misaligned with the page.**
- **What's off:** In the Location sheet and Schedule options, row text starts at x=10 (`padding-left:10px`) at 17px, with no separators. The page gutter is 16px and rows elsewhere are 15px.
- **Evidence:**
  - `scratchpad/review-mobile-owner/shots/s390_locations_menu.png`
  - `scratchpad/review-ui/mont/f-p-1.png`
- **Rule:** CR-402; CR-001.
- **Reference:** Notion Actions sheet https://mobbin.com/screens/b6f52bc7-9d96-4cb0-b5fd-708db38b9d3f
- **Fix:**
  - `.nevora-action-menu-popover` rows: `padding-inline:16px`, `min-height:48px`, text 15/500 #1A1C1E.
  - Hairline `inset 0 -1px 0 #EDEEEF` from x=16 (none after the last row).
  - The selected-row check sits at `right:16px`.

**S6. Hours this week: clipped text and wrong tab.**
- **What's off:**
  - Row details are cut mid-glyph with no ellipsis ("On targe|t", "12 h unde|r"); a wrapper clips at a right edge of 221px.
  - The page (`/app?view=team`) lights the Home tab while the back link says "‹ Team".
- **Evidence:** `scratchpad/review-mobile-owner/shots/s390_hours_week.png`
- **Rule:** ui-ux-pro-max Layout (no clipped content); Navigation (predictable location).
- **Fix:**
  - Remove the fixed width and overflow on the detail wrapper (`min-width:0; overflow:visible`); if a cap is needed, use `text-overflow:ellipsis`.
  - Map `view=team` to the Team tab.
  - Copy: "Availability 0 of 6" against "Active 9" doesn't add up. Use "Availability · 0 of 9 sent".

**S7. Two "New update" buttons.**
- **What's off:** The empty Updates page has "New update" in the header and again as a button in the empty card.
- **Evidence:** `scratchpad/review-ui/mont/o-phone-8.png`
- **Rule:** one primary action per screen.
- **Fix:** While the list is empty, hide the header action and keep the in-card button (better thumb reach). Show the header "New update" once items exist.

**S8. Payroll details: orphaned status, rows without chevrons.**
- **What's off:**
  - "Approved" floats centred in grey below the last card.
  - "Fix this payroll" and "Prepare payment instructions" are tappable rows with no chevrons.
- **Evidence:** `scratchpad/review-mobile-owner/shots/s390_payroll_run.png`
- **Rule:** design-critique affordance; CR-002 Proximity.
- **Reference:** Gusto Paycheck "More options" rows https://mobbin.com/screens/b9bf269f-2d5e-4f19-9ada-338ae6cdebdf
- **Fix:**
  - Subtitle becomes "Oct 5 – 11 · Payday Tue, Oct 13 · Approved".
  - Remove the floating line.
  - Add a 16px CaretRight in #A7ACB1 to both rows.

**S9. Select fields don't match.**
- **What's off:** On Add shift and Edit shift, the Start and End selects have no caret, while Location and Position do.
- **Evidence:** `scratchpad/review-mobile-owner/shots/s390_marco_shift.png`
- **Rule:** rule 5; TS-006.
- **Fix:** Every select gets a 16px CaretDown in #6B7075 at `right:14px`, with `padding-right:40px`.

**S10. Edit shift: status and Delete.**
- **What's off:**
  - A grey "Published" pill sits alone above the form.
  - "Delete shift" is a full-width red-outlined button straight under Note.
- **Evidence:** `scratchpad/review-mobile-owner/shots/s390_marco_shift.png`
- **Rule:** TS-010 Editing vs. Listing.
- **Fix:**
  - The header title area shows "Edit shift" with a 13px subtitle "Published · Sun, Nov 1".
  - Delete becomes a red-text row (15/500 #B42318) in its own card, 32px below the last field.

**S11. Lead role still in Owner copy.**
- **What's off:** The Add and Edit shift helper reads "Owners, Managers and Leads can lead a shift". The Lead role is on hold; R14 only cleaned up Find cover.
- **Fix:** "Owners and Managers can lead a shift."

**S12. Lines that say the same thing twice.**
- Timecard sheet: "You can approve from Mon, Nov 2" appears on the page behind and again in the sheet footer, next to the banner "This week isn't over…". Remove the footer line. Evidence: `scratchpad/review-ui/mont/f-p-2.png`
- Find cover: "No one free" in the card header, then "No one is free" as the body title. Remove the header-right text. Evidence: `scratchpad/review-mobile-owner/shots/s390_inbox_open.png`
- Who's working:
  - Home says "On shift now" where this page says "Clocked in"; use "Clocked in" on both.
  - Replace the "Live" label with "Updated 2:37 PM" (13px #6B7075).
  - Remove the collapsed "Time corrections" disclosure; it duplicates Time › Time corrections.
  - Evidence: `scratchpad/review-ui/shots/O-webkit-390-home_view_attendance.png`
- Rule for all three: TS-010.

**S13. Text wraps not on today's list.**
- **What's off:**
  - Home Today card: "Today · Condado · Needs 1 person" wraps to three lines next to Find cover.
  - Time off requests: "Wed, Nov 11 – Thu, Nov 12 · 2 days" wraps beside "7 h ago".
  - At 320px, "On shift now" and "Finish setting up · … weekly hour targets" also wrap.
- **Evidence:**
  - `scratchpad/review-ui/shots/O-webkit-390-home.png`
  - `scratchpad/review-ui/mont/o-phone-6.png`
  - `scratchpad/review-mobile-owner/shots/w320_app.png`
- **Rule:** corporate spec, "no wrapped labels".
- **Fix:**
  - Home detail becomes "Condado · Needs 1 person"; "Today" is already the card header.
  - Request rows: date as "Nov 11 – 12 · 2 days", with "7 h ago" moved to the end of the detail line.
  - Stat label "On shift now" becomes "Clocked in".

**S14. Words in number slots.**
- **What's off:** Insights Attendance puts "Not available", "No requests" and "None" in the 17/600 stat slot. This is the cause behind today's "Not available" wrap.
- **Evidence:** `scratchpad/review-mobile-owner/shots/s390_insights_custom.png`
- **Rule:** rule 4 (strategic counts); CR-101.
- **Fix:** The stat slot shows "0" or "—" (#A7ACB1). The reason goes in a 13px detail underneath, for example "Not tracked yet".

**S15. Off-scale sizes.**
- **What's off:** Timecards hour units are 12.75/500 (0.85em). Scheduling rules uses 17/550 ×16, 17/400 ×48 and 12/600.
- **Evidence:** `scratchpad/review-ui/metrics-QAOWNER-webkit-390.json`
- **Rule:** CR-102 (cap the sizes). **Refines** R1 and R2.
- **Fix:**
  - Units become 13/500 #6B7075.
  - Scheduling rules rows become 15/600 titles with 13/400 details, matching other rows.

**S16. Week days have no pressed state.**
- **What's off:** 0 of the 7 day buttons in the week strip have an `:active` rule.
- **Rule:** ui-ux-pro-max Touch (loading and press feedback). **Refines** P4.
- **Fix:** `:active { background:#EDEEEF; border-radius:20px; transition:none }`, fading back over 200ms ease-out.

**S17. Team list.**
- **What's off:** "People · See all" shows 8 of 9 people.
- **Fix:** Show all 9 and remove "See all"; it only earns its place above about 12 people.

---

## Polish (M)

**M1. Payroll has two primary actions and four cards.**
- **What's off:**
  - The red notice has "Start with Sep 21–27" as an outline button, while the filled teal "Prepare payroll" points at the current week.
  - The card title "Weekly payroll" is 24/600, the same size as the page title.
  - Prepare payroll repeats the problem: an outline "Prepare payroll" in Up next and a filled "Prepare payroll" for Sep 21–27.
- **Evidence:**
  - `scratchpad/review-ui/shots/O-webkit-390-home_payroll.png`
  - `scratchpad/review-ui/mont/o-phone-1.png`
- **Rule:** one primary action, at most 3 cards; TS-003; CR-101.
- **Reference:** Gusto Home payday card, one link row https://mobbin.com/screens/fa4081e0-675f-467a-aa70-8e7b16148c00
- **Fix:**
  - When a backlog exists, the only filled button is "Prepare Sep 21 – 27", inside the notice.
  - Up next becomes one row, "Oct 26 – Nov 1 · Payday Tue, Nov 3 ›", with no button.
  - Time exports moves into the Recent payrolls card as its last row, which brings the page to 3 cards.
  - Card title becomes 17/600.
  - Prepare page: one filled button, on the expanded period only; other periods keep a teal "Prepare" text link.

**M2. Things to do mixes items and links in one card.**
- **What's off:** The Time off card holds two request items, then a "More requests" sub-label with three navigation rows ("Time off requests", "Shift requests", "Older items").
- **Evidence:** `scratchpad/review-ui/mont/o-phone-1.png`
- **Rule:** CR-002 Proximity; TS-010.
- **Fix:**
  - The Time off card ends with a footer row "See all time off ›".
  - A separate card under the section label "More" holds "Shift requests ›" and "Older items ›" (rename that one to "Done and older").

**M3. Pushed pages use three header patterns.**
- **What's off:**
  - Most pages use a centred 17/600 nav title.
  - Time off requests and My pay leave the nav bar empty and show a 24px left title below it.
  - With a long back label, the title slides off centre ("‹ Things to do  Time off request").
- **Evidence:**
  - `scratchpad/review-ui/mont/o-phone-6.png`
  - `scratchpad/review-ui/mont/o-phone-7.png`
  - `scratchpad/review-ui/mont/f-p-2.png`
- **Rule:** corporate spec (pushed pages: title centred 17/600); TS-006.
- **Fix:**
  - The nav title is always absolutely centred: `left:50%; transform:translateX(-50%); max-width:calc(100% - 208px)`, with ellipsis.
  - Back labels are capped at `max-width:96px` with ellipsis.
  - Requests and My pay move their titles into the nav bar.

**M4. My pay sits outside the card system.**
- **What's off:** Bare text: a bold sentence, a "Statements" label, and a loose sentence.
- **Evidence:** `scratchpad/review-ui/mont/o-phone-7.png`
- **Rule:** TS-006; TS-005 Edge Cases.
- **Reference:** Gusto Home payday card (link above).
- **Fix:**
  - A Payday card: header "Payday", row "Tue, Nov 3 · In 2 days".
  - A Statements card with the standard empty state: "No statements yet" plus the 13px detail "Only you can see them."

**M5. Profile mixes three trailing patterns.**
- **What's off:** Plain values, teal inline actions ("Add", "Turn on", "Set up Face ID") and chevrons sit together, and the Face ID row carries three lines of explanation.
- **Evidence:** `scratchpad/review-ui/mont/o-phone-6.png`
- **Rule:** CR-203 One Accent; rule 5.
- **Reference:** Quo profile, uniform label/value rows https://mobbin.com/screens/5bbde933-f170-44fc-93c6-290406469f58
- **Fix:**
  - Every row is label + grey value + chevron: "Email · Not added ›", "Alerts on this phone · Off ›", "Face ID · Not set up ›".
  - The explanation moves to the pushed page.

**M6. Company profile.**
- **What's off:** One input sits outside any card. Time zone and Week starts look like settings rows but have no chevron, and their labels are 600 while Settings rows are 500.
- **Evidence:** `scratchpad/review-ui/mont/o-phone-2.png`
- **Fix:**
  - One grouped card: a Business name input row, then Time zone and Week starts as value rows with a 16px Lock glyph in #A7ACB1.
  - A 13px note under the card: "Locked while you have shifts".
  - Labels at 15/500.

**M7. Schedule options sheet.**
- **What's off:** Seven flat items with two-line details. "Go to this week" shows even when you're already on this week. Owner has no "Today" jump on the week card, although the Employee week card has one.
- **Evidence:**
  - `scratchpad/review-ui/mont/f-p-1.png`
  - `scratchpad/review-ui/mont/f-p-3.png`
- **Rule:** hicks-law; TS-010.
- **Reference:** Fabric grouped sheet https://mobbin.com/screens/39ac9619-2aca-46ad-b460-3d07ab826dd0
- **Fix:**
  - Two inset groups on a #F5F6F6 sheet: "This week" (Copy previous week, Week templates, Print schedule) and "Settings" (Scheduling rules, Availability deadline, Activity). Drop the details.
  - Replace "Go to this week" with a teal 13/600 "Today" link in the week card header, shown only when you're off the current week.

**M8. "Find cover" repeated on every open shift.**
- **What's off:** Three teal "Find cover" links in one day list, plus a red "Open shift" on the first.
- **Evidence:** `scratchpad/review-ui/shots/O-webkit-390-home_schedule.png`
- **Rule:** no action buttons in lists; TS-003.
- **Fix:**
  - The whole open-shift row opens Find cover; the trailing element becomes a chevron.
  - The dashed avatar plus "Open shift" in ink already marks the state.
  - Home keeps the one filled Find cover.

**M9. Partial failure shown three ways.**
- **What's off:** At 320px, while the server was slow:
  - The Missed and Open stats show "…", which reads as a menu glyph.
  - Payday says "Timecards aren't available right now".
  - Things to do shows a bare "Try again" button.
- **Evidence:** `scratchpad/review-mobile-owner/shots/w320_app.png`
- **Rule:** TS-005; ui-ux-pro-max Forms and Feedback. **Refines** P3.
- **Reference:**
  - Gusto Home skeleton in cards https://mobbin.com/screens/b33cbe23-2e76-4efb-b47d-9739caf5b38f
  - 21st "Stat Cards Skeleton" https://21st.dev/@felipemenezes098/components/skeleton-10
- **Fix:**
  - While loading: a 40×20 bar, radius 4, #EDEEEF in each stat slot.
  - On failure: "—" in #A7ACB1, plus one line in the card header on the right, "Couldn't load · Try again" in teal 13/600.
  - Use the same line in every card.

**M10. ⌘K search on the phone.**
- **What's off:** It opens from the landscape search icon or a hardware keyboard. The rhythm is uneven ("Pages" sits 0px above "Home", while "Actions" sits inside the highlight), there are no separators, and the field is grey with a teal ring.
- **Evidence:** `scratchpad/review-mobile-owner/shots/s390_cmdk.png`
- **Rule:** CR-004 rhythm.
- **Fix:**
  - 16px gutters.
  - Section labels 13/600 #6B7075, 24px above and 8px below.
  - Rows 48px with hairlines.
  - The highlight appears only on keyboard focus.
  - Field: white, `0 0 0 1px #D5D8DA`, 44px tall.

---

## Bigger but worth it (L)

**L1. Landscape (844×390) leaves the phone system.**
- **What's off:**
  - The header turns into the desktop bar: no wordmark, no avatar, search and bell only.
  - There is about 56px of empty space above the title.
  - The tab bar is about 65px tall.
  - Only about 150px of content is visible.
- **Evidence:**
  - `scratchpad/review-mobile-owner/shots/land_app.png`
  - `scratchpad/review-mobile-owner/shots/land_app_schedule.png`
- **Rule:** logo rule; ui-ux-pro-max Layout and Responsive; platform conventions.
- **Fix:**
  - Under `@media (pointer:coarse) and (max-height:500px)`, keep the phone header (wordmark, bell, avatar) at 44px.
  - Tab bar 49px, with labels beside the icons.
  - Title 22/28 with a 12px top gap.
  - Content padding `max(16px, env(safe-area-inset-left/right))`.
  - Content width capped at 640px and centred.

**L2. Help leaves the app.**
- **What's off:** More › Help opens public `/support`. It shows "‹ Sign in" while you're signed in, no tab bar, a 40px title, different rows, and "Shift, time off or pay — Ask your manager" to an Owner.
- **Evidence:** `scratchpad/review-mobile-owner/shots/s390_help.png`
- **Rule:** TS-006; ui-ux-pro-max Navigation (back behaviour).
- **Fix:** An in-app Help page:
  - The c-nav header "‹ More · Help".
  - Grouped cards: Contact (Email support ›), Common questions with Owner copy, then the legal links.
  - The same content source as `/support`.

**L3. Owner has no shift sheet.**
- **What's off:** Tapping a person's shift (Marco, 7 h late) goes straight to the full-page Edit shift form. There is no read view with status or quick actions.
- **Evidence:** `scratchpad/review-mobile-owner/shots/s390_marco_shift.png` (compare the Employee shift sheet in `scratchpad/review-ui/mont/f-p-3.png`)
- **Rule:** TS-003; Jakob's law (pattern parity with Employee).
- **Fix:**
  - A QuietSheet: title "Sun, Nov 1"; then "8:00 AM – 4:00 PM" at 20/600; "Marco Silva · Barista · Old San Juan"; a status line ("Not clocked in · 7 h 12 min late" in red text, once).
  - One grouped card with "Edit shift ›", "Call Marco ›" and "Find cover ›" (no icons).
  - Motion per P5.

---

## Still open from the earlier plans (measured today, not re-proposed)

- **P5, sheet exit.** The Location sheet opens on a good curve (top 876 → 621 over about 320ms), then disappears in one frame on Done in WebKit. There is no exit motion.
- **P7, title during loading.** On the Home → Payroll switch, a skeleton shows from 75 to 387ms with an empty H1 (dev server), so the title still flashes.
- Body scroll lock behind sheets now works (`html` overflow hidden). The tap highlight is transparent. Pushed headers are sticky.

---

## The 10 changes that would most raise the premium feel

1. Landscape keeps the phone frame: wordmark header, compact tab bar, safe-area padding (L1).
2. One primary action on Payroll and Prepare payroll; three cards; 17px card title (M1).
3. Every tab title on one line of the page at y=80; quieter "All locations" control (S2, S3).
4. Sheets on the page grid: 16px insets, hairlines, grouped options, plus the P5 exit finished (S5, M7).
5. One way to write a count, and no stat slots holding words (S4, S14).
6. No icons in More rows, and one trailing pattern (value + chevron) on Profile and Company profile (S1, M5, M6).
7. Schedule list without repeated teal "Find cover"; an Owner shift sheet with a read view (M8, L3).
8. One loading and failure language: shaped placeholders and one "Couldn't load · Try again" line (M9).
9. Centred, consistent pushed-page headers; My pay and Help inside the system (M3, M4, L2).
10. Remove what's said twice (timecard footer, Find cover status, Who's working disclosure, Clocker PINs header, the two "New update" buttons) and fix the clipped Hours rows (S12, S7, S6).

## Gaps

- I didn't check Android Chrome, a real iPhone, VoiceOver, or dark mode.
- I didn't change the landscape safe-area insets in the browser, so the left/right inset fix in L1 isn't tested.
- I didn't time motion beyond the Location sheet and one tab switch.
- I didn't open Build and publish beyond today's capture, or Add employee step 2.
- The 320px Home error state appeared while the release gate was loading the machine. It is real UI, but I didn't trigger the same failure on purpose; blocking the clock-monitor request didn't change Home.
