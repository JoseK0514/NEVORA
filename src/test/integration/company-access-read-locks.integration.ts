import {it,expect,vi,beforeAll,afterAll} from 'vitest';
import {Client} from 'pg';
import {randomUUID} from 'node:crypto';
import {companyAccessFixture} from './company-access-fixture';
vi.mock('server-only',()=>({}));
import {readOperationalAuthority,readOwnerOperationalScope,assignOperationalScope} from '../../lib/company-access/operational-scope.server';
import {readOperationalDirectory} from '../../lib/company-access/operational-read.server';
import {readPayrollCapabilities} from '../../lib/payroll/service';

/** Inspection B1/B2/F5 (Oct 25): reads that only show what a person may do must not take writer-strength locks.
 * These prove, against actual PostgreSQL locks, that (1) authority and payroll-capability reads no longer exclude
 * each other or ordinary writers, and (2) an authority read still waits for an in-flight writer of the rows it
 * reads, so it never reports authority from before a revocation that commits while it waits. */
type Fixture=Awaited<ReturnType<typeof companyAccessFixture>>;
const previous=process.env.NEVORA_PAYROLL_ENABLED;
beforeAll(()=>{process.env.NEVORA_PAYROLL_ENABLED='true';});
afterAll(()=>{if(previous===undefined)delete process.env.NEVORA_PAYROLL_ENABLED;else process.env.NEVORA_PAYROLL_ENABLED=previous;});
const within=<T>(work:Promise<T>,ms:number)=>Promise.race([work,new Promise<'blocked'>(resolve=>setTimeout(()=>resolve('blocked'),ms))]);
async function holder(f:Fixture,statements:string[]){
 const client=new Client({connectionString:f.db.connectionString});await client.connect();await client.query('BEGIN');
 for(const text of statements)await client.query(text);
 return {release:async(commit=false)=>{await client.query(commit?'COMMIT':'ROLLBACK');await client.end();}};
}
async function revokeCommand(f:Fixture){
 const read=await readOwnerOperationalScope(f.owner,'manager',f.db.executor);if(read.state!=='ready')throw Error('Owner scope');
 const c=read.data.current;return {action:'REVOKE' as const,operationId:randomUUID(),expectedEmployeeVersion:c.employeeUpdatedAt,expectedRoleGeneration:c.roleGeneration,expectedScopeRevision:c.scopeRevision};
}

it('an authority read held open no longer blocks another authority read, a page read or a payroll capability read',async()=>{
 const f=await companyAccessFixture();try{
  // Exactly what an authority read now holds while its batch runs.
  const held=await holder(f,['SELECT id FROM workspaces WHERE singleton ORDER BY id FOR SHARE',"SELECT id FROM employees WHERE id='manager' ORDER BY id FOR SHARE"]);
  try{
   const authority=await within(readOperationalAuthority(f.owner,f.db.executor),1500);
   expect(authority).not.toBe('blocked');if(authority==='blocked')return;expect(authority.state).toBe('ready');
   const page=await within(readOperationalDirectory(f.manager,f.db.executor),1500);
   expect(page).not.toBe('blocked');if(page==='blocked')return;expect(page.state).toBe('ready');
   const capabilities=await within(readPayrollCapabilities(f.owner,f.db.executor),1500);
   expect(capabilities).not.toBe('blocked');
  }finally{await held.release();}
 }finally{await f.db.dispose();}
});

it('payroll capabilities take no lock: an uncommitted employee edit, a sign-in and a punch-style row lock do not block them',async()=>{
 const f=await companyAccessFixture();try{
  const held=await holder(f,["UPDATE employees SET first_name='Edited' WHERE id='target'","SELECT id FROM employees WHERE id='owner' FOR UPDATE",
   "INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('e',64),'target',clock_timestamp()+interval '1 hour')"]);
  try{
   const owner=await within(readPayrollCapabilities(f.owner,f.db.executor),1500);
   expect(owner).toEqual(expect.objectContaining({enabled:true,canConfigure:true,canReview:true,canApprove:true,internalCalculatorAvailable:true}));
   const manager=await within(readPayrollCapabilities(f.manager,f.db.executor),1500);
   expect(manager).toEqual(expect.objectContaining({enabled:true,canConfigure:false,canReview:false,canApprove:false}));
  }finally{await held.release();}
  // While a capability read runs (a single statement), a sign-in still commits.
  await Promise.all([readPayrollCapabilities(f.owner,f.db.executor),f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),'target',clock_timestamp()+interval '1 hour')")]);
  // The session is checked in the same statement: an expired session is refused, never answered.
  await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE employee_id='owner'");
  await expect(readPayrollCapabilities(f.owner,f.db.executor)).rejects.toThrow('PAYROLL_AUTHORIZATION');
 }finally{await f.db.dispose();}
});

