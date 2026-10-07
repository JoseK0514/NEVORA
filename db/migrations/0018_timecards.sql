BEGIN;

-- D3 approval/finalization is an append-only snapshot of D2's canonical projection.
CREATE TABLE timecard_revisions (
  operation_id uuid PRIMARY KEY,
  workspace_id text NOT NULL REFERENCES workspaces(id),
  employee_id text NOT NULL REFERENCES employees(id),
  start_date date NOT NULL,
  end_date date NOT NULL CHECK (end_date >= start_date AND end_date-start_date <= 30),
  revision integer NOT NULL CHECK (revision > 0),
  action text NOT NULL CHECK (action IN ('APPROVE','FINALIZE','REOPEN')),
  actor_employee_id text NOT NULL REFERENCES employees(id),
  source_hash char(32) NOT NULL CHECK (source_hash ~ '^[0-9a-f]{32}$'),
  snapshot jsonb NOT NULL CHECK (jsonb_typeof(snapshot)='object'),
  command_hash char(64) NOT NULL,
  note text CHECK (note IS NULL OR (char_length(note) BETWEEN 1 AND 500 AND note=btrim(note) AND note !~ '[[:cntrl:]]')),
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(workspace_id,employee_id,start_date,end_date,revision),
  CHECK(actor_employee_id<>employee_id),
  CHECK(action<>'REOPEN' OR note IS NOT NULL)
);
CREATE INDEX timecard_revisions_employee_period ON timecard_revisions(workspace_id,employee_id,start_date,end_date,revision DESC);
CREATE TRIGGER timecard_revisions_append_only BEFORE UPDATE OR DELETE ON timecard_revisions
  FOR EACH ROW EXECUTE FUNCTION clocker_device_event_append_only();
CREATE VIEW nevora_timecard_latest AS
  SELECT DISTINCT ON(workspace_id,employee_id,start_date,end_date) * FROM timecard_revisions
  ORDER BY workspace_id,employee_id,start_date,end_date,revision DESC;

