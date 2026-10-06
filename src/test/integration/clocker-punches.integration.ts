import { randomUUID } from 'node:crypto';
import { beforeEach, afterEach, expect, it } from 'vitest';
import { createPunchFixture } from './clocker-punch-fixture';
import { ClockerPunchService } from '../../lib/clocker/punches.server';
import type { ClockerIdentityProof } from '../../lib/clocker/pin-identity.server';
import type { PunchCommand, PunchAction } from '../../lib/clocker/punch-types';
import type { SqlExecutor } from '../../lib/notifications/types';

let f:Awaited<ReturnType<typeof createPunchFixture>>;
let service:ClockerPunchService;
let proof:ClockerIdentityProof;
beforeEach(async()=>{f=await createPunchFixture({breaks:true});service=new ClockerPunchService(f.key,f.db.executor);proof=(await f.identity()).proof;});
afterEach(async()=>{if(f)await f.db.dispose();});
async function command(action:PunchAction,actor=proof):Promise<PunchCommand>{
 const view=await service.read(actor),s=view.snapshot;
 return {...(action==='START_BREAK'?{breakType:{id:f.breakType!.id,version:f.breakType!.version}}:{}),commandId:randomUUID(),action,verificationId:view.verificationId,expected:{revision:s.revision,
  timeEntryId:s.entry?.id??null,timeEntryVersion:s.entry?.version??null,
  breakEntryId:s.break?.id??null,breakEntryVersion:s.break?.version??null}};
}
const execute=async(action:PunchAction,actor=proof)=>service.execute(actor,await command(action,actor));
const counts=async()=>f.q('SELECT (SELECT count(*)::int FROM time_entries) AS entries,(SELECT count(*)::int FROM break_entries) AS breaks,(SELECT count(*)::int FROM clocker_command_ledger) AS commands');

