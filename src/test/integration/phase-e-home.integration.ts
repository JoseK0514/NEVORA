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
it('actual eligible coverage uses canonical availability and deadline; expiry removes the offer',async()=>{
 const {createCoverageOffer}=await import('./shift-change-api');
 const id=await createCoverageOffer({sourceShiftId:fixture.targetId,requestedByEmployeeId:fixture.actors[1]},db.executor);
 const r=await home();if(!('snapshot' in r))throw Error('No Home');
 const offer=r.snapshot.attention.find(i=>i.ref.id===id);expect(offer).toMatchObject({label:'Review coverage offer',actionable:true,required:false});
 const [source]=await q('SELECT completion_deadline::text AS deadline FROM shift_exchanges WHERE id=$1',[id]) as {deadline:string}[];
 expect(Date.parse(offer!.deadlineAt!)).toBe(Date.parse(source.deadline));expect(offer!.href).toBe('/app/exchange?tab=available&requestId='+encodeURIComponent(id));
 await q("UPDATE shift_exchanges SET completion_deadline=clock_timestamp()-interval '1 second' WHERE id=$1",[id]);
 const expired=await home();if(!('snapshot' in expired))throw Error('No Home');expect(expired.snapshot.attention.some(i=>i.ref.id===id)).toBe(false);
});
it('own correction event revision resurfaces without private decision notes or another employee content',async()=>{
 const id='11111111-1111-4111-8111-111111111111';
 await q(`INSERT INTO time_correction_requests(id,workspace_id,employee_id,requested_by_employee_id,kind,location_id,source_revision,source_snapshot,proposal,reason,request_hash)
 VALUES($1,'workspace-fuel',$2,$2,'MISSING_ENTRY','loc-1',0,'{}','{"startAt":"2030-10-07T12:00:00Z","endAt":"2030-10-07T20:00:00Z"}','PRIVATE CORRECTION REASON',repeat('f',64))`,[id,proof.employee.id]);
 await q("INSERT INTO time_correction_events(id,request_id,revision,event_kind,actor_employee_id,operation_hash,result) VALUES('22222222-2222-4222-8222-222222222222',$1,1,'REQUESTED',$2,repeat('f',64),'{}')",[id,proof.employee.id]);
 let r=await home();if(!('snapshot' in r))throw Error('No Home');expect(r.snapshot.attention.find(i=>i.ref.id===id)).toMatchObject({ref:{version:'r:1'},label:'Time correction requested',href:'/app/my-time'});
 const detail=await readEmployeeAttentionDetail(proof,{kind:'TIME_CORRECTION',id,version:''},db.executor);if(detail.state!=='ready'||!detail.intent)throw Error('Missing detail');await recordEmployeeAttentionReceipt(proof,{kind:'MARK_READ',ref:detail.ref,...detail.intent},db.executor);
 r=await home();if(!('snapshot' in r))throw Error('No Home');expect(r.snapshot.attention.some(i=>i.ref.id===id)).toBe(false);
 await q("INSERT INTO time_correction_events(id,request_id,revision,event_kind,actor_employee_id,operation_hash,result,decision_note) VALUES('33333333-3333-4333-8333-333333333333',$1,2,'REJECTED','QAOWNER',repeat('e',64),'{}','PRIVATE MANAGER DECISION')",[id]);
 r=await home();if(!('snapshot' in r))throw Error('No Home');expect(r.snapshot.attention.find(i=>i.ref.id===id)).toMatchObject({ref:{version:'r:2'},label:'Time correction rejected'});expect(JSON.stringify(r)).not.toMatch(/PRIVATE MANAGER|PRIVATE CORRECTION/);
});
it('multiple persisted future weeks remain in the acknowledgement source; no convenient current-week cut-off',async()=>{
 const {addDays}=await import('../../lib/date-utils');const week=addDays(fixture.week,70);
 await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('further-schedule','loc-1',$1,'DRAFT','QAOWNER')",[week]);
 await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('further-shift','further-schedule',$1,$2,'08:00','16:00')",[proof.employee.id,week]);
 await publishScheduleWithRevision({locationId:'loc-1',weekStart:week,managerId:'QAOWNER'},db.executor);
 const r=await home();if(!('snapshot' in r))throw Error('No Home');expect(r.snapshot.attention.filter(i=>i.ref.kind==='SCHEDULE').map(i=>i.ref.id)).toEqual([fixture.week,week]);expect(r.snapshot.sources.acknowledgements.state).toBe('partial');
});
it('unknown current coverage policy is partial rather than an empty complete eligible source',async()=>{
 const {createCoverageOffer}=await import('./shift-change-api');
 const id=await createCoverageOffer({sourceShiftId:fixture.targetId,requestedByEmployeeId:fixture.actors[1]},db.executor);
 await q("UPDATE workspaces SET shift_change_policy=jsonb_set(shift_change_policy,'{coverage,completionAdvanceMinutes}','null')");
 const r=await home();expect(r).toMatchObject({state:'partial',snapshot:{sources:{exchanges:{state:'partial'}}}});if('snapshot' in r)expect(r.snapshot.attention.some(i=>i.ref.id===id&&i.actionable)).toBe(false);
});
it('terminal exchange changedAt uses actual latest resolution rather than old request creation time',async()=>{
 const {createCoverageOffer}=await import('./shift-change-api');
 const id=await createCoverageOffer({sourceShiftId:fixture.sourceId,requestedByEmployeeId:proof.employee.id},db.executor);
 await q("UPDATE shift_exchanges SET status='CANCELLED',created_at=clock_timestamp()-interval '1 year',resolved_at=clock_timestamp() WHERE id=$1",[id]);
 const [source]=await q('SELECT resolved_at::text AS at FROM shift_exchanges WHERE id=$1',[id]) as {at:string}[];
 const r=await home();if(!('snapshot' in r))throw Error('No Home');const item=r.snapshot.attention.find(i=>i.ref.id===id);expect(item).toBeDefined();expect(Date.parse(item!.changedAt)).toBe(Date.parse(source.at));
});
