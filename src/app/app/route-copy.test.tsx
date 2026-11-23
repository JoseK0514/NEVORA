// Signed-in Spanish (es-rest): the small routes' own words (titles, closed and unavailable notices) and Home's route words
// carry every entry in both languages, and the pages draw them in the person's language.
import {createElement, type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
rs.mock('next/link', () => ({default: ({children, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {prefetch?: boolean}) => createElement('a', props, children)}));
rs.mock('@/lib/i18n/page-lang.server', () => ({readPageLang: async () => 'es'}));
rs.mock('@/lib/auth/session', () => ({
  requireSession: async () => ({id: 'fictional', role: 'OWNER', firstName: 'Ana', lastName: 'Colón'}),
  getSession: async () => ({id: 'fictional', role: 'EMPLOYEE', firstName: 'Ana', lastName: 'Colón'}),
  requireSessionMutationProof: async () => ({employee: {id: 'fictional', role: 'OWNER'}, sessionTokenHash: 'a'.repeat(64)}),
}));
import {ROUTE_COPY, esDayRange} from './route-copy';
import {HOME_PAGE_COPY} from './home-page-copy';
import MyTimePage, {generateMetadata as myTimeTitle} from './my-time/page';
import {generateMetadata as updatesTitle} from './updates/page';

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/[\s ]+/g, ' ').trim();

it('has a Spanish entry for every English one', () => {
  expect(Object.keys(ROUTE_COPY.es).sort()).toEqual(Object.keys(ROUTE_COPY.en).sort());
  expect(Object.keys(HOME_PAGE_COPY.es).sort()).toEqual(Object.keys(HOME_PAGE_COPY.en).sort());
});

it('writes Spanish dates and the payday line the voice guide way', () => {
  expect(esDayRange('2026-11-30', '2026-12-06')).toBe('30 nov – 6 dic');
  expect(ROUTE_COPY.es.scheduledPayday('viernes, 11 dic', '30 nov – 6 dic')).toBe('Día de pago programado: viernes, 11 dic por 30 nov – 6 dic');
  expect(HOME_PAGE_COPY.es.welcome('Ana')).toBe('Hola de nuevo, Ana');
});

it('names the tabs and the closed My time page in Spanish', async () => {
  expect((await myTimeTitle()).title).toBe('Tiempo');
  expect((await updatesTitle()).title).toBe('Avisos');
  const out = text(renderToStaticMarkup(await MyTimePage()));
  for (const words of ['Mi tiempo', 'Mi tiempo es para empleados', 'Las horas de tu equipo están en Tarjetas de tiempo.', 'Abrir Tarjetas de tiempo']) expect(out).toContain(words);
  expect(out).not.toContain('My time');
});
