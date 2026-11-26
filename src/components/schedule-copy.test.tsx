// Signed-in Spanish (es-rest): the Schedule's shared parts have a Spanish entry for every English word, and render in
// Puerto Rico Spanish inside the person's language.
import {createElement, type ComponentProps, type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
rs.mock('next/link', () => ({default: ({children, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {prefetch?: boolean}) => createElement('a', props, children), useLinkStatus: () => ({pending: false})}));
rs.mock('next/navigation', () => ({useRouter: () => ({push() {}, refresh() {}}), usePathname: () => '/app/schedule'}));
rs.mock('@/app/app/schedule/actions', () => ({publishScheduleAction: async () => ({})}));
rs.mock('@/app/app/schedule/generation-actions', () => ({generateWeekAction: async () => ({status: 'idle', message: ''}), clearGenerationExclusionAction: async () => ({status: 'idle', message: ''})}));
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {SCHEDULE_COPY, esDay, esTime} from './schedule-copy';
import {keyPaths} from './copy-key-paths.test-support';
import {ScheduleShiftForm} from './schedule-shift-form';
import {SchedulePublicationChange} from './schedule-publication-change';
import {SchedulePublicationControls} from './schedule-publication-controls';
import {ScheduleCoverPick} from './schedule-cover-pick';
import {ScheduleCopyForm} from './schedule-copy-form';

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/[\s ]+/g, ' ').trim();
const es = (node: ReactNode) => text(renderToStaticMarkup(<PortalLangProvider lang="es">{node}</PortalLangProvider>));
const en = (node: ReactNode) => text(renderToStaticMarkup(node));


it('has a Spanish entry for every English word', () => {
  expect(keyPaths(SCHEDULE_COPY.es)).toEqual(keyPaths(SCHEDULE_COPY.en));
});

it('writes Spanish days and times the voice guide way', () => {
  expect(esDay('2026-10-14').replace(/ /g, ' ')).toBe('mié, 14 oct');
  expect(esTime('06:00')).toBe('6:00 a.\u00a0m.');
  expect(esTime('14:00')).toBe('2:00 p.\u00a0m.');
});

const formProps = {mode: 'add' as const, formId: 'f', action: async () => ({ok: true}) as never, employees: [], positions: [], locations: [{id: 'l', shortName: 'Condado'}],
  weekStart: '2026-12-07', date: '2026-12-09', startTime: '22:00', endTime: '06:00', hidden: {}, cancelHref: '/app/schedule'};

it('renders Add shift in Spanish, and in English unchanged by default', () => {
  const english = en(<ScheduleShiftForm {...formProps} />);
  for (const words of ['Add shift', 'Person', 'Choose someone', 'Location', 'Position', 'Date', 'Start', 'End', 'Shift lead', 'Save shift', 'Wed, Dec 9', '10:00 PM', 'Ends Thu, Dec 10'])
    expect(english).toContain(words);
  const spanish = es(<ScheduleShiftForm {...formProps} />);
  for (const words of ['Añadir turno', 'Persona', 'Elige a alguien', 'Localidad', 'Puesto', 'Fecha', 'Inicio', 'Fin', 'Líder del turno', 'Debe ser Dueño, Gerente o Líder.', 'Guardar turno', 'mié, 9 dic', '10:00 p. m.', 'Termina jue, 10 dic'])
    expect(spanish).toContain(words);
  for (const english of ['Add shift', 'Choose someone', 'Save', 'PM', 'Wed']) expect(spanish).not.toContain(english);
});

const before = {shiftId: 's', date: '2026-12-07', startTime: '08:00', endTime: '16:00', employeeId: 'e', locationId: 'p', positionName: 'Barista', isDesignatedLead: false, isCalloutApproved: false};

it('renders What changed in Spanish', () => {
  const node = <SchedulePublicationChange changes={[{type: 'TIME_CHANGED', before, after: {...before, startTime: '09:00'}, affectedEmployeeIds: []}] as never} locationNames={{p: 'Condado'}} />;
  expect(en(node)).toContain('What changed in your schedule New time Mon, Dec 7 9:00 AM – 4:00 PM · Barista · Condado Was 8:00 AM – 4:00 PM');
  expect(es(node)).toContain('Qué cambió en tu horario Nueva hora lun, 7 dic 9:00 a. m. – 4:00 p. m. · Barista · Condado Antes: 8:00 a. m. – 4:00 p. m.');
});

it('renders publishing in Spanish', () => {
  const spanish = es(<SchedulePublicationControls weekStart="2026-12-07" locations={[]} held={{count: 2}} />);
  expect(spanish).toContain('2 cambios sin publicar');
  expect(spanish).toContain('Revisar cambios');
  expect(es(<SchedulePublicationControls weekStart="2026-12-07" locations={[]} />)).toContain('No hay localidades activas para publicar.');
  expect(en(<SchedulePublicationControls weekStart="2026-12-07" locations={[]} held={{count: 1}} />)).toContain('1 change not published');
});

it('renders Find cover and Copy previous week in Spanish', () => {
  const people = [1, 2, 3, 4, 5].map(n => ({employeeId: `e${n}`, employeeName: `Fictional Person${n}`, detail: 'Libre', href: `/x/${n}`}));
  const spanish = es(<ScheduleCoverPick people={people} />);
  for (const words of ['Elige quién lo cubre', 'Mejor opción', 'Ver 2 más', 'Asignar']) expect(spanish).toContain(words);
  expect(renderToStaticMarkup(<PortalLangProvider lang="es"><ScheduleCoverPick people={people} /></PortalLangProvider>)).toContain('aria-label="Asignar a Fictional Person1"');
  expect(es(<ScheduleCopyForm command={{operationId: 'op', kind: 'PREVIOUS_WEEK', weekStart: '2026-12-07'} as never} actorId="a" />)).toContain('Copiar semana anterior');
  expect(en(<ScheduleCopyForm command={{operationId: 'op', kind: 'PREVIOUS_WEEK', weekStart: '2026-12-07'} as never} actorId="a" />)).toContain('Copy previous week');
});

// English flag A2 (Nov 26, 2026): the edit form's save button holds "Saving…" at its resting width in both languages.
it('reserves room for pending feedback on the shift editor in both languages, not on Add shift', () => {
  const editor = <ScheduleShiftForm {...formProps} mode="edit" />;
  const spanish = renderToStaticMarkup(<PortalLangProvider lang="es">{editor}</PortalLangProvider>);
  expect(spanish).toContain('<span aria-hidden="true">Guardando…</span>');
  expect(spanish).toContain('<span>Guardar</span>');
  expect(renderToStaticMarkup(editor)).toContain('<span aria-hidden="true">Saving…</span>');
  expect(renderToStaticMarkup(<PortalLangProvider lang="es"><ScheduleShiftForm {...formProps} /></PortalLangProvider>)).not.toContain('c-shift__save-label');
});
