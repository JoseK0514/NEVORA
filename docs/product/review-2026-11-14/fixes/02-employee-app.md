## WP2 report: Employee and Lead app

**Patch:** `/private/tmp/claude-501/-Users-josek0514--claude-spares-spare-23XJTe/d762c6df-53eb-43b4-836f-475a53cde009/scratchpad/patches/wp2.patch`
`git diff HEAD --stat`: 24 files changed, 219 insertions(+), 61 deletions(-). One new file: `src/components/employee-b/schedule-b.test.tsx`. Nothing committed. No browser run and no project-wide `tsc`, per COMMON.md.

Files touched: `src/app/app/{my-pay,my-time,profile}/page.tsx`; `src/components/employee-b/{account-b-client,home-b,messages-b,pay-b,schedule-b}.tsx`, `{account,pay,schedule}.css`; `src/components/employee-mobile/{notifications-list,pay-corp,pay,profile-view,profile}.tsx`; tests beside them; and one out-of-scope test edit, `src/test/integration/employee-mobile-pay.integration.ts` (two expectations for strings I changed).

### Findings

| ID | Status | What changed |
|---|---|---|
| PY-7 | Done | "Scheduled payday" on Employee Home and on all three Pay views; one quiet line on Pay saying who pays; lists renamed to "statements"; empty state reworded. |
| PY-11 (employee) | Done | The "ask your manager" line shows under a corrected or replaced statement on all three Pay views, and not on an ordinary statement. |
| BR-13 | Partly | Profile shows "Employee ID" with "You sign in with this ID." on both layouts. The value is `proof.employee.id` from the session the page already reads (login matches on `employees.id`). It shows "–" while the view is paused, like the other rows. Email and phone are not in the session or the profile snapshot, so they are under "For Codex". |
| BR-6 / EM-005 | Partly | New `notificationTitle()` builds each row title from the kind, `subject` dates and `actionState`, used by both Employee notification lists and their accessible names. Outcomes (approved or declined) are not in the list payload, so those titles say "was answered". |
| EM-004 | Done | The open-shifts button is the tinted `ghost` pill labelled "See open shifts"; Confirm stays the one filled teal pill. On phones the pill sits under the row's words so the title keeps one line. |
| BR-11 | Done, by hit area | Previous/Next week: centred hit area of at least 44×44; Today: 44px tall. Pay "See your hours": 44px. Help answer links ("Forgot password?", support email): 44px. Drawn sizes are unchanged. Profile "English"/"Español" already had a 46px hit area, so no change there. |
| AR-15 (my part) | Done | `my-time` and `my-pay` use `generateMetadata`: Employees and Leads get "Time · NEVORA" and "Pay · NEVORA"; Owners and Managers keep "My time" and "My pay". It reads the existing cached session; no new server read. |
| EM-003 | Done | Last statement card shows a green "Statement ready" chip (or the existing "Corrected" chip) and a full-width teal "View statement" button (`BButtonLink`, since it navigates). |

### User-facing strings (English only; these surfaces are not bilingual, so no Spanish twins)

| Old | New | Where |
|---|---|---|
| Next payday (label and aria) | Scheduled payday | `employee-b/home-b.tsx:80-81` |
| Next payday · {Today / Tomorrow / In N days} | Scheduled payday · {…} | `employee-b/pay-b.tsx:136` |
| Payday is today / Payday is tomorrow / Payday in N days | Scheduled payday is today / Scheduled payday is tomorrow / Scheduled payday is in N days | `employee-mobile/pay-corp.tsx:164` |
| (new) | Your employer pays you. NEVORA shows your pay statement. | constant at `employee-mobile/pay.tsx:31`; shown in `pay-b.tsx`, `pay-corp.tsx`, `pay.tsx` |
| (new) | If the amount differs from what you received, ask your manager. | constant at `employee-mobile/pay.tsx:33`; shown on the statement page in all three views |
| Recent pay | Recent pay statements | `pay-b.tsx:73-74`; `pay-corp.tsx:97,103,167,168` |
| See all pay (aria) | See all statements | `pay-b.tsx:153`; `pay-corp.tsx:167` |
| Earlier pay (aria) | Earlier statements | `pay-b.tsx:154` |
| Your statements appear here after your workplace publishes payroll. | Your statements appear here after your employer shares them. | `pay-b.tsx:74`; `pay-corp.tsx:103`; `pay.tsx:132` |
| …A statement appears here after payroll is published. | …A statement appears here after your employer shares it. | `pay.tsx:123` |
| (new chip) | Statement ready | `pay-b.tsx:149` |
| See (aria "See N open shifts") | See open shifts (aria "See open shifts, N to pick up") | `employee-b/schedule-b.tsx:117` |
| (new row) | Employee ID / You sign in with this ID. | `employee-b/account-b-client.tsx:61`; `employee-mobile/profile-view.tsx:26` |
| Browser tab "My time" / "My pay" (Employee, Lead) | "Time" / "Pay" | `my-time/page.tsx:23`; `my-pay/page.tsx:16` |

