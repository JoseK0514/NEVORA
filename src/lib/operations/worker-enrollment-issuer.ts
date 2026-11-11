import 'server-only';
import {Pool} from 'pg';
import {parsePostgresUrl} from '../postgres-url';
import {isClosedRecord,isOperationId} from '../onboarding/contracts';
import {validOnboardingToken} from '../onboarding/crypto.server';
import {managedDestinations} from './managed-destinations';
import {processWorkerEnrollmentOnce,type WorkerEnrollmentRequestBinding} from './worker-enrollment-store';
import {verifyWorkerEnrollmentCompany} from './worker-enrollment-company';
const invalid=()=>Error('worker_enrollment_invalid');
type Env=Readonly<Record<string,string|undefined>>;
export function readWorkerEnrollmentIssuerConfig(env:Env,source:string|undefined){
 try{
  const enabled=env.NEVORA_WORKFORCE_ENROLLMENT_ENABLED;
  if(enabled===undefined||enabled==='false'){if('NEVORA_WORKFORCE_ENROLLMENT_REQUESTS'in env)throw invalid();return null;}
  if(enabled!=='true'||!source||! /^[a-f0-9]{40}$/.test(source)||env.NEVORA_NEON_SOURCE_SHA!==source||env.NEVORA_NEON_HOST_ENABLED!=='true'||env.NEVORA_NEON_BRANCH_ID!=='br-hidden-mud-bbnc2fxk'||env.NEON_BRANCH_ID!==env.NEVORA_NEON_BRANCH_ID||env.NEVORA_ONBOARDING_ENVIRONMENT!=='test'||env.NEVORA_COMMERCE_ENVIRONMENT!=='staging'||env.NEVORA_WORKSPACE_MODE!=='isolated')throw invalid();
  for(const field of ['NEVORA_PROVISIONER_WORKER_ENABLED','NEVORA_ONBOARDING_ENABLED','NEVORA_ONBOARDING_PROVIDER_ENABLED','NEVORA_ONBOARDING_COMMERCE_ENABLED'])if(env[field]!=='false')throw invalid();
  const encryptionRoot=env.NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY,commerceWorkerRoot=env.NEVORA_COMMERCE_WORKER_BINDING_KEY;
  if(!validOnboardingToken(encryptionRoot)||!validOnboardingToken(commerceWorkerRoot)||encryptionRoot===commerceWorkerRoot||env.NEVORA_COMMERCE_BINDING_KEY===commerceWorkerRoot)throw invalid();
  const url=parsePostgresUrl(env.NEVORA_PROVISIONER_CONTROL_DATABASE_URL??''),d=managedDestinations.test;
  if(!/^nv_control_provision_[a-f0-9]{24}$/.test(decodeURIComponent(url.username))||!url.password||url.hostname!==d.controlHostname||decodeURIComponent(url.pathname.slice(1))!==d.controlDatabase||url.port&&url.port!=='5432'||[...url.searchParams].length!==1||url.searchParams.get('sslmode')!=='verify-full')throw invalid();
  const raw=env.NEVORA_WORKFORCE_ENROLLMENT_REQUESTS;if(!raw||Buffer.byteLength(raw)>1024)throw invalid();const selected:unknown=JSON.parse(raw),seen=new Set<string>();
  if(!Array.isArray(selected)||selected.length<1||selected.length>2)throw invalid();
  const requests:WorkerEnrollmentRequestBinding[]=selected.map(r=>{if(!isClosedRecord(r,['id','requestHash'])||!isOperationId(r.id)||r.id!==r.id.toLowerCase()||typeof r.requestHash!=='string'||! /^[a-f0-9]{64}$/.test(r.requestHash)||seen.has(r.id))throw invalid();seen.add(r.id);return Object.freeze({id:r.id,requestHash:r.requestHash});});
  return Object.freeze({controlDatabaseUrl:url.href,requests:Object.freeze(requests),sourceSha:source,encryptionRoot,commerceWorkerRoot});
 }catch{throw invalid();}
}
export async function runWorkerEnrollmentIssuerOnce(env:Env,source:string|undefined){
 const config=readWorkerEnrollmentIssuerConfig(env,source);if(!config)return {state:'disabled' as const};
 const pool=new Pool({connectionString:config.controlDatabaseUrl,max:1,connectionTimeoutMillis:5000,statement_timeout:10000,query_timeout:12000});
 try{return await processWorkerEnrollmentOnce(pool,config.requests,config.sourceSha,config.encryptionRoot,config.commerceWorkerRoot,verifyWorkerEnrollmentCompany);}finally{await pool.end();}
}
