BEGIN;

ALTER TABLE pto_timecard_accrual_revisions
  ADD COLUMN statutory_evidence jsonb
    CHECK (statutory_evidence IS NULL OR jsonb_typeof(statutory_evidence) = 'object');

COMMIT;
