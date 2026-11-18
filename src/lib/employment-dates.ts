import { Temporal } from '@js-temporal/polyfill';

/**
 * Optional employment facts on an employee record (migration 0068). They are
 * calendar labels (YYYY-MM-DD) with no time zone, never instants. Puerto Rico
 * wage rules use the hire date; the birth date supports minors' hour limits.
 * The termination date is informational only: it never changes `active`, and
 * deactivation stays the separate Access and sign-in action.
 *
 * Privacy: the birth date is sensitive. Only the Owner, and Managers whose
 * current authority lets them edit that person's core profile, read or write
 * these values. Keep them out of the shared `Employee` DTO and every roster,
 * schedule, kiosk, notification, export, calendar and advisor projection.
 */
export type EmploymentDates = { hireDate: string | null; terminationDate: string | null; birthDate: string | null };
export type EmploymentDateField = keyof EmploymentDates;
export type EmploymentDateError = { field: EmploymentDateField; message: string };

export const EMPLOYMENT_DATE_FIELDS = ['hireDate', 'terminationDate', 'birthDate'] as const satisfies readonly EmploymentDateField[];
/** Matches the database floor on the birth date column; also applied to the other two dates. */
export const EARLIEST_EMPLOYMENT_DATE = '1900-01-01';
export const EMPTY_EMPLOYMENT_DATES: EmploymentDates = { hireDate: null, terminationDate: null, birthDate: null };

/** A real ISO calendar date: shape YYYY-MM-DD and no overflow (Feb 30 is refused, not normalized). */
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  try { return Temporal.PlainDate.from(value, { overflow: 'reject' }).toString() === value; } catch { return false; }
}

/** Shape-only parse of a command field: exactly the three keys, each null or a real calendar date. */
export function parseEmploymentDates(value: unknown): EmploymentDates | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== EMPLOYMENT_DATE_FIELDS.length || !EMPLOYMENT_DATE_FIELDS.every(key => Object.prototype.hasOwnProperty.call(record, key))) return null;
  if (!EMPLOYMENT_DATE_FIELDS.every(key => record[key] === null || isCalendarDate(record[key]))) return null;
  return { hireDate: record.hireDate as string | null, terminationDate: record.terminationDate as string | null, birthDate: record.birthDate as string | null };
}

export function hasEmploymentDate(dates: EmploymentDates): boolean {
  return EMPLOYMENT_DATE_FIELDS.some(key => dates[key] !== null);
}

/**
 * The server's rules, relative to `today`, the business-local calendar date
 * (business-time.ts `businessDate` in the workspace zone). Returns every
 * problem so the form can say all of them at once; an empty list is valid.
 * Callers must have parsed the shape first (parseEmploymentDates).
 */
export function employmentDateErrors(dates: EmploymentDates, today: string): EmploymentDateError[] {
  if (!isCalendarDate(today)) throw new Error('employment_dates_today_invalid');
  const latestHire = Temporal.PlainDate.from(today).add({ years: 1 }).toString();
  const errors: EmploymentDateError[] = [];
  const { hireDate, terminationDate, birthDate } = dates;
  if (birthDate !== null) {
    if (birthDate < EARLIEST_EMPLOYMENT_DATE) errors.push({ field: 'birthDate', message: 'Enter a date of birth in 1900 or later.' });
    else if (birthDate > today) errors.push({ field: 'birthDate', message: 'A date of birth can’t be in the future.' });
  }
  if (hireDate !== null) {
    if (hireDate < EARLIEST_EMPLOYMENT_DATE) errors.push({ field: 'hireDate', message: 'Enter a hire date in 1900 or later.' });
    else if (hireDate > latestHire) errors.push({ field: 'hireDate', message: 'A hire date can’t be more than a year from today.' });
  }
  if (terminationDate !== null) {
    if (terminationDate < EARLIEST_EMPLOYMENT_DATE) errors.push({ field: 'terminationDate', message: 'Enter a termination date in 1900 or later.' });
    else if (hireDate !== null && terminationDate < hireDate) errors.push({ field: 'terminationDate', message: 'The termination date can’t be before the hire date.' });
  }
  return errors;
}
