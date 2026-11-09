import { Client } from 'pg';
import { beforeAll,afterAll,expect,it } from 'vitest';
import { createDisposableExchangeDatabase } from './local-postgres';
import { readShiftChangePolicy,saveShiftChangePolicy,saveOperationalRuleProfile } from '../../lib/data/shift-change-policy';
import type { PolicyWrite,OperationalProfileWrite } from '../../lib/shift-changes/types';
let db:Awaited<ReturnType<typeof createDisposableExchangeDatabase>>;
const input:PolicyWrite={proof:{employee:{id:'owner',firstName:'Test',lastName:'Owner',role:'OWNER',primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)},expectedRevision:0,scope:'swap',replacement:{mode:'AUTOMATIC_WHEN_VALID',submissionAdvanceMinutes:0,completionAdvanceMinutes:0}};
const q=(text:string,values:readonly unknown[]=[])=>db.executor.query({text,values});
beforeAll(async()=>{db=await createDisposableExchangeDatabase({mode:'current-runtime'});
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES ('owner','Test','Owner','0','OWNER','loc-1'),('a','Test','Employee','1','EMPLOYEE','loc-1')");
 await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES ($1,'owner',now()+interval '1 day')",[input.proof.sessionTokenHash]);
 await q("INSERT INTO employee_scheduling_settings(employee_id,target_weekly_hours,maximum_weekly_hours) VALUES ('a',24,44)");
});
afterAll(async()=>{await db?.dispose();});
it('fresh install has no customer policy; independent scope saves retain zero and null',async()=>{
 expect(await readShiftChangePolicy(db.executor)).toBeNull();
 expect(await saveShiftChangePolicy(input,db.executor)).toEqual({status:'saved',revision:1});
 expect(await saveShiftChangePolicy({...input,scope:'coverage',replacement:{mode:'MANAGER_REVIEW',submissionAdvanceMinutes:null,completionAdvanceMinutes:null}},db.executor)).toEqual({status:'saved',revision:1});
 expect(await readShiftChangePolicy(db.executor)).toMatchObject({revision:2,swap:{revision:1,mode:'AUTOMATIC_WHEN_VALID',submissionAdvanceMinutes:0},coverage:{revision:1,mode:'MANAGER_REVIEW',submissionAdvanceMinutes:null}});
 expect(await saveShiftChangePolicy(input,db.executor)).toEqual({status:'conflict'});
});
it('profile review is server stamped and preserves existing targets/caps',async()=>{
 const replacement:OperationalProfileWrite['replacement']={minimumRest:{status:'NOT_APPLICABLE',reviewedBy:'forged',reviewedAt:'2000-01-01T00:00:00Z'},maximumShift:{status:'UNKNOWN'},maximumDaily:{status:'CONFIGURED',revision:99,value:{minutes:480,timeBasis:'WALL_CLOCK',window:'BUSINESS_CALENDAR_DAY'}},breaks:{status:'UNKNOWN'},projectedOvertime:{status:'UNKNOWN'}};
 expect(await saveOperationalRuleProfile({proof:input.proof,employeeId:'a',expectedRevision:0,replacement},db.executor)).toEqual({status:'saved',revision:1});
 const [row]=await db.executor.query<{target:string;cap:string;profile:{reviewedBy:string;minimumRest:{reviewedBy:string};maximumDaily:{revision:number}}}>({text:'SELECT target_weekly_hours AS target,maximum_weekly_hours AS cap,operational_rule_profile AS profile FROM employee_scheduling_settings',values:[]});
 expect(row.target).toBe('24.00');expect(row.cap).toBe('44.00');expect(row.profile.reviewedBy).toBe('owner');expect(row.profile.minimumRest.reviewedBy).toBe('owner');expect(row.profile.maximumDaily.revision).toBe(1);
 expect(await saveOperationalRuleProfile({proof:input.proof,employeeId:'a',expectedRevision:0,replacement},db.executor)).toEqual({status:'conflict'});
});
it('rejects a revoked session after waiting for the workspace lock',async()=>{
 const lock=new Client({connectionString:db.connectionString});await lock.connect();
 await lock.query('BEGIN');await lock.query('SELECT id FROM workspaces FOR UPDATE');
 const waiting=saveShiftChangePolicy({...input,expectedRevision:1},db.executor);
 try {
  let blocked=false;
  for(let n=0;n<100;n++) {
   await lock.query('SELECT pg_stat_clear_snapshot()');
   const rows=await lock.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND pid<>pg_backend_pid()");
   if(rows.rowCount){blocked=true;break;}
   await lock.query('SELECT pg_sleep(0.01)');
  }
  expect(blocked).toBe(true);
  await q('DELETE FROM employee_sessions WHERE token_hash=$1',[input.proof.sessionTokenHash]);
 } finally {await lock.query('ROLLBACK');await lock.end();}
 expect(await waiting).toMatchObject({status:'invalid',fieldErrors:[{field:'authorization'}]});
 expect(await readShiftChangePolicy(db.executor)).toMatchObject({revision:2});
 await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES ($1,'owner',now()+interval '1 day')",[input.proof.sessionTokenHash]);
});
it('rejects session expiry during a later employee-settings row lock without changing the profile',async()=>{
 const before=await q("SELECT operational_rule_profile FROM employee_scheduling_settings WHERE employee_id='a'");
 await q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '1 second' WHERE token_hash=$1",[input.proof.sessionTokenHash]);
 const lock=new Client({connectionString:db.connectionString});await lock.connect();
 await lock.query('BEGIN');await lock.query("SELECT employee_id FROM employee_scheduling_settings WHERE employee_id='a' FOR UPDATE");
 const replacement:OperationalProfileWrite['replacement']={minimumRest:{status:'UNKNOWN'},maximumShift:{status:'UNKNOWN'},maximumDaily:{status:'UNKNOWN'},breaks:{status:'UNKNOWN'},projectedOvertime:{status:'UNKNOWN'}};
 const waiting=saveOperationalRuleProfile({proof:input.proof,employeeId:'a',expectedRevision:1,replacement},db.executor);
 try {
  let blocked=false;
  for(let n=0;n<100;n++) {
   await lock.query('SELECT pg_stat_clear_snapshot()');
   const rows=await lock.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'SELECT employee_id FROM employee_scheduling_settings%' AND pid<>pg_backend_pid()");
   if(rows.rowCount){blocked=true;break;}
   await lock.query('SELECT pg_sleep(0.01)');
  }
  expect(blocked).toBe(true);
  await lock.query('SELECT pg_sleep(GREATEST(0,extract(epoch FROM expires_at-clock_timestamp()))+0.05) FROM employee_sessions WHERE token_hash=$1',[input.proof.sessionTokenHash]);
  const expired=await lock.query('SELECT expires_at<=clock_timestamp() AS expired FROM employee_sessions WHERE token_hash=$1',[input.proof.sessionTokenHash]);
  expect(expired.rows[0].expired).toBe(true);
 } finally {await lock.query('ROLLBACK');await lock.end();}
 const outcome=await waiting;
 await q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '1 day' WHERE token_hash=$1",[input.proof.sessionTokenHash]);
 expect(outcome).toMatchObject({status:'invalid',fieldErrors:[{field:'authorization'}]});
 expect(await q("SELECT operational_rule_profile FROM employee_scheduling_settings WHERE employee_id='a'")).toEqual(before);
});
it('database role and specific active session remain authoritative',async()=>{
 await q("UPDATE employees SET role='MANAGER' WHERE id='owner'");
 expect(await saveShiftChangePolicy({...input,expectedRevision:1},db.executor)).toMatchObject({status:'invalid',fieldErrors:[{field:'authorization'}]});
 await q("UPDATE employees SET role='OWNER' WHERE id='owner'");
 await q('DELETE FROM employee_sessions WHERE token_hash=$1',[input.proof.sessionTokenHash]);
 expect(await saveShiftChangePolicy({...input,expectedRevision:1},db.executor)).toMatchObject({status:'invalid',fieldErrors:[{field:'authorization'}]});
 expect(await readShiftChangePolicy(db.executor)).toMatchObject({revision:2});
});
