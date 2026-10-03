import { describe, expect, it } from 'vitest';
import { buildNotificationIntents } from './recipients';
import { DEFAULT_NOTIFICATION_POLICY as policy, planReminder } from './policy';
import type { SourceSnapshot, ScheduleSourceSnapshot, RecipientAccess } from './types';
import type { PublishedShiftSnapshot } from '../assistance/publication-diff';

const now = new Date('2026-10-05T12:00:00Z');
const access = (employeeId: string, role: RecipientAccess['role'] = 'EMPLOYEE', allowedLocationIds = ['2', '110']): RecipientAccess => ({ employeeId, role, active: true, allowedLocationIds });
const shift = (employeeId: string, sourceShiftId: string, locationId = '2', startTime = '10:00'): PublishedShiftSnapshot => ({ employeeId, sourceShiftId, locationId, date: '2026-10-07', startTime, endTime: '18:00', isDesignatedLead: false, isCalloutApproved: false });
const schedule = (currentShifts: PublishedShiftSnapshot[], previousShifts: PublishedShiftSnapshot[] = [], version = 'r1'): ScheduleSourceSnapshot => ({ kind: 'SCHEDULE', source: { kind: 'SCHEDULE', id: '2026-10-05', version }, updatedAt: now.toISOString(), revision: { id: version, weekStart: '2026-10-05', revisionNumber: version === 'r1' ? 1 : 2, sourceType: 'PUBLISH', createdBy: 'manager', createdAt: now.toISOString() }, previousShifts, currentShifts });
const build = (after: SourceSnapshot, recipients: RecipientAccess[], before?: SourceSnapshot, actorEmployeeId?: string) => buildNotificationIntents({ after, before, recipients, actorEmployeeId, environment: 'test', now, policy });

