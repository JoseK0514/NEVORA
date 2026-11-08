BEGIN;
ALTER TABLE nevora_onboarding.registrations ADD verified_terms_version text,ADD verified_privacy_version text;
UPDATE nevora_onboarding.registrations SET verified_terms_version=terms_version,verified_privacy_version=privacy_version WHERE verified_at IS NOT NULL AND verification_consumed_at IS NOT NULL;
CREATE TABLE nevora_onboarding.provisioning_operations(
 operation_id uuid PRIMARY KEY,
 registration_id uuid NOT NULL UNIQUE REFERENCES nevora_onboarding.registrations(id),
 workspace_id uuid NOT NULL UNIQUE REFERENCES nevora_onboarding.workspace_registry(id),
 environment text NOT NULL CHECK(environment IN('test','development','production')),
 incarnation bigint NOT NULL DEFAULT 1 CHECK(incarnation>0),
 command_hash text NOT NULL CHECK(command_hash ~ '^[a-f0-9]{64}$'),
 payload_ciphertext text NOT NULL,
 verified_terms_version text NOT NULL,verified_privacy_version text NOT NULL,
 account_ref text NOT NULL,region text NOT NULL,resource_policy_version text NOT NULL,
 resource_name text NOT NULL UNIQUE,
 state text NOT NULL CHECK(state IN('RESERVED','CREATING','RESOURCE_READY','BOOTSTRAPPING','OWNER_ACTIVATION_REQUIRED','ACTIVATED','QUARANTINED')),
 version bigint NOT NULL DEFAULT 1 CHECK(version>0),
 lease_token uuid,lease_expires_at timestamptz,
 not_before timestamptz NOT NULL DEFAULT clock_timestamp(),
 resource jsonb CHECK(resource IS NULL OR jsonb_typeof(resource)='object'),
 manifest_hash text CHECK(manifest_hash IS NULL OR manifest_hash ~ '^[a-f0-9]{64}$'),
 reason_code text,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK((lease_token IS NULL)=(lease_expires_at IS NULL))
);
CREATE TABLE nevora_onboarding.provisioning_attempts(
 id uuid PRIMARY KEY,
 operation_id uuid NOT NULL REFERENCES nevora_onboarding.provisioning_operations(operation_id),
 attempt integer NOT NULL CHECK(attempt BETWEEN 1 AND 3),
 outcome text NOT NULL CHECK(outcome IN('PENDING','ACCEPTED','REJECTED','UNKNOWN')),
 resource jsonb CHECK(resource IS NULL OR jsonb_typeof(resource)='object'),
 http_status integer CHECK(http_status IS NULL OR http_status BETWEEN 100 AND 599),
 dispatched_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 acknowledged_at timestamptz,
 UNIQUE(operation_id,attempt)
);
-- Provisioner-only table: never grant the application control principal SELECT.
-- It contains only encrypted desired/runtime/bootstrap credentials, not Owner passwords.
CREATE TABLE nevora_onboarding.provisioning_private(
 operation_id uuid PRIMARY KEY REFERENCES nevora_onboarding.provisioning_operations(operation_id),
 credentials_ciphertext text NOT NULL,
 bootstrap_ciphertext text,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
REVOKE ALL ON nevora_onboarding.provisioning_operations,nevora_onboarding.provisioning_attempts,nevora_onboarding.provisioning_private FROM PUBLIC;

-- Request/source custody is immutable after reservation; workers update only
-- lifecycle, leases, provider acknowledgements and publication state.
CREATE FUNCTION nevora_onboarding.provisioning_request_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.operation_id,NEW.registration_id,NEW.workspace_id,NEW.environment,NEW.incarnation,NEW.command_hash,NEW.payload_ciphertext,NEW.verified_terms_version,NEW.verified_privacy_version,NEW.account_ref,NEW.region,NEW.resource_policy_version,NEW.resource_name,NEW.manifest_hash,NEW.created_at)
  IS DISTINCT FROM (OLD.operation_id,OLD.registration_id,OLD.workspace_id,OLD.environment,OLD.incarnation,OLD.command_hash,OLD.payload_ciphertext,OLD.verified_terms_version,OLD.verified_privacy_version,OLD.account_ref,OLD.region,OLD.resource_policy_version,OLD.resource_name,OLD.manifest_hash,OLD.created_at)
 THEN RAISE EXCEPTION 'provisioning_request_is_immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER provisioning_request_immutable BEFORE UPDATE ON nevora_onboarding.provisioning_operations FOR EACH ROW EXECUTE FUNCTION nevora_onboarding.provisioning_request_immutable();
CREATE FUNCTION nevora_onboarding.provisioning_attempt_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.id,NEW.operation_id,NEW.attempt,NEW.dispatched_at) IS DISTINCT FROM (OLD.id,OLD.operation_id,OLD.attempt,OLD.dispatched_at)
  OR (OLD.outcome IN('ACCEPTED','REJECTED') AND (NEW.outcome,NEW.resource,NEW.http_status) IS DISTINCT FROM (OLD.outcome,OLD.resource,OLD.http_status))
 THEN RAISE EXCEPTION 'provisioning_attempt_is_immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER provisioning_attempt_immutable BEFORE UPDATE ON nevora_onboarding.provisioning_attempts FOR EACH ROW EXECUTE FUNCTION nevora_onboarding.provisioning_attempt_immutable();
COMMIT;
