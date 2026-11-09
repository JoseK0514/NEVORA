import {expect, it} from 'vitest';
import {timeOffDetail} from './employee-requests-corp';

it('names a time-off request’s whole range and length (Codex A1)', () => {
  expect(timeOffDetail({startDate: '2026-11-11', endDate: '2026-11-12'})).toBe('Nov 11 – 12 · 2 days');
  expect(timeOffDetail({startDate: '2026-10-30', endDate: '2026-11-02', startTime: null, endTime: null})).toBe('Oct 30 – Nov 2 · 4 days');
  expect(timeOffDetail({startDate: '2026-11-13', endDate: '2026-11-13'})).toBe('Fri, Nov 13 · All day');
  expect(timeOffDetail({startDate: '2026-11-13', endDate: '2026-11-13', startTime: '09:00', endTime: '13:00'})).toBe('Fri, Nov 13 · Part of day');
  expect(timeOffDetail({startDate: '2026-12-31', endDate: '2027-01-01'})).toBe('Dec 31 – Jan 1 · 2 days');
});
