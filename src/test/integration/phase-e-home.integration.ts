import {beforeEach,afterEach,expect,it} from 'vitest';
import {createHash,randomUUID} from 'node:crypto';
import {previewCommunicationAudience,executeCommunicationCommand,communicationAuthority,readCommunication,recordCommunicationRead} from '../../lib/communications/service.server';
import type {CommunicationDraft} from '../../lib/communications/types';
import {Client} from 'pg';
import {createDisposableFoundationDatabase} from './local-postgres';
import {seedOwnedApp,seedOwnedScenario,seedOwnedScenarioOwner,setOwnedEmployeeRole} from './owned-app-fixture';
import {admitLogin,admitLoginAttempt,LOGIN_LIMITS,releaseLoginAddress} from '../../lib/auth/login-limits.server';
import {readEmployeeHome,homeAuthority} from '../../lib/data/employee-home.server';
import {readEmployeeWeeklyReview} from '../../lib/data/employee-weekly-review.server';
import {acknowledgeScheduleWeek} from '../../lib/data/acknowledgements';
import {readEmployeeAttentionDetail,recordEmployeeAttentionReceipt} from '../../lib/data/employee-attention-receipts.server';
import {publishScheduleWithRevision} from './management-api';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
import {communicationRootInsert,communicationRevisionInsert,communicationGrantInsert,communicationContentHash} from '../../lib/data/communications.server';
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
it('owned SQL transport resets reused sessions and keeps concurrent transaction backends independent',async()=>{
 const [initial]=await q('SELECT pg_backend_pid() AS pid') as {pid:number}[];
 await q("SET nevora.fixture_probe='private fixture state'");
 await q('CREATE TEMP TABLE fixture_transport_probe(n integer)');
 const [clean]=await q("SELECT pg_backend_pid() AS pid,NULLIF(current_setting('nevora.fixture_probe',true),'') AS setting,to_regclass('pg_temp.fixture_transport_probe')::text AS temporary,current_setting('statement_timeout') AS timeout") as {pid:number;setting:string|null;temporary:string|null;timeout:string}[];
 expect(clean).toEqual({pid:initial.pid,setting:null,temporary:null,timeout:'5s'});
 const batches=await Promise.all([1,2].map(()=>db.executor.transaction([{text:'SELECT pg_backend_pid() AS pid',values:[]},{text:'SELECT pg_sleep(0.05)',values:[]}])));
 expect(new Set(batches.map(rows=>(rows[0][0] as {pid:number}).pid)).size).toBe(2);
});
it('owned SQL cancellation retires its backend before another batch can reuse it',async()=>{
 const controller=new AbortController();
 const pending=db.executor.transaction([{text:'SELECT pg_sleep(3)',values:[]}],controller.signal).then(()=>null,error=>error);
 try{
  let sleepingPid:number|undefined;const deadline=performance.now()+2000;
  while(performance.now()<deadline){
   const rows=await q("SELECT pid FROM pg_stat_activity WHERE datname=current_database() AND state='active' AND query=$1",['SELECT pg_sleep(3)']) as {pid:number}[];
   if(rows.length){sleepingPid=rows[0].pid;break;}
   await new Promise(resolve=>setTimeout(resolve,10));
  }
  expect(sleepingPid).toBeDefined();controller.abort(Error('Owned fixture cancellation control'));
  expect(await pending).toBeInstanceOf(Error);
  const [next]=await q('SELECT pg_backend_pid() AS pid,17 AS value') as {pid:number;value:number}[];
  expect(next.value).toBe(17);expect(next.pid).not.toBe(sleepingPid);
 }finally{controller.abort();await pending;}
});
it('fictional browser-cell Owners retain independent real sign-in budgets without disabling rate limits',async()=>{
 const first=await seedOwnedScenarioOwner(db.executor,'HSQL1'),second=await seedOwnedScenarioOwner(db.executor,'HSQL2');
 expect(first).not.toBe(second);
 expect(await q("SELECT id,role FROM employees WHERE id=ANY($1::text[]) ORDER BY id",[[first,second]])).toEqual([{id:first,role:'OWNER'},{id:second,role:'OWNER'}]);
 expect(await q('SELECT employee_id FROM employee_credentials WHERE employee_id=ANY($1::text[]) AND password_hash=(SELECT password_hash FROM employee_credentials WHERE employee_id=$2) ORDER BY employee_id',[[first,second],'QAOWNER'])).toEqual([{employee_id:first},{employee_id:second}]);
 for(let attempt=0;attempt<10;attempt++)expect(await admitLoginAttempt(first,'198.51.100.23',db.executor)).toBe(true);
 expect(await admitLoginAttempt(first,'198.51.100.23',db.executor)).toBe(false);
 expect(await admitLoginAttempt(second,'198.51.100.23',db.executor)).toBe(true);
});
it('a shared store address counts only failed sign-ins, while failures from it still reach the limit',async()=>{
 const address='198.51.100.77',shift=Array.from({length:LOGIN_LIMITS.perAddress+20},(_,i)=>`SHIFT-${i}`);
 // A whole shift signing in correctly over one network: each success hands its address slot back.
 for(const id of shift){const admission=await admitLogin(id,address,db.executor);expect(admission.admitted).toBe(true);expect(admission.addressBucket).toEqual(expect.any(Number));await releaseLoginAddress(address,admission,db.executor);}
 // Failures are never released, so guessing from the same address still stops at the limit.
 for(let i=0;i<LOGIN_LIMITS.perAddress;i++)expect(await admitLoginAttempt(`GUESS-${i}`,address,db.executor)).toBe(true);
 expect(await admitLoginAttempt('GUESS-LAST',address,db.executor)).toBe(false);
 // A refund never goes below zero, and an unknown address or window is a no-op.
 const other=await admitLogin('OTHER','198.51.100.78',db.executor);
 await releaseLoginAddress('198.51.100.78',other,db.executor);await releaseLoginAddress('198.51.100.78',other,db.executor);
 await releaseLoginAddress(null,other,db.executor);await releaseLoginAddress('198.51.100.78',{addressBucket:null},db.executor);
 expect(await admitLoginAttempt('OTHER','198.51.100.78',db.executor)).toBe(true);
});
it('a success refunds the window it was admitted in, so crossing a 15-minute boundary never erases newer failures',async()=>{
 const address='198.51.100.79',key=createHash('sha256').update(`NEVORA login limit address v1:${address}`).digest('hex');
 const success=await admitLogin('CROSS-OK',address,db.executor);expect(success.admitted).toBe(true);
 // The password check finishes after the boundary: that attempt now sits in the previous window.
 expect(await q('UPDATE password_recovery_limits SET bucket=bucket-1 WHERE scope=$1 RETURNING attempts',[key])).toEqual([{attempts:1}]);
 const previous={addressBucket:success.addressBucket!-1};
 const failures=5;for(let i=0;i<failures;i++)expect(await admitLoginAttempt(`CROSS-BAD-${i}`,address,db.executor)).toBe(true);
 await releaseLoginAddress(address,previous,db.executor);
 expect(await q('SELECT bucket::text AS bucket,attempts FROM password_recovery_limits WHERE scope=$1 ORDER BY bucket',[key])).toEqual([{bucket:String(success.addressBucket),attempts:failures}]);
});
it('concurrent successful refunds from one address apply one after another and leave no phantom attempt',async()=>{
 const address='198.51.100.80',key=createHash('sha256').update(`NEVORA login limit address v1:${address}`).digest('hex');
 const admissions=await Promise.all(Array.from({length:12},(_,i)=>admitLogin(`PAIR-${i}`,address,db.executor)));
 expect(admissions.every(a=>a.admitted)).toBe(true);
 await Promise.all(admissions.map(a=>releaseLoginAddress(address,a,db.executor)));
 expect(await q('SELECT attempts FROM password_recovery_limits WHERE scope=$1',[key])).toEqual([]);
});
it('actual six-source PARTIAL Home retains distant published Next Shift and current-week publication notice',async()=>{
 const r=await home();expect(r).toMatchObject({state:'partial',allSet:false,snapshot:{authority:homeAuthority(proof),publicationState:'partial',nextShift:{shiftId:fixture.sourceId},sources:{schedule:{state:'partial'},acknowledgements:{state:'complete'},exchanges:{state:'complete'},timeOff:{state:'complete'},ownTime:{state:'complete'},communications:{state:'complete'}}}});
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
 const r=await home();expect(r).toMatchObject({state:'partial',snapshot:{nextShift:{shiftId:fixture.sourceId},sources:{timeOff:{state:'unavailable'},communications:{state:'complete'}}}});
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
 r=await home();if(!('snapshot' in r))throw Error('No Home');expect(r.snapshot.attention.find(i=>i.ref.id===id)).toMatchObject({ref:{version:'r:2'},label:'Time correction declined'});expect(JSON.stringify(r)).not.toMatch(/PRIVATE MANAGER|PRIVATE CORRECTION/);
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
it('own same-status time-off rows identify distinct canonical dates and ranges without private reasons',async()=>{
 await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status,reason) VALUES('home-other-period',$1,'2030-12-02','2030-12-04','APPROVED','PRIVATE OTHER PERIOD')",[proof.employee.id]);
 const r=await home();if(!('snapshot' in r))throw Error('No Home');
 expect(r.snapshot.attention.find(i=>i.ref.id==='home-leave')?.label).toBe('Time off approved · Nov 1, 2030');
 expect(r.snapshot.attention.find(i=>i.ref.id==='home-other-period')?.label).toBe('Time off approved · Dec 2, 2030 – Dec 4, 2030');
 expect(JSON.stringify(r)).not.toContain('PRIVATE OTHER PERIOD');
});
it('acknowledged last own shift removal has exact current review and preserves another authorized week',async()=>{
 const review=await readEmployeeWeeklyReview(proof,fixture.week,db.executor);
 if(!review.intent||!review.displayedRevisionId)throw Error('Missing actual reviewed intent');
 expect(await acknowledgeScheduleWeek({proof,weekStart:fixture.week,expectedRevisionId:review.displayedRevisionId,...review.intent},db.executor)).toMatchObject({status:'committed'});
 await q('DELETE FROM shifts WHERE id=$1',[fixture.sourceId]);
 await publishScheduleWithRevision({locationId:'loc-1',weekStart:fixture.week,managerId:'QAOWNER'},db.executor);
 const removal=await readEmployeeWeeklyReview(proof,fixture.week,db.executor);
 expect(removal.shifts).toEqual([]);expect(removal.acknowledgement.needsAcknowledgement).toBe(true);expect(removal.publicationChanges.length).toBeGreaterThan(0);
 if(!removal.intent||!removal.displayedRevisionId)throw Error('Missing current relevant empty-week intent');
 const {addDays}=await import('../../lib/date-utils'),otherWeek=addDays(fixture.week,7);
 await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('empty-review-other','loc-1',$1,'DRAFT','QAOWNER')",[otherWeek]);
 await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('empty-review-other-shift','empty-review-other',$1,$2,'08:00','16:00')",[proof.employee.id,otherWeek]);
 await publishScheduleWithRevision({locationId:'loc-1',weekStart:otherWeek,managerId:'QAOWNER'},db.executor);
 await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('empty-review-other-location','loc-2',$1,'DRAFT','QAOWNER')",[otherWeek]);
 await publishScheduleWithRevision({locationId:'loc-2',weekStart:otherWeek,managerId:'QAOWNER'},db.executor);
 const r=await home();expect(r).toMatchObject({state:'partial',allSet:false,snapshot:{sources:{acknowledgements:{state:'complete'},timeOff:{state:'complete'}}}});
 if(!('snapshot' in r))throw Error('Expected independently authorized source');
 expect(r.snapshot.attention.some(row=>row.ref.id==='home-leave')).toBe(true);
 expect(r.snapshot.attention).toEqual(expect.arrayContaining([expect.objectContaining({href:'/app/schedule?week='+fixture.week,required:true,actionable:true}),expect.objectContaining({href:'/app/schedule?week='+otherWeek,required:true,actionable:true})]));
 const command={proof,weekStart:fixture.week,expectedRevisionId:removal.displayedRevisionId,...removal.intent};
 const committed=await acknowledgeScheduleWeek(command,db.executor);expect(committed).toMatchObject({status:'committed'});expect(await acknowledgeScheduleWeek(command,db.executor)).toEqual(committed);
 expect(await readEmployeeWeeklyReview(proof,fixture.week,db.executor)).toMatchObject({shifts:[],acknowledgement:{acknowledged:true,needsAcknowledgement:false},intent:null});
 const after=await home();if(!('snapshot'in after))throw Error('No current Home');
 expect(after.snapshot.attention.filter(row=>row.ref.kind==='SCHEDULE').map(row=>row.href)).toEqual(['/app/schedule?week='+otherWeek]);
});

it('actual actionable coverage expiring between source reads and final SQL observation requires source revalidation',async()=>{
 const {createCoverageOffer}=await import('./shift-change-api');
 const id=await createCoverageOffer({sourceShiftId:fixture.targetId,requestedByEmployeeId:fixture.actors[1]},db.executor);
 await q("UPDATE shift_exchanges SET completion_deadline=clock_timestamp()+interval '3 seconds' WHERE id=$1",[id]);
 let observations=0,validBeforeWait=false;
 const ex:SqlExecutor={...db.executor,transaction:async(statements,signal)=>{
  if(statements.some(s=>s.text.includes('home_authority'))&&++observations===2){
   const [row]=await q('SELECT clock_timestamp()<completion_deadline AS valid FROM shift_exchanges WHERE id=$1',[id]) as {valid:boolean}[];
   validBeforeWait=row.valid;
   await q('SELECT pg_sleep(GREATEST(0,EXTRACT(EPOCH FROM (completion_deadline-clock_timestamp())))+0.05) FROM shift_exchanges WHERE id=$1',[id]);
  }
  return db.executor.transaction(statements,signal);
 }};
 const r=await readEmployeeHome(proof,ex);expect(validBeforeWait).toBe(true);
 expect(r).toMatchObject({state:'partial',allSet:false,snapshot:{sources:{exchanges:{state:'unavailable',reason:'expired'},timeOff:{state:'complete'}}}});
 if('snapshot' in r)expect(r.snapshot.attention.some(row=>row.ref.id===id)).toBe(false);
});
it('foreign and formerly authorized own historical weeks cannot broaden current weekly relevance',async()=>{
 const {addDays}=await import('../../lib/date-utils');
 for(const [suffix,location,employee,offset] of [['foreign','loc-1',fixture.actors[1],14],['ineligible','loc-2',proof.employee.id,21]] as const){
  const week=addDays(fixture.week,offset);
  await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES($1,$2,$3,'DRAFT','QAOWNER')",['history-'+suffix,location,week]);
  await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES($1,$2,$3,$4,'08:00','16:00')",['history-shift-'+suffix,'history-'+suffix,employee,week]);
  await publishScheduleWithRevision({locationId:location,weekStart:week,managerId:'QAOWNER'},db.executor);
  await q('DELETE FROM shifts WHERE id=$1',['history-shift-'+suffix]);
  await publishScheduleWithRevision({locationId:location,weekStart:week,managerId:'QAOWNER'},db.executor);
 }
 await q("DELETE FROM employee_location_eligibility WHERE employee_id=$1 AND location_id='loc-2'",[proof.employee.id]);
 const r=await home();expect(r).toMatchObject({state:'partial',snapshot:{sources:{acknowledgements:{state:'complete'}}}});
 if('snapshot' in r)expect(r.snapshot.attention.filter(row=>row.ref.kind==='SCHEDULE').map(row=>row.ref.id)).toEqual([fixture.week]);
});

const ownerProof:SessionMutationProof={employee:{id:'QAOWNER',firstName:'Fictional',lastName:'Owner',role:'OWNER',primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)};
async function publishUpdate(acknowledgement:CommunicationDraft['acknowledgement']='REQUIRED',expiresAt:string|null=null){
 await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'QAOWNER',clock_timestamp()+interval '1 day') ON CONFLICT(token_hash) DO NOTHING",[ownerProof.sessionTokenHash]);
 const draft:CommunicationDraft={type:'LOCATION_ANNOUNCEMENT',scope:{kind:'LOCATION',locationId:'loc-1'},title:'Fictional operational update',body:'Read the full fictional content before acknowledgement.',acknowledgement,expiresAt};
 const preview=await previewCommunicationAudience(ownerProof,draft,db.executor);if(preview.state!=='ready')throw Error('No actual audience');
 const result=await executeCommunicationCommand(ownerProof,{kind:'PUBLISH',operationId:randomUUID(),authority:preview.authority,draft,audienceFingerprint:preview.fingerprint},db.executor);if(result.status!=='committed')throw Error('No actual publication');return {result,draft};
}
it('announcement_required_ack_keeps_attention and push_disabled_still_required_in_app',async()=>{
 const {result}=await publishUpdate();const r=await home();if(!('snapshot' in r))throw Error('No Home');
 expect(r.snapshot.sources.communications.state).toBe('complete');expect(r.snapshot.attention.find(row=>row.ref.id===result.id)).toMatchObject({ref:{kind:'COMMUNICATION',version:result.version},required:true,actionable:true,href:'/app/updates/'+result.id,deadlineAt:null});
 expect(await q('SELECT * FROM communication_receipts')).toEqual([]);expect(JSON.stringify(r)).not.toContain('Read the full fictional content');
 expect(await recordCommunicationRead(proof,{kind:'MARK_READ',operationId:randomUUID(),authority:communicationAuthority(proof),ref:{kind:'COMMUNICATION',id:result.id,version:result.version}},db.executor)).toMatchObject({status:'blocked',reason:'required_action'});
 const still=await home();if(!('snapshot' in still))throw Error('No Home');expect(still.snapshot.attention.some(row=>row.ref.id===result.id&&row.required)).toBe(true);
});
it('edit_new_version_resurfaces after full-content current acknowledgement',async()=>{
 const {result,draft}=await publishUpdate();const detail=await readCommunication(proof,result.id,db.executor);if(detail.state!=='ready')throw Error('No current content');
 expect(await executeCommunicationCommand(proof,{kind:'ACKNOWLEDGE',operationId:randomUUID(),authority:detail.authority,communicationId:result.id,expectedRevisionId:detail.revisionId,contentHash:detail.contentHash},db.executor)).toMatchObject({status:'committed'});
 let r=await home();if(!('snapshot' in r))throw Error('No Home');expect(r.snapshot.attention.some(row=>row.ref.id===result.id)).toBe(false);
 const revised={...draft,body:'New fictional content needs a fresh acknowledgement.'},preview=await previewCommunicationAudience(ownerProof,revised,db.executor);if(preview.state!=='ready')throw Error('No revised audience');
 const revision=await executeCommunicationCommand(ownerProof,{kind:'REVISE',operationId:randomUUID(),authority:preview.authority,communicationId:result.id,expectedRevisionId:result.version,draft:revised,audienceFingerprint:preview.fingerprint},db.executor);if(revision.status!=='committed')throw Error('No revision');
 r=await home();if(!('snapshot' in r))throw Error('No Home');expect(r.snapshot.attention.find(row=>row.ref.id===result.id)).toMatchObject({ref:{version:revision.version},required:true});
});
it('withdrawal_removes_requirement and optional seen receipt removes only its own version',async()=>{
 const {result}=await publishUpdate('OPTIONAL');expect(await recordCommunicationRead(proof,{kind:'MARK_READ',operationId:randomUUID(),authority:communicationAuthority(proof),ref:{kind:'COMMUNICATION',id:result.id,version:result.version}},db.executor)).toMatchObject({status:'committed'});
 let r=await home();if(!('snapshot' in r))throw Error('No Home');expect(r.snapshot.attention.some(row=>row.ref.id===result.id)).toBe(false);
 const required=await publishUpdate();expect(await executeCommunicationCommand(ownerProof,{kind:'WITHDRAW',operationId:randomUUID(),authority:communicationAuthority(ownerProof),communicationId:required.result.id,expectedRevisionId:required.result.version},db.executor)).toMatchObject({status:'committed'});
 r=await home();if(!('snapshot' in r))throw Error('No Home');expect(r.snapshot.attention.some(row=>row.ref.id===required.result.id)).toBe(false);expect(r.snapshot.sources.communications.state).toBe('complete');
});
it('communications_failure_never_clear and retained known schedule remains available',async()=>{
 const ex:SqlExecutor={...db.executor,transaction:async(statements,signal)=>{if(statements.some(s=>s.text.includes('communication_list_index')))throw Error('PRIVATE COMMUNICATION FAILURE');return db.executor.transaction(statements,signal);}};
 const r=await readEmployeeHome(proof,ex);expect(r).toMatchObject({state:'partial',allSet:false,snapshot:{nextShift:{shiftId:fixture.sourceId},sources:{communications:{state:'unavailable'}}}});expect(JSON.stringify(r)).not.toContain('PRIVATE COMMUNICATION');
});
it('empty communication insertion while final Home observation waits never produces complete empty',async()=>{
 let observations=0;const ex:SqlExecutor={...db.executor,transaction:async(statements,signal)=>{if(statements.some(s=>s.text.includes('home_authority'))&&++observations===2)await publishUpdate();return db.executor.transaction(statements,signal);}};
 const r=await readEmployeeHome(proof,ex);expect(r).toMatchObject({state:'partial',allSet:false,snapshot:{sources:{communications:{state:'unavailable',reason:'source_changed'}}}});
});
it('expiration and current grant loss during final Home wait discard former communication rows',async()=>{
 const {result}=await publishUpdate();let observations=0;const ex:SqlExecutor={...db.executor,transaction:async(statements,signal)=>{if(statements.some(s=>s.text.includes('home_authority'))&&++observations===2)await q("UPDATE locations SET active=false WHERE id='loc-1'");return db.executor.transaction(statements,signal);}};
 const r=await readEmployeeHome(proof,ex);expect(r).toMatchObject({state:'unauthorized',reason:'access_denied'});expect(JSON.stringify(r)).not.toContain(result.id);
});

