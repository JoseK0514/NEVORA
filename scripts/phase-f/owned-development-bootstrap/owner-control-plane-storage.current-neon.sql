-- SOURCE ONLY / UNUSED. No operator enrollment, seeds, grants, policies or role creation.
-- ROOT must authenticate the original operator and independently compile/install
-- the exact grant, attestation, budget and source/profile receipts. Stored rows
-- are not a substitute for that authentication. Existing APP resolve_provisioner
-- is NOT activated by this artifact. No credential/Portal/session/LIVE writer.
BEGIN ISOLATION LEVEL READ COMMITTED;
WITH catalog_fence_key AS MATERIALIZED (
  SELECT (
    'x'::pg_catalog.text OPERATOR(pg_catalog.||) pg_catalog.substr(
      pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
        'nevora.runtime.catalog-fence.v1:'::pg_catalog.text OPERATOR(pg_catalog.||) database_identity.oid::pg_catalog.text,
        'UTF8'::pg_catalog.name)), 'hex'::pg_catalog.text), 1, 16)
  )::pg_catalog.bit(64)::pg_catalog.int8 AS key
  FROM pg_catalog.pg_database AS database_identity
  WHERE database_identity.datname OPERATOR(pg_catalog.=) pg_catalog.current_database()
)
SELECT pg_catalog.pg_advisory_xact_lock(key) AS catalog_fence FROM catalog_fence_key;
SET LOCAL search_path = pg_catalog;
DO $prerequisite$
DECLARE n pg_catalog.oid; r pg_catalog.record;
BEGIN
 SELECT oid INTO n FROM pg_catalog.pg_namespace WHERE nspname='nevora_tenancy';
 IF n IS NULL THEN RAISE EXCEPTION 'owner_control_schema_missing' USING ERRCODE='3F000'; END IF;
 IF (SELECT nspowner FROM pg_catalog.pg_namespace WHERE oid=n)<>(SELECT oid FROM pg_catalog.pg_roles WHERE rolname=current_user)
 THEN RAISE EXCEPTION 'owner_control_schema_not_owned' USING ERRCODE='42501'; END IF;
 FOR r IN SELECT * FROM (VALUES('public','workspaces'),('public','employees'),('public','employee_credentials'),
 ('public','employee_sessions'),('nevora_tenancy','workspace_incarnation_counter'),('nevora_tenancy','portal_authority'),
 ('nevora_tenancy','portal_session_issuance'),('nevora_tenancy','runtime_role_binding')) v(schema_name,relation_name) LOOP
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace x ON x.oid=c.relnamespace
 WHERE x.nspname=r.schema_name AND c.relname=r.relation_name AND c.relkind='r' AND c.relpersistence='p' AND NOT c.relispartition
 AND c.relowner=(SELECT oid FROM pg_catalog.pg_roles WHERE rolname=current_user))
 THEN RAISE EXCEPTION 'owner_control_source_not_owned' USING ERRCODE='55000'; END IF;
 END LOOP;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_class WHERE relnamespace=n AND relname IN('owner_control_purpose_grant','owner_control_grant_revocation',
 'owner_control_claim_budget','owner_control_verification_claim')) OR EXISTS(SELECT 1 FROM pg_catalog.pg_proc WHERE pronamespace=n AND proname IN
 ('guard_owner_control_storage','owner_control_source_snapshot','require_controlled_owner_verifier_admission','resolve_controlled_owner_provisioner','issue_controlled_owner_verification_claim'))
 THEN RAISE EXCEPTION 'owner_control_already_installed' USING ERRCODE='42723'; END IF;
