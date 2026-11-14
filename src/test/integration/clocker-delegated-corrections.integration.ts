import {randomUUID} from 'node:crypto';
import {afterEach,beforeEach,expect,it} from 'vitest';
import {createPunchFixture} from './clocker-punch-fixture';
import {submitDelegatedTimeCorrection,reviewTimeCorrection,submitTimeCorrection} from '../../lib/time-corrections/service';
import {readDelegatedTimeCorrections,readManagerTimeCorrections} from '../../lib/data/time-corrections.server';
import {assignOperationalScope,readOwnerOperationalScope} from '../../lib/company-access/operational-scope.server';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import type {CorrectionRequestCommand} from '../../lib/time-corrections/validation';
import type {SqlExecutor} from '../../lib/notifications/types';
import {Client} from 'pg';
let f:Awaited<ReturnType<typeof createPunchFixture>>;
const actor=(id:string,role:'OWNER'|'MANAGER'|'EMPLOYEE',hash:string):SessionMutationProof=>({employee:{id,firstName:'Fictional',lastName:'QA',role,primaryLocationId:'loc-1'},sessionTokenHash:hash.repeat(64)});
const owner=actor('c34-owner','OWNER','a'),manager=actor('delegated-manager','MANAGER','c'),worker=actor('c34-a','EMPLOYEE','d');
const ago=(m:number)=>new Date(Date.now()-m*60000).toISOString();
const command=():CorrectionRequestCommand=>({operationId:randomUUID(),kind:'ENTRY_BOUNDARY',timeEntryId:'delegated-entry',proposedStartAt:ago(235),proposedEndAt:ago(125),reason:'Confirmed with the worker; a different manager must review.'});
beforeEach(async()=>{
 f=await createPunchFixture({breaks:true,companyAccess:true});
 await f.q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('delegated-manager','Morgan','QA','559','MANAGER','loc-1');INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('c',64),'delegated-manager',clock_timestamp()+interval '1 day'),(repeat('d',64),'c34-a',clock_timestamp()+interval '1 day')");
 await f.q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES('delegated-entry','c34-a','loc-1',$1,$2,$3,'CLOCKED_OUT',4)",[f.devices[0].device.id,ago(240),ago(120)]);
});
afterEach(async()=>{if(f)await f.db.dispose();});
async function grant(mode:'COMPANY'|'LOCATIONS'='COMPANY'){
 const v=await readOwnerOperationalScope(owner,manager.employee.id,f.db.executor);if(v.state!=='ready')throw Error('Scope unavailable');const c=v.data.current;
 expect((await assignOperationalScope(owner,manager.employee.id,{operationId:randomUUID(),action:'ASSIGN',expectedEmployeeVersion:c.employeeUpdatedAt,expectedScopeRevision:c.scopeRevision,expectedRoleGeneration:c.roleGeneration,scope:mode==='COMPANY'?{mode,locationIds:[]}:{mode,locationIds:['loc-1']}},f.db.executor)).state).toBe('saved');
}
async function submit(who=owner,c=command(),target='c34-a'){return submitDelegatedTimeCorrection(who,target,c,f.db.executor);}
async function review(who:SessionMutationProof,id:string,decision:'APPROVE'|'REJECT'='APPROVE'){return reviewTimeCorrection(who,{operationId:randomUUID(),requestId:id,expectedRevision:1,decision},f.db.executor);}
it('records a delegated proposal without changing raw or effective time and keeps its real requester',async()=>{
 const before=await f.q("SELECT to_jsonb(t) AS value FROM time_entries t WHERE id='delegated-entry'");const c=command(),result=await submit(owner,c);expect(result).toMatchObject({status:'pending',operationId:c.operationId});
 expect(await f.q('SELECT employee_id,requested_by_employee_id FROM time_correction_requests WHERE id=$1',[c.operationId])).toEqual([{employee_id:'c34-a',requested_by_employee_id:'c34-owner'}]);
 expect(await f.q('SELECT actor_employee_id,event_kind FROM time_correction_events WHERE request_id=$1',[c.operationId])).toEqual([{actor_employee_id:'c34-owner',event_kind:'REQUESTED'}]);
 expect(await f.q("SELECT to_jsonb(t) AS value FROM time_entries t WHERE id='delegated-entry'")).toEqual(before);expect(await f.q('SELECT count(*)::int AS n FROM time_correction_adjustments')).toEqual([{n:0}]);
});
it.each(['APPROVE','REJECT'] as const)('blocks the requester and target from %s, including direct SQL ledger insertion',async decision=>{
 const c=command();expect((await submit(owner,c)).status).toBe('pending');expect(await review(owner,c.operationId,decision)).toEqual({status:'blocked',reason:'self_review'});
 expect(await review(worker,c.operationId,decision)).toEqual({status:'unavailable'});
 for(const actorId of ['c34-owner','c34-a'])await expect(f.q("INSERT INTO time_correction_events(id,request_id,revision,event_kind,actor_employee_id,operation_hash,adjustment_id,result) VALUES($1,$2,2,$3,$4,repeat('1',64),$5,'{}')",[randomUUID(),c.operationId,decision==='APPROVE'?'APPROVED':'REJECTED',actorId,decision==='APPROVE'?randomUUID():null])).rejects.toThrow(/SELF_REVIEW/);
 expect(await f.q('SELECT count(*)::int AS n FROM time_correction_adjustments')).toEqual([{n:0}]);
});
it('lets a different currently authorized Manager approve and records an adjustment without rewriting the punch',async()=>{
 await grant();const c=command();expect((await submit(owner,c)).status).toBe('pending');expect((await review(manager,c.operationId)).status).toBe('approved');
 expect(await f.q("SELECT version FROM time_entries WHERE id='delegated-entry'")).toEqual([{version:4}]);expect(await f.q('SELECT created_by FROM time_correction_adjustments')).toEqual([{created_by:'delegated-manager'}]);
});
it('lets a Company Manager request and a different Owner review, with submitter controls visible in the queue',async()=>{
 await grant();const c=command();expect((await submit(manager,c)).status).toBe('pending');const queue=await readManagerTimeCorrections(manager,f.db.executor);expect(queue.state).toBe('ready');if(queue.state==='ready')expect(queue.requests).toEqual([expect.objectContaining({isSelf:true,requestedByName:'Morgan QA'})]);
 expect((await review(owner,c.operationId)).status).toBe('approved');
});
it('requires current Company management access for both delegated read and write',async()=>{
 for(const who of [worker,manager]){expect((await submit(who)).status).toBe('unavailable');expect(await readDelegatedTimeCorrections(who,'c34-a',f.db.executor)).toMatchObject({state:'unavailable',reason:'access_denied'});}
 await grant('LOCATIONS');expect((await submit(manager)).status).toBe('unavailable');await grant();expect((await submit(manager)).status).toBe('pending');
});
it('rejects self-targeting and wrong employee ownership and does not broaden the existing self command',async()=>{
 expect((await submit(owner,command(),'c34-owner')).status).toBe('unavailable');expect((await submit(owner,command(),'c34-b')).status).toBe('unavailable');
 expect(await submitTimeCorrection(owner,{...command(),employeeId:'c34-a'} as unknown as CorrectionRequestCommand,f.db.executor).catch(()=>({status:'invalid'}))).toEqual({status:'invalid'});
});
it('replays exactly once, rejects changed intent and checks current authority before receipt recovery',async()=>{
 await grant();const c=command(),first=await submit(manager,c);expect(first.status).toBe('pending');expect(await submit(manager,c)).toEqual(first);expect(await submit(manager,{...c,reason:'Different reason.'})).toEqual({status:'conflict'});
 await f.q("DELETE FROM employee_sessions WHERE employee_id='delegated-manager'");expect((await submit(manager,c)).status).toBe('unavailable');expect(await f.q('SELECT count(*)::int AS n FROM time_correction_requests')).toEqual([{n:1}]);
});
it('rejects a NULL fingerprint even when a direct SQL caller reuses an existing delegated operation',async()=>{
 const c=command();expect((await submit(owner,c)).status).toBe('pending');const [w]=await f.q<{id:string}>('SELECT id FROM workspaces WHERE singleton');
 await expect(f.q("SELECT nevora_submit_delegated_time_correction($1::uuid,$2,'c34-a','c34-owner','ENTRY_BOUNDARY','delegated-entry',NULL,NULL,$3::timestamptz,$4::timestamptz,$5,NULL)",[c.operationId,w.id,c.proposedStartAt,c.proposedEndAt,c.reason])).rejects.toThrow(/nevora_correction_INVALID/);
});
it('refuses a revoked Company grant and inactive actor before returning a saved proposal',async()=>{
 await grant();const c=command();expect((await submit(manager,c)).status).toBe('pending');await grant('LOCATIONS');expect((await submit(manager,c)).status).toBe('unavailable');expect(await readDelegatedTimeCorrections(manager,'c34-a',f.db.executor)).toMatchObject({state:'unavailable',reason:'access_denied'});await grant();await f.q("UPDATE employees SET active=false WHERE id='delegated-manager'");expect((await submit(manager,c)).status).toBe('unavailable');
});
it.each(['expired_session','inactive_actor'] as const)('rechecks %s after a real target employee lock wait before inserting a delegated proposal',async change=>{
 await grant();const blocker=new Client({connectionString:f.db.connectionString});await blocker.connect();let pending:ReturnType<typeof submit>|undefined;
 try{
  await blocker.query('BEGIN');await blocker.query("SELECT id FROM employees WHERE id='c34-a' FOR UPDATE");pending=submit(manager);
  const deadline=Date.now()+5000;let waiting=false;
  while(Date.now()<deadline){const [row]=await f.q<{waiting:boolean}>("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'SELECT id FROM employees WHERE id=ANY%') AS waiting");if(row.waiting){waiting=true;break;}await new Promise(resolve=>setTimeout(resolve,10));}
  expect(waiting).toBe(true);
  await f.q(change==='expired_session'?"UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE employee_id='delegated-manager'":"UPDATE employees SET active=false WHERE id='delegated-manager'");
  await blocker.query('COMMIT');expect((await pending).status).toBe('unavailable');expect(await f.q('SELECT count(*)::int AS n FROM time_correction_requests')).toEqual([{n:0}]);
 }finally{await blocker.query('ROLLBACK').catch(()=>{});await blocker.end();await pending?.catch(()=>{});}
});
it('recovers an actual committed proposal after its transaction acknowledgement is lost',async()=>{
 const c=command();let lost=false;const transport:SqlExecutor={query:s=>f.db.executor.query(s),transaction:async statements=>{const result=await f.db.executor.transaction(statements);if(!lost&&statements.some(s=>s.text.includes('nevora_submit_delegated_time_correction'))){lost=true;throw Error('Fictional lost acknowledgement');}return result;}};
 expect(await submitDelegatedTimeCorrection(owner,'c34-a',c,transport)).toEqual({status:'outcome-unknown',operationId:c.operationId});expect((await submit(owner,c)).status).toBe('pending');expect(await f.q('SELECT count(*)::int AS n FROM time_correction_requests')).toEqual([{n:1}]);
});
it('preserves recorded break evidence and allows a separately reviewed delegated break adjustment',async()=>{
 await grant();const type=f.breakType!;await f.q("INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at,version,break_type_id,break_type_snapshot) VALUES('delegated-break','delegated-entry',$1,$2,2,$3,$4)",[ago(190),ago(175),type.id,JSON.stringify({id:type.id,version:type.version,name:type.name,category:type.category,targetMinutes:type.targetMinutes})]);
 const before=await f.q("SELECT to_jsonb(b) AS value FROM break_entries b WHERE id='delegated-break'"),c:CorrectionRequestCommand={operationId:randomUUID(),kind:'BREAK_BOUNDARY',timeEntryId:'delegated-entry',breakEntryId:'delegated-break',proposedStartAt:ago(185),proposedEndAt:ago(170),reason:'Break boundaries confirmed for a separate review.'};expect((await submit(owner,c)).status).toBe('pending');expect((await review(manager,c.operationId)).status).toBe('approved');expect(await f.q("SELECT to_jsonb(b) AS value FROM break_entries b WHERE id='delegated-break'")).toEqual(before);
});
it('serializes concurrent identical submissions and rejects a second pending business proposal',async()=>{
 const c=command(),results=await Promise.all([submit(owner,c),submit(owner,c)]);expect(results.every(r=>r.status==='pending')).toBe(true);expect((await submit(owner,{...c,operationId:randomUUID()})).status).toBe('conflict');expect(await f.q('SELECT count(*)::int AS n FROM time_correction_events')).toEqual([{n:1}]);
});
it('supports inactive targets without reactivating their account or fabricating their session',async()=>{
 await f.q("UPDATE employees SET active=false WHERE id='c34-a';DELETE FROM employee_sessions WHERE employee_id='c34-a'");expect((await submit()).status).toBe('pending');expect(await f.q("SELECT active FROM employees WHERE id='c34-a'")).toEqual([{active:false}]);
});
it('supports missing-time proposals and explicit approved missing-time supersession with separate reviewers',async()=>{
 await grant();const c:CorrectionRequestCommand={operationId:randomUUID(),kind:'MISSING_ENTRY',locationId:'loc-1',proposedStartAt:ago(600),proposedEndAt:ago(500),reason:'Unrecorded work confirmed for review.'};expect((await submit(owner,c)).status).toBe('pending');const approved=await review(manager,c.operationId);expect(approved.status).toBe('approved');if(approved.status!=='approved')throw Error('Approval unavailable');
 const next={...c,operationId:randomUUID(),targetAdjustmentId:approved.adjustmentId,expectedBaseRevision:2,proposedEndAt:ago(490)};expect((await submit(manager,next)).status).toBe('pending');expect((await review(owner,next.operationId)).status).toBe('approved');expect(await f.q('SELECT count(*)::int AS n FROM time_correction_adjustments WHERE supersedes_adjustment_id=$1',[approved.adjustmentId])).toEqual([{n:1}]);
});
