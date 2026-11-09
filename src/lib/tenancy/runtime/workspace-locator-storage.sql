-- Unused empty private workspace locator storage; actual installation is separately authorized.
-- No source rows, seeds, roles, grants, enrollment, policies, resolver or activation are installed.
-- A nonsecret selector is not authority. Actual assignment/distribution and explicit legacy compatibility mapping
-- remain unimplemented and separately controlled; there is no inferred/default/Fuel locator.
-- Input trimming/case normalization belongs to accepted normalizeWorkspaceLocator; SQL accepts only canonical lowercase ASCII.
-- Eight to thirty-two ASCII letters/digits/hyphens includes leading/trailing/repeated/all hyphens; no extra restriction.
-- Stored locator uses native C collation for exact canonical key uniqueness. Original workspace text bytes/collation are retained.
-- FORCE RLS zero policies supplies no helper access/issuer/current-proof authority; real narrow policies/resolver remain prerequisites.
-- No anti-revival or recovery guarantee: an older backup may restore prior assignments or omit retired mappings.
-- Recovery/high-water/permanent nonreuse reconciliation, trusted catalog writer adoption and actual Neon remain OPEN.
-- Source tests preserve the frozen declaration parser's COLLATE limitation; no native installation claim follows.
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
DO $workspace_locator_prerequisites$
DECLARE
  schema_oid pg_catalog.oid;
  schema_owner pg_catalog.oid;
  installer_oid pg_catalog.oid;
  parent_oid pg_catalog.oid;
  parent_owner pg_catalog.oid;
  parent_id_attnum pg_catalog.int2;
BEGIN
  SELECT namespace.oid, namespace.nspowner INTO schema_oid, schema_owner
  FROM pg_catalog.pg_namespace AS namespace
  WHERE namespace.nspname = 'nevora_tenancy';
  IF schema_oid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '3F000', MESSAGE = 'workspace_locator_schema_missing';
  END IF;
  SELECT installer.oid INTO installer_oid
  FROM pg_catalog.pg_roles AS installer
  WHERE installer.rolname = current_user;
  IF installer_oid IS NULL OR schema_owner IS DISTINCT FROM installer_oid THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'workspace_locator_schema_not_owned';
  END IF;

  SELECT parent.oid, parent.relowner INTO parent_oid, parent_owner
  FROM pg_catalog.pg_class AS parent
  JOIN pg_catalog.pg_namespace AS parent_namespace ON parent_namespace.oid = parent.relnamespace
  WHERE parent_namespace.nspname = 'public' AND parent.relname = 'workspaces'
    AND parent.relkind = 'r' AND parent.relpersistence = 'p';
  IF parent_oid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'workspace_locator_parent_invalid';
  END IF;
  IF parent_owner IS DISTINCT FROM installer_oid THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'workspace_locator_parent_not_owned';
  END IF;
  SELECT attribute.attnum INTO parent_id_attnum
  FROM pg_catalog.pg_attribute AS attribute
  WHERE attribute.attrelid = parent_oid AND attribute.attname = 'id'
    AND attribute.attnum > 0 AND NOT attribute.attisdropped
    AND attribute.atttypid = 'pg_catalog.text'::pg_catalog.regtype
    AND attribute.atttypmod = -1 AND attribute.attnotnull;
  IF parent_id_attnum IS NULL OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint AS key_constraint
    JOIN pg_catalog.pg_index AS key_index
      ON key_index.indexrelid = key_constraint.conindid AND key_index.indrelid = parent_oid
    JOIN pg_catalog.pg_class AS key_relation ON key_relation.oid = key_index.indexrelid
    WHERE key_constraint.conrelid = parent_oid AND key_constraint.contype = 'p'
      AND key_constraint.convalidated AND NOT key_constraint.condeferrable
      AND NOT key_constraint.condeferred
      AND COALESCE((pg_catalog.to_jsonb(key_constraint) ->> 'conenforced')::pg_catalog.bool, true)
      AND key_constraint.conkey = ARRAY[parent_id_attnum]::pg_catalog.int2[]
      AND key_index.indisprimary AND key_index.indisunique AND key_index.indisvalid
      AND key_index.indisready AND key_index.indislive AND key_index.indimmediate
      AND key_index.indpred IS NULL AND key_index.indexprs IS NULL
      AND key_index.indnatts = 1 AND key_index.indnkeyatts = 1
      AND key_index.indkey[0] = parent_id_attnum
      AND key_relation.relkind = 'i' AND key_relation.relpersistence = 'p'
      AND key_relation.relowner = installer_oid
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'workspace_locator_parent_invalid';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class AS relation
    WHERE relation.relnamespace = schema_oid AND relation.relname = 'workspace_locator') THEN
    RAISE EXCEPTION USING ERRCODE = '42P07', MESSAGE = 'workspace_locator_already_installed';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS function
    WHERE function.pronamespace = schema_oid AND function.proname = 'guard_workspace_locator') THEN
    RAISE EXCEPTION USING ERRCODE = '42723', MESSAGE = 'workspace_locator_guard_already_installed';
  END IF;