END $prerequisite$;
-- Physical original constraints/guard/profile preimages are independently pinned
-- by the retained installer capsule. This ownership guard is not whole admission.
CREATE TABLE nevora_tenancy.owner_control_purpose_grant(
 request_id pg_catalog.uuid PRIMARY KEY, operation_id pg_catalog.uuid NOT NULL UNIQUE,
 operator_id pg_catalog.text NOT NULL, operator_grant_id pg_catalog.text NOT NULL,
 operator_grant_version pg_catalog.text NOT NULL CHECK(operator_grant_version COLLATE pg_catalog."C" ~ '^[1-9][0-9]{0,77}$'),
 operator_role_oid pg_catalog.oid NOT NULL, operator_role_name pg_catalog.text NOT NULL,
 operator_credential_digest pg_catalog.text NOT NULL CHECK(operator_credential_digest COLLATE pg_catalog."C" ~ '^[a-f0-9]{64}$'),
 operator_native_profile pg_catalog.jsonb NOT NULL CHECK(pg_catalog.jsonb_typeof(operator_native_profile)='object'),
 environment pg_catalog.text NOT NULL CHECK(environment IN('local','test')),
 purpose pg_catalog.text NOT NULL CHECK(purpose IN('INITIAL_OWNER_VERIFICATION','OWNER_ACCESS_REVERIFICATION')),
 workspace_id pg_catalog.text NOT NULL REFERENCES public.workspaces(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 subject_employee_id pg_catalog.text NOT NULL,
 workspace_incarnation pg_catalog.int8 NOT NULL CHECK(workspace_incarnation>0),
 source_version pg_catalog.timestamptz NOT NULL,
 request_digest pg_catalog.text NOT NULL CHECK(request_digest COLLATE pg_catalog."C" ~ '^[a-f0-9]{64}$'),
 payload_digest pg_catalog.text NOT NULL CHECK(payload_digest COLLATE pg_catalog."C" ~ '^[a-f0-9]{64}$'),
 -- Independent root-retained identity and approved ownership/channel procedure.
 operator_identity_reference pg_catalog.text NOT NULL CHECK(operator_identity_reference<>''),
 subject_identity_reference pg_catalog.text NOT NULL CHECK(subject_identity_reference<>''),
 verified_identity_reference pg_catalog.text NOT NULL CHECK(verified_identity_reference<>''),
 method pg_catalog.text NOT NULL CHECK(method IN('REGISTERED_CHANNEL','ASSISTED')),
 method_evidence_reference pg_catalog.text NOT NULL CHECK(method_evidence_reference<>''),
 registered_channel_reference pg_catalog.text,channel_binding_sha256 pg_catalog.text,
 CHECK((method='REGISTERED_CHANNEL' AND registered_channel_reference IS NOT NULL AND registered_channel_reference<>'' AND channel_binding_sha256 IS NOT NULL AND channel_binding_sha256 COLLATE pg_catalog."C" ~ '^[a-f0-9]{64}$') OR
       (method='ASSISTED' AND registered_channel_reference IS NULL AND channel_binding_sha256 IS NULL)),
 basis_kind pg_catalog.text NOT NULL CHECK(basis_kind IN('BOOTSTRAPPED_INITIAL_OWNER','RESTORED_RETAINED_OWNER')),
 basis_receipt_reference pg_catalog.text NOT NULL CHECK(basis_receipt_reference<>''),
 global_budget_id pg_catalog.uuid NOT NULL,network_budget_id pg_catalog.uuid NOT NULL,subject_budget_id pg_catalog.uuid NOT NULL,
 -- A full current-source observation is retained BEFORE issuing the grant, never
 -- recaptured from changed state and adopted as an expected value during use.
 expected_source pg_catalog.jsonb NOT NULL CHECK(pg_catalog.jsonb_typeof(expected_source)='object'),
 scope_resolved_at pg_catalog.timestamptz NOT NULL,
 scope_expires_at pg_catalog.timestamptz NOT NULL,
 CHECK(scope_expires_at>scope_resolved_at),CHECK(operator_identity_reference<>subject_identity_reference),
 CHECK((purpose='INITIAL_OWNER_VERIFICATION' AND basis_kind='BOOTSTRAPPED_INITIAL_OWNER') OR
       (purpose='OWNER_ACCESS_REVERIFICATION' AND basis_kind='RESTORED_RETAINED_OWNER')),
 FOREIGN KEY(subject_employee_id,workspace_id) REFERENCES public.employees(id,workspace_id) ON UPDATE RESTRICT ON DELETE RESTRICT
);
CREATE TABLE nevora_tenancy.owner_control_grant_revocation(
 request_id pg_catalog.uuid PRIMARY KEY REFERENCES nevora_tenancy.owner_control_purpose_grant(request_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 revoked_at pg_catalog.timestamptz NOT NULL, evidence_reference pg_catalog.text NOT NULL CHECK(evidence_reference<>'')
);
-- No selected budget defaults. These three dimensions/limits/window are explicit
-- independently installed approved inputs. Absent rows deny before claim INSERT.
CREATE TABLE nevora_tenancy.owner_control_claim_budget(
 budget_id pg_catalog.uuid PRIMARY KEY,
 dimension pg_catalog.text NOT NULL CHECK(dimension IN('GLOBAL','NETWORK','SUBJECT')),
 scope_key pg_catalog.text NOT NULL CHECK(scope_key<>''),
 window_start pg_catalog.timestamptz NOT NULL,window_end pg_catalog.timestamptz NOT NULL CHECK(window_end>window_start),
 maximum_claims pg_catalog.int8 NOT NULL CHECK(maximum_claims>0),
 approved_evidence_reference pg_catalog.text NOT NULL CHECK(approved_evidence_reference<>''),
 UNIQUE(dimension,scope_key,window_start,window_end)
);
ALTER TABLE nevora_tenancy.owner_control_purpose_grant
 ADD FOREIGN KEY(global_budget_id) REFERENCES nevora_tenancy.owner_control_claim_budget(budget_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 ADD FOREIGN KEY(network_budget_id) REFERENCES nevora_tenancy.owner_control_claim_budget(budget_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 ADD FOREIGN KEY(subject_budget_id) REFERENCES nevora_tenancy.owner_control_claim_budget(budget_id) ON UPDATE RESTRICT ON DELETE RESTRICT;
CREATE TABLE nevora_tenancy.owner_control_verification_claim(
 token_hash pg_catalog.bpchar(64) PRIMARY KEY CHECK(token_hash::pg_catalog.text COLLATE pg_catalog."C" ~ '^[a-f0-9]{64}$'),
 request_id pg_catalog.uuid NOT NULL UNIQUE REFERENCES nevora_tenancy.owner_control_purpose_grant(request_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 issued_at pg_catalog.timestamptz NOT NULL,expires_at pg_catalog.timestamptz NOT NULL CHECK(expires_at=issued_at+INTERVAL '15 minutes'),
 global_budget_id pg_catalog.uuid NOT NULL REFERENCES nevora_tenancy.owner_control_claim_budget(budget_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 network_budget_id pg_catalog.uuid NOT NULL REFERENCES nevora_tenancy.owner_control_claim_budget(budget_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 subject_budget_id pg_catalog.uuid NOT NULL REFERENCES nevora_tenancy.owner_control_claim_budget(budget_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 used_at pg_catalog.timestamptz, CHECK(used_at IS NULL OR used_at>=issued_at)
);
CREATE FUNCTION nevora_tenancy.guard_owner_control_storage() RETURNS pg_catalog.trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $guard$
BEGIN
 IF TG_OP='UPDATE' AND TG_TABLE_NAME='owner_control_verification_claim' AND TG_LEVEL='ROW'
 AND OLD.used_at IS NULL AND NEW.used_at IS NOT NULL AND NEW.used_at>=OLD.issued_at AND NEW.used_at<OLD.expires_at
 AND pg_catalog.to_jsonb(NEW)-'used_at'=pg_catalog.to_jsonb(OLD)-'used_at' THEN RETURN NEW; END IF;
 RAISE EXCEPTION 'owner_control_identity_immutable' USING ERRCODE='55000';
END $guard$;
CREATE TRIGGER owner_control_grant_row BEFORE UPDATE OR DELETE ON nevora_tenancy.owner_control_purpose_grant FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.guard_owner_control_storage();
CREATE TRIGGER owner_control_grant_truncate BEFORE TRUNCATE ON nevora_tenancy.owner_control_purpose_grant FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.guard_owner_control_storage();
CREATE TRIGGER owner_control_revocation_row BEFORE UPDATE OR DELETE ON nevora_tenancy.owner_control_grant_revocation FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.guard_owner_control_storage();
CREATE TRIGGER owner_control_revocation_truncate BEFORE TRUNCATE ON nevora_tenancy.owner_control_grant_revocation FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.guard_owner_control_storage();
CREATE TRIGGER owner_control_budget_row BEFORE UPDATE OR DELETE ON nevora_tenancy.owner_control_claim_budget FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.guard_owner_control_storage();
CREATE TRIGGER owner_control_budget_truncate BEFORE TRUNCATE ON nevora_tenancy.owner_control_claim_budget FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.guard_owner_control_storage();
CREATE TRIGGER owner_control_claim_row BEFORE UPDATE OR DELETE ON nevora_tenancy.owner_control_verification_claim FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.guard_owner_control_storage();
CREATE TRIGGER owner_control_claim_truncate BEFORE TRUNCATE ON nevora_tenancy.owner_control_verification_claim FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.guard_owner_control_storage();
CREATE FUNCTION nevora_tenancy.owner_control_source_snapshot(w pg_catalog.text,e pg_catalog.text)
RETURNS pg_catalog.jsonb LANGUAGE sql VOLATILE SECURITY INVOKER SET search_path=pg_catalog AS $source$
 SELECT pg_catalog.jsonb_build_object('format','OWNER_CONTROL_SOURCE_V1',
 'workspace',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.to_jsonb(ws)::pg_catalog.text,'UTF8')),'hex'),
 'employee',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.to_jsonb(emp)::pg_catalog.text,'UTF8')),'hex'),
 'credential',CASE WHEN cr.employee_id IS NULL THEN NULL ELSE pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.to_jsonb(cr)::pg_catalog.text,'UTF8')),'hex') END,
 'incarnation',ct.incarnation::pg_catalog.text,'portal',pg_catalog.to_jsonb(pa),
 'sessions',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.to_jsonb(s)::pg_catalog.text,'UTF8')),'hex') ORDER BY s.token_hash::pg_catalog.text COLLATE pg_catalog."C") FROM public.employee_sessions s WHERE s.employee_id=emp.id),'[]'::pg_catalog.jsonb),
 'live',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(l) ORDER BY l.token_hash::pg_catalog.text COLLATE pg_catalog."C") FROM nevora_tenancy.portal_session_issuance l WHERE l.employee_id=emp.id AND l.workspace_id=ws.id),'[]'::pg_catalog.jsonb))
 FROM public.workspaces ws JOIN public.employees emp ON emp.workspace_id=ws.id
 JOIN nevora_tenancy.workspace_incarnation_counter ct ON ct.workspace_id=ws.id
 JOIN nevora_tenancy.portal_authority pa ON pa.workspace_id=ws.id AND pa.employee_id=emp.id
 LEFT JOIN public.employee_credentials cr ON cr.employee_id=emp.id
 WHERE ws.id=w AND pg_catalog.convert_to(ws.id,'UTF8')=pg_catalog.convert_to(w,'UTF8')
 AND emp.id=e AND pg_catalog.convert_to(emp.id,'UTF8')=pg_catalog.convert_to(e,'UTF8');
