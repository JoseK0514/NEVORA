import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { CLOCKER_ES, Es } from './clocker-language';

it('gives every kiosk phrase a Spanish line and keeps English untouched', () => {
  for (const [en, es] of Object.entries(CLOCKER_ES)) { expect(es.trim()).not.toBe(''); expect(es).not.toBe(en); }
  expect(CLOCKER_ES['Clock In']).toBe('Marcar entrada');
  expect(CLOCKER_ES['Clock Out']).toBe('Marcar salida');
});
it('marks Spanish with lang and hides it inside buttons, whose English aria-label is the name', () => {
  expect(renderToStaticMarkup(<Es phrase="Clocked In" />)).toBe('<span class="clocker-es" lang="es">En turno</span>');
  expect(renderToStaticMarkup(<Es phrase="Clock In" inButton />)).toBe('<span class="clocker-es" lang="es" aria-hidden="true">Marcar entrada</span>');
});
