import {afterEach,expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {onboardingJourneyFixture} from './onboarding-journey-fixture';
import {resolveWorkspaceBinding} from '@/lib/workspace-routing/resolver.server';
import {getWorkspaceDb} from '@/lib/workspace-routing/transport.server';
import {readQueueHealth,assessQueueHealth} from '@/lib/operations/queue-health';
import {withWorkerWorkspace} from '@/lib/workspace-routing/worker.server';
import * as routing from '@/lib/workspace-routing/config.server';
import * as control from '@/lib/onboarding/control-store.server';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllEnvs();});
const queues=`SELECT jsonb_build_object('payroll',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM payroll_jobs t),'notifications',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM notifications t),'deliveries',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM push_deliveries t),'subscriptions',(SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY id),'[]') FROM push_subscriptions t)) AS snapshot`;
it('observes real due/future/failed/leased queues under restricted WORKER without writes or cross-company data',async()=>{
 const f=await onboardingJourneyFixture();try{
  const a=await f.activateCompany(await f.createCompany()),b=await f.activateCompany(await f.createCompany('beta','b@example.invalid'));vi.stubEnv('NEVORA_WORKSPACE_MODE','isolated');
  const db=a.c.resource.db.pool,workspaceId=a.c.row.workspace_id;
  for(const [status,delay,lease] of [['PENDING','-5 minutes',null],['PENDING','1 hour',null],['FAILED','-5 minutes',null],['RUNNING','-5 minutes','-2 minutes'],['RUNNING','-5 minutes','1 minute']] as const)await db.query("INSERT INTO payroll_jobs(id,workspace_id,kind,business_key,status,payload,available_at,lease_token,lease_until) VALUES($1::uuid,$2,'REMINDER',$1::text,$3,'{}',clock_timestamp()+$4::interval,$5,CASE WHEN $6::text IS NULL THEN NULL ELSE clock_timestamp()+$6::interval END)",[randomUUID(),workspaceId,status,delay,lease?randomUUID():null,lease]);
  await db.query("INSERT INTO push_subscriptions(id,employee_id,installation_hash,environment,endpoint_fingerprint,encrypted_material,generation,session_hash,status) VALUES('owned-sub','OWNER-1','owned-installation','test','owned-endpoint','fictional-private-material','owned-generation',$1,'active')",[a.actor.sessionTokenHash]);
  async function notice(id:string,state='pending',due='-5 minutes',expires='1 hour',environment='test'){
   await db.query("INSERT INTO notifications(id,employee_id,type,title,body,event_key,environment,source_kind,source_id,source_version,effective_version,purpose,due_at,expires_at,urgency,push_state,cancelled_at) VALUES($1,'OWNER-1','SELF_TEST','Fictional','Fictional',$1,$2,'SELF_TEST',$1,'1','1','TEST',clock_timestamp()+$3::interval,clock_timestamp()+$4::interval,'normal',$5,CASE WHEN $5='cancelled' THEN clock_timestamp() END)",[id,environment,due,expires,state]);
  }
  await notice('due');await notice('future','pending','1 hour','2 hours');await notice('expired','pending','-1 hour','-1 minute');await notice('cancelled','cancelled');await notice('other-environment','pending','-5 minutes','1 hour','production');
  for(const [id,status,next,lease] of [['retry','retry_pending','-5 minutes',null],['expired-lease','processing','-5 minutes','-2 minutes'],['failed','failed','-5 minutes',null],['future-delivery','queued','1 hour',null]] as const){
   await notice(id,'materialized','-5 minutes','2 hours');await db.query("INSERT INTO push_deliveries(notification_id,subscription_id,generation,status,attempt_count,next_attempt_at,expires_at,lease_token,lease_expires_at) VALUES($1,'owned-sub','owned-generation',$2,1,clock_timestamp()+$3::interval,clock_timestamp()+interval '2 hours',$4,CASE WHEN $5::text IS NULL THEN NULL ELSE clock_timestamp()+$5::interval END)",[id,status,next,lease?'owned-lease':null,lease]);
  }
  const before=(await db.query(queues)).rows;
  const binding=await resolveWorkspaceBinding({origin:a.c.origin},f.store,f.routing,'WORKER'),ex=getWorkspaceDb(binding);
  expect((await ex.query<{role:string}>({text:'SELECT current_user AS role',values:[]}))[0].role).toBe(a.c.resource.identity.workerRole);
  const health=await readQueueHealth(ex,'test');expect(health).toMatchObject({workspaceId,payroll:{due:2,failed:1,expiredLeases:1},notifications:{dueIntents:1,dueDeliveries:2,failed:1,expiredLeases:1}});
  expect(health.payroll.oldestDueSeconds).toBeGreaterThanOrEqual(300);expect(health.payroll.oldestDueSeconds).toBeLessThan(600);expect(health.notifications.oldestDueSeconds).toBeGreaterThanOrEqual(300);expect(assessQueueHealth(health,120).healthy).toBe(false);
  const other=await readQueueHealth(getWorkspaceDb(await resolveWorkspaceBinding({origin:b.c.origin},f.store,f.routing,'WORKER')),'test');expect(other).toMatchObject({workspaceId:b.c.row.workspace_id,payroll:{due:0,failed:0,expiredLeases:0,oldestDueSeconds:0},notifications:{dueIntents:0,dueDeliveries:0,failed:0,expiredLeases:0,oldestDueSeconds:0}});expect(assessQueueHealth(other,120)).toEqual({healthy:true,reasons:[]});
  expect((await db.query(queues)).rows).toEqual(before);expect(JSON.stringify(health)).not.toMatch(/fictional-private-material|OWNER-1|owned-lease|password|session/);
  await expect(ex.query({text:'SELECT password_hash FROM employee_credentials',values:[]})).rejects.toMatchObject({code:'42501'});
  await f.db.pool.query("UPDATE nevora_onboarding.workspace_registry SET lifecycle='SUSPENDED',revision=revision+1 WHERE id=$1",[workspaceId]);await expect(readQueueHealth(ex,'test')).rejects.toThrow('operations_health_unavailable');expect((await db.query(queues)).rows).toEqual(before);
 }finally{await f.close();}
});
it('checks expected company/environment against the actual current registry before invoking scoped work',async()=>{
 const f=await onboardingJourneyFixture();try{
  const a=await f.activateCompany(await f.createCompany());vi.stubEnv('NEVORA_WORKSPACE_MODE','isolated');vi.stubEnv('NEVORA_WORKER_EXPECTED_WORKSPACE_ID',a.c.row.workspace_id);vi.stubEnv('NEVORA_WORKER_EXPECTED_ENVIRONMENT','test');
  vi.spyOn(routing,'readWorkspaceRoutingConfig').mockReturnValue(f.routing);vi.spyOn(control,'runtimeControlStore').mockReturnValue(f.store);
  const work=vi.fn(async()=>true);expect(await withWorkerWorkspace(a.c.origin,work)).toBe(true);
  vi.stubEnv('NEVORA_WORKER_EXPECTED_WORKSPACE_ID',randomUUID());await expect(withWorkerWorkspace(a.c.origin,work)).rejects.toThrow();expect(work).toHaveBeenCalledTimes(1);
  vi.stubEnv('NEVORA_WORKER_EXPECTED_WORKSPACE_ID',a.c.row.workspace_id);vi.stubEnv('NEVORA_WORKER_EXPECTED_ENVIRONMENT','production');await expect(withWorkerWorkspace(a.c.origin,work)).rejects.toThrow();expect(work).toHaveBeenCalledTimes(1);
 }finally{await f.close();}
});
