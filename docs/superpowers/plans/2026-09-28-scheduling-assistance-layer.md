# Scheduling Assistance Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Add a proactive scheduling assistance layer that tells managers and employees what matters next, while preserving the existing scheduling engine as the operational source of truth.

**Architecture:** Keep live scheduling intelligence derived from existing schedules, shifts, availability, requests, exchanges, call-outs, coverage rules, and hour targets. Add durable records only for explicit weekly-availability submission, publication revisions/snapshots, revision-aware acknowledgements, and actionable notification metadata. Build normalized assistance services between raw data and UI so dashboards do not duplicate business rules.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Neon PostgreSQL 17 via @neondatabase/serverless, Vitest 5, ESLint.

**Spec:** docs/superpowers/specs/2026-09-28-scheduling-assistance-layer-design.md

## Global Constraints

- Work locally first; do not push or deploy until explicit approval.
- Apply schema changes to the Neon development branch before production.
- Keep existing schedules/shifts as the operational source of truth in this phase.
- Reuse the existing notifications table; do not add external SMS/email/push delivery.
- Do not add payroll, labor-cost forecasting, attendance scoring, advanced analytics, or AI schedule generation.
- Owner/Manager permissions remain manager-level; Lead permissions do not silently expand.
- Suggestions never bypass existing shift validation.
- Use sentence-case product copy and the existing application design system.
- Behavioral changes follow TDD: failing test first, verify failure, minimal implementation, verify green.
- Every task finishes with npm test, npm run typecheck, and the task-specific verification; major UI/data milestones also run npm run lint and npm run build.

## Review Focus

1. **Zero-hour availability submission:** an employee who intentionally submits no available windows must count as Submitted, not Not submitted. Covered in Task 2.
2. **Concurrent/retried publication revision creation:** retries must not overwrite or duplicate a week revision. Covered in Task 4.
3. **Unaffected employees after republish:** a new week revision that does not change an employee's shift set must not force that employee to re-acknowledge. Covered in Task 5.
4. **Notification retry/idempotency:** retrying a business action must not create duplicate notifications for the same user/event. Covered in Task 6.
5. **No valid replacement candidate:** the manager must get a clear empty result and existing validation must remain authoritative. Covered in Task 9.

---

## File Structure

New focused modules:

- src/lib/assistance/availability-submission.ts — pure submission-state helpers.
- src/lib/assistance/publication-diff.ts — normalized schedule snapshot comparison.
- src/lib/assistance/manager-actions.ts — manager action-center normalization/prioritization.
- src/lib/assistance/employee-week.ts — employee weekly assistance summary.
- src/lib/assistance/notification-events.ts — deterministic notification event selection/copy.
- src/lib/assistance/suggestion-explanation.ts — human-readable coverage-candidate explanation.
- src/lib/data/availability-submissions.ts — manager/employee submission queries.
- src/lib/data/publication-revisions.ts — revision/snapshot persistence.
- src/lib/data/notifications.ts — notification CRUD/read-state/idempotent insert.
- src/lib/data/coverage-suggestions.ts — shared candidate-loading logic used by coverage and add-shift surfaces.
- src/lib/data/employee-week.ts — employee assistance data composition.
- src/app/app/notifications/actions.ts — mark-read server actions.
- src/components/notification-center.tsx — shell notification UI.
- src/components/manager-action-list.tsx — manager action-center renderer.
- src/components/help-note.tsx — reusable contextual help disclosure.
- db/migrations/0004_assistance_layer.sql — assistance schema additions.

Existing files stay responsible for their current domain and are modified only where that domain emits/consumes assistance state.

---

### Task 1: Create the assistance schema migration

**Files:**
- Create: db/migrations/0004_assistance_layer.sql
- Reference: db/migrations/0001_initial.sql
- Reference: db/migrations/0003_schedule_assistance.sql

**Interfaces:**
- Consumes: current employees, locations, schedule_acknowledgements, notifications tables.
- Produces: weekly_availability_submissions, schedule_publication_revisions, schedule_publication_revision_shifts, schedule_acknowledgements.publication_revision_id, notifications.action_href, notifications.event_key.

