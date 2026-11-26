import { expect, it } from '@rstest/core';
import { copy } from './creation-view-copy';
import { creationViewCopy } from './copy/creation-view';

const placeholders = (text: string) => [...new Set(text.match(/\{[A-Za-z]\w*\}/g) ?? [])].sort();

it('has matching keys and placeholders in both languages', () => {
  expect(Object.keys(copy.es).sort()).toEqual(Object.keys(copy.en).sort());
  const english: Record<string, string> = copy.en;
  for (const [key, spanish] of Object.entries(copy.es)) {
    expect(placeholders(spanish), key).toEqual(placeholders(english[key]));
  }
});

it('keeps the approved Spanish transportation reason and its stored value together', () => {
  expect(creationViewCopy.es.reasons.TRANSPORTATION).toBe('Transporte');
  expect(creationViewCopy.es.reasons.TRANSPORTATION).toBe(copy.es.transportation);
});
