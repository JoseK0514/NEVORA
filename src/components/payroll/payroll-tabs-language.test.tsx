import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, rs } from '@rstest/core';
import type { ReactNode } from 'react';
import { PortalLangProvider } from '@/lib/i18n/portal-lang';
import { PayrollTabs } from './payroll-tabs';

rs.mock('@/components/navigation-link', () => ({
  NavigationLink: ({ href, children, 'aria-current': current }: { href: string; children: ReactNode; 'aria-current'?: 'page' }) =>
    <a href={href} aria-current={current}>{children}</a>,
}));

it.each([['en', 'Pay runs', 'Time exports'], ['es', 'Nóminas', 'Exportar horas']] as const)(
  'keeps the same authorized links and selected tab in %s', (lang, runs, exports) => {
    const items = [{ href: '/app/payroll', label: 'Pay runs' }, { href: '/app/payroll-export', label: 'Time exports' }];
    const html = renderToStaticMarkup(<PortalLangProvider lang={lang}><PayrollTabs items={items} current="/app/payroll-export" /></PortalLangProvider>);
    expect(html).toContain('href="/app/payroll">'+runs+'</a>');
    expect(html).toContain('href="/app/payroll-export" aria-current="page">'+exports+'</a>');
    expect(html).not.toContain('/app/settings/payroll');
  },
);
