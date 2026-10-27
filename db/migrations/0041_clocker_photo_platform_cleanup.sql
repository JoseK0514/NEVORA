BEGIN;
-- Platform custody is independent of human Owner sessions and time writers.
CREATE TABLE clocker_photo_platform_lifecycle (
 workspace_id text PRIMARY KEY REFERENCES workspaces(id),
 project_id text NOT NULL,
 branch_id text NOT NULL,
 worker_role_name text NOT NULL,
 enabled boolean NOT NULL DEFAULT false,
 cleanup_disclosure text NOT NULL CHECK(length(cleanup_disclosure) BETWEEN 20 AND 1200),
 backup_disclosure text NOT NULL CHECK(length(backup_disclosure) BETWEEN 20 AND 1200),
 attested_until timestamptz NOT NULL,
 last_success_at timestamptz
);
CREATE TABLE clocker_photo_cleanup_runs (
 workspace_id text NOT NULL REFERENCES workspaces(id),
 invocation_id text NOT NULL CHECK(length(invocation_id) BETWEEN 1 AND 200),
 completed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expired_count integer NOT NULL,
 orphan_count integer NOT NULL,
 backlog boolean NOT NULL,
 PRIMARY KEY(workspace_id,invocation_id)
);
REVOKE ALL ON clocker_photo_platform_lifecycle,clocker_photo_cleanup_runs FROM PUBLIC;
CREATE TRIGGER clocker_photo_cleanup_runs_append_only BEFORE UPDATE OR DELETE ON clocker_photo_cleanup_runs
 FOR EACH ROW EXECUTE FUNCTION clocker_device_event_append_only();

CREATE FUNCTION clocker_photo_platform_cleanup(p_workspace text,p_invocation text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE config public.clocker_photo_platform_lifecycle; prior public.clocker_photo_cleanup_runs;
 expired integer; orphaned integer; pending boolean;
BEGIN
 IF p_invocation IS NULL OR length(p_invocation) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'clocker_cleanup_invalid'; END IF;
 SELECT * INTO config FROM public.clocker_photo_platform_lifecycle WHERE workspace_id=p_workspace FOR UPDATE;
 IF NOT FOUND OR session_user<>config.worker_role_name OR NOT EXISTS(
  SELECT 1 FROM public.workspaces WHERE id=p_workspace AND singleton=true AND active=true
 ) THEN RAISE EXCEPTION 'clocker_cleanup_denied'; END IF;
 SELECT * INTO prior FROM public.clocker_photo_cleanup_runs WHERE workspace_id=p_workspace AND invocation_id=p_invocation;
 IF FOUND THEN RETURN jsonb_build_object('expired',prior.expired_count,'orphanFinalized',prior.orphan_count,'backlog',prior.backlog); END IF;
 PERFORM set_config('nevora.clocker.photo_workspace',p_workspace,true);
 WITH selected AS (
  SELECT device_id,command_id FROM public.clocker_punch_photos WHERE workspace_id=p_workspace AND expires_at<=clock_timestamp()
  AND state NOT IN ('expired','not_required','removed') ORDER BY expires_at,device_id,command_id LIMIT 500 FOR UPDATE SKIP LOCKED
 ), changed AS (
  UPDATE public.clocker_punch_photos p SET state='expired',jpeg=NULL,sha256=NULL,width=NULL,height=NULL FROM selected s
  WHERE p.workspace_id=p_workspace AND p.device_id=s.device_id AND p.command_id=s.command_id RETURNING 1
 ) SELECT count(*)::integer INTO expired FROM changed;
 WITH selected AS (
  SELECT device_id,command_id FROM public.clocker_punch_photos WHERE workspace_id=p_workspace AND state='pending'
  AND upload_deadline<=clock_timestamp() AND expires_at>clock_timestamp() ORDER BY upload_deadline,device_id,command_id LIMIT 500 FOR UPDATE SKIP LOCKED
 ), changed AS (
  UPDATE public.clocker_punch_photos p SET state='missing',failure_code='UPLOAD_FAILED' FROM selected s
  WHERE p.workspace_id=p_workspace AND p.device_id=s.device_id AND p.command_id=s.command_id RETURNING 1
 ) SELECT count(*)::integer INTO orphaned FROM changed;
 SELECT EXISTS(SELECT 1 FROM public.clocker_punch_photos WHERE workspace_id=p_workspace
  AND ((expires_at<=clock_timestamp() AND state NOT IN ('expired','not_required','removed'))
   OR (state='pending' AND upload_deadline<=clock_timestamp()))) INTO pending;
 INSERT INTO public.clocker_photo_cleanup_runs(workspace_id,invocation_id,expired_count,orphan_count,backlog)
 VALUES(p_workspace,p_invocation,expired,orphaned,pending);
 IF NOT pending THEN UPDATE public.clocker_photo_platform_lifecycle SET last_success_at=clock_timestamp() WHERE workspace_id=p_workspace; END IF;
 RETURN jsonb_build_object('expired',expired,'orphanFinalized',orphaned,'backlog',pending);
END;
$$;
REVOKE ALL ON FUNCTION clocker_photo_platform_cleanup(text,text) FROM PUBLIC;
COMMIT;
