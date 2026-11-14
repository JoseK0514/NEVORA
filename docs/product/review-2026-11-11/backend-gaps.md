# NEVORA backend-contract gap analysis (UI at HEAD a496040f)

Read-only, from code (grep/read/git). Nothing was run: no app, no scan harness, no tests. Browser behaviour
(for example the Search hit area) is derived from CSS and is marked "not measured".
Paths are relative to /home/user/NEVORA. Sizes: S under 30 lines, M, L.

Status words: **Consumed** (UI uses it), **Auto** (flows through existing code with no UI change),
**Partly**, **Not consumed**.

## Summary table

| ID | Status | Gap | Size |
|---|---|---|---|
| NV-006/007 payrollStatus | Partly | Tablet/desktop Payday card shows it; the phone Home (HomeB) never receives it | S |
| NV-014 policy once | Not consumed | Server removed the policy sentence from rows; UI never renders `policy`, so the rule is now shown nowhere | S |
| NV-079 counterpartName | Not consumed | No component reads it; three row builders ignore it | S |
| NV-138 role in hourRows | Not consumed | UI types drop `role`; Owners still listed unmarked | S |
| NV-109 upcoming | Not consumed | Client still splits by date; differs from server (all types vs coverage gaps only) | S |
| NV-152 acknowledgedAt + comparison | Partly | "What changed" after confirming flows automatically; `acknowledgedAt` is not shown | S |
| NV-165 exchangeCounts | Not consumed | Parsed into both snapshots, never passed to the tab hero | S/M |
| NV-092 person hours | Not consumed | No caller; the person page has no hours card | M |
| NV-252 weeklyHoursLimit null | Consumed (by omission) | No over-limit chip exists; nothing to wire | none |
| NV-158 deviceAlerts | Partly | Phone uses the browser device read (correct); `deviceAlertsAvailable` unused; tablet/desktop empty state shows the link unconditionally | S |
| NV-091/240 late | Not consumed | Monitor `late` unused; the UI's own "Late" means something else | M |
| NV-137 readActiveOwnerNames | Not consumed | Two call sites still use `listEmployees()` | S |
| NV-142 subject | Not consumed | Parsed, never rendered | S/M |
| NV-261 reminders | Not consumed | No UI caller of POST or recovery; no Remind button anywhere | L |
| NV-052 identified PIN | Not consumed | No Employee ID field; scope, real wait and codes ignored; fixed "five minutes" copy | L |
| NV-045 clockerErrorText | Not consumed | Helper has zero callers; PIN and setup still read `data.error` | S |
| NV-185 otherCount | Partly | Kiosk now lists only own references; `otherCount` discarded | S |
| Kiosk speed | Not consumed | Still verify then status | S |
| NV-262 timecard rows | Auto / partly | Period fixed by server; the grouped inbox row discards the new location part | S |
| NV-121 decided= toast | Auto, with a duplicate | Toast shows; the inline "Decision saved." still shows too | S |
| NV-068 durations | Auto | `durationText` now delegates to the client formatter | none |
| NV-174 document helper | Consumed | Root layout uses it | none |
| NV-022 titles | Consumed | Six auth routes use it | none |
| NV-186 slogan | Consumed | Welcome copy uses `sloganEs` | none |
| NV-188 label | Consumed | One stale Spanish key left | S |
| NV-308 statement V3 | Consumed | UI validator accepts V3; no UI renders "Importe" | none |
| NV-016 shared count | Not done (optional) | Bell and sidebar count different things; needs a decision | S/M |
| SCRUM-176 Search | Probe is stale for this branch | 30px is the pre-Direction-B rule; HEAD sets 40px | S (probe) |

---

## Rows in detail

### NV-006 / NV-007: `payrollStatus` on Home, overdue payroll
- **Server:** `readHomePayrollStatus(proof)` in `src/app/app/my-pay/next-pay.ts:24`; type `HomePayrollStatus` in
  `src/lib/payroll/backlog-read.ts:13`:
  `{state:'ready'; overdue?: {payday; period:{startDate,endDate}}; reviewRequired?: same} | {state:'unavailable'}`.
  Read in `src/app/app/page.tsx:117` (Owner, overview, pay statements on, `NEVORA_PAYROLL_ENABLED==='true'`).
- **UI today:** forwarded `page.tsx:147` -> `manager-dashboard.tsx:247,251` -> `premium-home.tsx:157` ->
  `owner-home-corp.tsx:71` `PaydayCard`, which renders "Payroll to prepare", "Payroll schedule needs review" and
  "Payroll status isn't available right now" (`owner-home-corp.tsx:201-203`). That card is the tablet/desktop layout.