END;
$workspace_locator_prerequisites$;
CREATE TABLE nevora_tenancy.workspace_locator (
  workspace_id pg_catalog.text PRIMARY KEY REFERENCES public.workspaces(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  locator_code pg_catalog.text COLLATE pg_catalog."C" NOT NULL UNIQUE
    CHECK (locator_code OPERATOR(pg_catalog.~) '^[a-z0-9-]{8,32}$'::pg_catalog.text)
);
CREATE FUNCTION nevora_tenancy.guard_workspace_locator()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $workspace_locator_guard$
BEGIN
  IF TG_TABLE_SCHEMA IS DISTINCT FROM 'nevora_tenancy'
    OR TG_TABLE_NAME IS DISTINCT FROM 'workspace_locator' THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'workspace_locator_guard_route_invalid';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF TG_LEVEL IS DISTINCT FROM 'ROW' THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'workspace_locator_guard_route_invalid';
    END IF;
    IF pg_catalog.convert_to(NEW.workspace_id, 'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.workspace_id, 'UTF8')
      OR pg_catalog.convert_to(NEW.locator_code, 'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.locator_code, 'UTF8') THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'workspace_locator_identity_immutable';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF TG_LEVEL IS DISTINCT FROM 'ROW' THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'workspace_locator_guard_route_invalid';
    END IF;
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'workspace_locator_delete_forbidden';
  ELSIF TG_OP = 'TRUNCATE' THEN
    IF TG_LEVEL IS DISTINCT FROM 'STATEMENT' THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'workspace_locator_guard_route_invalid';
    END IF;
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'workspace_locator_truncate_forbidden';
  ELSE
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'workspace_locator_guard_route_invalid';
  END IF;
END;
$workspace_locator_guard$;
CREATE TRIGGER workspace_locator_row_guard
BEFORE UPDATE OR DELETE ON nevora_tenancy.workspace_locator
FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.guard_workspace_locator();
CREATE TRIGGER workspace_locator_truncate_guard
BEFORE TRUNCATE ON nevora_tenancy.workspace_locator
FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.guard_workspace_locator();
ALTER TABLE nevora_tenancy.workspace_locator ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.workspace_locator FORCE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA nevora_tenancy FROM PUBLIC;
REVOKE ALL ON TABLE nevora_tenancy.workspace_locator FROM PUBLIC;
REVOKE ALL ON FUNCTION nevora_tenancy.guard_workspace_locator() FROM PUBLIC;
DO $workspace_locator_acl$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_namespace AS namespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(namespace.nspacl,
      pg_catalog.acldefault('n', namespace.nspowner))) AS privileges
    WHERE namespace.nspname = 'nevora_tenancy' AND privileges.grantee <> namespace.nspowner
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_class AS control
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = control.relnamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(control.relacl,
      pg_catalog.acldefault('r', control.relowner))) AS privileges
    WHERE namespace.nspname = 'nevora_tenancy' AND control.relname = 'workspace_locator'
      AND privileges.grantee <> control.relowner
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_class AS control
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = control.relnamespace
    JOIN pg_catalog.pg_attribute AS attribute ON attribute.attrelid = control.oid
    CROSS JOIN LATERAL pg_catalog.aclexplode(attribute.attacl) AS privileges
    WHERE namespace.nspname = 'nevora_tenancy' AND control.relname = 'workspace_locator'
      AND attribute.attnum > 0 AND NOT attribute.attisdropped
      AND privileges.grantee <> control.relowner
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc AS function
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = function.pronamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(function.proacl,
      pg_catalog.acldefault('f', function.proowner))) AS privileges
    WHERE namespace.nspname = 'nevora_tenancy' AND function.proname = 'guard_workspace_locator'
      AND function.pronargs = 0 AND privileges.grantee <> function.proowner
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'workspace_locator_acl_invalid';
  END IF;
END;
$workspace_locator_acl$;
COMMIT;
