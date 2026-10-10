-- UNUSED SOURCE CANDIDATE ONLY; no APP/source/native/test/compiler/QA or authority claim.
-- Fixed raw joint Portal + installed-policy observation; no authentication/proof/current-guard result.
-- Caller owns one ReadCommitted transaction with shared catalog fence FIRST, before role/helpers.
-- Calls the distinct joint kernel exactly once, preserving workspace -> employee -> credential -> counter
-- -> definition -> installation -> Portal/session/LIVE/admin. Never wraps the complete old kernel.
-- Then one separate fresh query rereads only its already-held exact unique source/head/definition tuples.
-- No alternate head selection, second helper invocation, new lock/reselection or replay after later locks.
-- Original raw Portal DTO is retained intact under portalSource; exact installed DTO under installedPolicy.
-- Current source coherence is not executing-source authentication, workforce/Portal eligibility or permission.
-- FORCE RLS zero policies gives no safe NOLOGIN owner access; private access/graph/current-source roots stay OPEN.
-- Missing-head/admin-child phantoms, complete employee/credential sets and writer prelocks remain cooperative gates.
-- No source DML/defaults/grants/roles/policies/seeds/owner bypass/issuer activation or F6-F9 integration.
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
DO $portal_policy_source_observation_parent_prerequisites$
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
    RAISE EXCEPTION USING ERRCODE = '3F000', MESSAGE = 'portal_source_observation_schema_missing';
  END IF;
  SELECT installer.oid INTO installer_oid FROM pg_catalog.pg_roles AS installer WHERE installer.rolname = current_user;
  IF installer_oid IS NULL OR schema_owner IS DISTINCT FROM installer_oid THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'portal_source_observation_schema_not_owned';
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
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_observation_relation_invalid';
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
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_observation_acl_invalid';
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_namespace AS namespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(namespace.nspacl,
      pg_catalog.acldefault('n', namespace.nspowner))) AS privilege
    WHERE namespace.oid = schema_oid AND privilege.grantee <> namespace.nspowner) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_observation_acl_invalid';
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
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_observation_column_invalid';
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
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_observation_key_invalid';
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
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_observation_reference_invalid';
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
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_observation_guard_invalid';
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
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_observation_guard_invalid';
    END IF;
  END LOOP;
  -- Additional observed values preserve native type/default contracts; no source row is inferred.
  FOR expected IN SELECT * FROM (VALUES
    ('public', 'workspaces', 'active', 'pg_catalog.bool', 'true'),
    ('public', 'workspaces', 'updated_at', 'pg_catalog.timestamptz', 'now()'),
    ('public', 'employees', 'active', 'pg_catalog.bool', 'true'),
    ('public', 'employees', 'role', 'pg_catalog.text', NULL::pg_catalog.text),
    ('public', 'employees', 'updated_at', 'pg_catalog.timestamptz', 'now()'),
    ('public', 'employee_credentials', 'must_change_password', 'pg_catalog.bool', 'true'),
    ('public', 'employee_credentials', 'password_updated_at', 'pg_catalog.timestamptz', 'now()'),
    ('public', 'employee_sessions', 'expires_at', 'pg_catalog.timestamptz', NULL::pg_catalog.text),
    ('public', 'employee_sessions', 'created_at', 'pg_catalog.timestamptz', 'now()'),
    ('nevora_tenancy', 'workspace_incarnation_counter', 'incarnation', 'pg_catalog.int8', NULL::pg_catalog.text),
    ('nevora_tenancy', 'portal_authority', 'authorization_version', 'pg_catalog.int8', NULL::pg_catalog.text),
    ('nevora_tenancy', 'portal_authority', 'portal_access_version', 'pg_catalog.int8', NULL::pg_catalog.text),
    ('nevora_tenancy', 'portal_authority', 'capability_policy_revision', 'pg_catalog.int8', NULL::pg_catalog.text),
    ('nevora_tenancy', 'portal_authority', 'portal_state', 'pg_catalog.text', NULL::pg_catalog.text),
    ('nevora_tenancy', 'portal_authority', 'proof_provenance', 'pg_catalog.text', NULL::pg_catalog.text),
    ('nevora_tenancy', 'portal_authority', 'provenance_reference', 'pg_catalog.text', NULL::pg_catalog.text),
    ('nevora_tenancy', 'portal_session_issuance', 'workspace_incarnation', 'pg_catalog.int8', NULL::pg_catalog.text),
    ('nevora_tenancy', 'portal_session_issuance', 'portal_access_version', 'pg_catalog.int8', NULL::pg_catalog.text),
    ('nevora_tenancy', 'portal_session_issuance', 'session_created_at', 'pg_catalog.timestamptz', NULL::pg_catalog.text),
    ('nevora_tenancy', 'portal_administrative_authority', 'scope_kind', 'pg_catalog.text', NULL::pg_catalog.text),
    ('nevora_tenancy', 'portal_administrative_authority', 'scope_origin', 'pg_catalog.text', NULL::pg_catalog.text),
    ('nevora_tenancy', 'portal_administrative_authority', 'provenance_reference', 'pg_catalog.text', NULL::pg_catalog.text),
    ('nevora_tenancy', 'portal_administrative_authority', 'capability_policy_revision', 'pg_catalog.int8', NULL::pg_catalog.text)
  ) AS closed(schema_name, relation_name, column_name, type_name, default_expression) LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class AS relation
      JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      JOIN pg_catalog.pg_attribute AS attribute ON attribute.attrelid = relation.oid
      LEFT JOIN pg_catalog.pg_attrdef AS default_value
        ON default_value.adrelid = attribute.attrelid AND default_value.adnum = attribute.attnum
      WHERE namespace.nspname = expected.schema_name AND relation.relname = expected.relation_name
        AND attribute.attname = expected.column_name AND attribute.attnum > 0 AND NOT attribute.attisdropped
        AND attribute.atttypid = expected.type_name::pg_catalog.regtype AND attribute.atttypmod = -1
        AND attribute.attnotnull AND attribute.attidentity = '' AND attribute.attgenerated = ''
        AND attribute.atthasdef = (expected.default_expression IS NOT NULL)
        AND pg_catalog.pg_get_expr(default_value.adbin, default_value.adrelid)
          IS NOT DISTINCT FROM expected.default_expression
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_observation_column_invalid';
    END IF;
  END LOOP;
  -- Native body/source equality is an installation observation, not reviewer or caller authority.
  IF (SELECT count(*) FROM pg_catalog.pg_proc AS function
      WHERE function.pronamespace = schema_oid AND function.proname = 'lock_portal_source_rows') <> 1
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS function
      JOIN pg_catalog.pg_language AS language ON language.oid = function.prolang
      WHERE function.pronamespace = schema_oid AND function.proname = 'lock_portal_source_rows'
        AND function.proowner = installer_oid
        AND function.proargtypes = '25 25 1042'::pg_catalog.oidvector
        AND function.prorettype = 'pg_catalog.void'::pg_catalog.regtype
        AND function.prokind = 'f' AND NOT function.proretset AND NOT function.prosecdef
        AND function.provolatile = 'v' AND function.proparallel = 'u' AND NOT function.proleakproof
        AND function.provariadic = 0 AND function.pronargdefaults = 0 AND function.prosupport = 0
        AND function.proargmodes IS NULL AND function.proallargtypes IS NULL AND language.lanname = 'plpgsql'
        AND function.proconfig = ARRAY['search_path=pg_catalog']::pg_catalog.text[]
        AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(function.prosrc, 'UTF8')), 'hex') = '6266924ebb3e4ef28875123798084447816ba96c44a8be76491a13e31fd8af77'
        AND NOT EXISTS (SELECT 1 FROM pg_catalog.aclexplode(COALESCE(function.proacl,
          pg_catalog.acldefault('f', function.proowner))) AS privilege WHERE privilege.grantee <> function.proowner)
    ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_source_observation_lock_invalid';
  END IF;
