-- UNUSED LOCAL maintenance-only successor candidate. No installation ran.
-- ROOT authenticates its existing controller/lease/source/whole original plan
-- before executing this installer. Native equality is not that authorization.
-- This file installs EMPTY controls/functions; apply_controlled_new_tenant_cutover
-- is a separate explicit operation. No roles, grants, seeds or phase reopening.
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
SET LOCAL search_path=pg_catalog;
DO $fresh_new_tenant$
DECLARE owner_oid pg_catalog.oid; schema_oid pg_catalog.oid;
BEGIN
 SELECT r.oid INTO STRICT owner_oid FROM pg_catalog.pg_roles r
 WHERE r.rolname=current_user AND r.oid='16391'::pg_catalog.oid
   AND r.rolname='fuel_scheduler_owner' AND r.rolcanlogin AND r.rolbypassrls AND NOT r.rolsuper;
 SELECT n.oid INTO STRICT schema_oid FROM pg_catalog.pg_namespace n
 WHERE n.nspname='nevora_tenancy' AND n.nspowner=owner_oid;
 IF session_user IS DISTINCT FROM current_user OR pg_catalog.current_setting('role')<>'none'
   OR SYSTEM_USER IS DISTINCT FROM 'md5:fuel_scheduler_owner'
   OR pg_catalog.current_setting('server_version_num')<>'170011'
   OR pg_catalog.host(pg_catalog.inet_server_addr()) IS DISTINCT FROM '169.254.254.254'
   OR pg_catalog.inet_server_port() IS DISTINCT FROM 5432
   OR pg_catalog.shobj_description('73728'::pg_catalog.oid,'pg_database')
     IS DISTINCT FROM 'f10-owned:neon-development-current-20261011'
   OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_stat_activity a WHERE a.pid=pg_catalog.pg_backend_pid() AND a.usesysid=owner_oid)
   OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_database d WHERE d.datname=pg_catalog.current_database() AND d.datdba=owner_oid
     AND d.datname='nevora_f10_current_20261011' AND d.oid='73728'::pg_catalog.oid)
 THEN RAISE EXCEPTION 'new_tenant_installer_denied' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_class c WHERE c.relnamespace=schema_oid
     AND c.relname IN('controlled_new_tenant_cutover','controlled_source_write_frame','controlled_new_subject_creation'))
   OR EXISTS(SELECT 1 FROM pg_catalog.pg_proc p WHERE p.pronamespace=schema_oid AND p.proname IN(
     'assert_controlled_new_tenant_installer','consume_controlled_source_write',
     'guard_controlled_new_tenant_receipt','require_controlled_source_frame_consumed',
     'apply_controlled_new_tenant_cutover','create_controlled_new_disabled_subject'))
 THEN RAISE EXCEPTION 'new_tenant_already_installed' USING ERRCODE='42723'; END IF;
 -- The original all-table locked native104/collation/source comparison is an
 -- independently authenticated controller prerequisite, not reconstructed here.
 IF EXISTS(SELECT 1 FROM (VALUES
   ('public','workspaces'),('public','locations'),('public','employees'),
   ('public','employee_location_eligibility'),('public','calendar_clock'),
   ('nevora_tenancy','expansion_protocol'),('nevora_tenancy','owned_table_contract'),
   ('nevora_tenancy','employee_login_identity'),('nevora_tenancy','workspace_locator'),
   ('nevora_tenancy','workspace_incarnation_counter'),('nevora_tenancy','portal_authority'),
   ('nevora_tenancy','capability_policy_definition'),('nevora_tenancy','workspace_capability_policy_installation')
 ) required(schema_name,relation_name) WHERE NOT EXISTS(
   SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
   WHERE n.nspname=required.schema_name AND c.relname=required.relation_name
     AND c.relkind='r' AND c.relpersistence='p' AND c.relowner=owner_oid))
 THEN RAISE EXCEPTION 'new_tenant_parent_invalid' USING ERRCODE='55000'; END IF;
END;
$fresh_new_tenant$;

