import {expect, it} from '@rstest/core';
import {SHIFT_AVAILABILITY_COPY, shiftAvailabilityNotice} from './shift-availability-copy';
it('keeps English notices and their punctuation byte-for-byte', () => {
  for (const value of Object.values(SHIFT_AVAILABILITY_COPY.en)) expect(shiftAvailabilityNotice(value, 'en')).toBe(value);
});
it('uses the approved Spanish restriction and translates every known approval notice', () => {
  expect(Object.keys(SHIFT_AVAILABILITY_COPY.en)).toEqual(Object.keys(SHIFT_AVAILABILITY_COPY.es));
  for (const key of Object.keys(SHIFT_AVAILABILITY_COPY.en) as (keyof typeof SHIFT_AVAILABILITY_COPY.en)[]) expect(shiftAvailabilityNotice(SHIFT_AVAILABILITY_COPY.en[key], 'es')).toBe(SHIFT_AVAILABILITY_COPY.es[key]);
  expect(shiftAvailabilityNotice('Not available under the current rules.', 'es')).toBe('Las reglas actuales no permiten este cambio.');
});
