import {it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {onboardingJourneyFixture} from './onboarding-journey-fixture';
import {saveOnboardingPerson} from '@/lib/onboarding/people.server';
import {saveOnboardingRoster,previewOnboardingRoster} from '@/lib/onboarding/roster.server';
import {readOnboardingSetup} from '@/lib/onboarding/setup.server';
import {rosterHttpHandlers} from '@/lib/onboarding/roster-http.server';
import {getWorkspaceDb} from '@/lib/workspace-routing/transport.server';
const command=(version:string,location:string,overrides:Record<string,unknown>={})=>({schemaVersion:1,operationId:randomUUID(),expectedVersion:version,payload:{employee:{id:'EMP-1',firstName:'Fictional',lastName:'Employee',phone:'787-555-0102',email:'employee@example.invalid',role:'EMPLOYEE',primaryLocationId:location,eligibleLocationIds:[location],positionIds:[] as string[],...overrides}}});
const roster=(version:string,location:string,count=30)=>({schemaVersion:1,operationId:randomUUID(),expectedVersion:version,payload:{people:Array.from({length:count},(_,i)=>command(version,location,{id:`ROSTER-${i+1}`,email:`person${i+1}@example.invalid`}).payload)}});
it('imports 30 reviewed people in one atomic receipt, without invitations or credentials, and recovers lost replies',async()=>{
 const f=await onboardingJourneyFixture();try{
  const a=await f.activateCompany(await f.createCompany()),c=roster('1',a.actor.employee.primaryLocationId);f.loseRuntimeCommit();
  const ex=getWorkspaceDb(a.binding);let preflightReads=0;const counted:typeof ex={query:(...args)=>{preflightReads++;return ex.query(...args);},transaction:(...args)=>ex.transaction(...args)};
  const saved=await saveOnboardingRoster(a.actor,a.binding,c,counted);expect(preflightReads).toBeLessThan(20);expect(saved.state).toBe('saved');if(saved.state==='saved'){expect(saved.createdEmployeeIds).toHaveLength(30);expect(saved.snapshot.version).toBe('2');}
  expect((await saveOnboardingRoster(a.actor,a.binding,c)).state).toBe('saved');
  expect((await a.c.resource.db.pool.query('SELECT count(*)::int n FROM employees')).rows[0].n).toBe(31);
  expect((await a.c.resource.db.pool.query("SELECT count(*)::int n FROM company_access_operations WHERE kind='EMPLOYEE'")).rows[0].n).toBe(30);
  expect((await a.c.resource.db.pool.query('SELECT count(*)::int n FROM company_invitations')).rows[0].n).toBe(0);
  expect((await a.c.resource.db.pool.query("SELECT count(*)::int n FROM employee_credentials WHERE employee_id<>'OWNER-1'")).rows[0].n).toBe(0);
  const changed=structuredClone(c);changed.payload.people[29].employee.firstName='Changed';expect(await saveOnboardingRoster(a.actor,a.binding,changed)).toMatchObject({state:'conflict',reason:'changed_replay'});
 }finally{await f.close();}
});
it('rolls the entire roster back on a later duplicate, invalid qualification or failed receipt',async()=>{
 const f=await onboardingJourneyFixture();try{
  const a=await f.activateCompany(await f.createCompany()),home=a.actor.employee.primaryLocationId;
  const c=roster('1',home,3);c.payload.people[2].employee.id='OWNER-1';
  expect((await saveOnboardingRoster(a.actor,a.binding,c)).state).toBe('invalid');
  const invalid=roster('1',home,3);invalid.payload.people[2].employee.positionIds=[randomUUID()];
  expect((await saveOnboardingRoster(a.actor,a.binding,invalid)).state).toBe('invalid');
  const ex=getWorkspaceDb(a.binding),failing:typeof ex={query:(...args)=>ex.query(...args),transaction:(s,signal)=>ex.transaction(s.some(q=>q.text.startsWith('INSERT INTO onboarding_commands'))?[...s,{text:'SELECT 1/0',values:[]}]:s,signal)};
  expect((await saveOnboardingRoster(a.actor,a.binding,roster('1',home,3),failing)).state).toBe('unavailable');
  expect((await a.c.resource.db.pool.query('SELECT count(*)::int n FROM employees')).rows[0].n).toBe(1);expect((await readOnboardingSetup(a.actor,a.binding)).snapshot.version).toBe('1');
 }finally{await f.close();}
});
it('serializes two reviewed imports and requires a fresh review after a version conflict',async()=>{
 const f=await onboardingJourneyFixture();try{
  const a=await f.activateCompany(await f.createCompany()),home=a.actor.employee.primaryLocationId,left=roster('1',home,2),right=roster('1',home,2);
  right.payload.people.forEach((p,i)=>{p.employee.id=`OTHER-${i}`;p.employee.email=`other${i}@example.invalid`;});
  const results=await Promise.all([saveOnboardingRoster(a.actor,a.binding,left),saveOnboardingRoster(a.actor,a.binding,right)]);
  expect(results.map(r=>r.state).sort()).toEqual(['conflict','saved']);expect((await a.c.resource.db.pool.query('SELECT count(*)::int n FROM employees')).rows[0].n).toBe(3);
 }finally{await f.close();}
});
it('previews company-local identities and catalogues without changing data',async()=>{
 const f=await onboardingJourneyFixture();try{
  const a=await f.activateCompany(await f.createCompany()),home=a.actor.employee.primaryLocationId;
  const p=await previewOnboardingRoster(a.actor,a.binding,{schemaVersion:1,format:'csv',text:'id,firstName,lastName,phone,email\nOWNER-1,Fictional,Duplicate,7875550102,new@example.invalid\nE-2,Ana,Pérez,7875550103,ana@example.invalid',defaults:{primaryLocationId:home}});
  expect(p.state).toBe('ready');if(p.state==='ready'){expect(p.valid).toBe(false);expect(p.expectedVersion).toBe('1');expect(p.rows[0].fieldErrors).toContainEqual({field:'id',code:'ID_IN_USE'});expect(p.rows[1].person?.employee.lastName).toBe('Pérez');}
  expect((await a.c.resource.db.pool.query('SELECT count(*)::int n FROM employees')).rows[0].n).toBe(1);
 }finally{await f.close();}
});
it('keeps different workplaces isolated and requires a live Owner for roster creation',async()=>{
 const f=await onboardingJourneyFixture();try{
  const a=await f.activateCompany(await f.createCompany('roster-a','ra@example.invalid')),b=await f.activateCompany(await f.createCompany('roster-b','rb@example.invalid'));
  expect((await saveOnboardingRoster(a.actor,a.binding,roster('1',a.actor.employee.primaryLocationId,1))).state).toBe('saved');
  expect((await saveOnboardingRoster(b.actor,b.binding,roster('1',b.actor.employee.primaryLocationId,1))).state).toBe('saved');
  expect((await saveOnboardingRoster(a.actor,b.binding,roster('2',b.actor.employee.primaryLocationId,1))).state).toBe('unavailable');
  await a.c.resource.db.pool.query("UPDATE employees SET role='MANAGER' WHERE id='OWNER-1'");
  expect((await saveOnboardingRoster(a.actor,a.binding,roster('2',a.actor.employee.primaryLocationId,1))).state).toBe('unavailable');
 }finally{await f.close();}
});
it('uses canonical employee/eligibility/qualification receipts without sending an invitation or creating credentials',async()=>{
 const f=await onboardingJourneyFixture();try{const a=await f.activateCompany(await f.createCompany()),home=a.actor.employee.primaryLocationId,c=command('1',home);expect((await saveOnboardingPerson(a.actor,a.binding,c)).state).toBe('saved');const state=await readOnboardingSetup(a.actor,a.binding),person=state.configuration.people.find(p=>p.id==='EMP-1')!;expect(person.eligibleLocationIds).toEqual([home]);expect(person.positionIds).toEqual([]);expect(person.hasCredentials).toBe(false);expect(person.invitationRevision).toBe(0);expect(state.snapshot.version).toBe('2');expect((await a.c.resource.db.pool.query("SELECT count(*)::int n FROM company_access_operations WHERE kind='EMPLOYEE'")).rows[0].n).toBe(1);expect((await a.c.resource.db.pool.query('SELECT count(*)::int n FROM company_invitations')).rows[0].n).toBe(0);expect((await saveOnboardingPerson(a.actor,a.binding,c)).state).toBe('saved');expect((await saveOnboardingPerson(a.actor,a.binding,{...c,payload:{employee:{...c.payload.employee,firstName:'Changed'}}})).state).toBe('conflict');
 }finally{await f.close();}
});
it('rejects duplicate IDs locally while allowing the same actual company-local number in another database',async()=>{
 const f=await onboardingJourneyFixture();try{const a=await f.activateCompany(await f.createCompany('alpha','a@example.invalid')),b=await f.activateCompany(await f.createCompany('beta','b@example.invalid'));const results=await Promise.all([saveOnboardingPerson(a.actor,a.binding,command('1',a.actor.employee.primaryLocationId)),saveOnboardingPerson(b.actor,b.binding,command('1',b.actor.employee.primaryLocationId))]);expect(results.map(r=>r.state)).toEqual(['saved','saved']);expect((await saveOnboardingPerson(a.actor,a.binding,command('2',a.actor.employee.primaryLocationId,{id:'emp-1',email:'other@example.invalid'}))).state).toBe('invalid');expect((await b.c.resource.db.pool.query("SELECT count(*)::int n FROM employees WHERE id='EMP-1'")).rows[0].n).toBe(1);
 }finally{await f.close();}
});
it('rejects inactive/foreign locations, missing Manager scope and invented qualifications without partial profiles',async()=>{
 const f=await onboardingJourneyFixture();try{const a=await f.activateCompany(await f.createCompany()),home=a.actor.employee.primaryLocationId;for(const overrides of [{primaryLocationId:randomUUID()},{positionIds:[randomUUID()]},{role:'MANAGER'}])expect((await saveOnboardingPerson(a.actor,a.binding,command('1',home,overrides))).state).toBe('invalid');expect((await readOnboardingSetup(a.actor,a.binding)).snapshot.version).toBe('1');await a.c.resource.db.pool.query('UPDATE locations SET active=false WHERE id=$1',[home]);const current=(await readOnboardingSetup(a.actor,a.binding)).snapshot.version;expect(current).toBe('2');expect((await saveOnboardingPerson(a.actor,a.binding,command(current,home))).state).toBe('invalid');expect((await a.c.resource.db.pool.query("SELECT count(*)::int n FROM employees WHERE id='EMP-1'")).rows[0].n).toBe(0);expect((await readOnboardingSetup(a.actor,a.binding)).snapshot.version).toBe(current);
 }finally{await f.close();}
});
it('saves a profile without optional email and reports it separately as uninvitable',async()=>{
 const f=await onboardingJourneyFixture();try{const a=await f.activateCompany(await f.createCompany());expect((await saveOnboardingPerson(a.actor,a.binding,command('1',a.actor.employee.primaryLocationId,{email:null}))).state).toBe('saved');const state=await readOnboardingSetup(a.actor,a.binding);expect(state.configuration.people.find(p=>p.id==='EMP-1')?.email).toBeNull();expect(state.snapshot.sections.find(s=>s.id==='INVITATIONS')?.reasonCodes).toContain('EMPLOYEE_EMAIL_REQUIRED');
 }finally{await f.close();}
});
it('recovers a lost actual creation commit reply from both original receipts without duplicate employees',async()=>{
 const f=await onboardingJourneyFixture();try{const a=await f.activateCompany(await f.createCompany()),c=command('1',a.actor.employee.primaryLocationId);f.loseRuntimeCommit();expect((await saveOnboardingPerson(a.actor,a.binding,c)).state).toBe('saved');expect((await saveOnboardingPerson(a.actor,a.binding,c)).state).toBe('saved');expect((await a.c.resource.db.pool.query("SELECT count(*)::int n FROM employees WHERE id='EMP-1'")).rows[0].n).toBe(1);expect((await readOnboardingSetup(a.actor,a.binding)).snapshot.version).toBe('2');
 }finally{await f.close();}
});
it('requires a current Owner even if a Manager would hold ordinary Company create permission',async()=>{
 const f=await onboardingJourneyFixture();try{const a=await f.activateCompany(await f.createCompany());await a.c.resource.db.pool.query("UPDATE employees SET role='MANAGER' WHERE id='OWNER-1'");expect((await saveOnboardingPerson(a.actor,a.binding,command('1',a.actor.employee.primaryLocationId))).state).toBe('unavailable');expect((await a.c.resource.db.pool.query("SELECT count(*)::int n FROM employees WHERE id='EMP-1'")).rows[0].n).toBe(0);
 }finally{await f.close();}
});
it('returns a version conflict for another tab without a partial canonical creation',async()=>{
 const f=await onboardingJourneyFixture();try{const a=await f.activateCompany(await f.createCompany()),c=command('1',a.actor.employee.primaryLocationId);expect((await saveOnboardingPerson(a.actor,a.binding,c)).state).toBe('saved');expect((await saveOnboardingPerson(a.actor,a.binding,command('1',a.actor.employee.primaryLocationId,{id:'EMP-2',email:'employee2@example.invalid'}))).state).toBe('conflict');expect((await a.c.resource.db.pool.query("SELECT count(*)::int n FROM employees WHERE id='EMP-2'")).rows[0].n).toBe(0);
 }finally{await f.close();}
});
it('rolls back profile and eligibility if the shared onboarding receipt cannot persist',async()=>{
 const f=await onboardingJourneyFixture();try{const a=await f.activateCompany(await f.createCompany()),ex=getWorkspaceDb(a.binding),failing:typeof ex={query:(...args)=>ex.query(...args),transaction:(s,signal)=>ex.transaction(s.some(q=>q.text.startsWith('INSERT INTO onboarding_commands'))?[...s,{text:'SELECT 1/0',values:[]}]:s,signal)};expect((await saveOnboardingPerson(a.actor,a.binding,command('1',a.actor.employee.primaryLocationId),failing)).state).toBe('unavailable');expect((await a.c.resource.db.pool.query("SELECT count(*)::int n FROM employees WHERE id='EMP-1'")).rows[0].n).toBe(0);expect((await readOnboardingSetup(a.actor,a.binding)).snapshot.version).toBe('1');
 }finally{await f.close();}
});
it('persists only explicitly selected qualifications and the Owner-selected initial Manager scope',async()=>{
 const {saveOnboardingStep}=await import('@/lib/onboarding/setup.server');const f=await onboardingJourneyFixture();try{const a=await f.activateCompany(await f.createCompany());await saveOnboardingStep(a.actor,a.binding,'POSITIONS',{schemaVersion:1,operationId:randomUUID(),expectedVersion:'1',payload:{action:'CREATE',name:'Fictional Specialist'}});const state=await readOnboardingSetup(a.actor,a.binding),positionId=state.configuration.positions[0].id,c=command('2',a.actor.employee.primaryLocationId,{role:'MANAGER',positionIds:[positionId]});const payload={...c.payload,initialManagerScope:{mode:'LOCATIONS',locationIds:[a.actor.employee.primaryLocationId]}};expect((await saveOnboardingPerson(a.actor,a.binding,{...c,payload})).state).toBe('saved');const person=(await readOnboardingSetup(a.actor,a.binding)).configuration.people.find(p=>p.id==='EMP-1')!;expect(person.positionIds).toEqual([positionId]);const scope=(await a.c.resource.db.pool.query("SELECT mode,location_ids FROM operational_scopes_current WHERE employee_id='EMP-1'")).rows[0];expect(scope).toEqual({mode:'LOCATIONS',location_ids:[a.actor.employee.primaryLocationId]});expect((await a.c.resource.db.pool.query("SELECT count(*)::int n FROM employee_credentials WHERE employee_id='EMP-1'")).rows[0].n).toBe(0);
 }finally{await f.close();}
});

it('enforces the provisioned 30-staff capacity atomically, excluding the Owner',async()=>{
 const f=await onboardingJourneyFixture({commerce:{key:Buffer.alloc(32,23).toString('base64url'),workerKey:Buffer.alloc(32,24).toString('base64url'),async enroll(){}}});try{
  const a=await f.activateCompany(await f.createCompany()),home=a.actor.employee.primaryLocationId;
  const tooMany=roster('1',home,31);expect(await saveOnboardingRoster(a.actor,a.binding,tooMany)).toMatchObject({state:'invalid',fieldErrors:[{field:'people',code:'EMPLOYEE_LIMIT'}]});
  expect((await a.c.resource.db.pool.query('SELECT count(*)::int n FROM employees')).rows[0].n).toBe(1);
  expect((await readOnboardingSetup(a.actor,a.binding)).snapshot.version).toBe('1');
  expect((await saveOnboardingRoster(a.actor,a.binding,roster('1',home,30))).state).toBe('saved');
  const extra=roster('2',home,1);extra.payload.people[0].employee.id='EXTRA';extra.payload.people[0].employee.email='extra@example.invalid';
  expect((await saveOnboardingRoster(a.actor,a.binding,extra)).state).toBe('invalid');
  expect((await a.c.resource.db.pool.query('SELECT count(*)::int n FROM employees')).rows[0].n).toBe(31);
 }finally{await f.close();}
});
it('serves private same-origin roster preview/commit and rejects unauthenticated, cross-origin and oversized requests',async()=>{
 const f=await onboardingJourneyFixture();try{
  const a=await f.activateCompany(await f.createCompany()),handlers=rosterHttpHandlers({config:f.routing,store:f.store,readProof:async()=>a.actor}),url=a.c.origin+'/api/onboarding/roster';
  const request=(body:unknown,origin=a.c.origin)=>new Request(url,{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(body)});
  const table={schemaVersion:1,format:'csv',text:'id,firstName,lastName,phone\nE-1,Ana,Pérez,7875550103',defaults:{primaryLocationId:a.actor.employee.primaryLocationId}};
  const p=await handlers.preview(request(table));expect(p.status).toBe(200);expect(p.headers.get('cache-control')).toBe('no-store, private');expect(await p.json()).toMatchObject({state:'ready',valid:true,expectedVersion:'1'});
  expect((await handlers.save(request(roster('1',a.actor.employee.primaryLocationId,1),'https://foreign.invalid'))).status).toBe(403);
  expect((await handlers.preview(request({text:'x'.repeat(131072)}))).status).toBe(413);
  expect((await rosterHttpHandlers({config:f.routing,store:f.store,readProof:async()=>null}).preview(request(table))).status).toBe(401);
  const saved=await handlers.save(request(roster('1',a.actor.employee.primaryLocationId,1)));expect(saved.status).toBe(200);expect(await saved.json()).toMatchObject({state:'saved',createdEmployeeIds:['ROSTER-1']});
 }finally{await f.close();}
});

it('imports a reviewed Manager with explicit scope and completes 30 invitation targets without duplicate sends',async()=>{
 const {issueInvitationBatch,readInvitationBatch}=await import('@/lib/onboarding/invitation-batch.server');
 const f=await onboardingJourneyFixture();try{
  const a=await f.activateCompany(await f.createCompany()),home=a.actor.employee.primaryLocationId,c=roster('1',home,30);
  const people=c.payload.people as import('@/lib/onboarding/roster').RosterPerson[];people[0].employee.role='MANAGER';people[0].initialManagerScope={mode:'LOCATIONS',locationIds:[home]};
  expect((await saveOnboardingRoster(a.actor,a.binding,c)).state).toBe('saved');
  expect((await a.c.resource.db.pool.query("SELECT mode,location_ids FROM operational_scope_revisions WHERE employee_id='ROSTER-1'")).rows).toEqual([{mode:'LOCATIONS',location_ids:[home]}]);
  const setup=await readOnboardingSetup(a.actor,a.binding),batch={schemaVersion:1,operationId:randomUUID(),expectedVersion:setup.snapshot.version,payload:{targets:setup.configuration.people.filter(p=>p.id!=='OWNER-1').map(p=>({employeeId:p.id,expectedEmployeeVersion:p.updatedAt,expectedInvitationRevision:p.invitationRevision}))}};
  const sent=new Set<string>();let sends=0;const delivery:import('@/lib/company-access/contracts').InvitationDelivery={async send(m){sent.add(m.registeredEmail);sends++;return {providerAccepted:true};}};
  for(let chunk=0;chunk<6;chunk++)expect((await issueInvitationBatch(a.actor,a.binding,batch,delivery)).state).toBe('pending');
  const state=await readInvitationBatch(a.actor,a.binding,batch.operationId);expect(state).toMatchObject({state:'ready',stage:'COMPLETE'});expect(sent.size).toBe(30);expect(sends).toBe(30);
  await issueInvitationBatch(a.actor,a.binding,batch,delivery);expect(sends).toBe(30);
  expect((await a.c.resource.db.pool.query('SELECT count(*)::int n FROM company_invitations')).rows[0].n).toBe(30);
  expect((await a.c.resource.db.pool.query("SELECT count(*)::int n FROM employee_credentials WHERE employee_id<>'OWNER-1'")).rows[0].n).toBe(0);
 }finally{await f.close();}
});
