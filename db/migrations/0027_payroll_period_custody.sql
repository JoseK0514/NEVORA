BEGIN;
CREATE TABLE payroll_period_populations(
 workspace_id text NOT NULL REFERENCES workspaces(id),start_date date NOT NULL,end_date date NOT NULL,revision integer NOT NULL CHECK(revision>0),
 operation_id uuid NOT NULL,actor_employee_id text NOT NULL REFERENCES employees(id),command_hash text NOT NULL,
 source_hash text NOT NULL,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(workspace_id,start_date,end_date,revision),UNIQUE(workspace_id,actor_employee_id,operation_id)
);
CREATE TABLE payroll_period_manifests(
 workspace_id text NOT NULL REFERENCES workspaces(id),id uuid NOT NULL,actor_employee_id text NOT NULL REFERENCES employees(id),command_hash text NOT NULL,
 start_date date NOT NULL,end_date date NOT NULL,population_revision integer NOT NULL,source_hash text NOT NULL,
 manifest_hash text NOT NULL,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(workspace_id,id),UNIQUE(workspace_id,start_date,end_date,population_revision),
 FOREIGN KEY(workspace_id,start_date,end_date,population_revision) REFERENCES payroll_period_populations(workspace_id,start_date,end_date,revision)
);
CREATE TABLE payroll_period_events(
 workspace_id text NOT NULL,manifest_id uuid NOT NULL,id uuid NOT NULL,actor_employee_id text NOT NULL REFERENCES employees(id),
 kind text NOT NULL CHECK(kind IN('ARTIFACT_SERVED','REPORTED_SUBMITTED','REPORTED_IMPORTED')),command_hash text NOT NULL,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(workspace_id,id),FOREIGN KEY(workspace_id,manifest_id) REFERENCES payroll_period_manifests(workspace_id,id)
);
CREATE TRIGGER population_immutable BEFORE UPDATE OR DELETE ON payroll_period_populations FOR EACH ROW EXECUTE FUNCTION nevora_immutable_ledger();
CREATE TRIGGER population_no_truncate BEFORE TRUNCATE ON payroll_period_populations FOR EACH STATEMENT EXECUTE FUNCTION nevora_immutable_ledger();
CREATE TRIGGER manifest_immutable BEFORE UPDATE OR DELETE ON payroll_period_manifests FOR EACH ROW EXECUTE FUNCTION nevora_immutable_ledger();
CREATE TRIGGER manifest_no_truncate BEFORE TRUNCATE ON payroll_period_manifests FOR EACH STATEMENT EXECUTE FUNCTION nevora_immutable_ledger();
CREATE TRIGGER payroll_event_immutable BEFORE UPDATE OR DELETE ON payroll_period_events FOR EACH ROW EXECUTE FUNCTION nevora_immutable_ledger();
CREATE TRIGGER payroll_event_no_truncate BEFORE TRUNCATE ON payroll_period_events FOR EACH STATEMENT EXECUTE FUNCTION nevora_immutable_ledger();
COMMIT;