- [ ] **Step 1: Write the migration with idempotent DDL**
  - weekly_availability_submissions primary key: (week_start, employee_id).
  - schedule_publication_revisions unique key: (week_start, revision_number).
  - revision source_type CHECK: PUBLISH, EXCHANGE, CALLOUT, MANAGER_MUTATION.
  - revision snapshot indexes: (revision_id, employee_id) and (revision_id, location_id).
  - add nullable publication_revision_id to schedule_acknowledgements.
  - add nullable action_href and event_key to notifications.
  - add unique partial index for notifications event_key when event_key is not null.

- [ ] **Step 2: Verify SQL formatting and repository diff**
  Run: git diff --check -- db/migrations/0004_assistance_layer.sql
  Expected: no output.

- [ ] **Step 3: Apply the migration to the development Neon branch only**
  Use project rough-fire-63258908, branch br-spring-frost-b8wzl2qi, database fuel_scheduler.
  Expected: migration succeeds with no production/main branch write.

- [ ] **Step 4: Verify schema on development Neon**
  Confirm all three new tables/columns/indexes exist and current data remains readable.

- [ ] **Step 5: Commit**
  Commit message: feat: add scheduling assistance schema

---

### Task 2: Track explicit weekly availability submission

**Files:**
- Create: src/lib/assistance/availability-submission.ts
- Create: src/lib/assistance/availability-submission.test.ts
- Create: src/lib/data/availability-submissions.ts
- Modify: src/lib/data/week-settings.ts
- Modify: src/app/app/availability/actions.ts
- Modify: src/app/app/availability/page.tsx

**Interfaces:**
- Produces: AvailabilitySubmissionState = "NOT_SUBMITTED" | "SUBMITTED" | "SUBMITTED_UNAVAILABLE" | "LOCKED".
- Produces: AvailabilitySubmissionStatus = { state: AvailabilitySubmissionState; submitted: boolean; windowCount: number; submittedAt?: string; updatedAt?: string }.
- Produces: getAvailabilitySubmissionStatus(employeeId: string, weekStart: string): Promise<AvailabilitySubmissionStatus>.
- Produces: getAvailabilitySubmissionSummary(weekStart: string): Promise<{ activeEmployees: number; submittedEmployees: number; unavailableAllWeek: number; missingEmployeeIds: string[] }>.
- Updates: replaceWeeklyAvailability(employeeId, weekStart, windows) now atomically replaces windows and upserts weekly_availability_submissions.

- [ ] **Step 1: Write failing pure tests**
  Tests:
  - explicit submission with zero windows => SUBMITTED_UNAVAILABLE.
  - windows without a submission row => NOT_SUBMITTED.
  - submitted windows => SUBMITTED.
  - passed deadline => LOCKED while preserving submitted/not-submitted detail in supporting fields.

- [ ] **Step 2: Run failing test**
  Run: npx vitest run src/lib/assistance/availability-submission.test.ts
  Expected: FAIL because helpers do not exist.

- [ ] **Step 3: Implement the pure submission-state helper**
  Signature: buildAvailabilitySubmissionState(input: { submitted: boolean; windowCount: number; deadlinePassed: boolean }): { state: AvailabilitySubmissionState; submitted: boolean }.

- [ ] **Step 4: Verify pure tests pass**
  Run: npx vitest run src/lib/assistance/availability-submission.test.ts
  Expected: PASS.

- [ ] **Step 5: Add data queries**
  - list active employees and explicit submission rows.
  - distinguish zero windows from missing submission.
  - exclude inactive employees from manager totals.

- [ ] **Step 6: Make employee save atomic**
  Modify replaceWeeklyAvailability so delete/insert windows + submission upsert execute in one Neon transaction.
  Do not change setAvailabilityDeadline seeding behavior; it must not write a submission row.

- [ ] **Step 7: Surface employee submission status**
  Availability page shows Submitted / Not submitted / Submitted unavailable all week / Locked using existing page styling.

- [ ] **Step 8: Verify behavior and regressions**
  Run: npm test && npm run typecheck
  Expected: all tests pass.

- [ ] **Step 9: Development Neon integration check**
  Save a week with zero windows for a test employee and verify one submission row exists with zero weekly windows; verify deadline seeding alone creates no submission row.

- [ ] **Step 10: Commit**
  Commit message: feat: track weekly availability submissions

---

### Task 3: Implement publication snapshot diffing

**Files:**
- Create: src/lib/assistance/publication-diff.ts
- Create: src/lib/assistance/publication-diff.test.ts

