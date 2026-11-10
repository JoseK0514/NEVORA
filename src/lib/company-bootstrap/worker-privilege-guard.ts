import 'server-only';
import {workerReadRelations,workerInsertRelations,workerUpdateColumns} from './worker-privileges';
const literal=(v:string)=>"'"+v.replaceAll("'","''")+"'";
const names=(items:readonly string[])=>'ARRAY['+items.map(literal).join(',')+']::text[]';
const updates:Record<string,readonly string[]>={...workerUpdateColumns,onboarding_workspace_identity:['lock_token']};
for(const table of ['workspaces','employees','locations','positions','employee_sessions','native_push_challenges'])updates[table]=[...(updates[table]??[]),'onboarding_worker_lock'];
const read=[...workerReadRelations,'onboarding_workspace_identity','onboarding_runtime_roles','nevora_commerce_installation'];
const columnUpdates=Object.entries(updates).map(([table,columns])=>`(c.relname=${literal(table)} AND a.attname=ANY(${names(columns)}))`).join(' OR ');
/** Fixed effective company WORKER policy, derived from the same declarations
 * as bootstrap. PUBLIC/column/grant-option authority counts. Used before
 * issuance and inside both canonical transaction guards, never to repair ACLs. */
export const companyWorkerPrivilegePredicate=`(
 NOT pg_catalog.has_database_privilege(current_user,pg_catalog.current_database(),'CREATE,TEMPORARY')
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_namespace n WHERE pg_catalog.has_schema_privilege(current_user,n.oid,'CREATE'))
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_tablespace t WHERE pg_catalog.has_tablespace_privilege(current_user,t.oid,'CREATE'))
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_shdepend d WHERE d.refclassid='pg_catalog.pg_authid'::pg_catalog.regclass AND d.refobjid=current_user::pg_catalog.regrole AND d.deptype='o')
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN('pg_catalog','information_schema') AND c.relkind IN('r','p','v','m','f') AND (
  pg_catalog.has_table_privilege(current_user,c.oid,'TRUNCATE,REFERENCES,TRIGGER'||CASE WHEN pg_catalog.current_setting('server_version_num')::int>=170000 THEN ',MAINTAIN' ELSE '' END)
  OR pg_catalog.has_table_privilege(current_user,c.oid,'SELECT WITH GRANT OPTION,INSERT WITH GRANT OPTION,UPDATE WITH GRANT OPTION,DELETE WITH GRANT OPTION')
  OR (pg_catalog.has_any_column_privilege(current_user,c.oid,'SELECT') AND NOT(n.nspname='public' AND c.relname=ANY(${names(read)})))
  OR (pg_catalog.has_any_column_privilege(current_user,c.oid,'INSERT') AND NOT(n.nspname='public' AND c.relname=ANY(${names(workerInsertRelations)})))
  OR (pg_catalog.has_table_privilege(current_user,c.oid,'DELETE') AND NOT(n.nspname='public' AND c.relname='native_push_challenges'))
  OR EXISTS(SELECT 1 FROM pg_catalog.pg_attribute a WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped AND (
   pg_catalog.has_column_privilege(current_user,c.oid,a.attnum,'REFERENCES,SELECT WITH GRANT OPTION,INSERT WITH GRANT OPTION,UPDATE WITH GRANT OPTION')
   OR (pg_catalog.has_column_privilege(current_user,c.oid,a.attnum,'UPDATE') AND NOT(n.nspname='public' AND (${columnUpdates})))
  ))
 ))
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='S' AND (
  pg_catalog.has_sequence_privilege(current_user,c.oid,'UPDATE,SELECT WITH GRANT OPTION,USAGE WITH GRANT OPTION')
  OR (n.nspname<>'public' AND pg_catalog.has_sequence_privilege(current_user,c.oid,'SELECT,USAGE'))
 ))
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc fn JOIN pg_catalog.pg_namespace n ON n.oid=fn.pronamespace WHERE n.nspname<>'pg_catalog' AND fn.prosecdef AND pg_catalog.has_function_privilege(current_user,fn.oid,'EXECUTE') AND fn.oid<>'public.onboarding_worker_table_lock(text,text)'::pg_catalog.regprocedure)
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc fn JOIN pg_catalog.pg_namespace n ON n.oid=fn.pronamespace WHERE n.nspname='pg_catalog' AND fn.oid>=16384 AND pg_catalog.has_function_privilege(current_user,fn.oid,'EXECUTE') AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_init_privs i WHERE i.classoid='pg_catalog.pg_proc'::pg_catalog.regclass AND i.objoid=fn.oid AND i.objsubid=0) AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_depend d WHERE d.classid='pg_catalog.pg_proc'::pg_catalog.regclass AND d.objid=fn.oid AND d.deptype='e' AND d.refclassid='pg_catalog.pg_extension'::pg_catalog.regclass))
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_proc fn JOIN pg_catalog.pg_namespace n ON n.oid=fn.pronamespace CROSS JOIN LATERAL pg_catalog.aclexplode(coalesce(fn.proacl,pg_catalog.acldefault('f',fn.proowner))) a WHERE n.nspname='pg_catalog' AND a.grantee IN(0,current_user::pg_catalog.regrole::oid) AND NOT EXISTS(
  SELECT 1 FROM pg_catalog.aclexplode(coalesce((SELECT i.initprivs FROM pg_catalog.pg_init_privs i WHERE i.classoid='pg_catalog.pg_proc'::pg_catalog.regclass AND i.objoid=fn.oid AND i.objsubid=0),pg_catalog.acldefault('f',fn.proowner))) b WHERE b.grantee=0 AND b.privilege_type=a.privilege_type AND (NOT a.is_grantable OR b.is_grantable)
 ))
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL pg_catalog.aclexplode(coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))) a WHERE n.nspname='pg_catalog' AND a.grantee IN(0,current_user::pg_catalog.regrole::oid) AND NOT EXISTS(
  SELECT 1 FROM pg_catalog.aclexplode(coalesce((SELECT i.initprivs FROM pg_catalog.pg_init_privs i WHERE i.classoid='pg_catalog.pg_class'::pg_catalog.regclass AND i.objoid=c.oid AND i.objsubid=0),pg_catalog.acldefault('r',c.relowner))) b WHERE b.grantee=0 AND b.privilege_type=a.privilege_type AND (NOT a.is_grantable OR b.is_grantable)
 ))
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace JOIN pg_catalog.pg_attribute col ON col.attrelid=c.oid CROSS JOIN LATERAL pg_catalog.aclexplode(coalesce(col.attacl,pg_catalog.acldefault('c',c.relowner))) a WHERE n.nspname='pg_catalog' AND col.attnum>0 AND NOT col.attisdropped AND a.grantee IN(0,current_user::pg_catalog.regrole::oid) AND NOT EXISTS(
  SELECT 1 FROM pg_catalog.aclexplode(coalesce((SELECT i.initprivs FROM pg_catalog.pg_init_privs i WHERE i.classoid='pg_catalog.pg_class'::pg_catalog.regclass AND i.objoid=c.oid AND i.objsubid=0),pg_catalog.acldefault('r',c.relowner))) b WHERE b.grantee=0 AND b.privilege_type=a.privilege_type AND (NOT a.is_grantable OR b.is_grantable)
 ) AND NOT EXISTS(SELECT 1 FROM pg_catalog.aclexplode(coalesce((SELECT i.initprivs FROM pg_catalog.pg_init_privs i WHERE i.classoid='pg_catalog.pg_class'::pg_catalog.regclass AND i.objoid=c.oid AND i.objsubid=col.attnum),pg_catalog.acldefault('c',c.relowner))) b WHERE b.grantee=0 AND b.privilege_type=a.privilege_type AND (NOT a.is_grantable OR b.is_grantable)))
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace CROSS JOIN LATERAL pg_catalog.aclexplode(coalesce(c.relacl,pg_catalog.acldefault('r',c.relowner))) a WHERE n.nspname='information_schema' AND a.grantee IN(0,current_user::pg_catalog.regrole::oid) AND (c.oid>=16384 OR a.privilege_type<>'SELECT' OR a.is_grantable))
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace JOIN pg_catalog.pg_attribute col ON col.attrelid=c.oid CROSS JOIN LATERAL pg_catalog.aclexplode(coalesce(col.attacl,pg_catalog.acldefault('c',c.relowner))) a WHERE n.nspname='information_schema' AND col.attnum>0 AND NOT col.attisdropped AND a.grantee IN(0,current_user::pg_catalog.regrole::oid) AND (c.oid>=16384 OR a.privilege_type<>'SELECT' OR a.is_grantable))
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_largeobject_metadata l WHERE l.lomowner=current_user::pg_catalog.regrole OR EXISTS(SELECT 1 FROM pg_catalog.aclexplode(coalesce(l.lomacl,pg_catalog.acldefault('L',l.lomowner))) a WHERE a.grantee IN(0,current_user::pg_catalog.regrole::oid) AND a.privilege_type IN('SELECT','UPDATE')))
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_parameter_acl x CROSS JOIN LATERAL pg_catalog.aclexplode(x.paracl) a WHERE a.grantee IN(0,current_user::pg_catalog.regrole::oid))
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_foreign_data_wrapper x WHERE pg_catalog.has_foreign_data_wrapper_privilege(current_user,x.oid,'USAGE'))
 AND NOT EXISTS(SELECT 1 FROM pg_catalog.pg_foreign_server x WHERE pg_catalog.has_server_privilege(current_user,x.oid,'USAGE'))
)`;