END;
$portal_policy_source_observation_parent_prerequisites$;
DO $portal_policy_source_observation_policy_prerequisites$
DECLARE
  schema_oid pg_catalog.oid;
  installer_oid pg_catalog.oid;
  workspace_oid pg_catalog.oid;
  counter_oid pg_catalog.oid;
  counter_guard_oid pg_catalog.oid;
  workspace_key pg_catalog.int2;
  counter_key pg_catalog.int2;
  counter_value pg_catalog.int2;
  expected record;
  relation_oid pg_catalog.oid;
  definition_oid pg_catalog.oid;
  installation_oid pg_catalog.oid;
  policy_guard_oid pg_catalog.oid;
BEGIN
  SELECT installer.oid INTO installer_oid FROM pg_catalog.pg_roles AS installer
    WHERE installer.rolname = current_user;
  SELECT namespace.oid INTO schema_oid FROM pg_catalog.pg_namespace AS namespace
    WHERE namespace.nspname = 'nevora_tenancy';
  IF schema_oid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '3F000', MESSAGE = 'capability_policy_schema_missing';
  END IF;
  IF installer_oid IS NULL OR NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_namespace AS namespace
    WHERE namespace.oid = schema_oid AND namespace.nspowner = installer_oid
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'capability_policy_schema_not_owned';
  END IF;
  SELECT relation.oid INTO workspace_oid FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public' AND relation.relname = 'workspaces'
      AND relation.relkind = 'r' AND relation.relpersistence = 'p';
  SELECT relation.oid INTO counter_oid FROM pg_catalog.pg_class AS relation
    WHERE relation.relnamespace = schema_oid AND relation.relname = 'workspace_incarnation_counter'
      AND relation.relkind = 'r' AND relation.relpersistence = 'p';
  IF workspace_oid IS NULL OR counter_oid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'capability_policy_parent_invalid';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class AS relation
    WHERE relation.oid = ANY(ARRAY[workspace_oid,counter_oid]) AND relation.relowner <> installer_oid) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'capability_policy_parent_not_owned';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class AS relation
    WHERE relation.oid = counter_oid AND relation.relrowsecurity AND relation.relforcerowsecurity)
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_policy AS policy WHERE policy.polrelid = counter_oid)
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_rewrite AS rule
      WHERE rule.ev_class = counter_oid AND rule.rulename <> '_RETURN') THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'capability_policy_counter_control_invalid';
  END IF;
  FOR expected IN SELECT * FROM (VALUES
    (workspace_oid,'id','pg_catalog.text',-1),
    (counter_oid,'workspace_id','pg_catalog.text',-1),
    (counter_oid,'incarnation','pg_catalog.int8',-1)
  ) AS fixed(relation_oid,column_name,type_name,type_modifier) LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute AS attribute
      WHERE attribute.attrelid = expected.relation_oid AND attribute.attname = expected.column_name
        AND attribute.attnum > 0 AND NOT attribute.attisdropped AND attribute.attnotnull
        AND attribute.atttypid = expected.type_name::pg_catalog.regtype
        AND attribute.atttypmod = expected.type_modifier AND NOT attribute.atthasdef
        AND attribute.attidentity = '' AND attribute.attgenerated = '') THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'capability_policy_parent_column_invalid';
    END IF;
  END LOOP;
  IF (SELECT pg_catalog.count(*) FROM pg_catalog.pg_attribute AS attribute
      WHERE attribute.attrelid = counter_oid AND attribute.attnum > 0 AND NOT attribute.attisdropped) <> 2 THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'capability_policy_counter_control_invalid';
  END IF;
  SELECT attribute.attnum INTO workspace_key FROM pg_catalog.pg_attribute AS attribute
    WHERE attribute.attrelid = workspace_oid AND attribute.attname = 'id';
  SELECT attribute.attnum INTO counter_key FROM pg_catalog.pg_attribute AS attribute
    WHERE attribute.attrelid = counter_oid AND attribute.attname = 'workspace_id';
  SELECT attribute.attnum INTO counter_value FROM pg_catalog.pg_attribute AS attribute
    WHERE attribute.attrelid = counter_oid AND attribute.attname = 'incarnation';
  FOR expected IN SELECT * FROM (VALUES
    (workspace_oid,workspace_key), (counter_oid,counter_key)
  ) AS fixed(relation_oid,key_attnum) LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint AS key_constraint
      JOIN pg_catalog.pg_index AS key_index ON key_index.indexrelid = key_constraint.conindid
        AND key_index.indrelid = expected.relation_oid
      JOIN pg_catalog.pg_class AS index_relation ON index_relation.oid = key_index.indexrelid
      JOIN pg_catalog.pg_am AS method ON method.oid = index_relation.relam
      WHERE key_constraint.conrelid = expected.relation_oid AND key_constraint.contype = 'p'
        AND key_constraint.conkey = ARRAY[expected.key_attnum]::pg_catalog.int2[]
        AND key_constraint.convalidated AND NOT key_constraint.condeferrable AND NOT key_constraint.condeferred
        AND COALESCE((pg_catalog.to_jsonb(key_constraint) ->> 'conenforced')::pg_catalog.bool,true)
        AND key_index.indisprimary AND key_index.indisunique AND key_index.indisvalid AND key_index.indisready
        AND key_index.indislive AND key_index.indimmediate AND key_index.indpred IS NULL AND key_index.indexprs IS NULL
        AND key_index.indnatts = 1 AND key_index.indnkeyatts = 1 AND key_index.indkey[0] = expected.key_attnum
        AND index_relation.relkind = 'i' AND index_relation.relpersistence = 'p'
        AND index_relation.relowner = installer_oid AND method.amname = 'btree'
        AND key_index.indoption[0] = 0
        AND key_index.indcollation[0] = (SELECT attribute.attcollation FROM pg_catalog.pg_attribute AS attribute
          WHERE attribute.attrelid = expected.relation_oid AND attribute.attnum = expected.key_attnum)
        AND EXISTS (SELECT 1 FROM pg_catalog.pg_opclass AS operator_class
          JOIN pg_catalog.pg_namespace AS operator_namespace ON operator_namespace.oid = operator_class.opcnamespace
          WHERE operator_class.oid = key_index.indclass[0] AND operator_namespace.nspname = 'pg_catalog'
            AND operator_class.opcname = 'text_ops' AND operator_class.opcmethod = method.oid
            AND operator_class.opcintype = 'pg_catalog.text'::pg_catalog.regtype
            AND operator_class.opcdefault AND operator_class.opckeytype = 0)) THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'capability_policy_parent_key_invalid';
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint AS key_constraint
    WHERE key_constraint.conrelid = counter_oid AND key_constraint.contype = 'f'
      AND key_constraint.conkey = ARRAY[counter_key]::pg_catalog.int2[] AND key_constraint.confrelid = workspace_oid
      AND key_constraint.confkey = ARRAY[workspace_key]::pg_catalog.int2[]
      AND key_constraint.confupdtype = 'r' AND key_constraint.confdeltype = 'r' AND key_constraint.confmatchtype = 's'
      AND key_constraint.convalidated AND NOT key_constraint.condeferrable AND NOT key_constraint.condeferred
      AND COALESCE((pg_catalog.to_jsonb(key_constraint) ->> 'conenforced')::pg_catalog.bool,true))
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint AS key_constraint
      WHERE key_constraint.conrelid = counter_oid AND key_constraint.contype = 'c'
        AND key_constraint.conkey = ARRAY[counter_value]::pg_catalog.int2[] AND key_constraint.convalidated
        AND NOT key_constraint.condeferrable AND NOT key_constraint.condeferred
        AND COALESCE((pg_catalog.to_jsonb(key_constraint) ->> 'conenforced')::pg_catalog.bool,true)
        -- Exact PG18 source-bound native rendering; actual PG17 rendering remains unverified.
        AND pg_catalog.pg_get_constraintdef(key_constraint.oid) = 'CHECK ((incarnation > (0)::bigint))') THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'capability_policy_counter_constraint_invalid';
  END IF;
  IF (SELECT pg_catalog.count(*) FROM pg_catalog.pg_constraint AS key_constraint
      WHERE key_constraint.conrelid = counter_oid AND key_constraint.contype IN ('p','f','c')) <> 3
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_constraint AS key_constraint
      WHERE key_constraint.conrelid = counter_oid AND key_constraint.contype = 'n'
        AND (NOT key_constraint.convalidated OR NOT COALESCE(
          (pg_catalog.to_jsonb(key_constraint) ->> 'conenforced')::pg_catalog.bool,true)))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_inherits AS inheritance
      WHERE inheritance.inhrelid = ANY(ARRAY[workspace_oid,counter_oid])
        OR inheritance.inhparent = ANY(ARRAY[workspace_oid,counter_oid])) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'capability_policy_counter_control_invalid';
  END IF;
  SELECT function.oid INTO counter_guard_oid FROM pg_catalog.pg_proc AS function
    JOIN pg_catalog.pg_language AS language ON language.oid = function.prolang
    WHERE function.pronamespace = schema_oid AND function.proname = 'guard_workspace_incarnation_counter'
      AND function.pronargs = 0 AND function.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype
      AND NOT function.proretset AND NOT function.prosecdef AND function.prokind = 'f'
      AND NOT function.proisstrict AND NOT function.proleakproof AND function.prosupport = 0 AND function.probin IS NULL
      AND function.provolatile = 'v' AND function.proparallel = 'u' AND language.lanname = 'plpgsql'
      AND function.proowner = installer_oid AND function.proconfig = ARRAY['search_path=pg_catalog']
      AND function.prosrc = $accepted_counter_body$
