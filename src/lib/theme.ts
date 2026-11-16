/** Appearance defaults to Light. An explicit choice lives on this device only: "system" follows the
 * phone or computer setting, "light" and "dark" fix it. The root layout's THEME_SCRIPT applies it before first
 * paint by setting data-theme on <html>; Signature surfaces read their dark tokens from that attribute. */
export type ThemeChoice = 'system' | 'light' | 'dark';
export const THEME_KEY = 'nv-theme';
export const DEFAULT_THEME: ThemeChoice = 'light';

/** Review B1 (NV-067): Direction B is light only. The script fixes Light before first paint and clears a stored
 * choice, so a device that once saved Dark (or System on a dark phone) no longer gets data-theme="dark". */
export const THEME_SCRIPT = `(function(){var d=document.documentElement;try{localStorage.removeItem('${THEME_KEY}');}catch(e){}d.setAttribute('data-theme','light');d.setAttribute('data-theme-choice','light');window.__nvApplyTheme=function(){d.setAttribute('data-theme','light');};})();`;

/** Light only: there is no stored choice to read any more. */
export function readThemeChoice(): ThemeChoice { return DEFAULT_THEME; }

/** Light only: any request applies Light and forgets an old stored choice. */
export function writeThemeChoice(_choice: ThemeChoice) {
  try { window.localStorage.removeItem(THEME_KEY); } catch { /* storage blocked: nothing stored */ }
  document.documentElement.setAttribute('data-theme', 'light');
}
