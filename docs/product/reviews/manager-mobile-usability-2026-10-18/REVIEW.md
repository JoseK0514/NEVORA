# Manager mobile review: organization, clarity and UI

October 18, 2026 · Independent assessment for Jose · Claude implementation handoff

## Recommendation

**The manager portal needs a structural cleanup of its navigation and page hierarchy.** A manager has to learn several overlapping ways to reach requests, schedules, people and time review. Some links open a different-looking dashboard with another six tabs. The resulting confusion has observable causes.

**UI recommendation: NO-GO for calling the manager mobile experience finished.** Correct the context-free approval path and the reproduced display defects below. Consolidate the duplicate destinations before the next visual finishing pass. This is a UI recommendation, not a production release decision.

The NEVORA identity, typography and icon family provide a professional foundation. The manager experience does not yet feel like one coherent application: its modern pages and older dashboard views use different headers, navigation treatment, density and page titles. Fix ownership of tasks, then apply the same visual system to the remaining pages.

**First instruction to Claude:** retain the four main phone destinations, make each one own a clear job, and route shortcuts into those destinations with the relevant context. Preserve server authority, permissions, history, financial boundaries and existing command recovery.

## Scope and evidence

- Reviewed as fictional manager AUDIT-M, Morgan Rivera, using the local preview at port 54355. This is an actual Manager session, not an Owner session used as a substitute.
- Main viewport: 390 × 844. Inbox, Search and More were also inspected at 320 × 760.
- Source checkout: /Users/josek0514/Desktop/NEVORA-UI-READINESS, branch NEVORA-UI-READINESS, HEAD 7b094d0. The branch was ahead of its remote and had existing work. Codex did not commit, push, deploy or modify application code.
- The preview ran from a separate local runtime copy. The manager dashboard, Inbox, today view, Timecards component/CSS, Home page, Schedule page, Scheduling rules and availability-summary sources matched the checkout when compared.
- Employee refinements began changing shared files during inspection. The navigation diff at comparison affected Employee/Lead Timecards ownership, not the Manager tab branch. Notifications and global styles were also receiving work. This report describes the captured runtime; reconcile those changes and retest before declaring an item still open or fixed.
- Evidence: 34 saved screenshots in this report’s evidence folder. Full-page captures can place sticky headers/navigation across the image. Those capture artifacts are not layout findings.
- Scope covers mobile organization, understandable purpose, representative forms, read navigation and professional appearance. No decisions, saves, exports, publications, recovery codes, PINs, messages or other business mutations were executed.

The [owner report](/Users/josek0514/.codex/visualizations/2026/10/18/01a14f94-dca3-77e3-bb9c-9ea09a9804c7/owner-portal-inspection/REVIEW.md) and [employee mobile report](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/employee-mobile-usability-2026-10-18/REVIEW.md) cover shared components. Fix a shared cause once and verify each affected role. Do not copy the same finding into three independent backlogs.

## 1. What each manager page should be for

This is the proposed organization. Keep the existing bottom-tab locations and URLs where practical.

| Main place | Manager’s question | Content it should own | Role of other appearances |
|---|---|---|---|
| **Home** | What is happening today, and what should I look at first? | Today’s staffing/clock summary, a short priority summary, this week’s publication progress | Shortcuts open Inbox, Schedule or Team with context. Home does not need another full task-review implementation. |
| **Inbox** | What needs my decision or intervention? | Missed punches, pending requests and actionable exceptions, with visible filters | Full detail opens the authorized review. Setup and historical planning findings stay distinguishable from urgent work. |
| **Schedule** | Who is working, and how do I change or publish the plan? | One editable roster with week/location/day context, Add shift and Build and publish | Templates, copy and rules remain tools within this planning area. |
| **Team** | Who is this person, and what work information can I manage? | One directory, contact/work details, scheduling eligibility and contextual support actions | Team metrics can be a summary/subview. Recovery returns to the same directory or person. |
| **More → Time and reporting** | Which hours need review, and what can I report or export? | Timecards, Time exports and Insights | Daily attendance/correction review needs an explicit entry in this family while retaining its separate authority. |
| **More → Scheduling tools** | How do I reuse or configure the plan? | Templates and Scheduling rules | Existing Schedule shortcuts remain useful. |
| **More → Workplace updates** | What should I communicate to the team? | Updates and their audience/review status | Notifications remains a personal alert list reached through the bell. |
| **More → My account** | Where are my own statements and session controls? | My pay and Sign out | Keep the manager’s private statements separate from team exports. |

