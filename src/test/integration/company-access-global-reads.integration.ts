import {expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import {companyAccessFixture} from './company-access-fixture';
import {assignOperationalScope,readOwnerOperationalScope} from '../../lib/company-access/operational-scope.server';
import {readAttendanceReview} from '../../lib/data/attendance-review.server';
import {readManagerTimeCorrections} from '../../lib/data/time-corrections.server';
import {readReports} from '../../lib/reports/service';
import {readActionCenter} from '../../lib/action-center/service';
import {readTimecards} from '../../lib/timecards/service';
import {readAttendancePolicies} from '../../lib/business-improvements/attendance-policy/service';
const ctx=vi.hoisted(()=>({ex:null as SqlExecutor|null,proof:null as SessionMutationProof|null}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/auth/session',()=>({getSession:async()=>ctx.proof?.employee??null,requireSessionMutationProof:async()=>ctx.proof}));
vi.mock('@/lib/auth/permissions',()=>({MANAGER_ROLES:['OWNER','MANAGER'],requireRoles:async()=>ctx.proof!.employee}));
vi.mock('@/lib/db',()=>{
 const statement=(text:string,values:readonly unknown[]=[])=>({statement:{text,values},then:(yes:(rows:unknown[])=>unknown,no:(error:unknown)=>unknown)=>ctx.ex!.query({text,values}).then(yes,no)});
 const tagged=Object.assign((strings:TemplateStringsArray,...values:unknown[])=>statement(strings.reduce((text,part,i)=>text+(i?'$'+i:'')+part,''),values),{query:statement,transaction:(queries:{statement:SqlStatement}[])=>ctx.ex!.transaction(queries.map(q=>q.statement))});
 return {getDb:()=>tagged,queryRows:(rows:unknown)=>rows};
});
import {GET as attendanceGET} from '../../app/api/manager/attendance/route';
import {GET as correctionsGET} from '../../app/api/manager/time-corrections/route';
import {POST as reportsPOST} from '../../app/api/reports/route';
import {POST as reportsExportPOST} from '../../app/api/reports/export/route';
import {POST as actionCenterPOST} from '../../app/api/manager/action-center/route';
import {POST as timecardsPOST} from '../../app/api/timecards/route';
const period={startDate:'2026-10-12',endDate:'2026-10-18'};
type Fixture=Awaited<ReturnType<typeof setup>>;
async function choose(f:Awaited<ReturnType<typeof companyAccessFixture>>,mode:'COMPANY'|'LOCATIONS'|'REVOKE'){
 const v=await readOwnerOperationalScope(f.owner,'manager',f.db.executor);if(v.state!=='ready')throw Error('Owner context');const c=v.data.current;
 const base={operationId:randomUUID(),expectedEmployeeVersion:c.employeeUpdatedAt,expectedRoleGeneration:c.roleGeneration,expectedScopeRevision:c.scopeRevision};
 expect((await assignOperationalScope(f.owner,'manager',mode==='REVOKE'?{...base,action:'REVOKE'}:{...base,action:'ASSIGN',scope:mode==='COMPANY'?{mode,locationIds:[]}:{mode,locationIds:['loc-1']}},f.db.executor)).state).toBe('saved');
}
async function setup(){const f=await companyAccessFixture();ctx.ex=f.db.executor;ctx.proof=f.manager;try{
 await f.q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('global-private-b','Private B','Employee','NONE','EMPLOYEE','loc-2');
 INSERT INTO clocker_devices(id,location_id,name) VALUES('global-device-a','loc-1','Owned A'),('global-device-b','loc-2','Owned B');
 INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status) VALUES
 ('global-entry-a','target','loc-1','global-device-a','2026-10-13T12:00:00Z','2026-10-13T20:00:00Z','CLOCKED_OUT'),
 ('global-entry-b','global-private-b','loc-2','global-device-b','2026-10-13T12:00:00Z','2026-10-13T20:00:00Z','CLOCKED_OUT');
 INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),'target',clock_timestamp()+interval '1 hour')`);
 await choose(f,'LOCATIONS');return f;
 }catch(error){await f.db.dispose();throw error;}}
async function close(f:Fixture){ctx.ex=null;ctx.proof=null;vi.unstubAllEnvs();await f.db.dispose();}
const reads=[
 {name:'attendance',run:(p:SessionMutationProof,ex:SqlExecutor)=>readAttendanceReview(p,ex)},
 {name:'corrections',run:(p:SessionMutationProof,ex:SqlExecutor)=>readManagerTimeCorrections(p,ex)},
 {name:'reports',run:(p:SessionMutationProof,ex:SqlExecutor)=>readReports(p,period,ex)},
 {name:'action center',run:(p:SessionMutationProof,ex:SqlExecutor)=>readActionCenter(p,period.startDate,ex,async()=>[])},
 {name:'attendance policy observation',run:(p:SessionMutationProof,ex:SqlExecutor)=>readAttendancePolicies(p,ex)},
];
it.each(reads)('$name denies a selected-location Manager without exposing global payloads or creating observations',async test=>{
 const f=await setup();try{
  const before=await f.q('SELECT id,payload FROM attendance_policy_observations ORDER BY id');
  expect(await test.run(f.manager,f.db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
  expect(await f.q('SELECT id,payload FROM attendance_policy_observations ORDER BY id')).toEqual(before);
 }finally{await close(f);}
});
it('current Company and Owner global reads preserve complete B data with finite observations',async()=>{
 const f=await setup();try{
  await choose(f,'COMPANY');
  for(const proof of [f.owner,f.manager])for(const test of reads){
   const value=await test.run(proof,f.db.executor);expect(value.state,test.name).toBe('ready');if(value.state!=='ready')throw Error('Expected ready '+test.name);
   expect(value.validForMs,test.name).toBeGreaterThan(0);expect(value.validForMs,test.name).toBeLessThanOrEqual(15000);
   if(test.name==='reports')expect(JSON.stringify(value)).toContain('global-entry-b');
   if(test.name==='action center')expect(JSON.stringify(value)).toContain('global-private-b');
  }
 }finally{await close(f);}
});
it.each(['unassigned','revoked','role cycle'] as const)('global read services deny current %s Manager authority',async kind=>{
 const f=await setup();try{
  if(kind==='revoked')await choose(f,'REVOKE');else if(kind==='role cycle')await f.q("UPDATE employees SET role='EMPLOYEE' WHERE id='manager';UPDATE employees SET role='MANAGER' WHERE id='manager'");
  else{await f.q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('global-new','New','Manager','NONE','MANAGER','loc-1');INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('c',64),'global-new',clock_timestamp()+interval '1 hour')");ctx.proof={...f.manager,employee:{...f.manager.employee,id:'global-new'},sessionTokenHash:'c'.repeat(64)};}
  for(const test of reads)expect(await test.run(ctx.proof!,f.db.executor),test.name).toEqual({state:'unavailable',reason:'access_denied'});
 }finally{await close(f);}
});
const post=(path:string,header:string,body:unknown)=>new Request('http://127.0.0.1'+path,{method:'POST',headers:{[header]:'1','x-nevora-actor':ctx.proof!.employee.id,'content-type':'application/json',origin:'http://127.0.0.1'},body:JSON.stringify(body)});
const apiReads=[
 {name:'report POST',run:()=>reportsPOST(post('/api/reports','x-nevora-reports',period))},
 {name:'report CSV export',run:()=>reportsExportPOST(post('/api/reports/export','x-nevora-reports',period))},
 {name:'action center POST',run:()=>actionCenterPOST(post('/api/manager/action-center','x-nevora-action-center',{weekStart:period.startDate}))},
 {name:'attendance GET',run:()=>attendanceGET(new Request('http://127.0.0.1/api/manager/attendance',{headers:{'x-nevora-attendance':'1'}}))},
 {name:'attendance policy GET',run:()=>attendanceGET(new Request('http://127.0.0.1/api/manager/attendance?policies=1',{headers:{'x-nevora-attendance':'1'}}))},
 {name:'corrections GET',run:()=>correctionsGET(new Request('http://127.0.0.1/api/manager/time-corrections',{headers:{'x-nevora-time-correction':'1'}}))},
 {name:'manager timecards POST',run:()=>timecardsPOST(new Request('http://127.0.0.1/api/timecards',{method:'POST',headers:{'x-nevora-timecards':'1','x-nevora-actor':ctx.proof!.employee.id,'content-type':'application/json',origin:'http://127.0.0.1'},body:JSON.stringify(period)}))},
];
it.each(apiReads)('$name enforces Company at the actual API boundary',async test=>{
 const f=await setup();try{vi.stubEnv('FUEL_PORTAL_ORIGIN','http://127.0.0.1');const response=await test.run();expect(response.status).toBe(403);expect(await response.json()).toEqual({state:'unavailable',reason:'access_denied'});expect(response.headers.get('cache-control')).toContain('no-store');}finally{await close(f);}
});
it.each(['EMPLOYEE','LEAD'] as const)('mixed timecards API preserves %s own source and canonical complete manager source stays unfiltered',async role=>{
 const f=await setup();try{
  const canonical=await readTimecards(f.manager,period,f.db.executor);expect(canonical.state).toBe('ready');if(canonical.state!=='ready')throw Error('Canonical source unavailable');expect(canonical.cards.some(c=>c.card.employeeId==='global-private-b')).toBe(true);
  await f.q('UPDATE employees SET role=$1 WHERE id=\'target\'',[role]);ctx.proof={...f.manager,employee:{...f.manager.employee,id:'target',role},sessionTokenHash:'d'.repeat(64)};
  vi.stubEnv('FUEL_PORTAL_ORIGIN','http://127.0.0.1');const response=await apiReads.find(t=>t.name==='manager timecards POST')!.run();expect(response.status).toBe(200);const body=await response.json();expect(body.cards.map((c:{card:{employeeId:string}})=>c.card.employeeId)).toEqual(['target']);expect(JSON.stringify(body)).not.toContain('global-private-b');
 }finally{await close(f);}
});
it.each(reads)('$name suppresses already fetched global results when Company is lost before final return',async test=>{
 const f=await setup();try{
  await choose(f,'COMPANY');const base=f.db.executor;let changed=false;
  const retire=async()=>{if(!changed){changed=true;await choose(f,'LOCATIONS');}};
  const ex:SqlExecutor={...base,query:async<T>(s:SqlStatement,signal?:AbortSignal)=>{const rows=await base.query<T>(s,signal);if(/AS remaining|AS "validForMs"|AS "validatedAt"|clock_timestamp\(\)::text AS at/.test(s.text)&&!s.text.includes('operational_subject_versions'))await retire();return rows;},transaction:async(statements,signal)=>{const rows=await base.transaction(statements,signal);if(test.name==='attendance policy observation'&&statements.some(s=>s.text.includes('INSERT INTO attendance_policy_observations')))await retire();return rows;}};
  const result=await test.run(f.manager,ex);expect(changed).toBe(true);expect(result).toEqual({state:'unavailable',reason:'access_denied'});
 }finally{await close(f);}
});

it('actual global read APIs retain current Company positive controls and complete B reports/timecards/CSV',async()=>{
 const f=await setup();try{
  vi.stubEnv('FUEL_PORTAL_ORIGIN','http://127.0.0.1');await choose(f,'COMPANY');
  for(const test of apiReads){const response=await test.run();expect(response.status,test.name).toBe(200);const body=await response.text();
   if(['report POST','report CSV export','manager timecards POST','action center POST'].includes(test.name))expect(body,test.name).toContain('global-private-b');
   if(test.name!=='report CSV export'){const value=JSON.parse(body);expect(value.validForMs).toBeGreaterThan(0);expect(value.validForMs).toBeLessThanOrEqual(15000);}
   expect(response.headers.get('cache-control')).toContain('no-store');
  }
 }finally{await close(f);}
});
it.each(['revoked','role cycle'] as const)('actual global APIs deny current %s proof and expose no report, CSV, count or observation payload',async kind=>{
 const f=await setup();try{
  vi.stubEnv('FUEL_PORTAL_ORIGIN','http://127.0.0.1');if(kind==='revoked')await choose(f,'REVOKE');else await f.q("UPDATE employees SET role='EMPLOYEE' WHERE id='manager';UPDATE employees SET role='MANAGER' WHERE id='manager'");
  for(const test of apiReads){const response=await test.run();expect(response.status,test.name).toBe(403);expect(await response.json(),test.name).toEqual({state:'unavailable',reason:'access_denied'});}
 }finally{await close(f);}
});
it('policy observation loses Company after source read and writes no observation',async()=>{
 const f=await setup();try{
  await choose(f,'COMPANY');let reached=false;const base=f.db.executor;
  const ex={...base,transaction:async(statements:readonly SqlStatement[],signal?:AbortSignal)=>{if(statements.some(s=>s.text.includes('INSERT INTO attendance_policy_observations'))){reached=true;await choose(f,'LOCATIONS');}return base.transaction(statements,signal);}};
  expect(await readAttendancePolicies(f.manager,ex)).toEqual({state:'unavailable',reason:'access_denied'});expect(reached).toBe(true);expect(await f.q('SELECT id FROM attendance_policy_observations')).toEqual([]);
 }finally{await close(f);}
});
it('policy observation expires its original budget during commit and returns no ready payload',async()=>{
 const f=await setup();let elapsed=0;const monotonic=vi.spyOn(performance,'now').mockImplementation(()=>elapsed);try{
  await choose(f,'COMPANY');const base=f.db.executor;let reached=false;
  const ex={...base,transaction:async(statements:readonly SqlStatement[],signal?:AbortSignal)=>{const rows=await base.transaction(statements,signal);if(statements.some(s=>s.text.includes('INSERT INTO attendance_policy_observations'))){reached=true;elapsed=16000;}return rows;}};
  const result=await readAttendancePolicies(f.manager,ex);expect(reached).toBe(true);expect(result).toEqual({state:'unavailable',reason:'access_denied'});
 }finally{monotonic.mockRestore();await close(f);}
});
it.each(['logout','expired','inactive','wrong token','malformed proof'] as const)('global read services classify current %s as access denial without payloads',async kind=>{
 const f=await setup();try{
  await choose(f,'COMPANY');let proof=f.manager;
  if(kind==='logout')await f.q("DELETE FROM employee_sessions WHERE employee_id='manager'");
  else if(kind==='expired')await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE employee_id='manager'");
  else if(kind==='inactive')await f.q("UPDATE employees SET active=false WHERE id='manager'");
  else proof={...proof,sessionTokenHash:kind==='malformed proof'?'invalid':'f'.repeat(64)};
  for(const test of reads)expect(await test.run(proof,f.db.executor),test.name).toEqual({state:'unavailable',reason:'access_denied'});
 }finally{await close(f);}
});
