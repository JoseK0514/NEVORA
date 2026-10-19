import { expect, it, vi } from 'vitest';
vi.mock('@/lib/db', () => ({getDb: () => { throw new Error('Unexpected database'); }, queryRows: (rows: unknown) => rows}));
import { sqlNotificationStateRepository as productionStateRepository, evaluateNotificationSource as evaluateWithPolicy } from './notification-state';
import type { NotificationIntent, SqlExecutor, SqlStatement } from '../notifications/types';
const row = { id: 'notification', employee_id: 'employee', type: 'TIME_OFF_DECIDED', title: 'Generic', body: 'Generic', event_key: 'event', environment: 'test', source_kind: 'TIME_OFF', source_id: 'request', source_version: 'v1', effective_version: 'v1', purpose: 'EVENT', urgency: 'normal', due_at: '2026-10-02T12:00:00Z', expires_at: '2026-10-03T12:00:00Z', item_keys: [] };
function setup(rows: unknown[]) { const statements: SqlStatement[] = []; const executor: SqlExecutor = { query: async <T>(statement: SqlStatement) => { statements.push(statement); return rows as T[]; }, transaction: async () => { throw new Error('No business mutations permitted'); } }; return { state: sqlNotificationStateRepository(executor), statements }; }
it('persisted_intent_maps_existing_outbox_and_uses_bound_id', async () => { const s = setup([row]); expect(await s.state.findIntent('notification')).toMatchObject({ id: 'notification', employeeId: 'employee', environment: 'test', source: { kind: 'TIME_OFF', id: 'request', version: 'v1' }, effectiveVersion: 'v1' }); expect(s.statements[0].values).toEqual(['notification']); expect(s.statements[0].text).toContain('cancelled_at IS NULL'); });
it.each([{ ...row, environment: 'unknown' }, { ...row, source_kind: 'unknown' }, { ...row, due_at: 'invalid' }, { ...row, expires_at: 'invalid' }])('invalid_persisted_intent_fails_closed', async (invalid) => { expect(await setup([invalid]).state.findIntent('notification')).toBeNull(); });
it('recipient_access_reads_current_role_activation_and_location_eligibility', async () => { const s = setup([{ id: 'employee', role: 'LEAD', active: false, allowed_location_ids: ['2'] }]); expect(await s.state.recipientAccess('employee')).toEqual({ employeeId: 'employee', role: 'LEAD', active: false, allowedLocationIds: ['2'] }); expect(s.statements[0].values).toEqual(['employee']); expect(s.statements[0].text).toContain('employee_location_eligibility'); });

