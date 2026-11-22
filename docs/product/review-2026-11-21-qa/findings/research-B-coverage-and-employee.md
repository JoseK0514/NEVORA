# Research B: coverage-gap repair (Job C) and employee "next shift / pay stub" (Job D)

Prepared 2026-11-21 for the NEVORA product QA review. This file uses first-party sources only: vendor help centers, product pages, release notes and App Store listings. It does not use review sites or one vendor's write-up of another.

How to read the evidence labels:
- **"read 2026-11-21"** means the page was fetched and read on that date.
- **"(snippet only)"** means the vendor page refused automated fetches (401/403), so the claim rests on the search-engine snippet or summary of that page. Several help centers blocked fetches: Deputy, 7shifts, Homebase support and Gusto support. Treat those claims as slightly weaker.
- **"Inferred:"** marks my own reasoning. It is not a vendor statement.
- Step counts are counted from the documented steps. Where the documentation leaves a step out, the count is labelled Inferred.

---

## When I Work

### Job C: repairing a coverage gap
- **Spotting the gap: Dashboard "Today's Schedule".** The web Dashboard shows only shifts in the next 12 hours. Managers start Find Replacement from there or from the Scheduler. https://help.wheniwork.com/articles/finding-a-replacement-for-a-shift-computer (read 2026-11-21)
- **Find Replacement, web (Scheduler), 3 documented steps.** Open "Scheduler", hover the shift, click More > "Find Replacement", choose users, click "Offer Shift". Same URL (read 2026-11-21).
- **Find Replacement, web (Dashboard), 4 documented steps.** Dashboard > click the shift in "Today's Schedule" > "Find Replacement" > choose users > "Offer Shift". Same URL (read 2026-11-21).
- **Find Replacement, mobile, 5 steps.** "Scheduler" > tap the shift > "Find Replacement" > select users and tap "Offer Shift" > tap "I Understand" on a shift-responsibility notice. https://help.wheniwork.com/articles/finding-a-replacement-for-a-shift-iphone-ipad (listed in search; steps read on the computer article's mobile section, 2026-11-21)
- **Who appears as a candidate.** Only qualified users who are not already scheduled are listed. The article does not mention availability or time-off columns. https://help.wheniwork.com/articles/finding-a-replacement-for-a-shift-computer (read 2026-11-21)
- **Overtime risk is shown in the candidate list.**
  - Candidates who would reach overtime or max hours get a badge. Hovering it shows a projected breakdown of new and total weekly hours.
  - A **"Deselect OT/Max"** button clears every such user in one click.
  - The same badge appears on the OpenShift offer list, in the "Assign To" menu and on shift templates.
  - https://help.wheniwork.com/articles/overtime-visibility (read 2026-11-21)
- **The offer is first-come, first-served.** Quote: "The first user to accept the shift will be automatically assigned the shift." No approval step is described. https://help.wheniwork.com/articles/finding-a-replacement-for-a-shift-computer (read 2026-11-21)
- **Notifications.**
  - Web: selected users get an email. Mobile: users are "notified", with no channel named. Push and SMS are not mentioned in that article.
  - Same URL (read 2026-11-21).
- **OpenShifts are an alternative route.**
  - Publishing an OpenShift notifies all eligible users. Eligibility is based on assigned positions.
  - Shift coverage (release, drop, swap) needs manager approval by default. This can be changed in Scheduling Settings.
  - https://help.wheniwork.com/articles/giving-your-team-schedule-flexibility (read 2026-11-21)
- **Approving OpenShift requests.**
  - Requests sit in "Pending Approval". Candidates are listed by request date, and the manager selects one and clicks "Approve".
  - When overlapping pick-up is enabled, users who can take the full shift are listed first.
  - Managers get an email and/or mobile alert, plus a count badge on the bell icon.
  - https://help.wheniwork.com/articles/process-openshift-requests (read 2026-11-21)
