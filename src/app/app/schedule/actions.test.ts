import { managementProof } from "../../../test/fixtures/management";
import { readFileSync } from 'node:fs';
import { beforeEach, expect, it, rs } from '@rstest/core';
const m=rs.hoisted(()=>({
  insert:rs.fn(async (_input: unknown)=> 'new'), update:rs.fn(async()=>true), remove:rs.fn(async()=>true), publish:rs.fn(async()=>({published:true})),publishChanges:rs.fn(async(_input:unknown)=>({published:true})),statuses:rs.fn(async(_week:string)=>[{scheduleId:'a',locationId:'loc-1',status:'PUBLISHED'},{scheduleId:'b',locationId:'loc-2',status:'DRAFT'}]),
  copy:rs.fn(async()=>({operationId:'11111111-1111-4111-8111-111111111111',rows:[]})),
  clear:rs.fn(), send:rs.fn(()=>new Promise<never>(()=>{})), provider:rs.fn(), role:'MANAGER', existingWeek:'2030-10-07', templateStart:'09:00',
  shifts:[{id:'s',employeeId:'E',locationId:'loc-1',date:'2030-09-30',startTime:'09:00',endTime:'17:00',isDesignatedLead:false}],
}));
rs.mock('@/lib/company-access/operational-scope.server',()=>({assertOriginalOperationalAccess:async(_proof:unknown,original:{authority:string})=>{expect(original.authority).toBe('f'.repeat(64));},assertOperationalAccess:async()=>({scope:{mode:'COMPANY',locationIds:[]},authority:'f'.repeat(64)}),isOperationalAuthorizationError:()=>false}));
rs.mock('@/lib/company-access/operational-read.server',()=>({readOperationalShiftEditor:async()=>({state:'ready',data:{saveAvailability:'available',shift:{reviewVersion:'a'.repeat(64),id:'s',employeeId:'E',locationId:'loc-1',weekStart:m.existingWeek,date:'2030-10-08'},employeeOptions:[],positionOptions:[]}})}));
rs.mock('@/lib/data/schedule-copy',()=>({executeScheduleCopy:m.copy}));
rs.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>managementProof('M',m.role as 'MANAGER')}));
rs.mock('@/lib/notifications/provider',()=>({createPushSender:m.provider.mockImplementation(()=>({send:m.send}))}));
rs.mock('next/cache',()=>({revalidatePath:rs.fn()}));
rs.mock('next/navigation',()=>({redirect:(destination:string)=>{throw {destination};}}));
rs.mock('@/lib/auth/permissions',()=>({MANAGER_ROLES:['OWNER','MANAGER'],requireRoles:async(roles:string[])=>{if(!roles.includes(m.role))throw {destination:'/app'};return {id:'M',role:m.role};}}));


