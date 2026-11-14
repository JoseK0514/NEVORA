# Employee and Lead visual review (Nov 11, 2026)

Read-only review of the current build on fictional data, 390px and 1440px, Employee and Lead. Full findings with values and code locations are in `review-employee.json` (34 findings: 5 High, 19 Medium, 10 Low).

**Verdict.** The craft floor is mostly sound: one band, one card, one type family, consistent row anatomy. It reads as Coherent on the phone and stalls below that on desktop, where one page clips (Availability) and several are half empty. What keeps it from Gusto level is less about polish than about answers: Pay does not say "paid", Notifications do not say what happened, and Home hides the required to-do on a phone.

## Top 10 changes

1. **EM-001 Availability on desktop clips its own header.** The card covers the sub-line and the "Change one week" pill. Give the form the normal 24px placement under the band (`time.css:147`, `employee-b-desktop.css:671`) and make the footnote the card's footer.
2. **EM-002 Home hides the required to-do on a phone.** Things to do shows three optional rows; "Confirm this week's schedule" is row 4. Sort required-first before `todos.slice(0, 3)` (`home-b.tsx:233`).
3. **EM-003 Pay does not answer "Did I get paid?".** Add a green "Statement ready" chip, make "View statement" a 48px teal pill, and decide with Jose whether net pay can lead the card (`pay-b.tsx:147-149`).
4. **EM-005 Notifications are category names.** Five identical "Schedule update" rows. Titles should be outcomes ("Time off approved · Nov 30 – Dec 2"). Needs a server label decision (`portal-notification-list.server.ts:16`); until then group repeats.
5. **EM-004 and EM-006 One teal primary.** Schedule has "Confirm" and "See"; Pick up and swap has a teal "Pick up" on every row. Open shifts becomes a chevron row; row buttons become ghost pills (`schedule-b.tsx:115`, `:145`).
6. **EM-007 Home's hero figures.** "17 h/56 h · hours worked of scheduled" becomes "17 h of 56 h · worked this week"; payday is "Fri, Nov 20" at every width (`home-b.tsx:76`, `:80`).
7. **EM-008, EM-009 and EM-017 One row.** Same height (72px), same trailing column (96px), same icon circle (36px teal-50, 18px bold teal glyph), time and unread dot on one centred line.
8. **EM-012 and EM-013 Desktop widths and holes.** Forms and state cards join the 812px column with a 560px field block; Schedule's lower row becomes two equal-height cards with no repeated days.
9. **EM-015 and EM-016 Lead additions.** Say "You lead all 3" once instead of a three-line row five times; Today's team uses the same row and note styles as the rest of Home.
10. **EM-011 Pay's band.** Near-black green on one tab only. Scope the dark band to Owner and Manager (`owner-b-desktop.css:887`, `:260`) or record it as the money band.

## Keep

- **The band and the lifted first card.** Title on teal, first card overlapping by about 40px on the phone: recognisable from a crop.
- **Today's shift card (Home).** The 28px time, one grey line, the "Starts in 8 h" chip and the calm clock-in tile. It answers "When do I work?" in one second.
- **Date blocks (THU / 12).** Clear, compact, and today in teal on Schedule.
- **Week strip on glass (Schedule phone)** and the desktop week grid's three states (past grey, today filled, upcoming teal-50 with a 3px left rule).
- **Request time off form (phone).** Segmented choice, two 48px fields, a plain "Your manager approves it" tile, one full-width teal "Send request". It is the cleanest screen in the set.
- **Availability on desktop (once unclipped).** The 6 AM to 12 AM bars make a week readable at a glance; Tuesday's shorter bar is obvious.
- **Add to calendar.** The "Keep the link to yourself" tile with an amber lock is the right tone for a privacy warning.
- **Counts on tabs** (amber for "For you") and the amber "Must read" / "Action needed" chips: colour is used by meaning.
- **Help.** Short, three questions, one contact, a clear "never email passwords" warning.
- **Copy voice.** Plain and direct ("Your manager asked you to check it", "Picking up a shift makes it yours right away").

## Cross-screen patterns

1. **More than one primary.** Filled teal pills repeat on Schedule, Pick up and swap and Updates; Lead Home adds a third button look. Rule to enforce: one teal pill per screen, ghost pills in rows, chevrons for rows that only navigate.
2. **Rows are almost a system.** Heights (56, 64, 81, 88px), trailing elements (chevron, pill, dot plus time), icon tints (teal, grey, amber) and chip placement vary by screen and by role. One row spec fixes Home, Notifications, Time off, Help and More together.
3. **Status is implied, not shown.** Pay (no "paid"), Time off (no "Waiting" chip, no tab counts), Notifications (category names). The three questions an employee brings each need a chip or figure in the first card.
4. **Desktop is the phone, stretched.** Two content widths (1080 and 812) without a visible rule, stretched buttons and fields, ragged column bottoms, and one real clip. Decide the width per page type and stretch columns to shared bottoms.
5. **Notes and dates drift.** Notes sit in the card, under it, in a ruled strip, or centred; the publication note has two wordings; payday and notification times use different formats by width or section; several notes end on a one- or two-word line.

## Lead vs Employee

- Lead differs on Home (Shift lead chip and sentence, Today's team card, three-line upcoming rows), Schedule (lead markers in rows and day blocks), the sidebar chip ("Lead" under the workspace name) and desktop Profile ("Calendar and alerts").
- Integrated well: the Shift lead chip on Today's shift, and Today's team placed after Things to do.
- Not integrated: the repeated "Shift lead" marker that wraps every phone row (EM-015), the Write button and its note (EM-016), stacked chips in today's block (EM-014), and a Profile card that has nothing to do with leading (EM-030).

## Not seen

- Time (`/app/my-time`): the capture used `/app/time`, so only the 404 was reviewed.
- Success and finish moments: clock-in, request sent, week confirmed, shift picked up, update acknowledged. None were captured, so the peak-end rule is unreviewed.
- Loading, offline, paused and empty states (other than the 404); the Decided tab; For you and My requests; a single time-off request; a pay statement; Pay history; an update's page; Write an update; Delete account; the Requests hub.
- Hover, press, focus rings, motion and reduced motion; sheets and menus; safe-area behaviour on a real phone; 320px, tablets and landscape.
- Contrast was sampled from pixels only (grey text #6A7176 on white is 4.96:1); no computed-style or automated accessibility check was run. Tabular numbers could not be confirmed from screenshots.
- The fixed tab bar is drawn mid-page in full-page phone captures; that is a capture artifact, not a finding. The sidebar ending at 900px on long desktop pages (EM-034) may be the same kind of artifact.
- The sidebar and shell CSS are outside the listed files, so EM-026 and EM-034 have no line numbers.
