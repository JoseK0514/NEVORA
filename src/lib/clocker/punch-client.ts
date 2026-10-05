import { parsePunchCommand, type PunchAction, type PunchCommand, type PunchEntry, type PunchReceipt, type PunchState } from './punch-command';
export type ClockView={state:'ready';context:string;subject:string;firstName:string;expiresAt:string;locationId:string;clock:PunchState};
export type PendingPunch={subject:string;command:PunchCommand};
type Storage=Pick<globalThis.Storage,'getItem'|'setItem'|'removeItem'>;
const recoveryKey=(location:string)=>`nevora.clocker.pending.v1:${location}`;
const hash=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min=0):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=2147483647;
const stamp=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3,6}Z$/.test(v)&&Number.isFinite(Date.parse(v));
function invalid():never{throw Error('The clock response could not be verified. Check its status before continuing.');}
function parseEntry(value:unknown):PunchEntry {
 if(!object(value)||typeof value.id!=='string'||!value.id||!integer(value.version,1)||typeof value.locationId!=='string'||
  (typeof value.status!=='string'||!['CLOCKED_IN','ON_BREAK','CLOCKED_OUT'].includes(value.status))||!stamp(value.clockInAt)||
  (value.clockOutAt!==null&&!stamp(value.clockOutAt))||!Array.isArray(value.breaks))return invalid();
 if((value.status==='CLOCKED_OUT')!==(value.clockOutAt!==null))return invalid();
 for(const b of value.breaks){if(!object(b)||typeof b.id!=='string'||!integer(b.version,1)||!stamp(b.startAt)||(b.endAt!==null&&!stamp(b.endAt)))return invalid();}
 const open=value.breaks.filter(b=>b.endAt===null).length;
 if(open!==(value.status==='ON_BREAK'?1:0))return invalid();
 return value as PunchEntry;
}
export function parseClockView(value:unknown):ClockView {
 if(!object(value)||value.state!=='ready'||!hash(value.context)||!hash(value.subject)||typeof value.firstName!=='string'||
  !stamp(value.expiresAt)||typeof value.locationId!=='string'||!object(value.clock)||!integer(value.clock.revision))return invalid();
 if(value.clock.currentEntry!==null){const entry=parseEntry(value.clock.currentEntry);if(entry.status==='CLOCKED_OUT')return invalid();}
 return value as ClockView;
}
export function parseReceiptReply(value:unknown,command:PunchCommand):PunchReceipt {
 if(!object(value)||value.state!=='recorded'||!object(value.receipt))return invalid();
 const r=value.receipt;
 if(r.commandId!==command.commandId||r.action!==command.action||r.revision!==command.expectedRevision+1||!stamp(r.recordedAt))return invalid();
 const e=parseEntry(r.entry);
 const status=command.action==='CLOCK_OUT'?'CLOCKED_OUT':command.action==='START_BREAK'?'ON_BREAK':'CLOCKED_IN';
 if(e.status!==status||(command.expectedEntryId!==null&&e.id!==command.expectedEntryId)||e.version!==(command.expectedEntryVersion??0)+1)return invalid();
 if(command.action==='CLOCK_IN'&&e.clockInAt!==r.recordedAt)return invalid();
 if(command.action==='CLOCK_OUT'&&e.clockOutAt!==r.recordedAt)return invalid();
 if(command.action==='START_BREAK'&&e.breaks.find(b=>b.endAt===null)?.startAt!==r.recordedAt)return invalid();
 if(command.expectedBreakId){const closed=e.breaks.find(b=>b.id===command.expectedBreakId);
  if(!closed||closed.version!==command.expectedBreakVersion!+1||closed.endAt!==r.recordedAt)return invalid();}
 return r as PunchReceipt;
}
export function punchActions(clock:PunchState,locationId:string):PunchAction[]{
 const e=clock.currentEntry;
 if(!e)return ['CLOCK_IN'];
 if(e.locationId!==locationId)return [];
 return e.status==='ON_BREAK'?['END_BREAK','CLOCK_OUT']:e.status==='CLOCKED_IN'?['START_BREAK','CLOCK_OUT']:[];
}
export function makePunchCommand(action:PunchAction,clock:PunchState,commandId:string):PunchCommand {
 const e=clock.currentEntry,b=e?.breaks.find(b=>b.endAt===null);
 return parsePunchCommand({commandId,action,expectedRevision:clock.revision,expectedEntryId:e?.id??null,
  expectedEntryVersion:e?.version??null,expectedBreakId:b?.id??null,expectedBreakVersion:b?.version??null});
}
function pending(value:unknown):PendingPunch {
 if(!object(value)||Object.keys(value).length!==2||!hash(value.subject))return invalid();
 return {subject:value.subject,command:parsePunchCommand(value.command)};
}
export function readPendingPunch(storage:Storage,location:string):PendingPunch|null {
 const text=storage.getItem(recoveryKey(location));if(text===null)return null;
 if(text.length>2048)return invalid();return pending(JSON.parse(text));
}
export function savePendingPunch(storage:Storage,location:string,value:PendingPunch):void {
 const safe=pending(value),text=JSON.stringify(safe),previous=readPendingPunch(storage,location);
 if(previous&&JSON.stringify(previous)!==text)throw Error('A previous clock action still needs verification.');
 storage.setItem(recoveryKey(location),text);
 if(storage.getItem(recoveryKey(location))!==text)throw Error('Recovery storage is unavailable. No action was sent.');
}
export function forgetPendingPunch(storage:Storage,location:string):void {
 storage.removeItem(recoveryKey(location));
 if(storage.getItem(recoveryKey(location))!==null)throw Error('Recovery storage could not be cleared.');
}
/** Call only after reading current state AND subsequently finding no saved receipt.
 * Monotonic employee revisions make a now-incompatible command unable to commit later. */
export function canRetirePendingPunch(command:PunchCommand,clock:PunchState,locationId:string):boolean {
 const e=clock.currentEntry,b=e?.breaks.find(b=>b.endAt===null);
 return command.expectedRevision!==clock.revision||command.expectedEntryId!==(e?.id??null)||
  command.expectedEntryVersion!==(e?.version??null)||command.expectedBreakId!==(b?.id??null)||
  command.expectedBreakVersion!==(b?.version??null)||!punchActions(clock,locationId).includes(command.action);
}
export class PunchRequestError extends Error {
 constructor(readonly code:string,message:string,readonly status:number){super(message);}
}
export async function postPunch(location:string,body:object):Promise<unknown> {
 const response=await fetch(`/api/clocker/${encodeURIComponent(location)}/punch`,{method:'POST',credentials:'same-origin',cache:'no-store',
  headers:{'Content-Type':'application/json','X-Nevora-Clocker':'1'},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
 const data:unknown=await response.json();
 if(!response.ok){
  throw new PunchRequestError(object(data)&&typeof data.code==='string'?data.code:'UNAVAILABLE',
   object(data)&&typeof data.error==='string'?data.error:'The clock result could not be confirmed.',response.status);
 }
 return data;
}