CREATE TABLE nevora_tenancy.controlled_new_tenant_cutover(
 singleton pg_catalog.bool PRIMARY KEY CHECK(singleton),
 epoch pg_catalog.int8 NOT NULL UNIQUE CHECK(epoch>0),
 database_oid pg_catalog.oid NOT NULL,
 installer_oid pg_catalog.oid NOT NULL,
 original_manifest pg_catalog.text NOT NULL CHECK(original_manifest~'^[a-f0-9]{64}$'),
 original_registry pg_catalog.text NOT NULL CHECK(original_registry~'^[a-f0-9]{64}$'),
 original_singleton_constraint pg_catalog.jsonb NOT NULL,
 original_write_fence_source pg_catalog.text NOT NULL,
 original_identity_guard_source pg_catalog.text NOT NULL,
 successor_write_fence_source pg_catalog.text NOT NULL,
 successor_identity_guard_source pg_catalog.text NOT NULL,
 calendar_stamp_source pg_catalog.text NOT NULL,
 installed_at pg_catalog.timestamptz NOT NULL
);
CREATE TABLE nevora_tenancy.controlled_source_write_frame(
 database_oid pg_catalog.oid NOT NULL,
 installer_oid pg_catalog.oid NOT NULL,
 backend_pid pg_catalog.int4 NOT NULL,
 transaction_id pg_catalog.xid8 NOT NULL,
 request_id pg_catalog.uuid NOT NULL,
 relation_oid pg_catalog.oid NOT NULL,
 operation pg_catalog.text NOT NULL CHECK(operation IN('INSERT','UPDATE')),
 trigger_depth pg_catalog.int4 NOT NULL CHECK(trigger_depth IN(1,2)),
 expected_old pg_catalog.jsonb,
 expected_new pg_catalog.jsonb NOT NULL,
 statement_claimed pg_catalog.bool NOT NULL,
 PRIMARY KEY(database_oid,backend_pid,transaction_id,relation_oid),
 CHECK((operation='UPDATE')=(expected_old IS NOT NULL))
);
CREATE TABLE nevora_tenancy.controlled_new_subject_creation(
 request_id pg_catalog.uuid PRIMARY KEY,
 cutover_epoch pg_catalog.int8 NOT NULL REFERENCES nevora_tenancy.controlled_new_tenant_cutover(epoch) ON UPDATE RESTRICT ON DELETE RESTRICT,
 workspace_id pg_catalog.text NOT NULL REFERENCES public.workspaces(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 employee_id pg_catalog.text NOT NULL UNIQUE,
 location_id pg_catalog.text NOT NULL,
 workspace_incarnation pg_catalog.int8 NOT NULL CHECK(workspace_incarnation>0),
 authorization_version pg_catalog.int8 NOT NULL CHECK(authorization_version>0),
 portal_access_version pg_catalog.int8 NOT NULL CHECK(portal_access_version>0),
 policy_id pg_catalog.text COLLATE pg_catalog."C" NOT NULL,
 policy_revision pg_catalog.int8 NOT NULL CHECK(policy_revision>0),
 installation_epoch pg_catalog.int8 NOT NULL CHECK(installation_epoch>0),
 creation_kind pg_catalog.text NOT NULL CHECK(creation_kind='CONTROLLED_NEW_DISABLED_SUBJECT'),
 created_at pg_catalog.timestamptz NOT NULL,
 FOREIGN KEY(workspace_id,employee_id) REFERENCES public.employees(workspace_id,id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 FOREIGN KEY(workspace_id,location_id) REFERENCES public.locations(workspace_id,id) ON UPDATE RESTRICT ON DELETE RESTRICT,
 FOREIGN KEY(policy_id,policy_revision) REFERENCES nevora_tenancy.capability_policy_definition(policy_id,revision) ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE FUNCTION nevora_tenancy.assert_controlled_new_tenant_installer()
RETURNS pg_catalog.oid LANGUAGE plpgsql VOLATILE PARALLEL UNSAFE SECURITY INVOKER
SET search_path=pg_catalog
AS $new_tenant_installer$
DECLARE principal pg_catalog.oid; database_oid pg_catalog.oid; key pg_catalog.int8;
BEGIN
 SELECT r.oid INTO STRICT principal FROM pg_catalog.pg_roles r
 WHERE r.rolname=session_user AND r.oid='16391'::pg_catalog.oid
   AND r.rolname='fuel_scheduler_owner' AND r.rolcanlogin AND r.rolbypassrls AND NOT r.rolsuper;
 SELECT d.oid INTO STRICT database_oid FROM pg_catalog.pg_database d
 WHERE d.datname=pg_catalog.current_database() AND d.datdba=principal
   AND d.datname='nevora_f10_current_20261011' AND d.oid='73728'::pg_catalog.oid;
 IF current_user IS DISTINCT FROM session_user OR pg_catalog.current_setting('role')<>'none'
   OR pg_catalog.current_setting('transaction_isolation')<>'read committed'
   OR SYSTEM_USER IS DISTINCT FROM 'md5:fuel_scheduler_owner'
   OR pg_catalog.current_setting('server_version_num')<>'170011'
   OR pg_catalog.host(pg_catalog.inet_server_addr()) IS DISTINCT FROM '169.254.254.254'
   OR pg_catalog.inet_server_port() IS DISTINCT FROM 5432
   OR pg_catalog.shobj_description('73728'::pg_catalog.oid,'pg_database')
     IS DISTINCT FROM 'f10-owned:neon-development-current-20261011'
   OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_stat_activity a WHERE a.pid=pg_catalog.pg_backend_pid() AND a.usesysid=principal)
   OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_namespace n WHERE n.nspname='nevora_tenancy' AND n.nspowner=principal)
 THEN RAISE EXCEPTION 'new_tenant_installer_denied' USING ERRCODE='42501'; END IF;
 key:=('x'||pg_catalog.substr(pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
   'nevora.runtime.catalog-fence.v1:'||database_oid::pg_catalog.text,'UTF8')),'hex'),1,16))::pg_catalog.bit(64)::pg_catalog.int8;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_locks l WHERE l.locktype='advisory' AND l.database=database_oid
   AND l.pid=pg_catalog.pg_backend_pid() AND l.granted AND l.mode='ExclusiveLock' AND l.objsubid=1
   AND l.classid=((key>>32)&4294967295)::pg_catalog.oid AND l.objid=(key&4294967295)::pg_catalog.oid)
 THEN RAISE EXCEPTION 'new_tenant_catalog_fence_required' USING ERRCODE='42501'; END IF;
 RETURN principal;
END;
$new_tenant_installer$;

-- Private dependency; PUBLIC and runtime EXECUTE are absent. A malicious
-- superuser can rewrite controls: this is the cooperative root-owned LOCAL lane.
-- No G/V/APP/WORKER, GUC, presented role, approval flag or caller SQL admission.
CREATE FUNCTION nevora_tenancy.consume_controlled_source_write(
 p_statement pg_catalog.bool,p_relation pg_catalog.oid,p_operation pg_catalog.text,
 p_depth pg_catalog.int4,p_new pg_catalog.jsonb,p_old pg_catalog.jsonb)
RETURNS pg_catalog.bool LANGUAGE plpgsql VOLATILE PARALLEL UNSAFE SECURITY INVOKER
SET search_path=pg_catalog
AS $controlled_source_write$
DECLARE frame nevora_tenancy.controlled_source_write_frame%ROWTYPE;
 control nevora_tenancy.controlled_new_tenant_cutover%ROWTYPE;
 principal pg_catalog.oid; clock_row pg_catalog.jsonb;