$source$;
CREATE FUNCTION nevora_tenancy.require_controlled_owner_verifier_admission(p_request pg_catalog.uuid)
RETURNS pg_catalog.jsonb LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=pg_catalog AS $admission$
DECLARE g nevora_tenancy.owner_control_purpose_grant%ROWTYPE; profile pg_catalog.jsonb;
 login pg_catalog.oid; now_at pg_catalog.timestamptz; ws public.workspaces%ROWTYPE;emp public.employees%ROWTYPE;
BEGIN
 IF pg_catalog.current_setting('transaction_isolation')<>'read committed' OR current_user<>session_user
 OR pg_catalog.current_setting('role')<>'none' OR pg_catalog.current_setting('session_replication_role')<>'origin'
 OR pg_catalog.current_setting('row_security')<>'on' OR pg_catalog.current_setting('server_version_num')<>'170011'
 OR pg_catalog.current_database()<>'nevora_f10_current_20261011'
 OR (SELECT oid FROM pg_catalog.pg_database WHERE datname=pg_catalog.current_database())<>73728
 OR session_user::text<>'fuel_scheduler_owner'
 THEN RAISE EXCEPTION 'owner_control_original_operator_required' USING ERRCODE='42501'; END IF;
 SELECT usesysid INTO login FROM pg_catalog.pg_stat_activity WHERE pid=pg_catalog.pg_backend_pid();
 SELECT pg_catalog.jsonb_build_object('role',pg_catalog.to_jsonb(r)-'rolpassword',
 'memberships',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(m) ORDER BY m.roleid,m.member,m.grantor) FROM pg_catalog.pg_auth_members m WHERE m.member=r.oid),'[]'::pg_catalog.jsonb))
 INTO profile FROM pg_catalog.pg_roles r WHERE r.oid=login AND r.rolname=session_user AND r.rolcanlogin AND (r.rolvaliduntil IS NULL OR pg_catalog.clock_timestamp()<r.rolvaliduntil);
 IF profile IS NULL OR SYSTEM_USER IS DISTINCT FROM 'md5:fuel_scheduler_owner' OR login<>16391
 OR pg_catalog.host(pg_catalog.inet_server_addr()) IS DISTINCT FROM '169.254.254.254'
 OR pg_catalog.inet_server_port() IS DISTINCT FROM 5432
 OR pg_catalog.shobj_description('73728'::pg_catalog.oid,'pg_database') IS DISTINCT FROM 'f10-owned:neon-development-current-20261011'
 OR NOT EXISTS(SELECT 1 FROM pg_roles r JOIN pg_database d ON d.datdba=r.oid
  JOIN pg_namespace n ON n.nspowner=r.oid AND n.nspname='nevora_tenancy'
  WHERE r.oid=login AND r.rolcanlogin AND NOT r.rolsuper AND r.rolbypassrls AND d.oid=73728)
 THEN RAISE EXCEPTION 'owner_control_original_operator_required' USING ERRCODE='42501'; END IF;
 -- Fixed lock protocol BEFORE reading the retained grant/source snapshot. The
 -- caller owns explicit RC + exclusive catalog fence FIRST; private enrollment
 -- binds the actual owning client/database/assigned-xid and complete catalog.
 LOCK TABLE public.workspaces,public.employees,public.employee_credentials,public.employee_sessions,
 nevora_tenancy.workspace_incarnation_counter,nevora_tenancy.portal_authority,nevora_tenancy.portal_session_issuance IN SHARE ROW EXCLUSIVE MODE;
 LOCK TABLE nevora_tenancy.owner_control_purpose_grant,nevora_tenancy.owner_control_grant_revocation,
 nevora_tenancy.owner_control_claim_budget,nevora_tenancy.owner_control_verification_claim IN SHARE ROW EXCLUSIVE MODE;
 SELECT * INTO g FROM nevora_tenancy.owner_control_purpose_grant WHERE request_id=p_request FOR SHARE;
 now_at:=pg_catalog.clock_timestamp();
 IF NOT FOUND OR g.operator_role_oid<>login OR g.operator_role_name<>session_user OR g.operator_native_profile<>profile
 OR now_at<g.scope_resolved_at OR now_at>=g.scope_expires_at OR EXISTS(SELECT 1 FROM nevora_tenancy.owner_control_grant_revocation WHERE request_id=g.request_id)
 THEN RAISE EXCEPTION 'owner_control_current_grant_required' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM nevora_tenancy.runtime_role_binding WHERE role_oid=login)
 THEN RAISE EXCEPTION 'owner_control_runtime_role_forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO ws FROM public.workspaces WHERE id=g.workspace_id;
 SELECT * INTO emp FROM public.employees WHERE id=g.subject_employee_id AND workspace_id=g.workspace_id;
 IF ws.id IS NULL OR emp.id IS NULL OR NOT ws.active OR NOT emp.active OR emp.role<>'OWNER'
 OR (g.method='REGISTERED_CHANNEL' AND g.channel_binding_sha256 IS DISTINCT FROM pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(emp.email,'UTF8')),'hex'))
 OR ws.updated_at<>g.source_version OR nevora_tenancy.owner_control_source_snapshot(g.workspace_id,g.subject_employee_id) IS DISTINCT FROM g.expected_source
 OR (g.expected_source->>'incarnation') IS DISTINCT FROM g.workspace_incarnation::pg_catalog.text
 OR (g.purpose='INITIAL_OWNER_VERIFICATION' AND (g.expected_source->'portal'->>'portal_state') IS DISTINCT FROM 'DISABLED')
 OR (g.purpose='OWNER_ACCESS_REVERIFICATION' AND NOT COALESCE((g.expected_source->'portal'->>'portal_state') IN('SUSPENDED','DISABLED'),false))
 THEN RAISE EXCEPTION 'owner_control_current_subject_required' USING ERRCODE='42501'; END IF;
 RETURN pg_catalog.jsonb_build_object('kind','PROVISIONER','operatorId',g.operator_id,'operatorGrantId',g.operator_grant_id,
 'operatorGrantVersion',g.operator_grant_version,'operatorCredentialDigest',g.operator_credential_digest,
 'environment',g.environment,'purpose',g.purpose,'workspaceId',g.workspace_id,'bootstrapNonce',NULL,
 'subjectEmployeeId',g.subject_employee_id,'workspaceIncarnation',g.workspace_incarnation::pg_catalog.text,
 'sourceVersion',g.source_version::pg_catalog.text,'verifiedIdentityReference',g.verified_identity_reference,
 'requestId',g.request_id::pg_catalog.text,'requestDigest',g.request_digest,'operationId',g.operation_id::pg_catalog.text,
 'payloadDigest',g.payload_digest,'resolvedAt',now_at::pg_catalog.text,'expiresAt',g.scope_expires_at::pg_catalog.text);
