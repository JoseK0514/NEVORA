import {sourceFixture} from './test-source';
import {describe,it,expect,vi} from 'vitest';
import Stripe from 'stripe';
import {createWebhookHandler,createScheduledHandler,hostedEnvironmentBound,UNUSABLE_DATABASE_URL,observedFetch,type HostedRole} from './handlers';
const secret='whsec_hosted_fixture';
const inert={PGDATABASE:'disabled',PGHOST:'disabled.invalid',PGHOST_UNPOOLED:'disabled.invalid',PGPASSWORD:'disabled',PGUSER:'disabled',AWS_ACCESS_KEY_ID:'disabled',AWS_SECRET_ACCESS_KEY:'disabled',AWS_REGION:'us-east-1',AWS_ENDPOINT_URL_S3:'https://disabled.invalid',NEON_AI_GATEWAY_TOKEN:'disabled',NEON_AI_GATEWAY_BASE_URL:'https://disabled.invalid'};
const env={...sourceFixture,...inert,NEVORA_NEON_HOST_ENABLED:'true',NEVORA_NEON_BRANCH_ID:'br-fictional-staging',NEON_BRANCH_ID:'br-fictional-staging',NEVORA_COMMERCE_ENVIRONMENT:'staging',NEVORA_ONBOARDING_ENVIRONMENT:'test',NEVORA_WORKSPACE_MODE:'isolated',DATABASE_URL:UNUSABLE_DATABASE_URL,DATABASE_URL_UNPOOLED:UNUSABLE_DATABASE_URL,STRIPE_WEBHOOK_SECRET:secret};
function event(live=false){return JSON.stringify({id:'evt_hosted_fixture',object:'event',type:'checkout.session.completed',livemode:live,data:{object:{id:'cs_test_hosted',object:'checkout.session'}}});}
function webhook(raw=event(),signature=Stripe.webhooks.generateTestHeaderString({payload:raw,secret})){return new Request('https://fictional.invalid/webhooks/stripe',{method:'POST',headers:{'stripe-signature':signature},body:raw});}
function tick(role:HostedRole='commercequeue',override:Record<string,unknown>={},headers:Record<string,string>={'x-neon-trigger-invocation-id':'fixture-run'}){
 return new Request('https://fictional.invalid/run',{method:'POST',headers,body:JSON.stringify({version:1,invocation_id:'fixture-run',trigger:{type:'schedule',id:'trigger-fixture',name:'nevora-staging-'+role},data:{scheduled_at:'2026-11-08T12:00:00Z'},...override})});
}
describe('Neon sandbox webhook boundary',()=>{
 it.each(Object.keys(inert))('refuses missing required override %s before accepting signed traffic',async key=>{let writes=0;const candidate:Record<string,string|undefined>={...env};delete candidate[key];expect((await createWebhookHandler(candidate,async()=>{writes++;})(webhook())).status).toBe(503);expect(writes).toBe(0);});
 it('refuses an unrelated PostgreSQL credential alias before accepting signed traffic',async()=>{let writes=0;expect((await createWebhookHandler({...env,POSTGRES_URL:'postgresql://fictional:private@foreign.invalid/catalog'},async()=>{writes++;})(webhook())).status).toBe(503);expect(writes).toBe(0);});
 it('acknowledges a valid unsupported event without opening enqueue capabilities',async()=>{let writes=0;const raw=JSON.stringify({...JSON.parse(event()),type:'customer.created',data:{object:{id:'cus_fixture',object:'customer'}}});expect((await createWebhookHandler(env,async()=>{writes++;})(webhook(raw))).status).toBe(200);expect(writes).toBe(0);});
 it.each(['NEVORA_CONTROL_DATABASE_URL','NEVORA_OPERATOR_CONTROL_DATABASE_URL','NEVORA_SIGNUP_SESSION_SECRET','NEON_AI_GATEWAY_TOKEN','AWS_SECRET_ACCESS_KEY','STRIPE_UNREVIEWED_KEY'])('rejects unapproved capability %s before enqueue',async key=>{let writes=0;expect((await createWebhookHandler({...env,[key]:'fictional'},async()=>{writes++;})(webhook())).status).toBe(503);expect(writes).toBe(0);});
 it.each([
  {id:''},{object:'not.event'},{type:''},{data:{object:{id:'wrong',object:'checkout.session'}}},
  {data:{object:{id:'cs_test_hosted',object:'customer'}}},
  {type:'customer.subscription.updated',data:{object:{id:'bad',object:'subscription'}}},
  {type:'invoice.paid',data:{object:{id:'in_fixture',object:'invoice',parent:{subscription_details:{subscription:'bad'}}}}},
 ])('rejects a correctly signed malformed envelope before enqueue %j',async patch=>{let writes=0;const raw=JSON.stringify({...JSON.parse(event()),...patch});expect((await createWebhookHandler(env,async()=>{writes++;})(webhook(raw))).status).toBe(400);expect(writes).toBe(0);});
 it('rejects lossy UTF-8 substitution even if the decoded string has a valid signature',async()=>{let writes=0;const raw=event().replace('evt_hosted_fixture','evt_hosted_fixture').replace('"livemode"','"note":"\ufffd","livemode"');const bytes=Buffer.from(raw),offset=bytes.indexOf(Buffer.from('\ufffd'));const corrupted=Buffer.concat([bytes.subarray(0,offset),Buffer.from([255]),bytes.subarray(offset+3)]);const signature=Stripe.webhooks.generateTestHeaderString({payload:raw,secret});const request=new Request('https://fictional.invalid/webhooks/stripe',{method:'POST',headers:{'stripe-signature':signature},body:corrupted});expect((await createWebhookHandler(env,async()=>{writes++;})(request)).status).toBe(400);expect(writes).toBe(0);});
 it('preserves an unsigned leading UTF-8 BOM for signature verification',async()=>{let writes=0;const raw=event(),signature=Stripe.webhooks.generateTestHeaderString({payload:raw,secret}),request=new Request('https://fictional.invalid/webhooks/stripe',{method:'POST',headers:{'stripe-signature':signature},body:Buffer.concat([Buffer.from([239,187,191]),Buffer.from(raw)])});expect((await createWebhookHandler(env,async()=>{writes++;})(request)).status).toBe(400);expect(writes).toBe(0);});
 it('accepts a real SDK-signed test event and preserves the event identity',async()=>{const received:Stripe.Event[]=[];const h=createWebhookHandler(env,async e=>{received.push(e);});expect((await h(webhook())).status).toBe(200);expect(received.map(e=>e.id)).toEqual(['evt_hosted_fixture']);});
 it.each([
  ['missing signature',()=>new Request('https://fictional.invalid/webhooks/stripe',{method:'POST',body:event()}),400],
  ['bad signature',()=>webhook(event(),'invalid'),400],
  ['tampered payload',()=>webhook(event()+' ',Stripe.webhooks.generateTestHeaderString({payload:event(),secret})),400],
  ['expired signature',()=>webhook(event(),Stripe.webhooks.generateTestHeaderString({payload:event(),secret,timestamp:1})),400],
  ['live event',()=>webhook(event(true)),400],
  ['other path',()=>new Request('https://fictional.invalid/v1/signup',{method:'POST',body:event()}),404],
  ['other method',()=>new Request('https://fictional.invalid/webhooks/stripe'),404],
  ['oversized signed body',()=>webhook('x'.repeat(262145)),413],
 ] as const)('rejects %s without invoking a database capability',async(_name,request,status)=>{let writes=0;const h=createWebhookHandler(env,async()=>{writes++;});expect((await h(request())).status).toBe(status);expect(writes).toBe(0);});
 it.each([
  {NEVORA_NEON_HOST_ENABLED:'false'}, {NEVORA_NEON_HOST_ENABLED:'TRUE'},
  {NEON_BRANCH_ID:'br-unrelated'}, {NEVORA_COMMERCE_ENVIRONMENT:'production'},
  {DATABASE_URL:'postgresql://broad.invalid/default'}, {DATABASE_URL_UNPOOLED:undefined},
  {NEVORA_PROVISIONER_API_KEY:'fixture-only'}, {NEVORA_COMMERCE_ENROLLMENT_DATABASE_URL:'fixture-only'},
  {STRIPE_SECRET_KEY:'sk_test_fixture'},
  {NEVORA_COMMERCE_DATABASE_URL:'postgresql://nv_commerce_enroll_aaaaaaaaaaaaaaaaaaaaaaaa:fictional@catalog.invalid/catalog'},
 ])('fails closed for disabled or excessive-capability configuration %j',async patch=>{let writes=0;const h=createWebhookHandler({...env,...patch},async()=>{writes++;});expect((await h(webhook())).status).toBe(503);expect(writes).toBe(0);});
 it('does not expose database/provider errors',async()=>{const r=await createWebhookHandler(env,async()=>{throw Error('private fixture credential');})(webhook());expect(r.status).toBe(503);expect(await r.text()).not.toContain('private fixture credential');});
 it('bounds a caller that stops sending the signed body',async()=>{
  vi.useFakeTimers();let writes=0;
  try{const input=new Request('https://fictional.invalid/webhooks/stripe',{method:'POST',headers:{'stripe-signature':'fixture'},body:new ReadableStream(),duplex:'half'} as RequestInit);
   const pending=createWebhookHandler(env,async()=>{writes++;})(input);await vi.advanceTimersByTimeAsync(10000);const r=await pending;expect(r.status).toBe(408);expect(writes).toBe(0);
  }finally{vi.useRealTimers();}
 });
});
const {STRIPE_WEBHOOK_SECRET:_receiverSecret,...workerEnv}=env;
describe('explicit production signup provisioner profile',()=>{
 const production={...workerEnv,NEVORA_NEON_RUNTIME_PROFILE:'production-signup-v1',NEVORA_COMMERCE_ENVIRONMENT:'production',NEVORA_ONBOARDING_ENVIRONMENT:'production',NEVORA_SIGNUP_ORIGIN:'https://signup.nevora.team',NEVORA_PORTAL_BASE_DOMAIN:'portal.nevora.team'};
 it('admits the production provisioner without admitting live billing or workforce roles',()=>{
  expect(hostedEnvironmentBound(production,'provisioner')).toBe(true);
  for(const role of ['commercequeue','commercereconcile','stripewebhook','commerceapi','commerceauthority','workforcemonitor'] as const)expect(hostedEnvironmentBound(production,role)).toBe(false);
 });
 it.each([{NEVORA_NEON_RUNTIME_PROFILE:undefined},{NEVORA_NEON_RUNTIME_PROFILE:'production'},{NEVORA_ONBOARDING_ENVIRONMENT:'test'},{NEVORA_COMMERCE_ENVIRONMENT:'staging'},{NEVORA_SIGNUP_ORIGIN:'https://signup-staging.nevora.team'},{NEVORA_PORTAL_BASE_DOMAIN:'portal-staging.nevora.team'},{NEON_BRANCH_ID:'br-other'},{NEVORA_WORKFORCE_ENROLLMENT_ENABLED:'true'}])('rejects mixed or unqualified production capabilities %j',patch=>{
  expect(hostedEnvironmentBound({...production,...patch},'provisioner')).toBe(false);
 });
 it('accepts only the production schedule name and never consumes a staging tick',async()=>{
  let work=0;const handler=createScheduledHandler('provisioner',production,async()=>{work++;return {state:'completed'};});
  expect((await handler(tick('provisioner'))).status).toBe(403);
  const request=tick('provisioner',{trigger:{type:'schedule',id:'trigger-fixture',name:'nevora-production-provisioner'}});
  expect((await handler(request)).status).toBe(200);expect(work).toBe(1);
 });
 it.each([
  {NEVORA_WORKFORCE_ENROLLMENT_REQUESTS:undefined},
  {NEVORA_WORKSPACE_MODE:'single_company'},
  {NEVORA_NEON_SOURCE_SHA:'e'.repeat(40)},
  {DATABASE_URL:'postgresql://broad.invalid/default'},
  {DATABASE_URL_UNPOOLED:undefined},
  {NEVORA_NEON_HOST_ENABLED:'TRUE'},
 ])('blocks production capabilities or a failed existing custody gate before private work %j',async patch=>{
  let effects=0;const handler=createScheduledHandler('provisioner',{...production,...patch},async()=>{effects++;return {state:'completed'};});
  const request=tick('provisioner',{trigger:{type:'schedule',id:'trigger-fixture',name:'nevora-production-provisioner'}});
  expect((await handler(request)).status).not.toBe(200);expect(effects).toBe(0);
 });
 it('permits explicitly disabled enrollment flags without granting enrollment capabilities',()=>{
  expect(hostedEnvironmentBound({...production,NEVORA_WORKFORCE_ENROLLMENT_ENABLED:'false',NEVORA_ONBOARDING_COMMERCE_ENABLED:'false'},'provisioner')).toBe(true);
 });
 it('preserves the provisioner tenant trial binding without admitting production billing or workforce roles',()=>{
  const trial={...production,NEVORA_ONBOARDING_COMMERCE_ENABLED:'true',NEVORA_COMMERCE_BINDING_KEY:Buffer.alloc(32,11).toString('base64url'),NEVORA_COMMERCE_WORKER_BINDING_KEY:Buffer.alloc(32,12).toString('base64url'),NEVORA_COMMERCE_ENCRYPTION_KEY:Buffer.alloc(32,13).toString('base64'),NEVORA_COMMERCE_ENROLLMENT_DATABASE_URL:'postgresql://nv_commerce_enroll_aaaaaaaaaaaaaaaaaaaaaaaa:fictional@ep-fixture.us-east-1.aws.neon.tech/catalog?sslmode=verify-full'};
  expect(hostedEnvironmentBound(trial,'provisioner')).toBe(true);
  for(const role of ['commercequeue','commercereconcile','stripewebhook','commerceapi','commerceauthority','workforcemonitor'] as const)expect(hostedEnvironmentBound(trial,role)).toBe(false);
 });
 it('records only bounded production task and HTTP outcome fields',async()=>{
  const lines:string[]=[];const log=vi.spyOn(console,'info').mockImplementation((line:string)=>{lines.push(line);});
  try{
   const handler=createScheduledHandler('provisioner',production,async()=>({state:'completed',private:'fictional-private-payload'}));
   await observedFetch('provisioner',handler,production)(tick('provisioner',{trigger:{type:'schedule',id:'trigger-fixture',name:'nevora-production-provisioner'}}));
   expect(lines.map(line=>JSON.parse(line))).toEqual([{event:'nevora_production_task',role:'provisioner',state:'completed'},{event:'nevora_production_http',role:'provisioner',status:200}]);
   expect(lines.join('')).not.toContain('fictional-private-payload');
  }finally{log.mockRestore();}
 });
});
describe('Neon scheduled worker boundary',()=>{
 it.each([
  ['commercequeue','STRIPE_WEBHOOK_SECRET'],['commercereconcile','NEVORA_COMMERCE_SMTP_PASSWORD'],['provisioner','STRIPE_SECRET_KEY'],['commercequeue','NEVORA_SIGNUP_SESSION_SECRET'],
 ] as const)('rejects %s receiving %s',async(role,key)=>{let effects=0;const clean={...workerEnv,[key]:'fictional'};expect((await createScheduledHandler(role,clean,async()=>{effects++;return {state:'processed'};})(tick(role))).status).toBe(503);expect(effects).toBe(0);});
 it('accepts a trusted platform envelope for its fixed task',async()=>{let effects=0;const r=await createScheduledHandler('commercequeue',workerEnv,async()=>{effects++;return {state:'processed'};})(tick());expect(r.status).toBe(200);expect(await r.json()).toEqual({state:'processed'});expect(effects).toBe(1);});
 it.each([
  ['missing platform header',()=>tick('commercequeue',{},{}),401],
  ['mismatched invocation id',()=>tick('commercequeue',{invocation_id:'other'}),401],
  ['wrong task',()=>tick('provisioner'),403],
  ['wrong trigger type',()=>tick('commercequeue',{trigger:{type:'storage_object_created',id:'trigger-fixture',name:'nevora-staging-commercequeue'},data:{bucket_name:'fixture',object_key:'fixture'}}),403],
  ['other path',()=>new Request('https://fictional.invalid/elsewhere',{method:'POST'}),404],
  ['other method',()=>new Request('https://fictional.invalid/run'),404],
  ['oversized envelope',()=>new Request('https://fictional.invalid/run',{method:'POST',headers:{'x-neon-trigger-invocation-id':'fixture-run'},body:'x'.repeat(16385)}),413],
  ['malformed envelope',()=>new Request('https://fictional.invalid/run',{method:'POST',headers:{'x-neon-trigger-invocation-id':'fixture-run'},body:'{'}),400],
 ] as const)('rejects %s before running private work',async(_name,request,status)=>{let effects=0;const h=createScheduledHandler('commercequeue',workerEnv,async()=>{effects++;return {state:'processed'};});expect((await h(request())).status).toBe(status);expect(effects).toBe(0);});
 it('acknowledges a disabled authenticated tick without initializing capabilities',async()=>{let effects=0;const r=await createScheduledHandler('commercequeue',{...workerEnv,NEVORA_NEON_HOST_ENABLED:'false'},async()=>{effects++;return {state:'processed'};})(tick());expect(r.status).toBe(200);expect(await r.json()).toEqual({state:'disabled'});expect(effects).toBe(0);});
 it('refuses a worker on another branch',async()=>{let effects=0;const r=await createScheduledHandler('commercequeue',{...workerEnv,NEON_BRANCH_ID:'br-other'},async()=>{effects++;return {state:'processed'};})(tick());expect(r.status).toBe(503);expect(effects).toBe(0);});
 it('rejects provider management credentials in a billing worker',async()=>{let effects=0;const r=await createScheduledHandler('commercequeue',{...workerEnv,NEVORA_PROVISIONER_API_KEY:'fixture-only'},async()=>{effects++;return {state:'processed'};})(tick());expect(r.status).toBe(503);expect(effects).toBe(0);});
 it('reports retryable results as unavailable without disclosing job payloads',async()=>{const r=await createScheduledHandler('commercequeue',workerEnv,async()=>({state:'retry_scheduled',private:'fixture-only'}))(tick());expect(r.status).toBe(503);expect(await r.text()).not.toContain('fixture-only');});
 it('reduces thrown provider errors to a bounded response',async()=>{const r=await createScheduledHandler('provisioner',workerEnv,async()=>{throw Error('private fixture credential');})(tick('provisioner'));expect(r.status).toBe(503);expect(await r.text()).not.toContain('private fixture credential');});
});

it.each(['idle','disabled','retry_scheduled'])('records bounded native task state %s without job content',async state=>{
 const lines:string[]=[];const original=console.info;console.info=(line:string)=>lines.push(line);
 try{
  const handler=createScheduledHandler('commercequeue',{...workerEnv,NEVORA_NEON_HOST_ENABLED:state==='disabled'?'false':'true'},async()=>({state,private:'fictional-private-payload'}));
  await observedFetch('commercequeue',handler)(tick());
  const records=lines.map(line=>JSON.parse(line)),task=records.find(r=>r.event==='nevora_staging_task');expect(task).toEqual({event:'nevora_staging_task',role:'commercequeue',state:state==='retry_scheduled'?'retry_required':state});expect(lines.join('')).not.toContain('fictional-private-payload');
 }finally{console.info=original;}
});
