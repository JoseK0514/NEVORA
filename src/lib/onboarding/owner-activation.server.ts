import 'server-only';
import {randomUUID} from 'node:crypto';
import type {EnabledConfig} from './config.server';
import {ControlCommitUnknown,type ControlStore} from './control-store.server';
import {withVerifiedSignupSession,type VerifiedSignupSession} from './registration.server';
import {isClosedRecord,isOperationId} from './contracts';
import {newOnboardingToken,validOnboardingToken,digestOnboardingProof,sealOnboardingValue,openOnboardingValue} from './crypto.server';
import {resolveWorkspaceBinding,workspaceBindingFacts,type WorkspaceBinding} from '../workspace-routing/resolver.server';
import {assertWorkspaceBindingCurrent} from '../workspace-routing/resolver.server';
import {sealWorkspaceToken,openWorkspaceToken} from '../workspace-routing/token-envelope.server';
import {getWorkspaceDb} from '../workspace-routing/transport.server';
import type {SqlExecutor} from '../notifications/types';
import {hashPassword} from '../auth/password';
import {tryAcquireInvitationPasswordWork} from '../auth/invitations/admission.server';
import {connectBootstrap} from './provisioning/connection.server';
import type {BootstrapConnector} from './provisioning/provider';
import type {ProvisionedResource} from './provisioning/model';

export type BootstrapRedirect={state:'ready';operationId:string;url:string;expiresAt:string}|{state:'pending';operationId:string;pollAfterMs:number}|{state:'invalid'|'unavailable'}|{state:'limited';retryAfterMs:number}|{state:'outcome_unknown';operationId:string};
export type OwnerActivationResult={state:'activated';employeeId:string;nextAction:'SIGN_IN'}|{state:'invalid'|'conflict'|'limited'|'unavailable'}|{state:'outcome_unknown';operationId:string};
const routing=(c:EnabledConfig)=>({...c,tokenKey:c.workspaceTokenKey});
const grantPurpose=(environment:string,workspaceId:string,incarnation:string)=>'owner-grant:'+environment+':'+workspaceId+':'+incarnation;
const custodyPurpose=(operationId:string)=>'owner-grant-request:'+operationId;
/** Signup authority can queue a grant, but cannot write company grant custody or
 * activate credentials. Only the separate provisioner publishes this request. */
