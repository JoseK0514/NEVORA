import {parsePostgresUrl} from '../../../src/lib/postgres-url';
import {databaseTarget} from '../../commerce/config';
export type HostedEnvironment=Readonly<Record<string,string|undefined>>;
export type FunctionRole='stripewebhook'|'commercequeue'|'commercereconcile'|'provisioner';
const common=['NEVORA_NEON_HOST_ENABLED','NEVORA_NEON_BRANCH_ID','NEVORA_NEON_SOURCE_SHA','NEVORA_COMMERCE_ENVIRONMENT','NEVORA_ONBOARDING_ENVIRONMENT','NEVORA_WORKSPACE_MODE','DATABASE_URL','DATABASE_URL_UNPOOLED','NEON_BRANCH','NEON_BRANCH_ID','NEON_FUNCTION_HOST_SUFFIX'];
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
 if(env.STRIPE_SECRET_KEY&&!/^rk_test_[A-Za-z0-9_]+$/.test(env.STRIPE_SECRET_KEY))return false;
 if(env.NEVORA_COMMERCE_TAX_ENABLED!==undefined&&env.NEVORA_COMMERCE_TAX_ENABLED!=='false')return false;
 if(env.NEVORA_COMMERCE_PROVISIONING_MODE!==undefined&&env.NEVORA_COMMERCE_PROVISIONING_MODE!=='onboarding')return false;
 try{
  if(env.NEVORA_COMMERCE_DATABASE_URL){const url=new URL(databaseTarget(env.NEVORA_COMMERCE_DATABASE_URL,'staging'));if(!/^nv_commerce_api_[a-f0-9]{24}$/.test(decodeURIComponent(url.username)))return false;}
  if(env.NEVORA_PROVISIONER_CONTROL_DATABASE_URL)provisionerEnvironment(env);
  return true;
 }catch{return false;}
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
