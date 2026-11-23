import { describe, expect, it } from '@rstest/core';
import { TEAM_LIST_COPY } from './team-list-copy';

const keys = (value: unknown, path = ''): string[] => value && typeof value === 'object'
  ? Object.entries(value).flatMap(([key, item]) => keys(item, path ? `${path}.${key}` : key)) : [path];

describe('Team list copy', () => {
  it('has the same keys in English and Spanish', () => {
    expect(keys(TEAM_LIST_COPY.es).sort()).toEqual(keys(TEAM_LIST_COPY.en).sort());
  });
  it('keeps English and writes Spanish with the company word', () => {
    expect(TEAM_LIST_COPY.en.noMatch('employees', 'Ana')).toBe('No employees match “Ana”.');
    expect(TEAM_LIST_COPY.es.noMatch('empleados', 'Ana')).toBe('No hay empleados que coincidan con “Ana”.');
    expect(TEAM_LIST_COPY.es.inactiveOf('empleados')).toBe('Empleados inactivos');
    expect(TEAM_LIST_COPY.es.add('empleado')).toBe('Añadir empleado');
  });
});
