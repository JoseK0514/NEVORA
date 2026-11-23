import {Temporal} from '@js-temporal/polyfill';
import {parsePeriod,periodInstants,projectTimecard,type Period} from '../timecards/project';
import {parseTimecardsResponse,type TimecardItem} from '../timecards/read-model';
import {projectAttendanceForPeriod} from '../attendance/project';
import type {AttendanceGroup,ComparisonLimitation} from '../attendance/types';
import {REPORT_COPY} from './report-copy';

export type ReportHours={id:string;name:string;recordedNanoseconds:string;breakNanoseconds:string};
export type ReportSchedule={id:string;employeeId:string;locationId:string;locationName:string;positionId:string|null;positionName:string|null;
  date:string;startTime:string;endTime:string;revisionId:string;revisionNumber:number;isCalloutApproved:boolean};
export type ReportRequest={id:string;kind:'TIME_OFF'|'EXCHANGE'|'CALLOUT';employeeId:string;employeeName:string;status:string;
  date:string;endDate:string;createdAt:string;locationId:string|null};
export type ReportChange={id:string;requestId:string;requestKind:'EXCHANGE'|'CALLOUT';eventKind:string;requestRevision:number;
  createdAt:string;sourceDate:string;employeeId:string;outcomeMode:string|null;kind:'COVERAGE'|'SWAP'|'UNKNOWN'};