- **Overtime alert after acceptance.** Managers can turn on Overtime Alerts in Alert Preferences, to be told when an accepted OpenShift causes overtime. https://help.wheniwork.com/articles/overtime-visibility (read 2026-11-21)
- **A "Who can work" feature was not found.** No first-party When I Work page uses that name.
- Inferred: When I Work's strongest pattern is putting the overtime/max-hours badge and the "Deselect OT/Max" bulk action directly inside the offer list. It does not rank candidates.

### Job D: next shift and pay stub
- **The employee dashboard's first card is "Next Shift".**
  - The iOS dashboard order is: Next Shift, Also Working, My Shifts, Time Off Requests, Shift Requests, OpenShift Requests, then Clock In/Out or Take Lunch.
  - Quote: "Displays your current or next upcoming shift."
  - No countdown is mentioned.
  - https://help.wheniwork.com/articles/using-dashboard-iphoneipad/ (read 2026-11-21)
- **The Next Shift card has actions.** It offers shift details, notes, breaks, reporting an absence and getting the shift covered. It also shows who else is working. https://help.wheniwork.com/ht_kb_applies_to/employees/ (snippet only)
- **An iOS home-screen widget shows the next shift.**
  - It needs iOS 14+ and app 13.2+. Adding it takes 4 actions.
  - Tapping it opens the app so the user can act, e.g. get the shift covered or view the full schedule.
  - It was introduced in the Q1 2025 release notes.
  - https://help.wheniwork.com/articles/widget-for-ios/ (read 2026-11-21); https://help.wheniwork.com/articles/release-notes-january-to-march-2025/ (snippet only)
- **Calendar sync exists, but not on Android.** It is set up from the computer, and the help center says it is "not available from the Android application". https://help.wheniwork.com/articles/syncing-your-schedule-to-a-calendar-app-computer/ (snippet only)
- **No employee pay stub view was found.** First-party pages show no in-app pay stub for employees. The web navigation reference lists a Payroll menu but does not say employees can see it. https://help.wheniwork.com/articles/web-app-navigation-reference-for-employees/ (snippet only)
  - Inferred: When I Work leaves pay stubs to the payroll provider.

---

## Deputy

### Job C: repairing a coverage gap
- **Find replacement, web, about 4 documented actions.**
  - Path: Schedule page > click the shift > three-dots menu > "Find replacement" > choose recipients in a pop-up.
  - It can also be started from the employee's profile in the Teams panel, or from the mobile app.
  - https://help.deputy.com/hc/en-au/articles/4688987465743-How-do-I-find-a-replacement-for-a-team-member-that-can-t-work (snippet only, 403)
- **Recommended candidates are pre-selected.**
  - Deputy automatically selects team members who are recommended for the shift. A manager can add non-recommended staff by overriding a warning.
  - On mobile, "Recommended team members will be listed".
  - Same URL (snippet only).
- **What drives a recommendation.** Overlapping shifts, training, unavailability, approved leave, stress profile, onboarding status and an optional preferred-staff setting. https://help.deputy.com/hc/en-au/articles/4688700112015-How-do-I-ensure-that-a-team-member-is-recommended-for-a-shift (snippet only, 403)
- **The offer becomes an open shift with offers.**
  - Find Replacement turns a published shift into an "Open shift with offers".
  - Whoever first clicks the push invitation or email link gets the shift.
  - The original team member is told they are no longer required.
  - Offers can be cancelled before anyone claims.
  - https://help.deputy.com/hc/en-au/articles/4688987465743 (snippet only); https://help.deputy.com/hc/en-au/articles/5943784368655-How-do-I-manage-last-minute-changes-to-the-schedule (snippet only)
- **Manager approval needs a separate feature.** Managers who want to choose the person use "Open Shifts with Approval" instead. The snippet says Send offers cannot be combined with it. Same URLs (snippet only); https://whatsnew.deputy.com/create-open-shifts-with-manager-approval-UFaUg (listed in search, not read)
- **Notifications.**
  - Invitees get push, email or SMS, depending on their setup.
  - Declined invitees are shown with a "declined" status in shift details.
  - https://help.deputy.com/hc/en-au/articles/5943784368655-How-do-I-manage-last-minute-changes-to-the-schedule (snippet only)
