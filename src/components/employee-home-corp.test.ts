import {expect, it} from 'vitest';
import {weekShiftAhead} from './employee-home-corp';

// Finding (Oct 31): Upcoming listed Friday's 10:00 AM – 6:00 PM shift at 7:45 PM the same evening.
it('a shift that already ended today is not upcoming; one still ahead or under way is', () => {
  const at = '2026-10-30T23:45:00Z'; // 7:45 PM in Puerto Rico
  const zone = 'America/Puerto_Rico';
  expect(weekShiftAhead({date: '2026-10-30', startTime: '10:00', endTime: '18:00'}, at, zone)).toBe(false);
  expect(weekShiftAhead({date: '2026-10-30', startTime: '16:00', endTime: '22:00'}, at, zone)).toBe(true);
  expect(weekShiftAhead({date: '2026-10-31', startTime: '08:00', endTime: '16:00'}, at, zone)).toBe(true);
  expect(weekShiftAhead({date: '2026-10-30', startTime: '22:00', endTime: '06:00'}, at, zone)).toBe(true);
  expect(weekShiftAhead({date: '2026-10-29', startTime: '22:00', endTime: '06:00'}, at, zone)).toBe(false);
  expect(weekShiftAhead({date: '2026-10-30', startTime: '18:00', endTime: '24:00'}, at, zone)).toBe(true);
});
