import { notificationPolicyFor as fixturePolicyFor } from './policy';
const fixtureNotificationPolicy=fixturePolicyFor('America/Puerto_Rico');
import { expect, it, vi } from 'vitest';
vi.mock('@/lib/db',()=>({getDb:()=>{throw new Error('Unexpected database');},queryRows:(rows:unknown)=>rows}));
import { runReminders, planSourceReminders, buildSummaryGroup } from './reminders';
import { DEFAULT_NOTIFICATION_POLICY as policy } from './policy';
import { readNotificationConfig as readRuntimeConfig } from './config';
import type { NotificationIntent, NotificationStateRepository, RecipientAccess, SourceSnapshot, SqlExecutor, SqlStatement } from './types';
const now = new Date('2026-10-05T12:00:00Z');
const employees: RecipientAccess[] = [{employeeId:'E',role:'EMPLOYEE',active:true,allowedLocationIds:['2']},{employeeId:'L',role:'LEAD',active:true,allowedLocationIds:['2']},{employeeId:'M',role:'MANAGER',active:true,allowedLocationIds:[],operationalCompany:true,operationalAuthority:'b'.repeat(64)}];
const availability: SourceSnapshot = {kind:'AVAILABILITY',source:{kind:'AVAILABILITY',id:'2026-10-05',version:'2026-10-06T12:00:00.000Z'},updatedAt:now.toISOString(),settings:{weekStart:'2026-10-05',availabilityDeadline:'2026-10-06T12:00:00.000Z'},submissions:[{employeeId:'E',employeeName:'E',submitted:true,state:'SUBMITTED_UNAVAILABLE',windowCount:0},{employeeId:'L',employeeName:'L',submitted:false,state:'NOT_SUBMITTED',windowCount:0}]};
it('zero_hour_submission_is_not_missing',()=>{
 expect(planSourceReminders(availability,employees,now,'test',policy).map(i=>i.employeeId)).toEqual(['L']);
});
it('quiet_deferral_past_deadline_expires',()=>{
 const source = {...availability,settings:{weekStart:'2026-10-05',availabilityDeadline:'2026-10-06T10:00:00Z'}};
 expect(planSourceReminders(source,employees,new Date('2026-10-06T01:00:00Z'),'test',policy)).toEqual([]);
});
it('late_invocations_keep_one_stable_followup_key_without_catchups',()=>{
 const early = planSourceReminders(availability,employees,now,'test',policy);
 const late = planSourceReminders(availability,employees,new Date('2026-10-06T11:00:00Z'),'test',policy);
 expect(late).toHaveLength(1); expect(late[0].eventKey).toBe(early[0].eventKey);
});
it('unchanged_personal_revision_keeps_followup_budget',()=>{
 const shift = {sourceShiftId:'s',employeeId:'E',locationId:'2',date:'2026-10-07',startTime:'09:00',endTime:'17:00',isDesignatedLead:false,isCalloutApproved:false};
 const source: SourceSnapshot = {kind:'SCHEDULE',source:{kind:'SCHEDULE',id:'2026-10-05',version:'r2'},updatedAt:now.toISOString(),revision:{id:'r2',revisionNumber:2,weekStart:'2026-10-05',sourceType:'PUBLISH',createdBy:'M',createdAt:now.toISOString()},previousShifts:[shift],currentShifts:[shift],employeePublications:{E:{effectiveVersion:'r1',publishedAt:'2026-10-04T12:00:00Z'}}};
 const [reminder] = planSourceReminders(source,employees,now,'test',policy);
 expect(reminder).toMatchObject({effectiveVersion:'r1',dueAt:'2026-10-05T12:00:00.000Z',purpose:'REMINDER'});
 expect(planSourceReminders(source,employees,new Date('2026-10-06T12:00:00Z'),'test',policy)[0].eventKey).toBe(reminder.eventKey);
});
it('one_closed_summary_budget_per_actual_deadline_version',()=>{
 const first = buildSummaryGroup([{source:availability,expiresAt:'2026-10-09T12:00:00Z'}],employees[2],new Date('2026-10-06T13:00:00Z'),'test',policy,new Set());
 expect(first?.itemKeys).toHaveLength(1);
 expect(buildSummaryGroup([{source:availability,expiresAt:'2026-10-09T12:00:00Z'}],employees[2],new Date('2026-10-07T13:00:00Z'),'test',policy,new Set(first?.itemKeys))).toBeNull();
});
it('new_distinct_pending_items_group_without_repeating_consumed_items',()=>{
 const request = (id:string): SourceSnapshot => ({kind:'TIME_OFF',source:{kind:'TIME_OFF',id,version:'PENDING'},updatedAt:'2020-01-01T00:00:00Z',record:{id,employeeId:'E',employeeName:'E',status:'PENDING',startDate:'2026-10-08',endDate:'2026-10-08',createdAt:'2020-01-01T00:00:00Z'}});
 const first = buildSummaryGroup([{source:request('a'),expiresAt:'2026-10-08T12:00:00Z'}],employees[2],now,'test',policy,new Set())!;
 const second = buildSummaryGroup(['a','b'].map(id=>({source:request(id),expiresAt:'2026-10-08T12:00:00Z'})),employees[2],now,'test',policy,new Set(first.itemKeys))!;
 expect(second.itemKeys).toHaveLength(1); expect(second.itemKeys?.[0]).toContain('"b"'); expect(second.source.kind).toBe('MANAGER_SUMMARY');
});
it('resolved_source_cancels_due_reminder_and_claimed_deliveries',async()=>{
 const [intent] = planSourceReminders(availability,employees,now,'test',policy);
 const batches: readonly SqlStatement[][] = [];
 const saved: SqlStatement[][] = batches as SqlStatement[][];
 const executor: SqlExecutor = {query: async <T>(s:SqlStatement) => (s.text.includes('SELECT id FROM notifications')?[{id:intent.id}]:[]) as T[],transaction:async statements=>{saved.push([...statements]);return statements.map(()=>[]);}};
 const state: NotificationStateRepository = {findIntent:async()=>intent,recipientAccess:async()=>employees[1],readSource:async()=>null,listReminderCandidates:async()=>[],check:async()=>({deliverable:false,reason:'availability_resolved',effectiveVersion:intent.effectiveVersion,expiresAt:intent.expiresAt})};
 const config = {...readNotificationConfig({}),featureEnabled:true};
 const result = await runReminders({state,executor,config,clock:()=>now});
 expect(result.cancelled).toBe(1); expect(saved.flat().some(s=>s.text.includes('push_deliveries') && s.values.includes(intent.id))).toBe(true);
});
it('disabled_scanner_has_no_database_or_provider_work',async()=>{
 const executor = {query:vi.fn(),transaction:vi.fn()} as unknown as SqlExecutor;
 const state = {} as NotificationStateRepository;
 expect((await runReminders({state,executor,config:readNotificationConfig({}),clock:()=>now})).disabled).toBe(true);
 expect(executor.query).not.toHaveBeenCalled();
});
it('consumed_urgent_item_cannot_make_new_routine_work_urgent',()=>{
 const urgent:SourceSnapshot={kind:'MANAGER_SUMMARY',source:{kind:'MANAGER_SUMMARY',id:'2026-10-05',version:'configured'},updatedAt:'',weekStart:'2026-10-05',expiresAt:'2026-10-06T00:00:00Z',items:[{id:'gap',type:'COVERAGE_GAP',title:'Coverage',detail:'',priority:'URGENT',href:'/app/schedule?week=2026-10-05',dateTime:'2026-10-05T12:00'}]};
 const pending:SourceSnapshot={kind:'TIME_OFF',source:{kind:'TIME_OFF',id:'new',version:'PENDING'},updatedAt:'',record:{id:'new',employeeId:'E',employeeName:'E',status:'PENDING',startDate:'2026-10-08',endDate:'2026-10-08',createdAt:now.toISOString()}};
 const first=buildSummaryGroup([{source:urgent,expiresAt:urgent.expiresAt}],employees[2],now,'test',policy,new Set())!;
 const next=buildSummaryGroup([{source:urgent,expiresAt:urgent.expiresAt},{source:pending,expiresAt:'2026-10-08T12:00:00Z'}],employees[2],now,'test',policy,new Set(first.itemKeys));
 expect(next?.urgency).toBe('normal');
});
it('overlap_conflict_rebuilds_group_with_only_new_items_and_never_dispatches_seeds',async()=>{
 const make=(id:string):NotificationIntent=>({id,employeeId:'M',type:'MANAGER_REVIEW',title:'Review',body:'Generic',eventKey:id,environment:'test',source:{kind:'TIME_OFF',id,version:'PENDING'},effectiveVersion:'PENDING',purpose:'SUMMARY',urgency:'normal',dueAt:'2026-10-05T11:55:00Z',expiresAt:'2026-10-08T12:00:00Z'});
 const seeds=[make('a'),make('b')];const consumed:string[]=[];const batches:SqlStatement[][]=[];
 const executor:SqlExecutor={query:async<T>(s:SqlStatement)=>(s.text.includes('SELECT id FROM notifications')?seeds.map(i=>({id:i.id})):s.text.includes('SELECT id FROM employees')?[{id:'M'}]:s.text.includes('unnest(item_keys)')?consumed.map(key=>({key})):[]) as T[],transaction:async statements=>{
  batches.push([...statements]);
  if(batches.length===1){const insert=statements.find(s=>s.text.includes('INSERT INTO notifications'))!;consumed.push((insert.values[16] as string[])[0]);throw Object.assign(new Error('notification_group_conflict'),{code:'22P02'});}
  return statements.map(()=>[]);
 }};
 const state:NotificationStateRepository={findIntent:async id=>seeds.find(i=>i.id===id)??null,recipientAccess:async()=>employees[2],readSource:async ref=>({kind:'TIME_OFF',source:{...ref,kind:'TIME_OFF'},updatedAt:'2020-01-01T00:00:00Z',record:{id:ref.id,employeeId:'E',employeeName:'E',status:'PENDING',startDate:'2026-10-08',endDate:'2026-10-08',createdAt:'2020-01-01T00:00:00Z'}}),check:async()=>{throw new Error('Seeds must not use dispatch check');},listReminderCandidates:async()=>[]};
 await runReminders({state,executor,config:{...readNotificationConfig({}),featureEnabled:true},clock:()=>now});
 expect(batches).toHaveLength(2);
 const inserts=batches.map(batch=>batch.find(s=>s.text.includes('INSERT INTO notifications'))!);
 expect(inserts.map(s=>s.values[8])).toEqual(['MANAGER_SUMMARY','MANAGER_SUMMARY']);
 expect(inserts[1].values[16]).toEqual([expect.stringContaining('"b"')]);
 expect(batches[1].some(s=>s.text.includes('manager-day:')&&s.values.includes('2026-10-05'))).toBe(true);
});
import { fixture } from '../data/request-notification-fixtures.test-support';
import { evaluateNotificationSource } from '../data/notification-state';
it('acknowledgement_racing_scanner_prevents_stale_reminder_insert',async()=>{
 const f=fixture('TIME_OFF'); const latest=f.state.revisions[0];const batches:SqlStatement[][]=[];
 const source:SourceSnapshot={kind:'SCHEDULE',source:{kind:'SCHEDULE',id:'2030-10-07',version:'r1'},updatedAt:latest.createdAt,revision:latest,previousShifts:latest.shifts,currentShifts:latest.shifts,employeePublications:{E:{effectiveVersion:'r1',publishedAt:latest.createdAt}}};
 f.state.acknowledgements.push({employeeId:'E',weekStart:'2030-10-07',revisionId:'r1'});
 const executor:SqlExecutor={query:async<T>(s:SqlStatement)=>(s.text.includes('AS state')?[{state:f.state}]:s.text.includes('SELECT id FROM employees')?[{id:'E'}]:[]) as T[],transaction:async statements=>{batches.push([...statements]);return statements.map(()=>[]);}};
 const state:NotificationStateRepository={findIntent:async()=>null,recipientAccess:async()=>f.state.recipients[0],readSource:async()=>source,listReminderCandidates:async()=>[source],check:async()=>{throw new Error('Unexpected');}};
 await runReminders({state,executor,config:{...readNotificationConfig({}),featureEnabled:true},clock:()=>new Date('2030-10-08T12:00:00Z')});
 expect(batches.flat().filter(s=>s.text.includes('INSERT INTO notifications'))).toHaveLength(0);
});
it('routine_configured_coverage_gets_a_persisted_five_minute_collection_time',()=>{
 const source:SourceSnapshot={kind:'MANAGER_SUMMARY',source:{kind:'MANAGER_SUMMARY',id:'2026-10-05',version:'configured'},updatedAt:'',weekStart:'2026-10-05',expiresAt:'2026-10-12T04:00:00Z',items:[{id:'gap',type:'COVERAGE_GAP',title:'Coverage',detail:'',priority:'URGENT',href:'/app/schedule?week=2026-10-05',dateTime:'2026-10-07T12:00'}]};
 const group=buildSummaryGroup([{source,expiresAt:source.expiresAt}],employees[2],now,'test',policy,new Set());
 expect(group).toMatchObject({urgency:'normal',dueAt:'2026-10-05T12:05:00.000Z'});
});

