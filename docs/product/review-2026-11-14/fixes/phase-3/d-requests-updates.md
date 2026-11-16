# Phase 3, package D: Time off requests, Shift requests, Availability, Notifications, Updates (Owner and Manager)

Builder D took over a stopped builder's partial work. The partial work was read against `ed7f8b4c`, kept where right, and fixed or finished where not. Base `ed7f8b4c`. Patch: `d.patch` (14 files, `src` only). Nothing pushed, no branch, main checkout untouched.

Release sequence (Jose's policy, Nov 12): this is UI work on fictional local data. It goes to development first, is verified there with the backend, and reaches main or production only after Jose approves. Nothing here activates a paid service, a live charge, real email or SMS.

## Findings

| Id | Status | What was done or found | Evidence | Remains |
| --- | --- | --- | --- | --- |
| OW-002 (Notifications) | partly | Rows that follow each other with the same kind and no dates of their own fold into the newest row: "Things to do are waiting for you" over "5 notifications · latest 8 min ago". The row is unread while any folded one is; opening it marks each unread one read through the existing read call, one at a time. Rows with dates (the server `subject`) keep their own line and are never folded. Owner and Manager only; Employees keep one row each. | `src/lib/notification-inbox-view.ts:31`, `src/components/notification-inbox.tsx:72-100`, tests in `src/lib/notification-inbox-view.test.ts`; `d-shots/owner-notifications-900.png`, `d-shots/owner-notifications-390.png`, `d-shots/manager-notifications-1440.png` | Titles still cannot say the count by kind, the person or the outcome. See For Codex 1. |
| OW-003 (these screens) | fixed | Shift requests no longer add the year unless it differs from the workplace's current year, in the row and in the opened list. Time ranges on Time off and Shift requests now come from the shared `formatTimeRange` ("9:00 AM – 5:00 PM", "midnight" for 24:00). Date ranges on these rows keep the weekday form ("Mon, Nov 30 – Wed, Dec 2") because Things to do shows the same request that way. | `src/components/manager-shift-requests.tsx:47-72`, `src/components/manager-time-off.tsx:48,59`; test "a shift in another year carries its year" | None on these screens. |
| OW-011 | fixed | Phones and tablets (under 1024px): the age leaves the row's right side; a request over 24 hours old shows its age as a small grey line under the dates. Each part of the "when" line stays whole and no line starts with the separator dot. A can't-work row reads "Can't work · Tue, Nov 17 · 8:00 AM – 4:00 PM"; the reason shows when the row opens. | `src/components/time-off-waiting-list.tsx:21,44`, `src/components/manager-shift-requests.tsx`, `owner-b-requests.css:8-13,46-49,93-96`; `d-shots/owner-requests-390.png`, `d-shots/owner-exchange-open-390.png` | At 320px a long swap line still takes three lines (names are long; nothing breaks inside a range). |
| OW-013 | fixed | From 768px a request is one 64px row: avatar, name and line, age (1024px and wider), chevron, then Decline (quiet) and Approve (tinted) inline, 104px each. Only a note adds a line. What opens under a shift request uses the full card width. | `owner-b-requests.css:60-76`; `d-shots/owner-requests-1440.png`, `d-shots/owner-exchange-open-1440.png`, `d-shots/manager-exchange-open-900.png` | On tablets the age is dropped to keep the line whole (decision 3). |
| OW-029 | fixed | Collapsed line is the ask and the shift only. Opened: one quiet rounded block, a two-column list (grey 13.5px label, 14.5/20 value), each shift on one line "Tue, Nov 17 · 12:00 PM – 8:00 PM · Calle Loíza · Barista". Phones stack label over value. The decider still sees every shift in full: both people by full name, weekday and date, start and end, an overnight end with its day, the place, position and Shift lead, then Reason and Note. | `src/components/manager-shift-requests.tsx:69-104`, `owner-b-requests.css:14-20,74-76`; 5 tests in "management sees every shift in full" | None. |
| OW-038 | fixed | "Published shifts" content now starts at the card's inset (was 6px left of its title on desktop, 2px on phones). The action group already ended on the card edge after Phase 2 (right edge 1108 = card 1108), so it was left on the canvas, aligned. | `owner-b-requests.css:51,77-78`; capture dump: title x=319, content x=319 at 1440; 131 and 131 at 900; `d-shots/owner-request-detail-1440.png` | None. |
| OW-020 | fixed | While an update loads the band says "Update" and the canvas holds two placeholder cards with grey bars. "Loading update…. Getting the latest version and your review status." is read by screen readers only. | `src/components/communication-detail.tsx:73-79`, `owner-b-requests.css:32-37`; `d-shots/owner-update-loading-390.png` | The kit's own placeholder component could not be mounted inside this older page, so the cards are kit cards with bars drawn in this sheet at the kit's sizes. |
| OW-021 | fixed | Edit sits on the title's line at the column's right edge (centre 191 = title centre 191; it was at 159). The message card has 24px above and below. Withdraw is a card row with a red circle and red words; its confirm step is a card in the same place. | `src/components/communication-detail.tsx:152-157`, `owner-b-requests.css:38-44,82-84`; `d-shots/owner-update-detail-1440.png` | None. |
| OW-034 (Updates) | fixed | "Needs reply" is the kit's amber chip (22px, 12px, 600). Manager list only. | `src/components/employee-updates.tsx:95`; capture: chip 86 by 22 | None. |
| MG-016 | partly | The people are one kit card titled "Not sent 1" (or "Sent 9"). The Deadline row gains "People are reminded the day before." only when the workplace's alerts are on, because that is when it is true. The "Remind" pill was not built. | `src/components/availability-team-list.tsx:60`, `src/components/manager-availability.tsx:51,63`, `owner-b-requests.css:22-25,50-52,79-80`; `d-shots/owner-availability-390.png` | Remind button: see For Codex 2. The sub-line was not seen in a capture (alerts are off in the capture app). |
| Phase 2 leftover: New update field width | already fixed | The Title and Message fields measure 560px at 1440 and at 900 in this base. No change needed. | Capture dump `compose-1440`, `compose-900`: both fields w=560 | None. |
| Nov 14 UI-17 (part): New update while its form loads | fixed | Owners and Managers get the kit's one state card (loading, failed, offline, paused, session ended) in place of an older grey tile with a disabled "Try again". | `src/components/communication-compose.tsx:189-196`, `owner-b-requests.css:27-29`; captures `compose-loading` at 1440, 900, 768, 390 (in `$S/p3d-work/c3`, `o5`) | The loaded form is still older markup under the override layer (not rebuilt). |
| Nov 14 BR-6 | partly | Same as OW-002. | | Same as OW-002. |
| Nov 14 RA-16 (notification times) | needs Codex | The relative time on a notification row uses the device's zone. The list read does not carry the workplace zone. | `src/components/notification-inbox.tsx:100` | For Codex 3. |
| Nov 14 AR-9 | already fixed | Things to do has an Availability row ("Who can work, and when") beside Time off requests. | `$S/p2after/owner/owner-inbox-1440.png` | Schedule and Build and publish entries are other packages. |
| Nov 14 BR-5 | needs Jose | New update keeps Cancel and Next in the band; other forms save at the card bottom. One placement is a decision. | | For Jose 5. |

## Takeover notes (what was wrong in the partial work)

- Shift requests labelled each shift with a first name only. Changed to full names so the Codex rule holds without reading the row above.
- `year` was read before it was declared when the Done tab built its lines. It would have thrown on the Done tab. Moved above its first use.
- Notifications folded only rows with the same link. Every row's link is its own, so nothing folded. Now folds by kind.
- The time-off buttons sat on top of the row (a rule of the partial sheet put them across both columns) and hid the age. The row layout was rebuilt.
- The availability card, the loading placeholder and the Withdraw card had markup but no styles. The availability card now uses the kit's `BCard` instead of a new heading class.
- The three failing tests were failing on changed markup. The information is all still shown. Assertions now read the words of the opened list and are stricter than before (each shift's whole line is asserted in one piece).

## What changed, by screen

- **Time off requests** (`/app/requests`): row layout (above). No handler, form field or action changed.
- **Time-off request** (`?requestId=`): one inset in the Published shifts card.
- **Shift requests** (`/app/exchange`, Waiting, Open cover, Done): collapsed line, opened list, row layout, year rule. Forms, revisions and button values are as they were.
- **Availability** (`/app/availability`): people in one titled card; Deadline sub-line when alerts are on.
- **Notifications** (`/app/notifications`): folding for Owner and Manager.
- **Updates** (`/app/updates`): amber chip.
- **Update** (`/app/updates/{id}`): loading placeholder, Edit position, card padding, Withdraw card and confirm card.
- **New update** (`/app/updates/compose`): the state card before the form arrives.
- Stylesheet: all new rules are in `src/app/app/owner-b-requests.css`, inside `@layer nv-b`, Owner and Manager only (`:not([data-employee-mobile])`). No shared sheet was edited. Media queries are the phone, wide and tablet aliases.

## Wording changed (old to new)

- Shift request line: "Swap Sat, 8:00 AM with Marco Silva" to "Swap with Marco Silva · Sat, Nov 21 · 12:00 PM – 8:00 PM". Same pattern: "Give … to X" to "Give to X · …", "Offered Sat, 8:00 AM" to "Offered · …", "Swap Sat, 8:00 AM" to "Swap · …".
- Can't-work line: "Can't work Tue, 8:00 AM · Transportation issue · note" to "Can't work · Tue, Nov 17 · 8:00 AM – 4:00 PM" (Waiting and Done). Reason and note show when opened. The row's screen-reader label still says the reason.
- Opened shift: four lines with "Mon, Oct 5, 2026" to one line "Mon, Oct 5 · 8:00 AM – 12:00 PM · North Office" (year only when it differs).
- Coverage: "Picked up by Fictional Ben" (one bold line) to label "Picked up by", value "Fictional Ben". "No one has picked it up yet" to label "Picked up by", value "No one yet".
- Notifications, folded row only: "Open shifts, requests or missing availability · 4 min ago" to "5 notifications · latest 4 min ago".
- Availability: new card title "Not sent" or "Sent" with its count. New Deadline sub-line "People are reminded the day before." (the finding's words; only when alerts are on).
- Update while loading: band title "Loading update…" to "Update"; the sentence stays for screen readers.
- New update while loading: the disabled "Try again" is gone while it loads. Other words unchanged.
- No payroll or legal wording touched.

## Checks run

- `NODE_OPTIONS=--max-old-space-size=6144 npx tsc --noEmit -p .`: no errors in `src` (run after the last source change to a `.ts` or `.tsx` file).
- `npx eslint` on the 13 changed `.ts` and `.tsx` files: clean.
- `npx vitest run --dir src src/app src/components src/lib`: 12274 passed, 741 skipped, 1 failed. The failure was a 5 second timeout in `src/lib/tenancy/migrations/typed-guarded-backfill.server.test.ts` while the machine load was over 40. That file alone, rerun: 68 passed. This full run was before the last two stylesheet-only changes (phone card margins, button label centring). After them `src/app/app/b-viewport.test.ts` and `b-foundation.test.ts` were rerun: 59 passed. The full suite was not rerun after those two CSS changes.
- `src/components/manager-workflows.test.tsx`: 19 passed (the 3 that failed now pass; 1 new test for the year rule).
- Browser captures (real app, real sign-in, fictional data), all steps `overflow` 0, no `pageerror`:
  - Owner at 1440, 900, 390: requests, request detail, shift requests (plain, two rows opened, Open cover opened, Done), availability (both tabs), notifications, updates, update (loaded, Read by open, Withdraw confirm, loading), New update (loaded, loading). 42 steps.
  - Owner at 1100 and 900 (selected steps, 26), at 768 and 390 (18 steps), the six routes at 390, 320, 768 through the standard scan (small targets 0), and a last run of requests, shift requests and notifications at 1440, 390, 320 after the final CSS change (15 steps).
  - Manager (`OWN-ELENA`) at 1440, 900, 390: the same 42 steps.
  - Employee at 390: `/app/updates`, `/app/notifications`, looked at by eye. They draw from the Employee's own components and look as before. No pixel comparison (no Employee baseline was available).
- Console strings: one `403` per run, the capture tool's own extra request (also in the Phase 2 baseline). A `503` appeared in some runs: the page's notifications read failed and the page showed its "Notifications didn't load" card. See Not verified.
- Not run: keyboard walk-through, reduced-motion comparison (captures run with reduced motion on), screen reader, 200% text.

## For Codex

1. **Notification titles (OW-002, BR-6).** `GET /api/notifications` items carry `label`, `at`, `href`, states and, on an employee's own rows, `subject` dates. For a manager summary row ("Operations need review") the read would need: counts by kind (open shifts, time-off requests, shift requests, can't-work reports, availability not sent), or for a single event the kind, the person's name and the outcome. The UI would read them in `notificationTitle` (`src/lib/notification-inbox-view.ts`). With them the title can say "3 time-off requests are waiting".
2. **Remind on Availability (MG-016).** `POST /api/manager/reminders` exists and is authorized, but nothing in the UI calls it and its README says UI wiring and production activation are separate gates. It needs the `authority` from the communication context (not on this page), an operation id with lookup on `outcome_unknown`, and `expectedDeadline`; a week with no deadline cannot be reminded. Needed before the button: a go-ahead for the wiring gate, the authority made available to `/app/availability` (or a server action that wraps the command), and which people are eligible today (the daily budget and quiet hours make "already reminded" and "not eligible" states the row should show). The card layout leaves the row's right side free for the pill.
3. **Workplace zone on notification rows (RA-16).** The notifications read does not include the workplace time zone, so "Yesterday" and weekday names follow the device. `relativeTimeText` already takes a zone.
4. **Age on time-off rows.** The page reads `createdAt` from the pending time-off rows through a cast (`(request as { createdAt?: string }).createdAt`). It is present today. Typing it in the read would make the age safe.

## For Jose to decide

1. Folded notifications: opening the folded row marks all of its unread notifications read (they all lead to Things to do). Say if each should stay unread until opened one by one.
2. Deadline sub-line shows only where alerts are on. If you want a line in every workplace, it needs different words that are always true.
3. Tablets drop the request's age (unless over a day old) so the dates keep one line beside the buttons. Desktop shows it.
4. Opened shift requests label each shift with the full name ("Carlos Vega's shift") instead of the finding's short "Shift", to keep the rule that a decider sees whose shift it is.
5. BR-5: where form buttons live (band or card bottom) for New update.
6. Withdraw's confirm button is still the filled red one inside the new card. It is the only filled button on that step.

## Needed from another package

None.

## Not verified

- Notifications under load: the page's notifications read failed with 503 in most first loads while six builders loaded the machine, and the page showed its own "Notifications didn't load" card. The server code is not touched by this patch and the Phase 2 baseline loaded the same page. After "Try again" the list loaded and folded at 1440, 390 and 320 (last capture, `d-shots/owner-notifications-390.png`). Worth one look by Codex if it also happens on a quiet machine.
- The age line under the dates for a request over 24 hours old, in a browser. Every fixture request was minutes old. The unit test asserts the line is in the row's markup (`manager-workflows.test.tsx`, "11 d ago").
- The Deadline sub-line with alerts on (not reachable in the capture app).
- A request row with a note line (the schedule overlap, "Needs Owner rule review") in a browser. The fixtures had none. The rule is in the sheet (`owner-b-requests.css`, the `.q-acts-note` rule in the 768px block) and unit markup shows the note inside the form.
- The time-off row's inline "Keep / Decline" confirm in a browser at desktop width.
- Pressed, hover and focus states of the new rows by eye.
