import {it,expect,vi} from 'vitest';
import {Client} from 'pg';
import type {SqlExecutor} from '../../lib/notifications/types';
import {isManagementAuthorizationError} from '../../lib/data/management-session';
import {deleteGeneratedDraftShift,clearGenerationExclusion} from '../../lib/data/generation-exclusions';
import {readCoverageRepairSelection} from '../../lib/data/coverage-repair.server';
import {randomUUID} from 'node:crypto';
import {companyAccessFixture} from './company-access-fixture';
import {readOwnerOperationalScope,assignOperationalScope,OperationalAuthorizationError} from '../../lib/company-access/operational-scope.server';
import {ensureSchedule,insertShift,insertShiftAtLocation,updateShift,deleteShift} from '../../lib/data/schedules';
import {commitPublishedWeekChange} from '../../lib/data/notification-transactions';
import {getWorkspace} from '../../lib/data/workspaces';
import {generationNeedKey} from '../../lib/scheduling/generation-claims';
import {publishScheduleWithRevision} from '../../lib/data/publication-revisions';
vi.mock('server-only',()=>({}));
const week='2026-10-12';
type Fixture=Awaited<ReturnType<typeof fixture>>;
async function choose(f:Awaited<ReturnType<typeof companyAccessFixture>>,mode:'COMPANY'|'LOCATIONS'){
 const view=await readOwnerOperationalScope(f.owner,'manager',f.db.executor);if(view.state!=='ready')throw Error('Owner scope fixture');const c=view.data.current;
 const result=await assignOperationalScope(f.owner,'manager',{action:'ASSIGN',operationId:randomUUID(),expectedEmployeeVersion:c.employeeUpdatedAt,expectedRoleGeneration:c.roleGeneration,expectedScopeRevision:c.scopeRevision,scope:mode==='COMPANY'?{mode:'COMPANY',locationIds:[]}:{mode:'LOCATIONS',locationIds:['loc-1']}},f.db.executor);expect(result.state).toBe('saved');
}
async function fixture(){
 const f=await companyAccessFixture();try{
  await f.q(`INSERT INTO employee_location_eligibility VALUES('target','loc-1'),('target','loc-2');
   INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) SELECT 'scope-normal-'||d,'target',d,'00:00','24:00' FROM generate_series(0,6)d;
   INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('write-a','loc-1','2026-10-12','DRAFT','owner'),('write-b','loc-2','2026-10-12','DRAFT','owner');
   INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('existing-a','write-a','target','2026-10-12','08:00','09:00'),('existing-b','write-b','target','2026-10-12','12:00','13:00')`);
  await choose(f,'LOCATIONS');return f;
 }catch(error){await f.db.dispose();throw error;}
}
async function denied(work:()=>Promise<unknown>){
 let error:unknown;try{await work();}catch(actual){error=actual;}
 const exact=error instanceof OperationalAuthorizationError||isManagementAuthorizationError(error)||(!!error&&typeof error==='object'&&'code'in error&&error.code==='22P02'&&'message'in error&&error.message==='invalid input syntax for type integer: "operational_authorization"');
 expect(exact).toBe(true);
}
async function snapshot(f:Fixture){
 return f.q(`SELECT jsonb_build_object(
  'schedules',(SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM schedules s),
  'shifts',(SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM shifts s),
  'revisions',(SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM schedule_publication_revisions r),
  'captures',(SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM schedule_publication_revision_shifts r),
  'notifications',(SELECT jsonb_agg(to_jsonb(n) ORDER BY id) FROM notifications n)) AS state`);
}
it('manual A ensure/create/edit/delete stays authorized and leaves B schedule metadata and shifts exact',async()=>{
 const f=await fixture();try{
  const b=await f.q("SELECT to_jsonb(s) AS value FROM schedules s WHERE id='write-b'");
  const bShift=await f.q("SELECT to_jsonb(s) AS value FROM shifts s WHERE id='existing-b'");
  expect(await ensureSchedule({locationId:'loc-1',weekStart:week,createdBy:'manager',proof:f.manager},f.db.executor)).toBe('write-a');
  expect(await f.q("SELECT to_jsonb(s) AS value FROM schedules s WHERE id='write-b'")).toEqual(b);
  const id=await insertShift({scheduleId:'write-a',employeeId:'target',date:week,startTime:'10:00',endTime:'11:00',actorEmployeeId:'manager',proof:f.manager},f.db.executor);
  expect(await updateShift({shiftId:id,employeeId:'target',date:week,startTime:'10:00',endTime:'11:30',actorEmployeeId:'manager',proof:f.manager},f.db.executor)).toBe(true);
  expect(await deleteShift(id,f.manager,f.db.executor)).toBe(true);
  expect(await f.q("SELECT to_jsonb(s) AS value FROM schedules s WHERE id='write-b'")).toEqual(b);
  expect(await f.q("SELECT to_jsonb(s) AS value FROM shifts s WHERE id='existing-b'")).toEqual(bShift);
 }finally{await f.db.dispose();}
});
it('direct B ensure/create/edit/delete rejects exact current authorization and leaves every business/publication/notification row unchanged',async()=>{
 const f=await fixture();try{
  const before=await snapshot(f);
  await denied(()=>ensureSchedule({locationId:'loc-2',weekStart:week,createdBy:'manager',proof:f.manager},f.db.executor));
  await denied(()=>insertShift({scheduleId:'write-b',employeeId:'target',date:week,startTime:'14:00',endTime:'15:00',actorEmployeeId:'manager',proof:f.manager},f.db.executor));
  await denied(()=>updateShift({shiftId:'existing-b',employeeId:'target',date:week,startTime:'13:00',endTime:'14:00',actorEmployeeId:'manager',proof:f.manager},f.db.executor));
  await denied(()=>deleteShift('existing-b',f.manager,f.db.executor));
  expect(await snapshot(f)).toEqual(before);
  await choose(f,'COMPANY');
  const id=await insertShift({scheduleId:'write-b',employeeId:'target',date:week,startTime:'14:00',endTime:'15:00',actorEmployeeId:'manager',proof:f.manager},f.db.executor);
  expect(await f.q('SELECT schedule_id FROM shifts WHERE id=$1',[id])).toEqual([{schedule_id:'write-b'}]);
 }finally{await f.db.dispose();}
});
it('publishing owned A requires Company because the publication protocol covers the whole week',async()=>{
 const f=await fixture();try{
  const before=await snapshot(f);
  await denied(()=>publishScheduleWithRevision({locationId:'loc-1',weekStart:week,managerId:'manager',proof:f.manager},f.db.executor));
  expect(await snapshot(f)).toEqual(before);
  const result=await publishScheduleWithRevision({locationId:'loc-1',weekStart:week,managerId:'owner',proof:f.owner},f.db.executor);
  expect(result.published).toBe(true);expect(await f.q('SELECT count(*)::integer AS count FROM schedule_publication_revisions')).toEqual([{count:1}]);
 }finally{await f.db.dispose();}
});
it('a local draft edit cannot silently repair an unrecorded B publication or emit its global revision/intents',async()=>{
 const f=await fixture();try{
  await f.q("UPDATE schedules SET status='PUBLISHED' WHERE id='write-b'");const before=await snapshot(f);
  await denied(()=>insertShift({scheduleId:'write-a',employeeId:'target',date:week,startTime:'10:00',endTime:'11:00',actorEmployeeId:'manager',proof:f.manager},f.db.executor));
  expect(await snapshot(f)).toEqual(before);
 }finally{await f.db.dispose();}
});

