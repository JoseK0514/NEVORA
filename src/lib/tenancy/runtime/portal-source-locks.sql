-- Unused fixed single-employment source-row lock kernel; installation is separately authorized.
-- Locks are not authentication, eligibility or current-proof authority and return no facts.
-- The caller owns its transaction and acquires the shared catalog fence first;
-- autocommit immediately releases locks. Native caller/owner privileges and RLS access remain OPEN.
-- Separate fresh source comparisons after waits and final comparisons before effects are mandatory.
-- Optional admin absence is not ALL_TENANT or a grant. Existing row locks do not fence phantoms:
-- every future header/child writer must cooperate through the persistent portal_authority serialization row.
-- Multi-employment commands must lock their complete employee set before downstream locks;
-- never repeatedly invoke this single-employment function actor-first in arbitrary order or upgrade its locks.
-- No roles, grants, seeds, schema/table/policy changes, source mutation, credential or proof issuance.
-- Native key/guard/ACL checks below bind only bounded installation prerequisites, not complete catalog authority.
-- Routine argument typmods cannot enforce char(64); the original session key retains native bpchar equality.
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
DO $portal_source_lock_prerequisites$
DECLARE
  schema_oid pg_catalog.oid;
  schema_owner pg_catalog.oid;
  installer_oid pg_catalog.oid;
  relation_oid pg_catalog.oid;
  target_oid pg_catalog.oid;
  source_keys pg_catalog.int2[];
  target_keys pg_catalog.int2[];
  expected record;
