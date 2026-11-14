/** SCRUM-187: in-app persistence/read progress only; never provider delivery or acknowledgement. */
export type Topic={kind:'SHIFT'|'STAFF_TASK';id:string};
type Operation={operationId:string;authority:string;conversationId:string};
type Current=Operation&{membershipEpoch:string;expectedRevision:number};
export type ConversationCommand=
 | Operation&{kind:'CREATE_DIRECT';locationId:string;peerId:string;context:Topic|null}
 | Operation&{kind:'CREATE_GROUP';locationId:string;title:string;memberIds:string[];context:Topic|null}
 | Current&{kind:'SEND';messageId:string;body:string}
 | Current&{kind:'ADD_MEMBER'|'REMOVE_MEMBER';employeeId:string}
 | Current&{kind:'RENAME_GROUP';title:string}
 | Current&{kind:'SET_ARCHIVED';archived:boolean}
 | Current&{kind:'MARK_READ';throughSequence:string}
 | Current&{kind:'SET_MUTED';muted:boolean}
 | Current&{kind:'LEAVE'};
export type ConversationQuery=
 | {kind:'CONTEXT';employeeCursor:string|null;locationCursor:string|null}
 | {kind:'INBOX';cursor:string|null;archived:boolean}
 | {kind:'DETAIL';conversationId:string;membershipEpoch:string}
 | {kind:'HISTORY';conversationId:string;membershipEpoch:string;cursor:string|null};
export type Receipt={status:'committed';operationId:string;kind:ConversationCommand['kind'];conversationId:string;requestedConversationId:string;revision:number;membershipEpoch:string;messageId?:string;sequence?:string};
export type CommandResult=Receipt|{status:'invalid'|'blocked'|'conflict'|'unavailable';reason:string}|{status:'outcome_unknown';operationId:string};
export type Lifetime={authority:string;observedAt:string;validForMs:number};
export type Member={employeeId:string;name:string;role:string;membershipEpoch:string;readThrough:string};
export type Conversation={id:string;kind:'DIRECT'|'GROUP';locationId:string;title:string|null;revision:number;archived:boolean;membershipEpoch:string;muted:boolean;unread:number;lastSequence:string;members:Member[];context:null|{kind:Topic['kind'];available:false}|{kind:Topic['kind'];available:true;id:string;label:string}};
export type Message={id:string;sequence:string;authorId:string;body:string;persistedAt:string;readBy:string[]};
export type Resource=({state:'ready'}&Lifetime&(
 {kind:'CONTEXT';management:boolean;taskContextAvailable:boolean;locations:{id:string;name:string}[];employees:{id:string;name:string;eligibleLocationIds:string[]}[];nextEmployeeCursor:string|null;nextLocationCursor:string|null}
 |{kind:'INBOX';conversations:Conversation[];nextCursor:string|null}
 |{kind:'DETAIL';conversation:Conversation}
 |{kind:'HISTORY';conversationId:string;membershipEpoch:string;messages:Message[];nextCursor:string|null}
 ))|{state:'invalid'|'blocked'|'unavailable';reason:string};
