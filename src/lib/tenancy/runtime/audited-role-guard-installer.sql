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
DO $helper_installer_prerequisites$
DECLARE schema_oid pg_catalog.oid; installer_oid pg_catalog.oid;
BEGIN
  -- Separately authorized owned-idle connection, exact reviewed source and
  -- cooperative privileged-writer fencing remain required. These observations
  -- grant no installer identity, review authority or customer capability.
  SELECT r.oid INTO installer_oid FROM pg_catalog.pg_roles AS r WHERE r.rolname=current_user;
  SELECT n.oid INTO schema_oid FROM pg_catalog.pg_namespace AS n WHERE n.nspname='nevora_tenancy';
  IF NOT FOUND THEN RAISE EXCEPTION 'helper_installer_schema_missing' USING ERRCODE='3F000'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_namespace AS n WHERE n.oid=schema_oid AND n.nspowner=installer_oid) THEN
    RAISE EXCEPTION 'helper_installer_schema_not_owned' USING ERRCODE='42501';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class AS c
    WHERE c.relnamespace=schema_oid AND c.relname='runtime_role_binding' AND c.relkind='r' AND c.relpersistence='p'
      AND c.relowner=installer_oid AND NOT c.relrowsecurity AND NOT c.relforcerowsecurity
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute AS a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
        AND (a.atthasdef OR a.attidentity<>'' OR a.attgenerated<>''))
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint AS co WHERE co.conrelid=c.oid AND
        (NOT co.convalidated OR co.condeferrable OR co.condeferred OR NOT COALESCE((pg_catalog.to_jsonb(co)->>'conenforced')::pg_catalog.bool,true)))
      AND (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(co.conname,co.contype::text,pg_catalog.to_jsonb(co.conkey),pg_catalog.pg_get_constraintdef(co.oid,false)) ORDER BY co.conname COLLATE pg_catalog."C")
        FROM pg_catalog.pg_constraint AS co WHERE co.conrelid=c.oid AND co.contype<>'n')='[["runtime_role_binding_kind_check","c",[1],"CHECK ((kind = ANY (ARRAY[''APP''::text, ''WORKER''::text])))"],["runtime_role_binding_pkey","p",[1],"PRIMARY KEY (kind)"],["runtime_role_binding_role_name_key","u",[2],"UNIQUE (role_name)"],["runtime_role_binding_role_oid_key","u",[3],"UNIQUE (role_oid)"]]'::pg_catalog.jsonb

      AND c.reloptions IS NULL AND NOT c.relispartition
      AND c.relam=(SELECT am.oid FROM pg_catalog.pg_am AS am WHERE am.amname='heap' AND am.amtype='t')
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute AS a LEFT JOIN pg_catalog.pg_type AS type ON type.oid=a.atttypid
        WHERE a.attrelid=c.oid AND a.attnum>0 AND (a.attisdropped OR a.atttypmod<>-1 OR a.attcollation<>type.typcollation
          OR a.attndims<>CASE WHEN c.relname='runtime_role_binding' AND a.attname='pg_settings_rules' THEN 1 ELSE 0 END OR a.attoptions IS NOT NULL))
      AND (SELECT pg_catalog.count(*) FROM pg_catalog.pg_index AS i WHERE i.indrelid=c.oid)
        =(SELECT pg_catalog.count(*) FROM pg_catalog.pg_constraint AS co WHERE co.conrelid=c.oid AND co.contype IN ('p','u'))
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint AS co WHERE co.conrelid=c.oid AND co.contype IN ('p','u')
        AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_index AS i
          JOIN pg_catalog.pg_class AS index_relation ON index_relation.oid=i.indexrelid
          JOIN pg_catalog.pg_am AS am ON am.oid=index_relation.relam
          WHERE i.indexrelid=co.conindid AND i.indrelid=c.oid
            AND index_relation.relnamespace=schema_oid AND index_relation.relname=co.conname
            AND index_relation.relowner=installer_oid AND index_relation.relkind='i' AND index_relation.relpersistence='p'
            AND index_relation.reloptions IS NULL AND am.amname='btree' AND am.amtype='i'
            AND i.indisunique AND i.indisprimary=(co.contype='p') AND i.indisvalid AND i.indisready AND i.indislive AND i.indimmediate
            AND NOT i.indnullsnotdistinct AND i.indexprs IS NULL AND i.indpred IS NULL
            AND i.indnkeyatts=pg_catalog.cardinality(co.conkey) AND i.indnatts=i.indnkeyatts
            AND (SELECT pg_catalog.array_agg(key.attnum ORDER BY key.ordinality)
              FROM pg_catalog.unnest(i.indkey) WITH ORDINALITY AS key(attnum,ordinality))=co.conkey
            AND NOT EXISTS (SELECT 1 FROM pg_catalog.unnest(co.conkey) WITH ORDINALITY AS key(attnum,ordinality)
              JOIN pg_catalog.pg_attribute AS a ON a.attrelid=c.oid AND a.attnum=key.attnum
              WHERE i.indcollation[key.ordinality-1]<>a.attcollation OR i.indoption[key.ordinality-1]<>0
                OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_opclass AS opclass
                  JOIN pg_catalog.pg_namespace AS opclass_schema ON opclass_schema.oid=opclass.opcnamespace
                  WHERE opclass.oid=i.indclass[key.ordinality-1] AND opclass.opcdefault AND opclass.opcintype=a.atttypid
                    AND opclass.opcmethod=am.oid AND opclass_schema.nspname='pg_catalog'))))
      AND c.relnatts=6
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger AS t WHERE t.tgrelid=c.oid)
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_rewrite AS w WHERE w.ev_class=c.oid)
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_inherits AS inheritance WHERE inheritance.inhrelid=c.oid OR inheritance.inhparent=c.oid)
      AND (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(a.attname::text,a.atttypid::text,a.attnotnull) ORDER BY a.attnum)
        FROM pg_catalog.pg_attribute AS a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped)='[["kind","25",true],["role_name","19",true],["role_oid","26",true],["pg_settings_oid","26",true],["pg_settings_definition","25",true],["pg_settings_rules","1009",true]]'::pg_catalog.jsonb) THEN
    RAISE EXCEPTION 'helper_installer_storage_invalid:runtime_role_binding' USING ERRCODE='55000';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class AS c
    WHERE c.relnamespace=schema_oid AND c.relname='audited_helper_capability' AND c.relkind='r' AND c.relpersistence='p'
      AND c.relowner=installer_oid AND NOT c.relrowsecurity AND NOT c.relforcerowsecurity
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute AS a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
        AND (a.atthasdef OR a.attidentity<>'' OR a.attgenerated<>''))
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint AS co WHERE co.conrelid=c.oid AND
        (NOT co.convalidated OR co.condeferrable OR co.condeferred OR NOT COALESCE((pg_catalog.to_jsonb(co)->>'conenforced')::pg_catalog.bool,true)))
      AND (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(co.conname,co.contype::text,pg_catalog.to_jsonb(co.conkey),pg_catalog.pg_get_constraintdef(co.oid,false)) ORDER BY co.conname COLLATE pg_catalog."C")
        FROM pg_catalog.pg_constraint AS co WHERE co.conrelid=c.oid AND co.contype<>'n')='[["audited_helper_capability_check","c",[2,4,9],"CHECK ((((route_kind = ''DIRECT_CALL''::text) AND (route_oid = (0)::oid) AND (route_observation IS NULL)) OR ((route_kind = ''TRIGGER_ROUTE''::text) AND (route_oid <> (0)::oid) AND (route_observation IS NOT NULL) AND (jsonb_typeof(route_observation) = ''object''::text))))"],["audited_helper_capability_dependencies_check","c",[8],"CHECK ((jsonb_typeof(dependencies) = ''array''::text))"],["audited_helper_capability_function_observation_check","c",[5],"CHECK ((jsonb_typeof(function_observation) = ''object''::text))"],["audited_helper_capability_function_oid_check","c",[3],"CHECK ((function_oid <> (0)::oid))"],["audited_helper_capability_owner_acl_observation_check","c",[7],"CHECK ((jsonb_typeof(owner_acl_observation) = ''object''::text))"],["audited_helper_capability_owner_lock_columns_check","c",[12],"CHECK ((jsonb_typeof(owner_lock_columns) = ''array''::text))"],["audited_helper_capability_owner_observation_check","c",[6],"CHECK ((jsonb_typeof(owner_observation) = ''object''::text))"],["audited_helper_capability_pkey","p",[1,2,3,4],"PRIMARY KEY (runtime_kind, route_kind, function_oid, route_oid)"],["audited_helper_capability_review_reference_check","c",[10],"CHECK ((review_reference <> ''''::text))"],["audited_helper_capability_review_source_sha256_check","c",[11],"CHECK ((review_source_sha256 ~ ''^[a-f0-9]{64}$''::text))"],["audited_helper_capability_route_kind_check","c",[2],"CHECK (((route_kind COLLATE \"C\") = ANY (ARRAY[''DIRECT_CALL''::text, ''TRIGGER_ROUTE''::text])))"],["audited_helper_capability_runtime_kind_check","c",[1],"CHECK (((runtime_kind COLLATE \"C\") = ANY (ARRAY[''APP''::text, ''WORKER''::text])))"]]'::pg_catalog.jsonb

      AND c.reloptions IS NULL AND NOT c.relispartition
      AND c.relam=(SELECT am.oid FROM pg_catalog.pg_am AS am WHERE am.amname='heap' AND am.amtype='t')
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_attribute AS a LEFT JOIN pg_catalog.pg_type AS type ON type.oid=a.atttypid
        WHERE a.attrelid=c.oid AND a.attnum>0 AND (a.attisdropped OR a.atttypmod<>-1 OR a.attcollation<>type.typcollation
          OR a.attndims<>CASE WHEN c.relname='runtime_role_binding' AND a.attname='pg_settings_rules' THEN 1 ELSE 0 END OR a.attoptions IS NOT NULL))
      AND (SELECT pg_catalog.count(*) FROM pg_catalog.pg_index AS i WHERE i.indrelid=c.oid)
        =(SELECT pg_catalog.count(*) FROM pg_catalog.pg_constraint AS co WHERE co.conrelid=c.oid AND co.contype IN ('p','u'))
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_constraint AS co WHERE co.conrelid=c.oid AND co.contype IN ('p','u')
        AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_index AS i
          JOIN pg_catalog.pg_class AS index_relation ON index_relation.oid=i.indexrelid
          JOIN pg_catalog.pg_am AS am ON am.oid=index_relation.relam
          WHERE i.indexrelid=co.conindid AND i.indrelid=c.oid
            AND index_relation.relnamespace=schema_oid AND index_relation.relname=co.conname
            AND index_relation.relowner=installer_oid AND index_relation.relkind='i' AND index_relation.relpersistence='p'
            AND index_relation.reloptions IS NULL AND am.amname='btree' AND am.amtype='i'
            AND i.indisunique AND i.indisprimary=(co.contype='p') AND i.indisvalid AND i.indisready AND i.indislive AND i.indimmediate
            AND NOT i.indnullsnotdistinct AND i.indexprs IS NULL AND i.indpred IS NULL
            AND i.indnkeyatts=pg_catalog.cardinality(co.conkey) AND i.indnatts=i.indnkeyatts
            AND (SELECT pg_catalog.array_agg(key.attnum ORDER BY key.ordinality)
              FROM pg_catalog.unnest(i.indkey) WITH ORDINALITY AS key(attnum,ordinality))=co.conkey
            AND NOT EXISTS (SELECT 1 FROM pg_catalog.unnest(co.conkey) WITH ORDINALITY AS key(attnum,ordinality)
              JOIN pg_catalog.pg_attribute AS a ON a.attrelid=c.oid AND a.attnum=key.attnum
              WHERE i.indcollation[key.ordinality-1]<>a.attcollation OR i.indoption[key.ordinality-1]<>0
                OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_opclass AS opclass
                  JOIN pg_catalog.pg_namespace AS opclass_schema ON opclass_schema.oid=opclass.opcnamespace
                  WHERE opclass.oid=i.indclass[key.ordinality-1] AND opclass.opcdefault AND opclass.opcintype=a.atttypid
                    AND opclass.opcmethod=am.oid AND opclass_schema.nspname='pg_catalog'))))
      AND c.relnatts=12
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger AS t WHERE t.tgrelid=c.oid)
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_rewrite AS w WHERE w.ev_class=c.oid)
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_inherits AS inheritance WHERE inheritance.inhrelid=c.oid OR inheritance.inhparent=c.oid)
      AND (SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(a.attname::text,a.atttypid::text,a.attnotnull) ORDER BY a.attnum)
        FROM pg_catalog.pg_attribute AS a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped)='[["runtime_kind","25",true],["route_kind","25",true],["function_oid","26",true],["route_oid","26",true],["function_observation","3802",true],["owner_observation","3802",true],["owner_acl_observation","3802",true],["dependencies","3802",true],["route_observation","3802",false],["review_reference","25",true],["review_source_sha256","25",true],["owner_lock_columns","3802",true]]'::pg_catalog.jsonb) THEN
    RAISE EXCEPTION 'helper_installer_storage_invalid:audited_helper_capability' USING ERRCODE='55000';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_namespace AS n
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(n.nspacl,pg_catalog.acldefault('n',n.nspowner))) AS acl
    WHERE n.oid=schema_oid AND (acl.grantee<>installer_oid OR acl.grantor<>installer_oid OR acl.is_grantable))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_class AS c
      CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,pg_catalog.acldefault('r',c.relowner))) AS acl
      WHERE c.relnamespace=schema_oid AND c.relname IN ('runtime_role_binding','audited_helper_capability')
        AND (acl.grantee<>installer_oid OR acl.grantor<>installer_oid OR acl.is_grantable))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_class AS c JOIN pg_catalog.pg_attribute AS a ON a.attrelid=c.oid
      CROSS JOIN LATERAL pg_catalog.aclexplode(a.attacl) AS acl
      WHERE c.relnamespace=schema_oid AND c.relname IN ('runtime_role_binding','audited_helper_capability') AND a.attnum>0 AND NOT a.attisdropped
        AND (acl.grantee<>installer_oid OR acl.grantor<>installer_oid OR acl.is_grantable)) THEN
    RAISE EXCEPTION 'helper_installer_control_acl_invalid' USING ERRCODE='55000';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS p WHERE p.pronamespace=schema_oid AND p.proname='assert_audited_runtime_role') THEN
    RAISE EXCEPTION 'helper_installer_duplicate_function' USING ERRCODE='42723';
  END IF;
END;
$helper_installer_prerequisites$;

-- Bounded opt-in external audited guard. No installation/seed/grant is implicit.
-- Source observations/digests do not authenticate a reviewer/operator or approve
-- inner helper authorization, tenant effects, source completeness or least privilege.
-- The external call retains original LOGIN/current-user equality. It is not the
-- future definer-context caller validator and denies invocation inside a definer.
-- Matching native catalogs cannot prove PL/pgSQL callgraph completeness. Matching
-- owner records model inherent ALTER/regrant of exactly the registered functions;
-- trusted-change fencing remains OPEN, including changes after this snapshot.
-- The installer must retain current/final source, route, ACL and privilege review.
-- Marker-delimited CTEs are inert read-only native observations for an explicitly
-- owned installer transaction: full source/OID provisional rows first, native
-- profiles next, consistent owner updates last. Invalid interim rows cannot pass.
-- No proof, business permissions, RLS, PG17/Neon or full F10 result is implied.
CREATE FUNCTION nevora_tenancy.assert_audited_runtime_role(requested_kind pg_catalog.text)
RETURNS pg_catalog.bool
LANGUAGE sql
VOLATILE
SECURITY INVOKER
SET search_path = pg_catalog
AS $role_guard$
WITH caller AS (
  SELECT r.oid, r.rolname, b.pg_settings_oid,
    b.pg_settings_definition, b.pg_settings_rules
  FROM pg_catalog.pg_roles AS r
  JOIN nevora_tenancy.runtime_role_binding AS b
    ON b.role_oid = r.oid AND b.role_name = r.rolname
  WHERE requested_kind COLLATE pg_catalog."C" IN ('APP', 'WORKER')
    AND b.kind COLLATE pg_catalog."C" = requested_kind COLLATE pg_catalog."C"
    AND r.rolname = session_user
    AND session_user = current_user
    AND pg_catalog.current_setting('role') = 'none'
    -- Session authorization is mutable by a privileged connection. Its apparent
    -- identity is not evidence of the original login recorded at backend start.
    AND EXISTS (SELECT 1 FROM pg_catalog.pg_stat_activity AS activity
      WHERE activity.pid = pg_catalog.pg_backend_pid() AND activity.usesysid = r.oid)
    AND r.rolcanlogin
    AND NOT r.rolsuper AND NOT r.rolbypassrls
    AND NOT r.rolcreaterole AND NOT r.rolcreatedb
    AND NOT r.rolreplication AND NOT r.rolinherit
), approved_settings AS (
  -- Trusted installer must review the native catalog source before binding it.
  -- Matching stored observations alone never confer operator/source authority.
  SELECT c.oid FROM caller AS r
  JOIN pg_catalog.pg_class AS c ON c.oid = r.pg_settings_oid
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  WHERE n.nspname = 'pg_catalog' AND c.relkind = 'v'
    AND c.oid = 'pg_catalog.pg_settings'::pg_catalog.regclass
    AND pg_catalog.pg_get_viewdef(c.oid, false) COLLATE pg_catalog."C"
      = r.pg_settings_definition COLLATE pg_catalog."C"
    AND ARRAY(SELECT pg_catalog.pg_get_ruledef(w.oid, false)
      FROM pg_catalog.pg_rewrite AS w WHERE w.ev_class = c.oid
      ORDER BY w.rulename COLLATE pg_catalog."C") COLLATE pg_catalog."C"
      = r.pg_settings_rules COLLATE pg_catalog."C"
), controlled_catalog AS (
  SELECT c.oid AS binding_oid, capability.oid AS capability_oid, n.oid AS schema_oid,
    pg_catalog.to_regprocedure('nevora_tenancy.assert_audited_runtime_role(text)')::pg_catalog.oid AS helper_oid
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
  JOIN pg_catalog.pg_class AS capability ON capability.relnamespace=n.oid AND capability.relname='audited_helper_capability'
    AND capability.relkind='r' AND capability.relpersistence='p'
    AND NOT capability.relrowsecurity AND NOT capability.relforcerowsecurity
  WHERE n.nspname = 'nevora_tenancy' AND c.relname = 'runtime_role_binding'
    AND c.relkind = 'r' AND c.relpersistence = 'p'
    AND NOT c.relrowsecurity AND NOT c.relforcerowsecurity
), object_acls AS (
  -- NULL ACLs have no explicit grant options. Owner authority is denied below.
  SELECT d.datacl AS acl FROM pg_catalog.pg_database AS d
  UNION ALL SELECT n.nspacl FROM pg_catalog.pg_namespace AS n
  UNION ALL SELECT c.relacl FROM pg_catalog.pg_class AS c
  UNION ALL SELECT a.attacl FROM pg_catalog.pg_attribute AS a
  UNION ALL SELECT p.proacl FROM pg_catalog.pg_proc AS p
  UNION ALL SELECT t.typacl FROM pg_catalog.pg_type AS t
  UNION ALL SELECT l.lanacl FROM pg_catalog.pg_language AS l
  UNION ALL SELECT t.spcacl FROM pg_catalog.pg_tablespace AS t
  UNION ALL SELECT f.fdwacl FROM pg_catalog.pg_foreign_data_wrapper AS f
  UNION ALL SELECT s.srvacl FROM pg_catalog.pg_foreign_server AS s
  UNION ALL SELECT d.defaclacl FROM pg_catalog.pg_default_acl AS d
  UNION ALL SELECT l.lomacl FROM pg_catalog.pg_largeobject_metadata AS l
),
-- AUDITED_NATIVE_CTES_BEGIN
audit_contracts(name,route_kind,argument_types,return_type,runtime_kinds) AS (
  VALUES
    ('resolve_portal','DIRECT_CALL','25 25'::pg_catalog.oidvector::pg_catalog.oid[],3802::pg_catalog.oid,ARRAY['APP']::pg_catalog.text[]),
    ('resolve_clocker','DIRECT_CALL','25 25'::pg_catalog.oidvector::pg_catalog.oid[],3802::pg_catalog.oid,ARRAY['APP']::pg_catalog.text[]),
    ('resolve_calendar','DIRECT_CALL','25'::pg_catalog.oidvector::pg_catalog.oid[],3802::pg_catalog.oid,ARRAY['APP']::pg_catalog.text[]),
    ('resolve_worker','DIRECT_CALL','25 25 25 25 25 25'::pg_catalog.oidvector::pg_catalog.oid[],3802::pg_catalog.oid,ARRAY['WORKER']::pg_catalog.text[]),
    ('resolve_provisioner','DIRECT_CALL','25 25 25 25 25 25 25 25'::pg_catalog.oidvector::pg_catalog.oid[],3802::pg_catalog.oid,ARRAY['APP']::pg_catalog.text[]),
    ('lock_and_assert_current_proof','DIRECT_CALL','3802'::pg_catalog.oidvector::pg_catalog.oid[],16::pg_catalog.oid,ARRAY['APP','WORKER']::pg_catalog.text[]),
    ('assert_current_proof','DIRECT_CALL','3802'::pg_catalog.oidvector::pg_catalog.oid[],16::pg_catalog.oid,ARRAY['APP','WORKER']::pg_catalog.text[]),
    ('source_write_fence','TRIGGER_ROUTE',''::pg_catalog.oidvector::pg_catalog.oid[],2279::pg_catalog.oid,ARRAY['APP','WORKER']::pg_catalog.text[]),
    ('source_identity_guard','TRIGGER_ROUTE',''::pg_catalog.oidvector::pg_catalog.oid[],2279::pg_catalog.oid,ARRAY['APP','WORKER']::pg_catalog.text[]),
    ('historical_pair_guard','TRIGGER_ROUTE',''::pg_catalog.oidvector::pg_catalog.oid[],2279::pg_catalog.oid,ARRAY['APP','WORKER']::pg_catalog.text[])
), audit_runtime_bindings AS (
  SELECT b.kind,b.role_oid,b.role_name FROM nevora_tenancy.runtime_role_binding AS b
  JOIN pg_catalog.pg_roles AS r ON r.oid=b.role_oid AND r.rolname=b.role_name
  WHERE b.kind COLLATE pg_catalog."C" IN ('APP','WORKER') AND r.rolcanlogin
    AND NOT r.rolsuper AND NOT r.rolbypassrls AND NOT r.rolcreaterole
    AND NOT r.rolcreatedb AND NOT r.rolreplication AND NOT r.rolinherit
    AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members AS m
      WHERE m.member=r.oid OR m.roleid=r.oid OR m.grantor=r.oid)
    AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_shdepend AS d
      WHERE d.refclassid='pg_catalog.pg_authid'::pg_catalog.regclass AND d.refobjid=r.oid AND d.deptype='o')
), audit_settings AS (
  SELECT DISTINCT c.oid FROM nevora_tenancy.runtime_role_binding AS b
  JOIN pg_catalog.pg_class AS c ON c.oid=b.pg_settings_oid
  JOIN pg_catalog.pg_namespace AS n ON n.oid=c.relnamespace
  WHERE c.oid='pg_catalog.pg_settings'::pg_catalog.regclass AND c.relkind='v' AND n.nspname='pg_catalog'
    AND pg_catalog.pg_get_viewdef(c.oid,false) COLLATE pg_catalog."C"=b.pg_settings_definition COLLATE pg_catalog."C"
    AND ARRAY(SELECT pg_catalog.pg_get_ruledef(w.oid,false) FROM pg_catalog.pg_rewrite AS w
      WHERE w.ev_class=c.oid ORDER BY w.rulename COLLATE pg_catalog."C") COLLATE pg_catalog."C"
      =b.pg_settings_rules COLLATE pg_catalog."C"
), audit_functions AS (
  SELECT p.oid,p.proowner AS owner_oid,p.pronamespace AS schema_oid,n.nspname AS schema_name,
    p.prosecdef AS security_definer,
    pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(pg_catalog.pg_get_functiondef(p.oid), 'UTF8')), 'hex') AS source_sha256,
    pg_catalog.jsonb_build_object(
      'oid',p.oid::text,'schemaOid',n.oid::text,'schema',n.nspname::text,'name',p.proname::text,
      'identityArguments',pg_catalog.pg_get_function_identity_arguments(p.oid),
      'definition',pg_catalog.pg_get_functiondef(p.oid),'ownerOid',p.proowner::text,
      'languageOid',l.oid::text,'language',l.lanname::text,'returnTypeOid',p.prorettype::text,
      'argumentTypeOids',pg_catalog.to_jsonb(ARRAY(SELECT arg::text FROM pg_catalog.unnest(p.proargtypes::pg_catalog.oid[]) WITH ORDINALITY AS args(arg,position) ORDER BY position)),
      'kind',p.prokind::text,'volatility',p.provolatile::text,'securityDefiner',p.prosecdef,
      'leakproof',p.proleakproof,'parallel',p.proparallel::text,'variadicTypeOid',p.provariadic::text,
      'defaultArgumentCount',p.pronargdefaults,'supportFunctionOid',p.prosupport::pg_catalog.oid::text,
      'configuration',pg_catalog.to_jsonb(p.proconfig),'returnsSet',p.proretset,
      'acl',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'grantorOid',a.grantor::text,'granteeOid',a.grantee::text,'privilege',a.privilege_type,'isGrantable',a.is_grantable)
        ORDER BY a.grantee,a.grantor,a.privilege_type COLLATE pg_catalog."C",a.is_grantable)
        FROM pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f'::pg_catalog."char",p.proowner))) AS a),'[]'::pg_catalog.jsonb)
    ) AS observation
  FROM pg_catalog.pg_proc AS p JOIN pg_catalog.pg_namespace AS n ON n.oid=p.pronamespace
  JOIN pg_catalog.pg_language AS l ON l.oid=p.prolang
  WHERE p.prokind='f'
), audit_routes AS (
  SELECT t.oid,t.tgfoid AS function_oid,t.tgrelid AS relation_oid,
    pg_catalog.jsonb_build_object(
      'oid',t.oid::text,'relationOid',c.oid::text,'relationSchemaOid',n.oid::text,
      'relationSchema',n.nspname::text,'relationName',c.relname::text,'relationKind',c.relkind::text,
      'relationPersistence',c.relpersistence::text,'relationOwnerOid',c.relowner::text,
      'relationRls',c.relrowsecurity,'relationForceRls',c.relforcerowsecurity,
      'functionOid',t.tgfoid::text,'name',t.tgname::text,'definition',pg_catalog.pg_get_triggerdef(t.oid,false),
      'enabled',t.tgenabled::text,'internal',t.tgisinternal,'type',t.tgtype,
      'parentOid',t.tgparentid::text,'constraintOid',t.tgconstraint::text,
      'constraintRelationOid',t.tgconstrrelid::text,'constraintIndexOid',t.tgconstrindid::text,
      'deferrable',t.tgdeferrable,'initiallyDeferred',t.tginitdeferred,
      'argumentCount',t.tgnargs,'argumentsHex',pg_catalog.encode(t.tgargs,'hex'),
      'attributeNumbers',pg_catalog.to_jsonb(ARRAY(SELECT att::int FROM pg_catalog.unnest(t.tgattr::pg_catalog.int2[]) WITH ORDINALITY AS attrs(att,position) ORDER BY position)),
      'qualifier',pg_catalog.pg_get_expr(t.tgqual,t.tgrelid,false),
      'oldTransitionTable',t.tgoldtable::text,'newTransitionTable',t.tgnewtable::text
    ) AS observation
  FROM pg_catalog.pg_trigger AS t JOIN pg_catalog.pg_class AS c ON c.oid=t.tgrelid
  JOIN pg_catalog.pg_namespace AS n ON n.oid=c.relnamespace
), audit_lock_columns AS (
  -- A native source match is not proof of immutability or approval. Installing a
  -- nonempty list needs the separately retained source-completeness review.
  SELECT c.oid AS relation_oid,a.attnum AS attribute_number,
    pg_catalog.jsonb_build_object('relationOid',c.oid::text,'relationSchemaOid',n.oid::text,
      'schema',n.nspname::text,'name',c.relname::text,'column',a.attname::text,
      'attributeNumber',a.attnum,'typeOid',a.atttypid::text,
      'sourceObservation',pg_catalog.jsonb_build_object(
        'kind',c.relkind::text,'persistence',c.relpersistence::text,'ownerOid',c.relowner::text,
        'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,
        'columns',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
          'number',col.attnum,'name',col.attname::text,'typeOid',col.atttypid::text,'typeModifier',col.atttypmod,
          'notNull',col.attnotnull,'identity',col.attidentity::text,'generated',col.attgenerated::text,
          'default',pg_catalog.pg_get_expr(def.adbin,def.adrelid,false)) ORDER BY col.attnum)
          FROM pg_catalog.pg_attribute AS col LEFT JOIN pg_catalog.pg_attrdef AS def ON def.adrelid=col.attrelid AND def.adnum=col.attnum
          WHERE col.attrelid=c.oid AND col.attnum>0 AND NOT col.attisdropped),'[]'::pg_catalog.jsonb),
        'constraints',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
          'oid',co.oid::text,'name',co.conname::text,'definition',pg_catalog.pg_get_constraintdef(co.oid,false),
          'validated',co.convalidated,'deferrable',co.condeferrable,'deferred',co.condeferred,
          'enforced',pg_catalog.to_jsonb(co)->'conenforced') ORDER BY co.oid)
          FROM pg_catalog.pg_constraint AS co WHERE co.conrelid=c.oid),'[]'::pg_catalog.jsonb),
        'policies',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
          'oid',policy.oid::text,'name',policy.polname::text,'command',policy.polcmd::text,
          'permissive',policy.polpermissive,'roleOids',pg_catalog.to_jsonb(ARRAY(
            SELECT target.role_oid::text FROM pg_catalog.unnest(policy.polroles) AS target(role_oid) ORDER BY target.role_oid)),
          'using',pg_catalog.pg_get_expr(policy.polqual,policy.polrelid,false),
          'withCheck',pg_catalog.pg_get_expr(policy.polwithcheck,policy.polrelid,false)) ORDER BY policy.oid)
          FROM pg_catalog.pg_policy AS policy WHERE policy.polrelid=c.oid),'[]'::pg_catalog.jsonb),
        'triggers',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
          'route',route.observation,'function',f.observation) ORDER BY route.oid)
          FROM audit_routes AS route JOIN audit_functions AS f ON f.oid=route.function_oid WHERE route.relation_oid=c.oid),'[]'::pg_catalog.jsonb),
        'rules',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
          'oid',w.oid::text,'enabled',w.ev_enabled::text,'definition',pg_catalog.pg_get_ruledef(w.oid,false)) ORDER BY w.oid)
          FROM pg_catalog.pg_rewrite AS w WHERE w.ev_class=c.oid),'[]'::pg_catalog.jsonb))) AS observation
  FROM pg_catalog.pg_class AS c JOIN pg_catalog.pg_namespace AS n ON n.oid=c.relnamespace
  JOIN pg_catalog.pg_attribute AS a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
  WHERE c.relkind IN ('r','p') AND c.relpersistence='p' AND n.nspname<>'pg_catalog'
    AND NOT (n.nspname='nevora_tenancy' AND c.relname IN ('runtime_role_binding','audited_helper_capability'))
), audit_function_current AS (
  -- Stage one is intentionally independent of owner/ACL profile observations.
  -- It permits source-bound provisional rows inside the installer's transaction
  -- to bootstrap actual owner closure. Such rows still fail audit_capabilities.
  SELECT c.runtime_kind,c.route_kind,c.function_oid,c.route_oid,f.owner_oid
  FROM nevora_tenancy.audited_helper_capability AS c
  JOIN audit_functions AS f ON f.oid=c.function_oid
  JOIN pg_catalog.pg_proc AS p ON p.oid=f.oid
  JOIN audit_contracts AS contract ON p.proname=contract.name AND c.route_kind=contract.route_kind
    AND c.runtime_kind=ANY(contract.runtime_kinds)
  JOIN pg_catalog.pg_roles AS owner ON owner.oid=f.owner_oid
  JOIN audit_runtime_bindings AS binding ON binding.kind=c.runtime_kind
  LEFT JOIN audit_routes AS route ON route.oid=c.route_oid AND route.function_oid=c.function_oid
  WHERE f.schema_name='nevora_tenancy'
    AND c.runtime_kind COLLATE pg_catalog."C" IN ('APP','WORKER')
    AND c.route_kind COLLATE pg_catalog."C" IN ('DIRECT_CALL','TRIGGER_ROUTE') AND c.function_observation = f.observation
    AND c.review_source_sha256 = f.source_sha256 AND c.review_reference<>''
    -- Both vectors preserve the native oidvector zero lower bound; no text
    -- identity spelling or SQL array-dimension mismatch substitutes for types.
    AND p.proargtypes::pg_catalog.oid[] = contract.argument_types
    AND p.prorettype = contract.return_type AND p.prokind='f' AND NOT p.proretset
    AND p.provolatile='v' AND p.prosecdef AND NOT p.proleakproof AND p.proparallel='u'
    AND p.provariadic=0 AND p.pronargdefaults=0 AND p.prosupport=0
    AND f.observation->>'language' IN ('sql','plpgsql')
    AND (p.proconfig=ARRAY['search_path=pg_catalog']::pg_catalog.text[] OR
      p.proconfig=ARRAY['search_path=pg_catalog, nevora_tenancy']::pg_catalog.text[])
    AND NOT owner.rolcanlogin AND NOT owner.rolsuper AND NOT owner.rolbypassrls
    AND NOT owner.rolcreaterole AND NOT owner.rolcreatedb AND NOT owner.rolreplication AND NOT owner.rolinherit
    AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members AS m
      WHERE m.member=owner.oid OR m.roleid=owner.oid OR m.grantor=owner.oid)
    AND ((c.route_kind='DIRECT_CALL' AND c.route_oid=0 AND c.route_observation IS NULL
      AND pg_catalog.has_function_privilege(binding.role_oid,p.oid,'EXECUTE')
      AND pg_catalog.has_schema_privilege(binding.role_oid,p.pronamespace,'USAGE')) OR
      (c.route_kind='TRIGGER_ROUTE' AND c.route_oid<>0 AND c.route_observation IS NOT NULL
       AND c.route_observation = route.observation AND (route.observation->>'internal')::pg_catalog.bool=false
       AND route.observation->>'enabled' IN ('O','A','R')
       AND (pg_catalog.has_table_privilege(binding.role_oid,route.relation_oid,'INSERT,UPDATE,DELETE')
         OR pg_catalog.has_any_column_privilege(binding.role_oid,route.relation_oid,'INSERT,UPDATE'))))
    AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f'::pg_catalog."char",p.proowner))) AS acl
      WHERE acl.is_grantable OR acl.privilege_type<>'EXECUTE' OR (acl.grantee<>p.proowner AND NOT (
        c.route_kind='DIRECT_CALL' AND EXISTS (SELECT 1 FROM audit_runtime_bindings AS binding
          WHERE binding.role_oid = acl.grantee AND binding.kind=ANY(contract.runtime_kinds) AND EXISTS (
            SELECT 1 FROM nevora_tenancy.audited_helper_capability AS named
            WHERE named.function_oid=c.function_oid AND named.runtime_kind COLLATE pg_catalog."C"=binding.kind COLLATE pg_catalog."C"
              AND named.route_kind='DIRECT_CALL' AND named.route_oid=0 AND named.route_observation IS NULL
              AND named.function_observation=f.observation AND named.review_source_sha256=f.source_sha256
              AND named.review_reference<>''))))
    )
), audit_owner_ids AS (
  -- Capture raw actual owners even with empty/invalid registrations or unsafe
  -- flags. Observation does not approve them; safe is evaluated separately.
  SELECT DISTINCT f.owner_oid AS oid FROM audit_functions AS f
  JOIN pg_catalog.pg_proc AS p ON p.oid=f.oid
  JOIN audit_contracts AS contract ON p.proname=contract.name
    AND p.proargtypes::pg_catalog.oid[]=contract.argument_types AND p.prorettype=contract.return_type
  WHERE f.schema_name='nevora_tenancy'
), audit_owner_native_acls AS (
  -- Native defaults matter: an absent explicit ACL is not an absent privilege.
  SELECT 'DATABASE'::text AS class,d.oid AS object_oid,0::int AS sub_id,a.*
    FROM pg_catalog.pg_database AS d CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(d.datacl,pg_catalog.acldefault('d'::pg_catalog."char",d.datdba))) AS a
  UNION ALL SELECT 'SCHEMA',n.oid,0,a.* FROM pg_catalog.pg_namespace AS n CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(n.nspacl,pg_catalog.acldefault('n'::pg_catalog."char",n.nspowner))) AS a
  UNION ALL SELECT 'RELATION',c.oid,0,a.* FROM pg_catalog.pg_class AS c CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,pg_catalog.acldefault(CASE WHEN c.relkind='S' THEN 's'::pg_catalog."char" ELSE 'r'::pg_catalog."char" END,c.relowner))) AS a
  UNION ALL SELECT 'COLUMN',c.oid,col.attnum,a.* FROM pg_catalog.pg_attribute AS col JOIN pg_catalog.pg_class AS c ON c.oid=col.attrelid CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(col.attacl,pg_catalog.acldefault('c'::pg_catalog."char",c.relowner))) AS a WHERE col.attnum>0 AND NOT col.attisdropped
  UNION ALL SELECT 'FUNCTION',p.oid,0,a.* FROM pg_catalog.pg_proc AS p CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f'::pg_catalog."char",p.proowner))) AS a
  UNION ALL SELECT 'TYPE',t.oid,0,a.* FROM pg_catalog.pg_type AS t CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(t.typacl,pg_catalog.acldefault('T'::pg_catalog."char",t.typowner))) AS a
  UNION ALL SELECT 'LANGUAGE',l.oid,0,a.* FROM pg_catalog.pg_language AS l CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(l.lanacl,pg_catalog.acldefault('l'::pg_catalog."char",l.lanowner))) AS a
  UNION ALL SELECT 'TABLESPACE',t.oid,0,a.* FROM pg_catalog.pg_tablespace AS t CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(t.spcacl,pg_catalog.acldefault('t'::pg_catalog."char",t.spcowner))) AS a
  UNION ALL SELECT 'FDW',f.oid,0,a.* FROM pg_catalog.pg_foreign_data_wrapper AS f CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(f.fdwacl,pg_catalog.acldefault('F'::pg_catalog."char",f.fdwowner))) AS a
  UNION ALL SELECT 'SERVER',s.oid,0,a.* FROM pg_catalog.pg_foreign_server AS s CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(s.srvacl,pg_catalog.acldefault('S'::pg_catalog."char",s.srvowner))) AS a
  UNION ALL SELECT 'DEFAULT_ACL',d.oid,0,a.* FROM pg_catalog.pg_default_acl AS d CROSS JOIN LATERAL pg_catalog.aclexplode(d.defaclacl) AS a
  UNION ALL SELECT 'LARGE_OBJECT',l.oid,0,a.* FROM pg_catalog.pg_largeobject_metadata AS l CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(l.lomacl,pg_catalog.acldefault('L'::pg_catalog."char",l.lomowner))) AS a
  UNION ALL SELECT 'PARAMETER',p.oid,0,a.* FROM pg_catalog.pg_parameter_acl AS p CROSS JOIN LATERAL pg_catalog.aclexplode(p.paracl) AS a
), audit_owner_checks AS (
  SELECT owner.oid,
    pg_catalog.has_database_privilege(owner.oid,pg_catalog.current_database(),'CREATE') AS database_create,
    pg_catalog.has_database_privilege(owner.oid,pg_catalog.current_database(),'TEMPORARY') AS database_temporary,
    EXISTS (SELECT 1 FROM pg_catalog.pg_namespace AS n WHERE pg_catalog.has_schema_privilege(owner.oid,n.oid,'CREATE')) AS schema_create,
    EXISTS (SELECT 1 FROM pg_catalog.pg_tablespace AS t WHERE pg_catalog.has_tablespace_privilege(owner.oid,t.oid,'CREATE')) AS tablespace_create,
    -- Only matching explicitly reviewed row-lock column UPDATE can be excepted.
    -- All table-level writes, INSERT/REFERENCES columns and other mutations deny.
    EXISTS (SELECT 1 FROM pg_catalog.pg_class AS c
      WHERE c.relkind IN ('r','p','v','m','f','S') AND (
        (c.relkind='S' AND pg_catalog.has_sequence_privilege(owner.oid,c.oid,'USAGE,UPDATE')) OR
        (c.relkind<>'S' AND (pg_catalog.has_table_privilege(owner.oid,c.oid,'INSERT,DELETE,REFERENCES,TRUNCATE,TRIGGER,MAINTAIN')
          OR pg_catalog.has_any_column_privilege(owner.oid,c.oid,'INSERT,REFERENCES')
          OR (c.oid NOT IN (SELECT settings.oid FROM audit_settings AS settings) AND (
            pg_catalog.has_table_privilege(owner.oid,c.oid,'UPDATE') OR EXISTS (
              SELECT 1 FROM pg_catalog.pg_attribute AS a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
                AND pg_catalog.has_column_privilege(owner.oid,c.oid,a.attnum,'UPDATE') AND NOT EXISTS (
                  SELECT 1 FROM nevora_tenancy.audited_helper_capability AS registered
                  JOIN audit_function_current AS current ON current.function_oid=registered.function_oid
                    AND current.runtime_kind=registered.runtime_kind AND current.route_kind=registered.route_kind AND current.route_oid=registered.route_oid
                  CROSS JOIN LATERAL pg_catalog.jsonb_array_elements(registered.owner_lock_columns) AS declared(value)
                  JOIN audit_lock_columns AS lock_column ON lock_column.relation_oid=c.oid AND lock_column.attribute_number=a.attnum
                  WHERE current.owner_oid=owner.oid AND lock_column.observation = declared.value))))))
      )) OR EXISTS (SELECT 1 FROM audit_owner_native_acls AS acl WHERE acl.class='LARGE_OBJECT'
        AND acl.grantee IN (0::pg_catalog.oid,owner.oid) AND acl.privilege_type='UPDATE') AS destructive_or_trigger_or_maintain,
    EXISTS (SELECT 1 FROM pg_catalog.pg_class AS c JOIN pg_catalog.pg_namespace AS n ON n.oid=c.relnamespace
      WHERE n.nspname='nevora_tenancy' AND c.relname IN ('runtime_role_binding','audited_helper_capability') AND (
        pg_catalog.has_table_privilege(owner.oid,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
        OR pg_catalog.has_any_column_privilege(owner.oid,c.oid,'INSERT,UPDATE,REFERENCES'))) AS control_registry_mutation,
    EXISTS (SELECT 1 FROM pg_catalog.pg_parameter_acl AS p CROSS JOIN LATERAL pg_catalog.aclexplode(p.paracl) AS a
      WHERE a.grantee IN (0::pg_catalog.oid,owner.oid)) AS parameter_grants,
    EXISTS (SELECT 1 FROM pg_catalog.pg_foreign_data_wrapper AS f WHERE pg_catalog.has_foreign_data_wrapper_privilege(owner.oid,f.oid,'USAGE'))
      OR EXISTS (SELECT 1 FROM pg_catalog.pg_foreign_server AS s WHERE pg_catalog.has_server_privilege(owner.oid,s.oid,'USAGE')) AS foreign_data_usage,
    EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS p JOIN pg_catalog.pg_namespace AS n ON n.oid=p.pronamespace
      WHERE n.nspname='pg_catalog' AND pg_catalog.has_function_privilege(owner.oid,p.oid,'EXECUTE') AND NOT EXISTS (
        SELECT 1 FROM pg_catalog.aclexplode(COALESCE((SELECT i.initprivs FROM pg_catalog.pg_init_privs AS i
          WHERE i.classoid='pg_catalog.pg_proc'::pg_catalog.regclass AND i.objoid=p.oid AND i.objsubid=0),
          pg_catalog.acldefault('f'::pg_catalog."char",p.proowner))) AS initial
        WHERE initial.grantee=0::pg_catalog.oid AND initial.privilege_type='EXECUTE')) AS new_privileged_catalog_calls,
    EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS p
      WHERE p.prosecdef AND pg_catalog.has_function_privilege(owner.oid,p.oid,'EXECUTE')
        AND pg_catalog.has_schema_privilege(owner.oid,p.pronamespace,'USAGE')
        AND NOT EXISTS (SELECT 1 FROM audit_function_current AS current WHERE current.function_oid=p.oid)) AS unreviewed_callable_definers
  FROM audit_owner_ids AS ids JOIN pg_catalog.pg_roles AS owner ON owner.oid=ids.oid
), audit_owners AS (
  SELECT owner.oid,
    pg_catalog.jsonb_build_object('oid',owner.oid::text,'name',owner.rolname::text,'canLogin',owner.rolcanlogin,
      'superuser',owner.rolsuper,'bypassRls',owner.rolbypassrls,'createRole',owner.rolcreaterole,
      'createDb',owner.rolcreatedb,'replication',owner.rolreplication,'inherit',owner.rolinherit,
      'memberships',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'roleOid',m.roleid::text,'memberOid',m.member::text,'grantorOid',m.grantor::text,
        'admin',m.admin_option,'inherit',m.inherit_option,'set',m.set_option) ORDER BY m.roleid,m.member,m.grantor)
        FROM pg_catalog.pg_auth_members AS m WHERE m.member=owner.oid OR m.roleid=owner.oid OR m.grantor=owner.oid),'[]'::pg_catalog.jsonb),
      'ownership',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'databaseOid',d.dbid::text,'classOid',d.classid::text,'objectOid',d.objid::text,'subId',d.objsubid,'dependencyType',d.deptype::text)
        ORDER BY d.dbid,d.classid,d.objid,d.objsubid,d.deptype)
        FROM pg_catalog.pg_shdepend AS d WHERE d.refclassid='pg_catalog.pg_authid'::pg_catalog.regclass AND d.refobjid=owner.oid AND d.deptype='o'),'[]'::pg_catalog.jsonb)
    ) AS observation,
    pg_catalog.jsonb_build_object('aclRows',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'class',a.class,'objectOid',a.object_oid::text,'subId',a.sub_id,'grantorOid',a.grantor::text,
      'granteeOid',a.grantee::text,'privilege',a.privilege_type,'isGrantable',a.is_grantable)
      ORDER BY a.class COLLATE pg_catalog."C",a.object_oid,a.sub_id,a.grantee,a.grantor,a.privilege_type COLLATE pg_catalog."C",a.is_grantable)
      FROM audit_owner_native_acls AS a WHERE a.grantee IN (0::pg_catalog.oid,owner.oid)),'[]'::pg_catalog.jsonb),
      'effectiveChecks',pg_catalog.jsonb_build_object('databaseCreate',checks.database_create,'databaseTemporary',checks.database_temporary,
        'schemaCreate',checks.schema_create,'tablespaceCreate',checks.tablespace_create,
        'destructiveOrTriggerOrMaintain',checks.destructive_or_trigger_or_maintain,
        'controlRegistryMutation',checks.control_registry_mutation,'parameterGrants',checks.parameter_grants,
        'foreignDataUsage',checks.foreign_data_usage,'newPrivilegedCatalogCalls',checks.new_privileged_catalog_calls,
        'unreviewedCallableDefiners',checks.unreviewed_callable_definers)) AS acl_observation,
    NOT (checks.database_create OR checks.database_temporary OR checks.schema_create OR checks.tablespace_create
      OR checks.destructive_or_trigger_or_maintain OR checks.control_registry_mutation OR checks.parameter_grants
      OR checks.foreign_data_usage OR checks.new_privileged_catalog_calls OR checks.unreviewed_callable_definers)
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_shdepend AS d
        WHERE d.refclassid='pg_catalog.pg_authid'::pg_catalog.regclass AND d.refobjid=owner.oid AND d.deptype='o' AND NOT (
          d.dbid=(SELECT db.oid FROM pg_catalog.pg_database AS db WHERE db.datname=pg_catalog.current_database())
          AND d.classid='pg_catalog.pg_proc'::pg_catalog.regclass AND d.objsubid=0
          AND EXISTS (SELECT 1 FROM audit_function_current AS current WHERE current.function_oid=d.objid AND current.owner_oid=owner.oid)))
      AND NOT EXISTS (SELECT 1 FROM audit_owner_native_acls AS a WHERE a.grantee IN (0::pg_catalog.oid,owner.oid) AND a.is_grantable) AS safe
  FROM audit_owner_ids AS ids JOIN pg_catalog.pg_roles AS owner ON owner.oid=ids.oid
  JOIN audit_owner_checks AS checks ON checks.oid=owner.oid
), audit_owner_consistency AS (
  SELECT current.owner_oid FROM nevora_tenancy.audited_helper_capability AS c
  JOIN audit_function_current AS current ON current.runtime_kind=c.runtime_kind AND current.route_kind=c.route_kind
    AND current.function_oid=c.function_oid AND current.route_oid=c.route_oid
  GROUP BY current.owner_oid
  HAVING COUNT(DISTINCT c.owner_observation)=1 AND COUNT(DISTINCT c.owner_acl_observation)=1
    AND COUNT(DISTINCT c.owner_lock_columns)=1
), -- ORIGINAL_RUNTIME_TERMINAL_CTE_BEGIN
audit_original_login_dependency_current AS (
  -- One fixed dependency-only invoker, not a callable runtime/root exception.
  -- Native equality binds observed source; it is not reviewer authentication.
  SELECT f.oid AS function_oid,f.observation
  FROM audit_functions AS f JOIN pg_catalog.pg_proc AS p ON p.oid=f.oid
  WHERE f.schema_name='nevora_tenancy' AND p.proname='require_original_runtime_login_kind'
    AND p.oid=pg_catalog.to_regprocedure('nevora_tenancy.require_original_runtime_login_kind()')::pg_catalog.oid
    AND p.pronargs=0 AND p.proargtypes::pg_catalog.oid[]=''::pg_catalog.oidvector::pg_catalog.oid[]
    AND p.proallargtypes IS NULL AND p.proargmodes IS NULL AND p.proargnames IS NULL
    AND p.prorettype=25::pg_catalog.oid AND p.prokind='f' AND NOT p.proretset
    AND p.provolatile='v' AND NOT p.prosecdef AND NOT p.proleakproof AND p.proparallel='u'
    AND p.provariadic=0 AND p.pronargdefaults=0 AND p.prosupport=0
    AND f.observation->>'language'='plpgsql'
    AND p.proconfig=ARRAY['search_path=pg_catalog']::pg_catalog.text[]
    -- Default PUBLIC EXECUTE is an actual ACL entry and must deny. Extra named
    -- grantees need a safe consistent native owner and an exact declaring root.
    -- This stage uses pre-capability native profiles, never the full capability stage.
    AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f'::pg_catalog."char",p.proowner))) AS acl
      WHERE acl.is_grantable OR acl.privilege_type<>'EXECUTE' OR (acl.grantee<>p.proowner AND NOT EXISTS (
        SELECT 1 FROM audit_owners AS allowed_owner
        JOIN audit_owner_consistency AS consistent ON consistent.owner_oid=allowed_owner.oid
        JOIN audit_function_current AS declared_root ON declared_root.owner_oid=allowed_owner.oid
        JOIN nevora_tenancy.audited_helper_capability AS registered
          ON registered.runtime_kind=declared_root.runtime_kind AND registered.route_kind=declared_root.route_kind
          AND registered.function_oid=declared_root.function_oid AND registered.route_oid=declared_root.route_oid
        WHERE allowed_owner.oid=acl.grantee AND allowed_owner.safe
          AND registered.owner_observation=allowed_owner.observation
          AND registered.owner_acl_observation=allowed_owner.acl_observation
          AND EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(registered.dependencies) AS retained(value)
            WHERE retained.value=f.observation)
      ))
    )
    -- The terminal never admits a native edge back to itself or another custom
    -- function. This supplement is not a PL/pgSQL callgraph proof: string bodies
    -- and dynamic calls still require exact installer/callsite source review.
    AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_depend AS edge
      WHERE edge.classid='pg_catalog.pg_proc'::pg_catalog.regclass AND edge.objid=p.oid
        AND edge.refclassid='pg_catalog.pg_proc'::pg_catalog.regclass
        AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS target
          JOIN pg_catalog.pg_namespace AS target_schema ON target_schema.oid=target.pronamespace
          WHERE target.oid=edge.refobjid AND target_schema.nspname='pg_catalog')
    )
),
-- ORIGINAL_RUNTIME_TERMINAL_CTE_END
-- PORTAL_SOURCE_DEPENDENCY_CTES_BEGIN
-- Fixed dependency-only two-node DAG. This native profile is not an employee
-- permit, helper/source approval, policy installer or Portal proof implementation.
audit_portal_source_contracts(name,return_type,body_sha256) AS (
  VALUES
    ('read_portal_source_rows',3802::pg_catalog.oid,'7a83fca46be2a8f5c877ac6e5ae60328d5a454c2a974b624c6edd4ff8463b7f9'::pg_catalog.text),
    ('lock_portal_source_rows',2278::pg_catalog.oid,'6266924ebb3e4ef28875123798084447816ba96c44a8be76491a13e31fd8af77'::pg_catalog.text)
), audit_portal_source_native AS (
  SELECT f.oid AS function_oid,f.owner_oid,f.schema_oid,f.observation,contract.name
  FROM audit_functions AS f JOIN pg_catalog.pg_proc AS p ON p.oid=f.oid
  JOIN audit_portal_source_contracts AS contract ON p.proname=contract.name
  WHERE f.schema_name='nevora_tenancy'
    AND p.oid=pg_catalog.to_regprocedure('nevora_tenancy.' OPERATOR(pg_catalog.||) contract.name OPERATOR(pg_catalog.||) '(text,text,bpchar)')::pg_catalog.oid
    AND (SELECT COUNT(*) FROM pg_catalog.pg_proc AS overload WHERE overload.pronamespace=p.pronamespace AND overload.proname=p.proname)=1
    AND p.pronargs=3 AND p.proargtypes='25 25 1042'::pg_catalog.oidvector
    AND p.proargnames=ARRAY['p_workspace_id','p_employee_id','p_session_token_hash']::pg_catalog.text[]
    AND p.proallargtypes IS NULL AND p.proargmodes IS NULL
    AND p.prorettype=contract.return_type AND p.prokind='f' AND NOT p.proretset
    AND p.provolatile='v' AND NOT p.prosecdef AND NOT p.proisstrict AND NOT p.proleakproof AND p.proparallel='u'
    AND p.provariadic=0 AND p.pronargdefaults=0 AND p.prosupport=0
    -- Raw bindings keep this denial effective even when owning a helper makes
    -- the bound principal fail audit_runtime_bindings' ownership profile.
    AND NOT EXISTS (SELECT 1 FROM nevora_tenancy.runtime_role_binding AS bound_runtime
      WHERE bound_runtime.kind COLLATE pg_catalog."C" IN ('APP','WORKER') AND bound_runtime.role_oid=p.proowner)
    AND f.observation->>'language'='plpgsql'
    AND p.proconfig=ARRAY['search_path=pg_catalog']::pg_catalog.text[]
    AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex')=contract.body_sha256
    -- Native edges supplement exact reviewed body equality. PL/pgSQL string
    -- calls may have no pg_depend edge; both full descriptors remain mandatory.
    AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_depend AS edge
      WHERE edge.classid='pg_catalog.pg_proc'::pg_catalog.regclass AND edge.objid=p.oid
        AND edge.refclassid='pg_catalog.pg_proc'::pg_catalog.regclass
        AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS target
          JOIN pg_catalog.pg_namespace AS target_schema ON target_schema.oid=target.pronamespace
          WHERE target.oid=edge.refobjid AND (target_schema.nspname='pg_catalog' OR (
            contract.name='read_portal_source_rows'
            AND target.oid=pg_catalog.to_regprocedure('nevora_tenancy.lock_portal_source_rows(text,text,bpchar)')::pg_catalog.oid)))
    )
), audit_portal_source_declaration_current AS (
  -- Pre-capability owner closure only: do not make a recursive capability
  -- fixed point. Name selection never approves an absent/fictitious proof body.
  SELECT declared_root.runtime_kind,declared_root.route_kind,declared_root.route_oid,
    declared_root.function_oid AS root_function_oid,declared_root.owner_oid,
    reader.function_oid AS reader_oid,kernel.function_oid AS kernel_oid
  FROM audit_function_current AS declared_root
  JOIN pg_catalog.pg_proc AS root ON root.oid=declared_root.function_oid
  JOIN nevora_tenancy.audited_helper_capability AS registered
    ON registered.runtime_kind=declared_root.runtime_kind AND registered.route_kind=declared_root.route_kind
    AND registered.function_oid=declared_root.function_oid AND registered.route_oid=declared_root.route_oid
  JOIN audit_owners AS allowed_owner ON allowed_owner.oid=declared_root.owner_oid AND allowed_owner.safe
  JOIN audit_owner_consistency AS consistent ON consistent.owner_oid=allowed_owner.oid
  CROSS JOIN audit_portal_source_native AS reader
  CROSS JOIN audit_portal_source_native AS kernel
  WHERE declared_root.route_kind='DIRECT_CALL' AND declared_root.route_oid=0::pg_catalog.oid
    AND root.proname IN ('resolve_portal','lock_and_assert_current_proof','assert_current_proof')
    AND reader.name='read_portal_source_rows' AND kernel.name='lock_portal_source_rows'
    AND registered.owner_observation=allowed_owner.observation
    AND registered.owner_acl_observation=allowed_owner.acl_observation
    AND pg_catalog.has_function_privilege(allowed_owner.oid,reader.function_oid,'EXECUTE')
    AND pg_catalog.has_function_privilege(allowed_owner.oid,kernel.function_oid,'EXECUTE')
    AND pg_catalog.has_schema_privilege(allowed_owner.oid,reader.schema_oid,'USAGE')
    AND pg_catalog.has_schema_privilege(allowed_owner.oid,kernel.schema_oid,'USAGE')
    AND EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(registered.dependencies) AS retained(value) WHERE retained.value=reader.observation)
    AND EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(registered.dependencies) AS retained(value) WHERE retained.value=kernel.observation)
), audit_portal_source_dependency_current AS (
  SELECT declared.runtime_kind,declared.route_kind,declared.route_oid,declared.root_function_oid,
    dependency.function_oid,dependency.observation
  FROM audit_portal_source_declaration_current AS declared
  CROSS JOIN audit_portal_source_native AS dependency
  WHERE dependency.function_oid IN (declared.reader_oid,declared.kernel_oid)
    -- Both helpers reject PUBLIC, runtime/direct, unrelated or rootless owner
    -- grants and all grant options. The exact current declaring owner is bound
    -- by native safe/consistent profiles and both retained dependency capsules.
    AND NOT EXISTS (
      SELECT 1 FROM audit_portal_source_native AS member
      JOIN pg_catalog.pg_proc AS p ON p.oid=member.function_oid
      CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f'::pg_catalog."char",p.proowner))) AS acl
      WHERE member.function_oid IN (declared.reader_oid,declared.kernel_oid)
        AND (acl.is_grantable OR acl.privilege_type<>'EXECUTE'
          OR EXISTS (SELECT 1 FROM nevora_tenancy.runtime_role_binding AS bound_runtime
            WHERE bound_runtime.kind COLLATE pg_catalog."C" IN ('APP','WORKER') AND bound_runtime.role_oid=acl.grantee)
          OR (acl.grantee<>p.proowner AND NOT EXISTS (
          SELECT 1 FROM audit_portal_source_declaration_current AS permitted
          WHERE permitted.owner_oid=acl.grantee AND permitted.reader_oid=declared.reader_oid AND permitted.kernel_oid=declared.kernel_oid
        )))
    )
),
-- PORTAL_SOURCE_DEPENDENCY_CTES_END
-- PORTAL_POLICY_COMPLETE_DEPENDENCY_CTES_BEGIN
-- Fixed INVOKER chain supplement to the unchanged old Portal pair. It grants
-- no invocation, read/lock access, source approval, eligibility or proof.
-- Exact native/source observations remain subject to retained installer review,
-- caller/current/final guards and cooperative shared/exclusive catalog fences.
audit_portal_policy_contracts(name,signature,argument_types,argument_names,return_type,body_sha256) AS (
  VALUES
    ('read_portal_installed_policy','nevora_tenancy.read_portal_installed_policy(text)','25'::pg_catalog.oidvector,ARRAY['p_workspace_id']::pg_catalog.text[],3802::pg_catalog.oid,'975487315f2e091f7659d5f9aa8c89cef4d13e1685e49f4a0162f5eb9a916baa'::pg_catalog.text),
    ('lock_portal_policy_source_rows','nevora_tenancy.lock_portal_policy_source_rows(text,text,bpchar)','25 25 1042'::pg_catalog.oidvector,ARRAY['p_workspace_id','p_employee_id','p_session_token_hash']::pg_catalog.text[],2278::pg_catalog.oid,'6a25dc1ce379ce176f5995328032ad03d2a6749026d4aeafd42bfe68fb5703d1'::pg_catalog.text),
    ('read_portal_policy_source_rows','nevora_tenancy.read_portal_policy_source_rows(text,text,bpchar)','25 25 1042'::pg_catalog.oidvector,ARRAY['p_workspace_id','p_employee_id','p_session_token_hash']::pg_catalog.text[],3802::pg_catalog.oid,'536d7d6dba8a9c709c8d89a558031617189653067c9ad677a2563f15a23ba9eb'::pg_catalog.text)
), audit_portal_policy_edges(source_name,target_signature) AS (
  VALUES
    ('read_portal_policy_source_rows','nevora_tenancy.lock_portal_policy_source_rows(text,text,bpchar)'),
    ('lock_portal_policy_source_rows','nevora_tenancy.read_portal_installed_policy(text)')
), audit_portal_policy_native AS (
  SELECT f.oid AS function_oid,f.owner_oid,f.schema_oid,f.observation,contract.name
  FROM audit_functions AS f JOIN pg_catalog.pg_proc AS p ON p.oid=f.oid
  JOIN audit_portal_policy_contracts AS contract ON p.proname=contract.name
  WHERE f.schema_name='nevora_tenancy'
    AND p.oid=pg_catalog.to_regprocedure(contract.signature)::pg_catalog.oid
    AND (SELECT COUNT(*) FROM pg_catalog.pg_proc AS overload WHERE overload.pronamespace=p.pronamespace AND overload.proname=p.proname)=1
    AND p.pronargs=pg_catalog.cardinality(contract.argument_names) AND p.proargtypes=contract.argument_types
    AND p.proargnames COLLATE pg_catalog."C"=contract.argument_names COLLATE pg_catalog."C"
    AND p.proallargtypes IS NULL AND p.proargmodes IS NULL
    AND p.prorettype=contract.return_type AND p.prokind='f' AND NOT p.proretset
    AND p.provolatile='v' AND NOT p.prosecdef AND NOT p.proisstrict AND NOT p.proleakproof AND p.proparallel='u'
    AND p.provariadic=0 AND p.pronargdefaults=0 AND p.prosupport=0
    AND (f.observation->>'language') COLLATE pg_catalog."C"='plpgsql' COLLATE pg_catalog."C"
    AND p.proconfig COLLATE pg_catalog."C"=ARRAY['search_path=pg_catalog']::pg_catalog.text[] COLLATE pg_catalog."C"
    AND NOT EXISTS (SELECT 1 FROM nevora_tenancy.runtime_role_binding AS bound_runtime
      WHERE bound_runtime.kind COLLATE pg_catalog."C" IN ('APP','WORKER') AND bound_runtime.role_oid=p.proowner)
    AND pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p.prosrc,'UTF8')),'hex') COLLATE pg_catalog."C"=contract.body_sha256 COLLATE pg_catalog."C"
    -- Only the two fixed directed edges supplement pg_catalog calls. The
    -- installed-policy observer is terminal; self/back/root/unknown edges deny.
    -- String-body PL/pgSQL edges may be absent: this is not callgraph proof.
    AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_depend AS edge
      WHERE edge.classid='pg_catalog.pg_proc'::pg_catalog.regclass AND edge.objid=p.oid
        AND edge.refclassid='pg_catalog.pg_proc'::pg_catalog.regclass
        AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS target
          JOIN pg_catalog.pg_namespace AS target_schema ON target_schema.oid=target.pronamespace
          WHERE target.oid=edge.refobjid AND (target_schema.nspname='pg_catalog' OR EXISTS (
            SELECT 1 FROM audit_portal_policy_edges AS permitted
            WHERE permitted.source_name=contract.name
              AND target.oid=pg_catalog.to_regprocedure(permitted.target_signature)::pg_catalog.oid)))
    )
), audit_portal_policy_declaration_current AS (
  -- Reuse the existing pre-capability safe/consistent owner and root matcher.
  -- The old declaration requires both retained reader/kernel descriptors and
  -- their native EXECUTE/schema access; no original protection is replaced.
  SELECT original.runtime_kind,original.route_kind,original.route_oid,
    original.root_function_oid,original.owner_oid,original.reader_oid,original.kernel_oid,
    installed_policy.function_oid AS installed_policy_oid,
    joint_kernel.function_oid AS joint_kernel_oid,combined_reader.function_oid AS combined_reader_oid
  FROM audit_portal_source_declaration_current AS original
  JOIN nevora_tenancy.audited_helper_capability AS registered
    ON registered.runtime_kind=original.runtime_kind AND registered.route_kind=original.route_kind
    AND registered.function_oid=original.root_function_oid AND registered.route_oid=original.route_oid
  CROSS JOIN audit_portal_policy_native AS installed_policy
  CROSS JOIN audit_portal_policy_native AS joint_kernel
  CROSS JOIN audit_portal_policy_native AS combined_reader
  WHERE installed_policy.name='read_portal_installed_policy'
    AND joint_kernel.name='lock_portal_policy_source_rows' AND combined_reader.name='read_portal_policy_source_rows'
    AND NOT EXISTS (SELECT 1 FROM audit_portal_policy_native AS member
      WHERE NOT pg_catalog.has_function_privilege(original.owner_oid,member.function_oid,'EXECUTE')
        OR NOT pg_catalog.has_schema_privilege(original.owner_oid,member.schema_oid,'USAGE'))
    AND EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(registered.dependencies) AS retained(value)
      WHERE retained.value=installed_policy.observation)
    AND EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(registered.dependencies) AS retained(value)
      WHERE retained.value=joint_kernel.observation)
    AND EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(registered.dependencies) AS retained(value)
      WHERE retained.value=combined_reader.observation)
), audit_portal_policy_dependency_current AS (
  SELECT declared.runtime_kind,declared.route_kind,declared.route_oid,declared.root_function_oid,
    dependency.function_oid,dependency.observation
  FROM audit_portal_policy_declaration_current AS declared
  CROSS JOIN audit_portal_policy_native AS dependency
  WHERE dependency.function_oid IN (declared.installed_policy_oid,declared.joint_kernel_oid,declared.combined_reader_oid)
    -- Complete three-member native/default ACL closure, never a wildcard
    -- invocation exception. Named grantees must own an exact whole-group Portal
    -- declaration, with the old pair and safe/consistent owner profile retained.
    AND NOT EXISTS (
      SELECT 1 FROM audit_portal_policy_native AS member
      JOIN pg_catalog.pg_proc AS p ON p.oid=member.function_oid
      CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f'::pg_catalog."char",p.proowner))) AS acl
      WHERE member.function_oid IN (declared.installed_policy_oid,declared.joint_kernel_oid,declared.combined_reader_oid)
        AND (acl.is_grantable OR acl.privilege_type<>'EXECUTE'
          OR EXISTS (SELECT 1 FROM nevora_tenancy.runtime_role_binding AS bound_runtime
            WHERE bound_runtime.kind COLLATE pg_catalog."C" IN ('APP','WORKER') AND bound_runtime.role_oid=acl.grantee)
          OR (acl.grantee<>p.proowner AND NOT EXISTS (
            SELECT 1 FROM audit_portal_policy_declaration_current AS permitted
            WHERE permitted.owner_oid=acl.grantee AND permitted.reader_oid=declared.reader_oid AND permitted.kernel_oid=declared.kernel_oid
              AND permitted.installed_policy_oid=declared.installed_policy_oid
              AND permitted.joint_kernel_oid=declared.joint_kernel_oid AND permitted.combined_reader_oid=declared.combined_reader_oid
          )))
    )
),
-- PORTAL_POLICY_COMPLETE_DEPENDENCY_CTES_END
audit_capabilities AS (
  SELECT c.runtime_kind,c.route_kind,c.function_oid,c.route_oid
  FROM nevora_tenancy.audited_helper_capability AS c JOIN audit_function_current AS current
    ON current.runtime_kind=c.runtime_kind AND current.route_kind=c.route_kind AND current.function_oid=c.function_oid AND current.route_oid=c.route_oid
  JOIN audit_owners AS o ON o.oid=current.owner_oid AND o.safe
  JOIN audit_owner_consistency AS consistent ON consistent.owner_oid=o.oid
  WHERE c.owner_observation = o.observation AND c.owner_acl_observation = o.acl_observation
    AND NOT EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(c.owner_lock_columns) AS declared(value)
      WHERE NOT EXISTS (SELECT 1 FROM audit_lock_columns AS lock_column
        WHERE lock_column.observation = declared.value AND pg_catalog.has_column_privilege(o.oid,lock_column.relation_oid,lock_column.attribute_number,'UPDATE')))
    AND pg_catalog.jsonb_array_length(c.owner_lock_columns)=(SELECT COUNT(DISTINCT declared.value) FROM pg_catalog.jsonb_array_elements(c.owner_lock_columns) AS declared(value))
    AND NOT EXISTS (SELECT 1 FROM nevora_tenancy.audited_helper_capability AS sibling
      WHERE sibling.function_oid=c.function_oid AND sibling.dependencies<>c.dependencies)
    AND NOT EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(c.dependencies) AS dependency(value)
      WHERE NOT EXISTS (SELECT 1 FROM audit_functions AS f WHERE f.observation=dependency.value
        AND pg_catalog.has_function_privilege(o.oid,f.oid,'EXECUTE') AND pg_catalog.has_schema_privilege(o.oid,f.schema_oid,'USAGE')
        AND (f.schema_name='pg_catalog' OR EXISTS (SELECT 1 FROM audit_function_current AS target WHERE target.function_oid=f.oid)
-- ORIGINAL_RUNTIME_DEPENDENCY_ADMISSION_BEGIN
          OR EXISTS (SELECT 1 FROM audit_original_login_dependency_current AS terminal
            WHERE terminal.function_oid=f.oid AND terminal.observation=f.observation)
-- ORIGINAL_RUNTIME_DEPENDENCY_ADMISSION_END
-- PORTAL_SOURCE_DEPENDENCY_ADMISSION_BEGIN
          OR EXISTS (SELECT 1 FROM audit_portal_source_dependency_current AS dependency_profile
            WHERE dependency_profile.root_function_oid=c.function_oid
              AND dependency_profile.runtime_kind=c.runtime_kind AND dependency_profile.route_kind=c.route_kind
              AND dependency_profile.route_oid=c.route_oid
              AND dependency_profile.function_oid=f.oid AND dependency_profile.observation=f.observation)
-- PORTAL_SOURCE_DEPENDENCY_ADMISSION_END
-- PORTAL_POLICY_COMPLETE_DEPENDENCY_ADMISSION_BEGIN
          OR EXISTS (SELECT 1 FROM audit_portal_policy_dependency_current AS policy_dependency
            WHERE policy_dependency.root_function_oid=c.function_oid
              AND policy_dependency.runtime_kind=c.runtime_kind AND policy_dependency.route_kind=c.route_kind
              AND policy_dependency.route_oid=c.route_oid
              AND policy_dependency.function_oid=f.oid AND policy_dependency.observation=f.observation)
-- PORTAL_POLICY_COMPLETE_DEPENDENCY_ADMISSION_END
)))
    AND pg_catalog.jsonb_array_length(c.dependencies)=(SELECT COUNT(DISTINCT dependency.value) FROM pg_catalog.jsonb_array_elements(c.dependencies) AS dependency(value))
    -- Every native pg_depend function edge is covered; this cannot prove PL/pgSQL
    -- callgraph completeness or dynamic SQL. Those source-review gates stay open.
    AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_depend AS d
      WHERE d.classid='pg_catalog.pg_proc'::pg_catalog.regclass AND d.objid=c.function_oid
        AND d.refclassid='pg_catalog.pg_proc'::pg_catalog.regclass AND d.refobjid<>c.function_oid
        AND NOT EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(c.dependencies) AS dependency(value)
          JOIN audit_functions AS f ON f.observation=dependency.value WHERE f.oid=d.refobjid))
)
-- AUDITED_NATIVE_CTES_END
SELECT EXISTS (
  SELECT 1 FROM caller AS r CROSS JOIN controlled_catalog AS control
  WHERE
    NOT EXISTS (SELECT 1 FROM nevora_tenancy.audited_helper_capability AS registered
      WHERE NOT EXISTS (SELECT 1 FROM audit_capabilities AS capability
        WHERE capability.runtime_kind=registered.runtime_kind AND capability.route_kind=registered.route_kind
          AND capability.function_oid=registered.function_oid AND capability.route_oid=registered.route_oid))
    AND
    -- Membership can confer SET/admin authority even with NOINHERIT. Neither
    -- membership direction nor grants issued by the runtime principal is allowed.
    NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_auth_members AS m
      WHERE m.member = r.oid OR m.roleid = r.oid OR m.grantor = r.oid
    )
    -- Ownership dependencies span the cluster, including objects in other DBs.
    -- This is broader than checking only table owners in the current database.
    AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_shdepend AS d
      WHERE d.refclassid = 'pg_catalog.pg_authid'::pg_catalog.regclass
        AND d.refobjid = r.oid AND d.deptype = 'o'
    )
    AND NOT pg_catalog.has_database_privilege(r.oid, pg_catalog.current_database(), 'CREATE,TEMPORARY')
    AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_namespace AS n
      WHERE n.nspowner = r.oid OR pg_catalog.has_schema_privilege(r.oid, n.oid, 'CREATE')
    )
    AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_tablespace AS t
      WHERE t.spcowner = r.oid OR pg_catalog.has_tablespace_privilege(r.oid, t.oid, 'CREATE')
    )
    -- The controlled installation must have no PUBLIC access. Named-role reads
    -- and invocation are mandatory; no write/column/grant-option escape exists.
    AND pg_catalog.has_schema_privilege(r.oid, control.schema_oid, 'USAGE')
    AND pg_catalog.has_table_privilege(r.oid, control.binding_oid, 'SELECT')
    AND pg_catalog.has_table_privilege(r.oid, control.capability_oid, 'SELECT')
    AND pg_catalog.has_function_privilege(r.oid, control.helper_oid, 'EXECUTE')
    AND NOT pg_catalog.has_schema_privilege('public'::pg_catalog.name, control.schema_oid, 'USAGE,CREATE')
    AND NOT pg_catalog.has_table_privilege('public'::pg_catalog.name, control.binding_oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
    AND NOT pg_catalog.has_any_column_privilege('public'::pg_catalog.name, control.binding_oid, 'SELECT,INSERT,UPDATE,REFERENCES')
    AND NOT pg_catalog.has_table_privilege('public'::pg_catalog.name, control.capability_oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
    AND NOT pg_catalog.has_any_column_privilege('public'::pg_catalog.name, control.capability_oid, 'SELECT,INSERT,UPDATE,REFERENCES')
    AND NOT pg_catalog.has_function_privilege('public'::pg_catalog.name, control.helper_oid, 'EXECUTE')
    AND NOT EXISTS (
      SELECT 1 FROM object_acls AS o
      CROSS JOIN LATERAL pg_catalog.aclexplode(o.acl) AS a
      WHERE a.grantee IN (0::pg_catalog.oid, r.oid) AND a.is_grantable
    )
    -- Destructive/trigger/maintenance authority is not runtime DML authority.
    -- Catalogs and the tenancy control schema must have no direct mutation.
    AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_class AS c
      JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
      WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f') AND (
        pg_catalog.has_table_privilege(r.oid, c.oid, 'TRUNCATE,TRIGGER,MAINTAIN')
        OR (n.nspname IN ('pg_catalog', 'information_schema', 'nevora_tenancy') AND (
          pg_catalog.has_table_privilege(r.oid, c.oid, 'INSERT,DELETE,REFERENCES')
          OR pg_catalog.has_any_column_privilege(r.oid, c.oid, 'INSERT,REFERENCES')
          OR ((pg_catalog.has_table_privilege(r.oid, c.oid, 'UPDATE')
            OR pg_catalog.has_any_column_privilege(r.oid, c.oid, 'UPDATE')) AND NOT (
              -- Stock pg_settings exposes user-settable configuration through
              -- PUBLIC UPDATE. Permit only the installer's exact approved
              -- catalog OID/view/rule source, never a name-only exception.
              c.oid IN (SELECT settings.oid FROM approved_settings AS settings)
            ))
        ))
        -- Views/rules can execute with their owner's underlying permissions.
        -- Definer trigger invocation need not grant direct function EXECUTE.
        -- Only an exact current registered TRIGGER_ROUTE is excepted below.
        OR ((pg_catalog.has_table_privilege(r.oid, c.oid, 'INSERT,UPDATE,DELETE')
          OR pg_catalog.has_any_column_privilege(r.oid, c.oid, 'INSERT,UPDATE')) AND (
          (c.relkind = 'v' AND NOT COALESCE('security_invoker=true' = ANY(c.reloptions), false)
            AND c.oid NOT IN (SELECT settings.oid FROM approved_settings AS settings))
          OR EXISTS (SELECT 1 FROM pg_catalog.pg_rewrite AS w
            WHERE w.ev_class = c.oid AND w.ev_type <> '1' AND w.ev_enabled <> 'D'
              AND c.oid NOT IN (SELECT settings.oid FROM approved_settings AS settings))
          OR EXISTS (SELECT 1 FROM pg_catalog.pg_trigger AS t
            JOIN pg_catalog.pg_proc AS p ON p.oid = t.tgfoid
            WHERE t.tgrelid = c.oid AND NOT t.tgisinternal AND t.tgenabled <> 'D' AND p.prosecdef
              AND NOT EXISTS (SELECT 1 FROM audit_capabilities AS capability
                WHERE capability.runtime_kind=requested_kind AND capability.route_kind='TRIGGER_ROUTE'
                  AND capability.function_oid=p.oid AND capability.route_oid=t.oid))
        ))
      )
    )
    -- Explicit parameter grants are privileged configuration authority. Ordinary
    -- user-settable configuration is not mistaken for an administrative grant.
    AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_parameter_acl AS p
      CROSS JOIN LATERAL pg_catalog.aclexplode(p.paracl) AS a
      WHERE a.grantee IN (0::pg_catalog.oid, r.oid)
    )
    AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_foreign_data_wrapper AS f
      WHERE pg_catalog.has_foreign_data_wrapper_privilege(r.oid, f.oid, 'USAGE')
    )
    AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_foreign_server AS s
      WHERE pg_catalog.has_server_privilege(r.oid, s.oid, 'USAGE')
    )
    AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc AS p
      WHERE p.prosecdef AND pg_catalog.has_function_privilege(r.oid, p.oid, 'EXECUTE')
        AND pg_catalog.has_schema_privilege(r.oid, p.pronamespace, 'USAGE')
        AND NOT EXISTS (SELECT 1 FROM audit_capabilities AS capability
          WHERE capability.runtime_kind=requested_kind AND capability.route_kind='DIRECT_CALL'
            AND capability.function_oid=p.oid AND capability.route_oid=0)
    )
    -- Deny newly executable catalog routines that were not PUBLIC executable at
    -- initdb/extension creation. This catches direct and PUBLIC widening of e.g.
    -- server-file functions without guessing a list of privileged routine names.
    -- Initial ACL metadata does not certify extension/function semantics.
    AND NOT EXISTS (
      SELECT 1 FROM pg_catalog.pg_proc AS p
      JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
      WHERE n.nspname = 'pg_catalog'
        AND pg_catalog.has_function_privilege(r.oid, p.oid, 'EXECUTE')
        AND NOT EXISTS (
          SELECT 1 FROM pg_catalog.aclexplode(COALESCE(
            (SELECT i.initprivs FROM pg_catalog.pg_init_privs AS i
             WHERE i.classoid = 'pg_catalog.pg_proc'::pg_catalog.regclass
               AND i.objoid = p.oid AND i.objsubid = 0),
            pg_catalog.acldefault('f'::pg_catalog."char", p.proowner)
          )) AS initial
          WHERE initial.grantee = 0::pg_catalog.oid AND initial.privilege_type = 'EXECUTE'
        )
    )
);
$role_guard$;

REVOKE ALL ON FUNCTION nevora_tenancy.assert_audited_runtime_role(text) FROM PUBLIC;
DO $helper_installer_final$
BEGIN
  -- PUBLIC revoke must not hide named grants inherited from default privileges.
  -- Reject the entire installation; never silently repair unrelated ACLs.
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS p JOIN pg_catalog.pg_namespace AS n ON n.oid=p.pronamespace
    WHERE n.nspname='nevora_tenancy' AND p.proname='assert_audited_runtime_role' AND p.proargtypes='25'::pg_catalog.oidvector
      AND p.proowner=(SELECT r.oid FROM pg_catalog.pg_roles AS r WHERE r.rolname=current_user)
      AND p.prokind='f' AND NOT p.prosecdef AND p.provolatile='v' AND p.prorettype=16::pg_catalog.oid
      AND NOT p.proretset AND p.pronargdefaults=0 AND p.prosupport=0::pg_catalog.oid
      AND p.proconfig=ARRAY['search_path=pg_catalog']::pg_catalog.text[]
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) AS acl
        WHERE acl.grantee<>p.proowner OR acl.grantor<>p.proowner OR acl.is_grantable)) THEN
    RAISE EXCEPTION 'helper_installer_private_function_invalid' USING ERRCODE='55000';
  END IF;
END;
$helper_installer_final$;
COMMIT;