END $admission$;
-- The exact eight inputs reuse the existing resolver values, but this is the
-- ORIGINAL OPERATOR lane, NOT an installed APP resolve_provisioner issuer.
CREATE FUNCTION nevora_tenancy.resolve_controlled_owner_provisioner(op pg_catalog.text,credential pg_catalog.text,env pg_catalog.text,purpose_name pg_catalog.text,
 req pg_catalog.text,req_digest pg_catalog.text,operation pg_catalog.text,payload pg_catalog.text)
RETURNS pg_catalog.jsonb LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=pg_catalog AS $scope$
DECLARE f pg_catalog.jsonb;
BEGIN
 f:=nevora_tenancy.require_controlled_owner_verifier_admission(req::pg_catalog.uuid);
 IF (f->>'operatorId') IS DISTINCT FROM op OR (f->>'operatorCredentialDigest') IS DISTINCT FROM credential
 OR (f->>'environment') IS DISTINCT FROM env OR (f->>'purpose') IS DISTINCT FROM purpose_name OR (f->>'requestDigest') IS DISTINCT FROM req_digest
 OR (f->>'operationId') IS DISTINCT FROM operation OR (f->>'payloadDigest') IS DISTINCT FROM payload THEN RETURN NULL; END IF;
 RETURN f; -- no authorityCurrent fabricated, no private TS proof issued here