Suggested one-line purpose text:

- Home: “Today’s staffing and the next actions for your team.”
- Inbox: “Review requests and resolve problems.”
- Schedule: “Plan shifts and publish each location’s schedule.”
- Team: “Find people and manage their work details.”
- Timecards: “Review recorded hours for a period.”
- Insights: “Review staffing and recorded-time trends.”
- Updates: “Send workplace announcements and check who has reviewed them.”

These are proposed copy/layout changes. Payroll/legal wording remains as approved until its content decision. Grouping navigation does not grant any new access.

## 2. Reproduced defects: address these first

### D1 · P1 · ISSUE · Inbox offers approval without request details

The time-off row shows Alexandra Rivera’s name and that she is waiting for review. It has Decline/Approve buttons but no dates, full/partial-day duration or note. The detailed Time off page shows Oct 28–29, Full day and the fictional note. Inbox also advertises swipe decisions.

Evidence: [03 Inbox](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/03-inbox-390.jpg), [04 filtered](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/04-inbox-requests-filter-390.jpg), [05 detailed review](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/05-timeoff-review-390.jpg). [Inbox decision form](/Users/josek0514/Desktop/NEVORA-UI-READINESS/src/components/manager-inbox.tsx:35), [direct submit controls](/Users/josek0514/Desktop/NEVORA-UI-READINESS/src/components/time-off-review-actions.tsx:11).

**Claude:** remove context-free Inbox decision buttons/swipes and use the existing complete review path. Keeping inline decisions would require an authorized read model that displays the decision details first. A confirmation showing only the name would not resolve the problem.

**Acceptance:** full-day and partial-day requests expose person, dates/interval, note and current state before a decision. Keyboard and gestures cannot bypass the detail. Keep server permission and stale-state checks. No approval or swipe was executed here.

Shared finding: owner O1. This manager session reproduces it.

### D2 · P2 · ISSUE · Home uses the wrong availability population

Home says 0 of 10 availability received; Team availability shows 0 of 5, with five eligible people missing. All active roles make up the ten-person team; Employee/Lead roles make up the five eligible availability submissions.

Evidence: [01 Home](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/01-home-390.jpg), [06 Team availability](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/06-team-availability-390.jpg). [Both summary counts](/Users/josek0514/Desktop/NEVORA-UI-READINESS/src/lib/data/availability-submissions.ts:80), [eligible roles](/Users/josek0514/Desktop/NEVORA-UI-READINESS/src/lib/data/availability-submissions.ts:148), [Home uses active count](/Users/josek0514/Desktop/NEVORA-UI-READINESS/src/app/app/page.tsx:78).

**Claude:** use eligibleEmployees for submission progress and percentage, and activeEmployees for team size. Test mixed roles, partial submissions, submitted-unavailable-all-week and zero eligible employees. Do not change submission eligibility.

Shared finding: owner O2.

### D3 · P2 · ISSUE · Disabled phone timecard buttons look enabled

The open period prevents approval/finalization, but Approve timecard looks like an active teal button. The sampled button reported disabled=true, opacity=1, background rgb(7,117,114), white text.

Evidence: [17 Timecards](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/17-timecards-390.jpg), [existing guards](/Users/josek0514/Desktop/NEVORA-UI-READINESS/src/components/timecards.tsx:201).

