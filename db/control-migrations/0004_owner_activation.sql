BEGIN;
-- Web principal may request/read grants; only the provisioner publishes READY.
CREATE TABLE nevora_onboarding.owner_grant_requests(
 operation_id uuid PRIMARY KEY,registration_id uuid NOT NULL REFERENCES nevora_onboarding.registrations(id),
 workspace_id uuid NOT NULL REFERENCES nevora_onboarding.workspace_registry(id),
 incarnation bigint NOT NULL CHECK(incarnation>0),
 token_digest text NOT NULL CHECK(token_digest ~ '^[a-f0-9]{64}$'),token_ciphertext text NOT NULL,
 state text NOT NULL DEFAULT 'QUEUED' CHECK(state IN('QUEUED','READY','EXPIRED','REVOKED')),
 expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK(expires_at>created_at)
);
CREATE UNIQUE INDEX owner_grant_one_queued ON nevora_onboarding.owner_grant_requests(workspace_id) WHERE state='QUEUED';
REVOKE ALL ON nevora_onboarding.owner_grant_requests FROM PUBLIC;
CREATE FUNCTION nevora_onboarding.owner_grant_request_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.operation_id,NEW.registration_id,NEW.workspace_id,NEW.incarnation,NEW.token_digest,NEW.token_ciphertext,NEW.expires_at,NEW.created_at) IS DISTINCT FROM (OLD.operation_id,OLD.registration_id,OLD.workspace_id,OLD.incarnation,OLD.token_digest,OLD.token_ciphertext,OLD.expires_at,OLD.created_at) THEN RAISE EXCEPTION 'owner_grant_request_immutable'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER owner_grant_request_custody BEFORE UPDATE ON nevora_onboarding.owner_grant_requests FOR EACH ROW EXECUTE FUNCTION nevora_onboarding.owner_grant_request_immutable();
COMMIT;
