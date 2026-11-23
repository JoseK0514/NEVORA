// Signed-in Spanish (es-rest): Christmas bonus hours has a Spanish entry for every English word and renders in Puerto Rico
// Spanish inside the person's language; the English, Jose's disclaimer included, is unchanged by default.
import {createElement, type ComponentProps, type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
rs.mock('next/link', () => ({default: ({children, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {prefetch?: boolean}) => createElement('a', props, children)}));
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {CHRISTMAS_BONUS_COPY} from './christmas-bonus-copy';
import {keyPaths} from './copy-key-paths.test-support';
import {CHRISTMAS_BONUS_DISCLAIMER, ChristmasBonusView} from './christmas-bonus-report';

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/[⁠ ]/g, '').replace(/[\s  ]+/g, ' ').trim();
const es = (node: ReactNode) => text(renderToStaticMarkup(<PortalLangProvider lang="es">{node}</PortalLangProvider>));
const en = (node: ReactNode) => text(renderToStaticMarkup(node));

it('has a Spanish entry for every English word, and keeps Jose’s disclaimer word for word', () => {
  expect(keyPaths(CHRISTMAS_BONUS_COPY.es)).toEqual(keyPaths(CHRISTMAS_BONUS_COPY.en));
  expect(CHRISTMAS_BONUS_DISCLAIMER).toBe('Informational only. Christmas bonus eligibility, amounts and exemptions depend on employer size and Puerto Rico law. Confirm with your payroll provider or counsel before paying.');
});

const year = {endYear: 2026, startDate: '2025-10-01', endDate: '2026-09-30', paymentStartDate: '2026-12-01', paymentEndDate: '2026-12-15', exemptionDeadline: '2026-11-15'};
const report = {year, rows: [{employeeId: 'FIC-1', name: 'Fictional Worker', status: 'REACHED', recordedNanoseconds: String(800 * 3600e9), breakNanoseconds: '0', thresholdHours: 700, hireDate: '2019-05-06', unfinalizedDays: 1, active: true}],
  summary: {reached: 1, checkBreaks: 0, notConfirmed: 0, needsHireDate: 0, peopleWithUnfinalizedDays: 1, unfinalizedDays: 1}} as never;
const choices = [{endYear: 2026}, {endYear: 2025}] as never;

it('renders the report in Spanish', () => {
  const spanish = es(<ChristmasBonusView report={report} choices={choices} />);
  for (const words of ['Horas para el bono de Navidad', 'Todas las localidades', 'Solo informativo', 'Período de pago', '1–15 dic 2026', 'Fecha límite para radicar la exención', '15 nov 2026',
    'Alcanzado', '800 h de 700 h', 'Ingresó el 6 may 2019', '1 día sin finalizar', '1 persona tiene tiempo registrado en 1 día que todavía no está en una tarjeta de tiempo finalizada.', 'Abrir Tarjetas de tiempo'])
    expect(spanish).toContain(words);
  for (const english of ['Christmas bonus hours', 'Reached', 'Hired', 'Payment window']) expect(spanish).not.toContain(english);
  const english = en(<ChristmasBonusView report={report} choices={choices} />);
  for (const words of ['Christmas bonus hours', 'Payment window', 'Dec 1–15, 2026', '800 h of 700 h', 'Hired May 6, 2019', '1 day not finalized']) expect(english).toContain(words);
});
