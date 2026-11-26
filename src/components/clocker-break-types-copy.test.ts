import { expect, it } from '@rstest/core';
import { BREAK_TYPES_COPY, copy } from './clocker-break-types-copy';

const placeholders = (text: string) => [...new Set(text.match(/\{[A-Za-z]\w*\}/g) ?? [])].sort();

it('has matching keys and placeholders in both languages', () => {
  expect(Object.keys(copy.es).sort()).toEqual(Object.keys(copy.en).sort());
  const english: Record<string, string> = copy.en;
  for (const [key, spanish] of Object.entries(copy.es)) {
    expect(placeholders(spanish), key).toEqual(placeholders(english[key]));
  }
});

it('agrees with the number shown and the total number of break types independently', () => {
  const { showing } = BREAK_TYPES_COPY.es;
  expect(showing(1, 1)).toBe('Se muestra 1 de 1 tipo de descanso');
  expect(showing(1, 2)).toBe('Se muestra 1 de 2 tipos de descanso');
  expect(showing(0, 1)).toBe('Se muestran 0 de 1 tipo de descanso');
  expect(showing(2, 2)).toBe('Se muestran 2 de 2 tipos de descanso');
});

it('keeps the full Spanish break-type action and the short visible label', () => {
  expect(BREAK_TYPES_COPY.es.compactAdd).toBe('Añadir');
  expect(BREAK_TYPES_COPY.es.add).toBe('Añadir tipo de descanso');
  expect(BREAK_TYPES_COPY.en.compactAdd).toBe(BREAK_TYPES_COPY.en.add);
});
