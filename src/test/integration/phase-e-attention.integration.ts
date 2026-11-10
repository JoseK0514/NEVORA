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

it('informational schedule receipt follows equivalent canonical acknowledgement and never replaces it',async()=>{
 expect((await acknowledgeScheduleWeek(await reviewed(),db.executor)).status).toBe('committed');await publish(2);
 const read=await readEmployeeAttentionDetail(proof,{kind:'SCHEDULE',id:week,version:''},db.executor);expect(read).toMatchObject({state:'ready',read:false});
 if(read.state!=='ready'||!read.intent)throw Error('Expected current informational weekly intent');
 const before=await q('SELECT * FROM schedule_acknowledgements');expect((await recordEmployeeAttentionReceipt(proof,{kind:'MARK_READ',ref:read.ref,...read.intent},db.executor)).status).toBe('committed');expect(await q('SELECT * FROM schedule_acknowledgements')).toEqual(before);
 expect(await readEmployeeAttentionDetail(proof,{kind:'SCHEDULE',id:week,version:''},db.executor)).toMatchObject({state:'ready',read:true});
});

it('weekly source delayed after final session check must not release rows after expiry',async()=>{
 const blocker=new Client({connectionString:db.connectionString});await blocker.connect();let reads=0,release:ReturnType<typeof setTimeout>|undefined;
 try{
 const executor={...db.executor,transaction:async(statements:readonly SqlStatement[],signal?:AbortSignal)=>{
  if(statements.some(s=>s.text.startsWith('WITH allowed AS MATERIALIZED'))&&++reads===2){
   await blocker.query('BEGIN');await blocker.query('LOCK TABLE schedule_publication_revisions IN ACCESS EXCLUSIVE MODE');
   await q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '250 milliseconds' WHERE employee_id='QAEMP'");
   release=setTimeout(()=>{void blocker.query('COMMIT');},400);
  }
  return db.executor.transaction(statements,signal);
 }};
 expect(await readEmployeeWeeklyReview(proof,week,executor)).toMatchObject({state:'unavailable',shifts:[],intent:null});
 }finally{if(release)clearTimeout(release);await blocker.query('ROLLBACK');await blocker.end();}
});
it('live EXCHANGE has no read intent; terminal participant version can be read and changed revision resurfaces',async()=>{
 await q("INSERT INTO shift_exchanges(id,kind,source_shift_id,requested_by_employee_id,status,legacy_manual) VALUES('attention-exchange','COVERAGE','attention-shift','QAEMP','OPEN',false)");
 const exchangeRef:AttentionRef={kind:'EXCHANGE',id:'attention-exchange',version:'r:1'};
 expect(await readEmployeeAttentionDetail(proof,exchangeRef,db.executor)).toMatchObject({state:'ready',intent:null,read:false});
 const workspace=(await q('SELECT id FROM workspaces'))[0] as {id:string};
 expect(await recordEmployeeAttentionReceipt(proof,{kind:'MARK_READ',ref:exchangeRef,...attentionIntent(proof,workspace.id,'MARK_READ',exchangeRef)},db.executor)).toEqual({status:'blocked',reason:'required_action'});
 expect((await q("SELECT status FROM shift_exchanges WHERE id='attention-exchange'"))[0]).toEqual({status:'OPEN'});
 await q("UPDATE shift_exchanges SET status='CANCELLED' WHERE id='attention-exchange'");
 const read=await readEmployeeAttentionDetail(proof,exchangeRef,db.executor);expect(read).toMatchObject({state:'ready',ref:{version:'r:2'},read:false});if(read.state!=='ready'||!read.intent)throw Error('Missing terminal intent');
 expect((await recordEmployeeAttentionReceipt(proof,{kind:'MARK_READ',ref:read.ref,...read.intent},db.executor)).status).toBe('committed');
 await q("UPDATE shift_exchanges SET outcome_reason='Updated terminal explanation' WHERE id='attention-exchange'");expect(await readEmployeeAttentionDetail(proof,exchangeRef,db.executor)).toMatchObject({state:'ready',ref:{version:'r:3'},read:false});
 expect(await recordEmployeeAttentionReceipt(proof,{kind:'MARK_READ',ref:read.ref,...attentionIntent(proof,workspace.id,'MARK_READ',read.ref)},db.executor)).toEqual({status:'conflict',reason:'source_changed'});
 await q("UPDATE shift_exchanges SET legacy_manual=true WHERE id='attention-exchange'");expect(await readEmployeeAttentionDetail(proof,exchangeRef,db.executor)).toEqual({state:'unavailable'});
});
it('own TIME_CORRECTION detail uses append-only event revision; new decision resurfaces and foreign source is denied',async()=>{
 const workspace=(await q('SELECT id FROM workspaces'))[0] as {id:string},id='11111111-1111-4111-8111-111111111111';
 await q(`INSERT INTO time_correction_requests(id,workspace_id,employee_id,requested_by_employee_id,kind,location_id,source_revision,source_snapshot,proposal,reason,request_hash)
 VALUES($1,$2,'QAEMP','QAEMP','MISSING_ENTRY','loc-1',0,'{}','{"startAt":"2030-10-07T12:00:00Z","endAt":"2030-10-07T20:00:00Z"}','Fictional correction',repeat('f',64))`,[id,workspace.id]);
 await q("INSERT INTO time_correction_events(id,request_id,revision,event_kind,actor_employee_id,operation_hash,result) VALUES('22222222-2222-4222-8222-222222222222',$1,1,'REQUESTED','QAEMP',repeat('f',64),'{}')",[id]);
 const correctionRef:AttentionRef={kind:'TIME_CORRECTION',id,version:''},read=await readEmployeeAttentionDetail(proof,correctionRef,db.executor);expect(read).toMatchObject({state:'ready',ref:{version:'r:1'},read:false});if(read.state!=='ready'||!read.intent)throw Error('Missing correction intent');
 expect((await recordEmployeeAttentionReceipt(proof,{kind:'MARK_READ',ref:read.ref,...read.intent},db.executor)).status).toBe('committed');
 await q("INSERT INTO time_correction_events(id,request_id,revision,event_kind,actor_employee_id,operation_hash,result,decision_note) VALUES('33333333-3333-4333-8333-333333333333',$1,2,'REJECTED','QAOWNER',repeat('e',64),'{}','Fictional decision')",[id]);
 expect(await readEmployeeAttentionDetail(proof,correctionRef,db.executor)).toMatchObject({state:'ready',ref:{version:'r:2'},read:false});
 expect(await recordEmployeeAttentionReceipt(proof,{kind:'MARK_READ',ref:read.ref,...attentionIntent(proof,workspace.id,'MARK_READ',read.ref)},db.executor)).toEqual({status:'conflict',reason:'source_changed'});
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('QAOTHER','Fictional','Other','555-0198','EMPLOYEE','loc-1');INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),'QAOTHER',now()+interval '1 day')");
 const other={...proof,employee:{...proof.employee,id:'QAOTHER'},sessionTokenHash:'d'.repeat(64)};
 expect(await readEmployeeAttentionDetail(other,correctionRef,db.executor)).toEqual({state:'unavailable'});expect(await readEmployeeAttentionDetail(other,ref,db.executor)).toEqual({state:'unavailable'});
 expect(await recordEmployeeAttentionReceipt(other,{kind:'MARK_READ',ref:read.ref,...read.intent},db.executor)).toEqual({status:'blocked',reason:'review_authority'});
});

