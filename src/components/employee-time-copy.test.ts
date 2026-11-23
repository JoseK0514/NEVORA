import {expect, it} from '@rstest/core';
import {EMPLOYEE_TIME_COPY, employeeTimeCopy} from './employee-time-copy';

/* Signed-in Spanish: every word on the Employee Time panel and its corrections has an English and a Spanish entry. */
const say = (value: unknown) => typeof value === 'function' ? (value as (...args: unknown[]) => string)(3, 7) : String(value);
const SAME: string[] = [];

it('has the same keys in English and Spanish, and no Spanish entry is empty or left in English', () => {
  const en = EMPLOYEE_TIME_COPY.en, es = EMPLOYEE_TIME_COPY.es;
  expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    expect(typeof es[key], key).toBe(typeof en[key]);
    expect(say(es[key]).trim(), key).not.toBe('');
    if (!SAME.includes(key)) expect(say(es[key]), key).not.toBe(say(en[key]));
  }
  expect(employeeTimeCopy()).toBe(en);expect(employeeTimeCopy('es')).toBe(es);
});

it('follows the copy rules and the glossary', () => {
  for (const lang of ['en', 'es'] as const) for (const [key, value] of Object.entries(EMPLOYEE_TIME_COPY[lang])) {
    expect(say(value), key).not.toMatch(/[!—]|\b(simply|just|seamlessly|successfully|oops)\b/i);
  }
  const es = EMPLOYEE_TIME_COPY.es;
  expect(es.clockedIn).toBe('En turno');expect(es.timecards).toBe('Tarjetas de tiempo');
  expect(es.noPunchesToday).toContain('marcaciones');
  expect(Object.values(es).map(v => say(v)).join(' ')).not.toMatch(/\busted\b|\bsu (tiempo|sesión|gerente)\b/i);
  expect(es.zone('Puerto Rico')).toBe('Hora de Puerto Rico');
});
