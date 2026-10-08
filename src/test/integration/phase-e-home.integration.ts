import {beforeEach,afterEach,expect,it} from 'vitest';
import {Client} from 'pg';
import {createDisposableFoundationDatabase} from './local-postgres';
import {seedOwnedApp,seedOwnedScenario} from './owned-app-fixture';
import {readEmployeeHome,homeAuthority} from '../../lib/data/employee-home.server';
import {readEmployeeWeeklyReview} from '../../lib/data/employee-weekly-review.server';
import {acknowledgeScheduleWeek} from '../../lib/data/acknowledgements';
import {readEmployeeAttentionDetail,recordEmployeeAttentionReceipt} from '../../lib/data/employee-attention-receipts.server';
import {publishScheduleWithRevision} from './management-api';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
let db:Awaited<ReturnType<typeof createDisposableFoundationDatabase>>,proof:SessionMutationProof,fixture:Awaited<ReturnType<typeof seedOwnedScenario>>;
const q=(text:string,values:unknown[]=[])=>db.executor.query({text,values});
const home=()=>readEmployeeHome(proof,db.executor);
beforeEach(async()=>{
 db=await createDisposableFoundationDatabase({mode:'current-runtime'});await seedOwnedApp(db.executor);fixture=await seedOwnedScenario(db.executor,'HSQL',0);
 proof={employee:{id:fixture.actors[0],firstName:'QA HSQL',lastName:'Avery',role:'LEAD',primaryLocationId:'loc-1'},sessionTokenHash:'b'.repeat(64)};
 await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,$2,clock_timestamp()+interval '1 day')",[proof.sessionTokenHash,proof.employee.id]);
 await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status,reason) VALUES('home-leave',$1,'2030-11-01','2030-11-01','APPROVED','PRIVATE OWN REASON'),('foreign-leave',$2,'2030-11-02','2030-11-02','APPROVED','OTHER PRIVATE REASON')",fixture.actors.slice(0,2));
});
afterEach(async()=>{await db?.dispose();});
it('actual six-source PARTIAL Home retains distant published Next Shift and current-week publication notice',async()=>{
 const r=await home();expect(r).toMatchObject({state:'partial',allSet:false,snapshot:{authority:homeAuthority(proof),publicationState:'partial',nextShift:{shiftId:fixture.sourceId},sources:{schedule:{state:'partial'},acknowledgements:{state:'complete'},exchanges:{state:'complete'},timeOff:{state:'complete'},ownTime:{state:'complete'},communications:{state:'partial',reason:'integration_pending'}}}});
 if(!('snapshot' in r))throw Error('No Home');expect(r.snapshot.attention.some(i=>i.ref.kind==='SCHEDULE'&&i.required)).toBe(true);expect(r.snapshot.attention.some(i=>i.ref.id==='home-leave')).toBe(true);
 expect(JSON.stringify(r)).not.toMatch(/PRIVATE|foreign-leave|managerNotes|attendanceScore|sessionTokenHash|proof/);
});
it('canonical confirmation removes required weekly update; equivalent own terms do not fabricate a new update',async()=>{
 const review=await readEmployeeWeeklyReview(proof,fixture.week,db.executor);if(!review.intent||!review.displayedRevisionId)throw Error('Missing real intent');
 expect(await acknowledgeScheduleWeek({proof,weekStart:fixture.week,expectedRevisionId:review.displayedRevisionId,...review.intent},db.executor)).toMatchObject({status:'committed'});
 let r=await home();if(!('snapshot' in r))throw Error('No Home');expect(r.snapshot.attention.filter(i=>i.ref.kind==='SCHEDULE')).toEqual([]);
 await publishScheduleWithRevision({locationId:'loc-1',weekStart:fixture.week,managerId:'QAOWNER'},db.executor);r=await home();if(!('snapshot' in r))throw Error('No Home');expect(r.snapshot.attention.filter(i=>i.ref.kind==='SCHEDULE')).toEqual([]);
 await q('UPDATE shifts SET start_time=\'09:00\' WHERE id=$1',[fixture.sourceId]);await publishScheduleWithRevision({locationId:'loc-1',weekStart:fixture.week,managerId:'QAOWNER'},db.executor);r=await home();if(!('snapshot' in r))throw Error('No Home');expect(r.snapshot.attention.filter(i=>i.ref.kind==='SCHEDULE')).toMatchObject([{required:true,label:'Schedule updated — review required'}]);
});
it('Home impression never marks read; explicit current detail receipt removes info and edited same-status content resurfaces',async()=>{
 await home();expect(await q('SELECT * FROM employee_attention_receipts')).toEqual([]);
 const detail=await readEmployeeAttentionDetail(proof,{kind:'TIME_OFF',id:'home-leave',version:''},db.executor);if(detail.state!=='ready'||!detail.intent)throw Error('Missing detail intent');
 expect(await recordEmployeeAttentionReceipt(proof,{kind:'MARK_READ',ref:detail.ref,...detail.intent},db.executor)).toMatchObject({status:'committed'});
 let r=await home();if(!('snapshot' in r))throw Error('No Home');expect(r.snapshot.attention.some(i=>i.ref.id==='home-leave')).toBe(false);
 await q("UPDATE time_off_requests SET reason='PRIVATE CHANGED' WHERE id='home-leave'");r=await home();if(!('snapshot' in r))throw Error('No Home');expect(r.snapshot.attention.find(i=>i.ref.id==='home-leave')?.ref.version).not.toBe(detail.ref.version);expect(JSON.stringify(r)).not.toContain('PRIVATE CHANGED');
});
it('cap sentinel discloses partial time-off without silently truncating to complete',async()=>{
 await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status) SELECT 'cap-'||n,$1,'2030-12-01','2030-12-01','PENDING' FROM generate_series(1,101)n",[proof.employee.id]);
 const r=await home();expect(r).toMatchObject({state:'partial',allSet:false,snapshot:{sources:{timeOff:{state:'partial',reason:'source_cap'}}}});if('snapshot' in r)expect(r.snapshot.attention.filter(i=>i.ref.kind==='TIME_OFF')).toHaveLength(100);
});
it('actual blocked time-off SQL preserves independently authorized Next Shift and names unavailable source',async()=>{
 const blocker=new Client({connectionString:db.connectionString});await blocker.connect();try{await blocker.query('BEGIN');await blocker.query('LOCK TABLE time_off_requests IN ACCESS EXCLUSIVE MODE');
 const r=await home();expect(r).toMatchObject({state:'partial',snapshot:{nextShift:{shiftId:fixture.sourceId},sources:{timeOff:{state:'unavailable'},communications:{state:'partial'}}}});
 }finally{await blocker.query('ROLLBACK');await blocker.end();}
});
it.each(['schedule','acknowledgements','exchanges','ownTime'])('actual source adapter %s failure cannot produce empty-complete or expose raw errors',async source=>{
 const ex:SqlExecutor={...db.executor,transaction:async(statements,signal)=>{if(statements.some(s=>source==='schedule'?s.text.includes('WITH clock AS MATERIALIZED'):s.text.includes(`home_${source}`)))throw Error('PRIVATE SQL SOURCE FAILURE');return db.executor.transaction(statements,signal);}};
 const r=await readEmployeeHome(proof,ex);expect(r).toMatchObject({state:'partial',allSet:false,snapshot:{sources:{[source]:{state:'unavailable'}}}});expect(JSON.stringify(r)).not.toContain('PRIVATE SQL');
});
it.each(['session','role','eligibility'])('final %s change after source observations discards all private sections',async change=>{
 let checks=0;const ex:SqlExecutor={...db.executor,transaction:async(statements,signal)=>{
  if(statements.some(s=>s.text.includes('home_authority'))&&++checks===2){
   if(change==='session')await q('DELETE FROM employee_sessions WHERE employee_id=$1',[proof.employee.id]);
   else if(change==='role')await q("UPDATE employees SET role='MANAGER' WHERE id=$1",[proof.employee.id]);
   else await q("DELETE FROM employee_location_eligibility WHERE employee_id=$1 AND location_id='loc-2'",[proof.employee.id]);
  }return db.executor.transaction(statements,signal);
 }};
 expect(await readEmployeeHome(proof,ex)).toEqual({state:'unauthorized',reason:'access_denied'});
});
it('expiry while final authority source waits is denied by the post-wait SQL session assertion',async()=>{
 let checks=0;const ex:SqlExecutor={...db.executor,transaction:async(statements,signal)=>{
  if(statements.some(s=>s.text.includes('home_authority'))&&++checks===2){
   await q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '200 milliseconds' WHERE employee_id=$1",[proof.employee.id]);
   const index=statements.findIndex(s=>s.text.includes('home_authority'));
   const delayed:SqlStatement[]=[...statements.slice(0,index),{text:'SELECT pg_sleep(0.3)',values:[]},...statements.slice(index)];
   return db.executor.transaction(delayed,signal);
  }return db.executor.transaction(statements,signal);
 }};
 expect(await readEmployeeHome(proof,ex)).toEqual({state:'unauthorized',reason:'access_denied'});
});
it('source changed between index and final index observation is unavailable with no stale item',async()=>{
 let reads=0;const ex:SqlExecutor={...db.executor,transaction:async(statements,signal)=>{
  if(statements.some(s=>s.text.includes('home_timeOff'))&&++reads===2)await q("UPDATE time_off_requests SET reason='PRIVATE REVISED WHILE WAITING' WHERE id='home-leave'");
  return db.executor.transaction(statements,signal);
 }};
 const r=await readEmployeeHome(proof,ex);expect(r).toMatchObject({state:'partial',snapshot:{sources:{timeOff:{state:'unavailable',reason:'source_changed'}}}});if('snapshot' in r)expect(r.snapshot.attention.some(i=>i.ref.kind==='TIME_OFF')).toBe(false);
});
