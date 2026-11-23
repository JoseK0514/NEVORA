// Signed-in Spanish (es-rest, part E): every table has the same keys in English and Spanish, and the main views render
// Puerto Rico Spanish inside the person's language provider (and English outside it).
import {createElement, type ComponentProps, type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
rs.mock('next/link', () => ({default: ({children, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {prefetch?: boolean}) => createElement('a', props, children)}));
rs.mock('next/navigation', () => ({useRouter: () => ({refresh() {}, push() {}, replace() {}}), usePathname: () => '/app', useSearchParams: () => new URLSearchParams()}));
rs.mock('../app/app/employees/actions', () => ({saveOperationalRulesAction: async () => ({status: 'saved', revision: 1})}));
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {ROUTE_PAGES_COPY} from '@/app/app/route-pages-copy';
import {ACTION_CENTER_NAVIGATION_COPY, actionCenterNavigation} from './action-center-navigation';
import {ASSISTED_RECOVERY_COPY} from './assisted-recovery-copy';
import {CONFIGURED_ATTENDANCE_COPY} from './configured-attendance-policies-copy';
import {CORRECTION_TIME_TICKET_COPY} from './correction-time-ticket-copy';
import {DELEGATED_TIME_CORRECTION_COPY} from './delegated-time-correction-copy';
import {ERROR_SCREENS_COPY} from './error-screens-copy';
import {FEATURES_EDITOR_COPY} from './features-editor-copy';
import {LOCATION_FORMS_COPY} from './location-forms-copy';
import {MANAGEMENT_CLOSE_COPY} from './management-close-copy';
import {MESSAGES_MANAGER_COPY} from './messages-manager-copy';
import {OPERATIONAL_RULE_FIELDS_COPY} from './operational-rule-fields-copy';
import {PERIOD_CLOSE_HISTORY_COPY} from './period-close-history-copy';
import {REVIEWED_FORMS_COPY} from './reviewed-forms-copy';
import {RULES_HOURS_LIST_COPY} from './rules-hours-list-copy';
import {SMALL_PARTS_COPY} from './small-parts-copy';
import {WAVE_A_COPY} from './wave-a/wave-a-copy';
import {WAVE_B_FORMS_COPY} from './wave-b-forms-copy';
import {WHOS_WORKING_COPY} from './whos-working-copy';
import {WhosWorkingView} from './whos-working-corp';
import {RulesHoursList} from './rules-hours-list';
import {ManagerUpdatesView} from './messages-manager-b';
import {ModuleOff} from './module-off';
import {AppErrorScreen} from './app-error-screen';
import {WaveARouteError} from './wave-a/route-error';
import {CorrectionTimeTicket} from './correction-time-ticket';
import {PeriodCloseHistory} from './period-close-history';
import {ConfiguredAttendancePolicies} from './configured-attendance-policies';
import {OperationalRuleFields} from './operational-rule-fields';
import {FeaturesEditor} from './features-editor';
import {NewLocationForm} from './new-location-form';
import {PositionQuotaFields} from './position-quota-fields';
import {BlockedOpenShifts} from './blocked-open-shifts';
import {ThemeSwitch} from './theme-switch';

const TABLES = {ROUTE_PAGES_COPY, ACTION_CENTER_NAVIGATION_COPY, ASSISTED_RECOVERY_COPY, CONFIGURED_ATTENDANCE_COPY, CORRECTION_TIME_TICKET_COPY,
  DELEGATED_TIME_CORRECTION_COPY, ERROR_SCREENS_COPY, FEATURES_EDITOR_COPY, LOCATION_FORMS_COPY, MANAGEMENT_CLOSE_COPY, MESSAGES_MANAGER_COPY,
  OPERATIONAL_RULE_FIELDS_COPY, PERIOD_CLOSE_HISTORY_COPY, REVIEWED_FORMS_COPY, RULES_HOURS_LIST_COPY, SMALL_PARTS_COPY, WAVE_A_COPY,
  WAVE_B_FORMS_COPY, WHOS_WORKING_COPY};

/** Every key path, recursively; a function or a string is a leaf. `null` in English means "use the English source". */
function paths(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object') return [prefix];
  return Object.entries(value).flatMap(([key, inner]) => inner === null ? [] : paths(inner, prefix ? `${prefix}.${key}` : key));
}

/** The key paths English leaves null (Spanish fills them; English uses its source). */
function nulls(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, inner]) => { const path = prefix ? `${prefix}.${key}` : key; return inner === null ? [path] : nulls(inner, path); });
}

it('has a Spanish entry for every English one, in every table', () => {
  for (const [name, table] of Object.entries(TABLES)) {
    const {en, es} = table as {en: unknown; es: unknown};
    const open = nulls(en), shared = (key: string) => !open.some(path => key.startsWith(`${path}.`));
    expect({name, keys: paths(es).filter(shared).sort()}).toEqual({name, keys: paths(en).sort()});
  }
});

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, '\'').replace(/&amp;/g, '&').replace(/[\s ]+/g, ' ').trim();
const es = (node: ReactNode) => text(renderToStaticMarkup(<PortalLangProvider lang="es">{node}</PortalLangProvider>));
const en = (node: ReactNode) => text(renderToStaticMarkup(<>{node}</>));

it("renders Who's working in Spanish, and English outside the provider", () => {
  expect(es(<WhosWorkingView monitor={null} today={null} />)).toContain('Quién está trabajando');
  expect(es(<WhosWorkingView monitor={null} today={null} />)).toContain('Verificando quién está en turno…');
  expect(en(<WhosWorkingView monitor={null} today={null} />)).toContain('Who’s working');
});

