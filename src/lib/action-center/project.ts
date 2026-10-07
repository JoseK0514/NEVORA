import type {ManagerActionItem} from '../assistance/manager-actions';
import type {AttendanceDisplayReview} from '../attendance/read-model';
import type {ManagerTimeCorrections} from '../time-corrections/read-model';
import type {TimecardsResult} from '../timecards/read-model';
export type ActionItem=Omit<ManagerActionItem,'type'>&{type:ManagerActionItem['type']|'ATTENDANCE'|'TIME_CORRECTION'|'TIMECARD';category:'scheduling'|'requests'|'timekeeping'};
export type ActionCenter={state:'ready';observedAt:string;validForMs:number;weekStart:string;items:ActionItem[];counts:{total:number;scheduling:number;requests:number;timekeeping:number};limitedAttendance:boolean}|{state:'unavailable';reason:'access_denied'|'read_failed'};
const requestTypes=new Set(['TIME_OFF','EXCHANGE','CALLOUT']);
export function combineManagerActions(scheduling:ManagerActionItem[],attendance:Extract<AttendanceDisplayReview,{state:'ready'}>,corrections:Extract<ManagerTimeCorrections,{state:'ready'}>,timecards:Extract<TimecardsResult,{state:'ready'}>,actorId:string):ActionItem[]{
 const items:ActionItem[]=scheduling.map(item=>({...item,category:requestTypes.has(item.type)?'requests':'scheduling'}));
 const employees=new Map(attendance.labels.employees.map(e=>[e.id,e.name]));
 for(const group of attendance.groups)if(group.observations.length)items.push({id:'ATTENDANCE:'+group.entryId,type:'ATTENDANCE',category:'timekeeping',priority:'REVIEW',title:'Recorded attendance needs review',detail:`${employees.get(group.employeeId)??'Employee'} · ${group.observations.length} recorded observations.`,employeeId:group.employeeId,locationId:group.locationId,href:'/app?view=attendance#attendance-'+encodeURIComponent(group.entryId)});
 for(const request of corrections.requests)items.push({id:'TIME_CORRECTION:'+request.id,type:'TIME_CORRECTION',category:'timekeeping',priority:'REVIEW',title:request.isSelf?'Your correction needs another reviewer':'Time correction waiting for review',detail:`${request.employeeName} · ${request.kind==='MISSING_ENTRY'?'Missing recorded entry':'Recorded time correction'}.`,dateTime:request.createdAt,href:'/app?view=attendance#correction-'+encodeURIComponent(request.id)});
 for(const item of timecards.cards){const card=item.card;if(item.state==='FINALIZED'||(!card.entries.length&&!item.history.length))continue;
  items.push({id:`TIMECARD:${card.employeeId}:${card.startDate}:${card.endDate}`,type:'TIMECARD',category:'timekeeping',priority:'REVIEW',title:card.employeeId===actorId?'Your timecard needs another reviewer':item.state==='APPROVED'?'Approved timecard awaits finalization':'Period timecard needs review',detail:`${card.employeeName} · ${card.startDate}–${card.endDate}${card.issues.length?' · Resolve recorded-time exceptions before finalizing.':'.'}`,employeeId:card.employeeId,href:`/app/timecards?start=${card.startDate}&end=${card.endDate}#timecard-${encodeURIComponent(card.employeeId)}`});
 }
 const unique=new Map<string,ActionItem>();for(const item of items){const previous=unique.get(item.id);if(previous&&JSON.stringify(previous)!==JSON.stringify(item))throw Error('Conflicting action sources');unique.set(item.id,item);}
 if(unique.size>1000)throw Error('Action source limit');
 const ranks={URGENT:0,REVIEW:1,MISSING_INPUT:2};return [...unique.values()].sort((a,b)=>ranks[a.priority]-ranks[b.priority]||(a.dateTime??'9999').localeCompare(b.dateTime??'9999')||a.id.localeCompare(b.id));
}
export function parseActionCenter(value:unknown,weekStart:string):ActionCenter{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid action center');const v=value as ActionCenter;
 if(v.state==='unavailable'){if(!['access_denied','read_failed'].includes(v.reason))throw Error('Invalid unavailable state');return v;}
 if(v.state!=='ready'||v.weekStart!==weekStart||!Number.isFinite(Date.parse(v.observedAt))||!Number.isFinite(v.validForMs)||v.validForMs<1||v.validForMs>45000||!Array.isArray(v.items)||v.items.length>1000||typeof v.limitedAttendance!=='boolean')throw Error('Invalid action center');
 const counts={total:v.items.length,scheduling:0,requests:0,timekeeping:0},ids=new Set<string>();
 for(const item of v.items){if(!item||typeof item.id!=='string'||ids.has(item.id)||!['scheduling','requests','timekeeping'].includes(item.category)||!['URGENT','REVIEW','MISSING_INPUT'].includes(item.priority)||typeof item.title!=='string'||!item.title||typeof item.detail!=='string'||typeof item.href!=='string'||!/^\/app(?:\/|\?)/.test(item.href)||item.href.includes('\\')||item.title.length>500||item.detail.length>3000)throw Error('Invalid action item');ids.add(item.id);counts[item.category]++;}
 if(!v.counts||Object.keys(counts).some(key=>counts[key as keyof typeof counts]!==v.counts[key as keyof typeof counts]))throw Error('Invalid action counts');return v;
}
