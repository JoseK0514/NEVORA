import {expect, it} from '@rstest/core';
import {EMPLOYEE_UPDATES_COPY, employeeUpdatesCopy} from './employee-updates-copy';

/* Signed-in Spanish (Nov 23, 2026): every word on Updates has an English and a Puerto Rico Spanish entry. */
const say = (value: unknown) => typeof value === 'function' ? (value as (n: number) => string)(2) : String(value);

it('has the same keys in English and Spanish, and no Spanish entry is empty or left in English', () => {
  const {en, es} = EMPLOYEE_UPDATES_COPY;
  expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    expect(typeof es[key], key).toBe(typeof en[key]);
    expect(say(es[key]).trim(), key).not.toBe('');
    expect(say(es[key]), key).not.toBe(say(en[key]));
  }
  expect(employeeUpdatesCopy()).toBe(en);expect(employeeUpdatesCopy('es')).toBe(es);
});

it('says a team update is an Aviso, in tú, with no exclamation marks or em dashes', () => {
  for (const [key, value] of Object.entries(EMPLOYEE_UPDATES_COPY.es)) {
    expect(say(value), key).not.toMatch(/[!¡—]|\busted\b|\bcomunicaci/i);
  }
  expect(EMPLOYEE_UPDATES_COPY.es.title).toBe('Avisos');expect(EMPLOYEE_UPDATES_COPY.es.signIn).toBe('Iniciar sesión');
  expect(EMPLOYEE_UPDATES_COPY.en.openingNote).toBe('Opening an update doesn’t confirm it.');
});
