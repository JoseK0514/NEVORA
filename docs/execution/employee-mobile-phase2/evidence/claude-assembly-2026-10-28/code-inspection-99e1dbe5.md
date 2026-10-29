# Employee/Lead mobile: independent code inspection

- **Revision:** `99e1dbe5`, worktree `.claude/worktrees/emp-p2-assembly`.
- **Method:** read-only. I used only code reading, git and grep. I ran no browser, server, database or vitest.
- **Scope:** `src/components/employee-mobile/**`, the Employee/Lead pages under `src/app/app/**`, the `/api/employee/*` and `/api/payroll/{statements,documents}` routes, and the `src/lib` readers and writers they call.
- **Excluded:** anything already listed as open or fixed in `docs/execution/employee-mobile-phase2/{STATUS,REMAINING-WORK,CHECKLIST}.md` and the batch handoffs. That covers QA-OWN-3, QA-CAL-1, the landscape audit, PAY-UI-10, the deletion decisions and the Communications seam UI-COM-003.

Severity runs from Blocker down to Low. I found no Blocker.

## Server authorization: no gaps found

- **Employee view routes:** every `/api/employee/*` GET goes through `createEmployeeViewGet` (`src/lib/employee-view-route.server.ts:20-31`). That function checks the session, the Employee/Lead role, the mutation proof matching the session, the per-view lifetime header, `no-store` and cross-site refusal. The readers then apply guarded SQL.
- **Server actions:** the planning, hours and exchange actions check the role again on the server (`src/app/app/employee-planning/actions.ts:6-15`, `src/app/app/employee-hours/actions.ts:6-11`).
- **Statements:** the statements read is scoped by `employee_id=$1` and `published` (`src/lib/payroll/access.ts:36-45`).
- **PDF routes:** both routes check the session first, then the `payStatements` module for Employees/Leads, then `document()`. `document()` hides a coworker's or unpublished statement behind a 404 and refuses a hash mismatch with a 503 (`src/app/api/payroll/documents/[id]/route.ts:20-32`, `src/lib/payroll/access.ts:48-67`).
- **Direct URLs:** module gates stop `/app/requests`, `/app/exchange*` and `/app/my-pay` before any data is read.

## Findings

### H-1 (High): a slow renewal is reported as "Your access changed. Sign in again", and polling stops

**Evidence**
- The default `expiryFailure` is `validForMs<45000 ? 'access_denied' : 'read_failed'` (`src/lib/private-snapshot-client.ts:14`).
- The expiry timer stays armed while a renewal is in flight. When it fires it calls `unavailable(expiryFailure(result.validForMs))` (`:44`).
- The renewal is scheduled at `remaining*0.7` (`:45`), and its own timeout is 10 s (`:28`).
- An `access_denied` result never reschedules (`:22`, `:37`).
- The servers almost always return less than 45000 ms, because each one subtracts elapsed time:
  - messages: `min(lease, 45000-elapsed, deadline(data)-observed)`, where the inner communications lifetime is capped at 15000 (`src/lib/data/employee-messages.server.ts:42`, `src/lib/communications/service.server.ts:62`);
  - hours: `45000-(performance.now()-started)` (`src/lib/data/employee-hours.server.ts:48`).
- `useMessages` passes no custom `expiryFailure` (`src/components/employee-mobile/use-messages.ts:11`).

**Failure scenario**
1. An employee opens Notifications or Updates, or is writing an update. A typical `validForMs` is about 14 700 ms, the round trip is 0.8 s, so `remaining` is about 13.9 s and the renewal starts at about 9.7 s.
2. On a slow phone connection the renewal takes more than about 4.2 s.
3. The expiry fires first and publishes `access_denied`. The page shows "Your access changed. Sign in again to continue." with only a **Sign in** link (`messages.tsx:49`), and message-session admission is paused.
4. Polling stops. Nothing recovers until a focus, visibility or online event, which never comes while the person keeps looking at the page.

Hours and Planning hit the same path when the server-side elapsed time pushes `remaining` under about 33 s.

**Fix:** report an expiry during an in-flight renewal as `read_failed`, or compare against the server's own lease rather than a constant. Keep `access_denied` for 401/403 and explicit denial only.

### M-1 (Medium): Hours and Pay lose the teal header in portrait, while Home, Schedule and Requests keep it

**Evidence**
- `quiet-shell.css:6` sets `.mobile-header{display:none !important}` for every shell except page markers `home|schedule|requests`.
- `mobile.css:45-63` styles the header, brand, workspace name and bell for `hours` and `pay` without `!important`, so those rules lose to quiet-shell.
- PAY-UI-4 asked for `pay` to be added "in the `quiet-shell.css` exclusion" (`docs/execution/employee-mobile-pay/reviews/ui-ux-review.md:76`). Commit `ec063e5f` changed only `mobile.css` and `app-shell.tsx`.

