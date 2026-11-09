BEGIN;
-- Retain operation tombstones while permitting one-way erasure of expired
-- encrypted bootstrap bearers. Never make an old operation reusable.
CREATE OR REPLACE FUNCTION nevora_onboarding.owner_grant_request_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.operation_id,NEW.registration_id,NEW.workspace_id,NEW.incarnation,NEW.token_digest,NEW.expires_at,NEW.created_at) IS DISTINCT FROM (OLD.operation_id,OLD.registration_id,OLD.workspace_id,OLD.incarnation,OLD.token_digest,OLD.expires_at,OLD.created_at) THEN RAISE EXCEPTION 'owner_grant_request_immutable'; END IF;
 IF NEW.token_ciphertext IS DISTINCT FROM OLD.token_ciphertext AND NOT(NEW.token_ciphertext='' AND NEW.state IN('EXPIRED','REVOKED') AND NEW.expires_at<=clock_timestamp()-interval '24 hours') THEN RAISE EXCEPTION 'owner_grant_ciphertext_immutable'; END IF;
 RETURN NEW;
END $$;
COMMIT;
