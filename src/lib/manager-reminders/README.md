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

## Phase 4 eligibility read (November 16, 2026)

`POST /api/manager/reminders/eligibility` accepts the **same closed command body and headers** as the command above, including the proposed `operationId`. This POST only reads. It creates no notification, receipt or delivery. The 2,048-byte transport bound, current Owner/Company Manager authority, recipient/source predicates, Updates gate and owned-loopback activation hold are unchanged.

- `ready`: `{canQueue:true,scope:"COMPANY",targetEmployeeId,observedAt,dueAt,expiresAt,timeZone}`. This is an advisory observation. The write always repeats current checks; do not cache eligibility as permission.
- `cooldown`: `{canQueue:false,reason:"daily_budget_used",nextEligibleAt}`. The time is the next queue-admission opening (21:00 on the already-budgeted delivery day), **not** the next 07:00 delivery. It is null if that next delivery would expire the source. Recheck then; the source/session may change.
- `committed`: the original operation's unchanged `queued`/`already_queued` receipt, preferred even after source resolution/expiry. Changed content under its ID conflicts. Current session and Company authority are still required before disclosure.
- `held/activation_held`: existing SQL release hold. The command answers it too when the hold refuses the reads or the queue write itself (nothing queued, no operation recorded); a hold met only after the write stays `outcome_unknown`. `unavailable/module_off` (404) remains the Updates presentation gate. Neither is permission to activate a service.
- `blocked`, `conflict`, `unavailable`: safe refusal; never an empty eligible result. `source_or_operation_changed` deliberately does not distinguish foreign/nonexistent/resolved targets.

The read returns HTTP 200 for ready/cooldown/committed, 401 for no current session, 403 for blocked, 409 for conflict, and 503 for held/unavailable (except module-off 404 and transport/method errors). All responses remain private/no-store. Unexpected preview failures use the existing sanitized logger and `X-Nevora-Request-Id`; expected holds/refusals do not. There is no delivery-status endpoint or proof of device delivery in this contract.