**Claude:** give disabled actions a distinct readable visual state beside their blocking reason. Keep disabled semantics and server restrictions. Verify enabled, open-period blocked, self-review blocked and finalized states. This observation is a presentation defect, not evidence of an authorization bypass.

Shared finding: owner O4.

### D4 · P2 · ISSUE · All-day coverage looks like zero hours

Recurring full-day coverage displays “12:00 AM – 12:00 AM.”

Evidence: [13 Scheduling rules](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/13-scheduling-rules-390.jpg), [time rendering](/Users/josek0514/Desktop/NEVORA-UI-READINESS/src/app/app/schedule/settings/page.tsx:136).

**Claude:** display All day for 00:00–24:00, and distinguish midnight at the end of a day in other intervals. Preserve stored boundaries and calculations. Verify normal daytime, full-day and end-at-midnight windows.

Shared finding: owner O3.

## 3. Organization and redundancy

### MG1 · NOW/NEXT · ISSUE · Two navigation systems compete for the same jobs

“All requests” from Time off or Shift requests opens a Welcome back dashboard with Overview, Attendance, Schedule, Team, Requests and Activity tabs. Home becomes active in the bottom bar. Its white header and floating rounded navigation look different from the main teal-shell pages.

Its Schedule tab opens a second editable roster. Its Team tab opens a different Team overview. A manager cannot rely on the same word leading to the same place.

Evidence: [08 All requests](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/08-all-requests-legacy-390.jpg), [09 second schedule](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/09-legacy-schedule-390.jpg), [10 primary Schedule](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/10-primary-schedule-390.jpg), [14 directory](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/14-team-directory-390.jpg), [25 Team overview](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/25-legacy-team-overview-390.jpg). [Embedded dashboard tabs](/Users/josek0514/Desktop/NEVORA-UI-READINESS/src/components/manager-dashboard.tsx:490).

**Claude should consolidate:**

| Current destination | Recommended treatment | Continuity requirement |
|---|---|---|
| /app?view=requests | Open Inbox with its Requests filter | Add supported filter/return-state handling; update All requests and notification/footer links. Preserve old week/request context. |
| /app?view=schedule | Open the primary /app/schedule | Preserve week, day, location and employee context that exists. Remove the parallel editable presentation. |
| /app?view=team | Open Team/Employees with a purposeful metrics summary/subview | Preserve availability/hour metrics and their links. Do not maintain a second directory. |
| /app?view=attendance | Retain the attendance/correction review, remove the unrelated dashboard tab shell, and add an explicit entry from the time-review family | Keep its existing URL/authority usable. Daily notes and correction decisions remain separate from period approval. |
| /app?view=activity | Present recorded event history with a clear Activity title and consistent shell | Keep event history and old links. Route unresolved operational work to Inbox. |

The manager page title should describe the current task. Welcome back is not a useful title for Requests, Team hours or Activity. Keep the existing bottom tabs; no fifth main destination is needed.

**Acceptance:** follow a request link and remain in the request/Inbox context; follow Schedule and reach one editable roster; old links still resolve; back navigation and focus remain useful.

### MG2 · NOW/NEXT · ISSUE · Home and Inbox repeat work while filters sit below unrelated content

Home shows a 40-task queue. Inbox shows the same 40-task total plus a separate missed-punch panel. Selecting Requests removes the other task groups but leaves all three missed-punch cards above the selected request. At 320 px the first screen is occupied by the header and missed punches; the request filters are lower down.

Evidence: [01 Home](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/01-home-390.jpg), [03 Inbox](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/03-inbox-390.jpg), [04 Requests selected](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/04-inbox-requests-filter-390.jpg), [32 narrow Inbox](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/32-inbox-320.jpg). [Lead panel precedes filters](/Users/josek0514/Desktop/NEVORA-UI-READINESS/src/components/manager-inbox.tsx:69).

**Claude:** make Home a short priority/status summary that opens Inbox. Put Inbox filters near the heading. When Requests is selected, compact missed punches to a visible count/link so the selected request list is reachable without scrolling through unrelated cards. Keep urgent status discoverable.

