import { afterEach, expect, it, vi } from 'vitest';
import { readThemeChoice, writeThemeChoice, THEME_KEY, THEME_SCRIPT } from './theme';

function stub(storage: Partial<Storage>, attrs: Record<string, string> = {}) {
  vi.stubGlobal('window', { localStorage: storage });
  vi.stubGlobal('document', { documentElement: { setAttribute: (k: string, v: string) => { attrs[k] = v; } } });
  return attrs;
}
afterEach(() => vi.unstubAllGlobals());

it('reads system when nothing is stored, the stored choice otherwise, and system on junk or blocked storage', () => {
  stub({ getItem: () => null });
  expect(readThemeChoice()).toBe('system');
  stub({ getItem: () => 'dark' });
  expect(readThemeChoice()).toBe('dark');
  stub({ getItem: () => 'purple' });
  expect(readThemeChoice()).toBe('system');
  stub({ getItem: () => { throw new Error('blocked'); } });
  expect(readThemeChoice()).toBe('system');
});

it('stores light and dark, removes the key for system, and applies the theme even when storage is blocked', () => {
  const calls: string[] = [];
  stub({ setItem: (k, v) => { calls.push(`set ${k}=${v}`); }, removeItem: k => { calls.push(`remove ${k}`); } });
  writeThemeChoice('dark');
  writeThemeChoice('system');
  expect(calls).toEqual([`set ${THEME_KEY}=dark`, `remove ${THEME_KEY}`]);
  const attrs = stub({ setItem: () => { throw new Error('blocked'); } });
  writeThemeChoice('dark');
  expect(attrs['data-theme']).toBe('dark');
});

it('ships an inline script that sets data-theme before first paint from the stored key', () => {
  expect(THEME_SCRIPT).toContain(THEME_KEY);
  expect(THEME_SCRIPT).toContain("setAttribute('data-theme'");
  expect(THEME_SCRIPT).toContain('prefers-color-scheme: dark');
});
