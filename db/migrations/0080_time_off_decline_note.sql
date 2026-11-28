ALTER TABLE time_off_requests
  ADD COLUMN IF NOT EXISTS decline_note text
  CHECK (decline_note IS NULL OR (status = 'DENIED' AND char_length(decline_note) BETWEEN 1 AND 500));
