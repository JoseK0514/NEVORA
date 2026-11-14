import {describe,expect,it} from 'vitest';
import {readOnboardingConfig,readSignupOrigin} from './config.server';
import {approvedCapabilityNames} from '../../../services/hosted/neon/capabilities';
const key=Buffer.alloc(32,7).toString('base64url');
const env={NEVORA_ONBOARDING_ENABLED:'true',NEVORA_ONBOARDING_ENVIRONMENT:'test',NEVORA_SIGNUP_ORIGIN:'https://signup.example.invalid',NEVORA_PORTAL_BASE_DOMAIN:'portal.example.invalid',NEVORA_CONTROL_DATABASE_URL:'postgresql://control@127.0.0.1:5432/fictional_control',NEVORA_SIGNUP_SESSION_SECRET:key,NEVORA_WORKSPACE_TOKEN_SECRET:Buffer.alloc(32,8).toString('base64url'),NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY:Buffer.alloc(32,9).toString('base64url'),NEVORA_ONBOARDING_RETENTION_DAYS:'7',NEVORA_ONBOARDING_OPERATOR_REF:'fictional-operator',NEVORA_ONBOARDING_VERIFICATION_PLATFORM_LIMIT_15M:'100',NEVORA_ONBOARDING_REGION:'aws-us-east-1',NEVORA_ONBOARDING_TERMS_VERSION:'terms-1',NEVORA_ONBOARDING_PRIVACY_VERSION:'privacy-1'};
describe('public signup origin',()=>{
 it('recognizes only an explicit origin without enabling commands or requiring secrets',()=>{
  const closed={NEVORA_SIGNUP_ORIGIN:'https://signup.nevora.team',NEVORA_ONBOARDING_ENVIRONMENT:'production'};
  expect(readSignupOrigin(closed)).toBe('https://signup.nevora.team');
  expect(readOnboardingConfig(closed)).toEqual({enabled:false,reason:'disabled'});
  expect(readSignupOrigin({})).toBeNull();
 });
 it.each(['https://signup.nevora.team/path','https://signup.nevora.team?x=1','https://signup.nevora.team#x','https://user:pass@signup.nevora.team','http://signup.nevora.team','not-a-url'])('rejects an unsafe origin %s',origin=>{
  expect(readSignupOrigin({NEVORA_SIGNUP_ORIGIN:origin})).toBeNull();
 });
 it('permits HTTP loopback only with an explicit nonproduction environment',()=>{
  expect(readSignupOrigin({NEVORA_SIGNUP_ORIGIN:'http://127.0.0.1:35471',NEVORA_ONBOARDING_ENVIRONMENT:'development'})).toBe('http://127.0.0.1:35471');
  expect(readSignupOrigin({NEVORA_SIGNUP_ORIGIN:'http://127.0.0.1:35471',NEVORA_ONBOARDING_ENVIRONMENT:'production'})).toBeNull();
  expect(readSignupOrigin({NEVORA_SIGNUP_ORIGIN:'http://localhost:35471'})).toBeNull();
 });
 it.each(['https://localhost','https://127.0.0.1','https://[::1]'])('rejects a production loopback signup origin even with TLS: %s',origin=>{
  expect(readSignupOrigin({NEVORA_SIGNUP_ORIGIN:origin,NEVORA_ONBOARDING_ENVIRONMENT:'production'})).toBeNull();
 });
});
describe('self-service configuration gate',()=>{
 it('defaults to disabled rather than selecting a target or allowing resources',()=>expect(readOnboardingConfig({})).toEqual({enabled:false,reason:'disabled'}));
 it('enables local verification logic with zero new-provider-resource allowance',()=>{const c=readOnboardingConfig(env);expect(c.enabled).toBe(true);if(c.enabled){expect(c.maxNewProjectsPerDay).toBe(0);expect(c.providerEnabled).toBe(false);expect(c.verificationTtlMs).toBe(1800000);expect(c.signupSessionTtlMs).toBe(86400000);expect(c.bootstrapTtlMs).toBe(900000);expect(c.resendCooldownMs).toBe(60000);expect(c.verificationBucketLimit).toBe(5);}});
 it.each(['NEVORA_ONBOARDING_ENVIRONMENT','NEVORA_SIGNUP_ORIGIN','NEVORA_PORTAL_BASE_DOMAIN','NEVORA_CONTROL_DATABASE_URL','NEVORA_SIGNUP_SESSION_SECRET','NEVORA_WORKSPACE_TOKEN_SECRET','NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY','NEVORA_ONBOARDING_RETENTION_DAYS','NEVORA_ONBOARDING_OPERATOR_REF','NEVORA_ONBOARDING_VERIFICATION_PLATFORM_LIMIT_15M','NEVORA_ONBOARDING_REGION'])('fails closed when %s is missing',name=>expect(readOnboardingConfig({...env,[name]:undefined})).toEqual({enabled:false,reason:'configuration_unavailable'}));
 it.each(['https://signup.example.invalid/path','https://signup.example.invalid?token=secret','http://signup.example.invalid','https://user:pass@signup.example.invalid'])('refuses unsafe signup origin %s',origin=>expect(readOnboardingConfig({...env,NEVORA_SIGNUP_ORIGIN:origin}).enabled).toBe(false));
 it('refuses key reuse or a short key',()=>{expect(readOnboardingConfig({...env,NEVORA_WORKSPACE_TOKEN_SECRET:key}).enabled).toBe(false);expect(readOnboardingConfig({...env,NEVORA_SIGNUP_SESSION_SECRET:'short'}).enabled).toBe(false);});
 it.each(['NEVORA_ONBOARDING_TERMS_VERSION','NEVORA_ONBOARDING_PRIVACY_VERSION'])('requires the actual published policy version %s',name=>expect(readOnboardingConfig({...env,[name]:undefined}).enabled).toBe(false));
 it('does not enable actual provisioning merely because signup is enabled',()=>expect(readOnboardingConfig({...env,NEVORA_ONBOARDING_PROVIDER_ENABLED:'true'}).enabled).toBe(false));
 it('requires production certificate verification and a non-loopback control target',()=>{expect(readOnboardingConfig({...env,NEVORA_ONBOARDING_ENVIRONMENT:'production'}).enabled).toBe(false);expect(readOnboardingConfig({...env,NEVORA_ONBOARDING_ENVIRONMENT:'production',NEVORA_CONTROL_DATABASE_URL:'postgresql://control@db.example.invalid/control?sslmode=verify-full'}).enabled).toBe(true);});
 it('requires a finite total company allowance for production resource creation',()=>{
  const production={...env,NEVORA_ONBOARDING_ENVIRONMENT:'production',NEVORA_CONTROL_DATABASE_URL:'postgresql://control@db.example.invalid/control?sslmode=verify-full',NEVORA_WORKSPACE_MODE:'isolated',NEVORA_ONBOARDING_PROVIDER_ENABLED:'true',NEVORA_ONBOARDING_MAX_NEW_PROJECTS_PER_DAY:'1',NEVORA_ONBOARDING_PROVIDER_ACCOUNT_REF:'production-account',NEVORA_ONBOARDING_RESOURCE_POLICY_VERSION:'production-v1'};
  expect(readOnboardingConfig(production).enabled).toBe(false);
  const configured=readOnboardingConfig({...production,NEVORA_ONBOARDING_MAX_TOTAL_PROJECTS:'2'});
  expect(configured.enabled).toBe(true);if(configured.enabled)expect(configured.maxTotalProjects).toBe(2);
 });
 it.each(['0','-1','1.5','01','100001','NaN',''])('refuses an invalid explicit total capacity %s',value=>{
  expect(readOnboardingConfig({...env,NEVORA_ONBOARDING_MAX_TOTAL_PROJECTS:value}).enabled).toBe(false);
 });
 it('limits the hosted total-capacity capability to the provisioner role',()=>{
  expect(approvedCapabilityNames('provisioner').has('NEVORA_ONBOARDING_MAX_TOTAL_PROJECTS')).toBe(true);
  for(const role of ['stripewebhook','commercequeue','commercereconcile','commerceauthority','commerceapi','workforcemonitor'] as const)expect(approvedCapabilityNames(role).has('NEVORA_ONBOARDING_MAX_TOTAL_PROJECTS')).toBe(false);
 });
 it('requires explicit provider custody and a positive reviewed resource allowance',()=>{const c=readOnboardingConfig({...env,NEVORA_WORKSPACE_MODE:'isolated',NEVORA_ONBOARDING_PROVIDER_ENABLED:'true',NEVORA_ONBOARDING_MAX_NEW_PROJECTS_PER_DAY:'2',NEVORA_ONBOARDING_PROVIDER_ACCOUNT_REF:'fictional-account',NEVORA_ONBOARDING_RESOURCE_POLICY_VERSION:'resource-policy-1'});expect(c.enabled).toBe(true);if(c.enabled)expect(c.maxNewProjectsPerDay).toBe(2);});
});

