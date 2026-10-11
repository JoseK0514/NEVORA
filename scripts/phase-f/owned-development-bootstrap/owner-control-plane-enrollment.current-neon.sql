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
-- UNUSED local original-installer source. No rows/grants/operator authority seeded.
DO $owner_enrollment_prerequisite$
DECLARE principal oid;
BEGIN
 principal:=nevora_tenancy.assert_controlled_new_tenant_installer();
 IF (SELECT encode(sha256(convert_to(prosrc,'UTF8')),'hex') FROM pg_proc WHERE oid='nevora_tenancy.create_controlled_new_disabled_subject(jsonb)'::regprocedure)
 IS DISTINCT FROM 'd2e8a974e4b927b5d976f075654aaef7d2984b537952a818c64ff04db26f662a'
 OR (SELECT encode(sha256(convert_to(prosrc,'UTF8')),'hex') FROM pg_proc WHERE oid='nevora_tenancy.owner_control_source_snapshot(text,text)'::regprocedure)
 IS DISTINCT FROM '5359fafc68c53504ef90a6e18b9b9c1f66fbec391830c235c2181a1521ddc86b'
 THEN RAISE EXCEPTION 'owner_enrollment_source_prerequisite' USING ERRCODE='55000'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class WHERE relnamespace='nevora_tenancy'::regnamespace AND relname IN('owner_control_basis_receipt','owner_control_enrollment_receipt'))
 OR EXISTS(SELECT 1 FROM pg_proc WHERE pronamespace='nevora_tenancy'::regnamespace AND proname IN('lock_controlled_owner_enrollment_sources','guard_controlled_owner_enrollment','produce_controlled_initial_owner_basis','enroll_controlled_owner_purpose'))
 THEN RAISE EXCEPTION 'owner_enrollment_already_installed' USING ERRCODE='42723'; END IF;
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE (n.nspname,c.relname) IN
 (('nevora_tenancy','owner_control_purpose_grant'),('nevora_tenancy','owner_control_claim_budget'),('nevora_tenancy','controlled_new_subject_creation')) AND c.relowner<>principal)
 THEN RAISE EXCEPTION 'owner_enrollment_parent_owner' USING ERRCODE='42501'; END IF;
