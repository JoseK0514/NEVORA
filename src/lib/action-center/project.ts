import {formatCalendarRange} from '../date-utils';
import type {ManagerActionItem} from '../assistance/manager-actions';
import type {AttendanceDisplayReview} from '../attendance/read-model';
import type {ManagerTimeCorrections} from '../time-corrections/read-model';
import {classifyTimecardReview} from '../timecards/review-summary';
import type {TimecardsResult} from '../timecards/read-model';
export type ActionItem=Omit<ManagerActionItem,'type'>&{type:ManagerActionItem['type']|'ATTENDANCE'|'TIME_CORRECTION'|'TIMECARD';category:'scheduling'|'requests'|'timekeeping';request?:import('../data/action-request-facts.server').ActionRequestFacts;purpose?:'STAFFING_REPAIR';ownerEmployeeId?:string|null};
export type ActionCenter={state:'ready';observedAt:string;validForMs:number;weekStart:string;items:ActionItem[];counts:{total:number;scheduling:number;requests:number;timekeeping:number};limitedAttendance:boolean}|{state:'unavailable';reason:'access_denied'|'read_failed'};
function validateRequestFacts(value:NonNullable<ActionItem['request']>) {
 const date=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['startDate','endDate','partialDay','lengthText','locationName','note','counterpartName','reviewHref'].includes(k))||
  !date(value.startDate)||!date(value.endDate)||value.endDate<value.startDate||typeof value.lengthText!=='string'||!value.lengthText||value.lengthText.length>200||
  typeof value.locationName!=='string'||!value.locationName||value.locationName.length>200||
  value.counterpartName!==undefined&&(typeof value.counterpartName!=='string'||!value.counterpartName.trim()||value.counterpartName.length>200||/[\u0000-\u001f\u007f]/.test(value.counterpartName))||
  value.note!==undefined&&(typeof value.note!=='string'||value.note.length>3000)||typeof value.reviewHref!=='string'||!/^\/app\/(requests|exchange)\?/.test(value.reviewHref)||/[\\\u0000-\u001f\u007f]/.test(value.reviewHref))throw Error('Invalid request facts');
 if(value.partialDay!==undefined){const p=value.partialDay;if(!p||typeof p!=='object'||Object.keys(p).sort().join(',')!=='end,start'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.start)||!/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/.test(p.end))throw Error('Invalid request facts');}
}
const requestTypes=new Set(['TIME_OFF','EXCHANGE','CALLOUT']);
/** Pure merge of already authorized ready sources. Conflicting duplicate identities
 * fail rather than hiding one source; stable priority/time/ID ordering drives the
 * view. Actions and links remain review prompts, not mutation permissions. */
export function combineManagerActions(scheduling:ManagerActionItem[],attendance:Extract<AttendanceDisplayReview,{state:'ready'}>,corrections:Extract<ManagerTimeCorrections,{state:'ready'}>,timecards:Pick<Extract<TimecardsResult,{state:'ready'}>,'cards'>,actorId:string):ActionItem[]{
 const items:ActionItem[]=scheduling.map(item=>({...item,category:requestTypes.has(item.type)?'requests':'scheduling'}));
 const employees=new Map(attendance.labels.employees.map(e=>[e.id,e.name]));
 for(const group of attendance.groups)if(group.observations.length)items.push({id:'ATTENDANCE:'+group.entryId,type:'ATTENDANCE',category:'timekeeping',priority:'REVIEW',title:'Recorded attendance needs review',detail:`${employees.get(group.employeeId)??'Employee'} · ${group.observations.length} recorded observations.`,employeeId:group.employeeId,locationId:group.locationId,href:'/app?view=attendance#attendance-'+encodeURIComponent(group.entryId)});
 for(const request of corrections.requests)items.push({id:'TIME_CORRECTION:'+request.id,type:'TIME_CORRECTION',category:'timekeeping',priority:'REVIEW',title:request.isSelf?'Your correction needs another reviewer':'Time correction waiting for review',detail:`${request.employeeName} · ${request.kind==='MISSING_ENTRY'?'Recorded entry not sent yet':'Recorded time correction'}.`,dateTime:request.createdAt,href:'/app?view=attendance#correction-'+encodeURIComponent(request.id)});
 const periodLocations=new Map<string,Set<string>>();
 for(const {card} of timecards.cards){const key=card.startDate+':'+card.endDate,set=periodLocations.get(key)??new Set<string>();
  for(const entry of card.entries)set.add(entry.locationName);periodLocations.set(key,set);}
 for(const item of timecards.cards){const card=item.card,review=classifyTimecardReview(item);if(review==='finalized'||review==='untouched')continue;
  const locations=(periodLocations.get(card.startDate+':'+card.endDate)?.size??0)>1?[...new Set(card.entries.map(entry=>entry.locationName))].sort():[];
  items.push({id:`TIMECARD:${card.employeeId}:${card.startDate}:${card.endDate}`,type:'TIMECARD',category:'timekeeping',priority:'REVIEW',title:card.employeeId===actorId?'Your timecard needs another reviewer':review==='awaiting_finalization'?'Approved timecard awaits finalization':'Period timecard needs review',detail:`${card.employeeName} · ${formatCalendarRange(card.startDate,card.endDate)}${locations.length?' · '+locations.join(', '):''}${card.issues.length?' · Fix recorded-time issues before finalizing.':''}`,employeeId:card.employeeId,href:`/app/timecards?start=${card.startDate}&end=${card.endDate}#timecard-${encodeURIComponent(card.employeeId)}`});
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
 for(const item of v.items){if(!item||typeof item.id!=='string'||ids.has(item.id)||!['scheduling','requests','timekeeping'].includes(item.category)||!['URGENT','REVIEW','MISSING_INPUT'].includes(item.priority)||typeof item.title!=='string'||!item.title||typeof item.detail!=='string'||typeof item.href!=='string'||!/^\/app(?:\/|\?)/.test(item.href)||item.href.includes('\\')||item.title.length>500||item.detail.length>3000)throw Error('Invalid action item');if(item.request!==undefined)validateRequestFacts(item.request);ids.add(item.id);counts[item.category]++;}
 if(!v.counts||Object.keys(counts).some(key=>counts[key as keyof typeof counts]!==v.counts[key as keyof typeof counts]))throw Error('Invalid action counts');return v;
}