**Interfaces:**
- Produces: PublishedShiftSnapshot with sourceShiftId?, locationId, employeeId, date, startTime, endTime, notes?, isDesignatedLead, isCalloutApproved.
- Produces: PublicationChange union with ADDED, REMOVED, TIME_CHANGED, EMPLOYEE_REASSIGNED, LOCATION_CHANGED, LEAD_CHANGED, CALLOUT_CHANGED.
- Produces: diffPublishedShifts(previous: PublishedShiftSnapshot[], next: PublishedShiftSnapshot[]): PublicationChange[].
- Produces: diffEmployeePublishedShifts(previous, next, employeeId): PublicationChange[].
- Produces: didEmployeeShiftSetChange(previous, next, employeeId): boolean.

- [ ] **Step 1: Write failing tests for normalization and diff behavior**
  Assert:
  - row-order differences produce no changes.
  - same source shift with changed time => TIME_CHANGED.
  - reassignment from employee A to B => EMPLOYEE_REASSIGNED affecting both employees.
  - deleted/added shifts are detected.
  - first publication can be represented as all ADDED but caller can label it "new schedule".
  - unchanged employee in a changed week returns false from didEmployeeShiftSetChange.

- [ ] **Step 2: Run failing test**
  Run: npx vitest run src/lib/assistance/publication-diff.test.ts
  Expected: FAIL.

- [ ] **Step 3: Implement deterministic comparison**
  Normalize by sourceShiftId when present; use a stable fallback composite key for history rows without a source ID.

- [ ] **Step 4: Verify tests pass**
  Run: npx vitest run src/lib/assistance/publication-diff.test.ts
  Expected: PASS.

- [ ] **Step 5: Commit**
  Commit message: feat: compare published schedule revisions

---

### Task 4: Persist publication revisions and snapshots

**Files:**
- Create: src/lib/data/publication-revisions.ts
- Modify: src/lib/data/schedules.ts
- Modify: src/app/app/schedule/actions.ts
- Test: src/lib/assistance/publication-diff.test.ts
- Integration: development Neon

**Interfaces:**
- Consumes: PublishedShiftSnapshot and diff helpers from Task 3.
- Produces: getLatestPublicationRevision(weekStart: string): Promise<PublicationRevision | null>.
- Produces: listRevisionShifts(revisionId: string): Promise<PublishedShiftSnapshot[]>.
- Produces: recordPublishedWeekRevision(input: { weekStart: string; sourceType: RevisionSourceType; sourceId?: string; affectedLocationId?: string; createdBy: string }): Promise<PublicationRevision>.
- Produces: publishScheduleWithRevision(input: { locationId: string; weekStart: string; managerId: string }): Promise<{ published: boolean; revision?: PublicationRevision }>.
- Guarantees explicit publish status update + revision + snapshot are one database transaction.

- [ ] **Step 1: Add pure retry-policy test**
  Add a testable helper shouldRetryRevisionConflict(errorCode: string): boolean; assert unique_violation 23505 retries and unrelated errors do not.

- [ ] **Step 2: Run the focused test and verify failure**
  Run: npx vitest run src/lib/assistance/publication-diff.test.ts
  Expected: FAIL for missing retry helper.

- [ ] **Step 3: Implement revision queries**
  - generate revision ID in application code.
  - calculate next revision_number in INSERT SELECT.
  - snapshot all currently PUBLISHED week shifts after the publish update.
  - retry the whole publication transaction on revision-number unique conflict with a bounded retry count.

- [ ] **Step 4: Replace publishSchedule usage**
  publishScheduleAction calls publishScheduleWithRevision rather than publishing then separately clearing acknowledgements.

- [ ] **Step 5: Verify focused tests and typecheck**
  Run: npm test && npm run typecheck
  Expected: PASS.

- [ ] **Step 6: Development Neon integration check**
  Publish a development week twice and confirm revision numbers are 1 then 2 and revision 1 snapshot remains unchanged. Then trigger two revision-record attempts concurrently for the same week and verify successful retries produce distinct monotonically increasing revision numbers with no overwritten snapshot.

- [ ] **Step 7: Commit**
  Commit message: feat: record published schedule revisions

---

### Task 5: Make acknowledgements revision-aware

**Files:**
- Modify: src/lib/data/acknowledgements.ts
- Modify: src/app/app/schedule/acknowledge-actions.ts
- Modify: src/app/app/schedule/page.tsx
- Modify: src/app/app/schedule/actions.ts
- Create or extend: src/lib/assistance/publication-diff.test.ts

