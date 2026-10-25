import type {CorrectionReviewCommand} from './validation';

const copy=(command:CorrectionReviewCommand):CorrectionReviewCommand=>({operationId:command.operationId,requestId:command.requestId,expectedRevision:command.expectedRevision,decision:command.decision,...(command.note!==undefined?{note:command.note}:{})});
export function managerReviewRecoveryKey(actorId:string,sessionAuthority:string,scopeAuthority:string,view:string){return JSON.stringify([actorId,sessionAuthority,scopeAuthority,view]);}
/** In-memory recovery retains a copy of the exact uncertain command; callers partition/reset it by the authority key. */
export function createManagerReviewRecovery(){
 let pending:CorrectionReviewCommand|null=null;
 return {
  remember(command:CorrectionReviewCommand){pending=copy(command);},
  read(){return pending?copy(pending):null;},
  clear(operationId?:string){if(operationId===undefined||pending?.operationId===operationId)pending=null;},
 };
}
