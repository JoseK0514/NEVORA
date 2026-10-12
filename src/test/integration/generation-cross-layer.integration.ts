vi.mock('server-only',()=>({}));
import {reviewedAttentionInput} from './attention-api';
import { deleteGeneratedDraftShift, publishScheduleWithRevision, insertShift, updateShift, setAvailabilityDeadline, reviewTimeOffRequest } from './management-api';
import { createHash } from 'node:crypto';
import { fixtureProof } from './shift-change-api';
import { managementProof } from '../fixtures/management';
import { generateWeekAction, clearGenerationExclusionAction } from '../../app/app/schedule/generation-actions';

import { getScheduleGenerationReview } from '../../lib/data/schedule-generation-review';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { createDisposableGenerationDatabase } from './local-postgres';
import { generateWeekDraft, readGenerationSnapshot } from '../../lib/data/schedule-generation';
import { listCapturedShiftPositions } from '../../lib/data/publication-revisions';
import { acknowledgeScheduleWeek } from '../../lib/data/acknowledgements';
import { personalProjections, readNotificationWeekState } from '../../lib/data/notification-transactions';

import { replaceWeeklyAvailability } from './self-service-api';

import { sqlNotificationStateRepository } from '../../lib/data/notification-state';
import type { SqlExecutor, SqlStatement } from '../../lib/notifications/types';

// Replace only the Neon transport for APIs without an executor parameter. Exact
// production tagged statements and transaction batches still execute in PostgreSQL.
const transport = vi.hoisted(() => ({ executor: null as SqlExecutor | null }));
vi.mock('../../lib/db', () => {
  const statement = (text: string, values: readonly unknown[] = []) => ({statement:{text,values},then:(yes:(rows:unknown[])=>unknown,no:(error:unknown)=>unknown)=>transport.executor!.query({text,values}).then(yes,no)});
  const tagged = Object.assign((strings:TemplateStringsArray,...values:unknown[])=>statement(strings.reduce((text,part,index)=>text+(index?'$'+index:'')+part,''),values), {
    query:statement, transaction:(queries:{statement:SqlStatement}[])=>transport.executor!.transaction(queries.map(q=>q.statement)),
  });
  return {getDb:()=>tagged,queryRows:(result:unknown)=>Array.isArray(result)?result:[]};
});
vi.mock('next/headers',()=>({cookies:async()=>({get:(name:string)=>name==='fuel_session'?{value:'fictional-task6-session'}:undefined})}));
vi.mock('next/navigation',()=>({redirect:(destination:string)=>{throw new Error(`redirect:${destination}`);}}));
vi.mock('next/cache',()=>({revalidatePath:()=>{}}));
let database: Awaited<ReturnType<typeof createDisposableGenerationDatabase>>;
const q = (text:string,values:readonly unknown[] = []) => database.executor.query<Record<string,unknown>>({text,values});
const request = {proof:managementProof('owner','OWNER'),workspaceId:'atelier',actorEmployeeId:'owner',weekStart:'2030-10-07',mode:'BUILD_WEEK' as const,locationScope:{kind:'ALL' as const}};
beforeAll(async()=>{database=await createDisposableGenerationDatabase();transport.executor=database.executor;});
afterAll(async()=>{await database?.dispose();});
beforeEach(async()=>{
  await database.dispose(); database=await createDisposableGenerationDatabase(); transport.executor=database.executor;
  await q("DELETE FROM location_staffing_settings; DELETE FROM locations; DELETE FROM workspaces; INSERT INTO workspaces(id,name,time_zone) VALUES('atelier','Fictional Northern Atelier','America/New_York'); INSERT INTO locations(id,workspace_id,clocker_key,name,short_name) VALUES('quay','atelier','north-quay','Quai Étoile','Quai'); INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('owner','Fictional','Owner','NONE','OWNER','quay')");
  await fixtureProof(database.executor,'owner');
});
async function ready() {
  await q("INSERT INTO location_staffing_settings(location_id,minimum_staff_per_shift,requires_designated_lead) VALUES('quay',1,false); INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES('window','quay',1,'08:00','12:00'); INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('worker','Fictional','Worker','NONE','EMPLOYEE','quay'); INSERT INTO employee_location_eligibility VALUES('worker','quay'); INSERT INTO availability_windows VALUES('normal','worker',1,'08:00','12:00')");
}
const generate = (executor = database.executor) => generateWeekDraft(request,executor);