it('coverage_resolving_before_first_delivery_leaves_routine_seed_in_its_own_quiet_group',async()=>{
 const night=new Date('2026-10-06T02:00:00Z');
 const request:SourceSnapshot={kind:'TIME_OFF',source:{kind:'TIME_OFF',id:'leave',version:'PENDING'},updatedAt:'',record:{id:'leave',employeeId:'E',employeeName:'E',status:'PENDING',startDate:'2026-10-08',endDate:'2026-10-08',createdAt:'2026-10-05T12:00:00Z'}};
 const coverage:SourceSnapshot={kind:'EXCHANGE',source:{kind:'EXCHANGE',id:'coverage',version:'OPEN'},updatedAt:'',record:{id:'coverage',kind:'COVERAGE',status:'OPEN',requestedByEmployeeId:'E',requestedByName:'E',requestedByRole:'EMPLOYEE',createdAt:'2026-10-05T12:00:00Z',sourceShift:{id:'s',scheduleId:'sch',employeeId:'E',employeeName:'E',locationId:'2',locationName:'2',weekStart:'2026-10-05',date:'2026-10-06',startTime:'02:00',endTime:'10:00'}}};
 const seeds=[request,coverage].map(source=>({id:source.source.id,employeeId:'M',type:'MANAGER_REVIEW',title:'Review',body:'Generic',eventKey:source.source.id,environment:'test' as const,source:source.source,effectiveVersion:source.source.version,purpose:'SUMMARY' as const,urgency:source.kind==='EXCHANGE'?'high' as const:'normal' as const,dueAt:'2026-10-06T01:55:00Z',expiresAt:source.kind==='EXCHANGE'?'2026-10-06T06:00:00Z':'2026-10-08T12:00:00Z'}));
 const batches:SqlStatement[][]=[];
 const executor:SqlExecutor={query:async<T>(s:SqlStatement)=>(s.text.includes('SELECT id FROM notifications')?seeds.map(i=>({id:i.id})):[]) as T[],transaction:async statements=>{batches.push([...statements]);return statements.map(()=>[]);}};
 const state:NotificationStateRepository={findIntent:async id=>seeds.find(i=>i.id===id)??null,recipientAccess:async()=>employees[2],readSource:async ref=>ref.id==='leave'?request:coverage,listReminderCandidates:async()=>[],check:async()=>{throw new Error('seed');}};
 await runReminders({state,executor,config:{...readNotificationConfig({}),featureEnabled:true},clock:()=>night});
 const inserts=batches.flat().filter(s=>s.text.includes('INSERT INTO notifications'));
 expect(inserts).toHaveLength(2);
 const routine=inserts.find(s=>s.values[13]==='normal')!;
 expect(routine.values[14]).toBe('2026-10-06T11:00:00.000Z');expect(routine.values[15]).toBe('2026-10-08T12:00:00.000Z');
 expect(routine.values[16]).toEqual([expect.stringContaining('"leave"')]);
 expect(batches.find(batch=>batch.includes(routine))!.find(s=>s.text.includes("UPDATE notifications SET push_state='materialized'"))!.values[0]).toEqual(['leave']);
 expect(batches.find(batch=>batch.includes(routine))!.at(-1)?.text).toContain('notification_operational_authorization');
 const persisted:NotificationIntent={...seeds[0],id:String(routine.values[0]),source:{kind:'MANAGER_SUMMARY',id:String(routine.values[9]),version:String(routine.values[10])},effectiveVersion:String(routine.values[11]),urgency:'normal',dueAt:String(routine.values[14]),expiresAt:String(routine.values[15]),itemKeys:routine.values[16] as string[]};
 const surviving:SourceSnapshot={kind:'MANAGER_SUMMARY',source:{...persisted.source,kind:'MANAGER_SUMMARY'},updatedAt:persisted.dueAt,weekStart:'',expiresAt:persisted.expiresAt,items:[{id:'TIME_OFF:leave',type:'TIME_OFF',priority:'REVIEW',title:'Review',detail:'',href:'/app/requests?tab=pending&requestId=leave'}]};
 expect(evaluateNotificationSource(persisted,employees[2],surviving,night,policy)).toMatchObject({deliverable:true,expiresAt:'2026-10-08T12:00:00.000Z',destination:'/app/requests?tab=pending&requestId=leave'});
});

