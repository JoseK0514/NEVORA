/**
 * Meal-period review (Jose, 2026-10-25: warnings only, never automatic penalty pay).
 * Pure and client-safe so payroll, Timecards and the time export flag the same days.
 * A day is the business day an entry starts on (shift-start-day attribution).
 */
export type MealWarningKind = 'NO_MEAL_5H' | 'MEAL_TOO_EARLY' | 'MEAL_TOO_SHORT' | 'REST_TOO_LONG';
export type MealWarning = { date: string; kind: MealWarningKind; minutes?: number };
/** kind MEAL = the payroll break rule says unpaid relieved meal; REST = paid rest.
 * mealMinimumMinutes is 60, or 30 with a recorded written reduction agreement. */
export type MealBreak = { start: bigint; end: bigint; kind: 'MEAL' | 'REST'; mealMinimumMinutes: number };
export type MealDayEntry = { start: bigint; end: bigint; breaks: MealBreak[] };

const MINUTE = BigInt(60_000_000_000), HOUR = MINUTE * BigInt(60);
/** Below this an unpaid meal is not a meal period: it is paid time (and flagged). */
export const MINIMUM_UNPAID_MEAL = MINUTE * BigInt(30);
/** A paid rest above this stays paid and is flagged for review. */
export const MAXIMUM_PAID_REST = MINUTE * BigInt(20);
const minutes = (n: bigint) => Number(n / MINUTE);

/**
 * Flag one business day:
 * - NO_MEAL_5H: more than 5 consecutive hours worked without an unpaid meal (an
 *   off-the-clock gap of at least 30 minutes also ends the run); minutes = longest run.
 * - MEAL_TOO_EARLY: the day's first meal starts before 2 hours of work; minutes = worked before it.
 * - MEAL_TOO_SHORT: a meal shorter than its minimum (60, or 30 with an agreement); minutes = its length.
 * - REST_TOO_LONG: a paid rest longer than 20 minutes; minutes = its length.
 * Each kind is reported at most once per day. Nothing here changes pay.
 */
export function mealWarningsForDay(date: string, entries: readonly MealDayEntry[]): MealWarning[] {
  const found = new Map<MealWarningKind, number>();
  const flag = (kind: MealWarningKind, value: number) => { if (!found.has(kind)) found.set(kind, value); };
  let run = BigInt(0), longest = BigInt(0), worked = BigInt(0), firstMeal = true, previousEnd: bigint | null = null;
  const work = (length: bigint) => { if (length <= BigInt(0)) return; run += length; worked += length; if (run > longest) longest = run; };
  for (const entry of [...entries].sort((a, b) => a.start < b.start ? -1 : a.start > b.start ? 1 : 0)) {
    if (previousEnd !== null && entry.start - previousEnd >= MINIMUM_UNPAID_MEAL) run = BigInt(0);
    let cursor = entry.start;
    for (const b of [...entry.breaks].sort((x, y) => x.start < y.start ? -1 : x.start > y.start ? 1 : 0)) {
      work(b.start - cursor);
      const length = b.end - b.start;
      if (b.kind === 'MEAL') {
        if (firstMeal && worked < HOUR * BigInt(2)) flag('MEAL_TOO_EARLY', minutes(worked));
        firstMeal = false;
        if (length < MINUTE * BigInt(b.mealMinimumMinutes)) flag('MEAL_TOO_SHORT', minutes(length));
        // A meal under 30 minutes is paid working time and does not end the run.
        if (length < MINIMUM_UNPAID_MEAL) work(length); else run = BigInt(0);
      } else {
        if (length > MAXIMUM_PAID_REST) flag('REST_TOO_LONG', minutes(length));
        work(length);
      }
      cursor = b.end;
    }
    work(entry.end - cursor);
    previousEnd = entry.end;
  }
  if (longest > HOUR * BigInt(5)) flag('NO_MEAL_5H', minutes(longest));
  const order: MealWarningKind[] = ['NO_MEAL_5H', 'MEAL_TOO_EARLY', 'MEAL_TOO_SHORT', 'REST_TOO_LONG'];
  return order.filter(kind => found.has(kind)).map(kind => ({ date, kind, minutes: found.get(kind)! }));
}

/** Review copy for the payroll period review and Timecards (non-blocking). */
export const MEAL_PERIOD_REVIEW_COPY = 'Meal period to review';
export const mealWarningText: Record<MealWarningKind, string> = {
  NO_MEAL_5H: 'Worked more than 5 hours without a meal',
  MEAL_TOO_EARLY: 'Meal started before the end of the 2nd hour',
  MEAL_TOO_SHORT: 'Meal shorter than required',
  REST_TOO_LONG: 'Paid rest longer than 20 minutes',
};
