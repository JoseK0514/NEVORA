# NEVORA copy audit: English and Spanish

Date: 2026-11-10. Read only: no repository file was changed.

## Method and coverage

**Skills applied.** `anthropic-skills:better-writing` set the severity scale and the table format. `stop-slop` was used for tone and filler. `design:ux-copy` supplied the CTA, error, empty-state and confirmation patterns.

**Rules.** DESIGN.MD "Current direction" (Direction B), `docs/design/voice.md`, and the DESIGN.MD copy notes:
- Sentence case, with the Clocker's Title Case status words left alone.
- "Plain language over audit language" (U5).
- The Truthful Feedback Rule.
- Payroll copy marked locked (U5, line 1320).

**How the files were chosen.** An import graph from every `src/app/**/page|layout|route|error|not-found|loading.tsx` marked 1,304 files as reachable. 162 files are never imported and were left out. They include:
- `generation-explanation-panel.tsx`, `manager-reviewed-views.tsx` (the old "Action Center" intelligence panel), `employee-home-reviewed.tsx` and `mobile-home-overview.tsx`
- `availability-editor.tsx`, `create-shift-form.tsx`, `payroll/payroll-stepper.tsx`, `time-clock-widget.tsx`, `status-pill.tsx` and `page-header.tsx`

Some files are reachable but never render their copy. `ActionCenterSurface` in `manager-action-center.tsx` is one: it renders only in `ui-preview`. Those strings are not reported.

**Read in full:**
- The copy modules: `src/lib/auth-copy.ts`, `src/components/mobile-access/copy.ts`, `src/components/clocker-copy.ts`, `src/lib/passkeys/copy.ts`, `src/lib/auth/account-email-copy.ts`, `src/lib/http/nevora-failure.ts`, `src/lib/action-center/present.ts`, `src/lib/time-off-staffing/present.ts`, `src/lib/workspace-presentation/words.ts`, `src/lib/clocker/photo-client/result-copy.ts`, `src/lib/notifications/payloads.ts`
- The Owner Direction B screens (`owner-b/*`)
- The Employee Direction B screens (`employee-b/*`)
- The Clocker kiosk (`clocker-punch-panel`, `clocker-setup`, `clocker-language`)
- The auth pages (`login`, `forgot-access`, `reset-access`, `activate`, the `mobile-access` views, `auth-shell`)
- The error pages, the toaster, the app shell, navigation and the finder

**Scanned with greps.** About 13,100 extracted string lines from reachable files were searched for: jargon, filler, Title Case, ranges, durations, destructive verbs, aria-labels and missing metadata.

**Not verified:**
- Rendered pixels and overflow. No browser was run; this is a source read.
- Strings that come from the server at runtime, apart from the Clocker and recovery messages traced here.
- The owner-advisor model output.
- Legal pages (`src/lib/legal/*`).
- Spanish sentences in the payroll documents beyond their label tables.

Line numbers are for the checkout as of today.

**Severity.**
- **High**: the copy misleads, hides how to recover, sends the person to the wrong place or person, or mixes languages in a way that blocks the task.
- **Medium**: breaks terminology, voice, case or format consistency, or puts audit jargon in main text.
- **Low**: wording polish.

**Verdict: Block.** 14 High root causes remain, across 16 table rows (listed in the summary below). M2 appears in the Sign-in table because the Owner's instruction describes the public reset flow.

---

## Summary of High findings

| # | Surface | Finding |
|---|---|---|
| C1 | Clocker ES | Any server error the dictionary lacks shows a wrong generic line in Spanish. Nine server errors are affected, including setup-code expiry and "Reconnect this tablet". |
| C2 | Clocker ES | "PIN not recognized… ask your manager" is translated as "pide ayuda al dueño" (the owner). |
| C3 | Clocker | The recovery and storage messages are jargon ("replayed", "request ID", "recovery storage") on a shared kiosk. |
| S1 | Sign-in ES | The desktop activation form is hard-coded English inside a Spanish shell. |
| S2 | Sign-in ES | The sign-in page shows "Owner" (`auth-copy`) beside "dueño" (`mobile-access`) on the same Spanish screen. |
| S3 | Sign-in | Two copy sets name one flow differently: "Forgot access" or "Forgot password", and "Reset password" (`Restablecer`) or "Cambiar contraseña". |
| M1 | Manager | Timecards and Time corrections give recovery steps in jargon: "Refresh a current protected snapshot", "reconcile", "source revision". |
| M2 | Manager | Assisted recovery tells the Owner the employee should "open Reset access", but no screen has that name. |
| E1 | Employee | One time-correction flow calls the same object a fix, a correction, a proposal and a submission. |
| E2 | Employee | "Correction recorded" means the request was sent, not applied. |
| E3 | Employee | Home's "See all N things to do" opens Notifications; the Owner's same-named link opens Things to do. |
| X1 | Shared | 44 routes have no page title, so the browser tab and screen readers say only "NEVORA". |
| X2 | Shared | Push titles are Title Case, and every request decision says "review your pending task". |
| X3 | Shared | The schedule success notes are not announced: they have no `role="status"`. |

---

## Shared (every role)

### Naming and navigation

