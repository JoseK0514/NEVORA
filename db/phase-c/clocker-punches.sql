-- DRAFT: isolated Phase C databases only, after clocker-devices.sql and clocker-pins.sql.
-- Assign final numbered migration only after accepted Phase B reconciliation.
BEGIN;
ALTER TABLE time_entries ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0);
ALTER TABLE break_entries ADD COLUMN version integer NOT NULL DEFAULT 1 CHECK (version > 0);
CREATE TABLE clocker_employee_clock_state (
 employee_id text PRIMARY KEY REFERENCES employees(id),
 revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0)
);
CREATE TABLE clocker_command_ledger (
 device_id text NOT NULL REFERENCES clocker_devices(id),
 command_id uuid NOT NULL,
 employee_id text NOT NULL REFERENCES employees(id),
 credential_version integer NOT NULL CHECK (credential_version > 0),
 request_hash text NOT NULL CHECK (request_hash ~ '^[a-f0-9]{64}$'),
 action text NOT NULL CHECK (action IN ('CLOCK_IN','START_BREAK','END_BREAK','CLOCK_OUT')),
 time_entry_id text NOT NULL REFERENCES time_entries(id),
 performed_at timestamptz NOT NULL,
 result jsonb NOT NULL CHECK (jsonb_typeof(result)='object'),
 PRIMARY KEY(device_id,command_id)
);
CREATE INDEX clocker_command_employee_history ON clocker_command_ledger(employee_id,performed_at DESC);
CREATE TRIGGER clocker_command_append_only BEFORE UPDATE OR DELETE ON clocker_command_ledger
 FOR EACH ROW EXECUTE FUNCTION clocker_device_event_append_only();

-- Internal projection. The server must hold current identity/employee locks.
CREATE FUNCTION clocker_punch_snapshot(p_employee text) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE e time_entries%ROWTYPE; b break_entries%ROWTYPE; r integer;
BEGIN
 SELECT revision INTO r FROM clocker_employee_clock_state WHERE employee_id=p_employee;
 IF EXISTS(SELECT 1 FROM break_entries x JOIN time_entries t ON t.id=x.time_entry_id
   WHERE t.employee_id=p_employee AND (x.break_start_at<t.clock_in_at OR
    (t.clock_out_at IS NOT NULL AND (x.break_end_at IS NULL OR x.break_end_at>t.clock_out_at)))) THEN
  RAISE EXCEPTION 'clocker_punch_INTEGRITY';
 END IF;
 SELECT * INTO e FROM time_entries WHERE employee_id=p_employee AND clock_out_at IS NULL;
 IF e.id IS NULL THEN RETURN jsonb_build_object('revision',COALESCE(r,0),'entry',NULL,'break',NULL); END IF;
 SELECT * INTO b FROM break_entries WHERE time_entry_id=e.id AND break_end_at IS NULL;
 IF (e.status='ON_BREAK') IS DISTINCT FROM (b.id IS NOT NULL)
  OR EXISTS(SELECT 1 FROM break_entries x WHERE x.time_entry_id=e.id AND x.break_start_at<e.clock_in_at)
  OR EXISTS(SELECT 1 FROM break_entries x JOIN break_entries y ON x.time_entry_id=y.time_entry_id AND x.id<y.id
    WHERE x.time_entry_id=e.id AND x.break_start_at<COALESCE(y.break_end_at,'infinity'::timestamptz)
      AND y.break_start_at<COALESCE(x.break_end_at,'infinity'::timestamptz)) THEN
  RAISE EXCEPTION 'clocker_punch_INTEGRITY';
 END IF;
 RETURN jsonb_build_object('revision',COALESCE(r,0),
  'entry',jsonb_build_object('id',e.id,'locationId',e.location_id,'clockInAt',e.clock_in_at,'version',e.version,'status',e.status),
  'break',CASE WHEN b.id IS NULL THEN NULL ELSE jsonb_build_object('id',b.id,'breakStartAt',b.break_start_at,'version',b.version) END);
END;
$$;

-- SECURITY INVOKER (default), not a public authentication endpoint.
-- ClockerPunchService supplies current server-derived identity and surrounds this
-- function with the existing authorization guards, including a post-write expiry check.
CREATE FUNCTION clocker_apply_punch(p_employee text,p_device text,p_location text,p_credential_version integer,
 p_command uuid,p_action text,p_expected jsonb,p_request_hash text) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
 e time_entries%ROWTYPE; b break_entries%ROWTYPE; saved clocker_command_ledger%ROWTYPE;
 before_state jsonb; expected_state jsonb; result_state jsonb; receipt jsonb;
 performed timestamptz; last_boundary timestamptz; entry_id text; break_id text;