it('manual parent and shift are atomic under a failure after schedule creation',async()=>{
 const f=await fixture();try{
  const next='2026-10-19';
  await f.q(`CREATE FUNCTION test_owned_manual_parent_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.date=date '2026-10-19' THEN RAISE EXCEPTION 'Owned after-schedule failure';END IF;RETURN NEW;END $$;
   CREATE TRIGGER test_owned_manual_parent_failure BEFORE INSERT ON shifts FOR EACH ROW EXECUTE FUNCTION test_owned_manual_parent_failure()`);
  const input={locationId:'loc-1',weekStart:next,employeeId:'target',date:next,startTime:'08:00',endTime:'09:00',actorEmployeeId:'manager',proof:f.manager};
  await expect(insertShiftAtLocation(input,f.db.executor)).rejects.toThrow('Owned after-schedule failure');
  expect(await f.q('SELECT id FROM schedules WHERE week_start=$1',[next])).toEqual([]);
  expect(await f.q('SELECT id FROM shifts WHERE date=$1',[next])).toEqual([]);
  await f.q('DROP TRIGGER test_owned_manual_parent_failure ON shifts');
  const id=await insertShiftAtLocation(input,f.db.executor);
  expect(await f.q('SELECT count(*)::integer AS count FROM schedules WHERE week_start=$1',[next])).toEqual([{count:1}]);
  expect(await f.q('SELECT employee_id FROM shifts WHERE id=$1',[id])).toEqual([{employee_id:'target'}]);
 }finally{await f.db.dispose();}
});