BEGIN
 -- Ordinary invocations have no frame and follow the ORIGINAL guard body.
 SELECT * INTO frame FROM nevora_tenancy.controlled_source_write_frame f
 WHERE f.backend_pid=pg_catalog.pg_backend_pid() AND f.transaction_id=pg_catalog.pg_current_xact_id()
   AND f.relation_oid=p_relation;
 IF NOT FOUND THEN RETURN false; END IF;
 principal:=nevora_tenancy.assert_controlled_new_tenant_installer();
 SELECT * INTO STRICT control FROM nevora_tenancy.controlled_new_tenant_cutover WHERE singleton FOR SHARE;
 IF frame.database_oid<>control.database_oid OR frame.installer_oid<>principal OR control.installer_oid<>principal
   OR frame.operation<>p_operation OR frame.trigger_depth<>p_depth
   OR (SELECT p.prosrc FROM pg_catalog.pg_proc p WHERE p.oid='nevora_tenancy.source_write_fence()'::pg_catalog.regprocedure) IS DISTINCT FROM control.successor_write_fence_source
   OR (SELECT p.prosrc FROM pg_catalog.pg_proc p WHERE p.oid='nevora_tenancy.source_identity_guard()'::pg_catalog.regprocedure) IS DISTINCT FROM control.successor_identity_guard_source
   OR (SELECT p.prosrc FROM pg_catalog.pg_proc p WHERE p.oid='public.nevora_calendar_source_stamp()'::pg_catalog.regprocedure) IS DISTINCT FROM control.calendar_stamp_source
 THEN RAISE EXCEPTION 'controlled_source_frame_denied' USING ERRCODE='42501'; END IF;
 IF p_statement THEN
   IF frame.statement_claimed OR p_new IS NOT NULL OR p_old IS NOT NULL THEN
     RAISE EXCEPTION 'controlled_source_frame_reused' USING ERRCODE='42501'; END IF;
   UPDATE nevora_tenancy.controlled_source_write_frame SET statement_claimed=true
   WHERE database_oid=frame.database_oid AND backend_pid=frame.backend_pid AND transaction_id=frame.transaction_id AND relation_oid=frame.relation_oid;
   RETURN true;
 END IF;
 IF NOT frame.statement_claimed THEN RAISE EXCEPTION 'controlled_source_statement_required' USING ERRCODE='42501'; END IF;
 IF p_relation='public.calendar_clock'::pg_catalog.regclass THEN
   IF p_operation='INSERT' THEN
    IF p_depth<>1 OR p_old IS NOT NULL OR p_new IS DISTINCT FROM frame.expected_new
    OR p_new->>'workspace_id' IS NULL OR (p_new->>'serial')::int4<>0 OR p_new->'singleton' IS DISTINCT FROM 'true'::jsonb
    OR (p_new->>'modified_at')::timestamptz IS DISTINCT FROM transaction_timestamp()
    THEN RAISE EXCEPTION 'controlled_tenant_clock_genesis_changed' USING ERRCODE='23514'; END IF;
   ELSE
   IF p_operation<>'UPDATE' OR p_depth<>2 OR p_old IS DISTINCT FROM frame.expected_old
     OR p_new-'serial'-'modified_at' IS DISTINCT FROM p_old-'serial'-'modified_at'
     OR (p_new->>'serial')::pg_catalog.int4<>(p_old->>'serial')::pg_catalog.int4+1
     OR (p_new->>'modified_at')::pg_catalog.timestamptz<=(p_old->>'modified_at')::pg_catalog.timestamptz
   THEN RAISE EXCEPTION 'controlled_calendar_stamp_changed' USING ERRCODE='23514'; END IF;
   END IF;
 ELSIF p_relation='public.locations'::pg_catalog.regclass THEN
   SELECT pg_catalog.to_jsonb(c) INTO STRICT clock_row FROM public.calendar_clock c WHERE singleton AND c.workspace_id=p_new->>'workspace_id';
   IF p_operation<>'INSERT' OR p_old IS NOT NULL
     OR p_new-'calendar_serial'-'calendar_modified_at' IS DISTINCT FROM frame.expected_new-'calendar_serial'-'calendar_modified_at'
     OR p_new->'calendar_serial' IS DISTINCT FROM clock_row->'serial'
     OR p_new->'calendar_modified_at' IS DISTINCT FROM clock_row->'modified_at'
   THEN RAISE EXCEPTION 'controlled_location_stamp_changed' USING ERRCODE='23514'; END IF;
 ELSE
   IF p_operation<>'INSERT' OR p_old IS NOT NULL OR p_new IS DISTINCT FROM frame.expected_new
     OR p_relation NOT IN('public.workspaces'::pg_catalog.regclass,'public.employees'::pg_catalog.regclass,
       'public.employee_location_eligibility'::pg_catalog.regclass)
   THEN RAISE EXCEPTION 'controlled_source_row_changed' USING ERRCODE='23514'; END IF;
 END IF;
 DELETE FROM nevora_tenancy.controlled_source_write_frame WHERE database_oid=frame.database_oid
   AND backend_pid=frame.backend_pid AND transaction_id=frame.transaction_id AND relation_oid=frame.relation_oid;
 RETURN true;
END;
$controlled_source_write$;

CREATE FUNCTION nevora_tenancy.require_controlled_source_frame_consumed()
RETURNS pg_catalog.trigger LANGUAGE plpgsql VOLATILE PARALLEL UNSAFE SECURITY INVOKER
SET search_path=pg_catalog AS $source_frame_consumed$
BEGIN
 IF EXISTS(SELECT 1 FROM nevora_tenancy.controlled_source_write_frame f
   WHERE f.database_oid=NEW.database_oid AND f.backend_pid=NEW.backend_pid AND f.transaction_id=NEW.transaction_id)
 THEN RAISE EXCEPTION 'controlled_source_frame_unconsumed' USING ERRCODE='55000'; END IF;
 RETURN NULL;
END;
$source_frame_consumed$;
CREATE CONSTRAINT TRIGGER controlled_source_frame_consumed AFTER INSERT ON nevora_tenancy.controlled_source_write_frame
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.require_controlled_source_frame_consumed();
CREATE FUNCTION nevora_tenancy.guard_controlled_new_tenant_receipt()
RETURNS pg_catalog.trigger LANGUAGE plpgsql VOLATILE PARALLEL UNSAFE SECURITY INVOKER
SET search_path=pg_catalog AS $new_tenant_receipt_immutable$
BEGIN RAISE EXCEPTION 'controlled_new_tenant_receipt_immutable' USING ERRCODE='23514'; END;
$new_tenant_receipt_immutable$;
CREATE TRIGGER controlled_cutover_row_immutable BEFORE UPDATE OR DELETE ON nevora_tenancy.controlled_new_tenant_cutover
FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.guard_controlled_new_tenant_receipt();
CREATE TRIGGER controlled_cutover_truncate_immutable BEFORE TRUNCATE ON nevora_tenancy.controlled_new_tenant_cutover
FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.guard_controlled_new_tenant_receipt();
CREATE TRIGGER controlled_new_subject_row_immutable BEFORE UPDATE OR DELETE ON nevora_tenancy.controlled_new_subject_creation
FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.guard_controlled_new_tenant_receipt();
CREATE TRIGGER controlled_new_subject_truncate_immutable BEFORE TRUNCATE ON nevora_tenancy.controlled_new_subject_creation
FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.guard_controlled_new_tenant_receipt();