| Sev | Location | Current | Proposed | Why |
|---|---|---|---|---|
| Medium | `src/lib/navigation.ts:23`, `:269`, `:98`; `src/components/owner-b/home-b.tsx:127`; `src/components/owner-b/inbox-b.tsx:51`; `docs/design/voice.md` ("tasks") | The page is "Things to do". The Manager phone tab is "To do". The Home card is "Needs you". The tab's aria name is "To do, 3 need you". voice.md still says "tasks". | Use "Things to do" for the page, the sidebar and the Home card title, and keep "3 things need you" only as the hero sentence. Make the tab "To do" (the short form of the same name) with the aria name "Things to do, 3". Update voice.md's "One word per concept" to "things to do". | The same list has four names. The guide contradicts the shipped nav. |
| Medium | `src/lib/navigation.ts:29`, `:205`, `:98`; `src/app/app/employees/page.tsx:13` | The H1, metadata and tab say "Team". The More sheet and the finder use `words.people`, which is "Employees". | Make the label "Team" everywhere. Use the vocabulary preset only for the noun inside sentences ("Add employee", "No employees match…"). | The nav comment at `navigation.ts:18` promises "each label is the page's own title". |
| Medium | `src/lib/navigation.ts:30` vs `:98`, `:266` | "Timecards" (nav, H1, metadata) vs "Time" (tab, sidebar). | Keep the "Time" tab, but have the sidebar say "Timecards" like the page, or rename the page "Time". Pick one. | Tab, sidebar and page disagree on desktop. |
| Medium | `src/lib/navigation.ts:31`; `src/app/app/reports/page.tsx:18` | The page is "Insights"; its error title is "Reports unavailable". | "Insights unavailable" | The error names a page that doesn't exist. |
| Medium | `src/lib/navigation.ts:32`; `src/app/app/payroll-export/page.tsx:19` | The page is "Time exports"; its error title is "Payroll exports unavailable". | "Time exports unavailable" | Same reason as the row above. |
| Medium | `src/lib/action-center/present.ts:32`; `src/components/owner-b/home-b.tsx:54`; `src/components/notification-inbox-signature.tsx:33`; `src/components/employee-shift-sheet.tsx:60,67,69`; `src/components/employee-b/requests-b.tsx:171`; `src/app/app/exchange/page.tsx:65,272,277` | The callout is called all of these: "Unable to work", "Can’t-work report", "Can’t work this shift", "Your Unable to work request", "your manager approves Unable to work", "an Unable to work request". | Name the feature "Can’t work" and the request a "can’t-work request". Example sentences: "It stays your shift until a swap completes or your manager approves your request." Use "Can’t work this shift" as the action. | Five forms, and a capitalised feature name dropped mid-sentence. |
| Medium | `src/components/owner-b/home-b.tsx:54`; `src/lib/action-center/present.ts:32`; `src/components/owner-b/inbox-b.tsx:66` | "Time off request" (no hyphen), "Time off", "Time off requests", and "time-off requests" (present.ts:94). | "Time-off request" or "Time-off requests" for the request; "Time off" for the place. | voice.md lists "Time-off request". |
| Medium | `src/components/owner-b/inbox-b.tsx:88`; `src/components/owner-b/home-b.tsx:109`; `src/lib/time-off-staffing/present.ts:96,106`; `src/components/manager-weekly-roster.tsx:423` | "Approved leave", "Fill a shift for approved leave", "You approved this leave". | "Approved time off", "Fill a shift for approved time off", "You approved this time off, so this shift is yours to fill." | The product says "time off" everywhere else. "Leave" is the internal module name. |
| Medium | `src/components/owner-b/home-b.tsx:54`; `src/lib/action-center/present.ts:32`; `src/components/employee-b/requests-b.tsx:115`; `src/app/app/exchange/page.tsx:93` | "Shift swap request", "Shift request", "Pick up and swap" (employee H1) and "Shift requests" (metadata on the same URL). | "Shift requests" is the place for both roles. "Pick up and swap" is the employee's subtitle. A row is a "swap request" or "cover request". | The Employee H1 and the browser tab name the same URL differently. |
| Medium | `src/components/employee-b/home-b.tsx:113,121`; `src/components/employee-b/exchange-b.tsx:164`; `src/lib/assistance/notification-events.ts:147`; `src/components/employee-b/schedule-b.tsx:53` | "Shift lead", "Designated shift lead", "Designated lead", "Lead". | Use "Shift lead" for the shift duty. Keep "Lead" only for the role. | "Designated" is data-model wording. |
| Medium | `src/app/app/exchange/page.tsx:253,254,269`; `src/app/app/requests/page.tsx:73`; `src/components/time-off-withdrawal.tsx:15,24` | Taking back your own request is called "Cancel request", "Withdraw", "Cancel report" or "Withdraw request". | "Withdraw request" everywhere. Keep "Cancel" only for closing a dialog. | One verb per action. "Cancel request" sits next to dialog "Cancel" buttons. |
| Medium | `src/components/employee-b/account-b-client.tsx:158–162`; `src/components/calendar-subscription-panel.tsx:42,62` | "Reset link", "Replace link" and "Revoke link". | "Get a new link" for rotate and "Turn off link" for revoke. Confirm titles: "Get a new calendar link?" and "Turn off your calendar link?" | Two names for rotate. "Revoke" is admin jargon on an employee screen. |
| Medium | `src/lib/finder.ts:41`; `src/app/app/settings/wave-c-route-loading.tsx:17`; `src/app/app/settings/features/page.tsx:19` | The finder and the loading skeleton say "Features & words"; the page says "Features and team terms". | "Features and team terms" in all three. | The title changes when the page finishes loading. |
| Low | `src/lib/finder.ts:75,76,78` | "Add an employee", "Send an update", "Publish the schedule". | "Add employee", "Write an update" (matches `messages-b.tsx:134`), "Build and publish" (matches the `/app/schedule/publish` metadata). | The finder should echo the button and page names. |
| Medium | `src/app/app/settings/actions.ts:40`; `src/lib/workspace/validation.ts:3,5`; `src/components/company-access/scoped-operational-views.tsx:34`; `src/lib/auth-copy.ts:22`; `src/components/mobile-access/copy.ts:216` | The page and field are "Company profile" and "Business name", but the messages say "Workspace updated.", "Enter a valid workspace name.", "Your workspace". Sign-in says "Workspace unavailable" on one page and "Workplace unavailable" on another. | "Company profile saved." / "Enter your business name (1–160 characters)." / "Your locations" (scoped Home). On sign-in: "Workplace unavailable". | Three words for the business. |

### Page titles (metadata)

| Sev | Location | Current | Proposed | Why |
|---|---|---|---|---|
| **High** | Pages with no `metadata`, as listed by the scan. Under `src/app/app/`: `my-pay`, `payroll/*` (6 pages), `payroll-export`, `settings/*` (13 pages), `schedule/{new,edit,templates,settings,coverage,copy-receipt}`, `employees/{new,[employeeId],[employeeId]/clocker-pin}`, `updates/{compose,[id]}`, `exchange/{swap,callout}`, `requests/hub`, `account-recovery` and `clocker-recovery` | The tab title falls back to the template default, "NEVORA". | Give each page its H1: "My pay", "Payroll", "Time exports", "Payroll settings", "Settings", "Company profile", "Locations", "Add location", "Branding", "Features and team terms", "Company policies", "Break types", "Positions", "Clocker tablets", "Clocker PINs", "Punch photos", "Photo review", "Add shift", "Edit shift", "Week templates", "Scheduling rules", "Coverage", "Copy week", "Add employee", "{Name}", "Clocker PIN", "Write an update", "Team update", "Swap a shift", "Can’t work this shift", "Requests", "Help someone sign in", "Clocker recovery". | Screen readers announce the title on navigation, and tabs and history become indistinguishable. `app/app/layout.tsx:68` states the rule "one title per page". |
| Medium | `src/components/mobile-access/metadata.server.ts:8` | When mobile Access is off, sign-in, recovery, reset, activation and help all return `{}`, so every tab reads "NEVORA Workforce". | Fall back to `AUTH_COPY[lang]` titles: "Sign in · NEVORA", "Forgot password · NEVORA", "New password · NEVORA", "Activate account · NEVORA". | Same problem on the public pages. |
| Low | `src/app/app/profile/page.tsx:9` vs `src/components/employee-b/account-b-client.tsx:51`; `src/app/app/profile/device-alerts/page.tsx:8` vs `src/components/native-shell/device-settings.tsx:82` | "Profile" vs H1 "Profile and settings"; "Alerts on this device" vs native H1 "Alerts". | Match each H1: "Profile and settings" and "Alerts on this device". | The title and the heading should agree. |
| Low | `src/app/terms/page.tsx:8`; `src/app/privacy/page.tsx:8` | "Terms of Use · NEVORA", "Privacy Policy · NEVORA" | Keep these. They are document names, so the Title Case is correct. | No change needed. |

### Errors and failure messages

