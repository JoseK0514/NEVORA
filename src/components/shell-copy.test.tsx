// Signed-in Spanish (gap closure): the shell's tables have the same keys in both languages, every label the navigation
// and the finder can produce has Spanish, English is unchanged, and the shell's parts draw Spanish inside the provider.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, rs } from '@rstest/core';
import type { OperationalAuthorityView } from '@/lib/company-access/model';
import type { PayrollCapabilities } from '@/lib/payroll/contracts';
import type { UserRole } from '@/lib/domain';
import { PortalLangProvider } from '@/lib/i18n/portal-lang';
import { employeeNavigationGroups, managementNavigationGroups, mobileTabsForRole, navigationForRole, payrollTabsFor, sidebarNavigation, teamToolsForRole } from '@/lib/navigation';
import { finderItems } from '@/lib/finder';
import { DEVICE_WORDS, FINDER_WORDS, NAV_LABELS_ES, SHELL_WORDS, VALIDATION_WORDS, loadingLine, localClock, navLabel } from './shell-copy';

rs.mock('next/navigation', () => ({ usePathname: () => '/app/payroll', useRouter: () => ({ refresh() {}, push() {} }), useSearchParams: () => new URLSearchParams() }));
const { SectionTabs } = await import('./section-tabs');
const { NotFoundBody } = await import('../app/app/not-found-body');
const { RouteLoadingLine } = await import('./route-loading-line');

const keys = (value: unknown): string[] => value && typeof value === 'object' ? Object.keys(value).sort().flatMap(key => [key, ...keys((value as Record<string, unknown>)[key]).map(inner => `${key}.${inner}`)]) : [];
const payroll: PayrollCapabilities = { enabled: true, canConfigure: true, canReview: true, canApprove: true, internalCalculatorAvailable: true, bankCompatibility: 'UNVERIFIED' };
const company: OperationalAuthorityView = { state: 'ready', employeeId: 'M1', role: 'MANAGER', source: 'LEGACY_ADOPTION', scope: { mode: 'COMPANY', locationIds: [] }, scopeRevision: 1, authority: 'fictional', locations: [], observedAt: '2026-10-14T12:00:00Z', validForMs: 15000 };
const roles: UserRole[] = ['OWNER', 'MANAGER', 'LEAD', 'EMPLOYEE'];

describe('shell copy tables', () => {
  it('have the same keys in English and Spanish', () => {
    for (const table of [SHELL_WORDS, FINDER_WORDS, VALIDATION_WORDS, DEVICE_WORDS]) expect(keys(table.es)).toEqual(keys(table.en));
  });

  it('give every navigation, tab, group and finder label a Spanish name', () => {
    const labels = new Set<string>();
    for (const role of roles) for (const context of [{ operational: company, ownerAdvisorEnabled: true, managerAdvisorEnabled: true }, {}]) {
      const navigation = navigationForRole(role, payroll, context);
      const sidebar = sidebarNavigation(role, navigation);
      const groups = role === 'EMPLOYEE' || role === 'LEAD' ? employeeNavigationGroups(sidebar) : managementNavigationGroups(sidebar, teamToolsForRole(role, context), role);
      for (const item of [...navigation, ...mobileTabsForRole(role, payroll, context), ...teamToolsForRole(role, context), ...(payrollTabsFor(role, payroll, context) ?? [])]) labels.add(item.label);
      for (const group of groups) { if (group.label) labels.add(group.label); for (const item of group.items) labels.add(item.label); }
      for (const item of finderItems(role, payroll, null, context)) { labels.add(item.label); labels.add(item.group); if (item.detail) labels.add(item.detail); }
    }
    const missing = [...labels].filter(label => !(label in NAV_LABELS_ES));
    expect(missing).toEqual([]);
  });

  it('leave English exactly as it was', () => {
    for (const label of Object.keys(NAV_LABELS_ES)) expect(navLabel(label, 'en')).toBe(label);
    expect(navLabel('A company word', 'es')).toBe('A company word');
    expect(loadingLine('your pay', 'en')).toBe('Loading your pay…');
    expect(localClock('4:49 PM', 'en')).toBe('4:49 PM');
    expect(SHELL_WORDS.en.offlineUpdated('4:49 PM')).toBe('Offline · updated 4:49 PM');
  });

  it('write Spanish times, loading lines and roles the app’s way', () => {
    expect(localClock('4:49 PM', 'es')).toBe('4:49 p. m.');
    expect(loadingLine('your pay', 'es')).toBe('Cargando tu pago…');
    expect(loadingLine('Something new', 'es')).toBe('Cargando la página…');
    expect(SHELL_WORDS.es.roles.OWNER).toBe('Dueño');
    expect(navLabel('Things to do', 'es')).toBe('Pendientes');
    expect(navLabel('Time off', 'es')).toBe('Días libres');
  });
});

describe('shell parts in Spanish', () => {
  const es = (node: React.ReactNode) => renderToStaticMarkup(<PortalLangProvider lang="es">{node}</PortalLangProvider>);
  it('section tabs name their pages in Spanish', () => {
    const html = es(<SectionTabs pathname="/app/payroll" group={{ label: 'Payroll', items: [{ href: '/app/payroll', label: 'Pay runs' }, { href: '/app/payroll-export', label: 'Time exports' }, { href: '/app/settings/payroll', label: 'Settings' }] }} />);
    expect(html).toContain('aria-label="Páginas de Nómina"');
    expect(html).toContain('>Nóminas</a>'); expect(html).toContain('>Exportar horas</a>'); expect(html).toContain('>Configuración</a>');
  });
  it('the signed-in 404 is Spanish, and English outside the provider', () => {
    const html = es(<NotFoundBody />);
    expect(html).toContain('Página no encontrada'); expect(html).toContain('Esta página no existe'); expect(html).toContain('Ir a Inicio'); expect(html).toContain('Abrir Horario');
    expect(renderToStaticMarkup(<NotFoundBody />)).toContain('Page not found');
  });
  it('the loading frame’s status line follows the language', () => {
    expect(es(<RouteLoadingLine label="your pay" />)).toBe('<span class="sr-only">Cargando tu pago…</span>');
    expect(renderToStaticMarkup(<RouteLoadingLine label="your pay" />)).toBe('<span class="sr-only">Loading your pay…</span>');
  });
});
