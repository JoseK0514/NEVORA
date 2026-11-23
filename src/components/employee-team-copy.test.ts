import {expect, it} from '@rstest/core';
import {EMPLOYEE_TEAM_COPY, employeeTeamCopy} from './employee-team-copy';

/* Signed-in Spanish: the Team directory, person sheets and account panel have every sentence in both languages. */
const say = (value: unknown): string => typeof value === 'function' ? (value as (...args: unknown[]) => string)(3, 2, 'Sam') : typeof value === 'object' ? JSON.stringify(value) : String(value);
// Words that are the same in both languages.
const SAME = new Set<string>(['countOf']);

it('has the same keys in English and Spanish, and no Spanish entry is empty or left in English', () => {
  const {en, es} = EMPLOYEE_TEAM_COPY;
  expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    expect(typeof es[key], key).toBe(typeof en[key]);
    if (typeof en[key] === 'object') expect(Object.keys(es[key] as object).sort(), key).toEqual(Object.keys(en[key] as object).sort());
    expect(say(es[key]).trim(), key).not.toBe('');
    if (!SAME.has(key)) expect(say(es[key]), key).not.toBe(say(en[key]));
  }
  expect(employeeTeamCopy()).toBe(en);expect(employeeTeamCopy('es')).toBe(es);
});

it('follows the copy rules in Spanish: no exclamation marks, no em dashes, tú', () => {
  for (const [key, value] of Object.entries(EMPLOYEE_TEAM_COPY.es)) {
    const text = say(value);
    expect(text, key).not.toMatch(/[!¡—]/);
    expect(text, key).not.toMatch(/\b(usted|su gerente le)\b/i);
  }
  expect(EMPLOYEE_TEAM_COPY.es.roles.OWNER).toBe('Dueño');
  expect(EMPLOYEE_TEAM_COPY.en.savedTitle('')).toBe('Employee’s details saved');
});
