import {it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {companyAccessFixture} from './company-access-fixture';
import type {CoreProfileInput,EmployeeCoreAccessCommand,ScopeSelection,CreateEmployeeWithAccessCommand} from '../../lib/company-access/model';
vi.mock('server-only',()=>({}));
import {readOwnerOperationalScope,readOperationalAuthority} from '../../lib/company-access/operational-scope.server';
import {saveEmployeeCoreAccessProfile,createEmployeeWithAccess,readEmployeeCoreAccessOperation} from '../../lib/company-access/employee-profile.server';
type Fixture=Awaited<ReturnType<typeof companyAccessFixture>>;
async function command(f:Fixture,id='target',change:Partial<CoreProfileInput>={},scope?:ScopeSelection):Promise<EmployeeCoreAccessCommand>{
 const read=await readOwnerOperationalScope(f.owner,id,f.db.executor);if(read.state!=='ready')throw Error('Owner context');
 const [p]=await f.q<{firstName:string;lastName:string;email:string|null;role:CoreProfileInput['role'];primaryLocationId:string;active:boolean}>(
  'SELECT first_name AS "firstName",last_name AS "lastName",email,role,primary_location_id AS "primaryLocationId",active FROM employees WHERE id=$1',[id]);
 return {operationId:randomUUID(),employeeId:id,expectedEmployeeUpdatedAt:read.data.current.employeeUpdatedAt,
  profile:{...p,phone:'7875550103',...change},...(scope?{managerTransitionScope:{expectedRoleGeneration:read.data.current.roleGeneration,expectedScopeRevision:read.data.current.scopeRevision,scope}}:{})};
}
it('Owner promotion and scope commit once with the new generation, exact versions and one canonical replay receipt',async()=>{
 const f=await companyAccessFixture();try{
  const c=await command(f,'target',{role:'MANAGER'},{mode:'LOCATIONS',locationIds:['loc-1']});
  const saved=await saveEmployeeCoreAccessProfile(f.owner,c,f.db.executor);expect(saved.state).toBe('saved');if(saved.state!=='saved')throw Error('save');
  expect(saved.receipt.role).toBe('MANAGER');expect(saved.receipt.roleGeneration).toBe('2');expect(saved.receipt.scopeRevision).toBe(1);expect(saved.receipt.scope).toEqual({mode:'LOCATIONS',locationIds:['loc-1']});
  expect(await f.q("SELECT role,updated_at::text AS version FROM employees WHERE id='target'")).toEqual([{role:'MANAGER',version:saved.receipt.updatedAt}]);
  expect(await f.q("SELECT generation::text FROM operational_subject_versions WHERE employee_id='target'")).toEqual([{generation:'2'}]);
  expect(await saveEmployeeCoreAccessProfile(f.owner,c,f.db.executor)).toEqual(saved);
  expect(await readEmployeeCoreAccessOperation(f.owner,c.operationId,f.db.executor)).toEqual(saved);
  expect(await saveEmployeeCoreAccessProfile(f.owner,{...c,profile:{...c.profile,firstName:'Changed replay'}},f.db.executor)).toEqual({state:'conflict',reason:'changed_replay'});
  expect(await f.q("SELECT count(*)::integer AS count FROM operational_scope_revisions WHERE employee_id='target'")).toEqual([{count:1}]);
 }finally{await f.db.dispose();}
});
it('Owner must choose transition scope and failure after role mutation rolls role, generation, scope and receipt back together',async()=>{
 const f=await companyAccessFixture();try{
  const before=await f.q("SELECT to_jsonb(e) AS value FROM employees e WHERE id='target'");
  expect((await saveEmployeeCoreAccessProfile(f.owner,await command(f,'target',{role:'MANAGER'}),f.db.executor)).state).toBe('invalid');
  expect(await f.q("SELECT to_jsonb(e) AS value FROM employees e WHERE id='target'")).toEqual(before);
  await f.q(`CREATE FUNCTION test_owned_profile_scope_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.employee_id='target' THEN RAISE EXCEPTION 'owned after-role scope failure';END IF;RETURN NEW;END $$;
   CREATE TRIGGER test_owned_profile_scope_failure BEFORE INSERT ON operational_scope_revisions FOR EACH ROW EXECUTE FUNCTION test_owned_profile_scope_failure()`);
  const c=await command(f,'target',{role:'MANAGER'},{mode:'COMPANY',locationIds:[]});
  expect((await saveEmployeeCoreAccessProfile(f.owner,c,f.db.executor)).state).toBe('unavailable');
  expect(await f.q("SELECT to_jsonb(e) AS value FROM employees e WHERE id='target'")).toEqual(before);
  expect(await f.q("SELECT generation::text FROM operational_subject_versions WHERE employee_id='target'")).toEqual([{generation:'1'}]);
  expect(await f.q("SELECT count(*)::integer AS count FROM operational_scope_revisions WHERE employee_id='target'")).toEqual([{count:0}]);
  expect(await f.q('SELECT count(*)::integer AS count FROM company_access_operations WHERE operation_id=$1',[c.operationId])).toEqual([{count:0}]);
 }finally{await f.db.dispose();}
});
it('Company Manager promotion stays within the existing ceiling but cannot delegate scope; its new Manager is unassigned',async()=>{
 const f=await companyAccessFixture();try{
  const delegated=await command(f,'target',{role:'MANAGER'},{mode:'COMPANY',locationIds:[]});
  expect((await saveEmployeeCoreAccessProfile(f.manager,delegated,f.db.executor)).state).toBe('invalid');
  const c=await command(f,'target',{role:'MANAGER'}),saved=await saveEmployeeCoreAccessProfile(f.manager,c,f.db.executor);expect(saved.state).toBe('saved');
  if(saved.state!=='saved')throw Error('save');expect(saved.receipt.scopeState).toBe('UNASSIGNED');expect(saved.receipt.scope).toBeNull();expect(saved.receipt.roleGeneration).toBe('2');
  await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),'target',clock_timestamp()+interval '1 hour')");
  const own=await readOperationalAuthority({employee:{...f.manager.employee,id:'target'},sessionTokenHash:'d'.repeat(64)},f.db.executor);
  if(own.state!=='ready')throw Error('authority');expect(own.source).toBe('UNASSIGNED');expect(own.scope).toBeNull();
 }finally{await f.db.dispose();}
});
it('ordinary profile edits preserve operational generation/scope and a stale employee version cannot overwrite the new details',async()=>{
 const f=await companyAccessFixture();try{
  const c=await command(f,'manager',{firstName:'Ordinary edit'});
  const saved=await saveEmployeeCoreAccessProfile(f.owner,c,f.db.executor);expect(saved.state).toBe('saved');if(saved.state!=='saved')throw Error('save');
  expect(saved.receipt.roleGeneration).toBe('1');expect(saved.receipt.scopeRevision).toBe(1);expect(saved.receipt.scope?.mode).toBe('COMPANY');
  expect((await saveEmployeeCoreAccessProfile(f.owner,{...c,operationId:randomUUID()},f.db.executor))).toEqual({state:'conflict',reason:'employee_changed'});
  expect(await f.q("SELECT first_name FROM employees WHERE id='manager'")).toEqual([{first_name:'Ordinary edit'}]);
 }finally{await f.db.dispose();}
});
it('new Manager creation is one role/scope transaction, requires Owner choice, and creates no credential',async()=>{
 const f=await companyAccessFixture();try{
  const c:CreateEmployeeWithAccessCommand={operationId:randomUUID(),employee:{id:'FRESH-MANAGER',firstName:'Fresh',lastName:'QA',phone:'7875550104',email:'fresh@example.invalid',role:'MANAGER',primaryLocationId:'loc-1',eligibleLocationIds:['loc-1'],positionIds:[]}};
  expect((await createEmployeeWithAccess(f.owner,c,f.db.executor)).state).toBe('invalid');
  expect(await f.q("SELECT id FROM employees WHERE id='FRESH-MANAGER'")).toEqual([]);
  const chosen={...c,initialManagerScope:{mode:'LOCATIONS' as const,locationIds:['loc-1']}};
  const saved=await createEmployeeWithAccess(f.owner,chosen,f.db.executor);expect(saved.state).toBe('saved');if(saved.state!=='saved')throw Error('create');
  expect(saved.receipt.roleGeneration).toBe('1');expect(saved.receipt.scopeRevision).toBe(1);expect(saved.receipt.scope).toEqual({mode:'LOCATIONS',locationIds:['loc-1']});
  expect(await createEmployeeWithAccess(f.owner,chosen,f.db.executor)).toEqual(saved);
  expect(await f.q("SELECT employee_id FROM employee_credentials WHERE employee_id='FRESH-MANAGER'")).toEqual([]);
 }finally{await f.db.dispose();}
});
it('last active Owner is protected and an intentional self-demotion with another Owner commits its selected Manager scope',async()=>{
 const f=await companyAccessFixture();try{
  const last=await command(f,'owner',{role:'EMPLOYEE'});
  expect((await saveEmployeeCoreAccessProfile(f.owner,last,f.db.executor)).state).toBe('invalid');
  expect(await f.q("SELECT role FROM employees WHERE id='owner'")).toEqual([{role:'OWNER'}]);
  await f.q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('other-owner','Other','QA','555009','OWNER','loc-1')");
  const c=await command(f,'owner',{role:'MANAGER'},{mode:'LOCATIONS',locationIds:['loc-1']});
  const saved=await saveEmployeeCoreAccessProfile(f.owner,c,f.db.executor);expect(saved.state).toBe('saved');if(saved.state!=='saved')throw Error('self edit');
  expect(saved.receipt.role).toBe('MANAGER');expect(saved.receipt.roleGeneration).toBe('2');expect(saved.receipt.scope).toEqual({mode:'LOCATIONS',locationIds:['loc-1']});
  expect(await f.q("SELECT role FROM employees WHERE id='owner'")).toEqual([{role:'MANAGER'}]);
 }finally{await f.db.dispose();}
});
it('exact concurrent profile replay reconciles after another copy commits instead of returning a stale-version failure',async()=>{
 const f=await companyAccessFixture();try{
  const c=await command(f,'target',{role:'MANAGER'},{mode:'LOCATIONS',locationIds:['loc-1']});
  const actual=f.db.executor;let entered!:()=>void,resume!:()=>void;
  const paused=new Promise<void>(r=>{entered=r;}),ready=new Promise<void>(r=>{resume=r;});
  const follower={...actual,async transaction(statements:Parameters<typeof actual.transaction>[0]){
   if(statements.some(s=>s.text.trimStart().startsWith('UPDATE employees'))){entered();await ready;}
   return actual.transaction(statements);
  }};
  const pending=saveEmployeeCoreAccessProfile(f.owner,c,follower);await paused;
  const winner=await saveEmployeeCoreAccessProfile(f.owner,c,actual);resume();
  expect(winner.state).toBe('saved');expect(await pending).toEqual(winner);
  expect(await f.q("SELECT generation::text FROM operational_subject_versions WHERE employee_id='target'")).toEqual([{generation:'2'}]);
  expect(await f.q("SELECT count(*)::integer AS count FROM operational_scope_revisions WHERE employee_id='target'")).toEqual([{count:1}]);
 }finally{await f.db.dispose();}
});
it('intentional self-deactivation with another Owner uses the pinned pre-edit authority and removes its session',async()=>{
 const f=await companyAccessFixture();try{
  await f.q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('other-owner','Other','QA','555009','OWNER','loc-1')");
  const c=await command(f,'owner',{active:false});
  const saved=await saveEmployeeCoreAccessProfile(f.owner,c,f.db.executor);expect(saved.state).toBe('saved');if(saved.state!=='saved')throw Error('self deactivation');
  expect(saved.receipt.active).toBe(false);expect(saved.receipt.roleGeneration).toBe('2');
  expect(await f.q("SELECT token_hash FROM employee_sessions WHERE employee_id='owner'")).toEqual([]);
  expect(await f.q("SELECT active FROM employees WHERE id='other-owner'")).toEqual([{active:true}]);
 }finally{await f.db.dispose();}
});
it('lost committed profile response is unknown and current-authorized replay returns the one committed role/scope receipt',async()=>{
 const f=await companyAccessFixture();try{
  const c=await command(f,'target',{role:'MANAGER'},{mode:'COMPANY',locationIds:[]}),actual=f.db.executor;let lose=true;
  const uncertain={...actual,async transaction(statements:Parameters<typeof actual.transaction>[0]){
   const result=await actual.transaction(statements);if(lose&&statements.some(s=>s.text.trimStart().startsWith('UPDATE employees'))){lose=false;throw Error('Owned lost commit response');}return result;
  }};
  expect(await saveEmployeeCoreAccessProfile(f.owner,c,uncertain)).toEqual({state:'outcome_unknown',operationId:c.operationId});
  const replay=await saveEmployeeCoreAccessProfile(f.owner,c,actual);expect(replay.state).toBe('saved');if(replay.state!=='saved')throw Error('replay');expect(replay.receipt.roleGeneration).toBe('2');
  expect(await f.q("SELECT count(*)::integer AS count FROM operational_scope_revisions WHERE employee_id='target'")).toEqual([{count:1}]);
 }finally{await f.db.dispose();}
});
it('Company Manager creation produces an unassigned Manager and cannot smuggle a credential or scope',async()=>{
 const f=await companyAccessFixture();try{
  const c:CreateEmployeeWithAccessCommand={operationId:randomUUID(),employee:{id:'MANAGER-CREATED',firstName:'New',lastName:'QA',phone:'7875550105',email:null,role:'MANAGER',primaryLocationId:'loc-1',eligibleLocationIds:[],positionIds:[]}};
  expect((await createEmployeeWithAccess(f.manager,{...c,initialManagerScope:{mode:'COMPANY',locationIds:[]}},f.db.executor)).state).toBe('invalid');
  const saved=await createEmployeeWithAccess(f.manager,c,f.db.executor);expect(saved.state).toBe('saved');if(saved.state!=='saved')throw Error('create');expect(saved.receipt.scope).toBeNull();expect(saved.receipt.scopeState).toBe('UNASSIGNED');
  const injected={...c,operationId:randomUUID(),employee:{...c.employee,id:'CREDENTIAL-INJECTION',passwordHash:'never accepted'}};
  expect((await createEmployeeWithAccess(f.owner,injected,f.db.executor)).state).toBe('invalid');
  expect(await f.q("SELECT id FROM employees WHERE id='CREDENTIAL-INJECTION'")).toEqual([]);
 }finally{await f.db.dispose();}
});
it('expiry after role and scope writes rolls back the entire captured-authority transaction',async()=>{
 const {Client}=await import('pg');
 const f=await companyAccessFixture(),barrier=new Client({connectionString:f.db.connectionString,statement_timeout:5000});
 try{
  const c=await command(f,'target',{role:'MANAGER'},{mode:'LOCATIONS',locationIds:['loc-1']});
  const before=await f.q("SELECT to_jsonb(e) AS value FROM employees e WHERE id='target'");
  await barrier.connect();await barrier.query('SELECT pg_advisory_lock(321030)');
  await f.q(`CREATE FUNCTION test_owned_atomic_profile_wait() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.kind='EMPLOYEE' THEN PERFORM pg_advisory_xact_lock(321030);END IF;RETURN NEW;END $$;
   CREATE TRIGGER test_owned_atomic_profile_wait BEFORE INSERT ON company_access_operations FOR EACH ROW EXECUTE FUNCTION test_owned_atomic_profile_wait()`);
  await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '2500 milliseconds' WHERE employee_id='owner'");
  const pending=saveEmployeeCoreAccessProfile(f.owner,c,f.db.executor);
  const until=Date.now()+3500;let waiting=false;
  while(!waiting&&Date.now()<until){
   const [row]=await f.q<{waiting:boolean}>("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%INSERT INTO company_access_operations%') AS waiting");waiting=row.waiting;
   if(!waiting)await new Promise(resolve=>setTimeout(resolve,10));
  }
  expect(waiting).toBe(true);
  let expired=false;const expiryDeadline=Date.now()+3500;
  while(!expired&&Date.now()<expiryDeadline){const [row]=await f.q<{expired:boolean}>("SELECT expires_at<=clock_timestamp() AS expired FROM employee_sessions WHERE employee_id='owner'");expired=row.expired;if(!expired)await new Promise(resolve=>setTimeout(resolve,15));}
  expect(expired).toBe(true);await barrier.query('SELECT pg_advisory_unlock(321030)');
  expect((await pending).state).toBe('unavailable');
  expect(await f.q("SELECT to_jsonb(e) AS value FROM employees e WHERE id='target'")).toEqual(before);
  expect(await f.q("SELECT generation::text FROM operational_subject_versions WHERE employee_id='target'")).toEqual([{generation:'1'}]);
  expect(await f.q("SELECT count(*)::integer AS count FROM operational_scope_revisions WHERE employee_id='target'")).toEqual([{count:0}]);
  expect(await f.q('SELECT count(*)::integer AS count FROM company_access_operations WHERE operation_id=$1',[c.operationId])).toEqual([{count:0}]);
 }finally{await barrier.query('SELECT pg_advisory_unlock_all()').catch(()=>{});await barrier.end().catch(()=>{});await f.db.dispose();}
});

