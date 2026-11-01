import Link from 'next/link';
import type { UserRole } from '@/lib/domain';
import type { PayrollCapabilities } from '@/lib/payroll/contracts';
import { sectionTabsFor } from '@/lib/navigation';

export type PayrollTab = { href: string; label: string };

/** Owner premium (structure P3, visual-craft D): Payroll's own pages as tabs under the title. Timecards is not one of
 * them (it belongs to Time, and its tab moved the reader out of Payroll with no way back). The list and its access
 * rules come from the shell's section tabs, so a page appears here only where the shell already offered it. */
export function payrollTabs(role: UserRole, payroll?: PayrollCapabilities): PayrollTab[] | null {
  const group = sectionTabsFor(role, '/app/payroll-export', payroll);
  const items = (group?.items ?? []).filter(item => item.href !== '/app/timecards').map(item => item.href === '/app/payroll' ? { ...item, label: 'Payroll' } : item);
  return items.length > 1 ? items : null;
}

/** 44px text tabs with a 2px teal line under the current one, on tablets and desktop (a phone reaches these pages from
 * Payroll's rows and title buttons). */
export function PayrollTabs({ items, current }: { items: PayrollTab[] | null | undefined; current: string }) {
  if (!items?.length) return null;
  return <nav className="c-pay-tabs" aria-label="Payroll pages">
    {items.map(item => <Link key={item.href} href={item.href} className="c-pay-tabs__tab" aria-current={item.href === current ? 'page' : undefined}>{item.label}</Link>)}
  </nav>;
}
