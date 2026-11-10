import { afterEach, expect, it, vi } from 'vitest';
import { runInNewContext } from 'node:vm';
import { readThemeChoice, writeThemeChoice, THEME_KEY, THEME_SCRIPT } from './theme';

// Review B1 (NV-067, Nov 10, 2026): Direction B is light only. A device that saved Dark or System earlier must load
// Light, and the stored choice is cleared; the old dark/system behaviour these tests covered is retired.
afterEach(() => vi.unstubAllGlobals());

function bootstrap(stored: string | null, darkDevice: boolean, blocked = false) {
  const attrs: Record<string, string> = {}, removed: string[] = [];
  runInNewContext(THEME_SCRIPT, {
    document: { documentElement: { setAttribute: (key: string, value: string) => { attrs[key] = value; } } },
    localStorage: { getItem: () => stored, removeItem: (key: string) => { if (blocked) throw Error('blocked'); removed.push(key); } },
    window: { matchMedia: () => ({ matches: darkDevice }) },
  });
  return { attrs, removed };
}

it.each([[null, false], ['dark', true], ['system', true], ['light', false]] as const)('loads Light whatever was stored (%s) and clears it', (stored, dark) => {
  const page = bootstrap(stored, dark);
  expect(page.attrs).toEqual({ 'data-theme': 'light', 'data-theme-choice': 'light' });
  expect(page.removed).toEqual([THEME_KEY]);
});
it('still loads Light when storage is blocked', () => {
  expect(bootstrap('dark', true, true).attrs['data-theme']).toBe('light');
});
it('reads Light and a write applies Light', () => {
  const attrs: Record<string, string> = {}, removed: string[] = [];
  vi.stubGlobal('window', { localStorage: { removeItem: (key: string) => removed.push(key) } });
  vi.stubGlobal('document', { documentElement: { setAttribute: (key: string, value: string) => { attrs[key] = value; } } });
  expect(readThemeChoice()).toBe('light');
  writeThemeChoice('dark');
  expect(attrs['data-theme']).toBe('light');
  expect(removed).toEqual([THEME_KEY]);
});
