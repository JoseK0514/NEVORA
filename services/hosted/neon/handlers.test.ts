import {describe,it,expect,vi} from 'vitest';
import Stripe from 'stripe';
import {createWebhookHandler,createScheduledHandler,UNUSABLE_DATABASE_URL,type HostedRole} from './handlers';
const secret='whsec_hosted_fixture';
const env={NEVORA_NEON_HOST_ENABLED:'true',NEVORA_NEON_BRANCH_ID:'br-fictional-staging',NEON_BRANCH_ID:'br-fictional-staging',NEVORA_COMMERCE_ENVIRONMENT:'staging',NEVORA_ONBOARDING_ENVIRONMENT:'test',NEVORA_WORKSPACE_MODE:'isolated',DATABASE_URL:UNUSABLE_DATABASE_URL,DATABASE_URL_UNPOOLED:UNUSABLE_DATABASE_URL,STRIPE_WEBHOOK_SECRET:secret};
function event(live=false){return JSON.stringify({id:'evt_hosted_fixture',object:'event',type:'checkout.session.completed',livemode:live,data:{object:{id:'cs_test_hosted'}}});}
function webhook(raw=event(),signature=Stripe.webhooks.generateTestHeaderString({payload:raw,secret})){return new Request('https://fictional.invalid/webhooks/stripe',{method:'POST',headers:{'stripe-signature':signature},body:raw});}
function tick(role:HostedRole='commercequeue',override:Record<string,unknown>={},headers:Record<string,string>={'x-neon-trigger-invocation-id':'fixture-run'}){
 return new Request('https://fictional.invalid/run',{method:'POST',headers,body:JSON.stringify({version:1,invocation_id:'fixture-run',trigger:{type:'schedule',id:'trigger-fixture',name:'nevora-staging-'+role},data:{scheduled_at:'2026-11-08T12:00:00Z'},...override})});
}
describe('Neon sandbox webhook boundary',()=>{
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
describe('Neon scheduled worker boundary',()=>{
 it('accepts a trusted platform envelope for its fixed task',async()=>{let effects=0;const r=await createScheduledHandler('commercequeue',env,async()=>{effects++;return {state:'processed'};})(tick());expect(r.status).toBe(200);expect(await r.json()).toEqual({state:'processed'});expect(effects).toBe(1);});
 it.each([
  ['missing platform header',()=>tick('commercequeue',{},{}),401],
  ['mismatched invocation id',()=>tick('commercequeue',{invocation_id:'other'}),401],
  ['wrong task',()=>tick('provisioner'),403],
  ['wrong trigger type',()=>tick('commercequeue',{trigger:{type:'storage_object_created',id:'trigger-fixture',name:'nevora-staging-commercequeue'},data:{bucket_name:'fixture',object_key:'fixture'}}),403],
  ['other path',()=>new Request('https://fictional.invalid/elsewhere',{method:'POST'}),404],
  ['other method',()=>new Request('https://fictional.invalid/run'),404],
  ['oversized envelope',()=>new Request('https://fictional.invalid/run',{method:'POST',headers:{'x-neon-trigger-invocation-id':'fixture-run'},body:'x'.repeat(16385)}),413],
  ['malformed envelope',()=>new Request('https://fictional.invalid/run',{method:'POST',headers:{'x-neon-trigger-invocation-id':'fixture-run'},body:'{'}),400],
 ] as const)('rejects %s before running private work',async(_name,request,status)=>{let effects=0;const h=createScheduledHandler('commercequeue',env,async()=>{effects++;return {state:'processed'};});expect((await h(request())).status).toBe(status);expect(effects).toBe(0);});
 it('acknowledges a disabled authenticated tick without initializing capabilities',async()=>{let effects=0;const r=await createScheduledHandler('commercequeue',{...env,NEVORA_NEON_HOST_ENABLED:'false'},async()=>{effects++;return {state:'processed'};})(tick());expect(r.status).toBe(200);expect(await r.json()).toEqual({state:'disabled'});expect(effects).toBe(0);});
 it('refuses a worker on another branch',async()=>{let effects=0;const r=await createScheduledHandler('commercequeue',{...env,NEON_BRANCH_ID:'br-other'},async()=>{effects++;return {state:'processed'};})(tick());expect(r.status).toBe(503);expect(effects).toBe(0);});
 it('rejects provider management credentials in a billing worker',async()=>{let effects=0;const r=await createScheduledHandler('commercequeue',{...env,NEVORA_PROVISIONER_API_KEY:'fixture-only'},async()=>{effects++;return {state:'processed'};})(tick());expect(r.status).toBe(503);expect(effects).toBe(0);});
 it('reports retryable results as unavailable without disclosing job payloads',async()=>{const r=await createScheduledHandler('commercequeue',env,async()=>({state:'retry_scheduled',private:'fixture-only'}))(tick());expect(r.status).toBe(503);expect(await r.text()).not.toContain('fixture-only');});
 it('reduces thrown provider errors to a bounded response',async()=>{const r=await createScheduledHandler('provisioner',env,async()=>{throw Error('private fixture credential');})(tick('provisioner'));expect(r.status).toBe(503);expect(await r.text()).not.toContain('private fixture credential');});
});
