// Signed-in Spanish (es-rest, Nov 23, 2026): Settings and its pages follow the person's language. The tables hold the same
// keys in both languages, and each main view renders Puerto Rico Spanish when the language read says "es".
import * as React from 'react';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
rs.mock('@/lib/i18n/page-lang.server', () => ({readPageLang: async () => 'es'}));
rs.mock('@/lib/auth/permissions', () => ({requireRoles: rs.fn()}));
rs.mock('@/lib/auth/session', () => ({requireSessionMutationProof: async () => ({employee: {id: 'fictional-owner', role: 'OWNER'}, sessionTokenHash: 'h'})}));
rs.mock('@/lib/payroll/service', () => ({payrollFeatureEnabled: () => true, readPayrollCapabilities: async () => ({enabled: true, canConfigure: true})}));
rs.mock('@/lib/payroll/pay-calendar.server', () => ({currentPayPeriod: async () => ({frequency: 'BIWEEKLY'})}));
rs.mock('@/lib/data/workspaces', () => ({getWorkspace: async () => ({id: 'w', name: 'Café Fictional', timeZone: 'America/Puerto_Rico', active: true}), isWorkspaceTimezoneLocked: async () => true}));
rs.mock('next/link', () => ({default: ({href, children, prefetch: _p, ...props}: {href: string; children?: React.ReactNode; prefetch?: boolean}) => createElement('a', {href, ...props}, children)}));
rs.mock('next/navigation', () => ({usePathname: () => '/app/settings', useRouter: () => ({refresh() {}, push() {}})}));
rs.mock('@/lib/data/employees', () => ({listLocations: async () => [{id: 'l1', workspaceId: 'w', name: 'Condado', shortName: 'Condado', clockerKey: 'condado', active: true}], listEmployees: async () => []}));
rs.mock('@/lib/data/positions', () => ({listPositions: async () => []}));
rs.mock('@/lib/data/schedule-health', () => ({listLocationStaffingSettings: async () => [], listCoverageWindows: async () => []}));
rs.mock('@/lib/clocker/break-types.server', () => ({listBreakTypes: async () => []}));
rs.mock('@/lib/clocker/devices.server', () => ({listClockerDevices: async () => [{state: 'PENDING'}]}));
rs.mock('@/lib/workspace-presentation/current.server', () => ({currentPresentation: async () => ({words: 'standard', modules: undefined})}));
rs.mock('./actions', () => ({saveWorkspaceProfileAction: rs.fn(), createLocationAction: rs.fn(), updateLocationAction: rs.fn(), createPositionAction: rs.fn(), updatePositionAction: rs.fn()}));
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {SETTINGS_COPY} from './settings-copy';
import {BREAK_TYPES_COPY} from '@/components/clocker-break-types-copy';
import {PHOTO_OWNER_COPY} from '@/components/clocker-photo/photo-owner-copy';
import {OWNER_ONLY_COPY} from '@/components/owner-only-copy';
import SettingsPage from './page';
import WorkspacePage from './workspace/page';
import LocationsPage from './locations/page';
import {PositionCatalog} from './positions/position-catalog';
import {ClockerBreakTypes} from '@/components/clocker-break-types';
import {ClockerPhotoReview} from '@/components/clocker-photo/photo-review';
import {OwnerOnlyNotice} from '@/components/owner-only-notice';
import {ClosedSettingsLine, closedSettingsSubject} from './closed-line';

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/[\s ]+/g, ' ').trim();
const es = (node: React.ReactNode) => text(renderToStaticMarkup(createElement(PortalLangProvider, {lang: 'es', children: node})));
/** Every key path of a copy table (function values count as leaves). */
const paths = (value: unknown, prefix = ''): string[] => value && typeof value === 'object'
  ? Object.entries(value).flatMap(([key, inner]) => paths(inner, `${prefix}${key}.`)) : [prefix];

it('holds the same keys in English and Spanish in every Settings table', () => {
  for (const table of [SETTINGS_COPY, BREAK_TYPES_COPY, PHOTO_OWNER_COPY, OWNER_ONLY_COPY]) expect(paths(table.es).sort()).toEqual(paths(table.en).sort());
});

