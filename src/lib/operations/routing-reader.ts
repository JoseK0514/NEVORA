import 'server-only';
import type {PoolClient} from 'pg';
import {isOperationId} from '../onboarding/contracts';
export function workerControlRole(workspaceId:string,environment:'test'|'production'){
 if(!isOperationId(workspaceId)||!['test','production'].includes(environment))throw Error('operations_reader_scope_invalid');
 return 'nv_control_worker_'+(environment==='test'?'t':'p')+'_'+workspaceId.replaceAll('-','');
}
/** Setup only; never imported by a worker/request handler. The caller supplies an
 * acquired operator client and an already approved fresh restricted LOGIN role.
 * No password is created, returned or logged. No existing broad role is adopted. */
export async function configureWorkerControlReader(admin:PoolClient,role:string):Promise<void>{
 if(!/^nv_control_worker_[tp]_[a-f0-9]{32}$/.test(role))throw Error('operations_reader_scope_invalid');
 await admin.query('BEGIN');
 try{
  const {rows}=await admin.query(`SELECT p.rolcanlogin,p.rolsuper,p.rolcreatedb,p.rolcreaterole,p.rolinherit,p.rolreplication,p.rolbypassrls,
   EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=p.oid) AS memberships,
   (EXISTS(SELECT 1 FROM pg_class c WHERE c.relowner=p.oid) OR EXISTS(SELECT 1 FROM pg_namespace n WHERE n.nspowner=p.oid) OR EXISTS(SELECT 1 FROM pg_proc f WHERE f.proowner=p.oid) OR EXISTS(SELECT 1 FROM pg_database d WHERE d.datdba=p.oid)) AS owns_objects,
   EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_%' AND c.relkind IN('r','p','v','m','f') AND
    CASE WHEN n.nspname='nevora_onboarding' AND c.relname IN('worker_workspace_registry','worker_workspace_secrets') THEN has_table_privilege(p.oid,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') ELSE has_table_privilege(p.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') END) AS extra_access
   FROM pg_roles p WHERE p.rolname=$1`,[role]);
  const p=rows[0];if(rows.length!==1||p.rolcanlogin!==true||['rolsuper','rolcreatedb','rolcreaterole','rolinherit','rolreplication','rolbypassrls','memberships','owns_objects','extra_access'].some(k=>p[k]!==false))throw Error('operations_reader_scope_invalid');
  const scope=`w.environment=CASE WHEN session_user::text ~ '^nv_control_worker_t_[a-f0-9]{32}$' THEN 'test' WHEN session_user::text ~ '^nv_control_worker_p_[a-f0-9]{32}$' THEN 'production' ELSE NULL END AND replace(w.id::text,'-','')=right(session_user::text,32)`;
  await admin.query(`CREATE OR REPLACE VIEW nevora_onboarding.worker_workspace_registry WITH (security_barrier=true) AS SELECT w.* FROM nevora_onboarding.workspace_registry w WHERE ${scope} AND w.lifecycle='ACTIVE'`);
  await admin.query(`CREATE OR REPLACE VIEW nevora_onboarding.worker_workspace_secrets WITH (security_barrier=true) AS SELECT s.id,s.workspace_id,s.environment,s.incarnation,s.role_kind,s.login_role,s.ciphertext,s.active FROM nevora_onboarding.workspace_secrets s JOIN nevora_onboarding.worker_workspace_registry w ON w.id=s.workspace_id AND w.environment=s.environment AND w.incarnation=s.incarnation AND w.worker_secret_ref=s.id WHERE s.role_kind='WORKER' AND s.active`);
  await admin.query('REVOKE ALL ON nevora_onboarding.worker_workspace_registry,nevora_onboarding.worker_workspace_secrets FROM PUBLIC');
  await admin.query(`GRANT USAGE ON SCHEMA nevora_onboarding TO "${role}"; GRANT SELECT ON nevora_onboarding.worker_workspace_registry,nevora_onboarding.worker_workspace_secrets TO "${role}"`);
  await admin.query('COMMIT');
 }catch{await admin.query('ROLLBACK').catch(()=>{});throw Error('operations_reader_scope_invalid');}
}
