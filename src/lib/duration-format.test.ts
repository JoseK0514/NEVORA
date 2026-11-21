import {describe, expect, it} from '@rstest/core';
import {dateRange, dateRangeText, durationRow, durationSentence, durationTotal, minutesFromNanoseconds, relativeTimeText, timeRangeText} from './duration-format';

const MINUTE = BigInt(60_000_000_000);

describe('one duration format (BR-1)', () => {
  // The week from the Nov 14 inspection: 382 h 51 min, which four screens wrote four ways.
  const week = 382 * 60 + 51;
  it('writes the same minutes one way per use', () => {
    expect(durationRow(week)).toBe('382 h 51');
    expect(durationTotal(week)).toBe('383 h');
    expect(durationSentence(week)).toBe('382 h 51 min');
  });
  it('row figures: hours with two-digit minutes, whole hours bare, minutes alone under an hour', () => {
    expect(durationRow(32 * 60 + 12)).toBe('32 h 12');
    expect(durationRow(8 * 60 + 6)).toBe('8 h 06');
    expect(durationRow(120)).toBe('2 h');
    expect(durationRow(45)).toBe('45 min');
    expect(durationRow(0)).toBe('0 min');
    expect(durationRow(0, '0 h')).toBe('0 h');
  });
  it('totals: whole hours to the nearest, minutes under an hour, never "0 h" for recorded time', () => {
    expect(durationTotal(437 * 60)).toBe('437 h');
    expect(durationTotal(67 * 60 + 29)).toBe('67 h');
    expect(durationTotal(67 * 60 + 30)).toBe('68 h');
    expect(durationTotal(45)).toBe('45 min');
    expect(durationTotal(1)).toBe('1 min');
    expect(durationTotal(60)).toBe('1 h');
    expect(durationTotal(0)).toBe('0 h');
  });
  it('sentences: every unit named', () => {
    expect(durationSentence(90)).toBe('1 h 30 min');
    expect(durationSentence(480)).toBe('8 h');
    expect(durationSentence(45)).toBe('45 min');
    expect(durationSentence(0)).toBe('0 min');
  });
  it('drops seconds and reads a negative as zero', () => {
    expect(durationSentence(59.9)).toBe('59 min');
    expect(durationRow(-5)).toBe('0 min');
    expect(durationTotal(-5)).toBe('0 h');
  });
  it('reads whole minutes from nanoseconds, and nothing from a value that is not a count', () => {
    expect(minutesFromNanoseconds((BigInt(week) * MINUTE + BigInt(59_000_000_000)).toString())).toBe(week);
    expect(minutesFromNanoseconds(BigInt(90) * MINUTE)).toBe(90);
    expect(minutesFromNanoseconds('0')).toBe(0);
    expect(minutesFromNanoseconds('-60000000000')).toBeNull();
    expect(minutesFromNanoseconds('1.5')).toBeNull();
    expect(minutesFromNanoseconds('')).toBeNull();
    expect(minutesFromNanoseconds(BigInt(-1))).toBeNull();
  });
});

