import {describe,expect,it} from 'vitest';
import {projectStaffingConflict} from './model';
import {staffingRepairActions} from './actions';

const leave={id:'leave-1',employeeId:'employee',startDate:'2030-10-08',endDate:'2030-10-08',status:'APPROVED' as const,reviewedBy:'manager',reviewedAt:'2030-10-01T12:00:00Z'};
const shift={id:'shift-1',employeeId:'employee',employeeName:'Fictional Worker',locationId:'loc-2',locationName:'West',date:'2030-10-08',startTime:'08:00',endTime:'12:00',publicationId:'publication-1',revisionNumber:1,isCalloutApproved:false};
describe('leave to published staffing handoff',()=>{
 it('keeps a stable assigned repair identity across reads and publication revisions',()=>{
  const item=projectStaffingConflict(leave,shift)!;
  expect(item).toMatchObject({id:'LEAVE_STAFFING:leave-1:shift-1',state:'repair_required',ownerEmployeeId:'manager',overlapMinutes:240,employeeInstruction:'approved_leave',requestId:'leave-1'});
  expect(projectStaffingConflict(leave,{...shift,publicationId:'publication-2',revisionNumber:2})?.id).toBe(item.id);
  expect(JSON.stringify(item)).not.toContain('reason');
 });
 it('discloses pending conflicts without pretending leave is already approved',()=>{
  expect(projectStaffingConflict({...leave,status:'PENDING',reviewedBy:null,reviewedAt:null},shift)).toMatchObject({state:'approval_conflict',ownerEmployeeId:null,employeeInstruction:'awaiting_decision'});
 });
 it.each([
  [{startTime:'09:00',endTime:'10:30'},90],
  [{startTime:'12:00',endTime:'13:00'},null],
  [{startDate:'2030-10-07',endDate:'2030-10-09',startTime:'10:00',endTime:'11:00'},60],
 ] as const)('uses each included day and half-open partial bounds: %j', (bounds,want)=>{
  const result=projectStaffingConflict({...leave,...bounds},shift);
  expect(result?.overlapMinutes??null).toBe(want);
 });
 it('includes the next day of an overnight shift without double-counting it',()=>{
  expect(projectStaffingConflict(leave,{...shift,date:'2030-10-07',startTime:'22:00',endTime:'02:00'})?.overlapMinutes).toBe(120);
 });
 it('does not invent conflict for another employee, denied leave, released callout or an unoverlapping date',()=>{
  expect(projectStaffingConflict(leave,{...shift,employeeId:'other'})).toBeNull();
  expect(projectStaffingConflict({...leave,status:'DENIED'},shift)).toBeNull();
  expect(projectStaffingConflict(leave,{...shift,isCalloutApproved:true})).toBeNull();
  expect(projectStaffingConflict({...leave,startDate:'2030-10-09',endDate:'2030-10-09'},shift)).toBeNull();
 });
 it('does not infer clock-in or payment permission from a leave approval',()=>{
  const result=projectStaffingConflict(leave,shift)!;
  expect(result.employeeInstruction).toBe('approved_leave');
  expect(Object.keys(result)).not.toContain('paid');
 });
 it.each([{endDate:'2030-10-07'},{startDate:'2030-02-30'},{startTime:'09:00'},{startTime:'12:00',endTime:'09:00'}])('fails closed for malformed saved leave: %j',bad=>{
  expect(()=>projectStaffingConflict({...leave,...bad},shift)).toThrow();
 });
});

it('preserves the employee/location detail prefix and repair-only routing for approved time off',()=>{
 const item=projectStaffingConflict(leave,shift)!;
 const before=structuredClone(item);
 const [action]=staffingRepairActions([item],'2030-10-07');
 expect(action).toMatchObject({id:item.id,type:'TIME_OFF',purpose:'STAFFING_REPAIR',employeeId:'employee',locationId:'loc-2',ownerEmployeeId:'manager',title:'Fill a shift for approved time off'});
 expect(action.detail.split(' · ')).toEqual(['Fictional Worker','West','Approved time off overlaps a published shift.']);
 const url=new URL(action.href,'https://portal.test');
 expect(Object.fromEntries(url.searchParams)).toEqual({week:'2030-10-07',location:'loc-2',employeeId:'employee',leaveRepair:item.id});
 expect(staffingRepairActions([{...item,state:'approval_conflict'}],'2030-10-07')).toEqual([]);
 expect(item).toEqual(before);
});
