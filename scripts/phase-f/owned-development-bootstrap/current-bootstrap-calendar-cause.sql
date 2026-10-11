-- Finite original-owner bootstrap predecessor. Final runtime stamp/source-owner
-- installation and full graph enrollment must precede APP release.
BEGIN ISOLATION LEVEL READ COMMITTED;
SET LOCAL search_path=pg_catalog;
CREATE TABLE nevora_tenancy.current_bootstrap_calendar_cause(
 database_oid oid NOT NULL,installer_oid oid NOT NULL,backend_pid int4 NOT NULL,
 transaction_id xid8 NOT NULL,request_id uuid NOT NULL,workspace_id text NOT NULL,location_id text NOT NULL,
 prior_serial int4 NOT NULL,prior_modified_at timestamptz NOT NULL,sampled_at timestamptz NOT NULL,
 expected_serial int4 NOT NULL,expected_modified_at timestamptz NOT NULL,
 PRIMARY KEY(database_oid,backend_pid,transaction_id,request_id),
 CHECK(expected_serial=prior_serial+1),
 CHECK(expected_modified_at=GREATEST(sampled_at,prior_modified_at+interval '1 microsecond'))
);
ALTER TABLE nevora_tenancy.current_bootstrap_calendar_cause ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.current_bootstrap_calendar_cause FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE nevora_tenancy.current_bootstrap_calendar_cause FROM PUBLIC;
CREATE FUNCTION nevora_tenancy.guard_current_bootstrap_calendar_cause() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $immutable$
BEGIN RAISE EXCEPTION 'current_bootstrap_calendar_cause_immutable' USING ERRCODE='55000'; END
$immutable$;
CREATE TRIGGER current_bootstrap_clock_row_immutable BEFORE UPDATE OR DELETE
 ON nevora_tenancy.current_bootstrap_calendar_cause FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.guard_current_bootstrap_calendar_cause();
CREATE TRIGGER current_bootstrap_clock_truncate_immutable BEFORE TRUNCATE
 ON nevora_tenancy.current_bootstrap_calendar_cause FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.guard_current_bootstrap_calendar_cause();
CREATE FUNCTION nevora_tenancy.sample_current_bootstrap_calendar_clock(p_workspace text,p_serial int4,p_modified timestamptz)
RETURNS timestamptz LANGUAGE plpgsql VOLATILE PARALLEL UNSAFE SECURITY INVOKER SET search_path=pg_catalog AS $sample$
DECLARE principal oid;frame nevora_tenancy.controlled_source_write_frame%ROWTYPE;
 location_frame nevora_tenancy.controlled_source_write_frame%ROWTYPE;
 control nevora_tenancy.controlled_new_tenant_cutover%ROWTYPE;sampled timestamptz;
BEGIN
 principal:=nevora_tenancy.assert_controlled_new_tenant_installer();
 SELECT * INTO STRICT control FROM nevora_tenancy.controlled_new_tenant_cutover WHERE singleton FOR SHARE;
 SELECT * INTO STRICT frame FROM nevora_tenancy.controlled_source_write_frame
 WHERE database_oid=control.database_oid AND backend_pid=pg_backend_pid() AND transaction_id=pg_current_xact_id()
 AND relation_oid='public.calendar_clock'::regclass;
 SELECT * INTO STRICT location_frame FROM nevora_tenancy.controlled_source_write_frame
 WHERE database_oid=control.database_oid AND backend_pid=frame.backend_pid AND transaction_id=frame.transaction_id
 AND relation_oid='public.locations'::regclass;
 IF control.installer_oid<>principal OR frame.installer_oid<>principal OR location_frame.installer_oid<>principal
 OR frame.operation<>'UPDATE' OR frame.trigger_depth<>2 OR NOT frame.statement_claimed OR pg_trigger_depth()<>1
 OR frame.expected_old IS DISTINCT FROM frame.expected_new
 OR frame.expected_old->>'workspace_id' IS DISTINCT FROM p_workspace
 OR p_serial IS DISTINCT FROM (frame.expected_old->>'serial')::int4
 OR p_modified IS DISTINCT FROM (frame.expected_old->>'modified_at')::timestamptz
 OR location_frame.request_id<>frame.request_id OR location_frame.operation<>'INSERT'
 OR location_frame.trigger_depth<>1 OR NOT location_frame.statement_claimed OR location_frame.expected_old IS NOT NULL
 OR location_frame.expected_new->>'workspace_id' IS DISTINCT FROM p_workspace OR location_frame.expected_new->>'id' IS NULL
 OR (SELECT prosrc FROM pg_proc WHERE oid='public.nevora_calendar_source_stamp()'::regprocedure) IS DISTINCT FROM control.calendar_stamp_source
 OR (SELECT prosrc FROM pg_proc WHERE oid='nevora_tenancy.source_write_fence()'::regprocedure) IS DISTINCT FROM control.successor_write_fence_source
 OR (SELECT prosrc FROM pg_proc WHERE oid='nevora_tenancy.source_identity_guard()'::regprocedure) IS DISTINCT FROM control.successor_identity_guard_source
 THEN RAISE EXCEPTION 'current_bootstrap_calendar_native_frame_required' USING ERRCODE='42501'; END IF;
 sampled:=clock_timestamp();
 INSERT INTO nevora_tenancy.current_bootstrap_calendar_cause VALUES(control.database_oid,principal,
 frame.backend_pid,frame.transaction_id,frame.request_id,p_workspace,location_frame.expected_new->>'id',
 p_serial,p_modified,sampled,p_serial+1,GREATEST(sampled,p_modified+interval '1 microsecond'));
 RETURN sampled;
