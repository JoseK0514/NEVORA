-- Operator-only control migration. Never part of company bootstrap/build.
BEGIN;
CREATE TABLE nevora_onboarding.worker_runtime_enrollments(
 id uuid PRIMARY KEY,
 workspace_id uuid NOT NULL REFERENCES nevora_onboarding.workspace_registry(id),
 environment text NOT NULL CHECK(environment='test'),
 incarnation bigint NOT NULL CHECK(incarnation>0),
 registry_revision bigint NOT NULL CHECK(registry_revision>0),
 source_secret_ref uuid NOT NULL REFERENCES nevora_onboarding.workspace_secrets(id),
 login_role name NOT NULL CHECK(login_role::text ~ '^nv_worker_[a-f0-9]{24}$'),
 canonical_origin text NOT NULL,
 provider_project_id text NOT NULL,
 recipient_public_key text NOT NULL CHECK(octet_length(recipient_public_key) BETWEEN 100 AND 8192 AND recipient_public_key LIKE '-----BEGIN PUBLIC KEY-----%'),
 recipient_fingerprint text NOT NULL UNIQUE CHECK(recipient_fingerprint ~ '^[a-f0-9]{64}$'),
 issuer_source_sha text NOT NULL CHECK(issuer_source_sha ~ '^[a-f0-9]{40}$'),
 request_hash text NOT NULL CHECK(request_hash ~ '^[a-f0-9]{64}$'),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 request_expires_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN('PENDING','COMPLETE')),
 key_envelope text,
 ciphertext text,
 issued_at timestamptz,
 revoked_at timestamptz,
 CHECK(request_expires_at>created_at AND request_expires_at<=created_at+interval '30 minutes'),
 CHECK(expires_at>=request_expires_at AND expires_at<=created_at+interval '24 hours'),
 CHECK((status='PENDING' AND key_envelope IS NULL AND ciphertext IS NULL AND issued_at IS NULL) OR
       (status='COMPLETE' AND key_envelope IS NOT NULL AND octet_length(key_envelope)=512 AND key_envelope ~ '^[A-Za-z0-9_-]+$' AND ciphertext IS NOT NULL AND octet_length(ciphertext)<=12000 AND issued_at IS NOT NULL))
);
REVOKE ALL ON nevora_onboarding.worker_runtime_enrollments FROM PUBLIC;
ALTER TABLE nevora_onboarding.worker_runtime_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevora_onboarding.worker_runtime_enrollments FORCE ROW LEVEL SECURITY;
CREATE POLICY enrollment_operator ON nevora_onboarding.worker_runtime_enrollments
 USING(session_user=(SELECT r.rolname FROM pg_catalog.pg_class c JOIN pg_catalog.pg_roles r ON r.oid=c.relowner WHERE c.oid='nevora_onboarding.worker_runtime_enrollments'::pg_catalog.regclass))
 WITH CHECK(session_user=(SELECT r.rolname FROM pg_catalog.pg_class c JOIN pg_catalog.pg_roles r ON r.oid=c.relowner WHERE c.oid='nevora_onboarding.worker_runtime_enrollments'::pg_catalog.regclass));
CREATE POLICY enrollment_reader ON nevora_onboarding.worker_runtime_enrollments FOR SELECT USING(
 session_user::text ~ '^nv_control_worker_t_[a-f0-9]{32}$' AND replace(workspace_id::text,'-','')=right(session_user::text,32)
 AND environment='test' AND status='COMPLETE' AND revoked_at IS NULL AND expires_at>clock_timestamp());
CREATE FUNCTION nevora_onboarding.worker_enrollment_immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF (NEW.id,NEW.workspace_id,NEW.environment,NEW.incarnation,NEW.registry_revision,NEW.source_secret_ref,NEW.login_role,NEW.canonical_origin,NEW.provider_project_id,NEW.recipient_public_key,NEW.recipient_fingerprint,NEW.issuer_source_sha,NEW.request_hash,NEW.created_at,NEW.request_expires_at,NEW.expires_at)
 IS DISTINCT FROM (OLD.id,OLD.workspace_id,OLD.environment,OLD.incarnation,OLD.registry_revision,OLD.source_secret_ref,OLD.login_role,OLD.canonical_origin,OLD.provider_project_id,OLD.recipient_public_key,OLD.recipient_fingerprint,OLD.issuer_source_sha,OLD.request_hash,OLD.created_at,OLD.request_expires_at,OLD.expires_at)
 OR (OLD.status='COMPLETE' AND (NEW.status,NEW.key_envelope,NEW.ciphertext,NEW.issued_at) IS DISTINCT FROM (OLD.status,OLD.key_envelope,OLD.ciphertext,OLD.issued_at))
 OR (OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at)
 THEN RAISE EXCEPTION 'worker_enrollment_is_immutable' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER worker_enrollment_immutable BEFORE UPDATE ON nevora_onboarding.worker_runtime_enrollments FOR EACH ROW EXECUTE FUNCTION nevora_onboarding.worker_enrollment_immutable();
COMMIT;
