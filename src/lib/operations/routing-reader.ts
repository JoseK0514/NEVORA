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
export function configureWorkerControlReader(admin:PoolClient,role:string):Promise<void>{return configureReader(admin,role,false);}
export function configureEnrolledWorkerControlReader(admin:PoolClient,role:string):Promise<void>{return configureReader(admin,role,true);}
async function configureReader(admin:PoolClient,role:string,enrolled:boolean):Promise<void>{
 if(!(enrolled?/^nv_control_worker_t_[a-f0-9]{32}$/:/^nv_control_worker_[tp]_[a-f0-9]{32}$/).test(role))throw Error('operations_reader_scope_invalid');
 await admin.query('BEGIN');
 try{
  await assertMachinePrincipal(admin,role,enrolled?'enrolled-worker-reader':'worker-reader');
  const scope=`w.environment=CASE WHEN session_user::text ~ '^nv_control_worker_t_[a-f0-9]{32}$' THEN 'test' WHEN session_user::text ~ '^nv_control_worker_p_[a-f0-9]{32}$' THEN 'production' ELSE NULL END AND replace(w.id::text,'-','')=right(session_user::text,32)`;
  await admin.query(`CREATE OR REPLACE VIEW nevora_onboarding.worker_workspace_registry WITH (security_barrier=true) AS
   SELECT w.id,w.registration_id,w.canonical_origin,w.environment,w.incarnation,w.revision,w.lifecycle,w.provider_project_id,w.app_secret_ref,w.app_role_name,w.worker_secret_ref,w.worker_role_name,w.created_at
   FROM nevora_onboarding.workspace_registry w WHERE ${scope} AND w.lifecycle='ACTIVE'`);
  if(enrolled)await admin.query(`CREATE OR REPLACE VIEW nevora_onboarding.worker_workspace_enrollment_secrets WITH (security_barrier=true) AS
   SELECT e.id,e.workspace_id,e.environment,e.incarnation,e.source_secret_ref,e.login_role,e.canonical_origin,e.provider_project_id,e.recipient_fingerprint,e.issuer_source_sha,e.expires_at,e.key_envelope,e.ciphertext
   FROM nevora_onboarding.worker_runtime_enrollments e JOIN nevora_onboarding.worker_workspace_registry w ON w.id=e.workspace_id AND w.environment=e.environment AND w.incarnation=e.incarnation AND w.worker_secret_ref=e.source_secret_ref AND w.worker_role_name=e.login_role AND w.canonical_origin=e.canonical_origin AND w.provider_project_id=e.provider_project_id
   JOIN nevora_onboarding.workspace_secrets s ON s.id=e.source_secret_ref AND s.workspace_id=e.workspace_id AND s.environment=e.environment AND s.incarnation=e.incarnation AND s.login_role=e.login_role AND s.role_kind='WORKER' AND s.active
   WHERE e.status='COMPLETE' AND e.revoked_at IS NULL AND e.expires_at>clock_timestamp()`);
  else await admin.query(`CREATE OR REPLACE VIEW nevora_onboarding.worker_workspace_secrets WITH (security_barrier=true) AS SELECT s.id,s.workspace_id,s.environment,s.incarnation,s.role_kind,s.login_role,s.ciphertext,s.active FROM nevora_onboarding.workspace_secrets s JOIN nevora_onboarding.worker_workspace_registry w ON w.id=s.workspace_id AND w.environment=s.environment AND w.incarnation=s.incarnation AND w.worker_secret_ref=s.id WHERE s.role_kind='WORKER' AND s.active`);
  const secretView=enrolled?'nevora_onboarding.worker_workspace_enrollment_secrets':'nevora_onboarding.worker_workspace_secrets';
  await admin.query(`REVOKE ALL ON nevora_onboarding.worker_workspace_registry,${secretView} FROM PUBLIC`);
  await admin.query(`GRANT USAGE ON SCHEMA nevora_onboarding TO "${role}"; GRANT SELECT ON nevora_onboarding.worker_workspace_registry,${secretView} TO "${role}"`);
  await admin.query('COMMIT');
 }catch{await admin.query('ROLLBACK').catch(()=>{});throw Error('operations_reader_scope_invalid');}
}