BEGIN
  IF TG_TABLE_SCHEMA IS DISTINCT FROM 'nevora_tenancy'
    OR TG_TABLE_NAME IS DISTINCT FROM 'workspace_incarnation_counter' THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'workspace_incarnation_guard_route_invalid';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF TG_LEVEL IS DISTINCT FROM 'ROW' THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'workspace_incarnation_guard_route_invalid';
    END IF;
    IF pg_catalog.convert_to(NEW.workspace_id, 'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.workspace_id, 'UTF8') THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'workspace_incarnation_identity_immutable';
    END IF;
    IF NEW.incarnation IS NULL OR OLD.incarnation IS NULL OR NEW.incarnation <= OLD.incarnation THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'workspace_incarnation_not_increasing';
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF TG_LEVEL IS DISTINCT FROM 'ROW' THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'workspace_incarnation_guard_route_invalid';
    END IF;
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'workspace_incarnation_delete_forbidden';
  ELSIF TG_OP = 'TRUNCATE' THEN
    IF TG_LEVEL IS DISTINCT FROM 'STATEMENT' THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'workspace_incarnation_guard_route_invalid';
    END IF;
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'workspace_incarnation_truncate_forbidden';
  ELSE
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'workspace_incarnation_guard_route_invalid';
  END IF;
END;
$accepted_counter_body$;
  IF counter_guard_oid IS NULL OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_proc AS function
      WHERE function.pronamespace = schema_oid AND function.proname = 'guard_workspace_incarnation_counter') <> 1
    OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_trigger AS trigger
      WHERE trigger.tgrelid = counter_oid AND NOT trigger.tgisinternal) <> 2 THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'capability_policy_counter_guard_invalid';
  END IF;
  FOR expected IN SELECT * FROM (VALUES
    ('workspace_incarnation_counter_row_guard',27), ('workspace_incarnation_counter_truncate_guard',34)
  ) AS fixed(trigger_name,trigger_type) LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger AS trigger
      WHERE trigger.tgrelid = counter_oid AND trigger.tgname = expected.trigger_name
        AND trigger.tgfoid = counter_guard_oid AND trigger.tgtype = expected.trigger_type
        AND trigger.tgenabled = 'O' AND NOT trigger.tgisinternal AND trigger.tgnargs = 0
        AND trigger.tgconstraint = 0 AND trigger.tgqual IS NULL
        AND NOT trigger.tgdeferrable AND NOT trigger.tginitdeferred
        AND trigger.tgargs = ''::pg_catalog.bytea
        AND trigger.tgattr::pg_catalog.text = ''
        AND trigger.tgoldtable IS NULL AND trigger.tgnewtable IS NULL) THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'capability_policy_counter_guard_invalid';
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class AS relation
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(relation.relacl,
      pg_catalog.acldefault('r',relation.relowner))) AS privilege
    WHERE relation.oid = counter_oid AND privilege.grantee <> relation.relowner)
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_attribute AS attribute
      CROSS JOIN LATERAL pg_catalog.aclexplode(attribute.attacl) AS privilege
      WHERE attribute.attrelid = counter_oid AND attribute.attnum > 0 AND NOT attribute.attisdropped
        AND privilege.grantee <> installer_oid)
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS function
      CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(function.proacl,
        pg_catalog.acldefault('f',function.proowner))) AS privilege
      WHERE function.oid = counter_guard_oid AND privilege.grantee <> function.proowner) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'capability_policy_parent_acl_invalid';
  END IF;
  FOR expected IN SELECT * FROM (VALUES
    ('capability_policy_definition',9), ('workspace_capability_policy_installation',5)
  ) AS fixed(relation_name,column_count) LOOP
    SELECT relation.oid INTO relation_oid FROM pg_catalog.pg_class AS relation
      WHERE relation.relnamespace = schema_oid AND relation.relname = expected.relation_name
        AND relation.relkind = 'r' AND relation.relpersistence = 'p' AND relation.relowner = installer_oid
        AND relation.relrowsecurity AND relation.relforcerowsecurity;
    IF relation_oid IS NULL OR EXISTS (SELECT 1 FROM pg_catalog.pg_policy AS policy WHERE policy.polrelid = relation_oid)
      OR EXISTS (SELECT 1 FROM pg_catalog.pg_inherits AS inheritance
        WHERE inheritance.inhrelid = relation_oid OR inheritance.inhparent = relation_oid)
      OR EXISTS (SELECT 1 FROM pg_catalog.pg_rewrite AS rule WHERE rule.ev_class = relation_oid AND rule.rulename <> '_RETURN')
      OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_attribute AS attribute
        WHERE attribute.attrelid = relation_oid AND attribute.attnum > 0 AND NOT attribute.attisdropped) <> expected.column_count
      OR EXISTS (SELECT 1 FROM pg_catalog.pg_class AS relation
        CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(relation.relacl,pg_catalog.acldefault('r',relation.relowner))) AS privilege
        WHERE relation.oid = relation_oid AND privilege.grantee <> relation.relowner)
      OR EXISTS (SELECT 1 FROM pg_catalog.pg_attribute AS attribute
        CROSS JOIN LATERAL pg_catalog.aclexplode(attribute.attacl) AS privilege
        WHERE attribute.attrelid = relation_oid AND attribute.attnum > 0 AND NOT attribute.attisdropped
          AND privilege.grantee <> installer_oid) THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_installed_policy_relation_invalid';
    END IF;
    IF expected.relation_name = 'capability_policy_definition' THEN definition_oid := relation_oid;
    ELSE installation_oid := relation_oid; END IF;
  END LOOP;
  FOR expected IN SELECT * FROM (VALUES
    ('capability_policy_definition',1,'policy_id','pg_catalog.text',true),
    ('capability_policy_definition',2,'revision','pg_catalog.int8',false),
    ('capability_policy_definition',3,'definition','pg_catalog.jsonb',false),
    ('capability_policy_definition',4,'canonical_policy_source','pg_catalog.bytea',false),
    ('capability_policy_definition',5,'canonical_policy_source_sha256','pg_catalog.text',true),
    ('capability_policy_definition',6,'vocabulary_source','pg_catalog.bytea',false),
    ('capability_policy_definition',7,'vocabulary_source_sha256','pg_catalog.text',true),
    ('capability_policy_definition',8,'approved_prd_source','pg_catalog.bytea',false),
    ('capability_policy_definition',9,'approved_prd_source_sha256','pg_catalog.text',true),
    ('workspace_capability_policy_installation',1,'workspace_id','pg_catalog.text',false),
    ('workspace_capability_policy_installation',2,'workspace_incarnation','pg_catalog.int8',false),
    ('workspace_capability_policy_installation',3,'installation_epoch','pg_catalog.int8',false),
    ('workspace_capability_policy_installation',4,'policy_id','pg_catalog.text',true),
    ('workspace_capability_policy_installation',5,'policy_revision','pg_catalog.int8',false)
  ) AS fixed(relation_name,ordinal,column_name,type_name,c_collation) LOOP
    relation_oid := CASE WHEN expected.relation_name = 'capability_policy_definition' THEN definition_oid ELSE installation_oid END;
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute AS attribute
      WHERE attribute.attrelid = relation_oid AND attribute.attnum = expected.ordinal
        AND attribute.attname = expected.column_name AND NOT attribute.attisdropped AND attribute.attnotnull
        AND attribute.atttypid = expected.type_name::pg_catalog.regtype AND attribute.atttypmod = -1
        AND NOT attribute.atthasdef AND attribute.attidentity = '' AND attribute.attgenerated = ''
        AND (NOT expected.c_collation OR attribute.attcollation = 'pg_catalog."C"'::pg_catalog.regcollation)) THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_installed_policy_column_invalid';
    END IF;
  END LOOP;
  -- Exact source-bound prior-root PG18 constraint rendering, no OID/owner/session fingerprint.
  -- Actual PG17 output/version compatibility remains unverified and must fail closed on mismatch.
  FOR expected IN SELECT * FROM (VALUES
    ('capability_policy_definition','capability_policy_definition_approved_prd_source_check','c',ARRAY[8]::pg_catalog.int2[],'CHECK ((octet_length(convert_from(approved_prd_source, ''UTF8''::name)) > 0))'),
    ('capability_policy_definition','capability_policy_definition_canonical_policy_source_check','c',ARRAY[4]::pg_catalog.int2[],'CHECK ((octet_length(convert_from(canonical_policy_source, ''UTF8''::name)) > 0))'),
    ('capability_policy_definition','capability_policy_definition_check','c',ARRAY[5,4]::pg_catalog.int2[],'CHECK ((canonical_policy_source_sha256 = encode(sha256(canonical_policy_source), ''hex''::text)))'),
    ('capability_policy_definition','capability_policy_definition_check1','c',ARRAY[7,6]::pg_catalog.int2[],'CHECK ((vocabulary_source_sha256 = encode(sha256(vocabulary_source), ''hex''::text)))'),
    ('capability_policy_definition','capability_policy_definition_check2','c',ARRAY[9,8]::pg_catalog.int2[],'CHECK ((approved_prd_source_sha256 = encode(sha256(approved_prd_source), ''hex''::text)))'),
    ('capability_policy_definition','capability_policy_definition_check3','c',ARRAY[3,1,2,5,7,9]::pg_catalog.int2[],'CHECK ((definition = jsonb_build_object(''format'', ''NEVORA_CAPABILITY_SOURCE_BUNDLE_V1'', ''policyId'', policy_id, ''revision'', (revision)::text, ''canonicalPolicySource'', jsonb_build_object(''path'', ''src/lib/capabilities/policy.ts'', ''sha256'', canonical_policy_source_sha256), ''vocabularySource'', jsonb_build_object(''path'', ''src/lib/capabilities/types.ts'', ''sha256'', vocabulary_source_sha256), ''approvedPRD'', jsonb_build_object(''path'', ''F_IMPLEMENTATION_PRD.md'', ''sha256'', approved_prd_source_sha256))))'),
    ('capability_policy_definition','capability_policy_definition_pkey','p',ARRAY[1,2]::pg_catalog.int2[],'PRIMARY KEY (policy_id, revision)'),
    ('capability_policy_definition','capability_policy_definition_revision_check','c',ARRAY[2]::pg_catalog.int2[],'CHECK ((revision > (0)::bigint))'),
    ('capability_policy_definition','capability_policy_definition_vocabulary_source_check','c',ARRAY[6]::pg_catalog.int2[],'CHECK ((octet_length(convert_from(vocabulary_source, ''UTF8''::name)) > 0))'),
    ('workspace_capability_policy_installation','workspace_capability_policy_inst_policy_id_policy_revision_fkey','f',ARRAY[4,5]::pg_catalog.int2[],'FOREIGN KEY (policy_id, policy_revision) REFERENCES nevora_tenancy.capability_policy_definition(policy_id, revision) ON UPDATE RESTRICT ON DELETE RESTRICT'),
    ('workspace_capability_policy_installation','workspace_capability_policy_install_workspace_incarnation_check','c',ARRAY[2]::pg_catalog.int2[],'CHECK ((workspace_incarnation > (0)::bigint))'),
    ('workspace_capability_policy_installation','workspace_capability_policy_installati_installation_epoch_check','c',ARRAY[3]::pg_catalog.int2[],'CHECK ((installation_epoch > (0)::bigint))'),
    ('workspace_capability_policy_installation','workspace_capability_policy_installation_pkey','p',ARRAY[1]::pg_catalog.int2[],'PRIMARY KEY (workspace_id)'),
    ('workspace_capability_policy_installation','workspace_capability_policy_installation_policy_revision_check','c',ARRAY[5]::pg_catalog.int2[],'CHECK ((policy_revision > (0)::bigint))'),
    ('workspace_capability_policy_installation','workspace_capability_policy_installation_workspace_id_fkey','f',ARRAY[1]::pg_catalog.int2[],'FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON UPDATE RESTRICT ON DELETE RESTRICT'),
    ('workspace_capability_policy_installation','workspace_capability_policy_installation_workspace_id_fkey1','f',ARRAY[1]::pg_catalog.int2[],'FOREIGN KEY (workspace_id) REFERENCES nevora_tenancy.workspace_incarnation_counter(workspace_id) ON UPDATE RESTRICT ON DELETE RESTRICT')
  ) AS fixed(relation_name,constraint_name,constraint_kind,key_columns,definition_text) LOOP
    relation_oid := CASE WHEN expected.relation_name = 'capability_policy_definition' THEN definition_oid ELSE installation_oid END;
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint AS key_constraint
      WHERE key_constraint.conrelid = relation_oid AND key_constraint.conname = expected.constraint_name
        AND key_constraint.contype::pg_catalog.text = expected.constraint_kind AND key_constraint.conkey = expected.key_columns
        AND key_constraint.convalidated AND NOT key_constraint.condeferrable AND NOT key_constraint.condeferred
        AND key_constraint.conparentid = 0
        AND COALESCE((pg_catalog.to_jsonb(key_constraint) ->> 'conenforced')::pg_catalog.bool,true)
        AND pg_catalog.pg_get_constraintdef(key_constraint.oid) = expected.definition_text) THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_installed_policy_constraint_invalid';
    END IF;
  END LOOP;
  IF (SELECT pg_catalog.count(*) FROM pg_catalog.pg_constraint AS key_constraint
      WHERE key_constraint.conrelid = definition_oid AND key_constraint.contype IN ('c','p','f','u','x')) <> 9
    OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_constraint AS key_constraint
      WHERE key_constraint.conrelid = installation_oid AND key_constraint.contype IN ('c','p','f','u','x')) <> 7
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_constraint AS key_constraint
      WHERE key_constraint.conrelid = ANY(ARRAY[definition_oid,installation_oid]) AND key_constraint.contype = 'n'
        AND (NOT key_constraint.convalidated OR NOT COALESCE((pg_catalog.to_jsonb(key_constraint) ->> 'conenforced')::pg_catalog.bool,true))) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_installed_policy_constraint_invalid';
  END IF;
  FOR expected IN SELECT * FROM (VALUES
    (definition_oid,ARRAY[1,2]::pg_catalog.int2[]), (installation_oid,ARRAY[1]::pg_catalog.int2[])
  ) AS fixed(relation_oid,key_columns) LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint AS key_constraint
      JOIN pg_catalog.pg_index AS key_index ON key_index.indexrelid = key_constraint.conindid AND key_index.indrelid = expected.relation_oid
      JOIN pg_catalog.pg_class AS index_relation ON index_relation.oid = key_index.indexrelid
      JOIN pg_catalog.pg_am AS method ON method.oid = index_relation.relam
      WHERE key_constraint.conrelid = expected.relation_oid AND key_constraint.contype = 'p' AND key_constraint.conkey = expected.key_columns
        AND key_index.indisprimary AND key_index.indisunique AND key_index.indisvalid AND key_index.indisready
        AND key_index.indislive AND key_index.indimmediate AND key_index.indpred IS NULL AND key_index.indexprs IS NULL
        AND key_index.indnatts = pg_catalog.cardinality(expected.key_columns) AND key_index.indnkeyatts = key_index.indnatts
        AND index_relation.relkind = 'i' AND index_relation.relpersistence = 'p' AND index_relation.relowner = installer_oid
        AND method.amname = 'btree'
        AND NOT EXISTS (SELECT 1 FROM pg_catalog.generate_series(0,pg_catalog.cardinality(expected.key_columns)-1) AS key_position(position)
          JOIN pg_catalog.pg_attribute AS attribute ON attribute.attrelid = expected.relation_oid AND attribute.attnum = expected.key_columns[key_position.position+1]
          LEFT JOIN pg_catalog.pg_opclass AS operator_class ON operator_class.oid = key_index.indclass[key_position.position]
          LEFT JOIN pg_catalog.pg_namespace AS operator_namespace ON operator_namespace.oid = operator_class.opcnamespace
          WHERE key_index.indkey[key_position.position] IS DISTINCT FROM attribute.attnum OR key_index.indoption[key_position.position] <> 0
            OR key_index.indcollation[key_position.position] IS DISTINCT FROM attribute.attcollation
            OR operator_namespace.nspname IS DISTINCT FROM 'pg_catalog' OR NOT COALESCE(operator_class.opcdefault,false)
            OR operator_class.opcmethod IS DISTINCT FROM method.oid OR operator_class.opcintype IS DISTINCT FROM attribute.atttypid
            OR operator_class.opckeytype IS DISTINCT FROM 0::pg_catalog.oid
            OR operator_class.opcname IS DISTINCT FROM CASE WHEN attribute.atttypid = 'pg_catalog.text'::pg_catalog.regtype THEN 'text_ops' ELSE 'int8_ops' END)) THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_installed_policy_key_invalid';
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint AS key_constraint
      WHERE key_constraint.conrelid = installation_oid AND key_constraint.contype = 'f'
        AND key_constraint.conkey = ARRAY[1]::pg_catalog.int2[] AND key_constraint.confrelid = workspace_oid
        AND key_constraint.confkey = ARRAY[workspace_key]::pg_catalog.int2[])
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint AS key_constraint
      WHERE key_constraint.conrelid = installation_oid AND key_constraint.contype = 'f'
        AND key_constraint.conkey = ARRAY[1]::pg_catalog.int2[] AND key_constraint.confrelid = counter_oid
        AND key_constraint.confkey = ARRAY[counter_key]::pg_catalog.int2[])
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint AS key_constraint
      WHERE key_constraint.conrelid = installation_oid AND key_constraint.contype = 'f'
        AND key_constraint.conkey = ARRAY[4,5]::pg_catalog.int2[] AND key_constraint.confrelid = definition_oid
        AND key_constraint.confkey = ARRAY[1,2]::pg_catalog.int2[])
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_constraint AS key_constraint
      WHERE key_constraint.conrelid = installation_oid AND key_constraint.contype = 'f'
        AND (key_constraint.confupdtype <> 'r' OR key_constraint.confdeltype <> 'r' OR key_constraint.confmatchtype <> 's')) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_installed_policy_reference_invalid';
  END IF;
  SELECT function.oid INTO policy_guard_oid FROM pg_catalog.pg_proc AS function
    JOIN pg_catalog.pg_language AS language ON language.oid = function.prolang
    WHERE function.pronamespace = schema_oid AND function.proname = 'guard_capability_policy_storage'
      AND function.pronargs = 0 AND function.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype
      AND NOT function.proretset AND NOT function.prosecdef AND function.prokind = 'f'
      AND NOT function.proisstrict AND NOT function.proleakproof AND function.prosupport = 0 AND function.probin IS NULL
      AND function.provolatile = 'v' AND function.proparallel = 'u' AND language.lanname = 'plpgsql'
      AND function.proowner = installer_oid AND function.proconfig = ARRAY['search_path=pg_catalog']::pg_catalog.text[]
      AND function.provariadic = 0 AND function.pronargdefaults = 0 AND function.proargmodes IS NULL AND function.proallargtypes IS NULL
      AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(function.prosrc,'UTF8')),'hex') = '64e874e6af06d180772365b30f8ae6bd10508674caa63f13cf11a84286938d3b';
  IF policy_guard_oid IS NULL OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_proc AS function
      WHERE function.pronamespace = schema_oid AND function.proname = 'guard_capability_policy_storage') <> 1 THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_installed_policy_guard_invalid';
  END IF;
  FOR expected IN SELECT * FROM (VALUES
    (definition_oid,'capability_policy_definition_row_guard',31),
    (definition_oid,'capability_policy_definition_truncate_guard',34),
    (installation_oid,'workspace_capability_policy_installation_row_guard',31),
    (installation_oid,'workspace_capability_policy_installation_truncate_guard',34)
  ) AS fixed(relation_oid,trigger_name,trigger_type) LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger AS trigger
      WHERE trigger.tgrelid = expected.relation_oid AND trigger.tgname = expected.trigger_name
        AND trigger.tgfoid = policy_guard_oid AND trigger.tgtype = expected.trigger_type AND trigger.tgenabled = 'O'
        AND NOT trigger.tgisinternal AND trigger.tgnargs = 0 AND trigger.tgargs = ''::pg_catalog.bytea
        AND trigger.tgattr = ''::pg_catalog.int2vector AND trigger.tgqual IS NULL AND trigger.tgconstraint = 0
        AND NOT trigger.tgdeferrable AND NOT trigger.tginitdeferred AND trigger.tgoldtable IS NULL AND trigger.tgnewtable IS NULL)
      OR (SELECT pg_catalog.count(*) FROM pg_catalog.pg_trigger AS trigger
        WHERE trigger.tgrelid = expected.relation_oid AND NOT trigger.tgisinternal) <> 2 THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_installed_policy_guard_invalid';
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_namespace AS namespace
      CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(namespace.nspacl,pg_catalog.acldefault('n',namespace.nspowner))) AS privilege
      WHERE namespace.oid = schema_oid AND privilege.grantee <> namespace.nspowner)
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS function
      CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(function.proacl,pg_catalog.acldefault('f',function.proowner))) AS privilege
      WHERE function.oid = policy_guard_oid AND privilege.grantee <> function.proowner) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'portal_installed_policy_acl_invalid';
  END IF;
