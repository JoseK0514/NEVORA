import {readFile} from 'node:fs/promises';
import {describe,it,expect} from 'vitest';
import {createDisposableFoundationDatabase} from './local-postgres';

const migrationPath='db/migrations/0032_company_access_invitations.sql';
async function fixture(){
 const db=await createDisposableFoundationDatabase({mode:'current-runtime'});
 const q=<T=Record<string,unknown>>(text:string,values:unknown[]=[])=>db.executor.query<T>({text,values});
 try{
  await q(await readFile('db/migrations/0031_native_payroll.sql','utf8'));
  await q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id,active) VALUES
   ('owner','Owner','QA','5550001','OWNER','loc-1',true),
   ('legacy-manager','Legacy','QA','5550002','MANAGER','loc-2',true),
   ('inactive-manager','Inactive','QA','5550003','MANAGER','loc-1',false),
   ('ordinary','Ordinary','QA','5550004','EMPLOYEE','loc-1',true);
   UPDATE locations SET active=false WHERE id='loc-2';`);
  return {db,q,apply:async()=>q(await readFile(migrationPath,'utf8'))};
 }catch(e){await db.dispose();throw e;}
}
describe('single-company access custody migration',()=>{
 it('atomically preserves only the evidenced current active Manager census and canonical rows',async()=>{
  const f=await fixture();try{
   const before=await f.q('SELECT to_jsonb(e) AS value FROM employees e ORDER BY id');
   const finance=await f.q('SELECT to_jsonb(p) AS value FROM native_payroll_ledger p');
   await f.apply();
   expect(await f.q('SELECT employee_id,revision,action,mode,location_ids,source,role_generation::text FROM operational_scope_revisions ORDER BY employee_id')).toEqual([
    {employee_id:'legacy-manager',revision:1,action:'ASSIGN',mode:'COMPANY',location_ids:[],source:'LEGACY_ADOPTION',role_generation:'1'}]);
   const [a]=await f.q<{state:string;owner_policy_receipt_id:string;legacy_manager_census:{employeeId:string}[];census_digest:string}>(
    'SELECT state,owner_policy_receipt_id,legacy_manager_census,census_digest FROM company_access_adoption');
   expect(a.state).toBe('ENFORCED');expect(a.owner_policy_receipt_id).toBe('01a13cda-e556-7652-8469-a18a77094364');
   expect(a.legacy_manager_census.map(x=>x.employeeId)).toEqual(['legacy-manager']);expect(a.census_digest).toMatch(/^[a-f0-9]{64}$/);
   expect(await f.q('SELECT to_jsonb(e) AS value FROM employees e ORDER BY id')).toEqual(before);
   expect(await f.q('SELECT to_jsonb(p) AS value FROM native_payroll_ledger p')).toEqual(finance);
   await f.q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('new-manager','New','QA','5550005','MANAGER','loc-1')`);
   expect(await f.q(`SELECT employee_id FROM operational_scope_revisions WHERE employee_id IN('new-manager','inactive-manager')`)).toEqual([]);
  }finally{await f.db.dispose();}
 });
 it('ordinary contact edits preserve generation while every role or active transition invalidates the old grant',async()=>{
  const f=await fixture();try{await f.apply();
   await f.q(`UPDATE employees SET first_name='Edited',email='fictional@example.invalid',updated_at=clock_timestamp() WHERE id='legacy-manager'`);
   expect(await f.q(`SELECT generation::text FROM operational_subject_versions WHERE employee_id='legacy-manager'`)).toEqual([{generation:'1'}]);
   for(const sql of ["role='EMPLOYEE'","role='MANAGER'","active=false","active=true"]){await f.q(`UPDATE employees SET ${sql} WHERE id='legacy-manager'`);}
   expect(await f.q(`SELECT generation::text FROM operational_subject_versions WHERE employee_id='legacy-manager'`)).toEqual([{generation:'5'}]);
   expect(await f.q(`SELECT role_generation::text FROM operational_scope_revisions WHERE employee_id='legacy-manager'`)).toEqual([{role_generation:'1'}]);
   await expect(f.q(`UPDATE operational_subject_versions SET generation=1 WHERE employee_id='legacy-manager'`)).rejects.toThrow();
  }finally{await f.db.dispose();}
 });
 it('rejects empty/duplicate/unknown/inactive scoped locations, forged generations and invalid next revisions',async()=>{
  const f=await fixture();try{await f.apply();
   const insert=`INSERT INTO operational_scope_revisions(workspace_id,employee_id,revision,role_generation,action,mode,location_ids,source,actor_employee_id,operation_id)
    VALUES('workspace-fuel','legacy-manager',2,$1,'ASSIGN','LOCATIONS',$2,'OWNER_ASSIGNMENT','owner','00000000-0000-4000-8000-000000000001')`;
   for(const ids of [[],['loc-1','loc-1'],['missing'],['loc-2']]){await expect(f.q(insert,[1,ids])).rejects.toThrow();}
   await expect(f.q(insert,[2,['loc-1']])).rejects.toThrow();
   await f.q(insert,[1,['loc-1']]);
   expect(await f.q(`SELECT mode,location_ids FROM operational_scope_revisions WHERE revision=2`)).toEqual([{mode:'LOCATIONS',location_ids:['loc-1']}]);
   await expect(f.q('SELECT company_access_next_revision(2147483647)')).rejects.toThrow('company_access_revision_exhausted');
   expect(await f.q('SELECT company_access_next_revision(2147483646) AS revision')).toEqual([{revision:2147483647}]);
  }finally{await f.db.dispose();}
 });
 it('scope/adoption/history are append-only and rerunning adoption cannot widen an Owner restriction',async()=>{
  const f=await fixture();try{await f.apply();
   await f.q(`INSERT INTO operational_scope_revisions(workspace_id,employee_id,revision,role_generation,action,mode,location_ids,source,actor_employee_id,operation_id)
    VALUES('workspace-fuel','legacy-manager',2,1,'REVOKE',NULL,'{}','OWNER_ASSIGNMENT','owner','00000000-0000-4000-8000-000000000002')`);
   for(const table of ['operational_scope_revisions','company_access_adoption']){
    await expect(f.q(`DELETE FROM ${table}`)).rejects.toThrow();await expect(f.q(`TRUNCATE ${table}`)).rejects.toThrow();
   }
   await expect(f.apply()).rejects.toThrow();
   expect(await f.q('SELECT action FROM operational_scope_revisions ORDER BY revision')).toEqual([{action:'ASSIGN'},{action:'REVOKE'}]);
  }finally{await f.db.dispose();}
 });
 it('failure at the final adoption assertion rolls back tables, bindings and marker together',async()=>{
  const f=await fixture();try{
   const migration=await readFile(migrationPath,'utf8');
   // Add an uncensused Manager immediately before the marker; completion must reject and roll back.
   const interrupted=migration.replace('INSERT INTO company_access_adoption',
    `UPDATE employees SET role='MANAGER' WHERE id='ordinary'; INSERT INTO company_access_adoption`);
   await expect(f.q(interrupted)).rejects.toThrow();
   expect(await f.q("SELECT to_regclass('public.operational_scope_revisions') AS scopes,to_regclass('public.company_access_adoption') AS adoption")).toEqual([{scopes:null,adoption:null}]);
   expect(await f.q("SELECT role FROM employees WHERE id='legacy-manager'")).toEqual([{role:'MANAGER'}]);
  }finally{await f.db.dispose();}
 });
 it('rejects an ASSIGN with a null mode rather than treating SQL unknown as a valid selection',async()=>{
  const f=await fixture();try{await f.apply();
   await expect(f.q(`INSERT INTO operational_scope_revisions(workspace_id,employee_id,revision,role_generation,action,mode,location_ids,source,actor_employee_id,operation_id)
    VALUES('workspace-fuel','legacy-manager',2,1,'ASSIGN',NULL,'{}','OWNER_ASSIGNMENT','owner','00000000-0000-4000-8000-000000000009')`)).rejects.toThrow();
  }finally{await f.db.dispose();}
 });
 it('one live invitation and existing-custody counters prevent arbitrary proof rows and terminal resurrection',async()=>{
  const f=await fixture();try{await f.apply();
   const insert=`INSERT INTO company_invitations(workspace_id,id,employee_id,revision,target_version,email_fingerprint,issuer_employee_id,issuer_generation,proof_digest,issued_at,expires_at)
    SELECT 'workspace-fuel',$1,'ordinary',$2,updated_at::text,repeat('e',64),'owner',1,$3,clock_timestamp(),clock_timestamp()+interval '14 minutes' FROM employees WHERE id='ordinary'`;
   const first='00000000-0000-4000-8000-000000000011',second='00000000-0000-4000-8000-000000000012';
   await f.q(insert,[first,1,'a'.repeat(64)]);
   await expect(f.q(insert,[second,2,'b'.repeat(64)])).rejects.toMatchObject({code:'23505'});
   await expect(f.q(`INSERT INTO company_invitation_claim_counters VALUES('workspace-fuel',$1,date_bin(interval '15 minutes',clock_timestamp(),timestamptz '2000-01-01 00:00:00Z'),1)`,[second])).rejects.toMatchObject({code:'23503'});
   await f.q(`INSERT INTO company_invitation_claim_counters VALUES('workspace-fuel',$1,date_bin(interval '15 minutes',clock_timestamp(),timestamptz '2000-01-01 00:00:00Z'),10)`,[first]);
   await expect(f.q('UPDATE company_invitation_claim_counters SET attempts=11')).rejects.toMatchObject({code:'23514'});
   await f.q(`UPDATE company_invitations SET retired_at=clock_timestamp(),retired_reason='REVOKED' WHERE id=$1`,[first]);
   await expect(f.q('UPDATE company_invitations SET retired_at=NULL,retired_reason=NULL WHERE id=$1',[first])).rejects.toThrow('company_access_invitation_terminal');
   await expect(f.q('UPDATE company_invitations SET proof_digest=NULL WHERE id=$1',[first])).rejects.toThrow('company_access_invitation_digest_custody');
   await f.q(insert,[second,2,'b'.repeat(64)]);
   expect(await f.q('SELECT count(*)::integer AS count FROM company_invitation_claim_counters')).toEqual([{count:1}]);
   await f.q(`INSERT INTO company_invitation_events(workspace_id,id,invitation_id,action) VALUES('workspace-fuel','00000000-0000-4000-8000-000000000013',$1,'ISSUE')`,[second]);
   await expect(f.q('DELETE FROM company_invitation_events')).rejects.toThrow();
  }finally{await f.db.dispose();}
 });
 it('an empty current-Manager census is valid and does not adopt an inactive Manager on later reactivation',async()=>{
  const f=await fixture();try{
   await f.q("UPDATE employees SET role='EMPLOYEE' WHERE id='legacy-manager'");await f.apply();
   expect(await f.q('SELECT legacy_manager_census FROM company_access_adoption')).toEqual([{legacy_manager_census:[]}]);
   await f.q("UPDATE employees SET active=true WHERE id='inactive-manager'");
   expect(await f.q('SELECT employee_id FROM operational_scope_revisions')).toEqual([]);
  }finally{await f.db.dispose();}
 });

});
