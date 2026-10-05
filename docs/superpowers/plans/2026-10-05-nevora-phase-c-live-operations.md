# NEVORA Phase C — Exact Implementation Plan

## Track status
Phase B frozen candidate remains under independent Codex review.
Phase C proceeds only on phase-c/real-time-clock-live-operations from 20a1026a2fa88c5923b015a3384b980ff7d676cc.

## C0 — Guardrails and baseline
- Verify branch/worktree isolation and exact base SHA.
- Run existing Clocker/time-clock tests before edits.
- Record migration-head and Phase B reconciliation rule.

## C1 — Registered Clocker devices
- Add Phase C schema extension for secure device lifecycle.
- Build Owner-only device repository/actions.
- Create location-bound device enrollment, rename, revoke and replace/rotate credential behavior.
- Add last-seen/device-health reads.
- Add tests for Owner authority, cross-location/workspace protection, revocation and credential rotation.

## C2 — Employee Clocker PIN
- Add secure PIN schema and server-only crypto helpers.
- Owner/Manager may reset PIN only within approved employee-management authority; Owner-only policy is not invented unless required by existing authority rules.
- Enforce active employee, workspace-unique 4-digit PIN, no plaintext persistence and no client exposure.
- Add persistent device/PIN rate limiting.
- RED/GREEN tests for collisions, inactive employee, wrong PIN, lockout window, reset and log-safe errors.

## C3/C4 — Persisted punch service + reliability
- Implement server-only authenticated ClockerPunchService.
- Add command ledger idempotency and payload mismatch rejection.
- Lock employee/current entry/break state transactionally.
- Implement CLOCK_IN, START_BREAK, END_BREAK, CLOCK_OUT with server timestamps.
- Add expected entry/break identity/version checks.
- Test simultaneous tablets, duplicate retries, stale commands, rollback, cross-location attempts and overnight entries using disposable PostgreSQL.

## C5 — Break semantics
- Add customer-configurable operational break types.
- Persist actual start/end plus break-type/policy snapshot.
- Countdown is display-only; never auto-end.
- Test inactive break types, historical preservation and Clock Out while On Break.

## C6 — Schedule context
- Resolve location/employee schedule context server-side at Clock In.
- Persist optional published shift, revision, position and deterministic match state.
- Never reject actual punches merely because a schedule is absent unless an already-approved product rule explicitly requires it.

## C7 — Manager live operations
- Replace schedule-derived "on floor" with getClockMonitor persisted state.
- Show On Floor / On Break, elapsed duration, location and relevant position.
- Preserve explicit unavailable/error state instead of displaying false zero activity.

## C8 — Employee live state + My Time
- Add self-service repositories scoped to the authenticated employee.
- Connect Employee Home to persisted current state.
- Implement My Time current entry, today's punches/breaks, recent entries and recorded worked time.
- Do not add correction/timecard approval flows; those are Phase D.

## C9 — Apple Clocker UI
- Connect PIN verification and punch commands to persisted server state.
- Large obvious iPad actions, portrait/landscape geometry, 44px+ controls, privacy reset.
- Explicit loading/success/conflict/retry/error states and double-action prevention.
- No demo shift or fake React-only punch state.

## C10 — Verification / hardening
- Focused unit TDD on every new behavior.
- Dedicated Phase C disposable PostgreSQL suite including race tests.
- Typecheck, lint, production build and full existing regression.
- Chromium + WebKit responsive verification including 1024x768 and 768x1024 Clocker.
- Freeze Phase C candidate only after accepted Phase B hardening is reconciled.
- Codex then performs Phase C adversarial review; no merge/deploy without CEO approval.
