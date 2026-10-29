/** One vocabulary for request states on Requests, Time off and shift-request pages, so a request reads the same in a
 * list and on its own page. */
export const timeOffStatus:Record<string,string>={PENDING:'Waiting for approval',APPROVED:'Approved',DENIED:'Declined',CANCELLED:'Withdrawn'};

/** A shift request (swap, cover, pickup or Unable to work). An approved Unable-to-work report names whether the
 * assignment was released when that is known; otherwise it reads Approved. */
export function shiftRequestStatus(status:string,{recipient=false,callout=false,releaseApplies}:{recipient?:boolean;callout?:boolean;releaseApplies?:boolean|null}={}){
 if(status==='RECORDED')return 'Recorded history';
 if(status==='APPROVED')return callout?releaseApplies===true?'Released assignment':releaseApplies===false?'Previous approval':'Approved':'Completed';
 if(status==='EMPLOYEE_PENDING')return recipient?'Needs your answer':'Waiting for a teammate';
 if(status==='MANAGER_PENDING'||status==='PENDING')return 'Waiting for manager review';
 if(status==='OPEN')return 'Waiting for coverage';
 return ({DENIED:'Declined',CANCELLED:'Cancelled',EXPIRED:'Expired'} as Record<string,string>)[status]??'Open to check status';
}
