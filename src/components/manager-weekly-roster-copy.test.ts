import { expect, it } from '@rstest/core';
import { copy } from './manager-weekly-roster-copy';

const placeholders = (text: string) => [...new Set(text.match(/\{[A-Za-z]\w*\}/g) ?? [])].sort();

it('has matching keys and placeholders in both languages', () => {
  expect(Object.keys(copy.es).sort()).toEqual(Object.keys(copy.en).sort());
  const english: Record<string, string> = copy.en;
  for (const [key, spanish] of Object.entries(copy.es)) {
    expect(placeholders(spanish), key).toEqual(placeholders(english[key]));
  }
  // The grid has a shorter visible label. Its spoken name and the week legend use the full term.
  expect(copy.es.gridPeopleOne).toBe('{scheduledCount} pers. · {totalMinutes}');
  expect(copy.es.gridPeopleOther).toBe('{scheduledCount} pers. · {totalMinutes}');
  expect(copy.es.scheduledPeopleOne).toContain('persona ·');
  expect(copy.es.scheduledPeopleOther).toContain('personas ·');
  expect(copy.es.gridOpenShifts).toBe('Disponibles');
  expect(copy.es.openCountOne).toBe('{dayOpenShiftsCount} disp.');
  expect(copy.es.openCountOther).toBe('{dayOpenShiftsCount} disp.');
  expect(copy.es.openShifts).toBe('Turnos disponibles');
  expect(copy.es.spokenOpenCountOne).toContain('turno disponible');
  expect(copy.es.spokenOpenCountOther).toContain('turnos disponibles');
});