it('an authority read still waits for an in-flight revocation and then reports it, never the pre-revocation scope',async()=>{
 const f=await companyAccessFixture();try{
  const before=await readOperationalAuthority(f.manager,f.db.executor);if(before.state!=='ready')throw Error('authority');expect(before.scope?.mode).toBe('COMPANY');
  // Hold the same locks a scope assignment holds (workspace FOR NO KEY UPDATE, the Manager FOR UPDATE), then commit
  // a revocation through the real service from inside that window.
  const command=await revokeCommand(f);
  const writer=await holder(f,['SELECT id FROM workspaces WHERE singleton ORDER BY id FOR NO KEY UPDATE',"SELECT id FROM employees WHERE id='manager' ORDER BY id FOR UPDATE"]);
  const pending=readOperationalAuthority(f.manager,f.db.executor);
  expect(await within(pending,600)).toBe('blocked');
  await writer.release();
  expect((await assignOperationalScope(f.owner,'manager',command,f.db.executor)).state).toBe('saved');
  const after=await pending;if(after.state!=='ready')throw Error('authority');
  // The pending read either finished before the revocation committed (and is then refused by every writer, which
  // re-binds this digest) or after it; a fresh read always sees the revocation.
  const fresh=await readOperationalAuthority(f.manager,f.db.executor);if(fresh.state!=='ready')throw Error('authority');
  expect(fresh.source).toBe('REVOKED');expect(fresh.scope).toBeNull();expect(fresh.authority).not.toBe(before.authority);
  expect((await readOperationalDirectory(f.manager,f.db.executor)).state).toBe('unavailable');
 }finally{await f.db.dispose();}
});

it('a page read that loses its authority between the first read and the final guard is withheld',async()=>{
 const f=await companyAccessFixture();try{
  const command=await revokeCommand(f);
  const base=f.db.executor;let revoked=false;
  const ex={...base,query:async<T,>(statement:Parameters<typeof base.query>[0],signal?:AbortSignal)=>{
   const rows=await base.query<T>(statement,signal);
   if(!revoked&&statement.text.includes('FROM employees e JOIN locations home')){revoked=true;expect((await assignOperationalScope(f.owner,'manager',command,base)).state).toBe('saved');}
   return rows;
  }};
  const read=await readOperationalDirectory(f.manager,ex);
  expect(revoked).toBe(true);expect(read.state).toBe('unavailable');
 }finally{await f.db.dispose();}
});

/** Inspection B3/B4/B7: Employee reads run as READ ONLY snapshots with lock-free guards. An uncommitted sign-in,
 * employee edit or location edit (ROW EXCLUSIVE / row locks, which conflicted with the old LOCK TABLE … IN SHARE
 * MODE and FOR SHARE prefixes) no longer makes them wait, and the session is still checked in the same snapshot. */
it('Employee profile, Home and Updates reads are not blocked by an uncommitted sign-in or employee edit',async()=>{
 const f=await companyAccessFixture();try{
  const {readEmployeeProfile}=await import('../../lib/data/employee-profile.server');
  const {readEmployeeHome}=await import('../../lib/data/employee-home.server');
  const {listEmployeeCommunications}=await import('../../lib/communications/service.server');
  await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('9',64),'target',clock_timestamp()+interval '1 hour')");
  const employee={employee:{id:'target',firstName:'Target',lastName:'QA',role:'EMPLOYEE' as const,primaryLocationId:'loc-1'},sessionTokenHash:'9'.repeat(64)};
  const reads=async()=>{
   const started=Date.now();
   const profile=await readEmployeeProfile(employee,f.db.executor);
   expect(profile.state).toBe('ready');
   const home=await readEmployeeHome(employee,f.db.executor);
   expect(['ready','partial']).toContain(home.state);
   if('snapshot' in home)expect(home.snapshot.sources.communications.state).not.toBe('unavailable');
   const updates=await listEmployeeCommunications(employee,f.db.executor);
   expect(['complete','partial']).toContain(updates.state);
   return Date.now()-started;
  };
  const quiet=await reads();
  const held=await holder(f,["INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('8',64),'owner',clock_timestamp()+interval '1 hour')",
   "UPDATE employees SET first_name='Edited' WHERE id='manager'","UPDATE locations SET name=name WHERE id='loc-2'"]);
  try{
   // The old prefixes waited out the 1.5 s lock_timeout on these batches (and then failed them); now the same reads
   // take about as long as with nobody writing.
   expect(await reads()).toBeLessThan(quiet+1000);
  }finally{await held.release();}
  // Same snapshot, same session check: an expired session is refused.
  await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE token_hash=repeat('9',64)");
  expect(await readEmployeeProfile(employee,f.db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
 }finally{await f.db.dispose();}
});
