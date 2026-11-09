# NEVORA Phase C — Real Time Clock & Live Operations

BASE_SHA=20a1026a2fa88c5923b015a3384b980ff7d676cc
BRANCH=phase-c/real-time-clock-live-operations

## Objective
Turn the existing time-clock persistence/UI foundation into a secure, persisted, reliable shared-tablet Clocker and live operations experience without changing payroll/attendance policy.

## Source audit
- Migration 0005 already provides clocker_devices, time_entries, break_entries and one-open-entry / one-open-break constraints.
- The public Clocker route resolves an active location from a URL key but does not authenticate a registered physical device.
- ClockerKiosk currently accepts any 4-digit PIN and stores recognition, clock-in, break and clock-out state only in React memory.
- The kiosk displays a hard-coded demo shift and a UI-only 15-minute break countdown.
- getClockMonitor already reads persisted open entries for Manager/Owner access and correctly distinguishes unavailable from empty.
- Manager Home currently derives "on floor" from published schedule presence, not persisted punches.
- Employee Home currently receives a hard-coded clock state and My Time is still a readiness placeholder.

## Non-negotiable architecture
1. Do not rewrite migration 0005. Phase C extends the historical schema with a new additive migration.
2. The public /clocker/... URL is presentation/routing only, never authorization.
3. A physical Clocker device requires a server-issued high-entropy credential. Only a hash is persisted.
4. Device enrollment is Owner-controlled, location-bound, revocable, replaceable and observable through last-seen state.
5. Employee Clocker PIN is distinct from the portal password. PIN plaintext is never logged, persisted, serialized to client state, or returned by an API.
6. Four-digit PIN UX is preserved from the current product unless the CEO changes that product decision.
7. PIN lookup uses a server-side keyed fingerprint for workspace uniqueness plus a salted slow hash for verification.
8. Rate limiting is persisted in PostgreSQL so it works across serverless instances.
9. All punch transitions use server/database time and execute transactionally.
10. Command IDs provide idempotency. Reusing an ID with a different payload is rejected.
11. Delayed commands are bound to expected entry/break identity and version so an old request cannot mutate a later shift.
12. Actual punch history is immutable operational truth. Schedule data is context, never a substitute for actual punches.
13. Break countdowns are informational. A break never auto-ends because a timer reaches zero.
14. Deactivated employees and revoked/inactive devices cannot authenticate or create new punches.
15. No payroll calculations, legal attendance policy, auto-deductions, or silent punch editing are introduced in Phase C.

## Phase C data extensions
- Enrich clocker_devices with workspace/device credential state and lifecycle timestamps.
- Add owner-controlled one-time enrollment/credential rotation state.
- Add employee_clocker_pins with workspace uniqueness, keyed fingerprint, salted slow hash, reset metadata.
- Add persistent PIN-attempt/rate-limit state.
- Add clocker_command_ledger keyed by authenticated device + command ID with payload hash and saved result.
- Add explicit row versions for active time/break state.
- Add customer-configurable break_types and snapshot classification/policy context onto break entries.
- Add optional published shift / revision / position / schedule-match context to time entries.

## Punch state machine
OFF_CLOCK -> CLOCK_IN -> CLOCKED_IN
CLOCKED_IN -> START_BREAK -> ON_BREAK
ON_BREAK -> END_BREAK -> CLOCKED_IN
CLOCKED_IN -> CLOCK_OUT -> CLOCKED_OUT
ON_BREAK -> CLOCK_OUT -> close open break + CLOCKED_OUT atomically

Invalid transitions fail closed and do not partially write.

## Schedule context
At Clock In, server-side code may associate a published shift when it can do so deterministically. The recorded punch remains valid actual history even when there is no schedule match. Schedule-match state must distinguish matched, unmatched and ambiguous cases without inventing attendance/grace-period policy.

## Live product behavior
Manager Home "Clocked In Now" comes only from persisted open entries.
Employee Home shows persisted Off Clock / Clocked In / On Break state and elapsed time.
My Time shows the employee's current entry, today's punches/breaks, recent entries and recorded worked time.
The shared tablet UI must reset privacy-sensitive state after each action and avoid exposing employee data beyond what is required to complete the punch.

## Release boundary
Phase C remains isolated from development/main/production. Phase B Codex findings must be reviewed and reconciled into this branch before Phase C can be frozen or released.
