import {parsePostgresUrl} from '../../../src/lib/postgres-url';
import {databaseTarget} from '../../commerce/config';
export type HostedEnvironment=Readonly<Record<string,string|undefined>>;
export type FunctionRole='stripewebhook'|'commercequeue'|'commercereconcile'|'provisioner'|'commerceauthority'|'commerceapi'|'workforcemonitor';
/** Override provider-injected aliases: only explicit named application DSNs and
 * approved app credentials may grant access. Empty values restore injections. */
export const INERT_HOST_CAPABILITIES=Object.freeze({PGDATABASE:'disabled',PGHOST:'disabled.invalid',PGHOST_UNPOOLED:'disabled.invalid',PGPASSWORD:'disabled',PGUSER:'disabled',AWS_ACCESS_KEY_ID:'disabled',AWS_SECRET_ACCESS_KEY:'disabled',AWS_REGION:'us-east-1',AWS_ENDPOINT_URL_S3:'https://disabled.invalid',NEON_AI_GATEWAY_TOKEN:'disabled',NEON_AI_GATEWAY_BASE_URL:'https://disabled.invalid'});
// Provider-owned execution ports/mount/draining and its native log transport.
// These are injected by Neon, never supplied or copied in app secret snapshots.
const nativeRuntime=['NEON_BRANCH','NEON_BRANCH_ID','NEON_FUNCTION_HOST_SUFFIX','NEON_DATA_PORT','NEON_LOAD_PORT','NEON_MOUNT_POINT','NEON_SIGINT_DRAIN','NEON_TELEMETRY_ENDPOINT','NEON_TELEMETRY_TOKEN'];
const common=['NEVORA_NEON_HOST_ENABLED','NEVORA_NEON_BRANCH_ID','NEVORA_NEON_SOURCE_SHA','NEVORA_NEON_DIAGNOSTICS','NEVORA_COMMERCE_ENVIRONMENT','NEVORA_ONBOARDING_ENVIRONMENT','NEVORA_WORKSPACE_MODE','DATABASE_URL','DATABASE_URL_UNPOOLED',...Object.keys(INERT_HOST_CAPABILITIES)];
const catalog=['NEVORA_COMMERCE_DATABASE_URL','NEVORA_COMMERCE_ENCRYPTION_KEY'];
const billing=['STRIPE_SECRET_KEY','STRIPE_ACCOUNT_ID','STRIPE_PRICE_SMALL','STRIPE_PRICE_TEAM','NEVORA_COMMERCE_TAX_ENABLED','NEVORA_COMMERCE_TAX_CODE','NEVORA_COMMERCE_TAX_BEHAVIOR','NEVORA_COMMERCE_ORIGIN','NEVORA_COMMERCE_UI_ORIGIN','NEVORA_COMMERCE_PROVISIONING_MODE','NEVORA_COMMERCE_COMPANY_GATEWAY_ORIGIN','NEVORA_COMMERCE_COMPANY_GATEWAY_KEY'];
const mail=['NEVORA_COMMERCE_MAIL_ENABLED','NEVORA_COMMERCE_MAIL_FROM','NEVORA_COMMERCE_SMTP_HOST','NEVORA_COMMERCE_SMTP_PORT','NEVORA_COMMERCE_SMTP_USER','NEVORA_COMMERCE_SMTP_PASSWORD'];
const provision=['NEVORA_PROVISIONER_WORKER_ENABLED','NEVORA_PROVISIONER_CONTROL_DATABASE_URL','NEVORA_PROVISIONER_CONTROL_APP_PRINCIPAL','NEVORA_PROVISIONER_API_KEY','NEVORA_PROVISIONER_RESOURCE_POLICY','NEVORA_ONBOARDING_ENABLED','NEVORA_ONBOARDING_PROVIDER_ENABLED','NEVORA_SIGNUP_ORIGIN','NEVORA_PORTAL_BASE_DOMAIN','NEVORA_SIGNUP_SESSION_SECRET','NEVORA_WORKSPACE_TOKEN_SECRET','NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY','NEVORA_ONBOARDING_RETENTION_DAYS','NEVORA_ONBOARDING_OPERATOR_REF','NEVORA_ONBOARDING_VERIFICATION_PLATFORM_LIMIT_15M','NEVORA_ONBOARDING_MAX_NEW_PROJECTS_PER_DAY','NEVORA_ONBOARDING_PROVIDER_ACCOUNT_REF','NEVORA_ONBOARDING_RESOURCE_POLICY_VERSION','NEVORA_ONBOARDING_REGION','NEVORA_ONBOARDING_TERMS_VERSION','NEVORA_ONBOARDING_PRIVACY_VERSION','NEVORA_ONBOARDING_COMMERCE_ENABLED','NEVORA_COMMERCE_BINDING_KEY','NEVORA_COMMERCE_WORKER_BINDING_KEY','NEVORA_COMMERCE_ENCRYPTION_KEY','NEVORA_COMMERCE_ENROLLMENT_DATABASE_URL'];
const roleFields:Record<FunctionRole,readonly string[]>={
 stripewebhook:[...catalog,'NEVORA_COMMERCE_ORIGIN','NEVORA_COMMERCE_UI_ORIGIN','STRIPE_WEBHOOK_SECRET'],
 commercequeue:[...catalog,...billing,...mail],commercereconcile:[...catalog,...billing],provisioner:provision,
 commerceauthority:['NEVORA_CONTROL_DATABASE_URL','NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY','NEVORA_PORTAL_BASE_DOMAIN','NEVORA_COMMERCE_ENABLED','NEVORA_COMMERCE_API_ORIGIN','NEVORA_COMMERCE_BINDING_KEY','NEVORA_COMMERCE_COMPANY_GATEWAY_KEY'],
 commerceapi:[...catalog,...billing,'NEVORA_COMMERCE_API_ENABLED','NEVORA_COMMERCE_ALLOWED_ORIGINS'],
 workforcemonitor:['NEVORA_OPERATIONS_MONITOR_ENABLED','NEVORA_OPERATIONS_MONITOR_ORIGIN','NEVORA_OPERATIONS_MONITOR_SOURCE_SHA','NEVORA_OPERATIONS_MONITOR_EXPECTED_COMMANDS','NEVORA_OPERATIONS_MONITOR_DATABASE_URL','NEVORA_WORKFORCE_HEALTH_KEY','NEVORA_OPERATIONS_ALERT_MAIL_ENABLED','NEVORA_RECOVERY_SMTP_HOST','NEVORA_RECOVERY_SMTP_PORT','NEVORA_RECOVERY_SMTP_USER','NEVORA_RECOVERY_SMTP_PASSWORD','NEVORA_RECOVERY_FROM','NEVORA_STAGING_EMAIL_RECIPIENT','FUEL_PORTAL_ORIGIN'],
};
export function approvedCapabilityNames(role:FunctionRole):ReadonlySet<string>{return new Set([...common,...(roleFields[role]??[])]);}

