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
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_namespace AS n
    CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(n.nspacl,pg_catalog.acldefault('n',n.nspowner))) AS acl
    WHERE n.oid=schema_oid AND (acl.grantee<>installer_oid OR acl.grantor<>installer_oid OR acl.is_grantable))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_class AS c
      CROSS JOIN LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,pg_catalog.acldefault('r',c.relowner))) AS acl
      WHERE c.relnamespace=schema_oid AND c.relname IN ('runtime_role_binding')
        AND (acl.grantee<>installer_oid OR acl.grantor<>installer_oid OR acl.is_grantable))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_class AS c JOIN pg_catalog.pg_attribute AS a ON a.attrelid=c.oid
      CROSS JOIN LATERAL pg_catalog.aclexplode(a.attacl) AS acl
      WHERE c.relnamespace=schema_oid AND c.relname IN ('runtime_role_binding') AND a.attnum>0 AND NOT a.attisdropped
        AND (acl.grantee<>installer_oid OR acl.grantor<>installer_oid OR acl.is_grantable)) THEN
    RAISE EXCEPTION 'helper_installer_control_acl_invalid' USING ERRCODE='55000';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS p WHERE p.pronamespace=schema_oid AND p.proname='assert_runtime_role') THEN
    RAISE EXCEPTION 'helper_installer_duplicate_function' USING ERRCODE='42723';
  END IF;
END;
$helper_installer_prerequisites$;

-- Bounded direct-login role guard. Installation belongs to the privileged
-- installer: create the exact controlled binding table, revoke default PUBLIC
-- privileges and grant named-role USAGE/SELECT/EXECUTE atomically before commit.
-- This source defines only the helper; it grants no authority and proves no
-- tenant/RLS/proof, transport, installed-source or complete least-privilege fact.
-- Missing dependencies/permissions or catalog errors fail closed by error.
-- No callable-definer exception registry is approved for this bounded version.
CREATE FUNCTION nevora_tenancy.assert_runtime_role(requested_kind pg_catalog.text)
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
  SELECT c.oid AS binding_oid, n.oid AS schema_oid,
    pg_catalog.to_regprocedure('nevora_tenancy.assert_runtime_role(text)')::pg_catalog.oid AS helper_oid
  FROM pg_catalog.pg_class AS c
  JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
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
)
SELECT EXISTS (
  SELECT 1 FROM caller AS r CROSS JOIN controlled_catalog AS control
  WHERE
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
    AND pg_catalog.has_function_privilege(r.oid, control.helper_oid, 'EXECUTE')
    AND NOT pg_catalog.has_schema_privilege('public'::pg_catalog.name, control.schema_oid, 'USAGE,CREATE')
    AND NOT pg_catalog.has_table_privilege('public'::pg_catalog.name, control.binding_oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,MAINTAIN')
    AND NOT pg_catalog.has_any_column_privilege('public'::pg_catalog.name, control.binding_oid, 'SELECT,INSERT,UPDATE,REFERENCES')
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
        -- No audited user route exception is installed by this bounded helper.
        OR ((pg_catalog.has_table_privilege(r.oid, c.oid, 'INSERT,UPDATE,DELETE')
          OR pg_catalog.has_any_column_privilege(r.oid, c.oid, 'INSERT,UPDATE')) AND (
          (c.relkind = 'v' AND NOT COALESCE('security_invoker=true' = ANY(c.reloptions), false)
            AND c.oid NOT IN (SELECT settings.oid FROM approved_settings AS settings))
          OR EXISTS (SELECT 1 FROM pg_catalog.pg_rewrite AS w
            WHERE w.ev_class = c.oid AND w.ev_type <> '1' AND w.ev_enabled <> 'D'
              AND c.oid NOT IN (SELECT settings.oid FROM approved_settings AS settings))
          OR EXISTS (SELECT 1 FROM pg_catalog.pg_trigger AS t
            JOIN pg_catalog.pg_proc AS p ON p.oid = t.tgfoid
            WHERE t.tgrelid = c.oid AND NOT t.tgisinternal AND t.tgenabled <> 'D' AND p.prosecdef)
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

REVOKE ALL ON FUNCTION nevora_tenancy.assert_runtime_role(text) FROM PUBLIC;
DO $helper_installer_final$
BEGIN
  -- PUBLIC revoke must not hide named grants inherited from default privileges.
  -- Reject the entire installation; never silently repair unrelated ACLs.
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS p JOIN pg_catalog.pg_namespace AS n ON n.oid=p.pronamespace
    WHERE n.nspname='nevora_tenancy' AND p.proname='assert_runtime_role' AND p.proargtypes='25'::pg_catalog.oidvector
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
