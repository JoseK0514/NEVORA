import 'server-only';
import {assertMachinePrincipal} from './principal-policy';
import {openWorkerEnrollment,parseWorkerEnrollmentIdentity,type WorkerEnrollmentMaterial} from './worker-enrollment';
import {WorkspaceRoutingError} from '../workspace-routing/config.server';
import {assertWorkspaceBindingCurrent,type WorkspaceBinding} from '../workspace-routing/resolver.server';
/** No plaintext cache: re-audit the actual reader and current encrypted view on
 * every use, including calls that reuse a company driver. */
export async function readWorkerEnrollmentMaterial(binding:WorkspaceBinding,now=Date.now()):Promise<WorkerEnrollmentMaterial>{
 try{
  const f=await assertWorkspaceBindingCurrent(binding),r=f.record,c=f.config;
  if(c.secretScope!=='WORKER_ENROLLED'||f.role!=='WORKER'||f.purpose!=='WORKER'||r.environment!=='test')throw new WorkspaceRoutingError();
  const role=decodeURIComponent(new URL(c.controlDatabaseUrl).username);
  if(role!=='nv_control_worker_t_'+r.id.replaceAll('-',''))throw new WorkspaceRoutingError();
  const material=await f.store.transaction(async client=>{
   const login=(await client.query('SELECT session_user::text AS login,current_user::text AS effective')).rows;
   if(login.length!==1||login[0].login!==role||login[0].effective!==role)throw new WorkspaceRoutingError();
   await assertMachinePrincipal(client,role,'enrolled-worker-reader');
   const rows=(await client.query(`SELECT id::text,workspace_id::text,environment,incarnation::text,source_secret_ref::text,login_role::text,canonical_origin,provider_project_id,recipient_fingerprint,issuer_source_sha,expires_at,key_envelope,ciphertext FROM nevora_onboarding.worker_workspace_enrollment_secrets WHERE id=$1 AND workspace_id=$2 AND environment=$3 AND incarnation=$4::bigint AND source_secret_ref=$5 AND login_role::text=$6 AND canonical_origin=$7 AND provider_project_id=$8`,[c.enrollmentId,r.id,r.environment,r.incarnation,f.secretRef,f.loginRole,r.canonicalOrigin,r.providerProjectId])).rows;
   if(rows.length!==1||rows[0].recipient_fingerprint!==c.recipientFingerprint)throw new WorkspaceRoutingError();const v=rows[0];
   const identity=parseWorkerEnrollmentIdentity({schemaVersion:1,enrollmentId:v.id,workspaceId:v.workspace_id,environment:v.environment,incarnation:v.incarnation,sourceSecretRef:v.source_secret_ref,loginRole:v.login_role,canonicalOrigin:v.canonical_origin,providerProjectId:v.provider_project_id,recipientFingerprint:v.recipient_fingerprint,issuerSourceSha:v.issuer_source_sha,expiresAt:v.expires_at instanceof Date?v.expires_at.toISOString():v.expires_at});
   const opened=openWorkerEnrollment(identity,{schemaVersion:1,keyEnvelope:v.key_envelope,ciphertext:v.ciphertext},c.recipientPrivateKey,now);if(!opened)throw new WorkspaceRoutingError();return opened;
  });
  await assertWorkspaceBindingCurrent(binding);return material;
 }catch{throw new WorkspaceRoutingError();}
}
