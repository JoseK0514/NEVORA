BEGIN;
CREATE TABLE attendance_policy_observations(id uuid PRIMARY KEY,workspace_id text NOT NULL REFERENCES workspaces(id),actor_employee_id text NOT NULL REFERENCES employees(id),payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TRIGGER attendance_observations_immutable BEFORE UPDATE OR DELETE ON attendance_policy_observations FOR EACH ROW EXECUTE FUNCTION nevora_immutable_ledger();
CREATE TRIGGER attendance_observations_no_truncate BEFORE TRUNCATE ON attendance_policy_observations FOR EACH STATEMENT EXECUTE FUNCTION nevora_immutable_ledger();
COMMIT;