CREATE FUNCTION nevora_timecard_source(p_workspace text,p_employee text,p_start date,p_end date)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE zone text; first_at timestamptz; after_at timestamptz; entry_data jsonb; correction_data jsonb; pending integer; employee_name text;
BEGIN
  IF p_start IS NULL OR p_end IS NULL OR p_end<p_start OR p_end-p_start>30 THEN RAISE EXCEPTION 'nevora_timecard_INVALID'; END IF;
  SELECT time_zone INTO zone FROM workspaces WHERE id=p_workspace AND active;
  SELECT trim(e.first_name||' '||e.last_name) INTO employee_name FROM employees e JOIN locations l ON l.id=e.primary_location_id
    WHERE e.id=p_employee AND l.workspace_id=p_workspace;
  IF zone IS NULL OR employee_name IS NULL THEN RAISE EXCEPTION 'nevora_timecard_AUTH_REQUIRED'; END IF;
  first_at=p_start::timestamp AT TIME ZONE zone; after_at=(p_end+1)::timestamp AT TIME ZONE zone;
  IF (SELECT count(*) FROM nevora_effective_time_entries v JOIN locations l ON l.id=v.location_id
      WHERE v.employee_id=p_employee AND l.workspace_id=p_workspace AND v.start_at<after_at AND (v.end_at IS NULL OR v.end_at>first_at))>10000 THEN
    RAISE EXCEPTION 'nevora_timecard_SOURCE_LIMIT';
  END IF;
  SELECT COALESCE(jsonb_agg(value ORDER BY start_at,id),'[]'::jsonb) INTO entry_data FROM (
    SELECT v.start_at,COALESCE(v.time_entry_id,v.adjustment_id::text) AS id,
      jsonb_build_object('id',COALESCE(v.time_entry_id,v.adjustment_id::text),'locationId',v.location_id,
        'locationName',COALESCE(NULLIF(trim(l.short_name),''),trim(l.name)),
        'positionId',t.schedule_context->'match'->>'positionId','positionName',t.schedule_context->'match'->>'positionName',
        'sourceKind',v.source_kind,'adjustmentId',v.adjustment_id,'recordedVersion',v.recorded_version,
        'startAt',v.start_at::text,'endAt',v.end_at::text,'rawStartAt',t.clock_in_at::text,'rawEndAt',t.clock_out_at::text,
        'breaks',COALESCE(b.items,'[]'::jsonb)) AS value
    FROM nevora_effective_time_entries v JOIN locations l ON l.id=v.location_id
    LEFT JOIN time_entries t ON t.id=v.time_entry_id
    LEFT JOIN LATERAL (
      SELECT jsonb_agg(jsonb_build_object('id',eb.break_entry_id,'startAt',eb.start_at::text,'endAt',eb.end_at::text,
        'rawStartAt',rb.break_start_at::text,'rawEndAt',rb.break_end_at::text,'adjustmentId',eb.adjustment_id,
        'name',COALESCE(NULLIF(eb.break_type_snapshot->>'name',''),'Recorded break')) ORDER BY eb.start_at,eb.break_entry_id) AS items
      FROM nevora_effective_break_entries eb JOIN break_entries rb ON rb.id=eb.break_entry_id
      WHERE eb.time_entry_id=v.time_entry_id AND eb.employee_id=p_employee
    ) b ON true
    WHERE v.employee_id=p_employee AND l.workspace_id=p_workspace AND v.start_at<after_at AND (v.end_at IS NULL OR v.end_at>first_at)
  ) entries;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(entry_data) e WHERE jsonb_array_length(e->'breaks')>1000) THEN RAISE EXCEPTION 'nevora_timecard_SOURCE_LIMIT'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object('id',r.id,'kind',r.kind,
      'status',CASE e.event_kind WHEN 'APPROVED' THEN 'APPROVED' WHEN 'REJECTED' THEN 'REJECTED' ELSE 'PENDING' END,
      'reason',r.reason,'revision',e.revision,'startAt',r.proposal->>'startAt','endAt',r.proposal->>'endAt') ORDER BY r.created_at,r.id),'[]'::jsonb),
      count(*) FILTER(WHERE e.event_kind='REQUESTED')::integer INTO correction_data,pending
    FROM time_correction_requests r
    JOIN LATERAL(SELECT event_kind,revision FROM time_correction_events WHERE request_id=r.id ORDER BY revision DESC LIMIT 1) e ON true
    LEFT JOIN time_entries t ON t.id=r.time_entry_id
    WHERE r.workspace_id=p_workspace AND r.employee_id=p_employee AND (
      ((r.proposal->>'startAt')::timestamptz<after_at AND (r.proposal->>'endAt')::timestamptz>first_at)
      OR (t.clock_in_at<after_at AND (t.clock_out_at IS NULL OR t.clock_out_at>first_at))
      OR EXISTS(SELECT 1 FROM time_correction_adjustments a WHERE a.id=r.base_adjustment_id AND a.effective_start_at<after_at AND a.effective_end_at>first_at));
  IF jsonb_array_length(correction_data)>10000 THEN RAISE EXCEPTION 'nevora_timecard_SOURCE_LIMIT'; END IF;
  RETURN jsonb_build_object('employeeId',p_employee,'employeeName',employee_name,'timeZone',zone,
    'startDate',p_start::text,'endDate',p_end::text,'pendingCorrections',pending,'entries',entry_data,'corrections',correction_data);
END;
$$;

-- Internal primitive: current-session guards are in the surrounding application transaction.
CREATE FUNCTION nevora_timecard_command(p_operation uuid,p_workspace text,p_employee text,p_actor text,
  p_start date,p_end date,p_expected integer,p_source_hash text,p_action text,p_note text,p_command_hash text)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE prior timecard_revisions%ROWTYPE; latest timecard_revisions%ROWTYPE; source_data jsonb; actual_hash text; after_at timestamptz; next_revision integer;
