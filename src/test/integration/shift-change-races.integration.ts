import {randomUUID} from 'node:crypto';
import {Client} from 'pg';
import {beforeAll,afterAll,it,expect} from 'vitest';
import {createDisposableExchangeDatabase} from './local-postgres';
import {proof,seedShiftChanges,fixtureShift} from './shift-change-fixture';
import {fixtureProof} from './shift-change-api';
import {executeShiftChange} from '../../lib/data/shift-changes';
import type {SqlExecutor} from '../../lib/notifications/types';
import {readNotificationWeekState} from '../../lib/data/notification-transactions';
let db:Awaited<ReturnType<typeof createDisposableExchangeDatabase>>;
const q=(text:string,values:readonly unknown[]=[])=>db.executor.query<Record<string,unknown>>({text,values});
beforeAll(async()=>{db=await createDisposableExchangeDatabase({mode:'current-runtime'});await seedShiftChanges(db.executor);});
afterAll(async()=>{await db?.dispose();});
let index=0;
async function offered(){const id='race-'+(++index);const terms=await fixtureShift(db.executor,id,'e1',new Date(Date.UTC(2035,9,index+5)).toISOString().slice(0,10));const r=await executeShiftChange(proof('e1'),{kind:'OFFER_COVERAGE',operationId:randomUUID(),...terms},db.executor);expect(r.status).toBe('pending');if(r.status!=='pending')throw new Error(JSON.stringify(r));return {id,terms,requestId:r.requestId,command:{kind:'ACCEPT' as const,requestId:r.requestId,expectedRevision:1,operationId:randomUUID()}};}
async function waitBlocked(client:Client,fragment:string){for(let n=0;n<100;n++){await client.query('SELECT pg_stat_clear_snapshot()');const r=await client.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE $1 AND pid<>pg_backend_pid()",['%'+fragment+'%']);if(r.rowCount)return;await client.query('SELECT pg_sleep(0.005)');}throw new Error('Expected real blocked SQL: '+fragment);}
it('A039 one coverage winner under two transaction connections',async()=>{
 const f=await offered();let n=0;let release!:()=>void;const ready=new Promise<void>(r=>release=r);
 const synchronized:SqlExecutor={query:db.executor.query,transaction:async s=>{if(++n<=2){if(n===2)release();await ready;}return db.executor.transaction(s);}};
 const outcomes=await Promise.all(['e2','e3'].map(id=>executeShiftChange(proof(id),{...f.command,operationId:randomUUID()},synchronized)));
 expect(outcomes.filter(r=>r.status==='completed')).toHaveLength(1);
 expect(await q('SELECT * FROM shift_change_operations WHERE request_id=$1',[f.requestId])).toHaveLength(2);
 expect(await q('SELECT * FROM shift_change_events WHERE request_id=$1',[f.requestId])).toHaveLength(2);
 expect(await q('SELECT * FROM shift_change_participation WHERE shift_id=$1',[f.id])).toHaveLength(0);
});
it.each(['revocation','expiry'] as const)('A043/A047/A068 final specific session %s while acceptance waits for a late lock',async variant=>{
 const f=await offered();const lock=new Client({connectionString:db.connectionString});await lock.connect();await lock.query('BEGIN');await lock.query('LOCK TABLE shift_change_operations IN SHARE MODE');
 const pending=executeShiftChange(proof('e2'),f.command,db.executor);
 try {await waitBlocked(lock,'LOCK TABLE shift_change_operations');if(variant==='revocation')await q('DELETE FROM employee_sessions WHERE token_hash=$1',[proof('e2').sessionTokenHash]);else await q("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE token_hash=$1",[proof('e2').sessionTokenHash]);}finally{await lock.query('ROLLBACK');await lock.end();}
 expect(await pending).toEqual({status:'unavailable'});
 expect((await q('SELECT employee_id FROM shifts WHERE id=$1',[f.id]))[0].employee_id).toBe('e1');
 expect(await q('SELECT * FROM shift_change_operations WHERE operation_id=$1',[f.command.operationId])).toHaveLength(0);
 await q('DELETE FROM employee_sessions WHERE token_hash=$1',[proof('e2').sessionTokenHash]);await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'e2',clock_timestamp()+interval '1 day')",[proof('e2').sessionTokenHash]);
});
it.each(['leave','availability','unpublish','delete','profile','policy','material','assignment'] as const)('A040/A044/A049/A050/A052/A082/A089 input-first %s invalidates a pre-read after real lock wait',async kind=>{
 const f=await offered();await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('race-secondary','loc-2','2035-10-01','PUBLISHED','owner') ON CONFLICT(id) DO NOTHING");const lock=new Client({connectionString:db.connectionString});await lock.connect();await lock.query('BEGIN');await lock.query('SELECT id FROM workspaces FOR NO KEY UPDATE');
 const pending=executeShiftChange(proof('e2'),f.command,db.executor);
 try{
  await waitBlocked(lock,'FROM workspaces');
  if(kind==='assignment')await lock.query("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) SELECT $1,'race-secondary','e2',date,'08:00','16:00' FROM shifts WHERE id=$2",[randomUUID(),f.id]);
  if(kind==='leave')await lock.query("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status) SELECT $1,'e2',date,date,'APPROVED' FROM shifts WHERE id=$2",[randomUUID(),f.id]);
  if(kind==='availability')await lock.query("INSERT INTO availability_exceptions(id,employee_id,date,kind) SELECT $1,'e2',date,'UNAVAILABLE' FROM shifts WHERE id=$2",[randomUUID(),f.id]);
  if(kind==='unpublish')await lock.query("UPDATE schedules SET status='DRAFT' WHERE id='schedule'");
  if(kind==='delete')await lock.query('DELETE FROM shifts WHERE id=$1',[f.id]);
  if(kind==='profile')await lock.query("UPDATE employee_scheduling_settings SET operational_rule_profile=NULL WHERE employee_id='e2'");
  if(kind==='policy')await lock.query("UPDATE workspaces SET shift_change_policy=jsonb_set(shift_change_policy,'{coverage,completionAdvanceMinutes}','525600')");
  if(kind==='material')await lock.query("UPDATE shifts SET start_time='09:00' WHERE id=$1",[f.id]);
  await lock.query('COMMIT');
 }finally{await lock.query('ROLLBACK');await lock.end();}
 const result=await pending;expect(['blocked','unavailable','conflict']).toContain(result.status);
 expect(await q('SELECT * FROM shift_change_operations WHERE operation_id=$1',[f.command.operationId])).toHaveLength(0);
 expect(await q('SELECT * FROM shift_change_events WHERE request_id=$1 AND event_kind=\'COMPLETED\'',[f.requestId])).toHaveLength(0);
 await q("UPDATE schedules SET status='PUBLISHED' WHERE id='schedule'");
 // Independent fictional policy/profile restoration, never revise the tested request.
 const {fictionalProfile}=await import('../fixtures/shift-changes');await q("UPDATE employee_scheduling_settings SET operational_rule_profile=$1 WHERE employee_id='e2'",[JSON.stringify(fictionalProfile())]);await q("UPDATE workspaces SET shift_change_policy=jsonb_set(shift_change_policy,'{coverage,completionAdvanceMinutes}','0')");
});
it.each(['request','assignment','publication','outbox','operation'] as const)('A054 rollback at %s stage keeps all business state unchanged',async stage=>{
 const f=await offered();const before=await readNotificationWeekState(['2035-10-01'],db.executor);
 const match={request:'UPDATE shift_exchanges',assignment:'UPDATE shifts',publication:'INSERT INTO schedule_publication_revisions',outbox:'INSERT INTO notifications',operation:'INSERT INTO shift_change_operations'}[stage];
 const injected:SqlExecutor={query:db.executor.query,transaction:s=>{const n=s.findIndex(x=>x.text.includes(match));expect(n).toBeGreaterThanOrEqual(0);return db.executor.transaction([...s.slice(0,n+1),{text:'SELECT 1/0',values:[]},...s.slice(n+1)]);}};
 await expect(executeShiftChange(proof('e2'),f.command,injected)).rejects.toMatchObject({code:'22012'});
 expect(await readNotificationWeekState(['2035-10-01'],db.executor)).toEqual(before);
 expect(await q('SELECT * FROM shift_change_operations WHERE operation_id=$1',[f.command.operationId])).toHaveLength(0);
 expect(await q('SELECT * FROM shift_change_events WHERE request_id=$1',[f.requestId])).toHaveLength(1);
});
it('A048/A062 lost response reconciles the exact committed operation without duplicate notification',async()=>{
 const f=await offered();const lost:SqlExecutor={query:db.executor.query,transaction:async s=>{await db.executor.transaction(s);throw new Error('Connection closed after commit');}};
 expect(await executeShiftChange(proof('e2'),f.command,lost)).toEqual({status:'outcome-unknown',operationId:f.command.operationId});
 const notifications=await q('SELECT * FROM notifications ORDER BY id');
 expect(await executeShiftChange(proof('e2'),f.command,db.executor)).toMatchObject({status:'completed',revision:2});
 expect(await q('SELECT * FROM notifications ORDER BY id')).toEqual(notifications);
});

async function controlled(){
 const client=new Client({connectionString:db.connectionString});await client.connect();let signal!:()=>void,release!:()=>void;
 const reached=new Promise<void>(r=>signal=r),released=new Promise<void>(r=>release=r);let held=false;
 const executor:SqlExecutor={query:db.executor.query,transaction:async statements=>{await client.query('BEGIN');try{const rows=[];for(const s of statements){rows.push((await client.query(s.text,[...s.values])).rows);if(!held&&s.text.includes('generation_source_conflict')){held=true;signal();await released;}}await client.query('COMMIT');return rows;}catch(e){await client.query('ROLLBACK');throw e;}}};
 return {client,executor,reached,release,close:async()=>{release();await client.end();}};
}
it.each(['leave','availability','profile','policy','material','unpublish','delete','assignment'] as const)('A040/A044/A049/A050/A052/A082/A089 acceptance-first %s writer waits until completed assignment',async kind=>{
 const f=await offered();await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('race-secondary','loc-2','2035-10-01','PUBLISHED','owner') ON CONFLICT(id) DO NOTHING");const held=await controlled();const accepting=executeShiftChange(proof('e2'),f.command,held.executor);
 let writing:Promise<unknown>|undefined;
 try{
  await held.reached;
  const queries={assignment:{text:"INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) SELECT $1,'race-secondary','e2',date,'08:00','16:00' FROM shifts WHERE id=$2",values:[randomUUID(),f.id]},leave:{text:"INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status) SELECT $1,'e2',date,date,'APPROVED' FROM shifts WHERE id=$2",values:[randomUUID(),f.id]},availability:{text:"INSERT INTO availability_exceptions(id,employee_id,date,kind) SELECT $1,'e2',date,'UNAVAILABLE' FROM shifts WHERE id=$2",values:[randomUUID(),f.id]},profile:{text:"UPDATE employee_scheduling_settings SET operational_rule_profile=NULL WHERE employee_id='e2'",values:[]},policy:{text:"UPDATE workspaces SET shift_change_policy=jsonb_set(shift_change_policy,'{coverage,mode}','\"MANAGER_REVIEW\"')",values:[]},material:{text:"UPDATE shifts SET start_time='09:00' WHERE id=$1",values:[f.id]},unpublish:{text:"UPDATE schedules SET status='DRAFT' WHERE id='schedule'",values:[]},delete:{text:'DELETE FROM shifts WHERE id=$1',values:[f.id]}}[kind];
  writing=db.executor.query(queries);await waitBlocked(held.client,queries.text.slice(0,20));held.release();
  expect(await accepting).toMatchObject({status:'completed'});await writing;
  expect(await q('SELECT * FROM shift_change_operations WHERE operation_id=$1',[f.command.operationId])).toHaveLength(1);
  expect(await q("SELECT * FROM shift_change_events WHERE request_id=$1 AND event_kind='COMPLETED'",[f.requestId])).toHaveLength(1);
 }finally{held.release();await accepting;await writing;await held.close();}
 await q("UPDATE schedules SET status='PUBLISHED' WHERE id='schedule'");const {fictionalProfile}=await import('../fixtures/shift-changes');await q("UPDATE employee_scheduling_settings SET operational_rule_profile=$1 WHERE employee_id='e2'",[JSON.stringify(fictionalProfile())]);await q("UPDATE workspaces SET shift_change_policy=jsonb_set(shift_change_policy,'{coverage,mode}','\"AUTOMATIC_WHEN_VALID\"')");
});
it.each(['acceptance-first','manual-first'] as const)('A051 actual manual material writer and acceptance share compatible lock order: %s',async order=>{
 const {updateShift}=await import('./management-api');const f=await offered();
 const [before]=await q('SELECT date::text FROM shifts WHERE id=$1',[f.id]);
 const edit=(executor:SqlExecutor)=>updateShift({shiftId:f.id,employeeId:'e1',date:String(before.date),startTime:'09:00',endTime:'16:00',actorEmployeeId:'owner'},executor);
 const held=await controlled();
 if(order==='acceptance-first'){
  const accepting=executeShiftChange(proof('e2'),f.command,held.executor);let editing:Promise<unknown>|undefined;
  try{await held.reached;editing=edit(db.executor);await waitBlocked(held.client,'FROM workspaces');held.release();expect(await accepting).toMatchObject({status:'completed'});expect(await editing).toBe(true);}finally{held.release();await accepting;await editing;await held.close();}
  expect((await q('SELECT assignment_episode_id FROM shifts WHERE id=$1',[f.id]))[0].assignment_episode_id).not.toBe(f.terms.sourceEpisodeId);
 }else{
  // Pause the actual publication writer after its initial workspace row lock.
  const client=held.client;let signal!:()=>void,release!:()=>void;const reached=new Promise<void>(r=>signal=r),done=new Promise<void>(r=>release=r);let once=true;
  const executor:SqlExecutor={query:db.executor.query,transaction:async s=>{await client.query('BEGIN');try{const results=[];for(const x of s){results.push((await client.query(x.text,[...x.values])).rows);if(once&&x.text.includes('FROM workspaces')&&x.text.includes('FOR NO KEY UPDATE')){once=false;signal();await done;}}await client.query('COMMIT');return results;}catch(e){await client.query('ROLLBACK');throw e;}}};
  const editing=edit(executor);let accepting:ReturnType<typeof executeShiftChange>|undefined;
  try{await Promise.race([reached,editing.then(()=>{throw Error('Manual writer completed before workspace lock barrier');})]);accepting=executeShiftChange(proof('e2'),f.command,db.executor);await waitBlocked(client,'FROM workspaces');release();expect(await editing).toBe(true);expect((await accepting).status).toBe('blocked');}finally{release();await editing;await accepting;await held.close();}
 }
});
it('A057 bounded conflicts retry three times; provenance corruption rolls back',async()=>{
 const f=await offered();let attempts=0;const corrupt:SqlExecutor={query:db.executor.query,transaction:s=>{attempts++;const n=s.findIndex(x=>x.text.includes('shift_change_after_conflict'));return db.executor.transaction([...s.slice(0,n),{text:"UPDATE shifts SET assignment_origin='GENERATED',generated_claims=$2::jsonb WHERE id=$1",values:[f.id,JSON.stringify({version:1,claims:[{kind:'LEAD',quantity:1,configuredCapacity:1,needKey:'v1:'+('a'.repeat(64)),needStart:'2035-10-01T08:00',needEnd:'2035-10-01T16:00',coveredStart:'2035-10-01T08:00',coveredEnd:'2035-10-01T16:00'}]})]},...s.slice(n)]);}};
 expect(await executeShiftChange(proof('e2'),f.command,corrupt)).toEqual({status:'conflict'});expect(attempts).toBe(3);
 expect((await q('SELECT employee_id FROM shifts WHERE id=$1',[f.id]))[0].employee_id).toBe('e1');
 expect(await q('SELECT * FROM shift_change_operations WHERE operation_id=$1',[f.command.operationId])).toHaveLength(0);
});
it.each(['generation','exclusion'].flatMap(writer=>['command-first','writer-first'].map(order=>({writer,order}))))('A054/A081 $writer and command in $order use compatible actual writer locks',async({writer,order})=>{
 const {generateWeekDraft}=await import('../../lib/data/schedule-generation');const {deleteGeneratedDraftShift}=await import('./management-api');
 const f=await offered();const week=new Date(Date.UTC(2035,11,3+7*index)).toISOString().slice(0,10);
 await q("INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('generation-window','loc-2',1,'08:00','12:00') ON CONFLICT(id) DO NOTHING");
 const request={proof:await fixtureProof(db.executor,'owner'),workspaceId:'workspace-fuel',actorEmployeeId:'owner',weekStart:week,mode:'BUILD_WEEK' as const,locationScope:{kind:'SELECTED' as const,locationIds:['loc-2']}};
 let generatedId:string|undefined;
 if(writer==='exclusion') {expect((await generateWeekDraft(request,db.executor)).summary.added).toBe(1);generatedId=String((await q('SELECT sh.id FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE s.week_start=$1 AND s.location_id=\'loc-2\'',[week]))[0].id);}
 const runWriter=(executor:SqlExecutor)=>writer==='generation'?generateWeekDraft(request,executor):deleteGeneratedDraftShift({workspaceId:'workspace-fuel',actorEmployeeId:'owner',weekStart:week,locationId:'loc-2',shiftId:generatedId!},executor);
 const held=await controlled();const first=order==='command-first'?executeShiftChange(proof('e2'),f.command,held.executor):runWriter(held.executor);let second:Promise<unknown>|undefined;
 try {
  await held.reached;second=order==='command-first'?runWriter(db.executor):executeShiftChange(proof('e2'),f.command,db.executor);
  await waitBlocked(held.client,'FROM workspaces');held.release();
  const [a,b]=await Promise.all([first,second]);expect(order==='command-first'?a:b).toMatchObject({status:'completed'});
  expect(order==='command-first'?b:a).toMatchObject(writer==='generation'?{summary:{added:1}}:{status:'deleted'});
 }finally{held.release();await first;await second;await held.close();}
 const rows=await q('SELECT * FROM schedule_generation_exclusions WHERE week_start=$1',[week]);expect(rows).toHaveLength(writer==='exclusion'?1:0);if(rows.length)expect(rows[0].cleared_at).toBeNull();
 expect((await q('SELECT employee_id,assignment_origin FROM shifts WHERE id=$1',[f.id]))[0]).toEqual({employee_id:'e2',assignment_origin:'MANAGER'});
});
it('A039/A081 crossed source/target proposals have a single participation winner on real concurrent connections',async()=>{
 const f=await offered();await executeShiftChange(proof('e1'),{kind:'CANCEL',operationId:randomUUID(),requestId:f.requestId,expectedRevision:1},db.executor);
 const other=await fixtureShift(db.executor,'crossed-target','e3','2036-01-01');let n=0,release!:()=>void;const gate=new Promise<void>(r=>release=r);
 const executor:SqlExecutor={query:db.executor.query,transaction:async s=>{if(++n<=2){if(n===2)release();await gate;}return db.executor.transaction(s);}};
 const results=await Promise.all([{actor:'e1',a:f.terms,b:other},{actor:'e3',a:other,b:f.terms}].map(({actor,a,b})=>executeShiftChange(proof(actor),{kind:'PROPOSE_SWAP',operationId:randomUUID(),...a,targetShiftId:b.sourceShiftId,targetEpisodeId:b.sourceEpisodeId,targetTermsFingerprint:b.sourceTermsFingerprint},executor)));
 expect(results.filter(x=>x.status==='pending')).toHaveLength(1);expect(results.filter(x=>x.status==='conflict')).toHaveLength(1);
 const reservations=await q('SELECT exchange_id,role FROM shift_change_participation WHERE shift_id=ANY($1)',[[f.id,other.sourceShiftId]]);expect(reservations).toHaveLength(2);expect(new Set(reservations.map(x=>x.exchange_id)).size).toBe(1);
});
it.each(['revocation','expiry'] as const)('A043 acceptance-first specific session %s waits for the completed transaction',async variant=>{
 const f=await offered(),held=await controlled();const accepting=executeShiftChange(proof('e2'),f.command,held.executor);let change:Promise<unknown>|undefined;
 try {
  await held.reached;
  const statement=variant==='revocation'?'DELETE FROM employee_sessions WHERE token_hash=$1':"UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE token_hash=$1";
  change=q(statement,[proof('e2').sessionTokenHash]);await waitBlocked(held.client,statement.slice(0,30));held.release();
  expect(await accepting).toMatchObject({status:'completed'});await change;
  expect(await executeShiftChange(proof('e2'),f.command,db.executor)).toEqual({status:'unavailable'});
  expect(await q('SELECT * FROM shift_change_operations WHERE operation_id=$1',[f.command.operationId])).toHaveLength(1);
 } finally {held.release();await accepting;await change;await held.close();}
 await q('DELETE FROM employee_sessions WHERE token_hash=$1',[proof('e2').sessionTokenHash]);await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'e2',clock_timestamp()+interval '1 day')",[proof('e2').sessionTokenHash]);
});
it('A043 natural session expiry after the first authority guard rolls back all subsequent business work',async()=>{
 const f=await offered();await q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '1 second' WHERE token_hash=$1",[proof('e2').sessionTokenHash]);
 const held=await controlled(),before=await readNotificationWeekState(['2035-10-01'],db.executor);const accepting=executeShiftChange(proof('e2'),f.command,held.executor);
 try {await held.reached;await held.client.query('SELECT pg_sleep(1.1)');held.release();expect(await accepting).toEqual({status:'unavailable'});}finally{held.release();await accepting;await held.close();}
 expect(await readNotificationWeekState(['2035-10-01'],db.executor)).toEqual(before);
 expect(await q('SELECT * FROM shift_change_operations WHERE operation_id=$1',[f.command.operationId])).toHaveLength(0);
 await q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '1 day' WHERE token_hash=$1",[proof('e2').sessionTokenHash]);
});
