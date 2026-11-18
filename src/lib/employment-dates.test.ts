import { describe, expect, it } from 'vitest';
import { businessDate } from './business-time';
import { employmentDateErrors, hasEmploymentDate, isCalendarDate, parseEmploymentDates, EMPTY_EMPLOYMENT_DATES } from './employment-dates';

const dates = (value: Partial<typeof EMPTY_EMPLOYMENT_DATES>) => ({ ...EMPTY_EMPLOYMENT_DATES, ...value });
const fields = (today: string, value: Partial<typeof EMPTY_EMPLOYMENT_DATES>) => employmentDateErrors(dates(value), today).map(error => error.field);

describe('employment date shape', () => {
  it('accepts only real ISO calendar dates', () => {
    for (const valid of ['2024-02-29', '1900-01-01', '2017-01-26']) expect(isCalendarDate(valid)).toBe(true);
    for (const invalid of ['2026-02-29', '2026-02-30', '2026-13-01', '2026-2-1', '26-01-01', '2026-01-01T00:00', '', ' 2026-01-01', null, 20260101])
      expect(isCalendarDate(invalid), String(invalid)).toBe(false);
  });

  it('requires exactly the three keys, each null or a calendar date', () => {
    expect(parseEmploymentDates({ hireDate: '2015-03-02', terminationDate: null, birthDate: null })).toEqual({ hireDate: '2015-03-02', terminationDate: null, birthDate: null });
    expect(parseEmploymentDates(EMPTY_EMPLOYMENT_DATES)).toEqual(EMPTY_EMPLOYMENT_DATES);
    expect(parseEmploymentDates({ hireDate: null, terminationDate: null })).toBeNull();
    expect(parseEmploymentDates({ ...EMPTY_EMPLOYMENT_DATES, active: false })).toBeNull();
    expect(parseEmploymentDates({ ...EMPTY_EMPLOYMENT_DATES, birthDate: '2026-02-30' })).toBeNull();
    expect(parseEmploymentDates({ ...EMPTY_EMPLOYMENT_DATES, hireDate: '' })).toBeNull();
    expect(parseEmploymentDates([null, null, null])).toBeNull();
    expect(hasEmploymentDate(EMPTY_EMPLOYMENT_DATES)).toBe(false);
    expect(hasEmploymentDate(dates({ birthDate: '1990-05-01' }))).toBe(true);
  });
});

describe('employment date rules', () => {
  const today = '2026-11-18';

  it('accepts all dates blank and sensible values', () => {
    expect(fields(today, {})).toEqual([]);
    expect(fields(today, { hireDate: '2015-03-02', terminationDate: '2026-06-30', birthDate: '1990-05-01' })).toEqual([]);
  });

  it('refuses a birth date in the future or before 1900, and accepts today and 1900-01-01', () => {
    expect(fields(today, { birthDate: '2026-11-19' })).toEqual(['birthDate']);
    expect(fields(today, { birthDate: '1899-12-31' })).toEqual(['birthDate']);
    expect(fields(today, { birthDate: today })).toEqual([]);
    expect(fields(today, { birthDate: '1900-01-01' })).toEqual([]);
  });

  it('allows a hire date up to one year ahead, but not later', () => {
    expect(fields(today, { hireDate: '2027-11-18' })).toEqual([]);
    expect(fields(today, { hireDate: '2027-11-19' })).toEqual(['hireDate']);
    // A leap day plus one year lands on Feb 28.
    expect(fields('2028-02-29', { hireDate: '2029-02-28' })).toEqual([]);
    expect(fields('2028-02-29', { hireDate: '2029-03-01' })).toEqual(['hireDate']);
  });

  it('refuses a termination date before the hire date, and accepts the same day or no hire date', () => {
    const errors = employmentDateErrors(dates({ hireDate: '2020-05-10', terminationDate: '2020-05-09' }), today);
    expect(errors).toEqual([{ field: 'terminationDate', message: 'The termination date can’t be before the hire date.' }]);
    expect(fields(today, { hireDate: '2020-05-10', terminationDate: '2020-05-10' })).toEqual([]);
    expect(fields(today, { terminationDate: '2020-05-09' })).toEqual([]);
  });

  it('reports every problem at once', () => {
    expect(fields(today, { hireDate: '2030-01-01', terminationDate: '2029-01-01', birthDate: '2027-01-01' })).toEqual(['birthDate', 'hireDate', 'terminationDate']);
  });

  it('uses the business-local day in America/Puerto_Rico for "today"', () => {
    // 2026-11-19T03:30Z is still Nov 18 in Puerto Rico (UTC-4): a Nov 19 birth date is in the future there.
    const local = businessDate(new Date('2026-11-19T03:30:00Z'), 'America/Puerto_Rico');
    expect(local).toBe('2026-11-18');
    expect(fields(local, { birthDate: '2026-11-19' })).toEqual(['birthDate']);
    expect(() => employmentDateErrors(EMPTY_EMPLOYMENT_DATES, 'not-a-date')).toThrow();
  });
});
