-- D8: protect both sides of a historical reassignment, under the same ordered
-- employee locks used by finalization. No history is rewritten or removed.
BEGIN;
CREATE OR REPLACE FUNCTION nevora_timecard_raw_interlock() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE employee text; location text; first_at timestamptz; after_at timestamptz;
 old_employee text; old_location text; old_first timestamptz; old_after timestamptz;
BEGIN
 IF TG_TABLE_NAME='time_entries' THEN
  IF TG_OP='DELETE' THEN
   employee=OLD.employee_id;location=OLD.location_id;first_at=OLD.clock_in_at;after_at=OLD.clock_out_at;
  ELSE
   employee=NEW.employee_id;location=NEW.location_id;first_at=NEW.clock_in_at;after_at=NEW.clock_out_at;
  END IF;
  IF TG_OP='UPDATE' THEN
   old_employee=OLD.employee_id;old_location=OLD.location_id;old_first=OLD.clock_in_at;old_after=OLD.clock_out_at;
  END IF;
 ELSE
  IF TG_OP='DELETE' THEN
   SELECT employee_id,location_id,clock_in_at,clock_out_at INTO employee,location,first_at,after_at FROM time_entries WHERE id=OLD.time_entry_id;
  ELSE
   SELECT employee_id,location_id,clock_in_at,clock_out_at INTO employee,location,first_at,after_at FROM time_entries WHERE id=NEW.time_entry_id;
  END IF;
  IF TG_OP='UPDATE' THEN
   SELECT employee_id,location_id,clock_in_at,clock_out_at INTO old_employee,old_location,old_first,old_after FROM time_entries WHERE id=OLD.time_entry_id;
  END IF;
 END IF;
 PERFORM id FROM employees WHERE id=ANY(ARRAY[employee,old_employee]) ORDER BY id FOR UPDATE;
 IF EXISTS(
  SELECT 1 FROM (VALUES (employee,location,first_at,after_at),(old_employee,old_location,old_first,old_after)) AS p(employee_id,location_id,first_at,after_at)
  JOIN locations l ON l.id=p.location_id JOIN workspaces w ON w.id=l.workspace_id
  JOIN nevora_timecard_latest c ON c.workspace_id=w.id AND c.employee_id=p.employee_id
  WHERE c.action='FINALIZE' AND p.first_at<(c.end_date+1)::timestamp AT TIME ZONE w.time_zone
   AND COALESCE(p.after_at,'infinity'::timestamptz)>c.start_date::timestamp AT TIME ZONE w.time_zone
 ) THEN RAISE EXCEPTION 'nevora_timecard_FINALIZED_PERIOD'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
COMMIT;
