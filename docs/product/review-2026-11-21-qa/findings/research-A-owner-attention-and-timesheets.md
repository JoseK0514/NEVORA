# Competitor research: owner attention and timesheet approval

Research date: 2026-11-21. First-party sources only (vendor product pages, help centers, release notes, app store listings).

How to read the evidence labels:
- **read 2026-11-21**: the page was fetched and read in full on that date.
- **(snippet only)**: the page refused automated fetching (401 or 403), so the claim rests on the vendor's own search-result snippet for that URL. These pages are first-party, but confirm the wording before quoting it externally.
- **Inferred:** my interpretation, not a vendor statement.

Several help centers blocked fetching: kb.7shifts.com (403), help.deputy.com (403) and the legacy support.joinhomebase.com/hc pages (401). Most of the 7shifts, Deputy and Homebase-help claims are therefore snippet-only.

- **Job A:** the owner or manager asks "what needs my attention today?"
- **Job B:** the owner approves this week's timesheets for payroll.

---

## 1. Homebase

### Job A: what needs attention

- **Daily email digest.** Homebase sends daily email summaries, and one section is called "Yesterday's Summary". A team permission controls who can see it, and a separate permission controls the "ability to receive daily & weekly email summaries when enabled in Manager Alerts". Weekly summaries go only to Clover-integrated accounts. https://support.joinhomebase.com/s/article/Setting-Up-Team-Permissions (read 2026-11-21)
  - The help pages I could reach do not document what the daily email contains.
- **Manager log email.** Homebase sends a daily summary email of the manager logbook notes. Each entry links to that day's metrics: who was scheduled, sales and weather. https://www.joinhomebase.com/team-communication/manager-log (snippet only)
- **Alerts are configurable per manager.** The path is My Settings > Alerts & Notifications. Each alert can be delivered by email, iPhone/Android push, or text. https://support.joinhomebase.com/hc/en-us/articles/115000199591-How-do-I-edit-my-notifications-and-alerts- (snippet only)
- **Late and overtime alerts are paid features.** The help page lists the late-employee and approaching-overtime alerts under the Essentials plan; the free Basic plan covers trades, time-off requests and unpublished schedules. Quote: "Manager alerts that require Essentials plan: For late employees". Same URL as above (snippet only).
  - The time-clock product page instead places the alert and overtime features on Plus and above, so the two sources conflict. https://www.joinhomebase.com/time-clock (snippet only)
- **App store listings promise late alerts.** The listings say managers are alerted when employees are late or approaching overtime. Managers approve time off, trades and availability in the app.
  - https://play.google.com/store/apps/details?id=com.joinhomebase.homebase.homebase&hl=en_US (snippet only)
  - https://apps.apple.com/us/app/homebase-team-management/id871544379 (snippet only)
- **How "late" is defined.** A timecard counts as late once it is a set number of minutes after shift start, "Defaulted to 5 minutes after shift start". A missed clock-out is a timecard still open and at least 1 day old. This is the Employee performance widget, which refreshes daily at about 3am PST, so it is not real-time. https://support.joinhomebase.com/hc/en-us/articles/235242767-Employee-performance-widget (snippet only)
- **Timesheet and payroll reminders.** Homebase's glossary says managers are alerted when approvals are pending or payroll deadlines are approaching, and that reminders can arrive as push notifications. https://www.joinhomebase.com/glossary/timesheet-reminders (snippet only)
- **Labor against forecast.** This lives in the Schedule view. The budget forecast toolbar shows estimated sales, a Labor % Target and scheduled labor by department. https://support.joinhomebase.com/hc/en-us/articles/229502388-Budget-forecast-toolbar (snippet only)
- **Gaps.** I found no first-party page that describes the web dashboard's landing layout or a "who's working now" panel. I also found no documented tap path from a late alert to calling or messaging the employee.
  - Inferred: Homebase's attention model is mostly notification-led (push, text and email alerts plus the daily email), not a documented single home queue.

### Job B: approving timesheets

