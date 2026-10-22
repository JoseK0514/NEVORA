# Employee mobile: organization, clarity and ease of use

October 18, 2026 · Independent review for Jose · Assessment and Claude handoff only

## Overall opinion

**UI recommendation: GO WITH CONDITIONS for the mobile organization reviewed.** The employee portal has a consistent visual system, useful bottom navigation and a clear Requests overview. Profile explains its purpose, but it asks an employee to read too much before reaching its settings. Simplify its headings, group its contents by purpose and make calendar setup optional on screen.

For someone opening Profile for the first time, the page should answer: “What information does my employer hold here, who can correct it, and which app settings can I use?” The current page contains those answers, but spreads them through repeated headings and a large calendar section. This is an expert usability judgment, not a user study or a production release approval.

**Recommended first change:** one Work details section, followed by an App settings group containing Notifications and Add shifts to your calendar, then a compact Sign out action. Keep the existing Profile route and More entry.

## Scope and version

- Jose asked for organization, understandable purpose and user friendliness, then specified mobile. This review concentrates on the employee’s own Profile and checks the surrounding employee pages for navigation consistency.
- Main phone viewport: 390 × 844. Profile also checked at 320 × 760. These are browser viewport checks, not physical iPhone/Android or native-app tests.
- Source: /Users/josek0514/Desktop/NEVORA-UI-READINESS, branch NEVORA-UI-READINESS, HEAD 047d136, “Batch B1+B2: employee phone layout and the time-off draft.”
- Captures 01–14 came from the fictional preview at port 52244. Jose restarted the server during the last navigation. Captures 15–17 came from its replacement at port 57305. The interruption was not a product defect.
- Profile was rechecked after restart. Its page, details and account-panel sources matched the original captured runtime and the current checkout. Availability, notification-inbox and navigation sources also matched at the comparison.
- Home and Schedule were receiving concurrent edits. Home differed between the first preview and the working source; capture 15 records the restarted Home. Treat Home layout recommendations as input to that work, not proof that a later build remains unchanged.
- Codex added only this report and its 17 evidence images under this new review folder. No application code, settings, credentials, schedules, requests, approvals or publications were changed. Existing work remains in place.

This supplements the [earlier employee assessment](/Users/josek0514/.codex/visualizations/2026/10/18/01a14f94-dca3-77e3-bb9c-9ea09a9804c7/employee-portal-inspection/REVIEW.md). Do not reuse its old screenshots as evidence of the current state.

## 1. Mobile journey and health

| Step | What I inspected | General health | Current evidence |
|---|---|---|---|
| 1 | Home: next shift, clock state, to-do list, shortcuts and activity | Understandable; required work needs earlier visibility. Named unpublished location is clearer after restart. | [01](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/employee-mobile-usability-2026-10-18/evidence/01-home-390.jpg), [15](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/employee-mobile-usability-2026-10-18/evidence/15-home-after-restart-390.jpg) |
| 2 | More → Profile; work details, notification state, calendar instructions; narrow phone reflow | Purpose is understandable; headings and grouping need simplification. Labels wrap at 320 px. | [02 More](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/employee-mobile-usability-2026-10-18/evidence/02-more-390.jpg), [03 Profile](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/employee-mobile-usability-2026-10-18/evidence/03-profile-390.jpg), [04 calendar](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/employee-mobile-usability-2026-10-18/evidence/04-calendar-help-390.jpg), [05 narrow](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/employee-mobile-usability-2026-10-18/evidence/05-profile-320.jpg), [17 current first screen](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/employee-mobile-usability-2026-10-18/evidence/17-profile-current-first-screen-390.jpg) |
| 3 | My schedule: week/day controls, assignments, confirmation and planning links | Clear ownership of shifts; keep schedule-before-confirmation order. | [06](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/employee-mobile-usability-2026-10-18/evidence/06-schedule-390.jpg) |
| 4 | Requests overview, Availability, Time off and Shift requests | Overview works well; specific-week availability entry needs attention. | [07 overview](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/employee-mobile-usability-2026-10-18/evidence/07-requests-390.jpg), [08 availability](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/employee-mobile-usability-2026-10-18/evidence/08-availability-390.jpg), [09 time off](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/employee-mobile-usability-2026-10-18/evidence/09-timeoff-390.jpg), [10 shift requests](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/employee-mobile-usability-2026-10-18/evidence/10-shift-requests-390.jpg) |
| 5 | Pay → Hours → Timecards | Statements and Hours grouping helps; Timecards loses that navigation context. | [11 Pay](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/employee-mobile-usability-2026-10-18/evidence/11-pay-390.jpg), [12 Hours](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/employee-mobile-usability-2026-10-18/evidence/12-hours-390.jpg), [16 Timecards](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/employee-mobile-usability-2026-10-18/evidence/16-timecards-390.jpg) |
| 6 | Updates feed | Clear workplace-news purpose; keep explicit review separate from opening. | [13](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/employee-mobile-usability-2026-10-18/evidence/13-updates-390.jpg) |
| 7 | Notifications list | Needs clearer record-specific context; two schedule alerts look identical. | [14](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/employee-mobile-usability-2026-10-18/evidence/14-notifications-390.jpg) |

