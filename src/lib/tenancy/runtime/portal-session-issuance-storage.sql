-- Unused empty private LIVE sidecar for native portal-session issuance observations; installation is separately authorized.
-- No source rows, seeds, roles, grants, enrollment, verifier claims, issuer or current-proof authority.
-- Existing sessions retain native char64 global identity and their actual expiry; no copied expiry or new TTL.
-- Deletion cascades are deliberate: logout, password reset, employment deactivation and tablet handover must survive.
-- This is not a tombstone/history writer; there is no DELETE/TRUNCATE refusal or automatic recreation.
-- Stored generations/source matches are observations, never credential/operator/tenant authority.
-- Immutable scoped employment retains staged nullable ownership and NOT VALID original workspace FK.
-- Positive binding requires independently captured ownership, protected current-generation issuance and explicit legacy compatibility mapping.
-- Matching INSERT guard locks only its actual source session; protected caller must hold preceding tenant/employee/authority locks.
-- Missing access policies, mutation/issuance writer, current-proof/resolver, trusted-change adoption and actual Neon remain OPEN.
-- No anti-revival or recovery guarantee: an older backup can restore an old session, sidecar and counter together.
-- Recovery must reconcile approved high-water/permanent revocations or fence/invalidate before traffic.
-- Retained guard/control pins are bounded source observations, not a complete catalog or backfill/cutover certification.
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
DO $portal_session_issuance_prerequisites$
DECLARE
  schema_oid pg_catalog.oid;
  schema_owner pg_catalog.oid;
  installer_oid pg_catalog.oid;
  workspace_oid pg_catalog.oid;
  employee_oid pg_catalog.oid;
  session_oid pg_catalog.oid;
  session_token_attnum pg_catalog.int2;
  session_employee_attnum pg_catalog.int2;
  session_expiry_attnum pg_catalog.int2;
  session_token_collation pg_catalog.oid;
  session_employee_collation pg_catalog.oid;
  session_expiry_collation pg_catalog.oid;
  bpchar_opclass_oid pg_catalog.oid;
  timestamptz_opclass_oid pg_catalog.oid;
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
    RAISE EXCEPTION USING ERRCODE = '3F000', MESSAGE = 'portal_session_issuance_schema_missing';
  END IF;
  SELECT installer.oid INTO installer_oid FROM pg_catalog.pg_roles AS installer WHERE installer.rolname = current_user;
  IF installer_oid IS NULL OR schema_owner IS DISTINCT FROM installer_oid THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'portal_session_issuance_schema_not_owned';
  END IF;
  IF (SELECT pg_catalog.count(*) FROM pg_catalog.pg_class AS parent
      JOIN pg_catalog.pg_namespace AS parent_namespace ON parent_namespace.oid = parent.relnamespace
      WHERE parent_namespace.nspname = 'public' AND parent.relname IN ('workspaces', 'employees', 'employee_sessions')
        AND parent.relkind = 'r' AND parent.relpersistence = 'p' AND parent.relowner = installer_oid) <> 3 THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_session_issuance_parent_invalid';
  END IF;
  SELECT parent.oid INTO workspace_oid FROM pg_catalog.pg_class AS parent
  JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = parent.relnamespace
  WHERE namespace.nspname = 'public' AND parent.relname = 'workspaces';
  SELECT parent.oid INTO employee_oid FROM pg_catalog.pg_class AS parent
  JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = parent.relnamespace
  WHERE namespace.nspname = 'public' AND parent.relname = 'employees';
  SELECT parent.oid INTO session_oid FROM pg_catalog.pg_class AS parent
  JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = parent.relnamespace
  WHERE namespace.nspname = 'public' AND parent.relname = 'employee_sessions';
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
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_session_issuance_parent_invalid';
  END IF;
  SELECT opclass.oid INTO text_opclass_oid FROM pg_catalog.pg_opclass AS opclass
  JOIN pg_catalog.pg_am AS method ON method.oid = opclass.opcmethod
  WHERE opclass.opcnamespace = 'pg_catalog'::pg_catalog.regnamespace AND opclass.opcname = 'text_ops'
    AND opclass.opcintype = 'pg_catalog.text'::pg_catalog.regtype AND opclass.opcdefault AND method.amname = 'btree';
  IF text_opclass_oid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_session_issuance_parent_invalid';
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
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_session_issuance_workspace_key_invalid';
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
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_session_issuance_employee_key_invalid';
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
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_session_issuance_employee_identity_key_invalid';
  END IF;


  -- Exact original four-column live-session shape; no guessed source composite key.
  IF (SELECT pg_catalog.array_agg(attribute.attname ORDER BY attribute.attnum)
      FROM pg_catalog.pg_attribute AS attribute
      WHERE attribute.attrelid = session_oid AND attribute.attnum > 0 AND NOT attribute.attisdropped)
      IS DISTINCT FROM ARRAY['token_hash', 'employee_id', 'expires_at', 'created_at']::pg_catalog.name[] THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_session_issuance_session_columns_invalid';
  END IF;
  SELECT attribute.attnum, attribute.attcollation INTO session_token_attnum, session_token_collation
  FROM pg_catalog.pg_attribute AS attribute
  WHERE attribute.attrelid = session_oid AND attribute.attname = 'token_hash'
    AND attribute.atttypid = 'pg_catalog.bpchar'::pg_catalog.regtype AND attribute.atttypmod = 68
    AND attribute.attnotnull AND attribute.attidentity = '' AND attribute.attgenerated = '' AND NOT attribute.atthasdef;
  SELECT attribute.attnum, attribute.attcollation INTO session_employee_attnum, session_employee_collation
  FROM pg_catalog.pg_attribute AS attribute
  WHERE attribute.attrelid = session_oid AND attribute.attname = 'employee_id'
    AND attribute.atttypid = 'pg_catalog.text'::pg_catalog.regtype AND attribute.atttypmod = -1
    AND attribute.attnotnull AND attribute.attidentity = '' AND attribute.attgenerated = '' AND NOT attribute.atthasdef;
  SELECT attribute.attnum, attribute.attcollation INTO session_expiry_attnum, session_expiry_collation
  FROM pg_catalog.pg_attribute AS attribute
  WHERE attribute.attrelid = session_oid AND attribute.attname = 'expires_at';
  IF session_token_attnum IS NULL OR session_employee_attnum IS NULL OR session_expiry_attnum IS NULL
    OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_attribute AS attribute
      WHERE attribute.attrelid = session_oid AND attribute.attname IN ('expires_at', 'created_at')
        AND attribute.atttypid = 'pg_catalog.timestamptz'::pg_catalog.regtype AND attribute.atttypmod = -1
        AND attribute.attnotnull AND attribute.attidentity = '' AND attribute.attgenerated = ''
        AND attribute.atthasdef = (attribute.attname = 'created_at')) <> 2
    OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_attrdef AS default_value
      JOIN pg_catalog.pg_attribute AS attribute ON attribute.attrelid = default_value.adrelid AND attribute.attnum = default_value.adnum
      WHERE default_value.adrelid = session_oid AND attribute.attname = 'created_at'
        AND pg_catalog.pg_get_expr(default_value.adbin, default_value.adrelid) = 'now()') <> 1 THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_session_issuance_session_columns_invalid';
  END IF;
  SELECT opclass.oid INTO bpchar_opclass_oid FROM pg_catalog.pg_opclass AS opclass
  JOIN pg_catalog.pg_am AS method ON method.oid = opclass.opcmethod
  WHERE opclass.opcnamespace = 'pg_catalog'::pg_catalog.regnamespace AND opclass.opcname = 'bpchar_ops'
    AND opclass.opcintype = 'pg_catalog.bpchar'::pg_catalog.regtype AND opclass.opcdefault AND method.amname = 'btree';
  SELECT opclass.oid INTO timestamptz_opclass_oid FROM pg_catalog.pg_opclass AS opclass
  JOIN pg_catalog.pg_am AS method ON method.oid = opclass.opcmethod
  WHERE opclass.opcnamespace = 'pg_catalog'::pg_catalog.regnamespace AND opclass.opcname = 'timestamptz_ops'
    AND opclass.opcintype = 'pg_catalog.timestamptz'::pg_catalog.regtype AND opclass.opcdefault AND method.amname = 'btree';
  IF bpchar_opclass_oid IS NULL OR timestamptz_opclass_oid IS NULL OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint AS key_constraint
    JOIN pg_catalog.pg_index AS key_index ON key_index.indexrelid = key_constraint.conindid AND key_index.indrelid = session_oid
    JOIN pg_catalog.pg_class AS key_relation ON key_relation.oid = key_index.indexrelid
    JOIN pg_catalog.pg_am AS method ON method.oid = key_relation.relam
    WHERE key_constraint.conrelid = session_oid AND key_constraint.contype = 'p'
      AND key_constraint.convalidated AND NOT key_constraint.condeferrable AND NOT key_constraint.condeferred
      AND COALESCE((pg_catalog.to_jsonb(key_constraint) ->> 'conenforced')::pg_catalog.bool, true)
      AND key_constraint.conkey = ARRAY[session_token_attnum]::pg_catalog.int2[]
      AND key_index.indisprimary AND key_index.indisunique AND key_index.indisvalid
      AND key_index.indisready AND key_index.indislive AND key_index.indimmediate
      AND NOT key_index.indnullsnotdistinct AND key_index.indpred IS NULL AND key_index.indexprs IS NULL
      AND key_index.indnatts = 1 AND key_index.indnkeyatts = 1 AND key_index.indkey[0] = session_token_attnum
      AND key_index.indclass[0] = bpchar_opclass_oid AND key_index.indcollation[0] = session_token_collation
      AND key_index.indoption[0] = 0
      AND key_relation.relkind = 'i' AND key_relation.relpersistence = 'p' AND key_relation.relowner = installer_oid
      AND method.amname = 'btree'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_session_issuance_session_key_invalid';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint AS reference
    WHERE reference.conrelid = session_oid AND reference.contype = 'f' AND reference.confrelid = employee_oid
      AND reference.conkey = ARRAY[session_employee_attnum]::pg_catalog.int2[]
      AND reference.confkey = ARRAY[employee_id_attnum]::pg_catalog.int2[]
      AND reference.confupdtype = 'a' AND reference.confdeltype = 'c' AND reference.confmatchtype = 's'
      AND reference.convalidated AND NOT reference.condeferrable AND NOT reference.condeferred
      AND COALESCE((pg_catalog.to_jsonb(reference) ->> 'conenforced')::pg_catalog.bool, true)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_session_issuance_session_reference_invalid';
  END IF;
  IF (SELECT pg_catalog.count(*) FROM pg_catalog.pg_class AS lookup
    JOIN pg_catalog.pg_index AS lookup_index ON lookup_index.indexrelid = lookup.oid AND lookup_index.indrelid = session_oid
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = lookup.relnamespace
    JOIN pg_catalog.pg_am AS method ON method.oid = lookup.relam
    WHERE namespace.nspname = 'public' AND lookup.relkind = 'i' AND lookup.relpersistence = 'p'
      AND lookup.relowner = installer_oid AND method.amname = 'btree'
      AND NOT lookup_index.indisunique AND NOT lookup_index.indisprimary AND NOT lookup_index.indisexclusion
      AND lookup_index.indisvalid AND lookup_index.indisready AND lookup_index.indislive AND lookup_index.indimmediate
      AND NOT lookup_index.indnullsnotdistinct AND lookup_index.indpred IS NULL AND lookup_index.indexprs IS NULL
      AND lookup_index.indnatts = 1 AND lookup_index.indnkeyatts = 1 AND lookup_index.indoption[0] = 0
      AND ((lookup.relname = 'employee_sessions_employee_idx' AND lookup_index.indkey[0] = session_employee_attnum
          AND lookup_index.indclass[0] = text_opclass_oid AND lookup_index.indcollation[0] = session_employee_collation)
        OR (lookup.relname = 'employee_sessions_expires_idx' AND lookup_index.indkey[0] = session_expiry_attnum
          AND lookup_index.indclass[0] = timestamptz_opclass_oid AND lookup_index.indcollation[0] = session_expiry_collation))) <> 2 THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_session_issuance_session_indexes_invalid';
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
      WHERE trigger.tgrelid IN (workspace_oid, employee_oid, session_oid)
        AND trigger.tgname = 'f10_identity_guard' AND trigger.tgfoid = identity_guard_oid
        AND trigger.tgtype = 31 AND trigger.tgenabled = 'O' AND NOT trigger.tgisinternal
        AND trigger.tgconstraint = 0 AND trigger.tgnargs = 0 AND trigger.tgqual IS NULL
        AND trigger.tgargs = ''::pg_catalog.bytea AND trigger.tgattr = ''::pg_catalog.int2vector
        AND trigger.tgoldtable IS NULL AND trigger.tgnewtable IS NULL) <> 3 OR
    (SELECT pg_catalog.count(*) FROM pg_catalog.pg_trigger AS trigger
      WHERE trigger.tgrelid IN (workspace_oid, employee_oid, session_oid)
        AND trigger.tgname = 'f10_write_fence' AND trigger.tgfoid = write_fence_oid
        AND trigger.tgtype = 62 AND trigger.tgenabled = 'O' AND NOT trigger.tgisinternal
        AND trigger.tgconstraint = 0 AND trigger.tgnargs = 0 AND trigger.tgqual IS NULL
        AND trigger.tgargs = ''::pg_catalog.bytea AND trigger.tgattr = ''::pg_catalog.int2vector
        AND trigger.tgoldtable IS NULL AND trigger.tgnewtable IS NULL) <> 3 THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_session_issuance_source_guard_invalid';
  END IF;
  SELECT control.oid INTO contracts_oid FROM pg_catalog.pg_class AS control
  WHERE control.relnamespace = schema_oid AND control.relname = 'owned_table_contract'
    AND control.relkind = 'r' AND control.relpersistence = 'p' AND control.relowner = installer_oid;
  SELECT control.oid INTO protocol_oid FROM pg_catalog.pg_class AS control
  WHERE control.relnamespace = schema_oid AND control.relname = 'expansion_protocol'
    AND control.relkind = 'r' AND control.relpersistence = 'p' AND control.relowner = installer_oid;
  IF contracts_oid IS NULL OR protocol_oid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_session_issuance_source_contract_invalid';
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
    WHERE contract.table_name = 'employee_sessions' AND contract.storage = 'IMMUTABLE_PARENT'
      AND contract.anchor = '{"kind":"PARENT","columns":["employee_id"],"target":"employees","targetColumns":["id"]}'::pg_catalog.jsonb
      AND contract.primary_key_columns = ARRAY['token_hash']::pg_catalog.name[]
      AND contract.mirror_columns = ARRAY['employee_id', 'token_hash']::pg_catalog.name[]
      AND contract.original_columns = ARRAY['token_hash', 'employee_id', 'expires_at', 'created_at']::pg_catalog.name[]
      AND contract.sidecar_name IS NULL AND contract.source_path = 'db/migrations/0001_initial.sql' AND contract.source_line = 48)
    OR NOT EXISTS (SELECT 1 FROM nevora_tenancy.expansion_protocol AS protocol
    WHERE protocol.migration_id = 26 AND protocol.phase IN ('EXPANDED_LEGACY', 'FENCED')
      AND protocol.schema_source_commit = '7c628e374f03c9025b2c0cfd3568be033f07238d'
      AND protocol.registry_sha256 = '5143825e2447b3883eb1551d0b4a82ce283b4c845896d28c3312fbecce95c681') THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_session_issuance_source_contract_invalid';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class AS relation
    WHERE relation.relnamespace = schema_oid AND relation.relname = 'portal_session_issuance') THEN
    RAISE EXCEPTION USING ERRCODE = '42P07', MESSAGE = 'portal_session_issuance_already_installed';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS function
    WHERE function.pronamespace = schema_oid AND function.proname = 'guard_portal_session_issuance') THEN
    RAISE EXCEPTION USING ERRCODE = '42723', MESSAGE = 'portal_session_issuance_guard_already_installed';
  END IF;
