import {expect,it,vi} from 'vitest';
import {createCommerce,type BillingPort} from './service';
import {type Business,type CommerceStore} from './store';
import {prepareCheckoutPlan} from './checkout';
const stamp=Date.parse('2026-11-13T23:52:28Z');
const original:Business={id:'11111111-1111-4111-8111-111111111111',state:'ready',email:'owner@example.invalid',
 profile:{email:'owner@example.invalid',businessName:'Fictional recovery'},trialStart:stamp-86400000,
 trialEnd:Date.parse('2026-12-09T00:06:15.800Z'),paidThrough:Date.parse('2026-12-09T00:29:58.000Z'),
 pastDueSince:null,subscriptionStatus:'canceled',customerId:'cus_fixture',subscriptionId:'sub_fixture',
 planKey:'small',employeeCount:1,enrollmentSource:'slots',incarnation:null,slotId:'slot-fixture',origin:'https://company.example.test'};
async function status(patch:Partial<Business>={},enabled=true,authorized=true){
 const business={...original,...patch};
 const store={session:async()=>{if(!authorized)throw Error('unauthorized');return business.id;},tokenOwner:async()=>null,business:async()=>business} as unknown as CommerceStore;
 const billing={checkout:vi.fn(),portal:vi.fn(),webhook:vi.fn()} as unknown as BillingPort;
 const app=createCommerce({store,origin:'https://billing.example.test',allowedOrigins:['https://billing.example.test'],
  now:()=>stamp,headcount:async()=>1,...(enabled?{billing}:{})});
 const response=await app(new Request('https://billing.example.test/v1/status',{headers:{authorization:'Bearer fixture'}}),'127.0.0.1');
 return {response,body:await response.json(),business};
}
it.each(['canceled','incomplete_expired'])('offers Checkout for terminal %s while preserving remaining paid/trial coverage',async subscriptionStatus=>{
 const {response,body,business}=await status({subscriptionStatus});
 expect(response.status).toBe(200);expect(body).toMatchObject({state:'paid',operational:true,plan:'small',billingAction:'checkout',
  trialEndsAt:'2026-12-09T00:06:15.800Z',paidThrough:'2026-12-09T00:29:58.000Z'});
 expect(business.subscriptionId).toBe('sub_fixture');expect(business.paidThrough).toBe(original.paidThrough);
});
it.each(['active','trialing','past_due','unpaid','incomplete','paused'])('keeps an existing nonterminal %s subscription on Portal',async subscriptionStatus=>{
 expect((await status({subscriptionStatus})).body.billingAction).toBe('portal');
});
it('offers initial Checkout only when both subscription identity and status are absent',async()=>{
 expect((await status({subscriptionId:null,subscriptionStatus:null})).body.billingAction).toBe('checkout');
 expect((await status({subscriptionId:null,subscriptionStatus:'active'})).body.billingAction).toBeNull();
});
it.each([null,'unknown-provider-state'])('does not infer replacement eligibility for unknown projection %s',async subscriptionStatus=>{
 expect((await status({subscriptionStatus})).body.billingAction).toBeNull();
});
it('does not offer a financial action without billing configuration or ready company state',async()=>{
 expect((await status({},false)).body.billingAction).toBeNull();
 expect((await status({state:'pending'})).body.billingAction).toBeNull();
 expect((await status({},true,false)).response.status).not.toBe(200);
});
function planning(status='canceled',cancelAtPeriodEnd=false){
 const handoff=vi.fn(async()=>{}),creates=vi.fn(async()=>{throw Error('unexpected_mutation');});
 const business={...original,subscriptionStatus:status};
 const stripe={customers:{retrieve:async()=>({id:'cus_fixture',metadata:{nevora_business_id:business.id}}),create:creates},
  prices:{retrieve:async()=>({id:'price_small',active:true,livemode:false,currency:'usd',unit_amount:1900,recurring:{interval:'month',interval_count:1}})},
  subscriptions:{retrieve:vi.fn(async()=>({id:'sub_fixture',customer:'cus_fixture',status,cancel_at_period_end:cancelAtPeriodEnd,metadata:{nevora_business_id:business.id}})),list:async()=>({data:[],has_more:false}),create:creates},
  checkout:{sessions:{create:creates}}};
 const ports={store:{key:Buffer.alloc(32,9),handoff},stripe,prices:{small:'price_small',team:'price_team'},
  origin:'https://billing.example.test',now:()=>stamp,live:false,headcount:async()=>1};
 const client={query:vi.fn(async()=>({rowCount:0,rows:[]}))};
 return {ports,business,client,handoff,creates};
}
it('existing Checkout planner preserves the later original paid anchor and uses setup, without creating a subscription or charge',async()=>{
 const f=planning();const result=await prepareCheckoutPlan(f.ports as never,f.client as never,f.business,'22222222-2222-4222-8222-222222222222',null,'en');
 expect(result.state).toBe('prepared');if(result.state!=='prepared')throw Error('unexpected fixture result');
 expect(result.params.mode).toBe('setup');expect(result.params.line_items).toBeUndefined();
 const submit=result.params.custom_text?.submit;
 expect(submit&&typeof submit==='object'?submit.message:null).toContain('2026-12-09');
 expect(f.business.paidThrough).toBe(original.paidThrough);expect(f.business.trialEnd).toBe(original.trialEnd);
 expect(f.creates).not.toHaveBeenCalled();
});
it('cancel-at-period-end active subscription remains nonterminal and refuses replacement Checkout',async()=>{
 const f=planning('active',true);
 await expect(prepareCheckoutPlan(f.ports as never,f.client as never,f.business,'22222222-2222-4222-8222-222222222222',null,'en')).rejects.toThrow('use_billing_portal');
 expect(f.creates).not.toHaveBeenCalled();expect(f.handoff).not.toHaveBeenCalled();
});
it('an unavailable provider read never authorizes replacement or mutates coverage',async()=>{
 const f=planning();f.ports.stripe.subscriptions.retrieve.mockRejectedValueOnce(Error('fixture_provider_unavailable'));
 await expect(prepareCheckoutPlan(f.ports as never,f.client as never,f.business,'22222222-2222-4222-8222-222222222222',null,'en')).rejects.toThrow('fixture_provider_unavailable');
 expect(f.creates).not.toHaveBeenCalled();expect(f.handoff).not.toHaveBeenCalled();expect(f.business.paidThrough).toBe(original.paidThrough);
});