| Sev | Location | Current | Proposed | Why |
|---|---|---|---|---|
| Medium | `src/app/app/error.tsx:15–22`; `src/components/signature/system-state.tsx:36–44`; `src/components/public-error-screen.tsx:18–25`; `src/components/wave-a/route-error.tsx:12–17` | One failure has four headings: "This page could not be loaded", "We couldn’t open this page", "Couldn’t load this page", "This page couldn’t load." The body, "Your current information is unavailable. Try loading the page again before taking an action.", is vague and robotic. The public page adds the eyebrow "Something went wrong". | Heading: "This page didn’t load". Body: "Nothing was changed. Check your connection, then try again." Buttons: "Try again" and "Go to Home" (or "Go to sign in"). Remove "Something went wrong". | One message, one next step, no "Something went wrong" (better-writing detection table). |
| Low | `src/app/app/error.tsx:25`; `src/components/signature/system-state.tsx:43`; `src/components/company-access/operational-unavailable.tsx:12`; `src/app/app/not-found.tsx:20` | "Back to Home", "Go to Home", "Return to Home". | "Go to Home" | One label per link. |
| Medium | `src/app/app/not-found.tsx:18`; `src/app/not-found.tsx:16`; `src/components/signature/system-state.tsx:24` | "This page doesn’t exist", "Page not found", "This page isn’t here". | "Page not found" for the title, metadata and public page. Body: "The link may be old, or the page may have moved." | Same 404, three headings. |
| Medium | `src/lib/http/nevora-failure.ts:43` | "NEVORA can’t confirm this connection" / "…Signing in again won’t fix this; ask your administrator to check NEVORA’s address." | "This connection isn’t secure" / "We cleared this page to protect your information. Ask your Owner to check the NEVORA web address you’re using." | The app has no "administrator" role, and "address" is ambiguous. |
| Medium | `src/lib/http/nevora-failure.ts:44` | "That request didn’t go through" / "Nothing was sent as a different request. Reload the page and try once more." | "That didn’t go through" / "Nothing was saved. Reload the page and try again." | The current second clause is robotic. |
| Low | `src/lib/http/nevora-failure.ts:41` | "Ask an Owner if you still need it." | "Ask your manager if you still need it." | Employees reach a manager first. Owner is used for Manager and Owner accounts elsewhere. |

### Toasts and confirmations

| Sev | Location | Current | Proposed | Why |
|---|---|---|---|---|
| Medium | `src/components/toaster.tsx:19–20` | "Time off approved. The employee will be told." | "Time off approved. {Name} will see it in Requests." | Truthful rule: push may be off, and the request page is the guaranteed channel. Name the person. |
| Medium | `src/components/payroll/use-payroll.ts:71,110` | Toast "Action recorded"; inline "Action recorded. Review the current status below." | Name the action: "Payroll approved", "Statements published", "Payment file ready". Fallback: "Saved. Check the status below." | "Action recorded" doesn't say what happened. |
| Low | `src/components/toaster.tsx:85,54` | The toast region is `aria-label="Notifications"`; the close button is "Dismiss notification". | Region "Messages"; button "Dismiss message". | Collides with the Notifications page and the bell. |
| Low | `src/components/brand-editor.tsx:81` | "Brand saved" | "Branding saved" | Matches the page title. |
| **High** | `src/app/app/schedule/page.tsx:426–430,471–473`; `src/components/corp/corp.tsx:220` | Success notes ("Shift deleted.", "Shift updated.", "Changes published…", "Copied 3 shifts…") render through `CorpNote`, which has no `role="status"`. | Wrap each note in `role="status"`, or give CorpNote an `announce` prop. | After a redirect, screen-reader users get no confirmation. |
| Medium | `src/app/app/schedule/page.tsx:426` | "Changes published. Each person with a change has been notified." | "Changes published. Each person with a change can see it in their schedule." | Notification delivery isn't confirmed (Truthful rule). |
| Low | `src/app/app/schedule/page.tsx:430,477–478`; `src/app/app/schedule/templates/page.tsx:64–65` | `shift${n === "1" ? "" : "s"}` | Use one message per plural form, or `Intl.PluralRules`. | String joins will block B5 Spanish. |

### Push notifications

| Sev | Location | Current | Proposed | Why |
|---|---|---|---|---|
| **High** | `src/lib/notifications/payloads.ts:24` | Every request decision (approved, denied, swap, cover) sends "NEVORA Request Update" / "Open NEVORA to review your pending task." | "Your request has an update" / "Open NEVORA to see it." | A decided request is not pending, and employees have no "tasks". The current text misleads. |
| Medium | `src/lib/notifications/payloads.ts:18,20,22` | "Your NEVORA Schedule Is Ready", "Your NEVORA Schedule Changed", "Coverage Needs Attention" | "Your schedule is ready", "Your schedule changed", "A shift needs cover" | Sentence case, and no alarm wording. |
| Low | `src/lib/native-push/providers/apns.ts:58`; `src/lib/native-push/providers/fcm.ts:47` | "NEVORA" / "Open NEVORA." | "You have an update" / "Open NEVORA to see it." | The current text says nothing. It stays privacy-safe either way. |

### Dates, times and durations

| Sev | Location | Current | Proposed | Why |
|---|---|---|---|---|
| Medium | `src/components/clocker-punch-panel.tsx:42` ("6h 26m"); `src/components/correction-time-ticket.tsx:37` ("1h 05m"); `src/components/manager-attendance-review.tsx:57` ("2h 5m"); `src/components/manager-dashboard.tsx:150` ("32h scheduled · 40h target"); `src/components/owner-b/home-b.tsx:50` ("32 h"); `src/components/corp/corp-format.ts:37`, `src/lib/time-off-staffing/present.ts:88` ("1 h 30 min") | Six duration formats. | "1 h 30 min" for prose and cards (DESIGN.MD:1351). Bare "56h" only in dense tables (voice.md). Route every duration through `minutesText` or `durationText`. | The same duration reads differently on every screen. |
| Medium | `src/components/owner-b/home-b.tsx:52`; `src/components/timecards.tsx:38`; `src/components/payroll/my-pay.tsx:30`; `src/app/app/my-time/page.tsx:35`; `src/components/manager-today.tsx:70`; `src/components/company-access/scoped-manual-shift-form.tsx:37`; `src/lib/assistance/manager-actions.ts:7` | Ranges are written "Oct 5–7" and "8:00 AM–4:00 PM" (no spaces). Elsewhere they are "Sep 28 – Oct 4" and "9:00 AM – 5:00 PM" (spaced, `present.ts:84`). | Spaced en dash with a non-breaking space before it, through `formatDateRange` and `rangeText`. | voice.md uses the spaced form. `spacedRanges` exists for this. |
| Low | `src/components/manager-weekly-roster.tsx:65,86,214` | aria "8:00 AM to 4:00 PM" | Keep it. "to" is right for speech. | No change needed. |
| Low | `src/components/owner-advisor/notebook-panel.tsx:9`; `src/lib/assistance/notification-events.ts:147` | ISO dates and 24-hour times ("2026-11-12 · 07:00–15:00") in focus labels and a notification body | `formatDisplayDate` and `formatTime` | voice.md bans raw ISO dates. |

### Accessibility of text

| Sev | Location | Current | Proposed | Why |
|---|---|---|---|---|
| Low | `src/components/notification-bell.tsx:45` | aria and `title` "Notifications, 3 unread in your recent inbox" | "Notifications, 3 unread", with no `title` duplicate | Brings back the retired word "inbox", and the long tooltip repeats the aria name. |
| Low | `src/components/app-shell.tsx:515` | Tab aria "To do, 3 need you" | "Things to do, 3" | Matches the page name. |
| Low | `src/app/login/page.tsx:63` | `nav aria-label={t.signIn}` ("Sign in") | "Account help" / "Ayuda con la cuenta" | Duplicates the submit button's name. |
| Low | `src/components/employee-mobile/exchange.tsx:19–20` | aria-label "Unconfirmed response" | "Request status" | Jargon in an accessible name. |

---

## Owner