it('Owner reactivation requires a new conscious scope and binds it to the new generation; a Company Manager cannot create an Owner',async()=>{
 const f=await companyAccessFixture();try{
  await f.q("UPDATE employees SET active=false,updated_at=clock_timestamp() WHERE id='manager'");
  const absent=await command(f,'manager',{active:true});
  expect((await saveEmployeeCoreAccessProfile(f.owner,absent,f.db.executor)).state).toBe('invalid');
  expect(await f.q("SELECT active FROM employees WHERE id='manager'")).toEqual([{active:false}]);
  const chosen=await command(f,'manager',{active:true},{mode:'LOCATIONS',locationIds:['loc-1']});
  const saved=await saveEmployeeCoreAccessProfile(f.owner,chosen,f.db.executor);
  expect(saved.state).toBe('saved');if(saved.state!=='saved')throw Error('reactivate');
  expect(saved.receipt.roleGeneration).toBe('3');expect(saved.receipt.scopeRevision).toBe(2);expect(saved.receipt.scope).toEqual({mode:'LOCATIONS',locationIds:['loc-1']});
  const create:CreateEmployeeWithAccessCommand={operationId:randomUUID(),employee:{id:'FORGED-OWNER',firstName:'Fictional',lastName:'QA',phone:'7875550106',email:null,role:'OWNER',primaryLocationId:'loc-1',eligibleLocationIds:[],positionIds:[]}};
  // The reactivated Manager is restricted; restore Company deliberately before exercising the independent role ceiling.
  const {assignOperationalScope}=await import('../../lib/company-access/operational-scope.server');
  const c=await readOwnerOperationalScope(f.owner,'manager',f.db.executor);if(c.state!=='ready')throw Error('scope');
  expect((await assignOperationalScope(f.owner,'manager',{action:'ASSIGN',operationId:randomUUID(),expectedEmployeeVersion:c.data.current.employeeUpdatedAt,expectedRoleGeneration:c.data.current.roleGeneration,expectedScopeRevision:c.data.current.scopeRevision,scope:{mode:'COMPANY',locationIds:[]}},f.db.executor)).state).toBe('saved');
  expect((await createEmployeeWithAccess(f.manager,create,f.db.executor)).state).toBe('unavailable');expect(await f.q("SELECT id FROM employees WHERE id='FORGED-OWNER'")).toEqual([]);
 }finally{await f.db.dispose();}
});
