import { expect, it } from '@rstest/core';
import { copy } from './team-live-copy';
import { TEAM_COPY } from './team-copy';

const placeholders = (text: string) => [...new Set(text.match(/\{[A-Za-z]\w*\}/g) ?? [])].sort();

it('has matching keys and placeholders in both languages', () => {
  expect(Object.keys(copy.es).sort()).toEqual(Object.keys(copy.en).sort());
  const english: Record<string, string> = copy.en;
  for (const [key, spanish] of Object.entries(copy.es)) {
    expect(placeholders(spanish), key).toEqual(placeholders(english[key]));
  }
});

it('lets the Spanish start status wrap before the time and keeps the time together', () => {
  expect(TEAM_COPY.es.starts('2:00 PM')).toBe('Empieza 2:00\u00a0p.\u00a0m.');
  expect(TEAM_COPY.es.starts('7:15 AM')).toBe('Empieza 7:15\u00a0a.\u00a0m.');
  expect(TEAM_COPY.en.starts('2:00 PM')).toBe('Starts 2:00 PM');
});
