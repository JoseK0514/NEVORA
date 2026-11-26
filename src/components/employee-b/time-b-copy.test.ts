import { expect, it } from '@rstest/core';
import { copy } from './time-b-copy';

const placeholders = (text: string) => [...new Set(text.match(/\{[A-Za-z]\w*\}/g) ?? [])].sort();

it('has matching keys and placeholders in both languages', () => {
  expect(Object.keys(copy.es).sort()).toEqual(Object.keys(copy.en).sort());
  const english: Record<string, string> = copy.en;
  for (const [key, spanish] of Object.entries(copy.es)) {
    expect(placeholders(spanish), key).toEqual(placeholders(english[key]));
  }
});

it('keeps the in-progress count readable for one or more shifts', () => {
  expect(copy.es.countSoFar.replace('{count}', '1 turno')).toBe('Llevas 1 turno');
  expect(copy.es.countSoFar.replace('{count}', '2 turnos')).toBe('Llevas 2 turnos');
});