BEGIN
 -- Lock order: workspace -> employee -> identity/device -> time/break state.
 -- The employee lock is also acquired by the caller before device locks.
 PERFORM id FROM employees WHERE id=p_employee FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'clocker_punch_AUTH_REQUIRED'; END IF;
 SELECT * INTO saved FROM clocker_command_ledger WHERE device_id=p_device AND command_id=p_command;
 IF FOUND THEN
  IF saved.employee_id<>p_employee OR saved.credential_version<>p_credential_version
    OR saved.request_hash<>p_request_hash OR saved.action<>p_action THEN
   RAISE EXCEPTION 'clocker_punch_COMMAND_REUSED';
  END IF;
  RETURN saved.result;
 END IF;
 INSERT INTO clocker_employee_clock_state(employee_id) VALUES(p_employee) ON CONFLICT DO NOTHING;
 PERFORM employee_id FROM clocker_employee_clock_state WHERE employee_id=p_employee FOR UPDATE;
 SELECT * INTO e FROM time_entries WHERE employee_id=p_employee AND clock_out_at IS NULL FOR UPDATE;
 IF e.id IS NOT NULL THEN
  PERFORM id FROM break_entries WHERE time_entry_id=e.id ORDER BY id FOR UPDATE;
  SELECT * INTO b FROM break_entries WHERE time_entry_id=e.id AND break_end_at IS NULL;
 END IF;
 before_state=clocker_punch_snapshot(p_employee);
 expected_state=jsonb_build_object('revision',before_state->'revision',
  'timeEntryId',before_state->'entry'->'id','timeEntryVersion',before_state->'entry'->'version',
  'breakEntryId',before_state->'break'->'id','breakEntryVersion',before_state->'break'->'version');
 IF expected_state IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'clocker_punch_STALE_STATE'; END IF;
 IF e.id IS NOT NULL AND e.location_id<>p_location THEN RAISE EXCEPTION 'clocker_punch_OTHER_LOCATION'; END IF;
 IF p_action NOT IN ('CLOCK_IN','START_BREAK','END_BREAK','CLOCK_OUT')
   OR (p_action='CLOCK_IN' AND e.id IS NOT NULL)
   OR (p_action<>'CLOCK_IN' AND e.id IS NULL)
   OR (p_action='START_BREAK' AND e.status<>'CLOCKED_IN')
   OR (p_action='END_BREAK' AND e.status<>'ON_BREAK') THEN
  RAISE EXCEPTION 'clocker_punch_INVALID_TRANSITION';
 END IF;
 -- Database wall time is sampled after all business locks, never from the client
 -- and never transaction-start now(). Clock regressions fail instead of altering history.
 performed=clock_timestamp();
 IF e.id IS NULL THEN
  SELECT max(clock_out_at) INTO last_boundary FROM time_entries WHERE employee_id=p_employee;
 ELSE
  SELECT GREATEST(e.clock_in_at,max(COALESCE(break_end_at,break_start_at))) INTO last_boundary
   FROM break_entries WHERE time_entry_id=e.id;
 END IF;
 IF performed<last_boundary THEN RAISE EXCEPTION 'clocker_punch_CLOCK_INVALID'; END IF;
 entry_id=e.id; break_id=b.id;
 IF p_action='CLOCK_IN' THEN
  entry_id=gen_random_uuid()::text;
  INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status,created_at,updated_at)
   VALUES(entry_id,p_employee,p_location,p_device,performed,'CLOCKED_IN',performed,performed);
 ELSIF p_action='START_BREAK' THEN
  break_id=gen_random_uuid()::text;
  INSERT INTO break_entries(id,time_entry_id,break_start_at) VALUES(break_id,entry_id,performed);
  UPDATE time_entries SET status='ON_BREAK',version=version+1,updated_at=performed WHERE id=entry_id;
 ELSIF p_action='END_BREAK' THEN
  UPDATE break_entries SET break_end_at=performed,version=version+1 WHERE id=break_id;
  UPDATE time_entries SET status='CLOCKED_IN',version=version+1,updated_at=performed WHERE id=entry_id;
 ELSE
  IF break_id IS NOT NULL THEN UPDATE break_entries SET break_end_at=performed,version=version+1 WHERE id=break_id; END IF;
  UPDATE time_entries SET status='CLOCKED_OUT',clock_out_at=performed,version=version+1,updated_at=performed WHERE id=entry_id;
 END IF;
 UPDATE clocker_employee_clock_state SET revision=revision+1 WHERE employee_id=p_employee;
 result_state=clocker_punch_snapshot(p_employee);
 receipt=jsonb_build_object('commandId',p_command,'action',p_action,'timeEntryId',entry_id,
  'breakEntryId',break_id,'performedAt',performed,'snapshot',result_state);
 INSERT INTO clocker_command_ledger(device_id,command_id,employee_id,credential_version,request_hash,action,time_entry_id,performed_at,result)
  VALUES(p_device,p_command,p_employee,p_credential_version,p_request_hash,p_action,entry_id,performed,receipt);
 RETURN receipt;
END;
$$;
-- No real device, employee, PIN or punch is seeded. No payroll policy is inferred.
COMMIT;
