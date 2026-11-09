import {it,expect,vi} from 'vitest';
import {randomUUID,createHash} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
import {saveNativeProfile} from '../../lib/payroll/native/profiles.server';
import {document as readFinancialDocument} from '../../lib/payroll/access';
import {issueOrRevokeInvitation,readInvitationStatus} from '../../lib/auth/invitations/service.server';
import {companyAccessFixture} from './company-access-fixture';
import {getWorkspace,workspaceReadGuard} from '../../lib/data/workspaces';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import type {OperationalFootprint,ScopeCommand} from '../../lib/company-access/model';
vi.mock('server-only',()=>({}));
import {readOperationalAuthority,assignOperationalScope,readOwnerOperationalScope,operationalScopeStatements,withOperationalCompany} from '../../lib/company-access/operational-scope.server';
type Fixture=Awaited<ReturnType<typeof companyAccessFixture>>;
async function selection(f:Fixture,action:'ASSIGN'|'REVOKE',scope?:{mode:'COMPANY';locationIds:[]}|{mode:'LOCATIONS';locationIds:string[]}):Promise<ScopeCommand>{
 const read=await readOwnerOperationalScope(f.owner,'manager',f.db.executor);if(read.state!=='ready')throw Error('context');
 const c=read.data.current;
 const base={action,operationId:randomUUID(),expectedEmployeeVersion:c.employeeUpdatedAt,expectedRoleGeneration:c.roleGeneration,expectedScopeRevision:c.scopeRevision};
 return action==='REVOKE'?{...base,action:'REVOKE'}:{...base,action:'ASSIGN',scope:scope!};
}
async function guard(f:Fixture,proof:SessionMutationProof,footprint:OperationalFootprint){
 const w=await getWorkspace(f.db.executor);
 return f.db.executor.transaction([...workspaceReadGuard(w),{text:'SELECT id FROM employees WHERE id=$1 FOR SHARE',values:[proof.employee.id]},...operationalScopeStatements(proof,w,footprint)]);
}
it('explicit legacy Company survives contact edits; Owner restriction/revocation/restoration requires current versions and never revives old grants',async()=>{
 const f=await companyAccessFixture();try{
  let view=await readOperationalAuthority(f.manager,f.db.executor);if(view.state!=='ready')throw Error('authority');
  expect(view.source).toBe('LEGACY_ADOPTION');expect(view.scope).toEqual({mode:'COMPANY',locationIds:[]});
  expect(JSON.stringify(view).includes(f.manager.sessionTokenHash)).toBe(false);expect(view.validForMs).toBeGreaterThan(0);expect(view.validForMs).toBeLessThanOrEqual(15000);
  await f.q("UPDATE employees SET first_name='Edited',email='edited@example.invalid',updated_at=clock_timestamp() WHERE id='manager'");
  view=await readOperationalAuthority(f.manager,f.db.executor);if(view.state!=='ready')throw Error('authority');expect(view.scope?.mode).toBe('COMPANY');
  const assign=await selection(f,'ASSIGN',{mode:'LOCATIONS',locationIds:['loc-1']});
  if(assign.action!=='ASSIGN')throw Error('Expected assignment fixture');
  const saved=await assignOperationalScope(f.owner,'manager',assign,f.db.executor);expect(saved.state).toBe('saved');
  expect(await assignOperationalScope(f.owner,'manager',assign,f.db.executor)).toEqual(saved);
  expect((await assignOperationalScope(f.owner,'manager',{...assign,scope:{mode:'COMPANY',locationIds:[]}},f.db.executor)).state).toBe('conflict');
  view=await readOperationalAuthority(f.manager,f.db.executor);if(view.state!=='ready')throw Error('authority');expect(view.scope).toEqual({mode:'LOCATIONS',locationIds:['loc-1']});
  await expect(guard(f,f.manager,{kind:'LOCATIONS',locationIds:['loc-1']})).resolves.toBeDefined();
  await expect(guard(f,f.manager,{kind:'LOCATIONS',locationIds:['loc-2']})).rejects.toThrow('operational_authorization');
  await expect(guard(f,f.manager,{kind:'COMPANY'})).rejects.toThrow('operational_authorization');
  expect((await assignOperationalScope(f.owner,'manager',await selection(f,'REVOKE'),f.db.executor)).state).toBe('saved');
  view=await readOperationalAuthority(f.manager,f.db.executor);if(view.state!=='ready')throw Error('authority');expect(view.source).toBe('REVOKED');expect(view.scope).toBeNull();
  await expect(guard(f,f.manager,{kind:'LOCATIONS',locationIds:['loc-1']})).rejects.toThrow('operational_authorization');
  expect((await assignOperationalScope(f.owner,'manager',await selection(f,'ASSIGN',{mode:'COMPANY',locationIds:[]}),f.db.executor)).state).toBe('saved');
  await expect(guard(f,f.manager,{kind:'COMPANY'})).resolves.toBeDefined();
 }finally{await f.db.dispose();}
});
it('new Managers have no grant from role, primary location or eligibility; role/active cycles invalidate explicit historic grants',async()=>{
 const f=await companyAccessFixture();try{
  await f.q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('new-manager','New','QA','555004','MANAGER','loc-1');INSERT INTO employee_location_eligibility VALUES('new-manager','loc-2');INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('c',64),'new-manager',clock_timestamp()+interval '1 hour')");
  const fresh:SessionMutationProof={employee:{...f.manager.employee,id:'new-manager'},sessionTokenHash:'c'.repeat(64)};
  const view=await readOperationalAuthority(fresh,f.db.executor);if(view.state!=='ready')throw Error('authority');expect(view.source).toBe('UNASSIGNED');expect(view.scope).toBeNull();
  await expect(guard(f,fresh,{kind:'COMPANY'})).rejects.toThrow('operational_authorization');
  for(const change of ["role='EMPLOYEE'","role='MANAGER'","active=false","active=true"]){await f.q(`UPDATE employees SET ${change} WHERE id='manager'`);}
  const cycled=await readOperationalAuthority(f.manager,f.db.executor);if(cycled.state!=='ready')throw Error('authority');expect(cycled.source).toBe('LIFECYCLE_CHANGED');expect(cycled.scope).toBeNull();
  await expect(guard(f,f.manager,{kind:'COMPANY'})).rejects.toThrow('operational_authorization');
 }finally{await f.db.dispose();}
});
it('an invalid latest location scope denies instead of falling back to legacy Company and Owner can explicitly correct its actual revision',async()=>{
 const f=await companyAccessFixture();try{
  expect((await assignOperationalScope(f.owner,'manager',await selection(f,'ASSIGN',{mode:'LOCATIONS',locationIds:['loc-1']}),f.db.executor)).state).toBe('saved');
  await f.q("UPDATE locations SET active=false WHERE id='loc-1'");
  expect((await readOperationalAuthority(f.manager,f.db.executor)).state).toBe('unavailable');
  await expect(guard(f,f.manager,{kind:'COMPANY'})).rejects.toThrow('operational_authorization');
  const current=await readOwnerOperationalScope(f.owner,'manager',f.db.executor);if(current.state!=='ready')throw Error('Owner metadata');expect(current.data.current.scopeRevision).toBe(2);expect(current.data.current.scope).toBeNull();
  expect((await assignOperationalScope(f.owner,'manager',await selection(f,'ASSIGN',{mode:'COMPANY',locationIds:[]}),f.db.executor)).state).toBe('saved');
  await expect(guard(f,f.manager,{kind:'COMPANY'})).resolves.toBeDefined();
 }finally{await f.db.dispose();}
});
it('missing schema, expired session, non-Owner assignment and stale scope generation are denied without fallback or appended history',async()=>{
 const f=await companyAccessFixture();try{
  const c=await selection(f,'ASSIGN',{mode:'LOCATIONS',locationIds:['loc-1']});
  expect((await assignOperationalScope(f.manager,'manager',c,f.db.executor)).state).toBe('unavailable');
  expect((await assignOperationalScope(f.owner,'manager',{...c,expectedRoleGeneration:'2'},f.db.executor)).state).toBe('conflict');
  expect(await f.q('SELECT count(*)::integer AS count FROM operational_scope_revisions')).toEqual([{count:1}]);
  await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE employee_id='manager'");
  expect((await readOperationalAuthority(f.manager,f.db.executor)).state).toBe('unavailable');
  await f.q('DROP VIEW operational_scopes_current');
  expect((await readOperationalAuthority(f.owner,f.db.executor)).state).toBe('unavailable');
 }finally{await f.db.dispose();}
});

