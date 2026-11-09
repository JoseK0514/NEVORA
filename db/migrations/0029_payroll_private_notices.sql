BEGIN;
ALTER TABLE notifications DROP CONSTRAINT notifications_source_kind_check;
-- Preserve communication intents on upgrades through 0028; 0030 repairs databases
-- that already applied the original 0029 constraint. No ledger records change.
ALTER TABLE notifications ADD CONSTRAINT notifications_source_kind_check CHECK(source_kind IN('SCHEDULE','TIME_OFF','EXCHANGE','CALLOUT','AVAILABILITY','MANAGER_SUMMARY','SELF_TEST','COMMUNICATION','PAYROLL_PREPARATION','PAYROLL_STATEMENT'));
-- Private source references only. Financial values and document bytes remain in payroll custody.
CREATE TABLE payroll_notice_sources(id uuid PRIMARY KEY,workspace_id text NOT NULL REFERENCES workspaces(id),kind text NOT NULL CHECK(kind IN('PAYROLL_PREPARATION','PAYROLL_STATEMENT')),version text NOT NULL,payload jsonb NOT NULL);
CREATE TRIGGER payroll_notice_source_immutable BEFORE UPDATE OR DELETE ON payroll_notice_sources FOR EACH ROW EXECUTE FUNCTION nevora_immutable_ledger();
CREATE TRIGGER payroll_notice_source_no_truncate BEFORE TRUNCATE ON payroll_notice_sources FOR EACH STATEMENT EXECUTE FUNCTION nevora_immutable_ledger();
COMMIT;
