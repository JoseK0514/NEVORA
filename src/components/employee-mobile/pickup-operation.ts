import {ShiftChangeFormState} from '../shift-change-form-state';
import type {ShiftChangeResult} from '../../lib/shift-changes/types';
type Send=(data:FormData)=>Promise<ShiftChangeResult>;
/** UI adapter over the existing immutable command owner. Survives private-view release, never persisted. */
export class PickupOperation {
 readonly state:ShiftChangeFormState;
 private version=0;
 private listeners=new Set<()=>void>();
 constructor(readonly requestId:string,readonly revision:number,identity:()=>string=()=>crypto.randomUUID()){this.state=new ShiftChangeFormState(identity);}
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 snapshot=()=>this.version;
 private notify(){this.version++;for(const listener of this.listeners)listener();}
 async submit(send:Send){
  if(this.state.pending||this.state.uncertain||this.state.result&&['completed','pending','closed'].includes(this.state.result.status))return;
  const data=new FormData();data.set('kind','ACCEPT');data.set('requestId',this.requestId);data.set('expectedRevision',String(this.revision));
  const pending=this.state.submit(data,send);this.notify();await pending;this.notify();
 }
 async retry(reconcile:(id:string)=>Promise<ShiftChangeResult|null>,send:Send){
  if(this.state.pending||!this.state.uncertain)return;
  const pending=this.state.retry(reconcile,send);this.notify();await pending;this.notify();
 }
}
