import {expect,it,vi} from 'vitest';
import {sourceFixture} from './test-source';
import {INERT_HOST_CAPABILITIES,roleCapabilitiesAllowed,approvedCapabilityNames} from './capabilities';
import {createProvisionerRun} from './provisioner-dispatch';
import {UNUSABLE_DATABASE_URL,createScheduledHandler} from './handlers';
const sha=sourceFixture.NEVORA_NEON_SOURCE_SHA;
const env={...INERT_HOST_CAPABILITIES,...sourceFixture,DATABASE_URL:UNUSABLE_DATABASE_URL,DATABASE_URL_UNPOOLED:UNUSABLE_DATABASE_URL,NEVORA_NEON_HOST_ENABLED:'true',NEVORA_NEON_BRANCH_ID:'br-hidden-mud-bbnc2fxk',NEON_BRANCH_ID:'br-hidden-mud-bbnc2fxk',NEVORA_COMMERCE_ENVIRONMENT:'staging',NEVORA_ONBOARDING_ENVIRONMENT:'test',NEVORA_WORKSPACE_MODE:'isolated',NEVORA_WORKFORCE_ENROLLMENT_ENABLED:'true',NEVORA_WORKFORCE_ENROLLMENT_REQUESTS:JSON.stringify([{id:'11111111-1111-4111-8111-111111111111',requestHash:'b'.repeat(64)}])};
function tick(name='nevora-staging-provisioner',id='fixture',header='fixture'){return new Request('https://fictional.invalid/run',{method:'POST',headers:{'x-neon-trigger-invocation-id':header},body:JSON.stringify({version:1,invocation_id:id,trigger:{type:'schedule',id:'trigger-fixture',name},data:{scheduled_at:'2026-11-09T12:00:00Z'}})});}
it('admits enrollment variable names only to the private provisioner',()=>{for(const role of ['stripewebhook','commercequeue','commercereconcile','commerceauthority','commerceapi','workforcemonitor'] as const){expect(approvedCapabilityNames(role).has('NEVORA_WORKFORCE_ENROLLMENT_ENABLED')).toBe(false);expect(roleCapabilitiesAllowed(role,env)).toBe(false);}expect(approvedCapabilityNames('provisioner').has('NEVORA_WORKFORCE_ENROLLMENT_REQUESTS')).toBe(true);});
it('dispatches the actual native callback exclusively to enrollment, with no request-selected work',async()=>{
 const normal=vi.fn(async()=>{throw Error('normal_provisioner_forbidden');}),enroll=vi.fn(async()=>({state:'processed',private:'must_not_expose'}));
 const callback=createProvisionerRun(env,sha,{normal,enroll});const handler=createScheduledHandler('provisioner',env,callback);
 const response=await handler(tick());expect(response.status).toBe(200);expect(await response.json()).toEqual({state:'processed'});expect(normal).not.toHaveBeenCalled();expect(enroll).toHaveBeenCalledTimes(1);
 for(const request of [tick('nevora-staging-commercequeue'),tick('nevora-staging-provisioner','other'),new Request('https://fictional.invalid/enroll',{method:'POST'})])expect((await handler(request)).status).not.toBe(200);expect(enroll).toHaveBeenCalledTimes(1);
});
it('preserves ordinary dispatch when absent and fails invalid mode without falling back',async()=>{
 const normal=vi.fn(async()=>({state:'idle'})),enroll=vi.fn(async()=>{throw Error('enrollment_forbidden');});expect(await createProvisionerRun({},sha,{normal,enroll})()).toEqual({state:'idle'});
 await expect(createProvisionerRun({NEVORA_WORKFORCE_ENROLLMENT_ENABLED:'invalid'},sha,{normal,enroll})()).rejects.toThrow();expect(normal).toHaveBeenCalledTimes(1);expect(enroll).not.toHaveBeenCalled();
});
