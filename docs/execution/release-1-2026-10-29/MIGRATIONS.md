# Release1 migration preparation

Status: source inventory and proposed order inspected; combined fresh/upgrade rehearsal remains open. This document authorizes no hosted or production operation.

The read-only inventory at9b2cd313 validated the actual installer, authoritative manifest and disposable adapter using `readMigrationPlan`. Current collab has47 applied-chain files and2 held tenant files. Supplemental PR34 files were read from the clean detached reconciliation checkout at60252ca6c9356b665efd73240dc8f0b003415bbd. Their full filenames are distinct from collab's Clocker files. Source hashes, the complete proposed order and limitations are pinned in `MIGRATION-PLAN-RESULTS.json`.

## Filename contract

Keep the current declared base sequence through0037 unchanged. After selected PR34 code is integrated, the proposed tail is:

1. `0038_read_path_indexes.sql` — PR34; supplemental, not yet in collab.
2. `0039_native_payroll_setup_records.sql` — PR34; supplemental, not yet in collab.
3. `0038_clocker_pin_operation_reference.sql`.
4. `0039_clocker_review_requests.sql`.
5. `0040_clocker_photo_policy_evidence.sql`.
6. `0041_clocker_photo_platform_cleanup.sql`.

Final migrations stay `0031_native_payroll.sql`, `0032_company_access_invitations.sql`, `0042_company_invitation_lifetime.sql`, in that order after company/Owner creation on a fresh install.0042 is required for the seven-day invitations already used by Access. The proposed combined chain contains49 distinct full filenames; repeated numeric prefixes are not collisions. Never sort by prefix or rename one line's files to fit the other.

Keep `0026_tenant_ownership_expand.sql` and `0027_tenant_ownership_validate.sql` held. Do not add them to fresh, upgrade or operator execution.

When supplemental files enter collab, update the explicit manifest and `CURRENT_MIGRATIONS` together, preserve exact coverage guards, and rerun installer/adapter parity and all required owned migration cases. `finalContract` already includes0042; do not rewrite it from an older PR34 note that omitted it.

## Upgrade reconciliation

First verify the exact target, isolated environment, candidate SHA and recoverable restore point. Read its actual migration evidence and schema; no hosted ledger has been inspected in this work. A numeric prefix alone never proves a migration is present.

The PR34 history reports an older name, `0038_native_payroll_setup_records.sql`, before the rename to0039. If a real ledger contains that name, stop and compare its recorded content/schema with the frozen file. A separately reviewed operator reconciliation is required; neither replay CREATE TABLE nor automatically rewrite a ledger row. Check the table, current view, immutable row/truncate triggers and exact index definitions as well as recorded filenames.

For an upgrade, apply only verified missing files in their dependency order. A fresh-empty company installer must never be used as an upgrade tool. An earlier completed FINAL chain is history: preserve its successful adoption and do not replay it just to make the ledger resemble a fresh install.

## Read-index execution condition

PR34's0038 uses ordinary CREATE INDEX. Keep it in its own bounded operator step rather than holding write locks through unrelated migrations. The existing deployment-session bounds are lock_timeout5s and statement_timeout60s; they must be rehearsed against representative isolated data before authorizing a real window. A timeout is a failed migration, not permission for blind retry under traffic.

If an authorized operator elects a concurrent pre-build for a large table, it must run outside a transaction and preserve the reviewed names/definitions. Verify `pg_index.indisvalid`, `indisready`, target table and `pg_get_indexdef` for both `schedule_revision_shifts_source_idx` and `time_entries_clock_out_idx`. An existing relation name is insufficient: IF NOT EXISTS does not validate its definition, and failed concurrent builds can leave invalid indexes. See [PostgreSQL16 CREATE INDEX](https://www.postgresql.org/docs/16/sql-createindex.html). Do not silently drop an invalid or mismatched index on a live database; reconcile it under a separately reviewed operator plan.

## Evidence still required

- Fresh-empty setup with both supplemental files, exact final order, company/Owner adoption and current invitations.
- Upgrade from the existing pre-supplemental chain, and from a fictional database where the exact PR34 filenames are already recorded. Prove neither line is reapplied by prefix.
- Failed-step rollback, lock contention bounded by the recorded budgets, valid and deliberately invalid same-name index cases, and preservation of pre-existing rows and immutable history.
- Owner setup, PIN/device/review/photo functions and invitations on the resulting schema, with source unchanged and ownership-checked cleanup.
- A separate hosted Preview transport/restore rehearsal against a proven isolated fictional target. Local PostgreSQL does not close that gate.

The existing container rehearsal is not runnable from this shell because the docker executable is absent. Its ownership controls must not be bypassed by supplying an arbitrary database URL. The approved native PostgreSQL fixture runtime is available for a scoped adapter/rehearsal; no runtime was installed or service started during this inventory. No combined rehearsal or production readiness is claimed.