describe('notification recipient rules', () => {
  it.each([
    { name: 'first both-location publication', previous: [], current: [shift('a','s1'),shift('b','s2','110')], want: ['a','b'] },
    { name: 'location two first personal publication', previous: [shift('a','s1')], current: [shift('a','s1'),shift('b','s2','110')], want: ['b'] },
    { name: 'reassignment', previous: [shift('a','s1')], current: [shift('b','s1')], want: ['a','b'] },
    { name: 'removal', previous: [shift('a','s1')], current: [], want: ['a'] },
    { name: 'unchanged', previous: [shift('a','s1')], current: [shift('a','s1')], want: [] },
    { name: 'note only', previous: [shift('a','s1')], current: [{ ...shift('a','s1'),notes:'private note' }], want: [] },
  ])('publication_selects_only_affected_authorized_accounts: $name', ({previous,current,want}) => {
    const recipients = [access('a'),access('b','LEAD'),access('outside','EMPLOYEE',['99']),{...access('inactive'),active:false}];
    const events = build(schedule([...current, shift('outside','s3'),shift('inactive','s4')], previous, 'r2'), recipients);
    expect(events.filter(i=>i.purpose==='EVENT').map(i=>i.employeeId).sort()).toEqual(want);
  });
  it('preserves first publication semantics per account', () => {
    const event = build(schedule([shift('a','s1'),shift('b','s2','110')],[shift('a','s1')],'r2'),[access('a'),access('b')]);
    expect(event.find(i=>i.employeeId==='b' && i.purpose==='EVENT')?.type).toBe('SCHEDULE_PUBLISHED');
  });
  it('equivalent_personal_revision_preserves_reminder_budget', () => {
    const before = schedule([shift('a','s1'),shift('b','s2')]);
    before.revision.createdAt='2026-10-04T12:00:00Z';
    before.employeePublications = { a:{effectiveVersion:'r1',publishedAt:'2026-10-04T12:00:00Z'} };
    const after = schedule([shift('a','s1'),shift('b','s2','2','11:00')],before.currentShifts as PublishedShiftSnapshot[],'r2');
    const intents = build(after,[access('a'),access('b')],before);
    const reminder = intents.find(i=>i.employeeId==='a' && i.purpose==='REMINDER');
    expect(reminder).toMatchObject({effectiveVersion:'r1',dueAt:'2026-10-05T12:00:00.000Z',title:'Schedule review reminder',body:'Open Nuvora to review and acknowledge your schedule.',actionHref:'/app/schedule?week=2026-10-05'});
    const original = build(before,[access('a')]).find(i=>i.purpose==='REMINDER');
    expect(reminder?.eventKey).toBe(original?.eventKey);
    after.employeePublications = {a:{effectiveVersion:'r1',publishedAt:'2026-10-04T12:00:00Z',acknowledgement:{acknowledged:true,needsAcknowledgement:false,acknowledgedRevisionId:'r1',latestRevisionId:'r1'},acknowledgedRevisionShifts:before.currentShifts}};
    expect(build(after,[access('a')],before)).toEqual([]);
  });
  it('actor_success_is_not_redundantly_notified', () => {
    const after: SourceSnapshot = {kind:'TIME_OFF',source:{kind:'TIME_OFF',id:'leave',version:'v2'},updatedAt:now.toISOString(),record:{id:'leave',employeeId:'a',employeeName:'Medical Name',reason:'medical note',startDate:'2026-10-07',endDate:'2026-10-07',status:'APPROVED',createdAt:now.toISOString()}};
    expect(build(after,[access('a')],undefined,'a')).toEqual([]);
    expect(build(after,[access('a')])).toHaveLength(1);
    expect(build(after,[access('a')],after)).toEqual([]);
  });
  it('selects Employee/Lead missing markers and Manager/Owner grouped closure review', () => {
    const after: SourceSnapshot = {kind:'AVAILABILITY',source:{kind:'AVAILABILITY',id:'2026-10-05',version:'deadline1'},updatedAt:now.toISOString(),settings:{weekStart:'2026-10-05',availabilityDeadline:'2026-10-06T12:00:00Z'},submissions:[{employeeId:'submitted',employeeName:'Name',submitted:true,state:'SUBMITTED_UNAVAILABLE',windowCount:0}]};
    const recipients = [access('a'),access('b','LEAD'),access('submitted'),access('manager','MANAGER',[]),access('owner','OWNER',[])];
    const reminders = build(after,recipients);
    expect(reminders.map(i=>i.employeeId).sort()).toEqual(['a','b']);
    expect(reminders.every(i=>i.purpose==='REMINDER')).toBe(true);
    const closed = buildNotificationIntents({after,recipients,environment:'test',now:new Date('2026-10-06T12:00:00Z'),policy});
    expect(closed.map(i=>i.employeeId).sort()).toEqual(['manager','owner']);
    expect(closed.every(i=>i.purpose==='SUMMARY')).toBe(true);
  });
  it('only actual changed shifts within twelve hours are urgent', () => {
    const near = {...shift('a','near'),date:'2026-10-05'};
    const later = {...shift('b','later'),date:'2026-10-08'};
    expect(build(schedule([near,later]),[access('a'),access('b')]).filter(i=>i.purpose==='EVENT').every(i=>i.urgency==='normal')).toBe(true);
    const changed = build(schedule([near,{...later,startTime:'11:00'}],[near,later],'r2'),[access('a'),access('b')]);
    expect(changed.find(i=>i.purpose==='EVENT')?.urgency).toBe('normal');
    expect(build(schedule([{...near,startTime:'11:00'}],[near],'r2'),[access('a')]).find(i=>i.purpose==='EVENT')).toMatchObject({urgency:'high',expiresAt:'2026-10-05T14:00:00.000Z'});
  });
  it('caps acknowledgement follow-up at next shift, seven days and Puerto Rico week end', () => {
    const intents=build(schedule([shift('a','s1')]),[access('a')]);
    const reminder=intents.find(i=>i.purpose==='REMINDER');
    expect(reminder).toMatchObject({dueAt:'2026-10-06T12:00:00.000Z',expiresAt:'2026-10-07T14:00:00.000Z'});
    expect(planReminder({intent:reminder!,now:new Date('2026-10-08T12:00:00Z'),resolved:false,policy})).toBeNull();
    const sunday = schedule([{...shift('a','s1'),date:'2026-10-11',startTime:'23:59'}]);
    sunday.revision.createdAt='2026-10-04T12:00:00Z';
    expect(build(sunday,[access('a')]).find(i=>i.purpose==='REMINDER')?.expiresAt).toBe('2026-10-11T12:00:00.000Z');
  });
  it('keys isolate environments, source versions and recipients', () => {
    const after=schedule([shift('a','s1'),shift('b','s2')]);
    const test=build(after,[access('a'),access('b')]);
    const production=buildNotificationIntents({after,recipients:[access('a')],environment:'production',now,policy});
    expect(test[0]?.eventKey).toBe('test:SCHEDULE:2026-10-05:r1:a:EVENT');
    expect(new Set([...test,...production].map(i=>i.eventKey)).size).toBe(test.length+production.length);
  });
});

