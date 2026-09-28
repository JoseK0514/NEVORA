BEGIN;

CREATE TABLE IF NOT EXISTS weekly_availability_submissions (
  week_start date NOT NULL,
  employee_id text NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (week_start, employee_id)
);

CREATE TABLE IF NOT EXISTS schedule_publication_revisions (
  id text PRIMARY KEY,
  week_start date NOT NULL,
  revision_number integer NOT NULL CHECK (revision_number > 0),
  source_type text NOT NULL CHECK (
    source_type IN ('PUBLISH', 'EXCHANGE', 'CALLOUT', 'MANAGER_MUTATION')
  ),
  source_id text,
  affected_location_id text REFERENCES locations(id),
  created_by text NOT NULL REFERENCES employees(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (week_start, revision_number)
);

CREATE INDEX IF NOT EXISTS schedule_publication_revisions_week_idx
  ON schedule_publication_revisions (week_start, revision_number DESC);

CREATE TABLE IF NOT EXISTS schedule_publication_revision_shifts (
  id text PRIMARY KEY,
  revision_id text NOT NULL
    REFERENCES schedule_publication_revisions(id) ON DELETE CASCADE,
  source_shift_id text,
  schedule_id text NOT NULL,
  location_id text NOT NULL,
  employee_id text NOT NULL,
  date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  notes text,
  is_designated_lead boolean NOT NULL DEFAULT false,
  is_callout_approved boolean NOT NULL DEFAULT false,
  CHECK (start_time < end_time)
);

CREATE INDEX IF NOT EXISTS schedule_revision_shifts_employee_idx
  ON schedule_publication_revision_shifts (revision_id, employee_id);

CREATE INDEX IF NOT EXISTS schedule_revision_shifts_location_idx
  ON schedule_publication_revision_shifts (revision_id, location_id);

ALTER TABLE schedule_acknowledgements
  ADD COLUMN IF NOT EXISTS publication_revision_id text
    REFERENCES schedule_publication_revisions(id);

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS action_href text;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS event_key text;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_event_key_unique
  ON notifications (event_key)
  WHERE event_key IS NOT NULL;

COMMIT;
