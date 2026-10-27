import { afterEach, expect, it, vi } from 'vitest';
import { runInNewContext } from 'node:vm';
import { readThemeChoice, writeThemeChoice, THEME_KEY, THEME_SCRIPT } from './theme';

function stub(storage: Partial<Storage>, attrs: Record<string, string> = {}) {
  vi.stubGlobal('window', { localStorage: storage });
  vi.stubGlobal('document', { documentElement: { setAttribute: (k: string, v: string) => { attrs[k] = v; } } });
  return attrs;
}
afterEach(() => vi.unstubAllGlobals());

it('defaults to light when no valid choice is stored, including blocked storage', () => {
  stub({ getItem: () => null });
  expect(readThemeChoice()).toBe('light');
  stub({ getItem: () => 'dark' });
  expect(readThemeChoice()).toBe('dark');
  stub({ getItem: () => 'purple' });
  expect(readThemeChoice()).toBe('light');
  stub({ getItem: () => { throw new Error('blocked'); } });
  expect(readThemeChoice()).toBe('light');
  stub({ getItem: () => 'system' });
  expect(readThemeChoice()).toBe('system');
});

it('stores every explicit choice, including system, and applies a fixed theme when storage is blocked', () => {
  const calls: string[] = [];
  stub({ setItem: (k, v) => { calls.push(`set ${k}=${v}`); }, removeItem: k => { calls.push(`remove ${k}`); } });
  writeThemeChoice('dark');
  writeThemeChoice('system');
  writeThemeChoice('light');
  expect(calls).toEqual([`set ${THEME_KEY}=dark`, `set ${THEME_KEY}=system`, `set ${THEME_KEY}=light`]);
  const attrs = stub({ setItem: () => { throw new Error('blocked'); } });
  writeThemeChoice('dark');
  expect(attrs['data-theme']).toBe('dark');
});

it('ships an inline script that sets data-theme before first paint from the stored key', () => {
  expect(THEME_SCRIPT).toContain(THEME_KEY);
  expect(THEME_SCRIPT).toContain("setAttribute('data-theme'");
  expect(THEME_SCRIPT).toContain('prefers-color-scheme: dark');
});

function bootstrap(stored: string | null, darkDevice: boolean, blocked = false) {
  const attrs: Record<string, string> = {};
  const media = { matches: darkDevice, addEventListener: (_: string, listener: () => void) => { onDeviceChange = listener; } };
  let onDeviceChange = () => {}, onStorageChange = (_: {key: string}) => {};
  runInNewContext(THEME_SCRIPT, {
    document: { documentElement: { setAttribute: (key: string, value: string) => { attrs[key] = value; } } },
    localStorage: { getItem: () => { if (blocked) throw Error('blocked'); return stored; } },
    window: { matchMedia: () => media, addEventListener: (_: string, listener: typeof onStorageChange) => { onStorageChange = listener; } },
  });
  return {
    attrs,
    deviceChange(dark: boolean) { media.matches = dark; onDeviceChange(); },
    storageChange(value: string | null) { stored = value; onStorageChange({key: THEME_KEY}); },
  };
}

it.each([null, 'invalid'])('starts light on a dark device with unselected/invalid preference %s', stored => {
  const page = bootstrap(stored, true);
  expect(page.attrs).toEqual({'data-theme': 'light', 'data-theme-choice': 'light'});
  page.deviceChange(false);
  page.deviceChange(true);
  expect(page.attrs['data-theme']).toBe('light');
});

it('starts light on a dark device if browser storage is unavailable', () => {
  expect(bootstrap(null, true, true).attrs['data-theme']).toBe('light');
});

it.each([['light', true], ['dark', false]] as const)('honors an explicit %s choice despite device changes', (choice, darkDevice) => {
  const page = bootstrap(choice, darkDevice);
  expect(page.attrs['data-theme']).toBe(choice);
  page.deviceChange(!darkDevice);
  expect(page.attrs['data-theme']).toBe(choice);
});

it('follows device changes only when system was explicitly selected', () => {
  const page = bootstrap('system', true);
  expect(page.attrs).toEqual({'data-theme': 'dark', 'data-theme-choice': 'system'});
  page.deviceChange(false);
  expect(page.attrs['data-theme']).toBe('light');
});

it('syncs explicit choices across tabs and returns to light when the preference is removed', () => {
  const page = bootstrap(null, true);
  page.storageChange('dark');
  expect(page.attrs['data-theme']).toBe('dark');
  page.storageChange('light');
  expect(page.attrs['data-theme']).toBe('light');
  page.storageChange('system');
  expect(page.attrs['data-theme']).toBe('dark');
  page.storageChange(null);
  expect(page.attrs).toEqual({'data-theme': 'light', 'data-theme-choice': 'light'});
});
