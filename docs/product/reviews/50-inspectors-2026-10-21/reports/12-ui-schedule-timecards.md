# 12 UI Designer — Schedule and Timecards (phone and desktop) vs mockups schedule-390/1440, timecards-390/1440

**Verdict**
Both pages match the approved v3 mockups closely. They look calm, aligned and native, with tabular numbers everywhere. The weakness is information design for a scheduling power user. The roster shows *who works when*, but not *which location*, *what position*, *how each day is covered* or *where the problems are*. The timecards table spends space on empty columns and runaway numbers but gives no scheduled-versus-actual comparison. The skin is finished, but at-a-glance decision support is still missing.

## Recommendations

1. **Add a per-day coverage footer to the desktop roster, and make the phone week-strip dots carry status.**
   *Why:* The only total is the corner cell ("6 people · 336h", `manager-weekly-roster.tsx:188`). A manager can't see "Wed: 6 on, 48h, 3 open" without counting chips. On phones, the strip dot only means "has shifts" (`:125`, grey `#8A8A87` at `schedule.css:301`). In `QAOWNER-schedule-390` every day has 3 open shifts, yet all seven dots are the same grey, so the most important signal is invisible.
   *Do:* Add a `<tfoot>` row with people, hours and open count per day, plus the over-target count. Draw the dot coral when a day has open shifts and grey when it is covered. Put the reason in the aria-label too.
   *Impact:* High. *Effort:* S. *Owner:* UI.

2. **Show location (and position) on shifts when "All locations" is selected.**
   *Why:* On the desktop the block shows only times (`:55`). Position and location sit only in a `title` tooltip (`:53`), which touch and keyboard users never see. On the phone, the row meta uses `shift.position || shift.location` (`:115`), so assigned shifts never show their location, while open shifts do (`:135`). In `QAOWNER-schedule-1440` (All locations) nobody can tell Main Office from West Office.
   *Do:* In the All view, add a 3px left edge or a small location initial/dot to each block, from a 2–6 colour location ramp checked against teal and coral. On the phone, use "Position · Location" in All.
   *Impact:* High. *Effort:* M. *Owner:* UI. A location colour key needs Product sign-off.

3. **Stop showing ambiguous midnight and overnight times.**
   *Why:* The phone shows open shifts as "12:00 AM / 12:00 AM" and "12:00 AM / 7:00 AM" (`QAOWNER-schedule-390`). The desktop shows "12a – 12a" (`QAOWNER-schedule-1440`). `compactTime` already says "midnight" (TC-25, `:24`), but the visible `clock()` (`:29`) and `brief()` (`:31`) don't use it. Overnight is announced only through `sr-only` (`:59`).
   *Do:* Show "midnight" or "12a" with "+1" on the end time, and show "24h" for whole-day blocks. Add a visible "+1" suffix to every overnight block.
   *Impact:* High (it is easy to misread a shift). *Effort:* S. *Owner:* UI.

4. **Timecards desktop: replace the empty Role column with Scheduled and Variance, and turn runaway totals into "Open since…".**
   *Why:* Role is "—" in all 13 rows (`QAOWNER-timecards-1440`) because `roleOf` reads punch `positionName` (`timecards.tsx:79`), and punches don't capture position ("Position not captured", `:40`). The column takes about 25% of the table width. Casey shows Recorded 25h 42m and Breaks 22h 52m: open punches and breaks keep counting and read as fact.
   *Do:* Use the columns Person · Scheduled · Recorded · Δ (coloured amber when beyond ±15m) · Breaks · Status. For an open entry, show "Open since Mon 7:39 PM" in amber instead of a growing number.
   *Impact:* High. *Effort:* M. *Owner:* UI. Backend (Codex) must expose scheduled minutes per card or a position fallback.

5. **Give the timecard sheet's "Needs attention" box fix actions, and a day-by-day view.**
   *Why:* The box lists "No clock-out yet / Open break" with no action (`timecards.tsx` around line 389, `r4-tc-upd/tc-sheet-QAOWNER-chromium-1440-details.png`). Below it, two disabled pale-teal buttons (Approve, Finalize) appear with no reason next to them. The entries are a flat list of punches with the year repeated three times ("Oct 19, 2026, 7:39 PM").
   *Do:* Put an inline "Add clock-out" or "End break" link on each issue. Group entries by day as "Mon 19 · Scheduled 9a–5p · Recorded 7:39p → open". Drop the year inside the current period. Show the blocking reason directly under the disabled primary button.
   *Impact:* High. *Effort:* M. *Owner:* UI. Backend is needed for correction entry points if missing.