- **Marketing summary.** Managers "review, approve, and lock timesheets before you run payroll". Homebase keeps a running list of "missed shifts, missed clock-outs, and missed breaks". After approval you either run payroll inside Homebase or export to QuickBooks or Gusto. https://joinhomebase.com/blog/new-homebase-timesheet-approvals/ (read 2026-11-21; the page shows no date)
- **Issue flags.** The Timesheets page shows an alert icon for card issues such as missed breaks, overtime, a missing clock-out or a no-show. Missed-break errors appear only for breaks set as mandatory.
  - https://support.joinhomebase.com/hc/en-us/articles/360050898232-Timesheets-and-Payroll-Prep (snippet only)
  - https://support.joinhomebase.com/s/article/Timesheet-Columns (snippet only)
- **Fixing an unscheduled shift.** Reassign the timecard to a scheduled shift. The older wording is "Reassign Timecard to a Scheduled Shift"; a newer page calls it "Connect to Scheduled Shift". Same sources as above (snippet only).
- **Approve and lock: about 3 documented steps.**
  1. One-time setup: Settings > Payroll > check "Lock timesheets after approval".
  2. In Timesheets, set the date range.
  3. Click "Approve All" at top right, or tick each shift's box at the far right to approve selectively.

  Once approved, a time card is locked; only managers with permission can edit it. https://support.joinhomebase.com/hc/en-us/articles/235231007-Lock-timesheets-for-payroll (snippet only)
- **Missed-break premium pay** can be configured under Settings > Breaks & Compliance. https://support.joinhomebase.com/hc/en-us/articles/235016988-Enable-missed-break-penalties (snippet only)
- **Before exporting to ADP RUN,** the integration guide says to resolve timesheet errors such as missed clock-outs and missed breaks. https://support.joinhomebase.com/s/article/Homebase-and-ADP-RUN-Integration-Guide (snippet only)

---

## 2. When I Work

### Job A: what needs attention

- **The web dashboard is the landing view for managers.** With Scheduling plus Time Clock & Attendance, it has seven cards. Source for all seven: https://help.wheniwork.com/articles/using-the-dashboard-scheduling-and-attendance-computer (read 2026-11-21)
  1. **Today's Schedule:** report an absence, move a shift to open, or offer the shift to eligible users.
  2. **Today's Snapshot:** items for today that may need attention. Each reminder has a "view" link, and the card links to Time Tracker to compare scheduled and clocked hours.
  3. **Attendance Notices.**
  4. **Coverage:** graphs of OpenShifts against assigned shifts.
  5. **Worked Labor Cost.**
  6. **Pay Period Complete:** prompts "Close Pay Period" and links to Timesheets.
  7. **Pay Period Forecast:** worked hours trending against scheduled hours, with a percentage difference.

  Cards can be hidden or reordered.
- **Attendance Notices card.** Shows the last 7 days grouped by date, with a red count per date. It can be filtered by type, cleared, or turned into a report. https://help.wheniwork.com/articles/attendance-notices-computer (read 2026-11-21)
  - **Notice types:** wrong location, clocked in early or late, clocked out early or late, missed clock-in, no-show, absence, and not scheduled.
  - **Inline fixes on each notice (same URL):**
    - Clocked in late: Edit Time (saving clears the notice), approve the punch, or view shift details.
    - Missed clock-in while the shift is still running: Send Reminder, Report Absence or Create time entry.
    - No-show: Report Absence or Create time entry.
    - Absence: Find Coverage.
    - Wrong location: Send Message.
    - Not scheduled (past shift): Schedule Shift, which also approves the punch.
  - Inferred: the fix is about 1 click from the notice, once the manager is on the dashboard.
- **Real-time mobile alerts.** Under Attendance Settings > Notifications, admins can turn on "Notify Managers When Employees Miss Clock In/Out". The alert fires 1, 3, 5, 15 or 30 minutes after a missed clock-in or clock-out. Managers are notified only about users on their own schedules. These settings affect mobile alerts only, not the dashboard notices. If the user is not logged into the app, the alert goes by text message.
  - https://help.wheniwork.com/articles/attendance-settings/ (snippet only)
  - https://help.wheniwork.com/articles/adjust-when-clock-in-out-reminders-are-sent/ (snippet only)
