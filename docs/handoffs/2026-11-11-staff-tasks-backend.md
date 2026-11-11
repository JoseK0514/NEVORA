# SCRUM-185 — staff tasks backend and Claude UI contract

Codex implemented the backend in the detached worktree
`/Users/josek0514/.codex/worktrees/nevora-staff-tasks-20261111`, starting from
fresh `origin/development`0317598. Earlier operations work remains paused and
preserved in its own checkout. No native/UI implementation, shared branch push,
remote CI run, hosted migration, real message or production deployment occurred.

[Jira SCRUM-185](https://thevelani-team.atlassian.net/browse/SCRUM-185) remains a
combined feature: backend source verification does not complete its Claude UI
and staging acceptance criteria.

## Implemented behavior

- Owners/managers assign one active, location-eligible person within their current
  Company Access scope. Employees/Leads see and act only on their own assignments.
- Reusable checklist templates: one-time, daily, selected weekly weekdays, optional
  end date, business-local due time and optional in-app reminder lead time.
- Checklist progress, explicit assignee completion, manager reopening/cancellation/
  reassignment, task comments, immutable before/after history and receipt recovery.
- Reassignment clears progress, renews the reminder generation and removes the old
  assignee's access. Completed tasks must be reopened before reassignment.
- Every checklist item must be checked before completion. Checking all items does
  not automatically complete the assignment. Managers cannot complete someone
  else's work.
- Template edits affect dates not yet materialized. Existing task snapshots stay
  unchanged. Archive stops new occurrences and preserves existing tasks/history;
  cancel an existing task explicitly. No destructive delete API.
- Private Owner notes, system Action Center items and communications remain their
  existing independent domains. Rondo has no new automatic task-writing tool.

These are in-app reminders, returned by the task API; no email, SMS, push or new
hosted job was added. Photos and manager sign-off are outside this version.

## Authoritative files

| File | Responsibility |
| --- | --- |
| `src/lib/staff-tasks/types.ts` | Public commands, reads, results and cursors |
| `model.ts` in that directory | Exact input validation and bounded recurrence |
| `service.server.ts` | Current-session/workspace/Company Access, atomic SQL and response fences |
| `http.server.ts` | Browser method/origin/body/intent/authority admission |
| `client.ts` and `wire.ts` | Fixed endpoints, strict response parsing, target binding and unknown-outcome recovery |
| `db/migrations/0061_staff_tasks.sql` | Templates, instances, append-only events/receipts, reminder acknowledgements, invoker lifecycle function |
| `src/test/integration/staff-tasks.integration.ts` | Actual isolated PostgreSQL lifecycle/concurrency/security acceptance |

Migration0061 deliberately avoids the paused parallel0057–0060 work. It does not
depend on those migrations. Canonical migration order, test adapter, bootstrap
manifest and workspace timezone-lock records are updated. Future assembly must
reconcile all pending source and regenerate any affected source-bound manuals.
No new WORKER privilege was granted; explicit sync uses the authenticated APP.
For existing isolated companies, migration0061 gives only the recorded canonical
APP the new table access it needs: SELECT/INSERT/UPDATE on templates/instances
and SELECT/INSERT on append-only events/operations/reminder acknowledgements.
It grants no DELETE, ownership, grant option or role-attribute change. Malformed
or missing recorded APP roles abort and roll back the migration. Fresh bootstrap
uses its existing business-table grant path after installing the base schema.
An actual restricted-role upgrade regression verifies create/sync/read, immutable
history and unchanged WORKER access; tests do not rely solely on an admin executor.

## HTTP contract

All routes use the current signed-in session and private/no-store responses.
Send `X-Nevora-Staff-Task: 1`. Except initial GET context, send the context's
`X-Nevora-Staff-Task-Authority` digest. POSTs require same origin and JSON with an
actual UTF-8 body no larger than16KiB. Query strings are refused. Session hashes
never appear in the public contract.

| Method/path | Request | Response |
| --- | --- | --- |
| GET `/api/staff-tasks/context` | No body; bootstrap authority | Management flag, timezone, allowed locations/people and context cursors |
| POST `/api/staff-tasks/context` | `{employeeCursor, locationCursor}`; each text ID or null | Next canonical context page |
| POST `/api/staff-tasks/query` | `{fromDate,toDate,view,locationId,taskCursor?,templateCursor?}` | Tasks/templates, `hasMore`, independent next cursors |
| POST `/api/staff-tasks/commands` | `StaffTaskCommand` | Committed identity/revision, conflict, blocked, invalid, unavailable or unknown |
| GET `/api/staff-tasks/[taskId]` | UUID path | Current task and latest history page |
| POST `/api/staff-tasks/history` | `{taskId,beforeCursor}` | Task and next older history page |
| GET `/api/staff-tasks/operations/[operationId]` | Original UUID | This actor/session's current-authorized identity-only receipt |

For list queries, `view` is `MINE` or management-only `TEAM`, the date range is
inclusive and at most31 days, and `locationId` is a canonical allowed ID or null.
Responses carry `authority`, UTC `observedAt` and at most15 seconds `validForMs`.
Use the existing private snapshot controller and `parseStaffTaskLifetime` so
elapsed request time, expiry, lost focus, offline state and logout clear private
content. Do not retain stale page content after its lifetime expires.

### Pagination

- Tasks/templates/history:25 rows; people:5 rows; locations:100 rows. The smaller
  people page bounds nested eligibility at up to1,000 allowed location IDs per
  person. `hasMore`/
  `historyTruncated` are accompanied by explicit continuation cursors.
- Task cursor: `{businessDate,id}` in ascending order. Template cursor: UUID.
  Context cursors are the exact case-sensitive legacy text IDs.
- History cursor: `{createdAt,id}` in descending order. **Preserve its exact
  timestamp string**, including six fractional digits. Do not pass it through
  `Date` and lose microseconds; the UUID resolves equal-timestamp ties.
- Task/template and people/location streams advance independently. Null input
  means the first page; null returned next cursor means that stream is exhausted.
  Retain the last consumed cursor and exhaustion state for each stream when
  advancing its counterpart; never append a repeated initial page. Render
  pagination/coverage explicitly and refresh the view when filters change.
- Keep the one-megabyte response parser ceiling. Actual maximum-content and
  >100-record traversal regressions cover these boundaries.

### Commands and first screen sequence

Generate an operation UUID once per deliberate action. Every command contains
`kind`, `operationId`, `authority` and the exact variant fields in `types.ts`.

1. Bootstrap context and page canonical people/locations as necessary. Select
   IDs from that data. Query the visible dates with `MINE`/`TEAM`.
2. `CREATE_TEMPLATE`: client-generated `templateId` UUID plus `draft`. Draft
   includes title, description, locationId, assigneeId, checklist, schedule and
   reminderMinutesBefore (integer0–1440 or null). Checklist entries have stable
   UUIDs and labels; at most30 items.
3. Explicit `SYNC_TEMPLATE` with templateId and expectedRevision materializes a
   bounded31-calendar-day chunk up through server business today+30 days. Repeat
   deliberately with the returned revision while `more` is true; expose catch-up
   progress and allow cancellation. No browser-provided clock or horizon grants
   permission. An employee can sync only their currently assigned template.
4. `CHECK_ITEM`, `COMPLETE`, `REOPEN`, `CANCEL`, `REASSIGN`, `COMMENT`, and
   `ACK_REMINDER` use taskId plus expectedRevision and their variant fields.
   `REVISE_TEMPLATE` and `ARCHIVE_TEMPLATE` use templateId plus expectedRevision.
   Refresh after committed changes; do not guess the next revision.
5. Display due and overdue from server dueAt using the business timezone. Reminder
   identity is task UUID plus generation; acknowledge the current reminder with
   ACK_REMINDER. Completion/cancellation suppresses it; ordinary comments or
   checklist changes do not create another reminder generation.

DST recurrence uses compatible resolution: skipped local times move forward and
repeated times choose the earlier instant. Holidays are not inferred. The durable
cursor advances over unselected weekdays and bounded backlog chunks.

### Failure and recovery states

- `invalid`400: correct the form; do not assume a mutation was accepted.
- `blocked`403/unauthenticated401: clear private content and refresh authority/sign-in.
- `conflict`409: refresh the exact current task/template and present the change;
  no silent overwrite.
- `unavailable`503: show a retryable read/setup problem without raw database text.
- `outcome_unknown`503: the action may have committed. Preserve the original
  command/operation ID. Call `readStaffTaskOperation` with that ID and pass its
  optional originalCommand to bind the expected target. Network or malformed
  mutation response also becomes unknown, never invented success or a new action.
- A missing receipt also remains unknown. There is no automatic retry loop.
  A deliberate retry must retain the original operation ID and unchanged payload.
  Changed payload conflicts. Recovery returns identity/revision only and still
  checks current session/scope/assignment; it cannot recover former private data.

## Verification and release conditions

Final runtime/test source: `3bb552d79dd8daddffb2592f50b732d7d923264f`.
All nine stages passed on clean, unchanged source on November11. A later
documentation-only commit records these results; it does not relabel them as
executions of another application revision.

| Check actually executed | Result |
| --- | --- |
| Full default suite | 12,236 passed; zero failed;857 configured skips |
| Staff-specific focused assertions within that suite | 295 passed |
| Actual isolated PostgreSQL staff-task scenarios | 25 passed; zero skipped |
| Actual fresh-company provisioning scenarios | 21 passed; zero skipped |
| TypeScript | Passed, no errors |
| Repository lint | Passed, zero errors; one pre-existing monitor warning |
| Release-engineering regression suite | 228 passed; zero skipped |
| Canonical onboarding manifest | Passed; `051538da6401d654efd989095ac1e358bcd54da81a9e37a1f9d2a0158f2777f0` |
| Development source inventory | Passed;73 classified sources, three active branches; held UI not imported |
| Source-bound production build | Passed; source unchanged;4,575 artifact-file hashes retained |

The focused assertions are part of the default suite, not additional tests to
add to that total. Actual SQL/provisioning checks ran separately. The default
suite's configured skips are not reported as passing checks. The manifest script
also emits the existing Node module-type warning; no assertions were suppressed.

Fresh review's two Important findings (response capacity and unreachable later
pages) were fixed through retained RED/GREEN regressions and independently closed.
The existing-APP privilege upgrade delta was independently approved. The last
commit adds only missing TypeScript annotations in the restricted-role test
fixture; its emitted JavaScript is byte-identical to the reviewed version, and
the final full verification reran afterward.

