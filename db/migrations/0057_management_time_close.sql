BEGIN;

-- A management attestation is distinct from a tablet's recorded punch receipt.
CREATE TABLE public.management_time_closes (
 operation_id uuid PRIMARY KEY,
 workspace_id text NOT NULL REFERENCES public.workspaces(id),
 employee_id text NOT NULL REFERENCES public.employees(id),
 actor_employee_id text NOT NULL REFERENCES public.employees(id),
 time_entry_id text NOT NULL REFERENCES public.time_entries(id),
 location_id text NOT NULL REFERENCES public.locations(id),
 command_hash text NOT NULL CHECK(command_hash ~ '^[a-f0-9]{64}$'),
 source_hash text NOT NULL CHECK(source_hash ~ '^[a-f0-9]{32}$'),
 closed_at timestamptz NOT NULL CHECK(isfinite(closed_at)),
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 reason text NOT NULL CHECK(char_length(reason) BETWEEN 1 AND 500 AND reason=btrim(reason) AND reason !~ '[[:cntrl:]]'),
 before_snapshot jsonb NOT NULL CHECK(jsonb_typeof(before_snapshot)='object'),
 after_snapshot jsonb NOT NULL CHECK(jsonb_typeof(after_snapshot)='object'),
 receipt jsonb NOT NULL CHECK(jsonb_typeof(receipt)='object'),
 CHECK(actor_employee_id<>employee_id)
);
CREATE INDEX management_time_closes_entry ON public.management_time_closes(workspace_id,time_entry_id,recorded_at,operation_id);
CREATE TRIGGER management_time_closes_immutable BEFORE UPDATE OR DELETE ON public.management_time_closes
 FOR EACH ROW EXECUTE FUNCTION public.nevora_immutable_ledger();
CREATE TRIGGER management_time_closes_no_truncate BEFORE TRUNCATE ON public.management_time_closes
 FOR EACH STATEMENT EXECUTE FUNCTION public.nevora_immutable_ledger();

-- VOLATILE is intentional: the second capture must see writes made inside the
-- same outer close statement. This internal evidence is never a public DTO.
CREATE FUNCTION public.nevora_management_close_source(p_workspace text,p_entry text) RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $source$
 SELECT jsonb_build_object('entry',to_jsonb(t),'primaryLocationId',e.primary_location_id,
  'employeeActive',e.active,'locationActive',l.active,'deviceActive',d.active,
  'clockRevision',COALESCE(s.revision,0),'breaks',COALESCE((
   SELECT jsonb_agg(to_jsonb(b) ORDER BY b.id) FROM public.break_entries b WHERE b.time_entry_id=t.id),'[]'::jsonb))
 FROM public.time_entries t JOIN public.employees e ON e.id=t.employee_id
 JOIN public.locations l ON l.id=t.location_id JOIN public.locations p ON p.id=e.primary_location_id
 JOIN public.clocker_devices d ON d.id=t.device_id AND d.location_id=t.location_id
 LEFT JOIN public.clocker_employee_clock_state s ON s.employee_id=t.employee_id
 WHERE t.id=p_entry AND l.workspace_id=p_workspace AND p.workspace_id=p_workspace
$source$;