- **Overtime alerts** have their own settings article. https://help.wheniwork.com/articles/setting-overtime-alerts-computer/ (snippet only; not read)
- **No daily digest email found.** I found no first-party evidence of one for When I Work.
  - Inferred: the dashboard plus the mobile alerts take the place of a digest.

### Job B: approving timesheets

- **Approving one user's timesheet: 7 documented steps.** https://help.wheniwork.com/articles/approve-users-timesheets (read 2026-11-21)
  1. Attendance > Timesheets.
  2. Select the pay period.
  3. Click the user's name.
  4. Review and edit.
  5. Click Approve.
  6. Resolve or ignore missing entries, then approve again. "Approve missing entries" ignores all of them at once.
  7. An approved icon appears on the user's photo.
- **What gets flagged.** Scheduled shifts with no in or out time are highlighted red when you click Approve. Same URL.
- **No bulk approval.** The page documents no multi-user bulk approve. Same URL.
- **Approval is optional and fragile.** Quote: "Approving timesheets is an optional step in preparing your pay period hours". Quote: "A timesheet becomes unapproved when an edit is made to it". Users can still clock in on an approved timesheet. Same URL.
- **Locking happens when you close the pay period,** not when you approve: "Close Period" stops further changes. Then "Export Period Hours", or click the payroll processor's name to send hours directly. Only admins, and managers with pay-period access, can close or reopen a period. https://help.wheniwork.com/articles/close-and-export-payroll/ (snippet only)
- **The dashboard nudges you to close.** The "Pay Period Complete" card links into Timesheets to close the period. https://help.wheniwork.com/articles/using-the-dashboard-scheduling-and-attendance-computer (read 2026-11-21)

---

## 3. 7shifts

### Job A: what needs attention

- **Overview dashboard (web and mobile).** It gives admins, managers and assistant managers a live view of labor efficiency, pending employee requests and recent activity. Viewing it requires the "Can manage schedules" permission. https://kb.7shifts.com/hc/en-us/articles/4417519711251-Sales-vs-Labor-Dashboard-Overview (snippet only)
- **Sales against labor.** The graph charts projected and actual sales and labor, plus sales per labor hour. Same URL (snippet only).
- **Mobile Overview: request blocks.** Blocks for pending Shift Pool, Time Off and Availability requests sit at the top. Selecting a block opens the matching approval screen, and an empty block shows a green zero state. The screen also shows live labor cost and sales. https://kb.7shifts.com/hc/en-us/articles/48276402521619-Overview-dashboard-in-the-7shifts-mobile-app (snippet only)
- **Mobile Overview: Who's Working counts.** The screen shows counts for On, Break, Overdue, Upcoming and Out. Overdue means "late punches, no shows, etc.". Tapping any block opens the full list. Same URL as above (snippet only).
  - https://kb.7shifts.com/hc/en-us/articles/48003854541587-What-s-New-January-2026 (snippet only)
- **Acting on an Overdue employee.** From an Overdue punch, a manager can add a punch, contact the employee, or view shift details. https://kb.7shifts.com/hc/en-us/articles/52542828339731-Monitor-your-shift-in-real-time-with-Who-s-Working-Getting-Started-for-Managers (snippet only)
  - Inferred: Overview > tap Overdue > tap the employee > contact is about 3 taps.
- **Real-time missed-punch alerts.** These are configured under Time Clocking > Settings. Scheduled managers get a push or email alert when a scheduled employee has not punched in or out.
  - Recipients must be Assistant Manager, Manager or Admin, have "Can manage schedules", and belong to the same department.
  - If no manager is scheduled, the alert goes to the Admin.

  https://kb.7shifts.com/hc/en-us/articles/4417513628307-Alerts-for-Missing-Punches (snippet only)
