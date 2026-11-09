-- UNUSED LOCAL CONTROLLED LEGACY ACCESS LINEAGE STORAGE, not installed authority.
-- ROOT's existing owned controller must install before genuine complete capture
-- (or prove an exact catalog successor), independently retain this source/native
-- capsule, and later admit the same original maintenance installer on its lease.
-- This creates EMPTY storage only. No legacy/verified/grant rows or runtime grant
-- are inferred from an ID, source digest, provenance label or table ownership.
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
DO $portal_access_lineage_prerequisites$
DECLARE installer_oid pg_catalog.oid; schema_oid pg_catalog.oid; subject record;
BEGIN
  SELECT role.oid INTO installer_oid FROM pg_catalog.pg_roles AS role WHERE role.rolname=current_user
    AND role.rolsuper AND role.rolcanlogin;
  IF installer_oid IS NULL OR current_user IS DISTINCT FROM session_user OR
    pg_catalog.current_setting('role') IS DISTINCT FROM 'none' OR NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_stat_activity activity WHERE activity.pid=pg_catalog.pg_backend_pid()
        AND activity.usesysid=installer_oid AND activity.usename=session_user) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='portal_access_lineage_local_installer_required';
  END IF;
  SELECT n.oid INTO schema_oid FROM pg_catalog.pg_namespace n WHERE n.nspname='nevora_tenancy' AND n.nspowner=installer_oid;
  IF schema_oid IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='portal_access_lineage_schema_not_owned'; END IF;
  FOR subject IN SELECT * FROM (VALUES ('public','employees'),('nevora_tenancy','workspace_incarnation_counter'),
      ('nevora_tenancy','capability_policy_definition')) expected(schema_name,relation_name) LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname=subject.schema_name AND c.relname=subject.relation_name AND c.relkind='r'
        AND c.relpersistence='p' AND c.relowner=installer_oid) THEN
      RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='portal_access_lineage_parent_invalid';
    END IF;
  END LOOP;
  -- Actual nondeferrable validated/enforced FK creation below independently
  -- requires the native installed composite keys. This does not certify the
  -- whole parent's source/guard/ACL/owner envelope; fixed controller witness +
  -- current enrolled capsule must bind those exact source prerequisites.
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c WHERE c.relnamespace=schema_oid AND c.relname='portal_access_lineage')
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc f WHERE f.pronamespace=schema_oid AND f.proname='guard_portal_access_lineage') THEN
    RAISE EXCEPTION USING ERRCODE='42P07',MESSAGE='portal_access_lineage_already_present';
  END IF;
