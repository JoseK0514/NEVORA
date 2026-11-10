import 'server-only';
import type {PoolClient} from 'pg';
import {isOperationId} from '../onboarding/contracts';
import {assertMachinePrincipal} from './principal-policy';
export function workerControlRole(workspaceId:string,environment:'test'|'production'){
 if(!isOperationId(workspaceId)||!['test','production'].includes(environment))throw Error('operations_reader_scope_invalid');
 return 'nv_control_worker_'+(environment==='test'?'t':'p')+'_'+workspaceId.toLowerCase().replaceAll('-','');
}
/** Setup only; never imported by a worker/request handler. The caller supplies an
 * acquired operator client and an already approved fresh restricted LOGIN role.
 * No password is created, returned or logged. No existing broad role is adopted. */
export async function configureWorkerControlReader(admin:PoolClient,role:string):Promise<void>{
 if(!/^nv_control_worker_[tp]_[a-f0-9]{32}$/.test(role))throw Error('operations_reader_scope_invalid');
 await admin.query('BEGIN');
 try{
  await assertMachinePrincipal(admin,role,'worker-reader');
  const scope=`w.environment=CASE WHEN session_user::text ~ '^nv_control_worker_t_[a-f0-9]{32}$' THEN 'test' WHEN session_user::text ~ '^nv_control_worker_p_[a-f0-9]{32}$' THEN 'production' ELSE NULL END AND replace(w.id::text,'-','')=right(session_user::text,32)`;
  await admin.query(`CREATE OR REPLACE VIEW nevora_onboarding.worker_workspace_registry WITH (security_barrier=true) AS
   SELECT w.id,w.registration_id,w.canonical_origin,w.environment,w.incarnation,w.revision,w.lifecycle,w.provider_project_id,w.app_secret_ref,w.app_role_name,w.worker_secret_ref,w.worker_role_name,w.created_at
   FROM nevora_onboarding.workspace_registry w WHERE ${scope} AND w.lifecycle='ACTIVE'`);
  await admin.query(`CREATE OR REPLACE VIEW nevora_onboarding.worker_workspace_secrets WITH (security_barrier=true) AS SELECT s.id,s.workspace_id,s.environment,s.incarnation,s.role_kind,s.login_role,s.ciphertext,s.active FROM nevora_onboarding.workspace_secrets s JOIN nevora_onboarding.worker_workspace_registry w ON w.id=s.workspace_id AND w.environment=s.environment AND w.incarnation=s.incarnation AND w.worker_secret_ref=s.id WHERE s.role_kind='WORKER' AND s.active`);
  await admin.query('REVOKE ALL ON nevora_onboarding.worker_workspace_registry,nevora_onboarding.worker_workspace_secrets FROM PUBLIC');
  await admin.query(`GRANT USAGE ON SCHEMA nevora_onboarding TO "${role}"; GRANT SELECT ON nevora_onboarding.worker_workspace_registry,nevora_onboarding.worker_workspace_secrets TO "${role}"`);
  await admin.query('COMMIT');
 }catch{await admin.query('ROLLBACK').catch(()=>{});throw Error('operations_reader_scope_invalid');}
}