- **Automatic shift flags.** With Auto-Shift Flags enabled, Late and No-show flags are applied from punch data. https://kb.7shifts.com/hc/en-us/articles/4417513808403-Shift-Flags-Track-Sick-Time-No-Shows-and-Lates (snippet only)
- **Daily and weekly digests.**
  - **Log Book daily email summary.** It goes to admins, managers and assistant managers at the location. It can be sent by hand or automatically at a per-location time. A send time between 12am and 6am reports the previous day; the email includes a sales snapshot. It is skipped when the log is blank or required categories are empty.
    - https://kb.7shifts.com/hc/en-us/articles/33532075125139 (snippet only)
    - https://kb.7shifts.com/hc/en-us/articles/33532075125139-Send-the-Log-Book-email-summary (snippet only)
  - **Weekly Digest email.** Admins get actual sales, labor cost, sales per labor hour, labor % and overtime hours, sent on the start-of-week day at 4am. https://kb.7shifts.com/hc/en-us/articles/4417513581971-Weekly-Digest-Email-Summary (snippet only)
  - **AI daily summary.** The Overview shows an AI-generated daily operational summary built from Log Book entries, sales and labor. It requires the Log Book add-on. https://kb.7shifts.com/hc/en-us/articles/53218939523347-What-s-New-July-2026 (snippet only)
- **Labor Budget Tool.** It sits at the bottom of the Schedule page and compares projected sales with scheduled labor. Days turn green or red against target. https://kb.7shifts.com/hc/en-us/articles/4417514442771-The-Labor-Budget-Tool (snippet only)

### Job B: approving timesheets

- **Payroll run page (release note, about early November 2026).**
  - A banner shows how many punches still need approval before the pay period can close.
  - The bulk action reads "Approve [#] punches without conflicts".
  - Punches with clock-out or break conflicts must be reviewed one at a time.
  - A filter lists the employees who still have punches to review.

  https://kb.7shifts.com/hc/en-us/articles/56879573342483-What-s-New-7shifts-Payroll-Run-Updates (snippet only)
- **Older behavior.** "Approve All" approved only the punches on the current page. https://kb.7shifts.com/hc/en-us/articles/31656457784083-How-to-approve-time-punches-in-Time-Clocking (snippet only)
- **Approval is required to close.** All punches must be approved when the timesheet is closed, and only Admins can close all timesheets. https://kb.7shifts.com/hc/en-us/articles/4417520088211-ADP-Workforce-Now-US-Payroll-Integration (snippet only)
- **Disputes can undo approval.** An employee dispute resets a punch to unapproved, even after the timesheet is closed. Unapproved punches are excluded from the Worked Hours & Wages report. https://kb.7shifts.com/hc/en-us/articles/16350712999187-Employee-approval-of-time-punches-for-admins-managers (snippet only)
- **Exception costs stay out of the export.** Costs such as meal-break attestation are calculated in 7shifts but not included in the ADP export. https://kb.7shifts.com/hc/en-us/articles/4417520088211-ADP-Workforce-Now-US-Payroll-Integration (snippet only)
- **Step count.** No numbered step list was readable.
  - Inferred: Payroll run > resolve conflict punches one by one > "Approve N without conflicts" > close timesheet > export or sync. That is about 4 stages.

---

## 4. Deputy

### Job A: what needs attention

- **Web Dashboard, on the "Me" page.** It has three sections. https://help.deputy.com/hc/en-au/articles/4657365737231-Managing-the-Dashboard-on-the-Deputy-website (snippet only)
  - **Needs Attention:** open shifts and shift swaps.
  - **Needs Approval:** leave requests and timesheets, from all time.
  - **What's happening?:** a daily snapshot of late arrivals, people on leave and birthdays.
- **Open shifts on the dashboard.** Open shifts that need approval appear only within 8 days of their start. Managers are not notified of these requests, but they can see them on the dashboard. Same URL (snippet only).
- **Release note, 2021.** Added a "Leave Requests for me" widget and a list of open-shift requests. https://whatsnew.deputy.com/approve-open-shift-requests-from-the-web-dashboard-4oKRQ4 (snippet only)
- **Mobile manager app, "Today".** It shows counts for on shift, on break, late to clock on, and scheduled later. Tapping a number opens those team members. From there managers can phone or email them, or message via the News Feed. Managers can also message from a timesheet to query a shift. https://help.deputy.com/hc/en-au/articles/4753103029263-Manager-guide-to-the-Deputy-mobile-app (snippet only)
  - Inferred: Today > tap "late" count > tap person > call is about 3 taps.
