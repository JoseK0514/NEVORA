BEGIN;
-- Phase C release: Operational break types and immutable break snapshots.
CREATE TABLE clocker_break_types (
 id text PRIMARY KEY,
 workspace_id text NOT NULL REFERENCES workspaces(id),
 name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80 AND name=btrim(name)),
 category text NOT NULL CHECK (category IN ('REST','MEAL','OTHER')),
 target_minutes integer CHECK (target_minutes BETWEEN 1 AND 1440),
 active boolean NOT NULL DEFAULT true,
 version integer NOT NULL DEFAULT 1 CHECK (version>0),
 created_by text NOT NULL REFERENCES employees(id),
 updated_by text NOT NULL REFERENCES employees(id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX clocker_break_type_name ON clocker_break_types(workspace_id,lower(name));
CREATE TABLE clocker_break_type_events (
 id uuid PRIMARY KEY,
 break_type_id text NOT NULL REFERENCES clocker_break_types(id),
 version integer NOT NULL CHECK (version>0),
 actor_employee_id text NOT NULL REFERENCES employees(id),
 settings jsonb NOT NULL CHECK (jsonb_typeof(settings)='object'),
 occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(break_type_id,version)
);
CREATE TRIGGER clocker_break_type_event_append_only BEFORE UPDATE OR DELETE ON clocker_break_type_events
 FOR EACH ROW EXECUTE FUNCTION clocker_device_event_append_only();
ALTER TABLE break_entries ADD COLUMN break_type_id text REFERENCES clocker_break_types(id);
ALTER TABLE break_entries ADD COLUMN break_type_snapshot jsonb;
ALTER TABLE break_entries ADD CONSTRAINT clocker_break_snapshot_paired CHECK ((break_type_id IS NULL)=(break_type_snapshot IS NULL));
ALTER TABLE break_entries ADD CONSTRAINT clocker_break_snapshot_shape CHECK (break_type_snapshot IS NULL OR
 (jsonb_typeof(break_type_snapshot)='object' AND break_type_snapshot->>'id'=break_type_id));
CREATE FUNCTION clocker_preserve_break_settings() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR NEW.break_type_id IS DISTINCT FROM OLD.break_type_id
   OR NEW.break_type_snapshot IS DISTINCT FROM OLD.break_type_snapshot THEN
  RAISE EXCEPTION 'Recorded break classification cannot be changed or removed.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER clocker_preserve_break_settings BEFORE UPDATE OR DELETE ON break_entries
 FOR EACH ROW EXECUTE FUNCTION clocker_preserve_break_settings();
-- Old unclassified history deliberately remains NULL. No default types or payroll policies are seeded.

CREATE OR REPLACE FUNCTION clocker_punch_snapshot(p_employee text) RETURNS jsonb
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
  'break',CASE WHEN b.id IS NULL THEN NULL ELSE jsonb_build_object('id',b.id,'breakStartAt',b.break_start_at,'version',b.version,'type',b.break_type_snapshot) END);
END;
$$;

