import {it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import {companyAccessFixture} from './company-access-fixture';
import {readOwnerOperationalScope,assignOperationalScope} from '../../lib/company-access/operational-scope.server';
const ctx=vi.hoisted(()=>({ex:null as SqlExecutor|null,proof:null as SessionMutationProof|null}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/db',()=>{
 const statement=(text:string,values:readonly unknown[]=[])=>({statement:{text,values},then:(yes:(rows:unknown[])=>unknown,no:(error:unknown)=>unknown)=>ctx.ex!.query({text,values}).then(yes,no)});
 const tagged=Object.assign((strings:TemplateStringsArray,...values:unknown[])=>statement(strings.reduce((text,part,i)=>text+(i?'$'+i:'')+part,''),values),{query:statement,transaction:(queries:{statement:SqlStatement}[])=>ctx.ex!.transaction(queries.map(q=>q.statement))});
 return {getDb:()=>tagged,queryRows:(rows:unknown)=>rows};
});

vi.mock('../../lib/auth/session',()=>({requireSessionMutationProof:async()=>ctx.proof}));
vi.mock('../../lib/auth/permissions',()=>({MANAGER_ROLES:['OWNER','MANAGER'],requireRoles:async()=>ctx.proof!.employee}));
vi.mock('next/cache',()=>({revalidatePath:()=>{}}));
vi.mock('next/navigation',()=>({redirect:(destination:string)=>{throw Object.assign(new Error('Owned redirect'),{destination});}}));
vi.mock('../../lib/data/notification-transactions',async original=>({...await original<typeof import('../../lib/data/notification-transactions')>(),neonNotificationExecutor:()=>ctx.ex!}));
import {createShiftAction,updateShiftAction,deleteShiftAction,publishScheduleAction} from '../../app/app/schedule/actions';
async function setup(){
 const f=await companyAccessFixture();ctx.ex=f.db.executor;ctx.proof=f.manager;
 try{
  await f.q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('TARGET','Target','QA','555004','EMPLOYEE','loc-1'),('FOREIGN','Private','B','555005','EMPLOYEE','loc-2');
   INSERT INTO employee_location_eligibility VALUES('TARGET','loc-1'),('FOREIGN','loc-2');
   INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) SELECT 'normal-'||e||'-'||d,e,d,'00:00','24:00' FROM unnest(ARRAY['TARGET','FOREIGN'])e CROSS JOIN generate_series(0,6)d;
   INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('action-b','loc-2','2026-10-12','DRAFT','owner');
   INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('foreign-shift','action-b','FOREIGN','2026-10-12','08:00','09:00')`);
  const v=await readOwnerOperationalScope(f.owner,'manager',f.db.executor);if(v.state!=='ready')throw Error('Scope fixture');const c=v.data.current;
  expect((await assignOperationalScope(f.owner,'manager',{action:'ASSIGN',operationId:randomUUID(),expectedEmployeeVersion:c.employeeUpdatedAt,expectedRoleGeneration:c.roleGeneration,expectedScopeRevision:c.scopeRevision,scope:{mode:'LOCATIONS',locationIds:['loc-1']}},f.db.executor)).state).toBe('saved');return f;
 }catch(e){await f.db.dispose();throw e;}
}
function form(fields:Record<string,string>={}){const data=new FormData();for(const [k,v]of Object.entries({weekStart:'2026-10-12',locationId:'loc-1',employeeId:'TARGET',date:'2026-10-12',startTime:'10:00',endTime:'11:00',...fields}))data.set(k,v);return data;}
async function close(f:Awaited<ReturnType<typeof setup>>){ctx.proof=null;ctx.ex=null;await f.db.dispose();}
it('normal create action rolls its new parent back when assignment creation fails',async()=>{
 const f=await setup();try{
  await f.q(`CREATE FUNCTION test_owned_action_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.employee_id='TARGET' THEN RAISE EXCEPTION 'Owned action failure';END IF;RETURN NEW;END $$;CREATE TRIGGER test_owned_action_failure BEFORE INSERT ON shifts FOR EACH ROW EXECUTE FUNCTION test_owned_action_failure()`);
  await expect(createShiftAction(form())).rejects.toThrow('Owned action failure');
  expect(await f.q("SELECT id FROM schedules WHERE location_id='loc-1'")).toEqual([]);
  expect(await f.q("SELECT id FROM shifts WHERE employee_id='TARGET'")).toEqual([]);
 }finally{await close(f);}
});
it('normal actions deny B targets, forged foreign employee and A publication without private validation results or writes',async()=>{
 const f=await setup();try{
  const before=await f.q('SELECT to_jsonb(s) AS row FROM shifts s ORDER BY id');
  expect(await createShiftAction(form({employeeId:'FOREIGN'}))).toEqual({error:'Operational access is unavailable. Reload and try again.',issueCode:'ACCESS_DENIED'});
  expect(await createShiftAction(form({locationId:'loc-2',employeeId:'FOREIGN'}))).toEqual({error:'Operational access is unavailable. Reload and try again.',issueCode:'ACCESS_DENIED'});
  expect(await updateShiftAction(form({shiftId:'foreign-shift',employeeId:'FOREIGN'}))).toEqual({error:'Operational access is unavailable. Reload and try again.',issueCode:'ACCESS_DENIED'});
  await expect(deleteShiftAction(form({shiftId:'foreign-shift'}))).rejects.toMatchObject({destination:'/app/schedule?error=ACCESS_DENIED'});
  await expect(publishScheduleAction(form())).rejects.toMatchObject({destination:'/app/schedule?error=ACCESS_DENIED'});
  expect(await f.q('SELECT to_jsonb(s) AS row FROM shifts s ORDER BY id')).toEqual(before);
  expect(await f.q('SELECT id FROM schedule_publication_revisions')).toEqual([]);
 }finally{await close(f);}
});
it('normal scoped create/update/delete A succeeds and preserves every B schedule timestamp',async()=>{
 const f=await setup();try{
  const before=await f.q("SELECT to_jsonb(s) AS row FROM schedules s WHERE id='action-b'");
  await expect(createShiftAction(form())).rejects.toMatchObject({destination:'/app/schedule?week=2026-10-12&location=loc-1&day=2026-10-12#schedule-employee-TARGET'});
  const [shift]=await f.q<{id:string}>("SELECT id FROM shifts WHERE employee_id='TARGET'");expect(shift).toBeDefined();
  await expect(updateShiftAction(form({shiftId:shift.id,endTime:'11:30'}))).rejects.toMatchObject({destination:'/app/schedule?week=2026-10-12&location=loc-1&day=2026-10-12&updated=1#schedule-employee-TARGET'});
  await expect(deleteShiftAction(form({shiftId:shift.id}))).rejects.toMatchObject({destination:'/app/schedule?week=2026-10-12&location=loc-1&day=2026-10-12&deleted=1#schedule-employee-TARGET'});
  expect(await f.q("SELECT to_jsonb(s) AS row FROM schedules s WHERE id='action-b'")).toEqual(before);
 }finally{await close(f);}
});

import {generateWeekAction} from '../../app/app/schedule/generation-actions';
import {generateWeekDraft} from '../../lib/data/schedule-generation';
import {getWorkspace} from '../../lib/data/workspaces';
import {GenerationTargetNotDraftError} from '../../lib/data/generation-guards';
import {isOperationalAuthorizationError} from '../../lib/company-access/operational-scope.server';
type ActionFixture=Awaited<ReturnType<typeof setup>>;
async function choose(f:ActionFixture,mode:'COMPANY'|'LOCATIONS'|'REVOKE'){
 const v=await readOwnerOperationalScope(f.owner,'manager',f.db.executor);if(v.state!=='ready')throw Error('Owner scope unavailable');const c=v.data.current,base={operationId:randomUUID(),expectedEmployeeVersion:c.employeeUpdatedAt,expectedRoleGeneration:c.roleGeneration,expectedScopeRevision:c.scopeRevision};expect((await assignOperationalScope(f.owner,'manager',mode==='REVOKE'?{...base,action:'REVOKE'}:{...base,action:'ASSIGN',scope:mode==='COMPANY'?{mode,locationIds:[]}:{mode,locationIds:['loc-1']}},f.db.executor)).state).toBe('saved');
}
async function transition(f:ActionFixture,kind:'LOCATIONS'|'REVOKE'|'REGRANT'|'REVISION'){
 if(kind==='REGRANT'){await choose(f,'REVOKE');await choose(f,'COMPANY');}else await choose(f,kind==='REVISION'?'COMPANY':kind);
}
const generic={error:'Operational access is unavailable. Reload and try again.',issueCode:'ACCESS_DENIED'};
const business=(f:ActionFixture)=>f.q("SELECT jsonb_build_object('schedules',(SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM schedules s),'shifts',(SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM shifts s),'leave',(SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM time_off_requests r),'publications',(SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM schedule_publication_revisions r),'notifications',(SELECT jsonb_agg(to_jsonb(n) ORDER BY id) FROM notifications n)) state");
async function privateFixture(method:'create'|'update',issue:'APPROVED_TIME_OFF'|'SHIFT_OVERLAP'){
 const f=await setup();try{await choose(f,'COMPANY');await f.q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('action-a','loc-1','2026-10-12','DRAFT','owner')");if(method==='update')await f.q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('editing','action-a','TARGET','2026-10-12','08:00','09:00')");
 if(issue==='APPROVED_TIME_OFF')await f.q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status,reason) VALUES('private-approved','TARGET','2026-10-12','2026-10-12','APPROVED','Private fictional leave')");else await f.q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,notes) VALUES('private-overlap','action-a','TARGET','2026-10-12','10:00','12:00','Private fictional overlap')");return f;}catch(error){await close(f);throw error;}
}
for(const method of ['create','update'] as const)for(const issue of ['APPROVED_TIME_OFF','SHIFT_OVERLAP'] as const){
 it(`${method} stable Company preserves real ${issue} feedback without writes`,async()=>{const f=await privateFixture(method,issue);try{const before=await business(f);expect(await (method==='create'?createShiftAction(form()):updateShiftAction(form({shiftId:'editing'})))).toMatchObject({issueCode:issue});expect(await business(f)).toEqual(before);}finally{await close(f);}});
 for(const loss of ['LOCATIONS','REVOKE','REGRANT','REVISION'] as const)it(`${method} ${issue} observed during ${loss} cannot return private feedback under the earlier Company admission`,async()=>{
  const f=await privateFixture(method,issue);try{const before=await business(f),base=f.db.executor;let hit=false;
  ctx.ex={...base,query:async<T>(statement:SqlStatement,signal?:AbortSignal)=>{const rows=await base.query<T>(statement,signal);const phase=issue==='APPROVED_TIME_OFF'?statement.text.includes('FROM time_off_requests'):(statement.text.includes('FROM shifts sh JOIN schedules s')&&statement.text.includes("s.status <> 'ARCHIVED'"));if(!hit&&phase&&statement.values[0]==='TARGET'){hit=true;expect(rows.length).toBeGreaterThan(0);await transition(f,loss);}return rows;}};
  const result=await(method==='create'?createShiftAction(form()):updateShiftAction(form({shiftId:'editing'})));expect(hit).toBe(true);expect(result).toEqual(generic);expect(await business(f)).toEqual(before);
  }finally{await close(f);}
 });
}
it.each(['LOCATIONS','REVOKE','REGRANT','REVISION'] as const)('update canonical management read after %s cannot continue to private validation',async loss=>{const f=await privateFixture('update','APPROVED_TIME_OFF');try{const before=await business(f),base=f.db.executor;let hit=false,privateValidationAfterLoss=false;
 ctx.ex={...base,query:async<T>(s:SqlStatement,signal?:AbortSignal)=>{if(hit&&s.text.includes('FROM time_off_requests')&&s.values[0]==='TARGET')privateValidationAfterLoss=true;const rows=await base.query<T>(s,signal);if(!hit&&s.text.includes('AS approved_callout')&&s.values[0]==='editing'){hit=true;expect(rows).toHaveLength(1);await transition(f,loss);}return rows;}};
 expect(await updateShiftAction(form({shiftId:'editing'}))).toEqual(generic);expect(hit).toBe(true);expect(privateValidationAfterLoss).toBe(false);expect(await business(f)).toEqual(before);
 }finally{await close(f);}});
it.each(['LOCATIONS','REVOKE'] as const)('existing minimal editor still denies %s while its real source is awaited',async loss=>{const f=await privateFixture('update','APPROVED_TIME_OFF');try{const before=await business(f),base=f.db.executor;let hit=false;ctx.ex={...base,query:async<T>(s:SqlStatement,signal?:AbortSignal)=>{const rows=await base.query<T>(s,signal);if(!hit&&s.text.includes('AS "positionIds"')&&Array.isArray(s.values[0])&&(s.values[0] as unknown[]).includes('TARGET')){hit=true;await transition(f,loss);}return rows;}};expect(await updateShiftAction(form({shiftId:'editing'}))).toEqual(generic);expect(hit).toBe(true);expect(await business(f)).toEqual(before);}finally{await close(f);}});
function generationForm(){const data=new FormData();for(const [key,value]of Object.entries({weekStart:'2026-10-12',mode:'BUILD_WEEK',scope:'SELECTED',locationId:'loc-1'}))data.set(key,value);return data;}
async function generationFixture(){const f=await setup();try{await choose(f,'COMPANY');await f.q("UPDATE locations SET short_name='H1 Private Published Location' WHERE id='loc-1';UPDATE location_staffing_settings SET minimum_staff_per_shift=1,requires_designated_lead=false WHERE location_id='loc-1';INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('h1-window','loc-1',1,'08:00','12:00');INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('h1-published','loc-1','2026-10-12','PUBLISHED','owner')");return f;}catch(error){await close(f);throw error;}}
for(const path of ['action','service'] as const){
 it(`stable Company ${path} retains actual published generation target names`,async()=>{const f=await generationFixture();try{const before=await business(f);if(path==='action')expect(await generateWeekAction({status:'idle',message:''},generationForm())).toEqual({status:'error',message:'Automatic scheduling requires Draft targets. Review: H1 Private Published Location.'});else await expect(generateWeekDraft({proof:f.manager,workspaceId:(await getWorkspace(f.db.executor)).id,actorEmployeeId:'manager',weekStart:'2026-10-12',mode:'BUILD_WEEK',locationScope:{kind:'SELECTED',locationIds:['loc-1']}},f.db.executor)).rejects.toBeInstanceOf(GenerationTargetNotDraftError);expect(await business(f)).toEqual(before);}finally{await close(f);}});
 for(const loss of ['LOCATIONS','REVOKE','REGRANT','REVISION'] as const)it(`generation ${path} ${loss} during actual canonical snapshot cannot release published target names`,async()=>{const f=await generationFixture();try{const before=await business(f),base=f.db.executor;let hit=false;const ex:SqlExecutor={...base,query:async<T>(s:SqlStatement,signal?:AbortSignal)=>{const rows=await base.query<T>(s,signal);if(!hit&&s.text.includes('AS source,to_jsonb(clock_timestamp()) AS "changedAt"')){hit=true;expect(rows).toHaveLength(1);await transition(f,loss);}return rows;}};ctx.ex=ex;
 if(path==='action')expect(await generateWeekAction({status:'idle',message:''},generationForm())).toEqual({status:'error',message:'Your scheduling permission changed. Reload and try again.'});else{let error:unknown;try{await generateWeekDraft({proof:f.manager,workspaceId:(await getWorkspace(f.db.executor)).id,actorEmployeeId:'manager',weekStart:'2026-10-12',mode:'BUILD_WEEK',locationScope:{kind:'SELECTED',locationIds:['loc-1']}},ex);}catch(actual){error=actual;}expect(isOperationalAuthorizationError(error)).toBe(true);}expect(hit).toBe(true);expect(await business(f)).toEqual(before);
 }finally{await close(f);}});
}

async function neutralFixture(method:'create'|'update'){
 const f=await setup();try{await choose(f,'COMPANY');await f.q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('action-a','loc-1','2026-10-12','DRAFT','owner')");if(method==='update')await f.q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('editing','action-a','TARGET','2026-10-12','08:00','09:00')");return f;}catch(error){await close(f);throw error;}
}
for(const method of ['create','update'] as const)for(const issue of ['APPROVED_TIME_OFF','SHIFT_OVERLAP'] as const)for(const loss of ['STABLE','LOCATIONS','REVISION'] as const)it(`${method} actual writer ${issue} catch retains only ${loss} original Company feedback`,async()=>{
 const f=await neutralFixture(method);try{const base=f.db.executor;let hit=false;let expected=await business(f);ctx.ex={...base,query:async<T>(s:SqlStatement,signal?:AbortSignal)=>{
 const phase=!hit&&s.text.includes(' AS state, clock_timestamp()::text AS read_at,')&&s.text.endsWith(' AS source');if(phase){hit=true;if(issue==='APPROVED_TIME_OFF')await f.q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date,status) VALUES('late-private','TARGET','2026-10-12','2026-10-12','APPROVED')");else await f.q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('late-private','action-a','TARGET','2026-10-12','10:00','12:00')");expected=await business(f);}const rows=await base.query<T>(s,signal);if(phase&&loss!=='STABLE')await transition(f,loss);return rows;}};
 const result=await(method==='create'?createShiftAction(form()):updateShiftAction(form({shiftId:'editing'})));expect(hit).toBe(true);expect(result).toMatchObject(loss==='STABLE'?{issueCode:issue}:generic);expect(await business(f)).toEqual(expected);
 }finally{await close(f);}
});
for(const method of ['create','update'] as const)for(const loss of ['STABLE','LOCATIONS','REVISION'] as const)it(`${method} committed warning response requires the ${loss} original Company admission`,async()=>{
 const f=await neutralFixture(method);try{await f.q("INSERT INTO employee_scheduling_settings(employee_id,target_weekly_hours,maximum_weekly_hours) VALUES('TARGET',0.5,40);INSERT INTO weekly_availability_submissions(week_start,employee_id,uses_normal_availability) VALUES('2026-10-12','TARGET',true)");const base=f.db.executor;let hit=false;ctx.ex={...base,transaction:async(s:readonly SqlStatement[],signal?:AbortSignal)=>{const rows=await base.transaction(s,signal);if(!hit&&s.some(q=>q.text.includes(method==='create'?'INSERT INTO shifts':'UPDATE shifts SET'))){hit=true;if(loss!=='STABLE')await transition(f,loss);}return rows;}};
 const run=method==='create'?createShiftAction(form()):updateShiftAction(form({shiftId:'editing'}));if(loss==='STABLE')await expect(run).rejects.toMatchObject({destination:expect.stringContaining('warning=TARGET_HOURS_EXCEEDED')});else await expect(run).resolves.toEqual(generic);expect(hit).toBe(true);expect(await f.q("SELECT count(*)::int n FROM shifts WHERE employee_id='TARGET' AND start_time='10:00' AND end_time='11:00'")).toEqual([{n:1}]);
 }finally{await close(f);}
});
for(const loss of ['STABLE','LOCATIONS','REVOKE','REGRANT','REVISION'] as const)it(`publish readiness ${loss} cannot release a stale private warning flag`,async()=>{
 const f=await neutralFixture('create');try{await f.q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('publish-warning','action-a','TARGET','2026-10-12','10:00','11:00')");const before=await business(f),base=f.db.executor;let hit=false;ctx.ex={...base,query:async<T>(s:SqlStatement,signal?:AbortSignal)=>{const rows=await base.query<T>(s,signal);if(!hit&&s.text.includes('FROM shifts sh')&&s.values[0]==='2026-10-12'){hit=true;if(loss!=='STABLE')await transition(f,loss);}return rows;}};
 await expect(publishScheduleAction(form())).rejects.toMatchObject({destination:loss==='STABLE'?expect.stringContaining('publishCheck=loc-1'):'/app/schedule?error=ACCESS_DENIED'});expect(hit).toBe(true);expect(await business(f)).toEqual(before);
 }finally{await close(f);}
});
for(const path of ['action','service'] as const)for(const loss of ['STABLE','LOCATIONS','REGRANT'] as const)it(`generation ${path} ${loss} after actual guarded command cannot return stale private result`,async()=>{
 const f=await generationFixture();try{await f.q("UPDATE schedules SET status='DRAFT' WHERE id='h1-published'");const base=f.db.executor;let hit=false;let committed=await business(f);const ex:SqlExecutor={...base,transaction:async(s:readonly SqlStatement[],signal?:AbortSignal)=>{const rows=await base.transaction(s,signal);if(!hit&&s.some(q=>q.text.includes('generation_source_conflict'))){hit=true;committed=await business(f);if(loss!=='STABLE')await transition(f,loss);}return rows;}};ctx.ex=ex;
 if(path==='action'){const result=await generateWeekAction({status:'idle',message:''},generationForm());if(loss==='STABLE'){expect(result.status).toBe('success');expect(result.result?.summary).toMatchObject({added:1,attempted:1,coverage:{requiredMinutes:240,coveredMinutes:240,percentage:100}});}else expect(result).toEqual({status:'error',message:'Your scheduling permission changed. Reload and try again.'});}
 else{let result:unknown,error:unknown;try{result=await generateWeekDraft({proof:f.manager,workspaceId:(await getWorkspace(f.db.executor)).id,actorEmployeeId:'manager',weekStart:'2026-10-12',mode:'BUILD_WEEK',locationScope:{kind:'SELECTED',locationIds:['loc-1']}},ex);}catch(actual){error=actual;}if(loss==='STABLE'){expect(error).toBeUndefined();expect(result).toBeDefined();}else expect(isOperationalAuthorizationError(error)).toBe(true);}expect(hit).toBe(true);expect(await business(f)).toEqual(committed);
 }finally{await close(f);}
});
