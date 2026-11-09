import 'server-only';
import {hashPassword} from '../auth/password';
import {canonicalCompanyManifest} from '../company-bootstrap/server';
import {bootstrapManifest} from '../company-bootstrap/manifest.generated';
import type {EnabledConfig} from './config.server';
import type {ControlStore} from './control-store.server';
import {isClosedRecord,isOperationId,isRevision} from './contracts';
import {newOnboardingToken,openOnboardingValue} from './crypto.server';
import {connectBootstrap} from './provisioning/connection.server';
import type {BootstrapConnector} from './provisioning/provider';
import type {ProvisionedResource} from './provisioning/model';
export type OperatorResult={state:'suspended'|'retired';incarnation:string}|{state:'unavailable'}|{state:'outcome_unknown';operationId:string};
/** Operator library only: never imported by public APIs or automatic workers. */
export async function suspendOnboardingWorkspace(store:ControlStore,config:EnabledConfig,value:unknown):Promise<OperatorResult>{
 if(!isClosedRecord(value,['workspaceId','expectedRevision'])||!isOperationId(value.workspaceId)||!isRevision(value.expectedRevision))return {state:'unavailable'};
 try{const result=await store.query("UPDATE nevora_onboarding.workspace_registry SET lifecycle='SUSPENDED',revision=revision+1 WHERE id=$1 AND environment=$2 AND revision=$3 AND lifecycle='ACTIVE' RETURNING incarnation::text",[value.workspaceId,config.environment,value.expectedRevision]);return result.rowCount===1?{state:'suspended',incarnation:result.rows[0].incarnation}:{state:'unavailable'};}catch{return {state:'unavailable'};}
}
/** Retire a restored image under suspended control custody. It leaves the
 * company SUSPENDED with old runtime roles/secrets disabled; reactivation is a
 * separately reviewed operator procedure. Replaying the SAME operation recovers
 * its immutable receipt and never rotates a known restored credential again. */
