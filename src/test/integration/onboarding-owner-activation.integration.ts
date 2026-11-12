import {it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {onboardingJourneyFixture} from './onboarding-journey-fixture';
import {requestOwnerBootstrapGrant,runOwnerActivationWorker,activateInitialOwner} from '@/lib/onboarding/owner-activation.server';
import {resolveWorkspaceBinding} from '@/lib/workspace-routing/resolver.server';
import {getWorkspaceDb} from '@/lib/workspace-routing/transport.server';
import {verifyPassword} from '@/lib/auth/password';
import * as passwords from '@/lib/auth/password';
import {ControlCommitUnknown,type ControlStore} from '@/lib/onboarding/control-store.server';
const password='Fictional owner chooses a password 123!';
const command=(proof:string)=>({schemaVersion:1,operationId:randomUUID(),proof,password});
it('issues only a verified-signup-owned redirect, installs one real credential and finalizes both durable stores',async()=>{
 const f=await onboardingJourneyFixture();try{const c=await f.createCompany();expect((await requestOwnerBootstrapGrant({} as never,c.grantCommand,f.store,f.config)).state).toBe('unavailable');
  const {proof,ready}=await c.grant();expect(new URL(ready.url).origin).toBe(c.origin);expect(ready.url).not.toMatch(/password|postgres|OWNER-1/);
  await expect(c.appPool.query('SELECT * FROM onboarding_owner_grants')).rejects.toMatchObject({code:'42501'});
  const activation=await activateInitialOwner(c.binding,command(proof));expect(activation,JSON.stringify(f.errors)).toEqual({state:'activated',employeeId:'OWNER-1',nextAction:'SIGN_IN'});
  const rows=(await c.resource.db.pool.query('SELECT * FROM employee_credentials')).rows;expect(rows).toHaveLength(1);expect(await verifyPassword(password,rows[0].password_hash)).toBe(true);
  expect((await c.resource.db.pool.query('SELECT count(*)::int n FROM employee_sessions')).rows[0].n).toBe(0);
  await expect(resolveWorkspaceBinding({origin:c.origin},f.store,f.routing)).rejects.toThrow();
  expect((await c.work()).state).toBe('complete');expect((await f.db.pool.query('SELECT state FROM nevora_onboarding.registrations')).rows[0].state).toBe('SETUP_IN_PROGRESS');expect(await resolveWorkspaceBinding({origin:c.origin},f.store,f.routing)).toBeTruthy();
 }finally{await f.close();}
});
it('serializes simultaneous claims and retains the original command receipt while changed password replay conflicts',async()=>{
 const f=await onboardingJourneyFixture();try{const c=await f.createCompany(),{proof}=await c.grant(),cmd=command(proof);const results=await Promise.all([activateInitialOwner(c.binding,cmd),activateInitialOwner(c.binding,cmd)]);expect(results.map(x=>x.state)).toEqual(['activated','activated']);expect((await activateInitialOwner(c.binding,{...cmd,password:'Changed password 123!'})).state).toBe('conflict');expect((await activateInitialOwner(c.binding,command(proof))).state).toBe('invalid');expect((await c.resource.db.pool.query('SELECT count(*)::int n FROM onboarding_owner_activation_receipts')).rows[0].n).toBe(1);
 }finally{await f.close();}
});
it('rejects expired and explicitly revoked grants before any credential is created',async()=>{
 for(const update of ["expires_at=clock_timestamp()-interval '1 second'",'revoked_at=clock_timestamp()']){const f=await onboardingJourneyFixture();try{const c=await f.createCompany(),{proof}=await c.grant();await c.resource.db.pool.query('UPDATE onboarding_owner_grants SET '+update);expect((await activateInitialOwner(c.binding,command(proof))).state).toBe('invalid');expect((await c.resource.db.pool.query('SELECT count(*)::int n FROM employee_credentials')).rows[0].n).toBe(0);}finally{await f.close();}}
});
it('rechecks email, employment and grant authority after real scrypt completes and honors interruption',async()=>{
 for(const mode of ['email','abort']){const f=await onboardingJourneyFixture();const real=passwords.hashPassword;let spy:ReturnType<typeof vi.spyOn>|undefined;try{const c=await f.createCompany(),{proof}=await c.grant(),abort=new AbortController();spy=vi.spyOn(passwords,'hashPassword').mockImplementation(async p=>{const hash=await real(p);if(mode==='email')await c.resource.db.pool.query("UPDATE employees SET email='changed@example.invalid',updated_at=clock_timestamp() WHERE id='OWNER-1'");else abort.abort();return hash;});expect((await activateInitialOwner(c.binding,command(proof),getWorkspaceDb(c.binding),abort.signal)).state).toBe('invalid');expect((await c.resource.db.pool.query('SELECT count(*)::int n FROM employee_credentials')).rows[0].n).toBe(0);}finally{spy?.mockRestore();await f.close();}}
});
it('refuses the other actual company host, restored incarnation and fabricated bindings',async()=>{
 const f=await onboardingJourneyFixture();try{const a=await f.createCompany('alpha','a@example.invalid'),b=await f.createCompany('beta','b@example.invalid'),{proof}=await a.grant();expect((await activateInitialOwner(b.binding,command(proof))).state).toBe('invalid');expect((await activateInitialOwner({} as never,command(proof),getWorkspaceDb(b.binding))).state).toBe('unavailable');await a.resource.db.pool.query('UPDATE onboarding_workspace_identity SET incarnation=2');expect((await activateInitialOwner(a.binding,command(proof))).state).toBe('unavailable');expect((await b.resource.db.pool.query('SELECT count(*)::int n FROM employee_credentials')).rows[0].n).toBe(0);
 }finally{await f.close();}
});
it('recovers lost credential commit acknowledgement by original receipt without issuing a session or changing the password',async()=>{
 const f=await onboardingJourneyFixture();try{const c=await f.createCompany(),{proof}=await c.grant(),cmd=command(proof);f.loseRuntimeCommit();expect((await activateInitialOwner(c.binding,cmd)).state).toBe('outcome_unknown');const hash=(await c.resource.db.pool.query('SELECT password_hash FROM employee_credentials')).rows[0].password_hash;expect((await activateInitialOwner(c.binding,cmd)).state).toBe('activated');expect((await c.resource.db.pool.query('SELECT password_hash FROM employee_credentials')).rows[0].password_hash).toBe(hash);expect((await c.resource.db.pool.query('SELECT count(*)::int n FROM employee_sessions')).rows[0].n).toBe(0);
 }finally{await f.close();}
});
it('recovers a lost company grant commit and a lost final control commit from their durable receipts',async()=>{
 const f=await onboardingJourneyFixture();try{const c=await f.createCompany();await requestOwnerBootstrapGrant(c.actor.session,c.grantCommand,f.store,f.config);f.provider.loseNextBootstrapCommit=true;await c.work();await c.work();const ready=await requestOwnerBootstrapGrant(c.actor.session,c.grantCommand,f.store,f.config);expect(ready.state).toBe('ready');if(ready.state!=='ready')throw Error('Expected grant');expect((await c.resource.db.pool.query('SELECT count(*)::int n FROM onboarding_owner_grants')).rows[0].n).toBe(1);const proof=new URLSearchParams(new URL(ready.url).hash.slice(1)).get('proof')!;await activateInitialOwner(c.binding,command(proof));
  let lost=false;const uncertain:ControlStore={query:(...a)=>f.store.query(...a),async transaction(work){const result=await f.store.transaction(work);if(!lost&&(await f.db.pool.query("SELECT 1 FROM nevora_onboarding.provisioning_operations WHERE state='ACTIVATED'")).rowCount){lost=true;throw new ControlCommitUnknown();}return result;}};
  await f.db.pool.query('UPDATE nevora_onboarding.provisioning_operations SET not_before=clock_timestamp()');await runOwnerActivationWorker({store:uncertain,config:f.config,connect:f.provider.connect});expect(lost).toBe(true);expect(await resolveWorkspaceBinding({origin:c.origin},f.store,f.routing)).toBeTruthy();expect((await c.resource.db.pool.query('SELECT count(*)::int n FROM employee_credentials')).rows[0].n).toBe(1);
 }finally{await f.close();}
});
it('binds the verified email independently of an unchanged employee timestamp',async()=>{
 const f=await onboardingJourneyFixture();try{const c=await f.createCompany(),{proof}=await c.grant();await c.resource.db.pool.query("UPDATE employees SET email='other@example.invalid' WHERE id='OWNER-1'");expect((await activateInitialOwner(c.binding,command(proof))).state).toBe('invalid');expect((await c.resource.db.pool.query('SELECT count(*)::int n FROM employee_credentials')).rows[0].n).toBe(0);}finally{await f.close();}
});
it('recovers the anchor-first/control-second activation gap without resetting credentials',async()=>{
 const f=await onboardingJourneyFixture();try{const c=await f.createCompany(),{proof}=await c.grant(),cmd=command(proof);await activateInitialOwner(c.binding,cmd);const hash=(await c.resource.db.pool.query('SELECT password_hash FROM employee_credentials')).rows[0].password_hash;f.provider.loseNextBootstrapCommit=true;expect((await c.work()).state).toBe('pending');await expect(resolveWorkspaceBinding({origin:c.origin},f.store,f.routing)).rejects.toThrow();expect((await c.work()).state).toBe('complete');const active=await resolveWorkspaceBinding({origin:c.origin},f.store,f.routing);expect((await activateInitialOwner(active,cmd)).state).toBe('activated');expect((await c.resource.db.pool.query('SELECT password_hash FROM employee_credentials')).rows[0].password_hash).toBe(hash);
 }finally{await f.close();}
});
it('rechecks Owner role during a simultaneous scrypt-bound claim and limits live-grant CPU admission',async()=>{
 const f=await onboardingJourneyFixture();const real=passwords.hashPassword;let spy:ReturnType<typeof vi.spyOn>|undefined;try{const c=await f.createCompany(),{proof}=await c.grant();spy=vi.spyOn(passwords,'hashPassword').mockImplementation(async p=>{const hash=await real(p);await c.resource.db.pool.query("UPDATE employees SET role='EMPLOYEE' WHERE id='OWNER-1'");return hash;});expect((await activateInitialOwner(c.binding,command(proof))).state).toBe('invalid');spy.mockRestore();await c.resource.db.pool.query("UPDATE employees SET role='OWNER'");await c.resource.db.pool.query('UPDATE onboarding_owner_grants SET claim_attempts=10');expect((await activateInitialOwner(c.binding,command(proof))).state).toBe('limited');expect((await c.resource.db.pool.query('SELECT count(*)::int n FROM employee_credentials')).rows[0].n).toBe(0);}finally{spy?.mockRestore();await f.close();}
});
it('uses real HTTP grant and activation boundaries without issuing an assumed browser session',async()=>{
 const {ownerActivationHttpHandlers}=await import('@/lib/onboarding/owner-activation-http.server');const f=await onboardingJourneyFixture();try{const c=await f.createCompany(),handlers=ownerActivationHttpHandlers({config:f.config,store:f.store});
  const grant=(cookie:string,origin=f.config.signupOrigin)=>new Request(f.config.signupOrigin+'/api/onboarding/bootstrap-grants',{method:'POST',headers:{origin,'content-type':'application/json',cookie},body:JSON.stringify(c.grantCommand)});
  expect((await handlers.grant(grant(''))).status).toBe(401);expect((await handlers.grant(grant('nevora_signup='+c.actor.sessionToken,'https://foreign.invalid'))).status).toBe(403);expect((await handlers.grant(grant('nevora_signup='+c.actor.sessionToken))).status).toBe(202);await c.work();const redirect=await handlers.grant(grant('nevora_signup='+c.actor.sessionToken));expect(redirect.headers.get('cache-control')).toBe('no-store, private');const ready=await redirect.json(),proof=new URLSearchParams(new URL(ready.url).hash.slice(1)).get('proof')!,cmd=command(proof);
  const activate=(origin=c.origin)=>new Request(c.origin+'/api/onboarding/owner-activation',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(cmd)});
  expect((await handlers.activate(activate(f.config.signupOrigin))).status).toBe(403);const pending=await handlers.activate(activate());expect(pending.status).toBe(202);expect(await pending.json()).toEqual({state:'pending',operationId:cmd.operationId,pollAfterMs:1000});expect((await handlers.activate(activate())).status).toBe(202);await c.work();const response=await handlers.activate(activate());expect(response.status).toBe(200);expect(response.headers.get('set-cookie')).toBeNull();expect(await response.json()).toEqual({state:'activated',employeeId:'OWNER-1',nextAction:'SIGN_IN'});expect((await handlers.activate(activate())).status).toBe(200);expect((await c.resource.db.pool.query('SELECT count(*)::int n FROM employee_sessions')).rows[0].n).toBe(0);
 }finally{await f.close();}
});
it('adds activation support to a legacy schema without adopting its existing active Owner',async()=>{
 const {freshOnboardingDatabase}=await import('./onboarding-fixture');const {Client}=await import('pg');const {canonicalCompanyManifest,installCompanyBase,insertOwnerProfile,installCompanyFinal}=await import('@/lib/company-bootstrap/server');const db=await freshOnboardingDatabase(),client=new Client({connectionString:db.connectionUrl});await client.connect();try{const manifest=await canonicalCompanyManifest(),old={...manifest,base:manifest.base.filter(m=>m.file!=='0049_initial_owner_activation.sql')},workspaceId=randomUUID(),locationId=randomUUID();await client.query('BEGIN');await installCompanyBase(client,old,{workspaceId,name:'Fictional existing company',timeZone:'America/Chicago',locationId,locationName:'Main',locationShortName:'Main',locationKey:'main'});const hash=await passwords.hashPassword(password);await insertOwnerProfile(client,{id:'EXISTING-OWNER',firstName:'Fictional',lastName:'Existing',phone:'787-555-0101',email:'existing@example.invalid'},locationId,[locationId],{active:true,passwordHash:hash});await installCompanyFinal(client,old);await client.query('COMMIT');await client.query(manifest.base.find(m=>m.file==='0049_initial_owner_activation.sql')!.body);expect((await client.query('SELECT count(*)::int n FROM onboarding_initial_owner')).rows[0].n).toBe(0);expect((await client.query('SELECT password_hash FROM employee_credentials')).rows[0].password_hash).toBe(hash);expect((await client.query('SELECT active FROM employees')).rows[0].active).toBe(true);}finally{await client.end();await db.close();}
});

it('skips ten expired pending registrations and fairly rotates live activation work',async()=>{
 const f=await onboardingJourneyFixture();try{
  Object.assign(f.config,{maxNewProjectsPerDay:20,verificationBucketLimit:50});
  for(let i=0;i<10;i++){const c=await f.createCompany('abandoned-'+i,'abandoned-'+i+'@example.invalid');await f.db.pool.query("UPDATE nevora_onboarding.registrations SET expires_at=clock_timestamp()-interval '1 second' WHERE id=$1",[c.row.registration_id]);}
  const a=await f.createCompany('live-alpha','live-alpha@example.invalid'),b=await f.createCompany('live-beta','live-beta@example.invalid');
  const first=await runOwnerActivationWorker({store:f.store,config:f.config,connect:f.provider.connect});expect(first.state).toBe('pending');expect([a.command.operationId,b.command.operationId]).toContain(first.operationId);
  await f.db.pool.query('UPDATE nevora_onboarding.provisioning_operations SET not_before=clock_timestamp()');
  const second=await runOwnerActivationWorker({store:f.store,config:f.config,connect:f.provider.connect});expect(second.state).toBe('pending');expect(second.operationId).not.toBe(first.operationId);
 }finally{await f.close();}
});
