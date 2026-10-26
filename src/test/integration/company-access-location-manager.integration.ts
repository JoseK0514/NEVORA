import {expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import {companyAccessFixture} from './company-access-fixture';
import {assignOperationalScope,readOwnerOperationalScope,isOperationalAuthorizationError} from '../../lib/company-access/operational-scope.server';
import {isManagementAuthorizationError} from '../../lib/data/management-session';
import {readScopedTimecards,mutateTimecard} from '../../lib/timecards/service';
import {submitTimeCorrection,reviewTimeCorrection} from '../../lib/time-corrections/service';
import {readManagerTimeCorrections} from '../../lib/data/time-corrections.server';
import {correctionAuthority} from '../../lib/time-corrections/authority.server';
import {createTimeOffRequest,listScopedTimeOffRequests,reviewTimeOffRequest} from '../../lib/data/requests';
import {listAvailabilitySubmissionStatuses} from '../../lib/data/availability-submissions';
import {listTeamAvailabilityWindows} from '../../lib/data/availability';
import {readExportProfiles} from '../../lib/payroll-export/service';
import {readPeriodClose} from '../../lib/period-close/service';
import {readPayrollCapabilities} from '../../lib/payroll/service';
import {readActionCenter} from '../../lib/action-center/service';
import {withOperationalScope} from '../../lib/company-access/operational-scope.server';

/* B-12 (final pass, Team M): a Manager scoped to locations decides time off, time corrections and timecards, and
 * reads team availability, for the people of their locations. Fictional data only, on an owned disposable database. */
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
const person=(f:Awaited<ReturnType<typeof companyAccessFixture>>,id:string,hash:string,role:'EMPLOYEE'|'MANAGER'='EMPLOYEE',primaryLocationId='loc-1'):SessionMutationProof=>({...f.manager,employee:{...f.manager.employee,id,role,primaryLocationId},sessionTokenHash:hash.repeat(64)});
async function pending(proof:SessionMutationProof,locationId:string,day:string,ex:SqlExecutor){
 const result=await submitTimeCorrection(proof,{operationId:randomUUID(),kind:'MISSING_ENTRY',locationId,proposedStartAt:`${day}T12:00:00Z`,proposedEndAt:`${day}T13:00:00Z`,reason:'Fictional missed punch'},ex);
 if(result.status!=='pending')throw Error('Expected a real pending correction: '+JSON.stringify(result));return result;
}
/* People: 'target' works at loc-1 (in the scope); 'remote' works only at loc-2 (outside it); 'mixed' works at loc-1
 * with time at loc-2 too; 'owner' and 'manager' work at loc-1. The Manager is scoped to loc-1. */
async function setup(){const f=await companyAccessFixture();ctx.ex=f.db.executor;ctx.proof=f.manager;try{
 await f.q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('remote','Remote','QA','NONE','EMPLOYEE','loc-2'),('mixed','Mixed','QA','NONE','EMPLOYEE','loc-1');
  INSERT INTO employee_location_eligibility VALUES('target','loc-1'),('target','loc-2'),('remote','loc-2'),('mixed','loc-1'),('mixed','loc-2'),('manager','loc-1');
  INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('d',64),'target',clock_timestamp()+interval '1 hour'),(repeat('e',64),'remote',clock_timestamp()+interval '1 hour'),(repeat('f',64),'mixed',clock_timestamp()+interval '1 hour');
  INSERT INTO clocker_devices(id,location_id,name) VALUES('m-device-a','loc-1','Owned A'),('m-device-b','loc-2','Owned B');
  INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status) VALUES
   ('m-entry-target','target','loc-1','m-device-a','2026-09-22T12:00:00Z','2026-09-22T20:00:00Z','CLOCKED_OUT'),
   ('m-entry-remote','remote','loc-2','m-device-b','2026-09-22T12:00:00Z','2026-09-22T20:00:00Z','CLOCKED_OUT'),
   ('m-entry-mixed-a','mixed','loc-1','m-device-a','2026-09-22T12:00:00Z','2026-09-22T16:00:00Z','CLOCKED_OUT'),
   ('m-entry-mixed-b','mixed','loc-2','m-device-b','2026-09-23T12:00:00Z','2026-09-23T16:00:00Z','CLOCKED_OUT'),
   ('m-entry-manager','manager','loc-1','m-device-a','2026-09-24T12:00:00Z','2026-09-24T20:00:00Z','CLOCKED_OUT')`);
 const target=person(f,'target','d'),remote=person(f,'remote','e','EMPLOYEE','loc-2');
 // Corrections sit outside the timecard week, so the cards stay reviewable.
 const corrections={inScope:await pending(target,'loc-1','2026-09-30',f.db.executor),otherLocation:await pending(target,'loc-2','2026-10-01',f.db.executor),
  remote:await pending(remote,'loc-2','2026-09-30',f.db.executor),own:await pending(f.manager,'loc-1','2026-10-02',f.db.executor)};
 const timeOff={target:randomUUID(),remote:randomUUID()};
 await createTimeOffRequest({requestId:timeOff.target,employeeId:'target',proof:target,startDate:'2030-10-21',endDate:'2030-10-22',reason:'Fictional leave'},f.db.executor);
 await createTimeOffRequest({requestId:timeOff.remote,employeeId:'remote',proof:remote,startDate:'2030-10-21',endDate:'2030-10-22',reason:'Fictional leave at B'},f.db.executor);
 await choose(f,'LOCATIONS');
 return {...f,target,remote,corrections,timeOff};
 }catch(error){await f.db.dispose();throw error;}}
async function close(f:Fixture){ctx.ex=null;ctx.proof=null;vi.unstubAllEnvs();await f.db.dispose();}
async function snapshot(f:Fixture){return f.q(`SELECT jsonb_build_object('cards',(SELECT jsonb_agg(to_jsonb(t) ORDER BY operation_id) FROM timecard_revisions t),'events',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM time_correction_events t),
 'adjustments',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM time_correction_adjustments t),'leave',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM time_off_requests t),'raw',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM time_entries t)) AS state`);}
async function card(f:Fixture,employeeId:string,p:SessionMutationProof=f.manager){
 const view=await readScopedTimecards(p,period,f.db.executor);if(view.state!=='ready')throw Error('Expected scoped cards: '+JSON.stringify(view));
 const item=view.cards.find(c=>c.card.employeeId===employeeId);if(!item)throw Error('Card not visible: '+employeeId);return item;
}
const timecardCommand=(item:{revision:number;sourceHash:string},employeeId:string,action:'APPROVE'|'FINALIZE'|'REOPEN'='APPROVE')=>({...period,operationId:randomUUID(),employeeId,expectedRevision:item.revision,expectedSourceHash:item.sourceHash,action,...(action==='REOPEN'?{note:'Fictional reopen'}:{})});
const correctionCommand=(c:{requestId:string;revision:number},decision:'APPROVE'|'REJECT'='APPROVE')=>({operationId:randomUUID(),requestId:c.requestId,expectedRevision:c.revision,decision});
async function denied(work:()=>Promise<unknown>){let error:unknown;try{await work();}catch(e){error=e;}expect(isOperationalAuthorizationError(error)||isManagementAuthorizationError(error)||(error as {code?:string})?.code==='FORBIDDEN').toBe(true);}

it('reads: a location-scoped Manager sees only the people of their locations, filtered in the guarded read',async()=>{
 const f=await setup();try{
  const cards=await readScopedTimecards(f.manager,period,f.db.executor);if(cards.state!=='ready')throw Error('cards');
  expect(cards.cards.map(c=>c.card.employeeId).sort()).toEqual(['manager','mixed','target']);
  expect(Object.fromEntries(cards.cards.map(c=>[c.card.employeeId,c.outsideScope]))).toEqual({manager:false,mixed:true,target:false});
  expect(JSON.stringify(cards)).not.toContain('m-entry-remote');
  const corrections=await readManagerTimeCorrections(f.manager,f.db.executor);if(corrections.state!=='ready')throw Error('corrections');
  expect(corrections.requests.map(r=>r.id).sort()).toEqual([f.corrections.inScope.requestId,f.corrections.own.requestId].sort());
  expect(corrections.requests.find(r=>r.id===f.corrections.own.requestId)?.isSelf).toBe(true);
  const leave=await listScopedTimeOffRequests(f.manager,'PENDING',f.db.executor);if(leave.state!=='ready')throw Error('leave');
  expect(leave.data.map(r=>r.id)).toEqual([f.timeOff.target]);expect(leave.coverage).toEqual({kind:'LOCATIONS',locationIds:['loc-1']});
  const availability=await withOperationalScope(f.manager,async scope=>{const statuses=await listAvailabilitySubmissionStatuses('2030-10-21',{workspaceId:scope.workspace.id,locationIds:scope.ids!});
   return {statuses,windows:await listTeamAvailabilityWindows('2030-10-21',statuses.map(s=>s.employeeId))};},f.db.executor);
  if(availability.state!=='ready')throw Error('availability');
  expect(availability.data.statuses.map(s=>s.employeeId).sort()).toEqual(['mixed','target']);
  expect(availability.data.windows.every(w=>['mixed','target'].includes(w.employeeId))).toBe(true);
  const inbox=await readActionCenter(f.manager,'2026-09-21',f.db.executor);if(inbox.state!=='ready')throw Error('inbox '+JSON.stringify(inbox));
  const ids=inbox.items.map(i=>i.id);
  expect(ids).toContain('TIME_OFF:'+f.timeOff.target);expect(ids).toContain('TIME_CORRECTION:'+f.corrections.inScope.requestId);expect(ids).toContain('TIMECARD:target:2026-09-21:2026-09-27');
  expect(JSON.stringify(inbox)).not.toContain('remote');expect(ids).not.toContain('TIME_OFF:'+f.timeOff.remote);expect(inbox.limitedAttendance).toBe(true);
 }finally{await close(f);}
});

it('decides: a location-scoped Manager approves in-scope time off, a correction and a timecard (approve then finalize)',async()=>{
 const f=await setup();try{
  expect(await reviewTimeOffRequest({requestId:f.timeOff.target,managerId:'manager',proof:f.manager,status:'APPROVED'},f.db.executor)).toBe(true);
  expect(await f.q('SELECT status,reviewed_by FROM time_off_requests WHERE id=$1',[f.timeOff.target])).toEqual([{status:'APPROVED',reviewed_by:'manager'}]);
  expect(await reviewTimeCorrection(f.manager,correctionCommand(f.corrections.inScope),f.db.executor)).toMatchObject({status:'approved',revision:2});
  expect(await f.q("SELECT employee_id,location_id FROM time_correction_adjustments")).toEqual([{employee_id:'target',location_id:'loc-1'}]);
  const draft=await card(f,'target');
  // A decision applies to exactly the reviewed card: another source hash is a conflict, never a different write.
  expect(await mutateTimecard(f.manager,{...timecardCommand(draft,'target'),expectedSourceHash:'0'.repeat(32)},f.db.executor)).toEqual({status:'conflict'});
  expect(await mutateTimecard(f.manager,timecardCommand(draft,'target'),f.db.executor)).toMatchObject({status:'approved',revision:1});
  const approved=await card(f,'target');expect(approved.state).toBe('APPROVED');
  expect(await mutateTimecard(f.manager,timecardCommand(approved,'target','FINALIZE'),f.db.executor)).toMatchObject({status:'finalized',revision:2});
  // Reopening finalized, payroll-facing time stays with Owners and company-wide Managers.
  const finalized=await card(f,'target');const before=await snapshot(f);
  expect(await mutateTimecard(f.manager,timecardCommand(finalized,'target','REOPEN'),f.db.executor)).toEqual({status:'blocked',reason:'company_required'});expect(await snapshot(f)).toEqual(before);
 }finally{await close(f);}
});

it('out-of-scope employees are refused exactly like unknown ids, through the services and the real APIs',async()=>{
 const f=await setup();try{
  const before=await snapshot(f);
  const unknown={requestId:randomUUID(),revision:1};
  expect(await reviewTimeCorrection(f.manager,correctionCommand(f.corrections.remote),f.db.executor)).toEqual({status:'unavailable'});
  expect(await reviewTimeCorrection(f.manager,correctionCommand(unknown),f.db.executor)).toEqual({status:'unavailable'});
  const remoteCard={revision:0,sourceHash:'a'.repeat(32)};
  expect(await mutateTimecard(f.manager,timecardCommand(remoteCard,'remote'),f.db.executor)).toEqual({status:'unavailable'});
  expect(await mutateTimecard(f.manager,timecardCommand(remoteCard,'ghost-employee'),f.db.executor)).toEqual({status:'unavailable'});
  expect(await reviewTimeOffRequest({requestId:f.timeOff.remote,managerId:'manager',proof:f.manager,status:'APPROVED'},f.db.executor)).toBe(false);
  expect(await reviewTimeOffRequest({requestId:randomUUID(),managerId:'manager',proof:f.manager,status:'APPROVED'},f.db.executor)).toBe(false);
  // The HTTP answers are byte-for-byte the same for an out-of-scope and an unknown id.
  vi.stubEnv('FUEL_PORTAL_ORIGIN','http://127.0.0.1');
  const send=async(path:string,header:string,body:unknown)=>{const response=await (path.includes('timecards')?timecardPOST:correctionPOST)(new Request('http://127.0.0.1'+path,{method:'POST',headers:{[header]:'1','x-nevora-actor':'manager','x-nevora-correction-authority':correctionAuthority(f.manager),'content-type':'application/json',origin:'http://127.0.0.1'},body:JSON.stringify(body)}));return {status:response.status,body:await response.text()};};
  const correctionOut=await send('/api/manager/time-corrections','x-nevora-time-correction',correctionCommand(f.corrections.remote)),correctionUnknown=await send('/api/manager/time-corrections','x-nevora-time-correction',correctionCommand(unknown));
  expect(correctionOut).toEqual(correctionUnknown);expect(correctionOut.status).toBe(503);
  const cardOut=await send('/api/manager/timecards','x-nevora-timecards',timecardCommand(remoteCard,'remote')),cardUnknown=await send('/api/manager/timecards','x-nevora-timecards',timecardCommand(remoteCard,'ghost-employee'));
  expect(cardOut).toEqual(cardUnknown);expect(cardOut.status).toBe(503);
  expect(await snapshot(f)).toEqual(before);
 }finally{await close(f);}
});

it('an in-scope employee\'s time or correction at a location outside the scope stays refused',async()=>{
 const f=await setup();try{
  const before=await snapshot(f);
  expect(await reviewTimeCorrection(f.manager,correctionCommand(f.corrections.otherLocation),f.db.executor)).toEqual({status:'unavailable'});
  const mixed=await card(f,'mixed');expect(mixed.outsideScope).toBe(true);
  expect(await mutateTimecard(f.manager,timecardCommand(mixed,'mixed'),f.db.executor)).toEqual({status:'blocked',reason:'outside_scope'});
  expect(await snapshot(f)).toEqual(before);
 }finally{await close(f);}
});

it('a scope revoked between the read and the write refuses every decision',async()=>{
 const f=await setup();try{
  const draft=await card(f,'target');const leave=await listScopedTimeOffRequests(f.manager,'PENDING',f.db.executor);expect(leave.state).toBe('ready');
  await choose(f,'REVOKE');const before=await snapshot(f);
  expect(await mutateTimecard(f.manager,timecardCommand(draft,'target'),f.db.executor)).toEqual({status:'unavailable'});
  expect(await reviewTimeCorrection(f.manager,correctionCommand(f.corrections.inScope),f.db.executor)).toEqual({status:'unavailable'});
  await denied(()=>reviewTimeOffRequest({requestId:f.timeOff.target,managerId:'manager',proof:f.manager,status:'APPROVED'},f.db.executor));
  expect(await snapshot(f)).toEqual(before);
 }finally{await close(f);}
});

it.each(['nevora_timecard_command','nevora_review_time_correction','UPDATE time_off_requests SET status'] as const)('a scope revoked inside the decision transaction (%s) rolls the whole batch back',async marker=>{
 const f=await setup();try{
  const draft=await card(f,'target');const before=await snapshot(f),base=f.db.executor;let reached=false;
  const ex:SqlExecutor={...base,transaction:async(statements,signal)=>{if(!reached&&statements.some(s=>s.text.includes(marker))){reached=true;await choose(f,'REVOKE');}return base.transaction(statements,signal);}};
  if(marker==='nevora_timecard_command')expect(await mutateTimecard(f.manager,timecardCommand(draft,'target'),ex)).toEqual({status:'unavailable'});
  else if(marker==='nevora_review_time_correction')expect(await reviewTimeCorrection(f.manager,correctionCommand(f.corrections.inScope),ex)).toEqual({status:'unavailable'});
  else await denied(()=>reviewTimeOffRequest({requestId:f.timeOff.target,managerId:'manager',proof:f.manager,status:'APPROVED'},ex));
  expect(reached).toBe(true);expect(await snapshot(f)).toEqual(before);
 }finally{await close(f);}
});

it('a scoped read that loses its scope before returning is withheld',async()=>{
 const f=await setup();try{
  const base=f.db.executor;let changed=false;
  const ex:SqlExecutor={...base,query:async<T>(s:SqlStatement,signal?:AbortSignal)=>{const rows=await base.query<T>(s,signal);if(!changed&&/AS remaining|AS "validForMs"/.test(s.text)&&!s.text.includes('operational_subject_versions')){changed=true;await choose(f,'REVOKE');}return rows;}};
  expect(await readScopedTimecards(f.manager,period,ex)).toEqual({state:'unavailable',reason:'access_denied'});expect(changed).toBe(true);
 }finally{await close(f);}
});

it('nobody decides their own timecard or correction, scoped or company-wide',async()=>{
 const f=await setup();try{
  for(const mode of ['LOCATIONS','COMPANY'] as const){
   if(mode==='COMPANY')await choose(f,'COMPANY');const before=await snapshot(f);
   const own=await card(f,'manager');expect(own.outsideScope).toBe(false);
   expect(await mutateTimecard(f.manager,timecardCommand(own,'manager'),f.db.executor)).toEqual({status:'blocked',reason:'self_review'});
   expect(await reviewTimeCorrection(f.manager,correctionCommand(f.corrections.own),f.db.executor)).toEqual({status:'blocked',reason:'self_review'});
   expect(await snapshot(f)).toEqual(before);
  }
 }finally{await close(f);}
});

it('a company-wide Manager keeps exactly the company-wide view and decisions',async()=>{
 const f=await setup();try{
  await choose(f,'COMPANY');
  const cards=await readScopedTimecards(f.manager,period,f.db.executor);if(cards.state!=='ready')throw Error('cards');
  expect(cards.cards.map(c=>c.card.employeeId).sort()).toEqual(['manager','mixed','owner','remote','target']);expect(cards.cards.every(c=>!c.outsideScope)).toBe(true);
  const corrections=await readManagerTimeCorrections(f.manager,f.db.executor);if(corrections.state!=='ready')throw Error('corrections');expect(corrections.requests).toHaveLength(4);
  const leave=await listScopedTimeOffRequests(f.manager,'PENDING',f.db.executor);if(leave.state!=='ready')throw Error('leave');expect(leave.data.map(r=>r.id).sort()).toEqual([f.timeOff.target,f.timeOff.remote].sort());
  expect(await reviewTimeCorrection(f.manager,correctionCommand(f.corrections.remote),f.db.executor)).toMatchObject({status:'approved'});
  expect(await mutateTimecard(f.manager,timecardCommand(await card(f,'remote'),'remote'),f.db.executor)).toMatchObject({status:'approved'});
  expect(await mutateTimecard(f.manager,timecardCommand(await card(f,'mixed'),'mixed'),f.db.executor)).toMatchObject({status:'approved'});
  expect(await reviewTimeOffRequest({requestId:f.timeOff.remote,managerId:'manager',proof:f.manager,status:'DENIED'},f.db.executor)).toBe(true);
 }finally{await close(f);}
});

it('payroll, time exports and period close stay refused for a location-scoped Manager',async()=>{
 const f=await setup();try{
  const before=await snapshot(f);
  await denied(()=>readExportProfiles(f.manager,f.db.executor));
  await denied(()=>readPeriodClose(f.manager,period,f.db.executor));
  // Export creation and the rest of the period-close protocol: company-access-period-export.integration.ts.
  vi.stubEnv('NEVORA_PAYROLL_ENABLED','true');
  expect(await readPayrollCapabilities(f.manager,f.db.executor)).toMatchObject({canConfigure:false,canReview:false,canApprove:false});
  expect(await snapshot(f)).toEqual(before);
 }finally{await close(f);}
});
