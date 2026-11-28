import {it,expect,rs} from '@rstest/core';
import {randomUUID} from 'node:crypto';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import {companyAccessFixture} from './company-access-fixture';
import {getWorkspace} from '../../lib/data/workspaces';
import {assignOperationalScope,readOwnerOperationalScope,isOperationalAuthorizationError} from '../../lib/company-access/operational-scope.server';
import {isManagementAuthorizationError} from '../../lib/data/management-session';
import {editSavedTemplate,readTemplateDetail,listScheduleTemplates,listTemplateShifts,createTemplateFromWeek,archiveScheduleTemplate} from '../../lib/data/schedule-templates';
import {readScheduleCopyReceipt,readScheduleCopyCommand,executeScheduleCopy} from '../../lib/data/schedule-copy';
import {generateWeekDraft} from '../../lib/data/schedule-generation';
import {setAvailabilityDeadline} from '../../lib/data/week-settings';
const ctx=rs.hoisted(()=>({ex:null as SqlExecutor|null}));
rs.mock('server-only',()=>({}));
rs.mock('@/lib/db',()=>{
 const statement=(text:string,values:readonly unknown[]=[])=>({statement:{text,values},then:(yes:(rows:unknown[])=>unknown,no:(error:unknown)=>unknown)=>ctx.ex!.query({text,values}).then(yes,no)});
 const tagged=Object.assign((strings:TemplateStringsArray,...values:unknown[])=>statement(strings.reduce((text,part,i)=>text+(i?'$'+i:'')+part,''),values),{query:statement,transaction:(queries:{statement:SqlStatement}[])=>ctx.ex!.transaction(queries.map(q=>q.statement))});
 return {getDb:()=>tagged,queryRows:(rows:unknown)=>rows};
});
const week='2026-10-12';
type Fixture=Awaited<ReturnType<typeof setup>>;
async function choose(f:Awaited<ReturnType<typeof companyAccessFixture>>,mode:'LOCATIONS'|'COMPANY'|'REVOKE'){
 const view=await readOwnerOperationalScope(f.owner,'manager',f.db.executor);if(view.state!=='ready')throw Error('Owner scope fixture');const c=view.data.current;
 const base={operationId:randomUUID(),expectedEmployeeVersion:c.employeeUpdatedAt,expectedRoleGeneration:c.roleGeneration,expectedScopeRevision:c.scopeRevision};
 const result=await assignOperationalScope(f.owner,'manager',mode==='REVOKE'?{...base,action:'REVOKE'}:{...base,action:'ASSIGN',scope:mode==='COMPANY'?{mode:'COMPANY',locationIds:[]}:{mode:'LOCATIONS',locationIds:['loc-1']}},f.db.executor);expect(result.state).toBe('saved');
}
async function setup(){const f=await companyAccessFixture();ctx.ex=f.db.executor;try{
 await f.q(`INSERT INTO employee_location_eligibility VALUES('target','loc-1'),('target','loc-2');
  INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) SELECT 'global-normal-'||d,'target',d,'00:00','24:00' FROM generate_series(0,6)d;
  INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('global-a','loc-1','2026-10-12','DRAFT','owner'),('global-b','loc-2','2026-10-12','DRAFT','owner');
  INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,notes) VALUES('global-shift-a','global-a','target','2026-10-12','08:00','09:00','A note'),('global-shift-b','global-b','target','2026-10-12','12:00','13:00','Private B note');
  INSERT INTO schedule_templates(id,name,created_by,workspace_id) SELECT 'global-template','Private complete source','owner',id FROM workspaces WHERE singleton;
  INSERT INTO schedule_template_shifts(id,template_id,location_id,day_offset,start_time,end_time,employee_id) VALUES('global-template-b','global-template','loc-2',0,'12:00','13:00','target')`);
 const workspace=await getWorkspace(f.db.executor);await choose(f,'LOCATIONS');return {...f,workspace};
 }catch(error){await f.db.dispose();throw error;}}
async function close(f:Fixture){ctx.ex=null;await f.db.dispose();}
async function denied(work:()=>Promise<unknown>){let error:unknown;try{await work();}catch(actual){error=actual;}expect(isOperationalAuthorizationError(error)||isManagementAuthorizationError(error)).toBe(true);}
async function snapshot(f:Fixture){return f.q(`SELECT jsonb_build_object(
 'schedules',(SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM schedules s),'shifts',(SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM shifts s),
 'templates',(SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM schedule_templates s),'templateShifts',(SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM schedule_template_shifts s),
 'operations',(SELECT jsonb_agg(to_jsonb(s) ORDER BY operation_id) FROM schedule_copy_operations s),'receipts',(SELECT jsonb_agg(to_jsonb(s) ORDER BY operation_id) FROM schedule_copy_receipts s),
 'deadlines',(SELECT jsonb_agg(to_jsonb(s) ORDER BY week_start) FROM schedule_week_settings s),'notifications',(SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM notifications s)) AS state`);}
