import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {Client} from 'pg';
import {expect,it,vi} from 'vitest';
import {companyAccessFixture} from './company-access-fixture';
import {configureFictionalShiftChanges,reviewedFixtureSource} from './shift-change-api';
import {assignOperationalScope,readOwnerOperationalScope} from '../../lib/company-access/operational-scope.server';
import {createTimeOffRequest} from '../../lib/data/requests';
import {executeShiftChange} from '../../lib/data/shift-changes';
import {executeScheduleCopy} from '../../lib/data/schedule-copy';
import {publishScheduleChanges,publishScheduleWithRevision} from '../../lib/data/publication-revisions';
import {runShiftChangeMaintenance} from '../../lib/data/shift-change-maintenance';
import {notificationIntentStatements} from '../../lib/data/notifications';
import {sqlNotificationStateRepository} from '../../lib/data/notification-state';
import {loadWorkspaceNotificationConfig} from '../../lib/notifications/config';
import {runReminders} from '../../lib/notifications/reminders';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import type {NotificationIntent,SqlExecutor,SqlStatement} from '../../lib/notifications/types';
vi.mock('server-only',()=>({}));
vi.mock('@/lib/db',()=>({getDb:()=>{throw Error('Explicit owned executor required');},queryRows:(rows:unknown)=>rows}));
type Fixture=Awaited<ReturnType<typeof companyAccessFixture>>;
const producers=['own-request','publication','callout-approval','schedule-copy','maintenance','reminder'] as const;
type Producer=typeof producers[number];
async function choose(f:Fixture,action:'REVOKE'|'COMPANY',ex=f.db.executor){
 const view=await readOwnerOperationalScope(f.owner,'manager',ex);if(view.state!=='ready')throw Error('Owned Owner scope');const c=view.data.current;
 const base={operationId:randomUUID(),expectedEmployeeVersion:c.employeeUpdatedAt,expectedRoleGeneration:c.roleGeneration,expectedScopeRevision:c.scopeRevision};
 expect((await assignOperationalScope(f.owner,'manager',action==='REVOKE'?{...base,action}:{...base,action:'ASSIGN',scope:{mode:'COMPANY',locationIds:[]}},ex)).state).toBe('saved');
}
async function waitLock(f:Fixture,pattern:string){
 const until=Date.now()+3500;
 while(Date.now()<until){const [r]=await f.q<{waiting:boolean}>("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE $1) AS waiting",[pattern]);if(r.waiting)return;await new Promise(resolve=>setTimeout(resolve,10));}
 throw Error('Expected actual PostgreSQL lock wait: '+pattern);
}
const settled=<T>(promise:Promise<T>)=>promise.then(value=>({value}),error=>({error}));
function unwrap<T>(result:{value:T}|{error:unknown}):T{if('error'in result)throw result.error;return result.value;}
async function cleanup(f:Fixture,clients:Client[],pending:Promise<unknown>[]){
 for(const client of clients){await client.query('ROLLBACK').catch(()=>{});await client.query('SELECT pg_advisory_unlock_all()').catch(()=>{});}
 await Promise.allSettled(pending);for(const client of clients)await client.end().catch(()=>{});await f.db.dispose();
}
function heldExecutor(client:Client):SqlExecutor{return {query:async<T>(s:SqlStatement)=>(await client.query(s.text,[...s.values])).rows as T[],transaction:async statements=>{const rows:unknown[][]=[];for(const s of statements)rows.push((await client.query(s.text,[...s.values])).rows);return rows;}};}
async function reminderFixture(){
 const f=await companyAccessFixture();try{
  const requestId=randomUUID();await f.q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status) VALUES($1,'target','2035-10-02','2035-10-03','PENDING')",[requestId]);
  const seed:NotificationIntent={id:randomUUID(),employeeId:'manager',type:'MANAGER_REVIEW',title:'NEVORA',body:'Open NEVORA.',eventKey:randomUUID(),environment:'test',source:{kind:'TIME_OFF',id:requestId,version:'PENDING'},effectiveVersion:'PENDING',purpose:'SUMMARY',urgency:'normal',dueAt:new Date(Date.now()-600000).toISOString(),expiresAt:new Date(Date.now()+72*3600000).toISOString()};
  await f.db.executor.transaction(notificationIntentStatements([seed]));const config={...await loadWorkspaceNotificationConfig({PUSH_ENVIRONMENT:'test'},f.db.executor),featureEnabled:true};
  return {...f,seed,requestId,config};
 }catch(error){await f.db.dispose();throw error;}
}
async function scenario(kind:Producer){
 if(kind==='reminder'){
  const f=await reminderFixture();return {...f,run:async(ex:SqlExecutor)=>{await runReminders({executor:ex,state:sqlNotificationStateRepository(ex),config:f.config,clock:()=>new Date()});},verify:async()=>expect(await f.q('SELECT status FROM time_off_requests WHERE id=$1',[f.requestId])).toEqual([{status:'PENDING'}])};
 }
 const f=await companyAccessFixture();try{
  await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),'target',clock_timestamp()+interval '1 hour');INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('peer','Peer','QA','NONE','LEAD','loc-2');INSERT INTO employee_location_eligibility(employee_id,location_id) SELECT e.id,l.id FROM employees e CROSS JOIN locations l WHERE e.id IN('target','peer');INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('producer-source','loc-2','2035-10-01','PUBLISHED','owner');INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('producer-shift','producer-source','target','2035-10-02','08:00','16:00')");
  await configureFictionalShiftChanges(f.db.executor);
  const employee:SessionMutationProof={employee:{...f.manager.employee,id:'target',role:'EMPLOYEE'},sessionTokenHash:'d'.repeat(64)};
  if(kind==='own-request'){const id=randomUUID();return {...f,run:async(ex:SqlExecutor)=>{await createTimeOffRequest({requestId:id,employeeId:'target',proof:employee,startDate:'2035-11-02',endDate:'2035-11-03'},ex);},verify:async()=>expect(await f.q('SELECT employee_id,status FROM time_off_requests WHERE id=$1',[id])).toEqual([{employee_id:'target',status:'PENDING'}])};}
  if(kind==='publication'||kind==='schedule-copy'){
   // A retained historical assignment belongs to the current Manager. These
   // publication/repair operations retain it; copy creates only target's own row.
   await f.q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('producer-destination','loc-1','2035-10-08',$1,'owner')",[kind==='publication'?'DRAFT':'PUBLISHED']);await f.q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('producer-destination-shift','producer-destination','manager','2035-10-09','08:00','16:00')");
   const operationId=randomUUID();
   return {...f,run:async(ex:SqlExecutor)=>{if(kind==='publication')expect((await publishScheduleWithRevision({locationId:'loc-1',weekStart:'2035-10-08',managerId:'owner',proof:f.owner},ex)).published).toBe(true);else{expect((await executeScheduleCopy(f.owner,{operationId,kind:'PREVIOUS_WEEK',weekStart:'2035-10-08'},ex)).rows.filter(r=>r.status==='COMMITTED')).toHaveLength(1);
    // Publish changes (Jose, 2026-10-29): a copy into a published week is held and notifies nobody;
    // its notification producer is now the Owner's Publish changes, which this scenario runs next.
    expect((await publishScheduleChanges({weekStart:'2035-10-08',managerId:'owner',proof:f.owner},ex)).published).toBe(true);}},
    verify:async()=>{expect(await f.q("SELECT id FROM schedule_publication_revisions WHERE week_start='2035-10-08'")).toHaveLength(1);// The copied loc-2 row lands in a new Draft schedule, so nothing was held.
     if(kind==='schedule-copy')expect(await f.q("SELECT kind FROM schedule_pending_edits WHERE week_start='2035-10-08'")).toEqual([]);}};
  }
  const terms=await reviewedFixtureSource(f.db.executor,'producer-shift'),created=await executeShiftChange(employee,{kind:'SUBMIT_CALLOUT',operationId:randomUUID(),...terms,reasonCode:'ILLNESS'},f.db.executor);if(created.status!=='pending')throw Error('Owned callout setup');
  if(kind==='callout-approval')return {...f,run:async(ex:SqlExecutor)=>expect((await executeShiftChange(f.owner,{kind:'APPROVE_CALLOUT',operationId:randomUUID(),requestId:created.requestId,expectedRevision:1},ex)).status).toBe('completed'),verify:async()=>expect(await f.q('SELECT status FROM shift_callouts WHERE id=$1',[created.requestId])).toEqual([{status:'APPROVED'}])};
  const config=await loadWorkspaceNotificationConfig({PUSH_ENVIRONMENT:'test'},f.db.executor);
  return {...f,run:async(ex:SqlExecutor)=>expect((await runShiftChangeMaintenance({executor:ex,config,clock:()=>new Date('2035-10-02T01:00:00Z'),limit:50})).escalated).toBe(1),verify:async()=>expect(await f.q('SELECT escalated_at IS NOT NULL AS escalated FROM shift_callouts WHERE id=$1',[created.requestId])).toEqual([{escalated:true}])};
 }catch(error){await f.db.dispose();throw error;}
}
it.each(producers)('%s recipient persistence waits behind a real revocation and omits the denied Manager without losing the business result',async kind=>{
 const f=await scenario(kind),blocker=new Client({connectionString:f.db.connectionString,statement_timeout:5000}),pending:Promise<unknown>[]=[];
 try{
  const before=await f.q<{id:string}>('SELECT id FROM notifications'),ids=before.map(r=>r.id);await blocker.connect();await blocker.query('BEGIN');await blocker.query('SELECT id FROM workspaces WHERE singleton FOR NO KEY UPDATE');await choose(f,'REVOKE',heldExecutor(blocker));
  const work=settled(f.run(f.db.executor));pending.push(work);await waitLock(f,'%FROM workspaces%');await blocker.query('COMMIT');unwrap(await work);await f.verify();
  expect(await f.q("SELECT id FROM notifications WHERE employee_id='manager' AND NOT(id=ANY($1::text[]))",[ids])).toEqual([]);
  if(kind==='own-request')expect(await f.q("SELECT id FROM notifications WHERE employee_id='owner' AND NOT(id=ANY($1::text[]))",[ids])).toHaveLength(1);
  expect(await f.q('SELECT id FROM notifications WHERE id=ANY($1::text[]) ORDER BY id',[ids])).toHaveLength(ids.length);
 }finally{await cleanup(f,[blocker],pending);}
});
it.each(producers)('%s persistence owning its real locks commits before a waiting revocation and preserves the stored history afterward',async kind=>{
 const f=await scenario(kind),barrier=new Client({connectionString:f.db.connectionString,statement_timeout:5000}),pending:Promise<unknown>[]=[];
 try{
  const before=await f.q<{id:string}>('SELECT id FROM notifications'),ids=before.map(r=>r.id);await barrier.connect();await barrier.query('SELECT pg_advisory_lock(321086)');
  await f.q("CREATE FUNCTION test_owned_notification_insert_wait() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.employee_id='manager' THEN PERFORM pg_advisory_xact_lock(321086);END IF;RETURN NEW;END $$;CREATE TRIGGER test_owned_notification_insert_wait BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION test_owned_notification_insert_wait()");
  const work=settled(f.run(f.db.executor));pending.push(work);await waitLock(f,'%INSERT INTO notifications%');const revoking=settled(choose(f,'REVOKE'));pending.push(revoking);await waitLock(f,'%SELECT id FROM workspaces%');await barrier.query('SELECT pg_advisory_unlock(321086)');unwrap(await work);unwrap(await revoking);await f.verify();
  const rows=await f.q<{id:string;cancelled_at:unknown;read_at:unknown}>("SELECT id,cancelled_at,read_at FROM notifications WHERE employee_id='manager' AND NOT(id=ANY($1::text[]))",[ids]);expect(rows.length).toBeGreaterThan(0);expect(rows.every(r=>r.cancelled_at===null&&r.read_at===null)).toBe(true);
  const repo=sqlNotificationStateRepository(f.db.executor);for(const row of rows){const intent=await repo.findIntent(row.id);expect(intent).toBeTruthy();expect((await repo.check(intent!,'manager',new Date(),'open')).deliverable).toBe(false);}
 }finally{await cleanup(f,[barrier],pending);}
});
it.each(['regrant-after-source','revision-before-flush','scope-loss-and-resolution'] as const)('reminder keeps its original authority through %s without consuming or cancelling the old seed',async phase=>{
 const f=await reminderFixture();try{
  if(phase==='scope-loss-and-resolution')await f.q("UPDATE time_off_requests SET status='DENIED' WHERE id=$1",[f.requestId]);
  const before=await f.q('SELECT * FROM notifications WHERE id=$1',[f.seed.id]),base=sqlNotificationStateRepository(f.db.executor);let hit=false,reads=0;
  const state={...base,readSource:async(...args:Parameters<typeof base.readSource>)=>{const value=await base.readSource(...args);if(!hit&&phase!=='revision-before-flush'){hit=true;await choose(f,'REVOKE');if(phase==='regrant-after-source')await choose(f,'COMPANY');}return value;},recipientAccess:async(...args:Parameters<typeof base.recipientAccess>)=>{if(args[0]==='manager'&&args[1]==='operational'&&++reads===2&&phase==='revision-before-flush'){hit=true;await choose(f,'COMPANY');}return base.recipientAccess(...args);}};
  await runReminders({executor:f.db.executor,state,config:f.config,clock:()=>new Date()});expect(hit).toBe(true);expect(await f.q('SELECT * FROM notifications WHERE id=$1',[f.seed.id])).toEqual(before);expect(await f.q("SELECT id FROM notifications WHERE employee_id='manager' AND source_kind='MANAGER_SUMMARY'")).toEqual([]);
 }finally{await f.db.dispose();}
});
it('zero-row summary INSERT cannot consume an actually reached pending seed',async()=>{
 const f=await reminderFixture();try{
  await f.q("CREATE TABLE test_owned_group_attempts(id text);CREATE FUNCTION test_owned_skip_summary() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.source_kind='MANAGER_SUMMARY' AND NEW.employee_id='manager' THEN INSERT INTO test_owned_group_attempts VALUES(NEW.id);RETURN NULL;END IF;RETURN NEW;END $$;CREATE TRIGGER test_owned_skip_summary BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION test_owned_skip_summary()");
  const before=await f.q('SELECT * FROM notifications WHERE id=$1',[f.seed.id]);await runReminders({executor:f.db.executor,state:sqlNotificationStateRepository(f.db.executor),config:f.config,clock:()=>new Date()});expect(await f.q('SELECT * FROM test_owned_group_attempts')).toHaveLength(1);expect(await f.q('SELECT * FROM notifications WHERE id=$1',[f.seed.id])).toEqual(before);expect(await f.q("SELECT id FROM notifications WHERE source_kind='MANAGER_SUMMARY'")).toEqual([]);
 }finally{await f.db.dispose();}
});
it('genuine source resolution while Company remains current cancels the obsolete seed',async()=>{
 const f=await reminderFixture();try{await f.q("UPDATE time_off_requests SET status='DENIED' WHERE id=$1",[f.requestId]);await runReminders({executor:f.db.executor,state:sqlNotificationStateRepository(f.db.executor),config:f.config,clock:()=>new Date()});expect(await f.q('SELECT push_state,cancelled_at IS NOT NULL AS cancelled FROM notifications WHERE id=$1',[f.seed.id])).toEqual([{push_state:'cancelled',cancelled:true}]);}finally{await f.db.dispose();}
});
it('current Company filtering precedes manager LIMIT and reaches the Owner behind one hundred five unassigned Managers',async()=>{
 const f=await companyAccessFixture();try{
  await choose(f,'REVOKE');await f.q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) SELECT '000-unassigned-'||lpad(d::text,3,'0'),'Unassigned','QA','NONE','MANAGER','loc-1' FROM generate_series(1,105)d;INSERT INTO schedule_week_settings(week_start,availability_deadline) SELECT date_trunc('week',clock_timestamp() AT TIME ZONE time_zone)::date,clock_timestamp()-interval '1 minute' FROM workspaces WHERE singleton");
  const config={...await loadWorkspaceNotificationConfig({PUSH_ENVIRONMENT:'test'},f.db.executor),featureEnabled:true};await runReminders({executor:f.db.executor,state:sqlNotificationStateRepository(f.db.executor),config,clock:()=>new Date()});
  expect(await f.q("SELECT employee_id FROM notifications WHERE source_kind='MANAGER_SUMMARY'")).toEqual([{employee_id:'owner'}]);
 }finally{await f.db.dispose();}
});
it('real availability account/day budget survives a changed deadline and repeated scanner invocation',async()=>{
 const f=await companyAccessFixture();try{
  await f.q("INSERT INTO schedule_week_settings(week_start,availability_deadline) SELECT date_trunc('week',clock_timestamp() AT TIME ZONE time_zone)::date,date_trunc('second',clock_timestamp())+interval '6 hours' FROM workspaces WHERE singleton");const config={...await loadWorkspaceNotificationConfig({PUSH_ENVIRONMENT:'test'},f.db.executor),featureEnabled:true},run=()=>runReminders({executor:f.db.executor,state:sqlNotificationStateRepository(f.db.executor),config,clock:()=>new Date()});
  await run();const first=await f.q("SELECT id,event_key,effective_version FROM notifications WHERE employee_id='target' AND purpose='REMINDER'");expect(first).toHaveLength(1);await f.q("UPDATE schedule_week_settings SET availability_deadline=availability_deadline+interval '30 minutes'");await run();await run();expect(await f.q("SELECT id,event_key,effective_version FROM notifications WHERE employee_id='target' AND purpose='REMINDER'")).toEqual(first);
 }finally{await f.db.dispose();}
});
it.each(['PAYROLL_PREPARATION','PAYROLL_STATEMENT','SELF_TEST'] as const)('%s persistence retains its exact independent SQL and seventeen positional values',async kind=>{
 const fixtures=JSON.parse(await readFile(new URL('../fixtures/notification-independent-branch-baselines.json',import.meta.url),'utf8')) as Record<string,{intent:NotificationIntent;statement:SqlStatement}>;
 const fixture=fixtures[kind];expect(notificationIntentStatements([fixture.intent])).toEqual([fixture.statement]);expect(fixture.statement.values).toHaveLength(17);
});
it.each(['seed','group'] as const)('late scope loss before the real %s lifecycle-cancellation batch preserves notification history',async phase=>{
 const f=await reminderFixture();try{
  let reconciliationAt=Date.now()+2*3600000;
  if(phase==='group'){
   await runReminders({executor:f.db.executor,state:sqlNotificationStateRepository(f.db.executor),config:f.config,clock:()=>new Date()});
   const groups=await f.q<{dueAt:string}>("SELECT due_at::text AS \"dueAt\" FROM notifications WHERE source_kind='MANAGER_SUMMARY' AND employee_id='manager'");expect(groups).toHaveLength(1);
   // Quiet hours can defer the actual group beyond two hours. Exercise its real
   // due lifecycle batch regardless of the wall-clock time of this test run.
   reconciliationAt=Math.max(reconciliationAt,Date.parse(groups[0].dueAt)+1);
  }
  await f.q("UPDATE time_off_requests SET status='DENIED' WHERE id=$1",[f.requestId]);const before=await f.q('SELECT * FROM notifications ORDER BY id'),base=f.db.executor;let hit=false;
  const ex={...base,transaction:async(statements:readonly SqlStatement[],signal?:AbortSignal)=>{if(!hit&&statements.some(s=>s.text.startsWith('WITH cancelled AS'))){hit=true;await choose(f,'REVOKE');}return base.transaction(statements,signal);}};
  await runReminders({executor:ex,state:sqlNotificationStateRepository(ex),config:f.config,clock:()=>new Date(reconciliationAt)});expect(hit).toBe(true);expect(await f.q('SELECT * FROM notifications ORDER BY id')).toEqual(before);
 }finally{await f.db.dispose();}
});
it.each(['role-cycle','active-cycle'] as const)('actual own-request persistence omits a recipient whose %s invalidated Company after candidate construction',async cycle=>{
 const f=await scenario('own-request');try{
  const before=await f.q<{id:string}>('SELECT id FROM notifications'),base=f.db.executor;let hit=false;
  const ex={...base,transaction:async(statements:readonly SqlStatement[],signal?:AbortSignal)=>{if(!hit&&statements.some(s=>s.text.includes('INSERT INTO time_off_requests'))){hit=true;await f.q(cycle==='role-cycle'?"UPDATE employees SET role='EMPLOYEE' WHERE id='manager';UPDATE employees SET role='MANAGER' WHERE id='manager'":"UPDATE employees SET active=false WHERE id='manager';UPDATE employees SET active=true WHERE id='manager'");}return base.transaction(statements,signal);}};
  await f.run(ex);expect(hit).toBe(true);await f.verify();expect(await f.q("SELECT employee_id FROM notifications WHERE NOT(id=ANY($1::text[])) ORDER BY employee_id",[before.map(r=>r.id)])).toEqual([{employee_id:'owner'}]);
 }finally{await f.db.dispose();}
});
it('actual own-request persistence rolls its business and outbox rows back after workspace retirement during planning',async()=>{
 const f=await scenario('own-request');try{
  const before=await f.q("SELECT jsonb_build_object('requests',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM time_off_requests t),'notifications',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM notifications t)) AS state"),base=f.db.executor;let hit=false;
  const ex={...base,transaction:async(statements:readonly SqlStatement[],signal?:AbortSignal)=>{if(!hit&&statements.some(s=>s.text.includes('INSERT INTO time_off_requests'))){hit=true;await f.q('UPDATE workspaces SET active=false WHERE singleton');}return base.transaction(statements,signal);}};
  await expect(f.run(ex)).rejects.toMatchObject({code:'22P02',message:'invalid input syntax for type integer: "workspace_version_conflict"'});expect(hit).toBe(true);expect(await f.q("SELECT jsonb_build_object('requests',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM time_off_requests t),'notifications',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM notifications t)) AS state")).toEqual(before);
 }finally{await f.db.dispose();}
});