**Interfaces:**
- Consumes: getLatestPublicationRevision, listRevisionShifts, didEmployeeShiftSetChange.
- Produces: getEmployeeAcknowledgementState(weekStart: string, employeeId: string): Promise<{ acknowledged: boolean; acknowledgedRevisionId?: string; latestRevisionId?: string; needsAcknowledgement: boolean }>.
- Produces: getAcknowledgementSummary(weekStart) with revision-aware acknowledged count.
- Changes: acknowledgeScheduleWeek stores latest publication_revision_id.

- [ ] **Step 1: Write failing acknowledgement validity tests**
  Assert:
  - employee acknowledges revision 1 => acknowledged.
  - revision 2 changes that employee => needs acknowledgement.
  - revision 2 changes only another employee => remains acknowledged.
  - no latest revision => cannot acknowledge.
  - legacy acknowledgement without revision is treated as needing a new acknowledgement once a revision exists.

- [ ] **Step 2: Run focused tests and verify failure**
  Run: npx vitest run src/lib/assistance/publication-diff.test.ts
  Expected: FAIL.

- [ ] **Step 3: Implement revision-aware acknowledgement helpers**
  Do not delete acknowledgement rows for ordinary DRAFT edits.

- [ ] **Step 4: Stop clearing acknowledgements on explicit publish**
  publishScheduleAction must rely on the new publication revision rather than deleting all week acknowledgements. Leave mutation-time clearWeekAcknowledgements behavior in place until Task 10 adds revision hooks to those mutations, so no intermediate implementation loses existing protection.

- [ ] **Step 5: Update employee schedule acknowledgement UI**
  Use needsAcknowledgement rather than presence/absence of a week row.

- [ ] **Step 6: Verify**
  Run: npm test && npm run typecheck && npm run lint
  Expected: PASS.

- [ ] **Step 7: Commit**
  Commit message: feat: make schedule acknowledgements revision aware

---

### Task 6: Build idempotent notification persistence

**Files:**
- Create: src/lib/data/notifications.ts
- Create: src/lib/assistance/notification-events.ts
- Create: src/lib/assistance/notification-events.test.ts

**Interfaces:**
- Produces: NotificationEvent = { employeeId; type; title; body; actionHref?; eventKey }.
- Produces: createNotification(event: NotificationEvent): Promise<boolean>, inserting on conflict(event_key) do nothing.
- Produces: listNotifications(employeeId: string, limit?: number), countUnreadNotifications(employeeId), markNotificationRead(id, employeeId), markAllNotificationsRead(employeeId).
- Produces deterministic event builders for schedule, time-off, call-out, swap/coverage outcomes.

- [ ] **Step 1: Write failing event-selection tests**
  Assert:
  - changed employee on republish gets one event with stable eventKey.
  - unchanged employee gets no republish notification.
  - same source event for the same employee produces identical eventKey.
  - the same source event for two different employees produces different eventKeys.
  - time-off approved/denied event links to /app/requests?tab=my.
  - exchange outcome links to the appropriate exchange tab.

- [ ] **Step 2: Run failing tests**
  Run: npx vitest run src/lib/assistance/notification-events.test.ts
  Expected: FAIL.

- [ ] **Step 3: Implement deterministic builders**
  Keep copy concise and action-oriented.

- [ ] **Step 4: Implement notification data CRUD**
  event_key is the idempotency boundary.

- [ ] **Step 5: Verify**
  Run: npx vitest run src/lib/assistance/notification-events.test.ts && npm run typecheck
  Expected: PASS.

- [ ] **Step 6: Development Neon retry check**
  Call createNotification twice with the same eventKey and verify one row exists.

- [ ] **Step 7: Commit**
  Commit message: feat: add in-app notification persistence

---

### Task 7: Normalize manager assistance actions

**Files:**
- Create: src/lib/assistance/manager-actions.ts
- Create: src/lib/assistance/manager-actions.test.ts
- Modify: src/lib/dashboard-status.ts
- Modify: src/lib/dashboard-status.test.ts

**Interfaces:**
- Produces: ManagerActionItem = { id; type; priority: "URGENT" | "REVIEW" | "MISSING_INPUT"; title; detail; href; dateTime?; employeeId?; locationId? }.
- Produces: buildManagerActionItems(input): ManagerActionItem[] sorted by priority, then date/time, approval age, stable ID.
- Consumes live coverage/hour/request data plus availability summary and acknowledgement summary.