- **Late clock-on alerts.** These come from the optional Extensions. A reminder goes to the employee, the manager or both after a set number of minutes, and can be limited by location or area. It arrives by push if the app is installed, otherwise by email. https://help.deputy.com/hc/en-au/articles/4692702925839-Can-I-set-up-a-reminder-if-a-team-member-forgets-or-is-late-to-clock-on-off (snippet only)
  - https://help.deputy.com/hc/en-au/articles/4692578333711-Clock-on-off-notifications-and-extensions (snippet only)
- **Missed-shift guidance.** Deputy suggests sending a News Feed message or calling the team member, and keeping a journal entry of the steps taken. https://help.deputy.com/hc/en-au/articles/5943784368655-How-do-I-manage-last-minute-changes-to-the-schedule (snippet only)
- **Leave approvers** are notified through the bell icon (or push) and also see the request on the Dashboard. https://help.deputy.com/hc/en-au/articles/4692803698063-FAQs-for-manager-notifications (snippet only)
- **No daily digest email found.** I found no first-party evidence of one for Deputy.

### Job B: approving timesheets

- **New approval experience.**
  - Supervisors approve only the time portion; pay is then approved automatically. Location Managers and System Administrators approve both.
  - Bulk approval splits in two: "Approve (X)" includes timesheets with warnings, while "Approve with no issues" skips flagged ones.
  - A System Administrator must enable approve-all in Business Settings.
  - Absent timesheets cannot be bulk approved.

  https://help.deputy.com/hc/en-au/articles/6997348381327-Adding-editing-and-approving-Timesheets (snippet only)
- **Moving to the new experience.** https://help.deputy.com/hc/en-au/articles/6997346222735-Introduction-to-the-new-Timesheet-Approval-experience (snippet only)
- **Mobile approval: about 5 steps.**
  1. Open the Timesheets tab.
  2. Pick the location and date.
  3. Tap a timesheet.
  4. Check the details.
  5. Tap Approve.

  Approved timesheets move to the Approved tab. "Select all" then Approve does it in bulk. Edits after approval must be made on the web. https://help.deputy.com/hc/en-au/articles/4753103029263-Manager-guide-to-the-Deputy-mobile-app (snippet only)
- **After approval.**
  - Only approved timesheets export, and only Location Managers and System Administrators can export.
  - The newer export flow asks you to choose a pay calendar and pay run, matched to the payroll date range.
  - A "Paid" status stops further edits until the timesheet is marked unpaid.

  Sources:
  - https://help.deputy.com/hc/en-au/articles/13116516297487-Introduction-to-the-new-Timesheet-Export-experience-Beta (snippet only)
  - https://help.deputy.com/hc/en-au/articles/4689553875471-Approving-timesheets (snippet only; marked "discontinuing")
- **Late definition.** In the new timesheets, Late means the shift has started, there is no clock-in, and the end time has not passed. https://help.deputy.com/hc/en-au/articles/6997348381327-Approving-your-team-s-timesheets (snippet only)

---

## 5. Connecteam

- **Job A: late alerts.**
  - Path: Job Scheduling > Settings > Notifications.
  - The alert reads "A user didn't clock into a shift that started X minutes ago". The manager sets the minutes.
  - It requires turning off "Users can clock in without scheduled shifts".
  - The delivery channel is not stated.
  - The Overview page's Attendance widget shows late employees.

  https://help.connecteam.com/en/articles/10274727-can-i-notify-admins-if-an-employee-is-late-for-a-shift (read 2026-11-21)
- **Job B: approving timesheets.** https://help.connecteam.com/en/articles/5439640-approving-employee-timesheets-for-payroll (read 2026-11-21)
  - **Setup (4 steps):** Time Clock > Settings > Payroll > turn on Timesheets approval; choose who can approve or reopen; optionally require employees to submit.
  - **Bulk approve (3 steps):** select employees > Actions > Approve.
  - **Single approve:** 1 click on the web; 6 taps on mobile.
  - **Locking:** approval locks every day in the payroll cycle. Single days can also be locked with a lock icon.
  - **Progress:** a progress bar shows how many employees have submitted and been approved.
  - **Close Pay Period (4 steps)** after export. Reopening needs the Payroll Manager permission.
  - **Self-approval:** admins can optionally be blocked from approving their own timesheets.
  - **Not covered:** the article does not describe the exception flags.

