// Signed-in Spanish (es-rest): the Branding editor carries every word in both languages.
import * as actualNavigation from 'next/navigation' with { rstest: 'importActual' };
import {createElement, type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
rs.mock('next/link', () => ({default: ({children, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {prefetch?: boolean}) => createElement('a', props, children)}));
rs.mock('next/navigation', () => ({...actualNavigation, useRouter: () => ({refresh() {}, push() {}}), usePathname: () => '/app/settings/branding'}));
import {PortalLangProvider} from '@/lib/i18n/portal-lang';
import {BRAND_COPY} from './brand-copy';
import {BrandEditor} from './brand-editor';

const keys = (value: object): string[] => Object.entries(value).flatMap(([key, inner]) =>
  inner && typeof inner === 'object' ? keys(inner).map(child => `${key}.${child}`) : [key]).sort();
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/[\s ]+/g, ' ').trim();

it('has a Spanish entry for every English one', () => {
  expect(keys(BRAND_COPY.es)).toEqual(keys(BRAND_COPY.en));
});

it('draws the Branding editor in Puerto Rico Spanish, and English by default', () => {
  const props = {workspaceName: 'Café Fictional', revision: 1, seed: null, logoAssetId: null, history: [], timeZone: 'America/Puerto_Rico'};
  const es = text(renderToStaticMarkup(<PortalLangProvider lang="es"><BrandEditor {...props} /></PortalLangProvider>));
  for (const words of ['Turquesa', 'Ninguno', 'Subir', 'Lo que ve tu equipo', 'Turno de hoy', '8:00 a. m. – 4:00 p. m.', 'Marca entrada en la tableta de Calle Principal', 'Usar turquesa NEVORA'])
    expect(es).toContain(words);
  for (const english of ['Upload', 'What your team sees', 'Today’s shift', 'Clock in', 'AM']) expect(es).not.toContain(english);
  const en = text(renderToStaticMarkup(<BrandEditor {...props} />));
  expect(en).toContain('Clock in on the Main Street tablet');
});
