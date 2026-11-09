import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { ClockerLanguageToggle, ClockerPresentation } from './clocker-language';

// Direction B (Nov 8, 2026): the Signature look's Spanish second lines (CLOCKER_ES and <Es>) were retired with it. The kiosk
// keeps the one complete-language switch, remembered per tablet; these checks replace the second-line checks.
it('offers Spanish from English and English from Spanish, named in the other language', () => {
  const en = renderToStaticMarkup(<ClockerPresentation initialLocale="en"><ClockerLanguageToggle/></ClockerPresentation>);
  expect(en).toContain('aria-label="Switch language to Spanish"');expect(en).toContain('<span lang="es">Español</span>');
  const es = renderToStaticMarkup(<ClockerPresentation initialLocale="es"><ClockerLanguageToggle/></ClockerPresentation>);
  expect(es).toContain('aria-label="Cambiar idioma a inglés"');expect(es).toContain('<span lang="en">English</span>');
});
it('no longer renders Spanish second lines', () => {
  const html = renderToStaticMarkup(<ClockerPresentation initialLocale="en"><ClockerLanguageToggle/></ClockerPresentation>);
  expect(html).not.toContain('clocker-es');expect(html).not.toContain('aria-pressed');
});
