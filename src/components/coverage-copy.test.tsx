// Signed-in Spanish (es-rest): Find cover, Review replacement and the coverage figures have a Spanish entry for every English
// word and render in Puerto Rico Spanish inside the person's language; English is unchanged by default.
import {createElement, type ComponentProps, type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
rs.mock('next/link', () => ({default: ({children, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {prefetch?: boolean}) => createElement('a', props, children), useLinkStatus: () => ({pending: false})}));
rs.mock('next/navigation', () => ({useRouter: () => ({push() {}, refresh() {}}), usePathname: () => '/app/schedule/coverage', useSearchParams: () => new URLSearchParams(), unstable_rethrow() {}}));
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {COVERAGE_COPY} from './coverage-copy';
import {keyPaths} from './copy-key-paths.test-support';
import {CoverageAssistant} from './coverage-assistant';
import {CoverageReview, unconfirmedCheck} from './coverage-review';
import {CoverageFigures} from './coverage-minutes/coverage-minutes';

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/[\u2060\u2009]/g, '').replace(/[\s\u00a0\u202f]+/g, ' ').trim();
const es = (node: ReactNode) => text(renderToStaticMarkup(<PortalLangProvider lang="es">{node}</PortalLangProvider>));
const en = (node: ReactNode) => text(renderToStaticMarkup(node));

it('has a Spanish entry for every English word', () => {
  expect(keyPaths(COVERAGE_COPY.es)).toEqual(keyPaths(COVERAGE_COPY.en));
});

const assistant = {date: '2026-12-09', startTime: '22:00', endTime: '06:00', locationName: 'Condado', designatedLead: true, backHref: '/app/schedule', status: 'READY' as const,
  candidates: [{employeeId: 'a', employeeName: 'Fictional Worker', scheduledHours: 12, targetHours: 32, href: '/r/a'}]};

it('renders Find cover in Spanish', () => {
  const spanish = es(<CoverageAssistant {...assistant} />);
  for (const words of ['Buscar cobertura', 'Turno disponible', 'mié, 9 dic', 'Necesita líder del turno', 'Termina jue, 10 dic', '10:00 p. m. – 6:00 a. m.', 'Quién puede cubrir', '1 persona libre', 'esta semana', 'Revisas el turno antes de que se guarde.'])
    expect(spanish).toContain(words);
  for (const english of ['Find cover', 'Open shift', 'this week', 'PM']) expect(spanish).not.toContain(english);
  const english = en(<CoverageAssistant {...assistant} />);
  for (const words of ['Find cover', 'Open shift', 'Wed, Dec 9', 'Ends Thu, Dec 10', 'Who can cover', '1 person free']) expect(english).toContain(words);
});

it('renders Review replacement in Spanish', () => {
  const props = {mode: 'publish' as const, employeeName: 'Fictional Worker', replacedName: null, shift: {date: '2026-12-09', startTime: '09:00', endTime: '17:00'} as never, locationName: 'Condado',
    isDesignatedLead: false, weekHours: {beforeMinutes: 0, afterMinutes: 480, targetMinutes: 1920} as never, warnings: ['TARGET_HOURS_EXCEEDED'] as never, backHref: '/app/schedule', action: async () => ({ok: true}) as never, hidden: {}};
  const spanish = es(<CoverageReview {...props} />);
  for (const words of ['Revisar reemplazo', 'Turno disponible', 'mié, 9 dic', '9:00 a. m. – 5:00 p. m.', 'esta semana', '(meta', 'Pasa de su meta semanal', 'Le avisaremos a Fictional cuando publiques.', 'Publicar cambio'])
    expect(spanish).toContain(words);
  expect(en(<CoverageReview {...props} />)).toContain('We’ll notify Fictional when you publish.');
  expect(unconfirmedCheck(true, '/x', 'es').label).toBe('Revisar cobertura');
  expect(unconfirmedCheck(true, '/x').label).toBe('Check coverage');
});

it('renders the coverage figures in Spanish', () => {
  const obligation = (covered: number, required: number) => ({covered, required, percent: required ? covered / required * 100 : null});
  const coverage = {state: 'configured', staffing: obligation(60, 120), positions: obligation(0, 0), lead: obligation(0, 0)} as never;
  const spanish = es(<CoverageFigures coverage={coverage} />);
  for (const words of ['Cobertura de esta semana', 'Personal', '50%', 'No se requieren puestos ni líderes']) expect(spanish).toContain(words);
  expect(en(<CoverageFigures coverage={coverage} />)).toContain('Positions and leads aren’t required');
});
