
import { readFile } from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
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
const identified = (employeeId='c2-a',pin='0123') => verifyEmployeeClockerPin(device!.proof,pin,key,db.executor,employeeId);

/** Actual non-owner APP login, with only the existing business-table permissions
 * used by PIN verification. No definer execution, tenancy-schema usage, DDL,
 * ownership, role membership or superuser privilege is granted to the APP. */
async function asPinApp(run:(executor:SqlExecutor,client:Client,role:string)=>Promise<void>){
 const role='nv_app_'+randomUUID().replaceAll('-','').slice(0,24),url=new URL(db.connectionString);
 await q(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS NOREPLICATION`);
 await q(`GRANT USAGE ON SCHEMA public TO ${role}`);
 await q(`GRANT SELECT,UPDATE ON workspaces,locations,employees,employee_location_eligibility,employee_clocker_pins,clocker_devices TO ${role}`);
 await q(`GRANT SELECT ON clocker_pin_configuration TO ${role}`);
 await q(`GRANT SELECT,INSERT,UPDATE,DELETE ON clocker_pin_limits,clocker_pin_sessions TO ${role}`);
 url.username=role;url.password='';const client=new Client({connectionString:url.href,connectionTimeoutMillis:1000});
 const executor:SqlExecutor={query:async<T>(s:SqlStatement)=>(await client.query(s.text,[...s.values])).rows as T[],transaction:async statements=>{
  await client.query('BEGIN');try{const rows:unknown[][]=[];for(const s of statements)rows.push((await client.query(s.text,[...s.values])).rows);await client.query('COMMIT');return rows;}
  catch(error){await client.query('ROLLBACK');throw error;}
 }};
 try{await client.connect();await run(executor,client,role);}
 finally{await client.end();await q(`DROP OWNED BY ${role}`);await q(`DROP ROLE ${role}`);}
}

it('enforces PERSON protection under an actual APP login and cannot read another physical company database',async()=>{
 await set();const saved=process.env.FUEL_TEST_DATABASE_URL!,target=new URL(saved);target.pathname+='_foreign';
 let foreign:typeof db|undefined;
 try{
  process.env.FUEL_TEST_DATABASE_URL=target.href;foreign=await createDisposableFoundationDatabase({mode:'current-runtime'});
 }finally{process.env.FUEL_TEST_DATABASE_URL=saved;}
 try{
  await foreign.executor.query({text:"INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('private-other-company','Foreign','Private','559','EMPLOYEE','loc-1')",values:[]});
  await foreign.executor.query({text:`REVOKE CONNECT ON DATABASE "${target.pathname.slice(1)}" FROM PUBLIC`,values:[]});
  await asPinApp(async(executor,client,role)=>{
   expect((await client.query('SELECT current_user=session_user AS same,rolsuper,rolbypassrls,rolcreaterole,rolcreatedb FROM pg_roles WHERE rolname=current_user')).rows).toEqual([{same:true,rolsuper:false,rolbypassrls:false,rolcreaterole:false,rolcreatedb:false}]);
   expect((await client.query("SELECT p.prosecdef,has_function_privilege(current_user,p.oid,'EXECUTE') AS executable FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='clocker_pin_person_parent_guard'")).rows).toEqual([{prosecdef:false,executable:false}]);
   expect((await client.query("SELECT has_database_privilege(current_user,$1,'CONNECT') AS allowed",[target.pathname.slice(1)])).rows).toEqual([{allowed:false}]);
   const foreignUrl=new URL(foreign!.connectionString);foreignUrl.username=role;foreignUrl.password='';const denied=new Client({connectionString:foreignUrl.href,connectionTimeoutMillis:1000});
   try{await expect(denied.connect()).rejects.toMatchObject({code:'42501'});}finally{await denied.end();}
   expect(await verifyEmployeeClockerPin(device!.proof,'0123',key,executor,'private-other-company')).toEqual({state:'denied'});
   expect(await verifyEmployeeClockerPin(device!.proof,'0123',key,executor,'\u0000bad')).toEqual({state:'denied'});
   expect((await client.query("SELECT count(*)::int AS n FROM clocker_pin_limits WHERE scope='PERSON'")).rows).toEqual([{n:0}]);
   for(let n=0;n<5;n++)expect(await verifyEmployeeClockerPin(device!.proof,'9999',key,executor,'C2-A')).toEqual({state:'denied'});
   expect(await verifyEmployeeClockerPin(device!.proof,'0123',key,executor,'C2-A')).toMatchObject({state:'limited',limitScope:'person'});
   expect((await client.query("SELECT scope,failures,attempts FROM clocker_pin_limits ORDER BY scope")).rows).toEqual([{scope:'DEVICE',failures:7,attempts:7},{scope:'PERSON',failures:5,attempts:5},{scope:'WORKSPACE',failures:7,attempts:7}]);
  });
 }finally{await foreign.dispose();}
});

it('preserves the actual held f10 statement and identity guards around PERSON inserts and metadata backfill',async()=>{
 await set();await identified('c2-a','9999');
 // Install the unchanged guard bodies from the held migration against its
 // minimal protocol fixture. This tests guard composition, not f10 activation.
 const source=await readFile('db/migrations/0026_tenant_ownership_expand.sql','utf8');
 await q(`CREATE SCHEMA nevora_tenancy;
 CREATE TABLE nevora_tenancy.expansion_protocol(migration_id integer PRIMARY KEY,phase text,backfill_actor name,capture_manifest_sha256 text);
 CREATE TABLE nevora_tenancy.owned_table_contract(table_name name PRIMARY KEY,storage text,anchor jsonb,primary_key_columns name[]);
 INSERT INTO nevora_tenancy.expansion_protocol VALUES(26,'FENCED',NULL,NULL);
 INSERT INTO nevora_tenancy.owned_table_contract VALUES('clocker_pin_limits','DIRECT_IMMUTABLE','{"kind":"TYPED_SCOPE"}',ARRAY['scope','scope_id']::name[]);
 ALTER TABLE employees ADD COLUMN workspace_id text;
 ALTER TABLE clocker_pin_limits ADD COLUMN workspace_id text;`);
 for(const [name,tag] of [['source_write_fence','write_fence'],['source_identity_guard','identity_guard']]){
  const start=source.indexOf('CREATE FUNCTION nevora_tenancy.'+name+'()'),end=source.indexOf('$'+tag+'$;',start)+('$'+tag+'$;').length;
  expect(start).toBeGreaterThan(0);await q(source.slice(start,end));
 }
 await q(`CREATE TRIGGER f10_write_fence BEFORE INSERT OR UPDATE OR DELETE OR TRUNCATE ON clocker_pin_limits FOR EACH STATEMENT EXECUTE FUNCTION nevora_tenancy.source_write_fence();
 CREATE TRIGGER f10_identity_guard BEFORE INSERT OR UPDATE OR DELETE ON clocker_pin_limits FOR EACH ROW EXECUTE FUNCTION nevora_tenancy.source_identity_guard();`);
 await asPinApp(async(_executor,client)=>{
  await expect(client.query("INSERT INTO clocker_pin_limits(scope,scope_id) VALUES('PERSON','unknown-id')")).rejects.toMatchObject({code:'55000',message:'f10_legacy_writes_fenced'});
  await expect(client.query("UPDATE clocker_pin_limits SET failures=failures+1 WHERE scope='PERSON'")).rejects.toMatchObject({code:'55000',message:'f10_legacy_writes_fenced'});
 });
 await q("UPDATE nevora_tenancy.expansion_protocol SET backfill_actor=current_user,capture_manifest_sha256=repeat('a',64)");
 await q("UPDATE clocker_pin_limits SET workspace_id='workspace-fuel' WHERE scope='PERSON'");
 expect(await q("SELECT scope_id,failures,workspace_id FROM clocker_pin_limits WHERE scope='PERSON'")).toEqual([{scope_id:'c2-a',failures:1,workspace_id:'workspace-fuel'}]);
 await q("UPDATE nevora_tenancy.expansion_protocol SET phase='VALIDATED',backfill_actor=NULL,capture_manifest_sha256=NULL");
 await asPinApp(async(executor,client)=>{
  // An unfilled immutable employee owner is an unknown ID to the verifier;
  // allowed abuse credit commits without attempting a PERSON-row insert.
  expect(await verifyEmployeeClockerPin(device!.proof,'0123',key,executor,'c2-b')).toEqual({state:'denied'});
  expect((await client.query("SELECT count(*)::int AS n FROM clocker_pin_limits WHERE scope='PERSON' AND scope_id='c2-b'")).rows).toEqual([{n:0}]);
  expect((await client.query("SELECT failures FROM clocker_pin_limits WHERE scope='WORKSPACE'")).rows).toEqual([{failures:2}]);
  await expect(client.query("INSERT INTO clocker_pin_limits(scope,scope_id) VALUES('PERSON','c2-b')")).rejects.toMatchObject({code:'23503',message:'clocker_pin_person_parent_invalid'});
  await q("UPDATE employees SET workspace_id='foreign' WHERE id='c2-b'");
  await expect(client.query("INSERT INTO clocker_pin_limits(scope,scope_id) VALUES('PERSON','c2-b')")).rejects.toMatchObject({code:'23503'});
  await q("UPDATE employees SET workspace_id='workspace-fuel' WHERE id='c2-b'");
  await expect(client.query("INSERT INTO clocker_pin_limits(scope,scope_id,workspace_id) VALUES('PERSON','c2-b','foreign')")).rejects.toMatchObject({code:'23503'});
  await client.query("INSERT INTO clocker_pin_limits(scope,scope_id) VALUES('PERSON','c2-b')");
  expect((await client.query("SELECT workspace_id FROM clocker_pin_limits WHERE scope='PERSON' AND scope_id='c2-b'")).rows).toEqual([{workspace_id:'workspace-fuel'}]);
  await expect(client.query("UPDATE clocker_pin_limits SET scope_id='c2-owner' WHERE scope='PERSON' AND scope_id='c2-b'")).rejects.toMatchObject({code:'23514',message:'clocker_pin_person_identity_immutable'});
  await expect(client.query("UPDATE clocker_pin_limits SET workspace_id='foreign' WHERE scope='PERSON' AND scope_id='c2-b'")).rejects.toMatchObject({code:'23514',message:'f10_workspace_immutable'});
 });
});

it('limits five wrong PINs for one identified employee while another employee can verify on the same tablet',async()=>{
 await set();await set('c2-b','4567');
 for(let n=0;n<5;n++)expect(await identified(' c2-A ','9999')).toEqual({state:'denied'});
 expect(await identified()).toMatchObject({state:'limited',limitScope:'person'});
 expect(await identified('c2-b','4567')).toMatchObject({state:'verified',firstName:'Blair'});
 expect(await q("SELECT scope_id,failures FROM clocker_pin_limits WHERE scope='PERSON' ORDER BY scope_id")).toEqual([{scope_id:'c2-a',failures:5},{scope_id:'c2-b',failures:0}]);
});
it('shares an identified person failure budget across registered devices',async()=>{
 await set();for(let n=0;n<5;n++)await identified('c2-a','9999');
 const pending=await registerClockerDevice(owner,{name:'Second C2 tablet',locationId:'loc-1'},db.executor);
 const enrolled=await redeemClockerEnrollment({enrollmentToken:pending.enrollmentToken,locationKey:'2'},db.executor);
 const other=await authenticateClockerDevice({credential:enrolled.credential,locationKey:'2'},db.executor);
 expect(await verifyEmployeeClockerPin(other!.proof,'0123',key,db.executor,'C2-A')).toMatchObject({state:'limited',limitScope:'person'});
});
it('requires the supplied employee ID and PIN to identify the same employee',async()=>{
 await set();await set('c2-b','4567');
 expect(await identified('c2-b','0123')).toEqual({state:'denied'});
 expect(await q('SELECT * FROM clocker_pin_sessions')).toEqual([]);
 expect(await identified('c2-b','4567')).toMatchObject({state:'verified',firstName:'Blair'});
});
it('uniformly denies unknown, inactive and malformed IDs without creating unbounded person rows',async()=>{
 await set();
 await q("UPDATE employees SET active=false WHERE id='c2-b'");
 for(const id of ['missing-1','missing-2','missing-3','c2-b','','\u0000bad'])expect(await identified(id,'0123')).toEqual({state:'denied'});
 expect(await q("SELECT * FROM clocker_pin_limits WHERE scope='PERSON'")).toEqual([]);
 expect(await q("SELECT scope,failures,attempts FROM clocker_pin_limits ORDER BY scope")).toEqual([{scope:'DEVICE',failures:6,attempts:6},{scope:'WORKSPACE',failures:6,attempts:6}]);
 expect(await q('SELECT * FROM clocker_pin_sessions')).toEqual([]);
});
it.each([[200,295,'person'],[295,200,'workspace'],[200,200,'workspace']] as const)('reports the controlling rounded deadline for PERSON age%s/workspace age%s as %s',async(personAge,workspaceAge,limitScope)=>{
 await set();await identified();
 await q("UPDATE clocker_pin_limits SET failures=CASE scope WHEN 'WORKSPACE' THEN 20 WHEN 'PERSON' THEN 5 ELSE 0 END,failure_window=clock_timestamp()-(CASE scope WHEN 'WORKSPACE' THEN $2::int ELSE $1::int END)*interval '1 second'",[personAge,workspaceAge]);
 const result=await identified();expect(result).toMatchObject({state:'limited',limitScope});
 if(result.state!=='limited')throw Error('expected limit');expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(98);expect(result.retryAfterSeconds).toBeLessThanOrEqual(100);
});
it('keeps the unchanged workspace ceiling for identified requests with arbitrary IDs',async()=>{
 await set();for(let n=0;n<20;n++)expect(await identified('unknown-'+n,'9999')).toEqual({state:'denied'});
 expect(await identified()).toMatchObject({state:'limited',limitScope:'workspace'});
 expect(await q("SELECT count(*)::int AS n FROM clocker_pin_limits WHERE scope='PERSON'")).toEqual([{n:1}]);
});
it('prevents PIN-only fallback while PERSON remains locked after different tablet and workspace window resets',async()=>{
 await set();for(let n=0;n<5;n++)await identified('c2-a','9999');
 await q("UPDATE clocker_pin_limits SET failure_window=clock_timestamp()-interval '6 minutes' WHERE scope IN('DEVICE','WORKSPACE')");
 expect(await verify()).toEqual({state:'denied'});
 expect(await q('SELECT * FROM clocker_pin_sessions')).toEqual([]);
 expect(await q("SELECT failures FROM clocker_pin_limits WHERE scope='PERSON'")).toEqual([{failures:5}]);
 await q("UPDATE clocker_pin_limits SET failure_window=clock_timestamp()-interval '6 minutes' WHERE scope='PERSON'");
 expect(await verify()).toMatchObject({state:'verified'});
});
it('serializes identified burst attempts before hashing at the five-person ceiling',async()=>{
 await set();const results=await Promise.all(Array.from({length:8},()=>identified('c2-a','9999')));
 expect(results.filter(r=>r.state==='denied')).toHaveLength(5);expect(results.filter(r=>r.state==='limited')).toHaveLength(3);
 expect(await q("SELECT failures,attempts FROM clocker_pin_limits WHERE scope='PERSON'")).toEqual([{failures:5,attempts:5}]);
});
it.each([
 ['device failures',20,0,0,'device'],['workspace failures',0,20,0,'workspace'],
 ['device rate',0,0,60,'device'],
] as const)('preserves the identified %s backstop without hashing another PIN',async(_name,deviceFailures,workspaceFailures,attempts,scope)=>{
 await set();await identified();
 await q("UPDATE clocker_pin_limits SET failures=CASE scope WHEN 'DEVICE' THEN $1::int WHEN 'WORKSPACE' THEN $2::int ELSE 0 END,attempts=CASE scope WHEN 'DEVICE' THEN $3::int ELSE 0 END",[deviceFailures,workspaceFailures,attempts]);
 expect(await identified()).toMatchObject({state:'limited',limitScope:scope});
 expect(await q("SELECT attempts FROM clocker_pin_limits WHERE scope='PERSON'")).toEqual([{attempts:0}]);
 expect(await q('SELECT * FROM clocker_pin_sessions')).toEqual([]);
});
it('retains a newer identified employee intent when an older correct PIN finishes late',async()=>{
 await set();await set('c2-b','4567');let transactions=0;
 const executor:SqlExecutor={query:(s,signal)=>db.executor.query(s,signal),transaction:async statements=>{
  if(++transactions===2)expect(await identified('c2-b','4567')).toMatchObject({state:'verified'});
  return db.executor.transaction(statements);
 }};
 expect(await verifyEmployeeClockerPin(device!.proof,'0123',key,executor,'c2-a')).toEqual({state:'denied'});
 expect(await q('SELECT employee_id FROM clocker_pin_sessions')).toEqual([{employee_id:'c2-b'}]);
});
it('waits for the common budget before locking a tablet during a concurrent identity commit',async()=>{
 await set();const committing=new Client({connectionString:db.connectionString}),racing=new Client({connectionString:db.connectionString});
 await committing.connect();await racing.connect();const pid=(await racing.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
 let signalReady!:()=>void,resume!:()=>void;
 const ready=new Promise<void>(resolve=>{signalReady=resolve;}),gate=new Promise<void>(resolve=>{resume=resolve;});
 const executor=(client:Client,pause:boolean):SqlExecutor=>({query:async<T>(s:SqlStatement)=>(await client.query(s.text,[...s.values])).rows as T[],transaction:async statements=>{
  await client.query('BEGIN');try{const rows:unknown[][]=[],commit=statements.some(s=>s.text.includes('INSERT INTO clocker_pin_sessions'));
   for(const s of statements){rows.push((await client.query(s.text,[...s.values])).rows);
    if(pause&&commit&&s.text.includes('pg_advisory_xact_lock')){pause=false;signalReady();await gate;}
   }
   await client.query('COMMIT');return rows;
  }catch(error){await client.query('ROLLBACK');throw error;}
 }});
 const first=verifyEmployeeClockerPin(device!.proof,'0123',key,executor(committing,true),'c2-a').then(value=>({value}),error=>({error}));
 let second:Promise<unknown>|undefined,firstResult:unknown,secondResult:unknown;
 try{
  await Promise.race([ready,first.then(()=>{throw Error('verification did not reach its commit lock');})]);
  second=verifyEmployeeClockerPin(device!.proof,'9999',key,executor(racing,false),'c2-a').then(value=>({value}),error=>({error}));
  let blocked=false;for(let n=0;n<200;n++){if((await q<{blocked:boolean}>('SELECT cardinality(pg_blocking_pids($1))>0 AS blocked',[pid]))[0].blocked){blocked=true;break;}await new Promise(resolve=>setTimeout(resolve,10));}
  expect(blocked,'the competing admission waits for the common budget').toBe(true);
  // A waiting reservation must not hold the tablet row while the earlier
  // commit still needs it. This actual NOWAIT probe catches the lock inversion.
  expect(await q('SELECT id FROM clocker_devices WHERE id=$1 FOR UPDATE NOWAIT',[device!.device.id])).toEqual([{id:device!.device.id}]);
 }finally{resume();firstResult=await first;secondResult=await second;await committing.end();await racing.end();}
 expect(firstResult).toMatchObject({value:{state:'verified'}});expect(secondResult).toEqual({value:{state:'denied'}});
 expect(await q('SELECT * FROM clocker_pin_sessions')).toEqual([]);
});
it('rechecks the PERSON fence if a legacy verification races the fifth identified failure',async()=>{
 await set();for(let n=0;n<4;n++)await identified('c2-a','9999');let transactions=0;
 const pending=await registerClockerDevice(owner,{name:'Racing C2 tablet',locationId:'loc-1'},db.executor);
 const enrolled=await redeemClockerEnrollment({enrollmentToken:pending.enrollmentToken,locationKey:'2'},db.executor);
 const other=await authenticateClockerDevice({credential:enrolled.credential,locationKey:'2'},db.executor);
 const executor:SqlExecutor={query:(s,signal)=>db.executor.query(s,signal),transaction:async statements=>{
  if(++transactions===2)expect(await verifyEmployeeClockerPin(other!.proof,'9999',key,db.executor,'c2-a')).toEqual({state:'denied'});
  return db.executor.transaction(statements);
 }};
 expect(await verifyEmployeeClockerPin(device!.proof,'0123',key,executor)).toEqual({state:'denied'});
 expect(await q('SELECT * FROM clocker_pin_sessions')).toEqual([]);
});
it('releases only the captured PERSON, device and workspace failure windows after a correct check',async()=>{
 await set();let transactions=0;
 const executor:SqlExecutor={query:(s,signal)=>db.executor.query(s,signal),transaction:async statements=>{
  if(++transactions===2)await q("UPDATE clocker_pin_limits SET failures=4,failure_window=clock_timestamp()+interval '1 second'");
  return db.executor.transaction(statements);
 }};
 expect(await verifyEmployeeClockerPin(device!.proof,'0123',key,executor,'c2-a')).toMatchObject({state:'verified'});
 expect(await q('SELECT scope,failures FROM clocker_pin_limits ORDER BY scope')).toEqual([{scope:'DEVICE',failures:4},{scope:'PERSON',failures:4},{scope:'WORKSPACE',failures:4}]);
});
it.each(['employee','pin','eligibility','device','key'] as const)('rejects identified verification when current %s authority is revoked before commit',async loss=>{
 await set();let transactions=0;
 const executor:SqlExecutor={query:(s,signal)=>db.executor.query(s,signal),transaction:async statements=>{
  if(++transactions===2){
   if(loss==='employee')await q("UPDATE employees SET active=false WHERE id='c2-a'");
   if(loss==='pin')await set('c2-a','4567',1);
   if(loss==='eligibility')await q("DELETE FROM employee_location_eligibility WHERE employee_id='c2-a'");
   if(loss==='device')await revokeClockerDevice(owner,{deviceId:device!.device.id,expectedVersion:2},db.executor);
   if(loss==='key')await q("UPDATE clocker_pin_configuration SET key_identity=repeat('b',64)");
  }
  return db.executor.transaction(statements);
 }};
 const [result]=await Promise.allSettled([verifyEmployeeClockerPin(device!.proof,'0123',key,executor,'c2-a')]);
 if(result.status==='fulfilled')expect(result.value).toEqual({state:'denied'});
 else expect(result.reason).toMatchObject({code:'UNAVAILABLE'});
 expect(await q('SELECT * FROM clocker_pin_sessions')).toEqual([]);
 expect(await q("SELECT failures FROM clocker_pin_limits WHERE scope='PERSON'")).toEqual([{failures:1}]);
});

it('sets a separate unique PIN, stores hashes only and never changes portal credentials',async()=>{
 const result=await set();expect(result).toEqual({employeeId:'c2-a',configured:true,version:1});
 const [row]=await q('SELECT * FROM employee_clocker_pins');
 expect(row.lookup_hash).toMatch(/^[a-f0-9]{64}$/);expect(row.pin_hash).toMatch(/^scrypt-v1\$/);
 expect(Object.keys(row)).not.toContain('pin');
 expect(await q('SELECT password_hash FROM employee_credentials')).toEqual([{password_hash:'portal-password-untouched'}]);
 expect(await readEmployeeClockerPin(owner,'c2-a',db.executor)).toEqual(result);
 expect(await readEmployeeClockerPin(owner,'c2-b',db.executor)).toEqual({employeeId:'c2-b',configured:false,version:0});
});
it('denies Manager PIN writes for both Employee and Owner targets',async()=>{
 await expect(set('c2-a','0123',0,manager)).rejects.toMatchObject({code:'FORBIDDEN'});
 await expect(set('c2-owner','4567',0,manager)).rejects.toMatchObject({code:'FORBIDDEN'});
 expect(await q('SELECT * FROM employee_clocker_pins')).toEqual([]);expect(await q('SELECT * FROM clocker_pin_events')).toEqual([]);
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
 let expiryScheduled=false;
 const executor:SqlExecutor={
  query:async<T>(statement:SqlStatement)=>(await worker.query(statement.text,[...statement.values])).rows as T[],
  transaction:async statements=>{
   if(statements.some(statement=>statement.text.includes('INSERT INTO employee_clocker_pins'))){
    // Slow preparation must not spend the fixture's expiry before the write.
    await q('SELECT pg_sleep(0.8)');expect(expiryScheduled).toBe(false);
    await q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '700 milliseconds' WHERE token_hash=repeat('a',64)");expiryScheduled=true;
   }
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
  expect(expiryScheduled,'expiry is scheduled for the actual PIN write batch').toBe(true);
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

it.each([
 ['device failures',5,240,0,0,0,0,0,0,60],
 ['workspace failures',0,0,20,150,0,0,0,0,150],
 ['device rate',0,0,0,0,60,40,0,0,20],
 ['workspace rate',0,0,0,0,0,0,240,15,45],
 ['all active windows',5,270,20,190,60,10,240,30,110],
 ['expired failure and active rate',5,301,0,0,60,20,0,0,40],
] as const)('returns database remaining seconds for %s without spending another hash budget',async(_name,df,dfAge,wf,wfAge,da,daAge,wa,waAge,seconds)=>{
 await set();await verify();
 await q(`UPDATE clocker_pin_limits SET failures=CASE scope WHEN 'DEVICE' THEN $1::int ELSE $3::int END,
 failure_window=clock_timestamp()-(CASE scope WHEN 'DEVICE' THEN $2::int ELSE $4::int END)*interval '1 second',
 attempts=CASE scope WHEN 'DEVICE' THEN $5::int ELSE $7::int END,
 attempt_window=clock_timestamp()-(CASE scope WHEN 'DEVICE' THEN $6::int ELSE $8::int END)*interval '1 second'`,[df,dfAge,wf,wfAge,da,daAge,wa,waAge]);
 const result=await verify();expect(result.state).toBe('limited');
 if(result.state!=='limited')throw Error('expected limit');
 expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(seconds-2);expect(result.retryAfterSeconds).toBeLessThanOrEqual(seconds);
 expect(await q('SELECT * FROM clocker_pin_sessions')).toEqual([]);
 const rows=await q<{scope:string;attempts:number}>('SELECT scope,attempts FROM clocker_pin_limits ORDER BY scope');
 expect(rows).toEqual([{scope:'DEVICE',attempts:da},{scope:'WORKSPACE',attempts:wa}]);
});