END $scope$;
CREATE FUNCTION nevora_tenancy.issue_controlled_owner_verification_claim(p_request pg_catalog.uuid,p_digest pg_catalog.text,
 p_global pg_catalog.uuid,p_network pg_catalog.uuid,p_subject pg_catalog.uuid)
RETURNS pg_catalog.jsonb LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=pg_catalog AS $claim$
DECLARE f pg_catalog.jsonb;b nevora_tenancy.owner_control_claim_budget%ROWTYPE;now_at pg_catalog.timestamptz; ids pg_catalog.uuid[];i pg_catalog.int4;
BEGIN
 IF p_request IS NULL OR p_global IS NULL OR p_network IS NULL OR p_subject IS NULL THEN RAISE EXCEPTION 'owner_control_claim_scope_invalid' USING ERRCODE='42501'; END IF;
 f:=nevora_tenancy.require_controlled_owner_verifier_admission(p_request);now_at:=pg_catalog.clock_timestamp();
 IF p_digest IS NULL OR p_digest COLLATE pg_catalog."C" !~ '^[a-f0-9]{64}$' OR now_at+INTERVAL '15 minutes'>(f->>'expiresAt')::pg_catalog.timestamptz
 THEN RAISE EXCEPTION 'owner_control_claim_scope_invalid' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM nevora_tenancy.owner_control_purpose_grant g WHERE g.request_id=p_request AND g.global_budget_id=p_global AND g.network_budget_id=p_network AND g.subject_budget_id=p_subject)
 THEN RAISE EXCEPTION 'owner_control_budget_binding_invalid' USING ERRCODE='42501'; END IF;
 ids:=ARRAY[p_global,p_network,p_subject];
 FOR i IN 1..3 LOOP
 SELECT * INTO b FROM nevora_tenancy.owner_control_claim_budget WHERE budget_id=ids[i] FOR UPDATE;
 IF NOT FOUND OR now_at<b.window_start OR now_at>=b.window_end OR b.dimension<>(ARRAY['GLOBAL','NETWORK','SUBJECT'])[i]
 OR (i=3 AND b.scope_key<>pg_catalog.jsonb_build_array(f->>'workspaceId',f->>'subjectEmployeeId')::pg_catalog.text)
 OR (SELECT pg_catalog.count(*) FROM nevora_tenancy.owner_control_verification_claim c WHERE
 (i=1 AND c.global_budget_id=b.budget_id) OR (i=2 AND c.network_budget_id=b.budget_id) OR (i=3 AND c.subject_budget_id=b.budget_id))>=b.maximum_claims
 THEN RAISE EXCEPTION 'owner_control_budget_required' USING ERRCODE='42501'; END IF;
 END LOOP;
 INSERT INTO nevora_tenancy.owner_control_verification_claim(token_hash,request_id,issued_at,expires_at,global_budget_id,network_budget_id,subject_budget_id)
 VALUES(p_digest::pg_catalog.bpchar(64),p_request,now_at,now_at+INTERVAL '15 minutes',p_global,p_network,p_subject);
 RETURN pg_catalog.jsonb_build_object('format','OWNER_VERIFICATION_CLAIM_IN_OWNING_TRANSACTION_V1','requestId',p_request::pg_catalog.text,'issuedAt',now_at::pg_catalog.text,'expiresAt',(now_at+INTERVAL '15 minutes')::pg_catalog.text);
