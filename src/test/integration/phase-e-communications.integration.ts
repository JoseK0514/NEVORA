import {executeManagerReminder,findManagerReminderOperation} from '../../lib/manager-reminders/service.server';
import {readOwnerOperationalScope,assignOperationalScope} from '../../lib/company-access/operational-scope.server';
import {readFile} from 'node:fs/promises';
import {afterEach,beforeEach,expect,it} from 'vitest';
import {randomUUID} from 'node:crypto';
import {Client} from 'pg';
import {createDisposableFoundationDatabase} from './local-postgres';
import {previewCommunicationAudience,executeCommunicationCommand,readCommunication,listEmployeeCommunications,findCommunicationOperation,communicationAuthority} from '../../lib/communications/service.server';
import type {CommunicationDraft,CommunicationCommand} from '../../lib/communications/types';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import type {SqlExecutor} from '../../lib/notifications/types';
import {currentShiftFingerprintSql,currentShiftTermsSql} from '../../lib/data/shift-change-release';
import {runReminders} from '../../lib/notifications/reminders';
import {sqlNotificationStateRepository} from '../../lib/data/notification-state';
import {readNotificationConfig} from '../../lib/notifications/config';
import {getWorkspace} from '../../lib/data/workspaces';

let db:Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
const owner:SessionMutationProof={employee:{id:'owner',firstName:'Fictional',lastName:'Owner',role:'OWNER',primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)};
const employee:SessionMutationProof={employee:{id:'employee',firstName:'Fictional',lastName:'Self',role:'EMPLOYEE',primaryLocationId:'loc-1'},sessionTokenHash:'b'.repeat(64)};
const other:SessionMutationProof={...employee,employee:{...employee.employee,id:'other'},sessionTokenHash:'c'.repeat(64)};
const draft:CommunicationDraft={type:'LOCATION_ANNOUNCEMENT',scope:{kind:'LOCATION',locationId:'loc-1'},title:'Fictional update',body:'Review the operational detail.',acknowledgement:'REQUIRED',expiresAt:null};
const q=(text:string,values:unknown[]=[])=>db.executor.query({text,values});
async function command(value=draft,proof=owner):Promise<Extract<CommunicationCommand,{kind:'PUBLISH'}>>{
 const p=await previewCommunicationAudience(proof,value,db.executor);expect(p.state).toBe('ready');if(p.state!=='ready')throw Error('No preview');
 return {kind:'PUBLISH',operationId:randomUUID(),authority:p.authority,draft:value,audienceFingerprint:p.fingerprint};
}
async function publish(){const c=await command(),r=await executeCommunicationCommand(owner,c,db.executor);expect(r.status).toBe('committed');if(r.status!=='committed')throw Error('No result');return {c,r};}
beforeEach(async()=>{
 db=await createDisposableFoundationDatabase({mode:'current-runtime'});
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('owner','Fictional','Owner','555-0100','OWNER','loc-1'),('employee','Fictional','Self','555-0101','EMPLOYEE','loc-1'),('other','Fictional','Other','555-0102','LEAD','loc-2')");
 for(const p of [owner,employee,other])await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,$2,clock_timestamp()+interval '1 day')",[p.sessionTokenHash,p.employee.id]);

 // Explicit current Company schema; intended actors are already seeded.
 for(const file of ['0031_native_payroll.sql','0032_company_access_invitations.sql'])await q(await readFile('db/migrations/'+file,'utf8'));
});
afterEach(async()=>{await db?.dispose();});
it('location immutable grants do not backfill transfers; deactivation denies reads',async()=>{
 const {r}=await publish();expect(await readCommunication(employee,r.id,db.executor)).toMatchObject({state:'ready',body:draft.body});
 await q("UPDATE employees SET primary_location_id='loc-1' WHERE id='other'");expect(await readCommunication(other,r.id,db.executor)).toMatchObject({state:'unauthorized'});
 await q("UPDATE employees SET active=false WHERE id='employee'");expect(await readCommunication(employee,r.id,db.executor)).toMatchObject({state:'unauthorized'});
 expect(await listEmployeeCommunications(employee,db.executor)).toMatchObject({state:'unauthorized'});
});
it('concurrent_publish_same_command_once and changed replay conflict',async()=>{
 const c=await command(),r=await Promise.all([executeCommunicationCommand(owner,c,db.executor),executeCommunicationCommand(owner,c,db.executor)]);
 expect(r[0]).toMatchObject({status:'committed'});expect(r[1]).toEqual(r[0]);
 for(const table of ['communications','communication_revisions','communication_operations','communication_lifecycle'])expect((await q('SELECT * FROM '+table)).length).toBe(1);
 expect((await q('SELECT * FROM notifications')).length).toBe(1);
 expect(await executeCommunicationCommand(owner,{...c,draft:{...draft,body:'Changed replay'}},db.executor)).toMatchObject({status:'conflict'});
 expect(await findCommunicationOperation(owner,c.operationId,c.authority,db.executor)).toEqual(r[0]);
});
it('audience fingerprint rejects a phantom eligibility change after preview',async()=>{
 const c=await command();await q("INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('other','loc-1')");
 expect(await executeCommunicationCommand(owner,c,db.executor)).toMatchObject({status:'conflict'});expect(await q('SELECT * FROM communications')).toEqual([]);
});
it('withdraw cancels current intents and deliveries; author deactivation preserves management control',async()=>{
 const {r}=await publish();
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('manager','Fictional','Manager','555-0103','MANAGER','loc-1')");
 const manager={...owner,employee:{...owner.employee,id:'manager',role:'MANAGER' as const},sessionTokenHash:'d'.repeat(64)};
 await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'manager',now()+interval '1 day')",[manager.sessionTokenHash]);
 // A newly created Manager needs the actual active Owner's explicit Company grant.
 const context=await readOwnerOperationalScope(owner,'manager',db.executor);if(context.state!=='ready')throw Error('Owned Manager scope context');const current=context.data.current;
 expect((await assignOperationalScope(owner,'manager',{operationId:randomUUID(),action:'ASSIGN',expectedEmployeeVersion:current.employeeUpdatedAt,expectedRoleGeneration:current.roleGeneration,expectedScopeRevision:current.scopeRevision,scope:{mode:'COMPANY',locationIds:[]}},db.executor)).state).toBe('saved');
 await q("UPDATE employees SET active=false WHERE id='owner'");
 expect(await executeCommunicationCommand(manager,{kind:'WITHDRAW',communicationId:r.id,expectedRevisionId:r.version,authority:communicationAuthority(manager),operationId:randomUUID()},db.executor)).toMatchObject({status:'committed'});
 expect(await readCommunication(employee,r.id,db.executor)).toMatchObject({state:'withdrawn'});expect(await q('SELECT push_state FROM notifications')).toEqual([{push_state:'cancelled'}]);
 expect((await q('SELECT * FROM communication_revisions')).length).toBe(1);
});
it('outbox fault rolls back all publication and grants',async()=>{
 const c=await command();await q("CREATE FUNCTION fixture_outbox_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture_outbox_fault'; END $$; CREATE TRIGGER fixture_outbox_fault BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION fixture_outbox_fault()");
 expect(await executeCommunicationCommand(owner,c,db.executor)).toMatchObject({status:'outcome_unknown'});
 for(const table of ['communications','communication_revisions','communication_recipients','communication_operations','communication_lifecycle'])expect(await q('SELECT * FROM '+table)).toEqual([]);
 expect(await findCommunicationOperation(owner,c.operationId,c.authority,db.executor)).toMatchObject({status:'unavailable'});
});
it('session replaced proof cannot execute a prior tab command',async()=>{
 const c=await command();await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('e',64),'owner',now()+interval '1 day')");
 expect(await executeCommunicationCommand({...owner,sessionTokenHash:'e'.repeat(64)},c,db.executor)).toMatchObject({status:'blocked'});
});
it('expiry after communication root wait cannot publish a revision or disclose content',async()=>{
 const {r}=await publish(),c={...(await command({...draft,body:'Revised'})),kind:'REVISE' as const,communicationId:r.id,expectedRevisionId:r.version};
 const blocker=new Client({connectionString:db.connectionString});await blocker.connect();
 try{await blocker.query('BEGIN');await blocker.query('SELECT id FROM communications WHERE id=$1 FOR UPDATE',[r.id]);await q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '150 milliseconds' WHERE employee_id='owner'");
 const pending=executeCommunicationCommand(owner,c,db.executor);await new Promise(resolve=>setTimeout(resolve,250));await blocker.query('COMMIT');
 expect(await pending).toMatchObject({status:'blocked'});expect((await q('SELECT * FROM communication_revisions')).length).toBe(1);
 }finally{await blocker.query('ROLLBACK');await blocker.end();}
});
it('source changed between protected observations is rejected after locks',async()=>{
 const c=await command();let observed=0;
 const executor:SqlExecutor={...db.executor,transaction:async(s,signal)=>{
  if(s.some(x=>x.text.includes('communication_snapshot'))&&++observed===2)await q("UPDATE employees SET primary_location_id='loc-2' WHERE id='employee'");
  return db.executor.transaction(s,signal);
 }};
 expect(await executeCommunicationCommand(owner,c,executor)).toMatchObject({status:'conflict'});expect(await q('SELECT * FROM communications')).toEqual([]);
});
async function overnightTeam(){
 const [date]=await q("SELECT (clock_timestamp() AT TIME ZONE time_zone)::date::text AS today FROM workspaces") as {today:string}[];
 await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('overnight-schedule','loc-1',date_trunc('week',$1::date-1)::date,'PUBLISHED','owner')",[date.today]);
 await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('overnight-shift','overnight-schedule','employee',$1::date-1,'23:00','07:00')",[date.today]);
 await q("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) SELECT 'overnight-revision',week_start,1,'PUBLISH','owner' FROM schedules WHERE id='overnight-schedule'");
 const team:CommunicationDraft={...draft,type:'TODAYS_TEAM',scope:{kind:'TODAYS_TEAM',locationId:'loc-1',businessDate:date.today},acknowledgement:'OPTIONAL'};
 return team;
}
it('yesterday overnight is today team; approved exact callout denies sender and recipient',async()=>{
 const team=await overnightTeam(),c=await command(team,employee),r=await executeCommunicationCommand(employee,c,db.executor);expect(r.status).toBe('committed');if(r.status!=='committed')throw Error('No team');
 expect(await readCommunication(employee,r.id,db.executor)).toMatchObject({state:'ready'});
 await q(`INSERT INTO shift_callouts(id,shift_id,employee_id,status,reason_code,assignment_episode_id,reviewed_terms_fingerprint,source_terms)
 SELECT 'callout',sh.id,sh.employee_id,'APPROVED','ILLNESS',sh.assignment_episode_id,${currentShiftFingerprintSql()},${currentShiftTermsSql()} FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE sh.id='overnight-shift'`);
 expect(await previewCommunicationAudience(employee,team,db.executor)).toMatchObject({state:'blocked'});
 expect(await readCommunication(employee,r.id,db.executor)).toMatchObject({state:'unauthorized'});
});
it('shift episode change denies old note and current location loss denies announcement',async()=>{
 await overnightTeam();const [source]=await q(`SELECT sh.assignment_episode_id::text AS episode,${currentShiftFingerprintSql()} AS fingerprint FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE sh.id='overnight-shift'`) as {episode:string;fingerprint:string}[];
 const note:CommunicationDraft={...draft,type:'SHIFT_NOTE',scope:{kind:'SHIFT',locationId:'loc-1',sourceShiftId:'overnight-shift',assignmentEpisodeId:source.episode,termsFingerprint:source.fingerprint}};
 const c=await command(note),r=await executeCommunicationCommand(owner,c,db.executor);if(r.status!=='committed')throw Error('No note');
 expect(await readCommunication(employee,r.id,db.executor)).toMatchObject({state:'ready'});
 await q("UPDATE shifts SET employee_id='other' WHERE id='overnight-shift'");expect(await readCommunication(employee,r.id,db.executor)).toMatchObject({state:'unauthorized'});
 const announcement=await publish();await q("UPDATE locations SET active=false WHERE id='loc-1'");expect(await readCommunication(employee,announcement.r.id,db.executor)).toMatchObject({state:'unauthorized'});
});
it('arbitrary recipient IDs are rejected on full otherwise valid command',async()=>{
 const c=await command();expect(await executeCommunicationCommand(owner,{...c,recipientIds:['other']} as never,db.executor)).toEqual({status:'blocked',reason:'invalid_command'});expect(await q('SELECT * FROM communications')).toEqual([]);
});
it('expiry during final operation wait rejects publication without source rows',async()=>{
 const c=await command({...draft,expiresAt:new Date(Date.now()+600).toISOString()});
 const executor:SqlExecutor={...db.executor,transaction:async(s,signal)=>{
  if(s.some(x=>x.text.includes('communication-operation:')))await new Promise(resolve=>setTimeout(resolve,750));
  return db.executor.transaction(s,signal);
 }};
 expect(await executeCommunicationCommand(owner,c,executor)).toMatchObject({status:'conflict'});expect(await q('SELECT * FROM communications')).toEqual([]);
});
it.each(['eligibility','withdrawal'])('list final %s change discards an earlier private body',async change=>{
 await q("UPDATE employees SET primary_location_id='loc-2' WHERE id='employee'; INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('employee','loc-1')");
 const {r}=await publish();let changed=false;
 const executor:SqlExecutor={...db.executor,transaction:async(s,signal)=>{
  const result=await db.executor.transaction(s,signal);
  if(!changed&&s.some(x=>x.text.includes('SELECT g.grant_kind'))){changed=true;
   if(change==='eligibility')await q("DELETE FROM employee_location_eligibility WHERE employee_id='employee' AND location_id='loc-1'");
   else expect(await executeCommunicationCommand(owner,{kind:'WITHDRAW',operationId:randomUUID(),authority:communicationAuthority(owner),communicationId:r.id,expectedRevisionId:r.version},db.executor)).toMatchObject({status:'committed'});
  }return result;
 }};
 const list=await listEmployeeCommunications(employee,executor);expect(JSON.stringify(list)).not.toContain(draft.body);expect(list).toMatchObject({state:'partial',items:[]});
});
it('another eligible team assignment does not replace an immutable existing read grant',async()=>{
 const team=await overnightTeam(),c=await command(team,employee),r=await executeCommunicationCommand(employee,c,db.executor);if(r.status!=='committed')throw Error('No team');
 await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) SELECT 'zzzz-other-shift',schedule_id,employee_id,date,start_time,end_time FROM shifts WHERE id='overnight-shift'");
 expect(await readCommunication(employee,r.id,db.executor)).toMatchObject({state:'ready'});
});

