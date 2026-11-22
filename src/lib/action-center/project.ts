import {formatCalendarRange} from '../date-utils';
import {Temporal} from '@js-temporal/polyfill';
import {reviewFacts,validateReviewFacts,type ReviewFacts} from './review-facts';
import {validateRequestFacts} from './request-facts';
import type {ManagerActionItem} from '../assistance/manager-actions';
import type {AttendanceDisplayReview} from '../attendance/read-model';
import type {ManagerTimeCorrections} from '../time-corrections/read-model';
import {classifyTimecardReview} from '../timecards/review-summary';
import type {TimecardsResult} from '../timecards/read-model';
export type ActionItem=Omit<ManagerActionItem,'type'>&{type:ManagerActionItem['type']|'ATTENDANCE'|'TIME_CORRECTION'|'TIMECARD';category:'scheduling'|'requests'|'timekeeping';request?:import('../data/action-request-facts.server').ActionRequestFacts;correction?:{workDate:string;timeZone:string;recordedStartAt:string|null;recordedEndAt:string|null;requestedStartAt:string;requestedEndAt:string};review?:ReviewFacts;purpose?:'STAFFING_REPAIR';ownerEmployeeId?:string|null};
export type ActionCenter={state:'ready';observedAt:string;validForMs:number;weekStart:string;items:ActionItem[];counts:{total:number;scheduling:number;requests:number;timekeeping:number};limitedAttendance:boolean}|{state:'unavailable';reason:'access_denied'|'read_failed'};
const validInstant=(v:unknown):v is string=>{if(typeof v!=='string')return false;try{Temporal.Instant.from(v);return true;}catch{return false;}};
function validateCorrection(v:NonNullable<ActionItem['correction']>){
 if(!v||Object.keys(v).sort().join(',')!=='recordedEndAt,recordedStartAt,requestedEndAt,requestedStartAt,timeZone,workDate'||!validInstant(v.requestedStartAt)||!validInstant(v.requestedEndAt)||Temporal.Instant.compare(v.requestedStartAt,v.requestedEndAt)>=0||
  v.recordedStartAt!==null&&!validInstant(v.recordedStartAt)||v.recordedEndAt!==null&&!validInstant(v.recordedEndAt))throw Error('Invalid correction facts');
 try{if(Temporal.Instant.from(v.requestedStartAt).toZonedDateTimeISO(v.timeZone).toPlainDate().toString()!==v.workDate)throw Error();}catch{throw Error('Invalid correction facts');}
}
const requestTypes=new Set(['TIME_OFF','EXCHANGE','CALLOUT']);
/** Pure merge of already authorized ready sources. Conflicting duplicate identities
 * fail rather than hiding one source; stable priority/time/ID ordering drives the
 * view. Actions and links remain review prompts, not mutation permissions. */
