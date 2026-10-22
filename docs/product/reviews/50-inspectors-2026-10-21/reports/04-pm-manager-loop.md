# 04 Product Manager — a manager's daily and weekly loop

**Verdict.** The morning check works well: Home answers "who's in, who's missing, what needs me" with no taps. Every *decision* after that costs one extra page, though. The Inbox only shows the problem and then sends the manager somewhere else to act (`manager-inbox.tsx:56` "O1: never a decision from here"). Several decisions don't return to the Inbox afterwards. Two jobs dead-end: reaching a no-show, and closing a timecard with a missing clock-out. The biggest gains come from letting the Inbox sheet and pane decide, and from closing those two dead ends.

## Tap and page counts (from code paths and screenshots; phone unless stated)

| Job | Path today | Taps | Screens | Achievable |
|---|---|---|---|---|
| Morning check | Open app → Home (Needs you, Working now, Later today) | 0 | 1 | 0 |
| Reach a no-show | Home "Not clocked in" → Inbox row → sheet **Contact** → person page (an edit form) → read number → leave app and dial | 3 + manual dial | 3 + sheet | 2 (row → Call) |
| Cover an open shift today, from Home | Home "Open shifts today" → expand location group (Main Office 2) → gap row → **View coverage gap** → candidate **Review replacement** → **Save replacement** → Back lands on *Schedule*, not Inbox | 6 (+1 to get back) | 4 + sheet | 3 |
| Same, from the Schedule tab | Schedule → **Find Cover** → candidate → Save | 4 | 3 | 3 |
| Approve time off | Home row → Inbox row → **Review time off** → Approve (returns to Inbox) | 4 | 3 + sheet | 2 |
| Approve a swap | Home row → Inbox row → **Review shift request** → Approve (stays on Shift requests) | 4 (+1 back) | 3 + sheet | 2 |
| "Unable to work" through to covered | Approve the callout (4), then Inbox → gap → cover (6) | ~10 | 6+ | 4 |
| Build and publish next week (desktop) | Schedule → › → More → Copy previous week → More → Build and publish → Publish Main → Publish West (+ "anyway" when there are warnings) | 8 (+1 per location) | 1 | 4 |
| Close last week's timecards (desktop, bulk) | Timecards → ‹ → Select all → choose action → Review selected → tick "I reviewed…" → Approve selected → switch to Finalize → Review → tick → Finalize | ~11 (phone +2 via More) | 1 | 3–4 |
| Close a card with "Missing clock-out" | **Dead end.** Approve is disabled, and a manager has no way to add the clock-out. They have to wait for the employee to send a correction, then approve it under Team tools → Attendance, then return to Timecards. | n/a | 3 | 3 |

## Recommendations

1. **Let the Inbox sheet and pane decide: Approve and Decline for time off, swaps and "unable to work" reports.**
   *Why:* The sheet and pane already show the request facts (dates, length, location, note: `manager-inbox.tsx:112-123`). Even so, they tell the manager to "Approve or decline it on the full request" (`:139`). On desktop the pane is about 670px of empty space holding one button (AUDIT-M-inbox-1440, QAOWNER-inbox-1440). `reviewTimeOffAction` already takes `requestId`, `decision` and `returnTo=inbox` (`requests/actions.ts:58-90`), so the time-off decision needs no new server work. Keep the full review page as "More details". This contradicts rule O1, but it matches the spec's own job title for the Inbox, "What do I need to decide?" (`spec.md:82`). Saves 1 page and 1–2 taps per request, and the manager stays in the queue.
   *Impact:* High. *Effort:* M. *Owner:* Product (retire O1) → UI. Backend has to add `requestRevision` to swap and callout action items.

2. **Put the top cover candidates inside the open-shift sheet and pane, with Assign and one confirm.**
   *Why:* Covering a gap from Home takes 6 taps and 4 screens. The Schedule tab does the same job in 4 taps with an inline **Find Cover** pill (AUDIT-M-schedule-390), so the Inbox path is the longer of the two. The ranked list already exists (`readCoverageRepair` and `rankCoverageCandidates` in `schedule/coverage/page.tsx`). Show the first 3 with "Assign", plus "See all candidates". Today's gaps are the most time-critical items in the loop.
   *Impact:* High. *Effort:* M. *Owner:* UI + Backend (candidate read keyed by action item).

3. **Make "Contact" for a no-show actually reach the person: Call and Text buttons, plus "Find cover for this shift".**
   *Why:* **Contact** (`manager-inbox.tsx:159`) opens `/app/employees/{id}`, which is an edit form; the phone number is plain text (QAOWNER-person-390). The codebase has no `tel:` or `sms:` link anywhere (grep of `src/components` and `src/app/app`). A no-show also has no path to cover their shift: the spec's "Edit Shift" action was never built (`spec.md:85`, and the comment at `manager-inbox.tsx:176` about snapshot shift ids). Of every daily job, this is the one where seconds matter most.
   *Impact:* High. *Effort:* S (call/text) to M (find cover). *Owner:* UI. Backend adds the phone number and the live shift id to the Today snapshot.

