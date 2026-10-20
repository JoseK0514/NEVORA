BEGIN;

CREATE TABLE auth_passkey_users (
  employee_id text PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  user_handle text NOT NULL UNIQUE CHECK(user_handle ~ '^[A-Za-z0-9_-]{43}$')
);
CREATE TABLE employee_passkeys (
  id uuid PRIMARY KEY,
  employee_id text NOT NULL REFERENCES auth_passkey_users(employee_id) ON DELETE CASCADE,
  credential_id text NOT NULL UNIQUE CHECK(length(credential_id) BETWEEN 1 AND 4096),
  public_key bytea NOT NULL CHECK(octet_length(public_key) BETWEEN 1 AND 16384),
  sign_counter bigint NOT NULL CHECK(sign_counter BETWEEN 0 AND 4294967295),
  transports text[] NOT NULL DEFAULT '{}',
  rp_id text NOT NULL,
  name text NOT NULL CHECK(length(name) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text
);
CREATE INDEX employee_passkeys_active ON employee_passkeys(employee_id,created_at) WHERE revoked_at IS NULL;
CREATE TABLE auth_passkey_challenges (
  token_hash text NOT NULL CHECK(token_hash ~ '^[0-9a-f]{64}$'),
  purpose text NOT NULL CHECK(purpose IN ('login','register')),
  challenge text NOT NULL,
  employee_id text REFERENCES employees(id) ON DELETE CASCADE,
  session_token_hash text,
  credential_updated_at timestamptz,
  employee_updated_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT clock_timestamp()+interval '5 minutes',
  PRIMARY KEY(token_hash,purpose),
  CHECK(purpose='login' OR (employee_id IS NOT NULL AND session_token_hash IS NOT NULL AND credential_updated_at IS NOT NULL AND employee_updated_at IS NOT NULL))
);
CREATE INDEX auth_passkey_challenges_expiry ON auth_passkey_challenges(expires_at);
CREATE TABLE auth_login_limits (
  scope text NOT NULL,
  bucket bigint NOT NULL,
  attempts integer NOT NULL CHECK(attempts>0),
  PRIMARY KEY(scope,bucket)
);
CREATE TABLE auth_passkey_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text NOT NULL,
  passkey_id uuid NOT NULL,
  event text NOT NULL CHECK(event IN ('register','sign_in','remove','revoke')),
  reason text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX auth_passkey_audit_employee ON auth_passkey_audit(employee_id,created_at);
CREATE FUNCTION auth_passkey_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'passkey_audit_immutable'; END $$;
CREATE TRIGGER auth_passkey_audit_immutable BEFORE UPDATE OR DELETE ON auth_passkey_audit
  FOR EACH ROW EXECUTE FUNCTION auth_passkey_audit_immutable();
CREATE FUNCTION auth_passkey_authority_loss() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target text; why text;
BEGIN
  IF TG_TABLE_NAME='employees' THEN
    IF OLD.active AND NOT NEW.active THEN target:=NEW.id;why:='account_disabled'; END IF;
  ELSIF TG_OP='DELETE' THEN
    target:=OLD.employee_id;why:='credential_reset';
  ELSE
    IF NEW.password_hash IS DISTINCT FROM OLD.password_hash OR NEW.password_updated_at IS DISTINCT FROM OLD.password_updated_at
      THEN target:=NEW.employee_id;why:='credential_reset'; END IF;
  END IF;
  IF target IS NOT NULL THEN
    WITH revoked AS (
      UPDATE employee_passkeys SET revoked_at=clock_timestamp(),revocation_reason=why
      WHERE employee_id=target AND revoked_at IS NULL RETURNING id
    )
    INSERT INTO auth_passkey_audit(employee_id,passkey_id,event,reason)
      SELECT target,id,'revoke',why FROM revoked;
    DELETE FROM auth_passkey_challenges WHERE employee_id=target;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER auth_passkey_employee_loss AFTER UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION auth_passkey_authority_loss();
CREATE TRIGGER auth_passkey_credential_loss AFTER UPDATE OR DELETE ON employee_credentials
  FOR EACH ROW EXECUTE FUNCTION auth_passkey_authority_loss();

COMMIT;