async function fullyClearProof():Promise<SessionMutationProof>{
 const p:SessionMutationProof={employee:{id:'QA-HOME-CLEAR',firstName:'Fictional',lastName:'Clear',role:'EMPLOYEE',primaryLocationId:'loc-1'},sessionTokenHash:'c'.repeat(64)};
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,'Fictional','Clear','555-0105','EMPLOYEE','loc-1')",[p.employee.id]);
 await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,$2,clock_timestamp()+interval '1 day')",[p.sessionTokenHash,p.employee.id]);
 const [clock]=await q("SELECT date_trunc('week',clock_timestamp() AT TIME ZONE time_zone)::date::text AS week FROM workspaces") as {week:string}[];
 await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('home-current-clear','loc-1',$1,'DRAFT','QAOWNER')",[clock.week]);
 await publishScheduleWithRevision({locationId:'loc-1',weekStart:clock.week,managerId:'QAOWNER'},db.executor);
 return p;
}
it('all_sources_complete_zero_items_exact_copy producer has a real complete authorized fixture',async()=>{
 const p=await fullyClearProof(),r=await readEmployeeHome(p,db.executor);expect(r).toMatchObject({state:'ready',allSet:true,snapshot:{publicationState:'complete',attention:[],sources:Object.fromEntries(['schedule','acknowledgements','exchanges','timeOff','ownTime','communications'].map(key=>[key,{state:'complete'}]))}});
});
it.each(['schedule','acknowledgements','exchanges','timeOff','ownTime','communications'])('complete-zero fixture single %s failure never becomes all-clear',async source=>{
 const p=await fullyClearProof(),ex:SqlExecutor={...db.executor,transaction:async(statements,signal)=>{if(statements.some(s=>source==='schedule'?s.text.includes('WITH clock AS MATERIALIZED'):source==='communications'?s.text.includes('communication_list_index'):s.text.includes('home_'+source)))throw Error('PRIVATE ZERO SOURCE FAILURE');return db.executor.transaction(statements,signal);}};
 const r=await readEmployeeHome(p,ex);expect(r).toMatchObject({state:'partial',allSet:false,snapshot:{sources:{[source]:{state:'unavailable'}}}});expect(JSON.stringify(r)).not.toContain('PRIVATE ZERO');
});
it('optional expiration bounds lifetime then expiration during final wait cannot retain its row',async()=>{
 const [clock]=await q("SELECT to_jsonb(clock_timestamp()+interval '3 seconds') AS until") as {until:string}[];
 const {result}=await publishUpdate('OPTIONAL',new Date(clock.until).toISOString());const initial=await home();if(!('snapshot' in initial))throw Error('No Home');expect(initial.snapshot.attention.find(row=>row.ref.id===result.id)).toMatchObject({required:false,actionable:false,deadlineAt:null});expect(initial.snapshot.validForMs).toBeLessThan(3000);
 let observations=0;const ex:SqlExecutor={...db.executor,transaction:async(statements,signal)=>{if(statements.some(s=>s.text.includes('home_authority'))&&++observations===2)await q('SELECT pg_sleep(GREATEST(0,EXTRACT(EPOCH FROM ($1::timestamptz-clock_timestamp())))+0.05)',[clock.until]);return db.executor.transaction(statements,signal);}};
 const r=await readEmployeeHome(proof,ex);expect(r).toMatchObject({state:'partial',allSet:false,snapshot:{sources:{communications:{state:'unavailable',reason:'source_changed'}}}});if('snapshot' in r)expect(r.snapshot.attention.some(row=>row.ref.id===result.id)).toBe(false);
 const expired=await home();if(!('snapshot' in expired))throw Error('No Home');expect(expired.snapshot.attention.some(row=>row.ref.id===result.id)).toBe(false);expect(expired.snapshot.sources.communications.state).toBe('complete');
});
it('current acknowledgement inserted during final Home wait cannot return the buffered required row',async()=>{
 const {result}=await publishUpdate();const detail=await readCommunication(proof,result.id,db.executor);if(detail.state!=='ready')throw Error('No content');
 let observations=0;const ex:SqlExecutor={...db.executor,transaction:async(statements,signal)=>{if(statements.some(s=>s.text.includes('home_authority'))&&++observations===2){expect(await executeCommunicationCommand(proof,{kind:'ACKNOWLEDGE',operationId:randomUUID(),authority:detail.authority,communicationId:result.id,expectedRevisionId:detail.revisionId,contentHash:detail.contentHash},db.executor)).toMatchObject({status:'committed'});}return db.executor.transaction(statements,signal);}};
 const r=await readEmployeeHome(proof,ex);expect(r).toMatchObject({state:'partial',allSet:false,snapshot:{sources:{communications:{state:'unavailable',reason:'source_changed'}}}});if('snapshot' in r)expect(r.snapshot.attention.some(row=>row.ref.id===result.id)).toBe(false);
});
it('communication cap sentinel retains known rows and never claims complete',async()=>{
 const {result,draft}=await publishUpdate('OPTIONAL');
 const [revision]=await db.executor.query<{workspaceId:string;fingerprint:string;observedAt:string}>({text:'SELECT workspace_id AS "workspaceId",audience_fingerprint AS fingerprint,audience_observed_at::text AS "observedAt" FROM communication_revisions WHERE id=$1',values:[result.version]});
 const grants=await db.executor.query<{employeeId:string;provenance:Record<string,unknown>}>({text:'SELECT employee_id AS "employeeId",provenance FROM communication_recipients WHERE revision_id=$1',values:[result.version]});
 expect(grants.some(grant=>grant.employeeId===proof.employee.id)).toBe(true);
 const statements:SqlStatement[]=[];
 for(let n=0;n<100;n++){
  const id=randomUUID(),revisionId=randomUUID();
  statements.push(communicationRootInsert(revision.workspaceId,id,ownerProof.employee.id),
   communicationRevisionInsert({workspaceId:revision.workspaceId,communicationId:id,revisionId,version:1,actorId:ownerProof.employee.id,draft,audienceFingerprint:revision.fingerprint,observedAt:revision.observedAt,publishedAt:revision.observedAt}),
   ...grants.map(grant=>communicationGrantInsert({workspaceId:revision.workspaceId,communicationId:id,revisionId,employeeId:grant.employeeId,contentHash:communicationContentHash(draft),locationId:'loc-1',kind:'LOCATION',observedAt:revision.observedAt,provenance:grant.provenance})),
   {text:"UPDATE communications SET state='PUBLISHED',head_revision_id=$2 WHERE id=$1",values:[id,revisionId]},
   {text:"INSERT INTO communication_lifecycle(id,workspace_id,communication_id,revision_id,actor_employee_id,kind) VALUES($1,$2,$3,$4,$5,'PUBLISHED')",values:[randomUUID(),revision.workspaceId,id,revisionId,ownerProof.employee.id]});
 }
 await db.executor.transaction(statements);
 expect(await q("SELECT count(*)::int AS n FROM communications WHERE state='PUBLISHED'")).toEqual([{n:101}]);
 const r=await home();expect(r).toMatchObject({state:'partial',allSet:false,snapshot:{sources:{communications:{state:'partial',reason:'source_cap'}}}});if('snapshot' in r)expect(r.snapshot.attention.filter(row=>row.ref.kind==='COMMUNICATION')).toHaveLength(100);
},30000);
it('shift reassignment during final Home wait revokes current grant without backfilling the replacement',async()=>{
 const {currentShiftFingerprintSql}=await import('../../lib/data/shift-change-release');
 await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'QAOWNER',clock_timestamp()+interval '1 day')",[ownerProof.sessionTokenHash]);
 const [source]=await q(`SELECT sh.assignment_episode_id::text AS episode,${currentShiftFingerprintSql()} AS fingerprint FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE sh.id=$1`,[fixture.sourceId]) as {episode:string;fingerprint:string}[];
 const draft:CommunicationDraft={type:'SHIFT_NOTE',scope:{kind:'SHIFT',locationId:'loc-1',sourceShiftId:fixture.sourceId,assignmentEpisodeId:source.episode,termsFingerprint:source.fingerprint},title:'Fictional shift update',body:'Private fictional shift context.',acknowledgement:'REQUIRED',expiresAt:null};
 const preview=await previewCommunicationAudience(ownerProof,draft,db.executor);if(preview.state!=='ready')throw Error('No canonical shift audience');
 const result=await executeCommunicationCommand(ownerProof,{kind:'PUBLISH',operationId:randomUUID(),authority:preview.authority,draft,audienceFingerprint:preview.fingerprint},db.executor);if(result.status!=='committed')throw Error('No shift note');
 const initial=await home();if(!('snapshot' in initial))throw Error('No Home');expect(initial.snapshot.attention.some(row=>row.ref.id===result.id)).toBe(true);
 let observations=0;const ex:SqlExecutor={...db.executor,transaction:async(statements,signal)=>{if(statements.some(s=>s.text.includes('home_authority'))&&++observations===2)await q('UPDATE shifts SET employee_id=$1 WHERE id=$2',[fixture.actors[2],fixture.sourceId]);return db.executor.transaction(statements,signal);}};
 const r=await readEmployeeHome(proof,ex);expect(r).toMatchObject({state:'partial',allSet:false,snapshot:{sources:{communications:{state:'unavailable',reason:'source_changed'}}}});if('snapshot' in r)expect(r.snapshot.attention.some(row=>row.ref.id===result.id)).toBe(false);
 expect(await readCommunication(proof,result.id,db.executor)).toMatchObject({state:'unauthorized'});
 expect(await q('SELECT employee_id FROM communication_recipients WHERE communication_id=$1',[result.id])).toEqual([{employee_id:proof.employee.id}]);
});