- **Release notes (both dated only "2 years ago").**
  - Team members can decline Find Replacement or Open-Shift-with-Approval invites, which narrows the pool. https://whatsnew.deputy.com/fill-your-shifts-faster-with-improvements-to-open-shifts-with-approval-and-find-replacement-2xRb6U (read 2026-11-21)
  - A revamped Find Replacement modal lets managers search for employees and add a message to encourage pickup on the web. Before this, messages were mobile-only. https://whatsnew.deputy.com/improvements-for-find-replacement-for-better-managing-your-schedules-211L68 (read 2026-11-21)
- **Sick call that arrives as a leave request.** Before approving leave on a scheduled shift, the manager must choose whether to make the shift open or empty, or keep the person on it. https://help.deputy.com/hc/en-au/articles/5930243429391-How-do-I-manage-team-members-calling-in-sick (snippet only)
- **Deputy AI handles call-outs by chat.**
  - Example prompt: "@Matt is sick this week. Replace their Monday and Wednesday shifts..."
  - It factors in "availability, leave, conflicts with existing shifts, and role or training requirements".
  - It shows a preview summary with warnings. Nothing is final until the manager confirms.
  - https://www.deputy.com/ai (read 2026-11-21)
- Inferred: Deputy has the deepest candidate screening of the products reviewed. It pre-selects recommended people and puts an override warning on everyone else. Overtime or cost visibility inside Find Replacement was not documented in the sources I could read.

### Job D: next shift and pay stub
- **The Home tab shows the upcoming shift, and the shift is started from Home.** A "Me" tab gives a 7-day overview of shifts and the week's scheduled hours. https://help.deputy.com/hc/en-au/articles/4614752492687-Check-your-schedule-on-Deputy (snippet only); https://help.deputy.com/hc/en-au/articles/4614769464207-Start-and-end-your-shift (snippet only)
- **Payslips are in the app with Deputy Payroll (AU).**
  - Path: Home > "Pay history" under the Pay section > pick a payslip > download icon. That is about 3 taps to view.
  - Payslips appear only after the employer locks the pay run.
  - https://help.deputy.com/hc/en-au/articles/11949458786063-How-do-I-get-my-payslips-from-Deputy-Payroll (snippet only)
- **Calendar sync uses a webcal subscription.**
  - Downloading an .ics file is a one-off import and does not keep the calendar current.
  - Google may take 8–24 hours to refresh the feed.
  - https://help.deputy.com/hc/en-au/articles/4688796818703-Syncing-your-Deputy-schedule-with-your-own-calendar-application (snippet only)
- Inferred: US Deputy customers without Deputy Payroll get no pay stub in the app.

---

## 7shifts

### Job C: repairing a coverage gap
- **"Find cover", mobile, about 4 documented actions.**
  - Path: open the schedule > select the absent employee's shift > "Find cover" > "Find who's available".
  - https://kb.7shifts.com/hc/en-us/articles/4417505264787-What-to-Do-When-an-Employee-is-Absent-or-Calls-in-Sick (snippet only, 403)
- **There is a time window.** "Find cover" is only available from 24 hours before shift start until the shift ends. Same URL (snippet only).
- **Overtime and labor risk are shown in the candidate list.** Employees who might trigger overtime or other labor issues are listed with warnings at the bottom of the list. Same URL (snippet only).
- Inferred: candidates are effectively ranked, with people who carry no warnings listed first.
- **The original shift keeps a flag.** After publishing, the replacement shift appears on the Schedule along with any shift flag on the original employee's shift. Same URL (snippet only).
- **The web app has two methods on the Schedules page.** The snippet is truncated, so the second method was not recovered. Same URL (snippet only).
- **Reassignment warns about overtime.**
  - A warning appears if a shift would push the employee into scheduled overtime.
  - It uses scheduled shifts plus worked hours, including unscheduled punches.
  - https://kb.7shifts.com/hc/en-us/articles/33962078614419-Reassign-Shifts-on-the-Schedule (snippet only)
