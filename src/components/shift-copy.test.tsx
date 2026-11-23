// Signed-in Spanish (es-rest): the shift request parts have a Spanish entry for every English word and render in Puerto Rico
// Spanish inside the person's language; English stays as it was by default.
import {createElement, type ComponentProps, type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
rs.mock('next/link', () => ({default: ({children, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {prefetch?: boolean}) => createElement('a', props, children)}));
rs.mock('next/navigation', () => ({useRouter: () => ({push() {}, refresh() {}})}));
rs.mock('../app/app/schedule/settings/actions', () => ({saveShiftChangePolicyAction: async () => ({})}));
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {SHIFT_COPY} from './shift-copy';
import {keyPaths} from './copy-key-paths.test-support';
import {shiftChangeFeedback} from './shift-change-form-state';
import {ShiftChangeHistory} from './shift-change-history';
import {ShiftChangePolicyFields} from './shift-change-policy-fields';
import {ShiftReviewRecovery, shiftDraftText} from './shift-review-recovery';
import {shiftPlace} from './shift-requests-signature';

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/[\s ]+/g, ' ').trim();
const es = (node: ReactNode) => text(renderToStaticMarkup(<PortalLangProvider lang="es">{node}</PortalLangProvider>));
const en = (node: ReactNode) => text(renderToStaticMarkup(node));

it('has a Spanish entry for every English word', () => {
  expect(keyPaths(SHIFT_COPY.es)).toEqual(keyPaths(SHIFT_COPY.en));
});

it('says a request result in either language', () => {
  expect(shiftChangeFeedback({status: 'closed'} as never)).toBe('Request closed. Review its current status below.');
  expect(shiftChangeFeedback({status: 'closed'} as never, 'es')).toBe('Solicitud cerrada. Revisa su estado abajo.');
});

it('renders request history and the trade and coverage rules in Spanish', () => {
  expect(es(<ShiftChangeHistory events={null} />)).toContain('El historial de solicitudes no está disponible.');
  const policy = {swap: {mode: 'MANAGER_REVIEW', submissionAdvanceMinutes: 60, completionAdvanceMinutes: null, revision: 1}, coverage: null} as never;
  const spanish = es(<ShiftChangePolicyFields policy={policy} canEdit={false} />);
  for (const words of ['Un Dueño las fija.', 'Cambios de turno', 'Coberturas', 'Cómo se aprueban las solicitudes', 'Lo revisa un gerente', '60 minutos antes', 'Desconocido'])
    expect(spanish).toContain(words);
  for (const english of ['Trades', 'Unknown', 'minutes']) expect(spanish).not.toContain(english);
  expect(en(<ShiftChangePolicyFields policy={policy} canEdit={false} />)).toContain('Manager reviews');
});

it('copies a held edit and names a shift’s place in Spanish', () => {
  const data = new FormData(); data.set('date', '2026-12-07');
  expect(shiftDraftText(data)).toContain('Date: 2026-12-07');
  expect(shiftDraftText(data, 'es')).toContain('Fecha: 2026-12-07');
  expect(es(<ShiftReviewRecovery draft="" />)).toContain('Volver a cargar el turno');
  expect(shiftPlace({positionName: null, positionId: 'p1', locationName: 'Condado', isDesignatedLead: true} as never, undefined, 'es')).toBe('Puesto p1 · Condado · Líder del turno');
  expect(shiftPlace({positionName: null, positionId: 'p1', locationName: 'Condado', isDesignatedLead: true} as never)).toBe('Position p1 · Condado · Shift lead');
});
