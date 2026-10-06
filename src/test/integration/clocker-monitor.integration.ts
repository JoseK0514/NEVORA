import {randomUUID} from 'node:crypto';
import {Client} from 'pg';
import {revokeClockerDevice} from '../../lib/clocker/devices.server';
import {afterEach,beforeEach,expect,it} from 'vitest';
import {createPunchFixture} from './clocker-punch-fixture';
import {readClockMonitor} from '../../lib/data/clock-monitor.server';
import {ClockerPunchService} from '../../lib/clocker/punches.server';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import type {SqlExecutor} from '../../lib/notifications/types';
import type {PunchAction} from '../../lib/clocker/punch-types';
let f:Awaited<ReturnType<typeof createPunchFixture>>,owner:SessionMutationProof;
beforeEach(async()=>{f=await createPunchFixture({breaks:true});owner={sessionTokenHash:f.owner.sessionTokenHash,employee:{id:f.owner.employeeId,firstName:'Owner',lastName:'QA',role:'OWNER',primaryLocationId:'loc-1'}};});
afterEach(async()=>{if(f)await f.db.dispose();});
const read=()=>readClockMonitor(owner,f.db.executor);
async function clock(){
 const {proof}=await f.identity(),service=new ClockerPunchService(f.key,f.db.executor);
 return async(action:PunchAction)=>{const view=await service.read(proof),s=view.snapshot;return service.execute(proof,{commandId:randomUUID(),action,verificationId:view.verificationId,
 expected:{revision:s.revision,timeEntryId:s.entry?.id??null,timeEntryVersion:s.entry?.version??null,breakEntryId:s.break?.id??null,breakEntryVersion:s.break?.version??null},
 ...(action==='START_BREAK'?{breakType:{id:f.breakType!.id,version:f.breakType!.version}}:{})});};
}
it('only a successful authorized read reports an empty live list',async()=>{const r=await read();expect(r).toMatchObject({state:'ready',employees:[],validForMs:45000,timeZone:'America/Puerto_Rico'});if(r.state==='ready')expect(Date.parse(r.observedAt)).toBeGreaterThan(0);});
it('uses the real complete clock-in/break/end/out lifecycle',async()=>{
 const punch=await clock();await punch('CLOCK_IN');expect(await read()).toMatchObject({state:'ready',employees:[{employeeId:'c34-a',state:'ON_FLOOR',elapsedMinutes:0,positionName:null}]});
 await punch('START_BREAK');expect(await read()).toMatchObject({state:'ready',employees:[{state:'ON_BREAK',breakElapsedMinutes:0}]});
 await punch('END_BREAK');expect(await read()).toMatchObject({employees:[{state:'ON_FLOOR',breakElapsedMinutes:null}]});
 await punch('CLOCK_OUT');expect(await read()).toMatchObject({state:'ready',employees:[]});
});
it('a scheduled employee without a punch is not on the floor',async()=>{
 await f.q("INSERT INTO schedules(id,location_id,week_start,created_by,status) VALUES('scheduled','loc-1',date_trunc('week',current_date),'c34-owner','PUBLISHED')");
 await f.q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('scheduled-b','scheduled','c34-b',current_date,'00:00','24:00')");
 await (await clock())('CLOCK_IN');const r=await read();expect(r).toMatchObject({employees:[{employeeId:'c34-a'}]});if(r.state==='ready')expect(r.employees).toHaveLength(1);
});
it('open overnight records remain visible after employee and device deactivation',async()=>{
 await f.q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status) VALUES('overnight','c34-a','loc-1',$1,clock_timestamp()-interval '26 hours','CLOCKED_IN')",[f.devices[0].device.id]);
 await revokeClockerDevice(f.owner,{deviceId:f.devices[0].device.id,expectedVersion:f.devices[0].device.version},f.db.executor);
 await f.q("UPDATE employees SET active=false WHERE id='c34-a'");
 expect(await read()).toMatchObject({state:'ready',employees:[{employeeId:'c34-a',elapsedMinutes:1560,locationId:'loc-1'}]});
});
it('uses the historical captured position rather than a renamed or archived catalogue',async()=>{
 await f.q("INSERT INTO positions(id,workspace_id,name) VALUES('monitor-pos','workspace-fuel','Original position')");
 await f.q("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES('monitor-pub',date_trunc('week',clock_timestamp() AT TIME ZONE 'America/Puerto_Rico'),1,'PUBLISH','c34-owner')");
 await f.q("INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,position_id,position_name) VALUES('monitor-snap','monitor-pub','monitor-shift','monitor-schedule','loc-1','c34-a',(clock_timestamp() AT TIME ZONE 'America/Puerto_Rico')::date,'00:00','24:00','monitor-pos','Original position')");
 await (await clock())('CLOCK_IN');await f.q("UPDATE positions SET name='New position',active=false WHERE id='monitor-pos'");
 const r=await read();expect(r).toMatchObject({employees:[{positionName:'Original position',scheduleMatch:'MATCHED'}]});
 expect(JSON.stringify(r)).not.toMatch(/monitor-pub|sessionTokenHash|credential_hash|pin_hash/);
});
it.each(['MANAGER','OWNER'] as const)('allows a current %s',async role=>{await f.q('UPDATE employees SET role=$1 WHERE id=$2',[role,owner.employee.id]);expect(await read()).toMatchObject({state:'ready'});});
it.each(['EMPLOYEE','LEAD','inactive','expired','revoked','wrong-token','wrong-actor'] as const)('denies current %s authority despite the earlier Owner proof',async kind=>{
 if(kind==='EMPLOYEE'||kind==='LEAD')await f.q('UPDATE employees SET role=$1 WHERE id=$2',[kind,owner.employee.id]);
 if(kind==='inactive')await f.q('UPDATE employees SET active=false WHERE id=$1',[owner.employee.id]);
 if(kind==='expired')await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second'");
 if(kind==='revoked')await f.q('DELETE FROM employee_sessions');
 if(kind==='wrong-token')owner.sessionTokenHash='b'.repeat(64);
 if(kind==='wrong-actor')owner.employee.id='c34-b';
 expect(await read()).toEqual({state:'unavailable',reason:'access_denied'});
});
it('fails closed for inconsistent break state rather than claiming zero activity',async()=>{
 await (await clock())('CLOCK_IN');await f.q("UPDATE time_entries SET status='ON_BREAK'");expect(await read()).toEqual({state:'unavailable',reason:'read_failed'});
});
it('missing C6 schema cannot appear as a healthy empty list',async()=>{await f.q('ALTER TABLE time_entries RENAME COLUMN schedule_context TO unavailable_context');expect(await read()).toEqual({state:'unavailable',reason:'schema_missing'});});
it('database failure is unavailable and exposes no database diagnostic',async()=>{
 const executor:SqlExecutor={query:async()=>{throw Error('postgres://secret private endpoint');},transaction:async()=>{throw Error('secret');}};
 expect(await readClockMonitor(owner,executor)).toEqual({state:'unavailable',reason:'read_failed'});
});
it.each([true,false])('expiry during the actual monitor SELECT wait: expire=%s',async expire=>{
 const blocker=new Client({connectionString:f.db.connectionString,statement_timeout:8000}),worker=new Client({connectionString:f.db.connectionString,statement_timeout:8000});
 await blocker.connect();await worker.connect();let pending:Promise<unknown>|undefined;
 const executor:SqlExecutor={query:f.db.executor.query,transaction:async statements=>{
  await worker.query('BEGIN');try{const rows:unknown[][]=[];for(const s of statements)rows.push((await worker.query(s.text,[...s.values])).rows);await worker.query('COMMIT');return rows;}
  catch(error){await worker.query('ROLLBACK');throw error;}
 }};
 try{
  if(expire)await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '1.5 seconds'");
  await blocker.query('BEGIN');await blocker.query('LOCK TABLE time_entries IN ACCESS EXCLUSIVE MODE');const pid=(await worker.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  pending=readClockMonitor(owner,executor).catch(error=>({unexpectedError:String(error)}));let blocked=false;
  for(let n=0;n<250;n++){const [r]=await f.q<{blocked:boolean;query:string}>('SELECT cardinality(pg_blocking_pids(pid))>0 AS blocked,query FROM pg_stat_activity WHERE pid=$1',[pid]);if(r?.blocked&&r.query.startsWith('WITH observed AS MATERIALIZED')){const [lock]=await f.q<{waiting:boolean}>("SELECT EXISTS(SELECT 1 FROM pg_locks WHERE pid=$1 AND relation='time_entries'::regclass AND mode='AccessShareLock' AND NOT granted) AS waiting",[pid]);if(lock.waiting){blocked=true;break;}}await new Promise(r=>setTimeout(r,10));}
  expect(blocked).toBe(true);
  if(expire)await f.q('SELECT pg_sleep(GREATEST(0,extract(epoch FROM expires_at-clock_timestamp()))::double precision+0.05) FROM employee_sessions');
  await blocker.query('ROLLBACK');expect(await pending).toMatchObject(expire?{state:'unavailable',reason:'access_denied'}:{state:'ready',employees:[]});
 }finally{await blocker.query('ROLLBACK').catch(()=>{});await pending;await worker.end();await blocker.end();}
});