it.each([1,3,5,20])('uses explicit New York database configuration with %i arbitrary locations and no invented setup', async count => {
  for(let index=1;index<count;index++) await q("INSERT INTO locations(id,workspace_id,clocker_key,name,short_name) VALUES($1,'atelier',$2,$3,$4)",[`studio-${index}`,`studio-${index}`,`Fictional Studio ${index}`,`S${index}`]);
  expect(await generate()).toMatchObject({changed:false,locationIds:[],excludedLocations:expect.any(Array)});
  expect(await q('SELECT * FROM location_staffing_settings')).toEqual([]);
  expect(await q('SELECT * FROM employee_location_eligibility')).toEqual([]);
  const locations = (await q('SELECT id FROM locations ORDER BY id')).map(row=>String(row.id));
  expect((await generate()).excludedLocations).toHaveLength(count);
  expect(await generateWeekDraft({...request,locationScope:{kind:'SELECTED',locationIds:locations}},database.executor)).toMatchObject({status:'INVALID',changed:false});
  await q("INSERT INTO positions(id,workspace_id,name) VALUES('craft','atelier','Craft specialist'),('host','atelier','Host')");
  // Two simultaneous quotas and minimum 2 require two people, not four; Lead is
  // independent of position. Each location has two explicit qualified humans.
  for(const [index,id] of locations.entries()) {
    await q('INSERT INTO location_staffing_settings(location_id,minimum_staff_per_shift,requires_designated_lead) VALUES($1,2,true)',[id]);
    await q("INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) VALUES($1,$2,1,'08:00','12:00')",[`window-${index}`,id]);
    for(const position of ['craft','host']) {
      const employee=`${index}-${position}`;
      await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES($1,'Fictional',$1,'NONE',$2,$3)",[employee,position==='craft'?'LEAD':'EMPLOYEE',id]);
      await q('INSERT INTO employee_location_eligibility VALUES($1,$2)',[employee,id]);
      await q('INSERT INTO employee_positions VALUES($1,$2)',[employee,position]);
      await q("INSERT INTO availability_windows VALUES($1,$1,1,'08:00','12:00')",[employee]);
      await q('INSERT INTO coverage_window_position_requirements VALUES($1,$2,1)',[`window-${index}`,position]);
    }
  }
  // Overlapping copies of the same configured quota must use the maximum,
  // never sum the same position across windows into extra invented demand.
  await q("INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) SELECT id||'-overlap',location_id,day_of_week,'09:00','11:00' FROM location_coverage_windows; INSERT INTO coverage_window_position_requirements SELECT coverage_window_id||'-overlap',position_id,quantity FROM coverage_window_position_requirements");
  const result = await generate();
  expect(result).toMatchObject({status:'COMPLETE',summary:{added:count*2,createdSchedules:count}});
  expect(result.locationIds).toEqual(locations);
  expect(await q('SELECT count(*)::integer n FROM shifts WHERE is_designated_lead')).toEqual([{n:count}]);
  expect(await q('SELECT count(DISTINCT employee_id)::integer n FROM shifts')).toEqual([{n:count*2}]);
  expect(await q('SELECT count(*)::integer n FROM shifts WHERE position_id IS NULL')).toEqual([{n:0}]);
  const snapshot = await readGenerationSnapshot(request,database.executor);
  expect(snapshot.input.workspace.timeZone).toBe('America/New_York');
  expect(snapshot.input.employees.filter(e=>e.id!=='owner').every(e=>e.maximumWeeklyHours===40)).toBe(true);
  expect(await q('SELECT count(*)::integer n FROM notifications')).toEqual([{n:0}]);
  expect(await generate()).toMatchObject({changed:false});
// This case runs the complete planner twice for up to 20 locations. Its runtime
// varies with runner CPU; planner work limits and every result assertion remain.
}, 30_000);

