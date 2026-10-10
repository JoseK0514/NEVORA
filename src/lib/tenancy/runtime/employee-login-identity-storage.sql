-- SOURCE-ONLY candidate: empty immutable tenant-local login selector storage.
-- No enrollment, seed, grants, policies, role, lookup, password verification,
-- activation, session or source mutation. Root alone adopts and executes.
-- Raw employee_number and normalized_number are explicit retained preimages.
-- Existing JS trim().toUpperCase() must be independently captured/checked by
-- controlled enrollment. SQL never computes Unicode normalization or upper().
-- Exact C normalized-key uniqueness includes inactive employments. No alias,
-- renumber, reuse or delete/truncate. Global original employee ID is retained.
-- Empty FORCE-RLS/zero-policy storage is not authentication or trusted writer
-- provenance, nor protection against superuser/BYPASSRLS or owner DDL changes.
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
DO $employee_login_identity_prerequisites$
DECLARE
  schema_oid pg_catalog.oid;
  schema_owner pg_catalog.oid;
  installer_oid pg_catalog.oid;
  workspace_oid pg_catalog.oid;
  employee_oid pg_catalog.oid;
  workspace_id_attnum pg_catalog.int2;
  employee_id_attnum pg_catalog.int2;
  employee_workspace_attnum pg_catalog.int2;
  workspace_id_collation pg_catalog.oid;
  employee_id_collation pg_catalog.oid;
  employee_workspace_collation pg_catalog.oid;
  text_opclass_oid pg_catalog.oid;
  identity_guard_oid pg_catalog.oid;
  write_fence_oid pg_catalog.oid;
  contracts_oid pg_catalog.oid;
  protocol_oid pg_catalog.oid;