Separate current/future actionable work from historical coverage review and setup tasks. The captured queue labels 21 coverage gaps “Needs attention now,” including earlier days in the selected week. Ten missing weekly hour targets and a missing deadline sit in the same overall work total. Use explicit groups such as urgent intervention, requests, planning/setup and history; preserve the underlying findings.

**Acceptance:** a manager can find the pending request from Home or Inbox, see what needs action now, and distinguish setup from current exceptions. Do not relabel historical gaps as resolved or delete them.

### MG3 · NOW · ISSUE · More mixes team operations and personal account tools

More is a flat list: Updates, Timecards, Insights, Payroll export, My pay, Templates and Scheduling rules. These serve different goals.

Evidence: [02 More](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/02-more-390.jpg), [34 narrow More](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/34-more-320.jpg).

**Claude:** use short headings for Time and reporting, Scheduling tools, Workplace updates and My account, following the purpose map above. Retain Search, existing destinations and the Close action. Use compact rows rather than more cards.

**Acceptance:** the manager can distinguish exporting team time from viewing personal pay. The sheet scrolls within the available phone height, works with the keyboard and keeps all authorized links reachable. Do not add Owner settings or financial permissions to simplify the menu.

## 4. Workflow and usability

### MG4 · NOW · ISSUE · Links lose the context the manager already chose

All three missed-punch Review timecard links go to generic /app/timecards, so the manager must find the person again. Account recovery’s Back to team opens the legacy Team dashboard instead of the directory. Add shift from the current Sunday schedule omits the selected date; Create shift defaults to Monday, Oct 12.

Evidence: [03 Inbox](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/03-inbox-390.jpg), [10 Schedule](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/10-primary-schedule-390.jpg), [27 Create shift](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/27-create-shift-390.jpg), [30 recovery](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/30-account-recovery-390.jpg). [Missed-punch URL](/Users/josek0514/Desktop/NEVORA-UI-READINESS/src/components/manager-today.tsx:72), [Add shift URL](/Users/josek0514/Desktop/NEVORA-UI-READINESS/src/app/app/schedule/page.tsx:266).

**Claude:** carry person and period into timecard review, selected day into Create shift, and originating week/day/location/person into return paths. Keep existing location propagation: Add shift already carries a selected location, and Create shift supports date/location inputs. Recovery should have a contextual employee entry and return to that person or directory.

Translate an unavailable setup review into a specific next step with a context link. The employee Scheduling tab says “Operational review is unavailable until scheduling hour settings have been explicitly established. No maximum is created by this review,” but gives no link to the settings.

**Acceptance:** moving from a known person/day into a form does not require finding them again. Keep self-review restrictions, identity verification, protected original records and stale-state checks. A deep link to a person does not authorize a decision about them.

### MG5 · NOW · RISK · Primary Schedule is a long people list before its publication tools

The captured page is 3,297 px. Seven of ten people have no assignments on the selected day, but all have full rows. Build and publish sits below the roster. The first shift starts below several layers of heading, week, locations, totals, team heading, search and day controls.

Evidence: [10 Schedule](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/10-primary-schedule-390.jpg), [11 build/publish](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/11-build-publish-390.jpg), [12 tools](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/12-schedule-tools-390.jpg).

**Claude:** compact the week/location controls and expose a Build and publish entry near Add shift. Show assigned people first, with a counted expandable group for people without assignments. Preserve search and a direct way to assign those people.

Label weekly totals as weekly totals and selected-day information as selected-day information. Make Full week discoverable even when the day strip scrolls to Sunday. Keep per-location publication states.

**Acceptance:** first shift information and publication tools are easy to reach on a phone; unscheduled people remain findable; day/location context survives the flow. Do not publish all locations through one ambiguous action.

### MG6 · NEXT · RISK · Scheduling rules combines several tasks into a 7,826 px page