it.each(['manual-create','manual-edit','availability-submit','approved-leave','deadline-insert','actor-role'])('re-solves after actual %s business writer during solve-to-commit',async kind=>{
  await ready();
  await q("INSERT INTO schedules(id,location_id,week_start,created_by) VALUES('draft','quay','2030-10-07','owner')");
  if(kind==='manual-edit') await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('manual','draft','worker','2030-10-08','08:00','12:00')");
  if(kind==='approved-leave') await q("INSERT INTO time_off_requests(id,employee_id,start_date,end_date) VALUES('leave','worker','2030-10-07','2030-10-07')");
  let reads=0,attempts=0;
  const racing:SqlExecutor = {query:async<T,>(s:SqlStatement)=>{reads++;return database.executor.query<T>(s);},transaction:async statements=>{
    attempts++;
    if(attempts===1) {
      if(kind==='manual-create') await insertShift({scheduleId:'draft',employeeId:'worker',date:request.weekStart,startTime:'08:00',endTime:'12:00',actorEmployeeId:'owner'},database.executor);
      if(kind==='manual-edit') await updateShift({shiftId:'manual',employeeId:'worker',date:request.weekStart,startTime:'08:00',endTime:'12:00',actorEmployeeId:'owner'},database.executor);
      if(kind==='availability-submit') await replaceWeeklyAvailability('worker',request.weekStart,[],[1]);
      if(kind==='approved-leave') expect(await reviewTimeOffRequest({requestId:'leave',managerId:'owner',status:'APPROVED'},database.executor)).toBe(true);
      if(kind==='deadline-insert') await setAvailabilityDeadline({weekStart:request.weekStart,deadlineIso:'2030-10-01T12:00:00Z',updatedBy:'owner'});
      if(kind==='actor-role') await q("UPDATE employees SET role='EMPLOYEE' WHERE id='owner'");
    }
    return database.executor.transaction(statements);
  }};
  if(kind==='actor-role') await expect(generate(racing)).rejects.toThrow('active Owner or Manager');
  else {
    const result=await generate(racing);
    expect(result.summary.added).toBe(kind==='deadline-insert'?1:0);
    if(['availability-submit','approved-leave'].includes(kind)) expect(result.status).toBe('PARTIAL');
  }
  expect(reads).toBe(2);
  expect(attempts).toBe(kind==='actor-role'?1:2);
  expect(await q("SELECT count(*)::integer n FROM shifts WHERE assignment_origin='GENERATED'")).toEqual([{n:kind==='deadline-insert'?1:0}]);
});

it('generated draft publishes atomically later; promotion preserves history, acknowledgement, effective version and recipient access',async()=>{
  await ready(); await generate();
  expect(await q('SELECT count(*)::integer n FROM notifications')).toEqual([{n:0}]);
  expect(await q('SELECT count(*)::integer n FROM schedule_publication_revisions')).toEqual([{n:0}]);
  const publish=()=>publishScheduleWithRevision({locationId:'quay',weekStart:request.weekStart,managerId:'owner'},database.executor);
  // A real outbox failure must roll back all three: status, revision and intent.
  await q("ALTER TABLE notifications ADD CONSTRAINT task6_reject_intent CHECK(employee_id<>'worker')");
  try {
    await expect(publish()).rejects.toThrow('task6_reject_intent');
    expect(await q('SELECT status FROM schedules')).toEqual([{status:'DRAFT'}]);
    expect(await q('SELECT count(*)::integer n FROM schedule_publication_revisions')).toEqual([{n:0}]);
    expect(await q('SELECT count(*)::integer n FROM notifications')).toEqual([{n:0}]);
  } finally {await q('ALTER TABLE notifications DROP CONSTRAINT task6_reject_intent');}
  expect(await publish()).toMatchObject({published:true});
  expect(await q("SELECT count(*)::integer n FROM notifications WHERE employee_id='worker' AND source_kind='SCHEDULE' AND purpose='EVENT'")).toEqual([{n:1}]);
  expect(await acknowledgeScheduleWeek(await reviewedAttentionInput(database.executor,'worker',request.weekStart),database.executor)).toMatchObject({status:'committed'});
  const before=await readNotificationWeekState([request.weekStart],database.executor);
  const original=personalProjections(before,request.weekStart).worker;
  expect(original.acknowledgement).toMatchObject({acknowledged:true,needsAcknowledgement:false});
  const histories=()=>q("SELECT jsonb_build_object('revisions',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM schedule_publication_revisions t),'captures',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM schedule_publication_revision_shifts t),'acks',(SELECT jsonb_agg(to_jsonb(t) ORDER BY employee_id) FROM schedule_acknowledgements t),'intents',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM notifications t)) value");
  const history=await histories();
  expect(await generateWeekDraft({...request,weekStart:'2030-10-14'},database.executor)).toMatchObject({status:'COMPLETE',summary:{added:1}});
  expect(await histories()).toEqual(history);
  const id=String((await q("SELECT id FROM shifts WHERE date='2030-10-07'"))[0].id);
  expect(await updateShift({shiftId:id,employeeId:'worker',date:request.weekStart,startTime:'08:00',endTime:'12:00',actorEmployeeId:'owner'},database.executor)).toBe(true);
  expect(await q("SELECT assignment_origin,generated_claims FROM shifts WHERE date='2030-10-07'")).toEqual([{assignment_origin:'MANAGER',generated_claims:null}]);
  expect(await histories()).toEqual(history);
  const after=personalProjections(await readNotificationWeekState([request.weekStart],database.executor),request.weekStart).worker;
  expect(after.effectiveVersion).toBe(original.effectiveVersion);
  expect(after.acknowledgement).toEqual(original.acknowledgement);
  const repository=sqlNotificationStateRepository(database.executor);
  const recipient=await repository.recipientAccess('worker');
  expect(recipient).toMatchObject({employeeId:'worker',active:true,allowedLocationIds:['quay']});
  expect(await repository.recipientAccess('not-a-member')).toBeNull();
  expect(await q('SELECT count(*)::integer n FROM push_deliveries')).toEqual([{n:0}]);
});

