-- Unused local verifier service source. Installation is separately controlled; source is not an authenticated installation receipt.
-- New employee_login_identity storage is a separate fresh/private prerequisite.
-- This installs empty technical binding plus executable fixed roots; it creates
-- no roles, source identities, number mappings, credentials, policies or grants.
-- A ROOT-controlled installer must independently bind the two native principals,
-- exact full native capsule, finite ACL/RLS source and actual executing Node
-- verifier source before any technical binding is populated or EXECUTE granted.
-- SQL does NOT implement scrypt. Only the independently enrolled original
-- verifier service may execute these roots. Ordinary reviewed JSON is source
-- comparison data, never password knowledge or a credential/proof issuer.
-- Accepted APP/WORKER bindings, reader closure and original login helper stay unchanged.
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
DO $verifier_fresh$
DECLARE installer_oid pg_catalog.oid; private_schema_oid pg_catalog.oid;
BEGIN
  SELECT role.oid INTO installer_oid FROM pg_catalog.pg_roles AS role WHERE role.rolname=current_user;
  SELECT namespace.oid INTO private_schema_oid FROM pg_catalog.pg_namespace AS namespace
    WHERE namespace.nspname='nevora_tenancy' AND namespace.nspowner=installer_oid;
  IF private_schema_oid IS NULL OR current_user IS DISTINCT FROM session_user
    OR pg_catalog.current_setting('role') <> 'none'
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_stat_activity AS activity
      WHERE activity.pid=pg_catalog.pg_backend_pid() AND activity.usesysid=installer_oid)
  THEN RAISE EXCEPTION 'portal_verifier_installer_denied' USING ERRCODE='42501'; END IF;
  IF pg_catalog.to_regclass('nevora_tenancy.portal_verifier_service_binding') IS NOT NULL
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS function WHERE function.pronamespace=private_schema_oid
      AND function.proname IN ('capture_portal_verifier_native_profile','assert_original_portal_verifier_service',
        'acquire_portal_login_source','insert_portal_reviewed_session'))
  THEN RAISE EXCEPTION 'portal_verifier_already_installed' USING ERRCODE='42723'; END IF;
  -- The independently retained enrollment capsule must include these actual
  -- persistent relations, full physical keys/column types/FKs/source guards,
  -- all private RLS policies, native function sources and effective ACL routes.
  -- Mere existence here is NOT that full prerequisite; enrollment remains gated.
  IF EXISTS (SELECT 1 FROM (VALUES
    ('public','workspaces'),('public','employees'),('public','employee_credentials'),('public','employee_sessions'),
    ('nevora_tenancy','employee_login_identity'),('nevora_tenancy','workspace_locator'),
    ('nevora_tenancy','workspace_incarnation_counter'),('nevora_tenancy','portal_authority'),
    ('nevora_tenancy','portal_session_issuance'),('nevora_tenancy','runtime_role_binding')
  ) AS required(schema_name,relation_name)
  WHERE NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class AS relation
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid=relation.relnamespace
    WHERE namespace.nspname=required.schema_name AND relation.relname=required.relation_name
      AND relation.relkind='r' AND relation.relpersistence='p' AND relation.relowner=installer_oid))
  THEN RAISE EXCEPTION 'portal_verifier_parent_missing' USING ERRCODE='55000'; END IF;
END;
$verifier_fresh$;
CREATE TABLE nevora_tenancy.portal_verifier_service_binding (
  singleton pg_catalog.bool NOT NULL PRIMARY KEY CHECK(singleton),
  verifier_role_oid pg_catalog.oid NOT NULL UNIQUE,
  verifier_role_name pg_catalog.name NOT NULL UNIQUE,
  writer_owner_oid pg_catalog.oid NOT NULL UNIQUE,
  writer_owner_name pg_catalog.name NOT NULL UNIQUE,
  native_capsule pg_catalog.jsonb NOT NULL CHECK(pg_catalog.jsonb_typeof(native_capsule)='object'),
  CHECK(verifier_role_oid<>writer_owner_oid)
);
-- Installer-owned migration-global technical control, like runtime_role_binding;
-- not a customer relation or a new claim/proof table. Runtime principals cannot
-- write it. Population is an explicit separate independently controlled installer
-- action, followed by full current capsule equality and source review.
CREATE FUNCTION nevora_tenancy.capture_portal_verifier_native_profile(
  p_verifier_oid pg_catalog.oid, p_owner_oid pg_catalog.oid)