it('reads real Off Clock without creating a fake entry or receipt',async()=>{
 const view=await service.read(proof);
 expect(view.snapshot).toEqual({revision:0,entry:null,break:null});expect(view.allowedActions).toEqual(['CLOCK_IN']);
 expect(view.verificationId).toMatch(/^[a-f0-9]{64}$/);expect(view.verificationId).not.toBe(proof.tokenHash);
 expect(await counts()).toEqual([{entries:0,breaks:0,commands:0}]);
});
it('records Clock In with PostgreSQL time and server-derived employee/location/device',async()=>{
 const [before]=await f.q<{at:Date}>('SELECT clock_timestamp() AS at');
 const receipt=await execute('CLOCK_IN');
 const [after]=await f.q<{at:Date}>('SELECT clock_timestamp() AS at');
 const [entry]=await f.q<{employee_id:string;location_id:string;device_id:string;clock_in_at:Date}>('SELECT * FROM time_entries');
 expect(entry).toMatchObject({employee_id:'c34-a',location_id:'loc-1',device_id:f.devices[0].device.id});
 expect(entry.clock_in_at.getTime()).toBeGreaterThanOrEqual(before.at.getTime());
 expect(entry.clock_in_at.getTime()).toBeLessThanOrEqual(after.at.getTime());
 expect(new Date(receipt.performedAt).getTime()).toBe(entry.clock_in_at.getTime());
 expect(receipt.snapshot).toMatchObject({revision:1,entry:{id:receipt.timeEntryId,status:'CLOCKED_IN',version:1},break:null});
 expect(await counts()).toEqual([{entries:1,breaks:0,commands:1}]);
});
it('persists the complete Clock In -> Break -> End Break -> Clock Out lifecycle',async()=>{
 const start=await execute('CLOCK_IN');const onBreak=await execute('START_BREAK');
 expect(onBreak.snapshot).toMatchObject({revision:2,entry:{id:start.timeEntryId,status:'ON_BREAK',version:2},break:{version:1}});
 const resumed=await execute('END_BREAK');expect(resumed.snapshot).toMatchObject({revision:3,entry:{status:'CLOCKED_IN',version:3},break:null});
 const end=await execute('CLOCK_OUT');expect(end.snapshot).toEqual({revision:4,entry:null,break:null});
 expect(await f.q('SELECT status,version FROM time_entries')).toEqual([{status:'CLOCKED_OUT',version:4}]);
 expect(await f.q('SELECT version,break_end_at IS NOT NULL AS closed FROM break_entries')).toEqual([{version:2,closed:true}]);
 expect(await counts()).toEqual([{entries:1,breaks:1,commands:4}]);
});
it('Clock Out on break closes both records at exactly the same database instant',async()=>{
 await execute('CLOCK_IN');await execute('START_BREAK');const end=await execute('CLOCK_OUT');
 expect(end.breakEntryId).toBeTruthy();
 expect(await f.q('SELECT t.status,t.clock_out_at=b.break_end_at AS same FROM time_entries t JOIN break_entries b ON b.time_entry_id=t.id')).toEqual([{status:'CLOCKED_OUT',same:true}]);
 expect(end.snapshot).toEqual({revision:3,entry:null,break:null});
});
it('identical retries return the original saved receipt, even after a later transition',async()=>{
 const c=await command('CLOCK_IN');const original=await service.execute(proof,c);
 expect(await service.execute(proof,c)).toEqual(original);
 await execute('START_BREAK');expect(await service.execute(proof,c)).toEqual(original);
 expect((await service.read(proof)).snapshot.revision).toBe(2);
 expect(await counts()).toEqual([{entries:1,breaks:1,commands:2}]);
});
it('rejects command ID reuse with a changed payload without mutating the new state',async()=>{
 const c=await command('CLOCK_IN');await service.execute(proof,c);
 const next={...await command('START_BREAK'),commandId:c.commandId};
 await expect(service.execute(proof,next)).rejects.toMatchObject({code:'COMMAND_REUSED'});
 expect(await counts()).toEqual([{entries:1,breaks:0,commands:1}]);
});
it('two simultaneous identical submissions yield one committed command',async()=>{
 const c=await command('CLOCK_IN');const results=await Promise.all([service.execute(proof,c),service.execute(proof,c)]);
 expect(results[0]).toEqual(results[1]);expect(await counts()).toEqual([{entries:1,breaks:0,commands:1}]);
});
it('simultaneous tablets cannot create two open entries for the same employee',async()=>{
 const second=(await f.identity(1)).proof;
 const c1=await command('CLOCK_IN'),c2=await command('CLOCK_IN',second);
 const outcomes=await Promise.allSettled([service.execute(proof,c1),service.execute(second,c2)]);
 expect(outcomes.filter(r=>r.status==='fulfilled')).toHaveLength(1);
 expect(outcomes.filter(r=>r.status==='rejected')).toHaveLength(1);
 expect(await counts()).toEqual([{entries:1,breaks:0,commands:1}]);
});
it('simultaneous break requests create only one open break',async()=>{
 await execute('CLOCK_IN');const second=(await f.identity(1)).proof;
 const c1=await command('START_BREAK'),c2=await command('START_BREAK',second);
 const outcomes=await Promise.allSettled([service.execute(proof,c1),service.execute(second,c2)]);
 expect(outcomes.filter(r=>r.status==='fulfilled')).toHaveLength(1);
 expect(await counts()).toEqual([{entries:1,breaks:1,commands:2}]);
});
it('End Break and Clock Out races never leave a closed entry with an open break',async()=>{
 await execute('CLOCK_IN');await execute('START_BREAK');const second=(await f.identity(1)).proof;
 const c1=await command('END_BREAK'),c2=await command('CLOCK_OUT',second);
 const outcomes=await Promise.allSettled([service.execute(proof,c1),service.execute(second,c2)]);
 expect(outcomes.filter(r=>r.status==='fulfilled')).toHaveLength(1);
 expect(await f.q('SELECT count(*)::int AS open FROM break_entries WHERE break_end_at IS NULL')).toEqual([{open:0}]);
 expect((await service.read(proof)).snapshot.revision).toBe(3);
});
it('another tablet at the same location may close the entry without changing its original device',async()=>{
 await execute('CLOCK_IN');const second=(await f.identity(1)).proof;await execute('CLOCK_OUT',second);
 expect(await f.q('SELECT device_id,status FROM time_entries')).toEqual([{device_id:f.devices[0].device.id,status:'CLOCKED_OUT'}]);
});
it('reports an other-location open entry and refuses to reattribute or mutate it',async()=>{
 await execute('CLOCK_IN');const other=(await f.identity(2)).proof;
 const view=await service.read(other);expect(view.allowedActions).toEqual([]);expect(view.atOtherLocation).toBe(true);
 await expect(execute('CLOCK_OUT',other)).rejects.toMatchObject({code:'OTHER_LOCATION'});
 expect(await f.q('SELECT location_id,status FROM time_entries')).toEqual([{location_id:'loc-1',status:'CLOCKED_IN'}]);
});
it.each(['revision','timeEntryId','timeEntryVersion','breakEntryId','breakEntryVersion'] as const)('rejects stale expected %s',async field=>{
 await execute('CLOCK_IN');await execute('START_BREAK');const c=await command('END_BREAK');
 const changed={...c,expected:{...c.expected,[field]:field.endsWith('Id')?'wrong-id':999}};
 await expect(service.execute(proof,changed)).rejects.toMatchObject({code:'STALE_STATE'});
 expect((await service.read(proof)).snapshot.revision).toBe(2);
});
it('prevents an old Off Clock command from opening a new shift after an intervening complete shift',async()=>{
 const old=await command('CLOCK_IN');await execute('CLOCK_IN');await execute('CLOCK_OUT');
 await expect(service.execute(proof,old)).rejects.toMatchObject({code:'STALE_STATE'});
 expect(await counts()).toEqual([{entries:1,breaks:0,commands:2}]);
});
it('a delayed End Break cannot end a later break within the same shift',async()=>{
 await execute('CLOCK_IN');await execute('START_BREAK');const old=await command('END_BREAK');
 await execute('END_BREAK');await execute('START_BREAK');
 await expect(service.execute(proof,old)).rejects.toMatchObject({code:'STALE_STATE'});
 expect((await service.read(proof)).snapshot.entry?.status).toBe('ON_BREAK');
});
it.each(['START_BREAK','END_BREAK','CLOCK_OUT'] as const)('rejects %s while Off Clock',async action=>{
 await expect(execute(action)).rejects.toMatchObject({code:'INVALID_INPUT'});
 expect(await counts()).toEqual([{entries:0,breaks:0,commands:0}]);
});
it('a fresh PIN verification cannot execute an older verification context',async()=>{
 const old=await command('CLOCK_IN');const next=(await f.identity()).proof;
 await expect(service.execute(next,old)).rejects.toMatchObject({code:'CONTEXT_CHANGED'});
 expect(await counts()).toEqual([{entries:0,breaks:0,commands:0}]);
});
it('another employee cannot inherit a queued command on the shared tablet',async()=>{
 const old=await command('CLOCK_IN');const next=(await f.identity(0,'4567')).proof;
 await expect(service.execute(next,old)).rejects.toMatchObject({code:'CONTEXT_CHANGED'});
 expect(await counts()).toEqual([{entries:0,breaks:0,commands:0}]);
});
it('fresh verification can recover only the same employee/device receipt without replaying the command',async()=>{
 const c=await command('CLOCK_IN'),receipt=await service.execute(proof,c);
 const fresh=(await f.identity()).proof;
 expect(await service.receipt(fresh,c.commandId)).toEqual(receipt);
 const other=(await f.identity(0,'4567')).proof;
 expect(await service.receipt(other,c.commandId)).toBeNull();
 expect(await counts()).toEqual([{entries:1,breaks:0,commands:1}]);
});
it.each(['employee-inactive','pin-reset','device-revoked','identity-expired','eligibility-removed'])('rechecks current authority after %s',async kind=>{
 const c=await command('CLOCK_IN');
 if(kind==='employee-inactive')await f.q("UPDATE employees SET active=false WHERE id='c34-a'");
 if(kind==='pin-reset')await f.q("UPDATE employee_clocker_pins SET version=version+1 WHERE employee_id='c34-a'");
 if(kind==='device-revoked')await f.q('UPDATE clocker_devices SET active=false,credential_hash=NULL,revoked_at=clock_timestamp() WHERE id=$1',[proof.device.deviceId]);
 if(kind==='identity-expired')await f.q('UPDATE clocker_pin_sessions SET expires_at=clock_timestamp()-interval \'1 second\'');
 if(kind==='eligibility-removed')await f.q("DELETE FROM employee_location_eligibility WHERE employee_id='c34-a'");
 await expect(service.execute(proof,c)).rejects.toThrow();
 expect(await counts()).toEqual([{entries:0,breaks:0,commands:0}]);
});
it('rolls back the entry, break and revision when receipt persistence fails',async()=>{
 await execute('CLOCK_IN');const before=await service.read(proof);
 await f.q(`CREATE FUNCTION c34_fail_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test-only ledger failure'; END; $$;
 CREATE TRIGGER c34_fail_receipt BEFORE INSERT ON clocker_command_ledger FOR EACH ROW EXECUTE FUNCTION c34_fail_receipt();`);
 await expect(execute('START_BREAK')).rejects.toMatchObject({code:'UNAVAILABLE'});
 expect(await service.read(proof)).toEqual(before);expect(await counts()).toEqual([{entries:1,breaks:0,commands:1}]);
});
it('recovers an ambiguous committed database response using the original command ID',async()=>{
 const c=await command('CLOCK_IN');let lost=false;
 const executor:SqlExecutor={query:(s,signal)=>f.db.executor.query(s,signal),transaction:async statements=>{
  const rows=await f.db.executor.transaction(statements);if(!lost){lost=true;throw Error('lost commit response');}return rows;
 }};
 await expect(new ClockerPunchService(f.key,executor).execute(proof,c)).rejects.toMatchObject({code:'UNAVAILABLE'});
 const recovered=await service.receipt(proof,c.commandId);expect(recovered?.commandId).toBe(c.commandId);
 expect(await service.execute(proof,c)).toEqual(recovered);expect(await counts()).toEqual([{entries:1,breaks:0,commands:1}]);
});
it('refuses inconsistent break state rather than repairing or reporting false Off Clock',async()=>{
 await execute('CLOCK_IN');await f.q("UPDATE time_entries SET status='ON_BREAK'");
 await expect(service.read(proof)).rejects.toMatchObject({code:'INTEGRITY'});
 expect(await counts()).toEqual([{entries:1,breaks:0,commands:1}]);
});
it('rejects breaks outside the parent entry before mutating time',async()=>{
 const r=await execute('CLOCK_IN');
 await f.q("INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at) SELECT 'bad-break',id,clock_in_at-interval '2 minutes',clock_in_at-interval '1 minute' FROM time_entries WHERE id=$1",[r.timeEntryId]);
 await expect(service.read(proof)).rejects.toMatchObject({code:'INTEGRITY'});
});
it('rejects overlapping existing breaks rather than hiding inconsistent duration',async()=>{
 const r=await execute('CLOCK_IN');
 await f.q("UPDATE time_entries SET clock_in_at=clock_timestamp()-interval '3 hours'");
 await f.q("INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at) VALUES('overlap-a',$1,clock_timestamp()-interval '2 hours',clock_timestamp()-interval '1 hour'),('overlap-b',$1,clock_timestamp()-interval '90 minutes',clock_timestamp()-interval '30 minutes')",[r.timeEntryId]);
 await expect(service.read(proof)).rejects.toMatchObject({code:'INTEGRITY'});
});
it('does not silently replace a future recorded timestamp when database time would go backwards',async()=>{
 await execute('CLOCK_IN');await f.q("UPDATE time_entries SET clock_in_at=clock_timestamp()+interval '1 hour'");
 await expect(execute('START_BREAK')).rejects.toMatchObject({code:'CLOCK_INVALID'});
 expect(await counts()).toEqual([{entries:1,breaks:0,commands:1}]);
});
it('closes an overnight legacy entry without changing its historical Clock In',async()=>{
 await f.q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status) VALUES('overnight','c34-a','loc-1',$1,'2020-01-01T22:00Z','CLOCKED_IN')",[proof.device.deviceId]);
 await execute('CLOCK_OUT');
 const [row]=await f.q<{clock_in_at:Date;status:string}>("SELECT clock_in_at,status FROM time_entries WHERE id='overnight'");
 expect(row.clock_in_at.toISOString()).toBe('2020-01-01T22:00:00.000Z');expect(row.status).toBe('CLOCKED_OUT');
});
it('keeps command receipts append-only',async()=>{
 await execute('CLOCK_IN');
 await expect(f.q("UPDATE clocker_command_ledger SET result='{}'")).rejects.toMatchObject({code:'23514'});
 await expect(f.q('DELETE FROM clocker_command_ledger')).rejects.toMatchObject({code:'23514'});
});
it('missing schema stays unavailable, never an empty clock result',async()=>{
 await f.q('ALTER TABLE clocker_employee_clock_state RENAME TO missing_clock_state');
 await expect(service.read(proof)).rejects.toMatchObject({code:'UNAVAILABLE'});
});

