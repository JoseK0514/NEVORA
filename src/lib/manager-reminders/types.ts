export type ManagerReminderCommand={operationId:string;authority:string;employeeId:string}&(
 {kind:'AVAILABILITY';weekStart:string;expectedDeadline:string}|
 {kind:'COMMUNICATION';communicationId:string;expectedRevisionId:string});
export type ManagerReminderResult=
 | {status:'committed';operationId:string;notificationId:string;disposition:'queued'|'already_queued'}
 | {status:'held'|'blocked'|'conflict'|'unavailable';reason:string}
 | {status:'outcome_unknown';operationId:string};

/** Advisory read, never permission to skip the command's transactional checks.
 * A recovered receipt is queue persistence, never a delivery confirmation. */
export type ManagerReminderEligibility=
 | {status:'ready';canQueue:true;scope:'COMPANY';targetEmployeeId:string;observedAt:string;dueAt:string;expiresAt:string;timeZone:string}
 | {status:'cooldown';canQueue:false;reason:'daily_budget_used';nextEligibleAt:string|null}
 | {status:'held'|'blocked'|'conflict'|'unavailable';reason:string}
 | Extract<ManagerReminderResult,{status:'committed'}>;
