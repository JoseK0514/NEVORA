BEGIN;

CREATE TABLE workspaces (
  id text PRIMARY KEY,
  name text NOT NULL CHECK (name = btrim(name) AND char_length(name) BETWEEN 1 AND 160),
  time_zone text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  singleton boolean NOT NULL DEFAULT true CHECK (singleton),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (singleton)
);
INSERT INTO workspaces (id, name, time_zone)
VALUES ('workspace-fuel', 'Fuel Coffee Drive', 'America/Puerto_Rico');

ALTER TABLE locations ADD COLUMN workspace_id text REFERENCES workspaces(id);
ALTER TABLE locations ADD COLUMN clocker_key text;
UPDATE locations SET workspace_id = 'workspace-fuel', clocker_key = CASE id
  WHEN 'loc-1' THEN '2' WHEN 'loc-2' THEN '110'
  ELSE 'location-' || substr(encode(sha256(convert_to(id, 'UTF8')), 'hex'), 1, 55) END;
ALTER TABLE locations ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE locations ALTER COLUMN clocker_key SET NOT NULL;
ALTER TABLE locations ADD CONSTRAINT location_clocker_key_format
  CHECK (char_length(clocker_key) BETWEEN 1 AND 64 AND clocker_key ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE locations ADD CONSTRAINT location_clocker_key_unique UNIQUE (workspace_id, clocker_key);
-- Preserve formerly legal legacy name bytes. New INSERT/UPDATE writes are checked.
-- Audit existing names before explicitly VALIDATE CONSTRAINT during reviewed activation;
-- this migration never trims/truncates customer data.
ALTER TABLE locations ADD CONSTRAINT location_name_format
  CHECK (name = btrim(name) AND char_length(name) BETWEEN 1 AND 160) NOT VALID;
ALTER TABLE locations ADD CONSTRAINT location_short_name_format
  CHECK (short_name = btrim(short_name) AND char_length(short_name) BETWEEN 1 AND 48) NOT VALID;

CREATE TABLE positions (
  id text PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id),
  name text NOT NULL CHECK (name = btrim(name) AND char_length(name) BETWEEN 1 AND 80),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX positions_workspace_name_unique ON positions (workspace_id, lower(name));
CREATE TABLE employee_positions (
  employee_id text NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  position_id text NOT NULL REFERENCES positions(id),
  PRIMARY KEY (employee_id, position_id)
);
CREATE TABLE coverage_window_position_requirements (
  coverage_window_id text NOT NULL REFERENCES location_coverage_windows(id) ON DELETE CASCADE,
  position_id text NOT NULL REFERENCES positions(id),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 100),
  PRIMARY KEY (coverage_window_id, position_id)
);
ALTER TABLE shifts ADD COLUMN position_id text REFERENCES positions(id);
ALTER TABLE schedule_template_shifts ADD COLUMN position_id text REFERENCES positions(id);
ALTER TABLE schedule_publication_revision_shifts ADD COLUMN position_id text REFERENCES positions(id);
ALTER TABLE schedule_publication_revision_shifts ADD COLUMN position_name text;
COMMIT;
