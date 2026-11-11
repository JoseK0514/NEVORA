import {it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {companyAccessFixture} from './company-access-fixture';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import {readOwnerOperationalScope,assignOperationalScope} from '../../lib/company-access/operational-scope.server';
import {listEmployees} from '../../lib/data/employees';
vi.mock('server-only',()=>({}));
import {readOperationalDirectory,readOperationalSchedule,readOperationalShiftEditor,readOperationalClockMonitor,readOperationalEmployeeProfile} from '../../lib/company-access/operational-read.server';
const week='2026-10-12';
type Fixture=Awaited<ReturnType<typeof fixture>>;
async function fixture(){
 const f=await companyAccessFixture();
 try{
  await f.q(`INSERT INTO locations(id,workspace_id,clocker_key,name,short_name,active) VALUES('loc-3','workspace-fuel','closed-c','Closed C','C',false);
   INSERT INTO employees(id,first_name,last_name,phone,email,role,primary_location_id) VALUES
    ('restricted','Restricted','QA','555004','restricted@example.invalid','MANAGER','loc-1'),
    ('private-b','Private B','QA','555005','private-b@example.invalid','EMPLOYEE','loc-2');
   UPDATE employees SET primary_location_id='loc-2' WHERE id='target';
   INSERT INTO employee_location_eligibility VALUES('target','loc-1'),('target','loc-2');
   INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('c',64),'restricted',clock_timestamp()+interval '1 hour');
   INSERT INTO positions(id,workspace_id,name) VALUES('p-shared','workspace-fuel','Current label'),('p-private','workspace-fuel','Private B position');
   INSERT INTO employee_positions VALUES('target','p-shared'),('private-b','p-private');
   INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('scope-a','loc-1','2026-10-12','DRAFT','owner'),('scope-b','loc-2','2026-10-12','DRAFT','owner');
   INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,notes,position_id) VALUES
    ('shift-a','scope-a','target','2026-10-12','08:00','09:00','Local note','p-shared'),
    ('shift-b','scope-b','target','2026-10-12','12:00','15:00','Private B note','p-shared')`);
  const context=await readOwnerOperationalScope(f.owner,'restricted',f.db.executor);if(context.state!=='ready')throw Error('Owned Manager context');const c=context.data.current;
  const result=await assignOperationalScope(f.owner,'restricted',{action:'ASSIGN',operationId:randomUUID(),expectedEmployeeVersion:c.employeeUpdatedAt,expectedRoleGeneration:c.roleGeneration,expectedScopeRevision:c.scopeRevision,scope:{mode:'LOCATIONS',locationIds:['loc-1']}},f.db.executor);if(result.state!=='saved')throw Error('Owned scope');
  const restricted:SessionMutationProof={employee:{id:'restricted',firstName:'Restricted',lastName:'QA',role:'MANAGER',primaryLocationId:'loc-1'},sessionTokenHash:'c'.repeat(64)};
  return {...f,restricted};
 }catch(error){await f.db.dispose();throw error;}
}
it('restricted directory is a minimal authorized roster; Company and canonical financial/self roster remain complete',async()=>{
 const f=await fixture();try{
  const restricted=await readOperationalDirectory(f.restricted,f.db.executor);expect(restricted.state).toBe('ready');if(restricted.state!=='ready'||restricted.data.mode!=='LOCATIONS')throw Error('Restricted directory');
  expect(restricted.data.locations.map(l=>l.id)).toEqual(['loc-1']);
  const target=restricted.data.employees.find(e=>e.id==='target');expect(target).toEqual({id:'target',firstName:'Target',lastName:'QA',role:'EMPLOYEE',locationIds:['loc-1']});
  expect(restricted.data.employees.some(e=>e.id==='private-b')).toBe(false);
  for(const e of restricted.data.employees)expect(Object.keys(e).sort()).toEqual(['firstName','id','lastName','locationIds','role']);
  expect(restricted.data.locations.every(l=>Object.keys(l).sort().join(',')==='active,id,name,shortName')).toBe(true);
  const company=await readOperationalDirectory(f.manager,f.db.executor);if(company.state!=='ready'||company.data.mode!=='COMPANY')throw Error('Company directory');
  expect(company.data.employees.some(e=>e.id==='private-b')).toBe(true);expect(company.data.locations.some(l=>l.id==='loc-3')).toBe(true);
  expect((await listEmployees(f.db.executor)).find(e=>e.id==='target')?.eligibleLocationIds).toEqual(['loc-1','loc-2']);
 }finally{await f.db.dispose();}
});
it('schedule rows and local minutes are filtered in SQL and direct B/all/empty selectors cannot widen scope',async()=>{
 const f=await fixture();try{
  const result=await readOperationalSchedule(f.restricted,{weekStart:week},f.db.executor);if(result.state!=='ready')throw Error('Scoped schedule');
  expect(result.data.shifts.map(s=>s.id)).toEqual(['shift-a']);expect(result.data.roster.find(e=>e.id==='target')?.scheduledMinutesInScope).toBe(60);expect(result.data.companyControls).toEqual({state:'requires_company'});
  expect(JSON.stringify(result.data).includes('Private B')).toBe(false);
  for(const shift of result.data.shifts){expect('generatedClaims'in shift).toBe(false);expect('assignmentOrigin'in shift).toBe(false);}
  for(const locationId of ['loc-2','all',''])expect((await readOperationalSchedule(f.restricted,{weekStart:week,locationId},f.db.executor)).state).toBe('unavailable');
  expect((await readOperationalSchedule(f.restricted,{weekStart:'2026-02-30'},f.db.executor)).state).toBe('unavailable');
  const company=await readOperationalSchedule(f.manager,{weekStart:week},f.db.executor);if(company.state!=='ready')throw Error('Company schedule');expect(company.data.shifts.map(s=>s.id).sort()).toEqual(['shift-a','shift-b']);expect(company.data.roster.find(e=>e.id==='target')?.scheduledMinutesInScope).toBe(240);
 }finally{await f.db.dispose();}
});
it('editor options expose only qualified local memberships/minimal position names and foreign shift IDs deny',async()=>{
 const f=await fixture();try{
  const result=await readOperationalShiftEditor(f.restricted,{shiftId:'shift-a'},f.db.executor);if(result.state!=='ready')throw Error('Editor');
  expect(result.data.shift?.id).toBe('shift-a');expect(result.data.employeeOptions.some(e=>e.id==='private-b')).toBe(false);
  expect(result.data.employeeOptions.find(e=>e.id==='target')).toEqual({id:'target',name:'Target QA',positionIds:['p-shared']});
  expect(result.data.positionOptions).toEqual([{id:'p-shared',name:'Current label'}]);expect(result.data.saveAvailability).toBe('available');
  expect((await readOperationalShiftEditor(f.restricted,{shiftId:'shift-b'},f.db.executor)).state).toBe('unavailable');
  expect((await readOperationalShiftEditor(f.restricted,{weekStart:week,locationId:'loc-2'},f.db.executor)).state).toBe('unavailable');
  expect((await readOperationalEmployeeProfile(f.restricted,'target',f.db.executor)).state).toBe('unavailable');
  const manager=await readOperationalEmployeeProfile(f.manager,'target',f.db.executor);if(manager.state!=='ready')throw Error('Company profile');expect(manager.data.ownerScope).toBeNull();
  const owner=await readOperationalEmployeeProfile(f.owner,'target',f.db.executor);if(owner.state!=='ready')throw Error('Owner profile');expect(owner.data.ownerScope?.employeeUpdatedAt).toBe(owner.data.profile.updatedAt);
 }finally{await f.db.dispose();}
});
it('published and archived position labels use the captured value including null; drafts resolve the current catalog',async()=>{
 const f=await fixture();try{
  await f.q(`INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id) VALUES('captured-null','scope-a','target','2026-10-13','08:00','09:00','p-shared');
   INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,affected_location_id,created_by) VALUES('captured-r','2026-10-12',1,'PUBLISH','loc-1','owner');
   INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,position_id,position_name) VALUES
    ('capture-old','captured-r','shift-a','scope-a','loc-1','target','2026-10-12','08:00','09:00','p-shared','Captured label'),
    ('capture-null','captured-r','captured-null','scope-a','loc-1','target','2026-10-13','08:00','09:00','p-shared',NULL)`);
  let result=await readOperationalSchedule(f.restricted,{weekStart:week},f.db.executor);if(result.state!=='ready')throw Error('Draft');expect(result.data.shifts.every(s=>s.positionName==='Current label')).toBe(true);
  for(const status of ['PUBLISHED','ARCHIVED']){await f.q('UPDATE schedules SET status=$1 WHERE id=\'scope-a\'',[status]);result=await readOperationalSchedule(f.restricted,{weekStart:week},f.db.executor);if(result.state!=='ready')throw Error('Captured');expect(result.data.shifts.find(s=>s.id==='shift-a')?.positionName).toBe('Captured label');expect(result.data.shifts.find(s=>s.id==='captured-null')?.positionName).toBeNull();}
 }finally{await f.db.dispose();}
});
it('clock monitor filters actual site before counts while retaining an unclosed inactive employee/device record',async()=>{
 const f=await fixture();try{
  await f.q(`INSERT INTO clocker_devices(id,location_id,name,active) VALUES('scope-device-a','loc-1','Owned A',false),('scope-device-b','loc-2','Owned B',true);
   INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status) VALUES('open-a','target','loc-1','scope-device-a',clock_timestamp()-interval '1 hour','CLOCKED_IN'),('open-b','private-b','loc-2','scope-device-b',clock_timestamp()-interval '1 hour','CLOCKED_IN');
   UPDATE employees SET active=false WHERE id='target'`);
  const result=await readOperationalClockMonitor(f.restricted,f.db.executor);if(result.state!=='ready')throw Error('Monitor');expect(result.data.employees.map(e=>e.timeEntryId)).toEqual(['open-a']);expect(result.data.employees[0].employeeName).toBe('Target QA');expect(JSON.stringify(result.data).includes('Private B')).toBe(false);
  const company=await readOperationalClockMonitor(f.manager,f.db.executor);if(company.state!=='ready')throw Error('Company monitor');expect(company.data.employees.map(e=>e.timeEntryId).sort()).toEqual(['open-a','open-b']);
 }finally{await f.db.dispose();}
});
it('a scope revocation during projection suppresses the loaded result instead of returning stale people',async()=>{
 const f=await fixture();try{
  let reached=false;const actual=f.db.executor;
  const ex={...actual,async query<T>(statement:Parameters<typeof actual.query>[0],signal?:AbortSignal){
   const rows=await actual.query<T>(statement,signal);
   if(!reached&&statement.text.includes('operational scoped roster')){
    reached=true;const context=await readOwnerOperationalScope(f.owner,'restricted',actual);if(context.state!=='ready')throw Error('Owner revoke context');const c=context.data.current;
    expect((await assignOperationalScope(f.owner,'restricted',{action:'REVOKE',operationId:randomUUID(),expectedEmployeeVersion:c.employeeUpdatedAt,expectedRoleGeneration:c.roleGeneration,expectedScopeRevision:c.scopeRevision},actual)).state).toBe('saved');
   }return rows;
  }};
  expect((await readOperationalDirectory(f.restricted,ex)).state).toBe('unavailable');expect(reached).toBe(true);
 }finally{await f.db.dispose();}
});
it('out-of-scope rows do not consume the permitted roster query limit',async()=>{
 const f=await fixture();try{
  await f.q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) SELECT 'outside-'||n,'Private B','QA','555','EMPLOYEE','loc-2' FROM generate_series(1,5001)n");
  const result=await readOperationalDirectory(f.restricted,f.db.executor);if(result.state!=='ready'||result.data.mode!=='LOCATIONS')throw Error('Scoped limit');
  expect(result.data.employees.some(e=>e.id==='target')).toBe(true);expect(result.data.employees.some(e=>e.id.startsWith('outside-'))).toBe(false);
 }finally{await f.db.dispose();}
});
it('person hours reuse current directory scope and published snapshots, withholding foreign people and revoked sessions',async()=>{
 const f=await fixture();try{
  const {readOperationalEmployeeHours}=await import('../../lib/company-access/operational-read.server');
  const [{week}]=await f.q<{week:string}>("SELECT date_trunc('week',clock_timestamp() AT TIME ZONE 'America/Puerto_Rico')::date::text AS week");
  await f.q(`UPDATE schedules SET week_start=$1,status='PUBLISHED' WHERE id IN('scope-a','scope-b')`,[week]);
  await f.q(`UPDATE shifts SET date=$1,start_time=CASE id WHEN 'shift-a' THEN time '08:00' ELSE time '10:00' END,
   end_time=CASE id WHEN 'shift-a' THEN time '09:00' ELSE time '13:00' END WHERE id IN('shift-a','shift-b')`,[week]);
  await f.q(`INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES('hours-r',$1,1,'PUBLISH','owner')`,[week]);
  await f.q(`INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time)
   SELECT 'hours-'||sh.id,'hours-r',sh.id,sh.schedule_id,s.location_id,sh.employee_id,sh.date,sh.start_time,sh.end_time
   FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE sh.id IN('shift-a','shift-b')`);
  const scoped=await readOperationalEmployeeHours(f.restricted,'target',f.db.executor);expect(scoped.state).toBe('ready');if(scoped.state!=='ready')throw Error(JSON.stringify(scoped));
  expect(scoped.data).toMatchObject({employeeId:'target',weekStart:week,scheduledWeekMinutes:60,workedWeekMinutes:0});
  expect(JSON.stringify(scoped.data)).not.toMatch(/sourceHash|entries|Private|phone|reason/);
  const company=await readOperationalEmployeeHours(f.owner,'target',f.db.executor);expect(company.state).toBe('ready');if(company.state==='ready')expect(company.data.scheduledWeekMinutes).toBe(240);
  expect((await readOperationalEmployeeHours(f.restricted,'private-b',f.db.executor)).state).toBe('unavailable');
  await f.q("DELETE FROM employee_sessions WHERE employee_id='restricted'");expect((await readOperationalEmployeeHours(f.restricted,'target',f.db.executor)).state).toBe('unavailable');
 }finally{await f.db.dispose();}
});
async function partlyPublishedHoursFixture(){
 const f=await fixture();
 try{
  const [{week}]=await f.q<{week:string}>("SELECT date_trunc('week',clock_timestamp() AT TIME ZONE 'America/Puerto_Rico')::date::text AS week");
  await f.q("UPDATE schedules SET week_start=$1,status=CASE id WHEN 'scope-a' THEN 'PUBLISHED' ELSE 'DRAFT' END WHERE id IN('scope-a','scope-b')",[week]);
  await f.q("UPDATE shifts SET date=$1 WHERE id IN('shift-a','shift-b')",[week]);
  await f.q("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES('partial-hours-r',$1,1,'PUBLISH','owner')",[week]);
  await f.q(`INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time)
   SELECT 'partial-hours-a','partial-hours-r',sh.id,sh.schedule_id,s.location_id,sh.employee_id,sh.date,sh.start_time,sh.end_time
   FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE sh.id='shift-a'`);
  return {...f,week};
 }catch(error){await f.db.dispose();throw error;}
}
it.each(['draft','absent'] as const)('an unrelated publication cannot confirm zero person hours for a %s target schedule',async(state)=>{
 const f=await partlyPublishedHoursFixture();try{
  const {readOperationalEmployeeHours}=await import('../../lib/company-access/operational-read.server');
  if(state==='absent')await f.q("DELETE FROM shifts WHERE schedule_id='scope-b'; DELETE FROM schedules WHERE id='scope-b'");
  const context=await readOwnerOperationalScope(f.owner,'restricted',f.db.executor);if(context.state!=='ready')throw Error('Scope context');const c=context.data.current;
  expect((await assignOperationalScope(f.owner,'restricted',{action:'ASSIGN',operationId:randomUUID(),expectedEmployeeVersion:c.employeeUpdatedAt,expectedRoleGeneration:c.roleGeneration,expectedScopeRevision:c.scopeRevision,scope:{mode:'LOCATIONS',locationIds:['loc-2']}},f.db.executor)).state).toBe('saved');
  expect(await readOperationalEmployeeHours(f.restricted,'private-b',f.db.executor)).toMatchObject({state:'ready',data:{scheduledTodayMinutes:null,scheduledWeekMinutes:null,workedWeekMinutes:0}});
 }finally{await f.db.dispose();}
});
it('mixed published and draft person locations keep company totals unknown while restricted published coverage stays complete',async()=>{
 const f=await partlyPublishedHoursFixture();try{
  const {readOperationalEmployeeHours}=await import('../../lib/company-access/operational-read.server');
  expect(await readOperationalEmployeeHours(f.owner,'target',f.db.executor)).toMatchObject({state:'ready',data:{scheduledTodayMinutes:null,scheduledWeekMinutes:null,workedWeekMinutes:0}});
  expect(await readOperationalEmployeeHours(f.restricted,'target',f.db.executor)).toMatchObject({state:'ready',data:{scheduledWeekMinutes:60,workedWeekMinutes:0}});
 }finally{await f.db.dispose();}
});
it('a genuinely published empty target schedule confirms zero without requiring unrelated or inactive locations',async()=>{
 const f=await partlyPublishedHoursFixture();try{
  const {readOperationalEmployeeHours}=await import('../../lib/company-access/operational-read.server');
  await f.q("UPDATE schedules SET status='PUBLISHED' WHERE id='scope-b'; UPDATE schedules SET status='DRAFT' WHERE id='scope-a'; INSERT INTO employee_location_eligibility VALUES('private-b','loc-3')");
  expect(await readOperationalEmployeeHours(f.owner,'private-b',f.db.executor)).toMatchObject({state:'ready',data:{scheduledTodayMinutes:0,scheduledWeekMinutes:0,workedWeekMinutes:0}});
 }finally{await f.db.dispose();}
});
it('a missing previous-week capture still withholds person totals until the overnight publication is captured',async()=>{
 const f=await partlyPublishedHoursFixture();try{
  const {readOperationalEmployeeHours}=await import('../../lib/company-access/operational-read.server');
  await f.q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('hours-prior','loc-1',$1::date-7,'PUBLISHED','owner')",[f.week]);
  expect(await readOperationalEmployeeHours(f.restricted,'target',f.db.executor)).toMatchObject({state:'ready',data:{scheduledTodayMinutes:null,scheduledWeekMinutes:null}});
  await f.q("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES('hours-prior-r',$1::date-7,1,'PUBLISH','owner')",[f.week]);
  await f.q(`INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time)
   VALUES('hours-overnight','hours-prior-r','hours-overnight','hours-prior','loc-1','target',$1::date-1,'22:00','02:00')`,[f.week]);
  expect(await readOperationalEmployeeHours(f.restricted,'target',f.db.executor)).toMatchObject({state:'ready',data:{scheduledWeekMinutes:180}});
 }finally{await f.db.dispose();}
});
it('owner names expose active in-workspace owners only and refuse expired sessions',async()=>{
 const f=await fixture();try{
  const {readActiveOwnerNames}=await import('../../lib/data/owner-names.server');
  await f.q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id,active) VALUES('inactive-owner','Inactive','Owner','555009','OWNER','loc-1',false)");
  const result=await readActiveOwnerNames(f.restricted,f.db.executor);expect(result).toMatchObject({state:'ready',owners:['Owner QA']});expect(JSON.stringify(result)).not.toMatch(/555|example.invalid|inactive-owner/);
  await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE employee_id='restricted'");
  expect(await readActiveOwnerNames(f.restricted,f.db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
 }finally{await f.db.dispose();}
});
it('the operational monitor adds canonical Today lateness for the matching open punch',async()=>{
 const f=await fixture();try{
  await f.q(`UPDATE shifts SET date=((clock_timestamp()-interval '2 hours') AT TIME ZONE 'America/Puerto_Rico')::date,
   start_time=((clock_timestamp()-interval '2 hours') AT TIME ZONE 'America/Puerto_Rico')::time,
   end_time=((clock_timestamp()+interval '6 hours') AT TIME ZONE 'America/Puerto_Rico')::time WHERE id='shift-a'`);
  await f.q(`UPDATE schedules SET week_start=(SELECT date_trunc('week',date::timestamp)::date FROM shifts WHERE id='shift-a'),status='PUBLISHED' WHERE id='scope-a'`);
  await f.q(`INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by)
   SELECT 'late-r',week_start,99,'PUBLISH','owner' FROM schedules WHERE id='scope-a'`);
  await f.q(`INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time)
   SELECT 'late-shift','late-r',sh.id,sh.schedule_id,s.location_id,sh.employee_id,sh.date,sh.start_time,sh.end_time
   FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE sh.id='shift-a'`);
  await f.q(`INSERT INTO clocker_devices(id,location_id,name,active) VALUES('late-device','loc-1','Owned',true);
   INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status) VALUES('late-entry','target','loc-1','late-device',clock_timestamp()-interval '1 hour','CLOCKED_IN')`);
  const monitor=await readOperationalClockMonitor(f.restricted,f.db.executor);expect(monitor).toMatchObject({state:'ready',data:{employees:[{employeeId:'target',late:true}]}});
 }finally{await f.db.dispose();}
});
