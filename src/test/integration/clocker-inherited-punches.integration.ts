// Every child punch-engine scenario retained against the single canonical C5 service.
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createPunchFixture } from './clocker-punch-fixture';
import { ClockerPunchService } from '../../lib/clocker/punches.server';
import { setEmployeeClockerPin, clearClockerIdentity } from '../../lib/clocker/pins.server';
import { revokeClockerDevice } from '../../lib/clocker/devices.server';
import type { ClockerIdentityProof } from '../../lib/clocker/pin-identity.server';
import type { PunchAction, PunchCommand } from '../../lib/clocker/punch-types';
import type { SqlExecutor, SqlStatement } from '../../lib/notifications/types';
let f:Awaited<ReturnType<typeof createPunchFixture>>,service:ClockerPunchService,proof:ClockerIdentityProof;
beforeEach(async()=>{f=await createPunchFixture({breaks:true,companyAccess:true});service=new ClockerPunchService(f.key,f.db.executor);proof=(await f.identity()).proof;});
afterEach(async()=>{if(f)await f.db.dispose();});
const q=<T=Record<string,unknown>>(text:string,values:unknown[]=[])=>f.q<T>(text,values);
const state=async()=>(await service.read(proof)).snapshot;
async function command(action:PunchAction,actor=proof):Promise<PunchCommand>{
 const v=await service.read(actor),s=v.snapshot;
 return {commandId:randomUUID(),action,verificationId:v.verificationId,expected:{revision:s.revision,timeEntryId:s.entry?.id??null,timeEntryVersion:s.entry?.version??null,breakEntryId:s.break?.id??null,breakEntryVersion:s.break?.version??null},...(action==='START_BREAK'?{breakType:{id:f.breakType!.id,version:f.breakType!.version}}:{})};
}
const punch=async(action:PunchAction)=>service.execute(proof,await command(action));
it('persists all four transitions with one server timestamp per command and no required schedule',async()=>{
 expect(await state()).toEqual({revision:0,entry:null,break:null});
 const start=await punch('CLOCK_IN');expect(start.snapshot.entry?.clockInAt).toBe(start.performedAt);
 const pause=await punch('START_BREAK');expect(pause.snapshot.break?.breakStartAt).toBe(pause.performedAt);
 const resume=await punch('END_BREAK');expect(resume.snapshot.entry?.status).toBe('CLOCKED_IN');
 const end=await punch('CLOCK_OUT');expect(await state()).toEqual({revision:4,entry:null,break:null});
 const [row]=await q<{clock_out_at:Date}>('SELECT clock_out_at FROM time_entries');expect(row.clock_out_at.getTime()).toBe(Date.parse(end.performedAt));
 const [b]=await q<{break_end_at:Date}>('SELECT break_end_at FROM break_entries');expect(b.break_end_at.getTime()).toBe(Date.parse(resume.performedAt));
 expect(await q('SELECT count(*)::int AS n FROM time_entries')).toEqual([{n:1}]);expect(await q('SELECT count(*)::int AS n FROM clocker_command_ledger')).toEqual([{n:4}]);
});
it('Clock Out atomically closes its open break and time entry',async()=>{
 await punch('CLOCK_IN');await punch('START_BREAK');await punch('CLOCK_OUT');
 expect(await q('SELECT t.clock_out_at=b.break_end_at AS together,b.version FROM time_entries t JOIN break_entries b ON b.time_entry_id=t.id')).toEqual([{together:true,version:2}]);
 expect(await state()).toEqual({revision:3,entry:null,break:null});
});
it('retries return the exact saved receipt even after subsequent punches',async()=>{
 const c=await command('CLOCK_IN'),r=await service.execute(proof,c);await punch('START_BREAK');
 expect(await service.execute(proof,c)).toEqual(r);expect(await service.receipt(proof,c.commandId)).toEqual(r);
 expect(await q('SELECT count(*)::int AS n FROM clocker_command_ledger')).toEqual([{n:2}]);
});
it('two simultaneous identical commands produce one write and the same receipt',async()=>{
 const c=await command('CLOCK_IN'),r=await Promise.all([service.execute(proof,c),service.execute(proof,c)]);
 expect(r[0]).toEqual(r[1]);expect(await q('SELECT count(*)::int AS n FROM time_entries')).toEqual([{n:1}]);
});
it('reusing a command ID with a different payload is rejected',async()=>{
 const c=await command('CLOCK_IN');await service.execute(proof,c);
 await expect(service.execute(proof,{...c,expected:{...c.expected,revision:8}})).rejects.toMatchObject({code:'COMMAND_REUSED'});
});
it('two different tablets cannot create simultaneous open entries for an employee',async()=>{
 const other=(await f.identity(1)).proof,c=await command('CLOCK_IN'),d=await command('CLOCK_IN',other);
 const r=await Promise.allSettled([service.execute(proof,c),service.execute(other,d)]);expect(r.filter(x=>x.status==='fulfilled')).toHaveLength(1);
 expect(await q('SELECT count(*)::int AS n FROM time_entries WHERE clock_out_at IS NULL')).toEqual([{n:1}]);
});
it('old off-clock revisions cannot create a later shift after an intervening shift',async()=>{
 const old=await command('CLOCK_IN');await punch('CLOCK_IN');await punch('CLOCK_OUT');
 await expect(service.execute(proof,old)).rejects.toMatchObject({code:'STALE_STATE'});expect(await q('SELECT count(*)::int AS n FROM time_entries')).toEqual([{n:1}]);
});
it('an old End Break command cannot close a newer break in the same entry',async()=>{
 await punch('CLOCK_IN');await punch('START_BREAK');const old=await command('END_BREAK');await punch('END_BREAK');await punch('START_BREAK');
 await expect(service.execute(proof,old)).rejects.toMatchObject({code:'STALE_STATE'});expect((await state()).break).not.toBeNull();
});
it('rejects a forged expected entry ID while keeping its actual current entry intact',async()=>{
 await punch('CLOCK_IN');const c=await command('CLOCK_OUT');await expect(service.execute(proof,{...c,expected:{...c.expected,timeEntryId:'someone-else'}})).rejects.toMatchObject({code:'STALE_STATE'});
 expect((await state()).entry?.status).toBe('CLOCKED_IN');
});
it('a registered tablet at another location cannot close this location’s entry',async()=>{
 await punch('CLOCK_IN');const other=(await f.identity(2)).proof;
 await expect(service.execute(other,await command('CLOCK_OUT',other))).rejects.toMatchObject({code:'OTHER_LOCATION'});expect((await state()).entry?.status).toBe('CLOCKED_IN');
});
it('ledger failure rolls back every time write and revision increment',async()=>{
 await q(`CREATE FUNCTION inherited_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic failure'; END; $$;
 CREATE TRIGGER inherited_fail BEFORE INSERT ON clocker_command_ledger FOR EACH ROW EXECUTE FUNCTION inherited_fail();`);
 await expect(punch('CLOCK_IN')).rejects.toMatchObject({code:'UNAVAILABLE'});expect(await state()).toEqual({revision:0,entry:null,break:null});expect(await q('SELECT id FROM time_entries')).toEqual([]);
});
it('a lost committed response is reconciled from the ledger without a new command',async()=>{
 const c=await command('CLOCK_IN'),executor:SqlExecutor={query:(s,signal)=>f.db.executor.query(s,signal),transaction:async ss=>{
  const r=await f.db.executor.transaction(ss);if(ss.some(s=>s.text.includes('SELECT clocker_apply_punch')))throw Error('synthetic lost response');return r;
 }};
 await expect(new ClockerPunchService(f.key,executor).execute(proof,c)).rejects.toMatchObject({code:'UNAVAILABLE'});
 const r=await service.receipt(proof,c.commandId);expect(r?.snapshot.entry?.status).toBe('CLOCKED_IN');expect(await service.execute(proof,c)).toEqual(r);
 expect(await q('SELECT count(*)::int AS n FROM time_entries')).toEqual([{n:1}]);
});
it('receipt history cannot be updated or deleted',async()=>{
 await punch('CLOCK_IN');await expect(q('DELETE FROM clocker_command_ledger')).rejects.toMatchObject({code:'23514'});await expect(q("UPDATE clocker_command_ledger SET result='{}'")).rejects.toMatchObject({code:'23514'});
});
it.each(['expired','pin-reset','inactive','revoked-device','privacy-clear'])('denies a previously obtained proof after %s',async kind=>{
 const c=await command('CLOCK_IN');
 if(kind==='expired')await q("UPDATE clocker_pin_sessions SET expires_at=clock_timestamp()-interval '1 second'");
 if(kind==='pin-reset')await setEmployeeClockerPin(f.owner,{employeeId:'c34-a',pin:'5678',expectedVersion:1},f.key,f.db.executor);
 if(kind==='inactive')await q("UPDATE employees SET active=false WHERE id='c34-a'");
 if(kind==='revoked-device')await revokeClockerDevice(f.owner,{deviceId:f.devices[0].device.id,expectedVersion:2},f.db.executor);
 if(kind==='privacy-clear')await clearClockerIdentity(f.devices[0].proof,'',f.db.executor);
 await expect(service.execute(proof,c)).rejects.toThrow();expect(await q('SELECT * FROM time_entries')).toEqual([]);
});
it('reconciliation returns no receipt for a different employee on the same tablet',async()=>{
 const r=await punch('CLOCK_IN'),other=(await f.identity(0,'4567')).proof;expect(await service.receipt(other,r.commandId)).toBeNull();
});
it('closes a legacy overnight entry without rewriting its original timestamp',async()=>{
 await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status) VALUES('overnight','c34-a','loc-1',$1,'2020-01-01T23:00:00Z','CLOCKED_IN')",[f.devices[0].device.id]);
 const r=await punch('CLOCK_OUT');const [row]=await q<{clock_in_at:Date;clock_out_at:Date}>('SELECT clock_in_at,clock_out_at FROM time_entries');
 expect(row.clock_in_at.toISOString()).toBe('2020-01-01T23:00:00.000Z');expect(row.clock_out_at.getTime()).toBe(Date.parse(r.performedAt));
});
it('an inconsistent open break state fails closed rather than repairing history silently',async()=>{
 await punch('CLOCK_IN');await q("UPDATE time_entries SET status='ON_BREAK'");await expect(state()).rejects.toMatchObject({code:'INTEGRITY'});
 expect(await q('SELECT count(*)::int AS n FROM clocker_command_ledger')).toEqual([{n:1}]);
});
it('simultaneous Start Break and Clock Out cannot both act on one expected revision',async()=>{
 await punch('CLOCK_IN');const a=await command('START_BREAK'),b=await command('CLOCK_OUT');
 const r=await Promise.allSettled([service.execute(proof,a),service.execute(proof,b)]);expect(r.filter(x=>x.status==='fulfilled')).toHaveLength(1);
 const s=await state();expect(s.revision).toBe(2);expect(s.entry===null||s.entry.status==='ON_BREAK').toBe(true);
});
it('a stale Clock Out cannot close a later entry for the same employee',async()=>{
 await punch('CLOCK_IN');const old=await command('CLOCK_OUT');await punch('CLOCK_OUT');await punch('CLOCK_IN');
 await expect(service.execute(proof,old)).rejects.toMatchObject({code:'STALE_STATE'});expect((await state()).entry?.id).not.toBe(old.expected.timeEntryId);
});
it('a server time earlier than recorded history aborts without changing that history',async()=>{
 await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status) VALUES('future-entry','c34-a','loc-1',$1,'2200-01-01T00:00:00Z','CLOCKED_IN')",[f.devices[0].device.id]);
 await expect(punch('CLOCK_OUT')).rejects.toMatchObject({code:'CLOCK_INVALID'});expect(await q('SELECT clock_out_at FROM time_entries')).toEqual([{clock_out_at:null}]);expect(await q('SELECT * FROM clocker_command_ledger')).toEqual([]);
});
it('a suppressed database update cannot be reported as a successful punch',async()=>{
 await punch('CLOCK_IN');await q(`CREATE FUNCTION inherited_suppress() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END; $$;
 CREATE TRIGGER inherited_suppress BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION inherited_suppress();`);
 await expect(punch('CLOCK_OUT')).rejects.toMatchObject({code:'INTEGRITY'});expect((await state()).revision).toBe(1);
 expect(await q('SELECT count(*)::int AS n FROM clocker_command_ledger')).toEqual([{n:1}]);
});
it('a missing schema is unavailable, not an off-clock state',async()=>{
 await q('ALTER TABLE clocker_employee_clock_state RENAME TO unavailable_punch_state');await expect(state()).rejects.toMatchObject({code:'UNAVAILABLE'});
});
it('unseen command reconciliation returns null without creating an entry or ledger',async()=>{
 expect(await service.receipt(proof,randomUUID())).toBeNull();expect(await q('SELECT * FROM time_entries')).toEqual([]);expect(await q('SELECT * FROM clocker_command_ledger')).toEqual([]);
});
it.each(['ledger-expiry','employee-deactivation'])('inherited real database wait preserves authority: %s',async kind=>{
 const c=await command('CLOCK_IN'),blocker=new Client({connectionString:f.db.connectionString}),worker=new Client({connectionString:f.db.connectionString});
 await blocker.connect();await worker.connect();const pid=(await worker.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
 const executor:SqlExecutor={query:async<T>(s:SqlStatement)=>(await worker.query(s.text,[...s.values])).rows as T[],transaction:async ss=>{
  if(kind==='ledger-expiry')await q("UPDATE clocker_pin_sessions SET expires_at=clock_timestamp()+interval '1 second' WHERE device_id=$1",[f.devices[0].device.id]);
  await worker.query('BEGIN');try{const r:unknown[][]=[];for(const s of ss)r.push((await worker.query(s.text,[...s.values])).rows);await worker.query('COMMIT');return r;}catch(e){await worker.query('ROLLBACK');throw e;}
 }};
 let pending:Promise<unknown>|undefined;
 try{
  await blocker.query('BEGIN');await blocker.query(kind==='ledger-expiry'?'LOCK TABLE clocker_command_ledger IN SHARE MODE':"SELECT id FROM employees WHERE id='c34-a' FOR UPDATE");
  pending=new ClockerPunchService(f.key,executor).execute(proof,c).then(value=>({value}),error=>({error}));
  let blocked=false;for(let n=0;n<200;n++){const [r]=await q<{blocked:boolean}>('SELECT cardinality(pg_blocking_pids($1))>0 AS blocked',[pid]);if(r.blocked){blocked=true;break;}await new Promise(r=>setTimeout(r,10));}expect(blocked).toBe(true);
  if(kind==='ledger-expiry')await q("SELECT pg_sleep(GREATEST(0,extract(epoch FROM expires_at-clock_timestamp()))::double precision+0.05) FROM clocker_pin_sessions WHERE device_id=$1",[f.devices[0].device.id]);
  else await blocker.query("UPDATE employees SET active=false WHERE id='c34-a'");
  await blocker.query('COMMIT');expect(await pending).toMatchObject({error:{code:'AUTH_REQUIRED'}});expect(await q('SELECT * FROM time_entries')).toEqual([]);expect(await q('SELECT * FROM clocker_command_ledger')).toEqual([]);
 }finally{await blocker.query('ROLLBACK');await pending;await worker.end();await blocker.end();}
});
