BEGIN;

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