END $owner_enrollment_prerequisite$;
CREATE TABLE nevora_tenancy.owner_control_basis_receipt(
 basis_id uuid PRIMARY KEY, operation_id uuid NOT NULL UNIQUE, database_oid oid NOT NULL,
 installer_oid oid NOT NULL, installer_profile jsonb NOT NULL CHECK(jsonb_typeof(installer_profile)='object'),
 creator_request_id uuid UNIQUE REFERENCES nevora_tenancy.controlled_new_subject_creation(request_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 basis_kind text NOT NULL CHECK(basis_kind IN('BOOTSTRAPPED_INITIAL_OWNER','RESTORED_RETAINED_OWNER')),
 basis_receipt_reference text NOT NULL UNIQUE CHECK(basis_receipt_reference<>''),
 workspace_id text NOT NULL REFERENCES public.workspaces(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 employee_id text NOT NULL, workspace_incarnation int8 NOT NULL CHECK(workspace_incarnation>0),
 source_version timestamptz NOT NULL, source_snapshot jsonb NOT NULL CHECK(jsonb_typeof(source_snapshot)='object'),
 source_command_sha256 text NOT NULL CHECK(source_command_sha256~'^[a-f0-9]{64}$'),
 causal_receipt jsonb NOT NULL CHECK(jsonb_typeof(causal_receipt)='object'),
 setup_stage text NOT NULL CHECK(setup_stage IN('AWAITING_VERIFIED_OWNER','AWAITING_OWNER_REVERIFICATION')),
 issued_at timestamptz NOT NULL,
 FOREIGN KEY(workspace_id,employee_id) REFERENCES public.employees(workspace_id,id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 CHECK((basis_kind='BOOTSTRAPPED_INITIAL_OWNER')=(creator_request_id IS NOT NULL)),
 CHECK((basis_kind='BOOTSTRAPPED_INITIAL_OWNER' AND setup_stage='AWAITING_VERIFIED_OWNER') OR
       (basis_kind='RESTORED_RETAINED_OWNER' AND setup_stage='AWAITING_OWNER_REVERIFICATION'))
);
CREATE TABLE nevora_tenancy.owner_control_enrollment_receipt(
 request_id uuid PRIMARY KEY REFERENCES nevora_tenancy.owner_control_purpose_grant(request_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 basis_id uuid NOT NULL UNIQUE REFERENCES nevora_tenancy.owner_control_basis_receipt(basis_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 operation_id uuid NOT NULL UNIQUE,database_oid oid NOT NULL,installer_oid oid NOT NULL,
 grant_sha256 text NOT NULL CHECK(grant_sha256~'^[a-f0-9]{64}$'),budget_sha256 text NOT NULL CHECK(budget_sha256~'^[a-f0-9]{64}$'),
 source_sha256 text NOT NULL CHECK(source_sha256~'^[a-f0-9]{64}$'),enrolled_at timestamptz NOT NULL
);
CREATE FUNCTION nevora_tenancy.guard_controlled_owner_enrollment() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $immutable$
BEGIN RAISE EXCEPTION 'owner_enrollment_receipt_immutable' USING ERRCODE='55000'; END $immutable$;
CREATE TRIGGER owner_basis_row_immutable BEFORE UPDATE OR DELETE ON nevora_tenancy.owner_control_basis_receipt FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.guard_controlled_owner_enrollment();
CREATE TRIGGER owner_basis_truncate_immutable BEFORE TRUNCATE ON nevora_tenancy.owner_control_basis_receipt FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.guard_controlled_owner_enrollment();
CREATE TRIGGER owner_enrollment_row_immutable BEFORE UPDATE OR DELETE ON nevora_tenancy.owner_control_enrollment_receipt FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.guard_controlled_owner_enrollment();
CREATE TRIGGER owner_enrollment_truncate_immutable BEFORE TRUNCATE ON nevora_tenancy.owner_control_enrollment_receipt FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.guard_controlled_owner_enrollment();
CREATE FUNCTION nevora_tenancy.lock_controlled_owner_enrollment_sources() RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=pg_catalog AS $locks$
BEGIN
 PERFORM nevora_tenancy.assert_controlled_new_tenant_installer();
 LOCK TABLE public."availability_exceptions" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."availability_windows" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."break_entries" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."calendar_clock" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."calendar_operations" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."calendar_removals" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."calendar_subscriptions" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."clocker_break_type_events" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."clocker_break_types" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."clocker_command_ledger" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."clocker_device_credentials" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."clocker_device_events" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."clocker_devices" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."clocker_employee_clock_state" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."clocker_pin_configuration" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."clocker_pin_events" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."clocker_pin_events_tenant_ownership" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."clocker_pin_limits" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."clocker_pin_sessions" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."communication_lifecycle" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."communication_operations" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."communication_receipts" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."communication_recipients" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."communication_revisions" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."communications" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."coverage_window_position_requirements" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."employee_attention_operations" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."employee_attention_receipts" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."employee_clocker_pins" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."employee_credentials" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."employee_location_eligibility" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."employee_positions" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."employee_scheduling_settings" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."employee_sessions" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."employees" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."location_coverage_windows" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."location_staffing_settings" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."locations" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."notifications" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."password_recovery_limits" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."password_recovery_proofs" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."payroll_export_profile_revisions" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."payroll_export_receipts" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."positions" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."push_deliveries" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."push_subscriptions" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."schedule_acknowledgements" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."schedule_generation_exclusions" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."schedule_publication_revision_shifts" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."schedule_publication_revision_shifts_tenant_ownership" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."schedule_publication_revisions" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."schedule_template_shifts" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."schedule_templates" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."schedule_week_settings" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."schedules" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."shift_callouts" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."shift_change_events" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."shift_change_operations" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."shift_change_participation" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."shift_exchanges" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."shifts" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."time_correction_adjustments" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."time_correction_events" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."time_correction_requests" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."time_entries" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."time_off_requests" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."timecard_revisions" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."weekly_availability_submissions" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."weekly_availability_windows" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE public."workspaces" IN ACCESS EXCLUSIVE MODE;
 LOCK TABLE nevora_tenancy.owner_control_basis_receipt,nevora_tenancy.owner_control_enrollment_receipt,
 nevora_tenancy.owner_control_purpose_grant,nevora_tenancy.owner_control_claim_budget,
 nevora_tenancy.owner_control_grant_revocation,nevora_tenancy.owner_control_verification_claim,
 nevora_tenancy.workspace_incarnation_counter,nevora_tenancy.portal_authority,nevora_tenancy.portal_session_issuance IN SHARE ROW EXCLUSIVE MODE;
END $locks$;
-- The native child creates NEW source rows. A disabled or legacy row cannot mint a basis.
-- Root supplies independently retained operation/command/ownership evidence before DML.
CREATE FUNCTION nevora_tenancy.produce_controlled_initial_owner_basis(p_basis uuid,p_operation uuid,p_reference text,p_command jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=pg_catalog AS $initial$
DECLARE principal oid;db oid;receipt jsonb;snapshot jsonb;profile jsonb;created nevora_tenancy.controlled_new_subject_creation%ROWTYPE;basis_clock timestamptz;
BEGIN
 PERFORM nevora_tenancy.lock_controlled_owner_enrollment_sources();principal:=nevora_tenancy.assert_controlled_new_tenant_installer();
 SELECT oid INTO STRICT db FROM pg_database WHERE datname=current_database();
 IF p_basis IS NULL OR p_operation IS NULL OR p_reference IS NULL OR p_reference='' OR p_command IS NULL
 OR p_command->>'role' IS DISTINCT FROM 'OWNER' OR p_command->'workspaceActive' IS DISTINCT FROM 'true'::jsonb
 OR p_command->'employeeActive' IS DISTINCT FROM 'true'::jsonb OR p_command->'locationActive' IS DISTINCT FROM 'true'::jsonb
 OR EXISTS(SELECT 1 FROM public.workspaces WHERE id=p_command->>'workspaceId')
 OR EXISTS(SELECT 1 FROM public.employees WHERE id=p_command->>'employeeId')
 OR EXISTS(SELECT 1 FROM nevora_tenancy.owner_control_basis_receipt WHERE basis_id=p_basis OR operation_id=p_operation OR basis_receipt_reference=p_reference)
 THEN RAISE EXCEPTION 'owner_initial_fresh_command_required' USING ERRCODE='42501'; END IF;
 receipt:=nevora_tenancy.create_controlled_new_disabled_subject(p_command);
 SELECT * INTO STRICT created FROM nevora_tenancy.controlled_new_subject_creation WHERE request_id=(p_command->>'requestId')::uuid;
 snapshot:=nevora_tenancy.owner_control_source_snapshot(created.workspace_id,created.employee_id);
 IF receipt->>'format' IS DISTINCT FROM 'CONTROLLED_NEW_DISABLED_SUBJECT_RECEIPT_V1'
 OR receipt->>'workspaceId' IS DISTINCT FROM created.workspace_id OR receipt->>'employeeId' IS DISTINCT FROM created.employee_id
 OR snapshot IS NULL OR snapshot->'portal'->>'portal_state' IS DISTINCT FROM 'DISABLED'
 OR snapshot->'portal'->>'proof_provenance' IS DISTINCT FROM 'UNVERIFIED'
 OR snapshot->>'credential' IS NOT NULL OR snapshot->'sessions' IS DISTINCT FROM '[]'::jsonb OR snapshot->'live' IS DISTINCT FROM '[]'::jsonb
 OR (SELECT count(*) FROM public.employees WHERE workspace_id=created.workspace_id)<>1
 OR (SELECT count(*) FROM public.locations WHERE workspace_id=created.workspace_id)<>1
 OR EXISTS(SELECT 1 FROM nevora_tenancy.owner_control_purpose_grant WHERE workspace_id=created.workspace_id)
 THEN RAISE EXCEPTION 'owner_initial_causal_state_invalid' USING ERRCODE='55000'; END IF;
 SELECT jsonb_build_object('role',to_jsonb(r)-'rolpassword','memberships',COALESCE((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.roleid,m.member,m.grantor) FROM pg_auth_members m WHERE m.member=r.oid),'[]'::jsonb)) INTO STRICT profile FROM pg_roles r WHERE r.oid=principal;
 basis_clock:=clock_timestamp();
 INSERT INTO nevora_tenancy.owner_control_basis_receipt VALUES(p_basis,p_operation,db,principal,profile,created.request_id,
 'BOOTSTRAPPED_INITIAL_OWNER',p_reference,created.workspace_id,created.employee_id,created.workspace_incarnation,
 (SELECT updated_at FROM public.workspaces WHERE id=created.workspace_id),snapshot,
 encode(sha256(convert_to(p_command::text,'UTF8')),'hex'),receipt,'AWAITING_VERIFIED_OWNER',basis_clock);
 RETURN jsonb_build_object('format','CONTROLLED_OWNER_BASIS_IN_OWNING_TRANSACTION_V1','basisId',p_basis::text,
 'operationId',p_operation::text,'basisKind','BOOTSTRAPPED_INITIAL_OWNER','basisReceiptReference',p_reference,
 'workspaceId',created.workspace_id,'employeeId',created.employee_id,'workspaceIncarnation',created.workspace_incarnation::text,
 'setupStage','AWAITING_VERIFIED_OWNER','createdAt',receipt->>'createdAt','issuedAt',basis_clock::text,
 'state','NOT_ACKNOWLEDGED_NOT_PORTAL_PROOF');
END $initial$;
CREATE FUNCTION nevora_tenancy.enroll_controlled_owner_purpose(p_basis uuid,p_grant jsonb,p_budgets jsonb)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path=pg_catalog AS $enroll$
DECLARE b nevora_tenancy.owner_control_basis_receipt%ROWTYPE;g nevora_tenancy.owner_control_purpose_grant%ROWTYPE;
 budget nevora_tenancy.owner_control_claim_budget%ROWTYPE;principal oid;db oid;profile jsonb;whole jsonb;budget_whole jsonb:='[]'::jsonb;now_at timestamptz;enrollment_clock timestamptz;i int4;
 keys text[]:=ARRAY['request_id','operation_id','operator_id','operator_grant_id','operator_grant_version','operator_credential_digest','environment','purpose','request_digest','payload_digest','operator_identity_reference','subject_identity_reference','verified_identity_reference','method','method_evidence_reference','registered_channel_reference','channel_binding_sha256','global_budget_id','network_budget_id','subject_budget_id','scope_resolved_at','scope_expires_at'];
 budget_keys text[]:=ARRAY['budget_id','dimension','scope_key','window_start','window_end','maximum_claims','approved_evidence_reference'];
BEGIN
 PERFORM nevora_tenancy.lock_controlled_owner_enrollment_sources();principal:=nevora_tenancy.assert_controlled_new_tenant_installer();
 SELECT oid INTO STRICT db FROM pg_database WHERE datname=current_database();
 IF p_grant IS NULL OR jsonb_typeof(p_grant) IS DISTINCT FROM 'object' OR p_budgets IS NULL OR jsonb_typeof(p_budgets) IS DISTINCT FROM 'array'
 OR jsonb_array_length(p_budgets)<>3
 OR (SELECT array_agg(k ORDER BY k COLLATE "C") FROM jsonb_object_keys(p_grant) k) IS DISTINCT FROM (SELECT array_agg(k ORDER BY k COLLATE "C") FROM unnest(keys) k)
 OR EXISTS(SELECT 1 FROM unnest(keys) k WHERE jsonb_typeof(p_grant->k) IS DISTINCT FROM 'string' AND NOT(k IN('registered_channel_reference','channel_binding_sha256') AND jsonb_typeof(p_grant->k)='null'))
 THEN RAISE EXCEPTION 'owner_enrollment_independent_input_invalid' USING ERRCODE='22023'; END IF;
 SELECT * INTO STRICT b FROM nevora_tenancy.owner_control_basis_receipt WHERE basis_id=p_basis FOR SHARE;
 SELECT jsonb_build_object('role',to_jsonb(r)-'rolpassword','memberships',COALESCE((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.roleid,m.member,m.grantor) FROM pg_auth_members m WHERE m.member=r.oid),'[]'::jsonb)) INTO STRICT profile FROM pg_roles r WHERE r.oid=principal;
 IF b.database_oid<>db OR b.installer_oid<>principal OR b.installer_profile IS DISTINCT FROM profile
 OR nevora_tenancy.owner_control_source_snapshot(b.workspace_id,b.employee_id) IS DISTINCT FROM b.source_snapshot
 OR (p_grant->>'purpose'='INITIAL_OWNER_VERIFICATION' AND b.basis_kind<>'BOOTSTRAPPED_INITIAL_OWNER')
 OR (p_grant->>'purpose'='OWNER_ACCESS_REVERIFICATION' AND b.basis_kind<>'RESTORED_RETAINED_OWNER')
 OR p_grant->>'purpose' NOT IN('INITIAL_OWNER_VERIFICATION','OWNER_ACCESS_REVERIFICATION')
 OR EXISTS(SELECT 1 FROM nevora_tenancy.owner_control_enrollment_receipt WHERE basis_id=p_basis)
 THEN RAISE EXCEPTION 'owner_enrollment_genuine_current_basis_required' USING ERRCODE='42501'; END IF;
 whole:=p_grant||jsonb_build_object('operator_role_oid',principal,'operator_role_name',session_user::text,'operator_native_profile',profile,
 'workspace_id',b.workspace_id,'subject_employee_id',b.employee_id,'workspace_incarnation',b.workspace_incarnation::text,'source_version',b.source_version::text,
 'basis_kind',b.basis_kind,'basis_receipt_reference',b.basis_receipt_reference,'expected_source',b.source_snapshot);
 g:=jsonb_populate_record(NULL::nevora_tenancy.owner_control_purpose_grant,whole);now_at:=clock_timestamp();
 IF now_at<g.scope_resolved_at OR now_at>=g.scope_expires_at OR EXISTS(SELECT 1 FROM nevora_tenancy.owner_control_grant_revocation WHERE request_id=g.request_id)
 THEN RAISE EXCEPTION 'owner_enrollment_current_explicit_scope_required' USING ERRCODE='42501'; END IF;
 FOR i IN 0..2 LOOP
 IF jsonb_typeof(p_budgets->i) IS DISTINCT FROM 'object'
 OR (SELECT array_agg(k ORDER BY k COLLATE "C") FROM jsonb_object_keys(p_budgets->i) k) IS DISTINCT FROM (SELECT array_agg(k ORDER BY k COLLATE "C") FROM unnest(budget_keys) k)
 OR EXISTS(SELECT 1 FROM unnest(budget_keys) k WHERE jsonb_typeof(p_budgets->i->k) IS DISTINCT FROM 'string')
 THEN RAISE EXCEPTION 'owner_enrollment_explicit_budget_invalid' USING ERRCODE='22023'; END IF;
 budget:=jsonb_populate_record(NULL::nevora_tenancy.owner_control_claim_budget,p_budgets->i);
 IF budget.budget_id<>(ARRAY[g.global_budget_id,g.network_budget_id,g.subject_budget_id])[i+1]
 OR budget.dimension<>(ARRAY['GLOBAL','NETWORK','SUBJECT'])[i+1]
 OR now_at<budget.window_start OR now_at>=budget.window_end OR budget.maximum_claims<=0
 OR (i=2 AND budget.scope_key<>jsonb_build_array(b.workspace_id,b.employee_id)::text)
 THEN RAISE EXCEPTION 'owner_enrollment_budget_binding_invalid' USING ERRCODE='42501'; END IF;
 -- Reuse only byte/value-identical native budgets. Never adopt or overwrite a changed limit/window.
 IF EXISTS(SELECT 1 FROM nevora_tenancy.owner_control_claim_budget WHERE budget_id=budget.budget_id) THEN
 IF (SELECT to_jsonb(x) FROM nevora_tenancy.owner_control_claim_budget x WHERE x.budget_id=budget.budget_id FOR UPDATE) IS DISTINCT FROM to_jsonb(budget)
 THEN RAISE EXCEPTION 'owner_enrollment_existing_budget_conflict' USING ERRCODE='42501'; END IF;
 ELSE INSERT INTO nevora_tenancy.owner_control_claim_budget SELECT (budget).*; END IF;
 budget_whole:=budget_whole||jsonb_build_array(to_jsonb(budget));
 END LOOP;
 INSERT INTO nevora_tenancy.owner_control_purpose_grant SELECT (g).*;
 -- Reuse the original native admission: current identity/noSelf/method/source and exact purpose are not reimplemented as a new capability policy.
 PERFORM nevora_tenancy.require_controlled_owner_verifier_admission(g.request_id);
 enrollment_clock:=clock_timestamp();
 INSERT INTO nevora_tenancy.owner_control_enrollment_receipt VALUES(g.request_id,p_basis,g.operation_id,db,principal,
 encode(sha256(convert_to(to_jsonb(g)::text,'UTF8')),'hex'),encode(sha256(convert_to(budget_whole::text,'UTF8')),'hex'),
 encode(sha256(convert_to(b.source_snapshot::text,'UTF8')),'hex'),enrollment_clock);
 RETURN jsonb_build_object('format','CONTROLLED_OWNER_ENROLLMENT_IN_OWNING_TRANSACTION_V1','requestId',g.request_id::text,
 'basisId',p_basis::text,'purpose',g.purpose,'workspaceId',g.workspace_id,'employeeId',g.subject_employee_id,
 'enrolledAt',enrollment_clock::text,
 'state','NOT_ACKNOWLEDGED_NOT_PORTAL_PROOF');
END $enroll$;
ALTER TABLE nevora_tenancy.owner_control_basis_receipt ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.owner_control_basis_receipt FORCE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.owner_control_enrollment_receipt ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.owner_control_enrollment_receipt FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE nevora_tenancy.owner_control_basis_receipt,nevora_tenancy.owner_control_enrollment_receipt FROM PUBLIC;
REVOKE ALL ON FUNCTION nevora_tenancy.guard_controlled_owner_enrollment() FROM PUBLIC;
REVOKE ALL ON FUNCTION nevora_tenancy.lock_controlled_owner_enrollment_sources() FROM PUBLIC;
REVOKE ALL ON FUNCTION nevora_tenancy.produce_controlled_initial_owner_basis(uuid,uuid,text,jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION nevora_tenancy.enroll_controlled_owner_purpose(uuid,jsonb,jsonb) FROM PUBLIC;
DO $closed_acl$
BEGIN
 IF EXISTS(SELECT 1 FROM pg_class c CROSS JOIN LATERAL aclexplode(COALESCE(c.relacl,acldefault('r',c.relowner))) a
 WHERE c.relnamespace='nevora_tenancy'::regnamespace AND c.relname IN('owner_control_basis_receipt','owner_control_enrollment_receipt') AND a.grantee<>c.relowner)
 OR EXISTS(SELECT 1 FROM pg_attribute v JOIN pg_class c ON c.oid=v.attrelid CROSS JOIN LATERAL aclexplode(v.attacl) a WHERE c.relnamespace='nevora_tenancy'::regnamespace AND c.relname IN('owner_control_basis_receipt','owner_control_enrollment_receipt') AND a.grantee<>c.relowner)
 OR EXISTS(SELECT 1 FROM pg_proc f CROSS JOIN LATERAL aclexplode(COALESCE(f.proacl,acldefault('f',f.proowner))) a WHERE f.pronamespace='nevora_tenancy'::regnamespace AND f.proname IN('guard_controlled_owner_enrollment','lock_controlled_owner_enrollment_sources','produce_controlled_initial_owner_basis','enroll_controlled_owner_purpose') AND a.grantee<>f.proowner)
 THEN RAISE EXCEPTION 'owner_enrollment_acl_invalid' USING ERRCODE='55000'; END IF;
END $closed_acl$;
COMMIT;
