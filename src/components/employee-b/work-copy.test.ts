import {expect, it} from '@rstest/core';
import {WORK_COPY, workCopy} from './work-copy';

/* Phase 4: every new sentence on the Employee and Lead work screens has an English and a Spanish entry. */
const say = (value: unknown) => typeof value === 'function' ? (value as (...args: unknown[]) => string)('9 AM – 5 PM', 'Main Office') : String(value);

it('has the same keys in English and Spanish, and no Spanish entry is left in English or empty', () => {
  const en = WORK_COPY.en, es = WORK_COPY.es;
  expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    expect(typeof es[key], key).toBe(typeof en[key]);
    expect(say(es[key]).trim(), key).not.toBe('');
    expect(say(es[key]), key).not.toBe(say(en[key]));
  }
  expect(workCopy()).toBe(en);expect(workCopy('es')).toBe(es);
});

it('follows the copy rules: sentence case, no exclamation marks, no em dashes, no filler', () => {
  for (const lang of ['en', 'es'] as const) for (const [key, value] of Object.entries(WORK_COPY[lang])) {
    const text = say(value);
    expect(text, key).not.toMatch(/[!—]|\b(simply|just|seamlessly|successfully|oops)\b/i);
  }
  expect(WORK_COPY.en.shiftEnded('9 AM – 5 PM', 'Main Office')).toBe('Your 9 AM – 5 PM shift has ended. Clock out on the Main Office tablet.');
  expect(WORK_COPY.es.shiftEnded('9 AM – 5 PM', 'Main Office')).toBe('Tu turno de 9 AM – 5 PM terminó. Registra tu salida en la tableta de Main Office.');
  expect(WORK_COPY.en.leadAll(3)).toBe('You lead all 3');expect(WORK_COPY.es.leadAll(3)).toBe('Lideras los 3');
  // Phase 9: your own clock state once a shift has started with no punch, with how long.
  expect(WORK_COPY.en.notClockedInFor('12 min')).toBe('Not clocked in · 12 min');expect(WORK_COPY.es.notClockedInFor('12 min')).toBe('Sin registrar entrada · 12 min');
});
