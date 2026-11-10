import {expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {Client} from 'pg';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import {companyAccessFixture} from './company-access-fixture';
import {assignOperationalScope,readOwnerOperationalScope,isOperationalAuthorizationError} from '../../lib/company-access/operational-scope.server';
import {isManagementAuthorizationError} from '../../lib/data/management-session';
import {createTimeOffRequest,reviewTimeOffRequest,withdrawTimeOffRequest,getTimeOffRequest} from '../../lib/data/requests';
import {commitRequestTransition,requestSnapshot} from '../../lib/data/request-notifications';
import {withdrawalIdentity} from '../../lib/time-off-withdrawal';
const ctx=vi.hoisted(()=>({ex:null as SqlExecutor|null,proof:null as SessionMutationProof|null}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>ctx.proof}));
vi.mock('@/lib/auth/permissions',()=>({TIME_OFF_REVIEW_ROLES:['OWNER','MANAGER'],requireRoles:async()=>ctx.proof!.employee,requireSelfService:async()=>ctx.proof!.employee}));
vi.mock('next/navigation',()=>({redirect:(destination:string)=>{throw Object.assign(new Error('Owned redirect'),{destination});}}));
vi.mock('next/cache',()=>({revalidatePath:()=>{}}));
vi.mock('@/lib/db',()=>{
 const statement=(text:string,values:readonly unknown[]=[])=>({statement:{text,values},then:(yes:(rows:unknown[])=>unknown,no:(error:unknown)=>unknown)=>ctx.ex!.query({text,values}).then(yes,no)});
 const tagged=Object.assign((strings:TemplateStringsArray,...values:unknown[])=>statement(strings.reduce((text,part,i)=>text+(i?'$'+i:'')+part,''),values),{query:statement,transaction:(queries:{statement:SqlStatement}[])=>ctx.ex!.transaction(queries.map(q=>q.statement))});return {getDb:()=>tagged,queryRows:(rows:unknown)=>rows};
});
import {reviewTimeOffAction} from '../../app/app/requests/actions';
type Fixture=Awaited<ReturnType<typeof setup>>;
async function choose(f:Awaited<ReturnType<typeof companyAccessFixture>>,mode:'COMPANY'|'LOCATIONS'|'REVOKE'){
 const v=await readOwnerOperationalScope(f.owner,'manager',f.db.executor);if(v.state!=='ready')throw Error('Owner context');const c=v.data.current;
 const base={operationId:randomUUID(),expectedEmployeeVersion:c.employeeUpdatedAt,expectedRoleGeneration:c.roleGeneration,expectedScopeRevision:c.scopeRevision};
 expect((await assignOperationalScope(f.owner,'manager',mode==='REVOKE'?{...base,action:'REVOKE'}:{...base,action:'ASSIGN',scope:mode==='COMPANY'?{mode,locationIds:[]}:{mode,locationIds:['loc-1']}},f.db.executor)).state).toBe('saved');
}
async function setup(){const f=await companyAccessFixture();ctx.ex=f.db.executor;ctx.proof=f.manager;try{
 await f.q("INSERT INTO employee_location_eligibility VALUES('target','loc-1'),('target','loc-2');INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),'target',clock_timestamp()+interval '1 hour')");
 const employee:SessionMutationProof={...f.manager,employee:{...f.manager.employee,id:'target',role:'EMPLOYEE'},sessionTokenHash:'d'.repeat(64)},requestId=randomUUID();
 await createTimeOffRequest({requestId,employeeId:'target',proof:employee,startDate:'2030-10-21',endDate:'2030-10-22',reason:'Owned private request'},f.db.executor);
 return {...f,employee,requestId};
 }catch(error){await f.db.dispose();throw error;}}
