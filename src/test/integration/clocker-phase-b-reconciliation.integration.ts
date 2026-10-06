import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createPunchFixture } from './clocker-punch-fixture';
import { registerClockerDevice, renameClockerDevice, revokeClockerDevice, rotateClockerDevice, redeemClockerEnrollment } from '../../lib/clocker/devices.server';
import { updateEmployeeProfile, saveEmployeeSchedulingProfile } from '../../lib/data/employees';
import { ClockerPunchService } from '../../lib/clocker/punches.server';
import type { SessionMutationProof } from '../../lib/shift-changes/types';
import type { SqlExecutor, SqlStatement } from '../../lib/notifications/types';

let f:Awaited<ReturnType<typeof createPunchFixture>>;
beforeEach(async()=>{f=await createPunchFixture({breaks:true});});
afterEach(async()=>{if(f)await f.db.dispose();});
const proof=():SessionMutationProof=>({employee:{id:f.owner.employeeId,firstName:'Owner',lastName:'QA',role:'OWNER',primaryLocationId:'loc-1'},sessionTokenHash:f.owner.sessionTokenHash});
const employeeVersion=async()=>(await f.q<{value:string}>("SELECT updated_at::text AS value FROM employees WHERE id='c34-a'"))[0].value;

for(const change of ['deactivate','scheduling'] as const)it(`accepted Phase B ${change} invalidates old tablet identity without deleting actual clock history`,async()=>{
 const identity=(await f.identity()).proof,service=new ClockerPunchService(f.key,f.db.executor);
 const v=await service.read(identity),s=v.snapshot;
 await service.execute(identity,{commandId:randomUUID(),action:'CLOCK_IN',verificationId:v.verificationId,expected:{revision:s.revision,timeEntryId:null,timeEntryVersion:null,breakEntryId:null,breakEntryVersion:null}});
 const before=await f.q('SELECT to_jsonb(t) AS row FROM time_entries t ORDER BY id');
 const common={employeeId:'c34-a',actorEmployeeId:f.owner.employeeId,proof:proof(),expectedUpdatedAt:await employeeVersion()};
 if(change==='deactivate')await updateEmployeeProfile({...common,firstName:'Avery',lastName:'QA',phone:'5550000004',primaryLocationId:'loc-1',role:'EMPLOYEE',active:false},f.db.executor);
 else await saveEmployeeSchedulingProfile({...common,positionIds:[],eligibleLocationIds:['loc-1','loc-2']},f.db.executor);
 await expect(service.read(identity)).rejects.toMatchObject({code:'AUTH_REQUIRED'});
 expect(await f.q('SELECT to_jsonb(t) AS row FROM time_entries t ORDER BY id')).toEqual(before);
 if(change==='scheduling')expect((await service.read((await f.identity()).proof)).snapshot.entry?.status).toBe('CLOCKED_IN');
});

