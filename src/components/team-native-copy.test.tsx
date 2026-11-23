// Signed-in Spanish (es-rest): Team's live states and filters and the phone app's Alerts settings carry every word in both
// languages.
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
rs.mock('@/lib/native-shell/device-runtime', () => ({nativeDeviceRuntime: () => ({})}));
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {TEAM_COPY} from './team-copy';
import {NATIVE_SHELL_COPY} from './native-shell/native-shell-copy';
import {TeamDeskPeople} from './team-desk-people';
import {notClockedInText} from './team-live';
import {UnsupportedNativeRole} from './native-shell/unsupported-role';
import {NativeAlertsUnavailableB, NativeDeviceSettingsView} from './native-shell/device-settings';

const keys = (value: object): string[] => Object.entries(value).flatMap(([key, inner]) =>
  inner && typeof inner === 'object' ? keys(inner).map(child => `${key}.${child}`) : [key]).sort();
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/[\s ]+/g, ' ').trim();

it('has a Spanish entry for every English one', () => {
  expect(keys(TEAM_COPY.es)).toEqual(keys(TEAM_COPY.en));
  expect(keys(NATIVE_SHELL_COPY.es)).toEqual(keys(NATIVE_SHELL_COPY.en));
});

it('says the live attendance words in Spanish only when asked', () => {
  expect(notClockedInText(42)).toBe('Not clocked in · 42 min');
  expect(notClockedInText(75, 'es')).toBe('Sin marcar entrada · 1 h 15 min');
  expect(TEAM_COPY.es.starts('1:30 PM')).toContain('p.');
});

it('draws the Team filters and the empty line in Spanish', () => {
  const rows = [{id: 'e1', name: 'Fictional Worker', initials: 'FW', detail: 'Barista', href: '/app/employees/e1'}];
  const html = renderToStaticMarkup(<PortalLangProvider lang="es"><TeamDeskPeople rows={rows} peopleLabel="Empleados" /></PortalLangProvider>);
  expect(text(html)).toContain('Fictional Worker');
  expect(text(renderToStaticMarkup(<UnsupportedNativeRole lang="es" />))).toContain('Usa NEVORA en tu navegador');
});

it('draws Hours this week in Spanish when the dashboard passes the language', async () => {
  const {TeamOverviewCorp} = await import('./team/team-overview');
  const props = {weekStart: '2026-12-07', weekLabel: '7–13 dic', previousWeek: '2026-11-30', nextWeek: '2026-12-14', activeEmployees: 4, availabilitySubmitted: 3, availabilityEligible: 4,
    hours: [{employeeId: 'e1', employeeName: 'Fictional Worker', scheduledHours: 40, targetHours: 32, status: 'OVER' as const}]};
  const es = text(renderToStaticMarkup(<TeamOverviewCorp {...props} lang="es" />));
  for (const words of ['Horas esta semana', 'Esta semana', '3 de 4', 'Fuera de la meta', '40 h de 32 h', '8 h de más']) expect(es).toContain(words);
  for (const english of ['Hours this week', 'Off target', ' of ', 'over']) expect(es).not.toContain(english);
  expect(text(renderToStaticMarkup(<TeamOverviewCorp {...props} />))).toContain('8 h over');
});

it('draws the Alerts settings in Spanish', () => {
  const noop = () => {};
  const es = text(renderToStaticMarkup(<PortalLangProvider lang="es">
    <NativeDeviceSettingsView snapshot={{state: 'ready'} as never} onEnable={noop} onRefresh={noop} onReview={noop} onKeep={noop} onTurnOff={noop} />
    <NativeAlertsUnavailableB />
  </PortalLangProvider>));
  for (const words of ['Este dispositivo', 'Las alertas están desactivadas', 'Activar alertas', 'Revisar otra vez', 'Tu trabajo no ha activado las alertas de la app.'])
    expect(es).toContain(words);
  for (const english of ['This device', 'Alerts are off', 'Turn on alerts']) expect(es).not.toContain(english);
});
