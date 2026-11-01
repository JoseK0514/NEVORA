import Link from 'next/link';
import type { UserRole } from '@/lib/domain';
import type { PayrollCapabilities } from '@/lib/payroll/contracts';
import { payrollTabsFor } from '@/lib/navigation';

export type PayrollTab = { href: string; label: string };

/** Owner premium (structure P3, visual-craft D): Payroll's own pages as tabs under the title. Timecards is not one of
 * them (it belongs to Time, and its tab moved the reader out of Payroll with no way back). The list and its access
 * rules are the ones the shell's retired "Time and pay" row used (navigation.ts payrollTabsFor). */
export function payrollTabs(role: UserRole, payroll?: PayrollCapabilities): PayrollTab[] | null {
  return payrollTabsFor(role, payroll);
}

/** 44px text tabs with a 2px teal line under the current one, on tablets and desktop (a phone reaches these pages from
 * Payroll's rows and title buttons). */
export function PayrollTabs({ items, current }: { items: PayrollTab[] | null | undefined; current: string }) {
  if (!items?.length) return null;
  return <nav className="c-pay-tabs" aria-label="Payroll pages">
    {items.map(item => <Link key={item.href} href={item.href} className="c-pay-tabs__tab" aria-current={item.href === current ? 'page' : undefined}>{item.label}</Link>)}
  </nav>;
}