rs.mock('@/lib/scheduling/exchange-validation',()=>({prepareExchangeContext:(context:unknown)=>context}));
rs.mock('@/lib/scheduling/validate-shift',()=>({validateShift:({candidate}:{candidate:{employeeId:string}})=>({issues:candidate.employeeId==='BLOCKED'?[{severity:'error',code:'INACTIVE_EMPLOYEE'}]:[]})}));
rs.mock('@/lib/scheduling/schedule-health',()=>({calculateScheduleHealth:rs.fn()}));
rs.mock('@/lib/scheduling/publish-readiness',()=>({buildPublishReadiness:rs.fn()}));
rs.mock('@/lib/data/schedule-health',()=>({listCoverageWindows:rs.fn(),listEmployeeHourTargets:rs.fn(),listLocationStaffingSettings:rs.fn()}));
rs.mock('@/lib/data/week-settings',()=>({setAvailabilityDeadline:rs.fn()}));
rs.mock('@/lib/data/acknowledgements',()=>({clearWeekAcknowledgements:m.clear}));
rs.mock('@/lib/data/publication-revisions',()=>({publishScheduleWithRevision:m.publish,publishScheduleChanges:m.publishChanges}));
rs.mock('@/lib/data/positions',()=>({listPositions:async()=>[]}));
rs.mock('@/lib/data/employees',()=>({listEmployees:rs.fn()}));
rs.mock('@/lib/data/schedules',()=>({listScheduleStatuses:m.statuses,insertShiftAtLocation:m.insert,insertShift:m.insert,updateShift:m.update,deleteShift:m.remove,ensureSchedule:async()=> 'a',getShiftValidationContext:async()=>({}),getShiftForManagement:async()=>({reviewVersion:'a'.repeat(64),id:'s',employeeId:'E',locationId:'loc-1',weekStart:m.existingWeek,date:'2030-10-08'}),listWeekShifts:async()=>m.shifts}));
rs.mock('@/lib/data/schedule-templates',()=>({listTemplateShifts:async()=>[{employeeId:'E',locationId:'loc-1',positionId:'barista',dayOffset:6,startTime:m.templateStart,endTime:'17:00'},{employeeId:'BLOCKED',locationId:'loc-1',dayOffset:1,startTime:'09:00',endTime:'17:00'}],archiveScheduleTemplate:rs.fn(),createTemplateFromWeek:rs.fn()}));
import { applyTemplateAction } from './templates/actions';
import { createShiftAction,updateShiftAction,deleteShiftAction,publishScheduleAction,publishScheduleChangesAction,copyPreviousWeekAction,setAvailabilityDeadlineAction } from './actions';
function form(){const data=new FormData();Object.entries({expectedReviewVersion:'a'.repeat(64),operationId:'11111111-1111-4111-8111-111111111111',shiftId:'s',employeeId:'E',locationId:'loc-1',weekStart:'2030-10-07',date:'2030-10-07',startTime:'09:00',endTime:'17:00',confirmWarnings:'yes'}).forEach(([k,v])=>data.set(k,v));return data;}
beforeEach(()=>{rs.clearAllMocks();m.role='MANAGER';m.existingWeek='2030-10-07';m.templateStart='09:00';});
it.each([['publish',publishScheduleAction,'&location=loc-1&published=loc-1'],['create',createShiftAction,'&location=loc-1&day=2030-10-07#schedule-employee-E'],['update',updateShiftAction,'&location=loc-1&day=2030-10-07&updated=1#schedule-employee-E'],['delete',deleteShiftAction,'&location=loc-1&day=2030-10-08&deleted=1#schedule-employee-E']] as const)('%s returns without provider contact or blanket acknowledgement invalidation',async(_,action,suffix)=>{
  await expect(action(form())).rejects.toMatchObject({destination:`/app/schedule?week=2030-10-07${suffix}`});
  expect(m.provider).not.toHaveBeenCalled();expect(m.send).not.toHaveBeenCalled();expect(m.clear).not.toHaveBeenCalled();
});
it('create update delete and copy use only server actor identity',async()=>{
  const data=form();data.set('actorEmployeeId','FORGED');
  for(const action of [createShiftAction,updateShiftAction,deleteShiftAction,copyPreviousWeekAction]){try{await action(data);}catch{}}
  expect(m.insert.mock.calls.every(call=>(call[0] as unknown as {actorEmployeeId:string}).actorEmployeeId==='M')).toBe(true);
  expect(m.update).toHaveBeenCalledWith(expect.objectContaining({actorEmployeeId:'M'}));expect(m.remove).toHaveBeenCalledWith('s',managementProof('M'),undefined,'a'.repeat(64));
});
it('copy sends the server-authorized command and navigates to its durable per-row receipt',async()=>{
  const original=m.shifts;m.shifts=[...original,{...original[0],id:'blocked',employeeId:'BLOCKED'}];
  try{await expect(copyPreviousWeekAction(form())).rejects.toMatchObject({destination:'/app/schedule/copy-receipt?operation=11111111-1111-4111-8111-111111111111'});expect(m.copy).toHaveBeenCalledWith(managementProof('M'),expect.objectContaining({kind:'PREVIOUS_WEEK',weekStart:'2030-10-07'}));expect(m.clear).not.toHaveBeenCalled();}finally{m.shifts=original;}
});
it('actual schedule/action import boundary contains no delivery provider or kick and no second action revision',()=>{
  for(const file of ['src/app/app/schedule/actions.ts','src/app/app/schedule/templates/actions.ts','src/lib/data/schedules.ts','src/lib/data/publication-revisions.ts','src/lib/data/notification-transactions.ts']){
    const source=readFileSync(file,'utf8');expect(source).not.toMatch(/from\s+['"][^'"]*(?:notifications\/(?:provider|worker)|push-deliveries)['"]/);expect(source).not.toMatch(/\b(?:createPushSender|dispatchNotifications)\s*\(/); if(file.includes('/app/')) expect(source).not.toMatch(/\brecordPublishedWeekRevision\s*\(/);
  }
});

it('template application passes server actor and selected source to the durable writer',async()=>{
  const data=form();data.set('templateId','t');
  await expect(applyTemplateAction(data)).rejects.toMatchObject({destination:'/app/schedule/copy-receipt?operation=11111111-1111-4111-8111-111111111111'});
  expect(m.copy).toHaveBeenCalledWith(managementProof('M'),{operationId:'11111111-1111-4111-8111-111111111111',kind:'TEMPLATE',weekStart:'2030-10-07',templateId:'t'});expect(m.clear).not.toHaveBeenCalled();expect(m.provider).not.toHaveBeenCalled();
});
it.each(['EMPLOYEE','LEAD'])('%s cannot mutate schedules',async role=>{
 m.role=role;await expect(createShiftAction(form())).rejects.toMatchObject({destination:'/app'});expect(m.insert).not.toHaveBeenCalled();
});

rs.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>({timeZone:'America/New_York'})}));
import { setAvailabilityDeadline } from '@/lib/data/week-settings';
it('deadline stores the configured New York instant',async()=>{const data=form();data.set('availabilityDeadline','2026-10-03T09:00');await expect(setAvailabilityDeadlineAction(data)).rejects.toMatchObject({destination:'/app/schedule?week=2030-10-07&deadlineSaved=1'});expect(setAvailabilityDeadline).toHaveBeenCalledWith(expect.objectContaining({deadlineIso:'2026-10-03T13:00:00.000Z'}));});
it.each(['2026-11-01T01:30','2026-03-08T02:30','2026-02-30T09:00'])('invalid deadline preserves input without writing %s',async local=>{const data=form();data.set('availabilityDeadline',local);await expect(setAvailabilityDeadlineAction(data)).rejects.toMatchObject({destination:`/app/schedule?week=2030-10-07&error=INVALID_DEADLINE&availabilityDeadline=${encodeURIComponent(local)}`});expect(setAvailabilityDeadline).not.toHaveBeenCalled();});
it.each([[createShiftAction,'/app/schedule?week=2026-10-26&error=INVALID_SHIFT'],[updateShiftAction,'/app/schedule/edit?shiftId=s&error=INVALID_SHIFT']] as const)('rejects ambiguous newly edited assignment before writing',async (action,destination)=>{const data=form();m.existingWeek='2026-10-26';data.set('weekStart','2026-10-26');data.set('date','2026-11-01');data.set('startTime','01:30');data.set('endTime','04:00');await expect(action(data)).rejects.toMatchObject({destination});expect(m.insert).not.toHaveBeenCalled();expect(m.update).not.toHaveBeenCalled();});



