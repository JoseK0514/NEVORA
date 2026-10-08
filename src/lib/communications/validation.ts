import {isValidIsoDate} from '../date-utils';
import type {CommunicationDraft,CommunicationScope} from './types';
export const COMMUNICATION_TRANSPORT_BYTES=32*1024;
type Validation={ok:true;value:CommunicationDraft}|{ok:false;reason:'transport'|'shape'|'text'|'scope'};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,allowed:string[])=>Object.keys(v).length===allowed.length&&Object.keys(v).every(k=>allowed.includes(k));
// Retain combining marks and emoji joiners; deny C0/C1, bidi overrides/isolates,
// line/paragraph separators, zero-width space/BOM and unpaired UTF-16 surrogates.
const unsafe=/[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u200b\u200e\u200f\u2028-\u202e\u2060-\u206f\ufeff\ud800-\udfff]/u;
const id=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=200&&v===v.trim()&&!unsafe.test(v)&&!v.includes('\n')&&!v.includes('\r');
function scope(v:unknown):CommunicationScope|null{
 if(!object(v)||!id(v.locationId))return null;
 if(v.kind==='LOCATION'&&keys(v,['kind','locationId']))return {kind:v.kind,locationId:v.locationId};
 if(v.kind==='TODAYS_TEAM'&&keys(v,['kind','locationId','businessDate'])&&typeof v.businessDate==='string'&&isValidIsoDate(v.businessDate))return {kind:v.kind,locationId:v.locationId,businessDate:v.businessDate};
 if(v.kind==='SHIFT'&&keys(v,['kind','locationId','sourceShiftId','assignmentEpisodeId','termsFingerprint'])&&id(v.sourceShiftId)&&id(v.assignmentEpisodeId)&&id(v.termsFingerprint))return {kind:v.kind,locationId:v.locationId,sourceShiftId:v.sourceShiftId,assignmentEpisodeId:v.assignmentEpisodeId,termsFingerprint:v.termsFingerprint};
 return null;
}
export function validateCommunicationDraft(input:unknown):Validation{
 try{
  if(new TextEncoder().encode(JSON.stringify(input)).byteLength>COMMUNICATION_TRANSPORT_BYTES)return {ok:false,reason:'transport'};
  if(!object(input)||!keys(input,['type','scope','title','body','acknowledgement','expiresAt'])||typeof input.type!=='string'||typeof input.acknowledgement!=='string'||!['TODAYS_TEAM','LOCATION_ANNOUNCEMENT','SHIFT_NOTE','OPERATIONAL_UPDATE'].includes(input.type)||!['NONE','OPTIONAL','REQUIRED'].includes(input.acknowledgement))return {ok:false,reason:'shape'};
  if(typeof input.title!=='string'||typeof input.body!=='string')return {ok:false,reason:'text'};
  const title=input.title.replace(/\r\n?/g,'\n').trim(),body=input.body.replace(/\r\n?/g,'\n').trim();
  // Check controls before trimming as well, so a leading tab/control cannot disappear.
  if(unsafe.test(input.title.replace(/\r\n?/g,'\n'))||unsafe.test(input.body.replace(/\r\n?/g,'\n'))||title.includes('\n')||[...title].length<1||[...title].length>120||[...body].length<1||[...body].length>2000)return {ok:false,reason:'text'};
  const selected=scope(input.scope);if(!selected)return {ok:false,reason:'scope'};
  if((input.type==='TODAYS_TEAM'&&selected.kind!=='TODAYS_TEAM')||(input.type==='LOCATION_ANNOUNCEMENT'&&selected.kind!=='LOCATION')||(input.type==='SHIFT_NOTE'&&selected.kind!=='SHIFT')||(input.type==='TODAYS_TEAM'&&input.acknowledgement==='REQUIRED'))return {ok:false,reason:'scope'};
  if(input.expiresAt!==null&&(typeof input.expiresAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(input.expiresAt)||!Number.isFinite(Date.parse(input.expiresAt))||!isValidIsoDate(input.expiresAt.slice(0,10))))return {ok:false,reason:'shape'};
  return {ok:true,value:{type:input.type as CommunicationDraft['type'],scope:selected,title,body,acknowledgement:input.acknowledgement as CommunicationDraft['acknowledgement'],expiresAt:input.expiresAt as string|null}};
 }catch{return {ok:false,reason:'shape'};}
}
/** Check raw UTF-8 bytes before JSON parsing, including whitespace/escape expansion. */
export function parseCommunicationTransport(raw:string):Validation{
 if(typeof raw!=='string'||new TextEncoder().encode(raw).byteLength>COMMUNICATION_TRANSPORT_BYTES)return {ok:false,reason:'transport'};
 try{return validateCommunicationDraft(JSON.parse(raw));}catch{return {ok:false,reason:'shape'};}
}
