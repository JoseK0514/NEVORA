import 'server-only';
import {createHash,randomUUID} from 'node:crypto';
import type {PoolClient,QueryResultRow} from 'pg';
import type {EnabledConfig} from './config.server';
import {ControlCommitUnknown,type ControlStore} from './control-store.server';
import {isClosedRecord,isOperationId,parseRegistrationCommand,registeredEmail,type OnboardingResult,type OnboardingSnapshot,type RegistrationState} from './contracts';
import {newOnboardingToken,validOnboardingToken,digestOnboardingProof,sealOnboardingValue,openOnboardingValue} from './crypto.server';
import type {VerificationDelivery,VerificationMessage} from './verification-delivery.server';

export type RegistrationRequestResult={schemaVersion:1;state:'verification_requested';resendAfterMs:number}|Extract<OnboardingResult,{state:'invalid'|'conflict'|'limited'|'unavailable'|'outcome_unknown'}>;
declare const signupBrand:unique symbol;
export type VerifiedSignupSession=Readonly<{[signupBrand]:true}>;
type Custody={store:ControlStore;registrationId:string;tokenDigest:string;environment:string};
const signupCustody=new WeakMap<object,Custody>();
export type VerificationResult={state:'verified';sessionToken:string;session:VerifiedSignupSession;snapshot:OnboardingSnapshot}|{state:'invalid'|'unavailable'}|{state:'outcome_unknown';operationId:string};
type RegistrationRow=QueryResultRow&{id:string;state:RegistrationState;version:string;email_ciphertext:string;environment:string};
const bucket="date_bin(interval '15 minutes',clock_timestamp(),timestamptz '2000-01-01 00:00:00Z')";
const requested=(config:EnabledConfig):RegistrationRequestResult=>({schemaVersion:1,state:'verification_requested',resendAfterMs:config.resendCooldownMs});
const unavailable=():Extract<OnboardingResult,{state:'unavailable'}>=>({state:'unavailable',reasonCode:'SOURCE_UNAVAILABLE'});
function snapshot(row:RegistrationRow):OnboardingSnapshot{return {schemaVersion:1,version:row.version,registrationState:row.state,workspace:null,sections:[],nextStep:null};}
function proof(store:ControlStore,row:RegistrationRow,tokenDigest:string):VerifiedSignupSession{const p=Object.freeze(Object.create(null)) as VerifiedSignupSession;signupCustody.set(p,{store,registrationId:row.id,tokenDigest,environment:row.environment});return p;}
function purpose(kind:string,config:EnabledConfig){return kind+':'+config.environment;}

/** Only a genuine proof for this exact control store can enter a protected command. */
export async function withVerifiedSignupSession<T>(session:VerifiedSignupSession,store:ControlStore,work:(client:PoolClient,row:RegistrationRow)=>Promise<T>):Promise<T|null>{
 if(!session||typeof session!=='object')return null;const c=signupCustody.get(session);if(!c||c.store!==store)return null;
 return store.transaction(async client=>{
  const r=await client.query<RegistrationRow>(`SELECT r.*,r.version::text AS version FROM nevora_onboarding.signup_sessions s JOIN nevora_onboarding.registrations r ON r.id=s.registration_id WHERE s.token_digest=$1 AND r.id=$2 AND s.environment=$3 AND r.environment=$3 AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp() AND r.verified_at IS NOT NULL AND r.expires_at>clock_timestamp() FOR UPDATE OF r,s`,[c.tokenDigest,c.registrationId,c.environment]);
  if(!r.rows[0])return null;const value=await work(client,r.rows[0]);
  const final=await client.query(`SELECT 1 FROM nevora_onboarding.signup_sessions s JOIN nevora_onboarding.registrations r ON r.id=s.registration_id WHERE s.token_digest=$1 AND r.id=$2 AND s.environment=$3 AND r.environment=$3 AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp() AND r.verified_at IS NOT NULL AND r.expires_at>clock_timestamp()`,[c.tokenDigest,c.registrationId,c.environment]);
  if(final.rowCount!==1)throw Error('Signup authority changed before command commit');return value;
 });
}
export async function readRegistration(session:VerifiedSignupSession,store:ControlStore):Promise<OnboardingSnapshot|null>{return withVerifiedSignupSession(session,store,async(_client,row)=>snapshot(row));}
export async function readVerifiedSignupSession(token:string,store:ControlStore,config:EnabledConfig):Promise<VerifiedSignupSession|null>{
 if(!validOnboardingToken(token))return null;const digest=digestOnboardingProof(purpose('signup-session',config),token,config.sessionKey);
 const r=await store.query<RegistrationRow>(`SELECT r.*,r.version::text AS version FROM nevora_onboarding.signup_sessions s JOIN nevora_onboarding.registrations r ON r.id=s.registration_id WHERE s.token_digest=$1 AND s.environment=$2 AND r.environment=$2 AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp() AND r.verified_at IS NOT NULL AND r.expires_at>clock_timestamp()`,[digest,config.environment]);return r.rows[0]?proof(store,r.rows[0],digest):null;
}