async function removeOwnAssignments(n=2){
 await q("DELETE FROM shifts WHERE id='attention-shift'");
 await publish(n);
}
it('a relevant removal-to-empty week confirms the displayed current revision and replays one receipt',async()=>{
 expect((await acknowledgeScheduleWeek(await reviewed(),db.executor)).status).toBe('committed');
 const history=await q('SELECT * FROM schedule_publication_revision_shifts ORDER BY id');
 await removeOwnAssignments();const review=await readEmployeeWeeklyReview(proof,week,db.executor);
 expect(review.shifts).toEqual([]);expect(review.acknowledgement.needsAcknowledgement).toBe(true);expect(review.intent).not.toBeNull();
 const command=await reviewed();const results=await Promise.all([acknowledgeScheduleWeek(command,db.executor),acknowledgeScheduleWeek(command,db.executor)]);
 expect(results[0]).toMatchObject({status:'committed',version:'revision-2'});expect(results[1]).toEqual(results[0]);
 expect(await q('SELECT * FROM schedule_publication_revision_shifts ORDER BY id')).toEqual(history);
 expect(await q('SELECT publication_revision_id FROM schedule_acknowledgements')).toEqual([{publication_revision_id:'revision-2'}]);
 expect((await q('SELECT * FROM employee_attention_operations')).length).toBe(2);
 const confirmed=await readEmployeeWeeklyReview(proof,week,db.executor);expect(confirmed.acknowledgement).toMatchObject({acknowledged:true,needsAcknowledgement:false});
 expect(confirmed.readIntent).not.toBeNull();
});
it('an unrelated empty published week grants neither confirmation nor informational read authority',async()=>{
 await q("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES('unrelated-empty','2030-10-14',1,'PUBLISH','QAOWNER')");
 const review=await readEmployeeWeeklyReview(proof,'2030-10-14',db.executor);expect(review.intent).toBeNull();expect(review.readIntent).toBeNull();expect(review.acknowledgement.needsAcknowledgement).toBe(false);
 const workspace=(await q('SELECT id FROM workspaces'))[0] as {id:string};const unrelated={kind:'SCHEDULE' as const,id:'2030-10-14',version:'unrelated-empty'};
 expect(await acknowledgeScheduleWeek({proof,weekStart:unrelated.id,expectedRevisionId:unrelated.version,...attentionIntent(proof,workspace.id,'CONFIRM_WEEK',unrelated)},db.executor)).toMatchObject({status:'unavailable'});
 expect(await q('SELECT * FROM schedule_acknowledgements')).toEqual([]);
});
it('removal-to-empty review still conflicts after a newer empty publication',async()=>{
 await removeOwnAssignments();const input=await reviewed();await publish(3);
 expect(await acknowledgeScheduleWeek(input,db.executor)).toMatchObject({status:'conflict'});expect(await q('SELECT * FROM schedule_acknowledgements')).toEqual([]);
});
it('removal-to-empty review denies a revoked session and commits no acknowledgement',async()=>{
 await removeOwnAssignments();const input=await reviewed();await q("DELETE FROM employee_sessions WHERE employee_id='QAEMP'");
 expect(await acknowledgeScheduleWeek(input,db.executor)).toMatchObject({status:'blocked'});expect(await q('SELECT * FROM schedule_acknowledgements')).toEqual([]);
});
it('weekly employee detail retains the captured position after the catalog name changes',async()=>{
 await q("INSERT INTO positions(id,workspace_id,name) VALUES('historical-position','workspace-fuel','New catalog label')");
 await q("UPDATE schedule_publication_revision_shifts SET position_id='historical-position',position_name='Barista at publication' WHERE revision_id='revision-1'");
 const review=await readEmployeeWeeklyReview(proof,week,db.executor);expect(review.shifts[0]).toMatchObject({positionId:'historical-position',positionName:'Barista at publication'});
});

