import {parseEmployeeView,type EmployeeViewSnapshot} from './employee-view';
import {parseMessageCursor,type MessagePage} from './employee-message-page';
import {isValidIsoDate} from './date-utils';
import type {CommunicationRead,CommunicationListRead,CommunicationContext} from './communications/types';
export type MessageView='notifications'|'updates'|'detail'|'compose';
export type UpdatesAvailability='on'|'off'|'unavailable';
type Lifetime={state:'ready';kind:'communications';view:MessageView;selection:string;authority:string;communicationAuthority:string;observedAt:string;validForMs:number;timeZone:string;updates:UpdatesAvailability};
export type EmployeeMessages=(Lifetime&{view:'notifications';data:MessagePage<EmployeeViewSnapshot>})|(Lifetime&{view:'updates';data:MessagePage<CommunicationListRead>|null})|(Lifetime&{view:'detail';data:CommunicationRead|null})|(Lifetime&{view:'compose';data:CommunicationContext|null})|{state:'unavailable';reason:'access_denied'|'read_failed'};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,required:string[],optional:string[]=[])=>required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>required.includes(k)||optional.includes(k));
const string=(v:unknown,max=300):v is string=>typeof v==='string'&&v.trim().length>0&&[...v].length<=max;
const date=(v:unknown):v is string=>typeof v==='string'&&v.length<=80&&Number.isFinite(Date.parse(v));
const nullableDate=(v:unknown)=>v===null||date(v);
const hex=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export const messageId=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
export function validMessageSelection(view:string,selection:string){
 if(view==='compose')return selection==='new';if(view==='detail')return messageId(selection);
 if(view!=='notifications'&&view!=='updates')return false;if(selection==='first')return true;const cursor=parseMessageCursor(selection);return !!cursor&&(view==='notifications'||messageId(cursor.id));
}
function lifetime(v:Record<string,unknown>,outer:Lifetime){
 return v.authority===outer.communicationAuthority&&date(v.observedAt)&&Date.parse(v.observedAt)<=Date.parse(outer.observedAt)&&Number.isSafeInteger(v.validForMs)&&Number(v.validForMs)>0&&Number(v.validForMs)<=45000&&v.timeZone===outer.timeZone&&Date.parse(outer.observedAt)+outer.validForMs<=Date.parse(v.observedAt)+Number(v.validForMs);
}
function unavailable(v:Record<string,unknown>,states:string[]){return states.includes(String(v.state))&&keys(v,['state','reason'])&&string(v.reason,150);}
function update(value:unknown,outer:Lifetime):CommunicationRead{
 if(!object(value))throw Error('Update shape');
 if(unavailable(value,['withdrawn','unauthorized','unavailable']))return value as CommunicationRead;
 if(!keys(value,['state','id','revisionId','contentHash','title','body','type','publishedAt','editedAt','acknowledgement','ownAcknowledgedAt','ownReadAt','authority','observedAt','validForMs','timeZone','expiresAt','authorContext','canWithdraw'],['sentCount'])||value.state!=='ready'||!lifetime(value,outer)||!messageId(value.id)||!messageId(value.revisionId)||!hex(value.contentHash)||!string(value.title,120)||!string(value.body,2000)||!['TODAYS_TEAM','LOCATION_ANNOUNCEMENT','SHIFT_NOTE','OPERATIONAL_UPDATE'].includes(String(value.type))||!date(value.publishedAt)||!nullableDate(value.editedAt)||!nullableDate(value.expiresAt)||!nullableDate(value.ownAcknowledgedAt)||!nullableDate(value.ownReadAt)||!['NONE','OPTIONAL','REQUIRED'].includes(String(value.acknowledgement))||!string(value.authorContext)||typeof value.canWithdraw!=='boolean'||Object.hasOwn(value,'sentCount')&&(!Number.isSafeInteger(value.sentCount)||Number(value.sentCount)<0||Number(value.sentCount)>1000))throw Error('Own update');
 return value as CommunicationRead;
}
function page(value:unknown):{value:unknown;nextCursor:string|null}{
 if(!object(value)||!keys(value,['value','nextCursor'])||!(value.nextCursor===null||parseMessageCursor(value.nextCursor)))throw Error('Message page');return value as {value:unknown;nextCursor:string|null};
}
export function parseEmployeeMessages(value:unknown):EmployeeMessages{
 const failed=():EmployeeMessages=>({state:'unavailable',reason:'read_failed'});
 try{
  if(!object(value))return failed();if(value.state==='unavailable')return unavailable(value,['unavailable'])&&['access_denied','read_failed'].includes(String(value.reason))?value as EmployeeMessages:failed();
  if(!keys(value,['state','kind','view','selection','authority','communicationAuthority','observedAt','validForMs','timeZone','updates','data'])||value.state!=='ready'||value.kind!=='communications'||!string(value.view)||!string(value.selection,600)||!validMessageSelection(value.view,value.selection)||!hex(value.authority)||!hex(value.communicationAuthority)||!date(value.observedAt)||!Number.isSafeInteger(value.validForMs)||Number(value.validForMs)<=0||Number(value.validForMs)>45000||!string(value.timeZone,100)||!['on','off','unavailable'].includes(String(value.updates)))return failed();
  new Intl.DateTimeFormat('en-US',{timeZone:value.timeZone});const outer=value as Lifetime;
  if(value.view==='notifications'){
   const p=page(value.data),read=parseEmployeeView(p.value,'notifications');if(read.state==='ready'&&(read.kind!=='notifications'||read.items.length>25||read.validForMs+Date.parse(read.observedAt)<outer.validForMs+Date.parse(outer.observedAt)))return failed();if(read.state!=='ready'&&p.nextCursor!==null)return failed();
   return {...outer,view:'notifications',data:{value:read,nextCursor:p.nextCursor}};
  }
  if(value.updates!=='on')return value.data===null?{...outer,data:null} as EmployeeMessages:failed();
  if(value.view==='detail'){const read=update(value.data,outer);return read.state==='ready'&&read.id!==value.selection?failed():{...outer,view:'detail',data:read};}
  if(value.view==='updates'){
   const p=page(value.data);if(!object(p.value))return failed();const list=p.value;
   if(unavailable(list,['unauthorized','unavailable']))return p.nextCursor===null?{...outer,view:'updates',data:{value:list as CommunicationListRead,nextCursor:null}}:failed();
   if(!keys(list,['state','observedAt','items','reason','validForMs','authority','timeZone'])||!['complete','partial'].includes(String(list.state))||!lifetime(list,outer)||!Array.isArray(list.items)||list.items.length>25||!(list.reason===null||string(list.reason,150)))return failed();
   const items=list.items.map(item=>update(item,outer));if(items.some(item=>item.state!=='ready')||new Set(items.map(item=>item.state==='ready'?item.id:'')).size!==items.length)return failed();
   return {...outer,view:'updates',data:{value:{...list,items} as CommunicationListRead,nextCursor:p.nextCursor}};
  }
  if(!object(value.data))return failed();const context=value.data;
  if(unavailable(context,['unauthorized','unavailable']))return {...outer,view:'compose',data:context as CommunicationContext};
  if(!keys(context,['state','authority','observedAt','validForMs','management','businessDate','timeZone','locations','shifts'])||context.state!=='ready'||!lifetime(context,outer)||context.management!==false||!isValidIsoDate(String(context.businessDate))||!Array.isArray(context.shifts)||context.shifts.length!==0||!Array.isArray(context.locations)||context.locations.length>100||context.locations.some(l=>!object(l)||!keys(l,['id','label'])||!string(l.id,200)||!string(l.label,300))||new Set(context.locations.map(l=>l.id)).size!==context.locations.length)return failed();
  return {...outer,view:'compose',data:context as CommunicationContext};
 }catch{return failed();}
}