END;
$portal_session_issuance_prerequisites$;
CREATE TABLE nevora_tenancy.portal_session_issuance (
  token_hash pg_catalog.bpchar(64) NOT NULL PRIMARY KEY,
  workspace_id pg_catalog.text NOT NULL,
  employee_id pg_catalog.text NOT NULL,
  workspace_incarnation pg_catalog.int8 NOT NULL CHECK (workspace_incarnation > 0::pg_catalog.int8),
  portal_access_version pg_catalog.int8 NOT NULL CHECK (portal_access_version > 0::pg_catalog.int8),
  session_created_at pg_catalog.timestamptz NOT NULL,
  FOREIGN KEY (token_hash) REFERENCES public.employee_sessions(token_hash) ON UPDATE RESTRICT ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (workspace_id, employee_id) REFERENCES public.employees(workspace_id, id) ON UPDATE RESTRICT ON DELETE CASCADE
);
CREATE FUNCTION nevora_tenancy.guard_portal_session_issuance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $portal_session_issuance_guard$
BEGIN
  IF TG_TABLE_SCHEMA IS DISTINCT FROM 'nevora_tenancy'
    OR TG_TABLE_NAME IS DISTINCT FROM 'portal_session_issuance' OR TG_LEVEL IS DISTINCT FROM 'ROW' THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_session_issuance_guard_route_invalid';
  END IF;
  IF TG_OP = 'INSERT' THEN
    -- The outer protected caller must already hold tenant/employment/authority locks.
    -- A separate fresh statement compares source after the session lock has waited.
    PERFORM session.token_hash FROM public.employee_sessions AS session
      WHERE session.token_hash = NEW.token_hash FOR SHARE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_session_issuance_source_mismatch';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.employee_sessions AS session
      JOIN public.employees AS employee ON employee.id = session.employee_id
      WHERE session.token_hash = NEW.token_hash
        AND pg_catalog.convert_to(session.employee_id, 'UTF8') = pg_catalog.convert_to(NEW.employee_id, 'UTF8')
        AND pg_catalog.convert_to(employee.id, 'UTF8') = pg_catalog.convert_to(NEW.employee_id, 'UTF8')
        AND session.created_at IS NOT DISTINCT FROM NEW.session_created_at
        AND pg_catalog.convert_to(employee.workspace_id, 'UTF8') = pg_catalog.convert_to(NEW.workspace_id, 'UTF8')
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_session_issuance_source_mismatch';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.token_hash IS DISTINCT FROM OLD.token_hash
      OR pg_catalog.convert_to(NEW.workspace_id, 'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.workspace_id, 'UTF8')
      OR pg_catalog.convert_to(NEW.employee_id, 'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.employee_id, 'UTF8')
      OR NEW.workspace_incarnation IS DISTINCT FROM OLD.workspace_incarnation
      OR NEW.portal_access_version IS DISTINCT FROM OLD.portal_access_version
      OR NEW.session_created_at IS DISTINCT FROM OLD.session_created_at THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_session_issuance_identity_immutable';
    END IF;
    RETURN NEW;
  ELSE
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_session_issuance_guard_route_invalid';
  END IF;
END;
$portal_session_issuance_guard$;
CREATE TRIGGER portal_session_issuance_row_guard
BEFORE INSERT OR UPDATE ON nevora_tenancy.portal_session_issuance
FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.guard_portal_session_issuance();
ALTER TABLE nevora_tenancy.portal_session_issuance ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.portal_session_issuance FORCE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA nevora_tenancy FROM PUBLIC;
REVOKE ALL ON TABLE nevora_tenancy.portal_session_issuance FROM PUBLIC;
REVOKE ALL ON FUNCTION nevora_tenancy.guard_portal_session_issuance() FROM PUBLIC;
DO $portal_session_issuance_acl$
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
    WHERE namespace.nspname = 'nevora_tenancy' AND control.relname = 'portal_session_issuance'
      AND privileges.grantee <> control.relowner
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_class AS control
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = control.relnamespace
    JOIN pg_catalog.pg_attribute AS attribute ON attribute.attrelid = control.oid
    CROSS JOIN LATERAL pg_catalog.aclexplode(attribute.attacl) AS privileges
    WHERE namespace.nspname = 'nevora_tenancy' AND control.relname = 'portal_session_issuance'
      AND attribute.attnum > 0 AND NOT attribute.attisdropped
      AND privileges.grantee <> control.relowner
  ) OR EXISTS (
    SELECT 1 FROM pg_catalog.pg_proc AS function
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = function.pronamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(function.proacl,
      pg_catalog.acldefault('f', function.proowner))) AS privileges
    WHERE namespace.nspname = 'nevora_tenancy' AND function.proname = 'guard_portal_session_issuance'
      AND function.pronargs = 0 AND privileges.grantee <> function.proowner
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'portal_session_issuance_acl_invalid';
  END IF;
END;
$portal_session_issuance_acl$;
COMMIT;
