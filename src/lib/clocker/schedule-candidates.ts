import { Temporal } from '@js-temporal/polyfill';

export type PublishedScheduleRevision={id:string;weekStart:string;revisionNumber:number};
export type PublishedContextShift={id:string;revisionId:string;sourceShiftId:string|null;scheduleId:string;
 employeeId:string;locationId:string;date:string;startTime:string;endTime:string;
 positionId:string|null;positionName:string|null;isCalloutApproved:boolean};
export type PublishedScheduleSource={anchorDate:string;publication:{revisions:PublishedScheduleRevision[];shifts:PublishedContextShift[];weekStarts?:string[]}};
export type ScheduleCaptureScope={employeeId:string;locationId:string;workspaceId:string;timeZone:string};
export type ScheduleCandidate={publishedShiftId:string;revisionId:string;revisionNumber:number;sourceShiftId:string|null;scheduleId:string;
 date:string;startTime:string;endTime:string;positionId:string|null;positionName:string|null;startAt:string;endAt:string;uncertain:boolean};
export type PreparedScheduleCapture=ScheduleCaptureScope&{version:1;windowStartAt:string;windowEndAt:string;
 reviewedWeekStarts:string[];reviewedRevisionIds:string[];candidates:ScheduleCandidate[]};
export type CapturedScheduleContext={version:1;status:'MATCHED'|'UNMATCHED'|'AMBIGUOUS';timeZone:string;capturedAt:string;
 candidateCount:number;reviewedRevisionIds:string[];reason:'NO_MATCH'|'OVERLAPPING_SHIFTS'|'UNRESOLVED_LOCAL_TIME'|null;
 match:null|{revisionId:string;revisionNumber:number;publishedShiftId:string;sourceShiftId:string|null;scheduleId:string;
 positionId:string|null;positionName:string|null}};

function weekStart(date:Temporal.PlainDate):string{
 return date.subtract({days:date.dayOfWeek-1}).toString();
}
function boundary(date:Temporal.PlainDate,time:string,end:boolean):Temporal.PlainDateTime{
 if(!/^\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?$/.test(time))throw Error('Invalid published boundary');
 if(end&&/^24:00(?::00(?:\.0{1,6})?)?$/.test(time))return date.add({days:1}).toPlainDateTime('00:00');
 if(Number(time.slice(6,8)||0)>59||Number(time.slice(3,5))>59||Number(time.slice(0,2))>23)throw Error('Invalid published boundary');
 return date.toPlainDateTime(Temporal.PlainTime.from(time));
}
function candidate(row:PublishedContextShift,revision:PublishedScheduleRevision,timeZone:string):ScheduleCandidate{
 const date=Temporal.PlainDate.from(row.date),start=boundary(date,row.startTime,false);
 let end=boundary(date,row.endTime,true);
 const order=Temporal.PlainDateTime.compare(end,start);
 if(order===0)throw Error('Published shift has no positive duration');
 if(order<0)end=end.add({days:1});
 let startAt:string,endAt:string,uncertain=false;
 try{
  startAt=start.toZonedDateTime(timeZone,{disambiguation:'reject'}).toInstant().toString();
  endAt=end.toZonedDateTime(timeZone,{disambiguation:'reject'}).toInstant().toString();
 }catch{
  uncertain=true;
  startAt=start.toZonedDateTime(timeZone,{disambiguation:'earlier'}).toInstant().toString();
  endAt=end.toZonedDateTime(timeZone,{disambiguation:'later'}).toInstant().toString();
 }
 if(Temporal.Instant.compare(startAt,endAt)>=0)throw Error('Invalid published instant interval');
 return {publishedShiftId:row.id,revisionId:revision.id,revisionNumber:revision.revisionNumber,sourceShiftId:row.sourceShiftId,
  scheduleId:row.scheduleId,date:row.date,startTime:row.startTime,endTime:row.endTime,positionId:row.positionId,positionName:row.positionName,
  startAt,endAt,uncertain};
}

