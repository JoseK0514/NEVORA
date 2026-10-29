# Release1 migration preparation

Status: combined local fresh/upgrade/index rehearsal passes at0b50be70. Hosted isolated Preview/restore, final tablet/service checks and production authorization remain open. No hosted or production migration was run.

## Filename contract

The authoritative manifest, actual fresh installer and disposable adapter agree on49 applied-chain filenames and2 held tenant files. The historical47-file inventory remains in MIGRATION-PLAN-RESULTS.json. The current combined inventory, exact file hashes and rehearsal receipts are in BATCH-12-RESULTS.json.

The base sequence through0037 is unchanged. Its tail is:

1. 0038_read_path_indexes.sql — integrated from clean PR34 source60252ca6, with the bounded index preflight described below.
2. 0039_native_payroll_setup_records.sql — byte-identical to that PR34 source.
3. 0038_clocker_pin_operation_reference.sql.
4. 0039_clocker_review_requests.sql.
5. 0040_clocker_photo_policy_evidence.sql.
6. 0041_clocker_photo_platform_cleanup.sql.

Final files remain0031_native_payroll.sql,0032_company_access_invitations.sql,0042_company_invitation_lifetime.sql, in that order after company/Owner creation on a fresh install.0042 is required for seven-day invitations. Repeated numeric prefixes are independent filenames; never prefix-sort or rename them. Tenant files0026_tenant_ownership_expand.sql and0027_tenant_ownership_validate.sql stay held and are rejected in the reviewed upgrade-ledger input.

## Upgrade reconciliation

Before any separately authorized operator run, verify the exact environment, candidate, full-filename ledger, schema and recoverable restore point. No existing or hosted ledger has been inspected here. The read-only planner accepts verified applied full filenames and returns missing files in declared dependency order. It rejects duplicate, unknown,prefix-only,held and historical renamed entries; it neither executes SQL nor rewrites a ledger.

The earlier PR34 name0038_native_payroll_setup_records.sql requires separate operator reconciliation if found. Compare frozen content/schema/evidence rather than replaying CREATE TABLE or automatically renaming its ledger row. Verify the setup-record table/current view and row/truncate immutability triggers, not only the name.

A fresh-empty company installer is not an upgrade tool. Preserve completed final adoption history. The owned upgrade rehearsal starts from the full older chain with final adoption already applied, preserves company rows, adds exactly the two missing filenames and then reports no replay.

## Index execution condition

0038 uses ordinary CREATE INDEX. Its preflight now checks both known index names,exact public-table/column definitions,indisvalid and indisready. A wrong or invalid object stops the file and remains for operator review; IF NOT EXISTS alone is not proof. The local rehearsal creates a genuinely interrupted concurrent index, verifies rejection and confirms that no implicit repair/drop occurs.

Keep this as its own bounded operator step with lock_timeout5s and statement_timeout60s. The owned lock-contention case times out under that budget, leaves both indexes absent after the failed file, then succeeds after the blocker is released. This small empty-table rehearsal does not establish a safe window for large production tables. A concurrent pre-build requires a separately reviewed outside-transaction plan with the exact names/definitions. See PostgreSQL16 CREATE INDEX documentation: https://www.postgresql.org/docs/16/sql-createindex.html.

## Local evidence and remaining gates

Eleven cases across three files pass: fresh actual company/Owner setup, rollback/retry after injected adoption failure,concurrent setup serialization,wrong/invalid index rejection,lock budget/retry and upgrade preservation. Immutable setup facts resist UPDATE,DELETE and TRUNCATE. Invitation lifetime accepts168hours and rejects one additional second. Twelve Node planner checks pass. All data and PostgreSQL clusters are fictional,invocation-owned,loopback-only and cleaned up through ownership guards.

Still required: final same-candidate Clocker PIN/device/review/photo and Owner service journeys; a hosted isolated fictional transport/restore rehearsal; verified operator ledger/schema and large-table lock assessment; support ownership and the tested tablet operations guide; independent FR-AUTH closure and Jose’s production authorization. Local SQL success does not waive any of these gates.
