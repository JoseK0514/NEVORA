# Staff tasks backend — SCRUM-185

Jose requested implementation of the Jira feature. Codex owns backend/data/API
and verification; Claude owns UI. This work starts from development0317598 in a
separate detached worktree. The operations closeout remains paused.

## Product outcome and implementation decisions

Owners/managers assign a task/checklist to one active person at a location within
their current Company Access scope. Employees/Leads see and complete their own
assignments. Managers can inspect, comment, cancel, reopen and reassign within
scope; completing another person's task is refused. No Owner-private notebook or
system Action Center content becomes a staff task automatically.

Use a separate additive staff-tasks domain rather than repurpose private notes or
communication records: these have different visibility and lifecycle rules.
Reuse existing session proofs, Company Access, workspace transport and transaction
guards. No dependency, paid service, provider call or production activation.

Version one uses in-app reminders only. The decisions below are engineering
defaults for this implementation, not new Jose-approved business policies:

- Task titles120 characters, description2000, comments2000; at most30 checklist
  items with stable UUID identifiers. Plain text only; no uploads/photos or
  manager sign-off in this version.
- Reusable templates support one-time, daily and selected weekly weekdays in the
  business timezone. Optional end date inclusive. Holidays are not inferred.
- Explicit SYNC_TEMPLATE materializes a bounded31-calendar-day chunk through
  today+30 days using the server clock. A durable cursor and unique template/date
  constraint make concurrent/retried sync safe. The client repeats while `more`.
  Employee sync is allowed only for their currently assigned template; it cannot
  change template content or authority. No scheduled service is required.
- DST uses compatible disambiguation: gaps move forward, repeated times choose
  the earlier instant. Each instance retains its business date and UTC due time.
- Template edits affect dates not yet materialized. Existing task snapshots and
  history stay intact. Archiving stops future sync; it does not erase/cancel
  existing tasks. Cancel a specific instance explicitly. No hard-delete API.
- Reassignment requires an active, location-eligible person in the same company,
  resets checklist/progress and starts a new reminder generation. Completed tasks
  must be reopened before reassignment. All these transitions append audit events.
- Every checklist item must be checked before explicit completion. Checking all
  items does not silently complete the task. Only the current assignee completes.
- Reminders are stable task/generation identities, become due before the task's
  deadline, and are acknowledged idempotently. Completion/cancellation suppresses
  them. They are returned by the task API, not sent as email/SMS/push.
- Task/template/history reads use25-row pages with keyset continuation cursors.
  Canonical context uses5-person/100-location pages with independent cursors;
  the smaller people page also bounds up to1,000 eligible location IDs per person.
  History cursors preserve PostgreSQL microseconds and UUID tie-breaking; no
  record becomes unreachable solely because an earlier page is full/archived.
  The one-megabyte client ceiling stays in place. No display result remains
  authoritative beyond its short lifetime.

## Contracts and controls

Public types live in src/lib/staff-tasks/types.ts. Pure model exports:
`parseTaskDraft`, `parseStaffTaskCommand`, `parseTaskQuery`,
`planTaskOccurrences(draft, fromDate, horizonDate, timeZone)`,
`parseTaskHistoryQuery`, and `parseTaskContextQuery`.
Planner returns at most31 calendar days of work, a durable nextDate and more flag.

Server exports: `staffTaskAuthority(proof)`, `readStaffTaskContext(proof, ex?)`,
`listStaffTasks(proof, query, ex?)`, `readStaffTask(proof, taskId, ex?)`,
`executeStaffTaskCommand(proof, command, ex?)`,
`findStaffTaskOperation(proof, operationId, ex?)`.

Transport: GET/POST /api/staff-tasks/context; POST /api/staff-tasks/query;
POST /api/staff-tasks/history;
POST /api/staff-tasks/commands; GET /api/staff-tasks/[taskId];
GET /api/staff-tasks/operations/[operationId]. Require the existing same-origin,
JSON, no-store, limited-body and intent-marker protections. Header
x-nevora-staff-task:1; all calls except context require
x-nevora-staff-task-authority from context. Never expose session-token hashes.

Data is scoped by workspace and location; current session/role and management
scope are checked inside the protected transaction after lock waits and at its
end. Lock ordering: workspace, employees, locations/eligibility, task/template,
session/scope. Serialize operation IDs and template/date creation; use fresh READ
COMMITTED guards. Same actor/session operation+same payload replays one receipt;
different payload conflicts. Unknown commit returns outcome_unknown with the
original operation ID. Recovery returns identity only, never former private data.

## Verification and release boundary

Pure tests prove validation, recurrence, leap days, DST, finite backlogs and
reminder identity. Actual isolated PostgreSQL tests prove scope/company isolation,
revocation/expiry, inactive/moved assignees, exact revision conflicts, concurrent
completion/sync/replay, immutable history and reminder acknowledgement. HTTP tests
prove transport admission/auth/limits and safe failure responses. Run default
suite, types, lint, migration order and canonical bootstrap manifest checks.

Claude receives the typed contract, sequence and loading/empty/error/conflict/
outcome_unknown examples. Combined UI/staging acceptance stays open until that
integration exists. Do not call Jira Done from backend-only verification, merge
older pending operations source, run remote CI or deploy production for this task
without the appropriate integration decision.