Full-page screenshots sometimes place sticky navigation/header across the image. Those capture artifacts are not reported as page defects.

## 2. Organization: give Profile a simple structure

### M1 · NOW · ISSUE · “Personal details” and “Work details” repeat the same section

**Where:** Profile. **Evidence:** 03 and 17; [outer header](/Users/josek0514/Desktop/NEVORA-UI-READINESS/src/components/employee-account-panel.tsx:17), [inner heading](/Users/josek0514/Desktop/NEVORA-UI-READINESS/src/components/employee-profile-details.tsx:16).

The page opens with Profile, an explanatory sentence, a calendar shortcut, Personal details, “Your information at work,” then Work details. The employee reads several introductions before the first field. Notifications then sits inside the same Personal details card, although it serves a different purpose.

**Claude should:**

1. Keep Profile as the page title.
2. Use one short purpose sentence: “Your work information and app settings.”
3. Keep one Work details heading, with the identity fields and manager-correction guidance.
4. Follow it with an App settings group. Make Notifications and calendar setup siblings rather than putting Notifications inside Personal details.

**Acceptance:** at 390 px an employee can scan the page and distinguish work identity from app settings. At 320 px, labels and values wrap without clipping or reducing readable text. Do not add an Edit control when the employee lacks that authority.

### M2 · NOW · RISK · Some labels describe the system rather than the employee’s goal

**Where:** Profile. **Evidence:** 03–05, 17; [field labels](/Users/josek0514/Desktop/NEVORA-UI-READINESS/src/components/employee-profile-details.tsx:18), [calendar entry](/Users/josek0514/Desktop/NEVORA-UI-READINESS/src/app/app/profile/page.tsx:16).

“Workspace” names the employer in this fixture, but a first-time employee may not know that term. “Account role: Employee” describes app access, not the person’s job. “Calendar subscription” describes a technical mechanism before explaining its benefit.

**Proposed wording for Claude to review:**

| Current | Proposed | Reason and continuity |
|---|---|---|
| Workspace | Company, if that matches the product’s employer model | Explain whose information the person is viewing. Change display wording only; keep tenant/workspace identity intact. |
| Account role | App access, or keep Account role with a short explanation | Avoid implying that Employee is the person’s job title. Do not invent a job/position field from this role. |
| Calendar subscription | Add shifts to your calendar | Describe the employee’s goal. Keep the existing route and #employee-calendar-title deep link; retain the technical provider instructions inside. |
| Your session | Compact Sign out row | The action already explains its purpose. Preserve the real sign-out form and its protections. |

These are proposed copy changes, not assertions that employees have been tested on these terms. Keep key route/action continuity and the NEVORA design system. Do not replace calendar language with a promise of instant synchronization.

## 3. User friendliness: lower the effort on a phone

### M3 · NOW · RISK · Optional calendar setup occupies too much of Profile

**Where:** Profile → calendar. **Evidence:** 03–05. Profile is 2,263 px tall at 390 px before opening provider help; opening Apple instructions increases it to 2,515 px. The 320 px expanded view is 2,809 px. Those measurements describe this fixture, not a required page-height limit.

**Claude should:** show a collapsed row, “Add shifts to your calendar,” with one line explaining that it adds published shifts to Apple Calendar, Google Calendar or Outlook. Expand setup when the employee chooses it. Keep the main identity summary compact, with visible type and useful spacing.

When a Schedule calendar shortcut or existing calendar hash opens Profile, expand and focus the calendar section. Keep existing provider disclosures. Place the privacy warning beside the link-creation decision and preserve link issue/revoke/recovery behavior. Do not create a link just by opening Profile or expanding help.

**Acceptance:** ordinary Profile visits do not require scrolling through setup instructions. Direct calendar links still work. The employee sees the private-link implications before issuing one. New, active, revoked and unknown-result states retain their correct controls. Only the “no link” read state was inspected here.

### M4 · NOW · RISK · Refresh and sign-out presentation add weight to a simple page

**Where:** Profile’s work details/Notifications card and footer. **Evidence:** 02–03, 17.

