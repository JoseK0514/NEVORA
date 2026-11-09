-- PREPARED ONLY. Depends on 0001–0006; no historical push backfill.
BEGIN;
ALTER TABLE notifications
  ADD COLUMN environment text CHECK (environment IN ('test', 'production')),
  ADD COLUMN source_kind text CHECK (source_kind IN ('SCHEDULE', 'TIME_OFF', 'EXCHANGE', 'CALLOUT', 'AVAILABILITY', 'MANAGER_SUMMARY', 'SELF_TEST')),
  ADD COLUMN source_id text,
  ADD COLUMN source_version text,
  ADD COLUMN effective_version text,
  ADD COLUMN purpose text CHECK (purpose IN ('EVENT', 'REMINDER', 'SUMMARY', 'TEST')),
  ADD COLUMN due_at timestamptz,
  ADD COLUMN expires_at timestamptz,
  ADD COLUMN urgency text CHECK (urgency IN ('normal', 'high')),
  ADD COLUMN cancelled_at timestamptz,
  ADD COLUMN push_state text NOT NULL DEFAULT 'legacy'
    CHECK (push_state IN ('legacy', 'pending', 'materialized', 'no_active_subscription', 'cancelled', 'expired')),
  ADD COLUMN item_keys text[] NOT NULL DEFAULT '{}',
  ADD CONSTRAINT notifications_push_metadata CHECK (
    push_state = 'legacy' OR (
      environment IS NOT NULL AND source_kind IS NOT NULL AND source_id IS NOT NULL
      AND source_version IS NOT NULL AND effective_version IS NOT NULL AND purpose IS NOT NULL
      AND due_at IS NOT NULL AND expires_at IS NOT NULL AND due_at < expires_at
      AND urgency IS NOT NULL AND event_key IS NOT NULL
    )
  ),
  ADD CONSTRAINT notifications_cancelled_state CHECK ((push_state = 'cancelled') = (cancelled_at IS NOT NULL));

DROP INDEX notifications_event_key_unique;
CREATE UNIQUE INDEX notifications_event_key_unique ON notifications (event_key)
  WHERE event_key IS NOT NULL AND environment IS NULL;
CREATE UNIQUE INDEX notifications_push_event_unique ON notifications (environment, event_key)
  WHERE environment IS NOT NULL AND event_key IS NOT NULL;
CREATE INDEX notifications_push_due_idx ON notifications (environment, due_at, id) WHERE push_state = 'pending';
CREATE INDEX notifications_push_source_idx ON notifications (source_kind, source_id, source_version, employee_id);
CREATE INDEX notifications_item_keys_idx ON notifications USING gin (item_keys) WHERE purpose = 'SUMMARY';

CREATE TABLE push_subscriptions (
  id text PRIMARY KEY,
  employee_id text NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  installation_hash text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('test', 'production')),
  endpoint_fingerprint text NOT NULL,
  encrypted_material text,
  generation text NOT NULL,
  -- Comparison proof, deliberately NOT an FK: auth revocation cannot depend on push cleanup.
  session_hash text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'detached', 'invalid')),
  consent_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  last_test_at timestamptz,
  CHECK (expires_at IS NULL OR expires_at > consent_at),
  CHECK ((status = 'active') = (encrypted_material IS NOT NULL)),
  -- Retain one tombstone per installation to fence stale tabs after detachment.
  UNIQUE (installation_hash, environment)
);
CREATE UNIQUE INDEX push_active_installation_unique ON push_subscriptions (installation_hash, environment) WHERE status = 'active';
CREATE UNIQUE INDEX push_active_endpoint_unique ON push_subscriptions (endpoint_fingerprint, environment) WHERE status = 'active';
CREATE INDEX push_subscriptions_recipient_idx ON push_subscriptions (employee_id, environment) WHERE status = 'active';
CREATE INDEX push_subscriptions_session_idx ON push_subscriptions (session_hash) WHERE status = 'active';

CREATE TABLE push_deliveries (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  notification_id text NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  subscription_id text NOT NULL REFERENCES push_subscriptions(id) ON DELETE CASCADE,
  generation text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'provider_accepted', 'retry_pending', 'failed', 'expired', 'cancelled')),
  attempt_count smallint NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 5),
  next_attempt_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  lease_token text,
  lease_expires_at timestamptz,
  accepted_at timestamptz,
  error_class text CHECK (error_class IS NULL OR error_class ~ '^[a-z][a-z0-9_]{0,63}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_id, subscription_id, generation),
  CHECK (next_attempt_at < expires_at),
  CHECK ((status = 'processing') = (lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)),
  CHECK ((lease_token IS NULL) = (lease_expires_at IS NULL)),
  CHECK ((status = 'provider_accepted') = (accepted_at IS NOT NULL))
);
CREATE INDEX push_deliveries_due_idx ON push_deliveries (next_attempt_at, id) WHERE status IN ('queued', 'retry_pending');
CREATE INDEX push_deliveries_lease_idx ON push_deliveries (lease_expires_at, id) WHERE status = 'processing';
COMMIT;
