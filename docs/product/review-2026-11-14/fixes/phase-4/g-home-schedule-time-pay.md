# Package G: Phase 4, Employee and Lead Home, Schedule, Time and Pay

Base commit `6e029139`. Patch: `g.patch` (made with `git diff 6e029139 HEAD --binary -- . ':!zz-scan' ':!vitest.zz-scan.config.mts'`), 12 files.
Evidence: `g-evidence/` (30 pictures from the last capture, and `before/` with 11 from the base). The full last run, with its log, is in `p4g-work/r3-emp` and `p4g-work/r3-lead` under the scratch root.
Presentation only. No server read, handler, route, permission check or data contract changed. No kit file, shared sheet or navigation entry changed.

## Findings

| Id | Result | Evidence |
|---|---|---|
| EM-002 | fixed, in the server's order (one choice for Jose) | The finding asked for required rows first. The Phase 3 contract (B07, `HomeTaskSummary.ranking` v1) keeps the server's order and says a required row may sit after dated optional ones. Home now keeps that order and never re-ranks. It shows the first three rows (five on desktop) and, when none of them is required, the first required row after them, in its own place. In the fixture the two required rows are fourth and fifth. The phone went from 3 rows with no required one to 4 rows ending in the first required row ("Read the team update", amber chip, teal Review pill). Desktop shows all five. `home-employee-390.png`, `before/home-employee-390.png`. Unit test `homeTodoPreview`. Builder D's count line is untouched (D's four hunks for this file apply cleanly on top of mine: `git apply --check`). |
| EM-007 | fixed | "9 h 49 of 56 h" on one line (small part 14/600, one space, `--b-on-band-2`), label "Hours", caption "worked this week" on one line. Payday reads "Fri, Nov 27" at every width with "in 10 days" under it. Tabular figures. `home-employee-390.png`, `home-employee-1440.png`, `home-lead-390.png`. |
| EM-008 | fixed at 1280px and wider; partly below | All rows 72px (probe at 1440: five rows of 72). Every lead is the 36px teal-50 circle with an 18px teal glyph (probe: `b-ico--teal 36/18` on every row). The amber chip is on the title line and the Review pill and chevrons end on one edge. To make the longest title fit with its chip and the pill, an Employee's two desktop columns are now 1 : 1.08 (were 1.3 : 1). Remains: under 1280px the column is too narrow for a long title, its chip and the pill on one line, so the chip wraps under the title there and that one row is taller (92px at 900 for "Read the team update"; 72px at 390 because that title is short; a long one such as "Confirm this week's schedule" takes about 110px at 390: `home-lead-390.png`). Truncating the title was the alternative; I did not do that. Under 820px and on narrow phones the Review pill sits under the words. |
| EM-010 | fixed | The period is plain band text under the date (probe: 14px/20px, `rgba(255,255,255,.86)`, no background). One glass pill "See your hours": 44px on phones, 48px from 768px (probe: 162 by 44 at 390, 177 by 48 at 1440). On phones it sits beside the date; at 320 it drops under. From 768px "See all" is hidden in Earlier (Pay history is in the band); phones keep "See all". `pay-employee-390.png`, `pay-employee-1440.png`. |
| EM-013 | fixed | Desktop from 1024px: under "Your week" two cards with the same top and bottom (probe at 1440: both 530 by 183 at y 600). Left: the chosen day, "Today" by default (another week: its first day with a shift, ringed in the week card). Right: "This week" with open shifts and What changed, 64px rows. No day is listed twice. What changed left the week card's footer. `schedule-employee-1440.png`, `schedule-day-chosen-1440.png`, `schedule-lead-1440.png`. |
| EM-014 | fixed for whole hours; a range with minutes still takes two lines in a narrow block | Day blocks print the compact range ("9 AM – 5 PM") at 14/700 tabular on one line (probe at 1440 in the last run: one line in all seven blocks, "10 AM – 6 PM" included). Each half is kept whole, and where a block is too narrow the line breaks before the dash, never after it. Blocks are 108px min with chips at the foot. A status chip and a Lead's marker share one row in their short forms ("Now" "Lead"); then every block that week says "Lead". On tablets the range is 12.5px and fits one line from about 880px (`schedule-employee-900.png`). Remains: a range with minutes ("9:30 AM – 5:30 PM") is about 122px at 14/700. It took two lines at 1440 in an earlier run ("9:30 AM" over "– 5:30 PM"). I then gave the block 6px more room, but the last capture's shifts were whole hours, so whether it now fits at 1440 is not verified. It will not fit between 1024 and 1279, or on tablets. |
| EM-015 | fixed on Home; already fixed on Schedule | Home's Coming up: when every listed row is a lead shift the rows drop the marker and the title carries "You lead all 3" (13.5/18 grey). `home-lead-390.png`, `home-lead-1440.png`. Otherwise the marker reads "Lead" on phones so the line stays one line: `schedule-lead-390.png` ("Lead · Customer Support · Main Office", rows 64px). Schedule's "You lead all N shifts" was built in review B6 (NV-289) and stays. |
| EM-016 | fixed | Today's team is a plain row with a chevron that opens the compose page. No "Write" button. Its note is the card's footer (13.5/18 grey) at both widths. `home-lead-1440.png`, `home-lead-390.png`. |
| EM-022 | fixed | Phone Schedule: Confirm, open shifts and What changed read as one card of three 64px rows with one icon column and hairlines (probe at 390: rows 64, 64, 64; "Coming up" starts at y 487, was 569 in my before capture; a confirmed week keeps 65, 64, 64). Confirm stays the screen's one filled pill; open shifts is a row with a chevron (the tinted "See open shifts" pill from EM-004 is gone, the one-filled-button rule holds). `schedule-employee-390.png`, `schedule-changes-open-390.png`, `schedule-confirmed-390.png`. At 320 the Confirm button drops under its words (the existing narrow-phone rule), so that row is taller. |
| EM-025 | fixed on my screens | Home: a third figure where nobody is "on shift now" in the band: "Next shift / Tomorrow 10 AM", or "On shift until / 6:00 PM" (tablets and desktop; phones leave it out because the shift card is next). Pay: Earlier shows up to five statements from 768px, and the two cards end together with the button at the card's foot. Add to calendar and Help are builder H's. `home-employee-1440.png`, `pay-employee-1440.png`; "Next shift" is in the run folder (`r3-emp/g-home-openpunch-forced-1440.png`). The fixture has three earlier statements, so the five-row case is proven by unit test only. |
| EM-031 | fixed | Phone week strip: past days at 60% (weekday, number and dot), a filled dot only on days with a shift, a hollow ring on a day off (probe on next week: Tue, Sat, Sun `border 1px`, no fill). Today's white tile stays. `schedule-nextweek-390.png`, `schedule-employee-390.png`. Note: an earlier round had set past days back to full white "as in the mock"; this finding is later and was assigned, so I followed it. |
| TB-002 | fixed | Probe at 768 and 900: no chip leaves its block (`clip: []`). Tablet chips use the short form ("In 4 h", "Can't work") at 11.5/16 600 with 6px padding and wrap inside the block. `schedule-employee-900.png`, `schedule-employee-768.png`; a Lead's two chips at 900 are in the run folder (`r3-lead/owner-schedule-900.png`: "Now" over "Lead", inside the block). |
| TB-006 | fixed | Tablets: the shift card runs across the width (time, where to clock in, Shift details in one line from 820px; under 820px the clock-in line takes its own row). Things to do and Coming up sit side by side and end together (probe at 900: both end at y 853). A Lead gets Today's team over Coming up in the right column. `home-employee-900.png`, `home-employee-768.png`, `home-lead-900.png`. |
| EM-017 (my screens) | fixed | Rows that open lead with the teal circle: every Things to do row, Today's team, open shifts, What changed, "Your correction requests" on Time and on Past timecards. Grey stays for facts: "No open shifts right now" and the empty corrections list. Probe: Time's icons are all `b-ico--teal`. |
| EM-018 (my screens) | fixed for placement; wording needs Jose | Schedule: the publication sentence is the week card's footer note from 768px (it was a ruled strip) and the list card's footer on phones (it was on the canvas). Pay: the two notes speak for the page and start on the cards' text edge (probe at 1440: x 318, card text 319). Today's team's note is a normal footer. Not done: one sentence for the publication fact. Home and Schedule still word it two ways; that wording is Jose's (Oct 18) in `src/lib/publication-note.ts`. |
| EM-027 (my screens) | fixed | `text-wrap: pretty` on notes, notice lines, row sub-lines and state lines of the four screens (probe: `pretty` on every such line of Time). |
| Nov 14: open punch after the shift ended | fixed on Home; needs Codex on Time | Home has both reads it needs (the week's shifts and the open time entry). When today's shift has ended and the person clocked in before its end, the tint is amber: "Still clocked in since 10:02 AM" and "Your 10 AM – 6 PM shift has ended. Clock out on the Main Office tablet." No rule about how long is too long. `home-openpunch-forced-390.png` (forced, see States). Time's "Right now" card cannot know the shift ended: its read has no schedule. |
| Nov 14: BR-11 targets on my screens | fixed | Pay's "See your hours" is 44px. Previous week and Next week on the phone are real 44 by 44 targets side by side (they were 32px with overlapping hit areas). |
| Nov 14: offline hides the next shift (RA-6) | already decided otherwise | Jose's Nov 10 rule (`src/lib/offline-hold.ts`): offline keeps what was loaded, read-only, with "Offline · updated 11:22 AM"; private rows clear when the person steps away or the authority expires. Both seen: `home-offline-held-390.png`, `home-offline-away-390.png`. Not changed. |
| Nov 14: PY-7 payday wording | already fixed | "Scheduled payday" and "Your employer pays you. NEVORA shows your pay statement." are in place and were not rewritten. |
| Schedule said "Schedule not published yet" under seven published shifts | fixed | Seen in the Phase 3 after picture on a Sunday. A partly published week with no shift left ahead now says "No more published shifts this week." Unit path only; the fixture did not reach it today. |

## What was built

Who reaches it: an Employee or a Lead, from the tab bar on phones and the sidebar or rail from 768px. No new route or navigation entry.

- **Home** `/app`: hero figures as one sentence, the shift ahead as a third figure from 768px, Things to do in the server's order with the required row kept in view and one row anatomy, Lead's team row as a plain row, "You lead all N" once, the tablet layout, the open-punch tint.
- **Schedule** `/app/schedule`: the "This week" card (open shifts, What changed), the phone's one card of three rows with Confirm, the desktop day card beside it, compact one-line ranges and unclipped chips in the week card, the phone strip's past days and dots, notes as footers, 44px week arrows on phones.
- **Time** `/app/my-time` and its views: icon rule and text wrapping only. Fix my time, a day's punches and Past timecards are otherwise as they were.
- **Pay** `/app/my-pay` and its views: the hero (period as text, one pill), Earlier's rows, note alignment. Pay history and a statement's page are as they were.

Files: `src/app/app/employee-b-work.css` (all new rules), `src/components/employee-b/home-b.tsx`, `schedule-b.tsx`, `pay-b.tsx`, `time-b.tsx` (two icon tones), `parts.tsx` (`BDay` gets `pick`; `Dotted` prints a Lead's marker in two forms), `work-copy.ts` (new), `src/components/employee-schedule-corp.tsx` (the Employee Schedule's view model: day-card facts, short chip forms, compact ranges, the short Confirm reason). Tests beside them.

One thing to know when merging: `employee-schedule-corp.tsx` is outside `employee-b/` but it is the Employee Schedule's own view model, so I treated it as mine.

## Contract coverage

| Requirement | Result | Endpoint or module |
|---|---|---|
| EM-002: the server's order and required flags | done | `GET /api/employee/home` (`snapshot.attention` order, `required`), `homeTodoPreview` in `home-b.tsx`. `tasks.preview.requiredOutsidePreview` is not read here; D's count line owns `tasks`. |
| Hero figures | done | Home read (`currentShift`, `nextShift`), Time's records read (`useHours`), `HomeWeek` from the page, the pay schedule's payday. |
| Things to do anatomy, Lead team row, Coming up meta | done | Home read; presentation only. |
| Tablet Home | done | CSS only. |
| Schedule "This week", day card, week card, strip | done | `readEmployeeWeeklyReview` via `employee-schedule-corp.tsx` (unchanged read), open shifts read, the app's own `SchedulePublicationChange` and weekly confirmation form (both unchanged). |
| Pay hero and Earlier | done | Statements read and `currentPayPeriod` (unchanged). |
| Rules EM-017, EM-018, EM-027 on the four screens | done; EM-018 wording open | CSS and icon tones. |
| Privacy: Home clears private rows offline | kept, unchanged | `createEmployeeHomeController`, `offline-hold.ts`. Seen held and cleared. |
| Pay wording locked | kept | `PAY_SCOPE_LINE`, "Scheduled payday" untouched (unit test checks the sentence is still rendered). |
| Open punch after shift end on Time | waiting on Codex | Time's read needs the scheduled end of the shift the open entry belongs to (or a flag). |

## States

| Screen | State | How it was produced | Evidence |
|---|---|---|---|
| Home | ready, on shift, clocked in (Employee) | real local server | `home-employee-1440.png`, `-900`, `-768`, `-390`, `-320` |
| Home | ready (Lead, on shift, leads all listed) | real local server | `home-lead-1440.png`, `home-lead-900.png`, `home-lead-390.png` |
| Home | punch open after the shift ended | forced: the Home read's answer was rewritten in the page (observation moved two hours past the shift's end, next shift set to tomorrow); the time read and the week are the real server's | `home-openpunch-forced-390.png`; run folder `g-home-openpunch-forced-1440.png` |
| Home | offline, held read-only | real page, browser set offline | `home-offline-held-390.png` |
| Home | offline and stepped away: private rows cleared | real page, browser set offline, then hidden and blurred | `home-offline-away-390.png` |
| Home | read failed | forced: 500 on the Home read | run folder `g-home-error-390.png`: "Couldn't load Home." and "Try again" (unchanged) |
| Home | partial (sources not checked) | forced in an earlier run (a rewritten answer the client rightly rejected as stale) | `p4g-work/r1-emp/g-home-openpunch-forced-390.png`: "Your schedule couldn't be checked." and the source rows. That run was before I moved those rows into their own list; the later markup is covered by type check only |
| Home | loading, signed out | unit tests of the existing view only | not captured |
| Schedule | confirmation asked, changes, open shifts, partly published | real local server | `schedule-employee-1440.png`, `-900`, `-768`, `-390`, `-320`, `schedule-lead-1440.png`, `schedule-lead-390.png` |
| Schedule | What changed open | real local server, opened with Enter | `schedule-changes-open-390.png` |
| Schedule | a day chosen | real local server, click on Thursday | `schedule-day-chosen-1440.png` |
| Schedule | another week (days off, no "today") | real local server | `schedule-nextweek-390.png` |
| Schedule | confirming, then confirmed | real local server: the Confirm button was pressed and the server answered | `schedule-confirmed-390.png`; run folder `g-schedule-confirmed-1440.png` |
| Schedule | shift panel open from the day card | real local server, Enter on the row | `schedule-panel-1440.png` |
| Schedule | unavailable, error after Confirm, swap or callout intent, no open shifts, a week with no shifts | unit tests only (markup unchanged apart from the card they sit in) | not captured |
| Pay | payday ahead, statement ready, corrected and replaced rows | real local server | `pay-employee-1440.png`, `pay-employee-390.png` |
| Pay | loading, empty, error, offline | not re-captured; markup unchanged | Phase 3 evidence |
| Time | clocked in, week in progress, last week approved | real local server | `time-employee-1440.png`, `time-employee-390.png` |

