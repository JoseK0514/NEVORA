import 'server-only';
import {validOnboardingToken} from '../onboarding/crypto.server';
import {isOperationId,validWorkspaceSlug} from '../onboarding/contracts';
import {workerRecipientFingerprint} from '../operations/worker-enrollment';

type RoutingBase={environment:'test'|'development'|'production';portalBaseDomain:string;controlDatabaseUrl:string};
export type LegacyWorkspaceRoutingConfig=RoutingBase&{encryptionKey:string;tokenKey?:string;secretScope?:'COMMERCE_APP_ONLY'|'WORKER_ONLY'};
export type EnrolledWorkerRoutingConfig=RoutingBase&{secretScope:'WORKER_ENROLLED';enrollmentId:string;recipientPrivateKey:string;recipientFingerprint:string;encryptionKey?:never;tokenKey?:never};
export type WorkspaceRoutingConfig=LegacyWorkspaceRoutingConfig|EnrolledWorkerRoutingConfig;
export class WorkspaceRoutingError extends Error{constructor(){super('Workspace is unavailable');}}
export function workspaceMode(env:Readonly<Record<string,string|undefined>>=process.env):'single_company'|'isolated'{const mode=env.NEVORA_WORKSPACE_MODE??'single_company';if(mode!=='single_company'&&mode!=='isolated')throw new WorkspaceRoutingError();return mode;}
function routingBase(env:Readonly<Record<string,string|undefined>>):RoutingBase{
 if(workspaceMode(env)!=='isolated')throw new WorkspaceRoutingError();
 const environment=env.NEVORA_ONBOARDING_ENVIRONMENT,portalBaseDomain=env.NEVORA_PORTAL_BASE_DOMAIN;
 if(!['test','development','production'].includes(environment??'')||!portalBaseDomain||!/^([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z][a-z0-9-]*$/.test(portalBaseDomain))throw new WorkspaceRoutingError();
 try{const url=new URL(env.NEVORA_CONTROL_DATABASE_URL??'');if(!['postgres:','postgresql:'].includes(url.protocol)||!url.hostname||!url.pathname.slice(1)||['postgres','template0','template1'].includes(url.pathname.slice(1))||url.hash||(environment==='production'&&(url.searchParams.get('sslmode')!=='verify-full'||['localhost','127.0.0.1','[::1]'].includes(url.hostname))))throw new WorkspaceRoutingError();return {environment:environment as RoutingBase['environment'],portalBaseDomain,controlDatabaseUrl:url.href};}catch{throw new WorkspaceRoutingError();}
}
function routingConfig(env:Readonly<Record<string,string|undefined>>,browser:boolean):LegacyWorkspaceRoutingConfig{
 if('NEVORA_WORKER_ENROLLMENT_ID'in env||'NEVORA_WORKER_RECIPIENT_PRIVATE_KEY'in env)throw new WorkspaceRoutingError();
 const base=routingBase(env),encryptionKey=env.NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY,tokenKey=env.NEVORA_WORKSPACE_TOKEN_SECRET;
 if(!validOnboardingToken(encryptionKey)||(browser&&(!validOnboardingToken(tokenKey)||tokenKey===encryptionKey)))throw new WorkspaceRoutingError();
 return {...base,encryptionKey,...(browser?{tokenKey}:{secretScope:'COMMERCE_APP_ONLY' as const})};
}
export function readWorkspaceRoutingConfig(env:Readonly<Record<string,string|undefined>>=process.env):LegacyWorkspaceRoutingConfig{return routingConfig(env,true);}
function validateWorkerTarget(config:RoutingBase){
 const url=new URL(config.controlDatabaseUrl),role=decodeURIComponent(url.username);
 const prefix=config.environment==='test'?'t':'p';
 if(!new RegExp('^nv_control_worker_'+prefix+'_[a-f0-9]{32}$').test(role)||!url.password)throw new WorkspaceRoutingError();
 const ownedLocal=config.environment==='test'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname);
 const options=[...url.searchParams];
 // pg connection-string options override authority/TLS fields. Never pass an
 // unreviewed option (including duplicate sslmode) through to the driver.
 if(options.length>1||options.some(([key,value])=>key!=='sslmode'||!['verify-full',...(ownedLocal?['disable']:[])].includes(value)))throw new WorkspaceRoutingError();
 if(!ownedLocal&&(url.searchParams.get('sslmode')!=='verify-full'||!/^ep-[a-z0-9.-]+\.neon\.tech$/.test(url.hostname)))throw new WorkspaceRoutingError();
}
/** Standalone workforce machines need no Owner envelope/signing capability. An
 * enrolled profile has its own recipient key and never a shared root. */
