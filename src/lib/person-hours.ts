import {addDays,isValidIsoDate,isValidWeekStart} from './date-utils';
import {businessDateStart,minutesInWorkweek,shiftPeriod} from './scheduling/periods';
import {projectTimecard,type TimecardSource} from './timecards/project';
export type PersonHours={employeeId:string;today:string;weekStart:string;timeZone:string;scheduledTodayMinutes:number|null;scheduledWeekMinutes:number|null;workedWeekMinutes:number|null;workedBasis:'EFFECTIVE_ELAPSED_INCLUDING_BREAKS'};
export type PersonHoursSource={employeeId:string;today:string;weekStart:string;timeZone:string;observedAt:string;scheduledComplete:boolean;shifts:{employeeId:string;locationId:string;date:string;startTime:string;endTime:string;isCalloutApproved:boolean}[];timecardSource:unknown};
/** Scheduled minutes use business wall time; worked minutes use the timecard's effective elapsed source, including breaks. */
export function projectPersonHours(source:PersonHoursSource,locationIds:readonly string[]|null):PersonHours{
 if(!isValidIsoDate(source.today)||!isValidWeekStart(source.weekStart)||!Array.isArray(source.shifts)||source.shifts.length>5000)throw Error('Invalid hours source');
 let today=0,week=0;const allowed=(id:string)=>locationIds===null||locationIds.includes(id);
 for(const shift of source.shifts){if(shift.employeeId!==source.employeeId||!allowed(shift.locationId)||shift.isCalloutApproved)continue;
  const period=shiftPeriod({...shift,startTime:shift.startTime.slice(0,5),endTime:shift.endTime.slice(0,5)}),day=businessDateStart(source.today);
  today+=Math.max(0,Math.min(period.end,day+1440)-Math.max(period.start,day));week+=minutesInWorkweek(period,source.weekStart);
 }
 let worked:number|null=null;
 if(source.timecardSource!==null){
  const card=projectTimecard(source.timecardSource,source.observedAt);
  if(card.employeeId!==source.employeeId||card.startDate!==source.weekStart||card.endDate!==addDays(source.weekStart,6)||card.timeZone!==source.timeZone)throw Error('Incorrect hours identity');
  const scoped:TimecardSource={...card,entries:card.entries.filter(e=>allowed(e.locationId))};
  const projected=projectTimecard(scoped,source.observedAt);
  if(!projected.issues.includes('overlapping_time'))worked=Number(BigInt(projected.recordedNanoseconds)/60_000_000_000n);
 }
 return {employeeId:source.employeeId,today:source.today,weekStart:source.weekStart,timeZone:source.timeZone,scheduledTodayMinutes:source.scheduledComplete?today:null,scheduledWeekMinutes:source.scheduledComplete?week:null,workedWeekMinutes:worked,workedBasis:'EFFECTIVE_ELAPSED_INCLUDING_BREAKS'};
}
