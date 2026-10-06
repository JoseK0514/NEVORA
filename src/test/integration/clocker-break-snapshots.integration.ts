import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { beforeEach, afterEach, expect, it } from 'vitest';
import { createPunchFixture } from './clocker-punch-fixture';
import { saveBreakType } from '../../lib/clocker/break-types.server';
import { ClockerPunchService } from '../../lib/clocker/punches.server';
import type { BreakType } from '../../lib/clocker/break-types';
import type { ClockerIdentityProof } from '../../lib/clocker/pin-identity.server';
import type { PunchAction } from '../../lib/clocker/punch-types';
let f:Awaited<ReturnType<typeof createPunchFixture>>, service:ClockerPunchService, proof:ClockerIdentityProof, type:BreakType;
beforeEach(async()=>{
 f=await createPunchFixture();
 type=await saveBreakType(f.owner,{name:'Rest period',category:'REST',targetMinutes:15,active:true,expectedVersion:0},f.db.executor);
 service=new ClockerPunchService(f.key,f.db.executor);proof=(await f.identity()).proof;
});
afterEach(async()=>{if(f)await f.db.dispose();});
async function command(action:PunchAction){const view=await service.read(proof),s=view.snapshot;
 return {commandId:randomUUID(),action,verificationId:view.verificationId,expected:{revision:s.revision,timeEntryId:s.entry?.id??null,timeEntryVersion:s.entry?.version??null,breakEntryId:s.break?.id??null,breakEntryVersion:s.break?.version??null},
 ...(action==='START_BREAK'?{breakType:{id:type.id,version:type.version}}:{})};}
