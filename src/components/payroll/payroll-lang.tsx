'use client';

/* Signed-in Spanish (gap closure, Nov 23, 2026): Payroll's one way to read the person's language. It forwards the
 * shared contract's usePortalLang() (src/lib/i18n/portal-lang.tsx: the Profile choice, then the sign-in nv-lang cookie,
 * then Accept-Language, then English), so every Payroll component reads the same value. Server code passes `lang`. */
import { createContext, useContext, type ReactNode } from 'react';

export type PayrollLang = 'en' | 'es';

// Interim until the shared provider merges: a local context that defaults to English.
const PayrollLangContext = createContext<PayrollLang>('en');
export function PayrollLangProvider({ lang, children }: { lang: PayrollLang; children: ReactNode }) {
  return <PayrollLangContext.Provider value={lang}>{children}</PayrollLangContext.Provider>;
}
export function usePayrollLang(): PayrollLang {
  return useContext(PayrollLangContext);
}
