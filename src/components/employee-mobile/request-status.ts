import type {MobileLang} from './mobile-format';
import {requestStatusCopy} from './copy/request-status';
/** One vocabulary for request states on Requests, Time off and shift-request pages, so a request reads the same in a
 * list and on its own page. */
export const timeOffStatus:Record<string,string>=requestStatusCopy.en.timeOff;
/** The same words in the person's language: timeOffStatusIn('es').CANCELLED is "Retirada". */
export const timeOffStatusIn=(lang:MobileLang='en'):Record<string,string>=>requestStatusCopy[lang].timeOff;

/** A shift request (swap, cover, pickup or Unable to work). An approved Unable-to-work report names whether the
 * assignment was released when that is known; otherwise it reads Approved. */
export function shiftRequestStatus(status:string,{recipient=false,callout=false,releaseApplies}:{recipient?:boolean;callout?:boolean;releaseApplies?:boolean|null}={},lang:MobileLang='en'){
 const t=requestStatusCopy[lang];
 if(status==='RECORDED')return t.recorded;
 if(status==='APPROVED')return callout?releaseApplies===true?t.released:releaseApplies===false?t.previousApproval:t.approved:t.completed;
 if(status==='EMPLOYEE_PENDING')return recipient?t.needsAnswer:t.waitingTeammate;
 if(status==='MANAGER_PENDING'||status==='PENDING')return t.waitingManager;
 if(status==='OPEN')return t.waitingCoverage;
 return t.ended[status]??t.unknown;
}
