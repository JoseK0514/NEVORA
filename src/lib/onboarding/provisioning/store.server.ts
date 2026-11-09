import 'server-only';
import {randomUUID} from 'node:crypto';
import type {QueryResultRow} from 'pg';
import {bootstrapManifest} from '../../company-bootstrap/manifest.generated';
import type {EnabledConfig} from '../config.server';
import {ControlCommitUnknown,type ControlStore} from '../control-store.server';
import {parseWorkspaceCommand,isOperationId,type OnboardingResult,type OnboardingSnapshot} from '../contracts';
import {digestOnboardingProof,sealOnboardingValue,newOnboardingToken} from '../crypto.server';
import {withVerifiedSignupSession,type VerifiedSignupSession} from '../registration.server';
import {resourceIdentity,type ResourceRequest,type ProvisionedResource} from './model';
const unavailable=(reasonCode='SOURCE_UNAVAILABLE'):OnboardingResult=>({state:'unavailable',reasonCode});
export type ProvisioningJobRow=QueryResultRow&{operation_id:string;registration_id:string;workspace_id:string;environment:ResourceRequest['environment'];incarnation:string;command_hash:string;payload_ciphertext:string;account_ref:string;region:string;resource_policy_version:string;resource_name:string;state:string;manifest_hash:string;resource:ProvisionedResource|null;created_at:Date;lease_token:string;registration_email_ciphertext:string};
const ready=(c:EnabledConfig)=>c.providerEnabled&&c.maxNewProjectsPerDay>0&&!!c.providerAccountRef&&!!c.resourcePolicyVersion;
export function requestIdentity(row:ProvisioningJobRow,createdAt?:string):ResourceRequest{return {operationId:row.operation_id,workspaceId:row.workspace_id,environment:row.environment,accountRef:row.account_ref,region:row.region,createdAt:createdAt??new Date(row.created_at).toISOString()};}
export async function requestWorkspace(session:VerifiedSignupSession,value:unknown,store:ControlStore,config:EnabledConfig):Promise<OnboardingResult>{
 const command=parseWorkspaceCommand(value);if(!command)return {state:'invalid',fieldErrors:[{field:'workspace',code:'INVALID_COMMAND'}]};
 if(!ready(config))return unavailable('PROVISIONING_DISABLED');
 try{return await withVerifiedSignupSession(session,store,async(client,registration):Promise<OnboardingResult>=>{
  if(registration.environment!==config.environment)return unavailable('ACCESS_DENIED');
  const hash=digestOnboardingProof('workspace-command:'+registration.id,JSON.stringify(command),config.workspaceTokenKey);
  const prior=await client.query('SELECT command_hash,state FROM nevora_onboarding.provisioning_operations WHERE operation_id=$1 AND registration_id=$2',[command.operationId,registration.id]);
  if(prior.rows[0])return prior.rows[0].command_hash===hash?{state:'pending',operationId:command.operationId,stage:prior.rows[0].state,pollAfterMs:1000}:{state:'conflict',reason:'changed_replay'};
  if(registration.version!==command.expectedVersion)return {state:'conflict',reason:'version_changed'};
  if(registration.verified_terms_version!==config.termsVersion||registration.verified_privacy_version!==config.privacyVersion)return {state:'invalid',fieldErrors:[{field:'policies',code:'CURRENT_POLICY_ACCEPTANCE_REQUIRED'}]};
  if(registration.state!=='EMAIL_VERIFIED')return unavailable('BUSINESS_ALREADY_RESERVED');
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",['nevora-project-quota:'+config.environment+':'+config.providerAccountRef]);
  const quota=await client.query("SELECT count(*)::int AS count FROM nevora_onboarding.provisioning_operations WHERE environment=$1 AND account_ref=$2 AND created_at>=(date_trunc('day',clock_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')",[config.environment,config.providerAccountRef]);
  if(quota.rows[0].count>=config.maxNewProjectsPerDay)return {state:'limited',retryAfterMs:86400000};
  const workspaceId=randomUUID(),origin='https://'+command.payload.requestedSlug+'.'+config.portalBaseDomain;
  const identity=resourceIdentity({operationId:command.operationId,workspaceId,environment:config.environment,accountRef:config.providerAccountRef!,region:config.region,createdAt:new Date().toISOString()},config.workspaceTokenKey);
  await client.query("INSERT INTO nevora_onboarding.workspace_registry(id,registration_id,canonical_origin,environment,incarnation,revision,lifecycle) VALUES($1,$2,$3,$4,1,1,'PROVISIONING')",[workspaceId,registration.id,origin,config.environment]);
  await client.query(`INSERT INTO nevora_onboarding.provisioning_operations(operation_id,registration_id,workspace_id,environment,command_hash,payload_ciphertext,account_ref,region,resource_policy_version,resource_name,state,manifest_hash,verified_terms_version,verified_privacy_version)
   VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'RESERVED',$11,$12,$13)`,[command.operationId,registration.id,workspaceId,config.environment,hash,sealOnboardingValue(JSON.stringify(command),'workspace-command:'+command.operationId+':'+workspaceId,config.encryptionKey),config.providerAccountRef,config.region,config.resourcePolicyVersion,identity.name,bootstrapManifest.hash,registration.verified_terms_version,registration.verified_privacy_version]);
  await client.query("UPDATE nevora_onboarding.registrations SET state='WORKSPACE_RESERVED',version=version+1 WHERE id=$1",[registration.id]);
  return {state:'pending',operationId:command.operationId,stage:'RESERVED',pollAfterMs:1000};
 })??unavailable('ACCESS_DENIED');}catch(error){if(error instanceof ControlCommitUnknown)return {state:'outcome_unknown',operationId:command.operationId};if(error&&typeof error==='object'&&'code' in error&&error.code==='23505')return {state:'conflict',reason:'slug_unavailable'};return unavailable();}
}
export async function readProvisioningOperation(session:VerifiedSignupSession,operationId:string,store:ControlStore,config:EnabledConfig):Promise<OnboardingResult>{
 if(operationId!=='current'&&!isOperationId(operationId))return unavailable('ACCESS_DENIED');
 try{return await withVerifiedSignupSession(session,store,async(client,r):Promise<OnboardingResult>=>{
  if(r.environment!==config.environment)return unavailable('ACCESS_DENIED');
  const result=await client.query("SELECT operation_id,state,reason_code,manifest_hash,LEAST(60000,GREATEST(1000,ceil(extract(epoch FROM (not_before-clock_timestamp()))*1000)))::integer AS poll_after FROM nevora_onboarding.provisioning_operations WHERE registration_id=$1"+(operationId==='current'?'':' AND operation_id=$2'),operationId==='current'?[r.id]:[r.id,operationId]);
  if(!result.rows[0])return unavailable('ACCESS_DENIED');if(result.rows[0].state==='QUARANTINED')return unavailable('RESOURCE_REVIEW_REQUIRED');
  const row=result.rows[0];if(!['OWNER_ACTIVATION_REQUIRED','ACTIVATED'].includes(row.state)&&row.manifest_hash!==bootstrapManifest.hash)return unavailable('PROVISIONING_SOURCE_CHANGED');
  return {state:'pending',operationId:row.operation_id,stage:row.reason_code==='CREATION_UNCONFIRMED'?'RECONCILING_RESOURCE':row.state,pollAfterMs:row.poll_after};
 })??unavailable('ACCESS_DENIED');}catch{return unavailable();}
}
export function provisioningSnapshot(registration:{version:string;state:OnboardingSnapshot['registrationState']},workspace:{id:string;displayName:string;portalUrl:string}):OnboardingSnapshot{return {schemaVersion:1,version:registration.version,registrationState:registration.state,workspace,sections:[],nextStep:'BUSINESS'};}
declare const leaseBrand:unique symbol;
export type ProvisioningLease=Readonly<{[leaseBrand]:true}>;
type LeaseFacts=Readonly<{store:ControlStore;operationId:string;token:string}>;
const leases=new WeakMap<object,LeaseFacts>();
export function provisioningLeaseFacts(lease:ProvisioningLease,store:ControlStore):LeaseFacts{const f=lease&&typeof lease==='object'?leases.get(lease):undefined;if(!f||f.store!==store)throw Error('Provisioning lease unavailable');return f;}
export async function claimProvisioningJob(store:ControlStore,config:EnabledConfig):Promise<ProvisioningLease|null>{
 if(!ready(config))return null;
 const claimed=await store.transaction(async client=>{
  const result=await client.query<ProvisioningJobRow>(`SELECT p.* FROM nevora_onboarding.provisioning_operations p JOIN nevora_onboarding.registrations r ON r.id=p.registration_id AND r.environment=p.environment JOIN nevora_onboarding.workspace_registry w ON w.id=p.workspace_id AND w.incarnation=p.incarnation AND w.environment=p.environment AND w.lifecycle='PROVISIONING'
   WHERE p.environment=$1 AND p.account_ref=$2 AND p.region=$3 AND p.resource_policy_version=$4 AND p.manifest_hash=$5
   AND p.state NOT IN('OWNER_ACTIVATION_REQUIRED','ACTIVATED','QUARANTINED') AND p.not_before<=clock_timestamp()
   AND (p.lease_expires_at IS NULL OR p.lease_expires_at<=clock_timestamp()) AND r.verified_at IS NOT NULL AND r.expires_at>clock_timestamp()
   ORDER BY p.created_at,p.operation_id FOR UPDATE OF p SKIP LOCKED LIMIT 1`,[config.environment,config.providerAccountRef,config.region,config.resourcePolicyVersion,bootstrapManifest.hash]);
  if(!result.rows[0])return null;const row=result.rows[0],token=randomUUID();
  await client.query('INSERT INTO nevora_onboarding.provisioning_private(operation_id,credentials_ciphertext) VALUES($1,$2) ON CONFLICT(operation_id) DO NOTHING',[row.operation_id,sealOnboardingValue(JSON.stringify({appPassword:newOnboardingToken(),workerPassword:newOnboardingToken()}),'provisioning-credentials:'+row.environment+':'+row.workspace_id+':'+row.operation_id,config.encryptionKey)]);
  await client.query("UPDATE nevora_onboarding.provisioning_operations SET lease_token=$2,lease_expires_at=clock_timestamp()+interval '120 seconds',version=version+1,updated_at=clock_timestamp() WHERE operation_id=$1",[row.operation_id,token]);
  await client.query("UPDATE nevora_onboarding.registrations SET state='PROVISIONING',version=version+1 WHERE id=$1 AND state='WORKSPACE_RESERVED'",[row.registration_id]);
  return {operationId:row.operation_id,token};
 });
 if(!claimed)return null;const lease=Object.freeze(Object.create(null)) as ProvisioningLease;leases.set(lease,Object.freeze({store,...claimed}));return lease;
}
export async function currentProvisioningJob(lease:ProvisioningLease,store:ControlStore):Promise<ProvisioningJobRow>{
 const f=provisioningLeaseFacts(lease,store);
 const result=await store.query<ProvisioningJobRow>(`UPDATE nevora_onboarding.provisioning_operations p SET lease_expires_at=clock_timestamp()+interval '120 seconds'
  FROM nevora_onboarding.registrations r,nevora_onboarding.workspace_registry w WHERE w.id=p.workspace_id AND w.incarnation=p.incarnation AND w.environment=p.environment AND w.lifecycle='PROVISIONING' AND p.operation_id=$1 AND p.lease_token=$2 AND p.lease_expires_at>clock_timestamp()
   AND r.id=p.registration_id AND r.environment=p.environment AND r.verified_at IS NOT NULL AND r.expires_at>clock_timestamp()
   AND p.state NOT IN('OWNER_ACTIVATION_REQUIRED','ACTIVATED','QUARANTINED') RETURNING p.*,r.email_ciphertext AS registration_email_ciphertext`,[f.operationId,f.token]);
 if(result.rows.length!==1)throw Error('Provisioning lease unavailable');return result.rows[0];
}