import { Client } from 'pg';
import type { SqlStatement } from '../../lib/notifications/types';
async function workerExecutor(){
 const client=new Client({connectionString:f.db.connectionString});await client.connect();
 const pid=(await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
 const executor:SqlExecutor={query:async<T>(s:SqlStatement)=>(await client.query(s.text,[...s.values])).rows as T[],transaction:async statements=>{
  await client.query('BEGIN');try{const results:unknown[][]=[];for(const s of statements)results.push((await client.query(s.text,[...s.values])).rows);await client.query('COMMIT');return results;}
  catch(error){await client.query('ROLLBACK');throw error;}
 }};
 return {client,pid,executor};
}
async function observedBlocked(pid:number){
 for(let n=0;n<200;n++){
  const [r]=await f.q<{blocked:boolean}>('SELECT cardinality(pg_blocking_pids($1))>0 AS blocked',[pid]);
  if(r.blocked)return;await new Promise(resolve=>setTimeout(resolve,10));
 }
 throw Error('Expected a real PostgreSQL lock barrier');
}
it('rolls back all time changes if PIN identity expires while a deeper entry lock is held',async()=>{
 await execute('CLOCK_IN');await execute('START_BREAK');const c=await command('CLOCK_OUT');
 const blocker=new Client({connectionString:f.db.connectionString}),worker=await workerExecutor();await blocker.connect();
 let pending:Promise<unknown>|undefined;
 try{
  await blocker.query('BEGIN');await blocker.query('SELECT id FROM time_entries WHERE id=$1 FOR UPDATE',[c.expected.timeEntryId]);
  await f.q("UPDATE clocker_pin_sessions SET expires_at=clock_timestamp()+interval '900 milliseconds' WHERE device_id=$1",[proof.device.deviceId]);
  const result=new ClockerPunchService(f.key,worker.executor).execute(proof,c).then(value=>({value}),error=>({error}));pending=result;
  await observedBlocked(worker.pid);
  await f.q("SELECT pg_sleep(GREATEST(0,extract(epoch FROM expires_at-clock_timestamp()))::double precision+0.05) FROM clocker_pin_sessions WHERE device_id=$1",[proof.device.deviceId]);
  await blocker.query('COMMIT');expect(await result).toMatchObject({error:{code:'AUTH_REQUIRED'}});
  expect(await f.q('SELECT status,clock_out_at FROM time_entries')).toEqual([{status:'ON_BREAK',clock_out_at:null}]);
  expect(await f.q('SELECT break_end_at FROM break_entries')).toEqual([{break_end_at:null}]);
  expect(await counts()).toEqual([{entries:1,breaks:1,commands:2}]);
 }finally{await blocker.query('ROLLBACK');await pending;await blocker.end();await worker.client.end();}
});
it('samples PostgreSQL punch time after an observed lock wait rather than at transaction start',async()=>{
 await execute('CLOCK_IN');const c=await command('CLOCK_OUT');
 const blocker=new Client({connectionString:f.db.connectionString}),worker=await workerExecutor();await blocker.connect();
 let pending:Promise<unknown>|undefined;
 try{
  await blocker.query('BEGIN');await blocker.query('SELECT id FROM time_entries WHERE id=$1 FOR UPDATE',[c.expected.timeEntryId]);
  const result=new ClockerPunchService(f.key,worker.executor).execute(proof,c);pending=result;
  await observedBlocked(worker.pid);await f.q('SELECT pg_sleep(0.1)');
  const [released]=await f.q<{at:Date}>('SELECT clock_timestamp() AS at');
  await blocker.query('COMMIT');const receipt=await result;
  expect(new Date(receipt.performedAt).getTime()).toBeGreaterThanOrEqual(released.at.getTime());
 }finally{await blocker.query('ROLLBACK');await pending;await blocker.end();await worker.client.end();}
});
it('an unrelated employee can punch while another employee is locked',async()=>{
 const second=(await f.identity(1,'4567')).proof;
 const c1=await command('CLOCK_IN'),c2=await command('CLOCK_IN',second);
 const blocker=new Client({connectionString:f.db.connectionString}),worker=await workerExecutor();await blocker.connect();
 let pending:Promise<unknown>|undefined;
 try{
  await blocker.query('BEGIN');await blocker.query("SELECT id FROM employees WHERE id='c34-a' FOR UPDATE");
  const result=new ClockerPunchService(f.key,worker.executor).execute(proof,c1);pending=result;
  await observedBlocked(worker.pid);
  const independent=await service.execute(second,c2);expect(independent.action).toBe('CLOCK_IN');
  expect(await f.q("SELECT employee_id FROM time_entries")).toEqual([{employee_id:'c34-b'}]);
  await blocker.query('COMMIT');await result;expect(await counts()).toEqual([{entries:2,breaks:0,commands:2}]);
 }finally{await blocker.query('ROLLBACK');await pending;await blocker.end();await worker.client.end();}
});
it('does not report healthy Off Clock when a historical break extends beyond its closed entry',async()=>{
 await execute('CLOCK_IN');await execute('START_BREAK');await execute('CLOCK_OUT');
 await f.q("UPDATE break_entries SET break_end_at=(SELECT clock_out_at+interval '1 hour' FROM time_entries WHERE id=time_entry_id)");
 await expect(service.read(proof)).rejects.toMatchObject({code:'INTEGRITY'});
});