CREATE FUNCTION public.nevora_management_close(p_workspace text,p_actor text,p_employee text,p_location text,p_primary_location text,
 p_entry text,p_operation uuid,p_source_hash text,p_closed_at timestamptz,p_reason text,p_command_hash text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public,pg_temp AS $close$
DECLARE e public.time_entries%ROWTYPE; saved public.management_time_closes%ROWTYPE;
 before_state jsonb; after_state jsonb; result jsonb; performed timestamptz; ended_break text;
BEGIN
 IF p_operation IS NULL OR p_source_hash IS NULL OR p_source_hash !~ '^[a-f0-9]{32}$'
  OR p_command_hash IS NULL OR p_command_hash !~ '^[a-f0-9]{64}$' OR p_closed_at IS NULL OR NOT isfinite(p_closed_at)
  OR p_reason IS NULL OR char_length(p_reason) NOT BETWEEN 1 AND 500 OR p_reason<>btrim(p_reason) OR p_reason ~ '[[:cntrl:]]'
 THEN RAISE EXCEPTION 'management_close_INVALID'; END IF;
 -- Caller uses this same employee order before its session/scope guards.
 PERFORM id FROM public.employees WHERE id=ANY(ARRAY[p_actor,p_employee]) ORDER BY id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.employees a JOIN public.locations l ON l.id=a.primary_location_id
   JOIN public.workspaces w ON w.id=l.workspace_id WHERE a.id=p_actor AND a.active AND a.role IN('OWNER','MANAGER')
   AND w.id=p_workspace AND w.singleton AND w.active) THEN RAISE EXCEPTION 'management_close_AUTH_REQUIRED'; END IF;
 -- Replay must validate the same current target footprint after waiting for the
 -- employee lock. A moved worker cannot disclose an old receipt under old scope.
 SELECT * INTO e FROM public.time_entries WHERE id=p_entry FOR UPDATE;
 IF e.id IS NULL OR e.employee_id<>p_employee OR e.location_id<>p_location
  OR NOT EXISTS(SELECT 1 FROM public.employees x JOIN public.locations l ON l.id=x.primary_location_id
   WHERE x.id=p_employee AND x.primary_location_id=p_primary_location AND l.workspace_id=p_workspace)
 THEN RAISE EXCEPTION 'management_close_STALE_SOURCE'; END IF;
 SELECT * INTO saved FROM public.management_time_closes WHERE operation_id=p_operation;
 IF FOUND THEN
  IF saved.workspace_id<>p_workspace OR saved.actor_employee_id<>p_actor OR saved.employee_id<>p_employee
   OR saved.time_entry_id<>p_entry OR saved.command_hash<>p_command_hash THEN RAISE EXCEPTION 'management_close_COMMAND_REUSED'; END IF;
  RETURN saved.receipt;
 END IF;
 IF p_actor=p_employee THEN RAISE EXCEPTION 'management_close_SELF_REVIEW'; END IF;
 INSERT INTO public.clocker_employee_clock_state(employee_id) VALUES(p_employee) ON CONFLICT DO NOTHING;
 PERFORM employee_id FROM public.clocker_employee_clock_state WHERE employee_id=p_employee FOR UPDATE;
 PERFORM id FROM public.break_entries WHERE time_entry_id=e.id ORDER BY id FOR UPDATE;
 before_state=public.nevora_management_close_source(p_workspace,p_entry);
 IF before_state IS NULL OR md5(before_state::text)<>p_source_hash OR e.clock_out_at IS NOT NULL
 THEN RAISE EXCEPTION 'management_close_STALE_SOURCE'; END IF;
 -- Keep existing raw-state integrity; never manufacture a missing break or fix
 -- historical data as a side effect of closing this one open entry.
 PERFORM public.clocker_punch_snapshot(p_employee);
 SELECT id INTO ended_break FROM public.break_entries WHERE time_entry_id=e.id AND break_end_at IS NULL;
 IF (e.status='ON_BREAK') IS DISTINCT FROM (ended_break IS NOT NULL) THEN RAISE EXCEPTION 'management_close_INTEGRITY'; END IF;
 performed=clock_timestamp();
 IF p_closed_at<=e.clock_in_at OR p_closed_at>performed OR EXISTS(
  SELECT 1 FROM public.break_entries b WHERE b.time_entry_id=e.id
   AND(b.break_start_at<e.clock_in_at OR b.break_start_at>p_closed_at OR b.break_end_at>p_closed_at))
 THEN RAISE EXCEPTION 'management_close_INVALID_INTERVAL'; END IF;
 IF EXISTS(SELECT 1 FROM public.nevora_effective_time_entries v WHERE v.employee_id=p_employee
   AND v.time_entry_id IS DISTINCT FROM e.id AND v.start_at<p_closed_at AND COALESCE(v.end_at,'infinity'::timestamptz)>e.clock_in_at)
 THEN RAISE EXCEPTION 'management_close_OVERLAP'; END IF;
 -- Finalization is also enforced by the unchanged raw-entry/break interlocks.
 IF EXISTS(SELECT 1 FROM public.nevora_timecard_latest c JOIN public.workspaces w ON w.id=c.workspace_id
   WHERE c.workspace_id=p_workspace AND c.employee_id=p_employee AND c.action='FINALIZE'
    AND e.clock_in_at<(c.end_date+1)::timestamp AT TIME ZONE w.time_zone
    AND p_closed_at>c.start_date::timestamp AT TIME ZONE w.time_zone)
 THEN RAISE EXCEPTION 'management_close_FINALIZED_PERIOD'; END IF;
 IF EXISTS(SELECT 1 FROM public.payroll_runs r JOIN public.payroll_runs_current c ON c.run_id=r.id AND c.workspace_id=r.workspace_id
   JOIN public.workspaces w ON w.id=r.workspace_id WHERE r.workspace_id=p_workspace AND c.payload->>'status'='APPROVED'
    AND e.clock_in_at<(r.end_date+1)::timestamp AT TIME ZONE w.time_zone
    AND p_closed_at>r.start_date::timestamp AT TIME ZONE w.time_zone
    AND NOT EXISTS(SELECT 1 FROM public.payroll_runs child WHERE child.workspace_id=r.workspace_id AND child.correction_of=r.id)
    AND(EXISTS(SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(c.payload->'rows')='array' THEN c.payload->'rows' ELSE '[]'::jsonb END) x WHERE x->>'employeeId'=p_employee)
     OR EXISTS(SELECT 1 FROM jsonb_array_elements(CASE WHEN jsonb_typeof(c.payload->'nativeCalculation'->'employees')='array' THEN c.payload->'nativeCalculation'->'employees' ELSE '[]'::jsonb END) x WHERE x->>'employeeId'=p_employee)))
 THEN RAISE EXCEPTION 'management_close_PAYROLL_APPROVED'; END IF;
 IF ended_break IS NOT NULL THEN
  UPDATE public.break_entries SET break_end_at=p_closed_at,version=version+1 WHERE id=ended_break;
  IF NOT FOUND THEN RAISE EXCEPTION 'management_close_INTEGRITY'; END IF;
 END IF;
 UPDATE public.time_entries SET status='CLOCKED_OUT',clock_out_at=p_closed_at,version=version+1,updated_at=performed WHERE id=e.id;
 IF NOT FOUND THEN RAISE EXCEPTION 'management_close_INTEGRITY'; END IF;
 UPDATE public.clocker_employee_clock_state SET revision=revision+1 WHERE employee_id=p_employee;
 IF NOT FOUND THEN RAISE EXCEPTION 'management_close_INTEGRITY'; END IF;
 after_state=public.nevora_management_close_source(p_workspace,p_entry);
 result=jsonb_build_object('status','closed','operationId',p_operation,'timeEntryId',p_entry,'closedAt',p_closed_at,
  'recordedAt',performed,'entryVersion',(after_state->'entry'->>'version')::integer,
  'clockRevision',(after_state->>'clockRevision')::integer,'endedBreakId',ended_break);
 INSERT INTO public.management_time_closes(operation_id,workspace_id,employee_id,actor_employee_id,time_entry_id,location_id,
  command_hash,source_hash,closed_at,recorded_at,reason,before_snapshot,after_snapshot,receipt)
 VALUES(p_operation,p_workspace,p_employee,p_actor,p_entry,p_location,p_command_hash,p_source_hash,p_closed_at,performed,p_reason,before_state,after_state,result);
 RETURN result;
END;
$close$;

REVOKE ALL ON TABLE public.management_time_closes FROM PUBLIC;
REVOKE ALL ON FUNCTION public.nevora_management_close_source(text,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.nevora_management_close(text,text,text,text,text,text,uuid,text,timestamptz,text,text) FROM PUBLIC;
-- Existing isolated APP roles receive only the management surface; no WORKER
-- capability or shared credential is added. Fresh bootstrap applies the same grants.
DO $grants$
DECLARE app_role text;
BEGIN
 FOR app_role IN SELECT login_role FROM public.onboarding_runtime_roles WHERE kind='APP' LOOP
  EXECUTE format('GRANT SELECT,INSERT ON public.management_time_closes TO %I',app_role);
  EXECUTE format('REVOKE UPDATE,DELETE,TRUNCATE ON public.management_time_closes FROM %I',app_role);
  EXECUTE format('GRANT EXECUTE ON FUNCTION public.nevora_management_close_source(text,text), public.nevora_management_close(text,text,text,text,text,text,uuid,text,timestamptz,text,text) TO %I',app_role);
 END LOOP;
END;
$grants$;
COMMIT;