## Keyboard and focus

- Every new control is a link, a button or a native `summary`. Nothing new traps focus.
- Schedule on a phone, in order after the band: the seven days, Confirm, open shifts, What changed, then the list rows. Confirm with focus: `schedule-focus-confirm-390.png` (2px ring). What changed with focus: `schedule-focus-changes-1440.png` (2px ring on the summary; its hit area is the full 64px row). Enter opens and closes it (probe: open true, then closed true); focus stays on it.
- Schedule on desktop: the day card's row opens the shift panel with Enter, Escape closes it and focus returns to the row (probe: before and after are the same element). `schedule-panel-1440.png`.
- Home: the three figures, Shift details, All notifications, then each to-do row and the Review pill, Today's team, Coming up. `Today's team` is now one stop (it was two: the row and "Write").
- Pay: "See your hours" keeps a 2px ring on the band. `pay-focus-hours-390.png`.
- Known order gaps, both older than this package and unchanged: on desktop Schedule the week card comes before Confirm in the tab order although Confirm is drawn first, and "This week" (right) is reached before the day card (left). The phone order matches what is drawn.
- Reduced motion: the disclosure's caret turns in 150ms only without the preference (probe: `rotate 0.15s` and `none 0s`). No other motion was added.
- Targets: "See your hours" 44px; week arrows 44 by 44 on phones; Review pill unchanged (the kit's 36px pill with its 44px hit area).

## English and Spanish

The signed-in app is English only today, so these screens render English. The new words are in one typed module, `src/components/employee-b/work-copy.ts`, with an `en` and an `es` entry for each key (Puerto Rico Spanish, "tú" as the model file uses). `work-copy.test.ts` checks that both languages have the same keys, that no Spanish entry is empty or still in English, and the copy rules. A full Spanish render of these four screens is not possible yet: their older sentences are still written in the components. I did not move them.

## Copy

New sentences and labels (English, then Spanish). None is a payroll sentence; the locked Pay wording was not touched.

| Where | English | Spanish |
|---|---|---|
| Home figure label | Hours | Horas |
| Home figure caption | worked this week | trabajadas esta semana |
| Home figure caption (no time read) | scheduled this week | programadas esta semana |
| Home figure | 17 h of 56 h | 17 h de 56 h |
| Home figure label | Next shift | Próximo turno |
| Home figure label | On shift until | En turno hasta las |
| Home, Coming up | You lead all 3 | Lideras los 3 |
| Home, open punch | Still clocked in since 9:32 AM | Tu entrada sigue abierta desde las 9:32 AM |
| Home, open punch | Your 9:30 AM – 5:30 PM shift has ended. Clock out on the Main Office tablet. | Tu turno de 9:30 AM – 5:30 PM terminó. Registra tu salida en la tableta de Main Office. |
| Schedule card heading | This week | Esta semana |
| Schedule, Confirm row on phones | Your manager asked | Lo pidió tu gerente |
| Schedule list, partly published week | No more published shifts this week. | No quedan turnos publicados esta semana. |
| Schedule day card | Today | Hoy |
| Schedule day card | No more shifts today. | No quedan turnos hoy. |
| Schedule day card, partly published | No more published shifts today. | No quedan turnos publicados hoy. |
| Week card chip on tablets | In 4 h | En 4 h |
| Week card chip on tablets | Can't work | No puedo ir |
| A Lead's marker, short | Lead | Líder |
| Pay, list name for screen readers | More earlier statements | Más comprobantes anteriores |

Reused as they were: "Week confirmed", "Your manager can see you checked it" (phones now show it without the dates), "Day off today.", "Your manager asked you to check it", "What changed in your schedule", "Scheduled payday", "For work Nov 16 – 22", "See your hours".

## Checks run

- Type check: `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .` clean in `src`.
- Lint: `npx eslint src/components/employee-b src/components/employee-schedule-corp.tsx` clean.
- Unit: `npx vitest run --dir src src/app src/components src/lib --testTimeout=30000`: 867 files passed, 24 skipped, 13074 tests passed, none failed. Run on commit `36d10d5b`, the commit that was captured. The patch is one commit later (`5898c690`): one selector in my sheet made more specific, same declarations; the two stylesheet tests were run again on it (83 passed).
- New tests: `home-b.test.tsx` (6), `pay-b.test.tsx` (2), `work-copy.test.ts` (2), `schedule-b.test.tsx` (1 rewritten, 3 added).
- Browser: `cap.sh` as Employee at 1440, 900, 768, 390, 320 on Home, Schedule, Time and its two views, Pay and Pay history; as Lead at the same widths on Home and Schedule (commit `36d10d5b`). No page error and no console error. `overflow` 0 on every route and width. Small-target flags left: the "‹ Time" and "‹ Pay" back links and Pay history's "View statement" links (all as before this package), and the Review pill at 320 (the kit's pill). Frame probe from 768px: title top 88 (Home 109 for its two-line greeting, as before), bands 363 on Home, Time and Pay and 296 on Schedule, first card 52px over the band: the same numbers as my before captures.
- My own state steps (`zz-scan/states-g.ts`, not in the patch): metrics, tab walks, focus pictures, the disclosure, a chosen day, another week, the shift panel, offline, a failed read, the forced open punch, and Confirm through the real local server.
- Builder D's hunks for `home-b.tsx` apply cleanly on my version (`git apply --check`).

Not run: an Owner or Manager page (I changed no shared component, kit file or shared sheet; every new rule is under the Employee shell attribute, and the four screens are Employee and Lead only). 200% text size. A real phone or Safari. A screen reader.

## For Codex

1. Time's records read (`/app/my-time`, `EmployeeTimeReady.current`) has no scheduled shift. To say "your shift ended" on Time's "Right now" card the way Home now does, it needs the scheduled end of the shift the open entry belongs to, or a flag. A rule for how long is too long (MK-4) is a product decision first.
2. `HomeTaskSummary.ranking` v1 can put a required row after dated optional rows. Home keeps that and shows the first required row as an extra row. If required work should rank first, that is a server ranking change, not a client sort.
3. The capture fixture's "correction waiting" seed fails (`correction {"status":"invalid"}`), so "Your correction requests" is always empty in captures.

## For Jose to decide

1. **EM-002.** Keep the server's order with the required row added (built), or rank required rows first (needs Codex).
2. **EM-018 wording.** One sentence for a partly published week. Today Home says "West Office hasn't published this week yet. Shifts shown are published." and Schedule says "Your Main Office shifts are published. West Office hasn't published this week yet." Both are your Oct 18 wording.
3. **Open shifts on Schedule.** The row now has a chevron instead of the tinted "See open shifts" pill, so the phone card is three even rows. Say if you want the pill back.
4. **Employee desktop Home columns.** 1 : 1.08 instead of 1.3 : 1, so a to-do's title, chip and Review pill fit one line.
5. **Home's "Not clocked in yet".** Your fixed word is "Not clocked in" (Time uses it). Home's older line has "yet". Not changed.
6. **Past days on the phone strip** are 60% again (EM-031); an earlier round had kept them full white as in the mock.
7. The Spanish for the new words, above.

## Needed from another package

- Builder D (Home's count line): nothing needed. D's edit and mine touch different lines of `home-b.tsx`; I moved my import and kept the `<BList>` line so D's patch applies after mine.
- Builder H (shared row rules): H's footer rule in `employee-b-account.css` and my screens agree (13.5/18 grey, card text edge, 12px above, 16px below). I left the spacing above a note to that one rule and set only the week card's note myself.

## Not verified

- The five-row Earlier card and the "You lead all N" line on Schedule with real data (fixture limits); "No more published shifts this week." (needs a Sunday evening); a week with no shifts; Schedule unavailable.
- 200% text size, a real phone, Safari, a screen reader.
- The loading placeholders (`b-loading.tsx`) still draw the old shapes for tablet Home and Schedule's lower row. Small, not changed.
- Not done: the shift panel's three action rows (Swap, Offer for cover, I can't work this shift) still lead with grey circles. They are on the older corporate kit inside the panel, which EM-017 did not list. `schedule-panel-1440.png`.
- The tracker `docs/product/review-2026-11-11/status.json` was not edited (builder H and I share three ids; one edit after merging is safer).
