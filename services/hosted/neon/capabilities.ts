import {parsePostgresUrl} from '../../../src/lib/postgres-url';
import {databaseTarget} from '../../commerce/config';
export type HostedEnvironment=Readonly<Record<string,string|undefined>>;
export type FunctionRole='stripewebhook'|'commercequeue'|'commercereconcile'|'provisioner';
/** Override provider-injected aliases: only explicit named application DSNs and
 * approved app credentials may grant access. Empty values restore injections. */
export const INERT_HOST_CAPABILITIES=Object.freeze({PGDATABASE:'disabled',PGHOST:'disabled.invalid',PGHOST_UNPOOLED:'disabled.invalid',PGPASSWORD:'disabled',PGUSER:'disabled',AWS_ACCESS_KEY_ID:'disabled',AWS_SECRET_ACCESS_KEY:'disabled',AWS_REGION:'us-east-1',AWS_ENDPOINT_URL_S3:'https://disabled.invalid',NEON_AI_GATEWAY_TOKEN:'disabled',NEON_AI_GATEWAY_BASE_URL:'https://disabled.invalid'});
// Provider-owned execution ports/mount/draining and its native log transport.
// These are injected by Neon, never supplied or copied in app secret snapshots.
const nativeRuntime=['NEON_DATA_PORT','NEON_LOAD_PORT','NEON_MOUNT_POINT','NEON_SIGINT_DRAIN','NEON_TELEMETRY_ENDPOINT','NEON_TELEMETRY_TOKEN'];
const common=['NEVORA_NEON_HOST_ENABLED','NEVORA_NEON_BRANCH_ID','NEVORA_NEON_SOURCE_SHA','NEVORA_NEON_DIAGNOSTICS','NEVORA_COMMERCE_ENVIRONMENT','NEVORA_ONBOARDING_ENVIRONMENT','NEVORA_WORKSPACE_MODE','DATABASE_URL','DATABASE_URL_UNPOOLED','NEON_BRANCH','NEON_BRANCH_ID','NEON_FUNCTION_HOST_SUFFIX',...nativeRuntime,...Object.keys(INERT_HOST_CAPABILITIES)];
const catalog=['NEVORA_COMMERCE_DATABASE_URL','NEVORA_COMMERCE_ENCRYPTION_KEY'];
const billing=['STRIPE_SECRET_KEY','STRIPE_ACCOUNT_ID','STRIPE_PRICE_SMALL','STRIPE_PRICE_TEAM','NEVORA_COMMERCE_TAX_ENABLED','NEVORA_COMMERCE_TAX_CODE','NEVORA_COMMERCE_TAX_BEHAVIOR','NEVORA_COMMERCE_ORIGIN','NEVORA_COMMERCE_UI_ORIGIN','NEVORA_COMMERCE_PROVISIONING_MODE'];
const mail=['NEVORA_COMMERCE_MAIL_ENABLED','NEVORA_COMMERCE_MAIL_FROM','NEVORA_COMMERCE_SMTP_HOST','NEVORA_COMMERCE_SMTP_PORT','NEVORA_COMMERCE_SMTP_USER','NEVORA_COMMERCE_SMTP_PASSWORD'];
const provision=['NEVORA_PROVISIONER_WORKER_ENABLED','NEVORA_PROVISIONER_CONTROL_DATABASE_URL','NEVORA_PROVISIONER_CONTROL_APP_PRINCIPAL','NEVORA_PROVISIONER_API_KEY','NEVORA_PROVISIONER_RESOURCE_POLICY','NEVORA_ONBOARDING_ENABLED','NEVORA_ONBOARDING_PROVIDER_ENABLED','NEVORA_SIGNUP_ORIGIN','NEVORA_PORTAL_BASE_DOMAIN','NEVORA_SIGNUP_SESSION_SECRET','NEVORA_WORKSPACE_TOKEN_SECRET','NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY','NEVORA_ONBOARDING_RETENTION_DAYS','NEVORA_ONBOARDING_OPERATOR_REF','NEVORA_ONBOARDING_VERIFICATION_PLATFORM_LIMIT_15M','NEVORA_ONBOARDING_MAX_NEW_PROJECTS_PER_DAY','NEVORA_ONBOARDING_PROVIDER_ACCOUNT_REF','NEVORA_ONBOARDING_RESOURCE_POLICY_VERSION','NEVORA_ONBOARDING_REGION','NEVORA_ONBOARDING_TERMS_VERSION','NEVORA_ONBOARDING_PRIVACY_VERSION','NEVORA_ONBOARDING_COMMERCE_ENABLED','NEVORA_COMMERCE_BINDING_KEY','NEVORA_COMMERCE_WORKER_BINDING_KEY','NEVORA_COMMERCE_ENCRYPTION_KEY','NEVORA_COMMERCE_ENROLLMENT_DATABASE_URL'];
export function approvedCapabilityNames(role:FunctionRole):ReadonlySet<string>{return new Set([...common,...(role==='stripewebhook'?[...catalog,'NEVORA_COMMERCE_ORIGIN','NEVORA_COMMERCE_UI_ORIGIN','STRIPE_WEBHOOK_SECRET']:role==='provisioner'?provision:[...catalog,...billing,...(role==='commercequeue'?mail:[])])]);}
/** Reject accidentally retained capabilities, including Neon service injections.
 * Ordinary runtime metadata is allowed; unknown credential names are not. */