const access = {employeeId:'employee',role:'EMPLOYEE' as const,active:true,allowedLocationIds:['2']};
const now = new Date('2026-10-05T12:00:00Z');
const intent: NotificationIntent = {id:'n',employeeId:'employee',type:'AVAILABILITY_REMINDER',title:'Generic',body:'Generic',eventKey:'e',environment:'test',source:{kind:'AVAILABILITY',id:'2026-10-05',version:'2026-10-06T12:00:00.000Z'},effectiveVersion:'2026-10-06T12:00:00.000Z',purpose:'REMINDER',urgency:'normal',dueAt:now.toISOString(),expiresAt:'2026-10-06T12:00:00.000Z'};
const availability = {kind:'AVAILABILITY' as const,source:intent.source as {kind:'AVAILABILITY';id:string;version:string},updatedAt:now.toISOString(),settings:{weekStart:'2026-10-05',availabilityDeadline:intent.expiresAt},submissions:[]};
it('zero_hour_submission_is_not_missing',()=>{
 const source = {...availability,submissions:[{employeeId:'employee',employeeName:'Test',submitted:true,state:'SUBMITTED_UNAVAILABLE' as const,windowCount:0}]};
 expect(evaluateNotificationSource(intent,access,source,now).deliverable).toBe(false);
 expect(evaluateNotificationSource(intent,access,availability,now).deliverable).toBe(true);
});
it.each(['2026-10-07T12:00:00.000Z',undefined])('edited_or_removed_deadline_cancels_old_reminder %s', deadline => {
 const source = {...availability,source:{...availability.source,version:deadline ?? 'removed'},settings:{...availability.settings,availabilityDeadline:deadline}};
 expect(evaluateNotificationSource(intent,access,source,now).deliverable).toBe(false);
});
it('quiet_deferral_past_deadline_expires',()=>{
 const early = {...intent,expiresAt:'2026-10-06T10:00:00Z'};
 expect(evaluateNotificationSource(early,access,availability,new Date('2026-10-06T01:00:00Z')).deliverable).toBe(false);
});
it.each([{...access,active:false},{...access,role:'MANAGER' as const}])('current_active_self_service_role_required',recipient=>{
 expect(evaluateNotificationSource(intent,recipient,availability,now).deliverable).toBe(false);
});
it('request_status_version_and_persisted_outcome_expiry_are_authoritative',()=>{
 const request = {kind:'TIME_OFF' as const,source:{kind:'TIME_OFF' as const,id:'r',version:'APPROVED'},updatedAt:'2020-01-01T00:00:00Z',record:{id:'r',employeeId:'employee',employeeName:'Test',status:'APPROVED' as const,startDate:'2026-10-09',endDate:'2026-10-09',createdAt:'2020-01-01T00:00:00Z'}};
 const outcome = {...intent,source:request.source,effectiveVersion:'APPROVED',purpose:'EVENT' as const};
 expect(evaluateNotificationSource(outcome,access,request,now)).toMatchObject({deliverable:true,expiresAt:intent.expiresAt,destination:'/app/requests?tab=my&requestId=r'});
 expect(evaluateNotificationSource({...outcome,effectiveVersion:'PENDING'},access,request,now).deliverable).toBe(false);
 expect(evaluateNotificationSource(outcome,access,request,new Date(intent.expiresAt)).deliverable).toBe(false);
});
it('individual_summary_seeds_are_never_deliverable',()=>{
 expect(evaluateNotificationSource({...intent,purpose:'SUMMARY'}, {...access,role:'MANAGER'},availability,new Date('2026-10-06T13:00:00Z')).deliverable).toBe(false);
});

it('availability_reader_resolves_normal_hours_and_dated_overrides_but_uses_submission_markers',async()=>{
 const s=setup([{deadline:'2026-10-06T12:00:00Z',updated_at:'2026-10-01T12:00:00Z',employees:[{employeeId:'employee',employeeName:'Test'}],normal:[{employee_id:'employee',day_of_week:1,start_time:'08:00',end_time:'16:00'},{employee_id:'employee',day_of_week:2,start_time:'08:00',end_time:'16:00'}],weekly:[],submissions:[{employee_id:'employee',week_start:'2026-10-05',uses_normal_availability:true,submitted_at:'2026-10-01T12:00:00Z'}],exceptions:[{employee_id:'employee',date:'2026-10-05',kind:'UNAVAILABLE'}]}]);
 const source=await s.state.readSource(availability.source);
 expect(source).toMatchObject({kind:'AVAILABILITY',source:{version:'2026-10-06T12:00:00.000Z'},submissions:[{employeeId:'employee',submitted:true,windowCount:1}]});
 expect(await setup([{deadline:null}]).state.readSource(availability.source)).toBeNull();
});
it('read_source_reconstructs_current_persisted_uppercase_request_status',async()=>{
 const s=setup([{id:'r',employee_id:'employee',employee_name:'Test',start_date:'2026-10-09',end_date:'2026-10-09',status:'DENIED',created_at:'2026-10-01T12:00:00Z'}]);
 expect(await s.state.readSource({kind:'TIME_OFF',id:'r',version:'PENDING'})).toMatchObject({source:{kind:'TIME_OFF',id:'r',version:'DENIED'},updatedAt:'2026-10-01T12:00:00Z'});
});