it('batched historical position SQL retains omitted older captures, selects latest actual capture, and isolates the requested week',async()=>{
  await ready(); await generate();
  await q("INSERT INTO positions(id,workspace_id,name) VALUES('old','atelier','Archived role'),('new','atelier','Current role')");
  const shift=String((await q('SELECT id FROM shifts'))[0].id);
  for(const [id,week,revision] of [['r1','2030-10-07',1],['r2','2030-10-07',2],['r3','2030-10-07',3],['other','2030-10-14',99]] as const) {
    await q("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES($1,$2,$3,'PUBLISH','owner')",[id,week,revision]);
  }
  for(const [id,revision,source,position,label] of [['capture-old','r1',shift,'old','Captured old label'],['capture-latest','r2',shift,'new','Captured new label'],['omitted','r1','archived-source','old','Archived capture'],['foreign','other',shift,'old','Wrong week']]) {
    await q("INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,position_id,position_name) SELECT $1,$2,$3,schedule_id,'quay','worker','2030-10-07','08:00','12:00',$4,$5 FROM shifts LIMIT 1",[id,revision,source,position,label]);
  }
  await q("UPDATE positions SET name='Renamed current table role',active=false WHERE id='old'; UPDATE schedules SET status='ARCHIVED'");
  const statements:SqlStatement[]=[];
  const executor:SqlExecutor={...database.executor,query:async<T,>(s:SqlStatement)=>{statements.push(s);return database.executor.query<T>(s);}};
  expect(await listCapturedShiftPositions({weekStart:request.weekStart,shiftIds:[shift,'archived-source',shift,'missing']},executor)).toEqual([
    {sourceShiftId:'archived-source',positionId:'old',positionName:'Archived capture'},
    {sourceShiftId:shift,positionId:'new',positionName:'Captured new label'},
  ].sort((a,b)=>a.sourceShiftId.localeCompare(b.sourceShiftId)));
  expect(statements).toHaveLength(1);
  expect(await listCapturedShiftPositions({weekStart:request.weekStart,shiftIds:[]},executor)).toEqual([]);
  expect(statements).toHaveLength(1);
});