BEGIN
  SELECT namespace.oid, namespace.nspowner INTO schema_oid, schema_owner
    FROM pg_catalog.pg_namespace AS namespace WHERE namespace.nspname = 'nevora_tenancy';
  IF schema_oid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '3F000', MESSAGE = 'portal_source_lock_schema_missing';
  END IF;
  SELECT installer.oid INTO installer_oid FROM pg_catalog.pg_roles AS installer WHERE installer.rolname = current_user;
  IF installer_oid IS NULL OR schema_owner IS DISTINCT FROM installer_oid THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'portal_source_lock_schema_not_owned';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS function
    WHERE function.pronamespace = schema_oid AND function.proname = 'lock_portal_source_rows') THEN
    RAISE EXCEPTION USING ERRCODE = '42723', MESSAGE = 'portal_source_lock_already_installed';
  END IF;
  FOR expected IN SELECT * FROM (VALUES
    ('public', 'workspaces', false),
    ('public', 'employees', false),
    ('public', 'employee_credentials', false),
    ('public', 'employee_sessions', false),
    ('public', 'locations', false),
    ('nevora_tenancy', 'workspace_incarnation_counter', true),
    ('nevora_tenancy', 'portal_authority', true),
    ('nevora_tenancy', 'portal_session_issuance', true),
    ('nevora_tenancy', 'portal_administrative_authority', true),
    ('nevora_tenancy', 'portal_administrative_capability', true),
    ('nevora_tenancy', 'portal_administrative_location', true)
  ) AS closed(schema_name, relation_name, private) LOOP
    SELECT relation.oid INTO relation_oid FROM pg_catalog.pg_class AS relation
      JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = expected.schema_name AND relation.relname = expected.relation_name
        AND relation.relkind = 'r' AND relation.relpersistence = 'p' AND relation.relowner = installer_oid
        AND (NOT expected.private OR (relation.relrowsecurity AND relation.relforcerowsecurity
          AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_policy AS policy WHERE policy.polrelid = relation.oid)));
    IF relation_oid IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_lock_relation_invalid';
    END IF;
    IF expected.private AND (EXISTS (
      SELECT 1 FROM pg_catalog.pg_class AS relation
      CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(relation.relacl,
        pg_catalog.acldefault('r', relation.relowner))) AS privilege
      WHERE relation.oid = relation_oid AND privilege.grantee <> relation.relowner
    ) OR EXISTS (
      SELECT 1 FROM pg_catalog.pg_attribute AS attribute
      CROSS JOIN LATERAL pg_catalog.aclexplode(attribute.attacl) AS privilege
      WHERE attribute.attrelid = relation_oid AND attribute.attnum > 0 AND NOT attribute.attisdropped
        AND privilege.grantee <> installer_oid
    )) THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_lock_acl_invalid';
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_namespace AS namespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(namespace.nspacl,
      pg_catalog.acldefault('n', namespace.nspowner))) AS privilege
    WHERE namespace.oid = schema_oid AND privilege.grantee <> namespace.nspowner) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_lock_acl_invalid';
  END IF;
  -- Only lock-key columns are used. Staged employees.workspace_id may remain nullable.
  FOR expected IN SELECT * FROM (VALUES
    ('public', 'workspaces', 'id', 'pg_catalog.text', -1, true),
    ('public', 'employees', 'id', 'pg_catalog.text', -1, true),
    ('public', 'employees', 'workspace_id', 'pg_catalog.text', -1, false),
    ('public', 'employee_credentials', 'employee_id', 'pg_catalog.text', -1, true),
    ('public', 'employee_sessions', 'employee_id', 'pg_catalog.text', -1, true),
    ('public', 'employee_sessions', 'token_hash', 'pg_catalog.bpchar', 68, true),
    ('public', 'locations', 'id', 'pg_catalog.text', -1, true),
    ('public', 'locations', 'workspace_id', 'pg_catalog.text', -1, true),
    ('nevora_tenancy', 'workspace_incarnation_counter', 'workspace_id', 'pg_catalog.text', -1, true),
    ('nevora_tenancy', 'portal_authority', 'workspace_id', 'pg_catalog.text', -1, true),
    ('nevora_tenancy', 'portal_authority', 'employee_id', 'pg_catalog.text', -1, true),
    ('nevora_tenancy', 'portal_session_issuance', 'workspace_id', 'pg_catalog.text', -1, true),
    ('nevora_tenancy', 'portal_session_issuance', 'employee_id', 'pg_catalog.text', -1, true),
    ('nevora_tenancy', 'portal_session_issuance', 'token_hash', 'pg_catalog.bpchar', 68, true),
    ('nevora_tenancy', 'portal_administrative_authority', 'workspace_id', 'pg_catalog.text', -1, true),
    ('nevora_tenancy', 'portal_administrative_authority', 'employee_id', 'pg_catalog.text', -1, true),
    ('nevora_tenancy', 'portal_administrative_capability', 'workspace_id', 'pg_catalog.text', -1, true),
    ('nevora_tenancy', 'portal_administrative_capability', 'employee_id', 'pg_catalog.text', -1, true),
    ('nevora_tenancy', 'portal_administrative_capability', 'capability', 'pg_catalog.text', -1, true),
    ('nevora_tenancy', 'portal_administrative_location', 'workspace_id', 'pg_catalog.text', -1, true),
    ('nevora_tenancy', 'portal_administrative_location', 'employee_id', 'pg_catalog.text', -1, true),
    ('nevora_tenancy', 'portal_administrative_location', 'location_id', 'pg_catalog.text', -1, true)
  ) AS closed(schema_name, relation_name, column_name, type_name, type_modifier, require_not_null) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_class AS relation
      JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      JOIN pg_catalog.pg_attribute AS attribute ON attribute.attrelid = relation.oid
      WHERE namespace.nspname = expected.schema_name AND relation.relname = expected.relation_name
        AND attribute.attname = expected.column_name AND attribute.attnum > 0 AND NOT attribute.attisdropped
        AND attribute.atttypid = expected.type_name::pg_catalog.regtype AND attribute.atttypmod = expected.type_modifier
        AND (NOT expected.require_not_null OR attribute.attnotnull)
        AND attribute.attidentity = '' AND attribute.attgenerated = '' AND NOT attribute.atthasdef
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_lock_column_invalid';
    END IF;
  END LOOP;
  FOR expected IN SELECT * FROM (VALUES
    ('public', 'workspaces', 'workspaces_pkey', 'p', ARRAY['id']),
    ('public', 'employees', 'employees_pkey', 'p', ARRAY['id']),
    ('public', 'employee_credentials', 'employee_credentials_pkey', 'p', ARRAY['employee_id']),
    ('public', 'employee_sessions', 'employee_sessions_pkey', 'p', ARRAY['token_hash']),
    ('public', 'locations', 'locations_pkey', 'p', ARRAY['id']),
    ('nevora_tenancy', 'workspace_incarnation_counter', 'workspace_incarnation_counter_pkey', 'p', ARRAY['workspace_id']),
    ('nevora_tenancy', 'portal_authority', 'portal_authority_pkey', 'p', ARRAY['workspace_id','employee_id']),
    ('nevora_tenancy', 'portal_session_issuance', 'portal_session_issuance_pkey', 'p', ARRAY['token_hash']),
    ('nevora_tenancy', 'portal_administrative_authority', 'portal_administrative_authority_pkey', 'p', ARRAY['workspace_id','employee_id']),
    ('nevora_tenancy', 'portal_administrative_capability', 'portal_administrative_capability_pkey', 'p', ARRAY['workspace_id','employee_id','capability']),
    ('nevora_tenancy', 'portal_administrative_location', 'portal_administrative_location_pkey', 'p', ARRAY['workspace_id','employee_id','location_id']),
    ('public', 'employees', 'f10_tenant_c49de3d265fb', 'u', ARRAY['workspace_id','id']),
    ('public', 'locations', 'communication_location_workspace_key', 'u', ARRAY['workspace_id','id'])
  ) AS closed(schema_name, relation_name, constraint_name, constraint_kind, columns) LOOP
    SELECT relation.oid INTO relation_oid FROM pg_catalog.pg_class AS relation
      JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = expected.schema_name AND relation.relname = expected.relation_name;
    SELECT ARRAY(SELECT attribute.attnum FROM pg_catalog.unnest(expected.columns) WITH ORDINALITY AS named(name, ordinal)
      JOIN pg_catalog.pg_attribute AS attribute ON attribute.attrelid = relation_oid AND attribute.attname = named.name
      WHERE attribute.attnum > 0 AND NOT attribute.attisdropped ORDER BY named.ordinal) INTO source_keys;
    IF pg_catalog.cardinality(source_keys) <> pg_catalog.cardinality(expected.columns) OR NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint AS key_constraint
      JOIN pg_catalog.pg_index AS key_index ON key_index.indexrelid = key_constraint.conindid AND key_index.indrelid = relation_oid
      JOIN pg_catalog.pg_class AS key_relation ON key_relation.oid = key_index.indexrelid
      JOIN pg_catalog.pg_am AS method ON method.oid = key_relation.relam
      WHERE key_constraint.conrelid = relation_oid AND key_constraint.conname = expected.constraint_name
        AND key_constraint.contype::pg_catalog.text = expected.constraint_kind AND key_constraint.conkey = source_keys
        AND key_constraint.convalidated AND NOT key_constraint.condeferrable AND NOT key_constraint.condeferred
        AND COALESCE((pg_catalog.to_jsonb(key_constraint) ->> 'conenforced')::pg_catalog.bool, true)
        AND key_index.indisprimary = (expected.constraint_kind = 'p') AND key_index.indisunique
        AND key_index.indisvalid AND key_index.indisready AND key_index.indislive AND key_index.indimmediate
        AND NOT key_index.indnullsnotdistinct AND key_index.indpred IS NULL AND key_index.indexprs IS NULL
        AND key_index.indnatts = pg_catalog.cardinality(source_keys) AND key_index.indnkeyatts = pg_catalog.cardinality(source_keys)
        AND key_relation.relkind = 'i' AND key_relation.relpersistence = 'p' AND key_relation.relowner = installer_oid
        AND method.amname = 'btree' AND NOT EXISTS (
          SELECT 1 FROM pg_catalog.unnest(source_keys) WITH ORDINALITY AS numbered(attnum, ordinal)
          JOIN pg_catalog.pg_attribute AS attribute ON attribute.attrelid = relation_oid AND attribute.attnum = numbered.attnum
          WHERE key_index.indkey[(numbered.ordinal - 1)::pg_catalog.int4] IS DISTINCT FROM numbered.attnum
            OR key_index.indcollation[(numbered.ordinal - 1)::pg_catalog.int4] IS DISTINCT FROM attribute.attcollation
            OR key_index.indoption[(numbered.ordinal - 1)::pg_catalog.int4] IS DISTINCT FROM 0
            OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_opclass AS opclass
              JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = opclass.opcnamespace
              WHERE opclass.oid = key_index.indclass[(numbered.ordinal - 1)::pg_catalog.int4]
                AND namespace.nspname = 'pg_catalog' AND opclass.opcmethod = method.oid
                AND opclass.opcdefault AND opclass.opcintype = attribute.atttypid)
        )
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_lock_key_invalid';
    END IF;
  END LOOP;
  FOR expected IN SELECT * FROM (VALUES
    ('public', 'employee_credentials', ARRAY['employee_id'], 'public', 'employees', ARRAY['id'], 'a', 'c'),
    ('public', 'employee_sessions', ARRAY['employee_id'], 'public', 'employees', ARRAY['id'], 'a', 'c'),
    ('nevora_tenancy', 'workspace_incarnation_counter', ARRAY['workspace_id'], 'public', 'workspaces', ARRAY['id'], 'r', 'r'),
    ('nevora_tenancy', 'portal_authority', ARRAY['workspace_id'], 'public', 'workspaces', ARRAY['id'], 'r', 'r'),
    ('nevora_tenancy', 'portal_authority', ARRAY['workspace_id','employee_id'], 'public', 'employees', ARRAY['workspace_id','id'], 'r', 'r'),
    ('nevora_tenancy', 'portal_session_issuance', ARRAY['token_hash'], 'public', 'employee_sessions', ARRAY['token_hash'], 'r', 'c'),
    ('nevora_tenancy', 'portal_session_issuance', ARRAY['workspace_id'], 'public', 'workspaces', ARRAY['id'], 'r', 'r'),
    ('nevora_tenancy', 'portal_session_issuance', ARRAY['workspace_id','employee_id'], 'public', 'employees', ARRAY['workspace_id','id'], 'r', 'c'),
    ('nevora_tenancy', 'portal_administrative_authority', ARRAY['workspace_id'], 'public', 'workspaces', ARRAY['id'], 'r', 'r'),
    ('nevora_tenancy', 'portal_administrative_authority', ARRAY['workspace_id','employee_id'], 'public', 'employees', ARRAY['workspace_id','id'], 'r', 'r'),
    ('nevora_tenancy', 'portal_administrative_authority', ARRAY['workspace_id','employee_id'], 'nevora_tenancy', 'portal_authority', ARRAY['workspace_id','employee_id'], 'r', 'r'),
    ('nevora_tenancy', 'portal_administrative_capability', ARRAY['workspace_id','employee_id'], 'nevora_tenancy', 'portal_administrative_authority', ARRAY['workspace_id','employee_id'], 'r', 'r'),
    ('nevora_tenancy', 'portal_administrative_location', ARRAY['workspace_id','employee_id'], 'nevora_tenancy', 'portal_administrative_authority', ARRAY['workspace_id','employee_id'], 'r', 'r'),
    ('nevora_tenancy', 'portal_administrative_location', ARRAY['workspace_id','location_id'], 'public', 'locations', ARRAY['workspace_id','id'], 'r', 'r')
  ) AS closed(schema_name, relation_name, columns, target_schema, target_name, target_columns, update_action, delete_action) LOOP
    SELECT relation.oid INTO relation_oid FROM pg_catalog.pg_class AS relation
      JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = expected.schema_name AND relation.relname = expected.relation_name;
    SELECT relation.oid INTO target_oid FROM pg_catalog.pg_class AS relation
      JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = expected.target_schema AND relation.relname = expected.target_name;
    SELECT ARRAY(SELECT attribute.attnum FROM pg_catalog.unnest(expected.columns) WITH ORDINALITY AS named(name, ordinal)
      JOIN pg_catalog.pg_attribute AS attribute ON attribute.attrelid = relation_oid AND attribute.attname = named.name
      WHERE attribute.attnum > 0 AND NOT attribute.attisdropped ORDER BY named.ordinal) INTO source_keys;
    SELECT ARRAY(SELECT attribute.attnum FROM pg_catalog.unnest(expected.target_columns) WITH ORDINALITY AS named(name, ordinal)
      JOIN pg_catalog.pg_attribute AS attribute ON attribute.attrelid = target_oid AND attribute.attname = named.name
      WHERE attribute.attnum > 0 AND NOT attribute.attisdropped ORDER BY named.ordinal) INTO target_keys;
    IF pg_catalog.cardinality(source_keys) <> pg_catalog.cardinality(expected.columns)
      OR pg_catalog.cardinality(target_keys) <> pg_catalog.cardinality(expected.target_columns) OR NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint AS foreign_key WHERE foreign_key.conrelid = relation_oid
        AND foreign_key.contype = 'f' AND foreign_key.confrelid = target_oid
        AND foreign_key.conkey = source_keys AND foreign_key.confkey = target_keys
        AND foreign_key.confupdtype::pg_catalog.text = expected.update_action
        AND foreign_key.confdeltype::pg_catalog.text = expected.delete_action AND foreign_key.confmatchtype = 's'
        AND foreign_key.convalidated AND NOT foreign_key.condeferrable AND NOT foreign_key.condeferred
        AND COALESCE((pg_catalog.to_jsonb(foreign_key) ->> 'conenforced')::pg_catalog.bool, true)
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_lock_reference_invalid';
    END IF;
  END LOOP;
  FOR expected IN SELECT * FROM (VALUES
    ('guard_workspace_incarnation_counter', false, 'ad86b5c7b5adb0fa3f150d7f71f8d7ea7ffb08951efc4610f0f8f7277139f120', 'search_path=pg_catalog'),
    ('guard_portal_authority', false, '5a971382baf425367090ad60490ed8b243718456b8acb332d734a90a6fec4664', 'search_path=pg_catalog'),
    ('guard_portal_session_issuance', false, '0e31e162a3f41d323a6acc94cf1bbdf574c6edba2a1594e1e7612a5611c44e8f', 'search_path=pg_catalog'),
    ('guard_portal_administrative_authority', false, '2bcb5cc9efff33fcd29778c458085a25a1c1e396ff1021b10a58473a8c1f5ef0', 'search_path=pg_catalog'),
    ('source_write_fence', true, '28e074dcd7476327c72cc59ed4d97a6354ff90dfff17125a0f6adfe283653a45', 'search_path=pg_catalog, nevora_tenancy'),
    ('source_identity_guard', true, '2434a5c2e3e22460f2363f4cdab2d7230759c15f05405f6bd7e6936cab6793e6', 'search_path=pg_catalog, nevora_tenancy')
  ) AS closed(function_name, definer, source_sha256, setting) LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS function
      JOIN pg_catalog.pg_language AS language ON language.oid = function.prolang
      WHERE function.pronamespace = schema_oid AND function.proname = expected.function_name
        AND function.proowner = installer_oid AND function.prokind = 'f' AND function.pronargs = 0
        AND NOT function.proretset AND function.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype
        AND function.prosecdef = expected.definer AND function.provolatile = 'v' AND function.proparallel = 'u'
        AND NOT function.proleakproof AND function.provariadic = 0 AND function.pronargdefaults = 0 AND function.prosupport = 0
        AND function.proargmodes IS NULL AND function.proallargtypes IS NULL AND language.lanname = 'plpgsql'
        AND function.proconfig = ARRAY[expected.setting]::pg_catalog.text[]
        AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(function.prosrc, 'UTF8')), 'hex') = expected.source_sha256
        AND NOT EXISTS (SELECT 1 FROM pg_catalog.aclexplode(COALESCE(function.proacl,
          pg_catalog.acldefault('f', function.proowner))) AS privilege WHERE privilege.grantee <> function.proowner)
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_lock_guard_invalid';
    END IF;
  END LOOP;
  FOR expected IN SELECT * FROM (VALUES
    ('nevora_tenancy', 'workspace_incarnation_counter', 'workspace_incarnation_counter_row_guard', 'guard_workspace_incarnation_counter', 27),
    ('nevora_tenancy', 'workspace_incarnation_counter', 'workspace_incarnation_counter_truncate_guard', 'guard_workspace_incarnation_counter', 34),
    ('nevora_tenancy', 'portal_authority', 'portal_authority_row_guard', 'guard_portal_authority', 27),
    ('nevora_tenancy', 'portal_authority', 'portal_authority_truncate_guard', 'guard_portal_authority', 34),
    ('nevora_tenancy', 'portal_session_issuance', 'portal_session_issuance_row_guard', 'guard_portal_session_issuance', 23),
    ('nevora_tenancy', 'portal_administrative_authority', 'portal_administrative_authority_identity_guard', 'guard_portal_administrative_authority', 19),
    ('nevora_tenancy', 'portal_administrative_authority', 'portal_administrative_authority_truncate_guard', 'guard_portal_administrative_authority', 34),
    ('nevora_tenancy', 'portal_administrative_capability', 'portal_administrative_capability_identity_guard', 'guard_portal_administrative_authority', 19),
    ('nevora_tenancy', 'portal_administrative_capability', 'portal_administrative_capability_truncate_guard', 'guard_portal_administrative_authority', 34),
    ('nevora_tenancy', 'portal_administrative_location', 'portal_administrative_location_identity_guard', 'guard_portal_administrative_authority', 19),
    ('nevora_tenancy', 'portal_administrative_location', 'portal_administrative_location_truncate_guard', 'guard_portal_administrative_authority', 34),
    ('public', 'workspaces', 'f10_write_fence', 'source_write_fence', 62),
    ('public', 'workspaces', 'f10_identity_guard', 'source_identity_guard', 31),
    ('public', 'employees', 'f10_write_fence', 'source_write_fence', 62),
    ('public', 'employees', 'f10_identity_guard', 'source_identity_guard', 31),
    ('public', 'employee_credentials', 'f10_write_fence', 'source_write_fence', 62),
    ('public', 'employee_credentials', 'f10_identity_guard', 'source_identity_guard', 31),
    ('public', 'employee_sessions', 'f10_write_fence', 'source_write_fence', 62),
    ('public', 'employee_sessions', 'f10_identity_guard', 'source_identity_guard', 31),
    ('public', 'locations', 'f10_write_fence', 'source_write_fence', 62),
    ('public', 'locations', 'f10_identity_guard', 'source_identity_guard', 31)
  ) AS closed(schema_name, relation_name, trigger_name, function_name, trigger_type) LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger AS trigger
      JOIN pg_catalog.pg_class AS relation ON relation.oid = trigger.tgrelid
      JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      JOIN pg_catalog.pg_proc AS function ON function.oid = trigger.tgfoid
      WHERE namespace.nspname = expected.schema_name AND relation.relname = expected.relation_name
        AND trigger.tgname = expected.trigger_name AND trigger.tgenabled = 'O' AND trigger.tgtype = expected.trigger_type
        AND trigger.tgfoid = function.oid AND function.pronamespace = schema_oid AND function.proname = expected.function_name
        AND function.pronargs = 0 AND NOT trigger.tgisinternal AND trigger.tgqual IS NULL
        AND trigger.tgconstraint = 0 AND NOT trigger.tgdeferrable AND NOT trigger.tginitdeferred
        AND trigger.tgnargs = 0 AND trigger.tgargs = ''::pg_catalog.bytea AND trigger.tgattr = ''::pg_catalog.int2vector
        AND trigger.tgoldtable IS NULL AND trigger.tgnewtable IS NULL
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_lock_guard_invalid';
    END IF;
  END LOOP;