-- SECURITY INVOKER (default), not a public authentication endpoint.
-- ClockerPunchService supplies current server-derived identity and surrounds this
-- function with the existing authorization guards, including a post-write expiry check.
CREATE OR REPLACE FUNCTION clocker_apply_punch(p_employee text,p_device text,p_location text,p_credential_version integer,
 p_command uuid,p_action text,p_expected jsonb,p_request_hash text) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
 e time_entries%ROWTYPE; b break_entries%ROWTYPE; saved clocker_command_ledger%ROWTYPE;
 before_state jsonb; expected_state jsonb; result_state jsonb; receipt jsonb;
 performed timestamptz; last_boundary timestamptz; entry_id text; break_id text;
 selected_type clocker_break_types%ROWTYPE; break_settings jsonb;
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
 IF expected_state IS DISTINCT FROM (p_expected - 'breakType') THEN RAISE EXCEPTION 'clocker_punch_STALE_STATE'; END IF;
 IF e.id IS NOT NULL AND e.location_id<>p_location THEN RAISE EXCEPTION 'clocker_punch_OTHER_LOCATION'; END IF;
 IF p_action NOT IN ('CLOCK_IN','START_BREAK','END_BREAK','CLOCK_OUT')
   OR (p_action='CLOCK_IN' AND e.id IS NOT NULL)
   OR (p_action<>'CLOCK_IN' AND e.id IS NULL)
   OR (p_action='START_BREAK' AND e.status<>'CLOCKED_IN')
   OR (p_action='END_BREAK' AND e.status<>'ON_BREAK') THEN
  RAISE EXCEPTION 'clocker_punch_INVALID_TRANSITION';
 END IF;
 -- Validate the observed type under a lock. Catalog changes affect future starts only.
 -- Duplicate commands returned their original immutable receipt above.
 break_settings=b.break_type_snapshot;
 IF p_action='START_BREAK' THEN
  SELECT bt.* INTO selected_type FROM clocker_break_types bt JOIN locations l ON l.workspace_id=bt.workspace_id
   WHERE l.id=p_location AND bt.id=p_expected->'breakType'->>'id' FOR SHARE OF bt;
  IF selected_type.id IS NULL OR NOT selected_type.active
    OR selected_type.version::text IS DISTINCT FROM (p_expected->'breakType'->>'version') THEN
   RAISE EXCEPTION 'clocker_punch_BREAK_TYPE_CHANGED';
  END IF;
  break_settings=jsonb_build_object('id',selected_type.id,'version',selected_type.version,'name',selected_type.name,
   'category',selected_type.category,'targetMinutes',selected_type.target_minutes);
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
  IF NOT FOUND THEN RAISE EXCEPTION 'clocker_punch_INTEGRITY'; END IF;
 ELSIF p_action='START_BREAK' THEN
  break_id=gen_random_uuid()::text;
  INSERT INTO break_entries(id,time_entry_id,break_start_at,break_type_id,break_type_snapshot) VALUES(break_id,entry_id,performed,selected_type.id,break_settings);
  IF NOT FOUND THEN RAISE EXCEPTION 'clocker_punch_INTEGRITY'; END IF;
  UPDATE time_entries SET status='ON_BREAK',version=version+1,updated_at=performed WHERE id=entry_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'clocker_punch_INTEGRITY'; END IF;
 ELSIF p_action='END_BREAK' THEN
  UPDATE break_entries SET break_end_at=performed,version=version+1 WHERE id=break_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'clocker_punch_INTEGRITY'; END IF;
  UPDATE time_entries SET status='CLOCKED_IN',version=version+1,updated_at=performed WHERE id=entry_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'clocker_punch_INTEGRITY'; END IF;
 ELSE
  IF break_id IS NOT NULL THEN UPDATE break_entries SET break_end_at=performed,version=version+1 WHERE id=break_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'clocker_punch_INTEGRITY'; END IF; END IF;
  UPDATE time_entries SET status='CLOCKED_OUT',clock_out_at=performed,version=version+1,updated_at=performed WHERE id=entry_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'clocker_punch_INTEGRITY'; END IF;
 END IF;
 UPDATE clocker_employee_clock_state SET revision=revision+1 WHERE employee_id=p_employee;
  IF NOT FOUND THEN RAISE EXCEPTION 'clocker_punch_INTEGRITY'; END IF;
 result_state=clocker_punch_snapshot(p_employee);
 receipt=jsonb_build_object('commandId',p_command,'action',p_action,'timeEntryId',entry_id,
  'breakEntryId',break_id,'performedAt',performed,'snapshot',result_state,'breakType',break_settings);
 INSERT INTO clocker_command_ledger(device_id,command_id,employee_id,credential_version,request_hash,action,time_entry_id,performed_at,result)
  VALUES(p_device,p_command,p_employee,p_credential_version,p_request_hash,p_action,entry_id,performed,receipt);
 IF NOT FOUND THEN RAISE EXCEPTION 'clocker_punch_INTEGRITY'; END IF;
 RETURN receipt;
END;
$$;

COMMIT;