- **Open shifts are bid on, and the manager assigns.**
  - An open shift is a draft (yellow) until the schedule is published.
  - Employees in the department get a bid alert if their Schedule Posted notifications are on.
  - Managers get a push notification for each bid. They pick a bidder and tap "Assign to".
  - The winner gets a push notification. Other bids are declined and the shift leaves the Shift Pool.
  - https://kb.7shifts.com/hc/en-us/articles/4417519854227-Open-Shifts (snippet only); https://kb.7shifts.com/hc/en-us/articles/4417505005459-Approve-or-Deny-Shift-Pool-Requests (snippet only)

### Job D: next shift and pay stub
- **Employee dashboard contents.** Today's shifts, an option to message the manager on duty, upcoming shifts, "shifts up for grabs", and an Earnings Report. The earnings are estimates. https://kb.7shifts.com/hc/en-us/articles/4417519877011-Employee-Dashboard-Overview (snippet only)
- **Pay stubs require 7shifts Payroll.**
  - Mobile path: menu > "Pay Management" > "Pay stubs" tab > pick a pay period.
  - Web path: profile icon > My Account > pay stubs tab > Download.
  - Stubs appear once payroll is marked Paid.
  - Customers using other payroll systems get stubs from that system instead.
  - https://kb.7shifts.com/hc/en-us/articles/20720540431763-View-Your-Pay-stub-with-7shifts-Payroll (snippet only)
- **Deactivated employees can still get stubs, on mobile only.** https://kb.7shifts.com/hc/en-us/articles/40594912417683-How-to-retrieve-W-2s-and-pay-stubs-for-deactivated-employees (snippet only)
- **Calendar sync works with Google and Apple Calendar.**
  - It is a pull feed that refreshes every 2–12 hours, set by the calendar app.
  - Google sync cannot be set up from the 7shifts mobile app.
  - Links are personal and should not be shared.
  - https://kb.7shifts.com/hc/en-us/articles/4861793532691-Sync-Your-7shifts-Schedule-with-Google-and-Apple-Calendar (snippet only)

---

## Homebase

### Job C: repairing a coverage gap
- **The gap is shown as an Open Shifts row on the schedule.**
  - Web path: Schedule > set the date range > "ADD+" on the Open Shifts row > build the shift > publish.
  - Employees are notified by email and can claim the shift.
  - https://support.joinhomebase.com/hc/en-us/articles/236362588-Manage-open-shifts (snippet only, 401)
- **Approving a claim.**
  - Web: Schedule > click the open shift > select the employee > "Approve".
  - Mobile: More > Requests > Open Shifts > select the shift and employee > "Assign".
  - Same URL (snippet only).
- **Eligibility, approval mode and notification channels.**
  - Alerts go to employees whose qualifications match the shift.
  - Claimed shifts can be "automatically assigned or require manager approval".
  - Notifications go by app, text or email.
  - A time card calculator estimates labor cost before posting.
  - https://joinhomebase.com/employee-scheduling/open-shifts (read 2026-11-21; product page)
- **No "who's available" suggestion feature was found.** The product page says employees claim based on their own availability. Same URL (read 2026-11-21).
- **Covers and trades are started by employees.** Managers are notified and approve or deny them through the bell icon on web or More > Requests on mobile. https://support.joinhomebase.com/hc/en-us/articles/236362588-Manage-open-shifts (snippet only)
- **Spotting a problem through alerts.**
  - Late-employee and approaching-overtime manager alerts need the Essentials plan.
  - "Late" defaults to 5 minutes after shift start.
  - A "no-show" means a published shift with no timecard that is at least 1 day old, so it is not a same-day signal.
  - https://support.joinhomebase.com/hc/en-us/articles/115000199591-How-do-I-edit-my-notifications-and-alerts- (snippet only); https://support.joinhomebase.com/hc/en-us/articles/235242767-Employee-performance-widget (snippet only)
