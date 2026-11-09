-- Empty installer-owned capability observations, not approval or an installer.
-- Use a separately authorized owned idle connection and pre-owned schema plus
-- exact existing role-binding storage. Matching observations never authenticate
-- a reviewer/operator or approve helper semantics. No seeds/roles/named grants.
-- Function ownership includes inherent ALTER/regrant; trusted-change fencing
-- remains an integration prerequisite. No current-proof/RLS/F10 claim is made.
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
DO $audited_helper_prerequisites$
DECLARE schema_oid pg_catalog.oid; installer_oid pg_catalog.oid;
BEGIN
  SELECT n.oid INTO schema_oid FROM pg_catalog.pg_namespace AS n WHERE n.nspname='nevora_tenancy';
  IF NOT FOUND THEN RAISE EXCEPTION 'audited_helper_schema_missing' USING ERRCODE='3F000'; END IF;
  SELECT r.oid INTO installer_oid FROM pg_catalog.pg_roles AS r WHERE r.rolname=current_user;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_namespace AS n WHERE n.oid=schema_oid AND n.nspowner=installer_oid) THEN
    RAISE EXCEPTION 'audited_helper_schema_not_owned' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class AS c WHERE c.relnamespace=schema_oid
    AND c.relname='runtime_role_binding' AND c.relkind='r' AND c.relpersistence='p'
    AND c.relowner=installer_oid AND NOT c.relrowsecurity AND NOT c.relforcerowsecurity
    AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute AS a WHERE a.attrelid=c.oid
      AND a.attnum>0 AND NOT a.attisdropped AND NOT (NOT a.atthasdef AND a.attidentity='' AND a.attgenerated=''))
    AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint AS co WHERE co.conrelid=c.oid AND
      (NOT co.convalidated OR co.condeferrable OR co.condeferred
       OR NOT COALESCE((pg_catalog.to_jsonb(co)->>'conenforced')::pg_catalog.bool,true)))
    AND (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(co.conname,co.contype::text,
      pg_catalog.to_jsonb(co.conkey),pg_catalog.pg_get_constraintdef(co.oid,false)) ORDER BY co.conname COLLATE pg_catalog."C")
      FROM pg_catalog.pg_constraint AS co WHERE co.conrelid=c.oid AND co.contype<>'n')
      = pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_array('runtime_role_binding_kind_check','c',pg_catalog.jsonb_build_array(1),
          'CHECK ((kind = ANY (ARRAY[''APP''::text, ''WORKER''::text])))'),
        pg_catalog.jsonb_build_array('runtime_role_binding_pkey','p',pg_catalog.jsonb_build_array(1),'PRIMARY KEY (kind)'),
        pg_catalog.jsonb_build_array('runtime_role_binding_role_name_key','u',pg_catalog.jsonb_build_array(2),'UNIQUE (role_name)'),
        pg_catalog.jsonb_build_array('runtime_role_binding_role_oid_key','u',pg_catalog.jsonb_build_array(3),'UNIQUE (role_oid)'))
    AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger AS t WHERE t.tgrelid=c.oid)
    AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_rewrite AS w WHERE w.ev_class=c.oid)
    AND (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(a.attname::text,a.atttypid::text,a.attnotnull) ORDER BY a.attnum)
      FROM pg_catalog.pg_attribute AS a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped)
      ='[["kind","25",true],["role_name","19",true],["role_oid","26",true],["pg_settings_oid","26",true],["pg_settings_definition","25",true],["pg_settings_rules","1009",true]]'::pg_catalog.jsonb) THEN
    RAISE EXCEPTION 'audited_helper_binding_missing' USING ERRCODE='55000';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class AS c WHERE c.relnamespace=schema_oid AND c.relname='audited_helper_capability') THEN
    RAISE EXCEPTION 'audited_helper_already_installed' USING ERRCODE='42P07';
  END IF;
END;
$audited_helper_prerequisites$;
CREATE TABLE nevora_tenancy.audited_helper_capability (
  runtime_kind pg_catalog.text NOT NULL CHECK(runtime_kind COLLATE pg_catalog."C" IN ('APP','WORKER')),
  route_kind pg_catalog.text NOT NULL CHECK(route_kind COLLATE pg_catalog."C" IN ('DIRECT_CALL','TRIGGER_ROUTE')),
  function_oid pg_catalog.oid NOT NULL CHECK(function_oid <> 0::pg_catalog.oid),
  route_oid pg_catalog.oid NOT NULL,
  function_observation pg_catalog.jsonb NOT NULL CHECK(pg_catalog.jsonb_typeof(function_observation)='object'),
  owner_observation pg_catalog.jsonb NOT NULL CHECK(pg_catalog.jsonb_typeof(owner_observation)='object'),
  owner_acl_observation pg_catalog.jsonb NOT NULL CHECK(pg_catalog.jsonb_typeof(owner_acl_observation)='object'),
  dependencies pg_catalog.jsonb NOT NULL CHECK(pg_catalog.jsonb_typeof(dependencies)='array'),
  route_observation pg_catalog.jsonb,
  review_reference pg_catalog.text NOT NULL CHECK(review_reference<>''),
  review_source_sha256 pg_catalog.text NOT NULL CHECK(review_source_sha256 ~ '^[a-f0-9]{64}$'),
  owner_lock_columns pg_catalog.jsonb NOT NULL CHECK(pg_catalog.jsonb_typeof(owner_lock_columns)='array'),
  PRIMARY KEY(runtime_kind,route_kind,function_oid,route_oid),
  CHECK((route_kind='DIRECT_CALL' AND route_oid=0::pg_catalog.oid AND route_observation IS NULL) OR
    (route_kind='TRIGGER_ROUTE' AND route_oid<>0::pg_catalog.oid AND route_observation IS NOT NULL AND pg_catalog.jsonb_typeof(route_observation)='object'))
);
REVOKE ALL ON SCHEMA nevora_tenancy FROM PUBLIC;
REVOKE ALL ON TABLE nevora_tenancy.audited_helper_capability FROM PUBLIC;
COMMIT;