RETURNS pg_catalog.jsonb LANGUAGE sql VOLATILE PARALLEL UNSAFE SECURITY INVOKER
SET search_path=pg_catalog
AS $verifier_native_profile$
WITH selected_relations AS (
  SELECT c.*,n.nspname FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid=c.relnamespace
  WHERE (n.nspname,c.relname) IN (
    ('pg_catalog','pg_settings'),('public','workspaces'),('public','employees'),('public','employee_credentials'),('public','employee_sessions'),
    ('nevora_tenancy','employee_login_identity'),('nevora_tenancy','workspace_locator'),
    ('nevora_tenancy','workspace_incarnation_counter'),('nevora_tenancy','portal_authority'),
    ('nevora_tenancy','portal_session_issuance'),('nevora_tenancy','portal_verifier_service_binding'),
    ('nevora_tenancy','runtime_role_binding'),('nevora_tenancy','owned_table_contract'),
    ('nevora_tenancy','expansion_protocol'))
), selected_functions AS (
  SELECT p.*,n.nspname FROM pg_catalog.pg_proc AS p
  JOIN pg_catalog.pg_namespace AS n ON n.oid=p.pronamespace
  WHERE n.nspname='nevora_tenancy' AND p.proname IN (
    'capture_portal_verifier_native_profile','assert_original_portal_verifier_service',
    'acquire_portal_login_source','insert_portal_reviewed_session',
    'source_write_fence','source_identity_guard','guard_portal_session_issuance',
    'guard_portal_authority','guard_workspace_incarnation_counter','guard_workspace_locator',
    'guard_employee_login_identity')
), all_acl AS (
  SELECT 'DATABASE'::pg_catalog.text AS class,d.oid,0 AS subobject,a.* FROM pg_catalog.pg_database d
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(d.datacl,pg_catalog.acldefault('d',d.datdba))) a
  UNION ALL SELECT 'SCHEMA',n.oid,0,a.* FROM pg_catalog.pg_namespace n
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(n.nspacl,pg_catalog.acldefault('n',n.nspowner))) a
  UNION ALL SELECT 'RELATION',c.oid,0,a.* FROM pg_catalog.pg_class c
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,pg_catalog.acldefault(CASE WHEN c.relkind='S' THEN 's'::pg_catalog."char" ELSE 'r'::pg_catalog."char" END,c.relowner))) a
  UNION ALL SELECT 'COLUMN',c.oid,col.attnum,a.* FROM pg_catalog.pg_attribute col JOIN pg_catalog.pg_class c ON c.oid=col.attrelid
    CROSS JOIN LATERAL pg_catalog.aclexplode(col.attacl) a WHERE col.attnum>0 AND NOT col.attisdropped
  UNION ALL SELECT 'FUNCTION',p.oid,0,a.* FROM pg_catalog.pg_proc p
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
  UNION ALL SELECT 'TYPE',t.oid,0,a.* FROM pg_catalog.pg_type t CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(t.typacl,pg_catalog.acldefault('T',t.typowner))) a
  UNION ALL SELECT 'LANGUAGE',l.oid,0,a.* FROM pg_catalog.pg_language l CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(l.lanacl,pg_catalog.acldefault('l',l.lanowner))) a
  UNION ALL SELECT 'TABLESPACE',t.oid,0,a.* FROM pg_catalog.pg_tablespace t CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(t.spcacl,pg_catalog.acldefault('t',t.spcowner))) a
  UNION ALL SELECT 'FDW',f.oid,0,a.* FROM pg_catalog.pg_foreign_data_wrapper f CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(f.fdwacl,pg_catalog.acldefault('F',f.fdwowner))) a
  UNION ALL SELECT 'SERVER',s.oid,0,a.* FROM pg_catalog.pg_foreign_server s CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(s.srvacl,pg_catalog.acldefault('S',s.srvowner))) a
  UNION ALL SELECT 'DEFAULT_ACL',d.oid,0,a.* FROM pg_catalog.pg_default_acl d CROSS JOIN LATERAL pg_catalog.aclexplode(d.defaclacl) a
  UNION ALL SELECT 'PARAMETER',p.oid,0,a.* FROM pg_catalog.pg_parameter_acl p CROSS JOIN LATERAL pg_catalog.aclexplode(p.paracl) a
  UNION ALL SELECT 'LARGE_OBJECT',l.oid,0,a.* FROM pg_catalog.pg_largeobject_metadata l
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(l.lomacl,pg_catalog.acldefault('L',l.lomowner))) a
)
SELECT pg_catalog.jsonb_build_object(
  'databaseOid',(SELECT oid::pg_catalog.text FROM pg_catalog.pg_database WHERE datname=pg_catalog.current_database()),
  'serverVersion',pg_catalog.current_setting('server_version_num'),
  'roles',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(r) ORDER BY r.oid),'[]'::pg_catalog.jsonb)
    FROM pg_catalog.pg_roles r WHERE r.oid IN (p_verifier_oid,p_owner_oid)),
  'schemas',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(n) ORDER BY n.oid),'[]'::pg_catalog.jsonb) FROM pg_catalog.pg_namespace n WHERE n.nspname IN('public','nevora_tenancy')),
  'memberships',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(m) ORDER BY m.roleid,m.member,m.grantor),'[]'::pg_catalog.jsonb)
    FROM pg_catalog.pg_auth_members m WHERE m.roleid IN (p_verifier_oid,p_owner_oid) OR m.member IN (p_verifier_oid,p_owner_oid) OR m.grantor IN (p_verifier_oid,p_owner_oid)),
  'ownership',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(s) ORDER BY s.dbid,s.classid,s.objid,s.objsubid),'[]'::pg_catalog.jsonb)
    FROM pg_catalog.pg_shdepend s WHERE s.refclassid='pg_catalog.pg_authid'::pg_catalog.regclass AND s.refobjid IN (p_verifier_oid,p_owner_oid) AND s.deptype='o'),
  'relations',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('oid',c.oid::pg_catalog.text,'schema',c.nspname,'name',c.relname,'ownerOid',c.relowner::pg_catalog.text,'kind',c.relkind,'persistence',c.relpersistence,'rowTypeOid',c.reltype::pg_catalog.text,'accessMethodOid',c.relam::pg_catalog.text,'tablespaceOid',c.reltablespace::pg_catalog.text,'acl',c.relacl,'options',c.reloptions,'rlsEnabled',c.relrowsecurity,'rlsForced',c.relforcerowsecurity,'replicaIdentity',c.relreplident,'isPartition',c.relispartition,'partitionBound',c.relpartbound::pg_catalog.text) ORDER BY c.nspname COLLATE pg_catalog."C",c.relname COLLATE pg_catalog."C"),'[]'::pg_catalog.jsonb) FROM selected_relations c),
  'columns',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(a) ORDER BY a.attrelid,a.attnum),'[]'::pg_catalog.jsonb) FROM pg_catalog.pg_attribute a JOIN selected_relations c ON c.oid=a.attrelid WHERE a.attnum>0 AND NOT a.attisdropped),
  'defaults',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(d) ORDER BY d.adrelid,d.adnum),'[]'::pg_catalog.jsonb) FROM pg_catalog.pg_attrdef d JOIN selected_relations c ON c.oid=d.adrelid),
  'constraints',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(k) ORDER BY k.conrelid,k.oid),'[]'::pg_catalog.jsonb) FROM pg_catalog.pg_constraint k JOIN selected_relations c ON c.oid=k.conrelid),
  'indexes',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(i) ORDER BY i.indrelid,i.indexrelid),'[]'::pg_catalog.jsonb) FROM pg_catalog.pg_index i JOIN selected_relations c ON c.oid=i.indrelid),
  'triggers',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(t) ORDER BY t.tgrelid,t.oid),'[]'::pg_catalog.jsonb) FROM pg_catalog.pg_trigger t JOIN selected_relations c ON c.oid=t.tgrelid),
  'policies',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('native',pg_catalog.to_jsonb(p),'using',pg_catalog.pg_get_expr(p.polqual,p.polrelid,false),'withCheck',pg_catalog.pg_get_expr(p.polwithcheck,p.polrelid,false)) ORDER BY p.polrelid,p.polname COLLATE pg_catalog."C"),'[]'::pg_catalog.jsonb) FROM pg_catalog.pg_policy p JOIN selected_relations c ON c.oid=p.polrelid),
  'settingsDefinition',pg_catalog.pg_get_viewdef('pg_catalog.pg_settings'::pg_catalog.regclass,false),
  'rules',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(w) ORDER BY w.ev_class,w.oid),'[]'::pg_catalog.jsonb) FROM pg_catalog.pg_rewrite w JOIN selected_relations c ON c.oid=w.ev_class),
  'functions',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('native',pg_catalog.to_jsonb(p),'definition',pg_catalog.pg_get_functiondef(p.oid)) ORDER BY p.proname COLLATE pg_catalog."C",p.oid),'[]'::pg_catalog.jsonb) FROM selected_functions p),
  'dependencies',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(d) ORDER BY d.classid,d.objid,d.objsubid,d.refclassid,d.refobjid,d.refobjsubid,d.deptype),'[]'::pg_catalog.jsonb) FROM pg_catalog.pg_depend d WHERE d.classid='pg_catalog.pg_proc'::pg_catalog.regclass AND d.objid IN (SELECT oid FROM selected_functions)),
  'acl',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(a) ORDER BY a.class COLLATE pg_catalog."C",a.oid,a.subobject,a.grantee,a.grantor,a.privilege_type COLLATE pg_catalog."C"),'[]'::pg_catalog.jsonb) FROM all_acl a WHERE a.grantee IN (0,p_verifier_oid,p_owner_oid)),
  'initialPrivileges',(SELECT COALESCE(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(i) ORDER BY i.classoid,i.objoid,i.objsubid),'[]'::pg_catalog.jsonb) FROM pg_catalog.pg_init_privs i)
);
$verifier_native_profile$;
CREATE FUNCTION nevora_tenancy.assert_original_portal_verifier_service()
RETURNS pg_catalog.void LANGUAGE plpgsql VOLATILE PARALLEL UNSAFE SECURITY INVOKER
SET search_path=pg_catalog
AS $original_portal_verifier$
DECLARE b nevora_tenancy.portal_verifier_service_binding%ROWTYPE; v pg_catalog.pg_roles%ROWTYPE; o pg_catalog.pg_roles%ROWTYPE;
  native_capsule pg_catalog.jsonb; fence_key pg_catalog.int8; database_oid pg_catalog.oid;
