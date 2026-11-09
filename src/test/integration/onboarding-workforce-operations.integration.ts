import {afterEach,expect,it,vi} from 'vitest';
import {randomUUID,randomBytes} from 'node:crypto';
import {Pool} from 'pg';
import {configureWorkerControlReader,workerControlRole} from '@/lib/operations/routing-reader';
import {currentWorkspaceBinding} from '@/lib/workspace-routing/context.server';
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
  // The schema permits this stranded state, but health must never call it empty.
  const malformed=randomUUID();await db.query("INSERT INTO payroll_jobs(id,workspace_id,kind,business_key,status,payload,available_at,lease_token,lease_until) VALUES($1::uuid,$2,'REMINDER',$1::text,'RUNNING','{}',clock_timestamp()-interval '1 hour',NULL,NULL)",[malformed,workspaceId]);
  const malformedBefore=(await db.query(queues)).rows;await expect(readQueueHealth(ex,'test')).rejects.toThrow('operations_health_unavailable');expect((await db.query(queues)).rows).toEqual(malformedBefore);await db.query('DELETE FROM payroll_jobs WHERE id=$1',[malformed]);
  await expect(ex.query({text:'SELECT password_hash FROM employee_credentials',values:[]})).rejects.toMatchObject({code:'42501'});
  await f.db.pool.query("UPDATE nevora_onboarding.workspace_registry SET lifecycle='SUSPENDED',revision=revision+1 WHERE id=$1",[workspaceId]);await expect(readQueueHealth(ex,'test')).rejects.toThrow('operations_health_unavailable');expect((await db.query(queues)).rows).toEqual(before);
 }finally{await f.close();}
});
it('uses actual company-scoped WORKER-only control custody without any browser key and rejects broad/mismatched readers',async()=>{
 const f=await onboardingJourneyFixture();const readers:Pool[]=[],roles:string[]=[];try{
  const a=await f.activateCompany(await f.createCompany()),b=await f.activateCompany(await f.createCompany('beta','b@example.invalid'));vi.stubEnv('NEVORA_WORKSPACE_MODE','isolated');
  async function reader(environment:'test'|'production'){
   const role=workerControlRole(a.c.row.workspace_id,environment),password=randomBytes(32).toString('base64url');roles.push(role);
   await f.db.pool.query(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION PASSWORD '${password}'`);await f.db.pool.query(`GRANT CONNECT ON DATABASE ${f.db.name} TO ${role}`);
   const client=await f.db.pool.connect();try{await configureWorkerControlReader(client,role);}finally{client.release();}
   const url=new URL(f.db.connectionUrl);url.username=role;url.password=password;const pool=new Pool({connectionString:url.href,max:2});readers.push(pool);return {role,pool,url:url.href,store:control.createControlStore(pool)};
  }
  const r=await reader('test');
  await f.db.pool.query("ALTER TABLE nevora_onboarding.workspace_registry ADD COLUMN future_private_metadata text DEFAULT 'fictional-do-not-project'");
  const rerun=await f.db.pool.connect();try{await configureWorkerControlReader(rerun,r.role);}finally{rerun.release();}
  expect((await r.pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema='nevora_onboarding' AND table_name='worker_workspace_registry' ORDER BY ordinal_position")).rows.map(x=>x.column_name)).toEqual([
   'id','registration_id','canonical_origin','environment','incarnation','revision','lifecycle','provider_project_id','app_secret_ref','app_role_name','worker_secret_ref','worker_role_name','created_at',
  ]);
  for(const table of ['workspace_secrets','workspace_registry'])await expect(r.pool.query('SELECT * FROM nevora_onboarding.'+table)).rejects.toMatchObject({code:'42501'});
  expect((await r.pool.query('SELECT workspace_id::text,role_kind FROM nevora_onboarding.worker_workspace_secrets')).rows).toEqual([{workspace_id:a.c.row.workspace_id,role_kind:'WORKER'}]);
  expect((await r.pool.query('SELECT id::text FROM nevora_onboarding.worker_workspace_registry')).rows).toEqual([{id:a.c.row.workspace_id}]);
  const machine=routing.readWorkerRoutingConfig({NEVORA_WORKSPACE_MODE:'isolated',NEVORA_ONBOARDING_ENVIRONMENT:'test',NEVORA_PORTAL_BASE_DOMAIN:f.config.portalBaseDomain,NEVORA_CONTROL_DATABASE_URL:r.url,NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY:f.config.encryptionKey});expect(machine).not.toHaveProperty('tokenKey');
  await expect(resolveWorkspaceBinding({origin:b.c.origin},r.store,machine,'WORKER')).rejects.toThrow();for(const purpose of ['APP','BOOTSTRAP'] as const)await expect(resolveWorkspaceBinding({origin:a.c.origin},r.store,machine,purpose)).rejects.toThrow();
  vi.spyOn(routing,'readWorkerRoutingConfig').mockReturnValue(machine);vi.spyOn(control,'runtimeControlStore').mockReturnValue(r.store);
  const work=vi.fn(async()=>readQueueHealth(getWorkspaceDb(await currentWorkspaceBinding()),'test'));
  const expected={workspaceId:a.c.row.workspace_id,environment:'test' as const};expect(await withWorkerWorkspace(a.c.origin,work,expected)).toMatchObject({workspaceId:a.c.row.workspace_id});
  await expect(withWorkerWorkspace(a.c.origin,work,{...expected,workspaceId:b.c.row.workspace_id})).rejects.toThrow();await expect(withWorkerWorkspace(a.c.origin,work,{...expected,environment:'production'})).rejects.toThrow();expect(work).toHaveBeenCalledTimes(1);
  const prod=await reader('production');expect((await prod.pool.query('SELECT * FROM nevora_onboarding.worker_workspace_secrets')).rows).toEqual([]);expect((await r.pool.query('SELECT count(*)::int n FROM nevora_onboarding.worker_workspace_secrets')).rows[0].n).toBe(1);
  // Effective column privileges are distinct from whole-table privileges.
  const setup=await f.db.pool.connect();try{
   await f.db.pool.query('GRANT SELECT(ciphertext) ON nevora_onboarding.workspace_secrets TO '+r.role);
   const foreign=(await f.db.pool.query("SELECT ciphertext FROM nevora_onboarding.workspace_secrets WHERE workspace_id=$1 AND role_kind='APP'",[b.c.row.workspace_id])).rows[0];
   expect((await r.pool.query('SELECT ciphertext FROM nevora_onboarding.workspace_secrets')).rows).toContainEqual(foreign);
   await expect(configureWorkerControlReader(setup,r.role)).rejects.toThrow('operations_reader_scope_invalid');
   await f.db.pool.query('REVOKE SELECT(ciphertext) ON nevora_onboarding.workspace_secrets FROM '+r.role);
   for(const [privilege,column] of [['UPDATE','ciphertext'],['INSERT','ciphertext'],['REFERENCES','id']] as const){
    await f.db.pool.query(`GRANT ${privilege}(${column}) ON nevora_onboarding.worker_workspace_secrets TO ${r.role}`);
    await expect(configureWorkerControlReader(setup,r.role)).rejects.toThrow('operations_reader_scope_invalid');
    await f.db.pool.query(`REVOKE ${privilege}(${column}) ON nevora_onboarding.worker_workspace_secrets FROM ${r.role}`);
   }
   await configureWorkerControlReader(setup,r.role);
  }finally{setup.release();}
  await f.db.pool.query('ALTER ROLE '+r.role+' INHERIT');const elevated=await f.db.pool.connect();try{await expect(configureWorkerControlReader(elevated,r.role)).rejects.toThrow('operations_reader_scope_invalid');}finally{elevated.release();await f.db.pool.query('ALTER ROLE '+r.role+' NOINHERIT');}
  await f.db.pool.query("UPDATE nevora_onboarding.workspace_registry SET lifecycle='SUSPENDED',revision=revision+1 WHERE id=$1",[a.c.row.workspace_id]);expect((await r.pool.query('SELECT * FROM nevora_onboarding.worker_workspace_secrets')).rows).toEqual([]);await expect(withWorkerWorkspace(a.c.origin,work,expected)).rejects.toThrow();
 }finally{for(const pool of readers)await pool.end();for(const role of roles){await f.db.pool.query('DROP OWNED BY '+role);await f.db.pool.query('DROP ROLE '+role);}await f.close();}
});
