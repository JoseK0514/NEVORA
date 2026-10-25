/** Jose (Oct 25, 2026): meal periods are warnings only, never penalty pay. Team P adds `mealWarnings` on the timecard
 * read models next to `paidSeconds`; the field is optional and anything malformed renders nothing. Display only. */
export type MealWarning = { date: string; kind: 'NO_MEAL_5H' | 'MEAL_TOO_EARLY' | 'MEAL_TOO_SHORT'; minutes?: number; employeeId?: string };
const kinds = ['NO_MEAL_5H', 'MEAL_TOO_EARLY', 'MEAL_TOO_SHORT'];

export function mealWarningText(warning: MealWarning): string {
  if (warning.kind === 'NO_MEAL_5H') return 'No meal break in the first 5 hours';
  if (warning.kind === 'MEAL_TOO_EARLY') return 'Meal break started before the 2nd hour ended';
  return warning.minutes === undefined ? 'Meal break was short' : `Meal break was ${warning.minutes} min`;
}

export function mealWarningsOf(value: unknown): MealWarning[] {
  if (!Array.isArray(value)) return [];
  const out: MealWarning[] = [];
  for (const item of value.slice(0, 500)) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !kinds.includes(String(row.kind))) continue;
    if (row.minutes !== undefined && !(Number.isSafeInteger(row.minutes) && Number(row.minutes) >= 0)) continue;
    out.push({ date: row.date, kind: row.kind as MealWarning['kind'], ...(row.minutes === undefined ? {} : { minutes: Number(row.minutes) }),
      ...(typeof row.employeeId === 'string' && row.employeeId ? { employeeId: row.employeeId } : {}) });
  }
  return out;
}
