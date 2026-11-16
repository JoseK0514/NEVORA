import type {StaffingConflict,StaffingSnapshot} from './model';
import {privateReadBody} from '../http/nevora-failure';
import {addDays,isValidWeekStart,weekStartFor} from '../date-utils';

/* Browser side of the leave-staffing reads (CLAUDE-CONTRACT.md, "Leave conflict and repair reads"). POST with the exact
 * headers the contract lists; never a workspace or scope selector, never a mutation proof. Several weeks are read at once
 * (a request can span weeks) and merged into one observation that lives only as long as the shortest of them. */

export type StaffingScope='management'|'employee';
export type StaffingAuthority={scope:StaffingScope;actorId:string;view:string};
export type StaffingSelection={weeks:string[];requestId?:string;employeeId?:string};
export type StaffingRead=Extract<StaffingSnapshot,{state:'ready'}>|{state:'unavailable';reason:'access_denied'|'read_failed'};

/** The most weeks one read covers; a longer request is checked on its own page week by week. */
export const MAX_STAFFING_WEEKS=6;

/** The Mondays a date range touches (oldest first), or null past MAX_STAFFING_WEEKS. */
export function weeksFor(startDate:string,endDate:string):string[]|null{
 const weeks:string[]=[];
 for(let week=weekStartFor(startDate);week<=endDate;week=addDays(week,7)){weeks.push(week);if(weeks.length>MAX_STAFFING_WEEKS)return null;}
 return weeks;
}

const text=(value:unknown,max=200):value is string=>typeof value==='string'&&value.length>0&&value.length<=max;
const date=(value:unknown):value is string=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value);
const clock=(value:unknown):value is string=>typeof value==='string'&&/^\d{2}:\d{2}$/.test(value);

/** Strict decoder: anything unexpected is a failed read, never "no conflicts". */
export function parseStaffingSnapshot(value:unknown,weekStart:string):StaffingSnapshot{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid staffing read');
 const v=value as StaffingSnapshot;
 if(v.state==='unavailable'){if(v.reason!=='access_denied'&&v.reason!=='read_failed')throw Error('Invalid staffing state');return {state:'unavailable',reason:v.reason};}
 if(v.state!=='ready'||v.weekStart!==weekStart||!text(v.authority,400)||!Number.isFinite(Date.parse(v.observedAt))||!Number.isSafeInteger(v.validForMs)||v.validForMs<1||v.validForMs>45000||!Array.isArray(v.items)||v.items.length>1000)throw Error('Invalid staffing read');
 const ids=new Set<string>();
 for(const item of v.items as StaffingConflict[]){
  if(!item||!text(item.id,600)||!item.id.startsWith('LEAVE_STAFFING:')||ids.has(item.id)||!text(item.requestId)||!text(item.employeeId)||!text(item.employeeName)||!text(item.shiftId)||!text(item.locationId)||!text(item.locationName)
   ||!text(item.publicationId)||!Number.isSafeInteger(item.revisionNumber)||!date(item.date)||!clock(item.startTime)||!clock(item.endTime)||!Number.isSafeInteger(item.overlapMinutes)||item.overlapMinutes<1
   ||!Array.isArray(item.overlapDates)||!item.overlapDates.every(date)
   ||!(item.state==='approval_conflict'&&item.employeeInstruction==='awaiting_decision'||item.state==='repair_required'&&item.employeeInstruction==='approved_leave')
   ||!(item.ownerEmployeeId===null||text(item.ownerEmployeeId)))throw Error('Invalid staffing item');
  ids.add(item.id);
 }
 return v;
}

/** One week's read. A failed or refused read is a reason, never an empty list. */
export async function readStaffingWeek(authority:StaffingAuthority,weekStart:string,selection:Omit<StaffingSelection,'weeks'>,signal:AbortSignal):Promise<StaffingSnapshot>{
 if(!isValidWeekStart(weekStart))throw Error('Invalid week');
 const response=await fetch(authority.scope==='management'?'/api/manager/time-off-staffing':'/api/employee/time-off-staffing',{method:'POST',credentials:'same-origin',cache:'no-store',signal,
  headers:{'Content-Type':'application/json','x-nevora-leave-staffing':'1','x-nevora-actor':authority.actorId,'x-nevora-employee-view':authority.view},
  body:JSON.stringify({weekStart,...(selection.requestId?{requestId:selection.requestId}:{}),...(selection.employeeId?{employeeId:selection.employeeId}:{})})});
 const read=await privateReadBody(response);
 if(!read.ok)return {state:'unavailable',reason:read.reason};
 return parseStaffingSnapshot(read.body,weekStart);
}

/** Every week at once, merged: the earliest observation, the shortest lifetime, one authority; one failure fails all. */
export async function readStaffing(authority:StaffingAuthority,selection:StaffingSelection,signal:AbortSignal):Promise<StaffingRead>{
 if(!selection.weeks.length||selection.weeks.length>MAX_STAFFING_WEEKS)throw Error('Invalid weeks');
 const reads=await Promise.all(selection.weeks.map(week=>readStaffingWeek(authority,week,selection,signal)));
 const failed=reads.find(read=>read.state==='unavailable');
 if(failed&&failed.state==='unavailable')return {state:'unavailable',reason:reads.some(read=>read.state==='unavailable'&&read.reason==='access_denied')?'access_denied':'read_failed'};
 const ready=reads as Extract<StaffingSnapshot,{state:'ready'}>[];
 if(new Set(ready.map(read=>read.authority)).size!==1||ready[0].authority!==authority.view)return {state:'unavailable',reason:'access_denied'};
 const items=new Map<string,StaffingConflict>();
 for(const read of ready)for(const item of read.items)items.set(item.id,item);
 const observedAt=ready.map(read=>read.observedAt).sort()[0];
 return {state:'ready',authority:ready[0].authority,weekStart:selection.weeks[0],observedAt,validForMs:Math.min(...ready.map(read=>read.validForMs)),
  items:[...items.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.startTime.localeCompare(b.startTime)||a.id.localeCompare(b.id))};
}