END;
$portal_policy_source_observation_policy_prerequisites$;

DO $portal_policy_source_observation_dependencies$
DECLARE installer_oid pg_catalog.oid; schema_oid pg_catalog.oid; expected record;
BEGIN
  SELECT installer.oid INTO installer_oid FROM pg_catalog.pg_roles AS installer WHERE installer.rolname=current_user;
  SELECT namespace.oid INTO schema_oid FROM pg_catalog.pg_namespace AS namespace
    WHERE namespace.nspname='nevora_tenancy' AND namespace.nspowner=installer_oid;
  IF installer_oid IS NULL OR schema_oid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='portal_policy_source_observation_schema_not_owned';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS function
    WHERE function.pronamespace=schema_oid AND function.proname='read_portal_policy_source_rows') THEN
    RAISE EXCEPTION USING ERRCODE='42723', MESSAGE='portal_policy_source_observation_already_installed';
  END IF;
  -- These external source pins/metadata are observations, not caller/reviewer authentication.
  FOR expected IN SELECT * FROM (VALUES
    ('read_portal_source_rows','25 25 1042'::pg_catalog.oidvector,ARRAY['p_workspace_id','p_employee_id','p_session_token_hash']::pg_catalog.text[],3802::pg_catalog.oid,'7a83fca46be2a8f5c877ac6e5ae60328d5a454c2a974b624c6edd4ff8463b7f9'::pg_catalog.text),
    ('lock_portal_policy_source_rows','25 25 1042'::pg_catalog.oidvector,ARRAY['p_workspace_id','p_employee_id','p_session_token_hash']::pg_catalog.text[],2278::pg_catalog.oid,'6a25dc1ce379ce176f5995328032ad03d2a6749026d4aeafd42bfe68fb5703d1'::pg_catalog.text),
    ('read_portal_installed_policy','25'::pg_catalog.oidvector,ARRAY['p_workspace_id']::pg_catalog.text[],3802::pg_catalog.oid,'975487315f2e091f7659d5f9aa8c89cef4d13e1685e49f4a0162f5eb9a916baa'::pg_catalog.text)
  ) AS fixed(function_name,argument_types,argument_names,result_type,body_sha256) LOOP
    IF (SELECT pg_catalog.count(*) FROM pg_catalog.pg_proc AS function
        WHERE function.pronamespace=schema_oid AND function.proname=expected.function_name) <> 1
      OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS function
        JOIN pg_catalog.pg_language AS language ON language.oid=function.prolang
        WHERE function.pronamespace=schema_oid AND function.proname=expected.function_name
          AND function.proowner=installer_oid AND function.pronargs=pg_catalog.cardinality(expected.argument_names)
          AND function.proargtypes=expected.argument_types AND function.proargnames=expected.argument_names
          AND function.prorettype=expected.result_type AND function.prokind='f' AND NOT function.proretset AND NOT function.prosecdef
          AND function.provolatile='v' AND function.proparallel='u' AND NOT function.proisstrict AND NOT function.proleakproof
          AND function.provariadic=0 AND function.pronargdefaults=0 AND function.prosupport=0 AND function.probin IS NULL
          AND function.proargmodes IS NULL AND function.proallargtypes IS NULL AND language.lanname='plpgsql'
          AND function.proconfig=ARRAY['search_path=pg_catalog']::pg_catalog.text[]
          AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(function.prosrc,'UTF8')),'hex')=expected.body_sha256
          AND NOT EXISTS (SELECT 1 FROM pg_catalog.aclexplode(COALESCE(function.proacl,
            pg_catalog.acldefault('f',function.proowner))) AS privilege
            WHERE privilege.grantee<>function.proowner OR privilege.privilege_type<>'EXECUTE' OR privilege.is_grantable)) THEN
      RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='portal_policy_source_observation_dependency_invalid';
    END IF;
  END LOOP;
