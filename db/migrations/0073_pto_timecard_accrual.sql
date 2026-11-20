BEGIN;

-- A receipt is retained even when a finalized revision produces no change.
-- Leave approvals and account movements continue to use the existing ledger.
CREATE TABLE pto_timecard_accrual_revisions (
  workspace_id text NOT NULL REFERENCES workspaces(id),
  employee_id text NOT NULL REFERENCES employees(id),
  timecard_operation_id uuid NOT NULL REFERENCES timecard_revisions(operation_id),
  timecard_revision integer NOT NULL CHECK (timecard_revision > 0),
  start_date date NOT NULL,
  end_date date NOT NULL CHECK (end_date BETWEEN start_date AND start_date+30),
  policy_id uuid NOT NULL,
  policy_code text NOT NULL CHECK (policy_code IN ('VACATION','SICK')),
  qualifying_minutes integer NOT NULL CHECK (qualifying_minutes BETWEEN 0 AND 525600),
  award_minutes integer NOT NULL CHECK (award_minutes BETWEEN 0 AND 525600),
  change_minutes integer NOT NULL CHECK (change_minutes BETWEEN -525600 AND 525600),
  ledger_entry_id uuid,
  actor_employee_id text NOT NULL REFERENCES employees(id),
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (workspace_id,timecard_operation_id,policy_code),
  UNIQUE (workspace_id,ledger_entry_id),
  FOREIGN KEY (workspace_id,policy_id,policy_code) REFERENCES pto_policy_revisions(workspace_id,id,code),
  FOREIGN KEY (workspace_id,ledger_entry_id) REFERENCES pto_ledger(workspace_id,id),
  CHECK ((change_minutes=0)=(ledger_entry_id IS NULL))
);

CREATE INDEX pto_timecard_accrual_period
  ON pto_timecard_accrual_revisions(workspace_id,employee_id,start_date,end_date,policy_code,timecard_revision DESC);

CREATE TRIGGER pto_timecard_accrual_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON pto_timecard_accrual_revisions
  FOR EACH STATEMENT EXECUTE FUNCTION workforce_history_immutable();

DO $grant$
DECLARE app_role text;
BEGIN
  SELECT login_role::text INTO app_role FROM onboarding_runtime_roles WHERE kind='APP';
  IF app_role IS NOT NULL THEN
    IF app_role !~ '^nv_app_[a-f0-9]{24}$' OR NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname=app_role)
    THEN RAISE EXCEPTION 'workforce_app_role_invalid'; END IF;
    EXECUTE format('GRANT SELECT,INSERT ON pto_timecard_accrual_revisions TO %I', app_role);
  END IF;
END $grant$;

COMMIT;
