import { managementProof } from "../../../test/fixtures/management";
import { readFileSync } from 'node:fs';
import { beforeEach, expect, it, vi } from 'vitest';
const m=vi.hoisted(()=>({
  insert:vi.fn(async (_input: unknown)=> 'new'), update:vi.fn(async()=>true), remove:vi.fn(async()=>true), publish:vi.fn(async()=>({published:true})),
  copy:vi.fn(async()=>({operationId:'11111111-1111-4111-8111-111111111111',rows:[]})),
  clear:vi.fn(), send:vi.fn(()=>new Promise<never>(()=>{})), provider:vi.fn(), role:'MANAGER', existingWeek:'2030-10-07', templateStart:'09:00',
  shifts:[{id:'s',employeeId:'E',locationId:'loc-1',date:'2030-09-30',startTime:'09:00',endTime:'17:00',isDesignatedLead:false}],
}));
vi.mock('@/lib/company-access/operational-scope.server',()=>({assertOriginalOperationalAccess:async(_proof:unknown,original:{authority:string})=>{expect(original.authority).toBe('f'.repeat(64));},assertOperationalAccess:async()=>({scope:{mode:'COMPANY',locationIds:[]},authority:'f'.repeat(64)}),isOperationalAuthorizationError:()=>false}));
vi.mock('@/lib/company-access/operational-read.server',()=>({readOperationalShiftEditor:async()=>({state:'ready',data:{saveAvailability:'available',shift:{id:'s',employeeId:'E',locationId:'loc-1',weekStart:m.existingWeek,date:'2030-10-08'},employeeOptions:[],positionOptions:[]}})}));
vi.mock('@/lib/data/schedule-copy',()=>({executeScheduleCopy:m.copy}));
vi.mock('@/lib/auth/session',()=>({requireSessionMutationProof:async()=>managementProof('M',m.role as 'MANAGER')}));
vi.mock('@/lib/notifications/provider',()=>({createPushSender:m.provider.mockImplementation(()=>({send:m.send}))}));
vi.mock('next/cache',()=>({revalidatePath:vi.fn()}));
vi.mock('next/navigation',()=>({redirect:(destination:string)=>{throw {destination};}}));
vi.mock('@/lib/auth/permissions',()=>({MANAGER_ROLES:['OWNER','MANAGER'],requireRoles:async(roles:string[])=>{if(!roles.includes(m.role))throw {destination:'/app'};return {id:'M',role:m.role};}}));
vi.mock('@/lib/date-utils',()=>import('../../../lib/date-utils'));
vi.mock('@/lib/scheduling/copy-week',()=>import('../../../lib/scheduling/copy-week'));
vi.mock('@/lib/scheduling/exchange-validation',()=>({prepareExchangeContext:(context:unknown)=>context}));
vi.mock('@/lib/scheduling/validate-shift',()=>({validateShift:({candidate}:{candidate:{employeeId:string}})=>({issues:candidate.employeeId==='BLOCKED'?[{severity:'error',code:'INACTIVE_EMPLOYEE'}]:[]})}));
vi.mock('@/lib/scheduling/schedule-health',()=>({calculateScheduleHealth:vi.fn()}));
vi.mock('@/lib/scheduling/publish-readiness',()=>({buildPublishReadiness:vi.fn()}));
vi.mock('@/lib/data/schedule-health',()=>({listCoverageWindows:vi.fn(),listEmployeeHourTargets:vi.fn(),listLocationStaffingSettings:vi.fn()}));
vi.mock('@/lib/data/week-settings',()=>({setAvailabilityDeadline:vi.fn()}));
vi.mock('@/lib/data/acknowledgements',()=>({clearWeekAcknowledgements:m.clear}));
vi.mock('@/lib/data/publication-revisions',()=>({publishScheduleWithRevision:m.publish}));
vi.mock('@/lib/data/positions',()=>({listPositions:async()=>[]}));
vi.mock('@/lib/data/employees',()=>({listEmployees:vi.fn()}));
vi.mock('@/lib/data/schedules',()=>({insertShiftAtLocation:m.insert,insertShift:m.insert,updateShift:m.update,deleteShift:m.remove,ensureSchedule:async()=> 'a',getShiftValidationContext:async()=>({}),getShiftForManagement:async()=>({id:'s',employeeId:'E',locationId:'loc-1',weekStart:m.existingWeek,date:'2030-10-08'}),listWeekShifts:async()=>m.shifts}));
vi.mock('@/lib/data/schedule-templates',()=>({listTemplateShifts:async()=>[{employeeId:'E',locationId:'loc-1',positionId:'barista',dayOffset:6,startTime:m.templateStart,endTime:'17:00'},{employeeId:'BLOCKED',locationId:'loc-1',dayOffset:1,startTime:'09:00',endTime:'17:00'}],archiveScheduleTemplate:vi.fn(),createTemplateFromWeek:vi.fn()}));
import { applyTemplateAction } from './templates/actions';
import { createShiftAction,updateShiftAction,deleteShiftAction,publishScheduleAction,copyPreviousWeekAction,setAvailabilityDeadlineAction } from './actions';
function form(){const data=new FormData();Object.entries({operationId:'11111111-1111-4111-8111-111111111111',shiftId:'s',employeeId:'E',locationId:'loc-1',weekStart:'2030-10-07',date:'2030-10-07',startTime:'09:00',endTime:'17:00',confirmWarnings:'yes'}).forEach(([k,v])=>data.set(k,v));return data;}
beforeEach(()=>{vi.clearAllMocks();m.role='MANAGER';m.existingWeek='2030-10-07';m.templateStart='09:00';});
it.each([['publish',publishScheduleAction,'&location=loc-1&published=loc-1'],['create',createShiftAction,'&location=loc-1&day=2030-10-07#schedule-employee-E'],['update',updateShiftAction,'&location=loc-1&day=2030-10-07&updated=1#schedule-employee-E'],['delete',deleteShiftAction,'&location=loc-1&day=2030-10-08&deleted=1#schedule-employee-E']] as const)('%s returns without provider contact or blanket acknowledgement invalidation',async(_,action,suffix)=>{
  await expect(action(form())).rejects.toMatchObject({destination:`/app/schedule?week=2030-10-07${suffix}`});
  expect(m.provider).not.toHaveBeenCalled();expect(m.send).not.toHaveBeenCalled();expect(m.clear).not.toHaveBeenCalled();
});
it('create update delete and copy use only server actor identity',async()=>{
  const data=form();data.set('actorEmployeeId','FORGED');
  for(const action of [createShiftAction,updateShiftAction,deleteShiftAction,copyPreviousWeekAction]){try{await action(data);}catch{}}
  expect(m.insert.mock.calls.every(call=>(call[0] as unknown as {actorEmployeeId:string}).actorEmployeeId==='M')).toBe(true);
  expect(m.update).toHaveBeenCalledWith(expect.objectContaining({actorEmployeeId:'M'}));expect(m.remove).toHaveBeenCalledWith('s',managementProof('M'));
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

vi.mock('@/lib/data/workspaces',()=>({getWorkspace:async()=>({timeZone:'America/New_York'})}));
import { setAvailabilityDeadline } from '@/lib/data/week-settings';
it('deadline stores the configured New York instant',async()=>{const data=form();data.set('availabilityDeadline','2026-10-03T09:00');await expect(setAvailabilityDeadlineAction(data)).rejects.toMatchObject({destination:'/app/schedule?week=2030-10-07&deadlineSaved=1'});expect(setAvailabilityDeadline).toHaveBeenCalledWith(expect.objectContaining({deadlineIso:'2026-10-03T13:00:00.000Z'}));});
it.each(['2026-11-01T01:30','2026-03-08T02:30','2026-02-30T09:00'])('invalid deadline preserves input without writing %s',async local=>{const data=form();data.set('availabilityDeadline',local);await expect(setAvailabilityDeadlineAction(data)).rejects.toMatchObject({destination:`/app/schedule?week=2030-10-07&error=INVALID_DEADLINE&availabilityDeadline=${encodeURIComponent(local)}`});expect(setAvailabilityDeadline).not.toHaveBeenCalled();});
it.each([[createShiftAction,'/app/schedule?week=2026-10-26&error=INVALID_SHIFT'],[updateShiftAction,'/app/schedule/edit?shiftId=s&error=INVALID_SHIFT']] as const)('rejects ambiguous newly edited assignment before writing',async (action,destination)=>{const data=form();m.existingWeek='2026-10-26';data.set('weekStart','2026-10-26');data.set('date','2026-11-01');data.set('startTime','01:30');data.set('endTime','04:00');await expect(action(data)).rejects.toMatchObject({destination});expect(m.insert).not.toHaveBeenCalled();expect(m.update).not.toHaveBeenCalled();});

vi.mock("@/lib/business-time",()=>import("../../../lib/business-time"));

it('copy passes the exact requested target week to the authoritative boundary validator',async()=>{const original=m.shifts;m.shifts=[{...original[0],date:'2026-10-25',startTime:'01:30'}];const data=form();data.set('weekStart','2026-10-26');try {await expect(copyPreviousWeekAction(data)).rejects.toMatchObject({destination:'/app/schedule/copy-receipt?operation=11111111-1111-4111-8111-111111111111'});expect(m.insert).not.toHaveBeenCalled();}finally{m.shifts=original;}});
it('template application preserves requested target and source for authoritative boundary validation',async()=>{m.templateStart='01:30';const data=form();data.set('weekStart','2026-10-26');data.set('templateId','t');await expect(applyTemplateAction(data)).rejects.toMatchObject({destination:'/app/schedule/copy-receipt?operation=11111111-1111-4111-8111-111111111111'});expect(m.insert).not.toHaveBeenCalled();});

it('publication warning health retains the assigned position and qualification facts',async()=>{
 const {calculateScheduleHealth}=await import('@/lib/scheduling/schedule-health');
 const {buildPublishReadiness}=await import('@/lib/scheduling/publish-readiness');
 const {listEmployees}=await import('@/lib/data/employees');
 const {listLocationStaffingSettings,listEmployeeHourTargets,listCoverageWindows}=await import('@/lib/data/schedule-health');
 vi.mocked(listEmployees).mockResolvedValue([]);
 vi.mocked(listLocationStaffingSettings).mockResolvedValue([]);
 vi.mocked(listEmployeeHourTargets).mockResolvedValue([]);
 vi.mocked(listCoverageWindows).mockResolvedValue([]);
 vi.mocked(calculateScheduleHealth).mockReturnValue({locationCoverage:[],underTargetCount:0,overTargetCount:0,unconfiguredTargetCount:0} as unknown as ReturnType<typeof calculateScheduleHealth>);
 vi.mocked(buildPublishReadiness).mockReturnValue({hasWarnings:true} as ReturnType<typeof buildPublishReadiness>);
 const original=m.shifts;
 m.shifts=[{...original[0],positionId:'barista'} as typeof m.shifts[number]];
 const data=form();data.delete('confirmWarnings');
 try {
  await expect(publishScheduleAction(data)).rejects.toMatchObject({destination:'/app/schedule?week=2030-10-07&location=loc-1&publishCheck=loc-1'});
  expect(vi.mocked(calculateScheduleHealth).mock.calls[0][0].shifts[0]).toMatchObject({positionId:'barista'});
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
