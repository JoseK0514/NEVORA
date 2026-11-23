import { describe, expect, it } from '@rstest/core';
import { CHRISTMAS_BONUS_COPY } from './christmas-bonus-copy';

/** Every key path of the copy table, with each function called on sample arguments. */
function leaves(value: unknown, path = ''): [string, string][] {
  if (typeof value === 'string') return [[path, value]];
  if (typeof value === 'function') return [[path, String((value as (...args: unknown[]) => unknown)(...(/days|yearLabel|unfinalized/.test(path) ? [2026, 3] : ['8 h', '700'])))]];
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([key, item]) => leaves(item, path ? `${path}.${key}` : key));
  return [[path, String(value)]];
}
// The same in both languages: the locale (a code) and "ID <id>" (ID is a proper noun in both).
const SAME = new Set(['locale', 'id']);

describe('Christmas bonus copy (Rondo Spanish, G98)', () => {
  it('has the same keys in English and Spanish', () => {
    expect(leaves(CHRISTMAS_BONUS_COPY.es).map(([path]) => path)).toEqual(leaves(CHRISTMAS_BONUS_COPY.en).map(([path]) => path));
  });
  it('writes every value in both languages, and no Spanish value is left in English', () => {
    const en = new Map(leaves(CHRISTMAS_BONUS_COPY.en));
    for (const [path, words] of leaves(CHRISTMAS_BONUS_COPY.es)) {
      expect(words.trim().length, path).toBeGreaterThan(0);
      expect(en.get(path)?.trim().length, path).toBeGreaterThan(0);
      if (!SAME.has(path)) expect(words, path).not.toBe(en.get(path));
    }
  });
  it('keeps Jose’s approved disclaimer word for word, and says "bono de Navidad" in Spanish', () => {
    expect(CHRISTMAS_BONUS_COPY.en.disclaimer).toBe('Informational only. Christmas bonus eligibility, amounts and exemptions depend on employer size and Puerto Rico law. Confirm with your payroll provider or counsel before paying.');
    expect(CHRISTMAS_BONUS_COPY.es.disclaimer).toContain('bono de Navidad');
    expect(CHRISTMAS_BONUS_COPY.es.disclaimer.split(/(?<=\.) /)[0]).toBe('Solo informativo.');
    expect(CHRISTMAS_BONUS_COPY.es.unfinalized(1, 1)).toBe('1 persona tiene tiempo registrado en 1 día que todavía no está en una tarjeta de tiempo finalizada.');
  });
});