it('never enables resource provisioning on the legacy database deployment',()=>{
 const env={NEVORA_ONBOARDING_ENABLED:'true',NEVORA_ONBOARDING_ENVIRONMENT:'test',NEVORA_SIGNUP_ORIGIN:'https://signup.example.invalid',NEVORA_PORTAL_BASE_DOMAIN:'portal.example.invalid',NEVORA_CONTROL_DATABASE_URL:'postgresql://fixture@127.0.0.1/fixture_control',NEVORA_SIGNUP_SESSION_SECRET:Buffer.alloc(32,1).toString('base64url'),NEVORA_WORKSPACE_TOKEN_SECRET:Buffer.alloc(32,2).toString('base64url'),NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY:Buffer.alloc(32,3).toString('base64url'),NEVORA_ONBOARDING_RETENTION_DAYS:'7',NEVORA_ONBOARDING_OPERATOR_REF:'fictional-operator',NEVORA_ONBOARDING_VERIFICATION_PLATFORM_LIMIT_15M:'100',NEVORA_ONBOARDING_REGION:'aws-us-east-1',NEVORA_ONBOARDING_TERMS_VERSION:'terms-1',NEVORA_ONBOARDING_PRIVACY_VERSION:'privacy-1',NEVORA_ONBOARDING_PROVIDER_ENABLED:'true',NEVORA_ONBOARDING_MAX_NEW_PROJECTS_PER_DAY:'1',NEVORA_ONBOARDING_PROVIDER_ACCOUNT_REF:'fictional-org',NEVORA_ONBOARDING_RESOURCE_POLICY_VERSION:'fictional-policy'};
 expect(readOnboardingConfig(env).enabled).toBe(false);expect(readOnboardingConfig({...env,NEVORA_WORKSPACE_MODE:'single_company'}).enabled).toBe(false);expect(readOnboardingConfig({...env,NEVORA_WORKSPACE_MODE:'isolated'}).enabled).toBe(true);
});
