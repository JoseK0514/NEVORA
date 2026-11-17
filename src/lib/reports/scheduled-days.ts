import {minutesFromNanoseconds} from '../duration-format';
import type {PeriodReports} from './project';

/* Phase 4 (U09): scheduled time per day for Reports' "Hours by day", from `PeriodReports.scheduledByDay` and nothing
 * else. The rows are sparse: a day with no row has no published shifts and is "No published schedule", never a zero.
 * A row whose time is null (an unpublished week, or a shift whose local start or end is ambiguous or invalid) is
 * "Scheduled time not available". Minutes are the server's elapsed time, already split at the workplace's midnight, so
 * an overnight shift counts on both days and a daylight-saving day keeps its real length (23 or 25 hours); nothing is
 * recomputed from clock times here. This is the latest published plan, not hours worked and not pay. */
export type DaySchedule =
  | {state: 'scheduled'; minutes: number}
  /** No published shift that day: not an observed zero. */
  | {state: 'none'}
  /** A row exists but its time can't be given. */
  | {state: 'unconfirmed'};

/** Null when the report carries no usable daily schedule (an older payload, or a basis this screen doesn't know):
 * the chart then draws no scheduled bars and says nothing about the schedule. */
export function scheduledDays(report: Pick<PeriodReports, 'scheduledByDay'>, dates: readonly string[]): Map<string, DaySchedule> | null {
  const source = report.scheduledByDay;
  if (!source || source.basis !== 'latest_published_elapsed_v1' || (source.state !== 'complete' && source.state !== 'unpublished') || !Array.isArray(source.rows)) return null;
  const totals = new Map<string, {minutes: number; unknown: boolean}>();
  for (const row of source.rows) {
    const day = totals.get(row.date) ?? {minutes: 0, unknown: false};
    const minutes = row.scheduledNanoseconds === null || row.unresolvedScheduleCount > 0 ? null : minutesFromNanoseconds(row.scheduledNanoseconds);
    if (minutes === null) day.unknown = true; else day.minutes += minutes;
    totals.set(row.date, day);
  }
  return new Map(dates.map(date => {
    const day = totals.get(date);
    return [date, !day ? {state: 'none'} : day.unknown ? {state: 'unconfirmed'} : {state: 'scheduled', minutes: day.minutes}] as [string, DaySchedule];
  }));
}