- **Gap:** the phone composition `HomeB` (`owner-home-corp.tsx:66-68`) is not given `payrollStatus`, and its
  `PaydayTile` returns null when `nextPay` is null (`owner-b/home-b.tsx:147-148`). An Owner on a phone whose payday
  passed sees no Payday tile at all. This is the "held Home composition" the contract asks to forward into.
- **Benefit:** phone Home shows "Payday passed Nov 6 · Prepare Oct 26 – Nov 1" (in red) with Prepare payroll.
- **Size:** S (one prop, one branch in `PaydayTile`).
- **Risk/decision:** wording and red tone on the ink tile; the tile must also render when only `payrollStatus` exists.
  The desktop card's wording ("Payroll to prepare" plus a long "Payday Tue, Oct 27, 2026 · Pay period Oct 19, 2026 –
  Oct 25, 2026" line) was written by Codex in the corporate kit, not the copy in our handoff.
- NV-006 shared classification: Timecards and Time exports now call `classifyTimecardReview` /
  `summarizeTimecardReview` (`timecards.tsx:378`, `payroll-export.tsx`), the same predicate the Action Center uses
  (`action-center/project.ts`). Consumed. See "Codex-authored UI" below for the side effects.

### NV-014: shift-change policy once
- **Server:** `readShiftChangeAvailability` (`src/lib/data/shift-changes.ts:266`) returns
  `policy?: {managerReviewRequired: boolean|null; rulePath: 'Scheduling rules › Trades'}` for `MANAGER_APPROVE` by an
  Owner/Manager; type in `src/lib/shift-changes/availability-policy.ts:1`. Row `notice` now carries only overtime and
  "submitted under manager review".
- **UI today:** `src/components/manager-shift-requests.tsx:143` reads availability per row and passes only
  `allowed` and `notice` to `Decision` (`:172`, `:180`). Nothing in `src/components` or `src/app` reads `.policy`
  (grep confirmed).
- **Gap:** the policy sentence is gone from every row and is not shown once either, so the page no longer says why
  requests wait for a manager.
- **Benefit:** one line above the Waiting list: "Swaps and cover need manager review · Scheduling rules › Trades"
  (linking to the rule).
- **Size:** S.
- **Risk:** `managerReviewRequired` can be `null` (unknown): show nothing or "can't be checked", never "automatic".
  `policy` is only present for `MANAGER_APPROVE`, not for can't-work (`APPROVE_CALLOUT`) rows; take it from the first
  exchange row. `rulePath` is a label, the href is ours (`/app/schedule/settings`).

### NV-079: `counterpartName`
- **Server:** `ActionRequestFacts.counterpartName?` in `src/lib/data/action-request-facts.server.ts:12`; bounded in
  the parser `src/lib/action-center/project.ts:11-14`.
- **UI today:** not referenced anywhere in `src/components`. Row builders:
  `manager-inbox-corp.tsx:43-49` (`requestDetail`, local `RequestFacts` type has no counterpart),
  `owner-b/home-b.tsx:131-134` (Home "Things to do"), `owner-b/inbox-b.tsx` default rows,
  `manager-inbox.tsx:123` (older list).
- **Gap:** swap rows still read "Shift request · Thu Nov 12".
- **Benefit:** "Swap with Ana · Thu Nov 12" on Home and Things to do.
- **Size:** S.
- **Risk:** the SQL fills the name only for `EXCHANGE` rows (`action-request-facts.server.ts:33`); `CALLOUT` rows
  are always `NULL`, so can't-work rows cannot name who is covering. Our handoff asked for both. For a coverage
  exchange the name is the person who claimed it; omit the phrase when the field is absent.

### NV-138: role in `hourRows`
- **Server:** `hourRows[].role` in `src/lib/data/manager-dashboard.ts:274`.
- **UI today:** `DashboardHourItem` (`manager-dashboard.tsx:56-62`) and `TeamOverviewHour`
  (`team/team-overview.tsx:7-10`) have no `role`; rows render at `team-overview.tsx:52-58` with only the "You" pill.
- **Gap:** Owners appear in "Hours this week" unmarked, and count toward "Off target".
- **Benefit:** an "Owner" pill on those rows (or leaving Owners out of the off-target figure).
- **Size:** S.
- **Decision:** mark, or filter out? The contract says mark. If Owners with no target stop counting as off target,
  that changes a number.

### NV-109: `upcoming`
- **Server:** `ManagerActionItem.upcoming?: boolean` (`src/lib/assistance/manager-actions.ts:35`), set by
  `markUpcomingCoverage` (`:303`) only for `COVERAGE_GAP` dated after the workspace business date.
