# Phase 3, package C: Timecards, Time corrections, Time exports and Payroll (Owner and Manager)

Builder C took over a stopped builder's partial work. I read its whole diff, kept what was right, fixed what was wrong and
finished the rest. Base `ed7f8b4c`. Patch: `c.patch` (14 files, 320 lines added, 54 removed). Nothing pushed, no branch.

## Takeover: what I found and changed

Kept from the earlier builder (checked in the browser): the Timecards table and phone rows, the "You" chip and approver
line, the success block, the sheet footer, the corrections sub-line, the Payroll rail, the Time exports line.

Fixed or added by me:
- OW-004 was not fixed. The canvas still showed between the bar and the sub-line on phones. Now joined.
- The phone timecard sheet moved 44px up the screen after Approve and showed the tab bar under it. It was positioned
  against the page, and the page scrolled. Now fixed to the screen.
- Manager Time exports on desktop and tablet: band ran to 338px and the first card sat 44px inside it (the Phase 2 rule
  assumed Payroll's tabs, which a Manager does not have). Now band 196, card 24px under.
- Time exports File format alignment (Phase 2 leftover): not started before. Done.
- Payroll's loading frame: not updated before. Done.
- 320px: Timecards statuses were cut mid-letter and the replaced payroll row lost its payday. Fixed.

## Findings

| Id | Status | What was done or found | Evidence |
|---|---|---|---|
| OW-004 | fixed | Phone sub-line starts where the bar ends, on the title's 16px inset. No strip. | `owner-b-time-pay.css` "OW-004"; `c-shots/10-manager-corrections-390.png`; probe: bar ends 114, sub-line starts 114 (was 126) |
| OW-015 | fixed | The note is said once, in the band sub-line, with the count: "4 waiting · Fixes your team asked for. Original times are always kept. Times in Puerto Rico time." Removed from each card. | `manager-time-corrections.tsx:76-77,103`; test `manager-time-corrections.test.tsx`; `c-shots/09` |
| Phase 2 leftover: corrections heading | fixed | "Correction requests 4" is for screen readers only on this page. First card starts 24px under the band (band 224, card 248) at 1440, 1100 and 900. | scan-log `gapUnderBand: 24`; `c-shots/09` |
| OW-016 | fixed | Chips only for amber (act now) and green (done); "In progress" and "Clocked in now" are grey text. Status is right-aligned at the card inset with a chevron. Rows show a hover and focus tint and a pointer. Exceptions sort first. Tab labels 14/600 with the 20px count pill. I did not add "Scheduled" and "Difference" columns: the timecards read has no scheduled hours (see For Codex). | `timecards.tsx:393-397,789`; `c-shots/01` |
| OW-017 | fixed | Bar removed (it had no scale). Every row is 72px (measured 72 on all rows at 390). Hours right-aligned, tabular, 72px column. Line 2 shows whole parts only. | `c-shots/02`, `03`; probe `rowsInfo h: 72` |
| OW-018 | fixed | From 1024px Payroll is a 1080 list with a right rail: notice and Recent payrolls left, "Up next" (period, payday, three steps) right. One column on tablets. Notice has the red icon circle and an ink 600 title. Replaced row nests with a connector and a grey struck-through amount on both widths. Desktop amounts say "Net": the field is `totals.netMinor` and the phone already labels it "Net", so this is proven. No payroll sentence was rewritten. | `payroll-runs.tsx:174,206-221,352`; `c-shots/11`, `12`, `13`; scan-log band 296 at 1440, 900, 768 |
| OW-037 | partly | Success is a green block: 36px green circle with a check, "Approved" or "Finalized", "7 of 12 done". "Finalize period" is a tinted pill until every card is approved. Not done: the 1.2s hold and auto-advance to the next card (see For Jose). | `timecards.tsx:490-493,515`; `c-shots/07`, `08` |
| OW-039 | fixed | Phone sheet is the screen height less 48px. The one decision is a sticky footer above the safe area (16px inset), 48px tall. The sheet no longer moves when the page behind scrolls. | `c-shots/06`, `07`; probe: sheet y 48, h 796, footer sticky |
| OW-003 (my pages) | fixed | Time exports now uses the shared formatters ("24 h 7 min" in sentences, "24 h 07" in the people column). Timecards already did (Phase 1). Timecard sheet stamps drop the year unless it differs ("Nov 10, 9:02 AM"). Payroll date ranges already use the one period format. Counts: see MG-004; Home and Things to do are other packages. | `payroll-export.tsx:34-38`; `timecards.tsx:46-50` |
| OW-034 (my pages) | fixed | Corrections "Waiting" and Payroll row pills are the one chip size (22px, 12/600). Timecards uses the kit chip. | `owner-b-time-pay.css` "OW-034" |
| MG-004 (Timecards) | fixed | Grey "You" chip on the viewer's own row (the read gives the employee id; the page has the session id, so no server change). Once the week closes the row says "Jose approves this one", not "Ready to approve". Own card left out of "N to approve · N to finalize" (5 became 4 in the fixture). The batch count already left it out. The card says "Jose Natal approves your timecard." | `timecards-own.ts` + test; `timecards.tsx:393,417-422,578`; `c-shots/04`, `05` |
| MG-010 (remainder) | fixed | One line above the button. While the week is open: "Timecards for Nov 9 – 15 can be approved from Mon, Nov 16." The second note is gone when that line shows. Manager's row on Timecards says "Download approved hours". Who finalizes: the server lets Owners and Managers both finalize (`src/lib/timecards/service.ts:23`), so no "Jose finalizes" line was added. | `payroll-export.tsx:189-192,227-230`; `c-shots/14`, `15` |
| Phase 2 leftover: File format grid | fixed | Sections sat 24px inside the card inset on both sides. Fields now run 319 to 1085 at 1440 (the card's inset) and 33 to 357 at 390. | `c-shots/16`; probe in scan-log `exp-format` |
| Manager Time exports band (found) | fixed | Band 338 with the card 44px inside it. Now band 196, first card at 220, at 1440 and 900. | `c-shots/15`; scan-log `bandBottom 196, gapUnderBand 24` |
| Nov 14 AR-11 | already fixed | The next-step row after finalizing exists (`payrollStep`). | `timecards/page.tsx:36-37` |
| Nov 14 BR-2 | already fixed | Steps line and the two chips ("Ready to approve", "Ready to finalize") are in place. | `timecards.tsx:438` |
| Nov 14 UI-9 "Pending" | already fixed | Time corrections says "Waiting". | `manager-time-corrections.tsx:99` |
| Nov 14 BR-1 | partly | Formats are one set on my pages. Agreement of counts with Home and Things to do belongs to those packages. | |
| Nov 14 Manager "My time" | needs Jose | A Manager who clocks in has no personal time view. Product decision. | |

## What changed, by screen

- **Timecards desktop and tablet**: status column as above, chevrons, hover, tab pills, exceptions first, "You" chip.
- **Timecards phone**: 72px rows, no bar, fixed hours column, "You" chip; at 320 the hours column shrinks to its figure.
- **Timecard sheet**: success block; decision in a footer (sticky on phones); "Retry pending action" moved to the footer;
  short stamps.
- **Time corrections**: title and sub-line drawn by the queue so the sub-line carries the count; no heading on the canvas;
  no note in cards; one chip size.
- **Time exports**: one waiting line; shared duration formats; File format on the card inset; Manager band.
- **Payroll**: rail from 1024px; notice icon and ink title; "Net" under desktop amounts; nested replaced row on both
  widths; loading frame is `rail-desktop` (`b-loading.tsx`, the one allowed line).
- Payroll prepare, history, a run and My pay: looked at, frame unchanged (band 196, card 24 under). History shows the
  same nested replaced row and "Net".

## Wording changed

| Where | Old | New |
|---|---|---|
| Time corrections sub-line | "Fixes your team asked for. You’ll always see the original time." | "4 waiting · Fixes your team asked for. Original times are always kept. Times in Puerto Rico time." (the finding's words; no count before the read lands) |
| Time corrections cards | "Times in Puerto Rico time. Approving changes the timecard; the original clock times stay in the history." in each card | removed on this page |
| Time corrections | visible heading "Correction requests 4" | screen readers only |
| Time exports, week still open | "Approve 11 timecards first · Go to Timecards" and "Only finalized timecards are exported." | "Timecards for Nov 9 – 15 can be approved from Mon, Nov 16. Go to Timecards" (one line) |
| Time exports, week ended, nothing final | second note "Only finalized timecards are exported." | removed (the waiting line stays as it was) |
| Time exports people column | "24 h 7 min" | "24 h 07" |
| Timecards tools row, Manager only | "Download hours for payroll" | "Download approved hours" |
| Own row, week closed, Manager | "Ready to approve" | "Jose approves this one" (two Owners: "Jose or Ana approves this one"; no name: "An Owner approves this one") |
| Own row, week closed, Owner | "Ready to approve" | "Another manager approves this one" |
| Own card, Manager | "Another manager approves your own timecard." | "Jose Natal approves your timecard." (fallback "An Owner approves your timecard.") |
| Timecard saved | "Elena Ruiz’s timecard is approved." (visible) | "Approved" and "7 of 12 done" (the sentence stays for screen readers) |
| Timecard sheet stamps | "Nov 10, 2026, 9:02 AM" | "Nov 10, 9:02 AM" (year only when it differs) |
| Payroll desktop rows | amount alone | amount with "Net" under it (the phone's word) |

No payroll or statement sentence was rewritten.

## Checks run

- `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .`: no errors in `src`.
- `npx eslint <the 11 changed ts and tsx files>`: clean.
- `npx vitest run --dir src src/components/payroll src/components/timecards src/components/manager-time-corrections
  src/components/payroll-export src/app/app/timecards src/app/app/payroll ...`: 24 files, 379 tests passed.
- `npx vitest run --dir src src/app/app` (stylesheet and viewport tests included): 74 files, 754 tests passed.
- `npx vitest run --dir src src/app src/components src/lib`: 801 files passed, 12 failed (32 tests), run while a capture
  and other builders loaded the machine (load average 28). None is a file I changed. 27 were 5s timeouts. Re-run alone:
  all pass except one test in `src/lib/tenancy/migrations/typed-guarded-backfill.server.test.ts`, which timed out
  again at 5s (server migration code, untouched).
- Browser captures, real app, fictional data: Owner at 1440, 1100, 900, 768, 390, 320 and Manager at 1440, 1100, 900,
  390 on Timecards (this week, last week), corrections, Time exports, Payroll, prepare, history, My pay, Payroll
  settings. `overflow` 0 and no small targets on every route and width. States: sheet open, approve, approved,
  a long sheet, File format open, corrections band. One Employee check (`/app/timecards`, `/app/my-time` at 390 and
  1440): unchanged, the "Time" small target at 1440 is in the older baseline too.
- Band: Payroll, Time exports, Payroll settings 296 for the Owner at 1440, 900, 768. Tabs not moved.

## For Codex

1. **Scheduled hours per person on the timecards read** (`/api/timecards`, read in `timecards.tsx` table). OW-016's
   optional "Scheduled" and "Difference" columns wait on it. Not needed for the fix as built.
2. **Owners' names on Timecards for a Manager**: `src/app/app/timecards/page.tsx` now calls the existing
   `listEmployees()` (as `payroll-route.tsx:16` does) to name who approves a Manager's own card. No server change.
   Please confirm this read is fine there, or supply approver names on the timecards read. A failed read shows "An Owner".
3. **Who can approve an Owner's own card**: the screen cannot tell whether another Owner or a Manager exists, so an
   Owner still reads "Another manager approves...". A field naming the eligible approvers would fix MG-004 for Owners.
4. A console "503 (Service Unavailable)" appeared on the first page load of three captures that ran while the machine
   was loaded (once the page showed "Couldn’t check your access"). It did not appear in the unloaded run. Not traced.

## For Jose to decide

1. OW-037 auto-advance: after Approve, hold 1.2s then open the next ready timecard. I did not build it. It moves focus
   on its own and hides the same card's "Finalize period" step. Say yes and it is a small change.
2. Phone rows drop the breaks part when it does not fit ("In progress · 2 h 30 min breaks" is 28px too wide at 390; any
   row with a chip shows the chip only). Breaks stay in the card and the desktop table. Alternative: a shorter form.
3. Time corrections cards no longer say "Approving changes the timecard; the original clock times stay in the history."
   The band says "Original times are always kept." The finding asked for this.
4. "Approve 1 ready timecards" (desktop batch button) is wrong grammar. Left alone because QA scripts press it by name.
5. Owner's own row reads "Another manager approves this one" once the week closes. New string, from the card's sentence.
6. A Manager has no personal time view (Nov 14 inspection).

## Needed from another package

- Things to do and Home: leave the Manager's own card out of "Timecards to approve" and its name list (MG-004's other
  half), so the counts match Timecards.
- `b-loading.tsx`: Payroll's loading frame is now the rail for both roles. A Manager's closed Payroll page is one narrow
  card, so its skeleton shows a rail briefly. Fixing that needs a per-role entry (the app shell's file).
- The phone sub-line seam (OW-004) is fixed for Time corrections only. The cause is shared (`owner-b-pages.css:67` and
  `:158` cancel each other), so other pages that use `.c-phone-sub` under a phone bar may show it.

## Not verified

- Reduced motion, keyboard order and screen reader output were not tested by hand. The captures run with reduced motion
  on. Focus tint on table rows is CSS only and was not captured.
- The Manager's own timecard sheet ("Jose Natal approves your timecard.") is covered by a unit test, not a screenshot.
- The Owner's own row after a week closes: the fixture Owner has no time, so it was not seen.
- Time exports' new line has no unit test (the component's test harness does not pass `today`); it is in screenshots.
- Finalized state, "Retry pending action" in the footer, and a real safe-area inset on a device were not captured.
- Payroll loading skeleton with the rail was not captured.
- The one migration test timeout above was not chased.