CREATE FUNCTION nevora_tenancy.apply_controlled_new_tenant_cutover(p_epoch pg_catalog.int8,p_original_manifest pg_catalog.text)
RETURNS pg_catalog.jsonb LANGUAGE plpgsql VOLATILE PARALLEL UNSAFE SECURITY INVOKER
SET search_path=pg_catalog
AS $controlled_new_cutover$
DECLARE principal pg_catalog.oid; database_oid pg_catalog.oid; singleton_att pg_catalog.int2;
 unique_key record; key_count pg_catalog.int8; protocol nevora_tenancy.expansion_protocol%ROWTYPE;
 write_source pg_catalog.text; identity_source pg_catalog.text; calendar_source pg_catalog.text;
BEGIN
 principal:=nevora_tenancy.assert_controlled_new_tenant_installer();
 IF p_epoch IS NULL OR p_epoch<=0 OR p_original_manifest IS NULL OR p_original_manifest !~ '^[a-f0-9]{64}$'
   OR EXISTS(SELECT 1 FROM nevora_tenancy.controlled_new_tenant_cutover)
 THEN RAISE EXCEPTION 'controlled_cutover_not_fresh' USING ERRCODE='55000'; END IF;
 -- Controller must already have verified the genuine whole original plan/all68
 -- APPLIED/native104/source70 before changing its installed catalog. This hash
 -- comparison below binds integrity; it does not authenticate that producer.
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
 SELECT * INTO STRICT protocol FROM nevora_tenancy.expansion_protocol WHERE migration_id=26 FOR UPDATE;
 IF protocol.phase<>'FENCED' OR protocol.backfill_actor IS NOT NULL OR protocol.capture_manifest_sha256 IS DISTINCT FROM p_original_manifest
 THEN RAISE EXCEPTION 'controlled_cutover_original_applied_required' USING ERRCODE='55000'; END IF;
 SELECT oid INTO STRICT database_oid FROM pg_catalog.pg_database WHERE datname=pg_catalog.current_database();
 SELECT p.prosrc INTO STRICT write_source FROM pg_catalog.pg_proc p WHERE p.oid='nevora_tenancy.source_write_fence()'::pg_catalog.regprocedure
   AND p.proowner=principal AND p.prosecdef AND p.pronargs=0 AND p.prorettype='pg_catalog.trigger'::pg_catalog.regtype;
 SELECT p.prosrc INTO STRICT identity_source FROM pg_catalog.pg_proc p WHERE p.oid='nevora_tenancy.source_identity_guard()'::pg_catalog.regprocedure
   AND p.proowner=principal AND p.prosecdef AND p.pronargs=0 AND p.prorettype='pg_catalog.trigger'::pg_catalog.regtype;
 SELECT p.prosrc INTO STRICT calendar_source FROM pg_catalog.pg_proc p WHERE p.oid='public.nevora_calendar_source_stamp()'::pg_catalog.regprocedure
   AND p.proowner=principal AND NOT p.prosecdef AND p.pronargs=0 AND p.prorettype='pg_catalog.trigger'::pg_catalog.regtype;
 IF pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(write_source,'UTF8')),'hex')<>'28e074dcd7476327c72cc59ed4d97a6354ff90dfff17125a0f6adfe283653a45'
   OR pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(identity_source,'UTF8')),'hex')<>'2434a5c2e3e22460f2363f4cdab2d7230759c15f05405f6bd7e6936cab6793e6'
   OR pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(calendar_source,'UTF8')),'hex')<>'c234fe2be4a36ad308a0be94149a5f1b4266800d54e7dfc1bbc974541dbc4117'
 THEN RAISE EXCEPTION 'controlled_cutover_original_source_drift' USING ERRCODE='55000'; END IF;
 SELECT a.attnum INTO STRICT singleton_att FROM pg_catalog.pg_attribute a WHERE a.attrelid='public.workspaces'::pg_catalog.regclass
   AND a.attname='singleton' AND a.atttypid='pg_catalog.bool'::pg_catalog.regtype AND a.attnotnull
   AND a.atttypmod=-1 AND a.attidentity='' AND a.attgenerated='' AND a.atthasdef AND NOT a.attisdropped;
 IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_attrdef d WHERE d.adrelid='public.workspaces'::pg_catalog.regclass AND d.adnum=singleton_att
      AND pg_catalog.pg_get_expr(d.adbin,d.adrelid,false)='true')
   OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_constraint k WHERE k.conrelid='public.workspaces'::pg_catalog.regclass
      AND k.contype='c' AND k.convalidated AND NOT k.condeferrable AND NOT k.condeferred
      AND k.conkey=ARRAY[singleton_att]::pg_catalog.int2[] AND pg_catalog.pg_get_expr(k.conbin,k.conrelid,false)='singleton')
 THEN RAISE EXCEPTION 'controlled_cutover_singleton_column_drift' USING ERRCODE='55000'; END IF;
 SELECT pg_catalog.count(*) INTO key_count FROM pg_catalog.pg_constraint k
 WHERE k.conrelid='public.workspaces'::pg_catalog.regclass AND k.contype='u' AND k.conkey=ARRAY[singleton_att]::pg_catalog.int2[];
 IF key_count<>1 THEN RAISE EXCEPTION 'controlled_cutover_singleton_key_drift' USING ERRCODE='55000'; END IF;
 SELECT k.*,pg_catalog.to_jsonb(k) AS original_tuple INTO STRICT unique_key
 FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_index i ON i.indexrelid=k.conindid AND i.indrelid=k.conrelid
 JOIN pg_catalog.pg_class c ON c.oid=i.indexrelid JOIN pg_catalog.pg_am m ON m.oid=c.relam
 JOIN pg_catalog.pg_opclass o ON o.oid=i.indclass[0]
 WHERE k.conrelid='public.workspaces'::pg_catalog.regclass AND k.contype='u' AND k.conkey=ARRAY[singleton_att]::pg_catalog.int2[]
   AND k.convalidated AND NOT k.condeferrable AND NOT k.condeferred
   AND COALESCE((pg_catalog.to_jsonb(k)->>'conenforced')::pg_catalog.bool,true)
   AND i.indisunique AND i.indisvalid AND i.indisready AND i.indislive AND i.indimmediate
   AND NOT i.indisprimary AND NOT i.indnullsnotdistinct AND i.indnatts=1 AND i.indnkeyatts=1
   AND i.indkey[0]=singleton_att AND i.indcollation[0]=0 AND i.indoption[0]=0 AND i.indpred IS NULL AND i.indexprs IS NULL
   AND c.relkind='i' AND c.relpersistence='p' AND c.relowner=principal AND m.amname='btree'
   AND o.opcnamespace='pg_catalog'::pg_catalog.regnamespace AND o.opcname='bool_ops' AND o.opcintype='pg_catalog.bool'::pg_catalog.regtype;
 -- Fixed native relation; identifier comes solely from the validated native key.
 -- No CASCADE: any unexpected dependent object fails the whole transaction.
 EXECUTE pg_catalog.format('ALTER TABLE public.workspaces DROP CONSTRAINT %I',unique_key.conname);
 EXECUTE $cutover_fence_ddl$CREATE OR REPLACE FUNCTION nevora_tenancy.source_write_fence() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,nevora_tenancy AS $write_fence$