BEGIN
  SELECT * INTO STRICT b FROM nevora_tenancy.portal_verifier_service_binding WHERE singleton;
  SELECT * INTO STRICT v FROM pg_catalog.pg_roles WHERE oid=b.verifier_role_oid AND rolname=b.verifier_role_name;
  SELECT * INTO STRICT o FROM pg_catalog.pg_roles WHERE oid=b.writer_owner_oid AND rolname=b.writer_owner_name;
  IF session_user::pg_catalog.name<>v.rolname OR current_user::pg_catalog.name<>o.rolname
    OR pg_catalog.current_setting('role')<>'none' OR pg_catalog.current_setting('transaction_isolation')<>'read committed'
    OR NOT v.rolcanlogin OR o.rolcanlogin
    OR v.rolsuper OR v.rolbypassrls OR v.rolcreatedb OR v.rolcreaterole OR v.rolreplication OR v.rolinherit
    OR o.rolsuper OR o.rolbypassrls OR o.rolcreatedb OR o.rolcreaterole OR o.rolreplication OR o.rolinherit
    OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_stat_activity a WHERE a.pid=pg_catalog.pg_backend_pid() AND a.usesysid=v.oid)
    OR EXISTS (SELECT 1 FROM nevora_tenancy.runtime_role_binding r WHERE r.role_oid IN (v.oid,o.oid) OR r.role_name IN(v.rolname,o.rolname))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members m WHERE m.member IN(v.oid,o.oid) OR m.roleid IN(v.oid,o.oid) OR m.grantor IN(v.oid,o.oid))
  THEN RAISE EXCEPTION 'portal_verifier_service_denied' USING ERRCODE='42501'; END IF;
  SELECT oid INTO STRICT database_oid FROM pg_catalog.pg_database WHERE datname=pg_catalog.current_database();
  fence_key:=('x'::pg_catalog.text || pg_catalog.substr(pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to('nevora.runtime.catalog-fence.v1:'::pg_catalog.text || database_oid::pg_catalog.text,'UTF8')),'hex'),1,16))::pg_catalog.bit(64)::pg_catalog.int8;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_locks l WHERE l.locktype='advisory' AND l.database=database_oid
    AND l.pid=pg_catalog.pg_backend_pid() AND l.granted AND l.mode='ShareLock' AND l.objsubid=1
    AND l.classid=((fence_key >> 32) & 4294967295)::pg_catalog.oid AND l.objid=(fence_key & 4294967295)::pg_catalog.oid)
  THEN RAISE EXCEPTION 'portal_verifier_service_denied' USING ERRCODE='42501'; END IF;
  -- Owner's only ownership is its three exact reviewed native functions.
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_shdepend d WHERE d.refclassid='pg_catalog.pg_authid'::pg_catalog.regclass
    AND d.refobjid IN(v.oid,o.oid) AND d.deptype='o' AND NOT (d.refobjid=o.oid AND d.dbid=database_oid
      AND d.classid='pg_catalog.pg_proc'::pg_catalog.regclass AND d.objid IN (
        'nevora_tenancy.assert_original_portal_verifier_service()'::pg_catalog.regprocedure,
        'nevora_tenancy.acquire_portal_login_source(text,text)'::pg_catalog.regprocedure,
        'nevora_tenancy.insert_portal_reviewed_session(text,text,text,jsonb)'::pg_catalog.regprocedure)))
  THEN RAISE EXCEPTION 'portal_verifier_service_denied' USING ERRCODE='42501'; END IF;
  -- Fixed finite effective column envelope; table-level DML and all unrelated
  -- column authority are denied. Exact current ACL/source/RLS capsule follows.
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_database d WHERE pg_catalog.has_database_privilege(v.oid,d.oid,'CREATE,TEMPORARY') OR pg_catalog.has_database_privilege(o.oid,d.oid,'CREATE,TEMPORARY'))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_namespace n WHERE pg_catalog.has_schema_privilege(v.oid,n.oid,'CREATE') OR pg_catalog.has_schema_privilege(o.oid,n.oid,'CREATE'))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_tablespace t WHERE pg_catalog.has_tablespace_privilege(v.oid,t.oid,'CREATE') OR pg_catalog.has_tablespace_privilege(o.oid,t.oid,'CREATE'))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_class c WHERE c.relkind='S' AND (pg_catalog.has_sequence_privilege(v.oid,c.oid,'USAGE,UPDATE') OR pg_catalog.has_sequence_privilege(o.oid,c.oid,'USAGE,UPDATE')))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_class c WHERE c.relkind IN('r','p','v','m','f') AND c.oid<>'pg_catalog.pg_settings'::pg_catalog.regclass AND (
      pg_catalog.has_table_privilege(v.oid,c.oid,'INSERT,UPDATE,DELETE,REFERENCES,TRUNCATE,TRIGGER,MAINTAIN')
      OR pg_catalog.has_any_column_privilege(v.oid,c.oid,'INSERT,UPDATE,REFERENCES')
      OR pg_catalog.has_table_privilege(o.oid,c.oid,'INSERT,UPDATE,DELETE,REFERENCES,TRUNCATE,TRIGGER,MAINTAIN')
      OR pg_catalog.has_any_column_privilege(o.oid,c.oid,'REFERENCES')))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid
      JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE a.attnum>0 AND NOT a.attisdropped AND c.relkind IN('r','p','v','m','f') AND c.oid<>'pg_catalog.pg_settings'::pg_catalog.regclass AND (
        (pg_catalog.has_column_privilege(o.oid,c.oid,a.attnum,'INSERT') AND (n.nspname,c.relname,a.attname) NOT IN (
          ('public','employee_sessions','token_hash'),('public','employee_sessions','employee_id'),('public','employee_sessions','expires_at'),
          ('nevora_tenancy','portal_session_issuance','token_hash'),('nevora_tenancy','portal_session_issuance','workspace_id'),('nevora_tenancy','portal_session_issuance','employee_id'),
          ('nevora_tenancy','portal_session_issuance','workspace_incarnation'),('nevora_tenancy','portal_session_issuance','portal_access_version'),('nevora_tenancy','portal_session_issuance','session_created_at')))
        OR (pg_catalog.has_column_privilege(o.oid,c.oid,a.attnum,'UPDATE') AND (n.nspname,c.relname,a.attname) NOT IN (
          ('public','workspaces','id'),('public','employees','id'),('public','employee_credentials','employee_id'),
          ('public','employee_sessions','token_hash'),
          ('nevora_tenancy','employee_login_identity','employee_id'),('nevora_tenancy','workspace_incarnation_counter','workspace_id'),('nevora_tenancy','portal_authority','workspace_id')))))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_default_acl d WHERE d.defaclrole IN(v.oid,o.oid))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_parameter_acl p CROSS JOIN LATERAL pg_catalog.aclexplode(p.paracl) a WHERE a.grantee IN(0,v.oid,o.oid))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_largeobject_metadata l WHERE l.lomowner IN(v.oid,o.oid)
      OR EXISTS (SELECT 1 FROM pg_catalog.aclexplode(COALESCE(l.lomacl,pg_catalog.acldefault('L',l.lomowner))) a WHERE a.grantee IN(0,v.oid,o.oid) AND a.privilege_type IN('SELECT','UPDATE')))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_foreign_data_wrapper f WHERE pg_catalog.has_foreign_data_wrapper_privilege(v.oid,f.oid,'USAGE') OR pg_catalog.has_foreign_data_wrapper_privilege(o.oid,f.oid,'USAGE'))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_foreign_server s WHERE pg_catalog.has_server_privilege(v.oid,s.oid,'USAGE') OR pg_catalog.has_server_privilege(o.oid,s.oid,'USAGE'))
  THEN RAISE EXCEPTION 'portal_verifier_service_denied' USING ERRCODE='42501'; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname NOT IN('pg_catalog','information_schema') AND (
      (pg_catalog.has_function_privilege(v.oid,p.oid,'EXECUTE') AND p.oid NOT IN(
        'nevora_tenancy.acquire_portal_login_source(text,text)'::pg_catalog.regprocedure,
        'nevora_tenancy.insert_portal_reviewed_session(text,text,text,jsonb)'::pg_catalog.regprocedure))
      OR (pg_catalog.has_function_privilege(o.oid,p.oid,'EXECUTE') AND p.oid NOT IN(
        'nevora_tenancy.capture_portal_verifier_native_profile(oid,oid)'::pg_catalog.regprocedure,
        'nevora_tenancy.assert_original_portal_verifier_service()'::pg_catalog.regprocedure,
        'nevora_tenancy.acquire_portal_login_source(text,text)'::pg_catalog.regprocedure,
        'nevora_tenancy.insert_portal_reviewed_session(text,text,text,jsonb)'::pg_catalog.regprocedure))))
  THEN RAISE EXCEPTION 'portal_verifier_service_denied' USING ERRCODE='42501'; END IF;
  -- No verifier source SELECT at all. Writer SELECT is only the finite
  -- acquisition/locking/trigger footprint; catalog stock reads are separate.
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE a.attnum>0 AND NOT a.attisdropped
      AND c.relkind IN('r','p','v','m','f') AND n.nspname NOT IN('pg_catalog','information_schema') AND (
        pg_catalog.has_column_privilege(v.oid,c.oid,a.attnum,'SELECT') OR
        (pg_catalog.has_column_privilege(o.oid,c.oid,a.attnum,'SELECT') AND (n.nspname,c.relname,a.attname) NOT IN (
          ('public','workspaces','id'),('public','workspaces','active'),('public','workspaces','updated_at'),
          ('public','employees','id'),('public','employees','workspace_id'),('public','employees','active'),('public','employees','updated_at'),
          ('public','employee_credentials','employee_id'),('public','employee_credentials','password_hash'),('public','employee_credentials','must_change_password'),('public','employee_credentials','password_updated_at'),
          ('public','employee_sessions','token_hash'),('public','employee_sessions','employee_id'),('public','employee_sessions','expires_at'),('public','employee_sessions','created_at'),
          ('nevora_tenancy','employee_login_identity','employee_id'),('nevora_tenancy','employee_login_identity','workspace_id'),('nevora_tenancy','employee_login_identity','employee_number'),('nevora_tenancy','employee_login_identity','normalized_number'),
          ('nevora_tenancy','workspace_locator','workspace_id'),('nevora_tenancy','workspace_locator','locator_code'),
          ('nevora_tenancy','workspace_incarnation_counter','workspace_id'),('nevora_tenancy','workspace_incarnation_counter','incarnation'),
          ('nevora_tenancy','portal_authority','workspace_id'),('nevora_tenancy','portal_authority','employee_id'),('nevora_tenancy','portal_authority','authorization_version'),('nevora_tenancy','portal_authority','portal_access_version'),
          ('nevora_tenancy','portal_authority','capability_policy_revision'),('nevora_tenancy','portal_authority','portal_state'),('nevora_tenancy','portal_authority','proof_provenance'),('nevora_tenancy','portal_authority','provenance_reference'),
          ('nevora_tenancy','portal_session_issuance','token_hash'),('nevora_tenancy','portal_session_issuance','workspace_id'),('nevora_tenancy','portal_session_issuance','employee_id'),('nevora_tenancy','portal_session_issuance','workspace_incarnation'),('nevora_tenancy','portal_session_issuance','portal_access_version'),('nevora_tenancy','portal_session_issuance','session_created_at'),
          ('nevora_tenancy','portal_verifier_service_binding','singleton'),('nevora_tenancy','portal_verifier_service_binding','verifier_role_oid'),('nevora_tenancy','portal_verifier_service_binding','verifier_role_name'),
          ('nevora_tenancy','portal_verifier_service_binding','writer_owner_oid'),('nevora_tenancy','portal_verifier_service_binding','writer_owner_name'),('nevora_tenancy','portal_verifier_service_binding','native_capsule'),
          ('nevora_tenancy','runtime_role_binding','kind'),('nevora_tenancy','runtime_role_binding','role_name'),('nevora_tenancy','runtime_role_binding','role_oid'),
          ('nevora_tenancy','runtime_role_binding','pg_settings_oid'),('nevora_tenancy','runtime_role_binding','pg_settings_definition'),('nevora_tenancy','runtime_role_binding','pg_settings_rules')))))
  THEN RAISE EXCEPTION 'portal_verifier_service_denied' USING ERRCODE='42501'; END IF;
  -- Explicit catalog-call broadening beyond native stock PUBLIC EXECUTE denies.
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='pg_catalog' AND (pg_catalog.has_function_privilege(v.oid,p.oid,'EXECUTE') OR pg_catalog.has_function_privilege(o.oid,p.oid,'EXECUTE'))
      AND NOT EXISTS (SELECT 1 FROM pg_catalog.aclexplode(COALESCE((SELECT i.initprivs FROM pg_catalog.pg_init_privs i
        WHERE i.classoid='pg_catalog.pg_proc'::pg_catalog.regclass AND i.objoid=p.oid AND i.objsubid=0),pg_catalog.acldefault('f',p.proowner))) a
        WHERE a.grantee=0 AND a.privilege_type='EXECUTE' AND NOT a.is_grantable))
  THEN RAISE EXCEPTION 'portal_verifier_service_denied' USING ERRCODE='42501'; END IF;
  native_capsule:=nevora_tenancy.capture_portal_verifier_native_profile(v.oid,o.oid);
  IF EXISTS (SELECT 1 FROM pg_catalog.jsonb_array_elements(native_capsule->'acl') acl(value)
    WHERE (acl.value->>'is_grantable')::pg_catalog.bool AND NOT (acl.value->>'class'='FUNCTION'
      AND (acl.value->>'grantee')::pg_catalog.oid=o.oid AND (acl.value->>'oid')::pg_catalog.oid IN (
        'nevora_tenancy.assert_original_portal_verifier_service()'::pg_catalog.regprocedure,
        'nevora_tenancy.acquire_portal_login_source(text,text)'::pg_catalog.regprocedure,
        'nevora_tenancy.insert_portal_reviewed_session(text,text,text,jsonb)'::pg_catalog.regprocedure)))
    OR native_capsule IS DISTINCT FROM b.native_capsule THEN
    RAISE EXCEPTION 'portal_verifier_service_denied' USING ERRCODE='42501';
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'portal_verifier_service_denied' USING ERRCODE='42501';
END;
$original_portal_verifier$;
CREATE FUNCTION nevora_tenancy.acquire_portal_login_source(p_locator pg_catalog.text,p_normalized_number pg_catalog.text)
RETURNS pg_catalog.jsonb LANGUAGE plpgsql VOLATILE PARALLEL UNSAFE SECURITY DEFINER
SET search_path=pg_catalog
AS $portal_login_acquire$
DECLARE selected_workspace_id pg_catalog.text; selected_employee_id pg_catalog.text; observed pg_catalog.jsonb;
BEGIN
  PERFORM nevora_tenancy.assert_original_portal_verifier_service();
  -- This is selector resolution, NOT authentication. Neither input is a global ID.
  SELECT l.workspace_id INTO STRICT selected_workspace_id FROM nevora_tenancy.workspace_locator l
    WHERE l.locator_code COLLATE pg_catalog."C"=p_locator COLLATE pg_catalog."C";
  PERFORM w.id FROM public.workspaces w WHERE w.id=selected_workspace_id
    AND pg_catalog.convert_to(w.id,'UTF8')=pg_catalog.convert_to(selected_workspace_id,'UTF8') FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'portal_login_source_missing' USING ERRCODE='55000'; END IF;
  SELECT m.employee_id INTO STRICT selected_employee_id FROM nevora_tenancy.employee_login_identity m
    WHERE m.workspace_id=selected_workspace_id AND pg_catalog.convert_to(m.workspace_id,'UTF8')=pg_catalog.convert_to(selected_workspace_id,'UTF8')
      AND m.normalized_number COLLATE pg_catalog."C"=p_normalized_number COLLATE pg_catalog."C" FOR SHARE;
  PERFORM e.id FROM public.employees e WHERE e.id=selected_employee_id AND e.workspace_id=selected_workspace_id
    AND pg_catalog.convert_to(e.id,'UTF8')=pg_catalog.convert_to(selected_employee_id,'UTF8')
    AND pg_catalog.convert_to(e.workspace_id,'UTF8')=pg_catalog.convert_to(selected_workspace_id,'UTF8') FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'portal_login_source_missing' USING ERRCODE='55000'; END IF;
  PERFORM c.employee_id FROM public.employee_credentials c WHERE c.employee_id=selected_employee_id
    AND pg_catalog.convert_to(c.employee_id,'UTF8')=pg_catalog.convert_to(selected_employee_id,'UTF8') FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'portal_login_source_missing' USING ERRCODE='55000'; END IF;
  PERFORM c.workspace_id FROM nevora_tenancy.workspace_incarnation_counter c WHERE c.workspace_id=selected_workspace_id
    AND pg_catalog.convert_to(c.workspace_id,'UTF8')=pg_catalog.convert_to(selected_workspace_id,'UTF8') FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'portal_login_source_missing' USING ERRCODE='55000'; END IF;
  PERFORM a.employee_id FROM nevora_tenancy.portal_authority a WHERE a.workspace_id=selected_workspace_id AND a.employee_id=selected_employee_id
    AND pg_catalog.convert_to(a.workspace_id,'UTF8')=pg_catalog.convert_to(selected_workspace_id,'UTF8')
    AND pg_catalog.convert_to(a.employee_id,'UTF8')=pg_catalog.convert_to(selected_employee_id,'UTF8') FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'portal_login_source_missing' USING ERRCODE='55000'; END IF;
  -- Separate fresh statement after ALL waits. Native versions are text, no Number/Date.
  SELECT pg_catalog.jsonb_build_object(
    'workspaceId',w.id,'employeeId',e.id,'employeeNumber',m.employee_number,'normalizedNumber',m.normalized_number,
    'workspaceActive',w.active,'workspaceVersion',w.updated_at::pg_catalog.text,
    'employeeActive',e.active,'employeeVersion',e.updated_at::pg_catalog.text,
    'passwordHash',c.password_hash,'mustChangePassword',c.must_change_password,'credentialVersion',c.password_updated_at::pg_catalog.text,
    'workspaceIncarnation',counter.incarnation::pg_catalog.text,'authorizationVersion',a.authorization_version::pg_catalog.text,
    'portalAccessVersion',a.portal_access_version::pg_catalog.text,'capabilityPolicyRevision',a.capability_policy_revision::pg_catalog.text,
    'portalState',a.portal_state,'proofProvenance',a.proof_provenance,'provenanceReference',a.provenance_reference)
  INTO observed FROM public.workspaces w JOIN public.employees e ON e.workspace_id=w.id
    JOIN nevora_tenancy.employee_login_identity m ON m.employee_id=e.id AND m.workspace_id=w.id
    JOIN public.employee_credentials c ON c.employee_id=e.id
    JOIN nevora_tenancy.workspace_incarnation_counter counter ON counter.workspace_id=w.id
    JOIN nevora_tenancy.portal_authority a ON a.workspace_id=w.id AND a.employee_id=e.id
  WHERE pg_catalog.convert_to(w.id,'UTF8')=pg_catalog.convert_to(selected_workspace_id,'UTF8')
    AND pg_catalog.convert_to(e.id,'UTF8')=pg_catalog.convert_to(selected_employee_id,'UTF8')
    AND m.normalized_number COLLATE pg_catalog."C"=p_normalized_number COLLATE pg_catalog."C";
  IF NOT FOUND OR observed IS NULL THEN RAISE EXCEPTION 'portal_login_source_missing' USING ERRCODE='55000'; END IF;
  RETURN observed;
