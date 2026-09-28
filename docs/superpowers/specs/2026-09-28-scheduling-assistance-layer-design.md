# Scheduling Assistance Layer Design

**Date:** 2026-09-28
**Status:** Approved direction; implementation pending
**Product:** Fuel Scheduler
**Scope:** Scheduling assistance for managers and employees before Clock In / Clock Out phase

## 1. Purpose

Fuel Scheduler already contains the core scheduling engine and the main manager/employee workflows. This phase adds an assistance layer so users do not have to manually discover what needs attention.

The product should answer, within seconds:

- **Manager:** What requires action, which location or employee is affected, and what should I do next?
- **Employee:** When do I work next, what do I still need to do, what changed, and are there eligible shifts I can pick up?

The assistance layer must be operational, not decorative. It should reuse existing scheduling rules and data instead of creating a second source of truth.

## 2. Design choice

Use a **hybrid, event-aware assistance architecture**.

Live scheduling facts continue to be derived from existing authoritative tables and domain logic:

- schedules and shifts
- availability
- time off
- coverage rules
- employee hour targets
- exchanges
- call-outs
- acknowledgements

Small durable records are added only where current state cannot answer the question reliably:

1. explicit weekly availability submission,
2. publication history / published schedule revisions,
3. revision-aware acknowledgement context,
4. notification action links and read state.

The existing notifications table is reused rather than replaced.

## 3. Goals

### Manager goals

- One prioritized action center on the existing manager dashboard.
- Explicit weekly availability submission status.
- Direct navigation from an issue to the workflow that resolves it.
- Suggested employees inside common scheduling workflows.
- Clear publication-change summary.
- Reliable acknowledgement follow-up.
- Location-level readiness at a glance.

### Employee goals

- A useful “My week” dashboard.
- Next shift and weekly scheduled hours.
- Weekly availability submission/deadline status.
- Current acknowledgement status.
- Eligible open coverage opportunities.
- Pending request outcomes.
- Clear schedule-change summaries after publication.

### Shared goals

- In-app transactional notifications.
- Contextual help in the workflow where confusion is likely.
- Mobile-first readability and actionability.
- No duplicated business rules.

## 4. Non-goals

The following are intentionally deferred until after scheduling assistance and Clock In / Clock Out are stable:

- payroll calculation,
- payroll exports,
- labor-cost forecasting,
- sales-versus-labor optimization,
- attendance scoring or disciplinary points,
- external SMS/email/push notification delivery,
- fully automated AI schedule generation,
- advanced analytics dashboards.

## 5. Architecture

The assistance layer is split into five bounded units.

### 5.1 Manager assistance service

Builds normalized manager action items from existing domain facts. It does not write scheduling data.

Inputs include schedule health, coverage gaps, hour balances, missing hour targets, pending time-off requests, pending exchanges, pending call-outs, availability submissions, availability deadline, schedule acknowledgement state, and location publication state.

Each action item contains:

- stable type,
- severity,
- title,
- supporting detail,
- affected employee/location/date where applicable,
- exact action URL,
- sort priority.

The dashboard renders this normalized list rather than rebuilding rules in JSX.

### 5.2 Employee week service

Builds one normalized weekly summary for the authenticated employee:

- next published shift,
- current-week scheduled hours,
- weekly availability submission status,
- deadline state,
- acknowledgement state,
- eligible open-coverage count,
- pending request count/status,
- recent relevant publication changes.

The employee dashboard consumes this service.

### 5.3 Availability submission service

Tracks whether the employee explicitly submitted weekly availability.

This is separate from weekly_availability_windows because an employee can intentionally submit zero available hours. An empty window set must still count as a valid submission.

Manager seeding from normal availability when a deadline is configured does not count as an employee submission.

### 5.4 Publication revision service

Records immutable snapshots when a schedule is explicitly published.

A revision is week-wide so a single acknowledgement can continue to represent the employee’s published week across locations.

Each revision stores a snapshot of the published shifts visible at that publication point. The revision service supports:

- first publication,
- comparison with the prior revision,
- manager pre-publish summary,
- employee-specific change summary,
- revision-aware acknowledgement checks.

Revision snapshots are an audit/change-history layer in this phase; existing scheduling tables remain the operational source of truth.

### 5.5 Notification service

Uses the existing notifications table.

It creates concise, actionable in-app notifications for meaningful events and provides unread/read state. Notifications are not used as the source of truth for requests or schedules.

## 6. Data model

Create migration 0004_assistance_layer.sql.

### 6.1 weekly_availability_submissions

