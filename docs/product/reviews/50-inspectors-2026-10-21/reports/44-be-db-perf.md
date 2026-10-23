# 44 Database Engineer — SQL performance, indexes, locking, time zones, scale (13 → 500 employees / 10 locations)

Read-only review of `src/lib/data/**`, `src/lib/{action-center,timecards,reports,payroll}/**` and `db/migrations/*.sql`.
I didn't connect to a database, run EXPLAIN or open a browser. The row counts below are estimates.

## Verdict

At 13 employees the data layer is correct and careful. Writes are idempotent, they check revisions and source hashes, they take locks in a fixed order and they retry on conflicts. Time zones are handled in the database.

It won't hold up at 500 employees across 10 locations. Polling for the Home, Inbox and badge views rebuilds the whole action center several times a minute for each manager. Several queries scan the entire time-clock or publication history on every call. Fixed caps of 500 and 1000 rows make the Inbox go blank once the business gets busy. Payroll and read "guards" take row and table locks that can stall every screen and every punch.

## Recommendations

1. **Stop rebuilding the full action center for polling and the Inbox badge.** (Impact: High. Effort: M. Owner: Backend)
   - **What:** Serve the badge from a cheap counts-only query, or from the last action-center read for each actor, cached for its existing `validForMs` (45 s or less). The action center should read timecard *states*, not full cards with every history snapshot. The Schedule page should not load the dashboard a second time.
   - **Evidence:**
     - `use-inbox-count.ts:34` polls every 60 s, and the effect also re-runs on every route change (dependencies `[enabled, pathname]`).
     - Each badge call runs `readToday` and then the whole `readActionCenter` (`inbox-count.server.ts:15-17`).
     - `readActionCenter` combines four sources: the full dashboard (about 20 HTTP queries), the attendance review, corrections, and `readTimecards` for the week (`action-center/service.ts:25`). The action center also polls every 30 s (`private-snapshot-client.ts:11`).
     - Home server-renders the same dashboard (`app/app/page.tsx`, `loadManagerDashboardData`), and Schedule loads it again (`schedule/page.tsx:233-240`).
   - **Load:** By my count, one Home view makes about 95 Neon HTTP round trips, with 3 dashboard builds and 2 builds of all timecards. With the tab simply open it's about 110 calls per minute. With 11 owners and managers that is roughly 1,200 calls per minute, plus about 33 full timecard projections per minute.

2. **Put sargable time bounds on every `time_entries` read and index them.** (Impact: High. Effort: S–M. Owner: Backend)
   - **What:** Add a raw `t.clock_in_at >= <period start> - interval '2 days'` predicate everywhere below, and add an index on `time_entries(location_id, clock_in_at)` (or `(clock_in_at)`).
   - **Evidence, each of which reads history with no lower bound or no usable index:**
     - `readToday` `entry_rows` has no lower bound on `clock_in_at`, so every closed entry ever recorded is checked through the `EXISTS` (`today.server.ts:33-38`).
     - The attendance review materializes `all_entries`, which is every entry in the workspace including its `schedule_context` jsonb, and then self-joins it (`attendance-review.server.ts:28-60`).
     - The reports `raw` CTE filters on a range that no index supports. Only `(employee_id, clock_in_at)` and a partial open-entries index exist (`0005_time_clock.sql:28-33`).
     - `nevora_timecard_source` filters on `start_at = COALESCE(leaf.effective_start_at, t.clock_in_at)`, which can't use an index. It therefore scans each employee's full punch history twice, once for `count(*)` and once for `jsonb_agg` (`0018_timecards.sql:38-63`), and it runs once per employee (500 calls).
   - **Growth:** 500 employees produce about 180k entries a year, so these costs keep rising every month.

3. **Replace the 500 and 1000 hard caps that blank the whole Inbox.** (Impact: High. Effort: S. Owner: Backend + Product)
   - **What:** Scale the caps with the number of employees, or degrade one section at a time. A `limitedAttendance` flag already exists for this.
   - **Evidence:**
     - The attendance review returns `source_limit` when `entryCount > 500` or `publicationCount > 500` (`attendance-review.server.ts:318-324`). Both count across the whole workspace for today.
     - Any source that isn't ready makes the entire action center `unavailable` (`action-center/service.ts:27`). That empties Home Tasks, the Inbox and the badge.
     - The action center also refuses more than 1000 items (`action-center/project.ts:26`). Per-employee "hours / availability / unacknowledged" items can reach that number on their own at 500 people.
   - **Impact:** A 500-person, 10-location business will cross these caps on ordinary busy days.

