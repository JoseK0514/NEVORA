# Rondo AI Manager UI contract

Jose approved the permission scope for Development on November 18, 2026.
Backend checkpoint `b9a90386e0458fe051d381f89c781182e82dfa55` delivers guided
questions and a read-only weekly schedule summary in the local sandbox.
Hosted Manager acceptance is pending.
Claude owns navigation and UI integration. Codex owns the backend and hosted
activation. Development is the acceptance release. Main and production require
Jose's separate authorization.

## Access and integration

Use `GET /api/manager/advisor` with `x-nevora-manager-advisor: 1` and the current
same-origin session cookie. All views return private, no-store JSON, vary by Cookie,
and set no-referrer and nosniff. The exact client types and accepted question keys
are in [manager-contracts.ts](../../src/lib/owner-advisor/manager-contracts.ts).

The parent `NEVORA_OWNER_ADVISOR_ENABLED` and the separate, default-off
`NEVORA_MANAGER_ADVISOR_ENABLED` must both be on. Owner weekly proposals use their
own switch. A Manager needs a current operational Company Access grant and a
current Manager role. Company grants cover this company's active locations.
Location grants cover the active sites named in the current grant. The client
sends one location per week or question. The server checks that selection and
rechecks the original authority after reading the schedule. Role changes,
scope revocation, and session expiry retire the old access.

- **Scope and supported questions** use the endpoint with no query string.
- **Weekly plan summary** uses
  `?view=weekly&weekStart=2026-11-30&locationId=loc-1`.
- **Guided workforce question** uses
  `?view=answer&weekStart=2026-11-30&locationId=loc-1&question=scheduled_minutes`.
  Offer `draft_shifts`, `published_shifts`, `released_shifts`, and
  `scheduled_minutes` as localized questions. Free-text chat needs a separate
  model-backed implementation and remains unavailable.
- Require an explicit location from the latest context and a Monday date in
  `YYYY-MM-DD`. Send each query parameter once. Extra fields and unrecognized
  questions return 400. No write methods are exposed.

The weekly response contains Monday through Sunday in order. Counts read the
existing operational schedule and omit archived rows. Approved callout
releases count in `releasedShifts` and are excluded from draft/published counts
and scheduled minutes. Scheduled minutes are nominal schedule minutes on the
shift's start date. They represent planned time. A zero means the checked
schedule contains zero qualifying rows. It establishes neither coverage nor attendance.

Publish, rebuild, exact proposal review, payroll, business records,
company knowledge, other users' notes and memory, and employee-level schedule
details are outside this API. Build a Manager-specific view. Avoid wiring
the Owner chat, weekly apply, private citations, or library routes to it.

## Sanitized examples

```json
{"state":"ready","view":"context","questionMode":"guided","questions":["draft_shifts","published_shifts","released_shifts","scheduled_minutes"],"locations":[{"id":"loc-1","name":"Northside Main Office"}],"observedAt":"2026-11-18T11:00:00.000Z","validForMs":14980}
```

```json
{"state":"ready","view":"answer","question":"scheduled_minutes","value":480,"weekStart":"2026-11-30","location":{"id":"loc-1","name":"Northside Main Office"},"observedAt":"2026-11-18T11:00:00.000Z","validForMs":14980}
```

Weekly returns the same week, location and observation fields with
`view:"weekly"` and `days`, an array of seven
`{date,draftShifts,publishedShifts,releasedShifts,scheduledMinutes}` objects.

| State | UI treatment |
| --- | --- |
| Ready context with zero locations | Explain that there are no active assigned locations and refer to the Owner for Company Access setup. |
| 404 `disabled` | Hide the active entry or show the closed state on direct navigation. |
| 401 or 403 `forbidden` | Clear location names, answers and week data. Sign in again after a 401. For a 403, reload current access and show its access message if denied. An unassigned Manager receives 403 and can contact the Owner to request a current assignment. |
| 503 `unavailable` | Clear stale private results and offer retry. A missing source or inability to read scope can produce this state. |
| 400 `invalid` | Keep the page open and ask for a supported question, week, or location selection. |
| Usage limit | The guided implementation makes no provider calls and has no model quota state. |

Keep private results in memory and discard them when `validForMs` expires,
the current location changes, the tab resumes after expiry, or the session
loses access. Start the lease timer from receipt using the supplied relative
duration. Cancel obsolete requests and ignore out-of-order results.