it('quiet_hour_consumption_lookup_includes_the_rebuilt_tomorrow_key_without_conflict_retries',async()=>{
 const night=new Date('2026-10-06T02:00:00Z');
 const source:SourceSnapshot={kind:'MANAGER_SUMMARY',source:{kind:'MANAGER_SUMMARY',id:'2026-10-05',version:'configured'},updatedAt:'',weekStart:'2026-10-05',expiresAt:'2026-10-12T04:00:00Z',items:[{id:'near',type:'COVERAGE_GAP',title:'Coverage',detail:'',priority:'URGENT',href:'/app/schedule?week=2026-10-05',dateTime:'2026-10-06T02:00'},{id:'far',type:'COVERAGE_GAP',title:'Coverage',detail:'',priority:'URGENT',href:'/app/schedule?week=2026-10-05',dateTime:'2026-10-08T12:00'}]};
 const consumed=[JSON.stringify(['MANAGER_SUMMARY','2026-10-05','configured','near','2026-10-05']),JSON.stringify(['MANAGER_SUMMARY','2026-10-05','configured','far','2026-10-06'])];let conflicts=0;
 const executor:SqlExecutor={query:async<T>(s:SqlStatement)=>(s.text.includes('SELECT id FROM employees')?[{id:'M'}]:s.text.includes('unnest(item_keys)')?consumed.filter(k=>(s.values[2] as string[]).includes(k)).map(key=>({key})):[]) as T[],transaction:async statements=>{
   const insert=statements.find(s=>s.text.includes('INSERT INTO notifications'));
   if(insert&&(insert.values[16] as string[]).some(k=>consumed.includes(k))){conflicts++;throw Object.assign(new Error('notification_group_conflict'),{code:'22P02'});}
   return statements.map(()=>[]);
 }};
 const state:NotificationStateRepository={findIntent:async()=>null,recipientAccess:async()=>employees[2],readSource:async()=>source,listReminderCandidates:async()=>[source],check:async()=>{throw new Error('none');}};
 await expect(runReminders({state,executor,config:{...readNotificationConfig({}),featureEnabled:true},clock:()=>night})).resolves.toBeDefined();expect(conflicts).toBe(0);
});