async function close(f:Fixture){ctx.ex=null;ctx.proof=null;await f.db.dispose();}
const command=(f:Fixture,p=f.manager,id=f.requestId)=>({requestId:id,managerId:p.employee.id,proof:p,status:'APPROVED' as const});
async function snapshot(f:Fixture){return f.q(`SELECT jsonb_build_object('requests',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM time_off_requests t),'notifications',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM notifications t),'deliveries',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM push_deliveries t)) AS state`);}
async function denied(work:()=>Promise<unknown>){let error:unknown;try{await work();}catch(e){error=e;}expect(isOperationalAuthorizationError(error)||isManagementAuthorizationError(error)).toBe(true);}
it.each(['pending','absent','terminal'] as const)('team review denies selected-location access before reading a private %s request',async kind=>{
 const f=await setup();try{
  if(kind==='terminal')expect(await reviewTimeOffRequest(command(f),f.db.executor)).toBe(true);await choose(f,'LOCATIONS');const before=await snapshot(f);let read=false;const base=f.db.executor,ex={...base,query:async<T>(s:SqlStatement,signal?:AbortSignal)=>{if(s.text.includes('SELECT * FROM time_off_requests WHERE id='))read=true;return base.query<T>(s,signal);}};
  await denied(()=>reviewTimeOffRequest(command(f,f.manager,kind==='absent'?randomUUID():f.requestId),ex));expect(read).toBe(false);expect(await snapshot(f)).toEqual(before);
 }finally{await close(f);}
});
it('custom terminal transition cannot bypass Company with a valid stored before/after snapshot',async()=>{
 const f=await setup();try{
  const before=await getTimeOffRequest(f.requestId,f.db.executor);if(!before)throw Error('Owned request');await choose(f,'LOCATIONS');const state=await snapshot(f);
  await denied(()=>commitRequestTransition({before:requestSnapshot('TIME_OFF',before),after:requestSnapshot('TIME_OFF',{...before,status:'DENIED'}),actorEmployeeId:'manager',managementProof:f.manager,mutation:{text:"UPDATE time_off_requests SET status='DENIED',reviewed_by=$2,reviewed_at=clock_timestamp() WHERE id=$1 AND status='PENDING' RETURNING id",values:[f.requestId,'manager']}},f.db.executor));expect(await snapshot(f)).toEqual(state);
 }finally{await close(f);}
});
it.each(['Owner','Company Manager'] as const)('current %s makes one terminal decision and keeps the repeat a no-op',async role=>{
 const f=await setup();try{const p=role==='Owner'?f.owner:f.manager;expect(await reviewTimeOffRequest(command(f,p),f.db.executor)).toBe(true);expect(await f.q('SELECT status,reviewed_by FROM time_off_requests WHERE id=$1',[f.requestId])).toEqual([{status:'APPROVED',reviewed_by:p.employee.id}]);const after=await snapshot(f);expect(await reviewTimeOffRequest(command(f,p),f.db.executor)).toBe(false);expect(await snapshot(f)).toEqual(after);}finally{await close(f);}
});
it.each(['unassigned','revoked','role cycle'] as const)('team review denies current %s Manager without new decisions, cancellations or intents',async kind=>{
 const f=await setup();try{
  if(kind==='revoked')await choose(f,'REVOKE');else if(kind==='role cycle')await f.q("UPDATE employees SET role='EMPLOYEE' WHERE id='manager';UPDATE employees SET role='MANAGER' WHERE id='manager'");
  else{await f.q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('timeoff-new','New','Manager','NONE','MANAGER','loc-1');INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('c',64),'timeoff-new',clock_timestamp()+interval '1 hour')");f.manager={...f.manager,employee:{...f.manager.employee,id:'timeoff-new'},sessionTokenHash:'c'.repeat(64)};}
  const before=await snapshot(f);await denied(()=>reviewTimeOffRequest(command(f),f.db.executor));expect(await snapshot(f)).toEqual(before);
 }finally{await close(f);}
});
it('team decision rechecks Company after admission and rolls back the real decision/cancellation/intents batch',async()=>{
 const f=await setup();try{const before=await snapshot(f),base=f.db.executor;let reached=false;const ex={...base,transaction:async(statements:readonly SqlStatement[],signal?:AbortSignal)=>{if(statements.some(s=>s.text.includes('UPDATE time_off_requests SET status'))){reached=true;await choose(f,'LOCATIONS');}return base.transaction(statements,signal);}};await denied(()=>reviewTimeOffRequest(command(f),ex));expect(reached).toBe(true);expect(await snapshot(f)).toEqual(before);}finally{await close(f);}
});
it('team decision expires after actual writes and the final DB-clock guard rolls back all related records',async()=>{
 const f=await setup(),worker=new Client({connectionString:f.db.connectionString});await worker.connect();try{
  await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '1 second' WHERE employee_id='manager'");const before=await snapshot(f);let reached=false;
  const ex:SqlExecutor={query:f.db.executor.query,transaction:async statements=>{await worker.query('BEGIN');try{const rows:unknown[][]=[];for(const s of statements){const result=await worker.query(s.text,[...s.values]);rows.push(result.rows);if(s.text.includes('UPDATE time_off_requests SET status')){reached=true;await worker.query('SELECT pg_sleep(1.1)');}}await worker.query('COMMIT');return rows;}catch(error){await worker.query('ROLLBACK');throw error;}}};
  await denied(()=>reviewTimeOffRequest(command(f),ex));expect(reached).toBe(true);expect(await snapshot(f)).toEqual(before);
 }finally{await worker.end();await close(f);}
});
const form=(f:Fixture)=>{const body=new FormData();body.set('requestId',f.requestId);body.set('decision','APPROVED');body.set('managerId','owner');return body;};
it('normal time-off review action denies a scoped Manager with a generic review redirect and no writes',async()=>{const f=await setup();try{await choose(f,'LOCATIONS');const before=await snapshot(f);await expect(reviewTimeOffAction(form(f))).rejects.toMatchObject({destination:'/app/requests?tab=team&error=review'});expect(await snapshot(f)).toEqual(before);}finally{await close(f);}});
it.each([{decision:'APPROVED',code:'timeoff-approved'},{decision:'DENIED',code:'timeoff-declined'}] as const)('normal Company $decision action retains its session actor and exact known-decision redirect',async({decision,code})=>{
 const f=await setup();try{const body=form(f);body.set('decision',decision);
  await expect(reviewTimeOffAction(body)).rejects.toMatchObject({destination:'/app/requests?tab=pending&reviewed=1&decided='+code});
  expect(await f.q('SELECT status,reviewed_by FROM time_off_requests WHERE id=$1',[f.requestId])).toEqual([{status:decision,reviewed_by:'manager'}]);
 }finally{await close(f);}
});
it.each(['EMPLOYEE','LEAD'] as const)('%s own submission/withdrawal/replay remains identity-based after Manager restriction',async role=>{
 const f=await setup();try{await f.q('UPDATE employees SET role=$1 WHERE id=\'target\'',[role]);f.employee={...f.employee,employee:{...f.employee.employee,role}};await choose(f,'LOCATIONS');const ownRequest=randomUUID();await createTimeOffRequest({requestId:ownRequest,employeeId:'target',proof:f.employee,startDate:'2030-11-04',endDate:'2030-11-05',reason:'Owned self-service submission after restriction'},f.db.executor);const input={requestId:ownRequest,operationId:withdrawalIdentity(ownRequest),employeeId:'target',proof:f.employee};const receipt=await withdrawTimeOffRequest(input,f.db.executor);expect(receipt).toMatchObject({requestId:ownRequest,status:'CANCELLED',reviewedBy:'target'});const before=await snapshot(f);expect(await withdrawTimeOffRequest(input,f.db.executor)).toEqual(receipt);expect(await snapshot(f)).toEqual(before);}finally{await close(f);}
});
