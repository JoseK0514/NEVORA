import { expect, it } from '@rstest/core';
import { copy } from './page-copy';
import { scheduleWords } from '../schedule-copy';

const placeholders = (text: string) => [...new Set(text.match(/\{[A-Za-z]\w*\}/g) ?? [])].sort();

it('has matching keys and placeholders in both languages', () => {
  expect(Object.keys(copy.es).sort()).toEqual(Object.keys(copy.en).sort());
  const english: Record<string, string> = copy.en;
  for (const [key, spanish] of Object.entries(copy.es)) {
    expect(placeholders(spanish), key).toEqual(placeholders(english[key]));
  }
});

it('uses the compact Spanish button and retains the full action when publishing anyway', () => {
  const words = scheduleWords('es').publish;
  expect(words.publishChanges(false)).toBe('Publicar');
  expect(words.publishChanges(false)).toBe(copy.es.publishChanges);
  expect(words.publishChanges(true)).toBe(copy.es.publishChangesAnyway);
});

it.each(['en', 'es'] as const)('uses the approved short warning in %s while retaining the draft details', lang => {
  const words = scheduleWords(lang).publish;
  expect(words.publishAnywayShort).toBe(lang === 'en' ? 'Publish anyway' : 'Publicar aun así');
  expect(words.publishAnywayShort).toBe(copy[lang].publishAnywayShort);
  expect(words.publishDrafts(words.drafts(2), true, true)).toContain(words.drafts(2));
  expect(words.publishLocation('Calle Loíza', true)).toContain('Calle Loíza');
});