it('budget_stops_each_write_and_persisted_budgets_advance_to_later_accounts_next_run',async()=>{
 const accounts=Array.from({length:30},(_,i)=>`E${String(i).padStart(2,'0')}`);const stored=new Set<string>();const starts:number[]=[];let elapsed=0;
 const source:SourceSnapshot={...availability,submissions:accounts.map(employeeId=>({employeeId,employeeName:employeeId,submitted:false,state:'NOT_SUBMITTED',windowCount:0}))};
 const executor:SqlExecutor={query:async<T>(s:SqlStatement)=>(s.text.includes('SELECT id FROM employees')?accounts.filter(id=>!stored.has(id)).map(id=>({id})):[]) as T[],transaction:async statements=>{
   starts.push(elapsed);const insert=statements.find(s=>s.text.includes('INSERT INTO notifications'));if(insert)stored.add(String(insert.values[1]));elapsed+=1000;return statements.map(()=>[]);
 }};
 const state:NotificationStateRepository={findIntent:async()=>null,recipientAccess:async employeeId=>({employeeId,role:'EMPLOYEE',active:true,allowedLocationIds:['2']}),readSource:async()=>source,listReminderCandidates:async()=>[source],check:async()=>{throw new Error('none');}};
 const config={...readNotificationConfig({}),featureEnabled:true};
 await runReminders({state,executor,config,clock:()=>new Date(now.getTime()+elapsed)});
 expect(starts.every(t=>t<20000)).toBe(true);expect(stored.size).toBe(20);
 elapsed=0;starts.length=0;
 await runReminders({state,executor,config,clock:()=>new Date(now.getTime()+elapsed)});
 expect(stored.size).toBe(30);expect(starts.every(t=>t<20000)).toBe(true);
});

