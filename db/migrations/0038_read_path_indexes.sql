-- Additive read-path indexes (inspection B5, B6, Oct 25 2026). No data, constraint or behaviour change.
--
-- schedule_publication_revision_shifts(source_shift_id): the operational schedule week, the editor, coverage,
-- exchanges and notifications join the latest publication capture by source shift. Without this index each shift
-- probed every capture of its location (one week at 300 people / 2 years: 229-290 ms; with it 7.5 ms).
--
-- time_entries(clock_out_at): Today and Attendance now bound their time-entry scans to entries that are still open
-- or closed recently, instead of reading every entry ever recorded.
--
-- IF NOT EXISTS keeps this file safe to re-run. On a large production table an operator may build the same indexes
-- first with CREATE INDEX CONCURRENTLY (outside a transaction); this file is then a no-op.
CREATE INDEX IF NOT EXISTS schedule_revision_shifts_source_idx ON schedule_publication_revision_shifts (source_shift_id);
CREATE INDEX IF NOT EXISTS time_entries_clock_out_idx ON time_entries (clock_out_at);