/** A deployment snapshot contains only explicit role variables. Provider-owned
 * runtime/logging names are accepted only after injection, never by this policy. */
export function deploymentCapabilitiesAllowed(role:FunctionRole,env:HostedEnvironment):boolean{
 const allowed=approvedCapabilityNames(role);
 return Object.keys(env).every(key=>allowed.has(key))&&roleCapabilitiesAllowed(role,env);
}
const ordinaryRuntime=new Set(['PATH','HOME','HOSTNAME','NODE_ENV','NODE_OPTIONS','NODE_VERSION','LANG','LC_ALL','PWD','SHLVL','_','TZ','TERM']);
function unapprovedRuntimeNames(role:FunctionRole,env:HostedEnvironment){
 const allowed=new Set([...approvedCapabilityNames(role),...nativeRuntime,...ordinaryRuntime]);
 return Object.keys(env).filter(key=>!allowed.has(key));
}
/** Reject unknown names, even when empty. Runtime metadata uses a positive
 * name policy; no credential-name regex can establish an exhaustive boundary. */
export function roleCapabilitiesAllowed(role:FunctionRole,env:HostedEnvironment):boolean{
 if(!Object.hasOwn(roleFields,role)||unapprovedRuntimeNames(role,env).length)return false;
 if(Object.entries(INERT_HOST_CAPABILITIES).some(([key,value])=>env[key]!==value))return false;
 const serviceKey=env.NEVORA_COMMERCE_COMPANY_GATEWAY_KEY;
 if(serviceKey!==undefined){
  if(!/^[A-Za-z0-9_-]{43}$/.test(serviceKey)||Buffer.from(serviceKey,'base64url').toString('base64url')!==serviceKey||[env.NEVORA_COMMERCE_BINDING_KEY,env.NEVORA_WORKSPACE_TOKEN_SECRET,env.NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY].includes(serviceKey)||(env.NEVORA_COMMERCE_ENCRYPTION_KEY&&Buffer.from(serviceKey,'base64url').equals(Buffer.from(env.NEVORA_COMMERCE_ENCRYPTION_KEY,'base64'))))return false;
 }
 if(env.STRIPE_SECRET_KEY&&!/^rk_test_[A-Za-z0-9_]+$/.test(env.STRIPE_SECRET_KEY))return false;
 if(env.NEVORA_COMMERCE_TAX_ENABLED!==undefined&&env.NEVORA_COMMERCE_TAX_ENABLED!=='false')return false;
 if(env.NEVORA_COMMERCE_PROVISIONING_MODE!==undefined&&env.NEVORA_COMMERCE_PROVISIONING_MODE!=='onboarding')return false;
 try{
  if(env.NEVORA_COMMERCE_DATABASE_URL){const url=new URL(databaseTarget(env.NEVORA_COMMERCE_DATABASE_URL,'staging'));if(!/^nv_commerce_api_[a-f0-9]{24}$/.test(decodeURIComponent(url.username)))return false;}
  if(role==='workforcemonitor'&&env.NEVORA_OPERATIONS_MONITOR_DATABASE_URL){const url=parsePostgresUrl(env.NEVORA_OPERATIONS_MONITOR_DATABASE_URL);if(!/^nv_ops_monitor_[a-f0-9]{24}$/.test(decodeURIComponent(url.username))||!url.password||[...url.searchParams].length!==1||url.searchParams.get('sslmode')!=='verify-full'||!/^ep-[a-z0-9.-]+\.neon\.tech$/.test(url.hostname)||url.hostname.includes('-pooler.')||url.port&&url.port!=='5432'||['postgres','template0','template1'].includes(decodeURIComponent(url.pathname.slice(1))))return false;}
  if(env.NEVORA_PROVISIONER_CONTROL_DATABASE_URL)provisionerEnvironment(env);
  if(role==='commerceauthority'&&env.NEVORA_CONTROL_DATABASE_URL){const url=parsePostgresUrl(env.NEVORA_CONTROL_DATABASE_URL);if(!/^nv_control_commerce_[a-f0-9]{24}$/.test(decodeURIComponent(url.username))||!url.password||url.searchParams.get('sslmode')!=='verify-full'||!/^ep-[a-z0-9.-]+\.neon\.tech$/.test(url.hostname)||['postgres','template0','template1'].includes(decodeURIComponent(url.pathname.slice(1))))return false;}
  return true;
 }catch{return false;}
}
/** Operator opt-in, name-only diagnostics. No environment values or request
 * fields leave this function; cap count and name format before logging. */