EXCEPTION WHEN NO_DATA_FOUND OR TOO_MANY_ROWS THEN RAISE EXCEPTION 'portal_login_source_missing' USING ERRCODE='55000';
END;
$portal_login_acquire$;
CREATE FUNCTION nevora_tenancy.insert_portal_reviewed_session(
  p_locator pg_catalog.text,p_normalized_number pg_catalog.text,p_token_hash pg_catalog.text,p_reviewed_sources pg_catalog.jsonb)
RETURNS pg_catalog.jsonb LANGUAGE plpgsql VOLATILE PARALLEL UNSAFE SECURITY DEFINER
SET search_path=pg_catalog
AS $portal_login_insert$
DECLARE observed pg_catalog.jsonb; created pg_catalog.timestamptz; expires pg_catalog.timestamptz;
BEGIN
  PERFORM nevora_tenancy.assert_original_portal_verifier_service();
  observed:=nevora_tenancy.acquire_portal_login_source(p_locator,p_normalized_number);
  IF p_reviewed_sources IS NULL OR observed IS DISTINCT FROM p_reviewed_sources
    OR observed->'workspaceActive' IS DISTINCT FROM 'true'::pg_catalog.jsonb
    OR observed->'employeeActive' IS DISTINCT FROM 'true'::pg_catalog.jsonb
    OR observed->>'portalState' IS DISTINCT FROM 'ENABLED'
    OR observed->>'proofProvenance' NOT IN('LEGACY_UNVERIFIED','VERIFIED')
    OR (observed->>'workspaceIncarnation')::pg_catalog.int8<=0
    OR (observed->>'portalAccessVersion')::pg_catalog.int8<=0
    OR p_token_hash IS NULL OR p_token_hash COLLATE pg_catalog."C" !~ '^[a-f0-9]{64}$'
  THEN RAISE EXCEPTION 'portal_login_source_changed' USING ERRCODE='55000'; END IF;
  -- SQL source equality is NOT scrypt proof. The trusted Node verifier is the
  -- sole EXECUTE grantee and must have verified on THIS still-owning connection.
  -- No must_change_password denial is invented; retain its source value.
  expires:=pg_catalog.clock_timestamp()+INTERVAL '336 hours';
  INSERT INTO public.employee_sessions(token_hash,employee_id,expires_at)
    VALUES(p_token_hash::pg_catalog.bpchar(64),observed->>'employeeId',expires) RETURNING created_at INTO created;
  -- Preserved 0026 statement/identity triggers deny original INSERT in FENCED.
  INSERT INTO nevora_tenancy.portal_session_issuance(token_hash,workspace_id,employee_id,workspace_incarnation,portal_access_version,session_created_at)
    VALUES(p_token_hash::pg_catalog.bpchar(64),observed->>'workspaceId',observed->>'employeeId',
      (observed->>'workspaceIncarnation')::pg_catalog.int8,(observed->>'portalAccessVersion')::pg_catalog.int8,created);
  PERFORM nevora_tenancy.assert_original_portal_verifier_service();
  RETURN pg_catalog.jsonb_build_object('workspaceId',observed->>'workspaceId','employeeId',observed->>'employeeId',
    'createdAt',created::pg_catalog.text,'expiresAt',expires::pg_catalog.text,
    'workspaceIncarnation',observed->>'workspaceIncarnation','portalAccessVersion',observed->>'portalAccessVersion',
    'mustChangePassword',observed->'mustChangePassword');
