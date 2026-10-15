import {it,expect,vi} from 'vitest';
import {Client} from 'pg';
import {randomUUID} from 'node:crypto';
import {companyAccessFixture} from './company-access-fixture';
import {getWorkspace,workspaceReadGuard} from '../../lib/data/workspaces';
import {isManagementAuthorizationError} from '../../lib/data/management-session';
import {readOwnerOperationalScope,assignOperationalScope,operationalScopeStatements,readOperationalAuthority} from '../../lib/company-access/operational-scope.server';
vi.mock('server-only',()=>({}));
type Fixture=Awaited<ReturnType<typeof companyAccessFixture>>;
async function waitLock(f:Fixture,pattern:string){
 const until=Date.now()+3500;
 while(Date.now()<until){
  const [r]=await f.q<{waiting:boolean}>("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE $1) AS waiting",[pattern]);
  if(r.waiting)return;await new Promise(r=>setTimeout(r,10));
 }
 throw Error('Expected actual SQL lock wait');
}
async function command(f:Fixture){
 const read=await readOwnerOperationalScope(f.owner,'manager',f.db.executor);if(read.state!=='ready')throw Error('Owner scope');
 const c=read.data.current;return {action:'REVOKE' as const,operationId:randomUUID(),expectedEmployeeVersion:c.employeeUpdatedAt,expectedRoleGeneration:c.roleGeneration,expectedScopeRevision:c.scopeRevision};
}
async function sink(f:Fixture,barrier?:Client){
 await f.q('CREATE TABLE test_owned_scope_writes(id integer PRIMARY KEY)');
 if(barrier){
  await barrier.connect();await barrier.query('SELECT pg_advisory_lock(321033)');
  await f.q(`CREATE FUNCTION test_owned_scope_write_wait() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_advisory_xact_lock(321033);RETURN NEW;END $$;
   CREATE TRIGGER test_owned_scope_write_wait BEFORE INSERT ON test_owned_scope_writes FOR EACH ROW EXECUTE FUNCTION test_owned_scope_write_wait()`);
 }
}
async function guarded(f:Fixture,writeId=1){
 const w=await getWorkspace(f.db.executor);
 try{
  await f.db.executor.transaction([...workspaceReadGuard(w),{text:"SELECT id FROM employees WHERE id='manager' FOR SHARE",values:[]},
   ...operationalScopeStatements(f.manager,w,{kind:'COMPANY'}),{text:'INSERT INTO test_owned_scope_writes VALUES($1)',values:[writeId]},
   ...operationalScopeStatements(f.manager,w,{kind:'COMPANY'})]);
  return true;
 }catch(error){
  const operational=error!==null&&typeof error==='object'&&'code'in error&&error.code==='22P02'&&'message'in error
   &&error.message==='invalid input syntax for type integer: "operational_authorization"';
  if(!operational&&!isManagementAuthorizationError(error))throw error;
  return false;
 }
}
async function close(f:Fixture,...clients:Client[]){for(const c of clients){await c.query('ROLLBACK').catch(()=>{});await c.query('SELECT pg_advisory_unlock_all()').catch(()=>{});await c.end().catch(()=>{});}await f.db.dispose();}
it('a revocation holding the workspace commits before a blocked operational guard and the guarded write is denied',async()=>{
 const f=await companyAccessFixture(),barrier=new Client({connectionString:f.db.connectionString,statement_timeout:5000});
 let revoking:ReturnType<typeof assignOperationalScope>|undefined,writing:Promise<boolean>|undefined;
 try{
  const c=await command(f);await sink(f);await barrier.connect();await barrier.query('SELECT pg_advisory_lock(321034)');
  await f.q(`CREATE FUNCTION test_owned_scope_revoke_wait() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='REVOKE' THEN PERFORM pg_advisory_xact_lock(321034);END IF;RETURN NEW;END $$;
   CREATE TRIGGER test_owned_scope_revoke_wait BEFORE INSERT ON operational_scope_revisions FOR EACH ROW EXECUTE FUNCTION test_owned_scope_revoke_wait()`);
  revoking=assignOperationalScope(f.owner,'manager',c,f.db.executor);await waitLock(f,'%INSERT INTO operational_scope_revisions%');
  writing=guarded(f);await waitLock(f,'%SELECT id FROM workspaces WHERE singleton=true ORDER BY id FOR SHARE%');
  await barrier.query('SELECT pg_advisory_unlock(321034)');
  expect((await revoking).state).toBe('saved');expect(await writing).toBe(false);expect(await f.q('SELECT * FROM test_owned_scope_writes')).toEqual([]);
 }finally{await barrier.query('SELECT pg_advisory_unlock_all()').catch(()=>{});await Promise.allSettled([revoking,writing]);await close(f,barrier);}
});
it.each([
 {name:'role change',lock:"SELECT id FROM employees WHERE id='manager' FOR UPDATE",change:"UPDATE employees SET role='EMPLOYEE' WHERE id='manager'",pattern:'%SELECT id FROM employees WHERE%'},
 {name:'session expiry',lock:"SELECT token_hash FROM employee_sessions WHERE employee_id='manager' FOR UPDATE",change:"UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE employee_id='manager'",pattern:'%SELECT token_hash FROM employee_sessions%'}
])('operational guard waiting behind $name denies after the change with no writes',async c=>{
 const f=await companyAccessFixture(),writer=new Client({connectionString:f.db.connectionString,statement_timeout:5000});
 try{
  await sink(f);await writer.connect();await writer.query('BEGIN');await writer.query(c.lock);
  const pending=guarded(f);await waitLock(f,c.pattern);await writer.query(c.change);await writer.query('COMMIT');
  expect(await pending).toBe(false);expect(await f.q('SELECT * FROM test_owned_scope_writes')).toEqual([]);
 }finally{await close(f,writer);}
});
it.each(['scope revocation','role change'] as const)('an operation holding its guards commits before a waiting %s, then new operations deny',async kind=>{
 const f=await companyAccessFixture(),barrier=new Client({connectionString:f.db.connectionString,statement_timeout:5000}),writer=new Client({connectionString:f.db.connectionString,statement_timeout:5000});
 try{
  const c=await command(f);await sink(f,barrier);await writer.connect();
  const pending=guarded(f);await waitLock(f,'%INSERT INTO test_owned_scope_writes%');
  const changing=kind==='scope revocation'?assignOperationalScope(f.owner,'manager',c,f.db.executor):writer.query("UPDATE employees SET role='EMPLOYEE' WHERE id='manager'");
  await waitLock(f,kind==='scope revocation'?'%SELECT id FROM workspaces WHERE singleton%':'%UPDATE employees SET role%');
  await barrier.query('SELECT pg_advisory_unlock(321033)');expect(await pending).toBe(true);await changing;
  expect(await f.q('SELECT * FROM test_owned_scope_writes')).toEqual([{id:1}]);expect(await guarded(f,2)).toBe(false);
  expect(await f.q('SELECT * FROM test_owned_scope_writes ORDER BY id')).toEqual([{id:1}]);
 }finally{await close(f,barrier,writer);}
});
it('wall-clock expiry after a guarded write rolls the write back on its final check',async()=>{
 const f=await companyAccessFixture(),barrier=new Client({connectionString:f.db.connectionString,statement_timeout:5000});
 try{
  await sink(f,barrier);await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '1200 milliseconds' WHERE employee_id='manager'");
  const pending=guarded(f);await waitLock(f,'%INSERT INTO test_owned_scope_writes%');
  const until=Date.now()+2500;let expired=false;while(!expired&&Date.now()<until){const [r]=await f.q<{expired:boolean}>("SELECT expires_at<=clock_timestamp() AS expired FROM employee_sessions WHERE employee_id='manager'");expired=r.expired;if(!expired)await new Promise(r=>setTimeout(r,20));}
  expect(expired).toBe(true);await barrier.query('SELECT pg_advisory_unlock(321033)');expect(await pending).toBe(false);expect(await f.q('SELECT * FROM test_owned_scope_writes')).toEqual([]);
 }finally{await close(f,barrier);}
});
it.each([
 {name:'subject lifecycle',id:'manager',want:'conflict'},
 {name:'Owner role loss',id:'owner',want:'unavailable'}
])('scope assignment blocked behind $name cannot append a stale grant or receipt',async c=>{
 const f=await companyAccessFixture(),writer=new Client({connectionString:f.db.connectionString,statement_timeout:5000});
 try{
  const cmd=await command(f);await writer.connect();await writer.query('BEGIN');await writer.query('SELECT id FROM employees WHERE id=$1 FOR UPDATE',[c.id]);
  const pending=assignOperationalScope(f.owner,'manager',cmd,f.db.executor);await waitLock(f,'%SELECT id FROM employees WHERE id=ANY%');
  await writer.query("UPDATE employees SET role='EMPLOYEE' WHERE id=$1",[c.id]);await writer.query('COMMIT');
  expect((await pending).state).toBe(c.want);expect(await f.q('SELECT count(*)::integer AS count FROM operational_scope_revisions')).toEqual([{count:1}]);expect(await f.q('SELECT operation_id FROM company_access_operations')).toEqual([]);
 }finally{await close(f,writer);}
});
it.each(['manager','owner'])('scope assignment holding locks commits before a waiting role change for %s, then current access changes',async id=>{
 const f=await companyAccessFixture(),barrier=new Client({connectionString:f.db.connectionString,statement_timeout:5000}),writer=new Client({connectionString:f.db.connectionString,statement_timeout:5000});
 try{
  const cmd=await command(f);await barrier.connect();await barrier.query('SELECT pg_advisory_lock(321035)');await writer.connect();
  await f.q(`CREATE FUNCTION test_owned_scope_receipt_wait() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='SCOPE' THEN PERFORM pg_advisory_xact_lock(321035);END IF;RETURN NEW;END $$;
   CREATE TRIGGER test_owned_scope_receipt_wait BEFORE INSERT ON company_access_operations FOR EACH ROW EXECUTE FUNCTION test_owned_scope_receipt_wait()`);
  const pending=assignOperationalScope(f.owner,'manager',cmd,f.db.executor);await waitLock(f,'%INSERT INTO company_access_operations%');
  const changing=writer.query("UPDATE employees SET role='EMPLOYEE' WHERE id=$1",[id]);await waitLock(f,'%UPDATE employees SET role%');
  await barrier.query('SELECT pg_advisory_unlock(321035)');expect((await pending).state).toBe('saved');await changing;
  expect(await f.q('SELECT count(*)::integer AS count FROM company_access_operations')).toEqual([{count:1}]);
  if(id==='manager'){const read=await readOperationalAuthority(f.manager,f.db.executor);if(read.state!=='ready')throw Error('Own role view');expect(read.scope).toBeNull();}
  else expect((await readOwnerOperationalScope(f.owner,'manager',f.db.executor)).state).toBe('unavailable');
 }finally{await close(f,barrier,writer);}
});