Durable evidence: `/Users/josek0514/.codex/staff-tasks-evidence-20261111/`.
`qualification-summary.json`, `evidence-manifest.json`, `build-source.json`,
`qualification/assembly/qualification.json` and `review/` retain exact hashes,
commands, failures, review dispositions and final results.

Evidence workspace:
`.superpowers/sdd/2026-11-11-staff-tasks/`; ledger `progress.md`, model/transport/
service/final-review/ and assembly receipts. Scope approvals and final results
are recorded in Jira. Exact final qualification lives in
`assembly/qualification.json`; earlier265 results are preserved under
`assembly/pre-review-265` and are not relabelled as final executions.

Focused tests cover strict inputs, DST/leap dates, backlog/cursors, complete wire
shapes and unknown-outcome/target binding. Actual PostgreSQL tests cover scoped
access, deactivation/revocation after real lock waits, retries/concurrency, lost
commit response, reminders/history, one-megabyte content, full multi-page
traversal and microsecond history ties. The SQL gate is wired into the existing
release-postgres GitHub job via `npm run test:staff-tasks:owned`; it has not run
remotely for this feature.

Engineering: source implements the first version. Security: current proof and
scope checks, bounded waits, immutable history and no external sends. Governance:
GO WITH CONDITIONS for backend handoff; UI/staging/hosted schema and ordinary
release checks remain open. Production task-data retention/deletion procedures
must account for the new tables; no purge policy is invented by append-only
application history. Company-wide write serialization is conservative and bounded
by existing1.5-second lock/2.5-second statement limits plus an8-second request
deadline; higher-throughput changes require their own evidence.

Next owner: Claude integrates the UI, including mobile/keyboard/loading/empty/
error/conflict/completion/unknown-recovery and paginated coverage states. Joint
staging acceptance and exact-source GitHub qualification/development integration
remain distinct gates. No production activation or private-review finding is
closed by this handoff. Rollback removes the task routes/UI while retaining
immutable data/evidence; do not drop the tables to undo an application rollout.
