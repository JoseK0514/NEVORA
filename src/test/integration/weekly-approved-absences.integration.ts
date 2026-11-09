import { beforeEach, afterEach, expect, it, vi } from 'vitest';
vi.mock('server-only',()=>({}));
import { createDisposableFoundationDatabase } from './local-postgres';
import { readWeeklyApprovedAbsences } from '../../lib/data/weekly-approved-absences.server';
import type { SessionMutationProof } from '../../lib/shift-changes/types';
let db: Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
const proof = (role: 'OWNER'|'MANAGER' = 'OWNER'): SessionMutationProof => ({employee:{id:role.toLowerCase(),role,firstName:'Fictional',lastName:role,primaryLocationId:'loc-1'},sessionTokenHash:(role==='OWNER'?'a':'b').repeat(64)});
const q=(text:string,values:readonly unknown[]=[])=>db.executor.query({text,values});
beforeEach(async()=>{
 db=await createDisposableFoundationDatabase({mode:'current-runtime'});
 await q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES
 ('owner','Fictional','Owner','NONE','OWNER','loc-1'),('manager','Fictional','Manager','NONE','MANAGER','loc-1'),('west','Fictional','West','NONE','EMPLOYEE','loc-2');
 INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('a',64),'owner',clock_timestamp()+interval '1 day'),(repeat('b',64),'manager',clock_timestamp()+interval '1 day');
 INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status,reason,start_time,end_time) VALUES
 ('left','manager','2030-10-06','2030-10-07','APPROVED','PRIVATE',NULL,NULL),
 ('right','west','2030-10-13','2030-10-14','APPROVED','PRIVATE','09:00','12:00'),
 ('outside','manager','2030-10-14','2030-10-14','APPROVED','PRIVATE',NULL,NULL),
 ('before','manager','2030-10-06','2030-10-06','APPROVED','PRIVATE',NULL,NULL),
 ('pending','manager','2030-10-08','2030-10-08','PENDING','PRIVATE',NULL,NULL);`);
});
afterEach(async()=>{await db?.dispose();});
it('includes both inclusive week edges and partial bounds but excludes pending/outside requests and private reasons',async()=>{
 expect(await readWeeklyApprovedAbsences(proof(),'2030-10-07',db.executor)).toEqual({state:'ready',employeeIds:['manager','owner','west'],rows:[{employeeId:'manager',startDate:'2030-10-06',endDate:'2030-10-07'},{employeeId:'west',startDate:'2030-10-13',endDate:'2030-10-14',startTime:'09:00',endTime:'12:00'}]});
});
it('enforces installed Manager location grants while Owner retains workspace scope',async()=>{
 await q(`CREATE SCHEMA nevora_tenancy;
 CREATE TABLE nevora_tenancy.portal_administrative_authority(workspace_id text,employee_id text,scope_kind text);
 CREATE TABLE nevora_tenancy.portal_administrative_location(workspace_id text,employee_id text,location_id text);
 INSERT INTO nevora_tenancy.portal_administrative_authority SELECT id,'manager','LOCATIONS' FROM workspaces;
 INSERT INTO nevora_tenancy.portal_administrative_location SELECT id,'manager','loc-2' FROM workspaces;`);
 expect(await readWeeklyApprovedAbsences(proof('MANAGER'),'2030-10-07',db.executor)).toEqual({state:'ready',employeeIds:['west'],rows:[{employeeId:'west',startDate:'2030-10-13',endDate:'2030-10-14',startTime:'09:00',endTime:'12:00'}]});
 const owner=await readWeeklyApprovedAbsences(proof(),'2030-10-07',db.executor);expect(owner.state==='ready'&&owner.rows.length).toBe(2);
 await q('DELETE FROM nevora_tenancy.portal_administrative_authority');
 expect(await readWeeklyApprovedAbsences(proof('MANAGER'),'2030-10-07',db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
});
it('denies revoked, expired and demoted sessions even with an earlier Manager proof',async()=>{
 await q("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE employee_id='manager'");
 expect(await readWeeklyApprovedAbsences(proof('MANAGER'),'2030-10-07',db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
 await q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '1 day'; UPDATE employees SET role='EMPLOYEE' WHERE id='manager'");
 expect(await readWeeklyApprovedAbsences(proof('MANAGER'),'2030-10-07',db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
 await q("UPDATE employees SET role='MANAGER' WHERE id='manager'; DELETE FROM employee_sessions WHERE employee_id='manager'");
 expect(await readWeeklyApprovedAbsences(proof('MANAGER'),'2030-10-07',db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
});
it('denies foreign workspace grants, excludes inactive employees and fails honestly on read errors',async()=>{
 await q(`CREATE SCHEMA nevora_tenancy;
 CREATE TABLE nevora_tenancy.portal_administrative_authority(workspace_id text,employee_id text,scope_kind text);
 CREATE TABLE nevora_tenancy.portal_administrative_location(workspace_id text,employee_id text,location_id text);
 INSERT INTO nevora_tenancy.portal_administrative_authority VALUES('foreign','manager','ALL_TENANT');`);
 expect(await readWeeklyApprovedAbsences(proof('MANAGER'),'2030-10-07',db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
 await q("UPDATE employees SET active=false WHERE id IN ('manager','west')");
 expect(await readWeeklyApprovedAbsences(proof(),'2030-10-07',db.executor)).toEqual({state:'ready',employeeIds:['owner'],rows:[]});
 await q('ALTER TABLE time_off_requests RENAME TO missing_requests');
 expect(await readWeeklyApprovedAbsences(proof(),'2030-10-07',db.executor)).toEqual({state:'unavailable',reason:'read_failed'});
});
it('rechecks live session after the read before releasing any private projection',async()=>{
 const executor={query:db.executor.query,transaction:(statements:Parameters<typeof db.executor.transaction>[0],signal?:AbortSignal)=>db.executor.transaction([
 ...statements.slice(0,-2),{text:"UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE employee_id='manager'",values:[]},...statements.slice(-2),
 ],signal)};
 expect(await readWeeklyApprovedAbsences(proof('MANAGER'),'2030-10-07',executor)).toEqual({state:'unavailable',reason:'access_denied'});
});
