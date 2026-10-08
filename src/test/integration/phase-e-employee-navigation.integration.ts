import {afterEach,beforeEach,expect,it} from 'vitest';
import {Client} from 'pg';
import {createDisposableFoundationDatabase} from './local-postgres';
import {seedOwnedApp,seedOwnedScenario} from './owned-app-fixture';
import {readEmployeeProfile} from '../../lib/data/employee-profile.server';
import {readEmployeeNotificationList} from '../../lib/data/employee-notification-list.server';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
let db:Awaited<ReturnType<typeof createDisposableFoundationDatabase>>,scenario:Awaited<ReturnType<typeof seedOwnedScenario>>,proof:SessionMutationProof;
const q=(text:string,values:unknown[]=[])=>db.executor.query<Record<string,unknown>>({text,values});
beforeEach(async()=>{
 db=await createDisposableFoundationDatabase({mode:'current-runtime'});await seedOwnedApp(db.executor);scenario=await seedOwnedScenario(db.executor,'E41',0);
 await q("DELETE FROM notifications; INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('b',64),'QA-E41-A',now()+interval '1 day')");
 proof={employee:{id:scenario.actors[0],firstName:'QA E41',lastName:'Avery',role:'LEAD',primaryLocationId:'loc-1'},sessionTokenHash:'b'.repeat(64)};
 await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status,reason) VALUES('own-request',$1,current_date+7,current_date+7,'APPROVED','PRIVATE REASON')",[proof.employee.id]);
});
afterEach(async()=>{await db?.dispose();});
async function intent(id='current',kind='TIME_OFF',source='own-request',version='APPROVED',employee=proof.employee.id){
 await q(`INSERT INTO notifications(id,employee_id,type,title,body,action_href,event_key,environment,source_kind,source_id,source_version,effective_version,purpose,due_at,expires_at,urgency,push_state)
 VALUES($1,$2,'SOURCE_UPDATE','PRIVATE STORED TITLE','PRIVATE STORED BODY','https://untrusted.invalid',$1,'test',$3,$4,$5,$5,'EVENT',now()-interval '1 hour',now()+interval '1 day','high','pending')`,[id,employee,kind,source,version]);
}
const inbox=(executor:SqlExecutor=db.executor)=>readEmployeeNotificationList(proof,'test',executor);
const ids=(r:Awaited<ReturnType<typeof inbox>>)=>r.state==='ready'&&r.kind==='notifications'?r.items.map(i=>i.id):[];
function beforeFinal(action:()=>Promise<void>):SqlExecutor{
 let done=false;return {...db.executor,transaction:async(statements:readonly SqlStatement[],signal?:AbortSignal)=>{
  if(!done&&statements.some(s=>s.text.startsWith('WITH facts AS MATERIALIZED'))){done=true;await action();}
  return db.executor.transaction(statements,signal);
 }};
}
it('current own Profile and inbox work without push; DTO excludes copied body, reason, URL, tokens and coworker records',async()=>{
 await intent();const profile=await readEmployeeProfile(proof,db.executor);expect(profile).toMatchObject({state:'ready',kind:'profile',profile:{name:'QA E41 Avery',role:'Lead'}});
 const read=await inbox();expect(read).toMatchObject({state:'ready',kind:'notifications',coverage:'complete'});expect(ids(read)).toEqual(['current']);
 const text=JSON.stringify([read,profile]);for(const forbidden of ['PRIVATE','untrusted.invalid','QA E41 Blair','sessionTokenHash','bbbbbbbb','phone','reason'])expect(text).not.toContain(forbidden);
});
it.each(['EMPLOYEE','LEAD'] as const)('actual %s role authority and a replaced role/session cannot return private rows',async role=>{
 await q('UPDATE employees SET role=$1 WHERE id=$2',[role,proof.employee.id]);proof.employee.role=role;await intent();expect(ids(await inbox())).toEqual(['current']);
 await q("UPDATE employees SET role='MANAGER' WHERE id=$1",[proof.employee.id]);expect((await inbox()).state).toBe('unavailable');expect((await readEmployeeProfile(proof,db.executor)).state).toBe('unavailable');
});
it('foreign recipient/source, stale version, cancelled, expired and environment-mismatched rows expose no stale content',async()=>{
 await intent();await intent('foreign-recipient','TIME_OFF','own-request','APPROVED',scenario.actors[1]);await intent('stale','TIME_OFF','own-request','DENIED');await intent('wrong-env');await q("UPDATE notifications SET environment='production' WHERE id='wrong-env'");
 await intent('cancelled');await q("UPDATE notifications SET cancelled_at=now(),push_state='cancelled' WHERE id='cancelled'");await intent('expired');await q("UPDATE notifications SET due_at=now()-interval '2 day',expires_at=now()-interval '1 day' WHERE id='expired'");
 await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status) VALUES('foreign-source',$1,current_date+7,current_date+7,'APPROVED')",[scenario.actors[1]]);await intent('foreign-source-notice','TIME_OFF','foreign-source');
 expect(ids(await inbox())).toEqual(['current']);
});
it('unsupported legacy and row cap remain partial; infrastructure failure remains unavailable',async()=>{
 await q("INSERT INTO notifications(id,employee_id,type,title,body) VALUES('legacy',$1,'OLD','PRIVATE','PRIVATE')",[proof.employee.id]);expect(await inbox()).toMatchObject({state:'ready',coverage:'partial',items:[]});
 for(let i=0;i<27;i++)await intent('cap-'+i);expect(await inbox()).toMatchObject({state:'ready',coverage:'partial'});
 expect(await inbox({...db.executor,transaction:async()=>{throw Error('PRIVATE SQL');}})).toEqual({state:'unavailable',reason:'read_failed'});
});
it('new candidate during discovery cannot manufacture a complete empty view',async()=>{
 const read=await inbox(beforeFinal(()=>intent('arrived')));expect(read.state).toBe('unavailable');expect(ids(await inbox())).toEqual(['arrived']);
});
it('cancellation/source revocation after discovery removes the row in fresh canonical replay',async()=>{
 await intent();expect(ids(await inbox(beforeFinal(async()=>{await q("UPDATE time_off_requests SET status='DENIED' WHERE id='own-request'");})))).toEqual([]);
 await q("UPDATE time_off_requests SET status='APPROVED' WHERE id='own-request'");expect(ids(await inbox(beforeFinal(async()=>{await q("UPDATE notifications SET cancelled_at=now(),push_state='cancelled' WHERE id='current'");})))).toEqual([]);
});
it('final session revocation and workspace change return no DTO',async()=>{
 await intent();expect((await inbox(beforeFinal(async()=>{await q("DELETE FROM employee_sessions WHERE token_hash=repeat('b',64)");}))).state).toBe('unavailable');
 await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('b',64),$1,now()+interval '1 day')",[proof.employee.id]);
 expect((await inbox(beforeFinal(async()=>{await q("UPDATE workspaces SET updated_at=clock_timestamp() WHERE singleton");}))).state).toBe('unavailable');
});
it('time-only persisted expiry across the final wait excludes an unchanged notification',async()=>{
 await intent();await q("UPDATE notifications SET expires_at=clock_timestamp()+interval '250 milliseconds' WHERE id='current'");
 const read=await inbox(beforeFinal(async()=>{await q('SELECT pg_sleep(0.3)');}));expect(ids(read)).toEqual([]);expect(read.state).toBe('ready');
});
it('future due row cannot become silently missing when time crosses due during the final wait',async()=>{
 await intent();await q("UPDATE notifications SET due_at=clock_timestamp()+interval '250 milliseconds' WHERE id='current'");
 const read=await inbox(beforeFinal(async()=>{await q('SELECT pg_sleep(0.3)');}));expect(read.state).toBe('unavailable');expect(ids(await inbox())).toEqual(['current']);
});
it('real final actor-lock wait followed by role replacement is denied',async()=>{
 await intent();const lock=new Client({connectionString:db.connectionString});await lock.connect();let pending:Promise<Awaited<ReturnType<typeof inbox>>>|undefined;
 try{
  const executor=beforeFinal(async()=>{await lock.query('BEGIN');await lock.query('SELECT id FROM employees WHERE id=$1 FOR UPDATE',[proof.employee.id]);});
  pending=inbox(executor);
  const deadline=Date.now()+5000;let waiting=false;
  while(Date.now()<deadline){const rows=await q("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'SELECT id FROM employees%'");if(rows.length){waiting=true;break;}await new Promise(r=>setTimeout(r,10));}
  expect(waiting).toBe(true);await lock.query("UPDATE employees SET role='MANAGER' WHERE id=$1",[proof.employee.id]);await lock.query('COMMIT');expect((await pending).state).toBe('unavailable');
 }finally{await lock.query('ROLLBACK').catch(()=>{});await lock.end();await pending;}
});
it('unchanged Exchange succeeds and exact terminal participant history survives lost operational eligibility',async()=>{
 await q("INSERT INTO shift_exchanges(id,kind,source_shift_id,requested_by_employee_id,target_employee_id,status) VALUES('exchange','COVERAGE',$1,$2,$3,'APPROVED')",[scenario.sourceId,proof.employee.id,scenario.actors[1]]);await intent('history','EXCHANGE','exchange','r:1');
 expect(ids(await inbox())).toEqual(['history']);await q('DELETE FROM employee_location_eligibility WHERE employee_id=$1',[proof.employee.id]);await q("UPDATE locations SET active=false WHERE id='loc-1'");expect(ids(await inbox())).toEqual(['history']);
});
it('malformed final observation/result index and oversized source cannot leak a partial private DTO',async()=>{
 await intent();const bad={...db.executor,transaction:async(statements:readonly SqlStatement[],signal?:AbortSignal)=>{
  if(statements.some(s=>s.text.startsWith('WITH facts AS MATERIALIZED')))return [[]];return db.executor.transaction(statements,signal);
 }};expect((await inbox(bad)).state).toBe('unavailable');
 await q("UPDATE notifications SET body=repeat('x',1100000) WHERE id='current'");expect((await inbox()).state).toBe('unavailable');
});
it('pending Exchange is current before its clock-only deadline and becomes permitted terminal history after the final wait',async()=>{
 await q("INSERT INTO shift_exchanges(id,kind,source_shift_id,requested_by_employee_id,target_employee_id,status,completion_deadline) VALUES('pending','COVERAGE',$1,$2,$3,'EMPLOYEE_PENDING',clock_timestamp()+interval '1 day')",[scenario.sourceId,proof.employee.id,scenario.actors[1]]);
 proof.employee.id=scenario.actors[1];await q('UPDATE employee_sessions SET employee_id=$1 WHERE token_hash=$2',[proof.employee.id,proof.sessionTokenHash]);await intent('pending-notice','EXCHANGE','pending','r:1');
 expect(ids(await inbox())).toEqual(['pending-notice']);
 await q("UPDATE shift_exchanges SET completion_deadline=clock_timestamp()+interval '300 milliseconds' WHERE id='pending'");
 const result=await inbox(beforeFinal(async()=>{await q('SELECT pg_sleep(0.35)');}));expect(ids(result)).toEqual(['pending-notice']);expect(result.state==='ready'&&result.validForMs).toBeGreaterThan(1000);
});
it('same-version operational location eligibility revoked after discovery blocks an active Exchange',async()=>{
 await q("INSERT INTO shift_exchanges(id,kind,source_shift_id,requested_by_employee_id,target_employee_id,status) VALUES('pending','COVERAGE',$1,$2,$3,'EMPLOYEE_PENDING')",[scenario.sourceId,proof.employee.id,scenario.actors[1]]);
 proof.employee.id=scenario.actors[1];await q('UPDATE employee_sessions SET employee_id=$1 WHERE token_hash=$2',[proof.employee.id,proof.sessionTokenHash]);await intent('pending-notice','EXCHANGE','pending','r:1');expect(ids(await inbox())).toEqual(['pending-notice']);
 expect(ids(await inbox(beforeFinal(async()=>{await q('DELETE FROM employee_location_eligibility WHERE employee_id=$1',[proof.employee.id]);})))).toEqual([]);
});
it('terminal Callout preserves exact own history after operational location loss; foreign participants cannot open it',async()=>{
 await q("INSERT INTO shift_callouts(id,shift_id,employee_id,reason_code,status) VALUES('callout',$1,$2,'OTHER','DENIED')",[scenario.sourceId,proof.employee.id]);await intent('callout-notice','CALLOUT','callout','r:1');expect(ids(await inbox())).toEqual(['callout-notice']);
 await q('DELETE FROM employee_location_eligibility WHERE employee_id=$1',[proof.employee.id]);await q("UPDATE locations SET active=false WHERE id='loc-1'");expect(ids(await inbox())).toEqual(['callout-notice']);
 await q('UPDATE notifications SET employee_id=$1 WHERE id=$2',[scenario.actors[1],'callout-notice']);proof.employee.id=scenario.actors[1];await q('UPDATE employee_sessions SET employee_id=$1 WHERE token_hash=$2',[proof.employee.id,proof.sessionTokenHash]);expect(ids(await inbox())).toEqual([]);
});
it('active singleton workspace and configured profile locations are required; a second workspace is structurally rejected',async()=>{
 await expect(q("INSERT INTO workspaces(id,name,time_zone,singleton) VALUES('foreign','Foreign','UTC',false)")).rejects.toMatchObject({code:'23514'});
 await q('UPDATE locations SET active=false');expect((await readEmployeeProfile(proof,db.executor)).state).toBe('unavailable');await q('UPDATE workspaces SET active=false');expect((await inbox()).state).toBe('unavailable');
});
it('microsecond/null/set ordering and legacy empty query facts replay without changing authorized outcomes',async()=>{
 await q("UPDATE time_off_requests SET created_at='2026-10-08T10:11:12.123456Z',start_time=NULL,end_time=NULL,reason=NULL WHERE id='own-request'");await intent();
 for(let n=0;n<3;n++)expect(ids(await inbox())).toEqual(['current']);await q("DELETE FROM time_off_requests WHERE id='own-request'");expect(ids(await inbox())).toEqual([]);
});
it('owned PostgreSQL statement and lock timeouts yield unavailable instead of a completed inbox',async()=>{
 await intent();const timeout={...db.executor,transaction:async(statements:readonly SqlStatement[],signal?:AbortSignal)=>{
  if(statements.some(s=>s.text.startsWith('WITH facts AS MATERIALIZED'))){const copy=[...statements];copy.splice(copy.length-1,0,{text:'SELECT pg_sleep(3)',values:[]});return db.executor.transaction(copy,signal);}return db.executor.transaction(statements,signal);
 }};expect((await inbox(timeout)).state).toBe('unavailable');
});