it('copy passes the exact requested target week to the authoritative boundary validator',async()=>{const original=m.shifts;m.shifts=[{...original[0],date:'2026-10-25',startTime:'01:30'}];const data=form();data.set('weekStart','2026-10-26');try {await expect(copyPreviousWeekAction(data)).rejects.toMatchObject({destination:'/app/schedule/copy-receipt?operation=11111111-1111-4111-8111-111111111111'});expect(m.insert).not.toHaveBeenCalled();}finally{m.shifts=original;}});
it('template application preserves requested target and source for authoritative boundary validation',async()=>{m.templateStart='01:30';const data=form();data.set('weekStart','2026-10-26');data.set('templateId','t');await expect(applyTemplateAction(data)).rejects.toMatchObject({destination:'/app/schedule/copy-receipt?operation=11111111-1111-4111-8111-111111111111'});expect(m.insert).not.toHaveBeenCalled();});

it('publication warning health retains the assigned position and qualification facts',async()=>{
 const {calculateScheduleHealth}=await import('@/lib/scheduling/schedule-health');
 const {buildPublishReadiness}=await import('@/lib/scheduling/publish-readiness');
 const {listEmployees}=await import('@/lib/data/employees');
 const {listLocationStaffingSettings,listEmployeeHourTargets,listCoverageWindows}=await import('@/lib/data/schedule-health');
 rs.mocked(listEmployees).mockResolvedValue([]);
 rs.mocked(listLocationStaffingSettings).mockResolvedValue([]);
 rs.mocked(listEmployeeHourTargets).mockResolvedValue([]);
 rs.mocked(listCoverageWindows).mockResolvedValue([]);
 rs.mocked(calculateScheduleHealth).mockReturnValue({locationCoverage:[],underTargetCount:0,overTargetCount:0,unconfiguredTargetCount:0} as unknown as ReturnType<typeof calculateScheduleHealth>);
 rs.mocked(buildPublishReadiness).mockReturnValue({hasWarnings:true} as ReturnType<typeof buildPublishReadiness>);
 const original=m.shifts;
 m.shifts=[{...original[0],positionId:'barista'} as typeof m.shifts[number]];
 const data=form();data.delete('confirmWarnings');
 try {
  await expect(publishScheduleAction(data)).rejects.toMatchObject({destination:'/app/schedule?week=2030-10-07&location=loc-1&publishCheck=loc-1'});
  expect(rs.mocked(calculateScheduleHealth).mock.calls[0][0].shifts[0]).toMatchObject({positionId:'barista'});
 } finally {m.shifts=original;}
});
it.each([createShiftAction,updateShiftAction])('manual action preserves the explicit selected position',async action=>{
 const data=form();data.set('positionId','cashier');try{await action(data);}catch{}
 expect(action===createShiftAction?m.insert:m.update).toHaveBeenCalledWith(expect.objectContaining({positionId:'cashier'}));
});
it('edit distinguishes omitted from explicitly cleared position',async()=>{
 const data=form();try{await updateShiftAction(data);}catch{}
 expect(m.update).toHaveBeenLastCalledWith(expect.not.objectContaining({positionId:null}));
 data.set('positionId','');try{await updateShiftAction(data);}catch{}
 expect(m.update).toHaveBeenLastCalledWith(expect.objectContaining({positionId:null}));
});

