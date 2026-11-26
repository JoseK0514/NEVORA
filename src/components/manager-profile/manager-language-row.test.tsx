import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from '@rstest/core';
import { ManagerLanguageRow } from './manager-language-row';

// Jose, Nov 26, 2026: Owners and Managers get the same language setting as Employees.
describe('the Owner and Manager language row', () => {
  it('offers English and Español with the saved one pressed, in English', () => {
    const html = renderToStaticMarkup(<ul><ManagerLanguageRow lang="en" /></ul>);
    expect(html).toContain('>Language</b>');
    expect(html).toContain('Choose your account’s language.');
    expect(html).toMatch(/lang="en" aria-pressed="true"[^>]*>English/);
    expect(html).toMatch(/lang="es" aria-pressed="false"[^>]*>Español/);
    expect(html).toContain('aria-labelledby="pmp-language"');
  });
  it('says the same in Spanish', () => {
    const html = renderToStaticMarkup(<ul><ManagerLanguageRow lang="es" /></ul>);
    expect(html).toContain('>Idioma</b>');
    expect(html).toContain('Elige el idioma de tu cuenta.');
    expect(html).toMatch(/lang="es" aria-pressed="true"[^>]*>Español/);
  });
});