import { fixture } from './request-notification-fixtures.test-support';
it('unchanged_personal_revision_keeps_followup_budget_and_acknowledgement_equivalence',async()=>{
 const f=fixture('TIME_OFF');
 const first=f.state.revisions[0];
 f.state.revisions.push({...first,id:'r2',revisionNumber:2,createdAt:'2030-10-08T11:00:00Z',shifts:[...first.shifts,{...first.shifts[0],sourceShiftId:'s2',employeeId:'F'}]});
 f.executor.query=async <T>(s:SqlStatement)=>(s.text.includes('AS state')?[{state:f.state}]:[{id:'E',role:'EMPLOYEE',active:true,allowed_location_ids:['L']}]) as T[];
 const repo=sqlNotificationStateRepository(f.executor);
 const source=await repo.readSource({kind:'SCHEDULE',id:'2030-10-07',version:'r1'});
 expect(source).toMatchObject({employeePublications:{E:{effectiveVersion:'r1',publishedAt:'2030-10-07T11:00:00Z'}}});
 const reminder:NotificationIntent={...intent,employeeId:'E',source:{kind:'SCHEDULE',id:'2030-10-07',version:'r1'},effectiveVersion:'r1',dueAt:'2030-10-08T11:00:00Z',expiresAt:'2030-10-11T13:00:00Z'};
 expect((await repo.check(reminder,'E',new Date('2030-10-08T12:00:00Z'))).deliverable).toBe(true);
 f.state.acknowledgements.push({employeeId:'E',weekStart:'2030-10-07',revisionId:'r1'});
 expect((await repo.check(reminder,'E',new Date('2030-10-08T12:00:00Z'))).deliverable).toBe(false);
});
it.each(['filled','cancelled','expired','target_access_lost'] as const)('exchange latest source stops delivery: %s',async reason=>{
 const f=fixture('EXCHANGE','EMPLOYEE_PENDING');
 if(reason==='cancelled')f.row.status='CANCELLED';
 if(reason==='expired')f.row.source_date='2026-10-01';
 const exchange=await sqlNotificationStateRepository(f.executor).readSource({kind:'EXCHANGE',id:'request-1',version:'EMPLOYEE_PENDING'});
 const receiver={employeeId:'F',role:'LEAD' as const,active:true,allowedLocationIds:reason==='target_access_lost'?[]:['L']};
 const notification={...intent,employeeId:'F',source:{kind:'EXCHANGE' as const,id:'request-1',version:'EMPLOYEE_PENDING'},effectiveVersion:'EMPLOYEE_PENDING',purpose:'EVENT' as const};
 if(reason==='filled' && exchange?.kind==='EXCHANGE') exchange.record.status='APPROVED',exchange.source.version='APPROVED';
 expect(evaluateNotificationSource(notification,receiver,exchange,now).deliverable).toBe(false);
});
it('configured_coverage_uses_health_lead_rules_and_never_invents_location_windows',async()=>{
 const f=fixture('TIME_OFF');f.state.shifts=[];
 let windows:unknown[]=[];
 f.executor.query=async <T>(s:SqlStatement)=>(s.text.includes('AS state')?[{state:f.state}]:s.text.includes('FROM employees e')?[{id:'F',name:'Sam',role:'LEAD',active:true,eligibleLocationIds:['110'],positionIds:[]}]:s.text.includes('FROM positions')?[]:s.text.includes('location_staffing_settings')?[{id:'110',name:'FUEL – 110',minimumStaffPerShift:2,requiresDesignatedLead:true}]:windows) as T[];
 const repo=sqlNotificationStateRepository(f.executor);
 const ref={kind:'MANAGER_SUMMARY' as const,id:'2030-10-07',version:'configured'};
 expect(await repo.readSource(ref)).toMatchObject({items:[]});
 windows=[{ positionRequirements: [], locationId:'110',dayOfWeek:1,startTime:'08:00',endTime:'12:00',minimumStaff:2}];
 const source=await repo.readSource(ref);
 expect(source).toMatchObject({items:[{type:'COVERAGE_GAP',dateTime:'2030-10-07T08:00',locationId:'110'}]});
 expect(source?.kind==='MANAGER_SUMMARY'&&source.items).toHaveLength(1);
 f.state.shifts=[{...f.state.revisions[0].shifts[0],sourceShiftId:'s',scheduleId:'a',weekStart:'2030-10-07',hasExchangeHistory:false,locationId:'110',date:'2030-10-07',startTime:'08:00',endTime:'12:00',employeeId:'F',isDesignatedLead:true}];
 windows=[{ positionRequirements: [], locationId:'110',dayOfWeek:1,startTime:'08:00',endTime:'12:00',minimumStaff:1}];
 expect(await repo.readSource(ref)).toMatchObject({items:[]});
 f.state.shifts[0].isDesignatedLead=false;
 expect(await repo.readSource(ref)).toMatchObject({items:[{type:'COVERAGE_GAP',title:'No lead scheduled at FUEL – 110'}]});
});
it('bounded_candidates_use_only_actual_configured_records',async()=>{
 const s=setup([]);
 expect(await s.state.listReminderCandidates(now,100000)).toEqual([]);
 expect(s.statements[0].values).toEqual(['2026-10-05T12:00:00.000Z','2026-10-05',100]);
});
it('manager_group_revalidates_each_member_and_keeps_only_unresolved_work',async()=>{
 const keys=['a','b'].map(id=>JSON.stringify(['TIME_OFF',id,'PENDING',`TIME_OFF:${id}`,'2026-10-05']));
 const groupRow={...row,id:'group',employee_id:'M',source_kind:'MANAGER_SUMMARY',source_id:'group',source_version:'group-v',effective_version:'group-v',purpose:'SUMMARY',due_at:'2026-10-05T12:00:00Z',expires_at:'2026-10-08T12:00:00Z',item_keys:keys};
 let resolved=false;
 const executor:SqlExecutor={query:async<T>(s:SqlStatement)=>{
  if(s.text.includes('SELECT * FROM notifications'))return [groupRow] as T[];
  if(s.text.includes('allowed_location_ids'))return [{id:'M',role:'MANAGER',active:true,allowed_location_ids:[]}] as T[];
  return [{id:s.values[0],employee_id:'employee',employee_name:'Test',start_date:'2026-10-08',end_date:'2026-10-08',status:s.values[0]==='a'||resolved?'APPROVED':'PENDING',created_at:'2020-01-01T00:00:00Z'}] as T[];
 },transaction:async()=>{throw new Error('No writes');}};
 const repo=sqlNotificationStateRepository(executor);const group=await repo.findIntent('group');
 expect(await repo.readSource(group!.source)).toMatchObject({items:[{id:'TIME_OFF:b'}],expiresAt:'2026-10-08T12:00:00.000Z'});
 expect(await repo.check(group!,'M',now)).toMatchObject({deliverable:true,destination:'/app/requests?tab=pending&requestId=b',expiresAt:'2026-10-08T12:00:00.000Z'});
 resolved=true;
 expect((await repo.check(group!,'M',now)).deliverable).toBe(false);
});
it('archived_assignments_do_not_fill_configured_coverage',async()=>{
 const f=fixture('TIME_OFF');f.state.schedules[0].status='ARCHIVED';
 f.state.shifts[0].date='2030-10-07';f.state.shifts[0].employeeId='F';
 f.executor.query=async<T>(s:SqlStatement)=>(s.text.includes('AS state')?[{state:f.state}]:s.text.includes('location_staffing_settings')?[{id:'L',name:'Location',minimumStaffPerShift:1,requiresDesignatedLead:false}]:[{ positionRequirements: [], locationId:'L',dayOfWeek:1,startTime:'09:00',endTime:'17:00',minimumStaff:1}]) as T[];
 const source=await sqlNotificationStateRepository(f.executor).readSource({kind:'MANAGER_SUMMARY',id:'2030-10-07',version:'configured'});
 expect(source?.kind==='MANAGER_SUMMARY'&&source.items).toHaveLength(1);
});
it.each(['removed','reassigned'] as const)('former_authorized_assignee_can_open_genuine_change_after_assignment_is_%s',async change=>{
 const f=fixture('TIME_OFF');const old=f.state.revisions[0];
 f.state.revisions.push({...old,id:'r2',revisionNumber:2,createdAt:'2030-10-08T11:00:00Z',shifts:change==='removed'?[]:[{...old.shifts[0],employeeId:'F'}]});
 let allowed=['L'];
 f.executor.query=async<T>(s:SqlStatement)=>(s.text.includes('AS state')?[{state:f.state}]:[{id:'E',role:'EMPLOYEE',active:true,allowed_location_ids:allowed}]) as T[];
 const repo=sqlNotificationStateRepository(f.executor);
 const event:NotificationIntent={...intent,employeeId:'E',source:{kind:'SCHEDULE',id:'2030-10-07',version:'r2'},effectiveVersion:'r2',purpose:'EVENT',dueAt:'2030-10-08T11:00:00Z',expiresAt:'2030-10-14T04:00:00Z'};
 expect(await repo.check(event,'E',new Date('2030-10-08T12:00:00Z'))).toMatchObject({deliverable:true,destination:'/app/schedule?week=2030-10-07'});
 expect((await repo.check({...event,purpose:'REMINDER'},'E',new Date('2030-10-08T12:00:00Z'))).deliverable).toBe(false);
 allowed=[];
 expect((await repo.check(event,'E',new Date('2030-10-08T12:00:00Z'))).deliverable).toBe(false);
});
it('candidate_hydration_checks_budget_before_starting_each_source',async()=>{
 let hydrating=0;let allowed=true;
 const executor:SqlExecutor={query:async<T>(s:SqlStatement)=>{
  if(s.text.includes('SELECT kind,id'))return [{kind:'AVAILABILITY',id:'2026-10-05'},{kind:'AVAILABILITY',id:'2026-10-12'}] as T[];
  hydrating++;allowed=false;return [];
 },transaction:async()=>[]};
 const repo=sqlNotificationStateRepository(executor);
 await repo.listReminderCandidates(now,10,()=>allowed);
 expect(hydrating).toBe(1);
});

