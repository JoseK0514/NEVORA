import { afterEach, expect, it, vi } from 'vitest';
import { runInNewContext } from 'node:vm';
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

function mountedTheme() {
  const values = new Map<string, string>(), attrs: Record<string, string> = {};
  const frames: FrameRequestCallback[] = [];
  const media = Object.assign(new EventTarget(), { matches: false });
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) };
  const deviceWindow = Object.assign(new EventTarget(), { localStorage: storage, matchMedia: () => media, requestAnimationFrame: (callback: FrameRequestCallback) => frames.push(callback) });
  const pageDocument = { documentElement: { setAttribute: (key: string, value: string) => { attrs[key] = value; } } };
  vi.stubGlobal('window', deviceWindow); vi.stubGlobal('document', pageDocument);
  runInNewContext(THEME_SCRIPT, { window: deviceWindow, document: pageDocument, localStorage: storage });
  return { attrs, media, storage, deviceWindow, frame: () => { for (const callback of frames.splice(0)) callback(0); } };
}

it('reconciles System at the next paint when native media changes coalesce around the choice', () => {
  const device = mountedTheme();
  writeThemeChoice('dark'); device.frame();
  device.media.matches = true;
  writeThemeChoice('system');
  expect(device.attrs['data-theme']).toBe('dark');
  // Light -> dark -> light between media-reporting steps need not emit change.
  device.media.matches = false;
  device.frame();
  expect(device.attrs['data-theme']).toBe('light');
  expect(device.attrs['data-theme-choice']).toBe('system');
  expect(device.storage.getItem(THEME_KEY)).toBeNull();
});

it.each(['explicit', 'another tab'])('a pending System reconciliation respects the latest choice from %s', source => {
  const device = mountedTheme(); device.media.matches = true;
  writeThemeChoice('system');
  if (source === 'explicit') writeThemeChoice('light');
  else { device.storage.setItem(THEME_KEY, 'light'); device.deviceWindow.dispatchEvent(Object.assign(new Event('storage'), { key: THEME_KEY })); }
  device.frame();
  expect(device.attrs['data-theme']).toBe('light');
  expect(device.attrs['data-theme-choice']).toBe('light');
  expect(device.storage.getItem(THEME_KEY)).toBe('light');
});
