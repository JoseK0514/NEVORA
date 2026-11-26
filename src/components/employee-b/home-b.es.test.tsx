import {createElement, type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
rs.mock('next/link', () => ({default: ({children, scroll: _scroll, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {scroll?: boolean; prefetch?: boolean}) => createElement('a', props, children)}));
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {HOME_SOURCES} from '../../lib/employee-home/project';
import type {HomeSnapshot, PublishedAssignment} from '../../lib/employee-home/types';
import type {HomeWeek} from '../employee-home-quiet';
import {EmployeeHomeB, todoDeadline, type HomeBProps} from './home-b';
import {BDay, Dotted, wallTime} from './parts';
import {workCopy} from './work-copy';

/* Signed-in Spanish (Nov 23, 2026): Home (Employee and Lead) and Schedule in Puerto Rico Spanish, on fictional data:
 * Tuesday, Nov 17, 2026 at 6:00 PM in Puerto Rico. */
const at = '2026-11-17T22:00:00.000Z', zone = 'America/Puerto_Rico';
const next: PublishedAssignment = {shiftId: 'own-wed', assignmentEpisodeId: 'ep', termsRevision: 1, weekStart: '2026-11-16', date: '2026-11-18',
  startAt: '2026-11-18T13:00:00Z', endAt: '2026-11-18T21:00:00Z', locationId: 'main', locationLabel: 'Calle Loíza', positionLabel: 'Barista', designatedLead: true, publicationRevisionId: 'pub-1'};
const snapshot: HomeSnapshot = {observedAt: at, authority: 'a'.repeat(64), validForMs: 45000, timeZone: zone, publicationState: 'complete',
  sources: Object.fromEntries(HOME_SOURCES.map(key => [key, {state: 'complete', observedAt: at, version: 'v', reason: null}])) as HomeSnapshot['sources'],
  nextShift: next, currentShift: null, attention: []};
const shift = (date: string, lead: boolean) => ({id: `s-${date}`, date, startTime: '09:00', endTime: '17:00', where: 'Barista · Calle Loíza', lead});
const week = (lead: boolean): HomeWeek => ({weekStart: '2026-11-16', today: '2026-11-17', dates: Array.from({length: 7}, (_, day) => `2026-11-${16 + day}`),
  shifts: ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20'].map(date => shift(date, lead))});
const homeProps = (lead: boolean): HomeBProps => ({snapshot, partial: false, todos: [], week: week(lead), name: 'Ana', date: 'Tuesday, Nov 17', place: 'Calle Loíza', waiting: null,
  loading: false, paused: false, denied: false, refreshing: false, onRetry: () => {}, weekTodo: () => ({title: 'x', detail: 'y'}), payday: '2026-11-27', lead, team: lead,
  shortcuts: ['timeOff', 'callout', 'swap', 'fixTime'], tasks: {exact: true, allSet: true} as HomeBProps['tasks']});
const home = (lead: boolean, lang: 'en' | 'es' = 'es') => renderToStaticMarkup(<PortalLangProvider lang={lang}><EmployeeHomeB {...homeProps(lead)}/></PortalLangProvider>);
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/[  ]/g, ' ').replace(/\s+/g, ' ');

it('Employee Home in Spanish: greeting, figures, the next shift, shortcuts and Your week', () => {
  const words = text(home(false));
  for (const es of ['Hola de nuevo, Ana', 'Día de pago programado', 'en 10 días', 'Próximo turno', 'Mañana', 'Marca entrada en la tableta de Calle Loíza', 'Ahí también marcas descansos y salida',
    'Detalles del turno', 'Días libres', 'No puedo trabajar', 'Cambiar turno', 'Corregir mi tiempo', 'Tu semana', 'Programadas', 'Próximos turnos', 'Ver todos', 'Todo listo. No tienes nada pendiente ahora.',
    '9:00 a. m.', '5:00 p. m.', 'Líder de turno', '16–22 nov']) expect(words, es).toContain(es);
  for (const en of ['Welcome back', 'Scheduled payday', 'Next shift', 'Clock in on the', 'Shift details', 'Your week', 'Coming up', 'See all', 'You’re all set', ' AM', ' PM', 'Wed']) expect(words, en).not.toContain(en);
  // Dates Home formats itself read in Spanish ("mié, 18 nov", "mar 17").
  expect(words).toMatch(/mié, 18 nov/);expect(home(false)).toMatch(/<span>jue\.?<\/span>/);
});

it('Lead Home in Spanish: Today’s team and the shift lead marker', () => {
  const words = text(home(true));
  for (const es of ['Equipo de hoy', 'Enviar mensaje al equipo de hoy', 'Todos los que trabajan hoy', 'Líder de turno']) expect(words, es).toContain(es);
  expect(words).toMatch(/Lideras los \d/);
  for (const en of ['Today’s team', 'Message today’s team', 'Shift lead', 'You lead all']) expect(words, en).not.toContain(en);
});

it('Home without a language stays in English, word for word', () => {
  const words = text(home(false, 'en'));
  for (const en of ['Welcome back, Ana', 'Scheduled payday', 'in 10 days', 'Next shift', 'Clock in on the Calle Loíza tablet', 'Shift details', 'Your week', 'Coming up', 'Shift lead']) expect(words, en).toContain(en);
});

it('shared parts: the day lead, a time and the shift lead marker follow the language', () => {
  expect(renderToStaticMarkup(<BDay date="2026-11-18" lang="es"/>)).toMatch(/<span>mié\.?<\/span>/);
  expect(wallTime('13:30', 'es').replace(/[  ]/g, ' ')).toBe('1:30 p. m.');expect(wallTime('13:30')).toBe('1:30 PM');
  const lead = renderToStaticMarkup(<Dotted lang="es" text="Líder de turno · Calle Loíza"/>);
  expect(lead).toContain('<span class="eb-lead-l">Líder de turno</span><span class="eb-lead-s">Líder</span>');
});

it('keeps the full shortcut names and destinations available on Employee and Lead Home', () => {
  const {scCalloutCompact, scSwapCompact, scFixTimeCompact, scheduledPaydayCompact, allNotificationsCompact} = workCopy('es');
  expect([scheduledPaydayCompact, allNotificationsCompact]).toEqual(['Pago programado', 'Notificaciones']);
  expect([scCalloutCompact, scSwapCompact, scFixTimeCompact]).toEqual(['Ausentarme', 'Cambiar', 'Corregir']);
  for (const lead of [false, true]) {
    const spanish = home(lead);
    expect(spanish).toContain('aria-label="No puedo trabajar un turno"');
    for (const href of ['/app/schedule?intent=callout', '/app/schedule?intent=swap', '/app/my-time?view=corrections&amp;edit=new']) {
      expect(spanish).toContain('href="' + href + '"');
    }
    expect(spanish).toContain('class="eb-home-measure" aria-hidden="true">Cambiar turno</span>');
    expect(home(lead, 'en')).not.toContain('eb-home-measure');
  }
});

it('keeps the complete Spanish time together when a Home deadline wraps', () => {
  const {full, short} = todoDeadline('2026-11-30T13:00:00Z', 'America/Puerto_Rico', 'es');
  for (const line of [full, short]) expect(line).toContain('9:00\u00a0a.\u00a0m.');
});
