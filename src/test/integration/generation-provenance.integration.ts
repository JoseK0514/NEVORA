import { updateShift, deleteShift, insertShift, saveEmployeeSchedulingProfile } from './management-api';
import { beforeAll, afterAll, beforeEach, expect, it } from 'vitest';
import { createDisposableGenerationDatabase } from './local-postgres';
import { instrumentGeneration } from './generation-instrumentation';
import { installFixtureCompanyAccess } from './fixture-company-access';
import { fixtureProof } from './shift-change-api';
let database: Awaited<ReturnType<typeof createDisposableGenerationDatabase>>;
beforeAll(async()=>{database=await createDisposableGenerationDatabase();});
afterAll(async()=>{await database?.dispose();});
const q=(text:string,values:readonly unknown[]=[])=>(database.executor.query<Record<string,unknown>>({text,values}));
beforeEach(async()=>{
 await database.dispose(); database=await createDisposableGenerationDatabase();
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES ('manager','Fictional','Manager','NONE','MANAGER','loc-1'),('employee','Fictional','Employee','NONE','EMPLOYEE','loc-1')");
 await q("INSERT INTO schedules(id,location_id,week_start,created_by) VALUES ('draft','loc-1','2030-10-07','manager')");
 await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES ('legacy','draft','employee','2030-10-07','08:00','12:00')");
});
it('existing legacy rows default to MANAGER with no generated claims',async()=>{
 expect(await q("SELECT assignment_origin,generated_claims FROM shifts WHERE id='legacy'")).toEqual([{assignment_origin:'MANAGER',generated_claims:null}]);
});

