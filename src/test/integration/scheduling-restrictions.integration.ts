import {afterAll,beforeAll,beforeEach,expect,it,vi} from 'vitest';
import {createDisposableGenerationDatabase} from './local-postgres';
import {installFixtureCompanyAccess} from './fixture-company-access';
import {fixtureProof} from './shift-change-api';
import {managementProof} from '../fixtures/management';
import {mutateSchedulingRestrictions,readSchedulingRestrictions} from '../../lib/data/scheduling-restrictions.server';
import type {SqlExecutor} from '../../lib/notifications/types';
import {assignOperationalScope,readOwnerOperationalScope} from '../../lib/company-access/operational-scope.server';
import {generateWeekDraft} from '../../lib/data/schedule-generation';
import {getShiftValidationContext} from '../../lib/data/schedules';
import {validateShift} from '../../lib/scheduling/validate-shift';
import {publishScheduleWithRevision} from '../../lib/data/publication-revisions';
import {addDays} from '../../lib/date-utils';
import {applyRestrictionCommand,emptyRestrictionDocument,RestrictionError} from '../../lib/scheduling/restrictions';
vi.mock('server-only',()=>({}));
let database:Awaited<ReturnType<typeof createDisposableGenerationDatabase>>;
const q=(text:string,values:readonly unknown[]=[])=>database.executor.query<Record<string,unknown>>({text,values});
const owner=managementProof('owner','OWNER'),worker=managementProof('worker','EMPLOYEE');
const operationId='11111111-1111-4111-8111-111111111111';
const command={kind:'SET',operationId,expectedRevision:0,effectiveWeek:'2030-10-07',unavailable:[{dayOfWeek:0,startTime:'00:00',endTime:'24:00'}],reason:'Recorded agreement'};
beforeAll(async()=>{database=await createDisposableGenerationDatabase();});
afterAll(async()=>{await database?.dispose();});
beforeEach(async()=>{
 await database.dispose();database=await createDisposableGenerationDatabase();
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('owner','Fictional','Owner','NONE','OWNER','loc-1'),('manager','Fictional','Manager','NONE','MANAGER','loc-1'),('worker','Fictional','Worker','NONE','EMPLOYEE','loc-1'); INSERT INTO employee_location_eligibility VALUES('worker','loc-1')");
 await fixtureProof(database.executor,'owner');await fixtureProof(database.executor,'worker');await fixtureProof(database.executor,'manager');
 await installFixtureCompanyAccess(database.executor);
});
it('stores approved versions separately, replays once and rejects changed ID reuse',async()=>{
 const first=await mutateSchedulingRestrictions(owner,'worker',command,database.executor);
 expect(first.receipt.status).toBe('APPROVED');
 expect(await mutateSchedulingRestrictions(owner,'worker',command,database.executor)).toMatchObject({receipt:first.receipt,changed:false});
 expect((await q("SELECT management_restrictions->'versions' AS versions FROM employee_scheduling_settings WHERE employee_id='worker'"))[0].versions).toHaveLength(1);
 await expect(mutateSchedulingRestrictions(owner,'worker',{...command,unavailable:[]},database.executor)).rejects.toThrow('conflict');
});
it('an employee can request a restriction but cannot approve it or read another employee',async()=>{
 await expect(mutateSchedulingRestrictions(worker,'worker',command,database.executor)).rejects.toThrow('denied');
 const result=await mutateSchedulingRestrictions(worker,'worker',{...command,kind:'REQUEST'},database.executor);
 expect(result.document.versions).toEqual([]);expect(result.document.requests[0].status).toBe('PENDING');
 await expect(readSchedulingRestrictions(worker,'owner',database.executor)).rejects.toThrow();
 const approved=await mutateSchedulingRestrictions(owner,'worker',{kind:'DECIDE',operationId:'22222222-2222-4222-8222-222222222222',expectedRevision:1,requestId:operationId,decision:'APPROVE',effectiveWeek:'2030-10-07',reason:'Approved by management'},database.executor);
 expect(approved.document.versions).toHaveLength(1);expect(approved.document.requests[0].status).toBe('APPROVED');
});
it('protects a later published week even when the proposed earlier week is open',async()=>{
 await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('future-published','loc-1','2030-11-04','PUBLISHED','owner')");
 await expect(mutateSchedulingRestrictions(owner,'worker',command,database.executor)).rejects.toThrow('locked');
 expect((await readSchedulingRestrictions(owner,'worker',database.executor)).earliestWeek).toBe('2030-11-11');
});
it('rechecks deadline crossing, session revocation and version changes after admission',async()=>{
 let intercepted=false;
 const revoked:SqlExecutor={query:database.executor.query,transaction:async statements=>{
  if(!intercepted&&statements.some(s=>s.text.includes('INSERT INTO employee_scheduling_settings'))){intercepted=true;await q("DELETE FROM employee_sessions WHERE employee_id='owner'");}
  return database.executor.transaction(statements);
 }};
 await expect(mutateSchedulingRestrictions(owner,'worker',command,revoked)).rejects.toThrow();
 expect(await q("SELECT * FROM employee_scheduling_settings WHERE employee_id='worker'")).toEqual([]);
});
it('scoped Managers cannot change a global agreement outside the complete employee footprint',async()=>{
 const view=await readOwnerOperationalScope(owner,'manager',database.executor);if(view.state!=='ready')throw Error('fixture scope unavailable');
 expect(await assignOperationalScope(owner,'manager',{action:'ASSIGN',operationId:'44444444-4444-4444-8444-444444444444',expectedEmployeeVersion:view.data.current.employeeUpdatedAt,expectedRoleGeneration:view.data.current.roleGeneration,expectedScopeRevision:view.data.current.scopeRevision,scope:{mode:'LOCATIONS',locationIds:['loc-1']}},database.executor)).toMatchObject({state:'saved'});
 await q("INSERT INTO employee_location_eligibility VALUES('worker','loc-2')");
 await expect(mutateSchedulingRestrictions(managementProof('manager','MANAGER'),'worker',command,database.executor)).rejects.toThrow();
});
it('storage refuses replacing approved history',async()=>{
 await mutateSchedulingRestrictions(owner,'worker',command,database.executor);
 await expect(q("UPDATE employee_scheduling_settings SET management_restrictions=jsonb_set(management_restrictions,'{versions,0,unavailable}','[]'::jsonb) WHERE employee_id='worker'")).rejects.toThrow();
 expect((await readSchedulingRestrictions(owner,'worker',database.executor)).document.versions[0].unavailable).toEqual(command.unavailable);
});
it('maps stored restrictions through real preview and generation while preferences remain soft',async()=>{
 await mutateSchedulingRestrictions(owner,'worker',command,database.executor);
 const candidate={employeeId:'worker',locationId:'loc-1',date:'2030-10-07',startTime:'08:00',endTime:'16:00'};
 const context=await getShiftValidationContext({...candidate,weekStart:'2030-10-07'},database.executor);if(!context)throw Error('fixture context missing');
 expect(validateShift({...context,candidate}).eligible).toBe(true);
 await q("UPDATE location_staffing_settings SET minimum_staff_per_shift=1,requires_designated_lead=false WHERE location_id='loc-1'; INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('demand','loc-1',1,'08:00','16:00')");
 const [workspace]=await q('SELECT id FROM workspaces');
 const generated=await generateWeekDraft({workspaceId:String(workspace.id),actorEmployeeId:'owner',proof:owner,weekStart:'2030-10-07',mode:'FILL_GAPS_ONLY',locationScope:{kind:'SELECTED',locationIds:['loc-1']}},database.executor);
 expect(generated.status).toBe('COMPLETE');
 expect(await q("SELECT employee_id,date::text,start_time::text,end_time::text FROM shifts")).toEqual([{employee_id:'worker',date:'2030-10-07',start_time:'08:00:00',end_time:'16:00:00'}]);
 expect(await q('SELECT * FROM availability_windows')).toEqual([]);
 expect(await q('SELECT * FROM notifications')).toEqual([]);
});
it('revoked Manager scope cannot be reused after the approval read',async()=>{
 let intercepted=false;
 const manager=managementProof('manager','MANAGER');
 const racing:SqlExecutor={query:database.executor.query,transaction:async statements=>{
  if(!intercepted&&statements.some(s=>s.text.includes('INSERT INTO employee_scheduling_settings'))){
   intercepted=true;
   const view=await readOwnerOperationalScope(owner,'manager',database.executor);if(view.state!=='ready')throw Error('fixture scope unavailable');
   expect(await assignOperationalScope(owner,'manager',{action:'REVOKE',operationId:'66666666-6666-4666-8666-666666666666',expectedEmployeeVersion:view.data.current.employeeUpdatedAt,expectedRoleGeneration:view.data.current.roleGeneration,expectedScopeRevision:view.data.current.scopeRevision},database.executor)).toMatchObject({state:'saved'});
  }
  return database.executor.transaction(statements);
 }};
 await expect(mutateSchedulingRestrictions(manager,'worker',command,racing)).rejects.toThrow('denied');
 expect(await q("SELECT * FROM employee_scheduling_settings WHERE employee_id='worker'")).toEqual([]);
});
it('refuses first publication of an unchanged draft assignment made ineligible by a new restriction',async()=>{
 await q("INSERT INTO schedules(id,location_id,week_start,created_by) VALUES('draft','loc-1','2030-10-07','owner'); INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('retained','draft','worker','2030-10-13','08:00','16:00'); INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES('old-preference','worker',0,'00:00','24:00')");
 await mutateSchedulingRestrictions(owner,'worker',command,database.executor);
 await expect(publishScheduleWithRevision({locationId:'loc-1',weekStart:'2030-10-07',managerId:'owner',proof:owner},database.executor)).rejects.toThrow();
 expect(await q("SELECT status FROM schedules WHERE id='draft'")).toEqual([{status:'DRAFT'}]);
 expect(await q('SELECT * FROM schedule_publication_revisions')).toEqual([]);
});
it('reserved approval capacity fits PostgreSQL canonical JSONB bytes at worst admitted Unicode lengths',async()=>{
 const context={actorId:'worker',actorRole:'EMPLOYEE' as const,now:'2026-11-15T12:00:00.000Z',earliestWeek:'2030-10-07'};
 const unavailable=Array.from({length:128},(_,i)=>({dayOfWeek:0,startTime:`${String(Math.floor(i*10/60)).padStart(2,'0')}:${String(i*10%60).padStart(2,'0')}`,endTime:`${String(Math.floor((i*10+5)/60)).padStart(2,'0')}:${String((i*10+5)%60).padStart(2,'0')}`}));
 let document=emptyRestrictionDocument();
 for(let i=0;i<128;i++){
  try{document=applyRestrictionCommand(document,{kind:'REQUEST',operationId:`bbbbbbbb-bbbb-4bbb-8bbb-${i.toString(16).padStart(12,'0')}`,expectedRevision:document.revision,effectiveWeek:'2030-10-07',unavailable,reason:'Requested change'},context).document;}
  catch(error){if(!(error instanceof RestrictionError)||error.code!=='capacity')throw error;break;}
 }
 const requests=[...document.requests];
 for(const [i,request] of requests.entries())document=applyRestrictionCommand(document,{kind:'DECIDE',operationId:`dddddddd-dddd-4ddd-8ddd-${i.toString(16).padStart(12,'0')}`,expectedRevision:document.revision,requestId:request.id,decision:'APPROVE',effectiveWeek:addDays('2030-10-07',i*7),reason:'\u0800'.repeat(500)},{...context,actorId:'\u0800'.repeat(200),actorRole:'OWNER'}).document;
 const [size]=await q('SELECT octet_length($1::jsonb::text) AS bytes',[JSON.stringify(document)]);
 expect(Number(size.bytes)).toBeLessThanOrEqual(1048576);
 await q('INSERT INTO employee_scheduling_settings(employee_id,management_restrictions) VALUES($1,$2::jsonb)',['worker',JSON.stringify(document)]);
});
it('rechecks a restriction approved between publication read and transaction',async()=>{
 await q("INSERT INTO schedules(id,location_id,week_start,created_by) VALUES('draft','loc-1','2030-10-07','owner'); INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('retained','draft','worker','2030-10-13','08:00','16:00')");
 let intercepted=false;
 const racing:SqlExecutor={query:database.executor.query,transaction:async statements=>{
  if(!intercepted&&statements.some(s=>s.text.includes("UPDATE schedules SET status='PUBLISHED'"))){intercepted=true;await mutateSchedulingRestrictions(owner,'worker',command,database.executor);}
  return database.executor.transaction(statements);
 }};
 await expect(publishScheduleWithRevision({locationId:'loc-1',weekStart:'2030-10-07',managerId:'owner',proof:owner},racing)).rejects.toThrow();
 expect(intercepted).toBe(true);expect(await q("SELECT status FROM schedules WHERE id='draft'")).toEqual([{status:'DRAFT'}]);
 expect(await q('SELECT * FROM schedule_publication_revisions')).toEqual([]);
});
it.each(['deadline','publication'])('refuses a newly closed %s week inserted between read and write',async kind=>{
 let intercepted=false;
 const racing:SqlExecutor={query:database.executor.query,transaction:async statements=>{
  if(!intercepted&&statements.some(s=>s.text.includes('INSERT INTO employee_scheduling_settings'))){
   intercepted=true;
   if(kind==='deadline')await q("INSERT INTO schedule_week_settings(week_start,availability_deadline,updated_by) VALUES('2030-10-07',clock_timestamp()-interval '1 second','owner')");
   else await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('raced','loc-1','2030-10-07','PUBLISHED','owner')");
  }
  return database.executor.transaction(statements);
 }};
 await expect(mutateSchedulingRestrictions(owner,'worker',command,racing)).rejects.toThrow('locked');
 expect(await q("SELECT * FROM employee_scheduling_settings WHERE employee_id='worker'")).toEqual([]);
});
it('serializes competing first confirmations without dropping either history or a conflict',async()=>{
 const outcomes=await Promise.allSettled([
  mutateSchedulingRestrictions(owner,'worker',command,database.executor),
  mutateSchedulingRestrictions(owner,'worker',{...command,operationId:'55555555-5555-4555-8555-555555555555',unavailable:[]},database.executor),
 ]);
 expect(outcomes.filter(o=>o.status==='fulfilled')).toHaveLength(1);expect(outcomes.filter(o=>o.status==='rejected')).toHaveLength(1);
 const read=await readSchedulingRestrictions(owner,'worker',database.executor);expect(read.document.revision).toBe(1);expect(read.document.versions).toHaveLength(1);
});
