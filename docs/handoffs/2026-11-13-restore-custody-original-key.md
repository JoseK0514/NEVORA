# Restore custody and original-key continuity

Jose requested closing the two remaining SCRUM-85 evidence gaps and integrating the result into development. Codex owns backend/hosting and this bounded regression; Claude retains UI. Development is the primary acceptance release at production standards. No main/production activation or renewal of an expired provider window is included.

## New original-key proof

The historical hosted check enrolled a new authenticator after restoration. It demonstrated new enrollment and original row preservation, but did not authenticate using the original restored credential. That limitation remains part of the historical record.

`src/test/integration/onboarding-operations.integration.ts` now extends the existing real dump/restore/retirement case. A fictional signer registers and signs in before backup; its credential ID, public key, handle and counter are captured. A real custom-format backup is restored with no enrollment/recovery/reset afterward. The restored rows must equal the original rows. The same retained signer then authenticates a fresh challenge, advances its counter from1 to2 and creates the expected employee session. Exact assertion replay, repeated nonzero counter and a wrong signer claiming the original credential ID are rejected without additional sessions or counter advancement. Registration audit count remains one. The control registry stays suspended, and the existing canonical retirement removes restored sessions/challenges, invalidates the old password and preserves suspension.

This is a separately identified **new owned-loopback proof**, executed at071cb1330704157140cfa6a7698d29cd3f170d1e on PostgreSQL17.11. It does not relabel the historical961,879-byte hosted archive. The new archive's recorded byte count/hash, original/restored public identity digests, tool versions and counter/replay outcomes are in `restore-custody-original-key-evidence-20261113/owned-original-key-report.json`. The signer stays in memory; the new fixture archive and owned cluster are removed at teardown. No private signer or raw backup is committed.

All six operations cases pass. Both meaningful mutation controls fail at the exact restored-credential row comparison: removing the original key before backup, and enrolling a replacement after restore. Each retains five passing original cases/one intended failure and complete cleanup; the unmodified source passes afterward. Separate passkey integration tests pass37/37. Full TypeScript checking and targeted ESLint pass. The first author run exposed an incomplete test executor and the first typecheck an implicit parameter annotation; those test-only setup errors were corrected without runtime changes or relaxed assertions.

## Historical backup custody

The original producer has confirmed the existing private `hosted-synthetic.dump` survives:961,879bytes, SHA256 `08c57ad9417bb094678953b4d17a7b7aeeddbfc9b0d1095046ee52878d8651eb`, regular owner-only0600 file. Read-only `pg_restore --list` succeeded without a database connection, identifying155 tables and155 table-data entries. This section is a producer-observed recovery checkpoint; the complete sanitized custody/TOC/historical restore packet and Chat3's independent disposition must be attached before full custody closure is claimed.

Original custody remains with durable Codex chat6af665b2-2b10-8191-81e8-78f4e5f1b0d6, **Work Jira scrums130,89,85,84**, under its private `/workspace/nevora-scrum-84-85-89/.omo/evidence/scrum84-hosted-20261112/` evidence root. Jose explicitly authorized contacting that producer solely for existing-file recovery. No new hosted dump, restore, signer or provider operation was requested there. The historical original signer is being checked; absence will remain explicit and will not be filled with a fabricated continuity claim.

## Independent and release gates

Chat3 owns the bounded independent SCRUM-85 review. The implementer supplies reports and source; it does not self-close the finding. SCRUM-84/86 source applicability, the full FR-AUTH-001 register, hosted transaction/actual-session checks and combined product acceptance retain their separate scopes. New local passes do not certify hosted transport, a current recovery point, production RPO/RTO or live reactivation.

The source is based on qualified development70866e964ee8fd8fa5ae65df952d06cd3fcef06d. The only application-inventory change is the restore integration test; no runtime, API, SQL migration, permission, UI, provider binding or activation switch changed. Six manuals are rebuilt because integration tests participate in the application content hash. The final exact candidate and actual-development qualification are separate subsequent receipts; no old CI success is relabeled.

Rollback for this source-only change is a normal reviewed development revert. Historical raw evidence and independent findings must be preserved. No hosted rollback is needed because this work operates only disposable local fixtures and existing read-only producer files. Safari remains with the current serial operator; all old NEVORA hosted grants remain closed.
