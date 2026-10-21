import {randomUUID} from 'node:crypto';
import {Client} from 'pg';
import {expect,it,vi} from 'vitest';
import {companyAccessFixture} from './company-access-fixture';
import {configureFictionalShiftChanges,reviewedFixtureSource} from './shift-change-api';
import {isOperationalAuthorizationError,readOwnerOperationalScope,assignOperationalScope} from '../../lib/company-access/operational-scope.server';
import {executeShiftChange,findShiftChangeOperation,readShiftChangeAvailability} from '../../lib/data/shift-changes';
import {ShiftChangeAuthorizationError,readShiftChangeSnapshot,readShiftChangeTerms} from '../../lib/data/shift-change-snapshot';
import {readShiftChangeHistory} from '../../lib/data/shift-change-history';
import {readOperationalRuleProfileView,readShiftChangeHistoryView,readShiftChangeOperationView} from '../../lib/data/shift-change-views';
import {isManagementAuthorizationError} from '../../lib/data/management-session';
import type {SessionMutationProof,ShiftChangeCommand} from '../../lib/shift-changes/types';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
const ctx=vi.hoisted(()=>({ex:null as SqlExecutor|null,proof:null as SessionMutationProof|null}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>ctx.proof}));
vi.mock('@/lib/auth/permissions',()=>({MANAGER_ROLES:['OWNER','MANAGER'],requireRoles:async()=>ctx.proof!.employee,requireSelfService:async()=>ctx.proof!.employee}));
vi.mock('next/navigation',()=>({redirect:(destination:string)=>{throw Object.assign(new Error('Owned redirect'),{destination});}}));
vi.mock('next/cache',()=>({revalidatePath:()=>{}}));
vi.mock('@/lib/db',()=>{
 const statement=(text:string,values:readonly unknown[]=[])=>({statement:{text,values},then:(yes:(rows:unknown[])=>unknown,no:(error:unknown)=>unknown)=>ctx.ex!.query({text,values}).then(yes,no)});
 const tagged=Object.assign((strings:TemplateStringsArray,...values:unknown[])=>statement(strings.reduce((text,part,i)=>text+(i?'$'+i:'')+part,''),values),{query:statement,transaction:(queries:{statement:SqlStatement}[])=>ctx.ex!.transaction(queries.map(q=>q.statement))});return {getDb:()=>tagged,queryRows:(rows:unknown)=>rows};
});
import {shiftChangeAction,reconcileShiftChangeAction,reviewExchangeAction} from '../../app/app/exchange/actions';
import {reviewCalloutAction} from '../../app/app/exchange/callout/actions';
type Fixture=Awaited<ReturnType<typeof setup>>;
type ManagerKind=Extract<ShiftChangeCommand['kind'],'MANAGER_APPROVE'|'MANAGER_DECLINE'|'MANAGER_CLOSE'|'APPROVE_CALLOUT'|'DECLINE_CALLOUT'>;
async function choose(f:Awaited<ReturnType<typeof companyAccessFixture>>,mode:'COMPANY'|'LOCATIONS'|'REVOKE',ex=f.db.executor){
 const v=await readOwnerOperationalScope(f.owner,'manager',ex);if(v.state!=='ready')throw Error('Owner scope context');const c=v.data.current;
 const base={operationId:randomUUID(),expectedEmployeeVersion:c.employeeUpdatedAt,expectedRoleGeneration:c.roleGeneration,expectedScopeRevision:c.scopeRevision};
 expect((await assignOperationalScope(f.owner,'manager',mode==='REVOKE'?{...base,action:'REVOKE'}:{...base,action:'ASSIGN',scope:mode==='COMPANY'?{mode,locationIds:[]}:{mode,locationIds:['loc-1']}},ex)).state).toBe('saved');
}
async function setup(kind:ManagerKind='DECLINE_CALLOUT'){
 const f=await companyAccessFixture({database:'exchange'});ctx.ex=f.db.executor;ctx.proof=f.manager;try{
  await f.q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('peer','Peer','QA','NONE','EMPLOYEE','loc-2');INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),'target',clock_timestamp()+interval '1 hour'),(repeat('e',64),'peer',clock_timestamp()+interval '1 hour');INSERT INTO employee_location_eligibility(employee_id,location_id) SELECT e.id,l.id FROM employees e CROSS JOIN locations l WHERE e.id IN('target','peer');INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('scope-shift-schedule','loc-2','2035-10-01','PUBLISHED','owner');INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('scope-source','scope-shift-schedule','target','2035-10-02','08:00','16:00')");
  await configureFictionalShiftChanges(f.db.executor);
  const employee:SessionMutationProof={...f.manager,employee:{...f.manager.employee,id:'target',role:'EMPLOYEE'},sessionTokenHash:'d'.repeat(64)};
  const peer:SessionMutationProof={...employee,employee:{...employee.employee,id:'peer'},sessionTokenHash:'e'.repeat(64)};
  const terms=await reviewedFixtureSource(f.db.executor,'scope-source');
  const created=await executeShiftChange(employee,kind.endsWith('CALLOUT')?{kind:'SUBMIT_CALLOUT',operationId:randomUUID(),...terms,reasonCode:'ILLNESS',reasonNote:'Owned private source-B absence'}:{kind:'OFFER_COVERAGE',operationId:randomUUID(),...terms},f.db.executor);
  if(created.status!=='pending')throw Error('Owned request setup');let revision=1;
  if(!kind.endsWith('CALLOUT')){const accepted=await executeShiftChange(peer,{kind:'ACCEPT',operationId:randomUUID(),requestId:created.requestId,expectedRevision:1},f.db.executor);expect(accepted.status).toBe('pending');revision=2;}
  const command:ShiftChangeCommand={kind,operationId:randomUUID(),requestId:created.requestId,expectedRevision:revision};
  return {...f,employee,peer,terms,command,requestId:created.requestId};
 }catch(error){ctx.ex=null;ctx.proof=null;await f.db.dispose();throw error;}
}
async function close(f:Fixture){ctx.ex=null;ctx.proof=null;await f.db.dispose();}
async function state(f:Fixture){return f.q(`SELECT jsonb_build_object('callouts',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM shift_callouts t),'exchanges',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM shift_exchanges t),'events',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM shift_change_events t),'operations',(SELECT jsonb_agg(to_jsonb(t) ORDER BY operation_id) FROM shift_change_operations t),'shifts',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM shifts t),'revisions',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM schedule_publication_revisions t),'notifications',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM notifications t),'deliveries',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM push_deliveries t)) AS state`);}
const privateSql=(s:SqlStatement)=>s.text.includes('AS source,')||s.text.includes('FROM shift_change_events h')||s.text.includes('SELECT settings.operational_rule_profile')||s.text.includes('SELECT o.result FROM shift_change_operations');
async function unavailable(work:()=>Promise<unknown>){let value:unknown;try{value=await work();}catch(error){if(!(error instanceof ShiftChangeAuthorizationError||isOperationalAuthorizationError(error)||isManagementAuthorizationError(error)))throw error;value='denied';}expect(value===null||Array.isArray(value)&&value.length===0||typeof value==='object'&&value!==null&&('status'in value&&value.status==='unavailable'||'allowed'in value&&value.allowed===false)||value==='denied').toBe(true);}
it.each(['MANAGER_APPROVE','MANAGER_DECLINE','MANAGER_CLOSE','APPROVE_CALLOUT','DECLINE_CALLOUT'] as const)('%s refuses selected-location management before the global snapshot and preserves all related history',async kind=>{
 const f=await setup(kind);try{await choose(f,'LOCATIONS');const before=await state(f);let read=false;const base=f.db.executor,ex={...base,query:async<T>(s:SqlStatement,signal?:AbortSignal)=>{if(privateSql(s))read=true;return base.query<T>(s,signal);}};
 expect(await executeShiftChange(f.manager,f.command,ex)).toEqual({status:'unavailable'});expect(read).toBe(false);expect(await state(f)).toEqual(before);
 }finally{await close(f);}
});
it.each(['Owner','Company Manager'] as const)('current %s keeps a real Manager approval and its original operation receipt',async role=>{
 const f=await setup('MANAGER_APPROVE');try{const p=role==='Owner'?f.owner:f.manager,r=await executeShiftChange(p,f.command,f.db.executor);expect(r).toMatchObject({status:'completed',requestId:f.requestId,revision:3});expect(await executeShiftChange(p,f.command,f.db.executor)).toEqual(r);expect(await findShiftChangeOperation(p,f.command.operationId,f.db.executor)).toEqual(r);expect(await f.q("SELECT employee_id FROM shifts WHERE id='scope-source'")).toEqual([{employee_id:'peer'}]);}finally{await close(f);}
});
it.each(['unassigned','revoked','role cycle'] as const)('custom Manager transition denies %s authority without new history or notices',async kind=>{
 const f=await setup();try{if(kind==='revoked')await choose(f,'REVOKE');else if(kind==='role cycle')await f.q("UPDATE employees SET role='EMPLOYEE' WHERE id='manager';UPDATE employees SET role='MANAGER' WHERE id='manager'");else{await f.q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('new-manager','New','Manager','NONE','MANAGER','loc-1');INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('f',64),'new-manager',clock_timestamp()+interval '1 hour')");f.manager={...f.manager,employee:{...f.manager.employee,id:'new-manager'},sessionTokenHash:'f'.repeat(64)};}const before=await state(f);expect(await executeShiftChange(f.manager,f.command,f.db.executor)).toEqual({status:'unavailable'});expect(await state(f)).toEqual(before);}finally{await close(f);}
});
it.each(['snapshot','availability','history','profile','operation'] as const)('private %s read denies a selected-location Manager before source lookup',async kind=>{
 const f=await setup();try{
  if(kind==='operation')expect((await executeShiftChange(f.manager,f.command,f.db.executor)).status).toBe('closed');await choose(f,'LOCATIONS');let read=false;const base=f.db.executor,ex={...base,query:async<T>(s:SqlStatement,signal?:AbortSignal)=>{if(privateSql(s))read=true;return base.query<T>(s,signal);}};
  await unavailable(()=>kind==='snapshot'?readShiftChangeSnapshot(f.manager,f.command,ex):kind==='availability'?readShiftChangeAvailability(f.manager,f.command,ex):kind==='history'?readShiftChangeHistoryView(f.manager,f.requestId,ex):kind==='profile'?readOperationalRuleProfileView(f.manager,'target',ex):readShiftChangeOperationView(f.manager,f.command.operationId,ex));expect(read).toBe(false);
 }finally{await close(f);}
});
it.each(['history','profile','availability','operation'] as const)('private %s projection rechecks original Company authority after the awaited SQL observation',async kind=>{
 const f=await setup();try{
  if(kind==='operation')expect((await executeShiftChange(f.manager,f.command,f.db.executor)).status).toBe('closed');let hit=false;const base=f.db.executor,ex={...base,query:async<T>(s:SqlStatement,signal?:AbortSignal)=>{const rows=await base.query<T>(s,signal);if(privateSql(s)&&!hit){hit=true;await choose(f,'LOCATIONS');}return rows;}};
  await unavailable(()=>kind==='history'?readShiftChangeHistory(f.manager,f.requestId,ex):kind==='profile'?readOperationalRuleProfileView(f.manager,'target',ex):kind==='availability'?readShiftChangeAvailability(f.manager,f.command,ex):findShiftChangeOperation(f.manager,f.command.operationId,ex));expect(hit).toBe(true);
 }finally{await close(f);}
});
it('a saved Manager operation cannot be replayed after restriction even after deleting its live source shift',async()=>{
 const f=await setup();try{expect((await executeShiftChange(f.manager,f.command,f.db.executor)).status).toBe('closed');await f.q("DELETE FROM shifts WHERE id='scope-source'");await choose(f,'LOCATIONS');const before=await state(f);expect(await findShiftChangeOperation(f.manager,f.command.operationId,f.db.executor)).toBeNull();expect(await executeShiftChange(f.manager,f.command,f.db.executor)).toEqual({status:'unavailable'});expect(await state(f)).toEqual(before);expect(await f.q('SELECT * FROM shift_change_operations WHERE operation_id=$1',[f.command.operationId])).toHaveLength(1);}finally{await close(f);}
});
it('the real business transaction rechecks original Company after planning and preserves the complete batch on denial',async()=>{
 const f=await setup('APPROVE_CALLOUT');try{const before=await state(f),base=f.db.executor;let hit=false;const ex={...base,transaction:async(s:readonly SqlStatement[],signal?:AbortSignal)=>{if(s.some(x=>x.text.startsWith('INSERT INTO shift_change_operations'))){hit=true;await choose(f,'LOCATIONS');}return base.transaction(s,signal);}};expect(await executeShiftChange(f.manager,f.command,ex)).toEqual({status:'unavailable'});expect(hit).toBe(true);expect(await state(f)).toEqual(before);}finally{await close(f);}
});
it('the final actual DB-clock check rolls back absence, linked coverage, receipts, events and notices after expiry',async()=>{
 const f=await setup('APPROVE_CALLOUT'),worker=new Client({connectionString:f.db.connectionString});await worker.connect();try{await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '1 second' WHERE employee_id='manager'");const before=await state(f);let hit=false;const base=f.db.executor,ex:SqlExecutor={query:base.query,transaction:async statements=>{
  if(!statements.some(s=>s.text.startsWith('INSERT INTO shift_change_operations')))return base.transaction(statements);
  await worker.query('BEGIN');try{const rows:unknown[][]=[];for(const s of statements){rows.push((await worker.query(s.text,[...s.values])).rows);if(s.text.startsWith('INSERT INTO shift_change_operations')){hit=true;await worker.query('SELECT pg_sleep(1.1)');}}await worker.query('COMMIT');return rows;}catch(error){await worker.query('ROLLBACK');throw error;}
 }};expect(await executeShiftChange(f.manager,f.command,ex)).toEqual({status:'unavailable'});expect(hit).toBe(true);expect(await state(f)).toEqual(before);}finally{await worker.end();await close(f);}
});
it('scope loss after a known commit suppresses its response without rewriting the committed receipt or history',async()=>{
 const f=await setup();try{const base=f.db.executor;let hit=false;const ex={...base,transaction:async(s:readonly SqlStatement[],signal?:AbortSignal)=>{const r=await base.transaction(s,signal);if(s.some(x=>x.text.startsWith('INSERT INTO shift_change_operations'))){hit=true;await choose(f,'LOCATIONS');}return r;}};expect(await executeShiftChange(f.manager,f.command,ex)).toEqual({status:'unavailable'});expect(hit).toBe(true);expect(await f.q('SELECT result FROM shift_change_operations WHERE operation_id=$1',[f.command.operationId])).toEqual([{result:{status:'closed',operationId:f.command.operationId,requestId:f.requestId,revision:2}}]);expect(await f.q('SELECT * FROM shift_change_events WHERE request_id=$1',[f.requestId])).toHaveLength(2);expect(await findShiftChangeOperation(f.manager,f.command.operationId,f.db.executor)).toBeNull();}finally{await close(f);}
});
it.each(['EMPLOYEE','LEAD'] as const)('%s own report, cancellation, history and operation remain identity-based while Manager scope is restricted',async role=>{
 const f=await setup();try{await f.q("UPDATE employees SET role=$1 WHERE id='target'",[role]);f.employee={...f.employee,employee:{...f.employee.employee,role}};await choose(f,'LOCATIONS');expect(await readShiftChangeTerms(f.employee,'scope-source',undefined,f.db.executor)).toBeTruthy();const command:ShiftChangeCommand={kind:'CANCEL_CALLOUT',operationId:randomUUID(),requestId:f.requestId,expectedRevision:1};const r=await executeShiftChange(f.employee,command,f.db.executor);expect(r.status).toBe('closed');expect(await executeShiftChange(f.employee,command,f.db.executor)).toEqual(r);expect(await findShiftChangeOperation(f.employee,command.operationId,f.db.executor)).toEqual(r);expect(await readShiftChangeHistoryView(f.employee,f.requestId,f.db.executor)).toHaveLength(2);expect(await readShiftChangeHistoryView(f.peer,f.requestId,f.db.executor)).toEqual([]);const fresh=await executeShiftChange(f.employee,{kind:'SUBMIT_CALLOUT',operationId:randomUUID(),...f.terms,reasonCode:'OTHER',reasonNote:'Owned current self report'},f.db.executor);expect(fresh.status).toBe('pending');}finally{await close(f);}
});
function form(command:ShiftChangeCommand){const body=new FormData();for(const [key,value] of Object.entries(command))body.set(key,String(value));return body;}
it.each(['structured','exchange','callout','reconcile'] as const)('actual %s action denies restricted Manager authority and keeps durable history',async kind=>{
 const f=await setup(kind==='exchange'?'MANAGER_DECLINE':'DECLINE_CALLOUT');try{if(kind==='reconcile')expect((await executeShiftChange(f.manager,f.command,f.db.executor)).status).toBe('closed');await choose(f,'LOCATIONS');const before=await state(f);if(kind==='structured')expect(await shiftChangeAction(form(f.command))).toEqual({status:'unavailable'});else if(kind==='reconcile')expect(await reconcileShiftChangeAction(f.command.operationId)).toBeNull();else await expect((kind==='exchange'?reviewExchangeAction:reviewCalloutAction)(form(f.command))).rejects.toMatchObject({destination:'/app/exchange?tab=requests&error=EXCHANGE_UNAVAILABLE'});expect(await state(f)).toEqual(before);}finally{await close(f);}
});
it.each(['structured','exchange','callout','reconcile'] as const)('actual %s action retains Company Manager success through the session actor',async kind=>{
 const f=await setup(kind==='exchange'?'MANAGER_DECLINE':'DECLINE_CALLOUT');try{if(kind==='reconcile'){const r=await executeShiftChange(f.manager,f.command,f.db.executor);expect(await reconcileShiftChangeAction(f.command.operationId)).toEqual(r);}else if(kind==='structured')expect((await shiftChangeAction(form(f.command))).status).toBe('closed');else await expect((kind==='exchange'?reviewExchangeAction:reviewCalloutAction)(form(f.command))).rejects.toMatchObject({destination:kind==='exchange'?'/app/exchange?tab=requests&reviewed=1':'/app/exchange?tab=requests&calloutReviewed=1'});expect(await f.q('SELECT * FROM shift_change_operations WHERE actor_employee_id=$1 AND operation_id=$2',['manager',f.command.operationId])).toHaveLength(1);}finally{await close(f);}
});
it('Company revocation committed while the real business transaction waits on its workspace lock is observed before any write',async()=>{
 const f=await setup(),blocker=new Client({connectionString:f.db.connectionString});await blocker.connect();let waiting:Promise<unknown[][]>|undefined,observed=false,entered=false;const before=await state(f);
 const held:SqlExecutor={query:async<T>(s:SqlStatement)=>(await blocker.query(s.text,[...s.values])).rows as T[],transaction:async statements=>{const rows:unknown[][]=[];for(const s of statements)rows.push((await blocker.query(s.text,[...s.values])).rows);return rows;}};
 try{const base=f.db.executor,ex={...base,transaction:async(statements:readonly SqlStatement[],signal?:AbortSignal)=>{
  if(!statements.some(s=>s.text.startsWith('INSERT INTO shift_change_operations')))return base.transaction(statements,signal);
  entered=true;await blocker.query('BEGIN');await blocker.query('SELECT id FROM workspaces WHERE singleton FOR NO KEY UPDATE');await choose(f,'REVOKE',held);
  // Attach both outcomes immediately so cleanup never leaves a rejected promise.
  waiting=base.transaction(statements,signal);const settled=waiting.then(value=>({value}),error=>({error}));
  try{for(let n=0;n<100;n++){await blocker.query('SELECT pg_stat_clear_snapshot()');const r=await blocker.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE 'SELECT id FROM workspaces%' AND pg_backend_pid()=ANY(pg_blocking_pids(pid))");if(r.rowCount){observed=true;break;}await blocker.query('SELECT pg_sleep(0.01)');}expect(observed).toBe(true);}finally{await blocker.query('COMMIT');}
  const r=await settled;if('error'in r)throw r.error;return r.value;
 }};expect(await executeShiftChange(f.manager,f.command,ex)).toEqual({status:'unavailable'});expect(entered&&observed).toBe(true);expect(await state(f)).toEqual(before);
 }finally{await blocker.query('ROLLBACK');await waiting?.catch(()=>{});await blocker.end();await close(f);}
});
it.each(['EMPLOYEE','LEAD'] as const)('stale %s proof cannot become a global history reader after promotion to an unassigned Manager',async role=>{
 const f=await setup();try{await f.q("UPDATE employees SET role=$1 WHERE id='peer'",[role]);const stale={...f.peer,employee:{...f.peer.employee,role}};expect(await readShiftChangeHistory(stale,f.requestId,f.db.executor)).toEqual([]);await f.q("UPDATE employees SET role='MANAGER' WHERE id='peer'");const before=await state(f);expect(await readShiftChangeHistory(stale,f.requestId,f.db.executor)).toEqual([]);expect(await readShiftChangeHistoryView(stale,f.requestId,f.db.executor)).toEqual([]);expect(await state(f)).toEqual(before);}finally{await close(f);}
});
