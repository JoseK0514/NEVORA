import {parseHoursCorrection,parseHoursResult,type HoursCorrectionPayload,type HoursCorrectionResult} from '@/lib/employee-hours';
type Send=(payload:HoursCorrectionPayload)=>Promise<HoursCorrectionResult>;
/** The existing correction event is the durable idempotency owner. Every retry retains the original operation and reviewed source. */
export class HoursCorrectionOperation{
 private command:HoursCorrectionPayload|null=null;
 pending=false;
 result:HoursCorrectionResult|null=null;
 private version=0;
 private listeners=new Set<()=>void>();
 get original(){return this.command;}
 get uncertain(){return !!this.command&&this.result?.status==='unknown';}
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 snapshot=()=>this.version;
 private notify(){this.version++;for(const listener of this.listeners)listener();}
 private async run(send:Send,allowed:()=>boolean){if(!this.command||!allowed())return;this.pending=true;this.notify();try{const result=parseHoursResult(await send(this.command));this.result=result.status==='recorded'&&result.operationId!==this.command.command.operationId?{status:'unknown'}:result;}catch{this.result={status:'unknown'};}finally{this.pending=false;this.notify();}}
 async submit(input:HoursCorrectionPayload,send:Send,allowed:()=>boolean){if(this.pending||this.uncertain||this.result?.status==='recorded'||!allowed())return;const payload=parseHoursCorrection(input);if(!payload)return;this.command=structuredClone(payload);Object.freeze(this.command.command);Object.freeze(this.command);await this.run(send,allowed);}
 async retry(send:Send,allowed:()=>boolean){if(this.pending||!this.uncertain||!allowed())return;await this.run(send,allowed);}
}