- [ ] **Step 1: Write failing prioritization tests**
  Assert:
  - upcoming coverage gap sorts before missing target.
  - older pending approval sorts before newer approval in same category.
  - missing availability includes exact employee-targeted detail.
  - all hrefs preserve week/location/request context.
  - no issues => empty action array.

- [ ] **Step 2: Run failing test**
  Run: npx vitest run src/lib/assistance/manager-actions.test.ts
  Expected: FAIL.

- [ ] **Step 3: Implement builder**
  Keep prioritization deterministic; no AI scoring.

- [ ] **Step 4: Update dashboard-status summary to consume normalized counts where appropriate**
  Do not move rendering concerns into the builder.

- [ ] **Step 5: Verify**
  Run: npx vitest run src/lib/assistance/manager-actions.test.ts src/lib/dashboard-status.test.ts
  Expected: PASS.

- [ ] **Step 6: Commit**
  Commit message: feat: normalize manager assistance actions

---

### Task 8: Upgrade the manager dashboard and availability follow-up

**Files:**
- Modify: src/app/app/page.tsx
- Modify: src/app/app/availability/page.tsx
- Modify: src/app/globals.css
- Create: src/components/manager-action-list.tsx

**Interfaces:**
- Consumes: buildManagerActionItems and getAvailabilitySubmissionSummary.
- Produces UI only; no new business rules in JSX.

- [ ] **Step 1: Add manager dashboard data loading**
  Load availability submission summary in parallel with existing dashboard data.

- [ ] **Step 2: Replace bespoke attention-condition JSX with normalized action rows**
  Each row has exactly one primary action.

- [ ] **Step 3: Add availability progress metric**
  Show submitted/active count, deadline, and missing count.

- [ ] **Step 4: Add manager availability detail**
  On availability surface, show Submitted / Not submitted / Submitted unavailable all week for active employees when manager role is allowed.

- [ ] **Step 5: Browser-check desktop and mobile**
  Verify the manager understands week status, availability completion, and next actions within one viewport without visual crowding.

- [ ] **Step 6: Verify**
  Run: npm test && npm run typecheck && npm run lint && npm run build
  Expected: PASS.

- [ ] **Step 7: Commit**
  Commit message: feat: surface manager scheduling assistance

---

### Task 9: Reuse coverage ranking inline during shift creation

**Files:**
- Create: src/lib/assistance/suggestion-explanation.ts
- Create: src/lib/assistance/suggestion-explanation.test.ts
- Create: src/lib/data/coverage-suggestions.ts
- Modify: src/lib/scheduling/coverage-ranking.ts
- Modify: src/lib/scheduling/coverage-ranking.test.ts
- Modify: src/app/app/schedule/new/page.tsx
- Modify: src/app/app/schedule/coverage/page.tsx
- Modify: src/app/globals.css

**Interfaces:**
- Consumes: rankCoverageCandidates.
- Produces: describeCoverageCandidate(candidate: RankedCoverageCandidate): string.
- Produces: listRankedCoverageCandidates(input: { weekStart: string; date: string; locationId: string; startTime: string; endTime: string }): Promise<RankedCoverageCandidate[]> in src/lib/data/coverage-suggestions.ts so the add-shift and coverage pages do not duplicate candidate construction.

- [ ] **Step 1: Write failing explanation/empty-result tests**
  Assert:
  - candidate below target => "Available · 8h below target".
  - target absent => scheduled-hours explanation.
  - prior shortfall appears when meaningful.
  - no valid candidates => empty array; caller must render a clear reason, never bypass filters.

- [ ] **Step 2: Run failing tests**
  Run: npx vitest run src/lib/assistance/suggestion-explanation.test.ts src/lib/scheduling/coverage-ranking.test.ts
  Expected: FAIL.

- [ ] **Step 3: Extract candidate-loading logic into src/lib/data/coverage-suggestions.ts**
  Implement listRankedCoverageCandidates(input) and make the existing coverage page consume it. Preserve existing validation rules.

- [ ] **Step 4: Show suggestions in add-shift only when date, location, start, and end are all valid**
  Limit inline list to top three; keep deeper coverage page link.

- [ ] **Step 5: Verify original coverage page still ranks identically**
  Run coverage-ranking tests plus npm run typecheck.

