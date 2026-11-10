# Manager reminder backend contract (NV261)

Development only: commands retain the existing communication owned-loopback activation hold. No new delivery flag, provider, hosting, or migration is enabled.

`POST /api/manager/reminders` requires the existing manager/Owner session, current Company operational access, same origin, JSON, `X-Nevora-Reminder: 1`, and `X-Nevora-Reminder-Authority` equal to the `authority` returned by current communication context. The body is one of:

```json
{"kind":"AVAILABILITY","operationId":"UUID","authority":"session authority","employeeId":"target","weekStart":"2026-11-16","expectedDeadline":"2026-11-15T17:00:00.000Z"}
```

```json
{"kind":"COMMUNICATION","operationId":"UUID","authority":"session authority","employeeId":"target","communicationId":"UUID","expectedRevisionId":"UUID"}
```

The availability source must still have that deadline, remain open, and lack a submission. Communication must remain published, unexpired, on that required revision, with an active current recipient grant and no acknowledgement receipt. Optional updates are ineligible. An update with no source expiry remains actionable regardless of publication age; each new reminder has a maximum 30-day delivery lifetime from the database clock, shortened by an explicit source expiry. Targets are Employee/Lead only.

`GET /api/manager/reminders/operations/:operationId` uses the same request-intent and authority headers. It recovers only the requesting actor/session's explicit `MANAGER_REMINDER` operation. A replacement login cannot recover the prior session's operation.

A committed response carries `operationId`, `notificationId`, and `disposition` (`queued` or `already_queued`). This proves queue/receipt persistence, not delivery. Reusing an operation ID with different content conflicts. An `outcome_unknown` response requires lookup using the original ID; do not generate a new ID to retry an uncertain command. `operation_not_found` permits deliberate replay of the original payload.

Routine delivery uses the existing workspace timezone, 21:00–07:00 quiet hours, recipient/source/local-delivery-day budget, and worker retry limits. Duplicate operation IDs and concurrent distinct IDs do not bypass the daily budget; source revisions/deadline changes also do not reset that day's budget. Existing failed/cancelled reminders consume the budget. A prior EVENT's transport is neither reset nor requeued.

The existing immutable operation ledger stores the receipt and audit metadata atomically with the queue insertion. No new receipt means no newly queued reminder. Canonical source/recipient checks are repeated by the notification worker before delivery. Production activation and UI wiring are separate gates.