const mutations=['register','rename','revoke','rotate','redeem'] as const;
for(const operation of mutations)for(const expired of [false,true])it(`C1 ${operation}: ${expired?'rolls back expired Owner authority':'retains valid behavior'} after late audit INSERT contention`,async()=>{
 let device=f.devices[0].device;
 let pendingEnrollment:Awaited<ReturnType<typeof registerClockerDevice>>|undefined;
 if(operation==='redeem'){pendingEnrollment=await registerClockerDevice(f.owner,{name:'Reconciliation pending',locationId:'loc-1'},f.db.executor);device=pendingEnrollment.device;}
 const before=await snapshot();
 const blocker=new Client({connectionString:f.db.connectionString,statement_timeout:5000});
 const worker=new Client({connectionString:f.db.connectionString,statement_timeout:5000});
 let pending:Promise<{value?:unknown;error?:unknown}>|undefined;
 try{
  await blocker.connect();await worker.connect();const pid=(await worker.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  await blocker.query('BEGIN');await blocker.query('LOCK TABLE clocker_device_events IN SHARE MODE');
  if(expired)await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '1100 milliseconds' WHERE token_hash=$1",[f.owner.sessionTokenHash]);
  const executor:SqlExecutor={query:async<T>(s:SqlStatement)=>(await worker.query(s.text,[...s.values])).rows as T[],transaction:async statements=>{
   await worker.query('BEGIN');try{const rows:unknown[][]=[];for(const s of statements)rows.push((await worker.query(s.text,[...s.values])).rows);await worker.query('COMMIT');return rows;}
   catch(error){await worker.query('ROLLBACK');throw error;}
  }};
  const input={deviceId:device.id,expectedVersion:device.version};
  const operationPromise=operation==='register'?registerClockerDevice(f.owner,{name:'Reconciliation new',locationId:'loc-1'},executor):operation==='rename'?renameClockerDevice(f.owner,{...input,name:'Reconciliation renamed'},executor):operation==='revoke'?revokeClockerDevice(f.owner,input,executor):operation==='rotate'?rotateClockerDevice(f.owner,input,executor):redeemClockerEnrollment({enrollmentToken:pendingEnrollment!.enrollmentToken,locationKey:'2'},executor);
  pending=operationPromise.then(value=>({value}),error=>({error}));
  await waitForAudit(pid);
  if(expired)await f.q("SELECT pg_sleep(GREATEST(0,extract(epoch FROM expires_at-clock_timestamp()))::double precision+0.05) FROM employee_sessions WHERE token_hash=$1",[f.owner.sessionTokenHash]);
  await blocker.query('ROLLBACK');const result=await pending;
  if(expired){expect(result).toHaveProperty('error');expect(await snapshot()).toEqual(before);}
  else{expect(result).not.toHaveProperty('error');expect(await snapshot()).not.toEqual(before);}
 }finally{await blocker.query('ROLLBACK').catch(()=>{});await pending;await worker.end();await blocker.end();}
});
async function snapshot(){return f.q(`SELECT
 (SELECT jsonb_agg(d ORDER BY d.id) FROM clocker_devices d) AS devices,
 (SELECT jsonb_agg(e ORDER BY e.id) FROM clocker_device_events e) AS events,
 (SELECT jsonb_agg(c ORDER BY c.credential_hash) FROM clocker_device_credentials c) AS credentials,
 (SELECT jsonb_agg(t ORDER BY t.id) FROM time_entries t) AS time_entries`);}
async function waitForAudit(pid:number){
 for(let n=0;n<200;n++){
  const [row]=await f.q<{blocked:boolean;auditWait:boolean;query:string}>(`SELECT cardinality(pg_blocking_pids(pid))>0 AS blocked,query,
   EXISTS(SELECT 1 FROM pg_locks WHERE pid=$1 AND relation='clocker_device_events'::regclass AND NOT granted) AS "auditWait"
   FROM pg_stat_activity WHERE pid=$1`,[pid]);
  // Activity text and live lock state can cross a statement boundary between samples.
  // Accept only the exact audit INSERT AND its actual ungranted relation lock.
  if(row?.blocked&&row.auditWait&&row.query.toLowerCase().includes('insert into clocker_device_events'))return;
  await new Promise(resolve=>setTimeout(resolve,10));
 }
 throw Error('The late audit INSERT did not reach its database lock');
}

for(const expired of [false,true])it(`C1 enrollment ${expired?'rejects':'allows'} token lifetime after late audit wait independently of Owner session`,async()=>{
 const enrol=await registerClockerDevice(f.owner,{name:'Expiry tablet',locationId:'loc-1'},f.db.executor);
 if(expired)await f.q("UPDATE clocker_devices SET enrollment_expires_at=clock_timestamp()+interval '1100 milliseconds' WHERE id=$1",[enrol.device.id]);
 const before=await snapshot();const blocker=new Client({connectionString:f.db.connectionString,statement_timeout:5000});
 const worker=new Client({connectionString:f.db.connectionString,statement_timeout:5000});let pending:Promise<{value?:unknown;error?:unknown}>|undefined;
 try{
  await blocker.connect();await worker.connect();const pid=(await worker.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  await blocker.query('BEGIN');await blocker.query('LOCK TABLE clocker_device_events IN SHARE MODE');
  const executor:SqlExecutor={query:async<T>(s:SqlStatement)=>(await worker.query(s.text,[...s.values])).rows as T[],transaction:async statements=>{
   await worker.query('BEGIN');try{const result:unknown[][]=[];for(const s of statements)result.push((await worker.query(s.text,[...s.values])).rows);await worker.query('COMMIT');return result;}
   catch(error){await worker.query('ROLLBACK');throw error;}
  }};
  pending=redeemClockerEnrollment({enrollmentToken:enrol.enrollmentToken,locationKey:'2'},executor).then(value=>({value}),error=>({error}));
  await waitForAudit(pid);
  if(expired)await f.q("SELECT pg_sleep(GREATEST(0,extract(epoch FROM enrollment_expires_at-clock_timestamp()))::double precision+0.05) FROM clocker_devices WHERE id=$1",[enrol.device.id]);
  await blocker.query('ROLLBACK');const result=await pending;
  if(expired){expect(result).toMatchObject({error:{code:'ENROLLMENT_INVALID'}});expect(await snapshot()).toEqual(before);}
  else{expect(result).toHaveProperty('value');expect(await snapshot()).not.toEqual(before);}
 }finally{await blocker.query('ROLLBACK').catch(()=>{});await pending;await worker.end();await blocker.end();}
});