Refresh details appears after Notifications, although it refreshes the private profile snapshot. The separate Your session card adds another heading, sentence and large block for Sign out. More already offers Sign out.

**Claude should:** keep a quiet Refresh details action associated with Work details, and use a compact Sign out row at the bottom. Keep both sign-out entry points: More provides quick access from anywhere, and Profile provides an expected account exit. That repetition helps navigation.

The notification-disabled message now says that device alerts are not enabled for the workplace while in-app notifications remain available. **The previous mismatch between a settings promise and unavailable controls was not reproduced in this disabled state.** Keep this improvement; do not add device permission prompts when the feature is off.

**Acceptance:** each action’s scope is clear. Moving presentation does not combine profile and notification data authority. Retry, paused and access-lost states still hide/refetch private data correctly. Device-alert enabled behavior remains a separate test.

## 4. Understandable workflows around Profile

### M5 · NEXT · ISSUE · Availability tells the employee to submit a week but hides that route without a deadline

**Where:** Requests → Availability and other generic availability links. **Evidence:** 08; [context wording](/Users/josek0514/Desktop/NEVORA-UI-READINESS/src/app/app/availability/page.tsx:160), [conditional week entry](/Users/josek0514/Desktop/NEVORA-UI-READINESS/src/app/app/availability/page.tsx:165).

The page says “Your usual week” and “Submit separately for a specific week,” but this no-deadline fixture displays only the usual-week editor. The source exposes its upcoming-week entry only when an availability deadline exists. A new employee cannot follow the instruction from this page.

**Claude should:** provide an explicit, authorized way to choose a specific week, or show why no weekly submission is available. Distinguish “Usual week” from “Specific week” with a clear selected scope. Preserve separate saves/submissions and actual deadline locks. Do not claim that saving regular hours has submitted a dated week, or assume all dates are eligible.

**Acceptance:** a first-time employee can identify what the save affects, find an eligible dated week when allowed, and understand a closed/unavailable state. Test no deadline, future deadline, closed deadline and submitted-unavailable-all-week. This overlaps the earlier W3 proposal; extend that item instead of opening a duplicate task.

### M6 · NOW/NEXT · ISSUE · Notifications omit the context needed to distinguish records

**Where:** Notifications. **Evidence:** 14; [row presentation](/Users/josek0514/Desktop/NEVORA-UI-READINESS/src/components/notification-inbox.tsx:76), [generic destination text](/Users/josek0514/Desktop/NEVORA-UI-READINESS/src/lib/notification-inbox-view.ts:21).

Two rows say Schedule update, show the same time, and both offer “Open record.” Home already distinguishes the affected weeks. The employee must open the alerts to learn which schedule each refers to.

**Claude should:** show the affected schedule week when the authorized notification read model provides it; show the update’s subject or request date for other record types. Use a destination-specific action such as Review schedule or Read update. Keep stable identifiers and current-record checks.

If the read contract lacks those fields, plan a bounded authorized read-model extension. Do not infer the target week from the notification creation date, and do not merge distinct notifications merely because their labels match. Read state and action completion remain separate.

**Acceptance:** two different schedule weeks can be distinguished from the list, including with a screen reader. Opening an alert still does not complete schedule confirmation or message acknowledgment. This also advances the earlier “activity/messages/alerts” clarity recommendation.

### M7 · NOW · ISSUE · Timecards loses the Pay/Hours navigation family

**Where:** Pay → Hours → Timecards. **Evidence:** 11–12 and 16; [Pay tab ownership](/Users/josek0514/Desktop/NEVORA-UI-READINESS/src/lib/navigation.ts:144).

Pay exposes Statements and Hours. Hours opens My time, which links to Timecards. Timecards then drops those section tabs and highlights More in the bottom navigation. The employee appears to leave the time/pay area, even though the page still shows their recorded hours.

**Claude should:** keep the Pay/Hours navigation context on Timecards and provide a direct return to My time. Label the relationship in plain terms: daily punches versus period totals/manager review. Keep the existing Timecards URL. Consolidating their navigation does not require combining their commands or data sources.

**Acceptance:** the employee can move between daily entries, period summaries and statements without returning through Home or guessing which bottom tab owns the page. Preserve recorded-time versus payroll distinctions, correction review, original records and manager approval authority. The open-period “Period information” state looked calm and appropriate on this phone.

### M8 · NEXT · RISK · Home’s required work starts below the first phone screen

**Where:** Home. **Evidence:** 01 and 15.

The next shift is clear, and clock state now sits directly beneath it. Required reviews come afterward. A compact “3 items need your review” link near the greeting would let an employee discover the work before scrolling through the shift and clock cards. Keep the full to-do list below, and preserve its dates and status.

