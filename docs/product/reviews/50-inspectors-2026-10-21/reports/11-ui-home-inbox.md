# 11 UI Designer — Home and Inbox, Owner and Manager, phone and desktop

**Verdict.** On phones, Home and Inbox now read as close to native iOS. The inset grouped lists, footnote section headers, segmented control and item sheet all follow the v3 mockups, and the counts agree (Home 4, Inbox 4, badge 4). They still fall short of 10/10 in three ways. Desktop Home is unbalanced and longer than the screen. The Inbox tail has grown back the clutter v3 removed. Today's data shows a person in two places at once, which damages trust more than any spacing issue.

## Recommendations

1. **Make "Working now", "Later today" and the timeline agree for people who clock in early.**
   - *What:* Match an open clock-in to that person's shift today, whatever the shift's status. Then:
     - remove that person from Later today;
     - show "until 5 PM" on the right of their row;
     - draw their timeline bar as clocked in;
     - widen the timeline range so the "now" line is always drawn (or hide "Now, 1:12 AM" in the key when the line isn't drawn).
   - *Why:*
     - Every Home shot shows Casey Rivera twice: in Working now ("on break") and in Later today ("9 AM – 5 PM").
     - Jordan Rivera is "in at 12:28 AM" with no end time.
     - The timeline draws both as grey "Later today" bars.
     - The key says "Now, 1:12 AM", but no line is drawn because the range runs from 7 AM to 5 PM.
     - Code: `shiftFor` only finds shifts where `working(shift)` is true and `later()` doesn't exclude people already clocked in (`src/components/premium-home.tsx:200, 216-217, 241`). The range is the earliest start to the latest end, and the now line is skipped when it falls outside (`:254-275`).
   - *Impact:* High (trust). *Effort:* S–M. *Owner:* UI.

2. **Recompose desktop Home so it fits one screen and its columns balance.**
   - *What:* Put Working now and Later today in one card with a sub-header, as the mockup does. Limit Later today to about 3 rows on desktop, since the timeline already lists everyone. Use single-line rows (Name · detail … time).
   - *Why:*
     - The approved target is "nothing below the fold at 1440". The mockup is 900–920px tall; the build is 1088px (Manager) and 1167px (Owner), so the Shifts today timeline starts at y≈720–800.
     - The left column ends at y368 while the right runs to y700, leaving about 330px of empty canvas under Needs you (`AUDIT-M-home-1440.png`).
     - Desktop rows are two-line, phone-style rows of about 54px, against 48px single-line rows in `home-1440.png`.
   - *Impact:* High. *Effort:* M. *Owner:* UI.

3. **Give the coverage-gap detail pane the same structure as the other item types, and calm its red.**
   - *What:*
     - Replace the solid red 48px warning tile with the light-tint calendar-x tile the list and Home use.
     - Keep red to the one status line.
     - Add the facts grid (Date, Time, Location, Role, Need) and an Activity block.
     - Let the button size to its label, as the mockup's buttons do.
   - *Why:*
     - `QAOWNER-inbox-1440.png` stacks three reds: a filled tile, a red dot, and "Not covered". It is the heaviest red element in the Manager app.
     - The pane is about 900px wide but holds four lines and one fixed-width button of about 200px. It reads unfinished next to the request pane, which has a facts grid (`qa-out/confirm-desk/int/inbox-item-1024.png`).
     - The pane uses a warning icon while the list uses calendar-x, so the same object has two icons.
   - *Impact:* High. *Effort:* M. *Owner:* UI, plus Backend if role or need isn't in the item contract.

4. **Trim Plan ahead back to its approved rows and keep one footnote.**
   - *What:*
     - Drop "Timecards to review", "Availability not sent" and "Schedule not confirmed" from Plan ahead, or fold them behind one "More planning" disclosure. Product decides which.
     - Combine the three footnotes into one line.
   - *Why:*
     - The mockup has 4 Plan ahead rows; the build has 7 on both phone and desktop.
     - "Timecards to review 2" breaks the count dictionary, which says that count appears on the Timecards overview only (`spec.md:141`).
     - Three footnotes stack at the bottom: the planning note, "Some attendance comparisons are unavailable…" and "Updated · Refresh" (`manager-inbox.tsx:444, 450`). The spec says "Less text".
   - *Impact:* Medium–High. *Effort:* S. *Owner:* Product, then UI.

5. **Use one disclosure grammar.**
   - *What:* On phones, every inset-list row pushes to a new screen with a right chevron, as iOS does. On desktop, an expandable row uses a caret that points right and rotates down when open.
   - *Why:* The phone Inbox mixes down and right chevrons in one list:
     - Main Office expands in place while West Office pushes.
     - Availability deadline pushes while its neighbours expand.
     - The tint-coloured "All requests" link opens downward.

     Code: `CaretDownIcon` in `manager-inbox.tsx:203, 552` against `CaretRightIcon` at `:71, 556`. The result reads as two systems mixed together.
   - *Impact:* Medium. *Effort:* S–M. *Owner:* UI.

6. **Show one freshness stamp per page, outside the content rhythm.**
   - *What:* Move "Updated 1:10 AM" out from between cards. On phones, put it at the bottom of the page or rely on pull-to-refresh. On desktop, use the top bar or the page subtitle.
   - *Why:* On phones it sits between Working now and Later today and opens a gap of about 60px (y617→678 in `AUDIT-M-home-390.png`). Every other section gap is about 26px. Desktop adds a green dot as well (`premium-home.tsx:223`). The Inbox repeats the stamp in its footer.
   - *Impact:* Medium. *Effort:* S. *Owner:* UI.

7. **Fix the type-scale slips and lead each request row with its dates.**
   - *What:*
     - On desktop, "Show 2 more" should use the desktop link style.
     - Request rows should say "Time off · Oct 29 – 30", not "Alexandra Rivera, time off" or "Time off · sent Oct 20".
   - *Why:*
     - "Show 2 more" is rendered as a phone `nv-row` at 17px (`premium-clean-manager.css:1148`). "Open Inbox" next to it uses 13.5px weight 500 (`:373`), so the size jump is visible in both desktop Home shots.
     - The mockups put the requested dates first (`home-1440.png`, `inbox-390.png`). The build shows when the request was sent, which matters less.
   - *Impact:* Medium. *Effort:* S. *Owner:* UI.

8. **Tighten the phone large-title block.**
   - *What:* Set the date eyebrow directly above "Today" and "Inbox", about 8–12px above the title's cap height, as iOS does.
   - *Why:* In `*-home-390.png` the eyebrow sits about 25px above the title (estimated from the screenshot), against about 12px in `home-390.png`. The date floats free of the title it belongs to, which is the clearest "web, not native" cue left at the top of the page.
   - *Impact:* Low–Medium. *Effort:* S. *Owner:* UI.

9. **Shorten the desktop sidebar.**
   - *What:* Fold the five "Team tools" items (Attendance, Team overview, Schedule activity, Clocker recovery, Account recovery) into one collapsible "Team tools" entry, or into a sub-navigation on the Team page.
   - *Why:* The Owner sidebar has 16 items in 5 groups and the Manager sidebar has 14. The mockups have about 11. "Team tools" is now the longest group, longer than Plan, and pushes Settings down near "Powered by" (`QAOWNER-home-1440.png`). The spec says they live "under Team" (`spec.md:72`).
   - *Impact:* Medium. *Effort:* S. *Owner:* Product, then UI.

10. **Give each object one colour and one icon on every platform.**
    - *What:* Open shifts should use the same tile colour and the same icon on phone Home, desktop Home, the Inbox list and the detail pane.
    - *Why:*
      - Phone Home uses a solid amber tile; desktop Home a light-red tile with calendar-x; the desktop detail pane a solid red tile with a warning icon.
      - The spec reserves amber for "waiting / needs review" and red for open shifts (`spec.md:18`).
    - *Impact:* Low–Medium. *Effort:* S. *Owner:* UI.

## What's good
- Counts agree on every surface: Home Needs you 4, the Inbox title "4 things need you today", the tab-bar and sidebar badge 4, and Act now 3 equals open shifts 3. This is what the clean contract asked for.
- The phone Inbox follows iOS closely: inset grouped lists, uppercase footnote section headers, the segmented control, and a calm amber "Waiting". The item sheet (`qa-out/sheetfix/inbox-sheet-390.png`) is the best-made screen in this set: centred avatar, a facts grid, one primary action, and Done.
- Desktop Inbox keeps the approved split view with underline tabs and counts, and the request detail pane matches the mockup's facts layout.

## Not checked / limits
- No browser (per brief), so hover, pressed, focus, reduced motion, dark mode and the loading, empty and error states are not checked. This review uses static full-page screenshots, the mockups, and a code read of `premium-home.tsx`, `manager-inbox.tsx` and `premium-clean-manager.css`.
- Some things in the screenshots are capture artefacts, not bugs:
  - The fixed tab bar appears mid-page in the phone shots.
  - The sidebar background stops at y900 in the desktop shots.
  - The Next.js dev indicator ("N") covers the Home tab icon and "Powered by", so the Home tab icon could not be checked.
- The current screenshots were taken around 1:10 AM, so Not clocked in is empty and the timeline is unusual. For a Not clocked in row I used the earlier QA shot at 1024px.
- Spacing measurements are estimated from the screenshots; I didn't take pixel measurements.
- One observation for the engineering reviewers, outside my lens: every v3 rule fights for specificity with a selector like `html body .app-shell.nevora-portal.nevora-portal[data-nv-clean][data-nv-clean]:not(.cm-a)…:not(#cm-stack)`. That likely explains why small type and spacing slips (for example #7) keep returning.