| Sev | Location | Current | Proposed | Why |
|---|---|---|---|---|
| Medium | `src/components/owner-b/home-b.tsx:78` | Stat "Late" with aria "Late: 3. Missed clock-ins"; the row is titled "3 missed clock-ins" (`:120`). | Stat "Missed clock-ins" or "No clock-in". Pick one name and use it for the stat, the row and Things to do `#todo-missed`. | One count, two names. "Late" also means something else on Team (`team-b.tsx:19`, minutes late). |
| Medium | `src/components/owner-b/home-b.tsx:93` | "Things to do isn’t available right now." | "Things to do didn’t load. Pull to refresh or try again." Add a Try again button, as Inbox has. | No next step. |
| Low | `src/components/owner-b/home-b.tsx:126` | "3 items to review" / "Time corrections and timecards" | "3 time corrections and timecards to review" | "items" is vague. |
| Medium | `src/components/owner-b/inbox-b.tsx:54` | Filter `All ${total ?? 0}` | `All` with no number when the total is unknown | Unknown must not read as zero. The rest of Home uses "—". |
| Low | `src/components/owner-b/inbox-b.tsx:66` | "Time off requests" / "Every request, waiting and decided" | "Time-off requests" / "All requests, waiting and decided" | Hyphenation. |
| Medium | `src/components/owner-b/team-b.tsx:65` | Filtered empty state: "No one right now." | Make it filter-aware: "No one is working right now." / "No one is late." / "Everyone is working today." | A bare "No one" doesn't say what is empty. |
| Medium | `src/lib/time-off-staffing/present.ts:105–107` | "No one is assigned. An Owner needs to take this." / "You approved this leave, so this is yours to fix." / "Assigned to the manager who approved the leave." | "No one is assigned yet. An Owner can take it." / "You approved this time off, so this shift is yours to fill." / "Assigned to the manager who approved the time off." | Uses "leave", and "to fix" implies blame. |
| Medium | `src/components/payroll/payroll-settings.tsx:175,181,185–187,190`; `src/components/payroll/native-review.tsx:33,35`; `src/components/payroll/payroll-runs.tsx:350–351,366` | "Native statements publish automatically after generation and verification.", "neutral payroll import", "Output profile", "Neutral instructions · compatibility unverified", "Desired bank channel", "authorized payroll approver", "owner-authorized provisional policy… does not establish statutory compliance". | For example: "Pay statements are published to employees after you approve payroll." / "Payment file format" / "Not yet tested with your bank" / "Bank and file type". The rest needs a separate pass. | Audit language in the main text. DESIGN.MD:1320 marks payroll copy as locked, so this needs Jose's sign-off before anyone changes it. |
| Medium | `src/components/company-policy-editor.tsx:83,133–139,159,174,176,353` | "Observation cutoff", "Retained request saved as revision 4. Current selected revision 5.", "Retry retained save", "Saved evidence for this scope. An unavailable revision is retained and cannot be used as a trusted policy." | "Check-in window ends", "Your earlier save went through as version 4. You’re now viewing version 5.", "Try saving again", "This saved version can’t be used. Save a corrected version to replace it." | "Revision", "retained" and "scope" are audit words. Keep the version number visible, but say it plainly. |
| Medium | `src/components/company-access/manager-operational-scope-panel.tsx:13,30–35,45` | "Choose the operations this Manager can oversee. Scheduling eligibility and payroll permissions are separate.", "Receipt transport unavailable.", "Revoke this Manager’s operational access?" | "Choose where this manager can manage the schedule and team. Payroll access is set separately.", "We couldn’t confirm the change. Reload to check.", "Remove {Name}’s manager access? They keep their employee account and any payroll access." Button: "Remove manager access". | "Receipt transport" and "operational" are internal. The confirmation should name the person. |
| Medium | `src/components/company-access/employee-invitation-panel.tsx:76,81,85` | "Ask another authorized Owner…", button "Revoke invitation" | "Ask another Owner…", button "Cancel invitation" with the body "The link in their email stops working." | Jargon, and the consequence isn't stated. |
| Low | `src/app/app/settings/locations/error.tsx:12` | "Your workplaces" | "Locations" (from `words.locations`) | Matches the page. |
| Low | `src/components/manager-dashboard.tsx:145` | Link "Manage targets" opens Scheduling rules | "Set hour targets" | The link should name what you'll do there. |
| Low | `src/app/app/page.tsx:93` | Visible button "AI manager" above Home | Keep it, but use one name: "AI manager" in the nav, the H1 and here. | Already consistent. Checked. |

## Manager (Owner and Manager management screens)

| Sev | Location | Current | Proposed | Why |
|---|---|---|---|---|
| **High** | `src/components/timecards.tsx:181` | "Timecards expired. Refresh a current protected snapshot." | "These timecards are out of date. Refresh to see the latest." | The recovery step is jargon. The person can't tell what to press. |
| **High** | `src/components/manager-time-corrections.tsx:81` | "The correction queue is unconfirmed. Check a current protected snapshot before reviewing requests." / "Sign in with a currently authorized management account." | "Corrections didn’t load. Refresh to try again." / "Your access changed. Sign in again to review corrections." | Same problem. |
| **High** | `src/components/timecards.tsx:84,86`; `:255` | "Approve the current source revision before finalizing." / "The result could not be confirmed. Retry the same action to reconcile it." | "Approve the latest version of this timecard before finalizing." / "We couldn’t confirm that. Try again; it won’t be done twice." | "Source revision" and "reconcile" hide the next step. The `time-off-withdrawal.tsx:47` pattern already reads well. |
| Medium | `src/components/manager-time-corrections.tsx:18,37–40,93,95` | "The server outcome could not be confirmed. Retry the same decision safely.", "The recorded source changed.", "overlaps another effective entry", "correction interval is not valid", "The source or approved baseline changed since this request. The proposed time is not the current effective time.", "Approval creates an auditable effective adjustment." | "We couldn’t confirm your decision. Try again; it won’t be applied twice.", "The recorded times changed. Refresh before deciding.", "These times overlap another entry.", "The end time must be after the start time.", "The timecard changed after this request. Check the current times before deciding.", "Approving changes the timecard. The original clock times stay in the history." | U5 plain-language rule. |
| Medium | `src/components/manager-time-corrections.tsx:36`; `src/components/timecards.tsx:84,429` | "Another manager or owner must review your request." / "Your timecard requires a different manager." | "Another manager or an Owner reviews your own request." / "Another manager approves your own timecard." | "Owner" is lowercase here and capitalised as a role everywhere else, and the reason isn't given. |
| Medium | `src/components/timecards.tsx:487` | Button `Approve ${n} ready` | `Approve ${n} ready timecards` | The button has no object. |
| Medium | `src/components/timecards.tsx:270,284` | "The source changed or expired. Refresh and review again." / "Each card has its own result." | "Some timecards changed. Refresh and check them again." / "Each timecard shows its own result below." | Jargon. |
| Medium | `src/components/manager-attendance-review.tsx:66–68` | "Recorded punch has no saved schedule match.", "Saved schedule context could not resolve one shift.", "Recorded time history is internally inconsistent." | "This clock-in doesn’t match a scheduled shift.", "We couldn’t tell which shift this clock-in belongs to.", "These clock times don’t add up. Check the timecard." | Robotic wording. |
| Medium | `src/app/app/requests/page.tsx:53` | One error for two causes: "Your request wasn’t sent. Check that the end date is on or after the start date. A partial day needs one date and an end time after the start time." | Split it by cause and put it next to the field: "End date must be on or after the start date." / "For part of a day, choose an end time after the start time." | Errors belong beside the field that failed. |
| Medium | `src/app/app/requests/page.tsx:54` | "The request was reviewed." | "Time off approved." or "Time off declined." | Say what happened. |
| Medium | `src/app/app/exchange/page.tsx:266` | "Historical approval does not release the current assignment. Ask management to review." | "This was approved earlier, but you’re still on this shift. Ask your manager." | Jargon, and "management" is vague. |
| Medium | `src/components/leave-staffing/conflict-check.tsx:44` | "If you approve, the time off is approved and these shifts stay published. Each becomes a shift to fill on the schedule, assigned to you." | "If you approve, these shifts stay on the schedule and become shifts for you to fill." | Shorter; the consequence is kept. |
| Low | `src/components/manager-clock-monitor.tsx:46` | "Updates every 30s while this page is active." | "Updates every 30 seconds while this page is open." | No unit abbreviations in sentences. |
| Medium | `src/components/company-access/scoped-operational-views.tsx:34,37,41`; `src/components/company-access/operational-unavailable.tsx:7` | "Your workspace" / "Operational information for your current management access." / "Ask an Owner to assign the company or locations you can manage. Your other authorized tools remain in navigation." | "Home" / "Your locations" / "Ask an Owner to give you locations to manage. Everything else is still in the menu." | A location-scoped manager's Home has the wrong H1, and the text is jargon. |
| Medium | `src/components/reports.tsx:200` vs `:218` | "Hours by person" and "Hours by employee" | "Hours by employee" for both | The same report on one page has two names. |
| Medium | `src/components/payroll-export.tsx:56,82,110,117,192` | "Export data expired. Refresh a current protected snapshot.", "Retry this same generation to retrieve its receipt.", "Download canonical time record", "JSON · exact durations and sources" | "This export is out of date. Refresh to start again.", "We couldn’t confirm the export. Try again; it won’t create a second file.", "Download time record (JSON)", "Exact hours for each timecard". | DESIGN.MD:870 left the export's population wording unchanged on purpose. These lines are outside that and should be fixed. |
| Low | `src/components/manager-availability.tsx:55` | "That week isn’t valid, so this is the upcoming week." | "Showing next week instead." | Shorter. |

