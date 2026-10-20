import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createDisposableFoundationDatabase } from './local-postgres';
import { registerClockerDevice, redeemClockerEnrollment, authenticateClockerDevice, revokeClockerDevice } from '../../lib/clocker/devices.server';
import { setEmployeeClockerPin, readEmployeeClockerPin, verifyEmployeeClockerPin, readClockerIdentity, clearClockerIdentity, clockerIdentityWriteGuards } from '../../lib/clocker/pins.server';
import type { SqlExecutor } from '../../lib/notifications/types';
const key = Buffer.alloc(32, 41);
const owner = { employeeId: 'c2-owner', sessionTokenHash: 'a'.repeat(64) };
const manager = { employeeId: 'c2-manager', sessionTokenHash: 'b'.repeat(64) };
let db: Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
let device: Awaited<ReturnType<typeof authenticateClockerDevice>>;
const q = <T = Record<string, unknown>>(text: string, values: unknown[] = []) => db.executor.query<T>({ text, values });
beforeEach(async () => {
 db = await createDisposableFoundationDatabase({ mode: 'current-runtime' });
 await q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES
 ('c2-owner','Owner','Test','555','OWNER','loc-1'),('c2-manager','Manager','Test','556','MANAGER','loc-1'),
 ('c2-a','Avery','Test','557','EMPLOYEE','loc-1'),('c2-b','Blair','Test','558','LEAD','loc-1');
 INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('a',64),'c2-owner',now()+interval '1 day'),(repeat('b',64),'c2-manager',now()+interval '1 day');
 INSERT INTO employee_location_eligibility(employee_id,location_id) SELECT id,'loc-1' FROM employees;
 INSERT INTO employee_credentials(employee_id,password_hash) VALUES('c2-a','portal-password-untouched');`);
 // Explicit intended Owner/Manager census before current operational adoption.
 for(const file of ['0031_native_payroll.sql','0032_company_access_invitations.sql'])await q(await readFile('db/migrations/'+file,'utf8'));
 const pending=await registerClockerDevice(owner,{name:'C2 tablet',locationId:'loc-1'},db.executor);
 const enrolled=await redeemClockerEnrollment({enrollmentToken:pending.enrollmentToken,locationKey:'2'},db.executor);
 device=await authenticateClockerDevice({credential:enrolled.credential,locationKey:'2'},db.executor);
});
afterEach(async () => { if(db) await db.dispose(); });
const set = (employeeId='c2-a', pin='0123', expectedVersion=0, proof=owner) => setEmployeeClockerPin(proof,{employeeId,pin,expectedVersion},key,db.executor);
const verify = (pin='0123') => verifyEmployeeClockerPin(device!.proof,pin,key,db.executor);

it('sets a separate unique PIN, stores hashes only and never changes portal credentials',async()=>{
 const result=await set();expect(result).toEqual({employeeId:'c2-a',configured:true,version:1});
 const [row]=await q('SELECT * FROM employee_clocker_pins');
 expect(row.lookup_hash).toMatch(/^[a-f0-9]{64}$/);expect(row.pin_hash).toMatch(/^scrypt-v1\$/);
 expect(Object.keys(row)).not.toContain('pin');
 expect(await q('SELECT password_hash FROM employee_credentials')).toEqual([{password_hash:'portal-password-untouched'}]);
 expect(await readEmployeeClockerPin(owner,'c2-a',db.executor)).toEqual(result);
 expect(await readEmployeeClockerPin(owner,'c2-b',db.executor)).toEqual({employeeId:'c2-b',configured:false,version:0});
});
it('allows a Manager to set an Employee PIN but denies Owner targets',async()=>{
 await expect(set('c2-a','0123',0,manager)).resolves.toMatchObject({version:1});
 await expect(set('c2-owner','4567',0,manager)).rejects.toMatchObject({code:'FORBIDDEN'});
});
it.each(['inactive-target','inactive-actor','expired-session','forged-session','employee-role'])('denies %s before any PIN write',async kind=>{
 let proof=owner;
 if(kind==='inactive-target')await q("UPDATE employees SET active=false WHERE id='c2-a'");
 if(kind==='inactive-actor')await q("UPDATE employees SET active=false WHERE id='c2-owner'");
 if(kind==='expired-session')await q("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second'");
 if(kind==='forged-session')proof={...owner,sessionTokenHash:manager.sessionTokenHash};
 if(kind==='employee-role')await q("UPDATE employees SET role='EMPLOYEE' WHERE id='c2-owner'");
 await expect(set('c2-a','0123',0,proof)).rejects.toThrow();
 expect(await q('SELECT * FROM employee_clocker_pins')).toEqual([]);
});
it('rejects workspace duplicates without revealing who holds the PIN',async()=>{
 await set();await expect(set('c2-b','0123')).rejects.toMatchObject({code:'PIN_UNAVAILABLE'});
 expect(await q('SELECT employee_id FROM employee_clocker_pins')).toEqual([{employee_id:'c2-a'}]);
});
it('serializes concurrent allocation of the same PIN to different employees',async()=>{
 const results=await Promise.allSettled([set('c2-a','4321'),set('c2-b','4321')]);
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
 expect(await q('SELECT count(*)::int AS n FROM employee_clocker_pins')).toEqual([{n:1}]);
});
it('rejects stale resets and preserves the latest PIN',async()=>{
 await set();await set('c2-a','9876',1);
 await expect(set('c2-a','4567',1)).rejects.toMatchObject({code:'STALE'});
 expect(await verify('0123')).toMatchObject({state:'denied'});
 expect(await verify('9876')).toMatchObject({state:'verified',firstName:'Avery'});
});
it('returns only short-lived identity; raw token remains in server result not stored data',async()=>{
 await set();const result=await verify();expect(result).toMatchObject({state:'verified',firstName:'Avery'});
 if(result.state!=='verified')throw Error('expected verification');
 expect(result.token).toMatch(/^nev_pin_[a-f0-9]{64}$/);
 const rows=await q('SELECT * FROM clocker_pin_sessions');expect(JSON.stringify(rows)).not.toContain(result.token);
 expect(await readClockerIdentity(device!.proof,result.token,key,db.executor)).toMatchObject({firstName:'Avery'});
});
it.each(['pin-reset','inactive-employee','employee-changed','ineligible-location','expired-session','device-revoked'])('invalidates live identity after %s',async kind=>{
 await set();const result=await verify();if(result.state!=='verified')throw Error('expected verification');
 if(kind==='pin-reset')await set('c2-a','5678',1);
 if(kind==='inactive-employee')await q("UPDATE employees SET active=false WHERE id='c2-a'");
 if(kind==='employee-changed')await q("UPDATE employees SET updated_at=clock_timestamp() WHERE id='c2-a'");
 if(kind==='ineligible-location')await q("DELETE FROM employee_location_eligibility WHERE employee_id='c2-a'");
 if(kind==='expired-session')await q("UPDATE clocker_pin_sessions SET expires_at=clock_timestamp()-interval '1 second'");
 if(kind==='device-revoked')await revokeClockerDevice(owner,{deviceId:device!.device.id,expectedVersion:2},db.executor);
 expect(await readClockerIdentity(device!.proof,result.token,key,db.executor)).toBeNull();
});
it('resetting to the same PIN still advances its version and invalidates old grants',async()=>{
 await set();const r=await verify();if(r.state!=='verified')throw Error('expected verification');
 await set('c2-a','0123',1);expect(await readClockerIdentity(device!.proof,r.token,key,db.executor)).toBeNull();
 expect(await verify()).toMatchObject({state:'verified'});
});
it('old clear request cannot delete a newer employee identity on the same tablet',async()=>{
 await set();await set('c2-b','4567');const a=await verify();const b=await verify('4567');
 if(a.state!=='verified'||b.state!=='verified')throw Error('expected verification');
 await clearClockerIdentity(device!.proof,a.token,db.executor);
 expect(await readClockerIdentity(device!.proof,b.token,key,db.executor)).toMatchObject({firstName:'Blair'});
 await clearClockerIdentity(device!.proof,b.token,db.executor);
 expect(await readClockerIdentity(device!.proof,b.token,key,db.executor)).toBeNull();
});
it.each(['unknown','inactive','ineligible'])('uses the same denied result for %s PIN identity',async kind=>{
 await set();if(kind==='inactive')await q("UPDATE employees SET active=false WHERE id='c2-a'");
 if(kind==='ineligible')await q("DELETE FROM employee_location_eligibility WHERE employee_id='c2-a'");
 expect(await verify(kind==='unknown'?'9999':'0123')).toEqual({state:'denied'});
 expect(await q('SELECT * FROM clocker_pin_sessions')).toEqual([]);
});
it('persists device attempt limits across requests and resumes only after the database window',async()=>{
 await set();for(let n=0;n<5;n++)expect(await verify('9999')).toEqual({state:'denied'});
 expect(await verify()).toMatchObject({state:'limited'});
 await q("UPDATE clocker_pin_limits SET failure_window=clock_timestamp()-interval '6 minutes',attempt_window=clock_timestamp()-interval '2 minutes'");
 expect(await verify()).toMatchObject({state:'verified'});
});
it('successful verification does not erase earlier failed attempts',async()=>{
 await set();for(let n=0;n<3;n++)await verify('9999');await verify();
 for(let n=0;n<2;n++)await verify('9999');expect(await verify()).toMatchObject({state:'limited'});
});
it('serializes burst attempts so only five reach verification',async()=>{
 await set();const results=await Promise.all(Array.from({length:8},()=>verify('9999')));
 expect(results.filter(r=>r.state==='denied')).toHaveLength(5);
 expect(results.filter(r=>r.state==='limited')).toHaveLength(3);
});
it('workspace budget still applies when a different registered tablet is used',async()=>{
 await set();await q("INSERT INTO clocker_pin_limits(scope,scope_id,failures,failure_window) VALUES('WORKSPACE','workspace-fuel',20,clock_timestamp())");
 expect(await verify()).toMatchObject({state:'limited'});
});
it('blocks attempts exceeding the total hashing budget even without failures',async()=>{
 await set();await q("INSERT INTO clocker_pin_limits(scope,scope_id,attempts,attempt_window) VALUES('DEVICE',$1,60,clock_timestamp())",[device!.device.id]);
 expect(await verify()).toMatchObject({state:'limited'});
});
it('fails closed on an accidental server-key change, preserving PIN uniqueness',async()=>{
 await set();await expect(setEmployeeClockerPin(owner,{employeeId:'c2-b',pin:'0123',expectedVersion:0},Buffer.alloc(32,42),db.executor)).rejects.toMatchObject({code:'UNAVAILABLE'});
 await expect(verifyEmployeeClockerPin(device!.proof,'0123',Buffer.alloc(32,42),db.executor)).rejects.toMatchObject({code:'UNAVAILABLE'});
});
it('reauthorizes after a PIN pre-read is invalidated before the final transaction',async()=>{
 await set();let calls=0;const executor:SqlExecutor={query:(s,signal)=>db.executor.query(s,signal),transaction:async statements=>{
  calls++;if(calls===2)await q("UPDATE employees SET active=false WHERE id='c2-a'");
  return db.executor.transaction(statements);
 }};
 const result=await verifyEmployeeClockerPin(device!.proof,'0123',key,executor);
 expect(result.state).not.toBe('verified');expect(await q('SELECT * FROM clocker_pin_sessions')).toEqual([]);
});
it('final-write guards reject an identity after its PIN is reset',async()=>{
 await set();const r=await verify();if(r.state!=='verified')throw Error('expected verification');
 const identity=await readClockerIdentity(device!.proof,r.token,key,db.executor);expect(identity).not.toBeNull();
 await set('c2-a','5555',1);
 await expect(db.executor.transaction(clockerIdentityWriteGuards(identity!.proof))).rejects.toThrow();
});

it('a privacy reset during verification prevents a late identity from being committed',async()=>{
 await set();let calls=0;const executor:SqlExecutor={query:(s,signal)=>db.executor.query(s,signal),transaction:async statements=>{
  if(++calls===2)await clearClockerIdentity(device!.proof,'',db.executor);
  return db.executor.transaction(statements);
 }};
 expect(await verifyEmployeeClockerPin(device!.proof,'0123',key,executor)).toEqual({state:'denied'});
 expect(await q('SELECT * FROM clocker_pin_sessions')).toEqual([]);
});

import { Client } from 'pg';
import type { SqlStatement } from '../../lib/notifications/types';
it.each(['employee-deactivation','pin-version-change'] as const)('rechecks %s after a real PostgreSQL lock wait',async kind=>{
 await set();
 const blocker=new Client({connectionString:db.connectionString}),worker=new Client({connectionString:db.connectionString});
 await blocker.connect();await worker.connect();const pid=(await worker.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
 const executor:SqlExecutor={query:async<T>(s:SqlStatement)=>(await worker.query(s.text,[...s.values])).rows as T[],transaction:async statements=>{
  await worker.query('BEGIN');try{const rows:unknown[][]=[];for(const s of statements)rows.push((await worker.query(s.text,[...s.values])).rows);await worker.query('COMMIT');return rows;}
  catch(error){await worker.query('ROLLBACK');throw error;}
 }};
 let pending:Promise<unknown>|undefined;
 try{
  await blocker.query('BEGIN');await blocker.query("SELECT id FROM employees WHERE id='c2-a' FOR UPDATE");
  const result=verifyEmployeeClockerPin(device!.proof,'0123',key,executor).then(value=>({value}),error=>({error}));pending=result;
  let blocked=false;for(let n=0;n<300;n++){const [row]=await q<{blocked:boolean}>('SELECT cardinality(pg_blocking_pids($1))>0 AS blocked',[pid]);if(row.blocked){blocked=true;break;}await new Promise(r=>setTimeout(r,10));}
  expect(blocked,'verification reaches the held employee lock').toBe(true);
  if(kind==='employee-deactivation')await blocker.query("UPDATE employees SET active=false WHERE id='c2-a'");
  else await blocker.query("UPDATE employee_clocker_pins SET version=version+1 WHERE employee_id='c2-a'");
  await blocker.query('COMMIT');expect(await result).toEqual({value:{state:'denied'}});
  expect(await q('SELECT * FROM clocker_pin_sessions')).toEqual([]);
 }finally{await blocker.query('ROLLBACK');await pending;await blocker.end();await worker.end();}
});
it('rolls back a PIN reset and leaves its prior identity valid if audit persistence fails',async()=>{
 await set();const identity=await verify();if(identity.state!=='verified')throw Error('expected identity');
 await q(`CREATE FUNCTION c2_fail_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'test-only audit failure'; END; $$;
 CREATE TRIGGER c2_fail_audit BEFORE INSERT ON clocker_pin_events FOR EACH ROW EXECUTE FUNCTION c2_fail_audit();`);
 await expect(set('c2-a','4567',1)).rejects.toMatchObject({code:'UNAVAILABLE'});
 expect(await readEmployeeClockerPin(owner,'c2-a',db.executor)).toMatchObject({version:1});
 expect(await readClockerIdentity(device!.proof,identity.token,key,db.executor)).toMatchObject({firstName:'Avery'});
});

// The management session may expire while a later PIN-row lock is still held.
// Authorization must cover the committing write, not just its earlier pre-read.
it('rolls back a PIN reset if its management session expires during the PIN-row lock wait',async()=>{
 await set();
 const identity=await verify();if(identity.state!=='verified')throw Error('expected identity');
 const before=await q('SELECT employee_id,pin_hash,version FROM employee_clocker_pins');
 const blocker=new Client({connectionString:db.connectionString});
 const worker=new Client({connectionString:db.connectionString});
 await blocker.connect();await worker.connect();
 const pid=(await worker.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
 let transactions=0;
 const executor:SqlExecutor={
  query:async<T>(statement:SqlStatement)=>(await worker.query(statement.text,[...statement.values])).rows as T[],
  transaction:async statements=>{
   if(++transactions===2)await q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '700 milliseconds' WHERE token_hash=repeat('a',64)");
   await worker.query('BEGIN');
   try{const rows:unknown[][]=[];for(const statement of statements)rows.push((await worker.query(statement.text,[...statement.values])).rows);await worker.query('COMMIT');return rows;}
   catch(error){await worker.query('ROLLBACK');throw error;}
  },
 };
 let pending:Promise<unknown>|undefined;
 try{
  await blocker.query('BEGIN');
  await blocker.query("SELECT employee_id FROM employee_clocker_pins WHERE employee_id='c2-a' FOR UPDATE");
  const outcome=setEmployeeClockerPin(owner,{employeeId:'c2-a',pin:'5678',expectedVersion:1},key,executor)
   .then(value=>({value}),error=>({error}));pending=outcome;
  let blocked=false;
  for(let n=0;n<200;n++){
   const [row]=await q<{blocked:boolean}>('SELECT cardinality(pg_blocking_pids($1))>0 AS blocked',[pid]);
   if(row.blocked){blocked=true;break;}
   await new Promise(resolve=>setTimeout(resolve,10));
  }
  expect(blocked,'PIN reset reaches the held row after initial authorization').toBe(true);
  await q("SELECT pg_sleep(GREATEST(0,extract(epoch FROM expires_at-clock_timestamp()))::double precision+0.05) FROM employee_sessions WHERE token_hash=repeat('a',64)");
  expect(await q("SELECT expires_at<=clock_timestamp() AS expired FROM employee_sessions WHERE token_hash=repeat('a',64)")).toEqual([{expired:true}]);
  await blocker.query('COMMIT');
  expect(await outcome).toMatchObject({error:{code:'FORBIDDEN'}});
  expect(await q('SELECT employee_id,pin_hash,version FROM employee_clocker_pins')).toEqual(before);
  expect(await q('SELECT pin_version FROM clocker_pin_events')).toEqual([{pin_version:1}]);
  expect(await readClockerIdentity(device!.proof,identity.token,key,db.executor)).toMatchObject({firstName:'Avery'});
 }finally{await blocker.query('ROLLBACK');await pending;await blocker.end();await worker.end();}
});

// Defensive regression using only this suite's fictional employees and owned,
// disposable loopback database. No real credentials or external systems are used.
it('privacy reset cancels a pending verification after the previous identity was removed',async()=>{
 await set();await set('c2-b','4567');
 const previous=await verify();if(previous.state!=='verified')throw Error('expected initial identity');
 let transactions=0;
 const executor:SqlExecutor={query:(statement,signal)=>db.executor.query(statement,signal),transaction:async statements=>{
  if(++transactions===2)await clearClockerIdentity(device!.proof,previous.token,db.executor);
  return db.executor.transaction(statements);
 }};
 expect(await verifyEmployeeClockerPin(device!.proof,'4567',key,executor)).toEqual({state:'denied'});
 expect(await q('SELECT employee_id FROM clocker_pin_sessions')).toEqual([]);
});