Do this within Claude’s current Home work rather than starting a competing redesign. Keep next-shift time/location prominent, and keep independent source freshness visible. Do not combine Home tasks, unread alerts and recorded time into one count.

The restarted preview names West Office as unpublished, which is more useful than “some locations.” Its phrase “Shifts shown are final” deserves a product terminology check: if publication can be revised, explain that meaning without suggesting the shift can never change. This is a wording risk to resolve against the intended policy, not evidence of a scheduling defect.

## 5. Keep the improvements that work

| Area | Keep | Remaining refinement |
|---|---|---|
| More | Short menu with Profile, Updates, Notifications and Sign out | Keep Profile here; do not add a fifth main phone destination for this change. |
| Requests overview | Start a request and Track your requests groups, with descriptive one-line help | The page fits close to one phone screen. Avoid returning to large explanatory cards. |
| My schedule | Week/day context, assignment list before confirmation, direct planning links | Preserve context on return; no confirmation was submitted in this review. |
| Time off | Full/partial-day choice, optional privacy-conscious note and manager-review explanation | Compact the empty summary if needed; preserve draft handling and approval rules. |
| Pay | Statements and Hours tabs; clear “no published statements” state | The empty explanation repeats across several blocks. Any copy consolidation needs the project’s approved payroll-text review. |
| Updates | Workplace-news description and explicit review state | Distinguish messages from alerts through purpose and record context; do not merge the data models. |
| Profile | Read-only work details, manager-correction guidance and honest device-alert state | Improve hierarchy and optional setup presentation, rather than adding unsupported editing controls. |

## 6. Proposed mobile Profile order

1. **Profile** — Your work information and app settings.
2. **Work details** — name, company and locations; secondary app access/time-zone details. Keep the manager-correction guidance and a quiet Refresh details action here.
3. **App settings** — Notifications; Add shifts to your calendar.
4. **Calendar setup**, expanded on demand or through the existing deep link, with the private-link warning and provider guidance.
5. **Sign out**, as a compact account action.

This is a content/layout recommendation, not a new screen, an implementation or an approved navigation change. Company/app-access wording needs confirmation against product terminology. Keeping the existing route, anchors and action names where required provides continuity.

### Current Profile first screen

![Current employee Profile at phone width](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/employee-mobile-usability-2026-10-18/evidence/17-profile-current-first-screen-390.jpg)

### Notification context that needs improvement

![Two generic schedule notifications on the phone](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/employee-mobile-usability-2026-10-18/evidence/14-notifications-390.jpg)

## 7. Claude handoff and acceptance

**First:** M1–M4 on Profile, plus the bounded navigation-context correction in M7. **Next:** M5’s explicit weekly scope and M6’s record-specific notification context. Reconcile M8 with the active Home changes. Use this report as an addition to the existing employee review, not a second independent redesign backlog.

For each item, check mobile web/PWA at 320 and 390 px, long names, label wrapping, 44 px interactive targets, visible focus, collapsed/expanded states, browser Back, and anchor focus. On physical iOS and Android, also check safe areas, keyboard/large-text behavior, back gestures and assistive technology. Preserve useful desktop behavior, but this report makes no new desktop verification claim.

Preserve feature gates, private snapshots, sign-out protection, calendar token privacy, real deadline rules, record-specific authorization, and the distinction between read and completed action. Do not shrink text or remove decision-relevant warnings to reduce scrolling. Payroll/legal wording stays as approved until its separate content decision.

**Provisional proposal scorecard:** score order is Usability / Familiarity / Trust / Accessibility / Brand / Durability / Cost / Continuity, each 0–2. Accessibility scores remain provisional until implementation/device checks.

| Items | Proposed scores | Total | Condition |
|---|---|---|---|
| M1–M4 | 2 / 2 / 2 / 1 / 2 / 2 / 2 / 2 | 15/16 | Keep private data boundaries, calendar warnings, existing routes and working deep links. |
| M5–M6 | 2 / 2 / 2 / 1 / 2 / 2 / 1 / 2 | 14/16 | Confirm authorized week/record context; a read-model extension may be needed. |
| M7 | 2 / 2 / 2 / 1 / 2 / 2 / 2 / 2 | 15/16 | Keep period review and daily correction commands separate. |
| M8 | 2 / 2 / 2 / 1 / 2 / 2 / 2 / 1 | 14/16 | Reconcile active Home work and confirm publication terminology. |

### Evidence limits and completion state