async function deliverPrepared(operationId:string,store:ControlStore,delivery:VerificationDelivery,config:EnabledConfig):Promise<void>{
 const claimed=await store.query<{payload_ciphertext:string}>(`UPDATE nevora_onboarding.verification_deliveries SET delivery_state='SENDING',claimed_at=clock_timestamp(),attempts=1 WHERE operation_id=$1 AND delivery_state='PREPARED' AND expires_at>clock_timestamp() AND attempts=0 RETURNING payload_ciphertext`,[operationId]);
 if(!claimed.rows[0])return;
 let state:'PROVIDER_ACCEPTED'|'FAILED'|'UNKNOWN'='UNKNOWN';
 try{const raw=openOnboardingValue(claimed.rows[0].payload_ciphertext,'verification-delivery:'+operationId,config.encryptionKey);const m=raw?JSON.parse(raw):null;
  if(!isClosedRecord(m,['email','proof','locale','expiresAt'])||!registeredEmail(m.email)||!validOnboardingToken(m.proof)||(m.locale!=='en'&&m.locale!=='es')||typeof m.expiresAt!=='string'||!Number.isFinite(Date.parse(m.expiresAt))||Date.parse(m.expiresAt)<=Date.now())state='FAILED';
  else{const sent=await delivery.send(m as VerificationMessage);state=sent.providerAccepted===true?'PROVIDER_ACCEPTED':'UNKNOWN';}
 }catch(error){state=error&&typeof error==='object'&&'deliveryState'in error&&error.deliveryState==='FAILED'?'FAILED':'UNKNOWN';}
 await store.query(`UPDATE nevora_onboarding.verification_deliveries SET delivery_state=$2,payload_ciphertext=NULL,completed_at=clock_timestamp() WHERE operation_id=$1 AND delivery_state='SENDING'`,[operationId,state]);
}