4. **Close the missing clock-out dead end, and stop Home from presenting a 24-hour punch as "working now".**
   *Why:* A card with `open_entry` disables Approve (`timecards.tsx:401`). The manager-side correction screen only approves or declines what the employee sends (`manager-time-corrections.tsx:95-96`), and there is no "remind them to fix it" action anywhere. Meanwhile Home lists Jordan as "in at 12:28 AM" (AUDIT-M-home-390), but Timecards shows 24h 43m recorded and "Missing clock-out" (AUDIT-M-timecards-390). The time has no date (`premium-home.tsx:228`), and long-open entries get no warning. The fix: add "Add clock-out" to the timecard sheet (manager-entered, with a reason, original Clocker record kept) and "Ask {name} to fix" to the timecard sheet and the Inbox. On Home, show "in since Tue 12:28 AM · open 24h" with a review link.
   *Impact:* High (it blocks the weekly close and erodes trust in Home). *Effort:* M. *Owner:* Product (correction policy) + Backend + UI.

5. **Return every decision to where it started, and offer "Next".**
   *Why:* Only time off redirects back to the Inbox with a toast (`requests/actions.ts:83-90`; the only `decided=` in the codebase). Swap and callout decisions stay on Shift requests. Coverage saves return to the coverage page, whose Back always says "Schedule" (`schedule/coverage/page.tsx:60`). Timecard actions stay on Timecards. Working through a queue of 4 means re-navigating 3 times. Carry `from=inbox&item=` through each flow, as time off already does.
   *Impact:* Medium–High. *Effort:* S. *Owner:* UI.

6. **Chain "Unable to work" to cover: offer "Approve and find cover".**
   *Why:* The callout card says "Approving takes the shift off their schedule. It will still need someone to cover it" (`manager-shift-requests.tsx:133`), then leaves the manager to find the new gap on their own. About 10 taps across 6 screens become 4. After approval, go straight to the coverage assistant for that shift.
   *Impact:* Medium. *Effort:* S–M. *Owner:* UI + Backend (return the released shift's repair locator).

7. **Make the weekly timecard close one pass: "Approve all ready (n)" with a single confirm.**
   *Why:* Bulk approval asks for confirmation twice (the "Review selected timecards" step plus the "I reviewed this exact selected set" checkbox, `timecards.tsx:320-326`), and Finalize is a second full pass. That is about 11 taps on desktop. Inside a single card's sheet the button reads "Finalize period" (`:402`), which sounds like it closes everyone. The Product question: for small teams, can Approve and Finalize be one step behind a workspace setting?
   *Impact:* Medium. *Effort:* M. *Owner:* Product → UI.

8. **Next week in one flow: on an empty week, offer Copy last week, Use template and Build automatically; add "Publish all locations"; add "Remind n people" for availability.**
   *Why:* Publishing is one button per location (`schedule-publication-controls.tsx:14-37`). Copy previous week and the availability deadline sit inside the More menu (`schedule/page.tsx:340-350`), although the spec moved the deadline to Scheduling rules (`spec.md:98`). Availability reads "0 of 8" (AUDIT-M-schedule-1440), and no reminder action exists anywhere. The Inbox can see "Availability not sent 8", but the manager can't act on it.
   *Impact:* Medium. *Effort:* M. *Owner:* UI + Backend (reminder send and multi-location publish).

9. **Show late arrivals.**
   *Why:* `late` is computed (`lib/today/project.ts:30`, `counts.late`), but the only UI that shows it is the preview-only `ManagerTodayTiles` (`manager-today.tsx:52`, used only in `ui-preview`). A late person drops out of "Not clocked in" the moment they punch, and Working now never marks them late. Add "12m late" to the Working now row and the desktop timeline.
   *Impact:* Medium. *Effort:* S. *Owner:* UI.

10. **Make Home's people rows actionable, and cut the extra expand tap in the Inbox.**
    *Why:* Working now and Later today rows have no link (`premium-home.tsx:225-245`). "Show 2 more" opens the whole week's schedule rather than today. On phones, two gaps at one location hide behind a disclosure, which costs an extra tap (AUDIT-M-inbox-390). Rows should open the person or their shift for today, and on phones each gap should be its own row.
    *Impact:* Low. *Effort:* S. *Owner:* UI.

## What's good
- The morning check takes no taps: Needs you, then Working now, then Later today, with honest freshness stamps and "Updated" lines (AUDIT-M-home-390/1440).
- The time-off focused review is a model for the rest: it returns to the same Inbox filter and selected item with a one-time toast (`manager-time-off.tsx:37-45`, `requests/actions.ts:76-90`).
- The coverage assistant ranks candidates against availability, rules and hour fairness, and re-checks on save. Schedule's phone **Find Cover** pill is the shortest cover path in the product.

## Not checked / limits
- No browser use (per my brief). Tap counts come from code paths and screenshots, not timed runs. I didn't check sheet open/close behaviour, scroll-to-anchor, or whether `#schedule-deadline` opens the More menu.
- The screenshots were taken at 1:11 AM, so the "Not clocked in" Inbox rows and the request facts in the pane are never shown populated. I read those states from code only.
- I didn't verify whether the preview backend fills in the time-off `request` facts, the swap approval `notice` reasons, or the copy-week conflict output.
- Out of my lens and not reviewed: the notifications bell as a second attention surface, Lead role flows, payroll and export after the timecard close, and Spanish copy length in the sheets.
