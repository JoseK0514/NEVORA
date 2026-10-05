# Phase C3/C4 — persisted punch backend slice

Parent specification: docs/superpowers/specs/2026-10-05-nevora-phase-c-live-operations-design.md
Parent approved plan: docs/superpowers/plans/2026-10-05-nevora-phase-c-live-operations.md
Starting checkpoint: e00e3aa35b0adab555ec473abe7190f0a1c48d4a
Local child branch: phase-c/persisted-punch-engine

## Scope
Implement server-only persisted Clock In / Start Break / End Break / Clock Out, exact command receipts, current-state reads and reconciliation. Do not activate a web endpoint or change the tablet UI in this backend slice. Break classification, schedule snapshots and live dashboards remain later approved tasks.

## Architecture rulings
- Retain the existing noninteractive Neon SQL batch executor; no shared transport rewrite, interactive-transaction assumption or new database procedure.
- Each command takes only an authenticated ClockerIdentityProof plus an exact validated command. Employee/device/location authority is never supplied by browser fields.
- Commands carry an employee-wide expected revision and expected entry/break identities and versions. The revision prevents a delayed Clock In from creating a new shift after an intervening complete shift.
- A guarded snapshot read plans the operation. The final batch locks the employee FOR UPDATE before existing identity guards, then locks the entry and breaks and compares the complete snapshot again.
- Lock order is workspace, employee, eligibility/PIN, location/device/identity, time entry, breaks. Never upgrade a shared employee lock during a punch.
- Command ledger and time changes commit together. A concurrent same-command winner is reconciled by its saved receipt; a different payload or employee using that ID is rejected.
- Capture one database timestamp after locks, shared by all mutations in that command. A server clock earlier than existing event history fails closed rather than rewriting time.
- Recheck identity after any blocking write and before transaction completion; expiry rolls everything back.
- Receipt reconciliation still requires current device/employee authority. Unknown transport results do not mean failure or success and must not cause an automatic new command ID.
- Entries at another location cannot be mutated by this tablet. Overnight open entries remain open until an explicit valid Clock Out.
- SQL stays draft-only in db/phase-c; no numbered migration, external DB, push, merge or deployment.
- Child worktree avoids concurrent modification of the C1/C2 worktree. Reviewed integration into the parent Phase C branch remains pending.

## Steps
1. Write schema-upgrade and command validation tests; observe RED; implement additive schema and pure input contract.
2. Write real PostgreSQL state-machine/ledger tests; observe RED; implement snapshot read, command transaction and saved-receipt reconciliation.
3. Attack duplicates, simultaneous tablets, stale entry/break/state, forged input, invalid transitions, rollback and authorization changes. Fix proven defects with regression evidence.
4. Verify full unit suite, combined Clocker database tests, foundation regression, TypeScript, lint and local build. Record exact results and remaining boundaries.
5. Save a local backend checkpoint. Do not label full C3/C4, Phase C or the connected Clocker experience complete.