- **No "Find a sub" flow was found.** No first-party page documents a manager-side "Find a sub" or replacement-suggestion flow.
- Inferred step count for a Homebase manager: post an open shift (about 4 steps), then approve a claim (about 3 steps) once someone claims it. Repairing a gap therefore takes two separate visits.

### Job D: next shift and pay stub
- **Pay stubs are in the app with Homebase Payroll.**
  - The tab is "Earnings" on iOS and "Money" on Android.
  - Stubs appear on payday, and employees also get a payday email.
  - https://www.joinhomebase.com/payroll/mobile (read 2026-11-21)
- **Older help text names only one tab.** It says pay statements are in the "Earnings tab" on iOS and Android, and that contractor payments are "coming soon". https://support.joinhomebase.com/hc/en-us/articles/360062539091-Homebase-Payroll (snippet only)
- **The home screen shows earnings with a "Cash Out" button.** The product page shows current earnings and a "Cash Out $100" button. https://www.joinhomebase.com/payroll/mobile (read 2026-11-21)
- **Clock in from the homepage.** Tap "Clock In" on the homepage, confirm the shift time and location on a map, then tap the bottom button. That is 3 taps. https://support.joinhomebase.com/hc/en-us/articles/360022364372-Clock-in-with-mobile-time-clock (snippet only)
- **Calendar sync is native, inside the app.**
  - Path: More > Settings > Calendar Sync > grant access > Enable > choose location and calendar.
  - There is an optional shift alert.
  - https://support.joinhomebase.com/hc/en-us/articles/360022479511-Calendar-Sync (snippet only)
- **The next-shift card was not confirmed.** No first-party page reviewed describes a "next shift" card on the employee home screen.

---

## Sling

### Job C: repairing a coverage gap
- **The conflicts filter is narrow.** The documented conflict is an employee already scheduled for another position. Those shifts show in grey, in day and week views only. Unavailability, time off and overtime are not covered in that article. https://support.getsling.com/en/articles/1821074-conflicts (read 2026-11-21)
- **There is a "clopening" warning.** It fires if rest between shifts is below a configured minimum. A "Rest period" setting caps consecutive workdays. https://support.getsling.com/en/articles/3691283-5-customizing-your-company-and-schedule-settings (snippet only)
- **Auto-assign fills unassigned shifts, 6 steps.**
  - Path: set the date range > filter > ensure an unassigned shift exists > Auto icon > "Auto-assign" > multiple-shifts option > "Proceed".
  - It considers unavailability, time off, position and location. Overtime, max hours and cost are not mentioned.
  - It needs the Business plan, and results stay unpublished until the schedule is published.
  - It does not rank or suggest. Conflicts have to be assigned by hand.
  - https://support.getsling.com/en/articles/5203721-auto-assign-shifts (read 2026-11-21)
- **Available shifts (open shifts).**
  - Employees in the same location and position are notified on the Dashboard, plus email or push depending on their settings.
  - "Automatically approve applicants" decides whether a manager must approve.
  - Premium and Business plans add slots. The first applicants are assigned until the slot limit is reached.
  - https://support.getsling.com/en/articles/12824084-available-shifts-shift-swaps-and-shift-offers (read 2026-11-21); https://support.getsling.com/en/articles/1407661-available-slots (snippet only)
- **No manager "suggest" or "find replacement" feature was found.** No first-party Sling page shows a manager-side suggestion list for a specific gap.

### Job D: next shift and pay stub
- **The mobile Dashboard is built around the time clock.**
  - A banner is blue before clock-in and green while clocked in. Below it is a notifications feed, including open shifts with "Apply".
  - Upcoming shifts are under the Shifts tab ("My schedule", "Full schedule", "Available shifts").
  - No next-shift card, countdown or widget is described.
  - https://support.getsling.com/en/articles/3453474-employee-mobile-app-guide (read 2026-11-21)