import { generationNeedKey } from '../../lib/scheduling/generation-claims';
import { listWeekShifts } from '../../lib/data/schedules';
import { readFile } from 'node:fs/promises';
import type { SqlExecutor } from '../../lib/notifications/types';
const scope={workspaceId:'workspace-fuel',timeZone:'America/Puerto_Rico',weekStart:'2030-10-07',locationId:'loc-1'};
const input={workspaceId:scope.workspaceId,weekStart:scope.weekStart,locationId:scope.locationId,actorEmployeeId:'manager',shiftId:'legacy'};
const need={kind:'LEAD' as const,needStart:'2030-10-07T08:00',needEnd:'2030-10-07T12:00',configuredCapacity:1};
const claims={version:1,claims:[{...need,needKey:generationNeedKey(scope,need),coveredStart:need.needStart,coveredEnd:need.needEnd,quantity:1}]};
async function generated(){await q("UPDATE shifts SET assignment_origin='GENERATED',generated_claims=$1::jsonb,is_designated_lead=true WHERE id='legacy'",[JSON.stringify(claims)]);}
async function api(){
 await installFixtureCompanyAccess(database.executor);
 const implementation=await import('./management-api');
 expect(implementation).toHaveProperty('deleteGeneratedDraftShift');
 return {...implementation,
  deleteGeneratedDraftShift:(value:Parameters<typeof implementation.deleteGeneratedDraftShift>[0],executor=database.executor)=>implementation.deleteGeneratedDraftShift(value,instrumentGeneration(executor,database.executor)),
  clearGenerationExclusion:(value:Parameters<typeof implementation.clearGenerationExclusion>[0],executor=database.executor)=>implementation.clearGenerationExclusion(value,instrumentGeneration(executor,database.executor)),
 };
}
const count=async(table:string)=>Number((await q(`SELECT count(*) AS n FROM ${table}`))[0].n);
it('rejects invalid stored origins, missing claims and malformed claim envelopes',async()=>{
 for(const text of ["UPDATE shifts SET assignment_origin='AUTO'", "UPDATE shifts SET assignment_origin='GENERATED'", "UPDATE shifts SET generated_claims='{}'", "UPDATE shifts SET assignment_origin='GENERATED',generated_claims='{\"version\":1,\"claims\":[]}'"])
   await expect(q(text)).rejects.toMatchObject({code:'23514'});
});
it('generated DRAFT deletion reserves original semantic claims once, bypasses publication, then clears idempotently',async()=>{
 await generated(); const a=await api();
 const result=await a.deleteGeneratedDraftShift(input,database.executor);
 expect(result.status).toBe('deleted'); expect(result.exclusionId).toBeTruthy();
 expect(await count('shifts')).toBe(0);
 const events=await q('SELECT * FROM schedule_generation_exclusions');
 expect(events).toHaveLength(1); expect(events[0].claims).toEqual(claims); expect(events[0].deleted_source_shift_id).toBe('legacy');
 expect((await a.deleteGeneratedDraftShift(input,database.executor)).status).toBe('absent');
 expect(await count('schedule_generation_exclusions')).toBe(1);
 expect(await a.clearGenerationExclusion({...input,exclusionId:result.exclusionId!},database.executor)).toEqual({status:'cleared'});
 const cleared=await q('SELECT * FROM schedule_generation_exclusions');
 expect(cleared[0].cleared_by).toBe('manager');
 expect(await a.clearGenerationExclusion({...input,exclusionId:result.exclusionId!},database.executor)).toEqual({status:'already-cleared'});
 expect(await q('SELECT * FROM schedule_generation_exclusions')).toEqual(cleared);
 expect(await count('notifications')).toBe(0); expect(await count('schedule_publication_revisions')).toBe(0);
});
it('late batch failure rolls back both the exclusion and deleted shift',async()=>{
 await generated(); const a=await api();
 const failing:SqlExecutor={query:database.executor.query,transaction:statements=>database.executor.transaction([...statements,{text:"SELECT 'late_failure'::integer",values:[]}])};
 await expect(a.deleteGeneratedDraftShift(input,failing)).rejects.toThrow('late_failure');
 expect(await count('shifts')).toBe(1); expect(await count('schedule_generation_exclusions')).toBe(0);
});
it.each(['callout','exchange','publication'])('a generated shift with %s history is protected from semantic deletion',async(kind)=>{
 await generated(); const a=await api();
 if(kind==='callout') await q("INSERT INTO shift_callouts(id,shift_id,employee_id,reason_code,status) VALUES('callout','legacy','employee','OTHER','DENIED')");
 if(kind==='exchange') await q("INSERT INTO shift_exchanges(id,kind,source_shift_id,requested_by_employee_id,status) VALUES('exchange','COVERAGE','legacy','employee','CANCELLED')");
 if(kind==='publication') {
   await q("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES('history','2030-10-07',1,'PUBLISH','manager')");
   await q("INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time) VALUES('history-shift','history','legacy','draft','loc-1','employee','2030-10-07','08:00','12:00')");
 }
 expect((await a.deleteGeneratedDraftShift(input,database.executor)).status).toBe('protected');
 expect(await count('shifts')).toBe(1); expect(await count('schedule_generation_exclusions')).toBe(0);
});
it('manual edit takes Manager control, removes claims and emits no provenance-only publication',async()=>{
 await q("INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) SELECT 'employee-normal-'||d,'employee',d,'00:00','24:00' FROM generate_series(0,6) d");
 await generated();
 await q("INSERT INTO employee_location_eligibility VALUES('employee','loc-1')");
 expect(await updateShift({shiftId:'legacy',employeeId:'employee',date:'2030-10-07',startTime:'08:00',endTime:'12:00',actorEmployeeId:'manager'},database.executor)).toBe(true);
 expect(await q("SELECT assignment_origin,generated_claims FROM shifts WHERE id='legacy'")).toEqual([{assignment_origin:'MANAGER',generated_claims:null}]);
 expect(await count('schedule_publication_revisions')).toBe(0); expect(await count('notifications')).toBe(0);
 expect(await deleteShift('legacy','manager',database.executor)).toBe(true);
 expect(await count('schedule_generation_exclusions')).toBe(0);
});
it('existing delete entry point routes a generated DRAFT through semantic deletion',async()=>{
 await generated(); expect(await deleteShift('legacy','manager',database.executor)).toBe(true);
 expect(await count('schedule_generation_exclusions')).toBe(1);
});
it('requires fresh active manager/workspace, explicit identity, correct scope and DRAFT when clearing',async()=>{
 await generated(); const a=await api(); const result=await a.deleteGeneratedDraftShift(input,database.executor);
 const clear={...input,exclusionId:result.exclusionId!};
 for(const patch of [{actorEmployeeId:'employee'},{workspaceId:'other'},{weekStart:'2030-10-14'},{locationId:'loc-2'},{exclusionId:''}])
   await expect(a.clearGenerationExclusion({...clear,...patch},database.executor)).rejects.toThrow();
 await q("UPDATE employees SET active=false WHERE id='manager'");
 await expect(a.clearGenerationExclusion(clear,database.executor)).rejects.toThrow();
 await q("UPDATE employees SET active=true WHERE id='manager'; UPDATE schedules SET status='PUBLISHED'");
 await expect(a.clearGenerationExclusion(clear,database.executor)).rejects.toThrow();
 expect((await q('SELECT cleared_at FROM schedule_generation_exclusions'))[0].cleared_at).toBe(null);
});
it('recomputes a raced manual edit without deleting the manager assignment or reserving capacity',async()=>{
 await generated(); const a=await api(); let first=true;
 const racing:SqlExecutor={query:database.executor.query,transaction:async statements=>{
   if(first){first=false;await q("UPDATE shifts SET assignment_origin='MANAGER',generated_claims=NULL,notes='Manager keeps this'");}
   return database.executor.transaction(statements);
 }};
 expect((await a.deleteGeneratedDraftShift(input,racing)).status).toBe('protected');
 expect((await q('SELECT notes FROM shifts'))[0].notes).toBe('Manager keeps this');
 expect(await count('schedule_generation_exclusions')).toBe(0);
});
it('preserves every original column in a populated canonical 0001–0008 database through 0009',async()=>{
 const original=process.env.FUEL_TEST_DATABASE_URL!; const url=new URL(original);url.pathname+='_upgrade';
 process.env.FUEL_TEST_DATABASE_URL=url.href;
 let upgrade:Awaited<ReturnType<typeof createDisposableGenerationDatabase>>;
 try{upgrade=await createDisposableGenerationDatabase({mode:'historical-8'});}finally{process.env.FUEL_TEST_DATABASE_URL=original;}
 try{
  const run=(text:string)=>upgrade.executor.query<Record<string,unknown>>({text,values:[]});
  await run("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('old','Fictional','Owner','NONE','OWNER','loc-1'); INSERT INTO schedules(id,location_id,week_start,status,created_by,published_at) VALUES('old-schedule','loc-1','2029-01-01','PUBLISHED','old','2028-12-31T14:00:00.123456Z'); INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,notes) VALUES('old-shift','old-schedule','old','2029-01-01','08:00','12:00','Keep original'); INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES('old-rev','2029-01-01',1,'PUBLISH','old'); INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time) VALUES('old-history','old-rev','old-shift','old-schedule','loc-1','old','2029-01-01','08:00','12:00')");
  await run("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('old-lead','Fictional','Lead','NONE','LEAD','loc-2'); INSERT INTO employee_location_eligibility VALUES('old','loc-1'),('old-lead','loc-2'); INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('old-window','loc-2',1,'08:00','12:00'); INSERT INTO availability_windows VALUES('old-normal','old-lead',1,'08:00','12:00'); INSERT INTO positions(id,workspace_id,name) VALUES('old-position','workspace-fuel','Historic position'); INSERT INTO employee_positions VALUES('old-lead','old-position'); INSERT INTO coverage_window_position_requirements VALUES('old-window','old-position',1); INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status,reason) VALUES('old-leave','old-lead','2029-01-02','2029-01-02','APPROVED','Preserve history'); INSERT INTO shift_callouts(id,shift_id,employee_id,reason_code,status) VALUES('old-callout','old-shift','old','OTHER','DENIED'); INSERT INTO shift_exchanges(id,kind,source_shift_id,requested_by_employee_id,status) VALUES('old-exchange','COVERAGE','old-shift','old','CANCELLED'); INSERT INTO schedule_acknowledgements(week_start,employee_id,publication_revision_id,acknowledged_at) VALUES('2029-01-01','old','old-rev','2029-01-01T00:00:00.123456Z')");
  expect(await run("SELECT l.id,l.name,l.clocker_key,s.minimum_staff_per_shift,s.requires_designated_lead FROM locations l JOIN location_staffing_settings s ON s.location_id=l.id ORDER BY l.id")).toEqual([
    {id:'loc-1',name:'FUEL - 2',clocker_key:'2',minimum_staff_per_shift:2,requires_designated_lead:true},
    {id:'loc-2',name:'FUEL - 110',clocker_key:'110',minimum_staff_per_shift:6,requires_designated_lead:true},
  ]);
  const columns=await run("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position");
  const tables=new Map<string,string[]>();for(const row of columns){const name=String(row.table_name);tables.set(name,[...(tables.get(name)??[]),String(row.column_name)]);}
  const snapshot=async()=>Object.fromEntries(await Promise.all([...tables].map(async([name,columns])=>[name,await run(`SELECT row_to_json(t)::text AS row FROM (SELECT ${columns.map(c=>`"${c}"`).join(',')} FROM "${name}") t ORDER BY row_to_json(t)::text`)])));
  const before=await snapshot();await run(await readFile('db/migrations/0009_schedule_generation.sql','utf8'));expect(await snapshot()).toEqual(before);
  expect(await run('SELECT assignment_origin,generated_claims FROM shifts')).toEqual([{assignment_origin:'MANAGER',generated_claims:null}]);
 }finally{await upgrade.dispose();}
});
it('a neighboring legacy PUBLISHED schedule and its history remain byte-identical during delete and clear',async()=>{
 await generated();const a=await api();
 await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('neighbor','loc-2','2030-10-07','PUBLISHED','manager'); INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('neighbor-shift','neighbor','employee','2030-10-08','08:00','12:00'); INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES('neighbor-revision','2030-10-07',1,'PUBLISH','manager'); INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time) VALUES('neighbor-history','neighbor-revision','neighbor-shift','neighbor','loc-2','employee','2030-10-08','08:00','12:00')");
 const snapshot=()=>q("SELECT jsonb_build_object('schedule',(SELECT to_jsonb(t) FROM schedules t WHERE id='neighbor'),'shift',(SELECT to_jsonb(t) FROM shifts t WHERE id='neighbor-shift'),'revision',(SELECT to_jsonb(t) FROM schedule_publication_revisions t),'history',(SELECT to_jsonb(t) FROM schedule_publication_revision_shifts t)) AS state");
 const before=await snapshot();const result=await a.deleteGeneratedDraftShift(input,database.executor);
 await a.clearGenerationExclusion({...input,exclusionId:result.exclusionId!},database.executor);
 expect(await snapshot()).toEqual(before);expect(await count('notifications')).toBe(0);
});
it('provenance-only promotion of an already published assignment creates no revision or intent',async()=>{
 await generated();
 await q("UPDATE schedules SET status='PUBLISHED'; INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES('existing-revision','2030-10-07',1,'PUBLISH','manager'); INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,is_designated_lead) VALUES('existing-history','existing-revision','legacy','draft','loc-1','employee','2030-10-07','08:00','12:00',true)");
 const before=await q('SELECT to_jsonb(t) AS row FROM schedule_publication_revision_shifts t');
 expect(await updateShift({shiftId:'legacy',employeeId:'employee',date:'2030-10-07',startTime:'08:00',endTime:'12:00',actorEmployeeId:'manager',isDesignatedLead:true},database.executor)).toBe(true);
 expect(await q('SELECT to_jsonb(t) AS row FROM schedule_publication_revision_shifts t')).toEqual(before);
 expect(await count('schedule_publication_revisions')).toBe(1);expect(await count('notifications')).toBe(0);
 expect((await q('SELECT assignment_origin,generated_claims FROM shifts'))[0]).toEqual({assignment_origin:'MANAGER',generated_claims:null});
});
it('manual insert and database copies default to MANAGER and read models retain generated metadata',async()=>{
 await q("INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) SELECT 'employee-normal-'||d,'employee',d,'00:00','24:00' FROM generate_series(0,6) d");
 await generated();await q("INSERT INTO employee_location_eligibility VALUES('employee','loc-1')");
 const id=await insertShift({scheduleId:'draft',employeeId:'employee',date:'2030-10-08',startTime:'08:00',endTime:'12:00',actorEmployeeId:'manager'},database.executor);
 await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) SELECT 'copy',schedule_id,employee_id,date,start_time,end_time FROM shifts WHERE id='legacy'");
 expect(await q('SELECT assignment_origin,generated_claims FROM shifts WHERE id IN ($1,$2)',[id,'copy'])).toEqual([{assignment_origin:'MANAGER',generated_claims:null},{assignment_origin:'MANAGER',generated_claims:null}]);
 const rows=await listWeekShifts({weekStart:input.weekStart},database.executor);
 expect(rows.find(r=>r.id==='legacy')).toMatchObject({assignmentOrigin:'GENERATED',generatedClaims:claims});
});