it('CA-09 scope-only restriction/revocation preserves the exact employee version and independent financial B document access',async()=>{
 const f=await companyAccessFixture(),previous=process.env.NEVORA_PAYROLL_ENABLED;process.env.NEVORA_PAYROLL_ENABLED='true';
 try{
  await saveNativeProfile(f.owner,{action:'SET_MANAGER_SCOPE',operationId:randomUUID(),expectedRevision:0,employeeId:'manager',review:true,approve:false,locationIds:['loc-2'],reason:'Owned independent financial access fixture'},f.db.executor);
  const before=await f.q("SELECT updated_at::text AS version FROM employees WHERE id='manager'");
  const grant=await f.q("SELECT to_jsonb(g) AS value FROM native_payroll_manager_scope_revisions g WHERE employee_id='manager'");
  const pdf=await PDFDocument.create();pdf.addPage().drawText('Fictional access fixture');const bytes=Buffer.from(await pdf.save()),runId=randomUUID(),documentId=randomUUID();
  await f.q("INSERT INTO payroll_runs(workspace_id,id,start_date,end_date) VALUES('workspace-fuel',$1,'2026-10-01','2026-10-07')",[runId]);
  await f.q("INSERT INTO payroll_documents(workspace_id,id,run_id,employee_id,kind,filename,sha256,content,payload) VALUES('workspace-fuel',$1,$2,'target','EMPLOYEE_STATEMENT','fictional-access.pdf',$3,$4,$5::jsonb)",
   [documentId,runId,createHash('sha256').update(bytes).digest('hex'),bytes,JSON.stringify({period:{startDate:'2026-10-01',endDate:'2026-10-07'},payday:'2026-10-09',coverage:{complete:true,locationIds:['loc-2']}})]);
  expect((await readFinancialDocument(f.manager,documentId,f.db.executor)).bytes.equals(bytes)).toBe(true);
  expect((await assignOperationalScope(f.owner,'manager',await selection(f,'ASSIGN',{mode:'LOCATIONS',locationIds:['loc-1']}),f.db.executor)).state).toBe('saved');
  expect(await f.q("SELECT updated_at::text AS version FROM employees WHERE id='manager'")).toEqual(before);
  expect(await f.q("SELECT to_jsonb(g) AS value FROM native_payroll_manager_scope_revisions g WHERE employee_id='manager'")).toEqual(grant);
  await expect(guard(f,f.manager,{kind:'LOCATIONS',locationIds:['loc-2']})).rejects.toThrow('operational_authorization');
  expect((await readFinancialDocument(f.manager,documentId,f.db.executor)).bytes.equals(bytes)).toBe(true);
  expect((await assignOperationalScope(f.owner,'manager',await selection(f,'REVOKE'),f.db.executor)).state).toBe('saved');
  expect((await readFinancialDocument(f.manager,documentId,f.db.executor)).bytes.equals(bytes)).toBe(true);
  await f.q("UPDATE employees SET email='new-contact@example.invalid',updated_at=clock_timestamp() WHERE id='manager'");
  await expect(readFinancialDocument(f.manager,documentId,f.db.executor)).rejects.toThrow();
 }finally{if(previous===undefined)delete process.env.NEVORA_PAYROLL_ENABLED;else process.env.NEVORA_PAYROLL_ENABLED=previous;await f.db.dispose();}
});

