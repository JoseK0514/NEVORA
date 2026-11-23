/* Signed-in Spanish (gap closure, Nov 23, 2026): every Payroll string in English and Puerto Rico Spanish, one table
 * for the area shaped {en, es} with the same keys in both (the pattern of src/components/copy-receipt-copy.ts). The
 * sections live in ./copy so each part of Payroll keeps its words beside the others; payroll-copy.test.ts checks that
 * the key sets match. English is the approved payroll wording and stays word for word. */
import { runsCopy } from './copy/runs';
import { settingsCopy } from './copy/settings';
import { nativeCopy } from './copy/native';
import { statusCopy } from './copy/status';
import { myPayCopy } from './copy/myPay';
import { usePayrollLang, type PayrollLang } from './payroll-lang';

export type { PayrollLang };

export const payrollCopy = {
  en: { runs: runsCopy.en, settings: settingsCopy.en, native: nativeCopy.en, status: statusCopy.en, myPay: myPayCopy.en },
  es: { runs: runsCopy.es, settings: settingsCopy.es, native: nativeCopy.es, status: statusCopy.es, myPay: myPayCopy.es },
};
export type PayrollCopy = typeof payrollCopy.en;

/** The copy for one language (server code and helpers that take `lang`). */
export const payrollCopyFor = (lang: PayrollLang = 'en'): PayrollCopy => payrollCopy[lang] ?? payrollCopy.en;

/** The copy in the person's language, for client components. */
export function usePayrollCopy(): PayrollCopy & { lang: PayrollLang } {
  const lang = usePayrollLang();
  return { ...payrollCopyFor(lang), lang };
}
