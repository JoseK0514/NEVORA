BEGIN;

CREATE TABLE IF NOT EXISTS locations (
  id text PRIMARY KEY,
  name text NOT NULL,
  short_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO locations (id, name, short_name)
VALUES
  ('loc-1', 'FUEL - 2', 'FUEL - 2'),
  ('loc-2', 'FUEL - 110', 'FUEL - 110')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS employees (
  id text PRIMARY KEY,
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text NOT NULL,
  email text,
  role text NOT NULL CHECK (role IN ('OWNER', 'MANAGER', 'LEAD', 'EMPLOYEE')),
  primary_location_id text NOT NULL REFERENCES locations(id),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS employees_email_unique
  ON employees (lower(email))
  WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS employee_location_eligibility (
  employee_id text NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  location_id text NOT NULL REFERENCES locations(id),
  PRIMARY KEY (employee_id, location_id)
);

CREATE TABLE IF NOT EXISTS employee_credentials (
  employee_id text PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  must_change_password boolean NOT NULL DEFAULT true,
  password_updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_sessions (
  token_hash char(64) PRIMARY KEY,
  employee_id text NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS employee_sessions_employee_idx
  ON employee_sessions (employee_id);
CREATE INDEX IF NOT EXISTS employee_sessions_expires_idx
  ON employee_sessions (expires_at);

CREATE TABLE IF NOT EXISTS availability_windows (
  id text PRIMARY KEY,
  employee_id text NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS availability_windows_employee_day_idx
  ON availability_windows (employee_id, day_of_week);

CREATE TABLE IF NOT EXISTS availability_exceptions (
  id text PRIMARY KEY,
  employee_id text NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('AVAILABLE', 'UNAVAILABLE')),
  start_time time,
  end_time time,
  note text,
  CHECK (
    (start_time IS NULL AND end_time IS NULL)
    OR
    (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  )
);

CREATE TABLE IF NOT EXISTS time_off_requests (
  id text PRIMARY KEY,
  employee_id text NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  start_time time,
  end_time time,
  reason text,
  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'DENIED', 'CANCELLED')),
  reviewed_by text REFERENCES employees(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (start_date <= end_date),
  CHECK (
    (start_time IS NULL AND end_time IS NULL)
    OR
    (start_time IS NOT NULL AND end_time IS NOT NULL AND start_time < end_time)
  )
);

CREATE INDEX IF NOT EXISTS time_off_employee_status_idx
  ON time_off_requests (employee_id, status, start_date, end_date);

CREATE TABLE IF NOT EXISTS schedules (
  id text PRIMARY KEY,
  location_id text NOT NULL REFERENCES locations(id),
  week_start date NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  created_by text NOT NULL REFERENCES employees(id),
  published_by text REFERENCES employees(id),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (location_id, week_start)
);

CREATE TABLE IF NOT EXISTS shifts (
  id text PRIMARY KEY,
  schedule_id text NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  employee_id text NOT NULL REFERENCES employees(id),
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS shifts_employee_date_idx
  ON shifts (employee_id, date);
CREATE INDEX IF NOT EXISTS shifts_schedule_date_idx
  ON shifts (schedule_id, date);

CREATE TABLE IF NOT EXISTS shift_exchanges (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('COVERAGE', 'SWAP')),
  source_shift_id text NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  requested_by_employee_id text NOT NULL REFERENCES employees(id),
  target_employee_id text REFERENCES employees(id),
  target_shift_id text REFERENCES shifts(id),
  status text NOT NULL DEFAULT 'OPEN'
    CHECK (status IN (
      'OPEN',
      'EMPLOYEE_PENDING',
      'MANAGER_PENDING',
      'APPROVED',
      'DENIED',
      'CANCELLED',
      'EXPIRED'
    )),
  resolved_by text REFERENCES employees(id),
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (kind = 'COVERAGE' AND target_shift_id IS NULL)
    OR
    (kind = 'SWAP' AND target_shift_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS shift_exchanges_status_idx
  ON shift_exchanges (status, created_at);

CREATE UNIQUE INDEX IF NOT EXISTS shift_exchanges_active_source_unique
  ON shift_exchanges (source_shift_id)
  WHERE status IN ('OPEN', 'EMPLOYEE_PENDING', 'MANAGER_PENDING');

CREATE UNIQUE INDEX IF NOT EXISTS shift_exchanges_active_target_unique
  ON shift_exchanges (target_shift_id)
  WHERE target_shift_id IS NOT NULL
    AND status IN ('EMPLOYEE_PENDING', 'MANAGER_PENDING');

CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY,
  employee_id text NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_employee_idx
  ON notifications (employee_id, created_at DESC);

COMMIT;
