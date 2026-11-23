import {expect, it} from '@rstest/core';
import {EMPLOYEE_HOME_COPY, employeeHomeCopy} from './employee-home-copy';

/* Signed-in Spanish (Nov 23, 2026): every word on the Employee and Lead Home has an English and a Spanish entry. */
const call = (fn: (...args: unknown[]) => unknown) => { try { return String(fn('3', 'Barista', 'x', 'y')); } catch { return String(fn(['Condado'], ['Isla Verde'])); } };
const say = (value: unknown): string => typeof value === 'function' ? call(value as (...args: unknown[]) => unknown)
  : typeof value === 'object' && value ? Object.values(value).map(say).join('|') : String(value);
// Words that read the same in both languages.
const same = new Set(['greet', 'label']);

it('has the same keys in English and Spanish, and no Spanish entry is empty or left in English', () => {
  const {en, es} = EMPLOYEE_HOME_COPY;
  expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  expect(Object.keys(es.sources).sort()).toEqual(Object.keys(en.sources).sort());
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    expect(typeof es[key], key).toBe(typeof en[key]);
    expect(say(es[key]).trim(), key).not.toBe('');
    if (!same.has(key)) expect(say(es[key]), key).not.toBe(say(en[key]));
  }
  expect(employeeHomeCopy()).toBe(en);expect(employeeHomeCopy('es')).toBe(es);
});

it('follows the copy rules in Spanish: no exclamation marks, no em dashes, the glossary words', () => {
  for (const value of Object.values(EMPLOYEE_HOME_COPY.es)) expect(say(value)).not.toMatch(/[!¡—]|tiempo libre|\busted\b/i);
  const es = EMPLOYEE_HOME_COPY.es;
  expect(es.sources.timeOff).toBe('Días libres');expect(es.shiftLead).toBe('Líder de turno');expect(es.signIn).toBe('Iniciar sesión');
  expect(es.until('3:00 p. m.')).toBe('Hasta las 3:00 p. m.');expect(es.until('1:00 p. m.')).toBe('Hasta la 1:00 p. m.');
});

it('writes the server’s Home row labels in Spanish and leaves unknown ones as they came', () => {
  const {label} = EMPLOYEE_HOME_COPY.es;
  expect(label('Schedule updated — review required')).toBe('Horario actualizado · requiere revisión');
  expect(label('Schedule removed — review unavailable')).toBe('Turno quitado del horario · revisión no disponible');
  expect(label('Swap approved')).toBe('Cambio aprobado');expect(label('Coverage declined')).toBe('Cobertura rechazada');
  expect(label('Time off approved · Dec 7–9, 2026')).toBe('Días libres aprobados · 7–9 dic 2026');
  expect(label('Time off waiting · Dec 28, 2026–Jan 3, 2027')).toBe('Días libres en espera · 28 dic 2026–3 ene 2027');
  expect(label('Time correction waiting')).toBe('Corrección de tiempo en espera');
  expect(label('Review update: Holiday hours')).toBe('Revisar aviso: Holiday hours');
  expect(label('Something new')).toBe('Something new');
  expect(EMPLOYEE_HOME_COPY.en.label('Swap approved')).toBe('Swap approved');
  expect(EMPLOYEE_HOME_COPY.es.unpublishedNote(['Condado', 'Isla Verde'], ['Old San Juan'])).toBe('Tus turnos de Old San Juan están publicados. Condado y Isla Verde todavía no han publicado esta semana.');
});