DECLARE state nevora_tenancy.expansion_protocol%ROWTYPE;
BEGIN
 -- BEGIN CONTROLLED_NEW_SOURCE_PREFIX_V1; original suffix remains byte exact.
 IF TG_OP='INSERT' OR (TG_RELID='public.calendar_clock'::pg_catalog.regclass AND TG_OP='UPDATE') THEN
  IF nevora_tenancy.consume_controlled_source_write(true,TG_RELID,TG_OP,pg_catalog.pg_trigger_depth(),NULL,NULL) THEN RETURN NULL; END IF;
 END IF;
 -- END CONTROLLED_NEW_SOURCE_PREFIX_V1.
 SELECT * INTO STRICT state FROM nevora_tenancy.expansion_protocol WHERE migration_id=26 FOR SHARE;
 IF state.phase='FENCED' AND TG_OP='TRUNCATE' THEN RAISE EXCEPTION 'f10_source_truncate_fenced' USING ERRCODE='55000'; END IF;
 IF state.phase='FENCED' AND
   (state.backfill_actor IS NULL OR state.backfill_actor::text<>session_user::text OR state.capture_manifest_sha256 IS NULL) THEN
  RAISE EXCEPTION 'f10_legacy_writes_fenced' USING ERRCODE='55000';
 END IF;
 RETURN NULL;
END;
$write_fence$;$cutover_fence_ddl$;
 EXECUTE $cutover_identity_ddl$CREATE OR REPLACE FUNCTION nevora_tenancy.source_identity_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,nevora_tenancy AS $identity_guard$
DECLARE state nevora_tenancy.expansion_protocol%ROWTYPE;
 rule nevora_tenancy.owned_table_contract%ROWTYPE;
 col name;
 old_row jsonb;
 new_row jsonb;
BEGIN
 -- BEGIN CONTROLLED_NEW_SOURCE_PREFIX_V1; original suffix remains byte exact.
 IF TG_OP='INSERT' OR (TG_RELID='public.calendar_clock'::pg_catalog.regclass AND TG_OP='UPDATE') THEN
  IF nevora_tenancy.consume_controlled_source_write(false,TG_RELID,TG_OP,pg_catalog.pg_trigger_depth(),
    pg_catalog.to_jsonb(NEW),CASE WHEN TG_OP='UPDATE' THEN pg_catalog.to_jsonb(OLD) ELSE NULL END) THEN RETURN NEW; END IF;
 END IF;
 -- END CONTROLLED_NEW_SOURCE_PREFIX_V1.
 SELECT * INTO STRICT state FROM nevora_tenancy.expansion_protocol WHERE migration_id=26;
 SELECT * INTO STRICT rule FROM nevora_tenancy.owned_table_contract WHERE table_name=TG_TABLE_NAME::name;
 IF state.phase='FENCED' THEN
  -- Only the separately bound operator may fill NULL direct metadata while all
  -- original values and identity columns remain byte/value stable. It cannot
  -- insert/delete original history or bypass existing append-only triggers.
  IF TG_OP<>'UPDATE' OR state.backfill_actor IS NULL OR state.backfill_actor::text<>session_user::text OR state.capture_manifest_sha256 IS NULL THEN
   RAISE EXCEPTION 'f10_source_write_not_backfill' USING ERRCODE='55000';
  END IF;
  IF rule.storage<>'DIRECT_IMMUTABLE' OR rule.anchor->>'kind'='ROOT' OR
    (to_jsonb(NEW)-'workspace_id') IS DISTINCT FROM (to_jsonb(OLD)-'workspace_id') THEN
   RAISE EXCEPTION 'f10_backfill_source_content_immutable' USING ERRCODE='23514';
  END IF;
 END IF;
 IF TG_OP='UPDATE' THEN
  old_row:=to_jsonb(OLD);new_row:=to_jsonb(NEW);
  FOREACH col IN ARRAY rule.primary_key_columns LOOP
   IF new_row->col::text IS DISTINCT FROM old_row->col::text THEN
    RAISE EXCEPTION 'f10_source_identity_immutable' USING ERRCODE='23514';
   END IF;
  END LOOP;
  IF rule.storage='IMMUTABLE_PARENT' THEN
   FOR col IN SELECT jsonb_array_elements_text(rule.anchor->'columns')::name LOOP
    IF new_row->col::text IS DISTINCT FROM old_row->col::text THEN
     RAISE EXCEPTION 'f10_parent_identity_immutable' USING ERRCODE='23514';
    END IF;
   END LOOP;
  END IF;
  IF rule.storage='DIRECT_IMMUTABLE' AND rule.anchor->>'kind'<>'ROOT' THEN
   IF old_row->>'workspace_id' IS NOT NULL AND new_row->>'workspace_id' IS DISTINCT FROM old_row->>'workspace_id' THEN
    RAISE EXCEPTION 'f10_workspace_immutable' USING ERRCODE='23514';
   ELSIF old_row->>'workspace_id' IS NULL AND new_row->>'workspace_id' IS NOT NULL AND state.phase<>'FENCED' THEN
    RAISE EXCEPTION 'f10_unproven_owner_fill' USING ERRCODE='23514';
   END IF;
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$identity_guard$;$cutover_identity_ddl$;
 INSERT INTO nevora_tenancy.controlled_new_tenant_cutover(singleton,epoch,database_oid,installer_oid,original_manifest,original_registry,
   original_singleton_constraint,original_write_fence_source,original_identity_guard_source,successor_write_fence_source,successor_identity_guard_source,calendar_stamp_source,installed_at)
 VALUES(true,p_epoch,database_oid,principal,p_original_manifest,protocol.registry_sha256,unique_key.original_tuple,write_source,identity_source,
   (SELECT prosrc FROM pg_catalog.pg_proc WHERE oid='nevora_tenancy.source_write_fence()'::pg_catalog.regprocedure),
   (SELECT prosrc FROM pg_catalog.pg_proc WHERE oid='nevora_tenancy.source_identity_guard()'::pg_catalog.regprocedure),calendar_source,pg_catalog.clock_timestamp());
 -- No protocol phase/actor/manifest/generation change; no source row rewrite.
 RETURN pg_catalog.jsonb_build_object('format','CONTROLLED_NEW_TENANT_CUTOVER_V1','epoch',p_epoch::pg_catalog.text,
   'originalManifest',p_original_manifest,'removedConstraintOid',unique_key.oid::pg_catalog.text,
   'state','IN_OWNING_TRANSACTION_NOT_ACKNOWLEDGED_OR_ENROLLED');
