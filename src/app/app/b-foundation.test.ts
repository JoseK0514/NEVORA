// Nov 14, 2026 inspection: guards for the shared Direction B rules (press and reduced motion, the retired colours, the one
// band, the legacy buttons).
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from '@rstest/core';

const root = join(__dirname, '..', '..');
const SHEETS = [
  'app/app/b-foundation.css', 'app/app/owner-b-shell.css', 'app/app/owner-b-pages.css', 'app/app/owner-b-desktop.css',
  'app/app/employee-b-desktop.css', 'components/owner-b/owner-b.css',
  'app/app/owner-b-home.css', 'app/app/owner-b-schedule.css', 'app/app/owner-b-time-pay.css', 'app/app/owner-b-requests.css', 'app/app/owner-b-settings.css', 'app/app/b-restrictions.css', 'app/app/b-wages.css', 'app/app/b-workforce.css', 'app/app/b-payroll-import.css', 'app/app/b-reminders.css', 'app/app/b-review-details.css', 'app/app/b-thirty-day.css', 'app/app/employee-b-work.css', 'app/app/employee-b-account.css', 'app/app/b-motion.css', 'app/app/b-moments.css', 'app/app/b-shimmer.css',
  'components/clocker-owner-b.css',
];
const css = (path: string) => readFileSync(join(root, path), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

/** The at-rule preludes (outermost first) around each place `needle` appears. */
function contexts(text: string, needle: string) {
  const found: string[][] = [];
  const stack: string[] = [];
  let start = 0;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '{') { stack.push(text.slice(start, index).trim()); start = index + 1; }
    else if (char === '}') { stack.pop(); start = index + 1; }
    else if (char === ';') start = index + 1;
    if (text.startsWith(needle, index)) found.push(stack.filter(prelude => prelude.startsWith('@')));
  }
  return found;
}

describe('Direction B foundation (Nov 14 inspection)', () => {
  it.each(SHEETS)('%s scales a pressed button only when motion is allowed (SY-018)', path => {
    for (const context of contexts(css(path), 'scale: var(--b-press-scale)')) {
      expect(context.some(prelude => /prefers-reduced-motion:\s*no-preference/.test(prelude)), context.join(' > ') || 'no media query').toBe(true);
    }
  });
  it('still presses buttons, nv-btn included, in the foundation sheet', () => {
    const text = css('app/app/b-foundation.css');
    expect(contexts(text, 'scale: var(--b-press-scale)').length).toBeGreaterThan(0);
    expect(text).toMatch(/:is\(\.b-btn, \.c-btn, \.q-btn, \.q-bs, \.wc-btn, \.nv-btn\):not\(:disabled, \[aria-disabled="true"\]\):active \{ scale: var\(--b-press-scale\); \}/);
  });
  it.each(SHEETS)('%s uses no colour the inspection retired (SY-008, EM-011)', path => {
    // the row chevron, the light amber and green solids, the ink band
    expect(css(path)).not.toMatch(/#B5BBBF|#E9A23B|#E2A13B|#2FB37F|#17302D|#11221F|--b-band-ink|b-screen--ink/i);
  });
  it('gives nv-btn the Direction B button inside the nv-b layer (SY-015)', () => {
    const text = css('app/app/b-foundation.css');
    const rules = contexts(text, '.app-shell[data-nv-b] .nv-btn {');
    expect(rules.length).toBe(1);
    expect(rules[0]).toContain('@layer nv-b');
    expect(text).toMatch(/\.app-shell\[data-nv-b\] \.nv-btn \{[^}]*border-radius: var\(--b-radius-pill\) !important;[^}]*\}/);
    expect(text).toMatch(/\.nv-btn\[data-kind="primary"\] \{ background: var\(--b-teal\) !important; color: #FFFFFF !important; \}/);
    expect(text).toMatch(/:is\(\.c-btn, \.q-btn, \.q-bs, \.wc-btn\) \{ border-radius: var\(--b-radius-pill\) !important; \}/);
  });
  it('keeps a paintable outline beside each shadow-only focus ring (RA-17)', () => {
    const foundation = css('app/app/b-foundation.css');
    expect(foundation).toMatch(/\.b-live__a:focus-visible \{ outline: var\(--b-focus-width\) solid transparent;/);
    expect(foundation).toMatch(/\.nav-link:focus-visible::after \{[^}]*outline: var\(--b-focus-width\) solid transparent !important;/);
    expect(foundation).toMatch(/@media \(forced-colors: active\)/);
    expect(css('app/app/owner-b-desktop.css')).toMatch(/\.c-team-search__field:focus-within \{ box-shadow: inset 0 0 0 2px #fff !important; outline: 2px solid transparent !important;/);
    expect(css('components/owner-b/owner-b.css')).toMatch(/\.b-search:focus-within \{[^}]*outline: 2px solid transparent;/);
  });
  it('makes menu items concentric with the 16px menu (SY-010)', () => {
    expect(css('app/app/b-foundation.css')).toMatch(/:is\(\.nevora-action-menu-item, \.cm-insights__menu-item\) \{ min-height: 44px !important; border-radius: var\(--b-radius-small\) !important; \}/);
  });
});