END;
$portal_source_lock_prerequisites$;
CREATE FUNCTION nevora_tenancy.lock_portal_source_rows(
  p_workspace_id pg_catalog.text,
  p_employee_id pg_catalog.text,
  p_session_token_hash pg_catalog.bpchar
)
RETURNS pg_catalog.void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $portal_source_locks$
BEGIN
  PERFORM workspace.id FROM public.workspaces AS workspace
    WHERE workspace.id OPERATOR(pg_catalog.=) p_workspace_id
      AND pg_catalog.convert_to(workspace.id, 'UTF8') = pg_catalog.convert_to(p_workspace_id, 'UTF8') FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_lock_missing';
  END IF;
  PERFORM employee.id FROM public.employees AS employee
    WHERE employee.id OPERATOR(pg_catalog.=) p_employee_id
      AND pg_catalog.convert_to(employee.id, 'UTF8') = pg_catalog.convert_to(p_employee_id, 'UTF8')
      AND employee.workspace_id OPERATOR(pg_catalog.=) p_workspace_id
      AND pg_catalog.convert_to(employee.workspace_id, 'UTF8') = pg_catalog.convert_to(p_workspace_id, 'UTF8') FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_lock_missing';
  END IF;
  PERFORM credential.employee_id FROM public.employee_credentials AS credential
    WHERE credential.employee_id OPERATOR(pg_catalog.=) p_employee_id
      AND pg_catalog.convert_to(credential.employee_id, 'UTF8') = pg_catalog.convert_to(p_employee_id, 'UTF8') FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_lock_missing';
  END IF;
  PERFORM incarnation.workspace_id FROM nevora_tenancy.workspace_incarnation_counter AS incarnation
    WHERE incarnation.workspace_id OPERATOR(pg_catalog.=) p_workspace_id
      AND pg_catalog.convert_to(incarnation.workspace_id, 'UTF8') = pg_catalog.convert_to(p_workspace_id, 'UTF8') FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_lock_missing';
  END IF;
  PERFORM authority.workspace_id, authority.employee_id FROM nevora_tenancy.portal_authority AS authority
    WHERE authority.workspace_id OPERATOR(pg_catalog.=) p_workspace_id
      AND pg_catalog.convert_to(authority.workspace_id, 'UTF8') = pg_catalog.convert_to(p_workspace_id, 'UTF8')
      AND authority.employee_id OPERATOR(pg_catalog.=) p_employee_id
      AND pg_catalog.convert_to(authority.employee_id, 'UTF8') = pg_catalog.convert_to(p_employee_id, 'UTF8') FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_lock_missing';
  END IF;
  PERFORM session.token_hash FROM public.employee_sessions AS session
    WHERE session.token_hash = p_session_token_hash
      AND session.employee_id OPERATOR(pg_catalog.=) p_employee_id
      AND pg_catalog.convert_to(session.employee_id, 'UTF8') = pg_catalog.convert_to(p_employee_id, 'UTF8') FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_lock_missing';
  END IF;
  PERFORM issuance.token_hash FROM nevora_tenancy.portal_session_issuance AS issuance
    WHERE issuance.token_hash = p_session_token_hash
      AND issuance.workspace_id OPERATOR(pg_catalog.=) p_workspace_id
      AND pg_catalog.convert_to(issuance.workspace_id, 'UTF8') = pg_catalog.convert_to(p_workspace_id, 'UTF8')
      AND issuance.employee_id OPERATOR(pg_catalog.=) p_employee_id
      AND pg_catalog.convert_to(issuance.employee_id, 'UTF8') = pg_catalog.convert_to(p_employee_id, 'UTF8') FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_lock_missing';
  END IF;
  PERFORM administrative.workspace_id, administrative.employee_id FROM nevora_tenancy.portal_administrative_authority AS administrative
    WHERE administrative.workspace_id OPERATOR(pg_catalog.=) p_workspace_id
      AND pg_catalog.convert_to(administrative.workspace_id, 'UTF8') = pg_catalog.convert_to(p_workspace_id, 'UTF8')
      AND administrative.employee_id OPERATOR(pg_catalog.=) p_employee_id
      AND pg_catalog.convert_to(administrative.employee_id, 'UTF8') = pg_catalog.convert_to(p_employee_id, 'UTF8') FOR SHARE;
  IF FOUND THEN
    PERFORM capability.workspace_id, capability.employee_id, capability.capability FROM nevora_tenancy.portal_administrative_capability AS capability
      WHERE capability.workspace_id OPERATOR(pg_catalog.=) p_workspace_id
      AND pg_catalog.convert_to(capability.workspace_id, 'UTF8') = pg_catalog.convert_to(p_workspace_id, 'UTF8')
        AND capability.employee_id OPERATOR(pg_catalog.=) p_employee_id
      AND pg_catalog.convert_to(capability.employee_id, 'UTF8') = pg_catalog.convert_to(p_employee_id, 'UTF8')
      ORDER BY pg_catalog.convert_to(capability.capability, 'UTF8') FOR SHARE;
    PERFORM location.workspace_id, location.employee_id, location.location_id FROM nevora_tenancy.portal_administrative_location AS location
      WHERE location.workspace_id OPERATOR(pg_catalog.=) p_workspace_id
      AND pg_catalog.convert_to(location.workspace_id, 'UTF8') = pg_catalog.convert_to(p_workspace_id, 'UTF8')
        AND location.employee_id OPERATOR(pg_catalog.=) p_employee_id
      AND pg_catalog.convert_to(location.employee_id, 'UTF8') = pg_catalog.convert_to(p_employee_id, 'UTF8')
      ORDER BY pg_catalog.convert_to(location.location_id, 'UTF8') FOR SHARE;
  END IF;