- [ ] **Step 6: Browser-check manager flow**
  From a coverage gap, manager reaches add-shift and sees valid candidates with explanations.

- [ ] **Step 7: Commit**
  Commit message: feat: show replacement suggestions in shift workflow

---

### Task 10: Add republish change review and revision hooks for published mutations

**Files:**
- Modify: src/lib/data/publication-revisions.ts
- Modify: src/app/app/schedule/actions.ts
- Modify: src/app/app/schedule/page.tsx
- Modify: src/app/app/exchange/actions.ts
- Modify: src/app/app/exchange/callout/actions.ts
- Modify: src/lib/data/exchanges.ts as needed
- Modify: src/lib/data/callouts.ts as needed
- Test: src/lib/assistance/publication-diff.test.ts

**Interfaces:**
- Consumes revision persistence/diffing from Tasks 3–4.
- Produces: buildRepublishSummary(previousLocationSnapshot, proposedLocationSnapshot): { added; removed; timeChanged; reassigned; affectedEmployeeIds }.
- Published employee-visible mutation sources create revisions with PUBLISH, EXCHANGE, CALLOUT, or MANAGER_MUTATION.

- [ ] **Step 1: Write failing summary tests**
  Assert exact counts for added/removed/time/reassignment and unique affected employee count.

- [ ] **Step 2: Run failing tests**
  Run: npx vitest run src/lib/assistance/publication-diff.test.ts
  Expected: FAIL for missing summary.

- [ ] **Step 3: Implement republish summary**
  Use pure diff output; do not query DB inside the formatter.

- [ ] **Step 4: Add pre-publish review state**
  If a prior revision exists and current location differs, show change summary before confirming republish alongside existing readiness warnings.

- [ ] **Step 5: Record revisions for approved exchanges and call-outs that change employee-visible published state**
  Ensure each uses stable sourceType/sourceId and captures the resulting week snapshot.

- [ ] **Step 6: Record MANAGER_MUTATION only when the affected schedule was PUBLISHED at mutation time**
  Cover createShiftAction, updateShiftAction, deleteShiftAction, and copyPreviousWeekAction when they modify an already-published target schedule. Capture the schedule status before the mutation so a newly created DRAFT schedule is never mistaken for a published mutation. DRAFT edits do not create revisions. Once each published mutation records a revision, remove its legacy clearWeekAcknowledgements call.

- [ ] **Step 7: Verify business flows**
  Run: npm test && npm run typecheck && npm run lint
  Expected: PASS.

- [ ] **Step 8: Development Neon scenario**
  Publish → approve exchange → approve call-out → edit published shift; verify monotonically increasing revisions and immutable earlier snapshots.

- [ ] **Step 9: Commit**
  Commit message: feat: track published schedule changes

---

### Task 11: Build the employee "My week" assistance service and dashboard

**Files:**
- Create: src/lib/assistance/employee-week.ts
- Create: src/lib/assistance/employee-week.test.ts
- Create: src/lib/data/employee-week.ts
- Modify: src/app/app/page.tsx
- Modify: src/app/globals.css

**Interfaces:**
- Produces: EmployeeWeekSummary = { weekStart: string; nextShift?: { date: string; startTime: string; endTime: string; locationName: string }; scheduledHours: number; shiftCount: number; availability: AvailabilitySubmissionStatus; availabilityDeadline?: string; needsAcknowledgement: boolean; eligibleOpenCoverageCount: number; pendingRequestCount: number; recentChangeCount: number }.
- Produces: buildEmployeeWeekSummary(input: { weekStart: string; today: string; publishedShifts: Array<{ date: string; startTime: string; endTime: string; locationName: string }>; availability: AvailabilitySubmissionStatus; availabilityDeadline?: string; needsAcknowledgement: boolean; eligibleOpenCoverageCount: number; pendingRequestCount: number; recentChangeCount: number }): EmployeeWeekSummary.

- [ ] **Step 1: Write failing summary tests**
  Assert:
  - no published shifts => nextShift undefined, zero hours, clear empty-state inputs.
  - next shift chooses earliest future published shift.
  - scheduledHours sums published employee shifts only.
  - availability submission detail and acknowledgement state pass through accurately, including locked+submitted versus locked+not-submitted.
  - counts do not include another employee's requests/coverage.

- [ ] **Step 2: Run failing test**
  Run: npx vitest run src/lib/assistance/employee-week.test.ts
  Expected: FAIL.