6. **Make "today" on the desktop roster stop using alarm red.**
   *Why:* The desktop today badge is `#D92D20` (`schedule.css:203`). That is the same red family as open-shift blocks (`#D0453A`/`#B42318`) and the Inbox count. On the phone, today is teal (`schedule.css:70-72`). Red therefore means "today" in one place and "problem" in another, and Wed 21 sits right above three red dashed open blocks.
   *Do:* Use ink (`#111` pill, white numeral) or teal on the desktop, to match the phone. Keep coral for problems only.
   *Impact:* Medium. *Effort:* S. *Owner:* Product (the mockup shows red, so Jose decides). UI implements.

7. **Make "over limit" quantitative, and explain the lead marker.**
   *Why:* Five of six rows read "56h · over limit" (`QAOWNER-schedule-1440`). The amount over and the limit appear only in a `title` (`:164`). The 12px filled Medal icon on Taylor's blocks (`:56`) has no visible legend, and teal-on-teal at 12px is barely readable.
   *Do:* Show "56 / 40h" with "+16h" in amber. Replace the medal with a small "Lead" text tag or a 2-letter badge, or add a one-line legend above the grid (Lead · Draft · Open).
   *Impact:* Medium. *Effort:* S. *Owner:* UI.

8. **Fix the contradictory West Office message and the hidden rows in the phone day list.**
   *Why:* The card says "West Office isn't planned · Nothing scheduled this week". Directly below it is a West Office open shift (`QAOWNER-schedule-390`, `AUDIT-M-schedule-390`). The day list also cuts off at 5 of 9 rows (`SHOWN = 5`, `:111`), so on a busy day the manager sees mostly the open shifts and three people.
   *Do:* Change the copy to "West Office: 7 open shifts, nobody scheduled". In the day list, group shifts as "Open (n)" and then "On shift (n)", and raise the cap to about 8, or show all with sticky section headers.
   *Impact:* Medium. *Effort:* S. *Owner:* UI (copy) and Product.

9. **Reduce zero-hour noise in Timecards, on both widths.**
   *Why:* 11 of 13 rows are "0h · Draft" (`QAOWNER-timecards-1440`). The phone shows four 0h rows and then "Show 9 more" (`QAOWNER-timecards-390`). A faint checkbox appears on every row even though approvals are closed until Oct 25 ("Approvals open after Sunday"). Zero shows as "0h" while the mockup and the other rows use "Xh YYm".
   *Do:* Sort by attention, then by hours descending. Collapse people with no time into "11 with no time recorded". Hide the checkbox column until approvals open. Show "—" in muted grey for zero.
   *Impact:* Medium. *Effort:* S. *Owner:* UI.

10. **Prepare the roster and timecards palette for dark mode and brand theming.**
   *Why:* Grid and chip colours are raw hex values under 10-level selectors (`#EAF3F2`/`#0B4E4B` blocks, `#ECECEA` lines, `#fff` cells, `schedule.css:191-235`, `timecards.css`). They don't use `--cm-*` or `--g-*` roles, so dark mode or a company brand tint means rewriting every rule.
   *Do:* Add `--cm-shift-bg/fg`, `--cm-open-line`, `--cm-draft-line`, `--cm-today` and `--cm-grid-line` tokens, with contrast checked in light and dark.
   *Impact:* Medium (long term). *Effort:* M. *Owner:* UI.

## What's good
- The match to the mockups is tight at both widths: the iOS week strip, the grouped day list with red "Open shift" and Find Cover, the flat hairline grid, and the four-figure timecards stat strip with tabs.
- Numbers use tabular figures throughout (`schedule.css:68,120,202,218,225`; `timecards.css:59,192`), so hours and times line up cleanly in columns.
- Open shifts (dashed coral) and draft shifts (dashed teal) differ by border style as well as fill. Screen-reader labels per block are thorough: person, day, times, location, draft, lead and overnight (`manager-weekly-roster.tsx:44-62`).

## Not checked / limits
- No browser use, by brief. All findings come from the supplied full-page screenshots, the older QA captures (`r4-tc-upd`) and the source code.
- Not seen: hover, pressed and focus states live; the narrow-desktop scrolling grid (768–1179px); the single-day focus view; large text; dark mode; reduced motion; the batch-approve flow; Approved and Finalized timecard states.
- I didn't verify whether the 25h 42m / 22h 52m values reflect a real backend total or the preview clock running. Recommendation 4 stands either way.
- I didn't measure colour-blind separation of the coral and teal dashed borders in a simulator.
