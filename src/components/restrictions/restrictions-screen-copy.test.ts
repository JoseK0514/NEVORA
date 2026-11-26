import { expect, it } from '@rstest/core';
import { restrictionsCopy } from './copy';
import { copy } from './restrictions-screen-copy';

it('preserves the English keys and placeholders for every revised agreement message', () => {
  expect(Object.keys(copy.es).sort()).toEqual(Object.keys(copy.en).sort());
  const placeholders = (value: string) => value.match(/\{\w+\}/g)?.sort() ?? [];
  for (const key of Object.keys(copy.en) as (keyof typeof copy.en)[]) {
    expect(placeholders(copy.es[key]), key).toEqual(placeholders(copy.en[key]));
    expect(copy.es[key], key).not.toMatch(/\b(usted|ustedes)\b/i);
  }
});

it('keeps the signed-in person, the approving manager and the requested dates distinct', () => {
  const es = restrictionsCopy('es');
  expect(es.legacyBodyEmployee).toBe(copy.es.legacyBodyEmployee);
  expect(es.reviewRequest('lunes')).toBe('Pides este horario desde la semana del lunes. Tu gerente decide. Nada cambia hasta que apruebe tu solicitud.');
  expect(es.lockedBody('7 dic', '14 dic')).toContain('La próxima semana que puedes elegir es la del 14 dic.');
  expect(es.deniedLocationsBody('Luz $&')).toContain('Luz $& trabaja en localidades que no administras.');
});