- [ ] **Step 3: Implement pure summary builder**
  Keep formatting out of domain output.

- [ ] **Step 4: Add employee data loader**
  Fetch independent sources in parallel.

- [ ] **Step 5: Replace generic employee dashboard**
  Show next shift, hours/shifts, availability status/deadline, acknowledgement, eligible open coverage, pending requests, and recent changes.

- [ ] **Step 6: Browser-check mobile first, then desktop**
  Employee should understand the week without opening another page.

- [ ] **Step 7: Verify**
  Run: npm test && npm run typecheck && npm run lint && npm run build
  Expected: PASS.

- [ ] **Step 8: Commit**
  Commit message: feat: add employee my week dashboard

---

### Task 12: Show employee-specific schedule changes and acknowledgements

**Files:**
- Modify: src/app/app/schedule/page.tsx
- Modify: src/lib/data/acknowledgements.ts
- Modify: src/lib/data/publication-revisions.ts
- Modify: src/app/globals.css
- Test: src/lib/assistance/publication-diff.test.ts

**Interfaces:**
- Consumes: diffEmployeePublishedShifts.
- Produces: getEmployeePublishedChanges(weekStart, employeeId): Promise<{ firstPublication: boolean; changes: PublicationChange[]; acknowledgedRevisionId?; latestRevisionId? }>.
- UI renders supported change types with current date/time formatting helpers.

- [ ] **Step 1: Add focused employee change tests**
  Assert added, removed, time changed, reassigned in/out, and unchanged-after-other-employee-change.

- [ ] **Step 2: Run test and verify failure for any missing presentation mapper**
  Run: npx vitest run src/lib/assistance/publication-diff.test.ts
  Expected: FAIL until mapper exists.

- [ ] **Step 3: Implement employee change data helper**
  First publication returns firstPublication true rather than treating every shift as a warning.

- [ ] **Step 4: Add change panel to employee schedule**
  Examples follow spec language; use sentence case and existing status styles.

- [ ] **Step 5: Make acknowledgement action store latest revision**
  Revalidate both /app and /app/schedule after acknowledgement.

- [ ] **Step 6: Verify**
  Run: npm test && npm run typecheck && npm run lint
  Expected: PASS.

- [ ] **Step 7: Commit**
  Commit message: feat: explain employee schedule changes

---

### Task 13: Emit transactional notifications and add the notification center

**Files:**
- Create: src/app/app/notifications/actions.ts
- Create: src/components/notification-center.tsx
- Modify: src/app/app/layout.tsx
- Modify: src/components/app-shell.tsx
- Modify: src/app/app/requests/actions.ts
- Modify: src/app/app/exchange/actions.ts
- Modify: src/app/app/exchange/callout/actions.ts
- Modify: src/app/app/schedule/actions.ts
- Modify: src/app/globals.css
- Test: src/lib/assistance/notification-events.test.ts

**Interfaces:**
- Consumes Task 6 event builders/data functions.
- Produces: markNotificationReadAction(formData: FormData) reading notificationId, and markAllNotificationsReadAction().
- Both actions revalidate /app and the current shell-visible routes after successful update.
- NotificationCenter props: { items: NotificationListItem[]; unreadCount: number }.
- Modify src/app/app/layout.tsx to load listNotifications(session.id, 8) and countUnreadNotifications(session.id) on the server, then pass serializable notification props into the client AppShell.
- Extend AppShell props with notifications and render NotificationCenter in desktop and mobile shell surfaces.

- [ ] **Step 1: Extend notification event tests for each integration point**
  Cover time-off outcome, call-out outcome, employee-response swap request, exchange outcome, first publish, relevant republish.

- [ ] **Step 2: Integrate events after successful business transactions**
  Notification failure is logged/handled without converting a valid scheduling transaction into a failure.

- [ ] **Step 3: Build read-state server actions**
  Require authenticated employee and scope updates to that employee.

- [ ] **Step 4: Add shell notification center**
  Unread count, newest first, mark one read, mark all read, actionHref navigation, empty state.

- [ ] **Step 5: Browser-check keyboard/mobile behavior**
  Ensure the control is reachable, readable, and does not obstruct mobile navigation.

- [ ] **Step 6: Verify**
  Run: npm test && npm run typecheck && npm run lint && npm run build
  Expected: PASS.

- [ ] **Step 7: Commit**
  Commit message: feat: add scheduling notifications

