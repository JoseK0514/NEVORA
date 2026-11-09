import {afterEach,expect,it,vi} from 'vitest';
import {createCommerce} from './service';
import {CommerceStore,type Business} from './store';
import {seal} from './security';
const id='11111111-1111-4111-8111-111111111111',key=Buffer.alloc(32,7),secret='a'.repeat(43);
afterEach(()=>vi.unstubAllGlobals());
async function status(timeZone:unknown,origin='https://www.thevelani.com'){
 const business={id,state:'ready',slotId:id,profile:{email:'owner@example.invalid',timeZone:'Pacific/Honolulu'},planKey:'small',trialEnd:Date.now()+10000,paidThrough:null,pastDueSince:null,subscriptionStatus:null} as Business;
 const store={key,session:async()=>id,tokenOwner:async()=>null,business:async()=>business,pool:{query:async()=>({rowCount:1,rows:[{id,origin:'https://company.example.test',instance_secret:seal(secret,key,'instance:'+id)}]})}} as unknown as CommerceStore;
 vi.stubGlobal('fetch',async()=>Response.json({businessId:id,installationId:id,employeeCount:7,...(timeZone===undefined?{}:{timeZone})}));
 const app=createCommerce({store,origin:'https://billing.example.test',allowedOrigins:['https://www.thevelani.com'],provisioningMode:'onboarding'});
 return app(new Request('https://billing.example.test/v1/status',{headers:{origin,authorization:'Bearer fictional'}}),'127.0.0.1');
}
it('returns the current workplace time zone rather than a stale signup profile',async()=>{
 const response=await status('America/New_York');expect(response.status).toBe(200);expect(await response.json()).toMatchObject({timeZone:'America/New_York',activeEmployees:7});
});
it('returns null when an older company does not yet publish its time zone',async()=>{
 expect(await (await status(undefined)).json()).toMatchObject({timeZone:null});
});
it.each(['Not/AZone',42,'a'.repeat(101)])('fails closed for a malformed company time zone: %s',async zone=>{
 expect((await status(zone)).status).toBe(503);
});
it('denies an unapproved browser origin before returning billing facts',async()=>{
 expect((await status('America/New_York','https://foreign.invalid')).status).toBe(403);
});