it('copy and template wrappers never substitute client assignment fields for the saved source',async()=>{
 const original=m.shifts;m.shifts=[{...original[0],positionId:'cashier'} as typeof m.shifts[number]];
 try{await copyPreviousWeekAction(form());}catch{}finally{m.shifts=original;}
 expect(m.copy).toHaveBeenLastCalledWith(managementProof('M'),expect.objectContaining({kind:'PREVIOUS_WEEK'}));
 const data=form();data.set('templateId','t');try{await applyTemplateAction(data);}catch{}
 expect(m.copy).toHaveBeenLastCalledWith(managementProof('M'),expect.objectContaining({kind:'TEMPLATE',templateId:'t'}));
});


it('a newly saved second-location shift returns to that location rather than all locations',async()=>{
 const data=form();data.set('locationId','loc-2');
 await expect(createShiftAction(data)).rejects.toMatchObject({destination:'/app/schedule?week=2030-10-07&location=loc-2&day=2030-10-07#schedule-employee-E'});
 expect(m.insert).toHaveBeenCalledWith(expect.objectContaining({locationId:'loc-2',weekStart:'2030-10-07',employeeId:'E'}));
});

it('deadline returns to the allowed rules editor with the selected week after success and invalid input',async()=>{
 const data=form();data.set('returnTo','/app/schedule/settings');
 await expect(setAvailabilityDeadlineAction(data)).rejects.toMatchObject({destination:'/app/schedule/settings?week=2030-10-07&deadlineSaved=1'});
 data.set('availabilityDeadline','2026-03-08T02:30');
 await expect(setAvailabilityDeadlineAction(data)).rejects.toMatchObject({destination:'/app/schedule/settings?week=2030-10-07&error=INVALID_DEADLINE&availabilityDeadline=2026-03-08T02%3A30'});
 data.set('weekStart','invalid');
 await expect(setAvailabilityDeadlineAction(data)).rejects.toMatchObject({destination:'/app/schedule/settings?error=INVALID_SHIFT'});
});
it.each(['https://evil.invalid','//evil.invalid','/app/schedule/settings?next=evil','/app/schedule/settings/../other','/app/employees'])('deadline refuses unapproved return destination %s',async path=>{
 const data=form();data.set('returnTo',path);
 await expect(setAvailabilityDeadlineAction(data)).rejects.toMatchObject({destination:'/app/schedule?week=2030-10-07&deadlineSaved=1'});
});