export function combineManagerActions(scheduling:ManagerActionItem[],attendance:Pick<Extract<AttendanceDisplayReview,{state:'ready'}>,'groups'|'labels'>,corrections:Extract<ManagerTimeCorrections,{state:'ready'}>,timecards:Pick<Extract<TimecardsResult,{state:'ready'}>,'cards'>,actorId:string):ActionItem[]{
 const items:ActionItem[]=scheduling.map(item=>({...item,category:requestTypes.has(item.type)?'requests':'scheduling'}));
 const employees=new Map(attendance.labels.employees.map(e=>[e.id,e.name]));
 for(const group of attendance.groups)if(group.observations.length)items.push({id:'ATTENDANCE:'+group.entryId,type:'ATTENDANCE',category:'timekeeping',priority:'REVIEW',title:'Recorded attendance needs review',detail:`${employees.get(group.employeeId)??'Employee'} · ${group.observations.length} recorded observations.`,employeeId:group.employeeId,locationId:group.locationId,href:'/app?view=attendance#attendance-'+encodeURIComponent(group.entryId)});
 for(const request of corrections.requests)items.push({id:'TIME_CORRECTION:'+request.id,type:'TIME_CORRECTION',review:reviewFacts(request.concernsActor??null,request.isSelf,'TIME_CORRECTION'),correction:{workDate:new Intl.DateTimeFormat('en-CA',{timeZone:corrections.timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(request.proposedStartAt)),timeZone:corrections.timeZone,recordedStartAt:request.originalStartAt,recordedEndAt:request.originalEndAt,requestedStartAt:request.proposedStartAt,requestedEndAt:request.proposedEndAt},category:'timekeeping',priority:'REVIEW',title:request.isSelf?'Your correction needs another reviewer':'Time correction waiting for review',detail:`${request.employeeName} · ${request.kind==='MISSING_ENTRY'?'Recorded entry not sent yet':'Recorded time correction'}.`,dateTime:request.createdAt,href:'/app?view=attendance#correction-'+encodeURIComponent(request.id)});
 const periodLocations=new Map<string,Set<string>>();
 for(const {card} of timecards.cards){const key=card.startDate+':'+card.endDate,set=periodLocations.get(key)??new Set<string>();
  for(const entry of card.entries)set.add(entry.locationName);periodLocations.set(key,set);}
 for(const item of timecards.cards){const card=item.card,review=classifyTimecardReview(item);if(review==='finalized'||review==='untouched')continue;
  const locations=(periodLocations.get(card.startDate+':'+card.endDate)?.size??0)>1?[...new Set(card.entries.map(entry=>entry.locationName))].sort():[];
  items.push({id:`TIMECARD:${card.employeeId}:${card.startDate}:${card.endDate}`,type:'TIMECARD',review:reviewFacts(card.employeeId===actorId,card.employeeId===actorId,'TIMECARD',{startDate:card.startDate,endDate:card.endDate}),category:'timekeeping',priority:'REVIEW',title:card.employeeId===actorId?'Your timecard needs another reviewer':review==='awaiting_finalization'?'Approved timecard awaits finalization':'Period timecard needs review',detail:`${card.employeeName} · ${formatCalendarRange(card.startDate,card.endDate)}${locations.length?' · '+locations.join(', '):''}${card.issues.length?' · Fix recorded-time issues before finalizing.':''}`,employeeId:card.employeeId,href:`/app/timecards?start=${card.startDate}&end=${card.endDate}#timecard-${encodeURIComponent(card.employeeId)}`});
 }
 const unique=new Map<string,ActionItem>();for(const item of items){const previous=unique.get(item.id);if(previous&&JSON.stringify(previous)!==JSON.stringify(item))throw Error('Conflicting action sources');unique.set(item.id,item);}
 if(unique.size>1000)throw Error('Action source limit');
 const ranks={URGENT:0,REVIEW:1,MISSING_INPUT:2};return [...unique.values()].sort((a,b)=>ranks[a.priority]-ranks[b.priority]||(a.dateTime??'9999').localeCompare(b.dateTime??'9999')||a.id.localeCompare(b.id));
}
/** Verify the requested week, bounded display lifetime, unique items and recomputed
 * category counts before exposing a server snapshot to its client view. */
export function parseActionCenter(value:unknown,weekStart:string):ActionCenter{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid action center');const v=value as ActionCenter;
 if(v.state==='unavailable'){if(!['access_denied','read_failed'].includes(v.reason))throw Error('Invalid unavailable state');return v;}
 if(v.state!=='ready'||v.weekStart!==weekStart||!Number.isFinite(Date.parse(v.observedAt))||!Number.isFinite(v.validForMs)||v.validForMs<1||v.validForMs>45000||!Array.isArray(v.items)||v.items.length>1000||typeof v.limitedAttendance!=='boolean')throw Error('Invalid action center');
 const counts={total:v.items.length,scheduling:0,requests:0,timekeeping:0},ids=new Set<string>();
 for(const item of v.items){if(!item||typeof item.id!=='string'||ids.has(item.id)||!['scheduling','requests','timekeeping'].includes(item.category)||!['URGENT','REVIEW','MISSING_INPUT'].includes(item.priority)||typeof item.title!=='string'||!item.title||typeof item.detail!=='string'||typeof item.href!=='string'||!/^\/app(?:\/|\?)/.test(item.href)||item.href.includes('\\')||item.title.length>500||item.detail.length>3000)throw Error('Invalid action item');if(item.request!==undefined)validateRequestFacts(item.request);if(item.review!==undefined)validateReviewFacts(item.review,item.type);if(item.correction!==undefined)validateCorrection(item.correction);if(item.dateTime!==undefined&&['TIME_OFF','EXCHANGE','CALLOUT','TIME_CORRECTION'].includes(item.type)&&!validInstant(item.dateTime))throw Error('Invalid creation timestamp');ids.add(item.id);counts[item.category]++;}
 if(!v.counts||Object.keys(counts).some(key=>counts[key as keyof typeof counts]!==v.counts[key as keyof typeof counts]))throw Error('Invalid action counts');return v;
}