4. **Stop copying the whole week into each publication revision and stop comparing full-week JSON.** (Impact: High. Effort: L. Owner: Backend)
   - **What:** Store revisions per location or as deltas. Guard with a per-week (or per-week-and-location) version counter instead of whole-state JSON equality. Read only the latest revision and the revisions employees have acknowledged.
   - **Evidence:**
     - Every publish, exchange, callout or manager edit copies *all* published shifts for the week in *all* locations (`notification-transactions.ts:372`, `WHERE s.week_start=$2 AND s.status='PUBLISHED'`).
     - The guarded state then reads *every* revision of the week with all of its shifts. This happens twice: once to read, and once inside the transaction to compare `= $2::jsonb` (`notification-transactions.ts:118-140, 331`).
     - `personalProjections` loops over recipients × revisions × shifts in JavaScript.
   - **Growth:** About 2,500 shifts a week × about 30 revisions is about 75k revision rows a week, or about 4M a year. Each approval re-serializes the week's entire history.

5. **Add the missing indexes.** (Impact: High. Effort: S. Owner: Backend)
   - `schedule_publication_revision_shifts(source_shift_id)`: used by the `EXISTS` for every shift in `currentShiftsSql` (`notification-transactions.ts:110`) and by `listCapturedShiftPositions`. This is the largest table, and it only has indexes led by `revision_id` or `employee_id`.
   - `shifts(date)`: needed for the `byBusinessWorkweek` OR query (`schedules.ts:68`), which runs on every Home load.
   - `shift_change_events(workspace_id, (source_terms->>'date'))`: reports filter on this, and the table has no index for it.
   - `time_off_requests(status, start_date)`: needed for the pending list.
   - Non-partial `shift_callouts(shift_id)`, and `shift_exchanges(source_shift_id)` plus `shift_exchanges(target_shift_id)`: the "history" `EXISTS` checks every status, so the current partial indexes don't apply.
   - `time_correction_adjustments(time_entry_id)`.
   - `employee_location_eligibility(location_id, employee_id)`.
   - Also bound the reports `revisions` CTE by `week_start`. It currently semi-joins *every revision ever* (`reports/service.ts:57-60`).

6. **Take payroll reads out of the global write-lock protocol.** (Impact: High. Effort: M. Owner: Backend)
   - **What:** Run payroll reads, and above all employees' own (`SELF`) reads, as `RepeatableRead` + `readOnly` transactions without these locks. Keep the strong locks only for run and finalize writers. Serve document bytes outside the lock.
   - **Evidence:**
     - Every `guarded()` payroll call takes these locks (`payroll/store.ts:20-28`):
       - `FOR NO KEY UPDATE` on the workspace row, which conflicts with the `FOR SHARE` taken by every other read (`workspaces.ts:40`).
       - `FOR UPDATE` on *every* employee, plus `SHARE ROW EXCLUSIVE` on `employees`.
       - `SHARE` on `time_entries` and related tables, which blocks clock punches.
     - That includes an employee simply viewing their own pay statements, and the PDF download, which hex-encodes the document inside the lock (`payroll/access.ts:24, 44`).
   - **Impact:** On payday, 500 employees opening My Pay would queue behind one another. Every employee read would fail at its 1,500 ms `lock_timeout` (`employee-profile.server.ts:10`), and kiosks would stall.

7. **Replace row and table locks used as read guards with read-only snapshots.** (Impact: Medium. Effort: M. Owner: Backend)
   - **What:** Use the Neon driver's `sql.transaction(q, {isolationLevel:'RepeatableRead', readOnly:true})`. The driver supports it, but `src/lib/data` never uses it. Keep the existing version and expiry checks.
   - **Evidence:** Each read takes these locks:
     - `FOR SHARE` on the workspace row, on all location rows and on the session row.
     - `LOCK TABLE employee_location_eligibility IN SHARE MODE` (`employee-profile.server.ts:27-31`).
     - Timecards and reports also take `FOR SHARE OF e` on every employee (`timecards/service.ts:117`, `reports/service.ts:87`).
   - **Why it matters:** `FOR SHARE` writes `xmax` and multixacts onto the hottest rows, so every read becomes a write. In addition, a single eligibility edit (`ROW EXCLUSIVE`) has to wait for all readers already in flight, and readers that arrive after it then queue behind it.

