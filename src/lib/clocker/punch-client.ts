import { parsePunchCommand } from './punch-command';
import type { PunchAction, PunchCommand, PunchReceipt, PunchSnapshot, PunchView } from './punch-types';
import type { BreakSelection, BreakTypeSnapshot } from './break-types';
export type ClockView=PunchView&{state:'ready';subject:string;firstName:string;expiresAt:string;locationId:string};
export type PendingPunch={subject:string;command:PunchCommand};
type Storage=Pick<globalThis.Storage,'getItem'|'setItem'|'removeItem'>;
const recoveryKey=(location:string)=>`nevora.clocker.pending.v1:${location}`;
const hash=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v:unknown,min=0):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=2147483647;
const stamp=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?(?:Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
function invalid():never{throw Error('The clock response could not be verified. Check its status before continuing.');}
function classification(v:unknown):v is BreakTypeSnapshot{
 return object(v)&&typeof v.id==='string'&&!!v.id&&integer(v.version,1)&&typeof v.name==='string'&&!!v.name&&
 typeof v.category==='string'&&['REST','MEAL','OTHER'].includes(v.category)&&
 (v.targetMinutes===null||(integer(v.targetMinutes,1)&&v.targetMinutes<=1440));
}
function snapshot(value:unknown):PunchSnapshot{
 if(!object(value)||!integer(value.revision))return invalid();
 const e=value.entry,b=value.break;
 if(e===null){if(b!==null)return invalid();return value as PunchSnapshot;}
 if(!object(e)||typeof e.id!=='string'||!e.id||!integer(e.version,1)||typeof e.locationId!=='string'||!stamp(e.clockInAt)||
  typeof e.status!=='string'||!['CLOCKED_IN','ON_BREAK'].includes(e.status))return invalid();
 if((e.status==='ON_BREAK')!==(b!==null))return invalid();
 if(b!==null&&(!object(b)||typeof b.id!=='string'||!b.id||!integer(b.version,1)||!stamp(b.breakStartAt)||
   Date.parse(b.breakStartAt)<Date.parse(e.clockInAt)||(b.type!==null&&!classification(b.type))))return invalid();
 return value as PunchSnapshot;
}
export function parseClockView(value:unknown):ClockView{
 if(!object(value)||value.state!=='ready'||!hash(value.verificationId)||!hash(value.subject)||typeof value.firstName!=='string'||
   !stamp(value.expiresAt)||typeof value.locationId!=='string'||typeof value.atOtherLocation!=='boolean'||
   !Array.isArray(value.breakTypes)||!Array.isArray(value.allowedActions))return invalid();
 const current=snapshot(value.snapshot);
 for(const t of value.breakTypes)if(!classification(t)||!('active' in t)||t.active!==true)return invalid();
 if(new Set(value.breakTypes.map(t=>t.id)).size!==value.breakTypes.length)return invalid();
 const elsewhere=Boolean(current.entry&&current.entry.locationId!==value.locationId);
 const allowed=elsewhere?[]:!current.entry?['CLOCK_IN']:current.break?['END_BREAK','CLOCK_OUT']:value.breakTypes.length?['START_BREAK','CLOCK_OUT']:['CLOCK_OUT'];
 if(elsewhere!==value.atOtherLocation||JSON.stringify(value.allowedActions)!==JSON.stringify(allowed))return invalid();
 return value as ClockView;
}
export function parseReceiptReply(value:unknown,command:PunchCommand):PunchReceipt{
 if(!object(value)||value.state!=='committed'||!object(value.receipt))return invalid();
 const r=value.receipt,s=snapshot(r.snapshot),e=s.entry,b=s.break,expected=command.expected;
 if(r.commandId!==command.commandId||r.action!==command.action||s.revision!==expected.revision+1||!stamp(r.performedAt)||
  typeof r.timeEntryId!=='string'||!r.timeEntryId||!(r.breakEntryId===null||typeof r.breakEntryId==='string')||
  (expected.timeEntryId!==null&&r.timeEntryId!==expected.timeEntryId))return invalid();
 if(command.action==='CLOCK_OUT'){
  if(e!==null||b!==null||r.breakEntryId!==expected.breakEntryId)return invalid();
 }else{
  if(!e||e.id!==r.timeEntryId||e.version!==(expected.timeEntryVersion??0)+1||
    e.status!==(command.action==='START_BREAK'?'ON_BREAK':'CLOCKED_IN'))return invalid();
  if(command.action==='CLOCK_IN'&&(e.clockInAt!==r.performedAt||r.breakEntryId!==null))return invalid();
  if(command.action==='END_BREAK'&&r.breakEntryId!==expected.breakEntryId)return invalid();
 }
 if(r.breakType!==undefined&&r.breakType!==null&&!classification(r.breakType))return invalid();
 if(command.action==='START_BREAK'){
  if(!b||b.id!==r.breakEntryId||b.version!==1||b.breakStartAt!==r.performedAt||!classification(r.breakType)||
    r.breakType.id!==command.breakType?.id||r.breakType.version!==command.breakType.version||
    !b.type||b.type.id!==r.breakType.id||b.type.version!==r.breakType.version||b.type.name!==r.breakType.name||b.type.category!==r.breakType.category||b.type.targetMinutes!==r.breakType.targetMinutes)return invalid();
 }
 return r as PunchReceipt;
}
export function punchActions(view:ClockView):PunchAction[]{return [...view.allowedActions];}
export function makePunchCommand(action:PunchAction,view:ClockView,commandId:string,selection?:BreakSelection):PunchCommand{
 if(!view.allowedActions.includes(action))return invalid();
 if(action==='START_BREAK'&&!view.breakTypes.some(t=>t.id===selection?.id&&t.version===selection.version&&t.active))return invalid();
 const s=view.snapshot;
 return parsePunchCommand({commandId,action,verificationId:view.verificationId,expected:{revision:s.revision,
  timeEntryId:s.entry?.id??null,timeEntryVersion:s.entry?.version??null,breakEntryId:s.break?.id??null,breakEntryVersion:s.break?.version??null},
  ...(action==='START_BREAK'?{breakType:{id:selection!.id,version:selection!.version}}:{})});
}
function pending(value:unknown):PendingPunch{
 if(!object(value)||Object.keys(value).length!==2||!hash(value.subject))return invalid();
 return {subject:value.subject,command:parsePunchCommand(value.command)};
}
export function readPendingPunch(storage:Storage,location:string):PendingPunch|null{
 const text=storage.getItem(recoveryKey(location));if(text===null)return null;
 if(text.length>2048)return invalid();return pending(JSON.parse(text));
}
export function savePendingPunch(storage:Storage,location:string,value:PendingPunch):void{
 const safe=pending(value),text=JSON.stringify(safe),previous=readPendingPunch(storage,location);
 if(previous&&JSON.stringify(previous)!==text)throw Error('A previous clock action still needs verification.');
 storage.setItem(recoveryKey(location),text);
 if(storage.getItem(recoveryKey(location))!==text)throw Error('Recovery storage is unavailable. No action was sent.');
}
export function forgetPendingPunch(storage:Storage,location:string):void{
 storage.removeItem(recoveryKey(location));if(storage.getItem(recoveryKey(location))!==null)throw Error('Recovery storage could not be cleared.');
}
/** Use only after current state followed by absent receipt, under the same employee/device subject.
 * A fresh verification invalidates old commands: recovery never rewrites their verification or ID. */
export function canRetirePendingPunch(command:PunchCommand,view:ClockView):boolean{
 const s=view.snapshot,e=command.expected;
 return command.verificationId!==view.verificationId||e.revision!==s.revision||e.timeEntryId!==(s.entry?.id??null)||
  e.timeEntryVersion!==(s.entry?.version??null)||e.breakEntryId!==(s.break?.id??null)||e.breakEntryVersion!==(s.break?.version??null)||
  !view.allowedActions.includes(command.action)||(command.action==='START_BREAK'&&!view.breakTypes.some(t=>t.id===command.breakType?.id&&t.version===command.breakType.version&&t.active));
}
export class PunchRequestError extends Error{
 constructor(readonly code:string,message:string,readonly status:number){super(message);}
}
export async function postPunch(location:string,body:object):Promise<unknown>{
 const response=await fetch(`/api/clocker/${encodeURIComponent(location)}/punch`,{method:'POST',credentials:'same-origin',cache:'no-store',
  headers:{'Content-Type':'application/json','X-Nevora-Clocker':'1'},body:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
 const data:unknown=await response.json();
 if(!response.ok)throw new PunchRequestError(object(data)&&typeof data.code==='string'?data.code:'UNAVAILABLE',object(data)&&typeof data.error==='string'?data.error:'The clock result could not be confirmed.',response.status);
 return data;
}
