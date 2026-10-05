import type { ShiftChangeCommand } from './types';
const existing=['ACCEPT','DECLINE','CANCEL','WITHDRAW','MANAGER_APPROVE','MANAGER_DECLINE','MANAGER_CLOSE','APPROVE_CALLOUT','DECLINE_CALLOUT','CANCEL_CALLOUT'];
const id=(v:unknown)=>typeof v==='string'&&v.length>0&&v.length<=128;
const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
export function isShiftChangeCommand(value:unknown):value is ShiftChangeCommand {
 if(!value||typeof value!=='object'||Array.isArray(value)||JSON.stringify(value).length>16384)return false;
 const c=value as Record<string,unknown>;if(!uuid(c.operationId))return false;
 let fields=['kind','operationId'];
 if(existing.includes(String(c.kind))) {fields.push('requestId','expectedRevision');if(!id(c.requestId)||!Number.isSafeInteger(c.expectedRevision)||Number(c.expectedRevision)<=0)return false;}
 else if(c.kind==='SUBMIT_CALLOUT') {fields.push('sourceShiftId','reasonCode','reasonNote');if(!id(c.sourceShiftId)||!['ILLNESS','FAMILY_EMERGENCY','TRANSPORTATION','SCHOOL','PERSONAL_EMERGENCY','OTHER'].includes(String(c.reasonCode))||c.reasonNote!==undefined&&(typeof c.reasonNote!=='string'||c.reasonNote.length>2000))return false;}
 else if(c.kind==='OFFER_COVERAGE'||c.kind==='PROPOSE_SWAP') {
  fields.push('sourceShiftId','sourceEpisodeId','sourceTermsFingerprint');
  if(!id(c.sourceShiftId)||!uuid(c.sourceEpisodeId)||typeof c.sourceTermsFingerprint!=='string'||!/^v1:[a-f0-9]{64}$/.test(c.sourceTermsFingerprint))return false;
  if(c.kind==='PROPOSE_SWAP'){fields.push('targetShiftId','targetEpisodeId','targetTermsFingerprint');if(!id(c.targetShiftId)||!uuid(c.targetEpisodeId)||typeof c.targetTermsFingerprint!=='string'||!/^v1:[a-f0-9]{64}$/.test(c.targetTermsFingerprint))return false;}
 }else return false;
 return Object.keys(c).every(k=>fields.includes(k));
}
export function parseShiftChangeCommand(form:FormData):ShiftChangeCommand|null {
 const c:Record<string,unknown>={};let length=0;
 for(const [k,v]of form.entries()) {
  if(k.startsWith('$ACTION_'))continue;
  if(k in c||typeof v!=='string'||(length+=k.length+v.length)>16384)return null;
  c[k]=v;
 }
 if(typeof c.expectedRevision==='string'){if(!/^[1-9]\d*$/.test(c.expectedRevision))return null;c.expectedRevision=Number(c.expectedRevision);}
 return isShiftChangeCommand(c)?c:null;
}