export function roleCapabilitiesAllowed(role:FunctionRole,env:HostedEnvironment):boolean{
 const allowed=approvedCapabilityNames(role);
 if(Object.entries(env).some(([key,value])=>value&&!allowed.has(key)&&(/^(NEVORA_|STRIPE_|NEON_|DATABASE_|PG[A-Z_]|AWS_)/.test(key)||/(?:_KEY|_TOKEN|_SECRET|_PASSWORD|_CREDENTIALS?|_CONNECTION_STRING)$/.test(key))))return false;
 if(Object.entries(INERT_HOST_CAPABILITIES).some(([key,value])=>env[key]!==undefined&&env[key]!==value))return false;
 if(env.STRIPE_SECRET_KEY&&!/^rk_test_[A-Za-z0-9_]+$/.test(env.STRIPE_SECRET_KEY))return false;
 if(env.NEVORA_COMMERCE_TAX_ENABLED!==undefined&&env.NEVORA_COMMERCE_TAX_ENABLED!=='false')return false;
 if(env.NEVORA_COMMERCE_PROVISIONING_MODE!==undefined&&env.NEVORA_COMMERCE_PROVISIONING_MODE!=='onboarding')return false;
 try{
  if(env.NEVORA_COMMERCE_DATABASE_URL){const url=new URL(databaseTarget(env.NEVORA_COMMERCE_DATABASE_URL,'staging'));if(!/^nv_commerce_api_[a-f0-9]{24}$/.test(decodeURIComponent(url.username)))return false;}
  if(env.NEVORA_PROVISIONER_CONTROL_DATABASE_URL)provisionerEnvironment(env);
  return true;
 }catch{return false;}
}
/** Operator opt-in, name-only diagnostics. No environment values or request
 * fields leave this function; cap count and name format before logging. */
export function configurationDiagnostics(role:FunctionRole,env:HostedEnvironment){
 const allowed=approvedCapabilityNames(role);
 const unapprovedNames=Object.entries(env).filter(([key,value])=>value&&!allowed.has(key)&&(/^(NEVORA_|STRIPE_|NEON_|DATABASE_|PG[A-Z_]|AWS_)/.test(key)||/(?:_KEY|_TOKEN|_SECRET|_PASSWORD|_CREDENTIALS?|_CONNECTION_STRING)$/.test(key))).map(([key])=>/^[A-Z][A-Z0-9_]{0,79}$/.test(key)?key:'[nonstandard_name]').sort().slice(0,32);
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
