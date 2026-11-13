import {afterEach,expect,it,vi} from 'vitest';
import {Pool} from 'pg';
import {createCommerce} from './service';
import {CommerceStore,type Business} from './store';
import {businessAccess} from './access';
import {seal} from './security';
const id='11111111-1111-4111-8111-111111111111',key=Buffer.alloc(32,7),secret='a'.repeat(43);
const pools:Pool[]=[];
afterEach(async()=>{vi.unstubAllGlobals();vi.restoreAllMocks();await Promise.all(pools.splice(0).map(p=>p.end()));});
async function status(timeZone:unknown,origin='https://www.thevelani.com'){
 const business:Business={id,state:'ready',slotId:id,email:'owner@example.invalid',profile:{email:'owner@example.invalid',timeZone:'Pacific/Honolulu'},planKey:'small',trialStart:null,trialEnd:Date.now()+10000,paidThrough:null,pastDueSince:null,subscriptionStatus:null,customerId:null,subscriptionId:null,employeeCount:7,enrollmentSource:'onboarding',incarnation:'1',origin:'https://company.example.test'};
 const pool=new Pool({connectionString:'postgresql://fictional@127.0.0.1:1/catalog'});pools.push(pool);
 const store=new CommerceStore(pool,key,'onboarding');
 vi.spyOn(store,'session').mockResolvedValue(id);vi.spyOn(store,'tokenOwner').mockResolvedValue(null);vi.spyOn(store,'business').mockResolvedValue(business);
 vi.spyOn(pool,'query').mockImplementation(async()=>({command:'SELECT',oid:0,fields:[],rowCount:1,rows:[{id,origin:'https://company.example.test',instance_secret:seal(secret,key,'instance:'+id)}]}));
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

it.each([0,15,16,30,31])('projects active headcount without inventing a plan or deleting people: %s',async count=>{
 const pool=new Pool({connectionString:'postgresql://fictional@127.0.0.1:1/catalog'});pools.push(pool);
 const store=new CommerceStore(pool,key),business:Business={id,state:'ready',email:'owner@example.invalid',profile:{email:'owner@example.invalid'},planKey:'small',trialStart:null,trialEnd:Date.now()+60000,paidThrough:null,pastDueSince:null,subscriptionStatus:null,customerId:null,subscriptionId:null,employeeCount:count,enrollmentSource:'onboarding',incarnation:'1',slotId:id,origin:'https://company.example.test'};
 for(const plan of ['small','team'] as const){
  const limit=plan==='small'?15:30;
  const result=await businessAccess(store,{...business,planKey:plan},Date.now(),async()=>count);
  expect(result).toMatchObject({plan,employeeLimit:limit,activeEmployees:count,operational:count<=limit,billing:true,export:true,reason:count>limit?'employee_limit_exceeded':null});
 }
});
