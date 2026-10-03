import { readFileSync } from 'node:fs';
import { beforeEach, expect, it, vi } from 'vitest';
const m=vi.hoisted(()=>({
  insert:vi.fn(async (_input: unknown)=> 'new'), update:vi.fn(async()=>true), remove:vi.fn(async()=>true), publish:vi.fn(async()=>({published:true})),
  clear:vi.fn(), send:vi.fn(()=>new Promise<never>(()=>{})), provider:vi.fn(), role:'MANAGER',
  shifts:[{id:'s',employeeId:'E',locationId:'loc-1',date:'2030-09-30',startTime:'09:00',endTime:'17:00',isDesignatedLead:false}],
}));
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
vi.mock('@/lib/data/employees',()=>({listEmployees:vi.fn()}));
vi.mock('@/lib/data/schedules',()=>({insertShift:m.insert,updateShift:m.update,deleteShift:m.remove,ensureSchedule:async()=> 'a',getShiftValidationContext:async()=>({}),getShiftForManagement:async()=>({id:'s',employeeId:'E',locationId:'loc-1',weekStart:'2030-10-07'}),listWeekShifts:async()=>m.shifts}));
vi.mock('@/lib/data/schedule-templates',()=>({listTemplateShifts:async()=>[{employeeId:'E',locationId:'loc-1',dayOffset:0,startTime:'09:00',endTime:'17:00'},{employeeId:'BLOCKED',locationId:'loc-1',dayOffset:1,startTime:'09:00',endTime:'17:00'}],archiveScheduleTemplate:vi.fn(),createTemplateFromWeek:vi.fn()}));
import { applyTemplateAction } from './templates/actions';
import { createShiftAction,updateShiftAction,deleteShiftAction,publishScheduleAction,copyPreviousWeekAction } from './actions';
function form(){const data=new FormData();Object.entries({shiftId:'s',employeeId:'E',locationId:'loc-1',weekStart:'2030-10-07',date:'2030-10-07',startTime:'09:00',endTime:'17:00',confirmWarnings:'yes'}).forEach(([k,v])=>data.set(k,v));return data;}
beforeEach(()=>{vi.clearAllMocks();m.role='MANAGER';});
it.each([['publish',publishScheduleAction,'&published=loc-1'],['create',createShiftAction,''],['update',updateShiftAction,'&updated=1'],['delete',deleteShiftAction,'&deleted=1']] as const)('%s returns without provider contact or blanket acknowledgement invalidation',async(_,action,suffix)=>{
  await expect(action(form())).rejects.toMatchObject({destination:`/app/schedule?week=2030-10-07${suffix}`});
  expect(m.provider).not.toHaveBeenCalled();expect(m.send).not.toHaveBeenCalled();expect(m.clear).not.toHaveBeenCalled();
});
it('create update delete and copy use only server actor identity',async()=>{
  const data=form();data.set('actorEmployeeId','FORGED');
  for(const action of [createShiftAction,updateShiftAction,deleteShiftAction,copyPreviousWeekAction]){try{await action(data);}catch{}}
  expect(m.insert.mock.calls.every(call=>(call[0] as unknown as {actorEmployeeId:string}).actorEmployeeId==='M')).toBe(true);
  expect(m.update).toHaveBeenCalledWith(expect.objectContaining({actorEmployeeId:'M'}));expect(m.remove).toHaveBeenCalledWith('s','M');
});
it('copy retains per-shift eligibility and partial success counts',async()=>{
  const original=m.shifts;m.shifts=[...original,{...original[0],id:'blocked',employeeId:'BLOCKED'}];
  try{await expect(copyPreviousWeekAction(form())).rejects.toMatchObject({destination:'/app/schedule?week=2030-10-07&copied=1&skipped=1&copyWarnings=0'});expect(m.insert).toHaveBeenCalledTimes(1);expect(m.clear).not.toHaveBeenCalled();}finally{m.shifts=original;}
});
it('actual schedule/action import boundary contains no delivery provider or kick and no second action revision',()=>{
  for(const file of ['src/app/app/schedule/actions.ts','src/app/app/schedule/templates/actions.ts','src/lib/data/schedules.ts','src/lib/data/publication-revisions.ts','src/lib/data/notification-transactions.ts']){
    const source=readFileSync(file,'utf8');expect(source).not.toMatch(/from\s+['"][^'"]*(?:notifications\/(?:provider|worker)|push-deliveries)['"]/);expect(source).not.toMatch(/\b(?:createPushSender|dispatchNotifications)\s*\(/); if(file.includes('/app/')) expect(source).not.toMatch(/\brecordPublishedWeekRevision\s*\(/);
  }
});

it('templates retain partial eligibility and pass server actor through the ordinary insertion boundary',async()=>{
  const data=form();data.set('templateId','t');
  await expect(applyTemplateAction(data)).rejects.toMatchObject({destination:'/app/schedule/templates?week=2030-10-07&applied=1&skipped=1&warnings=0'});
  expect(m.insert).toHaveBeenCalledTimes(1);expect(m.insert).toHaveBeenCalledWith(expect.objectContaining({actorEmployeeId:'M'}));expect(m.clear).not.toHaveBeenCalled();expect(m.provider).not.toHaveBeenCalled();
});
it.each(['EMPLOYEE','LEAD'])('%s cannot mutate schedules',async role=>{
 m.role=role;await expect(createShiftAction(form())).rejects.toMatchObject({destination:'/app'});expect(m.insert).not.toHaveBeenCalled();
});
