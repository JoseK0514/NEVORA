import {isValidIsoDate,isValidWeekStart} from './date-utils';
export type PlanningView='timeoff'|'availability';
export type PlanningHours={dayOfWeek:number;startTime:string;endTime:string};
export type PlanningRequest={id:string;startDate:string;endDate:string;startTime:string|null;endTime:string|null;note:string|null;status:'PENDING'|'APPROVED'|'DENIED'|'CANCELLED';createdAt:string;reviewedAt:string|null;reviewer:string|null};
type Lifetime={state:'ready';kind:'planning';authority:string;observedAt:string;validForMs:number;timeZone:string;enabled:boolean;selection:string};
export type TimeOffPlanning=Lifetime&{view:'timeoff';data:{requests:PlanningRequest[]}};
export type AvailabilityPlanning=Lifetime&{view:'availability';data:{basis:string;windows:PlanningHours[];deadline:string|null;submitted:boolean;locked:boolean;nextWeek:string}};
export type EmployeePlanningSnapshot=TimeOffPlanning|AvailabilityPlanning|{state:'unavailable';reason:'access_denied'|'read_failed'};
export type PlanningCommand={kind:'request';requestId:string;startDate:string;endDate:string;startTime:string|null;endTime:string|null;note:string}|{kind:'withdraw';requestId:string;confirmed:true}|{kind:'availability';selection:string;basis:string;windows:PlanningHours[];changedDays:number[];confirmEmpty:boolean};
export type PlanningResult={state:'complete'|'missing'|'conflict'|'locked'|'disabled'|'denied'|'invalid'|'unknown';requestId:string|null};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:Record<string,unknown>,names:string[])=>Object.keys(v).length===names.length&&names.every(k=>Object.hasOwn(v,k));
const str=(v:unknown,max=300):v is string=>typeof v==='string'&&v.length>0&&v.length<=max;
export const planningId=(v:unknown):v is string=>typeof v==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/.test(v);
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const instant=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const clock=(v:unknown):v is string=>typeof v==='string'&&/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(v);
const hash=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{32}$/.test(v);
export const planningWeek=(v:unknown):v is string=>typeof v==='string'&&isValidWeekStart(v);
export function validPlanningHours(v:unknown):v is PlanningHours[]{
 if(!Array.isArray(v)||v.length>168)return false;
 if(!v.every(w=>object(w)&&keys(w,['dayOfWeek','startTime','endTime'])&&Number.isInteger(w.dayOfWeek)&&Number(w.dayOfWeek)>=0&&Number(w.dayOfWeek)<=6&&clock(w.startTime)&&(clock(w.endTime)||w.endTime==='24:00')&&w.startTime<String(w.endTime)))return false;
 const sorted=[...v].sort((a,b)=>a.dayOfWeek-b.dayOfWeek||a.startTime.localeCompare(b.startTime));
 return sorted.every((w,i)=>!i||w.dayOfWeek!==sorted[i-1].dayOfWeek||w.startTime>=sorted[i-1].endTime);
}
/** The UI can identify and associate the exact field before sending a validated command. */
export function planningHoursIssue(windows:PlanningHours[]):{dayOfWeek:number;index:number;field:'startTime'|'endTime';reason:'range'|'overlap'}|null{
 const counts=new Map<number,number>(),indexed=windows.map(w=>{const index=counts.get(w.dayOfWeek)??0;counts.set(w.dayOfWeek,index+1);return {...w,index};});
 for(const w of indexed){if(!clock(w.startTime))return {dayOfWeek:w.dayOfWeek,index:w.index,field:'startTime',reason:'range'};if(!(clock(w.endTime)||w.endTime==='24:00')||w.startTime>=w.endTime)return {dayOfWeek:w.dayOfWeek,index:w.index,field:'endTime',reason:'range'};}
 const sorted=[...indexed].sort((a,b)=>a.dayOfWeek-b.dayOfWeek||a.startTime.localeCompare(b.startTime));
 for(let i=1;i<sorted.length;i++){const w=sorted[i],previous=sorted[i-1];if(w.dayOfWeek===previous.dayOfWeek&&w.startTime<previous.endTime)return {dayOfWeek:w.dayOfWeek,index:w.index,field:'startTime',reason:'overlap'};}
 return null;
}

export function sameHours(a:PlanningHours[],b:PlanningHours[]){
 const key=(rows:PlanningHours[])=>{const merged:PlanningHours[]=[];for(const row of [...rows].sort((x,y)=>x.dayOfWeek-y.dayOfWeek||x.startTime.localeCompare(y.startTime))){const last=merged.at(-1);if(last&&last.dayOfWeek===row.dayOfWeek&&row.startTime<=last.endTime)last.endTime=last.endTime>row.endTime?last.endTime:row.endTime;else merged.push({...row});}return merged.map(w=>[w.dayOfWeek,w.startTime,w.endTime].join('|')).join(';');};
 return key(a)===key(b);
}
export function planningChangedDays(base:PlanningHours[],windows:PlanningHours[],confirmEmpty=false){return confirmEmpty&&!windows.length?[0,1,2,3,4,5,6]:[0,1,2,3,4,5,6].filter(day=>!sameHours(base.filter(w=>w.dayOfWeek===day),windows.filter(w=>w.dayOfWeek===day)));}

