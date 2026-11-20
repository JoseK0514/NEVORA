BEGIN;

-- Provision separately for an attested fictional staging workspace. The portal
-- can read the notice and readiness, but cannot enable a worker or attest it.
CREATE TABLE clocker_face_platform (
  workspace_id text PRIMARY KEY REFERENCES workspaces(id),
  project_id text NOT NULL,
  branch_id text NOT NULL,
  worker_role name NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  alerts_enabled boolean NOT NULL DEFAULT false,
  model_version text NOT NULL CHECK(length(model_version) BETWEEN 1 AND 120),
  notice_version integer NOT NULL CHECK(notice_version > 0),
  notice_en text NOT NULL CHECK(length(notice_en) BETWEEN 20 AND 4000),
  notice_es text NOT NULL CHECK(length(notice_es) BETWEEN 20 AND 4000),
  retention_days integer NOT NULL CHECK(retention_days BETWEEN 1 AND 366),
  attested_until timestamptz NOT NULL,
  last_success_at timestamptz
);

CREATE TABLE clocker_face_policies (
  workspace_id text PRIMARY KEY REFERENCES workspaces(id),
  version integer NOT NULL CHECK(version > 0),
  enabled_at timestamptz
);

CREATE TABLE clocker_face_enrollments (
  workspace_id text NOT NULL REFERENCES workspaces(id),
  employee_id text NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  revision integer NOT NULL CHECK(revision > 0),
  state text NOT NULL CHECK(state IN ('requested','captured','active','removed')),
  notice_version integer,
  expires_at timestamptz,
  approved_at timestamptz,
  reference_ciphertext text CHECK(length(reference_ciphertext) <= 710000),
  template_ciphertext text CHECK(length(template_ciphertext) <= 8192),
  template_model text CHECK(length(template_model) BETWEEN 1 AND 120),
  PRIMARY KEY(workspace_id,employee_id),
  CHECK((state IN ('captured','active')) = (reference_ciphertext IS NOT NULL)),
  CHECK((state IN ('captured','active')) = (notice_version IS NOT NULL)),
  CHECK((state = 'removed') = (expires_at IS NULL)),
  CHECK((state = 'active') = (approved_at IS NOT NULL)),
  CHECK((template_ciphertext IS NULL) = (template_model IS NULL)),
  CHECK(template_ciphertext IS NULL OR state = 'active')
);
CREATE INDEX clocker_face_enrollment_expiry ON clocker_face_enrollments(workspace_id,expires_at) WHERE expires_at IS NOT NULL;

CREATE TABLE clocker_face_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL REFERENCES workspaces(id),
  employee_id text,
  actor_id text,
  event text NOT NULL CHECK(event IN ('enabled','disabled','requested','consented','viewed','approved','removed','expired','deactivated')),
  version integer NOT NULL,
  notice_version integer,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TRIGGER clocker_face_events_append_only BEFORE UPDATE OR DELETE ON clocker_face_events
  FOR EACH ROW EXECUTE FUNCTION clocker_device_event_append_only();

CREATE TABLE clocker_face_checks (
  workspace_id text NOT NULL,
  device_id text NOT NULL,
  command_id uuid NOT NULL,
  policy_version integer NOT NULL,
  enrollment_revision integer NOT NULL,
  state text NOT NULL CHECK(state IN ('processing','match','mismatch','inconclusive','skipped','retry','failed')),
  attempt integer NOT NULL CHECK(attempt BETWEEN 1 AND 3),
  deliver_alerts boolean NOT NULL,
  lease_token uuid,
  lease_until timestamptz,
  finished_at timestamptz,
  PRIMARY KEY(workspace_id,device_id,command_id),
  FOREIGN KEY(workspace_id,device_id,command_id) REFERENCES clocker_punch_photos(workspace_id,device_id,command_id) ON DELETE CASCADE,
  CHECK((state IN ('processing','retry')) = (lease_until IS NOT NULL)),
  CHECK((state = 'processing') = (lease_token IS NOT NULL))
);
CREATE UNIQUE INDEX clocker_face_check_lease ON clocker_face_checks(lease_token) WHERE lease_token IS NOT NULL;
CREATE INDEX clocker_face_photo_candidates ON clocker_punch_photos(workspace_id,uploaded_at,device_id,command_id) WHERE state='stored';

