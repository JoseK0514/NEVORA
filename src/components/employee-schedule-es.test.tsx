import {createElement, type ComponentProps, type ReactElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';

rs.mock('next/link', () => ({default: ({children, scroll: _scroll, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {scroll?: boolean; prefetch?: boolean}) => createElement('a', props, children)}));
rs.mock('next/navigation', () => ({useRouter: () => ({push: rs.fn(), replace: rs.fn(), refresh: rs.fn()})}));
rs.mock('@/app/app/schedule/acknowledge-actions', () => ({acknowledgeScheduleAction: rs.fn()}));
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {EmployeeMySchedule, type EmployeeMyScheduleProps} from './employee-my-schedule';
import {EmployeeScheduleCorp} from './employee-schedule-corp';
import {EmployeeWeeklyConfirmation} from './employee-weekly-confirmation';

/* Signed-in Spanish (Nov 23, 2026) on fictional data: Schedule (the week, the shift sheet, Open shifts), the weekly
 * confirmation, Updates, Requests and the scheduling fields render in Puerto Rico Spanish when the person reads Spanish. */
const es = (node: ReactElement) => renderToStaticMarkup(<PortalLangProvider lang="es">{node}</PortalLangProvider>);
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;|&#39;/g, '\'').replace(/\s+/g, ' ');
const shift = (id: string, date: string, startTime = '08:00', endTime = '16:00') => ({id, scheduleId: 's', employeeId: 'self', employeeName: 'Fictional Employee', locationId: 'condado', date, startTime, endTime,
  positionName: 'Barista', isDesignatedLead: false, isCalloutApproved: false, scheduleStatus: 'PUBLISHED' as const});
const base: EmployeeMyScheduleProps = {weekStart: '2026-10-26', today: '2026-10-27', observedAt: '2026-10-27T10:00:00Z', timeZone: 'America/Puerto_Rico', state: 'published', lang: 'es',
  shifts: [shift('a', '2026-10-27'), shift('b', '2026-10-28'), shift('c', '2026-10-30', '22:00', '06:00')], locations: [{id: 'condado', shortName: 'Condado'}], acknowledged: false,
  modules: {timeOff: true, marketplace: true, payStatements: true} as EmployeeMyScheduleProps['modules'],
  openShifts: {available: [{id: 'o1', date: '2026-10-29', startTime: '09:00', endTime: '17:00', location: 'Condado', position: 'Barista', href: '/app/exchange/o1'}], requested: []}};

it('Schedule (phone and desktop week) in Spanish: title, week, rows, times and open shifts', () => {
  const html = es(createElement(EmployeeScheduleCorp, {...base, confirmation: createElement('button', null, 'X'), confirmationNeeded: true})), out = text(html);
  for (const phrase of ['Horario', '26 oct–1 nov', 'Confirma esta semana', '3 turnos', '8:00 a. m. – 4:00 p. m.', 'Condado', 'Próximos', 'Turnos disponibles', 'Disponibilidad', 'Termina sáb, 31 oct', 'Empieza en 2 h'])
    expect(out, phrase).toContain(phrase);
  expect(html).toContain('aria-label="Semana anterior"');expect(html).toContain('aria-label="martes, 27 de octubre, hoy, turno asignado"');
  for (const phrase of ['Schedule', 'Coming up', 'Confirm this week', 'Open shifts', 'Location unavailable', 'Previous week', ' AM', ' PM', 'Tomorrow', 'Availability', 'Starts in']) expect(html, phrase).not.toContain(phrase);
});

it('the shift sheet in Spanish: the panel, its facts and the ways to change it', () => {
  const out = text(es(createElement(EmployeeScheduleCorp, {...base, selectedShift: 'b'})));
  for (const phrase of ['Mañana, 28 oct', 'Listo', 'Cambiar con alguien', 'Ofrecer para cubrir', 'No puedo trabajar este turno', 'Le avisa a tu gerente enseguida', 'Sigue siendo tu turno'])
    expect(out, phrase).toContain(phrase);
  for (const phrase of ['Done', 'Swap with someone', 'Offer for cover', 'Tells your manager']) expect(out, phrase).not.toContain(phrase);
});

it('the Lead week (v5) and Open shifts in Spanish', () => {
  const lead = text(es(createElement(EmployeeMySchedule, {...base, selectedShift: 'a'})));
  for (const phrase of ['Horario', 'Mis turnos', 'Turnos disponibles · 1', 'Localidad', 'Puesto', 'Cambiar este turno', 'Cambiar con un compañero', 'Ofrecerlo para cubrir', '8 horas', 'hora de Puerto Rico'])
    expect(lead, phrase).toContain(phrase);
  for (const phrase of ['My shifts', 'Change this shift', 'Location', 'hours']) expect(lead, phrase).not.toContain(phrase);
  const open = text(es(createElement(EmployeeScheduleCorp, {...base, view: 'open'})));
  for (const phrase of ['Turnos en tus localidades que puedes tomar', 'Tomar', 'Tu gerente confirma antes de que el turno sea tuyo']) expect(open, phrase).toContain(phrase);
  expect(open).not.toContain('Pick up');
  const empty = text(es(createElement(EmployeeScheduleCorp, {...base, state: 'unpublished', shifts: [], unpublishedLocationIds: ['condado']})));
  expect(empty).toContain('Condado todavía no ha publicado esta semana. Los turnos que ves están publicados. Un día vacío todavía no es un día libre.');
  const failed = text(es(createElement(EmployeeScheduleCorp, {...base, state: 'unavailable'})));
  expect(failed).toContain('No pudimos cargar tu horario.');expect(failed).toContain('Intentar de nuevo');
});

it('the weekly confirmation in Spanish before it is ready', () => {
  const intent = {operationId: 'op', authority: 'a'.repeat(64)} as ComponentProps<typeof EmployeeWeeklyConfirmation>['intent'];
  expect(text(es(createElement(EmployeeWeeklyConfirmation, {weekStart: '2026-10-26', expectedRevisionId: 'r', intent})))).toContain('Preparando la confirmación…');
  const quiet = es(createElement(EmployeeWeeklyConfirmation, {weekStart: '2026-10-26', expectedRevisionId: 'r', intent, quiet: true}));
  expect(quiet).toContain('aria-label="Confirmar horario, preparando"');expect(text(quiet)).toContain('Confirmar');expect(quiet).not.toContain('Confirm schedule');
});
