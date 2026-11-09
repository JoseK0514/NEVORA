import {it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
const browser=vi.hoisted(()=>({values:new Map<string,{name:string;value:string}>(),failWrites:false,get(name:string){return this.values.get(name);},getAll(name?:string){return [...this.values.values()].filter(v=>!name||v.name===name);},set(name:string,value:string){if(this.failWrites)throw Error('Owned browser cookie write failed');this.values.set(name,{name,value});},delete(name:string){this.values.delete(name);}}));
vi.mock('next/headers',()=>({cookies:async()=>browser,headers:async()=>new Headers({'x-forwarded-for':'127.0.0.1'})}));
vi.mock('next/navigation',()=>({redirect:(url:string)=>{throw Error('Owned redirect:'+url);}}));
import {onboardingJourneyFixture} from './onboarding-journey-fixture';
import {activateInitialOwner} from '@/lib/onboarding/owner-activation.server';
import {resolveWorkspaceBinding,type WorkspaceBinding} from '@/lib/workspace-routing/resolver.server';
import {withWorkspaceBinding} from '@/lib/workspace-routing/context.server';
import {login} from '@/app/login/actions';
import {readSessionMutationProof} from '@/lib/auth/session';
import {getWorkspaceDb} from '@/lib/workspace-routing/transport.server';
import {saveOnboardingStep,readOnboardingSetup} from '@/lib/onboarding/setup.server';
import {saveOnboardingPerson} from '@/lib/onboarding/people.server';
import {issueInvitationBatch,readInvitationBatch} from '@/lib/onboarding/invitation-batch.server';
import {sealWorkspaceToken} from '@/lib/workspace-routing/token-envelope.server';
import {POST as activateEmployee} from '@/app/api/auth/activate/route';
import {createTimeOffRequest} from '@/lib/data/requests';
async function signIn(binding:WorkspaceBinding,id:string,password:string){browser.values.clear();const form=new FormData();form.set('employeeId',id);form.set('password',password);await expect(withWorkspaceBinding(binding,()=>login(form))).rejects.toThrow('Owned redirect:/app');const proof=await withWorkspaceBinding(binding,readSessionMutationProof);if(!proof)throw Error('Real sign-in did not establish an owned session');return {proof,cookie:browser.get('fuel_session')!.value};}
it('creates two isolated fictional companies, signs in through real password actions, resumes setup and activates duplicate local employee IDs',async()=>{
 const f=await onboardingJourneyFixture();try{
  for(const [k,v] of Object.entries({NEVORA_WORKSPACE_MODE:'isolated',NEVORA_ONBOARDING_ENVIRONMENT:'test',NEVORA_PORTAL_BASE_DOMAIN:f.config.portalBaseDomain,NEVORA_CONTROL_DATABASE_URL:f.db.connectionUrl,NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY:f.config.encryptionKey,NEVORA_WORKSPACE_TOKEN_SECRET:f.config.workspaceTokenKey}))vi.stubEnv(k,v);
  const companies=await Promise.all([f.createCompany('alpha','a@example.invalid'),f.createCompany('beta','b@example.invalid')]);
  const owned=[];
  for(const c of companies){const grant=await c.grant();const password='Fictional Owner '+c.row.workspace_id+' 123!';expect((await activateInitialOwner(c.binding,{schemaVersion:1,operationId:randomUUID(),proof:grant.proof,password})).state).toBe('activated');expect((await c.work()).state).toBe('complete');const binding=await resolveWorkspaceBinding({origin:c.origin},f.store,f.routing);const auth=await signIn(binding,'OWNER-1',password);owned.push({c,binding,...auth});}
  for(const a of owned){
   let setup=await readOnboardingSetup(a.proof,a.binding);const home=setup.configuration.locations[0].id;
   const save=async(step:string,payload:unknown)=>{const result=await saveOnboardingStep(a.proof,a.binding,step,{schemaVersion:1,operationId:randomUUID(),expectedVersion:setup.snapshot.version,payload});expect(result.state).toBe('saved');setup=await readOnboardingSetup(a.proof,a.binding);};
   await save('SCHEDULING',{action:'STAFFING',staffingSettings:[{locationId:home,minimumStaffPerShift:1,requiresDesignatedLead:false}],hourTargets:[]});await save('SCHEDULING',{action:'COVERAGE_CREATE',locationId:home,dayOfWeek:1,startTime:'09:00',endTime:'17:00',positionRequirements:[]});
   expect((await saveOnboardingPerson(a.proof,a.binding,{schemaVersion:1,operationId:randomUUID(),expectedVersion:setup.snapshot.version,payload:{employee:{id:'EMP-1',firstName:'Fictional',lastName:'Employee',phone:'787-555-0102',email:'employee@'+new URL(a.c.origin).hostname,role:'EMPLOYEE',primaryLocationId:home,eligibleLocationIds:[home],positionIds:[]}}})).state).toBe('saved');
   setup=await readOnboardingSetup(a.proof,a.binding);expect(setup.snapshot.registrationState).toBe('READY');const employee=setup.configuration.people.find(p=>p.id==='EMP-1')!;let raw='',expiry='';const batch={schemaVersion:1,operationId:randomUUID(),expectedVersion:setup.snapshot.version,payload:{targets:[{employeeId:employee.id,expectedEmployeeVersion:employee.updatedAt,expectedInvitationRevision:0}]}};
   await issueInvitationBatch(a.proof,a.binding,batch,{async send(m){raw=m.proof;expiry=m.expiresAt;return {providerAccepted:true};}});const batchState=await readInvitationBatch(a.proof,a.binding,batch.operationId);expect(batchState.state==='ready'?batchState.stage:'unavailable').toBe('COMPLETE');
   const envelope=sealWorkspaceToken(a.binding,'INVITATION',raw,Date.parse(expiry)),request=new Request(a.c.origin+'/api/auth/activate',{method:'POST',headers:{host:new URL(a.c.origin).host,origin:a.c.origin,'content-type':'application/json','x-nevora-activation':'1'},body:JSON.stringify({proof:envelope,password:'Fictional employee password 123!'})});expect((await withWorkspaceBinding(a.binding,()=>activateEmployee(request))).status).toBe(200);
   const employeeLogin=await signIn(a.binding,'EMP-1','Fictional employee password 123!');await expect(readOnboardingSetup(employeeLogin.proof,a.binding)).rejects.toThrow();const requestId=randomUUID();await createTimeOffRequest({requestId,employeeId:'EMP-1',proof:employeeLogin.proof,startDate:'2035-11-12',endDate:'2035-11-13'},getWorkspaceDb(a.binding));expect((await a.c.resource.db.pool.query('SELECT employee_id FROM time_off_requests WHERE id=$1',[requestId])).rows).toEqual([{employee_id:'EMP-1'}]);
  }
  browser.values.set('fuel_session',{name:'fuel_session',value:owned[0].cookie});expect(await withWorkspaceBinding(owned[1].binding,readSessionMutationProof)).toBeNull();expect((await owned[1].c.resource.db.pool.query('SELECT id FROM employees ORDER BY id')).rows).toEqual([{id:'EMP-1'},{id:'OWNER-1'}]);
 }finally{browser.values.clear();vi.unstubAllEnvs();await f.close();}
});
it('recovers a failed browser cookie write after real password sign-in without changing the known credential',async()=>{
 const f=await onboardingJourneyFixture();try{for(const [k,v] of Object.entries({NEVORA_WORKSPACE_MODE:'isolated',NEVORA_ONBOARDING_ENVIRONMENT:'test',NEVORA_PORTAL_BASE_DOMAIN:f.config.portalBaseDomain,NEVORA_CONTROL_DATABASE_URL:f.db.connectionUrl,NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY:f.config.encryptionKey,NEVORA_WORKSPACE_TOKEN_SECRET:f.config.workspaceTokenKey}))vi.stubEnv(k,v);const c=await f.createCompany(),grant=await c.grant(),password='Fictional known Owner password 123!';await activateInitialOwner(c.binding,{schemaVersion:1,operationId:randomUUID(),proof:grant.proof,password});await c.work();const binding=await resolveWorkspaceBinding({origin:c.origin},f.store,f.routing),before=(await c.resource.db.pool.query('SELECT password_hash FROM employee_credentials')).rows[0].password_hash;browser.values.clear();browser.failWrites=true;const form=new FormData();form.set('employeeId','OWNER-1');form.set('password',password);await expect(withWorkspaceBinding(binding,()=>login(form))).rejects.toThrow('Owned browser cookie write failed');expect((await c.resource.db.pool.query('SELECT count(*)::int n FROM employee_sessions')).rows[0].n).toBe(1);browser.failWrites=false;expect((await signIn(binding,'OWNER-1',password)).proof.employee.role).toBe('OWNER');expect((await c.resource.db.pool.query('SELECT password_hash FROM employee_credentials')).rows[0].password_hash).toBe(before);
 }finally{browser.failWrites=false;browser.values.clear();vi.unstubAllEnvs();await f.close();}
});

it('processes real leased payroll and notification work with WORKER while denying Owner takeover SQL',async()=>{
 const {vi}=await import('vitest'),{withWorkspaceBinding}=await import('@/lib/workspace-routing/context.server'),{claimJob,finishJob}=await import('@/lib/payroll/worker'),{sqlDeliveryRepository}=await import('@/lib/data/push-deliveries'),{getWorkspaceDb}=await import('@/lib/workspace-routing/transport.server');
 const f=await onboardingJourneyFixture();try{
  const c=await f.createCompany();await f.activateCompany(c);const binding=await resolveWorkspaceBinding({origin:c.origin},f.store,f.routing,'WORKER'),ex=getWorkspaceDb(binding);vi.stubEnv('NEVORA_WORKSPACE_MODE','isolated');vi.stubEnv('NEVORA_PAYROLL_ENABLED','true');
  await withWorkspaceBinding(binding,async()=>{
   await expect(ex.query({text:"UPDATE employees SET role='EMPLOYEE' WHERE id='OWNER-1'",values:[]})).rejects.toMatchObject({code:'42501'});
   await expect(ex.query({text:"UPDATE employee_credentials SET password_hash='attacker' WHERE employee_id='OWNER-1'",values:[]})).rejects.toMatchObject({code:'42501'});
   await expect(ex.query({text:"INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'OWNER-1',clock_timestamp()+interval '1 hour')",values:['f'.repeat(64)]})).rejects.toMatchObject({code:'42501'});
   await expect(ex.query({text:'SELECT password_hash FROM employee_credentials',values:[]})).rejects.toMatchObject({code:'42501'});
   await expect(ex.query({text:"SELECT onboarding_worker_table_lock('employee_credentials','SHARE ROW EXCLUSIVE')",values:[]})).rejects.toMatchObject({code:'42501'});
   await c.resource.db.pool.query("INSERT INTO payroll_jobs(id,workspace_id,kind,business_key,payload) VALUES($1,$2,'REMINDER','fictional-worker-job','{}')",[randomUUID(),c.row.workspace_id]);
   const job=await claimJob(ex);expect(job).not.toBeNull();await finishJob(job!,[],ex);expect((await c.resource.db.pool.query("SELECT status FROM payroll_jobs WHERE business_key='fictional-worker-job'")).rows[0].status).toBe('SUCCEEDED');
   const session=(await c.resource.db.pool.query("SELECT token_hash FROM employee_sessions WHERE employee_id='OWNER-1' LIMIT 1")).rows[0].token_hash;
   await c.resource.db.pool.query("INSERT INTO push_subscriptions(id,employee_id,installation_hash,environment,endpoint_fingerprint,encrypted_material,generation,session_hash,status) VALUES('owned-sub','OWNER-1','owned-installation','test','owned-endpoint','fictional-ciphertext','owned-generation',$1,'active')",[session]);
   await c.resource.db.pool.query("INSERT INTO notifications(id,employee_id,type,title,body,event_key,environment,source_kind,source_id,source_version,effective_version,purpose,due_at,expires_at,urgency,push_state) VALUES('owned-notification','OWNER-1','SELF_TEST','Fictional','Fictional','owned-event','test','SELF_TEST','owned-sub','owned-generation','1','TEST',clock_timestamp()-interval '1 second',clock_timestamp()+interval '1 hour','normal','pending')");
   const deliveries=sqlDeliveryRepository('test',ex);await deliveries.materialize(['owned-notification']);const claims=await deliveries.claim({now:new Date(),limit:1,leaseSeconds:120,mode:'all'});expect(claims).toHaveLength(1);expect(await deliveries.finish(claims[0],{state:'provider_accepted'})).toBe(true);expect((await c.resource.db.pool.query("SELECT status FROM push_deliveries WHERE notification_id='owned-notification'")).rows[0].status).toBe('provider_accepted');
  });
 }finally{vi.unstubAllEnvs();await f.close();}
});
