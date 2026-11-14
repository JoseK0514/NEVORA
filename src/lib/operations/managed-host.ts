import 'server-only';
import {createHmac,createHash,timingSafeEqual} from 'node:crypto';
import {isAbsolute,join,resolve} from 'node:path';
import {readWorkerRoutingConfig,parseWorkspaceOrigin} from '../workspace-routing/config.server';
import {WORKER_COMMANDS,type WorkerCommand} from './supervisor';
import {parseNotificationRuntimeConfig} from '../notifications/runtime-config';

type Environment='test'|'production';
export type ManagedProfile={scopeId:string;environment:Environment;commands:readonly WorkerCommand[];stateDirectory:string;env:Readonly<Record<string,string>>};
export type ManagedHostConfig={enabled:boolean;sourceSha:string;stateDirectory:string;healthKey:string;profiles:readonly ManagedProfile[]};
export type ManagedDestinations=Readonly<Partial<Record<Environment,Readonly<{controlHostname:string;controlDatabase:string;commerceOrigin:string;portalBaseDomain:string}>>>>;
export type ManagedObservation={scopeId:string;environment:Environment;command:WorkerCommand;sourceSha:string;observedAt:number;healthy:boolean;reason:'ok'|'invocation_failed'|'health_unavailable'};
const invalid=()=>Error('managed_configuration_invalid');
const sha=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v);
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
const key=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9_-]{43}$/.test(v)&&Buffer.from(v,'base64url').toString('base64url')===v;
const profileKeys=['scopeId','environment','commands','origin','portalBaseDomain','env'];
const allowedEnv=new Set(['NEVORA_CONTROL_DATABASE_URL','NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY','NEVORA_COMMERCE_WORKER_BINDING_KEY','NEVORA_WORKER_ENROLLMENT_ID','NEVORA_WORKER_RECIPIENT_PRIVATE_KEY','NEVORA_COMMERCE_API_ORIGIN','NEVORA_COMMERCE_ENABLED','NEVORA_PAYROLL_ENABLED','PUSH_FEATURE_ENABLED','PUSH_VAPID_PUBLIC_KEY','PUSH_VAPID_PRIVATE_KEY','PUSH_SUBSCRIPTION_ENCRYPTION_KEY','PUSH_SUBSCRIPTION_ENCRYPTION_KEY_ID','PUSH_SUBSCRIPTION_PREVIOUS_KEY','PUSH_SUBSCRIPTION_PREVIOUS_KEY_ID','PUSH_SUBSCRIPTION_LEGACY_KEY_ID','PUSH_VAPID_SUBJECT','NOTIFICATION_WORKER_SECRET','PUSH_DELIVERY_ENABLED','PUSH_TEST_DELIVERY_ENABLED','PUSH_TEST_ACCOUNT_IDS']);
const notificationField=(name:string)=>name.startsWith('PUSH_')||name==='NOTIFICATION_WORKER_SECRET';
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);

/** A managed profile is operator custody, never a browser/request input. Only
 * fixed canonical workers receive its strictly bounded machine environment. */