it('slow_access_lookups_make_progress_without_an_all_account_sweep',async()=>{
 const accounts=Array.from({length:30},(_,i)=>`E${String(i).padStart(2,'0')}`);const stored=new Set<string>();let elapsed=0;const unitStarts:number[]=[];
 const source:SourceSnapshot={...availability,submissions:accounts.map(employeeId=>({employeeId,employeeName:employeeId,submitted:false,state:'NOT_SUBMITTED',windowCount:0}))};
 const executor:SqlExecutor={query:async<T>(s:SqlStatement)=>{
   unitStarts.push(elapsed);
   if(!s.text.includes('SELECT id FROM employees'))return [];
   expect(s.text).toContain("n.purpose='REMINDER'");expect(s.text).toContain('n.environment=$1');expect(s.text).toContain('n.effective_version=');
   const budgets=JSON.parse(String(s.values[2]));expect(budgets.E29).toMatchObject({version:'2026-10-06T12:00:00.000Z',day:'2026-10-05'});
   return (s.values[1] as string[]).filter(id=>!stored.has(id)).map(id=>({id})) as T[];
 },transaction:async statements=>{unitStarts.push(elapsed);const insert=statements.find(s=>s.text.includes('INSERT INTO notifications'));if(insert)stored.add(String(insert.values[1]));elapsed+=1000;return statements.map(()=>[]);}};
 const state:NotificationStateRepository={findIntent:async()=>null,recipientAccess:async employeeId=>{unitStarts.push(elapsed);elapsed+=1000;return {employeeId,role:'EMPLOYEE',active:true,allowedLocationIds:['2']};},readSource:async()=>source,listReminderCandidates:async(_now,_limit,shouldContinue,visit)=>{if(shouldContinue?.()&&visit)await visit(source);return [];},check:async()=>{throw new Error('none');}};
 for(let run=0;run<3;run++){
  elapsed=0;unitStarts.length=0;
  await runReminders({state,executor,config:{...readNotificationConfig({}),featureEnabled:true},clock:()=>new Date(now.getTime()+elapsed)});
  expect(unitStarts.every(t=>t<20000)).toBe(true);expect(stored.size).toBe((run+1)*10);
 }
 expect(stored.has('E29')).toBe(true);
});
it('exhausted_budget_does_not_start_another_group_conflict_retry',async()=>{
 let elapsed=0;let lookups=0;let attempts=0;
 const source:SourceSnapshot={kind:'AVAILABILITY',source:{kind:'AVAILABILITY',id:'2026-10-05',version:'2026-10-05T11:00:00.000Z'},updatedAt:'',settings:{weekStart:'2026-10-05',availabilityDeadline:'2026-10-05T11:00:00.000Z'},submissions:[{employeeId:'E',employeeName:'E',submitted:false,state:'NOT_SUBMITTED',windowCount:0}]};
 const executor:SqlExecutor={query:async<T>(s:SqlStatement)=>{if(s.text.includes('unnest(item_keys)'))lookups++;return(s.text.includes('SELECT id FROM employees')?[{id:'M'}]:[]) as T[];},transaction:async()=>{attempts++;elapsed=20000;throw Object.assign(new Error('notification_group_conflict'),{code:'22P02'});}};
 const state:NotificationStateRepository={findIntent:async()=>null,recipientAccess:async()=>employees[2],readSource:async()=>source,listReminderCandidates:async()=>[source],check:async()=>{throw new Error('none');}};
 await runReminders({state,executor,config:{...readNotificationConfig({}),featureEnabled:true},clock:()=>new Date(now.getTime()+elapsed)});
 expect(attempts).toBe(1);expect(lookups).toBe(1);
});
it('outstanding_delivery_rechecks_do_not_starve_later_reminder_accounts',async()=>{
 const accounts=Array.from({length:30},(_,i)=>`E${String(i).padStart(2,'0')}`);const stored=new Map<string,NotificationIntent>();let elapsed=0;const starts:number[]=[];
 const source:SourceSnapshot={...availability,submissions:accounts.map(employeeId=>({employeeId,employeeName:employeeId,submitted:false,state:'NOT_SUBMITTED',windowCount:0}))};
 const executor:SqlExecutor={query:async<T>(s:SqlStatement)=>{
  starts.push(elapsed);
  if(s.text.includes('SELECT id FROM notifications'))return [...stored.values()].map(i=>({id:i.id})) as T[];
  return (s.text.includes('SELECT id FROM employees')?accounts.filter(id=>!stored.has(id)).map(id=>({id})):[]) as T[];
 },transaction:async statements=>{
  starts.push(elapsed);const insert=statements.find(s=>s.text.includes('INSERT INTO notifications'));
  if(insert){const employeeId=String(insert.values[1]);stored.set(employeeId,{...planSourceReminders(source,[{employeeId,role:'EMPLOYEE',active:true,allowedLocationIds:['2']}],now,'test',policy)[0],id:employeeId});}
  elapsed+=1000;return statements.map(()=>[]);
 }};
 const state:NotificationStateRepository={findIntent:async id=>{starts.push(elapsed);elapsed+=1000;return stored.get(id)??null;},recipientAccess:async employeeId=>{starts.push(elapsed);elapsed+=1000;return {employeeId,role:'EMPLOYEE',active:true,allowedLocationIds:['2']};},readSource:async()=>source,listReminderCandidates:async()=>[source],check:async intent=>{starts.push(elapsed);elapsed+=1000;return {deliverable:true,reason:'current',effectiveVersion:intent.effectiveVersion,expiresAt:intent.expiresAt};}};
 let previous=0;
 for(let run=0;run<5&&stored.size<30;run++){
  elapsed=0;starts.length=0;
  await runReminders({state,executor,config:{...readNotificationConfig({}),featureEnabled:true},clock:()=>new Date(now.getTime()+elapsed)});
  expect(starts.every(t=>t<20000)).toBe(true);expect(stored.size).toBeGreaterThan(previous);previous=stored.size;
 }
 expect(stored.size).toBe(30);
});
it('slow_summary_seed_collection_reserves_a_flush_budget_and_consumes_pending_seeds_across_runs',async()=>{
 const seeds=['a','b'].map(id=>({id,employeeId:'M',type:'MANAGER_REVIEW',title:'Review',body:'Generic',eventKey:id,environment:'test' as const,source:{kind:'TIME_OFF' as const,id,version:'PENDING'},effectiveVersion:'PENDING',purpose:'SUMMARY' as const,urgency:'normal' as const,dueAt:'2026-10-05T11:55:00Z',expiresAt:'2026-10-08T12:00:00Z'}));
 const consumed=new Set<string>();const persistedKeys=new Set<string>();let elapsed=0;const starts:number[]=[];let groupWrites=0;let sourceScans=0;
 const charge=()=>{starts.push(elapsed);elapsed+=1000;};
 const executor:SqlExecutor={query:async<T>(statement:SqlStatement)=>{
  charge();
  if(statement.text.includes('SELECT id FROM notifications'))return seeds.filter(seed=>!consumed.has(seed.id)).map(seed=>({id:seed.id})) as T[];
  if(statement.text.includes('unnest(item_keys)'))return [...persistedKeys].filter(key=>(statement.values[2] as string[]).includes(key)).map(key=>({key})) as T[];
  return [];
 },transaction:async statements=>{
  charge();const insert=statements.find(s=>s.text.includes('INSERT INTO notifications'))!;
  expect(insert.values[8]).toBe('MANAGER_SUMMARY');
  const keys=insert.values[16] as string[];
  expect(keys.some(key=>persistedKeys.has(key))).toBe(false);
  const consume=statements.find(s=>s.text.includes("UPDATE notifications SET push_state='materialized'"))!;
  for(const id of consume.values[0] as string[]){expect(keys.some(key=>JSON.parse(key)[1]===id)).toBe(true);consumed.add(id);}
  keys.forEach(key=>persistedKeys.add(key));groupWrites++;
  return statements.map(()=>[]);
 }};
 const state:NotificationStateRepository={findIntent:async id=>{charge();return seeds.find(seed=>seed.id===id)??null;},readSource:async ref=>{charge();return {kind:'TIME_OFF',source:{...ref,kind:'TIME_OFF'},updatedAt:'2026-10-05T11:50:00Z',record:{id:ref.id,employeeId:'E',employeeName:'E',status:'PENDING',startDate:'2026-10-08',endDate:'2026-10-08',createdAt:'2026-10-05T11:50:00Z'}};},recipientAccess:async()=>{charge();return employees[2];},check:async()=>{throw new Error('Pending seeds must use grouping');},listReminderCandidates:async(_now,_limit,shouldContinue)=>{expect(shouldContinue?.()).toBe(true);sourceScans++;charge();return [];}};
 for(const expectedConsumed of [1,2,2]){
  elapsed=0;starts.length=0;
  await runReminders({state,executor,config:{...readNotificationConfig({}),featureEnabled:true},clock:()=>new Date(now.getTime()+elapsed)});
  expect(consumed.size).toBe(expectedConsumed);expect(starts.every(start=>start<20000)).toBe(true);expect(elapsed).toBeLessThan(20000);
 }
 expect(groupWrites).toBe(2);expect(sourceScans).toBe(3);
});

