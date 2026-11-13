import {afterEach,expect,it,vi} from 'vitest';
import {Pool} from 'pg';
import {createCommerce} from './service';
import {CommerceStore,type Business} from './store';
import {CommerceError} from './model';
const pools:Pool[]=[];
afterEach(async()=>{vi.restoreAllMocks();await Promise.all(pools.splice(0).map(p=>p.end()));});
function setup(path='/v1/plan-change'){
 const id='11111111-1111-4111-8111-111111111111';
 const b:Business={id,state:'ready',email:'owner@example.invalid',profile:{email:'owner@example.invalid'},planKey:'small',trialStart:null,trialEnd:null,paidThrough:null,pastDueSince:null,subscriptionStatus:'active',customerId:'cus_fictional',subscriptionId:'sub_fictional',employeeCount:7,enrollmentSource:'onboarding',incarnation:'1',slotId:id,origin:'https://company.example.test'};
 const owner={businessId:id,installationId:id,incarnation:'1',employeeId:'owner',sessionTokenHash:'a'.repeat(64),generation:'1'};
 const pool=new Pool({connectionString:'postgresql://fictional@127.0.0.1:1/catalog'});pools.push(pool);
 const store=new CommerceStore(pool,Buffer.alloc(32,7),'onboarding');
 const session=vi.spyOn(store,'session').mockResolvedValue(id);vi.spyOn(store,'tokenOwner').mockResolvedValue(owner);const business=vi.spyOn(store,'business').mockImplementation(async()=>({...b}));vi.spyOn(store,'rate').mockResolvedValue(undefined);
 const billing={checkout:vi.fn(async()=>'https://checkout.stripe.com/fictional'),portal:vi.fn(async()=>'https://billing.stripe.com/fictional'),webhook:vi.fn(),planChange:vi.fn(async()=>({url:'https://billing.stripe.com/fictional',plan:'team' as const,effective:'after_payment' as const}))};
 const headcount=vi.fn(async()=>7);
 const service=createCommerce({store,origin:'https://billing.example.test',allowedOrigins:['https://www.thevelani.com'],provisioningMode:'onboarding',headcount,billing});
 const send=(body:unknown={plan:'team',lang:'es'},headers:Record<string,string>={})=>service(new Request('https://billing.example.test'+path,{method:path==='/v1/status'?'GET':'POST',headers:{origin:'https://www.thevelani.com','content-type':'application/json',authorization:'Bearer '+ 'k'.repeat(43),'idempotency-key':'22222222-2222-4222-8222-222222222222',...headers},...(path==='/v1/status'?{}:{body:JSON.stringify(body)})}),'127.0.0.1');
 return {b,owner,store,session,business,billing,headcount,send};
}
it('returns the server-selected confirmation contract and rechecks current Owner authority after provider I/O',async()=>{
 const {send,billing,owner,session}=setup();const response=await send();expect(response.status).toBe(200);expect(await response.json()).toEqual({url:'https://billing.stripe.com/fictional',plan:'team',effective:'after_payment'});
 expect(billing.planChange).toHaveBeenCalledWith(expect.anything(),'22222222-2222-4222-8222-222222222222','team',owner,'es');expect(session).toHaveBeenCalledTimes(3);expect(response.headers.get('cache-control')).toBe('no-store');expect(response.headers.get('access-control-allow-origin')).toBe('https://www.thevelani.com');
});
it.each([null,'enterprise',{},'TEAM',1])('rejects an invalid target before contacting Stripe: %j',async plan=>{
 const {send,billing}=setup();const response=await send({plan});expect(response.status).toBe(400);expect(await response.json()).toEqual({error:{code:'invalid_plan'}});expect(billing.planChange).not.toHaveBeenCalled();
});
it('rejects invalid language, foreign origins and missing operation keys before contacting Stripe',async()=>{
 const {send,billing}=setup();for(const [body,headers] of [[{plan:'team',lang:'fr'},{}],[{plan:'team'},{origin:'https://foreign.invalid'}],[{plan:'team'},{'idempotency-key':''}]] as const)expect((await send(body,headers)).status).toBeGreaterThanOrEqual(400);expect(billing.planChange).not.toHaveBeenCalled();
});
it('does not return a financial URL after Owner revocation during provider I/O',async()=>{
 const {send,session,billing}=setup();session.mockResolvedValueOnce('11111111-1111-4111-8111-111111111111').mockResolvedValueOnce('11111111-1111-4111-8111-111111111111').mockRejectedValue(new CommerceError('unauthorized',401));
 const response=await send();expect(response.status).toBe(401);expect(await response.json()).toEqual({error:{code:'unauthorized'}});expect(billing.planChange).toHaveBeenCalledTimes(1);
});
it('does not return a financial URL after installation replacement during provider I/O',async()=>{
 const {send,b,billing}=setup();billing.planChange.mockImplementation(async()=>{b.incarnation='2';return {url:'https://billing.stripe.com/fictional',plan:'team',effective:'after_payment'};});
 const response=await send();expect(response.status).toBe(409);expect(await response.json()).toEqual({error:{code:'billing_binding_changed'}});
});

