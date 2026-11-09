BEGIN;
-- Presentation receipts never replace canonical weekly confirmation or consent.
CREATE TABLE employee_attention_receipts (
 id uuid PRIMARY KEY,
 workspace_id text NOT NULL REFERENCES workspaces(id),
 employee_id text NOT NULL REFERENCES employees(id),
 source_kind text NOT NULL CHECK(source_kind IN ('SCHEDULE','EXCHANGE','TIME_OFF','TIME_CORRECTION','COMMUNICATION')),
 source_id text NOT NULL CHECK(length(source_id) BETWEEN 1 AND 200),
 source_version text NOT NULL CHECK(length(source_version) BETWEEN 1 AND 200),
 read_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(workspace_id,employee_id,source_kind,source_id,source_version)
);
CREATE TABLE employee_attention_operations (
 workspace_id text NOT NULL REFERENCES workspaces(id),
 employee_id text NOT NULL REFERENCES employees(id),
 operation_id uuid NOT NULL,
 command_hash char(64) NOT NULL CHECK(command_hash ~ '^[a-f0-9]{64}$'),
 result jsonb NOT NULL CHECK(result->>'status'='committed'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(workspace_id,employee_id,operation_id)
);
CREATE FUNCTION nevora_attention_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'attention_history_immutable'; END $$;
CREATE TRIGGER attention_receipts_immutable BEFORE UPDATE OR DELETE ON employee_attention_receipts
 FOR EACH ROW EXECUTE FUNCTION nevora_attention_append_only();
CREATE TRIGGER attention_operations_immutable BEFORE UPDATE OR DELETE ON employee_attention_operations
 FOR EACH ROW EXECUTE FUNCTION nevora_attention_append_only();
-- Rollback: deploy the previous presentation path / disable new commands. Keep
-- these additive records and all canonical acknowledgements/history intact.
COMMIT;
