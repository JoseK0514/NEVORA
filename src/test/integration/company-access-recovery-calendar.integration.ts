import {expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import {Client} from 'pg';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import type {CalendarCommand} from '../../lib/calendar/types';
import {companyAccessFixture} from './company-access-fixture';
import {assignOperationalScope,readOwnerOperationalScope} from '../../lib/company-access/operational-scope.server';
import {issueAssistedRecovery,requestPasswordRecovery,resetPasswordWithProof} from '../../lib/auth/recovery.server';
import {readClockerRecoveryReview} from '../../lib/clocker/recovery-review.server';
import {calendarAuthority,manageEmployeeCalendarSubscription,readCalendarFeed,revokeEmployeeCalendarSubscription,getEmployeeCalendarSubscription,findCalendarOperation} from '../../lib/calendar/service.server';
const ctx=vi.hoisted(()=>({ex:null as SqlExecutor|null,proof:null as SessionMutationProof|null}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/auth/session',()=>({getSession:async()=>ctx.proof?.employee,requireSessionMutationProof:async()=>ctx.proof}));
vi.mock('@/lib/db',()=>{
 const statement=(text:string,values:readonly unknown[]=[])=>({statement:{text,values},then:(yes:(rows:unknown[])=>unknown,no:(error:unknown)=>unknown)=>ctx.ex!.query({text,values}).then(yes,no)});
 const tagged=Object.assign((strings:TemplateStringsArray,...values:unknown[])=>statement(strings.reduce((text,part,i)=>text+(i?'$'+i:'')+part,''),values),{query:statement,transaction:(queries:{statement:SqlStatement}[])=>ctx.ex!.transaction(queries.map(q=>q.statement))});return {getDb:()=>tagged,queryRows:(rows:unknown)=>rows};
});
import {POST as assistedApi} from '../../app/api/manager/account-recovery/route';
import {POST as reviewApi} from '../../app/api/manager/clocker-recovery/route';
import {managerCalendarRevokeHandler as calendarApi} from '../../lib/calendar/http.server';
type Fixture=Awaited<ReturnType<typeof setup>>;
async function scope(f:Awaited<ReturnType<typeof companyAccessFixture>>,mode:'COMPANY'|'LOCATIONS'|'REVOKE'){
 const v=await readOwnerOperationalScope(f.owner,'manager',f.db.executor);if(v.state!=='ready')throw Error('Owner context');const c=v.data.current;
 const base={operationId:randomUUID(),expectedEmployeeVersion:c.employeeUpdatedAt,expectedRoleGeneration:c.roleGeneration,expectedScopeRevision:c.scopeRevision};
 expect((await assignOperationalScope(f.owner,'manager',mode==='REVOKE'?{...base,action:'REVOKE'}:{...base,action:'ASSIGN',scope:mode==='COMPANY'?{mode,locationIds:[]}:{mode,locationIds:['loc-1']}},f.db.executor)).state).toBe('saved');
}
async function setup(){const f=await companyAccessFixture();ctx.ex=f.db.executor;ctx.proof=f.manager;try{
 await f.q("INSERT INTO employee_location_eligibility VALUES('target','loc-1'),('target','loc-2');INSERT INTO employee_credentials(employee_id,password_hash) VALUES('target','owned previous hash'),('owner','owned owner hash');INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),'target',clock_timestamp()+interval '1 hour')");
 const employee:SessionMutationProof={employee:{id:'target',role:'EMPLOYEE',firstName:'Target',lastName:'QA',primaryLocationId:'loc-1'},sessionTokenHash:'d'.repeat(64)};
 return {...f,employee};
 }catch(error){await f.db.dispose();throw error;}}
async function close(f:Fixture){ctx.ex=null;ctx.proof=null;await f.db.dispose();}
const command=(proof:SessionMutationProof,kind:CalendarCommand['kind']='REVOKE',expectedGeneration:string|null=null):CalendarCommand=>({operationId:randomUUID(),authority:calendarAuthority(proof),kind,expectedGeneration});
async function issueCalendar(f:Fixture){const cmd=command(f.employee,'ISSUE'),r=await manageEmployeeCalendarSubscription(f.employee,cmd,f.db.executor);if(r.status!=='created')throw Error('Owned calendar setup');return {cmd,created:r,token:r.url.split('/')[3]};}
async function state(f:Fixture){return f.q("SELECT jsonb_build_object('proofs',(SELECT jsonb_agg(to_jsonb(t) ORDER BY token_hash) FROM password_recovery_proofs t),'subscriptions',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM calendar_subscriptions t),'operations',(SELECT jsonb_agg(to_jsonb(t) ORDER BY operation_id) FROM calendar_operations t)) AS state");}
it.each(['LOCATIONS','REVOKE','role-cycle','unassigned'] as const)('current %s Manager cannot issue assisted proof, read global ledger, or revoke another calendar',async kind=>{
 const f=await setup();try{await issueCalendar(f);if(kind==='role-cycle')await f.q("UPDATE employees SET role='EMPLOYEE' WHERE id='manager';UPDATE employees SET role='MANAGER' WHERE id='manager'");else if(kind==='unassigned'){await f.q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('new-manager','New','Manager','NONE','MANAGER','loc-1');INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('c',64),'new-manager',clock_timestamp()+interval '1 hour')");f.manager={...f.manager,employee:{...f.manager.employee,id:'new-manager'},sessionTokenHash:'c'.repeat(64)};}else await scope(f,kind);
 const before=await state(f);let privateRead=false;const base=f.db.executor,ex={...base,query:async<T>(s:SqlStatement,signal?:AbortSignal)=>{if(s.text.includes('FROM calendar_subscriptions WHERE employee_id='))privateRead=true;return base.query<T>(s,signal);}};
 expect((await issueAssistedRecovery(f.manager,'target','Verified via established process',ex)).state).toBe('unavailable');
 expect(await readClockerRecoveryReview(f.manager,randomUUID(),ex)).toEqual({state:'unavailable',reason:'access_denied'});
 expect(await revokeEmployeeCalendarSubscription(f.manager,'target',command(f.manager),ex)).toEqual({status:'blocked',reason:'access_denied'});expect(privateRead).toBe(false);expect(await state(f)).toEqual(before);
 }finally{await close(f);}
});
it.each(['Owner','Company Manager'] as const)('current %s keeps assisted recovery, global receipt review and calendar revocation useful',async role=>{
 const f=await setup();try{const p=role==='Owner'?f.owner:f.manager;const issued=await issueAssistedRecovery(p,'target','Verified via established process',f.db.executor);expect(issued.state).toBe('issued');expect(await f.q('SELECT employee_id,actor_employee_id,method FROM password_recovery_proofs')).toEqual([{employee_id:'target',actor_employee_id:p.employee.id,method:'ASSISTED'}]);
 expect(await readClockerRecoveryReview(p,randomUUID(),f.db.executor)).toMatchObject({state:'ready',receipts:[]});const own=await issueCalendar(f),cmd=command(p);const r=await revokeEmployeeCalendarSubscription(p,'target',cmd,f.db.executor);expect(r.status).toBe('revoked');expect(await revokeEmployeeCalendarSubscription(p,'target',cmd,f.db.executor)).toEqual(r);expect((await readCalendarFeed(own.token,f.db.executor)).state).toBe('unauthorized');
 }finally{await close(f);}
});
it('a prior manager calendar receipt is unavailable after Company restriction and remains immutable',async()=>{
 const f=await setup();try{await issueCalendar(f);const cmd=command(f.manager);expect((await revokeEmployeeCalendarSubscription(f.manager,'target',cmd,f.db.executor)).status).toBe('revoked');await scope(f,'LOCATIONS');const before=await state(f);expect(await revokeEmployeeCalendarSubscription(f.manager,'target',cmd,f.db.executor)).toEqual({status:'blocked',reason:'access_denied'});expect(await state(f)).toEqual(before);}finally{await close(f);}
});
it.each(['assisted','calendar'] as const)('%s business batch rechecks Company after admission and rolls back its actual effects',async kind=>{
 const f=await setup();try{if(kind==='calendar')await issueCalendar(f);const before=await state(f),base=f.db.executor;let reached=false;const ex={...base,transaction:async(statements:readonly SqlStatement[],signal?:AbortSignal)=>{if(statements.some(s=>s.text.includes(kind==='assisted'?'INSERT INTO password_recovery_proofs':'INSERT INTO calendar_operations'))){reached=true;await scope(f,'LOCATIONS');}return base.transaction(statements,signal);}};
 const r=kind==='assisted'?await issueAssistedRecovery(f.manager,'target','Verified via established process',ex):await revokeEmployeeCalendarSubscription(f.manager,'target',command(f.manager),ex);expect('state'in r?r.state:r.status).toBe(kind==='assisted'?'unavailable':'blocked');expect(reached).toBe(true);expect(await state(f)).toEqual(before);
 }finally{await close(f);}
});
it.each(['assisted','calendar'] as const)('%s final DB-clock guard rolls back when the session expires after actual business writes',async kind=>{
 const f=await setup(),worker=new Client({connectionString:f.db.connectionString});await worker.connect();try{if(kind==='calendar')await issueCalendar(f);await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '1 second' WHERE employee_id='manager'");const before=await state(f);let reached=false;
 const ex:SqlExecutor={query:f.db.executor.query,transaction:async statements=>{await worker.query('BEGIN');try{const rows:unknown[][]=[];for(const s of statements){const result=await worker.query(s.text,[...s.values]);rows.push(result.rows);if(s.text.includes(kind==='assisted'?'INSERT INTO password_recovery_proofs':'INSERT INTO calendar_operations')){reached=true;await worker.query('SELECT pg_sleep(1.1)');}}await worker.query('COMMIT');return rows;}catch(error){await worker.query('ROLLBACK');throw error;}}};
 const r=kind==='assisted'?await issueAssistedRecovery(f.manager,'target','Verified via established process',ex):await revokeEmployeeCalendarSubscription(f.manager,'target',command(f.manager),ex);expect('state'in r?r.state:r.status).toBe(kind==='assisted'?'unavailable':'blocked');expect(reached).toBe(true);expect(await state(f)).toEqual(before);
 }finally{await worker.end();await close(f);}
});
it.each(['assisted','calendar'] as const)('%s suppresses private post-commit result after Company loss while preserving committed history',async kind=>{
 const f=await setup();try{if(kind==='calendar')await issueCalendar(f);const base=f.db.executor;let reached=false;const ex={...base,transaction:async(statements:readonly SqlStatement[],signal?:AbortSignal)=>{const r=await base.transaction(statements,signal);if(statements.some(s=>s.text.includes(kind==='assisted'?'INSERT INTO password_recovery_proofs':'INSERT INTO calendar_operations'))){reached=true;await scope(f,'LOCATIONS');}return r;}};
 const r=kind==='assisted'?await issueAssistedRecovery(f.manager,'target','Verified via established process',ex):await revokeEmployeeCalendarSubscription(f.manager,'target',command(f.manager),ex);expect('state'in r?r.state:r.status).toBe(kind==='assisted'?'unavailable':'blocked');expect(reached).toBe(true);expect(await f.q(kind==='assisted'?"SELECT count(*)::int AS n FROM password_recovery_proofs WHERE actor_employee_id='manager'":"SELECT count(*)::int AS n FROM calendar_operations WHERE actor_employee_id='manager'")).toEqual([{n:1}]);
 }finally{await close(f);}
});
it('ledger review rechecks Company after awaiting its final lifetime projection',async()=>{const f=await setup();try{const base=f.db.executor;let reached=false;const ex={...base,query:async<T>(s:SqlStatement,signal?:AbortSignal)=>{const r=await base.query<T>(s,signal);if(s.text.includes('AS remaining')){reached=true;await scope(f,'LOCATIONS');}return r;}};expect(await readClockerRecoveryReview(f.manager,randomUUID(),ex)).toEqual({state:'unavailable',reason:'access_denied'});expect(reached).toBe(true);}finally{await close(f);}});
const request=(f:Fixture,kind:'assisted'|'review'|'calendar',body:object)=>new Request('https://owned.example.invalid/api/manager/owned',{method:'POST',headers:{origin:'https://owned.example.invalid','content-type':'application/json','sec-fetch-site':'same-origin','x-nevora-actor':f.manager.employee.id,...(kind==='calendar'?{'x-nevora-calendar':'1','x-nevora-calendar-authority':calendarAuthority(f.manager)}:{[kind==='assisted'?'x-nevora-recovery':'x-nevora-clocker-recovery']:'1'})},body:JSON.stringify(body)});
it.each(['assisted','review','calendar'] as const)('normal %s API denies the restricted Manager without protected effects',async kind=>{const f=await setup();try{await issueCalendar(f);await scope(f,'LOCATIONS');const before=await state(f),r=kind==='assisted'?await assistedApi(request(f,kind,{employeeId:'target',attestation:'Verified via established process'})):kind==='review'?await reviewApi(request(f,kind,{commandId:randomUUID()})):await calendarApi(request(f,kind,command(f.manager)),'target');expect(r.status).toBe(kind==='assisted'?503:403);const body=await r.json();expect(typeof body==='object'&&body!==null&&!('proof'in body)&&!('receipts'in body)).toBe(true);expect(await state(f)).toEqual(before);}finally{await close(f);}});
it.each(['assisted','review','calendar'] as const)('normal %s API retains Company-positive behavior using the real session actor',async kind=>{const f=await setup();try{await issueCalendar(f);const r=kind==='assisted'?await assistedApi(request(f,kind,{employeeId:'target',attestation:'Verified via established process'})):kind==='review'?await reviewApi(request(f,kind,{commandId:randomUUID()})):await calendarApi(request(f,kind,command(f.manager)),'target');expect(r.status).toBe(200);const body=await r.json();expect(kind==='assisted'?body.state:kind==='review'?body.state:body.status).toBe(kind==='assisted'?'issued':kind==='review'?'ready':'revoked');}finally{await close(f);}});
it.each(['EMPLOYEE','LEAD'] as const)('%s own calendar issue, operation replay, status, rotation and capability survive operational Manager revocation',async role=>{const f=await setup();try{await f.q("UPDATE employees SET role=$1 WHERE id='target'",[role]);f.employee={...f.employee,employee:{...f.employee.employee,role}};await scope(f,'REVOKE');const {created,token,cmd}=await issueCalendar(f);expect((await getEmployeeCalendarSubscription(f.employee,f.db.executor)).state).toBe('active');expect((await readCalendarFeed(token,f.db.executor)).state).toBe('ready');expect((await findCalendarOperation(f.employee,cmd.operationId,cmd.authority,f.db.executor)).status).toBe('active_url_unavailable');const rotated=await manageEmployeeCalendarSubscription(f.employee,command(f.employee,'ROTATE',created.generation),f.db.executor);expect(rotated.status).toBe('created');expect((await readCalendarFeed(token,f.db.executor)).state).toBe('unauthorized');}finally{await close(f);}});
it('public email recovery and own password reset remain independent of operational scope',async()=>{const f=await setup();let token='',sent=0;try{await scope(f,'REVOKE');await requestPasswordRecovery('target','target@example.invalid',{send:async(email,proof)=>{if(email!=='target@example.invalid')throw Error('Wrong owned recipient');sent++;token=proof;}},f.db.executor);expect(sent).toBe(1);expect((await resetPasswordWithProof(token,'Owned new password for regression',f.db.executor)).state).toBe('reset');expect(await f.q("SELECT count(*)::int AS n FROM employee_sessions WHERE employee_id='target'")).toEqual([{n:0}]);}finally{token='';await close(f);}});
it('Company management preserves Owner hierarchy and self-assisted restrictions',async()=>{const f=await setup();try{expect((await issueAssistedRecovery(f.manager,'owner','Verified via established process',f.db.executor)).state).toBe('unavailable');expect((await issueAssistedRecovery(f.owner,'owner','Verified via established process',f.db.executor)).state).toBe('unavailable');expect(await f.q('SELECT count(*)::int AS n FROM password_recovery_proofs')).toEqual([{n:0}]);}finally{await close(f);}});
it.each([['MANAGER','unavailable'],['LEAD','issued'],['EMPLOYEE','issued']] as const)('P1 a Company Manager assisting a %s target is %s; only an Owner can reset a Manager',async(role,expected)=>{
 const f=await setup();try{
  if(role!=='EMPLOYEE')await f.q('UPDATE employees SET role=$1 WHERE id=$2',[role,'target']);
  expect((await issueAssistedRecovery(f.manager,'target','Verified via established process',f.db.executor)).state).toBe(expected);
  if(expected==='unavailable')expect(await f.q('SELECT count(*)::int AS n FROM password_recovery_proofs')).toEqual([{n:0}]);
  if(role==='MANAGER')expect((await issueAssistedRecovery(f.owner,'target','Verified via established process',f.db.executor)).state).toBe('issued');
 }finally{await close(f);}
});
