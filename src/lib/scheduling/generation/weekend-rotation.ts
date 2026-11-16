import {addDays,weekStartFor} from '../../date-utils';
import {resolveRestrictionDay} from '../restrictions';
import {businessDateStart,periodsOverlap,shiftPeriod} from '../periods';
import type {GenerationAssignment,GenerationEmployee} from './types';

export type WeekendHistory={knownWeeks:{weekStart:string;locationIds:string[]}[];employeeSince:Record<string,string>;assignments:GenerationAssignment[]};
export type WeekendBurden={employeeId:string;eligibleWeekends:number;workedWeekends:number;lastWeekendWorked:boolean|null};
type Context={weekStart:string;history?:WeekendHistory;employees:readonly GenerationEmployee[];ledger:readonly GenerationAssignment[]};
const weekend=(week:string)=>({start:businessDateStart(addDays(week,5)),end:businessDateStart(addDays(week,7))});
export function weekendBurden(employee:GenerationEmployee,weekStart:string,history?:WeekendHistory):WeekendBurden{
 const result:WeekendBurden={employeeId:employee.id,eligibleWeekends:0,workedWeekends:0,lastWeekendWorked:null};
 businessDateStart(weekStart);
 if(!history||!resolveRestrictionDay(weekStart,employee.managementRestrictions??[]))return result;
 const since=history.employeeSince[employee.id],earliest=addDays(weekStart,-56),known=new Map<string,Set<string>>();
 if(since)businessDateStart(since);
 for(const row of history.knownWeeks){
  if(weekStartFor(row.weekStart)!==row.weekStart)throw Error('Invalid weekend history week');
  if(row.weekStart<earliest||row.weekStart>=weekStart)continue;
  const locations=known.get(row.weekStart)??new Set<string>();row.locationIds.forEach(id=>locations.add(id));known.set(row.weekStart,locations);
 }
 const rows=new Map<string,GenerationAssignment>();
 for(const row of history.assignments)if(row.employeeId===employee.id&&row.scheduleStatus!=='DRAFT'){
  const old=rows.get(row.id);if(old&&JSON.stringify(old)!==JSON.stringify(row))throw Error('Conflicting weekend history identity');rows.set(row.id,row);
 }
 for(const [week,locations] of [...known].sort(([a],[b])=>a.localeCompare(b))){
  const period=weekend(week),saturday=addDays(week,5),sunday=addDays(week,6);
  const weekendRows=[...rows.values()].filter(row=>periodsOverlap(shiftPeriod(row),period));
  // Positive retained work wins over a release/leave on the other day. Unknown
  // eligibility or an absence cannot erase an actual published assignment.
  const worked=weekendRows.some(row=>!row.isCalloutApproved);
  if(worked){result.eligibleWeekends++;result.workedWeekends++;if(week===addDays(weekStart,-7))result.lastWeekendWorked=true;continue;}
  if(!since||since>week||employee.eligibleLocationIds.length===0||!employee.eligibleLocationIds.every(id=>locations.has(id)))continue;
  const restricted=[saturday,sunday].some(date=>{const day=resolveRestrictionDay(date,employee.managementRestrictions??[]);return day===null||day.windows.length!==1||day.windows[0].start!==0||day.windows[0].end!==1440;});
  const leave=employee.approvedTimeOff.some(r=>(!r.status||r.status==='APPROVED')&&(!r.employeeId||r.employeeId===employee.id)&&r.startDate<=sunday&&r.endDate>=saturday);
  if(restricted||leave||weekendRows.some(row=>row.isCalloutApproved))continue;
  result.eligibleWeekends++;
  if(week===addDays(weekStart,-7))result.lastWeekendWorked=false;
 }
 return result;
}
/** Compute once per solve. Unknown history receives the observed population mean,
 * never a fabricated run of weekends off or a penalty for approved absence. */
export function prepareWeekendRotation(context:Context){
 const metrics=context.employees.map(e=>weekendBurden(e,context.weekStart,context.history));
 const known=metrics.filter(m=>m.eligibleWeekends>0),mean=known.length?known.reduce((sum,m)=>sum+m.workedWeekends/m.eligibleWeekends,0)/known.length:0;
 const values=new Map(metrics.map(m=>[m.employeeId,{rate:m.eligibleWeekends?m.workedWeekends/m.eligibleWeekends:mean,last:m.lastWeekendWorked===null?0.5:Number(m.lastWeekendWorked)}]));
 const targetWeekend=weekend(context.weekStart);
 const isWeekend=(candidate:{date:string;startTime:string;endTime:string;endDate?:string})=>periodsOverlap(shiftPeriod(candidate),targetWeekend);
 return {metrics,compare:(a:{employeeId:string;date:string;startTime:string;endTime:string;endDate?:string},b:{employeeId:string;date:string;startTime:string;endTime:string;endDate?:string},ledger:readonly GenerationAssignment[]=context.ledger)=>{
  if(!known.length)return 0;
  const av=isWeekend(a)?values.get(a.employeeId):undefined,bv=isWeekend(b)?values.get(b.employeeId):undefined;
  const rate=(av?.rate??mean)-(bv?.rate??mean);if(rate)return rate;
  const last=(av?.last??0.5)-(bv?.last??0.5);if(last)return last;
  // Equal historical burdens: keep a full weekend off for another employee when
  // the same otherwise-eligible person is already assigned this weekend.
  const already=(id:string)=>ledger.some(s=>s.employeeId===id&&!s.isCalloutApproved&&periodsOverlap(shiftPeriod(s),targetWeekend));
  return Number(Boolean(bv)&&already(b.employeeId))-Number(Boolean(av)&&already(a.employeeId));
 }};
}
export function compareWeekendRotation(a:GenerationEmployee,b:GenerationEmployee,context:Context){
 const date=addDays(context.weekStart,5),candidate={date,startTime:'00:00',endTime:'24:00'};
 return prepareWeekendRotation(context).compare({...candidate,employeeId:a.id},{...candidate,employeeId:b.id});
}
