BEGIN;
-- Additive and empty on existing installations. No legacy company or Owner adoption.
CREATE TABLE onboarding_provision_receipts(
 workspace_id text PRIMARY KEY REFERENCES workspaces(id),
 operation_id uuid NOT NULL UNIQUE,registration_id uuid NOT NULL,
 environment text NOT NULL CHECK(environment IN('test','development','production')),
 incarnation bigint NOT NULL CHECK(incarnation>0),
 provider_project_id text NOT NULL,resource_name text NOT NULL,
 manifest_hash text NOT NULL CHECK(manifest_hash ~ '^[a-f0-9]{64}$'),
 command_hash text NOT NULL CHECK(command_hash ~ '^[a-f0-9]{64}$'),
 initial_owner_id text NOT NULL REFERENCES employees(id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE onboarding_initial_owner(
 workspace_id text PRIMARY KEY REFERENCES workspaces(id),
 employee_id text NOT NULL UNIQUE REFERENCES employees(id),registration_id uuid NOT NULL,
 state text NOT NULL DEFAULT 'PENDING' CHECK(state IN('PENDING','ACTIVATED')),
 grant_revision bigint NOT NULL DEFAULT 0 CHECK(grant_revision>=0),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),activated_at timestamptz,
 CHECK((state='ACTIVATED')=(activated_at IS NOT NULL))
);
CREATE TABLE onboarding_owner_grants(
 id uuid PRIMARY KEY,workspace_id text NOT NULL REFERENCES onboarding_initial_owner(workspace_id),
 operation_id uuid NOT NULL UNIQUE,registration_id uuid NOT NULL,
 incarnation bigint NOT NULL CHECK(incarnation>0),revision bigint NOT NULL CHECK(revision>0),
 token_digest text NOT NULL UNIQUE CHECK(token_digest ~ '^[a-f0-9]{64}$'),
 employee_updated_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL,revoked_at timestamptz,consumed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),UNIQUE(workspace_id,revision)
);
CREATE TABLE onboarding_owner_activation_receipts(
 operation_id uuid PRIMARY KEY,workspace_id text NOT NULL REFERENCES workspaces(id),
 grant_id uuid NOT NULL UNIQUE REFERENCES onboarding_owner_grants(id),
 employee_id text NOT NULL REFERENCES employees(id),
 command_hash text NOT NULL CHECK(command_hash ~ '^[a-f0-9]{64}$'),
 credential_updated_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE onboarding_progress(
 workspace_id text PRIMARY KEY REFERENCES workspaces(id),
 version bigint NOT NULL DEFAULT 1 CHECK(version>0),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE onboarding_commands(
 workspace_id text NOT NULL REFERENCES workspaces(id),
 actor_employee_id text NOT NULL REFERENCES employees(id),operation_id uuid NOT NULL,
 command_kind text NOT NULL,command_hash text NOT NULL CHECK(command_hash ~ '^[a-f0-9]{64}$'),
 resulting_version bigint NOT NULL CHECK(resulting_version>0),
 result jsonb NOT NULL CHECK(jsonb_typeof(result)='object'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(workspace_id,actor_employee_id,operation_id)
);
CREATE TABLE onboarding_invitation_batches(
 workspace_id text NOT NULL REFERENCES workspaces(id),actor_employee_id text NOT NULL REFERENCES employees(id),
 operation_id uuid NOT NULL,command_hash text NOT NULL CHECK(command_hash ~ '^[a-f0-9]{64}$'),
 version bigint NOT NULL DEFAULT 1 CHECK(version>0),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(workspace_id,actor_employee_id,operation_id)
);
CREATE TABLE onboarding_invitation_items(
 workspace_id text NOT NULL,actor_employee_id text NOT NULL,operation_id uuid NOT NULL,
 employee_id text NOT NULL REFERENCES employees(id),child_operation_id uuid NOT NULL UNIQUE,
 expected_employee_version text NOT NULL,expected_invitation_revision integer NOT NULL CHECK(expected_invitation_revision>=0),
 state text NOT NULL DEFAULT 'PREPARED' CHECK(state IN('PREPARED','SAVED','BLOCKED','UNKNOWN')),
 result jsonb CHECK(result IS NULL OR jsonb_typeof(result)='object'),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(workspace_id,actor_employee_id,operation_id,employee_id),
 FOREIGN KEY(workspace_id,actor_employee_id,operation_id) REFERENCES onboarding_invitation_batches(workspace_id,actor_employee_id,operation_id)
);
CREATE FUNCTION onboarding_receipt_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'onboarding_receipt_is_immutable'; END $$;
CREATE TRIGGER onboarding_provision_immutable BEFORE UPDATE OR DELETE ON onboarding_provision_receipts FOR EACH ROW EXECUTE FUNCTION onboarding_receipt_immutable();
CREATE TRIGGER onboarding_activation_immutable BEFORE UPDATE OR DELETE ON onboarding_owner_activation_receipts FOR EACH ROW EXECUTE FUNCTION onboarding_receipt_immutable();
CREATE TRIGGER onboarding_command_immutable BEFORE UPDATE OR DELETE ON onboarding_commands FOR EACH ROW EXECUTE FUNCTION onboarding_receipt_immutable();
REVOKE ALL ON onboarding_provision_receipts,onboarding_initial_owner,onboarding_owner_grants,onboarding_owner_activation_receipts,onboarding_progress,onboarding_commands,onboarding_invitation_batches,onboarding_invitation_items FROM PUBLIC;
COMMIT;
