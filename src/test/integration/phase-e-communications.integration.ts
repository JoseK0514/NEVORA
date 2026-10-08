import {afterEach,beforeEach,expect,it} from 'vitest';
import {randomUUID} from 'node:crypto';
import {Client} from 'pg';
import {createDisposableFoundationDatabase} from './local-postgres';
import {previewCommunicationAudience,executeCommunicationCommand,readCommunication,listEmployeeCommunications,findCommunicationOperation,communicationAuthority} from '../../lib/communications/service.server';
import type {CommunicationDraft,CommunicationCommand} from '../../lib/communications/types';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import type {SqlExecutor} from '../../lib/notifications/types';
import {currentShiftFingerprintSql,currentShiftTermsSql} from '../../lib/data/shift-change-release';
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
 const {r}=await publish();await q("UPDATE employees SET active=false WHERE id='owner'");
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('manager','Fictional','Manager','555-0103','MANAGER','loc-1')");
 const manager={...owner,employee:{...owner.employee,id:'manager',role:'MANAGER' as const},sessionTokenHash:'d'.repeat(64)};
 await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'manager',now()+interval '1 day')",[manager.sessionTokenHash]);
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
