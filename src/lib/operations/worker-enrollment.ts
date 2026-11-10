import 'server-only';
import {constants,createHash,createPrivateKey,createPublicKey,privateDecrypt,publicEncrypt,randomBytes,type KeyObject} from 'node:crypto';
import {isClosedRecord,isOperationId} from '../onboarding/contracts';
import {openOnboardingValue,sealOnboardingValue,validOnboardingToken} from '../onboarding/crypto.server';
import {parsePostgresUrl} from '../postgres-url';

export type WorkerEnrollmentIdentity=Readonly<{schemaVersion:1;enrollmentId:string;workspaceId:string;environment:'test';incarnation:string;sourceSecretRef:string;loginRole:string;canonicalOrigin:string;providerProjectId:string;recipientFingerprint:string;issuerSourceSha:string;expiresAt:string}>;
export type WorkerEnrollmentMaterial=Readonly<{databaseUrl:string;commerceWorkerSecret:string}>;
export type WorkerEnrollmentEnvelope=Readonly<{schemaVersion:1;keyEnvelope:string;ciphertext:string}>;
const invalid=()=>Error('worker_enrollment_invalid');
const fields=['schemaVersion','enrollmentId','workspaceId','environment','incarnation','sourceSecretRef','loginRole','canonicalOrigin','providerProjectId','recipientFingerprint','issuerSourceSha','expiresAt'];
const canonicalId=(s:unknown):s is string=>isOperationId(s)&&s===s.toLowerCase();

function recipientKey(value:unknown,kind:'public'|'private'|'either'):KeyObject{
 try{
  if(typeof value!=='string'||value.length>8192)throw invalid();
  const privatePem=value.startsWith('-----BEGIN PRIVATE KEY-----\n');
  if(kind==='private'&&!privatePem||kind==='public'&&privatePem)throw invalid();
  const key=privatePem?createPrivateKey(value):createPublicKey(value);
  if(key.asymmetricKeyType!=='rsa'||key.asymmetricKeyDetails?.modulusLength!==3072||key.asymmetricKeyDetails.publicExponent!==BigInt(65537))throw invalid();
  const canonical=key.export({format:'pem',type:privatePem?'pkcs8':'spki'}).toString();
  if(canonical!==value)throw invalid();return key;
 }catch{throw invalid();}
}
function fingerprint(key:KeyObject){return createHash('sha256').update((key.type==='private'?createPublicKey(key):key).export({format:'der',type:'spki'})).digest('hex');}
/** Public identifier only. Key parsing failures never include input material. */
export function workerRecipientFingerprint(publicOrPrivatePem:string){return fingerprint(recipientKey(publicOrPrivatePem,'either'));}