END;
$portal_source_locks$;
REVOKE ALL ON FUNCTION nevora_tenancy.lock_portal_source_rows(pg_catalog.text, pg_catalog.text, pg_catalog.bpchar) FROM PUBLIC;
DO $portal_source_lock_final_acl$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS function
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = function.pronamespace
    JOIN pg_catalog.pg_roles AS owner ON owner.oid = function.proowner
    JOIN pg_catalog.pg_language AS language ON language.oid = function.prolang
    WHERE namespace.nspname = 'nevora_tenancy' AND function.proname = 'lock_portal_source_rows' AND owner.rolname = current_user
      AND function.proargtypes = '25 25 1042'::pg_catalog.oidvector AND function.prorettype = 'pg_catalog.void'::pg_catalog.regtype
      AND function.prokind = 'f' AND NOT function.proretset AND NOT function.prosecdef
      AND function.provolatile = 'v' AND function.proparallel = 'u' AND NOT function.proleakproof
      AND function.provariadic = 0 AND function.pronargdefaults = 0 AND function.prosupport = 0
      AND function.proargmodes IS NULL AND function.proallargtypes IS NULL AND language.lanname = 'plpgsql'
      AND function.proconfig = ARRAY['search_path=pg_catalog']::pg_catalog.text[]
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.aclexplode(COALESCE(function.proacl,
        pg_catalog.acldefault('f', function.proowner))) AS privilege WHERE privilege.grantee <> function.proowner)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_lock_acl_invalid';
  END IF;
END;
$portal_source_lock_final_acl$;
COMMIT;