export async function requestOwnerBootstrapGrant(session:VerifiedSignupSession,value:unknown,store:ControlStore,config:EnabledConfig):Promise<BootstrapRedirect>{
 if(!isClosedRecord(value,['schemaVersion','operationId'])||value.schemaVersion!==1||!isOperationId(value.operationId))return {state:'invalid'};
 const operationId=value.operationId.toLowerCase();
 try{
  const result=await withVerifiedSignupSession(session,store,async(client,r)=>{
   if(r.environment!==config.environment)return null;
   const p=(await client.query(`SELECT p.workspace_id,p.incarnation::text,w.canonical_origin FROM nevora_onboarding.provisioning_operations p JOIN nevora_onboarding.workspace_registry w ON w.id=p.workspace_id AND w.environment=p.environment AND w.incarnation=p.incarnation WHERE p.registration_id=$1 AND p.state='OWNER_ACTIVATION_REQUIRED' AND w.lifecycle='OWNER_ACTIVATION_REQUIRED' FOR UPDATE OF p`,[r.id])).rows[0];
   if(!p)return null;
   const previous=await client.query(`SELECT *,expires_at::text AS expires,expires_at>clock_timestamp() AS live FROM nevora_onboarding.owner_grant_requests WHERE operation_id=$1 AND registration_id=$2`,[operationId,r.id]);
   if(previous.rows[0])return {...previous.rows[0],origin:p.canonical_origin};
   if((await client.query('SELECT 1 FROM nevora_onboarding.owner_grant_requests WHERE operation_id=$1',[operationId])).rowCount)return null;
   await client.query("UPDATE nevora_onboarding.owner_grant_requests SET state='EXPIRED' WHERE workspace_id=$1 AND expires_at<=clock_timestamp() AND state IN('QUEUED','READY')",[p.workspace_id]);
   const recent=await client.query("SELECT 1 FROM nevora_onboarding.owner_grant_requests WHERE workspace_id=$1 AND (state='QUEUED' OR created_at>clock_timestamp()-interval '1 minute')",[p.workspace_id]);
   if(recent.rowCount)return {limited:true};
   const raw=newOnboardingToken(),digest=digestOnboardingProof(grantPurpose(config.environment,p.workspace_id,p.incarnation),raw,config.workspaceTokenKey);
   await client.query("UPDATE nevora_onboarding.owner_grant_requests SET state='REVOKED' WHERE workspace_id=$1 AND state='READY'",[p.workspace_id]);
   const inserted=await client.query(`INSERT INTO nevora_onboarding.owner_grant_requests(operation_id,registration_id,workspace_id,incarnation,token_digest,token_ciphertext,expires_at) VALUES($1,$2,$3,$4,$5,$6,clock_timestamp()+interval '15 minutes') RETURNING *,expires_at::text AS expires,true AS live`,[operationId,r.id,p.workspace_id,p.incarnation,digest,sealOnboardingValue(raw,custodyPurpose(operationId),config.encryptionKey)]);
   await client.query("UPDATE nevora_onboarding.provisioning_operations SET not_before=clock_timestamp() WHERE registration_id=$1",[r.id]);
   return {...inserted.rows[0],origin:p.canonical_origin};
  });
  if(!result)return {state:'unavailable'};if('limited'in result)return {state:'limited',retryAfterMs:60000};
  if(!result.live||['EXPIRED','REVOKED'].includes(result.state))return {state:'invalid'};
  if(result.state!=='READY')return {state:'pending',operationId,pollAfterMs:1000};
  const binding=await resolveWorkspaceBinding({origin:result.origin},store,routing(config),'BOOTSTRAP');
  const f=workspaceBindingFacts(binding);if(f.record.id!==result.workspace_id||f.record.incarnation!==String(result.incarnation))return {state:'invalid'};
  const raw=openOnboardingValue(result.token_ciphertext,custodyPurpose(operationId),config.encryptionKey);if(!validOnboardingToken(raw))return {state:'unavailable'};
  const envelope=sealWorkspaceToken(binding,'OWNER_BOOTSTRAP',raw,new Date(result.expires).getTime());
  return {state:'ready',operationId,url:result.origin+'/onboarding/activate#proof='+encodeURIComponent(envelope),expiresAt:result.expires};
 }catch(error){return error instanceof ControlCommitUnknown?{state:'outcome_unknown',operationId}:{state:'unavailable'};}
}
/** Uses the same real scrypt format and process work bound as employee claims.
 * No session is issued here; normal sign-in recovers any lost response/cookie. */
export async function activateInitialOwner(binding:WorkspaceBinding,value:unknown,executor:SqlExecutor=getWorkspaceDb(binding),signal?:AbortSignal):Promise<OwnerActivationResult>{
 if(!isClosedRecord(value,['schemaVersion','operationId','proof','password'])||value.schemaVersion!==1||!isOperationId(value.operationId)||typeof value.password!=='string'||value.password.length<8||value.password.length>1024||signal?.aborted)return {state:'invalid'};
 let release:(()=>void)|null=null,attempted=false;
 try{
  const f=await assertWorkspaceBindingCurrent(binding),r=f.record;
  if(!f.config.tokenKey)return {state:'invalid'};
  if(!['APP','BOOTSTRAP'].includes(f.purpose))return {state:'invalid'};
  const raw=openWorkspaceToken(binding,'OWNER_BOOTSTRAP',value.proof);if(!validOnboardingToken(raw))return {state:'invalid'};
  const digest=digestOnboardingProof(grantPurpose(r.environment,r.id,r.incarnation),raw,f.config.tokenKey);
  const commandHash=digestOnboardingProof('owner-activation-command:'+r.id,JSON.stringify({operationId:value.operationId.toLowerCase(),proof:digest,password:value.password}),f.config.tokenKey);
  const values=[r.id,r.environment,r.incarnation,digest,value.operationId.toLowerCase(),commandHash];
  const call=async(hash:string|null)=> (await executor.query<{state:string;employee_id:string|null}>({text:'SELECT * FROM public.onboarding_owner_claim($1,$2,$3::bigint,$4,$5::uuid,$6,$7)',values:[...values,hash]},signal))[0];
  release=tryAcquireInvitationPasswordWork();if(!release)return {state:'unavailable'};
  const admitted=await call(null);
  if(admitted?.state==='activated')return {state:'activated',employeeId:admitted.employee_id!,nextAction:'SIGN_IN'};
  if(admitted?.state!=='admitted')return {state:admitted?.state==='conflict'?'conflict':admitted?.state==='limited'?'limited':'invalid'};
  const hash=await hashPassword(value.password);if(signal?.aborted)return {state:'invalid'};
  attempted=true;const committed=await call(hash);
  if(committed?.state==='activated')return {state:'activated',employeeId:committed.employee_id!,nextAction:'SIGN_IN'};
  return {state:committed?.state==='conflict'?'conflict':'invalid'};
 }catch(error){const code=error&&typeof error==='object'&&'code'in error?String(error.code):'';return attempted&&(!/^[0-9A-Z]{5}$/.test(code)||code.startsWith('08'))?{state:'outcome_unknown',operationId:value.operationId.toLowerCase()}:{state:'unavailable'};}
 finally{release?.();}
}

