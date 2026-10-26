BEGIN;
-- Plain payroll setup (Oct 25 2026): the server records who saved each setup
-- revision, when, its form version and a SHA-256 it computes over the saved facts.
-- Company payroll defaults live here too. Additive and append-only; it depends only
-- on workspaces/employees, so it runs in the base chain before 0031.
CREATE TABLE native_payroll_setup_records(
 workspace_id text NOT NULL REFERENCES workspaces(id),
 kind text NOT NULL CHECK(kind IN('COMPANY_DEFAULTS','EMPLOYEE_PAY','OPENING_TOTALS')),
 subject_id text NOT NULL CHECK(char_length(subject_id) BETWEEN 1 AND 200),
 tax_year integer NOT NULL DEFAULT 0 CHECK(tax_year=0 OR tax_year BETWEEN 2026 AND 2100),
 revision integer NOT NULL CHECK(revision>0),
 operation_id uuid NOT NULL,
 actor_employee_id text NOT NULL REFERENCES employees(id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 facts_sha256 text NOT NULL CHECK(facts_sha256 ~ '^[a-f0-9]{64}$'),
 payload jsonb NOT NULL CHECK(payload->>'factsSha256'=facts_sha256 AND (payload->>'revision')::integer=revision AND payload->>'kind'=kind AND payload->>'subjectId'=subject_id),
 PRIMARY KEY(workspace_id,kind,subject_id,tax_year,revision),
 CHECK((kind='COMPANY_DEFAULTS')=(subject_id='COMPANY')),
 CHECK((kind='OPENING_TOTALS')=(tax_year<>0)));
CREATE VIEW native_payroll_setup_records_current AS SELECT DISTINCT ON(workspace_id,kind,subject_id,tax_year) * FROM native_payroll_setup_records ORDER BY workspace_id,kind,subject_id,tax_year,revision DESC;
CREATE TRIGGER native_payroll_setup_immutable BEFORE UPDATE OR DELETE ON native_payroll_setup_records FOR EACH ROW EXECUTE FUNCTION nevora_immutable_ledger();
CREATE TRIGGER native_payroll_setup_immutable_truncate BEFORE TRUNCATE ON native_payroll_setup_records FOR EACH STATEMENT EXECUTE FUNCTION nevora_immutable_ledger();
COMMIT;