BEGIN
  PERFORM id FROM employees WHERE id IN(p_employee,p_actor) ORDER BY id FOR UPDATE;
  SELECT * INTO prior FROM timecard_revisions WHERE operation_id=p_operation;
  IF FOUND THEN
    IF prior.workspace_id<>p_workspace OR prior.actor_employee_id<>p_actor OR prior.command_hash<>p_command_hash THEN RAISE EXCEPTION 'nevora_timecard_CONFLICT'; END IF;
    RETURN jsonb_build_object('status',CASE prior.action WHEN 'APPROVE' THEN 'approved' WHEN 'FINALIZE' THEN 'finalized' ELSE 'reopened' END,
      'operationId',p_operation,'revision',prior.revision);
  END IF;
  IF p_actor=p_employee THEN RAISE EXCEPTION 'nevora_timecard_SELF_REVIEW'; END IF;
  IF NOT EXISTS(SELECT 1 FROM employees WHERE id=p_actor AND active AND role IN('OWNER','MANAGER')) THEN RAISE EXCEPTION 'nevora_timecard_AUTH_REQUIRED'; END IF;
  IF p_action NOT IN('APPROVE','FINALIZE','REOPEN') OR p_expected<0 OR p_expected IS NULL OR p_source_hash !~ '^[a-f0-9]{32}$' OR p_command_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'nevora_timecard_INVALID'; END IF;
  source_data=nevora_timecard_source(p_workspace,p_employee,p_start,p_end);
  actual_hash=md5(source_data::text);
  SELECT * INTO latest FROM nevora_timecard_latest WHERE workspace_id=p_workspace AND employee_id=p_employee AND start_date=p_start AND end_date=p_end;
  IF COALESCE(latest.revision,0)<>p_expected THEN RAISE EXCEPTION 'nevora_timecard_CONFLICT'; END IF;
  IF EXISTS(SELECT 1 FROM nevora_timecard_latest WHERE workspace_id=p_workspace AND employee_id=p_employee AND action='FINALIZE'
    AND start_date<=p_end AND end_date>=p_start AND (start_date<>p_start OR end_date<>p_end)) THEN RAISE EXCEPTION 'nevora_timecard_OVERLAPPING_PERIOD'; END IF;
  IF actual_hash<>p_source_hash THEN RAISE EXCEPTION 'nevora_timecard_CONFLICT'; END IF;
  after_at=(p_end+1)::timestamp AT TIME ZONE (source_data->>'timeZone');
  IF p_action='REOPEN' THEN
    IF latest.action IS DISTINCT FROM 'FINALIZE' OR p_note IS NULL OR btrim(p_note)='' THEN RAISE EXCEPTION 'nevora_timecard_STATE'; END IF;
  ELSE
    IF latest.action='FINALIZE' THEN RAISE EXCEPTION 'nevora_timecard_STATE'; END IF;
    IF after_at>clock_timestamp() OR (source_data->>'pendingCorrections')::integer>0 OR EXISTS(
      SELECT 1 FROM jsonb_array_elements(source_data->'entries') e WHERE e->>'endAt' IS NULL
      OR EXISTS(SELECT 1 FROM jsonb_array_elements(e->'breaks') b WHERE b->>'endAt' IS NULL)) THEN RAISE EXCEPTION 'nevora_timecard_UNRESOLVED'; END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(source_data->'entries') a JOIN jsonb_array_elements(source_data->'entries') b
      ON a->>'id'<b->>'id' WHERE (a->>'startAt')::timestamptz<(b->>'endAt')::timestamptz AND (b->>'startAt')::timestamptz<(a->>'endAt')::timestamptz)
      OR EXISTS(SELECT 1 FROM jsonb_array_elements(source_data->'entries') e CROSS JOIN LATERAL jsonb_array_elements(e->'breaks') b
      WHERE (b->>'startAt')::timestamptz<(e->>'startAt')::timestamptz OR (b->>'endAt')::timestamptz>(e->>'endAt')::timestamptz
      OR (b->>'endAt')::timestamptz<=(b->>'startAt')::timestamptz) THEN RAISE EXCEPTION 'nevora_timecard_UNRESOLVED'; END IF;
    IF p_action='FINALIZE' AND (latest.action IS DISTINCT FROM 'APPROVE' OR latest.source_hash<>actual_hash) THEN RAISE EXCEPTION 'nevora_timecard_APPROVAL_REQUIRED'; END IF;
  END IF;
  next_revision=COALESCE(latest.revision,0)+1;
  INSERT INTO timecard_revisions(operation_id,workspace_id,employee_id,start_date,end_date,revision,action,actor_employee_id,
    source_hash,snapshot,command_hash,note) VALUES(p_operation,p_workspace,p_employee,p_start,p_end,next_revision,p_action,p_actor,actual_hash,source_data,p_command_hash,p_note);
  RETURN jsonb_build_object('status',CASE p_action WHEN 'APPROVE' THEN 'approved' WHEN 'FINALIZE' THEN 'finalized' ELSE 'reopened' END,
    'operationId',p_operation,'revision',next_revision);
END;
$$;