it('renders the Scheduling rules hours list in Spanish', () => {
  const rows = [1, 2].map(n => ({employeeId: `e${n}`, employeeName: `Persona Ficticia ${n}`, detail: 'E1 · Employee · Condado', targetWeeklyHours: null, maximumWeeklyHours: 40}));
  const page = es(<RulesHoursList rows={rows} />);
  for (const words of ['Sin meta', 'Meta de horas', 'Máximo de horas']) expect(page).toContain(words);
  expect(en(<RulesHoursList rows={rows} />)).toContain('Target hours');
});

it('renders the Owner and Manager Updates list in Spanish', () => {
  const page = es(<ManagerUpdatesView list={{state: 'complete', items: []} as never} status={null} partial={false} places={null} />);
  for (const words of ['Avisos', 'Nuevo aviso', 'Todavía no hay avisos', 'Cuéntale a tu equipo sobre horarios, menús o eventos.']) expect(page).toContain(words);
});

it('renders a turned-off feature in Spanish when the page passes the language', () => {
  const page = text(renderToStaticMarkup(<ModuleOff module="timeOff" workspaceName="Café Ficticio" owner lang="es" />));
  for (const words of ['Función desactivada: Días libres', 'Café Ficticio no usa días libres en NEVORA ahora.', 'Activar en Configuración', 'Volver a Inicio ›']) expect(page).toContain(words);
  expect(text(renderToStaticMarkup(<ModuleOff module="timeOff" workspaceName="Café Ficticio" owner />))).toContain('Time off is turned off');
});

it('renders the error screens in Spanish', () => {
  const page = es(<AppErrorScreen reset={() => {}} digest="abc123" />);
  for (const words of ['Esta página no cargó', 'No se cambió nada.', 'Algo falló de nuestro lado. Inténtalo de nuevo.', 'Referencia: abc123', 'Intentar de nuevo', 'Ir a Inicio']) expect(page).toContain(words);
  expect(es(<WaveARouteError retry={() => {}} title="Horario" />)).toContain('Horario no cargó.');
});

it('renders the correction ticket in Spanish times and days', () => {
  const page = es(<CorrectionTimeTicket start="2026-10-14T08:00" end="2026-10-14T16:30" onStart={() => {}} onEnd={() => {}} />);
  for (const words of ['8:00 a. m.', '4:30 p. m.', 'mié, 14 oct', 'Inicio', 'Fin']) expect(page).toContain(words);
  expect(es(<CorrectionTimeTicket start="" end="" onStart={() => {}} onEnd={() => {}} />)).toContain('Elige una hora para cambiarla');
});

it('renders the payroll period history and the attendance comparison in Spanish', () => {
  const history = es(<PeriodCloseHistory period={{startDate: '2026-10-05', endDate: '2026-10-11'} as never} actorId="a" />);
  for (const words of ['Historial completo del período', 'Carga el historial para revisar todos los eventos de archivos y entregas.', 'Cargar historial']) expect(history).toContain(words);
  const compare = es(<ConfiguredAttendancePolicies />);
  for (const words of ['Qué comparamos', 'No establecen ausencias']) expect(compare).toContain(words);
});

it('renders the Owner-reviewed operational rules in Spanish', () => {
  const unknown = {status: 'UNKNOWN'};
  const profile = {revision: 1, reviewedAt: null, minimumRest: unknown, maximumShift: unknown, maximumDaily: unknown, breaks: unknown, projectedOvertime: unknown};
  const page = es(<OperationalRuleFields employeeId="e1" profile={profile as never} canEdit={false} />);
  for (const words of ['Reglas operativas revisadas por el dueño', 'Descanso mínimo', 'Desconocido']) expect(page).toContain(words);
});

it('renders Features and team terms and Add location in Spanish', () => {
  const features = es(<FeaturesEditor revision={1} preset="standard" disabled={[]} blockers={{}} payrollEnabled={false} />);
  for (const words of ['Cómo llamar a las personas y los lugares', 'Estándar', 'Empleados, localidades', 'Funciones', 'Días libres', 'Disponible cuando la nómina está activa.']) expect(features).toContain(words);
  const add = es(<NewLocationForm action={async () => ({})} />);
  for (const words of ['Nombre', 'Nombre corto', 'Clave del Clocker', 'Cancelar', 'Añadir']) expect(add).toContain(words);
});

it('renders the small shared parts in Spanish', () => {
  expect(text(renderToStaticMarkup(<PositionQuotaFields positions={[{id: 'p', name: 'Barra', active: true}] as never} lang="es" />))).toContain('Cantidad por puesto');
  const blocked = text(renderToStaticMarkup(<BlockedOpenShifts lang="es" shifts={[{id: 's', date: '2026-10-14', startTime: '08:00', endTime: '16:00', location: 'Condado', position: null}]} />));
  expect(blocked).toContain('Por qué otros turnos no están disponibles');
  const theme = es(<ThemeSwitch />);
  for (const words of ['Sistema', 'Claro', 'Oscuro']) expect(theme).toContain(words);
});

it('names the action center links in Spanish when asked', () => {
  const item = {type: 'TIME_OFF', href: '/app/requests?requestId=r1'} as never;
  expect(actionCenterNavigation(item).label).toBe('Review time off');
  expect(actionCenterNavigation(item, 'es').label).toBe('Revisar días libres');
});