**Failure scenario:** at 390×844 portrait, the five top-level tabs show two different chromes. Hours and Pay have no NEVORA wordmark, no workspace name and no notification bell. Home, Schedule and Requests have all three.

**Before fixing:** confirm the intent in a browser, then add `hours` and `pay` to every quiet-shell exclusion, or drop the dead header rules.

### M-2 (Medium): Hours shows a white band in light mode and a black band in dark mode below its content

**Evidence**
- quiet-shell forces `.app-shell/.app-main/.page-frame` to `#FFFFFF !important` in light mode and `#000000 !important` in dark mode for every page marker except `home|schedule|requests` (`quiet-shell.css:5`, `:42`).
- The canvas background in `requests.css:5` (`.page-frame:has(.em-requests-mobile){padding:0 0 32px !important; background:var(--em-canvas)}`) has no `!important`, so it loses.
- Pay, Profile, Deletion and Messages avoid this by giving their page a `min-height:calc(100svh - nav)` canvas (`pay.css:3-4`, `profile.css:3,6`, `deletion.css:3-4`, `messages.css:8`). `hours.css` has no such rule.

**Failure scenario:** on `/app/my-time` or a Timecards period, the bottom 32 px, and everything below short content such as "Your recorded time couldn't be checked", paint `#fff` against canvas `#f4f7f6` in light mode, and `#000` against `#0c1817` in dark mode.

This is the same class of seam as UI-COM-003, on a page that UI-COM-003 did not cover.

### M-3 (Medium): the same request has different status names on different pages

**Evidence**
- `requests.tsx:22` (Hub, Recent requests): PENDING "Awaiting approval"; EMPLOYEE_PENDING "Awaiting a teammate"; OPEN "Offered for cover"; APPROVED "Approved"; CANCELLED "Cancelled"; kind "Shift request".
- `exchange-view.tsx:15-16` (list and detail): "Waiting for a teammate" or "Needs your answer"; OPEN "Waiting for coverage"; APPROVED "Completed", "Released assignment" or "Previous approval"; kinds "Swap request", "Cover offer", "Shift pickup", "Unable to work".
- `timeoff.tsx:15`: PENDING "Waiting for approval"; CANCELLED "Withdrawn".
- Hours uses "Effective time" (`hours-cards.tsx:23`) next to "Elapsed time" (`hours-records.tsx:24`) for comparable totals.

**Failure scenario:** an employee withdraws a time-off request. Time off says "Withdrawn", and the Requests hub row that links to it says "Cancelled". An approved cover shows "Approved" on the hub, and opening it shows "Completed".

**Fix:** move each label map into one shared module.

### M-4 (Medium): withdraw, cancel and decline confirmations disappear when the refresh lands, and focus is lost

**Evidence**
- **Time off:** `<Withdrawal>` is mounted only while `row.status==='PENDING'` (`timeoff.tsx:48`). `panel.accept(complete)` refreshes (`use-planning.ts:21`). The refreshed row is CANCELLED, so the component holding "Request withdrawn." (`:57`) and the focused button unmount.
- **Exchange:**
  - A settled response triggers `onRefresh` (`exchange-view.tsx:30`).
  - `exchange.tsx:31-34` then replaces the operation with a new one because `summary.revision` changed and the old one is neither pending nor uncertain.
  - `ResponseControls` therefore loses `result`, and the text "Your response was withdrawn…" or "Your request was cancelled…" (`exchange-view.tsx:38`) vanishes.
- The status block `em-response-status` (`timeoff.tsx:45`, `exchange-view.tsx:47`) is not a live region.

**Failure scenario:** a VoiceOver user taps Withdraw request. The button disables, the success line exists for only a few hundred milliseconds, then focus falls to `<body>`. Nothing reliable announces the outcome.

**Fix:** keep the receipt on the operation keyed by request ID, render it outside the conditional, and move focus to it.

### M-5 (Medium): every employee sees "Write an update", but whether they can send is only checked after they have written it

**Evidence**
- `messages.tsx:39` renders the compose link for any Updates read.
- The compose context lists primary or eligible locations, not today's assignments (`src/lib/communications/service.server.ts:324`). `shifts` is management-only (`:326`, `$2 IN('OWNER','MANAGER')`).
- The policy requires a published assignment at that location today (`src/lib/communications/policy.ts:24-27`).
- The refusal appears only after Review audience: "You need a current published assignment at this location today" (`messages-compose.tsx:30`).
- The label differs from desktop: mobile says "Write an update", desktop says "Message today's team" (`employee-updates.tsx:51,110`).

