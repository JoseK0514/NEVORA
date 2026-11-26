import {expect, it} from '@rstest/core';
import {REQUESTS_COPY, pillIn, requestsCopy, spanIn} from './requests-copy';

/* Signed-in Spanish: every word on Requests, Time off and Pick up and swap has an English and a Spanish entry. */
const say = (value: unknown) => typeof value === 'function' ? (value as (...args: unknown[]) => string)(3, '9:00 AM') : typeof value === 'object' ? JSON.stringify(value) : String(value);

it('has the same keys in English and Spanish, and no Spanish entry is left in English or empty', () => {
  const en = REQUESTS_COPY.en, es = REQUESTS_COPY.es;
  expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  expect(Object.keys(es.pills).sort()).toEqual(Object.keys(en.pills).sort());
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    expect(typeof es[key], key).toBe(typeof en[key]);
    expect(say(es[key]).trim(), key).not.toBe('');
    expect(say(es[key]), key).not.toBe(say(en[key]));
  }
  for (const [key, value] of Object.entries(en.pills)) { expect(value).toBe(key); expect(es.pills[key], key).not.toBe(key); }
  expect(requestsCopy()).toBe(en);expect(requestsCopy('es')).toBe(es);
});

it('follows the copy rules in both languages: no exclamation marks, no em dashes, tú not usted, the glossary', () => {
  for (const lang of ['en', 'es'] as const) for (const [key, value] of Object.entries(REQUESTS_COPY[lang])) {
    expect(say(value), key).not.toMatch(/[!¡—]|\b(simply|just|oops|usted|su gerente|tiempo libre)\b/i);
  }
  expect(REQUESTS_COPY.es.requestTimeOff).toBe('Pedir días libres');
  expect(REQUESTS_COPY.es.openShifts).toBe('Turnos disponibles');
  expect(REQUESTS_COPY.es.shiftRequests).toBe('Cambios de turno');
  expect(REQUESTS_COPY.es.cantWorkThisShift).toBe('No puedo trabajar este turno');
});

it('says the shared helpers’ chips, dates and lengths in Spanish and leaves English untouched', () => {
  expect(pillIn('Waiting', 'es')).toBe('En espera');expect(pillIn('Waiting')).toBe('Waiting');expect(pillIn('Unknown', 'es')).toBe('Unknown');
  expect(spanIn('Thu – Sat · All day · 3 days', 'es')).toBe('jue – sáb · Todo el día · 3 días');
  expect(spanIn('Part of day · 9:00 AM – 12:00 PM', 'es')).toBe('Parte del día · 9:00 a. m. – 12:00 p. m.');
  expect(spanIn('Nov 12–14', 'es')).toBe('12–14 nov');
  expect(spanIn('Thu – Sat · All day · 3 days')).toBe('Thu – Sat · All day · 3 days');
});