import { Client } from 'pg';

import { withOwnedTestResources } from './owned-test-resources';
import { readGenerationSource, GenerationConflictError } from '../../lib/data/generation-guards';
import type { SqlStatement } from '../../lib/notifications/types';
async function heldExecutor(defer:(cleanup:()=>void|Promise<unknown>)=>void,hold:(s:SqlStatement)=>boolean) {
 const client=new Client({connectionString:database.connectionString,statement_timeout:5000});await client.connect();defer(()=>client.end());
 const pid=Number((await client.query('SELECT pg_backend_pid() pid')).rows[0].pid);
 let release!:()=>void,reached!:()=>void,paused=false;
 const released=new Promise<void>(resolve=>{release=resolve;});const ready=new Promise<void>(resolve=>{reached=resolve;});
 defer(()=>release());
 const executor:SqlExecutor={query:database.executor.query,transaction:async statements=>{
  await client.query('BEGIN');
  try {const results=[];for(const s of statements){results.push((await client.query(s.text,[...s.values])).rows);if(!paused&&statements.some(item=>item.text.includes('generation_source_conflict')||/^\s*(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\b/.test(item.text))&&hold(s)){paused=true;reached();await released;}}
    await client.query('COMMIT');return results;
  }catch(error){await client.query('ROLLBACK');throw error;}
 }};
 return {executor,pid,ready,release};
}
async function observeBlocked(pid:number) {
 // Bound the wait by time, not attempts: a warm poll takes ~0.2 ms, so a fixed
 // count can expire before the other session even reaches its lock wait.
 // 5 s matches the held sessions' statement_timeout.
 const deadline=performance.now()+5000;
 do {
   const rows=await q('SELECT cardinality(pg_blocking_pids($1))>0 AS blocked',[pid]);
   if(rows[0].blocked) return;
   await new Promise(resolve=>setTimeout(resolve,5));
 } while(performance.now()<deadline);
 throw new Error('Expected actual PostgreSQL lock wait was not observed.');
}
it.each(['profile','absent-membership','coverage-cascade','foreign-week-shift'].flatMap(kind=>['writer-first','generation-first'].map(order=>({kind,order}))))('serializes $kind with $order using actual PostgreSQL locks',async({kind,order})=>{
 await generated();const a=await api();
 await q("INSERT INTO positions(id,workspace_id,name) VALUES('p','workspace-fuel','Fictional position'); INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('w','loc-1',1,'08:00','12:00'); INSERT INTO coverage_window_position_requirements VALUES('w','p',1); INSERT INTO schedules(id,location_id,week_start,created_by) VALUES('foreign-schedule','loc-2','2030-09-30','manager')");
 await withOwnedTestResources(async defer=>{
  const generation=await heldExecutor(defer,s=>order==='generation-first'&&s.text.includes('generation_source_conflict'));
  const writer=await heldExecutor(defer,s=>order==='writer-first'&&(kind==='profile'?s.text.includes('FROM employees')&&s.text.includes('FOR UPDATE'):true));
  const runWriter=()=>kind==='profile'?saveEmployeeSchedulingProfile({employeeId:'employee',actorEmployeeId:'manager',positionIds:['p'],eligibleLocationIds:['loc-1','loc-2']},writer.executor):writer.executor.transaction([{text:kind==='absent-membership'?"INSERT INTO employee_positions VALUES('employee','p')":kind==='coverage-cascade'?"DELETE FROM location_coverage_windows WHERE id='w'":"INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('foreign-shift','foreign-schedule','employee','2030-10-07','16:00','20:00')",values:[]}]);
  let writing:Promise<unknown>|undefined;
  const generationExecutor:SqlExecutor={...generation.executor,query:async<T>(statement:SqlStatement)=>{
   const result=await generation.executor.query<T>(statement);
   // Release before draining: this defer is registered after the scope's own
   // release defer, so without it a failed scope would await a paused writer forever.
   if(kind==='profile'&&order==='writer-first'&&!writing){writing=runWriter();defer(()=>writing);defer(()=>writer.release());await Promise.race([writer.ready,writing]);}
   return result;
  }};
  if(order==='writer-first') {
    if(kind!=='profile'){writing=runWriter();defer(()=>writing);await Promise.race([writer.ready,writing]);}
    const deleting=a.deleteGeneratedDraftShift(input,generationExecutor);defer(()=>deleting);defer(()=>writer.release());
    await observeBlocked(generation.pid);writer.release();await writing;expect((await deleting).status).toBe('deleted');
  }else{
    const deleting=a.deleteGeneratedDraftShift(input,generation.executor);defer(()=>deleting);await Promise.race([generation.ready,deleting]);
    const writing=runWriter();defer(()=>writing);defer(()=>generation.release());
    await observeBlocked(writer.pid);generation.release();expect((await deleting).status).toBe('deleted');await writing;
  }
 });
 expect(await count('schedule_generation_exclusions')).toBe(1);
 if(kind==='coverage-cascade')expect(await count('coverage_window_position_requirements')).toBe(0);
 if(kind==='foreign-week-shift')expect((await q("SELECT id FROM shifts WHERE id='foreign-shift'"))).toHaveLength(1);
});
it('workspace NO KEY UPDATE permits an in-flight location insert FK KEY SHARE before table protection',async()=>{
 await generated();const a=await api();
 await withOwnedTestResources(async defer=>{
  const writer=new Client({connectionString:database.connectionString,statement_timeout:5000});await writer.connect();defer(()=>writer.end());
  await writer.query('BEGIN');defer(()=>writer.query('ROLLBACK'));await writer.query('LOCK TABLE locations IN ROW EXCLUSIVE MODE');
  const generation=await heldExecutor(defer,()=>false);
  const deleting=a.deleteGeneratedDraftShift(input,generation.executor);defer(()=>deleting);defer(()=>writer.query('COMMIT'));
  await observeBlocked(generation.pid);
  await writer.query("INSERT INTO locations(id,workspace_id,clocker_key,name,short_name) VALUES('new-location','workspace-fuel','new-fictional','Fictional','New')");
  await writer.query('COMMIT');expect((await deleting).status).toBe('deleted');
 });
});
it('source equality includes cleared lifecycle and business-date shifts owned by another week',async()=>{
 await generated();const a=await api();const result=await a.deleteGeneratedDraftShift(input,database.executor);
 const before=await readGenerationSource(database.executor);
 await a.clearGenerationExclusion({...input,exclusionId:result.exclusionId!},database.executor);
 expect((await readGenerationSource(database.executor)).source).not.toEqual(before.source);
 await q("INSERT INTO schedules(id,location_id,week_start,created_by) VALUES('foreign','loc-2','2030-09-30','manager'); INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('foreign-business','foreign','employee','2030-10-07','08:00','12:00')");
 expect((await readGenerationSource(database.executor)).source.shifts).toContainEqual(expect.objectContaining({id:'foreign-business',date:'2030-10-07',schedule_id:'foreign'}));
});
it('publication or actor revocation racing deletion rejects without reservation; bounded retry returns typed conflict',async()=>{
 await generated();const a=await api();let first=true;
 const racing:SqlExecutor={query:database.executor.query,transaction:async statements=>{if(first){first=false;await q("UPDATE schedules SET status='PUBLISHED'");}return database.executor.transaction(statements);}};
 await expect(a.deleteGeneratedDraftShift(input,racing)).rejects.toThrow('DRAFT');
 expect(await count('shifts')).toBe(1);expect(await count('schedule_generation_exclusions')).toBe(0);
 await q("UPDATE schedules SET status='DRAFT'");first=true;
 const revoked:SqlExecutor={query:database.executor.query,transaction:async statements=>{if(first){first=false;await q("UPDATE employees SET active=false WHERE id='manager'");}return database.executor.transaction(statements);}};
 await expect(a.deleteGeneratedDraftShift(input,revoked)).rejects.toThrow('active Owner or Manager');
 await q("UPDATE employees SET active=true WHERE id='manager'; INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('scope-owner','Fictional','Owner','NONE','OWNER','loc-1')");
 const {readOwnerOperationalScope,assignOperationalScope}=await import('../../lib/company-access/operational-scope.server');
 const owner=await fixtureProof(database.executor,'scope-owner');
 const current=await readOwnerOperationalScope(owner,'manager',database.executor);
 if(current.state!=='ready')throw Error('Missing owned scope context');
 const target=current.data.current;
 expect(await assignOperationalScope(owner,'manager',{action:'ASSIGN',operationId:crypto.randomUUID(),expectedEmployeeVersion:target.employeeUpdatedAt,expectedRoleGeneration:target.roleGeneration,expectedScopeRevision:target.scopeRevision,scope:{mode:'COMPANY',locationIds:[]}},database.executor)).toMatchObject({state:'saved'});
 let attempts=0;
 const churn:SqlExecutor={query:database.executor.query,transaction:async statements=>{attempts++;await q("UPDATE employees SET last_name=$1 WHERE id='employee'",[`Fictional ${attempts}`]);return database.executor.transaction(statements);}};
 await expect(a.deleteGeneratedDraftShift(input,churn)).rejects.toBeInstanceOf(GenerationConflictError);expect(attempts).toBe(3);
 expect(await count('schedule_generation_exclusions')).toBe(0);
});
it('simultaneous deletion creates exactly one independent event',async()=>{
 await generated();const a=await api();
 const results=await Promise.all([a.deleteGeneratedDraftShift(input,database.executor),a.deleteGeneratedDraftShift(input,database.executor)]);
 expect(results.map(r=>r.status).sort()).toEqual(['absent','deleted']);
 expect(await count('schedule_generation_exclusions')).toBe(1);expect(await count('shifts')).toBe(0);
});
it('exact after-state proof rejects a no-op deletion and rolls back every attempted exclusion',async()=>{
 await generated();const a=await api();let attempts=0;
 const noop:SqlExecutor={query:database.executor.query,transaction:statements=>{attempts++;return database.executor.transaction(statements.map(s=>s.text==='DELETE FROM shifts WHERE id=$1'?{text:'SELECT 1',values:[]}:s));}};
 await expect(a.deleteGeneratedDraftShift(input,noop)).rejects.toBeInstanceOf(GenerationConflictError);
 expect(attempts).toBe(3);expect(await count('shifts')).toBe(1);expect(await count('schedule_generation_exclusions')).toBe(0);
});
it('late failure while clearing leaves the original active event intact',async()=>{
 await generated();const a=await api();const result=await a.deleteGeneratedDraftShift(input,database.executor);
 const before=await q('SELECT to_jsonb(t) row FROM schedule_generation_exclusions t');
 const failing:SqlExecutor={query:database.executor.query,transaction:s=>database.executor.transaction([...s,{text:"SELECT 'late_clear_failure'::integer",values:[]}])};
 await expect(a.clearGenerationExclusion({...input,exclusionId:result.exclusionId!},failing)).rejects.toThrow('late_clear_failure');
 expect(await q('SELECT to_jsonb(t) row FROM schedule_generation_exclusions t')).toEqual(before);
});
it('bounded workspace lock wait returns a typed conflict and leaves all state intact',async()=>{
 await generated();const a=await api();
 const blocker=new Client({connectionString:database.connectionString});await blocker.connect();
 try{
   let blocked=false;
   const executor:SqlExecutor={query:database.executor.query,transaction:async statements=>{
    if(!blocked){blocked=true;await blocker.query('BEGIN');await blocker.query('SELECT id FROM workspaces FOR UPDATE');}
    return database.executor.transaction(statements);
   }};
   await expect(a.deleteGeneratedDraftShift(input,executor)).rejects.toBeInstanceOf(GenerationConflictError);
   expect(blocked).toBe(true);
 }finally{await blocker.query('ROLLBACK');await blocker.end();}
 expect(await count('shifts')).toBe(1);expect(await count('schedule_generation_exclusions')).toBe(0);
});
import { configureFictionalShiftChanges,createCoverageOffer,claimCoverage,approveCoverageExchange } from './shift-change-api';
it('approved exchange assignment takes Manager control and drops generated claims',async()=>{
 await generated();await q("UPDATE schedules SET status='PUBLISHED'; UPDATE employees SET role='LEAD' WHERE id='employee'; INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('replacement','Fictional','Replacement','NONE','LEAD','loc-1'); INSERT INTO employee_location_eligibility VALUES('employee','loc-1'),('replacement','loc-1')");
 await configureFictionalShiftChanges(database.executor);
 const exchangeId=await createCoverageOffer({sourceShiftId:'legacy',requestedByEmployeeId:'employee'},database.executor);
 expect(await claimCoverage({exchangeId,employeeId:'replacement'},database.executor)).toBe(true);
 expect(await approveCoverageExchange({exchangeId,managerId:'manager'},database.executor)).toBe(true);
 expect(await q("SELECT employee_id,assignment_origin,generated_claims FROM shifts WHERE id='legacy'")).toEqual([{employee_id:'replacement',assignment_origin:'MANAGER',generated_claims:null}]);
 expect(await count('schedule_generation_exclusions')).toBe(0);
});
it('clear then same-ID regeneration can be deleted again with a fresh active event',async()=>{
 await generated();const a=await api();const first=await a.deleteGeneratedDraftShift(input,database.executor);
 await a.clearGenerationExclusion({...input,exclusionId:first.exclusionId!},database.executor);
 await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,assignment_origin,generated_claims,is_designated_lead) VALUES('legacy','draft','employee','2030-10-07','08:00','12:00','GENERATED',$1::jsonb,true)",[JSON.stringify(claims)]);
 const second=await a.deleteGeneratedDraftShift(input,database.executor);
 expect(second.status).toBe('deleted');expect(second.exclusionId).not.toBe(first.exclusionId);
 const events=await q('SELECT id,deleted_source_shift_id,cleared_at FROM schedule_generation_exclusions');
 expect(events).toHaveLength(2);expect(events.filter(e=>e.cleared_at===null)).toHaveLength(1);
 expect(events.every(e=>e.deleted_source_shift_id==='legacy')).toBe(true);
 expect((await a.deleteGeneratedDraftShift(input,database.executor)).status).toBe('absent');expect(await count('schedule_generation_exclusions')).toBe(2);
});
it('materially changed need can reuse a source ID without colliding with its old active audit event',async()=>{
 await generated();const a=await api();await a.deleteGeneratedDraftShift(input,database.executor);
 const changedNeed={...need,needEnd:'2030-10-07T13:00'};
 const changedClaims={version:1,claims:[{...changedNeed,needKey:generationNeedKey(scope,changedNeed),coveredStart:changedNeed.needStart,coveredEnd:changedNeed.needEnd,quantity:1}]};
 await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,assignment_origin,generated_claims,is_designated_lead) VALUES('legacy','draft','employee','2030-10-07','08:00','13:00','GENERATED',$1::jsonb,true)",[JSON.stringify(changedClaims)]);
 expect((await a.deleteGeneratedDraftShift(input,database.executor)).status).toBe('deleted');
 const events=await q('SELECT claims,cleared_at FROM schedule_generation_exclusions');expect(events).toHaveLength(2);
 expect(events.every(e=>e.cleared_at===null)).toBe(true);expect(events.map(e=>e.claims)).toEqual(expect.arrayContaining([claims,changedClaims]));
});
it('rejects deletion when persisted LEAD claims disagree with the actual non-designated shift',async()=>{
 await generated();await q("UPDATE shifts SET is_designated_lead=false WHERE id='legacy'");const a=await api();
 await expect(a.deleteGeneratedDraftShift(input,database.executor)).rejects.toThrow('Invalid generation claims');
 expect(await count('shifts')).toBe(1);expect(await count('schedule_generation_exclusions')).toBe(0);
});