/** One lease per pending company serializes grant issuance and receipt-driven
 * finalization. Private bootstrap credentials never enter the web handler. */
export async function runOwnerActivationWorker(deps:{store:ControlStore;config:EnabledConfig;connect?:BootstrapConnector}):Promise<{state:'idle'|'pending'|'complete';operationId?:string}>{
 const {store,config}=deps;
 const job=await store.transaction(async client=>{
  const row=(await client.query(`SELECT p.*,p.incarnation::text AS incarnation,r.email_ciphertext FROM nevora_onboarding.provisioning_operations p
   JOIN nevora_onboarding.registrations r ON r.id=p.registration_id AND r.environment=p.environment
   JOIN nevora_onboarding.workspace_registry w ON w.id=p.workspace_id AND w.incarnation=p.incarnation AND w.environment=p.environment
   WHERE p.environment=$1 AND p.account_ref=$2 AND p.region=$3 AND p.resource_policy_version=$4 AND p.state='OWNER_ACTIVATION_REQUIRED'
    AND r.verified_at IS NOT NULL AND r.expires_at>clock_timestamp() AND w.lifecycle='OWNER_ACTIVATION_REQUIRED'
    AND p.not_before<=clock_timestamp() AND (p.lease_expires_at IS NULL OR p.lease_expires_at<=clock_timestamp())
   ORDER BY p.updated_at,p.operation_id LIMIT 1 FOR UPDATE OF r,p,w SKIP LOCKED`,[config.environment,config.providerAccountRef,config.region,config.resourcePolicyVersion])).rows[0];
  if(!row)return null;const token=randomUUID();
  await client.query("UPDATE nevora_onboarding.provisioning_operations SET lease_token=$2,lease_expires_at=clock_timestamp()+interval '120 seconds' WHERE operation_id=$1",[row.operation_id,token]);
  return {...row,token};
 });
 if(!job)return {state:'idle'};
 const alive=async()=>{const q=await store.query(`UPDATE nevora_onboarding.provisioning_operations p SET lease_expires_at=clock_timestamp()+interval '120 seconds' FROM nevora_onboarding.workspace_registry w,nevora_onboarding.registrations r WHERE p.operation_id=$1 AND p.lease_token=$2 AND p.lease_expires_at>clock_timestamp() AND p.state='OWNER_ACTIVATION_REQUIRED' AND w.id=p.workspace_id AND w.environment=p.environment AND w.incarnation=p.incarnation AND w.lifecycle='OWNER_ACTIVATION_REQUIRED' AND r.id=p.registration_id AND r.environment=p.environment AND r.verified_at IS NOT NULL AND r.expires_at>clock_timestamp() RETURNING p.operation_id`,[job.operation_id,job.token]);if(q.rowCount!==1)throw Error('Initial Owner lease unavailable');};
 let connection:Awaited<ReturnType<BootstrapConnector>>|undefined;
 try{
  const resource=job.resource as ProvisionedResource|null;if(!resource)throw Error('Initial Owner resource unavailable');
  const privateRow=(await store.query('SELECT bootstrap_ciphertext FROM nevora_onboarding.provisioning_private WHERE operation_id=$1',[job.operation_id])).rows[0];
  const uri=openOnboardingValue(privateRow?.bootstrap_ciphertext,'provisioner-url:'+job.environment+':'+job.workspace_id+':'+job.operation_id,config.encryptionKey),email=openOnboardingValue(job.email_ciphertext,'registration-email:'+job.registration_id,config.encryptionKey);if(!uri||!email)throw Error('Initial Owner custody unavailable');
  await alive();connection=await (deps.connect??connectBootstrap)(resource,uri);const client=connection.client;
  const target=(await client.query('SELECT current_database() AS database,current_user AS role,session_user AS session_role')).rows[0];if(target?.database!==resource.databaseName||target?.role!==resource.provisionerRole||target?.session_role!==resource.provisionerRole)throw Error('Initial Owner database target unavailable');
  await client.query('BEGIN');
  try{
   await client.query('SELECT workspace_id FROM public.onboarding_workspace_identity WHERE singleton FOR UPDATE');
   const anchor=(await client.query('SELECT * FROM public.onboarding_workspace_identity WHERE workspace_id=$1',[job.workspace_id])).rows[0];
   if(!anchor||anchor.environment!==job.environment||String(anchor.incarnation)!==job.incarnation||anchor.provider_project_id!==resource.projectId||!['OWNER_ACTIVATION_REQUIRED','ACTIVE'].includes(anchor.lifecycle))throw Error('Initial Owner identity changed');
   await client.query('SELECT id FROM public.workspaces WHERE id=$1 AND singleton AND active FOR NO KEY UPDATE',[job.workspace_id]);
   const owner=(await client.query(`SELECT e.*,e.updated_at::text AS exact_version,encode(sha256(convert_to(lower(trim(e.email)),'UTF8')),'hex') AS email_fingerprint,o.state AS initial_state,o.grant_revision::text AS grant_revision FROM public.employees e JOIN public.onboarding_initial_owner o ON o.employee_id=e.id AND o.workspace_id=$1 AND o.registration_id=$2 JOIN public.locations l ON l.id=e.primary_location_id AND l.workspace_id=$1 AND l.active FOR UPDATE OF e,o`,[job.workspace_id,job.registration_id])).rows[0];
   if(!owner||owner.role!=='OWNER'||owner.email!==email)throw Error('Initial Owner target changed');
   const receipt=(await client.query(`SELECT r.operation_id FROM public.onboarding_owner_activation_receipts r JOIN public.employee_credentials c ON c.employee_id=r.employee_id AND c.password_updated_at=r.credential_updated_at JOIN public.onboarding_owner_grants g ON g.id=r.grant_id AND g.registration_id=$3 AND g.incarnation=$4 AND g.consumed_at IS NOT NULL WHERE r.workspace_id=$1 AND r.employee_id=$2`,[job.workspace_id,owner.id,job.registration_id,job.incarnation])).rows[0];
   if(owner.initial_state==='ACTIVATED'){
    if(!owner.active||!receipt)throw Error('Initial Owner activation receipt unavailable');
    await alive();await client.query("UPDATE public.onboarding_workspace_identity SET lifecycle='ACTIVE' WHERE workspace_id=$1",[job.workspace_id]);await client.query('COMMIT');
    await store.transaction(async tx=>{
     const r=await tx.query('SELECT id FROM nevora_onboarding.registrations WHERE id=$1 AND environment=$2 AND verified_at IS NOT NULL AND expires_at>clock_timestamp() FOR UPDATE',[job.registration_id,config.environment]);if(r.rowCount!==1)throw Error('Initial Owner signup expired');
     const p=await tx.query("UPDATE nevora_onboarding.provisioning_operations SET state='ACTIVATED',lease_token=NULL,lease_expires_at=NULL,version=version+1,updated_at=clock_timestamp() WHERE operation_id=$1 AND lease_token=$2 AND lease_expires_at>clock_timestamp() AND state='OWNER_ACTIVATION_REQUIRED' RETURNING workspace_id",[job.operation_id,job.token]);if(p.rowCount!==1)throw Error('Initial Owner lease unavailable');
     const w=await tx.query("UPDATE nevora_onboarding.workspace_registry SET lifecycle='ACTIVE',revision=revision+1 WHERE id=$1 AND incarnation=$2 AND environment=$3 AND lifecycle='OWNER_ACTIVATION_REQUIRED' RETURNING id",[job.workspace_id,job.incarnation,config.environment]);if(w.rowCount!==1)throw Error('Initial Owner registry changed');
     await tx.query("UPDATE nevora_onboarding.registrations SET state='SETUP_IN_PROGRESS',version=version+1 WHERE id=$1",[job.registration_id]);
     await tx.query("UPDATE nevora_onboarding.owner_grant_requests SET state='REVOKED' WHERE workspace_id=$1 AND state IN('QUEUED','READY')",[job.workspace_id]);
    });
    return {state:'complete',operationId:job.operation_id};
   }
   if(owner.active||receipt||anchor.lifecycle!=='OWNER_ACTIVATION_REQUIRED'||(await client.query('SELECT 1 FROM public.employee_credentials WHERE employee_id=$1',[owner.id])).rowCount)throw Error('Initial Owner already has credentials');
   const request=(await store.query("SELECT *,incarnation::text AS incarnation FROM nevora_onboarding.owner_grant_requests WHERE workspace_id=$1 AND registration_id=$2 AND incarnation=$3 AND state='QUEUED' AND expires_at>clock_timestamp() ORDER BY created_at,operation_id LIMIT 1",[job.workspace_id,job.registration_id,job.incarnation])).rows[0];
   if(request){
    const prior=(await client.query('SELECT token_digest,expires_at FROM public.onboarding_owner_grants WHERE operation_id=$1',[request.operation_id])).rows[0];
    if(prior){if(prior.token_digest!==request.token_digest)throw Error('Initial Owner grant receipt changed');}
    else{
     const revision=(BigInt(owner.grant_revision)+BigInt(1)).toString();
     await client.query('UPDATE public.onboarding_owner_grants SET revoked_at=clock_timestamp() WHERE workspace_id=$1 AND revoked_at IS NULL AND consumed_at IS NULL',[job.workspace_id]);
     await client.query('UPDATE public.onboarding_initial_owner SET grant_revision=$2 WHERE workspace_id=$1',[job.workspace_id,revision]);
     await client.query('INSERT INTO public.onboarding_owner_grants(id,workspace_id,operation_id,registration_id,incarnation,revision,token_digest,employee_updated_at,expires_at,email_fingerprint) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[randomUUID(),job.workspace_id,request.operation_id,job.registration_id,job.incarnation,revision,request.token_digest,owner.exact_version,request.expires_at,owner.email_fingerprint]);
    }
    await alive();await client.query('COMMIT');await alive();
    await store.query("UPDATE nevora_onboarding.owner_grant_requests g SET state='READY' FROM nevora_onboarding.provisioning_operations p WHERE g.operation_id=$1 AND g.state='QUEUED' AND g.expires_at>clock_timestamp() AND p.workspace_id=g.workspace_id AND p.incarnation=g.incarnation AND p.operation_id=$2 AND p.lease_token=$3 AND p.lease_expires_at>clock_timestamp()",[request.operation_id,job.operation_id,job.token]);
   }else await client.query('COMMIT');
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
 }catch{/* Both store gaps are fail-closed; the next lease recovers exact receipts. */
  await store.query("UPDATE nevora_onboarding.provisioning_operations SET reason_code='OWNER_ACTIVATION_RECONCILING' WHERE operation_id=$1 AND lease_token=$2 AND lease_expires_at>clock_timestamp()",[job.operation_id,job.token]).catch(()=>{});
 }
 finally{
  await connection?.close().catch(()=>{});
  await store.query("UPDATE nevora_onboarding.provisioning_operations SET lease_token=NULL,lease_expires_at=NULL,not_before=clock_timestamp()+interval '2 seconds',updated_at=clock_timestamp() WHERE operation_id=$1 AND lease_token=$2",[job.operation_id,job.token]).catch(()=>{});
 }
 return {state:'pending',operationId:job.operation_id};
}