Existing section anchors help, but the manager still gets staffing, ten employees’ hour settings, fourteen recurring coverage rows and policy controls in one long form.

Evidence: [13 rules](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/13-scheduling-rules-390.jpg).

**Claude:** present focused panels for Staffing and hours, Recurring coverage, and Trade/coverage policy. Add employee/missing-target filters and group coverage by location/day. Preserve existing anchors.

Keep the current command boundaries: staffing and weekly hours share one save; the policies have separate saves. Preserve unsaved values across panel/filter changes. Do not silently unmount fields and accidentally save only the visible subset, invent default hours or introduce autosave.

**Acceptance:** a manager arriving for one missing target reaches that person and the correct Save without traversing unrelated coverage/policy forms. Retain exact policy settings and validation.

### MG7 · NEXT · RISK · Team records repeat a large identity summary and its edit fields

The employee page shows contact, primary location and access role in a large header, then repeats them in an editable form. The directory also places several filters above the first person.

Evidence: [14 directory](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/14-team-directory-390.jpg), [15 employee record](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/15-employee-record-390.jpg), [16 scheduling](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/16-employee-scheduling-390.jpg).

**Claude:** keep search visible and put secondary directory filters in a compact disclosure. Use a concise employee identity header, then a deliberate Edit details entry to the existing authorized form. Keep Scheduling as a distinct section.

Keep access roles separate from job qualifications, and portal access separate from Clocker PINs. Preserve activation, deactivation and identity-verification explanations where they affect a decision. The Add employee form’s sections and What happens next guidance are useful; do not remove them just to shorten the page.

**Acceptance:** find a person, read their useful work details and deliberately enter the relevant edit. Retain all authorized actions, IDs, role restrictions and validation.

### MG8 · NEXT · RISK · Time exports and Insights show too much before the next useful step

Time exports is 3,561 px in a period with zero finalized cards. It still displays ten unselectable people before a summary and population/handoff section. Insights is 6,866 px and repeats the ten people across Schedule vs actual and Hours by employee, including repeated recorded totals.

Evidence: [18 exports](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/18-time-exports-390.jpg), [19 Insights](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/19-insights-390.jpg).

**Claude:** on exports, show the blocking summary and a period-preserving Timecards link first; put the unready roster detail behind a disclosure. Present selection, mapping and population/handoff as distinct stages. Keep the complete population available separately from selected exportable timecards.

For Insights, combine the repeated employee time lists into one comparison containing published plan, recorded time, breaks and difference. Keep unavailable values, definitions and approved export meaning. Shorten duplicate period totals and empty sections without hiding their status.

**Acceptance:** zero ready timecards has an immediate, useful next step; a populated export preserves selection/revision/custody semantics. Reports do not turn unavailable comparisons into zeros or recorded hours into payroll calculations. Payroll/legal copy needs its separate approved content decision.

## 5. Understandable language and data

### MG9 · NOW · ISSUE/RISK · Similar-looking numbers mean different things without enough context

Home and Inbox both showed 40 tasks in this Manager session. There is no observed mismatch between those totals. The three missed punches are a separate panel, not three additional items proven to belong to that total.

Home’s 0 started-not-clocked-in count describes ongoing shifts; Inbox’s three no-punch shifts had ended. Attendance’s zero notes/corrections describes recorded-time review, not every scheduled shift without a punch. Those are different populations. Clarify the nouns and scopes instead of adding them together.

Timecards labels all ten open-period cards Need attention solely because the period is open. Treat normal waiting as neutral presentation while retaining the server’s approval blocker. Reserve exception emphasis for actionable issues such as open entries, breaks and pending corrections.

Evidence: [01 Home](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/01-home-390.jpg), [03 Inbox](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/03-inbox-390.jpg), [17 Timecards](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/17-timecards-390.jpg), [24 attendance](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/24-attendance-time-review-390.jpg). [Current attention count](/Users/josek0514/Desktop/NEVORA-UI-READINESS/src/components/timecards.tsx:161).

