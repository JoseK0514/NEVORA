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
  it('paints the sidebar keyboard outline on the link itself, inside the clipped rail, in both languages (English flag D1)', () => {
    const foundation = css('app/app/b-foundation.css');
    expect(foundation).toMatch(/html body \.app-shell\[data-nv-b\] aside\.sidebar \.nav-link:focus-visible:not\(#d1-none\) \{\s*outline: var\(--b-focus-width\) solid var\(--b-focus\) !important;\s*outline-offset: calc\(-1 \* var\(--b-focus-width\)\) !important;/);
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
  // Gaps round 1, package C (Nov 23, 2026).
  it('gives the band back link a 44px hit area from 768px with any pointer, inside nv-b (G5)', () => {
    const sheet = css('app/app/b-foundation.css');
    const rule = /\.c-page > \.c-nav--phone > \.c-nav__back::after \{([^}]*)\}/.exec(sheet);
    expect(rule?.[1]).toMatch(/content: "" !important;[\s\S]*position: absolute !important;[\s\S]*height: max\(100%, 44px\) !important;/);
    expect(sheet).toMatch(/\.c-page > \.c-nav--phone > \.c-nav__back \{ position: relative !important; inset: auto !important; \}/);
    const where = contexts(sheet, '.c-page > .c-nav--phone > .c-nav__back::after');
    expect(where).toEqual([['@layer nv-b', '@media (min-width: 768px)']]);
  });
  it("draws the kit filters' counts in the grey for fills at full strength (G15)", () => {
    const sheet = css('app/app/b-foundation.css');
    expect(sheet).toMatch(/\.b-filters > button\[type="button"\] b \{ color: var\(--b-grey-on-fill\) !important; opacity: 1 !important; \}/);
    expect(contexts(sheet, '.b-filters > button[type="button"] b')).toEqual([['@layer nv-b']]);
  });
  it("draws Timecards' table counts in the grey for fills and paints the band under the week strip (G11)", () => {
    const sheet = css('app/app/owner-b-time-pay.css');
    expect(sheet).toMatch(/\.c-tc-desk \.c-tc-tabs button em \{[^}]*color: var\(--b-grey-on-fill\) !important; opacity: 1 !important;/);
    expect(sheet).toMatch(/\.c-tc-desk \.c-tc-tabs button\[aria-pressed="true"\] em \{ background: none !important; color: var\(--b-grey-on-fill\) !important; opacity: 1 !important; \}/);
    expect(sheet).toMatch(/\.c-page\.c-tc-desk > header\.c-title ~ \.c-tc-seg \{ background: color-mix\(in srgb, var\(--b-on-band\) 8%, color-mix\(in srgb, var\(--b-band-solid\) 84%, black\)\) !important; \}/);
  });
  // Gaps round 2, package R (Nov 23, 2026).
  it('paints the band under every other glass strip on the title band, from 768px, inside nv-b (G48)', () => {
    const sheet = css('app/app/b-foundation.css');
    const high = '.c-page > header.c-title ~ :is(nav.c-pay-tabs, form.c-team-search .c-team-search__field):not(#g48a):not(#g48b)';
    const low = '.c-page > header.c-title ~ :is(nav.c-seg, nav.c-week):not(#g48a):not(#g48b)';
    expect(sheet).toContain(`${high} {\n      background: color-mix(in srgb, var(--b-on-band) 8%, color-mix(in srgb, var(--b-band-solid) 84%, black)) !important; }`);
    expect(sheet).toContain(`${low} {\n      background: color-mix(in srgb, var(--b-on-band) 8%, color-mix(in srgb, var(--b-band-solid) 79%, black)) !important; }`);
    expect(contexts(sheet, high)).toEqual([['@layer nv-b', '@media (min-width: 768px)']]);
    expect(contexts(sheet, low)).toEqual([['@layer nv-b', '@media (min-width: 768px)']]);
    // Final fixes K2 (G-ST7): the quiet pages' section tabs (Time off requests) take the same paint.
    const quiet = '.q-page > .q-hd ~ nav.c-seg:not(#g48a):not(#g48b)';
    expect(sheet).toContain(`${quiet} {\n      background: color-mix(in srgb, var(--b-on-band) 8%, color-mix(in srgb, var(--b-band-solid) 79%, black)) !important; }`);
    expect(contexts(sheet, quiet)).toEqual([['@layer nv-b', '@media (min-width: 768px)']]);
    // Final fixes K (Insights): the date range line under the title paints the band at its height (no glass).
    const range = '.c-page > header.c-title ~ p.c-ins__range:not(#g48a):not(#g48b)';
    expect(sheet).toContain(`${range} {\n      background: color-mix(in srgb, var(--b-band-solid) 84%, black) !important; -webkit-background-clip: text !important; background-clip: text !important; }`);
    expect(contexts(sheet, range)).toEqual([['@layer nv-b', '@media (min-width: 768px)']]);
    // Four id steps: over the desktop layer's search field rule (three :is() ids and :not(#nvd-none)).
    expect(css('app/app/owner-b-desktop.css')).toContain('form.c-team-search .c-team-search__field:not(#nvd-none) {');
  });
});

it('gives Spanish attendance details enough room for a whole time beside a status', () => {
  const home = css('app/app/owner-b-home.css');
  expect(home).toMatch(/#b-home-on:not\(\.nv-any-lang\) \.b-row:has\([^)]+\.b-chip\) \{[^}]*flex-wrap: wrap/);
  expect(home).toMatch(/#b-home-on:not\(\.nv-any-lang\)[^{]*> \.b-row__tx \{[^}]*flex-basis: min-content/);
});

it('keeps the enlarged two-row Spanish Pendientes filters inside their own bounds', () => {
  expect(css('components/owner-b/owner-b.css')).toMatch(/#b-todo-title\) \.b-seg:has\(> :nth-child\(4\)\) > button::after \{[^}]*inset: 0/);
});

it('lets the Spanish request counts keep each caption in its own column', () => {
  expect(css('components/employee-b/requests.css')).toMatch(/html:lang\(es\) \.b-screen:has\(#b-requests-title\) \.b-live__m \{[^}]*white-space: normal !important;/);
});

it('wraps the Spanish no-shift notice inside the update composer', () => {
  const work = css('app/app/employee-b-work.css');
  expect(work).toMatch(/\.eb-compose \.em-request-notice\[aria-labelledby="compose-unavailable-title"\] > p:not\(#b20-none\) \{[^}]*white-space: normal/);
});

it('keeps the Spanish partial updates notice legible where the list rises over the teal header', () => {
  const work = css('app/app/employee-b-work.css');
  const notice = '.b-screen:has(#b-updates-title) .b-stack > .b-note[role="status"]:first-child:not(#d5-none)';
  expect(contexts(work, notice).some(stack => stack.every(atRule => !atRule.startsWith('@media')))).toBe(true);
  expect(work).toMatch(/#b-updates-title\) \.b-stack > \.b-note\[role="status"\]:first-child:not\(#d5-none\) \{[^}]*background-color: var\(--b-canvas\)/);
});

it('gives the update form fields the kit keyboard outline on phones, in both languages (English flag D4)', () => {
  const work = css('app/app/employee-b-work.css');
  const fields = '.eb-compose .em-message-field > :is(input, select, textarea):focus-visible:not(#d4-none)';
  const rule = work.slice(work.indexOf(fields)).split('}')[0];
  expect(rule).toContain('outline: var(--b-focus-width) solid var(--b-focus) !important');
  expect(rule).toContain('outline-offset: var(--b-focus-offset)');
});


it('keeps the bottom edge of the Spanish directory link above the first person', () => {
  expect(css('components/employee-directory-corp.css')).toMatch(/#team-people:not\(\.nv-any-lang\) > \.c-section__head \.c-link \{[^}]*position: relative;[^}]*z-index: 2;/);
});


it('centers the Spanish Payroll tabs’ hit areas without relying on motion transforms', () => {
  const shell = css('app/app/owner-b-shell.css');
  expect(shell).toMatch(/nav\.c-pay-tabs:not\(\.nv-any-lang\) > a\.c-pay-tabs__tab::after \{[^}]*top: min\(0px, calc\(50% - 22px\)\)[^}]*translate: none/);
});