- **No pay stub in the app.** The More tab has Time Sheets (hours only). Wages show on the web under Profile > Wages, depending on settings. Same URL (read 2026-11-21); https://support.getsling.com/en/articles/11049328-employee-web-guide (snippet only)
- **Calendar sync is web-only to set up.**
  - The link cannot be obtained in the mobile app.
  - The feed covers ±1 month and excludes available shifts.
  - It needs Premium or Business.
  - https://support.getsling.com/en/articles/6062972-calendar-sync (snippet only)

---

## Connecteam

### Job C: repairing a coverage gap
- **Pending replacements are flagged as "Issues".**
  - Shifts with open replacement requests are flagged on the schedule.
  - They are listed under "Pending Replacement Requests" in the Issues view, or in the mobile "Unresolved Issues" bar.
  - https://help.connecteam.com/en/articles/6444737-user-shift-replacements (read 2026-11-21)
- **Replacements are started by employees.**
  - The employee uses "Find Replacement" > "Offer Shift" to one or more qualified teammates. The first to accept wins.
  - The sender is warned if a teammate is unavailable or has an overlapping shift.
  - Recipients get a push notification.
  - Admin approval is optional.
  - Same URL (read 2026-11-21).
- **Open shifts and approval.**
  - Open shifts are visible only to qualified users.
  - Optional admin approval (Advanced plan) shows the claimer's daily and weekly shift counts. Its example shows a claimer who "would enter overtime".
  - Availability is shown in red (unavailable) and green (prefers to work).
  - A setting can block claims that overlap a scheduled shift.
  - https://help.connecteam.com/en/articles/5770700-open-shift-approval (snippet only); https://help.connecteam.com/en/articles/6441778-how-to-create-open-shifts (snippet only)

### Job D: next shift and pay stub
- **Payslips are under Profile.**
  - Path: Profile tab > "My Payslips" > a PDF can be downloaded. That is 2 taps to the list.
  - Admins upload payslips, or they are auto-imported daily from ADP Workforce Now.
  - https://help.connecteam.com/en/articles/10624078-how-to-view-employee-payslips-in-connecteam (snippet only)
- **Calendar sync exists for personal calendars.** Each user syncs their own shifts. https://help.connecteam.com/en/articles/7936917-how-to-sync-your-connecteam-shifts-to-your-personal-calendar (snippet only)

---

## Gusto

### Job C
- **Not researched.** I found no first-party Gusto coverage-repair flow within the budget. Inferred: Gusto is payroll-first and is not a scheduling competitor for Job C.

### Job D
- **Mobile paystubs.**
  - Path: "Pay" > tap a recent paystub, or "Show pay history". "Show paystub PDF" is further down the page. That is about 2 taps.
  - Stubs appear on or after the check date.
  - https://support.gusto.com/article/260428150612093/view-and-understand-your-paystub-for-us-employees (snippet only, 403)
- **Gusto Wallet does not show paystubs.** The first-party results describe Wallet as debit, savings, on-demand pay and budgeting tools, and none say it displays paystubs. Inferred: paystubs live in the main Gusto app's Pay tab, not in Wallet. https://gusto.com/product/mobile (listed in search, not read)

---

## ADP

### Job C
- **Not researched.** No first-party ADP small-business coverage-repair flow was found within the budget.

### Job D
- **ADP Mobile Solutions (App Store listing).**
  - Listed features: "View pay & W2 statements", "Punch in/out", "View & request time off", and "View team calendars" for managers.
  - Apple Watch is supported (watchOS 10.6+).
  - Widgets and next-shift views are not mentioned.
  - https://apps.apple.com/us/app/adp-mobile-solutions/id444553167 (read 2026-11-21)
- **Features vary by employer.** ADP notes availability depends on the employer's ADP services. https://www.adp.com/logins/adp-mobile-solutions (snippet only)

---

## Patterns across competitors

These are inferences that summarise the claims above.