export function configurationDiagnostics(role:FunctionRole,env:HostedEnvironment){
 const unapprovedNames=unapprovedRuntimeNames(role,env).map(key=>/^[A-Z][A-Z0-9_]{0,79}$/.test(key)?key:'[nonstandard_name]').sort().slice(0,32);
 return {unapprovedNames,roleAllowed:roleCapabilitiesAllowed(role,env),branchMatches:env.NEVORA_NEON_BRANCH_ID===env.NEON_BRANCH_ID,branchValid:/^br-[a-z0-9-]+$/.test(env.NEVORA_NEON_BRANCH_ID??''),stagingBound:env.NEVORA_COMMERCE_ENVIRONMENT==='staging'&&env.NEVORA_ONBOARDING_ENVIRONMENT==='test'&&env.NEVORA_WORKSPACE_MODE==='isolated',defaultDatabaseDisabled:env.DATABASE_URL==='postgresql://disabled.invalid/disabled'&&env.DATABASE_URL_UNPOOLED==='postgresql://disabled.invalid/disabled',hostFlagValid:['true','false'].includes(env.NEVORA_NEON_HOST_ENABLED??'')};
}
/** The hosted provisioner gets no usable application password. The existing
 * runtime compares identities against this passwordless, same-target URL, and
 * opens only the independently validated worker connection. */
export function provisionerEnvironment(env:HostedEnvironment):HostedEnvironment{
 const worker=parsePostgresUrl(env.NEVORA_PROVISIONER_CONTROL_DATABASE_URL??'');
 const app=env.NEVORA_PROVISIONER_CONTROL_APP_PRINCIPAL??'';
 if(!/^nv_control_provision_[a-f0-9]{24}$/.test(decodeURIComponent(worker.username))||!worker.password||!/^nv_control_app_[a-f0-9]{24}$/.test(app)||!/^ep-[a-z0-9.-]+\.neon\.tech$/.test(worker.hostname)||worker.searchParams.get('sslmode')!=='verify-full'||['postgres','template0','template1'].includes(decodeURIComponent(worker.pathname.slice(1))))throw Error('hosted_control_principal_required');
 const identity=new URL(worker);identity.username=app;identity.password='';
 return {...env,NEVORA_CONTROL_DATABASE_URL:identity.href};
}
