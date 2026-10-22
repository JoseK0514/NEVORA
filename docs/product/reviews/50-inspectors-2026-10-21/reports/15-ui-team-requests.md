# 15 UI Designer: Team, person, Availability, Time off, review, Shift requests

**Verdict.** These six pages look like v3 at a glance: hairline cards, the teal tint, amber "Waiting" glyph-and-word statuses, and a real table on desktop Team. Underneath, each page shows a person differently. Avatars appear on some pages and not others, the same person gets two different monograms, and key/value facts use two different layouts. The decision moment (Approve and Decline) has three implementations, and on desktop it stretches into 530px-wide buttons with no inline sense of what approving will change. The person page reads as a raw edit form rather than a profile.

## Recommendations

1. **Give decisions their consequence inline, and give Decline weight and a way back.**
   - *What:* Time-off cards and the review should say what approving does, for example "Has 2 shifts Oct 30–31 · 1 other person off that day". Shift requests already do this. Decline should open a small sheet with an optional reason for the employee and a confirm button. After Approve, show a toast that names the person ("Approved Alexandra's time off") with a 5s Undo, in place of the generic "Decision saved / The employee can see it". If Approve isn't allowed, show it disabled with the reason instead of leaving Decline alone in a two-column grid.
   - *Why:*
     - The time-off card shows only Dates, Length and Note (`manager-time-off.tsx:145-149`). The manager has to leave the page through "See that week's schedule" (`:75`) to judge coverage.
     - Shift requests do carry a consequence line (`manager-shift-requests.tsx:115,133`).
     - Decline is one tap with no reason field: `reviewTimeOffAction` only sends `decision` (`requests/actions.ts:60-75`).
     - Approve is dropped when it isn't allowed, so Decline sits alone (`manager-shift-requests.tsx:120,138`).
   - *Impact:* High. *Effort:* M. *Owner:* UI for the sheet, toast and disabled state. Backend (Codex) for the conflict/coverage summary, the decline reason and undo.

2. **Build one person identity component and use it everywhere.**
   - *What:* One `PersonIdentity` (avatar, name, role · location) built on `employeeInitials`, used on Team, the person header, Availability, time-off cards, the review and shift-request cards.
   - *Why:* The same person gets "MF" on Team and "MJ" on Availability.
     - `availability-team-list.tsx:34` takes the first two words of the name; `employee-display.ts:3` takes first name + last name.
     - Compare QAOWNER-team-1440 with QAOWNER-availability-1440 ("María José Fictional QA").
     - Avatars are missing on time-off cards, the review and the person page (QAOWNER-timeoff/review/person-*).
   - *Impact:* High (trust: the same person looks different). *Effort:* S–M. *Owner:* UI.

3. **Make the person page a profile first and a form second.**
   - *What:*
     - Header: 64px avatar, name, then role and a real `Status` (Active green, Inactive grey).
     - Teal Call, Text and Email quick actions (`tel:`, `sms:`, `mailto:`).
     - Details as read-only inset grouped rows, with Edit in the nav bar (phone) or a top-right button (desktop).
     - Move deactivation out of the Status `<select>` into its own destructive row at the bottom, with a confirmation sheet.
   - *Why:*
     - The page opens straight into eight editable fields and a full-width Save (QAOWNER-person-390 is 1575px tall).
     - Active/Inactive appears only as eyebrow text (`employees/[employeeId]/page.tsx:62`).
     - Deactivating someone, which "signs this employee out immediately", is just a dropdown value plus Save.
     - On the phone the meta line packs location · phone · email and runs to the card edge (x≈373 of 390).
   - *Impact:* High. *Effort:* M. *Owner:* UI. Product (Jose) to confirm that read-first with Edit is acceptable.

4. **Right-size desktop decision cards and buttons.**
   - *What:*
     - Cap a single request card at the review page's width (about 720px), or use a two-column grid with a max width.
     - On desktop, right-align Decline and Approve in the card footer at their natural width (about 120–160px), with the primary button on the right.
     - Merge `TimeOffReviewActions`, `TimeOffReviewDecision` and the shift-request `PendingButton` pair into one `DecisionBar`.
   - *Why:*
     - `premium-clean-manager.css:600` forces a lone card to full width, so QAOWNER-timeoff-1440 has a 1100px card with two 530px buttons, and the values sit 1080px from their labels.
     - The review page uses 354px buttons, so the same decision has three sizes across two pages.
     - The two time-off components are near-duplicates (`time-off-review-actions.tsx`, `time-off-review-decision.tsx`).
   - *Impact:* Medium. *Effort:* S. *Owner:* UI.

5. **Use one key/value pattern for request facts.**
   - *What:* Show Dates, Length and Note the same way on the list card and the review, using `Facts`/`Fact` (grey label, ink value).
   - *Why:* The list uses `Fact` (grey 15px label, `manager-time-off.tsx:146`). The review uses `Row title=` (semibold dark label, `:66-67`). Same data, two hierarchies (QAOWNER-timeoff-1440 vs QAOWNER-review-1440). The Note also moves from an inline fact to its own card.
   - *Impact:* Medium. *Effort:* S. *Owner:* UI.