END
$sample$;
REVOKE ALL ON FUNCTION nevora_tenancy.guard_current_bootstrap_calendar_cause(),
 nevora_tenancy.sample_current_bootstrap_calendar_clock(text,int4,timestamptz) FROM PUBLIC;
DO $closed_preimage$
BEGIN
 PERFORM nevora_tenancy.assert_controlled_new_tenant_installer();
 IF EXISTS(SELECT 1 FROM nevora_tenancy.controlled_new_tenant_cutover)
 OR NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid='public.nevora_calendar_source_stamp()'::regprocedure
 AND p.proowner=16391 AND NOT p.prosecdef AND p.prolang=(SELECT oid FROM pg_language WHERE lanname='plpgsql')
 AND p.pronargs=0 AND p.prorettype='trigger'::regtype AND NOT p.proretset
 AND p.proconfig=ARRAY['search_path=pg_catalog']::text[] AND p.prosrc=E'\nBEGIN RAISE EXCEPTION \'calendar_source_requires_enrolled_tenant_writer\' USING ERRCODE=\'42501\'; END\n')
 THEN RAISE EXCEPTION 'current_bootstrap_closed_calendar_preimage_required' USING ERRCODE='55000'; END IF;
 IF (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM pg_constraint c
 CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY k(attnum,ord) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum
 WHERE c.conrelid='public.calendar_clock'::regclass AND c.contype='p') IS DISTINCT FROM ARRAY['workspace_id','singleton']::text[]
 THEN RAISE EXCEPTION 'current_bootstrap_tenant_clock_key_required' USING ERRCODE='55000'; END IF;
END
$closed_preimage$;
CREATE OR REPLACE FUNCTION public.nevora_calendar_source_stamp() RETURNS trigger
LANGUAGE plpgsql VOLATILE PARALLEL UNSAFE SECURITY INVOKER SET search_path=pg_catalog AS $current_tenant_bootstrap_stamp$
BEGIN
 IF TG_TABLE_SCHEMA<>'public' OR TG_TABLE_NAME<>'locations' OR TG_OP<>'INSERT' THEN
  RAISE EXCEPTION 'current_bootstrap_calendar_route_required' USING ERRCODE='42501'; END IF;
 PERFORM nevora_tenancy.assert_controlled_new_tenant_installer();
 UPDATE public.calendar_clock
 SET serial=serial+1,modified_at=GREATEST(
  nevora_tenancy.sample_current_bootstrap_calendar_clock(workspace_id,serial,modified_at),modified_at+interval '1 microsecond')
 WHERE singleton AND workspace_id=NEW.workspace_id
 RETURNING serial,modified_at INTO STRICT NEW.calendar_serial,NEW.calendar_modified_at;
 RETURN NEW;
END
$current_tenant_bootstrap_stamp$;
COMMIT;
