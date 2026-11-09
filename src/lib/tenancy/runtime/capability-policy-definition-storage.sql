-- Empty private source-definition storage; automatic application installation is not wired.
-- Installation/use is restricted to authorized isolated fictional verification until full F10 gates pass.
-- Empty private technical policy definitions and workspace installation bindings.
-- No revision1, default permission, role, grant, seed, eligibility, proof, policy or activation.
-- Exact retained source bytes/digests are coherence evidence, NOT installer/reviewer authentication
-- or proof that the currently executing application matches them. Independent approved source,
-- native catalog/owner/ACL installation and current protected-reader bindings remain mandatory.
-- Canonical policy evaluation remains the source-defined evaluateCapability; JSON below is a
-- closed source-bundle manifest, not an alternate executable permission/rule language.
-- Definitions are append-only. Existing references are never rewritten; no lifecycle/retention
-- clock or destructive disposition is introduced. Installation epoch is an explicit positive
-- int8 optimistic writer generation, not a credential or proof authority.
-- An older backup can restore an older definition/head/counter. Recovery must reconcile approved
-- high-water/permanent revocations or fence/invalidate before traffic; this artifact cannot do so.
-- Future writer lock order: shared catalog fence, workspace, counter, definition, installation.
-- It must prelock that complete set before UPDATE acquires the installation tuple. A trigger
-- cannot retroactively fix an actor-first/multi-workspace lock order. No writer exists here.
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
DO $capability_policy_prerequisites$
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
    WHERE relation.relnamespace = schema_oid AND relation.relname IN
      ('capability_policy_definition','workspace_capability_policy_installation')) THEN
    RAISE EXCEPTION USING ERRCODE = '42P07', MESSAGE = 'capability_policy_already_installed';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS function
    WHERE function.pronamespace = schema_oid AND function.proname = 'guard_capability_policy_storage') THEN
    RAISE EXCEPTION USING ERRCODE = '42723', MESSAGE = 'capability_policy_guard_already_installed';
  END IF;
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
END;
$capability_policy_prerequisites$;
CREATE TABLE nevora_tenancy.capability_policy_definition (
  policy_id pg_catalog.text COLLATE pg_catalog."C" NOT NULL,
  revision pg_catalog.int8 NOT NULL CHECK (revision > 0::pg_catalog.int8),
  definition pg_catalog.jsonb NOT NULL,
  canonical_policy_source pg_catalog.bytea NOT NULL,
  canonical_policy_source_sha256 pg_catalog.text COLLATE pg_catalog."C" NOT NULL,
  vocabulary_source pg_catalog.bytea NOT NULL,
  vocabulary_source_sha256 pg_catalog.text COLLATE pg_catalog."C" NOT NULL,
  approved_prd_source pg_catalog.bytea NOT NULL,
  approved_prd_source_sha256 pg_catalog.text COLLATE pg_catalog."C" NOT NULL,
  PRIMARY KEY (policy_id,revision),
  CHECK (canonical_policy_source_sha256 = pg_catalog.encode(pg_catalog.sha256(canonical_policy_source),'hex')),
  CHECK (vocabulary_source_sha256 = pg_catalog.encode(pg_catalog.sha256(vocabulary_source),'hex')),
  CHECK (approved_prd_source_sha256 = pg_catalog.encode(pg_catalog.sha256(approved_prd_source),'hex')),
  CHECK (pg_catalog.octet_length(pg_catalog.convert_from(canonical_policy_source,'UTF8')) > 0),
  CHECK (pg_catalog.octet_length(pg_catalog.convert_from(vocabulary_source,'UTF8')) > 0),
  CHECK (pg_catalog.octet_length(pg_catalog.convert_from(approved_prd_source,'UTF8')) > 0),
  CHECK (definition = pg_catalog.jsonb_build_object(
    'format','NEVORA_CAPABILITY_SOURCE_BUNDLE_V1', 'policyId',policy_id, 'revision',revision::pg_catalog.text,
    'canonicalPolicySource',pg_catalog.jsonb_build_object('path','src/lib/capabilities/policy.ts','sha256',canonical_policy_source_sha256),
    'vocabularySource',pg_catalog.jsonb_build_object('path','src/lib/capabilities/types.ts','sha256',vocabulary_source_sha256),
    'approvedPRD',pg_catalog.jsonb_build_object('path','F_IMPLEMENTATION_PRD.md','sha256',approved_prd_source_sha256)
  ))
);
CREATE TABLE nevora_tenancy.workspace_capability_policy_installation (
  workspace_id pg_catalog.text PRIMARY KEY REFERENCES public.workspaces(id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  workspace_incarnation pg_catalog.int8 NOT NULL CHECK (workspace_incarnation > 0::pg_catalog.int8),
  installation_epoch pg_catalog.int8 NOT NULL CHECK (installation_epoch > 0::pg_catalog.int8),
  policy_id pg_catalog.text COLLATE pg_catalog."C" NOT NULL,
  policy_revision pg_catalog.int8 NOT NULL CHECK (policy_revision > 0::pg_catalog.int8),
  FOREIGN KEY (workspace_id) REFERENCES nevora_tenancy.workspace_incarnation_counter(workspace_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT,
  FOREIGN KEY (policy_id,policy_revision) REFERENCES nevora_tenancy.capability_policy_definition(policy_id,revision)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);
CREATE FUNCTION nevora_tenancy.guard_capability_policy_storage()
RETURNS pg_catalog.trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $capability_policy_guard$
DECLARE
  retained_workspace pg_catalog.text;
  retained_incarnation pg_catalog.int8;
  retained_policy pg_catalog.text;
BEGIN
  IF TG_TABLE_SCHEMA IS DISTINCT FROM 'nevora_tenancy' OR TG_TABLE_NAME NOT IN
    ('capability_policy_definition','workspace_capability_policy_installation') THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'capability_policy_guard_route_invalid';
  END IF;
  IF TG_OP = 'TRUNCATE' THEN
    IF TG_LEVEL IS DISTINCT FROM 'STATEMENT' THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'capability_policy_guard_route_invalid';
    END IF;
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'capability_policy_truncate_forbidden';
  END IF;
  IF TG_LEVEL IS DISTINCT FROM 'ROW' OR TG_OP NOT IN ('INSERT','UPDATE','DELETE') THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'capability_policy_guard_route_invalid';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'capability_policy_delete_forbidden';
  END IF;
  IF TG_TABLE_NAME = 'capability_policy_definition' THEN
    IF TG_OP = 'UPDATE' THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'capability_policy_definition_immutable';
    END IF;
    RETURN NEW;
  END IF;
  IF pg_catalog.current_setting('transaction_isolation') IS DISTINCT FROM 'read committed' THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'capability_policy_writer_isolation_required';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF pg_catalog.convert_to(NEW.workspace_id,'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.workspace_id,'UTF8')
      OR pg_catalog.convert_to(NEW.policy_id,'UTF8') IS DISTINCT FROM pg_catalog.convert_to(OLD.policy_id,'UTF8') THEN
      RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'capability_policy_installation_identity_immutable';
    END IF;
    IF NEW.installation_epoch IS NULL OR OLD.installation_epoch IS NULL
      OR NEW.installation_epoch <= OLD.installation_epoch
      OR NEW.workspace_incarnation IS NULL OR NEW.workspace_incarnation < OLD.workspace_incarnation
      OR NEW.policy_revision IS NULL OR NEW.policy_revision < OLD.policy_revision THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'capability_policy_generation_not_monotone';
    END IF;
  END IF;
  SELECT workspace.id INTO retained_workspace FROM public.workspaces AS workspace
    WHERE workspace.id OPERATOR(pg_catalog.=) NEW.workspace_id
      AND pg_catalog.convert_to(workspace.id,'UTF8') = pg_catalog.convert_to(NEW.workspace_id,'UTF8') FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'capability_policy_workspace_missing';
  END IF;
  SELECT counter.incarnation INTO retained_incarnation FROM nevora_tenancy.workspace_incarnation_counter AS counter
    WHERE counter.workspace_id OPERATOR(pg_catalog.=) NEW.workspace_id
      AND pg_catalog.convert_to(counter.workspace_id,'UTF8') = pg_catalog.convert_to(NEW.workspace_id,'UTF8') FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'capability_policy_counter_missing';
  END IF;
  -- Separate fresh equality after any waited locks. The counter has no composite key;
  -- no new key/ALTER or fake (workspace_id,incarnation) FK is manufactured.
  IF NOT EXISTS (SELECT 1 FROM nevora_tenancy.workspace_incarnation_counter AS counter
    WHERE counter.workspace_id OPERATOR(pg_catalog.=) NEW.workspace_id
      AND pg_catalog.convert_to(counter.workspace_id,'UTF8') = pg_catalog.convert_to(NEW.workspace_id,'UTF8')
      AND counter.incarnation IS NOT DISTINCT FROM NEW.workspace_incarnation) THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'capability_policy_incarnation_mismatch';
  END IF;
  SELECT definition.policy_id INTO retained_policy FROM nevora_tenancy.capability_policy_definition AS definition
    WHERE definition.policy_id OPERATOR(pg_catalog.=) NEW.policy_id
      AND pg_catalog.convert_to(definition.policy_id,'UTF8') = pg_catalog.convert_to(NEW.policy_id,'UTF8')
      AND definition.revision OPERATOR(pg_catalog.=) NEW.policy_revision FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'capability_policy_definition_missing';
  END IF;
  RETURN NEW;
END;
$capability_policy_guard$;
CREATE TRIGGER capability_policy_definition_row_guard
BEFORE INSERT OR UPDATE OR DELETE ON nevora_tenancy.capability_policy_definition
FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.guard_capability_policy_storage();
CREATE TRIGGER capability_policy_definition_truncate_guard
BEFORE TRUNCATE ON nevora_tenancy.capability_policy_definition
FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.guard_capability_policy_storage();
CREATE TRIGGER workspace_capability_policy_installation_row_guard
BEFORE INSERT OR UPDATE OR DELETE ON nevora_tenancy.workspace_capability_policy_installation
FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.guard_capability_policy_storage();
CREATE TRIGGER workspace_capability_policy_installation_truncate_guard
BEFORE TRUNCATE ON nevora_tenancy.workspace_capability_policy_installation
FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.guard_capability_policy_storage();
ALTER TABLE nevora_tenancy.capability_policy_definition ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.capability_policy_definition FORCE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.workspace_capability_policy_installation ENABLE ROW LEVEL SECURITY;
ALTER TABLE nevora_tenancy.workspace_capability_policy_installation FORCE ROW LEVEL SECURITY;
REVOKE ALL ON SCHEMA nevora_tenancy FROM PUBLIC;
REVOKE ALL ON TABLE nevora_tenancy.capability_policy_definition, nevora_tenancy.workspace_capability_policy_installation FROM PUBLIC;
REVOKE ALL ON FUNCTION nevora_tenancy.guard_capability_policy_storage() FROM PUBLIC;
DO $capability_policy_acl$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_namespace AS namespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(namespace.nspacl,
      pg_catalog.acldefault('n',namespace.nspowner))) AS privilege
    WHERE namespace.nspname = 'nevora_tenancy' AND privilege.grantee <> namespace.nspowner)
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_class AS relation
      JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(relation.relacl,
        pg_catalog.acldefault('r',relation.relowner))) AS privilege
      WHERE namespace.nspname = 'nevora_tenancy' AND relation.relname IN
        ('capability_policy_definition','workspace_capability_policy_installation') AND privilege.grantee <> relation.relowner)
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_class AS relation
      JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      JOIN pg_catalog.pg_attribute AS attribute ON attribute.attrelid = relation.oid
      CROSS JOIN LATERAL pg_catalog.aclexplode(attribute.attacl) AS privilege
      WHERE namespace.nspname = 'nevora_tenancy' AND relation.relname IN
        ('capability_policy_definition','workspace_capability_policy_installation') AND attribute.attnum > 0
        AND NOT attribute.attisdropped AND privilege.grantee <> relation.relowner)
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS function
      JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = function.pronamespace
      CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(function.proacl,
        pg_catalog.acldefault('f',function.proowner))) AS privilege
      WHERE namespace.nspname = 'nevora_tenancy' AND function.proname = 'guard_capability_policy_storage'
        AND function.pronargs = 0 AND privilege.grantee <> function.proowner) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'capability_policy_acl_invalid';
  END IF;
END;
$capability_policy_acl$;
COMMIT;