it('position-only configured coverage reaches the manager summary with position copy',async()=>{
 const f=fixture('TIME_OFF');
 f.state.shifts=[{...f.state.revisions[0].shifts[0],sourceShiftId:'s',scheduleId:'a',weekStart:'2030-10-07',hasExchangeHistory:false,locationId:'110',date:'2030-10-07',startTime:'08:00',endTime:'12:00',employeeId:'F',isDesignatedLead:true}];
 f.executor.query=async <T>(s:SqlStatement)=>(s.text.includes('AS state')?[{state:f.state}]:s.text.includes('location_staffing_settings')?[{id:'110',name:'Shop',minimumStaffPerShift:1,requiresDesignatedLead:true}]:s.text.includes('FROM employees e')?[{id:'F',name:'Sam',role:'LEAD',active:true,eligibleLocationIds:['110'],positionIds:['b']}]:s.text.includes('FROM positions')?[{id:'b',name:'Barista',workspaceId:'w',active:true}]:[{locationId:'110',dayOfWeek:1,startTime:'08:00',endTime:'12:00',positionRequirements:[{positionId:'b',quantity:1}]}]) as T[];
 const source=await sqlNotificationStateRepository(f.executor).readSource({kind:'MANAGER_SUMMARY',id:'2030-10-07',version:'configured'});
 expect(source).toMatchObject({items:[{title:'Position not covered at Shop',detail:expect.stringContaining('Barista: 1 open')}]});
});

