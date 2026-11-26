import { expect, it } from '@rstest/core';
import { wholeSpanishTimes } from './whole-spanish-times';
import { formatPortalCopy } from './format-portal-copy';

it('keeps the digits and meridiem together and leaves the range breakable', () => {
  expect(wholeSpanishTimes('6:00 AM – 2:00 p. m.')).toBe('6:00\u00a0a.\u00a0m. – 2:00\u00a0p.\u00a0m.');
  expect(wholeSpanishTimes('7 nov, 11:00\u202fp.\u00a0m.')).toBe('7 nov, 11:00\u00a0p.\u00a0m.');
});

it('keeps names and file labels containing braces and replacement characters intact', () => {
  expect(formatPortalCopy('{name} · {date}', { name: '$& {date}', date: '7 dic' })).toBe('$& {date} · 7 dic');
});
