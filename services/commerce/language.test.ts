import {afterEach,expect,it,vi} from 'vitest';
import {Pool} from 'pg';
import {createCommerce} from './service';
import {CommerceStore,type Business} from './store';
const pools:Pool[]=[];
afterEach(async()=>{vi.restoreAllMocks();await Promise.all(pools.splice(0).map(p=>p.end()));});
function app(){
 const b:Business={id:'11111111-1111-4111-8111-111111111111',state:'ready',email:'owner@example.invalid',profile:{email:'owner@example.invalid'},planKey:'small',trialStart:null,trialEnd:null,paidThrough:null,pastDueSince:null,subscriptionStatus:null,customerId:null,subscriptionId:null,employeeCount:7,enrollmentSource:'onboarding',incarnation:'1',slotId:null,origin:'https://company.example.test'};
 const pool=new Pool({connectionString:'postgresql://fictional@127.0.0.1:1/catalog'});pools.push(pool);
 const store=new CommerceStore(pool,Buffer.alloc(32,7),'onboarding');
 vi.spyOn(store,'session').mockResolvedValue(b.id);vi.spyOn(store,'tokenOwner').mockResolvedValue(null);vi.spyOn(store,'business').mockResolvedValue(b);vi.spyOn(store,'rate').mockResolvedValue(undefined);
 const billing={checkout:vi.fn(async()=> 'https://checkout.stripe.com/fictional'),portal:vi.fn(async()=> 'https://billing.stripe.com/fictional'),webhook:vi.fn()};
 const service=createCommerce({store,origin:'https://billing.example.test',allowedOrigins:['https://www.thevelani.com'],provisioningMode:'onboarding',headcount:async()=>7,billing});
 return {billing,send:(path:string,body:unknown)=>service(new Request('https://billing.example.test'+path,{method:'POST',headers:{origin:'https://www.thevelani.com','content-type':'application/json',authorization:'Bearer fictional','idempotency-key':'22222222-2222-4222-8222-222222222222'},body:JSON.stringify(body)}),'127.0.0.1')};
}
it.each(['/v1/checkout','/v1/portal'])('forwards validated Spanish to %s',async path=>{
 const {billing,send}=app();expect((await send(path,{lang:'es'})).status).toBe(200);
 expect(path.endsWith('checkout')?billing.checkout:billing.portal).toHaveBeenCalledWith(expect.anything(),expect.any(String),null,'es');
});
it('preserves omitted language for legacy Portal retries',async()=>{
 const {billing,send}=app();expect((await send('/v1/portal',{})).status).toBe(200);
 expect(billing.portal).toHaveBeenCalledWith(expect.anything(),expect.any(String),null,undefined);
});
it.each([null,'fr','ES',{},'https://foreign.invalid'])('rejects invalid language before calling billing: %j',async lang=>{
 const {billing,send}=app();const response=await send('/v1/checkout',{lang});expect(response.status).toBe(400);expect(await response.json()).toEqual({error:{code:'invalid_language'}});expect(billing.checkout).not.toHaveBeenCalled();
});
it('keeps legacy signup and email login disabled in integrated onboarding',async()=>{
 const {send}=app();for(const path of ['/v1/signup','/v1/login-link']){const response=await send(path,{lang:'es',email:'owner@example.invalid'});expect(response.status).toBe(409);expect(await response.json()).toEqual({error:{code:'use_onboarding'}});}
});
