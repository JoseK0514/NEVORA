# Clocker persisted punches — Phase C3/C4

## Status and release boundary

The server-only punch service and protected HTTP transport are implemented on the isolated Phase C branch. This is not a live-timekeeping release. The API requires explicit `NEVORA_CLOCKER_PUNCH_ENABLED=true`; the checked-in example and default are false. No hosted environment is enabled by this work.

The existing tablet screen still performs PIN verification only. Connected punch buttons, the complete action/recovery experience, configurable break types, published-schedule context, employee time history and manager live dashboards belong to the remaining Phase C integration. Do not use the current tablet screen as an operational time clock.

## Authority and input contracts

`ClockerPunchService` in `src/lib/clocker/punches.server.ts` accepts a server-derived `ClockerIdentityProof`, never a browser-provided employee or device identity. The HTTP handler independently obtains the enrolled-device cookie and short-lived PIN-identity cookie, then verifies both. Exact Origin, JSON content type, the custom request header and bounded body size are required.

Public contracts live in `src/lib/clocker/punch-types.ts`. A command contains only a UUID `commandId`, one supported action, an opaque `verificationId`, and an expected state tuple. Employee, location, device and timestamps are derived server-side. Extra or contradictory fields fail validation rather than being ignored or coerced.

The verification context is a domain-separated HMAC bound to workspace, device, credential generation, employee, PIN identity, PIN version and employee version. It is not the device credential or PIN-session hash. A command prepared for an older employee verification cannot silently become a command for the next person using the tablet.

## Persisted transitions

| Prior state | Action | Atomic result |
| --- | --- | --- |
| Off Clock | Clock In | Create a real open time entry |
| Clocked In | Start Break | Create an open break and mark the entry On Break |
| On Break | End Break | Close the break and restore Clocked In |
| Clocked In | Clock Out | Close the time entry |
| On Break | Clock Out | Close the break and time entry at the same instant |

Timestamps are sampled from PostgreSQL `clock_timestamp()` after business-lock waits, not supplied by a browser and not taken from transaction-start time. If current server time precedes an existing boundary, the operation fails without manufacturing a timestamp or changing history. Overnight entries remain open until explicitly closed.

No paid/unpaid classification, automatic deduction, automatic break end, overtime, grace period or attendance policy is introduced. Break-type configuration and snapshots remain C5 work. An unmatched schedule does not block this service; schedule association remains C6 work.

## Locking and transaction protocol

The service reads and guards the active workspace, obtains the employee row lock before device/session locks, and applies the existing C2 current-identity protocol. It then invokes the transition function in the same ordered, non-interactive `SqlExecutor.transaction` batch.

The transition function locks employee clock state, the current entry and its breaks. Current identity is checked again after the business statement: a PIN grant that expires during a deeper lock wait causes the whole transaction to roll back, including time/break changes, revision and command receipt. Different employees do not require one global punch lock.

The SQL functions use ordinary invoker permissions and are internal business primitives, not public authentication endpoints or independent row-level security. Application callers must use the guarded service. Future time corrections or other writers must join this same employee/version protocol; direct unsynchronized table writes are not an approved integration path.

## Stale commands and retries

An employee-level monotonic revision survives Clock Out. This rejects an old Off Clock command even after an intervening complete shift. Expected time-entry and break IDs plus their versions prevent an old request from mutating a later entry or a later break in the same entry.

`clocker_command_ledger` is append-only and keyed by authenticated device plus command UUID. The payload digest includes the employee and canonical command. A committed command retried under the same verification context returns the original saved receipt; a changed payload under that UUID is rejected. Time records and the receipt commit together or not at all.

The saved receipt describes that command's historical result, not a claim that it remains the current clock state. Clients must refresh authoritative state after resolving a receipt.

If the response is lost, retain the original command ID. Receipt lookup is read-only and restricted to the currently verified employee and enrolled device. Fresh PIN verification can recover that employee's receipt but cannot automatically execute a command from the old verification context. The next employee cannot read or replay the previous employee's command.

An `unknown` receipt means no committed receipt was observed. It does not certify cancellation or that an earlier in-flight request failed. Do not allocate a replacement command ID simply because a response is missing. The final tablet recovery UI must enforce this rule before activation.

## Location and integrity boundaries

A registered replacement tablet at the same location may continue an existing entry, preserving its original Clock In device attribution. A tablet at another location may read that its own verified employee has an entry elsewhere but cannot mutate or reattribute that entry. No false Off Clock result is substituted.

The service rejects inconsistent On Break state, break boundaries outside the parent entry, and overlapping breaks on the active entry. No record is silently repaired or deleted. Invalid data remains an explicit unavailable/integrity state requiring reviewed resolution.

## Draft schema and verification

Local disposable test databases apply numbered migrations 0001–0010, followed by:

1. `db/phase-c/clocker-devices.sql`
2. `db/phase-c/clocker-pins.sql`
3. `db/phase-c/clocker-punches.sql`

No historical numbered migration was edited or newly reserved. Phase B's accepted hardening must be reconciled before a final migration order and hosted rollout are approved. An application rollback leaves recorded history intact; dropping populated time/receipt tables is not a rollback strategy.

Tests use the existing owned PostgreSQL harness, real lock barriers, injected commit-response loss, actual Next HTTP routes, and Chromium/WebKit browser-cookie journeys. The scratch Next harness substitutes only its copy of the database transport; this is not hosted Neon, physical iPad/Safari or independent Codex certification. Exact results and limits are recorded in the C3/C4 execution checkpoint.