it('publication after empty list discovery cannot report complete all-clear',async()=>{
 let observed=false;const ex:SqlExecutor={...db.executor,transaction:async(s,signal)=>{const r=await db.executor.transaction(s,signal);if(!observed&&s.some(x=>x.text.includes('communication_list_index'))){observed=true;await publish();}return r;}};
 const result=await listEmployeeCommunications(employee,ex);expect(observed).toBe(true);expect(result.state).not.toBe('complete');
});
it('protected management status names recipients; employee receives only own status and short lifetime',async()=>{
 const {r}=await publish();const staff=await readCommunication(employee,r.id,db.executor),management=await readCommunication(owner,r.id,db.executor);
 expect(staff).toMatchObject({state:'ready',validForMs:expect.any(Number),observedAt:expect.any(String)});expect(staff).not.toHaveProperty('management');
 expect(management).toMatchObject({state:'ready',management:{recipients:[{name:'Fictional Self',acknowledgedAt:null}],draft}});
});

// NV261: real transactions prove reminder receipt/outbox/cadence behavior.
async function managerReminderFixture(kind:'AVAILABILITY'|'COMMUNICATION'){
 if(kind==='COMMUNICATION'){
  const {r}=await publish();return {kind,communicationId:r.id,expectedRevisionId:r.version,employeeId:'employee',operationId:randomUUID(),authority:communicationAuthority(owner)};
 }
 const [date]=await q("SELECT (date_trunc('week',clock_timestamp())+interval '7 days')::date::text AS week, to_char(clock_timestamp()+interval '10 days','YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') AS deadline") as {week:string;deadline:string}[];
 await q('INSERT INTO schedule_week_settings(week_start,availability_deadline) VALUES($1::date,$2::timestamptz)',[date.week,date.deadline]);
 return {kind,weekStart:date.week,expectedDeadline:date.deadline,employeeId:'employee',operationId:randomUUID(),authority:communicationAuthority(owner)};
}
it.each(['AVAILABILITY','COMMUNICATION'] as const)('manager %s reminder: concurrent same and different operations share one daily queue entry',async kind=>{
 const c=await managerReminderFixture(kind);
 const results=await Promise.all([executeManagerReminder(owner,c,db.executor),executeManagerReminder(owner,c,db.executor),executeManagerReminder(owner,{...c,operationId:randomUUID()},db.executor)]);
 expect(results[0]).toMatchObject({status:'committed'});expect(results[1]).toEqual(results[0]);expect(results[2]).toMatchObject({status:'committed'});
 expect(await q("SELECT count(*)::int AS count FROM notifications WHERE purpose='REMINDER'")).toEqual([{count:1}]);
 expect(await q("SELECT count(*)::int AS count FROM employee_attention_operations WHERE result->>'kind'='MANAGER_REMINDER'")).toEqual([{count:2}]);
 expect(await findManagerReminderOperation(owner,c.operationId,c.authority,db.executor)).toEqual(results[0]);
 expect(await executeManagerReminder(owner,{...c,employeeId:'other'},db.executor)).toMatchObject({status:'conflict'});
});
it.each(['AVAILABILITY','COMMUNICATION'] as const)('manager %s reminder: resolved action denies queue but original operation remains recoverable',async kind=>{
 const c=await managerReminderFixture(kind),r=await executeManagerReminder(owner,c,db.executor);expect(r.status).toBe('committed');
 if(c.kind==='AVAILABILITY')await q("INSERT INTO weekly_availability_submissions(employee_id,week_start,submitted_at) VALUES('employee',$1::date,clock_timestamp())",[c.weekStart]);
 else {const update=await readCommunication(employee,c.communicationId,db.executor);if(update.state!=='ready')throw Error('No update');expect(await executeCommunicationCommand(employee,{kind:'ACKNOWLEDGE',operationId:randomUUID(),authority:communicationAuthority(employee),communicationId:c.communicationId,expectedRevisionId:c.expectedRevisionId,contentHash:update.contentHash},db.executor)).toMatchObject({status:'committed'});}
 expect(await executeManagerReminder(owner,{...c,operationId:randomUUID()},db.executor)).toMatchObject({status:'conflict'});
 expect(await executeManagerReminder(owner,c,db.executor)).toEqual(r);
});
it.each(['AVAILABILITY','COMMUNICATION'] as const)('manager %s reminder: queue fault rolls back audited operation',async kind=>{
 const c=await managerReminderFixture(kind);await q("CREATE FUNCTION fixture_reminder_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture_reminder_fault'; END $$; CREATE TRIGGER fixture_reminder_fault BEFORE INSERT ON notifications FOR EACH ROW WHEN (NEW.purpose='REMINDER') EXECUTE FUNCTION fixture_reminder_fault()");
 expect(await executeManagerReminder(owner,c,db.executor)).toMatchObject({status:'outcome_unknown'});
 expect(await q("SELECT * FROM employee_attention_operations WHERE result->>'kind'='MANAGER_REMINDER'")).toEqual([]);
 expect(await findManagerReminderOperation(owner,c.operationId,c.authority,db.executor)).toMatchObject({status:'unavailable',reason:'operation_not_found'});
});
it('manager reminder targets use canonical recipient IDs without adding employee roster access',async()=>{
 const {r}=await publish();
 expect(await readCommunication(owner,r.id,db.executor)).toMatchObject({state:'ready',management:{recipients:[{employeeId:'employee',name:'Fictional Self',acknowledgedAt:null}]}});
 const own=await readCommunication(employee,r.id,db.executor);expect(own.state).toBe('ready');expect(own).not.toHaveProperty('management');
});
it.each(['AVAILABILITY','COMMUNICATION'] as const)('manager %s reminder: source and recipient changes invalidate an unqueued command',async kind=>{
 const c=await managerReminderFixture(kind);
 await q("UPDATE employees SET active=false WHERE id='employee'");expect(await executeManagerReminder(owner,c,db.executor)).toMatchObject({status:'conflict'});await q("UPDATE employees SET active=true WHERE id='employee'");
 if(c.kind==='AVAILABILITY')await q("UPDATE schedule_week_settings SET availability_deadline=availability_deadline+interval '1 hour' WHERE week_start=$1",[c.weekStart]);
 else expect(await executeCommunicationCommand(owner,{...(await command({...draft,body:'New required revision'})),kind:'REVISE',communicationId:c.communicationId,expectedRevisionId:c.expectedRevisionId},db.executor)).toMatchObject({status:'committed'});
 expect(await executeManagerReminder(owner,c,db.executor)).toMatchObject({status:'conflict'});
 await q("UPDATE employees SET active=false WHERE id='employee'");expect(await executeManagerReminder(owner,{...c,operationId:randomUUID()},db.executor)).toMatchObject({status:'conflict'});
 expect(await q("SELECT * FROM notifications WHERE purpose='REMINDER'")).toEqual([]);
});
it.each(['AVAILABILITY','COMMUNICATION'] as const)('manager %s reminder: company grant, role and live session control commands and lookup',async kind=>{
 const c=await managerReminderFixture(kind);
 expect(await executeManagerReminder(employee,{...c,authority:communicationAuthority(employee)},db.executor)).toMatchObject({status:'blocked'});
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('reminder-manager','Fictional','Manager','QA-NO-PHONE','MANAGER','loc-1')");
 const manager={...owner,employee:{...owner.employee,id:'reminder-manager',role:'MANAGER' as const},sessionTokenHash:'f'.repeat(64)};
 await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,$2,clock_timestamp()+interval '1 day')",[manager.sessionTokenHash,manager.employee.id]);
 const mc={...c,authority:communicationAuthority(manager)};
 expect(await executeManagerReminder(manager,mc,db.executor)).toMatchObject({status:'blocked'});
 const context=await readOwnerOperationalScope(owner,manager.employee.id,db.executor);if(context.state!=='ready')throw Error('No manager context');const cur=context.data.current;
 expect(await assignOperationalScope(owner,manager.employee.id,{operationId:randomUUID(),action:'ASSIGN',expectedEmployeeVersion:cur.employeeUpdatedAt,expectedRoleGeneration:cur.roleGeneration,expectedScopeRevision:cur.scopeRevision,scope:{mode:'COMPANY',locationIds:[]}},db.executor)).toMatchObject({state:'saved'});
 expect(await executeManagerReminder(manager,mc,db.executor)).toMatchObject({status:'committed'});
 await q('DELETE FROM employee_sessions WHERE token_hash=$1',[manager.sessionTokenHash]);
 expect(await executeManagerReminder(manager,{...mc,operationId:randomUUID()},db.executor)).toMatchObject({status:'blocked'});
 expect(await findManagerReminderOperation(manager,mc.operationId,mc.authority,db.executor)).toMatchObject({status:'blocked'});
 expect(await findManagerReminderOperation(owner,mc.operationId,c.authority,db.executor)).toMatchObject({status:'unavailable',reason:'operation_not_found'});
});
it('optional, withdrawn, expired, and revoked-grant communications cannot be reminded',async()=>{
 for(const action of ['optional','withdrawn','expired','revoked'] as const){
  const c=await command({...draft,acknowledgement:action==='optional'?'OPTIONAL':'REQUIRED',expiresAt:action==='expired'?new Date(Date.now()+3000).toISOString():null});
  const r=await executeCommunicationCommand(owner,c,db.executor);if(r.status!=='committed')throw Error('No communication');
  if(action==='withdrawn')expect(await executeCommunicationCommand(owner,{kind:'WITHDRAW',operationId:randomUUID(),authority:c.authority,communicationId:r.id,expectedRevisionId:r.version},db.executor)).toMatchObject({status:'committed'});
  if(action==='expired')await new Promise(resolve=>setTimeout(resolve,3100));
  if(action==='revoked')await q("UPDATE employees SET primary_location_id='loc-2' WHERE id='employee'");
  expect(await executeManagerReminder(owner,{kind:'COMMUNICATION',operationId:randomUUID(),authority:c.authority,employeeId:'employee',communicationId:r.id,expectedRevisionId:r.version},db.executor)).toMatchObject({status:'conflict'});
 }
 expect(await q("SELECT * FROM notifications WHERE purpose='REMINDER'")).toEqual([]);
});
it.each(['AVAILABILITY','COMMUNICATION'] as const)('manager %s reminder: lost response recovers durable atomic receipt',async kind=>{
 const c=await managerReminderFixture(kind);let committed=false;
 const transport:SqlExecutor={...db.executor,transaction:async(statements,signal)=>{const rows=await db.executor.transaction(statements,signal);if(!committed&&statements.some(s=>s.text.includes("'manager-reminder-operation:'"))){committed=true;throw Error('Fictional connection lost after commit');}return rows;}};
 expect(await executeManagerReminder(owner,c,transport)).toMatchObject({status:'outcome_unknown'});
 const recovered=await findManagerReminderOperation(owner,c.operationId,c.authority,db.executor);expect(recovered).toMatchObject({status:'committed',disposition:'queued'});
 expect(await executeManagerReminder(owner,c,db.executor)).toEqual(recovered);
 await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('e',64),'owner',clock_timestamp()+interval '1 day')");
 const replacement={...owner,sessionTokenHash:'e'.repeat(64)};
 expect(await findManagerReminderOperation(replacement,c.operationId,communicationAuthority(replacement),db.executor)).toMatchObject({status:'unavailable',reason:'operation_not_found'});
 expect(await q("SELECT count(*)::int AS count FROM notifications WHERE purpose='REMINDER'")).toEqual([{count:1}]);
});
it.each(['AVAILABILITY','COMMUNICATION'] as const)('manager %s reminder: audit failure rolls back queued notification',async kind=>{
 const c=await managerReminderFixture(kind);await q("CREATE FUNCTION fixture_reminder_audit_fault() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture_reminder_audit_fault'; END $$; CREATE TRIGGER fixture_reminder_audit_fault BEFORE INSERT ON employee_attention_operations FOR EACH ROW WHEN (NEW.result->>'kind'='MANAGER_REMINDER') EXECUTE FUNCTION fixture_reminder_audit_fault()");
 expect(await executeManagerReminder(owner,c,db.executor)).toMatchObject({status:'outcome_unknown'});
 expect(await q("SELECT * FROM notifications WHERE purpose='REMINDER'")).toEqual([]);
 expect(await q("SELECT * FROM employee_attention_operations WHERE result->>'kind'='MANAGER_REMINDER'")).toEqual([]);
});
it.each(['AVAILABILITY','COMMUNICATION'] as const)('manager %s reminder: quiet-hour command queues for the next local 07:00',async kind=>{
 const {businessTime}=await import('../../lib/business-time');
 const zone=Intl.supportedValuesOf('timeZone').find(zone=>businessTime(new Date(),zone).slice(0,2)==='22');if(!zone)throw Error('Missing quiet timezone');
 await q('UPDATE workspaces SET time_zone=$1',[zone]);
 const c=await managerReminderFixture(kind);expect(await executeManagerReminder(owner,c,db.executor)).toMatchObject({status:'committed'});
 expect(await q("SELECT EXTRACT(hour FROM due_at AT TIME ZONE $1)::int AS hour, due_at>clock_timestamp() AS future FROM notifications WHERE purpose='REMINDER'",[zone])).toEqual([{hour:7,future:true}]);
});
it('communication reminder delivery source guard requires the current missing required receipt',async()=>{
 const {communicationIntentAllowedSql}=await import('../../lib/communications/sql');
 const {sqlNotificationStateRepository}=await import('../../lib/data/notification-state');
 const c=await managerReminderFixture('COMMUNICATION');if(c.kind!=='COMMUNICATION')throw Error('Wrong fixture');
 const result=await executeManagerReminder(owner,c,db.executor);if(result.status!=='committed')throw Error('No reminder');
 const state=sqlNotificationStateRepository(db.executor),intent=await state.findIntent(result.notificationId);if(!intent)throw Error('No intent');
 expect(await state.check(intent,'employee',new Date())).toMatchObject({deliverable:true});
 expect(await q(`SELECT ${communicationIntentAllowedSql()} AS allowed FROM notifications n WHERE n.id=$1`,[result.notificationId])).toEqual([{allowed:true}]);
 const read=await readCommunication(employee,c.communicationId,db.executor);if(read.state!=='ready')throw Error('No update');
 expect(await executeCommunicationCommand(employee,{kind:'ACKNOWLEDGE',operationId:randomUUID(),authority:communicationAuthority(employee),communicationId:c.communicationId,expectedRevisionId:c.expectedRevisionId,contentHash:read.contentHash},db.executor)).toMatchObject({status:'committed'});
 expect(await state.check(intent,'employee',new Date())).toMatchObject({deliverable:false});
 expect(await q(`SELECT ${communicationIntentAllowedSql()} AS allowed FROM notifications n WHERE n.id=$1`,[result.notificationId])).toEqual([{allowed:false}]);
});
it.each(['AVAILABILITY','COMMUNICATION'] as const)('manager %s reminder: final source/session checks reject a race after planning',async kind=>{
 const c=await managerReminderFixture(kind);let changed=false;
 const race:SqlExecutor={...db.executor,transaction:async(statements,signal)=>{
  if(!changed&&statements.some(s=>s.text.includes("'manager-reminder-operation:'"))){changed=true;
   if(c.kind==='AVAILABILITY')await q("INSERT INTO weekly_availability_submissions(week_start,employee_id) VALUES($1::date,'employee')",[c.weekStart]);
   else await q("UPDATE employees SET primary_location_id='loc-2' WHERE id='employee'");
  }
  return db.executor.transaction(statements,signal);
 }};
 expect(await executeManagerReminder(owner,c,race)).toMatchObject({status:'conflict'});expect(await q("SELECT * FROM notifications WHERE purpose='REMINDER'")).toEqual([]);
 const revoked:SqlExecutor={...db.executor,transaction:async(statements,signal)=>{if(statements.some(s=>s.text.includes('AS "expiresAt"')))await q("DELETE FROM employee_sessions WHERE employee_id='owner'");return db.executor.transaction(statements,signal);}};
 expect(await executeManagerReminder(owner,{...c,operationId:randomUUID()},revoked)).toMatchObject({status:'blocked'});
});
it.each(['AVAILABILITY','COMMUNICATION'] as const)('manager %s reminder: session expiry inside queue work rolls back queue and audit',async kind=>{
 const c=await managerReminderFixture(kind);await q("CREATE FUNCTION fixture_reminder_delay() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(0.3); RETURN NEW; END $$; CREATE TRIGGER fixture_reminder_delay BEFORE INSERT ON notifications FOR EACH ROW WHEN (NEW.purpose='REMINDER') EXECUTE FUNCTION fixture_reminder_delay()");
 const expiring:SqlExecutor={...db.executor,transaction:async(statements,signal)=>{
  if(statements.some(s=>s.text.includes("'manager-reminder-operation:'")))await q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '200 milliseconds' WHERE employee_id='owner'");
  return db.executor.transaction(statements,signal);
 }};
 expect(await executeManagerReminder(owner,c,expiring)).toMatchObject({status:'blocked'});
 expect(await q("SELECT * FROM notifications WHERE purpose='REMINDER'")).toEqual([]);
 expect(await q("SELECT * FROM employee_attention_operations WHERE result->>'kind'='MANAGER_REMINDER'")).toEqual([]);
});
it('an older required update without an expiry remains eligible for a bounded new reminder',async()=>{
 const {communicationRootInsert,communicationRevisionInsert,communicationGrantInsert,communicationContentHash}=await import('../../lib/data/communications.server');
 const [{id:workspaceId}]=await q('SELECT id FROM workspaces WHERE singleton') as {id:string}[];
 const id=randomUUID(),revisionId=randomUUID(),old=new Date(Date.now()-40*86400000).toISOString();
 await db.executor.transaction([
  communicationRootInsert(workspaceId,id,owner.employee.id),
  communicationRevisionInsert({workspaceId,communicationId:id,revisionId,version:1,actorId:owner.employee.id,draft,audienceFingerprint:'a'.repeat(64),observedAt:old,publishedAt:old}),
  communicationGrantInsert({workspaceId,communicationId:id,revisionId,employeeId:'employee',contentHash:communicationContentHash(draft),locationId:'loc-1',observedAt:old,provenance:{source:'fictional-old-update-fixture'},kind:'LOCATION'}),
  {text:"UPDATE communications SET state='PUBLISHED',head_revision_id=$2::uuid WHERE id=$1::uuid",values:[id,revisionId]},
 ]);
 expect(await readCommunication(employee,id,db.executor)).toMatchObject({state:'ready',acknowledgement:'REQUIRED'});
 expect(await executeManagerReminder(owner,{kind:'COMMUNICATION',operationId:randomUUID(),authority:communicationAuthority(owner),employeeId:'employee',communicationId:id,expectedRevisionId:revisionId},db.executor)).toMatchObject({status:'committed'});
 expect(await q("SELECT expires_at>clock_timestamp() AS future,expires_at<=clock_timestamp()+interval '30 days' AS bounded FROM notifications WHERE purpose='REMINDER'")).toEqual([{future:true,bounded:true}]);
});