Columns:

- week_start date, not null
- employee_id text, not null, references employees(id) on delete cascade
- submitted_at timestamptz, not null, default now()
- updated_at timestamptz, not null, default now()
- primary key (week_start, employee_id)

Behavior:

- saveWeeklyAvailabilityAction replaces weekly windows and upserts this row in the same database transaction.
- Re-submission updates updated_at.
- Deadline seeding does not create a submission row.
- Zero weekly windows plus a submission row means “submitted, unavailable all week.”

### 6.2 schedule_publication_revisions

Columns:

- id text primary key
- week_start date, not null
- revision_number integer, not null, greater than zero
- source_type text, not null, one of PUBLISH, EXCHANGE, CALLOUT, or MANAGER_MUTATION
- source_id text, nullable, identifies the schedule/exchange/call-out when available
- affected_location_id text, nullable, references locations(id)
- created_by text, not null, references employees(id)
- created_at timestamptz, not null, default now()
- unique (week_start, revision_number)

A new revision is created whenever employee-visible published schedule state changes. Explicit publish is the primary source, but approved exchanges, approved call-outs, and manager mutations to a schedule that was already PUBLISHED at mutation time must also record a revision until publish-state isolation is hardened. Ordinary edits to a DRAFT schedule do not create publication revisions.

### 6.3 schedule_publication_revision_shifts

Columns:

- id text primary key
- revision_id text, not null, references schedule_publication_revisions(id) on delete cascade
- source_shift_id text, nullable
- schedule_id text, not null
- location_id text, not null
- employee_id text, not null
- date date, not null
- start_time time, not null
- end_time time, not null
- notes text, nullable
- is_designated_lead boolean, not null, default false
- is_callout_approved boolean, not null, default false

Indexes should support revision + employee and revision + location lookups.

The snapshot contains all currently published shifts for the week after the publish operation so revisions are directly comparable.

source_shift_id is intentionally not a cascading foreign key. History must remain valid if the operational shift later changes or is removed.

### 6.4 schedule_acknowledgements

Add publication_revision_id text referencing schedule_publication_revisions(id).

New acknowledgements store the latest publication revision.

Existing acknowledgement rows remain valid for migration compatibility but are treated as legacy acknowledgements until the next publication/acknowledgement cycle.

### 6.5 notifications

Reuse the existing table and add optional action_href text plus optional event_key text with a unique constraint.

event_key provides idempotency for retryable business actions so the same event does not create duplicate user notifications.

No separate notification system is needed.

## 7. Revision and acknowledgement behavior

### First publication

- Create revision 1 with source_type PUBLISH.
- Snapshot currently published shifts for the week.
- Notify employees who have published shifts.
- Their acknowledgement state becomes outstanding.

### Subsequent publication

Before committing publication, compare the proposed location schedule with that location’s state in the latest publication revision.

Manager summary can report:

- shifts added,
- shifts removed,
- time changed,
- employee reassigned,
- relevant lead/call-out state changes when applicable.

After successful publish:

- create the next week revision in the same database transaction as the publication-state write,
- snapshot all currently published shifts,
- commit the business change and revision together,
- create notifications after the transaction commits and only for employees whose published shift set changed,
- derive acknowledgement status from the employee’s acknowledged revision versus the latest revision.

For employee-visible changes caused by approved exchanges, approved call-outs, or current post-publication manager mutations, record the same week-wide revision immediately after the successful business mutation. Those revisions use the appropriate source_type and source_id so change history remains complete.

### Acknowledgement

When an employee acknowledges:

- store the current latest publication revision ID,
- show the acknowledgement timestamp,
- do not delete history.

If a later revision does not change that employee’s shift set, the employee may still be treated as acknowledged. The comparison helper determines this by comparing the employee’s snapshot rows between the acknowledged revision and latest revision.

If their shift set changed, acknowledgement becomes outstanding and the UI shows the employee-specific changes.

### Existing acknowledgement mutation behavior

The current application clears week acknowledgements from several manager actions before publication. This must be replaced by revision-aware acknowledgement logic. Draft edits should not be treated as a newly published state.

## 8. Manager action center

The existing manager dashboard remains the single command center.

Do not create a second manager inbox page unless later scale requires it.

### Action categories

**Urgent**

- approved call-out creating uncovered responsibility,
- upcoming coverage gap,
- stale schedule issue that blocks an employee workflow.

**Needs review**

- time-off request,
- exchange approval,
- call-out review,
- employee below/above target,
- employee with changed published schedule not acknowledged.

