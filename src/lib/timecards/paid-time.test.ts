import { expect, it } from 'vitest';
import { projectTimecard } from './project';
import { breakIsPaid, entryPaidSeconds, hoursText, paidSeconds } from './paid-time';
import { mealWarningText, mealWarningsOf } from './meal-warnings';

const period = { startDate: '2026-09-21', endDate: '2026-09-27' };
const meal = { id: 'b1', name: 'Meal', startAt: '2026-09-22T16:00:00Z', endAt: '2026-09-22T17:00:00Z', rawStartAt: '2026-09-22T16:00:00Z', rawEndAt: '2026-09-22T17:00:00Z', adjustmentId: null };
const entry = { id: 'e1', locationId: 'l', locationName: 'Main Office', positionId: null, positionName: null, sourceKind: 'RECORDED', adjustmentId: null, recordedVersion: 1,
  startAt: '2026-09-22T12:00:00Z', endAt: '2026-09-22T22:00:00Z', rawStartAt: '2026-09-22T12:00:00Z', rawEndAt: '2026-09-22T22:00:00Z', breaks: [meal] };
const card = (entries: unknown[]) => projectTimecard({ ...period, employeeId: 'E1', employeeName: 'Fictional', timeZone: 'America/Puerto_Rico', pendingCorrections: 0, entries, corrections: [] }, '2026-09-29T12:00:00Z');

it('paid time is elapsed time minus unpaid breaks (business P0-3)', () => {
  const c = card([entry]);
  expect(c.recordedNanoseconds).toBe(String(10 * 3600 * 1e9));
  expect(paidSeconds(c)).toBe(9 * 3600);
  expect(hoursText(paidSeconds(c))).toBe('9 h');
});
it('a break marked paid, or a rest break, stays paid', () => {
  expect(breakIsPaid({ ...meal, paid: true } as never)).toBe(true);
  expect(breakIsPaid({ ...meal, category: 'REST' } as never)).toBe(true);
  expect(breakIsPaid(meal as never)).toBe(false);
  const c = card([entry]);
  expect(entryPaidSeconds(c, { ...c.entries[0], breaks: [{ ...c.entries[0].breaks[0], paid: true } as never] })).toBe(10 * 3600);
});
it('prefers the server figure and ignores a malformed one', () => {
  const c = card([entry]);
  expect(paidSeconds(c, { paidSeconds: 3600 })).toBe(3600);
  expect(paidSeconds(c, { paidSeconds: -5 })).toBe(9 * 3600);
  expect(paidSeconds(c, { paidSeconds: 'x' })).toBe(9 * 3600);
});
it('reads meal warnings defensively and words them as Jose approved', () => {
  const warnings = mealWarningsOf([{ date: '2026-09-22', kind: 'NO_MEAL_5H' }, { date: '2026-09-23', kind: 'MEAL_TOO_SHORT', minutes: 20 }, { date: 'x', kind: 'NO_MEAL_5H' }, null, { date: '2026-09-24', kind: 'OTHER' }]);
  expect(warnings.map(mealWarningText)).toEqual(['No meal break in the first 5 hours', 'Meal break was 20 min']);
  expect(mealWarningsOf(undefined)).toEqual([]);
});
