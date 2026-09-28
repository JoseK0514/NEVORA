BEGIN;

CREATE TABLE IF NOT EXISTS location_staffing_settings (
  location_id text PRIMARY KEY REFERENCES locations(id) ON DELETE CASCADE,
  minimum_staff_per_shift integer NOT NULL
    CHECK (minimum_staff_per_shift BETWEEN 1 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO location_staffing_settings (location_id, minimum_staff_per_shift)
VALUES
  ('loc-1', 2),
  ('loc-2', 6)
ON CONFLICT (location_id) DO UPDATE
SET minimum_staff_per_shift = EXCLUDED.minimum_staff_per_shift,
    updated_at = now();

CREATE TABLE IF NOT EXISTS employee_scheduling_settings (
  employee_id text PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  target_weekly_hours numeric(5,2)
    CHECK (target_weekly_hours IS NULL OR target_weekly_hours BETWEEN 0 AND 168),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
