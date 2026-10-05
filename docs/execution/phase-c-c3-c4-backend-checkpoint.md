# NEVORA Phase C3/C4 — persisted punch backend checkpoint

Date: 2026-10-05
Local child branch: phase-c/persisted-punch-engine
Starting checkpoint: e00e3aa35b0adab555ec473abe7190f0a1c48d4a
Frozen Phase B ancestor: 20a1026a2fa88c5923b015a3384b980ff7d676cc

## Status
The first persisted punch backend slice is implemented and locally verified.
C3/C4 as a connected product feature and Phase C overall remain IN PROGRESS.
No punch endpoint or tablet punch button has been activated by this slice.

## Implemented
- Server-only readClockerPunchState, executeClockerPunch and reconcileClockerPunch functions.
- Clock In, Start Break, End Break and Clock Out persist actual PostgreSQL records.
- Clock Out while On Break closes both records atomically using one database timestamp.
- Employee-wide state revision, entry/break identities and row versions reject delayed actions, including an old Clock In after an intervening shift has finished.
- Device/employee identity is supplied only by the current C2 server proof, never command fields.
- Exact validated command contract rejects client timestamps, employee/device spoofing, unknown fields and malformed action types.
- Saved immutable command receipts bind device, employee, credential generation, command ID and canonical payload hash.
- Identical retries return the saved receipt, including after later state transitions. Different payloads cannot reuse the same command ID.
- One employee lock serializes simultaneous tablets; unique open-entry/open-break constraints remain in place.
- Snapshot equality is checked again under final locks. Current authorization is checked after entry/break waits and after all potentially blocking writes.
- Failed ledger persistence, suppressed writes and late authorization expiry roll back time records and revisions together.
- Lost committed responses can be reconciled without guessing whether the write happened.
- Cross-location changes are rejected; overnight legacy entries remain visible and their original timestamps are preserved.
- Inconsistent or missing clock data stays unavailable; it is never presented as an empty/off-clock success.

## Architecture
Uses the existing noninteractive SqlExecutor/Neon transaction batch. No shared DB transport was rewritten.
Lock order: workspace -> employee FOR UPDATE -> eligibility/PIN -> location/device/identity -> entry/breaks.
The strongest employee lock is acquired first, avoiding SHARE-to-UPDATE upgrades between tablets.
The read snapshot plans the transition; the final batch compares it before writing.
Only matching concurrent command receipts are reconciled after a stale-snapshot rejection. Unknown transport errors remain unknown until explicit reconciliation.
A database time earlier than recorded employee history fails closed; historical timestamps are not silently adjusted.

Draft schema: db/phase-c/clocker-punches.sql after clocker-devices.sql and clocker-pins.sql.
No numbered migration is reserved. No historical migration or shared production DB configuration changed.
The old unused browser-employee-ID interface in src/lib/time-clock.ts is replaced by type-only exports of the actual contract.

## Verification
| Check | Result |
| --- | --- |
| Full unit suite | 140 files / 1,452 passed |
| Combined Clocker device/PIN/punch integration suite | 8 files / 149 passed |
| New punch/upgrade portion | 2 files / 30 passed (included in 149) |
| Existing foundation PostgreSQL regression | 2 files / 75 passed |
| Command validation tests | 25 passed (included in 1,452) |
| TypeScript | PASS after correcting a test helper's row generic |
| ESLint | PASS |
| Local production Next build without DATABASE_URL | PASS |

RED evidence: schema test failed before the draft existed; 21 initial behavior tests failed before the engine existed. A later valid-entry/array-action test reproduced missing string validation; explicit string validation fixed it.
Guardrails include real database blocking barriers for employee deactivation and identity expiry while the ledger insert waits, complete rollback, duplicate concurrent commands, simultaneous tablets, conflicting break/out actions, stale commands, cross-location attempts and exact lost-response recovery.
The first static pass caught an unknown-row test typing error. The test helper was typed explicitly; typecheck and build subsequently passed without suppressions.
The foundation suite retains its unchanged 0001–0010 fixture chain. The new punch fixture applies all three Phase C drafts. Other historical PostgreSQL suites have not all been rerun with these drafts.
Local evidence: .superpowers/sdd/2026-10-05-nevora-phase-c-punch-engine/

## Remaining work and limits
- Protected punch HTTP transport and browser command/retry/reconciliation UX.
- Connected tablet Clock In / Start Break / End Break / Clock Out buttons and new flow-specific browser testing.
- Configurable operational break classifications and historical policy snapshots (C5).
- Published schedule/revision/position context (C6), manager live operations and employee My Time (C7/C8).
- Full cross-phase and performance campaign, hosted isolated Preview, physical-device checks and independent Phase C review.
- Reviewed local integration of this child branch into the parent Phase C branch.
- Reconciliation of accepted Phase B hardening before freezing or releasing Phase C.

No actual customer time was recorded. Test databases were newly created owned loopback databases and removed by their runner. No Preview, Neon, production, notifications, external deployment, push or upstream merge was performed.
This is not a payroll-compliance claim or a release approval. The current tablet still does not enable real time punches.

Recommendation: GO for continued isolated implementation; NO-GO for live/customer timekeeping or Phase C release.
