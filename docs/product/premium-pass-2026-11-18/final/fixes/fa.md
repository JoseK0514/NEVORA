# FA: final verification fixes for the Owner and Manager work pages, the Direction B kit and the shell (Nov 18, 2026)

Builder FA. Worktree `.ui-work/wt/fa`, detached, base `16a64b001` (the combined premium tree). Patch:
`.ui-work/p9/fa.patch` (`git diff 16a64b001 HEAD --binary -- . ':!zz-scan' ':!vitest.zz-scan.config.mts'`), final head
`1fe80ee650910871b416a08115e13f0f1493ce73` (the captures ran at `e8c7ec523`, except `fa-owner` at `ae4dd6053` and `fa-owner2` at `3ae6a7689`; every commit after `e8c7ec523` changes tests only). Evidence: `.ui-work/p9/fa-evidence/` (before from `cap/fin-owner*`, `cap/fin-manager*`; after from
`cap/fa-*`). Nothing pushed, no branch made, nothing committed in the main checkout.

Environment: the local capture harness only (fictional Northside workspace, throwaway local Postgres, Jose Natal as Owner,
Elena Ruiz as Manager, James Ortiz as Employee). Not Development, not production.

Release sequence (Jose's policy of Nov 12): this patch joins the combined UI release, Codex integrates and verifies the
combined backend and UI on Development, and only that exact verified release goes to main or production after Jose
approves it. Nothing here authorizes a merge, a deployment, a paid activation or production data.

Skills loaded: nevora-ui-readiness, tastemaker, better-interface, stop-slop.

## What changed, in one paragraph

The person page header is whole again: positions are one grey line under the place and the state follows the phone after a
"·" at every width ("555-0199 · Off today"); at 320 the call buttons move under the text. Every decision on Restrictions is
44px, the quiet choice is the white edged pill (not the disabled grey), and "Not confirmed yet" is the kit's amber note with
the Question glyph. Team says "5 clocked in" and gives someone who starts later "Starts 2:30 PM". A new kit part, `BSegs`,
joins facts with "·" so a line never starts or ends on a dot and a time range or "Payday Fri, Nov 6" never splits; it is used
on Home, Things to do, Schedule, Timecards, Time corrections, Payroll and its history, Shift requests and Time off requests.
Same-month ranges are closed up ("Nov 2–8") and chips with words use proportional figures ("Missing clock-out"). The
Payroll family's buttons sit on the ladder (44 drawn, 52 full width on phones), Home's "has no payroll" card is one row on
tablets with a 44 pill, the phone band's payday countdown is grey meta, and Up next has one divider. Glyphs: paused is the
hourglass, Hours this week the timer, Time exports the download arrow, Notifications' Things to do the tray and Can't work
the person stepping out, and (with FC) fixing time the pencil and Availability the person check. The band's glass is one
step clearer in the signed-in shell, so white words on it read 4.9:1 or more (they measured 4.53:1 at worst).

## Review A (Owner work pages)

| # | Result | What was done, and evidence |
|---|---|---|
| 1 (blocker) | Fixed | The state sits in its own `c-person__state` after the phone, with a "·" for quiet text and none for a chip or a live dot; the line keeps the 13px clipped slot at every width, so it never starts with a dot. Positions are one grey line (`BSegs`). At 320 the two 44px circles drop under the text. `a01-person-{390,320,1440}-{before,after}.png`. |
| 2 (blocker) | Fixed, one part not | Restrictions' decisions 44 drawn (`rs-act`); phone band actions (person Edit, Add shift Save, Updates New update) 40 drawn with a 44 hit area; "What this measures" and the Schedule info button 36 drawn with a 44 hit area; Schedule's phone week arrows 44 at every phone width; desktop week arrows 36 with a 44 hit area. Not fixed: Schedule's seven day buttons are 38px wide at 320 (seven 44px keys need 308px; the card gives 256); they are 62px tall. Scan `under44` before and after: `cap/fin-owner/scan-log.json`, `cap/fa-owner/scan-log.json` (Edit 54x36 to 54x40, Save 67x36 to 67x40, New update 110x36 to 110x40 and 125x42 to 48, explainers 32 to 36, week arrows 36 to 44 on phones and 32 to 36 from 768, Restrictions' pair gone from the list); `a03-addshift-390-*`. |
| 3 | Fixed | Add shift's paired fields stack on every phone (the 420px point is not one of the B aliases), so "Choose a location" and "Choose a time" read whole at 390. `a03-addshift-390-*`. |
| 4 | Fixed | Payroll, Prepare payroll and Payroll history: card and row buttons 44 drawn (the corporate button drew 40 inside a 2px transparent hit border; the border is off there), the rows' Prepare and Choose dates pills 44, a full-width button 52 on phones. Updates' New update 48 on the desktop band. `a04-prepare-1440-*`. |
| 5 | Fixed | Phones: the 52px button with equal 16px sides. Tablets: one row, notice and a 44px pill at the right. Desktop rail: a 44px pill under the words on their edge, its own width. `a05-home-900-*`; the rail at 1440 in `cap/fa-owner3/owner-home-1440-fold.png`. |
| 6 | Fixed | "Scheduled payday in 9 days" is grey header text (a passed payday keeps the amber chip); at 320 Settings stays on the title's row and the cadence wraps under both. Same words. `a06-payroll-320-*`. |
| 7 | Fixed | "12 employees · 5 clocked in" / "No one clocked in"; someone whose shift starts later today reads "Starts 2:30 PM" in grey on every width (from Today's read; nothing new from the server). `a07-team-1440-*`, `a07-team-390-*`. |
| 8 | Fixed | Same-month ranges closed up in Payroll, Home, Things to do, Prepare payroll, Schedule's week, Payroll's import and export flows ("Nov 2–8"; across months "Oct 26 – Nov 1" keeps its spaced dash). Chips without the live dot and the Schedule grid's time ranges use proportional figures. `a08-timecards-chip-1440-*`. |
| 9 | Fixed | Under 820px of grid card a long time breaks after its dash ("10:30a–" over "6:30p"). `a09-grid-900-*`. |
| 10 | Fixed | `BSegs` on Things to do, Shift and Time off requests, Schedule's day card title and rows, Payroll rows, Time corrections; a range beside Find cover is one unit. `a10-inbox-390-*`; Shift requests in `cap/fa-owner/owner-exchange-390.png`. |
| 11 | Fixed | The info button ends the staffing line on the phone band (the line wraps between its facts); at 320 "Published" drops under the dates and the arrows keep the dates' row. `a11-schedule-320-*`; 390 in `cap/fa-owner2/owner-schedule-390-fold.png`. |
| 12 | Fixed, partly | `BState kind="paused"` draws HourglassMedium (kit-wide). Paid time export's way out names "Time exports"; on phones its head is a back link over the title. Not done: the round back button (the flow keeps its form head). `a12-paidtime-390-*`. |
| 13 | Fixed | The kit callout (amber, Question glyph, its title the card's h2), body and "See the hours they entered" inside it; the pair stacks full width with the filled one first on phones. `a13-restrictions-1440-*`, `a13-restrictions-320-*`. |
| 14 | Fixed | Notifications draw the kit chevron (bold, 16px, field edge); Things to do notices the tray; Can't work UserMinus. Every Quiet list chevron is the field edge (it was #A7ACB1). `a14-notifications-390-*`. |
| 15 | Fixed | Timer on Team's rail and phone tools. `a07-team-1440-*`. |
| 16 | Not fixed | Updates (270) and Time off requests, Shift requests, Notifications (264) sit where they are because they have no sub-line; 296 would put 26 to 32px of empty band under the title (Phase 8 removed exactly that). The fix is a sub-line (new words): see For Jose. |
| 17 | Fixed | View and Download end on the card's text edge. `a17-history-download-1440-*`. |
| 18 | Fixed | One divider in Up next: text edge to the card's right edge. `a18-payroll-upnext-1440-*`. |
| 19 | Fixed | A row naming several people leads with the amber attendance circle (ClockUser); one person keeps their face. `a19-home-todo-1440-*`. |
| 20 | Fixed | Time corrections drops the per-card "Waiting" chip (the band counts them). In Things to do's "Not clocked in" card the row says "● 40 min" in grey with the amber dot (screen readers hear "Not clocked in · 40 min"). `a20-corrections-1440-*`. |
| 21 | Fixed | One row title at 600: Shift requests, Time off requests, Notifications, Updates, Prepare payroll. `cap/fa-owner/owner-exchange-390.png`, `owner-notifications-390-fold.png`. |
| 22 | Fixed in code, not seen | "+1 more" is a teal "See 1 more" link to the attendance list on the card inset, 44px. The fixture showed six people, so no capture drew it. |
| 23 | Fixed | "Show 1 unscheduled" starts on the people column (22px from 1024, 14px on tablets). `a23-schedule-1440-foot-*`. |
| 24 | Fixed | "Payroll history" is 14.5/20 at 600 like every card-header link. |
| 25 | Fixed | The total row uses the rows' form to the minute ("213 h 15", "9 h"); phone rows show the status only (breaks are in the sheet and the table). |
| 26 | Partly | "SCHEDULED PAYDAY" is sentence case. Not changed: "Times in Puerto Rico time." (the app-wide phrase, also on Employee pages) and the closing periods on export sub-lines: For Jose. |
| 27 | Fixed | Phone tiles: 12px at both ends, labels at the caption size. `a27-home-390-tiles-*`. |
| 28 | Fixed | On phones the four filters are two rows of two equal pills in the quiet track (about 400px in one row; the phone card gives 326), every label whole; 44px hit areas kept. From 768px one row as before. `a07-team-390-*`. |
| 29 | Fixed | Positions are grey meta, not chips (with #1). |
| 30 | Fixed | One payroll row: teal receipt circle, "Payday Fri, Nov 6 · Approved" on the line, "Net" under the amount, on Payroll's phone screen as in history. `a30-payroll-390-recent-*`. |

## Review B (Manager, my rows)

| # | Result | What was done, and evidence |
|---|---|---|
| 2 | Fixed | As A #7. `cap/fa-manager/owner-employees-1440-fold.png`, `owner-employees-390.png`. |
| 3 | Fixed | As A #2 and #13: 44px pair, white edged quiet pill, full-width stack on phones. `cap/fa-manager/owner-employees-person-restrictions-{1440,320}.png`; the Manager `under44` list no longer has the pair. |
| 6 | Fixed | As A #10. |
| 7 | Fixed | As A #11. |
| 8 | Fixed | As A #10 (`BSegs`), Timecards' band line included. Notifications' rows come from FC's `employee-mobile/messages` list: see Needed elsewhere. |
| 9 (Timecards) | Fixed | Time exports DownloadSimple; Time corrections PencilSimple (the coordinator's and FC's choice, so the Employee's "fix your time" and the Owner's review share it; the reviewer suggested ClockCounterClockwise, which Home and Things to do drew: they now draw the pencil too). `b09-timecards-tools-1440-*`. |
| 11 (Timecards) | Fixed | As A #8. |
| 15 | Fixed | As A #28. |
| 16 | Fixed | As A #2 (arrows 36 drawn and 44 hit on the band; explainers 36 with 44 hit). |
| 17 | Fixed | This week's figures, staffing line and bars on the card's 22px inset from 768px. `b17-home-week-manager-900-*`. |
| 19 | Fixed | A person's face in a list row is 36px on Owner and Manager pages (Team, Timecards, Availability). |
| 20 | Not fixed | One phone gutter (14 or 16) for every page is the Phase 8 open question: For Jose. |
| 21 | Not fixed | The ruled band texture belongs to the approved Brand hero; removing it everywhere is Jose's call: For Jose. |
| 25 | Fixed | As A #19 and #22. |
| 26 | Partly | The chip inside "Not clocked in" is gone (A #20). The two reviewer sentences and Availability's "Not sent 1": For Jose. |
| 27 | Fixed | The lead of a Shift request or Can't work row sits on the name's line on phones. |
| 28 | Not fixed | Notifications at 320: the row belongs to FC's messages component; see Needed elsewhere. |
| 30 | Fixed | As A #23, and the Open shifts total is the amber 20px count at every width. `cap/fa-owner2/owner-schedule-1440.png`. |
| 31 | Fixed | As A #25. |
| 32 | Fixed | As A #7. |
| 33 | Kept | The Manager's second group has no heading by decision MG-007 (Phase 3: "More" is the avatar's page, one name for one place). For Jose if he wants the heading back. |
| 35 | Not changed | "Not confirmed yet" stays (product words); the reviewer's "No agreement yet": For Jose. |

## Review C row 17 (shell)

Fixed: on a sideways phone the rail's up caret sits in the middle of the slot its cover leaves (it sat 3px under the top of
a 37px blank). `c17-rail-844-before-employee-requests.png` (the reviewer's crop) and `c17-rail-844-after-owner-updates.png`.

## Coordinator notes

- Band glass (measured on the PNGs at 1:1, white words against the lightest fill pixel at the pill's top):

  | Pill | Before (12% fill) | After (8% fill) |
  |---|---|---|
  | Top bar search, 1440 | 4.53:1 | 4.93:1 |
  | Schedule "All locations", 1440 | 4.64:1 | 5.06:1 |
  | Schedule week pill, 1440 | 5.36:1 | 5.94:1 |
  | Schedule "All locations", 390 | 4.70:1 | 5.13:1 |
  | Schedule week card on the band, 390 | 4.69:1 | 5.12:1 |
  | "Covered this week" label, 390 (78% white) | 4.12:1 | 6.27:1 (now white) |
  | Team search, Payroll tabs, 1440 | 5.65 to 5.73:1 | 6.28 to 6.36:1 |
  | Employee Home tiles, 390 | 4.76 and 5.08:1 | 5.20 and 5.62:1 |

  axe read 3.86:1 on the 30-day builder's Cancel because that link was 86% white; every kit glass pill draws pure white.
  Chosen: one step clearer glass (`--b-glass` 8% inside `.app-shell[data-nv-b]`, `owner-b.css`), the 16% edge kept, so the
  frosted look and every pill's outline stay; the Schedule week's "Today" pill moved from its own 14% fill to the token.
  The edge-only pill was the other option; it reads as a different control family next to the glass tiles. Evidence:
  `g-glass-1440-*`, `g-glass-390-*`, `e-home-390-glass-*`.
- FC (1): the Employee's "Ask for agreed times" is drawn 44 by the same `rs-act` rule as every other decision on that
  screen (FC's proposed `.rs-main > .b-btn` rule is not needed). FC (2): Availability is UserCheck on Team's tools and
  Things to do's shortcuts; fixing time is PencilSimple on Home, Things to do and Timecards. Confirming a schedule has no
  Owner or Manager row. FC (3): the kit's 48px "Create calendar link" rule is gone from `b-foundation.css`.

## Every changed word (signed-in, English only; these screens keep no Spanish)

| Where | Before | After |
|---|---|---|
| Team band (phones) and title sub-line (wide) | "· 5 working now", "· No one working now" | "· 5 clocked in", "· No one clocked in" |
| Team row, someone later today | (nothing) | "Starts 2:30 PM" (the shift's start in the workplace's zone) |
| Home, On now overflow | "+1 more" (grey text) | "See 1 more" (link; screen readers: "See 1 more working today") |
| Home payday tile kicker | "SCHEDULED PAYDAY" (uppercase by CSS) | "Scheduled payday" (the same words, no transform) |
| Paid time export and Import pay, before a step | "‹ Back" | "‹ Time exports" (the back target's own label; Spanish follows the flow's copy module) |
| Things to do, "Not clocked in" card | chip "Not clocked in · 40 min" | "40 min" with the amber live dot; screen readers hear "Not clocked in · 40 min" |
| Time corrections, each card | chip "Waiting" | (removed; the band says "4 waiting") |
| Payroll phone rows | "Net · Approved" under the amount | "Approved" ends the row's line; "Net" under the amount |
| Ranges | "Nov 2 – 8" (thin-spaced) | "Nov 2–8" (same month only) |

No payroll or legal sentence changed. "Scheduled payday in 9 days" kept its words (only its look changed).

## Files

Kit and shell: `src/components/owner-b/b-kit.tsx` (BSegs, BSegsText, BCallout `heading`, paused glyph),
`src/components/owner-b/owner-b.css` (glass step), `src/app/app/b-foundation.css` (BSegs, b-keep, chip figures, chevron
colour, calendar rule removed), `src/app/app/owner-b-shell.css` (band actions, rail caret, Add shift pairs).
Pages: `src/app/app/employees/[employeeId]/page.tsx`, `src/components/team-live.tsx`, `src/components/owner-b/team-b.tsx`,
`src/components/employee-directory.tsx`, `src/components/owner-b/home-b.tsx`, `src/components/owner-b/inbox-b.tsx`,
`src/components/manager-weekly-roster.tsx`, `src/app/app/schedule/page.tsx`, `src/components/coverage-minutes/coverage-minutes.tsx`
and `.css`, `src/components/timecards.tsx`, `src/components/manager-time-corrections.tsx`, `src/components/time-off-waiting-list.tsx`,
`src/components/notification-inbox.tsx`, `src/components/payroll/payroll-runs.tsx`, `src/components/payroll/payroll-format.ts`,
`src/components/corp/corp-format.ts`, `src/components/payroll-import/flow-kit.tsx`, `src/components/restrictions/restrictions-screen.tsx`.
Sheets: `owner-b-home.css`, `owner-b-schedule.css`, `owner-b-time-pay.css`, `owner-b-requests.css`, `b-restrictions.css`,
`b-review-details.css`, `b-payroll-import.css`.
Tests updated to the new markup and ranges: `corp-round2.test.tsx`, `manager-inbox-corp.test.tsx`, `payroll-premium.test.tsx`,
`restrictions-screen.test.tsx`, `src/app/app/schedule/page.test.tsx`.

## Checks

- Type check: `heavy.sh` full `tsc --noEmit` on `1fe80ee65`: src clean (the only errors are the capture tool's own `zz-scan/states.ts`).
- `npx eslint` on every changed TypeScript file: clean.
- Targeted tests (42 files: kit, Home, Things to do, Team, person page, Restrictions, Schedule, roster, Timecards, Time
  corrections, Notifications, Payroll family, payroll import and export, coverage, review details, the B sheet guards):
  862 passed.
- Full run: `heavy.sh npx vitest run --dir src src/app src/components src/lib --testTimeout=30000`: 935 files passed, 24 skipped; 14,425 tests passed, 741 skipped, none failed (on the final head; an earlier full run caught one Home test that still expected "Oct 12 – 18", fixed, and one timing test in `src/lib/scheduling/generation` that ran 94ms against a 50ms budget while four captures shared the Mac; it passed on its own and in the final run).
- `git apply --check -R .ui-work/p9/fa.patch` in `wt/fa`: passes.
- Captures (fictional data, `cap.sh`): `cap/fa-owner` (18 routes, 1440, 900, 390, 320), `cap/fa-owner2` (9 routes after the
  second round), `cap/fa-manager` (7 routes), `cap/fa-owner3` (Home, Team, Timecards), `cap/fa-owner-844` (sideways phone: Schedule, Home, Updates, Time off requests, Timecards), `cap/fa-employee` (Agreed times, Home, Schedule, Notifications, Updates, Pay at 1440 and 390, for the kit changes). Before: `cap/fin-owner`, `cap/fin-owner-844`, `cap/fin-manager`,
  `cap/fin-manager-844`, `cap/fin-employee`. I looked at every after picture of the changed regions against its before and
  re-measured what the reviewers measured (pixel columns for button heights, `under44` in the scan logs, pixel contrast for
  the glass).

## Needed elsewhere

- FC (`employee-mobile/messages`, Notifications rows for every role): B #8 (a line that ends on "·", "Week of Nov 23 – 29 ·
  / 5 shifts") and B #28 (at 320 the unread dot and chevron squeeze two-word titles). `BSegs` from the kit fixes the first;
  the dot can sit before the title under 360px.
- FB: B #9's Clocker recovery link ("Fix it in Timecards") should draw Clock, the Timecards glyph. B #5 (Profile's band Edit
  42 on desktop): the phone half is done by the shell rule here (band actions 40 drawn, 44 hit); the 48 from 768px is in
  `profile-premium.css`.
- The 30-day builder: the shell's phone band rule also draws Add employee's band action 40 with a 44 hit area if it uses
  `.c-nav__right` or `.q-nav__r`; `.c-formhead` buttons are untouched.
- Clocker and signed-out pages keep `--b-glass` at 12% (the step is scoped to the signed-in shell): their language pill on
  the band carries the same white words on glass and should be measured by their builders.

## For Codex

- Nothing blocks. "Starts 2:30 PM" uses Today's shifts already on the page (the next start after `observedAt`). If Today
  ever leaves out shifts that start later in the day, Team would show nothing for that person, as before.
- The Owner Home in `cap/fa-owner2` drew "Couldn't check your access" once and the inbox logged `503 GET /api/notifications`
  while four captures and a full test run shared the Mac; the same routes rendered in `cap/fa-owner` and `cap/fa-manager`.
  Worth a look only if it repeats on Development.

## For Jose

1. Updates, Time off requests, Shift requests and Notifications have no sub-line, so their bands end higher (270, 264) than
   their siblings (296). A one-line sub-line would put them on one frame, for example the rail's own lines: Time off
   requests "Waiting and decided", Shift requests "Swaps and covers". Words are yours.
2. Restrictions: keep "Not confirmed yet" or use the reviewer's "No agreement yet" for a record nobody confirmed.
3. "Times in Puerto Rico time." (app-wide) could read "Shown in Puerto Rico time."
4. One phone gutter (14 or 16) for every page; and one band surface (keep the ruled texture on BHero bands or drop it).
5. The Manager sidebar's second group has no "More" heading by MG-007; say if you want it back.
6. Things to do's "Another reviewer approves this one" and Home's "Another reviewer approves your timecard" say one fact two
   ways; Help's "Help someone sign in" sub-line repeats its question (FB's page).
7. Team's four filters on a phone are now two rows of two (nothing cut); the alternative is three filters on phones.

## Not verified

- Real devices and Safari: everything is Chromium in the harness; 844x390 is touch emulation.
- "See 1 more" on Home (no fixture had more people on now than the card shows).
- Keyboard order and focus rings on the new link and the restrictions pair (source order is the visual order on phones;
  from 768px the filled decision is first in the tab order and drawn on the right).
- Reduced motion and High Contrast on the changed parts (no motion was added; the glass keeps its 16% edge).
- Screen readers: the hidden " · " between facts and the "Not clocked in · 40 min" label were checked in the markup only.