END;
$controlled_new_cutover$;
CREATE FUNCTION nevora_tenancy.create_controlled_new_disabled_subject(p_command pg_catalog.jsonb)
RETURNS pg_catalog.jsonb LANGUAGE plpgsql VOLATILE PARALLEL UNSAFE SECURITY INVOKER
-- public is required by the unchanged original calendar trigger's unqualified
-- calendar_clock UPDATE. Its CREATE ACL must remain closed, as below.
SET search_path=pg_catalog,public
AS $controlled_new_disabled_subject$
DECLARE principal pg_catalog.oid; database_oid pg_catalog.oid; request_id pg_catalog.uuid;
 control nevora_tenancy.controlled_new_tenant_cutover%ROWTYPE;
 protocol nevora_tenancy.expansion_protocol%ROWTYPE;
 w public.workspaces%ROWTYPE; l public.locations%ROWTYPE; e public.employees%ROWTYPE;
 eligibility public.employee_location_eligibility%ROWTYPE; clock_before pg_catalog.jsonb;
 ts pg_catalog.timestamptz; expected_keys pg_catalog.text[]:=ARRAY['format','requestId','cutoverEpoch','workspaceId','workspaceName','timeZone','workspaceActive','shiftChangePolicy','locator','locationId','locationName','locationShortName','clockerKey','locationActive','employeeId','employeeNumber','normalizedNumber','firstName','lastName','phone','email','role','employeeActive','workspaceIncarnation','authorizationVersion','portalAccessVersion','policyId','policyRevision','installationEpoch'];