**Missing input**

- employee weekly availability not submitted,
- employee weekly hour target missing,
- availability deadline missing,
- location coverage windows not configured.

### Priority

Sort by:

1. operational urgency,
2. affected date/time,
3. approval age,
4. stable type/name tie-break.

Do not use arbitrary AI ranking.

### Interaction

Each row has one primary action:

- Resolve coverage
- Review request
- Review hours
- Set target
- Set deadline
- View availability
- View acknowledgements

Links preserve the relevant week, location, employee, or request context.

## 9. Availability submission tracking

Manager dashboard/status shows:

- submitted employees / active employees,
- deadline time,
- number still missing.

A detail view on the availability surface shows:

- Submitted
- Not submitted
- Submitted unavailable all week

The status must not infer submission from whether weekly windows exist.

Employee availability clearly shows:

- Submitted
- Not submitted
- Locked after deadline

Re-saving updates the submission timestamp.

## 10. Suggested replacement employees

Reuse the existing eligibility/ranking rules:

1. active employee,
2. eligible for location,
3. available for the requested time,
4. no overlapping shift,
5. no approved time off,
6. target-hour/fairness ranking,
7. overtime warning behavior consistent with existing schedule validation.

When date, location, start, and end are known in coverage-gap resolution, add-shift flow, or replacement workflow, show the strongest eligible candidates inline.

Display concise reasons such as:

- Available · 8h below target
- Available · 24h scheduled
- Available · under target 2 prior weeks

Do not present a candidate as “best” without explaining the operational factors.

The existing coverage suggestions page remains the deeper review surface.

## 11. Manager publication experience

The publish action has three states.

### Ready

No warnings and no prior publication changes requiring explanation.

### Needs review

Existing publish-readiness warnings remain, with a change summary when this is a republish.

### Republish changes

Show:

- added shifts,
- removed shifts,
- changed hours,
- reassigned employees,
- number of affected employees.

The manager can inspect detail before confirming publication.

Publication remains an explicit manager action.

## 12. Employee “My week” dashboard

The employee dashboard replaces generic navigation cards with operational information.

Top summary:

- next shift,
- scheduled hours this week,
- availability status/deadline,
- schedule acknowledgement status.

Secondary actions:

- eligible open shifts,
- pending time-off / call-out / exchange status,
- recent schedule changes.

Example summary:

32h scheduled · 4 shifts · Next: Tue 8:00 AM · Availability submitted

If no published shift exists, the dashboard says so directly rather than showing an empty metric.

## 13. Schedule-change highlighting

For an employee, compare their shift rows between the last acknowledged revision and latest publication revision.

Supported change types:

- shift added,
- shift removed,
- start/end time changed,
- location changed when represented by a replacement snapshot,
- assignment changed into or out of the employee.

Presentation examples:

- Tuesday: 8:00 AM–4:00 PM → 9:00 AM–5:00 PM
- Friday 7:00 AM–3:00 PM added
- Sunday shift removed

On first publication, say “A new schedule is available” instead of presenting all shifts as changes.

## 14. Notifications

### Persisted transactional notifications

Create notifications for:

- schedule published / relevant republish,
- time-off approved or denied,
- call-out approved or denied,
- coverage/swap request requiring the employee’s response,
- exchange approved or denied,
- meaningful published schedule change.

### Dynamic reminders

Do not create background jobs in this phase for reminders that can be derived at page load, such as:

- availability deadline approaching,
- schedule acknowledgement outstanding.

Those appear dynamically on dashboards.

### Notification UI

Add a small notification center accessible from the application shell.

Requirements:

- unread count,
- newest first,
- mark one as read,
- mark all as read,
- direct action link when available,
- concise title/body,
- empty state.

No SMS/email/push delivery in this phase.

## 15. Contextual help

Use inline explanations and small help disclosures, not a large documentation portal.

Initial topics:

- Availability vs. time off
- Offer shift vs. unable to work
- How replacement suggestions are calculated
- What acknowledgement means
- Draft vs. publish
- Why a scheduling action may be blocked

Help text explains consequence and next action rather than repeating labels.

## 16. Permissions

- Owner and Manager: full manager assistance.
- Lead: current time-off review permission remains; assistance access follows existing role permissions and must not silently expand manager powers.
- Employee: only personal schedule/request data and eligible open coverage.

All server actions re-check permissions. Dashboard visibility is not authorization.

## 17. Error and edge-case handling

### Availability

