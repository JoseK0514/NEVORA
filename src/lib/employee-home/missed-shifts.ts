import {addDays, formatTimeRange} from '../date-utils';
import {shiftBoundaryInstants} from '../business-time';

/* UX-E-01 (Oct 25, 2026): a published shift today or yesterday that has ended with no recorded time and no correction
 * covering it. Home shows it under "Needs you" and links to My time with the correction sheet filled in. Display only:
 * the correction itself is checked by the server when it is sent. */

export type MissedShiftSource = {id: string; date: string; startTime: string; endTime: string; locationId: string; isCalloutApproved?: boolean};
export type MissedShift = {id: string; date: string; startTime: string; endTime: string; locationId: string; locationName: string; day: 'today' | 'yesterday'; hours: string; href: string};
type Interval = {startAt: string; endAt: string | null};

const overlaps = (a: {start: number; end: number}, b: Interval, now: number) => {
  const start = Date.parse(b.startAt), end = b.endAt ? Date.parse(b.endAt) : now;
  return Number.isFinite(start) && start < a.end && end > a.start;
};

/** The My time link that opens the correction sheet for this shift (missing time, its day, hours and location). */
export function correctionHref(shift: Pick<MissedShiftSource, 'date' | 'startTime' | 'endTime' | 'locationId'>) {
  // A shift that runs to midnight ends at 00:00 (the sheet reads an end at or before the start as the next day).
  const end = shift.endTime.slice(0, 5) === '24:00' ? '00:00' : shift.endTime.slice(0, 5);
  const query = new URLSearchParams({fix: shift.date, from: shift.startTime.slice(0, 5), to: end, location: shift.locationId});
  return `/app/my-time?${query.toString()}#corrections`;
}

/** Ended shifts on `today` or the day before with no recorded entry and no waiting or approved correction over them. */
export function findMissedShifts({shifts, entries, corrections, locations, today, now, timeZone}: {
  shifts: readonly MissedShiftSource[];
  /** Recorded entries (clock-in to clock-out, or still open). */
  entries: readonly {clockInAt: string; clockOutAt: string | null}[];
  /** Correction requests; declined ones don't cover a shift. */
  corrections: readonly {status: string; proposedStartAt: string; proposedEndAt: string}[];
  locations: readonly {id: string; shortName: string}[];
  today: string;
  now: Date;
  timeZone: string;
}): MissedShift[] {
  const yesterday = addDays(today, -1), at = now.getTime();
  const found: MissedShift[] = [];
  for (const shift of shifts) {
    if (shift.isCalloutApproved || (shift.date !== today && shift.date !== yesterday)) continue;
    let bounds: {start: number; end: number};
    try { const instants = shiftBoundaryInstants(shift, timeZone); bounds = {start: Date.parse(instants.startAt), end: Date.parse(instants.endAt)}; }
    catch { continue; }
    if (!(bounds.end <= at)) continue;
    if (entries.some(entry => overlaps(bounds, {startAt: entry.clockInAt, endAt: entry.clockOutAt}, at))) continue;
    if (corrections.some(item => item.status !== 'REJECTED' && overlaps(bounds, {startAt: item.proposedStartAt, endAt: item.proposedEndAt}, at))) continue;
    found.push({
      id: shift.id, date: shift.date, startTime: shift.startTime, endTime: shift.endTime, locationId: shift.locationId,
      locationName: locations.find(location => location.id === shift.locationId)?.shortName?.trim() ?? '',
      day: shift.date === today ? 'today' : 'yesterday', hours: formatTimeRange(shift.startTime, shift.endTime), href: correctionHref(shift),
    });
  }
  return found.sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`));
}