// Explicit Puerto Rico fixture policy; production callers load the configured workspace.
function readNotificationConfig(env: Record<string,string|undefined>) {return {...readRuntimeConfig(env),policy:fixtureNotificationPolicy};}

it('coverage attention keeps one semantic budget per urgency stage across request revisions',()=>{
 const source:SourceSnapshot={kind:'EXCHANGE',source:{kind:'EXCHANGE',id:'coverage',version:'r:1'},updatedAt:now.toISOString(),semanticNeedKey:'["shift","episode",1]',record:{id:'coverage',requestRevision:1,kind:'COVERAGE',status:'OPEN',requestedByEmployeeId:'E',requestedByName:'',requestedByRole:'EMPLOYEE',createdAt:now.toISOString(),sourceShift:{id:'shift',scheduleId:'s',employeeId:'E',employeeName:'',locationId:'2',locationName:'',weekStart:'2026-10-05',date:'2026-10-05',startTime:'16:00',endTime:'20:00'}}};
 const input={source,expiresAt:'2026-10-05T20:00:00Z',seedId:'seed',urgency:'normal' as const};
 const routine=buildSummaryGroup([input],employees[2],now,'test',policy,new Set())!;
 const escalated={...input,source:{...source,source:{...source.source,version:'r:2'}}};
 expect(buildSummaryGroup([escalated],employees[2],now,'test',policy,new Set(routine.itemKeys))).toBeNull();
 const urgent=buildSummaryGroup([{...escalated,urgency:'high'}],employees[2],now,'test',policy,new Set(routine.itemKeys))!;
 expect(urgent).not.toBeNull();
 expect(urgent.itemKeys).not.toEqual(routine.itemKeys);
 expect(buildSummaryGroup([{...input,urgency:'high'}],employees[2],now,'test',policy,new Set(urgent.itemKeys))).toBeNull();
});
