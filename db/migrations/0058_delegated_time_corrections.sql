BEGIN;

-- Jose approved delegated Owner/Manager requests with a different reviewer.
-- Distinct entry points preserve the existing self-only commands and adjustment rules.
CREATE FUNCTION nevora_submit_delegated_time_correction(
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
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
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
  IF p_request IS NULL OR p_request_hash IS NULL OR p_request_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'nevora_correction_INVALID';
  END IF;
  -- The service takes these ordered employee locks before live cookie/scope guards.
  PERFORM id FROM employees WHERE id=ANY(ARRAY[p_actor,p_employee]) ORDER BY id FOR UPDATE;
  IF p_actor IS NULL OR p_employee IS NULL OR p_actor=p_employee OR NOT EXISTS (
    SELECT 1 FROM employees a JOIN locations l ON l.id=a.primary_location_id
      JOIN workspaces w ON w.id=l.workspace_id
    WHERE a.id=p_actor AND a.active AND a.role IN ('OWNER','MANAGER')
      AND w.id=p_workspace AND w.singleton AND w.active
  ) OR NOT EXISTS (
    SELECT 1 FROM employees e JOIN locations l ON l.id=e.primary_location_id
    WHERE e.id=p_employee AND l.workspace_id=p_workspace
  ) THEN RAISE EXCEPTION 'nevora_correction_AUTH_REQUIRED'; END IF;
  SELECT * INTO existing FROM time_correction_requests WHERE id=p_request;
  IF FOUND THEN
    IF existing.workspace_id IS DISTINCT FROM p_workspace OR existing.employee_id<>p_employee OR existing.requested_by_employee_id<>p_actor
       OR existing.request_hash IS DISTINCT FROM p_request_hash THEN
      RAISE EXCEPTION 'nevora_correction_COMMAND_REUSED';
    END IF;
    SELECT result INTO result_data FROM time_correction_events WHERE id=p_request;
    IF result_data IS NULL THEN RAISE EXCEPTION 'nevora_correction_INTEGRITY'; END IF;
    RETURN result_data;
  END IF;

  IF p_actor IS NOT DISTINCT FROM p_employee
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
  WHERE e.id=p_employee AND home.workspace_id=p_workspace
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

CREATE FUNCTION nevora_submit_delegated_time_correction(
  p_request uuid, p_workspace text, p_employee text, p_actor text, p_kind text,
  p_time_entry text, p_break_entry text, p_location text,
  p_proposed_start timestamptz, p_proposed_end timestamptz,
  p_reason text, p_request_hash text, p_target_adjustment uuid, p_expected_base_revision integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE
  existing time_correction_requests%ROWTYPE;
  target time_correction_adjustments%ROWTYPE;
  target_event time_correction_events%ROWTYPE;
  source_rev integer;
  source_data jsonb;
  result_data jsonb;
BEGIN
  IF p_request IS NULL OR p_request_hash IS NULL OR p_request_hash !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'nevora_correction_INVALID';
  END IF;
  -- The service takes these ordered employee locks before live cookie/scope guards.
  PERFORM id FROM employees WHERE id=ANY(ARRAY[p_actor,p_employee]) ORDER BY id FOR UPDATE;
  IF p_actor IS NULL OR p_employee IS NULL OR p_actor=p_employee OR NOT EXISTS (
    SELECT 1 FROM employees a JOIN locations l ON l.id=a.primary_location_id
      JOIN workspaces w ON w.id=l.workspace_id
    WHERE a.id=p_actor AND a.active AND a.role IN ('OWNER','MANAGER')
      AND w.id=p_workspace AND w.singleton AND w.active
  ) OR NOT EXISTS (
    SELECT 1 FROM employees e JOIN locations l ON l.id=e.primary_location_id
    WHERE e.id=p_employee AND l.workspace_id=p_workspace
  ) THEN RAISE EXCEPTION 'nevora_correction_AUTH_REQUIRED'; END IF;
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

  IF p_actor IS NOT DISTINCT FROM p_employee OR p_kind IS DISTINCT FROM 'MISSING_ENTRY'
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
    WHERE e.id=p_employee AND home.workspace_id=p_workspace FOR UPDATE OF e;
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

-- Separation is enforced at the append-only ledger boundary, including direct
-- writes and every existing review function. No historical ledger is rewritten.
CREATE FUNCTION public.nevora_correction_separate_reviewer() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE r public.time_correction_requests%ROWTYPE;
BEGIN
 IF NEW.event_kind IN ('APPROVED','REJECTED') THEN
  SELECT * INTO r FROM public.time_correction_requests WHERE id=NEW.request_id FOR SHARE;
  IF NEW.actor_employee_id=r.employee_id OR NEW.actor_employee_id=r.requested_by_employee_id THEN
   RAISE EXCEPTION 'nevora_correction_SELF_REVIEW';
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER time_correction_separate_reviewer BEFORE INSERT ON public.time_correction_events
 FOR EACH ROW EXECUTE FUNCTION public.nevora_correction_separate_reviewer();
REVOKE ALL ON FUNCTION public.nevora_correction_separate_reviewer() FROM PUBLIC;

REVOKE ALL ON FUNCTION public.nevora_submit_delegated_time_correction(uuid,text,text,text,text,text,text,text,timestamptz,timestamptz,text,text), public.nevora_submit_delegated_time_correction(uuid,text,text,text,text,text,text,text,timestamptz,timestamptz,text,text,uuid,integer) FROM PUBLIC;
DO $grants$
DECLARE app_role text;
BEGIN
 FOR app_role IN SELECT login_role FROM public.onboarding_runtime_roles WHERE kind='APP' LOOP
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.nevora_submit_delegated_time_correction(uuid,text,text,text,text,text,text,text,timestamptz,timestamptz,text,text), public.nevora_submit_delegated_time_correction(uuid,text,text,text,text,text,text,text,timestamptz,timestamptz,text,text,uuid,integer) TO %I',app_role);
 END LOOP;
END;
$grants$;
COMMIT;
