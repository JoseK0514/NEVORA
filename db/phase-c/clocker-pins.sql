-- DRAFT: owned Phase C databases only, after clocker-devices.sql.
-- Do not allocate a numbered migration before Phase B reconciliation.
BEGIN;
CREATE TABLE clocker_pin_configuration (
 workspace_id text PRIMARY KEY REFERENCES workspaces(id),
 key_identity text NOT NULL CHECK (key_identity ~ '^[a-f0-9]{64}$')
);
CREATE TABLE employee_clocker_pins (
 employee_id text PRIMARY KEY REFERENCES employees(id),
 workspace_id text NOT NULL REFERENCES workspaces(id),
 lookup_hash text NOT NULL CHECK (lookup_hash ~ '^[a-f0-9]{64}$'),
 pin_hash text NOT NULL CHECK (pin_hash ~ '^scrypt-v1\$[a-f0-9]{32}\$[a-f0-9]{64}$'),
 version integer NOT NULL DEFAULT 1 CHECK (version > 0),
 updated_by text NOT NULL REFERENCES employees(id),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(workspace_id,lookup_hash)
);
CREATE TABLE clocker_pin_events (
 id text PRIMARY KEY,
 employee_id text NOT NULL REFERENCES employees(id),
 actor_employee_id text NOT NULL REFERENCES employees(id),
 pin_version integer NOT NULL CHECK (pin_version > 0),
 occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(employee_id,pin_version)
);
CREATE TRIGGER clocker_pin_event_append_only
 BEFORE UPDATE OR DELETE ON clocker_pin_events
 FOR EACH ROW EXECUTE FUNCTION clocker_device_event_append_only();
CREATE TABLE clocker_pin_limits (
 scope text NOT NULL CHECK (scope IN ('DEVICE','WORKSPACE')),
 scope_id text NOT NULL,
 failures integer NOT NULL DEFAULT 0 CHECK (failures >= 0),
 failure_window timestamptz NOT NULL DEFAULT clock_timestamp(),
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
 attempt_window timestamptz NOT NULL DEFAULT clock_timestamp(),
 latest_attempt text,
 PRIMARY KEY(scope,scope_id)
);
CREATE TABLE clocker_pin_sessions (
 device_id text PRIMARY KEY REFERENCES clocker_devices(id),
 employee_id text NOT NULL REFERENCES employees(id),
 token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
 pin_version integer NOT NULL CHECK (pin_version > 0),
 credential_version integer NOT NULL CHECK (credential_version > 0),
 employee_updated_at timestamptz NOT NULL,
 expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX clocker_pin_session_employee ON clocker_pin_sessions(employee_id);
-- No employee PINs, default PINs, credentials or punches are seeded.
COMMIT;