-- Private inbox rows carry just the recipient and the reference to the existing
-- protected photo. Delivery workers for push/SMS/email never see these rows.
CREATE TABLE clocker_face_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  device_id text NOT NULL,
  command_id uuid NOT NULL,
  owner_id text NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  read_at timestamptz,
  UNIQUE(workspace_id,device_id,command_id,owner_id),
  FOREIGN KEY(workspace_id,device_id,command_id) REFERENCES clocker_face_checks(workspace_id,device_id,command_id) ON DELETE CASCADE
);
CREATE INDEX clocker_face_alert_inbox ON clocker_face_alerts(workspace_id,owner_id,created_at DESC,id DESC);

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['clocker_face_platform','clocker_face_policies','clocker_face_enrollments',
      'clocker_face_events','clocker_face_checks','clocker_face_alerts']
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC',table_name);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',table_name);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY',table_name);
    EXECUTE format('CREATE POLICY workspace_scope ON public.%I USING(workspace_id=current_setting(''nevora.clocker.photo_workspace'',true)) WITH CHECK(workspace_id=current_setting(''nevora.clocker.photo_workspace'',true))',table_name);
  END LOOP;
END $$;

CREATE FUNCTION clocker_face_ready(p_workspace text,p_project text,p_branch text)
RETURNS boolean LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clocker_face_platform f
    JOIN public.clocker_photo_platform_lifecycle p USING(workspace_id,project_id,branch_id)
    JOIN public.clocker_photo_policy cfg USING(workspace_id)
    WHERE f.workspace_id=p_workspace AND f.project_id=p_project AND f.branch_id=p_branch
      AND f.enabled AND f.attested_until>clock_timestamp()
      AND f.last_success_at BETWEEN clock_timestamp()-interval '5 minutes' AND clock_timestamp()
      AND p.enabled AND p.attested_until>clock_timestamp()
      AND p.last_success_at BETWEEN clock_timestamp()-interval '75 minutes' AND clock_timestamp()
      AND cfg.enabled
  )
$$;

