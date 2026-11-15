import type {NotificationIntent,SourceSnapshot} from './types';
export type NotificationListFacts={eventType:string;outcome:string|null;names:string[];count:number|null};
const titles:Readonly<Record<string,string>>={SCHEDULE_PUBLISHED:'Schedule published',SCHEDULE_CHANGED:'Schedule updated',SCHEDULE_ACKNOWLEDGEMENT_REMINDER:'Review your schedule',TIME_OFF_APPROVED:'Time off approved',TIME_OFF_DENIED:'Time off declined',CALLOUT_APPROVED:'Can’t-work request approved',CALLOUT_DENIED:'Can’t-work request declined',SWAP_RESPONSE_REQUIRED:'Swap request',SWAP_APPROVED:'Swap approved',SWAP_DENIED:'Swap declined',COVERAGE_APPROVED:'Cover approved',COVERAGE_DENIED:'Cover declined',COVERAGE_INVITATION:'A shift needs cover',PAYROLL_STATEMENT:'Pay statement available',PAYROLL_PREPARATION:'Statements need preparation',COMMUNICATION:'Team update',MANAGER_REVIEW:'Items need review'};
/** Invoke only after current recipient/source authorization, using the same
 * final observation. Free text/reasons, private payroll amounts and IDs stay out. */
export function notificationListPresentation(intent:NotificationIntent,source:SourceSnapshot|null,fallback:string):NotificationListFacts&{label:string}{
 const names=source?.kind==='TIME_OFF'||source?.kind==='CALLOUT'?[source.record.employeeName]:source?.kind==='EXCHANGE'?[source.record.requestedByName]:[];
 const outcome=source&&['TIME_OFF','CALLOUT','EXCHANGE'].includes(source.kind)&&'record'in source?source.record.status:null;
 const count=source?.kind==='MANAGER_SUMMARY'?source.items.length:source?.kind==='SCHEDULE'?source.currentShifts.filter(s=>s.employeeId===intent.employeeId).length:null;
 return {eventType:intent.type,outcome,names:names.filter((n):n is string=>typeof n==='string'&&n.trim().length>0&&n.length<=300),count,label:titles[intent.type]??fallback};
}