## Employee

| Sev | Location | Current | Proposed | Why |
|---|---|---|---|---|
| **High** | `src/components/employee-b/time-b.tsx:63–65,97,103–104,135,201,243,251–253,258–260`; `src/components/employee-mobile/hours-corrections.tsx:32,47` | One flow uses these names: "Fix a missed punch", "Request a correction", "Your corrections", "Fixes you asked your manager for", "Correction requests", "Earlier fix", "Start another proposal", "Checking your proposal", "Check your original submission", "Return to my submission", "Sending your original proposal…". | Noun: "correction request". Verb: "Fix a punch". Use: "Fix a missed punch", "Your correction requests", "Request another correction", "Checking your request…", "Check your earlier request". | The same object has four names inside one screen. The skill marks this as a terminology break; it's High because the "check earlier submission" recovery depends on knowing which thing to check. |
| **High** | `src/components/employee-b/time-b.tsx:251` | "Correction recorded" | "Correction request sent" | "Recorded" implies the change was applied. It is only sent for review. |
| **High** | `src/components/employee-b/home-b.tsx:199` | "See all" (aria "See all N things to do") opens `/app/notifications`. | Make it "See all notifications", or point it at a things-to-do view. | Same-named links go to different places (Owner: `/app/inbox`). |
| Medium | `src/components/employee-b/time-b.tsx:259` | "The result couldn’t be confirmed. Check the original submission before starting another proposal, even if this time is no longer available for a new correction." | "We couldn’t confirm your request was sent. Check it before you send another." | Too long for a phone, and full of jargon. |
| Medium | `src/components/employee-b/time-b.tsx:80`; `src/components/owner-b/team-b.tsx:40`; `src/components/employee-b/home-b.tsx:69` | "On the clock", "Working", "On shift now", "Clocked in" for the same state | "Clocked in" (the Clocker word, sentence case outside the kiosk) | One status word. |
| Medium | `src/components/employee-b/timeoff-b.tsx:114,124`; `src/components/employee-b/availability-b.tsx:26` | "Checking your current planning…", "Your planning couldn’t be checked.", "Planning access" | "Loading your time off…", "Your time off didn’t load. Try again.", "Time off access" | "Planning" is an internal module name. |
| Medium | `src/components/employee-b/exchange-b.tsx:93,90`; `src/components/employee-mobile/requests.tsx:175,178` | "Eligibility unavailable", "Some shifts still need an eligibility check." | "We couldn’t check these shifts", "We’re still checking whether you can take some shifts. Refresh to try again." | Jargon. |
| Medium | `src/components/employee-b/messages-b.tsx:49` | "Your current access or this source changed. Refresh before continuing." / "Submission recorded. Refresh to check its current status." | "This update changed. Refresh to see the latest." / "Sent. Refresh to see its status." | "source" and "recorded" are audit words. |
| Medium | `src/components/employee-b/messages-b.tsx:98,140` vs `src/components/notification-inbox-signature.tsx:19` | The filter is "Action needed" in one notifications screen and "To do" in another. | "Action needed" | The same filter has two names. "To do" collides with the manager tab. |
| Medium | `src/components/employee-b/pay-b.tsx:78,80,144` vs `:90,104,116`; `src/lib/payroll/native/paystub-document.ts:225` | "Paycheck", "Last paycheck", "Pay statement (PDF)", "View statement", "Your published pay statements". The PDF title is "Pay statement". | "Pay statement" for the document; "Last pay statement" on the card; detail title "Pay statement". Keep "Pay" for the tab. | The same document has two names. |
| Medium | `src/components/employee-b/account-b-client.tsx:67` | Language row "For the sign-in pages", with English and Español toggles. | "Sign-in pages only. The rest of NEVORA is in English for now." / "Solo para las páginas de inicio de sesión. El resto de NEVORA está en inglés por ahora." | Picking Español changes almost nothing. Say so. |
| Medium | `src/app/app/page.tsx:81` with `src/components/mobile-access/onboarding-guide.tsx:17–18` | The onboarding guide card renders in the sign-in language, Spanish, inside the English Home. | Render the guide in English until B5 ships, or use one language per screen. | Mixed EN and ES on one screen. |
| Medium | `src/components/employee-b/home-b.tsx:103` | "Your message goes to today’s published team. Reading it is optional for them." | "Everyone on today’s schedule gets this message." | "published team" is jargon. The second sentence is unclear. |
| Low | `src/components/employee-b/home-b.tsx:101–102,190` | "Message today’s team", "Write", "Write to today’s team", "Write an update" | Button "Write"; aria and title "Write to today’s team" | One verb. |
| Low | `src/components/employee-b/time-b.tsx:268` | "Open Past timecards" | "Open past timecards" | Sentence case. |
| Low | `src/components/employee-b/time-b.tsx:82`; `src/components/employee-b/home-b.tsx:123` | "Breaks and clock out happen there too" | "Take breaks and clock out there too" | "Clock out" is a verb; the noun form would be "clock-out". |
| Low | `src/components/correction-time-ticket.tsx:37` | "Tap a time to change it" | "Select a time to change it" | The ticket also renders on desktop. |
| Low | `src/components/employee-b/timeoff-b.tsx:91`; `src/components/employee-b/exchange-b.tsx:84,134` | "Time off is turned off for your company." / "Shift pickup is turned off…" | "Your workplace doesn’t use time off in NEVORA." / "…doesn’t use shift pickup in NEVORA." | "turned off" twice in one line is clumsy. Employees say "workplace". |
| Low | `src/components/employee-b/exchange-b.tsx:139`; `src/components/employee-b/requests-b.tsx:116,171` | "Start a swap or cover offer", "Offer for cover" | "Swap or give away a shift", "Offer for cover" | Use one phrasing. |
| Low | `src/components/employee-b/account-b-client.tsx:256` | "We aim to delete your profile, sign-in details, notification subscriptions, calendar links and the content you contributed." | "We delete your profile, sign-in details, alert settings, calendar links and anything you posted." | "We aim to" hedges. Use the same term ("alerts") as the screen above. |
| Low | `src/components/employee-b/account-b-client.tsx:189` | "Check again asks NEVORA for the latest status. Retry turn off sends your earlier turn-off request again." | "Check again gets the latest status. Try again resends your earlier request to turn off alerts." | "Retry turn off" is not a natural button name. |