it.each(['scope revocation','role cycle','session loss'] as const)('schedule business batch rechecks %s changed after admission and rolls every row back',async kind=>{
 const f=await fixture();try{
  const before=await snapshot(f);let changed=false;
  const ex:SqlExecutor={...f.db.executor,transaction:async(statements,signal)=>{
   if(!changed&&statements.some(s=>s.text.startsWith('INSERT INTO shifts '))){
    changed=true;
    if(kind==='scope revocation'){
     const v=await readOwnerOperationalScope(f.owner,'manager',f.db.executor);if(v.state!=='ready')throw Error('Owner context');const c=v.data.current;
     expect((await assignOperationalScope(f.owner,'manager',{action:'REVOKE',operationId:randomUUID(),expectedEmployeeVersion:c.employeeUpdatedAt,expectedRoleGeneration:c.roleGeneration,expectedScopeRevision:c.scopeRevision},f.db.executor)).state).toBe('saved');
    }else if(kind==='role cycle')await f.q("UPDATE employees SET role='EMPLOYEE' WHERE id='manager';UPDATE employees SET role='MANAGER' WHERE id='manager'");
    else await f.q("DELETE FROM employee_sessions WHERE employee_id='manager'");
   }
   return f.db.executor.transaction(statements,signal);
  }};
  await denied(()=>insertShift({scheduleId:'write-a',employeeId:'target',date:week,startTime:'10:00',endTime:'11:00',actorEmployeeId:'manager',proof:f.manager},ex));
  expect(changed).toBe(true);expect(await snapshot(f)).toEqual(before);
 }finally{await f.db.dispose();}
});
it('schedule final wall-clock check rolls back a shift blocked until its admitted session expires',async()=>{
 const f=await fixture(),barrier=new Client({connectionString:f.db.connectionString,statement_timeout:5000});let pending:Promise<void>|undefined;
 try{
  const before=await snapshot(f);await barrier.connect();await barrier.query('SELECT pg_advisory_lock(321051)');
  await f.q(`CREATE FUNCTION test_owned_schedule_expiry_wait() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_advisory_xact_lock(321051);RETURN NEW;END $$;CREATE TRIGGER test_owned_schedule_expiry_wait BEFORE INSERT ON shifts FOR EACH ROW EXECUTE FUNCTION test_owned_schedule_expiry_wait()`);
  let armed=false;const ex:SqlExecutor={...f.db.executor,transaction:async(statements,signal)=>{
   if(!armed&&statements.some(s=>s.text.startsWith('INSERT INTO shifts '))){armed=true;await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '900 milliseconds' WHERE employee_id='manager'");}
   return f.db.executor.transaction(statements,signal);
  }};
  pending=denied(()=>insertShift({scheduleId:'write-a',employeeId:'target',date:week,startTime:'10:00',endTime:'11:00',actorEmployeeId:'manager',proof:f.manager},ex));
  let waiting=false;const until=Date.now()+3500;
  while(!waiting&&Date.now()<until){const [r]=await f.q<{waiting:boolean}>("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'INSERT INTO shifts %') AS waiting");waiting=r.waiting;if(!waiting)await new Promise(r=>setTimeout(r,10));}
  expect(waiting).toBe(true);let expired=false;
  while(!expired&&Date.now()<until){const [r]=await f.q<{expired:boolean}>("SELECT expires_at<=clock_timestamp() AS expired FROM employee_sessions WHERE employee_id='manager'");expired=r.expired;if(!expired)await new Promise(r=>setTimeout(r,20));}
  expect(expired).toBe(true);await barrier.query('SELECT pg_advisory_unlock(321051)');await pending;expect(await snapshot(f)).toEqual(before);
 }finally{await barrier.query('SELECT pg_advisory_unlock_all()').catch(()=>{});await pending;await barrier.end();await f.db.dispose();}
});
it.each(['generated deletion','exclusion clearing','coverage review'] as const)('%s requires Company even for an A selector or absent target',async kind=>{
 const f=await fixture();try{
  const before=await snapshot(f);const input={workspaceId:(await getWorkspace(f.db.executor)).id,locationId:'loc-1',weekStart:week,actorEmployeeId:'manager',proof:f.manager};
  await denied(()=>kind==='generated deletion'?deleteGeneratedDraftShift({...input,shiftId:'existing-a'},f.db.executor):kind==='exclusion clearing'?clearGenerationExclusion({...input,exclusionId:'absent'},f.db.executor):readCoverageRepairSelection('invalid',f.manager,f.db.executor));
  expect(await snapshot(f)).toEqual(before);
 }finally{await f.db.dispose();}
});

it('actual unrepresented generated provenance aborts a purported local manual batch before commit',async()=>{
 const f=await fixture();try{
  const before=await snapshot(f),workspace=await getWorkspace(f.db.executor);
  const scope={workspaceId:workspace.id,timeZone:workspace.timeZone,weekStart:week,locationId:'loc-1'};
  const need={kind:'STAFFING' as const,needStart:week+'T08:00',needEnd:week+'T09:00',configuredCapacity:1,staffingBasis:{requiredStaff:1,positions:[]}};
  const claims={version:1,claims:[{...need,needKey:generationNeedKey(scope,need),coveredStart:need.needStart,coveredEnd:need.needEnd,quantity:1}]};
  await expect(commitPublishedWeekChange({weekStarts:[week],actorEmployeeId:'manager',proof:f.manager,sourceType:'MANAGER_MUTATION',build:state=>({
   statements:[{text:"UPDATE shifts SET notes='local note',assignment_origin='GENERATED',generated_claims=$1::jsonb WHERE id='existing-a'",values:[JSON.stringify(claims)]}],afterSchedules:state.schedules,
   afterShifts:state.shifts.map(s=>s.sourceShiftId==='existing-a'?{...s,notes:'local note'}:s)})},f.db.executor)).rejects.toMatchObject({code:'22P02',message:'invalid input syntax for type integer: "schedule_week_version_conflict"'});
  expect(await snapshot(f)).toEqual(before);
 }finally{await f.db.dispose();}
});

it('explicit Company restoration permits generated deletion and exclusion clearing without publication or notification effects',async()=>{
 const f=await fixture();try{
  const workspace=await getWorkspace(f.db.executor),scope={workspaceId:workspace.id,timeZone:workspace.timeZone,weekStart:week,locationId:'loc-1'};
  const need={kind:'STAFFING' as const,needStart:week+'T08:00',needEnd:week+'T09:00',configuredCapacity:1,staffingBasis:{requiredStaff:1,positions:[]}};
  const claims={version:1,claims:[{...need,needKey:generationNeedKey(scope,need),coveredStart:need.needStart,coveredEnd:need.needEnd,quantity:1}]};
  await f.q("UPDATE shifts SET assignment_origin='GENERATED',generated_claims=$1::jsonb WHERE id='existing-a'",[JSON.stringify(claims)]);
  await choose(f,'COMPANY');const input={workspaceId:workspace.id,locationId:'loc-1',weekStart:week,actorEmployeeId:'manager',proof:f.manager};
  const result=await deleteGeneratedDraftShift({...input,shiftId:'existing-a'},f.db.executor);expect(result.status).toBe('deleted');expect(result.exclusionId).toBeTruthy();
  expect(await clearGenerationExclusion({...input,exclusionId:result.exclusionId!},f.db.executor)).toEqual({status:'cleared'});
  expect(await clearGenerationExclusion({...input,exclusionId:result.exclusionId!},f.db.executor)).toEqual({status:'already-cleared'});
  expect(await f.q('SELECT id FROM schedule_publication_revisions')).toEqual([]);expect(await f.q('SELECT id FROM notifications')).toEqual([]);
 }finally{await f.db.dispose();}
});