-- The employee lock shared with D2 serializes finalization and later corrections.
CREATE FUNCTION nevora_timecard_correction_interlock() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE original_start timestamptz; original_end timestamptz; proposed_start timestamptz; proposed_end timestamptz;
BEGIN
  PERFORM id FROM employees WHERE id=NEW.employee_id FOR UPDATE;
  IF TG_TABLE_NAME='time_correction_requests' THEN
    proposed_start=(NEW.proposal->>'startAt')::timestamptz; proposed_end=(NEW.proposal->>'endAt')::timestamptz;
  ELSE proposed_start=NEW.effective_start_at; proposed_end=NEW.effective_end_at; END IF;
  IF NEW.time_entry_id IS NOT NULL THEN
    SELECT clock_in_at,clock_out_at INTO original_start,original_end FROM time_entries WHERE id=NEW.time_entry_id;
  ELSIF TG_TABLE_NAME='time_correction_requests' THEN
    SELECT effective_start_at,effective_end_at INTO original_start,original_end FROM time_correction_adjustments WHERE id=NEW.base_adjustment_id;
  ELSE
    SELECT effective_start_at,effective_end_at INTO original_start,original_end FROM time_correction_adjustments WHERE id=NEW.supersedes_adjustment_id;
  END IF;
  IF EXISTS(SELECT 1 FROM nevora_timecard_latest c JOIN workspaces w ON w.id=c.workspace_id
    WHERE c.employee_id=NEW.employee_id AND c.workspace_id=NEW.workspace_id AND c.action='FINALIZE' AND (
      (proposed_start<(c.end_date+1)::timestamp AT TIME ZONE w.time_zone AND proposed_end>c.start_date::timestamp AT TIME ZONE w.time_zone)
      OR (original_start<(c.end_date+1)::timestamp AT TIME ZONE w.time_zone AND COALESCE(original_end,'infinity'::timestamptz)>c.start_date::timestamp AT TIME ZONE w.time_zone))) THEN
    RAISE EXCEPTION 'nevora_correction_FINALIZED_PERIOD';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER timecard_request_interlock BEFORE INSERT ON time_correction_requests FOR EACH ROW EXECUTE FUNCTION nevora_timecard_correction_interlock();
CREATE TRIGGER timecard_adjustment_interlock BEFORE INSERT ON time_correction_adjustments FOR EACH ROW EXECUTE FUNCTION nevora_timecard_correction_interlock();

CREATE FUNCTION nevora_timecard_raw_interlock() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE employee text; location text; first_at timestamptz; after_at timestamptz; old_first timestamptz; old_after timestamptz;
BEGIN
  IF TG_TABLE_NAME='time_entries' THEN
    IF TG_OP='DELETE' THEN employee=OLD.employee_id;location=OLD.location_id;first_at=OLD.clock_in_at;after_at=OLD.clock_out_at;
    ELSE employee=NEW.employee_id;location=NEW.location_id;first_at=NEW.clock_in_at;after_at=NEW.clock_out_at; END IF;
    IF TG_OP='UPDATE' THEN old_first=OLD.clock_in_at;old_after=OLD.clock_out_at; END IF;
  ELSE
    IF TG_OP='DELETE' THEN
      SELECT employee_id,location_id,clock_in_at,clock_out_at INTO employee,location,first_at,after_at FROM time_entries WHERE id=OLD.time_entry_id;
    ELSE
      SELECT employee_id,location_id,clock_in_at,clock_out_at INTO employee,location,first_at,after_at FROM time_entries WHERE id=NEW.time_entry_id;
    END IF;
  END IF;
  PERFORM id FROM employees WHERE id=employee FOR UPDATE;
  IF EXISTS(SELECT 1 FROM nevora_timecard_latest c JOIN workspaces w ON w.id=c.workspace_id JOIN locations l ON l.id=location AND l.workspace_id=w.id
    WHERE c.employee_id=employee AND c.action='FINALIZE' AND (
      (first_at<(c.end_date+1)::timestamp AT TIME ZONE w.time_zone AND COALESCE(after_at,'infinity'::timestamptz)>c.start_date::timestamp AT TIME ZONE w.time_zone)
      OR (old_first<(c.end_date+1)::timestamp AT TIME ZONE w.time_zone AND COALESCE(old_after,'infinity'::timestamptz)>c.start_date::timestamp AT TIME ZONE w.time_zone))) THEN
    RAISE EXCEPTION 'nevora_timecard_FINALIZED_PERIOD';
  END IF;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER timecard_raw_entry_interlock BEFORE INSERT OR UPDATE OR DELETE ON time_entries FOR EACH ROW EXECUTE FUNCTION nevora_timecard_raw_interlock();
CREATE TRIGGER timecard_raw_break_interlock BEFORE INSERT OR UPDATE OR DELETE ON break_entries FOR EACH ROW EXECUTE FUNCTION nevora_timecard_raw_interlock();

COMMIT;
