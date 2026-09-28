BEGIN;

ALTER TABLE shifts
  ADD COLUMN IF NOT EXISTS is_designated_lead boolean NOT NULL DEFAULT false;

ALTER TABLE location_staffing_settings
  ADD COLUMN IF NOT EXISTS requires_designated_lead boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS location_coverage_windows (
  id text PRIMARY KEY,
  location_id text NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  minimum_staff integer
    CHECK (minimum_staff IS NULL OR minimum_staff BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (start_time < end_time),
  UNIQUE (location_id, day_of_week, start_time, end_time)
);

CREATE TABLE IF NOT EXISTS schedule_week_settings (
  week_start date PRIMARY KEY,
  availability_deadline timestamptz,
  updated_by text REFERENCES employees(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS weekly_availability_windows (
  id text PRIMARY KEY,
  week_start date NOT NULL,
  employee_id text NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS weekly_availability_employee_week_idx
  ON weekly_availability_windows (employee_id, week_start, day_of_week);

CREATE TABLE IF NOT EXISTS shift_callouts (
  id text PRIMARY KEY,
  shift_id text NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  employee_id text NOT NULL REFERENCES employees(id),
  reason_code text NOT NULL CHECK (reason_code IN (
    'ILLNESS',
    'FAMILY_EMERGENCY',
    'TRANSPORTATION',
    'SCHOOL',
    'PERSONAL_EMERGENCY',
    'OTHER'
  )),
  reason_note text,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING',
    'APPROVED',
    'DENIED',
    'CANCELLED'
  )),
  reviewed_by text REFERENCES employees(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS shift_callouts_active_shift_unique
  ON shift_callouts (shift_id)
  WHERE status IN ('PENDING', 'APPROVED');

CREATE INDEX IF NOT EXISTS shift_callouts_status_idx
  ON shift_callouts (status, created_at);

CREATE TABLE IF NOT EXISTS schedule_acknowledgements (
  week_start date NOT NULL,
  employee_id text NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (week_start, employee_id)
);

CREATE TABLE IF NOT EXISTS schedule_templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  created_by text NOT NULL REFERENCES employees(id),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS schedule_templates_name_unique
  ON schedule_templates (lower(name))
  WHERE active = true;

CREATE TABLE IF NOT EXISTS schedule_template_shifts (
  id text PRIMARY KEY,
  template_id text NOT NULL REFERENCES schedule_templates(id) ON DELETE CASCADE,
  location_id text NOT NULL REFERENCES locations(id),
  day_offset smallint NOT NULL CHECK (day_offset BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  employee_id text REFERENCES employees(id),
  is_designated_lead boolean NOT NULL DEFAULT false,
  notes text,
  CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS schedule_template_shifts_template_idx
  ON schedule_template_shifts (template_id, day_offset, start_time);

COMMIT;
