import 'server-only';
import type {PoolClient} from 'pg';

/** Shared metadata-only admission for machine principals. The caller selects a
 * fixed policy, never arbitrary exception objects. PUBLIC defaults and native
 * object ACLs count as effective access. No grant/revoke is performed here. */
export async function assertMachinePrincipal(client:PoolClient,role:string,kind:'monitor'|'worker-reader'|'enrolled-worker-reader'){
 const monitor=kind==='monitor';
 // PostgreSQL's FirstNormalObjectId is 16384 (PG16/17 transam.h). A schema
 // name alone does not establish initdb provenance for later-created objects.
 if(!['monitor','worker-reader','enrolled-worker-reader'].includes(kind)||!(monitor?/^nv_ops_monitor_[a-f0-9]{24}$/:/^nv_control_worker_[tp]_[a-f0-9]{32}$/).test(role))throw Error('machine_principal_invalid');
 const allowed=monitor?['nevora_operations.monitor_state','nevora_operations.monitor_notices','nevora_operations.monitor_attempts']:['nevora_onboarding.worker_workspace_registry',kind==='enrolled-worker-reader'?'nevora_onboarding.worker_workspace_enrollment_secrets':'nevora_onboarding.worker_workspace_secrets'];
 const r=(await client.query(`WITH version AS (SELECT CASE WHEN pg_catalog.current_setting('server_version_num')::int>=170000 THEN ',MAINTAIN' ELSE '' END AS maintain),
  native_relations AS MATERIALIZED (
   SELECT c.oid,c.relowner,c.relacl,coalesce((SELECT i.initprivs FROM pg_catalog.pg_init_privs i WHERE i.classoid='pg_catalog.pg_class'::pg_catalog.regclass AND i.objoid=c.oid AND i.objsubid=0),pg_catalog.acldefault('r',c.relowner)) initial_acl
   FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='pg_catalog' AND c.relkind IN('r','p','v','m','f'))
  SELECT p.rolcanlogin,p.rolsuper,p.rolcreatedb,p.rolcreaterole,p.rolinherit,p.rolreplication,p.rolbypassrls,
  EXISTS(SELECT 1 FROM pg_catalog.pg_auth_members m WHERE m.member=p.oid) memberships,
  pg_catalog.has_database_privilege(p.oid,pg_catalog.current_database(),'CREATE,TEMPORARY') database_create_temp,
  EXISTS(SELECT 1 FROM pg_catalog.pg_namespace n WHERE pg_catalog.has_schema_privilege(p.oid,n.oid,'CREATE')) schema_create,
  EXISTS(SELECT 1 FROM pg_catalog.pg_tablespace t WHERE pg_catalog.has_tablespace_privilege(p.oid,t.oid,'CREATE')) tablespace_create,
  EXISTS(SELECT 1 FROM pg_catalog.pg_shdepend d WHERE d.refclassid='pg_catalog.pg_authid'::pg_catalog.regclass AND d.refobjid=p.oid AND d.deptype='o') owns_objects,
  EXISTS(SELECT 1 FROM pg_catalog.pg_proc f JOIN pg_catalog.pg_namespace n ON n.oid=f.pronamespace WHERE
   (f.prosecdef AND n.nspname<>'pg_catalog' AND pg_catalog.has_function_privilege(p.oid,f.oid,'EXECUTE')) OR
   (n.nspname='pg_catalog' AND f.oid>=16384 AND pg_catalog.has_function_privilege(p.oid,f.oid,'EXECUTE')
    AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_init_privs i WHERE i.classoid='pg_catalog.pg_proc'::pg_catalog.regclass AND i.objoid=f.oid AND i.objsubid=0)
    AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_depend d WHERE d.classid='pg_catalog.pg_proc'::pg_catalog.regclass AND d.objid=f.oid AND d.deptype='e' AND d.refclassid='pg_catalog.pg_extension'::pg_catalog.regclass)) OR
   EXISTS(SELECT 1 FROM pg_catalog.aclexplode(coalesce(f.proacl,pg_catalog.acldefault('f',f.proowner))) a WHERE a.grantee=p.oid AND a.privilege_type='EXECUTE')) callable_function,
  EXISTS(SELECT 1 FROM pg_catalog.pg_proc f JOIN pg_catalog.pg_namespace n ON n.oid=f.pronamespace
   CROSS JOIN LATERAL pg_catalog.aclexplode(coalesce(f.proacl,pg_catalog.acldefault('f',f.proowner))) a
   WHERE n.nspname='pg_catalog' AND a.grantee IN(0,p.oid) AND NOT EXISTS(
    SELECT 1 FROM pg_catalog.aclexplode(coalesce((SELECT i.initprivs FROM pg_catalog.pg_init_privs i WHERE i.classoid='pg_catalog.pg_proc'::pg_catalog.regclass AND i.objoid=f.oid AND i.objsubid=0),pg_catalog.acldefault('f',f.proowner))) b
    WHERE b.grantee=0 AND b.privilege_type=a.privilege_type AND (NOT a.is_grantable OR b.is_grantable))) native_function_access,
  EXISTS(SELECT 1 FROM native_relations c CROSS JOIN LATERAL pg_catalog.aclexplode(coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))) a
   WHERE a.grantee IN(0,p.oid) AND NOT EXISTS(SELECT 1 FROM pg_catalog.aclexplode(c.initial_acl) b WHERE b.grantee=0 AND b.privilege_type=a.privilege_type AND (NOT a.is_grantable OR b.is_grantable))) native_relation_access,
  EXISTS(SELECT 1 FROM native_relations c JOIN pg_catalog.pg_attribute col ON col.attrelid=c.oid
   CROSS JOIN LATERAL pg_catalog.aclexplode(coalesce(col.attacl,pg_catalog.acldefault('c',c.relowner))) a
   WHERE col.attnum>0 AND NOT col.attisdropped AND a.grantee IN(0,p.oid)
    AND NOT EXISTS(SELECT 1 FROM pg_catalog.aclexplode(c.initial_acl) b WHERE b.grantee=0 AND b.privilege_type=a.privilege_type AND (NOT a.is_grantable OR b.is_grantable))
    AND NOT EXISTS(SELECT 1 FROM pg_catalog.aclexplode(coalesce((SELECT i.initprivs FROM pg_catalog.pg_init_privs i WHERE i.classoid='pg_catalog.pg_class'::pg_catalog.regclass AND i.objoid=c.oid AND i.objsubid=col.attnum),pg_catalog.acldefault('c',c.relowner))) b WHERE b.grantee=0 AND b.privilege_type=a.privilege_type AND (NOT a.is_grantable OR b.is_grantable))) native_column_access,
  (EXISTS(SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))) a
    WHERE n.nspname='information_schema' AND a.grantee IN(0,p.oid) AND (c.oid>=16384 OR a.privilege_type<>'SELECT' OR a.is_grantable)) OR
   EXISTS(SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace JOIN pg_catalog.pg_attribute col ON col.attrelid=c.oid
    CROSS JOIN LATERAL pg_catalog.aclexplode(coalesce(col.attacl,pg_catalog.acldefault('c',c.relowner))) a
    WHERE n.nspname='information_schema' AND col.attnum>0 AND NOT col.attisdropped AND a.grantee IN(0,p.oid) AND (c.oid>=16384 OR a.privilege_type<>'SELECT' OR a.is_grantable))) information_schema_access,
  EXISTS(SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN('pg_catalog','information_schema') AND
   CASE WHEN c.relkind IN('r','p','v','m','f') THEN CASE WHEN n.nspname||'.'||c.relname=ANY($2::text[])
    THEN pg_catalog.has_table_privilege(p.oid,c.oid,(CASE WHEN $3::boolean THEN 'DELETE,TRUNCATE,REFERENCES,TRIGGER' ELSE 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER' END)||v.maintain)
     OR pg_catalog.has_any_column_privilege(p.oid,c.oid,CASE WHEN $3::boolean THEN 'REFERENCES' ELSE 'INSERT,UPDATE,REFERENCES' END)
     OR pg_catalog.has_any_column_privilege(p.oid,c.oid,'SELECT WITH GRANT OPTION,INSERT WITH GRANT OPTION,UPDATE WITH GRANT OPTION')
    ELSE pg_catalog.has_table_privilege(p.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'||v.maintain) OR pg_catalog.has_any_column_privilege(p.oid,c.oid,'SELECT,INSERT,UPDATE,REFERENCES') END ELSE false END) extra_access,
  EXISTS(SELECT 1 FROM pg_catalog.pg_class c WHERE CASE WHEN c.relkind='S' THEN pg_catalog.has_sequence_privilege(p.oid,c.oid,'USAGE,SELECT,UPDATE') ELSE false END) sequence_access,
  EXISTS(SELECT 1 FROM pg_catalog.pg_largeobject_metadata l WHERE l.lomowner=p.oid OR EXISTS(SELECT 1 FROM pg_catalog.aclexplode(coalesce(l.lomacl,pg_catalog.acldefault('L',l.lomowner))) a WHERE a.grantee IN(0,p.oid) AND a.privilege_type IN('SELECT','UPDATE'))) large_object_access,
  EXISTS(SELECT 1 FROM pg_catalog.pg_parameter_acl x CROSS JOIN LATERAL pg_catalog.aclexplode(x.paracl) a WHERE a.grantee IN(0,p.oid)) parameter_access,
  (EXISTS(SELECT 1 FROM pg_catalog.pg_foreign_data_wrapper f WHERE pg_catalog.has_foreign_data_wrapper_privilege(p.oid,f.oid,'USAGE')) OR EXISTS(SELECT 1 FROM pg_catalog.pg_foreign_server s WHERE pg_catalog.has_server_privilege(p.oid,s.oid,'USAGE'))) foreign_access
  FROM pg_catalog.pg_roles p CROSS JOIN version v WHERE p.rolname=$1`,[role,allowed,monitor])).rows;
 const forbidden=['rolsuper','rolcreatedb','rolcreaterole','rolinherit','rolreplication','rolbypassrls','memberships','database_create_temp','schema_create','tablespace_create','owns_objects','callable_function','native_function_access','native_relation_access','native_column_access','information_schema_access','extra_access','sequence_access','large_object_access','parameter_access','foreign_access'];
 if(r.length!==1||r[0].rolcanlogin!==true||forbidden.some(k=>r[0][k]!==false))throw Error('machine_principal_invalid');
}
