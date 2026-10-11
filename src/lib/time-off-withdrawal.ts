/** One action on one immutable request. No caller-selected actor or status. */
export type WithdrawalCommand = {requestId:string;operationId:string};
export type WithdrawalReceipt = WithdrawalCommand & {status:'CANCELLED';reviewedBy:string;reviewedAt:string};
export type WithdrawalActionState = {outcome:'idle'|'withdrawn'|'conflict'|'unavailable'|'invalid'|'denied';receipt?:WithdrawalReceipt};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function withdrawalIdentity(requestId:string){return `TIME_OFF_WITHDRAW:${requestId}`;}
export function parseWithdrawalCommand(input:unknown):WithdrawalCommand {
 if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('invalid_withdrawal');
 const item=input as Record<string,unknown>;
 if(Object.keys(item).sort().join(',')!=='operationId,requestId'||typeof item.requestId!=='string'||!uuid.test(item.requestId)||item.operationId!==withdrawalIdentity(item.requestId))throw new Error('invalid_withdrawal');
 return {requestId:item.requestId,operationId:item.operationId as string};
}
