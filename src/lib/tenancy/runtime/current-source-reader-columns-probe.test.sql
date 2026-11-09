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

, enrollment_relations(schema_name,relation_name,lock_column) AS (
  VALUES ('public','workspaces','id'),
    ('public','employees','id'),
    ('public','employee_credentials','employee_id'),
    ('public','locations','id'),
    ('public','employee_location_eligibility','employee_id'),
    ('public','employee_sessions','token_hash'),
    ('nevora_tenancy','workspace_incarnation_counter','workspace_id'),
    ('nevora_tenancy','portal_authority','workspace_id'),
    ('nevora_tenancy','portal_session_issuance','token_hash'),
    ('nevora_tenancy','portal_administrative_authority','workspace_id'),
    ('nevora_tenancy','portal_administrative_capability','workspace_id'),
    ('nevora_tenancy','portal_administrative_location','workspace_id'),
    ('nevora_tenancy','workspace_capability_policy_installation','workspace_id'),
    ('nevora_tenancy','capability_policy_definition','policy_id'),
    ('nevora_tenancy','workspace_locator',NULL::pg_catalog.text),
    ('nevora_tenancy','runtime_role_binding',NULL::pg_catalog.text),
    ('nevora_tenancy','audited_helper_capability',NULL::pg_catalog.text)
), enrollment_relation_catalog AS (
  SELECT expected.schema_name,expected.relation_name,expected.lock_column,c.oid,c.relowner,
    pg_catalog.jsonb_build_object(
      'schema',pg_catalog.to_jsonb(n),'relation',pg_catalog.to_jsonb(c),
      'relationAcl',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(acl) ORDER BY acl.grantee,acl.grantor,acl.privilege_type COLLATE pg_catalog."C",acl.is_grantable)
        FROM pg_catalog.aclexplode(COALESCE(c.relacl,pg_catalog.acldefault('r'::pg_catalog."char",c.relowner))) AS acl),'[]'::pg_catalog.jsonb),
      'columns',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('attribute',pg_catalog.to_jsonb(a),
        'type',pg_catalog.to_jsonb(type),'default',pg_catalog.pg_get_expr(d.adbin,d.adrelid,false),
        'acl',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(acl) ORDER BY acl.grantee,acl.grantor,acl.privilege_type COLLATE pg_catalog."C",acl.is_grantable)
          FROM pg_catalog.aclexplode(COALESCE(a.attacl,pg_catalog.acldefault('c'::pg_catalog."char",c.relowner))) AS acl),'[]'::pg_catalog.jsonb)) ORDER BY a.attnum)
        FROM pg_catalog.pg_attribute AS a JOIN pg_catalog.pg_type AS type ON type.oid=a.atttypid
        LEFT JOIN pg_catalog.pg_attrdef AS d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
        WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),'[]'::pg_catalog.jsonb),
      'constraints',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('catalog',pg_catalog.to_jsonb(co),'definition',pg_catalog.pg_get_constraintdef(co.oid,false)) ORDER BY co.oid)
        FROM pg_catalog.pg_constraint AS co WHERE co.conrelid=c.oid),'[]'::pg_catalog.jsonb),
      'indexes',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('catalog',pg_catalog.to_jsonb(i),'relation',pg_catalog.to_jsonb(ic),
        'definition',pg_catalog.pg_get_indexdef(i.indexrelid,0,false),
        'opclasses',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('position',v.position,'catalog',pg_catalog.to_jsonb(op),'family',pg_catalog.to_jsonb(family)) ORDER BY v.position)
          FROM pg_catalog.unnest(i.indclass::pg_catalog.oid[]) WITH ORDINALITY AS v(oid,position)
          JOIN pg_catalog.pg_opclass AS op ON op.oid=v.oid JOIN pg_catalog.pg_opfamily AS family ON family.oid=op.opcfamily),'[]'::pg_catalog.jsonb),
        'collations',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('position',v.position,'oid',v.oid::pg_catalog.text,'catalog',pg_catalog.to_jsonb(native_collation),
          'actualVersion',CASE WHEN v.oid=0 THEN NULL ELSE pg_catalog.pg_collation_actual_version(v.oid) END) ORDER BY v.position)
          FROM pg_catalog.unnest(i.indcollation::pg_catalog.oid[]) WITH ORDINALITY AS v(oid,position)
          LEFT JOIN pg_catalog.pg_collation AS native_collation ON native_collation.oid=v.oid),'[]'::pg_catalog.jsonb)) ORDER BY i.indexrelid)
        FROM pg_catalog.pg_index AS i JOIN pg_catalog.pg_class AS ic ON ic.oid=i.indexrelid WHERE i.indrelid=c.oid),'[]'::pg_catalog.jsonb),
      'policies',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('catalog',pg_catalog.to_jsonb(p),
        'using',pg_catalog.pg_get_expr(p.polqual,p.polrelid,false),'withCheck',pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid,false)) ORDER BY p.oid)
        FROM pg_catalog.pg_policy AS p WHERE p.polrelid=c.oid),'[]'::pg_catalog.jsonb),
      'triggers',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('catalog',pg_catalog.to_jsonb(t),'route',route.observation,
        'function',function.observation,'procedureCatalog',pg_catalog.to_jsonb(p)) ORDER BY t.oid)
        FROM pg_catalog.pg_trigger AS t JOIN audit_routes AS route ON route.oid=t.oid
        JOIN audit_functions AS function ON function.oid=t.tgfoid JOIN pg_catalog.pg_proc AS p ON p.oid=t.tgfoid WHERE t.tgrelid=c.oid),'[]'::pg_catalog.jsonb),
      'rules',COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('catalog',pg_catalog.to_jsonb(rule),'definition',pg_catalog.pg_get_ruledef(rule.oid,false)) ORDER BY rule.oid)
        FROM pg_catalog.pg_rewrite AS rule WHERE rule.ev_class=c.oid),'[]'::pg_catalog.jsonb)
    ) AS observation
  FROM enrollment_relations AS expected JOIN pg_catalog.pg_namespace AS n ON n.nspname=expected.schema_name
    JOIN pg_catalog.pg_class AS c ON c.relnamespace=n.oid AND c.relname=expected.relation_name
  WHERE c.relkind='r' AND c.relpersistence='p'
)
-- Exact current source geometry only; not PortalProof, verification or permission.
, enrollment_source_columns(relation_name,column_name,type_oid,not_null,no_default) AS (
 VALUES ('employees','primary_location_id',25::pg_catalog.oid,true,true),
   ('locations','id',25::pg_catalog.oid,true,true),
   ('locations','workspace_id',25::pg_catalog.oid,true,true),
   ('locations','active',16::pg_catalog.oid,true,false),
   ('locations','updated_at',1184::pg_catalog.oid,true,false),
   ('employee_location_eligibility','workspace_id',25::pg_catalog.oid,false,true),
   ('employee_location_eligibility','employee_id',25::pg_catalog.oid,true,true),
   ('employee_location_eligibility','location_id',25::pg_catalog.oid,true,true)
), enrollment_source_column_current AS (
 SELECT expected.*,relation.oid AS relation_oid,a.attnum,a.attcollation
 FROM enrollment_source_columns AS expected
 JOIN enrollment_relation_catalog AS relation ON relation.schema_name='public' AND relation.relation_name=expected.relation_name
 JOIN pg_catalog.pg_attribute AS a ON a.attrelid=relation.oid AND a.attname=expected.column_name
 WHERE a.attnum>0 AND NOT a.attisdropped AND a.atttypid=expected.type_oid AND a.atttypmod=-1
   AND a.attnotnull=expected.not_null AND a.attidentity='' AND a.attgenerated=''
   AND (NOT expected.no_default OR NOT a.atthasdef)
), enrollment_source_key_contract(relation_name,key_name,key_kind,column_names) AS (
 VALUES ('employees','employees_pkey','p',ARRAY['id']::pg_catalog.text[]),
   ('employees','f10_tenant_c49de3d265fb','u',ARRAY['workspace_id','id']::pg_catalog.text[]),
   ('locations','locations_pkey','p',ARRAY['id']::pg_catalog.text[]),
   ('locations','communication_location_workspace_key','u',ARRAY['workspace_id','id']::pg_catalog.text[]),
   ('employee_location_eligibility','employee_location_eligibility_pkey','p',ARRAY['employee_id','location_id']::pg_catalog.text[]),
   ('employee_location_eligibility','f10_tenant_d4d2dd749788','u',ARRAY['workspace_id','employee_id','location_id']::pg_catalog.text[])
), enrollment_source_key_current AS (
 SELECT expected.*,co.oid AS constraint_oid
 FROM enrollment_source_key_contract AS expected
 JOIN enrollment_relation_catalog AS relation ON relation.schema_name='public' AND relation.relation_name=expected.relation_name
 JOIN pg_catalog.pg_constraint AS co ON co.conrelid=relation.oid AND co.conname=expected.key_name AND co.contype::pg_catalog.text=expected.key_kind
 JOIN pg_catalog.pg_index AS native_index ON native_index.indexrelid=co.conindid AND native_index.indrelid=relation.oid
 JOIN pg_catalog.pg_class AS backing ON backing.oid=native_index.indexrelid
 JOIN pg_catalog.pg_am AS method ON method.oid=backing.relam
 WHERE co.convalidated AND COALESCE((pg_catalog.to_jsonb(co)->>'conenforced')::pg_catalog.bool,true)
   AND NOT co.condeferrable AND NOT co.condeferred
   AND co.conkey=ARRAY(SELECT a.attnum FROM pg_catalog.unnest(expected.column_names) WITH ORDINALITY AS key(name,position)
     JOIN pg_catalog.pg_attribute AS a ON a.attrelid=relation.oid AND a.attname=key.name AND a.attnum>0 AND NOT a.attisdropped ORDER BY key.position)::pg_catalog.int2[]
   AND native_index.indisunique AND native_index.indisprimary=(expected.key_kind='p') AND native_index.indisvalid AND native_index.indisready AND native_index.indislive AND native_index.indimmediate
   AND NOT native_index.indnullsnotdistinct AND native_index.indpred IS NULL AND native_index.indexprs IS NULL
   AND native_index.indnkeyatts=pg_catalog.cardinality(expected.column_names) AND native_index.indnatts=native_index.indnkeyatts
   AND backing.relkind='i' AND backing.relpersistence='p' AND backing.relowner=relation.relowner AND backing.reloptions IS NULL AND method.amname='btree'
   AND NOT EXISTS (SELECT 1 FROM pg_catalog.unnest(expected.column_names) WITH ORDINALITY AS key(name,position)
     LEFT JOIN pg_catalog.pg_attribute AS a ON a.attrelid=relation.oid AND a.attname=key.name AND a.attnum>0 AND NOT a.attisdropped
     LEFT JOIN pg_catalog.pg_opclass AS op ON op.oid=native_index.indclass[key.position::pg_catalog.int4-1]
     LEFT JOIN pg_catalog.pg_opfamily AS family ON family.oid=op.opcfamily
     WHERE a.attnum IS NULL OR a.atttypid<>'pg_catalog.text'::pg_catalog.regtype OR native_index.indkey[key.position::pg_catalog.int4-1] IS DISTINCT FROM a.attnum
       OR op.oid IS NULL OR op.opcnamespace<>'pg_catalog'::pg_catalog.regnamespace OR op.opcname<>'text_ops' OR NOT op.opcdefault OR op.opcintype<>a.atttypid
       OR op.opcmethod<>method.oid OR family.opfnamespace<>'pg_catalog'::pg_catalog.regnamespace OR family.opfname<>'text_ops'
       OR native_index.indcollation[key.position::pg_catalog.int4-1] IS DISTINCT FROM a.attcollation OR native_index.indoption[key.position::pg_catalog.int4-1] IS DISTINCT FROM 0)
), enrollment_source_fk_contract(relation_name,key_name,target_name,columns,target_columns,validated,delete_action) AS (
 VALUES ('employees','employees_primary_location_id_fkey','locations',ARRAY['primary_location_id']::pg_catalog.text[],ARRAY['id']::pg_catalog.text[],true,'a'),
   ('locations','locations_workspace_id_fkey','workspaces',ARRAY['workspace_id']::pg_catalog.text[],ARRAY['id']::pg_catalog.text[],true,'a'),
   ('employee_location_eligibility','employee_location_eligibility_employee_id_fkey','employees',ARRAY['employee_id']::pg_catalog.text[],ARRAY['id']::pg_catalog.text[],true,'c'),
   ('employee_location_eligibility','employee_location_eligibility_location_id_fkey','locations',ARRAY['location_id']::pg_catalog.text[],ARRAY['id']::pg_catalog.text[],true,'a'),
   ('employees','f10_workspace_reference','workspaces',ARRAY['workspace_id']::pg_catalog.text[],ARRAY['id']::pg_catalog.text[],false,'a'),
   ('employee_location_eligibility','f10_workspace_reference','workspaces',ARRAY['workspace_id']::pg_catalog.text[],ARRAY['id']::pg_catalog.text[],false,'a')
), enrollment_source_fk_current AS (
 SELECT expected.*,co.oid AS constraint_oid FROM enrollment_source_fk_contract AS expected
 JOIN enrollment_relation_catalog AS relation ON relation.schema_name='public' AND relation.relation_name=expected.relation_name
 JOIN enrollment_relation_catalog AS target ON target.schema_name='public' AND target.relation_name=expected.target_name
 JOIN pg_catalog.pg_constraint AS co ON co.conrelid=relation.oid AND co.confrelid=target.oid AND co.conname=expected.key_name AND co.contype='f'
 WHERE co.convalidated=expected.validated AND COALESCE((pg_catalog.to_jsonb(co)->>'conenforced')::pg_catalog.bool,true)
   AND NOT co.condeferrable AND NOT co.condeferred AND co.confmatchtype='s' AND co.confupdtype='a' AND co.confdeltype::pg_catalog.text=expected.delete_action
   AND co.conkey=ARRAY(SELECT a.attnum FROM pg_catalog.unnest(expected.columns) WITH ORDINALITY AS key(name,position)
     JOIN pg_catalog.pg_attribute AS a ON a.attrelid=relation.oid AND a.attname=key.name AND a.attnum>0 AND NOT a.attisdropped ORDER BY key.position)::pg_catalog.int2[]
   AND co.confkey=ARRAY(SELECT a.attnum FROM pg_catalog.unnest(expected.target_columns) WITH ORDINALITY AS key(name,position)
     JOIN pg_catalog.pg_attribute AS a ON a.attrelid=target.oid AND a.attname=key.name AND a.attnum>0 AND NOT a.attisdropped ORDER BY key.position)::pg_catalog.int2[]
), enrollment_source_function_contract(schema_name,function_name,security_definer,configuration,body_source) AS (
 VALUES ('public','nevora_calendar_source_stamp',false,NULL::pg_catalog.text,'
BEGIN
 IF TG_TABLE_NAME=''locations'' THEN
  IF TG_OP=''UPDATE'' THEN
   IF NEW.short_name IS NOT DISTINCT FROM OLD.short_name THEN NEW.calendar_serial:=OLD.calendar_serial;NEW.calendar_modified_at:=OLD.calendar_modified_at;RETURN NEW;END IF;
  END IF;
 END IF;
 UPDATE calendar_clock SET serial=serial+1,modified_at=GREATEST(clock_timestamp(),modified_at+interval ''1 microsecond'') WHERE singleton
 RETURNING serial,modified_at INTO NEW.calendar_serial,NEW.calendar_modified_at;
 RETURN NEW;
END '),
    ('public','nevora_calendar_authority_loss',false,NULL::pg_catalog.text,'
BEGIN
 IF TG_TABLE_NAME=''employees'' THEN
  IF NOT NEW.active OR NEW.role NOT IN(''EMPLOYEE'',''LEAD'') THEN UPDATE calendar_subscriptions SET revoked_at=clock_timestamp(),revocation_reason=''account_loss'' WHERE employee_id=NEW.id AND revoked_at IS NULL;
  ELSE UPDATE calendar_subscriptions c SET revoked_at=clock_timestamp(),revocation_reason=''location_loss'' WHERE c.employee_id=NEW.id AND c.revoked_at IS NULL AND EXISTS(SELECT 1 FROM unnest(c.allowed_location_ids) allowed(id) WHERE allowed.id<>NEW.primary_location_id AND NOT EXISTS(SELECT 1 FROM employee_location_eligibility e WHERE e.employee_id=NEW.id AND e.location_id=allowed.id));END IF;
 ELSIF TG_TABLE_NAME=''employee_credentials'' THEN
  IF NEW.password_hash IS DISTINCT FROM OLD.password_hash OR NEW.password_updated_at IS DISTINCT FROM OLD.password_updated_at THEN UPDATE calendar_subscriptions SET revoked_at=clock_timestamp(),revocation_reason=''credential_reset'' WHERE employee_id=NEW.employee_id AND revoked_at IS NULL;END IF;
 ELSIF TG_TABLE_NAME=''employee_location_eligibility'' THEN
  IF NOT EXISTS(SELECT 1 FROM employees e WHERE e.id=OLD.employee_id AND e.primary_location_id=OLD.location_id) THEN UPDATE calendar_subscriptions SET revoked_at=clock_timestamp(),revocation_reason=''location_loss'' WHERE employee_id=OLD.employee_id AND OLD.location_id=ANY(allowed_location_ids) AND revoked_at IS NULL;END IF;
 ELSIF TG_TABLE_NAME=''locations'' THEN
  IF NOT NEW.active THEN UPDATE calendar_subscriptions SET revoked_at=clock_timestamp(),revocation_reason=''location_loss'' WHERE NEW.id=ANY(allowed_location_ids) AND revoked_at IS NULL;END IF;
 ELSIF TG_TABLE_NAME=''workspaces'' THEN
  IF NOT NEW.active THEN UPDATE calendar_subscriptions SET revoked_at=clock_timestamp(),revocation_reason=''workspace_loss'' WHERE workspace_id=NEW.id AND revoked_at IS NULL;END IF;
 END IF;
 RETURN NULL;
END '),
    ('nevora_tenancy','source_write_fence',true,'search_path=pg_catalog, nevora_tenancy','
DECLARE state nevora_tenancy.expansion_protocol%ROWTYPE;
BEGIN
 SELECT * INTO STRICT state FROM nevora_tenancy.expansion_protocol WHERE migration_id=26 FOR SHARE;
 IF state.phase=''FENCED'' AND TG_OP=''TRUNCATE'' THEN RAISE EXCEPTION ''f10_source_truncate_fenced'' USING ERRCODE=''55000''; END IF;
 IF state.phase=''FENCED'' AND
   (state.backfill_actor IS NULL OR state.backfill_actor::text<>session_user::text OR state.capture_manifest_sha256 IS NULL) THEN
  RAISE EXCEPTION ''f10_legacy_writes_fenced'' USING ERRCODE=''55000'';
 END IF;
 RETURN NULL;
END;
'),
    ('nevora_tenancy','source_identity_guard',true,'search_path=pg_catalog, nevora_tenancy','
DECLARE state nevora_tenancy.expansion_protocol%ROWTYPE;
 rule nevora_tenancy.owned_table_contract%ROWTYPE;
 col name;
 old_row jsonb;
 new_row jsonb;
BEGIN
 SELECT * INTO STRICT state FROM nevora_tenancy.expansion_protocol WHERE migration_id=26;
 SELECT * INTO STRICT rule FROM nevora_tenancy.owned_table_contract WHERE table_name=TG_TABLE_NAME::name;
 IF state.phase=''FENCED'' THEN
  -- Only the separately bound operator may fill NULL direct metadata while all
  -- original values and identity columns remain byte/value stable. It cannot
  -- insert/delete original history or bypass existing append-only triggers.
  IF TG_OP<>''UPDATE'' OR state.backfill_actor IS NULL OR state.backfill_actor::text<>session_user::text OR state.capture_manifest_sha256 IS NULL THEN
   RAISE EXCEPTION ''f10_source_write_not_backfill'' USING ERRCODE=''55000'';
  END IF;
  IF rule.storage<>''DIRECT_IMMUTABLE'' OR rule.anchor->>''kind''=''ROOT'' OR
    (to_jsonb(NEW)-''workspace_id'') IS DISTINCT FROM (to_jsonb(OLD)-''workspace_id'') THEN
   RAISE EXCEPTION ''f10_backfill_source_content_immutable'' USING ERRCODE=''23514'';
  END IF;
 END IF;
 IF TG_OP=''UPDATE'' THEN
  old_row:=to_jsonb(OLD);new_row:=to_jsonb(NEW);
  FOREACH col IN ARRAY rule.primary_key_columns LOOP
   IF new_row->col::text IS DISTINCT FROM old_row->col::text THEN
    RAISE EXCEPTION ''f10_source_identity_immutable'' USING ERRCODE=''23514'';
   END IF;
  END LOOP;
  IF rule.storage=''IMMUTABLE_PARENT'' THEN
   FOR col IN SELECT jsonb_array_elements_text(rule.anchor->''columns'')::name LOOP
    IF new_row->col::text IS DISTINCT FROM old_row->col::text THEN
     RAISE EXCEPTION ''f10_parent_identity_immutable'' USING ERRCODE=''23514'';
    END IF;
   END LOOP;
  END IF;
  IF rule.storage=''DIRECT_IMMUTABLE'' AND rule.anchor->>''kind''<>''ROOT'' THEN
   IF old_row->>''workspace_id'' IS NOT NULL AND new_row->>''workspace_id'' IS DISTINCT FROM old_row->>''workspace_id'' THEN
    RAISE EXCEPTION ''f10_workspace_immutable'' USING ERRCODE=''23514'';
   ELSIF old_row->>''workspace_id'' IS NULL AND new_row->>''workspace_id'' IS NOT NULL AND state.phase<>''FENCED'' THEN
    RAISE EXCEPTION ''f10_unproven_owner_fill'' USING ERRCODE=''23514'';
   END IF;
  END IF;
 END IF;
 IF TG_OP=''DELETE'' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
')
), enrollment_source_function_current AS (
 SELECT expected.*,p.oid,p.proowner,f.observation,pg_catalog.to_jsonb(p) AS procedure_catalog,
   pg_catalog.to_jsonb(owner) AS native_owner,
   COALESCE((SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(acl) ORDER BY acl.grantee,acl.grantor,acl.privilege_type COLLATE pg_catalog."C",acl.is_grantable)
     FROM pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f'::pg_catalog."char",p.proowner))) AS acl),'[]'::pg_catalog.jsonb) AS expanded_acl
 FROM enrollment_source_function_contract AS expected
 JOIN pg_catalog.pg_namespace AS namespace ON namespace.nspname=expected.schema_name
 JOIN pg_catalog.pg_proc AS p ON p.pronamespace=namespace.oid AND p.proname=expected.function_name
 JOIN pg_catalog.pg_language AS language ON language.oid=p.prolang
 JOIN audit_functions AS f ON f.oid=p.oid JOIN pg_catalog.pg_roles AS owner ON owner.oid=p.proowner
 WHERE p.proowner=(SELECT c.relowner FROM enrollment_relation_catalog AS c WHERE c.schema_name='nevora_tenancy' AND c.relation_name='portal_authority')
   AND p.prokind='f' AND p.pronargs=0 AND p.proargtypes=''::pg_catalog.oidvector AND p.proargnames IS NULL
   AND p.proargmodes IS NULL AND p.proallargtypes IS NULL AND p.prorettype='pg_catalog.trigger'::pg_catalog.regtype AND NOT p.proretset
   AND p.prosecdef=expected.security_definer AND p.provolatile='v' AND p.proparallel='u' AND language.lanname='plpgsql'
   AND NOT p.proisstrict AND NOT p.proleakproof AND p.provariadic=0 AND p.pronargdefaults=0 AND p.prosupport=0 AND p.probin IS NULL
   AND p.proconfig IS NOT DISTINCT FROM CASE WHEN expected.configuration IS NULL THEN NULL::pg_catalog.text[] ELSE ARRAY[expected.configuration]::pg_catalog.text[] END
   AND p.prosrc COLLATE pg_catalog."C"=expected.body_source COLLATE pg_catalog."C"
   AND (NOT p.prosecdef OR NOT EXISTS (SELECT 1 FROM pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f'::pg_catalog."char",p.proowner))) AS acl
     WHERE acl.grantee=0 OR acl.grantee IN (SELECT b.role_oid FROM nevora_tenancy.runtime_role_binding AS b WHERE b.kind IN ('APP','WORKER'))))
   AND (SELECT pg_catalog.count(*) FROM pg_catalog.pg_proc AS sibling WHERE sibling.pronamespace=p.pronamespace AND sibling.proname=p.proname)=1
), enrollment_source_route_contract(relation_name,trigger_name,function_schema,function_name,trigger_type) AS (
 VALUES ('locations','calendar_location_stamp','public','nevora_calendar_source_stamp',23),
   ('locations','calendar_location_loss','public','nevora_calendar_authority_loss',17),
   ('locations','f10_write_fence','nevora_tenancy','source_write_fence',62),
   ('locations','f10_identity_guard','nevora_tenancy','source_identity_guard',31),
   ('employee_location_eligibility','calendar_eligibility_loss','public','nevora_calendar_authority_loss',25),
   ('employee_location_eligibility','f10_write_fence','nevora_tenancy','source_write_fence',62),
   ('employee_location_eligibility','f10_identity_guard','nevora_tenancy','source_identity_guard',31)
), enrollment_source_route_current AS (
 SELECT expected.*,trg.oid,trg.tgrelid,trg.tgfoid,route.observation,pg_catalog.to_jsonb(trg) AS trigger_catalog
 FROM enrollment_source_route_contract AS expected
 JOIN enrollment_relation_catalog AS relation ON relation.schema_name='public' AND relation.relation_name=expected.relation_name
 JOIN enrollment_source_function_current AS f ON f.schema_name=expected.function_schema AND f.function_name=expected.function_name
 JOIN pg_catalog.pg_trigger AS trg ON trg.tgrelid=relation.oid AND trg.tgname=expected.trigger_name AND trg.tgfoid=f.oid
 JOIN audit_routes AS route ON route.oid=trg.oid
 WHERE trg.tgenabled='O' AND trg.tgtype=expected.trigger_type AND NOT trg.tgisinternal AND trg.tgparentid=0 AND trg.tgconstraint=0
   AND trg.tgconstrrelid=0 AND trg.tgconstrindid=0 AND NOT trg.tgdeferrable AND NOT trg.tginitdeferred AND trg.tgnargs=0
   AND trg.tgargs=''::pg_catalog.bytea AND trg.tgattr=''::pg_catalog.int2vector AND trg.tgqual IS NULL
   AND trg.tgoldtable IS NULL AND trg.tgnewtable IS NULL
), enrollment_source_closure AS (
 SELECT pg_catalog.jsonb_build_object('format','PORTAL_CURRENT_SOURCE_NATIVE_ENVELOPE_V1',
   'functions',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('observation',f.observation,'catalog',f.procedure_catalog,
     'nativeOwner',f.native_owner,'expandedAcl',f.expanded_acl) ORDER BY f.oid) FROM enrollment_source_function_current AS f),
   'routes',(SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('observation',route.observation,'catalog',route.trigger_catalog) ORDER BY route.oid) FROM enrollment_source_route_current AS route),
   'columns',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(col) ORDER BY col.relation_oid,col.attnum) FROM enrollment_source_column_current AS col),
   'keys',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(key) ORDER BY key.constraint_oid) FROM enrollment_source_key_current AS key),
   'foreignKeys',(SELECT pg_catalog.jsonb_agg(pg_catalog.to_jsonb(key) ORDER BY key.constraint_oid) FROM enrollment_source_fk_current AS key)) AS observation
 WHERE (SELECT pg_catalog.count(*) FROM enrollment_source_column_current)=8
   AND (SELECT pg_catalog.count(*) FROM enrollment_source_key_current)=6 AND (SELECT pg_catalog.count(*) FROM enrollment_source_fk_current)=6
   AND (SELECT pg_catalog.count(*) FROM enrollment_source_function_current)=4 AND (SELECT pg_catalog.count(*) FROM enrollment_source_route_current)=7
   AND NOT EXISTS (SELECT 1 FROM enrollment_relation_catalog AS c WHERE c.schema_name='public' AND c.relation_name IN ('workspaces','employees','employee_credentials','employee_sessions','locations','employee_location_eligibility')
     AND (c.relowner IS DISTINCT FROM (SELECT owner.relowner FROM enrollment_relation_catalog AS owner WHERE owner.schema_name='nevora_tenancy' AND owner.relation_name='portal_authority')
       OR EXISTS(SELECT 1 FROM pg_catalog.pg_class AS original WHERE original.oid=c.oid AND (original.relrowsecurity OR original.relforcerowsecurity))
       OR EXISTS(SELECT 1 FROM pg_catalog.pg_rewrite AS rule WHERE rule.ev_class=c.oid)))
   AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_trigger AS trg JOIN enrollment_relation_catalog AS c ON c.oid=trg.tgrelid
     WHERE c.schema_name='public' AND c.relation_name IN ('locations','employee_location_eligibility') AND NOT trg.tgisinternal
       AND NOT EXISTS(SELECT 1 FROM enrollment_source_route_current AS current WHERE current.oid=trg.oid))
)
, enrollment_source_reader_columns(relation_name,column_name,can_select,can_update) AS (
 VALUES ('employees','id',true,true),('employees','workspace_id',true,false),
   ('employees','active',true,false),('employees','role',true,false),
   ('employees','updated_at',true,false),('employees','primary_location_id',true,false),
   ('locations','id',true,true),('locations','workspace_id',true,false),
   ('locations','active',true,false),('locations','updated_at',true,false),
   ('employee_location_eligibility','workspace_id',true,false),
   ('employee_location_eligibility','employee_id',true,true),
   ('employee_location_eligibility','location_id',true,false)
), enrollment_source_reader_column_current AS (
 SELECT expected.*,c.oid AS relation_oid,c.relowner,a.attnum
 FROM enrollment_source_reader_columns AS expected
 JOIN enrollment_relation_catalog AS c ON c.schema_name='public' AND c.relation_name=expected.relation_name
 JOIN pg_catalog.pg_attribute AS a ON a.attrelid=c.oid AND a.attname=expected.column_name AND a.attnum>0 AND NOT a.attisdropped
)
, assigned_reader AS (
 SELECT p.proowner AS owner_oid FROM pg_catalog.pg_proc AS p
 WHERE p.oid=pg_catalog.to_regprocedure('nevora_tenancy.resolve_portal(text,text)')::pg_catalog.oid
)
SELECT selected.owner_oid::pg_catalog.text AS reader_owner_oid FROM assigned_reader AS selected
WHERE true
    AND EXISTS(SELECT 1 FROM enrollment_source_closure)
    AND (SELECT pg_catalog.count(*) FROM enrollment_source_reader_column_current)=13
    AND NOT EXISTS (SELECT 1 FROM enrollment_relation_catalog AS c
      WHERE c.schema_name='public' AND c.relation_name IN ('employees','locations','employee_location_eligibility')
        AND pg_catalog.has_table_privilege(selected.owner_oid,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN'))
    AND NOT EXISTS (SELECT 1 FROM enrollment_relation_catalog AS c
      JOIN pg_catalog.pg_attribute AS a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
      LEFT JOIN enrollment_source_reader_column_current AS expected ON expected.relation_oid=c.oid AND expected.attnum=a.attnum
      WHERE c.schema_name='public' AND c.relation_name IN ('employees','locations','employee_location_eligibility')
        AND (pg_catalog.has_column_privilege(selected.owner_oid,c.oid,a.attnum,'SELECT') IS DISTINCT FROM COALESCE(expected.can_select,false)
          OR pg_catalog.has_column_privilege(selected.owner_oid,c.oid,a.attnum,'UPDATE') IS DISTINCT FROM COALESCE(expected.can_update,false)
          OR pg_catalog.has_column_privilege(selected.owner_oid,c.oid,a.attnum,'INSERT,REFERENCES')
          OR EXISTS(SELECT 1 FROM pg_catalog.aclexplode(COALESCE(a.attacl,pg_catalog.acldefault('c'::pg_catalog."char",c.relowner))) AS acl
            WHERE acl.grantee=selected.owner_oid AND (acl.grantor<>c.relowner OR acl.is_grantable
              OR NOT ((acl.privilege_type='SELECT' AND COALESCE(expected.can_select,false))
                OR (acl.privilege_type='UPDATE' AND COALESCE(expected.can_update,false)))))
          OR (COALESCE(expected.can_select,false) AND NOT EXISTS (SELECT 1 FROM pg_catalog.aclexplode(a.attacl) AS acl
            WHERE acl.grantee=selected.owner_oid AND acl.grantor=c.relowner AND acl.privilege_type='SELECT' AND NOT acl.is_grantable))
          OR (COALESCE(expected.can_update,false) AND NOT EXISTS (SELECT 1 FROM pg_catalog.aclexplode(a.attacl) AS acl
            WHERE acl.grantee=selected.owner_oid AND acl.grantor=c.relowner AND acl.privilege_type='UPDATE' AND NOT acl.is_grantable))))
;
