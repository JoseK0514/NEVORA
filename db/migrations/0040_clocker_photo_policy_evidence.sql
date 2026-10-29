-- Private Clocker photo evidence on the current Company schema.
-- Server-verified guards set a transaction-local workspace before these RLS policies apply.
BEGIN;
CREATE TABLE clocker_photo_policy (
 workspace_id text PRIMARY KEY REFERENCES workspaces(id),
 version integer NOT NULL CHECK(version>0),
 enabled boolean NOT NULL DEFAULT false,
 events text[] NOT NULL DEFAULT ARRAY['CLOCK_IN','START_BREAK','END_BREAK','CLOCK_OUT']::text[] CHECK(events <@ ARRAY['CLOCK_IN','START_BREAK','END_BREAK','CLOCK_OUT']::text[] AND cardinality(events)<=4),
 retention_days integer DEFAULT 30 CHECK(retention_days BETWEEN 1 AND 30),
 failure_behavior text DEFAULT 'ALLOW_WITH_EXCEPTION' CHECK(failure_behavior='ALLOW_WITH_EXCEPTION'),
 updated_by text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(updated_by) REFERENCES employees(id),
 CHECK(events=array_remove(ARRAY[CASE WHEN 'CLOCK_IN'=ANY(events) THEN 'CLOCK_IN' END,
   CASE WHEN 'START_BREAK'=ANY(events) THEN 'START_BREAK' END,CASE WHEN 'END_BREAK'=ANY(events) THEN 'END_BREAK' END,
   CASE WHEN 'CLOCK_OUT'=ANY(events) THEN 'CLOCK_OUT' END],NULL)),
 CHECK(NOT enabled OR (cardinality(events)>0 AND retention_days IS NOT NULL AND failure_behavior IS NOT NULL))
);
CREATE TABLE clocker_photo_policy_revisions (
 workspace_id text NOT NULL,
 version integer NOT NULL,
 actor_employee_id text NOT NULL,
 policy jsonb NOT NULL CHECK(jsonb_typeof(policy)='object'),
 occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(workspace_id,version),
 FOREIGN KEY(actor_employee_id) REFERENCES employees(id)
);
CREATE TABLE clocker_photo_notice_profiles (
 workspace_id text PRIMARY KEY REFERENCES workspaces(id),
 version integer NOT NULL CHECK(version>0),
 assistance_contact text NOT NULL CHECK(assistance_contact=btrim(assistance_contact) AND char_length(assistance_contact) BETWEEN 1 AND 200),
 assistance_instructions text NOT NULL CHECK(assistance_instructions=btrim(assistance_instructions) AND char_length(assistance_instructions) BETWEEN 1 AND 1000),
 updated_by text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(updated_by) REFERENCES employees(id)
);
CREATE TABLE clocker_photo_notice_revisions (
 workspace_id text NOT NULL REFERENCES workspaces(id),
 version integer NOT NULL,
 actor_employee_id text NOT NULL,
 profile jsonb NOT NULL CHECK(jsonb_typeof(profile)='object'),
 occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(workspace_id,version),
 FOREIGN KEY(actor_employee_id) REFERENCES employees(id)
);
CREATE TABLE clocker_punch_photos (
 workspace_id text NOT NULL,
 device_id text NOT NULL,
 command_id uuid NOT NULL,
 employee_id text NOT NULL,
 location_id text NOT NULL,
 credential_version integer NOT NULL CHECK(credential_version>0),
 action text NOT NULL CHECK(action IN ('CLOCK_IN','START_BREAK','END_BREAK','CLOCK_OUT')),
 performed_at timestamptz NOT NULL,
 policy_version integer NOT NULL CHECK(policy_version>=0),
 notice_profile_version integer NOT NULL CHECK(notice_profile_version>=0),
 state text NOT NULL CHECK(state IN ('not_required','pending','stored','missing','expired','removed')),
 upload_deadline timestamptz,
 expires_at timestamptz,
 failure_code text CHECK(failure_code IN ('CAMERA_DENIED','CAMERA_UNAVAILABLE','CAPTURE_FAILED','UPLOAD_FAILED','EMPLOYEE_CHANGED','PHOTO_ALTERNATIVE')),
 sha256 text CHECK(sha256 ~ '^[a-f0-9]{64}$'),
 width integer CHECK(width BETWEEN 1 AND 640),
 height integer CHECK(height BETWEEN 1 AND 640),
 jpeg bytea CHECK(octet_length(jpeg) BETWEEN 20 AND 524288),
 uploaded_at timestamptz,
 removed_at timestamptz,
 removed_by text,
 PRIMARY KEY(workspace_id,device_id,command_id),
 UNIQUE(device_id,command_id),
 FOREIGN KEY(device_id,command_id) REFERENCES clocker_command_ledger(device_id,command_id),
 FOREIGN KEY(employee_id) REFERENCES employees(id),
 FOREIGN KEY(device_id) REFERENCES clocker_devices(id),
 FOREIGN KEY(workspace_id,location_id) REFERENCES locations(workspace_id,id),
 FOREIGN KEY(removed_by) REFERENCES employees(id),
 CHECK((state='removed')=(removed_at IS NOT NULL AND removed_by IS NOT NULL)),
 CHECK(state='removed' OR (removed_at IS NULL AND removed_by IS NULL)),
 CHECK((state='stored')=(jpeg IS NOT NULL)),
 CHECK((jpeg IS NULL AND sha256 IS NULL AND width IS NULL AND height IS NULL) OR
       (jpeg IS NOT NULL AND sha256 IS NOT NULL AND width IS NOT NULL AND height IS NOT NULL)),
 CHECK(state='not_required' OR (upload_deadline IS NOT NULL AND expires_at IS NOT NULL)),
 CHECK(upload_deadline IS NULL OR upload_deadline>=performed_at),
 CHECK(expires_at IS NULL OR expires_at>performed_at)
);
CREATE FUNCTION clocker_photo_binding_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER AS $$
BEGIN
 IF TG_OP='UPDATE' AND ROW(NEW.workspace_id,NEW.device_id,NEW.command_id,NEW.employee_id,NEW.location_id,
   NEW.credential_version,NEW.action,NEW.performed_at,NEW.policy_version,NEW.notice_profile_version,NEW.upload_deadline)
   IS DISTINCT FROM ROW(OLD.workspace_id,OLD.device_id,OLD.command_id,OLD.employee_id,OLD.location_id,
   OLD.credential_version,OLD.action,OLD.performed_at,OLD.policy_version,OLD.notice_profile_version,OLD.upload_deadline) THEN
   RAISE EXCEPTION 'clocker_photo_COMMAND_REUSED';
 END IF;
 IF TG_OP='UPDATE' AND OLD.expires_at IS NOT NULL AND (NEW.expires_at IS NULL OR NEW.expires_at>OLD.expires_at) THEN
   RAISE EXCEPTION 'clocker_photo_INVALID_INPUT';
 END IF;
 IF TG_OP='UPDATE' AND ((OLD.state='expired' AND NEW.state<>'expired') OR
   (OLD.state='removed' AND NEW.state<>'removed') OR
   (OLD.removed_at IS NOT NULL AND ROW(NEW.removed_at,NEW.removed_by) IS DISTINCT FROM ROW(OLD.removed_at,OLD.removed_by)) OR
   (OLD.state='not_required' AND NEW.state<>'not_required') OR
   (OLD.uploaded_at IS NOT NULL AND OLD.jpeg IS NULL AND NEW.jpeg IS NOT NULL)) THEN
   RAISE EXCEPTION 'clocker_photo_COMMAND_REUSED';
 END IF;
 IF NOT EXISTS(SELECT 1 FROM clocker_command_ledger ledger JOIN clocker_devices d ON d.id=ledger.device_id
   JOIN locations l ON l.id=d.location_id JOIN employees e ON e.id=ledger.employee_id JOIN locations employee_home ON employee_home.id=e.primary_location_id
   WHERE ledger.device_id=NEW.device_id AND ledger.command_id=NEW.command_id AND ledger.employee_id=NEW.employee_id
   AND l.workspace_id=NEW.workspace_id AND employee_home.workspace_id=NEW.workspace_id AND d.location_id=NEW.location_id
   AND ledger.credential_version=NEW.credential_version AND ledger.action=NEW.action AND ledger.performed_at=NEW.performed_at) THEN
   RAISE EXCEPTION 'clocker_photo_AUTH_REQUIRED';
 END IF;
 IF NEW.jpeg IS NOT NULL AND (NEW.sha256 IS DISTINCT FROM encode(sha256(NEW.jpeg),'hex') OR NEW.uploaded_at IS NULL) THEN
   RAISE EXCEPTION 'clocker_photo_INVALID_INPUT';
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER clocker_photo_original_command_guard BEFORE INSERT OR UPDATE ON clocker_punch_photos
 FOR EACH ROW EXECUTE FUNCTION clocker_photo_binding_guard();
