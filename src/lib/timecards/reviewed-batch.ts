import type {Period} from './project';
import type {TimecardItem} from './read-model';
import type {TimecardCommand} from './service';
import {parseTimecardReceipt} from './client';
export type BatchAction='APPROVE'|'FINALIZE';
export type ReviewedBatch={period:Period;actorId:string;commands:readonly TimecardCommand[]};
export type BatchOutcome={command:TimecardCommand;status:'approved'|'finalized'|'blocked'|'conflict'|'unavailable'|'denied'|'outcome-unknown'|'not-submitted'};
export function batchExclusion(item:TimecardItem,actorId:string,action:BatchAction):'self'|'scope'|'issues'|'state'|null{
 if(item.card.employeeId===actorId)return 'self';
 // B-12: a location-scoped Manager reviews only cards whose time is all at their locations; the server refuses the rest.
 if(item.outsideScope)return 'scope';
 if(item.card.issues.length)return 'issues';
 if(action==='FINALIZE'?item.state!=='APPROVED':!['DRAFT','REOPENED','NEEDS_REVIEW'].includes(item.state))return 'state';
 return null;
}
/** Only command references are retained: private rows stay in the protected view. */
export function reviewTimecards(period:Period,actorId:string,cards:readonly TimecardItem[],selected:readonly string[],action:BatchAction,uuid:()=>string):ReviewedBatch{
 if(!selected.length||selected.length>100||new Set(selected).size!==selected.length)throw Error('Select 1 to 100 current timecards.');
 const commands=selected.map(employeeId=>{
  const item=cards.find(c=>c.card.employeeId===employeeId);
  if(!item||batchExclusion(item,actorId,action)||item.card.startDate!==period.startDate||item.card.endDate!==period.endDate)throw Error('The selected source is not eligible. Refresh and review again.');
  return Object.freeze({...period,employeeId,expectedRevision:item.revision,expectedSourceHash:item.sourceHash,operationId:uuid(),action});
 });
 if(new Set(commands.map(c=>c.operationId)).size!==commands.length)throw Error('Each card requires its own operation identity.');
 return Object.freeze({period:Object.freeze({...period}),actorId,commands:Object.freeze(commands)});
}
export function reviewIsCurrent(review:ReviewedBatch,period:Period,actorId:string,cards:readonly TimecardItem[]):boolean{
 if(review.actorId!==actorId||review.period.startDate!==period.startDate||review.period.endDate!==period.endDate)return false;
 return review.commands.every(c=>{
  const item=cards.find(item=>item.card.employeeId===c.employeeId);
  return !!item&&!batchExclusion(item,actorId,c.action as BatchAction)&&item.revision===c.expectedRevision&&item.sourceHash===c.expectedSourceHash&&item.card.startDate===period.startDate&&item.card.endDate===period.endDate;
 });
}
/** Per-card atomicity only. Never continue a halted set or invent a retry ID. */
export async function runReviewedBatch(review:ReviewedBatch,isCurrent:()=>boolean,send:(command:TimecardCommand)=>Promise<{httpStatus:number;body:unknown}>,onOutcome?:(outcome:BatchOutcome)=>void):Promise<BatchOutcome[]>{
 const outcomes:BatchOutcome[]=[];let halted=false;
 for(const command of review.commands){
  let status:BatchOutcome['status']='not-submitted';
  if(!halted&&isCurrent()){
   try{
    const response=await send(command);
    if(response.httpStatus===401||response.httpStatus===403)status='denied';
    else{const receipt=parseTimecardReceipt(response.body,command,response.httpStatus);status=receipt.status==='reopened'?'outcome-unknown':receipt.status;}
   }catch{status='outcome-unknown';}
  }
  const outcome={command,status};outcomes.push(outcome);onOutcome?.(outcome);
  if(status!=='approved'&&status!=='finalized')halted=true;
 }
 return outcomes;
}
