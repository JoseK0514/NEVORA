import { describe, expect, it } from 'vitest';
import { formatBusinessClock, formatBusinessTimestamp, businessDate, businessTime, localDateTimeToInstant, shiftBoundaryInstants, formatBusinessDateTimeInput, formatBusinessDateTime, InvalidBusinessLocalTimeError } from './business-time';
import { durationMinutes, weekStartFor } from './date-utils';

describe('workspace business time', () => {
 it('uses the explicit zone at date and Monday boundaries', () => {
  const now = new Date('2026-10-04T01:30:00Z');
  expect(businessDate(now, 'America/Puerto_Rico')).toBe('2026-10-03');
  expect(businessDate(now, 'Asia/Tokyo')).toBe('2026-10-04');
  expect(businessTime(now, 'America/Puerto_Rico')).toBe('21:30');
  expect(weekStartFor(businessDate(new Date('2026-10-05T01:00:00Z'), 'America/New_York'))).toBe('2026-09-28');
 });
 it('converts and round trips an explicitly zoned deadline', () => {
  const iso = localDateTimeToInstant('2026-10-03T09:00', 'America/New_York');
  expect(iso).toBe('2026-10-03T13:00:00.000Z');
  expect(formatBusinessDateTimeInput(iso, 'America/New_York')).toBe('2026-10-03T09:00');
  expect(formatBusinessDateTimeInput(undefined, 'Asia/Tokyo')).toBe('');
  expect(formatBusinessDateTime(iso, 'America/New_York')).toBe('Oct 3, 9:00 AM');
 });
 it.each(['2026-03-08T02:30', '2026-11-01T01:30', '2026-02-30T09:00', '2026-10-03T24:00', '2026-10-03T09:00Z', '', '2026-10-03T09:00:00'])('rejects invalid or ambiguous deadline %s', local => {
  expect(() => localDateTimeToInstant(local, 'America/New_York')).toThrow(InvalidBusinessLocalTimeError);
 });
 it('rejects an invalid zone', () => expect(() => localDateTimeToInstant('2026-10-03T09:00', 'Invalid/Zone')).toThrow(InvalidBusinessLocalTimeError));
 it('normalizes overnight and end of day boundaries', () => {
  expect(shiftBoundaryInstants({date:'2026-10-03',startTime:'22:00',endTime:'02:00'},'America/New_York')).toEqual({startAt:'2026-10-04T02:00:00.000Z',endAt:'2026-10-04T06:00:00.000Z'});
  expect(shiftBoundaryInstants({date:'2026-10-03',startTime:'20:00',endTime:'24:00'},'America/New_York').endAt).toBe('2026-10-04T04:00:00.000Z');
  expect(shiftBoundaryInstants({date:'2026-10-03',startTime:'20:00',endDate:'2026-10-05',endTime:'01:00'},'America/New_York').endAt).toBe('2026-10-05T05:00:00.000Z');
 });
 it('keeps nominal planned hours across DST', () => {
  expect(durationMinutes('00:00','04:00')).toBe(240);
  expect(shiftBoundaryInstants({date:'2026-03-08',startTime:'00:00',endTime:'04:00'},'America/New_York')).toEqual({startAt:'2026-03-08T05:00:00.000Z',endAt:'2026-03-08T08:00:00.000Z'});
 });
 it.each([{date:'2026-11-01',startTime:'01:30',endTime:'04:00'},{date:'2026-03-08',startTime:'00:00',endTime:'02:30'},{date:'2026-02-30',startTime:'09:00',endTime:'10:00'},{date:'2026-10-03',startTime:'09:00',endTime:'09:00'}])('rejects unresolvable assignment boundaries', shift => expect(() => shiftBoundaryInstants(shift,'America/New_York')).toThrow(InvalidBusinessLocalTimeError));
});

it('formats the live clock with seconds in the configured zone', () => {
 expect(formatBusinessClock(new Date('2026-10-01T16:14:05Z'), 'America/Puerto_Rico')).toBe('12:14:05 PM');
 expect(formatBusinessClock(new Date('2026-10-01T16:14:05Z'), 'Asia/Tokyo')).toBe('01:14:05 AM');
});
it('formats publication timestamps in the configured zone', () => {
 expect(formatBusinessTimestamp('2026-10-01T16:14:05Z', 'America/Puerto_Rico')).toBe('Oct 1, 12:14 PM');
 expect(formatBusinessTimestamp('2026-10-01T16:14:05Z', 'Asia/Tokyo')).toBe('Oct 2, 1:14 AM');
});
it('keeps server and browser timestamps identical when ICU punctuation differs', () => {
 const original = Object.getOwnPropertyDescriptor(Intl.DateTimeFormat.prototype, 'format')!;
 Object.defineProperty(Intl.DateTimeFormat.prototype, 'format', { configurable: true, get: () => () => 'Oct 1 at 12:14 PM' });
 try {
  expect(formatBusinessTimestamp('2026-10-01T16:14:05Z', 'America/Puerto_Rico')).toBe('Oct 1, 12:14 PM');
 } finally { Object.defineProperty(Intl.DateTimeFormat.prototype, 'format', original); }
});
