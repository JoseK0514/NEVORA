import {expect, it} from '@rstest/core';
import {EMPLOYEE_SCHEDULE_COPY, employeeScheduleCopy} from './employee-schedule-copy';
import {unpublishedNote} from '../lib/publication-note';

/* Signed-in Spanish (Nov 23, 2026): every word on Schedule, the shift sheet, the weekly confirmation, the Requests card and
 * the scheduling fields has an English and a Puerto Rico Spanish entry. */
const say = (value: unknown): string => typeof value === 'function' ? String((value as (...args: unknown[]) => unknown)(2, 'x'))
  : typeof value === 'object' && value ? JSON.stringify(value) : String(value);
const sayState = (value: unknown, key: string) => key === 'emptyLabel' ? (value as (s: string) => string)('published') : key === 'unpublished' ? (value as (a: string[]) => string)(['Condado']) : say(value);

it('has the same keys in English and Spanish, and no Spanish entry is empty or left in English', () => {
  const {en, es} = EMPLOYEE_SCHEDULE_COPY;
  expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  expect(Object.keys(es.pill).sort()).toEqual(Object.keys(en.pill).sort());
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    expect(typeof es[key], key).toBe(typeof en[key]);
    expect(sayState(es[key], key).trim(), key).not.toBe('');
    expect(sayState(es[key], key), key).not.toBe(sayState(en[key], key));
  }
  for (const key of Object.keys(en.pill) as (keyof typeof en.pill)[]) expect(es.pill[key], key).not.toBe(en.pill[key]);
  expect(employeeScheduleCopy()).toBe(en);expect(employeeScheduleCopy('es')).toBe(es);
});

it('follows the copy rules in both languages: no exclamation marks, no em dashes in Spanish, tú, the glossary', () => {
  const {en, es} = EMPLOYEE_SCHEDULE_COPY;
  for (const [key, value] of Object.entries(es)) {
    const text = sayState(value, key);
    expect(text, key).not.toMatch(/[!¡—]/);
    expect(text, key).not.toMatch(/\b(usted|su gerente|tiempo libre|turnos? abiertos?)\b/i);
  }
  for (const [key, value] of Object.entries(en)) expect(sayState(value, key), key).not.toMatch(/!/);
  expect(es.openShifts).toBe('Turnos disponibles');expect(es.schedule).toBe('Horario');expect(es.shiftLead).toBe('Líder de turno');
  expect(es.requestTimeOff).toBe('Pedir días libres');expect(es.location).toBe('Localidad');
  // English is the lib's own sentence, word for word.
  expect(en.unpublished(['Condado'], ['Isla Verde'])).toBe(unpublishedNote(['Condado'], ['Isla Verde']));
  expect(es.unpublished(['Condado', 'Dorado'], ['Isla Verde'])).toBe('Tus turnos de Isla Verde están publicados. Condado y Dorado todavía no han publicado esta semana.');
  expect(en.shiftsNb(1)).toBe('1 shift');expect(es.shiftsNb(3)).toBe('3 turnos');
  expect(en.startsInMin(45)).toBe('Starts in 45 min');expect(es.startsInMin(45)).toBe('Empieza en 45 min');
  expect(es.startsInH(2).startsWith(es.startsPrefix)).toBe(true);expect(en.startsInH(2).startsWith(en.startsPrefix)).toBe(true);
});

it('stays safe for client components: no value import from a module that reads the database', async () => {
  const {readFileSync} = await import('node:fs');
  const source = readFileSync(new URL('./employee-schedule-copy.ts', import.meta.url), 'utf8');
  expect(source).not.toMatch(/^import \{[^}]*\} from '\.\.\/lib\/data\//m);
});
