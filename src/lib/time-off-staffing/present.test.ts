import {expect,it} from 'vitest';
import type {ActionItem} from '../action-center/project';
import {staffingRepairActions} from './actions';
import {conflictConsequence,isStaffingRepair,repairOwnerLine,repairTitle,repairWhen} from './present';
import {presentItem} from '../action-center/present';
import {timeOffRequestId} from '../action-center/inbox';
import {actionCenterNavigation} from '../../components/action-center-navigation';
import type {StaffingConflict} from './model';

const conflict:StaffingConflict={id:'LEAVE_STAFFING:r1:s1',requestId:'r1',state:'repair_required',employeeId:'e1',employeeName:'Maria Rivera',ownerEmployeeId:'owner-1',reviewedAt:'2030-10-01T12:00:00Z',
 employeeInstruction:'approved_leave',publicationId:'p1',revisionNumber:1,shiftId:'s1',locationId:'loc-1',locationName:'Main Office',date:'2030-10-08',startTime:'07:00',endTime:'15:00',overlapMinutes:480,overlapDates:['2030-10-08']};
const [repair]=staffingRepairActions([conflict],'2030-10-07') as (ActionItem&{ownerEmployeeId?:string|null})[];

it('reads a staffing repair as the person’s shift to fill, never as a time-off decision',()=>{
 expect(isStaffingRepair(repair)).toBe(true);
 expect(isStaffingRepair({...repair,purpose:undefined})).toBe(false);
 expect(timeOffRequestId(repair)).toBeNull();
 expect(repairTitle(repair)).toBe('Fill Maria Rivera’s shift');
 expect(repairWhen(repair)).toBe('Tue, Oct 8 · 7:00\u00a0AM\u00a0– 3:00\u00a0PM · Main Office');
 const shown=presentItem(repair,'Fill shift');
 expect(shown).toMatchObject({title:'Fill Maria Rivera’s shift',person:'Maria Rivera',action:'Fill shift'});
 expect(shown.detail).toMatch(/^Approved time off · Tue, Oct 8/);// B7 wording (NV-119)
 const nav=actionCenterNavigation(repair);
 expect(nav.label).toBe('Fill shift');
 // Week, location, person and repair stay in the destination; nothing points at Approve or Decline.
 expect(nav.href).toBe('/app/schedule?week=2030-10-07&location=loc-1&employeeId=e1&leaveRepair=LEAVE_STAFFING%3Ar1%3As1#leave-repair');
 expect(JSON.stringify({shown,nav})).not.toMatch(/\bApprove\b|Decline|Review time off|dismiss/i);
});
it('says who fixes it: the approving reviewer, or an Owner for older approvals without one',()=>{
 // B7 wording (NV-119 glossary): "time off", not "leave", and no blame in "to fix".
 expect(repairOwnerLine(repair,'owner-1')).toBe('You approved this time off, so this shift is yours to fill.');
 expect(repairOwnerLine(repair,'someone')).toBe('Assigned to the manager who approved the time off.');
 expect(repairOwnerLine({...repair,ownerEmployeeId:null})).toBe('No one is assigned yet. An Owner can take it.');
});
it('states the coverage consequence of a pending conflict from overlapMinutes',()=>{
 expect(conflictConsequence({...conflict,state:'approval_conflict'})).toBe('The whole shift (8\u00a0h) would need someone else');
 expect(conflictConsequence({...conflict,overlapMinutes:240})).toBe('4\u00a0h of this shift would need someone else');
});
