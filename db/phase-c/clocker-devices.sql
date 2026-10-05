-- DRAFT: Phase C disposable databases only. Assign a production migration number
-- after accepted Phase B hardening has been reconciled. Never edit 0005 in place.
BEGIN;

ALTER TABLE clocker_devices
  ADD COLUMN credential_hash text,
  ADD COLUMN credential_version integer NOT NULL DEFAULT 0 CHECK (credential_version >= 0),
  ADD COLUMN enrollment_hash text,
  ADD COLUMN enrollment_expires_at timestamptz,
  ADD COLUMN enrollment_owner_id text REFERENCES employees(id),
  -- Deliberately not a FK: removing a portal session must never be blocked.
  ADD COLUMN enrollment_session_hash text,
  ADD COLUMN enrolled_at timestamptz,
  ADD COLUMN revoked_at timestamptz,
  ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD CONSTRAINT clocker_device_credential_hash_format CHECK
    (credential_hash IS NULL OR credential_hash ~ '^[a-f0-9]{64}$'),
  ADD CONSTRAINT clocker_device_enrollment_hash_format CHECK
    (enrollment_hash IS NULL OR enrollment_hash ~ '^[a-f0-9]{64}$'),
  ADD CONSTRAINT clocker_device_enrollment_session_format CHECK
    (enrollment_session_hash IS NULL OR enrollment_session_hash ~ '^[a-f0-9]{64}$'),
  ADD CONSTRAINT clocker_device_enrollment_complete CHECK
    (num_nonnulls(enrollment_hash,enrollment_expires_at,enrollment_owner_id,enrollment_session_hash) IN (0,4)),
  ADD CONSTRAINT clocker_device_credential_state CHECK
    (credential_hash IS NULL OR (active AND revoked_at IS NULL AND enrolled_at IS NOT NULL AND credential_version > 0)),
  ADD CONSTRAINT clocker_device_revoked_state CHECK
    (revoked_at IS NULL OR (NOT active AND credential_hash IS NULL AND enrollment_hash IS NULL)),
  ADD CONSTRAINT clocker_device_single_credential_flow CHECK
    (credential_hash IS NULL OR enrollment_hash IS NULL);

CREATE UNIQUE INDEX clocker_device_credential_unique
  ON clocker_devices(credential_hash) WHERE credential_hash IS NOT NULL;
CREATE UNIQUE INDEX clocker_device_enrollment_unique
  ON clocker_devices(enrollment_hash) WHERE enrollment_hash IS NOT NULL;

-- Workspace identity remains authoritative through locations.workspace_id.
-- Moving a registered device must require replacement, never reattribute history.
CREATE FUNCTION clocker_device_location_immutable() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.location_id IS DISTINCT FROM OLD.location_id THEN
    RAISE EXCEPTION 'clocker_device_location_immutable' USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER clocker_device_location_immutable
  BEFORE UPDATE OF location_id ON clocker_devices
  FOR EACH ROW EXECUTE FUNCTION clocker_device_location_immutable();

CREATE TABLE clocker_device_events (
  id text PRIMARY KEY,
  device_id text NOT NULL REFERENCES clocker_devices(id),
  actor_employee_id text NOT NULL REFERENCES employees(id),
  kind text NOT NULL CHECK (kind IN ('REGISTERED','ENROLLED','RENAMED','ROTATION_REQUESTED','REVOKED')),
  device_version integer NOT NULL CHECK (device_version > 0),
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(device_id,device_version)
);
CREATE INDEX clocker_device_event_history ON clocker_device_events(device_id,occurred_at,id);

CREATE FUNCTION clocker_device_event_append_only() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'clocker_device_events_append_only' USING ERRCODE='23514';
END;
$$;
CREATE TRIGGER clocker_device_event_append_only
  BEFORE UPDATE OR DELETE ON clocker_device_events
  FOR EACH ROW EXECUTE FUNCTION clocker_device_event_append_only();

-- Retired credentials stay retired, even if a setup transport later presents one.
-- Only hashes are retained; this table cannot authenticate a device by itself.
CREATE TABLE clocker_device_credentials (
  credential_hash text PRIMARY KEY CHECK (credential_hash ~ '^[a-f0-9]{64}$'),
  device_id text NOT NULL REFERENCES clocker_devices(id),
  credential_version integer NOT NULL CHECK (credential_version > 0),
  issued_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(device_id,credential_version)
);
CREATE TRIGGER clocker_device_credentials_append_only
  BEFORE UPDATE OR DELETE ON clocker_device_credentials
  FOR EACH ROW EXECUTE FUNCTION clocker_device_event_append_only();

-- No credentials, real devices, or punches are seeded by this migration.
COMMIT;