// Publish changes (Jose, 2026-10-29): one week-level action publishes every held edit.
it('Publish changes publishes the whole week as the server actor and reports the outcome',async()=>{
 const data=form();data.set('managerId','FORGED');
 await expect(publishScheduleChangesAction(data)).rejects.toMatchObject({destination:'/app/schedule?week=2030-10-07&changesPublished=1'});
 expect(m.publishChanges).toHaveBeenCalledWith({weekStart:'2030-10-07',managerId:'M',proof:managementProof('M')});
 expect(m.publish).not.toHaveBeenCalled();expect(m.provider).not.toHaveBeenCalled();expect(m.send).not.toHaveBeenCalled();
 m.publishChanges.mockResolvedValueOnce({published:false});
 await expect(publishScheduleChangesAction(form())).rejects.toMatchObject({destination:'/app/schedule?week=2030-10-07&error=NO_PENDING_CHANGES'});
});
it('Publish changes keeps the warning review for each published location before publishing',async()=>{
 const {calculateScheduleHealth}=await import('@/lib/scheduling/schedule-health');
 const {buildPublishReadiness}=await import('@/lib/scheduling/publish-readiness');
 const {listEmployees}=await import('@/lib/data/employees');
 const {listLocationStaffingSettings,listEmployeeHourTargets,listCoverageWindows}=await import('@/lib/data/schedule-health');
 rs.mocked(listEmployees).mockResolvedValue([]);rs.mocked(listLocationStaffingSettings).mockResolvedValue([]);
 rs.mocked(listEmployeeHourTargets).mockResolvedValue([]);rs.mocked(listCoverageWindows).mockResolvedValue([]);
 rs.mocked(calculateScheduleHealth).mockReturnValue({locationCoverage:[],underTargetCount:0,overTargetCount:0,unconfiguredTargetCount:0} as unknown as ReturnType<typeof calculateScheduleHealth>);
 rs.mocked(buildPublishReadiness).mockReturnValue({hasWarnings:true} as ReturnType<typeof buildPublishReadiness>);
 const data=form();data.delete('confirmWarnings');
 await expect(publishScheduleChangesAction(data)).rejects.toMatchObject({destination:'/app/schedule/publish?week=2030-10-07&review=changes#publish-review'}); // Release 1: warnings are reviewed on Build and publish.
 expect(rs.mocked(buildPublishReadiness).mock.calls.map(call=>call[0].locationId)).toEqual(['loc-1']);
 expect(m.publishChanges).not.toHaveBeenCalled();
 rs.mocked(buildPublishReadiness).mockReturnValue({hasWarnings:false} as ReturnType<typeof buildPublishReadiness>);
 await expect(publishScheduleChangesAction(data)).rejects.toMatchObject({destination:'/app/schedule?week=2030-10-07&changesPublished=1'});
});
it('Publish changes rejects an invalid week without publishing',async()=>{
 const data=form();data.set('weekStart','2030-10-08');
 await expect(publishScheduleChangesAction(data)).rejects.toMatchObject({destination:'/app/schedule?error=INVALID_PUBLISH'});
 expect(m.publishChanges).not.toHaveBeenCalled();
});

it.each([updateShiftAction,deleteShiftAction])('missing original shift review preserves form values and refuses the writer',async action=>{
 const data=form();data.delete('expectedReviewVersion');
 expect(await action(data)).toMatchObject({issueCode:'SHIFT_REVIEW_CONFLICT'});
 expect(data.get('employeeId')).toBe('E');expect(m.update).not.toHaveBeenCalled();expect(m.remove).not.toHaveBeenCalled();
});
it.each([updateShiftAction,deleteShiftAction])('stale original shift review is an inline conflict without redirecting or clearing input',async action=>{
 const data=form();data.set('expectedReviewVersion','b'.repeat(64));data.set('notes','My unsaved fictional draft');
 expect(await action(data)).toMatchObject({issueCode:'SHIFT_REVIEW_CONFLICT'});
 expect(data.get('notes')).toBe('My unsaved fictional draft');expect(m.update).not.toHaveBeenCalled();expect(m.remove).not.toHaveBeenCalled();
});

import {ManualAssignmentConflictError} from '@/lib/data/manual-assignment-validation';
it.each([publishScheduleAction,publishScheduleChangesAction])('publication hard eligibility refusal uses the existing rule feedback route',async action=>{
 const writer=action===publishScheduleAction?m.publish:m.publishChanges;writer.mockRejectedValueOnce(new ManualAssignmentConflictError('EMPLOYEE_INACTIVE','Inactive employees cannot be scheduled.'));
 await expect(action(form())).rejects.toMatchObject({destination:'/app/schedule?week=2030-10-07&error=EMPLOYEE_INACTIVE'});
 expect(m.provider).not.toHaveBeenCalled();
});
