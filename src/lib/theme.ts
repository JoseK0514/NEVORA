/** Appearance defaults to Light. An explicit choice lives on this device only: "system" follows the
 * phone or computer setting, "light" and "dark" fix it. The root layout's THEME_SCRIPT applies it before first
 * paint by setting data-theme on <html>; Signature surfaces read their dark tokens from that attribute. */
export type ThemeChoice = 'system' | 'light' | 'dark';
export const THEME_KEY = 'nv-theme';
export const DEFAULT_THEME: ThemeChoice = 'light';

export const THEME_SCRIPT = `(function(){var d=document.documentElement,k='${THEME_KEY}',m=null;try{m=window.matchMedia('(prefers-color-scheme: dark)');}catch(e){}function c(){try{var v=localStorage.getItem(k);return v==='light'||v==='dark'||v==='system'?v:'${DEFAULT_THEME}';}catch(e){return '${DEFAULT_THEME}';}}function a(){var v=c(),dark=v==='dark'||(v==='system'&&!!(m&&m.matches));d.setAttribute('data-theme',dark?'dark':'light');d.setAttribute('data-theme-choice',v);}a();try{m&&m.addEventListener('change',a);}catch(e){}window.addEventListener('storage',function(e){if(e.key===k)a();});window.__nvApplyTheme=a;})();`;

export function readThemeChoice(): ThemeChoice {
  try { const value = window.localStorage.getItem(THEME_KEY); return value === 'light' || value === 'dark' || value === 'system' ? value : DEFAULT_THEME; } catch { return DEFAULT_THEME; }
}

export function writeThemeChoice(choice: ThemeChoice) {
  try { window.localStorage.setItem(THEME_KEY, choice); } catch { /* storage blocked: persistence is unavailable */ }
  const apply = (window as Window & { __nvApplyTheme?: () => void }).__nvApplyTheme;
  if (apply) {
    apply();
    // Native media changes can coalesce around selecting System. Reconcile once
    // before paint; the existing owner reads the latest choice, not this click.
    window.requestAnimationFrame(() => apply());
  } else document.documentElement.setAttribute('data-theme', choice === 'dark' ? 'dark' : 'light');
}
