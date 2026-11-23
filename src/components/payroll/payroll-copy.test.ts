import { describe, expect, it } from '@rstest/core';
import { payrollCopy, payrollCopyFor } from './payroll-copy';

/** Every leaf of a copy table with its path: strings, string lists and the functions that build a sentence. */
function leaves(value: unknown, path = ''): [string, unknown][] {
  if (typeof value === 'string' || typeof value === 'function') return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((item, index) => leaves(item, `${path}[${index}]`));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, item]) => leaves(item, path ? `${path}.${key}` : key));
  return [[path, value]];
}

describe('payroll copy table', () => {
  const en = new Map(leaves(payrollCopy.en)), es = new Map(leaves(payrollCopy.es));

  it('has the same keys in English and Spanish', () => {
    expect([...es.keys()].sort()).toEqual([...en.keys()].sort());
  });

  it('pairs each sentence builder with one of the same arity', () => {
    for (const [path, value] of en) {
      if (typeof value !== 'function') continue;
      expect(typeof es.get(path), path).toBe('function');
      expect((es.get(path) as (...args: unknown[]) => unknown).length, path).toBe(value.length);
    }
  });

  it('has no empty strings in either language', () => {
    for (const [path, value] of [...en, ...es]) if (typeof value === 'string') expect(value.trim(), path).not.toBe('');
  });

  it('writes the Spanish with no exclamation marks and no English role words', () => {
    for (const [path, value] of es) {
      if (typeof value !== 'string') continue;
      expect(value, path).not.toMatch(/[!¡]/);
      expect(value, path).not.toMatch(/\b(Owner|Payroll|Timecards?|Pay statements?)\b/);
    }
  });

  it('falls back to English for an unknown language', () => {
    expect(payrollCopyFor('xx' as 'en')).toBe(payrollCopy.en);
    expect(payrollCopyFor('es')).toBe(payrollCopy.es);
  });
});
