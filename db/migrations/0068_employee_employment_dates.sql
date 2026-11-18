BEGIN;

-- Optional employment facts for Puerto Rico wage rules: the hire date selects the
-- rules for people hired before or on/after January 26, 2017, and the birth date
-- supports minors' hour limits. Existing rows stay NULL; nothing is backfilled.
-- The termination date is informational only and never changes active.
ALTER TABLE employees
 ADD COLUMN hire_date date,
 ADD COLUMN termination_date date,
 ADD COLUMN birth_date date;
ALTER TABLE employees
 ADD CONSTRAINT employees_termination_after_hire
  CHECK (termination_date IS NULL OR hire_date IS NULL OR termination_date >= hire_date),
 ADD CONSTRAINT employees_birth_date_floor
  CHECK (birth_date IS NULL OR birth_date >= DATE '1900-01-01');

COMMIT;
