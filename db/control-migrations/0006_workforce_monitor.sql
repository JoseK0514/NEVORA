BEGIN;
-- Operator-applied aggregate journal; this is not a company/bootstrap migration.
CREATE SCHEMA IF NOT EXISTS nevora_operations;
REVOKE ALL ON SCHEMA nevora_operations FROM PUBLIC;
CREATE TABLE nevora_operations.monitor_state (
 scope_key text PRIMARY KEY CHECK(scope_key ~ '^nv_ops_monitor_[a-f0-9]{24}$'),
 condition text NOT NULL CHECK(condition IN('ok','unavailable','invalid','source_mismatch','disabled','unhealthy')),
 incident_id uuid,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE nevora_operations.monitor_notices (
 id uuid PRIMARY KEY,
 scope_key text NOT NULL REFERENCES nevora_operations.monitor_state(scope_key),
 incident_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN('outage','recovery')),
 status text NOT NULL CHECK(status IN('reserved','sending','accepted','definite_failure','unknown')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
 next_attempt_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(scope_key,incident_id,kind), UNIQUE(id,scope_key)
);
CREATE TABLE nevora_operations.monitor_attempts (
 id uuid PRIMARY KEY,
 scope_key text NOT NULL,
 notice_id uuid NOT NULL,
 attempt_number integer NOT NULL CHECK(attempt_number BETWEEN 1 AND 3),
 status text NOT NULL CHECK(status IN('sending','accepted','definite_failure','unknown')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(notice_id,scope_key) REFERENCES nevora_operations.monitor_notices(id,scope_key),
 UNIQUE(notice_id,attempt_number)
);
CREATE INDEX monitor_attempt_day ON nevora_operations.monitor_attempts(scope_key,created_at);
ALTER TABLE nevora_operations.monitor_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevora_operations.monitor_state FORCE ROW LEVEL SECURITY;
ALTER TABLE nevora_operations.monitor_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevora_operations.monitor_notices FORCE ROW LEVEL SECURITY;
ALTER TABLE nevora_operations.monitor_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevora_operations.monitor_attempts FORCE ROW LEVEL SECURITY;
CREATE POLICY monitor_scope ON nevora_operations.monitor_state USING(scope_key=session_user::text) WITH CHECK(scope_key=session_user::text);
CREATE POLICY monitor_scope ON nevora_operations.monitor_notices USING(scope_key=session_user::text) WITH CHECK(scope_key=session_user::text);
CREATE POLICY monitor_scope ON nevora_operations.monitor_attempts USING(scope_key=session_user::text) WITH CHECK(scope_key=session_user::text);
REVOKE ALL ON ALL TABLES IN SCHEMA nevora_operations FROM PUBLIC;
COMMIT;