END;
$portal_policy_source_observation_dependencies$;
CREATE FUNCTION nevora_tenancy.read_portal_policy_source_rows(
  p_workspace_id pg_catalog.text,
  p_employee_id pg_catalog.text,
  p_session_token_hash pg_catalog.bpchar
)
RETURNS pg_catalog.jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $portal_policy_source_observation$
DECLARE observed pg_catalog.jsonb;
BEGIN
  IF pg_catalog.current_setting('transaction_isolation') IS DISTINCT FROM 'read committed' THEN
    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='portal_policy_source_observation_isolation_required';
  END IF;
  PERFORM nevora_tenancy.lock_portal_policy_source_rows(p_workspace_id,p_employee_id,p_session_token_hash);
  -- One fresh VOLATILE SPI query after all joint locks. No second helper call, head-selection query,
  -- alternate definition lock, replay or complete old-kernel wrapper. The joined head/definition
  -- are the unique exact identities already protected by this transaction's joint kernel locks.
  SELECT pg_catalog.jsonb_build_object(
    'kind','PORTAL_POLICY_SOURCE_OBSERVATION_V1',
    'portalSource',pg_catalog.jsonb_build_object(
    'kind', 'PORTAL_SOURCE_OBSERVATION_V1',
    'workspace', pg_catalog.jsonb_build_object(
      'id', workspace.id, 'active', workspace.active, 'version', workspace.updated_at::pg_catalog.text),
    'employee', pg_catalog.jsonb_build_object(
      'id', employee.id, 'workspaceId', employee.workspace_id, 'active', employee.active,
      'role', employee.role, 'version', employee.updated_at::pg_catalog.text),
    'credential', pg_catalog.jsonb_build_object(
      'employeeId', credential.employee_id, 'version', credential.password_updated_at::pg_catalog.text,
      'mustChangePassword', credential.must_change_password),
    'incarnation', pg_catalog.jsonb_build_object(
      'workspaceId', incarnation.workspace_id, 'version', incarnation.incarnation::pg_catalog.text),
    'portal', pg_catalog.jsonb_build_object(
      'workspaceId', portal.workspace_id, 'employeeId', portal.employee_id,
      'authorizationVersion', portal.authorization_version::pg_catalog.text,
      'portalAccessVersion', portal.portal_access_version::pg_catalog.text,
      'capabilityPolicyRevision', portal.capability_policy_revision::pg_catalog.text,
      'state', portal.portal_state, 'proofProvenance', portal.proof_provenance,
      'provenanceReference', portal.provenance_reference),
    'session', pg_catalog.jsonb_build_object(
      'tokenHash', session.token_hash::pg_catalog.text, 'employeeId', session.employee_id,
      'expiresAt', session.expires_at::pg_catalog.text, 'createdAt', session.created_at::pg_catalog.text),
    'issuance', pg_catalog.jsonb_build_object(
      'tokenHash', issuance.token_hash::pg_catalog.text, 'workspaceId', issuance.workspace_id,
      'employeeId', issuance.employee_id, 'workspaceIncarnation', issuance.workspace_incarnation::pg_catalog.text,
      'portalAccessVersion', issuance.portal_access_version::pg_catalog.text,
      'sessionCreatedAt', issuance.session_created_at::pg_catalog.text),
    'administrative', CASE WHEN administrative.workspace_id IS NULL THEN 'null'::pg_catalog.jsonb ELSE
      pg_catalog.jsonb_build_object(
        'workspaceId', administrative.workspace_id, 'employeeId', administrative.employee_id,
        'scopeKind', administrative.scope_kind, 'scopeOrigin', administrative.scope_origin,
        'provenanceReference', administrative.provenance_reference,
        'capabilityPolicyRevision', administrative.capability_policy_revision::pg_catalog.text,
        'capabilities', COALESCE((SELECT pg_catalog.jsonb_agg(capability.capability ORDER BY pg_catalog.convert_to(capability.capability, 'UTF8'))
          FROM nevora_tenancy.portal_administrative_capability AS capability
          WHERE capability.workspace_id OPERATOR(pg_catalog.=) p_workspace_id
            AND pg_catalog.convert_to(capability.workspace_id, 'UTF8') = pg_catalog.convert_to(p_workspace_id, 'UTF8')
            AND capability.employee_id OPERATOR(pg_catalog.=) p_employee_id
            AND pg_catalog.convert_to(capability.employee_id, 'UTF8') = pg_catalog.convert_to(p_employee_id, 'UTF8')), '[]'::pg_catalog.jsonb),
        'locationIds', COALESCE((SELECT pg_catalog.jsonb_agg(location.location_id ORDER BY pg_catalog.convert_to(location.location_id, 'UTF8'))
          FROM nevora_tenancy.portal_administrative_location AS location
          WHERE location.workspace_id OPERATOR(pg_catalog.=) p_workspace_id
            AND pg_catalog.convert_to(location.workspace_id, 'UTF8') = pg_catalog.convert_to(p_workspace_id, 'UTF8')
            AND location.employee_id OPERATOR(pg_catalog.=) p_employee_id
            AND pg_catalog.convert_to(location.employee_id, 'UTF8') = pg_catalog.convert_to(p_employee_id, 'UTF8')), '[]'::pg_catalog.jsonb)
      ) END
  ),
    'installedPolicy',pg_catalog.jsonb_build_object(
    'kind','PORTAL_INSTALLED_POLICY_OBSERVATION_V1',
    'workspaceId',workspace.id,
    'workspaceIncarnation',incarnation.incarnation::pg_catalog.text,
    'installation',pg_catalog.jsonb_build_object(
      'workspaceId',installation.workspace_id,'workspaceIncarnation',installation.workspace_incarnation::pg_catalog.text,
      'installationEpoch',installation.installation_epoch::pg_catalog.text,
      'policyId',installation.policy_id,'policyRevision',installation.policy_revision::pg_catalog.text),
    'definition',pg_catalog.jsonb_build_object(
      'policyId',definition.policy_id,'revision',definition.revision::pg_catalog.text,
      'sourceBundle',definition.definition,
      'sourceBundleWire',pg_catalog.jsonb_build_object('encoding','UTF8','text',definition.definition::pg_catalog.text,
        'bytesBase64',pg_catalog.encode(pg_catalog.convert_to(definition.definition::pg_catalog.text,'UTF8'),'base64'),
        'byteLength',pg_catalog.octet_length(pg_catalog.convert_to(definition.definition::pg_catalog.text,'UTF8'))::pg_catalog.text,
        'sha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(definition.definition::pg_catalog.text,'UTF8')),'hex')),
      'canonicalPolicySource',pg_catalog.jsonb_build_object('encoding','UTF8',
        'bytesBase64',pg_catalog.encode(definition.canonical_policy_source,'base64'),
        'byteLength',pg_catalog.octet_length(definition.canonical_policy_source)::pg_catalog.text,'sha256',definition.canonical_policy_source_sha256),
      'vocabularySource',pg_catalog.jsonb_build_object('encoding','UTF8',
        'bytesBase64',pg_catalog.encode(definition.vocabulary_source,'base64'),
        'byteLength',pg_catalog.octet_length(definition.vocabulary_source)::pg_catalog.text,'sha256',definition.vocabulary_source_sha256),
      'approvedPRDSource',pg_catalog.jsonb_build_object('encoding','UTF8',
        'bytesBase64',pg_catalog.encode(definition.approved_prd_source,'base64'),
        'byteLength',pg_catalog.octet_length(definition.approved_prd_source)::pg_catalog.text,'sha256',definition.approved_prd_source_sha256)),
    'verification','SOURCE_OBSERVATION_NOT_PROOF_OR_EXECUTING_SOURCE_AUTHENTICATION'),
    'verification','SOURCE_OBSERVATION_NOT_PROOF_OR_EXECUTING_SOURCE_AUTHENTICATION') INTO observed
  FROM public.workspaces AS workspace
  JOIN public.employees AS employee
    ON employee.id OPERATOR(pg_catalog.=) p_employee_id
      AND pg_catalog.convert_to(employee.id, 'UTF8') = pg_catalog.convert_to(p_employee_id, 'UTF8')
      AND employee.workspace_id OPERATOR(pg_catalog.=) p_workspace_id
      AND pg_catalog.convert_to(employee.workspace_id, 'UTF8') = pg_catalog.convert_to(p_workspace_id, 'UTF8')
  JOIN public.employee_credentials AS credential
    ON credential.employee_id OPERATOR(pg_catalog.=) p_employee_id
      AND pg_catalog.convert_to(credential.employee_id, 'UTF8') = pg_catalog.convert_to(p_employee_id, 'UTF8')
  JOIN nevora_tenancy.workspace_incarnation_counter AS incarnation
    ON incarnation.workspace_id OPERATOR(pg_catalog.=) p_workspace_id
      AND pg_catalog.convert_to(incarnation.workspace_id, 'UTF8') = pg_catalog.convert_to(p_workspace_id, 'UTF8')
  JOIN nevora_tenancy.portal_authority AS portal
    ON portal.workspace_id OPERATOR(pg_catalog.=) p_workspace_id
      AND pg_catalog.convert_to(portal.workspace_id, 'UTF8') = pg_catalog.convert_to(p_workspace_id, 'UTF8')
      AND portal.employee_id OPERATOR(pg_catalog.=) p_employee_id
      AND pg_catalog.convert_to(portal.employee_id, 'UTF8') = pg_catalog.convert_to(p_employee_id, 'UTF8')
  JOIN public.employee_sessions AS session
    ON session.token_hash = p_session_token_hash
      AND session.employee_id OPERATOR(pg_catalog.=) p_employee_id
      AND pg_catalog.convert_to(session.employee_id, 'UTF8') = pg_catalog.convert_to(p_employee_id, 'UTF8')
  JOIN nevora_tenancy.portal_session_issuance AS issuance
    ON issuance.token_hash = p_session_token_hash
      AND issuance.workspace_id OPERATOR(pg_catalog.=) p_workspace_id
      AND pg_catalog.convert_to(issuance.workspace_id, 'UTF8') = pg_catalog.convert_to(p_workspace_id, 'UTF8')
      AND issuance.employee_id OPERATOR(pg_catalog.=) p_employee_id
      AND pg_catalog.convert_to(issuance.employee_id, 'UTF8') = pg_catalog.convert_to(p_employee_id, 'UTF8')
  LEFT JOIN nevora_tenancy.portal_administrative_authority AS administrative
    ON administrative.workspace_id OPERATOR(pg_catalog.=) p_workspace_id
      AND pg_catalog.convert_to(administrative.workspace_id, 'UTF8') = pg_catalog.convert_to(p_workspace_id, 'UTF8')
      AND administrative.employee_id OPERATOR(pg_catalog.=) p_employee_id
      AND pg_catalog.convert_to(administrative.employee_id, 'UTF8') = pg_catalog.convert_to(p_employee_id, 'UTF8')
  JOIN nevora_tenancy.workspace_capability_policy_installation AS installation
    ON installation.workspace_id OPERATOR(pg_catalog.=) workspace.id
      AND pg_catalog.convert_to(installation.workspace_id,'UTF8') = pg_catalog.convert_to(workspace.id,'UTF8')
  JOIN nevora_tenancy.capability_policy_definition AS definition
    ON definition.policy_id OPERATOR(pg_catalog.=) installation.policy_id
      AND pg_catalog.convert_to(definition.policy_id,'UTF8') = pg_catalog.convert_to(installation.policy_id,'UTF8')
      AND definition.revision OPERATOR(pg_catalog.=) installation.policy_revision
  WHERE workspace.id OPERATOR(pg_catalog.=) p_workspace_id
    AND pg_catalog.convert_to(workspace.id, 'UTF8') = pg_catalog.convert_to(p_workspace_id, 'UTF8')
    AND installation.workspace_incarnation IS NOT DISTINCT FROM incarnation.incarnation
      AND incarnation.incarnation > 0::pg_catalog.int8 AND installation.installation_epoch > 0::pg_catalog.int8 AND definition.revision > 0::pg_catalog.int8
      AND definition.canonical_policy_source_sha256 OPERATOR(pg_catalog.=) pg_catalog.encode(pg_catalog.sha256(definition.canonical_policy_source),'hex')
      AND definition.vocabulary_source_sha256 OPERATOR(pg_catalog.=) pg_catalog.encode(pg_catalog.sha256(definition.vocabulary_source),'hex')
      AND definition.approved_prd_source_sha256 OPERATOR(pg_catalog.=) pg_catalog.encode(pg_catalog.sha256(definition.approved_prd_source),'hex')
      AND pg_catalog.octet_length(pg_catalog.convert_from(definition.canonical_policy_source,'UTF8')) > 0
      AND pg_catalog.octet_length(pg_catalog.convert_from(definition.vocabulary_source,'UTF8')) > 0
      AND pg_catalog.octet_length(pg_catalog.convert_from(definition.approved_prd_source,'UTF8')) > 0
      AND definition.definition IS NOT DISTINCT FROM pg_catalog.jsonb_build_object(
        'format','NEVORA_CAPABILITY_SOURCE_BUNDLE_V1','policyId',definition.policy_id,'revision',definition.revision::pg_catalog.text,
        'canonicalPolicySource',pg_catalog.jsonb_build_object('path','src/lib/capabilities/policy.ts','sha256',definition.canonical_policy_source_sha256),
        'vocabularySource',pg_catalog.jsonb_build_object('path','src/lib/capabilities/types.ts','sha256',definition.vocabulary_source_sha256),
        'approvedPRD',pg_catalog.jsonb_build_object('path','F_IMPLEMENTATION_PRD.md','sha256',definition.approved_prd_source_sha256));
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='portal_policy_source_observation_missing_or_drift';
  END IF;
  RETURN observed;
END;
$portal_policy_source_observation$;
REVOKE ALL ON FUNCTION nevora_tenancy.read_portal_policy_source_rows(pg_catalog.text,pg_catalog.text,pg_catalog.bpchar) FROM PUBLIC;
DO $portal_policy_source_observation_final_acl$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS function
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = function.pronamespace
    JOIN pg_catalog.pg_roles AS owner ON owner.oid = function.proowner
    JOIN pg_catalog.pg_language AS language ON language.oid = function.prolang
    WHERE namespace.nspname = 'nevora_tenancy' AND function.proname = 'read_portal_policy_source_rows' AND owner.rolname = current_user
      AND function.pronargs=3 AND function.proargtypes = '25 25 1042'::pg_catalog.oidvector AND function.prorettype = 'pg_catalog.jsonb'::pg_catalog.regtype
      AND function.prokind = 'f' AND NOT function.proretset AND NOT function.prosecdef
      AND function.provolatile = 'v' AND function.proparallel = 'u' AND NOT function.proleakproof AND NOT function.proisstrict AND function.probin IS NULL
      AND function.provariadic = 0 AND function.pronargdefaults = 0 AND function.prosupport = 0
      AND function.proargmodes IS NULL AND function.proallargtypes IS NULL AND language.lanname = 'plpgsql'
      AND function.proargnames=ARRAY['p_workspace_id','p_employee_id','p_session_token_hash']::pg_catalog.text[]
      AND (SELECT pg_catalog.count(*) FROM pg_catalog.pg_proc AS overload
        WHERE overload.pronamespace=function.pronamespace AND overload.proname=function.proname)=1
      AND function.proconfig = ARRAY['search_path=pg_catalog']::pg_catalog.text[]
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.aclexplode(COALESCE(function.proacl,
        pg_catalog.acldefault('f', function.proowner))) AS privilege WHERE privilege.grantee<>function.proowner OR privilege.privilege_type<>'EXECUTE' OR privilege.is_grantable)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_policy_source_observation_acl_invalid';
  END IF;
END;
$portal_policy_source_observation_final_acl$;
COMMIT;
