import {afterEach,expect,it,vi} from 'vitest';
import {createHash,createHmac} from 'node:crypto';
import type {Pool} from 'pg';
import {CommerceStore,type Business} from './store';
import {seal} from './security';
import {readInstallationHeadcount,applyInstallationCapacity,verifyInstallationOwner} from './installation';
const id='11111111-1111-4111-8111-111111111111',company='https://alpha.portal-staging.example.invalid',gateway='https://br-fictional-staging-commerceauthority.compute.c-15.us-east-1.aws.neon.tech';
const key=Buffer.alloc(32,7),secret=Buffer.alloc(32,8).toString('base64url'),serviceKey=Buffer.alloc(32,9).toString('base64url');
const business={id,slotId:id,incarnation:'1'} as Business;
const owner={businessId:id,installationId:id,incarnation:'1',employeeId:'OWNER1',sessionTokenHash:'a'.repeat(64),generation:'1'};
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
function setup(enabled=true){
 for(const [name,value] of Object.entries({NEVORA_COMMERCE_ENVIRONMENT:'staging',NEVORA_ONBOARDING_ENVIRONMENT:'test',NEVORA_WORKSPACE_MODE:'isolated',NEVORA_NEON_BRANCH_ID:'br-fictional-staging',NEVORA_COMMERCE_COMPANY_GATEWAY_ORIGIN:enabled?gateway:'',NEVORA_COMMERCE_COMPANY_GATEWAY_KEY:enabled?serviceKey:''}))vi.stubEnv(name,value);
 // SQL selection/encryption already has owned-Postgres coverage; this port gives
 // the real installation functions one retained binding for transport checks.
 const pool={query:async()=>({rowCount:1,rows:[{id,origin:company,instance_secret:seal(secret,key,'instance:'+id)}]})} as unknown as Pool;
 const store=new CommerceStore(pool,key,'onboarding'),requests:Request[]=[];
 vi.stubGlobal('fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{const request=new Request(input,init);requests.push(request);const path=new URL(request.url).pathname;return Response.json(path.endsWith('/facts')?{businessId:id,installationId:id,employeeCount:7}:path.endsWith('/owner')?{valid:true,...owner}:{state:'applied'});});
 return {store,requests};
}
it('keeps the existing direct company transport when no staging bridge is configured',async()=>{
 const {store,requests}=setup(false);expect(await readInstallationHeadcount(store,business)).toBe(7);expect(requests[0].url).toBe(company+'/api/commerce/facts');expect(requests[0].headers.has('x-nevora-commerce-service-signature')).toBe(false);
});
it.each(['facts','policy','owner'] as const)('sends %s through the pinned staging bridge with company authorization bound to its exact body',async action=>{
 const {store,requests}=setup();if(action==='facts')expect(await readInstallationHeadcount(store,business)).toBe(7);else if(action==='policy')await applyInstallationCapacity(store,business,15);else expect(await verifyInstallationOwner(store,business,owner)).toBe(true);
 const request=requests[0];expect(request.url).toBe(gateway+'/api/commerce/'+action);expect(request.headers.get('x-nevora-company-origin')).toBe(company);expect(request.headers.get('authorization')).toBe('Bearer '+secret);expect(request.redirect).toBe('error');
 const body=await request.text(),parts=(request.headers.get('x-nevora-commerce-service-signature')??'').split('.');expect(parts[0]).toBe('v1');expect(Math.abs(Date.now()-Number(parts[1])*1000)).toBeLessThan(2000);
 const sha=(s:string)=>createHash('sha256').update(s).digest('hex');const expected=createHmac('sha256',Buffer.from(serviceKey,'base64url')).update(JSON.stringify(['nevora-private-commerce-v1',parts[1],request.method,company,'/api/commerce/'+action,sha('Bearer '+secret),sha(body)])).digest('base64url');expect(parts[2]).toBe(sha(body));expect(parts[3]).toBe(expected);
});
it.each([
 {NEVORA_COMMERCE_ENVIRONMENT:'production'},
 {NEVORA_ONBOARDING_ENVIRONMENT:'production'},
 {NEVORA_WORKSPACE_MODE:'single_company'},
 {NEVORA_COMMERCE_COMPANY_GATEWAY_KEY:''},
 {NEVORA_COMMERCE_COMPANY_GATEWAY_ORIGIN:''},
 {NEVORA_COMMERCE_COMPANY_GATEWAY_ORIGIN:'https://foreign.invalid'},
 {NEVORA_COMMERCE_COMPANY_GATEWAY_ORIGIN:'https://br-other-commerceauthority.compute.c-15.us-east-1.aws.neon.tech'},
])('fails before network work for an incomplete or out-of-scope bridge: %j',async patch=>{
 const {store,requests}=setup();for(const [name,value] of Object.entries(patch))vi.stubEnv(name,value);await expect(readInstallationHeadcount(store,business)).rejects.toMatchObject({code:'installation_transport_unavailable'});expect(requests.length).toBe(0);
});
