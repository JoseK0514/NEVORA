'use client';

/* Signed-in Spanish (gap closure, Nov 23, 2026): Payroll's one way to read the person's language. It forwards the
 * shared contract's usePortalLang() (src/lib/i18n/portal-lang.tsx: the Profile choice, then the sign-in nv-lang cookie,
 * then Accept-Language, then English), so every Payroll component reads the same value. Server code passes `lang`. */
import { usePortalLang, type PortalLang } from '@/lib/i18n/portal-lang';

export type PayrollLang = PortalLang;

export function usePayrollLang(): PayrollLang {
  return usePortalLang();
}
