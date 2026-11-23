// Signed-in Spanish (es-rest): the Owner's and Manager's Profile in Puerto Rico Spanish, from the same read.
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from '@rstest/core';
import { PortalLangProvider } from '@/lib/i18n/portal-lang';
import { parseManagerProfile, type ManagerProfileSnapshot } from './contract';
import { ManagerProfileView, managerAccess, type ManagerProfileIdentity } from './manager-profile-live';
import { MANAGER_PROFILE_COPY, topicWords } from './manager-profile-copy';

const keyPaths = (value: unknown, prefix = ''): string[] => !value || typeof value !== 'object' ? [prefix]
  : Object.entries(value as Record<string, unknown>).flatMap(([key, inner]) => keyPaths(inner, prefix ? `${prefix}.${key}` : key)).sort();
const fixture = (name: string) => parseManagerProfile(JSON.parse(readFileSync(`docs/product/specs/p35-profile/fixtures/${name}.json`, 'utf8')));
const owner: ManagerProfileIdentity = { employeeId: 'qa-owner', name: 'Fictional Owner', owner: true, company: 'Northside QA Workforce', timeZone: 'Puerto Rico time', payHref: null, deviceAlerts: true };
const manager: ManagerProfileIdentity = { ...owner, employeeId: 'audit-m', name: 'Morgan Rivera', owner: false, locationsWord: 'ubicaciones' };
const render = (identity: ManagerProfileIdentity, snapshot: ManagerProfileSnapshot | null, lang: 'en' | 'es') =>
  renderToStaticMarkup(<PortalLangProvider lang={lang}><ManagerProfileView identity={identity} state={{ snapshot, paused: false, refreshing: false }} onRetry={() => {}} onToggle={() => {}} /></PortalLangProvider>);

it('has a Spanish entry for every English one', () => {
  expect(keyPaths(MANAGER_PROFILE_COPY.es)).toEqual(keyPaths(MANAGER_PROFILE_COPY.en));
});

it('draws the Profile in Spanish for an Owner and a Manager, and leaves English as it was', () => {
  const es = render(owner, fixture('owner'), 'es');
  for (const words of ['Dueño', 'Teléfono', 'Correo', 'Zona horaria', 'Notificaciones', 'Solicitudes de días libres', 'Cuando alguien pide días libres', 'Alertas en este ', 'Todas las notificaciones'])
    expect(es).toContain(words);
  for (const english of ['>Phone<', '>Email<', 'Time-off requests', 'All notifications', 'Alerts on this']) expect(es).not.toContain(english);
  const managed = render(manager, fixture('manager'), 'es');
  expect(managed).toContain('Gerente');
  expect(managed).toContain('La nómina y la configuración son para los dueños.');
  expect(render(owner, { state: 'unavailable', reason: 'read_failed' }, 'es')).toContain('No pudimos cargar tus datos de contacto, localidades y alertas.');
  expect(render(owner, fixture('owner'), 'en')).toContain('Time-off requests');
});

it('says a Manager’s reach in Spanish, and keeps a topic the read words its own way', () => {
  expect(managerAccess({ scope: 'all', names: [] }, 'ubicaciones', MANAGER_PROFILE_COPY.es).value).toBe('Todas las ubicaciones');
  expect(managerAccess({ scope: 'all', names: [] }, 'restaurantes', MANAGER_PROFILE_COPY.es).value).toBe('Todos los restaurantes');
  const custom = { id: 'time-off', label: 'Leave', detail: 'Custom', on: true };
  expect(topicWords(custom, MANAGER_PROFILE_COPY.es)).toEqual(custom);
});