## 6. Sling

- **Job A: the Roster.** Premium and Business plans can see who is running late, clocked in, on break or done. From the roster, managers can edit timesheets or mark sick call-outs and no-shows. https://support.getsling.com/en/articles/2686633-roster (snippet only)
- **Job A: notifications.** Notifications come by email, push or web browser. Dashboard notifications cover schedules, time-off requests and time-clock activity. https://getsling.com/time-and-attendance-tracking/ (snippet only)
- **Job B: approving timesheets.**
  - New clock activity is saved as a "pending change". An entry needs both a clock-in and a clock-out before it can be approved.
  - On the web, approve one entry from its options button, or check line items (or select all) to bulk approve.
  - On mobile, go to More > Timesheets.

  https://support.getsling.com/en/articles/2093804-how-do-i-approve-pending-timesheets (snippet only)
- **Toast integration.** Approving in Sling does not approve the timesheet in Toast. https://support.getsling.com/en/articles/8981593-sling-toast-admin-manual (snippet only)

## 7. Gusto (Time Tools)

- **Job A: payroll deadline.**
  - Upcoming payrolls show a run-by date and payday on the Pay page. The cutoff is 4pm PT.
  - On mobile, a "Run payroll" task on Home stays visible until payroll is submitted. Outstanding issues are rolled into that task.

  https://support.gusto.com/article/999754831000000/run-a-regular-payroll-for-admins (snippet only)
- **Job A: reminders.** Reminder emails go out when the pay period ends, one to two days before the deadline, and on the due date. These alerts cannot be turned off. Deadlines can also be synced to a calendar from Home > Upcoming.
  - https://support.gusto.com/article/112700542100000/set-up-and-manage-gusto-time-tracking-for-admins (snippet only)
  - https://support.gusto.com/article/100153691100000/Add-payroll-reminders-to-a-personal-calendar (snippet only)
- **Job B: manager review on the web.**
  - Path: Time tracking tab > My employees > open a timesheet > Edit a day > toggle to Approved.
  - "Approve all timesheets" is on the My team's hours page.
  - On mobile: Time tab > choose the pay period > Review > Approve all, or approve one person at a time.

  https://support.gusto.com/article/116295878100000/review-edit-and-approve-gusto-time-tracking-hours-for-managers (snippet only)
- **Job B: approval inside the payroll flow.**
  - Unapproved timesheets add a "Review timesheets" step at the start of the payroll flow.
  - Approval locks the timesheet for everyone, admins included, until it is reversed.
  - Once payroll has paid the hours, the approval cannot be reversed.

  Same URL (snippet only).
  - Inferred: this is the tightest "approve, then pay" coupling of any product here, because the gate sits inside the payroll run.

## 8. ADP (Workforce Now Time & Attendance, ezLaborManager help v18_30; not RUN)

- **Job A: home page exceptions.** Managers open the exceptions list from the Home page, choose View By Type and the pay period, then open "Supervisor Approval Required". Error-level exceptions must be resolved before payroll; warnings and messages are informational.
  - https://otcdc2.adp.com/ezLMHelp/V18_30/WFN/General/StandardUI/en-US/ss_help/ss/timecards-approving_all.htm (snippet only)
  - https://otcdc1.adp.com/ezLMHelp/V18_30/WFN/General/StandardUI/en-US/ss_help/ss/exceptions-intro.htm (snippet only)