// The worker scanner and the manual command plan independently, then reach their
// real outbox transactions together. No source, authority or persistence is mocked.
it('scanner and manual availability reminder races spend only one shared delivery-day budget',async()=>{
 const [time]=await q('SELECT to_jsonb(clock_timestamp()) AS instant') as {instant:string}[];
 // A real named business zone at local noon isolates this race from quiet/day boundaries.
 const instant=new Date(time.instant),timeZone=Intl.supportedValuesOf('timeZone').find(zone=>new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',hourCycle:'h23'}).format(instant)==='12');
 if(!timeZone)throw Error('Expected a named business timezone at local noon');
 await q('UPDATE workspaces SET time_zone=$1',[timeZone]);
 const initial=await managerReminderFixture('AVAILABILITY');
 if(initial.kind!=='AVAILABILITY')throw Error('Expected availability fixture');
 const [source]=await q("UPDATE schedule_week_settings SET availability_deadline=date_trunc('milliseconds',clock_timestamp()+interval '18 hours') WHERE week_start=$1::date RETURNING to_char(availability_deadline,'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"') AS deadline",[initial.weekStart]) as {deadline:string}[];
 const command={...initial,expectedDeadline:source.deadline};
 let arrivals=0,release!:()=>void;const ready=new Promise<void>(resolve=>{release=resolve;});
 const executor:SqlExecutor={...db.executor,transaction:async(statements,signal)=>{
  const targetInsert=statements.some(statement=>statement.text.includes('INSERT INTO notifications')&&statement.values[1]==='employee'&&statement.values[8]==='AVAILABILITY'&&statement.values[9]===command.weekStart);
  if(targetInsert){if(++arrivals===2)release();let timer:ReturnType<typeof setTimeout>|undefined;
   try{await Promise.race([ready,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Both real reminder writers must reach persistence')),5000);})]);}finally{clearTimeout(timer);}}
  return db.executor.transaction(statements,signal);
 }};
 const workspace=await getWorkspace(executor),base=readNotificationConfig({PUSH_ENVIRONMENT:'test'});
 const config={...base,workspace,featureEnabled:true,policy:{...base.policy,timeZone}};
 const [manual]=await Promise.all([executeManagerReminder(owner,command,executor),runReminders({executor,state:sqlNotificationStateRepository(executor,workspace),config,clock:()=>new Date()})]);
 expect(arrivals).toBe(2);expect(manual).toMatchObject({status:'committed'});
 expect(await q("SELECT count(*)::int count FROM notifications WHERE purpose='REMINDER' AND source_kind='AVAILABILITY' AND source_id=$1 AND employee_id='employee'",[command.weekStart])).toEqual([{count:1}]);
 expect(await findManagerReminderOperation(owner,command.operationId,command.authority,db.executor)).toEqual(manual);
 expect(await q("SELECT count(*)::int count FROM employee_attention_operations WHERE operation_id=$1::uuid AND result->>'kind'='MANAGER_REMINDER'",[command.operationId])).toEqual([{count:1}]);
});
