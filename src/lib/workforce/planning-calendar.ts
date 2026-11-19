import { addDays, isValidIsoDate, weekDates, weekStartFor } from '../date-utils';

export type PlanningCalendar = { startsOn: number; revision: number };
export const defaultPlanningCalendar: PlanningCalendar = { startsOn: 1, revision: 0 };

/** A planning window groups civil dates. The original schedule publication keys
 * are carried per day so changing the window cannot reinterpret an old revision. */
export function planningWeekFor(date: string, calendar: PlanningCalendar) {
  if (!isValidIsoDate(date) || !Number.isInteger(calendar.startsOn) || calendar.startsOn < 0 || calendar.startsOn > 6) {
    throw new RangeError('Invalid planning calendar or date');
  }
  const dayOfWeek = new Date(date + 'T12:00:00Z').getUTCDay();
  const startsOn = addDays(date, -((dayOfWeek - calendar.startsOn + 7) % 7));
  const days = weekDates(startsOn).map(day => ({ date: day, scheduleWeekStart: weekStartFor(day) }));
  return { ...calendar, startDate: startsOn, endDate: days[6].date, days };
}