---

### Task 14: Add contextual assistance copy

**Files:**
- Modify: src/app/app/availability/page.tsx
- Modify: src/app/app/exchange/page.tsx
- Modify: src/app/app/exchange/callout/page.tsx
- Modify: src/app/app/schedule/new/page.tsx
- Modify: src/app/app/schedule/page.tsx
- Modify: src/app/globals.css
- Create: src/components/help-note.tsx

**Interfaces:**
- UI-only; no new data contracts.

- [ ] **Step 1: Add compact help disclosures**
  Required topics:
  - Availability vs. time off.
  - Offer shift vs. unable to work.
  - How replacement suggestions are calculated.
  - What acknowledgement means.
  - Draft vs. publish.
  - Why a scheduling action can be blocked.

- [ ] **Step 2: Verify help text adds consequence/next action rather than repeating labels**
  Keep controls progressive/compact; no modal-first design.

- [ ] **Step 3: Browser-check mobile and 200% zoom on representative screens**
  No clipping, overlap, or loss of primary actions.

- [ ] **Step 4: Verify**
  Run: npm run typecheck && npm run lint && npm run build
  Expected: PASS.

- [ ] **Step 5: Commit**
  Commit message: feat: add contextual scheduling help

---

### Task 15: Full assistance-layer E2E and release gate

**Files:**
- No required product file unless a bug is found.
- Update documentation only if the implementation diverges from the approved spec.

**Interfaces:**
- Consumes the complete assistance layer.

- [ ] **Step 1: Run full automated verification**
  Run: npm test
  Expected: all tests pass.
  Run: npm run typecheck
  Expected: exit 0.
  Run: npm run lint
  Expected: exit 0.
  Run: npm run build
  Expected: production build succeeds.
  Run: git diff --check
  Expected: no output.

- [ ] **Step 2: Execute manager E2E on local app + development Neon**
  Scenario:
  1. set deadline,
  2. observe missing submissions,
  3. submit availability including all-week unavailable,
  4. create both-location schedule,
  5. create/resolve coverage gap with inline suggestion,
  6. publish,
  7. inspect acknowledgements,
  8. change/republish,
  9. verify affected employee action item.

- [ ] **Step 3: Execute employee E2E**
  Scenario:
  1. My week summary,
  2. availability submission,
  3. published schedule,
  4. acknowledge,
  5. receive relevant change notification,
  6. inspect exact shift change,
  7. re-acknowledge when required,
  8. inspect request outcome/open coverage.

- [ ] **Step 4: Run responsive visual QA**
  Manager dashboard, employee dashboard, weekly schedule, availability, exchange, requests, notifications at desktop and representative mobile widths.

- [ ] **Step 5: Perform publish-state hardening gate**
  Explicitly test whether a manager edit to a currently PUBLISHED schedule is immediately employee-visible before republish.
  If yes, do not promote to production until the dedicated publish-state hardening decision from the spec is completed.

- [ ] **Step 6: Review migration state**
  Development branch contains 0004 and correct data; production migration has not been applied.

- [ ] **Step 7: Commit any QA fixes as isolated commits**
  Do not squash unrelated fixes into one opaque commit.

- [ ] **Step 8: Stop for local-review approval**
  Do not push or deploy. Present the completed local assistance layer and E2E evidence to the user and wait for explicit approval before the preview-release task below.

---

### Task 16: Development preview release and hosted verification

**Files:**
- No product changes unless preview verification reveals a defect.

**Interfaces:**
- Consumes the locally approved assistance layer.

- [ ] **Step 1: Confirm explicit user approval to push the local batch**
  Without approval, stop.

- [ ] **Step 2: Reconcile the local branch with origin/development**
  Preserve the user's fuel-logo commit and all approved local work. Resolve conflicts locally and rerun the full verification suite.

- [ ] **Step 3: Push the approved commits to development only**
  Do not touch main.

- [ ] **Step 4: Create one Vercel preview deployment for the exact development commit**
  Verify the deployment is READY and record the exact commit SHA.

- [ ] **Step 5: Repeat hosted smoke/E2E checks against the development Neon branch**
  Confirm manager dashboard, employee My week, availability submission, publish/revision flow, acknowledgement, notifications, and mobile rendering.

- [ ] **Step 6: Stop for production approval**
  Do not promote to main or production until the user explicitly approves the hosted preview and the publish-state hardening gate is satisfied.