export async function retireRestoredCompany(store:ControlStore,config:EnabledConfig,value:unknown,connect:BootstrapConnector=connectBootstrap):Promise<OperatorResult>{
 if(!isClosedRecord(value,['operationId','workspaceId','fromIncarnation'])||!isOperationId(value.operationId)||!isOperationId(value.workspaceId)||!isRevision(value.fromIncarnation)||value.fromIncarnation==='0'||BigInt(value.fromIncarnation)>=BigInt('9223372036854775807'))return {state:'unavailable'};
 const operationId=value.operationId,workspaceId=value.workspaceId,from=value.fromIncarnation,to=(BigInt(from)+BigInt(1)).toString();let companyCommitAttempted=false;
 try{
  if((await canonicalCompanyManifest()).hash!==bootstrapManifest.hash)return {state:'unavailable'};
  return await store.transaction(async control=>{
   const w=(await control.query("SELECT *,incarnation::text AS incarnation FROM nevora_onboarding.workspace_registry WHERE id=$1 AND environment=$2 AND lifecycle='SUSPENDED' AND incarnation IN($3::bigint,$4::bigint) FOR UPDATE",[workspaceId,config.environment,from,to])).rows[0];if(!w)return {state:'unavailable'};
   const p=(await control.query('SELECT p.*,s.bootstrap_ciphertext FROM nevora_onboarding.provisioning_operations p JOIN nevora_onboarding.provisioning_private s ON s.operation_id=p.operation_id WHERE p.workspace_id=$1 AND p.environment=$2',[workspaceId,config.environment])).rows[0],resource=p?.resource as ProvisionedResource|undefined;
   if(!resource||resource.projectId!==w.provider_project_id)return {state:'unavailable'};
   const uri=openOnboardingValue(p.bootstrap_ciphertext,'provisioner-url:'+p.environment+':'+workspaceId+':'+p.operation_id,config.encryptionKey);if(!uri)return {state:'unavailable'};
   const connection=await connect(resource,uri),client=connection.client;
   try{
    const target=(await client.query('SELECT current_database() AS database,current_user AS role,session_user AS session_role')).rows[0];if(target?.database!==resource.databaseName||target?.role!==resource.provisionerRole||target?.session_role!==resource.provisionerRole)throw Error('Restore target unavailable');
    await client.query('BEGIN');
    try{
     await client.query('SELECT workspace_id FROM public.onboarding_workspace_identity WHERE singleton FOR UPDATE');
     const a=(await client.query('SELECT *,incarnation::text AS incarnation FROM public.onboarding_workspace_identity WHERE workspace_id=$1',[workspaceId])).rows[0];if(!a||a.environment!==config.environment||a.provider_project_id!==resource.projectId)throw Error('Restore anchor unavailable');
     const receipt=(await client.query('SELECT *,from_incarnation::text AS from_incarnation,to_incarnation::text AS to_incarnation FROM public.onboarding_restore_receipts WHERE operation_id=$1',[operationId])).rows[0];
     if(receipt){if(receipt.workspace_id!==workspaceId||receipt.environment!==config.environment||receipt.from_incarnation!==from||receipt.to_incarnation!==to||receipt.provider_project_id!==resource.projectId||receipt.operator_ref!==config.operatorRef||a.incarnation!==to||a.lifecycle!=='SUSPENDED')throw Error('Restore receipt mismatch');}
     else{
      if(w.incarnation!==from||a.incarnation!==from)throw Error('Restore incarnation changed');
      await client.query('SELECT id FROM public.workspaces ORDER BY id FOR UPDATE');await client.query('SELECT id FROM public.employees ORDER BY id FOR UPDATE');
      await client.query("UPDATE public.onboarding_workspace_identity SET lifecycle='SUSPENDED',incarnation=$2 WHERE workspace_id=$1",[workspaceId,to]);
      await client.query('DELETE FROM public.employee_sessions');
      // An unknown random password invalidates restored passwords. Existing
      // recovery remains possible against these credential rows; no secret is returned.
      const unknownHash=await hashPassword(newOnboardingToken());
      await client.query('UPDATE public.employee_credentials SET password_hash=$1,password_updated_at=clock_timestamp(),must_change_password=true',[unknownHash]);
      await client.query('UPDATE public.password_recovery_proofs SET retired_at=clock_timestamp() WHERE used_at IS NULL AND retired_at IS NULL');
      await client.query("UPDATE public.company_invitations SET retired_at=clock_timestamp(),retired_reason='INVALIDATED' WHERE consumed_at IS NULL AND retired_at IS NULL");
      await client.query('UPDATE public.onboarding_owner_grants SET revoked_at=clock_timestamp() WHERE consumed_at IS NULL AND revoked_at IS NULL');
      await client.query('DELETE FROM public.auth_passkey_challenges');
      await client.query("WITH retired AS(UPDATE public.employee_passkeys SET revoked_at=clock_timestamp(),revocation_reason='workspace_restored' WHERE revoked_at IS NULL RETURNING id,employee_id) INSERT INTO public.auth_passkey_audit(employee_id,passkey_id,event,reason) SELECT employee_id,id,'revoke','workspace_restored' FROM retired");
      await client.query('DELETE FROM public.clocker_pin_sessions');
      await client.query('UPDATE public.clocker_devices SET active=false,credential_hash=NULL,enrollment_hash=NULL,enrollment_expires_at=NULL,enrollment_owner_id=NULL,enrollment_session_hash=NULL,revoked_at=clock_timestamp(),credential_version=credential_version+1,version=version+1,updated_at=clock_timestamp()');
      await client.query("UPDATE public.calendar_subscriptions SET revoked_at=clock_timestamp(),revocation_reason='workspace_restored' WHERE revoked_at IS NULL");
      await client.query("UPDATE public.push_subscriptions SET status='detached',encrypted_material=NULL,generation=gen_random_uuid()::text,updated_at=clock_timestamp() WHERE status='active'");
      await client.query("UPDATE public.push_deliveries SET status='cancelled',lease_token=NULL,lease_expires_at=NULL,updated_at=clock_timestamp() WHERE status IN('queued','retry_pending','processing')");
      await client.query('DELETE FROM public.native_push_challenges');
      await client.query("UPDATE public.native_push_installations SET status='detached',encrypted_material=NULL,token_fingerprint=NULL,generation=gen_random_uuid(),updated_at=clock_timestamp() WHERE status='active'");
      await client.query("UPDATE public.native_push_deliveries SET status='cancelled',lease_token=NULL,lease_expires_at=NULL,updated_at=clock_timestamp() WHERE status IN('queued','retry_pending','processing')");
      await client.query("UPDATE public.payroll_jobs SET status='FAILED',lease_token=NULL,lease_until=NULL,error='WORKSPACE_RESTORED_REVIEW_REQUIRED' WHERE status IN('PENDING','RUNNING')");
      await client.query("UPDATE public.onboarding_invitation_items SET state='BLOCKED',result=$1::jsonb,updated_at=clock_timestamp() WHERE state IN('PREPARED','UNKNOWN')",[JSON.stringify({state:'unavailable',reason:'source_unavailable'})]);
      const roles=(await client.query('SELECT login_role::text FROM public.onboarding_runtime_roles')).rows.map(r=>String(r.login_role));
      for(const role of [...new Set([...roles,String(w.app_role_name),String(w.worker_role_name)])]){
       if(!/^nv_(app|worker)_[a-f0-9]{24}$/.test(role))throw Error('Restore runtime role mismatch');
       if((await client.query('SELECT 1 FROM pg_catalog.pg_roles WHERE rolname=$1',[role])).rowCount)await client.query('ALTER ROLE '+role+' NOLOGIN');
      }
      await client.query('INSERT INTO public.onboarding_restore_receipts(operation_id,workspace_id,environment,from_incarnation,to_incarnation,provider_project_id,manifest_hash,operator_ref) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[operationId,workspaceId,config.environment,from,to,resource.projectId,bootstrapManifest.hash,config.operatorRef]);
     }
     companyCommitAttempted=true;await client.query('COMMIT');
    }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
    await control.query('UPDATE nevora_onboarding.workspace_secrets SET active=false WHERE workspace_id=$1 AND environment=$2 AND incarnation<=$3',[workspaceId,config.environment,to]);
    if(w.incarnation===from)await control.query("UPDATE nevora_onboarding.workspace_registry SET incarnation=$2,revision=revision+1 WHERE id=$1 AND lifecycle='SUSPENDED'",[workspaceId,to]);
    return {state:'retired',incarnation:to};
   }finally{await connection.close();}
  });
 }catch{return companyCommitAttempted?{state:'outcome_unknown',operationId}:{state:'unavailable'};}
}
