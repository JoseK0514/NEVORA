-- Unused empty private current administrative scope/grant storage; not installed authority.
-- No source rows, roles, grants, seeds, role copies, compatibility enrollment, resolver or activation.
-- LEGACY_COMPATIBILITY requires independently captured approved source evidence.
-- Neither provenance labels nor references authenticate approval or verification.
-- Original employment/location/workspace text keys include padded, empty and long native bytes.
-- Keep staged nullable employee ownership and its original NOT VALID source FK unchanged.
-- The new non-null scoped references permit only exact attributed native parent identities.
-- Current scope/grants remain mutable for protected revocation/replacement, not retained history.
-- No atomic grant replacement: later protected writers serialize on the header, replace complete children,
-- verify header-policy equality with portal_authority and enforce ALL_TENANT/no children or LOCATIONS/full-set.
-- Grant/scope replacement must atomically advance existing authorization_version; policy definition changes also advance capability_policy_revision.
-- Owner/Lead/Employee role variants and source eligibility are freshly read, never inferred from these rows.
-- The invoker guard protects row identity and nondecreasing revision; it does not authorize a mutator.
-- Source/body pins bind bytes only, not captured ownership, caller, reviewer or operator authority.
-- Narrow protected writers/readers, current/final lock rechecks, proof expiry/current-proof/domain/RLS adoption,
-- actual Neon and full F10/F12 remain separate gates. No anti-revival or recovery guarantee.
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
DO $portal_administrative_prerequisites$
DECLARE
  schema_oid pg_catalog.oid;
  schema_owner pg_catalog.oid;
  installer_oid pg_catalog.oid;
  workspace_oid pg_catalog.oid;
  employee_oid pg_catalog.oid;
  location_oid pg_catalog.oid;
  portal_oid pg_catalog.oid;
  location_id_attnum pg_catalog.int2;
  location_workspace_attnum pg_catalog.int2;
  location_id_collation pg_catalog.oid;
  location_workspace_collation pg_catalog.oid;
  portal_workspace_attnum pg_catalog.int2;
  portal_employee_attnum pg_catalog.int2;
  portal_workspace_collation pg_catalog.oid;
  portal_employee_collation pg_catalog.oid;
  portal_attribute_count pg_catalog.int8;
  portal_guard_oid pg_catalog.oid;
  expected_column record;
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
    RAISE EXCEPTION USING ERRCODE = '3F000', MESSAGE = 'portal_administrative_schema_missing';
  END IF;
  SELECT installer.oid INTO installer_oid FROM pg_catalog.pg_roles AS installer WHERE installer.rolname = current_user;
  IF installer_oid IS NULL OR schema_owner IS DISTINCT FROM installer_oid THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'portal_administrative_schema_not_owned';
  END IF;
  IF (SELECT pg_catalog.count(*) FROM pg_catalog.pg_class AS parent
      JOIN pg_catalog.pg_namespace AS parent_namespace ON parent_namespace.oid = parent.relnamespace
      WHERE parent_namespace.nspname = 'public' AND parent.relname IN ('workspaces', 'employees', 'locations')
        AND parent.relkind = 'r' AND parent.relpersistence = 'p' AND parent.relowner = installer_oid) <> 3 THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_administrative_parent_invalid';
  END IF;
  SELECT parent.oid INTO workspace_oid FROM pg_catalog.pg_class AS parent
  JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = parent.relnamespace
  WHERE namespace.nspname = 'public' AND parent.relname = 'workspaces';
  SELECT parent.oid INTO employee_oid FROM pg_catalog.pg_class AS parent
  JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = parent.relnamespace
  WHERE namespace.nspname = 'public' AND parent.relname = 'employees';
  SELECT parent.oid INTO location_oid FROM pg_catalog.pg_class AS parent
  JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = parent.relnamespace
  WHERE namespace.nspname = 'public' AND parent.relname = 'locations';
  SELECT control.oid INTO portal_oid FROM pg_catalog.pg_class AS control
  WHERE control.relnamespace = schema_oid AND control.relname = 'portal_authority'
    AND control.relkind = 'r' AND control.relpersistence = 'p' AND control.relowner = installer_oid
    AND control.relrowsecurity AND control.relforcerowsecurity;
  IF portal_oid IS NULL OR EXISTS (SELECT 1 FROM pg_catalog.pg_policy AS policy WHERE policy.polrelid = portal_oid) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_administrative_portal_invalid';
  END IF;
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
  -- Staged employee workspace metadata remains nullable; no source NOT NULL/cutover assertion.
  SELECT attribute.attnum, attribute.attcollation INTO employee_workspace_attnum, employee_workspace_collation FROM pg_catalog.pg_attribute AS attribute
  WHERE attribute.attrelid = employee_oid AND attribute.attname = 'workspace_id'
    AND attribute.attnum > 0 AND NOT attribute.attisdropped
    AND attribute.atttypid = 'pg_catalog.text'::pg_catalog.regtype AND attribute.atttypmod = -1
    AND attribute.attidentity = '' AND attribute.attgenerated = '' AND NOT attribute.atthasdef;
  -- Original location workspace metadata is already non-null; do not alter original parents.
  SELECT attribute.attnum, attribute.attcollation INTO location_id_attnum, location_id_collation FROM pg_catalog.pg_attribute AS attribute
  WHERE attribute.attrelid = location_oid AND attribute.attname = 'id'
    AND attribute.attnum > 0 AND NOT attribute.attisdropped
    AND attribute.atttypid = 'pg_catalog.text'::pg_catalog.regtype AND attribute.atttypmod = -1
    AND attribute.attnotnull AND attribute.attidentity = '' AND attribute.attgenerated = '' AND NOT attribute.atthasdef;
  SELECT attribute.attnum, attribute.attcollation INTO location_workspace_attnum, location_workspace_collation FROM pg_catalog.pg_attribute AS attribute
  WHERE attribute.attrelid = location_oid AND attribute.attname = 'workspace_id'
    AND attribute.attnum > 0 AND NOT attribute.attisdropped
    AND attribute.atttypid = 'pg_catalog.text'::pg_catalog.regtype AND attribute.atttypmod = -1
    AND attribute.attnotnull AND attribute.attidentity = '' AND attribute.attgenerated = '' AND NOT attribute.atthasdef;
  IF location_id_attnum IS NULL OR location_workspace_attnum IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_administrative_parent_invalid';
  END IF;
  SELECT pg_catalog.count(*) INTO portal_attribute_count FROM pg_catalog.pg_attribute AS attribute
  WHERE attribute.attrelid = portal_oid AND attribute.attnum > 0 AND NOT attribute.attisdropped;
  IF portal_attribute_count <> 8 THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_administrative_portal_column_invalid';
  END IF;
  FOR expected_column IN SELECT * FROM (VALUES
    ('workspace_id', 'pg_catalog.text'::pg_catalog.regtype),
    ('employee_id', 'pg_catalog.text'::pg_catalog.regtype),
    ('authorization_version', 'pg_catalog.int8'::pg_catalog.regtype),
    ('portal_access_version', 'pg_catalog.int8'::pg_catalog.regtype),
    ('capability_policy_revision', 'pg_catalog.int8'::pg_catalog.regtype),
    ('portal_state', 'pg_catalog.text'::pg_catalog.regtype),
    ('proof_provenance', 'pg_catalog.text'::pg_catalog.regtype),
    ('provenance_reference', 'pg_catalog.text'::pg_catalog.regtype)
  ) AS expected(name, type_oid) LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute AS attribute
      WHERE attribute.attrelid = portal_oid AND attribute.attname = expected_column.name
        AND attribute.atttypid = expected_column.type_oid AND attribute.atttypmod = -1
        AND attribute.attnum > 0 AND NOT attribute.attisdropped AND attribute.attnotnull
        AND attribute.attidentity = '' AND attribute.attgenerated = '' AND NOT attribute.atthasdef) THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_administrative_portal_column_invalid';
    END IF;
  END LOOP;
  SELECT attribute.attnum, attribute.attcollation INTO portal_workspace_attnum, portal_workspace_collation
  FROM pg_catalog.pg_attribute AS attribute WHERE attribute.attrelid = portal_oid AND attribute.attname = 'workspace_id';
  SELECT attribute.attnum, attribute.attcollation INTO portal_employee_attnum, portal_employee_collation
  FROM pg_catalog.pg_attribute AS attribute WHERE attribute.attrelid = portal_oid AND attribute.attname = 'employee_id';
  IF employee_workspace_attnum IS NULL OR employee_id_attnum IS NULL OR workspace_id_attnum IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_administrative_parent_invalid';
  END IF;
  SELECT opclass.oid INTO text_opclass_oid FROM pg_catalog.pg_opclass AS opclass
  JOIN pg_catalog.pg_am AS method ON method.oid = opclass.opcmethod
  WHERE opclass.opcnamespace = 'pg_catalog'::pg_catalog.regnamespace AND opclass.opcname = 'text_ops'
    AND opclass.opcintype = 'pg_catalog.text'::pg_catalog.regtype AND opclass.opcdefault AND method.amname = 'btree';
  IF text_opclass_oid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_administrative_parent_invalid';
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
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_administrative_workspace_key_invalid';
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
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_administrative_employee_key_invalid';
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
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_administrative_employee_identity_key_invalid';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint AS key_constraint
    JOIN pg_catalog.pg_index AS key_index ON key_index.indexrelid = key_constraint.conindid AND key_index.indrelid = location_oid
    JOIN pg_catalog.pg_class AS key_relation ON key_relation.oid = key_index.indexrelid
    JOIN pg_catalog.pg_am AS method ON method.oid = key_relation.relam
    WHERE key_constraint.conrelid = location_oid AND key_constraint.conname = 'communication_location_workspace_key'
      AND key_constraint.contype = 'u' AND key_constraint.convalidated
      AND NOT key_constraint.condeferrable AND NOT key_constraint.condeferred
      AND COALESCE((pg_catalog.to_jsonb(key_constraint) ->> 'conenforced')::pg_catalog.bool, true)
      AND key_constraint.conkey = ARRAY[location_workspace_attnum, location_id_attnum]::pg_catalog.int2[]
      AND key_index.indisunique AND key_index.indisvalid AND key_index.indisready
      AND key_index.indislive AND key_index.indimmediate AND NOT key_index.indnullsnotdistinct
      AND key_index.indpred IS NULL AND key_index.indexprs IS NULL
      AND key_index.indnatts = 2 AND key_index.indnkeyatts = 2
      AND key_index.indkey[0] = location_workspace_attnum AND key_index.indkey[1] = location_id_attnum
      AND key_index.indclass[0] = text_opclass_oid AND key_index.indclass[1] = text_opclass_oid
      AND key_index.indcollation[0] = location_workspace_collation AND key_index.indcollation[1] = location_id_collation
      AND key_index.indoption[0] = 0 AND key_index.indoption[1] = 0
      AND key_relation.relkind = 'i' AND key_relation.relpersistence = 'p' AND key_relation.relowner = installer_oid
      AND method.amname = 'btree'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_administrative_location_key_invalid';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint AS key_constraint
    JOIN pg_catalog.pg_index AS key_index ON key_index.indexrelid = key_constraint.conindid AND key_index.indrelid = location_oid
    JOIN pg_catalog.pg_class AS key_relation ON key_relation.oid = key_index.indexrelid
    JOIN pg_catalog.pg_am AS method ON method.oid = key_relation.relam
    WHERE key_constraint.conrelid = location_oid AND key_constraint.contype = 'p'
      AND key_constraint.convalidated AND NOT key_constraint.condeferrable AND NOT key_constraint.condeferred
      AND COALESCE((pg_catalog.to_jsonb(key_constraint) ->> 'conenforced')::pg_catalog.bool, true)
      AND key_constraint.conkey = ARRAY[location_id_attnum]::pg_catalog.int2[]
      AND key_index.indisprimary AND key_index.indisunique AND key_index.indisvalid
      AND key_index.indisready AND key_index.indislive AND key_index.indimmediate
      AND NOT key_index.indnullsnotdistinct AND key_index.indpred IS NULL AND key_index.indexprs IS NULL
      AND key_index.indnatts = 1 AND key_index.indnkeyatts = 1 AND key_index.indkey[0] = location_id_attnum
      AND key_index.indclass[0] = text_opclass_oid AND key_index.indcollation[0] = location_id_collation
      AND key_index.indoption[0] = 0
      AND key_relation.relkind = 'i' AND key_relation.relpersistence = 'p' AND key_relation.relowner = installer_oid
      AND method.amname = 'btree'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_administrative_location_identity_key_invalid';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint AS key_constraint
    JOIN pg_catalog.pg_index AS key_index ON key_index.indexrelid = key_constraint.conindid AND key_index.indrelid = portal_oid
    JOIN pg_catalog.pg_class AS key_relation ON key_relation.oid = key_index.indexrelid
    JOIN pg_catalog.pg_am AS method ON method.oid = key_relation.relam
    WHERE key_constraint.conrelid = portal_oid 
      AND key_constraint.contype = 'p' AND key_constraint.convalidated
      AND NOT key_constraint.condeferrable AND NOT key_constraint.condeferred
      AND COALESCE((pg_catalog.to_jsonb(key_constraint) ->> 'conenforced')::pg_catalog.bool, true)
      AND key_constraint.conkey = ARRAY[portal_workspace_attnum, portal_employee_attnum]::pg_catalog.int2[]
      AND key_index.indisprimary AND key_index.indisunique AND key_index.indisvalid AND key_index.indisready
      AND key_index.indislive AND key_index.indimmediate AND NOT key_index.indnullsnotdistinct
      AND key_index.indpred IS NULL AND key_index.indexprs IS NULL
      AND key_index.indnatts = 2 AND key_index.indnkeyatts = 2
      AND key_index.indkey[0] = portal_workspace_attnum AND key_index.indkey[1] = portal_employee_attnum
      AND key_index.indclass[0] = text_opclass_oid AND key_index.indclass[1] = text_opclass_oid
      AND key_index.indcollation[0] = portal_workspace_collation AND key_index.indcollation[1] = portal_employee_collation
      AND key_index.indoption[0] = 0 AND key_index.indoption[1] = 0
      AND key_relation.relkind = 'i' AND key_relation.relpersistence = 'p' AND key_relation.relowner = installer_oid
      AND method.amname = 'btree'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_administrative_portal_key_invalid';
  END IF;

  IF (SELECT pg_catalog.count(*) FROM pg_catalog.pg_constraint AS key_constraint
      WHERE key_constraint.conrelid = portal_oid AND key_constraint.contype = 'f') <> 2
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint AS key_constraint
      WHERE key_constraint.conrelid = portal_oid AND key_constraint.contype = 'f'
        AND key_constraint.conkey = ARRAY[portal_workspace_attnum]::pg_catalog.int2[]
        AND key_constraint.confrelid = workspace_oid AND key_constraint.confkey = ARRAY[workspace_id_attnum]::pg_catalog.int2[]
        AND key_constraint.convalidated AND NOT key_constraint.condeferrable AND NOT key_constraint.condeferred
        AND COALESCE((pg_catalog.to_jsonb(key_constraint) ->> 'conenforced')::pg_catalog.bool, true)
        AND key_constraint.confupdtype = 'r' AND key_constraint.confdeltype = 'r' AND key_constraint.confmatchtype = 's')
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint AS key_constraint
      WHERE key_constraint.conrelid = portal_oid AND key_constraint.contype = 'f'
        AND key_constraint.conkey = ARRAY[portal_workspace_attnum, portal_employee_attnum]::pg_catalog.int2[]
        AND key_constraint.confrelid = employee_oid AND key_constraint.confkey = ARRAY[employee_workspace_attnum, employee_id_attnum]::pg_catalog.int2[]
        AND key_constraint.convalidated AND NOT key_constraint.condeferrable AND NOT key_constraint.condeferred
        AND COALESCE((pg_catalog.to_jsonb(key_constraint) ->> 'conenforced')::pg_catalog.bool, true)
        AND key_constraint.confupdtype = 'r' AND key_constraint.confdeltype = 'r' AND key_constraint.confmatchtype = 's') THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_administrative_portal_invalid';
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
      WHERE trigger.tgrelid IN (workspace_oid, employee_oid, location_oid)
        AND trigger.tgname = 'f10_identity_guard' AND trigger.tgfoid = identity_guard_oid
        AND trigger.tgtype = 31 AND trigger.tgenabled = 'O' AND NOT trigger.tgisinternal
        AND trigger.tgconstraint = 0 AND trigger.tgnargs = 0 AND trigger.tgqual IS NULL
        AND trigger.tgargs = ''::pg_catalog.bytea AND trigger.tgattr = ''::pg_catalog.int2vector
        AND trigger.tgoldtable IS NULL AND trigger.tgnewtable IS NULL) <> 3 OR
    (SELECT pg_catalog.count(*) FROM pg_catalog.pg_trigger AS trigger
      WHERE trigger.tgrelid IN (workspace_oid, employee_oid, location_oid)
        AND trigger.tgname = 'f10_write_fence' AND trigger.tgfoid = write_fence_oid
        AND trigger.tgtype = 62 AND trigger.tgenabled = 'O' AND NOT trigger.tgisinternal
        AND trigger.tgconstraint = 0 AND trigger.tgnargs = 0 AND trigger.tgqual IS NULL
        AND trigger.tgargs = ''::pg_catalog.bytea AND trigger.tgattr = ''::pg_catalog.int2vector
        AND trigger.tgoldtable IS NULL AND trigger.tgnewtable IS NULL) <> 3 THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_administrative_source_guard_invalid';
  END IF;
  SELECT control.oid INTO contracts_oid FROM pg_catalog.pg_class AS control
  WHERE control.relnamespace = schema_oid AND control.relname = 'owned_table_contract'
    AND control.relkind = 'r' AND control.relpersistence = 'p' AND control.relowner = installer_oid;
  SELECT control.oid INTO protocol_oid FROM pg_catalog.pg_class AS control
  WHERE control.relnamespace = schema_oid AND control.relname = 'expansion_protocol'
    AND control.relkind = 'r' AND control.relpersistence = 'p' AND control.relowner = installer_oid;
  IF contracts_oid IS NULL OR protocol_oid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_administrative_source_contract_invalid';
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
    OR NOT EXISTS (SELECT 1 FROM nevora_tenancy.owned_table_contract AS contract
    WHERE contract.table_name = 'locations' AND contract.storage = 'DIRECT_IMMUTABLE'
      AND contract.anchor = '{"kind":"DIRECT","column":"workspace_id"}'::pg_catalog.jsonb
      AND contract.primary_key_columns = ARRAY['id']::pg_catalog.name[]
      AND contract.sidecar_name IS NULL AND contract.source_path = 'db/migrations/0001_initial.sql' AND contract.source_line = 3)
    OR NOT EXISTS (SELECT 1 FROM nevora_tenancy.expansion_protocol AS protocol
    WHERE protocol.migration_id = 26 AND protocol.phase IN ('EXPANDED_LEGACY', 'FENCED')
      AND protocol.schema_source_commit = '7c628e374f03c9025b2c0cfd3568be033f07238d'
      AND protocol.registry_sha256 = '5143825e2447b3883eb1551d0b4a82ce283b4c845896d28c3312fbecce95c681') THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_administrative_source_contract_invalid';
  END IF;
  -- Accepted private portal guard is an invoker metadata guard, never a proof issuer.
  SELECT function.oid INTO portal_guard_oid
  FROM pg_catalog.pg_proc AS function JOIN pg_catalog.pg_language AS language ON language.oid = function.prolang
  WHERE function.pronamespace = schema_oid AND function.proname = 'guard_portal_authority'
    AND function.proowner = installer_oid AND function.prokind = 'f' AND function.pronargs = 0
    AND function.proargtypes = ''::pg_catalog.oidvector AND function.proargmodes IS NULL
    AND function.proallargtypes IS NULL AND NOT function.proretset AND NOT function.prosecdef
    AND function.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype
    AND function.provolatile = 'v' AND function.proparallel = 'u' AND language.lanname = 'plpgsql'
    AND NOT function.proisstrict AND NOT function.proleakproof AND function.prosupport = 0 AND function.probin IS NULL
    AND function.proconfig = ARRAY['search_path=pg_catalog']::pg_catalog.text[]
    AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(function.prosrc, 'UTF8')), 'hex') = '5a971382baf425367090ad60490ed8b243718456b8acb332d734a90a6fec4664';
  IF portal_guard_oid IS NULL
    OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_trigger AS trigger
      WHERE trigger.tgrelid = portal_oid AND trigger.tgname = 'portal_authority_row_guard'
        AND trigger.tgfoid = portal_guard_oid AND trigger.tgtype = 27 AND trigger.tgenabled = 'O'
        AND NOT trigger.tgisinternal AND trigger.tgconstraint = 0 AND trigger.tgnargs = 0
        AND trigger.tgqual IS NULL AND trigger.tgargs = ''::pg_catalog.bytea AND trigger.tgattr = ''::pg_catalog.int2vector
        AND trigger.tgoldtable IS NULL AND trigger.tgnewtable IS NULL) <> 1
    OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_trigger AS trigger
      WHERE trigger.tgrelid = portal_oid AND trigger.tgname = 'portal_authority_truncate_guard'
        AND trigger.tgfoid = portal_guard_oid AND trigger.tgtype = 34 AND trigger.tgenabled = 'O'
        AND NOT trigger.tgisinternal AND trigger.tgconstraint = 0 AND trigger.tgnargs = 0
        AND trigger.tgqual IS NULL AND trigger.tgargs = ''::pg_catalog.bytea AND trigger.tgattr = ''::pg_catalog.int2vector
        AND trigger.tgoldtable IS NULL AND trigger.tgnewtable IS NULL) <> 1 THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_administrative_portal_guard_invalid';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class AS control
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(control.relacl, pg_catalog.acldefault('r', control.relowner))) AS privileges
    WHERE control.oid = portal_oid AND privileges.grantee <> control.relowner)
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_attribute AS attribute
      CROSS JOIN LATERAL pg_catalog.aclexplode(attribute.attacl) AS privileges
      WHERE attribute.attrelid = portal_oid AND attribute.attnum > 0 AND NOT attribute.attisdropped
        AND privileges.grantee <> installer_oid)
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS function
      CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(function.proacl, pg_catalog.acldefault('f', function.proowner))) AS privileges
      WHERE function.oid = portal_guard_oid AND privileges.grantee <> function.proowner) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'portal_administrative_portal_acl_invalid';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class AS relation
    WHERE relation.relnamespace = schema_oid AND relation.relname IN ('portal_administrative_authority', 'portal_administrative_capability', 'portal_administrative_location')) THEN
    RAISE EXCEPTION USING ERRCODE = '42P07', MESSAGE = 'portal_administrative_already_installed';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS function
    WHERE function.pronamespace = schema_oid AND function.proname = 'guard_portal_administrative_authority') THEN
    RAISE EXCEPTION USING ERRCODE = '42723', MESSAGE = 'portal_administrative_guard_already_installed';
  END IF;
