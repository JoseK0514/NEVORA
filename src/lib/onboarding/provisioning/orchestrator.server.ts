import 'server-only';
import {randomUUID,createHash} from 'node:crypto';
import {workspaceInstanceSecret,type WorkspaceEnrollment} from '../../../../services/commerce/workspace-enrollment';
import {bootstrapPendingCompany,canonicalCompanyManifest,BootstrapCommitUnknown} from '../../company-bootstrap/server';
import {bootstrapManifest} from '../../company-bootstrap/manifest.generated';
import type {EnabledConfig} from '../config.server';
import type {ControlStore} from '../control-store.server';
import {isClosedRecord,parseWorkspaceCommand,registeredEmail} from '../contracts';
import {openOnboardingValue,sealOnboardingValue,validOnboardingToken} from '../crypto.server';
import {currentProvisioningJob,provisioningLeaseFacts,requestIdentity,type ProvisioningLease,type ProvisioningJobRow} from './store.server';
import {classifyProviderFailure,resourceIdentity,resourceMatches,sameProvisionedResource,type ProvisionedResource} from './model';
import {connectBootstrap,runtimeWorkspaceUri} from './connection.server';
import type {ProvisioningProvider,BootstrapConnector} from './provider';
export type ProvisioningReport={state:'complete'|'pending'|'quarantined'|'lease_lost';operationId?:string;stage?:string};
export type ProvisioningDependencies={store:ControlStore;config:EnabledConfig;provider:ProvisioningProvider;connect?:BootstrapConnector;commerce?:{key:string;enroll:(input:WorkspaceEnrollment)=>Promise<void>}};
class LeaseLost extends Error{}
class ResourceRejected extends Error{}
const stateReport=(state:ProvisioningReport['state'],operationId:string,stage:string):ProvisioningReport=>({state,operationId,stage});
export async function runProvisioningJob(lease:ProvisioningLease,deps:ProvisioningDependencies):Promise<ProvisioningReport>{
 const {store,config,provider}=deps;let facts:ReturnType<typeof provisioningLeaseFacts>,row:ProvisioningJobRow;
 try{facts=provisioningLeaseFacts(lease,store);row=await currentProvisioningJob(lease,store);}catch{return {state:'lease_lost'};}
 const report=(state:ProvisioningReport['state'],stage:string)=>stateReport(state,facts.operationId,stage);
 const alive=async()=>{try{return await currentProvisioningJob(lease,store);}catch{throw new LeaseLost();}};
 async function defer(reason:string,seconds=30):Promise<ProvisioningReport>{
  const released=await store.query(`UPDATE nevora_onboarding.provisioning_operations SET lease_token=NULL,lease_expires_at=NULL,not_before=clock_timestamp()+$3::integer*interval '1 second',reason_code=$4,updated_at=clock_timestamp()
   WHERE operation_id=$1 AND lease_token=$2 AND lease_expires_at>clock_timestamp() RETURNING state`,[facts.operationId,facts.token,seconds,reason]);return released.rowCount===1?report('pending',String(released.rows[0].state)):report('lease_lost','LEASE_UNAVAILABLE');
 }
 async function quarantine(reason:string):Promise<ProvisioningReport>{
  try{await alive();await store.transaction(async client=>{
   const p=await client.query("UPDATE nevora_onboarding.provisioning_operations SET state='QUARANTINED',reason_code=$3,lease_token=NULL,lease_expires_at=NULL,version=version+1 WHERE operation_id=$1 AND lease_token=$2 AND lease_expires_at>clock_timestamp() RETURNING workspace_id,environment,incarnation",[facts.operationId,facts.token,reason]);if(p.rowCount!==1)throw new LeaseLost();
   const x=p.rows[0];const w=await client.query("UPDATE nevora_onboarding.workspace_registry SET lifecycle='QUARANTINED',revision=revision+1 WHERE id=$1 AND environment=$2 AND incarnation=$3 AND lifecycle='PROVISIONING'",[x.workspace_id,x.environment,x.incarnation]);if(w.rowCount!==1)throw new LeaseLost();
  });return report('quarantined','RESOURCE_REVIEW_REQUIRED');}catch(error){if(error instanceof LeaseLost)return report('lease_lost','LEASE_UNAVAILABLE');throw error;}
 }
 try{
  if(!config.providerEnabled||row.environment!==config.environment||row.account_ref!==config.providerAccountRef||row.region!==config.region||row.resource_policy_version!==config.resourcePolicyVersion||row.manifest_hash!==bootstrapManifest.hash||(await canonicalCompanyManifest()).hash!==row.manifest_hash)return await quarantine('SOURCE_OR_POLICY_CHANGED');
  const identity=resourceIdentity(requestIdentity(row),config.workspaceTokenKey);if(identity.name!==row.resource_name)return await quarantine('RESOURCE_IDENTITY_CHANGED');
  const raw=openOnboardingValue(row.payload_ciphertext,'workspace-command:'+row.operation_id+':'+row.workspace_id,config.encryptionKey),command=raw?parseWorkspaceCommand(JSON.parse(raw)):null;
  const email=openOnboardingValue(row.registration_email_ciphertext,'registration-email:'+row.registration_id,config.encryptionKey);
  if(!command||command.operationId!==row.operation_id||!registeredEmail(email))return await quarantine('REGISTRATION_SOURCE_UNAVAILABLE');
  const commerce=deps.commerce?{origin:'https://'+command.payload.requestedSlug+'.'+config.portalBaseDomain,instanceSecret:workspaceInstanceSecret(deps.commerce.key,{workspaceId:row.workspace_id,environment:row.environment,incarnation:String(row.incarnation)})}:null;
  let attempt=(await store.query(`SELECT *,dispatched_at::text AS dispatched_text FROM nevora_onboarding.provisioning_attempts WHERE operation_id=$1 ORDER BY attempt DESC LIMIT 1`,[row.operation_id])).rows[0];
  let request=requestIdentity(row,attempt?new Date(attempt.dispatched_text).toISOString():undefined);
  const matches=(r:ProvisionedResource)=>resourceMatches(r,request,identity);
  await alive();const found=await provider.find(request,identity);
  if(found.length>1||found.some(r=>!matches(r)))return await quarantine('FOREIGN_OR_AMBIGUOUS_RESOURCE');
  let resource=row.resource;
  if(resource){
   if(!matches(resource))return await quarantine('RESOURCE_CUSTODY_CHANGED');
   if(found.length===0)return await defer('RESOURCE_LOOKUP_UNAVAILABLE');
   if(found.length!==1||found[0].projectId!==resource.projectId||!sameProvisionedResource(found[0],resource))return await quarantine('RESOURCE_CUSTODY_CHANGED');
  }else if(found.length){
   if(!attempt||attempt.outcome==='REJECTED')return await quarantine('PREEXISTING_RESOURCE');resource=found[0];
   await store.query("UPDATE nevora_onboarding.provisioning_attempts SET outcome='ACCEPTED',resource=$2::jsonb,acknowledged_at=clock_timestamp() WHERE id=$1 AND outcome IN('PENDING','UNKNOWN','ACCEPTED')",[attempt.id,JSON.stringify(resource)]);
  }else{
   if(attempt&&attempt.outcome!=='REJECTED')return await defer('CREATION_UNCONFIRMED',60);
   if(attempt&&(attempt.http_status!==429||attempt.attempt>=3))return await quarantine('PROVIDER_REJECTED');
   await alive();attempt=await store.transaction(async client=>{
    const locked=await client.query('SELECT operation_id FROM nevora_onboarding.provisioning_operations WHERE operation_id=$1 AND lease_token=$2 AND lease_expires_at>clock_timestamp() FOR UPDATE',[row.operation_id,facts.token]);if(locked.rowCount!==1)throw new LeaseLost();
    // Dispatch budget is account-wide across environments and UTC days. Unknown
    // attempts keep their slot; only a confirmed provider rejection releases it.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['nevora-provider-dispatch:'+config.providerAccountRef]);
    const quota=(await client.query(`SELECT count(*)::int AS count FROM nevora_onboarding.provisioning_attempts a JOIN nevora_onboarding.provisioning_operations p ON p.operation_id=a.operation_id WHERE p.account_ref=$1 AND a.outcome<>'REJECTED' AND a.dispatched_at>=(date_trunc('day',clock_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')`,[config.providerAccountRef])).rows[0];
    if(quota.count>=config.maxNewProjectsPerDay)return null;
    const next=(attempt?.attempt??0)+1,id=randomUUID();
    const a=await client.query("INSERT INTO nevora_onboarding.provisioning_attempts(id,operation_id,attempt,outcome) VALUES($1,$2,$3,'PENDING') RETURNING *,dispatched_at::text AS dispatched_text",[id,row.operation_id,next]);
    await client.query("UPDATE nevora_onboarding.provisioning_operations SET state='CREATING',version=version+1 WHERE operation_id=$1",[row.operation_id]);return a.rows[0];
   });
   if(!attempt)return await defer('DAILY_PROJECT_LIMIT',60);
   row=await alive();request=requestIdentity(row,new Date(attempt.dispatched_text).toISOString());
   try{resource=await provider.create(request,identity);}
   catch(error){
    const outcome=classifyProviderFailure(error),status=error&&typeof error==='object'&&'status'in error&&typeof error.status==='number'?error.status:null;
    await store.query("UPDATE nevora_onboarding.provisioning_attempts SET outcome=$2,http_status=$3,acknowledged_at=clock_timestamp() WHERE id=$1 AND outcome='PENDING'",[attempt.id,outcome,status]);
    if(outcome==='REJECTED'&&status!==429)return await quarantine('PROVIDER_REJECTED');const indicated=error&&typeof error==='object'&&'retryAfterSeconds'in error&&typeof error.retryAfterSeconds==='number'?Math.min(900,Math.max(1,error.retryAfterSeconds)):0;return await defer(outcome==='UNKNOWN'?'CREATION_UNCONFIRMED':'PROVIDER_BACKOFF',Math.max(outcome==='UNKNOWN'?60:30,indicated));
   }
   if(!matches(resource))return await quarantine('FOREIGN_RESOURCE_RESPONSE');
   await store.query("UPDATE nevora_onboarding.provisioning_attempts SET outcome='ACCEPTED',resource=$2::jsonb,acknowledged_at=clock_timestamp() WHERE id=$1 AND outcome='PENDING'",[attempt.id,JSON.stringify(resource)]);
  }
  if(!resource)throw new ResourceRejected();
  row=await alive();
  const recorded=await store.query("UPDATE nevora_onboarding.provisioning_operations SET resource=$3::jsonb,state='RESOURCE_READY',version=version+1 WHERE operation_id=$1 AND lease_token=$2 AND lease_expires_at>clock_timestamp() RETURNING operation_id",[row.operation_id,facts.token,JSON.stringify(resource)]);if(recorded.rowCount!==1)throw new LeaseLost();
  const privateRow=(await store.query('SELECT credentials_ciphertext,bootstrap_ciphertext FROM nevora_onboarding.provisioning_private WHERE operation_id=$1',[row.operation_id])).rows[0];
  const desired=openOnboardingValue(privateRow?.credentials_ciphertext,'provisioning-credentials:'+row.environment+':'+row.workspace_id+':'+row.operation_id,config.encryptionKey),credentials=desired?JSON.parse(desired):null;
  if(!isClosedRecord(credentials,['appPassword','workerPassword'])||!validOnboardingToken(credentials.appPassword)||!validOnboardingToken(credentials.workerPassword))return await quarantine('CREDENTIAL_CUSTODY_UNAVAILABLE');
  const appPassword=credentials.appPassword,workerPassword=credentials.workerPassword;
  const credentialPurpose='provisioner-url:'+row.environment+':'+row.workspace_id+':'+row.operation_id;
  let bootstrap=privateRow.bootstrap_ciphertext?openOnboardingValue(privateRow.bootstrap_ciphertext,credentialPurpose,config.encryptionKey):null;
  if(!bootstrap){await alive();bootstrap=await provider.bootstrapCredential(resource);const saved=await store.query('UPDATE nevora_onboarding.provisioning_private s SET bootstrap_ciphertext=$2 FROM nevora_onboarding.provisioning_operations p WHERE s.operation_id=$1 AND p.operation_id=s.operation_id AND p.lease_token=$3 AND p.lease_expires_at>clock_timestamp()',[row.operation_id,sealOnboardingValue(bootstrap,credentialPurpose,config.encryptionKey),facts.token]);if(saved.rowCount!==1)throw new LeaseLost();}
  row=await alive();await store.query("UPDATE nevora_onboarding.provisioning_operations SET state='BOOTSTRAPPING',version=version+1 WHERE operation_id=$1 AND lease_token=$2",[row.operation_id,facts.token]);row=await alive();
  const connection=await (deps.connect??connectBootstrap)(resource,bootstrap);
  let installed:{workspaceId:string;locationId:string;manifestHash:string;commerceProvisionedAt?:string};
  try{installed=await bootstrapPendingCompany(connection.client,{operationId:row.operation_id,workspaceId:row.workspace_id,registrationId:row.registration_id,environment:row.environment,incarnation:String(row.incarnation),providerProjectId:resource.projectId,resourceName:identity.name,commandHash:row.command_hash,payload:command.payload,verifiedEmail:email,databaseName:identity.databaseName,provisionerRole:identity.provisionerRole,app:{name:identity.appRole,password:appPassword},worker:{name:identity.workerRole,password:workerPassword},...(commerce?{commerce:{origin:commerce.origin,instanceSecretHash:createHash('sha256').update(commerce.instanceSecret).digest('hex')}}:{})});}finally{await connection.close();}
  if(installed.workspaceId!==row.workspace_id||installed.manifestHash!==row.manifest_hash)throw new ResourceRejected();
  if(commerce){if(!installed.commerceProvisionedAt)throw new ResourceRejected();await alive();await deps.commerce!.enroll({workspaceId:row.workspace_id,environment:row.environment,incarnation:String(row.incarnation),origin:commerce.origin,providerProjectId:resource.projectId,manifestHash:row.manifest_hash,verifiedEmail:email,businessName:command.payload.businessName,ownerEmployeeId:command.payload.ownerProfile.id,instanceSecret:commerce.instanceSecret,provisionedAt:installed.commerceProvisionedAt});}
  row=await alive();
  await store.transaction(async client=>{
   const current=await client.query("SELECT p.operation_id FROM nevora_onboarding.provisioning_operations p JOIN nevora_onboarding.registrations r ON r.id=p.registration_id JOIN nevora_onboarding.workspace_registry w ON w.id=p.workspace_id WHERE p.operation_id=$1 AND p.lease_token=$2 AND p.lease_expires_at>clock_timestamp() AND r.expires_at>clock_timestamp() AND w.environment=p.environment AND w.incarnation=p.incarnation AND w.lifecycle='PROVISIONING' FOR UPDATE OF p,r,w",[row.operation_id,facts.token]);if(current.rowCount!==1)throw new LeaseLost();
   const refs={APP:randomUUID(),WORKER:randomUUID()};
   for(const [kind,role,password] of [['APP',identity.appRole,appPassword],['WORKER',identity.workerRole,workerPassword]] as const){const ref=refs[kind],uri=runtimeWorkspaceUri(resource,role,password);await client.query('INSERT INTO nevora_onboarding.workspace_secrets(id,workspace_id,environment,incarnation,role_kind,login_role,ciphertext) VALUES($1,$2,$3,$4::bigint,$5,$6,$7)',[ref,row.workspace_id,row.environment,row.incarnation,kind,role,sealOnboardingValue(uri,'workspace-secret:'+row.environment+':'+row.workspace_id+':'+row.incarnation+':'+kind+':'+ref,config.encryptionKey)]);}
   await client.query("UPDATE nevora_onboarding.workspace_registry SET lifecycle='OWNER_ACTIVATION_REQUIRED',provider_project_id=$2,app_secret_ref=$3,app_role_name=$4,worker_secret_ref=$5,worker_role_name=$6,revision=revision+1 WHERE id=$1",[row.workspace_id,resource!.projectId,refs.APP,identity.appRole,refs.WORKER,identity.workerRole]);
   await client.query("UPDATE nevora_onboarding.registrations SET state='OWNER_ACTIVATION_REQUIRED',version=version+1 WHERE id=$1",[row.registration_id]);
   const done=await client.query("UPDATE nevora_onboarding.provisioning_operations SET state='OWNER_ACTIVATION_REQUIRED',lease_token=NULL,lease_expires_at=NULL,reason_code=NULL,version=version+1 WHERE operation_id=$1 AND lease_token=$2 AND lease_expires_at>clock_timestamp() AND EXISTS(SELECT 1 FROM nevora_onboarding.registrations r WHERE r.id=registration_id AND r.expires_at>clock_timestamp())",[row.operation_id,facts.token]);if(done.rowCount!==1)throw new LeaseLost();
  });return report('complete','OWNER_ACTIVATION_REQUIRED');
 }catch(error){
  if(error instanceof LeaseLost)return report('lease_lost','LEASE_UNAVAILABLE');
  // Recover only durable completed publication after an uncertain control commit.
  try{const done=await store.query("SELECT state FROM nevora_onboarding.provisioning_operations WHERE operation_id=$1 AND state='OWNER_ACTIVATION_REQUIRED'",[facts.operationId]);if(done.rows.length===1)return report('complete','OWNER_ACTIVATION_REQUIRED');}catch{/* No read acknowledgement is not evidence of a commit. */}
  if(error instanceof ResourceRejected)return await quarantine('BOOTSTRAP_CUSTODY_CHANGED');
  if(error instanceof BootstrapCommitUnknown)return await defer('BOOTSTRAP_COMMIT_UNCONFIRMED');
  const code=error&&typeof error==='object'&&'code'in error?String(error.code):'';
  if(/^(22|23|42)[0-9A-Z]{3}$/.test(code))return await quarantine('BOOTSTRAP_REQUIRES_REVIEW');
  try{return await defer('SOURCE_UNAVAILABLE');}catch{return report('pending','ACKNOWLEDGEMENT_UNAVAILABLE');}
 }
}