**Failure scenario:** an employee who is off today fills in the title and message, chooses a location, taps Review audience and is refused.

**Fix:** expose per-location eligibility for today in the employee context, or explain the rule before the form is filled.

### M-6 (Medium): the Availability deadline shows a raw IANA time-zone ID to employees

**Evidence:** `availability.tsx:46` renders `({read.timeZone})`, which appears as "(America/Puerto_Rico)". Hours and compose use `timeZoneLabel()`, which gives "Puerto Rico time" (`hours-records.tsx:19`, `hours-cards.tsx:27`, `messages-compose.tsx:37`, `src/lib/time-zone-label.ts`).

**Failure scenario:** "Submit by Oct 30, 2026, 5:00 PM (America/Puerto_Rico)".

### M-7 (Medium): Updates/Notifications, Profile and the creation reason field don't get the custom focus ring

**Evidence:** the shared rule covers only `:is(a,button,input,summary):focus-visible` (`mobile.css`, the single focus-visible rule). These controls fall outside it and get only the browser's default ring:
- Profile's language and appearance `<select>` (`profile.tsx:22-23`; `profile.css` has no focus rule);
- the messages filter and location `<select>` and the message `<textarea>` (`messages.css` has no focus rule);
- the creation reason `<textarea>` (`creation.css` covers only `label:has(input:focus-visible)`).

Hours does include them (`hours.css:31`) and Calendar adds textarea (`calendar.css`). Planning adds textarea but not select (`planning.css`).

**Failure scenario:** tabbing on a keyboard-equipped tablet in coarse landscape shows a 3 px teal ring on inputs and a thin system ring on the select next to them, with weaker contrast in dark mode.

### L-1 (Low): changing the Availability week navigates on every change event

**Evidence:** `availability.tsx:44` calls `router.push(...)` inside `onChange` whenever the date is valid. Schedule (`week-picker.tsx:12`, View week) and Timecards (`hours-cards.tsx:17`, View period) wait for an explicit submit.

**Failure scenario:** typing in the segmented date field (keyboard in coarse landscape or desktop-class browsers) produces intermediate valid dates, for example year `0002`. Each one triggers a navigation and a protected read for a week the person didn't choose.

### L-2 (Low): exchange detail and the Requests hub don't move focus to the heading after navigation

**Evidence**
- In `exchange.tsx:49-58` the effect returns early whenever `selection` is set. The detail heading has `tabIndex=-1` but is never focused.
- The Requests hub `h1` (`requests.tsx:100`) has no focus management at all.
- Planning, Hours and Messages frames do focus their heading (`planning-frame.tsx:9`, `hours-frame.tsx:9`, `messages.tsx:18`).

**Failure scenario:** a screen-reader user opens a swap from the list. The link they activated is gone and focus is on `<body>`.

### L-3 (Low): Hours is a top-level tab but shows a "‹ Home" back link; Pay and the Requests hub don't

**Evidence:** `hours.tsx:28,34` (`back='/app'`, label 'Home') and `hours-frame.tsx:12`, which always renders the back link. Pay deliberately has none (`pay.tsx:94` comment), and neither does the Requests hub (`requests.tsx:100`). Notifications also uses "Home" (`messages.tsx:45`).

### L-4 (Low): the Open shifts back link uses a text "‹" glyph instead of the Phosphor caret

**Evidence:** `requests.tsx:100` renders `‹ Requests`. Every other frame uses `CaretLeftIcon size={18} aria-hidden` (`planning-frame.tsx:12`, `hours-frame.tsx:12`, `exchange-view.tsx:67`, `messages.tsx:45`, `profile.tsx:52`, `deletion.tsx:47`, `creation-view.tsx:28`). Screen readers announce the glyph as "single left-pointing angle quotation mark".

### L-5 (Low): "All time-off requests" opens only the Waiting tab

**Evidence:** `requests.tsx:112` links to `/app/requests?tab=my`. The page ignores `tab=my`, so `view` falls back to `waiting` (`src/app/app/requests/page.tsx:60-61`) and the mobile view gets `filter='waiting'`.

**Failure scenario:** an employee with only decided requests sees "Nothing waiting".

### L-6 (Low): Requests and Exchange say "Return online" when the person is online

**Evidence:** the paused state is set on `blur`, `pagehide` or a hidden page (`requests.tsx:91`, `exchange.tsx:44`), but the copy reads "Requests paused. Return online to refresh." (`requests.tsx:102`, `exchange-view.tsx:69`). Planning and Hours say "Return to this page or reconnect" (`planning-frame.tsx:13`, `hours-frame.tsx:15`).