const cases=[
 {name:'template list/count',run:(f:Fixture,p:SessionMutationProof)=>listScheduleTemplates(p,f.db.executor)},
 {name:'template B detail',run:(f:Fixture,p:SessionMutationProof)=>listTemplateShifts('global-template',f.db.executor,p)},
 {name:'template creation',run:(f:Fixture,p:SessionMutationProof)=>createTemplateFromWeek({name:'Forged full company',weekStart:week,createdBy:p.employee.id,proof:p},f.db.executor)},
 {name:'template archive',run:(f:Fixture,p:SessionMutationProof)=>archiveScheduleTemplate('global-template',p,f.db.executor)},
 {name:'copy command read',run:(f:Fixture,p:SessionMutationProof)=>readScheduleCopyCommand(p,randomUUID(),f.db.executor)},
 {name:'copy receipt read',run:(f:Fixture,p:SessionMutationProof)=>readScheduleCopyReceipt(p,randomUUID(),f.db.executor)},
 {name:'whole copy',run:(f:Fixture,p:SessionMutationProof)=>executeScheduleCopy(p,{operationId:randomUUID(),kind:'PREVIOUS_WEEK',weekStart:'2026-10-19'},f.db.executor)},
 {name:'generation with an A selector',run:(f:Fixture,p:SessionMutationProof)=>generateWeekDraft({workspaceId:f.workspace.id,actorEmployeeId:p.employee.id,proof:p,weekStart:week,mode:'BUILD_WEEK',locationScope:{kind:'SELECTED',locationIds:['loc-1']}},f.db.executor)},
 {name:'whole-week deadline',run:(_f:Fixture,p:SessionMutationProof)=>setAvailabilityDeadline({weekStart:week,updatedBy:p.employee.id,proof:p})},
];
it.each(cases)('$name requires Company and cannot expose/capture global source or mutate custody from a location grant',async test=>{
 const f=await setup();try{const before=await snapshot(f);await denied(()=>test.run(f,f.manager));expect(await snapshot(f)).toEqual(before);}finally{await close(f);}
});
it('a Company copy commits all source locations once; restriction suppresses its historical command, receipt and replay without deleting them',async()=>{
 const f=await setup();try{
  await choose(f,'COMPANY');const command={operationId:randomUUID(),kind:'PREVIOUS_WEEK' as const,weekStart:'2026-10-19'};
  const result=await executeScheduleCopy(f.manager,command,f.db.executor);expect(result.rows).toHaveLength(2);expect(result.rows.every(r=>r.status==='COMMITTED')).toBe(true);
  expect(await executeScheduleCopy(f.manager,command,f.db.executor)).toEqual(result);expect(await readScheduleCopyReceipt(f.manager,command.operationId,f.db.executor)).toEqual(result);
  expect(await f.q("SELECT s.location_id,count(*)::integer AS n FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE s.week_start='2026-10-19' GROUP BY s.location_id ORDER BY s.location_id")).toEqual([{location_id:'loc-1',n:1},{location_id:'loc-2',n:1}]);
  await choose(f,'LOCATIONS');const before=await snapshot(f);
  await denied(()=>readScheduleCopyCommand(f.manager,command.operationId,f.db.executor));await denied(()=>readScheduleCopyReceipt(f.manager,command.operationId,f.db.executor));await denied(()=>executeScheduleCopy(f.manager,command,f.db.executor));expect(await snapshot(f)).toEqual(before);
 }finally{await close(f);}
});
it.each(['unassigned','revoked','role cycle'] as const)('global scheduling methods all reject current %s authority before private sources',async kind=>{
 const f=await setup();try{
  let proof=f.manager;
  if(kind==='revoked')await choose(f,'REVOKE');
  else if(kind==='role cycle')await f.q("UPDATE employees SET role='EMPLOYEE' WHERE id='manager';UPDATE employees SET role='MANAGER' WHERE id='manager'");
  else{await f.q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('unassigned','New','Manager','NONE','MANAGER','loc-1');INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('c',64),'unassigned',clock_timestamp()+interval '1 hour')");proof={...f.manager,employee:{...f.manager.employee,id:'unassigned'},sessionTokenHash:'c'.repeat(64)};}
  const before=await snapshot(f);for(const test of cases)await denied(()=>test.run(f,proof));expect(await snapshot(f)).toEqual(before);
 }finally{await close(f);}
});

