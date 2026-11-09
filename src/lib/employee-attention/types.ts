export type AttentionRef={kind:'SCHEDULE'|'EXCHANGE'|'TIME_OFF'|'TIME_CORRECTION'|'COMMUNICATION';id:string;version:string};
export type AttentionCommand={kind:'MARK_READ';operationId:string;authority:string;ref:AttentionRef};
export type CommandResult=
 | {status:'committed';operationId:string;id:string;version:string}
 | {status:'conflict'|'blocked'|'unavailable';reason:string}
 | {status:'outcome_unknown';operationId:string};