BEGIN
  SELECT namespace.oid, namespace.nspowner INTO schema_oid, schema_owner
  FROM pg_catalog.pg_namespace AS namespace WHERE namespace.nspname = 'nevora_tenancy';
  IF schema_oid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '3F000', MESSAGE = 'employee_login_identity_schema_missing';
  END IF;
  SELECT installer.oid INTO installer_oid FROM pg_catalog.pg_roles AS installer WHERE installer.rolname = current_user;
  IF installer_oid IS NULL OR schema_owner IS DISTINCT FROM installer_oid THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'employee_login_identity_schema_not_owned';
  END IF;
  IF (SELECT pg_catalog.count(*) FROM pg_catalog.pg_class AS parent
      JOIN pg_catalog.pg_namespace AS parent_namespace ON parent_namespace.oid = parent.relnamespace
      WHERE parent_namespace.nspname = 'public' AND parent.relname IN ('workspaces', 'employees')
        AND parent.relkind = 'r' AND parent.relpersistence = 'p' AND parent.relowner = installer_oid) <> 2 THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'employee_login_identity_parent_invalid';
  END IF;
  SELECT parent.oid INTO workspace_oid FROM pg_catalog.pg_class AS parent
  JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = parent.relnamespace
  WHERE namespace.nspname = 'public' AND parent.relname = 'workspaces';
  SELECT parent.oid INTO employee_oid FROM pg_catalog.pg_class AS parent
  JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = parent.relnamespace
  WHERE namespace.nspname = 'public' AND parent.relname = 'employees';
  SELECT attribute.attnum, attribute.attcollation INTO workspace_id_attnum, workspace_id_collation FROM pg_catalog.pg_attribute AS attribute
  WHERE attribute.attrelid = workspace_oid AND attribute.attname = 'id'
    AND attribute.attnum > 0 AND NOT attribute.attisdropped
    AND attribute.atttypid = 'pg_catalog.text'::pg_catalog.regtype AND attribute.atttypmod = -1
    AND attribute.attnotnull AND attribute.attidentity = '' AND attribute.attgenerated = '' AND NOT attribute.atthasdef;
  SELECT attribute.attnum, attribute.attcollation INTO employee_id_attnum, employee_id_collation FROM pg_catalog.pg_attribute AS attribute
  WHERE attribute.attrelid = employee_oid AND attribute.attname = 'id'
    AND attribute.attnum > 0 AND NOT attribute.attisdropped
    AND attribute.atttypid = 'pg_catalog.text'::pg_catalog.regtype AND attribute.atttypmod = -1
    AND attribute.attnotnull AND attribute.attidentity = '' AND attribute.attgenerated = '' AND NOT attribute.atthasdef;
  -- Staged source workspace metadata remains nullable: no source NOT NULL/cutover assertion.
  SELECT attribute.attnum, attribute.attcollation INTO employee_workspace_attnum, employee_workspace_collation FROM pg_catalog.pg_attribute AS attribute
  WHERE attribute.attrelid = employee_oid AND attribute.attname = 'workspace_id'
    AND attribute.attnum > 0 AND NOT attribute.attisdropped
    AND attribute.atttypid = 'pg_catalog.text'::pg_catalog.regtype AND attribute.atttypmod = -1
    AND attribute.attidentity = '' AND attribute.attgenerated = '' AND NOT attribute.atthasdef;
  IF employee_workspace_attnum IS NULL OR employee_id_attnum IS NULL OR workspace_id_attnum IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'employee_login_identity_parent_invalid';
  END IF;
  SELECT opclass.oid INTO text_opclass_oid FROM pg_catalog.pg_opclass AS opclass
  JOIN pg_catalog.pg_am AS method ON method.oid = opclass.opcmethod
  WHERE opclass.opcnamespace = 'pg_catalog'::pg_catalog.regnamespace AND opclass.opcname = 'text_ops'
    AND opclass.opcintype = 'pg_catalog.text'::pg_catalog.regtype AND opclass.opcdefault AND method.amname = 'btree';
  IF text_opclass_oid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'employee_login_identity_parent_invalid';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint AS key_constraint
    JOIN pg_catalog.pg_index AS key_index ON key_index.indexrelid = key_constraint.conindid AND key_index.indrelid = workspace_oid
    JOIN pg_catalog.pg_class AS key_relation ON key_relation.oid = key_index.indexrelid
    JOIN pg_catalog.pg_am AS method ON method.oid = key_relation.relam
    WHERE key_constraint.conrelid = workspace_oid AND key_constraint.contype = 'p'
      AND key_constraint.convalidated AND NOT key_constraint.condeferrable AND NOT key_constraint.condeferred
      AND COALESCE((pg_catalog.to_jsonb(key_constraint) ->> 'conenforced')::pg_catalog.bool, true)
      AND key_constraint.conkey = ARRAY[workspace_id_attnum]::pg_catalog.int2[]
      AND key_index.indisprimary AND key_index.indisunique AND key_index.indisvalid
      AND key_index.indisready AND key_index.indislive AND key_index.indimmediate
      AND NOT key_index.indnullsnotdistinct AND key_index.indpred IS NULL AND key_index.indexprs IS NULL
      AND key_index.indnatts = 1 AND key_index.indnkeyatts = 1 AND key_index.indkey[0] = workspace_id_attnum
      AND key_index.indclass[0] = text_opclass_oid AND key_index.indcollation[0] = workspace_id_collation
      AND key_index.indoption[0] = 0
      AND key_relation.relkind = 'i' AND key_relation.relpersistence = 'p' AND key_relation.relowner = installer_oid
      AND method.amname = 'btree'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'employee_login_identity_workspace_key_invalid';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint AS key_constraint
    JOIN pg_catalog.pg_index AS key_index ON key_index.indexrelid = key_constraint.conindid AND key_index.indrelid = employee_oid
    JOIN pg_catalog.pg_class AS key_relation ON key_relation.oid = key_index.indexrelid
    JOIN pg_catalog.pg_am AS method ON method.oid = key_relation.relam
    WHERE key_constraint.conrelid = employee_oid AND key_constraint.conname = 'f10_tenant_c49de3d265fb'
      AND key_constraint.contype = 'u' AND key_constraint.convalidated
      AND NOT key_constraint.condeferrable AND NOT key_constraint.condeferred
      AND COALESCE((pg_catalog.to_jsonb(key_constraint) ->> 'conenforced')::pg_catalog.bool, true)
      AND key_constraint.conkey = ARRAY[employee_workspace_attnum, employee_id_attnum]::pg_catalog.int2[]
      AND key_index.indisunique AND key_index.indisvalid AND key_index.indisready
      AND key_index.indislive AND key_index.indimmediate AND NOT key_index.indnullsnotdistinct
      AND key_index.indpred IS NULL AND key_index.indexprs IS NULL
      AND key_index.indnatts = 2 AND key_index.indnkeyatts = 2
      AND key_index.indkey[0] = employee_workspace_attnum AND key_index.indkey[1] = employee_id_attnum
      AND key_index.indclass[0] = text_opclass_oid AND key_index.indclass[1] = text_opclass_oid
      AND key_index.indcollation[0] = employee_workspace_collation AND key_index.indcollation[1] = employee_id_collation
      AND key_index.indoption[0] = 0 AND key_index.indoption[1] = 0
      AND key_relation.relkind = 'i' AND key_relation.relpersistence = 'p' AND key_relation.relowner = installer_oid
      AND method.amname = 'btree'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'employee_login_identity_employee_key_invalid';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint AS key_constraint
    JOIN pg_catalog.pg_index AS key_index ON key_index.indexrelid = key_constraint.conindid AND key_index.indrelid = employee_oid
    JOIN pg_catalog.pg_class AS key_relation ON key_relation.oid = key_index.indexrelid
    JOIN pg_catalog.pg_am AS method ON method.oid = key_relation.relam
    WHERE key_constraint.conrelid = employee_oid AND key_constraint.contype = 'p'
      AND key_constraint.convalidated AND NOT key_constraint.condeferrable AND NOT key_constraint.condeferred
      AND COALESCE((pg_catalog.to_jsonb(key_constraint) ->> 'conenforced')::pg_catalog.bool, true)
      AND key_constraint.conkey = ARRAY[employee_id_attnum]::pg_catalog.int2[]
      AND key_index.indisprimary AND key_index.indisunique AND key_index.indisvalid
      AND key_index.indisready AND key_index.indislive AND key_index.indimmediate
      AND NOT key_index.indnullsnotdistinct AND key_index.indpred IS NULL AND key_index.indexprs IS NULL
      AND key_index.indnatts = 1 AND key_index.indnkeyatts = 1 AND key_index.indkey[0] = employee_id_attnum
      AND key_index.indclass[0] = text_opclass_oid AND key_index.indcollation[0] = employee_id_collation
      AND key_index.indoption[0] = 0
      AND key_relation.relkind = 'i' AND key_relation.relpersistence = 'p' AND key_relation.relowner = installer_oid
      AND method.amname = 'btree'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'employee_login_identity_employee_identity_key_invalid';
  END IF;

  -- Bind the accepted immutable ownership implementation, not just a trigger/function name.
  -- prosrc pins use original 0026 dollar-body UTF8 bytes (not pg_get_functiondef rendering).
  SELECT function.oid INTO identity_guard_oid
  FROM pg_catalog.pg_proc AS function JOIN pg_catalog.pg_language AS language ON language.oid = function.prolang
  WHERE function.pronamespace = schema_oid AND function.proname = 'source_identity_guard'
    AND function.proowner = installer_oid AND function.prokind = 'f' AND function.pronargs = 0
    AND function.proargtypes = ''::pg_catalog.oidvector AND function.proargmodes IS NULL
    AND function.proallargtypes IS NULL AND NOT function.proretset AND function.prosecdef
    AND function.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype
    AND function.provolatile = 'v' AND function.proparallel = 'u' AND language.lanname = 'plpgsql'
    AND NOT function.proisstrict AND NOT function.proleakproof AND function.prosupport = 0 AND function.probin IS NULL
    AND function.proconfig = ARRAY['search_path=pg_catalog, nevora_tenancy']::pg_catalog.text[]
    AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(function.prosrc, 'UTF8')), 'hex') = '2434a5c2e3e22460f2363f4cdab2d7230759c15f05405f6bd7e6936cab6793e6';
  SELECT function.oid INTO write_fence_oid
  FROM pg_catalog.pg_proc AS function JOIN pg_catalog.pg_language AS language ON language.oid = function.prolang
  WHERE function.pronamespace = schema_oid AND function.proname = 'source_write_fence'
    AND function.proowner = installer_oid AND function.prokind = 'f' AND function.pronargs = 0
    AND function.proargtypes = ''::pg_catalog.oidvector AND function.proargmodes IS NULL
    AND function.proallargtypes IS NULL AND NOT function.proretset AND function.prosecdef
    AND function.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype
    AND function.provolatile = 'v' AND function.proparallel = 'u' AND language.lanname = 'plpgsql'
    AND NOT function.proisstrict AND NOT function.proleakproof AND function.prosupport = 0 AND function.probin IS NULL
    AND function.proconfig = ARRAY['search_path=pg_catalog, nevora_tenancy']::pg_catalog.text[]
    AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(function.prosrc, 'UTF8')), 'hex') = '28e074dcd7476327c72cc59ed4d97a6354ff90dfff17125a0f6adfe283653a45';
  IF identity_guard_oid IS NULL OR write_fence_oid IS NULL OR
    (SELECT pg_catalog.count(*) FROM pg_catalog.pg_trigger AS trigger
      WHERE trigger.tgrelid IN (workspace_oid, employee_oid)
        AND trigger.tgname = 'f10_identity_guard' AND trigger.tgfoid = identity_guard_oid
        AND trigger.tgtype = 31 AND trigger.tgenabled = 'O' AND NOT trigger.tgisinternal
        AND trigger.tgconstraint = 0 AND trigger.tgnargs = 0 AND trigger.tgqual IS NULL
        AND trigger.tgargs = ''::pg_catalog.bytea AND trigger.tgattr = ''::pg_catalog.int2vector
        AND trigger.tgoldtable IS NULL AND trigger.tgnewtable IS NULL) <> 2 OR
    (SELECT pg_catalog.count(*) FROM pg_catalog.pg_trigger AS trigger
      WHERE trigger.tgrelid IN (workspace_oid, employee_oid)
        AND trigger.tgname = 'f10_write_fence' AND trigger.tgfoid = write_fence_oid
        AND trigger.tgtype = 62 AND trigger.tgenabled = 'O' AND NOT trigger.tgisinternal
        AND trigger.tgconstraint = 0 AND trigger.tgnargs = 0 AND trigger.tgqual IS NULL
        AND trigger.tgargs = ''::pg_catalog.bytea AND trigger.tgattr = ''::pg_catalog.int2vector
        AND trigger.tgoldtable IS NULL AND trigger.tgnewtable IS NULL) <> 2 THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'employee_login_identity_source_guard_invalid';
  END IF;
  SELECT control.oid INTO contracts_oid FROM pg_catalog.pg_class AS control
  WHERE control.relnamespace = schema_oid AND control.relname = 'owned_table_contract'
    AND control.relkind = 'r' AND control.relpersistence = 'p' AND control.relowner = installer_oid;
  SELECT control.oid INTO protocol_oid FROM pg_catalog.pg_class AS control
  WHERE control.relnamespace = schema_oid AND control.relname = 'expansion_protocol'
    AND control.relkind = 'r' AND control.relpersistence = 'p' AND control.relowner = installer_oid;
  IF contracts_oid IS NULL OR protocol_oid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'employee_login_identity_source_contract_invalid';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM nevora_tenancy.owned_table_contract AS contract
    WHERE contract.table_name = 'employees' AND contract.storage = 'DIRECT_IMMUTABLE'
      AND contract.anchor = '{"kind":"CAPTURED_IMMUTABLE"}'::pg_catalog.jsonb
      AND contract.primary_key_columns = ARRAY['id']::pg_catalog.name[]
      AND contract.sidecar_name IS NULL AND contract.source_path = 'db/migrations/0001_initial.sql' AND contract.source_line = 18)
    OR NOT EXISTS (SELECT 1 FROM nevora_tenancy.owned_table_contract AS contract
    WHERE contract.table_name = 'workspaces' AND contract.storage = 'DIRECT_IMMUTABLE'
      AND contract.anchor = '{"kind":"ROOT","column":"id"}'::pg_catalog.jsonb
      AND contract.primary_key_columns = ARRAY['id']::pg_catalog.name[]
      AND contract.sidecar_name IS NULL AND contract.source_path = 'db/migrations/0008_workspace_positions.sql' AND contract.source_line = 3)
    OR NOT EXISTS (SELECT 1 FROM nevora_tenancy.expansion_protocol AS protocol
    WHERE protocol.migration_id = 26 AND protocol.phase IN ('EXPANDED_LEGACY', 'FENCED')
      AND protocol.schema_source_commit = '7c628e374f03c9025b2c0cfd3568be033f07238d'
      AND protocol.registry_sha256 = '5143825e2447b3883eb1551d0b4a82ce283b4c845896d28c3312fbecce95c681') THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'employee_login_identity_source_contract_invalid';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class AS relation
    WHERE relation.relnamespace = schema_oid AND relation.relname = 'employee_login_identity') THEN
    RAISE EXCEPTION USING ERRCODE = '42P07', MESSAGE = 'employee_login_identity_already_installed';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS function
    WHERE function.pronamespace = schema_oid AND function.proname = 'guard_employee_login_identity') THEN
    RAISE EXCEPTION USING ERRCODE = '42723', MESSAGE = 'employee_login_identity_guard_already_installed';
  END IF;
