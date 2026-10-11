import { expect, it } from 'vitest';
import { coverageRepairUrl, parseCoverageRepairLocator, reportedCoverageState, type CoverageRepairLocator } from './coverage-repair';

const locator: CoverageRepairLocator = {
  version: 1, weekStart: '2026-10-05', gapKey: 'loc-B|2026-10-05|08:00|12:00',
  locationId: 'loc-B', date: '2026-10-05', startTime: '08:00', endTime: '12:00',
  target: 'POSITION', positionId: 'barista',
  reported: { missingStaff: 2, requiresLead: true, positions: [{ positionId: 'barista', missing: 1 }, { positionId: 'cashier', missing: 1 }] },
};

it('retains the entire reported interval and deficits alongside the explicit chosen position', () => {
  const url = new URL(coverageRepairUrl(locator), 'http://localhost');
  expect(url.pathname).toBe('/app/schedule/coverage');
  expect(parseCoverageRepairLocator(url.searchParams.get('repair'))).toEqual(locator);
  expect(url.searchParams.get('locationId')).toBe('loc-B');
  expect(url.searchParams.get('start')).toBe('08:00');
  expect(url.searchParams.get('end')).toBe('12:00');
  expect(url.searchParams.get('positionId')).toBe('barista');
});

it.each(['STAFFING', 'LEAD', 'CHOOSE'] as const)('retains a %s target without inventing a position', target => {
  const value = { ...locator, target, positionId: undefined };
  expect(parseCoverageRepairLocator(JSON.stringify(value))).toEqual(value);
});

it('canonicalizes position deficits without losing simultaneous missing requirements', () => {
  expect(reportedCoverageState({ gap: 2, requiresLead: true, positionCoverage: [
    { positionId: 'cashier', missing: 1 }, { positionId: 'filled', missing: 0 }, { positionId: 'barista', missing: 2 },
  ] })).toEqual({ missingStaff: 2, requiresLead: true, positions: [{ positionId: 'barista', missing: 2 }, { positionId: 'cashier', missing: 1 }] });
});

it.each([
  { ...locator, version: 2 }, { ...locator, weekStart: '2026-10-06' }, { ...locator, date: '2026-10-12' },
  { ...locator, startTime: '25:00' }, { ...locator, endTime: '08:00' }, { ...locator, positionId: undefined },
  { ...locator, target: 'arbitrary' }, { ...locator, reported: { ...locator.reported, missingStaff: -1 } },
  { ...locator, reported: { ...locator.reported, positions: [{ positionId: 'barista', missing: 0 }] } },
])('rejects malformed review context %#', value => {
  expect(() => parseCoverageRepairLocator(JSON.stringify(value))).toThrow('Coverage changed');
});

it('preserves a midnight boundary instead of widening the interval', () => {
  const value = { ...locator, startTime: '20:00', endTime: '24:00' };
  expect(parseCoverageRepairLocator(JSON.stringify(value)).endTime).toBe('24:00');
});
