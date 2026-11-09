import {businessDateStart,periodsOverlap,shiftPeriod,splitBusinessDays,timeMinutes} from '../scheduling/periods';

export type StaffingLeave={id:string;employeeId:string;startDate:string;endDate:string;startTime?:string;endTime?:string;status:string;reviewedBy:string|null;reviewedAt:string|null};
export type StaffingAssignment={id:string;employeeId:string;employeeName:string;locationId:string;locationName:string;date:string;startTime:string;endTime:string;publicationId:string;revisionNumber:number;isCalloutApproved:boolean};
export type StaffingConflict={
  id:string;requestId:string;state:'approval_conflict'|'repair_required';employeeId:string;employeeName:string;
  ownerEmployeeId:string|null;reviewedAt:string|null;employeeInstruction:'awaiting_decision'|'approved_leave';
  publicationId:string;revisionNumber:number;shiftId:string;locationId:string;locationName:string;
  date:string;startTime:string;endTime:string;overlapMinutes:number;overlapDates:string[];
};
export type StaffingSnapshot={state:'ready';authority:string;weekStart:string;observedAt:string;validForMs:number;items:StaffingConflict[]}|{state:'unavailable';reason:'access_denied'|'read_failed'};

/** One queue identity per durable request/assignment pair. Only published facts
 * belong here; editing drafts cannot dismiss an outstanding staffing obligation. */
export function projectStaffingConflict(leave:StaffingLeave,assignment:StaffingAssignment):StaffingConflict|null {
  if(!['PENDING','APPROVED'].includes(leave.status)||leave.employeeId!==assignment.employeeId||assignment.isCalloutApproved)return null;
  businessDateStart(leave.startDate); businessDateStart(leave.endDate);
  if(leave.endDate<leave.startDate || Boolean(leave.startTime)!==Boolean(leave.endTime))throw Error('Invalid leave period');
  const start=leave.startTime?timeMinutes(leave.startTime):0,end=leave.endTime?timeMinutes(leave.endTime,true):1440;
  if(start>=end || !leave.id || !assignment.id || !assignment.publicationId || !Number.isSafeInteger(assignment.revisionNumber)||assignment.revisionNumber<1)throw Error('Invalid staffing source');
  let overlapMinutes=0;
  const overlapDates:string[]=[];
  for(const day of splitBusinessDays(shiftPeriod(assignment))){
    if(day.date<leave.startDate||day.date>leave.endDate)continue;
    const assigned={start:day.startMinute,end:day.endMinute},absent={start,end};
    if(periodsOverlap(assigned,absent)){overlapMinutes+=Math.min(assigned.end,end)-Math.max(assigned.start,start);overlapDates.push(day.date);}
  }
  if(!overlapMinutes)return null;
  const approved=leave.status==='APPROVED';
  return {id:`LEAVE_STAFFING:${encodeURIComponent(leave.id)}:${encodeURIComponent(assignment.id)}`,requestId:leave.id,
    state:approved?'repair_required':'approval_conflict',employeeId:leave.employeeId,employeeName:assignment.employeeName,
    ownerEmployeeId:approved?leave.reviewedBy:null,reviewedAt:approved?leave.reviewedAt:null,
    employeeInstruction:approved?'approved_leave':'awaiting_decision',publicationId:assignment.publicationId,revisionNumber:assignment.revisionNumber,
    shiftId:assignment.id,locationId:assignment.locationId,locationName:assignment.locationName,date:assignment.date,
    startTime:assignment.startTime,endTime:assignment.endTime,overlapMinutes,overlapDates};
}
