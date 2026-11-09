BEGIN;

-- D2-CODEX-004: use the existing immutable adjustment chain. No table/row rewrite.
-- D2-CODEX-007: untargeted submissions validate the authoritative effective parent.
CREATE OR REPLACE FUNCTION nevora_submit_time_correction(
  p_request uuid,
  p_workspace text,
  p_employee text,
  p_actor text,
  p_kind text,
  p_time_entry text,
  p_break_entry text,
  p_location text,
  p_proposed_start timestamptz,
  p_proposed_end timestamptz,
  p_reason text,
  p_request_hash text
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  existing time_correction_requests%ROWTYPE;
  entry_row time_entries%ROWTYPE;
  break_row break_entries%ROWTYPE;
  source_rev integer;
  source_data jsonb;
  base_id uuid;
  actual_location text;
  parent_start timestamptz;
  parent_end timestamptz;
  result_data jsonb;
BEGIN
  SELECT * INTO existing FROM time_correction_requests WHERE id=p_request;
  IF FOUND THEN
    IF existing.employee_id<>p_employee OR existing.requested_by_employee_id<>p_actor
       OR existing.request_hash<>p_request_hash THEN
      RAISE EXCEPTION 'nevora_correction_COMMAND_REUSED';
    END IF;
    SELECT result INTO result_data FROM time_correction_events WHERE id=p_request;
    IF result_data IS NULL THEN RAISE EXCEPTION 'nevora_correction_INTEGRITY'; END IF;
    RETURN result_data;
  END IF;

  IF p_actor IS DISTINCT FROM p_employee
     OR p_kind NOT IN ('ENTRY_BOUNDARY','BREAK_BOUNDARY','MISSING_ENTRY')
     OR p_proposed_start IS NULL OR p_proposed_end IS NULL
     OR p_proposed_start>=p_proposed_end
     OR p_proposed_end>clock_timestamp()
     OR p_request_hash !~ '^[a-f0-9]{64}$'
     OR p_reason IS NULL OR p_reason<>btrim(p_reason)
     OR char_length(p_reason) NOT BETWEEN 1 AND 500
     OR p_reason ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'nevora_correction_INVALID';
  END IF;

  PERFORM e.id
  FROM employees e
  JOIN locations home ON home.id=e.primary_location_id
  WHERE e.id=p_employee AND e.active AND home.workspace_id=p_workspace
  FOR UPDATE OF e;
  IF NOT FOUND THEN RAISE EXCEPTION 'nevora_correction_AUTH_REQUIRED'; END IF;

  INSERT INTO clocker_employee_clock_state(employee_id) VALUES(p_employee)
    ON CONFLICT DO NOTHING;
  SELECT revision INTO source_rev
  FROM clocker_employee_clock_state
  WHERE employee_id=p_employee
  FOR UPDATE;
  IF source_rev IS NULL THEN RAISE EXCEPTION 'nevora_correction_INTEGRITY'; END IF;

  IF p_kind='ENTRY_BOUNDARY' THEN
    IF p_time_entry IS NULL OR p_break_entry IS NOT NULL THEN
      RAISE EXCEPTION 'nevora_correction_INVALID';
    END IF;
    SELECT t.* INTO entry_row
    FROM time_entries t JOIN locations l ON l.id=t.location_id
    WHERE t.id=p_time_entry AND t.employee_id=p_employee AND l.workspace_id=p_workspace
    FOR UPDATE OF t;
    IF entry_row.id IS NULL THEN RAISE EXCEPTION 'nevora_correction_NOT_FOUND'; END IF;
    IF entry_row.clock_out_at IS NULL OR entry_row.status<>'CLOCKED_OUT' THEN
      RAISE EXCEPTION 'nevora_correction_LIVE_STATE';
    END IF;
    actual_location=entry_row.location_id;
    SELECT a.id INTO base_id
    FROM nevora_time_correction_leaf_adjustments a
    WHERE a.kind='ENTRY_BOUNDARY' AND a.time_entry_id=entry_row.id;
    source_data=jsonb_build_object(
      'recorded',true,'timeEntryId',entry_row.id,'sourceVersion',entry_row.version,
      'clockInAt',entry_row.clock_in_at,'clockOutAt',entry_row.clock_out_at,
      'locationId',entry_row.location_id,'deviceId',entry_row.device_id,
      'scheduleContext',entry_row.schedule_context
    );
    IF EXISTS (
      SELECT 1 FROM nevora_pending_time_corrections pending
      WHERE pending.employee_id=p_employee
        AND pending.kind='ENTRY_BOUNDARY'
        AND pending.time_entry_id=entry_row.id
    ) THEN RAISE EXCEPTION 'nevora_correction_PENDING_EXISTS'; END IF;
  ELSIF p_kind='BREAK_BOUNDARY' THEN
    IF p_time_entry IS NULL OR p_break_entry IS NULL THEN
      RAISE EXCEPTION 'nevora_correction_INVALID';
    END IF;
    SELECT t.* INTO entry_row
    FROM time_entries t JOIN locations l ON l.id=t.location_id
    WHERE t.id=p_time_entry AND t.employee_id=p_employee AND l.workspace_id=p_workspace
    FOR UPDATE OF t;
    IF entry_row.id IS NULL THEN RAISE EXCEPTION 'nevora_correction_NOT_FOUND'; END IF;
    IF entry_row.clock_out_at IS NULL OR entry_row.status<>'CLOCKED_OUT' THEN
      RAISE EXCEPTION 'nevora_correction_LIVE_STATE';
    END IF;
    SELECT b.* INTO break_row
    FROM break_entries b
    WHERE b.id=p_break_entry AND b.time_entry_id=entry_row.id
    FOR UPDATE OF b;
    IF break_row.id IS NULL OR break_row.break_end_at IS NULL THEN
      RAISE EXCEPTION 'nevora_correction_LIVE_STATE';
    END IF;
    SELECT start_at,end_at INTO parent_start,parent_end
    FROM nevora_effective_time_entries
    WHERE employee_id=p_employee AND time_entry_id=entry_row.id;
    IF parent_start IS NULL OR parent_end IS NULL
       OR p_proposed_start<parent_start OR p_proposed_end>parent_end THEN
      RAISE EXCEPTION 'nevora_correction_INVALID_INTERVAL';
    END IF;
    actual_location=entry_row.location_id;
    SELECT a.id INTO base_id
    FROM nevora_time_correction_leaf_adjustments a
    WHERE a.kind='BREAK_BOUNDARY' AND a.break_entry_id=break_row.id;
    source_data=jsonb_build_object(
      'recorded',true,'timeEntryId',entry_row.id,'entryVersion',entry_row.version,
      'breakEntryId',break_row.id,'sourceVersion',break_row.version,
      'startAt',break_row.break_start_at,'endAt',break_row.break_end_at,
      'breakTypeId',break_row.break_type_id,'breakTypeSnapshot',break_row.break_type_snapshot,
      'locationId',entry_row.location_id
    );
    IF EXISTS (
      SELECT 1 FROM nevora_pending_time_corrections pending
      WHERE pending.employee_id=p_employee
        AND pending.kind='BREAK_BOUNDARY'
        AND pending.break_entry_id=break_row.id
    ) THEN RAISE EXCEPTION 'nevora_correction_PENDING_EXISTS'; END IF;
  ELSE
    IF p_time_entry IS NOT NULL OR p_break_entry IS NOT NULL OR p_location IS NULL THEN
      RAISE EXCEPTION 'nevora_correction_INVALID';
    END IF;
    PERFORM l.id
    FROM locations l
    JOIN employee_location_eligibility elig
      ON elig.location_id=l.id AND elig.employee_id=p_employee
    WHERE l.id=p_location AND l.workspace_id=p_workspace AND l.active
    FOR SHARE OF l;
    IF NOT FOUND THEN RAISE EXCEPTION 'nevora_correction_AUTH_REQUIRED'; END IF;
    actual_location=p_location;
    source_data=jsonb_build_object('recorded',false,'locationId',p_location);
    IF EXISTS (
      SELECT 1 FROM nevora_pending_time_corrections pending
      WHERE pending.employee_id=p_employee AND pending.kind='MISSING_ENTRY'
        AND (pending.proposal->>'startAt')::timestamptz < p_proposed_end
        AND p_proposed_start < (pending.proposal->>'endAt')::timestamptz
    ) THEN RAISE EXCEPTION 'nevora_correction_PENDING_EXISTS'; END IF;
  END IF;

  INSERT INTO time_correction_requests(
    id,workspace_id,employee_id,requested_by_employee_id,kind,time_entry_id,break_entry_id,
    location_id,source_revision,source_snapshot,base_adjustment_id,proposal,reason,request_hash
  ) VALUES (
    p_request,p_workspace,p_employee,p_actor,p_kind,p_time_entry,p_break_entry,
    actual_location,source_rev,source_data,base_id,
    jsonb_build_object('startAt',p_proposed_start,'endAt',p_proposed_end),
    p_reason,p_request_hash
  );

  result_data=jsonb_build_object(
    'status','pending','operationId',p_request,'requestId',p_request,'revision',1
  );
  INSERT INTO time_correction_events(
    id,request_id,revision,event_kind,actor_employee_id,operation_hash,result
  ) VALUES (p_request,p_request,1,'REQUESTED',p_actor,p_request_hash,result_data);
  RETURN result_data;
END;
$$;

-- D2-CODEX-004: explicit missing-time supersession overload.
CREATE FUNCTION nevora_submit_time_correction(
  p_request uuid, p_workspace text, p_employee text, p_actor text, p_kind text,
  p_time_entry text, p_break_entry text, p_location text,
  p_proposed_start timestamptz, p_proposed_end timestamptz,
  p_reason text, p_request_hash text, p_target_adjustment uuid, p_expected_base_revision integer
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  existing time_correction_requests%ROWTYPE;
  target time_correction_adjustments%ROWTYPE;
  target_event time_correction_events%ROWTYPE;
  source_rev integer;
  source_data jsonb;
  result_data jsonb;
BEGIN
  SELECT * INTO existing FROM time_correction_requests WHERE id=p_request;
  IF FOUND THEN
    IF existing.workspace_id IS DISTINCT FROM p_workspace
       OR existing.employee_id IS DISTINCT FROM p_employee
       OR existing.requested_by_employee_id IS DISTINCT FROM p_actor
       OR existing.base_adjustment_id IS DISTINCT FROM p_target_adjustment
       OR existing.request_hash IS DISTINCT FROM p_request_hash THEN
      RAISE EXCEPTION 'nevora_correction_COMMAND_REUSED';
    END IF;
    SELECT result INTO result_data FROM time_correction_events WHERE id=p_request;
    IF result_data IS NULL THEN RAISE EXCEPTION 'nevora_correction_INTEGRITY'; END IF;
    RETURN result_data;
  END IF;

  IF p_actor IS DISTINCT FROM p_employee OR p_kind IS DISTINCT FROM 'MISSING_ENTRY'
     OR p_time_entry IS NOT NULL OR p_break_entry IS NOT NULL OR p_location IS NULL
     OR p_target_adjustment IS NULL OR p_expected_base_revision IS NULL OR p_expected_base_revision<1
     OR p_proposed_start IS NULL OR p_proposed_end IS NULL OR p_proposed_start>=p_proposed_end
     OR p_proposed_end>clock_timestamp()
     OR p_request_hash IS NULL OR p_request_hash !~ '^[a-f0-9]{64}$'
     OR p_reason IS NULL OR p_reason<>btrim(p_reason)
     OR char_length(p_reason) NOT BETWEEN 1 AND 500 OR p_reason ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'nevora_correction_INVALID';
  END IF;

  PERFORM e.id FROM employees e JOIN locations home ON home.id=e.primary_location_id
    WHERE e.id=p_employee AND e.active AND home.workspace_id=p_workspace FOR UPDATE OF e;
  IF NOT FOUND THEN RAISE EXCEPTION 'nevora_correction_AUTH_REQUIRED'; END IF;
  PERFORM l.id FROM locations l JOIN employee_location_eligibility elig
    ON elig.location_id=l.id AND elig.employee_id=p_employee
    WHERE l.id=p_location AND l.workspace_id=p_workspace AND l.active FOR SHARE OF l;
  IF NOT FOUND THEN RAISE EXCEPTION 'nevora_correction_AUTH_REQUIRED'; END IF;

  INSERT INTO clocker_employee_clock_state(employee_id) VALUES(p_employee) ON CONFLICT DO NOTHING;
  SELECT revision INTO source_rev FROM clocker_employee_clock_state
    WHERE employee_id=p_employee FOR UPDATE;
  IF source_rev IS NULL THEN RAISE EXCEPTION 'nevora_correction_INTEGRITY'; END IF;

  SELECT * INTO target FROM time_correction_adjustments
    WHERE id=p_target_adjustment AND kind='MISSING_ENTRY'
      AND employee_id=p_employee AND workspace_id=p_workspace AND location_id=p_location;
  IF target.id IS NULL THEN RAISE EXCEPTION 'nevora_correction_NOT_FOUND'; END IF;
  SELECT * INTO target_event FROM time_correction_events
    WHERE request_id=target.request_id ORDER BY revision DESC LIMIT 1;
  IF NOT EXISTS (SELECT 1 FROM nevora_time_correction_leaf_adjustments WHERE id=target.id)
     OR target_event.event_kind IS DISTINCT FROM 'APPROVED'
     OR target_event.adjustment_id IS DISTINCT FROM target.id
     OR target_event.revision IS DISTINCT FROM p_expected_base_revision THEN
    RAISE EXCEPTION 'nevora_correction_STALE_SOURCE';
  END IF;

  -- Preserve the existing pending-proposal overlap protection, including adjacency.
  IF EXISTS (
    SELECT 1 FROM nevora_pending_time_corrections pending
    WHERE pending.employee_id=p_employee AND pending.kind='MISSING_ENTRY'
      AND (pending.proposal->>'startAt')::timestamptz < p_proposed_end
      AND p_proposed_start < (pending.proposal->>'endAt')::timestamptz
  ) THEN RAISE EXCEPTION 'nevora_correction_PENDING_EXISTS'; END IF;

  source_data=jsonb_build_object(
    'recorded',false,'locationId',target.location_id,
    'targetAdjustmentId',target.id,'targetRequestId',target.request_id,
    'targetRevision',target_event.revision,
    'startAt',target.effective_start_at,'endAt',target.effective_end_at
  );
  INSERT INTO time_correction_requests(
    id,workspace_id,employee_id,requested_by_employee_id,kind,time_entry_id,break_entry_id,
    location_id,source_revision,source_snapshot,base_adjustment_id,proposal,reason,request_hash
  ) VALUES (
    p_request,p_workspace,p_employee,p_actor,'MISSING_ENTRY',NULL,NULL,
    target.location_id,source_rev,source_data,target.id,
    jsonb_build_object('startAt',p_proposed_start,'endAt',p_proposed_end),p_reason,p_request_hash
  );
  result_data=jsonb_build_object('status','pending','operationId',p_request,'requestId',p_request,'revision',1);
  INSERT INTO time_correction_events(id,request_id,revision,event_kind,actor_employee_id,operation_hash,result)
    VALUES(p_request,p_request,1,'REQUESTED',p_actor,p_request_hash,result_data);
  RETURN result_data;
END;
$$;

-- Review retains the original authentication, receipt, decision and locking protocol.
CREATE OR REPLACE FUNCTION nevora_review_time_correction(
  p_operation uuid,
  p_request uuid,
  p_actor text,
  p_expected_revision integer,
  p_decision text,
  p_note text,
  p_operation_hash text
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
  saved time_correction_events%ROWTYPE;
  request_row time_correction_requests%ROWTYPE;
  entry_row time_entries%ROWTYPE;
  break_row break_entries%ROWTYPE;
  current_revision integer;
  current_kind text;
  current_base uuid;
  target time_correction_adjustments%ROWTYPE;
  target_event time_correction_events%ROWTYPE;
  adjustment_id uuid;
  proposed_start timestamptz;
  proposed_end timestamptz;
  parent_start timestamptz;
  parent_end timestamptz;
  result_data jsonb;
BEGIN
  SELECT * INTO saved FROM time_correction_events WHERE id=p_operation;
  IF FOUND THEN
    IF saved.actor_employee_id<>p_actor OR saved.operation_hash<>p_operation_hash THEN
      RAISE EXCEPTION 'nevora_correction_COMMAND_REUSED';
    END IF;
    RETURN saved.result;
  END IF;

  SELECT * INTO request_row
  FROM time_correction_requests WHERE id=p_request
  FOR UPDATE;
  IF request_row.id IS NULL THEN RAISE EXCEPTION 'nevora_correction_NOT_FOUND'; END IF;

  PERFORM id FROM employees
  WHERE id=ANY(ARRAY[p_actor,request_row.employee_id])
  ORDER BY id FOR UPDATE;

  IF p_actor=request_row.employee_id THEN
    RAISE EXCEPTION 'nevora_correction_SELF_REVIEW';
  END IF;
  PERFORM e.id
  FROM employees e JOIN locations home ON home.id=e.primary_location_id
  WHERE e.id=p_actor AND e.active AND e.role IN ('OWNER','MANAGER')
    AND home.workspace_id=request_row.workspace_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'nevora_correction_AUTH_REQUIRED'; END IF;

  SELECT revision,event_kind INTO current_revision,current_kind
  FROM time_correction_events WHERE request_id=p_request
  ORDER BY revision DESC LIMIT 1;
  IF current_revision IS NULL OR current_revision<>p_expected_revision
     OR current_kind IS DISTINCT FROM 'REQUESTED' THEN
    RAISE EXCEPTION 'nevora_correction_STALE_STATE';
  END IF;
  IF p_decision NOT IN ('APPROVE','REJECT')
     OR p_expected_revision<1
     OR p_operation_hash !~ '^[a-f0-9]{64}$'
     OR (p_note IS NOT NULL AND (
       p_note<>btrim(p_note) OR char_length(p_note) NOT BETWEEN 1 AND 500 OR p_note ~ '[[:cntrl:]]'
     )) THEN RAISE EXCEPTION 'nevora_correction_INVALID'; END IF;

  IF p_decision='REJECT' THEN
    result_data=jsonb_build_object(
      'status','rejected','operationId',p_operation,'requestId',p_request,
      'revision',current_revision+1
    );
    INSERT INTO time_correction_events(
      id,request_id,revision,event_kind,actor_employee_id,operation_hash,decision_note,result
    ) VALUES (
      p_operation,p_request,current_revision+1,'REJECTED',p_actor,p_operation_hash,p_note,result_data
    );
    RETURN result_data;
  END IF;

  INSERT INTO clocker_employee_clock_state(employee_id) VALUES(request_row.employee_id)
    ON CONFLICT DO NOTHING;
  PERFORM employee_id FROM clocker_employee_clock_state
  WHERE employee_id=request_row.employee_id FOR UPDATE;

  proposed_start=(request_row.proposal->>'startAt')::timestamptz;
  proposed_end=(request_row.proposal->>'endAt')::timestamptz;
  IF proposed_start>=proposed_end OR proposed_end>clock_timestamp() THEN
    RAISE EXCEPTION 'nevora_correction_INVALID_INTERVAL';
  END IF;

  IF request_row.kind='ENTRY_BOUNDARY' THEN
    SELECT t.* INTO entry_row
    FROM time_entries t WHERE t.id=request_row.time_entry_id
      AND t.employee_id=request_row.employee_id
    FOR UPDATE;
    IF entry_row.id IS NULL OR entry_row.clock_out_at IS NULL OR entry_row.status<>'CLOCKED_OUT' THEN
      RAISE EXCEPTION 'nevora_correction_LIVE_STATE';
    END IF;
    IF entry_row.version<>(request_row.source_snapshot->>'sourceVersion')::integer THEN
      RAISE EXCEPTION 'nevora_correction_STALE_SOURCE';
    END IF;
    SELECT a.id INTO current_base FROM nevora_time_correction_leaf_adjustments a
      WHERE a.kind='ENTRY_BOUNDARY' AND a.time_entry_id=entry_row.id;
    IF current_base IS DISTINCT FROM request_row.base_adjustment_id THEN
      RAISE EXCEPTION 'nevora_correction_STALE_SOURCE';
    END IF;
    IF EXISTS (
      SELECT 1 FROM nevora_effective_break_entries child
      WHERE child.time_entry_id=entry_row.id
        AND (child.end_at IS NULL OR child.start_at>=child.end_at
          OR child.start_at<proposed_start OR child.end_at>proposed_end)
    ) THEN RAISE EXCEPTION 'nevora_correction_INVALID_INTERVAL'; END IF;
    IF EXISTS (
      SELECT 1 FROM nevora_effective_time_entries other
      WHERE other.employee_id=request_row.employee_id
        AND other.time_entry_id IS DISTINCT FROM request_row.time_entry_id
        AND proposed_start<COALESCE(other.end_at,'infinity'::timestamptz)
        AND other.start_at<proposed_end
    ) THEN RAISE EXCEPTION 'nevora_correction_OVERLAP'; END IF;
  ELSIF request_row.kind='BREAK_BOUNDARY' THEN
    SELECT t.* INTO entry_row
    FROM time_entries t WHERE t.id=request_row.time_entry_id
      AND t.employee_id=request_row.employee_id
    FOR UPDATE;
    SELECT b.* INTO break_row
    FROM break_entries b WHERE b.id=request_row.break_entry_id
      AND b.time_entry_id=request_row.time_entry_id
    FOR UPDATE;
    IF entry_row.id IS NULL OR entry_row.clock_out_at IS NULL
       OR break_row.id IS NULL OR break_row.break_end_at IS NULL THEN
      RAISE EXCEPTION 'nevora_correction_LIVE_STATE';
    END IF;
    IF entry_row.version<>(request_row.source_snapshot->>'entryVersion')::integer
       OR break_row.version<>(request_row.source_snapshot->>'sourceVersion')::integer THEN
      RAISE EXCEPTION 'nevora_correction_STALE_SOURCE';
    END IF;
    SELECT a.id INTO current_base FROM nevora_time_correction_leaf_adjustments a
      WHERE a.kind='BREAK_BOUNDARY' AND a.break_entry_id=break_row.id;
    IF current_base IS DISTINCT FROM request_row.base_adjustment_id THEN
      RAISE EXCEPTION 'nevora_correction_STALE_SOURCE';
    END IF;
    SELECT start_at,end_at INTO parent_start,parent_end
    FROM nevora_effective_time_entries
    WHERE employee_id=request_row.employee_id AND time_entry_id=request_row.time_entry_id;
    IF parent_start IS NULL OR parent_end IS NULL
       OR proposed_start<parent_start OR proposed_end>parent_end THEN
      RAISE EXCEPTION 'nevora_correction_INVALID_INTERVAL';
    END IF;
    IF EXISTS (
      SELECT 1 FROM nevora_effective_break_entries other
      WHERE other.time_entry_id=request_row.time_entry_id
        AND other.break_entry_id<>request_row.break_entry_id
        AND proposed_start<COALESCE(other.end_at,'infinity'::timestamptz)
        AND other.start_at<proposed_end
    ) THEN RAISE EXCEPTION 'nevora_correction_OVERLAP'; END IF;
  ELSE
    IF request_row.base_adjustment_id IS NOT NULL THEN
      SELECT * INTO target FROM nevora_time_correction_leaf_adjustments
        WHERE id=request_row.base_adjustment_id AND kind='MISSING_ENTRY'
          AND workspace_id=request_row.workspace_id AND employee_id=request_row.employee_id
          AND location_id=request_row.location_id;
      IF target.id IS NULL THEN RAISE EXCEPTION 'nevora_correction_STALE_SOURCE'; END IF;
      SELECT * INTO target_event FROM time_correction_events
        WHERE request_id=target.request_id ORDER BY revision DESC LIMIT 1;
      IF target_event.event_kind IS DISTINCT FROM 'APPROVED'
         OR target_event.adjustment_id IS DISTINCT FROM target.id
         OR target_event.revision IS DISTINCT FROM (request_row.source_snapshot->>'targetRevision')::integer
         OR target.id IS DISTINCT FROM (request_row.source_snapshot->>'targetAdjustmentId')::uuid
         OR target.request_id IS DISTINCT FROM (request_row.source_snapshot->>'targetRequestId')::uuid THEN
        RAISE EXCEPTION 'nevora_correction_STALE_SOURCE';
      END IF;
    END IF;
    IF EXISTS (
      SELECT 1 FROM nevora_effective_time_entries other
      WHERE other.employee_id=request_row.employee_id
        -- Exclude only the independently revalidated explicit target; NULL excludes nothing.
        AND (request_row.base_adjustment_id IS NULL OR other.adjustment_id IS DISTINCT FROM request_row.base_adjustment_id)
        AND proposed_start<COALESCE(other.end_at,'infinity'::timestamptz)
        AND other.start_at<proposed_end
    ) THEN RAISE EXCEPTION 'nevora_correction_OVERLAP'; END IF;
  END IF;

  adjustment_id=p_operation;
  INSERT INTO time_correction_adjustments(
    id,request_id,workspace_id,employee_id,kind,time_entry_id,break_entry_id,location_id,
    effective_start_at,effective_end_at,source_revision,source_snapshot,
    supersedes_adjustment_id,created_by
  ) VALUES (
    adjustment_id,request_row.id,request_row.workspace_id,request_row.employee_id,request_row.kind,
    request_row.time_entry_id,request_row.break_entry_id,request_row.location_id,
    proposed_start,proposed_end,request_row.source_revision,request_row.source_snapshot,
    request_row.base_adjustment_id,p_actor
  );

  result_data=jsonb_build_object(
    'status','approved','operationId',p_operation,'requestId',p_request,
    'revision',current_revision+1,'adjustmentId',adjustment_id
  );
  INSERT INTO time_correction_events(
    id,request_id,revision,event_kind,actor_employee_id,operation_hash,decision_note,adjustment_id,result
  ) VALUES (
    p_operation,p_request,current_revision+1,'APPROVED',p_actor,p_operation_hash,
    p_note,adjustment_id,result_data
  );
  RETURN result_data;
END;
$$;

COMMIT;
