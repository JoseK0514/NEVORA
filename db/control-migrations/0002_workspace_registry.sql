BEGIN;
CREATE TABLE nevora_onboarding.workspace_registry(
 id uuid PRIMARY KEY,
 registration_id uuid UNIQUE REFERENCES nevora_onboarding.registrations(id),
 canonical_origin text NOT NULL UNIQUE,
 environment text NOT NULL CHECK(environment IN('test','development','production')),
 incarnation bigint NOT NULL CHECK(incarnation>0),
 revision bigint NOT NULL DEFAULT 1 CHECK(revision>0),
 lifecycle text NOT NULL CHECK(lifecycle IN('PROVISIONING','OWNER_ACTIVATION_REQUIRED','ACTIVE','SUSPENDED','QUARANTINED')),
 provider_project_id text,
 app_secret_ref uuid,
 app_role_name name,
 worker_secret_ref uuid,
 worker_role_name name,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(lifecycle IN('PROVISIONING','QUARANTINED') OR (provider_project_id IS NOT NULL AND app_secret_ref IS NOT NULL AND app_role_name IS NOT NULL))
);
CREATE TABLE nevora_onboarding.workspace_secrets(
 id uuid PRIMARY KEY,
 workspace_id uuid NOT NULL REFERENCES nevora_onboarding.workspace_registry(id),
 environment text NOT NULL CHECK(environment IN('test','development','production')),
 incarnation bigint NOT NULL CHECK(incarnation>0),
 role_kind text NOT NULL CHECK(role_kind IN('APP','WORKER')),
 login_role name NOT NULL,
 ciphertext text NOT NULL,
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(id,workspace_id,environment,incarnation,role_kind)
);
CREATE FUNCTION nevora_onboarding.guard_registry_revision() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.environment IS DISTINCT FROM OLD.environment OR NEW.canonical_origin IS DISTINCT FROM OLD.canonical_origin OR NEW.registration_id IS DISTINCT FROM OLD.registration_id OR NEW.incarnation<OLD.incarnation OR NEW.revision<=OLD.revision THEN
  RAISE EXCEPTION 'workspace_registry_revision_conflict' USING ERRCODE='40001';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER workspace_registry_revision BEFORE UPDATE ON nevora_onboarding.workspace_registry FOR EACH ROW EXECUTE FUNCTION nevora_onboarding.guard_registry_revision();
CREATE FUNCTION nevora_onboarding.guard_workspace_secret() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.id,NEW.workspace_id,NEW.environment,NEW.incarnation,NEW.role_kind,NEW.login_role,NEW.ciphertext) IS DISTINCT FROM (OLD.id,OLD.workspace_id,OLD.environment,OLD.incarnation,OLD.role_kind,OLD.login_role,OLD.ciphertext) OR (NOT OLD.active AND NEW.active) THEN
  RAISE EXCEPTION 'workspace_secret_is_immutable' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER workspace_secret_immutable BEFORE UPDATE ON nevora_onboarding.workspace_secrets FOR EACH ROW EXECUTE FUNCTION nevora_onboarding.guard_workspace_secret();
REVOKE ALL ON nevora_onboarding.workspace_registry,nevora_onboarding.workspace_secrets FROM PUBLIC;
COMMIT;