it.each([['2026-03-08','02:30','04:00'],['2026-11-01','01:30','03:00'],['2026-11-01','00:30','01:30']])('invalid legacy DST boundaries suppress even publication events: %s %s–%s',(date,startTime,endTime)=>{
 const f=fixture('TIME_OFF'),first=f.state.revisions[0];
 const shift={...first.shifts[0],employeeId:'employee',locationId:'2',date,startTime,endTime};
 const source={kind:'SCHEDULE' as const,source:{kind:'SCHEDULE' as const,id:'2026-03-02',version:'r1'},updatedAt:'2026-03-01T12:00Z',revision:{...first,weekStart:'2026-03-02'},previousShifts:[],currentShifts:[shift],employeePublications:{employee:{effectiveVersion:'r1',publishedAt:'2026-03-01T12:00Z'}}};
 const event={...intent,source:source.source,effectiveVersion:'r1',purpose:'EVENT' as const,expiresAt:'2026-12-01T12:00Z'};
 expect(evaluateNotificationSource(event,access,source,new Date('2026-03-01T12:00Z'),{...policyForTests,timeZone:'America/New_York'}).deliverable).toBe(false);
});
import {DEFAULT_NOTIFICATION_POLICY as policyForTests} from '../notifications/policy';

const testWorkspace={id:'test-workspace',name:'Test',active:true,timeZone:'America/Puerto_Rico',createdAt:'',updatedAt:''};
function sqlNotificationStateRepository(executor:SqlExecutor) {
  return productionStateRepository({...executor,query:async<T>(statement:SqlStatement)=>statement.text.startsWith('SELECT id, name, time_zone') ? [testWorkspace] as T[] : statement.text.startsWith('SELECT id FROM locations WHERE id=ANY') ? (statement.values[0] as string[]).map(id=>({id})) as T[] : executor.query<T>(statement)},testWorkspace);
}

function evaluateNotificationSource(intent:Parameters<typeof evaluateWithPolicy>[0],recipient:Parameters<typeof evaluateWithPolicy>[1],source:Parameters<typeof evaluateWithPolicy>[2],now:Date,policy=policyForTests){return evaluateWithPolicy(intent,recipient,source,now,policy);}