6. **Compact the Team filters into a toolbar.**
   - *What:*
     - Desktop: search, Role, Location and the All/Active/Inactive control in one 40px row inside the table box, right above the column header. Drop the "Find people" card title.
     - Phone: an iOS search field under the large title and a "Filter" button that opens a sheet for Role and Location. Keep the segmented control.
     - Add a Status column on desktop so Inactive people are visible in the table.
   - *Why:*
     - Desktop spends about 200px of filter card with 48px controls before the first person (QAOWNER-team-1440, table starts at y≈428).
     - On the phone the first name appears at y≈513.
     - Inactive status is only a second line inside the name cell (`employee-directory.tsx:86`).
   - *Impact:* Medium. *Effort:* M. *Owner:* UI.

7. **Show desktop Availability as a week grid, and fix the clipped phone chips.**
   - *What:*
     - Desktop: rows are people (clickable through to the person), columns are Mon–Sun with time ranges or "—", plus a Status column. This matches the Team table pattern.
     - Phone: use at most 3 short segments, or a menu, so nothing scrolls inside a segmented control.
     - Give "Not submitted" rows a Remind action.
   - *Why:*
     - On desktop, Status sits about 950px from the name (QAOWNER-availability-1440), and submitted hours stack as a vertical list per person (`availability-team-list.tsx:73-75`).
     - The phone chips clip "Submitted 0" and hide "Unavailable all week" entirely (QAOWNER-availability-390).
     - Rows are not links and offer no action.
   - *Impact:* Medium. *Effort:* M (Remind is Backend). *Owner:* UI, plus Backend for Remind.

8. **One count per idea, and the same filter row on every request page.**
   - *What:* On Availability, drop the card meta "8 people". Add counts to Pending on Time off and Shift requests, as Team and Availability already have.
   - *Why:* QAOWNER-availability-1440 shows "8" four times: "0 of 8 submitted", "8 people", "Everyone 8", "Not submitted 8". That breaks clean contract rule 2 (`spec.md`). The Time off and Shift requests tabs carry no counts (QAOWNER-timeoff/exchange-*), so the filter rows don't follow "same thing, same pattern".
   - *Impact:* Medium. *Effort:* S. *Owner:* UI.

9. **Fix wayfinding on detail pages.**
   - *What:* On desktop, put the back link at the left as a breadcrumb in the top bar ("Inbox › Alexandra Rivera"), not floating at the far right. Use the same eyebrow case on both breakpoints, and drop the eyebrow on phone large-title pages.
   - *Why:*
     - On QAOWNER-review-1440 the top bar says "Time off", the back link says "Inbox", and the sidebar highlights Inbox: three different answers to "where am I".
     - The back link sits at x≈1350 while the content ends at 984.
     - The phone eyebrow is uppercase ("EMPLOYEE · ACTIVE", "TIME-OFF REQUEST", `premium-clean-manager.css:149`), but desktop is sentence case (`:359`). iOS large titles don't carry an uppercase kicker.
   - *Impact:* Medium. *Effort:* S. *Owner:* UI.

10. **Use one status map and one hex value per tone.**
    - *What:* Define a single status map in the kit (Waiting, Approved, Declined, Withdrawn, Not submitted, Not picked up, each with a fixed tone), and one colour value per tone at every width.
    - *Why:*
      - On the employee Shift requests page, `statusTone` makes every non-approved state neutral (`exchange/page.tsx:78-81`), so "Awaiting employee" and "Manual review" are grey instead of amber.
      - Tone colours drift by breakpoint: amber is #A05A00 on phone and #93500A on desktop, red is #D70015 and #B42318 (`premium-clean-manager.css:13` vs `:392`). All of these pass AA (5.3–6.6:1 on white) but aren't the same colour.
      - Decided time-off rows carry no status word at all (r3-req declined-390).
    - *Impact:* Low–Medium. *Effort:* S. *Owner:* UI.

## What's good
- Statuses are a glyph plus a word, amber only for waiting, and all tone colours pass AA on white and on grouped grey (measured 4.7–6.6:1).
- Shift-request cards state what Approve will do, and pending buttons say "Approving…" or "Declining…" and disable both choices.
- Desktop Team is a calm, real table (column header, hairlines, chevrons). It's the best model for the other people lists.

## Not checked / limits
- No browser use (brief). Hover, focus, pressed and loading states, reduced motion and large text were not observed live.
- No populated manager Shift-requests pending card, inactive employee, submitted-availability row or person Scheduling tab was in the current shots. Those findings come from code and r3-req evidence.
- Manager (AUDIT-M) and Employee views of these pages were not compared screen by screen. Dark mode was not checked.
