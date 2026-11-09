/** One action on one immutable request. No caller-selected actor or status. */
export type WithdrawalCommand = {requestId:string;operationId:string};
export type WithdrawalReceipt = WithdrawalCommand & {status:'CANCELLED';reviewedBy:string;reviewedAt:string};
export type WithdrawalActionState = {outcome:'idle'|'withdrawn'|'conflict'|'unavailable'|'invalid'|'denied';receipt?:WithdrawalReceipt};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
/** Stable retry identity: withdrawing the same immutable request reuses one operation. */
export function withdrawalIdentity(requestId:string){return `TIME_OFF_WITHDRAW:${requestId}`;}
/**
 * Accepts only a v4 request UUID and its deterministic operation identity.
 * Actor and final status come from the authenticated server transaction, never
 * from this command. Throws invalid_withdrawal for extra or inconsistent fields.
 */
export function parseWithdrawalCommand(input:unknown):WithdrawalCommand {
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('invalid_withdrawal');
 const item=input as Record<string,unknown>;
 if(Object.keys(item).sort().join(',')!=='operationId,requestId'||typeof item.requestId!=='string'||!uuid.test(item.requestId)||item.operationId!==withdrawalIdentity(item.requestId))throw new Error('invalid_withdrawal');
 return {requestId:item.requestId,operationId:item.operationId as string};
}