This review observed read views, menus and calendar help disclosures. It did not issue a calendar token, enable device alerts, save availability, submit time off/corrections, confirm a schedule, acknowledge an update, mark notifications read, send a message or run a payroll operation. It did not verify a populated pay statement or physical-device/calendar connection.

No automated tests, build or lint suite ran for this documentation-only assessment. The restarted tab’s sampled warning/error log returned no entries; that is not an application-wide error certification. The preview restart was recovered, and the phone Timecards and current Profile checks completed.

No application code changed. The shared checkout remains at HEAD 047d136 with existing concurrent work. New files belong only to this review folder. Owner for any implementation: Claude, in the existing UI chat, within the scope Jose chooses. Next review: compare mobile before/after and run the affected behavior/contract checks; this assessment grants no deployment or policy approval.

## 8. Does the mobile UI look professional?

Added at Jose’s request after the usability review.

**Yes: the interface looks like a credible professional business application. Its finishing is uneven. Recommend a focused mobile UI refinement pass using the existing NEVORA design system.** The visual identity is coherent enough to retain. The next investment should improve hierarchy, density and consistency between pages.

This is a visual judgment from the rendered interface. It does not certify production behavior or accessibility compliance.

### What already supports a professional appearance

- The NEVORA wordmark, restrained teal palette and neutral surfaces establish a recognizable identity.
- The typography is readable and the icon family is coherent across the reviewed screens.
- The next-shift card has a clear time/location hierarchy. Requests separates starting a task from tracking it.
- Thin dividers and grouped rows give the Requests overview a calm, deliberate appearance.

Fresh mobile evidence: [18 Home](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/employee-mobile-usability-2026-10-18/evidence/18-visual-home-390.jpg), [19 Requests](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/employee-mobile-usability-2026-10-18/evidence/19-visual-requests-390.jpg), [20 Profile](/Users/josek0514/Desktop/NEVORA-UI-READINESS/docs/product/reviews/employee-mobile-usability-2026-10-18/evidence/20-visual-profile-390.jpg). These captures use the replacement fictional preview at port 54355, still reported from HEAD 047d136 with concurrent changes. They supplement the original 17 captures. Profile reported a 390 px document width in a 390 px viewport; its navigation bounds ended at the 844 px viewport edge. This is a bounded layout check.

### What prevents it from feeling fully finished

| Dimension | Judgment | What Claude should refine |
|---|---|---|
| Brand and typography | Professional foundation | Keep the existing palette, fonts, icons and wordmark. Use their approved tokens consistently. |
| Mobile composition | Uneven | Profile stacks large work-detail, calendar and session blocks. Apply M1–M4 so the page reads as an intentional account/settings screen. |
| Visual hierarchy | Needs refinement | Give the main task the strongest emphasis. Repeated introductions and a prominent calendar shortcut compete with Profile’s ordinary purpose. |
| Density and spacing | Needs refinement | Use compact grouped rows for settings and secondary information. Keep larger cards for distinct tasks or meaningful summaries. Reduce padding where it adds scrolling without helping comprehension. |
| Action consistency | Needs refinement | Use the same primary/secondary treatment for comparable actions. Keep Refresh quiet, and reserve stronger emphasis for the action the employee came to perform. Preserve clear disabled, pending and unavailable states. |
| Language and navigation | Needs refinement | M5–M7 address unclear weekly availability, generic alerts and the lost time/pay navigation context. These affect perceived polish as much as decoration. |

These are refinements to the existing recommendations, not another backlog. The repeated Profile headings and calendar density are the clearest starting points. Requests is a useful internal reference for compact mobile organization; do not copy one layout indiscriminately across different tasks.

### Exact direction for Claude

Keep NEVORA’s visual identity and complete a mobile polish pass. Simplify Profile’s cards and headings, standardize spacing and action emphasis, shorten repeated explanations, and preserve context between related pages. Use the current Requests overview as a reference for compact grouping. Keep readable text, 44 px targets, privacy boundaries and existing business controls.

Prioritize M1–M4 and M7, then M5–M6; reconcile M8 with active Home work. Avoid cosmetic changes that add scrolling, hide required actions or imply unavailable features. No broad theme replacement or new decorative assets are needed to address these findings.

Acceptance: an employee can identify each screen’s purpose and main action without reading several introductory blocks; repeated settings use one consistent row pattern; phone layouts preserve readable labels, visible state and useful navigation. Review the affected loading, empty, error, disabled and success states on physical iOS/Android as well as mobile web/PWA before declaring the finish complete.

For this follow-up I reviewed three steps: (1) Home, professional hierarchy with required work lower down; (2) Requests, strong compact grouping; (3) Profile, consistent branding with excessive section weight. No application code changed and no new mutation/state-transition tests ran.