export function parseManagedHostConfig(env:Readonly<Record<string,string|undefined>>,actualSourceSha:string,destinations:ManagedDestinations):ManagedHostConfig{
 try{
  const sourceSha=env.NEVORA_WORKFORCE_SOURCE_SHA;
  if(!sha(sourceSha)||sourceSha!==actualSourceSha||!['true','false',undefined].includes(env.NEVORA_WORKFORCE_ENABLED))throw invalid();
  if(Object.keys(env).some(k=>/^(DATABASE_URL|STRIPE_|NEVORA_RECOVERY_|NEVORA_WORKSPACE_TOKEN_SECRET$|NEVORA_COMMERCE_BINDING_KEY$|NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY$|NEVORA_COMMERCE_WORKER_BINDING_KEY$|OPENAI_API_KEY$)/.test(k)))throw invalid();
  if(env.NEVORA_WORKFORCE_ENABLED!=='true')return {enabled:false,sourceSha,stateDirectory:'',healthKey:'',profiles:[]};
  const stateDirectory=env.NEVORA_WORKFORCE_STATE_DIR,healthKey=env.NEVORA_WORKFORCE_HEALTH_KEY;
  if(!stateDirectory||stateDirectory.length>300||!isAbsolute(stateDirectory)||resolve(stateDirectory)!==stateDirectory||stateDirectory==='/'||!key(healthKey))throw invalid();
  const encoded=env.NEVORA_WORKFORCE_PROFILES;if(!encoded||Buffer.byteLength(encoded)>65536)throw invalid();
  const profiles:unknown=JSON.parse(encoded);if(!Array.isArray(profiles)||profiles.length<1||profiles.length>16)throw invalid();
  const seen=new Set<string>(),recipients=new Set<string>(),custodyModes=new Set<string>();
  const parsed=profiles.map((p):ManagedProfile=>{
   if(!record(p)||Object.keys(p).some(k=>!profileKeys.includes(k))||!uuid(p.scopeId)||!['test','production'].includes(String(p.environment))||!Array.isArray(p.commands)||!p.commands.length||p.commands.length>3||new Set(p.commands).size!==p.commands.length||p.commands.some(c=>!WORKER_COMMANDS.includes(c))||!record(p.env))throw invalid();
   const environment=p.environment as Environment,scope=p.scopeId+'-'+environment;if(seen.has(scope))throw invalid();seen.add(scope);
   if(Object.entries(p.env).some(([k,v])=>!allowedEnv.has(k)||typeof v!=='string'||v.length>8192))throw invalid();
   const e=p.env as Record<string,string>;
   if(p.commands.every(c=>c==='payroll')&&Object.keys(e).some(notificationField))throw invalid();
   const approved=destinations[environment];if(!approved||p.portalBaseDomain!==approved.portalBaseDomain)throw invalid();
   const state=join(stateDirectory,scope);
   const child={...e,NEVORA_WORKSPACE_MODE:'isolated',NEVORA_ONBOARDING_ENVIRONMENT:environment,NEVORA_PORTAL_BASE_DOMAIN:String(p.portalBaseDomain),NEVORA_WORKER_WORKSPACE_ORIGIN:String(p.origin),FUEL_PORTAL_ORIGIN:String(p.origin),PUSH_ENVIRONMENT:environment,NEVORA_OPERATIONS_ENABLED:'true',NEVORA_OPERATIONS_SOURCE_SHA:sourceSha,NEVORA_OPERATIONS_SCOPE_ID:p.scopeId,NEVORA_OPERATIONS_ENVIRONMENT:environment,NEVORA_OPERATIONS_STATE_DIR:state,NEVORA_OPERATIONS_DEADLINE_SECONDS:'120',NEVORA_OPERATIONS_MAX_HEARTBEAT_GAP_SECONDS:'600',NEVORA_OPERATIONS_MAX_QUEUE_AGE_SECONDS:'900'};
   const routing=readWorkerRoutingConfig(child),control=new URL(routing.controlDatabaseUrl),role=decodeURIComponent(control.username);
   if(control.hostname!==approved.controlHostname||decodeURIComponent(control.pathname.slice(1))!==approved.controlDatabase||control.searchParams.get('sslmode')!=='verify-full'||control.port&&control.port!=='5432')throw invalid();
   if(role!=='nv_control_worker_'+(environment==='test'?'t':'p')+'_'+p.scopeId.replaceAll('-','')||parseWorkspaceOrigin(p.origin,routing)!==p.origin||e.NEVORA_COMMERCE_ENABLED!=='true')throw invalid();
   custodyModes.add(routing.secretScope??'legacy');
   if(custodyModes.size>1)throw invalid();
   if(routing.secretScope==='WORKER_ENROLLED'){if(recipients.has(routing.recipientFingerprint))throw invalid();recipients.add(routing.recipientFingerprint);}else if(!key(e.NEVORA_COMMERCE_WORKER_BINDING_KEY))throw invalid();
   const commerce=new URL(e.NEVORA_COMMERCE_API_ORIGIN);if(commerce.protocol!=='https:'||commerce.origin!==e.NEVORA_COMMERCE_API_ORIGIN||commerce.origin!==approved.commerceOrigin)throw invalid();
   if(p.commands.includes('payroll')&&e.NEVORA_PAYROLL_ENABLED!=='true')throw invalid();
   if(p.commands.some(c=>c!=='payroll')){
    const push=parseNotificationRuntimeConfig({...child,NODE_ENV:'production'});
    if(!push.featureEnabled||!push.deliveryEnabled||environment==='test'&&(!push.testDeliveryEnabled||!push.testAccountIds.length))throw invalid();
   }
   return Object.freeze({scopeId:p.scopeId,environment,commands:Object.freeze([...p.commands]),stateDirectory:state,env:Object.freeze(child)});
  });
  if(custodyModes.has('WORKER_ENROLLED')){
   const hostFields=new Set(['NEVORA_WORKFORCE_ENABLED','NEVORA_WORKFORCE_SOURCE_SHA','NEVORA_WORKFORCE_STATE_DIR','NEVORA_WORKFORCE_HEALTH_KEY','NEVORA_WORKFORCE_PROFILES']);
   if(Object.keys(env).some(k=>k.startsWith('NEVORA_')&&!hostFields.has(k)||/^(DATABASE_URL|POSTGRES_|PG(?:HOST|PORT|DATABASE|USER|PASSWORD|SERVICE|OPTIONS|SSLMODE)|AWS_|NEON_|STRIPE_|OPENAI_|ANTHROPIC_|PUSH_|NOTIFICATION_WORKER_SECRET$|FUEL_PORTAL_ORIGIN$)/.test(k)))throw invalid();
  }
  return Object.freeze({enabled:true,sourceSha,stateDirectory,healthKey,profiles:Object.freeze(parsed)});
 }catch{throw invalid();}
}
export function managedChildEnvironment(profile:ManagedProfile,ambient:Readonly<Record<string,string|undefined>>,command?:WorkerCommand):NodeJS.ProcessEnv{
 const selected=command??(profile.commands.length===1?profile.commands[0]:undefined);
 if(!selected||!WORKER_COMMANDS.includes(selected)||!profile.commands.includes(selected))throw invalid();
 const safe:NodeJS.ProcessEnv={NODE_ENV:'production'};for(const k of ['PATH','HOME','TMPDIR','LANG','NODE_ENV'])if(ambient[k]!==undefined)safe[k]=ambient[k];
 const scoped={...profile.env};
 if(selected==='payroll')for(const k of Object.keys(scoped))if(notificationField(k))delete scoped[k];
 return {...safe,...scoped};
}
const digest=(secret:string,at:string,nonce:string)=>createHmac('sha256',Buffer.from(secret,'base64url')).update('GET\n/private/health\n'+at+'\n'+nonce).digest('hex');
export function signHealthRequest(secret:string,now:number,nonce:string):Record<string,string>{
 if(!key(secret)||!Number.isSafeInteger(now)||!/^[a-f0-9]{32}$/.test(nonce))throw invalid();
 return {'x-nevora-ops-time':String(now),'x-nevora-ops-nonce':nonce,'x-nevora-ops-signature':digest(secret,String(now),nonce)};
}
/** Replays inside the freshness window reveal only the same read-only aggregate. */
export function authorizeHealthRequest(request:Request,secret:string,now:number):boolean{
 try{
  const u=new URL(request.url),at=request.headers.get('x-nevora-ops-time')??'',nonce=request.headers.get('x-nevora-ops-nonce')??'',signature=request.headers.get('x-nevora-ops-signature')??'';
  if(!key(secret)||request.method!=='GET'||u.pathname!=='/private/health'||u.search||!/^\d{13}$/.test(at)||!Number.isSafeInteger(now)||Math.abs(now-Number(at))>60000||!/^[a-f0-9]{32}$/.test(nonce)||!/^[a-f0-9]{64}$/.test(signature))return false;
  return timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(digest(secret,at,nonce),'hex'));
 }catch{return false;}
}
/** A different HMAC purpose authenticates exact response bytes/status and binds
 * them to this request's timestamp and random nonce. Public SHA/counts alone
 * cannot let a substituted TLS endpoint manufacture a healthy observation. */