END;
$employee_login_identity_prerequisites$;
CREATE TABLE nevora_tenancy.employee_login_identity (
  employee_id pg_catalog.text PRIMARY KEY,
  workspace_id pg_catalog.text NOT NULL,
  employee_number pg_catalog.text NOT NULL CHECK (pg_catalog.octet_length(employee_number) > 0),
  normalized_number pg_catalog.text COLLATE pg_catalog."C" NOT NULL CHECK (pg_catalog.octet_length(normalized_number) > 0),
  UNIQUE (workspace_id, normalized_number),
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (workspace_id, employee_id) REFERENCES public.employees(workspace_id, id) ON UPDATE RESTRICT ON DELETE RESTRICT
);
CREATE FUNCTION nevora_tenancy.guard_employee_login_identity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $employee_login_identity_guard$
BEGIN
  IF TG_TABLE_SCHEMA IS DISTINCT FROM 'nevora_tenancy' OR TG_TABLE_NAME IS DISTINCT FROM 'employee_login_identity' THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'employee_login_identity_guard_route_invalid';
  END IF;
  IF TG_OP = 'UPDATE' AND TG_LEVEL = 'ROW' THEN
    IF pg_catalog.convert_to(NEW.employee_id, 'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.employee_id, 'UTF8')
      OR pg_catalog.convert_to(NEW.workspace_id, 'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.workspace_id, 'UTF8')
      OR pg_catalog.convert_to(NEW.employee_number, 'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.employee_number, 'UTF8')
      OR pg_catalog.convert_to(NEW.normalized_number, 'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.normalized_number, 'UTF8') THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'employee_login_identity_immutable';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND TG_LEVEL = 'ROW' THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'employee_login_identity_delete_forbidden';
  ELSIF TG_OP = 'TRUNCATE' AND TG_LEVEL = 'STATEMENT' THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'employee_login_identity_truncate_forbidden';
  ELSE
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'employee_login_identity_guard_route_invalid';
  END IF;
END;
$employee_login_identity_guard$;
CREATE TRIGGER employee_login_identity_row_guard
BEFORE UPDATE OR DELETE ON nevora_tenancy.employee_login_identity
FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.guard_employee_login_identity();
CREATE TRIGGER employee_login_identity_truncate_guard
BEFORE TRUNCATE ON nevora_tenancy.employee_login_identity
FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.guard_employee_login_identity();
ALTER TABLE nevora_tenancy.employee_login_identity ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.employee_login_identity FORCE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA nevora_tenancy FROM PUBLIC;
REVOKE ALL ON TABLE nevora_tenancy.employee_login_identity FROM PUBLIC;
REVOKE ALL ON FUNCTION nevora_tenancy.guard_employee_login_identity() FROM PUBLIC;
DO $employee_login_identity_acl$
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
    WHERE namespace.nspname = 'nevora_tenancy' AND control.relname = 'employee_login_identity'
      AND privileges.grantee <> control.relowner
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_class AS control
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = control.relnamespace
    JOIN pg_catalog.pg_attribute AS attribute ON attribute.attrelid = control.oid
    CROSS JOIN LATERAL pg_catalog.aclexplode(attribute.attacl) AS privileges
    WHERE namespace.nspname = 'nevora_tenancy' AND control.relname = 'employee_login_identity'
      AND attribute.attnum > 0 AND NOT attribute.attisdropped
      AND privileges.grantee <> control.relowner
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc AS function
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = function.pronamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(function.proacl,
      pg_catalog.acldefault('f', function.proowner))) AS privileges
    WHERE namespace.nspname = 'nevora_tenancy' AND function.proname = 'guard_employee_login_identity'
      AND function.pronargs = 0 AND privileges.grantee <> function.proowner
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'employee_login_identity_acl_invalid';
  END IF;
END;
$employee_login_identity_acl$;
COMMIT;
