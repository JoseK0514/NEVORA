export type CalendarCommand={kind:'ISSUE'|'ROTATE'|'REVOKE';operationId:string;authority:string;expectedGeneration:string|null};
export type CalendarManagementResult=
 | {status:'created';operationId:string;id:string;generation:string;url:string}
 | {status:'active_url_unavailable'|'revoked';operationId:string;id:string;generation:string}
 | {status:'conflict'|'blocked'|'unavailable';reason:string}
 | {status:'outcome_unknown';operationId:string};
export type CalendarEvent={uid:string;sequence:number;stamp:string;lastModified:string;status:'CONFIRMED'|'CANCELLED';startAt:string;endAt:string;summary:string;location:string|null};
export type CalendarFeedRead={state:'ready';observedAt:string;events:CalendarEvent[]}|{state:'unauthorized'|'unavailable';reason:string};
export type CalendarSubscriptionStatus=
 | {state:'active'|'revoked'|'none';id:string|null;generation:string|null;issuedAt:string|null;allowedLocationIds:string[];authority:string;observedAt:string;validForMs:number;canIssue:boolean}
 | {state:'unauthorized'|'unavailable';reason:string};
