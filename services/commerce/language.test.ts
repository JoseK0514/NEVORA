import {expect,it,vi} from 'vitest';
import {createCommerce} from './service';
import type {CommerceStore,Business} from './store';
function app(){
 const b={id:'11111111-1111-4111-8111-111111111111',state:'ready',profile:{email:'owner@example.invalid'},planKey:'small'} as Business;
 const store={session:async()=>b.id,tokenOwner:async()=>null,business:async()=>b,rate:async()=>{}} as unknown as CommerceStore;
 const billing={checkout:vi.fn(async()=> 'https://checkout.stripe.com/fictional'),portal:vi.fn(async()=> 'https://billing.stripe.com/fictional'),webhook:vi.fn()};
 const service=createCommerce({store,origin:'https://billing.example.test',allowedOrigins:['https://www.thevelani.com'],provisioningMode:'onboarding',headcount:async()=>7,billing});
 return {billing,send:(path:string,body:unknown)=>service(new Request('https://billing.example.test'+path,{method:'POST',headers:{origin:'https://www.thevelani.com','content-type':'application/json',authorization:'Bearer fictional','idempotency-key':'22222222-2222-4222-8222-222222222222'},body:JSON.stringify(body)}),'127.0.0.1')};
}
it.each(['/v1/checkout','/v1/portal'])('passes validated Spanish to %s without changing authority',async path=>{
 const {billing,send}=app();expect((await send(path,{lang:'es'})).status).toBe(200);
 expect(path.endsWith('checkout')?billing.checkout:billing.portal).toHaveBeenCalledWith(expect.anything(),expect.any(String),null,'es');
});
it.each([null,'fr','ES',{},'https://foreign.invalid'])('rejects invalid language before calling billing: %j',async lang=>{
 const {billing,send}=app();const response=await send('/v1/checkout',{lang});expect(response.status).toBe(400);expect(await response.json()).toEqual({error:{code:'invalid_language'}});expect(billing.checkout).not.toHaveBeenCalled();
});
it('keeps legacy signup and email login disabled in integrated onboarding',async()=>{
 const {send}=app();for(const path of ['/v1/signup','/v1/login-link']){const response=await send(path,{lang:'es',email:'owner@example.invalid'});expect(response.status).toBe(409);expect(await response.json()).toEqual({error:{code:'use_onboarding'}});}
});
