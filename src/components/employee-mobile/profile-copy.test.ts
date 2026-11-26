import { expect, it } from '@rstest/core';
import { profileCopy } from './profile-copy';

it('has the same keys in both languages', () => {
  expect(Object.keys(profileCopy.es).sort()).toEqual(Object.keys(profileCopy.en).sort());
});

// Jose, Nov 26, 2026: the whole portal follows the account language now, so the hint says the same thing in both.
it('describes the language setting the same way in both languages', () => {
  expect(profileCopy.en.languageHint).toBe('Choose your account’s language.');
  expect(profileCopy.es.languageHint).toBe('Elige el idioma de tu cuenta.');
});
