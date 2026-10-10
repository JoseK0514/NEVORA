-- UNUSED SOURCE CANDIDATE ONLY. No installation, native/test/compiler/QA or authority claim.
-- read_portal_installed_policy(text) is a fixed scoped INVOKER observation, not a proof,
-- policy interpreter, credential verifier, executing-code attestation or grant constructor.
-- Caller owns one ReadCommitted transaction and takes the shared catalog fence first.
-- No direct APP/WORKER invocation/grants, RLS policies, helper enrollment, seeds or defaults.
-- Private forced-RLS zero-policy tables give no nonsuper/nobypass owner read/lock access.
-- Future access/owner/root/body/ACL/dependency and current executing-source bindings are root gates.
-- Order is workspace -> counter -> immutable definition -> installation, all FOR SHARE.
-- The unlocked installation read selects only the definition identity; it is not accepted data.
-- Joint Portal order must remain workspace -> employee -> credential -> counter -> definition
-- -> installation -> portal/session/LIVE/admin. A separate integrator-owned adapter must take
-- workspace/employee/credential first, then this helper (workspace/counter relocks), before
-- Portal generation rows. Neither this helper before the complete old kernel nor the complete
-- old kernel before this helper establishes that order. Existing kernel is unchanged.
-- Policy-only writers must prelock workspace/counter -> all immutable definitions -> head
-- before UPDATE. Joint employment/credential/grant/generation writers must additionally prelock
-- complete affected employee and existing credential sets before counter, in fixed byte order;
-- raw tuple-first writers can deadlock. Missing heads deny; row locks do not protect absent
-- row phantoms. No automatic retry/reselection, missing-row insertion or epoch/revision1 default.
-- Old backups can roll back these controls. Approved high-water/revocation reconciliation or
-- fenced invalidation before traffic remains separate. Native syntax/version behavior is pending.
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
DO $portal_installed_policy_prerequisites$
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
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS function
    WHERE function.pronamespace = schema_oid AND function.proname = 'read_portal_installed_policy') THEN
    RAISE EXCEPTION USING ERRCODE = '42723', MESSAGE = 'portal_installed_policy_already_installed';
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
$portal_installed_policy_prerequisites$;
CREATE FUNCTION nevora_tenancy.read_portal_installed_policy(p_workspace_id pg_catalog.text)
RETURNS pg_catalog.jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $portal_installed_policy_observation$
DECLARE
  selected_policy_id pg_catalog.text;
  selected_revision pg_catalog.int8;
  selected_incarnation pg_catalog.int8;
  selected_epoch pg_catalog.int8;
  observed pg_catalog.jsonb;
