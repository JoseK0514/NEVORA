import { expect, it } from '@rstest/core';
import { copy } from './payroll-runs-copy';

const placeholders = (text: string) => [...new Set(text.match(/\{[A-Za-z]\w*\}/g) ?? [])].sort();

it('has matching keys and placeholders in both languages', () => {
  expect(Object.keys(copy.es).sort()).toEqual(Object.keys(copy.en).sort());
  const english: Record<string, string> = copy.en;
  for (const [key, spanish] of Object.entries(copy.es)) {
    expect(placeholders(spanish), key).toEqual(placeholders(english[key]));
  }
});

it('keeps the short payroll back link distinct from the destination title', () => {
  expect(copy.en.backToRun).toBe(copy.en.payrollDetails);
  expect(copy.es.backToRun).toBe('Detalles');
  expect(copy.es.payrollDetails).toBe('Detalles de la nómina');
});