### L-7 (Low): two dates use the device locale or time zone, unlike every other page

**Evidence**
- `deletion.tsx:30` uses `Intl.DateTimeFormat(undefined,{dateStyle,timeStyle})` for the deletion receipt time, which takes the device locale and zone.
- `passkeys.tsx:14` uses `toLocaleDateString('en-US',…)` with no `timeZone`.
- Everything else uses `'en-US'` and the workspace time zone.

**Failure scenario:** on a phone set to Spanish (common in Puerto Rico), the English receipt shows "27 oct 2026, 11:45 p. m.".

### L-8 (Low): select carets are drawn two ways, and one way hard-codes colors

**Evidence**
- Profile uses the Phosphor `CaretDownIcon` component (`profile.tsx:22-23`).
- Messages and Hours use a hand-drawn data-URI chevron with hard-coded strokes `%235f6d68` and `%23b8b7b0` (`messages.css:18-19`, `hours.css:26-27`). These copy the token values but bypass the tokens, and the shape isn't Phosphor.

### L-9 (Low): secondary buttons have different borders on different pages, and the main one is nearly invisible

**Evidence**
- `requests.css` `.em-request-secondary` uses `--em-line`: `#e3e9e6` on `#fff`, about 1.2:1.
- Passkeys' `.nv-btn` uses `--em-secondary`: `#cbd7d1`, about 1.5:1 (`passkeys.css`).
- Calendar has its own `.em-calendar-button`.
- In dark mode, `--em-secondary #5a6764` on surface `#172725` is about 2.6:1.

**Result:** secondary actions look different on different pages and have barely visible boundaries.

### L-10 (Low): Pay's "Today / Tomorrow / In N days" goes stale while statements stay current

**Evidence:** `daysUntil` is computed once at server render (`src/app/app/my-pay/page.tsx:26-30`). The statements reload on visibility (`use-payroll.ts:50`), but `nextPay` never does.

**Failure scenario:** Pay is opened at 11:55 PM and still reads "Tomorrow" after midnight on payday.

### L-11 (Low): Pay briefly shows the desktop layout before hydration

**Evidence:** `MyPay` returns the desktop `q-pay` page when `useEmployeeMobile()` is false, which is always true during server rendering (`my-pay.tsx:54`, `use-mobile.ts:5`). Requests, Planning, Hours and Messages hide their desktop children before hydration (`requests.css:3`, `planning.css:2`, `hours.css:2`, `messages.css:3`). Pay has no equivalent rule. No private data is exposed, because statements load on the client.

### L-12 (Low): notification row actions and icons come from substring matching

**Evidence:** `messages-view.tsx:13` and `:20` choose the action label ("Review schedule", "View statement"…) and the icon with `label.includes('Schedule' | 'Availability' | 'Pay statement' | 'Team')`. The notifications search placeholder says "Search by update type" (`:18`).

**Failure scenario:** a reworded notification label silently changes its action text and icon.

### L-13 (Low): "Employee ID" on the deletion page is the internal UUID

**Evidence:** `deletion.tsx:74` shows `account.employeeId`, which is `session.id` (`src/app/app/account/delete/page.tsx:24`), a 36-character UUID. Employees read "Employee ID" as their payroll or badge number.

**Note:** this is a copy question for Jose. It isn't a defect in the logic.

## Checked and found sound (not findings)

- **Time-off validation and midnight:** the end time `24:00` round-trips as 12:00 AM (`timeoff.tsx:38`).
- **Monday weeks:** `weekStartFor` (`src/lib/date-utils.ts:26-31`).
- **Overnight shifts:** shown via `endTime<=startTime` (`requests.tsx:46-50`, `exchange-view.tsx:21`).
- **Unknown outcomes:** recovery keeps one original operation (`planning-operation.ts`, `hours-operation.ts`, `request-operation.ts`), and the server reconciles before reporting success (`employee-planning-write.server.ts:57-58`).
- **Pay data lifecycle:**
  - superseded reads are ignored, and the list is cleared on pause or offline (`use-payroll.ts:21-63`);
  - "Download" deliberately has no `download` attribute (PAY-CR-9);
  - the money question doesn't arise: statements carry no amounts, so the phone view shows no figures.
- **Theme coverage:** dark tokens exist for every `--em-*` color except `--em-edge`. `--em-edge` stays `#7a8882`, about 4.2:1 on the dark surface, which is acceptable.
- **Content behind the bottom navigation:** the navigation height is measured (`navigation-layout.ts`), and `app-main` reserves it.