BEGIN
  IF pg_catalog.current_setting('transaction_isolation') IS DISTINCT FROM 'read committed' THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_installed_policy_isolation_required';
  END IF;
  PERFORM workspace.id FROM public.workspaces AS workspace
    WHERE workspace.id OPERATOR(pg_catalog.=) p_workspace_id
      AND pg_catalog.convert_to(workspace.id,'UTF8') = pg_catalog.convert_to(p_workspace_id,'UTF8') FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_installed_policy_workspace_missing';
  END IF;
  PERFORM counter.workspace_id FROM nevora_tenancy.workspace_incarnation_counter AS counter
    WHERE counter.workspace_id OPERATOR(pg_catalog.=) p_workspace_id
      AND pg_catalog.convert_to(counter.workspace_id,'UTF8') = pg_catalog.convert_to(p_workspace_id,'UTF8') FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_installed_policy_counter_missing';
  END IF;
  -- Unlocked current head identity solely chooses the immutable definition lock.
  SELECT installation.policy_id,installation.policy_revision,installation.workspace_incarnation,installation.installation_epoch
    INTO selected_policy_id,selected_revision,selected_incarnation,selected_epoch
    FROM nevora_tenancy.workspace_capability_policy_installation AS installation
    WHERE installation.workspace_id OPERATOR(pg_catalog.=) p_workspace_id
      AND pg_catalog.convert_to(installation.workspace_id,'UTF8') = pg_catalog.convert_to(p_workspace_id,'UTF8');
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_installed_policy_installation_missing';
  END IF;
  PERFORM definition.policy_id FROM nevora_tenancy.capability_policy_definition AS definition
    WHERE definition.policy_id OPERATOR(pg_catalog.=) selected_policy_id
      AND pg_catalog.convert_to(definition.policy_id,'UTF8') = pg_catalog.convert_to(selected_policy_id,'UTF8')
      AND definition.revision OPERATOR(pg_catalog.=) selected_revision FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_installed_policy_definition_missing';
  END IF;
  PERFORM installation.workspace_id FROM nevora_tenancy.workspace_capability_policy_installation AS installation
    WHERE installation.workspace_id OPERATOR(pg_catalog.=) p_workspace_id
      AND pg_catalog.convert_to(installation.workspace_id,'UTF8') = pg_catalog.convert_to(p_workspace_id,'UTF8') FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_installed_policy_installation_missing';
  END IF;
  -- Separate fresh query after all waited locks, never accept the selection snapshot.
  SELECT pg_catalog.jsonb_build_object(
    'kind','PORTAL_INSTALLED_POLICY_OBSERVATION_V1',
    'workspaceId',workspace.id,
    'workspaceIncarnation',counter.incarnation::pg_catalog.text,
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
    'verification','SOURCE_OBSERVATION_NOT_PROOF_OR_EXECUTING_SOURCE_AUTHENTICATION')
    INTO observed
    FROM public.workspaces AS workspace
    JOIN nevora_tenancy.workspace_incarnation_counter AS counter
      ON counter.workspace_id OPERATOR(pg_catalog.=) workspace.id
        AND pg_catalog.convert_to(counter.workspace_id,'UTF8') = pg_catalog.convert_to(workspace.id,'UTF8')
    JOIN nevora_tenancy.workspace_capability_policy_installation AS installation
      ON installation.workspace_id OPERATOR(pg_catalog.=) workspace.id
        AND pg_catalog.convert_to(installation.workspace_id,'UTF8') = pg_catalog.convert_to(workspace.id,'UTF8')
    JOIN nevora_tenancy.capability_policy_definition AS definition
      ON definition.policy_id OPERATOR(pg_catalog.=) installation.policy_id
        AND pg_catalog.convert_to(definition.policy_id,'UTF8') = pg_catalog.convert_to(installation.policy_id,'UTF8')
        AND definition.revision OPERATOR(pg_catalog.=) installation.policy_revision
    WHERE workspace.id OPERATOR(pg_catalog.=) p_workspace_id
      AND pg_catalog.convert_to(workspace.id,'UTF8') = pg_catalog.convert_to(p_workspace_id,'UTF8')
      AND installation.workspace_incarnation IS NOT DISTINCT FROM counter.incarnation
      AND installation.workspace_incarnation IS NOT DISTINCT FROM selected_incarnation
      AND installation.installation_epoch IS NOT DISTINCT FROM selected_epoch
      AND installation.policy_revision IS NOT DISTINCT FROM selected_revision
      AND pg_catalog.convert_to(installation.policy_id,'UTF8') IS NOT DISTINCT FROM pg_catalog.convert_to(selected_policy_id,'UTF8')
      AND counter.incarnation > 0::pg_catalog.int8 AND installation.installation_epoch > 0::pg_catalog.int8 AND definition.revision > 0::pg_catalog.int8
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
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_installed_policy_source_drift';
  END IF;
  RETURN observed;
END;
$portal_installed_policy_observation$;
REVOKE ALL ON FUNCTION nevora_tenancy.read_portal_installed_policy(pg_catalog.text) FROM PUBLIC;
DO $portal_installed_policy_final_acl$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS function
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = function.pronamespace
    JOIN pg_catalog.pg_roles AS owner ON owner.oid = function.proowner
    JOIN pg_catalog.pg_language AS language ON language.oid = function.prolang
    WHERE namespace.nspname = 'nevora_tenancy' AND function.proname = 'read_portal_installed_policy'
      AND owner.rolname = current_user AND function.proargtypes = '25'::pg_catalog.oidvector
      AND function.prorettype = 'pg_catalog.jsonb'::pg_catalog.regtype AND NOT function.proretset
      AND function.prokind = 'f' AND NOT function.prosecdef AND function.provolatile = 'v' AND function.proparallel = 'u'
      AND NOT function.proisstrict AND NOT function.proleakproof AND function.prosupport = 0 AND function.probin IS NULL
      AND function.provariadic = 0 AND function.pronargdefaults = 0 AND function.proargmodes IS NULL
      AND function.proallargtypes IS NULL AND language.lanname = 'plpgsql'
      AND function.proconfig = ARRAY['search_path=pg_catalog']::pg_catalog.text[]
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.aclexplode(COALESCE(function.proacl,pg_catalog.acldefault('f',function.proowner))) AS privilege
        WHERE privilege.grantee <> function.proowner)) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'portal_installed_policy_acl_invalid';
  END IF;
END;
$portal_installed_policy_final_acl$;
COMMIT;
