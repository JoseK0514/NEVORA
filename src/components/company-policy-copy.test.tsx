// Signed-in Spanish (es-rest, Nov 23, 2026): Company policies holds the same words in English and Spanish, and renders
// Puerto Rico Spanish (history dates included) when the person's language is Spanish.
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
import {projectCompanyPolicyHistory} from '../lib/business-improvements/company-policies/history';
import {policyUIRows} from '../test/fixtures/company-policy-history-ui';
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {COMPANY_POLICY_COPY} from './company-policy-copy';
import {CompanyPolicyEditor} from './company-policy-editor';
rs.mock('next/navigation', () => ({useRouter: () => ({refresh: () => {}})}));
const paths = (value: unknown, prefix = ''): string[] => value && typeof value === 'object' && !Array.isArray(value)
  ? Object.entries(value).flatMap(([key, inner]) => paths(inner, `${prefix}${key}.`)) : [prefix];
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/[\s ]+/g, ' ').trim();

it('holds the same keys in English and Spanish', () => {
  expect(paths(COMPANY_POLICY_COPY.es).sort()).toEqual(paths(COMPANY_POLICY_COPY.en).sort());
  expect(COMPANY_POLICY_COPY.es.days).toHaveLength(7);
});

it('renders the policies editor in Puerto Rico Spanish', () => {
  const editor = createElement(CompanyPolicyEditor, {history: projectCompanyPolicyHistory(policyUIRows()), locations: [{id: 'loc-1', name: 'Condado', active: true}], timeZone: 'America/Puerto_Rico'});
  const es = text(renderToStaticMarkup(<PortalLangProvider lang="es">{editor}</PortalLangProvider>));
  for (const words of ['Aplica a', 'Todas las localidades', 'Avísame sobre', 'Llegadas tarde', 'Cerca de horas extra', 'Nunca cambian el pago.', 'Registros',
    'Configuración laboral', 'Solo el dueño', 'por hora', 'Historial', 'Revisión 3', 'Esta versión no se puede usar.', 'Actualizar historial de políticas'])
    expect(es).toContain(words);
  expect(es).toMatch(/\d{1,2} (ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic), \d{1,2}:\d{2} (a|p)\. m\./);
  for (const english of ['Applies to', 'Late arrivals', 'Labor settings', 'per hour', 'Revision 3', ' AM', ' PM']) expect(es).not.toContain(english);
  // English stays exactly as it was.
  const en = text(renderToStaticMarkup(editor));
  for (const words of ['Applies to', 'Tell me about', 'Late arrivals', 'They never change pay.', 'Labor settings', 'Revision 3']) expect(en).toContain(words);
});