export type ReportPublication={id:string;revisionNumber:number;createdAt:string;sourceType:string};
export type PeriodReports={
  state:'ready';version:1;workspaceId:string;timeZone:string;observedAt:string;period:Period;
  summary:{employeeCount:number;entryCount:number;recordedNanoseconds:string;breakNanoseconds:string};
  hoursByEmployee:ReportHours[];hoursByLocation:ReportHours[];hoursByPosition:ReportHours[];
  scheduleVsActual:{employeeId:string;employeeName:string;scheduledNanoseconds:string|null;recordedNanoseconds:string;differenceNanoseconds:string|null;unresolvedScheduleCount:number}[];
  /** Sparse authorized published-assignment days; absence is not an observed zero. */
  scheduledByDay?:{state:'complete'|'unpublished';basis:'latest_published_elapsed_v1';rows:{employeeId:string;date:string;scheduledNanoseconds:string|null;unresolvedScheduleCount:number}[]};
  attendance:{state:'ready'|'limited';groups:AttendanceGroup[];limitations:ComparisonLimitation[];unavailableEmployeeIds:string[]};
  overtime:{state:'unavailable';reason:string};
  callouts:ReportRequest[];shiftChanges:ReportChange[];timeOff:ReportRequest[];
  coverageReliability:{completedCoverageRequests:number;observedCoverageRequests:number;unclassifiedEvents:number;score:null;definition:string};
  scheduleStability:{revisionCount:number;revisions:ReportPublication[];score:null;definition:string};
  approvals:{employeeId:string;employeeName:string;state:TimecardItem['state'];revision:number;issueCount:number;sourceHash:string}[];
  cards:TimecardItem[];schedules:ReportSchedule[];planCoverage:{state:'complete'|'unpublished';unpublishedWeeks:string[]};definitions:string[];
};
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown,max=300):v is string=>typeof v==='string'&&v.length>0&&v.length<=max&&v===v.trim()&&!/[\u0000-\u001f\u007f]/.test(v);
const nullable=(v:unknown):v is string|null=>v===null||text(v);
const positive=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>0;
const at=(v:unknown):v is string=>{if(!text(v,100))return false;try{Temporal.Instant.from(v);return true;}catch{return false;}};
const date=(v:unknown):v is string=>{if(!text(v)||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;try{Temporal.PlainDate.from(v,{overflow:'reject'});return true;}catch{return false;}};
function list(v:unknown):unknown[]{if(!Array.isArray(v)||v.length>10000)throw new Error('Report source limit or unavailable data');return v;}
function unique<T extends {id:string}>(v:T[]):T[]{if(new Set(v.map(x=>x.id)).size!==v.length)throw new Error('Duplicate report source');return v;}
function schedule(v:unknown):ReportSchedule{
  if(!record(v)||!text(v.id)||!text(v.employeeId)||!text(v.locationId)||!text(v.locationName)||!nullable(v.positionId)||!nullable(v.positionName)||
    !date(v.date)||!text(v.startTime,30)||!text(v.endTime,30)||!text(v.revisionId)||!positive(v.revisionNumber)||typeof v.isCalloutApproved!=='boolean')throw new Error('Invalid schedule report source');
  return v as ReportSchedule;
}
function request(v:unknown):ReportRequest{
  if(!record(v)||!text(v.id)||!['TIME_OFF','EXCHANGE','CALLOUT'].includes(String(v.kind))||!text(v.employeeId)||!text(v.employeeName)||
    !['PENDING','APPROVED','DENIED','CANCELLED','OPEN','EMPLOYEE_PENDING','MANAGER_PENDING','EXPIRED'].includes(String(v.status))||
    !date(v.date)||!date(v.endDate)||!at(v.createdAt)||!nullable(v.locationId))throw new Error('Invalid request source');
  return v as ReportRequest;
}
function change(v:unknown):ReportChange{
  if(!record(v)||!text(v.id)||!text(v.requestId)||!['EXCHANGE','CALLOUT'].includes(String(v.requestKind))||!text(v.eventKind)||
    !positive(v.requestRevision)||!at(v.createdAt)||!date(v.sourceDate)||!text(v.employeeId)||!nullable(v.outcomeMode)||
    !['COVERAGE','SWAP','UNKNOWN'].includes(String(v.kind)))throw new Error('Invalid shift-change source');
  return v as ReportChange;
}
function publication(v:unknown):ReportPublication{
  if(!record(v)||!text(v.id)||!positive(v.revisionNumber)||!at(v.createdAt)||!['PUBLISH','EXCHANGE','CALLOUT','MANAGER_MUTATION','OPEN_SHIFT'].includes(String(v.sourceType)))throw new Error('Invalid publication source');
  return v as ReportPublication;
}
const ns=(v:string)=>Temporal.Instant.from(v).epochNanoseconds;
function scheduledTime(s:ReportSchedule,zone:string,first:bigint,after:bigint):bigint|null{
  try{
    const day=Temporal.PlainDate.from(s.date),start=day.toPlainDateTime(Temporal.PlainTime.from(s.startTime));
    let end=s.endTime.startsWith('24:00')?day.add({days:1}).toPlainDateTime('00:00'):day.toPlainDateTime(Temporal.PlainTime.from(s.endTime));
    if(Temporal.PlainDateTime.compare(end,start)<0)end=end.add({days:1});
    if(Temporal.PlainDateTime.compare(end,start)===0)throw new Error('Invalid scheduled interval');
    const startNs=start.toZonedDateTime(zone,{disambiguation:'reject'}).toInstant().epochNanoseconds;
    const endNs=end.toZonedDateTime(zone,{disambiguation:'reject'}).toInstant().epochNanoseconds;
    const left=startNs>first?startNs:first,right=endNs<after?endNs:after;
    return right>left?right-left:BigInt(0);
  }catch{return null;}
}
function add(map:Map<string,ReportHours>,id:string,name:string,recorded:string,breakTime:string){
  const prior=map.get(id);map.set(id,{id,name,recordedNanoseconds:(BigInt(prior?.recordedNanoseconds??'0')+BigInt(recorded)).toString(),
    breakNanoseconds:(BigInt(prior?.breakNanoseconds??'0')+BigInt(breakTime)).toString()});
}
/** Validate one captured report source and aggregate canonical effective/finalized
 * time as decimal nanosecond strings. Recorded elapsed includes breaks; scheduled
 * comparison uses the latest published plan and returns null for incomplete plans
 * or unresolved boundaries. This projection does not calculate paid hours or scores. */
export function projectReports(value:unknown):PeriodReports{
  if(!record(value)||!text(value.workspaceId)||!text(value.timeZone,100)||!at(value.observedAt)||!record(value.period))throw new Error('Invalid report source');
  const period=parsePeriod(String(value.period.startDate),String(value.period.endDate));
  const cards=parseTimecardsResponse({observedAt:value.observedAt,cards:value.cards},period).cards;
  if(cards.some(c=>c.card.timeZone!==value.timeZone))throw new Error('Incorrect report timezone');
  const schedules=unique(list(value.schedules).map(schedule)),requests=unique(list(value.requests).map(request));
  const changes=unique(list(value.changes).map(change)),publications=unique(list(value.publications).map(publication));
  const attendanceSources=list(value.attendanceSources);
  const publishedWeeks=list(value.publishedWeeks);
  if(publishedWeeks.some(w=>!date(w))||new Set(publishedWeeks).size!==publishedWeeks.length)throw new Error('Invalid publication coverage');
  const firstPlanDay=Temporal.PlainDate.from(period.startDate).subtract({days:1});
  let week=firstPlanDay.subtract({days:firstPlanDay.dayOfWeek-1});
  const unpublishedWeeks:string[]=[];
  while(Temporal.PlainDate.compare(week,Temporal.PlainDate.from(period.endDate))<=0){if(!publishedWeeks.includes(week.toString()))unpublishedWeeks.push(week.toString());week=week.add({days:7});}
  const planComplete=unpublishedWeeks.length===0;
  const bounds=periodInstants(period,value.timeZone),first=ns(bounds.startAt),after=ns(bounds.endAt);
  const byEmployee=new Map<string,ReportHours>(),byLocation=new Map<string,ReportHours>(),byPosition=new Map<string,ReportHours>();
  let recorded=BigInt(0),breakTime=BigInt(0),entryCount=0;
  for(const item of cards){
    const c=item.card;add(byEmployee,c.employeeId,c.employeeName,c.recordedNanoseconds,c.breakNanoseconds);
    recorded+=BigInt(c.recordedNanoseconds);breakTime+=BigInt(c.breakNanoseconds);entryCount+=c.entries.length;
    for(const e of c.entries){
      const clipped=projectTimecard({...item.source,entries:[e],pendingCorrections:0,corrections:[]},value.observedAt);
      add(byLocation,e.locationId,e.locationName,clipped.recordedNanoseconds,clipped.breakNanoseconds);
      // Preserve separate captured labels for the same position across revisions.
      add(byPosition,JSON.stringify([e.positionId,e.positionName]),e.positionName??REPORT_COPY.en.positionNotCaptured,clipped.recordedNanoseconds,clipped.breakNanoseconds);
    }
  }
  const plan=new Map<string,{nanoseconds:bigint;unresolved:number}>();
  const dailyPlan=new Map<string,{employeeId:string;date:string;nanoseconds:bigint;unresolvedScheduleCount:number}>();
  for(const s of schedules){
    if(s.isCalloutApproved)continue;
    const total=plan.get(s.employeeId)??{nanoseconds:BigInt(0),unresolved:0};
    const elapsed=scheduledTime(s,value.timeZone,first,after);if(elapsed===null)total.unresolved++;else total.nanoseconds+=elapsed;plan.set(s.employeeId,total);
    // Scheduled periods occupy at most two local calendar dates. Split using
    // actual workplace midnight instants so a DST day keeps its elapsed length.
    const dates=[s.date];
    if(s.endTime<s.startTime&&!/^00:00(?::00(?:\.0+)?)?$/.test(s.endTime))dates.push(Temporal.PlainDate.from(s.date).add({days:1}).toString());
    for(const date of dates){
      if(date<period.startDate||date>period.endDate)continue;
      const dayBounds=periodInstants({startDate:date,endDate:date},value.timeZone);
      const dailyElapsed=scheduledTime(s,value.timeZone,ns(dayBounds.startAt),ns(dayBounds.endAt));
      if(dailyElapsed===BigInt(0))continue;
      const key=JSON.stringify([s.employeeId,date]);
      const day=dailyPlan.get(key)??{employeeId:s.employeeId,date,nanoseconds:BigInt(0),unresolvedScheduleCount:0};
      if(dailyElapsed===null)day.unresolvedScheduleCount++;else day.nanoseconds+=dailyElapsed;
      dailyPlan.set(key,day);
    }
  }
  const scheduleVsActual=[...new Set([...byEmployee.keys(),...plan.keys()])].sort().map(employeeId=>{
    const actual=byEmployee.get(employeeId),scheduled=plan.get(employeeId);const unresolved=scheduled?.unresolved??0;
    const scheduledNs=scheduled?.nanoseconds??BigInt(0),recordedNs=actual?.recordedNanoseconds??'0';
    return {employeeId,employeeName:actual?.name??REPORT_COPY.en.historicalEmployee,scheduledNanoseconds:unresolved||!planComplete?null:scheduledNs.toString(),
      recordedNanoseconds:recordedNs,differenceNanoseconds:unresolved||!planComplete?null:(BigInt(recordedNs)-scheduledNs).toString(),unresolvedScheduleCount:unresolved};
  });
  const groups:AttendanceGroup[]=[],limitations:ComparisonLimitation[]=[],unavailableEmployeeIds:string[]=[];
  for(const raw of attendanceSources){
    if(!record(raw)||raw.workspaceId!==value.workspaceId||raw.timeZone!==value.timeZone||raw.observedAt!==value.observedAt||!Array.isArray(raw.entries)||!text(raw.employeeId))throw new Error('Invalid attendance report scope');
    if(raw.entries.some(e=>!record(e)||e.employeeId!==raw.employeeId))throw new Error('Cross-employee attendance source');
    const projected=projectAttendanceForPeriod(raw,bounds.startAt,bounds.endAt);
    if(projected.state!=='ready'){unavailableEmployeeIds.push(raw.employeeId);continue;}
    groups.push(...projected.groups);limitations.push(...projected.coverage.limitations);
  }
  const coverage=changes.filter(e=>e.requestKind==='EXCHANGE'&&e.kind==='COVERAGE');
  const completedCoverageRequests=new Set(coverage.filter(e=>e.eventKind==='COMPLETED').map(e=>e.requestId)).size;
  return {state:'ready',version:1,workspaceId:value.workspaceId,timeZone:value.timeZone,observedAt:value.observedAt,period,
    summary:{employeeCount:cards.length,entryCount,recordedNanoseconds:recorded.toString(),breakNanoseconds:breakTime.toString()},
    hoursByEmployee:[...byEmployee.values()],hoursByLocation:[...byLocation.values()],hoursByPosition:[...byPosition.values()],scheduleVsActual,
    scheduledByDay:{state:planComplete?'complete':'unpublished',basis:'latest_published_elapsed_v1',rows:[...dailyPlan.values()].sort((a,b)=>a.employeeId.localeCompare(b.employeeId)||a.date.localeCompare(b.date)).map(({nanoseconds,...day})=>({...day,scheduledNanoseconds:!planComplete||day.unresolvedScheduleCount?null:nanoseconds.toString()}))},
    attendance:{state:limitations.length||unavailableEmployeeIds.length?'limited':'ready',groups,limitations,unavailableEmployeeIds},
    overtime:{state:'unavailable',reason:REPORT_COPY.en.overtimeReason},
    callouts:requests.filter(r=>r.kind==='CALLOUT'),timeOff:requests.filter(r=>r.kind==='TIME_OFF'),shiftChanges:changes,
    coverageReliability:{completedCoverageRequests,observedCoverageRequests:new Set(coverage.map(e=>e.requestId)).size,
      unclassifiedEvents:changes.filter(e=>e.requestKind==='EXCHANGE'&&e.kind==='UNKNOWN').length,score:null,
      definition:REPORT_COPY.en.coverageDefinition},
    scheduleStability:{revisionCount:publications.length,revisions:publications,score:null,
      definition:REPORT_COPY.en.stabilityDefinition},
    approvals:cards.map(c=>({employeeId:c.card.employeeId,employeeName:c.card.employeeName,state:c.state,revision:c.revision,issueCount:c.card.issues.length,sourceHash:c.sourceHash})),cards,schedules,planCoverage:{state:planComplete?'complete':'unpublished',unpublishedWeeks},
    definitions:[...REPORT_COPY.en.definitions]};
}