- Zero windows can be a valid explicit submission.
- Missing submission is not the same as unavailable.
- Submissions after a passed deadline are rejected.
- Inactive employees are excluded from manager submission totals.

### Revisions

- Publication/revision writes are atomic in one database transaction.
- Revision numbering is protected by the unique week/revision constraint; concurrent retries must safely retry rather than overwrite history.
- A failed revision write must not report successful publication assistance state.
- Comparison uses normalized shift data so row order does not produce false changes.
- First publication has no previous diff.

### Notifications

- Failure to create a notification must not roll back an otherwise valid business transaction unless the notification is required to communicate a safety-critical state.
- Notification generation should be idempotent where an action can be retried.
- A stale action link lands on a valid page with a clear current-state message.

### Suggestions

- Suggestions never bypass schedule validation.
- If no employee qualifies, say why in aggregate and provide the deeper coverage view.
- A manager can still choose another employee if normal validation permits it.

## 18. Testing strategy

### Pure domain tests

Add tests first for:

- manager action prioritization,
- availability submission state,
- publication diffing,
- employee-specific revision diffing,
- acknowledgement validity across revisions,
- employee week summary,
- notification event selection,
- suggestion explanation formatting.

### Data-layer/integration checks

Verify:

- submission upsert works with zero windows,
- deadline seeding does not mark submitted,
- revision numbers increase safely,
- revision snapshots are immutable,
- acknowledgement stores revision,
- notification action links persist.

### Existing regression suite

Every implementation stage continues to pass scheduling validation, coverage ranking, schedule health, copy week, exchange validation, publish readiness, and dashboard status tests.

### Browser/E2E flows

Manager:

1. set deadline,
2. observe missing availability submissions,
3. employees submit including one all-week unavailable,
4. create schedule,
5. resolve coverage with inline suggestions,
6. publish,
7. inspect acknowledgements,
8. change schedule and republish,
9. verify affected employee is surfaced.

Employee:

1. see My week,
2. submit availability,
3. view published schedule,
4. acknowledge,
5. receive a changed-schedule notification,
6. inspect exact changes,
7. acknowledge new state,
8. review request outcomes/open coverage.

Test desktop and mobile layouts.

## 19. Implementation sequence

### Stage 1 — Assistance data foundation

- migration 0004,
- availability submission data methods,
- revision/snapshot data methods,
- revision diff domain logic,
- revision-aware acknowledgement helpers,
- notification data methods.

### Stage 2 — Manager assistance

- normalized manager action builder,
- availability submission counts/details,
- dashboard action center integration,
- inline replacement suggestions,
- pre-publish / republish change summary,
- acknowledgement follow-up detail.

### Stage 3 — Employee assistance

- employee week service,
- employee dashboard redesign,
- availability status,
- open-shift summary,
- pending requests,
- schedule-change detail,
- revision-aware acknowledgement UI.

### Stage 4 — Notification/help and QA

- notification center,
- event notifications,
- contextual help,
- responsive/mobile QA,
- complete E2E scenario,
- accessibility and copy review.

## 20. Rollout and deployment

Development workflow remains:

1. implement locally,
2. test/typecheck/lint/build locally,
3. review local UI,
4. batch commit,
5. push to development,
6. deploy one Vercel preview,
7. run E2E against development Neon,
8. promote only after explicit approval.

Database migration is applied to the development Neon branch first and validated before any production migration.

No main or production changes are part of initial implementation.

## 21. Success criteria

Scheduling assistance is ready when:

- a manager can identify all meaningful current-week issues from the dashboard without manually visiting every feature,
- availability “submitted” status is explicit and trustworthy,
- replacement suggestions are available where managers actually fill gaps,
- republishing shows what changed,
- acknowledgement reflects publication revisions,
- an employee can understand their week and outstanding actions from the home screen,
- employees can see concrete relevant schedule changes,
- transactional in-app notifications have useful direct links,
- help appears where workflow ambiguity occurs,
- all existing scheduling behavior continues to pass regression tests,
- desktop and mobile workflows are usable without visual crowding.

## 22. Known follow-up before production hardening

The current schedule implementation mutates operational shift rows in place after publication. Publication revisions in this design provide reliable history, diffs, and acknowledgement context, but they do not by themselves guarantee that an unpublished manager edit is invisible to employees.

Before relying on strict draft-versus-published isolation in production, perform a dedicated publish-state hardening pass. That pass should decide whether employee-facing schedules and exchange/call-out flows read immutable publication snapshots or whether the operational schedule model should become versioned.

This limitation is intentionally called out rather than hidden inside the assistance work.
