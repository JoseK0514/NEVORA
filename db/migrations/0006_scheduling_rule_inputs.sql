BEGIN;

ALTER TABLE employee_scheduling_settings
  ADD COLUMN maximum_weekly_hours numeric(5,2) NOT NULL DEFAULT 40
  CHECK (maximum_weekly_hours BETWEEN 0 AND 168);

-- Existing submissions retain full-week snapshot semantics. New submissions
-- inherit normal availability and use the existing dated exceptions table.
ALTER TABLE weekly_availability_submissions
  ADD COLUMN uses_normal_availability boolean NOT NULL DEFAULT false;

-- An end before the start denotes the following business calendar day.
-- Equal start/end remains invalid; no actual worked-time tables are changed.
ALTER TABLE shifts DROP CONSTRAINT shifts_check;
ALTER TABLE shifts ADD CONSTRAINT shifts_positive_duration CHECK (start_time <> end_time);
ALTER TABLE schedule_template_shifts DROP CONSTRAINT schedule_template_shifts_check;
ALTER TABLE schedule_template_shifts ADD CONSTRAINT template_shifts_positive_duration CHECK (start_time <> end_time);
ALTER TABLE schedule_publication_revision_shifts DROP CONSTRAINT schedule_publication_revision_shifts_check;
ALTER TABLE schedule_publication_revision_shifts ADD CONSTRAINT revision_shifts_positive_duration CHECK (start_time <> end_time);

COMMIT;