**Job C: repairing a coverage gap**
- **The usual offer model is first-come, first-served.** When I Work Find Replacement, Deputy Find replacement and Connecteam offer all work this way. Approval is a separate open-shift mode, which can be turned on in When I Work, Deputy, Homebase, Sling and Connecteam.
- **Candidate screening comes in three strengths:**
  - Strongest: Deputy (pre-selected recommended people, with an override warning for everyone else).
  - Middle: 7shifts (available people listed, with overtime and labor-risk people pushed to the bottom with warnings).
  - Middle: When I Work (qualified and not-already-scheduled people only, plus an OT/max badge and a "Deselect OT/Max" bulk action).
  - Weakest: Homebase and Sling (the open shift is broadcast to everyone eligible by role, location or position).
- **Spotting the gap is mostly passive.** It shows up as an Open Shifts row (Homebase), a 12-hour "Today's Schedule" Dashboard (When I Work), shift flags (7shifts), an Issues view (Connecteam) or late alerts (Homebase Essentials). None of the sources I read documented a red or understaffed coverage-requirement indicator.
- **Documented steps from gap to offer sent: about 3–5 actions.** When I Work web takes 3–4, When I Work mobile 5, Deputy about 4 and 7shifts mobile about 4. Homebase takes about 4 steps to post, then a separate approval.
- **Cost is almost never shown in replacement flows.** Only the Homebase product page mentions estimating labor cost for an open shift before posting.

**Job D: next shift and pay stub**
- **Several apps make the next shift the first thing on the home screen.** When I Work has a "Next Shift" first card plus an iOS widget, and Deputy's Home shows the upcoming shift. On Sling the time-clock banner comes first.
- **Pay stubs are in the app only when the vendor runs payroll.** This applies to Homebase Payroll (Earnings/Money tab), 7shifts Payroll (Pay Management > Pay stubs), Deputy Payroll AU (Home > Pay history), Gusto (Pay tab), Connecteam (Profile > My Payslips, via upload or ADP import) and ADP Mobile. When I Work and Sling have no documented employee pay stub view.
- **Calendar sync is everywhere, but it is usually a web-set-up subscription with a delay.** Homebase is the exception, with native in-app calendar sync. When I Work's iOS widget is the only lock-screen or home-screen surface found.

---

## Gaps
- **Fetches blocked (401/403):**
  - Deputy help center (all articles), 7shifts KB (all articles), Homebase support (all articles), Gusto support.
  - Claims from these are "(snippet only)". Exact UI labels and step counts for Deputy, 7shifts and Homebase are not verified against the full page.
- **7shifts web-app methods.** The second of the two Schedules-page methods for finding a last-minute replacement was not recovered because the snippet was truncated.
- **7shifts "Find who's available" columns.** The exact columns (availability, time off, hours this week) are not confirmed.
- **Deputy Find replacement visibility.** Overtime, cost and hours-this-week visibility inside Find replacement was not documented in the sources reached.
- **Homebase manager-side suggestions.** No first-party "Find a sub" or suggested-replacement feature was found. Unknown whether one exists in the current app.
- **When I Work "Who can work".** No first-party page uses this name. It may not exist, or it may be an undocumented UI label.
- **Coverage-requirement indicators.** No vendor's staffing-requirement or understaffed indicator (red/green coverage bar) was researched or found in first-party sources. This is a possible follow-up for Deputy, 7shifts and When I Work.
- **SMS notifications.** SMS is documented for replacement offers only by Deputy, and for open shifts by the Homebase product page. Other vendors document push and/or email only.
- **Countdown widgets.** No countdown to the next shift was documented anywhere. Lock-screen widgets and Live Activities were not found for any vendor.
- **Not researched (budget):**
  - Homebase and 7shifts App Store listings (the Homebase App Store URL tried returned 404).
  - Gusto and ADP manager coverage flows.
  - 7shifts and Deputy widget support.
  - Official YouTube walkthroughs.
- **Release-note dates.** The Deputy release notes show only "2 years ago", so exact dates are unknown.
