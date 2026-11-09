import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
vi.mock('server-only',()=>({}));
import {companyAccessFixture} from './company-access-fixture';
import {createTimeOffRequest,reviewTimeOffRequest} from '../../lib/data/requests';
import {publishScheduleChanges} from '../../lib/data/publication-revisions';
import {readLeaveStaffing} from '../../lib/time-off-staffing/service.server';
import {assignOperationalScope,readOwnerOperationalScope} from '../../lib/company-access/operational-scope.server';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import type {SqlExecutor} from '../../lib/notifications/types';
let f:Awaited<ReturnType<typeof companyAccessFixture>>,employee:SessionMutationProof,requestId:string;
const selector={weekStart:'2030-10-07'};
beforeEach(async()=>{
 f=await companyAccessFixture();requestId=randomUUID();
 employee={employee:{...f.manager.employee,id:'target',role:'EMPLOYEE'},sessionTokenHash:'d'.repeat(64)};
 await f.q(`INSERT INTO employee_location_eligibility VALUES('target','loc-1'),('target','loc-2');
 INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),'target',clock_timestamp()+interval '1 hour');
 INSERT INTO schedules(id,location_id,week_start,status,created_by,published_by) VALUES('schedule','loc-2','2030-10-07','PUBLISHED','owner','owner');
 INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('shift','schedule','target','2030-10-08','08:00','12:00');
 INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES('published','2030-10-07',1,'PUBLISH','owner');
 INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time) VALUES('captured','published','shift','schedule','loc-2','target','2030-10-08','08:00','12:00');`);
 await createTimeOffRequest({requestId,employeeId:'target',proof:employee,startDate:'2030-10-08',endDate:'2030-10-08',reason:'PRIVATE LEAVE NOTE'},f.db.executor);
});
afterEach(async()=>{await f?.db.dispose();});
it('turns canonical approval into a stable assigned repair and preserves the published shift',async()=>{
 const before=await readLeaveStaffing(f.manager,selector,f.db.executor);
 expect(before.state==='ready'&&before.items[0].state).toBe('approval_conflict');
 expect(await reviewTimeOffRequest({requestId,managerId:'manager',proof:f.manager,status:'APPROVED'},f.db.executor)).toBe(true);
 const approved=await readLeaveStaffing(f.owner,selector,f.db.executor);
 expect(approved.state==='ready'&&approved.items[0]).toMatchObject({id:`LEAVE_STAFFING:${requestId}:shift`,state:'repair_required',ownerEmployeeId:'manager',overlapMinutes:240,publicationId:'published'});
 expect(JSON.stringify(approved)).not.toContain('PRIVATE LEAVE NOTE');
 expect(await f.q('SELECT id FROM shifts')).toHaveLength(1);
 expect(await reviewTimeOffRequest({requestId,managerId:'manager',proof:f.manager,status:'APPROVED'},f.db.executor)).toBe(false);
 const again=await readLeaveStaffing(f.owner,selector,f.db.executor);
 expect(again.state==='ready'&&again.items.map(i=>i.id)).toEqual([`LEAVE_STAFFING:${requestId}:shift`]);
});
it('does not clear repair for a draft deletion; a canonical publication clears the conflict',async()=>{
 await reviewTimeOffRequest({requestId,managerId:'manager',proof:f.manager,status:'APPROVED'},f.db.executor);
 await f.q("DELETE FROM shifts WHERE id='shift'");
 const held=await readLeaveStaffing(f.owner,selector,f.db.executor);
 expect(held.state==='ready'&&held.items).toHaveLength(1);
 expect((await publishScheduleChanges({weekStart:selector.weekStart,managerId:'owner',proof:f.owner},f.db.executor)).published).toBe(true);
 const repaired=await readLeaveStaffing(f.owner,selector,f.db.executor);
 expect(repaired.state==='ready'&&repaired.items).toEqual([]);
});
it('serves only the employee own saved requests and does not accept a caller-selected colleague',async()=>{
 const own=await readLeaveStaffing(employee,selector,f.db.executor);
 expect(own.state==='ready'&&own.items.map(i=>i.employeeId)).toEqual(['target']);
 expect(await readLeaveStaffing(employee,{...selector,employeeId:'owner'},f.db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
});
it('limits a scoped Manager to assignment locations and rechecks revocation',async()=>{
 const view=await readOwnerOperationalScope(f.owner,'manager',f.db.executor);if(view.state!=='ready')throw Error('Fixture scope');
 const c=view.data.current;
 expect((await assignOperationalScope(f.owner,'manager',{action:'ASSIGN',operationId:randomUUID(),expectedEmployeeVersion:c.employeeUpdatedAt,expectedRoleGeneration:c.roleGeneration,expectedScopeRevision:c.scopeRevision,scope:{mode:'LOCATIONS',locationIds:['loc-1']}},f.db.executor)).state).toBe('saved');
 const restricted=await readLeaveStaffing(f.manager,selector,f.db.executor);
 expect(restricted.state==='ready'&&restricted.items).toEqual([]);
 await f.q("DELETE FROM employee_sessions WHERE employee_id='manager'");
 expect(await readLeaveStaffing(f.manager,selector,f.db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
});
it('returns unavailable rather than an empty healthy queue when a canonical source is missing',async()=>{
 await f.q('ALTER TABLE schedule_publication_revision_shifts RENAME TO missing_publication_source');
 expect(await readLeaveStaffing(f.owner,selector,f.db.executor)).toEqual({state:'unavailable',reason:'read_failed'});
});
it('does not pull an ended prior-week shift into this week while still reading the previous publication',async()=>{
 await f.q(`INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('old-schedule','loc-2','2030-09-30','PUBLISHED','owner');
 INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES('old-published','2030-09-30',1,'PUBLISH','owner');
 INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time) VALUES('old-captured','old-published','old-shift','old-schedule','loc-2','target','2030-10-06','08:00','12:00');
 INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status,reviewed_by,reviewed_at) VALUES('old-leave','target','2030-10-06','2030-10-06','APPROVED','manager',clock_timestamp());`);
 const result=await readLeaveStaffing(f.owner,selector,f.db.executor);
 expect(result.state==='ready'&&result.items.map(i=>i.requestId)).toEqual([requestId]);
});
it('clears private results if session revocation wins after the snapshot read',async()=>{
 let revoked=false;
 const executor:SqlExecutor={query:f.db.executor.query,async transaction(statements,signal){
  const rows=await f.db.executor.transaction(statements,signal);
  if(!revoked&&statements.some(s=>s.text.includes('),pairs AS ('))){revoked=true;await f.q("DELETE FROM employee_sessions WHERE employee_id='manager'");}
  return rows;
 }};
 expect(await readLeaveStaffing(f.manager,selector,executor)).toEqual({state:'unavailable',reason:'access_denied'});
});
it('keeps one repair identity when two canonical decisions race',async()=>{
 const decide=()=>reviewTimeOffRequest({requestId,managerId:'manager',proof:f.manager,status:'APPROVED'},f.db.executor);
 expect((await Promise.all([decide(),decide()])).sort()).toEqual([false,true]);
 const result=await readLeaveStaffing(f.owner,selector,f.db.executor);
 expect(result.state==='ready'&&result.items.map(item=>item.id)).toEqual([`LEAVE_STAFFING:${requestId}:shift`]);
});