CREATE INDEX clocker_punch_photo_expiry ON clocker_punch_photos(workspace_id,expires_at) WHERE jpeg IS NOT NULL;
CREATE TABLE clocker_photo_access_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id text NOT NULL,
 actor_employee_id text NOT NULL,
 device_id text NOT NULL,
 command_id uuid NOT NULL,
 kind text NOT NULL CHECK(kind IN ('VIEWED','RETENTION_REMOVED','OWNER_REMOVED','ORPHAN_FINALIZED')),
 occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(actor_employee_id) REFERENCES employees(id),
 FOREIGN KEY(workspace_id,device_id,command_id) REFERENCES clocker_punch_photos(workspace_id,device_id,command_id)
);
CREATE TABLE clocker_photo_review_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id text NOT NULL REFERENCES workspaces(id),
 actor_employee_id text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('LIST','DETAIL')),
 result_count integer NOT NULL CHECK(result_count BETWEEN 0 AND 50),
 occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(actor_employee_id) REFERENCES employees(id)
);
CREATE TRIGGER clocker_photo_policy_revisions_append_only BEFORE UPDATE OR DELETE ON clocker_photo_policy_revisions
 FOR EACH ROW EXECUTE FUNCTION clocker_device_event_append_only();
CREATE TRIGGER clocker_photo_access_events_append_only BEFORE UPDATE OR DELETE ON clocker_photo_access_events
 FOR EACH ROW EXECUTE FUNCTION clocker_device_event_append_only();
