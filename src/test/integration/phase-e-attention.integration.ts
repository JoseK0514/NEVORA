import {afterEach,beforeEach,expect,it} from 'vitest';
import {Client} from 'pg';
import {readFile} from 'node:fs/promises';
import {createDisposableFoundationDatabase} from './local-postgres';
import {seedOwnedApp} from './owned-app-fixture';
import {acknowledgeScheduleWeek} from '../../lib/data/acknowledgements';
import {readEmployeeWeeklyReview} from '../../lib/data/employee-weekly-review.server';
import {attentionIntent,readEmployeeAttentionDetail,recordEmployeeAttentionReceipt} from '../../lib/data/employee-attention-receipts.server';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import type {AttentionRef} from '../../lib/employee-attention/types';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
let db:Awaited<ReturnType<typeof createDisposableFoundationDatabase>>,proof:SessionMutationProof;
const week='2030-10-07',actor='QAEMP',ref:AttentionRef={kind:'TIME_OFF',id:'leave',version:''};
const q=(text:string,values:unknown[]=[])=>db.executor.query({text,values});
async function publish(n:number,start='08:00'){
 await q("UPDATE shifts SET start_time=$1 WHERE id='attention-shift'",[start]);
 await q("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES($1,$2,$3,'PUBLISH','QAOWNER')",['revision-'+n,week,n]);
 await q(`INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,is_designated_lead,is_callout_approved)
  SELECT $1||sh.id,$1,sh.id,sh.schedule_id,s.location_id,sh.employee_id,sh.date,sh.start_time,sh.end_time,sh.is_designated_lead,false FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE sh.id='attention-shift'`,['revision-'+n]);
}
async function reviewed(executor:SqlExecutor=db.executor){const review=await readEmployeeWeeklyReview(proof,week,executor);expect(review.state).toBe('published');expect(review.intent).not.toBeNull();return {proof,weekStart:week,expectedRevisionId:review.displayedRevisionId!,...review.intent!};}
async function detailCommand(){const detail=await readEmployeeAttentionDetail(proof,ref,db.executor);expect(detail.state).toBe('ready');if(detail.state!=='ready'||!detail.intent)throw Error('Expected actual detail');return {kind:'MARK_READ' as const,ref:detail.ref,...detail.intent};}
beforeEach(async()=>{
 db=await createDisposableFoundationDatabase({mode:'current-runtime'});await seedOwnedApp(db.executor);
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('QAEMP','Fictional','Self','555-0199','EMPLOYEE','loc-1')");
 await q("INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('QAEMP','loc-1')");
 await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('b',64),'QAEMP',clock_timestamp()+interval '1 day')");
 proof={employee:{id:actor,firstName:'Fictional',lastName:'Self',role:'EMPLOYEE',primaryLocationId:'loc-1'},sessionTokenHash:'b'.repeat(64)};
 await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('attention-schedule','loc-1',$1,'PUBLISHED','QAOWNER')",[week]);
 await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('attention-shift','attention-schedule','QAEMP',$1,'08:00','16:00')",[week]);
 await publish(1);
 await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status,reason) VALUES('leave','QAEMP','2030-11-01','2030-11-01','APPROVED','Fictional private reason')");
});
afterEach(async()=>{await db?.dispose();});
it('unseen_republish_conflicts',async()=>{const input=await reviewed();await publish(2,'09:00');expect(await acknowledgeScheduleWeek(input,db.executor)).toEqual({status:'conflict',reason:'source_changed'});expect(await q('SELECT * FROM schedule_acknowledgements')).toEqual([]);});
it('expired_after_week_lock_denied',async()=>{
 const input=await reviewed(),blocker=new Client({connectionString:db.connectionString});await blocker.connect();
 try{await blocker.query('BEGIN');
 // Use the actual application's exact lock statement, rather than a parallel key.
 const {scheduleWeekLockStatements}=await import('../../lib/data/notification-transactions');for(const s of scheduleWeekLockStatements([week]))await blocker.query(s.text,[...s.values]);
 await q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '250 milliseconds' WHERE employee_id='QAEMP'");
 let done=false;const pending=acknowledgeScheduleWeek(input,db.executor).finally(()=>{done=true;});await new Promise(r=>setTimeout(r,400));expect(done).toBe(false);await blocker.query('COMMIT');
 expect(await pending).toMatchObject({status:'blocked'});expect(await q('SELECT * FROM schedule_acknowledgements')).toEqual([]);
 }finally{await blocker.query('ROLLBACK');await blocker.end();}
});
it('replaced_cookie_cannot_ack_old_tab',async()=>{const input=await reviewed();await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('c',64),'QAEMP',now()+interval '1 day')");expect(await acknowledgeScheduleWeek({...input,proof:{...proof,sessionTokenHash:'c'.repeat(64)}},db.executor)).toEqual({status:'blocked',reason:'review_authority'});});
it('same_operation_same_receipt under concurrent real SQL and no duplicate history',async()=>{const input=await reviewed();const results=await Promise.all([acknowledgeScheduleWeek(input,db.executor),acknowledgeScheduleWeek(input,db.executor)]);expect(results[0]).toMatchObject({status:'committed'});expect(results[1]).toEqual(results[0]);expect((await q('SELECT * FROM employee_attention_operations')).length).toBe(1);});
it('changed_operation_conflict immutable payload despite a valid server intent',async()=>{const input=await reviewed();expect((await acknowledgeScheduleWeek(input,db.executor)).status).toBe('committed');await publish(2,'09:00');const workspace=(await q('SELECT id FROM workspaces'))[0] as {id:string};const changed=attentionIntent(proof,workspace.id,'CONFIRM_WEEK',{kind:'SCHEDULE',id:week,version:'revision-2'},input.operationId);expect(await acknowledgeScheduleWeek({...input,expectedRevisionId:'revision-2',...changed},db.executor)).toEqual({status:'conflict',reason:'operation_payload_changed'});});
it('required_action_cannot_mark_read_to_complete',async()=>{const workspace=(await q('SELECT id FROM workspaces'))[0] as {id:string};const scheduleRef={kind:'SCHEDULE' as const,id:week,version:'revision-1'};const intent=attentionIntent(proof,workspace.id,'MARK_READ',scheduleRef);expect(await recordEmployeeAttentionReceipt(proof,{kind:'MARK_READ',ref:scheduleRef,...intent},db.executor)).toEqual({status:'blocked',reason:'required_action'});expect(await q('SELECT * FROM schedule_acknowledgements')).toEqual([]);});
it('new_version_resurfaces for same-status reason and optional time-term edits',async()=>{
 const command=await detailCommand();expect(await recordEmployeeAttentionReceipt(proof,command,db.executor)).toMatchObject({status:'committed',version:command.ref.version});expect(await readEmployeeAttentionDetail(proof,ref,db.executor)).toMatchObject({state:'ready',read:true});
 await q("UPDATE time_off_requests SET start_time='08:00',end_time='10:00' WHERE id='leave'");const changed=await readEmployeeAttentionDetail(proof,ref,db.executor);expect(changed).toMatchObject({state:'ready',read:false});if(changed.state==='ready')expect(changed.ref.version).not.toBe(command.ref.version);
 const next=await detailCommand();await q("UPDATE time_off_requests SET reason='Same status edited detail' WHERE id='leave'");expect(await recordEmployeeAttentionReceipt(proof,next,db.executor)).toEqual({status:'conflict',reason:'source_changed'});
});
it('equivalent_own_shifts_keep_ack but changed own terms require review',async()=>{expect((await acknowledgeScheduleWeek(await reviewed(),db.executor)).status).toBe('committed');await publish(2);expect((await readEmployeeWeeklyReview(proof,week,db.executor)).acknowledgement).toMatchObject({acknowledged:true,needsAcknowledgement:false});await publish(3,'10:00');expect((await readEmployeeWeeklyReview(proof,week,db.executor)).acknowledgement).toMatchObject({acknowledged:false,needsAcknowledgement:true});});
it('authorized detail plus explicit Mark read only; duplicate source receipts harmless; another actor/session denied',async()=>{
 await readEmployeeAttentionDetail(proof,ref,db.executor);expect(await q('SELECT * FROM employee_attention_receipts')).toEqual([]);
 const command=await detailCommand(),result=await recordEmployeeAttentionReceipt(proof,command,db.executor);expect(result.status).toBe('committed');expect(await recordEmployeeAttentionReceipt(proof,command,db.executor)).toEqual(result);
 const second=await recordEmployeeAttentionReceipt(proof,await detailCommand(),db.executor);expect(second).toMatchObject({status:'committed',id:result.status==='committed'?result.id:''});expect((await q('SELECT * FROM employee_attention_receipts')).length).toBe(1);
 expect((await recordEmployeeAttentionReceipt({...proof,sessionTokenHash:'c'.repeat(64)},command,db.executor)).status).toBe('blocked');
});
it('outcome_unknown recovers original operation after committed response loss',async()=>{const input=await reviewed();let lost=false;const executor={...db.executor,transaction:async(statements:readonly SqlStatement[],signal?:AbortSignal)=>{const result=await db.executor.transaction(statements,signal);if(statements.some(s=>s.text.includes('INSERT INTO employee_attention_operations'))&&!lost){lost=true;throw Error('Fictional response lost after commit');}return result;}};
 expect(await acknowledgeScheduleWeek(input,executor)).toEqual({status:'outcome_unknown',operationId:input.operationId});expect(await acknowledgeScheduleWeek(input,db.executor)).toMatchObject({status:'committed',operationId:input.operationId});expect((await q('SELECT * FROM employee_attention_operations')).length).toBe(1);
});
it('write fault rolls back canonical ack, operation and reminder cancellation together',async()=>{const input=await reviewed();const executor={...db.executor,transaction:async(statements:readonly SqlStatement[],signal?:AbortSignal)=>db.executor.transaction(statements.some(s=>s.text.includes('INSERT INTO schedule_acknowledgements'))?[...statements,{text:"SELECT 'fault'::integer",values:[]}]:statements,signal)};
 expect((await acknowledgeScheduleWeek(input,executor)).status).toBe('outcome_unknown');expect(await q('SELECT * FROM schedule_acknowledgements')).toEqual([]);expect(await q('SELECT * FROM employee_attention_operations')).toEqual([]);expect((await acknowledgeScheduleWeek(input,db.executor)).status).toBe('committed');
});
it('weekly source changes or location authority lost after observation expose no stale rows or intent',async()=>{
 let observed=false;const executor={...db.executor,transaction:async(statements:readonly SqlStatement[],signal?:AbortSignal)=>{if(statements.some(s=>s.text.startsWith('WITH allowed AS MATERIALIZED'))){if(observed)await q("UPDATE locations SET active=false WHERE id='loc-1'");observed=true;}return db.executor.transaction(statements,signal);}};
 expect(await readEmployeeWeeklyReview(proof,week,executor)).toMatchObject({state:'unavailable',shifts:[],intent:null,displayedRevisionId:null});
});
it('COMMUNICATION producer unavailable and live EXCHANGE cannot gain Mark read authority',async()=>{
 expect(await readEmployeeAttentionDetail(proof,{kind:'COMMUNICATION',id:'future',version:'1'},db.executor)).toEqual({state:'unavailable'});
 expect(await readEmployeeAttentionDetail(proof,{kind:'EXCHANGE',id:'not-own',version:'1'},db.executor)).toEqual({state:'unavailable'});
});
it('additive migration rollback leaves canonical acknowledgement and history intact',async()=>{
 expect((await acknowledgeScheduleWeek(await reviewed(),db.executor)).status).toBe('committed');const before=await q('SELECT * FROM schedule_acknowledgements'),history=await q('SELECT * FROM schedule_publication_revision_shifts');
 await q('DROP TABLE employee_attention_operations; DROP TABLE employee_attention_receipts; DROP FUNCTION nevora_attention_append_only()');
 expect(await q('SELECT * FROM schedule_acknowledgements')).toEqual(before);expect(await q('SELECT * FROM schedule_publication_revision_shifts')).toEqual(history);
 await q(await readFile('db/migrations/0023_employee_attention_receipts.sql','utf8'));expect(await q('SELECT * FROM schedule_acknowledgements')).toEqual(before);
});
