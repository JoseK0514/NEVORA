BEGIN;
-- Forward repair: payroll notices and Company Updates share the existing
-- notification ledger. Preserve every valid source and all historical records.
ALTER TABLE notifications DROP CONSTRAINT notifications_source_kind_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_source_kind_check CHECK
 (source_kind IN ('SCHEDULE','TIME_OFF','EXCHANGE','CALLOUT','AVAILABILITY',
 'MANAGER_SUMMARY','SELF_TEST','COMMUNICATION','PAYROLL_PREPARATION','PAYROLL_STATEMENT'));
COMMIT;