describe('manager grouping and current access',()=>{
  const manager=access('manager','MANAGER',[]);
  const pending={id:'TIME_OFF:leave',type:'TIME_OFF' as const,priority:'REVIEW' as const,title:'Name',detail:'medical note',href:'/app/requests?tab=team&requestId=leave'};
  const summary=(items: Extract<SourceSnapshot,{kind:'MANAGER_SUMMARY'}>['items'],version='v1'): SourceSnapshot=>({kind:'MANAGER_SUMMARY',source:{kind:'MANAGER_SUMMARY',id:'2026-10-05',version},updatedAt:now.toISOString(),weekStart:'2026-10-05',items,expiresAt:'2026-10-06T12:00:00Z'});
  it('deduplicates the same unresolved manager item per account/Puerto Rico day across source versions',()=>{
    const one=build(summary([pending]),[manager])[0];
    const two=build(summary([pending],'v2'),[manager])[0];
    expect(one).toMatchObject({purpose:'SUMMARY',dueAt:'2026-10-05T12:05:00.000Z',urgency:'normal'});
    expect(one.eventKey).toBe(two.eventKey);
    expect(one.itemKeys).toHaveLength(1);
    expect(one.itemKeys).toEqual(two.itemKeys);
    expect(build(summary([{...pending,id:'TIME_OFF:new',href:'/app/requests?tab=team&requestId=new'}]),[manager])[0].itemKeys).not.toEqual(one.itemKeys);
  });
  it('does not turn configuration/hour preference items or elapsed coverage into a campaign',()=>{
    const ignored={...pending,id:'HOURS:a',type:'HOURS_REVIEW' as const,href:'/app/schedule?employeeId=a'};
    const elapsed={...pending,id:'COVERAGE:past',type:'COVERAGE_GAP' as const,priority:'URGENT' as const,dateTime:'2026-10-05T07:00',href:'/app/schedule/coverage?week=2026-10-05'};
    expect(build(summary([ignored,elapsed]),[manager])).toEqual([]);
    expect(build(summary([ignored,pending]),[manager])[0].actionHref).toBe('/app/requests?tab=pending&requestId=leave');
  });
  it('uses actual upcoming coverage start for urgency and role-wide manager access',()=>{
    const coverage={...pending,id:'COVERAGE:near',type:'COVERAGE_GAP' as const,priority:'REVIEW' as const,dateTime:'2026-10-05T10:00',locationId:'110',href:'/app/schedule/coverage?week=2026-10-05'};
    expect(build(summary([coverage]),[manager,access('a')])[0]).toMatchObject({employeeId:'manager',urgency:'high',dueAt:'2026-10-05T12:00:00.000Z',expiresAt:'2026-10-05T14:00:00.000Z'});
    expect(build(summary([coverage]),[manager,access('a')])).toHaveLength(1);
  });
});

describe('review regressions: assignment-scoped access',()=>{
  it.each(['time change','removal','reassignment'] as const)('does not authorize an inaccessible %s through another permitted assignment',transition=>{
    const permitted=shift('a','permitted','2');
    const forbidden={...shift('a','forbidden','110'),date:'2026-10-05'};
    const next=transition==='removal' ? [] : [{...forbidden,startTime:'11:00',employeeId:transition==='reassignment'?'b':'a'}];
    expect(build(schedule([permitted,...next],[permitted,forbidden],'r2'),[access('a','EMPLOYEE',['2'])])).toEqual([]);
  });
  it('retains the original authorized reminder budget when only inaccessible shifts change',()=>{
    const permitted=shift('a','permitted','2');
    const forbidden={...shift('a','forbidden','110'),date:'2026-10-05'};
    const before=schedule([permitted,forbidden]);
    before.revision.createdAt='2026-10-04T12:00:00Z';
    before.employeePublications={a:{effectiveVersion:'r1',publishedAt:'2026-10-04T12:00:00Z'}};
    const after=schedule([permitted,{...forbidden,startTime:'11:00'}],[permitted,forbidden],'r2');
    const intents=build(after,[access('a','LEAD',['2'])],before);
    expect(intents).toHaveLength(1);
    expect(intents[0]).toMatchObject({purpose:'REMINDER',effectiveVersion:'r1',dueAt:'2026-10-05T12:00:00.000Z',expiresAt:'2026-10-07T14:00:00.000Z'});
  });
  it('bounds reminders only by upcoming authorized shifts',()=>{
    const permitted={...shift('a','permitted','2'),date:'2026-10-08'};
    const forbidden={...shift('a','forbidden','110'),date:'2026-10-05'};
    const intents=build(schedule([permitted,forbidden]),[access('a','LEAD',['2'])]);
    expect(intents.find(intent=>intent.purpose==='REMINDER')).toMatchObject({expiresAt:'2026-10-08T14:00:00.000Z'});
  });
  it.each(['MANAGER','OWNER'] as const)('retains role-wide assignment access for %s',role=>{
    const before=shift('a','assigned','110');
    const intents=build(schedule([{...before,startTime:'11:00'}],[before],'r2'),[access('a',role,[]),access('unassigned',role,[])]);
    expect(intents.filter(intent=>intent.purpose==='EVENT').map(intent=>intent.employeeId)).toEqual(['a']);
  });
  it('notifies a former authorized assignee when their permitted shift is reassigned',()=>{
    const before=shift('a','assigned','2');
    const intents=build(schedule([{...before,employeeId:'b'}],[before],'r2'),[access('a','EMPLOYEE',['2']),access('b','LEAD',['2'])]);
    expect(intents.filter(intent=>intent.purpose==='EVENT').map(intent=>intent.employeeId).sort()).toEqual(['a','b']);
  });
  it('makes Monday midnight Puerto Rico the decisive reminder expiry cap',()=>{
    const after=schedule([{...shift('a','after-week','2'),date:'2026-10-12'}]);
    expect(build(after,[access('a')]).find(intent=>intent.purpose==='REMINDER')?.expiresAt).toBe('2026-10-12T04:00:00.000Z');
  });
});
