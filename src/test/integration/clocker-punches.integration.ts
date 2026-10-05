import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createDisposableFoundationDatabase } from './local-postgres';
import { registerClockerDevice, redeemClockerEnrollment, authenticateClockerDevice, revokeClockerDevice } from '../../lib/clocker/devices.server';
import { setEmployeeClockerPin, verifyEmployeeClockerPin, readClockerIdentity, clearClockerIdentity } from '../../lib/clocker/pins.server';
import { executeClockerPunch, readClockerPunchState, reconcileClockerPunch } from '../../lib/clocker/punches.server';
import type { PunchAction, PunchCommand, PunchState } from '../../lib/clocker/punch-command';
import type { ClockerIdentityProof } from '../../lib/clocker/pin-identity.server';
import type { SqlExecutor } from '../../lib/notifications/types';
const key=Buffer.alloc(32,59),owner={employeeId:'c3-owner',sessionTokenHash:'a'.repeat(64)};
let db:Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
let identity:ClockerIdentityProof;
let device:NonNullable<Awaited<ReturnType<typeof authenticateClockerDevice>>>;
const q=<T=Record<string,unknown>>(text:string,values:readonly unknown[]=[])=>db.executor.query<T>({text,values});
async function enroll(locationId='loc-1',locationKey='2'){
 const pending=await registerClockerDevice(owner,{name:'Synthetic punch tablet',locationId},db.executor);
 const registered=await redeemClockerEnrollment({enrollmentToken:pending.enrollmentToken,locationKey},db.executor);
 return (await authenticateClockerDevice({credential:registered.credential,locationKey},db.executor))!;
}
async function identify(selected=device,pin='1234'){
 const verified=await verifyEmployeeClockerPin(selected.proof,pin,key,db.executor);
 if(verified.state!=='verified')throw Error('Fixture PIN verification failed');
 return (await readClockerIdentity(selected.proof,verified.token,key,db.executor))!.proof;
}
beforeEach(async()=>{
 db=await createDisposableFoundationDatabase({mode:'current-runtime'});
 for(const name of ['clocker-devices','clocker-pins','clocker-punches'])await q(await readFile(`db/phase-c/${name}.sql`,'utf8'));
 await q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES
 ('c3-owner','Test','Owner','555','OWNER','loc-1'),('c3-a','Avery','Test','556','EMPLOYEE','loc-1'),('c3-b','Blair','Test','557','EMPLOYEE','loc-1');
 INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('a',64),'c3-owner',now()+interval '1 day');
 INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('c3-a','loc-1'),('c3-a','loc-2'),('c3-b','loc-1');`);
 await setEmployeeClockerPin(owner,{employeeId:'c3-a',pin:'1234',expectedVersion:0},key,db.executor);
 device=await enroll();identity=await identify();
});
afterEach(async()=>{if(db)await db.dispose();});
const state=()=>readClockerPunchState(identity,db.executor);
function command(action:PunchAction,current:PunchState):PunchCommand{
 const entry=current.currentEntry,pause=entry?.breaks.find(b=>b.endAt===null);
 return {commandId:randomUUID(),action,expectedRevision:current.revision,
  expectedEntryId:entry?.id??null,expectedEntryVersion:entry?.version??null,
  expectedBreakId:pause?.id??null,expectedBreakVersion:pause?.version??null};
}
async function punch(action:PunchAction){return executeClockerPunch(identity,command(action,await state()),db.executor);}
it('persists all four transitions with one server timestamp per command and no required schedule',async()=>{
 expect(await state()).toEqual({revision:0,currentEntry:null});
 const started=await punch('CLOCK_IN');expect(started.entry.status).toBe('CLOCKED_IN');expect(started.recordedAt).toBe(started.entry.clockInAt);
 const paused=await punch('START_BREAK');expect(paused.entry.status).toBe('ON_BREAK');expect(paused.entry.breaks[0].startAt).toBe(paused.recordedAt);
 const resumed=await punch('END_BREAK');expect(resumed.entry.status).toBe('CLOCKED_IN');expect(resumed.entry.breaks[0].endAt).toBe(resumed.recordedAt);
 const closed=await punch('CLOCK_OUT');expect(closed.entry.status).toBe('CLOCKED_OUT');expect(closed.entry.clockOutAt).toBe(closed.recordedAt);
 expect(await state()).toEqual({revision:4,currentEntry:null});
 expect(await q('SELECT count(*)::int AS n FROM time_entries')).toEqual([{n:1}]);
 expect(await q('SELECT count(*)::int AS n FROM clocker_command_ledger')).toEqual([{n:4}]);
});
it('Clock Out atomically closes its open break and time entry',async()=>{
 await punch('CLOCK_IN');await punch('START_BREAK');const r=await punch('CLOCK_OUT');
 expect(r.entry.breaks[0].endAt).toBe(r.entry.clockOutAt);expect(r.entry.breaks[0].version).toBe(2);
 expect(await state()).toEqual({revision:3,currentEntry:null});
});
it('retries return the exact saved receipt even after subsequent punches',async()=>{
 const cmd=command('CLOCK_IN',await state());const original=await executeClockerPunch(identity,cmd,db.executor);
 await punch('START_BREAK');expect(await executeClockerPunch(identity,cmd,db.executor)).toEqual(original);
 expect(await reconcileClockerPunch(identity,cmd.commandId,db.executor)).toEqual(original);
 expect(await q('SELECT count(*)::int AS n FROM clocker_command_ledger')).toEqual([{n:2}]);
});
it('two simultaneous identical commands produce one write and the same receipt',async()=>{
 const cmd=command('CLOCK_IN',await state());
 const results=await Promise.all([executeClockerPunch(identity,cmd,db.executor),executeClockerPunch(identity,cmd,db.executor)]);
 expect(results[0]).toEqual(results[1]);expect(await q('SELECT count(*)::int AS n FROM time_entries')).toEqual([{n:1}]);
});
it('reusing a command ID with a different payload is rejected',async()=>{
 const cmd=command('CLOCK_IN',await state());await executeClockerPunch(identity,cmd,db.executor);
 await expect(executeClockerPunch(identity,{...cmd,expectedRevision:8},db.executor)).rejects.toMatchObject({code:'COMMAND_REUSED'});
});
it('two different tablets cannot create simultaneous open entries for an employee',async()=>{
 const other=await identify(await enroll());const current=await state();
 const results=await Promise.allSettled([executeClockerPunch(identity,command('CLOCK_IN',current),db.executor),executeClockerPunch(other,command('CLOCK_IN',current),db.executor)]);
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
 expect(await q('SELECT count(*)::int AS n FROM time_entries WHERE clock_out_at IS NULL')).toEqual([{n:1}]);
});
it('old off-clock revisions cannot create a later shift after an intervening shift',async()=>{
 const delayed=command('CLOCK_IN',await state());await punch('CLOCK_IN');await punch('CLOCK_OUT');
 await expect(executeClockerPunch(identity,delayed,db.executor)).rejects.toMatchObject({code:'STALE'});
 expect(await q('SELECT count(*)::int AS n FROM time_entries')).toEqual([{n:1}]);
});
it('an old End Break command cannot close a newer break in the same entry',async()=>{
 await punch('CLOCK_IN');await punch('START_BREAK');const delayed=command('END_BREAK',await state());
 await punch('END_BREAK');await punch('START_BREAK');
 await expect(executeClockerPunch(identity,delayed,db.executor)).rejects.toMatchObject({code:'STALE'});
 expect((await state()).currentEntry!.breaks.filter(b=>b.endAt===null)).toHaveLength(1);
});
it('rejects a forged expected entry ID while keeping its actual current entry intact',async()=>{
 await punch('CLOCK_IN');const cmd={...command('CLOCK_OUT',await state()),expectedEntryId:'someone-else'};
 await expect(executeClockerPunch(identity,cmd,db.executor)).rejects.toMatchObject({code:'STALE'});
 expect((await state()).currentEntry!.status).toBe('CLOCKED_IN');
});
it('a registered tablet at another location cannot close this location’s entry',async()=>{
 await punch('CLOCK_IN');const other=await identify(await enroll('loc-2','110'));
 await expect(executeClockerPunch(other,command('CLOCK_OUT',await state()),db.executor)).rejects.toMatchObject({code:'WRONG_LOCATION'});
 expect((await state()).currentEntry!.status).toBe('CLOCKED_IN');
});
it('ledger failure rolls back every time write and revision increment',async()=>{
 await q(`CREATE FUNCTION c3_fail_ledger() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic failure'; END; $$;
 CREATE TRIGGER c3_fail_ledger BEFORE INSERT ON clocker_command_ledger FOR EACH ROW EXECUTE FUNCTION c3_fail_ledger();`);
 await expect(punch('CLOCK_IN')).rejects.toMatchObject({code:'UNAVAILABLE'});
 expect(await state()).toEqual({revision:0,currentEntry:null});expect(await q('SELECT id FROM time_entries')).toEqual([]);
});
it('a lost committed response is reconciled from the ledger without a new command',async()=>{
 const cmd=command('CLOCK_IN',await state());
 const executor:SqlExecutor={query:(s,signal)=>db.executor.query(s,signal),transaction:async statements=>{
  const result=await db.executor.transaction(statements);
  if(statements.some(s=>s.text.includes('INSERT INTO clocker_command_ledger')))throw Error('synthetic lost response');
  return result;
 }};
 await expect(executeClockerPunch(identity,cmd,executor)).rejects.toMatchObject({code:'UNAVAILABLE'});
 const receipt=await reconcileClockerPunch(identity,cmd.commandId,db.executor);expect(receipt?.entry.status).toBe('CLOCKED_IN');
 expect(await executeClockerPunch(identity,cmd,db.executor)).toEqual(receipt);
 expect(await q('SELECT count(*)::int AS n FROM time_entries')).toEqual([{n:1}]);
});
it('receipt history cannot be updated or deleted',async()=>{
 await punch('CLOCK_IN');await expect(q('DELETE FROM clocker_command_ledger')).rejects.toMatchObject({code:'23514'});
 await expect(q("UPDATE clocker_command_ledger SET result='{}'")).rejects.toMatchObject({code:'23514'});
});
it.each(['expired','pin-reset','inactive','revoked-device','privacy-clear'])('denies a previously obtained proof after %s',async kind=>{
 const cmd=command('CLOCK_IN',await state());
 if(kind==='expired')await q("UPDATE clocker_pin_sessions SET expires_at=clock_timestamp()-interval '1 second'");
 if(kind==='pin-reset')await setEmployeeClockerPin(owner,{employeeId:'c3-a',pin:'5678',expectedVersion:1},key,db.executor);
 if(kind==='inactive')await q("UPDATE employees SET active=false WHERE id='c3-a'");
 if(kind==='revoked-device')await revokeClockerDevice(owner,{deviceId:device.device.id,expectedVersion:2},db.executor);
 if(kind==='privacy-clear')await clearClockerIdentity(device.proof,'',db.executor);
 await expect(executeClockerPunch(identity,cmd,db.executor)).rejects.toThrow();
 expect(await q('SELECT * FROM time_entries')).toEqual([]);
});
it('reconciliation returns no receipt for a different employee on the same tablet',async()=>{
 const r=await punch('CLOCK_IN');await setEmployeeClockerPin(owner,{employeeId:'c3-b',pin:'4567',expectedVersion:0},key,db.executor);
 const other=await identify(device,'4567');expect(await reconcileClockerPunch(other,r.commandId,db.executor)).toBeNull();
});
it('closes a legacy overnight entry without rewriting its original timestamp',async()=>{
 await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status) VALUES('overnight','c3-a','loc-1',$1,'2020-01-01T23:00:00Z','CLOCKED_IN')",[device.device.id]);
 const r=await punch('CLOCK_OUT');expect(r.entry.clockInAt).toBe('2020-01-01T23:00:00.000000Z');expect(r.entry.clockOutAt).toBe(r.recordedAt);
});
it('an inconsistent open break state fails closed rather than repairing history silently',async()=>{
 await punch('CLOCK_IN');await q("UPDATE time_entries SET status='ON_BREAK'");
 await expect(state()).rejects.toMatchObject({code:'UNAVAILABLE'});
 expect(await q('SELECT count(*)::int AS n FROM clocker_command_ledger')).toEqual([{n:1}]);
});

it('simultaneous Start Break and Clock Out cannot both act on one expected revision',async()=>{
 await punch('CLOCK_IN');const current=await state();
 const results=await Promise.allSettled(['START_BREAK','CLOCK_OUT'].map(action=>executeClockerPunch(identity,command(action as PunchAction,current),db.executor)));
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
 const persisted=await state();expect(persisted.revision).toBe(2);
 expect(persisted.currentEntry===null||persisted.currentEntry.status==='ON_BREAK').toBe(true);
});
it('a stale Clock Out cannot close a later entry for the same employee',async()=>{
 await punch('CLOCK_IN');const old=command('CLOCK_OUT',await state());
 await punch('CLOCK_OUT');await punch('CLOCK_IN');
 await expect(executeClockerPunch(identity,old,db.executor)).rejects.toMatchObject({code:'STALE'});
 expect((await state()).currentEntry!.id).not.toBe(old.expectedEntryId);
});
it('a server time earlier than recorded history aborts without changing that history',async()=>{
 await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status) VALUES('future-entry','c3-a','loc-1',$1,'2200-01-01T00:00:00Z','CLOCKED_IN')",[device.device.id]);
 await expect(punch('CLOCK_OUT')).rejects.toMatchObject({code:'UNAVAILABLE'});
 expect(await q('SELECT clock_out_at FROM time_entries')).toEqual([{clock_out_at:null}]);
 expect(await q('SELECT * FROM clocker_command_ledger')).toEqual([]);
});
it('a suppressed database update cannot be reported as a successful punch',async()=>{
 await punch('CLOCK_IN');
 await q(`CREATE FUNCTION c3_suppress_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END; $$;
 CREATE TRIGGER c3_suppress_update BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION c3_suppress_update();`);
 await expect(punch('CLOCK_OUT')).rejects.toMatchObject({code:'UNAVAILABLE'});
 expect((await state()).revision).toBe(1);
 expect(await q('SELECT count(*)::int AS n FROM clocker_command_ledger')).toEqual([{n:1}]);
});
it('a missing schema is unavailable, not an off-clock state',async()=>{
 await q('ALTER TABLE clocker_employee_state RENAME TO unavailable_punch_state');
 await expect(state()).rejects.toMatchObject({code:'UNAVAILABLE'});
});
it('unseen command reconciliation returns null without creating an entry or ledger',async()=>{
 expect(await reconcileClockerPunch(identity,randomUUID(),db.executor)).toBeNull();
 expect(await q('SELECT * FROM time_entries')).toEqual([]);expect(await q('SELECT * FROM clocker_command_ledger')).toEqual([]);
});

import { Client } from 'pg';
import type { SqlStatement } from '../../lib/notifications/types';
it('session expiry during a real blocked ledger insert rolls back the entire punch',async()=>{
 const cmd=command('CLOCK_IN',await state());
 const blocker=new Client({connectionString:db.connectionString}),worker=new Client({connectionString:db.connectionString});
 await blocker.connect();await worker.connect();const pid=(await worker.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
 const executor:SqlExecutor={query:async<T>(s:SqlStatement)=>(await worker.query(s.text,[...s.values])).rows as T[],transaction:async statements=>{
  if(statements.some(s=>s.text.includes('INSERT INTO clocker_command_ledger'))){
   await q("UPDATE clocker_pin_sessions SET expires_at=clock_timestamp()+interval '1 second' WHERE device_id=$1",[device.device.id]);
  }
  await worker.query('BEGIN');try{const rows:unknown[][]=[];for(const s of statements)rows.push((await worker.query(s.text,[...s.values])).rows);await worker.query('COMMIT');return rows;}
  catch(error){await worker.query('ROLLBACK');throw error;}
 }};
 let pending:Promise<unknown>|undefined;
 try{
  await blocker.query('BEGIN');await blocker.query('LOCK TABLE clocker_command_ledger IN SHARE MODE');
  const outcome=executeClockerPunch(identity,cmd,executor).then(value=>({value}),error=>({error}));pending=outcome;
  let observed=false;for(let n=0;n<200;n++){
   const [row]=await q<{blocked:boolean}>('SELECT cardinality(pg_blocking_pids($1))>0 AS blocked',[pid]);
   if(row.blocked){observed=true;break;}await new Promise(r=>setTimeout(r,10));
  }
  expect(observed,'punch reaches its blocked ledger insert after time writes').toBe(true);
  await q("SELECT pg_sleep(GREATEST(0,extract(epoch FROM expires_at-clock_timestamp()))::double precision+0.05) FROM clocker_pin_sessions WHERE device_id=$1",[device.device.id]);
  await blocker.query('COMMIT');expect(await outcome).toMatchObject({error:{code:'UNAUTHORIZED'}});
  expect(await q('SELECT * FROM time_entries')).toEqual([]);expect(await q('SELECT * FROM clocker_command_ledger')).toEqual([]);
  expect(await q('SELECT * FROM clocker_employee_state')).toEqual([]);
 }finally{await blocker.query('ROLLBACK');await pending;await worker.end();await blocker.end();}
});
it('changed employee authority after a held row lock prevents a punch',async()=>{
 const cmd=command('CLOCK_IN',await state());
 const blocker=new Client({connectionString:db.connectionString});await blocker.connect();
 let pending:Promise<unknown>|undefined;
 try{
  await blocker.query('BEGIN');await blocker.query("SELECT id FROM employees WHERE id='c3-a' FOR UPDATE");
  const outcome=executeClockerPunch(identity,cmd,db.executor).then(value=>({value}),error=>({error}));pending=outcome;
  const blockerPid=(await blocker.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  let observed=false;for(let n=0;n<200;n++){
   const [row]=await q<{blocked:boolean}>("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND $1=ANY(pg_blocking_pids(pid))) AS blocked",[blockerPid]);
   if(row.blocked){observed=true;break;}await new Promise(r=>setTimeout(r,10));
  }
  expect(observed).toBe(true);await blocker.query("UPDATE employees SET active=false WHERE id='c3-a'");
  await blocker.query('COMMIT');expect(await outcome).toMatchObject({error:{code:'UNAUTHORIZED'}});
  expect(await q('SELECT * FROM time_entries')).toEqual([]);
 }finally{await blocker.query('ROLLBACK');await pending;await blocker.end();}
});
