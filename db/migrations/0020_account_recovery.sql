BEGIN;
-- No activation changes, credentials backfill or operational-record mutation.
CREATE TABLE password_recovery_proofs (
 token_hash text PRIMARY KEY CHECK(token_hash ~ '^[a-f0-9]{64}$'),
 employee_id text NOT NULL REFERENCES employees(id),
 credential_updated_at timestamptz NOT NULL,
 employee_updated_at timestamptz NOT NULL,
 method text NOT NULL CHECK(method IN ('EMAIL','ASSISTED')),
 actor_employee_id text REFERENCES employees(id),
 attestation text,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expires_at timestamptz NOT NULL,
 used_at timestamptz,
 retired_at timestamptz,
 CHECK(expires_at>created_at AND expires_at<=created_at+interval '16 minutes'),
 CHECK((method='ASSISTED')=(actor_employee_id IS NOT NULL AND attestation IS NOT NULL)),
 CHECK(attestation IS NULL OR length(attestation) BETWEEN 10 AND 500),
 CHECK(used_at IS NULL OR used_at>=created_at)
);
CREATE INDEX password_recovery_employee ON password_recovery_proofs(employee_id,created_at DESC);
CREATE TABLE password_recovery_limits (
 scope text NOT NULL CHECK(scope='global' OR scope ~ '^[a-f0-9]{64}$'),
 bucket bigint NOT NULL,
 attempts integer NOT NULL CHECK(attempts>0),
 PRIMARY KEY(scope,bucket)
);
COMMIT;
