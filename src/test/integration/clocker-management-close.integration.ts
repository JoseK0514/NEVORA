import {randomUUID} from 'node:crypto';
import {afterEach,beforeEach,expect,it} from 'vitest';
import {createPunchFixture} from './clocker-punch-fixture';
import {readManagementCloseContext,closeManagedTimeEntry} from '../../lib/management-close/service.server';
import {assignOperationalScope,readOwnerOperationalScope} from '../../lib/company-access/operational-scope.server';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
import {ClockerPunchService} from '../../lib/clocker/punches.server';

let f:Awaited<ReturnType<typeof createPunchFixture>>;
const actor=(id:string,role:'OWNER'|'MANAGER'|'EMPLOYEE',hash:string):SessionMutationProof=>({employee:{id,firstName:'Fictional',lastName:'QA',role,primaryLocationId:'loc-1'},sessionTokenHash:hash.repeat(64)});
const owner=actor('c34-owner','OWNER','a'),manager=actor('close-manager','MANAGER','c'),worker=actor('c34-a','EMPLOYEE','d');
const ago=(minutes:number)=>new Date(Date.now()-minutes*60000).toISOString();
beforeEach(async()=>{
  f=await createPunchFixture({breaks:true,companyAccess:true});
  await f.q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('close-manager','Morgan','QA','559','MANAGER','loc-1');
    INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('c',64),'close-manager',clock_timestamp()+interval '1 day'),(repeat('d',64),'c34-a',clock_timestamp()+interval '1 day');`);
  await f.q(`INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status,version) VALUES('management-open','c34-a','loc-1',$1,$2,'CLOCKED_IN',2)`,[f.devices[0].device.id,ago(240)]);
  await f.q("INSERT INTO clocker_employee_clock_state(employee_id,revision) VALUES('c34-a',3)");
});
afterEach(async()=>{if(f)await f.db.dispose();});
async function context(who=owner,id='management-open'){
  const view=await readManagementCloseContext(who,id,f.db.executor);
  expect(view.state).toBe('ready');if(view.state!=='ready')throw Error('Expected authorized close context');
  return view;
}
async function command(who=owner){const view=await context(who);return {view,input:{operationId:randomUUID(),timeEntryId:view.target.timeEntryId,expectedSourceHash:view.sourceHash,closedAt:ago(30),reason:'Worker is unavailable; explicit end time confirmed.'}};}
async function grant(mode:'COMPANY'|'LOCATIONS',ids:string[]=[]){
  const v=await readOwnerOperationalScope(owner,manager.employee.id,f.db.executor);if(v.state!=='ready')throw Error('Expected current scope');const c=v.data.current;
  expect((await assignOperationalScope(owner,manager.employee.id,{operationId:randomUUID(),action:'ASSIGN',expectedEmployeeVersion:c.employeeUpdatedAt,expectedScopeRevision:c.scopeRevision,expectedRoleGeneration:c.roleGeneration,scope:mode==='COMPANY'?{mode,locationIds:[]}:{mode,locationIds:ids}},f.db.executor)).state).toBe('saved');
}

it('reads a minimal current confirmation context and atomically records one Owner close',async()=>{
  const {view,input}=await command();expect(view.validForMs).toBeGreaterThan(0);expect(view.validForMs).toBeLessThanOrEqual(15000);
  expect(JSON.stringify(view)).not.toMatch(/sessionTokenHash|credential|deviceId|employeeId|lookupHash|phone|email/);
  expect(await closeManagedTimeEntry(owner,input,view.authority,f.db.executor)).toMatchObject({status:'closed',operationId:input.operationId,timeEntryId:'management-open',entryVersion:3,clockRevision:4,endedBreakId:null});
  expect(await f.q("SELECT status,version,clock_out_at IS NOT NULL AS closed FROM time_entries WHERE id='management-open'")).toEqual([{status:'CLOCKED_OUT',version:3,closed:true}]);
  const [audit]=await f.q<{reason:string;before:{entry:{clock_out_at:string|null}};after:{entry:{status:string}}}>(`SELECT reason,before_snapshot AS before,after_snapshot AS after FROM management_time_closes`);
  expect(audit.reason).toBe(input.reason);expect(audit.before.entry.clock_out_at).toBeNull();expect(audit.after.entry.status).toBe('CLOCKED_OUT');
  expect(await f.q('SELECT count(*)::int AS n FROM clocker_command_ledger')).toEqual([{n:0}]);
});
it('recovers an inactive worker, inactive location and revoked tablet without reviving their authority',async()=>{
  await f.q("UPDATE employees SET active=false WHERE id='c34-a'; UPDATE locations SET active=false WHERE id='loc-1'");
  await f.q('UPDATE clocker_devices SET active=false,credential_hash=NULL,revoked_at=clock_timestamp() WHERE id=$1',[f.devices[0].device.id]);
  const {view,input}=await command();expect((await closeManagedTimeEntry(owner,input,view.authority,f.db.executor)).status).toBe('closed');
  expect(await f.q("SELECT active FROM employees WHERE id='c34-a'")).toEqual([{active:false}]);
  expect(await f.q("SELECT active FROM locations WHERE id='loc-1'")).toEqual([{active:false}]);
});
it('ends an existing open break at the chosen close while preserving its recorded start and type',async()=>{
  const start=ago(60),settings={id:f.breakType!.id,version:f.breakType!.version,name:f.breakType!.name,category:'REST',targetMinutes:15};
  await f.q("UPDATE time_entries SET status='ON_BREAK' WHERE id='management-open'");
  await f.q("INSERT INTO break_entries(id,time_entry_id,break_start_at,break_type_id,break_type_snapshot,version) VALUES('management-break','management-open',$1,$2,$3,1)",[start,f.breakType!.id,JSON.stringify(settings)]);
  const {view,input}=await command();expect((await closeManagedTimeEntry(owner,input,view.authority,f.db.executor))).toMatchObject({status:'closed',endedBreakId:'management-break'});
  const [row]=await f.q<{same:boolean;version:number;settings:unknown}>('SELECT break_end_at=$1::timestamptz AS same,version,break_type_snapshot AS settings FROM break_entries WHERE id=$2',[input.closedAt,'management-break']);expect(row).toEqual({same:true,version:2,settings});
});
it('replays the identical operation once and rejects a changed reason or target under that operation',async()=>{
  const {view,input}=await command();const first=await closeManagedTimeEntry(owner,input,view.authority,f.db.executor);
  expect(first.status).toBe('closed');expect(await closeManagedTimeEntry(owner,input,view.authority,f.db.executor)).toEqual(first);
  expect(await closeManagedTimeEntry(owner,{...input,reason:'Changed original command.'},view.authority,f.db.executor)).toEqual({status:'conflict'});
  expect(await f.q('SELECT count(*)::int AS n FROM management_time_closes')).toEqual([{n:1}]);
});
it('allows a currently assigned Manager only within the complete affected location footprint',async()=>{
  await grant('LOCATIONS',['loc-1']);const {view,input}=await command(manager);
  expect((await closeManagedTimeEntry(manager,input,view.authority,f.db.executor)).status).toBe('closed');
});
it('rejects a changed grant and inactive actor after the confirmation was read',async()=>{
  await grant('COMPANY');const {view,input}=await command(manager);await grant('LOCATIONS',['loc-2']);
  expect(await closeManagedTimeEntry(manager,input,view.authority,f.db.executor)).toEqual({status:'unavailable'});
  expect(await readManagementCloseContext(worker,'management-open',f.db.executor)).toMatchObject({state:'unavailable',reason:'access_denied'});
  const own=await command();await f.q("UPDATE employees SET active=false WHERE id='c34-owner'");expect(await closeManagedTimeEntry(owner,own.input,own.view.authority,f.db.executor)).toEqual({status:'unavailable'});
  expect(await f.q('SELECT count(*)::int AS n FROM management_time_closes')).toEqual([{n:0}]);
});
it('rejects future/before-start instants and stale source without changing a punch or audit',async()=>{
  const {view,input}=await command();
  for(const closedAt of [ago(-30),ago(300)])expect(await closeManagedTimeEntry(owner,{...input,operationId:randomUUID(),closedAt},view.authority,f.db.executor)).toEqual({status:'blocked',reason:'invalid_interval'});
  await f.q("UPDATE time_entries SET version=version+1 WHERE id='management-open'");
  expect(await closeManagedTimeEntry(owner,input,view.authority,f.db.executor)).toEqual({status:'blocked',reason:'stale_source'});
  expect(await f.q('SELECT count(*)::int AS n FROM management_time_closes')).toEqual([{n:0}]);
});
it('serializes two different closes with one immutable audit and one clock revision increment',async()=>{
  const {view,input}=await command();const results=await Promise.all([input,{...input,operationId:randomUUID()}].map(c=>closeManagedTimeEntry(owner,c,view.authority,f.db.executor)));
  expect(results.filter(r=>r.status==='closed')).toHaveLength(1);expect(results.filter(r=>r.status==='blocked'||r.status==='conflict')).toHaveLength(1);
  expect(await f.q('SELECT count(*)::int AS n FROM management_time_closes')).toEqual([{n:1}]);expect(await f.q("SELECT revision FROM clocker_employee_clock_state WHERE employee_id='c34-a'")).toEqual([{revision:4}]);
});

it('replays two simultaneous identical operations with one mutation',async()=>{
  const {view,input}=await command();const results=await Promise.all([1,2].map(()=>closeManagedTimeEntry(owner,input,view.authority,f.db.executor)));
  expect(results[0].status).toBe('closed');expect(results[1]).toEqual(results[0]);
  expect(await f.q('SELECT count(*)::int AS n FROM management_time_closes')).toEqual([{n:1}]);
});
it('denies self-review and a Manager whose scope misses the current primary location',async()=>{
  await f.q("UPDATE time_entries SET employee_id='c34-owner' WHERE id='management-open'");
  const self=await command();expect(await closeManagedTimeEntry(owner,self.input,self.view.authority,f.db.executor)).toEqual({status:'blocked',reason:'self_review'});
  await f.q("UPDATE time_entries SET employee_id='c34-a' WHERE id='management-open';UPDATE employees SET primary_location_id='loc-2' WHERE id='c34-a'");
  await grant('LOCATIONS',['loc-1']);expect(await readManagementCloseContext(manager,'management-open',f.db.executor)).toMatchObject({state:'unavailable',reason:'access_denied'});
});
it.each(['expiry','logout','downgrade'] as const)('rejects %s after confirmation without an audit',async change=>{
  await grant('COMPANY');const {view,input}=await command(manager);
  if(change==='expiry')await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE employee_id='close-manager'");
  if(change==='logout')await f.q("DELETE FROM employee_sessions WHERE employee_id='close-manager'");
  if(change==='downgrade')await f.q("UPDATE employees SET role='LEAD' WHERE id='close-manager'");
  expect(await closeManagedTimeEntry(manager,input,view.authority,f.db.executor)).toEqual({status:'unavailable'});
  expect(await f.q('SELECT count(*)::int AS n FROM management_time_closes')).toEqual([{n:0}]);
});
it('preserves completed break history after the proposed close time',async()=>{
  await f.q("INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at) VALUES('ended','management-open',$1,$2)",[ago(60),ago(10)]);
  const {view,input}=await command();expect(await closeManagedTimeEntry(owner,input,view.authority,f.db.executor)).toEqual({status:'blocked',reason:'invalid_interval'});
});
it('blocks overlapping effective work and finalized timecards',async()=>{
  await f.q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status) VALUES('overlap','c34-a','loc-1',$1,$2,$3,'CLOCKED_OUT')",[f.devices[0].device.id,ago(100),ago(90)]);
  let c=await command();expect(await closeManagedTimeEntry(owner,c.input,c.view.authority,f.db.executor)).toEqual({status:'blocked',reason:'overlap'});
  await f.q("DELETE FROM time_entries WHERE id='overlap'");
  await f.q(`INSERT INTO timecard_revisions(operation_id,workspace_id,employee_id,start_date,end_date,revision,action,actor_employee_id,source_hash,snapshot,command_hash)
    SELECT $1,id,'c34-a',CURRENT_DATE-1,CURRENT_DATE,1,'FINALIZE','c34-owner',repeat('a',32),'{}',repeat('a',64) FROM workspaces WHERE singleton`,[randomUUID()]);
  c=await command();expect(await closeManagedTimeEntry(owner,c.input,c.view.authority,f.db.executor)).toEqual({status:'blocked',reason:'finalized_period'});
});
async function approvedPayroll(){
  const [{id}]=await f.q<{id:string}>('SELECT id FROM workspaces WHERE singleton');const run=randomUUID();
  await f.q('INSERT INTO payroll_runs(workspace_id,id,start_date,end_date) VALUES($1,$2,CURRENT_DATE-1,CURRENT_DATE)',[id,run]);
  await f.q('INSERT INTO payroll_run_revisions(workspace_id,run_id,revision,payload) VALUES($1,$2,1,$3)',[id,run,{id:run,status:'APPROVED',rows:[{employeeId:'c34-a'}]}]);
  return {workspaceId:id,run};
}
it('blocks approved payroll while allowing an existing close receipt to replay after payroll approval',async()=>{
  const c=await command();expect((await closeManagedTimeEntry(owner,c.input,c.view.authority,f.db.executor)).status).toBe('closed');
  await approvedPayroll();expect((await closeManagedTimeEntry(owner,c.input,c.view.authority,f.db.executor)).status).toBe('closed');
  await f.q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status) VALUES('new-open','c34-a','loc-1',$1,$2,'CLOCKED_IN')",[f.devices[0].device.id,ago(20)]);
  const view=await context(owner,'new-open');expect(await closeManagedTimeEntry(owner,{...c.input,operationId:randomUUID(),timeEntryId:'new-open',closedAt:ago(10),expectedSourceHash:view.sourceHash},view.authority,f.db.executor)).toEqual({status:'blocked',reason:'payroll_approved'});
});
it('rolls back all writes when the actor expires after the database mutation',async()=>{
  const c=await command();
  await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '2 seconds' WHERE employee_id='c34-owner'");
  const ex:SqlExecutor={...f.db.executor,mutationTransaction:async statements=>{
    const index=statements.findIndex(s=>s.text.includes('SELECT nevora_management_close('));
    return f.db.executor.transaction([...statements.slice(0,index+1),{text:'SELECT pg_sleep(2.1)',values:[]},...statements.slice(index+1)]);
  }};
  expect(await closeManagedTimeEntry(owner,c.input,c.view.authority,ex)).toEqual({status:'unavailable'});
  expect(await f.q("SELECT status,version FROM time_entries WHERE id='management-open'")).toEqual([{status:'CLOCKED_IN',version:2}]);
  expect(await f.q('SELECT count(*)::int AS n FROM management_time_closes')).toEqual([{n:0}]);
});
it('serializes a real tablet clock-out racing a management close',async()=>{
  const identity=await f.identity(),service=new ClockerPunchService(f.key,f.db.executor),tablet=await service.read(identity.proof),c=await command();
  const s=tablet.snapshot,punch={commandId:randomUUID(),verificationId:tablet.verificationId,action:'CLOCK_OUT',expected:{revision:s.revision,timeEntryId:s.entry?.id??null,timeEntryVersion:s.entry?.version??null,breakEntryId:s.break?.id??null,breakEntryVersion:s.break?.version??null}};
  const results=await Promise.allSettled([service.execute(identity.proof,punch),closeManagedTimeEntry(owner,c.input,c.view.authority,f.db.executor)]);
  expect(results.filter(r=>r.status==='fulfilled'&&(!('status'in r.value)||r.value.status==='closed'))).toHaveLength(1);
  const [tabletResult,managedResult]=results;
  if(tabletResult.status==='rejected')expect(tabletResult.reason).toMatchObject({code:'STALE_STATE'});
  if(managedResult.status==='fulfilled'&&managedResult.value.status!=='closed')expect(managedResult.value).toEqual({status:'blocked',reason:'stale_source'});
  const [counts]=await f.q<{n:number}>("SELECT (SELECT count(*) FROM management_time_closes)+(SELECT count(*) FROM clocker_command_ledger) AS n");expect(Number(counts.n)).toBe(1);
  expect(await f.q("SELECT version,status FROM time_entries WHERE id='management-open'")).toEqual([{version:3,status:'CLOCKED_OUT'}]);
});
it('rejects changes or truncation of the append-only management evidence',async()=>{
  const c=await command();expect((await closeManagedTimeEntry(owner,c.input,c.view.authority,f.db.executor)).status).toBe('closed');
  for(const sql of ["UPDATE management_time_closes SET reason='rewritten'",'DELETE FROM management_time_closes','TRUNCATE management_time_closes'])await expect(f.q(sql)).rejects.toThrow();
  expect(await f.q('SELECT count(*)::int AS n FROM management_time_closes')).toEqual([{n:1}]);
});
it('executes under restricted APP grants and denies PUBLIC/WORKER access to the new functions and audit',async()=>{
  const app='r10_app_'+randomUUID().replaceAll('-',''),workerRole='r10_worker_'+randomUUID().replaceAll('-','');
  try {
    await f.q(`CREATE ROLE ${app} NOLOGIN;CREATE ROLE ${workerRole} NOLOGIN;
      GRANT USAGE ON SCHEMA public TO ${app},${workerRole};
      GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO ${app};
      REVOKE UPDATE,DELETE,TRUNCATE ON management_time_closes FROM ${app};
      GRANT EXECUTE ON FUNCTION nevora_management_close_source(text,text),nevora_management_close(text,text,text,text,text,text,uuid,text,timestamptz,text,text) TO ${app};`);
    expect(await f.q<{audit:boolean;source:boolean;close:boolean}>(`SELECT has_table_privilege($1,'management_time_closes','SELECT') AS audit,
      has_function_privilege($1,'nevora_management_close_source(text,text)','EXECUTE') AS source,
      has_function_privilege($1,'nevora_management_close(text,text,text,text,text,text,uuid,text,timestamptz,text,text)','EXECUTE') AS close`,[workerRole])).toEqual([{audit:false,source:false,close:false}]);
    const set={text:`SET LOCAL ROLE ${app}`,values:[]};
    const ex:SqlExecutor={query:async<T>(statement:SqlStatement)=> (await f.db.executor.transaction([set,statement]))[1] as T[],transaction:async statements=>(await f.db.executor.transaction([set,...statements])).slice(1)};
    const view=await readManagementCloseContext(owner,'management-open',ex);expect(view.state).toBe('ready');if(view.state!=='ready')throw Error('Restricted APP read failed');
    const input={operationId:randomUUID(),timeEntryId:'management-open',expectedSourceHash:view.sourceHash,closedAt:ago(30),reason:'Restricted APP attestation.'};
    expect((await closeManagedTimeEntry(owner,input,view.authority,ex)).status).toBe('closed');
    await expect(ex.query({text:"UPDATE management_time_closes SET reason='tampered'",values:[]})).rejects.toMatchObject({code:'42501'});
  }finally{await f.q(`DROP OWNED BY ${app},${workerRole};DROP ROLE ${app},${workerRole}`);}
});
it('recovers a committed close after transport loss using the exact same operation',async()=>{
  const c=await command();let calls=0;
  const ex:SqlExecutor={...f.db.executor,mutationTransaction:async statements=>{
    calls++;await f.db.executor.transaction(statements);throw Object.assign(Error('Simulated lost commit response'),{code:'ECONNRESET'});
  }};
  expect(await closeManagedTimeEntry(owner,c.input,c.view.authority,ex)).toEqual({status:'outcome-unknown',operationId:c.input.operationId});expect(calls).toBe(1);
  expect((await closeManagedTimeEntry(owner,c.input,c.view.authority,f.db.executor)).status).toBe('closed');
  expect(await f.q('SELECT count(*)::int AS n FROM management_time_closes')).toEqual([{n:1}]);
});
it('preserves unknown outcome for a malformed committed receipt and recovers from the ledger',async()=>{
  const c=await command();const ex:SqlExecutor={...f.db.executor,mutationTransaction:async statements=>{
    const results=await f.db.executor.transaction(statements),index=statements.findIndex(s=>s.text.includes('SELECT nevora_management_close('));
    results[index]=[{result:{status:'closed',operationId:'other'}}];return results;
  }};
  expect(await closeManagedTimeEntry(owner,c.input,c.view.authority,ex)).toEqual({status:'outcome-unknown',operationId:c.input.operationId});
  expect((await closeManagedTimeEntry(owner,c.input,c.view.authority,f.db.executor)).status).toBe('closed');
});
it('retries transaction aborts with one original operation and refuses an operation reused by another actor',async()=>{
  const c=await command(),observed:string[]=[];const ex:SqlExecutor={...f.db.executor,mutationTransaction:async statements=>{
    const call=statements.find(s=>s.text.includes('SELECT nevora_management_close('))!;observed.push(String(call.values[6]));
    if(observed.length<3)throw Object.assign(Error('Simulated SQL serialization abort'),{code:'40001'});
    return f.db.executor.transaction(statements);
  }};
  expect((await closeManagedTimeEntry(owner,c.input,c.view.authority,ex)).status).toBe('closed');expect(observed).toEqual([c.input.operationId,c.input.operationId,c.input.operationId]);
  await grant('COMPANY');
  // A new authorized actor cannot take ownership of another actor's saved operation.
  const managerContext=await readManagementCloseContext(manager,'management-open',f.db.executor);expect(managerContext.state).toBe('closed');
  await f.q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status) VALUES('manager-open','c34-b','loc-1',$1,$2,'CLOCKED_IN')",[f.devices[0].device.id,ago(120)]);
  const current=await context(manager,'manager-open');
  expect(await closeManagedTimeEntry(manager,{...c.input,timeEntryId:'manager-open',expectedSourceHash:current.sourceHash},current.authority,f.db.executor)).toEqual({status:'conflict'});
});
it('invalidates originating context after a session replacement, even for the same Owner',async()=>{
  const c=await command();await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('e',64),'c34-owner',clock_timestamp()+interval '1 day')");
  expect(await closeManagedTimeEntry(actor('c34-owner','OWNER','e'),c.input,c.view.authority,f.db.executor)).toEqual({status:'unavailable'});
  expect(await f.q('SELECT count(*)::int AS n FROM management_time_closes')).toEqual([{n:0}]);
});
it('retains the existing payroll-correction workflow: blocks paid time until an explicit correction is open',async()=>{
  const {workspaceId,run}=await approvedPayroll(),c=await command();
  expect(await closeManagedTimeEntry(owner,c.input,c.view.authority,f.db.executor)).toEqual({status:'blocked',reason:'payroll_approved'});
  const correction=randomUUID();await f.q('INSERT INTO payroll_runs(workspace_id,id,start_date,end_date,correction_of) VALUES($1,$2,CURRENT_DATE-1,CURRENT_DATE,$3)',[workspaceId,correction,run]);
  await f.q('INSERT INTO payroll_run_revisions(workspace_id,run_id,revision,payload) VALUES($1,$2,1,$3)',[workspaceId,correction,{id:correction,status:'REVIEW_REQUIRED',rows:[{employeeId:'c34-a'}]}]);
  expect((await closeManagedTimeEntry(owner,c.input,c.view.authority,f.db.executor)).status).toBe('closed');
  expect(await f.q('SELECT payload->>\'status\' AS status FROM payroll_runs_current WHERE run_id=$1',[run])).toEqual([{status:'APPROVED'}]);
});
it('rechecks a moved target after the pre-read before revealing an existing receipt to a scoped Manager',async()=>{
  await grant('LOCATIONS',['loc-1']);const c=await command(manager);expect((await closeManagedTimeEntry(manager,c.input,c.view.authority,f.db.executor)).status).toBe('closed');
  const ex:SqlExecutor={...f.db.executor,mutationTransaction:async statements=>{
    await f.q("UPDATE employees SET primary_location_id='loc-2' WHERE id='c34-a'");return f.db.executor.transaction(statements);
  }};
  expect(await closeManagedTimeEntry(manager,c.input,c.view.authority,ex)).toEqual({status:'blocked',reason:'stale_source'});
  expect(await readManagementCloseContext(manager,'management-open',f.db.executor)).toMatchObject({state:'unavailable',reason:'access_denied'});
  expect(await f.q('SELECT count(*)::int AS n FROM management_time_closes')).toEqual([{n:1}]);
});