**Acceptance:** a manager can tell whether a number refers to today, the selected week, eligible submissions, recorded clock notes, pending decisions or a still-open period. D2 corrects the actual denominator defect.

### MG10 · NOW · RISK · Labels reveal backend concepts and sometimes change between entry and destination

| Observed wording | Claude should clarify | Preserve |
|---|---|---|
| Automatic scheduling requires Draft targets: Main Office | Explain that automatic building requires an editable draft schedule and identify the blocked location/state | “Draft targets” here refers to schedule targets, not employees’ missing weekly hour targets. Do not change scheduling eligibility or automatically reopen a published schedule. |
| Operational review unavailable until hour settings explicitly established | State which saved hour settings are needed and link to that employee’s settings | No fabricated maximum/default or automatic settings save. |
| Payroll export / Time exports / Payroll exports | Adopt one approved public label across entry, tab and heading | Existing URL, search synonyms, financial/data meanings and protected copy. |
| Clocker recovery → Action recovery review | Name saved Clocker action lookup in the heading/subtitle | Receipt lookup stays separate from retry, time correction, account recovery and PIN changes. |
| Notifications → Your inbox, while the main Inbox owns work | Use Notifications/alerts terminology consistently | Unread status and action completion stay separate. |
| Welcome back above Requests/Team/Activity | Use a task-specific page title | Existing links and relevant history. |

Evidence: 08, 11, 16, 18, 22, 25, 26, 31. The draft-only restriction is also explicit in [generation controls](/Users/josek0514/Desktop/NEVORA-UI-READINESS/src/components/schedule-generation-controls.tsx:44).

Keep short explanations near decisions. Use help/disclosures for secondary detail. Do not remove payroll/legal or security-critical guidance under a general “less text” instruction.

## 6. Professional appearance and information ownership

### MG11 · NEXT · ISSUE/RISK · Manager screens look like two generations of UI

The modern Home/Inbox/Schedule uses a dark teal masthead and flat bottom bar. The dashboard subviews use a white masthead, a large pale greeting card, much smaller content text and a floating rounded navigation bar. Filter treatments also vary.

Evidence: [01 modern Home](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/01-home-390.jpg), [08 legacy Requests](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/08-all-requests-legacy-390.jpg), [09 legacy Schedule](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/09-legacy-schedule-390.jpg), [24 attendance](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/24-attendance-time-review-390.jpg).

**Claude:** apply one approved shell, typography scale, spacing system, control treatment and active-navigation behavior after consolidating routes. Keep teal, Inter, Phosphor and the NEVORA wordmark. Use compact grouped rows for secondary lists; reserve large cards for distinct decisions/summaries. Correct D3’s disabled states.

The manager needs an organization/UI upgrade. The existing brand foundation can support it. Palette changes alone would leave the duplicate workflows intact.

**Acceptance:** related manager pages retain the same shell and readable type; the main action has clear emphasis; the active tab matches the task; no unrelated greeting hero consumes the first screen. Verify loading, empty, disabled, error and success presentation as part of implementation.

### MG12 · NOW/NEXT · ISSUE/RISK · Activity, alerts and decisions overlap without clear ownership

The Activity view mixes a recorded publication event with unresolved earlier-week coverage gaps. Notifications shows two generic Schedule update rows with the same time and Open record action; the affected weeks are not shown. Its Requests footer goes back to the legacy dashboard.

Evidence: [26 Activity](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/26-legacy-activity-390.jpg), [22 Notifications](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/22-notifications-390.jpg), [21 Updates](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/21-updates-390.jpg).

**Claude:** keep unresolved work in Inbox, recorded events in Activity/history, company announcements in Updates, and personal alerts in Notifications. Link all of them into the one current authorized record/review. Show affected week, request date or message subject when the authorized read model supplies it.

Shared Notifications improvements are already in progress from employee M6. Rebase/retest that work rather than duplicating it. Do not infer a schedule week from an alert’s creation date, merge distinct alerts, invent historical events or equate marking read with completing a decision.