8. **Make the Home dashboard one consistent read.** (Impact: Medium. Effort: S. Owner: Backend)
   - **What:** Fold the dashboard into one statement, or one read-only transaction, the way `readToday` already does (`today.server.ts` is the model to follow).
   - **Evidence:**
     - `loadManagerDashboardDataCore` commits its guard transaction and *then* fires 16 independent `getDb()` queries (`manager-dashboard.ts:28-48`).
     - Those queries ignore the `executor` that was passed in.
     - They don't share one snapshot. Counts and shifts can come from different moments.
     - Week shifts are read twice (by week, and by business workweek).

9. **Lock schedule changes by week and location, not by week alone.** (Impact: Medium. Effort: M. Owner: Backend)
   - **What:** Lock and guard by (week, location).
   - **Evidence:**
     - `pg_advisory_xact_lock('schedule-week:'+week)` (`notification-transactions.ts:156`) and the whole-week state guard are shared by all 10 locations.
     - Each edit also runs `LOCK TABLE employee_positions/employee_location_eligibility IN SHARE MODE`.
   - **Impact:** When several managers build the same week, every edit invalidates everyone else's guard. Each edit retries up to 3 times and then fails with "Schedule version retries exhausted".

10. **Remove the N+1 and unbounded lists on the employee Schedule and Requests pages.** (Impact: Low–Medium. Effort: S. Owner: Backend + UI)
    - `readShiftChangeAvailability` runs once per open shift, as one guarded transaction each (`schedule/page.tsx:189-192`). Batch it.
    - `listTeamTimeOffRequests('APPROVED'|'DENIED')` has no `LIMIT` and no date bound (`requests.ts:123-138`). Page it.
    - The manager Schedule page filters all shifts once per employee (`schedule/page.tsx:~262-275`). That is about 1.25M comparisons per render at 500 × 2,500. Group shifts by employee once.

## What's good

- **Time zones are handled correctly.**
  - Business dates are computed in SQL with `AT TIME ZONE <workspace tz>` and `clock_timestamp()`, or in JavaScript with Temporal (DST-ambiguous times are rejected).
  - No SQL depends on `CURRENT_DATE` or the server's time zone.
  - Monday weeks are consistent between `weekStartFor` and `date_trunc('week')`.
- **Writes are safe.** Approvals and timecard actions are idempotent (`operation_id`), use optimistic revision and source-hash checks, take `FOR UPDATE` in a fixed order, and retry on `40001`, `40P01` and `55P03` (`timecards/service.ts:145-180`, `0018_timecards.sql`).
- **Several reads are already batched or single-snapshot.**
  - `readToday`, timecards and reports each run as one statement inside one transaction.
  - Action-request facts are batched in one query (`withActionRequestFacts`). There's no classic per-row N+1 on Home or Inbox; the cost comes from repeated rebuilds and history scans.

## Not checked / limits

- **No measurements:** no `EXPLAIN` or live statistics. The planner may pick hash semi-joins that change the per-row costs, but the full-history scans remain either way. Volume figures are estimates: 500 employees, about 5 shifts a week each, about 1.2 punches a day.
- **Payroll in production:** whether `NEVORA_PAYROLL_ENABLED` is on in production isn't known (recommendation 6 applies once it is).
- **Multi-tenant cutover:** the database is single-tenant today (singleton `workspaces`). The planned F10 multi-tenant cutover (`0026_tenant_ownership_expand.sql`) will need `workspace_id`-leading versions of every filter index above. Not reviewed in depth.
- **Location time zones:** only a workspace-level time zone exists, with none per location. That's fine for Puerto Rico but not for multi-zone chains. This is a product decision; I didn't check it further.
- **Date parsing:** `dateValue()` turns `Date` objects into ISO dates and is correct only on servers running at UTC or west of it. I didn't confirm whether Neon returns `date` columns as `Date` objects.
- **Not reviewed:** employee-side Home polling payload sizes, clocker device paths, and calendar and iCal feeds.
