# Time clock persistence foundation

> Historical foundation checkpoint. The current Phase C3/C4 implementation and its still-disabled release boundary are documented in [Clocker persisted punches](clocker-punch-service.md). Statements below about unimplemented writers or unavailable local tooling describe this earlier checkpoint, not the current Phase C branch.

## Repository and contracts

Future Manager/Owner monitoring can read **actual open time entries** through `getClockMonitor` in `src/lib/data/time-clock.ts`. The repository checks the authenticated role before any database access. It joins employee/location names and open breaks, reads across calendar boundaries, and never infers clock presence from a schedule. Open entries are retained in the result until clocked out even when an employee/device/location is later inactive. Timestamps are normalized to ISO UTC; a future UI can format them for Puerto Rico.

The result contract distinguishes:

- `ready` with employees: On Floor or On Break from persisted state.
- `ready` with an empty array: verified no employees clocked in.
- `unavailable`: database configuration missing, clock schema missing, or a failed/inconsistent read. Consumers must distinguish unavailable data from a successful empty result; failures must never be presented as zero activity.

This foundation intentionally includes no dashboard card, page rendering, navigation, or kiosk visual changes. UI integration belongs on the current approved Manager Dashboard after reviewing its newer implementation. The older base checkout used for this work has no Clocker routes/front end or prior clock schema; that observation does not describe the separate active development checkout.

`src/lib/time-clock.ts` defines TimeEntry, BreakEntry, ClockerDevice, monitor results, and a future kiosk command/service interface. The interface is a contract, **not an implemented punch writer**.

## Prepared migration; not applied

`db/migrations/0005_time_clock.sql` follows the existing numbered SQL/BEGIN/COMMIT convention. It adds three empty tables, without device or punch seed data:

- `clocker_devices`: assigned location, name, active flag, last seen timestamp.
- `time_entries`: employee/location/device, clock-in/out timestamps, status, created/updated timestamps. The composite device/location foreign key prevents mismatched location attribution. A partial unique index allows only one open entry per employee across both locations.
- `break_entries`: parent entry, start/end timestamps. A partial unique index allows one open break per entry.

Checks enforce nonnegative entry/break duration and CLOCKED_OUT/clock-out timestamp agreement. Foreign keys retain punch history rather than cascading its deletion.

No live schema was inspected, no migration ran, and no customer data changed. This machine has no local PostgreSQL runtime; SQL execution remains unverified. Before activation, inspect the selected development database for pre-existing clock tables/conventions, apply the migration to an isolated development database, and exercise concurrent transitions and rollback. The numbered migration does not run automatically during build/start. Rolling back application code is safe because the schema is additive; retain recorded punches rather than dropping tables containing history.

## Remaining kiosk integration

Integrate the actual kiosk implementation from the active development code separately without changing its visual design:

1. Provision one authenticated device per real location. Resolve its location from the registry server-side; the URL `/clocker/2` or `/clocker/110` is not authorization or a database location ID. Keep device secrets outside these public record contracts.
2. Authenticate both the device and the employee punch identity. Reject inactive/unregistered devices, inactive employees, and ineligible location assignments. Do not trust employee/location/device IDs or clock timestamps submitted by the browser.
3. Implement `ClockerPunchService.execute` behind a server-only boundary. Persist a command ledger keyed by authenticated device + `commandId`, with a payload hash and saved result, before exposing writes. The same command must return the saved result on retries; reuse with a different payload must be rejected. No ledger/write endpoint is included in this phase.
4. Lock the employee/current entry in a transaction, serialize transitions, and use database/server timestamps. `expectedTimeEntryId` binds Clock Out/Start Break/End Break to the intended entry so delayed requests cannot mutate a later shift. The unique open-entry/open-break indexes backstop concurrent requests.
5. Clock In creates CLOCKED_IN. Start Break creates an open BreakEntry and sets ON_BREAK atomically. End Break closes it and restores CLOCKED_IN atomically. Clock Out closes any open break and the TimeEntry together and sets CLOCKED_OUT. Enforce break bounds within the parent entry and prevent overlapping break intervals in the writer; cross-table lifecycle invariants are not expressible by this migration's row checks alone.
6. Update `last_seen_at` after an authenticated device request. Return explicit conflict/validation errors, use bounded retries for transient failures, and let the tablet reconcile its UI from the persisted result. Do not silently keep punches only in local/frontend state.
7. Test retry identity, simultaneous punches across devices, break/end/out races, cross-location validation, inactive devices/employees, overnight punches, rollback and network interruption using isolated data. Verify the manager read against those persisted records.

Only after those steps can a future monitoring UI be considered connected to real iPad punches. Automatic polling, timesheet administration, payroll calculations, device management UI, and historical punch editing are outside this phase.