## 7. Implementation order for Claude

1. **Correct D1–D4.** Use the full request review, correct the eligible denominator, distinguish disabled controls and render all-day time clearly. Add targeted behavior/data regression checks.
2. **Consolidate MG1 and MG2.** One schedule, one request-work landing, one directory, clear time-review entry. Update old shortcuts and preserve context/Back behavior. Keep the four primary bottom tabs.
3. **Apply MG3–MG7.** Group More, carry context, shorten the schedule/rules/team layouts. Preserve save boundaries and unsent edits.
4. **Finish MG8–MG12.** Reduce reporting/export duplication, clarify data scope and copy, unify the shell and verify shared alert changes.

Deliver before/after screenshots and route traces for the affected manager journeys. A management explanation or a removed fixture is not finding closure; reproduce the changed behavior.

### Required acceptance scenarios

- From Home, reach the pending time-off request, read its dates/interval/note and return to the same Inbox filter. No context-free decision path remains.
- Open a missed-punch review for a named employee and retain that person/period. Self-review and server permission restrictions still apply.
- Select a day/location, enter Add shift and cancel/return without reselecting known context.
- Open one missing-hour-target task and reach the employee’s correct rule section, preserving unrelated unsaved settings.
- Compare open-period waiting with actual clock exceptions and a closed eligible period. UI emphasis and enabled state match the reason.
- Use All requests and legacy links without entering a second navigation system. The active main tab remains meaningful.
- Distinguish personal My pay from team time exports; ordinary Manager navigation does not gain Owner or payroll-review permissions.

For every proposal, keep desktop access and existing routes usable. Mobile web/PWA acceptance includes 320/390 px, long names, safe-area padding, visible focus, keyboard/back behavior, 44 px targets and reduced motion. Physical iOS/Android, large text, VoiceOver/TalkBack, offline and retry states still need device testing. The current product is a PWA; a native wrapper is not verified here.

### Product scorecard

Provisional design scores use Usability / Familiarity / Trust / Accessibility / Brand / Durability / Cost / Continuity, each 0–2. These assess the proposed direction; they do not claim implementation/accessibility has passed.

| Items | Scores | Total | Condition |
|---|---|---|---|
| D1–D4 | 2 / 2 / 2 / 1 / 2 / 2 / 2 / 2 | 15/16 | Preserve server rules and reproduce corrected states. |
| MG1–MG4 | 2 / 2 / 2 / 1 / 2 / 2 / 1 / 1 | 13/16 | Old routes, roles, filters and task context stay usable. |
| MG5–MG7 | 2 / 2 / 2 / 1 / 2 / 2 / 2 / 1 | 14/16 | Keep discoverability, form state and command boundaries. |
| MG8–MG10 | 2 / 2 / 2 / 1 / 2 / 2 / 1 / 2 | 14/16 | Retain approved data/copy meanings and authorization. |
| MG11–MG12 | 2 / 2 / 2 / 1 / 2 / 2 / 2 / 1 | 14/16 | Apply shared tokens and recheck ongoing alert work. |

## 8. Journey coverage and evidence index

VERIFIED means the listed read interaction was observed. ISSUE names reproduced UI behavior. RISK identifies proposed improvement or an untested consequential path.

