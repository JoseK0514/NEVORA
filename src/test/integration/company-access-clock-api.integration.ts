import {it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import {companyAccessFixture} from './company-access-fixture';
import {readOwnerOperationalScope,assignOperationalScope} from '../../lib/company-access/operational-scope.server';
const ctx=vi.hoisted(()=>({ex:null as SqlExecutor|null,proof:null as SessionMutationProof|null}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/auth/session',()=>({getSession:async()=>ctx.proof?.employee??null,requireSessionMutationProof:async()=>ctx.proof}));
vi.mock('@/lib/auth/permissions',()=>({MANAGER_ROLES:['OWNER','MANAGER'],requireRoles:async()=>ctx.proof!.employee}));
vi.mock('@/lib/db',()=>{
 const statement=(text:string,values:readonly unknown[]=[])=>({statement:{text,values},then:(yes:(rows:unknown[])=>unknown,no:(error:unknown)=>unknown)=>ctx.ex!.query({text,values}).then(yes,no)});
 const tagged=Object.assign((strings:TemplateStringsArray,...values:unknown[])=>statement(strings.reduce((text,part,i)=>text+(i?'$'+i:'')+part,''),values),{query:statement,transaction:(queries:{statement:SqlStatement}[])=>ctx.ex!.transaction(queries.map(q=>q.statement))});return {getDb:()=>tagged,queryRows:(rows:unknown)=>rows};
});
import {GET} from '../../app/api/manager/clock-monitor/route';
type Fixture=Awaited<ReturnType<typeof setup>>;
async function choose(f:Awaited<ReturnType<typeof companyAccessFixture>>,action:'ASSIGN'|'REVOKE'){
 const v=await readOwnerOperationalScope(f.owner,'manager',f.db.executor);if(v.state!=='ready')throw Error('Owner context');const c=v.data.current;
 const base={operationId:randomUUID(),expectedEmployeeVersion:c.employeeUpdatedAt,expectedRoleGeneration:c.roleGeneration,expectedScopeRevision:c.scopeRevision};
 expect((await assignOperationalScope(f.owner,'manager',action==='REVOKE'?{...base,action}:{...base,action,scope:{mode:'LOCATIONS',locationIds:['loc-1']}},f.db.executor)).state).toBe('saved');
}
async function setup(){const f=await companyAccessFixture();ctx.ex=f.db.executor;ctx.proof=f.manager;try{
 await f.q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('api-private-b','Private B','Clock','NONE','EMPLOYEE','loc-2');
  INSERT INTO clocker_devices(id,location_id,name,active) VALUES('api-device-a','loc-1','Owned A',false),('api-device-b','loc-2','Owned B',true);
  INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status) VALUES('api-open-a','target','loc-1','api-device-a',clock_timestamp()-interval '1 hour','CLOCKED_IN'),('api-open-b','api-private-b','loc-2','api-device-b',clock_timestamp()-interval '1 hour','CLOCKED_IN');
  UPDATE employees SET active=false WHERE id='target'`);await choose(f,'ASSIGN');return f;
 }catch(e){await f.db.dispose();throw e;}}
async function close(f:Fixture){ctx.ex=null;ctx.proof=null;await f.db.dispose();}
const request=(query='')=>new Request('http://127.0.0.1/api/manager/clock-monitor'+query,{headers:{'x-nevora-monitor':'1'}});
it('normal monitor GET exposes only actual A activity with a finite scoped observation and keeps inactive open records',async()=>{
 const f=await setup();try{
  const response=await GET(request());expect(response.status).toBe(200);const body=await response.json();expect(body.state).toBe('ready');expect(body.employees.map((e:{timeEntryId:string})=>e.timeEntryId)).toEqual(['api-open-a']);
  expect(body.validForMs).toBeGreaterThan(0);expect(body.validForMs).toBeLessThanOrEqual(15000);expect(JSON.stringify(body)).not.toMatch(/Private B|api-open-b|api-private-b/);expect(body).not.toHaveProperty('data');expect(body).not.toHaveProperty('authority');
  expect(response.headers.get('cache-control')).toMatch(/no-store.*private/);expect(response.headers.get('vary')).toContain('Cookie');expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  ctx.proof=f.owner;const company=await GET(request());expect(company.status).toBe(200);expect((await company.json()).employees.map((e:{timeEntryId:string})=>e.timeEntryId).sort()).toEqual(['api-open-a','api-open-b']);
 }finally{await close(f);}
});
it.each(['unassigned','revoked','role cycle'] as const)('normal monitor GET denies current %s access without an activity/count body',async kind=>{
 const f=await setup();try{
  if(kind==='revoked')await choose(f,'REVOKE');else if(kind==='role cycle')await f.q("UPDATE employees SET role='EMPLOYEE' WHERE id='manager';UPDATE employees SET role='MANAGER' WHERE id='manager'");
  else{await f.q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('api-new','New','Manager','NONE','MANAGER','loc-1');INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('c',64),'api-new',clock_timestamp()+interval '1 hour')");ctx.proof={...f.manager,employee:{...f.manager.employee,id:'api-new'},sessionTokenHash:'c'.repeat(64)};}
  const response=await GET(request());expect(response.status).toBe(403);expect(await response.json()).toEqual({state:'unavailable',reason:'access_denied'});
 }finally{await close(f);}
});
it('normal monitor GET suppresses an already fetched snapshot when scope is revoked before return',async()=>{
 const f=await setup();try{
  let retired=false;const base=f.db.executor;const retire=async()=>{if(!retired){retired=true;await choose(f,'REVOKE');}};
  ctx.ex={...base,query:async<T>(s:SqlStatement,signal?:AbortSignal)=>{const rows=await base.query<T>(s,signal);if(s.text.includes(' AS snapshot'))await retire();return rows;},transaction:async(statements,signal)=>{const rows=await base.transaction(statements,signal);if(statements.some(s=>s.text.includes(' AS snapshot')))await retire();return rows;}};
  const response=await GET(request());expect(retired).toBe(true);expect(response.status).toBe(403);expect(await response.json()).toEqual({state:'unavailable',reason:'access_denied'});
 }finally{await close(f);}
});
it('monitor query selectors cannot override scope and invalid queries return no activity',async()=>{
 const f=await setup();try{const response=await GET(request('?locationId=loc-2'));expect(response.status).toBe(400);expect(await response.json()).toEqual({state:'unavailable',reason:'access_denied'});}finally{await close(f);}
});
