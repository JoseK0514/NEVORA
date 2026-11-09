-- Bounded installer-owned storage for the existing direct-login role helper.
-- This standalone artifact is not a migration runner or implicit installation.
-- A separately authorized installer must use an owned idle connection and an
-- existing nevora_tenancy schema owned by its current role. Named grants and
-- exact native role/settings observations are separate installer obligations.
-- No roles, bindings, helpers, customer data or callable-definer exceptions are
-- seeded. An empty table grants no runtime role authority. Matching stored OIDs
-- or source observations alone do not authenticate an installer or approve a
-- helper's source. Current-proof, RLS, transport and full F10 gates remain open.
-- Duplicate installation fails closed; this source never replaces an object.
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

DO $runtime_control_prerequisites$
DECLARE
  schema_oid pg_catalog.oid;
  schema_owner pg_catalog.oid;
  installer_oid pg_catalog.oid;
BEGIN
  SELECT namespace.oid, namespace.nspowner INTO schema_oid, schema_owner
    FROM pg_catalog.pg_namespace AS namespace
    WHERE namespace.nspname = 'nevora_tenancy';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'runtime_control_schema_missing' USING ERRCODE = '3F000';
  END IF;

  SELECT installer.oid INTO installer_oid
    FROM pg_catalog.pg_roles AS installer
    WHERE installer.rolname = current_user;
  IF schema_owner IS DISTINCT FROM installer_oid THEN
    RAISE EXCEPTION 'runtime_control_schema_not_owned' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class AS relation
    WHERE relation.relnamespace = schema_oid AND relation.relname = 'runtime_role_binding') THEN
    RAISE EXCEPTION 'runtime_control_already_installed' USING ERRCODE = '42P07';
  END IF;
END;
$runtime_control_prerequisites$;

CREATE TABLE nevora_tenancy.runtime_role_binding (
  kind pg_catalog.text PRIMARY KEY CHECK(kind IN ('APP','WORKER')),
  role_name pg_catalog.name UNIQUE NOT NULL,
  role_oid pg_catalog.oid UNIQUE NOT NULL,
  pg_settings_oid pg_catalog.oid NOT NULL,
  pg_settings_definition pg_catalog.text NOT NULL,
  pg_settings_rules pg_catalog.text[] NOT NULL
);

REVOKE ALL ON SCHEMA nevora_tenancy FROM PUBLIC;
REVOKE ALL ON TABLE nevora_tenancy.runtime_role_binding FROM PUBLIC;
COMMIT;
