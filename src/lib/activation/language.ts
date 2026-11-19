import { isAuthLang, type AuthLang } from '../auth-copy';

export type UserLanguage = {
  state: 'ready';
  savedLanguage: AuthLang | null;
  language: AuthLang;
};

export function resolveUserLanguage(savedLanguage: AuthLang | null, fallback: AuthLang): UserLanguage {
  return { state: 'ready', savedLanguage, language: savedLanguage ?? fallback };
}

export function parseLanguagePreference(input: unknown): AuthLang | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null;
  if (Object.keys(input).length !== 1 || !('language' in input)) return null;
  return isAuthLang(input.language) ? input.language : null;
}
