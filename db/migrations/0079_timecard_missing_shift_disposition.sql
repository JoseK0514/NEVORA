BEGIN;

CREATE INDEX schedule_revision_shifts_employee_date_idx
  ON schedule_publication_revision_shifts(employee_id,date,revision_id);

-- BL-20: bind an unresolved assignment or a published, approved callout to
-- the current review and immutable final snapshot. Empty outcomes preserve
-- existing hashes for ordinary timecards and all previously frozen revisions.
CREATE OR REPLACE FUNCTION nevora_timecard_source(p_workspace text,p_employee text,p_start date,p_end date)
RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE zone text; first_at timestamptz; after_at timestamptz; entry_data jsonb; correction_data jsonb; pending integer; employee_name text; shift_outcomes jsonb;
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
  -- Choose the authoritative week revision before filtering assignments. Include
  -- a prior-day start when an overnight assignment crosses into this period.
  WITH candidate_weeks AS (
    SELECT r.week_start
    FROM schedule_publication_revision_shifts sh JOIN schedule_publication_revisions r ON r.id=sh.revision_id
    WHERE sh.employee_id=p_employee AND sh.date BETWEEN p_start-1 AND p_end
    UNION
    SELECT s.week_start
    FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id AND s.status='PUBLISHED'
    WHERE sh.employee_id=p_employee AND sh.date BETWEEN p_start-1 AND p_end
  ), latest AS (
    SELECT DISTINCT ON (r.week_start) r.id,r.week_start
    FROM schedule_publication_revisions r
    JOIN candidate_weeks w ON w.week_start=r.week_start
    ORDER BY r.week_start,r.revision_number DESC
  ), published AS (
    SELECT sh.id,sh.location_id,sh.date,sh.start_time,sh.end_time,sh.is_callout_approved
    FROM latest r JOIN schedule_publication_revision_shifts sh ON sh.revision_id=r.id
    WHERE sh.employee_id=p_employee AND sh.date BETWEEN p_start-1 AND p_end
    UNION ALL
    -- Pre-revision published rows still represent assignments. Once a week
    -- has a revision, its snapshot (including an empty one) takes precedence.
    SELECT 'legacy:'||sh.id,s.location_id,sh.date,sh.start_time,sh.end_time,false
    FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id AND s.status='PUBLISHED'
    WHERE sh.employee_id=p_employee AND sh.date BETWEEN p_start-1 AND p_end
      AND NOT EXISTS (SELECT 1 FROM latest r WHERE r.week_start=s.week_start)
  ), assignments AS (
    SELECT sh.id,sh.location_id,sh.date,sh.is_callout_approved,
      (sh.date+sh.start_time) AT TIME ZONE zone AS start_at,
      (sh.date+sh.end_time+CASE WHEN sh.end_time<sh.start_time THEN interval '1 day' ELSE interval '0' END)
        AT TIME ZONE zone AS end_at
    FROM published sh
    JOIN locations l ON l.id=sh.location_id AND l.workspace_id=p_workspace
  ), no_effective_time AS (
    SELECT a.*
    FROM assignments a
    WHERE a.start_at<after_at AND a.end_at>first_at
      -- A closed period can still overlap an ongoing overnight assignment.
      AND (a.end_at<=statement_timestamp() OR after_at<=statement_timestamp())
      AND NOT EXISTS (
        SELECT 1 FROM nevora_effective_time_entries v
        WHERE v.employee_id=p_employee AND v.location_id=a.location_id
          AND v.end_at IS NOT NULL AND v.start_at<v.end_at
          AND v.start_at<a.end_at AND v.end_at>a.start_at
      )
    ORDER BY a.date,a.start_at,a.id
    LIMIT 10001
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('assignmentId',a.id,'locationId',a.location_id,
    'date',a.date::text,'status',CASE WHEN a.is_callout_approved THEN 'APPROVED_CALLOUT' ELSE 'UNRESOLVED' END)
    ORDER BY a.date,a.start_at,a.id),'[]'::jsonb) INTO shift_outcomes FROM no_effective_time a;
  IF jsonb_array_length(shift_outcomes)>10000 THEN RAISE EXCEPTION 'nevora_timecard_SOURCE_LIMIT'; END IF;

  RETURN jsonb_build_object('employeeId',p_employee,'employeeName',employee_name,'timeZone',zone,
    'startDate',p_start::text,'endDate',p_end::text,'pendingCorrections',pending,'entries',entry_data,'corrections',correction_data)
    || CASE WHEN shift_outcomes='[]'::jsonb THEN '{}'::jsonb
            ELSE jsonb_build_object('shiftOutcomes',shift_outcomes) END;
END;
$$;

-- D-AUD-001: preserve frozen revision authority after ordinary metadata edits.
CREATE OR REPLACE FUNCTION nevora_timecard_command(p_operation uuid,p_workspace text,p_employee text,p_actor text,
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
  -- Reopen acknowledges the immutable finalized revision displayed by readers.
  -- Approve/finalize still validate the live canonical source.
  IF p_action='REOPEN' THEN
    IF latest.source_hash IS DISTINCT FROM p_source_hash THEN RAISE EXCEPTION 'nevora_timecard_CONFLICT'; END IF;
  ELSIF actual_hash<>p_source_hash THEN RAISE EXCEPTION 'nevora_timecard_CONFLICT'; END IF;
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
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(source_data->'shiftOutcomes') sh WHERE sh->>'status'='UNRESOLVED') THEN
      RAISE EXCEPTION 'nevora_timecard_MISSING_SHIFT_DISPOSITION';
    END IF;
    IF p_action='FINALIZE' AND (latest.action IS DISTINCT FROM 'APPROVE' OR latest.source_hash<>actual_hash) THEN RAISE EXCEPTION 'nevora_timecard_APPROVAL_REQUIRED'; END IF;
  END IF;
  next_revision=COALESCE(latest.revision,0)+1;
  INSERT INTO timecard_revisions(operation_id,workspace_id,employee_id,start_date,end_date,revision,action,actor_employee_id,
    source_hash,snapshot,command_hash,note) VALUES(p_operation,p_workspace,p_employee,p_start,p_end,next_revision,p_action,p_actor,actual_hash,source_data,p_command_hash,p_note);
  RETURN jsonb_build_object('status',CASE p_action WHEN 'APPROVE' THEN 'approved' WHEN 'FINALIZE' THEN 'finalized' ELSE 'reopened' END,
    'operationId',p_operation,'revision',next_revision);
END;
$$;

COMMIT;