const execute=async(action:PunchAction)=>service.execute(proof,await command(action));
const snapshot=()=>({id:type.id,version:1,name:'Rest period',category:'REST',targetMinutes:15});
it('captures configured name, category, minutes and version at the actual Start Break',async()=>{
 await execute('CLOCK_IN');const r=await execute('START_BREAK');
 expect(await f.q('SELECT break_type_id,break_type_snapshot FROM break_entries')).toEqual([{break_type_id:type.id,break_type_snapshot:snapshot()}]);
 expect(r.snapshot.break).toMatchObject({type:snapshot()});expect(r).toMatchObject({breakType:snapshot()});
});
it('editing settings does not rewrite an active break or its saved receipt',async()=>{
 await execute('CLOCK_IN');const c=await command('START_BREAK'),r=await service.execute(proof,c);
 await saveBreakType(f.owner,{...type,name:'Meal renamed',category:'MEAL',targetMinutes:30,expectedVersion:1},f.db.executor);
 expect((await service.read(proof)).snapshot.break).toMatchObject({type:snapshot()});
 expect(await service.receipt(proof,c.commandId)).toEqual(r);
 expect(await execute('END_BREAK')).toMatchObject({breakType:snapshot()});
});
it('archiving prevents new starts but an already open break can still end',async()=>{
 await execute('CLOCK_IN');await execute('START_BREAK');
 await saveBreakType(f.owner,{...type,active:false,expectedVersion:1},f.db.executor);
 expect(await execute('CLOCK_OUT')).toMatchObject({breakType:snapshot()});
 await execute('CLOCK_IN');await expect(execute('START_BREAK')).rejects.toMatchObject({code:'BREAK_TYPE_CHANGED'});
});
it('stale type settings are rejected rather than silently applying new minutes',async()=>{
 await execute('CLOCK_IN');const c=await command('START_BREAK');
 await saveBreakType(f.owner,{...type,targetMinutes:30,expectedVersion:1},f.db.executor);
 await expect(service.execute(proof,c)).rejects.toMatchObject({code:'BREAK_TYPE_CHANGED'});
 expect(await f.q('SELECT * FROM break_entries')).toEqual([]);
});
it('no active catalog types means no Start Break action, not an invented default',async()=>{
 await execute('CLOCK_IN');await saveBreakType(f.owner,{...type,active:false,expectedVersion:1},f.db.executor);
 expect((await service.read(proof)).allowedActions).toEqual(['CLOCK_OUT']);
});
it('Start Break requires an explicit selection and ignores no supplied policy metadata',async()=>{
 await execute('CLOCK_IN');const c=await command('START_BREAK');const {breakType:_,...missing}=c;
 await expect(service.execute(proof,missing)).rejects.toMatchObject({code:'INVALID_INPUT'});
 await expect(service.execute(proof,{...c,breakType:{id:type.id,version:1,targetMinutes:1}})).rejects.toMatchObject({code:'INVALID_INPUT'});
 expect(await f.q('SELECT * FROM break_entries')).toEqual([]);
});
it('the original receipt is recoverable after its type is archived',async()=>{
 await execute('CLOCK_IN');const c=await command('START_BREAK'),r=await service.execute(proof,c);
 await saveBreakType(f.owner,{...type,active:false,expectedVersion:1},f.db.executor);
 expect(await service.execute(proof,c)).toEqual(r);
 expect(await f.q('SELECT count(*)::int AS n FROM break_entries')).toEqual([{n:1}]);
});
it('the command fingerprint includes the selected break type/version',async()=>{
 await execute('CLOCK_IN');const c=await command('START_BREAK');await service.execute(proof,c);
 await expect(service.execute(proof,{...c,breakType:{id:type.id,version:2}})).rejects.toMatchObject({code:'COMMAND_REUSED'});
});
it('snapshots cannot be silently relabeled or removed',async()=>{
 await execute('CLOCK_IN');await execute('START_BREAK');
 await expect(f.q("UPDATE break_entries SET break_type_snapshot=jsonb_set(break_type_snapshot,'{name}','\"Changed\"')")).rejects.toMatchObject({code:'23514'});
 await expect(f.q('UPDATE break_entries SET break_type_id=NULL,break_type_snapshot=NULL')).rejects.toMatchObject({code:'23514'});
 await expect(f.q('DELETE FROM break_entries')).rejects.toMatchObject({code:'23514'});
});
it('exceeding reference minutes never closes a real break or alters actual timestamps',async()=>{
 await execute('CLOCK_IN');await execute('START_BREAK');
 await f.q("UPDATE time_entries SET clock_in_at=clock_timestamp()-interval '2 hours'; UPDATE break_entries SET break_start_at=clock_timestamp()-interval '1 hour'");
 const view=await service.read(proof);expect(view.snapshot.entry?.status).toBe('ON_BREAK');
 expect(await f.q('SELECT break_end_at FROM break_entries')).toEqual([{break_end_at:null}]);
});

