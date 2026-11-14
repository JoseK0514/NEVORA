import type {CorrectionRequestCommand} from './validation';
// This document only. Privacy/panel retirement must not replace an uncertain
// business operation. No storage, cross-company or cross-actor draft sharing.
const pending=new Map<string,CorrectionRequestCommand>();
export const delegatedJournalKey=(origin:string,company:string,actor:string,employee:string)=>JSON.stringify([origin,company,actor,employee]);
export function pendingDelegated(key:string){const command=pending.get(key);return command?{...command}:null;}
export function rememberDelegated(key:string,command:CorrectionRequestCommand){const prior=pending.get(key);if(prior&&JSON.stringify(prior)!==JSON.stringify(command))throw Error('Reconcile the original request first');pending.set(key,{...command});}
export function forgetDelegated(key:string,operationId:string){if(pending.get(key)?.operationId===operationId)pending.delete(key);}
