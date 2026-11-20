# NEVORA #11 backend handoff

## For Claude

### Owner activity feed

Send a same-origin `POST /api/owner/activity` with `Content-Type: application/json` and `x-nevora-activity: 1`. Use the current portal session cookie. Send `{}` for the first page or `{"limit":25,"cursor":"…"}` for a subsequent page. The optional limit defaults to 25 and accepts integers from 1 to 100. Pass `nextCursor` back unchanged. A null cursor marks the last page. Refresh from the first page after a source or session change.

| Result | Meaning |
| --- | --- |
| `200 {state: "ready", entries, nextCursor}` | The sources were read. An empty `entries` array means there are no recorded events on this page. |
| `503 {state: "unavailable"}` | The feed could not be read. Clear the displayed result and offer a retry. |
| `401 {state: "authentication_required"}` | The session is missing or expired at admission. |
| `403 {state: "access_denied"}` | Current Owner access is required. Clear previous private results. |
| `400 {state: "invalid_request"}` | The JSON payload, limit, or cursor is invalid. |
| `{state: "request_rejected"}` | The request failed browser admission. Use the endpoint from the signed-in portal with the required header. |

`OwnerActivityEntry` in `src/lib/activity/owner-feed.ts` contains a stable `id`, a UTC `occurredAt` with microsecond precision, `actor: {id, name}`, and a discriminated `change`. Names use the current catalog labels. A missing name can be shown as “Name unavailable.” Use `id` for row keys and display the timestamp in the current business timezone. The server orders by timestamp and ID, newest first. The existing history disclosure pattern in `ActivityHistoryPanel` can guide the UI. The feed has its own response type and authorized source read.

- Schedule kinds are `SCHEDULE_PUBLISHED`, `SCHEDULE_EDITED`, `SCHEDULE_EXCHANGE`, and `SCHEDULE_CALLOUT`. The change includes `weekStart`, `locationId`, and `locationName`. A company-wide publication can have both location fields null. The source is recorded publication history, so draft-only edits are outside its coverage.
- `MANAGER_SCOPE_ASSIGNED` and `MANAGER_SCOPE_REVOKED` identify the Manager with `employeeId` and `employeeName`. An assignment includes `scope: {mode, locationIds}`. `COMPANY` has an empty location array. Legacy adopted scopes have no recorded Owner change.
- `EMPLOYEE_ACTIVATED` and `EMPLOYEE_DEACTIVATED` identify the employee. The feed requires a prior status observation and emits only a recorded transition between successive receipts.
- `WAGE_CHANGED` identifies the employee. Use “Wage changed” as the label. Payroll amounts, reasons, and profiles stay on the private compensation path.

### Location editor and employee shifts

The Owner location editor already reads `CatalogLocation` and submits `createLocationAction` or `updateLocationAction` from `src/app/app/settings/actions.ts`. Prefill the optional multiline form field named `address` from `location.address ?? ""`. It accepts plain text up to 300 Unicode characters. The backend trims surrounding whitespace and normalizes line breaks. An omitted field preserves an existing address. A blank submitted field clears it. On creation, an omitted or blank address is stored as null.

Keep submitting the exact `expectedUpdatedAt` value on edits and retain the entered fields on a conflict. Successful edits return the new `updatedAt`. Archiving preserves the saved address for Owner review. Existing employee visibility rules exclude archived locations.

Render `locationAddress` only when present on an authorized shift or assignment. The field is on the weekly schedule row and Home assignment data. It reflects the current saved address of that shift’s location, including on a previously published shift. Treat null or a missing field as an absent address. Render the value as text. No separate employee catalog lookup is required.

## For the integrator

The checkpoint is based on Development `e0e8efe9ce1aeee8a2961cd92684ff1a38f95550`. It changes only the activity read and location addresses. Geofencing remains for the mobile clock-in phase. Open-shift and PTO owners retain their own event writes.

Apply the additive `db/migrations/0072_location_addresses.sql` before deploying these readers. The file is registered in the canonical chain, disposable test chain, and new-company bootstrap manifest. If another workstream also adds a migration, reconcile the exact filename order, append-only deployment chain, and regenerated bootstrap manifest in the integration worktree. Run the combined suite against the assembled checkpoint. Hosted deployment and migration are separate release gates.