import { Client } from 'pg';
import type { SqlExecutor, SqlStatement } from '../../lib/notifications/types';
async function worker(){const client=new Client({connectionString:f.db.connectionString});await client.connect();
 const pid=(await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
 const executor:SqlExecutor={query:async<T>(s:SqlStatement)=>(await client.query(s.text,[...s.values])).rows as T[],transaction:async statements=>{
  await client.query('BEGIN');try{const rows:unknown[][]=[];for(const s of statements)rows.push((await client.query(s.text,[...s.values])).rows);await client.query('COMMIT');return rows;}catch(e){await client.query('ROLLBACK');throw e;}
 }};return {client,pid,executor};}
async function blocked(pid:number){for(let n=0;n<200;n++){if((await f.q<{waiting:boolean}>('SELECT cardinality(pg_blocking_pids($1))>0 AS waiting',[pid]))[0].waiting)return;await new Promise(r=>setTimeout(r,10));}throw Error('Did not observe the expected PostgreSQL lock');}
it.each(['archive','edit'] as const)('rejects a Start Break after %s wins the actual type-row race',async change=>{
 await execute('CLOCK_IN');const c=await command('START_BREAK'),w=await worker(),blocker=new Client({connectionString:f.db.connectionString});await blocker.connect();let pending:Promise<unknown>|undefined;
 try{
  await blocker.query('BEGIN');await blocker.query('SELECT id FROM clocker_break_types WHERE id=$1 FOR UPDATE',[type.id]);
  const result=new ClockerPunchService(f.key,w.executor).execute(proof,c).then(value=>({value}),error=>({error}));pending=result;
  await blocked(w.pid);
  await blocker.query(change==='archive'?'UPDATE clocker_break_types SET active=false,version=version+1 WHERE id=$1':'UPDATE clocker_break_types SET target_minutes=30,version=version+1 WHERE id=$1',[type.id]);
  await blocker.query('COMMIT');expect(await result).toMatchObject({error:{code:'BREAK_TYPE_CHANGED'}});
  expect(await f.q('SELECT * FROM break_entries')).toEqual([]);
 }finally{await blocker.query('ROLLBACK');await pending;await blocker.end();await w.client.end();}
});
it('Owner session expiry during a settings lock wait rolls back catalog and audit together',async()=>{
 const before=await f.q('SELECT * FROM clocker_break_types'),w=await worker(),blocker=new Client({connectionString:f.db.connectionString});await blocker.connect();let pending:Promise<unknown>|undefined;
 try{
  await blocker.query('BEGIN');await blocker.query('SELECT id FROM clocker_break_types WHERE id=$1 FOR UPDATE',[type.id]);
  await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '900 milliseconds' WHERE employee_id=$1",[f.owner.employeeId]);
  const result=saveBreakType(f.owner,{...type,targetMinutes:30,expectedVersion:1},w.executor).then(value=>({value}),error=>({error}));pending=result;
  await blocked(w.pid);await f.q("SELECT pg_sleep(GREATEST(0,extract(epoch FROM expires_at-clock_timestamp()))::double precision+0.05) FROM employee_sessions WHERE employee_id=$1",[f.owner.employeeId]);
  await blocker.query('COMMIT');expect(await result).toMatchObject({error:{code:'FORBIDDEN'}});
  expect(await f.q('SELECT * FROM clocker_break_types')).toEqual(before);
  expect(await f.q('SELECT version FROM clocker_break_type_events')).toEqual([{version:1}]);
 }finally{await blocker.query('ROLLBACK');await pending;await blocker.end();await w.client.end();}
});
it('suppressed closing writes cannot return a successful Clock Out receipt',async()=>{
 await execute('CLOCK_IN');await execute('START_BREAK');
 await f.q(`CREATE FUNCTION c5_suppress_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END; $$;
 CREATE TRIGGER c5_suppress_entry BEFORE UPDATE ON time_entries FOR EACH ROW EXECUTE FUNCTION c5_suppress_update();
 CREATE TRIGGER c5_suppress_break BEFORE UPDATE ON break_entries FOR EACH ROW EXECUTE FUNCTION c5_suppress_update();`);
 await expect(execute('CLOCK_OUT')).rejects.toMatchObject({code:'INTEGRITY'});
 expect(await f.q('SELECT action FROM clocker_command_ledger ORDER BY performed_at')).toEqual([{action:'CLOCK_IN'},{action:'START_BREAK'}]);
});

it('a silently suppressed command receipt rolls back the entire recorded break',async()=>{
 await execute('CLOCK_IN');const before=await service.read(proof);
 await f.q(`CREATE FUNCTION c5_suppress_receipt() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL; END; $$;
 CREATE TRIGGER c5_suppress_receipt BEFORE INSERT ON clocker_command_ledger FOR EACH ROW EXECUTE FUNCTION c5_suppress_receipt();`);
 await expect(execute('START_BREAK')).rejects.toMatchObject({code:'INTEGRITY'});
 expect(await service.read(proof)).toEqual(before);
 expect(await f.q('SELECT * FROM break_entries')).toEqual([]);
});