it.each(['/v1/status','/v1/checkout','/v1/portal','/v1/plan-change'])('withholds private results after revocation during awaited work: %s',async path=>{
 const {send,session,billing,headcount}=setup(path);
 const revoke=async()=>{session.mockRejectedValue(new CommerceError('unauthorized',401));};
 if(path==='/v1/status')headcount.mockImplementation(async()=>{await revoke();return 7;});
 else if(path==='/v1/checkout')billing.checkout.mockImplementation(async()=>{await revoke();return 'https://checkout.stripe.com/fictional';});
 else if(path==='/v1/portal')billing.portal.mockImplementation(async()=>{await revoke();return 'https://billing.stripe.com/fictional';});
 else billing.planChange.mockImplementation(async()=>{await revoke();return {url:'https://billing.stripe.com/fictional',plan:'team',effective:'after_payment'};});
 const response=await send();expect(response.status).toBe(401);expect(await response.json()).toEqual({error:{code:'unauthorized'}});
});
it.each(['/v1/status','/v1/checkout','/v1/portal','/v1/plan-change'])('rejects an installation changed during awaited work: %s',async path=>{
 const {send,b,billing,headcount}=setup(path);
 if(path==='/v1/status')headcount.mockImplementation(async()=>{b.incarnation='2';return 7;});
 else if(path==='/v1/checkout')billing.checkout.mockImplementation(async()=>{b.incarnation='2';return 'https://checkout.stripe.com/fictional';});
 else if(path==='/v1/portal')billing.portal.mockImplementation(async()=>{b.incarnation='2';return 'https://billing.stripe.com/fictional';});
 else billing.planChange.mockImplementation(async()=>{b.incarnation='2';return {url:'https://billing.stripe.com/fictional',plan:'team',effective:'after_payment'};});
 const response=await send();expect(response.status).toBe(409);expect(await response.json()).toEqual({error:{code:'billing_binding_changed'}});
});
it.each(['/v1/checkout','/v1/portal','/v1/plan-change'])('does not start provider work after revocation during headcount I/O: %s',async path=>{
 const {send,session,billing,headcount}=setup(path);
 headcount.mockImplementation(async()=>{session.mockRejectedValue(new CommerceError('unauthorized',401));return 7;});
 const response=await send();expect(response.status).toBe(401);expect(await response.json()).toEqual({error:{code:'unauthorized'}});
 expect(billing.checkout).not.toHaveBeenCalled();expect(billing.portal).not.toHaveBeenCalled();expect(billing.planChange).not.toHaveBeenCalled();
});
it.each(['/v1/checkout','/v1/portal'])('preserves a successful private URL response: %s',async path=>{
 const {send}=setup(path);const response=await send();expect(response.status).toBe(200);
 expect(await response.json()).toEqual({url:path==='/v1/checkout'?'https://checkout.stripe.com/fictional':'https://billing.stripe.com/fictional'});
});
