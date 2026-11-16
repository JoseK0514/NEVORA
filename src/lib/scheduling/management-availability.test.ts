import {expect,it} from 'vitest';
import {validateShift,type ValidateShiftInput} from './validate-shift';
import {applyRestrictionCommand,emptyRestrictionDocument} from './restrictions';
import {automaticWeek} from '../../test/fixtures/automatic-week';
import {planWeek} from './generation/planner';

const rules=(unavailable:{dayOfWeek:number;startTime:string;endTime:string}[]=[])=>applyRestrictionCommand(emptyRestrictionDocument(),{kind:'SET',operationId:'11111111-1111-4111-8111-111111111111',expectedRevision:0,effectiveWeek:'2026-10-05',unavailable,reason:'Management confirmed agreement'},{actorId:'owner',actorRole:'OWNER',now:'2026-10-01T00:00:00.000Z',earliestWeek:'2026-10-05'}).document.versions;
function input(){const i=automaticWeek(),e=i.employees[0];return {workspace:i.workspace,location:i.locations[0],candidate:{employeeId:e.id,locationId:'loc-1',date:'2026-10-10',startTime:'08:00',endTime:'16:00'},employee:e,existingShifts:[],availability:[],approvedTimeOff:[],managementRestrictions:rules()} as ValidateShiftInput&{managementRestrictions:ReturnType<typeof rules>};}

it.each(['AUTOMATIC','MANAGER_SCHEDULE','SHIFT_EXCHANGE'] as const)('preferences do not block %s after management confirms no restrictions',mode=>{
 const result=validateShift({...input(),mode});expect(result.eligible).toBe(true);expect(result.canSave).toBe(true);
 expect(result.warnings).toContainEqual(expect.objectContaining({code:'PREFERENCE_NOT_MET'}));
});
it.each(['AUTOMATIC','MANAGER_SCHEDULE','SHIFT_EXCHANGE'] as const)('an agreed restriction blocks %s despite an employee preference',mode=>{
 const result=validateShift({...input(),mode,availability:[{dayOfWeek:6,startTime:'00:00',endTime:'24:00'}],managementRestrictions:rules([{dayOfWeek:6,startTime:'00:00',endTime:'24:00'}])});
 expect(result.canSave).toBe(false);expect(result.blockers).toContainEqual(expect.objectContaining({code:'AGREED_RESTRICTION'}));
});
it('a preference exception cannot reopen management-restricted hours',()=>{
 expect(validateShift({...input(),managementRestrictions:rules([{dayOfWeek:6,startTime:'12:00',endTime:'16:00'}]),availabilityExceptions:[{date:'2026-10-10',kind:'AVAILABLE',startTime:'08:00',endTime:'16:00'}]}).canSave).toBe(false);
});
it('checks the next date of an overnight assignment against its own restriction',()=>{
 const result=validateShift({...input(),candidate:{...input().candidate,startTime:'22:00',endTime:'06:00'},managementRestrictions:rules([{dayOfWeek:0,startTime:'00:00',endTime:'06:00'}])});
 expect(result.blockers).toContainEqual(expect.objectContaining({code:'AGREED_RESTRICTION',details:{date:'2026-10-11'}}));
});
it('preserves approved leave, weekly maximum and cross-location overlap blockers',()=>{
 const i=input();
 expect(validateShift({...i,approvedTimeOff:[{startDate:'2026-10-10',endDate:'2026-10-10',status:'APPROVED'}]}).blockers).toContainEqual(expect.objectContaining({code:'APPROVED_TIME_OFF'}));
 expect(validateShift({...i,employee:{...i.employee,maximumWeeklyHours:4}}).blockers).toContainEqual(expect.objectContaining({code:'MAX_WEEKLY_HOURS'}));
 expect(validateShift({...i,existingShifts:[{...i.candidate,locationId:'loc-2'}]}).blockers).toContainEqual(expect.objectContaining({code:'SHIFT_OVERLAP'}));
});
it('retains legacy restrictions before the effective version and for unconfirmed data',()=>{
 expect(validateShift({...input(),managementRestrictions:[]}).eligible).toBe(false);
 expect(validateShift({...input(),candidate:{...input().candidate,date:'2026-10-03'}}).eligible).toBe(false);
});
it('fills joint location and Lead demand even when everyone prefers other hours',()=>{
 const i=automaticWeek(2);i.staffing.forEach(s=>{s.minimumStaffPerShift=1;});i.staffing[1].requiresDesignatedLead=true;
 i.employees=i.employees.slice(0,2);i.employees[1].eligibleLocationIds=['loc-1'];
 for(const e of i.employees){e.availability=[];Object.assign(e,{managementRestrictions:rules()});}
 const plan=planWeek(i);expect(plan.status).toBe('COMPLETE');expect(plan.additions).toHaveLength(2);
 expect(plan.additions.find(a=>a.locationId==='loc-2')).toMatchObject({employeeId:'e1',isDesignatedLead:true});
 expect(new Set(plan.additions.map(a=>a.employeeId)).size).toBe(2);
});
it('reports a real partial when firm restrictions leave too few eligible people',()=>{
 const i=automaticWeek(2);i.staffing.forEach(s=>{s.minimumStaffPerShift=1;});i.employees=i.employees.slice(0,1);i.employees[0].availability=[];Object.assign(i.employees[0],{managementRestrictions:rules()});
 const plan=planWeek(i);expect(plan.status).toBe('PARTIAL');expect(plan.additions).toHaveLength(1);expect(plan.demand.coverage.coveredMinutes).toBeLessThan(plan.demand.coverage.requiredMinutes);
});
it.each(['e1','e2'])('accommodates %s preferences after equal coverage and workload, before an arbitrary tie',preferred=>{
 const i=automaticWeek();i.employees=i.employees.slice(0,2);i.staffing[0].minimumStaffPerShift=1;
 for(const e of i.employees){e.availability=e.id===preferred?[{dayOfWeek:1,startTime:'08:00',endTime:'16:00'}]:[];Object.assign(e,{managementRestrictions:rules()});}
 expect(planWeek(i).additions[0].employeeId).toBe(preferred);
});
