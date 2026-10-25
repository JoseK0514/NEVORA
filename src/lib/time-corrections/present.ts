import {formatTime,formatTimeRange} from '../date-utils';
import type {CorrectionKind} from './validation';

/* How a time correction reads for a manager (final pass, Oct 25; UX-O-06): one name for what was asked and one way to
 * write its times, shared by the Inbox item, On shift and the timecard sheet. Display only. */

/** "Missed punch", "Clock times", "Lunch break". */
export function correctionKindLabel(item:{kind:CorrectionKind;breakName:string|null}){
  if(item.kind==='MISSING_ENTRY')return 'Missed punch';
  if(item.kind==='BREAK_BOUNDARY')return item.breakName?`${item.breakName} break`:'Break times';
  return 'Clock times';
}

const dayFmt=(iso:string,zone:string)=>new Intl.DateTimeFormat('en-US',{timeZone:zone,month:'short',day:'numeric'}).format(new Date(iso));
const hhmm=(iso:string,zone:string)=>new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso));
const zoneDay=(iso:string,zone:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));

/** "Oct 25, 8:00 AM – 4:00 PM"; an end at the next midnight reads "midnight"; across midnight otherwise the end names
 * its own day ("Oct 25, 10:00 PM – Oct 26, 6:00 AM"). */
export function correctionInterval(startAt:string,endAt:string,zone:string){
  const start=hhmm(startAt,zone),end=hhmm(endAt,zone);
  const endsAtMidnight=end==='00:00'&&Date.parse(endAt)>Date.parse(startAt)&&Date.parse(endAt)-Date.parse(startAt)<=86_400_000;
  if(zoneDay(startAt,zone)===zoneDay(endAt,zone)||endsAtMidnight)return `${dayFmt(startAt,zone)}, ${formatTimeRange(start,endsAtMidnight?'24:00':end)}`;
  return `${dayFmt(startAt,zone)}, ${formatTime(start)} – ${dayFmt(endAt,zone)}, ${formatTime(end)}`;
}

/** "Missed punch · Oct 25, 8:00 AM – 4:00 PM": what the person asked for. */
export function correctionLine(item:{kind:CorrectionKind;breakName:string|null;proposedStartAt:string;proposedEndAt:string},zone:string){
  return `${correctionKindLabel(item)} · ${correctionInterval(item.proposedStartAt,item.proposedEndAt,zone)}`;
}