-- Reuse the authenticated workspace and employee from the portal/PIN guards.
-- Do not call this with browser-supplied authority fields.
CREATE FUNCTION clocker_face_account(p_workspace text,p_actor text,p_project text,p_branch text,p_operation text,
  p_employee text,p_expected integer,p_enabled boolean,p_notice integer,p_reference text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE
  platform public.clocker_face_platform; policy public.clocker_face_policies;
  enrollment public.clocker_face_enrollments; subject text; available boolean; owner_operation boolean;
BEGIN
  owner_operation := p_operation IN ('policy','save','enrollment','request','view','approve','remove');
  IF p_operation IS NULL OR p_operation NOT IN ('policy','save','enrollment','request','view','approve','remove','self','capture','withdraw')
    OR current_setting('nevora.clocker.photo_workspace',true) IS DISTINCT FROM p_workspace
    OR NOT EXISTS(SELECT 1 FROM public.employees e JOIN public.locations l ON l.id=e.primary_location_id
       WHERE e.id=p_actor AND e.active AND l.workspace_id=p_workspace AND (NOT owner_operation OR e.role='OWNER'))
  THEN RAISE EXCEPTION 'clocker_face_ACCESS_DENIED'; END IF;
  IF owner_operation AND p_operation NOT IN ('policy','enrollment','view') THEN
    PERFORM id FROM public.workspaces WHERE id=p_workspace AND active FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'clocker_face_ACCESS_DENIED'; END IF;
  END IF;

  SELECT * INTO platform FROM public.clocker_face_platform
    WHERE workspace_id=p_workspace AND project_id=p_project AND branch_id=p_branch;
  available := public.clocker_face_ready(p_workspace,p_project,p_branch);
  SELECT * INTO policy FROM public.clocker_face_policies WHERE workspace_id=p_workspace;
  IF p_operation IN ('policy','save') THEN
    IF p_operation='save' THEN
      IF p_expected IS DISTINCT FROM coalesce(policy.version,0) THEN RAISE EXCEPTION 'clocker_face_CONFLICT'; END IF;
      IF p_enabled IS NULL OR (p_enabled AND NOT available) THEN RAISE EXCEPTION 'clocker_face_UNAVAILABLE'; END IF;
      IF p_enabled IS DISTINCT FROM (policy.enabled_at IS NOT NULL) THEN
        INSERT INTO public.clocker_face_policies(workspace_id,version,enabled_at)
          VALUES(p_workspace,coalesce(policy.version,0)+1,CASE WHEN p_enabled THEN clock_timestamp() END)
          ON CONFLICT(workspace_id) DO UPDATE SET version=EXCLUDED.version,enabled_at=EXCLUDED.enabled_at
          RETURNING * INTO policy;
        IF NOT p_enabled THEN
          UPDATE public.clocker_face_enrollments SET template_ciphertext=NULL,template_model=NULL
            WHERE workspace_id=p_workspace AND template_ciphertext IS NOT NULL;
          UPDATE public.clocker_face_checks SET state='skipped',finished_at=clock_timestamp(),lease_token=NULL,lease_until=NULL
            WHERE workspace_id=p_workspace AND state IN ('processing','retry');
        END IF;
        INSERT INTO public.clocker_face_events(workspace_id,actor_id,event,version)
          VALUES(p_workspace,p_actor,CASE WHEN p_enabled THEN 'enabled' ELSE 'disabled' END,policy.version);
      END IF;
    END IF;
    RETURN jsonb_build_object('version',coalesce(policy.version,0),'enabled',policy.enabled_at IS NOT NULL,
      'available',available,'alertsEnabled',coalesce(platform.alerts_enabled,false));
  END IF;

  subject := CASE WHEN owner_operation THEN p_employee ELSE p_actor END;
  IF subject IS NULL OR NOT EXISTS(SELECT 1 FROM public.employees e JOIN public.locations l ON l.id=e.primary_location_id
     WHERE e.id=subject AND l.workspace_id=p_workspace AND (e.active OR p_operation IN ('enrollment','remove')))
  THEN RAISE EXCEPTION 'clocker_face_ACCESS_DENIED'; END IF;
  IF p_operation IN ('capture','withdraw') THEN
    SELECT * INTO enrollment FROM public.clocker_face_enrollments
      WHERE workspace_id=p_workspace AND employee_id=subject FOR NO KEY UPDATE;
  ELSE
    SELECT * INTO enrollment FROM public.clocker_face_enrollments WHERE workspace_id=p_workspace AND employee_id=subject;
  END IF;
  IF p_operation NOT IN ('enrollment','self','view') AND p_expected IS DISTINCT FROM coalesce(enrollment.revision,0)
    THEN RAISE EXCEPTION 'clocker_face_CONFLICT'; END IF;
  IF p_operation IN ('request','capture','approve') AND (NOT available OR policy.enabled_at IS NULL)
    THEN RAISE EXCEPTION 'clocker_face_UNAVAILABLE'; END IF;

  CASE p_operation
    WHEN 'request' THEN
      IF enrollment.state IN ('captured','active') AND enrollment.expires_at>clock_timestamp()
        THEN RAISE EXCEPTION 'clocker_face_CONFLICT'; END IF;
      INSERT INTO public.clocker_face_enrollments(workspace_id,employee_id,revision,state,expires_at)
        VALUES(p_workspace,subject,coalesce(enrollment.revision,0)+1,'requested',clock_timestamp()+interval '1 day')
        ON CONFLICT(workspace_id,employee_id) DO UPDATE SET revision=EXCLUDED.revision,state='requested',
          expires_at=EXCLUDED.expires_at,notice_version=NULL,approved_at=NULL,reference_ciphertext=NULL,template_ciphertext=NULL,template_model=NULL
        RETURNING * INTO enrollment;
    WHEN 'capture' THEN
      IF enrollment.state IS DISTINCT FROM 'requested' OR enrollment.expires_at<=clock_timestamp()
        OR p_notice IS DISTINCT FROM platform.notice_version OR p_reference IS NULL
        THEN RAISE EXCEPTION 'clocker_face_CONFLICT'; END IF;
      UPDATE public.clocker_face_enrollments SET revision=revision+1,state='captured',notice_version=p_notice,
        reference_ciphertext=p_reference,expires_at=clock_timestamp()+make_interval(days=>platform.retention_days)
        WHERE workspace_id=p_workspace AND employee_id=subject RETURNING * INTO enrollment;
    WHEN 'approve' THEN
      IF enrollment.state IS DISTINCT FROM 'captured' OR enrollment.expires_at<=clock_timestamp()
        OR enrollment.notice_version IS DISTINCT FROM platform.notice_version THEN RAISE EXCEPTION 'clocker_face_CONFLICT'; END IF;
      -- The captured revision is also the encryption context. Approval changes
      -- the state, and leaves that immutable image revision intact.
      UPDATE public.clocker_face_enrollments SET state='active',approved_at=clock_timestamp()
        WHERE workspace_id=p_workspace AND employee_id=subject RETURNING * INTO enrollment;
    WHEN 'view' THEN
      IF NOT coalesce(enrollment.state IN ('captured','active'),false) OR enrollment.expires_at<=clock_timestamp()
        OR enrollment.notice_version IS DISTINCT FROM platform.notice_version THEN RETURN NULL; END IF;
      INSERT INTO public.clocker_face_events(workspace_id,employee_id,actor_id,event,version,notice_version)
        VALUES(p_workspace,subject,p_actor,'viewed',enrollment.revision,enrollment.notice_version);
      RETURN jsonb_build_object('revision',enrollment.revision,'ciphertext',enrollment.reference_ciphertext);
    WHEN 'remove','withdraw' THEN
      IF enrollment.state IS NULL OR enrollment.state='removed' THEN RAISE EXCEPTION 'clocker_face_CONFLICT'; END IF;
      UPDATE public.clocker_face_enrollments SET revision=revision+1,state='removed',expires_at=NULL,
        notice_version=NULL,approved_at=NULL,reference_ciphertext=NULL,template_ciphertext=NULL,template_model=NULL
        WHERE workspace_id=p_workspace AND employee_id=subject RETURNING * INTO enrollment;
      UPDATE public.clocker_face_checks c SET state='skipped',finished_at=clock_timestamp(),lease_token=NULL,lease_until=NULL
        FROM public.clocker_punch_photos p WHERE c.workspace_id=p_workspace AND p.workspace_id=c.workspace_id
        AND p.device_id=c.device_id AND p.command_id=c.command_id AND p.employee_id=subject AND c.state IN ('processing','retry');
    ELSE NULL;
  END CASE;

  IF p_operation IN ('request','capture','approve','remove','withdraw') THEN
    INSERT INTO public.clocker_face_events(workspace_id,employee_id,actor_id,event,version,notice_version)
      VALUES(p_workspace,subject,p_actor,CASE p_operation WHEN 'request' THEN 'requested' WHEN 'capture' THEN 'consented'
        WHEN 'approve' THEN 'approved' ELSE 'removed' END,enrollment.revision,enrollment.notice_version);
  END IF;
  RETURN jsonb_build_object('employeeId',subject,'revision',coalesce(enrollment.revision,0),
    'state',CASE WHEN enrollment.expires_at<=clock_timestamp() THEN 'expired' ELSE coalesce(enrollment.state,'none') END,
    'expiresAt',enrollment.expires_at,'canCapture',available AND policy.enabled_at IS NOT NULL
      AND coalesce(enrollment.state='requested' AND enrollment.expires_at>clock_timestamp(),false),
    'verificationActive',available AND policy.enabled_at IS NOT NULL
      AND coalesce(enrollment.state='active' AND enrollment.expires_at>clock_timestamp() AND enrollment.notice_version=platform.notice_version,false))
    || CASE WHEN p_operation='self' AND available AND policy.enabled_at IS NOT NULL AND
       enrollment.state='requested' AND enrollment.expires_at>clock_timestamp()
       THEN jsonb_build_object('notice',jsonb_build_object('version',platform.notice_version,'en',platform.notice_en,
         'es',platform.notice_es,'retentionDays',platform.retention_days))
       ELSE '{}'::jsonb END;
END;
$$;

-- A current PIN may decline comparison for its own saved punch, including when
-- the chosen punch type still captures an ordinary photo. Call before upload.
CREATE FUNCTION clocker_face_skip(p_workspace text,p_employee text,p_device text,p_command uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE policy public.clocker_face_policies; enrollment public.clocker_face_enrollments; photo public.clocker_punch_photos;
BEGIN
  IF current_setting('nevora.clocker.photo_workspace',true) IS DISTINCT FROM p_workspace THEN
    RAISE EXCEPTION 'clocker_face_ACCESS_DENIED';
  END IF;
  SELECT * INTO photo FROM public.clocker_punch_photos WHERE workspace_id=p_workspace AND employee_id=p_employee
    AND device_id=p_device AND command_id=p_command FOR NO KEY UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'clocker_face_ACCESS_DENIED'; END IF;
  SELECT * INTO policy FROM public.clocker_face_policies WHERE workspace_id=p_workspace;
  SELECT * INTO enrollment FROM public.clocker_face_enrollments WHERE workspace_id=p_workspace AND employee_id=p_employee;
  IF policy.enabled_at IS NULL OR enrollment.state IS DISTINCT FROM 'active' OR photo.state='not_required' THEN RETURN true; END IF;
  INSERT INTO public.clocker_face_checks(workspace_id,device_id,command_id,policy_version,enrollment_revision,state,attempt,deliver_alerts,finished_at)
    VALUES(p_workspace,p_device,p_command,policy.version,enrollment.revision,'skipped',1,false,clock_timestamp())
    ON CONFLICT(workspace_id,device_id,command_id) DO UPDATE
      SET state='skipped',finished_at=clock_timestamp(),lease_token=NULL,lease_until=NULL
      WHERE clocker_face_checks.state IN ('processing','retry');
  RETURN FOUND OR EXISTS(SELECT 1 FROM public.clocker_face_checks
    WHERE workspace_id=p_workspace AND device_id=p_device AND command_id=p_command AND state='skipped');
END;
$$;

-- Lifecycle cleanup uses the workspace lock shared by policy changes and claim/finalization.
CREATE FUNCTION clocker_face_worker(p_workspace text,p_project text,p_branch text,p_model text,
  p_operation text,p_lease uuid,p_outcome text,p_template text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE
  config public.clocker_face_platform; policy public.clocker_face_policies; claimed public.clocker_face_checks;
  photo public.clocker_punch_photos; enrollment public.clocker_face_enrollments; affected integer;
BEGIN
  PERFORM set_config('nevora.clocker.photo_workspace',p_workspace,true);
  SELECT * INTO config FROM public.clocker_face_platform WHERE workspace_id=p_workspace
    AND project_id=p_project AND branch_id=p_branch AND worker_role=session_user;
  IF NOT FOUND OR p_lease IS NULL OR p_model IS DISTINCT FROM config.model_version
    OR p_operation IS NULL OR p_operation NOT IN ('claim','finish','maintenance') THEN RAISE EXCEPTION 'clocker_face_worker_denied'; END IF;

  IF p_operation='maintenance' THEN
    PERFORM id FROM public.workspaces WHERE id=p_workspace AND active FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'clocker_face_worker_denied'; END IF;
    WITH candidates AS (
      SELECT f.employee_id FROM public.clocker_face_enrollments f
      WHERE f.workspace_id=p_workspace AND f.state<>'removed' AND (f.expires_at<=clock_timestamp()
      OR NOT EXISTS(SELECT 1 FROM public.employees e JOIN public.locations l ON l.id=e.primary_location_id
        WHERE e.id=f.employee_id AND e.active AND l.workspace_id=p_workspace))
      ORDER BY f.expires_at,f.employee_id LIMIT 500 FOR NO KEY UPDATE OF f SKIP LOCKED
    ), removed AS (
      UPDATE public.clocker_face_enrollments e SET revision=e.revision+1,state='removed',
        expires_at=NULL,notice_version=NULL,approved_at=NULL,reference_ciphertext=NULL,template_ciphertext=NULL,template_model=NULL
      FROM candidates c WHERE e.workspace_id=p_workspace AND e.employee_id=c.employee_id RETURNING e.employee_id,e.revision
    )
    INSERT INTO public.clocker_face_events(workspace_id,employee_id,version,event)
      SELECT p_workspace,r.employee_id,r.revision,'expired' FROM removed r;
    GET DIAGNOSTICS affected=ROW_COUNT;
    UPDATE public.clocker_face_checks c SET state='failed',finished_at=clock_timestamp(),lease_token=NULL,lease_until=NULL
      WHERE workspace_id=p_workspace AND state='processing' AND attempt=3 AND lease_until<=clock_timestamp();
    WITH expired_checks AS (
      SELECT c.device_id,c.command_id FROM public.clocker_face_checks c
        JOIN public.clocker_punch_photos p USING(workspace_id,device_id,command_id)
      WHERE c.workspace_id=p_workspace AND (p.state IN ('expired','removed') OR p.expires_at<=clock_timestamp())
      ORDER BY p.expires_at,c.device_id,c.command_id LIMIT 500 FOR UPDATE OF c SKIP LOCKED
    )
    DELETE FROM public.clocker_face_checks c USING expired_checks expired
      WHERE c.workspace_id=p_workspace AND c.device_id=expired.device_id AND c.command_id=expired.command_id;
    UPDATE public.clocker_face_platform SET last_success_at=clock_timestamp()
      WHERE workspace_id=p_workspace AND worker_role=session_user AND model_version=p_model;
    RETURN jsonb_build_object('purged',affected);
  END IF;

  PERFORM id FROM public.workspaces WHERE id=p_workspace AND active FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'clocker_face_worker_denied'; END IF;
  SELECT * INTO config FROM public.clocker_face_platform WHERE workspace_id=p_workspace
    AND project_id=p_project AND branch_id=p_branch AND worker_role=session_user AND model_version=p_model FOR SHARE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT * INTO policy FROM public.clocker_face_policies WHERE workspace_id=p_workspace;
  IF policy.enabled_at IS NULL OR NOT public.clocker_face_ready(p_workspace,p_project,p_branch) THEN RETURN NULL; END IF;
  IF p_operation='claim' THEN
    SELECT p.* INTO photo FROM public.clocker_punch_photos p
      JOIN public.clocker_face_enrollments e USING(workspace_id,employee_id)
      JOIN public.employees employee ON employee.id=p.employee_id AND employee.active
      JOIN public.locations home ON home.id=employee.primary_location_id AND home.workspace_id=p.workspace_id
      LEFT JOIN public.clocker_face_checks c ON c.workspace_id=p.workspace_id AND c.device_id=p.device_id AND c.command_id=p.command_id
      WHERE p.workspace_id=p_workspace AND p.state='stored' AND p.expires_at>clock_timestamp()
        AND p.performed_at>=greatest(policy.enabled_at,e.approved_at) AND e.state='active'
        AND e.expires_at>clock_timestamp() AND e.notice_version=config.notice_version
        AND (c.command_id IS NULL OR (c.state IN ('retry','processing') AND c.lease_until<=clock_timestamp()
          AND c.attempt<3 AND c.policy_version=policy.version AND c.enrollment_revision=e.revision))
      ORDER BY p.uploaded_at,p.device_id,p.command_id LIMIT 1 FOR NO KEY UPDATE OF p SKIP LOCKED;
    IF NOT FOUND THEN RETURN NULL; END IF;
    SELECT * INTO enrollment FROM public.clocker_face_enrollments WHERE workspace_id=p_workspace AND employee_id=photo.employee_id;
    INSERT INTO public.clocker_face_checks(workspace_id,device_id,command_id,policy_version,enrollment_revision,state,attempt,deliver_alerts,lease_token,lease_until)
      VALUES(p_workspace,photo.device_id,photo.command_id,policy.version,enrollment.revision,'processing',1,config.alerts_enabled,p_lease,clock_timestamp()+interval '1 minute')
      ON CONFLICT(workspace_id,device_id,command_id) DO UPDATE SET state='processing',attempt=clocker_face_checks.attempt+1,
        lease_token=p_lease,lease_until=EXCLUDED.lease_until
      WHERE clocker_face_checks.state IN ('retry','processing') AND clocker_face_checks.lease_until<=clock_timestamp()
        AND clocker_face_checks.attempt<3 AND clocker_face_checks.policy_version=policy.version
        AND clocker_face_checks.enrollment_revision=enrollment.revision
      RETURNING * INTO claimed;
    IF NOT FOUND THEN RETURN NULL; END IF;
    RETURN jsonb_build_object('employeeId',photo.employee_id,'revision',enrollment.revision,
      'reference',enrollment.reference_ciphertext,
      'template',CASE WHEN enrollment.template_model=p_model THEN enrollment.template_ciphertext END,
      'jpeg',encode(photo.jpeg,'hex'),'queueAgeSeconds',greatest(0,extract(epoch from (clock_timestamp()-photo.uploaded_at)))::integer);
  END IF;

  IF p_outcome IS NULL OR p_outcome NOT IN ('match','mismatch','inconclusive','retry') THEN
    RAISE EXCEPTION 'clocker_face_worker_invalid_outcome';
  END IF;
  -- Lock the photo and enrollment before the receipt. Withdrawal also locks
  -- the enrollment before touching receipts.
  SELECT p.* INTO photo FROM public.clocker_face_checks c JOIN public.clocker_punch_photos p USING(workspace_id,device_id,command_id)
    WHERE c.workspace_id=p_workspace AND c.lease_token=p_lease FOR SHARE OF p;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT f.* INTO enrollment FROM public.clocker_face_enrollments f
    JOIN public.employees e ON e.id=f.employee_id AND e.active
    JOIN public.locations l ON l.id=e.primary_location_id AND l.workspace_id=f.workspace_id
    WHERE f.workspace_id=p_workspace AND f.employee_id=photo.employee_id AND f.state='active'
      AND f.notice_version=config.notice_version AND f.expires_at>clock_timestamp()
    FOR NO KEY UPDATE OF f FOR SHARE OF e;
  SELECT * INTO claimed FROM public.clocker_face_checks WHERE workspace_id=p_workspace AND lease_token=p_lease FOR UPDATE;
  IF NOT FOUND OR claimed.lease_until<=clock_timestamp() THEN RETURN NULL; END IF;
  IF enrollment.revision IS DISTINCT FROM claimed.enrollment_revision OR policy.version<>claimed.policy_version OR photo.state<>'stored' OR photo.expires_at<=clock_timestamp() THEN
    p_outcome := 'skipped';
  ELSIF p_template IS NOT NULL AND p_outcome IN ('match','mismatch','inconclusive') THEN
    UPDATE public.clocker_face_enrollments SET template_ciphertext=p_template,template_model=p_model
      WHERE workspace_id=p_workspace AND employee_id=photo.employee_id AND revision=claimed.enrollment_revision;
  END IF;
  IF p_outcome='retry' AND claimed.attempt=3 THEN p_outcome := 'failed'; END IF;
  UPDATE public.clocker_face_checks SET state=p_outcome,lease_token=NULL,
    lease_until=CASE WHEN p_outcome='retry' THEN clock_timestamp()+claimed.attempt*interval '30 seconds' END,
    finished_at=CASE WHEN p_outcome<>'retry' THEN clock_timestamp() END
    WHERE workspace_id=p_workspace AND lease_token=p_lease;
  IF p_outcome='mismatch' AND config.alerts_enabled AND claimed.deliver_alerts THEN
    INSERT INTO public.clocker_face_alerts(workspace_id,device_id,command_id,owner_id)
      SELECT p_workspace,photo.device_id,photo.command_id,e.id
      FROM public.employees e JOIN public.locations l ON l.id=e.primary_location_id
      WHERE e.active AND e.role='OWNER' AND l.workspace_id=p_workspace
      ON CONFLICT(workspace_id,device_id,command_id,owner_id) DO NOTHING;
  END IF;
  RETURN jsonb_build_object('state',p_outcome);
END;
$$;

REVOKE ALL ON FUNCTION clocker_face_account(text,text,text,text,text,text,integer,boolean,integer,text),
  clocker_face_ready(text,text,text),clocker_face_skip(text,text,text,uuid),clocker_face_worker(text,text,text,text,text,uuid,text,text) FROM PUBLIC;

DO $$
DECLARE app_role name;
BEGIN
  FOR app_role IN SELECT login_role FROM public.onboarding_runtime_roles WHERE kind='APP' LOOP
    EXECUTE format('GRANT SELECT ON public.clocker_face_platform,public.clocker_face_checks TO %I',app_role);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE ON public.clocker_face_policies,public.clocker_face_enrollments TO %I',app_role);
    EXECUTE format('GRANT INSERT ON public.clocker_face_events TO %I',app_role);
    EXECUTE format('GRANT INSERT,UPDATE(state,finished_at,lease_token,lease_until) ON public.clocker_face_checks TO %I',app_role);
    EXECUTE format('GRANT SELECT,UPDATE(read_at) ON public.clocker_face_alerts TO %I',app_role);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.clocker_face_account(text,text,text,text,text,text,integer,boolean,integer,text),
      public.clocker_face_ready(text,text,text),public.clocker_face_skip(text,text,text,uuid) TO %I',app_role);
  END LOOP;
END $$;

COMMIT;