/** Public request receipt intentionally reveals no registration or membership identity. */
export async function requestRegistration(value:unknown,store:ControlStore,delivery:VerificationDelivery|null,config:EnabledConfig,clientAddress:string|null=null):Promise<RegistrationRequestResult>{
 const command=parseRegistrationCommand(value);if(!command)return {state:'invalid',fieldErrors:[{field:'registration',code:'INVALID_FORMAT'}]};
 const policyChanged=command.termsVersion!==config.termsVersion||command.privacyVersion!==config.privacyVersion;
 if(!delivery)return {state:'unavailable',reasonCode:'DELIVERY_UNAVAILABLE'};
 const emailDigest=digestOnboardingProof(purpose('email',config),command.email.toLowerCase(),config.sessionKey),ipDigest=digestOnboardingProof(purpose('ip',config),clientAddress??'UNRESOLVED',config.sessionKey);
 const hash=createHash('sha256').update(JSON.stringify({environment:config.environment,email:command.email.toLowerCase(),locale:command.locale,termsVersion:command.termsVersion,privacyVersion:command.privacyVersion})).digest('hex');
 try{
  const admitted=await store.transaction(async client=>{
   await client.query("SELECT pg_advisory_xact_lock(hashtextextended('nevora.onboarding.registration',0))");
   const old=await client.query('SELECT command_hash,response_kind FROM nevora_onboarding.registration_requests WHERE operation_id=$1',[command.operationId]);
   if(old.rows[0])return old.rows[0].command_hash!==hash?{kind:'conflict' as const}:old.rows[0].response_kind==='QUIET'?{kind:'quiet' as const}:{kind:'deliver' as const};
   if(policyChanged)return {kind:'policy_changed' as const};
   const clock=await client.query<{bucket:string}>(`SELECT ${bucket}::text AS bucket`),window=clock.rows[0].bucket;
   const increment=async(kinds:readonly ('EMAIL'|'IP'|'PLATFORM')[])=>{for(const kind of kinds){const subject=kind==='EMAIL'?emailDigest:kind==='IP'?ipDigest:'';await client.query(`INSERT INTO nevora_onboarding.admission_counters VALUES($1,$2,$3,$4::timestamptz,1) ON CONFLICT(environment,kind,subject_digest,bucket_start) DO UPDATE SET attempts=nevora_onboarding.admission_counters.attempts+1`,[config.environment,kind,subject,window]);}};
   const quiet=async()=>{await increment(['IP','PLATFORM']);await client.query(`INSERT INTO nevora_onboarding.registration_requests(operation_id,registration_id,command_hash,response_kind,terms_version,privacy_version) VALUES($1,(SELECT id FROM nevora_onboarding.registrations WHERE environment=$2 AND email_digest=$3 ORDER BY created_at DESC,id LIMIT 1),$4,'QUIET',$5,$6)`,[command.operationId,config.environment,emailDigest,hash,command.termsVersion,command.privacyVersion]);return {kind:'quiet' as const};};
   for(const [kind,subject,limit] of [['IP',ipDigest,config.verificationBucketLimit],['PLATFORM','',config.verificationPlatformLimit]] as const){const r=await client.query(`SELECT attempts FROM nevora_onboarding.admission_counters WHERE environment=$1 AND kind=$2 AND subject_digest=$3 AND bucket_start=$4::timestamptz`,[config.environment,kind,subject,window]);if((r.rows[0]?.attempts??0)>=limit)return {kind:'limited' as const};}
   const cooldown=await client.query(`SELECT 1 FROM nevora_onboarding.email_subjects WHERE environment=$1 AND email_digest=$2 AND last_sent_at>clock_timestamp()-$3::integer*interval '1 millisecond'`,[config.environment,emailDigest,config.resendCooldownMs]);
   if(cooldown.rowCount)return quiet();
   const emailCounter=await client.query(`SELECT attempts FROM nevora_onboarding.admission_counters WHERE environment=$1 AND kind='EMAIL' AND subject_digest=$2 AND bucket_start=$3::timestamptz`,[config.environment,emailDigest,window]);if((emailCounter.rows[0]?.attempts??0)>=config.verificationBucketLimit)return quiet();
   const previous=await client.query(`SELECT id,expires_at>clock_timestamp() AS current FROM nevora_onboarding.registrations WHERE environment=$1 AND email_digest=$2 AND state IN('EMAIL_PENDING','EMAIL_VERIFIED','WORKSPACE_RESERVED','PROVISIONING','OWNER_ACTIVATION_REQUIRED') FOR UPDATE`,[config.environment,emailDigest]);
   // Reissue verification against the same unfinished registration. Only consuming
   // the new proof may renew an expired registration; requesting mail grants no access.
   const id=previous.rows[0]?.id??randomUUID(),raw=newOnboardingToken(),digest=digestOnboardingProof(purpose('verification',config),raw,config.sessionKey);
   let expires:string;
   if(previous.rows[0]){const r=await client.query(`UPDATE nevora_onboarding.registrations SET verification_digest=$2,verification_consumed_at=NULL,verification_retired_at=NULL,verification_expires_at=clock_timestamp()+$3::integer*interval '1 millisecond',locale=$4,terms_version=$5,privacy_version=$6,consent_at=clock_timestamp(),version=version+1 WHERE id=$1 RETURNING verification_expires_at::text AS expires`,[id,digest,config.verificationTtlMs,command.locale,command.termsVersion,command.privacyVersion]);expires=r.rows[0].expires;}
   else{const r=await client.query<{expires:string}>(`INSERT INTO nevora_onboarding.registrations(id,environment,email_digest,email_ciphertext,locale,state,terms_version,privacy_version,verification_digest,verification_expires_at,expires_at) VALUES($1,$2,$3,$4,$5,'EMAIL_PENDING',$6,$7,$8,clock_timestamp()+$9::integer*interval '1 millisecond',clock_timestamp()+$10::integer*interval '1 day') RETURNING verification_expires_at::text AS expires`,[id,config.environment,emailDigest,sealOnboardingValue(command.email,'registration-email:'+id,config.encryptionKey),command.locale,command.termsVersion,command.privacyVersion,digest,config.verificationTtlMs,config.retentionDays]);expires=r.rows[0].expires;}
   await client.query(`INSERT INTO nevora_onboarding.email_subjects VALUES($1,$2,clock_timestamp()) ON CONFLICT(environment,email_digest) DO UPDATE SET last_sent_at=excluded.last_sent_at`,[config.environment,emailDigest]);
   await increment(['EMAIL','IP','PLATFORM']);
   await client.query("INSERT INTO nevora_onboarding.registration_requests(operation_id,registration_id,command_hash,response_kind,terms_version,privacy_version) VALUES($1,$2,$3,'DELIVERY_REQUESTED',$4,$5)",[command.operationId,id,hash,command.termsVersion,command.privacyVersion]);
   const message:VerificationMessage={email:command.email,proof:raw,locale:command.locale,expiresAt:expires};
   await client.query(`INSERT INTO nevora_onboarding.verification_deliveries(operation_id,payload_ciphertext,delivery_state,expires_at) VALUES($1,$2,'PREPARED',$3)`,[command.operationId,sealOnboardingValue(JSON.stringify(message),'verification-delivery:'+command.operationId,config.encryptionKey),expires]);
   return {kind:'deliver' as const};
  });
  if(admitted.kind==='conflict')return {state:'conflict',reason:'changed_replay'};
  if(admitted.kind==='policy_changed')return {state:'invalid',fieldErrors:[{field:command.termsVersion!==config.termsVersion?'termsVersion':'privacyVersion',code:'POLICY_VERSION_CHANGED'}]};
  if(admitted.kind==='limited')return {state:'limited',retryAfterMs:900000};
  if(admitted.kind==='deliver'){try{await deliverPrepared(command.operationId,store,delivery,config);}catch{/* Recover the original operation; never issue another proof/send blindly. */}}
  return requested(config);
 }catch(error){return error instanceof ControlCommitUnknown?{state:'outcome_unknown',operationId:command.operationId}:unavailable();}
}