BEGIN
 principal:=nevora_tenancy.assert_controlled_new_tenant_installer();
 IF p_command IS NULL OR pg_catalog.jsonb_typeof(p_command)<>'object'
   OR (SELECT pg_catalog.array_agg(k ORDER BY k COLLATE pg_catalog."C") FROM pg_catalog.jsonb_object_keys(p_command) k)
      IS DISTINCT FROM (SELECT pg_catalog.array_agg(k ORDER BY k COLLATE pg_catalog."C") FROM pg_catalog.unnest(expected_keys) k)
   OR p_command->>'format' IS DISTINCT FROM 'CONTROLLED_NEW_DISABLED_SUBJECT_COMMAND_V1'
   OR EXISTS(SELECT 1 FROM pg_catalog.unnest(ARRAY['format','requestId','cutoverEpoch','workspaceId','workspaceName','timeZone','locator','locationId','locationName','locationShortName','clockerKey','employeeId','employeeNumber','normalizedNumber','firstName','lastName','phone','role','workspaceIncarnation','authorizationVersion','portalAccessVersion','policyId','policyRevision','installationEpoch']::pg_catalog.text[]) k WHERE pg_catalog.jsonb_typeof(p_command->k) IS DISTINCT FROM 'string')
   OR EXISTS(SELECT 1 FROM pg_catalog.unnest(ARRAY['workspaceActive','locationActive','employeeActive']) k WHERE pg_catalog.jsonb_typeof(p_command->k) IS DISTINCT FROM 'boolean')
   OR pg_catalog.jsonb_typeof(p_command->'email') NOT IN('string','null')
   OR pg_catalog.jsonb_typeof(p_command->'shiftChangePolicy') NOT IN('object','null')
   OR EXISTS(SELECT 1 FROM pg_catalog.unnest(ARRAY['cutoverEpoch','workspaceIncarnation','authorizationVersion','portalAccessVersion','policyRevision','installationEpoch']::pg_catalog.text[]) k WHERE (p_command->>k) !~ '^[1-9][0-9]*$' OR (p_command->>k)::pg_catalog.int8<=0)
   OR (p_command->>'employeeNumber') IS DISTINCT FROM (p_command->>'normalizedNumber')
   OR (p_command->>'normalizedNumber') COLLATE pg_catalog."C" !~ '^[A-Z0-9][A-Z0-9._-]{0,127}$'
   OR (p_command->>'locator') COLLATE pg_catalog."C" !~ '^[a-z0-9-]{8,32}$'
   OR p_command->>'role' NOT IN('OWNER','MANAGER','LEAD','EMPLOYEE')
   OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_timezone_names z WHERE z.name=p_command->>'timeZone')
 THEN RAISE EXCEPTION 'controlled_new_subject_command_invalid' USING ERRCODE='22023'; END IF;
 request_id:=(p_command->>'requestId')::pg_catalog.uuid;
 -- True root custody is checked outside this function. The private native
 -- maintenance original LOGIN is not an ordinary JSON-authorized caller.
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
 SELECT * INTO STRICT control FROM nevora_tenancy.controlled_new_tenant_cutover WHERE singleton FOR SHARE;
 SELECT * INTO STRICT protocol FROM nevora_tenancy.expansion_protocol WHERE migration_id=26 FOR SHARE;
 SELECT oid INTO STRICT database_oid FROM pg_catalog.pg_database WHERE datname=pg_catalog.current_database();
 IF control.database_oid<>database_oid OR control.installer_oid<>principal OR control.epoch<>(p_command->>'cutoverEpoch')::pg_catalog.int8
   OR protocol.phase<>'FENCED' OR protocol.backfill_actor IS NOT NULL OR protocol.capture_manifest_sha256 IS DISTINCT FROM control.original_manifest
   OR protocol.registry_sha256 IS DISTINCT FROM control.original_registry
   OR EXISTS(SELECT 1 FROM nevora_tenancy.controlled_source_write_frame f WHERE f.backend_pid=pg_catalog.pg_backend_pid() AND f.transaction_id=pg_catalog.pg_current_xact_id())
   OR EXISTS(SELECT 1 FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_attribute a ON a.attrelid=k.conrelid AND a.attname='singleton'
      WHERE k.conrelid='public.workspaces'::pg_catalog.regclass AND k.contype='u' AND k.conkey=ARRAY[a.attnum]::pg_catalog.int2[])
   OR (SELECT prosrc FROM pg_catalog.pg_proc WHERE oid='nevora_tenancy.source_write_fence()'::pg_catalog.regprocedure) IS DISTINCT FROM control.successor_write_fence_source
   OR (SELECT prosrc FROM pg_catalog.pg_proc WHERE oid='nevora_tenancy.source_identity_guard()'::pg_catalog.regprocedure) IS DISTINCT FROM control.successor_identity_guard_source
   OR (SELECT prosrc FROM pg_catalog.pg_proc WHERE oid='public.nevora_calendar_source_stamp()'::pg_catalog.regprocedure) IS DISTINCT FROM control.calendar_stamp_source
 THEN RAISE EXCEPTION 'controlled_new_subject_enrollment_drift' USING ERRCODE='55000'; END IF;
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_namespace n CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(n.nspacl,pg_catalog.acldefault('n',n.nspowner))) a
   WHERE n.nspname='public' AND a.privilege_type='CREATE' AND a.grantee NOT IN(n.nspowner,principal))
 THEN RAISE EXCEPTION 'controlled_new_subject_public_schema_not_closed' USING ERRCODE='55000'; END IF;
 PERFORM 1 FROM nevora_tenancy.capability_policy_definition d
 WHERE d.policy_id COLLATE pg_catalog."C"=(p_command->>'policyId') COLLATE pg_catalog."C" AND d.revision=(p_command->>'policyRevision')::pg_catalog.int8 FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'controlled_new_subject_policy_missing' USING ERRCODE='55000'; END IF;
 -- Actual definition rows/source bytes are separately installer-enrolled. No
 -- default policy, revision, permission, grant, lifecycle or provenance inference.
 ts:=pg_catalog.transaction_timestamp();
 w:=pg_catalog.jsonb_populate_record(NULL::public.workspaces,pg_catalog.jsonb_build_object(
   'id',p_command->'workspaceId','name',p_command->'workspaceName','time_zone',p_command->'timeZone',
   'active',p_command->'workspaceActive','singleton',true,'created_at',ts,'updated_at',ts,'shift_change_policy',p_command->'shiftChangePolicy'));
 INSERT INTO nevora_tenancy.controlled_source_write_frame VALUES(database_oid,principal,pg_catalog.pg_backend_pid(),pg_catalog.pg_current_xact_id(),request_id,
   'public.workspaces'::pg_catalog.regclass,'INSERT',1,NULL,pg_catalog.to_jsonb(w),false);
 INSERT INTO public.workspaces SELECT (w).*;
 clock_before:=pg_catalog.to_jsonb(pg_catalog.jsonb_populate_record(NULL::public.calendar_clock,
  pg_catalog.jsonb_build_object('workspace_id',w.id,'singleton',true,'serial',0,'modified_at',ts)));
 INSERT INTO nevora_tenancy.controlled_source_write_frame VALUES(database_oid,principal,pg_catalog.pg_backend_pid(),pg_catalog.pg_current_xact_id(),request_id,
  'public.calendar_clock'::pg_catalog.regclass,'INSERT',1,NULL,clock_before,false);
 INSERT INTO public.calendar_clock SELECT (pg_catalog.jsonb_populate_record(NULL::public.calendar_clock,clock_before)).*;
 SELECT pg_catalog.to_jsonb(c) INTO STRICT clock_before FROM public.calendar_clock c WHERE singleton AND c.workspace_id=w.id FOR UPDATE;
 -- Original stamp computes the two native calendar fields. No caller serial,
 -- timestamp, calendar body rewrite, or skip-trigger setting is accepted.
 l:=pg_catalog.jsonb_populate_record(NULL::public.locations,pg_catalog.jsonb_build_object(
   'id',p_command->'locationId','name',p_command->'locationName','short_name',p_command->'locationShortName',
   'active',p_command->'locationActive','created_at',ts,'updated_at',ts,'workspace_id',p_command->'workspaceId',
   'clocker_key',p_command->'clockerKey','calendar_serial',NULL,'calendar_modified_at',NULL));
 INSERT INTO nevora_tenancy.controlled_source_write_frame VALUES(database_oid,principal,pg_catalog.pg_backend_pid(),pg_catalog.pg_current_xact_id(),request_id,
   'public.calendar_clock'::pg_catalog.regclass,'UPDATE',2,clock_before,clock_before,false);
 INSERT INTO nevora_tenancy.controlled_source_write_frame VALUES(database_oid,principal,pg_catalog.pg_backend_pid(),pg_catalog.pg_current_xact_id(),request_id,
   'public.locations'::pg_catalog.regclass,'INSERT',1,NULL,pg_catalog.to_jsonb(l),false);
 INSERT INTO public.locations SELECT (l).*;
 e:=pg_catalog.jsonb_populate_record(NULL::public.employees,pg_catalog.jsonb_build_object(
   'id',p_command->'employeeId','first_name',p_command->'firstName','last_name',p_command->'lastName',
   'phone',p_command->'phone','email',p_command->'email','role',p_command->'role',
   'primary_location_id',p_command->'locationId','active',p_command->'employeeActive','created_at',ts,'updated_at',ts,'workspace_id',p_command->'workspaceId'));
 INSERT INTO nevora_tenancy.controlled_source_write_frame VALUES(database_oid,principal,pg_catalog.pg_backend_pid(),pg_catalog.pg_current_xact_id(),request_id,
   'public.employees'::pg_catalog.regclass,'INSERT',1,NULL,pg_catalog.to_jsonb(e),false);
 INSERT INTO public.employees SELECT (e).*;
 eligibility:=pg_catalog.jsonb_populate_record(NULL::public.employee_location_eligibility,pg_catalog.jsonb_build_object(
   'employee_id',p_command->'employeeId','location_id',p_command->'locationId','workspace_id',p_command->'workspaceId'));
 INSERT INTO nevora_tenancy.controlled_source_write_frame VALUES(database_oid,principal,pg_catalog.pg_backend_pid(),pg_catalog.pg_current_xact_id(),request_id,
   'public.employee_location_eligibility'::pg_catalog.regclass,'INSERT',1,NULL,pg_catalog.to_jsonb(eligibility),false);
 INSERT INTO public.employee_location_eligibility SELECT (eligibility).*;
 INSERT INTO nevora_tenancy.employee_login_identity(employee_id,workspace_id,employee_number,normalized_number)
 VALUES(e.id,w.id,p_command->>'employeeNumber',p_command->>'normalizedNumber');
 INSERT INTO nevora_tenancy.workspace_locator(workspace_id,locator_code) VALUES(w.id,p_command->>'locator');
 INSERT INTO nevora_tenancy.workspace_incarnation_counter(workspace_id,incarnation) VALUES(w.id,(p_command->>'workspaceIncarnation')::pg_catalog.int8);
 INSERT INTO nevora_tenancy.workspace_capability_policy_installation(workspace_id,workspace_incarnation,installation_epoch,policy_id,policy_revision)
 VALUES(w.id,(p_command->>'workspaceIncarnation')::pg_catalog.int8,(p_command->>'installationEpoch')::pg_catalog.int8,
   p_command->>'policyId',(p_command->>'policyRevision')::pg_catalog.int8);
 INSERT INTO nevora_tenancy.portal_authority(workspace_id,employee_id,authorization_version,portal_access_version,capability_policy_revision,portal_state,proof_provenance,provenance_reference)
 VALUES(w.id,e.id,(p_command->>'authorizationVersion')::pg_catalog.int8,(p_command->>'portalAccessVersion')::pg_catalog.int8,
   (p_command->>'policyRevision')::pg_catalog.int8,'DISABLED','UNVERIFIED',request_id::pg_catalog.text);
 INSERT INTO nevora_tenancy.controlled_new_subject_creation(request_id,cutover_epoch,workspace_id,employee_id,location_id,workspace_incarnation,
   authorization_version,portal_access_version,policy_id,policy_revision,installation_epoch,creation_kind,created_at)
 VALUES(request_id,control.epoch,w.id,e.id,l.id,(p_command->>'workspaceIncarnation')::pg_catalog.int8,
   (p_command->>'authorizationVersion')::pg_catalog.int8,(p_command->>'portalAccessVersion')::pg_catalog.int8,
   p_command->>'policyId',(p_command->>'policyRevision')::pg_catalog.int8,(p_command->>'installationEpoch')::pg_catalog.int8,'CONTROLLED_NEW_DISABLED_SUBJECT',ts);
 IF EXISTS(SELECT 1 FROM nevora_tenancy.controlled_source_write_frame f WHERE f.backend_pid=pg_catalog.pg_backend_pid() AND f.transaction_id=pg_catalog.pg_current_xact_id())
 THEN RAISE EXCEPTION 'controlled_source_frame_unconsumed' USING ERRCODE='55000'; END IF;
 -- No source credential/session, LIVE, admin grants, verification claim,
 -- LEGACY lineage, bearer, PortalProof or operative capability result is made.
 RETURN pg_catalog.jsonb_build_object('format','CONTROLLED_NEW_DISABLED_SUBJECT_RECEIPT_V1','requestId',request_id::pg_catalog.text,
   'workspaceId',w.id,'employeeId',e.id,'locationId',l.id,'portalState','DISABLED','proofProvenance','UNVERIFIED',
   'createdAt',ts::pg_catalog.text,'state','IN_OWNING_TRANSACTION_NOT_ACKNOWLEDGED_OR_PROOF');