export function signHealthResponse(secret:string,request:Request,status:number,body:string):string{
 const at=request.headers.get('x-nevora-ops-time')??'',nonce=request.headers.get('x-nevora-ops-nonce')??'';
 if(!key(secret)||!/^\d{13}$/.test(at)||!/^[a-f0-9]{32}$/.test(nonce)||!Number.isInteger(status)||status<100||status>599)throw invalid();
 return createHmac('sha256',Buffer.from(secret,'base64url')).update('NEVORA_WORKFORCE_HEALTH_RESPONSE_V1\n'+at+'\n'+nonce+'\n'+status+'\n'+createHash('sha256').update(body,'utf8').digest('hex')).digest('hex');
}
export function authenticHealthResponse(secret:string,request:Request,status:number,body:string,signature:string|null):boolean{
 try{return !!signature&&/^[a-f0-9]{64}$/.test(signature)&&timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(signHealthResponse(secret,request,status,body),'hex'));}catch{return false;}
}
export function managedHealth(config:ManagedHostConfig,observations:readonly ManagedObservation[],now:number){
 const expected=config.profiles.flatMap(p=>p.commands.map(command=>({scopeId:p.scopeId,environment:p.environment,command})));
 const healthy=config.enabled&&Number.isSafeInteger(now)&&expected.length>0&&observations.length===expected.length&&expected.every(e=>{
  const found=observations.filter(o=>o.scopeId===e.scopeId&&o.environment===e.environment&&o.command===e.command);
  return found.length===1&&found[0].sourceSha===config.sourceSha&&found[0].healthy===true&&found[0].reason==='ok'&&Number.isSafeInteger(found[0].observedAt)&&found[0].observedAt<=now+1000&&now-found[0].observedAt<=600000;
 });
 return {schemaVersion:1,enabled:config.enabled,healthy,sourceSha:config.sourceSha,observedAt:now,expectedCommands:expected.length,observedCommands:observations.length};
}