export async function verifyRegistration(value:unknown,store:ControlStore,config:EnabledConfig):Promise<VerificationResult>{
 if(!isClosedRecord(value,['operationId','proof'])||!isOperationId(value.operationId)||!validOnboardingToken(value.proof))return {state:'invalid'};
 const operationId=value.operationId.toLowerCase(),digest=digestOnboardingProof(purpose('verification',config),value.proof,config.sessionKey);
 try{
  const result=await store.transaction(async client=>{
   // A global verification fence has no caller-controlled lock key and orders concurrent claims/recovery.
   await client.query("SELECT pg_advisory_xact_lock(hashtextextended('nevora.onboarding.verification',0))");
   const prior=await client.query(`SELECT r.session_ciphertext,r.registration_id,s.token_digest FROM nevora_onboarding.verification_claim_receipts r JOIN nevora_onboarding.signup_sessions s ON s.id=r.session_id JOIN nevora_onboarding.registrations g ON g.id=r.registration_id WHERE r.operation_id=$1 AND r.proof_digest=$2 AND r.expires_at>clock_timestamp() AND g.verification_digest=$2 AND g.verification_retired_at IS NULL AND s.expires_at>clock_timestamp() AND s.revoked_at IS NULL AND s.environment=$3 AND g.environment=$3 AND g.expires_at>clock_timestamp()`,[operationId,digest,config.environment]);
   if(prior.rows[0]){const token=openOnboardingValue(prior.rows[0].session_ciphertext,'verification-claim:'+operationId,config.encryptionKey);const r=await client.query<RegistrationRow>('SELECT *,version::text AS version FROM nevora_onboarding.registrations WHERE id=$1',[prior.rows[0].registration_id]);return token&&validOnboardingToken(token)&&r.rows[0]?{row:r.rows[0],token,digest:prior.rows[0].token_digest}:null;}
   const r=await client.query<RegistrationRow>(`SELECT *,version::text AS version,verification_expires_at::text AS claim_expires,expires_at<=clock_timestamp() AS renewing_expired FROM nevora_onboarding.registrations WHERE verification_digest=$1 AND environment=$2 AND verification_consumed_at IS NULL AND verification_retired_at IS NULL AND verification_expires_at>clock_timestamp() FOR UPDATE`,[digest,config.environment]);
   if(!r.rows[0])return null;
   const used=await client.query('SELECT 1 FROM nevora_onboarding.verification_claim_receipts WHERE operation_id=$1',[operationId]);if(used.rowCount)return null;
   const token=newOnboardingToken(),tokenDigest=digestOnboardingProof(purpose('signup-session',config),token,config.sessionKey),sessionId=randomUUID();
   const updated=await client.query<RegistrationRow>(`UPDATE nevora_onboarding.registrations SET verified_at=COALESCE(verified_at,clock_timestamp()),verified_terms_version=terms_version,verified_privacy_version=privacy_version,verification_consumed_at=clock_timestamp(),state=CASE WHEN state='EMAIL_PENDING' THEN 'EMAIL_VERIFIED' ELSE state END,expires_at=CASE WHEN expires_at<=clock_timestamp() THEN clock_timestamp()+$2::integer*interval '1 day' ELSE expires_at END,version=version+1 WHERE id=$1 AND verification_digest=$3 AND environment=$4 AND verification_consumed_at IS NULL AND verification_retired_at IS NULL AND verification_expires_at>clock_timestamp() RETURNING *,version::text AS version`,[r.rows[0].id,config.retentionDays,digest,config.environment]);
   if(updated.rowCount!==1)return null;
   if(r.rows[0].renewing_expired)await client.query('UPDATE nevora_onboarding.signup_sessions SET revoked_at=clock_timestamp() WHERE registration_id=$1 AND revoked_at IS NULL',[r.rows[0].id]);
   await client.query(`INSERT INTO nevora_onboarding.signup_sessions(id,registration_id,environment,token_digest,expires_at) VALUES($1,$2,$3,$4,clock_timestamp()+$5::integer*interval '1 millisecond')`,[sessionId,r.rows[0].id,config.environment,tokenDigest,config.signupSessionTtlMs]);
   await client.query(`INSERT INTO nevora_onboarding.verification_claim_receipts(operation_id,proof_digest,registration_id,session_id,session_ciphertext,expires_at) VALUES($1,$2,$3,$4,$5,$6)`,[operationId,digest,r.rows[0].id,sessionId,sealOnboardingValue(token,'verification-claim:'+operationId,config.encryptionKey),r.rows[0].claim_expires]);
   return {row:updated.rows[0],token,digest:tokenDigest};
  });
  return result?{state:'verified',sessionToken:result.token,session:proof(store,result.row,result.digest),snapshot:snapshot(result.row)}:{state:'invalid'};
 }catch(error){return error instanceof ControlCommitUnknown?{state:'outcome_unknown',operationId}:{state:'unavailable'};}
}