END $claim$;
ALTER TABLE nevora_tenancy.owner_control_purpose_grant ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.owner_control_purpose_grant FORCE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.owner_control_grant_revocation ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.owner_control_grant_revocation FORCE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.owner_control_claim_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.owner_control_claim_budget FORCE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.owner_control_verification_claim ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.owner_control_verification_claim FORCE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA nevora_tenancy FROM PUBLIC;
REVOKE ALL ON TABLE nevora_tenancy.owner_control_purpose_grant,nevora_tenancy.owner_control_grant_revocation,nevora_tenancy.owner_control_claim_budget,nevora_tenancy.owner_control_verification_claim FROM PUBLIC;
REVOKE ALL ON FUNCTION nevora_tenancy.guard_owner_control_storage(),nevora_tenancy.owner_control_source_snapshot(pg_catalog.text,pg_catalog.text),
 nevora_tenancy.require_controlled_owner_verifier_admission(pg_catalog.uuid),nevora_tenancy.resolve_controlled_owner_provisioner(pg_catalog.text,pg_catalog.text,pg_catalog.text,pg_catalog.text,pg_catalog.text,pg_catalog.text,pg_catalog.text,pg_catalog.text),
 nevora_tenancy.issue_controlled_owner_verification_claim(pg_catalog.uuid,pg_catalog.text,pg_catalog.uuid,pg_catalog.uuid,pg_catalog.uuid) FROM PUBLIC;
