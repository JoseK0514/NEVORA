import {Temporal} from '@js-temporal/polyfill';
import {parseEmployeeTime,type EmployeeTime} from './employee-time';
import {parseCurrentTimecards} from './timecards/client';
import type {TimecardsResult} from './timecards/read-model';
import {parsePeriod} from './timecards/project';
import {parseEmployeeTimeCorrections,type EmployeeTimeCorrections} from './time-corrections/read-model';
import {parseCorrectionRequestCommand,type CorrectionRequestCommand} from './time-corrections/validation';
export type HoursView='records'|'cards'|'corrections';
export type HoursDecision={requestId:string;status:'APPROVED'|'REJECTED';at:string;by:string;note:string|null};
type Lifetime={state:'ready';kind:'hours';view:HoursView;selection:string;authority:string;observedAt:string;validForMs:number;timeZone:string};
export type EmployeeHoursSnapshot=(Lifetime&{view:'records';data:EmployeeTime})|(Lifetime&{view:'cards';data:TimecardsResult})|(Lifetime&{view:'corrections';data:{basis:string;snapshot:EmployeeTimeCorrections;decisions:HoursDecision[]}})|{state:'unavailable';reason:'access_denied'|'read_failed'};
export type HoursCorrectionPayload={basis:string;command:CorrectionRequestCommand};
export type HoursCorrectionResult={status:'recorded';operationId:string;requestId:string}|{status:'unknown'|'denied'|'invalid'|'conflict'}|{status:'blocked';reason:'self_review'|'stale_source'|'overlap'|'live_state'|'invalid_interval'|'finalized_period'};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,names:string[])=>Object.keys(v).length===names.length&&names.every(name=>Object.hasOwn(v,name));
const text=(v:unknown,max=300):v is string=>typeof v==='string'&&!!v.trim()&&v.length<=max;
export const hoursRequestId=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
export const hoursRecordId=(v:unknown):v is string=>typeof v==='string'&&/^[A-Za-z0-9][A-Za-z0-9_-]{0,199}$/.test(v);
const instant=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
export function validHoursSelection(view:string,selection:string){try{if(view==='records')return selection==='overview';if(view==='corrections')return selection==='list'||selection.startsWith('target:')&&hoursRecordId(selection.slice(7))||hoursRequestId(selection);if(view==='cards'&&/^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/.test(selection)){parsePeriod(...selection.split('_') as [string,string]);return true;}}catch{}return false;}
export function hoursInstant(value:string,zone:string){if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw Error('Choose a date and time');return Temporal.PlainDateTime.from(value,{overflow:'reject'}).toZonedDateTime(zone,{disambiguation:'reject'}).toInstant().toString();}
export function hoursLocalValue(at:string,zone:string){return Temporal.Instant.from(at).toZonedDateTimeISO(zone).toPlainDateTime().toString({smallestUnit:'minute'});}
export function parseHoursCorrection(v:unknown):HoursCorrectionPayload|null{
 if(!object(v)||!keys(v,['basis','command'])||typeof v.basis!=='string'||!/^[a-f0-9]{32}$/.test(v.basis))return null;
 try{return {basis:v.basis,command:parseCorrectionRequestCommand(v.command)};}catch{return null;}
}
const failed=():EmployeeHoursSnapshot=>({state:'unavailable',reason:'read_failed'});
export function parseEmployeeHours(v:unknown):EmployeeHoursSnapshot{
 try{
  if(!object(v))return failed();
  if(v.state==='unavailable')return keys(v,['state','reason'])&&['access_denied','read_failed'].includes(String(v.reason))?v as EmployeeHoursSnapshot:failed();
  if(!keys(v,['state','kind','view','selection','authority','observedAt','validForMs','timeZone','data'])||v.state!=='ready'||v.kind!=='hours'||!text(v.authority,64)||!/^[a-f0-9]{64}$/.test(v.authority)||!text(v.view)||!text(v.selection)||!validHoursSelection(v.view,v.selection)||!instant(v.observedAt)||!Number.isSafeInteger(v.validForMs)||Number(v.validForMs)<1||Number(v.validForMs)>45000||!text(v.timeZone,100))return failed();
  new Intl.DateTimeFormat('en-US',{timeZone:v.timeZone});
  const common={state:'ready' as const,kind:'hours' as const,view:v.view as HoursView,selection:v.selection,authority:v.authority,observedAt:v.observedAt as string,validForMs:Number(v.validForMs),timeZone:v.timeZone};
  if(v.view==='records'){const data=parseEmployeeTime(v.data);if(data.state==='ready'&&(data.timeZone!==v.timeZone||Date.parse(data.observedAt)>Date.parse(common.observedAt)))return failed();return {...common,view:'records',data};}
  if(v.view==='cards'){
   if(object(v.data)&&v.data.state==='unavailable'&&['access_denied','source_limit','read_failed','schema_missing'].includes(String(v.data.reason)))return {...common,view:'cards',data:{state:'unavailable',reason:v.data.reason as 'access_denied'|'source_limit'|'read_failed'|'schema_missing'}};
   const [startDate,endDate]=v.selection.split('_'),data=parseCurrentTimecards(v.data,{startDate,endDate});if(data.cards.length>1||Date.parse(data.observedAt)>Date.parse(common.observedAt))return failed();return {...common,view:'cards',data};
  }
  if(!object(v.data)||!keys(v.data,['basis','snapshot','decisions'])||typeof v.data.basis!=='string'||!/^[a-f0-9]{32}$/.test(v.data.basis)||!Array.isArray(v.data.decisions))return failed();
  const snapshot=parseEmployeeTimeCorrections(v.data.snapshot);
  if(snapshot.state==='ready'&&(snapshot.timeZone!==v.timeZone||Date.parse(snapshot.observedAt)>Date.parse(common.observedAt)||hoursRequestId(v.selection)&&(snapshot.requests.length>1||snapshot.requests.some(r=>r.id!==v.selection))))return failed();
  const rows=snapshot.state==='ready'?snapshot.requests:[],decisions=v.data.decisions.map((d):HoursDecision=>{if(!object(d)||!keys(d,['requestId','status','at','by','note'])||!hoursRequestId(d.requestId)||!['APPROVED','REJECTED'].includes(String(d.status))||!instant(d.at)||!text(d.by)||!(d.note===null||text(d.note,500))||!rows.some(r=>r.id===d.requestId&&r.status===d.status))throw Error('Decision binding');return d as HoursDecision;});
  if(new Set(decisions.map(d=>d.requestId)).size!==decisions.length||rows.some(r=>r.status!=='PENDING'&&!decisions.some(d=>d.requestId===r.id)))return failed();
  return {...common,view:'corrections',data:{basis:v.data.basis,snapshot,decisions}};
 }catch{return failed();}
}
export function parseHoursResult(v:unknown):HoursCorrectionResult{
 if(!object(v)||typeof v.status!=='string')return {status:'unknown'};
 if(['unknown','denied','invalid','conflict'].includes(v.status)&&keys(v,['status']))return v as HoursCorrectionResult;
 if(v.status==='recorded'&&keys(v,['status','operationId','requestId'])&&hoursRequestId(v.operationId)&&v.requestId===v.operationId)return v as HoursCorrectionResult;
 if(v.status==='blocked'&&keys(v,['status','reason'])&&['self_review','stale_source','overlap','live_state','invalid_interval','finalized_period'].includes(String(v.reason)))return v as HoursCorrectionResult;
 return {status:'unknown'};
}