| Step | Area inspected | General health | Evidence |
|---|---|---|---|
| 1 | Home and More | ISSUE/RISK: tasks need clearer ownership; More mixes purposes | [01](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/01-home-390.jpg), [02](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/02-more-390.jpg) |
| 2 | Inbox, Requests filter, detailed time-off review | ISSUE: detail-free decision controls and buried filtering; detailed review is clear | [03](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/03-inbox-390.jpg), [04](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/04-inbox-requests-filter-390.jpg), [05](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/05-timeoff-review-390.jpg), [32 narrow](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/32-inbox-320.jpg) |
| 3 | Team availability and Shift requests | ISSUE/RISK: denominator disagreement and repeated missing cards; empty shift-review page is clear | [06](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/06-team-availability-390.jpg), [07](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/07-shift-requests-390.jpg) |
| 4 | All requests and dashboard Schedule | ISSUE: duplicate destinations, generic heading, different shell | [08](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/08-all-requests-legacy-390.jpg), [09](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/09-legacy-schedule-390.jpg) |
| 5 | Primary Schedule, Build/publish, tools, Create/edit shift | VERIFIED forms; RISK: long roster and lost day context; no saves or publication | [10](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/10-primary-schedule-390.jpg), [11](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/11-build-publish-390.jpg), [12](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/12-schedule-tools-390.jpg), [27](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/27-create-shift-390.jpg), [28](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/28-edit-shift-390.jpg) |
| 6 | Rules and Templates | ISSUE/RISK: long form and all-day display; empty template library inspected | [13](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/13-scheduling-rules-390.jpg), [20](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/20-templates-390.jpg) |
| 7 | Team directory, employee Details/Scheduling, Add employee | VERIFIED forms; RISK: density and repeated identity blocks; no employee change | [14](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/14-team-directory-390.jpg), [15](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/15-employee-record-390.jpg), [16](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/16-employee-scheduling-390.jpg), [29](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/29-add-employee-390.jpg) |
| 8 | Timecards and Time exports | ISSUE: disabled appearance; RISK: normal waiting and long blocked export flow | [17](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/17-timecards-390.jpg), [18](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/18-time-exports-390.jpg) |
| 9 | Insights | VERIFIED reads; RISK: repeated employee tables and open-period urgency | [19](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/19-insights-390.jpg) |
| 10 | Updates, Notifications and My pay | VERIFIED reads; ISSUE/RISK: generic alerts and mixed terminology; no statement available | [21](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/21-updates-390.jpg), [22](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/22-notifications-390.jpg), [23](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/23-my-pay-390.jpg) |
| 11 | Attendance, legacy Team/Activity, account and Clocker recovery | VERIFIED read/forms; ISSUE/RISK: overlap, inconsistent return paths and terminology | [24](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/24-attendance-time-review-390.jpg), [25](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/25-legacy-team-overview-390.jpg), [26](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/26-legacy-activity-390.jpg), [30](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/30-account-recovery-390.jpg), [31](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/31-clocker-action-recovery-390.jpg) |
| 12 | Search and More on a narrow phone | VERIFIED: search, Escape/focus return and reachable More controls | [33](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/33-search-320.jpg), [34](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/34-more-320.jpg) |

### The duplicate Requests destination

![Manager All requests opens another dashboard](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/08-all-requests-legacy-390.jpg)

### The modern Inbox for the same manager

![Manager Inbox with missed punches and task groups](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/manager-mobile-usability-2026-10-18/evidence/03-inbox-390.jpg)

## 9. Limits and handoff state

This was an expert mobile inspection, not a timed employee study, backend certification, full accessibility audit or release gate execution. No automated unit/integration/build/lint suite ran. Inbox’s sampled 320 px document width equaled its 320 px viewport; that does not certify all screens against overflow.

Read forms and loading states were observed. No approval/decline, swipe decision, clock punch/correction, employee/role change, schedule save/copy/build/publish, template save/apply, deadline/policy change, CSV generation, population/financial mutation, private pay download, recovery-code/PIN issuance, notification read-state change or real message delivery was executed. Populated shift-decision, successful export/recovery and published-statement states remain unverified.

The ordinary Manager session did not expose Owner Settings or payroll-run approval/configuration. That is a role/capability boundary, not a missing feature. The absence of those links is not a security certification.

Codex created only this report and its evidence folder. Shared application changes belong to the existing work and were preserved. No commits, pushes or deployments were made. Implementation owner: Claude in the existing UI chat, within the scope Jose selects. Next gate: manager before/after evidence and targeted checks, followed by independent reproduction of the affected findings.