- **UI today:** `ActivityCorp` in `manager-dashboard.tsx:186-188` derives the split itself:
  `dayKey(event.at) > today`, for every dated item.
- **Gap:** duplicate logic with different scope: the client moves any future-dated item (time off, swaps, can't
  work) into "Coming up"; the server marks only coverage gaps.
- **Benefit:** the split uses the workspace business date from the server (no dependence on the browser clock), and
  "Coming up" holds only obligations.
- **Size:** S.
- **Decision:** should a future-dated time-off request stay in "Coming up" (today's behaviour) or return to the day
  list? Using `upcoming` alone changes what is shown.

### NV-152: `acknowledgedAt` and retained comparison
- **Server:** `readEmployeeWeeklyReview` (`src/lib/data/employee-weekly-review.server.ts:24`):
  `acknowledgement.acknowledgedAt?: string` (ISO, `:58`) and `publicationChanges` kept after confirming when
  `historyAvailable` (`:64-65`).
- **UI today:** `src/app/app/schedule/page.tsx:185,240` already passes `publicationChanges` to
  `SchedulePublicationChange`, so "What changed in your schedule" now stays after confirming with no UI change
  (shown at `employee-schedule-corp.tsx:164,237`, `employee-b/schedule-b.tsx:97,109`). The confirmed card says
  "Week confirmed · {range} · Your manager can see you checked it" (`employee-schedule-corp.tsx:152`).
  `acknowledgedAt` is not read by any component.
- **Gap:** the receipt time is missing.
- **Benefit:** "Week confirmed · Mon, Nov 9 · 9:41 PM".
- **Size:** S (one prop from `page.tsx:234-235`, one line of formatting in the workspace time zone).
- **Risk:** legacy confirmations return no comparison (empty list, the disclosure hides itself) and may have no
  time; keep the current sentence as the fallback. Worth one browser check that the disclosure really appears on a
  confirmed week.

### NV-165: `exchangeCounts`
- **Server:** `exchangeCounts: {open: number|null; forYou: number|null}` on both snapshots:
  `src/lib/data/employee-exchange.server.ts:93-97`, `src/lib/data/employee-requests.server.ts:56-60`; type
  `src/lib/exchange-counts.ts:2`; parsed in `src/lib/employee-exchange.ts:13,63` and `src/lib/employee-requests.ts:9,22`.
- **UI today:** no component reads it. `ExchangeHeroB` gets counts from each tab's own rows:
  `employee-b/exchange-b.tsx:82` (Open: own rows + `forYou` prop), `:132` (For you: own rows only; Mine: none),
  `employee-b/requests-b.tsx:189` (no counts).
- **Gap:** counts still disappear when you change tab.
- **Benefit:** "Open 3 · For you 1" pills on every tab.
- **Size:** S to M (thread the field through `employee-mobile/requests.tsx` and `exchange-view.tsx` to three hero calls).
- **Risk:** each side can be `null` independently (show no pill, not 0). Counts are listing rows, not final
  eligibility, so the Open pill can be higher than "You can pick up"; decide which number the pill shows.

### NV-092: `readOperationalEmployeeHours`
- **Server:** `src/lib/company-access/operational-read.server.ts:213`, returns `OperationalRead<PersonHours>`;
  `PersonHours` (`src/lib/person-hours.ts:4`): `{employeeId, today, weekStart, timeZone,
  scheduledTodayMinutes|null, scheduledWeekMinutes|null, workedWeekMinutes|null,
  workedBasis:'EFFECTIVE_ELAPSED_INCLUDING_BREAKS'}`.
- **UI today:** no caller outside `src/lib`. `src/app/app/employees/[employeeId]/page.tsx` has no hours card.
- **Gap:** the whole card.
- **Benefit:** on a person's page: "Today 8 h · This week 32 h scheduled · 18 h 30 min worked".
- **Size:** M.
- **Risk:** worked time includes breaks, so the label must not say "paid". Each figure can be `null` (unpublished
  plan, overlapping time): show the kit's grey dash. It is one more protected read on the page; a failed read must
  not take the page down.

### NV-252: `weeklyHoursLimit` null
- **Server:** `TimecardProjection.weeklyHoursLimit?: number|null`, always `null` (`src/lib/timecards/read-model.ts:7,45`).
- **UI today:** no over-limit chip in `timecards.tsx` (grep for "Over", "60" in copy: none).
- **Gap:** none. The contract is "omit the chip", which is the current state.

### NV-158: `deviceAlerts` / `deviceAlertsAvailable`
- **Server:** requests snapshot `deviceAlerts: null`, `deviceAlertsAvailable: boolean`
  (`src/lib/data/employee-requests.server.ts:60`).
- **UI today:** `OpenShiftsEmptyB` (`employee-b/requests-b.tsx:60-68`) shows "Get alerts on this device" only when
  the shell's browser device read answered (`useEmployeeDevice`), which is what the contract asks for. The
  tablet/desktop empty state (`employee-schedule-corp.tsx:64`) shows the link with no condition.
- **Gap:** `deviceAlertsAvailable` is unused, and one empty state can still lead to "Your workplace hasn't turned
  on device alerts".
- **Benefit:** the link never leads to a dead end.
- **Size:** S (reuse the same hook in `employee-schedule-corp.tsx`).
- **Risk:** none; do not treat `deviceAlertsAvailable` as this browser's permission.

### NV-091 / NV-240: `late`
- **Server:** clock monitor rows `late?: boolean|null` (`src/lib/clock-monitor.ts:71,83-88`, applied at
  `operational-read.server.ts:191`). True means this person clocked in late for a matched shift; null is unknown.
- **UI today:** `TeamLiveProvider` (`src/components/team-live.tsx:17-35`) builds its own `late` map from the Today
  read: a started shift with no clock-in, in minutes. Used by `team-b.tsx:40,59`, `team-desk-people.tsx:26`.
  No component reads `monitor.employees[].late`.
- **Gap:** two different meanings. UI "Late 42 min" = not in yet. Server `late` = working, arrived late. The server
  field is unused, and Team still needs both reads.
- **Benefit:** a working person who arrived late reads "Working · Late" on Team and Who's working.
- **Size:** M.
- **Decision:** naming. "Late" is already the filter for people who are not in. Suggest "Clocked in late" for the
  server field, and keep the Today read for "not in yet" (the monitor has no row for someone who never clocked in,
  so it cannot replace the Today read as our handoff hoped).

### NV-137: `readActiveOwnerNames`
- **Server:** `src/lib/data/owner-names.server.ts:9`, `{state:'ready'; owners: string[] (max 50); observedAt;
  validForMs} | {state:'unavailable'; reason}`. Allowed for Owner, Manager, Employee, Lead.
- **UI today:** `src/app/app/settings/layout.tsx:12` and `src/app/app/payroll/payroll-route.tsx:15-17` filter
  `listEmployees()`. The other seven `OwnerOnlyNotice` uses pass no owners.
- **Gap:** the lighter read is unused.
- **Benefit:** no visible change for Managers; the notice can also name Owners for Employees and Leads, who cannot
  call `listEmployees()`.
- **Size:** S.
- **Risk:** needs a `SessionMutationProof`; keep `.catch(() => [])` behaviour on `unavailable`. No message action
  exists, so the notice still has no button.

### NV-142: notification `subject`
- **Server/shape:** `EmployeeNotificationItem.subject?: {kind:'scheduleWeek'|'requestDate'; startDate; endDate}|null`
  (`src/lib/employee-view.ts:9-10`, validated at `:32-33`).
- **UI today:** rows render `item.label` through `notificationPresentation` in
  `src/components/notification-inbox.tsx:139-140` and `notification-inbox-signature.tsx:41-42`; `subject` is not read
  (grep for `.subject` in components finds only the Clocker).
- **Gap:** titles cannot name their subject.
- **Benefit:** "Schedule for Nov 16 – 22 changed", "Time off Nov 12 – 14 approved".
- **Size:** S to M (a small formatter plus two renderers; check the bell popover in `app-shell.tsx:468` too).
- **Risk:** `subject` is date-only by design; do not add names. Lock-screen payloads stay generic.

### NV-261: reminders for both targets
- **Server:** `POST /api/manager/reminders` (`src/app/api/manager/reminders/route.ts`) and
  `GET /api/manager/reminders/operations/[id]` (`.../operations/[id]/route.ts`), both via
  `managerReminderHttp` (`src/lib/manager-reminders/http.server.ts`). Headers: `X-Nevora-Reminder: 1`,
  `X-Nevora-Reminder-Authority`. Bodies in `src/lib/manager-reminders/types.ts`:
  `{kind:'AVAILABILITY', operationId, authority, employeeId, weekStart, expectedDeadline}` or
  `{kind:'COMMUNICATION', operationId, authority, employeeId, communicationId, expectedRevisionId}`.
  Results: `committed {operationId, notificationId, disposition:'queued'|'already_queued'}`,
  `blocked|conflict|unavailable {reason}`, `outcome_unknown {operationId}`. HTTP 200/403/409/503; 404
  `module_off` when Updates is off.
- **UI today:** no caller (grep for `manager/reminders`, `X-Nevora-Reminder`, "Remind" in `src/components` and
  `src/app/app`: none).
  - Availability "Not sent" rows: `src/components/availability-team-list.tsx:74` (a link row to the person's page).
    Deadline is at hand as `settings.availabilityDeadline` (`manager-availability.tsx:40-50`).
  - Update "not read" rows: `src/components/communication-detail.tsx:117` (signature look, "Not acknowledged yet")
    and `:140` (quiet look, "Not yet"). `management.recipients[]` now has `employeeId`
    (`src/lib/communications/types.ts:16`); rows are still keyed by index. `ready.id`, `ready.revisionId` and
    `ready.authority` are on the snapshot.
- **Gap:** everything on the client: the button, the operation id that survives a retry, the recovery lookup, and
  the result states.
- **Benefit:** a quiet "Remind" pill on each person who hasn't sent availability or read a required update;
  after a tap it reads "Reminder queued".
- **Size:** L (one shared client hook/component, two surfaces, three row variants, tests).
- **Risks/decisions:**
  - `committed` means queued, never delivered: say "queued"/"will be sent", not "sent". Quiet hours 21:00–07:00 can
    hold it until morning.
  - Keep the original `operationId` for `outcome_unknown` and look it up; only `operation_not_found` allows replay.
  - Availability needs a deadline that is still open and a missing submission: no deadline or a passed deadline
    means no button. `expectedDeadline` must be the exact ISO value from the read.
  - Communication reminders are for REQUIRED, unexpired updates only: no button on optional updates.
  - The Availability page has no communication authority today. `communicationAuthority(proof)`
    (`src/lib/communications/service.server.ts:36`) is a server export; the page must pass it down.
  - Development activation hold (`communicationDevelopmentGuard`, `service.server.ts:75`): outside the owned
    loopback environment the command is refused, so the button needs a calm "not available" state.
  - The row is a link today; a button inside it needs its own hit area (two targets in one row).
  - Daily budget: a second tap the same day returns `already_queued` or a refusal; show that plainly.

### NV-052: identified PIN
- **Server:** `POST /api/clocker/[location]/pin` accepts `{action:'verify', employeeId, pin}`
  (`src/lib/clocker/pin-transport.server.ts:8,23-24,58`). 429 body:
  `{state:'limited', code:'PIN_LIMITED', error, retryAfterSeconds, limitScope:'person'|'device'|'workspace'}` plus
  `Retry-After` (`:60`).
- **UI today:** `src/components/clocker-pin-gate.tsx`: sends `{action:'verify', pin}` (`:103`), one 4-digit field
  (`:147-150`), reads only `data.error` and the status (`:24`), no `limitScope`, no `retryAfterSeconds`.
  Lockout card: title "This tablet is paused" (`:143`), text "Too many wrong PINs were entered on this tablet. Wait
  about five minutes, or ask a manager to record your time." (`:128`; Spanish at `clocker-copy.ts:246`).
- **Gap:** all of it: the Employee ID field, sending it, scope-aware wording, the real wait, and a countdown.
- **Benefit:** one person's wrong PINs no longer read as "this tablet is paused" for everyone; the screen says who
  is paused and for how long ("Try again in 3 min 12 s").
- **Size:** L (kiosk layout in two orientations, an alphanumeric ID entry on a keypad-only screen, three scopes,
  English and Spanish, tests, DESIGN.MD).
- **Risks/decisions:**
  - IDs are trimmed and Unicode-uppercased, so they are not digits only: the kiosk needs a way to type letters
    (`inputMode="none"` and the on-screen number pad won't do). Biggest design question.
  - While the legacy PIN-only shape still works, decide whether the ID field is required from day one. Unknown or
    malformed IDs spend shared credit and never fall back.
  - Scope wording: person ("Your PIN is paused"), device ("This tablet is paused"), workspace ("PIN entry is paused
    for your workplace"); ties resolve workspace, then device, then person.
  - Countdown must come from `retryAfterSeconds` (monotonic clock, like the privacy timer), never a fixed five
    minutes; announce it to screen readers sparingly.
  - DESIGN.MD:1650-1651 says "No lockout countdown: the server's `retryAfterSeconds` is a fixed 300". That note is
    now wrong and needs Jose's OK to change (our handoff said a countdown needs his approval).
  - Tablet health band reports `paused` for any 429 (`:119`); a person-scope pause should not mark the tablet paused.
  - `clocker-copy.test.tsx` pins server strings to Spanish entries; new strings need both.

### NV-045: `clockerErrorText` codes
- **Server:** every PIN/setup failure carries `code` (`CLOCKER_TRANSPORT_ERRORS`,
  `src/lib/clocker/transport-errors.ts`); helper `clockerErrorText(locale, {code, error})` in
  `src/components/clocker-copy.ts:287`.
- **UI today:** the helper has no caller. `clocker-pin-gate.tsx:24` and `clocker-setup.tsx:22` take
  `data.error` and translate by exact English sentence.
- **Gap:** translation still breaks if a server sentence is edited.
- **Benefit:** Spanish tablets keep Spanish errors whatever the English text says.
- **Size:** S (carry `code` on `PinRequestError` and `SetupFailure`, call the helper where the text is shown).
- **Risk:** `ClockerText` marks unknown text `lang="en"`; keep that for codes the table doesn't know.

### NV-185: `otherCount`
- **Server (browser journal):** `references(location, subject)` returns `{references, otherCount}`
  (`src/lib/clocker/recovery-journal.ts:10`, `recovery-journal.browser.ts:46-58`).
- **UI today:** `clocker-punch-panel.tsx:70,86,150` already calls it with the verified subject and keeps only
  `.references`. `ClockerRecoveryHandoff` (`clocker-recovery.tsx:13-27`) lists them with "Show N more".
- **Gap:** `otherCount` is dropped, so the panel no longer says other people have saved actions on this tablet. The
  component comment (`clocker-recovery.tsx:10-11`, "the tablet's others wait behind Show N more") is now wrong:
  "Show N more" counts only the person's own.
- **Benefit:** one line, "3 other saved actions on this tablet. Each person can check theirs after their PIN."
- **Size:** S.
- **Risk:** a count only: no other person's IDs or actions. With zero own references and `otherCount > 0` the
  handoff link is hidden today (`clocker-punch-panel.tsx:185` needs `references.length > 0`); decide whether the
  count alone should show it.

### Kiosk speed
- **Server:** verify returns `{state:'verified', firstName, expiresAt}` (`pin-transport.server.ts:62`).
- **UI today:** `clocker-pin-gate.tsx:103-104` calls verify, discards the reply, then calls status.
- **Gap/benefit:** use the verify reply; one fewer round trip before the clock on every punch.
- **Size:** S.
- **Risk:** keep the epoch check, the `document.hidden` reset and the `privateScreenWindow` check. The status call
  also proved the cookie was stored; the next request (punch `state`) proves the same.

### NV-262: timecard rows
- **Server:** `combineManagerActions` (`src/lib/action-center/project.ts:26-32`): no trailing period without
  issues; adds " · Location A, Location B" when a period spans more than one location.
- **UI today:** the client trim `detail.replace(/(\d)\.$/, '$1')` (`src/lib/action-center/present.ts:82`) is now
  dead for server output, and so is `.replace(/\.\s*$/, "")` in `manager-inbox-corp.tsx:84`. `timecardRows`
  (`manager-inbox-corp.tsx:77-91`) groups by `detail.split(" · ")[1]` and lists first names, so the new location
  part (index 2) is discarded there.
- **Gap:** none where rows are grouped by period (one row per period cannot duplicate). Where items show
  individually (`presentItem` detail), the location shows automatically.
- **Size:** S (delete the two trims; optionally show locations in the grouped row).
- **Risk:** when issues exist the detail ends "· Fix recorded-time issues before finalizing." Check that sentence
  does not end up as a row title anywhere.

### NV-121: `decided=` toast
- **Server:** `src/app/app/requests/actions.ts:104` redirects to
  `/app/requests?tab=pending&reviewed=1&decided=timeoff-approved|declined`.
- **UI today:** the global `Toaster` (`app-shell.tsx:602`) reads `decided` (`toaster.tsx:74-79`) and shows "Time
  off approved. The employee can see it in Time off." automatically. `manager-time-off.tsx:185` still renders
  "Decision saved." because `reviewed=1` is still set.
- **Gap:** two confirmations at once (the toast and the inline line).
- **Benefit:** one specific message.
- **Size:** S (drop the inline line, or keep it only when `decided` is absent).
- **Risk:** the inline line is server-rendered and works without JavaScript; the toast does not. `actions.test.ts`
  pins `reviewed=1`.

### NV-068: durations
- **Server:** `durationText` (`src/lib/duration-text.ts`) now returns `durationSentence(minutes, '0 h')` from our
  `src/lib/duration-format.ts`. Sub-minute "<1 min" is in `src/lib/employee-time.ts:88`.
- **UI today:** consumers get "8 h 30 min" automatically (`coverage-assistant.tsx:43`,
  `schedule/edit/shift-edit-timing.tsx:7`, `wave-a/keep-duration.ts:5`, `manager-inbox.tsx:135`).
- **Gap:** none for the contract. Old compact forms remain in dense/older surfaces by design:
  `formatMonitorDuration` "5h 3m" (`clock-monitor.ts:79`, shown in `manager-clock-monitor.tsx:35`),
  `timecards.tsx:738`, `time-clock-widget.tsx:18`, `employee-home-reviewed.tsx:71-73`. No UI regex parses the old
  server form (checked).

### NV-174: not-found document helper
- `src/app/document-appearance-scripts.tsx` is used by `src/app/layout.tsx:42`; the layout has no second inline
  copy of the two scripts. Consumed. Not checked in a browser.

### NV-022: titles
- `mobileAccessMetadata` (`src/components/mobile-access/metadata.server.ts:8`) is used by login, forgot-access,
  reset-access, activate, welcome and access-help. Consumed. The `.replace(/\.$/,'')` on line 16 is a no-op left over.

### NV-186 / NV-188 / NV-308
- **Slogan:** `NUVORA_BRAND.sloganEs` (`src/lib/brand.ts:6`) is used at `mobile-access/copy.ts:430`. No hardcoded
  copy of either slogan elsewhere. Consumed.
- **"Forgot password?":** `auth-copy.ts:31,172`, `mobile-access/copy.ts:63,279`, `assisted-recovery.tsx:65`,
  `legal/policies.ts:106,118`, all to `/forgot-access`. Consumed.
- **Statement V3:** `src/components/payroll/api.ts:142` accepts V1, V2 and V3. No component renders
  "Importe"/"Monto" as HTML; the wording lives only in the PDF (`src/lib/payroll/native/paystub-document.ts:509-511`).
  The UI fixture still uses V1 (`payroll/native-ui-fixture.test-support.ts:14`), which is valid. Consumed.

### NV-016: shared bell/sidebar count (optional)
- Bell: unread notifications from `/api/notifications` (`notification-bell.tsx:16,34`). Sidebar and phone tab:
  things to do from `/api/manager/inbox-count` (`use-inbox-count.ts`, `app-shell.tsx:223,478-486,565`).
- For Employees the sidebar Notifications count already shares the bell's snapshot (`app-shell.tsx:487`).
- For Owners/Managers these are two different numbers on purpose (messages vs decisions). "One count" would mean
  choosing one of them. Decision for Jose; nothing is broken.

### SCRUM-176: Search geometry probe
- **Control:** `CommandFinder` trigger, `<button class="command-finder-trigger">` in
  `src/components/command-finder.tsx:182`, mounted in the top bar at `src/components/app-shell.tsx:543`.
- **Where 30px comes from:** `src/app/app/premium-clean-manager.css:1009` (inside `@media (min-width: 761px)`,
  under `[data-nv-clean]`): `min-height: 30px; height: 30px`, with `:1010` adding a `::after` that is 44px tall
  (the comment says "a 30px control ... (44px hit area)"). So on development the box is 30px and the tap area 44px.
- **At HEAD:** `src/app/app/owner-b-desktop.css:41` (inside `@media (min-width: 768px)`, under `[data-nv-b]`) sets
  `height: 40px !important; min-width: 280px` (240px wide at 768–1023, `:851`). The shell always sets `data-nv-b`
  (`app-shell.tsx:448`) and sets `data-nv-clean` for management roles (`:434`), so the 44px `::after` still applies.
  Development has no `owner-b-desktop.css` (`git cat-file` on the merge's second parent confirms), so the probe
  measured the old rule.
- **Real hit area on this branch (from CSS, not measured):** box 40px tall; pointer target 44px tall by the full
  width, through the pseudo-element. That clears the 43.5px threshold as a hit area but not as a bounding rectangle
  (40 < 43.5).
- **What to do:** re-run the probe on the combined source; expect 40px. Then either measure the effective target
  (the `::after`) or make the box 44px. Size S. Decision: whether a 40px control with a 44px target passes the
  team's rule, as it does for the other top-bar buttons.

---

## Merge leftovers

1. **Client trim of the trailing period:** `src/lib/action-center/present.ts:82` and
   `src/components/manager-inbox-corp.tsx:84`. Dead now that the server omits the period. Safe to delete (S).
2. **Client split of "Coming up":** `manager-dashboard.tsx:186-188,211` duplicates `markUpcomingCoverage`, with a
   wider rule. See NV-109.
3. **Client-derived late:** `team-live.tsx:29-33` (minutes since a missed start) and
   `whos-working-corp.tsx:17-19,56`. Not a duplicate of the server's `late` (different meaning), but the two now
   share one word. See NV-091.
4. **`MESSAGES_ES` old key:** `src/lib/auth-copy.ts:293-294` ("...registered recovery channel is available...").
   The server no longer sends it (`src/app/api/auth/recovery/route.ts:10` has the new text; no other source has the
   old one). Delete.
5. **Kiosk remap of photo messages:** `clocker-photo/punch-photo-flow.tsx:19-21` is still needed: the photo
   library lines are unchanged (`src/lib/clocker/photo-client/result-copy.ts:8,19`). Codex changed only the three
   punch-reference lines in `punch-command.ts`. Keep.
6. **Stale Clocker copy keys** (English sentences no source emits any more; found by matching every
   `CLOCKER_COPY` key against non-test source, so treat as likely, not proven):
   `clocker-copy.ts:270` "This command ID already belongs to a different action...",
   `:275` "The clock result could not be confirmed. Check the original command receipt...",
   `:221` "PIN not recognized. Try again or ask your manager to check your PIN.",
   "Tablet verification changed. Do not replay the previous action.",
   "Your clock state or verification changed. No confirmation was found...".
   Harmless; remove with the NV-045 work.
7. **"Decision saved." beside the toast:** `manager-time-off.tsx:185`. See NV-121.
8. **Stale comments:** `clocker-recovery.tsx:10-11` (others behind "Show N more"); `clocker-pin-gate.tsx:124-126`
   ("The lockout is per tablet on the server"); `use-inbox-count.ts` ("Before Codex's endpoint is merged");
   DESIGN.MD:1650-1651 (fixed 300 seconds).
9. **V2 Clocker flag:** no `uiV2`/`v2` prop is passed anywhere in `src`. `NEVORA_CLOCKER_UI_V2` is not read
   (`src/app/clocker/[location]/page.tsx:32` is a comment). It is still set to "false" in
   `native/staging/environment.template.json:16` and `native/staging/free-environment.template.json:17`. Harmless;
   remove when those templates are next touched (they are native/Codex files).
10. **No-op:** `mobile-access/metadata.server.ts:16` `.replace(/\.$/,'')`.

## Codex-authored UI that arrived with the merge (not restyled or reviewed by us)

`git diff --name-status ff5a267f f3c4a889 -- src/app src/components | grep '^A'` lists seven files: two API routes
(`api/manager/reminders/route.ts`, `.../operations/[id]/route.ts`), three tests, a test for metadata, and
`src/app/document-appearance-scripts.tsx` (renders nothing). **No new page, route with UI, or visual component was
added**, so nothing new carries a pre-Direction-B look.

Codex did edit existing UI files (diff of the merge against its UI parent, `f3c4a889^1..f3c4a889`):

- `src/components/timecards.tsx`
  - `:529` a new second note under the summary, always shown: "N awaiting approval · N awaiting finalization",
    directly under our "N ready ..." note (`:526-528`). Two stacked grey lines, shown even at "0 · 0", and
    "finalization" is not glossary wording.
  - `:508,687` the filter label changed from "Need review" to "Needs review"; its count is now
    `reviewSummary.counts.review`, which includes approved cards awaiting finalization, so an approved card appears
    under both "Needs review" and "Approved".
  - Empty text changed to "No recorded timecards need review." (was "No timecards in progress." / "No timecards to
    approve.").
  - Our NV-006 comment explaining the label was replaced.
- `src/components/owner-home-corp.tsx:168-203` and `owner-home-corp.css:32`: the payroll facts in the Payday card
  (tablet/desktop corporate card only; see NV-006/007). Card label becomes "Payroll" when there is no payday.
- `src/components/payroll-export.tsx`: counts now from `summarizeTimecardReview` (no visual change found).
- `src/components/clocker-punch-panel.tsx`: per-person references (see NV-185).
- `src/components/clocker-copy.ts`: three new Spanish lines and `clockerErrorText`.
- `src/components/__snapshots__/timecards-employee-unchanged.html`: the frozen snapshot changed (durations).

These need a look in the browser at phone and desktop widths once the capture run is finished.

## Not verified

- Nothing was rendered. Every "the user sees" statement comes from reading code.
- The Search hit area (40px box, 44px target) is from CSS source order and specificity, not a measurement.
- That "What changed" really appears on a confirmed week (depends on `historyAvailable` data).
- The stale-copy list in leftover 6 is from a text match and may include a sentence built at run time.
- NV-156 (every waiting time-off request returned) and NV-038 web copy were stated as done in the contract and were
  not re-checked here beyond the label compatibility in `src/lib/notification-labels.ts:7` and
  `notification-inbox-view.ts:24-31` (old labels still accepted).
- NV-033: HEAD commit a496040f says the fixture UUIDs are done; the harness was not opened.
