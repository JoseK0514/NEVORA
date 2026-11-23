// Signed-in Spanish: the provider sets <html lang> to the person's language (screen readers pick their voice from it)
// and puts the previous value back when the app unmounts. The effect is run directly; no DOM is needed.
import * as actualReact from 'react' with { rstest: 'importActual' };
import { afterEach, expect, it, rs } from '@rstest/core';

const effects = rs.hoisted(() => ({ cleanups: [] as Array<void | (() => void)> }));
rs.mock('react', () => ({ ...actualReact, useEffect: (run: () => void | (() => void)) => { effects.cleanups.push(run()); } }));
const { PortalLangProvider } = await import('./portal-lang');

afterEach(() => { effects.cleanups = []; rs.unstubAllGlobals(); });

it('sets <html lang> to the person’s language and restores it when the app unmounts', () => {
  const root = { lang: 'en' };
  rs.stubGlobal('document', { documentElement: root });
  PortalLangProvider({ lang: 'es', children: null });
  expect(root.lang).toBe('es');
  for (const cleanup of effects.cleanups) cleanup?.();
  expect(root.lang).toBe('en');
});

it('never writes anything but en or es', () => {
  const root = { lang: 'es' };
  rs.stubGlobal('document', { documentElement: root });
  PortalLangProvider({ lang: 'fr' as never, children: null });
  expect(root.lang).toBe('en');
});
