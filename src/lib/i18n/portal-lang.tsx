'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { portalLangCookie } from './portal-lang-cookie';

/** The signed-in app's language. */
export type PortalLang = 'en' | 'es';

const PortalLangContext = createContext<PortalLang>('en');

/* Nov 26, 2026 (QA R2): when the portal's own layout fails, the provider is gone and <html lang> is back to the root
 * layout's signed-in default ("en"). The provider remembers the person's language here (memory for this page, and the
 * tab's sessionStorage across reloads) so the portal's error screen can still speak it. Presentation only. */
const REMEMBER_KEY = 'nv-portal-lang';
let remembered: PortalLang | null = null;
/** The signed-in person's language as the portal last rendered it in this tab, or null. */
export function rememberedPortalLang(): PortalLang | null {
  if (remembered) return remembered;
  try { const saved = window.sessionStorage.getItem(REMEMBER_KEY); return saved === 'es' || saved === 'en' ? saved : null; } catch { return null; }
}

/** Signed-in Spanish (gap closure, Nov 23, 2026): rendered once in `src/app/app/layout.tsx` with the person's language
 * from `readPortalLanguage` (their Profile choice, then the sign-in `nv-lang` cookie, then the browser's, then English).
 * Client components read it with `usePortalLang()`; server components keep calling `readPortalLanguage`. */
export function PortalLangProvider({ lang, children }: { lang: PortalLang; children: ReactNode }) {
  const value: PortalLang = lang === 'es' ? 'es' : 'en';
  // Screen readers pick their voice from <html lang>: the signed-in app sets the person's language there (the root layout
  // starts it from the sign-in cookie or the browser), and puts the previous value back when the app unmounts.
  useEffect(() => {
    const root = document.documentElement, previous = root.lang;
    root.lang = value;
    remembered = value;
    try { window.sessionStorage.setItem(REMEMBER_KEY, value); } catch { /* Storage blocked: memory only. */ }
    // The root layout's first-render hint for the next signed-in page (portal-lang-cookie.ts).
    try { document.cookie = portalLangCookie(value, window.location.protocol === 'https:'); } catch { /* Cookies blocked: no hint. */ }
    return () => { root.lang = previous; };
  }, [value]);
  return <PortalLangContext.Provider value={value}>{children}</PortalLangContext.Provider>;
}

/** The person's language in a client component: 'en' outside the provider (tests, public pages). */
export function usePortalLang(): PortalLang {
  return useContext(PortalLangContext);
}