END;
$portal_login_insert$;
REVOKE ALL ON TABLE nevora_tenancy.portal_verifier_service_binding FROM PUBLIC;
REVOKE ALL ON FUNCTION nevora_tenancy.capture_portal_verifier_native_profile(pg_catalog.oid,pg_catalog.oid) FROM PUBLIC;
REVOKE ALL ON FUNCTION nevora_tenancy.assert_original_portal_verifier_service() FROM PUBLIC;
REVOKE ALL ON FUNCTION nevora_tenancy.acquire_portal_login_source(pg_catalog.text,pg_catalog.text) FROM PUBLIC;
REVOKE ALL ON FUNCTION nevora_tenancy.insert_portal_reviewed_session(pg_catalog.text,pg_catalog.text,pg_catalog.text,pg_catalog.jsonb) FROM PUBLIC;
DO $verifier_private_acl$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,pg_catalog.acldefault('r',c.relowner))) a
    WHERE n.nspname='nevora_tenancy' AND c.relname='portal_verifier_service_binding' AND a.grantee<>c.relowner)
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
      JOIN pg_catalog.pg_attribute col ON col.attrelid=c.oid CROSS JOIN LATERAL pg_catalog.aclexplode(col.attacl) a
      WHERE n.nspname='nevora_tenancy' AND c.relname='portal_verifier_service_binding' AND col.attnum>0 AND NOT col.attisdropped AND a.grantee<>c.relowner)
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
      CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(p.proacl,pg_catalog.acldefault('f',p.proowner))) a
      WHERE n.nspname='nevora_tenancy' AND p.proname IN('capture_portal_verifier_native_profile',
        'assert_original_portal_verifier_service','acquire_portal_login_source','insert_portal_reviewed_session') AND a.grantee<>p.proowner)
  THEN RAISE EXCEPTION 'portal_verifier_installer_acl_invalid' USING ERRCODE='42501'; END IF;
END;
$verifier_private_acl$;
-- Existing schema ACLs are observed/pinned by explicit root-owned enrollment, not
-- silently repaired. This fresh private SOURCE is not the enrollment producer.
COMMIT;