END;
$portal_access_lineage_prerequisites$;
CREATE TABLE nevora_tenancy.portal_access_lineage (
  workspace_id pg_catalog.text NOT NULL,
  employee_id pg_catalog.text NOT NULL,
  workspace_incarnation pg_catalog.int8 NOT NULL CHECK(workspace_incarnation>0),
  authorization_version pg_catalog.int8 NOT NULL CHECK(authorization_version>0),
  portal_access_version pg_catalog.int8 NOT NULL CHECK(portal_access_version>0),
  policy_id pg_catalog.text COLLATE pg_catalog."C" NOT NULL,
  policy_revision pg_catalog.int8 NOT NULL CHECK(policy_revision>0),
  installation_epoch pg_catalog.int8 NOT NULL CHECK(installation_epoch>0),
  lineage_kind pg_catalog.text NOT NULL CHECK(lineage_kind='CAPTURED_LEGACY_EXISTING_ACCESS'),
  provenance_reference pg_catalog.text NOT NULL,
  capture_source pg_catalog.jsonb NOT NULL CHECK(pg_catalog.jsonb_typeof(capture_source)='object'),
  effective_grants pg_catalog.jsonb NOT NULL CHECK(pg_catalog.jsonb_typeof(effective_grants)='object'),
  source_manifest_sha256 pg_catalog.text COLLATE pg_catalog."C" NOT NULL
    CHECK(source_manifest_sha256 ~ '^[a-f0-9]{64}$' AND pg_catalog.octet_length(source_manifest_sha256)=64),
  PRIMARY KEY(workspace_id,employee_id,workspace_incarnation,authorization_version,portal_access_version),
  FOREIGN KEY(workspace_id,employee_id) REFERENCES public.employees(workspace_id,id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY(workspace_id) REFERENCES nevora_tenancy.workspace_incarnation_counter(workspace_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY(policy_id,policy_revision) REFERENCES nevora_tenancy.capability_policy_definition(policy_id,revision) ON UPDATE RESTRICT ON DELETE RESTRICT
);
CREATE FUNCTION nevora_tenancy.guard_portal_access_lineage()
RETURNS pg_catalog.trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog
AS $portal_access_lineage_guard$
BEGIN
  -- Immutable lineage means existing records cannot be relabelled VERIFIED,
  -- replaced, deleted or reseeded. New authorized generations require another
  -- independently reviewed producer; this local-only kernel provides none.
  RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='portal_access_lineage_immutable';
END;
$portal_access_lineage_guard$;
CREATE TRIGGER portal_access_lineage_no_change BEFORE UPDATE OR DELETE ON nevora_tenancy.portal_access_lineage
  FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.guard_portal_access_lineage();
CREATE TRIGGER portal_access_lineage_no_truncate BEFORE TRUNCATE ON nevora_tenancy.portal_access_lineage
  FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.guard_portal_access_lineage();
ALTER TABLE nevora_tenancy.portal_access_lineage ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.portal_access_lineage FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE nevora_tenancy.portal_access_lineage FROM PUBLIC;
REVOKE ALL ON FUNCTION nevora_tenancy.guard_portal_access_lineage() FROM PUBLIC;
DO $portal_access_lineage_acl$
DECLARE table_oid pg_catalog.oid; guard_oid pg_catalog.oid; installer_oid pg_catalog.oid;
BEGIN
  SELECT r.oid INTO installer_oid FROM pg_catalog.pg_roles r WHERE r.rolname=current_user;
  SELECT c.oid INTO table_oid FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='nevora_tenancy' AND c.relname='portal_access_lineage' AND c.relkind='r' AND c.relpersistence='p'
      AND c.relowner=installer_oid AND c.relrowsecurity AND c.relforcerowsecurity;
  SELECT f.oid INTO guard_oid FROM pg_catalog.pg_proc f JOIN pg_catalog.pg_namespace n ON n.oid=f.pronamespace
    JOIN pg_catalog.pg_language l ON l.oid=f.prolang
    WHERE n.nspname='nevora_tenancy' AND f.proname='guard_portal_access_lineage' AND f.proowner=installer_oid
      AND f.proargtypes=''::pg_catalog.oidvector AND f.prorettype=2279 AND NOT f.prosecdef AND f.provolatile='v'
      AND f.proparallel='u' AND NOT f.proisstrict AND NOT f.proretset AND NOT f.proleakproof
      AND f.prosupport=0 AND f.provariadic=0 AND f.pronargdefaults=0 AND f.proargmodes IS NULL
      AND f.proallargtypes IS NULL AND f.probin IS NULL AND l.lanname='plpgsql'
      AND f.proconfig=ARRAY['search_path=pg_catalog']::pg_catalog.text[];
  IF table_oid IS NULL OR guard_oid IS NULL OR EXISTS(SELECT 1 FROM pg_catalog.pg_policy WHERE polrelid=table_oid)
    OR EXISTS(SELECT 1 FROM pg_catalog.aclexplode(COALESCE((SELECT relacl FROM pg_catalog.pg_class WHERE oid=table_oid),pg_catalog.acldefault('r',installer_oid))) a WHERE a.grantee<>installer_oid)
    OR EXISTS(SELECT 1 FROM pg_catalog.pg_attribute c CROSS JOIN LATERAL pg_catalog.aclexplode(c.attacl) a WHERE c.attrelid=table_oid AND a.grantee<>installer_oid)
    OR EXISTS(SELECT 1 FROM pg_catalog.aclexplode(COALESCE((SELECT proacl FROM pg_catalog.pg_proc WHERE oid=guard_oid),pg_catalog.acldefault('f',installer_oid))) a WHERE a.grantee<>installer_oid) THEN
    RAISE EXCEPTION USING ERRCODE='55000',MESSAGE='portal_access_lineage_private_acl_required';
  END IF;
  -- Existing reviewed namespace named grants are preserved and bound by the
  -- controller capsule, rather than silently revoked/repaired here.
END;
$portal_access_lineage_acl$;
COMMIT;
