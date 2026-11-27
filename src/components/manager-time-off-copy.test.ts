import { expect, it } from '@rstest/core';
import { copy, managerTimeOffCopy } from './manager-time-off-copy';

const placeholders = (text: string) => [...new Set(text.match(/\{[A-Za-z]\w*\}/g) ?? [])].sort();

it('has matching keys and placeholders in both languages', () => {
  expect(Object.keys(copy.es).sort()).toEqual(Object.keys(copy.en).sort());
  const english: Record<string, string> = copy.en;
  for (const [key, spanish] of Object.entries(copy.es)) {
    expect(placeholders(spanish), key).toEqual(placeholders(english[key]));
  }
});


it('explains where the employee can check a decision without promising delivery', () => {
  expect(managerTimeOffCopy.en.notified).toBe("{name} can check your decision in Time off. A notification may arrive later.");
  expect(managerTimeOffCopy.es.notified).toBe("{name} puede ver tu decisión en Días libres. El aviso puede llegar después.");
});
