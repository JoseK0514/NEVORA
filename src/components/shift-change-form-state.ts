import type {ShiftChangeResult} from '../lib/shift-changes/types';
import type {PortalLang} from '@/lib/i18n/portal-lang';
import {shiftCopy} from './shift-copy';
type Send=(data:FormData)=>Promise<ShiftChangeResult>;
/** Owns one immutable operation until its outcome is known. No private local cache. */
export class ShiftChangeFormState {
 pending=false;
 result:ShiftChangeResult|null=null;
 private payload:readonly [string,FormDataEntryValue][]|null=null;
 constructor(private identity:()=>string){}
 get uncertain(){return this.result?.status==='outcome-unknown';}
 private data(){const data=new FormData();for(const [key,value] of this.payload??[])data.append(key,value);return data;}
 /** Capture one payload/operation ID; a lost response keeps it immutable for reconciliation. */
 async submit(data:FormData,send:Send){
  if(this.pending||this.uncertain)return;
  data.set('operationId',this.identity());this.payload=[...data];this.pending=true;this.result=null;
  try{this.result=await send(this.data());}catch{this.result={status:'outcome-unknown',operationId:String(data.get('operationId'))};}finally{this.pending=false;}
 }
 /** Check the receipt first, then resend the original payload only when no result is found. */
 async retry(reconcile:(id:string)=>Promise<ShiftChangeResult|null>,send:Send){
  if(this.pending||!this.uncertain||!this.payload||this.result?.status!=='outcome-unknown')return;
  this.pending=true;const operationId=this.result.operationId;
  try{this.result=await reconcile(operationId)??await send(this.data());}catch{this.result={status:'outcome-unknown',operationId};}finally{this.pending=false;}
 }
}
/** The result's line in the person's language (English when a caller passes none). */
export function shiftChangeFeedback(result:ShiftChangeResult,lang:PortalLang='en'):string {
 const t=shiftCopy(lang).feedback;
 switch(result.status){
  case 'completed':return t.completed;
  case 'pending':return t.pending;
  case 'closed':return t.closed;
  case 'conflict':return t.conflict;
  case 'unavailable':return t.unavailable;
  case 'blocked':return result.issues.map(i=>i.message).join(' ')||t.blocked;
  case 'outcome-unknown':return t.outcomeUnknown;
 }
}
