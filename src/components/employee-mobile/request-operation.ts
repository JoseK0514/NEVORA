import {ShiftChangeFormState} from '../shift-change-form-state';
import type {ShiftChangeResult} from '@/lib/shift-changes/types';
import type {EmployeeResponseKind} from '@/lib/employee-exchange';
type Send=(data:FormData)=>Promise<ShiftChangeResult>;
/** One existing-request intent at a time; the established owner retains its immutable operation and payload. */
export class EmployeeRequestOperation {
 readonly state:ShiftChangeFormState;
 kind:EmployeeResponseKind|null=null;
 /** A confirmed response from the previous revision of this request, kept so its confirmation stays on screen after the refresh. */
 receipt:{kind:EmployeeResponseKind;result:ShiftChangeResult}|null=null;
 private version=0;
 private listeners=new Set<()=>void>();
 constructor(readonly requestId:string,readonly revision:number,identity:()=>string=()=>crypto.randomUUID()){this.state=new ShiftChangeFormState(identity);}
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 snapshot=()=>this.version;
 private notify(){this.version++;for(const listener of this.listeners)listener();}
 submit(send:Send,allowed:()=>boolean=()=>true){return this.respond('ACCEPT',send,allowed);}
 async respond(kind:EmployeeResponseKind,send:Send,allowed:()=>boolean){
  if(!allowed()||this.state.pending||this.state.uncertain||this.state.result&&['completed','pending','closed'].includes(this.state.result.status))return;
  this.kind=kind;
  const data=new FormData();data.set('kind',kind);data.set('requestId',this.requestId);data.set('expectedRevision',String(this.revision));
  const pending=this.state.submit(data,send);this.notify();await pending;this.notify();
 }
 async retry(reconcile:(id:string)=>Promise<ShiftChangeResult|null>,send:Send,allowed:()=>boolean=()=>true){
  if(!allowed()||this.state.pending||!this.state.uncertain)return;
  const pending=this.state.retry(reconcile,send);this.notify();await pending;this.notify();
 }
}
