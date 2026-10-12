BEGIN;
CREATE TABLE schedule_copy_operations(
 workspace_id text NOT NULL REFERENCES workspaces(id), actor_employee_id text NOT NULL REFERENCES employees(id), operation_id uuid NOT NULL,
 command_hash text NOT NULL CHECK(length(command_hash)=64), command jsonb NOT NULL, source jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY(workspace_id,actor_employee_id,operation_id)
);
CREATE TABLE schedule_copy_receipts(
 workspace_id text NOT NULL,actor_employee_id text NOT NULL,operation_id uuid NOT NULL,
 payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(workspace_id,actor_employee_id,operation_id),
 FOREIGN KEY(workspace_id,actor_employee_id,operation_id) REFERENCES schedule_copy_operations(workspace_id,actor_employee_id,operation_id)
);
CREATE TABLE schedule_copy_row_receipts(
 workspace_id text NOT NULL,actor_employee_id text NOT NULL,operation_id uuid NOT NULL,row_number integer NOT NULL CHECK(row_number>=0),
 source_id text NOT NULL,status text NOT NULL CHECK(status IN('COMMITTED','SKIPPED')),reason text, warnings jsonb NOT NULL,inserted_shift_id text,
 CHECK((status='COMMITTED' AND inserted_shift_id IS NOT NULL AND reason IS NULL) OR(status='SKIPPED' AND inserted_shift_id IS NULL AND reason IS NOT NULL)),
 PRIMARY KEY(workspace_id,actor_employee_id,operation_id,row_number),
 FOREIGN KEY(workspace_id,actor_employee_id,operation_id) REFERENCES schedule_copy_receipts(workspace_id,actor_employee_id,operation_id)
);
CREATE FUNCTION nevora_immutable_ledger() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'immutable ledger'; END $$;
CREATE TRIGGER immutable_copy_operation BEFORE UPDATE OR DELETE ON schedule_copy_operations FOR EACH ROW EXECUTE FUNCTION nevora_immutable_ledger();
CREATE TRIGGER immutable_copy_receipt BEFORE UPDATE OR DELETE ON schedule_copy_receipts FOR EACH ROW EXECUTE FUNCTION nevora_immutable_ledger();
CREATE TRIGGER immutable_copy_row BEFORE UPDATE OR DELETE ON schedule_copy_row_receipts FOR EACH ROW EXECUTE FUNCTION nevora_immutable_ledger();
CREATE TRIGGER immutable_copy_operation_truncate BEFORE TRUNCATE ON schedule_copy_operations FOR EACH STATEMENT EXECUTE FUNCTION nevora_immutable_ledger();
CREATE TRIGGER immutable_copy_receipt_truncate BEFORE TRUNCATE ON schedule_copy_receipts FOR EACH STATEMENT EXECUTE FUNCTION nevora_immutable_ledger();
CREATE TRIGGER immutable_copy_row_truncate BEFORE TRUNCATE ON schedule_copy_row_receipts FOR EACH STATEMENT EXECUTE FUNCTION nevora_immutable_ledger();
COMMIT;