CREATE TRIGGER clocker_photo_notice_revisions_append_only BEFORE UPDATE OR DELETE ON clocker_photo_notice_revisions
 FOR EACH ROW EXECUTE FUNCTION clocker_device_event_append_only();
CREATE TRIGGER clocker_photo_review_events_append_only BEFORE UPDATE OR DELETE ON clocker_photo_review_events
 FOR EACH ROW EXECUTE FUNCTION clocker_device_event_append_only();
ALTER TABLE clocker_photo_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE clocker_photo_policy FORCE ROW LEVEL SECURITY;
ALTER TABLE clocker_photo_policy_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clocker_photo_policy_revisions FORCE ROW LEVEL SECURITY;
ALTER TABLE clocker_punch_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE clocker_punch_photos FORCE ROW LEVEL SECURITY;
ALTER TABLE clocker_photo_access_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE clocker_photo_access_events FORCE ROW LEVEL SECURITY;
ALTER TABLE clocker_photo_notice_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clocker_photo_notice_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE clocker_photo_notice_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE clocker_photo_notice_revisions FORCE ROW LEVEL SECURITY;
ALTER TABLE clocker_photo_review_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE clocker_photo_review_events FORCE ROW LEVEL SECURITY;
REVOKE ALL ON clocker_photo_policy,clocker_photo_policy_revisions,clocker_punch_photos,clocker_photo_access_events,
 clocker_photo_notice_profiles,clocker_photo_notice_revisions,clocker_photo_review_events FROM PUBLIC;