it.each(cases.filter(t=>['template creation','template archive','whole copy','generation with an A selector','whole-week deadline'].includes(t.name)))('$name loses Company after admission: its actual capture/write batch and receipts roll back',async test=>{
 const f=await setup();try{
  await choose(f,'COMPANY');const before=await snapshot(f),base=f.db.executor;let changed=false;
  const ex:SqlExecutor={...base,transaction:async(statements,signal)=>{
   if(!changed&&statements.some(s=>/INSERT INTO schedule_templates|UPDATE schedule_templates SET active|INSERT INTO schedule_copy_operations|generation_source_conflict|INSERT INTO schedule_week_settings/.test(s.text))){changed=true;await choose(f,'LOCATIONS');}
   return base.transaction(statements,signal);
  }};
  f.db.executor=ex;ctx.ex=ex;await denied(()=>test.run(f,f.manager));expect(changed).toBe(true);expect(await snapshot(f)).toEqual(before);
 }finally{await close(f);}
});
it('Company template reads retain all rows/counts and an authorized no-op generator/deadline remain usable',async()=>{
 const f=await setup();try{
  const template=await createTemplateFromWeek({name:'Complete owned source',weekStart:week,createdBy:'owner',proof:f.owner},f.db.executor);
  const list=await listScheduleTemplates(f.owner,f.db.executor);expect(list.find(t=>t.id===template)?.shiftCount).toBe(2);
  expect((await listTemplateShifts(template,f.db.executor,f.owner))?.map(s=>s.locationId).sort()).toEqual(['loc-1','loc-2']);
  await choose(f,'COMPANY');await setAvailabilityDeadline({weekStart:week,updatedBy:'manager',proof:f.manager});
  expect(await f.q('SELECT week_start::text FROM schedule_week_settings')).toEqual([{week_start:week}]);
  const result=await generateWeekDraft({workspaceId:f.workspace.id,actorEmployeeId:'manager',proof:f.manager,weekStart:week,mode:'BUILD_WEEK',locationScope:{kind:'SELECTED',locationIds:['loc-1']}},f.db.executor);expect(result.changed).toBe(false);
  expect(await archiveScheduleTemplate(template,f.manager,f.db.executor)).toBe(true);
 }finally{await close(f);}
});

it('inspects and edits only the saved template, detects stale edits, and applies its revised shifts', async () => {
 const f = await setup();
 try {
  const id = 'global-template', ex = f.db.executor;
  const read = () => readTemplateDetail(id, f.owner, ex);
  const edit = (revision: string, fields: Record<string, string>) => {
   const form = new FormData();
   for (const [name, value] of Object.entries(fields)) form.set(name, value);
   return editSavedTemplate(id, revision, form, f.owner, ex);
  };
  await denied(() => readTemplateDetail(id, f.manager, ex));
  const template = (await read())!;
  expect(template.shifts[0]).toMatchObject({id:'global-template-b',day:0,location:'loc-2',employee:'target',start:'12:00'});
  expect(template.employees.find(p=>p.id==='target')?.name).toBeTruthy();
  const rename = new FormData(); rename.set('kind','rename'); rename.set('name','Other name');
  await denied(() => editSavedTemplate(id,template.revision,rename,f.manager,ex));
  const original = await f.q('SELECT * FROM shifts ORDER BY id');
  const shift = {kind:'edit',shiftId:'global-template-b',day:'1',location:'loc-1',employee:'target',start:'19:00',end:'02:00',notes:'Evening coverage'};
  expect(await edit(template.revision,shift)).toBe('saved');
  expect(await edit(template.revision,{kind:'remove',shiftId:shift.shiftId})).toBe('stale');
  const updated = (await read())!;
  expect(updated.shifts[0]).toMatchObject({day:1,start:'19:00',end:'02:00',notes:'Evening coverage'});
  expect(await edit(updated.revision,{...shift,location:'missing'})).toBe('stale');
  expect(await edit(updated.revision,{...shift,start:shift.end})).toBe('invalid');
  expect(await edit(updated.revision,{kind:'rename',name:'Night shifts'})).toBe('saved');
  expect((await read())!.name).toBe('Night shifts');
  expect(await edit((await read())!.revision,{...shift,kind:'add',employee:'',start:'16:10',end:'24:00'})).toBe('saved');
  const added = (await read())!;
  expect(added.shifts).toHaveLength(2);
  const open = added.shifts.find(s => !s.employee)!;
  expect(open).toMatchObject({start:'16:10',end:'24:00'});
  expect(await edit(added.revision,{kind:'remove',shiftId:open.id})).toBe('saved');
  // QA on 342af7eb: an add with a person assigned was always 'stale' (employees has no workspace_id).
  expect(await edit((await read())!.revision,{...shift,kind:'add',day:'3',start:'06:00',end:'07:00'})).toBe('saved');
  const assigned = (await read())!.shifts.find(s => s.day===3 && s.start==='06:00')!;
  expect(assigned).toMatchObject({employee:'target'});
  expect(await edit((await read())!.revision,{kind:'remove',shiftId:assigned.id})).toBe('saved');
  expect(await f.q('SELECT * FROM shifts ORDER BY id')).toEqual(original);
  const receipt = await executeScheduleCopy(f.owner,{operationId:randomUUID(),kind:'TEMPLATE',weekStart:'2026-10-19',templateId:id},ex);
  expect(receipt.rows).toHaveLength(1);
  expect(receipt.rows[0].status).toBe('COMMITTED');
  expect(await f.q("SELECT date::text,notes FROM shifts WHERE notes='Evening coverage'")).toEqual([{date:'2026-10-20',notes:'Evening coverage'}]);
  const revision = (await read())!.revision;
  await archiveScheduleTemplate(id,f.owner,ex);
  expect(await read()).toBeNull();
  expect(await edit(revision,shift)).toBe('stale');
 } finally { await close(f); }
});