it('retains the exact displayed own changes and canonical acknowledgement time after confirmation and replay',async()=>{
 expect((await acknowledgeScheduleWeek(await reviewed(),db.executor)).status).toBe('committed');
 await publish(2,'09:00');const before=await readEmployeeWeeklyReview(proof,week,db.executor);
 expect(before.publicationChanges.length).toBeGreaterThan(0);const input=await reviewed();
 const result=await acknowledgeScheduleWeek(input,db.executor);expect(result.status).toBe('committed');
 expect(Object.keys(result).sort()).toEqual(['id','operationId','status','version']);
 const confirmed=await readEmployeeWeeklyReview(proof,week,db.executor);
 expect(confirmed.publicationChanges).toEqual(before.publicationChanges);
 const [ack]=await q('SELECT acknowledged_at::text AS acknowledged_at FROM schedule_acknowledgements WHERE employee_id=$1',[actor]);
 expect(confirmed.acknowledgement.acknowledgedAt).toBe(new Date(String(ack.acknowledged_at)).toISOString());
 expect(await acknowledgeScheduleWeek(input,db.executor)).toEqual(result);
 await publish(3,'10:00');const newer=await readEmployeeWeeklyReview(proof,week,db.executor);
 expect(newer.acknowledgement.needsAcknowledgement).toBe(true);expect(newer.publicationChanges).not.toEqual(before.publicationChanges);
});

it('action request facts name only an active current counterpart and withhold stale swap terms',async()=>{
 const {withActionRequestFacts}=await import('../../lib/data/action-request-facts.server');
 const {currentShiftTermsSql}=await import('../../lib/data/shift-change-release');
 const {getWorkspace}=await import('../../lib/data/workspaces');
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('QAPEER','Ana','Example','555-0188','EMPLOYEE','loc-1')");
 await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('peer-shift','attention-schedule','QAPEER',$1,'16:00','20:00')",[week]);
 await q(`INSERT INTO shift_exchanges(id,kind,source_shift_id,requested_by_employee_id,target_employee_id,target_shift_id,status,legacy_manual,source_terms,target_terms)
 SELECT 'fact-swap','SWAP',s.id,s.employee_id,ts.employee_id,ts.id,'EMPLOYEE_PENDING',false,${currentShiftTermsSql('s','sc')},${currentShiftTermsSql('ts','tsc')}
 FROM shifts s JOIN schedules sc ON sc.id=s.schedule_id CROSS JOIN shifts ts JOIN schedules tsc ON tsc.id=ts.schedule_id WHERE s.id='attention-shift' AND ts.id='peer-shift'`);
 await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('a',64),'QAOWNER',clock_timestamp()+interval '1 hour')");
 const owner={employee:{id:'QAOWNER',role:'OWNER',firstName:'Fictional',lastName:'Owner',primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)} as SessionMutationProof;
 const items=[{id:'EXCHANGE:fact-swap',type:'EXCHANGE'}] as Parameters<typeof withActionRequestFacts>[2],workspace=await getWorkspace(db.executor);
 expect((await withActionRequestFacts(owner,workspace,items,db.executor))[0].request).toMatchObject({counterpartName:'Ana Example'});
 await q("UPDATE shifts SET start_time='17:00' WHERE id='peer-shift'");
 expect((await withActionRequestFacts(owner,workspace,items,db.executor))[0].request).not.toHaveProperty('counterpartName');
 await q("DELETE FROM employee_sessions WHERE employee_id='QAOWNER'");
 expect(await withActionRequestFacts(owner,workspace,items,db.executor)).toEqual(items);
});
