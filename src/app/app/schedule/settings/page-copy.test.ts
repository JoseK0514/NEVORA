import { expect, it } from '@rstest/core';
import { copy } from './page-copy';

const placeholders = (text: string) => [...new Set(text.match(/\{[A-Za-z]\w*\}/g) ?? [])].sort();

it('has matching keys and placeholders in both languages', () => {
  expect(Object.keys(copy.es).sort()).toEqual(Object.keys(copy.en).sort());
  const english: Record<string, string> = copy.en;
  for (const [key, spanish] of Object.entries(copy.es)) {
    expect(placeholders(spanish), key).toEqual(placeholders(english[key]));
  }
});

it('keeps each Spanish clock time on one line', () => {
  const times = Object.values(copy.es).flatMap(text =>
    [...text.matchAll(/\b\d{1,2}:\d{2}\s+[ap]\.\s*m\./g)].map(match => match[0]),
  );
  expect(times.length).toBeGreaterThan(0);
  for (const time of times) expect(time).toMatch(/^\d{1,2}:\d{2}\u00a0[ap]\.\u00a0m\.$/);
});
