BEGIN;
-- Phase C release: Immutable published schedule context captured at Clock In.
ALTER TABLE time_entries ADD COLUMN schedule_context jsonb;
ALTER TABLE time_entries ADD CONSTRAINT clocker_schedule_context_shape CHECK (
  schedule_context IS NULL OR COALESCE((
    jsonb_typeof(schedule_context)='object'
    AND schedule_context->>'version'='1'
    AND schedule_context->>'status' IN ('MATCHED','UNMATCHED','AMBIGUOUS')
    AND jsonb_typeof(schedule_context->'reviewedRevisionIds')='array'
    AND (schedule_context->>'candidateCount')::integer>=0
    AND NULLIF(schedule_context->>'timeZone','') IS NOT NULL
    AND (schedule_context->>'capturedAt')::timestamptz IS NOT NULL
    AND (
      (schedule_context->>'status'='MATCHED'
       AND jsonb_typeof(schedule_context->'match')='object'
       AND schedule_context->>'reason' IS NULL)
      OR
      (schedule_context->>'status'<>'MATCHED'
       AND schedule_context->'match'='null'::jsonb
       AND schedule_context->>'reason' IS NOT NULL)
    )
  ),false)
);

-- Bounded cross-week publication lookup by actual dated interval, not owning-week labels.
CREATE INDEX clocker_schedule_source_employee_date ON schedule_publication_revision_shifts(employee_id,location_id,date,revision_id);

CREATE FUNCTION clocker_resolve_schedule_context(
 prepared jsonb,p_employee text,p_location text,p_at timestamptz
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
 candidate jsonb; selected jsonb; candidate_count integer:=0; uncertain_count integer:=0;
 status text; reason text; location_workspace text; configured_zone text;
BEGIN
 SELECT w.id,w.time_zone INTO location_workspace,configured_zone
 FROM locations l JOIN workspaces w ON w.id=l.workspace_id WHERE l.id=p_location;
 IF prepared->'version' IS DISTINCT FROM '1'::jsonb
   OR prepared->>'employeeId' IS DISTINCT FROM p_employee
   OR prepared->>'locationId' IS DISTINCT FROM p_location
   OR prepared->>'workspaceId' IS DISTINCT FROM location_workspace
   OR prepared->>'timeZone' IS DISTINCT FROM configured_zone
   OR jsonb_typeof(prepared->'candidates') IS DISTINCT FROM 'array'
   OR jsonb_typeof(prepared->'reviewedRevisionIds') IS DISTINCT FROM 'array'
   OR NULLIF(prepared->>'windowStartAt','') IS NULL
   OR NULLIF(prepared->>'windowEndAt','') IS NULL THEN
  RAISE EXCEPTION 'clocker_punch_SCHEDULE_CHANGED';
 END IF;
 IF p_at IS NULL OR p_at < (prepared->>'windowStartAt')::timestamptz
    OR p_at >= (prepared->>'windowEndAt')::timestamptz THEN
  RAISE EXCEPTION 'clocker_punch_SCHEDULE_CHANGED';
 END IF;
 FOR candidate IN SELECT value FROM jsonb_array_elements(prepared->'candidates') LOOP
  IF p_at >= (candidate->>'startAt')::timestamptz AND p_at < (candidate->>'endAt')::timestamptz THEN
   candidate_count=candidate_count+1;
   IF (candidate->>'uncertain')::boolean THEN uncertain_count=uncertain_count+1;
   ELSIF selected IS NULL THEN selected=candidate; END IF;
  END IF;
 END LOOP;
 IF candidate_count=0 THEN status='UNMATCHED';reason='NO_MATCH';selected=NULL;
 ELSIF uncertain_count>0 THEN status='AMBIGUOUS';reason='UNRESOLVED_LOCAL_TIME';selected=NULL;
 ELSIF candidate_count>1 THEN status='AMBIGUOUS';reason='OVERLAPPING_SHIFTS';selected=NULL;
 ELSE status='MATCHED';reason=NULL; END IF;
 RETURN jsonb_build_object('version',1,'status',status,'timeZone',prepared->>'timeZone',
  'capturedAt',p_at,'candidateCount',candidate_count,'reviewedRevisionIds',prepared->'reviewedRevisionIds',
  'reason',reason,'match',CASE WHEN selected IS NULL THEN 'null'::jsonb ELSE jsonb_build_object(
   'revisionId',selected->>'revisionId','revisionNumber',(selected->>'revisionNumber')::integer,
   'publishedShiftId',selected->>'publishedShiftId','sourceShiftId',selected->'sourceShiftId',
   'scheduleId',selected->>'scheduleId','positionId',selected->'positionId','positionName',selected->'positionName'
  ) END);
END;
$$;

CREATE FUNCTION clocker_capture_schedule_context() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE raw text;
BEGIN
 raw=NULLIF(current_setting('nevora.clocker_schedule_capture',true),'');
 IF raw IS NULL THEN NEW.schedule_context=NULL;
 ELSE NEW.schedule_context=clocker_resolve_schedule_context(raw::jsonb,NEW.employee_id,NEW.location_id,NEW.clock_in_at);
 END IF;
 RETURN NEW;
END;
$$;

CREATE TRIGGER c6_capture_schedule_context
BEFORE INSERT ON time_entries
FOR EACH ROW EXECUTE FUNCTION clocker_capture_schedule_context();

CREATE FUNCTION clocker_preserve_schedule_context() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.schedule_context IS DISTINCT FROM OLD.schedule_context THEN
  RAISE EXCEPTION 'Recorded schedule context cannot be changed.'
    USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER clocker_preserve_schedule_context
BEFORE UPDATE ON time_entries
FOR EACH ROW EXECUTE FUNCTION clocker_preserve_schedule_context();

COMMIT;