DO $acl$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_class c CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,pg_catalog.acldefault('r',c.relowner))) a
 WHERE c.relnamespace='nevora_tenancy'::pg_catalog.regnamespace AND c.relname IN('owner_control_purpose_grant','owner_control_grant_revocation','owner_control_claim_budget','owner_control_verification_claim') AND (a.grantee<>c.relowner))
 OR EXISTS(SELECT 1 FROM pg_catalog.pg_attribute v JOIN pg_catalog.pg_class c ON c.oid=v.attrelid CROSS JOIN LATERAL pg_catalog.aclexplode(v.attacl) a
 WHERE c.relnamespace='nevora_tenancy'::pg_catalog.regnamespace AND c.relname IN('owner_control_purpose_grant','owner_control_grant_revocation','owner_control_claim_budget','owner_control_verification_claim') AND (a.grantee<>c.relowner))
 OR EXISTS(SELECT 1 FROM pg_catalog.pg_proc p CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
 WHERE p.pronamespace='nevora_tenancy'::pg_catalog.regnamespace AND p.proname IN('guard_owner_control_storage','owner_control_source_snapshot','require_controlled_owner_verifier_admission','resolve_controlled_owner_provisioner','issue_controlled_owner_verification_claim') AND (a.grantee<>p.proowner))
 THEN RAISE EXCEPTION 'owner_control_acl_invalid' USING ERRCODE='55000'; END IF;
END $acl$;
COMMIT;
