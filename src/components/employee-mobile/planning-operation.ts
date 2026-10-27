import {parsePlanningCommand,parsePlanningResult,type PlanningCommand,type PlanningResult} from '@/lib/employee-planning';
type Send=(command:PlanningCommand)=>Promise<PlanningResult>;
/** One original intent owns every uncertain retry. Availability has state readback, not a fabricated receipt. */
export class PlanningOperation{
 private command:PlanningCommand|null=null;
 pending=false;
 result:PlanningResult|null=null;
 private version=0;
 private listeners=new Set<()=>void>();
 get original(){return this.command;}
 get uncertain(){return this.command!==null&&this.result?.state==='unknown';}
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 snapshot=()=>this.version;
 private notify(){this.version++;for(const listener of this.listeners)listener();}
 private async run(send:Send,allowed:()=>boolean){
  if(!this.command||!allowed())return;
  this.pending=true;this.notify();
  try{const result=parsePlanningResult(await send(this.command)),expected=this.command.kind==='availability'?null:this.command.requestId;this.result=result.requestId===expected?result:{state:'unknown',requestId:expected};}catch{this.result={state:'unknown',requestId:null};}
  finally{this.pending=false;this.notify();}
 }
 async submit(input:PlanningCommand,send:Send,allowed:()=>boolean){
  if(this.pending||this.uncertain||this.result?.state==='complete'||!allowed())return;
  const parsed=parsePlanningCommand(input);if(!parsed)return;
  this.command=structuredClone(parsed);if(this.command.kind==='availability'){this.command.windows.forEach(Object.freeze);Object.freeze(this.command.windows);Object.freeze(this.command.changedDays);}Object.freeze(this.command);
  await this.run(send,allowed);
 }
 async retry(reconcile:Send,send:Send,allowed:()=>boolean){
  if(this.pending||!this.uncertain||!allowed())return;
  await this.run(reconcile,allowed);
  if(this.result?.state==='missing'){
   if(allowed())await this.run(send,allowed);
   else{this.result={state:'unknown',requestId:null};this.notify();}
  }
 }
}

export class PlanningOperations {
 private operations=new Map<string,PlanningOperation>();
 for(selection:string){let operation=this.operations.get(selection);if(!operation){operation=new PlanningOperation();this.operations.set(selection,operation);}return operation;}
 reset(selection:string){this.operations.set(selection,new PlanningOperation());}
 other(selection:string){return [...this.operations.entries()].find(([key,op])=>key!==selection&&(op.pending||op.uncertain));}
}
