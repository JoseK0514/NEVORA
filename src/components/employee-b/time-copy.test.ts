import {expect, it} from '@rstest/core';
import {TIME_COPY, timeCopy, timeWord} from './time-copy';

/* Signed-in Spanish (Nov 23, 2026): every word on the Employee Time screens has an English and a Spanish entry. */
const say = (value: unknown) => typeof value === 'function' ? (value as (...args: unknown[]) => string)('Condado', 'Ana R.', true) : typeof value === 'string' ? value : JSON.stringify(value);
const SAME = new Set(['statusWords', 'kinds', 'issues', 'tablet']);

it('has the same keys in English and Spanish, and no Spanish entry is empty or left in English', () => {
  const en = TIME_COPY.en, es = TIME_COPY.es;
  expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    expect(typeof es[key], key).toBe(typeof en[key]);
    expect(say(es[key]).trim(), key).not.toBe('');
    if (!SAME.has(key)) expect(say(es[key]), key).not.toBe(say(en[key]));
  }
  expect(timeCopy()).toBe(en);expect(timeCopy('es')).toBe(es);
});

it('translates every word the shared Time model writes, and keeps the copy rules', () => {
  for (const word of ['Approved', 'Finalized', 'Reopened', 'Needs review', 'In progress', 'Not approved yet', 'Waiting', 'Declined', 'Waiting for review'])
    expect(timeWord(TIME_COPY.es, 'statusWords', word), word).not.toBe(word);
  for (const word of ['Clock in and out', 'Break', 'Missed shift']) expect(timeWord(TIME_COPY.es, 'kinds', word)).not.toBe(word);
  expect(timeWord(TIME_COPY.en, 'statusWords', 'Approved')).toBe('Approved');
  expect(TIME_COPY.es.tablet('the Condado tablet')).toBe('la tableta de Condado');expect(TIME_COPY.es.tablet('the tablet where you work')).toBe('la tableta donde trabajas');
  expect(TIME_COPY.es.shifts(1)).toBe('1 turno');expect(TIME_COPY.es.shifts(3)).toBe('3 turnos');
  for (const lang of ['en', 'es'] as const) for (const [key, value] of Object.entries(TIME_COPY[lang]))
    expect(say(value), key).not.toMatch(/[!—]|\b(simply|just|seamlessly|successfully|oops|usted|su gerente)\b/i);
});
