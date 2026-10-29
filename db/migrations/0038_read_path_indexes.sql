-- Additive read-path indexes (inspection B5, B6, Oct 25 2026). No data, constraint or behaviour change.
--
-- schedule_publication_revision_shifts(source_shift_id): the operational schedule week, the editor, coverage,
-- exchanges and notifications join the latest publication capture by source shift. Without this index each shift
-- probed every capture of its location (one week at 300 people / 2 years: 229-290 ms; with it 7.5 ms).
--
-- time_entries(clock_out_at): Today and Attendance now bound their time-entry scans to entries that are still open
-- or closed recently, instead of reading every entry ever recorded.
--
-- A pre-built index is accepted only when its exact definition and validity match.
-- A large-table concurrent pre-build requires a separate operator-reviewed step outside a transaction.
-- A mismatch stops here; never drop or repair an existing index implicitly.
DO $$
DECLARE required record; existing_oid oid; existing record;
BEGIN
 FOR required IN SELECT * FROM (VALUES
  ('schedule_revision_shifts_source_idx','schedule_publication_revision_shifts','source_shift_id'),
  ('time_entries_clock_out_idx','time_entries','clock_out_at')
 ) AS requirements(name,table_name,column_name)
 LOOP
  existing_oid := to_regclass(format('public.%I',required.name));
  IF existing_oid IS NOT NULL THEN
   SELECT i.indisvalid,i.indisready,pg_get_indexdef(i.indexrelid) AS definition
    INTO existing FROM pg_index i WHERE i.indexrelid=existing_oid;
   IF NOT FOUND THEN RAISE EXCEPTION 'release1_read_index_definition_mismatch: %',required.name; END IF;
   IF NOT existing.indisvalid OR NOT existing.indisready THEN
    RAISE EXCEPTION 'release1_read_index_invalid: %',required.name;
   END IF;
   IF existing.definition <> format('CREATE INDEX %I ON public.%I USING btree (%I)',required.name,required.table_name,required.column_name) THEN
    RAISE EXCEPTION 'release1_read_index_definition_mismatch: %',required.name;
   END IF;
  END IF;
 END LOOP;
END $$;
CREATE INDEX IF NOT EXISTS schedule_revision_shifts_source_idx ON schedule_publication_revision_shifts (source_shift_id);
CREATE INDEX IF NOT EXISTS time_entries_clock_out_idx ON time_entries (clock_out_at);
