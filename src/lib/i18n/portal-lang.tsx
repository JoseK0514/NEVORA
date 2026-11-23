'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';

/** The signed-in app's language. */
export type PortalLang = 'en' | 'es';

const PortalLangContext = createContext<PortalLang>('en');

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
    return () => { root.lang = previous; };
  }, [value]);
  return <PortalLangContext.Provider value={value}>{children}</PortalLangContext.Provider>;
}

/** The person's language in a client component: 'en' outside the provider (tests, public pages). */
export function usePortalLang(): PortalLang {
  return useContext(PortalLangContext);
}
