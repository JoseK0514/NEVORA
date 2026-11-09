import {expect,it,vi} from 'vitest';
import {Client} from 'pg';
import {randomUUID} from 'node:crypto';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import {companyAccessFixture} from './company-access-fixture';
import {assignOperationalScope,readOwnerOperationalScope} from '../../lib/company-access/operational-scope.server';
import {mutateTimecard,readTimecards} from '../../lib/timecards/service';
import {submitTimeCorrection,reviewTimeCorrection} from '../../lib/time-corrections/service';
import {correctionAuthority} from '../../lib/time-corrections/authority.server';
const ctx=vi.hoisted(()=>({ex:null as SqlExecutor|null,proof:null as SessionMutationProof|null}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/auth/session',()=>({getSession:async()=>ctx.proof?.employee??null,requireSessionMutationProof:async()=>ctx.proof}));
vi.mock('@/lib/db',()=>{
 const statement=(text:string,values:readonly unknown[]=[])=>({statement:{text,values},then:(yes:(rows:unknown[])=>unknown,no:(error:unknown)=>unknown)=>ctx.ex!.query({text,values}).then(yes,no)});
 const tagged=Object.assign((strings:TemplateStringsArray,...values:unknown[])=>statement(strings.reduce((text,part,i)=>text+(i?'$'+i:'')+part,''),values),{query:statement,transaction:(queries:{statement:SqlStatement}[])=>ctx.ex!.transaction(queries.map(q=>q.statement))});return {getDb:()=>tagged,queryRows:(rows:unknown)=>rows};
});
import {POST as timecardPOST} from '../../app/api/manager/timecards/route';
import {POST as correctionPOST} from '../../app/api/manager/time-corrections/route';
const period={startDate:'2026-09-21',endDate:'2026-09-27'};
type Fixture=Awaited<ReturnType<typeof setup>>;
async function choose(f:Awaited<ReturnType<typeof companyAccessFixture>>,mode:'COMPANY'|'LOCATIONS'|'REVOKE'){
 const v=await readOwnerOperationalScope(f.owner,'manager',f.db.executor);if(v.state!=='ready')throw Error('Owner context');const c=v.data.current;
 const base={operationId:randomUUID(),expectedEmployeeVersion:c.employeeUpdatedAt,expectedRoleGeneration:c.roleGeneration,expectedScopeRevision:c.scopeRevision};
 expect((await assignOperationalScope(f.owner,'manager',mode==='REVOKE'?{...base,action:'REVOKE'}:{...base,action:'ASSIGN',scope:mode==='COMPANY'?{mode,locationIds:[]}:{mode,locationIds:['loc-1']}},f.db.executor)).state).toBe('saved');
}
async function setup(){const f=await companyAccessFixture();ctx.ex=f.db.executor;ctx.proof=f.manager;try{
 await f.q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('review-private-b','Private B','Employee','NONE','EMPLOYEE','loc-2');
 INSERT INTO employee_location_eligibility VALUES('target','loc-1'),('target','loc-2');
 INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),'target',clock_timestamp()+interval '1 hour');
 INSERT INTO clocker_devices(id,location_id,name) VALUES('review-device-b','loc-2','Owned B');
 INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status) VALUES('review-entry-b','review-private-b','loc-2','review-device-b','2026-09-22T12:00:00Z','2026-09-22T20:00:00Z','CLOCKED_OUT')`);
 const employee:SessionMutationProof={...f.manager,employee:{...f.manager.employee,id:'target',role:'EMPLOYEE'},sessionTokenHash:'d'.repeat(64)};
 const pending=await submitTimeCorrection(employee,{operationId:randomUUID(),kind:'MISSING_ENTRY',locationId:'loc-2',proposedStartAt:'2026-09-23T12:00:00Z',proposedEndAt:'2026-09-23T13:00:00Z',reason:'Owned correction at B'},f.db.executor);if(pending.status!=='pending')throw Error('Expected real pending request');
 const view=await readTimecards(f.manager,period,f.db.executor);if(view.state!=='ready')throw Error('Expected canonical source');const card=view.cards.find(c=>c.card.employeeId==='review-private-b')!;
 return {...f,timecard:{...period,operationId:randomUUID(),employeeId:'review-private-b',expectedRevision:card.revision,expectedSourceHash:card.sourceHash,action:'APPROVE' as const},correction:{operationId:randomUUID(),requestId:pending.requestId,expectedRevision:pending.revision,decision:'APPROVE' as const}};
 }catch(error){await f.db.dispose();throw error;}}
async function close(f:Fixture){ctx.ex=null;ctx.proof=null;vi.unstubAllEnvs();await f.db.dispose();}
const cases=[
 {name:'timecard approval',call:'nevora_timecard_command',run:(f:Fixture,p:SessionMutationProof,ex:SqlExecutor)=>mutateTimecard(p,f.timecard,ex)},
 {name:'correction review',call:'nevora_review_time_correction',run:(f:Fixture,p:SessionMutationProof,ex:SqlExecutor)=>reviewTimeCorrection(p,f.correction,ex)},
];
async function snapshot(f:Fixture){return f.q(`SELECT jsonb_build_object('cards',(SELECT jsonb_agg(to_jsonb(t) ORDER BY operation_id) FROM timecard_revisions t),'events',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM time_correction_events t),'adjustments',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM time_correction_adjustments t),'requests',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM time_correction_requests t),'raw',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM time_entries t)) AS state`);}
it.each(cases)('$name denies selected-location authority and preserves all revisions, raw time and adjustment history',async test=>{
 const f=await setup();try{await choose(f,'LOCATIONS');const before=await snapshot(f);expect(await test.run(f,f.manager,f.db.executor)).toEqual({status:'unavailable'});expect(await snapshot(f)).toEqual(before);}finally{await close(f);}
});
it.each(cases.flatMap(test=>['Owner','Company Manager'].map(role=>({...test,role}))))('$name permits current $role exactly once and preserves its replay receipt',async test=>{
 const f=await setup();try{
  const p=test.role==='Owner'?f.owner:f.manager;const before=await snapshot(f);const result=await test.run(f,p,f.db.executor);expect(result).toMatchObject({status:'approved',revision:test.name==='correction review'?2:1});expect(await snapshot(f)).not.toEqual(before);
  const committed=await snapshot(f);expect(await test.run(f,p,f.db.executor)).toEqual(result);expect(await snapshot(f)).toEqual(committed);
  if(test.name==='timecard approval')expect(await f.q("SELECT employee_id,action FROM timecard_revisions")).toEqual([{employee_id:'review-private-b',action:'APPROVE'}]);
  else expect(await f.q("SELECT employee_id,location_id FROM time_correction_adjustments")).toEqual([{employee_id:'target',location_id:'loc-2'}]);
 }finally{await close(f);}
});
it.each(cases)('$name rechecks Company after admission and rolls back the actual business batch',async test=>{
 const f=await setup();try{
  const before=await snapshot(f),base=f.db.executor;let reached=false;
  const ex={...base,transaction:async(statements:readonly SqlStatement[],signal?:AbortSignal)=>{if(statements.some(s=>s.text.includes(test.call))){reached=true;await choose(f,'LOCATIONS');}return base.transaction(statements,signal);}};
  expect(await test.run(f,f.manager,ex)).toEqual({status:'unavailable'});expect(reached).toBe(true);expect(await snapshot(f)).toEqual(before);
 }finally{await close(f);}
});
it.each(cases)('$name historical receipt is inaccessible after restriction while the committed history is preserved',async test=>{
 const f=await setup();try{
  expect((await test.run(f,f.manager,f.db.executor)).status).toBe('approved');const committed=await snapshot(f);await choose(f,'LOCATIONS');expect(await test.run(f,f.manager,f.db.executor)).toEqual({status:'unavailable'});expect(await snapshot(f)).toEqual(committed);
 }finally{await close(f);}
});
it.each(['revoked','role cycle','unassigned'] as const)('both time-review protocols deny current %s access without business effects',async kind=>{
 const f=await setup();try{
  if(kind==='revoked')await choose(f,'REVOKE');else if(kind==='role cycle')await f.q("UPDATE employees SET role='EMPLOYEE' WHERE id='manager';UPDATE employees SET role='MANAGER' WHERE id='manager'");
  else{await f.q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('review-new','New','Manager','NONE','MANAGER','loc-1');INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('c',64),'review-new',clock_timestamp()+interval '1 hour')");ctx.proof={...f.manager,employee:{...f.manager.employee,id:'review-new'},sessionTokenHash:'c'.repeat(64)};}
  const before=await snapshot(f);for(const test of cases)expect(await test.run(f,ctx.proof!,f.db.executor)).toEqual({status:'unavailable'});expect(await snapshot(f)).toEqual(before);
 }finally{await close(f);}
});
it.each(['timecard','correction'] as const)('actual %s review API cannot bypass Company using valid B commands and intent bindings',async kind=>{
 const f=await setup();try{
  await choose(f,'LOCATIONS');vi.stubEnv('FUEL_PORTAL_ORIGIN','http://127.0.0.1');const before=await snapshot(f);
  const request=(path:string,body:unknown,header:string)=>new Request('http://127.0.0.1'+path,{method:'POST',headers:{[header]:'1','x-nevora-actor':'manager','x-nevora-correction-authority':correctionAuthority(f.manager),'content-type':'application/json',origin:'http://127.0.0.1'},body:JSON.stringify(body)});
  const response=kind==='timecard'?await timecardPOST(request('/api/manager/timecards',f.timecard,'x-nevora-timecards')):await correctionPOST(request('/api/manager/time-corrections',f.correction,'x-nevora-time-correction'));
  expect(response.status).toBe(503);expect(await response.json()).toEqual(kind==='timecard'?{status:'unavailable'}:{state:'unavailable'});expect(await snapshot(f)).toEqual(before);
 }finally{await close(f);}
});

it.each(cases)('$name expires after actual business writes and its final DB-clock guard rolls back receipts and revisions',async test=>{
 const f=await setup();const worker=new Client({connectionString:f.db.connectionString});await worker.connect();try{
  await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '1 second' WHERE employee_id='manager'");const before=await snapshot(f);let reached=false;
  const ex:SqlExecutor={query:f.db.executor.query,transaction:async statements=>{
   await worker.query('BEGIN');try{const rows:unknown[][]=[];for(const statement of statements){const result=await worker.query(statement.text,[...statement.values]);rows.push(result.rows);if(statement.text.includes(test.call)){reached=true;await worker.query('SELECT pg_sleep(1.1)');}}await worker.query('COMMIT');return rows;}catch(error){await worker.query('ROLLBACK');throw error;}
  }};
  expect(await test.run(f,f.manager,ex)).toEqual({status:'unavailable'});expect(reached).toBe(true);expect(await snapshot(f)).toEqual(before);
 }finally{await worker.end();await close(f);}
});
it.each(['timecard','correction'] as const)('actual %s review API permits current Company and replays the same committed receipt',async kind=>{
 const f=await setup();try{
  vi.stubEnv('FUEL_PORTAL_ORIGIN','http://127.0.0.1');
  const send=()=>{const request=new Request('http://127.0.0.1'+(kind==='timecard'?'/api/manager/timecards':'/api/manager/time-corrections'),{method:'POST',headers:{[kind==='timecard'?'x-nevora-timecards':'x-nevora-time-correction']:'1','x-nevora-actor':'manager','x-nevora-correction-authority':correctionAuthority(f.manager),'content-type':'application/json',origin:'http://127.0.0.1'},body:JSON.stringify(kind==='timecard'?f.timecard:f.correction)});return kind==='timecard'?timecardPOST(request):correctionPOST(request);};
  const first=await send();expect(first.status).toBe(200);const body=await first.json();expect(body[kind==='timecard'?'status':'state']).toBe('approved');expect(first.headers.get('cache-control')).toContain('no-store');const committed=await snapshot(f);
  const replay=await send();expect(replay.status).toBe(200);expect(await replay.json()).toEqual(body);expect(await snapshot(f)).toEqual(committed);
 }finally{await close(f);}
});
