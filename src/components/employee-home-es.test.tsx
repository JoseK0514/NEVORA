import {renderToStaticMarkup} from 'react-dom/server';
import type {ReactNode} from 'react';
import {expect, it} from '@rstest/core';
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {projectEmployeeHome, HOME_SOURCES} from '../lib/employee-home/project';
import type {AttentionItem, HomeSnapshot, PublishedAssignment} from '../lib/employee-home/types';
import {EmployeeHomeCorpView} from './employee-home-corp';
import {EmployeeHomeQuietView, type HomeWeek} from './employee-home-quiet';
import {EmployeeHomeView} from './employee-home-actions';
import {EmployeeHomeReviewedView} from './employee-home-reviewed';
import {withoutB} from './owner-b/test-support';

/* Signed-in Spanish (Nov 23, 2026): the Employee and Lead Home in Puerto Rico Spanish, on fictional data (Sunday,
 * Nov 1, 2026 at 10:00 AM in Puerto Rico). English stays as it was; these check the person who reads Spanish. */
const at = '2026-11-01T14:00:00.000Z', zone = 'America/Puerto_Rico';
const monday: PublishedAssignment = {
  shiftId: 'own-mon', assignmentEpisodeId: 'ep', termsRevision: 1, weekStart: '2026-11-02', date: '2026-11-02',
  startAt: '2026-11-02T12:00:00Z', endAt: '2026-11-02T20:00:00Z', locationId: 'condado', locationLabel: 'Condado',
  positionLabel: 'Barista', designatedLead: true, publicationRevisionId: 'pub-1',
};
const item = (kind: AttentionItem['ref']['kind'], id: string, label: string, extra: Partial<AttentionItem> = {}): AttentionItem => ({
  ref: {kind, id, version: 'r1'}, label, href: '/app/schedule', required: true, actionable: true, deadlineAt: null, changedAt: at, ...extra,
});
const snapshot = (attention: AttentionItem[] = []): HomeSnapshot => ({
  observedAt: at, authority: 'a'.repeat(64), validForMs: 45000, timeZone: zone, publicationState: 'complete',
  sources: Object.fromEntries(HOME_SOURCES.map(key => [key, {state: 'complete', observedAt: at, version: 'v', reason: null}])) as HomeSnapshot['sources'],
  nextShift: monday, currentShift: null, attention,
});
const week: HomeWeek = {
  weekStart: '2026-10-26', today: '2026-11-01', dates: Array.from({length: 7}, (_, day) => `2026-${day < 6 ? `10-${26 + day}` : '11-01'}`),
  shifts: [{id: 's-27', date: '2026-10-27', startTime: '08:00', endTime: '16:00', where: 'Barista · Condado'}],
  next: {weekStart: '2026-11-02', shifts: [{id: 'own-mon', date: '2026-11-02', startTime: '08:00', endTime: '16:00', where: 'Barista · Condado'}, {id: 's-3', date: '2026-11-03', startTime: '08:00', endTime: '16:00', where: 'Barista · Condado'}]},
};
const es = (node: ReactNode) => renderToStaticMarkup(<PortalLangProvider lang="es">{node}</PortalLangProvider>);
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/[  ]/g, ' ').replace(/\s+/g, ' ');
const attention = [item('SCHEDULE', '2026-11-02', 'Schedule published', {href: '/app/schedule?week=2026-11-02'}), item('EXCHANGE', 'x1', 'Review swap request', {href: '/app/exchange?tab=requests&requestId=x1', deadlineAt: '2026-11-03T18:00:00Z', required: false})];

it('the corporate Home (tablets and desktop) reads in Spanish', () => {
  const plain = text(withoutB(es(<EmployeeHomeCorpView home={projectEmployeeHome(snapshot(attention))} status="ready" refreshing={false} onRetry={() => {}} ownTimeSlot={null}
    displayName="Alexandra" timeZone={zone} workspaceName="Isla Verde Cafés" week={week}/>)));
  for (const words of ['Hola de nuevo, Alexandra', 'Próximo turno', 'Marca entrada en la tableta de Condado', 'Detalles del turno', 'Líder de turno',
    'Confirma el horario de la próxima semana', 'Revisar solicitud de cambio', 'Responde antes del', 'Próximos turnos', 'Ver todos', 'Pendientes', 'p. m.', 'domingo']) expect(plain).toContain(words);
  for (const words of ['Welcome back', 'Next shift', 'Clock in on', 'Shift details', 'Coming up', 'Things to do', 'Respond by', ' PM']) expect(plain).not.toContain(words);
});

it('the corporate Home’s waiting states read in Spanish', () => {
  const draw = (status: 'loading' | 'unauthorized' | 'unavailable') => text(withoutB(es(<EmployeeHomeCorpView home={null} status={status} refreshing={false} onRetry={() => {}} ownTimeSlot={null} timeZone={zone}/>)));
  expect(draw('loading')).toContain('Cargando tu turno…');
  expect(draw('unauthorized')).toContain('Tu sesión terminó. Inicia sesión de nuevo para ver tu turno.');expect(draw('unauthorized')).toContain('Iniciar sesión');
  expect(draw('unavailable')).toContain('No pudimos cargar Inicio.');expect(draw('unavailable')).toContain('Intentar de nuevo');
  expect(draw('unavailable')).not.toContain('Try again');
});

it('the v5 Home and the original Home read in Spanish', () => {
  const quiet = text(es(<EmployeeHomeQuietView home={projectEmployeeHome(snapshot(attention))} status="ready" refreshing={false} onRetry={() => {}} ownTimeSlot={null} displayName="Alexandra" timeZone={zone} week={week} teamMessage/>));
  for (const words of ['Buenos días, Alexandra', 'Próximo turno', 'Pendiente para ti', 'Confirma tu horario', 'Equipo de hoy', 'Enviar mensaje al equipo de hoy', 'Esta semana', 'Mañana']) expect(quiet).toContain(words);
  for (const words of ['Good morning', 'Needs you', 'This week', 'Tomorrow']) expect(quiet).not.toContain(words);
  const original = text(es(<EmployeeHomeView state={{snapshot: {state: 'ready', observedAt: at, validForMs: 45000, home: {state: 'ready', allSet: false, snapshot: snapshot(attention)}}, refreshing: false, paused: false}} timeAuthority={'b'.repeat(64)} authority={'a'.repeat(64)} onRetry={() => {}}/>));
  for (const words of ['Tu horario', 'Próximo turno', 'Necesita tu atención', 'Horario publicado', 'Semana del', 'Revisión requerida', 'Ver horario']) expect(original).toContain(words);
  for (const words of ['Your schedule', 'Needs your attention', 'Week of', 'View schedule']) expect(original).not.toContain(words);
});

it('the Signature Home (UI preview, language passed as a prop) reads in Spanish', () => {
  const plain = text(es(<EmployeeHomeReviewedView home={projectEmployeeHome(snapshot(attention))} status="ready" refreshing={false} onRetry={() => {}} ownTimeSlot={null} displayName="Alexandra" timeZone={zone} lang="es"/>));
  for (const words of ['Buenos días', 'Pendientes', 'Actividad reciente', 'Revisa tu horario', 'Próximos turnos', 'Ver horario', 'Por revisar', 'Actualizar Inicio']) expect(plain).toContain(words);
  for (const words of ['Good morning', 'To do', 'Recent activity', 'Coming up', 'Refresh home']) expect(plain).not.toContain(words);
});