it('Owner expiry at the blocked scope receipt rolls revision and operation back together',async()=>{
 const f=await companyAccessFixture(),barrier=new Client({connectionString:f.db.connectionString,statement_timeout:5000});
 let pending:ReturnType<typeof assignOperationalScope>|undefined;
 try{
  const c=await command(f);await barrier.connect();await barrier.query('SELECT pg_advisory_lock(321036)');
  await f.q(`CREATE FUNCTION test_owned_scope_expiry_wait() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='SCOPE' THEN PERFORM pg_advisory_xact_lock(321036);END IF;RETURN NEW;END $$;
   CREATE TRIGGER test_owned_scope_expiry_wait BEFORE INSERT ON company_access_operations FOR EACH ROW EXECUTE FUNCTION test_owned_scope_expiry_wait()`);
  await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '1200 milliseconds' WHERE employee_id='owner'");
  pending=assignOperationalScope(f.owner,'manager',c,f.db.executor);await waitLock(f,'%INSERT INTO company_access_operations%');
  const until=Date.now()+2500;let expired=false;while(!expired&&Date.now()<until){const [r]=await f.q<{expired:boolean}>("SELECT expires_at<=clock_timestamp() AS expired FROM employee_sessions WHERE employee_id='owner'");expired=r.expired;if(!expired)await new Promise(r=>setTimeout(r,20));}
  expect(expired).toBe(true);await barrier.query('SELECT pg_advisory_unlock(321036)');expect((await pending).state).toBe('unavailable');
  expect(await f.q('SELECT count(*)::integer AS count FROM operational_scope_revisions')).toEqual([{count:1}]);expect(await f.q('SELECT operation_id FROM company_access_operations')).toEqual([]);
 }finally{await barrier.query('SELECT pg_advisory_unlock_all()').catch(()=>{});await pending;await close(f,barrier);}
});
