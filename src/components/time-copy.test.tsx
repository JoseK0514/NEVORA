// Signed-in Spanish (es-rest): the time-off decision parts and the correction comparison carry every word in both languages.
import * as actualNavigation from 'next/navigation' with { rstest: 'importActual' };
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
rs.mock('next/navigation', () => ({...actualNavigation, useRouter: () => ({refresh: () => {}, push: () => {}})}));
rs.mock('@/app/app/requests/actions', () => ({withdrawTimeOffAction: rs.fn(), reviewTimeOffAction: rs.fn()}));
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {TIME_COPY} from './time-copy';
import {TimeOffWithdrawal} from './time-off-withdrawal';
import {TimeOffDecisionForm} from './time-off-decision-form';
import {CorrectionComparison, PriorCorrectionDecisions} from './time-correction-context';

const keys = (value: object): string[] => Object.entries(value).flatMap(([key, inner]) =>
  inner && typeof inner === 'object' ? keys(inner).map(child => `${key}.${child}`) : [key]).sort();
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/[\s ]+/g, ' ').trim();

it('has a Spanish entry for every English one', () => {
  expect(keys(TIME_COPY.es)).toEqual(keys(TIME_COPY.en));
});

it('asks to withdraw a request in Spanish', () => {
  const es = text(renderToStaticMarkup(<PortalLangProvider lang="es"><TimeOffWithdrawal requestId="r1" dateLabel="7–8 dic" /></PortalLangProvider>));
  expect(es).toContain('Retirar solicitud');
  expect(es).toContain('Te pediremos que confirmes primero.');
  expect(es).not.toContain('Withdraw');
  const en = text(renderToStaticMarkup(<TimeOffWithdrawal requestId="r1" dateLabel="Dec 7 – 8" />));
  expect(en).toContain('Withdraw request');
});

it('keeps the decision form’s English and Spanish apart', () => {
  const es = renderToStaticMarkup(<PortalLangProvider lang="es"><TimeOffDecisionForm><button type="submit">x</button></TimeOffDecisionForm></PortalLangProvider>);
  expect(es).toContain('<button');
});

it('compares a correction in Spanish with Spanish times', () => {
  const context = {state: 'confirmed' as const, sourceKind: 'RECORDED' as const, startAt: '2026-11-03T13:02:00Z', endAt: '2026-11-03T21:32:00Z', totalDecisions: 1,
    decisions: [{status: 'APPROVED', decidedAt: '2026-11-04T13:00:00Z', startAt: '2026-11-03T13:02:00Z', endAt: '2026-11-03T21:32:00Z', note: null}]} as never;
  const es = text(renderToStaticMarkup(<>
    <CorrectionComparison lang="es" recordedStartAt="2026-11-03T13:02:00Z" recordedEndAt="2026-11-03T21:32:00Z" context={context} zone="America/Puerto_Rico"
      proposedStartAt="2026-11-03T12:30:00Z" proposedEndAt="2026-11-03T21:32:00Z" />
    <PriorCorrectionDecisions lang="es" context={context} zone="America/Puerto_Rico" />
  </>));
  for (const words of ['Registrado', 'Vigente ahora', 'Tiempo registrado · sin ajuste aprobado', 'Horas en', 'Decisiones anteriores · 1 de 1', 'Aprobada', 'nov', 'a. m.']) expect(es).toContain(words);
  for (const english of ['Recorded', 'Current effective', 'Times in', 'AM', 'PM']) expect(es).not.toContain(english);
  const en = text(renderToStaticMarkup(<CorrectionComparison recordedStartAt="2026-11-03T13:02:00Z" recordedEndAt="2026-11-03T21:32:00Z" context={context} zone="America/Puerto_Rico" />));
  expect(en).toContain('Recorded');expect(en).toContain('9:02 AM');
});