CREATE FUNCTION clocker_photo_status_value(p clocker_punch_photos) RETURNS jsonb
LANGUAGE sql VOLATILE SECURITY INVOKER AS $$
 SELECT jsonb_strip_nulls(jsonb_build_object('commandId',p.command_id,'policyVersion',p.policy_version,'profileVersion',p.notice_profile_version,
 'state',CASE WHEN p.state IN ('not_required','removed') THEN p.state WHEN p.expires_at<=clock_timestamp() THEN 'expired'
   WHEN p.state='pending' AND p.upload_deadline<=clock_timestamp() THEN 'missing' ELSE p.state END,
 'uploadDeadline',p.upload_deadline,'expiresAt',p.expires_at,
 'code',CASE WHEN p.state='pending' AND p.upload_deadline<=clock_timestamp() THEN 'UPLOAD_FAILED' ELSE p.failure_code END));
$$;

-- Call in the SAME guarded punch transaction after ledger insertion, before the
-- final current-proof check. The original punch is never executed by photo code.
CREATE FUNCTION clocker_photo_capture_expectation(p_workspace text,p_device text,p_command uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE saved clocker_command_ledger%ROWTYPE; policy clocker_photo_policy%ROWTYPE; profile clocker_photo_notice_profiles%ROWTYPE; photo clocker_punch_photos%ROWTYPE; needed boolean;
BEGIN
 SELECT ledger.* INTO saved FROM clocker_command_ledger ledger
 JOIN clocker_devices d ON d.id=ledger.device_id JOIN locations l ON l.id=d.location_id
 JOIN employees e ON e.id=ledger.employee_id JOIN locations employee_home ON employee_home.id=e.primary_location_id AND employee_home.workspace_id=l.workspace_id
 WHERE l.workspace_id=p_workspace AND ledger.device_id=p_device AND ledger.command_id=p_command;
 IF NOT FOUND THEN RETURN jsonb_build_object('commandId',p_command,'state','unknown'); END IF;
 SELECT * INTO policy FROM clocker_photo_policy WHERE workspace_id=p_workspace FOR SHARE;
 SELECT * INTO profile FROM clocker_photo_notice_profiles WHERE workspace_id=p_workspace FOR SHARE;
 needed=COALESCE(policy.enabled AND saved.action=ANY(policy.events),false);
 INSERT INTO clocker_punch_photos(workspace_id,device_id,command_id,employee_id,location_id,credential_version,action,performed_at,
   policy_version,notice_profile_version,state,upload_deadline,expires_at)
 SELECT p_workspace,saved.device_id,saved.command_id,saved.employee_id,d.location_id,saved.credential_version,saved.action,saved.performed_at,
   COALESCE(policy.version,0),COALESCE(profile.version,0),CASE WHEN needed THEN 'pending' ELSE 'not_required' END,
   CASE WHEN needed THEN saved.performed_at+interval '300 seconds' END,
   CASE WHEN needed THEN saved.performed_at+make_interval(days=>policy.retention_days) END
 FROM clocker_devices d JOIN locations l ON l.id=d.location_id WHERE l.workspace_id=p_workspace AND d.id=saved.device_id
 ON CONFLICT(workspace_id,device_id,command_id) DO NOTHING;
 SELECT * INTO photo FROM clocker_punch_photos WHERE workspace_id=p_workspace AND device_id=p_device AND command_id=p_command;
 IF NOT FOUND THEN RAISE EXCEPTION 'clocker_photo_UNAVAILABLE'; END IF;
 RETURN clocker_photo_status_value(photo);
END;
$$;

CREATE FUNCTION clocker_photo_upload(p_workspace text,p_device text,p_employee text,p_generation integer,p_command uuid,
 p_jpeg bytea,p_sha256 text,p_width integer,p_height integer,p_policy_version integer,p_profile_version integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE photo clocker_punch_photos%ROWTYPE;
BEGIN
 -- Match policy-save lock order; prevent policy/profile changes between the
 -- version assertion and image finalization without a photo/policy deadlock.
 PERFORM id FROM workspaces WHERE id=p_workspace FOR SHARE;
 SELECT * INTO photo FROM clocker_punch_photos WHERE workspace_id=p_workspace AND device_id=p_device AND command_id=p_command
   AND employee_id=p_employee AND credential_version=p_generation FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('commandId',p_command,'state','unknown'); END IF;
 IF photo.state IN ('not_required','expired','removed') OR photo.expires_at<=clock_timestamp() THEN RETURN clocker_photo_status_value(photo); END IF;
 IF photo.policy_version IS DISTINCT FROM p_policy_version OR photo.notice_profile_version IS DISTINCT FROM p_profile_version OR
   NOT EXISTS(SELECT 1 FROM clocker_photo_policy WHERE workspace_id=p_workspace AND version=p_policy_version) OR
   NOT EXISTS(SELECT 1 FROM clocker_photo_notice_profiles WHERE workspace_id=p_workspace AND version=p_profile_version) THEN
  RAISE EXCEPTION 'clocker_photo_POLICY_CHANGED'; END IF;
 IF photo.state='stored' THEN
   IF photo.sha256 IS DISTINCT FROM p_sha256 THEN RAISE EXCEPTION 'clocker_photo_COMMAND_REUSED'; END IF;
   RETURN clocker_photo_status_value(photo);
 END IF;
 IF photo.upload_deadline<=clock_timestamp() THEN RETURN clocker_photo_status_value(photo); END IF;
 IF p_jpeg IS NULL OR p_width IS NULL OR p_height IS NULL OR p_sha256 IS NULL
   OR octet_length(p_jpeg) NOT BETWEEN 20 AND 524288 OR p_width NOT BETWEEN 1 AND 640 OR p_height NOT BETWEEN 1 AND 640
   OR p_sha256 IS DISTINCT FROM encode(sha256(p_jpeg),'hex') THEN RAISE EXCEPTION 'clocker_photo_INVALID_INPUT'; END IF;
 UPDATE clocker_punch_photos SET state='stored',jpeg=p_jpeg,sha256=p_sha256,width=p_width,height=p_height,
   uploaded_at=clock_timestamp(),failure_code=NULL WHERE workspace_id=p_workspace AND device_id=p_device AND command_id=p_command RETURNING * INTO photo;
 RETURN clocker_photo_status_value(photo);
END;
$$;

CREATE FUNCTION clocker_photo_missing(p_workspace text,p_device text,p_employee text,p_generation integer,p_command uuid,p_code text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE photo clocker_punch_photos%ROWTYPE;
BEGIN
 IF p_code IS NULL OR p_code NOT IN ('CAMERA_DENIED','CAMERA_UNAVAILABLE','CAPTURE_FAILED','UPLOAD_FAILED','EMPLOYEE_CHANGED','PHOTO_ALTERNATIVE') THEN RAISE EXCEPTION 'clocker_photo_INVALID_INPUT'; END IF;
 SELECT * INTO photo FROM clocker_punch_photos WHERE workspace_id=p_workspace AND device_id=p_device AND command_id=p_command
   AND employee_id=p_employee AND credential_version=p_generation FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('commandId',p_command,'state','unknown'); END IF;
 IF photo.state IN ('stored','not_required','expired','removed') OR photo.expires_at<=clock_timestamp() THEN RETURN clocker_photo_status_value(photo); END IF;
 IF photo.failure_code IS NOT NULL AND photo.failure_code<>p_code THEN RAISE EXCEPTION 'clocker_photo_COMMAND_REUSED'; END IF;
 UPDATE clocker_punch_photos SET state='missing',failure_code=p_code WHERE workspace_id=p_workspace AND device_id=p_device AND command_id=p_command RETURNING * INTO photo;
 RETURN clocker_photo_status_value(photo);
END;
$$;

CREATE FUNCTION clocker_photo_save_policy(p_workspace text,p_actor text,p_expected integer,p_enabled boolean,p_events text[],p_retention integer,p_behavior text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE policy clocker_photo_policy%ROWTYPE; revision integer; effective_retention integer; effective_behavior text;
BEGIN
 -- Workspace lock serializes initial insert and later CAS saves. Authority is
 -- checked before/after by the current server proof adapter, never by actor IDs alone.
 PERFORM id FROM workspaces WHERE id=p_workspace FOR UPDATE;
 SELECT * INTO policy FROM clocker_photo_policy WHERE workspace_id=p_workspace FOR UPDATE;
 IF COALESCE(policy.version,0) IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'clocker_photo_POLICY_CHANGED'; END IF;
 -- First-save NULL values receive the approved new-company defaults only.
 -- Existing disabled NULL policies retain their explicit stored preferences.
 effective_retention=CASE WHEN p_expected=0 THEN COALESCE(p_retention,30) ELSE p_retention END;
 effective_behavior=CASE WHEN p_expected=0 THEN COALESCE(p_behavior,'ALLOW_WITH_EXCEPTION') ELSE p_behavior END;
 revision=p_expected+1;
 INSERT INTO clocker_photo_policy(workspace_id,version,enabled,events,retention_days,failure_behavior,updated_by)
 VALUES(p_workspace,revision,p_enabled,p_events,effective_retention,effective_behavior,p_actor)
 ON CONFLICT(workspace_id) DO UPDATE SET version=EXCLUDED.version,enabled=EXCLUDED.enabled,events=EXCLUDED.events,
   retention_days=EXCLUDED.retention_days,failure_behavior=EXCLUDED.failure_behavior,updated_by=EXCLUDED.updated_by,updated_at=clock_timestamp();
 SELECT * INTO policy FROM clocker_photo_policy WHERE workspace_id=p_workspace;
 INSERT INTO clocker_photo_policy_revisions(workspace_id,version,actor_employee_id,policy)
 VALUES(p_workspace,revision,p_actor,jsonb_build_object('version',revision,'enabled',policy.enabled,'events',policy.events,
   'retentionDays',policy.retention_days,'failureBehavior',policy.failure_behavior));
 -- A shorter selected retention applies to existing photos; longer settings
 -- never extend a previously promised image lifetime.
 IF effective_retention IS NOT NULL THEN UPDATE clocker_punch_photos SET expires_at=LEAST(expires_at,performed_at+make_interval(days=>effective_retention))
   WHERE workspace_id=p_workspace AND expires_at IS NOT NULL; END IF;
 RETURN jsonb_build_object('version',revision,'enabled',policy.enabled,'events',policy.events,
   'retentionDays',policy.retention_days,'failureBehavior',policy.failure_behavior);
END;
$$;
CREATE FUNCTION clocker_photo_save_notice(p_workspace text,p_actor text,p_expected integer,p_contact text,p_instructions text) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE profile clocker_photo_notice_profiles%ROWTYPE; revision integer;
BEGIN
 PERFORM id FROM workspaces WHERE id=p_workspace FOR UPDATE;
 SELECT * INTO profile FROM clocker_photo_notice_profiles WHERE workspace_id=p_workspace FOR UPDATE;
 IF COALESCE(profile.version,0) IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'clocker_photo_POLICY_CHANGED'; END IF;
 revision=p_expected+1;
 INSERT INTO clocker_photo_notice_profiles(workspace_id,version,assistance_contact,assistance_instructions,updated_by)
 VALUES(p_workspace,revision,p_contact,p_instructions,p_actor)
 ON CONFLICT(workspace_id) DO UPDATE SET version=EXCLUDED.version,assistance_contact=EXCLUDED.assistance_contact,
  assistance_instructions=EXCLUDED.assistance_instructions,updated_by=EXCLUDED.updated_by,updated_at=clock_timestamp();
 SELECT * INTO profile FROM clocker_photo_notice_profiles WHERE workspace_id=p_workspace;
 INSERT INTO clocker_photo_notice_revisions(workspace_id,version,actor_employee_id,profile)
 VALUES(p_workspace,revision,p_actor,jsonb_build_object('version',revision,'assistanceContact',profile.assistance_contact,
  'assistanceInstructions',profile.assistance_instructions));
 RETURN jsonb_build_object('version',revision,'assistanceContact',profile.assistance_contact,'assistanceInstructions',profile.assistance_instructions);
END;
$$;
CREATE FUNCTION clocker_photo_remove(p_workspace text,p_actor text,p_device text,p_command uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE photo clocker_punch_photos%ROWTYPE;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM employees e JOIN locations employee_home ON employee_home.id=e.primary_location_id WHERE employee_home.workspace_id=p_workspace AND e.id=p_actor AND e.active AND e.role='OWNER') THEN
  RAISE EXCEPTION 'clocker_photo_AUTH_REQUIRED'; END IF;
 SELECT * INTO photo FROM clocker_punch_photos WHERE workspace_id=p_workspace AND device_id=p_device AND command_id=p_command FOR UPDATE;
 IF NOT FOUND OR photo.state IN ('not_required','expired') OR photo.expires_at<=clock_timestamp() THEN
  RETURN jsonb_build_object('reference',jsonb_build_object('deviceId',p_device,'commandId',p_command),'state','unavailable','removedAt',NULL); END IF;
 IF photo.state='removed' THEN
  RETURN jsonb_build_object('reference',jsonb_build_object('deviceId',p_device,'commandId',p_command),'state','already_removed','removedAt',photo.removed_at); END IF;
 UPDATE clocker_punch_photos SET state='removed',jpeg=NULL,sha256=NULL,width=NULL,height=NULL,removed_at=clock_timestamp(),removed_by=p_actor
  WHERE workspace_id=p_workspace AND device_id=p_device AND command_id=p_command RETURNING * INTO photo;
 INSERT INTO clocker_photo_access_events(workspace_id,actor_employee_id,device_id,command_id,kind)
  VALUES(p_workspace,p_actor,p_device,p_command,'OWNER_REMOVED');
 RETURN jsonb_build_object('reference',jsonb_build_object('deviceId',p_device,'commandId',p_command),'state','removed','removedAt',photo.removed_at);
END;
$$;
REVOKE ALL ON FUNCTION clocker_photo_status_value(clocker_punch_photos),clocker_photo_capture_expectation(text,text,uuid),
 clocker_photo_upload(text,text,text,integer,uuid,bytea,text,integer,integer,integer,integer),
 clocker_photo_missing(text,text,text,integer,uuid,text),clocker_photo_save_policy(text,text,integer,boolean,text[],integer,text),
 clocker_photo_binding_guard(),clocker_photo_save_notice(text,text,integer,text,text),clocker_photo_remove(text,text,text,uuid) FROM PUBLIC;
CREATE POLICY clocker_photo_policy_scope ON clocker_photo_policy USING(workspace_id=current_setting('nevora.clocker.photo_workspace',true)) WITH CHECK(workspace_id=current_setting('nevora.clocker.photo_workspace',true));
CREATE POLICY clocker_photo_policy_revisions_scope ON clocker_photo_policy_revisions USING(workspace_id=current_setting('nevora.clocker.photo_workspace',true)) WITH CHECK(workspace_id=current_setting('nevora.clocker.photo_workspace',true));
CREATE POLICY clocker_punch_photos_scope ON clocker_punch_photos USING(workspace_id=current_setting('nevora.clocker.photo_workspace',true)) WITH CHECK(workspace_id=current_setting('nevora.clocker.photo_workspace',true));
CREATE POLICY clocker_photo_access_events_scope ON clocker_photo_access_events USING(workspace_id=current_setting('nevora.clocker.photo_workspace',true)) WITH CHECK(workspace_id=current_setting('nevora.clocker.photo_workspace',true));
CREATE POLICY clocker_photo_notice_profiles_scope ON clocker_photo_notice_profiles USING(workspace_id=current_setting('nevora.clocker.photo_workspace',true)) WITH CHECK(workspace_id=current_setting('nevora.clocker.photo_workspace',true));
CREATE POLICY clocker_photo_notice_revisions_scope ON clocker_photo_notice_revisions USING(workspace_id=current_setting('nevora.clocker.photo_workspace',true)) WITH CHECK(workspace_id=current_setting('nevora.clocker.photo_workspace',true));
CREATE POLICY clocker_photo_review_events_scope ON clocker_photo_review_events USING(workspace_id=current_setting('nevora.clocker.photo_workspace',true)) WITH CHECK(workspace_id=current_setting('nevora.clocker.photo_workspace',true));
COMMIT;
