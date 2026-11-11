import {expect,it} from 'vitest';
import {createECDH} from 'node:crypto';
import {parseManagedHostConfig as parseHost,managedChildEnvironment,signHealthRequest,authorizeHealthRequest,managedHealth} from './managed-host';

const source='a'.repeat(40),scope='b7f07d3e-2255-474c-9a28-10c3185f5234';
const key=Buffer.alloc(32,7).toString('base64url');
const destinations={test:{controlHostname:'ep-fictional.neon.tech',controlDatabase:'control',commerceOrigin:'https://fictional.compute.c-15.us-east-1.aws.neon.tech',portalBaseDomain:'portal-staging.nevora.team'}};
const parseManagedHostConfig=(e:Record<string,string|undefined>,s:string)=>parseHost(e,s,destinations);
const profile=()=>({scopeId:scope,environment:'test',commands:['payroll'],origin:'https://a.portal-staging.nevora.team',portalBaseDomain:'portal-staging.nevora.team',env:{
 NEVORA_CONTROL_DATABASE_URL:`postgresql://nv_control_worker_t_${scope.replaceAll('-','')}:fictional@ep-fictional.neon.tech/control?sslmode=verify-full`,
 NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY:Buffer.alloc(32,8).toString('base64url'),NEVORA_COMMERCE_WORKER_BINDING_KEY:Buffer.alloc(32,9).toString('base64url'),
 NEVORA_COMMERCE_API_ORIGIN:'https://fictional.compute.c-15.us-east-1.aws.neon.tech',NEVORA_COMMERCE_ENABLED:'true',NEVORA_PAYROLL_ENABLED:'true',
}});
const env=()=>({NEVORA_WORKFORCE_ENABLED:'true',NEVORA_WORKFORCE_SOURCE_SHA:source,NEVORA_WORKFORCE_STATE_DIR:'/tmp/fictional-managed-host',NEVORA_WORKFORCE_HEALTH_KEY:key,NEVORA_WORKFORCE_PROFILES:JSON.stringify([profile()])});
it('pins credential destinations independently of profiles, including TLS, database and environment',()=>{
 for(const change of [
  {NEVORA_COMMERCE_API_ORIGIN:'https://other.compute.c-15.us-east-1.aws.neon.tech'},
  {NEVORA_CONTROL_DATABASE_URL:profile().env.NEVORA_CONTROL_DATABASE_URL.replace('ep-fictional','ep-other')},
  {NEVORA_CONTROL_DATABASE_URL:profile().env.NEVORA_CONTROL_DATABASE_URL.replace('/control?','/other?')},
  {NEVORA_CONTROL_DATABASE_URL:profile().env.NEVORA_CONTROL_DATABASE_URL.replace('ep-fictional.neon.tech','127.0.0.1').replace('verify-full','disable')},
 ])expect(()=>parseManagedHostConfig({...env(),NEVORA_WORKFORCE_PROFILES:JSON.stringify([{...profile(),env:{...profile().env,...change}}])},source)).toThrow('managed_configuration_invalid');
 expect(()=>parseHost(env(),source,{})).toThrow('managed_configuration_invalid');
});
it('rejects silently disabled notification commands and admits only a fully configured web-push profile',()=>{
 const p={...profile(),commands:['notifications-dispatch']};
 expect(()=>parseManagedHostConfig({...env(),NEVORA_WORKFORCE_PROFILES:JSON.stringify([p])},source)).toThrow('managed_configuration_invalid');
 const pair=createECDH('prime256v1');pair.setPrivateKey(Buffer.alloc(32,1));
 const ready={...p,env:{...p.env,PUSH_FEATURE_ENABLED:'true',PUSH_DELIVERY_ENABLED:'true',PUSH_TEST_DELIVERY_ENABLED:'true',PUSH_TEST_ACCOUNT_IDS:'FICTIONAL-1',NOTIFICATION_WORKER_SECRET:'fictional-'.repeat(5),PUSH_SUBSCRIPTION_ENCRYPTION_KEY:Buffer.alloc(32,4).toString('base64url'),PUSH_VAPID_PUBLIC_KEY:pair.getPublicKey().toString('base64url'),PUSH_VAPID_PRIVATE_KEY:pair.getPrivateKey().toString('base64url'),PUSH_VAPID_SUBJECT:'mailto:support@thevelani.com'}};
 expect(parseManagedHostConfig({...env(),NEVORA_WORKFORCE_PROFILES:JSON.stringify([ready])},source).profiles[0].commands).toEqual(['notifications-dispatch']);
});
it('derives one canonical private state namespace and immutable source per scoped profile',()=>{
 const c=parseManagedHostConfig(env(),source);expect(c.enabled).toBe(true);expect(c.profiles).toHaveLength(1);expect(c.profiles[0].stateDirectory).toBe('/tmp/fictional-managed-host/'+scope+'-test');expect(c.profiles[0].env.NEVORA_OPERATIONS_SOURCE_SHA).toBe(source);expect(c.profiles[0].env.NEVORA_OPERATIONS_SCOPE_ID).toBe(scope);expect(c.profiles[0].env.PUSH_ENVIRONMENT).toBe('test');
});
it('defaults to disabled without constructing worker or database custody',()=>{
 const c=parseManagedHostConfig({NEVORA_WORKFORCE_SOURCE_SHA:source},source);expect(c.enabled).toBe(false);expect(c.profiles).toEqual([]);expect(managedHealth(c,[],Date.now())).toMatchObject({enabled:false,healthy:false});
});
it('rejects foreign source, duplicate scope, private root borrowing and arbitrary worker input',()=>{
 expect(()=>parseManagedHostConfig(env(),'b'.repeat(40))).toThrow('managed_configuration_invalid');
 for(const key of ['NEVORA_WORKSPACE_TOKEN_SECRET','NEVORA_COMMERCE_BINDING_KEY','STRIPE_SECRET_KEY','NEVORA_RECOVERY_SMTP_PASSWORD','DATABASE_URL'])expect(()=>parseManagedHostConfig({...env(),[key]:'fictional-forbidden'},source)).toThrow('managed_configuration_invalid');
 for(const p of [
  {...profile(),commands:['arbitrary-shell']}, {...profile(),commands:['payroll','payroll']},
  {...profile(),env:{...profile().env,OPENAI_API_KEY:'fictional-forbidden'}},
  {...profile(),env:{...profile().env,NEVORA_OPERATIONS_STATE_DIR:'/tmp/other'}},
  {...profile(),env:{...profile().env,NEVORA_PAYROLL_ENABLED:'false'}},
  {...profile(),origin:'https://other.invalid'},
 ])expect(()=>parseManagedHostConfig({...env(),NEVORA_WORKFORCE_PROFILES:JSON.stringify([p])},source)).toThrow('managed_configuration_invalid');
 expect(()=>parseManagedHostConfig({...env(),NEVORA_WORKFORCE_PROFILES:JSON.stringify([profile(),profile()])},source)).toThrow('managed_configuration_invalid');
 expect(()=>parseManagedHostConfig({...env(),NEVORA_WORKFORCE_STATE_DIR:'/tmp/a/../b'},source)).toThrow('managed_configuration_invalid');
});
it('gives children only curated scope custody, never host secrets or ambient settings',()=>{
 const c=parseManagedHostConfig(env(),source),p=c.profiles[0];
 const child=managedChildEnvironment(p,{PATH:'/bin',HOME:'/tmp/fictional',NODE_ENV:'test',NEVORA_WORKFORCE_HEALTH_KEY:key,SMTP_PASSWORD:'fictional',NODE_OPTIONS:'--inspect',HTTPS_PROXY:'http://fictional.invalid'});
 expect(child.PATH).toBe('/bin');expect(child.NEVORA_OPERATIONS_SCOPE_ID).toBe(scope);expect(child.NEVORA_OPERATIONS_ENABLED).toBe('true');
 for(const k of ['NEVORA_WORKFORCE_HEALTH_KEY','SMTP_PASSWORD','NODE_OPTIONS','HTTPS_PROXY'])expect(child).not.toHaveProperty(k);
});
it('authenticates only a fresh fixed read-only health request without accepting selectors or wrong signatures',()=>{
 const now=1794250000000,nonce='b'.repeat(32),headers=signHealthRequest(key,now,nonce);
 expect(authorizeHealthRequest(new Request('https://worker.onrender.com/private/health',{headers}),key,now)).toBe(true);
 for(const r of [new Request('https://worker.onrender.com/private/health'),new Request('https://worker.onrender.com/private/health?scope=foreign',{headers}),new Request('https://worker.onrender.com/private/health',{method:'POST',headers}),new Request('https://worker.onrender.com/private/health',{headers:signHealthRequest(key,now,'c'.repeat(32))})]){
  if(r.headers.get('x-nevora-ops-nonce')==='c'.repeat(32))expect(authorizeHealthRequest(r,Buffer.alloc(32,4).toString('base64url'),now)).toBe(false);
  else expect(authorizeHealthRequest(r,key,now)).toBe(false);
 }
 expect(authorizeHealthRequest(new Request('https://worker.onrender.com/private/health',{headers}),key,now+60001)).toBe(false);
});
it('fails closed for missing, stale, foreign and failed observations and emits no private configuration',()=>{
 const c=parseManagedHostConfig(env(),source),now=1794250000000;
 const good={scopeId:scope,environment:'test' as const,command:'payroll' as const,sourceSha:source,observedAt:now,healthy:true,reason:'ok' as const};
 expect(managedHealth(c,[good],now).healthy).toBe(true);
 for(const observations of [[],[{...good,observedAt:now-601000}],[{...good,scopeId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'}],[{...good,healthy:false,reason:'invocation_failed' as const}]])expect(managedHealth(c,observations,now).healthy).toBe(false);
 const body=JSON.stringify(managedHealth(c,[good],now));expect(body).not.toContain('fictional@');expect(body).not.toContain(key);expect(body).not.toContain(c.stateDirectory);
});