describe('date and time ranges', () => {
  it('names a span of days once per month and year', () => {
    expect(dateRangeText('2026-11-09', '2026-11-15')).toBe('Nov 9 – 15');
    expect(dateRangeText('2026-09-28', '2026-10-04')).toBe('Sep 28 – Oct 4');
    expect(dateRangeText('2026-12-28', '2027-01-03')).toBe('Dec 28, 2026 – Jan 3, 2027');
    expect(dateRangeText('2026-11-09', '2026-11-09')).toBe('Nov 9');
  });
  // Jose (Nov 21, 2026): "Nov 16–22" everywhere, and "Nov 30–Dec 6" across months: a closed en dash, no spaces.
  it('dateRange: one written form for a range of calendar dates', () => {
    expect(dateRange('2026-11-16', '2026-11-22')).toBe('Nov 16–22');
    expect(dateRange('2026-11-30', '2026-12-06')).toBe('Nov 30–Dec 6');
    expect(dateRange('2026-12-28', '2027-01-03')).toBe('Dec 28, 2026–Jan 3, 2027');
    expect(dateRange('2026-11-16', '2026-11-16')).toBe('Nov 16');
    // A week that ends on the 1st names both months.
    expect(dateRange('2026-11-25', '2026-12-01')).toBe('Nov 25–Dec 1');
    for (const range of [dateRange('2026-11-16', '2026-11-22'), dateRange('2026-11-30', '2026-12-06'), dateRange('2026-12-28', '2027-01-03')])
      expect(range).not.toMatch(/[\s\u00a0\u2009\u202f]–|–[\s\u00a0\u2009\u202f]/);
  });
  it('dateRange: years only as the caller shows them', () => {
    expect(dateRange('2026-12-28', '2027-01-03', {year: 'never'})).toBe('Dec 28–Jan 3');
    expect(dateRange('2026-11-16', '2026-11-22', {year: 'end'})).toBe('Nov 16–22, 2026');
    expect(dateRange('2026-11-30', '2026-12-06', {year: 'end'})).toBe('Nov 30–Dec 6, 2026');
    expect(dateRange('2026-12-28', '2027-01-03', {year: 'end'})).toBe('Dec 28, 2026–Jan 3, 2027');
    expect(dateRange('2026-11-16', '2026-11-16', {year: 'end'})).toBe('Nov 16, 2026');
    expect(dateRange('2026-11-16', '2026-11-22', {year: 'each'})).toBe('Nov 16, 2026–Nov 22, 2026');
  });
  it('dateRange: Spanish keeps its own order and month form', () => {
    expect(dateRange('2026-11-16', '2026-11-22', {locale: 'es-PR'})).toBe('16–22 nov');
    expect(dateRange('2026-11-30', '2026-12-06', {locale: 'es-PR'})).toBe('30 nov–6 dic');
    expect(dateRange('2026-12-28', '2027-01-03', {locale: 'es-PR'})).toBe('28 dic 2026–3 ene 2027');
    expect(dateRange('2026-11-16', '2026-11-16', {locale: 'es-PR'})).toBe('16 nov');
    expect(dateRange('2026-11-16', '2026-11-22', {locale: 'es-PR', year: 'each'})).toBe('16 nov 2026–22 nov 2026');
  });
  it('writes clock times in the zone given, with "now" for an open end', () => {
    const range = timeRangeText('2026-11-09T13:00:00Z', '2026-11-09T21:00:00Z', 'America/Puerto_Rico').replace(/ /g, ' ');
    expect(range).toBe('9:00 AM – 5:00 PM');
    expect(timeRangeText('2026-11-09T13:00:00Z', null, 'America/Puerto_Rico').replace(/ /g, ' ')).toBe('9:00 AM – now');
  });
});

describe('relative time', () => {
  const zone = 'America/Puerto_Rico', now = new Date('2026-11-14T16:00:00Z');
  it('counts minutes and hours inside the same day', () => {
    expect(relativeTimeText('2026-11-14T15:59:40Z', now, zone)).toBe('Just now');
    expect(relativeTimeText('2026-11-14T15:54:00Z', now, zone)).toBe('6 min ago');
    expect(relativeTimeText('2026-11-14T11:00:00Z', now, zone)).toBe('5 h ago');
  });
  it('names yesterday, then the weekday, then the date', () => {
    expect(relativeTimeText('2026-11-13T20:00:00Z', now, zone)).toBe('Yesterday');
    expect(relativeTimeText('2026-11-12T20:00:00Z', now, zone)).toBe('Thursday');
    expect(relativeTimeText('2026-10-19T20:00:00Z', now, zone)).toBe('Oct 19');
    expect(relativeTimeText('2025-12-30T20:00:00Z', now, zone)).toBe('Dec 30, 2025');
  });
  it('counts days in the zone given, not the reader’s', () => {
    // 02:30 UTC on Nov 14 is still the evening of Nov 13 in Puerto Rico and already Nov 14 in Madrid.
    const at = '2026-11-14T02:30:00Z';
    expect(relativeTimeText(at, now, zone)).toBe('Yesterday');
    expect(relativeTimeText(at, now, 'Europe/Madrid')).toBe('13 h ago');
  });
});