END;
$portal_administrative_prerequisites$;
CREATE TABLE nevora_tenancy.portal_administrative_authority (
  workspace_id pg_catalog.text NOT NULL,
  employee_id pg_catalog.text NOT NULL,
  scope_kind pg_catalog.text NOT NULL CHECK (scope_kind COLLATE pg_catalog."C" IN ('ALL_TENANT', 'LOCATIONS')),
  scope_origin pg_catalog.text NOT NULL CHECK (scope_origin COLLATE pg_catalog."C" IN ('LEGACY_COMPATIBILITY', 'EXPLICIT_GRANT')),
  provenance_reference pg_catalog.text NOT NULL,
  capability_policy_revision pg_catalog.int8 NOT NULL CHECK (capability_policy_revision > 0::pg_catalog.int8),
  CHECK (scope_kind COLLATE pg_catalog."C" = 'ALL_TENANT' OR scope_origin COLLATE pg_catalog."C" = 'EXPLICIT_GRANT'),
  PRIMARY KEY (workspace_id, employee_id),
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (workspace_id, employee_id) REFERENCES public.employees(workspace_id, id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (workspace_id, employee_id) REFERENCES nevora_tenancy.portal_authority(workspace_id, employee_id) ON UPDATE RESTRICT ON DELETE RESTRICT
);
CREATE TABLE nevora_tenancy.portal_administrative_capability (
  workspace_id pg_catalog.text NOT NULL,
  employee_id pg_catalog.text NOT NULL,
  capability pg_catalog.text NOT NULL CHECK (capability COLLATE pg_catalog."C" IN (
    'management.home.read', 'management.own-workforce',
  'self.schedule.read', 'self.workforce.manage', 'self.time.read', 'self.time.request',
  'profile.self.read', 'security.self.manage',
  'employee.roster.read', 'employee.create', 'employee.role.edit', 'employee.core.edit',
  'employee.eligibility.edit', 'employee.positions.edit', 'employee.deactivate', 'employee.restore',
  'authority.grant', 'workspace.edit', 'workspace.suspend', 'workspace.restore', 'catalog.read', 'catalog.manage',
  'configuration.scheduling.manage', 'schedule.draft.read', 'schedule.readiness.read',
  'schedule.assign', 'schedule.generate', 'schedule.publish', 'schedule.restore', 'request.review',
  'attendance.read', 'correction.review', 'timecard.read', 'timecard.approve', 'timecard.finalize', 'timecard.reopen',
  'report.read', 'report.export', 'payroll.read', 'payroll.export', 'action-center.read',
  'communication.team.author', 'communication.management.author', 'communication.revise',
  'communication.withdraw', 'communication.require-ack', 'communication.recipient-receipts.read',
  'communication.own-receipt.read', 'communication.sent-summary.read',
  'calendar.self.issue', 'calendar.self.rotate', 'calendar.self.revoke', 'calendar.self.read', 'calendar.employee.revoke',
  'clocker.device.manage', 'clocker.pin.support', 'clocker.pin.self', 'audit.read', 'audit.self.read',
  'onboarding.configure', 'onboarding.finish', 'csv.preview', 'csv.commit', 'csv.receipt', 'csv.replay', 'csv.reverse'
  )),
  PRIMARY KEY (workspace_id, employee_id, capability),
  FOREIGN KEY (workspace_id, employee_id) REFERENCES nevora_tenancy.portal_administrative_authority(workspace_id, employee_id) ON UPDATE RESTRICT ON DELETE RESTRICT
);
CREATE TABLE nevora_tenancy.portal_administrative_location (
  workspace_id pg_catalog.text NOT NULL,
  employee_id pg_catalog.text NOT NULL,
  location_id pg_catalog.text NOT NULL,
  PRIMARY KEY (workspace_id, employee_id, location_id),
  FOREIGN KEY (workspace_id, employee_id) REFERENCES nevora_tenancy.portal_administrative_authority(workspace_id, employee_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (workspace_id, location_id) REFERENCES public.locations(workspace_id, id) ON UPDATE RESTRICT ON DELETE RESTRICT
);
CREATE FUNCTION nevora_tenancy.guard_portal_administrative_authority()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $portal_administrative_guard$
BEGIN
  IF TG_TABLE_SCHEMA IS DISTINCT FROM 'nevora_tenancy'
    OR TG_TABLE_NAME NOT IN ('portal_administrative_authority', 'portal_administrative_capability', 'portal_administrative_location') THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_administrative_guard_route_invalid';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF TG_LEVEL IS DISTINCT FROM 'ROW' THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_administrative_guard_route_invalid';
    END IF;
    IF pg_catalog.convert_to(NEW.workspace_id, 'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.workspace_id, 'UTF8')
      OR pg_catalog.convert_to(NEW.employee_id, 'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.employee_id, 'UTF8') THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_administrative_identity_immutable';
    END IF;
    IF TG_TABLE_NAME = 'portal_administrative_authority' THEN
      IF NEW.capability_policy_revision IS NULL OR NEW.capability_policy_revision < OLD.capability_policy_revision THEN
        RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'portal_administrative_revision_decreased';
      END IF;
    ELSIF TG_TABLE_NAME = 'portal_administrative_capability' THEN
      IF pg_catalog.convert_to(NEW.capability, 'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.capability, 'UTF8') THEN
        RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_administrative_identity_immutable';
      END IF;
    ELSIF TG_TABLE_NAME = 'portal_administrative_location' THEN
      IF pg_catalog.convert_to(NEW.location_id, 'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.location_id, 'UTF8') THEN
        RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_administrative_identity_immutable';
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'TRUNCATE' THEN
    IF TG_LEVEL IS DISTINCT FROM 'STATEMENT' THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_administrative_guard_route_invalid';
    END IF;
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_administrative_truncate_forbidden';
  ELSE
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_administrative_guard_route_invalid';
  END IF;
END;
$portal_administrative_guard$;
CREATE TRIGGER portal_administrative_authority_identity_guard
BEFORE UPDATE ON nevora_tenancy.portal_administrative_authority
FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.guard_portal_administrative_authority();
CREATE TRIGGER portal_administrative_authority_truncate_guard
BEFORE TRUNCATE ON nevora_tenancy.portal_administrative_authority
FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.guard_portal_administrative_authority();
CREATE TRIGGER portal_administrative_capability_identity_guard
BEFORE UPDATE ON nevora_tenancy.portal_administrative_capability
FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.guard_portal_administrative_authority();
CREATE TRIGGER portal_administrative_capability_truncate_guard
BEFORE TRUNCATE ON nevora_tenancy.portal_administrative_capability
FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.guard_portal_administrative_authority();
CREATE TRIGGER portal_administrative_location_identity_guard
BEFORE UPDATE ON nevora_tenancy.portal_administrative_location
FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.guard_portal_administrative_authority();
CREATE TRIGGER portal_administrative_location_truncate_guard
BEFORE TRUNCATE ON nevora_tenancy.portal_administrative_location
FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.guard_portal_administrative_authority();
ALTER TABLE nevora_tenancy.portal_administrative_authority ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.portal_administrative_authority FORCE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.portal_administrative_capability ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.portal_administrative_capability FORCE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.portal_administrative_location ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.portal_administrative_location FORCE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA nevora_tenancy FROM PUBLIC;
REVOKE ALL ON TABLE nevora_tenancy.portal_administrative_authority FROM PUBLIC;
REVOKE ALL ON TABLE nevora_tenancy.portal_administrative_capability FROM PUBLIC;
REVOKE ALL ON TABLE nevora_tenancy.portal_administrative_location FROM PUBLIC;
REVOKE ALL ON FUNCTION nevora_tenancy.guard_portal_administrative_authority() FROM PUBLIC;
DO $portal_administrative_acl$
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
    WHERE namespace.nspname = 'nevora_tenancy' AND control.relname IN ('portal_administrative_authority', 'portal_administrative_capability', 'portal_administrative_location')
      AND privileges.grantee <> control.relowner
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_class AS control
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = control.relnamespace
    JOIN pg_catalog.pg_attribute AS attribute ON attribute.attrelid = control.oid
    CROSS JOIN LATERAL pg_catalog.aclexplode(attribute.attacl) AS privileges
    WHERE namespace.nspname = 'nevora_tenancy' AND control.relname IN ('portal_administrative_authority', 'portal_administrative_capability', 'portal_administrative_location')
      AND attribute.attnum > 0 AND NOT attribute.attisdropped
      AND privileges.grantee <> control.relowner
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc AS function
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = function.pronamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(function.proacl,
      pg_catalog.acldefault('f', function.proowner))) AS privileges
    WHERE namespace.nspname = 'nevora_tenancy' AND function.proname = 'guard_portal_administrative_authority'
      AND function.pronargs = 0 AND privileges.grantee <> function.proowner
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'portal_administrative_acl_invalid';
  END IF;
END;
$portal_administrative_acl$;
COMMIT;
