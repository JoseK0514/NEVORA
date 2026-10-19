# Phase 3.5, Wave A: report

Branch `claude/p35-wave-a-1283c8` (worktree `.claude/worktrees/p35-wave-a-1283c8`), local commits only, never pushed. Status: **built; inspection in progress** (this file is completed at the exit rule).

## What changed

Every Wave A page is now a kit page: `.nv-page.wa-page[data-nv-page]`, a `PageBand` with a named Back, kit cards (radius 20, e1, no border, 16px apart, text 20px inside), kit type roles, Phosphor icons. Phone and desktop were built together (320–1440); one-task forms keep a 720px reading width on wide screens, lists of decision cards go two-up from about 1000px, and Add shift and Coverage use a side column from 1024px.

| Page | Route | Roles | What it is now |
|---|---|---|---|
| Add shift | `/app/schedule/new` | Owner, Manager | Band names the week. "Who and where" and "When" cards, a Summary card that updates as you type (side column on desktop, with Save under it), Save shift / Cancel. A missing location or employee is a notice and a disabled Save. |
| Review replacement | `/app/schedule/new?review=…` | Owner, Manager | Facts card (person, day, time and length, location, position, lead), what it fills, Save replacement / Back to coverage. Out-of-date review: one card with "Open current review". |
| Edit shift | `/app/schedule/edit?shiftId=…` | Owner, Manager | Band: the person, then day · time · location (breaks only between parts). Who, When (duration updates live), Notes, Save changes / Cancel. Delete is its own form behind a disclosure in its own card, with "Deleting…". |
| Coverage | `/app/schedule/coverage?…` | Owner, Manager | Shift to cover (facts), What it needs (repair targets, the selected one marked), Who can work it: numbered list with name, role · location, hours this week, a Details disclosure and "Review shift" (says "Opening…" while it loads). Empty, covered, changed and failed-read states are cards. |
| Copy-week receipt | `/app/schedule/copy-receipt?operation=…` | Owner, Manager | Copied / Not copied counts, why some weren't copied (in words), anything worth a look, the reference behind a disclosure. Not-confirmed and not-found states. |
| Time off (list) | `/app/requests?tab=pending|approved|declined` | Owner, Manager | Band with Pending / Approved / Declined pills. Pending: one card per request with dates, length, note, Decline / Approve (each says "Declining…"/"Approving…"), and a link to the single-request review. Approved and declined: one record card. The single-request review is unchanged. |
| Shift requests | `/app/exchange?tab=pending|coverage|activity` | Owner, Manager | One card per swap, pick-up or "Unable to work" report: the shifts (a swap shows both with the trade between), the reason, what approving does, Decline / Approve. Open coverage: Close request. Team activity: a record card with request history. |
| Team availability | `/app/availability` | Owner, Manager | Week arrows in the band, one "This week" card (Submitted, Not submitted, Unavailable all week; the deadline and Open schedule in the foot), then Team with filter chips and each person's hours. "Missing" is now "Not submitted". |
| Team member detail | `/app/employees/[id]` | Owner, Manager | Band: role · status, name, location · phone · email. Details / Scheduling switch. Details: the contact and access form, then Access (Clocker PIN, Account recovery) as rows. Scheduling: positions and locations as checkbox lists, then the Owner-reviewed rules behind a disclosure. |
| New employee | `/app/employees/new` | Owner, Manager | Person, Access, Scheduling cards, Add employee / Cancel ("Adding…"), What happens next. |
| Clocker PIN | `/app/employees/[id]/clocker-pin` | Owner, Manager | Back names the person. Create or Reset card (two PIN fields side by side from 400px), About the PIN. Owner-only, inactive and unavailable states are cards. |
| Swap a shift | `/app/exchange/swap?sourceShiftId=…` | Employee, Lead | Your shift (You give) with "How a swap works", Shifts you can take (one choice, selected state), Review your swap (You give / You receive side by side), Send swap request ("Sending…"). No targets: Offer for coverage or the reason it can't. |
| Unable to work | `/app/exchange/callout?shiftId=…` | Employee, Lead | Your shift, "It's still your shift", what happens next, then Reason and More details (300-character count), Send report ("Sending…"). Changed shift: the reason is kept and Refresh appears. |

**The form pattern** (shared with the other waves): labels above fields in the label role, help 8px under in the callout role, errors as an urgent notice with an icon and words, fields grouped in cards with the group title in the card head, the main action a primary `.nv-btn` (full width on phones, side by side from 600px), and while sending the pressed button says what it is doing, is disabled, and the page doesn't move (`PendingButton` watches the shared forms' `aria-busy`; the shared forms are unchanged). Field height stays with the shared rule (48px today; PARALLEL says 52px, asked of the coordinator).

**Old styles retired, not overridden.** These pages no longer load `shift-workspace.css`, `edit-shift.css`, `coverage-assistant.css`, `employee-profile.css`, `new-employee.css`, `swap.css`, `callout-view.module.css` or `clocker-pin.module.css` (the last is still used by the Clocker device gate, so it stays). The first seven are deleted, with `shift-workspace.tsx`, `coverage-assistant-motion.tsx`, `new-employee-frame.tsx` and `swap-motion.tsx`. All Wave A styles are in `src/app/app/premium-wave-a.css`.

**New parts** in `src/components/wave-a/`: `parts.tsx` (Notice, Field, FieldPair, FormActions, Facts/Fact), `pending-button.tsx`, `shift-block.tsx`.

**Lint fix:** `src/app/app/exchange/swap/page.tsx:51` no longer reassigns a variable inside an async callback; each read returns its result and the "changed mid-read" flag is derived after (`6b424c6`). Same behaviour; 18/18 swap tests pass.

## Set aside for Codex

See `CODEX.md`: the decided-by line on the manager's Approved/Declined list, need counts on Coverage, shift details on the copy receipt, the real outcome of every submission, the swap "choose" state and the PIN form (no local data or key to show them), and the legal wording.

## Checks run

To be completed at exit.

## Screens

`screens/signoff-*.png`: 390 and 1440 for each page, posted to Jose on October 19. **Jose approved all 13 as built on October 19** (relayed by the coordinator: "approved A, B, C"); no design changes requested.
