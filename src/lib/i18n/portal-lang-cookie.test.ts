import { describe, expect, it } from '@rstest/core';
import { PORTAL_LANG_COOKIE, parsePortalLangHint, portalLangCookie, signedInDocumentLang } from './portal-lang-cookie';

// Branch audit, Nov 26, 2026: a signed-in Spanish person's page starts as <html lang="es"> (the portal's hint), and the
// hint can only ever say 'en' or 'es'.
describe('the signed-in first-render language', () => {
  it('follows the portal hint, else the sign-in language', () => {
    expect(signedInDocumentLang('es', 'en')).toBe('es');
    expect(signedInDocumentLang('en', 'es')).toBe('en');
    expect(signedInDocumentLang(undefined, 'es')).toBe('es');
    expect(signedInDocumentLang(undefined, 'en')).toBe('en');
  });
  it('ignores anything but en or es', () => {
    for (const bad of ['ES', 'fr', '', 'es;x', null, 1]) { expect(parsePortalLangHint(bad)).toBeNull(); expect(signedInDocumentLang(bad, 'en')).toBe('en'); }
  });
  it('writes only the language, for the whole site, Lax, Secure on https', () => {
    expect(portalLangCookie('es', true)).toBe(`${PORTAL_LANG_COOKIE}=es; Path=/; Max-Age=31536000; SameSite=Lax; Secure`);
    expect(portalLangCookie('en', false)).toBe(`${PORTAL_LANG_COOKIE}=en; Path=/; Max-Age=31536000; SameSite=Lax`);
  });
});
