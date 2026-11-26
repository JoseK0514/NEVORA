import {expect, it} from '@rstest/core';
import {esAllDay, esDate, esTime} from './es-format';

/* Signed-in Spanish (Nov 23, 2026): values formatted in English by a page, rewritten in the voice.md Spanish forms. */
it('rewrites times and keeps English untouched', () => {
  expect(esTime('7:00 AM – 3:00 PM')).toBe('7:00 a.\u00a0m. – 3:00 p.\u00a0m.');
  expect(esTime('12 PM')).toBe('12 p.\u00a0m.');
  expect(esTime('7:00 AM')).toBe('7:00 a.\u00a0m.');
  expect(esTime('7:00 AM – 3:00 PM', 'en')).toBe('7:00 AM – 3:00 PM');
  expect(esDate('Mon, Dec 7', 'en')).toBe('Mon, Dec 7');
});

it('rewrites dates, ranges and day words', () => {
  expect(esDate('Mon, Dec 7')).toBe('lun, 7 dic');
  expect(esDate('Dec 7 – 13')).toBe('7–13 dic');
  expect(esDate('Dec 7–13')).toBe('7–13 dic');
  // A value kept whole (keepWhole's no-break spaces) stays whole.
  expect(esDate('Nov\u00a016–22')).toBe('16–22\u00a0nov');expect(esDate('Fri,\u00a0Nov\u00a020')).toBe('vie,\u00a020\u00a0nov');
  expect(esDate('Dec 28 – Jan 3, 2027')).toBe('28 dic – 3 ene 2027');
  expect(esDate('Sep 28 – Oct 4, 2026')).toBe('28 sep – 4 oct 2026');
  expect(esDate('Wednesday, December 9')).toBe('miércoles, 9 de diciembre');
  expect(esDate('Today · 9 AM – 5 PM')).toBe('Hoy · 9 a.\u00a0m. – 5 p.\u00a0m.');
  expect(esDate('Tomorrow')).toBe('Mañana');expect(esDate('Thursday')).toBe('jueves');
  // Names and places pass through.
  expect(esDate('Calle Loíza · Barista')).toBe('Calle Loíza · Barista');
  expect(esAllDay('All day')).toBe('Todo el día');expect(esAllDay('All day', 'en')).toBe('All day');
});
