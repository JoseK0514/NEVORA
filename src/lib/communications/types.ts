export type {CommandResult} from '../employee-attention/types';
export type CommunicationScope =
 | {kind:'TODAYS_TEAM';locationId:string;businessDate:string}
 | {kind:'LOCATION';locationId:string}
 | {kind:'SHIFT';locationId:string;sourceShiftId:string;assignmentEpisodeId:string;termsFingerprint:string};
export type CommunicationDraft={
 type:'TODAYS_TEAM'|'LOCATION_ANNOUNCEMENT'|'SHIFT_NOTE'|'OPERATIONAL_UPDATE';
 scope:CommunicationScope;title:string;body:string;acknowledgement:'NONE'|'OPTIONAL'|'REQUIRED';expiresAt:string|null;
};
export type CommunicationCommand=
 | {kind:'PUBLISH';operationId:string;authority:string;draft:CommunicationDraft;audienceFingerprint:string}
 | {kind:'REVISE';operationId:string;authority:string;communicationId:string;expectedRevisionId:string;draft:CommunicationDraft;audienceFingerprint:string}
 | {kind:'WITHDRAW';operationId:string;authority:string;communicationId:string;expectedRevisionId:string}
 | {kind:'ACKNOWLEDGE';operationId:string;authority:string;communicationId:string;expectedRevisionId:string;contentHash:string};
export type CommunicationRead=
 | {state:'ready';id:string;revisionId:string;contentHash:string;title:string;body:string;type:CommunicationDraft['type'];publishedAt:string;editedAt:string|null;acknowledgement:CommunicationDraft['acknowledgement'];ownAcknowledgedAt:string|null;ownReadAt:string|null;authority:string;observedAt:string;validForMs:number;timeZone:string;expiresAt:string|null;authorContext:string;canWithdraw:boolean;sentCount?:number;management?:{draft:CommunicationDraft;recipients:{employeeId:string;name:string;acknowledgedAt:string|null}[]}}
 | {state:'withdrawn'|'unauthorized'|'unavailable';reason:string};
export type CommunicationListRead=
 | {state:'complete'|'partial';observedAt:string;items:CommunicationRead[];reason:string|null;validForMs:number;authority:string;timeZone:string}
 | {state:'unauthorized'|'unavailable';reason:string};

export type CommunicationContext={state:'ready';authority:string;observedAt:string;validForMs:number;management:boolean;businessDate:string;timeZone:string;locations:{id:string;label:string;/** The actor has a published, unreleased own shift there today (display only; send decides). */todayTeam:boolean}[];shifts:{id:string;locationId:string;date:string;startTime:string;endTime:string;assignmentEpisodeId:string;termsFingerprint:string;assigneeLabel:string;positionLabel:string|null}[]}|{state:'unavailable'|'unauthorized';reason:string};