it('renders the Settings hub in Spanish', async () => {
  const html = renderToStaticMarkup(await SettingsPage());
  expect(html).toContain('lang="es"');
  const words = text(html);
  for (const word of ['Configuración', 'Empresa', 'Perfil de la empresa', 'Políticas de la empresa', 'Puestos', 'Aún no hay', 'Tipos de descanso',
    'Políticas de días libres', 'Reglas del horario', 'Tabletas Clocker', '1 sin configurar', 'Fotos de marcación', 'Configuración de nómina', 'Cada dos semanas'])
    expect(words).toContain(word);
  for (const english of ['Settings', 'Company profile', 'Break types', 'None yet', 'not set up', 'Every two weeks']) expect(words).not.toContain(english);
});

it('renders Company profile and Locations in Spanish', async () => {
  const profile = es(await WorkspacePage());
  for (const word of ['Perfil de la empresa', 'Nombre del negocio', 'Zona horaria', 'La semana empieza', 'lunes', 'Bloqueada mientras tengas turnos']) expect(profile).toContain(word);
  expect(profile).not.toContain('Business name');
  const locations = es(await LocationsPage());
  for (const word of ['Ubicaciones', '1 activas de 1 ubicación', 'Añadir ubicación']) expect(locations).toContain(word);
  expect(locations).not.toContain('Add location');
});

it('renders Positions and Break types in Spanish', () => {
  const positions = es(createElement(PositionCatalog, {positions: [], available: true, createAction: rs.fn(), updateAction: rs.fn()}));
  for (const word of ['Aún no hay puestos', 'Puedes añadir turnos sin un puesto.', 'Añadir puesto']) expect(positions).toContain(word);
  expect(positions).not.toContain('Add position');
  const failed = es(createElement(PositionCatalog, {positions: [], available: false, createAction: rs.fn(), updateAction: rs.fn()}));
  expect(failed).toContain('No pudimos cargar los puestos.');expect(failed).toContain('Intentar de nuevo');
  const types = es(createElement(ClockerBreakTypes, {initialTypes: [{id: 'b1', name: 'Almuerzo', category: 'MEAL', targetMinutes: 30, active: true, version: 1}] as never, action: rs.fn()}));
  for (const word of ['Activos', 'Comida', '30 min', 'Añadir tipo de descanso', 'Los cambios aplican solo a descansos nuevos.']) expect(types).toContain(word);
  expect(types).not.toContain('Add break type');
});

it('renders Photo review in Spanish, dates included', () => {
  const record = {reference: {deviceId: 'tablet-1', commandId: '7d6f2a3e-1b2c-4d5e-8f90-123456789abc'}, employeeName: 'Ana Rivera', locationName: 'Condado', locationKey: 'condado',
    timeZone: 'America/Puerto_Rico', action: 'CLOCK_IN', performedAt: '2026-12-07T12:00:00.000Z', policyVersion: 1, profileVersion: 1, state: 'stored', expiresAt: null, hasImage: true, removedAt: null};
  const never = () => new Promise<never>(() => {});
  const review = es(createElement(ClockerPhotoReview, {initialPage: {records: [record], total: 1, nextCursor: null} as never, listAction: never, detailAction: never, removeAction: never}));
  for (const word of ['Marcaciones', 'Actualizar', 'Marcar entrada', 'Foto disponible', 'Revisar', 'Fotos privadas de la empresa.', '7 dic 2026, 8:00 a. m.']) expect(review).toContain(word);
  for (const english of ['Clock in', 'Photo available', 'Refresh', 'Review,']) expect(review).not.toContain(english);
});

it('closes Settings to a Manager in Spanish, names and all', () => {
  expect(closedSettingsSubject('/app/settings/clocker/pins', undefined, 'es')).toBe('Los PIN del Clocker son');
  expect(closedSettingsSubject('/app/settings/locations', 'Tiendas', 'es')).toBe('Las tiendas son');
  expect(es(createElement(ClosedSettingsLine, {owner: 'Jose Natal', rules: true}))).toBe('Puedes cambiar las reglas del horario. Para todo lo demás, pregúntale a Jose Natal.');
  const notice = es(createElement(OwnerOnlyNotice, {state: true, lang: 'es', title: SETTINGS_COPY.es.settings, reason: SETTINGS_COPY.es.settingsForOwners, owners: ['Jose Natal', 'Ana Colón'], ownersCan: SETTINGS_COPY.es.changeASetting}));
  for (const word of ['Configuración', 'La configuración es para los dueños', 'Jose Natal o Ana Colón puede cambiar una configuración por ti.', 'Volver a Inicio']) expect(notice).toContain(word);
  expect(notice).not.toContain('Return to Home');
});
