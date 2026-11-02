-- Additive native transport only. No Web Push changes or historical backfill.
BEGIN;
CREATE TABLE native_push_installations (
  id uuid PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id),
  employee_id text NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  -- Comparison proof, not an FK: deleting auth sessions never depends on cleanup.
  session_hash text NOT NULL CHECK (session_hash ~ '^[a-f0-9]{64}$'),
  origin text NOT NULL CHECK (char_length(origin) BETWEEN 1 AND 512),
  environment text NOT NULL CHECK (environment IN ('test','production')),
  platform text NOT NULL CHECK (platform IN ('ios','android')),
  app_id text NOT NULL CHECK (char_length(app_id) BETWEEN 3 AND 200),
  provider text NOT NULL CHECK ((platform='ios' AND provider IN ('apns-sandbox','apns-production')) OR (platform='android' AND provider='fcm')),
  key_fingerprint text NOT NULL CHECK (key_fingerprint ~ '^[a-f0-9]{64}$'),
  public_key text NOT NULL CHECK (char_length(public_key) BETWEEN 1 AND 256),
  generation uuid NOT NULL,
  token_fingerprint text CHECK (token_fingerprint ~ '^[a-f0-9]{64}$'),
  encrypted_material text CHECK (char_length(encrypted_material) BETWEEN 1 AND 6000),
  status text NOT NULL CHECK (status IN ('active','detached','invalid')),
  consent_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (origin,environment,key_fingerprint),
  CHECK ((status='active') = (encrypted_material IS NOT NULL)),
  CHECK ((status='active') = (token_fingerprint IS NOT NULL))
);
CREATE UNIQUE INDEX native_push_active_token_unique ON native_push_installations
  (origin,environment,provider,app_id,token_fingerprint) WHERE status='active';
CREATE INDEX native_push_recipient_idx ON native_push_installations (employee_id,environment) WHERE status='active';
CREATE INDEX native_push_session_idx ON native_push_installations (session_hash) WHERE status='active';

CREATE TABLE native_push_challenges (
  id uuid PRIMARY KEY,
  operation_id uuid NOT NULL,
  workspace_id text NOT NULL REFERENCES workspaces(id),
  employee_id text NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  session_hash text NOT NULL CHECK (session_hash ~ '^[a-f0-9]{64}$'),
  origin text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('test','production')),
  key_fingerprint text NOT NULL CHECK (key_fingerprint ~ '^[a-f0-9]{64}$'),
  public_key text NOT NULL CHECK (char_length(public_key) BETWEEN 1 AND 256),
  wire jsonb NOT NULL CHECK (jsonb_typeof(wire)='object' AND octet_length(wire::text)<=4096),
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL CHECK (expires_at=issued_at+interval '120 seconds'),
  completed_input_hash text CHECK (completed_input_hash ~ '^[a-f0-9]{64}$'),
  result_generation uuid,
  result_state text CHECK (result_state IN ('active','complete')),
  completed_at timestamptz,
  CHECK ((completed_input_hash IS NOT NULL) = (result_generation IS NOT NULL)),
  CHECK ((completed_input_hash IS NOT NULL) = (result_state IS NOT NULL)),
  CHECK ((completed_input_hash IS NOT NULL) = (completed_at IS NOT NULL)),
  UNIQUE (origin,environment,key_fingerprint,operation_id)
);
CREATE INDEX native_push_challenge_rate_key_idx ON native_push_challenges (origin,environment,key_fingerprint,issued_at);
CREATE INDEX native_push_challenge_rate_actor_idx ON native_push_challenges (employee_id,issued_at);
CREATE INDEX native_push_challenge_expiry_idx ON native_push_challenges (expires_at,id);

CREATE TABLE native_push_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id text NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  installation_id uuid NOT NULL REFERENCES native_push_installations(id) ON DELETE CASCADE,
  generation uuid NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','provider_accepted','retry_pending','failed','expired','cancelled')),
  attempt_count smallint NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 5),
  next_attempt_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  lease_token uuid,
  lease_expires_at timestamptz,
  accepted_at timestamptz,
  error_class text CHECK (error_class IS NULL OR error_class ~ '^[a-z][a-z0-9_]{0,63}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (notification_id,installation_id,generation),
  CHECK (next_attempt_at<expires_at),
  CHECK ((status='processing') = (lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)),
  CHECK ((lease_token IS NULL) = (lease_expires_at IS NULL)),
  CHECK ((status='provider_accepted') = (accepted_at IS NOT NULL))
);
CREATE INDEX native_push_deliveries_due_idx ON native_push_deliveries (next_attempt_at,id) WHERE status IN ('queued','retry_pending');
CREATE INDEX native_push_deliveries_lease_idx ON native_push_deliveries (lease_expires_at,id) WHERE status='processing';
COMMIT;
