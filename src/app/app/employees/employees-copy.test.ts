// Signed-in Spanish (es-rest): Team's own pages have a Spanish entry for every English one.
import {expect, it} from '@rstest/core';
import {EMPLOYEES_COPY, invitedDate} from './employees-copy';

const keyPaths = (value: unknown, prefix = ''): string[] => !value || typeof value !== 'object' ? [prefix]
  : Object.entries(value as Record<string, unknown>).flatMap(([key, inner]) => keyPaths(inner, prefix ? `${prefix}.${key}` : key)).sort();

it('has a Spanish entry for every English one', () => {
  expect(keyPaths(EMPLOYEES_COPY.es)).toEqual(keyPaths(EMPLOYEES_COPY.en));
});

it('writes the invitation date the voice guide way', () => {
  const at = new Date('2026-10-13T02:30:00Z');
  expect(invitedDate('es', at, 'America/Puerto_Rico')).toBe('12 oct');
  expect(invitedDate('en', at, 'America/Puerto_Rico')).toBe('Oct 12');
  expect(EMPLOYEES_COPY.es.invitedOn('12 oct')).toBe('Invitado el 12 oct, sin activar');
  expect(EMPLOYEES_COPY.en.invitedOn('Oct 12')).toBe('Invited Oct 12, not activated');
});
