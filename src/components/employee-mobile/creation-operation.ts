import {ShiftChangeFormState} from '../shift-change-form-state';
import type {ShiftChangeResult} from '@/lib/shift-changes/types';
type Send=(data:FormData)=>Promise<ShiftChangeResult>;
/** Creation delegates immutable payload/receipt recovery to the established form owner. */
export class EmployeeCreationOperation{
 readonly state:ShiftChangeFormState;
 private version=0;
 private listeners=new Set<()=>void>();
 constructor(identity:()=>string=()=>crypto.randomUUID()){this.state=new ShiftChangeFormState(identity);}
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 snapshot=()=>this.version;
 private notify(){this.version++;for(const listener of this.listeners)listener();}
 async submit(data:FormData,send:Send,allowed:()=>boolean){
  if(!allowed()||this.state.pending||this.state.uncertain||this.state.result&&['completed','pending','closed'].includes(this.state.result.status))return;
  const pending=this.state.submit(data,send);this.notify();await pending;this.notify();
 }
 async retry(reconcile:(id:string)=>Promise<ShiftChangeResult|null>,send:Send,allowed:()=>boolean){
  if(!allowed()||this.state.pending||!this.state.uncertain)return;
  const pending=this.state.retry(reconcile,send);this.notify();await pending;this.notify();
 }
}
