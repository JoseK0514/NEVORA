import type {ReviewedSource,ReviewedTarget} from './shift-changes/types';
import type {RequestSlot} from './employee-exchange';
import {employeeRequestId} from './employee-exchange';
import {calloutReasonNoteError} from './shift-changes/command-parser';
export const CREATION_MODES=['swap','cover','callout'] as const;
export type CreationMode=typeof CREATION_MODES[number];
export const CALLOUT_REASONS=[['ILLNESS','Illness / sick'],['FAMILY_EMERGENCY','Family emergency'],['TRANSPORTATION','Transportation issue'],['SCHOOL','School conflict'],['PERSONAL_EMERGENCY','Personal emergency'],['OTHER','Other']] as const;
export type CreationSource=RequestSlot&{id:string;weekStart:string;fields:ReviewedSource};
export type CreationTarget=RequestSlot&{id:string;person:string;fields:ReviewedTarget};
export type CreationCheck={allowed:boolean;notice:string|null};
export type EmployeeCreationSnapshot={state:'ready';kind:'creation';authority:string;observedAt:string;validForMs:number;timeZone:string;enabled:boolean;mode:CreationMode;selection:string;source:CreationSource|null;targets:CreationTarget[]|null;partial:boolean;check:CreationCheck;coverage:CreationCheck}|{state:'unavailable';reason:'read_failed'|'access_denied'};
export type CreationDraft={sourceKey:string|null;targetKey:string|null;reason:string;note:string};
export function creationKey(fields:ReviewedSource|ReviewedTarget):string{return 'sourceShiftId'in fields?[fields.sourceShiftId,fields.sourceEpisodeId,fields.sourceTermsFingerprint].join('|'):[fields.targetShiftId,fields.targetEpisodeId,fields.targetTermsFingerprint].join('|');}
/** Retained entries never acquire new consent merely because a refresh supplied new terms. */
export function creationPayload(read:Extract<EmployeeCreationSnapshot,{state:'ready'}>,draft:CreationDraft):FormData|null{
 if(!read.enabled||!read.source||!read.check.allowed||draft.sourceKey!==creationKey(read.source.fields))return null;
 const data=new FormData();for(const [key,value]of Object.entries(read.source.fields))data.set(key,value);
 if(read.mode==='swap'){
  const target=read.targets?.find(row=>creationKey(row.fields)===draft.targetKey);if(!target)return null;
  data.set('kind','PROPOSE_SWAP');for(const [key,value]of Object.entries(target.fields))data.set(key,value);
 }else if(read.mode==='cover')data.set('kind','OFFER_COVERAGE');
 else{
  if(!CALLOUT_REASONS.some(([code])=>code===draft.reason)||draft.note.length>300||calloutReasonNoteError(draft.reason,draft.note))return null;
  data.set('kind','SUBMIT_CALLOUT');data.set('reasonCode',draft.reason);data.set('reasonNote',draft.note);
 }
 return data;
}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,names:string[])=>Object.keys(v).length===names.length&&names.every(k=>Object.hasOwn(v,k));
const text=(v:unknown,max=4000):v is string=>typeof v==='string'&&v.length>0&&v.length<=max;
const id=(v:unknown)=>employeeRequestId(v)&&v.length<=128;
const date=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
const time=(v:unknown)=>typeof v==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/.test(v);
function fields(v:unknown,kind:'source'|'target'){
 const names=[kind+'ShiftId',kind+'EpisodeId',kind+'TermsFingerprint'];
 return object(v)&&keys(v,names)&&id(v[names[0]])&&typeof v[names[1]]==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(v[names[1]] as string)&&typeof v[names[2]]==='string'&&/^v1:[a-f0-9]{64}$/.test(v[names[2]] as string);
}
function slot(v:unknown,kind:'source'|'target'){
 return object(v)&&keys(v,['id','date','startTime','endTime','location','position','lead','fields',kind==='source'?'weekStart':'person'])&&id(v.id)&&date(v.date)&&time(v.startTime)&&time(v.endTime)&&text(v.location,300)&&(v.position===null||text(v.position,300))&&(v.lead===null||typeof v.lead==='boolean')&&fields(v.fields,kind)&&(v.fields as Record<string,unknown>)[kind+'ShiftId']===v.id&&(kind==='source'?date(v.weekStart):text(v.person,200));
}
const check=(v:unknown)=>object(v)&&keys(v,['allowed','notice'])&&typeof v.allowed==='boolean'&&(v.notice===null||text(v.notice));
const failed=():EmployeeCreationSnapshot=>({state:'unavailable',reason:'read_failed'});
export function parseEmployeeCreation(v:unknown):EmployeeCreationSnapshot{
 if(!object(v))return failed();
 if(v.state==='unavailable')return keys(v,['state','reason'])&&['read_failed','access_denied'].includes(String(v.reason))?v as Extract<EmployeeCreationSnapshot,{state:'unavailable'}>:failed();
 if(!keys(v,['state','kind','authority','observedAt','validForMs','timeZone','enabled','mode','selection','source','targets','partial','check','coverage'])||v.state!=='ready'||v.kind!=='creation'||typeof v.authority!=='string'||!/^[a-f0-9]{64}$/.test(v.authority)||typeof v.observedAt!=='string'||Number.isNaN(Date.parse(v.observedAt))||!Number.isSafeInteger(v.validForMs)||Number(v.validForMs)<=0||Number(v.validForMs)>45000||!text(v.timeZone,100)||typeof v.enabled!=='boolean'||!CREATION_MODES.includes(v.mode as CreationMode)||!id(v.selection)||typeof v.partial!=='boolean'||!check(v.check)||!check(v.coverage))return failed();
 try{new Intl.DateTimeFormat('en-US',{timeZone:v.timeZone});}catch{return failed();}
 if(v.source!==null&&(!slot(v.source,'source')||(v.source as CreationSource).id!==v.selection)||v.targets!==null&&(!Array.isArray(v.targets)||!v.targets.every(t=>slot(t,'target'))))return failed();
 if(v.mode!=='swap'&&(v.targets===null||(v.targets as unknown[]).length||v.partial))return failed();
 if(!v.enabled&&(v.source!==null||v.targets!==null&&(v.targets as unknown[]).length||(v.check as CreationCheck).allowed||(v.coverage as CreationCheck).allowed))return failed();
 if(v.source===null&&((v.check as CreationCheck).allowed||(v.coverage as CreationCheck).allowed||Array.isArray(v.targets)&&v.targets.length))return failed();
 if(v.mode==='swap'&&(v.check as CreationCheck).allowed&&(!Array.isArray(v.targets)||!v.targets.length))return failed();
 return v as EmployeeCreationSnapshot;
}