export function parseWorkerEnrollmentIdentity(value:unknown):WorkerEnrollmentIdentity{
 try{
  if(!isClosedRecord(value,fields)||value.schemaVersion!==1||!canonicalId(value.enrollmentId)||!canonicalId(value.workspaceId)||!canonicalId(value.sourceSecretRef)||value.environment!=='test'||typeof value.incarnation!=='string'||! /^[1-9]\d{0,17}$/.test(value.incarnation)||typeof value.loginRole!=='string'||!/^nv_worker_[a-f0-9]{24}$/.test(value.loginRole)||typeof value.canonicalOrigin!=='string'||value.canonicalOrigin.length>300||typeof value.providerProjectId!=='string'||! /^[a-z0-9][a-z0-9-]{0,127}$/.test(value.providerProjectId)||typeof value.recipientFingerprint!=='string'||! /^[a-f0-9]{64}$/.test(value.recipientFingerprint)||typeof value.issuerSourceSha!=='string'||! /^[a-f0-9]{40}$/.test(value.issuerSourceSha)||typeof value.expiresAt!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.expiresAt)||!Number.isFinite(Date.parse(value.expiresAt))||new Date(value.expiresAt).toISOString()!==value.expiresAt)throw invalid();
  const origin=new URL(value.canonicalOrigin);if(origin.protocol!=='https:'||origin.origin!==value.canonicalOrigin||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw invalid();
  return Object.freeze({schemaVersion:1,enrollmentId:value.enrollmentId,workspaceId:value.workspaceId,environment:'test',incarnation:value.incarnation,sourceSecretRef:value.sourceSecretRef,loginRole:value.loginRole,canonicalOrigin:value.canonicalOrigin,providerProjectId:value.providerProjectId,recipientFingerprint:value.recipientFingerprint,issuerSourceSha:value.issuerSourceSha,expiresAt:value.expiresAt});
 }catch{throw invalid();}
}
export function parseWorkerEnrollmentEnvelope(value:unknown):WorkerEnrollmentEnvelope{
 if(!isClosedRecord(value,['schemaVersion','keyEnvelope','ciphertext'])||value.schemaVersion!==1||typeof value.keyEnvelope!=='string'||! /^[A-Za-z0-9_-]{512}$/.test(value.keyEnvelope)||Buffer.from(value.keyEnvelope,'base64url').length!==384||Buffer.from(value.keyEnvelope,'base64url').toString('base64url')!==value.keyEnvelope||typeof value.ciphertext!=='string'||value.ciphertext.length>12000||!/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value.ciphertext))throw invalid();
 return Object.freeze({schemaVersion:1,keyEnvelope:value.keyEnvelope,ciphertext:value.ciphertext});
}
function parseMaterial(value:unknown,identity:WorkerEnrollmentIdentity):WorkerEnrollmentMaterial{
 try{
  if(!isClosedRecord(value,['databaseUrl','commerceWorkerSecret'])||typeof value.databaseUrl!=='string'||value.databaseUrl.length>2048||!validOnboardingToken(value.commerceWorkerSecret))throw invalid();
  const u=parsePostgresUrl(value.databaseUrl),options=[...u.searchParams];
  if(decodeURIComponent(u.username)!==identity.loginRole||!u.password||!/^ep-[a-z0-9.-]+\.neon\.tech$/.test(u.hostname)||u.port&&u.port!=='5432'||decodeURIComponent(u.pathname.slice(1))!=='nv_app_'+identity.workspaceId.replaceAll('-','')||options.length!==1||u.searchParams.get('sslmode')!=='verify-full')throw invalid();
  return Object.freeze({databaseUrl:value.databaseUrl,commerceWorkerSecret:value.commerceWorkerSecret});
 }catch{throw invalid();}
}
function context(identity:WorkerEnrollmentIdentity){return 'worker-enrollment:'+JSON.stringify(identity);}
/** Only a company WORKER connection and its derived commerce secret are sealed.
 * Neither shared root is an input or part of the serialized result. */
export function sealWorkerEnrollment(identity:unknown,material:unknown,publicPem:string):WorkerEnrollmentEnvelope{
 try{
  const bound=parseWorkerEnrollmentIdentity(identity),payload=JSON.stringify(parseMaterial(material,bound)),recipient=recipientKey(publicPem,'public');
  if(fingerprint(recipient)!==bound.recipientFingerprint||Buffer.byteLength(payload)>8192)throw invalid();
  const key=randomBytes(32),purpose=context(bound);
  try{return Object.freeze({schemaVersion:1,keyEnvelope:publicEncrypt({key:recipient,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256',oaepLabel:Buffer.from(purpose)},key).toString('base64url'),ciphertext:sealOnboardingValue(payload,purpose,key.toString('base64url'))});}finally{key.fill(0);}
 }catch{throw invalid();}
}
/** Null is the sole unauthenticated/expired outcome. This guards normal runtime
 * admission; it cannot recall a database password from a compromised recipient. */
export function openWorkerEnrollment(identity:unknown,envelope:unknown,privatePem:string,now=Date.now()):WorkerEnrollmentMaterial|null{
 try{
  const bound=parseWorkerEnrollmentIdentity(identity),wire=parseWorkerEnrollmentEnvelope(envelope);
  if(!Number.isSafeInteger(now)||now<0||now>=Date.parse(bound.expiresAt))return null;
  const recipient=recipientKey(privatePem,'private');if(fingerprint(recipient)!==bound.recipientFingerprint)return null;
  const purpose=context(bound),key=privateDecrypt({key:recipient,padding:constants.RSA_PKCS1_OAEP_PADDING,oaepHash:'sha256',oaepLabel:Buffer.from(purpose)},Buffer.from(wire.keyEnvelope,'base64url'));
  try{if(key.length!==32)return null;const text=openOnboardingValue(wire.ciphertext,purpose,key.toString('base64url'));if(!text||Buffer.byteLength(text)>8192)return null;return parseMaterial(JSON.parse(text),bound);}finally{key.fill(0);}
 }catch{return null;}
}