/** Server-side projection only. No notes, peer data, browser time or attendance tolerance is accepted. */
export function prepareScheduleCapture(source:PublishedScheduleSource,scope:ScheduleCaptureScope):PreparedScheduleCapture{
 if(!scope.employeeId||!scope.locationId||!scope.workspaceId||!scope.timeZone)throw Error('Invalid schedule capture scope');
 const anchor=Temporal.PlainDate.from(source.anchorDate);
 // Validate the configured timezone before accepting source as reviewed.
 anchor.toZonedDateTime(scope.timeZone);
 const reviewedWeekStarts=[...new Set([
  ...(source.publication.weekStarts??[]),
  ...source.publication.revisions.map(r=>r.weekStart),
  weekStart(anchor.subtract({days:2})),
  weekStart(anchor.subtract({days:1})),
  weekStart(anchor),
  weekStart(anchor.add({days:1})),
 ])].sort();
 const windowStartAt=anchor.subtract({days:1}).toZonedDateTime(scope.timeZone).toInstant().toString();
 const windowEndAt=anchor.add({days:2}).toZonedDateTime(scope.timeZone).toInstant().toString();
 const latest=new Map<string,PublishedScheduleRevision>();
 for(const revision of source.publication.revisions){
  if(!revision.id||!Number.isSafeInteger(revision.revisionNumber)||revision.revisionNumber<1)throw Error('Invalid publication revision');
  const revisionWeek=Temporal.PlainDate.from(revision.weekStart).toString();
  if(revisionWeek!==revision.weekStart)throw Error('Invalid publication week');
  const previous=latest.get(revision.weekStart);
  if(previous&&previous.revisionNumber===revision.revisionNumber&&previous.id!==revision.id)throw Error('Ambiguous publication revision');
  if(!previous||revision.revisionNumber>previous.revisionNumber)latest.set(revision.weekStart,revision);
 }
 const byId=new Map([...latest.values()].map(r=>[r.id,r]));
 const candidates=source.publication.shifts.filter(s=>byId.has(s.revisionId)&&s.employeeId===scope.employeeId&&
  s.locationId===scope.locationId&&!s.isCalloutApproved).map(s=>candidate(s,byId.get(s.revisionId)!,scope.timeZone))
  .filter(c=>Temporal.Instant.compare(c.endAt,windowStartAt)>0&&Temporal.Instant.compare(c.startAt,windowEndAt)<0)
  .sort((a,b)=>a.publishedShiftId.localeCompare(b.publishedShiftId));
 if(new Set(candidates.map(c=>c.publishedShiftId)).size!==candidates.length)throw Error('Duplicate published shift snapshot');
 return {...scope,version:1,windowStartAt,windowEndAt,reviewedWeekStarts,
  reviewedRevisionIds:[...byId.keys()].sort(),candidates};
}

/** Match the server clock-in instant against half-open published shift intervals.
 * No grace/tolerance window is applied; overlapping or unresolved local-time
 * candidates remain ambiguous rather than choosing an arbitrary assignment. */
export function captureScheduleContext(prepared:PreparedScheduleCapture,clockInAt:string):CapturedScheduleContext{
 const at=Temporal.Instant.from(clockInAt);
 if(Temporal.Instant.compare(at,prepared.windowStartAt)<0||Temporal.Instant.compare(at,prepared.windowEndAt)>=0)
  throw Error('Clock instant is outside the reviewed schedule window');
 const matching=prepared.candidates.filter(c=>Temporal.Instant.compare(at,c.startAt)>=0&&Temporal.Instant.compare(at,c.endAt)<0);
 const base={version:1 as const,timeZone:prepared.timeZone,capturedAt:at.toString(),
  candidateCount:matching.length,reviewedRevisionIds:[...prepared.reviewedRevisionIds]};
 if(matching.length===0)return {...base,status:'UNMATCHED' as const,reason:'NO_MATCH' as const,match:null};
 if(matching.some(c=>c.uncertain))return {...base,status:'AMBIGUOUS' as const,reason:'UNRESOLVED_LOCAL_TIME' as const,match:null};
 if(matching.length>1)return {...base,status:'AMBIGUOUS' as const,reason:'OVERLAPPING_SHIFTS' as const,match:null};
 const c=matching[0];
 return {...base,status:'MATCHED' as const,reason:null,match:{revisionId:c.revisionId,revisionNumber:c.revisionNumber,
  publishedShiftId:c.publishedShiftId,sourceShiftId:c.sourceShiftId,scheduleId:c.scheduleId,
  positionId:c.positionId,positionName:c.positionName}};
}
