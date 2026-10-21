import {it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import {companyAccessFixture} from './company-access-fixture';
import {readOwnerOperationalScope,assignOperationalScope,isOperationalAuthorizationError} from '../../lib/company-access/operational-scope.server';
import {isManagementAuthorizationError} from '../../lib/data/management-session';
import {saveScheduleHealthSettings,createCoverageWindow,deleteCoverageWindow,replaceCoverageWindowPositionRequirements} from '../../lib/data/schedule-health';
import {saveEmployeeSchedulingProfile} from '../../lib/data/employees';
const ctx=vi.hoisted(()=>({ex:null as SqlExecutor|null,proof:null as SessionMutationProof|null,cacheFails:false}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/db',()=>{
 const statement=(text:string,values:readonly unknown[]=[])=>({statement:{text,values},then:(yes:(rows:unknown[])=>unknown,no:(error:unknown)=>unknown)=>ctx.ex!.query({text,values}).then(yes,no)});
 const tagged=Object.assign((strings:TemplateStringsArray,...values:unknown[])=>statement(strings.reduce((text,part,i)=>text+(i?'$'+i:'')+part,''),values),{query:statement,transaction:(queries:{statement:SqlStatement}[])=>ctx.ex!.transaction(queries.map(q=>q.statement))});
 return {getDb:()=>tagged,queryRows:(rows:unknown)=>rows};
});
vi.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>ctx.proof}));
vi.mock('@/lib/auth/permissions',()=>({MANAGER_ROLES:['OWNER','MANAGER'],requireRoles:async()=>ctx.proof!.employee}));
vi.mock('next/cache',()=>({revalidatePath:()=>{if(ctx.cacheFails)throw Error('Owned cache failure');}}));
vi.mock('next/navigation',()=>({redirect:(destination:string)=>{throw Object.assign(new Error('Owned redirect'),{destination});}}));
import {saveScheduleHealthSettingsFormAction,addCoverageWindowFormAction,replaceCoverageWindowPositionRequirementsAction,deleteCoverageWindowAction} from '../../app/app/schedule/settings/actions';
import {saveEmployeeSchedulingProfileAction} from '../../app/app/employees/actions';
type Fixture=Awaited<ReturnType<typeof setup>>;
async function choose(f:Awaited<ReturnType<typeof companyAccessFixture>>,mode:'COMPANY'|'LOCATIONS'){
 const v=await readOwnerOperationalScope(f.owner,'manager',f.db.executor);if(v.state!=='ready')throw Error('Owner context');const c=v.data.current;
 expect((await assignOperationalScope(f.owner,'manager',{action:'ASSIGN',operationId:randomUUID(),expectedEmployeeVersion:c.employeeUpdatedAt,expectedRoleGeneration:c.roleGeneration,expectedScopeRevision:c.scopeRevision,scope:mode==='COMPANY'?{mode:'COMPANY',locationIds:[]}:{mode:'LOCATIONS',locationIds:['loc-1']}},f.db.executor)).state).toBe('saved');
}
async function setup(){const f=await companyAccessFixture();ctx.ex=f.db.executor;ctx.proof=f.manager;ctx.cacheFails=false;try{
 await f.q(`INSERT INTO positions(id,workspace_id,name) SELECT 'configuration-p',id,'B private position' FROM workspaces WHERE singleton;
  INSERT INTO employee_location_eligibility VALUES('target','loc-1'),('target','loc-2');
  INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('configuration-b','loc-2',1,'08:00','09:00');
  INSERT INTO coverage_window_position_requirements VALUES('configuration-b','configuration-p',1)`);
 await choose(f,'LOCATIONS');const [profile]=await f.q<{version:string}>("SELECT updated_at::text AS version FROM employees WHERE id='target'");return {...f,version:profile.version};
 }catch(e){await f.db.dispose();throw e;}}
async function close(f:Fixture){ctx.ex=null;ctx.proof=null;ctx.cacheFails=false;await f.db.dispose();}
async function snapshot(f:Fixture){return f.q(`SELECT jsonb_build_object(
 'employees',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM employees t),'settings',(SELECT jsonb_agg(to_jsonb(t) ORDER BY employee_id) FROM employee_scheduling_settings t),
 'eligibility',(SELECT jsonb_agg(to_jsonb(t) ORDER BY employee_id,location_id) FROM employee_location_eligibility t),'memberships',(SELECT jsonb_agg(to_jsonb(t) ORDER BY employee_id,position_id) FROM employee_positions t),
 'staffing',(SELECT jsonb_agg(to_jsonb(t) ORDER BY location_id) FROM location_staffing_settings t),'windows',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM location_coverage_windows t),
 'quotas',(SELECT jsonb_agg(to_jsonb(t) ORDER BY coverage_window_id,position_id) FROM coverage_window_position_requirements t),'notifications',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM notifications t)) AS state`);}
