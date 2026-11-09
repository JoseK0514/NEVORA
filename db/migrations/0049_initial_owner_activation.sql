BEGIN;
ALTER TABLE onboarding_owner_grants ADD COLUMN email_fingerprint text NOT NULL DEFAULT repeat('0',64) CHECK(email_fingerprint ~ '^[a-f0-9]{64}$');
ALTER TABLE onboarding_owner_grants ADD COLUMN claim_attempts integer NOT NULL DEFAULT 0 CHECK(claim_attempts BETWEEN 0 AND 10);
-- APP cannot read grant custody. The fixed-search-path definer admits only the
-- registered APP login and the exact live initial Owner, after parent locks.
CREATE FUNCTION onboarding_owner_claim(p_workspace text,p_environment text,p_incarnation bigint,p_digest text,p_operation uuid,p_command text,p_hash text DEFAULT NULL)
RETURNS TABLE(state text,employee_id text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pg_temp AS $$
DECLARE a public.onboarding_workspace_identity%ROWTYPE; o public.onboarding_initial_owner%ROWTYPE; e public.employees%ROWTYPE; g public.onboarding_owner_grants%ROWTYPE; r public.onboarding_owner_activation_receipts%ROWTYPE; c_time timestamptz;
BEGIN
 IF p_workspace IS NULL OR p_environment IS NULL OR p_environment NOT IN('test','development','production') OR p_incarnation IS NULL OR p_incarnation<=0 OR p_digest IS NULL OR p_digest !~ '^[a-f0-9]{64}$' OR p_operation IS NULL OR p_command IS NULL OR p_command !~ '^[a-f0-9]{64}$' THEN RETURN QUERY SELECT 'invalid'::text,NULL::text; RETURN; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.onboarding_runtime_roles rr WHERE rr.kind='APP' AND rr.login_role=session_user) THEN RAISE EXCEPTION 'initial_owner_access_denied'; END IF;
 SELECT * INTO a FROM public.onboarding_workspace_identity WHERE singleton AND workspace_id=p_workspace FOR SHARE;
 IF NOT FOUND OR a.environment<>p_environment OR a.incarnation<>p_incarnation OR a.lifecycle NOT IN('OWNER_ACTIVATION_REQUIRED','ACTIVE') THEN RETURN QUERY SELECT 'invalid'::text,NULL::text; RETURN; END IF;
 PERFORM w.id FROM public.workspaces w WHERE w.id=p_workspace AND w.singleton AND w.active FOR NO KEY UPDATE;
 IF NOT FOUND THEN RETURN QUERY SELECT 'invalid'::text,NULL::text; RETURN; END IF;
 SELECT ee.* INTO e FROM public.employees ee JOIN public.onboarding_initial_owner oo ON oo.employee_id=ee.id WHERE oo.workspace_id=p_workspace FOR UPDATE OF ee;
 SELECT * INTO o FROM public.onboarding_initial_owner WHERE workspace_id=p_workspace FOR UPDATE;
 SELECT * INTO g FROM public.onboarding_owner_grants WHERE token_digest=p_digest AND workspace_id=p_workspace FOR UPDATE;
 IF NOT FOUND OR g.registration_id<>o.registration_id OR g.incarnation<>p_incarnation THEN RETURN QUERY SELECT 'invalid'::text,NULL::text; RETURN; END IF;
 SELECT * INTO r FROM public.onboarding_owner_activation_receipts WHERE operation_id=p_operation;
 IF FOUND THEN
  IF r.workspace_id=p_workspace AND r.grant_id=g.id AND r.employee_id=e.id AND r.command_hash=p_command AND o.state='ACTIVATED' AND e.active AND e.role='OWNER' AND EXISTS(SELECT 1 FROM public.employee_credentials cc WHERE cc.employee_id=e.id AND cc.password_updated_at=r.credential_updated_at) THEN RETURN QUERY SELECT 'activated'::text,e.id;
  ELSE RETURN QUERY SELECT 'conflict'::text,NULL::text; END IF;
  RETURN;
 END IF;
 IF a.lifecycle<>'OWNER_ACTIVATION_REQUIRED' OR o.state<>'PENDING' OR e.active OR e.role<>'OWNER' OR e.email IS NULL OR g.email_fingerprint<>encode(sha256(convert_to(lower(trim(e.email)),'UTF8')),'hex') OR e.updated_at<>g.employee_updated_at OR g.revision<>o.grant_revision OR g.revoked_at IS NOT NULL OR g.consumed_at IS NOT NULL OR g.expires_at<=clock_timestamp() OR EXISTS(SELECT 1 FROM public.employee_credentials cc WHERE cc.employee_id=e.id) OR NOT EXISTS(SELECT 1 FROM public.locations l WHERE l.id=e.primary_location_id AND l.workspace_id=p_workspace AND l.active) THEN RETURN QUERY SELECT 'invalid'::text,NULL::text; RETURN; END IF;
 IF p_hash IS NULL THEN
  IF g.claim_attempts>=10 THEN RETURN QUERY SELECT 'limited'::text,NULL::text; RETURN; END IF;
  UPDATE public.onboarding_owner_grants SET claim_attempts=claim_attempts+1 WHERE id=g.id;
  RETURN QUERY SELECT 'admitted'::text,NULL::text; RETURN;
 END IF;
 IF p_hash !~ '^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$' OR p_command !~ '^[a-f0-9]{64}$' OR g.claim_attempts=0 THEN RAISE EXCEPTION 'initial_owner_invalid_hash'; END IF;
 INSERT INTO public.employee_credentials(employee_id,password_hash,must_change_password) VALUES(e.id,p_hash,false) RETURNING password_updated_at INTO c_time;
 UPDATE public.employees SET active=true,updated_at=clock_timestamp() WHERE id=e.id;
 UPDATE public.onboarding_owner_grants SET consumed_at=clock_timestamp() WHERE id=g.id;
 UPDATE public.onboarding_owner_grants SET revoked_at=clock_timestamp() WHERE workspace_id=p_workspace AND id<>g.id AND consumed_at IS NULL AND revoked_at IS NULL;
 UPDATE public.onboarding_initial_owner SET state='ACTIVATED',activated_at=clock_timestamp() WHERE workspace_id=p_workspace;
 INSERT INTO public.onboarding_owner_activation_receipts(operation_id,workspace_id,grant_id,employee_id,command_hash,credential_updated_at) VALUES(p_operation,p_workspace,g.id,e.id,p_command,c_time);
 RETURN QUERY SELECT 'activated'::text,e.id;
END $$;
REVOKE ALL ON FUNCTION onboarding_owner_claim(text,text,bigint,text,uuid,text,text) FROM PUBLIC;
-- Grants for a fresh company are installed by the provisioner after the roles
-- exist. Upgrade operator must grant only its actual registered APP role.
COMMIT;
