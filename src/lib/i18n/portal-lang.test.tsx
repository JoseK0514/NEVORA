import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from '@rstest/core';
import { PortalLangProvider, usePortalLang, type PortalLang } from './portal-lang';

function Probe() { return <p>{usePortalLang()}</p>; }
const render = (lang?: PortalLang | string) => renderToStaticMarkup(lang === undefined
  ? <Probe />
  : <PortalLangProvider lang={lang as PortalLang}><Probe /></PortalLangProvider>);

it('gives client components the person’s language from the layout', () => {
  expect(render('es')).toBe('<p>es</p>');
  expect(render('en')).toBe('<p>en</p>');
});

it('is English outside the provider and for anything that isn’t a supported language', () => {
  expect(render()).toBe('<p>en</p>');
  expect(render('fr')).toBe('<p>en</p>');
});
