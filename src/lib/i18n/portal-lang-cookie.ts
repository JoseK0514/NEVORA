/** Signed-in document language on first render (branch audit, Nov 26, 2026). The person's saved language decides the
 * portal's language (readPortalLanguage, then PortalLangProvider). The public root layout has no session proof to read
 * it, so the provider leaves this hint, holding only 'en' or 'es', and the root reads it for a signed-in request. Then a
 * Spanish person's page arrives as <html lang="es"> instead of "en" until hydration. It is a hint, never an authority:
 * the provider still sets the saved choice after load and rewrites the hint when it changes. */
export const PORTAL_LANG_COOKIE = 'nv-portal-lang';

export function parsePortalLangHint(value: unknown): 'en' | 'es' | null {
  return value === 'en' || value === 'es' ? value : null;
}

/** The signed-in document's first language: the portal's own hint, else the sign-in language. */
export function signedInDocumentLang(hint: unknown, signInLang: 'en' | 'es'): 'en' | 'es' {
  return parsePortalLangHint(hint) ?? signInLang;
}

/** The cookie the provider writes: a year, the whole site, Lax, and Secure on https. */
export function portalLangCookie(lang: 'en' | 'es', secure: boolean): string {
  return `${PORTAL_LANG_COOKIE}=${lang}; Path=/; Max-Age=31536000; SameSite=Lax${secure ? '; Secure' : ''}`;
}
