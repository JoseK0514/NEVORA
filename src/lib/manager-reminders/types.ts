export type ManagerReminderCommand={operationId:string;authority:string;employeeId:string}&(
 {kind:'AVAILABILITY';weekStart:string;expectedDeadline:string}|
 {kind:'COMMUNICATION';communicationId:string;expectedRevisionId:string});
export type ManagerReminderResult=
 | {status:'committed';operationId:string;notificationId:string;disposition:'queued'|'already_queued'}
 | {status:'blocked'|'conflict'|'unavailable';reason:string}
 | {status:'outcome_unknown';operationId:string};
