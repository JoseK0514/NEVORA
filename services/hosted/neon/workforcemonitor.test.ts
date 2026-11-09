import {it,expect} from 'vitest';
import {createScheduledHandler} from './handlers';
import {INERT_HOST_CAPABILITIES,deploymentCapabilitiesAllowed} from './capabilities';
import {sourceFixture} from './test-source';
const env={...sourceFixture,...INERT_HOST_CAPABILITIES,NEVORA_NEON_HOST_ENABLED:'false',NEVORA_NEON_BRANCH_ID:'br-fictional-staging',NEON_BRANCH_ID:'br-fictional-staging',NEVORA_COMMERCE_ENVIRONMENT:'staging',NEVORA_ONBOARDING_ENVIRONMENT:'test',NEVORA_WORKSPACE_MODE:'isolated',DATABASE_URL:'postgresql://disabled.invalid/disabled',DATABASE_URL_UNPOOLED:'postgresql://disabled.invalid/disabled'};
const tick=(name='nevora-staging-workforcemonitor',header=true)=>new Request('https://fictional.invalid/run',{method:'POST',headers:header?{'x-neon-trigger-invocation-id':'fixture-run'}:{},body:JSON.stringify({version:1,invocation_id:'fixture-run',trigger:{type:'schedule',id:'trigger-fixture',name},data:{scheduled_at:'2026-11-09T12:00:00Z'}})});
it('admits only fixed authenticated monitor schedules and stays closed without opening database or mail',async()=>{
 let calls=0;const run=async()=>{calls++;return {state:'complete'};};
 expect((await createScheduledHandler('workforcemonitor',env,run)(tick())).status).toBe(200);expect(calls).toBe(0);
 expect((await createScheduledHandler('workforcemonitor',{...env,NEVORA_NEON_HOST_ENABLED:'true'},run)(tick())).status).toBe(200);expect(calls).toBe(1);
 for(const request of [tick('nevora-staging-provisioner'),tick(undefined,false)])expect((await createScheduledHandler('workforcemonitor',env,run)(request)).status).toBeGreaterThanOrEqual(400);
 expect(calls).toBe(1);
});
it('refuses every extra business, provider or browser capability and accepts only named monitor/mail custody',()=>{
 const {NEON_BRANCH_ID:_native,...snapshot}=env;
 expect(deploymentCapabilitiesAllowed('workforcemonitor',snapshot)).toBe(true);
 for(const field of ['NEVORA_CONTROL_DATABASE_URL','NEVORA_PROVISIONER_API_KEY','NEVORA_COMMERCE_DATABASE_URL','NEVORA_COMMERCE_WORKER_BINDING_KEY','NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY','NEVORA_WORKSPACE_TOKEN_SECRET','STRIPE_SECRET_KEY','OPENAI_API_KEY'])expect(deploymentCapabilitiesAllowed('workforcemonitor',{...snapshot,[field]:'fictional'})).toBe(false);
 expect(deploymentCapabilitiesAllowed('workforcemonitor',{...snapshot,NEVORA_OPERATIONS_MONITOR_DATABASE_URL:'postgresql://owner:fictional@ep-fictional.neon.tech/control?sslmode=verify-full'})).toBe(false);
});