export function mergePlanningDraft(latest:PlanningHours[],draft:PlanningHours[],changedDays:number[]){const changed=new Set(changedDays);return [...latest.filter(w=>!changed.has(w.dayOfWeek)),...draft.filter(w=>changed.has(w.dayOfWeek))].sort((a,b)=>a.dayOfWeek-b.dayOfWeek||a.startTime.localeCompare(b.startTime));}
export function parsePlanningCommand(v:unknown):PlanningCommand|null{
 if(!object(v))return null;
 if(v.kind==='request'&&keys(v,['kind','requestId','startDate','endDate','startTime','endTime','note'])&&uuid(v.requestId)&&typeof v.startDate==='string'&&isValidIsoDate(v.startDate)&&typeof v.endDate==='string'&&isValidIsoDate(v.endDate)&&v.startDate<=v.endDate&&typeof v.note==='string'&&v.note.length<=250&&v.note===v.note.trim()&&((v.startTime===null&&v.endTime===null)||(clock(v.startTime)&&(clock(v.endTime)||v.endTime==='24:00')&&v.startTime<v.endTime&&v.startDate===v.endDate)))return v as PlanningCommand;
 if(v.kind==='withdraw'&&keys(v,['kind','requestId','confirmed'])&&uuid(v.requestId)&&v.confirmed===true)return v as PlanningCommand;
 if(v.kind==='availability'&&keys(v,['kind','selection','basis','windows','changedDays','confirmEmpty'])&&(v.selection==='normal'||planningWeek(v.selection))&&hash(v.basis)&&validPlanningHours(v.windows)&&Array.isArray(v.changedDays)&&v.changedDays.length<=7&&new Set(v.changedDays).size===v.changedDays.length&&v.changedDays.every(d=>Number.isInteger(d)&&d>=0&&d<=6)&&typeof v.confirmEmpty==='boolean'&&(v.windows.length>0||v.confirmEmpty))return v as PlanningCommand;
 return null;
}
const failed=():EmployeePlanningSnapshot=>({state:'unavailable',reason:'read_failed'});
export function parseEmployeePlanning(v:unknown):EmployeePlanningSnapshot{
 if(!object(v))return failed();
 if(v.state==='unavailable')return keys(v,['state','reason'])&&['access_denied','read_failed'].includes(String(v.reason))?v as EmployeePlanningSnapshot:failed();
 if(!keys(v,['state','kind','view','selection','authority','observedAt','validForMs','timeZone','enabled','data'])||v.state!=='ready'||v.kind!=='planning'||!str(v.authority,64)||!/^[a-f0-9]{64}$/.test(v.authority)||!instant(v.observedAt)||!Number.isSafeInteger(v.validForMs)||Number(v.validForMs)<=0||Number(v.validForMs)>45000||!str(v.timeZone,100)||typeof v.enabled!=='boolean'||!object(v.data))return failed();
 try{new Intl.DateTimeFormat('en-US',{timeZone:v.timeZone});}catch{return failed();}
 const d=v.data;
 if(v.view==='timeoff'){
  if(!(v.selection==='list'||v.selection==='new'||planningId(v.selection))||!keys(d,['requests'])||!Array.isArray(d.requests)||d.requests.length>10000||!v.enabled&&d.requests.length||v.selection==='new'&&d.requests.length)return failed();
  for(const row of d.requests){if(!object(row)||!keys(row,['id','startDate','endDate','startTime','endTime','note','status','createdAt','reviewedAt','reviewer'])||!planningId(row.id)||typeof row.startDate!=='string'||!isValidIsoDate(row.startDate)||typeof row.endDate!=='string'||!isValidIsoDate(row.endDate)||row.startDate>row.endDate||!(row.startTime===null&&row.endTime===null||clock(row.startTime)&&(clock(row.endTime)||row.endTime==='24:00')&&row.startTime<row.endTime&&row.startDate===row.endDate)||!(row.note===null||str(row.note,10000))||!['PENDING','APPROVED','DENIED','CANCELLED'].includes(String(row.status))||!instant(row.createdAt)||!(row.reviewedAt===null||instant(row.reviewedAt))||!(row.reviewer===null||str(row.reviewer,300))||v.selection!=='list'&&row.id!==v.selection)return failed();}
  if(v.selection!=='list'&&d.requests.length>1)return failed();
 }else if(v.view==='availability'){
  if(!(v.selection==='normal'||planningWeek(v.selection))||!v.enabled||!keys(d,['basis','windows','deadline','submitted','locked','nextWeek'])||!hash(d.basis)||!validPlanningHours(d.windows)||!(d.deadline===null||instant(d.deadline))||typeof d.submitted!=='boolean'||typeof d.locked!=='boolean'||!planningWeek(d.nextWeek)||v.selection==='normal'&&(d.deadline!==null||d.submitted||d.locked))return failed();
 }else return failed();
 return v as EmployeePlanningSnapshot;
}
export function parsePlanningResult(v:unknown):PlanningResult{
 return object(v)&&keys(v,['state','requestId'])&&['complete','missing','conflict','locked','disabled','denied','invalid','unknown'].includes(String(v.state))&&(v.requestId===null||planningId(v.requestId))?v as PlanningResult:{state:'unknown',requestId:null};
}
