// Signed-in Spanish (es-rest): Availability has a Spanish entry for every English word; the editor, the team list and the
// person's page render in Puerto Rico Spanish inside the person's language and stay English by default.
import {createElement, type ComponentProps, type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
rs.mock('next/link', () => ({default: ({children, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {prefetch?: boolean}) => createElement('a', props, children), useLinkStatus: () => ({pending: false})}));
rs.mock('next/navigation', () => ({useRouter: () => ({push() {}, refresh() {}}), usePathname: () => '/app/availability', unstable_rethrow() {}, redirect() {}}));
rs.mock('@/app/app/availability/actions', () => ({saveAvailabilityAction: async () => {}, saveWeeklyAvailabilityAction: async () => {}}));
rs.mock('@/lib/i18n/page-lang.server', () => ({readPageLang: async () => (globalThis as {pageLang?: string}).pageLang ?? 'en'}));
rs.mock('@/lib/auth/session', () => ({requireSession: async () => ({id: 'fictional-self', role: 'EMPLOYEE'}), requireSessionMutationProof: async () => ({sessionTokenHash: 'h', employee: {id: 'fictional-self', role: 'EMPLOYEE'}})}));
rs.mock('@/lib/employee-view-authority.server', () => ({employeeViewAuthority: () => 'authority'}));
rs.mock('@/components/employee-mobile/planning', () => ({ResponsiveEmployeePlanning: ({children}: {children: ReactNode}) => children}));
rs.mock('@/components/employee-b/availability-b', () => ({AvailabilityB: () => null, AvailabilityStatusB: () => null, availabilitySubB: () => ''}));
rs.mock('@/components/manager-availability', () => ({ManagerAvailability: () => null}));
rs.mock('@/lib/data/workspaces', () => ({getWorkspace: async () => ({timeZone: 'America/Puerto_Rico'})}));
rs.mock('@/lib/data/availability', () => ({listAvailability: async () => [{dayOfWeek: 1, startTime: '06:00', endTime: '14:00'}]}));
rs.mock('@/lib/data/availability-submissions', () => ({getAvailabilitySubmissionStatus: async () => ({state: 'NOT_SUBMITTED', submitted: false, windowCount: 0})}));
rs.mock('@/lib/data/week-settings', () => ({getUpcomingAvailabilityWeek: async () => null, getWeekSettings: async () => null, listWeeklyAvailability: async () => []}));
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {AVAILABILITY_COPY} from './availability-copy';
import {keyPaths} from './copy-key-paths.test-support';
import {AvailabilitySignatureEditor} from './availability-signature';
import {AvailabilityTeamList} from './availability-team-list';
import AvailabilityPage from '@/app/app/availability/page';

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/[\s ]+/g, ' ').trim();
const es = (node: ReactNode) => text(renderToStaticMarkup(<PortalLangProvider lang="es">{node}</PortalLangProvider>));
const en = (node: ReactNode) => text(renderToStaticMarkup(node));

it('has a Spanish entry for every English word', () => {
  expect(keyPaths(AVAILABILITY_COPY.es)).toEqual(keyPaths(AVAILABILITY_COPY.en));
  expect(AVAILABILITY_COPY.es.days.map(([day]) => day)).toEqual(AVAILABILITY_COPY.en.days.map(([day]) => day));
});

const week = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map(day => [day, {available: day === 1, startTime: '06:00', endTime: '14:00'}])) as never;

it('renders the editor in Spanish', () => {
  const node = <AvailabilitySignatureEditor initialAvailability={week} card={{label: 'Tu semana habitual'}} note="Nota" />;
  expect(en(node)).toContain('Monday 6:00 AM – 2:00 PM');
  const spanish = es(node);
  for (const words of ['Lunes 6:00 a. m. – 2:00 p. m.', 'Martes No disponible', 'Domingo']) expect(spanish).toContain(words);
  for (const english of ['Monday', 'Not available', 'AM']) expect(spanish).not.toContain(english);
  expect(renderToStaticMarkup(<PortalLangProvider lang="es">{node}</PortalLangProvider>)).toContain('aria-label="Disponibilidad por día"');
});

it('renders the team list in Spanish', () => {
  const people = [{employeeId: 'a', employeeName: 'Fictional One', state: 'NOT_SUBMITTED' as const, submitted: false, windowCount: 0, locationName: 'Condado', windows: []},
    {employeeId: 'b', employeeName: 'Fictional Two', state: 'SUBMITTED' as const, submitted: true, windowCount: 1, locationName: 'Condado', windows: [{id: 'w', dayOfWeek: 3, startTime: '09:00', endTime: '17:00'}]}];
  const spanish = es(<AvailabilityTeamList employees={people} employeeId="b" />);
  for (const words of ['1 persona en la lista', 'Sin enviar', 'Enviada', 'mié', '9:00 a. m. – 5:00 p. m.']) expect(spanish).toContain(words);
  expect(en(<AvailabilityTeamList employees={people} employeeId="b" />)).toContain('1 person shown');
});

it('renders the person’s Availability page in Spanish, and English by default', async () => {
  const render = async (lang: string) => { (globalThis as {pageLang?: string}).pageLang = lang; const page = await AvailabilityPage({searchParams: Promise.resolve({saved: '1'})});
    return lang === 'es' ? es(page) : en(page); };
  const spanish = await render('es');
  for (const words of ['Disponibilidad', 'Para hacer tus próximos horarios', 'Se actualizó tu semana habitual.', 'Tu semana habitual', 'Cambiar una semana', 'Tu gerente usa esto para hacer el horario.', 'Lunes 6:00 a. m. – 2:00 p. m.'])
    expect(spanish).toContain(words);
  for (const english of ['Availability', 'Your usual week', 'Monday']) expect(spanish).not.toContain(english);
  const english = await render('en');
  for (const words of ['Availability', 'Used to build your future schedules', 'Your usual week has been updated.', 'Change one week', 'Monday 6:00 AM – 2:00 PM']) expect(english).toContain(words);
});
