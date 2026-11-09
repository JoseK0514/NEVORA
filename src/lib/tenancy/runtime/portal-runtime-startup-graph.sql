-- UNUSED fixed Portal startup graph read. Inert source; opens no connection,
-- transaction or advisory lock and installs no function/role/grant/seed.
-- Root adopter must hold the exact shared catalog fence FIRST in its own
-- ReadCommitted transaction; original and final audited APP guard required.
-- Separate retained installer/build custody must authenticate source applicability.
-- Positive native closure here is a source observation, NOT proof/permission.
-- The copied native CTE bytes are unchanged from the pinned owning guard.
WITH

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

, portal_startup_members AS (
  SELECT terminal.function_oid,terminal.observation,'ORIGINAL_LOGIN'::pg_catalog.text AS member_kind
    FROM audit_original_login_dependency_current AS terminal
  UNION ALL
  SELECT old_pair.function_oid,old_pair.observation,'OLD_PORTAL'::pg_catalog.text
    FROM audit_portal_source_dependency_current AS old_pair
    WHERE old_pair.runtime_kind='APP' AND old_pair.route_kind='DIRECT_CALL' AND old_pair.route_oid=0::pg_catalog.oid
      AND old_pair.root_function_oid=pg_catalog.to_regprocedure('nevora_tenancy.resolve_portal(text,text)')::pg_catalog.oid
  UNION ALL
  SELECT policy_member.function_oid,policy_member.observation,'PORTAL_POLICY'::pg_catalog.text
    FROM audit_portal_policy_dependency_current AS policy_member
    WHERE policy_member.runtime_kind='APP' AND policy_member.route_kind='DIRECT_CALL' AND policy_member.route_oid=0::pg_catalog.oid
      AND policy_member.root_function_oid=pg_catalog.to_regprocedure('nevora_tenancy.resolve_portal(text,text)')::pg_catalog.oid
), portal_startup_selected AS (
  SELECT database.oid AS database_oid,function.oid AS root_oid,function.owner_oid,
    function.observation->>'definition' AS root_definition,
    function.source_sha256 AS root_definition_sha256,
    pg_catalog.jsonb_build_object(
      'format','PORTAL_STARTUP_NATIVE_GRAPH_CAPSULE_V1',
      'databaseOid',database.oid::pg_catalog.text,
      'serverVersionNum',pg_catalog.current_setting('server_version_num'),
      'auditedRoleGuard',(SELECT helper.observation FROM audit_functions AS helper
        WHERE helper.oid=pg_catalog.to_regprocedure('nevora_tenancy.assert_audited_runtime_role(text)')::pg_catalog.oid),
      'originalBackendLogin',pg_catalog.jsonb_build_object(
        'roleOid',binding.role_oid::pg_catalog.text,'roleName',binding.role_name::pg_catalog.text,
        'kind',binding.kind,'sessionUser',session_user::pg_catalog.text,'currentUser',current_user::pg_catalog.text,
        'backendLoginOid',backend.usesysid::pg_catalog.text,'roleSetting',pg_catalog.current_setting('role')),
      'rootFunction',function.observation,
      'rootRegistration',pg_catalog.to_jsonb(registered),
      'owner',owner.observation,'ownerAcl',owner.acl_observation,
      'nativeFixedDependencies',(SELECT pg_catalog.jsonb_agg(member.observation ORDER BY member.function_oid)
        FROM portal_startup_members AS member),
      'currentLockColumns',COALESCE((SELECT pg_catalog.jsonb_agg(lock_column.observation ORDER BY lock_column.relation_oid,lock_column.attribute_number)
        FROM audit_lock_columns AS lock_column WHERE EXISTS (
          SELECT 1 FROM pg_catalog.jsonb_array_elements(registered.owner_lock_columns) AS retained(value)
          WHERE retained.value=lock_column.observation)),'[]'::pg_catalog.jsonb),
      'runtimeBindings',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(binding) ORDER BY binding.kind COLLATE pg_catalog."C")
        FROM nevora_tenancy.runtime_role_binding AS binding),
      'allRegistrations',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(sibling)
        ORDER BY sibling.runtime_kind COLLATE pg_catalog."C",sibling.route_kind COLLATE pg_catalog."C",sibling.function_oid,sibling.route_oid)
        FROM nevora_tenancy.audited_helper_capability AS sibling),'[]'::pg_catalog.jsonb)
    )::pg_catalog.text AS native_capsule_text
  FROM audit_capabilities AS admitted
  JOIN nevora_tenancy.audited_helper_capability AS registered
    ON registered.runtime_kind=admitted.runtime_kind AND registered.route_kind=admitted.route_kind
      AND registered.function_oid=admitted.function_oid AND registered.route_oid=admitted.route_oid
  JOIN audit_functions AS function ON function.oid=admitted.function_oid
  JOIN audit_owners AS owner ON owner.oid=function.owner_oid AND owner.safe
  JOIN audit_owner_consistency AS consistent ON consistent.owner_oid=owner.oid
  JOIN audit_runtime_bindings AS binding ON binding.kind='APP'
  JOIN pg_catalog.pg_stat_activity AS backend ON backend.pid=pg_catalog.pg_backend_pid() AND backend.usesysid=binding.role_oid
  CROSS JOIN pg_catalog.pg_database AS database
  WHERE database.datname=pg_catalog.current_database()
    AND pg_catalog.current_setting('transaction_isolation')='read committed'
    AND admitted.runtime_kind='APP' AND admitted.route_kind='DIRECT_CALL' AND admitted.route_oid=0::pg_catalog.oid
    AND function.oid=pg_catalog.to_regprocedure('nevora_tenancy.resolve_portal(text,text)')::pg_catalog.oid
    AND binding.role_name=session_user::pg_catalog.name AND binding.role_name=current_user::pg_catalog.name
    AND pg_catalog.current_setting('role')='none'
    AND nevora_tenancy.assert_audited_runtime_role('APP'::pg_catalog.text) IS TRUE
    AND NOT EXISTS (SELECT 1 FROM nevora_tenancy.audited_helper_capability AS other_registration
      WHERE NOT EXISTS (SELECT 1 FROM audit_capabilities AS other_current
        WHERE other_current.runtime_kind=other_registration.runtime_kind AND other_current.route_kind=other_registration.route_kind
          AND other_current.function_oid=other_registration.function_oid AND other_current.route_oid=other_registration.route_oid))
    AND (SELECT pg_catalog.count(*) FROM portal_startup_members)=6
    AND (SELECT pg_catalog.count(DISTINCT member.function_oid) FROM portal_startup_members AS member)=6
    AND NOT EXISTS (SELECT 1 FROM portal_startup_members AS member WHERE NOT EXISTS (
      SELECT 1 FROM pg_catalog.jsonb_array_elements(registered.dependencies) AS retained(value)
      WHERE retained.value=member.observation))
    -- All required fixed custom capsules are present; no other custom helper
    -- is silently admitted. Exact original catalog dependencies remain allowed
    -- by the unchanged owning native guard, not by a new generic graph.
    AND NOT EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(registered.dependencies) AS retained(value)
      JOIN audit_functions AS dependency ON dependency.observation=retained.value
      WHERE dependency.schema_name<>'pg_catalog' AND NOT EXISTS (
        SELECT 1 FROM portal_startup_members AS member
        WHERE member.function_oid=dependency.oid AND member.observation=retained.value))
)
SELECT pg_catalog.jsonb_build_object(
  'format','PORTAL_STARTUP_NATIVE_GRAPH_OBSERVATION_V1',
  'databaseOid',selected.database_oid::pg_catalog.text,'rootOid',selected.root_oid::pg_catalog.text,
  'ownerOid',selected.owner_oid::pg_catalog.text,'rootDefinition',selected.root_definition,
  'rootDefinitionSha256',selected.root_definition_sha256,
  'nativeAuditCapsuleText',selected.native_capsule_text,
  'nativeAuditCapsuleSha256',pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(selected.native_capsule_text,'UTF8')),'hex')
) AS startup
FROM portal_startup_selected AS selected;
-- Zero rows means no complete admitted current Portal tuple, never a default.
-- Original LOGIN, held fence/native freshness and independently retained startup
-- artifact/installation identity are adopter obligations; no authority is issued.
