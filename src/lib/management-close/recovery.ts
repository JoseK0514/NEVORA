import type {ManagementCloseCommand} from './contracts';
export type CloseAttempt={command:ManagementCloseCommand;authority:string};
// This tab's private operation journal deliberately survives panel/privacy
// unmounts. It is never persisted to storage or shown to another actor.
const attempts=new Map<string,CloseAttempt>();
const key=(scope:string,actorId:string)=>JSON.stringify([scope,actorId]);
export function rememberClose(scope:string,actorId:string,attempt:CloseAttempt):void {
 const existing=attempts.get(key(scope,actorId));
 if(existing&&(existing.command.operationId!==attempt.command.operationId||JSON.stringify(existing.command)!==JSON.stringify(attempt.command)))throw Error('Reconcile the original close first');
 attempts.set(key(scope,actorId),{command:{...attempt.command},authority:attempt.authority});
}
export function pendingClose(scope:string,actorId:string):CloseAttempt|null {
 const found=attempts.get(key(scope,actorId));return found?{command:{...found.command},authority:found.authority}:null;
}
export function forgetClose(scope:string,actorId:string,operationId:string):void {
 if(attempts.get(key(scope,actorId))?.command.operationId===operationId)attempts.delete(key(scope,actorId));
}