Notification titles, all in `employee-mobile/notifications-list.tsx:33-38`. "{dates}" is " for Nov 26", " for Nov 26 – 28" or " for Nov 28 – Dec 2" when the server sends a subject, otherwise nothing.

| Old label | New title |
|---|---|
| Schedule update | "Confirm your schedule{dates}" when action is needed; otherwise "Your schedule{dates} was updated" |
| Time-off update | "Your time-off request{dates} was answered" |
| Can’t-work update | "Your can’t-work request{dates} was answered" |
| Shift request update | "You can respond to a shift request{dates}" / "A shift request{dates} is closed" / "A shift request{dates} was updated" |
| Availability update | "Reminder to submit your availability" / "Your availability was submitted" / "Reminder about your availability" |
| Team update | "A team update needs your acknowledgement" / "A team update was shared with you" |
| Pay statement update | "A pay statement was shared with you" |
| Device notification test, or any unknown label | unchanged |

Wording choices for Jose to confirm:
- "Scheduled payday **is** in N days" (the old line had no "is").
- "was answered" for approved-or-declined.
- "was updated" for a schedule notice, which covers both a first publish and a change.
- "A team update was shared with you" rather than "from your manager", because Leads can write updates too.

### Tests
- `npx eslint` on all 21 changed `.ts`/`.tsx` files: clean.
- `npx vitest run src/components/employee-b/ src/components/employee-mobile/ src/app/app/b-viewport.test.ts src/app/app/my-time/page.test.tsx src/app/app/my-pay/next-pay.test.ts src/app/workspace-presentation.test.tsx src/components/employee-schedule-corp.test.tsx src/components/employee-home-corp-view.test.tsx`: 34 files, 238 tests passed.
- An earlier wider run that also included `employee-home-corp.test.ts`, `phase-e-browser-runtime.test.ts` and `phase-e-runner.test.ts` passed: 36 files, 481 tests.
- Expectations updated in `pay-corp.test.tsx`, `pay.test.tsx`, `notifications-list.test.tsx`, `account-b.test.tsx`. New assertions added in `profile.test.tsx`, `profile-preferences.test.tsx` and the new `schedule-b.test.tsx`.
- `employee-mobile-pay.integration.ts` was edited but not run (it needs a browser and database).

### For Codex
1. **BR-13:** email and phone are not in `SessionEmployee` or the profile snapshot (`EmployeeProfile.profile` has name, role, workspace, timeZone, locations). Add them to the profile read if Profile should show them read-only.
2. **BR-6 / EM-005:** the list item (`EmployeeNotificationItem`) carries only `label`, `subject` dates, `reviewState` and `actionState`. To make titles specific the client needs:
   - the event type or outcome: `TIME_OFF_APPROVED`/`DENIED`, `CALLOUT_*`, `SWAP`/`COVERAGE` with `APPROVED`/`DENIED`/`CANCELLED`/`EXPIRED`, `SWAP_RESPONSE_REQUIRED` versus `COVERAGE_INVITATION`;
   - for schedules, `SCHEDULE_PUBLISHED` versus `SCHEDULE_CHANGED` versus the acknowledgement reminder;
   - for team updates, the update's title and author;
   - for pay statements, the payday or period, and whether it is a correction;
   - for availability, the week.
   
   The server already builds these titles for push in `src/lib/assistance/notification-events.ts`.

### Left alone, outside my scope
- Owner/Manager "My pay" still says "Next payday is …" (`src/components/payroll/my-pay.tsx:68`).
- The sign-in preview still says "Next payday" (`src/lib/auth-copy.ts:20`).
- Owner/Manager Help link sizes (`src/app/app/help/help.css`).
- The Lead and Employee sidebar label lives in `src/lib/navigation.ts`.
- `MessageInbox` in `employee-mobile/messages-view.tsx` still shows the category label; the notifications page does not render it.

### Check in the browser
- **Pay, 390 and desktop:** the full-width "View statement" pill and the "Statement ready" chip in the last statement card; the new note line above the PDF note. On desktop the stack is a two-column grid, and notes should span both columns.
- **Home, 320 and 390:** "Scheduled payday" is longer than "Next payday" in the glass figure, and the label does not wrap. By my arithmetic it fits at 320.
- **Schedule, 390:** the "See open shifts" pill sits under the row text, aligned to it. On desktop it stays on the row.
- **Schedule week strip:** the arrow hit areas now overlap by about 2px between the two arrows; Today sits beside them.
- **Notifications:** longer titles wrap to two lines on phones.
- **Help:** answer links are now `inline-block`, so a link that does not fit the rest of a line moves to the next line whole.
- **Profile:** the Employee ID row has a third grey line, so it is taller than the other rows. It should show "–" when offline or paused.
- A measuring tool that reads bounding boxes will still report 36px, 32px and 34px for the week arrows, "See your hours" and the language buttons. The 44px is in the `::after` hit area.