END;
$controlled_new_disabled_subject$;

ALTER TABLE nevora_tenancy.controlled_new_tenant_cutover ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.controlled_new_tenant_cutover FORCE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.controlled_source_write_frame ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.controlled_source_write_frame FORCE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.controlled_new_subject_creation ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.controlled_new_subject_creation FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE nevora_tenancy.controlled_new_tenant_cutover,nevora_tenancy.controlled_source_write_frame,nevora_tenancy.controlled_new_subject_creation FROM PUBLIC;
REVOKE ALL ON FUNCTION nevora_tenancy.assert_controlled_new_tenant_installer() FROM PUBLIC;
REVOKE ALL ON FUNCTION nevora_tenancy.consume_controlled_source_write(pg_catalog.bool,pg_catalog.oid,pg_catalog.text,pg_catalog.int4,pg_catalog.jsonb,pg_catalog.jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION nevora_tenancy.require_controlled_source_frame_consumed() FROM PUBLIC;
REVOKE ALL ON FUNCTION nevora_tenancy.guard_controlled_new_tenant_receipt() FROM PUBLIC;
REVOKE ALL ON FUNCTION nevora_tenancy.apply_controlled_new_tenant_cutover(pg_catalog.int8,pg_catalog.text) FROM PUBLIC;
REVOKE ALL ON FUNCTION nevora_tenancy.create_controlled_new_disabled_subject(pg_catalog.jsonb) FROM PUBLIC;
DO $closed_new_tenant_acl$
DECLARE n pg_catalog.oid;
BEGIN
 SELECT oid INTO STRICT n FROM pg_catalog.pg_namespace WHERE nspname='nevora_tenancy';
 IF EXISTS(SELECT 1 FROM pg_catalog.pg_class c CROSS JOIN LATERAL
     pg_catalog.aclexplode(COALESCE(c.relacl,pg_catalog.acldefault('r',c.relowner))) a
     WHERE c.relnamespace=n AND c.relname IN('controlled_new_tenant_cutover','controlled_source_write_frame','controlled_new_subject_creation')
       AND (a.grantee<>c.relowner OR a.is_grantable))
   OR EXISTS(SELECT 1 FROM pg_catalog.pg_attribute col JOIN pg_catalog.pg_class c ON c.oid=col.attrelid
     CROSS JOIN LATERAL pg_catalog.aclexplode(col.attacl) a WHERE c.relnamespace=n
       AND c.relname IN('controlled_new_tenant_cutover','controlled_source_write_frame','controlled_new_subject_creation')
       AND (a.grantee<>c.relowner OR a.is_grantable))
   OR EXISTS(SELECT 1 FROM pg_catalog.pg_proc p CROSS JOIN LATERAL
     pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
     WHERE p.pronamespace=n AND p.proname IN('assert_controlled_new_tenant_installer','consume_controlled_source_write',
       'require_controlled_source_frame_consumed','guard_controlled_new_tenant_receipt',
       'apply_controlled_new_tenant_cutover','create_controlled_new_disabled_subject') AND (a.grantee<>p.proowner OR a.is_grantable))
 THEN RAISE EXCEPTION 'controlled_new_tenant_acl_not_private' USING ERRCODE='55000'; END IF;
END;
$closed_new_tenant_acl$;
COMMIT;