it('an operation UUID already owned by an invitation is a changed replay, with no recursive scope attempts',async()=>{
 const f=await companyAccessFixture();try{
  const status=await readInvitationStatus(f.owner,'target',f.db.executor);if(status.state!=='ready')throw Error('status');
  const id=randomUUID();expect((await issueOrRevokeInvitation(f.owner,'target',{action:'ISSUE',operationId:id,expectedEmployeeVersion:status.employeeVersion,expectedInvitationRevision:0},{async send(){return {providerAccepted:true};}},f.db.executor)).state).toBe('saved');
  const c={...await selection(f,'ASSIGN',{mode:'LOCATIONS',locationIds:['loc-1']}),operationId:id};
  const actual=f.db.executor;let calls=0;
  const bounded={...actual,async transaction(statements:Parameters<typeof actual.transaction>[0]){
   if(++calls>4)throw Error('Test budget stops an unbounded replay loop');return actual.transaction(statements);
  }};
  expect(await assignOperationalScope(f.owner,'manager',c,bounded)).toEqual({state:'conflict',reason:'changed_replay'});
  expect(await f.q('SELECT count(*)::integer AS count FROM operational_scope_revisions')).toEqual([{count:1}]);
 }finally{await f.db.dispose();}
});

it('company read wrapper denies restricted initial loads and suppresses a result after mid-read scope revocation',async()=>{
 const f=await companyAccessFixture();let loads=0;
 try{
  const result=await withOperationalCompany(f.manager,async()=>{
   loads++;expect((await assignOperationalScope(f.owner,'manager',await selection(f,'ASSIGN',{mode:'LOCATIONS',locationIds:['loc-1']}),f.db.executor)).state).toBe('saved');
   return {privateLocationB:'fictional protected result'};
  },f.db.executor);
  expect(result).toEqual({state:'unavailable',reason:'access_denied'});expect(loads).toBe(1);
  const denied=await withOperationalCompany(f.manager,async()=>{loads++;return {privateLocationB:'must never load'};},f.db.executor);
  expect(denied).toEqual({state:'unavailable',reason:'access_denied'});expect(loads).toBe(1);
 }finally{await f.db.dispose();}
});
