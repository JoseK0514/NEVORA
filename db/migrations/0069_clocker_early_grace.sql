BEGIN;
-- Owner-configured early clock-in grace for Clocker schedule matching. No row means 0 minutes: strict matching,
-- exactly as before this migration. Additive: two new tables, their guard/audit triggers, and a replacement of
-- clocker_resolve_schedule_context with the same signature. No existing row, constraint or captured context changes.
CREATE TABLE clocker_schedule_match_policy (
 workspace_id text PRIMARY KEY REFERENCES workspaces(id),
 version integer NOT NULL CHECK (version>0),
 early_clock_in_grace_minutes integer NOT NULL CHECK (early_clock_in_grace_minutes BETWEEN 0 AND 30),
 updated_by text NOT NULL REFERENCES employees(id),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
-- One immutable row per saved version: who changed the grace, when, and from what to what.
CREATE TABLE clocker_schedule_match_policy_revisions (
 workspace_id text NOT NULL REFERENCES workspaces(id),
 version integer NOT NULL CHECK (version>0),
 actor_employee_id text NOT NULL REFERENCES employees(id),
 previous_grace_minutes integer NOT NULL CHECK (previous_grace_minutes BETWEEN 0 AND 30),
 early_clock_in_grace_minutes integer NOT NULL CHECK (early_clock_in_grace_minutes BETWEEN 0 AND 30),
 occurred_at timestamptz NOT NULL,
 PRIMARY KEY (workspace_id,version)
);

CREATE FUNCTION clocker_schedule_match_policy_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 -- Deleting or truncating would reset the grace to 0 without a revision; a change is a new version instead.
 IF TG_OP IN ('DELETE','TRUNCATE') THEN
  RAISE EXCEPTION 'clocker_grace_IMMUTABLE' USING ERRCODE='23514';
 END IF;
 IF (TG_OP='INSERT' AND NEW.version<>1)
    OR (TG_OP='UPDATE' AND (NEW.workspace_id IS DISTINCT FROM OLD.workspace_id OR NEW.version<>OLD.version+1)) THEN
  RAISE EXCEPTION 'clocker_grace_STALE';
 END IF;
 -- Schema backstop only: the application also requires the actor's current Owner session in the same transaction.
 IF NOT EXISTS(SELECT 1 FROM employees e JOIN locations l ON l.id=e.primary_location_id
   WHERE e.id=NEW.updated_by AND e.active AND e.role='OWNER' AND l.workspace_id=NEW.workspace_id) THEN
  RAISE EXCEPTION 'clocker_grace_FORBIDDEN';
 END IF;
 NEW.updated_at=clock_timestamp();
 RETURN NEW;
END;
$$;
CREATE TRIGGER clocker_schedule_match_policy_guard BEFORE INSERT OR UPDATE OR DELETE ON clocker_schedule_match_policy
 FOR EACH ROW EXECUTE FUNCTION clocker_schedule_match_policy_guard();
CREATE TRIGGER clocker_schedule_match_policy_no_truncate BEFORE TRUNCATE ON clocker_schedule_match_policy
 FOR EACH STATEMENT EXECUTE FUNCTION clocker_schedule_match_policy_guard();

CREATE FUNCTION clocker_schedule_match_policy_audit() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO clocker_schedule_match_policy_revisions(workspace_id,version,actor_employee_id,previous_grace_minutes,
  early_clock_in_grace_minutes,occurred_at)
 VALUES(NEW.workspace_id,NEW.version,NEW.updated_by,CASE WHEN TG_OP='UPDATE' THEN OLD.early_clock_in_grace_minutes ELSE 0 END,
  NEW.early_clock_in_grace_minutes,NEW.updated_at);
 RETURN NULL;
END;
$$;
CREATE TRIGGER clocker_schedule_match_policy_audit AFTER INSERT OR UPDATE ON clocker_schedule_match_policy
 FOR EACH ROW EXECUTE FUNCTION clocker_schedule_match_policy_audit();
CREATE TRIGGER clocker_schedule_match_policy_revisions_append_only BEFORE UPDATE OR DELETE ON clocker_schedule_match_policy_revisions
 FOR EACH ROW EXECUTE FUNCTION clocker_device_event_append_only();
CREATE TRIGGER clocker_schedule_match_policy_revisions_no_truncate BEFORE TRUNCATE ON clocker_schedule_match_policy_revisions
 FOR EACH STATEMENT EXECUTE FUNCTION clocker_schedule_match_policy_guard();

-- Same signature and checks as 0015, plus the grace. Each candidate covers [startAt - grace, endAt); grace 0 (or no
-- earlyGraceMinutes in the prepared capture) is the strict half-open match and returns exactly the 0015 context.
-- A grace above 0 must equal the Owner's persisted setting when the row is written, so a stale or forged value can
-- never widen matching; a mismatch rejects the punch as SCHEDULE_CHANGED for a same-command retry. The context keeps
-- earlyGraceMinutes only when it is above 0. TypeScript twin: captureScheduleContext (src/lib/clocker/schedule-candidates.ts).
CREATE OR REPLACE FUNCTION clocker_resolve_schedule_context(
 prepared jsonb,p_employee text,p_location text,p_at timestamptz
) RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE
 candidate jsonb; selected jsonb; candidate_count integer:=0; uncertain_count integer:=0;
 status text; reason text; location_workspace text; configured_zone text;
 grace integer:=0; stored_grace integer; result jsonb;
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
 IF prepared ? 'earlyGraceMinutes' THEN
  IF jsonb_typeof(prepared->'earlyGraceMinutes') IS DISTINCT FROM 'number'
    OR prepared->>'earlyGraceMinutes' !~ '^(0|[1-9][0-9]?)$' THEN
   RAISE EXCEPTION 'clocker_punch_SCHEDULE_CHANGED';
  END IF;
  grace=(prepared->>'earlyGraceMinutes')::integer;
  IF grace>30 THEN RAISE EXCEPTION 'clocker_punch_SCHEDULE_CHANGED'; END IF;
  IF grace>0 THEN
   SELECT p.early_clock_in_grace_minutes INTO stored_grace
   FROM clocker_schedule_match_policy p WHERE p.workspace_id=location_workspace;
   IF stored_grace IS DISTINCT FROM grace THEN RAISE EXCEPTION 'clocker_punch_SCHEDULE_CHANGED'; END IF;
  END IF;
 END IF;
 IF p_at IS NULL OR p_at < (prepared->>'windowStartAt')::timestamptz
    OR p_at >= (prepared->>'windowEndAt')::timestamptz THEN
  RAISE EXCEPTION 'clocker_punch_SCHEDULE_CHANGED';
 END IF;
 FOR candidate IN SELECT value FROM jsonb_array_elements(prepared->'candidates') LOOP
  IF p_at >= (candidate->>'startAt')::timestamptz - make_interval(mins=>grace)
     AND p_at < (candidate->>'endAt')::timestamptz THEN
   candidate_count=candidate_count+1;
   IF (candidate->>'uncertain')::boolean THEN uncertain_count=uncertain_count+1;
   ELSIF selected IS NULL THEN selected=candidate; END IF;
  END IF;
 END LOOP;
 IF candidate_count=0 THEN status='UNMATCHED';reason='NO_MATCH';selected=NULL;
 ELSIF uncertain_count>0 THEN status='AMBIGUOUS';reason='UNRESOLVED_LOCAL_TIME';selected=NULL;
 ELSIF candidate_count>1 THEN status='AMBIGUOUS';reason='OVERLAPPING_SHIFTS';selected=NULL;
 ELSE status='MATCHED';reason=NULL; END IF;
 result=jsonb_build_object('version',1,'status',status,'timeZone',prepared->>'timeZone',
  'capturedAt',p_at,'candidateCount',candidate_count,'reviewedRevisionIds',prepared->'reviewedRevisionIds',
  'reason',reason,'match',CASE WHEN selected IS NULL THEN 'null'::jsonb ELSE jsonb_build_object(
   'revisionId',selected->>'revisionId','revisionNumber',(selected->>'revisionNumber')::integer,
   'publishedShiftId',selected->>'publishedShiftId','sourceShiftId',selected->'sourceShiftId',
   'scheduleId',selected->>'scheduleId','positionId',selected->'positionId','positionName',selected->'positionName'
  ) END);
 IF grace>0 THEN result=result||jsonb_build_object('earlyGraceMinutes',grace); END IF;
 RETURN result;
END;
$$;
-- An isolated workspace bootstrapped before this migration: its APP role reads and saves the setting (the triggers
-- write the revision as that role). A fresh bootstrap grants every business table. Without an APP role this is a no-op.
DO $clocker_grace_app_upgrade$
DECLARE app_role text;
BEGIN
 SELECT login_role::text INTO app_role FROM public.onboarding_runtime_roles WHERE kind='APP';
 IF FOUND THEN
  IF app_role !~ '^nv_app_[a-f0-9]{24}$' OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=app_role)
  THEN RAISE EXCEPTION 'clocker_grace_app_role_invalid'; END IF;
  EXECUTE format('GRANT SELECT,INSERT,UPDATE ON public.clocker_schedule_match_policy TO %I',app_role);
  EXECUTE format('GRANT SELECT,INSERT ON public.clocker_schedule_match_policy_revisions TO %I',app_role);
 END IF;
END
$clocker_grace_app_upgrade$;
COMMIT;
