import type {ShiftChangeResult} from '../lib/shift-changes/types';
type Send=(data:FormData)=>Promise<ShiftChangeResult>;
/** Owns one immutable operation until its outcome is known. No private local cache. */
export class ShiftChangeFormState {
 pending=false;
 result:ShiftChangeResult|null=null;
 private payload:readonly [string,FormDataEntryValue][]|null=null;
 constructor(private identity:()=>string){}
 get uncertain(){return this.result?.status==='outcome-unknown';}
 private data(){const data=new FormData();for(const [key,value] of this.payload??[])data.append(key,value);return data;}
 async submit(data:FormData,send:Send){
  if(this.pending||this.uncertain)return;
  data.set('operationId',this.identity());this.payload=[...data];this.pending=true;this.result=null;
  try{this.result=await send(this.data());}catch{this.result={status:'outcome-unknown',operationId:String(data.get('operationId'))};}finally{this.pending=false;}
 }
 async retry(reconcile:(id:string)=>Promise<ShiftChangeResult|null>,send:Send){
  if(this.pending||!this.uncertain||!this.payload||this.result?.status!=='outcome-unknown')return;
  this.pending=true;const operationId=this.result.operationId;
  try{this.result=await reconcile(operationId)??await send(this.data());}catch{this.result={status:'outcome-unknown',operationId};}finally{this.pending=false;}
 }
}
export function shiftChangeFeedback(result:ShiftChangeResult):string {
 switch(result.status){
  case 'completed':return 'Completed. The current schedule and request history have been refreshed.';
  case 'pending':return 'Request recorded. Review its current status below; an assignment may still be awaiting consent or management review.';
  case 'closed':return 'Request closed. Review its current status below.';
  case 'conflict':return 'Stale request. The assignment or request changed; reload and review before submitting again.';
  case 'unavailable':return 'This action is unavailable for your current account or request.';
  case 'blocked':return result.issues.map(i=>i.message).join(' ')||'This change cannot proceed with the current rules.';
  case 'outcome-unknown':return 'Outcome uncertain. The request may have been saved. Check and retry the same operation; your original entries are preserved.';
 }
}