- **Job B: approving time pairs.**
  - Tick Approve for each time pair, then Submit.
  - Only error-free time pairs can be approved.
  - Editing an approved timecard removes the approval.
  - If the company requires manager approval, each unapproved time pair raises a "Supervisor Approval Required" exception, which blocks payroll.
  - Closing a pay period follows "End of Period Steps 1-7".

  Sources:
  - https://otcdc2.adp.com/ezLMHelp/V18_30/WFN/General/StandardUI/en-US/as_help/ss/timecard_approvals-intro.htm (snippet only)
  - https://otcdc1.adp.com/ezlmhelp/v18_30/wfn/general/standardui/en-us/as_help/as/projected_payroll-closing_pay_period.htm (snippet only)
- **Marketing claim.** Exception alerts "surface missed punches, edits and more", so managers need not review every timecard line. https://www.adp.com/what-we-offer/time-and-attendance (snippet only)

---

## Cross-competitor patterns

- **One landing page with actionable cards (When I Work, Deputy, 7shifts).** Late and no-show items carry inline fixes:
  - When I Work: Edit Time, Send Reminder, Report Absence, Find Coverage.
  - 7shifts: add a punch or contact the employee.
  - Deputy: call, email or News Feed message.

  Inferred: 1 to 3 taps from alert to action.
- **Pending requests as tappable count blocks with an empty state.** Seen in the 7shifts mobile Overview (green zero state) and Deputy's "Needs Approval" section.
- **Real-time late alerts are configurable and threshold-based.**
  - When I Work: 1 to 30 minutes.
  - Deputy: X minutes.
  - Connecteam: X minutes.
  - Homebase: alerts (late defaulted to 5 minutes).

  These alerts are usually gated: Homebase puts them on paid plans, Deputy behind Extensions, and Connecteam needs a setting change.
- **Bulk approve separates clean timesheets from flagged ones.**
  - 7shifts: "Approve [#] punches without conflicts".
  - Deputy: "Approve with no issues" against "Approve (X)".
  - When I Work: red highlighting plus an explicit ignore for missing entries.
  - ADP: error-level exceptions block payroll.
- **Locking varies.**
  - Approval locks the record in Homebase (opt-in setting), Connecteam and Gusto.
  - Closing the pay period locks it in When I Work and 7shifts.
  - In Deputy, the "Paid" status locks it.
  - Any edit removes approval in When I Work and ADP.
- **Payroll deadline on the owner's home.** Gusto's "Run payroll" Home task and run-by date. When I Work's "Pay Period Complete" and "Pay Period Forecast" cards.
- **Daily digest email.** Homebase's daily email with "Yesterday's Summary". The 7shifts Log Book daily email with a sales snapshot, plus a weekly labor digest. I found none for When I Work or Deputy.

## Gaps

- **Blocked pages.**
  - kb.7shifts.com returned 403 for every article; all 7shifts claims are snippet-only.
  - help.deputy.com returned 403; all Deputy claims are snippet-only.
  - support.joinhomebase.com/hc/... returned 401. The pages I could not read are Timesheets and Payroll Prep, the notifications and alerts page, and Lock timesheets for payroll. The newer /s/article/ pages did fetch.
- **Pages that fetched but lacked the detail.**
  - The When I Work scheduling-only dashboard URL returned 404 (/articles/using-the-dashboard-scheduling-only-beta/).
  - The Homebase late-employee-alerts page fetched but says nothing concrete about manager alerts.
- **Homebase.** No first-party description of the post-sign-in web dashboard layout. No documented contents of the "Yesterday's Summary" email. No documented tap path from a late alert to contacting the employee.
- **When I Work.** No bulk multi-user approve documented. No daily digest email found.
- **Deputy.** No daily digest email found. The new approval article's step list could not be read.
- **7shifts.** No readable numbered step list for the new Payroll run page; the release note is snippet-only.
- **Connecteam.** The delivery channel for late alerts is not stated, and the exception flags in timesheets are not covered in the article read.
- **Sling.** Thin evidence; no dashboard landing description.
- **Gusto.** No desktop Home "to-do" layout confirmed; the run-payroll Home task is documented for mobile.
- **ADP.** The evidence is from the Workforce Now Time & Attendance (ezLM v18_30) help, which is old. No first-party RUN-specific time-approval page was found.
- **Not searched (budget).**
  - Deputy and When I Work app store listings.
  - Official YouTube video descriptions.
  - Square Team, a non-listed competitor.
