import 'server-only';
type Environment=Readonly<Record<string,string|undefined>>;
export type DisabledConfig={enabled:false;reason:'disabled'|'configuration_unavailable'};
export type EnabledConfig={enabled:true;environment:'test'|'development'|'production';signupOrigin:string;portalBaseDomain:string;controlDatabaseUrl:string;sessionKey:string;workspaceTokenKey:string;encryptionKey:string;verificationTtlMs:number;signupSessionTtlMs:number;bootstrapTtlMs:number;resendCooldownMs:number;verificationBucketLimit:number;verificationPlatformLimit:number;maxNewProjectsPerDay:number;providerEnabled:boolean;providerAccountRef:string|null;resourcePolicyVersion:string|null;region:string;retentionDays:number;operatorRef:string;termsVersion:string;privacyVersion:string};
function integer(value:string|undefined,min:number,max:number):number|null{if(value===undefined||!/^(0|[1-9][0-9]*)$/.test(value))return null;const n=Number(value);return Number.isSafeInteger(n)&&n>=min&&n<=max?n:null;}
function key(value:string|undefined):value is string{return !!value&&/^[A-Za-z0-9_-]{43}$/.test(value)&&Buffer.from(value,'base64url').length===32&&Buffer.from(value,'base64url').toString('base64url')===value;}
const ref=(value:string|undefined):value is string=>!!value&&value.length<=200&&/^[a-zA-Z0-9_.:@/-]+$/.test(value);
export function readOnboardingConfig(env:Environment=process.env):DisabledConfig|EnabledConfig{
 if(env.NEVORA_ONBOARDING_ENABLED!=='true')return {enabled:false,reason:'disabled'};
 const invalid:DisabledConfig={enabled:false,reason:'configuration_unavailable'};
 const environment=env.NEVORA_ONBOARDING_ENVIRONMENT;if(environment!=='test'&&environment!=='development'&&environment!=='production')return invalid;
 const sessionKey=env.NEVORA_SIGNUP_SESSION_SECRET,workspaceTokenKey=env.NEVORA_WORKSPACE_TOKEN_SECRET,encryptionKey=env.NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY;
 if(!key(sessionKey)||!key(workspaceTokenKey)||!key(encryptionKey)||new Set([sessionKey,workspaceTokenKey,encryptionKey]).size!==3)return invalid;
 const retentionDays=integer(env.NEVORA_ONBOARDING_RETENTION_DAYS,1,365),verificationPlatformLimit=integer(env.NEVORA_ONBOARDING_VERIFICATION_PLATFORM_LIMIT_15M,1,100000),maxNewProjectsPerDay=integer(env.NEVORA_ONBOARDING_MAX_NEW_PROJECTS_PER_DAY??'0',0,100000);
 const providerValue=env.NEVORA_ONBOARDING_PROVIDER_ENABLED??'false';if(!['false','true'].includes(providerValue)||retentionDays===null||verificationPlatformLimit===null||maxNewProjectsPerDay===null)return invalid;
 const providerEnabled=providerValue==='true',providerAccountRef=env.NEVORA_ONBOARDING_PROVIDER_ACCOUNT_REF??null,resourcePolicyVersion=env.NEVORA_ONBOARDING_RESOURCE_POLICY_VERSION??null;
 if(providerEnabled&&(env.NEVORA_WORKSPACE_MODE!=='isolated'||!maxNewProjectsPerDay||!ref(providerAccountRef??undefined)||!ref(resourcePolicyVersion??undefined)))return invalid;
 const portalBaseDomain=env.NEVORA_PORTAL_BASE_DOMAIN,operatorRef=env.NEVORA_ONBOARDING_OPERATOR_REF,region=env.NEVORA_ONBOARDING_REGION;
 const termsVersion=env.NEVORA_ONBOARDING_TERMS_VERSION,privacyVersion=env.NEVORA_ONBOARDING_PRIVACY_VERSION;
 if(!ref(termsVersion)||!ref(privacyVersion)||termsVersion.length>100||privacyVersion.length>100)return invalid;
 if(!portalBaseDomain||portalBaseDomain.length>190||!/^([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z][a-z0-9-]*$/.test(portalBaseDomain)||!ref(operatorRef)||!region||!/^aws-[a-z0-9-]+$/.test(region))return invalid;
 try{
  const origin=new URL(env.NEVORA_SIGNUP_ORIGIN??''),control=new URL(env.NEVORA_CONTROL_DATABASE_URL??'');
  const localOrigin=['localhost','127.0.0.1','[::1]'].includes(origin.hostname),localControl=['localhost','127.0.0.1','[::1]'].includes(control.hostname);
  if(origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||!['https:','http:'].includes(origin.protocol)||(origin.protocol!=='https:'&&(!localOrigin||environment==='production')))return invalid;
  if(!['postgres:','postgresql:'].includes(control.protocol)||!control.hostname||control.hash||!control.pathname.slice(1)||['postgres','template0','template1'].includes(decodeURIComponent(control.pathname.slice(1))))return invalid;
  if(environment==='production'&&(localControl||control.searchParams.get('sslmode')!=='verify-full'))return invalid;
  return {enabled:true,environment,signupOrigin:origin.origin,portalBaseDomain,controlDatabaseUrl:control.href,sessionKey,workspaceTokenKey,encryptionKey,verificationTtlMs:1800000,signupSessionTtlMs:86400000,bootstrapTtlMs:900000,resendCooldownMs:60000,verificationBucketLimit:5,verificationPlatformLimit,maxNewProjectsPerDay,providerEnabled,providerAccountRef,resourcePolicyVersion,region,retentionDays,operatorRef,termsVersion,privacyVersion};
 }catch{return invalid;}
}