it('fictional role changes preserve the application row-before-write protocol during a final Home range read',async()=>{
 const reader=new Client({connectionString:db.connectionString});await reader.connect();
 let writing:Promise<unknown>|undefined,sourceFailure:string|null=null;
 try{
  await reader.query("SET deadlock_timeout='50ms'; SET lock_timeout='2000ms'");
  await reader.query('BEGIN');const readerPid=(await reader.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  // The actual Home guards hold this row before their final source-range lock.
  await reader.query('SELECT id FROM employees WHERE id=$1 FOR SHARE',[proof.employee.id]);
  writing=setOwnedEmployeeRole(db.executor,proof.employee.id,'MANAGER').then(()=>null,error=>String(error.code??'unknown'));
  const deadline=Date.now()+2000;let waiting=false;
  while(Date.now()<deadline){
   const rows=await q('SELECT pid FROM pg_stat_activity WHERE $1::integer=ANY(pg_blocking_pids(pid))',[readerPid]);
   if(rows.length){waiting=true;break;}await new Promise(resolve=>setTimeout(resolve,5));
  }
  expect(waiting,'Role writer must actually wait on the Home employee row').toBe(true);
  try{await reader.query('LOCK TABLE employees IN SHARE MODE');}catch(error){sourceFailure=String((error as {code?:string}).code??'unknown');}
  await reader.query('ROLLBACK');
  const writerFailure=await writing;
  expect({sourceFailure,writerFailure}).toEqual({sourceFailure:null,writerFailure:null});
  expect(await q('SELECT role FROM employees WHERE id=$1',[proof.employee.id])).toEqual([{role:'MANAGER'}]);
 }finally{await reader.query('ROLLBACK').catch(()=>{});if(writing)await writing;await reader.end();}
});