export function readWorkerRoutingConfig(env:Readonly<Record<string,string|undefined>>=process.env):WorkspaceRoutingConfig{
 try{
  if('NEVORA_WORKSPACE_TOKEN_SECRET'in env||'NEVORA_COMMERCE_BINDING_KEY'in env||!['test','production'].includes(env.NEVORA_ONBOARDING_ENVIRONMENT??''))throw new WorkspaceRoutingError();
  if('NEVORA_WORKER_ENROLLMENT_ID'in env||'NEVORA_WORKER_RECIPIENT_PRIVATE_KEY'in env){
   if(env.NEVORA_ONBOARDING_ENVIRONMENT!=='test'||'NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY'in env||'NEVORA_COMMERCE_WORKER_BINDING_KEY'in env)throw new WorkspaceRoutingError();
   const base=routingBase(env),enrollmentId=env.NEVORA_WORKER_ENROLLMENT_ID,recipientPrivateKey=env.NEVORA_WORKER_RECIPIENT_PRIVATE_KEY;
   validateWorkerTarget(base);
   if(!isOperationId(enrollmentId)||enrollmentId!==enrollmentId.toLowerCase()||!recipientPrivateKey?.startsWith('-----BEGIN PRIVATE KEY-----\n'))throw new WorkspaceRoutingError();
   return {...base,secretScope:'WORKER_ENROLLED',enrollmentId,recipientPrivateKey,recipientFingerprint:workerRecipientFingerprint(recipientPrivateKey)};
  }
  const config=routingConfig(env,false);validateWorkerTarget(config);return {...config,secretScope:'WORKER_ONLY'};
 }catch{throw new WorkspaceRoutingError();}
}
/** Fixed machine-only routing. No browser envelope capability is admitted. */
export function readCommerceAuthorityRoutingConfig(env:Readonly<Record<string,string|undefined>>=process.env):LegacyWorkspaceRoutingConfig{
 if('NEVORA_WORKSPACE_TOKEN_SECRET' in env||env.NEVORA_ONBOARDING_ENVIRONMENT!=='test'||env.NEVORA_COMMERCE_ENVIRONMENT!=='staging')throw new WorkspaceRoutingError();
 const config=routingConfig(env,false),url=new URL(config.controlDatabaseUrl);
 if(!/^nv_control_commerce_[a-f0-9]{24}$/.test(decodeURIComponent(url.username))||!url.password||url.searchParams.get('sslmode')!=='verify-full'||!/^ep-[a-z0-9.-]+\.neon\.tech$/.test(url.hostname))throw new WorkspaceRoutingError();
 return config;
}
export function parseWorkspaceOrigin(value:unknown,config:Pick<WorkspaceRoutingConfig,'portalBaseDomain'|'environment'>):string|null{
 if(typeof value!=='string'||value.length>300||!/^https?:\/\/[a-z0-9.-]+(?::[0-9]{1,5})?\/?$/i.test(value))return null;
 try{const u=new URL(value),suffix='.'+config.portalBaseDomain;if(u.pathname!=='/'||u.search||u.hash||u.username||u.password||!u.hostname.endsWith(suffix))return null;const slug=u.hostname.slice(0,-suffix.length);if(!validWorkspaceSlug(slug))return null;const local=u.hostname.endsWith('.localhost');if(u.protocol!=='https:'&&!(config.environment!=='production'&&local))return null;return u.origin;}catch{return null;}
}