async function denied(work:()=>Promise<unknown>){let error:unknown;try{await work();}catch(actual){error=actual;}expect(isOperationalAuthorizationError(error)||isManagementAuthorizationError(error)).toBe(true);}
const cases=[
 {name:'whole employee eligibility/positions',run:(f:Fixture,p:SessionMutationProof)=>saveEmployeeSchedulingProfile({employeeId:'target',positionIds:['configuration-p'],eligibleLocationIds:['loc-2'],actorEmployeeId:p.employee.id,proof:p,expectedUpdatedAt:f.version},f.db.executor)},
 {name:'whole staffing/hour targets',run:(f:Fixture,p:SessionMutationProof)=>saveScheduleHealthSettings({proof:p,staffingSettings:[{locationId:'loc-2',minimumStaffPerShift:3,requiresDesignatedLead:false}],hourTargets:[{employeeId:'target',targetWeeklyHours:20,maximumWeeklyHours:40}]},f.db.executor)},
 {name:'coverage B create',run:(f:Fixture,p:SessionMutationProof)=>createCoverageWindow({locationId:'loc-2',dayOfWeek:2,startTime:'10:00',endTime:'11:00',actorEmployeeId:p.employee.id,proof:p,positionRequirements:[]},f.db.executor)},
 {name:'coverage B quantities',run:(f:Fixture,p:SessionMutationProof)=>replaceCoverageWindowPositionRequirements({windowId:'configuration-b',requirements:[{positionId:'configuration-p',quantity:3}],actorEmployeeId:p.employee.id,proof:p},f.db.executor)},
 {name:'coverage B delete',run:(f:Fixture,p:SessionMutationProof)=>deleteCoverageWindow('configuration-b',p,f.db.executor)},
];
it.each(cases)('$name denies a location grant before private data/metadata or business effects',async test=>{
 const f=await setup();try{const before=await snapshot(f);await denied(()=>test.run(f,f.manager));expect(await snapshot(f)).toEqual(before);}finally{await close(f);}
});
it.each(cases)('$name permits the intended complete update for current Company authority',async test=>{
 const f=await setup();try{
  await choose(f,'COMPANY');const before=await snapshot(f);await test.run(f,f.manager);expect(await snapshot(f)).not.toEqual(before);
  if(test.name==='whole employee eligibility/positions')expect(await f.q("SELECT position_id FROM employee_positions WHERE employee_id='target'")).toEqual([{position_id:'configuration-p'}]);
  else if(test.name==='whole staffing/hour targets')expect(await f.q("SELECT target_weekly_hours::float8 AS target,maximum_weekly_hours::float8 AS maximum FROM employee_scheduling_settings WHERE employee_id='target'")).toEqual([{target:20,maximum:40}]);
  else if(test.name==='coverage B create')expect(await f.q("SELECT start_time::text,end_time::text FROM location_coverage_windows WHERE location_id='loc-2' AND day_of_week=2")).toEqual([{start_time:'10:00:00',end_time:'11:00:00'}]);
  else if(test.name==='coverage B quantities')expect(await f.q("SELECT quantity FROM coverage_window_position_requirements WHERE coverage_window_id='configuration-b'")).toEqual([{quantity:3}]);
  else expect(await f.q("SELECT id FROM location_coverage_windows WHERE id='configuration-b'")).toEqual([]);
 }finally{await close(f);}
});
function form(f:Fixture){const data=new FormData();for(const id of ['loc-1','loc-2']){data.set('staffing-'+id,'2');data.set('lead-configured-'+id,'true');}for(const id of ['owner','manager','target']){data.set('target-'+id,'20');data.set('maximum-'+id,'40');}
 for(const [k,v]of Object.entries({employeeId:'target',expectedUpdatedAt:f.version,locationId:'loc-2',windowId:'configuration-b',dayOfWeek:'2',startTime:'10:00',endTime:'11:00'}))data.set(k,v);
 data.append('positionIds','configuration-p');data.append('eligibleLocationIds','loc-2');data.append('quotaPositionId','configuration-p');data.set('quota-configuration-p','2');return data;}
it('normal configuration actions cannot bypass Company by forging B IDs and preserve all rows',async()=>{
 const f=await setup();try{
  const before=await snapshot(f);for(const action of [saveScheduleHealthSettingsFormAction,addCoverageWindowFormAction,replaceCoverageWindowPositionRequirementsAction,saveEmployeeSchedulingProfileAction]){const result=await action(form(f));expect('error'in result).toBe(true);expect('success'in result).toBe(false);}
  await expect(deleteCoverageWindowAction(form(f))).rejects.toMatchObject({destination:'/app/schedule/settings?error=ACCESS_DENIED'});expect(await snapshot(f)).toEqual(before);
 }finally{await close(f);}
});
it('known committed scheduling profile success remains truthful when cache refresh fails',async()=>{
 const f=await setup();try{
  await choose(f,'COMPANY');ctx.cacheFails=true;const result=await saveEmployeeSchedulingProfileAction(form(f));expect(result).toMatchObject({success:'Scheduling profile updated.'});
  const [row]=await f.q<{version:string}>("SELECT updated_at::text AS version FROM employees WHERE id='target'");expect(result).toMatchObject({updatedAt:row.version});expect(row.version).not.toBe(f.version);
 }finally{await close(f);}
});

it.each(cases)('$name loses Company after admission and rolls all actual configuration/profile writes back',async test=>{
 const f=await setup();try{
  await choose(f,'COMPANY');const before=await snapshot(f),base=f.db.executor;let changed=false;
  f.db.executor={...base,transaction:async(statements,signal)=>{
   if(!changed&&statements.some(s=>/UPDATE employees SET updated_at|INSERT INTO location_staffing_settings|INSERT INTO location_coverage_windows|DELETE FROM location_coverage_windows|DELETE FROM coverage_window_position_requirements/.test(s.text))){changed=true;await choose(f,'LOCATIONS');}
   return base.transaction(statements,signal);
  }};ctx.ex=f.db.executor;
  await denied(()=>test.run(f,f.manager));expect(changed).toBe(true);expect(await snapshot(f)).toEqual(before);
 }finally{await close(f);}
});