## Lead

Leads use the Employee screens (Direction B, Nov 8), so every Employee finding applies. Lead-only copy:

| Sev | Location | Current | Proposed | Why |
|---|---|---|---|---|
| Medium | `src/components/employee-b/home-b.tsx:121` and the `exchange-b.tsx:164` row above | "You’re the shift lead today", "Designated shift lead", "Lead" (chip) | "You’re shift lead today"; chip "Shift lead" | One name for the duty. |
| Medium | `src/components/employee-b/home-b.tsx:100–103`; `src/components/employee-b/messages-b.tsx:248` | Card "Today’s team" / "Everyone on shift today"; compose title "Write an update" with the subtitle "A message for today’s team" | Card "Today’s team"; button "Write to today’s team"; compose title "Message today’s team" | A Lead's message is called a message in one place and an update in another. |
| Low | `src/components/app-shell.tsx:404` | Sidebar role line "Lead" | "Shift lead" | Matches Home. |

## Clocker (kiosk)

The Title Case status and action words (Clock In, Clock Out, Start Break, End Break, Clocked In, On Break, Off Clock, Try Again) are deliberate and stay.

| Sev | Location | Current | Proposed | Why |
|---|---|---|---|---|
| **High** | `src/components/clocker-copy.ts:231`; server errors in `src/app/api/clocker/**` and `src/lib/clocker/**` | In Spanish, a missing key falls back to "No pudimos confirmar esta información. Pide ayuda al dueño." These server errors have no Spanish entry: "Reconnect this tablet before recording time.", "The clock result could not be confirmed.", "Time punches are not enabled in this environment.", "Allow cookies, then start tablet setup again.", "Check the setup code and try again.", "Choose a valid Clocker location.", "Open Clocker directly on this site.", "This setup code is expired, already used, or for another location. Ask the Owner for a new code.", "We could not confirm tablet setup. Check the connection, then choose Check Setup. Do not enter a new code yet." | Add the Spanish lines. For example: "Vuelve a registrar esta tableta antes de marcar." / "Este código venció, ya se usó o es de otra ubicación. Pide al dueño un código nuevo." / "No pudimos confirmar la configuración. Revisa la conexión y elige Revisar configuración. No ingreses un código nuevo todavía." Make the fallback show the English text with `lang="en"` instead of an unrelated sentence. Add a test that every server `error:` string has a Spanish entry. | Spanish users get a wrong instruction and lose the real next step. |
| **High** | `src/components/clocker-copy.ts:113,210` | EN "…Try again or ask your manager." → ES "…pide ayuda al dueño." | "…Inténtalo de nuevo o pide ayuda a tu gerente." | The translation sends the employee to a different person. |
| **High** | `src/components/clocker-copy.ts:61–62,70,75–76,159,162,185,189,195` (the same strings appear in `clocker-punch-panel.tsx:149,156`) | "No saved confirmation was found yet. Retry the same action only; it keeps the original request ID.", "No action was replayed.", "Recovery storage is unavailable…", "Unreadable recovery record — keep it saved for assistance", "photo exception", "Photos are not queued in browser storage." | "We haven’t confirmed your last punch yet. Tap Retry Same Action; it won’t punch twice.", "Nothing was punched again.", "This tablet can’t save punches right now. Ask your manager to check the tablet.", "One saved punch can’t be read. Ask your manager to check it.", "No photo saved", (drop the last sentence) | Kiosk users need one clear step. Audit words hide it. |
| Medium | `src/components/clocker-copy.ts:11,17,23,26,31,39,50,…` | Spanish "acción de tiempo" (for "clock action"), "Reintentar la misma acción", "Verifica tu acción de tiempo" | "marcación" or "ponche" (Puerto Rico). For example: "Verifica tu marcación", "Reintentar la misma marcación". | "Acción de tiempo" is a literal translation and unnatural. |
| Medium | `src/components/clocker-copy.ts:6,25` | "¿Listo para tu foto?", "Toma la foto cuando estés listo." | "¿Todo listo para la foto?", "Toma la foto cuando quieras." | Masculine-only wording on a shared kiosk. |
| Medium | `src/components/clocker-punch-panel.tsx:175–178,216,251–252`; `src/components/clocker-setup.tsx:112–114`; `src/components/clocker-pin-gate.tsx:116` | "Recording Your Action…", "Check Your Last Action", "Previous Action Needs Review", "Browser Storage Needed", "Clock State Unavailable", "Refresh Clock State", "Check Action Status", "Retry Same Action", "Check Setup", "Check Connection" | Sentence case: "Recording your punch…", "Check your last punch", "Refresh status", "Check setup", "Check connection" | DESIGN.MD:751 lists only six exempt words. Update the scripts that press these labels in the same change. |
| Medium | `src/components/clocker-punch-panel.tsx:235` vs `:174` | "Confirm Clock Out" beside "Cancel clock-out" | "Confirm Clock Out" beside "Keep Working" (already in the dictionary, `clocker-copy.ts:182`) | Mixed case in one dialog. Saying what staying means is clearer. |
| Medium | `src/components/clocker-punch-panel.tsx:205,223,226`; `src/components/clocker-copy.ts:177,205` | "Reference: 30 min", "Reference times don’t end a break on their own." | "Suggested: 30 min", "Your break doesn’t end on its own. Tap End Break when you’re back." | "Reference" reads as an ID. |
| Medium | `src/components/clocker-punch-panel.tsx:240`; `src/components/clocker-copy.ts:78,183–184` | "Saved at" + time + ". This screen clears in eight seconds." (fragments joined) | One message with a placeholder: "Saved {time}. This screen clears in 8 seconds." / "Guardado {time}. Esta pantalla se borra en 8 segundos." | String joins break word order. The current code already patches Spanish "p. m." periods. |
| Low | `src/components/clocker-setup.tsx:89`; `src/components/clocker-copy.ts:124` | `{deviceName}` + " is registered for this location." | "{device} is registered for this location." as one string | Same reason. |
| Medium | `src/components/clocker-copy.ts:92,123,217` | EN "Connect tablet", "Tablet connected", "Tablet registered" | "Register tablet" / "Tablet registered" (Spanish already uses "registrar") | Two verbs in English. |
| Low | `src/components/clocker-copy.ts:69,186` | "Clocker recovery" vs "Clocker Recovery" | "Clocker recovery" (the nav label) | Case. |
| Low | `src/components/clocker-copy.ts:103,126` | "Your PIN is separate from your portal password.", "Employee PINs and real time punches are being connected." | "Your PIN is not your NEVORA password.", "Punching in isn’t turned on yet. Don’t use this tablet to record time." | Drop "portal" and the developer wording. |
| Low | `src/components/clocker-copy.ts:120,130` | ES "ajustes del dueño", "Ajustes → Tabletas Clocker" | "Settings → Clocker tablets" (the Owner's screens are in English) | The menu path must match what the Owner sees. |
| Low | `src/components/clocker-copy.ts:132–133` | "Checking setup...", "Checking this tablet..." (three dots) | "…" | Use the ellipsis character. |
| Low | `src/components/clocker-language.tsx:16` vs `src/components/auth-premium/lang-switch.tsx:354` vs `src/components/mobile-access/language-switch.tsx:10` | aria "Switch language to Spanish" / "Language: Español" / "Cambiar a español" | Use one pattern: "Español: cambiar a español" / "English: switch to English", with the visible text the language name in its own language. | Three patterns for one control. |

## Sign-in and public pages

| Sev | Location | Current | Proposed | Why |
|---|---|---|---|---|
| **High** | `src/app/activate/activation-invitation.tsx:112–136`; `src/app/activate/activation-passwords.tsx:31,37,44,46–47`; `src/app/activate/activation-submit.tsx:8` | The desktop (non-mobile) activation view is hard-coded English: "Account activated", "Keep your Employee ID…", "Invitation verified", "Create password", "Activate account", "No invitation? Ask your Owner." It renders inside the Spanish shell (the band, Español toggle and legal footer are in Spanish). | Read every string from `AUTH_COPY[lang]` or `MOBILE_ACCESS_COPY[lang]`, which already have the keys: `activatedTitle`, `inviteSub`, `createPassword`, `activateAccount`, `quiet.noInvitation`, `mismatch`, `ruleMatched`. | A Spanish speaker activating on a computer gets English mid-flow. |
| **High** | `src/lib/auth-copy.ts:153,175,199,200,211,223` vs `src/components/mobile-access/copy.ts:229–380`, `src/lib/auth/account-email-copy.ts:136` | Spanish says "con el Owner" / "Pídesela al Owner" in `auth-copy`, and "el dueño" in mobile-access, the emails and the Clocker. The login page renders both (`login/page.tsx:41` uses `t`, `:68` uses `mt`). | "el dueño" everywhere, or "la persona dueña del negocio" where gender matters. Put it in the glossary. | An English word inside Spanish copy, inconsistent on one screen. |
| **High** | `src/lib/auth-copy.ts:31,56` vs `src/components/mobile-access/copy.ts:62,64`; `src/lib/auth-copy.ts:79,189` vs `src/components/mobile-access/copy.ts:181,397` | The link says "Forgot password?", but the page title is "Forgot access" on desktop and "Forgot password." on mobile. The reset button is "Reset password" / "Restablecer contraseña" on desktop and "Reset password" / "Cambiar contraseña" on mobile. | Title "Forgot password" (no period) / "¿Olvidaste tu contraseña?"; button "Reset password" / "Restablecer contraseña" in both sets. | The link and the page it opens should share a name. Two Spanish verbs for one button. |
| **High** | `src/components/assisted-recovery.tsx:65` (Owner and Manager side) | "Share it privately. They open **Reset access**, enter the code and choose a new password." | "Share it privately. On the sign-in page they choose **Forgot password?**, then **I have a recovery code**, enter it and choose a new password." | No screen is labelled "Reset access". The steps name links that don't exist. |
| Medium | `src/components/mobile-access/copy.ts:6,64,114,183,195,…` | Headings end in periods: "Set up your account.", "Sign in.", "Forgot password.", "New password.", "Password updated." | Drop the periods. `metadata.server.ts:10` already strips them for titles. | voice.md says no terminal periods on headings. The file is marked "frozen v1", so Jose must approve this change. |
| Medium | `src/components/mobile-access/copy.ts:6` vs `:222`; `:114` vs `:330` | EN "Set up your account." vs ES "Activar cuenta."; EN "Set password." vs ES "Crear contraseña." | ES "Configura tu cuenta" and "Crea tu contraseña", matching the English meaning. | The translations don't match. |
| Medium | `src/components/mobile-access/copy.ts:213` vs `:429` | EN "Brighter work ahead." vs ES "Tu día empieza aquí." | Keep the exact slogan in both, or get Jose's approved Spanish slogan into `brand.ts`. | DESIGN.MD:498 requires the exact slogan from `src/lib/brand.ts`. The Spanish is a different line. |
| Medium | `src/components/mobile-access/copy.ts:304,355,377,421,361` | "Soy un empleado nuevo", "Soy el único dueño", "estás autorizado" | "Soy nuevo en el trabajo" (or "Es mi primera vez"), "No hay otro dueño", "tienes permiso" | Gender agreement. |
| Medium | `src/components/mobile-access/copy.ts:432`; `src/lib/auth-copy.ts:132` | ES "Trabajo no disponible", "Espacio de trabajo no disponible" | "No pudimos cargar tu lugar de trabajo" | "Trabajo no disponible" reads as "no work available". |
| Medium | `src/components/mobile-access/copy.ts:128,142,ownerBoundary 128` | "Contacting support does not verify ownership or restore access. Authority must be verified before any account change." / "Please advise on the next steps for verifying my identity and access authority." | "Emailing support doesn’t restore your access by itself. We check who you are before changing anything." / "What do you need from me to confirm I’m the Owner?" | "Authority" jargon, and "Please advise" is stiff. |
| Medium | `src/app/api/auth/recovery/route.ts:10`; `src/lib/auth-copy.ts:232` | "If these details match an active account and its registered recovery channel is available, recovery instructions will be sent. If you cannot use that channel, contact your manager or Owner for assisted recovery." | "If the details match an active account, we’ll email recovery steps. Can’t use that email? Ask your manager or Owner for help." Update the `MESSAGES_ES` key in the same change. | "Channel" is jargon and the sentence is passive. The Truthful rule still holds with this wording. |
| Medium | `src/components/account-recovery.tsx:43`; `src/lib/auth-copy.ts:238` | "Password reset. All portal sessions have ended. Sign in with your new password." | "Password reset. You’re signed out on every device. Sign in with your new password." | "Portal sessions" is jargon. The mobile copy (`copy.ts:180`) already reads well. |
| Medium | `src/lib/auth/account-email-copy.ts:141` | Recovery email: "If you cannot use your registered recovery channel, ask a manager for assisted recovery." | "Can’t use this email? Ask your manager for help. Manager and Owner accounts need another Owner." | A manager can't recover a Manager or Owner account (`mobile-access/copy.ts:95`). The current text sends them to the wrong person. |
| Low | `src/lib/auth/account-email-copy.ts:140` | Subject "NEVORA access recovery" | "Reset your NEVORA password" / "Restablece tu contraseña de NEVORA" | Names the action. |
| Low | `src/lib/auth-copy.ts:61,81` | "Requesting recovery. Please wait." | "Requesting recovery…" | Cut "Please". |
| Low | `src/lib/auth-copy.ts:52` | "This account is being deleted, so it can’t be used to sign in. Email support@… with your deletion reference if you have questions." | "This account is being deleted. Questions? Email support@… with your deletion reference." | Shorter on phones. |
| Low | `src/lib/auth-copy.ts:24,101,103,104` | Placeholder "Enter your employee ID"; "Employee ID" capitalised mid-sentence | Placeholder "e.g. 10482" (already in `quiet.idPlaceholder`); "employee ID" in sentences | Placeholders should show an example. Sentence case. |
| Low | `src/lib/auth-copy.ts:217`; `src/components/brand-legal.tsx:7` | ES "Ayuda" for the Support link, beside the footer link "¿Necesitas ayuda?" (`auth-shell.tsx:323`), which goes to `/access-help` | ES "Soporte" for `/support` | Two "help" links go to different places. |
| Medium | `src/components/brand-legal.tsx:7,11` | ES links "Privacidad", "Términos" open English-only policies. | Add "(en inglés)" to the links, or link Spanish versions once A18 ships. | Mixed languages without warning. |
| Low | `src/lib/auth-copy.ts:146,155` | ES "Iniciar sesión con una llave de acceso" (39 characters vs 23 in English) on a pill button | "Usar llave de acceso" | Likely to wrap at 320px. Check in a browser. |
| Low | `src/lib/passkeys/copy.ts:117,120` | Confirm buttons "Remove" / "Keep"; toast "Passkey removed." even for Face ID | "Remove passkey" / "Keep passkey"; "Face ID removed from this device" on phones | Verb plus object. Match the term the person set up. |
| Low | `src/app/not-found.tsx:21` | "This link doesn’t go anywhere in NEVORA. Check the address, or sign in to find what you need." | Keep it. | It reads well. |

---

## Spanish coverage gaps (cross-surface)

- **B5 is still pending.** Spanish exists only on:
  - the sign-in and public pages (`auth-copy`, `mobile-access/copy`)
  - the Clocker (`clocker-copy`)
  - the passkey offer
  - the account emails (both languages in one email)
  - the payroll documents
  - the owner-advisor period review
  - the vocabulary slots, which are never used in sentences

  Every signed-in screen is English. Until B5 ships, the in-app Language control and the onboarding guide must not suggest otherwise (see the Employee rows above).
- **Usage is consistent.** Every Spanish string checked uses tú, and the "¿…?" punctuation is complete. The `ownerMailNext` string uses ustedes, which is right for addressing a support team.
- **Gender.** The workspace presets use masculine generic forms (`words.ts:165,172,175`: "Asociado", "Técnico", "Cuidador"). This is acceptable for labels, but review it before B5 puts these words into sentences.
- **Puerto Rico terms.** "Patrono" (`paystub-document.ts:497`) is right. "Importe" (`:239,498`) is Spain usage; use "Cantidad" or "Monto". "Tiempo libre" (`auth-copy.ts:128,131`; `mobile-access/copy.ts:289`) means leisure in Puerto Rico; for paid leave use "días libres" or "licencia". Choose one with Jose.

---

## Glossary: one term per concept

| Concept | English (UI) | Spanish (Puerto Rico) | Retire |
|---|---|---|---|
| The list of things waiting on a manager | Things to do (tab: To do) | Pendientes | Inbox, tasks, actions, Needs you (as a heading), items |
| Taking a day or hours off | Time off; a time-off request | Días libres; solicitud de días libres | leave, PTO, tiempo libre |
| Both kinds of swap and cover | Shift requests (place); swap request, cover request (rows) | Cambios de turno | Shift swap request, exchange |
| An unassigned shift | Open shift | Turno disponible | gap (in UI), coverage gap |
| Saying you can't work a shift | Can’t work (action "Can’t work this shift"); can’t-work request | No puedo trabajar | Unable to work, callout, Can’t-work report |
| Taking back your own request | Withdraw request | Retirar solicitud | Cancel request, Cancel report |
| Asking to change recorded time | Correction request; verb "Fix a punch" | Solicitud de corrección; "Corregir una marcación" | fix (as a noun), proposal, submission |
| One recorded clock event | Punch | Marcación | clock action, action, acción de tiempo |
| Clocked-in state | Clocked in (Clocked In on the kiosk) | En turno | On the clock, Working, On shift now |
| The period's time record | Timecard | Tarjeta de tiempo | time sheet |
| The pay document | Pay statement | Comprobante de pago | paycheck (as the document), statement (alone) |
| Pay section | Pay (employee tab), Payroll (Owner) | Pago, Nómina | Pay statements (as a nav label) |
| Time file for a payroll provider | Time export | Exportación de tiempo | Payroll export, generation, canonical record |
| The business | Company (Owner screens); workplace (employee and sign-in) | Empresa; tu trabajo | workspace |
| Business owner role | Owner | Dueño (or "la persona dueña") | "el Owner", administrator |
| Lead duty on a shift | Shift lead | Líder de turno | Designated lead, Designated shift lead |
| Signing in and out | Sign in, Sign out | Iniciar sesión, Cerrar sesión | Log in |
| Getting back into an account | Forgot password; recovery code; Help someone sign in | ¿Olvidaste tu contraseña?; código de recuperación | Forgot access, Reset access, assisted recovery |
| Shared tablet | Clocker tablet; Register tablet | Tableta Clocker; Registrar tableta | Connect tablet |
| Alerts on a device | Alerts on this device | Alertas en este dispositivo | Device settings, enrollment |
| Calendar feed | Calendar link; Get a new link; Turn off link | Enlace de calendario | Reset link, Replace link, Revoke link, subscription |
| A message to the team | Update (Owner and Manager); message (Lead to today's team) | Aviso; mensaje | Communication, notice |
| Loading failure | "{Thing} didn’t load. Try again." | "No pudimos cargar {cosa}. Inténtalo de nuevo." | protected snapshot, source, unconfirmed, observation |
| Unknown count | "—" with "Couldn’t check" | "—" with "No pudimos verificar" | 0 |
| Durations | 1 h 30 min (dense tables: 1.5h) | 1 h 30 min | 1h 30m, hrs |
| Ranges | Sep 28 – Oct 4, 2026; 9:00 AM – 5:00 PM | 28 sep – 4 oct 2026; 9:00 a. m. – 5:00 p. m. | unspaced en dash, hyphen |

---

## Verification and gaps

- **Checked:**
  - every label in the copy modules listed in Method
  - every visible string in `owner-b/*` and `employee-b/*`
  - the Clocker's `t()` keys against `CLOCKER_COPY`. Every kiosk literal has a Spanish entry; nine server error strings do not.
  - metadata on every `page.tsx`
  - toast calls, destructive labels, aria-label literals, duration builders and range separators
- **Not checked:**
  - rendered overflow at 320px for Spanish
  - screen-reader output
  - runtime strings from the server other than the Clocker and recovery messages
  - CMS or database text (company names, break type names, position names)
  - legal page bodies
  - payroll sentence copy beyond the highlights. It is locked (DESIGN.MD:1320) and needs a separate pass with Jose.
- **QA scripts.** Several current strings are pressed by QA scripts (DESIGN.MD:751, :864–866), including "Approve revision", "Clocked In", "Refresh recorded time" and the Clocker Title Case buttons. Any rename must update those scripts in the same change.
- **Dead code.** The 162 unreached files (list from the import-graph script in Method) still contain old wording, such as "Action Center" and "Observed actions" in `manager-reviewed-views.tsx`. They can be deleted, or they will reintroduce the wording if someone reconnects them.
