BEGIN;
CREATE TABLE onboarding_restore_receipts(
 operation_id uuid PRIMARY KEY,workspace_id text NOT NULL REFERENCES workspaces(id),
 environment text NOT NULL CHECK(environment IN('test','development','production')),
 from_incarnation bigint NOT NULL CHECK(from_incarnation>0),
 to_incarnation bigint NOT NULL CHECK(to_incarnation=from_incarnation+1),
 provider_project_id text NOT NULL,manifest_hash text NOT NULL CHECK(manifest_hash ~ '^[a-f0-9]{64}$'),
 operator_ref text NOT NULL CHECK(char_length(operator_ref) BETWEEN 1 AND 200),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(workspace_id,to_incarnation)
);
CREATE TRIGGER onboarding_restore_immutable BEFORE UPDATE OR DELETE ON onboarding_restore_receipts FOR EACH ROW EXECUTE FUNCTION onboarding_receipt_immutable();
REVOKE ALL ON onboarding_restore_receipts FROM PUBLIC;
COMMIT;
