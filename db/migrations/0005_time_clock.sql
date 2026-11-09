BEGIN;

CREATE TABLE IF NOT EXISTS clocker_devices (
  id text PRIMARY KEY,
  location_id text NOT NULL REFERENCES locations(id),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz,
  UNIQUE (id, location_id)
);

CREATE TABLE IF NOT EXISTS time_entries (
  id text PRIMARY KEY,
  employee_id text NOT NULL REFERENCES employees(id),
  location_id text NOT NULL REFERENCES locations(id),
  device_id text NOT NULL,
  clock_in_at timestamptz NOT NULL,
  clock_out_at timestamptz,
  status text NOT NULL CHECK (status IN ('CLOCKED_IN', 'ON_BREAK', 'CLOCKED_OUT')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (device_id, location_id) REFERENCES clocker_devices(id, location_id),
  CHECK (clock_out_at IS NULL OR clock_out_at >= clock_in_at),
  CHECK ((status = 'CLOCKED_OUT') = (clock_out_at IS NOT NULL))
);

-- Enforce one active punch across BOTH locations, including concurrent kiosk requests.
CREATE UNIQUE INDEX IF NOT EXISTS time_entries_one_open_per_employee
  ON time_entries (employee_id) WHERE clock_out_at IS NULL;
CREATE INDEX IF NOT EXISTS time_entries_active_location
  ON time_entries (location_id, clock_in_at) WHERE clock_out_at IS NULL;
CREATE INDEX IF NOT EXISTS time_entries_employee_history
  ON time_entries (employee_id, clock_in_at DESC);

CREATE TABLE IF NOT EXISTS break_entries (
  id text PRIMARY KEY,
  time_entry_id text NOT NULL REFERENCES time_entries(id),
  break_start_at timestamptz NOT NULL,
  break_end_at timestamptz,
  CHECK (break_end_at IS NULL OR break_end_at >= break_start_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS break_entries_one_open_per_entry
  ON break_entries (time_entry_id) WHERE break_end_at IS NULL;
CREATE INDEX IF NOT EXISTS break_entries_entry_history
  ON break_entries (time_entry_id, break_start_at);

-- No devices or punches are seeded. Provision devices through the future authenticated
-- kiosk service. Entry/break transitions must occur in one locked transaction.
COMMIT;