it('server actions use real session SQL, planner, writes and read-only review; clear permits a later explicit Fill',async()=>{
  await ready();
  await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'owner',now()+interval '1 day')",[createHash('sha256').update('fictional-task6-session').digest('hex')]);
  const form = new FormData();
  Object.entries({weekStart:request.weekStart,mode:'BUILD_WEEK',scope:'ALL','$ACTION_KEY':'fictional-transport'}).forEach(([key,value])=>form.set(key,value));
  const idle={status:'idle' as const,message:''};
  expect(await generateWeekAction(idle,form)).toMatchObject({status:'success',result:{status:'COMPLETE',summary:{added:1,attempted:1}}});
  const id=String((await q('SELECT id FROM shifts'))[0].id);
  const deleted=await deleteGeneratedDraftShift({...request,locationId:'quay',shiftId:id},database.executor);
  const review=await getScheduleGenerationReview(request);
  expect(review).toMatchObject({editable:true,attempted:1,exclusions:[{id:deleted.exclusionId,locationName:'Quai',date:request.weekStart,startTime:'08:00',endTime:'12:00'}]});
  expect(await q('SELECT count(*)::integer n FROM shifts')).toEqual([{n:0}]);
  expect(await generateWeekAction(idle,form)).toMatchObject({status:'success',result:{status:'PARTIAL',summary:{added:0}}});
  const clear=new FormData();
  Object.entries({weekStart:request.weekStart,locationId:'quay',exclusionId:deleted.exclusionId!}).forEach(([key,value])=>clear.set(key,value));
  expect(await clearGenerationExclusionAction(idle,clear)).toMatchObject({status:'success'});
  expect(await q('SELECT count(*)::integer n FROM shifts')).toEqual([{n:0}]);
  expect((await getScheduleGenerationReview(request)).exclusions).toEqual([]);
  form.set('mode','FILL_GAPS_ONLY');
  expect(await generateWeekAction(idle,form)).toMatchObject({status:'success',result:{status:'COMPLETE',summary:{added:1}}});
  const before=await q('SELECT to_jsonb(t) row FROM shifts t');
  form.set('actorEmployeeId','forged');
  expect(await generateWeekAction(idle,form)).toMatchObject({status:'error'});
  expect(await q('SELECT to_jsonb(t) row FROM shifts t')).toEqual(before);
  expect(await q('SELECT count(*)::integer n FROM notifications')).toEqual([{n:0}]);
  expect(await q('SELECT count(*)::integer n FROM schedule_publication_revisions')).toEqual([{n:0}]);
  await q("UPDATE employees SET role='EMPLOYEE' WHERE id='owner'");
  await expect(generateWeekAction(idle,form)).rejects.toThrow('redirect:/app');
});

it.each(['INACTIVE','NEEDS_SETUP'].flatMap(state=>['PUBLISHED','ARCHIVED'].map(status=>({state,status}))))('real All action and initial review preserve excluded $state/$status and public setup reasons',async({state,status})=>{
  await ready();
  await q("INSERT INTO locations(id,workspace_id,clocker_key,name,short_name,active) VALUES('annex','atelier','annex','Fictional Annex','Annex',$1);",[state!=='INACTIVE']);
  await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('excluded-parent','annex','2030-10-07',$1,'owner')",[status]);
  await q("INSERT INTO employee_location_eligibility VALUES('worker','annex')");
  await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'owner',now()+interval '1 day')",[createHash('sha256').update('fictional-task6-session').digest('hex')]);
  const parent=await q("SELECT to_jsonb(t) row FROM schedules t WHERE id='excluded-parent'");
  const initial=await getScheduleGenerationReview(request);
  expect(initial).toMatchObject({editable:true,attempted:1,needsSetup:1,setupExceptions:[{locationName:'Annex'}]});
  const form=new FormData();Object.entries({weekStart:request.weekStart,mode:'BUILD_WEEK',scope:'ALL'}).forEach(([k,v])=>form.set(k,v));
  const result=await generateWeekAction({status:'idle',message:''},form);
  expect(result).toMatchObject({status:'success',result:{status:'COMPLETE',summary:{attempted:1,needsSetup:1,added:1},setupExceptions:[{locationName:'Annex'}]}});
  expect(result.result?.setupExceptions).toEqual(initial.setupExceptions);
  if(state==='NEEDS_SETUP')expect(result.result?.setupExceptions?.[0].issues).toEqual([{message:'Configure minimum staffing and choose a designated Lead rule.',href:'/app/schedule/settings',label:'Scheduling rules'},{message:'Configure at least one valid coverage period.',href:'/app/schedule/settings',label:'Scheduling rules'}]);
  expect(await q("SELECT to_jsonb(t) row FROM schedules t WHERE id='excluded-parent'")).toEqual(parent);
  expect(JSON.stringify(result)).not.toMatch(/token_hash|phone|employeeId|claims|STAFFING_NOT_CONFIGURED/);
});
